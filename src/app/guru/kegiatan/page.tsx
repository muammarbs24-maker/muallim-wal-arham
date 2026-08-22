'use client';

import { useState, useEffect } from 'react';
import {
  Activity, Calendar, MapPin, Star, CheckCircle2, XCircle, Clock, Award,
  Send, Navigation, ShieldCheck, AlertCircle, ExternalLink, Edit2
} from 'lucide-react';
import {
  mockKegiatan, mockPartisipasi, currentGuru, mockGuru,
  savePersistedPartisipasi, loadPersistedData, getGoogleMapsLink,
  getNamaHari, isKegiatanAbsensiOpen, isKegiatanEnded
} from '@/lib/mockData';
import type { Kegiatan, KegiatanPartisipasi, ActivityParticipationType, Guru } from '@/types';

export default function KegiatanPage() {
  const [activeTab, setActiveTab] = useState<'mendatang' | 'saya' | 'terlewat'>('mendatang');
  const [kegiatanList, setKegiatanList] = useState<Kegiatan[]>(mockKegiatan);
  const [partisipasiList, setPartisipasiList] = useState<KegiatanPartisipasi[]>(mockPartisipasi);
  const [activeGuru, setActiveGuru] = useState<Guru>(currentGuru);
  const [showRegisterModal, setShowRegisterModal] = useState<Kegiatan | null>(null);
  const [registerNotes, setRegisterNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLocating, setIsLocating] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const refreshData = () => {
    loadPersistedData();
    setKegiatanList([...mockKegiatan]);
    setPartisipasiList([...mockPartisipasi]);
  };

  useEffect(() => {
    refreshData();
    if (typeof window !== 'undefined') {
      const savedUser = localStorage.getItem('muallim_guru_user');
      const savedId = localStorage.getItem('logged_in_guru_id');
      if (savedUser) {
        try {
          const parsed = JSON.parse(savedUser);
          if (parsed && parsed.id) setActiveGuru(parsed);
        } catch (e) {}
      } else if (savedId) {
        const found = mockGuru.find((g) => g.id === savedId);
        if (found) setActiveGuru(found);
      }
    }

    import('@/lib/supabaseClient').then(({ getKegiatanListSupabase, getKegiatanPartisipasiSupabase, getGurusSupabase }) => {
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

  const getMyPartisipasi = (kegiatanId: string) =>
    partisipasiList.find((p) => p.kegiatanId === kegiatanId && (p.guruId === activeGuru.id || p.guruNama === activeGuru.nama));

  const isRegistrationOpen = (kegiatan: Kegiatan) => {
    if (!kegiatan.batasPendaftaran) return true;
    const deadline = new Date(kegiatan.batasPendaftaran);
    const now = new Date();
    return now <= deadline;
  };

  // Submit Pendaftaran "Saya Bersedia Ikut"
  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!showRegisterModal) return;

    setIsSubmitting(true);
    const k = showRegisterModal;
    const existing = getMyPartisipasi(k.id);
    const partId = existing?.id || `part-${Date.now()}-${activeGuru.id}`;

    const newRecord: KegiatanPartisipasi = {
      id: partId,
      kegiatanId: k.id,
      guruId: activeGuru.id,
      guruNama: activeGuru.nama,
      respons: 'hadir',
      responsDibuatPada: new Date().toISOString(),
      jenisPartisipasi: 'peserta', // role ditentukan admin nanti
      alasan: registerNotes.trim() || undefined,
      waktuAbsen: existing?.waktuAbsen || null,
      latitudeAbsen: existing?.latitudeAbsen || null,
      longitudeAbsen: existing?.longitudeAbsen || null,
      lokasiAbsenNama: existing?.lokasiAbsenNama || null,
      hadirVerifikasi: existing?.hadirVerifikasi !== undefined ? existing.hadirVerifikasi : null,
      poinDiterima: existing?.poinDiterima || 0,
    };

    const updated = partisipasiList.filter((p) => p.id !== partId);
    updated.unshift(newRecord);
    setPartisipasiList(updated);
    savePersistedPartisipasi(updated);

    setIsSubmitting(false);
    setShowRegisterModal(null);
    setActiveTab('saya');
    setToastMessage(`✓ Pendaftaran berhasil! Kegiatan ditambahkan ke "Kegiatan Saya". Role partisipasi akan ditentukan admin.`);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Submit Absensi Mandiri (GPS Geolocation Tracking)
  const handleAbsenLokasi = (kegiatan: Kegiatan) => {
    if (!navigator.geolocation) {
      alert('Perangkat/browser Anda tidak mendukung fitur Geolocation.');
      return;
    }

    setIsLocating(kegiatan.id);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const accuracy = Math.round(pos.coords.accuracy);

        const existing = getMyPartisipasi(kegiatan.id);
        const partId = existing?.id || `part-${Date.now()}-${activeGuru.id}`;

        const updatedRecord: KegiatanPartisipasi = {
          id: partId,
          kegiatanId: kegiatan.id,
          guruId: activeGuru.id,
          guruNama: activeGuru.nama,
          respons: 'hadir',
          responsDibuatPada: existing?.responsDibuatPada || new Date().toISOString(),
          jenisPartisipasi: existing?.jenisPartisipasi || 'peserta',
          alasan: existing?.alasan,
          waktuAbsen: new Date().toISOString(),
          latitudeAbsen: lat,
          longitudeAbsen: lng,
          lokasiAbsenNama: `GPS: ${lat.toFixed(5)}, ${lng.toFixed(5)} (Akurasi: ±${accuracy}m)`,
          hadirVerifikasi: null, // Menunggu approval admin
          poinDiterima: 0,
        };

        const updated = partisipasiList.filter((p) => p.id !== partId);
        updated.unshift(updatedRecord);
        setPartisipasiList(updated);
        savePersistedPartisipasi(updated);

        setIsLocating(null);
        setToastMessage(`📍 Presensi terkirim dari koordinat GPS (${lat.toFixed(4)}, ${lng.toFixed(4)}). Menunggu verifikasi Admin.`);
        setTimeout(() => setToastMessage(null), 4500);
      },
      (err) => {
        setIsLocating(null);
        alert(`Gagal membaca lokasi GPS: ${err.message}. Pastikan izin akses lokasi telah diaktifkan.`);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  };

  // Filter 3 Kategori Tab:
  // 1. Kegiatan Saya: Guru sudah merespons 'hadir'
  const myActivities = kegiatanList.filter((k) => {
    const part = getMyPartisipasi(k.id);
    return part && part.respons === 'hadir';
  });

  // 2. Kegiatan Baru / Mendatang: Belum didaftari dan belum berakhir (atau batas pendaftaran masih aktif)
  const newOrUpcomingActivities = kegiatanList.filter((k) => {
    const part = getMyPartisipasi(k.id);
    const hasJoined = part && part.respons === 'hadir';
    return !hasJoined && !isKegiatanEnded(k);
  });

  // 3. Terlewat: Kegiatan yang sudah berakhir atau lewat batas daftar tanpa diikuti guru
  const missedActivities = kegiatanList.filter((k) => {
    const part = getMyPartisipasi(k.id);
    const hasJoined = part && part.respons === 'hadir';
    if (hasJoined) return false;
    return isKegiatanEnded(k) || !isRegistrationOpen(k) || part?.respons === 'tidak_hadir';
  });

  const tabs: { key: 'mendatang' | 'saya' | 'terlewat'; label: string; count: number }[] = [
    { key: 'mendatang', label: 'Kegiatan Baru / Mendatang', count: newOrUpcomingActivities.length },
    { key: 'saya', label: 'Kegiatan Saya', count: myActivities.length },
    { key: 'terlewat', label: 'Terlewat', count: missedActivities.length },
  ];

  const currentList =
    activeTab === 'mendatang' ? newOrUpcomingActivities :
    activeTab === 'saya' ? myActivities : missedActivities;

  return (
    <>
      {/* Toast Notification */}
      {toastMessage && (
        <div className="toast-container" style={{ position: 'fixed', top: 80, bottom: 'auto', left: '50%', transform: 'translateX(-50%)', zIndex: 9999 }}>
          <div className="toast toast-success">{toastMessage}</div>
        </div>
      )}

      {/* Modal Konfirmasi Keikutsertaan — Simple */}
      {showRegisterModal && (
        <div className="modal-overlay" onClick={() => setShowRegisterModal(null)}>
          <div className="modal" style={{ maxWidth: 400 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 800 }}>Konfirmasi Keikutsertaan</h3>
            </div>
            <form onSubmit={handleRegisterSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>

                {/* Info Kegiatan */}
                <div style={{
                  padding: '12px 14px',
                  background: 'var(--color-surface-2)',
                  borderRadius: 'var(--radius-md)',
                  borderLeft: '3px solid var(--color-primary)'
                }}>
                  <div style={{ fontWeight: 800, fontSize: 13, color: 'var(--color-text-primary)', marginBottom: 6 }}>
                    {showRegisterModal.nama}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Calendar size={12} color="var(--color-primary)" />
                      <span>
                        {showRegisterModal.hariMulai || getNamaHari(showRegisterModal.tanggalMulai)}, {showRegisterModal.tanggalMulai}
                        {showRegisterModal.tanggalSelesai !== showRegisterModal.tanggalMulai && (
                          <> s/d {showRegisterModal.hariSelesai || getNamaHari(showRegisterModal.tanggalSelesai)}, {showRegisterModal.tanggalSelesai}</>
                        )}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Clock size={12} color="var(--color-primary)" />
                      <span>{showRegisterModal.jamMulai}{showRegisterModal.jamSelesai ? `–${showRegisterModal.jamSelesai}` : ''} WITA</span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <MapPin size={12} color="var(--color-danger)" />
                      <span>{showRegisterModal.lokasi}</span>
                    </div>
                  </div>
                </div>

                {/* Info poin ringkas */}
                <div style={{
                  display: 'flex', gap: 6, justifyContent: 'center',
                  padding: '8px 12px',
                  background: 'var(--color-accent-light)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: 11, color: 'var(--color-text-secondary)'
                }}>
                  <span>Poin: <strong style={{ color: 'var(--color-accent)' }}>+{showRegisterModal.poinPeserta}–{showRegisterModal.poinKoordinator}</strong></span>
                  <span style={{ color: 'var(--color-border)' }}>•</span>
                  <span style={{ fontStyle: 'italic' }}>Role ditentukan oleh admin</span>
                </div>

                {/* Catatan opsional */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontWeight: 700, fontSize: 12 }}>Catatan (Opsional)</label>
                  <textarea
                    className="form-input"
                    rows={2}
                    placeholder="Tuliskan catatan kesiapan atau hal yang ingin disampaikan..."
                    value={registerNotes}
                    onChange={(e) => setRegisterNotes(e.target.value)}
                    style={{ fontSize: 12 }}
                  />
                </div>
              </div>

              <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowRegisterModal(null)}>Batal</button>
                <button type="submit" className="btn btn-primary btn-sm" disabled={isSubmitting}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}
                >
                  <Send size={13} />{isSubmitting ? 'Menyimpan...' : 'Saya Bersedia Ikut'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="page-header">
        <h1 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 800 }}>Kegiatan Yayasan</h1>
        <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', marginTop: 2 }}>
          Partisipasi acara, navigasi Google Maps, dan presensi otomatis 30 menit sebelum kegiatan
        </p>

        {/* Capsule Navigation */}
        <div style={{
          display: 'flex',
          gap: 8,
          marginTop: 'var(--space-3)',
          overflowX: 'auto',
          paddingBottom: 4,
          scrollbarWidth: 'none',
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
              {activeTab === 'mendatang'
                ? 'Tidak ada kegiatan baru yang perlu didaftari.'
                : activeTab === 'saya'
                ? 'Anda belum mendaftar di kegiatan apa pun. Silakan cek tab "Kegiatan Baru / Mendatang".'
                : 'Tidak ada kegiatan yang terlewat.'}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {currentList.map((k) => {
              const myPart = getMyPartisipasi(k.id);
              const isJoined = myPart && myPart.respons === 'hadir';
              const isEnded = isKegiatanEnded(k);
              const isAbsenOpen = isKegiatanAbsensiOpen(k);
              const isOpenForRegistration = isRegistrationOpen(k);
              const mapsUrl = getGoogleMapsLink(k.lokasi, k.linkMaps);

              return (
                <div key={k.id} className="activity-card" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                  <div className="activity-card-header">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', marginBottom: 'var(--space-2)' }}>
                          {/* Label Status Aktif / Berakhir */}
                          {activeTab === 'saya' ? (
                            !isEnded ? (
                              <span className="badge badge-success" style={{ fontWeight: 800, padding: '3px 8px' }}>
                                ● Aktif
                              </span>
                            ) : (
                              <span className="badge badge-neutral" style={{ fontWeight: 700, padding: '3px 8px' }}>
                                Berakhir
                              </span>
                            )
                          ) : (
                            <span className={`badge badge-${k.status === 'berlangsung' ? 'success' : k.status === 'mendatang' ? 'primary' : 'neutral'}`}>
                              {k.status === 'berlangsung' ? '● Sedang Berlangsung' : k.status === 'mendatang' ? 'Mendatang' : 'Selesai'}
                            </span>
                          )}

                          <span className="badge badge-neutral">{k.jenis}</span>
                          {k.wajib && <span className="badge badge-danger">Wajib</span>}
                          {isAbsenOpen && <span className="badge badge-info">📍 Sesi Absensi Terbuka</span>}
                        </div>

                        <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 800, color: 'var(--color-text-primary)' }}>
                          {k.nama}
                        </h3>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 'var(--space-4)', marginTop: 'var(--space-3)', flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
                        <Calendar size={13} color="var(--color-primary)" />
                        <span>
                          <strong>{k.hariMulai || getNamaHari(k.tanggalMulai)}, {k.tanggalMulai}</strong> s/d <strong>{k.hariSelesai || getNamaHari(k.tanggalSelesai)}, {k.tanggalSelesai}</strong>
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
                        <Clock size={13} color="var(--color-primary)" />
                        <span>{k.jamMulai}{k.jamSelesai ? `–${k.jamSelesai}` : ''} WITA</span>
                      </div>
                      {k.batasPendaftaran && !isEnded && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--font-size-xs)', color: isOpenForRegistration ? 'var(--color-success)' : 'var(--color-danger)' }}>
                          <AlertCircle size={13} />
                          <span>Batas Daftar: {new Date(k.batasPendaftaran).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="activity-card-body">
                    <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-3)', lineHeight: 1.6 }}>
                      {k.deskripsi}
                    </p>

                    {/* Lokasi dengan Link Otomatis ke Google Maps */}
                    <div style={{ marginBottom: 'var(--space-3)' }}>
                      <a
                        href={mapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          fontSize: 'var(--font-size-xs)',
                          color: 'var(--color-primary)',
                          fontWeight: 700,
                          textDecoration: 'underline',
                        }}
                      >
                        <MapPin size={14} color="var(--color-danger)" />
                        <span>{k.lokasi}</span>
                        <ExternalLink size={11} />
                      </a>
                    </div>

                    {/* Poin Ringkas 1 Baris */}
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      marginBottom: 'var(--space-3)',
                      fontSize: 11, color: 'var(--color-text-tertiary)', flexWrap: 'wrap'
                    }}>
                      <span>Poin:</span>
                      <span style={{ fontWeight: 700, color: 'var(--color-accent)' }}>Peserta +{k.poinPeserta}</span>
                      <span>•</span>
                      <span style={{ fontWeight: 700, color: 'var(--color-accent)' }}>Panitia +{k.poinPanitia}</span>
                      <span>•</span>
                      <span style={{ fontWeight: 700, color: 'var(--color-accent)' }}>Ketua +{k.poinKoordinator}</span>
                      <span style={{ fontStyle: 'italic', marginLeft: 4 }}>(role ditentukan admin)</span>
                    </div>

                    {/* Section Keterangan Partisipasi Saya atau Tombol Daftar */}
                    {isJoined ? (
                      <div style={{
                        padding: '14px 16px',
                        borderRadius: 'var(--radius-md)',
                        background: myPart?.hadirVerifikasi === true ? 'rgba(22, 163, 74, 0.08)' : 'var(--color-surface-2)',
                        border: myPart?.hadirVerifikasi === true ? '1.5px solid var(--color-success)' : '1px solid var(--color-border)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 8,
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--color-text-primary)' }}>
                              Partisipasi sebagai: <span style={{ color: 'var(--color-primary)' }}>
                                {myPart?.jenisPartisipasi === 'koordinator' ? 'Ketua Panitia' : myPart?.jenisPartisipasi === 'panitia' ? 'Panitia' : 'Peserta'}
                              </span>
                              {myPart?.poinDiterima ? <span style={{ color: 'var(--color-accent)', fontSize: 11, marginLeft: 6 }}>(+{myPart.poinDiterima} poin)</span> : null}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 2 }}>
                              {myPart?.hadirVerifikasi === true ? (
                                <span style={{ color: 'var(--color-success)', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                  <ShieldCheck size={14} /> Kehadiran Terverifikasi Admin
                                </span>
                              ) : myPart?.hadirVerifikasi === false ? (
                                <span style={{ color: 'var(--color-danger)', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                  <XCircle size={14} /> Tidak Hadir / Ditolak
                                </span>
                              ) : myPart?.waktuAbsen ? (
                                <span style={{ color: 'var(--color-info)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                  <Clock size={13} /> Presensi Terkirim — Menunggu Verifikasi Admin
                                </span>
                              ) : (
                                <span style={{ color: 'var(--color-text-tertiary)' }}>Terdaftar • Belum Absen</span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Keterangan Di mana dan Jam berapa dia absen */}
                        {myPart?.waktuAbsen ? (
                          <div style={{
                            padding: '8px 12px',
                            background: 'var(--color-surface)',
                            borderRadius: 6,
                            border: '1px solid var(--color-border-light)',
                            fontSize: 11.5,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 4,
                          }}>
                            <div>
                              📍 <strong>Lokasi Absen:</strong>{' '}
                              {myPart.latitudeAbsen && myPart.longitudeAbsen ? (
                                <a
                                  href={`https://www.google.com/maps?q=${myPart.latitudeAbsen},${myPart.longitudeAbsen}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{ color: 'var(--color-primary)', textDecoration: 'underline' }}
                                >
                                  {myPart.lokasiAbsenNama || `GPS (${myPart.latitudeAbsen.toFixed(4)}, ${myPart.longitudeAbsen.toFixed(4)})`}
                                </a>
                              ) : (
                                <span>{myPart.lokasiAbsenNama || 'Terekam di sistem'}</span>
                              )}
                            </div>
                            <div>
                              ⏰ <strong>Waktu Presensi:</strong> {new Date(myPart.waktuAbsen).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} WITA ({new Date(myPart.waktuAbsen).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })})
                            </div>
                          </div>
                        ) : (
                          <div>
                            {isAbsenOpen ? (
                              <button
                                type="button"
                                className="btn btn-success btn-sm"
                                onClick={() => handleAbsenLokasi(k)}
                                disabled={isLocating === k.id}
                                style={{
                                  width: '100%',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: 6,
                                  fontWeight: 800,
                                  padding: '10px 14px',
                                  marginTop: 4,
                                }}
                              >
                                <Navigation size={15} />
                                {isLocating === k.id ? 'Mendeteksi Lokasi GPS...' : '📍 Absen Hadir di Lokasi Sekarang'}
                              </button>
                            ) : (
                              <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', fontStyle: 'italic', marginTop: 2 }}>
                                ℹ️ Absensi akan dibuka otomatis 30 menit sebelum kegiatan dimulai.
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      /* Belum mendaftar */
                      <div>
                        {isOpenForRegistration && !isEnded ? (
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={() => {
                              setRegisterNotes('');
                              setShowRegisterModal(k);
                            }}
                            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontWeight: 700, padding: '8px 14px' }}
                          >
                            <Send size={14} /> Saya Bersedia Ikut
                          </button>
                        ) : (
                          <div style={{ padding: '8px 12px', background: 'var(--color-surface-2)', borderRadius: 6, fontSize: 11.5, color: 'var(--color-text-tertiary)', textAlign: 'center' }}>
                            {isEnded ? 'Kegiatan Telah Berakhir' : 'Pendaftaran Telah Ditutup'}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
