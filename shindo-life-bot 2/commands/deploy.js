const { REST, Routes } = require('discord.js');
const commands = require('./commandsList');

async function deployCommands(token, clientId) {
    const rest = new REST({ version: '10' }).setToken(token);

    try {
        console.log('🔄 Déploiement des commandes slash...');

        await rest.put(
            Routes.applicationCommands(clientId),
            { body: commands },
        );

        console.log('✅ Commandes slash déployées avec succès !');
    } catch (error) {
        console.error('❌ Erreur lors du déploiement des commandes:', error);
    }
}

module.exports = { deployCommands };