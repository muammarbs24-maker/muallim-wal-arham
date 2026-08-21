'use client';

import { useEffect, useState, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import AdminSidebar from '@/components/admin/Sidebar';

const INACTIVITY_LIMIT_MS = 10 * 60 * 1000; // 10 menit

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const lastActiveRef = useRef<number>(Date.now());

  const isLoginPage = pathname === '/admin/login';

  // 1. Verifikasi Sesi Admin
  useEffect(() => {
    if (isLoginPage) {
      setIsAuthenticated(true);
      return;
    }

    const hasCookie = typeof document !== 'undefined' && document.cookie.includes('admin_session=true');
    const hasStorage = typeof window !== 'undefined' && localStorage.getItem('admin_session') === 'true';

    if (hasCookie || hasStorage) {
      setIsAuthenticated(true);
      lastActiveRef.current = Date.now();
      if (typeof window !== 'undefined') {
        localStorage.setItem('admin_last_active', String(Date.now()));
      }
    } else {
      setIsAuthenticated(false);
      router.replace('/admin/login');
    }
  }, [pathname, isLoginPage, router]);

  // 2. Auto-Lock Sesi Admin Setelah 10 Menit Tidak Digunakan
  useEffect(() => {
    if (isLoginPage || !isAuthenticated) return;

    const resetActivity = () => {
      lastActiveRef.current = Date.now();
      if (typeof window !== 'undefined') {
        localStorage.setItem('admin_last_active', String(Date.now()));
      }
    };

    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
    events.forEach((evt) => window.addEventListener(evt, resetActivity, { passive: true }));

    const checkInterval = setInterval(() => {
      const savedLast = typeof window !== 'undefined'
        ? Number(localStorage.getItem('admin_last_active') || lastActiveRef.current)
        : lastActiveRef.current;
      const elapsed = Date.now() - savedLast;

      if (elapsed >= INACTIVITY_LIMIT_MS) {
        // Auto-lock session
        if (typeof document !== 'undefined') {
          document.cookie = 'admin_session=; path=/; max-age=0; SameSite=Lax';
        }
        if (typeof window !== 'undefined') {
          localStorage.removeItem('admin_session');
          localStorage.removeItem('admin_last_active');
        }
        setIsAuthenticated(false);
        router.replace('/admin/login?reason=timeout');
      }
    }, 5000); // Check setiap 5 detik

    return () => {
      events.forEach((evt) => window.removeEventListener(evt, resetActivity));
      clearInterval(checkInterval);
    };
  }, [isLoginPage, isAuthenticated, router]);

  // If on login page, render children directly without admin layout and sidebar
  if (isLoginPage) {
    return <>{children}</>;
  }

  // If checking authentication, render a clean loading spinner
  if (isAuthenticated === null || !isAuthenticated) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'var(--color-bg)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        color: 'var(--color-text-secondary)',
      }}>
        <div className="animate-spin" style={{ width: 28, height: 28, border: '3px solid var(--color-border)', borderTopColor: 'var(--color-primary)', borderRadius: '50%' }} />
        <span style={{ fontSize: 13, fontWeight: 600 }}>Memverifikasi Akses Administrator...</span>
      </div>
    );
  }

  return (
    <div className="admin-layout">
      <AdminSidebar />
      <main className="admin-main">{children}</main>
    </div>
  );
}
