// Type definitions for Tauri global objects

interface Window {
  __TAURI__?: {
    invoke: (cmd: string, args?: any) => Promise<any>;
    // Add other Tauri API methods as needed
  };
}