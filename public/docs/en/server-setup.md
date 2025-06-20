# Server Setup Guide

This guide covers the complete process of setting up and configuring a Minecraft server through the dashboard.

## Prerequisites

Before setting up a server, ensure you have:

- Administrative access to the dashboard
- Sufficient system resources (RAM, CPU, storage)
- Network access for Minecraft clients
- Required Java version installed on the server

## Server Types

### Vanilla Server

The official Minecraft server:

- **Pros**: Official support, stable, simple
- **Cons**: Limited features, no plugins
- **Recommended for**: Basic survival servers, small groups

### Paper Server

Performance-optimized Minecraft server:

- **Pros**: Better performance, plugin support, bug fixes
- **Cons**: Slightly different behavior from vanilla
- **Recommended for**: Medium to large servers, plugin-based servers

### Forge Server

Modded Minecraft server:

- **Pros**: Full mod support, extensive customization
- **Cons**: More complex, higher resource usage
- **Recommended for**: Modded gameplay, custom experiences

## Creating Your First Server

### Step 1: Basic Configuration

1. Navigate to **Servers** → **Create New Server**
2. Fill in server details:
   - **Server Name**: Choose a descriptive name
   - **Server Type**: Select from Vanilla, Paper, or Forge
   - **Port**: Default 25565 (change if needed)
   - **Memory**: Allocate RAM (minimum 2GB recommended)

### Step 2: World Configuration

Configure your world settings:

- **World Name**: Custom world name
- **Seed**: Optional world seed
- **Game Mode**: Survival, Creative, Adventure, Spectator
- **Difficulty**: Peaceful, Easy, Normal, Hard
- **World Type**: Default, Flat, Large Biomes, etc.

### Step 3: Server Properties

Key server settings to configure:

```properties
# Basic Settings
server-port=25565
max-players=20
difficulty=normal
gamemode=survival

# World Settings
level-name=world
level-seed=
generate-structures=true
spawn-protection=16

# Network Settings
online-mode=true
white-list=false
enable-command-block=false

# Performance Settings
view-distance=10
simulation-distance=10
```

## Advanced Configuration

### Performance Tuning

Optimize your server for better performance:

1. **Memory Allocation**:

   - Start with 2GB minimum
   - Add 1GB per 10 players
   - Monitor usage and adjust

2. **View Distance**:

   - Default: 10 chunks
   - Reduce for better performance
   - Balance between performance and gameplay

3. **Simulation Distance**:
   - Controls redstone/mob behavior range
   - Lower values improve performance
   - Affects gameplay mechanics

### Security Settings

Secure your server:

1. **Whitelist**: Enable for private servers
2. **Online Mode**: Verify player accounts
3. **Spawn Protection**: Protect spawn area
4. **Command Blocks**: Disable for security

### Plugin Configuration (Paper/Forge)

For Paper servers:

1. Navigate to **Files** → **plugins**
2. Upload plugin JAR files
3. Restart server to load plugins
4. Configure plugin settings in respective folders

For Forge servers:

1. Navigate to **Files** → **mods**
2. Upload mod JAR files
3. Ensure client-server mod compatibility
4. Configure mod settings as needed

## Network Configuration

### Port Configuration

Default Minecraft port: `25565`

If changing ports:

1. Update `server-port` in server.properties
2. Configure firewall rules
3. Update port forwarding (if applicable)
4. Inform players of new port

### Firewall Setup

Ensure these ports are open:

- **25565**: Minecraft server (or your custom port)
- **8000**: Dashboard API (if external access needed)

## File Management

### Important Directories

```
server/
├── world/              # Main world files
├── world_nether/       # Nether dimension
├── world_the_end/      # End dimension
├── plugins/            # Paper plugins
├── mods/              # Forge mods
├── logs/              # Server logs
├── backups/           # Backup files
└── server.properties  # Main configuration
```

### Configuration Files

Key files to understand:

1. **server.properties**: Main server configuration
2. **ops.json**: Server operators list
3. **whitelist.json**: Whitelisted players
4. **banned-players.json**: Banned players list
5. **banned-ips.json**: Banned IP addresses

## Backup Strategy

### Automated Backups

Set up regular backups:

1. Navigate to **Server** → **Backups**
2. Configure backup schedule
3. Choose backup scope:
   - **World Only**: Faster, smaller size
   - **Full Server**: Complete server backup

### Manual Backups

Create backups before:

- Major configuration changes
- Plugin/mod updates
- World modifications
- Server version updates

### Restore Process

To restore a backup:

1. Stop the server
2. Select backup from list
3. Click "Restore"
4. Confirm restoration
5. Start server

## Monitoring and Maintenance

### Server Logs

Monitor server health through logs:

- **Latest.log**: Current session log
- **Error logs**: Critical issues
- **Performance logs**: TPS and memory usage

### Performance Metrics

Watch these indicators:

- **TPS (Ticks Per Second)**: Should be 20
- **Memory Usage**: Monitor for leaks
- **Player Count**: Track server load
- **Chunk Loading**: Optimize world generation

### Regular Maintenance

Perform these tasks regularly:

1. **Weekly**:

   - Review server logs
   - Check performance metrics
   - Clean up old files

2. **Monthly**:

   - Update server software
   - Review and update plugins/mods
   - Backup important data

3. **As Needed**:
   - Restart server for performance
   - Update configurations
   - Handle player issues

## Common Configuration Examples

### Survival Server

```properties
gamemode=survival
difficulty=normal
spawn-monsters=true
spawn-animals=true
pvp=true
enable-command-block=false
```

### Creative Server

```properties
gamemode=creative
difficulty=peaceful
spawn-monsters=false
pvp=false
enable-command-block=true
```

### Hardcore Server

```properties
gamemode=survival
difficulty=hard
hardcore=true
max-players=10
white-list=true
```

## Troubleshooting Setup Issues

### Server Won't Start

1. Check Java version compatibility
2. Verify memory allocation
3. Review server logs for errors
4. Check file permissions

### Connection Issues

1. Verify port configuration
2. Check firewall settings
3. Test local vs. external access
4. Validate server.properties settings

### Performance Problems

1. Reduce view distance
2. Limit player count
3. Optimize world generation
4. Monitor plugin/mod performance

## Next Steps

After setup:

1. Test server connectivity
2. Configure player groups
3. Set up monitoring
4. Create backup schedule
5. Document server settings

---

_Last updated: June 20, 2025_
