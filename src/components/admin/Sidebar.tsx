'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, Users, ClipboardList, Calendar,
  Activity, BarChart2, FileText, Settings, BookOpen, LogOut, Bell
} from 'lucide-react';
import { useState } from 'react';

const navItems = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/guru', label: 'Guru', icon: Users },
  { href: '/admin/absensi', label: 'Absensi', icon: ClipboardList },
  { href: '/admin/jadwal', label: 'Jadwal', icon: Calendar },
  { href: '/admin/kegiatan', label: 'Kegiatan', icon: Activity },
  { href: '/admin/performa', label: 'Performa', icon: BarChart2 },
  { href: '/admin/laporan', label: 'Laporan', icon: FileText },
  { href: '/admin/pengaturan', label: 'Pengaturan', icon: Settings },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [showLogout, setShowLogout] = useState(false);

  return (
    <>
      {showLogout && (
        <div className="modal-overlay" onClick={() => setShowLogout(false)}>
          <div className="modal" style={{ maxWidth: 320 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 700 }}>Keluar dari Admin?</h3>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                Anda akan keluar dari panel administrasi.
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost btn-sm" onClick={() => setShowLogout(false)}>Batal</button>
              <button
                className="btn btn-danger btn-sm"
                onClick={() => {
                  if (typeof document !== 'undefined') {
                    document.cookie = 'admin_session=; path=/; max-age=0';
                  }
                  if (typeof window !== 'undefined') {
                    localStorage.removeItem('admin_session');
                  }
                  setShowLogout(false);
                  router.push('/admin/login');
                }}
              >
                Keluar
              </button>
            </div>
          </div>
        </div>
      )}

      <aside className="sidebar">
        {/* Logo */}
        <div className="sidebar-logo">
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <div className="sidebar-logo-mark">
              <BookOpen size={18} />
            </div>
            <div>
              <div className="sidebar-logo-text">Mu&apos;Allim</div>
              <div className="sidebar-logo-sub">Panel Admin</div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          <div className="sidebar-nav-label">Menu Utama</div>
          {navItems.slice(0, 2).map(({ href, label, icon: Icon }) => {
            const isActive = pathname.startsWith(href);
            return (
              <Link key={href} href={href} className={`sidebar-nav-item ${isActive ? 'active' : ''}`}>
                <Icon size={18} />
                {label}
              </Link>
            );
          })}

          <div className="sidebar-nav-label" style={{ marginTop: 'var(--space-4)' }}>Manajemen</div>
          {navItems.slice(2, 7).map(({ href, label, icon: Icon }) => {
            const isActive = pathname.startsWith(href);
            return (
              <Link key={href} href={href} className={`sidebar-nav-item ${isActive ? 'active' : ''}`}>
                <Icon size={18} />
                {label}
              </Link>
            );
          })}

          <div className="sidebar-nav-label" style={{ marginTop: 'var(--space-4)' }}>Sistem</div>
          {navItems.slice(7).map(({ href, label, icon: Icon }) => {
            const isActive = pathname.startsWith(href);
            return (
              <Link key={href} href={href} className={`sidebar-nav-item ${isActive ? 'active' : ''}`}>
                <Icon size={18} />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div style={{
          padding: 'var(--space-4)',
          borderTop: '1px solid var(--color-border-light)',
          marginTop: 'auto',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
            <div className="avatar avatar-sm" style={{ background: 'var(--color-primary)', color: 'white' }}>A</div>
            <div>
              <div style={{ fontSize: 'var(--font-size-xs)', fontWeight: 700 }}>Administrator</div>
              <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)' }}>admin@muallim.sch.id</div>
            </div>
          </div>
          <button
            className="sidebar-nav-item"
            style={{ color: 'var(--color-danger)', width: '100%' }}
            onClick={() => setShowLogout(true)}
          >
            <LogOut size={16} />
            Keluar
          </button>
          <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)', textAlign: 'center', marginTop: 'var(--space-3)', fontWeight: 500 }}>
            © 2026 MR Team
          </div>
        </div>
      </aside>
    </>
  );
}
