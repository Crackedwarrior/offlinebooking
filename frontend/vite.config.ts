import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    server: {
      host: env.VITE_HOST || "::",
      port: parseInt(env.VITE_PORT || '8080'),
      strictPort: true,
      open: false, // Always prevent browser from opening automatically
      watch: {
        usePolling: true,
        interval: 100,
      },
    },
    plugins: [
      react()
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    // Environment variable configuration
    define: {
      __APP_VERSION__: JSON.stringify(env.VITE_APP_VERSION || '1.0.0'),
      __APP_NAME__: JSON.stringify(env.VITE_APP_NAME || 'Offline Booking System'),
      // Add Tauri global
      __TAURI__: JSON.stringify({}),
    },
    // Build configuration
    build: {
      outDir: 'dist',
      sourcemap: mode === 'development',
      rollupOptions: {
        external: ['@tauri-apps/api/tauri'],
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom'],
            ui: ['@radix-ui/react-dialog', '@radix-ui/react-popover'],
          },
        },
      },
    },
    // Development configuration
    optimizeDeps: {
      exclude: ['@tauri-apps/api/tauri']
    },
  };
});
