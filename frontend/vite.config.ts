import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    base: './',
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
    },
    // Build configuration
    build: {
      outDir: 'dist',
      sourcemap: mode === 'development',
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: mode === 'production',
          drop_debugger: mode === 'production',
        },
      } as any,
      rollupOptions: {
        output: {
          manualChunks: {
            // Core React libraries
            'react-vendor': ['react', 'react-dom'],
            
            // UI Libraries
            'radix-ui': [
              '@radix-ui/react-dialog',
              '@radix-ui/react-popover', 
              '@radix-ui/react-select',
              '@radix-ui/react-separator',
              '@radix-ui/react-slot',
              '@radix-ui/react-switch',
              '@radix-ui/react-tabs',
              '@radix-ui/react-label'
            ],
            
            // Form libraries
            'forms': ['react-hook-form', '@hookform/resolvers'],
            
            // Date libraries
            'date': ['date-fns', 'react-datepicker', 'react-day-picker'],
            
            // Charts and visualization
            'charts': ['recharts'],
            
            // State management
            'state': ['zustand', '@tanstack/react-query'],
            
            // Utilities
            'utils': ['clsx', 'tailwind-merge', 'class-variance-authority'],
            
            // Icons
            'icons': ['lucide-react'],
            
            // Router
            'router': ['react-router-dom'],
            
            // Other heavy libraries
            'heavy': ['@react-thermal-printer/image', 'embla-carousel-react', '@dnd-kit/core']
          },
        },
      },
    },

  };
});
