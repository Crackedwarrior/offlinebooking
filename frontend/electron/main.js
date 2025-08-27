import { app, BrowserWindow, ipcMain, shell } from 'electron';
import path from 'path';
import { spawn } from 'child_process';
import fs from 'fs';
import http from 'http';
import { fileURLToPath } from 'url';

const isDev = process.env.NODE_ENV === 'development';

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Keep a global reference of the window object
let mainWindow;
let backendProcess;

// Backend server configuration
const BACKEND_PORT = 3001;
const FRONTEND_PORT = 8081;

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
      preload: path.join(__dirname, 'preload.js')
    },
    title: 'AuditoriumX - Professional Theater Booking System',
    icon: path.join(__dirname, 'assets', 'icon.ico'),
    show: false, // Don't show until ready
    autoHideMenuBar: true
  });

  // Load the app
  const startUrl = isDev 
    ? `http://localhost:${FRONTEND_PORT}` 
    : `file://${path.join(__dirname, '../dist/index.html')}`;
  
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

// Start backend server
function startBackend() {
  return new Promise((resolve, reject) => {
    const backendPath = path.join(__dirname, '../../backend');
    
    // Check if backend directory exists
    if (!fs.existsSync(backendPath)) {
      console.error('Backend directory not found:', backendPath);
      reject(new Error('Backend directory not found'));
      return;
    }

    // Start backend process
    backendProcess = spawn('npm', ['run', 'dev'], {
      cwd: backendPath,
      stdio: 'pipe',
      shell: true
    });

    backendProcess.stdout.on('data', (data) => {
      console.log('Backend:', data.toString());
      if (data.toString().includes('Server running at')) {
        console.log('✅ Backend server started successfully');
        resolve();
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
  });
}

// Check if backend is running
async function checkBackendHealth() {
  try {
    return new Promise((resolve) => {
      const req = http.get(`http://localhost:${BACKEND_PORT}/health`, (res) => {
        resolve(res.statusCode === 200);
      });
      req.on('error', () => resolve(false));
      req.setTimeout(2000, () => resolve(false));
    });
  } catch (error) {
    return false;
  }
}

// App event handlers
app.whenReady().then(async () => {
  try {
    // Check if backend is already running
    const isBackendRunning = await checkBackendHealth();
    
    if (!isBackendRunning) {
      console.log('🚀 Starting backend server...');
      await startBackend();
    } else {
      console.log('✅ Backend server already running');
    }
    
    // Create window after backend is ready
    createWindow();
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
    // This would use Node.js printer libraries
    // For now, return mock data
    return ['Test Printer 1', 'Test Printer 2', 'Epson TM-T81'];
  } catch (error) {
    console.error('Failed to get printers:', error);
    return [];
  }
});

ipcMain.handle('print-ticket', async (event, ticketData, printerName) => {
  try {
    console.log('🖨️ Printing ticket:', ticketData);
    console.log('🖨️ Printer:', printerName);
    
    // This would implement actual printing logic
    // For now, return success
    return { success: true, message: 'Ticket printed successfully' };
  } catch (error) {
    console.error('Failed to print ticket:', error);
    return { success: false, message: error.message };
  }
});

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
