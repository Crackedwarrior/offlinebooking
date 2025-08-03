#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 Setting up environment files...\n');

// Function to copy env.example to .env
function setupEnvFile(directory, name) {
  const examplePath = path.join(directory, 'env.example');
  const envPath = path.join(directory, '.env');
  
  if (!fs.existsSync(examplePath)) {
    console.log(`⚠️  ${name}: env.example not found at ${examplePath}`);
    return false;
  }
  
  if (fs.existsSync(envPath)) {
    console.log(`ℹ️  ${name}: .env file already exists at ${envPath}`);
    return true;
  }
  
  try {
    fs.copyFileSync(examplePath, envPath);
    console.log(`✅ ${name}: Created .env file from env.example`);
    return true;
  } catch (error) {
    console.log(`❌ ${name}: Failed to create .env file: ${error.message}`);
    return false;
  }
}

// Setup frontend environment
const frontendSuccess = setupEnvFile('frontend', 'Frontend');

// Setup backend environment
const backendSuccess = setupEnvFile('backend', 'Backend');

console.log('\n📋 Summary:');
if (frontendSuccess && backendSuccess) {
  console.log('✅ All environment files created successfully!');
  console.log('\n🚀 Next steps:');
  console.log('1. Start the backend server: cd backend && npm run dev');
  console.log('2. Start the frontend server: cd frontend && npm run dev');
} else {
  console.log('⚠️  Some environment files could not be created.');
  console.log('Please manually copy env.example to .env in the respective directories.');
}

console.log('\n💡 Note: Make sure to restart your development servers after creating the .env files.'); 