'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import GuruNav from '@/components/guru/BottomNav';
import { clearGuruSession } from '@/lib/mockData';

export default function GuruLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const hasCookie = typeof document !== 'undefined' && (
      document.cookie.includes('guru_session=true') || 
      document.cookie.includes('logged_guru_id=')
    );
    const hasStorage = typeof window !== 'undefined' && (
      Boolean(localStorage.getItem('logged_in_guru_id')) ||
      Boolean(localStorage.getItem('logged_in_guru_email')) ||
      Boolean(localStorage.getItem('muallim_guru_user'))
    );

    if (hasCookie || hasStorage) {
      setIsAuthenticated(true);
    } else {
      clearGuruSession();
      setIsAuthenticated(false);
      // Simpan tujuan URL agar setelah login langsung masuk ke halaman yang dituju (misal: /guru/jadwal dari email)
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('redirect_after_login', pathname || '/guru/beranda');
      }
      router.replace('/');
    }
  }, [pathname, router]);

  // Loading state jika belum terautentikasi (mencegah flash data guru bagi yang sudah logout)
  if (isAuthenticated === null || isAuthenticated === false) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f8fafc',
        gap: '16px',
        padding: '24px'
      }}>
        <div style={{
          width: '38px',
          height: '38px',
          border: '3.5px solid #e2e8f0',
          borderTopColor: '#1B6B4A',
          borderRadius: '50%',
          animation: 'guru-auth-spin 0.8s linear infinite'
        }} />
        <p style={{
          color: '#64748b',
          fontSize: '13.5px',
          fontWeight: 600,
          margin: 0
        }}>
          Memverifikasi Sesi Masuk Guru...
        </p>
        <style>{`
          @keyframes guru-auth-spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="guru-layout">
      <GuruNav />
      <div className="guru-content">
        {children}
      </div>
    </div>
  );
}
