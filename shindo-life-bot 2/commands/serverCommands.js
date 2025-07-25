const { EmbedBuilder } = require('discord.js');
const { serverStatus } = require('../data/serverState');

const serverCommands = {
    // Ouvrir le serveur avec code
    async ouvrir(interaction, client, config) {
        if (serverStatus.maintenanceMode) {
            return interaction.reply({
                content: '❌ Impossible d\'ouvrir le serveur, maintenance en cours.',
                ephemeral: true
            });
        }

        const serverCode = interaction.options.getString('code');

        serverStatus.isOpen = true;
        serverStatus.serverCode = serverCode;
        serverStatus.serverStats.totalSessions++;
        serverStatus.serverStats.lastOpened = new Date();

        const embed = new EmbedBuilder()
            .setTitle('🟢 SERVEUR PRIVÉ OUVERT !')
            .setDescription('Le serveur privé Shindo Life RP est maintenant **OUVERT** !')
            .addFields(
                { name: '🔑 Code du serveur', value: `\`${serverCode}\``, inline: true },
                { name: '👥 Joueurs', value: `${serverStatus.playerCount}/${serverStatus.maxPlayers}`, inline: true },
                { name: '📍 Statut', value: '🟢 Ouvert', inline: true },
                { name: '⏰ Ouvert à', value: `<t:${Math.floor(Date.now() / 1000)}:t>`, inline: true },
                { name: '🎮 Comment rejoindre', value: 'Utilise le code ci-dessus dans Shindo Life !', inline: false }
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
    },

    // Fermer le serveur
    async fermer(interaction, client, config) {
        serverStatus.isOpen = false;
        const previousPlayerCount = serverStatus.playerCount;
        const previousCode = serverStatus.serverCode;
        serverStatus.playerCount = 0;
        serverStatus.serverCode = null;

        const reason = interaction.options.getString('raison');

        const embed = new EmbedBuilder()
            .setTitle('🔴 SERVEUR PRIVÉ FERMÉ')
            .setDescription(reason || 'Le serveur privé Shindo Life RP est maintenant **FERMÉ**.')
            .addFields(
                { name: '📍 Statut', value: '🔴 Fermé', inline: true },
                { name: '⏰ Fermé à', value: `<t:${Math.floor(Date.now() / 1000)}:t>`, inline: true },
                { name: '📊 Session terminée', value: `${previousPlayerCount} joueur(s) connecté(s)`, inline: true }
            )
            .setColor('#ff0000')
            .setFooter({ text: 'Shindo Life RP Bot' })
            .setTimestamp();

        if (previousCode) {
            embed.addFields({
                name: '🔑 Code fermé',
                value: `\`${previousCode}\``,
                inline: true
            });
        }

        if (serverStatus.queue.length > 0) {
            embed.addFields({
                name: '📋 File d\'attente',
                value: `${serverStatus.queue.length} joueur(s) en attente`,
                inline: true
            });
        }

        await interaction.reply({
            content: '✅ Serveur fermé avec succès !',
            ephemeral: true
        });

        const channel = client.channels.cache.get(config.channelId);
        if (channel) {
            await channel.send({ embeds: [embed] });
        }
    },

    // Afficher le statut
    async statut(interaction, client, config) {
        const statusEmoji = serverStatus.isOpen ? '🟢' : '🔴';
        const statusText = serverStatus.isOpen ? 'OUVERT' : 'FERMÉ';

        let statusDescription = `État actuel du serveur privé Shindo Life`;

        if (serverStatus.maintenanceMode) {
            statusDescription += '\n⚠️ **Mode maintenance activé**';
        }

        const embed = new EmbedBuilder()
            .setTitle(`${statusEmoji} Statut du Serveur RP`)
            .setDescription(statusDescription)
            .addFields(
                { name: '📍 Statut', value: `${statusEmoji} ${statusText}`, inline: true },
                { name: '👥 Joueurs', value: `${serverStatus.playerCount}/${serverStatus.maxPlayers}`, inline: true },
                { name: '📋 File d\'attente', value: `${serverStatus.queue.length}`, inline: true },
                { name: '🎉 Événement', value: serverStatus.eventActive ? `✅ ${serverStatus.eventName}` : '❌ Aucun', inline: true },
                { name: '📝 Whitelist', value: `${serverStatus.whitelist.size} joueur(s)`, inline: true },
                { name: '🔨 Bannis', value: `${serverStatus.bannedUsers.size} joueur(s)`, inline: true }
            )
            .setColor(serverStatus.isOpen ? '#00ff00' : '#ff0000')
            .setFooter({ text: 'Shindo Life RP Bot' })
            .setTimestamp();

        if (serverStatus.serverCode && serverStatus.isOpen) {
            embed.addFields({
                name: '🔑 Code actuel',
                value: `\`${serverStatus.serverCode}\``,
                inline: true
            });
        }

        if (serverStatus.scheduledEvents.length > 0) {
            const nextEvent = serverStatus.scheduledEvents[0];
            embed.addFields({
                name: '📅 Prochain événement',
                value: `${nextEvent.name} - <t:${Math.floor(nextEvent.scheduledFor.getTime() / 1000)}:R>`,
                inline: false
            });
        }

        await interaction.reply({ embeds: [embed] });
    },

    // Mode maintenance
    async maintenance(interaction, client, config) {
        const activate = interaction.options.getBoolean('activer');
        const message = interaction.options.getString('message') || 'Maintenance en cours...';

        serverStatus.maintenanceMode = activate;

        if (activate && serverStatus.isOpen) {
            serverStatus.isOpen = false;
            serverStatus.playerCount = 0;
            serverStatus.serverCode = null;
        }

        const embed = new EmbedBuilder()
            .setTitle(activate ? '🔧 MAINTENANCE EN COURS' : '✅ MAINTENANCE TERMINÉE')
            .setDescription(activate ? message : 'Le serveur est de nouveau disponible !')
            .setColor(activate ? '#ff6600' : '#00ff00')
            .setTimestamp();

        await interaction.reply({
            content: `✅ Mode maintenance ${activate ? 'activé' : 'désactivé'}.`,
            ephemeral: true
        });

        const channel = client.channels.cache.get(config.channelId);
        if (channel) {
            await channel.send({ embeds: [embed] });
        }
    },

    // Configuration du serveur
    async config(interaction, client, config) {
        let updated = [];

        const maxPlayers = interaction.options.getInteger('max_joueurs');
        const whitelistOnly = interaction.options.getBoolean('whitelist_only');

        if (maxPlayers) {
            serverStatus.maxPlayers = maxPlayers;
            updated.push(`Joueurs max: ${maxPlayers}`);
        }

        if (whitelistOnly !== null) {
            serverStatus.whitelistOnly = whitelistOnly;
            updated.push(`Mode whitelist: ${whitelistOnly ? 'Activé' : 'Désactivé'}`);
        }

        const embed = new EmbedBuilder()
            .setTitle('⚙️ Configuration du serveur')
            .setDescription('Paramètres actuels du serveur RP')
            .addFields(
                { name: '👥 Joueurs max', value: `${serverStatus.maxPlayers}`, inline: true },
                { name: '📍 Statut', value: serverStatus.isOpen ? '🟢 Ouvert' : '🔴 Fermé', inline: true },
                { name: '🎉 Événement', value: serverStatus.eventActive ? `✅ ${serverStatus.eventName}` : '❌ Aucun', inline: true },
                { name: '📝 Mode whitelist', value: serverStatus.whitelistOnly ? '✅ Activé' : '❌ Désactivé', inline: true },
                { name: '🔧 Maintenance', value: serverStatus.maintenanceMode ? '⚠️ En cours' : '✅ Normal', inline: true },
                { name: '📋 File d\'attente', value: `${serverStatus.queue.length} joueur(s)`, inline: true }
            )
            .setColor('#0099ff')
            .setFooter({ text: 'Shindo Life RP Bot' })
            .setTimestamp();

        const responseText = updated.length > 0 ? 
            `✅ Configuration mise à jour :\n${updated.join('\n')}` : 
            'Configuration actuelle :';

        await interaction.reply({ 
            content: responseText,
            embeds: [embed],
            ephemeral: true 
        });
    }
};

module.exports = { serverCommands };