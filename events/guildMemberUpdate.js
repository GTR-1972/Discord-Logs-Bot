const { EmbedBuilder, AuditLogEvent } = require('discord.js');
const { CHANNEL_IDS } = require('../logs.js');

module.exports = {
    name: 'guildMemberUpdate',
    execute: async (oldMember, newMember) => {
        try {
            // Special handling for bot permission changes
            if (newMember.user.bot && oldMember.roles.cache.size !== newMember.roles.cache.size) {
                const botLogChannel = newMember.guild.channels.cache.get(CHANNEL_IDS.BOT_LOG_CHANNEL_ID);
                if (botLogChannel) {
                    // Find added roles
                    const addedRoles = newMember.roles.cache.filter(role => !oldMember.roles.cache.has(role.id));
                    
                    // Find removed roles
                    const removedRoles = oldMember.roles.cache.filter(role => !newMember.roles.cache.has(role.id));
                    
                    // Fetch the audit logs
                    const auditLogs = await newMember.guild.fetchAuditLogs({
                        type: AuditLogEvent.MemberRoleUpdate,
                        limit: 10
                    });
                    
                    // Find the most recent audit log for this bot
                    const roleLog = auditLogs.entries.find(entry => 
                        entry.target?.id === newMember.id && 
                        Date.now() - entry.createdTimestamp < 5000
                    );
                    
                    const moderator = roleLog?.executor || { tag: 'Unknown', id: 'Unknown' };
                    const reason = roleLog?.reason || 'No reason provided';
                    
                    const addedRolesList = addedRoles.size > 0 ? 
                        addedRoles.map(r => `<@&${r.id}>`).join(', ') : 'None';
                        
                    const removedRolesList = removedRoles.size > 0 ? 
                        removedRoles.map(r => `<@&${r.id}>`).join(', ') : 'None';
                    
                    const description = [
                        `### Bot : <@${newMember.id}> - \`${newMember.user.tag}\` - \`${newMember.id}\``,
                        `### Modified By : <@${moderator.id}> - \`${moderator.tag}\` - \`${moderator.id}\``,
                        `### Reason : ${reason}`,
                        `### Roles Added : ${addedRolesList}`,
                        `### Roles Removed : ${removedRolesList}`,
                        `### Total Roles : ${newMember.roles.cache.size}`,
                        `### Modified At : <t:${Math.floor(Date.now() / 1000)}:F>`
                    ].join('\n');
                    
                    const embed = new EmbedBuilder()
                        .setColor('#FF0000')
                        .setAuthor({ 
                            name: `Bot Permissions Modified`, 
                            iconURL: newMember.guild.iconURL() 
                        })
                        .setDescription(description)
                        .setThumbnail(newMember.user.displayAvatarURL());
                    
                    // Send with @here mention
                    await botLogChannel.send({ 
                        content: '@here',
                        embeds: [embed] 
                    });
                }
            }

            // Check for boosting
            if (!oldMember.premiumSince && newMember.premiumSince) {
                const boostLogChannel = newMember.guild.channels.cache.get(CHANNEL_IDS.BOOST_LOG_CHANNEL_ID);
                if (!boostLogChannel) return;
                
                const boostLevel = newMember.guild.premiumTier;
                const boostCount = newMember.guild.premiumSubscriptionCount;
                
                const description = [
                    `### Member : <@${newMember.id}> - \`${newMember.user.tag}\` - \`${newMember.id}\``,
                    `### Boosted At : <t:${Math.floor(newMember.premiumSince.getTime() / 1000)}:F>`,
                    `### Server Boost Level : ${boostLevel}`,
                    `### Server Boost Count : ${boostCount}`
                ].join('\n');
                
                const embed = new EmbedBuilder()
                    .setColor('#FF0000') // Discord Nitro pink
                    .setAuthor({ 
                        name: `Server Boosted`, 
                        iconURL: newMember.guild.iconURL() 
                    })
                    .setDescription(description)
                    .setThumbnail(newMember.user.displayAvatarURL());
                
                boostLogChannel.send({ embeds: [embed] });
            } 
            // Check for boost removal
            else if (oldMember.premiumSince && !newMember.premiumSince) {
                const boostLogChannel = newMember.guild.channels.cache.get(CHANNEL_IDS.BOOST_LOG_CHANNEL_ID);
                if (!boostLogChannel) return;
                
                const boostLevel = newMember.guild.premiumTier;
                const boostCount = newMember.guild.premiumSubscriptionCount;
                const boostDuration = Math.floor((Date.now() - oldMember.premiumSince.getTime()) / (1000 * 60 * 60 * 24));
                
                const description = [
                    `### Member : <@${newMember.id}> - \`${newMember.user.tag}\` - \`${newMember.id}\``,
                    `### Boost Duration : ${boostDuration} days`,
                    `### Server Boost Level : ${boostLevel}`,
                    `### Server Boost Count : ${boostCount}`
                ].join('\n');
                
                const embed = new EmbedBuilder()
                    .setColor('#FF0000') // Discord Nitro pink
                    .setAuthor({ 
                        name: `Server Boost Removed`, 
                        iconURL: newMember.guild.iconURL() 
                    })
                    .setDescription(description)
                    .setThumbnail(newMember.user.displayAvatarURL());
                
                boostLogChannel.send({ embeds: [embed] });
            }

            // Check if roles have changed (for regular members only)
            if (!newMember.user.bot && oldMember.roles.cache.size !== newMember.roles.cache.size) {
                // Find added roles
                const addedRoles = newMember.roles.cache.filter(role => !oldMember.roles.cache.has(role.id));
                
                // Find removed roles
                const removedRoles = oldMember.roles.cache.filter(role => !newMember.roles.cache.has(role.id));
                
                // Fetch the audit logs first to avoid multiple calls
                const auditLogs = await newMember.guild.fetchAuditLogs({
                    type: AuditLogEvent.MemberRoleUpdate,
                    limit: 10 // Check more entries to increase chances of finding the right one
                });
                
                // If there are added roles
                if (addedRoles.size > 0) {
                    const roleAddLogChannel = newMember.guild.channels.cache.get(CHANNEL_IDS.ROLE_ADD_LOG_CHANNEL_ID);
                    if (!roleAddLogChannel) return;
                    
                    // For each added role, create a log
                    for (const [_, role] of addedRoles) {
                        // Find the audit log entry that matches this role addition
                        const roleLog = auditLogs.entries.find(entry => 
                            entry.target?.id === newMember.id && 
                            entry.changes?.some(change => 
                                change.key === '$add' && 
                                Array.isArray(change.new) && 
                                change.new.some(r => r.id === role.id)
                            )
                        );
                        
                        // If no matching audit log, try a more generic approach or skip
                        if (!roleLog) {
                            // Try to find any role update for this user in the last 5 seconds
                            const recentLog = auditLogs.entries.find(entry => 
                                entry.target?.id === newMember.id && 
                                Date.now() - entry.createdTimestamp < 5000
                            );
                            
                            if (!recentLog) continue; // Skip if we can't find any recent logs
                            
                            const moderator = recentLog.executor;
                            const reason = recentLog.reason || 'No reason provided';
                            
                            const description = [
                                `### Member : <@${newMember.id}> - \`${newMember.id}\``,
                                `### Role Added : <@&${role.id}> - \`${role.name}\` - \`${role.id}\``,
                                `### Added By : <@${moderator.id}> - \`${moderator.id}\``,
                                `### Reason : ${reason}`
                            ].join('\n');
                            
                            const embed = new EmbedBuilder()
                                .setColor('#00FF00') // Green for role addition
                                .setAuthor({ 
                                    name: `Role Added`, 
                                    iconURL: newMember.guild.iconURL() 
                                })
                                .setDescription(description)
                                .setThumbnail(newMember.user.displayAvatarURL());
                            
                            roleAddLogChannel.send({ embeds: [embed] });
                        } else {
                            // If we found an exact match, use that
                            const moderator = roleLog.executor;
                            const reason = roleLog.reason || 'No reason provided';
                            
                            const description = [
                                `### Member : <@${newMember.id}> - \`${newMember.id}\``,
                                `### Role Added : <@&${role.id}> - \`${role.name}\` - \`${role.id}\``,
                                `### Added By : <@${moderator.id}> - \`${moderator.id}\``,
                                `### Reason : ${reason}`
                            ].join('\n');
                            
                            const embed = new EmbedBuilder()
                                .setColor('#FF0000') // Green for role addition
                                .setAuthor({ 
                                    name: `Role Added`, 
                                    iconURL: newMember.guild.iconURL() 
                                })
                                .setDescription(description)
                                .setThumbnail(newMember.user.displayAvatarURL());
                            
                            roleAddLogChannel.send({ embeds: [embed] });
                        }
                    }
                }
                
                // If there are removed roles
                if (removedRoles.size > 0) {
                    const roleRemoveLogChannel = newMember.guild.channels.cache.get(CHANNEL_IDS.ROLE_REMOVE_LOG_CHANNEL_ID);
                    if (!roleRemoveLogChannel) return;
                    
                    // For each removed role, create a log
                    for (const [_, role] of removedRoles) {
                        // Find the audit log entry that matches this role removal
                        const roleLog = auditLogs.entries.find(entry => 
                            entry.target?.id === newMember.id && 
                            entry.changes?.some(change => 
                                change.key === '$remove' && 
                                Array.isArray(change.new) && 
                                change.new.some(r => r.id === role.id)
                            )
                        );
                        
                        // If no matching audit log, try a more generic approach or skip
                        if (!roleLog) {
                            // Try to find any role update for this user in the last 5 seconds
                            const recentLog = auditLogs.entries.find(entry => 
                                entry.target?.id === newMember.id && 
                                Date.now() - entry.createdTimestamp < 5000
                            );
                            
                            if (!recentLog) continue; // Skip if we can't find any recent logs
                            
                            const moderator = recentLog.executor;
                            const reason = recentLog.reason || 'No reason provided';
                            
                            const description = [
                                `### Member : <@${newMember.id}> - \`${newMember.id}\``,
                                `### Role Removed : <@&${role.id}> - \`${role.name}\` - \`${role.id}\``,
                                `### Removed By : <@${moderator.id}> - \`${moderator.id}\``,
                                `### Reason : ${reason}`
                            ].join('\n');
                            
                            const embed = new EmbedBuilder()
                                .setColor('#FF0000') // Red for role removal
                                .setAuthor({ 
                                    name: `Role Removed`, 
                                    iconURL: newMember.guild.iconURL() 
                                })
                                .setDescription(description)
                                .setThumbnail(newMember.user.displayAvatarURL());
                            
                            roleRemoveLogChannel.send({ embeds: [embed] });
                        } else {
                            // If we found an exact match, use that
                            const moderator = roleLog.executor;
                            const reason = roleLog.reason || 'No reason provided';
                            
                            const description = [
                                `### Member : <@${newMember.id}> - \`${newMember.id}\``,
                                `### Role Removed : <@&${role.id}> - \`${role.name}\` - \`${role.id}\``,
                                `### Removed By : <@${moderator.id}> - \`${moderator.id}\``,
                                `### Reason : ${reason}`
                            ].join('\n');
                            
                            const embed = new EmbedBuilder()
                                .setColor('#FF0000') // Red for role removal
                                .setAuthor({ 
                                    name: `Role Removed`, 
                                    iconURL: newMember.guild.iconURL() 
                                })
                                .setDescription(description)
                                .setThumbnail(newMember.user.displayAvatarURL());
                            
                            roleRemoveLogChannel.send({ embeds: [embed] });
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Error handling guild member update:', error);
        }
    }
}; 