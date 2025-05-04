const { EmbedBuilder, AuditLogEvent } = require('discord.js');
const { CHANNEL_IDS } = require('../logs.js');

module.exports = {
    name: 'emojiDelete',
    execute: async (emoji) => {
        try {
            const logChannel = emoji.guild.channels.cache.get(CHANNEL_IDS.EMOJI_UPDATE_LOG_CHANNEL_ID);
            if (!logChannel) return;

            const auditLogs = await emoji.guild.fetchAuditLogs({
                type: AuditLogEvent.EmojiDelete,
                limit: 1
            });

            const deleteLog = auditLogs.entries.first();
            const deleter = deleteLog?.executor || { tag: 'Unknown', id: 'Unknown' };
            const reason = deleteLog?.reason || 'No reason provided';

            const description = [
                `### Emoji : \`${emoji.name}\` - \`${emoji.id}\``,
                `### Deleted By : ${deleter.id !== 'Unknown' ? `<@${deleter.id}> - \`${deleter.id}\`` : 'Unknown'}`,
                `### Reason : ${reason}`
            ].join('\n');

            const embed = new EmbedBuilder()
                .setColor('#FF0000')
                .setAuthor({ 
                    name: `Emoji Deleted`, 
                    iconURL: emoji.guild.iconURL() 
                })
                .setDescription(description)
                .setThumbnail(emoji.url);

            logChannel.send({ embeds: [embed] });
        } catch (error) {
            console.error('Error handling emoji deletion:', error);
        }
    }
}; 