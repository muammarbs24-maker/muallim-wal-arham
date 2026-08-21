import type { Metadata } from 'next';
import GuruNav from '@/components/guru/BottomNav';

export const metadata: Metadata = {
  title: "Mu'Allim Attendance — Guru",
};

export default function GuruLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="guru-layout">
      <GuruNav />
      <div className="guru-content">
        {children}
      </div>
    </div>
  );
}
