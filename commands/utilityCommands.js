const { EmbedBuilder } = require('discord.js');

const utilityCommands = {
    // Système de rappels
    async rappel(interaction, client, config) {
        const message = interaction.options.getString('message');
        const minutes = interaction.options.getInteger('minutes');

        await interaction.reply({
            content: `⏰ Rappel programmé dans ${minutes} minute(s) !`,
            ephemeral: true
        });

        setTimeout(async () => {
            const embed = new EmbedBuilder()
                .setTitle('⏰ RAPPEL !')
                .setDescription(message)
                .addFields({
                    name: '👤 Demandé par',
                    value: `<@${interaction.user.id}>`,
                    inline: true
                })
                .setColor('#ffff00')
                .setTimestamp();

            const channel = client.channels.cache.get(config.channelId);
            if (channel) {
                await channel.send({
                    content: `<@${interaction.user.id}>`,
                    embeds: [embed]
                });
            }
        }, minutes * 60 * 1000);
    },

    // Système de sondages
    async poll(interaction, client, config) {
        const question = interaction.options.getString('question');
        const optionsStr = interaction.options.getString('options');
        const options = optionsStr.split(',').map(opt => opt.trim()).slice(0, 10);

        if (options.length < 2) {
            return interaction.reply({
                content: '❌ Tu dois fournir au moins 2 options séparées par des virgules.',
                ephemeral: true
            });
        }

        const reactions = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];

        const embed = new EmbedBuilder()
            .setTitle('📊 SONDAGE')
            .setDescription(`**${question}**\n\n${options.map((opt, i) => `${reactions[i]} ${opt}`).join('\n')}`)
            .addFields({
                name: '👤 Créé par',
                value: `<@${interaction.user.id}>`,
                inline: true
            })
            .setColor('#0099ff')
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });

        const message = await interaction.fetchReply();
        for (let i = 0; i < options.length; i++) {
            await message.react(reactions[i]);
        }
    }
};

module.exports = { utilityCommands };