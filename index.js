            const { Client, GatewayIntentBits, EmbedBuilder, ActivityType, SlashCommandBuilder, REST, Routes } = require('discord.js');

            // Configuration du bot
            const config = {
                token: process.env['TOKEN'], // Token depuis les secrets Replit
                clientId: process.env['CLIENT_ID'], // ID de l'application Discord
                channelId: process.env['CHANNEL_ID'], // ID du salon pour les annonces
                roleId: process.env['ROLE_ID'], // ID du rôle à mentionner (optionnel)
            };

            const client = new Client({
                intents: [
                    GatewayIntentBits.Guilds,
                    GatewayIntentBits.GuildMessages
                ]
            });

            // État du serveur
            let serverStatus = {
                isOpen: false,
                playerCount: 0,
                maxPlayers: 12,
                eventActive: false,
                eventName: '',
                queue: [], // File d'attente
                bannedUsers: new Map(), // Utilisateurs bannis temporairement (id -> { username, unbanTime, reason })
                whitelist: new Set(), // Liste blanche (id)
                maintenanceMode: false,
                scheduledEvents: [], // Événements programmés
                serverStats: {
                    totalSessions: 0,
                    totalPlaytime: 0, // En minutes
                    lastOpened: null
                },
                whitelistOnly: false
            };

            // Données du jeu Shindo Life
            const gameData = {
                clans: [
                    'Uchiha', 'Hyuga', 'Senju', 'Uzumaki', 'Nara', 'Akimichi', 'Yamanaka', 'Aburame', 
                    'Inuzuka', 'Lee', 'Hatake', 'Sarutobi', 'Shimura', 'Kamaki', 'Sabaku', 'Kaguya',
                    'Hozuki', 'Yuki', 'Kurama', 'Akuma', 'Shizen', 'Kagoku', 'Doku', 'Seishin'
                ],
                elements: [
                    'Feu', 'Eau', 'Terre', 'Vent', 'Foudre', 'Glace', 'Bois', 'Lave', 'Tempête',
                    'Vapeur', 'Explosion', 'Particules', 'Magnet', 'Poison', 'Acier', 'Cristal'
                ],
                villages: [
                    'Konoha (Village Caché des Feuilles)', 'Suna (Village Caché du Sable)', 
                    'Kiri (Village Caché de la Brume)', 'Kumo (Village Caché des Nuages)', 
                    'Iwa (Village Caché des Rochers)', 'Ame (Village Caché de la Pluie)',
                    'Taki (Village Caché de la Cascade)', 'Kusa (Village Caché de l\'Herbe)'
                ],
                bijuu: [
                    'Shukaku (1 Queue)', 'Matatabi (2 Queues)', 'Isobu (3 Queues)', 'Son Goku (4 Queues)',
                    'Kokuo (5 Queues)', 'Saiken (6 Queues)', 'Chomei (7 Queues)', 'Gyuki (8 Queues)', 'Kurama (9 Queues)'
                ]
            };

            // Définition des commandes slash
            const commands = [
                // Commandes de base
                new SlashCommandBuilder()
                    .setName('ouvrir')
                    .setDescription('Ouvre le serveur privé Shindo Life RP')
                    .addStringOption(option =>
                        option.setName('message')
                            .setDescription('Message d\'annonce personnalisé')
                            .setRequired(false)),

                new SlashCommandBuilder()
                    .setName('fermer')
                    .setDescription('Ferme le serveur privé Shindo Life RP')
                    .addStringOption(option =>
                        option.setName('raison')
                            .setDescription('Raison de la fermeture')
                            .setRequired(false)),

                new SlashCommandBuilder()
                    .setName('statut')
                    .setDescription('Affiche le statut actuel du serveur'),

                // Gestion des événements
                new SlashCommandBuilder()
                    .setName('event')
                    .setDescription('Lance un événement spécial')
                    .addStringOption(option =>
                        option.setName('nom')
                            .setDescription('Nom de l\'événement')
                            .setRequired(true))
                    .addStringOption(option =>
                        option.setName('description')
                            .setDescription('Description de l\'événement')
                            .setRequired(false))
                    .addIntegerOption(option =>
                        option.setName('duree')
                            .setDescription('Durée en minutes')
                            .setRequired(false)
                            .setMinValue(5)
                            .setMaxValue(480)),

                new SlashCommandBuilder()
                    .setName('stop_event')
                    .setDescription('Arrête l\'événement en cours'),

                new SlashCommandBuilder()
                    .setName('programmer_event')
                    .setDescription('Programme un événement pour plus tard')
                    .addStringOption(option =>
                        option.setName('nom')
                            .setDescription('Nom de l\'événement')
                            .setRequired(true))
                    .addIntegerOption(option =>
                        option.setName('heures')
                            .setDescription('Dans combien d\'heures')
                            .setRequired(true)
                            .setMinValue(1)
                            .setMaxValue(168))
                    .addIntegerOption(option =>
                        option.setName('minutes')
                            .setDescription('Minutes supplémentaires')
                            .setRequired(false)
                            .setMinValue(0)
                            .setMaxValue(59)),

                // Gestion des joueurs
                new SlashCommandBuilder()
                    .setName('joueurs')
                    .setDescription('Met à jour le nombre de joueurs connectés')
                    .addIntegerOption(option =>
                        option.setName('nombre')
                            .setDescription('Nombre de joueurs')
                            .setRequired(true)
                            .setMinValue(0)
                            .setMaxValue(50)),

                new SlashCommandBuilder()
                    .setName('queue')
                    .setDescription('Gère la file d\'attente')
                    .addSubcommand(subcommand =>
                        subcommand
                            .setName('ajouter')
                            .setDescription('Ajoute un joueur à la file d\'attente')
                            .addUserOption(option =>
                                option.setName('joueur')
                                    .setDescription('Le joueur à ajouter')
                                    .setRequired(true)))
                    .addSubcommand(subcommand =>
                        subcommand
                            .setName('retirer')
                            .setDescription('Retire un joueur de la file d\'attente')
                            .addUserOption(option =>
                                option.setName('joueur')
                                    .setDescription('Le joueur à retirer')
                                    .setRequired(true)))
                    .addSubcommand(subcommand =>
                        subcommand
                            .setName('voir')
                            .setDescription('Affiche la file d\'attente'))
                    .addSubcommand(subcommand =>
                        subcommand
                            .setName('clear')
                            .setDescription('Vide la file d\'attente')),

                // Système de whitelist/ban
                new SlashCommandBuilder()
                    .setName('whitelist')
                    .setDescription('Gère la liste blanche')
                    .addSubcommand(subcommand =>
                        subcommand
                            .setName('add')
                            .setDescription('Ajoute un joueur à la whitelist')
                            .addUserOption(option =>
                                option.setName('joueur')
                                    .setDescription('Le joueur à ajouter')
                                    .setRequired(true)))
                    .addSubcommand(subcommand =>
                        subcommand
                            .setName('remove')
                            .setDescription('Retire un joueur de la whitelist')
                            .addUserOption(option =>
                                option.setName('joueur')
                                    .setDescription('Le joueur à retirer')
                                    .setRequired(true)))
                    .addSubcommand(subcommand =>
                        subcommand
                            .setName('list')
                            .setDescription('Affiche la whitelist')),

                new SlashCommandBuilder()
                    .setName('tempban')
                    .setDescription('Ban temporaire d\'un joueur du serveur RP')
                    .addUserOption(option =>
                        option.setName('joueur')
                            .setDescription('Le joueur à bannir')
                            .setRequired(true))
                    .addIntegerOption(option =>
                        option.setName('duree')
                            .setDescription('Durée en heures')
                            .setRequired(true)
                            .setMinValue(1)
                            .setMaxValue(168))
                    .addStringOption(option =>
                        option.setName('raison')
                            .setDescription('Raison du ban')
                            .setRequired(false)),

                new SlashCommandBuilder()
                    .setName('unban')
                    .setDescription('Retire le ban d\'un joueur')
                    .addUserOption(option =>
                        option.setName('joueur')
                            .setDescription('Le joueur à débannir')
                            .setRequired(true)),

                // Maintenance et configuration
                new SlashCommandBuilder()
                    .setName('maintenance')
                    .setDescription('Active/désactive le mode maintenance')
                    .addBooleanOption(option =>
                        option.setName('activer')
                            .setDescription('Activer ou désactiver la maintenance')
                            .setRequired(true))
                    .addStringOption(option =>
                        option.setName('message')
                            .setDescription('Message de maintenance')
                            .setRequired(false)),

                new SlashCommandBuilder()
                    .setName('config')
                    .setDescription('Configure les paramètres du serveur')
                    .addIntegerOption(option =>
                        option.setName('max_joueurs')
                            .setDescription('Nombre maximum de joueurs')
                            .setRequired(false)
                            .setMinValue(1)
                            .setMaxValue(50))
                    .addBooleanOption(option =>
                        option.setName('whitelist_only')
                            .setDescription('Mode whitelist uniquement')
                            .setRequired(false)),

                // Statistiques et informations
                new SlashCommandBuilder()
                    .setName('stats')
                    .setDescription('Affiche les statistiques du serveur'),

                new SlashCommandBuilder()
                    .setName('info')
                    .setDescription('Informations sur les clans et techniques Shindo Life')
                    .addStringOption(option =>
                        option.setName('type')
                            .setDescription('Type d\'information')
                            .setRequired(true)
                            .addChoices(
                                { name: 'Clans', value: 'clans' },
                                { name: 'Éléments', value: 'elements' },
                                { name: 'Villages', value: 'villages' },
                                { name: 'Tailed Beasts', value: 'bijuu' }
                            )),

                // Outils utiles
                new SlashCommandBuilder()
                    .setName('rappel')
                    .setDescription('Programme un rappel')
                    .addStringOption(option =>
                        option.setName('message')
                            .setDescription('Message du rappel')
                            .setRequired(true))
                    .addIntegerOption(option =>
                        option.setName('minutes')
                            .setDescription('Dans combien de minutes')
                            .setRequired(true)
                            .setMinValue(1)
                            .setMaxValue(1440)),

                new SlashCommandBuilder()
                    .setName('poll')
                    .setDescription('Crée un sondage')
                    .addStringOption(option =>
                        option.setName('question')
                            .setDescription('Question du sondage')
                            .setRequired(true))
                    .addStringOption(option =>
                        option.setName('options')
                            .setDescription('Options séparées par des virgules (max 10)')
                            .setRequired(true)),

                new SlashCommandBuilder()
                    .setName('spin')
                    .setDescription('Générateur de clans/techniques aléatoires')
                    .addStringOption(option =>
                        option.setName('type')
                            .setDescription('Que veux-tu générer?')
                            .setRequired(true)
                            .addChoices(
                                { name: 'Clan aléatoire', value: 'clan' },
                                { name: 'Élément aléatoire', value: 'element' },
                                { name: 'Village aléatoire', value: 'village' },
                                { name: 'Build complet', value: 'build' }
                            ))
            ];

            // Enregistrement des commandes
            const rest = new REST({ version: '10' }).setToken(config.token);

            async function deployCommands() {
                try {
                    console.log('🔄 Déploiement des commandes slash...');

                    await rest.put(
                        Routes.applicationCommands(config.clientId),
                        { body: commands },
                    );

                    console.log('✅ Commandes slash déployées avec succès !');
                } catch (error) {
                    console.error('❌ Erreur lors du déploiement des commandes:', error);
                }
            }

            // Quand le bot se connecte
            client.once('ready', async () => {
                console.log(`✅ Bot connecté en tant que ${client.user.tag}`);

                // Statut du bot
                client.user.setActivity('Shindo Life RP', { type: ActivityType.Watching });

                // Déployer les commandes
                await deployCommands();

                // Vérifier les bans temporaires à intervalles réguliers
                setInterval(checkTempBans, 60 * 1000); // Toutes les minutes
                // Vérifier les événements programmés
                setInterval(checkScheduledEvents, 60 * 1000); // Toutes les minutes
            });

            // Gestion des interactions (commandes slash)
            client.on('interactionCreate', async interaction => {
                if (!interaction.isChatInputCommand()) return;

                // Vérifier les permissions pour certaines commandes
                const adminCommands = ['ouvrir', 'fermer', 'event', 'joueurs', 'config', 'stop_event', 'maintenance', 'tempban', 'unban', 'whitelist', 'queue', 'programmer_event'];
                const hasPermission = interaction.member.permissions.has('Administrator') || 
                                      (config.roleId && interaction.member.roles.cache.has(config.roleId));

                if (adminCommands.includes(interaction.commandName) && !hasPermission) {
                    return interaction.reply({
                        content: '❌ Tu n\'as pas la permission d\'utiliser cette commande.',
                        ephemeral: true
                    });
                }

                try {
                    switch (interaction.commandName) {
                        case 'ouvrir':
                            const openMessage = interaction.options.getString('message');
                            await openServer(interaction, openMessage);
                            break;

                        case 'fermer':
                            const closeReason = interaction.options.getString('raison');
                            await closeServer(interaction, closeReason);
                            break;

                        case 'statut':
                            await showStatus(interaction);
                            break;

                        case 'event':
                            const eventName = interaction.options.getString('nom');
                            const eventDesc = interaction.options.getString('description');
                            const eventDuration = interaction.options.getInteger('duree');
                            await startEvent(interaction, eventName, eventDesc, eventDuration);
                            break;

                        case 'joueurs':
                            const playerCount = interaction.options.getInteger('nombre');
                            await updatePlayerCount(interaction, playerCount);
                            break;

                        case 'config':
                            const maxPlayers = interaction.options.getInteger('max_joueurs');
                            const whitelistOnly = interaction.options.getBoolean('whitelist_only');
                            await configureServer(interaction, maxPlayers, whitelistOnly);
                            break;

                        case 'stop_event':
                            await stopEvent(interaction);
                            break;

                        case 'queue':
                            await handleQueue(interaction);
                            break;

                        case 'whitelist':
                            await handleWhitelist(interaction);
                            break;

                        case 'tempban':
                            await handleTempBan(interaction);
                            break;

                        case 'unban':
                            await handleUnban(interaction);
                            break;

                        case 'maintenance':
                            await handleMaintenance(interaction);
                            break;

                        case 'stats':
                            await showStats(interaction);
                            break;

                        case 'info':
                            await showGameInfo(interaction);
                            break;

                        case 'rappel':
                            await setReminder(interaction);
                            break;

                        case 'poll':
                            await createPoll(interaction);
                            break;

                        case 'spin':
                            await randomSpin(interaction);
                            break;

                        case 'programmer_event':
                            await scheduleEvent(interaction);
                            break;
                    }
                } catch (error) {
                    console.error('Erreur lors de l\'exécution de la commande:', error);
                    if (!interaction.replied && !interaction.deferred) {
                        await interaction.reply({
                            content: '❌ Une erreur est survenue lors de l\'exécution de la commande.',
                            ephemeral: true
                        });
                    }
                }
            });

            // Fonction pour ouvrir le serveur
            async function openServer(interaction, customMessage) {
                if (serverStatus.maintenanceMode) {
                    return interaction.reply({
                        content: '❌ Impossible d\'ouvrir le serveur, maintenance en cours.',
                        ephemeral: true
                    });
                }

                serverStatus.isOpen = true;
                serverStatus.serverStats.totalSessions++;
                serverStatus.serverStats.lastOpened = new Date();

                const embed = new EmbedBuilder()
                    .setTitle('🟢 SERVEUR PRIVÉ OUVERT !')
                    .setDescription(customMessage || 'Le serveur privé Shindo Life RP est maintenant **OUVERT** !')
                    .addFields(
                        { name: '👥 Joueurs', value: `${serverStatus.playerCount}/${serverStatus.maxPlayers}`, inline: true },
                        { name: '📍 Statut', value: '🟢 Ouvert', inline: true },
                        { name: '⏰ Ouvert à', value: `<t:${Math.floor(Date.now() / 1000)}:t>`, inline: true }
                    )
                    .setColor('#00ff00')
                    .setFooter({ text: 'Shindo Life RP Bot' })
                    .setTimestamp();

                if (serverStatus.queue.length > 0) {
                    embed.addFields({
                        name: '📋 File d\'attente',
                        value: `${serverStatus.queue.length} joueur(s) en attente`,
                        inline: true
                    });
                }

                await interaction.reply({
                    content: '✅ Serveur ouvert avec succès !',
                    ephemeral: true
                });

                const channel = client.channels.cache.get(config.channelId);
                if (channel) {
                    const roleText = config.roleId ? `<@&${config.roleId}>` : '@everyone';
                    await channel.send({ 
                        content: `${roleText} 🚨 **SERVEUR OUVERT** 🚨`, 
                        embeds: [embed] 
                    });
                }
            }

            // Fonction pour fermer le serveur
            async function closeServer(interaction, closeReason) {
                const oldPlayerCount = serverStatus.playerCount;
                serverStatus.isOpen = false;
                serverStatus.playerCount = 0;

                const embed = new EmbedBuilder()
                    .setTitle('🔴 SERVEUR PRIVÉ FERMÉ')
                    .setDescription(closeReason || 'Le serveur privé Shindo Life RP est maintenant **FERMÉ**.')
                    .addFields(
                        { name: '📍 Statut', value: '🔴 Fermé', inline: true },
                        { name: '⏰ Prochaine ouverture', value: 'À annoncer', inline: true },
                        { name: '📊 Session terminée', value: `Merci aux ${oldPlayerCount || 'participants'} !`, inline: true }
                    )
                    .setColor('#ff0000')
                    .setFooter({ text: 'Shindo Life RP Bot' })
                    .setTimestamp();

                await interaction.reply({
                    content: '✅ Serveur fermé avec succès !',
                    ephemeral: true
                });

                const channel = client.channels.cache.get(config.channelId);
                if (channel) {
                    await channel.send({ embeds: [embed] });
                }
            }

            // Fonction pour afficher le statut
            async function showStatus(interaction) {
                const statusEmoji = serverStatus.isOpen ? '🟢' : '🔴';
                const statusText = serverStatus.isOpen ? 'OUVERT' : 'FERMÉ';

                const embed = new EmbedBuilder()
                    .setTitle(`${statusEmoji} Statut du Serveur RP`)
                    .setDescription(`État actuel du serveur privé Shindo Life`)
                    .addFields(
                        { name: '📍 Statut', value: `${statusEmoji} ${statusText}`, inline: true },
                        { name: '👥 Joueurs', value: `${serverStatus.playerCount}/${serverStatus.maxPlayers}`, inline: true },
                        { name: '🎉 Événement', value: serverStatus.eventActive ? `✅ ${serverStatus.eventName}` : '❌ Aucun', inline: true }
                    )
                    .setColor(serverStatus.isOpen ? '#00ff00' : '#ff0000')
                    .setFooter({ text: 'Shindo Life RP Bot' })
                    .setTimestamp();

                if (serverStatus.maintenanceMode) {
                    embed.addFields({ name: '🔧 Maintenance', value: 'Mode maintenance activé', inline: true });
                }
                if (serverStatus.whitelistOnly) {
                    embed.addFields({ name: '📝 Whitelist seule', value: 'Activée', inline: true });
                }

                if (serverStatus.queue.length > 0) {
                    embed.addFields({ name: '📋 File d\'attente', value: `${serverStatus.queue.length} joueur(s)`, inline: true });
                }

                await interaction.reply({ embeds: [embed] });
            }

            // Fonction pour démarrer un événement
            async function startEvent(interaction, eventName, eventDescription, eventDuration) {
                serverStatus.eventActive = true;
                serverStatus.eventName = eventName;

                const embed = new EmbedBuilder()
                    .setTitle('🎉 ÉVÉNEMENT SPÉCIAL !')
                    .setDescription(`**${eventName}** commence maintenant sur le serveur RP !`)
                    .addFields(
                        { name: '🎮 Participation', value: 'Rejoignez le serveur pour participer !', inline: true },
                        { name: '⏰ Statut', value: '🟡 En cours...', inline: true },
                        { name: '👥 Joueurs', value: `${serverStatus.playerCount}/${serverStatus.maxPlayers}`, inline: true }
                    )
                    .setColor('#ffff00')
                    .setFooter({ text: 'Shindo Life RP Bot' })
                    .setTimestamp();

                if (eventDescription) {
                    embed.addFields({ name: '📋 Description', value: eventDescription, inline: false });
                }

                if (eventDuration) {
                    embed.addFields({ name: '⏱️ Durée', value: `${eventDuration} minutes`, inline: true });

                    // Programmer l'arrêt automatique de l'événement
                    setTimeout(() => {
                        if (serverStatus.eventActive && serverStatus.eventName === eventName) {
                            serverStatus.eventActive = false;
                            serverStatus.eventName = '';

                            const endEmbed = new EmbedBuilder()
                                .setTitle('⏰ Événement terminé automatiquement')
                                .setDescription(`L'événement **${eventName}** s'est terminé automatiquement.`)
                                .setColor('#9932cc')
                                .setTimestamp();

                            const channel = client.channels.cache.get(config.channelId);
                            if (channel) {
                                channel.send({ embeds: [endEmbed] });
                            }
                        }
                    }, eventDuration * 60 * 1000);
                }

                await interaction.reply({
                    content: '🎉 Événement lancé avec succès !',
                    ephemeral: true
                });

                const channel = client.channels.cache.get(config.channelId);
                if (channel) {
                    const roleText = config.roleId ? `<@&${config.roleId}>` : '@everyone';
                    await channel.send({ 
                        content: `${roleText} 🎉 **ÉVÉNEMENT SPÉCIAL** 🎉`, 
                        embeds: [embed] 
                    });
                }
            }

            // Fonction pour arrêter un événement
            async function stopEvent(interaction) {
                if (!serverStatus.eventActive) {
                    return interaction.reply({
                        content: '❌ Aucun événement n\'est actuellement en cours.',
                        ephemeral: true
                    });
                }

                const eventName = serverStatus.eventName;
                serverStatus.eventActive = false;
                serverStatus.eventName = '';

                const embed = new EmbedBuilder()
                    .setTitle('🏁 ÉVÉNEMENT TERMINÉ !')
                    .setDescription(`L'événement **${eventName}** est maintenant terminé.`)
                    .addFields(
                        { name: '🎉 Merci', value: 'Merci à tous les participants !', inline: true },
                        { name: '📊 Résultats', value: 'Les résultats seront annoncés bientôt', inline: true }
                    )
                    .setColor('#9932cc')
                    .setFooter({ text: 'Shindo Life RP Bot' })
                    .setTimestamp();

                await interaction.reply({
                    content: '✅ Événement terminé avec succès !',
                    ephemeral: true
                });

                const channel = client.channels.cache.get(config.channelId);
                if (channel) {
                    await channel.send({ embeds: [embed] });
                }
            }

            // Fonction pour mettre à jour le nombre de joueurs
            async function updatePlayerCount(interaction, count) {
                serverStatus.playerCount = count;

                await interaction.reply({
                    content: `✅ Nombre de joueurs mis à jour: ${count}/${serverStatus.maxPlayers}`,
                    ephemeral: true
                });

                // Si le serveur est plein, faire une annonce
                if (count >= serverStatus.maxPlayers && serverStatus.isOpen) {
                    const embed = new EmbedBuilder()
                        .setTitle('🔥 SERVEUR COMPLET !')
                        .setDescription(`Le serveur RP est maintenant plein ! **${count}/${serverStatus.maxPlayers}** joueurs connectés.`)
                        .addFields({ name: '📋 File d\'attente', value: 'Utilisez `/queue ajouter` pour rejoindre la liste d\'attente', inline: false })
                        .setColor('#ff6600')
                        .setTimestamp();

                    const channel = client.channels.cache.get(config.channelId);
                    if (channel) {
                        await channel.send({ embeds: [embed] });
                    }
                }
            }

            // Fonction pour configurer le serveur
            async function configureServer(interaction, maxPlayers, whitelistOnly) {
                if (maxPlayers) {
                    serverStatus.maxPlayers = maxPlayers;
                }
                if (whitelistOnly !== null) {
                    serverStatus.whitelistOnly = whitelistOnly;
                }

                const embed = new EmbedBuilder()
                    .setTitle('⚙️ Configuration du serveur')
                    .setDescription('Paramètres actuels du serveur RP')
                    .addFields(
                        { name: '👥 Joueurs max', value: `${serverStatus.maxPlayers}`, inline: true },
                        { name: '📍 Statut', value: serverStatus.isOpen ? '🟢 Ouvert' : '🔴 Fermé', inline: true },
                        { name: '🎉 Événement', value: serverStatus.eventActive ? `✅ ${serverStatus.eventName}` : '❌ Aucun', inline: true },
                        { name: '📝 Whitelist seule', value: serverStatus.whitelistOnly ? '✅ Activée' : '❌ Désactivée', inline: true },
                        { name: '🔧 Maintenance', value: serverStatus.maintenanceMode ? '✅ Activée' : '❌ Désactivée', inline: true }
                    )
                    .setColor('#0099ff')
                    .setFooter({ text: 'Shindo Life RP Bot' })
                    .setTimestamp();

                await interaction.reply({ 
                    content: 'Configuration mise à jour !',
                    embeds: [embed],
                    ephemeral: true 
                });
            }

            // Gestion de la file d'attente
            async function handleQueue(interaction) {
                const subcommand = interaction.options.getSubcommand();

                switch (subcommand) {
                    case 'ajouter':
                        const userToAdd = interaction.options.getUser('joueur');
                        if (serverStatus.queue.find(u => u.id === userToAdd.id)) {
                            return interaction.reply({
                                content: `❌ ${userToAdd.username} est déjà dans la file d'attente.`,
                                ephemeral: true
                            });
                        }

                        serverStatus.queue.push({
                            id: userToAdd.id,
                            username: userToAdd.username,
                            addedAt: new Date()
                        });

                        const embedAdd = new EmbedBuilder()
                            .setTitle('📋 File d\'attente mise à jour')
                            .setDescription(`${userToAdd.username} a été ajouté à la file d'attente !`)
                            .addFields({
                                name: '📊 Position',
                                value: `#${serverStatus.queue.length}`,
                                inline: true
                            })
                            .setColor('#ffff00')
                            .setTimestamp();

                        await interaction.reply({ embeds: [embedAdd] });
                        break;

                    case 'retirer':
                        const userToRemove = interaction.options.getUser('joueur');
                        const index = serverStatus.queue.findIndex(u => u.id === userToRemove.id);

                        if (index === -1) {
                            return interaction.reply({
                                content: `❌ ${userToRemove.username} n'est pas dans la file d'attente.`,
                                ephemeral: true
                            });
                        }

                        serverStatus.queue.splice(index, 1);
                        await interaction.reply({
                            content: `✅ ${userToRemove.username} a été retiré de la file d'attente.`,
                            ephemeral: true
                        });
                        break;

                    case 'voir':
                        if (serverStatus.queue.length === 0) {
                            return interaction.reply({
                                content: '📋 La file d\'attente est vide.',
                                ephemeral: true
                            });
                        }

                        const queueList = serverStatus.queue.map((u, i) => `${i + 1}. ${u.username} (depuis <t:${Math.floor(u.addedAt.getTime() / 1000)}:R>)`).join('\n');
                        const embedView = new EmbedBuilder()
                            .setTitle('📋 File d\'attente actuelle')
                            .setDescription(queueList)
                            .setColor('#0099ff')
                            .setTimestamp();

                        await interaction.reply({ embeds: [embedView] });
                        break;

                    case 'clear':
                        serverStatus.queue = [];
                        await interaction.reply({
                            content: '✅ La file d\'attente a été vidée.',
                            ephemeral: true
                        });
                        break;
                }
            }

            // Gestion de la whitelist
            async function handleWhitelist(interaction) {
                const subcommand = interaction.options.getSubcommand();

                switch (subcommand) {
                    case 'add':
                        const userToAdd = interaction.options.getUser('joueur');
                        if (serverStatus.whitelist.has(userToAdd.id)) {
                            return interaction.reply({
                                content: `❌ ${userToAdd.username} est déjà dans la whitelist.`,
                                ephemeral: true
                            });
                        }
                        serverStatus.whitelist.add(userToAdd.id);
                        await interaction.reply({
                            content: `✅ ${userToAdd.username} a été ajouté à la whitelist.`,
                            ephemeral: true
                        });
                        break;
                    case 'remove':
                        const userToRemove = interaction.options.getUser('joueur');
                        if (!serverStatus.whitelist.has(userToRemove.id)) {
                            return interaction.reply({
                                content: `❌ ${userToRemove.username} n'est pas dans la whitelist.`,
                                ephemeral: true
                            });
                        }
                        serverStatus.whitelist.delete(userToRemove.id);
                        await interaction.reply({
                            content: `✅ ${userToRemove.username} a été retiré de la whitelist.`,
                            ephemeral: true
                        });
                        break;
                    case 'list':
                        if (serverStatus.whitelist.size === 0) {
                            return interaction.reply({
                                content: '📝 La whitelist est vide.',
                                ephemeral: true
                            });
                        }
                        const whitelistUsers = Array.from(serverStatus.whitelist).map(id => {
                            const user = client.users.cache.get(id);
                            return user ? user.username : `Utilisateur inconnu (${id})`;
                        }).join('\n');
                        const embedList = new EmbedBuilder()
                            .setTitle('📝 Liste blanche')
                            .setDescription(whitelistUsers)
                            .setColor('#00ff00')
                            .setTimestamp();
                        await interaction.reply({ embeds: [embedList] });
                        break;
                }
            }

            // Gestion du ban temporaire
            async function handleTempBan(interaction) {
                const userToBan = interaction.options.getUser('joueur');
                const durationHours = interaction.options.getInteger('duree');
                const reason = interaction.options.getString('raison') || 'Aucune raison spécifiée.';

                const unbanTime = Date.now() + durationHours * 60 * 60 * 1000; // Temps en millisecondes
                serverStatus.bannedUsers.set(userToBan.id, {
                    username: userToBan.username,
                    unbanTime: unbanTime,
                    reason: reason
                });

                const embed = new EmbedBuilder()
                    .setTitle('🚫 Joueur banni temporairement')
                    .setDescription(`${userToBan.username} a été banni temporairement du serveur RP.`)
                    .addFields(
                        { name: '⏱️ Durée', value: `${durationHours} heure(s)`, inline: true },
                        { name: '⏰ Débanni le', value: `<t:${Math.floor(unbanTime / 1000)}:F>`, inline: true },
                        { name: '📝 Raison', value: reason, inline: false }
                    )
                    .setColor('#ff4500')
                    .setTimestamp();

                await interaction.reply({ embeds: [embed] });
            }

            // Fonction pour débannir un joueur
            async function handleUnban(interaction) {
                const userToUnban = interaction.options.getUser('joueur');

                if (!serverStatus.bannedUsers.has(userToUnban.id)) {
                    return interaction.reply({
                        content: `❌ ${userToUnban.username} n'est pas actuellement banni.`,
                        ephemeral: true
                    });
                }

                serverStatus.bannedUsers.delete(userToUnban.id);
                await interaction.reply({
                    content: `✅ ${userToUnban.username} a été débanni avec succès.`,
                    ephemeral: true
                });
            }

            // Vérifier les bans temporaires
            function checkTempBans() {
                const now = Date.now();
                serverStatus.bannedUsers.forEach((banInfo, userId) => {
                    if (now >= banInfo.unbanTime) {
                        serverStatus.bannedUsers.delete(userId);
                        const channel = client.channels.cache.get(config.channelId);
                        if (channel) {
                            const embed = new EmbedBuilder()
                                .setTitle('🎉 Joueur débanni automatiquement')
                                .setDescription(`L'utilisateur **${banInfo.username}** a été automatiquement débanni.`)
                                .setColor('#00ff00')
                                .setTimestamp();
                            channel.send({ embeds: [embed] }).catch(console.error);
                        }
                    }
                });
            }

            // Gestion du mode maintenance
            async function handleMaintenance(interaction) {
                const activate = interaction.options.getBoolean('activer');
                const message = interaction.options.getString('message');

                serverStatus.maintenanceMode = activate;

                const embed = new EmbedBuilder()
                    .setTitle(`🔧 Mode Maintenance ${activate ? 'Activé' : 'Désactivé'} !`)
                    .setDescription(message || (activate ? 'Le serveur est maintenant en mode maintenance. Aucune nouvelle connexion n\'est autorisée.' : 'Le mode maintenance a été désactivé. Le serveur est de nouveau accessible.'))
                    .setColor(activate ? '#ffa500' : '#00ff00')
                    .setTimestamp();

                await interaction.reply({ embeds: [embed] });

                const channel = client.channels.cache.get(config.channelId);
                if (channel) {
                    await channel.send({ embeds: [embed] });
                }
            }

            // Afficher les statistiques du serveur
            async function showStats(interaction) {
                const embed = new EmbedBuilder()
                    .setTitle('📊 Statistiques du Serveur RP')
                    .setDescription('Aperçu des performances du serveur Shindo Life.')
                    .addFields(
                        { name: '🚀 Sessions totales', value: `${serverStatus.serverStats.totalSessions}`, inline: true },
                        { name: '⏳ Dernière ouverture', value: serverStatus.serverStats.lastOpened ? `<t:${Math.floor(serverStatus.serverStats.lastOpened.getTime() / 1000)}:F>` : 'N/A', inline: true },
                        { name: '👥 Joueurs max configurés', value: `${serverStatus.maxPlayers}`, inline: true },
                        { name: '🚫 Utilisateurs bannis', value: `${serverStatus.bannedUsers.size}`, inline: true },
                        { name: '📝 Utilisateurs whitelistés', value: `${serverStatus.whitelist.size}`, inline: true },
                        { name: '📋 File d\'attente actuelle', value: `${serverStatus.queue.length}`, inline: true }
                    )
                    .setColor('#8a2be2')
                    .setFooter({ text: 'Shindo Life RP Bot' })
                    .setTimestamp();

                await interaction.reply({ embeds: [embed] });
            }

            // Afficher les informations du jeu
            async function showGameInfo(interaction) {
                const type = interaction.options.getString('type');
                let title = '';
                let description = '';
                let color = '#3498db'; // Bleu par défaut

                switch (type) {
                    case 'clans':
                        title = 'Liste des Clans Shindo Life';
                        description = gameData.clans.join(', ');
                        color = '#e74c3c'; // Rouge
                        break;
                    case 'elements':
                        title = 'Liste des Éléments Shindo Life';
                        description = gameData.elements.join(', ');
                        color = '#f1c40f'; // Jaune
                        break;
                    case 'villages':
                        title = 'Liste des Villages Shindo Life';
                        description = gameData.villages.join(', ');
                        color = '#2ecc71'; // Vert
                        break;
                    case 'bijuu':
                        title = 'Liste des Tailed Beasts (Bijuu) Shindo Life';
                        description = gameData.bijuu.join(', ');
                        color = '#9b59b6'; // Violet
                        break;
                }

                const embed = new EmbedBuilder()
                    .setTitle(title)
                    .setDescription(description)
                    .setColor(color)
                    .setFooter({ text: 'Shindo Life RP Bot - Informations' })
                    .setTimestamp();

                await interaction.reply({ embeds: [embed] });
            }

            // Programmer un rappel
            async function setReminder(interaction) {
                const message = interaction.options.getString('message');
                const minutes = interaction.options.getInteger('minutes');

                const reminderTime = Date.now() + minutes * 60 * 1000;

                setTimeout(async () => {
                    try {
                        const user = await client.users.fetch(interaction.user.id);
                        await user.send(`🔔 Rappel : ${message}`);
                        console.log(`Rappel envoyé à ${user.tag}: ${message}`);
                    } catch (error) {
                        console.error(`Impossible d'envoyer le DM de rappel à ${interaction.user.tag}:`, error);
                        // Si le DM échoue, envoyer dans le canal où la commande a été utilisée
                        const channel = client.channels.cache.get(interaction.channelId);
                        if (channel) {
                            channel.send(`🔔 Rappel pour ${interaction.user.username}: ${message}`).catch(console.error);
                        }
                    }
                }, minutes * 60 * 1000);

                const embed = new EmbedBuilder()
                    .setTitle('🔔 Rappel programmé !')
                    .setDescription(`Je te rappellerai "${message}" dans ${minutes} minute(s).`)
                    .setColor('#3498db')
                    .setTimestamp();

                await interaction.reply({ embeds: [embed], ephemeral: true });
            }

            // Créer un sondage
            async function createPoll(interaction) {
                const question = interaction.options.getString('question');
                const optionsString = interaction.options.getString('options');
                const options = optionsString.split(',').map(opt => opt.trim()).filter(opt => opt.length > 0);

                if (options.length < 2 || options.length > 10) {
                    return interaction.reply({
                        content: '❌ Tu dois fournir entre 2 et 10 options pour le sondage, séparées par des virgules.',
                        ephemeral: true
                    });
                }

                const emojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
                const fields = options.map((opt, i) => ({
                    name: `${emojis[i]} ${opt}`,
                    value: '\u200B', // Caractère invisible pour un champ vide
                    inline: false
                }));

                const embed = new EmbedBuilder()
                    .setTitle(`📊 Sondage : ${question}`)
                    .setDescription('Votez en cliquant sur les réactions ci-dessous !')
                    .addFields(fields)
                    .setColor('#7289da')
                    .setFooter({ text: `Sondage créé par ${interaction.user.username}` })
                    .setTimestamp();

                const pollMessage = await interaction.reply({ embeds: [embed], fetchReply: true });

                for (let i = 0; i < options.length; i++) {
                    await pollMessage.react(emojis[i]);
                }
            }

            // Générateur de clans/techniques aléatoires
            async function randomSpin(interaction) {
                const type = interaction.options.getString('type');
                let result = '';
                let title = '';
                let color = '#f39c12'; // Orange

                switch (type) {
                    case 'clan':
                        title = 'Clan Aléatoire';
                        result = gameData.clans[Math.floor(Math.random() * gameData.clans.length)];
                        break;
                    case 'element':
                        title = 'Élément Aléatoire';
                        result = gameData.elements[Math.floor(Math.random() * gameData.elements.length)];
                        break;
                    case 'village':
                        title = 'Village Aléatoire';
                        result = gameData.villages[Math.floor(Math.random() * gameData.villages.length)];
                        break;
                    case 'build':
                        title = 'Build Shindo Life Aléatoire';
                        const randomClan = gameData.clans[Math.floor(Math.random() * gameData.clans.length)];
                        const randomElement1 = gameData.elements[Math.floor(Math.random() * gameData.elements.length)];
                        let randomElement2 = gameData.elements[Math.floor(Math.random() * gameData.elements.length)];
                        while (randomElement2 === randomElement1) { // S'assurer que les éléments sont différents
                            randomElement2 = gameData.elements[Math.floor(Math.random() * gameData.elements.length)];
                        }
                        const randomBijuu = gameData.bijuu[Math.floor(Math.random() * gameData.bijuu.length)];

                        result = `**Clan :** ${randomClan}\n` +
                                 `**Élément 1 :** ${randomElement1}\n` +
                                 `**Élément 2 :** ${randomElement2}\n` +
                                 `**Bijuu :** ${randomBijuu}`;
                        break;
                }

                const embed = new EmbedBuilder()
                    .setTitle(`🎲 ${title} 🎲`)
                    .setDescription(`Ton tirage aléatoire est : **${result}**`)
                    .setColor(color)
                    .setFooter({ text: 'Shindo Life RP Bot - Spin' })
                    .setTimestamp();

                await interaction.reply({ embeds: [embed] });
            }

            // Programmer un événement
            async function scheduleEvent(interaction) {
                const eventName = interaction.options.getString('nom');
                const hours = interaction.options.getInteger('heures');
                const minutes = interaction.options.getInteger('minutes') || 0;

                const scheduledTime = new Date(Date.now() + (hours * 60 * 60 * 1000) + (minutes * 60 * 1000));
                const eventId = Math.random().toString(36).substring(2, 9); // Générer un ID simple

                serverStatus.scheduledEvents.push({
                    id: eventId,
                    name: eventName,
                    time: scheduledTime,
                    creatorId: interaction.user.id,
                    channelId: interaction.channelId
                });

                const embed = new EmbedBuilder()
                    .setTitle('🗓️ Événement programmé !')
                    .setDescription(`L'événement **${eventName}** est programmé pour <t:${Math.floor(scheduledTime.getTime() / 1000)}:F>.`)
                    .addFields(
                        { name: '⏰ Dans', value: `${hours}h ${minutes}min`, inline: true },
                        { name: 'ID de l\'événement', value: eventId, inline: true }
                    )
                    .setColor('#20b2aa')
                    .setTimestamp();

                await interaction.reply({ embeds: [embed], ephemeral: true });
            }

            // Vérifier les événements programmés
            async function checkScheduledEvents() {
                const now = Date.now();
                for (let i = serverStatus.scheduledEvents.length - 1; i >= 0; i--) {
                    const event = serverStatus.scheduledEvents[i];
                    if (now >= event.time.getTime()) {
                        const channel = client.channels.cache.get(config.channelId);
                        if (channel) {
                            const roleText = config.roleId ? `<@&${config.roleId}>` : '@everyone';
                            const embed = new EmbedBuilder()
                                .setTitle('🎉 ÉVÉNEMENT PROGRAMMÉ COMMENCE !')
                                .setDescription(`L'événement **${event.name}** commence maintenant !`)
                                .setColor('#ff8c00')
                                .setTimestamp();
                            await channel.send({ content: `${roleText} ${event.name} !`, embeds: [embed] }).catch(console.error);
                        }
                        serverStatus.scheduledEvents.splice(i, 1); // Supprimer l'événement programmé
                    }
                }
            }

            // Connexion du bot
            client.login(config.token);