const { SlashCommandBuilder } = require('discord.js');

const commands = [
    // Commandes de base
    new SlashCommandBuilder()
        .setName('ouvrir')
        .setDescription('Ouvre le serveur privé Shindo Life RP')
        .addStringOption(option =>
            option.setName('code')
                .setDescription('Code du serveur privé')
                .setRequired(true)),

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

module.exports = commands;