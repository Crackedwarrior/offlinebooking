const fs = require('fs');
const path = require('path');
const https = require('https');

async function downloadFont() {
  const fontUrl = 'https://github.com/google/fonts/raw/main/ofl/notosanskannada/NotoSansKannada-Regular.ttf';
  const outputPath = path.join(__dirname, 'fonts', 'NotoSansKannada-Regular.ttf');
  
  // Create fonts directory if it doesn't exist
  if (!fs.existsSync(path.join(__dirname, 'fonts'))) {
    fs.mkdirSync(path.join(__dirname, 'fonts'));
  }
  
  console.log('📥 Downloading Noto Sans Kannada font...');
  
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(outputPath);
    
    https.get(fontUrl, (response) => {
      if (response.statusCode === 200) {
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          console.log('✅ Font downloaded successfully:', outputPath);
          resolve(outputPath);
        });
      } else {
        reject(new Error(`Failed to download font: ${response.statusCode}`));
      }
    }).on('error', (err) => {
      reject(err);
    });
  });
}

downloadFont().catch(console.error);
