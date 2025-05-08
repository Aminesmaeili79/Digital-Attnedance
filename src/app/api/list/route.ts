import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import type { CheckInData } from '@/types';

// In-memory store for check-in data
let checkInsData: CheckInData[] = [
  {
    id: '1',
    studentId: 'S1001',
    macAddress: '00:1A:2B:3C:4D:5E',
    timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(), // 15 minutes ago
  },
  {
    id: '2',
    studentId: 'S1002',
    macAddress: 'AA:BB:CC:DD:EE:FF',
    timestamp: new Date(Date.now() - 1000 * 60 * 8).toISOString(), // 8 minutes ago
  },
  {
    id: '3',
    studentId: 'S1003',
    macAddress: '12:34:56:78:90:AB',
    timestamp: new Date(Date.now() - 1000 * 60 * 3).toISOString(), // 3 minutes ago
  },
];

let nextIdCounter = 4; // Start counter for new IDs from 4

export async function GET(request: NextRequest) {
  // Simulate new check-ins or updates to existing ones
  // This makes the dashboard feel more dynamic due to polling
  if (Math.random() < 0.35 && checkInsData.length < 15) { // 35% chance to add/update if list isn't too long
    const studentPool = ['S1001', 'S1002', 'S1003', 'S1004', 'S1005', 'S1006', 'S1007'];
    const macPool = [
      'DE:AD:BE:EF:00:01', 
      'CA:FE:BA:BE:00:02', 
      '11:22:33:44:55:66', 
      '77:88:99:AA:BB:CC',
      '00:1A:2B:3C:4D:5E', // Re-use some known MACs
      'AA:BB:CC:DD:EE:FF'
    ];
    
    const randomStudentId = studentPool[Math.floor(Math.random() * studentPool.length)];
    const existingEntryIndex = checkInsData.findIndex(ci => ci.studentId === randomStudentId);

    if (existingEntryIndex !== -1 && Math.random() < 0.7) { // 70% chance to update if student exists
      // Update timestamp of an existing student
      // Also potentially update MAC address if student uses a "different device"
      checkInsData[existingEntryIndex] = {
        ...checkInsData[existingEntryIndex],
        macAddress: Math.random() < 0.2 ? macPool[Math.floor(Math.random() * macPool.length)] : checkInsData[existingEntryIndex].macAddress,
        timestamp: new Date().toISOString(),
      };
    } else {
      // Add a new student entry or if the existing student wasn't chosen for update
      const newCheckIn: CheckInData = {
        id: (nextIdCounter++).toString(),
        studentId: randomStudentId, // Could be a student ID that's already in the list, simulating re-checkin with new device
        macAddress: macPool[Math.floor(Math.random() * macPool.length)],
        timestamp: new Date().toISOString(),
      };
      
      // Prevent adding exact duplicate studentId and macAddress, just update timestamp instead
      const duplicateIndex = checkInsData.findIndex(ci => ci.studentId === newCheckIn.studentId && ci.macAddress === newCheckIn.macAddress);
      if (duplicateIndex !== -1) {
        checkInsData[duplicateIndex].timestamp = newCheckIn.timestamp;
        nextIdCounter--; // Decrement as we didn't use the new ID
      } else {
        checkInsData.push(newCheckIn);
      }
    }
  }

  // Return a copy of the data array
  return NextResponse.json([...checkInsData]);
}
