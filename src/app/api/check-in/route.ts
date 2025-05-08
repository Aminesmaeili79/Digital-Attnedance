import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { store } from '@/lib/api-store';
import type { CheckInData } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { studentId, bluetoothMacAddress } = body as { studentId: string; bluetoothMacAddress: string };

    if (!studentId || !bluetoothMacAddress) {
      return NextResponse.json({ message: 'Student ID and Bluetooth MAC address are required.' }, { status: 400 });
    }

    const session = store.currentAttendanceSession;

    if (session.status !== 'open' || !session.sessionId) {
      return NextResponse.json({ message: 'Attendance session is not open or not available.' }, { status: 403 });
    }
    
    // Check if this device has already checked in for the current session
    const existingCheckIn = store.checkInsData.find(
      (ci) => ci.sessionId === session.sessionId && ci.bluetoothMacAddress === bluetoothMacAddress
    );

    if (existingCheckIn) {
      return NextResponse.json({ message: 'This device has already checked in for the current session.' }, { status: 409 });
    }
    
    // Check if student has already checked in with a different device for the current session
    // This rule might be too strict or configurable in a real app, for now we allow one student check-in per session regardless of device
    // const studentAlreadyCheckedIn = store.checkInsData.find(
    //   (ci) => ci.sessionId === session.sessionId && ci.studentId === studentId
    // );
    // if (studentAlreadyCheckedIn) {
    //   return NextResponse.json({ message: 'Student has already checked in for this session (possibly with another device).' }, { status: 409 });
    // }


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
