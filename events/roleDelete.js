const { EmbedBuilder, AuditLogEvent } = require('discord.js');
const { CHANNEL_IDS } = require('../logs.js');

module.exports = {
    name: 'roleDelete',
    execute: async (role) => {
        try {
            const logChannel = role.guild.channels.cache.get(CHANNEL_IDS.ROLE_DELETE_LOG_CHANNEL_ID);
            if (!logChannel) return;

            // Check audit logs to find who deleted the role
            const auditLogs = await role.guild.fetchAuditLogs({
                type: AuditLogEvent.RoleDelete,
                limit: 1
            });

            const deletionLog = auditLogs.entries.first();
            const deletor = deletionLog?.executor || { tag: 'Unknown', id: 'Unknown' };
            const reason = deletionLog?.reason || 'No reason provided';

            const description = [
                `### Role : \`${role.name}\` - \`${role.id}\``,
                `### Color : \`${role.hexColor}\``,
                `### Hoisted : \`${role.hoist}\``,
                `### Mentionable : \`${role.mentionable}\``,
                `### Position : \`${role.position}\``,
                `### Permissions : \`${role.permissions.bitfield}\``,
                `### Deleted By : ${deletor.id !== 'Unknown' ? `<@${deletor.id}> - \`${deletor.id}\`` : 'Unknown'}`,
                `### Reason : ${reason}`
            ].join('\n');

            const embed = new EmbedBuilder()
                .setColor('#FF0000')
                .setAuthor({ 
                    name: `Role Deleted`, 
                    iconURL: role.guild.iconURL() 
                })
                .setDescription(description);

            logChannel.send({ embeds: [embed] });
        } catch (error) {
            console.error('Error handling role deletion:', error);
        }
    }
}; 