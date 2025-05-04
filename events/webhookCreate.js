const { EmbedBuilder, AuditLogEvent } = require('discord.js');
const { CHANNEL_IDS } = require('../logs.js');

module.exports = {
    name: 'webhookCreate',
    execute: async (webhook) => {
        try {
            const logChannel = webhook.guild.channels.cache.get(CHANNEL_IDS.WEBHOOK_LOG_CHANNEL_ID);
            if (!logChannel) return;

            const auditLogs = await webhook.guild.fetchAuditLogs({
                type: AuditLogEvent.WebhookCreate,
                limit: 1
            });

            const createLog = auditLogs.entries.first();
            const creator = createLog?.executor || { tag: 'Unknown', id: 'Unknown' };
            const reason = createLog?.reason || 'No reason provided';

            const description = [
                `### Webhook : \`${webhook.name}\` - \`${webhook.id}\``,
                `### Channel : <#${webhook.channelId}> - \`${webhook.channelId}\``,
                `### Created By : ${creator.id !== 'Unknown' ? `<@${creator.id}> - \`${creator.id}\`` : 'Unknown'}`,
                `### Reason : ${reason}`
            ].join('\n');

            const embed = new EmbedBuilder()
                .setColor('#FF0000')
                .setAuthor({ 
                    name: `Webhook Created`, 
                    iconURL: webhook.guild.iconURL() 
                })
                .setDescription(description)
                .setThumbnail(webhook.avatarURL() || webhook.guild.iconURL());

            logChannel.send({ embeds: [embed] });
        } catch (error) {
            console.error('Error handling webhook creation:', error);
        }
    }
}; 