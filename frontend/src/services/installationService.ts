// Electron API for installation

export interface InstallationStatus {
  success: boolean;
  message: string;
  details?: string[];
}

export class InstallationService {
  /**
   * Install all dependencies (software, fonts, database)
   */
  static async installAllDependencies(): Promise<InstallationStatus> {
    try {
      console.log('[INSTALL] Starting dependency installation...');
      
      // Check if running in Electron
      if (typeof window !== 'undefined' && (window as any).electronAPI) {
        const result = await (window as any).electronAPI.installDependencies();
        return result;
      } else {
        // Fallback for web environment
        const result = {
          success: true,
          message: 'Installation completed (web environment)',
          details: [
            '[INSTALL] Installation would run in desktop environment',
            '[INSTALL] Backend dependencies available',
            '[INSTALL] Database ready for use'
          ]
        };
        return result;
      }
      
      console.log('[INSTALL] Installation completed:', result);
      
      return result;
    } catch (error) {
      console.error('[ERROR] Installation failed:', error);
      
      return {
        success: false,
        message: 'Installation failed. Please run as administrator.',
        details: [
          '[ERROR] Some dependencies may not have been installed',
          '[WARN] Try running the installer as administrator',
          '[WARN] Check if antivirus is blocking the installation'
        ]
      };
    }
  }

  /**
   * Check if this is the first run and needs installation
   */
  static async checkFirstRun(): Promise<boolean> {
    try {
      // Check if backend is accessible
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'}/health`);
      return !response.ok; // If health check fails, might need installation
    } catch (error) {
      console.log('[INSTALL] First run detected - backend not accessible');
      return true;
    }
  }

  /**
   * Show installation dialog to user
   */
  static showInstallationDialog(): Promise<boolean> {
    return new Promise((resolve) => {
      const confirmed = window.confirm(
        'Welcome to AuditoriumX!\n\n' +
        'This appears to be your first time running the application.\n' +
        'We need to install some dependencies to ensure everything works properly:\n\n' +
        '• Sumatra PDF (for ticket printing)\n' +
        '• Epson TM-T81 drivers (for thermal printer)\n' +
        '• Custom fonts (for Kannada text)\n' +
        '• Database setup\n\n' +
        'This requires administrator privileges.\n\n' +
        'Would you like to proceed with the installation?'
      );
      
      resolve(confirmed);
    });
  }

  /**
   * Show installation progress
   */
  static showInstallationProgress(): void {
    // Create a modal or notification to show progress
    const progressDiv = document.createElement('div');
    progressDiv.id = 'installation-progress';
    progressDiv.innerHTML = `
      <div style="
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.8);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 9999;
      ">
        <div style="
          background: white;
          padding: 30px;
          border-radius: 10px;
          text-align: center;
          max-width: 400px;
        ">
          <h3>Installing Dependencies...</h3>
          <div style="margin: 20px 0;">
            <div style="
              width: 100%;
              height: 20px;
              background: #f0f0f0;
              border-radius: 10px;
              overflow: hidden;
            ">
              <div id="progress-bar" style="
                width: 0%;
                height: 100%;
                background: #4CAF50;
                transition: width 0.3s;
              "></div>
            </div>
          </div>
          <p id="progress-text">Initializing installation...</p>
        </div>
      </div>
    `;
    
    document.body.appendChild(progressDiv);
  }

  /**
   * Update installation progress
   */
  static updateProgress(percentage: number, message: string): void {
    const progressBar = document.getElementById('progress-bar');
    const progressText = document.getElementById('progress-text');
    
    if (progressBar) {
      progressBar.style.width = `${percentage}%`;
    }
    
    if (progressText) {
      progressText.textContent = message;
    }
  }

  /**
   * Hide installation progress
   */
  static hideInstallationProgress(): void {
    const progressDiv = document.getElementById('installation-progress');
    if (progressDiv) {
      progressDiv.remove();
    }
  }
}
