const { EmbedBuilder } = require('discord.js');
const { serverStatus, gameData } = require('../data/serverState');

const gameCommands = {
    // Statistiques du serveur
    async stats(interaction, client, config) {
        const uptime = Math.floor((Date.now() - client.readyTimestamp) / 1000);

        const embed = new EmbedBuilder()
            .setTitle('📊 Statistiques du serveur RP')
            .addFields(
                { name: '🎮 Sessions totales', value: `${serverStatus.serverStats.totalSessions}`, inline: true },
                { name: '👥 Joueurs actuels', value: `${serverStatus.playerCount}/${serverStatus.maxPlayers}`, inline: true },
                { name: '📋 File d\'attente', value: `${serverStatus.queue.length}`, inline: true },
                { name: '📝 Whitelist', value: `${serverStatus.whitelist.size} joueur(s)`, inline: true },
                { name: '🔨 Bannis', value: `${serverStatus.bannedUsers.size} joueur(s)`, inline: true },
                { name: '⏰ Uptime bot', value: `<t:${Math.floor((Date.now() - uptime * 1000) / 1000)}:R>`, inline: true }
            )
            .setColor('#0099ff')
            .setTimestamp();

        if (serverStatus.serverStats.lastOpened) {
            embed.addFields({
                name: '🕐 Dernière ouverture',
                value: `<t:${Math.floor(serverStatus.serverStats.lastOpened.getTime() / 1000)}:R>`,
                inline: true
            });
        }

        await interaction.reply({ embeds: [embed] });
    },

    // Informations sur le jeu
    async info(interaction, client, config) {
        const type = interaction.options.getString('type');
        let embed;

        switch (type) {
            case 'clans':
                const randomClans = gameData.clans.sort(() => 0.5 - Math.random()).slice(0, 15);
                embed = new EmbedBuilder()
                    .setTitle('🏛️ Clans Shindo Life')
                    .setDescription('Voici quelques clans disponibles dans Shindo Life :')
                    .addFields({
                        name: '🎯 Clans populaires',
                        value: randomClans.join(', '),
                        inline: false
                    })
                    .setColor('#purple')
                    .setFooter({ text: 'Utilise /spin clan pour un clan aléatoire !' });
                break;

            case 'elements':
                embed = new EmbedBuilder()
                    .setTitle('⚡ Éléments Ninja')
                    .setDescription('Les différents éléments et kekkei genkai :')
                    .addFields(
                        { name: '🔥 Éléments de base', value: 'Feu, Eau, Terre, Vent, Foudre', inline: false },
                        { name: '❄️ Kekkei Genkai', value: gameData.elements.slice(5).join(', '), inline: false }
                    )
                    .setColor('#cyan')
                    .setFooter({ text: 'Utilise /spin element pour un élément aléatoire !' });
                break;

            case 'villages':
                embed = new EmbedBuilder()
                    .setTitle('🏘️ Villages Ninja')
                    .setDescription('Les villages cachés du monde ninja :')
                    .addFields({
                        name: '🌟 Villages disponibles',
                        value: gameData.villages.join('\n'),
                        inline: false
                    })
                    .setColor('#green')
                    .setFooter({ text: 'Utilise /spin village pour un village aléatoire !' });
                break;

            case 'bijuu':
                embed = new EmbedBuilder()
                    .setTitle('👹 Démons à Queues (Bijū)')
                    .setDescription('Les neuf démons à queues légendaires :')
                    .addFields({
                        name: '🦊 Liste des Bijū',
                        value: gameData.bijuu.join('\n'),
                        inline: false
                    })
                    .setColor('#red')
                    .setFooter({ text: 'Chaque Bijū a des pouvoirs uniques !' });
                break;
        }

        await interaction.reply({ embeds: [embed] });
    },

    // Générateur aléatoire
    async spin(interaction, client, config) {
        const type = interaction.options.getString('type');
        let result, embed;

        switch (type) {
            case 'clan':
                result = gameData.clans[Math.floor(Math.random() * gameData.clans.length)];
                embed = new EmbedBuilder()
                    .setTitle('🎲 Clan Aléatoire')
                    .setDescription(`Tu as obtenu le clan : **${result}** !`)
                    .setColor('#purple')
                    .setFooter({ text: 'Bonne chance avec ce clan !' });
                break;

            case 'element':
                result = gameData.elements[Math.floor(Math.random() * gameData.elements.length)];
                embed = new EmbedBuilder()
                    .setTitle('🎲 Élément Aléatoire')
                    .setDescription(`Tu as obtenu l'élément : **${result}** !`)
                    .setColor('#cyan')
                    .setFooter({ text: 'Maîtrise cet élément !' });
                break;

            case 'village':
                result = gameData.villages[Math.floor(Math.random() * gameData.villages.length)];
                embed = new EmbedBuilder()
                    .setTitle('🎲 Village Aléatoire')
                    .setDescription(`Tu appartiens à : **${result}** !`)
                    .setColor('#green')
                    .setFooter({ text: 'Honore ton village !' });
                break;

            case 'build':
                const randomClan = gameData.clans[Math.floor(Math.random() * gameData.clans.length)];
                const randomElement = gameData.elements[Math.floor(Math.random() * gameData.elements.length)];
                const randomVillage = gameData.villages[Math.floor(Math.random() * gameData.villages.length)];

                embed = new EmbedBuilder()
                    .setTitle('🎲 Build Complet Aléatoire')
                    .setDescription('Voici ton build généré aléatoirement :')
                    .addFields(
                        { name: '🏛️ Clan', value: randomClan, inline: true },
                        { name: '⚡ Élément', value: randomElement, inline: true },
                        { name: '🏘️ Village', value: randomVillage, inline: true }
                    )
                    .setColor('#gold')
                    .setFooter({ text: 'Build unique généré pour toi !' });
                break;
        }

        await interaction.reply({ embeds: [embed] });
    }
};

module.exports = { gameCommands };