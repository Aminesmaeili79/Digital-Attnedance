
"use client";

import type { CheckInData } from '@/types';
import { useState, useEffect, useCallback } from 'react';
import AttendanceTable from './attendance-table';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { WifiOff, Loader2, ServerCrash } from 'lucide-react'; // WifiOff can represent general connection issues
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';

const POLLING_INTERVAL = 5000; // 5 seconds, matches session status poll
const API_ENDPOINT_LIST = '/api/list';

// Generate a simple client-side ID if API doesn't provide one, for React keys
let idCounter = 0;
const generateId = () => `client-checkin-${idCounter++}`;

interface DashboardClientProps {
  currentSessionId: string | null;
}

export default function DashboardClient({ currentSessionId }: DashboardClientProps) {
  const [checkIns, setCheckIns] = useState<CheckInData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchCheckIns = useCallback(async (isInitialLoad = false) => {
    if (!isInitialLoad) {
      // For subsequent polls, don't show full loading state
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      const response = await fetch(API_ENDPOINT_LIST);
      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`API Error: ${response.status} ${response.statusText}. ${errorData}`);
      }
      const allData: any[] = await response.json();
      
      // Filter for current session if one is active, otherwise show all (or none if that's preferred)
      // For this app, we'll filter to only show current session's check-ins.
      const relevantData = currentSessionId 
        ? allData.filter(item => item.sessionId === currentSessionId) 
        : []; // Show no checkins if no session is active/selected. Can be changed to allData if needed.

      const processedData = relevantData.map(item => ({
        ...item,
        id: item.id || generateId(), 
      })).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      setCheckIns(processedData);

      if (isInitialLoad && currentSessionId) { // Only toast initial load if there's a session to load for
         toast({
          title: "Attendance List Loaded",
          description: `Fetched ${processedData.length} check-ins for session ${currentSessionId}.`,
          variant: "default",
        });
      }

    } catch (err) {
      console.error("Failed to fetch check-ins:", err);
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(errorMessage);
      if (isInitialLoad) {
        toast({
          title: "Error Fetching Check-ins",
          description: errorMessage,
          variant: "destructive",
        });
      }
    } finally {
      if (isInitialLoad) {
        setIsLoading(false);
      }
    }
  }, [toast, currentSessionId]); // Add currentSessionId as a dependency

  useEffect(() => {
    // Fetch initially only if there is a current session ID or it's the very first load.
    // Subsequent calls inside setInterval will use the currentSessionId from the state.
    fetchCheckIns(true); 

    const intervalId = setInterval(() => fetchCheckIns(false), POLLING_INTERVAL);

    return () => clearInterval(intervalId); // Cleanup on unmount
  }, [fetchCheckIns]); // fetchCheckIns itself depends on currentSessionId

  // This effect specifically handles re-fetching when the currentSessionId changes
  // (e.g., instructor starts a new session).
  useEffect(() => {
    if (currentSessionId !== undefined) { // Check if currentSessionId is set (could be null initially)
      fetchCheckIns(true); // Treat as an initial load for the new session
    }
  }, [currentSessionId]); // Re-run when currentSessionId changes


  if (isLoading && !checkIns.length) { // Show skeleton only on true initial load with no data yet
    return (
      <Card className="flex-grow">
        <CardContent className="p-6 h-full">
          <div className="space-y-4">
            <div className="flex items-center justify-center text-muted-foreground py-8">
              <Loader2 className="w-8 h-8 mr-2 animate-spin text-primary" />
              <p className="text-lg">Loading attendance list...</p>
            </div>
            {[...Array(3)].map((_, i) => ( // Reduced skeleton items
              <div key={i} className="flex items-center space-x-4 p-2 border rounded-md">
                <Skeleton className="h-8 w-1/4" />
                <Skeleton className="h-8 w-1/2" />
                <Skeleton className="h-8 w-1/4" />
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
              Could not load check-in data. Retrying automatically...
            </AlertDescription>
             <Button onClick={() => fetchCheckIns(true)} variant="outline" size="sm" className="mt-2">
                Retry Manually
            </Button>
          </Alert>
        )}
        <div className="flex-grow">
         <AttendanceTable checkIns={checkIns} currentSessionId={currentSessionId} />
        </div>
         {!currentSessionId && !isLoading && !error && (
            <div className="text-center text-muted-foreground p-4">
                No active attendance session to display check-ins for. Start a session above.
            </div>
        )}
      </CardContent>
    </Card>
  );
}

