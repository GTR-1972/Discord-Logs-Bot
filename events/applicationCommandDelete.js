const { EmbedBuilder, AuditLogEvent } = require('discord.js');
const { CHANNEL_IDS } = require('../logs.js');

module.exports = {
    name: 'applicationCommandDelete',
    execute: async (command) => {
        try {
            // Get the client from the command
            const client = command.client;
            if (!client || !client.guilds) return;
            
            // Command might not be associated with a guild
            const guild = command.guildId ? client.guilds.cache.get(command.guildId) : null;
            
            // If not guild-specific, it's a global command
            const isGlobal = !guild;
            
            // Skip if we can't find the guild for a guild command
            if (!isGlobal && !guild) return;
            
            // Check all guilds the bot is in for the bot log channel
            for (const [_, g] of client.guilds.cache) {
                const botLogChannel = g.channels.cache.get(CHANNEL_IDS.APPLICATION_COMMAND_LOG_CHANNEL_ID);
                if (!botLogChannel) continue;
                
                // Only log commands relevant to this guild (or global commands)
                if (!isGlobal && g.id !== command.guildId) continue;
                
                // Format options for display
                let optionsText = 'None';
                if (command.options && command.options.length > 0) {
                    optionsText = command.options.map(opt => {
                        const typeNames = {
                            1: 'SUB_COMMAND',
                            2: 'SUB_COMMAND_GROUP',
                            3: 'STRING',
                            4: 'INTEGER',
                            5: 'BOOLEAN',
                            6: 'USER',
                            7: 'CHANNEL',
                            8: 'ROLE',
                            9: 'MENTIONABLE',
                            10: 'NUMBER',
                            11: 'ATTACHMENT'
                        };
                        return `${opt.name} (${typeNames[opt.type] || opt.type})${opt.required ? ' [Required]' : ''}`;
                    }).join('\n');
                }
                
                const description = [
                    `### Command Name : \`${command.name}\``,
                    `### Command ID : \`${command.id}\``,
                    `### Description : \`${command.description || 'No description'}\``,
                    `### Application ID : \`${command.applicationId}\``,
                    `### Scope : \`${isGlobal ? 'Global' : 'Guild-specific'}\``,
                    isGlobal ? '' : `### Guild : \`${guild.name}\` - \`${guild.id}\``,
                    command.options?.length > 0 ? `### Options : \`\`\`\n${optionsText}\n\`\`\`` : '',
                    `### Deleted At : <t:${Math.floor(Date.now() / 1000)}:F>`
                ].filter(line => line !== '').join('\n');
                
                const embed = new EmbedBuilder()
                    .setColor('#FF0000')
                    .setAuthor({ 
                        name: `Slash Command Deleted`, 
                        iconURL: g.iconURL() 
                    })
                    .setDescription(description);
                
                // Send with @here mention
                await botLogChannel.send({ 
                    content: '@here',
                    embeds: [embed] 
                });
                
                // If global command, only need to send once
                if (isGlobal) break;
            }
        } catch (error) {
            console.error('Error handling application command deletion:', error);
        }
    }
}; 