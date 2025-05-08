
import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/api-store';
import type { CheckInData } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { studentId } = body as { studentId: string };

    if (!studentId) {
      return NextResponse.json({ message: 'Student ID is required.' }, { status: 400 });
    }

    const session = store.currentAttendanceSession;

    if (session.status !== 'open' || !session.sessionId) {
      return NextResponse.json({ message: 'Attendance session is not open or not available for manual check-in.' }, { status: 403 });
    }
    
    const existingStudentCheckIn = store.checkInsData.find(
      (ci) => ci.sessionId === session.sessionId && ci.studentId === studentId
    );

    if (existingStudentCheckIn) {
      return NextResponse.json({ message: `Student ${studentId} has already checked in for this session.` }, { status: 409 });
    }

    const newCheckIn: CheckInData = {
      id: `checkin-${store.nextCheckInIdCounter++}`,
      studentId,
      bluetoothMacAddress: 'INSTRUCTOR_MANUAL_ENTRY', // Placeholder for manual entry
      timestamp: new Date().toISOString(),
      sessionId: session.sessionId,
    };

    store.checkInsData.push(newCheckIn);

    console.log(`Instructor manually checked in student ${studentId} for session ${session.sessionId}`);

    return NextResponse.json({ message: `Student ${studentId} manually checked in successfully!`, checkIn: newCheckIn }, { status: 201 });

  } catch (error) {
    console.error("Error processing manual check-in:", error);
    return NextResponse.json({ message: 'Error processing manual check-in.', error: (error as Error).message }, { status: 500 });
  }
}
