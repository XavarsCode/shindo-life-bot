const { Client, GatewayIntentBits, ActivityType } = require('discord.js');
const { deployCommands } = require('./commands/deploy');
const { handleInteraction } = require('./handlers/interactionHandler');
const { keepAlive } = require('./utils/keepAlive');

// Configuration du bot
const config = {
    token: process.env['TOKEN'],
    clientId: process.env['CLIENT_ID'],
    channelId: process.env['CHANNEL_ID'],
    roleId: process.env['ROLE_ID'],
};

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages
    ]
});

// Quand le bot se connecte
client.once('ready', async () => {
    console.log(`✅ Bot connecté en tant que ${client.user.tag}`);

    // Statut du bot
    client.user.setActivity('Shindo Life RP', { type: ActivityType.Watching });

    // Déployer les commandes
    await deployCommands(config.token, config.clientId);
});

// Gestion des interactions
client.on('interactionCreate', async interaction => {
    await handleInteraction(interaction, client, config);
});

// Démarrer le bot
client.login(config.token);