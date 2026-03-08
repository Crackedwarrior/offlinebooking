import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Printer } from 'lucide-react';
import { PrinterConfig } from '@/services/printerService';
import { PrinterService } from '@/services/printerService';
import { ElectronPrinterService } from '@/services/electronPrinterService';
import { getTheaterConfig } from '@/config/theaterConfig';

export default function PrinterConfig() {
  const [config, setConfig] = useState<PrinterConfig>({
    name: '',
    port: '',
    theaterName: getTheaterConfig().name,
    location: getTheaterConfig().location,
    gstin: '',
    printerType: 'backend'
  });
  const [availablePrinters, setAvailablePrinters] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadConfig();
    loadAvailablePrinters();
  }, []);

  const loadConfig = () => {
    const printerInstance = PrinterService.getInstance();
    const savedConfig = printerInstance.getPrinterConfig();
    if (savedConfig) {
      setConfig(savedConfig);
    }
  };

  const loadAvailablePrinters = async () => {
    try {
      setIsLoading(true);
      
      // Use Electron printer service
      const electronPrinterService = ElectronPrinterService.getInstance();
      let printers = await electronPrinterService.getAllPrinters();
      
      if (printers.length === 0) {
        // No printers found - return empty array
        printers = [];
      }
      
      setAvailablePrinters(printers);
      console.log('[PRINT] Loaded printers:', printers);
      console.log('[PRINT] Current config name:', config.name);
      
    } catch (error) {
      console.error('[ERROR] Error loading printers:', error);
      
      // No fallback - return empty array
      setAvailablePrinters([]);
      console.log('[WARN] No printers available - backend may not be running');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = () => {
    try {
      const printerInstance = PrinterService.getInstance();
      printerInstance.setPrinterConfig(config);
      setMessage({ type: 'success', text: 'Printer configuration saved successfully!' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save printer configuration' });
    }
  };

  const handleTestPrint = async () => {
    setIsLoading(true);
    try {
      // Use Electron printer service
      const electronPrinterService = ElectronPrinterService.getInstance();
      electronPrinterService.setPrinterConfig(config);
      
      const success = await electronPrinterService.testPrinter(config.name);
      
      if (success) {
        setMessage({ type: 'success', text: 'Test print completed successfully!' });
      } else {
        setMessage({ type: 'error', text: 'Test print failed via Electron' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Test print failed: ' + (error as Error).message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-full w-full flex flex-col min-h-0">
      <Card className="flex-1 min-h-0 flex flex-col bg-white border-0 shadow-lg relative overflow-hidden w-full h-full rounded-none">
        <CardHeader className="flex-shrink-0 p-0">
          <div className="rounded-none bg-gradient-to-r from-gray-700 via-slate-700 to-gray-800 text-white p-5 shadow-lg border-b border-gray-800">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-white/20 rounded-lg backdrop-blur-sm flex-shrink-0">
                <Printer className="w-5 h-5 text-white" />
              </div>
              <div className="flex flex-col gap-1">
                <p className="text-lg font-bold text-white uppercase tracking-[0.15em] mb-1" style={{ fontFamily: 'system-ui, -apple-system, sans-serif', letterSpacing: '0.15em' }}>
                  PRINTER CONFIGURATION
                </p>
                <p className="text-sm text-gray-300 font-normal leading-tight">
                  Configure thermal printer settings, test printer connections, select printer type (USB, Network, or PDF), and customize ticket printing options
                </p>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-1 min-h-0 flex flex-col px-0 py-0 overflow-hidden">
          <div className="flex flex-col min-h-0 w-full h-full">
            <div className="w-full px-6 pt-4 space-y-4">
              {message && (
                <Alert className={`text-sm ${message.type === 'success' ? 'border-green-200 bg-green-50 text-green-800' : 'border-red-200 bg-red-50 text-red-800'}`}>
                  <AlertDescription>
                    {message.text}
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-4">
                <div>
                  <Label htmlFor="printerName" className="text-sm font-medium text-gray-700">Printer Name</Label>
                  <Select 
                    value={config.name} 
                    onValueChange={(value) => {
                      console.log('[PRINT] Selected printer:', value);
                      setConfig({ ...config, name: value });
                    }}
                  >
                    <SelectTrigger className="h-10 text-sm border-gray-300 focus:border-gray-500 focus:ring-gray-500 mt-1">
                      <SelectValue placeholder="Select a printer" />
                    </SelectTrigger>
                    <SelectContent>
                      {availablePrinters.map((printer) => (
                        <SelectItem key={printer} value={printer}>
                          {printer}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="theaterName" className="text-sm font-medium text-gray-700">Theater Name</Label>
                  <Input
                    id="theaterName"
                    type="text"
                    value={config.theaterName}
                    onChange={(e) => setConfig({ ...config, theaterName: e.target.value })}
                    className="h-10 text-sm border-gray-300 focus:border-gray-500 focus:ring-gray-500 mt-1"
                    placeholder="Enter theater name"
                  />
                </div>

                <div>
                  <Label htmlFor="location" className="text-sm font-medium text-gray-700">Location</Label>
                  <Input
                    id="location"
                    type="text"
                    value={config.location}
                    onChange={(e) => setConfig({ ...config, location: e.target.value })}
                    className="h-10 text-sm border-gray-300 focus:border-gray-500 focus:ring-gray-500 mt-1"
                    placeholder="Enter location"
                  />
                </div>

                <div>
                  <Label htmlFor="gstin" className="text-sm font-medium text-gray-700">GSTIN (Optional)</Label>
                  <Input
                    id="gstin"
                    type="text"
                    value={config.gstin}
                    onChange={(e) => setConfig({ ...config, gstin: e.target.value })}
                    className="h-10 text-sm border-gray-300 focus:border-gray-500 focus:ring-gray-500 mt-1"
                    placeholder="Enter GSTIN"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button onClick={handleSave} className="flex-1 h-10 text-sm bg-gradient-to-r from-gray-700 to-slate-700 hover:from-gray-800 hover:to-slate-800 text-white">
                  Save Configuration
                </Button>
                <Button onClick={handleTestPrint} disabled={isLoading} variant="outline" className="flex-1 h-10 text-sm border-gray-300">
                  {isLoading ? 'Printing...' : 'Test Print'}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}