'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Users, Save, Sun, Sunset, Moon, Clock,
  GripVertical, X, Plus, Search, CheckCircle2, RotateCcw, Info
} from 'lucide-react';
import { mockSesiList, mockJadwalMatrix, mockGuru, mockSettings, savePersistedJadwalMatrix, loadPersistedData } from '@/lib/mockData';
import { sendScheduleNotificationEmail } from '@/lib/emailService';
import type { SesiType, DayOfWeek, JadwalSesiEntry, SesiConfig, Guru } from '@/types';
import { getInitials } from '@/lib/utils';

const DAYS: DayOfWeek[] = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Ahad'];

const SESI_ICONS: Record<SesiType, React.ReactNode> = {
  pagi: <Sun size={15} color="#059669" />,
  siang: <Clock size={15} color="#D97706" />,
  sore: <Sunset size={15} color="#0284C7" />,
  tahfidz: <Moon size={15} color="#7C3AED" />,
};

export default function AturJadwalGuruPage() {
  const router = useRouter();
  const [matrixState, setMatrixState] = useState<JadwalSesiEntry[]>([]);
  const [guruList, setGuruList] = useState<Guru[]>([]);
  const [sesiList, setSesiList] = useState<SesiConfig[]>([]);
  const [searchGuru, setSearchGuru] = useState('');
  const [draggedGuruId, setDraggedGuruId] = useState<string | null>(null);
  const [hoveredCell, setHoveredCell] = useState<{ day: DayOfWeek; sesiId: SesiType } | null>(null);
  const [showToast, setShowToast] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);

  const handleResetJadwal = () => {
    setMatrixState([]);
    savePersistedJadwalMatrix([]);
    setShowResetModal(false);
    setShowToast('✓ Seluruh jadwal mengajar guru berhasil dikosongkan.');
    setTimeout(() => setShowToast(null), 3000);
  };

  // Load persisted matrix on mount
  useEffect(() => {
    loadPersistedData();
    setSesiList([...mockSesiList]);
    setGuruList([...mockGuru]);

    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('muallim_jadwal_matrix');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            setMatrixState(parsed);
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
      getJadwalMatrixSupabase().then((matrix) => {
        if (matrix !== null && matrix !== undefined) {
          setMatrixState(matrix);
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

  // Drag handlers
  const handleDragStart = (guruId: string) => {
    setDraggedGuruId(guruId);
  };

  const handleDragOver = (e: React.DragEvent, day: DayOfWeek, sesiId: SesiType) => {
    e.preventDefault();
    setHoveredCell({ day, sesiId });
  };

  const handleDragLeave = () => {
    setHoveredCell(null);
  };

  const handleDrop = (day: DayOfWeek, sesiId: SesiType) => {
    if (!draggedGuruId) return;

    setMatrixState((prev) => {
      const existingIndex = prev.findIndex((m) => m.hari === day && m.sesiId === sesiId);
      if (existingIndex >= 0) {
        const existing = prev[existingIndex];
        if (existing.guruIds.includes(draggedGuruId)) return prev; // Already in slot
        const updated = [...prev];
        updated[existingIndex] = {
          ...existing,
          id: existing.id || `mat-${day}-${sesiId}`,
          guruIds: [...existing.guruIds, draggedGuruId],
        };
        return updated;
      } else {
        return [
          ...prev,
          {
            id: `mat-${day}-${sesiId}`,
            hari: day,
            sesiId,
            guruIds: [draggedGuruId],
          },
        ];
      }
    });

    const activeList = guruList.length > 0 ? guruList : mockGuru;
    const activeSessions = sesiList.length > 0 ? sesiList : mockSesiList;
    const guru = activeList.find((g) => g.id === draggedGuruId);
    const sesi = activeSessions.find((s) => s.id === sesiId);
    setShowToast(`✓ ${guru?.nama.split(',')[0]} ditugaskan ke ${sesi?.nama} (${day})`);
    setTimeout(() => setShowToast(null), 2500);

    setDraggedGuruId(null);
    setHoveredCell(null);
  };

  // Remove teacher from cell
  const handleRemoveGuru = (day: DayOfWeek, sesiId: SesiType, guruId: string) => {
    setMatrixState((prev) =>
      prev.map((m) =>
        m.hari === day && m.sesiId === sesiId
          ? { ...m, guruIds: m.guruIds.filter((id) => id !== guruId) }
          : m
      )
    );
  };

  // Quick Add via Dropdown inside cell
  const handleQuickAdd = (day: DayOfWeek, sesiId: SesiType, guruId: string) => {
    if (!guruId) return;
    setMatrixState((prev) => {
      const existingIndex = prev.findIndex((m) => m.hari === day && m.sesiId === sesiId);
      if (existingIndex >= 0) {
        const existing = prev[existingIndex];
        if (existing.guruIds.includes(guruId)) return prev;
        const updated = [...prev];
        updated[existingIndex] = {
          ...existing,
          id: existing.id || `mat-${day}-${sesiId}`,
          guruIds: [...existing.guruIds, guruId],
        };
        return updated;
      } else {
        return [
          ...prev,
          { id: `mat-${day}-${sesiId}`, hari: day, sesiId, guruIds: [guruId] },
        ];
      }
    });

    const activeList = guruList.length > 0 ? guruList : mockGuru;
    const activeSessions = sesiList.length > 0 ? sesiList : mockSesiList;
    const guru = activeList.find((g) => g.id === guruId);
    const sesi = activeSessions.find((s) => s.id === sesiId);
    setShowToast(`✓ ${guru?.nama.split(',')[0]} ditambahkan ke ${sesi?.nama} (${day})`);
    setTimeout(() => setShowToast(null), 2500);
  };

  // Save changes & dispatch email notifications to teachers
  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Persist and sync matrix
      await savePersistedJadwalMatrix(matrixState);
    } catch (e) {
      console.error('Error saving matrix:', e);
    }

    const origin = typeof window !== 'undefined' ? window.location.origin : undefined;
    const activeGurus = guruList.length > 0 ? guruList : mockGuru;
    const activeSessions = sesiList.length > 0 ? sesiList : mockSesiList;

    // Send email to all teachers who have schedules in this matrix
    const emailPromises: Promise<any>[] = [];
    activeGurus.forEach((guru) => {
      const guruScheduleList: Array<{
        hari: string;
        mataPelajaran: string;
        jamMulai: string;
        jamSelesai: string;
        kelas: string;
        ruangan?: string;
      }> = [];

      matrixState.forEach((entry) => {
        if (entry.guruIds && entry.guruIds.includes(guru.id)) {
          const sesi = activeSessions.find((s) => s.id === entry.sesiId);
          if (sesi) {
            guruScheduleList.push({
              hari: entry.hari,
              mataPelajaran: sesi.nama,
              jamMulai: sesi.jamMulai,
              jamSelesai: sesi.jamSelesai,
              kelas: guru.jabatan || sesi.nama,
              ruangan: 'Ruang Halaqah / Kelas Yayasan',
            });
          }
        }
      });

      if (guru.email && guruScheduleList.length > 0) {
        emailPromises.push(
          sendScheduleNotificationEmail({
            guruNama: guru.nama,
            guruEmail: guru.email,
            jadwalList: guruScheduleList,
            appUrl: origin,
            leadMinutes: mockSettings.waktuBukaSebelumJadwal || 30,
          }).catch((err) => console.error('Error sending schedule email to', guru.email, err))
        );
      }
    });

    try {
      await Promise.all(emailPromises);
    } catch (e) {
      console.error('Error awaiting email promises:', e);
    }

    setIsSaving(false);
    setShowToast('✓ Matriks Jadwal berhasil disimpan & email konfirmasi terkirim ke Guru!');
    setTimeout(() => {
      router.push('/admin/jadwal');
    }, 1000);
  };

  const filteredTeachers = (guruList.length > 0 ? guruList : mockGuru).filter((g) =>
    g.nama.toLowerCase().includes(searchGuru.toLowerCase()) ||
    g.jabatan.toLowerCase().includes(searchGuru.toLowerCase())
  );

  return (
    <div>
      {/* Toast Notification */}
      {showToast && (
        <div className="toast-container" style={{ position: 'fixed', top: 80, bottom: 'auto', left: '50%', transform: 'translateX(-50%)' }}>
          <div className="toast toast-success">{showToast}</div>
        </div>
      )}

      {/* Topbar */}
      <div className="admin-topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <Link href="/admin/jadwal" className="btn btn-ghost btn-sm" style={{ padding: 8 }}>
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 800 }}>
              Atur Jadwal Guru (Drag &amp; Drop Grid)
            </h1>
            <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>
              Tarik guru ke kotak hari &amp; sesi yang diinginkan (Tampilan pas layar penuh)
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setShowResetModal(true)}
            disabled={isSaving}
            style={{
              fontSize: 12, padding: '6px 12px',
              color: 'var(--color-danger)', borderColor: 'rgba(239,68,68,0.3)',
              display: 'flex', alignItems: 'center', gap: 6
            }}
          >
            <RotateCcw size={14} /> Reset Jadwal
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={handleSave}
            disabled={isSaving}
            style={{ fontSize: 12, padding: '6px 14px' }}
          >
            <Save size={14} />
            {isSaving ? 'Menyimpan...' : 'Simpan Jadwal Guru'}
          </button>
        </div>
      </div>

      {/* MODAL KONFIRMASI RESET JADWAL */}
      {showResetModal && (
        <div className="modal-overlay" onClick={() => setShowResetModal(false)}>
          <div className="modal" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 800, color: 'var(--color-danger)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <RotateCcw size={18} /> Reset Seluruh Jadwal?
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
                ⚠️ Semua guru di seluruh sesi (Pagi, Siang, Sore, Malam) akan dikosongkan sehingga Anda dapat mulai mengisi jadwal baru dari awal.
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

      <div className="admin-content">
        
        {/* Helper Banner */}
        <div style={{
          padding: '8px 14px',
          background: 'var(--color-primary-light)',
          borderRadius: 'var(--radius-md)',
          marginBottom: 'var(--space-3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          border: '1px solid rgba(27,107,74,0.2)',
          fontSize: 'var(--font-size-xs)',
          color: 'var(--color-text-secondary)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Info size={15} color="var(--color-primary)" />
            <span>
              <strong>Petunjuk:</strong> Geser kartu guru dari panel kanan lalu drop ke kotak jadwal hari &amp; sesi di kiri.
            </span>
          </div>
          <span className="badge badge-primary" style={{ fontSize: 10 }}>7 Hari x 4 Sesi</span>
        </div>

        {/* ─── MAIN GRID + SIDEBAR (FITTED 100% WIDTH) ─── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 240px', gap: 'var(--space-3)', alignItems: 'flex-start' }}>
          
          {/* LEFT: MATRIX GRID (DAYS x 4 SESI) */}
          <div className="card" style={{ width: '100%', overflow: 'hidden' }}>
            <table style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', fontSize: 11 }}>
              <thead>
                <tr style={{ borderBottom: '1.5px solid var(--color-border)' }}>
                  <th style={{ width: '15%', background: 'var(--color-surface-2)', padding: '10px 6px', textAlign: 'left', fontWeight: 700 }}>
                    Sesi / Jam
                  </th>
                  {DAYS.map((day) => (
                    <th key={day} style={{ width: '12.14%', textAlign: 'center', padding: '10px 2px', background: 'var(--color-surface)', fontWeight: 800, borderLeft: '1px solid var(--color-border-light)' }}>
                      {day}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sesiList.map((sesi) => (
                  <tr key={sesi.id} style={{ borderBottom: '1px solid var(--color-border-light)' }}>
                    {/* Row Header (Sesi Info) */}
                    <td style={{
                      background: 'var(--color-surface-2)',
                      borderRight: '1px solid var(--color-border-light)',
                      verticalAlign: 'top',
                      padding: '10px 6px',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontWeight: 800, fontSize: 11, color: 'var(--color-text-primary)' }}>
                        {SESI_ICONS[sesi.id as SesiType] || <Clock size={15} color="var(--color-primary)" />}
                        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sesi.nama}</span>
                      </div>
                      <div style={{
                        marginTop: 2,
                        fontSize: 10,
                        fontWeight: 700,
                        color: 'var(--color-primary)',
                        fontVariantNumeric: 'tabular-nums',
                      }}>
                        {sesi.jamMulai}–{sesi.jamSelesai}
                      </div>
                    </td>

                    {/* Day Drop Cells */}
                    {DAYS.map((day) => {
                      const entry = matrixState.find((m) => m.hari === day && m.sesiId === sesi.id);
                      const activeGurus = guruList.length > 0 ? guruList : mockGuru;
                      const guruAssigned = (entry?.guruIds || [])
                        .map((gid) => activeGurus.find((g) => g.id === gid))
                        .filter(Boolean);

                      const isHovered = hoveredCell?.day === day && hoveredCell?.sesiId === sesi.id;

                      return (
                        <td
                          key={day}
                          onDragOver={(e) => handleDragOver(e, day, sesi.id)}
                          onDragLeave={handleDragLeave}
                          onDrop={() => handleDrop(day, sesi.id)}
                          style={{
                            verticalAlign: 'top',
                            padding: '4px 3px',
                            minHeight: 100,
                            height: 105,
                            background: isHovered
                              ? 'rgba(27, 107, 74, 0.15)'
                              : sesi.warna ? `${sesi.warna}40` : 'transparent',
                            borderLeft: '1px solid var(--color-border-light)',
                            border: isHovered ? '2px dashed var(--color-primary)' : undefined,
                            transition: 'background 0.1s ease',
                          }}
                        >
                          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 3 }}>
                            
                            {/* Assigned Teachers Chips */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: 1 }}>
                              {guruAssigned.map((g) => (
                                <div
                                  key={g?.id}
                                  title={g?.nama}
                                  style={{
                                    background: 'white',
                                    borderRadius: 4,
                                    padding: '2px 4px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
                                    border: '1px solid rgba(0,0,0,0.08)',
                                    width: '100%',
                                  }}
                                >
                                  <span style={{ fontSize: 9, fontWeight: 700, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1, minWidth: 0 }}>
                                    {g?.nama.split(',')[0].replace('Ustadz ', '').replace('Ustadzah ', '')}
                                  </span>

                                  <button
                                    type="button"
                                    onClick={() => handleRemoveGuru(day, sesi.id, g!.id)}
                                    title="Hapus dari slot ini"
                                    style={{
                                      background: 'none',
                                      border: 'none',
                                      color: '#9CA3AF',
                                      cursor: 'pointer',
                                      padding: 0,
                                      marginLeft: 2,
                                      display: 'flex',
                                      alignItems: 'center',
                                    }}
                                  >
                                    <X size={10} />
                                  </button>
                                </div>
                              ))}

                              {/* Empty Drop Target Zone */}
                              {guruAssigned.length === 0 && (
                                <div style={{
                                  flex: 1,
                                  border: '1px dashed rgba(0,0,0,0.18)',
                                  borderRadius: 4,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: 'var(--color-text-tertiary)',
                                  fontSize: 9,
                                  padding: '4px 2px',
                                  textAlign: 'center',
                                }}>
                                  <span>+ Drop</span>
                                </div>
                              )}
                            </div>

                            {/* Mini Quick Add Dropdown */}
                            <select
                              className="form-select"
                              style={{
                                fontSize: 8,
                                height: 20,
                                padding: '1px 2px',
                                background: 'white',
                                border: '1px solid rgba(0,0,0,0.1)',
                                marginTop: 1,
                                width: '100%',
                              }}
                              value=""
                              onChange={(e) => {
                                if (e.target.value) handleQuickAdd(day, sesi.id, e.target.value);
                              }}
                            >
                              <option value="">+ Guru</option>
                              {activeGurus.map((g) => (
                                <option key={g.id} value={g.id}>
                                  {g.nama.split(',')[0]}
                                </option>
                              ))}
                            </select>

                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* RIGHT: DRAGGABLE TEACHERS PANEL (BANK GURU) */}
          <div className="card" style={{ position: 'sticky', top: 90 }}>
            <div className="card-header" style={{ background: 'var(--color-surface-2)', padding: 'var(--space-3)' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 11, display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Users size={14} color="var(--color-primary)" />
                  Daftar Guru
                </div>
                <div style={{ fontSize: 9, color: 'var(--color-text-tertiary)', marginTop: 1 }}>
                  Tarik ke kotak sesi
                </div>
              </div>
            </div>

            <div className="card-body" style={{ padding: 'var(--space-2)' }}>
              {/* Search */}
              <div style={{ marginBottom: 6 }}>
                <input
                  className="form-input"
                  placeholder="Cari guru..."
                  style={{ fontSize: 10, height: 28, padding: '2px 8px' }}
                  value={searchGuru}
                  onChange={(e) => setSearchGuru(e.target.value)}
                />
              </div>

              {/* Draggable Teacher List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: '65vh', overflowY: 'auto' }}>
                {filteredTeachers.map((g) => (
                  <div
                    key={g.id}
                    draggable
                    onDragStart={() => handleDragStart(g.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '5px 8px',
                      background: 'var(--color-surface)',
                      borderRadius: 4,
                      border: '1.2px solid var(--color-border)',
                      cursor: 'grab',
                      userSelect: 'none',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary)')}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
                  >
                    <GripVertical size={11} color="var(--color-text-tertiary)" style={{ flexShrink: 0 }} />
                    <div className="avatar avatar-sm" style={{ width: 22, height: 22, fontSize: 9, flexShrink: 0 }}>
                      {getInitials(g.nama)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {g.nama.split(',')[0]}
                      </div>
                      <div style={{ fontSize: 8, color: 'var(--color-text-tertiary)' }}>{g.jabatan}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
