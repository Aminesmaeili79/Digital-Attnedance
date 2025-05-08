import { NextResponse } from 'next/server';
import { store } from '@/lib/api-store';

export async function GET() {
  // Check if a session was open and timed out
  if (store.currentAttendanceSession.status === 'open' && store.currentAttendanceSession.autoCloseTime) {
    if (new Date() >= new Date(store.currentAttendanceSession.autoCloseTime)) {
      store.currentAttendanceSession.status = 'closed_timeout';
      store.currentAttendanceSession.endTime = store.currentAttendanceSession.autoCloseTime;
      clearSessionTimeout(); // Ensure timeout is cleared from store object itself
       console.log(`Attendance session ${store.currentAttendanceSession.sessionId} found timed out upon status check.`);
    }
  }
  return NextResponse.json(store.currentAttendanceSession);
}
