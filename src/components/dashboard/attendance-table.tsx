"use client";

import type { CheckInData, AttendanceSession } from '@/types';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableCaption,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { UserCircle, Smartphone, Clock, CalendarCheck2, Ticket, Info } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface AttendanceTableProps {
  checkIns: CheckInData[];
  currentSessionId: string | null;
  sessionStatus: AttendanceSession['status'] | null;
}

export default function AttendanceTable({ checkIns, currentSessionId, sessionStatus }: AttendanceTableProps) {
  
  const renderCaption = () => {
    if (!currentSessionId) {
      return "No active or prior session selected to display check-ins for.";
    }
    if (sessionStatus === 'open') {
      return `Live check-ins for current session: ${currentSessionId}. Updates automatically.`;
    }
    if (sessionStatus === 'closed_manual' || sessionStatus === 'closed_timeout') {
      return `Showing check-ins for closed session: ${currentSessionId}.`;
    }
    return `Check-ins for session: ${currentSessionId}.`;
  };

  if (checkIns.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 border border-dashed rounded-lg p-4 text-center">
        <CalendarCheck2 className="w-16 h-16 text-muted-foreground mb-4" />
        <p className="text-muted-foreground text-lg">
          {currentSessionId ? `No check-ins recorded yet for session ${currentSessionId}.` : "No session active."}
        </p>
        {sessionStatus === 'open' && <p className="text-sm text-muted-foreground">Waiting for students to check in...</p>}
         {!currentSessionId && <p className="text-sm text-muted-foreground">Start a session to see live check-ins.</p>}
      </div>
    );
  }

  return (
    <ScrollArea className="h-[calc(100vh-400px)] md:h-[calc(100vh-420px)] rounded-md border shadow-md">
      <Table>
        <TableCaption>
          {renderCaption()}
        </TableCaption>
        <TableHeader className="sticky top-0 bg-card z-10 shadow-sm">
          <TableRow>
            <TableHead className="w-[180px]">
              <div className="flex items-center">
                <UserCircle className="w-5 h-5 mr-2 text-primary" />
                Student ID
              </div>
            </TableHead>
            <TableHead>
              <div className="flex items-center">
                <Smartphone className="w-5 h-5 mr-2 text-primary" />
                Device ID (Simulated Bluetooth)
              </div>
            </TableHead>
            <TableHead className="w-[150px]">
               <div className="flex items-center">
                <Ticket className="w-5 h-5 mr-2 text-primary" />
                Session ID
              </div>
            </TableHead>
            <TableHead className="w-[220px]">
              <div className="flex items-center">
                <Clock className="w-5 h-5 mr-2 text-primary" />
                Timestamp
              </div>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {checkIns.map((checkIn) => {
            let formattedTimestamp = "Invalid Date";
            try {
              const date = parseISO(checkIn.timestamp);
              formattedTimestamp = format(date, "PPpp"); 
            } catch (error) {
              console.error("Error parsing timestamp:", checkIn.timestamp, error);
              formattedTimestamp = checkIn.timestamp; 
            }
            
            // All check-ins passed to this table should belong to the currentSessionId
            // due to filtering in DashboardClient. So, isCurrentSessionCheckIn is effectively always true here.
            // If displaying mixed sessions were a feature, this would be more relevant.
            const isCurrentSessionCheckIn = checkIn.sessionId === currentSessionId;

            return (
              <TableRow 
                key={checkIn.id || `${checkIn.studentId}-${checkIn.timestamp}`}
                // className={!isCurrentSessionCheckIn ? 'opacity-50' : ''} // Likely not needed due to parent filtering
              >
                <TableCell className="font-medium">
                  <Badge variant={isCurrentSessionCheckIn ? "default" : "outline"}>{checkIn.studentId}</Badge>
                </TableCell>
                <TableCell className="font-mono text-xs">{checkIn.bluetoothMacAddress}</TableCell>
                <TableCell>
                  <Badge variant="secondary" className="text-xs">{checkIn.sessionId}</Badge>
                </TableCell>
                <TableCell>{formattedTimestamp}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </ScrollArea>
  );
}
