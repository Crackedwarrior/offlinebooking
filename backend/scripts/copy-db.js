const fs = require('fs');
const path = require('path');

// Create dist directory if it doesn't exist
const distDir = path.join(__dirname, '..', 'dist');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// Copy database file
const dbSource = path.join(__dirname, '..', 'prisma', 'dev.db');
const dbDest = path.join(distDir, 'dev.db');
if (fs.existsSync(dbSource)) {
  fs.copyFileSync(dbSource, dbDest);
  console.log('Database file copied successfully');
} else {
  console.log('Database file not found, skipping...');
}

// Copy prisma directory
const prismaSource = path.join(__dirname, '..', 'prisma');
const prismaDest = path.join(distDir, 'prisma');

function copyDir(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  
  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  for (let entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

if (fs.existsSync(prismaSource)) {
  copyDir(prismaSource, prismaDest);
  console.log('Prisma directory copied successfully');
} else {
  console.log('Prisma directory not found, skipping...');
}
