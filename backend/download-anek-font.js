const fs = require('fs');
const path = require('path');
const https = require('https');

// Create fonts directory if it doesn't exist
const fontsDir = path.join(__dirname, 'fonts');
if (!fs.existsSync(fontsDir)) {
  fs.mkdirSync(fontsDir);
}

// Anek Kannada font URLs from Google Fonts
const fontUrls = {
  'AnekKannada-Regular.ttf': 'https://fonts.gstatic.com/s/anekkannada/v1/raxsHiCq8iQ5W9lj5cMs8X8XfQJt3aqv0w.woff2',
  'AnekKannada-Bold.ttf': 'https://fonts.gstatic.com/s/anekkannada/v1/raxsHiCq8iQ5W9lj5cMs8X8XfQJt3aqv0w.woff2'
};

async function downloadFont(url, filename) {
  return new Promise((resolve, reject) => {
    const filePath = path.join(fontsDir, filename);
    const file = fs.createWriteStream(filePath);
    
    https.get(url, (response) => {
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        console.log(`Downloaded: ${filename}`);
        resolve(filePath);
      });
    }).on('error', (err) => {
      fs.unlink(filePath, () => {}); // Delete the file if download failed
      reject(err);
    });
  });
}

async function downloadAllFonts() {
  console.log('Downloading Anek Kannada fonts...');
  
  try {
    for (const [filename, url] of Object.entries(fontUrls)) {
      await downloadFont(url, filename);
    }
    console.log('All fonts downloaded successfully!');
    console.log(`Fonts saved in: ${fontsDir}`);
  } catch (error) {
    console.error('Error downloading fonts:', error);
  }
}

downloadAllFonts();
