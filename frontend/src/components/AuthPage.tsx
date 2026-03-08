import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';

const MAX_ATTEMPTS = 5;
const LOCKOUT_TIME = 30; // seconds

interface AuthPageProps {
  onAuthSuccess?: () => void;
}

const AuthPage: React.FC<AuthPageProps> = ({ onAuthSuccess }) => {
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState('');
  const [pinError, setPinError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [lockTimer, setLockTimer] = useState(0);
  const [showForgotPin, setShowForgotPin] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isLocked && lockTimer > 0) {
      const timer = setInterval(() => {
        setLockTimer((prev) => {
          if (prev <= 1) {
            setIsLocked(false);
            setAttempts(0);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [isLocked, lockTimer]);

  const handlePinChange = (value: string) => {
    const numericValue = value.replace(/\D/g, '');
    if (numericValue.length <= 4) {
      setPin(numericValue);
      setPinError('');
      setError('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && pin.length === 4) {
      handleSubmit(e as any);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setPinError('');

    if (pin.length !== 4) {
      setPinError('PIN must be exactly 4 digits');
      return;
    }

    if (isLocked) {
      return;
    }

    setIsLoading(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Mock validation - replace with actual API call
    const validPin = '2003';
    if (pin === validPin) {
      // Success - call the auth success callback
      if (onAuthSuccess) {
        onAuthSuccess();
      } else {
        // Fallback to window location if no callback provided
        window.location.href = '/';
      }
      return;
    } else {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);

      if (newAttempts >= MAX_ATTEMPTS) {
        setIsLocked(true);
        setLockTimer(LOCKOUT_TIME);
        setError('Too many failed attempts. Account locked.');
      } else {
        setError(`Invalid PIN. ${MAX_ATTEMPTS - newAttempts} attempts remaining.`);
      }
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-8">
      <div className="w-full max-w-md relative">
        {/* Ticket Chip with Perforated Edges */}
        <div className="relative bg-white shadow-2xl rounded-2xl ticket-chip">
          {/* Left Perforated Edge - Circles */}
          <div className="absolute left-0 top-0 bottom-0 w-4 flex flex-col items-center justify-center gap-2 z-10 pointer-events-none">
            {[...Array(30)].map((_, i) => (
              <div 
                key={`left-${i}`} 
                className="w-3 h-3 rounded-full bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 border border-gray-200/50"
                style={{ 
                  boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.1), 0 0 0 1px rgba(255,255,255,0.5)'
                }}
              ></div>
            ))}
          </div>
          
          {/* Right Perforated Edge - Circles */}
          <div className="absolute right-0 top-0 bottom-0 w-4 flex flex-col items-center justify-center gap-2 z-10 pointer-events-none">
            {[...Array(30)].map((_, i) => (
              <div 
                key={`right-${i}`} 
                className="w-3 h-3 rounded-full bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 border border-gray-200/50"
                style={{ 
                  boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.1), 0 0 0 1px rgba(255,255,255,0.5)'
                }}
              ></div>
            ))}
          </div>
          
          {/* Ticket Content */}
          <Card className="border-0 shadow-none bg-transparent relative z-0" style={{ margin: '0 16px' }}>
            <CardHeader className="pb-4 pt-10 px-8">
              {/* Ticket Header Section */}
              <div className="flex flex-col items-center mb-6">
                <img 
                  src="/icons8-ticket-100 (1).png" 
                  alt="AuditoriumX Logo" 
                  className="w-20 h-20 object-contain mb-3"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                  }}
                />
                <h1 className="text-3xl font-bold text-gray-900 tracking-wider uppercase mb-2" style={{ fontFamily: 'serif' }}>
                  AuditoriumX
                </h1>
                <div className="w-24 h-0.5 bg-gradient-to-r from-transparent via-gray-400 to-transparent mb-2"></div>
                <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold">Entry Pass</p>
              </div>
            </CardHeader>
      
            <CardContent className="px-8 pb-10">
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* PIN Input Field */}
                <div className="space-y-2">
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10">
                      <Lock className="w-5 h-5 text-gray-500" />
                    </div>
                    <Input
                      ref={inputRef}
                      id="pin"
                      type={showPin ? 'text' : 'password'}
                      value={pin}
                      onChange={(e) => handlePinChange(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="••••"
                      className={`pl-12 pr-12 h-14 text-lg font-mono tracking-widest border-2 rounded-xl bg-gray-50/50 text-gray-900 placeholder:text-gray-400 transition-all duration-300 focus:outline-none ${
                        pinError || error
                          ? 'border-red-400 focus:border-red-500 bg-red-50/50'
                          : pin.length === 4
                          ? 'border-green-400 focus:border-green-500 bg-green-50/50'
                          : 'border-gray-300 focus:border-blue-400 focus:bg-white'
                      }`}
                      disabled={isLocked || isLoading}
                      autoFocus
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 hover:bg-gray-200/50 text-gray-500"
                      onClick={() => setShowPin(!showPin)}
                      disabled={isLocked || isLoading}
                    >
                      {showPin ? (
                        <Eye className="w-4 h-4" />
                      ) : (
                        <EyeOff className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                  {pinError && (
                    <p className="text-xs font-medium text-red-500">{pinError}</p>
                  )}
                </div>

                {/* Error Alerts */}
                {error && (
                  <Alert variant="destructive" className="rounded-xl border border-red-500 bg-red-50 text-red-800">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="font-medium text-sm">{error}</AlertDescription>
                  </Alert>
                )}

                {isLocked && (
                  <Alert className="rounded-xl border border-orange-500 bg-orange-50 text-orange-800">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="font-medium text-sm">
                      Account locked. Please wait {lockTimer} seconds before trying again.
                    </AlertDescription>
                  </Alert>
                )}

                {/* Divider Line */}
                <div className="flex items-center gap-3 my-4">
                  <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
                  <div className="w-2 h-2 rounded-full bg-gray-300"></div>
                  <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
                </div>

                {/* Login Button */}
                <Button
                  type="submit"
                  className="w-full h-14 bg-gradient-to-r from-purple-500 via-blue-500 to-indigo-500 hover:from-purple-600 hover:via-blue-600 hover:to-indigo-600 text-white font-bold text-base rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wider"
                  disabled={isLocked || isLoading || pin.length !== 4}
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Verifying...</span>
                    </div>
                  ) : (
                    'Start Booking'
                  )}
                </Button>

              {/* Failed Attempts Counter */}
              {attempts > 0 && !isLocked && (
                <div className="text-center mt-2">
                  <span className="text-xs font-semibold text-orange-600 uppercase tracking-wide">
                    Attempts: {attempts}/{MAX_ATTEMPTS}
                  </span>
                </div>
              )}
              </form>

              {/* Forgot PIN Alert */}
              {showForgotPin && (
                <Alert className="mt-4 rounded-xl border border-gray-300 bg-gray-50 text-gray-800">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="font-medium text-sm">
                    Please contact your system administrator to reset your PIN.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
