'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, Calendar, Activity, BarChart2, User, LogOut } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { currentGuru, mockJadwal, mockJadwalMatrix, mockSesiList, syncMatrixToJadwal, loadPersistedData } from '@/lib/mockData';
import { getInitials, getTomorrowStringWITA, getTomorrowDayOfWeekWITA } from '@/lib/utils';
import type { Guru } from '@/types';

const JADWAL_CONFIRMED_KEY = 'jadwal_besok_confirmed_date';

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
  const [hasJadwalBesok, setHasJadwalBesok] = useState(false);

  // Hitung tanggal besok sebagai string 'YYYY-MM-DD'
  const getTomorrowDateStr = () => {
    return getTomorrowStringWITA();
  };

  // Cek apakah badge harus ditampilkan
  const checkJadwalBesok = useCallback((guru: Guru) => {
    const tomorrowDayName = getTomorrowDayOfWeekWITA();
    const tomorrowDateStr = getTomorrowStringWITA();

    // Cek apakah sudah dikonfirmasi (klik Siap Hadir / Tidak Bisa Hadir)
    const confirmedDate = typeof window !== 'undefined' ? localStorage.getItem(JADWAL_CONFIRMED_KEY) : null;
    if (confirmedDate === tomorrowDateStr) {
      setHasJadwalBesok(false);
      return;
    }

    // Pastikan data jadwal sudah di-load
    syncMatrixToJadwal();

    // Cari jadwal besok untuk guru ini
    const tomorrowSchedules = mockJadwal.filter(
      (j) =>
        (j.guruId === guru.id ||
          j.guruNama === guru.nama ||
          (guru.nama && j.guruNama.toLowerCase() === guru.nama.toLowerCase())) &&
        j.aktif &&
        j.hari === tomorrowDayName
    );

    setHasJadwalBesok(tomorrowSchedules.length > 0);
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedUser = localStorage.getItem('muallim_guru_user');
      if (savedUser) {
        try {
          const parsed = JSON.parse(savedUser);
          if (parsed && parsed.id) {
            setActiveGuru(parsed);
            // Load data lalu cek jadwal
            loadPersistedData();
            syncMatrixToJadwal();
            checkJadwalBesok(parsed);

            // Juga fetch dari supabase untuk data terbaru
            import('@/lib/supabaseClient').then(({ getJadwalMatrixSupabase, getSesiListSupabase }) => {
              getSesiListSupabase().then((sessions) => {
                if (sessions && sessions.length > 0) {
                  mockSesiList.length = 0;
                  mockSesiList.push(...sessions);
                }
              }).catch(() => {});

              getJadwalMatrixSupabase().then((matrix) => {
                if (matrix !== null && matrix !== undefined) {
                  mockJadwalMatrix.length = 0;
                  mockJadwalMatrix.push(...matrix);
                  syncMatrixToJadwal();
                  checkJadwalBesok(parsed);
                }
              }).catch(() => {});
            }).catch(() => {});
          }
        } catch (e) {}
      } else {
        loadPersistedData();
        syncMatrixToJadwal();
        checkJadwalBesok(currentGuru);
      }
    }
  }, [checkJadwalBesok]);

  // Dengarkan event konfirmasi dari halaman jadwal
  useEffect(() => {
    const handleConfirmed = () => {
      setHasJadwalBesok(false);
    };
    window.addEventListener('jadwal_besok_confirmed', handleConfirmed);
    return () => window.removeEventListener('jadwal_besok_confirmed', handleConfirmed);
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
            const isJadwal = href === '/guru/jadwal';
            return (
              <Link key={href} href={href} className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
                style={{ position: 'relative' }}
              >
                <span style={{ position: 'relative', display: 'inline-flex' }}>
                  <Icon size={18} />
                  {isJadwal && hasJadwalBesok && (
                    <span
                      style={{
                        position: 'absolute',
                        top: -4,
                        right: -5,
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: '#EF4444',
                        border: '1.5px solid var(--color-surface)',
                        display: 'block',
                        animation: 'jadwal-badge-pulse 1.8s ease-in-out infinite',
                      }}
                    />
                  )}
                </span>
                {label}
                {isJadwal && hasJadwalBesok && (
                  <span
                    style={{
                      marginLeft: 'auto',
                      background: '#EF4444',
                      color: '#fff',
                      fontSize: 9,
                      fontWeight: 800,
                      borderRadius: 99,
                      padding: '1px 5px',
                      lineHeight: 1.6,
                      letterSpacing: '0.02em',
                    }}
                  >
                    Besok
                  </span>
                )}
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
          const isJadwal = href === '/guru/jadwal';
          return (
            <Link key={href} href={href} className={`bottom-nav-item ${isActive ? 'active' : ''}`}>
              <span style={{ position: 'relative', display: 'inline-flex' }}>
                <Icon strokeWidth={isActive ? 2.5 : 1.8} />
                {isJadwal && hasJadwalBesok && (
                  <span
                    style={{
                      position: 'absolute',
                      top: -3,
                      right: -4,
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: '#EF4444',
                      border: '1.5px solid var(--color-surface)',
                      display: 'block',
                      animation: 'jadwal-badge-pulse 1.8s ease-in-out infinite',
                    }}
                  />
                )}
              </span>
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
