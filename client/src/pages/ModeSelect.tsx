import { useState } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent } from '@/components/ui/card';
import { Clock, FileText, LogIn, LogOut, Settings } from 'lucide-react';
import factoryBg from '@assets/generated_images/modern_clean_industrial_factory_interior_background.png';
import aeceLogo from '@assets/AECE_Logo_1765516911038.png';

type AttendanceSubMode = 'clock-in' | 'clock-out';

export default function ModeSelect() {
  const [, setLocation] = useLocation();
  const [showAttendanceOptions, setShowAttendanceOptions] = useState(false);

  const handleAttendanceMode = (subMode: AttendanceSubMode) => {
    sessionStorage.setItem('appMode', 'attendance');
    sessionStorage.setItem('attendanceSubMode', subMode);
    setLocation('/attendance-kiosk');
  };

  const handleApplicationMode = () => {
    sessionStorage.setItem('appMode', 'application');
    setLocation('/login');
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center bg-cover bg-center relative"
      style={{ backgroundImage: `url(${factoryBg})` }}
    >
      <div className="absolute inset-0 bg-black/70" />
      
      <div className="relative z-10 w-full max-w-4xl px-4">
        <div className="text-center mb-8">
          <img src={aeceLogo} alt="AECE Electronics" className="h-20 mx-auto mb-4" />
          <h1 className="font-oswald text-4xl font-bold text-white tracking-wider mb-2">
            AECE CHECKPOINT
          </h1>
          <p className="text-gray-300 text-lg">Select Operating Mode</p>
        </div>

        {!showAttendanceOptions ? (
          <div className="grid md:grid-cols-2 gap-6">
            <Card 
              className="cursor-pointer hover:scale-105 transition-transform duration-300 bg-white/95 backdrop-blur border-0 shadow-2xl"
              onClick={() => setShowAttendanceOptions(true)}
              data-testid="card-attendance-mode"
            >
              <CardContent className="p-8 text-center">
                <div className="w-20 h-20 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
                  <Clock className="w-10 h-10 text-primary" />
                </div>
                <h2 className="font-oswald text-2xl font-bold text-gray-800 mb-2">
                  ATTENDANCE MODE
                </h2>
                <p className="text-gray-600">
                  Fast clock-in/clock-out for workers entering or leaving the facility
                </p>
              </CardContent>
            </Card>

            <Card 
              className="cursor-pointer hover:scale-105 transition-transform duration-300 bg-white/95 backdrop-blur border-0 shadow-2xl"
              onClick={handleApplicationMode}
              data-testid="card-application-mode"
            >
              <CardContent className="p-8 text-center">
                <div className="w-20 h-20 mx-auto mb-4 bg-gray-500/10 rounded-full flex items-center justify-center">
                  <FileText className="w-10 h-10 text-gray-600" />
                </div>
                <h2 className="font-oswald text-2xl font-bold text-gray-800 mb-2">
                  APPLICATION MODE
                </h2>
                <p className="text-gray-600">
                  Access leave requests, dashboard, and other worker services
                </p>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="space-y-6">
            <button 
              onClick={() => setShowAttendanceOptions(false)}
              className="text-white/80 hover:text-white flex items-center gap-2 mb-4"
              data-testid="button-back"
            >
              ← Back to Mode Selection
            </button>
            
            <div className="grid md:grid-cols-2 gap-6">
              <Card 
                className="cursor-pointer hover:scale-105 transition-transform duration-300 bg-green-50 border-green-200 shadow-2xl"
                onClick={() => handleAttendanceMode('clock-in')}
                data-testid="card-clock-in"
              >
                <CardContent className="p-8 text-center">
                  <div className="w-20 h-20 mx-auto mb-4 bg-green-500/20 rounded-full flex items-center justify-center">
                    <LogIn className="w-10 h-10 text-green-600" />
                  </div>
                  <h2 className="font-oswald text-2xl font-bold text-green-800 mb-2">
                    CLOCK IN
                  </h2>
                  <p className="text-green-700">
                    Record worker arrivals at the start of shift
                  </p>
                </CardContent>
              </Card>

              <Card 
                className="cursor-pointer hover:scale-105 transition-transform duration-300 bg-red-50 border-red-200 shadow-2xl"
                onClick={() => handleAttendanceMode('clock-out')}
                data-testid="card-clock-out"
              >
                <CardContent className="p-8 text-center">
                  <div className="w-20 h-20 mx-auto mb-4 bg-red-500/20 rounded-full flex items-center justify-center">
                    <LogOut className="w-10 h-10 text-red-600" />
                  </div>
                  <h2 className="font-oswald text-2xl font-bold text-red-800 mb-2">
                    CLOCK OUT
                  </h2>
                  <p className="text-red-700">
                    Record worker departures at end of shift
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        <div className="text-center mt-8">
          <button 
            onClick={() => {
              sessionStorage.setItem('appMode', 'application');
              setLocation('/login?mode=admin');
            }}
            className="text-gray-400 hover:text-white text-sm flex items-center gap-2 mx-auto"
            data-testid="button-admin-settings"
          >
            <Settings className="w-4 h-4" />
            Admin Settings
          </button>
        </div>
      </div>
    </div>
  );
}
