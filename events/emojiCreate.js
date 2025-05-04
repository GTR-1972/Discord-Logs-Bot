const { EmbedBuilder, AuditLogEvent } = require('discord.js');
const { CHANNEL_IDS } = require('../logs.js');

module.exports = {
    name: 'emojiCreate',
    execute: async (emoji) => {
        try {
            const logChannel = emoji.guild.channels.cache.get(CHANNEL_IDS.EMOJI_UPDATE_LOG_CHANNEL_ID);
            if (!logChannel) return;

            const auditLogs = await emoji.guild.fetchAuditLogs({
                type: AuditLogEvent.EmojiCreate,
                limit: 1
            });

            const createLog = auditLogs.entries.first();
            const creator = createLog?.executor || { tag: 'Unknown', id: 'Unknown' };
            const reason = createLog?.reason || 'No reason provided';

            const description = [
                `### Emoji : ${emoji} - \`${emoji.name}\` - \`${emoji.id}\``,
                `### Animated : \`${emoji.animated}\``,
                `### Available : \`${emoji.available}\``,
                `### Created By : ${creator.id !== 'Unknown' ? `<@${creator.id}> - \`${creator.id}\`` : 'Unknown'}`,
                `### Reason : ${reason}`
            ].join('\n');

            const embed = new EmbedBuilder()
                .setColor('#FF0000')
                .setAuthor({ 
                    name: `Emoji Created`, 
                    iconURL: emoji.guild.iconURL() 
                })
                .setDescription(description)
                .setThumbnail(emoji.url);

            logChannel.send({ embeds: [embed] });
        } catch (error) {
            console.error('Error handling emoji creation:', error);
        }
    }
}; 