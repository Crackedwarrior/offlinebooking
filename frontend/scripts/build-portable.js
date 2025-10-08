#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Starting AuditoriumX Portable Build Process...');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(step, message) {
  log(`\n${step} ${message}`, 'cyan');
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️ ${message}`, 'yellow');
}

// Check if we're in the right directory
const currentDir = process.cwd();
if (!currentDir.includes('frontend')) {
  logError('This script must be run from the frontend directory');
  process.exit(1);
}

try {
  // Step 1: Clean previous builds
  logStep('1️⃣', 'Cleaning previous builds...');
  const distPortablePath = path.join(currentDir, 'dist-portable-new');
  if (fs.existsSync(distPortablePath)) {
    fs.rmSync(distPortablePath, { recursive: true, force: true });
    logSuccess('Previous portable build cleaned');
  }

  // Step 2: Build backend
  logStep('2️⃣', 'Building backend...');
  execSync('npm run build:backend', { stdio: 'inherit' });
  logSuccess('Backend built successfully');

  // Step 3: Copy backend to dist
  logStep('3️⃣', 'Copying backend to dist...');
  execSync('npm run copy:backend', { stdio: 'inherit' });
  logSuccess('Backend copied to dist');

  // Step 4: Build frontend
  logStep('4️⃣', 'Building frontend...');
  execSync('npm run build', { stdio: 'inherit' });
  logSuccess('Frontend built successfully');

  // Step 5: Copy backend to final location
  logStep('5️⃣', 'Copying backend to final location...');
  execSync('npm run copy:backend-post', { stdio: 'inherit' });
  logSuccess('Backend copied to final location');

  // Step 6: Build portable executable
  logStep('6️⃣', 'Building portable executable...');
  execSync('electron-builder --config electron-builder-portable.json --win', { stdio: 'inherit' });
  logSuccess('Portable executable built successfully');

  // Step 7: Copy backend to portable resources
  logStep('7️⃣', 'Copying backend to portable resources...');
  const portableBackendPath = path.join(distPortablePath, 'win-unpacked', 'resources', 'backend');
  
  try {
    // Ensure source directory exists
    if (!fs.existsSync('backend-dist')) {
      throw new Error('Backend distribution directory not found');
    }
    
    // Create destination directory if it doesn't exist
    if (!fs.existsSync(portableBackendPath)) {
      fs.mkdirSync(portableBackendPath, { recursive: true });
      logSuccess('Created portable backend directory');
    }
    
    // Copy backend files with error handling - ensure node_modules is copied
    execSync(`powershell -Command "Copy-Item -Path 'backend-dist\\*' -Destination '${portableBackendPath}' -Recurse -Force"`, { stdio: 'inherit' });
    logSuccess('Backend copied to portable resources');
    
    // Verify critical files were copied
    const criticalFiles = ['server.js', 'package.json', 'node_modules'];
    for (const file of criticalFiles) {
      const filePath = path.join(portableBackendPath, file);
      if (!fs.existsSync(filePath)) {
        logWarning(`Critical file missing: ${file}`);
      } else {
        logSuccess(`Verified: ${file} exists`);
      }
    }
  } catch (error) {
    logError(`Failed to copy backend to portable resources: ${error.message}`);
    throw error;
  }

  // Step 8: Verify build
  logStep('8️⃣', 'Verifying build...');
  // Check for the portable executable (electron-builder creates it with version number)
  const files = fs.readdirSync(distPortablePath);
  const exeFile = files.find(file => file.endsWith('.exe') && file.includes('AuditoriumX-Portable'));
  
  if (!exeFile) {
    logWarning(`Files in dist-portable: ${files.join(', ')}`);
    logError('Portable executable not found');
    process.exit(1);
  }
  
  const finalExePath = path.join(distPortablePath, exeFile);
  const stats = fs.statSync(finalExePath);
  const sizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
  logSuccess(`Portable executable created: ${sizeInMB} MB`);
  logSuccess(`Executable name: ${exeFile}`);
  
  // Step 8.5: Rename executable to remove version number
  logStep('8️⃣.5️⃣', 'Renaming executable...');
  const cleanExeName = 'AuditoriumX-Portable.exe';
  const cleanExePath = path.join(distPortablePath, cleanExeName);
  
  if (exeFile !== cleanExeName) {
    fs.renameSync(finalExePath, cleanExePath);
    logSuccess(`Renamed to: ${cleanExeName}`);
  }

  // Step 9: Create README for portable
  logStep('9️⃣', 'Creating portable README...');
  const readmeContent = `# AuditoriumX Portable

This is a portable version of AuditoriumX - Professional Theater Booking System.

## Usage

1. Extract all files to a folder
2. Run AuditoriumX-Portable.exe as Administrator
3. The application will start automatically

## System Requirements

- Windows 10/11 (64-bit)
- Administrator privileges (for printer access)
- At least 500MB free disk space

## Features

- Complete offline theater booking system
- Thermal printer support
- Database included
- No installation required

## Troubleshooting

If the application doesn't start:
1. Ensure you're running as Administrator
2. Check if antivirus is blocking the application
3. Verify all files are extracted to the same folder

## Support

For support, contact the development team.

Build Date: ${new Date().toISOString()}
Version: ${require('../package.json').version}
`;

  fs.writeFileSync(path.join(distPortablePath, 'README.txt'), readmeContent);
  logSuccess('Portable README created');

  // Final success message
  log('\n🎉 Portable build completed successfully!', 'green');
  log(`📁 Output directory: ${distPortablePath}`, 'blue');
  log(`📄 Executable: ${cleanExePath}`, 'blue');
  log('\n🚀 Ready for distribution!', 'magenta');

} catch (error) {
  logError(`Build failed: ${error.message}`);
  console.error(error);
  process.exit(1);
}
