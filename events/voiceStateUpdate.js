const { EmbedBuilder, AuditLogEvent } = require('discord.js');
const { CHANNEL_IDS } = require('../logs.js');

module.exports = {
    name: 'voiceStateUpdate',
    execute: async (oldState, newState) => {
        try {
            // Check for server mute/unmute (not self-mute)
            if (oldState.serverMute !== newState.serverMute) {
                const muteLogChannel = newState.guild.channels.cache.get(CHANNEL_IDS.MUTE_LOG_CHANNEL_ID);
                if (!muteLogChannel) return;
                
                const auditLogs = await newState.guild.fetchAuditLogs({
                    type: AuditLogEvent.MemberUpdate,
                    limit: 1
                });
                
                const muteLog = auditLogs.entries.first();
                // If no audit log entry is found or it's too old (more than 5 seconds), it's likely a self-mute
                if (!muteLog || (Date.now() - muteLog.createdTimestamp > 5000)) {
                    return; // Skip logging for self-mutes
                }
                
                const moderator = muteLog.executor || { tag: 'Unknown', id: 'Unknown' };
                const action = newState.serverMute ? 'Muted' : 'Unmuted';
                const color = '#FF0000'; // Red for both mute and unmute
                const reason = muteLog.reason || 'No reason provided';
                
                const description = [
                    `### Member : <@${newState.member.id}> - \`${newState.member.id}\``,
                    `### Voice Channel : ${newState.channel ? `<#${newState.channel.id}> - \`${newState.channel.id}\`` : 'None'}`,
                    `### ${action} by : ${moderator.id !== 'Unknown' ? `<@${moderator.id}> - \`${moderator.id}\`` : 'Unknown'}`,
                    `### Reason : ${reason}`
                ].join('\n');
                
                const embed = new EmbedBuilder()
                    .setColor(color)
                    .setAuthor({ 
                        name: `${action} - Voice Moderation`, 
                        iconURL: newState.guild.iconURL() 
                    })
                    .setDescription(description)
                    .setThumbnail(newState.member.user.displayAvatarURL());
                
                muteLogChannel.send({ embeds: [embed] });
            }
            
            // Check for server deafen/undeafen (not self-deafen)
            if (oldState.serverDeaf !== newState.serverDeaf) {
                const channelId = newState.serverDeaf ? CHANNEL_IDS.DEAFEN_LOG_CHANNEL_ID : CHANNEL_IDS.UNDEAFEN_LOG_CHANNEL_ID;
                const logChannel = newState.guild.channels.cache.get(channelId);
                if (!logChannel) return;
                
                const auditLogs = await newState.guild.fetchAuditLogs({
                    type: AuditLogEvent.MemberUpdate,
                    limit: 1
                });
                
                const deafLog = auditLogs.entries.first();
                // If no audit log entry is found or it's too old (more than 5 seconds), it's likely a self-deafen
                if (!deafLog || (Date.now() - deafLog.createdTimestamp > 5000)) {
                    return; // Skip logging for self-deafen actions
                }
                
                const moderator = deafLog.executor || { tag: 'Unknown', id: 'Unknown' };
                const action = newState.serverDeaf ? 'Deafened' : 'Undeafened';
                const color = '#FF0000'; // Red for both actions
                const reason = deafLog.reason || 'No reason provided';
                
                const description = [
                    `### Member : <@${newState.member.id}> - \`${newState.member.id}\``,
                    `### Voice Channel : ${newState.channel ? `<#${newState.channel.id}> - \`${newState.channel.id}\`` : 'None'}`,
                    `### ${action} by : ${moderator.id !== 'Unknown' ? `<@${moderator.id}> - \`${moderator.id}\`` : 'Unknown'}`,
                    `### Reason : ${reason}`
                ].join('\n');
                
                const embed = new EmbedBuilder()
                    .setColor(color)
                    .setAuthor({ 
                        name: `${action} - Voice Moderation`, 
                        iconURL: newState.guild.iconURL() 
                    })
                    .setDescription(description)
                    .setThumbnail(newState.member.user.displayAvatarURL());
                
                logChannel.send({ embeds: [embed] });
            }
            
            // Check for voice channel move (when someone is moved, not when they join/leave)
            if (oldState.channel && newState.channel && oldState.channel.id !== newState.channel.id) {
                const moveLogChannel = newState.guild.channels.cache.get(CHANNEL_IDS.MOVE_LOG_CHANNEL_ID);
                if (!moveLogChannel) return;
                
                const auditLogs = await newState.guild.fetchAuditLogs({
                    type: AuditLogEvent.MemberMove,
                    limit: 1
                });
                
                const moveLog = auditLogs.entries.first();
                // If no audit log entry is found or it's too old (more than 5 seconds), it's likely a self-move
                if (!moveLog || (Date.now() - moveLog.createdTimestamp > 5000) || 
                    moveLog.executor.id === newState.member.id) {
                    return; // Skip logging for self-moves
                }
                
                const mover = moveLog.executor;
                const reason = moveLog.reason || 'No reason provided';
                
                const description = [
                    `### Member : <@${newState.member.id}> - \`${newState.member.id}\``,
                    `### From : <#${oldState.channel.id}> - \`${oldState.channel.id}\``,
                    `### To : <#${newState.channel.id}> - \`${newState.channel.id}\``,
                    `### Moved By : <@${mover.id}> - \`${mover.id}\``,
                    `### Reason : ${reason}`
                ].join('\n');
                
                const embed = new EmbedBuilder()
                    .setColor('#FF0000') // Red
                    .setAuthor({ 
                        name: `Member Moved - Voice Channel `, 
                        iconURL: newState.guild.iconURL() 
                    })
                    .setDescription(description)
                    .setThumbnail(newState.member.user.displayAvatarURL());
                
                moveLogChannel.send({ embeds: [embed] });
            }

            // Check for disconnect (user was in a voice channel and now isn't)
            if (oldState.channel && !newState.channel) {
                const disconnectLogChannel = newState.guild.channels.cache.get(CHANNEL_IDS.DISCONNECT_LOG_CHANNEL_ID);
                if (!disconnectLogChannel) return;
                
                // Check audit logs to see if this was a moderator action
                const auditLogs = await newState.guild.fetchAuditLogs({
                    type: AuditLogEvent.MemberDisconnect,
                    limit: 1
                });
                
                const disconnectLog = auditLogs.entries.first();
                
                // If no audit log entry is found or it's too old (more than 5 seconds), it's likely a self-disconnect
                if (!disconnectLog || (Date.now() - disconnectLog.createdTimestamp > 5000)) {
                    return; // Skip logging for self-disconnects
                }
                
                const moderator = disconnectLog.executor;
                const reason = disconnectLog.reason || 'No reason provided';
                
                const description = [
                    `### Member : <@${oldState.member.id}> - \`${oldState.member.id}\``,
                    `### Disconnected From : <#${oldState.channel.id}> - \`${oldState.channel.id}\``,
                    `### Disconnected By : <@${moderator.id}> - \`${moderator.id}\``,
                    `### Reason : ${reason}`
                ].join('\n');
                
                const embed = new EmbedBuilder()
                    .setColor('#FF0000') // Red
                    .setAuthor({ 
                        name: `Member Disconnected - Voice Channel`, 
                        iconURL: newState.guild.iconURL() 
                    })
                    .setDescription(description)
                    .setThumbnail(oldState.member.user.displayAvatarURL());
                
                disconnectLogChannel.send({ embeds: [embed] });
            }

            // Check for stream start
            if (!oldState.streaming && newState.streaming) {
                const streamLogChannel = newState.guild.channels.cache.get(CHANNEL_IDS.STREAM_LOG_CHANNEL_ID);
                if (!streamLogChannel) return;
                
                // Count members in channel
                const membersInChannel = newState.channel.members.size;
                
                const description = [
                    `### Member : <@${newState.member.id}> - \`${newState.member.id}\``,
                    `### Channel : <#${newState.channel.id}> - \`${newState.channel.id}\``,
                    `### Members in Channel : ${membersInChannel}`
                ].join('\n');
                
                const embed = new EmbedBuilder()
                    .setColor('#FF0000') // Red
                    .setAuthor({ 
                        name: `Stream Started `, 
                        iconURL: newState.guild.iconURL() 
                    })
                    .setDescription(description)
                    .setThumbnail(newState.member.user.displayAvatarURL());
                
                // Send the embed with @here mention in the content
                streamLogChannel.send({ 
                    content: '<@&1365488587847634984>',
                    embeds: [embed] 
                });
            }

            // Check for joining a voice channel (user wasn't in a voice channel and now is)
            if (!oldState.channel && newState.channel) {
                const joinLogChannel = newState.guild.channels.cache.get(CHANNEL_IDS.JOIN_LOG_CHANNEL_ID);
                if (!joinLogChannel) return;
                
                // Count members in channel
                const membersInChannel = newState.channel.members.size;
                
                const description = [
                    `### Member : <@${newState.member.id}> - \`${newState.member.id}\``,
                    `### Joined Channel : <#${newState.channel.id}> - \`${newState.channel.id}\``,
                    `### Members in Channel : ${membersInChannel}`
                ].join('\n');
                
                const embed = new EmbedBuilder()
                    .setColor('#FF0000') // Green for joining
                    .setAuthor({ 
                        name: `Voice Channel Joined`, 
                        iconURL: newState.guild.iconURL() 
                    })
                    .setDescription(description)
                    .setThumbnail(newState.member.user.displayAvatarURL());
                
                joinLogChannel.send({ embeds: [embed] });
                
                // Check for voice channel limit abuse
                if (newState.channel.userLimit > 0 && newState.channel.members.size > newState.channel.userLimit) {
                    const limitAbuseLogChannel = newState.guild.channels.cache.get(CHANNEL_IDS.VOICE_LIMIT_ABUSE_LOG_CHANNEL_ID);
                    if (!limitAbuseLogChannel) return;
                    
                    const description = [
                        `### User : <@${newState.member.id}> - \`${newState.member.user.tag}\` - \`${newState.member.id}\``,
                        `### Channel : <#${newState.channel.id}> - \`${newState.channel.name}\` - \`${newState.channel.id}\``,
                        `### Limit Channel : \`${newState.channel.userLimit}\``,
                        `### Current Members : \`${newState.channel.members.size}/${newState.channel.userLimit}\``,
                        `### Channel Created : <t:${Math.floor(newState.channel.createdTimestamp / 1000)}:F>`
                    ].join('\n');
                    
                    const embed = new EmbedBuilder()
                        .setColor('#FF0000') // Red for abuse/warning
                        .setAuthor({ 
                            name: `Voice Channel Limit Abuse`, 
                            iconURL: newState.guild.iconURL() 
                        })
                        .setDescription(description)
                        .setThumbnail(newState.member.user.displayAvatarURL());
                    
                    limitAbuseLogChannel.send({ 
                        content: '<@&1365488587847634984>', // Mentioning the same role used for stream notifications
                        embeds: [embed] 
                    });
                }
            }

            // Check for voice channel limit abuse when a channel changes from not exceeding limit to exceeding limit
            if (oldState.channel && oldState.channel.id === (newState.channel?.id) && 
                oldState.channel.userLimit > 0) {
                
                // Check if the channel just exceeded its limit (was at or below limit, now above)
                if (oldState.channel.members.size <= oldState.channel.userLimit && 
                    newState.channel?.members.size > newState.channel.userLimit) {
                    
                    const limitAbuseLogChannel = newState.guild.channels.cache.get(CHANNEL_IDS.VOICE_LIMIT_ABUSE_LOG_CHANNEL_ID);
                    if (!limitAbuseLogChannel) return;
                    
                    const description = [
                        `### User : <@${newState.member.id}> - \`${newState.member.user.tag}\` - \`${newState.member.id}\``,
                        `### Channel : <#${newState.channel.id}> - \`${newState.channel.name}\` - \`${newState.channel.id}\``,
                        `### Limit Channel : \`${newState.channel.userLimit}\``,
                        `### Current Members : \`${newState.channel.members.size}/${newState.channel.userLimit}\``,
                        `### Channel Created : <t:${Math.floor(newState.channel.createdTimestamp / 1000)}:F>`
                    ].join('\n');
                    
                    const embed = new EmbedBuilder()
                        .setColor('#FF0000') // Red for abuse/warning
                        .setAuthor({ 
                            name: `Voice Channel Limit Abuse`, 
                            iconURL: newState.guild.iconURL() 
                        })
                        .setDescription(description)
                        .setThumbnail(newState.member.user.displayAvatarURL());
                    
                    limitAbuseLogChannel.send({ 
                        content: '<@&1365488587847634984>', // Mentioning the same role used for stream notifications
                        embeds: [embed] 
                    });
                }
            }

            // Check for leaving a voice channel (not from disconnect by moderator)
            if (oldState.channel && !newState.channel) {
                const leaveLogChannel = newState.guild.channels.cache.get(CHANNEL_IDS.LEAVE_LOG_CHANNEL_ID);
                if (!leaveLogChannel) return;
                
                // Check if this was already handled by the disconnect code
                const auditLogs = await newState.guild.fetchAuditLogs({
                    type: AuditLogEvent.MemberDisconnect,
                    limit: 1
                });
                
                const disconnectLog = auditLogs.entries.first();
                
                // Only log if this was a self-disconnect (not a moderator action)
                if (!disconnectLog || (Date.now() - disconnectLog.createdTimestamp > 5000)) {
                    // Get channel from cache to access current members
                    const channel = oldState.guild.channels.cache.get(oldState.channel.id);
                    
                    // Set remaining members to 0 if channel no longer exists or safely get the count
                    const membersInChannel = channel ? channel.members.size : 0;
                    
                    const description = [
                        `### Member : <@${oldState.member.id}> - \`${oldState.member.id}\``,
                        `### Left Channel : <#${oldState.channel.id}> - \`${oldState.channel.id}\``,
                        `### Remaining Members : ${membersInChannel}`
                    ].join('\n');
                    
                    const embed = new EmbedBuilder()
                        .setColor('#FF0000') // Orange for leaving
                        .setAuthor({ 
                            name: `Voice Channel Left`, 
                            iconURL: newState.guild.iconURL() 
                        })
                        .setDescription(description)
                        .setThumbnail(oldState.member.user.displayAvatarURL());
                    
                    leaveLogChannel.send({ embeds: [embed] });
                }
            }
        } catch (error) {
            console.error('Error handling voice state update:', error);
        }
    }
}; 