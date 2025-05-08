'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { Button } from '@/components/ui/button';
import { ModeToggle } from '@/components/mode-toggle';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UserCheck, LogOut, BookOpen, CheckCircle, AlertTriangle, Wifi, Loader2, Smartphone, Info, XCircle } from 'lucide-react';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import type { AttendanceSession } from '@/types';
import { formatDistanceToNowStrict, parseISO } from 'date-fns';
import { BluetoothScanner } from '@/components/bluetooth-scanner';

const BLUETOOTH_DEVICE_ID_KEY = 'attendease_bluetooth_device_id';
const SESSION_POLL_INTERVAL = 5000; // 5 seconds

export default function StudentDashboardPage() {
  const { user, logout, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [attendanceSession, setAttendanceSession] = useState<AttendanceSession | null>(null);
  const [isSessionLoading, setIsSessionLoading] = useState(true);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [lastCheckInStatus, setLastCheckInStatus] = useState<{success: boolean, message: string, sessionId: string | null} | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<string | null>(null);


  useEffect(() => {
    // Load any previously selected Bluetooth device
    const storedDeviceId = localStorage.getItem(BLUETOOTH_DEVICE_ID_KEY);
    if (storedDeviceId) {
      setDeviceId(storedDeviceId);
    }
  }, []);

  const fetchSessionStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/attendance/status');
      if (!response.ok) {
        throw new Error('Failed to fetch session status');
      }
      const sessionData: AttendanceSession = await response.json();
      setAttendanceSession(sessionData);
    } catch (error) {
      console.error('Error fetching session status:', error);
      // Don't toast on every poll failure, could be annoying
    } finally {
      setIsSessionLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSessionStatus();
    const intervalId = setInterval(fetchSessionStatus, SESSION_POLL_INTERVAL);
    return () => clearInterval(intervalId);
  }, [fetchSessionStatus]);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'student')) {
      router.replace('/login');
    }
  }, [authLoading, user, router]);

  const handleDeviceSelection = (selectedDeviceId: string) => {
    setDeviceId(selectedDeviceId);
    localStorage.setItem(BLUETOOTH_DEVICE_ID_KEY, selectedDeviceId);
    
    toast({
      title: "Device Selected",
      description: "Your Bluetooth device has been selected for attendance check-in.",
      duration: 3000,
    });
  };

  const handleCheckIn = async () => {
    if (!user || !deviceId) {
      toast({
        title: "Error",
        description: "Unable to check in. Missing user information or device selection.",
        variant: "destructive",
      });
      return;
    }

    setIsCheckingIn(true);

    try {
      const response = await fetch('/api/check-in', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          studentId: user.id,
          bluetoothMacAddress: deviceId, // Now using the actual Bluetooth device ID
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setLastCheckInStatus({
          success: true,
          message: data.message,
          sessionId: attendanceSession?.sessionId || null,
        });
        toast({
          title: "Check-in Successful",
          description: "Your attendance has been recorded.",
          variant: "default",
        });
      } else {
        setLastCheckInStatus({
          success: false,
          message: data.message,
          sessionId: attendanceSession?.sessionId || null,
        });
        toast({
          title: "Check-in Failed",
          description: data.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Check-in error:', error);
      toast({
        title: "Error",
        description: "Failed to communicate with the attendance server. Please try again.",
        variant: "destructive",
      });
      setLastCheckInStatus({
        success: false,
        message: "Network error. Please try again.",
        sessionId: attendanceSession?.sessionId || null,
      });
    } finally {
      setIsCheckingIn(false);
    }
  };

  // Display the rest of your component UI...
  // (Keep the existing UI components)

  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <div className="container mx-auto max-w-4xl">
        {/* Header with logout and theme toggle */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold flex items-center">
            <BookOpen className="mr-2" />
            AttendEase
          </h1>
          <div className="flex items-center gap-2">
            <ModeToggle />
            <Button variant="ghost" size="icon" onClick={logout}>
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* User info */}
        <Card className="mb-6">
          <CardHeader className="pb-2">
            {/* <CardTitle>Welcome, {user?.name || 'Student'}</CardTitle> */}
            <CardDescription>ID: {user?.id || 'Unknown'}</CardDescription>
          </CardHeader>
        </Card>

        {/* Bluetooth Device Selection - New Component */}
        <Card className="mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center">
              <Smartphone className="mr-2 h-5 w-5" /> 
              Device Selection
            </CardTitle>
            <CardDescription>
              Select a Bluetooth device to use for attendance check-in
            </CardDescription>
          </CardHeader>
          <CardContent>
            <BluetoothScanner 
              onDeviceSelected={handleDeviceSelection} 
              selectedDeviceId={deviceId}
            />
          </CardContent>
        </Card>

        {/* Attendance Session Card */}
        <Card className="mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center">
              <UserCheck className="mr-2 h-5 w-5" /> 
              Attendance Session
            </CardTitle>
            <CardDescription>
              Current attendance session information
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isSessionLoading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : attendanceSession?.status === 'open' ? (
              <div className="space-y-4">
                <div className="flex items-center text-green-600 dark:text-green-400 font-medium">
                  <CheckCircle className="mr-2 h-5 w-5" />
                  Session is currently open for check-ins
                </div>
                {attendanceSession.autoCloseTime && (
                  <div className="text-sm text-muted-foreground">
                    <Info className="inline mr-1 h-4 w-4" />
                    Closes in {timeRemaining || '...'}
                  </div>
                )}
                <Button 
                  className="w-full" 
                  onClick={handleCheckIn} 
                  disabled={isCheckingIn || !deviceId}
                >
                  {isCheckingIn ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Checking in...
                    </>
                  ) : (
                    'Check In Now'
                  )}
                </Button>
                {!deviceId && (
                  <div className="text-amber-500 text-sm">
                    <AlertTriangle className="inline mr-1 h-4 w-4" />
                    Please select a Bluetooth device first
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center text-amber-500 font-medium">
                <XCircle className="mr-2 h-5 w-5" />
                No attendance session currently open
              </div>
            )}
          </CardContent>
        </Card>

        {/* Last check-in status */}
        {lastCheckInStatus && lastCheckInStatus.sessionId === attendanceSession?.sessionId && (
          <Card className={lastCheckInStatus.success ? "border-green-400" : "border-red-400"}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center">
                {lastCheckInStatus.success ? (
                  <CheckCircle className="mr-2 h-5 w-5 text-green-500" />
                ) : (
                  <AlertTriangle className="mr-2 h-5 w-5 text-amber-500" />
                )}
                Check-in Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p>{lastCheckInStatus.message}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}