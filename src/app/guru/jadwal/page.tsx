'use client';

import { useState, useEffect } from 'react';
import {
  Clock, MapPin, Sun, Sunset, Moon, Info, CheckCircle2, XCircle, AlertCircle, Send, Edit2
} from 'lucide-react';
import {
  currentGuru, mockJadwal, mockJadwalMatrix, mockGuru, mockSesiList, mockAbsensi,
  syncMatrixToJadwal, loadPersistedData, mockSettings, savePersistedAbsensi
} from '@/lib/mockData';
import { getTodayStringWITA, getDayOfWeekWITA } from '@/lib/utils';
import type { DayOfWeek, Jadwal, JadwalSesiEntry, SesiConfig, Guru, AppSettings, AbsensiRecord } from '@/types';

const DAYS: DayOfWeek[] = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Ahad'];

const SESI_ICONS: Record<string, React.ReactNode> = {
  pagi: <Sun size={14} color="#059669" />,
  siang: <Clock size={14} color="#D97706" />,
  sore: <Sunset size={14} color="#0284C7" />,
  tahfidz: <Moon size={14} color="#7C3AED" />,
};

export default function JadwalPage() {
  const [activeTab, setActiveTab] = useState<'saya' | 'keseluruhan'>('saya');
  const [schedulesList, setSchedulesList] = useState<Jadwal[]>([]);
  const [matrixList, setMatrixList] = useState<JadwalSesiEntry[]>([]);
  const [sesiList, setSesiList] = useState<SesiConfig[]>([]);
  const [absensiList, setAbsensiList] = useState<AbsensiRecord[]>([]);
  const [activeGuru, setActiveGuru] = useState<Guru>(currentGuru);
  const [appSettings, setAppSettings] = useState<AppSettings>(mockSettings);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modal Konfirmasi Izin/Sakit Jadwal Besok
  const [showIzinModal, setShowIzinModal] = useState(false);
  const [selectedJadwalBesok, setSelectedJadwalBesok] = useState<Jadwal | null>(null);
  const [izinType, setIzinType] = useState<'izin' | 'sakit'>('izin');
  const [alasanIzin, setAlasanIzin] = useState('');
  const [isSubmittingIzin, setIsSubmittingIzin] = useState(false);

  const refreshData = () => {
    loadPersistedData();
    syncMatrixToJadwal();
    setSchedulesList([...mockJadwal]);
    setMatrixList([...mockJadwalMatrix]);
    setSesiList([...mockSesiList]);
    setAbsensiList([...mockAbsensi]);
  };

  useEffect(() => {
    refreshData();
    if (typeof window !== 'undefined') {
      const savedUser = localStorage.getItem('muallim_guru_user');
      const savedId = localStorage.getItem('logged_in_guru_id');
      if (savedUser) {
        try {
          const parsed = JSON.parse(savedUser);
          if (parsed && parsed.id) {
            setActiveGuru(parsed);
          }
        } catch (e) {}
      } else if (savedId) {
        const found = mockGuru.find((g) => g.id === savedId);
        if (found) {
          setActiveGuru(found);
        }
      }

      const savedAbs = localStorage.getItem('muallim_absensi_list');
      if (savedAbs) {
        try {
          const parsed = JSON.parse(savedAbs);
          if (Array.isArray(parsed)) setAbsensiList(parsed);
        } catch (e) {}
      }
    }

    import('@/lib/supabaseClient').then(({ getJadwalMatrixSupabase, getSesiListSupabase, getAppSettingsSupabase, getGurusSupabase, getAbsensiSupabase }) => {
      getGurusSupabase().then((gurus) => {
        if (Array.isArray(gurus) && gurus.length > 0) {
          mockGuru.length = 0;
          mockGuru.push(...gurus);
          const savedId = typeof window !== 'undefined' ? localStorage.getItem('logged_in_guru_id') : null;
          if (savedId) {
            const f = gurus.find((g) => g.id === savedId);
            if (f) setActiveGuru(f);
          }
        }
      }).catch(() => {});

      getSesiListSupabase().then((sessions) => {
        if (sessions && sessions.length > 0) {
          mockSesiList.length = 0;
          mockSesiList.push(...sessions);
          setSesiList([...sessions]);
          syncMatrixToJadwal();
          setSchedulesList([...mockJadwal]);
        }
      }).catch(() => {});

      getJadwalMatrixSupabase().then((matrix) => {
        if (matrix !== null && matrix !== undefined) {
          mockJadwalMatrix.length = 0;
          mockJadwalMatrix.push(...matrix);
          syncMatrixToJadwal();
          setMatrixList([...mockJadwalMatrix]);
          setSchedulesList([...mockJadwal]);
        }
      }).catch(() => {});

      getAbsensiSupabase().then((data) => {
        if (Array.isArray(data)) {
          setAbsensiList(data);
          mockAbsensi.length = 0;
          mockAbsensi.push(...data);
        }
      }).catch(() => {});

      getAppSettingsSupabase().then((settings) => {
        if (settings) {
          setAppSettings(settings);
          Object.assign(mockSettings, settings);
        }
      }).catch(() => {});
    }).catch(() => {});
  }, []);

  // Hitung jadwal besok
  const daysArr: DayOfWeek[] = ['Ahad', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowDateStr = tomorrow.toISOString().split('T')[0];
  const tomorrowDayName = daysArr[tomorrow.getDay()] as DayOfWeek;

  const mySchedules = schedulesList.filter(
    (j) => (j.guruId === activeGuru.id || j.guruNama === activeGuru.nama || (activeGuru.nama && j.guruNama.toLowerCase() === activeGuru.nama.toLowerCase())) && j.aktif
  );

  const tomorrowSchedules = mySchedules.filter((j) => j.hari === tomorrowDayName);

  // Cek apakah guru sudah mengonfirmasi izin/sakit untuk besok
  const tomorrowAbsRecord = absensiList.find(
    (a) => (a.guruId === activeGuru.id || a.guruNama === activeGuru.nama) && a.tanggal === tomorrowDateStr
  );

  // Handle submit Izin / Sakit Jadwal Besok
  const handleSaveIzinBesok = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!alasanIzin.trim()) {
      alert('Mohon tuliskan alasan izin / sakit Anda.');
      return;
    }

    setIsSubmittingIzin(true);

    const recordId = tomorrowAbsRecord?.id || `abs-izin-${tomorrowDateStr}-${activeGuru.id}`;
    const newRecord: AbsensiRecord = {
      id: recordId,
      guruId: activeGuru.id,
      guruNama: activeGuru.nama,
      tanggal: tomorrowDateStr,
      jamMasuk: null,
      jamPulang: null,
      status: izinType,
      keterlambatan: 0,
      lokasiValid: true,
      keterangan: `Konfirmasi ${izinType === 'izin' ? 'Izin' : 'Sakit'}: ${alasanIzin.trim()}`,
      dibuatPada: new Date().toISOString(),
    };

    const updated = absensiList.filter((a) => a.id !== recordId);
    updated.unshift(newRecord);
    setAbsensiList(updated);
    mockAbsensi.length = 0;
    mockAbsensi.push(...updated);
    savePersistedAbsensi(updated);

    try {
      const { upsertAbsensiSupabase } = await import('@/lib/supabaseClient');
      await upsertAbsensiSupabase(newRecord);
    } catch (err) {}

    setIsSubmittingIzin(false);
    setShowIzinModal(false);
    markJadwalBesokConfirmed();
    setToastMessage(`✓ Konfirmasi ${izinType === 'izin' ? 'Izin' : 'Sakit'} untuk jadwal besok berhasil dikirim.`);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Handle konfirmasi siap hadir
  const markJadwalBesokConfirmed = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowDateStr = tomorrow.toISOString().split('T')[0];
    if (typeof window !== 'undefined') {
      localStorage.setItem('jadwal_besok_confirmed_date', tomorrowDateStr);
      window.dispatchEvent(new Event('jadwal_besok_confirmed'));
    }
  };

  // Handle konfirmasi siap hadir
  const handleConfirmHadirBesok = () => {
    markJadwalBesokConfirmed();
    setToastMessage(`✓ Terima kasih! Anda telah mengonfirmasi kehadiran untuk jadwal besok (${tomorrowDayName}).`);
    setTimeout(() => setToastMessage(null), 3500);
  };

  return (
    <>
      {/* Toast Notification */}
      {toastMessage && (
        <div className="toast-container" style={{ position: 'fixed', top: 80, bottom: 'auto', left: '50%', transform: 'translateX(-50%)', zIndex: 9999 }}>
          <div className="toast toast-success">{toastMessage}</div>
        </div>
      )}

      {/* MODAL KONFIRMASI IZIN / SAKIT BESOK */}
      {showIzinModal && (
        <div className="modal-overlay" onClick={() => setShowIzinModal(false)}>
          <div className="modal" style={{ maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 800, color: 'var(--color-text-primary)' }}>
                Konfirmasi Ketidakhadiran Jadwal Besok
              </h3>
            </div>
            <form onSubmit={handleSaveIzinBesok}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                <div style={{ padding: '10px 12px', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-md)', fontSize: 12 }}>
                  <div style={{ fontWeight: 700, color: 'var(--color-primary)' }}>
                    Jadwal: {tomorrowDayName}, {new Date(tomorrowDateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </div>
                  <div style={{ color: 'var(--color-text-secondary)', marginTop: 2 }}>
                    {tomorrowSchedules.map((s) => s.mataPelajaran).join(', ')}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }}>Kategori Tidak Hadir</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <button
                      type="button"
                      className={`btn btn-sm ${izinType === 'izin' ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => setIzinType('izin')}
                      style={{ fontWeight: 700 }}
                    >
                      Izin
                    </button>
                    <button
                      type="button"
                      className={`btn btn-sm ${izinType === 'sakit' ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => setIzinType('sakit')}
                      style={{ fontWeight: 700 }}
                    >
                      Sakit
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }}>Alasan Ketidakhadiran *</label>
                  <textarea
                    className="form-input"
                    rows={3}
                    placeholder="Contoh: Mengikuti acara keluarga di luar kota / Sakit demam..."
                    value={alasanIzin}
                    onChange={(e) => setAlasanIzin(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowIzinModal(false)}>
                  Batal
                </button>
                <button type="submit" className="btn btn-primary btn-sm" disabled={isSubmittingIzin} style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}>
                  <Send size={13} /> {isSubmittingIzin ? 'Mengirim...' : 'Kirim Konfirmasi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="page-header">
        <h1 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 800 }}>Jadwal Mengajar</h1>
        <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', marginTop: 2 }}>
          Yayasan Tahfidz Mu&apos;Allim Wal Arham
        </p>

        {/* Capsule Navigation */}
        <div style={{
          display: 'flex',
          gap: 8,
          marginTop: 'var(--space-4)',
          overflowX: 'auto',
          paddingBottom: 4,
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}>
          <button
            type="button"
            onClick={() => setActiveTab('saya')}
            style={{
              padding: '6px 14px',
              borderRadius: 9999,
              fontSize: 12,
              fontWeight: 700,
              border: activeTab === 'saya' ? '1.5px solid var(--color-primary)' : '1px solid var(--color-border)',
              background: activeTab === 'saya' ? 'var(--color-primary)' : 'var(--color-surface)',
              color: activeTab === 'saya' ? '#ffffff' : 'var(--color-text-secondary)',
              cursor: 'pointer',
              flexShrink: 0,
              transition: 'all 0.15s ease',
            }}
          >
            Jadwal Saya
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('keseluruhan')}
            style={{
              padding: '6px 14px',
              borderRadius: 9999,
              fontSize: 12,
              fontWeight: 700,
              border: activeTab === 'keseluruhan' ? '1.5px solid var(--color-primary)' : '1px solid var(--color-border)',
              background: activeTab === 'keseluruhan' ? 'var(--color-primary)' : 'var(--color-surface)',
              color: activeTab === 'keseluruhan' ? '#ffffff' : 'var(--color-text-secondary)',
              cursor: 'pointer',
              flexShrink: 0,
              transition: 'all 0.15s ease',
            }}
          >
            Matriks Jadwal Keseluruhan
          </button>
        </div>
      </div>

      <div style={{ padding: 'var(--space-4)' }}>
        {/* BANNER KONFIRMASI JADWAL BESOK */}
        {tomorrowSchedules.length > 0 && (
          <div className="card" style={{
            marginBottom: 'var(--space-4)',
            border: '1.5px solid var(--color-primary)',
            background: 'linear-gradient(135deg, var(--color-primary-light) 0%, var(--color-surface) 100%)',
            padding: 16,
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 800, fontSize: 'var(--font-size-sm)', color: 'var(--color-primary)' }}>
                  <Clock size={16} /> Jadwal Mengajar Besok ({tomorrowDayName}, {new Date(tomorrowDateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })})
                </div>
                <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 4 }}>
                  Anda memiliki <strong>{tomorrowSchedules.length} sesi mengajar</strong>: {tomorrowSchedules.map((s) => `${s.mataPelajaran} (${s.jamMulai}–${s.jamSelesai})`).join(', ')}.
                </div>
              </div>

              {tomorrowAbsRecord && (tomorrowAbsRecord.status === 'izin' || tomorrowAbsRecord.status === 'sakit') ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span className="badge badge-info" style={{ fontWeight: 700, padding: '4px 10px', fontSize: 11 }}>
                    ✓ {tomorrowAbsRecord.status === 'izin' ? 'Izin' : 'Sakit'} Terkonfirmasi
                  </span>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => {
                      setIzinType(tomorrowAbsRecord.status as any);
                      setAlasanIzin(tomorrowAbsRecord.keterangan.replace(/Konfirmasi (Izin|Sakit): /, ''));
                      setShowIzinModal(true);
                    }}
                    style={{ fontSize: 11, padding: '4px 8px' }}
                  >
                    <Edit2 size={12} /> Ubah
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={handleConfirmHadirBesok}
                    style={{ fontSize: 11, padding: '6px 12px', fontWeight: 700 }}
                  >
                    <CheckCircle2 size={13} /> Saya Siap Hadir
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => {
                      setIzinType('izin');
                      setAlasanIzin('');
                      setShowIzinModal(true);
                    }}
                    style={{ borderColor: 'var(--color-danger)', color: 'var(--color-danger)', fontSize: 11, padding: '6px 12px', fontWeight: 700 }}
                  >
                    <XCircle size={13} /> Tidak Bisa Hadir
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 1: JADWAL SAYA */}
        {activeTab === 'saya' && (
          <JadwalSaya
            schedules={mySchedules}
            lokasiNama={appSettings.lokasiNama}
          />
        )}

        {/* TAB 2: MATRIKS JADWAL KESELURUHAN */}
        {activeTab === 'keseluruhan' && (
          <MatriksJadwalKeseluruhan
            matrix={matrixList}
            sesiList={sesiList}
            activeGuruId={activeGuru.id}
          />
        )}
      </div>
    </>
  );
}

// ─── TAB 1: JADWAL SAYA ───────────────────────────────────────────
function JadwalSaya({
  schedules,
  lokasiNama,
}: {
  schedules: Jadwal[];
  lokasiNama?: string;
}) {
  if (schedules.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon"><Clock size={24} /></div>
        <div className="empty-state-title">Belum Ada Jadwal</div>
        <div className="empty-state-desc">Jadwal mengajar Anda akan tampil di sini setelah diatur oleh Admin.</div>
      </div>
    );
  }

  const grouped: Record<string, Jadwal[]> = {};
  DAYS.forEach((d) => {
    const items = schedules.filter((j) => j.hari === d);
    if (items.length > 0) grouped[d] = items;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      {Object.entries(grouped).map(([day, items]) => (
        <div key={day}>
          <div style={{
            fontSize: 'var(--font-size-xs)',
            fontWeight: 700,
            color: 'var(--color-primary)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            marginBottom: 'var(--space-2)',
          }}>
            {day}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {items.map((j) => (
              <div key={j.id} className="jadwal-card" style={{ background: 'var(--color-surface)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)', flex: 1 }}>
                  <div className="jadwal-time-bar" />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 700 }}>{j.mataPelajaran}</span>
                      <span className="badge badge-neutral">{j.hari}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', marginTop: 4 }}>
                      <Clock size={12} /> {j.jamMulai}–{j.jamSelesai} WITA
                    </div>
                    <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 6, flexWrap: 'wrap' }}>
                      {j.catatan && j.catatan !== 'Ustadz' && j.catatan !== 'Ustadzah' && j.catatan !== j.mataPelajaran && (
                        <span className="badge badge-primary">{j.catatan}</span>
                      )}
                      {lokasiNama && (
                        <span className="badge badge-neutral" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <MapPin size={11} /> {lokasiNama}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── TAB 2: MATRIKS JADWAL KESELURUHAN (GRID 7 HARI x SESI) ─────────
function MatriksJadwalKeseluruhan({
  matrix,
  sesiList,
  activeGuruId,
}: {
  matrix: JadwalSesiEntry[];
  sesiList: SesiConfig[];
  activeGuruId: string;
}) {
  return (
    <div>
      <div style={{
        padding: '10px 14px',
        background: 'var(--color-surface-2)',
        borderRadius: 'var(--radius-md)',
        marginBottom: 'var(--space-4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        border: '1px solid var(--color-border-light)',
        fontSize: 12,
        color: 'var(--color-text-secondary)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Info size={16} color="var(--color-primary)" />
          <span>
            Matriks penugasan seluruh guru (7 Hari). Kotak berwarna hijau adalah <strong>Jadwal Anda</strong>.
          </span>
        </div>
      </div>

      <div className="card" style={{ width: '100%', overflowX: 'auto' }}>
        <table style={{ width: '100%', minWidth: 700, borderCollapse: 'collapse', fontSize: 11 }}>
          <thead>
            <tr style={{ borderBottom: '1.5px solid var(--color-border)' }}>
              <th style={{ width: '15%', background: 'var(--color-surface-2)', padding: '10px 8px', textAlign: 'left', fontWeight: 800 }}>
                Sesi / Jam
              </th>
              {DAYS.map((day) => (
                <th key={day} style={{ width: '12.14%', textAlign: 'center', padding: '10px 4px', background: 'var(--color-surface)', fontWeight: 800, borderLeft: '1px solid var(--color-border-light)' }}>
                  {day}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sesiList.map((sesi) => (
              <tr key={sesi.id} style={{ borderBottom: '1px solid var(--color-border-light)' }}>
                {/* Sesi Info */}
                <td style={{
                  background: 'var(--color-surface-2)',
                  borderRight: '1px solid var(--color-border-light)',
                  verticalAlign: 'top',
                  padding: '10px 8px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontWeight: 800, fontSize: 11.5, color: 'var(--color-text-primary)' }}>
                    {SESI_ICONS[sesi.id] || <Clock size={14} color="var(--color-primary)" />}
                    <span>{sesi.nama}</span>
                  </div>
                  <div style={{ marginTop: 3, fontSize: 10.5, fontWeight: 700, color: 'var(--color-primary)' }}>
                    {sesi.jamMulai}–{sesi.jamSelesai}
                  </div>
                </td>

                {/* 7 Days Cells */}
                {DAYS.map((day) => {
                  const entry = matrix.find((m) => m.hari === day && m.sesiId === sesi.id);
                  const assignedTeachers = (entry?.guruIds || [])
                    .map((gid) => mockGuru.find((g) => g.id === gid))
                    .filter(Boolean) as Guru[];

                  const isMySlot = entry?.guruIds?.includes(activeGuruId);

                  return (
                    <td
                      key={day}
                      style={{
                        padding: 6,
                        verticalAlign: 'top',
                        borderLeft: '1px solid var(--color-border-light)',
                        background: isMySlot ? 'rgba(27, 107, 74, 0.06)' : 'var(--color-surface)',
                      }}
                    >
                      {assignedTeachers.length === 0 ? (
                        <div style={{ textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: 10, padding: '8px 0' }}>
                          —
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          {assignedTeachers.map((guru) => {
                            const isMe = guru.id === activeGuruId;
                            return (
                              <div
                                key={guru.id}
                                style={{
                                  padding: '4px 6px',
                                  borderRadius: 4,
                                  fontSize: 10.5,
                                  background: isMe ? 'var(--color-primary)' : 'var(--color-surface-2)',
                                  color: isMe ? '#ffffff' : 'var(--color-text-primary)',
                                  border: isMe ? 'none' : '1px solid var(--color-border-light)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  gap: 4,
                                }}
                              >
                                <span style={{ fontWeight: 700, fontSize: 10.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {isMe ? '✓ Saya' : guru.nama.split(',')[0]}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
