import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { useEffect, useState } from "react";
import desktopApi from "./services/desktopApi";
import AuthPage from "./components/AuthPage";
import { AUTH_CONFIG } from "./config/auth";

const queryClient = new QueryClient();

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Initialize desktop API if running in Tauri
    const initDesktopApi = async () => {
      try {
        // Check if we're running in Tauri
        if (typeof window !== 'undefined' && (window as any).__TAURI__) {
          console.log('Running in Tauri environment');
          
          // Check if backend is running, start if not
          const isBackendRunning = await desktopApi.checkBackendHealth();
          if (!isBackendRunning) {
            await desktopApi.startBackend();
          }
        } else {
          console.log('Running in browser environment');
        }
      } catch (error) {
        console.error('Failed to initialize desktop API:', error);
      }
    };

    initDesktopApi();
  }, []);

  // Session timeout effect
  useEffect(() => {
    if (!isAuthenticated || !AUTH_CONFIG.AUTO_LOGOUT) return;

    const sessionTimeout = setTimeout(() => {
      console.log('Session expired, logging out...');
      setIsAuthenticated(false);
    }, AUTH_CONFIG.SESSION_TIMEOUT);

    // Reset timeout on user activity
    const resetTimeout = () => {
      clearTimeout(sessionTimeout);
      setTimeout(() => {
        console.log('Session expired, logging out...');
        setIsAuthenticated(false);
      }, AUTH_CONFIG.SESSION_TIMEOUT);
    };

    // Listen for user activity
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => {
      document.addEventListener(event, resetTimeout, true);
    });

    return () => {
      clearTimeout(sessionTimeout);
      events.forEach(event => {
        document.removeEventListener(event, resetTimeout, true);
      });
    };
  }, [isAuthenticated]);

  const handleAuthSuccess = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
  };

  // Show authentication page if not authenticated
  if (!isAuthenticated) {
    return (
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <AuthPage onAuthSuccess={handleAuthSuccess} />
          </TooltipProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index onLogout={handleLogout} />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
