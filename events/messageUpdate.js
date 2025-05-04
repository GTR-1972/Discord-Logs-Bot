const { EmbedBuilder } = require('discord.js');
const { CHANNEL_IDS } = require('../logs.js');

module.exports = {
    name: 'messageUpdate',
    execute: async (oldMessage, newMessage) => {
        try {
            // Skip if it's a bot message or no content
            if (oldMessage.author?.bot || !oldMessage.content || !newMessage.content) return;
            
            // Skip if content didn't change
            if (oldMessage.content === newMessage.content) return;
            
            // Skip if it's a DM
            if (!newMessage.guild) return;
            
            const logChannel = newMessage.guild.channels.cache.get(CHANNEL_IDS.MESSAGE_LOG_CHANNEL_ID);
            if (!logChannel) return;
            
            // For long messages, trim the content
            const oldContent = oldMessage.content.length > 1024 ? 
                oldMessage.content.slice(0, 1021) + '...' : oldMessage.content;
                
            const newContent = newMessage.content.length > 1024 ? 
                newMessage.content.slice(0, 1021) + '...' : newMessage.content;
            
            const description = [
                `### Author : <@${oldMessage.author.id}> - \`${oldMessage.author.tag}\` - \`${oldMessage.author.id}\``,
                `### Channel : <#${oldMessage.channel.id}> - \`${oldMessage.channel.id}\``,
                `### Message Link : [Jump to Message](${newMessage.url})`,
                `### Created : <t:${Math.floor(oldMessage.createdTimestamp / 1000)}:F>`,
                `### Edited : <t:${Math.floor(Date.now() / 1000)}:F>`
            ].join('\n');
            
            const embed = new EmbedBuilder()
                .setColor('#FFA500') // Orange for edits
                .setAuthor({ 
                    name: `Message Edited`,
                    iconURL: oldMessage.author.displayAvatarURL() 
                })
                .setDescription(description)
                .addFields(
                    { name: 'Original Message', value: oldContent || '*No content*' },
                    { name: 'Edited Message', value: newContent || '*No content*' }
                );

            // Add attachments notice if any
            if (oldMessage.attachments.size > 0) {
                embed.addFields({ name: 'Attachments', value: `Message had ${oldMessage.attachments.size} attachment(s)` });
            }

            logChannel.send({ embeds: [embed] });
        } catch (error) {
            console.error('Error handling message edit:', error);
        }
    }
}; 