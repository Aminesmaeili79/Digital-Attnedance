import DashboardClient from '@/components/dashboard/dashboard-client';
import { ModeToggle } from '@/components/mode-toggle';
import { ClipboardList } from 'lucide-react';

export default function InstructorDashboardPage() {
  return (
    <div className="min-h-screen p-4 md:p-8 flex flex-col">
      <header className="mb-6 md:mb-8 flex justify-between items-center">
        <h1 className="text-3xl md:text-4xl font-bold text-primary flex items-center">
          <ClipboardList className="w-8 h-8 md:w-10 md:h-10 mr-2 md:mr-3" />
          AttendEase Dashboard
        </h1>
        <ModeToggle />
      </header>
      <DashboardClient />
    </div>
  );
}
