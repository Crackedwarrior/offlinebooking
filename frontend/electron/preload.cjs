const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // App information
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getAppName: () => ipcRenderer.invoke('get-app-name'),
  closeApp: () => ipcRenderer.invoke('close-app'),
  
  // Backend status
  getBackendStatus: () => ipcRenderer.invoke('get-backend-status'),
  getLogFilePath: () => ipcRenderer.invoke('get-log-file-path'),
  
  // External links
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  
  // Installation
  installDependencies: () => ipcRenderer.invoke('install-dependencies'),
  
  // Printer operations
  getPrinters: () => ipcRenderer.invoke('get-printers'),
  printTicket: (ticketData, printerName, movieData) => ipcRenderer.invoke('print-ticket', ticketData, printerName, movieData),
  
  // Check if running in Electron
  isElectron: true,
  
  // Platform information
  platform: process.platform,
  
  // Environment
  isDev: process.env.NODE_ENV === 'development',
  isProd: process.env.NODE_ENV === 'production'
});

// Handle installation progress events
ipcRenderer.on('installation-progress', (event, data) => {
  // Dispatch custom event to the renderer
  window.dispatchEvent(new CustomEvent('installation-progress', { detail: data }));
});

// Handle printer events
ipcRenderer.on('printer-event', (event, data) => {
  window.dispatchEvent(new CustomEvent('printer-event', { detail: data }));
});

// Handle backend events
ipcRenderer.on('backend-event', (event, data) => {
  window.dispatchEvent(new CustomEvent('backend-event', { detail: data }));
});

// Handle backend status updates
ipcRenderer.on('backend-status', (event, data) => {
  window.dispatchEvent(new CustomEvent('backend-status', { detail: data }));
});
