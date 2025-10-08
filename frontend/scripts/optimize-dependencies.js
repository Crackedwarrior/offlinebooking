const fs = require('fs');
const path = require('path');

console.log('🔧 Starting dependency optimization...');

// Read current package.json files
const frontendPackagePath = path.join(__dirname, '../package.json');
const backendPackagePath = path.join(__dirname, '../../backend/package.json');

const frontendPackage = JSON.parse(fs.readFileSync(frontendPackagePath, 'utf8'));
const backendPackage = JSON.parse(fs.readFileSync(backendPackagePath, 'utf8'));

// Dependencies that should only be in backend
const backendOnlyDeps = [
  '@prisma/client',
  'compression',
  'cors',
  'dotenv',
  'express',
  'express-rate-limit',
  'helmet',
  'mongodb',
  'node-fetch',
  'node-thermal-printer',
  'node-windows',
  'pdf-lib',
  'pdfkit',
  'puppeteer',
  'serialport',
  'sqlite3',
  'zod'
];

console.log('📦 Dependencies to move to backend only:');
backendOnlyDeps.forEach(dep => {
  if (frontendPackage.dependencies[dep]) {
    console.log(`  - ${dep}: ${frontendPackage.dependencies[dep]}`);
  }
});

// Remove backend dependencies from frontend
let removedCount = 0;
backendOnlyDeps.forEach(dep => {
  if (frontendPackage.dependencies[dep]) {
    delete frontendPackage.dependencies[dep];
    removedCount++;
  }
});

// Save updated frontend package.json
fs.writeFileSync(frontendPackagePath, JSON.stringify(frontendPackage, null, 2));

console.log(`✅ Removed ${removedCount} backend dependencies from frontend`);
console.log('📊 Frontend dependencies count:', Object.keys(frontendPackage.dependencies).length);
console.log('📊 Backend dependencies count:', Object.keys(backendPackage.dependencies).length);

console.log('🎉 Step 1 complete! Frontend package.json optimized.');
console.log('💡 Next: Run "npm install" in frontend directory to update node_modules');
