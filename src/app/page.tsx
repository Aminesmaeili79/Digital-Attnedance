
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
      toast({ title: 'Manual Check-in Failed', description: (error as Error).message, variant: 'destructive' });
    } finally {
      setIsSubmittingManualCheckIn(false);
    }
  };

  const getClassNameById = (classId: string | null | undefined): string => {
    if (!classId) return "Unknown Class";
    const foundClass = classes.find(c => c.id === classId);
    return foundClass ? `${foundClass.courseName} - ${foundClass.sessionNumber}` : "Unknown Class";
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
      return <p className="text-muted-foreground flex items-center"><Info className="w-5 h-5 mr-2 text-primary" />No active session. Select a class and click "Start Session" to begin.</p>;
    }
    
    const sessionClassName = getClassNameById(attendanceSession.classId);

    if (attendanceSession.status === 'open') {
      return (
        <div className="text-green-600 dark:text-green-400">
          <p className="font-semibold flex items-center"><CheckCircle className="w-5 h-5 mr-2" />Session OPEN for {sessionClassName} (ID: {attendanceSession.sessionId})</p>
          {attendanceSession.startTime && <p className="text-xs">Started: {format(parseISO(attendanceSession.startTime), "PPpp")}</p>}
          {timeRemaining && <p className="text-xs">Closes {timeRemaining}.</p>}
          {!attendanceSession.autoCloseTime && <p className="text-xs">Session running indefinitely (close manually).</p>}
        </div>
      );
    }
    if (attendanceSession.status === 'closed_manual' || attendanceSession.status === 'closed_timeout') {
      return (
        <div className="text-red-600 dark:text-red-400">
          <p className="font-semibold flex items-center"><StopCircle className="w-5 h-5 mr-2" />Session CLOSED for {sessionClassName} (ID: {attendanceSession.sessionId})</p>
          {attendanceSession.endTime && <p className="text-xs">Closed: {format(parseISO(attendanceSession.endTime), "PPpp")}</p>}
          {attendanceSession.status === 'closed_timeout' && <p className="text-xs">(Automatically closed)</p>}
          {attendanceSession.status === 'closed_manual' && <p className="text-xs">(Manually closed)</p>}
        </div>
      );
    }
    return <p className="text-muted-foreground">Session status unknown.</p>;
  };


  return (
    <div className="min-h-screen p-4 md:p-6 flex flex-col bg-secondary/30">
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
          <Button variant="outline" onClick={logout} size="sm">
            <LogOut className="mr-2 h-4 w-4" /> Logout
          </Button>
        </div>
      </header>

      {/* Classes Section */}
      <section className="mb-6 md:mb-8">
        <h2 className="text-2xl font-semibold mb-4 text-foreground flex items-center">
          <ListChecks className="w-7 h-7 mr-2 text-primary" /> Scheduled Classes
        </h2>
        {classes.length === 0 ? (
          <p className="text-muted-foreground">No classes scheduled.</p>
        ) : (
          <ScrollArea className="h-[250px] md:h-[300px] pr-3">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {classes.map((courseClass) => {
                const isSelected = selectedClassId === courseClass.id;
                const isActiveSessionForThisClass = attendanceSession?.status === 'open' && attendanceSession.classId === courseClass.id;
                const attendanceCount = isActiveSessionForThisClass ? activeSessionCheckIns.length : 0;
                const timeStatus = isPast(parseISO(courseClass.scheduledTime)) ? "Past" : isFuture(parseISO(courseClass.scheduledTime)) ? "Upcoming" : "Now";

                return (
                  <Card 
                    key={courseClass.id} 
                    className={`shadow-md hover:shadow-lg transition-shadow cursor-pointer ${isSelected ? 'border-2 border-primary ring-2 ring-primary/50' : 'border-border'}`}
                    onClick={() => setSelectedClassId(courseClass.id)}
                  >
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center justify-between">
                        <span className="truncate flex items-center"> 
                           <BookMarked className={`w-5 h-5 mr-2 ${isSelected ? 'text-primary': 'text-muted-foreground'}`} />
                          {courseClass.courseName}
                        </span>
                        {isSelected && <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 ml-2" />}
                      </CardTitle>
                      <CardDescription>{courseClass.sessionNumber}</CardDescription>
                    </CardHeader>
                    <CardContent className="text-sm space-y-1.5 pb-3">
                       <p className="flex items-center"><CalendarDays className="w-4 h-4 mr-2 text-muted-foreground" /> {format(parseISO(courseClass.scheduledTime), "MMM d, yyyy h:mm a")} <Badge variant={timeStatus === 'Past' ? 'outline' : timeStatus === 'Upcoming' ? 'secondary' : 'default'} className="ml-auto text-xs">{timeStatus}</Badge></p>
                      <p className="flex items-center"><Home className="w-4 h-4 mr-2 text-muted-foreground" /> {courseClass.classroom}</p>
                      <p className="flex items-center"><Users className="w-4 h-4 mr-2 text-muted-foreground" /> 
                        Attendance: {attendanceCount} / {courseClass.totalStudents}
                      </p>
                    </CardContent>
                    <CardFooter className="p-3 pt-0">
                       <Button 
                        variant={isSelected ? "default" : "outline"} 
                        size="sm" 
                        className="w-full"
                        onClick={(e) => { e.stopPropagation(); setSelectedClassId(courseClass.id); }}
                      >
                        {isSelected ? <Check className="mr-2 h-4 w-4"/> : null}
                        {isSelected ? 'Selected' : 'Select Class'}
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </section>


      <div className="grid md:grid-cols-3 gap-6 md:gap-8 mb-6 md:mb-8">
        <Card className="md:col-span-2 shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl">Attendance Session Control</CardTitle>
            <CardDescription>
              Manage student check-in for {selectedClassId ? `class: ${getClassNameById(selectedClassId)}` : "selected class"}.
              Session ID: {attendanceSession?.sessionId || "N/A"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 border rounded-md bg-card">
              {renderSessionStatus()}
            </div>
            
            {attendanceSession?.status !== 'open' && (
              <div className="flex flex-col sm:flex-row gap-4 items-end pt-2">
                <div className="flex-grow">
                  <Label htmlFor="duration" className="flex items-center mb-1 text-sm">
                    <Timer className="w-4 h-4 mr-1 text-muted-foreground" /> Duration (minutes, optional)
                  </Label>
                  <Input 
                    id="duration" 
                    type="number" 
                    placeholder="e.g., 15 (blank for manual close)" 
                    value={durationInput} 
                    onChange={(e) => setDurationInput(e.target.value)} 
                    className="text-base"
                    disabled={isSubmittingSessionAction || !selectedClassId || attendanceSession?.status === 'open'}
                  />
                </div>
                <Button 
                  onClick={handleStartSession} 
                  disabled={isSubmittingSessionAction || !selectedClassId || attendanceSession?.status === 'open'}
                  className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white"
                >
                  {isSubmittingSessionAction ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <PlayCircle className="mr-2 h-5 w-5" />}
                  Start Session
                </Button>
              </div>
            )}
             {!selectedClassId && attendanceSession?.status !== 'open' && (
                <p className="text-sm text-amber-600 flex items-center"><AlertTriangle className="w-4 h-4 mr-1"/> Please select a class to start a new session.</p>
            )}

            {attendanceSession?.status === 'open' && (
              <Button 
                onClick={handleEndSession} 
                disabled={isSubmittingSessionAction}
                variant="destructive"
                className="w-full sm:w-auto mt-2"
              >
                {isSubmittingSessionAction ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <StopCircle className="mr-2 h-5 w-5" />}
                End Current Session
              </Button>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl">Manual Student Check-in</CardTitle>
            <CardDescription>Manually record attendance for a student.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {attendanceSession?.status === 'open' ? (
              <div className="flex flex-col sm:flex-row gap-4 items-end">
                <div className="flex-grow">
                  <Label htmlFor="manualStudentId" className="flex items-center mb-1 text-sm">
                    <UserPlus className="w-4 h-4 mr-1 text-muted-foreground" /> Student ID
                  </Label>
                  <Input
                    id="manualStudentId"
                    type="text"
                    placeholder="Enter Student ID"
                    value={manualStudentId}
                    onChange={(e) => setManualStudentId(e.target.value)}
                    className="text-base"
                    disabled={isSubmittingManualCheckIn}
                  />
                </div>
                <Button
                  onClick={handleManualCheckInStudent}
                  disabled={isSubmittingManualCheckIn || !manualStudentId.trim()}
                  className="w-full sm:w-auto"
                >
                  {isSubmittingManualCheckIn ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <UserPlus className="mr-2 h-5 w-5" />}
                  Check-in
                </Button>
              </div>
            ) : (
              <p className="text-muted-foreground text-sm flex items-center">
                <Info className="w-4 h-4 mr-2 text-primary" />
                Manual check-in available during an open session.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <DashboardClient 
        currentSessionId={attendanceSession?.sessionId || null} 
        currentSessionStatus={attendanceSession?.status || null}
        currentSessionClassId={attendanceSession?.classId || null}
        onCheckInsUpdate={(updatedCheckIns) => setActiveSessionCheckIns(updatedCheckIns)}
      />
    </div>
  );
}
