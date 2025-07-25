const { EmbedBuilder } = require('discord.js');
const { serverStatus } = require('../data/serverState');

const playerCommands = {
    // Mettre à jour le nombre de joueurs
    async joueurs(interaction, client, config) {
        const count = interaction.options.getInteger('nombre');
        serverStatus.playerCount = count;

        const embed = new EmbedBuilder()
            .setTitle('👥 Mise à jour des joueurs')
            .setDescription(`Nombre de joueurs connectés : **${count}/${serverStatus.maxPlayers}**`)
            .setColor('#0099ff')
            .setFooter({ text: 'Shindo Life RP Bot' })
            .setTimestamp();

        await interaction.reply({
            content: `✅ Nombre de joueurs mis à jour: ${count}/${serverStatus.maxPlayers}`,
            ephemeral: true
        });

        // Si le serveur est plein, faire une annonce
        if (count >= serverStatus.maxPlayers && serverStatus.isOpen) {
            const channel = client.channels.cache.get(config.channelId);
            if (channel) {
                await channel.send({
                    content: '🔥 **SERVEUR COMPLET** 🔥\nLe serveur RP est maintenant plein ! Liste d\'attente disponible.',
                    embeds: [embed]
                });
            }
        }
    },

    // Gestion de la file d'attente
    async queue(interaction, client, config) {
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

                const embed = new EmbedBuilder()
                    .setTitle('📋 File d\'attente mise à jour')
                    .setDescription(`${userToAdd.username} a été ajouté à la file d'attente !`)
                    .addFields({
                        name: '📊 Position',
                        value: `#${serverStatus.queue.length}`,
                        inline: true
                    })
                    .setColor('#ffff00')
                    .setTimestamp();

                await interaction.reply({ embeds: [embed] });
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

                const queueList = serverStatus.queue.map((user, i) => 
                    `${i + 1}. ${user.username} - <t:${Math.floor(user.addedAt.getTime() / 1000)}:R>`
                ).join('\n');

                const queueEmbed = new EmbedBuilder()
                    .setTitle('📋 File d\'attente du serveur RP')
                    .setDescription(queueList)
                    .addFields({
                        name: '📊 Total',
                        value: `${serverStatus.queue.length} joueur(s) en attente`,
                        inline: true
                    })
                    .setColor('#ffff00')
                    .setTimestamp();

                await interaction.reply({ embeds: [queueEmbed] });
                break;

            case 'clear':
                serverStatus.queue = [];
                await interaction.reply({
                    content: '✅ File d\'attente vidée.',
                    ephemeral: true
                });
                break;
        }
    },

    // Gestion de la whitelist
    async whitelist(interaction, client, config) {
        const subcommand = interaction.options.getSubcommand();

        switch (subcommand) {
            case 'add':
                const userToAdd = interaction.options.getUser('joueur');
                serverStatus.whitelist.add(userToAdd.id);
                await interaction.reply({
                    content: `✅ ${userToAdd.username} ajouté à la whitelist.`,
                    ephemeral: true
                });
                break;

            case 'remove':
                const userToRemove = interaction.options.getUser('joueur');
                serverStatus.whitelist.delete(userToRemove.id);
                await interaction.reply({
                    content: `✅ ${userToRemove.username} retiré de la whitelist.`,
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

                const whitelistUsers = Array.from(serverStatus.whitelist).map(id => `<@${id}>`);
                const embed = new EmbedBuilder()
                    .setTitle('📝 Whitelist du serveur')
                    .setDescription(whitelistUsers.join('\n'))
                    .setColor('#00ff00')
                    .setTimestamp();

                await interaction.reply({ embeds: [embed] });
                break;
        }
    },

    // Ban temporaire
    async tempban(interaction, client, config) {
        const user = interaction.options.getUser('joueur');
        const duration = interaction.options.getInteger('duree');
        const reason = interaction.options.getString('raison') || 'Aucune raison spécifiée';

        const banUntil = new Date(Date.now() + duration * 60 * 60 * 1000);
        serverStatus.bannedUsers.add(user.id);

        // Programmer la levée du ban
        setTimeout(() => {
            serverStatus.bannedUsers.delete(user.id);
        }, duration * 60 * 60 * 1000);

        const embed = new EmbedBuilder()
            .setTitle('🔨 Ban temporaire')
            .setDescription(`${user.username} a été banni temporairement du serveur RP`)
            .addFields(
                { name: '⏰ Durée', value: `${duration} heure(s)`, inline: true },
                { name: '📅 Jusqu\'à', value: `<t:${Math.floor(banUntil.getTime() / 1000)}:F>`, inline: true },
                { name: '📝 Raison', value: reason, inline: false }
            )
            .setColor('#ff0000')
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    },

    // Retirer ban
    async unban(interaction, client, config) {
        const user = interaction.options.getUser('joueur');

        if (!serverStatus.bannedUsers.has(user.id)) {
            return interaction.reply({
                content: `❌ ${user.username} n'est pas banni.`,
                ephemeral: true
            });
        }

        serverStatus.bannedUsers.delete(user.id);
        await interaction.reply({
            content: `✅ ${user.username} a été débanni du serveur RP.`,
            ephemeral: true
        });
    }
};

module.exports = { playerCommands };