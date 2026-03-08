/**
 * Sidebar component for Index page
 * Extracted from Index.tsx
 */

import React from 'react';
import { Calendar, History, Download, Settings as SettingsIcon, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';

const sidebarItems = [
  { id: 'booking', label: 'Seat Booking', icon: Calendar },
  { id: 'history', label: 'Booking History', icon: History },
  { id: 'reports', label: 'Reports', icon: Download },
  { id: 'settings', label: 'Settings', icon: SettingsIcon },
];

interface IndexSidebarProps {
  collapsed: boolean;
  activeView: 'booking' | 'checkout' | 'confirmation' | 'history' | 'reports' | 'settings';
  currentTime: Date;
  onViewChange: (view: 'booking' | 'checkout' | 'confirmation' | 'history' | 'reports' | 'settings') => void;
  onToggleCollapse: () => void;
}

export const IndexSidebar: React.FC<IndexSidebarProps> = ({
  collapsed,
  activeView,
  currentTime,
  onViewChange,
  onToggleCollapse
}) => {
  const formatTime = () => {
    const hours = currentTime.getHours();
    const minutes = currentTime.getMinutes();
    const displayHours = hours % 12 || 12;
    const displayMinutes = minutes.toString().padStart(2, '0');
    return `${displayHours}:${displayMinutes}`;
  };

  const handleCloseApp = () => {
    if (typeof window !== 'undefined' && (window as any).electronAPI) {
      (window as any).electronAPI.closeApp();
    } else {
      window.close();
    }
  };

  return (
    <div
      className={`fixed left-0 top-0 h-screen z-40 bg-white shadow-lg border-r overflow-y-scroll hide-scrollbar transition-all duration-300 flex flex-col ${collapsed ? 'w-16' : 'w-64'}`}
    >
      {/* Time display at top of sidebar */}
      <div className={`p-4 ${collapsed ? 'flex justify-center' : ''}`}>
        <div className={`flex items-center ${collapsed ? 'flex-col justify-center' : 'justify-center'}`}>
          <span className={`text-gray-600 font-medium transition-all duration-200 ${collapsed ? 'text-xs opacity-100' : 'opacity-100'}`}>
            {formatTime()}
          </span>
        </div>
      </div>
      <nav className={`flex-1 flex flex-col gap-2 ${collapsed ? 'justify-center items-center p-0 m-0' : 'p-4'}`}>
        {sidebarItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id as any)}
              onDoubleClick={onToggleCollapse}
              className={`transition-colors w-full
                ${collapsed
                  ? `flex justify-center items-center aspect-square w-14 h-14 p-0 rounded-xl ${isActive ? 'bg-blue-100' : ''}`
                  : `flex flex-col justify-center items-center min-h-[96px] rounded-xl mb-4 ${isActive ? 'bg-blue-100 text-blue-700 font-medium' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`
                }
                ${isActive && !collapsed ? 'shadow' : ''}`}
              title={item.label}
            >
              <Icon className={`${collapsed ? 'w-6 h-6' : 'w-6 h-6 mb-2'}`} />
              <span className={`transition-all duration-200 ${collapsed ? 'opacity-0 w-0 h-0 overflow-hidden' : 'opacity-100 w-auto'}`}>{item.label}</span>
            </button>
          );
        })}
      </nav>
      {/* Exit button at bottom of sidebar */}
      <div className={`p-4 ${collapsed ? 'flex justify-center' : ''}`}>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCloseApp}
          className={`w-full text-gray-600 hover:text-red-600 hover:bg-red-50 ${collapsed ? 'w-14 h-14 p-0' : ''}`}
          title="Close App"
        >
          <LogOut className={`${collapsed ? 'w-5 h-5' : 'w-4 h-4 mr-2'}`} />
          {!collapsed && <span>Exit</span>}
        </Button>
      </div>
    </div>
  );
};

