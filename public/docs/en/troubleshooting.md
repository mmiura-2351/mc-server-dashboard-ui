# Troubleshooting Guide

This guide helps you diagnose and resolve common issues with the Minecraft Server Dashboard.

## Authentication Issues

### Cannot Login

**Symptoms**: Login fails with valid credentials

**Possible Causes**:

- Incorrect username/password
- Account not approved by admin
- Server connectivity issues
- Browser cache/cookies

**Solutions**:

1. Verify credentials are correct
2. Check with administrator for account approval status
3. Clear browser cache and cookies
4. Try incognito/private browsing mode
5. Check browser console for error messages

### Session Expires Quickly

**Symptoms**: Frequent logout/re-authentication required

**Possible Causes**:

- Short JWT token expiration
- System clock issues
- Browser timezone mismatch

**Solutions**:

1. Check system clock synchronization
2. Update browser to latest version
3. Contact administrator about token expiration settings

## Server Management Issues

### Server Won't Start

**Symptoms**: Start button doesn't work or server fails to start

**Possible Causes**:

- Insufficient memory allocation
- Port already in use
- Corrupted server files
- Java version incompatibility
- Missing dependencies

**Solutions**:

1. **Check Server Logs**:

   ```
   Navigate to Server → Logs → Latest
   Look for error messages during startup
   ```

2. **Verify Java Installation**:

   - Ensure correct Java version is installed
   - Check Java path configuration

3. **Check Port Availability**:

   - Verify no other service uses the port
   - Try different port number

4. **Memory Issues**:

   - Increase allocated RAM
   - Check system available memory
   - Close other applications

5. **File Corruption**:
   - Restore from backup
   - Regenerate world files if necessary

### Server Stops Unexpectedly

**Symptoms**: Running server suddenly stops

**Possible Causes**:

- Out of memory
- Fatal error in plugin/mod
- System resource limits
- Power management issues

**Solutions**:

1. **Review Crash Logs**:

   ```
   Check logs/ directory for crash reports
   Look for OutOfMemoryError or similar
   ```

2. **Memory Management**:

   - Increase server memory allocation
   - Monitor memory usage patterns
   - Check for memory leaks

3. **Plugin/Mod Issues**:
   - Disable recently added plugins/mods
   - Update to latest versions
   - Check compatibility

### Poor Server Performance

**Symptoms**: Low TPS, lag, slow response

**Possible Causes**:

- High server load
- Inefficient plugins/mods
- Large world files
- Network issues
- Hardware limitations

**Solutions**:

1. **Performance Analysis**:

   - Monitor TPS (should be 20)
   - Check memory usage
   - Review CPU utilization

2. **Optimization Steps**:

   ```
   # Reduce view distance
   view-distance=6

   # Limit simulation distance
   simulation-distance=6

   # Optimize garbage collection
   -XX:+UseG1GC -XX:+ParallelRefProcEnabled
   ```

3. **World Optimization**:
   - Pregenerate world chunks
   - Remove unnecessary structures
   - Clean up entities

## File Management Issues

### Upload Fails

**Symptoms**: File upload doesn't complete or errors out

**Possible Causes**:

- File size too large
- Network timeout
- Insufficient disk space
- Permission issues
- Browser limitations

**Solutions**:

1. **Check File Size**:

   - Verify file is under size limit
   - Use ZIP compression for large files

2. **Network Issues**:

   - Check internet connection stability
   - Try uploading during off-peak hours
   - Split large uploads into smaller files

3. **Storage Space**:
   - Check available disk space
   - Clean up old files
   - Move backups to external storage

### File Download Issues

**Symptoms**: Downloads fail or are corrupted

**Possible Causes**:

- Network interruption
- Server timeout
- File permissions
- Browser download limits

**Solutions**:

1. **Retry Download**:

   - Use download manager
   - Try different browser
   - Check internet connection

2. **Alternative Methods**:
   - Download smaller file sections
   - Use ZIP compression
   - Try during different times

### Cannot Edit Files

**Symptoms**: File editor doesn't load or save fails

**Possible Causes**:

- File permissions
- File in use by server
- Large file size
- Browser limitations

**Solutions**:

1. **Permission Check**:

   - Verify user has edit permissions
   - Check file ownership

2. **Server Status**:

   - Stop server before editing critical files
   - Wait for file locks to release

3. **File Size**:
   - Use external editor for large files
   - Split configuration into smaller files

## Network and Connectivity Issues

### Cannot Connect to Server

**Symptoms**: Players cannot join Minecraft server

**Possible Causes**:

- Firewall blocking connections
- Port forwarding issues
- IP address changes
- Server offline

**Solutions**:

1. **Verify Server Status**:

   - Check dashboard shows server as "Running"
   - Test local connection first

2. **Network Configuration**:

   ```bash
   # Check port is listening
   netstat -an | grep :25565

   # Test port accessibility
   telnet server-ip 25565
   ```

3. **Firewall Settings**:
   - Open port 25565 in firewall
   - Configure router port forwarding
   - Check cloud provider security groups

### Dashboard Inaccessible

**Symptoms**: Cannot access web dashboard

**Possible Causes**:

- Backend API server down
- Network connectivity
- Browser issues
- SSL certificate problems

**Solutions**:

1. **Check Backend Status**:

   - Verify API server is running on port 8000
   - Check backend logs for errors

2. **Network Troubleshooting**:

   ```bash
   # Test API connectivity
   curl http://localhost:8000/docs

   # Check port availability
   netstat -an | grep :8000
   ```

3. **Browser Issues**:
   - Clear cache and cookies
   - Disable browser extensions
   - Try different browser

## Group Management Issues

### Cannot Add Players to Groups

**Symptoms**: Adding players to groups fails

**Possible Causes**:

- Invalid player names
- Player not registered
- Permission issues
- Server offline

**Solutions**:

1. **Verify Player Names**:

   - Check exact spelling and capitalization
   - Ensure player has joined server before

2. **Server Requirements**:

   - Server must be online for some operations
   - Restart server after group changes

3. **Permission Verification**:
   - Check user has group management permissions
   - Verify group configuration

### Group Changes Not Applied

**Symptoms**: Group modifications don't take effect

**Possible Causes**:

- Server not restarted
- Configuration cache
- Permission conflicts

**Solutions**:

1. **Restart Server**:

   - Stop and start server completely
   - Wait for full initialization

2. **Clear Cache**:
   - Reload permissions in server
   - Use `/reload` command if available

## Backup and Restore Issues

### Backup Creation Fails

**Symptoms**: Backup process stops or errors

**Possible Causes**:

- Insufficient disk space
- File locks from running server
- Permission issues
- Corrupted files

**Solutions**:

1. **Storage Check**:

   - Verify adequate free space
   - Clean up old backups

2. **Server State**:

   - Stop server before backup
   - Wait for all processes to end

3. **File Access**:
   - Check file permissions
   - Verify no files are locked

### Restore Fails

**Symptoms**: Backup restore doesn't complete

**Possible Causes**:

- Corrupted backup file
- Insufficient space
- Running server
- Permission issues

**Solutions**:

1. **Backup Verification**:

   - Test backup file integrity
   - Try different backup

2. **Preparation**:
   - Stop server completely
   - Clear destination directory
   - Verify permissions

## Browser and Interface Issues

### Dashboard Loads Slowly

**Symptoms**: Web interface is sluggish

**Possible Causes**:

- Network latency
- Large log files
- Browser performance
- Server overload

**Solutions**:

1. **Browser Optimization**:

   - Close unnecessary tabs
   - Clear browser cache
   - Update browser

2. **Network Check**:
   - Test connection speed
   - Try wired connection
   - Check for network congestion

### Real-time Features Not Working

**Symptoms**: Logs don't update, status doesn't refresh

**Possible Causes**:

- WebSocket connection issues
- Firewall blocking WebSockets
- Browser compatibility

**Solutions**:

1. **WebSocket Testing**:

   - Check browser console for WebSocket errors
   - Verify WebSocket support

2. **Network Configuration**:
   - Check firewall allows WebSocket connections
   - Verify proxy settings

## Getting Additional Help

### Log Analysis

Always check these logs when troubleshooting:

1. **Server Logs**: `/logs/latest.log`
2. **Dashboard Logs**: Browser console
3. **System Logs**: Server system logs
4. **Backup Logs**: Backup operation logs

### Common Log Patterns

```
# Out of memory
java.lang.OutOfMemoryError: Java heap space

# Port binding error
java.net.BindException: Address already in use

# Permission error
java.io.IOException: Permission denied

# Connection timeout
java.net.SocketTimeoutException: Read timed out
```

### Reporting Issues

When reporting problems, include:

1. **Error Messages**: Exact error text
2. **Server Configuration**: Type, version, settings
3. **System Information**: OS, Java version, memory
4. **Steps to Reproduce**: Detailed reproduction steps
5. **Log Files**: Relevant log excerpts

### Emergency Recovery

If the dashboard becomes unusable:

1. **Backend Access**: SSH to server directly
2. **Manual Server Control**: Use command line
3. **File Recovery**: Access files directly
4. **Backup Restoration**: Manual backup restore

---

_Last updated: June 20, 2025_
