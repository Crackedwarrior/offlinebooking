const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Safe file operations for build scripts
 * Replaces PowerShell commands with secure Node.js operations
 */

// Safe directory operations
function safeRemoveDirectory(dirPath) {
  try {
    if (fs.existsSync(dirPath)) {
      fs.rmSync(dirPath, { recursive: true, force: true });
      console.log(`✅ Removed directory: ${dirPath}`);
    }
  } catch (error) {
    console.error(`❌ Error removing directory ${dirPath}:`, error.message);
    throw error;
  }
}

function safeCopyDirectory(src, dest) {
  try {
    if (!fs.existsSync(src)) {
      throw new Error(`Source directory does not exist: ${src}`);
    }
    
    // Create destination directory if it doesn't exist
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    
    // Copy directory contents
    fs.cpSync(src, dest, { recursive: true, force: true });
    console.log(`✅ Copied directory: ${src} -> ${dest}`);
  } catch (error) {
    console.error(`❌ Error copying directory ${src} to ${dest}:`, error.message);
    throw error;
  }
}

function safeCopyFile(src, dest) {
  try {
    if (!fs.existsSync(src)) {
      throw new Error(`Source file does not exist: ${src}`);
    }
    
    // Create destination directory if it doesn't exist
    const destDir = path.dirname(dest);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }
    
    fs.copyFileSync(src, dest);
    console.log(`✅ Copied file: ${src} -> ${dest}`);
  } catch (error) {
    console.error(`❌ Error copying file ${src} to ${dest}:`, error.message);
    throw error;
  }
}

// Safe command execution
function safeExec(command, options = {}) {
  try {
    console.log(`🔧 Executing: ${command}`);
    const result = execSync(command, { 
      stdio: 'inherit', 
      encoding: 'utf8',
      ...options 
    });
    console.log(`✅ Command completed successfully: ${command}`);
    return result;
  } catch (error) {
    console.error(`❌ Command failed: ${command}`);
    console.error(`Error: ${error.message}`);
    throw error;
  }
}

// Validate paths to prevent directory traversal
function validatePath(inputPath, basePath) {
  const resolvedPath = path.resolve(inputPath);
  const resolvedBase = path.resolve(basePath);
  
  // Allow paths that are within the base directory or its parent directories
  // This is needed for copying from ../backend/dist
  const parentDir = path.resolve(basePath, '..');
  
  if (!resolvedPath.startsWith(resolvedBase) && !resolvedPath.startsWith(parentDir)) {
    throw new Error(`Path traversal detected: ${inputPath}`);
  }
  
  return resolvedPath;
}

module.exports = {
  safeRemoveDirectory,
  safeCopyDirectory,
  safeCopyFile,
  safeExec,
  validatePath
};
