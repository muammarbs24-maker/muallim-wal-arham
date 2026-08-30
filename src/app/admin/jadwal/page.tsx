'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Clock, Settings, ArrowRight, Calendar,
  Sun, Sunset, Moon
} from 'lucide-react';
import { mockSesiList, loadPersistedData } from '@/lib/mockData';
import type { SesiType, SesiConfig } from '@/types';

const SESI_ICONS: Record<SesiType, React.ReactNode> = {
  pagi: <Sun size={16} color="#059669" />,
  siang: <Clock size={16} color="#D97706" />,
  sore: <Sunset size={16} color="#0284C7" />,
  tahfidz: <Moon size={16} color="#7C3AED" />,
};

export default function AdminJadwalPage() {
  const [sesiList, setSesiList] = useState<SesiConfig[]>(() => {
    loadPersistedData();
    if (typeof window !== 'undefined') {
      const savedSesi = localStorage.getItem('muallim_sesi_list');
      if (savedSesi) {
        try {
          const parsed = JSON.parse(savedSesi);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        } catch {}
      }
    }

    return [...mockSesiList];
  });

  useEffect(() => {
    import('@/lib/supabaseClient').then(({ getSesiListSupabase }) => {
      getSesiListSupabase().then((sessions) => {
        if (sessions && sessions.length > 0) {
          setSesiList(sessions);
          mockSesiList.length = 0;
          mockSesiList.push(...sessions);
        }
      }).catch(() => {});
    }).catch(() => {});
  }, []);

  const activeSesiList = sesiList.length > 0 ? sesiList : mockSesiList;
  const totalKuota = activeSesiList.reduce((sum, sesi) => sum + (sesi.maxPengajar || 0), 0);
  const totalJamBayar = activeSesiList.reduce((sum, sesi) => sum + (sesi.totalJamBayar || 0), 0);

  return (
    <div>
      {/* Topbar */}
      <div className="admin-topbar">
        <div>
          <h1 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 800 }}>
            Manajemen Sesi Mengajar
          </h1>
          <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>
            Yayasan Tahfidz Mu&apos;Allim Wal Arham — ringkasan dan pengaturan jam sesi pembelajaran
          </p>
        </div>
        
        <div className="hide-on-mobile" style={{ gap: 'var(--space-2)' }}>
          <Link href="/admin/jadwal/sesi" className="btn btn-primary btn-sm" style={{ fontSize: 12, padding: '6px 12px' }}>
            <Settings size={14} /> Edit Sesi
          </Link>
        </div>
      </div>

      <div className="admin-content">
        <div className="admin-grid-3">
          <div className="card" style={{ padding: 'var(--space-4)' }}>
            <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', fontWeight: 700 }}>Total Sesi</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--color-text-primary)', marginTop: 4 }}>{activeSesiList.length}</div>
          </div>
          <div className="card" style={{ padding: 'var(--space-4)' }}>
            <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', fontWeight: 700 }}>Kuota Pengajar</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--color-text-primary)', marginTop: 4 }}>{totalKuota}</div>
          </div>
          <div className="card" style={{ padding: 'var(--space-4)' }}>
            <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', fontWeight: 700 }}>Total Jam Bayar</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--color-text-primary)', marginTop: 4 }}>{totalJamBayar}</div>
          </div>
        </div>

        {/* ─── SESI OVERVIEW CARDS ─── */}
        <div className="admin-grid-4">
          {activeSesiList.map((sesi) => (
            <div
              key={sesi.id}
              className="card"
              style={{
                borderTop: `4px solid ${
                  sesi.id === 'pagi' ? '#10B981' :
                  sesi.id === 'siang' ? '#F59E0B' :
                  sesi.id === 'sore' ? '#0EA5E9' :
                  sesi.id === 'tahfidz' ? '#8B5CF6' : 'var(--color-primary)'
                }`,
                padding: '12px 14px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 'var(--font-size-xs)' }}>
                  {SESI_ICONS[sesi.id] || <Clock size={15} color="var(--color-primary)" />}
                  {sesi.nama}
                </div>
              </div>

              <div style={{
                fontSize: 'var(--font-size-base)',
                fontWeight: 800,
                color: 'var(--color-text-primary)',
                fontVariantNumeric: 'tabular-nums',
                marginBottom: 2,
              }}>
                {sesi.jamMulai} – {sesi.jamSelesai}
              </div>

              <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {sesi.deskripsi}
              </div>

              <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                <span className="badge badge-primary" style={{ fontSize: 10 }}>
                  {sesi.maxPengajar || 0} pengajar
                </span>
                <span className="badge badge-success" style={{ fontSize: 10 }}>
                  {sesi.totalJamBayar || 0} jam bayar
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="admin-grid-1-1">
          <Link
            href="/admin/jadwal/sesi"
            className="card"
            style={{
              padding: 'var(--space-4)',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'var(--color-surface)',
              border: '1.5px solid var(--color-border)',
              transition: 'all var(--transition-fast)',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary)')}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <div style={{
                width: 42, height: 42, borderRadius: 'var(--radius-md)',
                background: 'var(--color-primary-light)', color: 'var(--color-primary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
              }}>
                <Settings size={20} />
              </div>
              <div>
                <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                  Edit Sesi Mengajar
                </div>
                <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 1 }}>
                  Atur nama sesi, jam mulai, jam selesai, kuota, dan total jam bayar
                </div>
              </div>
            </div>
            <ArrowRight size={18} color="var(--color-primary)" />
          </Link>

          <div
            className="card"
            style={{
              padding: 'var(--space-4)',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-3)',
              background: 'var(--color-surface)',
              border: '1.5px solid var(--color-border)',
            }}
          >
            <div style={{
              width: 42, height: 42, borderRadius: 'var(--radius-md)',
              background: 'var(--color-surface-2)', color: 'var(--color-primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
            }}>
              <Calendar size={20} />
            </div>
            <div>
              <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                Halaman Ini Khusus Sesi
              </div>
              <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 1 }}>
                Ringkasan jadwal guru dan aksi penugasan tidak ditampilkan di sini.
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
