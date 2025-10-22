const path = require('path');
const { 
  safeCopyDirectory, 
  validatePath 
} = require('./safe-build-utils');

/**
 * Safe backend post-copy script
 * Copies backend-dist to dist/backend after frontend build
 */

function copyBackendPost() {
  const currentDir = process.cwd();
  const backendDistPath = path.join(currentDir, 'backend-dist');
  const distBackendPath = path.join(currentDir, 'dist', 'backend');
  
  try {
    console.log('Starting safe backend post-copy...');
    
    // Validate paths
    validatePath(backendDistPath, currentDir);
    validatePath(distBackendPath, currentDir);
    
    // Copy backend-dist to dist/backend
    safeCopyDirectory(backendDistPath, distBackendPath);
    
    console.log('Backend post-copy completed successfully');
    
  } catch (error) {
    console.error('Backend post-copy failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  copyBackendPost();
}

module.exports = { copyBackendPost };
