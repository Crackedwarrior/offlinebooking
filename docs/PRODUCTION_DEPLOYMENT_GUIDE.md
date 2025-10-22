# AuditoriumX Production Deployment Guide

## Overview
This guide provides comprehensive instructions for deploying AuditoriumX to production environments. The application has been enhanced with enterprise-grade security, performance optimizations, configuration management, and comprehensive monitoring.

## Prerequisites

### System Requirements
- **Operating System**: Windows 10/11 (64-bit)
- **RAM**: Minimum 4GB, Recommended 8GB+
- **Storage**: 2GB free space
- **Network**: Internet connection for initial setup
- **Printer**: Thermal printer (ESC/POS compatible) for ticket printing

### Software Requirements
- **Node.js**: v18.17.0 or higher
- **npm**: v9.0.0 or higher
- **Git**: For version control (optional)

## Production Environment Setup

### 1. Environment Configuration

#### Backend Environment Variables
Create `.env` file in the `backend/` directory:

```bash
# Server Configuration
NODE_ENV=production
PORT=3001
HOST=localhost

# Database Configuration
DATABASE_URL="file:./production.db"

# Security Configuration
JWT_SECRET=your-super-secure-jwt-secret-minimum-32-characters
BCRYPT_ROUNDS=12

# CORS Configuration
CORS_ORIGIN=http://localhost:8080

# Theater Configuration
THEATER_NAME=YOUR_THEATER_NAME
THEATER_LOCATION=YOUR_CITY_NAME
THEATER_GSTIN=YOUR_GSTIN_NUMBER

# Default Tax Values (fallbacks when frontend doesn't provide)
DEFAULT_NET=125.12
DEFAULT_CGST=11.44
DEFAULT_SGST=11.44
DEFAULT_MC=2.00
DEFAULT_TOTAL=150.00

# Logging Configuration
LOG_LEVEL=info
ENABLE_REQUEST_LOGGING=false
```

#### Frontend Environment Variables
Create `.env` file in the `frontend/` directory:

```bash
# API Configuration
VITE_API_URL=http://localhost:3001
VITE_API_TIMEOUT=30000

# Theater Configuration
VITE_THEATER_NAME=YOUR_THEATER_NAME
VITE_THEATER_LOCATION=YOUR_CITY_NAME
VITE_THEATER_GSTIN=YOUR_GSTIN_NUMBER

# Default Tax Values (fallbacks when frontend doesn't provide)
VITE_DEFAULT_NET=125.12
VITE_DEFAULT_CGST=11.44
VITE_DEFAULT_SGST=11.44
VITE_DEFAULT_MC=2.00
VITE_DEFAULT_TOTAL=150.00

# Feature Flags
VITE_ENABLE_DEBUG=false
VITE_ENABLE_ANALYTICS=true
```

### 2. Security Configuration

#### JWT Secret Generation
Generate a secure JWT secret:
```bash
# Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Using OpenSSL
openssl rand -hex 32
```

#### Database Security
- Use `production.db` instead of `dev.db`
- Ensure database file permissions are restricted
- Regular database backups recommended

#### CORS Configuration
- Never use `*` for CORS_ORIGIN in production
- Specify exact allowed origins
- Use HTTPS in production environments

### 3. Production Build Process

#### Backend Build
```bash
cd backend
npm install --production
npm run build
```

#### Frontend Build
```bash
cd frontend
npm install --production
npm run build
```

#### Installer Build
```bash
cd frontend
npm run installer
```

## Deployment Methods

### Method 1: Standalone Installer (Recommended)
1. Run the installer build process
2. Distribute the generated `.exe` file
3. Install on target machines
4. Configure environment variables
5. Start the application

### Method 2: Manual Deployment
1. Copy built files to target directory
2. Install Node.js dependencies
3. Configure environment variables
4. Start backend and frontend services
5. Configure reverse proxy (if needed)

## Production Monitoring

### Health Check Endpoints
- **Basic Health**: `GET /api/health`
- **Detailed Metrics**: `GET /api/metrics`
- **Production Readiness**: `GET /api/production-readiness`

### Log Files
- **Location**: `backend/logs/`
- **Format**: JSON structured logs
- **Rotation**: Automatic rotation at 10MB
- **Retention**: 5 most recent files

### Performance Monitoring
- **Memory Usage**: Monitored automatically
- **Database Performance**: Query times tracked
- **Request Metrics**: Response times and error rates
- **System Health**: CPU and memory utilization

## Security Checklist

### Pre-Deployment Security
- [ ] Strong JWT secret configured (32+ characters)
- [ ] Database using production path
- [ ] CORS properly configured
- [ ] Input validation enabled
- [ ] Error handling configured
- [ ] Logging enabled
- [ ] Rate limiting configured

### Post-Deployment Security
- [ ] Health endpoints responding
- [ ] No sensitive data in logs
- [ ] Database connections secure
- [ ] Printer access restricted
- [ ] Network access controlled

## Troubleshooting

### Common Issues

#### Application Won't Start
1. Check environment variables
2. Verify database file permissions
3. Check port availability
4. Review error logs

#### Database Connection Issues
1. Verify DATABASE_URL path
2. Check file permissions
3. Ensure database file exists
4. Review connection logs

#### Printer Issues
1. Verify printer drivers installed
2. Check printer connectivity
3. Test printer configuration
4. Review print service logs

#### Performance Issues
1. Check memory usage
2. Monitor database queries
3. Review request logs
4. Check system resources

### Log Analysis
```bash
# View recent logs
tail -f backend/logs/app-$(date +%Y-%m-%d).log

# Search for errors
grep -i error backend/logs/*.log

# Monitor performance
grep -i "performance" backend/logs/*.log
```

## Maintenance

### Regular Tasks
- **Daily**: Check health endpoints
- **Weekly**: Review log files
- **Monthly**: Update dependencies
- **Quarterly**: Security audit

### Backup Strategy
- **Database**: Daily automated backups
- **Configuration**: Version controlled
- **Logs**: Archive old logs
- **Application**: Source code backup

### Updates
1. Test updates in staging environment
2. Backup current installation
3. Deploy updates during maintenance window
4. Verify functionality post-update
5. Monitor for issues

## Support

### Monitoring Tools
- **Health Dashboard**: Built-in health monitoring
- **Log Analysis**: Structured JSON logs
- **Performance Metrics**: Real-time monitoring
- **Error Tracking**: Comprehensive error logging

### Contact Information
- **Technical Support**: [Your support contact]
- **Documentation**: [Your documentation URL]
- **Issue Tracking**: [Your issue tracker]

## Version Information
- **Application Version**: 1.0.0
- **Node.js Version**: 18.17.0+
- **Database**: SQLite (Prisma)
- **Build Date**: [Current Date]
- **Deployment Guide Version**: 1.0

---

**Important**: This application is now production-ready with enterprise-grade security, performance optimizations, and comprehensive monitoring. Follow all security guidelines and maintain regular backups.
