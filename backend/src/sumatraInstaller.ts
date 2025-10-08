import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import https from 'https';

const execAsync = promisify(exec);

class SumatraInstaller {
  private tempDir: string;

  constructor() {
    this.tempDir = path.join(process.cwd(), 'temp');
    this.ensureTempDir();
  }

  private ensureTempDir() {
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  /**
   * Check if SumatraPDF is already installed
   */
  async isSumatraInstalled(): Promise<{ installed: boolean; path?: string }> {
    const sumatraPaths = [
      'C:\\Program Files\\SumatraPDF\\SumatraPDF.exe',
      'C:\\Program Files (x86)\\SumatraPDF\\SumatraPDF.exe',
      path.join(process.env.LOCALAPPDATA || '', 'SumatraPDF\\SumatraPDF.exe'),
      path.join(process.env.USERPROFILE || '', 'AppData\\Local\\SumatraPDF\\SumatraPDF.exe'),
      'C:\\Users\\Hi\\AppData\\Local\\SumatraPDF\\SumatraPDF.exe',
      path.join(process.env.PROGRAMFILES || '', 'SumatraPDF\\SumatraPDF.exe'),
      path.join(process.env['PROGRAMFILES(X86)'] || '', 'SumatraPDF\\SumatraPDF.exe')
    ];

    for (const testPath of sumatraPaths) {
      if (fs.existsSync(testPath)) {
        return { installed: true, path: testPath };
      }
    }

    return { installed: false };
  }

  /**
   * Download SumatraPDF installer
   */
  private async downloadSumatraInstaller(): Promise<string> {
    const downloadUrl = 'https://www.sumatrapdfreader.org/dl/rel/3.5.2/SumatraPDF-3.5.2-64-install.exe';
    const installerPath = path.join(this.tempDir, 'SumatraPDF-3.5.2-64-install.exe');

    return new Promise((resolve, reject) => {
      console.log(`📥 Downloading SumatraPDF from: ${downloadUrl}`);
      
      const file = fs.createWriteStream(installerPath);
      
      https.get(downloadUrl, (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`Failed to download SumatraPDF: HTTP ${response.statusCode}`));
          return;
        }

        response.pipe(file);

        file.on('finish', () => {
          file.close();
          console.log(`✅ SumatraPDF downloaded to: ${installerPath}`);
          resolve(installerPath);
        });

        file.on('error', (err) => {
          fs.unlink(installerPath, () => {}); // Delete partial file
          reject(err);
        });
      }).on('error', (err) => {
        reject(err);
      });
    });
  }

  /**
   * Install SumatraPDF silently
   */
  private async installSumatra(installerPath: string): Promise<boolean> {
    try {
      console.log(`🔧 Installing SumatraPDF silently...`);
      
      // Silent installation command
      const installCommand = `"${installerPath}" /S /D="C:\\Program Files\\SumatraPDF"`;
      console.log(`🔧 Executing: ${installCommand}`);
      
      await execAsync(installCommand, { 
        windowsHide: true,
        timeout: 60000 // 60 second timeout
      });

      console.log(`✅ SumatraPDF installation completed`);
      return true;
    } catch (error) {
      console.error(`❌ SumatraPDF installation failed:`, error);
      return false;
    }
  }

  /**
   * Install SumatraPDF if not already installed
   */
  async installIfNeeded(): Promise<{ success: boolean; message: string; path?: string }> {
    try {
      // Check if already installed
      const checkResult = await this.isSumatraInstalled();
      if (checkResult.installed) {
        return {
          success: true,
          message: 'SumatraPDF is already installed',
          path: checkResult.path
        };
      }

      console.log(`📋 SumatraPDF not found, attempting to install...`);

      // Download installer
      const installerPath = await this.downloadSumatraInstaller();

      // Install SumatraPDF
      const installSuccess = await this.installSumatra(installerPath);

      // Clean up installer
      try {
        if (fs.existsSync(installerPath)) {
          fs.unlinkSync(installerPath);
          console.log(`🧹 Cleaned up installer file`);
        }
      } catch (cleanupError) {
        console.log(`⚠️ Could not clean up installer: ${cleanupError}`);
      }

      if (installSuccess) {
        // Verify installation
        const verifyResult = await this.isSumatraInstalled();
        if (verifyResult.installed) {
          return {
            success: true,
            message: 'SumatraPDF installed successfully',
            path: verifyResult.path
          };
        } else {
          return {
            success: false,
            message: 'SumatraPDF installation completed but verification failed'
          };
        }
      } else {
        return {
          success: false,
          message: 'SumatraPDF installation failed'
        };
      }
    } catch (error) {
      console.error(`❌ SumatraPDF installation error:`, error);
      return {
        success: false,
        message: `SumatraPDF installation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Get user-friendly installation instructions
   */
  getInstallationInstructions(): string {
    return `
SumatraPDF is required for automatic PDF printing.

To install SumatraPDF:
1. Go to: https://www.sumatrapdfreader.org/download-free-pdf-viewer.html
2. Download the latest version
3. Run the installer
4. Restart the application

Alternatively, the application will attempt to install it automatically.
    `.trim();
  }
}

export default SumatraInstaller;
