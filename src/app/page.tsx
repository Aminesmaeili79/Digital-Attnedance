
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import DashboardClient from '@/components/dashboard/dashboard-client';
import { ModeToggle } from '@/components/mode-toggle';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ClipboardList, LogOut, Loader2, PlayCircle, StopCircle, Timer, Info, AlertTriangle, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { AttendanceSession } from '@/types';
import { format, formatDistanceToNowStrict, parseISO } from 'date-fns';

const SESSION_POLL_INTERVAL = 5000; // 5 seconds for session status

export default function InstructorDashboardPage() {
  const { user, logout, isLoading: authLoading } = useAuth();
  const router = useRouter(); 
  const { toast } = useToast();

  const [attendanceSession, setAttendanceSession] = useState<AttendanceSession | null>(null);
  const [isSessionLoading, setIsSessionLoading] = useState<boolean>(true);
  const [durationInput, setDurationInput] = useState<string>(''); // Duration in minutes
  const [isSubmittingSessionAction, setIsSubmittingSessionAction] = useState<boolean>(false);
  const [timeRemaining, setTimeRemaining] = useState<string | null>(null);


  const fetchSessionStatus = useCallback(async () => {
    if (user?.role !== 'instructor' && !authLoading) return;

    // Only set full loading state on initial fetch, not for background polls
    if (!attendanceSession) {
        setIsSessionLoading(true);
    }
    try {
      const response = await fetch('/api/attendance/status');
      if (!response.ok) {
        throw new Error('Failed to fetch session status');
      }
      const sessionData: AttendanceSession = await response.json();
      setAttendanceSession(sessionData);
    } catch (error) {
      console.error('Error fetching session status:', error);
      if (!attendanceSession) { // Only toast if it's the initial load failing
        toast({
          title: 'Error Fetching Session',
          description: (error as Error).message || 'Could not retrieve session status.',
          variant: 'destructive',
        });
      }
    } finally {
      // Always ensure loading is false after an attempt, even if it was a background poll
      setIsSessionLoading(false);
    }
  }, [toast, user, authLoading, attendanceSession]); // added attendanceSession to dep array

  useEffect(() => {
    if (!authLoading && user?.role === 'instructor') {
      fetchSessionStatus(); 
      const intervalId = setInterval(fetchSessionStatus, SESSION_POLL_INTERVAL);
      return () => clearInterval(intervalId);
    }
  }, [fetchSessionStatus, authLoading, user]);
  

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


  const handleStartSession = async () => {
    setIsSubmittingSessionAction(true);
    try {
      const duration = durationInput ? parseInt(durationInput, 10) : null;
      if (durationInput && (isNaN(duration!) || duration! <= 0)) {
        toast({ title: "Invalid Duration", description: "Duration must be a positive number.", variant: "destructive" });
        setIsSubmittingSessionAction(false);
        return;
      }

      const response = await fetch('/api/attendance/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ durationMinutes: duration }),
      });
      const updatedSession = await response.json();
      if (!response.ok) {
        throw new Error(updatedSession.message || 'Failed to start session');
      }
      setAttendanceSession(updatedSession); // This will trigger DashboardClient to update for the new session
      toast({ title: 'Session Started', description: `Attendance session is now open.${duration ? ` Closes in ${duration} minutes.` : ''}`, variant: 'default', className: 'bg-green-500 text-white dark:bg-green-600'});
      setDurationInput(''); 
    } catch (error) {
      toast({ title: 'Error Starting Session', description: (error as Error).message, variant: 'destructive' });
    } finally {
      setIsSubmittingSessionAction(false);
    }
  };

  const handleEndSession = async () => {
    setIsSubmittingSessionAction(true);
    try {
      const response = await fetch('/api/attendance/end', { method: 'POST' });
      const updatedSession = await response.json();
      if (!response.ok) {
        throw new Error(updatedSession.message || 'Failed to end session');
      }
      setAttendanceSession(updatedSession); // Session ID remains, status changes. DashboardClient will show this session's data.
      toast({ title: 'Session Ended', description: 'Attendance session has been manually closed.', variant: 'default' });
    } catch (error) {
      toast({ title: 'Error Ending Session', description: (error as Error).message, variant: 'destructive' });
    } finally {
      setIsSubmittingSessionAction(false);
    }
  };


  if (authLoading || !user || user.role !== 'instructor') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
        <p className="ml-4 mt-4 text-lg text-muted-foreground">Loading Dashboard...</p>
      </div>
    );
  }

  const renderSessionStatus = () => {
    if (isSessionLoading && !attendanceSession) return <p className="text-muted-foreground flex items-center"><Loader2 className="w-4 h-4 mr-2 animate-spin" />Loading session status...</p>;
    if (!attendanceSession || attendanceSession.status === 'not_started' || !attendanceSession.sessionId) {
      return <p className="text-muted-foreground flex items-center"><Info className="w-5 h-5 mr-2 text-blue-500" />No active session. Click "Start Attendance" to begin.</p>;
    }
    if (attendanceSession.status === 'open') {
      return (
        <div className="text-green-600 dark:text-green-400">
          <p className="font-semibold flex items-center"><CheckCircle className="w-5 h-5 mr-2" />Session OPEN (ID: {attendanceSession.sessionId})</p>
          {attendanceSession.startTime && <p className="text-xs">Started: {format(parseISO(attendanceSession.startTime), "PPpp")}</p>}
          {timeRemaining && <p className="text-xs">Closes {timeRemaining}.</p>}
          {!attendanceSession.autoCloseTime && <p className="text-xs">Session running indefinitely (close manually).</p>}
        </div>
      );
    }
    if (attendanceSession.status === 'closed_manual' || attendanceSession.status === 'closed_timeout') {
      return (
        <div className="text-red-600 dark:text-red-400">
          <p className="font-semibold flex items-center"><StopCircle className="w-5 h-5 mr-2" />Session CLOSED (ID: {attendanceSession.sessionId})</p>
          {attendanceSession.endTime && <p className="text-xs">Closed: {format(parseISO(attendanceSession.endTime), "PPpp")}</p>}
          {attendanceSession.status === 'closed_timeout' && <p className="text-xs">(Automatically closed)</p>}
          {attendanceSession.status === 'closed_manual' && <p className="text-xs">(Manually closed)</p>}
        </div>
      );
    }
    return <p className="text-muted-foreground">Session status unknown.</p>;
  };


  return (
    <div className="min-h-screen p-4 md:p-8 flex flex-col">
      <header className="mb-6 md:mb-8 flex flex-wrap justify-between items-center gap-4">
        <h1 className="text-3xl md:text-4xl font-bold text-primary flex items-center">
          <ClipboardList className="w-8 h-8 md:w-10 md:h-10 mr-2 md:mr-3" />
          AttendEase Dashboard
        </h1>
        <div className="flex items-center space-x-2 md:space-x-4">
          <span className="text-sm text-muted-foreground hidden sm:inline">
            Welcome, {user.id} (Instructor)
          </span>
          <ModeToggle />
          <Button variant="outline" onClick={logout}>
            <LogOut className="mr-2 h-4 w-4" /> Logout
          </Button>
        </div>
      </header>

      <Card className="mb-6 md:mb-8 shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl">Attendance Session Control</CardTitle>
          <CardDescription>Manage the student check-in period. Current Session ID: {attendanceSession?.sessionId || "N/A"}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-3 border rounded-md bg-secondary/30">
            {renderSessionStatus()}
          </div>
          
          {(!attendanceSession || attendanceSession.status === 'not_started' || attendanceSession.status === 'closed_manual' || attendanceSession.status === 'closed_timeout') && (
            <div className="flex flex-col sm:flex-row gap-4 items-end">
              <div className="flex-grow">
                <Label htmlFor="duration" className="flex items-center mb-1">
                  <Timer className="w-4 h-4 mr-1 text-muted-foreground" /> Duration (minutes, optional)
                </Label>
                <Input 
                  id="duration" 
                  type="number" 
                  placeholder="e.g., 15 (leave blank for manual close)" 
                  value={durationInput} 
                  onChange={(e) => setDurationInput(e.target.value)} 
                  className="text-base"
                  disabled={isSubmittingSessionAction}
                />
              </div>
              <Button 
                onClick={handleStartSession} 
                disabled={isSubmittingSessionAction || attendanceSession?.status === 'open'}
                className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white"
              >
                {isSubmittingSessionAction ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <PlayCircle className="mr-2 h-5 w-5" />}
                Start New Session
              </Button>
            </div>
          )}

          {attendanceSession?.status === 'open' && (
            <Button 
              onClick={handleEndSession} 
              disabled={isSubmittingSessionAction}
              variant="destructive"
              className="w-full sm:w-auto"
            >
              {isSubmittingSessionAction ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <StopCircle className="mr-2 h-5 w-5" />}
              End Current Session
            </Button>
          )}
        </CardContent>
      </Card>

      <DashboardClient 
        currentSessionId={attendanceSession?.sessionId || null} 
        currentSessionStatus={attendanceSession?.status || null}
      />
    </div>
  );
}

