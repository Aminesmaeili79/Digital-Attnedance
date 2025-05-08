
'use client';

import { useState, type FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { LogIn, User, KeyRound, Users, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'instructor' | 'student'>('student');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login, user, isLoading } = useAuth();
  const router = useRouter();

  // Redundant redirection useEffect removed, AuthContext handles this.
  // useEffect(() => {
  //   if (!isLoading && user) {
  //     // If user is already logged in, redirect them
  //     if (user.role === 'instructor') {
  //       router.replace('/');
  //     } else {
  //       router.replace('/student/dashboard');
  //     }
  //   }
  // }, [user, isLoading, router]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 500));

    if (role === 'instructor') {
      if (userId === 'instructor' && password === 'password') {
        login(userId, role);
        // No direct router.push here, AuthContext will redirect based on new user state
      } else {
        setError('Invalid instructor ID or password.');
      }
    } else if (role === 'student') {
      // For demo, allow "student" / "password" or any ID starting with "S" like "S1001" / "password"
      if ((userId === 'student' && password === 'password') || (userId.toUpperCase().startsWith('S') && password === 'password')) {
        login(userId, role);
        // No direct router.push here, AuthContext will redirect based on new user state
      } else {
        setError('Invalid student ID or password. Try ID "student" or "S1001" with password "password".');
      }
    }
    setIsSubmitting(false);
  };
  
  // Show loading spinner if auth state is loading OR if user is already logged in (and AuthContext is about to redirect)
  if (isLoading || (!isLoading && user)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
        <p className="ml-4 mt-4 text-lg text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background p-4">
      <Card className="w-full max-w-md shadow-2xl border-primary/20">
        <CardHeader className="text-center space-y-2">
          <div className="flex justify-center mb-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" x2="3" y1="12" y2="12"/></svg>
          </div>
          <CardTitle className="text-3xl font-bold text-primary">AttendEase Login</CardTitle>
          <CardDescription className="text-muted-foreground">Sign in to access your dashboard.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <LogIn className="h-4 w-4" />
                <AlertTitle>Login Failed</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="userId" className="flex items-center text-sm">
                <User className="inline-block w-4 h-4 mr-2 text-primary/80" /> User ID
              </Label>
              <Input
                id="userId"
                type="text"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                required
                placeholder="e.g., instructor or S1001"
                className="text-base"
                aria-describedby="userId-hint"
              />
               <p id="userId-hint" className="text-xs text-muted-foreground pl-1">Instructor: instructor, Student: student or Sxxxx</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password" className="flex items-center text-sm">
                <KeyRound className="inline-block w-4 h-4 mr-2 text-primary/80" /> Password
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="text-base"
                 aria-describedby="password-hint"
              />
              <p id="password-hint" className="text-xs text-muted-foreground pl-1">Password: password</p>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center text-sm">
                <Users className="inline-block w-4 h-4 mr-2 text-primary/80" /> Role
              </Label>
              <RadioGroup
                value={role}
                onValueChange={(value) => setRole(value as 'instructor' | 'student')}
                className="flex space-x-4 pt-1"
                aria-label="Select your role"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="student" id="role-student" />
                  <Label htmlFor="role-student" className="font-normal cursor-pointer">Student</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="instructor" id="role-instructor" />
                  <Label htmlFor="role-instructor" className="font-normal cursor-pointer">Instructor</Label>
                </div>
              </RadioGroup>
            </div>
            <Button type="submit" className="w-full text-lg py-3" disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <LogIn className="mr-2 h-5 w-5" />
              )}
              Sign In
            </Button>
          </form>
        </CardContent>
        <CardFooter className="text-center text-xs text-muted-foreground pt-4">
            <p>This is a demo system. Use the provided credentials.</p>
        </CardFooter>
      </Card>
    </div>
  );
}

