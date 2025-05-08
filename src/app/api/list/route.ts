import { NextResponse } from 'next/server';
import { store } from '@/lib/api-store';

export async function GET() {
  // Return a copy of the check-ins data array, sorted by most recent first
  const sortedCheckIns = [...store.checkInsData].sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
  return NextResponse.json(sortedCheckIns);
}
