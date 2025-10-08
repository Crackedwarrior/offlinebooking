import React from 'react';
import ErrorBoundary from './ErrorBoundary';

/**
 * Seat Grid Error Boundary
 * Specialized error boundary for seat selection components
 */
export const SeatGridErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ErrorBoundary
    fallback={
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <div className="flex items-center mb-4">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">
              Seat Selection Error
            </h3>
          </div>
        </div>
        <div className="text-sm text-red-700">
          <p>There was an error loading the seat grid. Please refresh the page to try again.</p>
        </div>
        <div className="mt-4">
          <button
            onClick={() => window.location.reload()}
            className="bg-red-100 text-red-800 px-3 py-2 rounded text-sm font-medium hover:bg-red-200"
          >
            Refresh Page
          </button>
        </div>
      </div>
    }
    onError={(error, errorInfo) => {
      console.error('SeatGrid Error:', error, errorInfo);
      // TODO: Send to error tracking service
    }}
  >
    {children}
  </ErrorBoundary>
);

/**
 * Settings Error Boundary
 * Specialized error boundary for settings components
 */
export const SettingsErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ErrorBoundary
    fallback={
      <div className="p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
        <div className="flex items-center mb-4">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800">
              Settings Error
            </h3>
          </div>
        </div>
        <div className="text-sm text-yellow-700">
          <p>There was an error loading the settings. Your settings have been saved, but some features may not be available.</p>
        </div>
        <div className="mt-4">
          <button
            onClick={() => window.location.reload()}
            className="bg-yellow-100 text-yellow-800 px-3 py-2 rounded text-sm font-medium hover:bg-yellow-200"
          >
            Reload Settings
          </button>
        </div>
      </div>
    }
    onError={(error, errorInfo) => {
      console.error('Settings Error:', error, errorInfo);
      // TODO: Send to error tracking service
    }}
  >
    {children}
  </ErrorBoundary>
);

/**
 * Print Error Boundary
 * Specialized error boundary for printing components
 */
export const PrintErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ErrorBoundary
    fallback={
      <div className="p-6 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-center mb-4">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">
              Print Service Error
            </h3>
          </div>
        </div>
        <div className="text-sm text-blue-700">
          <p>There was an error with the print service. Please check your printer connection and try again.</p>
        </div>
        <div className="mt-4">
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-100 text-blue-800 px-3 py-2 rounded text-sm font-medium hover:bg-blue-200"
          >
            Retry Print
          </button>
        </div>
      </div>
    }
    onError={(error, errorInfo) => {
      console.error('Print Error:', error, errorInfo);
      // TODO: Send to error tracking service
    }}
  >
    {children}
  </ErrorBoundary>
);

/**
 * Booking Error Boundary
 * Specialized error boundary for booking components
 */
export const BookingErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ErrorBoundary
    fallback={
      <div className="p-6 bg-green-50 border border-green-200 rounded-lg">
        <div className="flex items-center mb-4">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-green-800">
              Booking System Error
            </h3>
          </div>
        </div>
        <div className="text-sm text-green-700">
          <p>There was an error with the booking system. Your booking may have been processed successfully. Please check your booking history.</p>
        </div>
        <div className="mt-4">
          <button
            onClick={() => window.location.reload()}
            className="bg-green-100 text-green-800 px-3 py-2 rounded text-sm font-medium hover:bg-green-200"
          >
            Check Bookings
          </button>
        </div>
      </div>
    }
    onError={(error, errorInfo) => {
      console.error('Booking Error:', error, errorInfo);
      // TODO: Send to error tracking service
    }}
  >
    {children}
  </ErrorBoundary>
);
