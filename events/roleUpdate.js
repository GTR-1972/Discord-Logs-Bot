const { EmbedBuilder, AuditLogEvent } = require('discord.js');
const { CHANNEL_IDS } = require('../logs.js');

module.exports = {
    name: 'roleUpdate',
    execute: async (oldRole, newRole) => {
        try {
            const logChannel = newRole.guild.channels.cache.get(CHANNEL_IDS.ROLE_UPDATE_LOG_CHANNEL_ID);
            if (!logChannel) return;

            // Check audit logs to find who updated the role
            const auditLogs = await newRole.guild.fetchAuditLogs({
                type: AuditLogEvent.RoleUpdate,
                limit: 1
            });

            const updateLog = auditLogs.entries.first();
            const updater = updateLog?.executor || { tag: 'Unknown', id: 'Unknown' };
            const reason = updateLog?.reason || 'No reason provided';

            // Find what changed
            const changes = [];
            
            if (oldRole.name !== newRole.name) {
                changes.push(`### Name : \`${oldRole.name}\` → \`${newRole.name}\``);
            }
            
            if (oldRole.color !== newRole.color) {
                changes.push(`### Color : \`${oldRole.hexColor}\` → \`${newRole.hexColor}\``);
            }
            
            if (oldRole.hoist !== newRole.hoist) {
                changes.push(`### Hoisted : \`${oldRole.hoist}\` → \`${newRole.hoist}\``);
            }
            
            if (oldRole.mentionable !== newRole.mentionable) {
                changes.push(`### Mentionable : \`${oldRole.mentionable}\` → \`${newRole.mentionable}\``);
            }
            
            if (oldRole.position !== newRole.position) {
                changes.push(`### Position : \`${oldRole.position}\` → \`${newRole.position}\``);
            }
            
            if (!oldRole.permissions.equals(newRole.permissions)) {
                const oldPerms = oldRole.permissions.toArray();
                const newPerms = newRole.permissions.toArray();
                
                const addedPerms = newPerms.filter(perm => !oldPerms.includes(perm));
                const removedPerms = oldPerms.filter(perm => !newPerms.includes(perm));
                
                if (addedPerms.length > 0) {
                    changes.push(`### Added Permissions : \`${addedPerms.join('`, `')}\``);
                }
                
                if (removedPerms.length > 0) {
                    changes.push(`### Removed Permissions : \`${removedPerms.join('`, `')}\``);
                }
            }

            if (changes.length === 0) return; // No changes to log

            const description = [
                `### Role : <@&${newRole.id}> - \`${newRole.name}\` - \`${newRole.id}\``,
                ...changes,
                `### Updated By : ${updater.id !== 'Unknown' ? `<@${updater.id}> - \`${updater.id}\`` : 'Unknown'}`,
                `### Reason : ${reason}`
            ].join('\n');

            const embed = new EmbedBuilder()
                .setColor(newRole.color || '#FF0000')
                .setAuthor({ 
                    name: `Role Updated`, 
                    iconURL: newRole.guild.iconURL() 
                })
                .setDescription(description);

            logChannel.send({ embeds: [embed] });
        } catch (error) {
            console.error('Error handling role update:', error);
        }
    }
}; 