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

const BLUETOOTH_DEVICE_ID_KEY = 'attendease_bluetooth_device_id';
const SESSION_POLL_INTERVAL = 5000; // 5 seconds

export default function StudentDashboardPage() {
  const { user, logout, isLoading: authLoading } = useAuth();
  const router = useRouter(); // router might still be needed for other purposes, or can be removed if not.
  const { toast } = useToast();
  const [deviceId, setDeviceId(null);
  const [attendanceSession, setAttendanceSession(true);
  const [isCheckingIn, setIsCheckingIn(null;
  const [timeRemaining, setTimeRemaining<string | null} | null>(null);


  useEffect(() => {
    // Simulate getting a unique device ID (Bluetooth MAC address)
    let storedDeviceId = localStorage.getItem(BLUETOOTH_DEVICE_ID_KEY);
    if (!storedDeviceId) {
      storedDeviceId = `simulated-bt-${crypto.randomUUID()}`;
      localStorage.setItem(BLUETOOTH_DEVICE_ID_KEY, storedDeviceId);
    }
    setDeviceId(storedDeviceId);
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
    if (!authLoading && user?.role === 'student') { // Only poll if user is a student and auth is loaded
      fetchSessionStatus();
      const intervalId = setInterval(fetchSessionStatus, SESSION_POLL_INTERVAL);
      return () => clearInterval(intervalId);
    }
  }, [fetchSessionStatus, authLoading, user]);

  // Redundant redirection useEffect removed, AuthContext handles this.
  // useEffect(() => {
  //   if (!authLoading && (!user || user.role !== 'student')) {
  //     router.replace('/login');
  //   }
  // }, [user, authLoading, router]);

  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;
    if (attendanceSession?.status === 'open' && attendanceSession.autoCloseTime) {
      const updateTimer = () => {
        const autoCloseDate = parseISO(attendanceSession.autoCloseTime!);
        if (new Date() < autoCloseDate) {
          setTimeRemaining(formatDistanceToNowStrict(autoCloseDate, { addSuffix: true }));
        } else {
          setTimeRemaining("Closing...");
          if (intervalId) clearInterval(intervalId);
          // Optionally trigger a session status refresh here
          // fetchSessionStatus();
        }
      };
      updateTimer(); // Initial call
      intervalId = setInterval(updateTimer, 1000); // Update every second
    } else {
      setTimeRemaining(null);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [attendanceSession]);


  const handleCheckIn = async () => {
    if (!user || !deviceId || !attendanceSession || attendanceSession.status !== 'open' || !attendanceSession.sessionId) {
      toast({
        title: 'Check-in Unavailable',
        description: 'Attendance is not currently open or user/device info is missing.',
        variant: 'destructive',
      });
      return;
    }

    setIsCheckingIn(true);
    setLastCheckInStatus(null);

    try {
      const response = await fetch('/api/check-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: user.id,
          bluetoothMacAddress: deviceId,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        toast({
          title: 'Check-in Successful!',
          description: result.message || `You've been marked present for session ${attendanceSession.sessionId}.`,
          variant: 'default',
          className: 'bg-green-500 text-white dark:bg-green-600',
        });
        setLastCheckInStatus({success: true, message: result.message, sessionId: attendanceSession.sessionId});
      } else {
        toast({
          title: 'Check-in Failed',
          description: result.message || 'Could not complete check-in.',
          variant: 'destructive',
        });
         setLastCheckInStatus({success: false, message: result.message, sessionId: attendanceSession.sessionId});
      }
    } catch (error) {
      console.error('Check-in API error:', error);
      toast({
        title: 'Check-in Error',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      });
      setLastCheckInStatus({success: false, message: 'Network error or server unavailable.', sessionId: attendanceSession.sessionId});
    } finally {
      setIsCheckingIn(false);
      fetchSessionStatus(); // Refresh session status after attempt
    }
  };
  
  // This condition will show spinner if auth is loading, or if user is not a student (AuthContext will redirect),
  // or if session data is still loading for the student.
  if (authLoading || !user || user.role !== 'student' || (isSessionLoading && !attendanceSession) ) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
        <p className="ml-4 mt-4 text-lg text-muted-foreground">Loading Student Dashboard...</p>
      </div>
    );
  }
  
  const isCheckedInForCurrentSession = lastCheckInStatus?.success && lastCheckInStatus.sessionId === attendanceSession?.sessionId;
  const canAttemptCheckIn = attendanceSession?.status === 'open' && !isCheckedInForCurrentSession;

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-background to-secondary/10">
      <header className="p-4 md:p-6 flex justify-between items-center shadow-sm bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="flex items-center">
          <UserCheck className="w-7 h-7 md:w-8 md:h-8 mr-2 md:mr-3 text-primary" />
          <h1 className="text-xl md:text-2xl font-bold text-primary">
            Student Portal
          </h1>
        </div>
        <div className="flex items-center space-x-2 md:space-x-4">
           <span className="text-sm text-muted-foreground hidden sm:inline">
             Welcome, {user.id}
           </span>
          <ModeToggle />
          <Button variant="outline" onClick={logout} size="sm">
            <LogOut className="mr-2 h-4 w-4" /> Logout
          </Button>
        </div>
      </header>

      <main className="flex-grow p-4 md:p-8">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card className="md:col-span-2 lg:col-span-1 shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg font-medium">My Profile</CardTitle>
              <Image 
                  src={`https://picsum.photos/seed/${user.id}/100/100`} 
                  alt="Student avatar"
                  data-ai-hint="student avatar"
                  width={60} 
                  height={60} 
                  className="rounded-full border-2 border-primary shadow-md"
              />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{user.id}</p>
              <p className="text-xs text-muted-foreground">Student Identifier</p>
              {deviceId && (
                <div className="mt-2 text-xs text-muted-foreground flex items-center">
                  <Smartphone className="w-3 h-3 mr-1" /> Device ID: <span className="font-mono ml-1 truncate" title={deviceId}>{deviceId.substring(0, 20)}...</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300 md:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-medium flex items-center">
                <Wifi className="h-5 w-5 mr-2 text-primary" /> {/* Using Wifi icon as proxy for BLE/Connectivity */}
                Attendance Check-in
              </CardTitle>
              {attendanceSession?.sessionId && <CardDescription>Session ID: {attendanceSession.sessionId}</CardDescription>}
            </CardHeader>
            <CardContent>
              {attendanceSession?.status === 'open' && (
                <div className="p-3 mb-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-lg">
                  <div className="flex items-center text-green-700 dark:text-green-300">
                    <CheckCircle className="h-5 w-5 mr-2" />
                    <p className="font-semibold">Attendance is OPEN!</p>
                  </div>
                  {attendanceSession.startTime && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Started: {new Date(attendanceSession.startTime).toLocaleTimeString()}
                    </p>
                  )}
                  {timeRemaining && (
                     <p className="text-xs text-muted-foreground mt-1">
                      Closes {timeRemaining}.
                    </p>
                  )}
                   {!attendanceSession.autoCloseTime && (
                     <p className="text-xs text-muted-foreground mt-1">
                      Session will be closed manually by the instructor.
                    </p>
                  )}
                </div>
              )}
              {attendanceSession?.status === 'not_started' && (
                <div className="p-3 mb-4 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-700 rounded-lg text-yellow-700 dark:text-yellow-300">
                  <div className="flex items-center">
                    <Info className="h-5 w-5 mr-2" />
                    <p className="font-semibold">No active attendance session. Please wait for the instructor to start one.</p>
                  </div>
                </div>
              )}
              {(attendanceSession?.status === 'closed_manual' || attendanceSession?.status === 'closed_timeout') && (
                <div className="p-3 mb-4 bg-red-50 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-lg text-red-700 dark:text-red-300">
                   <div className="flex items-center">
                    <XCircle className="h-5 w-5 mr-2" />
                    <p className="font-semibold">Attendance is CLOSED.</p>
                  </div>
                  {attendanceSession.endTime && (
                     <p className="text-xs text-muted-foreground mt-1">
                      Closed at: {new Date(attendanceSession.endTime).toLocaleTimeString()}
                      {attendanceSession.status === 'closed_timeout' && " (timed out)"}
                    </p>
                  )}
                </div>
              )}

              <Button 
                className="w-full text-lg py-3" 
                onClick={handleCheckIn} 
                disabled={!canAttemptCheckIn || isCheckingIn}
              >
                {isCheckingIn && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                {isCheckedInForCurrentSession ? (
                  <>
                    <CheckCircle className="mr-2 h-5 w-5 text-green-400" /> Checked In
                  </>
                ) : (
                  <>
                    <BookOpen className="mr-2 h-5 w-5" /> Check-in Now
                  </>
                )}
              </Button>
              {!isCheckingIn && lastCheckInStatus && lastCheckInStatus.sessionId === attendanceSession?.sessionId && (
                 <p className={`mt-2 text-sm text-center ${lastCheckInStatus.success ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {lastCheckInStatus.message}
                </p>
              )}
            </CardContent>
          </Card>
          
        </div>
      </main>
       <footer className="text-center p-4 text-xs text-muted-foreground border-t mt-auto">
        AttendEase &copy; {new Date().getFullYear()} :: Student View
      </footer>
    </div>
  );
}

