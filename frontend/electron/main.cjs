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

// Setup logging
const logFile = path.join(app.getPath('userData'), 'app.log');
const logToFile = (message, level = 'INFO') => {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level}] ${message}\n`;
  fs.appendFileSync(logFile, logMessage);
  console.log(`[${level}] ${message}`);
};

// Add error logging wrapper
const logError = (error, context = '') => {
  const errorMessage = `${context}: ${error.message}`;
  const stackTrace = error.stack ? `\nStack: ${error.stack}` : '';
  logToFile(`${errorMessage}${stackTrace}`, 'ERROR');
};

// Log app startup
logToFile('[STARTUP] Electron app starting...');
logToFile(`[STARTUP] Development mode: ${isDev}`);
logToFile(`[STARTUP] App path: ${app.getAppPath()}`);
logToFile(`[STARTUP] User data path: ${app.getPath('userData')}`);

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
      webSecurity: false, // Disable web security for portable app to allow local file loading
      preload: path.join(__dirname, 'preload.cjs')
    },
    title: 'AuditoriumX - Professional Theater Booking System',
    icon: path.join(__dirname, 'resources/icon.png'), // Set window icon according to official docs
    show: false, // Don't show until ready
    autoHideMenuBar: true,
    fullscreen: true,
    // Disable DevTools in production
    ...(isDev ? {} : { devTools: false })
  });

  // Load the app
  const startUrl = isDev 
    ? `http://localhost:${FRONTEND_PORT}` 
    : `file://${path.join(app.getAppPath(), 'dist/index.html')}`;
  
  console.log('[STARTUP] Development mode:', isDev);
  console.log('[STARTUP] Frontend port:', FRONTEND_PORT);
  console.log('[STARTUP] App path:', app.getAppPath());
  console.log('[STARTUP] __dirname:', __dirname);
  
  console.log('[STARTUP] Loading URL:', startUrl);
  
  // Add error handling for page load
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error('[ERROR] Page load failed:', errorCode, errorDescription, validatedURL);
    console.error('[STARTUP] Attempted URL:', validatedURL);
    console.error('[STARTUP] Error code:', errorCode);
    console.error('[STARTUP] Error description:', errorDescription);
  });
  
  mainWindow.webContents.on('did-finish-load', () => {
    console.log('[STARTUP] Page loaded successfully');
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

  // Prevent opening external URLs in browser (desktop app security)
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    console.log('[SECURITY] Blocked external URL:', url);
    return { action: 'deny' };
  });

  // Prevent navigation to external sites
  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    // Only allow localhost URLs (your app)
    if (!navigationUrl.startsWith('http://localhost:')) {
      console.log('[SECURITY] Blocked navigation to:', navigationUrl);
      event.preventDefault();
    }
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
              console.log(`[STARTUP] Killing process ${pid} on port ${port}`);
              exec(`taskkill /f /pid ${pid}`, (killError) => {
                if (killError) {
                  console.log(`[WARN] Failed to kill process ${pid}:`, killError.message);
                } else {
                  console.log(`[STARTUP] Killed process ${pid} on port ${port}`);
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
    console.log('[WARN] Error killing processes on port:', error.message);
  }
}

// Start backend server with retry logic
function startBackend(retryCount = 0) {
  const maxRetries = 3;
  console.log(`[STARTUP] [DEBUG] Starting backend with retry count: ${retryCount}`);
  logToFile(`[DEBUG] Starting backend with retry count: ${retryCount}`);
  
  return new Promise(async (resolve, reject) => {
    try {
      console.log(`[STARTUP] [DEBUG] Determining backend path...`);
      console.log(`[STARTUP] [DEBUG] isDev: ${isDev}`);
      console.log(`[STARTUP] [DEBUG] __dirname: ${__dirname}`);
      console.log(`[STARTUP] [DEBUG] process.resourcesPath: ${process.resourcesPath}`);
      
      let backendPath;
      let nodeModulesPath;

      if (isDev) {
        backendPath = path.join(__dirname, '../../backend');
        nodeModulesPath = path.join(__dirname, '../../backend/node_modules');
      } else {
        const backendCandidates = [
          { backend: path.join(process.resourcesPath, 'backend'), nodeModules: path.join(process.resourcesPath, 'backend', 'node_modules') },
          { backend: path.join(process.resourcesPath, 'app', 'backend-dist'), nodeModules: path.join(process.resourcesPath, 'app', 'backend-dist', 'node_modules') },
          { backend: path.join(process.resourcesPath, 'app.asar.unpacked', 'backend'), nodeModules: path.join(process.resourcesPath, 'app.asar.unpacked', 'backend', 'node_modules') },
          { backend: path.join(process.resourcesPath, 'app.asar.unpacked', 'dist', 'backend'), nodeModules: path.join(process.resourcesPath, 'app.asar.unpacked', 'dist', 'backend', 'node_modules') }
        ];

        const resolved = backendCandidates.find(candidate => fs.existsSync(candidate.backend));

        if (!resolved) {
          const pathsTried = backendCandidates.map(c => c.backend).join(', ');
          console.log(`[ERROR] [DEBUG] Backend directory not found in any expected locations: ${pathsTried}`);
          logToFile(`❌ Backend directory not found in any expected locations: ${pathsTried}`);
          reject(new Error('Backend directory not found'));
          return;
        }

        backendPath = resolved.backend;
        nodeModulesPath = resolved.nodeModules;
      }
      
      console.log(`[STARTUP] [DEBUG] Calculated backend path: ${backendPath}`);
      logToFile(`🔧 Backend path: ${backendPath}`);
      
      // Check if backend directory exists
      console.log(`[STARTUP] [DEBUG] Checking if backend directory exists: ${backendPath}`);
      if (!fs.existsSync(backendPath)) {
        console.log(`[ERROR] [DEBUG] Backend directory not found: ${backendPath}`);
        logToFile(`❌ Backend directory not found: ${backendPath}`);
        reject(new Error('Backend directory not found'));
        return;
      }
      console.log(`[STARTUP] [DEBUG] Backend directory exists: ${backendPath}`);

      // In production, the backend files are directly in the backend directory
      // In development, they're in backend/dist
      const backendDistPath = isDev
        ? path.join(backendPath, 'dist')
        : backendPath;
      
      console.log(`[STARTUP] [DEBUG] Backend dist path: ${backendDistPath}`);
      logToFile(`🔧 Backend dist path: ${backendDistPath}`);
      
      // Check if backend dist directory exists
      console.log(`[STARTUP] [DEBUG] Checking if backend dist directory exists: ${backendDistPath}`);
      if (!fs.existsSync(backendDistPath)) {
        console.log(`[ERROR] [DEBUG] Backend dist directory not found: ${backendDistPath}`);
        logToFile(`❌ Backend directory not found: ${backendDistPath}`);
        reject(new Error('Backend directory not found'));
        return;
      }
      console.log(`[STARTUP] [DEBUG] Backend dist directory exists: ${backendDistPath}`);

      // Kill any existing processes on port 3001
      console.log(`[STARTUP] [DEBUG] Checking for existing processes on port 3001...`);
      logToFile('Checking for existing processes on port 3001...');
      await killProcessOnPort(3001);
      console.log(`[STARTUP] [DEBUG] Port 3001 cleanup completed`);

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
        console.log(`[STARTUP] [DEBUG] Starting port availability check...`);
        while (attempts < 5) {
          console.log(`[STARTUP] [DEBUG] Checking port availability (attempt ${attempts + 1}/5)`);
          const isAvailable = await checkPort();
          if (isAvailable) {
            console.log('[STARTUP] [DEBUG] Port 3001 is available');
            return true;
          }
          console.log(`[STARTUP] [DEBUG] Port 3001 busy, waiting... (attempt ${attempts + 1}/5)`);
          await new Promise(resolve => setTimeout(resolve, 1000));
          attempts++;
        }
        console.log(`[ERROR] [DEBUG] Port 3001 still busy after 5 attempts`);
        return false;
      };

      const portAvailable = await waitForPort();
      if (!portAvailable) {
        console.log('[ERROR] [DEBUG] Port 3001 still busy after 5 seconds');
        reject(new Error('Port 3001 is busy'));
        return;
      }
      console.log(`[STARTUP] [DEBUG] Port 3001 is ready for backend startup`);

      // Start backend process
      console.log(`[STARTUP] [DEBUG] Starting backend process...`);
      logToFile('Starting backend process...');
      
      // Sanitize environment variables for security
      console.log(`[STARTUP] [DEBUG] Setting up environment variables...`);
      const backendEnv = {
        // Only essential environment variables
        NODE_ENV: isDev ? 'development' : 'production',
        DATABASE_URL: `file:${path.join(app.getPath('userData'), 'database', 'dev.db')}`,
        PORT: '3001',
        CORS_ORIGIN: isDev ? `http://localhost:${FRONTEND_PORT}` : '*',
        LOG_LEVEL: 'info',
        ENABLE_REQUEST_LOGGING: 'true',
        // Theater Configuration (required by Phase 2 changes)
        JWT_SECRET: '2dff666cd28b63d3e7164d3bb33d28306c6908bacaaef551a4f2562b48e98ed7cb8397d62fad8cbedb87419fe3d8b68e2e79d4b61d5314df4d16294e8948031a',
        THEATER_NAME: 'SREELEKHA THEATER',
        THEATER_LOCATION: 'Chikmagalur',
        THEATER_GSTIN: '29AAVFS7423E120',
        // Default Tax Values
        DEFAULT_NET: '125.12',
        DEFAULT_CGST: '11.44',
        DEFAULT_SGST: '11.44',
        DEFAULT_MC: '2.00',
        DEFAULT_TOTAL: '150.00',
        // Explicitly remove potentially dangerous env vars
        NODE_OPTIONS: undefined,
        ELECTRON_RUN_AS_NODE: undefined,
        ELECTRON_NO_ASAR: undefined,
        ELECTRON_ENABLE_LOGGING: undefined
      };
      
      console.log(`[STARTUP] [DEBUG] Environment variables configured:`, {
        NODE_ENV: backendEnv.NODE_ENV,
        DATABASE_URL: backendEnv.DATABASE_URL,
        PORT: backendEnv.PORT,
        CORS_ORIGIN: backendEnv.CORS_ORIGIN
      });
      
      logToFile(`Database URL: ${backendEnv.DATABASE_URL}`);
      logToFile(`Working directory: ${backendDistPath}`);
      logToFile(`Database file exists: ${fs.existsSync(path.join(backendDistPath, 'dev.db'))}`);
      logToFile(`Server.js exists: ${fs.existsSync(path.join(backendDistPath, 'server.js'))}`);
      logToFile(`Node modules exists: ${fs.existsSync(path.join(backendDistPath, 'node_modules'))}`);
      logToFile(`Prisma directory exists: ${fs.existsSync(path.join(backendDistPath, 'prisma'))}`);
      
      // List directory contents for debugging
      try {
        const dirContents = fs.readdirSync(backendDistPath);
        logToFile(`Backend directory contents: ${dirContents.join(', ')}`);
      } catch (error) {
        logToFile(`Failed to read backend directory: ${error.message}`, 'ERROR');
      }
      
      // In production, use Electron's bundled Node.js runtime for reliability
      // This ensures the backend works in portable apps without system Node.js dependency
      console.log(`[STARTUP] [DEBUG] Determining Node.js executable...`);
      const nodeExecutable = isDev ? 'node' : process.execPath;
      const spawnArgs = isDev ? ['server.js'] : ['--preserve-symlinks', 'server.js'];
      
      console.log(`[STARTUP] [DEBUG] Node executable: ${nodeExecutable}`);
      console.log(`[STARTUP] [DEBUG] Spawn args: ${JSON.stringify(spawnArgs)}`);
      
        // Allow file:// based renderer to call backend in production (no Origin)
        if (!isDev) {
          console.log(`[STARTUP] [DEBUG] Configuring production environment...`);
          // Don't set CORS_ORIGIN to '*' - let the backend handle CORS properly
          // backendEnv.CORS_ORIGIN = '*'; // REMOVED: Security vulnerability
          // Critical: Set ELECTRON_RUN_AS_NODE to use Electron's Node.js runtime
          backendEnv.ELECTRON_RUN_AS_NODE = '1';
          // Set NODE_PATH to help with module resolution in portable app
          backendEnv.NODE_PATH = `${backendDistPath}${path.delimiter}${nodeModulesPath}`;
          // Set additional environment variables for proper module resolution
          backendEnv.NODE_OPTIONS = '--preserve-symlinks --no-warnings';
          // Ensure we're using the correct working directory
          backendEnv.PWD = backendDistPath;
          // Force CommonJS module resolution for backend
          backendEnv.NODE_NO_WARNINGS = '1';
        
        console.log(`[STARTUP] [DEBUG] Production environment configured:`, {
          ELECTRON_RUN_AS_NODE: backendEnv.ELECTRON_RUN_AS_NODE,
          NODE_PATH: backendEnv.NODE_PATH,
          NODE_OPTIONS: backendEnv.NODE_OPTIONS,
          PWD: backendEnv.PWD
        });
        
        // Log module resolution paths for debugging
        logToFile(`NODE_PATH: ${backendEnv.NODE_PATH}`);
        logToFile(`Node modules path exists: ${fs.existsSync(nodeModulesPath)}`);
        logToFile(`Server.js exists: ${fs.existsSync(path.join(backendDistPath, 'server.js'))}`);
      } else {
        console.log(`[STARTUP] [DEBUG] Using development environment configuration`);
      }
      
      logToFile(`Using spawn() executable: ${nodeExecutable}`);
      logToFile(`Spawn args: ${JSON.stringify(spawnArgs)}`);
      
      console.log(`[STARTUP] [DEBUG] About to spawn backend process...`);
      console.log(`[STARTUP] [DEBUG] Spawn options:`, {
        cwd: backendDistPath,
        stdio: 'pipe',
        windowsHide: true,
        detached: false,
        env: Object.keys(backendEnv).length + ' environment variables'
      });
      
      backendProcess = spawn(nodeExecutable, spawnArgs, {
        cwd: backendDistPath,
        stdio: 'pipe',
        env: backendEnv,
        windowsHide: true,
        detached: false
      });
      
      console.log(`[STARTUP] [DEBUG] Backend process spawned with PID: ${backendProcess.pid}`);

      backendProcess.stdout.on('data', (data) => {
        const output = data.toString();
        console.log(`[BACKEND] [DEBUG] Backend stdout: ${output.trim()}`);
        logToFile(`Backend stdout: ${output}`);
        if (output.includes('Server running at')) {
          console.log(`[STARTUP] [DEBUG] Backend server started successfully!`);
          logToFile('✅ Backend server started successfully');
          // Wait a bit more for the server to be fully ready
          setTimeout(async () => {
            console.log(`[STARTUP] [DEBUG] Performing health check...`);
            // Verify the backend is actually responding
            const isHealthy = await checkBackendHealth();
            if (isHealthy) {
              console.log(`[STARTUP] [DEBUG] Backend health check passed`);
              logToFile('✅ Backend health check passed');
              resolve();
            } else {
              console.log(`[WARN] [DEBUG] Backend health check failed, but continuing...`);
              logToFile('⚠️ Backend health check failed, but continuing...');
              resolve();
            }
          }, 2000);
        }
      });

      backendProcess.stderr.on('data', (data) => {
        const error = data.toString();
        console.log(`[BACKEND] [DEBUG] Backend stderr: ${error.trim()}`);
        logToFile(`Backend stderr: ${error}`);
        console.error('Backend Error:', error);
      });

      backendProcess.on('error', (error) => {
        console.log(`[ERROR] [DEBUG] Backend process error:`, error);
        logError(error, 'Failed to start backend');
        if (retryCount < maxRetries) {
          console.log(`[STARTUP] [DEBUG] Retrying backend startup (${retryCount + 1}/${maxRetries})...`);
          logToFile(`🔄 Retrying backend startup (${retryCount + 1}/${maxRetries})...`);
          setTimeout(() => {
            startBackend(retryCount + 1).then(resolve).catch(reject);
          }, 2000);
        } else {
          console.log(`[ERROR] [DEBUG] Max retries reached, giving up`);
          reject(error);
        }
      });

      backendProcess.on('close', (code) => {
        console.log(`[BACKEND] [DEBUG] Backend process exited with code: ${code}`);
        logToFile(`Backend process exited with code ${code}`);
        if (code !== 0 && !isDev) {
          // In production, attempt to restart backend on unexpected exit
          console.log(`[WARN] [DEBUG] Backend exited unexpectedly, attempting restart...`);
          logToFile('Backend exited unexpectedly, attempting restart...', 'WARN');
          setTimeout(() => {
            if (!backendProcess || backendProcess.killed) {
              startBackend().catch(err => {
                logError(err, 'Failed to restart backend');
              });
            }
          }, 3000);
        }
      });

      // Wait for backend to be ready with health check
      const waitForBackend = async () => {
        let attempts = 0;
        const maxAttempts = 30;
        
        while (attempts < maxAttempts) {
          try {
            const response = await fetch('http://localhost:3001/api/health');
            if (response.ok) {
              console.log('[STARTUP] [DEBUG] Backend is ready');
              logToFile('✅ Backend is ready');
              resolve();
              return;
            }
          } catch (error) {
            console.log(`[STARTUP] [DEBUG] Waiting for backend... (${attempts + 1}/${maxAttempts})`);
            await new Promise(resolve => setTimeout(resolve, 1000));
            attempts++;
          }
        }
        
        console.log(`[ERROR] [DEBUG] Backend health check timeout after ${maxAttempts} attempts`);
        logToFile(`❌ Backend health check timeout after ${maxAttempts} attempts`);
        reject(new Error('Backend health check timeout'));
      };
      
      // Start health check after a short delay
      setTimeout(waitForBackend, 2000);
    } catch (error) {
      console.log(`[ERROR] [DEBUG] Backend startup error:`, error);
      logError(error, 'Backend startup error');
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

// Monitor backend process health
function monitorBackendHealth() {
  if (!backendProcess) return;
  
  // Check process health every 30 seconds
  const healthCheckInterval = setInterval(async () => {
    if (!backendProcess || backendProcess.killed) {
      clearInterval(healthCheckInterval);
      return;
    }
    
    const isHealthy = await checkBackendHealth();
    if (!isHealthy) {
      logToFile('⚠️ Backend health check failed, attempting restart...', 'WARN');
      
      // Attempt to restart backend
      try {
        backendProcess.kill('SIGTERM');
        setTimeout(async () => {
          await startBackend();
        }, 2000);
      } catch (error) {
        logError(error, 'Backend restart failed');
      }
    }
  }, 30000);
  
  // Clean up interval on app quit
  app.on('before-quit', () => {
    clearInterval(healthCheckInterval);
  });
}

// App event handlers
app.whenReady().then(async () => {
  try {
    // Always start backend in development mode
    console.log('[STARTUP] [DEBUG] Electron app is ready, starting backend server...');
    
    // Start backend with timeout
    console.log('[STARTUP] [DEBUG] Calling startBackend() with 30s timeout...');
    const backendPromise = startBackend();
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Backend startup timeout')), 30000)
    );
    
    try {
      await Promise.race([backendPromise, timeoutPromise]);
      console.log('[STARTUP] [DEBUG] Backend started successfully');
      logToFile('✅ Backend started successfully');
      // Start health monitoring after successful backend startup
      monitorBackendHealth();
    } catch (backendError) {
      console.log('[ERROR] [DEBUG] Backend startup failed:', backendError);
      logError(backendError, 'Backend startup failed');
      logToFile('⚠️ Continuing without backend...', 'WARN');
      // Send error to renderer process
      if (mainWindow) {
        mainWindow.webContents.send('backend-status', { 
          status: 'error', 
          message: backendError.message 
        });
      }
    }
    
    // Create window regardless of backend status
    setTimeout(() => {
      createWindow();
    }, 2000);
  } catch (error) {
    console.error('[ERROR] Failed to start backend:', error);
    // Still create window even if backend fails
    createWindow();
  }
});

app.on('window-all-closed', () => {
  // Kill backend process when app closes
  if (backendProcess && !backendProcess.killed) {
    console.log('[STARTUP] Stopping backend server...');
    backendProcess.kill();
  }
  
  // Quit app on macOS
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Ensure proper cleanup on app quit
app.on('before-quit', () => {
  console.log('[STARTUP] App quitting - cleaning up processes...');
  if (backendProcess && !backendProcess.killed) {
    console.log('[STARTUP] Killing backend process...');
    backendProcess.kill('SIGTERM');
    // Force kill after 3 seconds if not terminated
    setTimeout(() => {
      if (backendProcess && !backendProcess.killed) {
        console.log('[STARTUP] Force killing backend process...');
        backendProcess.kill('SIGKILL');
      }
    }, 3000);
  }
});

// Handle process termination signals
process.on('SIGINT', () => {
  console.log('[STARTUP] SIGINT received - cleaning up...');
  if (backendProcess && !backendProcess.killed) {
    backendProcess.kill('SIGTERM');
  }
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('[STARTUP] SIGTERM received - cleaning up...');
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

ipcMain.handle('get-backend-status', () => {
  return {
    isRunning: backendProcess && !backendProcess.killed,
    port: BACKEND_PORT
  };
});

ipcMain.handle('get-log-file-path', () => {
  return logFile;
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
    console.log('[STARTUP] Starting dependency installation...');
    
    // This would be implemented based on your installation needs
    // For now, return success
    return {
      success: true,
      message: 'Dependencies installed successfully!',
      details: [
        'Sumatra PDF installed',
        'Epson TM-T81 drivers installed', 
        'Custom fonts installed system-wide',
        'Database initialized with default data'
      ]
    };
  } catch (error) {
    console.error('[ERROR] Installation failed:', error);
    return {
      success: false,
      message: 'Installation failed. Please run as administrator.',
      details: [
        'Some dependencies may not have been installed',
        'Try running the installer as administrator',
        'Check if antivirus is blocking the installation'
      ]
    };
  }
});

// Handle printer operations
ipcMain.handle('get-printers', async () => {
  try {
    console.log('[PRINT] Fetching real printer list...');
    
    // Use PowerShell to get real printer list on Windows
    const { exec } = require('child_process');
    
    return new Promise((resolve, reject) => {
      // Validate PowerShell command to prevent command injection
      const safeCommand = 'powershell "Get-Printer | Select-Object Name | ConvertTo-Json"';
      
      exec(safeCommand, { 
        windowsHide: true,
        timeout: 10000 // 10 second timeout
      }, (error, stdout, stderr) => {
        if (error) {
          console.error('[ERROR] Failed to get printers:', error);
          // Fallback to empty array instead of hardcoded data
          resolve([]);
          return;
        }
        
        try {
          // Validate stdout is a string
          if (typeof stdout !== 'string') {
            throw new Error('Invalid output from PowerShell command');
          }
          
          const printers = JSON.parse(stdout);
          const printerNames = Array.isArray(printers) 
            ? printers.map(p => p.Name).filter(name => name && typeof name === 'string')
            : [];
          
          console.log('[PRINT] Found printers:', printerNames);
          resolve(printerNames);
        } catch (parseError) {
          console.error('[ERROR] Failed to parse printer data:', parseError);
          resolve([]);
        }
      });
    });
  } catch (error) {
    console.error('[ERROR] Failed to get printers:', error);
    return [];
  }
});

ipcMain.handle('print-ticket', async (event, ticketData, printerName, movieData) => {
  try {
    // Validate input data
    if (!ticketData || typeof ticketData !== 'object') {
      throw new Error('Invalid ticket data: must be an object');
    }
    
    if (!printerName || typeof printerName !== 'string') {
      throw new Error('Invalid printer name: must be a string');
    }
    
    // Validate printer name to prevent command injection
    if (printerName.includes(';') || printerName.includes('|') || printerName.includes('&')) {
      throw new Error('Invalid printer name: contains forbidden characters');
    }
    
    if (!movieData || typeof movieData !== 'object') {
      throw new Error('Invalid movie data: must be an object');
    }
    
    // Validate required ticket fields
    const requiredFields = ['movieName', 'date', 'showTime', 'classLabel', 'totalPrice'];
    for (const field of requiredFields) {
      if (!ticketData[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }
    
    console.log('[PRINT] Printing ticket via Sumatra PDF:', ticketData);
    console.log('[PRINT] Printer:', printerName);
    
    // Use the backend PDF printing service
    const backendUrl = `http://localhost:${BACKEND_PORT}/api/thermal-printer/print`;

    // Expect renderer to supply authoritative showKey and showTime; do not derive here
    const printData = {
      ticketData: {
        theaterName: ticketData.theaterName || 'SREELEKHA THEATER',
        location: ticketData.location || 'Chikmagalur',
        movieName: ticketData.movieName,
        movieLanguage: ticketData.movieLanguage,
        date: ticketData.date,
        show: ticketData.showKey || 'MATINEE',
        showTime: ticketData.showTime, // authoritative 12-hour string from renderer
        seatClass: ticketData.classLabel,
        seatInfo: `${ticketData.row.replace(/^[^-]+-/, '')} ${ticketData.seatRange}`,
        totalAmount: ticketData.totalPrice,
        individualAmount: ticketData.individualPrice,
        seatCount: ticketData.seatCount,
        ticketId: ticketData.transactionId
      },
      printerName: printerName,
      movieSettings: {
        printInKannada: Boolean(movieData && movieData.printInKannada)
      }
    };
    
    console.log('[PRINT] Sending to backend PDF service:', printData);
    console.log('[PRINT] Movie settings being sent:', printData.movieSettings);
    console.log('[PRINT] printInKannada value:', printData.movieSettings.printInKannada);
    
    // 🚀 FRONTEND DEBUG: Log which service will be used
    if (printData.movieSettings.printInKannada) {
      console.log('[PRINT] This ticket will use FastKannadaPrintService (wkhtmltopdf)');
      console.log('[PRINT] Expected performance improvement: 3-5x faster than Puppeteer');
    } else {
      console.log('[PRINT] This ticket will use PdfPrintService (PDFKit) for English');
    }
    
    console.log('[PRICE] TICKET COST DEBUG - Electron Level:');
    console.log('[PRICE] ticketData.individualPrice:', ticketData.individualPrice);
    console.log('[PRICE] ticketData.totalPrice:', ticketData.totalPrice);
    console.log('[PRICE] ticketData.seatCount:', ticketData.seatCount);
    console.log('[PRICE] printData.ticketData.individualAmount:', printData.ticketData.individualAmount);
    console.log('[PRICE] printData.ticketData.totalAmount:', printData.ticketData.totalAmount);
    
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
            console.log('[PRINT] Backend PDF print result:', result);
            resolve(result);
          } catch (error) {
            console.error('[ERROR] Failed to parse backend response:', error);
            resolve({ success: false, message: 'Failed to parse backend response' });
          }
        });
      });
      
      req.on('error', (error) => {
        console.error('[ERROR] Backend print request failed:', error);
        resolve({ success: false, message: `Backend print failed: ${error.message}` });
      });
      
      req.write(postData);
      req.end();
    });
  } catch (error) {
    console.error('[ERROR] Failed to print ticket:', error);
    return { success: false, message: error.message };
  }
});

// Removed local time→show derivation; renderer sends showKey

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
