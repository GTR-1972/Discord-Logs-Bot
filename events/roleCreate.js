const { EmbedBuilder, AuditLogEvent } = require('discord.js');
const { CHANNEL_IDS } = require('../logs.js');

module.exports = {
    name: 'roleCreate',
    execute: async (role) => {
        try {
            const logChannel = role.guild.channels.cache.get(CHANNEL_IDS.ROLE_CREATE_LOG_CHANNEL_ID);
            if (!logChannel) return;

            // Check audit logs to find who created the role
            const auditLogs = await role.guild.fetchAuditLogs({
                type: AuditLogEvent.RoleCreate,
                limit: 1
            });

            const creationLog = auditLogs.entries.first();
            const creator = creationLog?.executor || { tag: 'Unknown', id: 'Unknown' };
            const reason = creationLog?.reason || 'No reason provided';

            const description = [
                `### Role : <@&${role.id}> - \`${role.name}\` - \`${role.id}\``,
                `### Color : \`${role.hexColor}\``,
                `### Hoisted : \`${role.hoist}\``,
                `### Mentionable : \`${role.mentionable}\``,
                `### Position : \`${role.position}\``,
                `### Permissions : \`${role.permissions.bitfield}\``,
                `### Created By : ${creator.id !== 'Unknown' ? `<@${creator.id}> - \`${creator.id}\`` : 'Unknown'}`,
                `### Reason : ${reason}`
            ].join('\n');

            const embed = new EmbedBuilder()
                .setColor(role.color || '#FF0000')
                .setAuthor({ 
                    name: `Role Created`, 
                    iconURL: role.guild.iconURL() 
                })
                .setDescription(description);

            logChannel.send({ embeds: [embed] });
        } catch (error) {
            console.error('Error handling role creation:', error);
        }
    }
}; 