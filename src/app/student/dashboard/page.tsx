
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { Button } from '@/components/ui/button';
import { ModeToggle } from '@/components/mode-toggle';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UserCheck, LogOut, BookOpen, CheckCircle, AlertTriangle, Loader2, Smartphone, Info, XCircle, History } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { AttendanceSession, CheckInData } from '@/types';
import { format, parseISO, formatDistanceToNowStrict } from 'date-fns';
import { BluetoothScanner } from '@/components/bluetooth-scanner';

const BLUETOOTH_DEVICE_ID_KEY = 'attendease_bluetooth_device_id';
const STUDENT_LAST_CHECKIN_KEY_PREFIX = 'attendease-student-lastcheckin-';
const SESSION_POLL_INTERVAL = 5000; // 5 seconds

interface PersistedCheckInInfo {
  sessionId: string;
  timestamp: string;
  studentId: string;
}

export default function StudentDashboardPage() {
  const { user, logout, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [attendanceSession, setAttendanceSession] = useState<AttendanceSession | null>(null);
  const [isSessionLoading, setIsSessionLoading] = useState(true);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  // For immediate feedback from API
  const [lastApiAttemptStatus, setLastApiAttemptStatus] = useState<{success: boolean, message: string, forSessionId: string | null} | null>(null);
  // For persistent display of last successful check-in
  const [persistedCheckInDetails, setPersistedCheckInDetails] = useState<PersistedCheckInInfo | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<string | null>(null);

  const getStudentLastCheckInKey = useCallback(() => {
    return user ? `${STUDENT_LAST_CHECKIN_KEY_PREFIX}${user.id}` : null;
  }, [user]);

  useEffect(() => {
    const storedDeviceId = localStorage.getItem(BLUETOOTH_DEVICE_ID_KEY);
    if (storedDeviceId) {
      setDeviceId(storedDeviceId);
    }

    const key = getStudentLastCheckInKey();
    if (key) {
      const storedCheckIn = localStorage.getItem(key);
      if (storedCheckIn) {
        try {
          setPersistedCheckInDetails(JSON.parse(storedCheckIn));
        } catch (e) {
          console.error("Failed to parse persisted check-in details", e);
          localStorage.removeItem(key); // Clear corrupted data
        }
      }
    }
  }, [getStudentLastCheckInKey]);

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
    let intervalId: NodeJS.Timeout | null = null;
    if (attendanceSession?.status === 'open' && attendanceSession.autoCloseTime) {
      const updateTimer = () => {
        const autoCloseDate = parseISO(attendanceSession.autoCloseTime!);
        if (new Date() < autoCloseDate) {
          setTimeRemaining(formatDistanceToNowStrict(autoCloseDate, { addSuffix: true }));
        } else {
          setTimeRemaining("Closing...");
          if (intervalId) clearInterval(intervalId);
        }
      };
      updateTimer();
      intervalId = setInterval(updateTimer, 1000);
    } else {
      setTimeRemaining(null);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [attendanceSession]);


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
    if (!user || !deviceId || !attendanceSession || attendanceSession.status !== 'open' || !attendanceSession.sessionId) {
      toast({
        title: "Cannot Check In",
        description: "No open session, or user/device info missing.",
        variant: "destructive",
      });
      return;
    }

    setIsCheckingIn(true);
    setLastApiAttemptStatus(null);

    try {
      const response = await fetch('/api/check-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: user.id,
          bluetoothMacAddress: deviceId,
        }),
      });

      const data = await response.json();
      
      if (response.ok && data.checkIn) {
        const successfulCheckIn: PersistedCheckInInfo = {
          studentId: user.id,
          sessionId: data.checkIn.sessionId,
          timestamp: data.checkIn.timestamp,
        };
        const key = getStudentLastCheckInKey();
        if (key) {
          localStorage.setItem(key, JSON.stringify(successfulCheckIn));
        }
        setPersistedCheckInDetails(successfulCheckIn);
        setLastApiAttemptStatus({
          success: true,
          message: data.message || "Check-in successful!",
          forSessionId: data.checkIn.sessionId,
        });
        toast({
          title: "Check-in Successful",
          description: "Your attendance has been recorded for session " + data.checkIn.sessionId + ".",
          variant: "default", className: 'bg-green-500 text-white dark:bg-green-600'
        });
      } else {
        setLastApiAttemptStatus({
          success: false,
          message: data.message || "Check-in failed. Please try again.",
          forSessionId: attendanceSession.sessionId,
        });
        toast({
          title: "Check-in Failed",
          description: data.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Check-in error:', error);
      const errorMsg = (error as Error).message || "Network error. Please try again.";
      setLastApiAttemptStatus({
        success: false,
        message: errorMsg,
        forSessionId: attendanceSession.sessionId,
      });
      toast({
        title: "Error During Check-in",
        description: errorMsg,
        variant: "destructive",
      });
    } finally {
      setIsCheckingIn(false);
    }
  };

  const isCheckedInForCurrentSession = attendanceSession?.status === 'open' && persistedCheckInDetails?.sessionId === attendanceSession.sessionId;

  if (authLoading || (!user && !authLoading)) { // Corrected isLoading to authLoading
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
        <p className="ml-4 mt-4 text-lg text-muted-foreground">Loading Student Dashboard...</p>
      </div>
    );
  }
  if (!user) return null; // Should be redirected by AuthContext


  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <div className="container mx-auto max-w-2xl">
        <header className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-primary flex items-center">
            <BookOpen className="w-8 h-8 mr-2" />
            AttendEase
          </h1>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden sm:inline">
              {user.id}
            </span>
            <ModeToggle />
            <Button variant="outline" onClick={logout} size="sm">
              <LogOut className="mr-2 h-4 w-4" /> Logout
            </Button>
          </div>
        </header>

        <Card className="mb-6 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center text-xl">
              <Smartphone className="mr-2 h-5 w-5 text-primary" /> 
              Device Setup
            </CardTitle>
            <CardDescription>
              Ensure your Bluetooth device is selected for attendance.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <BluetoothScanner 
              onDeviceSelected={handleDeviceSelection} 
              selectedDeviceId={deviceId}
            />
             {!deviceId && (
                <p className="text-amber-600 dark:text-amber-500 text-xs mt-3 flex items-center">
                    <AlertTriangle className="inline mr-1 h-4 w-4" />
                    A Bluetooth device must be selected to enable check-in.
                </p>
            )}
          </CardContent>
        </Card>

        <Card className="mb-6 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center text-xl">
              <UserCheck className="mr-2 h-5 w-5 text-primary" /> 
              Attendance Session
            </CardTitle>
             <CardDescription>
              Status of the current attendance session.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isSessionLoading && !attendanceSession ? (
              <div className="flex items-center text-muted-foreground py-3">
                <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading session status...
              </div>
            ) : attendanceSession?.status === 'open' ? (
              <>
                <div className="p-3 border rounded-md bg-green-50 dark:bg-green-900/30 border-green-300 dark:border-green-700">
                  <p className="font-semibold text-green-700 dark:text-green-400 flex items-center">
                    <CheckCircle className="w-5 h-5 mr-2" /> Session is OPEN (ID: {attendanceSession.sessionId})
                  </p>
                  {attendanceSession.autoCloseTime && timeRemaining && (
                    <p className="text-xs text-muted-foreground mt-1">Closes {timeRemaining}.</p>
                  )}
                   {!attendanceSession.autoCloseTime && (
                    <p className="text-xs text-muted-foreground mt-1">Session will be closed manually by instructor.</p>
                  )}
                </div>
                {isCheckedInForCurrentSession ? (
                  <div className="p-3 border rounded-md bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-400">
                    <p className="font-medium flex items-center">
                      <Info className="w-5 h-5 mr-2" /> You are already checked in for this session.
                    </p>
                     {persistedCheckInDetails && <p className="text-xs mt-1">Checked in at: {format(parseISO(persistedCheckInDetails.timestamp), "PPpp")}</p>}
                  </div>
                ) : (
                  <Button 
                    className="w-full text-lg py-3 bg-primary hover:bg-primary/90" 
                    onClick={handleCheckIn} 
                    disabled={isCheckingIn || !deviceId || authLoading}
                  >
                    {isCheckingIn ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <UserCheck className="mr-2 h-5 w-5" />}
                    Check In Now
                  </Button>
                )}
              </>
            ) : (
               <div className="p-3 border rounded-md bg-amber-50 dark:bg-amber-900/30 border-amber-300 dark:border-amber-700">
                <p className="font-medium text-amber-700 dark:text-amber-500 flex items-center">
                  <XCircle className="w-5 h-5 mr-2" /> 
                  No attendance session is currently open.
                </p>
                {attendanceSession?.sessionId && (attendanceSession.status === 'closed_manual' || attendanceSession.status === 'closed_timeout') &&
                  <p className="text-xs text-muted-foreground mt-1">Last session (ID: {attendanceSession.sessionId}) is closed.</p>
                }
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Display immediate API attempt status */}
        {lastApiAttemptStatus && lastApiAttemptStatus.forSessionId === attendanceSession?.sessionId && (
          <Card className={`mb-6 ${lastApiAttemptStatus.success ? "border-green-500" : "border-red-500"} shadow-md`}>
            <CardContent className="p-4">
              <p className={`text-sm font-medium flex items-center ${lastApiAttemptStatus.success ? "text-green-600" : "text-red-600"}`}>
                {lastApiAttemptStatus.success ? <CheckCircle className="mr-2 h-5 w-5" /> : <AlertTriangle className="mr-2 h-5 w-5" />}
                {lastApiAttemptStatus.message}
              </p>
            </CardContent>
          </Card>
        )}

        {persistedCheckInDetails && (
            <Card className="shadow-lg border-primary/20">
                <CardHeader>
                    <CardTitle className="flex items-center text-xl">
                        <History className="mr-2 h-5 w-5 text-primary" />
                        Your Last Successful Check-in
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm">
                        <span className="font-medium">Session ID:</span> {persistedCheckInDetails.sessionId}
                    </p>
                    <p className="text-sm">
                        <span className="font-medium">Time:</span> {format(parseISO(persistedCheckInDetails.timestamp), "PPpp")}
                    </p>
                     {persistedCheckInDetails.studentId !== user.id && (
                        <p className="text-xs text-destructive mt-1">Note: This check-in was for a different student ID.</p>
                    )}
                </CardContent>
            </Card>
        )}

      </div>
    </div>
  );
}

