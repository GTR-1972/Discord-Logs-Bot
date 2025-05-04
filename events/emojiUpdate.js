const { EmbedBuilder, AuditLogEvent } = require('discord.js');
const { CHANNEL_IDS } = require('../logs.js');

module.exports = {
    name: 'emojiUpdate',
    execute: async (oldEmoji, newEmoji) => {
        try {
            const logChannel = newEmoji.guild.channels.cache.get(CHANNEL_IDS.EMOJI_UPDATE_LOG_CHANNEL_ID);
            if (!logChannel) return;

            const auditLogs = await newEmoji.guild.fetchAuditLogs({
                type: AuditLogEvent.EmojiUpdate,
                limit: 1
            });

            const updateLog = auditLogs.entries.first();
            const updater = updateLog?.executor || { tag: 'Unknown', id: 'Unknown' };
            const reason = updateLog?.reason || 'No reason provided';

            // Find what changed
            const changes = [];
            
            if (oldEmoji.name !== newEmoji.name) {
                changes.push(`### Name : \`${oldEmoji.name}\` → \`${newEmoji.name}\``);
            }
            
            if (!oldEmoji.roles.cache.equals(newEmoji.roles.cache)) {
                changes.push(`### Role Restrictions Updated`);
            }

            if (changes.length === 0) return; // No changes to log

            const description = [
                `### Emoji : ${newEmoji} - \`${newEmoji.name}\` - \`${newEmoji.id}\``,
                ...changes,
                `### Updated By : ${updater.id !== 'Unknown' ? `<@${updater.id}> - \`${updater.id}\`` : 'Unknown'}`,
                `### Reason : ${reason}`
            ].join('\n');

            const embed = new EmbedBuilder()
                .setColor('#FF0000')
                .setAuthor({ 
                    name: `Emoji Updated`, 
                    iconURL: newEmoji.guild.iconURL() 
                })
                .setDescription(description)
                .setThumbnail(newEmoji.url);

            logChannel.send({ embeds: [embed] });
        } catch (error) {
            console.error('Error handling emoji update:', error);
        }
    }
}; 