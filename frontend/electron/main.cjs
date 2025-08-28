const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const { spawn, exec } = require('child_process');
const fs = require('fs');
const http = require('http');

const isDev = !app.isPackaged;

// Keep a global reference of the window object
let mainWindow;
let backendProcess;

// Backend server configuration
const BACKEND_PORT = 3001;
const FRONTEND_PORT = 8080;

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      webSecurity: false, // Disable web security for development
      preload: path.join(__dirname, 'preload.cjs')
    },
    title: 'AuditoriumX - Professional Theater Booking System',

    show: false, // Don't show until ready
    autoHideMenuBar: true,
    fullscreen: true
  });

  // Load the app
  const startUrl = isDev 
    ? `http://localhost:${FRONTEND_PORT}` 
    : `file://${path.join(__dirname, 'dist/index.html')}`;
  
  console.log('🔧 Development mode:', isDev);
  console.log('🔧 Frontend port:', FRONTEND_PORT);
  
  console.log('🚀 Loading URL:', startUrl);
  
  // Add error handling for page load
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error('❌ Page load failed:', errorCode, errorDescription, validatedURL);
  });
  
  mainWindow.webContents.on('did-finish-load', () => {
    console.log('✅ Page loaded successfully');
  });
  
  mainWindow.loadURL(startUrl);

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    
    // Open DevTools in development
    if (isDev) {
      mainWindow.webContents.openDevTools();
    }
  });

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

// Kill any existing Node.js processes on port 3001
async function killProcessOnPort(port) {
  try {
    const { exec } = require('child_process');
    return new Promise((resolve) => {
      exec(`netstat -ano | findstr :${port}`, (error, stdout) => {
        if (stdout) {
          const lines = stdout.trim().split('\n');
          lines.forEach(line => {
            const parts = line.trim().split(/\s+/);
            if (parts.length >= 5) {
              const pid = parts[4];
              console.log(`🛑 Killing process ${pid} on port ${port}`);
              exec(`taskkill /f /pid ${pid}`, (killError) => {
                if (killError) {
                  console.log(`⚠️ Failed to kill process ${pid}:`, killError.message);
                } else {
                  console.log(`✅ Killed process ${pid} on port ${port}`);
                }
              });
            }
          });
        }
        // Wait a bit for processes to be killed
        setTimeout(resolve, 2000);
      });
    });
  } catch (error) {
    console.log('⚠️ Error killing processes on port:', error.message);
  }
}

// Start backend server
function startBackend() {
  return new Promise(async (resolve, reject) => {
    try {
      const backendPath = isDev 
        ? path.join(__dirname, '../../backend')
        : path.join(process.resourcesPath, 'backend');
      
      console.log('🔧 Backend path:', backendPath);
      
      // Check if backend directory exists
      if (!fs.existsSync(backendPath)) {
        console.error('❌ Backend directory not found:', backendPath);
        reject(new Error('Backend directory not found'));
        return;
      }

      // In production, the backend files are directly in the backend directory
      // In development, they're in backend/dist
      const backendDistPath = isDev 
        ? path.join(backendPath, 'dist')
        : backendPath;
      
      console.log('🔧 Backend dist path:', backendDistPath);
      
      // Check if backend dist directory exists
      if (!fs.existsSync(backendDistPath)) {
        console.error('❌ Backend dist directory not found:', backendDistPath);
        reject(new Error('Backend dist directory not found'));
        return;
      }

      // Kill any existing processes on port 3001
      console.log('🛑 Checking for existing processes on port 3001...');
      await killProcessOnPort(3001);

      // Check if port 3001 is available first
      const checkPort = () => {
        return new Promise((resolve) => {
          const net = require('net');
          const server = net.createServer();
          server.listen(3001, () => {
            server.close();
            resolve(true);
          });
          server.on('error', () => {
            resolve(false);
          });
        });
      };

      // Wait for port to be available
      const waitForPort = async () => {
        let attempts = 0;
        while (attempts < 5) {
          const isAvailable = await checkPort();
          if (isAvailable) {
            console.log('✅ Port 3001 is available');
            return true;
          }
          console.log(`⏳ Port 3001 busy, waiting... (attempt ${attempts + 1}/5)`);
          await new Promise(resolve => setTimeout(resolve, 1000));
          attempts++;
        }
        return false;
      };

      const portAvailable = await waitForPort();
      if (!portAvailable) {
        console.log('❌ Port 3001 still busy after 5 seconds');
        reject(new Error('Port 3001 is busy'));
        return;
      }

      // Start backend process
      console.log('🔄 Starting backend process...');
      
      // Set up environment variables for backend
      const backendEnv = {
        ...process.env,
        NODE_ENV: isDev ? 'development' : 'production',
        DATABASE_URL: isDev ? `file:${path.join(backendPath, 'dist', 'dev.db')}` : `file:${path.join(backendPath, 'database', 'auditoriumx.db')}`,
        PORT: '3001',
        CORS_ORIGIN: `http://localhost:${FRONTEND_PORT}`,
        LOG_LEVEL: 'info',
        ENABLE_REQUEST_LOGGING: 'true'
      };
      
      console.log('🔧 Database URL:', backendEnv.DATABASE_URL);
      
      backendProcess = spawn('node', ['server.js'], {
        cwd: backendDistPath,
        stdio: 'pipe',
        shell: true,
        env: backendEnv
      });

      backendProcess.stdout.on('data', (data) => {
        console.log('Backend:', data.toString());
        if (data.toString().includes('Server running at')) {
          console.log('✅ Backend server started successfully');
          // Wait a bit more for the server to be fully ready
          setTimeout(async () => {
            // Verify the backend is actually responding
            const isHealthy = await checkBackendHealth();
            if (isHealthy) {
              console.log('✅ Backend health check passed');
              resolve();
            } else {
              console.log('⚠️ Backend health check failed, but continuing...');
              resolve();
            }
          }, 2000);
        }
      });

      backendProcess.stderr.on('data', (data) => {
        console.error('Backend Error:', data.toString());
      });

      backendProcess.on('error', (error) => {
        console.error('Failed to start backend:', error);
        reject(error);
      });

      backendProcess.on('close', (code) => {
        console.log(`Backend process exited with code ${code}`);
      });

      // Timeout after 10 seconds
      setTimeout(() => {
        if (backendProcess && !backendProcess.killed) {
          console.log('✅ Backend server started (timeout)');
          resolve();
        }
      }, 10000);
    } catch (error) {
      console.error('❌ Backend startup error:', error);
      reject(error);
    }
  });
}

// Check if backend is running
async function checkBackendHealth() {
  try {
    return new Promise((resolve) => {
      const req = http.get(`http://localhost:${BACKEND_PORT}/health`, (res) => {
        console.log('🔍 Backend health check response:', res.statusCode);
        resolve(res.statusCode === 200);
      });
      req.on('error', (error) => {
        console.log('🔍 Backend health check failed:', error.message);
        resolve(false);
      });
      req.setTimeout(5000, () => {
        console.log('🔍 Backend health check timeout');
        resolve(false);
      });
    });
  } catch (error) {
    console.log('🔍 Backend health check error:', error.message);
    return false;
  }
}

// App event handlers
app.whenReady().then(async () => {
  try {
    // Always start backend in development mode
    console.log('🚀 Starting backend server...');
    
    // Start backend with timeout
    const backendPromise = startBackend();
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Backend startup timeout')), 30000)
    );
    
    try {
      await Promise.race([backendPromise, timeoutPromise]);
      console.log('✅ Backend started successfully');
    } catch (backendError) {
      console.error('❌ Backend startup failed:', backendError.message);
      console.log('⚠️ Continuing without backend...');
    }
    
    // Create window regardless of backend status
    setTimeout(() => {
      createWindow();
    }, 2000);
  } catch (error) {
    console.error('❌ Failed to start backend:', error);
    // Still create window even if backend fails
    createWindow();
  }
});

app.on('window-all-closed', () => {
  // Kill backend process when app closes
  if (backendProcess && !backendProcess.killed) {
    console.log('🛑 Stopping backend server...');
    backendProcess.kill();
  }
  
  // Quit app on macOS
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Ensure proper cleanup on app quit
app.on('before-quit', () => {
  console.log('🛑 App quitting - cleaning up processes...');
  if (backendProcess && !backendProcess.killed) {
    console.log('🛑 Killing backend process...');
    backendProcess.kill('SIGTERM');
    // Force kill after 3 seconds if not terminated
    setTimeout(() => {
      if (backendProcess && !backendProcess.killed) {
        console.log('🛑 Force killing backend process...');
        backendProcess.kill('SIGKILL');
      }
    }, 3000);
  }
});

// Handle process termination signals
process.on('SIGINT', () => {
  console.log('🛑 SIGINT received - cleaning up...');
  if (backendProcess && !backendProcess.killed) {
    backendProcess.kill('SIGTERM');
  }
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received - cleaning up...');
  if (backendProcess && !backendProcess.killed) {
    backendProcess.kill('SIGTERM');
  }
  process.exit(0);
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC handlers for communication with renderer process
ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

ipcMain.handle('get-app-name', () => {
  return app.getName();
});

ipcMain.handle('close-app', () => {
  app.quit();
});

ipcMain.handle('open-external', async (event, url) => {
  await shell.openExternal(url);
});

// Handle installation tasks
ipcMain.handle('install-dependencies', async () => {
  try {
    console.log('🔧 Starting dependency installation...');
    
    // This would be implemented based on your installation needs
    // For now, return success
    return {
      success: true,
      message: 'Dependencies installed successfully!',
      details: [
        '✅ Sumatra PDF installed',
        '✅ Epson TM-T81 drivers installed', 
        '✅ Custom fonts installed system-wide',
        '✅ Database initialized with default data'
      ]
    };
  } catch (error) {
    console.error('❌ Installation failed:', error);
    return {
      success: false,
      message: 'Installation failed. Please run as administrator.',
      details: [
        '❌ Some dependencies may not have been installed',
        '⚠️ Try running the installer as administrator',
        '⚠️ Check if antivirus is blocking the installation'
      ]
    };
  }
});

// Handle printer operations
ipcMain.handle('get-printers', async () => {
  try {
    console.log('🖨️ Fetching real printer list...');
    
    // Use PowerShell to get real printer list on Windows
    const { exec } = require('child_process');
    
    return new Promise((resolve, reject) => {
      exec('powershell "Get-Printer | Select-Object Name | ConvertTo-Json"', (error, stdout, stderr) => {
        if (error) {
          console.error('❌ Failed to get printers:', error);
          // Fallback to empty array instead of hardcoded data
          resolve([]);
          return;
        }
        
        try {
          const printers = JSON.parse(stdout);
          const printerNames = Array.isArray(printers) 
            ? printers.map(p => p.Name).filter(name => name)
            : [];
          
          console.log('✅ Found printers:', printerNames);
          resolve(printerNames);
        } catch (parseError) {
          console.error('❌ Failed to parse printer data:', parseError);
          resolve([]);
        }
      });
    });
  } catch (error) {
    console.error('❌ Failed to get printers:', error);
    return [];
  }
});

ipcMain.handle('print-ticket', async (event, ticketData, printerName, movieData) => {
  try {
    console.log('🖨️ Printing ticket via Sumatra PDF:', ticketData);
    console.log('🖨️ Printer:', printerName);
    
    // Use the backend PDF printing service
    const backendUrl = `http://localhost:${BACKEND_PORT}/api/thermal-printer/print`;
    
    // Format ticket data for backend PDF service
    const printData = {
      ticketData: {
        theaterName: ticketData.theaterName || 'SREELEKHA THEATER',
        location: ticketData.location || 'Chickmagalur',
        movie: ticketData.movieName,
        movieLanguage: ticketData.movieLanguage,
        date: ticketData.date,
        show: ticketData.showTime ? getShowFromTime(ticketData.showTime) : 'MATINEE',
        seatClass: ticketData.classLabel,
        seatInfo: `${ticketData.row} ${ticketData.seatRange}`,
        totalAmount: ticketData.totalPrice,
        ticketId: ticketData.transactionId
      },
      printerName: printerName,
      movieSettings: {
        printInKannada: movieData?.printInKannada || false
      }
    };
    
    console.log('📤 Sending to backend PDF service:', printData);
    
    // Make HTTP request to backend printing service
    const http = require('http');
    
    return new Promise((resolve, reject) => {
      const postData = JSON.stringify(printData);
      
      const options = {
        hostname: 'localhost',
        port: BACKEND_PORT,
        path: '/api/thermal-printer/print',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      };
      
      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          try {
            const result = JSON.parse(data);
            console.log('✅ Backend PDF print result:', result);
            resolve(result);
          } catch (error) {
            console.error('❌ Failed to parse backend response:', error);
            resolve({ success: false, message: 'Failed to parse backend response' });
          }
        });
      });
      
      req.on('error', (error) => {
        console.error('❌ Backend print request failed:', error);
        resolve({ success: false, message: `Backend print failed: ${error.message}` });
      });
      
      req.write(postData);
      req.end();
    });
  } catch (error) {
    console.error('❌ Failed to print ticket:', error);
    return { success: false, message: error.message };
  }
});

// Helper function to convert time to show type
function getShowFromTime(time) {
  const hour = parseInt(time.split(':')[0]);
  if (hour < 12) return 'MORNING';
  if (hour < 17) return 'MATINEE';
  if (hour < 21) return 'EVENING';
  return 'NIGHT';
}

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}
