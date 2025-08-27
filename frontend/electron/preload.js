import { contextBridge, ipcRenderer } from 'electron';
import { fileURLToPath } from 'url';
import path from 'path';

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // App information
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getAppName: () => ipcRenderer.invoke('get-app-name'),
  
  // External links
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  
  // Installation
  installDependencies: () => ipcRenderer.invoke('install-dependencies'),
  
  // Printer operations
  getPrinters: () => ipcRenderer.invoke('get-printers'),
  printTicket: (ticketData, printerName) => ipcRenderer.invoke('print-ticket', ticketData, printerName),
  
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
