const path = require('path');
const { 
  safeCopyDirectory, 
  validatePath 
} = require('./safe-build-utils');

/**
 * Safe backend final installer copy script
 * Copies backend-dist to installer resources
 */

function copyBackendFinalInstaller() {
  const currentDir = process.cwd();
  const backendDistPath = path.join(currentDir, 'backend-dist');
  const installerBackendPath = path.join(currentDir, 'dist-installer', 'win-unpacked', 'resources', 'backend');
  
  try {
    console.log('🔧 Starting safe backend final installer copy...');
    
    // Validate paths
    validatePath(backendDistPath, currentDir);
    validatePath(installerBackendPath, currentDir);
    
    // Copy backend-dist to installer resources
    safeCopyDirectory(backendDistPath, installerBackendPath);
    
    // Also copy fonts from original backend directory
    const backendFontsPath = path.join(currentDir, '..', 'backend', 'fonts');
    const installerFontsPath = path.join(installerBackendPath, 'fonts');
    
    if (require('fs').existsSync(backendFontsPath)) {
      console.log('📁 Copying fonts from backend...');
      safeCopyDirectory(backendFontsPath, installerFontsPath);
    }
    
    console.log('✅ Backend final installer copy completed successfully');
    
  } catch (error) {
    console.error('❌ Backend final installer copy failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  copyBackendFinalInstaller();
}

module.exports = { copyBackendFinalInstaller };
