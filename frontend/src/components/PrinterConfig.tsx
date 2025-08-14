import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, Printer, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import printerService from '@/services/printerService';

interface PrinterInfo {
  name: string;
  port: string;
  type: 'USB' | 'COM' | 'Network';
  connected: boolean;
}

interface PrinterConfig {
  port: string;
  theaterName: string;
  location: string;
  gstin: string;
}

export const PrinterConfig: React.FC = () => {
  const [printers, setPrinters] = useState<PrinterInfo[]>([]);
  const [selectedPrinter, setSelectedPrinter] = useState<PrinterInfo | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [printerStatus, setPrinterStatus] = useState<'connected' | 'disconnected' | 'error' | null>(null);
  const [hasScanned, setHasScanned] = useState(false);
  const [lastScanTime, setLastScanTime] = useState<Date | null>(null);
  const [config, setConfig] = useState({
    port: 'COM1',
    theaterName: 'SREELEKHA THEATER',
    location: 'Chickmagalur',
    gstin: '29AAVFS7423E120'
  });

  useEffect(() => {
    // Only scan if no printer is configured and we haven't scanned yet
    const savedConfig = localStorage.getItem('selectedPrinter');
    if (!savedConfig && !hasScanned) {
      scanForPrinters();
    }
  }, [hasScanned]);

  // Load saved printer configuration
  useEffect(() => {
    try {
      const savedConfig = localStorage.getItem('selectedPrinter');
      if (savedConfig) {
        const parsed = JSON.parse(savedConfig);
        console.log('📋 Loading saved printer configuration:', parsed);
        
        // Update config state
        setConfig(prev => ({
          ...prev,
          theaterName: parsed.theaterName || prev.theaterName,
          location: parsed.location || prev.location,
          gstin: parsed.gstin || prev.gstin
        }));

        // Configure printer service
        printerService.configurePrinter(
          parsed.name,
          parsed.port,
          parsed.theaterName,
          parsed.location,
          parsed.gstin
        );

        // Find and select the saved printer in the detected list
        if (printers.length > 0) {
          const savedPrinter = printers.find(p => 
            p.name === parsed.name && p.port === parsed.port
          );
          if (savedPrinter) {
            setSelectedPrinter(savedPrinter);
            setPrinterStatus('connected');
            console.log('✅ Restored saved printer selection:', savedPrinter);
          }
        }
      }
    } catch (error) {
      console.warn('⚠️ Failed to load saved printer configuration:', error);
    }
  }, [printers]);
  
  const scanForPrinters = async () => {
    setIsScanning(true);
    try {
      // Check if we're running in Tauri - multiple detection methods for Tauri v2
      let isTauri = false;
      
      // Method 1: Try to import Tauri API directly - this will work if we're in Tauri
      try {
        const { core } = await import('@tauri-apps/api');
        if (core && core.invoke) {
          isTauri = true;
          console.log('✅ Tauri detected via direct API import');
        }
      } catch (importError) {
        console.log('❌ Tauri API import failed:', importError);
      }
      
      // Method 2: Check for Tauri global object if direct import failed
      if (!isTauri && typeof window !== 'undefined') {
        // Tauri v2 structure
        if ((window as any).__TAURI__?.tauri !== undefined) {
          isTauri = true;
          console.log('✅ Tauri v2 detected via __TAURI__.tauri');
        }
        // Tauri v1 structure (fallback)
        else if ((window as any).__TAURI__ !== undefined) {
          isTauri = true;
          console.log('✅ Tauri v1 detected via __TAURI__');
        }
        // Check if we're in a desktop environment by other means
        else if ((window as any).navigator?.userAgent?.includes('Tauri')) {
          isTauri = true;
          console.log('✅ Tauri detected via user agent');
        }
        // Check if we're in a desktop environment by checking for desktop-specific APIs
        else if ((window as any).navigator?.platform === 'Win32' && 
                 (window as any).navigator?.userAgent?.includes('Electron') === false &&
                 (window as any).navigator?.userAgent?.includes('Chrome') === false) {
          isTauri = true;
          console.log('✅ Tauri detected via platform detection');
        }
      }
      
      console.log('🔍 Environment check:', { 
        hasWindow: typeof window !== 'undefined',
        hasTauri: (window as any).__TAURI__ !== undefined,
        hasTauriTauri: (window as any).__TAURI__?.tauri !== undefined,
        userAgent: (window as any).navigator?.userAgent,
        platform: (window as any).navigator?.platform,
        isTauri
      });
      
      if (isTauri) {
        console.log('🔍 Scanning for Windows printers in Tauri...');
        try {
          // Import Tauri API - this should work now
          const { core } = await import('@tauri-apps/api');
          console.log('✅ Tauri API imported successfully:', core);
          
          // Use the invoke function from the core module
          const invoke = core.invoke;
          
          if (!invoke) {
            throw new Error('Tauri invoke function not found');
          }
          
          // First, test if Tauri is working with a simple command
          console.log('🧪 Testing Tauri with simple command...');
          try {
            const testResult = await invoke('list_printers');
            console.log('🧪 Test command result:', testResult);
          } catch (testError) {
            console.error('🧪 Test command failed:', testError);
          }
          
          // Test the new test_printers command
          console.log('🧪 Testing test_printers command...');
          try {
            const testPrintersResult = await invoke('test_printers');
            console.log('🧪 Test printers command result:', testPrintersResult);
          } catch (testPrintersError) {
            console.error('🧪 Test printers command failed:', testPrintersError);
          }
          
          // First try to get all printers (Windows approach)
          console.log('🔍 Calling list_all_printers...');
          const allPrinters = await invoke('list_all_printers') as string[];
          console.log('✅ All printers found:', allPrinters);
          
          if (allPrinters.length > 0) {
            // Convert printer strings to PrinterInfo objects
            const printerInfos: PrinterInfo[] = allPrinters.map(printerStr => {
              // Parse printer string like "EPSON TM-T81 ReceiptE4 (USB001)"
              const match = printerStr.match(/^(.+?)\s*\((.+?)\)$/);
              if (match) {
                const name = match[1].trim();
                const port = match[2].trim();
                const type = port.toLowerCase().includes('usb') ? 'USB' as const : 'COM' as const;
                return {
                  name,
                  port,
                  type,
                  connected: true
                };
              } else {
                // Fallback if parsing fails
                return {
                  name: printerStr,
                  port: 'Unknown',
                  type: 'COM' as const,
                  connected: true
                };
              }
            });
            
            setPrinters(printerInfos);
            
            // Auto-select first printer
            if (printerInfos.length > 0) {
              const firstPrinter = printerInfos[0];
              setSelectedPrinter(firstPrinter);
              setConfig(prev => ({ ...prev, port: firstPrinter.port }));
              testPrinterConnection(firstPrinter.port);
            }
          } else {
            // Fallback to individual detection methods
            console.log('🔍 Trying fallback detection methods...');
            
            console.log('🔍 Calling list_usb_printers...');
            const usbPrinters = await invoke('list_usb_printers') as string[];
            console.log('🔍 USB printers result:', usbPrinters);
            
            console.log('🔍 Calling list_com_printers...');
            const comPrinters = await invoke('list_com_printers') as string[];
            console.log('🔍 COM printers result:', comPrinters);
            
            const allPrinters: PrinterInfo[] = [
              ...usbPrinters.map(port => ({
                name: `USB Printer (${port})`,
                port,
                type: 'USB' as const,
                connected: true
              })),
              ...comPrinters.map(port => ({
                name: `COM Printer (${port})`,
                port,
                type: 'COM' as const,
                connected: true
              }))
            ];
            
            console.log('✅ Fallback printer detection:', allPrinters);
            setPrinters(allPrinters);
            
            if (allPrinters.length > 0) {
              const usbPrinter = allPrinters.find(p => p.type === 'USB');
              const firstPrinter = usbPrinter || allPrinters[0];
              setSelectedPrinter(firstPrinter);
              setConfig(prev => ({ ...prev, port: firstPrinter.port }));
              testPrinterConnection(firstPrinter.port);
            }
          }
        } catch (tauriError) {
          console.error('❌ Tauri printer scan failed:', tauriError);
          // Fallback to default COM ports
          const fallbackPrinters: PrinterInfo[] = [
            { name: 'COM1', port: 'COM1', type: 'COM', connected: false },
            { name: 'COM2', port: 'COM2', type: 'COM', connected: false },
            { name: 'COM3', port: 'COM3', type: 'COM', connected: false }
          ];
          setPrinters(fallbackPrinters);
        }
      } else {
        console.log('🔍 Browser environment - using default printers');
        const defaultPrinters: PrinterInfo[] = [
          { name: 'COM1', port: 'COM1', type: 'COM', connected: false },
          { name: 'COM2', port: 'COM2', type: 'COM', connected: false }
        ];
        setPrinters(defaultPrinters);
      }
      setHasScanned(true);
      setLastScanTime(new Date());
    } catch (error) {
      console.error('Failed to scan printers:', error);
      setPrinters([]);
      setHasScanned(true);
      setLastScanTime(new Date());
    } finally {
      setIsScanning(false);
    }
  };

  const testPrinterConnection = async (port: string) => {
    try {
      printerService.configurePrinter(selectedPrinter?.name || 'EPSON TM-T81 ReceiptE4', port, config.theaterName, config.location, config.gstin);
      const status = await printerService.getPrinterStatus();
      
      if (status.connected) {
        setPrinterStatus('connected');
        console.log('✅ Printer connected successfully');
      } else {
        setPrinterStatus('disconnected');
        console.log('❌ Printer not connected');
      }
    } catch (error) {
      setPrinterStatus('error');
      console.error('❌ Printer connection test failed:', error);
    }
  };

  const handlePrinterSelect = (printer: PrinterInfo) => {
    setSelectedPrinter(printer);
    setConfig(prev => ({ ...prev, port: printer.port }));
    testPrinterConnection(printer.port);
  };

  const handleConfigurePrinter = () => {
    if (!selectedPrinter) {
      console.warn('⚠️ No printer selected for configuration');
      return;
    }

    try {
      // Configure the printer service with the selected printer
      printerService.configurePrinter(
        selectedPrinter.name,
        selectedPrinter.port,
        config.theaterName,
        config.location,
        config.gstin
      );

      console.log('✅ Printer configured successfully:', {
        name: selectedPrinter.name,
        port: selectedPrinter.port,
        theaterName: config.theaterName,
        location: config.location,
        gstin: config.gstin
      });

      // Show success feedback
      setPrinterStatus('connected');
      toast.success('Printer configured successfully!');
      
      // You could also save to localStorage or backend here
      localStorage.setItem('selectedPrinter', JSON.stringify({
        name: selectedPrinter.name,
        port: selectedPrinter.port,
        theaterName: config.theaterName,
        location: config.location,
        gstin: config.gstin
      }));

    } catch (error) {
      console.error('❌ Failed to configure printer:', error);
      setPrinterStatus('error');
      toast.error('Failed to configure printer.');
    }
  };

  const printTestTicket = async () => {
    if (!selectedPrinter) return;
    
    setIsPrinting(true);
    try {
      printerService.configurePrinter(
        selectedPrinter.name,
        selectedPrinter.port,
        config.theaterName,
        config.location,
        config.gstin
      );

      const currentDate = new Date().toISOString().split('T')[0];
      const currentTime = new Date().toLocaleTimeString('en-US', { 
        hour12: true, 
        hour: '2-digit', 
        minute: '2-digit' 
      });

      const testTicket = printerService.formatTicketData(
        'A1',
        'A',
        1,
        'STAR',
        150,
        currentDate,
        currentTime,
        'Test Movie'
      );

      const success = await printerService.printTicket(testTicket);
      if (success) {
        console.log('✅ Test ticket printed successfully');
      } else {
        console.error('❌ Failed to print test ticket');
      }
    } catch (error) {
      console.error('❌ Test ticket printing error:', error);
    } finally {
      setIsPrinting(false);
    }
  };

  const updateConfig = (field: keyof PrinterConfig, value: string) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  const getStatusIcon = () => {
    switch (printerStatus) {
      case 'connected':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'disconnected':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusText = () => {
    switch (printerStatus) {
      case 'connected':
        return selectedPrinter ? `${selectedPrinter.name} - Connected` : 'Connected';
      case 'disconnected':
        return 'Not Connected';
      case 'error':
        return 'Connection Error';
      default:
        return selectedPrinter ? 'Ready to Configure' : 'No Printer Selected';
    }
  };

  const handleRefreshPrinters = () => {
    setHasScanned(false);
    scanForPrinters();
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🖨️ Printer Setup
          {printerStatus && (
            <Badge variant={printerStatus === 'connected' ? "default" : "destructive"}>
              {getStatusText()}
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Automatic printer detection and configuration
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Printer Detection */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Detected Printers</Label>
            {lastScanTime && (
              <p className="text-xs text-gray-500 mt-1">
                Last updated: {lastScanTime.toLocaleTimeString()}
              </p>
            )}
            <div className="flex gap-2">
              {selectedPrinter && (
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Configured
                </Badge>
              )}
              <Button
                onClick={scanForPrinters}
                disabled={isScanning}
                size="sm"
                variant="outline"
              >
                {isScanning ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Scanning...
                  </>
                ) : (
                  <>
                    <Printer className="w-4 h-4 mr-2" />
                    Scan
                  </>
                )}
              </Button>
            </div>
          </div>
          
          {printers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {selectedPrinter ? (
                <div>
                  <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-500" />
                  <p className="font-medium text-gray-700">Printer Already Configured</p>
                  <p className="text-sm">Your EPSON TM-T81 is ready to use</p>
                  <Button
                    onClick={handleRefreshPrinters}
                    variant="outline"
                    size="sm"
                    className="mt-3"
                  >
                    Refresh Printer List
                  </Button>
                </div>
              ) : (
                <div>
                  <Printer className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                  <p>No printers found. Click Scan to search for USB and COM printers.</p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {printers.map((printer) => (
                <div
                  key={printer.port}
                  onClick={() => handlePrinterSelect(printer)}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedPrinter?.name === printer.name && selectedPrinter?.port === printer.port
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{printer.name}</div>
                      <div className="text-sm text-gray-500">{printer.port}</div>
                    </div>
                    <Badge variant="outline">{printer.type}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Configure Button */}
        {selectedPrinter && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-blue-900">
                  Selected Printer: {selectedPrinter.name}
                </h4>
                <p className="text-xs text-blue-700 mt-1">
                  Port: {selectedPrinter.port} | Type: {selectedPrinter.type}
                </p>
                {printerStatus === 'connected' && (
                  <Badge variant="secondary" className="mt-2 bg-green-100 text-green-800">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Configured
                  </Badge>
                )}
              </div>
              <button
                onClick={handleConfigurePrinter}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
              >
                Configure Printer
              </button>
            </div>
          </div>
        )}

        {/* Theater Information */}
        <div className="space-y-3">
          <Label>Theater Information</Label>
          <div>
            <Input
              value={config.theaterName}
              onChange={(e) => updateConfig('theaterName', e.target.value)}
              placeholder="Theater Name"
              className="mb-2"
            />
            <Input
              value={config.location}
              onChange={(e) => updateConfig('location', e.target.value)}
              placeholder="Location"
              className="mb-2"
            />
            <Input
              value={config.gstin}
              onChange={(e) => updateConfig('gstin', e.target.value)}
              placeholder="GSTIN"
            />
          </div>
        </div>

        {/* Status and Test */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <span className="text-sm">
              {selectedPrinter ? `${selectedPrinter.name} - ${getStatusText()}` : 'No printer selected'}
            </span>
          </div>
          
          <Button 
            onClick={printTestTicket} 
            disabled={isPrinting || !selectedPrinter || printerStatus !== 'connected'}
            className="w-full"
          >
            {isPrinting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Printing Test Ticket...
              </>
            ) : (
              <>
                <Printer className="w-4 h-4 mr-2" />
                Print Test Ticket
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default PrinterConfig;