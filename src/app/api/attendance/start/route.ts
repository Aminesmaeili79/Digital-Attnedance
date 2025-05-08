import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { store, clearSessionTimeout, setSessionTimeout } from '@/lib/api-store';
import type { AttendanceSession } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const durationMinutes = body.durationMinutes ? parseInt(body.durationMinutes as string, 10) : null;
    const classId = body.classId as string | undefined;

    if (!classId) {
      return NextResponse.json({ message: 'Class ID is required to start a session.' }, { status: 400 });
    }

    if (store.currentAttendanceSession.status === 'open') {
      return NextResponse.json({ message: 'An attendance session is already open. Please end it before starting a new one.' }, { status: 400 });
    }

    clearSessionTimeout(); // Clear any previous timeout just in case

    const newSessionId = `session-${store.nextSessionIdCounter++}`;
    const startTime = new Date();
    
    store.currentAttendanceSession = {
      sessionId: newSessionId,
      classId: classId, // Store the classId
      status: 'open',
      startTime: startTime.toISOString(),
      durationMinutes: durationMinutes || undefined,
      endTime: undefined,
      autoCloseTime: undefined,
    };

    if (durationMinutes && durationMinutes > 0) {
      const endTime = new Date(startTime.getTime() + durationMinutes * 60 * 1000);
      store.currentAttendanceSession.autoCloseTime = endTime.toISOString();
      setSessionTimeout(durationMinutes * 60 * 1000, newSessionId);
    }

    console.log(`Attendance session ${newSessionId} for class ${classId} started. Duration: ${durationMinutes ? durationMinutes + ' mins' : 'manual'}`);
    return NextResponse.json(store.currentAttendanceSession);

  } catch (error) {
    console.error("Error starting attendance session:", error);
    return NextResponse.json({ message: 'Error starting attendance session', error: (error as Error).message }, { status: 500 });
  }
}
