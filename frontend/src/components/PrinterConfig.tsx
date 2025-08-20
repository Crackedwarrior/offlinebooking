import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PrinterConfig } from '@/services/printerService';
import { PrinterService } from '@/services/printerService';
import { TauriPrinterService } from '@/services/tauriPrinterService';

export default function PrinterConfig() {
  const [config, setConfig] = useState<PrinterConfig>({
    name: '',
    port: '',
    theaterName: 'SREELEKHA THEATER',
    location: 'Chickmagalur',
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
      
      // Use Tauri printer service to get all printers
      const tauriPrinterService = TauriPrinterService.getInstance();
      
      // Try to get all printers first
      let printers = await tauriPrinterService.getAllPrinters();
      
      if (printers.length === 0) {
        // Fallback to USB printers
        printers = await tauriPrinterService.getUsbPrinters();
      }
      
      if (printers.length === 0) {
        // Fallback to test printers for development
        printers = await tauriPrinterService.getTestPrinters();
      }
      
      if (printers.length === 0) {
        // Final fallback to hardcoded list
        printers = [
          'EPSON TM-T81 ReceiptE4',
          'EPSON TM-T81 Receipt',
          'EPSON TM-T20',
          'EPSON TM-T88VI',
          'Star TSP100',
          'Citizen CT-S310II',
          'Microsoft Print to PDF'
        ];
      }
      
      setAvailablePrinters(printers);
      console.log('✅ Loaded printers:', printers);
      console.log('🔍 Current config name:', config.name);
      
    } catch (error) {
      console.error('❌ Error loading printers:', error);
      
      // Fallback to hardcoded list
      const fallbackPrinters = [
        'EPSON TM-T81 ReceiptE4',
        'EPSON TM-T81 Receipt',
        'EPSON TM-T20',
        'EPSON TM-T88VI',
        'Star TSP100',
        'Citizen CT-S310II',
        'Microsoft Print to PDF'
      ];
      setAvailablePrinters(fallbackPrinters);
      console.log('✅ Using fallback printer list:', fallbackPrinters);
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
      const tauriPrinterService = TauriPrinterService.getInstance();
      
      const testTicket: any = {
        theaterName: config.theaterName,
        location: config.location,
        date: new Date().toLocaleDateString(),
        showTime: '2:00 PM',
        movieName: 'TEST MOVIE',
        class: 'TEST CLASS',
        seatId: 'A1',
        netAmount: 100,
        cgst: 9,
        sgst: 9,
        mc: 0,
        price: 118,
        transactionId: 'TEST123'
      };

      // Format ticket for thermal printer
      const formattedTicket = tauriPrinterService.formatTicketForThermal(testTicket);
      
      // Print using Tauri
      const success = await tauriPrinterService.printTicket(formattedTicket, config.name);
      
      if (success) {
        setMessage({ type: 'success', text: 'Test print completed successfully!' });
      } else {
        setMessage({ type: 'error', text: 'Test print failed via Tauri' });
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