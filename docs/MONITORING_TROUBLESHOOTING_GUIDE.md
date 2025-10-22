# 🔍 AuditoriumX Monitoring & Troubleshooting Guide

## Overview
This guide provides comprehensive monitoring strategies and troubleshooting procedures for AuditoriumX in production environments.

## Monitoring Strategy

### 1. Health Monitoring

#### Automated Health Checks
The application provides multiple health check endpoints for monitoring:

**Basic Health Check**
```bash
curl http://localhost:3001/api/health
```

**Detailed Metrics**
```bash
curl http://localhost:3001/api/metrics
```

**Production Readiness**
```bash
curl http://localhost:3001/api/production-readiness
```

#### Health Check Automation
Create automated scripts to monitor application health:

```bash
#!/bin/bash
# health_monitor.sh

HEALTH_URL="http://localhost:3001/api/health"
LOG_FILE="/var/log/auditoriumx/health.log"

while true; do
    TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
    RESPONSE=$(curl -s -w "\n%{http_code}" "$HEALTH_URL")
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | head -n -1)
    
    if [ "$HTTP_CODE" = "200" ]; then
        STATUS=$(echo "$BODY" | jq -r '.status')
        if [ "$STATUS" = "healthy" ]; then
            echo "[$TIMESTAMP] Application healthy" >> "$LOG_FILE"
        else
            echo "[$TIMESTAMP] Application unhealthy: $BODY" >> "$LOG_FILE"
            # Send alert
        fi
    else
        echo "[$TIMESTAMP] Health check failed: HTTP $HTTP_CODE" >> "$LOG_FILE"
        # Send alert
    fi
    
    sleep 60  # Check every minute
done
```

### 2. Log Monitoring

#### Log File Locations
- **Application Logs**: `backend/logs/app-YYYY-MM-DD.log`
- **Error Logs**: Included in application logs with level "error"
- **Access Logs**: Included in application logs with context "HTTP_REQUEST"

#### Log Structure
All logs are in JSON format:
```json
{
  "timestamp": "2024-01-27T10:30:00.000Z",
  "level": "info",
  "message": "Server started successfully",
  "context": "SERVER_STARTUP",
  "metadata": {
    "port": 3001,
    "environment": "production"
  },
  "requestId": "req_123456"
}
```

#### Log Monitoring Commands
```bash
# Monitor real-time logs
tail -f backend/logs/app-$(date +%Y-%m-%d).log

# Filter error logs
grep '"level":"error"' backend/logs/*.log

# Monitor specific context
grep '"context":"HTTP_REQUEST"' backend/logs/*.log

# Check performance logs
grep '"context":"PERFORMANCE"' backend/logs/*.log

# Monitor security events
grep '"context":"SECURITY"' backend/logs/*.log
```

### 3. Performance Monitoring

#### Key Performance Indicators (KPIs)
- **Memory Usage**: Should stay below 80%
- **Response Time**: Average should be under 200ms
- **Error Rate**: Should be below 5%
- **Database Query Time**: Average should be under 100ms

#### Performance Monitoring Script
```bash
#!/bin/bash
# performance_monitor.sh

METRICS_URL="http://localhost:3001/api/metrics"
ALERT_THRESHOLD_MEMORY=80
ALERT_THRESHOLD_ERROR_RATE=5
ALERT_THRESHOLD_RESPONSE_TIME=200

check_performance() {
    RESPONSE=$(curl -s "$METRICS_URL")
    
    # Extract metrics
    MEMORY_PERCENT=$(echo "$RESPONSE" | jq -r '.data.system.memory.percentage')
    ERROR_RATE=$(echo "$RESPONSE" | jq -r '.data.requests.errorRate')
    AVG_RESPONSE_TIME=$(echo "$RESPONSE" | jq -r '.data.requests.averageResponseTime')
    
    # Check thresholds
    if (( $(echo "$MEMORY_PERCENT > $ALERT_THRESHOLD_MEMORY" | bc -l) )); then
        echo "High memory usage: ${MEMORY_PERCENT}%"
        # Send alert
    fi
    
    if (( $(echo "$ERROR_RATE > $ALERT_THRESHOLD_ERROR_RATE" | bc -l) )); then
        echo "High error rate: ${ERROR_RATE}%"
        # Send alert
    fi
    
    if (( $(echo "$AVG_RESPONSE_TIME > $ALERT_THRESHOLD_RESPONSE_TIME" | bc -l) )); then
        echo "Slow response time: ${AVG_RESPONSE_TIME}ms"
        # Send alert
    fi
}

# Run every 5 minutes
while true; do
    check_performance
    sleep 300
done
```

### 4. Database Monitoring

#### Database Health Checks
```bash
# Check database file
ls -la backend/dist/production.db

# Check database connections
grep '"context":"DATABASE"' backend/logs/*.log | tail -20

# Monitor slow queries
grep '"averageQueryTime"' backend/logs/*.log | tail -10
```

#### Database Performance Metrics
Monitor these key database metrics:
- **Connection Count**: Number of active connections
- **Query Count**: Total queries executed
- **Average Query Time**: Performance indicator
- **Failed Queries**: Error indicator

## Troubleshooting Guide

### 1. Application Won't Start

#### Symptoms
- Server doesn't respond to requests
- Process exits immediately
- Port binding errors

#### Diagnosis Steps
```bash
# Check if process is running
ps aux | grep node

# Check port availability
netstat -an | grep :3001

# Check logs for startup errors
grep '"context":"SERVER_STARTUP"' backend/logs/*.log

# Verify environment variables
node -e "console.log(process.env.NODE_ENV, process.env.PORT)"
```

#### Common Solutions
1. **Port Already in Use**
   ```bash
   # Find process using port
   netstat -ano | findstr :3001
   # Kill process or use different port
   ```

2. **Missing Environment Variables**
   ```bash
   # Check .env file exists
   ls -la backend/.env
   # Verify required variables are set
   ```

3. **Database File Issues**
   ```bash
   # Check database file permissions
   ls -la backend/dist/production.db
   # Regenerate database if needed
   cd backend && npm run prisma:generate
   ```

### 2. Database Connection Issues

#### Symptoms
- "Database connection failed" errors
- Timeout errors on database operations
- Data not persisting

#### Diagnosis Steps
```bash
# Check database file existence
ls -la backend/dist/production.db

# Test database connection
cd backend && npx prisma db push

# Check database logs
grep '"context":"DATABASE"' backend/logs/*.log | tail -10
```

#### Solutions
1. **Database File Missing**
   ```bash
   cd backend
   npx prisma db push
   npx prisma generate
   ```

2. **Permission Issues**
   ```bash
   # Fix file permissions
   chmod 664 backend/dist/production.db
   ```

3. **Corrupted Database**
   ```bash
   # Backup current database
   cp backend/dist/production.db backend/dist/production.db.backup
   # Restore from backup or reinitialize
   ```

### 3. High Memory Usage

#### Symptoms
- Memory usage above 80%
- Application becoming slow
- Out of memory errors

#### Diagnosis Steps
```bash
# Check current memory usage
curl -s http://localhost:3001/api/metrics | jq '.data.system.memory'

# Monitor memory over time
while true; do
    curl -s http://localhost:3001/api/metrics | jq -r '.data.system.memory.percentage'
    sleep 30
done
```

#### Solutions
1. **Restart Application**
   ```bash
   # Graceful restart
   pkill -SIGTERM node
   npm start
   ```

2. **Check for Memory Leaks**
   ```bash
   # Monitor memory trends
   grep '"memory"' backend/logs/*.log | tail -50
   ```

3. **Optimize Database Queries**
   ```bash
   # Check slow queries
   grep '"averageQueryTime"' backend/logs/*.log
   ```

### 4. High Error Rate

#### Symptoms
- Error rate above 5%
- Multiple 500 status codes
- User complaints about functionality

#### Diagnosis Steps
```bash
# Check recent errors
grep '"level":"error"' backend/logs/*.log | tail -20

# Check error rate
curl -s http://localhost:3001/api/metrics | jq '.data.requests.errorRate'

# Analyze error patterns
grep '"level":"error"' backend/logs/*.log | jq '.message' | sort | uniq -c
```

#### Solutions
1. **Identify Error Source**
   ```bash
   # Group errors by type
   grep '"level":"error"' backend/logs/*.log | jq '.metadata.stack' | head -10
   ```

2. **Check Input Validation**
   ```bash
   # Look for validation errors
   grep '"VALIDATION_ERROR"' backend/logs/*.log
   ```

3. **Database Issues**
   ```bash
   # Check database errors
   grep '"DATABASE_ERROR"' backend/logs/*.log
   ```

### 5. Printer Issues

#### Symptoms
- Print jobs failing
- Printer not responding
- Incorrect ticket format

#### Diagnosis Steps
```bash
# Check printer logs
grep '"context":"PRINT"' backend/logs/*.log

# Test printer connectivity
# (Windows) wmic printer list brief

# Check printer configuration
grep '"printerType"' backend/logs/*.log
```

#### Solutions
1. **Printer Driver Issues**
   - Reinstall printer drivers
   - Check printer compatibility

2. **Connection Issues**
   - Verify USB/network connection
   - Test with different cable

3. **Configuration Issues**
   ```bash
   # Check printer settings in logs
   grep '"PrinterConfig"' backend/logs/*.log
   ```

### 6. Performance Degradation

#### Symptoms
- Slow response times
- Timeouts
- High CPU usage

#### Diagnosis Steps
```bash
# Check response time trends
curl -s http://localhost:3001/api/metrics | jq '.data.requests.averageResponseTime'

# Monitor CPU usage
top -p $(pgrep node)

# Check database performance
grep '"queryTime"' backend/logs/*.log | tail -20
```

#### Solutions
1. **Database Optimization**
   ```bash
   # Analyze slow queries
   grep '"averageQueryTime"' backend/logs/*.log
   ```

2. **Memory Optimization**
   ```bash
   # Check memory usage patterns
   grep '"memory"' backend/logs/*.log
   ```

3. **Connection Pool Issues**
   ```bash
   # Check connection count
   curl -s http://localhost:3001/api/metrics | jq '.data.database.connectionCount'
   ```

## Alerting System

### Alert Conditions
Set up alerts for these critical conditions:

1. **Application Down**: Health check fails
2. **High Memory**: Memory usage > 80%
3. **High Error Rate**: Error rate > 5%
4. **Slow Response**: Average response time > 200ms
5. **Database Issues**: Database health check fails

### Alert Script Example
```bash
#!/bin/bash
# alert_system.sh

send_alert() {
    local MESSAGE="$1"
    local SEVERITY="$2"
    
    # Log alert
    echo "[$(date)] [$SEVERITY] $MESSAGE" >> /var/log/auditoriumx/alerts.log
    
    # Send email (configure as needed)
    # echo "$MESSAGE" | mail -s "AuditoriumX Alert [$SEVERITY]" admin@example.com
    
    # Send to monitoring system (configure as needed)
    # curl -X POST "your-monitoring-webhook" -d "$MESSAGE"
}

check_application_health() {
    local HEALTH_RESPONSE=$(curl -s http://localhost:3001/api/health)
    local STATUS=$(echo "$HEALTH_RESPONSE" | jq -r '.status')
    
    if [ "$STATUS" != "healthy" ]; then
        send_alert "Application unhealthy: $HEALTH_RESPONSE" "CRITICAL"
    fi
}

# Run checks
check_application_health
```

## Maintenance Procedures

### Daily Maintenance
```bash
#!/bin/bash
# daily_maintenance.sh

# Check log file sizes
du -h backend/logs/

# Check disk space
df -h

# Verify application health
curl -s http://localhost:3001/api/health | jq '.status'

# Check error count
grep '"level":"error"' backend/logs/app-$(date +%Y-%m-%d).log | wc -l

# Generate daily report
echo "Daily AuditoriumX Report - $(date)"
echo "Application Status: $(curl -s http://localhost:3001/api/health | jq -r '.status')"
echo "Total Requests: $(curl -s http://localhost:3001/api/metrics | jq -r '.data.requests.total')"
echo "Error Rate: $(curl -s http://localhost:3001/api/metrics | jq -r '.data.requests.errorRate')%"
echo "Memory Usage: $(curl -s http://localhost:3001/api/metrics | jq -r '.data.system.memory.percentage')%"
```

### Weekly Maintenance
```bash
#!/bin/bash
# weekly_maintenance.sh

# Archive old logs
find backend/logs/ -name "*.log" -mtime +7 -exec gzip {} \;

# Database maintenance
cd backend && npx prisma db push

# Performance analysis
echo "Weekly Performance Report"
grep '"context":"PERFORMANCE"' backend/logs/*.log | tail -100

# Security check
grep '"context":"SECURITY"' backend/logs/*.log | tail -50
```

## Emergency Procedures

### Complete Application Failure
1. **Check process status**
2. **Review error logs**
3. **Restart application**
4. **Verify functionality**
5. **Monitor for recurrence**

### Data Corruption
1. **Stop application immediately**
2. **Backup current state**
3. **Restore from last known good backup**
4. **Restart application**
5. **Verify data integrity**

### Security Incident
1. **Isolate affected systems**
2. **Review security logs**
3. **Change authentication credentials**
4. **Update security configurations**
5. **Monitor for further incidents**

## Contact Information

### Escalation Procedures
- **Level 1**: Application restart and basic troubleshooting
- **Level 2**: Database and configuration issues
- **Level 3**: Security incidents and data corruption

### Support Contacts
- **Technical Support**: [Your support email]
- **Database Admin**: [DBA contact]
- **Security Team**: [Security contact]
- **Management**: [Management contact]

---

**Last Updated**: January 2024  
**Guide Version**: 1.0  
**Application Version**: 1.0
