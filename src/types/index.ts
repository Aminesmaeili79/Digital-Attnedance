export interface CheckInData {
  id: string; // Assuming API might provide an ID, or we can generate one on client if needed for keys
  studentId: string;
  macAddress: string;
  timestamp: string; // ISO date string e.g. "2024-07-15T10:30:00.000Z"
}
