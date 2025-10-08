import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
      console.log('✅ Loaded printers:', printers);
      console.log('🔍 Current config name:', config.name);
      
    } catch (error) {
      console.error('❌ Error loading printers:', error);
      
      // No fallback - return empty array
      setAvailablePrinters([]);
      console.log('❌ No printers available - backend may not be running');
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
    <div className="max-w-2xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Printer Configuration</CardTitle>
          <CardDescription>
            Configure your printer settings for ticket printing
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {message && (
            <Alert className={message.type === 'success' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
              <AlertDescription className={message.type === 'success' ? 'text-green-800' : 'text-red-800'}>
                {message.text}
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            <div>
              <Label htmlFor="printerName">Printer Name</Label>
              <Select 
                value={config.name} 
                onValueChange={(value) => {
                  console.log('🖨️ Selected printer:', value);
                  setConfig({ ...config, name: value });
                }}
              >
                <SelectTrigger>
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
              <Label htmlFor="theaterName">Theater Name</Label>
              <Input
                id="theaterName"
                type="text"
                value={config.theaterName}
                onChange={(e) => setConfig({ ...config, theaterName: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                type="text"
                value={config.location}
                onChange={(e) => setConfig({ ...config, location: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="gstin">GSTIN (Optional)</Label>
              <Input
                id="gstin"
                type="text"
                value={config.gstin}
                onChange={(e) => setConfig({ ...config, gstin: e.target.value })}
              />
            </div>
          </div>

          <div className="flex gap-4">
            <Button onClick={handleSave} className="flex-1">
              Save Configuration
            </Button>
            <Button onClick={handleTestPrint} disabled={isLoading} variant="outline" className="flex-1">
              {isLoading ? 'Printing...' : 'Test Print'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}