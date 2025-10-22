const path = require('path');
const { 
  safeRemoveDirectory, 
  safeCopyDirectory, 
  safeCopyFile, 
  safeExec,
  validatePath 
} = require('./safe-build-utils');

/**
 * Safe backend copy script
 * Replaces PowerShell commands with secure Node.js operations
 */

function copyBackend() {
  const currentDir = process.cwd();
  const backendDistPath = path.join(currentDir, 'backend-dist');
  const backendSrcPath = path.join(currentDir, '..', 'backend', 'dist');
  const backendPackagePath = path.join(currentDir, '..', 'backend', 'package.json');
  const backendNodeModulesPath = path.join(currentDir, '..', 'backend', 'node_modules');
  
  try {
    console.log('Starting safe backend copy...');
    
    // Validate all paths
    validatePath(backendSrcPath, currentDir);
    validatePath(backendPackagePath, currentDir);
    validatePath(backendNodeModulesPath, currentDir);
    
    // Remove existing backend-dist directory
    safeRemoveDirectory(backendDistPath);
    
    // Copy backend dist directory
    safeCopyDirectory(backendSrcPath, backendDistPath);
    
    // Copy package.json
    safeCopyFile(backendPackagePath, path.join(backendDistPath, 'package.json'));
    
    // Copy node_modules
    safeCopyDirectory(backendNodeModulesPath, path.join(backendDistPath, 'node_modules'));
    
    console.log('Backend copy completed successfully');
    
  } catch (error) {
    console.error('Backend copy failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  copyBackend();
}

module.exports = { copyBackend };
