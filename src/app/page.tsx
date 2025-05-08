
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import DashboardClient from '@/components/dashboard/dashboard-client';
import { ModeToggle } from '@/components/mode-toggle';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { ClipboardList, LogOut, Loader2, PlayCircle, StopCircle, Timer, Info, AlertTriangle, CheckCircle, UserPlus, BookMarked, Clock, Users, Home, CalendarDays, Check, ListChecks } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { AttendanceSession, CourseClass, CheckInData } from '@/types';
import { format, formatDistanceToNowStrict, parseISO, isPast, isFuture } from 'date-fns';
import { Separator } from '@/components/ui/separator';

const SESSION_POLL_INTERVAL = 5000; // 5 seconds for session status

// Mock Data for Classes
const MOCK_CLASSES_DATA: CourseClass[] = [
  { id: 'cls101', courseName: 'Introduction to Algorithmic Thinking', sessionNumber: 'Lecture 3', scheduledTime: new Date(Date.now() + 1 * 60 * 60 * 1000).toISOString(), classroom: 'Auditorium A', totalStudents: 120 },
  { id: 'cls102', courseName: 'Data Structures & Algorithms', sessionNumber: 'Lab Session 2', scheduledTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), classroom: 'CS Lab 1', totalStudents: 35 },
  { id: 'cls103', courseName: 'Web Application Development', sessionNumber: 'Project Workshop', scheduledTime: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), classroom: 'Room 305', totalStudents: 45 },
  { id: 'cls104', courseName: 'Operating Systems', sessionNumber: 'Midterm Exam', scheduledTime: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), classroom: 'Exam Hall B', totalStudents: 70 },
  { id: 'cls105', courseName: 'Calculus II', sessionNumber: 'Tutorial 8', scheduledTime: new Date(Date.now() + 0.5 * 60 * 60 * 1000).toISOString(), classroom: 'Math Room 202', totalStudents: 50 },
].sort((a, b) => new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime());


export default function InstructorDashboardPage() {
  const { user, logout, isLoading: authLoading } = useAuth();
  const router = useRouter(); 
  const { toast } = useToast();

  const [classes, setClasses] = useState<CourseClass[]>(MOCK_CLASSES_DATA);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [attendanceSession, setAttendanceSession] = useState<AttendanceSession | null>(null);
  const [isSessionLoading, setIsSessionLoading] = useState<boolean>(true);
  const [durationInput, setDurationInput] = useState<string>('');
  const [isSubmittingSessionAction, setIsSubmittingSessionAction] = useState<boolean>(false);
  const [timeRemaining, setTimeRemaining] = useState<string | null>(null);
  const [manualStudentId, setManualStudentId] = useState<string>('');
  const [isSubmittingManualCheckIn, setIsSubmittingManualCheckIn] = useState<boolean>(false);
  const [activeSessionCheckIns, setActiveSessionCheckIns] = useState<CheckInData[]>([]);


  const fetchSessionStatus = useCallback(async () => {
    if (user?.role !== 'instructor' && !authLoading) return;

    if (!attendanceSession) setIsSessionLoading(true);
    
    try {
      const response = await fetch('/api/attendance/status');
      if (!response.ok) throw new Error('Failed to fetch session status');
      const sessionData: AttendanceSession = await response.json();
      setAttendanceSession(sessionData);
    } catch (error) {
      console.error('Error fetching session status:', error);
      if (!attendanceSession) { 
        toast({
          title: 'Error Fetching Session',
          description: (error as Error).message || 'Could not retrieve session status.',
          variant: 'destructive',
        });
      }
    } finally {
      setIsSessionLoading(false);
    }
  }, [toast, user, authLoading, attendanceSession]); 

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
          // Session status will be updated on next poll
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
    if (!selectedClassId) {
      toast({ title: "No Class Selected", description: "Please select a class to start an attendance session.", variant: "destructive" });
      return;
    }
    if (attendanceSession?.status === 'open') {
      toast({ title: "Session Already Active", description: "An attendance session is already open. Please end it first.", variant: "destructive" });
      return;
    }

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
        body: JSON.stringify({ durationMinutes: duration, classId: selectedClassId }),
      });
      const updatedSession = await response.json();
      if (!response.ok) {
        throw new Error(updatedSession.message || 'Failed to start session');
      }
      setAttendanceSession(updatedSession); 
      setActiveSessionCheckIns([]); // Reset check-ins for new session
      toast({ title: 'Session Started', description: `Attendance session is now open for the selected class.${duration ? ` Closes in ${duration} minutes.` : ''}`, variant: 'default', className: 'bg-green-500 text-white dark:bg-green-600'});
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
      setAttendanceSession(updatedSession); 
      // activeSessionCheckIns are preserved until a new session starts
      toast({ title: 'Session Ended', description: 'Attendance session has been manually closed.', variant: 'default' });
    } catch (error) {
      toast({ title: 'Error Ending Session', description: (error as Error).message, variant: 'destructive' });
    } finally {
      setIsSubmittingSessionAction(false);
    }
  };

  const handleManualCheckInStudent = async () => {
    if (!manualStudentId.trim()) {
      toast({ title: 'Student ID Required', description: 'Please enter a student ID for manual check-in.', variant: 'destructive' });
      return;
    }
     if (attendanceSession?.status !== 'open') {
      toast({ title: 'Session Not Open', description: 'Manual check-in is only available when a session is open.', variant: 'destructive' });
      return;
    }
    setIsSubmittingManualCheckIn(true);
    try {
      const response = await fetch('/api/manual-check-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: manualStudentId }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || 'Failed to manually check-in student.');
      }
      toast({ title: 'Manual Check-in Successful', description: `Student ${manualStudentId} checked in.`, variant: 'default', className: 'bg-green-500 text-white dark:bg-green-600' });
      setManualStudentId('');
      // DashboardClient will pick up the new check-in on its next poll, which will update activeSessionCheckIns
    } catch (error) {
      toast({ title: 'Error Manually Checking In', description: (error as Error).message, variant: 'destructive' });
    } finally {
      setIsSubmittingManualCheckIn(false);
    }
  };

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'instructor')) {
      router.replace('/login');
    }
  }, [user, authLoading, router]);

  const selectedCourseDetails = selectedClassId ? classes.find(c => c.id === selectedClassId) : null;
  const attendanceCountForSelectedClass = activeSessionCheckIns.filter(ci => ci.sessionId === attendanceSession?.sessionId).length;

  if (authLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
        <p className="mt-4 text-lg text-muted-foreground">Loading Dashboard...</p>
      </div>
    );
  }
  if (!user) return null;


  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar for Class Selection */}
      <aside className="w-80 border-r border-border p-4 flex flex-col space-y-4 bg-card">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-primary flex items-center">
            <ClipboardList className="mr-2" /> AttendEase
          </h2>
          <ModeToggle />
        </div>
        <div className="flex items-center justify-between text-sm">
            <span>Welcome, {user.id}!</span>
            <Button variant="outline" size="sm" onClick={logout}>
              <LogOut className="mr-2 h-4 w-4" /> Logout
            </Button>
        </div>
        <Separator />
        <h3 className="text-lg font-medium text-foreground">Your Classes</h3>
        <ScrollArea className="h-[calc(100vh-250px)]">
            <div className="grid grid-cols-1 gap-3">
              {classes.map((cls) => {
                  const isSelected = selectedClassId === cls.id;
                  const isPastClass = isPast(parseISO(cls.scheduledTime));
                  const isUpcoming = isFuture(parseISO(cls.scheduledTime));
                  
                  let statusBadge: React.ReactNode = null;
                  if (attendanceSession?.classId === cls.id && attendanceSession.status === 'open') {
                    statusBadge = <Badge variant="default" className="ml-auto text-xs bg-green-500 hover:bg-green-600">Session Active</Badge>;
                  } else if (isPastClass && !(attendanceSession?.classId === cls.id && (attendanceSession.status === 'closed_manual' || attendanceSession.status === 'closed_timeout'))) {
                    statusBadge = <Badge variant="outline" className="ml-auto text-xs">Completed</Badge>;
                  } else if (isUpcoming) {
                    statusBadge = <Badge variant="secondary" className="ml-auto text-xs">Upcoming</Badge>;
                  } else if (attendanceSession?.classId === cls.id && (attendanceSession.status === 'closed_manual' || attendanceSession.status === 'closed_timeout')) {
                    statusBadge = <Badge variant="destructive" className="ml-auto text-xs">Session Ended</Badge>;
                  }

                  return (
                    <Card 
                        key={cls.id} 
                        className={`shadow-md transition-all hover:shadow-lg cursor-pointer ${isSelected ? 'border-primary ring-2 ring-primary' : 'border-border'} ${isPastClass && !isSelected ? 'opacity-70' : ''}`}
                        onClick={() => {
                            setSelectedClassId(cls.id);
                            // If a session is open for another class, don't automatically switch view, let instructor handle it.
                            // If a session is open for THIS class, the DashboardClient will show its checkins.
                            // If no session is open, or a session is open for a DIFFERENT class, DashboardClient will show "No active session for this class" or similar.
                        }}
                    >
                      <CardHeader className="pb-2 pt-3 px-3">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-semibold truncate flex items-center">
                                <BookMarked className="w-4 h-4 mr-2 text-primary/80" />
                                {cls.courseName}
                            </CardTitle>
                            {statusBadge}
                        </div>
                        <CardDescription className="text-xs">
                            {cls.sessionNumber} - {cls.classroom}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="text-xs space-y-1 px-3 pb-3">
                        <div className="flex items-center">
                            <CalendarDays className="w-3 h-3 mr-1.5 text-muted-foreground" />
                            Scheduled: {format(parseISO(cls.scheduledTime), 'MMM d, HH:mm')}
                        </div>
                         <div className="flex items-center">
                            <Users className="w-3 h-3 mr-1.5 text-muted-foreground" />
                            {
                                attendanceSession?.classId === cls.id && (attendanceSession.status === 'open' || attendanceSession.status === 'closed_manual' || attendanceSession.status === 'closed_timeout')
                                ? `${activeSessionCheckIns.filter(ci => ci.sessionId === attendanceSession.sessionId).length} / ${cls.totalStudents} Students`
                                : `Total: ${cls.totalStudents} Students`
                            }
                        </div>
                      </CardContent>
                    </Card>
                  );
              })}
            </div>
        </ScrollArea>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-4 md:p-6 flex flex-col space-y-4 overflow-y-auto">
        {/* Session Control & Info */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center text-xl">
                {selectedCourseDetails ? (
                    <>
                        <ListChecks className="mr-2 h-6 w-6 text-primary" /> 
                        Attendance: {selectedCourseDetails.courseName} ({selectedCourseDetails.sessionNumber})
                    </>
                ) : (
                    <>
                        <Info className="mr-2 h-6 w-6 text-muted-foreground" />
                        Select a Class
                    </>
                )}
            </CardTitle>
            <CardDescription>
                {selectedCourseDetails ? 
                    `Manage attendance for ${selectedCourseDetails.classroom}. Scheduled: ${format(parseISO(selectedCourseDetails.scheduledTime), 'PPpp')}` : 
                    "Please select a class from the left panel to manage its attendance session."
                }
            </CardDescription>
          </CardHeader>
          {selectedClassId && (
            <CardContent className="space-y-4">
              {isSessionLoading && !attendanceSession ? (
                <div className="flex items-center p-3 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading session details...
                </div>
              ) : attendanceSession?.status === 'open' ? (
                <div className="p-3 border rounded-md bg-green-50 dark:bg-green-900/30 border-green-300 dark:border-green-700">
                    <div className="flex justify-between items-center">
                        <div>
                            <p className="font-semibold text-green-700 dark:text-green-400 flex items-center">
                            <PlayCircle className="w-5 h-5 mr-2" /> Session OPEN (ID: {attendanceSession.sessionId})
                            </p>
                            {attendanceSession.autoCloseTime && timeRemaining ? (
                                <p className="text-xs text-muted-foreground mt-1 flex items-center"><Timer className="w-3 h-3 mr-1"/> {timeRemaining}</p>
                            ) : !attendanceSession.autoCloseTime ? (
                                <p className="text-xs text-muted-foreground mt-1">Manual close required.</p>
                            ) : null}
                             <p className="text-xs text-muted-foreground mt-0.5">For: {classes.find(c=>c.id === attendanceSession.classId)?.courseName || 'Unknown Class'}</p>
                        </div>
                        <Button 
                            variant="destructive" 
                            size="sm" 
                            onClick={handleEndSession} 
                            disabled={isSubmittingSessionAction}
                        >
                            {isSubmittingSessionAction ? <Loader2 className="h-4 w-4 animate-spin mr-2"/> : <StopCircle className="h-4 w-4 mr-2"/>}
                            End Session
                        </Button>
                    </div>
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <Label htmlFor="duration" className="text-sm font-medium">Session Duration (minutes, optional)</Label>
                    <Input
                        id="duration"
                        type="number"
                        placeholder="e.g., 45 (leave blank for manual end)"
                        value={durationInput}
                        onChange={(e) => setDurationInput(e.target.value)}
                        className="mt-1"
                        disabled={isSubmittingSessionAction || attendanceSession?.status === 'open' || !selectedClassId}
                    />
                  </div>
                  <Button 
                    onClick={handleStartSession} 
                    className="self-end py-2.5 bg-primary hover:bg-primary/90"
                    disabled={isSubmittingSessionAction || attendanceSession?.status === 'open' || !selectedClassId}
                  >
                    {isSubmittingSessionAction ? <Loader2 className="h-5 w-5 animate-spin mr-2"/> : <PlayCircle className="h-5 w-5 mr-2"/>}
                    Start Session
                  </Button>
                </div>
              )}

              {attendanceSession?.status !== 'not_started' && (
                <Badge variant={attendanceSession?.status === 'open' ? 'default' : attendanceSession?.status === 'closed_manual' || attendanceSession?.status === 'closed_timeout' ? 'destructive' : 'secondary'} className={`capitalize ${attendanceSession?.status === 'open' ? 'bg-green-500 hover:bg-green-600' : ''}`}>
                  Session Status: {attendanceSession?.status.replace('_', ' ') || 'Not Started'}
                  {attendanceSession?.status === 'open' && attendanceSession.classId !== selectedClassId && " (For a different class)"}
                </Badge>
              )}


              {/* Manual Student Check-in */}
              {attendanceSession?.status === 'open' && attendanceSession.classId === selectedClassId && (
                <div className="pt-4 border-t">
                    <Label htmlFor="manualStudentId" className="text-sm font-medium">Manual Student Check-in</Label>
                    <div className="flex items-center gap-2 mt-1">
                        <Input
                        id="manualStudentId"
                        type="text"
                        placeholder="Enter Student ID"
                        value={manualStudentId}
                        onChange={(e) => setManualStudentId(e.target.value)}
                        disabled={isSubmittingManualCheckIn}
                        />
                        <Button 
                        onClick={handleManualCheckInStudent} 
                        variant="outline"
                        disabled={isSubmittingManualCheckIn || !manualStudentId.trim()}
                        >
                        {isSubmittingManualCheckIn ? <Loader2 className="h-4 w-4 animate-spin mr-2"/> : <UserPlus className="h-4 w-4 mr-2"/>}
                        Add Student
                        </Button>
                    </div>
                </div>
              )}

            </CardContent>
          )}
           {selectedClassId && attendanceSession && attendanceSession.status !== 'open' && attendanceSession.classId === selectedClassId && (
            <CardFooter>
                <p className="text-sm text-muted-foreground">
                    This session ({attendanceSession.sessionId}) is currently {attendanceSession.status.replace('_', ' ')}.
                    {attendanceSession.endTime && ` Ended at ${format(parseISO(attendanceSession.endTime), 'PPpp')}.`}
                </p>
            </CardFooter>
           )}
           {!selectedClassId && (
             <CardContent>
                <p className="text-center text-muted-foreground py-4">Select a class from the sidebar to view and manage attendance.</p>
             </CardContent>
           )}
        </Card>
        
        {/* Attendance List */}
        <DashboardClient 
          currentSessionId={attendanceSession?.classId === selectedClassId ? attendanceSession?.sessionId : null} 
          currentSessionStatus={attendanceSession?.classId === selectedClassId ? attendanceSession?.status : 'not_started'}
          currentSessionClassId={selectedClassId}
          onCheckInsUpdate={setActiveSessionCheckIns}
        />
      </main>
    </div>
  );
}


    