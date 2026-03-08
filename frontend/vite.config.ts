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
      fs: {
        strict: false,
      },
    },
    plugins: [
      react()
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
      extensions: ['.mjs', '.js', '.mts', '.ts', '.jsx', '.tsx', '.json'],
    },
    optimizeDeps: {
      include: ['react', 'react-dom'],
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
          manualChunks: (id) => {
            // React + Radix must stay together to avoid "forwardRef undefined" (multiple React instances)
            if (id.includes('node_modules/react') || id.includes('node_modules/react-dom') || id.includes('node_modules/@radix-ui')) {
              return 'react-vendor';
            }
            
            // Form libraries
            if (id.includes('node_modules/react-hook-form') || id.includes('node_modules/@hookform')) {
              return 'forms';
            }
            
            // Date libraries
            if (id.includes('node_modules/date-fns') || id.includes('node_modules/react-datepicker') || id.includes('node_modules/react-day-picker')) {
              return 'date';
            }
            
            // Charts and visualization
            if (id.includes('node_modules/recharts')) {
              return 'charts';
            }
            
            // State management
            if (id.includes('node_modules/zustand') || id.includes('node_modules/@tanstack/react-query')) {
              return 'state';
            }
            
            // Utilities
            if (id.includes('node_modules/clsx') || id.includes('node_modules/tailwind-merge') || id.includes('node_modules/class-variance-authority')) {
              return 'utils';
            }
            
            // Icons
            if (id.includes('node_modules/lucide-react')) {
              return 'icons';
            }
            
            // Router
            if (id.includes('node_modules/react-router-dom')) {
              return 'router';
            }
            
            // Other heavy libraries
            if (id.includes('node_modules/@react-thermal-printer') || id.includes('node_modules/embla-carousel') || id.includes('node_modules/@dnd-kit')) {
              return 'heavy';
            }
            
            // Feature-based code splitting for lazy-loaded components
            if (id.includes('/components/SeatGrid') || id.includes('/components/SeatGrid')) {
              return 'feature-seatgrid';
            }
            
            if (id.includes('/pages/Checkout') || id.includes('/components/Checkout')) {
              return 'feature-checkout';
            }
            
            if (id.includes('/components/BookingHistory')) {
              return 'feature-history';
            }
            
            if (id.includes('/components/BoxVsOnlineReport')) {
              return 'feature-reports';
            }
            
            if (id.includes('/components/Settings')) {
              return 'feature-settings';
            }
            
            // Hooks chunk
            if (id.includes('/hooks/')) {
              return 'hooks';
            }
            
            // Store chunk
            if (id.includes('/store/')) {
              return 'store';
            }
          },
        },
      },
    },

  };
});
