'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Clock, Save, Sun, Sunset, Moon, Plus, Trash2,
  CheckCircle2, Info, BookOpen, Layers
} from 'lucide-react';
import { mockSesiList, savePersistedSesiList, loadPersistedData } from '@/lib/mockData';
import type { SesiConfig, SesiType } from '@/types';

const SESI_ICONS: Record<string, React.ReactNode> = {
  pagi: <Sun size={20} color="#059669" />,
  siang: <Clock size={20} color="#D97706" />,
  sore: <Sunset size={20} color="#0284C7" />,
  tahfidz: <Moon size={20} color="#7C3AED" />,
};

const DEFAULT_SESI_IDS = ['pagi', 'siang', 'sore', 'tahfidz'];

const COLOR_PRESETS = [
  { label: 'Hijau Emerald', value: '#DCFCE7', border: '#10B981' },
  { label: 'Kuning Amber', value: '#FEF3C7', border: '#F59E0B' },
  { label: 'Biru Langit', value: '#E0F2FE', border: '#0EA5E9' },
  { label: 'Ungu Lavender', value: '#F3E8FF', border: '#8B5CF6' },
  { label: 'Merah Rose', value: '#FFE4E6', border: '#F43F5E' },
  { label: 'Teal Cyan', value: '#CCFBF1', border: '#14B8A6' },
];

export default function EditSesiPage() {
  const router = useRouter();
  const [sesiState, setSesiState] = useState<SesiConfig[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [showToast, setShowToast] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // New session modal state
  const [newNama, setNewNama] = useState('');
  const [newJamMulai, setNewJamMulai] = useState('08:00');
  const [newJamSelesai, setNewJamSelesai] = useState('10:00');
  const [newDeskripsi, setNewDeskripsi] = useState('');
  const [newWarna, setNewWarna] = useState('#DCFCE7');

  useEffect(() => {
    loadPersistedData();
    setSesiState([...mockSesiList]);
  }, []);

  const handleFieldChange = (id: string, field: keyof SesiConfig, value: string) => {
    setSesiState((prev) =>
      prev.map((s) => (s.id === id ? { ...s, [field]: value } : s))
    );
  };

  const handleAddSesi = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNama.trim() || !newJamMulai || !newJamSelesai) {
      alert('Mohon isi nama sesi, jam mulai, dan jam selesai');
      return;
    }

    const newId = `sesi-${Date.now()}`;
    const newEntry: SesiConfig = {
      id: newId,
      nama: newNama.trim(),
      jamMulai: newJamMulai,
      jamSelesai: newJamSelesai,
      deskripsi: newDeskripsi.trim() || 'Sesi jam mengajar yayasan',
      warna: newWarna,
    };

    const updated = [...sesiState, newEntry];
    setSesiState(updated);
    savePersistedSesiList(updated);

    // Reset modal form
    setNewNama('');
    setNewJamMulai('08:00');
    setNewJamSelesai('10:00');
    setNewDeskripsi('');
    setShowAddModal(false);
    setShowToast(`✓ Sesi ${newEntry.nama} berhasil ditambahkan!`);
    setTimeout(() => setShowToast(null), 3000);
  };

  const handleDeleteSesi = (id: string, nama: string) => {
    if (confirm(`Apakah Anda yakin ingin menghapus "${nama}"?`)) {
      const updated = sesiState.filter((s) => s.id !== id);
      setSesiState(updated);
      savePersistedSesiList(updated);
      setShowToast(`✓ Sesi "${nama}" berhasil dihapus.`);
      setTimeout(() => setShowToast(null), 3000);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    savePersistedSesiList(sesiState);

    setTimeout(() => {
      setIsSaving(false);
      setShowToast('✓ Seluruh jam sesi mengajar berhasil disimpan!');
      setTimeout(() => {
        router.push('/admin/jadwal');
      }, 1200);
    }, 400);
  };

  return (
    <div>
      {/* Toast */}
      {showToast && (
        <div className="toast-container" style={{ position: 'fixed', top: 80, bottom: 'auto', left: '50%', transform: 'translateX(-50%)' }}>
          <div className="toast toast-success">{showToast}</div>
        </div>
      )}

      {/* MODAL TAMBAH JAM MENGAJAR */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Plus size={18} color="var(--color-primary)" /> Tambah Jam Mengajar Baru
              </h3>
            </div>
            <form onSubmit={handleAddSesi}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }}>Nama Sesi / Jam Mengajar *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="cth: Sesi Dhuha, Kelas Sore 2, Halaqah Malam..."
                    value={newNama}
                    onChange={(e) => setNewNama(e.target.value)}
                    required
                    autoFocus
                  />
                </div>

                <div className="admin-grid-1-1">
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 700 }}>Jam Mulai *</label>
                    <input
                      type="time"
                      className="form-input"
                      value={newJamMulai}
                      onChange={(e) => setNewJamMulai(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 700 }}>Jam Selesai *</label>
                    <input
                      type="time"
                      className="form-input"
                      value={newJamSelesai}
                      onChange={(e) => setNewJamSelesai(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }}>Deskripsi / Keterangan</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="cth: Pembelajaran Tahfidz & Tilawah tambahan..."
                    value={newDeskripsi}
                    onChange={(e) => setNewDeskripsi(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }}>Tema Warna Sesi</label>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
                    {COLOR_PRESETS.map((c) => (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => setNewWarna(c.value)}
                        style={{
                          width: 32, height: 32, borderRadius: '50%',
                          background: c.value, border: newWarna === c.value ? `3px solid ${c.border}` : '1px solid var(--color-border)',
                          cursor: 'pointer', outline: 'none'
                        }}
                        title={c.label}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setShowAddModal(false)}
                >
                  Batal
                </button>
                <button type="submit" className="btn btn-primary btn-sm">
                  <Plus size={14} /> Tambahkan Sesi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Topbar */}
      <div className="admin-topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flex: 1, minWidth: 0 }}>
          <Link href="/admin/jadwal" className="btn btn-ghost btn-sm" style={{ padding: 6, flexShrink: 0 }}>
            <ArrowLeft size={18} />
          </Link>
          <div style={{ minWidth: 0 }}>
            <h1 style={{ fontSize: 'var(--font-size-base)', fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Sesi Mengajar
            </h1>
            <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>
              Pengaturan rentang waktu &amp; jam pembelajaran
            </p>
          </div>
        </div>

        <div className="hide-on-mobile" style={{ gap: 'var(--space-2)', flexShrink: 0 }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setShowAddModal(true)}
            style={{ fontSize: 12, padding: '6px 14px', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Plus size={15} /> Tambah Jam Mengajar
          </button>
          <button
            type="submit"
            form="form-sesi"
            className="btn btn-primary btn-sm"
            disabled={isSaving}
          >
            <Save size={15} />
            {isSaving ? 'Menyimpan...' : 'Simpan Jam Sesi'}
          </button>
        </div>
      </div>

      <div className="admin-content" style={{ maxWidth: 880, margin: '0 auto' }}>
        
        {/* Mobile Action Buttons */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }} className="show-on-mobile-flex">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setShowAddModal(true)}
            style={{ flex: 1, fontSize: 11, padding: '8px 10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
          >
            <Plus size={14} /> Tambah Sesi
          </button>
          <button
            type="submit"
            form="form-sesi"
            className="btn btn-primary btn-sm"
            disabled={isSaving}
            style={{ flex: 1.5, fontSize: 11, padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontWeight: 700 }}
          >
            <Save size={14} />
            {isSaving ? 'Menyimpan...' : 'Simpan Sesi'}
          </button>
        </div>

        {/* Info Box */}
        <div style={{
          padding: '10px 14px',
          background: 'var(--color-primary-light)',
          borderRadius: 'var(--radius-md)',
          marginBottom: 'var(--space-4)',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 6,
          border: '1px solid rgba(27,107,74,0.2)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flex: 1, minWidth: 200 }}>
            <Info size={16} color="var(--color-primary)" style={{ flexShrink: 0 }} />
            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>
              <strong>Petunjuk:</strong> Edit jam operasional di bawah lalu tekan <strong>Simpan</strong>.
            </div>
          </div>
          <span className="badge badge-primary" style={{ flexShrink: 0, fontWeight: 700, fontSize: 10 }}>{sesiState.length} Sesi Terdaftar</span>
        </div>

        {/* Sessions Form */}
        <form id="form-sesi" onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {sesiState.map((sesi, index) => {
            const isDefault = DEFAULT_SESI_IDS.includes(sesi.id);
            const icon = SESI_ICONS[sesi.id] || <Clock size={16} color="var(--color-primary)" />;
            const borderCol = sesi.id === 'pagi' ? '#10B981' : sesi.id === 'siang' ? '#F59E0B' : sesi.id === 'sore' ? '#0EA5E9' : sesi.id === 'tahfidz' ? '#8B5CF6' : 'var(--color-primary)';

            return (
              <div
                key={sesi.id}
                className="card"
                style={{
                  borderLeft: `4px solid ${borderCol}`,
                  padding: 0,
                }}
              >
                <div className="card-header" style={{ background: 'var(--color-surface-2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6, padding: '10px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    {icon}
                    <span style={{ fontWeight: 800, fontSize: 13 }}>
                      Sesi {index + 1}: {sesi.nama}
                    </span>
                    {isDefault ? (
                      <span className="badge badge-neutral" style={{ fontSize: 9 }}>Default</span>
                    ) : (
                      <span className="badge badge-primary" style={{ fontSize: 9 }}>Tambahan</span>
                    )}
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span className="badge badge-primary" style={{ fontSize: 10, fontVariantNumeric: 'tabular-nums' }}>
                      {sesi.jamMulai} – {sesi.jamSelesai}
                    </span>
                    {!isDefault && (
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => handleDeleteSesi(sesi.id, sesi.nama)}
                        style={{ padding: 4, color: 'var(--color-danger)' }}
                        title="Hapus Sesi Ini"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="card-body" style={{ padding: '12px 14px' }}>
                  <div className="admin-sesi-form-grid">
                    
                    {/* Nama Sesi */}
                    <div className="form-group full-on-mobile" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontWeight: 700, fontSize: 11 }}>
                        Nama Sesi
                      </label>
                      <input
                        type="text"
                        className="form-input"
                        value={sesi.nama}
                        onChange={(e) => handleFieldChange(sesi.id, 'nama', e.target.value)}
                        required
                        style={{ fontSize: 12 }}
                      />
                    </div>

                    {/* Jam Mulai */}
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontWeight: 700, fontSize: 11 }}>
                        Jam Mulai *
                      </label>
                      <input
                        type="time"
                        className="form-input"
                        value={sesi.jamMulai}
                        onChange={(e) => handleFieldChange(sesi.id, 'jamMulai', e.target.value)}
                        required
                        style={{ fontSize: 12 }}
                      />
                    </div>

                    {/* Jam Selesai */}
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontWeight: 700, fontSize: 11 }}>
                        Jam Selesai *
                      </label>
                      <input
                        type="time"
                        className="form-input"
                        value={sesi.jamSelesai}
                        onChange={(e) => handleFieldChange(sesi.id, 'jamSelesai', e.target.value)}
                        required
                        style={{ fontSize: 12 }}
                      />
                    </div>

                    {/* Deskripsi */}
                    <div className="form-group full-on-mobile" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontWeight: 700, fontSize: 11 }}>
                        Keterangan / Mata Pelajaran
                      </label>
                      <input
                        type="text"
                        className="form-input"
                        value={sesi.deskripsi}
                        onChange={(e) => handleFieldChange(sesi.id, 'deskripsi', e.target.value)}
                        placeholder="cth: Pembelajaran Tahfidz..."
                        style={{ fontSize: 12 }}
                      />
                    </div>

                  </div>
                </div>
              </div>
            );
          })}

          {/* Footer Submit */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'var(--space-3)', marginBottom: 'var(--space-8)' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setShowAddModal(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Plus size={16} /> Tambah Jam Mengajar Baru
            </button>

            <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
              <Link href="/admin/jadwal" className="btn btn-ghost">
                Batal
              </Link>
              <button
                type="submit"
                className="btn btn-primary btn-lg"
                disabled={isSaving}
                style={{ minWidth: 200, fontWeight: 700 }}
              >
                <Save size={18} />
                {isSaving ? 'Menyimpan...' : 'Simpan Semua Sesi'}
              </button>
            </div>
          </div>
        </form>

      </div>
    </div>
  );
}

