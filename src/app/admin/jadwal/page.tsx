'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Clock, Settings, Users, ArrowRight, CheckCircle2,
  Calendar, Sun, Sunset, Moon, BookOpen, Layers, Edit3, RotateCcw
} from 'lucide-react';
import { mockSesiList, mockJadwalMatrix, mockGuru, loadPersistedData, syncMatrixToJadwal, savePersistedJadwalMatrix } from '@/lib/mockData';
import type { SesiType, DayOfWeek, JadwalSesiEntry, Guru, SesiConfig } from '@/types';
import { getInitials } from '@/lib/utils';

const DAYS: DayOfWeek[] = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Ahad'];

const SESI_ICONS: Record<SesiType, React.ReactNode> = {
  pagi: <Sun size={16} color="#059669" />,
  siang: <Clock size={16} color="#D97706" />,
  sore: <Sunset size={16} color="#0284C7" />,
  tahfidz: <Moon size={16} color="#7C3AED" />,
};

export default function AdminJadwalPage() {
  const router = useRouter();
  const [matrix, setMatrix] = useState<JadwalSesiEntry[]>([]);
  const [guruList, setGuruList] = useState<Guru[]>([]);
  const [sesiList, setSesiList] = useState<SesiConfig[]>([]);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showToast, setShowToast] = useState<string | null>(null);

  useEffect(() => {
    loadPersistedData();
    syncMatrixToJadwal();
    setMatrix([...mockJadwalMatrix]);
    setGuruList([...mockGuru]);
    setSesiList([...mockSesiList]);

    if (typeof window !== 'undefined') {
      const savedMatrix = localStorage.getItem('muallim_jadwal_matrix');
      if (savedMatrix) {
        try {
          const parsed = JSON.parse(savedMatrix);
          if (Array.isArray(parsed)) {
            setMatrix(parsed);
          }
        } catch (e) {}
      }

      const savedGurus = localStorage.getItem('muallim_guru_list');
      if (savedGurus) {
        try {
          const parsed = JSON.parse(savedGurus);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setGuruList(parsed);
          }
        } catch (e) {}
      }
    }

    import('@/lib/supabaseClient').then(({ getJadwalMatrixSupabase, getGurusSupabase, getSesiListSupabase }) => {
      getJadwalMatrixSupabase().then((data) => {
        if (data !== null && data !== undefined) {
          setMatrix(data);
          mockJadwalMatrix.length = 0;
          mockJadwalMatrix.push(...data);
          syncMatrixToJadwal();
        }
      }).catch(() => {});

      getGurusSupabase().then((gurus) => {
        if (gurus && gurus.length > 0) {
          setGuruList(gurus);
          mockGuru.length = 0;
          mockGuru.push(...gurus);
        }
      }).catch(() => {});

      getSesiListSupabase().then((sessions) => {
        if (sessions && sessions.length > 0) {
          setSesiList(sessions);
          mockSesiList.length = 0;
          mockSesiList.push(...sessions);
        }
      }).catch(() => {});
    }).catch(() => {});
  }, []);

  const handleResetJadwal = () => {
    setMatrix([]);
    savePersistedJadwalMatrix([]);
    setShowResetModal(false);
    setShowToast('✓ Seluruh jadwal mengajar guru berhasil dikosongkan.');
    setTimeout(() => setShowToast(null), 3000);
  };

  return (
    <div>
      {/* Toast Notification */}
      {showToast && (
        <div className="toast-container" style={{ position: 'fixed', top: 80, bottom: 'auto', left: '50%', transform: 'translateX(-50%)' }}>
          <div className="toast toast-success">{showToast}</div>
        </div>
      )}

      {/* MODAL KONFIRMASI RESET JADWAL */}
      {showResetModal && (
        <div className="modal-overlay" onClick={() => setShowResetModal(false)}>
          <div className="modal" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 800, color: 'var(--color-danger)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <RotateCcw size={18} /> Kosongkan Seluruh Jadwal?
              </h3>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                Apakah Anda yakin ingin mengosongkan seluruh penugasan jadwal guru?
              </p>
              <div style={{
                marginTop: 'var(--space-3)', padding: '10px 12px',
                background: '#FEF2F2', border: '1px solid #FCA5A5',
                borderRadius: 'var(--radius-md)', fontSize: 12, color: '#991B1B'
              }}>
                ⚠️ Semua penugasan guru di seluruh sesi akan dihapus sehingga jadwal menjadi kosong dan dapat diisi kembali dari awal.
              </div>
            </div>
            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setShowResetModal(false)}
              >
                Batal
              </button>
              <button
                type="button"
                className="btn btn-danger btn-sm"
                onClick={handleResetJadwal}
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <RotateCcw size={14} /> Ya, Kosongkan Jadwal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Topbar */}
      <div className="admin-topbar">
        <div>
          <h1 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 800 }}>
            Manajemen Jadwal &amp; Sesi Mengajar
          </h1>
          <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>
            Yayasan Tahfidz Mu&apos;Allim Wal Arham — Pengaturan Sesi &amp; Jam Pembelajaran
          </p>
        </div>
        
        <div className="hide-on-mobile" style={{ gap: 'var(--space-2)' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setShowResetModal(true)}
            style={{
              fontSize: 12, padding: '6px 12px',
              color: 'var(--color-danger)', borderColor: 'rgba(239,68,68,0.3)',
              display: 'flex', alignItems: 'center', gap: 6
            }}
          >
            <RotateCcw size={14} /> Reset Jadwal
          </button>
          <Link href="/admin/jadwal/sesi" className="btn btn-secondary btn-sm" style={{ fontSize: 12, padding: '6px 12px' }}>
            <Settings size={14} /> Sesi Mengajar
          </Link>
          <Link href="/admin/jadwal/atur-guru" className="btn btn-primary btn-sm" style={{ fontSize: 12, padding: '6px 12px' }}>
            <Users size={14} /> Edit Jadwal Guru
          </Link>
        </div>
      </div>

      <div className="admin-content">

        {/* ─── SESI OVERVIEW CARDS (4 COLS DESKTOP, 2x2 MOBILE) ─── */}
        <div className="admin-grid-4">
          {sesiList.map((sesi) => (
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
            </div>
          ))}
        </div>

        {/* ─── TWO ACTION TILES ─── */}
        <div className="admin-grid-1-1">
          {/* Card 1: Sesi */}
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
                  1. Edit Jam 4 Sesi
                </div>
                <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 1 }}>
                  Atur jam Kelas Pagi, Siang, Sore, dan Tahfidz
                </div>
              </div>
            </div>
            <ArrowRight size={18} color="var(--color-primary)" />
          </Link>

          {/* Card 2: Matrix Guru */}
          <Link
            href="/admin/jadwal/atur-guru"
            className="card"
            style={{
              padding: 'var(--space-4)',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'var(--color-primary-light)',
              border: '1.5px solid var(--color-primary)',
              transition: 'all var(--transition-fast)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <div style={{
                width: 42, height: 42, borderRadius: 'var(--radius-md)',
                background: 'var(--color-primary)', color: 'white',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
              }}>
                <Users size={20} />
              </div>
              <div>
                <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 700, color: 'var(--color-primary)' }}>
                  2. Edit Jadwal Guru (Drag &amp; Drop)
                </div>
                <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 1 }}>
                  Geser profil guru ke kotak hari (Senin–Ahad) &amp; sesi
                </div>
              </div>
            </div>
            <ArrowRight size={18} color="var(--color-primary)" />
          </Link>
        </div>

        {/* ─── MATRIX SUMMARY TABLE (FULL 100% WIDTH, NO OVERFLOW) ─── */}
        <div className="card" style={{ width: '100%', overflow: 'hidden' }}>
          <div className="card-header" style={{ padding: 'var(--space-3) var(--space-4)' }}>
            <div>
              <span style={{ fontWeight: 700, fontSize: 'var(--font-size-sm)' }}>
                Matriks Jadwal Mengajar Guru (Senin – Ahad)
              </span>
              <p style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 1 }}>
                Penugasan guru di setiap sesi (terlihat penuh tanpa geser kanan-kiri)
              </p>
            </div>
            <Link href="/admin/jadwal/atur-guru" className="btn btn-primary btn-sm" style={{ fontSize: 11, padding: '4px 10px' }}>
              <Edit3 size={13} /> Edit Grid
            </Link>
          </div>

          <div style={{ width: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <table style={{ width: '100%', minWidth: 640, tableLayout: 'fixed', borderCollapse: 'collapse', fontSize: 11 }}>
              <thead>
                <tr style={{ borderBottom: '1.5px solid var(--color-border)' }}>
                  <th style={{ width: '16%', background: 'var(--color-surface-2)', padding: '10px 8px', textAlign: 'left', fontWeight: 700 }}>
                    Sesi / Jam
                  </th>
                  {DAYS.map((day) => (
                    <th key={day} style={{ width: '12%', textAlign: 'center', padding: '10px 4px', background: 'var(--color-surface)', fontWeight: 800, borderLeft: '1px solid var(--color-border-light)' }}>
                      {day}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(sesiList.length > 0 ? sesiList : mockSesiList).map((sesi) => (
                  <tr key={sesi.id} style={{ borderBottom: '1px solid var(--color-border-light)' }}>
                    {/* Sesi Name & Time */}
                    <td style={{
                      background: 'var(--color-surface-2)',
                      verticalAlign: 'middle',
                      padding: '10px 8px',
                      borderRight: '1px solid var(--color-border-light)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontWeight: 800, fontSize: 11, color: 'var(--color-text-primary)' }}>
                        {SESI_ICONS[sesi.id as SesiType]}
                        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sesi.nama}</span>
                      </div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-primary)', marginTop: 2 }}>
                        {sesi.jamMulai}–{sesi.jamSelesai}
                      </div>
                    </td>

                    {/* Day Cells (Fitted proportionally) */}
                    {DAYS.map((day) => {
                      const entry = matrix.find(
                        (m) => m.hari === day && m.sesiId === sesi.id
                      );
                      const activeGurus = guruList.length > 0 ? guruList : mockGuru;
                      const guruAssigned = (entry?.guruIds || [])
                        .map((gid: string) => activeGurus.find((g) => g.id === gid))
                        .filter(Boolean);

                      return (
                        <td key={day} style={{ verticalAlign: 'top', padding: '6px 4px', borderLeft: '1px solid var(--color-border-light)' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                            {guruAssigned.map((g: any) => (
                              <div
                                key={g?.id}
                                title={g?.nama}
                                style={{
                                  background: sesi.warna || 'var(--color-surface-2)',
                                  borderRadius: 4,
                                  padding: '3px 5px',
                                  fontSize: 10,
                                  fontWeight: 700,
                                  color: '#1F2937',
                                  border: '1px solid rgba(0,0,0,0.06)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 4,
                                  width: '100%',
                                }}
                              >
                                <div style={{ width: 14, height: 14, borderRadius: '50%', background: 'rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, flexShrink: 0 }}>
                                  {getInitials(g?.nama || '')}
                                </div>
                                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1, minWidth: 0 }}>
                                  {g?.nama.split(',')[0].replace('Ustadz ', '').replace('Ustadzah ', '')}
                                </span>
                              </div>
                            ))}

                            {guruAssigned.length === 0 && (
                              <div style={{ color: 'var(--color-text-tertiary)', fontSize: 10, textAlign: 'center', padding: '4px 0' }}>
                                —
                              </div>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
