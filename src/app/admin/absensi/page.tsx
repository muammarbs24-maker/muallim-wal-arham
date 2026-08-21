'use client';

import { useState, useEffect } from 'react';
import { Search, Filter, Download } from 'lucide-react';
import { mockAbsensi, mockGuru, loadPersistedData } from '@/lib/mockData';
import { getStatusLabel, getTodayStringWITA } from '@/lib/utils';
import type { AttendanceStatus, AbsensiRecord, Guru } from '@/types';

const STATUS_OPTIONS: { value: AttendanceStatus | ''; label: string }[] = [
  { value: '', label: 'Semua Status' },
  { value: 'hadir_tepat_waktu', label: 'Hadir Tepat Waktu' },
  { value: 'terlambat', label: 'Terlambat' },
  { value: 'izin', label: 'Izin' },
  { value: 'sakit', label: 'Sakit' },
  { value: 'alfa', label: 'Alfa' },
  { value: 'belum_absen', label: 'Belum Absen' },
];

export default function AdminAbsensiPage() {
  const [filterGuru, setFilterGuru] = useState('');
  const [filterStatus, setFilterStatus] = useState<AttendanceStatus | ''>('');
  const [filterTanggal, setFilterTanggal] = useState(getTodayStringWITA());
  const [absensiList, setAbsensiList] = useState<AbsensiRecord[]>([]);
  const [guruList, setGuruList] = useState<Guru[]>([]);

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

    import('@/lib/supabaseClient').then(({ getAbsensiSupabase, getGurusSupabase }) => {
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
    }).catch(() => {});
  }, []);

  const filtered = absensiList.filter((a) => {
    const matchGuru = !filterGuru || a.guruId === filterGuru;
    const matchStatus = !filterStatus || a.status === filterStatus;
    const matchTanggal = !filterTanggal || a.tanggal === filterTanggal;
    return matchGuru && matchStatus && matchTanggal;
  }).sort((a, b) => b.tanggal.localeCompare(a.tanggal) || (a.jamMasuk || '').localeCompare(b.jamMasuk || ''));

  const statusColors: Record<string, string> = {
    hadir_tepat_waktu: 'success', terlambat: 'warning',
    izin: 'info', sakit: 'info', alfa: 'danger', belum_absen: 'neutral',
  };

  return (
    <div>
      <div className="admin-topbar">
        <div>
          <h1 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 800 }}>Manajemen Absensi</h1>
          <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>{filtered.length} catatan ditemukan</p>
        </div>
        <button className="btn btn-secondary btn-sm">
          <Download size={16} /> Ekspor
        </button>
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

              {(filterGuru || filterStatus || filterTanggal) && (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  style={{ fontSize: 11, height: 30, padding: '0 10px', borderRadius: 9999 }}
                  onClick={() => { setFilterGuru(''); setFilterStatus(''); setFilterTanggal(''); }}
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
                  <th>Jam Masuk</th>
                  <th>Jam Pulang</th>
                  <th>Status</th>
                  <th>Keterlambatan</th>
                  <th>Lokasi Valid</th>
                  <th>Keterangan</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a) => (
                  <tr key={a.id}>
                    <td style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)', whiteSpace: 'nowrap' }}>
                      {new Date(a.tanggal).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>{a.guruNama.split(',')[0]}</div>
                      <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>
                        {guruList.find((g) => g.id === a.guruId)?.jabatan || mockGuru.find((g) => g.id === a.guruId)?.jabatan}
                      </div>
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>{a.jamMasuk ? `${a.jamMasuk} WITA` : '—'}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{a.jamPulang ? `${a.jamPulang} WITA` : '—'}</td>
                    <td>
                      <span className={`badge badge-${statusColors[a.status]}`}>
                        {getStatusLabel(a.status)}
                      </span>
                    </td>
                    <td>
                      {a.keterlambatan > 0 ? (
                        <span style={{ color: 'var(--color-warning)', fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>
                          {a.keterlambatan} menit
                        </span>
                      ) : '—'}
                    </td>
                    <td>
                      {a.lokasiValid ? (
                        <span className="badge badge-success" style={{ fontSize: 10 }}>Valid</span>
                      ) : (
                        <span className="badge badge-neutral" style={{ fontSize: 10 }}>—</span>
                      )}
                    </td>
                    <td style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', maxWidth: 120 }}>
                      {a.keterangan || '—'}
                    </td>
                  </tr>
                ))}
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
