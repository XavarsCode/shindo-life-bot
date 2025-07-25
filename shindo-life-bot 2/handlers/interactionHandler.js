const { serverCommands } = require('../commands/serverCommands');
const { eventCommands } = require('../commands/eventCommands');
const { playerCommands } = require('../commands/playerCommands');
const { utilityCommands } = require('../commands/utilityCommands');
const { gameCommands } = require('../commands/gameCommands');

async function handleInteraction(interaction, client, config) {
    // Vérifie si l'interaction est une commande de chat (slash command)
    if (!interaction.isChatInputCommand()) return;

    // Commandes nécessitant des permissions d'administrateur ou un rôle spécifique
    const adminCommands = [
        'ouvrir', 'fermer', 'event', 'joueurs', 'config', 'stop_event', 
        'maintenance', 'tempban', 'unban', 'whitelist', 'queue', 'programmer_event'
    ];

    // Vérifie si l'utilisateur a la permission d'administrateur OU le rôle configuré
    const hasPermission = interaction.member.permissions.has('Administrator') || 
                          (config.roleId && interaction.member.roles.cache.has(config.roleId));

    // Si la commande est une commande admin et que l'utilisateur n'a pas les permissions
    if (adminCommands.includes(interaction.commandName) && !hasPermission) {
        return interaction.reply({
            content: '❌ Tu n\'as pas la permission d\'utiliser cette commande.',
            ephemeral: true // Seul l'utilisateur voit ce message
        });
    }

    try {
        const commandName = interaction.commandName;

        // Dispatch des commandes en fonction de leur catégorie
        if (['ouvrir', 'fermer', 'statut', 'maintenance', 'config'].includes(commandName)) {
            await serverCommands[commandName](interaction, client, config);
        }
        else if (['event', 'stop_event', 'programmer_event'].includes(commandName)) {
            await eventCommands[commandName](interaction, client, config);
        }
        else if (['joueurs', 'queue', 'whitelist', 'tempban', 'unban'].includes(commandName)) {
            await playerCommands[commandName](interaction, client, config);
        }
        else if (['rappel', 'poll'].includes(commandName)) {
            await utilityCommands[commandName](interaction, client, config);
        }
        else if (['info', 'spin', 'stats'].includes(commandName)) {
            await gameCommands[commandName](interaction, client, config);
        }

    } catch (error) {
        console.error('Erreur lors de l\'exécution de la commande:', error);
        // Répond à l'interaction en cas d'erreur, si ce n'est pas déjà fait
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
                content: '❌ Une erreur est survenue lors de l\'exécution de la commande.',
                ephemeral: true
            });
        }
    }
}

// Exporte la fonction handleInteraction pour qu'elle puisse être importée ailleurs (ex: index.js)
module.exports = { handleInteraction };