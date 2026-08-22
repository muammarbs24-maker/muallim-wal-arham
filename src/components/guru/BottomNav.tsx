'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, Calendar, Activity, BarChart2, User, BookOpen, Bell, LogOut } from 'lucide-react';
import { useState, useEffect } from 'react';
import { currentGuru } from '@/lib/mockData';
import { getInitials } from '@/lib/utils';
import type { Guru } from '@/types';

const navItems = [
  { href: '/guru/beranda', label: 'Beranda', icon: Home },
  { href: '/guru/jadwal', label: 'Jadwal', icon: Calendar },
  { href: '/guru/kegiatan', label: 'Kegiatan', icon: Activity },
  { href: '/guru/performa', label: 'Performa', icon: BarChart2 },
  { href: '/guru/profil', label: 'Profil', icon: User },
];

export default function GuruNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [showLogout, setShowLogout] = useState(false);
  const [activeGuru, setActiveGuru] = useState<Guru>(currentGuru);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedUser = localStorage.getItem('muallim_guru_user');
      if (savedUser) {
        try {
          const parsed = JSON.parse(savedUser);
          if (parsed && parsed.id) setActiveGuru(parsed);
        } catch (e) {}
      }
    }
  }, []);

  const handleConfirmLogout = () => {
    if (typeof document !== 'undefined') {
      document.cookie = 'guru_session=; path=/; max-age=0; SameSite=Lax';
      document.cookie = 'logged_guru_id=; path=/; max-age=0; SameSite=Lax';
    }
    if (typeof window !== 'undefined') {
      localStorage.removeItem('logged_in_guru_id');
      localStorage.removeItem('logged_in_guru_email');
      localStorage.removeItem('muallim_guru_user');
      sessionStorage.clear();
      window.location.href = '/';
    } else {
      router.push('/');
    }
  };

  return (
    <>
      {/* ============================================================
          DESKTOP SIDEBAR
          ============================================================ */}
      <aside className="guru-sidebar">
        {/* Logo */}
        <div className="sidebar-logo">
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <img
              src="/logo.png"
              alt="Logo Yayasan Mu'Allim Wal Arham"
              style={{
                width: 38,
                height: 38,
                borderRadius: '50%',
                objectFit: 'cover',
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                border: '1.5px solid #FCD34D'
              }}
            />
            <div>
              <div className="sidebar-logo-text" style={{ fontWeight: 900, letterSpacing: '0.5px' }}>SIPETA</div>
              <div className="sidebar-logo-sub" style={{ fontSize: 10, fontWeight: 600 }}>Presensi Tenaga Ajar</div>
            </div>
          </div>
        </div>

        {/* Nav Items */}
        <nav className="sidebar-nav">
          <div className="sidebar-nav-label">Menu</div>
          {navItems.map(({ href, label, icon: Icon }) => {
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
            <div className="avatar avatar-sm">{getInitials(activeGuru.nama)}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 'var(--font-size-xs)', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {activeGuru.nama.split(',')[0]}
              </div>
              <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)' }}>{activeGuru.jabatan || 'Ustadz'}</div>
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

      {/* ============================================================
          MOBILE BOTTOM NAV
          ============================================================ */}
      <nav className="bottom-nav">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname.startsWith(href);
          return (
            <Link key={href} href={href} className={`bottom-nav-item ${isActive ? 'active' : ''}`}>
              <Icon strokeWidth={isActive ? 2.5 : 1.8} />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Logout Modal */}
      {showLogout && (
        <div className="modal-overlay" onClick={() => setShowLogout(false)}>
          <div className="modal" style={{ maxWidth: 320 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 700 }}>Keluar dari Aplikasi?</h3>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                Anda akan keluar dari akun ini. Pastikan sudah melakukan absen.
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost btn-sm" onClick={() => setShowLogout(false)}>Batal</button>
              <button className="btn btn-danger btn-sm" onClick={handleConfirmLogout}>Keluar</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
