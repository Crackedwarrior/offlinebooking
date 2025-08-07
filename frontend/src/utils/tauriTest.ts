// Test file for Tauri imports

// Try importing from the root package
import { invoke } from '@tauri-apps/api/tauri';
import { open } from '@tauri-apps/api/shell';

// Export a simple function to test if imports work
export const testTauriImports = () => {
  console.log('Testing Tauri imports');
  console.log('invoke:', typeof invoke);
  console.log('open:', typeof open);
  return { invoke, open };
};

export default testTauriImports;