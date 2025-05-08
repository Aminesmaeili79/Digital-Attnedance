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
    if (sessionStatus === 'not_started') {
        return `No active session. Start a session to see check-ins.`;
    }
    return `Check-ins for session: ${currentSessionId}.`;
  };

  if (!currentSessionId && (sessionStatus === 'not_started' || sessionStatus === null)) {
    return (
      <div className="flex flex-col items-center justify-center h-64 border border-dashed rounded-lg p-4 text-center">
        <CalendarCheck2 className="w-16 h-16 text-muted-foreground mb-4" />
        <p className="text-muted-foreground text-lg">
          No attendance session active.
        </p>
        <p className="text-sm text-muted-foreground">Select a class and start a session to begin collecting attendance.</p>
      </div>
    );
  }
  
  if (checkIns.length === 0 && currentSessionId) {
    return (
      <div className="flex flex-col items-center justify-center h-64 border border-dashed rounded-lg p-4 text-center">
        <CalendarCheck2 className="w-16 h-16 text-muted-foreground mb-4" />
        <p className="text-muted-foreground text-lg">
          {`No check-ins recorded yet for session ${currentSessionId}.`}
        </p>
        {sessionStatus === 'open' && <p className="text-sm text-muted-foreground">Waiting for students to check in...</p>}
        {(sessionStatus === 'closed_manual' || sessionStatus === 'closed_timeout') && <p className="text-sm text-muted-foreground">This session has ended and had no check-ins.</p>}
      </div>
    );
  }


  return (
    <ScrollArea className="h-[calc(100vh-450px)] md:h-[calc(100vh-480px)] rounded-md border shadow-md">
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
            
            return (
              <TableRow 
                key={checkIn.id || `${checkIn.studentId}-${checkIn.timestamp}`}
              >
                <TableCell className="font-medium">
                  <Badge variant={"default"}>{checkIn.studentId}</Badge>
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
