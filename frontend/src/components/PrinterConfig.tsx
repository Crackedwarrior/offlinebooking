import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import printerService from '@/services/printerService';

interface PrinterStatus {
  connected: boolean;
  ready: boolean;
  paperStatus: string;
  errorStatus: string;
}

interface PrinterConfig {
  port: string;
  theaterName: string;
  location: string;
  gstin: string;
}

export const PrinterConfig: React.FC = () => {
  const [printerStatus, setPrinterStatus] = useState<PrinterStatus | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isRefreshingPrinters, setIsRefreshingPrinters] = useState(false);
  const [printers, setPrinters] = useState<string[]>([]);
  const [selectedPrinter, setSelectedPrinter] = useState<string>('COM1');
  const [useManualPort, setUseManualPort] = useState(false);
  const [config, setConfig] = useState({
    port: 'COM1',
    theaterName: 'SREELEKHA THEATER',
    location: 'Chickmagalur',
    gstin: '29AAVFS7423E120'
  });

  useEffect(() => {
    fetchPrinters();
    checkPrinterStatus();
  }, []);
  
  // Set the selected printer when printers are loaded
  useEffect(() => {
    if (printers.length > 0 && !selectedPrinter) {
      setSelectedPrinter(printers[0]);
      setConfig(prev => ({ ...prev, port: printers[0] }));
    } else if (printers.length === 0 && !useManualPort) {
      // If no printers are detected, automatically switch to manual mode
      setUseManualPort(true);
      setSelectedPrinter('__manual__');
      console.log('No printers detected, switching to manual port input mode');
    }
  }, [printers, selectedPrinter, useManualPort]);

  const fetchPrinters = async () => {
    setIsRefreshingPrinters(true);
    try {
      // Check if we're running in Tauri
      const isTauri = window.__TAURI__ !== undefined;
      
      if (isTauri) {
        console.log('🔍 Using Tauri API to fetch printers');
        try {
          // Use Tauri command to get printers
          const { invoke } = await import('@tauri-apps/api');
          const printerList = await invoke('list_printers');
          
          console.log('✅ Tauri printer list:', printerList);
          setPrinters(printerList as string[]);
        } catch (tauriError) {
          console.error('❌ Tauri printer list failed:', tauriError);
          // Don't fall back to defaults anymore, show empty list instead
          setPrinters([]);
        }
      } else {
        console.log('🔍 Using default printers for browser environment');
        // For browser environment, just use default printers
        setPrinters(['COM1', 'COM2', 'COM3']);
      }
    } catch (error) {
      console.error('Failed to fetch printers:', error);
      setPrinters([]);
    } finally {
      setIsRefreshingPrinters(false);
    }
  };

  const handlePrinterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setSelectedPrinter(value);
    
    if (value === '__manual__') {
      setUseManualPort(true);
      // Don't update port yet, wait for manual input
    } else if (value) {
      setUseManualPort(false);
      setConfig(prev => ({ ...prev, port: value }));
      
      // Configure printer service with the selected port
      printerService.configurePrinter(
        value,
        config.theaterName,
        config.location,
        config.gstin
      );
      
      console.log(`🖨️ Printer port changed to: ${value}`);
    }
  };

  const checkPrinterStatus = async () => {
    try {
      const status = await printerService.getPrinterStatus();
      setPrinterStatus(status);
    } catch (error) {
      console.error('Failed to get printer status:', error);
    }
  };

  const testConnection = async () => {
    setIsTesting(true);
    try {
      // Configure printer with current settings
      printerService.configurePrinter(
        config.port,
        config.theaterName,
        config.location,
        config.gstin
      );

      const success = await printerService.testConnection();
      if (success) {
        await checkPrinterStatus();
        console.log('✅ Printer connection test successful');
      } else {
        console.error('❌ Printer connection test failed');
      }
    } catch (error) {
      console.error('❌ Printer connection test error:', error);
    } finally {
      setIsTesting(false);
    }
  };

  const printTestTicket = async () => {
    setIsPrinting(true);
    try {
      // Configure printer
      printerService.configurePrinter(
        config.port,
        config.theaterName,
        config.location,
        config.gstin
      );

      // Get current date and time
      const currentDate = new Date().toISOString().split('T')[0];
      const currentTime = new Date().toLocaleTimeString('en-US', { 
        hour12: true, 
        hour: '2-digit', 
        minute: '2-digit' 
      });

      // Create a test ticket with realistic data
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
    setConfig(prev => {
      const newConfig = { ...prev, [field]: value };
      
      // Update printer service configuration with all fields
      printerService.configurePrinter(
        newConfig.port,
        newConfig.theaterName,
        newConfig.location,
        newConfig.gstin
      );
      
      return newConfig;
    });
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🖨️ Printer Configuration
          {printerStatus && (
            <Badge variant={printerStatus.connected ? "default" : "destructive"}>
              {printerStatus.connected ? "Connected" : "Disconnected"}
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Configure Epson TM-T20 M249A POS printer settings
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Printer Status */}
        {printerStatus && (
          <div className="space-y-2">
            <Label>Printer Status</Label>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>Ready: <Badge variant={printerStatus.ready ? "default" : "secondary"}>{printerStatus.ready ? "Yes" : "No"}</Badge></div>
              <div>Paper: <Badge variant={printerStatus.paperStatus === "OK" ? "default" : "destructive"}>{printerStatus.paperStatus}</Badge></div>
              <div>Error: <Badge variant={printerStatus.errorStatus === "No Error" ? "default" : "destructive"}>{printerStatus.errorStatus}</Badge></div>
            </div>
          </div>
        )}

        {/* Printer Selection Dropdown */}
        <div>
          <div className="flex justify-between items-center">
            <Label htmlFor="printer-select">Select Printer</Label>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchPrinters}
              className="text-xs"
              disabled={isRefreshingPrinters}
            >
              {isRefreshingPrinters ? 'Scanning...' : 'Refresh Printers'}
            </Button>
          </div>
          <select
            id="printer-select"
            className="w-full border rounded px-2 py-1 mt-1"
            value={useManualPort ? '__manual__' : selectedPrinter}
            onChange={handlePrinterChange}
          >
            {printers.length > 0 ? (
              printers.map((printer) => (
                <option key={printer} value={printer}>{printer}</option>
              ))
            ) : (
              <option value="" disabled>No printers detected</option>
            )}
            <option value="__manual__">Other / Manual</option>
          </select>
          {printers.length === 0 && (
            <div className="text-sm text-amber-600 mt-1">
              No printers detected. Please use manual mode to specify your printer port or click Refresh to scan again.
            </div>
          )}
        </div>

        {/* Manual Port Input */}
        {useManualPort && (
          <div>
            <Label htmlFor="port">Printer Port</Label>
            <Input
              id="port"
              value={config.port}
              onChange={(e) => {
                const value = e.target.value;
                updateConfig('port', value);
                
                // Configure printer service with the manual port
                printerService.configurePrinter(
                  value,
                  config.theaterName,
                  config.location,
                  config.gstin
                );
                
                console.log(`🖨️ Manual printer port changed to: ${value}`);
              }}
              placeholder="Enter port name (e.g., COM1, /dev/ttyUSB0)"
            />
            <div className="text-sm text-gray-500 mt-1">
              Enter the exact port name of your printer. For Windows, it's usually COM1, COM2, etc. 
              For Linux, it might be /dev/ttyUSB0 or similar. You can find this in your system's device manager.
            </div>
          </div>
        )}

        {/* Configuration Fields */}
        <div className="space-y-3">
          <div>
            <Label htmlFor="theaterName">Theater Name</Label>
            <Input
              id="theaterName"
              value={config.theaterName}
              onChange={(e) => updateConfig('theaterName', e.target.value)}
              placeholder="SREELEKHA THEATER"
            />
          </div>
          <div>
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              value={config.location}
              onChange={(e) => updateConfig('location', e.target.value)}
              placeholder="Chickmagalur"
            />
          </div>
          <div>
            <Label htmlFor="gstin">GSTIN</Label>
            <Input
              id="gstin"
              value={config.gstin}
              onChange={(e) => updateConfig('gstin', e.target.value)}
              placeholder="29AAVFS7423E120"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button 
            onClick={testConnection} 
            disabled={isTesting}
            variant="outline"
            className="flex-1"
          >
            {isTesting ? "Testing..." : "Test Connection"}
          </Button>
          <Button 
            onClick={printTestTicket} 
            disabled={isPrinting || !printerStatus?.connected}
            className="flex-1"
          >
            {isPrinting ? "Printing..." : "Print Test"}
          </Button>
        </div>
        <Button 
          onClick={checkPrinterStatus} 
          variant="ghost" 
          size="sm"
          className="w-full"
        >
          Refresh Status
        </Button>
      </CardContent>
    </Card>
  );
};

export default PrinterConfig;