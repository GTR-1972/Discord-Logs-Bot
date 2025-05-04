const { EmbedBuilder, AuditLogEvent } = require('discord.js');
const { CHANNEL_IDS } = require('../logs.js');

module.exports = {
    name: 'channelUpdate',
    execute: async (oldChannel, newChannel) => {
        try {
            if (!newChannel.guild) return; // Skip DM channels
            
            const logChannel = newChannel.guild.channels.cache.get(CHANNEL_IDS.CHANNEL_UPDATE_LOG_CHANNEL_ID);
            if (!logChannel) return;

            // Check audit logs to find who updated the channel
            const auditLogs = await newChannel.guild.fetchAuditLogs({
                type: AuditLogEvent.ChannelUpdate,
                limit: 1
            });

            const updateLog = auditLogs.entries.first();
            const updater = updateLog?.executor || { tag: 'Unknown', id: 'Unknown' };
            const reason = updateLog?.reason || 'No reason provided';

            // Find what changed
            const changes = [];
            
            if (oldChannel.name !== newChannel.name) {
                changes.push(`### Name : \`${oldChannel.name}\` → \`${newChannel.name}\``);
            }
            
            if (oldChannel.parent !== newChannel.parent) {
                changes.push(`### Category : \`${oldChannel.parent?.name || 'None'}\` → \`${newChannel.parent?.name || 'None'}\``);
            }
            
            if (oldChannel.type !== newChannel.type) {
                changes.push(`### Type : \`${oldChannel.type}\` → \`${newChannel.type}\``);
            }
            
            // For text channels
            if (oldChannel.topic !== newChannel.topic) {
                changes.push(`### Topic : \`${oldChannel.topic || 'None'}\` → \`${newChannel.topic || 'None'}\``);
            }
            
            if (oldChannel.nsfw !== newChannel.nsfw) {
                changes.push(`### NSFW : \`${oldChannel.nsfw}\` → \`${newChannel.nsfw}\``);
            }
            
            if (oldChannel.rateLimitPerUser !== newChannel.rateLimitPerUser) {
                changes.push(`### Slowmode : \`${oldChannel.rateLimitPerUser}s\` → \`${newChannel.rateLimitPerUser}s\``);
            }
            
            // For voice channels
            if (oldChannel.bitrate !== newChannel.bitrate) {
                changes.push(`### Bitrate : \`${oldChannel.bitrate/1000}kbps\` → \`${newChannel.bitrate/1000}kbps\``);
            }
            
            if (oldChannel.userLimit !== newChannel.userLimit) {
                changes.push(`### User Limit : \`${oldChannel.userLimit}\` → \`${newChannel.userLimit}\``);
            }

            if (changes.length === 0) return; // No changes to log

            const description = [
                `### Channel : ${newChannel} - \`${newChannel.name}\` - \`${newChannel.id}\``,
                ...changes,
                `### Updated By : ${updater.id !== 'Unknown' ? `<@${updater.id}> - \`${updater.id}\`` : 'Unknown'}`,
                `### Reason : ${reason}`
            ].join('\n');

            const embed = new EmbedBuilder()
                .setColor('#FF0000')
                .setAuthor({ 
                    name: `Channel Updated`, 
                    iconURL: newChannel.guild.iconURL() 
                })
                .setDescription(description);

            logChannel.send({ embeds: [embed] });
        } catch (error) {
            console.error('Error handling channel update:', error);
        }
    }
}; 