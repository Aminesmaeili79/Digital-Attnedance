import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/api-store';
import type { CheckInData } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { studentId, bluetoothMacAddress } = body as { studentId: string; bluetoothMacAddress: string };

    if (!studentId || !bluetoothMacAddress) {
      return NextResponse.json({ message: 'Student ID and Bluetooth device ID are required.' }, { status: 400 });
    }

    const session = store.currentAttendanceSession;

    if (session.status !== 'open' || !session.sessionId) {
      return NextResponse.json({ message: 'Attendance session is not open or not available.' }, { status: 403 });
    }
    
    // Check if this STUDENT has already checked in for the current session
    // Changed from checking device ID to checking student ID
    const existingStudentCheckIn = store.checkInsData.find(
      (ci) => ci.sessionId === session.sessionId && ci.studentId === studentId
    );

    if (existingStudentCheckIn) {
      return NextResponse.json({ message: 'You have already checked in for this session.' }, { status: 409 });
    }

    // Create new check-in record
    const newCheckIn: CheckInData = {
      id: `checkin-${store.nextCheckInIdCounter++}`,
      studentId,
      bluetoothMacAddress,
      timestamp: new Date().toISOString(),
      sessionId: session.sessionId,
    };

    store.checkInsData.push(newCheckIn);

    console.log(`Student ${studentId} checked in with device ${bluetoothMacAddress} for session ${session.sessionId}`);

    return NextResponse.json({ message: 'Check-in successful!', checkIn: newCheckIn }, { status: 201 });

  } catch (error) {
    console.error("Error processing check-in:", error);
    return NextResponse.json({ message: 'Error processing check-in.', error: (error as Error).message }, { status: 500 });
  }
}