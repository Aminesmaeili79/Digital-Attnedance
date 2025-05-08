export interface CourseClass {
  id: string;
  courseName: string;
  sessionNumber: string; // e.g., "Session 1", "Midterm Exam"
  scheduledTime: string; // ISO string
  classroom: string;
  totalStudents: number;
}

export interface AttendanceSession {
  sessionId: string | null; // Unique ID for each attendance session
  classId?: string | null; // Optional ID of the class this session is for
  status: 'not_started' | 'open' | 'closed_manual' | 'closed_timeout';
  startTime?: string; // ISO string
  endTime?: string;   // ISO string (calculated if duration is set, or when manually closed)
  durationMinutes?: number;
  // A timestamp for when the session is expected to auto-close due to duration
  autoCloseTime?: string; // ISO string 
}

export interface CheckInData {
  id: string;
  studentId: string;
  bluetoothMacAddress: string; // This will be a simulated unique device ID
  timestamp: string; // ISO date string
  sessionId: string; // To link check-in to a specific session
}
