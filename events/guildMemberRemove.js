const { EmbedBuilder, AuditLogEvent } = require('discord.js');
const { CHANNEL_IDS } = require('../logs.js');

module.exports = {
    name: 'guildMemberRemove',
    execute: async (member) => {
        try {
            // Handle bot removals separately
            if (member.user.bot) {
                const botLogChannel = member.guild.channels.cache.get(CHANNEL_IDS.BOT_LOG_CHANNEL_ID);
                if (botLogChannel) {
                    // Check audit logs for kick actions
                    let action = 'Left';
                    let moderator = null;
                    let reason = 'No reason provided';
                    
                    try {
                        // Check for kicks
                        const kickLogs = await member.guild.fetchAuditLogs({
                            type: AuditLogEvent.MemberKick,
                            limit: 5
                        });
                        
                        const kickEntry = kickLogs.entries.find(e => 
                            e.target?.id === member.id && 
                            Date.now() - e.createdTimestamp < 5000
                        );
                        
                        if (kickEntry) {
                            action = 'Kicked';
                            moderator = kickEntry.executor;
                            reason = kickEntry.reason || reason;
                        } else {
                            // Check for bans if not kicked
                            const banLogs = await member.guild.fetchAuditLogs({
                                type: AuditLogEvent.MemberBanAdd,
                                limit: 5
                            });
                            
                            const banEntry = banLogs.entries.find(e => 
                                e.target?.id === member.id && 
                                Date.now() - e.createdTimestamp < 5000
                            );
                            
                            if (banEntry) {
                                action = 'Banned';
                                moderator = banEntry.executor;
                                reason = banEntry.reason || reason;
                            }
                        }
                    } catch (err) {
                        console.error('Error checking audit logs for bot removal:', err);
                    }
                    
                    // Calculate time in server if available
                    const joinDurationDays = member.joinedAt ? 
                        Math.floor((Date.now() - member.joinedAt.getTime()) / (1000 * 60 * 60 * 24)) : 
                        'Unknown';
                    
                    const description = [
                        `### Bot : <@${member.id}> - \`${member.user.tag}\` - \`${member.id}\``,
                        action !== 'Left' && moderator ? `### ${action} By : <@${moderator.id}> - \`${moderator.tag}\` - \`${moderator.id}\`` : '',
                        action !== 'Left' ? `### Reason : ${reason}` : '',
                        member.joinedAt ? `### Added : <t:${Math.floor(member.joinedAt.getTime() / 1000)}:R>` : '',
                        `### Time in Server : ${joinDurationDays} days`,
                        `### Removed At : <t:${Math.floor(Date.now() / 1000)}:F>`
                    ].filter(line => line !== '').join('\n');
                    
                    const embed = new EmbedBuilder()
                        .setColor('#FF0000')
                        .setAuthor({ 
                            name: `Bot ${action} Server`, 
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
                
                return; // Don't process regular member leave for bots
            }

            // Regular member leave handling (unchanged)
            const leaveLogChannel = member.guild.channels.cache.get(CHANNEL_IDS.MEMBER_LEAVE_LOG_CHANNEL_ID);
            if (!leaveLogChannel) {
                console.error('Leave log channel not found');
                return;
            }

            // Calculate durations
            const accountAgeDays = Math.floor((Date.now() - member.user.createdAt.getTime()) / (1000 * 60 * 60 * 24));
            const joinDurationDays = member.joinedAt ? 
                Math.floor((Date.now() - member.joinedAt.getTime()) / (1000 * 60 * 60 * 24)) : 
                'Unknown';

            // Check audit logs for kick/ban actions
            let action = 'Left';
            let moderator = null;
            let reason = 'No reason provided';
            let color = '#FFA500'; // Orange for regular leave

            try {
                // Check for kicks
                const kickLogs = await member.guild.fetchAuditLogs({
                    type: AuditLogEvent.MemberKick,
                    limit: 5
                });

                const kickEntry = kickLogs.entries.find(e => 
                    e.target?.id === member.id && 
                    Date.now() - e.createdTimestamp < 5000
                );

                if (kickEntry) {
                    action = 'Kicked';
                    moderator = kickEntry.executor;
                    reason = kickEntry.reason || reason;
                    color = '#FF0000'; // Red for kick
                } else {
                    // Check for bans if not kicked (though bans should be handled by guildBanAdd)
                    const banLogs = await member.guild.fetchAuditLogs({
                        type: AuditLogEvent.MemberBanAdd,
                        limit: 5
                    });

                    const banEntry = banLogs.entries.find(e => 
                        e.target?.id === member.id && 
                        Date.now() - e.createdTimestamp < 5000
                    );

                    if (banEntry) return; // Let guildBanAdd handle bans
                }
            } catch (err) {
                console.error('Error checking audit logs:', err);
            }

            // Build description with markdown formatting
            const description = [
                `### User : <@${member.id}> - \`${member.user.tag}\` - \`${member.id}\``,
                action === 'Kicked' && moderator ? `### Moderator : <@${moderator.id}> - \`${moderator.tag}\`` : '',
                action === 'Kicked' ? `### Reason : ${reason}` : '',
                `### Account Created : <t:${Math.floor(member.user.createdAt.getTime() / 1000)}:R>`,
                `### Account Age : ${accountAgeDays} days`,
                member.joinedAt ? `### Joined Server : <t:${Math.floor(member.joinedAt.getTime() / 1000)}:R>` : '',
                `### Time in Server : ${joinDurationDays} days`,
                `### Member Count : ${member.guild.memberCount}`
            ].filter(line => line !== '').join('\n');

            const embed = new EmbedBuilder()
                .setColor(color)
                .setAuthor({ 
                    name: `User ${action}`, 
                    iconURL: member.guild.iconURL() 
                })
                .setDescription(description)
                .setThumbnail(member.user.displayAvatarURL());

            await leaveLogChannel.send({ embeds: [embed] });
        } catch (error) {
            console.error('Error in guildMemberRemove handler:', error);
        }
    }
}; 