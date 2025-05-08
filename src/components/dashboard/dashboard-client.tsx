"use client";

import type { CheckInData, AttendanceSession } from '@/types';
import { useState, useEffect, useCallback } from 'react';
import AttendanceTable from './attendance-table';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, ServerCrash } from 'lucide-react'; 
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';

const POLLING_INTERVAL = 5000; 
const API_ENDPOINT_LIST = '/api/list';

let idCounter = 0;
const generateId = () => `client-checkin-${idCounter++}`;

interface DashboardClientProps {
  currentSessionId: string | null;
  currentSessionStatus: AttendanceSession['status'] | null;
  currentSessionClassId: string | null; // Added to know which class the session is for
  onCheckInsUpdate?: (checkIns: CheckInData[]) => void; // Callback to pass check-ins up
}

export default function DashboardClient({ 
  currentSessionId, 
  currentSessionStatus,
  currentSessionClassId,
  onCheckInsUpdate 
}: DashboardClientProps) {
  const [checkIns, setCheckIns] = useState<CheckInData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchCheckIns = useCallback(async (isInitialLoad = false) => {
    if (isInitialLoad) {
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
      
      // Filter check-ins relevant to the currently active session ID
      const relevantData = currentSessionId 
        ? allData.filter(item => item.sessionId === currentSessionId) 
        : []; 

      const processedData = relevantData.map(item => ({
        ...item,
        id: item.id || generateId(), 
      })).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      setCheckIns(processedData);
      if (onCheckInsUpdate) {
        onCheckInsUpdate(processedData); // Pass updated check-ins to parent
      }

      if (isInitialLoad && currentSessionId && currentSessionStatus === 'open') { 
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
  }, [toast, currentSessionId, currentSessionStatus, onCheckInsUpdate]); 

  useEffect(() => {
    // Initial fetch or when session ID changes
    if (currentSessionId) {
        fetchCheckIns(true);
    } else {
        setCheckIns([]); // Clear check-ins if no session is active
        if (onCheckInsUpdate) onCheckInsUpdate([]);
        setIsLoading(false);
    }
    
    const intervalId = setInterval(() => {
      if (currentSessionStatus === 'open' && currentSessionId) {
        fetchCheckIns(false);
      }
    }, POLLING_INTERVAL);

    return () => clearInterval(intervalId);
  }, [fetchCheckIns, currentSessionId, currentSessionStatus, onCheckInsUpdate]);


  if (isLoading && !checkIns.length && currentSessionId) { 
    return (
      <Card className="flex-grow mt-6 md:mt-0">
        <CardContent className="p-6 h-full">
          <div className="space-y-4">
            <div className="flex items-center justify-center text-muted-foreground py-8">
              <Loader2 className="w-8 h-8 mr-2 animate-spin text-primary" />
              <p className="text-lg">Loading attendance list for current session...</p>
            </div>
            {[...Array(3)].map((_, i) => ( 
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
    <Card className="flex-grow flex flex-col shadow-lg mt-6 md:mt-0">
      <CardContent className="p-4 md:p-6 flex-grow flex flex-col">
        {error && (
          <Alert variant="destructive" className="mb-4">
            <ServerCrash className="h-5 w-5" />
            <AlertTitle>Connection Error</AlertTitle>
            <AlertDescription>
              {error}
              <br />
              Could not load check-in data. Retrying automatically if session is open...
            </AlertDescription>
             <Button onClick={() => fetchCheckIns(true)} variant="outline" size="sm" className="mt-2">
                Retry Manually
            </Button>
          </Alert>
        )}
        <div className="flex-grow">
         <AttendanceTable 
            checkIns={checkIns} 
            currentSessionId={currentSessionId} 
            sessionStatus={currentSessionStatus} 
          />
        </div>
         {!currentSessionId && !isLoading && !error && (
            <div className="text-center text-muted-foreground p-4 mt-4 border border-dashed rounded-md">
                No active attendance session to display check-ins for. Select a class and start a session.
            </div>
        )}
         {currentSessionId && checkIns.length === 0 && !isLoading && !error && (
            <div className="text-center text-muted-foreground p-4 mt-4 border border-dashed rounded-md">
                No check-ins yet for session {currentSessionId}.
                {currentSessionStatus === 'open' && " Waiting for students..."}
            </div>
         )}
      </CardContent>
    </Card>
  );
}
