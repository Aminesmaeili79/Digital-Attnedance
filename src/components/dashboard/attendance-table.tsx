"use client";

import type { CheckInData } from '@/types';
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
import { UserCircle, Smartphone, Clock, CalendarCheck2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface AttendanceTableProps {
  checkIns: CheckInData[];
}

export default function AttendanceTable({ checkIns }: AttendanceTableProps) {
  if (checkIns.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 border border-dashed rounded-lg">
        <CalendarCheck2 className="w-16 h-16 text-muted-foreground mb-4" />
        <p className="text-muted-foreground text-lg">No check-ins recorded yet.</p>
        <p className="text-sm text-muted-foreground">Waiting for students to check in...</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[calc(100vh-200px)] md:h-[calc(100vh-220px)] rounded-md border shadow-md">
      <Table>
        <TableCaption>
          A list of student check-ins. Updates automatically.
        </TableCaption>
        <TableHeader className="sticky top-0 bg-card z-10">
          <TableRow>
            <TableHead className="w-[200px]">
              <div className="flex items-center">
                <UserCircle className="w-5 h-5 mr-2 text-primary" />
                Student ID
              </div>
            </TableHead>
            <TableHead>
              <div className="flex items-center">
                <Smartphone className="w-5 h-5 mr-2 text-primary" />
                Device MAC Address
              </div>
            </TableHead>
            <TableHead className="w-[250px]">
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
              formattedTimestamp = format(date, "Pp"); // e.g., 07/15/2024, 10:30 AM
            } catch (error) {
              console.error("Error parsing timestamp:", checkIn.timestamp, error);
              // Keep formattedTimestamp as "Invalid Date" or use original string
              formattedTimestamp = checkIn.timestamp; 
            }
            
            return (
              <TableRow key={checkIn.id || `${checkIn.studentId}-${checkIn.timestamp}`}>
                <TableCell className="font-medium">
                  <Badge variant="secondary">{checkIn.studentId}</Badge>
                </TableCell>
                <TableCell>{checkIn.macAddress}</TableCell>
                <TableCell>{formattedTimestamp}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </ScrollArea>
  );
}
