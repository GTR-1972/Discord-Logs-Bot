const { EmbedBuilder, AuditLogEvent } = require('discord.js');
const { CHANNEL_IDS } = require('../logs.js');

module.exports = {
    name: 'messageDelete',
    execute: async (message) => {
        try {
            // Skip if it's a bot message
            if (message.author?.bot) return;
            
            // Skip if it's a DM or no guild
            if (!message.guild) return;
            
            const logChannel = message.guild.channels.cache.get(CHANNEL_IDS.MESSAGE_LOG_CHANNEL_ID);
            if (!logChannel) return;
            
            // Try to find who deleted it from audit logs
            let deleter = { tag: 'Unknown', id: 'Unknown' };
            let reason = 'No reason provided';
            
            try {
                const auditLogs = await message.guild.fetchAuditLogs({
                    type: AuditLogEvent.MessageDelete,
                    limit: 5
                });
                
                // Find the log entry that matches this message
                const deleteLog = auditLogs.entries.find(
                    entry => entry.target.id === message.author.id &&
                    (entry.extra.channel.id === message.channel.id) &&
                    (Date.now() - entry.createdTimestamp < 10000)
                );
                
                if (deleteLog) {
                    deleter = deleteLog.executor || deleter;
                    reason = deleteLog.reason || reason;
                }
            } catch (err) {
                // If we can't get audit logs, continue with unknown deleter
                console.error('Error fetching audit logs for message deletion:', err);
            }
            
            // For long messages, trim the content
            const content = message.content && message.content.length > 1024 ? 
                message.content.slice(0, 1021) + '...' : message.content;
            
            const description = [
                `### Author : <@${message.author.id}> - \`${message.author.tag}\` - \`${message.author.id}\``,
                `### Channel : <#${message.channel.id}> - \`${message.channel.id}\``,
                `### Created : <t:${Math.floor(message.createdTimestamp / 1000)}:F>`,
                `### Deleted : <t:${Math.floor(Date.now() / 1000)}:F>`,
                `### Deleted By : ${deleter.id !== 'Unknown' ? `<@${deleter.id}> - \`${deleter.id}\`` : 'Unknown or Self'}`,
                deleter.id !== 'Unknown' ? `### Reason : ${reason}` : ''
            ].filter(Boolean).join('\n');
            
            const embed = new EmbedBuilder()
                .setColor('#FF0000') // Red for deletes
                .setAuthor({ 
                    name: `Message Deleted`,
                    iconURL: message.author.displayAvatarURL() 
                })
                .setDescription(description);
            
            // Add message content if any
            if (content) {
                embed.addFields({ name: 'Content', value: content });
            }
            
            // Add attachments if any
            if (message.attachments.size > 0) {
                const attachmentsList = message.attachments.map((attachment, id) => 
                    `[${attachment.name || 'Attachment'}](${attachment.proxyURL})`
                ).join('\n');
                
                embed.addFields({ 
                    name: `Attachments (${message.attachments.size})`, 
                    value: attachmentsList.length > 1024 ? 
                        `${message.attachments.size} attachments were deleted` : attachmentsList
                });
            }

            logChannel.send({ embeds: [embed] });
        } catch (error) {
            console.error('Error handling message deletion:', error);
        }
    }
}; 