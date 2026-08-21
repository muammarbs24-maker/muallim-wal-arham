'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, Users, ClipboardList, Calendar,
  Activity, BarChart2, FileText, Settings, BookOpen, LogOut, Menu, X
} from 'lucide-react';
import { useState, useEffect } from 'react';

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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const getCurrentTitle = () => {
    const item = navItems.find((n) => pathname.startsWith(n.href));
    return item ? item.label : 'Admin';
  };

  const handleLogoutConfirm = () => {
    if (typeof document !== 'undefined') {
      document.cookie = 'admin_session=; path=/; max-age=0';
    }
    if (typeof window !== 'undefined') {
      localStorage.removeItem('admin_session');
    }
    setShowLogout(false);
    setMobileMenuOpen(false);
    router.push('/admin/login');
  };

  return (
    <>
      {/* ─── MODAL LOGOUT ─── */}
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
                onClick={handleLogoutConfirm}
              >
                Keluar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MOBILE STICKY TOPBAR (Only on screens <= 768px) ─── */}
      <header className="admin-mobile-topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            type="button"
            className="admin-mobile-menu-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div className="sidebar-logo-mark" style={{ width: 28, height: 28, fontSize: 13 }}>
              <BookOpen size={15} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 14, lineHeight: 1.2, color: 'var(--color-text-primary)' }}>
                Mu&apos;Allim
              </div>
              <div style={{ fontSize: 10, color: 'var(--color-primary)', fontWeight: 700 }}>
                {getCurrentTitle()}
              </div>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowLogout(true)}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--color-danger)',
            cursor: 'pointer',
            padding: 6,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            fontSize: 11,
            fontWeight: 700,
          }}
        >
          <LogOut size={16} />
        </button>
      </header>

      {/* ─── MOBILE BACKDROP & DRAWER ─── */}
      {mobileMenuOpen && (
        <div
          className="admin-mobile-backdrop"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <aside className={`sidebar ${mobileMenuOpen ? 'mobile-open' : ''}`}>
        {/* Logo (Desktop & Drawer) */}
        <div className="sidebar-logo">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <div className="sidebar-logo-mark">
                <BookOpen size={18} />
              </div>
              <div>
                <div className="sidebar-logo-text">Mu&apos;Allim</div>
                <div className="sidebar-logo-sub">Panel Admin</div>
              </div>
            </div>
            <button
              type="button"
              className="admin-drawer-close-btn"
              onClick={() => setMobileMenuOpen(false)}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="sidebar-nav">
          <div className="sidebar-nav-label">Menu Utama</div>
          {navItems.slice(0, 2).map(({ href, label, icon: Icon }) => {
            const isActive = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                <Icon size={18} />
                {label}
              </Link>
            );
          })}

          <div className="sidebar-nav-label" style={{ marginTop: 'var(--space-4)' }}>Manajemen</div>
          {navItems.slice(2, 7).map(({ href, label, icon: Icon }) => {
            const isActive = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                <Icon size={18} />
                {label}
              </Link>
            );
          })}

          <div className="sidebar-nav-label" style={{ marginTop: 'var(--space-4)' }}>Sistem</div>
          {navItems.slice(7).map(({ href, label, icon: Icon }) => {
            const isActive = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
                onClick={() => setMobileMenuOpen(false)}
              >
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
          background: 'var(--color-surface)',
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
