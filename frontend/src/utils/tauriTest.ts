// Test file for Tauri imports

let invoke: any = () => { throw new Error('Tauri not available'); };
let open: any = () => { throw new Error('Tauri not available'); };

try {
  // Dynamically require only if available
  // @ts-ignore
  invoke = require('@tauri-apps/api/tauri').invoke;
  // @ts-ignore
  open = require('@tauri-apps/api/shell').open;
} catch (e) {
  // Not running in Tauri environment, use mocks
}

export const testTauriImports = () => {
  console.log('Testing Tauri imports');
  console.log('invoke:', typeof invoke);
  console.log('open:', typeof open);
  return { invoke, open };
};

export default testTauriImports;