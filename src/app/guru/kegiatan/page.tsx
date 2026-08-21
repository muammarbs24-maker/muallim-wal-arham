'use client';

import { useState } from 'react';
import { Activity, Calendar, MapPin, Star, CheckCircle2, XCircle, Clock, Award } from 'lucide-react';
import { mockKegiatan, mockPartisipasi, currentGuru } from '@/lib/mockData';
import type { Kegiatan, KegiatanPartisipasi } from '@/types';

export default function KegiatanPage() {
  const [activeTab, setActiveTab] = useState<'semua' | 'berlangsung' | 'mendatang' | 'riwayat'>('semua');
  const [partisipasi, setPartisipasi] = useState<KegiatanPartisipasi[]>(mockPartisipasi);
  const [showModal, setShowModal] = useState<{ kegiatan: Kegiatan; type: 'hadir' | 'tidak' } | null>(null);
  const [showSuccess, setShowSuccess] = useState<string | null>(null);

  const berlangsungList = mockKegiatan.filter((k) => k.status === 'berlangsung');
  const mendatangList = mockKegiatan.filter((k) => k.status === 'mendatang');
  const riwayatList = mockKegiatan.filter((k) => k.status === 'selesai');

  const getMyPartisipasi = (kegiatanId: string) =>
    partisipasi.find((p) => p.kegiatanId === kegiatanId && p.guruId === currentGuru.id);

  const handleRespond = (kegiatan: Kegiatan, type: 'hadir' | 'tidak') => {
    setShowModal({ kegiatan, type });
  };

  const confirmRespond = () => {
    if (!showModal) return;
    const { kegiatan, type } = showModal;
    setPartisipasi((prev) => {
      const existing = prev.find((p) => p.kegiatanId === kegiatan.id && p.guruId === currentGuru.id);
      if (existing) {
        return prev.map((p) =>
          p.kegiatanId === kegiatan.id && p.guruId === currentGuru.id
            ? { ...p, respons: type === 'hadir' ? 'hadir' : 'tidak_hadir' as const }
            : p
        );
      } else {
        return [...prev, {
          id: `part-new-${Date.now()}`,
          kegiatanId: kegiatan.id,
          guruId: currentGuru.id,
          guruNama: currentGuru.nama,
          respons: type === 'hadir' ? 'hadir' : 'tidak_hadir' as const,
          responsDibuatPada: new Date().toISOString(),
          jenisPartisipasi: null,
          hadirVerifikasi: null,
          poinDiterima: 0,
        }];
      }
    });
    setShowModal(null);
    setShowSuccess(type === 'hadir'
      ? `✓ Anda terdaftar untuk kegiatan "${showModal.kegiatan.nama}"`
      : `Respons Anda telah dicatat.`
    );
    setTimeout(() => setShowSuccess(null), 3000);
  };

  const tabs: { key: 'semua' | 'berlangsung' | 'mendatang' | 'riwayat'; label: string; count: number }[] = [
    { key: 'semua', label: 'Semua', count: mockKegiatan.length },
    { key: 'berlangsung', label: 'Berlangsung', count: berlangsungList.length },
    { key: 'mendatang', label: 'Mendatang', count: mendatangList.length },
    { key: 'riwayat', label: 'Riwayat', count: riwayatList.length },
  ];

  const currentList =
    activeTab === 'semua' ? mockKegiatan :
    activeTab === 'berlangsung' ? berlangsungList :
    activeTab === 'mendatang' ? mendatangList : riwayatList;

  return (
    <>
      {/* Toast */}
      {showSuccess && (
        <div className="toast-container">
          <div className="toast toast-success">{showSuccess}</div>
        </div>
      )}

      {/* Confirm Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(null)}>
          <div className="modal" style={{ maxWidth: 340 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 700 }}>
                {showModal.type === 'hadir' ? 'Konfirmasi Kehadiran' : 'Konfirmasi Ketidakhadiran'}
              </h3>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-3)' }}>
                <strong>{showModal.kegiatan.nama}</strong>
              </p>
              <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                {showModal.type === 'hadir'
                  ? 'Anda akan didaftarkan sebagai peserta. Poin partisipasi akan diberikan setelah kehadiran diverifikasi oleh Admin.'
                  : 'Apakah Anda yakin tidak dapat mengikuti kegiatan ini?'}
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost btn-sm" onClick={() => setShowModal(null)}>Batal</button>
              <button
                className={`btn btn-sm ${showModal.type === 'hadir' ? 'btn-primary' : 'btn-danger'}`}
                onClick={confirmRespond}
              >
                {showModal.type === 'hadir' ? 'Ya, Saya Hadir' : 'Ya, Konfirmasi'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="page-header">
        <h1 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 800 }}>Kegiatan</h1>
        
        {/* Horizontal Capsule Pills */}
        <div style={{
          display: 'flex',
          gap: 8,
          marginTop: 'var(--space-3)',
          overflowX: 'auto',
          overflowY: 'hidden',
          whiteSpace: 'nowrap',
          paddingBottom: 4,
          scrollbarWidth: 'none',
          WebkitOverflowScrolling: 'touch',
        }}>
          {tabs.map(({ key, label, count }) => {
            const active = activeTab === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setActiveTab(key)}
                style={{
                  padding: '6px 14px',
                  borderRadius: 9999,
                  fontSize: 12,
                  fontWeight: 700,
                  border: active ? '1.5px solid var(--color-primary)' : '1px solid var(--color-border)',
                  background: active ? 'var(--color-primary)' : 'var(--color-surface)',
                  color: active ? '#ffffff' : 'var(--color-text-secondary)',
                  cursor: 'pointer',
                  flexShrink: 0,
                  transition: 'all 0.15s ease',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                {label}
                <span style={{
                  padding: '1px 6px',
                  borderRadius: 9999,
                  fontSize: 10,
                  fontWeight: 800,
                  background: active ? '#ffffff' : 'var(--color-surface-2)',
                  color: active ? 'var(--color-primary)' : 'var(--color-text-tertiary)',
                  border: active ? 'none' : '1px solid var(--color-border-light)',
                }}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ padding: 'var(--space-4)' }}>
        {currentList.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><Activity size={24} /></div>
            <div className="empty-state-title">Tidak Ada Kegiatan</div>
            <div className="empty-state-desc">
              {activeTab === 'berlangsung' ? 'Tidak ada kegiatan yang sedang berlangsung.' :
               activeTab === 'mendatang' ? 'Belum ada kegiatan yang dijadwalkan.' :
               'Belum ada riwayat kegiatan.'}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {currentList.map((k) => {
              const myPart = getMyPartisipasi(k.id);
              return (
                <KegiatanCard
                  key={k.id}
                  kegiatan={k}
                  myPartisipasi={myPart}
                  onRespond={handleRespond}
                  isHistory={activeTab === 'riwayat'}
                />
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

function KegiatanCard({
  kegiatan: k, myPartisipasi: myPart, onRespond, isHistory
}: {
  kegiatan: Kegiatan;
  myPartisipasi: KegiatanPartisipasi | undefined;
  onRespond: (k: Kegiatan, type: 'hadir' | 'tidak') => void;
  isHistory: boolean;
}) {
  const jenisColors: Record<string, string> = {
    Rapat: 'info', Pelatihan: 'primary', Wisuda: 'accent',
    Pembinaan: 'success', Upacara: 'warning', Lomba: 'danger', Lainnya: 'neutral',
  };

  return (
    <div className="activity-card">
      <div className="activity-card-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', marginBottom: 'var(--space-2)' }}>
              <span className={`badge badge-${jenisColors[k.jenis] || 'neutral'}`}>{k.jenis}</span>
              {k.wajib && <span className="badge badge-danger">Wajib</span>}
              {k.status === 'berlangsung' && <span className="badge badge-success">● Berlangsung</span>}
            </div>
            <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 700, color: 'var(--color-text-primary)' }}>
              {k.nama}
            </h3>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-4)', marginTop: 'var(--space-3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
            <Calendar size={12} />
            {new Date(k.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Makassar' })}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
            <Clock size={12} />
            {k.jamMulai}–{k.jamSelesai} WITA
          </div>
        </div>
      </div>

      <div className="activity-card-body">
        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-3)', lineHeight: 1.6 }}>
          {k.deskripsi}
        </p>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-3)' }}>
          <MapPin size={12} />
          {k.lokasi}
        </div>

        {/* Points */}
        <div style={{
          display: 'flex', gap: 'var(--space-3)', padding: 'var(--space-3)',
          background: 'var(--color-accent-light)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-4)',
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', marginBottom: 2 }}>Peserta</div>
            <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 700, color: 'var(--color-accent)', display: 'flex', alignItems: 'center', gap: 2 }}>
              <Star size={12} /> +{k.poinPeserta}
            </div>
          </div>
          <div style={{ width: 1, background: 'var(--color-border)' }} />
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', marginBottom: 2 }}>Panitia</div>
            <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 700, color: 'var(--color-accent)', display: 'flex', alignItems: 'center', gap: 2 }}>
              <Star size={12} /> +{k.poinPanitia}
            </div>
          </div>
          <div style={{ width: 1, background: 'var(--color-border)' }} />
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', marginBottom: 2 }}>Koordinator</div>
            <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 700, color: 'var(--color-accent)', display: 'flex', alignItems: 'center', gap: 2 }}>
              <Star size={12} /> +{k.poinKoordinator}
            </div>
          </div>
        </div>

        {/* Status & Actions */}
        {isHistory ? (
          <HistoryStatus partisipasi={myPart} />
        ) : (
          <ResponsButtons kegiatan={k} partisipasi={myPart} onRespond={onRespond} />
        )}
      </div>
    </div>
  );
}

function ResponsButtons({
  kegiatan, partisipasi, onRespond
}: {
  kegiatan: Kegiatan;
  partisipasi: KegiatanPartisipasi | undefined;
  onRespond: (k: Kegiatan, type: 'hadir' | 'tidak') => void;
}) {
  if (!partisipasi || partisipasi.respons === 'belum_merespons') {
    return (
      <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
        <button
          className="btn btn-primary btn-sm"
          style={{ flex: 1 }}
          onClick={() => onRespond(kegiatan, 'hadir')}
        >
          <CheckCircle2 size={14} /> Saya Akan Hadir
        </button>
        <button
          className="btn btn-outline btn-sm"
          style={{ flex: 1, borderColor: 'var(--color-danger)', color: 'var(--color-danger)' }}
          onClick={() => onRespond(kegiatan, 'tidak')}
        >
          <XCircle size={14} /> Tidak Dapat Hadir
        </button>
      </div>
    );
  }

  if (partisipasi.respons === 'hadir') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
        <span className="badge badge-success" style={{ fontSize: 'var(--font-size-xs)', padding: '6px 12px' }}>
          <CheckCircle2 size={12} /> Terdaftar sebagai Peserta
        </span>
        <button
          className="btn btn-ghost btn-sm"
          style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}
          onClick={() => onRespond(kegiatan, 'tidak')}
        >
          Ubah
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
      <span className="badge badge-neutral" style={{ fontSize: 'var(--font-size-xs)', padding: '6px 12px' }}>
        <XCircle size={12} /> Tidak Dapat Hadir
      </span>
      <button
        className="btn btn-ghost btn-sm"
        style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}
        onClick={() => onRespond(kegiatan, 'hadir')}
      >
        Ubah
      </button>
    </div>
  );
}

function HistoryStatus({ partisipasi }: { partisipasi: KegiatanPartisipasi | undefined }) {
  if (!partisipasi) {
    return <span className="badge badge-neutral">Tidak Merespons</span>;
  }

  if (partisipasi.hadirVerifikasi === true) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span className="badge badge-success"><CheckCircle2 size={12} /> Hadir (Terverifikasi)</span>
        {partisipasi.poinDiterima > 0 && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 'var(--font-size-sm)', fontWeight: 700, color: 'var(--color-accent)' }}>
            <Award size={14} /> +{partisipasi.poinDiterima} poin
          </span>
        )}
      </div>
    );
  }

  if (partisipasi.hadirVerifikasi === false) {
    return <span className="badge badge-danger"><XCircle size={12} /> Tidak Hadir</span>;
  }

  return <span className="badge badge-neutral"><Clock size={12} /> Menunggu Verifikasi Admin</span>;
}
