const { EmbedBuilder, AuditLogEvent } = require('discord.js');
const { CHANNEL_IDS } = require('../logs.js');

module.exports = {
    name: 'channelDelete',
    execute: async (channel) => {
        try {
            if (!channel.guild) return; // Skip DM channels
            
            const logChannel = channel.guild.channels.cache.get(CHANNEL_IDS.CHANNEL_DELETE_LOG_CHANNEL_ID);
            if (!logChannel) return;

            // Check audit logs to find who deleted the channel
            const auditLogs = await channel.guild.fetchAuditLogs({
                type: AuditLogEvent.ChannelDelete,
                limit: 1
            });

            const deletionLog = auditLogs.entries.first();
            const deletor = deletionLog?.executor || { tag: 'Unknown', id: 'Unknown' };
            const reason = deletionLog?.reason || 'No reason provided';

            const description = [
                `### Channel : \`${channel.name}\` - \`${channel.id}\``,
                `### Type : \`${channel.type}\``,
                `### Category : ${channel.parent ? channel.parent.name : 'None'}`,
                `### Deleted By : ${deletor.id !== 'Unknown' ? `<@${deletor.id}> - \`${deletor.id}\`` : 'Unknown'}`,
                `### Reason : ${reason}`
            ].join('\n');

            const embed = new EmbedBuilder()
                .setColor('#FF0000')
                .setAuthor({ 
                    name: `Channel Deleted`, 
                    iconURL: channel.guild.iconURL() 
                })
                .setDescription(description);

            logChannel.send({ embeds: [embed] });
        } catch (error) {
            console.error('Error handling channel deletion:', error);
        }
    }
}; 