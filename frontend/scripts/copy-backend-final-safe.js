const path = require('path');
const { 
  safeCopyDirectory, 
  validatePath 
} = require('./safe-build-utils');

/**
 * Safe backend final copy script
 * Copies backend-dist to electron installer resources
 */

function copyBackendFinal() {
  const currentDir = process.cwd();
  const backendDistPath = path.join(currentDir, 'backend-dist');
  const installerBackendPath = path.join(currentDir, 'dist-electron-installer', 'win-unpacked', 'resources', 'backend');
  
  try {
    console.log('🔧 Starting safe backend final copy...');
    
    // Validate paths
    validatePath(backendDistPath, currentDir);
    validatePath(installerBackendPath, currentDir);
    
    // Copy backend-dist to installer resources
    safeCopyDirectory(backendDistPath, installerBackendPath);
    
    console.log('✅ Backend final copy completed successfully');
    
  } catch (error) {
    console.error('❌ Backend final copy failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  copyBackendFinal();
}

module.exports = { copyBackendFinal };
