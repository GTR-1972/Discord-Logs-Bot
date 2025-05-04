const { EmbedBuilder, AuditLogEvent } = require('discord.js');
const { CHANNEL_IDS } = require('../logs.js');

module.exports = {
    name: 'applicationCommandUpdate',
    execute: async (oldCommand, newCommand) => {
        try {
            // Get the client from the command
            const client = newCommand.client;
            if (!client || !client.guilds) return;
            
            // Command might not be associated with a guild
            const guild = newCommand.guildId ? client.guilds.cache.get(newCommand.guildId) : null;
            
            // If not guild-specific, it's a global command
            const isGlobal = !guild;
            
            // Skip if we can't find the guild for a guild command
            if (!isGlobal && !guild) return;
            
            // Check all guilds the bot is in for the bot log channel
            for (const [_, g] of client.guilds.cache) {
                const botLogChannel = g.channels.cache.get(CHANNEL_IDS.APPLICATION_COMMAND_LOG_CHANNEL_ID);
                if (!botLogChannel) continue;
                
                // Only log commands relevant to this guild (or global commands)
                if (!isGlobal && g.id !== newCommand.guildId) continue;
                
                // Find what changed
                const changes = [];
                
                if (oldCommand.name !== newCommand.name) {
                    changes.push(`### Name : \`${oldCommand.name}\` → \`${newCommand.name}\``);
                }
                
                if (oldCommand.description !== newCommand.description) {
                    changes.push(`### Description : \`${oldCommand.description || 'None'}\` → \`${newCommand.description || 'None'}\``);
                }
                
                // Compare default permissions if they exist
                const oldPerms = oldCommand.defaultMemberPermissions?.toString() || 'Everyone';
                const newPerms = newCommand.defaultMemberPermissions?.toString() || 'Everyone';
                if (oldPerms !== newPerms) {
                    changes.push(`### Default Permissions : \`${oldPerms}\` → \`${newPerms}\``);
                }
                
                // Compare options (simplified approach)
                const oldOptionsCount = oldCommand.options?.length || 0;
                const newOptionsCount = newCommand.options?.length || 0;
                
                if (oldOptionsCount !== newOptionsCount) {
                    changes.push(`### Options Count : \`${oldOptionsCount}\` → \`${newOptionsCount}\``);
                } else {
                    // If same count, try to detect changes in options
                    let optionsChanged = false;
                    if (oldOptionsCount > 0) {
                        for (let i = 0; i < oldOptionsCount; i++) {
                            const oldOpt = oldCommand.options[i];
                            const newOpt = newCommand.options[i];
                            
                            if (!oldOpt || !newOpt || 
                                oldOpt.name !== newOpt.name || 
                                oldOpt.type !== newOpt.type || 
                                oldOpt.required !== newOpt.required || 
                                oldOpt.description !== newOpt.description) {
                                optionsChanged = true;
                                break;
                            }
                        }
                    }
                    
                    if (optionsChanged) {
                        changes.push(`### Options : Modified`);
                    }
                }
                
                // If no changes detected, skip
                if (changes.length === 0) continue;
                
                // Format new options for display
                let optionsText = 'None';
                if (newCommand.options && newCommand.options.length > 0) {
                    optionsText = newCommand.options.map(opt => {
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
                    `### Command : \`${newCommand.name}\` - \`${newCommand.id}\``,
                    `### Application ID : \`${newCommand.applicationId}\``,
                    `### Scope : \`${isGlobal ? 'Global' : 'Guild-specific'}\``,
                    isGlobal ? '' : `### Guild : \`${guild.name}\` - \`${guild.id}\``,
                    ...changes,
                    newCommand.options?.length > 0 ? `### Current Options : \`\`\`\n${optionsText}\n\`\`\`` : '',
                    `### Updated At : <t:${Math.floor(Date.now() / 1000)}:F>`
                ].filter(line => line !== '').join('\n');
                
                const embed = new EmbedBuilder()
                    .setColor('#FF0000')
                    .setAuthor({ 
                        name: `Slash Command Updated`, 
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
            console.error('Error handling application command update:', error);
        }
    }
}; 