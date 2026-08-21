'use client';

import { useState, useEffect } from 'react';
import { Download, BarChart2, FileText, Calendar, Clock, Mail, Send, CheckCircle2, Sparkles } from 'lucide-react';
import { mockAbsensi, mockGuru, loadPersistedData, masterAdmin } from '@/lib/mockData';
import {
  getStatusLabel, getTodayStringWITA, getMonthName,
  hitungDurasi, hitungDurasiMenit,
} from '@/lib/utils';
import type { AttendanceStatus, AbsensiRecord, Guru } from '@/types';

const STATUS_COLORS: Record<string, string> = {
  hadir_tepat_waktu: 'success',
  terlambat: 'warning',
  izin: 'info',
  sakit: 'info',
  alfa: 'danger',
  belum_absen: 'neutral',
};

/** Format menit total menjadi "X jam Y menit" */
function formatTotalMenit(totalMenit: number): string {
  if (totalMenit <= 0) return '—';
  const jam = Math.floor(totalMenit / 60);
  const menit = totalMenit % 60;
  if (jam === 0) return `${menit} mnt`;
  if (menit === 0) return `${jam} jam`;
  return `${jam}j ${menit}m`;
}

export default function AdminLaporanPage() {
  const [activeReport, setActiveReport] = useState<'harian' | 'bulanan' | 'rekap'>('harian');
  const [filterTanggal, setFilterTanggal] = useState(getTodayStringWITA());
  const [filterBulan, setFilterBulan] = useState(
    String(new Date().getMonth() + 1).padStart(2, '0')
  );
  const [filterTahun, setFilterTahun] = useState(String(new Date().getFullYear()));
  const [absensiList, setAbsensiList] = useState<AbsensiRecord[]>([]);
  const [guruList, setGuruList] = useState<Guru[]>([]);
  const [adminEmail, setAdminEmail] = useState(masterAdmin.email || 'admin@muallim.sch.id');
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [showToast, setShowToast] = useState<string | null>(null);

  const refreshData = () => {
    loadPersistedData();
    if (typeof window !== 'undefined') {
      try {
        const savedAbs = localStorage.getItem('muallim_absensi_list');
        if (savedAbs) {
          const parsed = JSON.parse(savedAbs);
          if (Array.isArray(parsed)) {
            setAbsensiList([...parsed]);
          }
        } else {
          setAbsensiList([]);
        }

        const savedGurus = localStorage.getItem('muallim_guru_list');
        if (savedGurus) {
          const parsed = JSON.parse(savedGurus);
          if (Array.isArray(parsed)) {
            setGuruList([...parsed]);
          }
        } else {
          setGuruList([...mockGuru]);
        }
      } catch (e) {}
    }
  };

  useEffect(() => {
    refreshData();

    import('@/lib/supabaseClient').then(({ getAbsensiSupabase, getGurusSupabase, getAdminAccountSupabase }) => {
      getAbsensiSupabase().then((data) => {
        if (data !== null && data !== undefined) {
          setAbsensiList(data);
          mockAbsensi.length = 0;
          mockAbsensi.push(...data);
        }
      }).catch(() => {});

      getGurusSupabase().then((gurus) => {
        if (gurus && gurus.length > 0) {
          setGuruList(gurus);
          mockGuru.length = 0;
          mockGuru.push(...gurus);
        }
      }).catch(() => {});

      getAdminAccountSupabase().then((admin) => {
        if (admin?.email) {
          setAdminEmail(admin.email);
        }
      }).catch(() => {});
    }).catch(() => {});
  }, []);

  const handleSendEmailReportNow = async () => {
    setIsSendingEmail(true);
    try {
      const res = await fetch('/api/cron/laporan-bulanan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bulan: filterBulan,
          tahun: filterTahun,
          recipient: adminEmail,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowToast(`✓ Laporan bulanan (${data.periode}) berhasil dikirimkan ke email pemilik (${data.recipient})!`);
      } else {
        setShowToast(`❌ Gagal mengirim: ${data.error || 'Terjadi kesalahan sistem'}`);
      }
    } catch (e) {
      setShowToast('❌ Terjadi kendala saat mengirim email laporan.');
    }
    setIsSendingEmail(false);
    setTimeout(() => setShowToast(null), 4500);
  };

  const harianData = absensiList.filter((a) => a.tanggal === filterTanggal);
  const bulananData = absensiList.filter((a) => {
    const [y, m] = a.tanggal.split('-');
    return y === filterTahun && m === filterBulan;
  });

  // Rekap per guru dengan total jam
  const rekapData = (guruList.length > 0 ? guruList : mockGuru).filter((g) => g.aktif).map((g) => {
    const abs = bulananData.filter((a) => a.guruId === g.id);
    const totalMenit = abs.reduce(
      (sum, a) => sum + hitungDurasiMenit(a.jamMasuk, a.jamPulang),
      0
    );
    return {
      guru: g,
      hadir: abs.filter((a) => a.status === 'hadir_tepat_waktu').length,
      terlambat: abs.filter((a) => a.status === 'terlambat').length,
      izin: abs.filter((a) => a.status === 'izin').length,
      sakit: abs.filter((a) => a.status === 'sakit').length,
      alfa: abs.filter((a) => a.status === 'alfa').length,
      total: abs.length,
      totalMenit,
    };
  });

  // Ringkasan statistik harian
  const harianTotalMenit = harianData.reduce(
    (sum, a) => sum + hitungDurasiMenit(a.jamMasuk, a.jamPulang),
    0
  );
  const harianSudahPulang = harianData.filter((a) => a.jamPulang).length;

  return (
    <div>
      {/* Toast Notification */}
      {showToast && (
        <div className="toast-container" style={{ position: 'fixed', top: 80, bottom: 'auto', left: '50%', transform: 'translateX(-50%)', zIndex: 9999 }}>
          <div className="toast toast-success">{showToast}</div>
        </div>
      )}

      {/* Topbar */}
      <div className="admin-topbar">
        <div>
          <h1 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 800 }}>Laporan Presensi</h1>
          <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>
            Rekapitulasi kehadiran guru harian, bulanan, dan total jam kerja
          </p>
        </div>
        <div className="hide-on-mobile" style={{ gap: 'var(--space-2)' }}>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={handleSendEmailReportNow}
            disabled={isSendingEmail}
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}
          >
            {isSendingEmail ? (
              <>
                <span className="animate-spin"><Clock size={14} /></span> Mengirim...
              </>
            ) : (
              <>
                <Mail size={15} /> Kirim Laporan ke Email Pemilik
              </>
            )}
          </button>
        </div>
      </div>

      <div className="admin-content">
        {/* Report Type Tabs — Horizontal Swipe Only */}
        <div style={{
          display: 'flex',
          flexWrap: 'nowrap',
          overflowX: 'auto',
          overflowY: 'hidden',
          touchAction: 'pan-x',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          gap: 8,
          marginBottom: 'var(--space-5)',
          paddingBottom: 4,
        }}>
          {[
            { key: 'harian', label: 'Laporan Harian', icon: <Calendar size={14} /> },
            { key: 'bulanan', label: 'Laporan Bulanan', icon: <BarChart2 size={14} /> },
            { key: 'rekap', label: 'Rekap Per Guru', icon: <FileText size={14} /> },
          ].map(({ key, label, icon }) => {
            const active = activeReport === key;
            return (
              <button
                key={key}
                type="button"
                className={`tab-pill ${active ? 'active' : ''}`}
                onClick={() => setActiveReport(key as typeof activeReport)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '7px 16px',
                  borderRadius: 9999,
                  fontSize: 12,
                  fontWeight: 700,
                  border: active ? '1.5px solid var(--color-primary)' : '1px solid var(--color-border)',
                  background: active ? 'var(--color-primary)' : 'var(--color-surface)',
                  color: active ? '#ffffff' : 'var(--color-text-secondary)',
                  cursor: 'pointer',
                  flexShrink: 0,
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease',
                }}
              >
                {icon} {label}
              </button>
            );
          })}
        </div>

        {/* ============================================================
            LAPORAN HARIAN
            ============================================================ */}
        {activeReport === 'harian' && (
          <div>
            {/* Filter */}
            <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-4)', alignItems: 'center', flexWrap: 'wrap' }}>
              <label style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>
                Pilih Tanggal:
              </label>
              <input
                type="date"
                className="form-input"
                style={{ maxWidth: 200 }}
                value={filterTanggal}
                onChange={(e) => setFilterTanggal(e.target.value)}
              />
              <span className="badge badge-neutral">{harianData.length} catatan</span>
            </div>

            {/* Summary Cards */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: 'var(--space-3)',
              marginBottom: 'var(--space-5)',
            }}>
              {(['hadir_tepat_waktu', 'terlambat', 'izin', 'sakit', 'alfa'] as AttendanceStatus[]).map((s) => {
                const count = harianData.filter((a) => a.status === s).length;
                return (
                  <div key={s} className="stat-card" style={{ flexDirection: 'column', gap: 'var(--space-1)', padding: 'var(--space-4)' }}>
                    <div style={{
                      fontSize: 'var(--font-size-2xl)', fontWeight: 800,
                      color: `var(--color-${STATUS_COLORS[s]})`,
                    }}>
                      {count}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {getStatusLabel(s)}
                    </div>
                  </div>
                );
              })}

              {/* Total Jam Kerja */}
              <div className="stat-card" style={{ flexDirection: 'column', gap: 'var(--space-1)', padding: 'var(--space-4)', background: 'var(--color-primary-light)', border: '1px solid rgba(27,107,74,0.2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                  <Clock size={14} color="var(--color-primary)" />
                </div>
                <div style={{ fontSize: 'var(--font-size-xl)', fontWeight: 800, color: 'var(--color-primary)' }}>
                  {formatTotalMenit(harianTotalMenit)}
                </div>
                <div style={{ fontSize: 10, color: 'var(--color-primary)', fontWeight: 600, opacity: 0.8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Total Jam Hari Ini
                </div>
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>
                  dari {harianSudahPulang} guru
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="card">
              <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Guru</th>
                      <th>Jabatan</th>
                      <th>Jam Masuk</th>
                      <th>Jam Pulang</th>
                      <th style={{ color: 'var(--color-primary)' }}>Total Jam Kerja</th>
                      <th>Status</th>
                      <th>Keterlambatan</th>
                      <th>Keterangan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {harianData.map((a) => {
                      const g = mockGuru.find((g) => g.id === a.guruId);
                      const durasi = hitungDurasi(a.jamMasuk, a.jamPulang);
                      return (
                        <tr key={a.id}>
                          <td style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>
                            {a.guruNama.split(',')[0]}
                          </td>
                          <td style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>
                            {g?.jabatan}
                          </td>
                          <td style={{ fontWeight: 500 }}>
                            {a.jamMasuk ? `${a.jamMasuk} WITA` : '—'}
                          </td>
                          <td style={{ fontWeight: 500 }}>
                            {a.jamPulang ? `${a.jamPulang} WITA` : (
                              <span style={{ color: 'var(--color-text-tertiary)', fontStyle: 'italic', fontSize: 'var(--font-size-xs)' }}>
                                Belum absen
                              </span>
                            )}
                          </td>
                          <td>
                            {durasi !== '—' ? (
                              <span style={{
                                display: 'inline-flex', alignItems: 'center', gap: 4,
                                fontWeight: 700, color: 'var(--color-primary)',
                                fontSize: 'var(--font-size-sm)',
                              }}>
                                <Clock size={12} />
                                {durasi}
                              </span>
                            ) : (
                              <span style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-xs)' }}>
                                {a.jamMasuk && !a.jamPulang ? 'Sedang berlangsung' : '—'}
                              </span>
                            )}
                          </td>
                          <td>
                            <span className={`badge badge-${STATUS_COLORS[a.status]}`}>
                              {getStatusLabel(a.status)}
                            </span>
                          </td>
                          <td>
                            {a.keterlambatan > 0 ? (
                              <span style={{ color: 'var(--color-warning)', fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>
                                {a.keterlambatan} mnt
                              </span>
                            ) : '—'}
                          </td>
                          <td style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>
                            {a.keterangan || '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {harianData.length === 0 && (
                <div className="empty-state">
                  <div className="empty-state-title">Tidak Ada Data Absensi</div>
                  <div className="empty-state-desc">Pilih tanggal yang memiliki catatan absensi.</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============================================================
            LAPORAN BULANAN
            ============================================================ */}
        {activeReport === 'bulanan' && (
          <div>
            {/* Automated Email Cron Info Card */}
            <div style={{
              padding: '14px 18px',
              background: 'linear-gradient(135deg, rgba(27, 107, 74, 0.08) 0%, rgba(20, 83, 45, 0.04) 100%)',
              border: '1.5px solid rgba(27, 107, 74, 0.25)',
              borderRadius: 'var(--radius-lg)',
              marginBottom: 'var(--space-4)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 12,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 38, height: 38, borderRadius: 'var(--radius-md)',
                  background: 'var(--color-primary)', color: 'white',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                }}>
                  <Mail size={18} />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--color-primary-dark)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Sparkles size={14} color="#D97706" /> Pengiriman Otomatis Setiap Tanggal 1 Pukul 08:00 WITA
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--color-text-secondary)', marginTop: 2 }}>
                    Laporan rekapitulasi presensi bulanan dikirimkan secara otomatis via server ke email: <strong>{adminEmail}</strong>
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={handleSendEmailReportNow}
                disabled={isSendingEmail}
                style={{ fontSize: 12, padding: '7px 14px', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}
              >
                {isSendingEmail ? (
                  <>
                    <span className="animate-spin"><Clock size={13} /></span> Mengirim Laporan...
                  </>
                ) : (
                  <>
                    <Send size={13} /> Kirim Rekap ({getMonthName(parseInt(filterBulan, 10))} {filterTahun}) Sekarang
                  </>
                )}
              </button>
            </div>

            <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-5)', alignItems: 'center', flexWrap: 'wrap' }}>
              <label style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                Bulan:
              </label>
              <select className="form-select" style={{ maxWidth: 140 }} value={filterBulan} onChange={(e) => setFilterBulan(e.target.value)}>
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={String(i + 1).padStart(2, '0')}>
                    {getMonthName(i + 1)}
                  </option>
                ))}
              </select>
              <input
                type="number"
                className="form-input"
                style={{ maxWidth: 100 }}
                value={filterTahun}
                onChange={(e) => setFilterTahun(e.target.value)}
              />
              <span className="badge badge-neutral">{bulananData.length} catatan</span>
              <span className="badge badge-primary" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Clock size={11} />
                Total: {formatTotalMenit(
                  bulananData.reduce((s, a) => s + hitungDurasiMenit(a.jamMasuk, a.jamPulang), 0)
                )} bulan ini
              </span>
            </div>

            <div className="card">
              <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Tanggal</th>
                      <th>Guru</th>
                      <th>Jam Masuk</th>
                      <th>Jam Pulang</th>
                      <th style={{ color: 'var(--color-primary)' }}>Total Jam Kerja</th>
                      <th>Status</th>
                      <th>Keterlambatan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bulananData
                      .sort((a, b) => b.tanggal.localeCompare(a.tanggal))
                      .map((a) => {
                        const durasi = hitungDurasi(a.jamMasuk, a.jamPulang);
                        return (
                          <tr key={a.id}>
                            <td style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                              {new Date(a.tanggal).toLocaleDateString('id-ID', {
                                weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC',
                              })}
                            </td>
                            <td style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>
                              {a.guruNama.split(',')[0]}
                            </td>
                            <td>{a.jamMasuk ? `${a.jamMasuk} WITA` : '—'}</td>
                            <td>{a.jamPulang ? `${a.jamPulang} WITA` : (
                              <span style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-xs)', fontStyle: 'italic' }}>
                                Belum absen
                              </span>
                            )}</td>
                            <td>
                              {durasi !== '—' ? (
                                <span style={{
                                  display: 'inline-flex', alignItems: 'center', gap: 4,
                                  fontWeight: 700, color: 'var(--color-primary)',
                                  fontSize: 'var(--font-size-sm)',
                                }}>
                                  <Clock size={12} />
                                  {durasi}
                                </span>
                              ) : (
                                <span style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-xs)' }}>
                                  {a.jamMasuk && !a.jamPulang ? 'Sedang berlangsung' : '—'}
                                </span>
                              )}
                            </td>
                            <td>
                              <span className={`badge badge-${STATUS_COLORS[a.status]}`}>
                                {getStatusLabel(a.status)}
                              </span>
                            </td>
                            <td>
                              {a.keterlambatan > 0 ? (
                                <span style={{ color: 'var(--color-warning)', fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>
                                  {a.keterlambatan} mnt
                                </span>
                              ) : '—'}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
              {bulananData.length === 0 && (
                <div className="empty-state">
                  <div className="empty-state-title">Tidak Ada Data Bulan Ini</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============================================================
            REKAP PER GURU
            ============================================================ */}
        {activeReport === 'rekap' && (
          <div>
            <div style={{ marginBottom: 'var(--space-5)', display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
              <label style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                Periode:
              </label>
              <select className="form-select" style={{ maxWidth: 140 }} value={filterBulan} onChange={(e) => setFilterBulan(e.target.value)}>
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={String(i + 1).padStart(2, '0')}>
                    {getMonthName(i + 1)}
                  </option>
                ))}
              </select>
              <input
                type="number"
                className="form-input"
                style={{ maxWidth: 100 }}
                value={filterTahun}
                onChange={(e) => setFilterTahun(e.target.value)}
              />
            </div>

            <div className="card">
              <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Guru</th>
                      <th>Jabatan</th>
                      <th style={{ color: 'var(--color-success)' }}>Hadir</th>
                      <th style={{ color: 'var(--color-warning)' }}>Terlambat</th>
                      <th style={{ color: 'var(--color-info)' }}>Izin</th>
                      <th style={{ color: 'var(--color-info)' }}>Sakit</th>
                      <th style={{ color: 'var(--color-danger)' }}>Alfa</th>
                      <th>Total Hari</th>
                      <th style={{ color: 'var(--color-primary)' }}>Total Jam Kerja</th>
                      <th>Rata-rata/Hari</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rekapData.map((r) => {
                      const rataRata = r.hadir + r.terlambat > 0
                        ? Math.round(r.totalMenit / (r.hadir + r.terlambat))
                        : 0;
                      return (
                        <tr key={r.guru.id}>
                          <td style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>
                            {r.guru.nama.split(',')[0]}
                          </td>
                          <td style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>
                            {r.guru.jabatan}
                          </td>
                          <td style={{ color: 'var(--color-success)', fontWeight: 700 }}>{r.hadir}</td>
                          <td style={{ color: 'var(--color-warning)', fontWeight: 700 }}>{r.terlambat}</td>
                          <td style={{ color: 'var(--color-info)', fontWeight: 700 }}>{r.izin}</td>
                          <td style={{ color: 'var(--color-info)', fontWeight: 700 }}>{r.sakit}</td>
                          <td style={{ color: 'var(--color-danger)', fontWeight: 700 }}>{r.alfa}</td>
                          <td style={{ fontWeight: 600 }}>{r.total}</td>
                          <td>
                            {r.totalMenit > 0 ? (
                              <span style={{
                                display: 'inline-flex', alignItems: 'center', gap: 4,
                                fontWeight: 700, color: 'var(--color-primary)',
                                fontSize: 'var(--font-size-sm)',
                              }}>
                                <Clock size={12} />
                                {formatTotalMenit(r.totalMenit)}
                              </span>
                            ) : (
                              <span style={{ color: 'var(--color-text-tertiary)' }}>—</span>
                            )}
                          </td>
                          <td style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>
                            {rataRata > 0 ? formatTotalMenit(rataRata) : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  {/* Footer total keseluruhan */}
                  {rekapData.length > 0 && (
                    <tfoot>
                      <tr style={{ background: 'var(--color-primary-light)' }}>
                        <td colSpan={8} style={{ fontWeight: 700, color: 'var(--color-primary)', fontSize: 'var(--font-size-sm)', padding: '10px 16px' }}>
                          Total Keseluruhan
                        </td>
                        <td style={{ padding: '10px 16px' }}>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            fontWeight: 800, color: 'var(--color-primary)',
                            fontSize: 'var(--font-size-base)',
                          }}>
                            <Clock size={14} />
                            {formatTotalMenit(rekapData.reduce((s, r) => s + r.totalMenit, 0))}
                          </span>
                        </td>
                        <td style={{ padding: '10px 16px', color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-xs)' }}>
                          semua guru
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
