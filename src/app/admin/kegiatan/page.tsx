'use client';

import { useState } from 'react';
import { Plus, Edit2, Trash2, CheckCircle2, XCircle, Clock, Star } from 'lucide-react';
import { mockKegiatan, mockPartisipasi, mockGuru } from '@/lib/mockData';
import type { Kegiatan, KegiatanPartisipasi } from '@/types';

export default function AdminKegiatanPage() {
  const [kegiatanList, setKegiatanList] = useState(mockKegiatan);
  const [partisipasiList, setPartisipasiList] = useState(mockPartisipasi);
  const [activeTab, setActiveTab] = useState<'list' | 'verifikasi'>('list');
  const [selectedKegiatan, setSelectedKegiatan] = useState<Kegiatan | null>(null);
  const [showSuccess, setShowSuccess] = useState<string | null>(null);

  const handleVerifikasi = (kegiatanId: string, guruId: string, hadir: boolean) => {
    setPartisipasiList((prev) =>
      prev.map((p) => {
        if (p.kegiatanId === kegiatanId && p.guruId === guruId) {
          const k = kegiatanList.find((k) => k.id === kegiatanId);
          const poin = hadir ? (p.jenisPartisipasi === 'koordinator' ? k?.poinKoordinator : p.jenisPartisipasi === 'panitia' ? k?.poinPanitia : k?.poinPeserta) || 0 : 0;
          return { ...p, hadirVerifikasi: hadir, poinDiterima: poin };
        }
        return p;
      })
    );
    setShowSuccess(`✓ Kehadiran ${hadir ? 'dikonfirmasi' : 'ditolak'}`);
    setTimeout(() => setShowSuccess(null), 2500);
  };

  const selesaiKegiatan = kegiatanList.filter((k) => k.status === 'selesai');
  const aktifKegiatan = kegiatanList.filter((k) => k.status !== 'selesai');

  const statusColors = { berlangsung: 'success', mendatang: 'primary', selesai: 'neutral' } as const;
  const statusLabels = { berlangsung: 'Berlangsung', mendatang: 'Mendatang', selesai: 'Selesai' };

  return (
    <div>
      {showSuccess && (
        <div className="toast-container" style={{ position: 'fixed', top: 80, bottom: 'auto', left: '50%', transform: 'translateX(-50%)' }}>
          <div className="toast toast-success">{showSuccess}</div>
        </div>
      )}

      <div className="admin-topbar">
        <div>
          <h1 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 800 }}>Manajemen Kegiatan</h1>
          <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>{kegiatanList.length} kegiatan total</p>
        </div>
        <button className="btn btn-primary btn-sm hide-on-mobile">
          <Plus size={16} /> Tambah Kegiatan
        </button>
      </div>

      <div className="admin-content">
        {/* Mobile Action Button */}
        <div style={{ display: 'flex', marginBottom: 10 }} className="show-on-mobile-flex">
          <button className="btn btn-primary btn-sm" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontWeight: 700 }}>
            <Plus size={15} /> Tambah Kegiatan
          </button>
        </div>

        {/* Report / Activity Tabs — Horizontal Swipe Only */}
        <div style={{
          display: 'flex',
          flexWrap: 'nowrap',
          overflowX: 'auto',
          overflowY: 'hidden',
          touchAction: 'pan-x',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
          gap: 8,
          marginBottom: 'var(--space-4)',
        }}>
          <button
            type="button"
            className={`tab-pill ${activeTab === 'list' ? 'active' : ''}`}
            onClick={() => setActiveTab('list')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '7px 16px',
              borderRadius: 9999,
              fontSize: 12,
              fontWeight: 700,
              border: activeTab === 'list' ? '1.5px solid var(--color-primary)' : '1px solid var(--color-border)',
              background: activeTab === 'list' ? 'var(--color-primary)' : 'var(--color-surface)',
              color: activeTab === 'list' ? '#ffffff' : 'var(--color-text-secondary)',
              cursor: 'pointer',
              flexShrink: 0,
              whiteSpace: 'nowrap',
              transition: 'all 0.15s ease',
            }}
          >
            Daftar Kegiatan
          </button>
          <button
            type="button"
            className={`tab-pill ${activeTab === 'verifikasi' ? 'active' : ''}`}
            onClick={() => setActiveTab('verifikasi')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '7px 16px',
              borderRadius: 9999,
              fontSize: 12,
              fontWeight: 700,
              border: activeTab === 'verifikasi' ? '1.5px solid var(--color-primary)' : '1px solid var(--color-border)',
              background: activeTab === 'verifikasi' ? 'var(--color-primary)' : 'var(--color-surface)',
              color: activeTab === 'verifikasi' ? '#ffffff' : 'var(--color-text-secondary)',
              cursor: 'pointer',
              flexShrink: 0,
              whiteSpace: 'nowrap',
              transition: 'all 0.15s ease',
            }}
          >
            Verifikasi Kehadiran
          </button>
        </div>

        {activeTab === 'list' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {kegiatanList.map((k) => {
              const partisipasi = partisipasiList.filter((p) => p.kegiatanId === k.id);
              const hadirCount = partisipasi.filter((p) => p.respons === 'hadir').length;
              const tidakHadirCount = partisipasi.filter((p) => p.respons === 'tidak_hadir').length;
              const belumResponsCount = mockGuru.length - hadirCount - tidakHadirCount;

              return (
                <div key={k.id} className="card">
                  <div className="card-header">
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', flexWrap: 'wrap' }}>
                        <span className={`badge badge-${statusColors[k.status]}`}>{statusLabels[k.status]}</span>
                        <span className="badge badge-neutral">{k.jenis}</span>
                        {k.wajib && <span className="badge badge-danger">Wajib</span>}
                      </div>
                      <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 700, marginTop: 'var(--space-2)' }}>{k.nama}</h3>
                      <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', marginTop: 4 }}>
                        {new Date(k.tanggal).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })} •
                        {k.jamMulai}–{k.jamSelesai} WITA • {k.lokasi}
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: 'var(--space-2)', flexShrink: 0 }}>
                      <button className="btn btn-secondary btn-sm">
                        <Edit2 size={13} />
                      </button>
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => { setSelectedKegiatan(k); setActiveTab('verifikasi'); }}
                      >
                        Verifikasi
                      </button>
                    </div>
                  </div>
                  <div className="card-body">
                    <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-4)' }}>
                      {k.deskripsi}
                    </p>
                    {/* Participation summary */}
                    <div style={{ display: 'flex', gap: 'var(--space-4)' }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 'var(--font-size-xl)', fontWeight: 800, color: 'var(--color-success)' }}>{hadirCount}</div>
                        <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)' }}>Akan Hadir</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 'var(--font-size-xl)', fontWeight: 800, color: 'var(--color-danger)' }}>{tidakHadirCount}</div>
                        <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)' }}>Tidak Hadir</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 'var(--font-size-xl)', fontWeight: 800, color: 'var(--color-text-tertiary)' }}>{belumResponsCount}</div>
                        <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)' }}>Belum Merespons</div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <VerifikasiPanel
            kegiatan={selectedKegiatan}
            kegiatanList={kegiatanList}
            partisipasiList={partisipasiList}
            onSelectKegiatan={setSelectedKegiatan}
            onVerifikasi={handleVerifikasi}
          />
        )}
      </div>
    </div>
  );
}

function VerifikasiPanel({
  kegiatan, kegiatanList, partisipasiList, onSelectKegiatan, onVerifikasi,
}: {
  kegiatan: Kegiatan | null;
  kegiatanList: Kegiatan[];
  partisipasiList: KegiatanPartisipasi[];
  onSelectKegiatan: (k: Kegiatan) => void;
  onVerifikasi: (kegiatanId: string, guruId: string, hadir: boolean) => void;
}) {
  const selesaiOrBerlangsung = kegiatanList.filter((k) => k.status !== 'mendatang');

  return (
    <div className="admin-verifikasi-layout">
      {/* Kegiatan selector */}
      <div style={{ width: '100%' }}>
        <div className="card">
          <div className="card-header">
            <span style={{ fontWeight: 700, fontSize: 'var(--font-size-sm)' }}>Pilih Kegiatan</span>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            {selesaiOrBerlangsung.map((k) => (
              <button
                key={k.id}
                onClick={() => onSelectKegiatan(k)}
                style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  padding: 'var(--space-3) var(--space-4)',
                  borderBottom: '1px solid var(--color-border-light)',
                  background: kegiatan?.id === k.id ? 'var(--color-primary-light)' : 'none',
                  border: 'none', cursor: 'pointer',
                }}
              >
                <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: kegiatan?.id === k.id ? 'var(--color-primary)' : 'var(--color-text-primary)' }}>
                  {k.nama}
                </div>
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', marginTop: 2 }}>
                  {new Date(k.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', timeZone: 'UTC' })}
                </div>
              </button>
            ))}
            {selesaiOrBerlangsung.length === 0 && (
              <div className="empty-state" style={{ padding: 'var(--space-5)' }}>
                <div className="empty-state-desc">Tidak ada kegiatan untuk diverifikasi.</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Verification table */}
      {kegiatan ? (
        <div style={{ flex: 1 }}>
          <div className="card">
            <div className="card-header">
              <div>
                <h3 style={{ fontWeight: 700 }}>{kegiatan.nama}</h3>
                <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', marginTop: 2 }}>
                  Verifikasi kehadiran aktual guru
                </p>
              </div>
            </div>
            <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Guru</th>
                    <th>Respons</th>
                    <th>Jenis Partisipasi</th>
                    <th>Kehadiran Aktual</th>
                    <th>Poin Diterima</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {mockGuru.map((g) => {
                    const part = partisipasiList.find((p) => p.kegiatanId === kegiatan.id && p.guruId === g.id);
                    return (
                      <tr key={g.id}>
                        <td>
                          <div style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>{g.nama.split(',')[0]}</div>
                          <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>{g.jabatan}</div>
                        </td>
                        <td>
                          <span className={`badge ${!part || part.respons === 'belum_merespons' ? 'badge-neutral' : part.respons === 'hadir' ? 'badge-success' : 'badge-danger'}`}>
                            {!part || part.respons === 'belum_merespons' ? 'Belum Respons' : part.respons === 'hadir' ? 'Akan Hadir' : 'Tidak Hadir'}
                          </span>
                        </td>
                        <td>
                          {part?.jenisPartisipasi ? (
                            <span className="badge badge-primary">
                              {part.jenisPartisipasi.charAt(0).toUpperCase() + part.jenisPartisipasi.slice(1)}
                            </span>
                          ) : '—'}
                        </td>
                        <td>
                          {part?.hadirVerifikasi === true ? (
                            <span className="badge badge-success"><CheckCircle2 size={11} /> Hadir</span>
                          ) : part?.hadirVerifikasi === false ? (
                            <span className="badge badge-danger"><XCircle size={11} /> Tidak Hadir</span>
                          ) : (
                            <span className="badge badge-neutral"><Clock size={11} /> Belum Diverifikasi</span>
                          )}
                        </td>
                        <td>
                          {(part?.poinDiterima || 0) > 0 ? (
                            <span style={{ fontWeight: 700, color: 'var(--color-accent)', display: 'flex', alignItems: 'center', gap: 4 }}>
                              <Star size={12} /> +{part?.poinDiterima}
                            </span>
                          ) : '—'}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 'var(--space-1)' }}>
                            <button className="btn btn-secondary btn-sm" style={{ fontSize: 10 }} onClick={() => onVerifikasi(kegiatan.id, g.id, true)}>
                              ✓ Hadir
                            </button>
                            <button className="btn btn-ghost btn-sm" style={{ fontSize: 10, color: 'var(--color-danger)' }} onClick={() => onVerifikasi(kegiatan.id, g.id, false)}>
                              ✕
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="empty-state">
            <div className="empty-state-icon"><CheckCircle2 size={24} /></div>
            <div className="empty-state-title">Pilih Kegiatan</div>
            <div className="empty-state-desc">Pilih kegiatan dari panel kiri untuk memulai verifikasi kehadiran.</div>
          </div>
        </div>
      )}
    </div>
  );
}
