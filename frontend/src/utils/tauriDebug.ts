// Debug utility to test Tauri API access
export async function testTauriAccess() {
  console.log('🧪 Testing Tauri API access...');
  
  // Check if we're in Tauri environment
  if (typeof window !== 'undefined' && (window as any).__TAURI__) {
    console.log('✅ Tauri environment detected');
    console.log('🔍 window.__TAURI__:', (window as any).__TAURI__);
    
    // Test if invoke is available
    if ((window as any).__TAURI__.invoke) {
      console.log('✅ Tauri invoke is available');
      
      // Test a simple command
      try {
        console.log('🔍 Testing test_printers command...');
        const result = await (window as any).__TAURI__.invoke('test_printers');
        console.log('✅ test_printers result:', result);
        return { success: true, result };
      } catch (error) {
        console.log('❌ test_printers failed:', error);
        return { success: false, error };
      }
    } else {
      console.log('❌ Tauri invoke is not available');
      return { success: false, reason: 'invoke not available' };
    }
  } else {
    console.log('❌ Not in Tauri environment');
    return { success: false, reason: 'not in Tauri environment' };
  }
}

// Add to window for manual testing
if (typeof window !== 'undefined') {
  (window as any).testTauriAccess = testTauriAccess;
  console.log('🧪 Test function added: testTauriAccess()');
}
