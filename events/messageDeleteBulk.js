const { EmbedBuilder, AuditLogEvent, AttachmentBuilder } = require('discord.js');
const { CHANNEL_IDS } = require('../logs.js');

module.exports = {
    name: 'messageDeleteBulk',
    execute: async (messages) => {
        try {
            if (!messages.first().guild) return;
            
            const logChannel = messages.first().guild.channels.cache.get(CHANNEL_IDS.MESSAGE_LOG_CHANNEL_ID);
            if (!logChannel) return;
            
            // Try to find who deleted from audit logs
            let deleter = { tag: 'Unknown', id: 'Unknown' };
            let reason = 'No reason provided';
            
            try {
                const auditLogs = await messages.first().guild.fetchAuditLogs({
                    type: AuditLogEvent.MessageBulkDelete,
                    limit: 1
                });
                
                const deleteLog = auditLogs.entries.first();
                if (deleteLog) {
                    deleter = deleteLog.executor || deleter;
                    reason = deleteLog.reason || reason;
                }
            } catch (err) {
                console.error('Error fetching audit logs for bulk message deletion:', err);
            }
            
            const description = [
                `### Channel : <#${messages.first().channel.id}> - \`${messages.first().channel.id}\``,
                `### Count : \`${messages.size} messages\``,
                `### Deleted By : ${deleter.id !== 'Unknown' ? `<@${deleter.id}> - \`${deleter.id}\`` : 'Unknown'}`,
                deleter.id !== 'Unknown' ? `### Reason : ${reason}` : ''
            ].filter(Boolean).join('\n');
            
            const embed = new EmbedBuilder()
                .setColor('#FF0000') // Red for deletes
                .setAuthor({ 
                    name: `Bulk Messages Deleted`,
                    iconURL: messages.first().guild.iconURL() 
                })
                .setDescription(description);
                
            await logChannel.send({ embeds: [embed] });
            
            // Create a text file with deleted messages if there are many
            if (messages.size > 5) {
                const messageLog = [];
                
                messages.forEach(msg => {
                    if (msg.author) {
                        const time = new Date(msg.createdTimestamp).toLocaleString();
                        messageLog.push(`[${time}] ${msg.author.tag} (${msg.author.id}): ${msg.content || '[No content]'}`);
                        
                        // Add attachments if any
                        if (msg.attachments.size > 0) {
                            msg.attachments.forEach(attachment => {
                                messageLog.push(`[Attachment: ${attachment.name || 'unknown'} - ${attachment.url}]`);
                            });
                        }
                        
                        messageLog.push('---');
                    }
                });
                
                // Only create log file if we have messages
                if (messageLog.length > 0) {
                    const logText = messageLog.join('\n');
                    
                    const attachment = new AttachmentBuilder(
                        Buffer.from(logText, 'utf-8'), 
                        { name: `deleted-messages-${Date.now()}.txt` }
                    );
                    
                    await logChannel.send({ 
                        content: 'Deleted messages log:',
                        files: [attachment] 
                    });
                }
            } 
            // For a small number of messages, include in the embed
            else if (messages.size > 0) {
                let messageFields = [];
                
                messages.forEach(msg => {
                    if (msg.author) {
                        const time = new Date(msg.createdTimestamp).toLocaleString();
                        const content = msg.content ? 
                            (msg.content.length > 1024 ? msg.content.slice(0, 1021) + '...' : msg.content) : 
                            '[No content]';
                        
                        const attachmentText = msg.attachments.size > 0 ? 
                            `\n[${msg.attachments.size} attachment(s)]` : '';
                        
                        messageFields.push({
                            name: `Message by ${msg.author.tag} (${msg.author.id})`, 
                            value: `${content}${attachmentText}\nSent: ${time}`
                        });
                    }
                });
                
                // Add up to 10 fields for individual messages
                messageFields.slice(0, 10).forEach(field => {
                    embed.addFields(field);
                });
                
                if (messageFields.length > 10) {
                    embed.addFields({ 
                        name: 'Additional Messages', 
                        value: `${messageFields.length - 10} more messages were deleted`
                    });
                }
                
                await logChannel.send({ embeds: [embed] });
            }
        } catch (error) {
            console.error('Error handling bulk message deletion:', error);
        }
    }
}; 