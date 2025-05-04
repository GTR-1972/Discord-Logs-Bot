const { EmbedBuilder } = require('discord.js');
const { CHANNEL_IDS } = require('../logs.js');

module.exports = {
    name: 'guildMemberAdd',
    execute: async (member) => {
        try {
            // Handle bot additions separately
            if (member.user.bot) {
                const botLogChannel = member.guild.channels.cache.get(CHANNEL_IDS.BOT_LOG_CHANNEL_ID);
                if (botLogChannel) {
                    // Calculate account age
                    const accountAge = Math.floor((Date.now() - member.user.createdAt) / (1000 * 60 * 60 * 24));
                    
                    const description = [
                        `### Bot : <@${member.id}> - \`${member.user.tag}\` - \`${member.id}\``,
                        `### Account Created : <t:${Math.floor(member.user.createdAt / 1000)}:R>`,
                        `### Account Age : ${accountAge} days`,
                        `### Added At : <t:${Math.floor(Date.now() / 1000)}:F>`
                    ].join('\n');
                    
                    const embed = new EmbedBuilder()
                        .setColor('#FF0000')
                        .setAuthor({ 
                            name: `Bot Added to Server`, 
                            iconURL: member.guild.iconURL() 
                        })
                        .setDescription(description)
                        .setThumbnail(member.user.displayAvatarURL());
                    
                    // Send with @here mention
                    await botLogChannel.send({ 
                        content: '@here',
                        embeds: [embed] 
                    });
                }
                
                return; // Don't process regular member join for bots
            }

            // Regular member join handling (unchanged)
            const joinLogChannel = member.guild.channels.cache.get(CHANNEL_IDS.MEMBER_JOIN_LOG_CHANNEL_ID);
            if (!joinLogChannel) return;

            // Calculate account age
            const accountAge = Math.floor((Date.now() - member.user.createdAt) / (1000 * 60 * 60 * 24));
            
            const description = [
                `### Member : <@${member.id}> - \`${member.id}\``,
                `### Account Created : <t:${Math.floor(member.user.createdAt / 1000)}:R>`,
                `### Account Age : ${accountAge} days`,
                `### Member Count : ${member.guild.memberCount}`
            ].join('\n');
            
            const embed = new EmbedBuilder()
                .setColor('#FF0000') // Green for join
                .setAuthor({ 
                    name: `${member.user.tag} Joined`, 
                    iconURL: member.guild.iconURL() 
                })
                .setDescription(description)
                .setThumbnail(member.user.displayAvatarURL());
            
            joinLogChannel.send({ embeds: [embed] });
        } catch (error) {
            console.error('Error handling member join:', error);
        }
    }
}; 