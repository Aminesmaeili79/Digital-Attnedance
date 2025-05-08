import { NextResponse } from 'next/server';
import { store, clearSessionTimeout } from '@/lib/api-store';

export async function POST() {
  if (store.currentAttendanceSession.status !== 'open') {
    return NextResponse.json({ message: 'No attendance session is currently open to end.' }, { status: 400 });
  }

  clearSessionTimeout(); // Clear any auto-close timeout

  store.currentAttendanceSession.status = 'closed_manual';
  store.currentAttendanceSession.endTime = new Date().toISOString();
  
  console.log(`Attendance session ${store.currentAttendanceSession.sessionId} ended manually.`);
  return NextResponse.json(store.currentAttendanceSession);
}
