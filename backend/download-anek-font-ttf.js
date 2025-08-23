const fs = require('fs');
const path = require('path');
const https = require('https');

// Create fonts directory if it doesn't exist
const fontsDir = path.join(__dirname, 'fonts');
if (!fs.existsSync(fontsDir)) {
  fs.mkdirSync(fontsDir);
}

// Anek Kannada font URLs - TTF versions
const fontUrls = {
  'AnekKannada-Regular.ttf': 'https://github.com/google/fonts/raw/main/ofl/anekkannada/AnekKannada-Regular.ttf',
  'AnekKannada-Bold.ttf': 'https://github.com/google/fonts/raw/main/ofl/anekkannada/AnekKannada-Bold.ttf'
};

async function downloadFont(url, filename) {
  return new Promise((resolve, reject) => {
    const filePath = path.join(fontsDir, filename);
    const file = fs.createWriteStream(filePath);
    
    https.get(url, (response) => {
      if (response.statusCode === 200) {
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          console.log(`Downloaded: ${filename}`);
          resolve(filePath);
        });
      } else {
        console.log(`Failed to download ${filename}: ${response.statusCode}`);
        reject(new Error(`HTTP ${response.statusCode}`));
      }
    }).on('error', (err) => {
      fs.unlink(filePath, () => {}); // Delete the file if download failed
      reject(err);
    });
  });
}

async function downloadAllFonts() {
  console.log('Downloading Anek Kannada TTF fonts...');
  
  try {
    for (const [filename, url] of Object.entries(fontUrls)) {
      await downloadFont(url, filename);
    }
    console.log('All TTF fonts downloaded successfully!');
    console.log(`Fonts saved in: ${fontsDir}`);
  } catch (error) {
    console.error('Error downloading fonts:', error);
  }
}

downloadAllFonts();
