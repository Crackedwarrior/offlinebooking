// Printer Setup Utility - Helps configure optimal printer settings
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface PrinterSetupOptions {
  printerName: string;
  paperWidth?: number; // in mm
  paperHeight?: number; // in mm
  paperConservation?: 'Top & Bottom' | 'None';
  printPosition?: { x: number; y: number }; // in mm
}

class PrinterSetup {
  
  /**
   * Opens printer properties dialog for manual configuration
   * This is the most reliable way to set printer preferences
   */
  static async openPrinterProperties(printerName: string): Promise<boolean> {
    try {
      console.log(`🔧 Opening printer properties for: ${printerName}`);
      
      const command = `rundll32 printui.dll,PrintUIEntry /p /n "${printerName}"`;
      await execAsync(command, { windowsHide: true });
      
      console.log('✅ Printer properties dialog opened!');
      console.log('📝 Please configure the following settings:');
      console.log('   - Paper Conservation: Top & Bottom');
      console.log('   - Paper Size: 100mm × 95mm (or your preferred size)');
      console.log('   - Print Position: 0.0mm (both X and Y)');
      console.log('   - Click OK to save settings');
      
      return true;
    } catch (error) {
      console.error('❌ Failed to open printer properties:', error);
      return false;
    }
  }
  
  /**
   * Opens printer preferences dialog (alternative method)
   */
  static async openPrinterPreferences(printerName: string): Promise<boolean> {
    try {
      console.log(`🔧 Opening printer preferences for: ${printerName}`);
      
      const command = `rundll32 printui.dll,PrintUIEntry /e /n "${printerName}"`;
      await execAsync(command, { windowsHide: true });
      
      console.log('✅ Printer preferences dialog opened!');
      return true;
    } catch (error) {
      console.error('❌ Failed to open printer preferences:', error);
      return false;
    }
  }
  
  /**
   * Lists all available printers
   */
  static async listPrinters(): Promise<string[]> {
    try {
      const { stdout } = await execAsync(
        'powershell -Command "Get-Printer | Select-Object Name | ConvertTo-Json"',
        { windowsHide: true }
      );
      
      const printers = JSON.parse(stdout);
      const printerList = Array.isArray(printers) ? printers : [printers];
      
      return printerList.map((p: any) => p.Name).filter(Boolean);
    } catch (error) {
      console.error('❌ Failed to list printers:', error);
      return [];
    }
  }
  
  /**
   * Gets printer status and details
   */
  static async getPrinterInfo(printerName: string): Promise<any> {
    try {
      const { stdout } = await execAsync(
        `powershell -Command "Get-Printer -Name '${printerName}' | ConvertTo-Json"`,
        { windowsHide: true }
      );
      
      return JSON.parse(stdout);
    } catch (error) {
      console.error(`❌ Failed to get printer info for ${printerName}:`, error);
      return null;
    }
  }
  
  /**
   * Sets default printer
   */
  static async setDefaultPrinter(printerName: string): Promise<boolean> {
    try {
      console.log(`🔧 Setting default printer to: ${printerName}`);
      
      const command = `rundll32 printui.dll,PrintUIEntry /y /n "${printerName}"`;
      await execAsync(command, { windowsHide: true });
      
      console.log('✅ Default printer set successfully!');
      return true;
    } catch (error) {
      console.error('❌ Failed to set default printer:', error);
      return false;
    }
  }
  
  /**
   * Complete printer setup workflow
   */
  static async setupPrinter(printerName: string): Promise<boolean> {
    console.log('🎯 Starting Printer Setup Workflow\n');
    
    // Step 1: Verify printer exists
    console.log('1️⃣ Verifying printer exists...');
    const printers = await this.listPrinters();
    if (!printers.includes(printerName)) {
      console.error(`❌ Printer "${printerName}" not found!`);
      console.log('Available printers:', printers);
      return false;
    }
    console.log('✅ Printer found!');
    
    // Step 2: Get printer info
    console.log('\n2️⃣ Getting printer information...');
    const printerInfo = await this.getPrinterInfo(printerName);
    if (printerInfo) {
      console.log('Printer Details:', {
        Name: printerInfo.Name,
        Port: printerInfo.Port,
        Status: printerInfo.PrinterStatus,
        Driver: printerInfo.DriverName
      });
    }
    
    // Step 3: Set as default (optional)
    console.log('\n3️⃣ Setting as default printer...');
    await this.setDefaultPrinter(printerName);
    
    // Step 4: Open properties for manual configuration
    console.log('\n4️⃣ Opening printer properties for configuration...');
    const propertiesOpened = await this.openPrinterProperties(printerName);
    
    if (propertiesOpened) {
      console.log('\n✅ Printer setup workflow completed!');
      console.log('📝 Please configure the printer settings as shown above.');
      console.log('🖨️ After configuration, the printer will be ready for optimal printing.');
      return true;
    } else {
      console.log('\n❌ Printer setup workflow failed!');
      return false;
    }
  }
}

export default PrinterSetup;
