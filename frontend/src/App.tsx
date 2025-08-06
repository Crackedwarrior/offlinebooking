import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { useEffect } from "react";
import desktopApi from "./services/desktopApi";

const queryClient = new QueryClient();

const App = () => {
  useEffect(() => {
    // Initialize desktop API if running in Tauri
    const initDesktopApi = async () => {
      try {
        // Check if we're running in Tauri
        if (window.__TAURI__) {
          console.log('Running in Tauri environment');
          
          // Check if backend is running, start if not
          const isBackendRunning = await desktopApi.checkBackendHealth();
          if (!isBackendRunning) {
            await desktopApi.startBackend();
          }
        }
      } catch (error) {
        console.error('Failed to initialize desktop API:', error);
      }
    };

    initDesktopApi();
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
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
