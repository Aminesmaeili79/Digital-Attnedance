import type { CheckInData, AttendanceSession } from '@/types';

// In-memory store for prototype
interface ApiStore {
  checkInsData: CheckInData[];
  nextCheckInIdCounter: number;
  currentAttendanceSession: AttendanceSession;
  nextSessionIdCounter: number;
  // Timeout ID for automatic session closing
  sessionTimeoutId: NodeJS.Timeout | null;
}

export const store: ApiStore = {
  checkInsData: [],
  nextCheckInIdCounter: 1,
  currentAttendanceSession: {
    sessionId: null,
    status: 'not_started',
  },
  nextSessionIdCounter: 1,
  sessionTimeoutId: null,
};

// Helper function to clear previous session timeout if any
export function clearSessionTimeout() {
  if (store.sessionTimeoutId) {
    clearTimeout(store.sessionTimeoutId);
    store.sessionTimeoutId = null;
  }
}

// Helper function to set a new session timeout
export function setSessionTimeout(delay: number, sessionId: string) {
  clearSessionTimeout(); // Clear any existing timeout

  store.sessionTimeoutId = setTimeout(() => {
    // Only close if the session is still the same and is 'open'
    if (store.currentAttendanceSession.sessionId === sessionId && store.currentAttendanceSession.status === 'open') {
      store.currentAttendanceSession.status = 'closed_timeout';
      store.currentAttendanceSession.endTime = new Date().toISOString();
      console.log(`Attendance session ${sessionId} timed out and closed automatically.`);
    }
  }, delay);
}
