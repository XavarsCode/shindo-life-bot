const { EmbedBuilder } = require('discord.js');
const { serverStatus } = require('../data/serverState');

const eventCommands = {
    // Démarrer un événement
    async event(interaction, client, config) {
        const eventName = interaction.options.getString('nom');
        const eventDesc = interaction.options.getString('description');
        const eventDuration = interaction.options.getInteger('duree');

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

        if (eventDesc) {
            embed.addFields({
                name: '📝 Description',
                value: eventDesc,
                inline: false
            });
        }

        if (eventDuration) {
            embed.addFields({
                name: '⏱️ Durée prévue',
                value: `${eventDuration} minute(s)`,
                inline: true
            });

            // Programmer l'arrêt automatique de l'événement
            setTimeout(() => {
                if (serverStatus.eventActive && serverStatus.eventName === eventName) {
                    serverStatus.eventActive = false;
                    serverStatus.eventName = '';

                    const endEmbed = new EmbedBuilder()
                        .setTitle('⏰ Événement Terminé')
                        .setDescription(`L'événement **${eventName}** s'est terminé automatiquement.`)
                        .setColor('#666666')
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
    },

    // Arrêter un événement
    async stop_event(interaction, client, config) {
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
    },

    // Programmer un événement
    async programmer_event(interaction, client, config) {
        const eventName = interaction.options.getString('nom');
        const hours = interaction.options.getInteger('heures');
        const minutes = interaction.options.getInteger('minutes') || 0;

        const totalMs = (hours * 60 + minutes) * 60 * 1000;
        const scheduledTime = new Date(Date.now() + totalMs);

        const eventData = {
            name: eventName,
            scheduledFor: scheduledTime,
            createdBy: interaction.user.id
        };

        serverStatus.scheduledEvents.push(eventData);

        const embed = new EmbedBuilder()
            .setTitle('📅 Événement Programmé')
            .setDescription(`L'événement **${eventName}** a été programmé !`)
            .addFields(
                { name: '⏰ Prévu pour', value: `<t:${Math.floor(scheduledTime.getTime() / 1000)}:F>`, inline: true },
                { name: '⏳ Dans', value: `${hours}h ${minutes}m`, inline: true },
                { name: '👤 Organisé par', value: `<@${interaction.user.id}>`, inline: true }
            )
            .setColor('#ffaa00')
            .setTimestamp();

        await interaction.reply({
            content: '✅ Événement programmé avec succès !',
            ephemeral: true
        });

        const channel = client.channels.cache.get(config.channelId);
        if (channel) {
            await channel.send({ embeds: [embed] });
        }

        // Programmer le rappel
        setTimeout(async () => {
            const reminderEmbed = new EmbedBuilder()
                .setTitle('⏰ ÉVÉNEMENT PROGRAMMÉ !')
                .setDescription(`L'événement **${eventName}** commence maintenant !`)
                .addFields({
                    name: '👤 Organisé par',
                    value: `<@${eventData.createdBy}>`,
                    inline: true
                })
                .setColor('#ff6600')
                .setTimestamp();

            if (channel) {
                const roleText = config.roleId ? `<@&${config.roleId}>` : '@everyone';
                await channel.send({
                    content: `${roleText} 🎉 **ÉVÉNEMENT PROGRAMMÉ** 🎉`,
                    embeds: [reminderEmbed]
                });
            }

            // Retirer l'événement de la liste
            const index = serverStatus.scheduledEvents.findIndex(e => e.name === eventName);
            if (index > -1) {
                serverStatus.scheduledEvents.splice(index, 1);
            }
        }, totalMs);
    }
};

module.exports = { eventCommands };