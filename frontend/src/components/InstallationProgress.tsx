import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { invoke } from '@tauri-apps/api/tauri';
import { listen } from '@tauri-apps/api/event';

interface InstallationStep {
  step: string;
  status: 'running' | 'completed' | 'failed';
  message: string;
}

interface InstallationProgressProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

const InstallationProgress: React.FC<InstallationProgressProps> = ({
  isOpen,
  onClose,
  onComplete
}) => {
  const [steps, setSteps] = useState<InstallationStep[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [isInstalling, setIsInstalling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const installationSteps = [
    "Installing Sumatra PDF...",
    "Installing Epson Printer Drivers...", 
    "Installing Custom Fonts...",
    "Setting up Database...",
    "Creating Shortcuts...",
    "Performing Final Verification..."
  ];

  useEffect(() => {
    if (isOpen && !isInstalling) {
      startInstallation();
    }
  }, [isOpen]);

  useEffect(() => {
    const unlisten = listen('installation-progress', (event) => {
      const step = event.payload as InstallationStep;
      setSteps(prev => [...prev, step]);
      
      if (step.status === 'completed') {
        setCurrentStep(prev => prev + 1);
      } else if (step.status === 'failed') {
        setError(step.message);
        setIsInstalling(false);
      }
    });

    return () => {
      unlisten.then(f => f());
    };
  }, []);

  const startInstallation = async () => {
    setIsInstalling(true);
    setSteps([]);
    setCurrentStep(0);
    setError(null);

    try {
      await invoke('install_dependencies');
      setIsInstalling(false);
      onComplete();
    } catch (err) {
      setError(err as string);
      setIsInstalling(false);
    }
  };

  const getStepIcon = (step: InstallationStep) => {
    switch (step.status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'running':
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
      default:
        return <div className="w-5 h-5 border-2 border-gray-300 rounded-full" />;
    }
  };

  const getProgressPercentage = () => {
    if (steps.length === 0) return 0;
    const completedSteps = steps.filter(step => step.status === 'completed').length;
    return Math.round((completedSteps / installationSteps.length) * 100);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[600px] max-w-none">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            AuditoriumX Installation
          </DialogTitle>
          <p className="text-sm text-gray-600">
            Installing all required components...
          </p>
        </DialogHeader>

        <div className="space-y-6">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Installation Progress</span>
              <span>{getProgressPercentage()}%</span>
            </div>
            <Progress value={getProgressPercentage()} className="w-full" />
          </div>

          {/* Installation Steps */}
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {installationSteps.map((stepText, index) => {
              const step = steps.find(s => s.step === stepText);
              const isCurrent = index === currentStep && isInstalling;
              
              return (
                <div
                  key={index}
                  className={`flex items-center space-x-3 p-3 rounded-lg border ${
                    step?.status === 'completed' 
                      ? 'bg-green-50 border-green-200' 
                      : step?.status === 'failed'
                      ? 'bg-red-50 border-red-200'
                      : isCurrent
                      ? 'bg-blue-50 border-blue-200'
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  {step ? getStepIcon(step) : (
                    <div className="w-5 h-5 border-2 border-gray-300 rounded-full" />
                  )}
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${
                      step?.status === 'completed' 
                        ? 'text-green-700' 
                        : step?.status === 'failed'
                        ? 'text-red-700'
                        : isCurrent
                        ? 'text-blue-700'
                        : 'text-gray-500'
                    }`}>
                      {stepText}
                    </p>
                    {step?.message && step.message !== stepText && (
                      <p className="text-xs text-gray-500 mt-1">
                        {step.message}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <XCircle className="w-5 h-5 text-red-500" />
                <span className="text-sm font-medium text-red-700">Installation Failed</span>
              </div>
              <p className="text-sm text-red-600 mt-2">{error}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3">
            {error && (
              <Button
                variant="outline"
                onClick={startInstallation}
                disabled={isInstalling}
              >
                {isInstalling ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Retrying...
                  </>
                ) : (
                  'Retry Installation'
                )}
              </Button>
            )}
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isInstalling}
            >
              {error ? 'Close' : 'Cancel'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InstallationProgress;
