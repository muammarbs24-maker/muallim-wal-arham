'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, Filter, Download, Camera, CheckCircle2, XCircle, Clock, Eye, AlertCircle, Sparkles, RefreshCw } from 'lucide-react';
import { mockAbsensi, mockGuru, mockSettings, loadPersistedData, savePersistedAbsensi } from '@/lib/mockData';
import { getStatusLabel, getTodayStringWITA, formatRupiah, cleanupExpiredVerifiedPhotos } from '@/lib/utils';
import type { AttendanceStatus, AbsensiRecord, Guru, AppSettings } from '@/types';

const STATUS_OPTIONS: { value: AttendanceStatus | ''; label: string }[] = [
  { value: '', label: 'Semua Status' },
  { value: 'hadir_tepat_waktu', label: 'Hadir Tepat Waktu' },
  { value: 'terlambat', label: 'Terlambat' },
  { value: 'alfa', label: 'Alfa' },
  { value: 'belum_absen', label: 'Belum Absen' },
];

export default function AdminAbsensiPage() {
  const [filterGuru, setFilterGuru] = useState('');
  const [filterStatus, setFilterStatus] = useState<AttendanceStatus | ''>('');
  const [filterTanggal, setFilterTanggal] = useState(getTodayStringWITA());
  const [filterPhotoStatus, setFilterPhotoStatus] = useState<'all' | 'pending' | 'verified' | 'rejected'>('all');
  const [absensiList, setAbsensiList] = useState<AbsensiRecord[]>([]);
  const [guruList, setGuruList] = useState<Guru[]>([]);
  const [appSettings, setAppSettings] = useState<AppSettings>(mockSettings);
  const [selectedPhotoRecord, setSelectedPhotoRecord] = useState<AbsensiRecord | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fetchLiveSupabaseData = async (manual = false) => {
    if (manual) setIsRefreshing(true);
    try {
      const { getAbsensiSupabase, getGurusSupabase, getAppSettingsSupabase } = await import('@/lib/supabaseClient');
      const [s, data, gurus] = await Promise.all([
        getAppSettingsSupabase(),
        getAbsensiSupabase(),
        getGurusSupabase(),
      ]);

      if (s) setAppSettings(s);

      if (Array.isArray(data)) {
        const { updated, cleanedCount } = cleanupExpiredVerifiedPhotos(data);
        if (cleanedCount > 0) {
          savePersistedAbsensi(updated);
        }
        setAbsensiList(updated);
        mockAbsensi.length = 0;
        mockAbsensi.push(...updated);
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('muallim_absensi_list', JSON.stringify(updated));
          } catch (e) {}
        }
      }

      if (Array.isArray(gurus) && gurus.length > 0) {
        setGuruList(gurus);
        mockGuru.length = 0;
        mockGuru.push(...gurus);
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('muallim_guru_list', JSON.stringify(gurus));
          } catch (e) {}
        }
      }

      if (manual) {
        setToastMessage('✓ Data absensi berhasil diperbarui.');
        setTimeout(() => setToastMessage(null), 3000);
      }
    } catch (err) {
      console.warn('Error fetchLiveSupabaseData:', err);
    } finally {
      if (manual) setIsRefreshing(false);
    }
  };

  const refreshData = () => {
    loadPersistedData();
    if (typeof window !== 'undefined') {
      try {
        const savedSettings = localStorage.getItem('muallim_app_settings');
        if (savedSettings) {
          const parsed = JSON.parse(savedSettings);
          if (parsed) setAppSettings(parsed);
        }

        const savedAbs = localStorage.getItem('muallim_absensi_list');
        if (savedAbs) {
          const parsed: AbsensiRecord[] = JSON.parse(savedAbs);
          if (Array.isArray(parsed)) {
            const { updated, cleanedCount } = cleanupExpiredVerifiedPhotos(parsed);
            if (cleanedCount > 0) {
              savePersistedAbsensi(updated);
            }
            setAbsensiList(updated);
          }
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
    fetchLiveSupabaseData();

    // Auto-polling every 4 seconds so teacher attendance updates live
    const interval = setInterval(() => {
      fetchLiveSupabaseData();
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  const handleVerifyPhoto = async (recordId: string, status: 'verified' | 'rejected') => {
    setIsVerifying(true);
    const nowIso = new Date().toISOString();
    const updated = absensiList.map((a) => {
      if (a.id === recordId) {
        return {
          ...a,
          fotoMasukStatus: status,
          fotoMasukVerifiedAt: nowIso,
        };
      }
      return a;
    });

    setAbsensiList(updated);
    mockAbsensi.length = 0;
    mockAbsensi.push(...updated);
    savePersistedAbsensi(updated);

    const targetRecord = updated.find((a) => a.id === recordId);
    if (targetRecord) {
      try {
        const { upsertAbsensiSupabase } = await import('@/lib/supabaseClient');
        await upsertAbsensiSupabase(targetRecord);
      } catch (err) {}
    }

    setIsVerifying(false);
    setSelectedPhotoRecord(null);
    setToastMessage(status === 'verified' ? '✓ Foto selfie presensi berhasil disetujui/diterima.' : '✕ Foto selfie presensi ditolak.');
    setTimeout(() => setToastMessage(null), 3500);
  };

  const filtered = absensiList.filter((a) => {
    const matchGuru = !filterGuru || a.guruId === filterGuru;
    const matchStatus = !filterStatus || a.status === filterStatus;
    const matchTanggal = !filterTanggal || a.tanggal === filterTanggal;
    const matchPhoto =
      filterPhotoStatus === 'all'
        ? true
        : filterPhotoStatus === 'pending'
        ? a.fotoMasuk && (!a.fotoMasukStatus || a.fotoMasukStatus === 'pending')
        : filterPhotoStatus === 'verified'
        ? a.fotoMasukStatus === 'verified'
        : a.fotoMasukStatus === 'rejected';
    return matchGuru && matchStatus && matchTanggal && matchPhoto;
  }).sort((a, b) => b.tanggal.localeCompare(a.tanggal) || (a.jamMasuk || '').localeCompare(b.jamMasuk || ''));

  const statusColors: Record<string, string> = {
    hadir_tepat_waktu: 'success', terlambat: 'warning',
    izin: 'info', sakit: 'info', alfa: 'danger', belum_absen: 'neutral',
  };

  const tarif = appSettings.tarifPerJam || 30000;
  const totalJamBulan = filtered.reduce((acc, curr) => acc + (curr.jamDibayar || 0), 0);
  const totalHonorBulan = filtered.reduce((acc, curr) => acc + (curr.honorNominal || ((curr.jamDibayar || 0) * tarif)), 0);

  return (
    <div>
      {/* Toast */}
      {toastMessage && (
        <div className="toast-container" style={{ position: 'fixed', top: 80, left: '50%', transform: 'translateX(-50%)', zIndex: 9999 }}>
          <div className="toast toast-success">{toastMessage}</div>
        </div>
      )}

      {/* MODAL PREVIEW & VERIFIKASI FOTO SELFIE */}
      {selectedPhotoRecord && (
        <div className="modal-overlay" onClick={() => setSelectedPhotoRecord(null)}>
          <div className="modal" style={{ maxWidth: 460 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 800, color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Camera size={18} color="var(--color-primary)" /> Verifikasi Foto Presensi Selfie
              </h3>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {/* Foto preview */}
              <div style={{ textAlign: 'center', background: '#000', borderRadius: 'var(--radius-md)', overflow: 'hidden', minHeight: 240, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {selectedPhotoRecord.fotoMasuk ? (
                  <img
                    src={selectedPhotoRecord.fotoMasuk}
                    alt={`Selfie ${selectedPhotoRecord.guruNama}`}
                    style={{ width: '100%', maxHeight: 320, objectFit: 'cover' }}
                  />
                ) : (
                  <div style={{ color: '#9CA3AF', fontSize: 12, padding: 20 }}>
                    Foto telah terhapus otomatis setelah 1x24 jam verifikasi.
                  </div>
                )}
              </div>

              {/* Rincian Guru & Presensi */}
              <div style={{ padding: '10px 14px', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-md)', fontSize: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ color: 'var(--color-text-tertiary)' }}>Nama Guru:</span>
                  <span style={{ fontWeight: 800 }}>{selectedPhotoRecord.guruNama}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ color: 'var(--color-text-tertiary)' }}>Tanggal & Jam Masuk:</span>
                  <span style={{ fontWeight: 700 }}>{selectedPhotoRecord.tanggal} ({selectedPhotoRecord.jamMasuk} WITA)</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ color: 'var(--color-text-tertiary)' }}>Sesi / Pelajaran:</span>
                  <span style={{ fontWeight: 700 }}>{selectedPhotoRecord.sesiNama || selectedPhotoRecord.keterangan || 'Sesi Mengajar'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ color: 'var(--color-text-tertiary)' }}>Jam Diakui:</span>
                  <span style={{ fontWeight: 800, color: 'var(--color-primary)' }}>{selectedPhotoRecord.jamDibayar || 0} Jam ({formatRupiah((selectedPhotoRecord.jamDibayar || 0) * tarif)})</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, paddingTop: 6, borderTop: '1px solid var(--color-border-light)' }}>
                  <span style={{ color: 'var(--color-text-tertiary)' }}>Status Verifikasi:</span>
                  <span style={{
                    fontWeight: 800,
                    color: selectedPhotoRecord.fotoMasukStatus === 'verified' ? '#15803D' : selectedPhotoRecord.fotoMasukStatus === 'rejected' ? '#DC2626' : '#D97706'
                  }}>
                    {selectedPhotoRecord.fotoMasukStatus === 'verified' ? '✓ Diterima' : selectedPhotoRecord.fotoMasukStatus === 'rejected' ? '✕ Ditolak' : '⏳ Menunggu Verifikasi'}
                  </span>
                </div>
              </div>

              <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', lineHeight: 1.4 }}>
                ℹ️ <em>Foto yang sudah diverifikasi (diterima/ditolak) akan otomatis dihapus oleh sistem setelah 1x24 jam demi menghemat penyimpanan.</em>
              </div>
            </div>

            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setSelectedPhotoRecord(null)}>
                Tutup
              </button>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  className="btn btn-sm"
                  style={{ background: '#FEE2E2', color: '#DC2626', border: '1px solid #FCA5A5', fontWeight: 800 }}
                  disabled={isVerifying}
                  onClick={() => handleVerifyPhoto(selectedPhotoRecord.id, 'rejected')}
                >
                  <XCircle size={14} /> Tolak Foto
                </button>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  style={{ fontWeight: 800 }}
                  disabled={isVerifying}
                  onClick={() => handleVerifyPhoto(selectedPhotoRecord.id, 'verified')}
                >
                  <CheckCircle2 size={14} /> {isVerifying ? 'Memproses...' : 'Terima (Verifikasi)'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="admin-topbar">
        <div>
          <h1 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 800 }}>Manajemen Absensi & Honor Mengajar</h1>
          <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>
            {filtered.length} catatan ditemukan • Tarif Aktif: <strong>{formatRupiah(tarif)}/jam</strong>
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => fetchLiveSupabaseData(true)}
            disabled={isRefreshing}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontWeight: 700,
              fontSize: '12px',
              padding: '6px 12px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
              backgroundColor: 'var(--color-surface)',
              color: 'var(--color-text-secondary)',
              transition: 'all 0.15s ease',
              boxShadow: 'var(--shadow-xs)',
            }}
            title="Segarkan data absensi terbaru"
          >
            <RefreshCw size={13} className={isRefreshing ? 'animate-spin' : ''} /> {isRefreshing ? 'Memuat...' : 'Segarkan'}
          </button>

          <div style={{
            background: 'var(--color-surface-2)',
            padding: '6px 12px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border-light)',
            textAlign: 'right'
          }}>
            <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)', fontWeight: 700, textTransform: 'uppercase' }}>Total Jam & Honor</div>
            <div style={{ fontSize: 13, fontWeight: 900, color: 'var(--color-primary)' }}>
              {Number(totalJamBulan.toFixed(2))} Jam ({formatRupiah(totalHonorBulan)})
            </div>
          </div>
        </div>
      </div>

      <div className="admin-content">
        {/* Capsule Filters Card */}
        <div className="card" style={{ padding: 'var(--space-3) var(--space-4)', marginBottom: 'var(--space-4)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            
            {/* Status Capsule Row */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', marginRight: 4 }}>
                Status:
              </span>
              {STATUS_OPTIONS.map((o) => {
                const active = filterStatus === o.value;
                return (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => setFilterStatus(o.value)}
                    style={{
                      padding: '3px 10px',
                      borderRadius: 9999,
                      fontSize: 11,
                      fontWeight: 700,
                      border: active ? '1.5px solid var(--color-primary)' : '1px solid var(--color-border)',
                      background: active ? 'var(--color-primary)' : 'var(--color-surface)',
                      color: active ? '#ffffff' : 'var(--color-text-secondary)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {o.label}
                  </button>
                );
              })}

              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', marginLeft: 12, marginRight: 4 }}>
                Verifikasi Foto:
              </span>
              {[
                { val: 'all' as const, label: 'Semua' },
                { val: 'pending' as const, label: '⏳ Menunggu' },
                { val: 'verified' as const, label: '✓ Diterima' },
                { val: 'rejected' as const, label: '✕ Ditolak' },
              ].map((p) => {
                const active = filterPhotoStatus === p.val;
                return (
                  <button
                    key={p.val}
                    type="button"
                    onClick={() => setFilterPhotoStatus(p.val)}
                    style={{
                      padding: '3px 10px',
                      borderRadius: 9999,
                      fontSize: 11,
                      fontWeight: 700,
                      border: active ? '1.5px solid var(--color-primary)' : '1px solid var(--color-border)',
                      background: active ? 'var(--color-primary)' : 'var(--color-surface-2)',
                      color: active ? '#ffffff' : 'var(--color-text-secondary)',
                      cursor: 'pointer',
                    }}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>

            {/* Date and Teacher Compact Controls */}
            <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 200 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-tertiary)', textTransform: 'uppercase' }}>Guru:</span>
                <select className="form-select" style={{ fontSize: 12, height: 32, padding: '2px 24px 2px 8px', borderRadius: 9999 }} value={filterGuru} onChange={(e) => setFilterGuru(e.target.value)}>
                  <option value="">Semua Guru</option>
                  {guruList.map((g) => <option key={g.id} value={g.id}>{g.nama}</option>)}
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 200 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-tertiary)', textTransform: 'uppercase' }}>Tanggal:</span>
                <input
                  type="date"
                  className="form-input"
                  style={{ fontSize: 12, height: 32, padding: '2px 10px', borderRadius: 9999 }}
                  value={filterTanggal}
                  onChange={(e) => setFilterTanggal(e.target.value)}
                />
              </div>

              {(filterGuru || filterStatus || filterTanggal || filterPhotoStatus !== 'all') && (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  style={{ fontSize: 11, height: 30, padding: '0 10px', borderRadius: 9999 }}
                  onClick={() => { setFilterGuru(''); setFilterStatus(''); setFilterTanggal(''); setFilterPhotoStatus('all'); }}
                >
                  ✕ Reset Filter
                </button>
              )}
            </div>

          </div>
        </div>

        {/* Table */}
        <div className="card">
          <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Tanggal</th>
                  <th>Guru</th>
                  <th>Foto Selfie</th>
                  <th>Jam Masuk</th>
                  <th>Jam Pulang</th>
                  <th>Status Hadir</th>
                  <th>Jam Mengajar</th>
                  <th>Honor Sesi</th>
                  <th>Aksi Verifikasi</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a) => {
                  const hours = typeof a.jamDibayar === 'number' ? a.jamDibayar : 0;
                  const sessionHonor = a.honorNominal || (hours * tarif);
                  const isPhotoPending = a.fotoMasuk && (!a.fotoMasukStatus || a.fotoMasukStatus === 'pending');
                  const isPhotoVerified = a.fotoMasukStatus === 'verified';
                  const isPhotoRejected = a.fotoMasukStatus === 'rejected';

                  return (
                    <tr key={a.id}>
                      <td style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)', whiteSpace: 'nowrap' }}>
                        {new Date(a.tanggal).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })}
                      </td>
                      <td>
                        <Link
                          href={`/admin/laporan?tab=rekap&guruId=${encodeURIComponent(a.guruId)}`}
                          style={{ fontWeight: 700, fontSize: 'var(--font-size-sm)', color: 'var(--color-primary)', textDecoration: 'none' }}
                          onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                          onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
                          title="Lihat Rekapitulasi & Honor Guru"
                        >
                          {a.guruNama.split(',')[0]} →
                        </Link>
                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>
                          {a.sesiNama || a.keterangan || 'Sesi Mengajar'}
                        </div>
                      </td>
                      <td>
                        {a.fotoMasuk ? (
                          <div
                            onClick={() => setSelectedPhotoRecord(a)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6,
                              cursor: 'pointer',
                              padding: '2px 6px',
                              background: 'var(--color-surface-2)',
                              borderRadius: 'var(--radius-md)',
                              border: '1px solid var(--color-border-light)',
                            }}
                          >
                            <img
                              src={a.fotoMasuk}
                              alt="Selfie"
                              style={{ width: 28, height: 28, borderRadius: 4, objectFit: 'cover' }}
                            />
                            <span style={{
                              fontSize: 10,
                              fontWeight: 800,
                              color: isPhotoVerified ? '#15803D' : isPhotoRejected ? '#DC2626' : '#D97706'
                            }}>
                              {isPhotoVerified ? '✓ Diterima' : isPhotoRejected ? '✕ Ditolak' : '⏳ Cek'}
                            </span>
                          </div>
                        ) : isPhotoVerified ? (
                          <span style={{ fontSize: 10, color: '#15803D', fontWeight: 700 }}>
                            ✓ Terverifikasi (Diarsipkan)
                          </span>
                        ) : (
                          <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>—</span>
                        )}
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>{a.jamMasuk ? `${a.jamMasuk} WITA` : '—'}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>{a.jamPulang ? `${a.jamPulang} WITA` : '—'}</td>
                      <td>
                        <span className={`badge badge-${statusColors[a.status]}`}>
                          {getStatusLabel(a.status)}
                        </span>
                        {a.keterlambatan > 0 && (
                          <div style={{ fontSize: 10, color: 'var(--color-warning)', fontWeight: 700, marginTop: 2 }}>
                            Terlambat {a.keterlambatan}m
                          </div>
                        )}
                      </td>
                      <td>
                        {hours > 0 ? (
                          <div>
                            <span style={{ color: 'var(--color-primary)', fontWeight: 900, fontSize: 'var(--font-size-sm)' }}>
                              {hours} jam
                            </span>
                            {a.durasiMenit ? (
                              <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)' }}>
                                ({Math.floor(a.durasiMenit / 60)}j {a.durasiMenit % 60}m)
                              </div>
                            ) : null}
                          </div>
                        ) : (
                          <span style={{ color: 'var(--color-text-tertiary)' }}>0 jam</span>
                        )}
                      </td>
                      <td>
                        <span style={{ fontWeight: 800, color: 'var(--color-primary-dark)', fontSize: 'var(--font-size-sm)' }}>
                          {formatRupiah(sessionHonor)}
                        </span>
                      </td>
                      <td>
                        {a.fotoMasuk ? (
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => setSelectedPhotoRecord(a)}
                            style={{ fontSize: 11, padding: '3px 8px', borderRadius: 'var(--radius-sm)', fontWeight: 700 }}
                          >
                            <Eye size={12} /> Verifikasi
                          </button>
                        ) : (
                          <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>Selesai</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && (
            <div className="empty-state">
              <div className="empty-state-icon"><Filter size={24} /></div>
              <div className="empty-state-title">Tidak Ada Data</div>
              <div className="empty-state-desc">Tidak ada catatan absensi yang sesuai dengan filter.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

