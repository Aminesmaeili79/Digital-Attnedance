'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { Button } from '@/components/ui/button';
import { ModeToggle } from '@/components/mode-toggle';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UserCheck, LogOut, BookOpen, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import Image from 'next/image';

export default function StudentDashboardPage() {
  const { user, logout, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'student')) {
      router.replace('/login');
    }
  }, [user, isLoading, router]);

  if (isLoading || !user || user.role !== 'student') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
        <p className="ml-4 mt-4 text-lg text-muted-foreground">Loading Student Dashboard...</p>
      </div>
    );
  }

  // Placeholder data - replace with actual data fetching
  const attendanceStatus = {
    checkedIn: Math.random() > 0.5, // Simulate if checked in for a current class
    lastCheckIn: new Date(Date.now() - Math.random() * 1000 * 60 * 60 * 24).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  };
  const upcomingClasses = [
    { id: 1, name: 'Calculus 101', time: 'Tomorrow, 10:00 AM', room: 'Room A301' },
    { id: 2, name: 'Physics for Engineers', time: 'Tomorrow, 02:00 PM', room: 'Lab B12' },
  ];

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
              <p className="text-xs text-muted-foreground">Your student identifier</p>
              <Button variant="link" className="p-0 h-auto mt-3 text-sm" disabled>Edit Profile (Soon)</Button>
            </CardContent>
          </Card>

          <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg font-medium">Attendance Status</CardTitle>
              {attendanceStatus.checkedIn ? <CheckCircle className="h-6 w-6 text-green-500" /> : <AlertTriangle className="h-6 w-6 text-yellow-500" />}
            </CardHeader>
            <CardContent>
               {attendanceStatus.checkedIn ? (
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">Checked In</p>
              ) : (
                <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">Not Checked In</p>
              )}
              <p className="text-xs text-muted-foreground">
                Last activity: {attendanceStatus.lastCheckIn}
              </p>
              <Button className="mt-3 w-full" disabled={attendanceStatus.checkedIn}>
                <BookOpen className="mr-2 h-4 w-4" /> Check-in to Class (Soon)
              </Button>
            </CardContent>
          </Card>
          
          <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader>
              <CardTitle className="text-lg font-medium">Upcoming Classes</CardTitle>
              <CardDescription>Your schedule for the next 24 hours.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {upcomingClasses.length > 0 ? (
                upcomingClasses.map(cls => (
                  <div key={cls.id} className="text-sm p-2 bg-secondary/50 rounded-md">
                    <p className="font-semibold">{cls.name}</p>
                    <p className="text-muted-foreground">{cls.time} - {cls.room}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No upcoming classes in the next 24 hours.</p>
              )}
            </CardContent>
          </Card>

          <Card className="lg:col-span-3 shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader>
              <CardTitle className="text-lg font-medium">Announcements</CardTitle>
               <CardDescription>Important updates and notifications.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="p-4 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg text-center">
                <p className="text-blue-700 dark:text-blue-300">
                  Welcome to the new Student Portal! More features coming soon.
                </p>
              </div>
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
