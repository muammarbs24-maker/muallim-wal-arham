'use client';

import { useState, useEffect } from 'react';
import {
  Plus, Edit2, Trash2, CheckCircle2, XCircle, Clock, Star, MapPin,
  Calendar, Users, Award, ShieldCheck, Navigation, AlertCircle, X, Save,
  Send, ExternalLink, RefreshCw
} from 'lucide-react';
import {
  mockKegiatan, mockPartisipasi, mockGuru, savePersistedKegiatan,
  savePersistedPartisipasi, loadPersistedData, getGoogleMapsLink, getNamaHari
} from '@/lib/mockData';
import { getTodayStringWITA } from '@/lib/utils';
import type { Kegiatan, KegiatanPartisipasi, ActivityType, ActivityParticipationType, Guru } from '@/types';

export default function AdminKegiatanPage() {
  const [kegiatanList, setKegiatanList] = useState<Kegiatan[]>(mockKegiatan);
  const [partisipasiList, setPartisipasiList] = useState<KegiatanPartisipasi[]>(mockPartisipasi);
  const [guruList, setGuruList] = useState<Guru[]>(mockGuru);
  const [activeTab, setActiveTab] = useState<'list' | 'verifikasi'>('list');
  const [selectedKegiatan, setSelectedKegiatan] = useState<Kegiatan | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modal Tambah / Edit Kegiatan
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingKegiatanId, setEditingKegiatanId] = useState<string | null>(null);
  const [formState, setFormState] = useState({
    nama: '',
    deskripsi: '',
    jenis: 'Pelatihan' as ActivityType,
    lokasi: "Aula Utama Yayasan Tahfidz Mu'Allim Wal Arham, Makassar",
    linkMaps: '',
    hariMulai: getNamaHari(getTodayStringWITA()),
    tanggalMulai: getTodayStringWITA(),
    hariSelesai: getNamaHari(getTodayStringWITA()),
    tanggalSelesai: getTodayStringWITA(),
    jamMulai: '08:00',
    jamSelesai: '16:00',
    batasPendaftaran: `${getTodayStringWITA()}T07:30`,
    wajib: false,
    poinPeserta: 10,
    poinPanitia: 15,
    poinKoordinator: 20,
    status: 'berlangsung' as 'mendatang' | 'berlangsung' | 'selesai',
    absensiAktif: true,
  });

  const refreshData = () => {
    loadPersistedData();
    setKegiatanList([...mockKegiatan]);
    setPartisipasiList([...mockPartisipasi]);
  };

  useEffect(() => {
    refreshData();
    if (typeof window !== 'undefined') {
      try {
        const savedGurus = localStorage.getItem('muallim_guru_list');
        if (savedGurus) {
          const parsed = JSON.parse(savedGurus);
          if (Array.isArray(parsed) && parsed.length > 0) setGuruList(parsed);
        }
      } catch (e) {}
    }

    import('@/lib/supabaseClient').then(({ getKegiatanListSupabase, getKegiatanPartisipasiSupabase, getGurusSupabase }) => {
      getGurusSupabase().then((gurus) => {
        if (Array.isArray(gurus) && gurus.length > 0) {
          setGuruList(gurus);
          mockGuru.length = 0;
          mockGuru.push(...gurus);
        }
      }).catch(() => {});

      getKegiatanListSupabase().then((data) => {
        if (Array.isArray(data)) {
          mockKegiatan.length = 0;
          mockKegiatan.push(...data);
          setKegiatanList([...data]);
        }
      }).catch(() => {});

      getKegiatanPartisipasiSupabase().then((parts) => {
        if (Array.isArray(parts)) {
          mockPartisipasi.length = 0;
          mockPartisipasi.push(...parts);
          setPartisipasiList([...parts]);
        }
      }).catch(() => {});
    }).catch(() => {});
  }, []);

  // Buka Modal Tambah Kegiatan
  const handleOpenAddModal = () => {
    const today = getTodayStringWITA();
    setEditingKegiatanId(null);
    setFormState({
      nama: '',
      deskripsi: '',
      jenis: 'Pelatihan',
      lokasi: "Aula Utama Yayasan Tahfidz Mu'Allim Wal Arham, Makassar",
      linkMaps: '',
      hariMulai: getNamaHari(today),
      tanggalMulai: today,
      hariSelesai: getNamaHari(today),
      tanggalSelesai: today,
      jamMulai: '08:00',
      jamSelesai: '16:00',
      batasPendaftaran: `${today}T07:30`,
      wajib: false,
      poinPeserta: 10,
      poinPanitia: 15,
      poinKoordinator: 20,
      status: 'berlangsung',
      absensiAktif: true,
    });
    setShowFormModal(true);
  };

  // Buka Modal Edit Kegiatan
  const handleOpenEditModal = (k: Kegiatan) => {
    setEditingKegiatanId(k.id);
    const tMulai = k.tanggalMulai || k.tanggal || getTodayStringWITA();
    const tSelesai = k.tanggalSelesai || k.tanggal || getTodayStringWITA();
    setFormState({
      nama: k.nama,
      deskripsi: k.deskripsi,
      jenis: k.jenis,
      lokasi: k.lokasi,
      linkMaps: k.linkMaps || '',
      hariMulai: k.hariMulai || getNamaHari(tMulai),
      tanggalMulai: tMulai,
      hariSelesai: k.hariSelesai || getNamaHari(tSelesai),
      tanggalSelesai: tSelesai,
      jamMulai: k.jamMulai,
      jamSelesai: k.jamSelesai || '',
      batasPendaftaran: k.batasPendaftaran || `${getTodayStringWITA()}T07:30`,
      wajib: k.wajib,
      poinPeserta: k.poinPeserta,
      poinPanitia: k.poinPanitia,
      poinKoordinator: k.poinKoordinator,
      status: k.status,
      absensiAktif: k.absensiAktif ?? false,
    });
    setShowFormModal(true);
  };

  // Submit Simpan Kegiatan
  const handleSaveKegiatan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formState.nama.trim()) {
      alert('Nama kegiatan wajib diisi.');
      return;
    }
    if (!formState.lokasi.trim()) {
      alert('Nama lokasi wajib diisi.');
      return;
    }

    let updatedList: Kegiatan[];
    if (editingKegiatanId) {
      updatedList = kegiatanList.map((k) =>
        k.id === editingKegiatanId
          ? {
              ...k,
              ...formState,
              tanggal: formState.tanggalMulai,
            }
          : k
      );
    } else {
      const newKegiatan: Kegiatan = {
        id: `kegiatan-${Date.now()}`,
        ...formState,
        tanggal: formState.tanggalMulai,
      };
      updatedList = [newKegiatan, ...kegiatanList];
    }

    setKegiatanList(updatedList);
    savePersistedKegiatan(updatedList);
    setShowFormModal(false);
    setToastMessage(`✓ Kegiatan "${formState.nama}" berhasil disimpan.`);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Hapus Kegiatan
  const handleDeleteKegiatan = (id: string, nama: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus kegiatan "${nama}"?`)) return;
    const updated = kegiatanList.filter((k) => k.id !== id);
    setKegiatanList(updated);
    savePersistedKegiatan(updated);
    if (selectedKegiatan?.id === id) setSelectedKegiatan(null);
    setToastMessage(`✓ Kegiatan "${nama}" telah dihapus.`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Toggle Aktifkan / Nonaktifkan Sesi Absensi
  const handleToggleAbsensi = (kegiatanId: string) => {
    const updated = kegiatanList.map((k) => {
      if (k.id === kegiatanId) {
        const nextState = !k.absensiAktif;
        setToastMessage(`📍 Sesi absensi kegiatan "${k.nama}" ${nextState ? 'DIAKTIFKAN' : 'DINONAKTIFKAN'}.`);
        setTimeout(() => setToastMessage(null), 3500);
        return { ...k, absensiAktif: nextState };
      }
      return k;
    });
    setKegiatanList(updated);
    savePersistedKegiatan(updated);
    if (selectedKegiatan && selectedKegiatan.id === kegiatanId) {
      setSelectedKegiatan(updated.find((k) => k.id === kegiatanId) || null);
    }
  };

  // Verifikasi Kehadiran Guru & Penetapan Peran
  const handleVerifikasiGuru = (
    kegiatanId: string,
    guruId: string,
    hadir: boolean | null,
    overrideRole?: ActivityParticipationType
  ) => {
    const k = kegiatanList.find((item) => item.id === kegiatanId);
    if (!k) return;

    const g = guruList.find((item) => item.id === guruId);
    const existing = partisipasiList.find((p) => p.kegiatanId === kegiatanId && p.guruId === guruId);

    const activeRole = overrideRole || existing?.jenisPartisipasi || 'peserta';
    const calculatedPoin =
      hadir === true
        ? activeRole === 'koordinator'
          ? k.poinKoordinator
          : activeRole === 'panitia'
          ? k.poinPanitia
          : k.poinPeserta
        : 0;

    const updatedRecord: KegiatanPartisipasi = {
      id: existing?.id || `part-${Date.now()}-${guruId}`,
      kegiatanId,
      guruId,
      guruNama: g ? g.nama : existing?.guruNama || '',
      respons: existing?.respons || 'hadir',
      responsDibuatPada: existing?.responsDibuatPada || new Date().toISOString(),
      jenisPartisipasi: activeRole,
      alasan: existing?.alasan,
      waktuAbsen: existing?.waktuAbsen || (hadir ? new Date().toISOString() : null),
      latitudeAbsen: existing?.latitudeAbsen || null,
      longitudeAbsen: existing?.longitudeAbsen || null,
      lokasiAbsenNama: existing?.lokasiAbsenNama || null,
      hadirVerifikasi: hadir,
      poinDiterima: calculatedPoin,
      diverifikasiPada: hadir !== null ? new Date().toISOString() : null,
    };

    const updatedList = partisipasiList.filter((p) => !(p.kegiatanId === kegiatanId && p.guruId === guruId));
    updatedList.unshift(updatedRecord);
    setPartisipasiList(updatedList);
    savePersistedPartisipasi(updatedList);

    setToastMessage(
      hadir === true
        ? `✓ Kehadiran ${g?.nama.split(',')[0]} diverifikasi (${activeRole === 'koordinator' ? 'Ketua Panitia' : activeRole === 'panitia' ? 'Panitia' : 'Peserta'}, +${calculatedPoin} Poin).`
        : hadir === false
        ? `✕ Kehadiran ${g?.nama.split(',')[0]} ditolak / tidak hadir.`
        : `Status verifikasi ${g?.nama.split(',')[0]} di-reset.`
    );
    setTimeout(() => setToastMessage(null), 3500);
  };

  const statusColors = { berlangsung: 'success', mendatang: 'primary', selesai: 'neutral' } as const;
  const statusLabels = { berlangsung: 'Sedang Berlangsung', mendatang: 'Mendatang', selesai: 'Selesai' };

  return (
    <div>
      {/* Toast Notification */}
      {toastMessage && (
        <div className="toast-container" style={{ position: 'fixed', top: 80, bottom: 'auto', left: '50%', transform: 'translateX(-50%)', zIndex: 9999 }}>
          <div className="toast toast-success">{toastMessage}</div>
        </div>
      )}

      {/* MODAL FORM TAMBAH / EDIT KEGIATAN */}
      {showFormModal && (
        <div className="modal-overlay" onClick={() => setShowFormModal(false)}>
          <div className="modal" style={{ maxWidth: 540 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
                {editingKegiatanId ? <Edit2 size={18} color="var(--color-primary)" /> : <Plus size={18} color="var(--color-primary)" />}
                {editingKegiatanId ? 'Edit Data Kegiatan' : 'Buat Kegiatan Baru'}
              </h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowFormModal(false)}>
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleSaveKegiatan}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', maxHeight: '72vh', overflowY: 'auto' }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }}>Nama Kegiatan *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Contoh: Daurah & Pelatihan Standardisasi Guru Tahfidz 2026"
                    value={formState.nama}
                    onChange={(e) => setFormState({ ...formState, nama: e.target.value })}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 700 }}>Jenis Kegiatan</label>
                    <select
                      className="form-select"
                      value={formState.jenis}
                      onChange={(e) => setFormState({ ...formState, jenis: e.target.value as ActivityType })}
                    >
                      <option value="Pelatihan">Pelatihan</option>
                      <option value="Rapat">Rapat</option>
                      <option value="Pembinaan">Pembinaan</option>
                      <option value="Upacara">Upacara</option>
                      <option value="Wisuda">Wisuda</option>
                      <option value="Lomba">Lomba</option>
                      <option value="Lainnya">Lainnya</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 700 }}>Status Pelaksanaan</label>
                    <select
                      className="form-select"
                      value={formState.status}
                      onChange={(e) => setFormState({ ...formState, status: e.target.value as any })}
                    >
                      <option value="berlangsung">Sedang Berlangsung</option>
                      <option value="mendatang">Mendatang</option>
                      <option value="selesai">Selesai</option>
                    </select>
                  </div>
                </div>

                {/* Lokasi & Link Maps */}
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }}>Nama Lokasi Pelaksanaan *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Contoh: Aula Utama Yayasan Tahfidz Mu'Allim Wal Arham, Makassar"
                    value={formState.lokasi}
                    onChange={(e) => setFormState({ ...formState, lokasi: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span>Link Google Maps</span>
                    <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)', fontWeight: 400 }}>Opsional (Otomatis dibuat jika kosong)</span>
                  </label>
                  <input
                    type="url"
                    className="form-input"
                    placeholder="https://maps.app.goo.gl/... atau https://google.com/maps/..."
                    value={formState.linkMaps}
                    onChange={(e) => setFormState({ ...formState, linkMaps: e.target.value })}
                  />
                </div>

                {/* Waktu Mulai */}
                <div style={{ padding: '10px 12px', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8, color: 'var(--color-primary)' }}>
                    Waktu Pelaksanaan Mulai *
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr 1fr', gap: 8 }}>
                    <div>
                      <label style={{ fontSize: 10.5, color: 'var(--color-text-secondary)', fontWeight: 600 }}>Hari</label>
                      <input
                        type="text"
                        className="form-input"
                        value={formState.hariMulai}
                        onChange={(e) => setFormState({ ...formState, hariMulai: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 10.5, color: 'var(--color-text-secondary)', fontWeight: 600 }}>Tanggal Mulai</label>
                      <input
                        type="date"
                        className="form-input"
                        value={formState.tanggalMulai}
                        onChange={(e) => {
                          const date = e.target.value;
                          setFormState({
                            ...formState,
                            tanggalMulai: date,
                            hariMulai: getNamaHari(date),
                          });
                        }}
                        required
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 10.5, color: 'var(--color-text-secondary)', fontWeight: 600 }}>Jam Mulai</label>
                      <input
                        type="time"
                        className="form-input"
                        value={formState.jamMulai}
                        onChange={(e) => setFormState({ ...formState, jamMulai: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Waktu Selesai */}
                <div style={{ padding: '10px 12px', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8, color: 'var(--color-text-secondary)' }}>
                    Waktu Pelaksanaan Selesai (Jam Opsional)
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr 1fr', gap: 8 }}>
                    <div>
                      <label style={{ fontSize: 10.5, color: 'var(--color-text-secondary)', fontWeight: 600 }}>Hari Selesai</label>
                      <input
                        type="text"
                        className="form-input"
                        value={formState.hariSelesai}
                        onChange={(e) => setFormState({ ...formState, hariSelesai: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 10.5, color: 'var(--color-text-secondary)', fontWeight: 600 }}>Tanggal Selesai</label>
                      <input
                        type="date"
                        className="form-input"
                        value={formState.tanggalSelesai}
                        onChange={(e) => {
                          const date = e.target.value;
                          setFormState({
                            ...formState,
                            tanggalSelesai: date,
                            hariSelesai: getNamaHari(date),
                          });
                        }}
                        required
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 10.5, color: 'var(--color-text-secondary)', fontWeight: 600 }}>Jam Selesai</label>
                      <input
                        type="time"
                        className="form-input"
                        value={formState.jamSelesai}
                        placeholder="Opsional"
                        onChange={(e) => setFormState({ ...formState, jamSelesai: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }}>Batas Tutup Pendaftaran Guru *</label>
                  <input
                    type="datetime-local"
                    className="form-input"
                    value={formState.batasPendaftaran}
                    onChange={(e) => setFormState({ ...formState, batasPendaftaran: e.target.value })}
                    required
                  />
                </div>

                {/* Pengaturan Poin Partisipasi */}
                <div style={{ padding: '10px 12px', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8, color: 'var(--color-primary)' }}>
                    Alokasi Poin Partisipasi Guru
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                    <div>
                      <label style={{ fontSize: 10.5, color: 'var(--color-text-secondary)', fontWeight: 600 }}>Poin Peserta</label>
                      <input
                        type="number"
                        className="form-input"
                        value={formState.poinPeserta}
                        onChange={(e) => setFormState({ ...formState, poinPeserta: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 10.5, color: 'var(--color-text-secondary)', fontWeight: 600 }}>Poin Panitia</label>
                      <input
                        type="number"
                        className="form-input"
                        value={formState.poinPanitia}
                        onChange={(e) => setFormState({ ...formState, poinPanitia: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 10.5, color: 'var(--color-text-secondary)', fontWeight: 600 }}>Ketua Panitia</label>
                      <input
                        type="number"
                        className="form-input"
                        value={formState.poinKoordinator}
                        onChange={(e) => setFormState({ ...formState, poinKoordinator: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }}>Deskripsi Kegiatan</label>
                  <textarea
                    className="form-input"
                    rows={2}
                    placeholder="Tuliskan tujuan dan agenda kegiatan..."
                    value={formState.deskripsi}
                    onChange={(e) => setFormState({ ...formState, deskripsi: e.target.value })}
                  />
                </div>

                <div style={{ display: 'flex', gap: 16 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={formState.wajib}
                      onChange={(e) => setFormState({ ...formState, wajib: e.target.checked })}
                    />
                    <span>Wajib Diikuti Guru</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={formState.absensiAktif}
                      onChange={(e) => setFormState({ ...formState, absensiAktif: e.target.checked })}
                    />
                    <span>Manual Buka Sesi Absensi (Override)</span>
                  </label>
                </div>
              </div>

              <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowFormModal(false)}>
                  Batal
                </button>
                <button type="submit" className="btn btn-primary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}>
                  <Save size={14} /> Simpan Kegiatan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Topbar */}
      <div className="admin-topbar">
        <div>
          <h1 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 800 }}>Manajemen Kegiatan</h1>
          <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>
            Kelola event, pendaftaran partisipan guru, sesi absensi GPS, dan verifikasi poin
          </p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={handleOpenAddModal} style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}>
          <Plus size={16} /> Buat Kegiatan Baru
        </button>
      </div>

      <div className="admin-content">
        {/* Navigation Tabs */}
        <div style={{
          display: 'flex',
          gap: 8,
          marginBottom: 'var(--space-4)',
          overflowX: 'auto',
          paddingBottom: 4,
          scrollbarWidth: 'none',
        }}>
          <button
            type="button"
            className={`tab-pill ${activeTab === 'list' ? 'active' : ''}`}
            onClick={() => setActiveTab('list')}
            style={{
              padding: '7px 16px',
              borderRadius: 9999,
              fontSize: 12,
              fontWeight: 700,
              border: activeTab === 'list' ? '1.5px solid var(--color-primary)' : '1px solid var(--color-border)',
              background: activeTab === 'list' ? 'var(--color-primary)' : 'var(--color-surface)',
              color: activeTab === 'list' ? '#ffffff' : 'var(--color-text-secondary)',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            Daftar Kegiatan ({kegiatanList.length})
          </button>
          <button
            type="button"
            className={`tab-pill ${activeTab === 'verifikasi' ? 'active' : ''}`}
            onClick={() => {
              if (!selectedKegiatan && kegiatanList.length > 0) setSelectedKegiatan(kegiatanList[0]);
              setActiveTab('verifikasi');
            }}
            style={{
              padding: '7px 16px',
              borderRadius: 9999,
              fontSize: 12,
              fontWeight: 700,
              border: activeTab === 'verifikasi' ? '1.5px solid var(--color-primary)' : '1px solid var(--color-border)',
              background: activeTab === 'verifikasi' ? 'var(--color-primary)' : 'var(--color-surface)',
              color: activeTab === 'verifikasi' ? '#ffffff' : 'var(--color-text-secondary)',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            Panel Verifikasi Presensi &amp; Poin
          </button>
        </div>

        {activeTab === 'list' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {kegiatanList.map((k) => {
              const partisipasi = partisipasiList.filter((p) => p.kegiatanId === k.id);
              const hadirCount = partisipasi.filter((p) => p.respons === 'hadir').length;
              const verifiedCount = partisipasi.filter((p) => p.hadirVerifikasi === true).length;

              return (
                <div key={k.id} className="card" style={{ border: '1px solid var(--color-border)' }}>
                  <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
                    <div style={{ flex: 1, minWidth: 260 }}>
                      <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', flexWrap: 'wrap', marginBottom: 4 }}>
                        <span className={`badge badge-${statusColors[k.status]}`}>{statusLabels[k.status]}</span>
                        <span className="badge badge-neutral">{k.jenis}</span>
                        {k.wajib && <span className="badge badge-danger">Wajib</span>}
                        {k.absensiAktif ? (
                          <span className="badge badge-success" style={{ fontWeight: 700 }}>● Sesi Absensi Aktif</span>
                        ) : (
                          <span className="badge badge-neutral">Sesi Absensi Nonaktif</span>
                        )}
                      </div>
                      <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 800, marginTop: 4 }}>{k.nama}</h3>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', marginTop: 4, flexWrap: 'wrap' }}>
                        <span>
                          📅 <strong>{k.hariMulai || getNamaHari(k.tanggalMulai)}, {k.tanggalMulai}</strong> s/d <strong>{k.hariSelesai || getNamaHari(k.tanggalSelesai)}, {k.tanggalSelesai}</strong>
                        </span>
                        <span>•</span>
                        <span>
                          ⏰ {k.jamMulai}{k.jamSelesai ? `–${k.jamSelesai}` : ''} WITA
                        </span>
                        <span>•</span>
                        <a
                          href={getGoogleMapsLink(k.lokasi, k.linkMaps)}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: 'var(--color-primary)', display: 'inline-flex', alignItems: 'center', gap: 3, fontWeight: 600, textDecoration: 'underline' }}
                        >
                          📍 {k.lokasi} <ExternalLink size={10} />
                        </a>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        className={`btn btn-sm ${k.absensiAktif ? 'btn-warning' : 'btn-success'}`}
                        onClick={() => handleToggleAbsensi(k.id)}
                        style={{ fontSize: 11, fontWeight: 700 }}
                      >
                        <Navigation size={13} /> {k.absensiAktif ? 'Tutup Absensi' : 'Buka Absensi GPS'}
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleOpenEditModal(k)}
                        style={{ fontSize: 11 }}
                      >
                        <Edit2 size={13} /> Edit
                      </button>
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={() => { setSelectedKegiatan(k); setActiveTab('verifikasi'); }}
                        style={{ fontSize: 11, fontWeight: 700 }}
                      >
                        <ShieldCheck size={13} /> Verifikasi ({partisipasi.length})
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => handleDeleteKegiatan(k.id, k.nama)}
                        style={{ color: 'var(--color-danger)', fontSize: 11 }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  <div className="card-body">
                    <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-4)', lineHeight: 1.6 }}>
                      {k.deskripsi}
                    </p>

                    {/* Ringkasan Partisipan & Poin */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                      gap: 10,
                      background: 'var(--color-surface-2)',
                      padding: '12px 14px',
                      borderRadius: 'var(--radius-md)',
                      textAlign: 'center',
                    }}>
                      <div>
                        <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>Total Mendaftar</div>
                        <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--color-primary)' }}>{hadirCount} Guru</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>Hadir Terverifikasi</div>
                        <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--color-success)' }}>{verifiedCount} Guru</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>Poin Peserta / Panitia / Ketua</div>
                        <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--color-accent)', marginTop: 4 }}>
                          +{k.poinPeserta} / +{k.poinPanitia} / +{k.poinKoordinator}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* PANEL VERIFIKASI KEHADIRAN AKTUAL & GPS */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {/* Header / Selector Kegiatan Aktif */}
            <div className="card" style={{ padding: 'var(--space-4)', border: '1px solid var(--color-border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 14 }}>
                <div style={{ flex: 1, minWidth: 280 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--color-text-tertiary)', marginBottom: 6 }}>
                    Pilih Kegiatan untuk Diverifikasi:
                  </div>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                    <select
                      className="form-select"
                      value={selectedKegiatan?.id || ''}
                      onChange={(e) => {
                        const found = kegiatanList.find((k) => k.id === e.target.value);
                        if (found) setSelectedKegiatan(found);
                      }}
                      style={{
                        fontSize: 14,
                        fontWeight: 700,
                        padding: '8px 14px',
                        borderRadius: 'var(--radius-md)',
                        border: '1.5px solid var(--color-primary)',
                        background: 'var(--color-surface)',
                        color: 'var(--color-text-primary)',
                        minWidth: 260,
                        maxWidth: 450,
                      }}
                    >
                      {kegiatanList.map((k) => (
                        <option key={k.id} value={k.id}>
                          {k.nama} ({k.tanggalMulai})
                        </option>
                      ))}
                    </select>

                    {selectedKegiatan && (
                      <span className={`badge badge-${statusColors[selectedKegiatan.status]}`} style={{ padding: '5px 10px', fontSize: 11 }}>
                        {statusLabels[selectedKegiatan.status]}
                      </span>
                    )}
                  </div>

                  {selectedKegiatan && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8, fontSize: 12, color: 'var(--color-text-secondary)', flexWrap: 'wrap' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <Calendar size={13} color="var(--color-primary)" />
                        <strong>{selectedKegiatan.hariMulai || getNamaHari(selectedKegiatan.tanggalMulai)}, {selectedKegiatan.tanggalMulai}</strong>
                        {selectedKegiatan.tanggalSelesai !== selectedKegiatan.tanggalMulai && ` s/d ${selectedKegiatan.tanggalSelesai}`}
                      </span>
                      <span>•</span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <Clock size={13} color="var(--color-primary)" />
                        {selectedKegiatan.jamMulai}{selectedKegiatan.jamSelesai ? `–${selectedKegiatan.jamSelesai}` : ''} WITA
                      </span>
                      <span>•</span>
                      <a
                        href={getGoogleMapsLink(selectedKegiatan.lokasi, selectedKegiatan.linkMaps)}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: 'var(--color-primary)', display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 600, textDecoration: 'underline' }}
                      >
                        <MapPin size={13} color="var(--color-danger)" />
                        {selectedKegiatan.lokasi}
                        <ExternalLink size={10} />
                      </a>
                    </div>
                  )}
                </div>

                {selectedKegiatan && (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className={`btn btn-sm ${selectedKegiatan.absensiAktif ? 'btn-warning' : 'btn-success'}`}
                      onClick={() => handleToggleAbsensi(selectedKegiatan.id)}
                      style={{
                        padding: '8px 14px',
                        fontSize: 12,
                        fontWeight: 800,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        boxShadow: selectedKegiatan.absensiAktif ? '0 2px 8px rgba(234, 88, 12, 0.2)' : '0 2px 8px rgba(22, 163, 74, 0.2)',
                      }}
                    >
                      <Navigation size={14} />
                      {selectedKegiatan.absensiAktif ? 'Tutup Sesi Absensi' : 'Buka Sesi Absensi GPS'}
                    </button>
                  </div>
                )}
              </div>

              {/* Quick Summary Cards */}
              {selectedKegiatan && (() => {
                const parts = partisipasiList.filter((p) => p.kegiatanId === selectedKegiatan.id);
                const registeredCount = parts.filter((p) => p.respons === 'hadir').length;
                const gpsAbsenCount = parts.filter((p) => p.waktuAbsen).length;
                const approvedCount = parts.filter((p) => p.hadirVerifikasi === true).length;
                const pendingCount = parts.filter((p) => p.waktuAbsen && p.hadirVerifikasi === null).length;
                const totalActiveGurus = guruList.filter(g => g.aktif).length;

                return (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                    gap: 10,
                    marginTop: 'var(--space-3)',
                    paddingTop: 'var(--space-3)',
                    borderTop: '1px solid var(--color-border-light)',
                  }}>
                    <div style={{ background: 'var(--color-surface-2)', padding: '10px 14px', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                      <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', fontWeight: 600 }}>
                        {selectedKegiatan.wajib ? 'Pendaftar (Wajib Guru)' : 'Pendaftar (Sukarela)'}
                      </div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--color-primary)', marginTop: 2 }}>
                        {registeredCount} {selectedKegiatan.wajib ? `/ ${totalActiveGurus} Guru` : 'Guru'}
                      </div>
                    </div>
                    <div style={{ background: 'var(--color-surface-2)', padding: '10px 14px', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                      <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', fontWeight: 600 }}>Sudah Presensi GPS</div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: '#0284C7', marginTop: 2 }}>{gpsAbsenCount} Guru</div>
                    </div>
                    <div style={{ background: 'var(--color-surface-2)', padding: '10px 14px', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                      <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', fontWeight: 600 }}>Menunggu Verifikasi</div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: '#D97706', marginTop: 2 }}>{pendingCount} Guru</div>
                    </div>
                    <div style={{ background: 'var(--color-surface-2)', padding: '10px 14px', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                      <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', fontWeight: 600 }}>Telah Disetujui (Approved)</div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--color-success)', marginTop: 2 }}>{approvedCount} Guru</div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Main Table Verification Card */}
            {selectedKegiatan ? (
              (() => {
                // Filter guru:
                // Jika kegiatan WAJIB -> tampilkan semua guru aktif
                // Jika kegiatan TIDAK WAJIB -> hanya tampilkan guru yang mendaftar (respons === 'hadir')
                const displayedGurus = guruList
                  .filter((g) => g.aktif)
                  .filter((g) => {
                    if (selectedKegiatan.wajib) return true;
                    const part = partisipasiList.find(
                      (p) => p.kegiatanId === selectedKegiatan.id && (p.guruId === g.id || p.guruNama === g.nama)
                    );
                    return part && part.respons === 'hadir';
                  });

                return (
                  <div className="card" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--color-border)' }}>
                    <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, padding: '14px 18px', background: 'var(--color-surface-2)' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                          <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 800, margin: 0 }}>
                            Daftar Kehadiran &amp; Penetapan Peran ({displayedGurus.length} Guru)
                          </h3>
                          {selectedKegiatan.wajib ? (
                            <span className="badge badge-danger" style={{ fontSize: 10, fontWeight: 800 }}>
                              Wajib Diikuti Semua Guru
                            </span>
                          ) : (
                            <span className="badge badge-neutral" style={{ fontSize: 10, fontWeight: 700 }}>
                              Opsional / Sukarela (Menampilkan Pendaftar)
                            </span>
                          )}
                        </div>
                        <p style={{ fontSize: 11.5, color: 'var(--color-text-tertiary)', margin: '3px 0 0' }}>
                          {selectedKegiatan.wajib
                            ? 'Kegiatan ini berstatus Wajib. Admin dapat memverifikasi kehadiran dan menetapkan peran untuk seluruh guru yayasan.'
                            : 'Kegiatan ini bersifat Sukarela/Opsional. Hanya guru yang mendaftar yang ditampilkan dalam daftar ini.'}
                        </p>
                      </div>
                    </div>

                    {displayedGurus.length === 0 ? (
                      <div style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--color-text-tertiary)' }}>
                        <Users size={32} style={{ opacity: 0.4, margin: '0 auto var(--space-2)' }} />
                        <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--color-text-secondary)' }}>
                          Belum Ada Guru yang Mendaftar
                        </div>
                        <div style={{ fontSize: 12, marginTop: 4 }}>
                          Kegiatan ini bersifat sukarela. Guru yang menekan "Saya Bersedia Ikut" akan muncul di sini.
                        </div>
                      </div>
                    ) : (
                      <div className="table-container" style={{ border: 'none', borderRadius: 0, overflowX: 'auto' }}>
                        <table className="table" style={{ width: '100%', minWidth: 780 }}>
                          <thead>
                            <tr style={{ background: 'var(--color-surface-2)', borderBottom: '2px solid var(--color-border)' }}>
                              <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, minWidth: 200 }}>Guru / Pengajar</th>
                              <th style={{ padding: '12px 14px', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, minWidth: 120 }}>Status Respon</th>
                              <th style={{ padding: '12px 14px', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, minWidth: 180 }}>Presensi &amp; GPS</th>
                              <th style={{ padding: '12px 14px', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, minWidth: 170 }}>Peran (Ditentukan Admin)</th>
                              <th style={{ padding: '12px 14px', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, minWidth: 150 }}>Status Verifikasi</th>
                              <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'center', minWidth: 150 }}>Aksi Approval</th>
                            </tr>
                          </thead>
                          <tbody>
                            {displayedGurus.map((g) => {
                              const part = partisipasiList.find((p) => p.kegiatanId === selectedKegiatan.id && (p.guruId === g.id || p.guruNama === g.nama));
                              const isRegistered = part && part.respons === 'hadir';
                              const currentRole: ActivityParticipationType = part?.jenisPartisipasi || 'peserta';

                              return (
                                <tr key={g.id} style={{ borderBottom: '1px solid var(--color-border-light)', verticalAlign: 'middle' }}>
                                  {/* Nama Guru */}
                                  <td style={{ padding: '12px 16px' }}>
                                    <div style={{ fontWeight: 800, fontSize: 13, color: 'var(--color-text-primary)', whiteSpace: 'nowrap' }}>
                                      {g.nama}
                                    </div>
                                    <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 2, display: 'flex', gap: 6, alignItems: 'center' }}>
                                      <span className="badge badge-neutral" style={{ fontSize: 10, padding: '1px 5px' }}>{g.jabatan}</span>
                                      <span>{g.nip}</span>
                                    </div>
                                  </td>

                                  {/* Status Respon */}
                                  <td style={{ padding: '12px 14px' }}>
                                    {isRegistered ? (
                                      <span className="badge badge-success" style={{ fontSize: 11, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                        <CheckCircle2 size={12} /> Bersedia Ikut
                                      </span>
                                    ) : (
                                      <span className="badge badge-neutral" style={{ fontSize: 10.5, color: 'var(--color-text-tertiary)' }}>
                                        Belum Konfirmasi
                                      </span>
                                    )}
                                  </td>

                                  {/* Catatan Presensi & GPS */}
                                  <td style={{ padding: '12px 14px' }}>
                                    {part?.waktuAbsen ? (
                                      <div>
                                        <div style={{ fontSize: 11.5, fontWeight: 800, color: 'var(--color-success)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                          <Clock size={12} /> {new Date(part.waktuAbsen).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WITA
                                        </div>
                                        {part.latitudeAbsen && part.longitudeAbsen ? (
                                          <div style={{ marginTop: 3 }}>
                                            <a
                                              href={`https://www.google.com/maps?q=${part.latitudeAbsen},${part.longitudeAbsen}`}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              style={{ fontSize: 10.5, color: '#0284C7', display: 'inline-flex', alignItems: 'center', gap: 3, textDecoration: 'underline', fontWeight: 600 }}
                                              title="Buka titik koordinat absen di Google Maps"
                                            >
                                              <MapPin size={11} color="#DC2626" />
                                              GPS: {part.latitudeAbsen.toFixed(4)}, {part.longitudeAbsen.toFixed(4)}
                                              <ExternalLink size={9} />
                                            </a>
                                          </div>
                                        ) : (
                                          <div style={{ fontSize: 10.5, color: 'var(--color-text-tertiary)', marginTop: 2 }}>Absensi Manual</div>
                                        )}
                                      </div>
                                    ) : (
                                      <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)', fontStyle: 'italic' }}>
                                        Belum Absen di Lokasi
                                      </span>
                                    )}
                                  </td>

                                  {/* Role Dropdown */}
                                  <td style={{ padding: '12px 14px' }}>
                                    <select
                                      className="form-select"
                                      value={currentRole}
                                      onChange={(e) => {
                                        const newR = e.target.value as ActivityParticipationType;
                                        handleVerifikasiGuru(selectedKegiatan.id, g.id, part?.hadirVerifikasi ?? null, newR);
                                      }}
                                      style={{
                                        fontSize: 11.5,
                                        fontWeight: 700,
                                        padding: '5px 8px',
                                        borderRadius: 'var(--radius-sm)',
                                        border: '1px solid var(--color-border)',
                                        background: 'var(--color-surface)',
                                        width: '100%',
                                        maxWidth: 165,
                                        cursor: 'pointer',
                                      }}
                                    >
                                      <option value="peserta">Peserta (+{selectedKegiatan.poinPeserta} Poin)</option>
                                      <option value="panitia">Panitia (+{selectedKegiatan.poinPanitia} Poin)</option>
                                      <option value="koordinator">Ketua Panitia (+{selectedKegiatan.poinKoordinator} Poin)</option>
                                    </select>
                                  </td>

                                  {/* Status Verifikasi Badge */}
                                  <td style={{ padding: '12px 14px' }}>
                                    {part?.hadirVerifikasi === true ? (
                                      <span className="badge badge-success" style={{ fontSize: 11, fontWeight: 800, padding: '4px 8px', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                        <ShieldCheck size={12} /> Hadir (+{part.poinDiterima} Poin)
                                      </span>
                                    ) : part?.hadirVerifikasi === false ? (
                                      <span className="badge badge-danger" style={{ fontSize: 11, fontWeight: 700, padding: '4px 8px', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                        <XCircle size={12} /> Tidak Hadir
                                      </span>
                                    ) : part?.waktuAbsen ? (
                                      <span className="badge badge-warning" style={{ fontSize: 10.5, fontWeight: 700, padding: '4px 8px', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                        <Clock size={11} /> Menunggu Approval
                                      </span>
                                    ) : (
                                      <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>—</span>
                                    )}
                                  </td>

                                  {/* Tombol Approval */}
                                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6 }}>
                                      <button
                                        type="button"
                                        className="btn btn-sm"
                                        onClick={() => handleVerifikasiGuru(selectedKegiatan.id, g.id, true)}
                                        style={{
                                          padding: '5px 10px',
                                          fontSize: 11,
                                          fontWeight: 800,
                                          borderRadius: 'var(--radius-sm)',
                                          background: part?.hadirVerifikasi === true ? 'var(--color-success)' : '#16A34A',
                                          color: '#ffffff',
                                          border: 'none',
                                          cursor: 'pointer',
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: 4,
                                        }}
                                        title="Konfirmasi Hadir & Berikan Poin"
                                      >
                                        <CheckCircle2 size={12} /> Approve
                                      </button>
                                      <button
                                        type="button"
                                        className="btn btn-ghost btn-sm"
                                        onClick={() => handleVerifikasiGuru(selectedKegiatan.id, g.id, false)}
                                        style={{
                                          padding: '5px 8px',
                                          fontSize: 11,
                                          fontWeight: 700,
                                          color: 'var(--color-danger)',
                                          border: '1px solid #FECACA',
                                          borderRadius: 'var(--radius-sm)',
                                          background: '#FEF2F2',
                                          cursor: 'pointer',
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: 2,
                                        }}
                                        title="Tolak / Tandai Tidak Hadir"
                                      >
                                        <X size={12} /> Tolak
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })()
            ) : (
              <div className="empty-state">
                <div className="empty-state-title">Pilih Kegiatan</div>
                <div className="empty-state-desc">Belum ada kegiatan yang dipilih.</div>
              </div>
            )}
          </div>

        )}
      </div>
    </div>
  );
}
