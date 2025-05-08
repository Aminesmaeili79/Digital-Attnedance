"use client";

import type { CheckInData } from '@/types';
import { useState, useEffect, useCallback } from 'react';
import AttendanceTable from './attendance-table';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { WifiOff, Loader2, ServerCrash } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';

const POLLING_INTERVAL = 5000; // 5 seconds
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';

// Generate a simple client-side ID if API doesn't provide one, for React keys
let idCounter = 0;
const generateId = () => `client-${idCounter++}`;

export default function DashboardClient() {
  const [checkIns, setCheckIns] = useState<CheckInData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchCheckIns = useCallback(async (isInitialLoad = false) => {
    if (!isInitialLoad) {
      // For subsequent polls, don't show full loading state,
      // but can set a softer loading indicator if desired.
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/list`);
      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`API Error: ${response.status} ${response.statusText}. ${errorData}`);
      }
      const data: any[] = await response.json();
      
      // Ensure each item has an ID for React keys
      const processedData = data.map(item => ({
        ...item,
        id: item.id || generateId(), 
      })).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()); // Sort by most recent first

      setCheckIns(processedData);

      if (isInitialLoad) {
         toast({
          title: "Data Loaded",
          description: "Successfully fetched attendance records.",
          variant: "default",
        });
      }

    } catch (err) {
      console.error("Failed to fetch check-ins:", err);
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(errorMessage);
      if (isInitialLoad) {
        toast({
          title: "Error Fetching Data",
          description: errorMessage,
          variant: "destructive",
        });
      }
    } finally {
      if (isInitialLoad) {
        setIsLoading(false);
      }
    }
  }, [toast]);

  useEffect(() => {
    fetchCheckIns(true); // Initial fetch

    const intervalId = setInterval(() => fetchCheckIns(false), POLLING_INTERVAL);

    return () => clearInterval(intervalId); // Cleanup on unmount
  }, [fetchCheckIns]);

  if (isLoading) {
    return (
      <Card className="flex-grow">
        <CardContent className="p-6 h-full">
          <div className="space-y-4">
            <div className="flex items-center justify-center text-muted-foreground py-8">
              <Loader2 className="w-8 h-8 mr-2 animate-spin text-primary" />
              <p className="text-lg">Loading attendance data...</p>
            </div>
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4 p-2 border rounded-md">
                <Skeleton className="h-8 w-1/3" />
                <Skeleton className="h-8 w-1/3" />
                <Skeleton className="h-8 w-1/3" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="flex-grow flex flex-col shadow-lg">
      <CardContent className="p-4 md:p-6 flex-grow flex flex-col">
        {error && (
          <Alert variant="destructive" className="mb-4">
            <ServerCrash className="h-5 w-5" />
            <AlertTitle>Connection Error</AlertTitle>
            <AlertDescription>
              {error}
              <br />
              Please ensure the local API server is running and accessible.
              Retrying automatically...
            </AlertDescription>
             <Button onClick={() => fetchCheckIns(true)} variant="outline" size="sm" className="mt-2">
                Retry Manually
            </Button>
          </Alert>
        )}
        <div className="flex-grow">
         <AttendanceTable checkIns={checkIns} />
        </div>
      </CardContent>
    </Card>
  );
}
