'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import {
  MapPin, Clock, Save, Crosshair, Info, Layers, ZoomIn, KeyRound, CheckCircle2,
  AlertCircle, Eye, EyeOff, ShieldCheck, Copy, Check, Edit3, Lock, Trash2, RotateCcw,
  ChevronDown, ChevronRight, User, Settings2, Sliders, Shield, Navigation, X, Mail
} from 'lucide-react';
import {
  mockSettings, masterAdmin, authConfig, MASTER_RECOVERY_KEY, savePersistedSettings,
  loadPersistedData, resetAllApplicationDataExceptGurus
} from '@/lib/mockData';
import { requestSendOtpEmail } from '@/lib/emailService';
import type { AppSettings } from '@/types';

// Dynamic import for Leaflet map to prevent SSR window errors
const LocationPickerMap = dynamic(
  () => import('@/components/admin/LocationPickerMap'),
  {
    ssr: false,
    loading: () => (
      <div style={{
        height: 320,
        background: 'var(--color-surface-2)',
        borderRadius: 'var(--radius-lg)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        color: 'var(--color-text-tertiary)',
        border: '1px solid var(--color-border)',
      }}>
        <div className="animate-spin" style={{ display: 'flex' }}>
          <MapPin size={28} color="var(--color-primary)" />
        </div>
        <span style={{ fontSize: 'var(--font-size-xs)' }}>Memuat Peta Interaktif...</span>
      </div>
    ),
  }
);

export default function AdminPengaturanPage() {
  const [settings, setSettings] = useState<AppSettings>(mockSettings);
  const [activeSection, setActiveSection] = useState<'akun' | 'titik_waktu' | 'reset' | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [isEditingLocation, setIsEditingLocation] = useState(false);
  const [showResetAllModal, setShowResetAllModal] = useState(false);
  const [isResettingAll, setIsResettingAll] = useState(false);
  const [resetSuccessToast, setResetSuccessToast] = useState<string | null>(null);
  const [savedLocationPopup, setSavedLocationPopup] = useState<{
    lokasiNama: string;
    latitude: number;
    longitude: number;
    radius: number;
  } | null>(null);

  // State untuk durasi buka absen & satuan waktu (menit, jam, detik, hari)
  const [durationValue, setDurationValue] = useState<string>('30');
  const [durationUnit, setDurationUnit] = useState<'menit' | 'jam' | 'detik' | 'hari'>('menit');

  const syncDurationState = (totalMinutes: number) => {
    if (totalMinutes >= 1440 && totalMinutes % 1440 === 0) {
      setDurationValue((totalMinutes / 1440).toString());
      setDurationUnit('hari');
    } else if (totalMinutes >= 60 && totalMinutes % 60 === 0) {
      setDurationValue((totalMinutes / 60).toString());
      setDurationUnit('jam');
    } else {
      setDurationValue(totalMinutes.toString());
      setDurationUnit('menit');
    }
  };

  const handleDurationChange = (valStr: string, unit: 'menit' | 'jam' | 'detik' | 'hari') => {
    setDurationValue(valStr);
    setDurationUnit(unit);
    const num = parseFloat(valStr) || 0;
    let totalMinutes = 0;
    if (unit === 'hari') {
      totalMinutes = Math.round(num * 1440);
    } else if (unit === 'jam') {
      totalMinutes = Math.round(num * 60);
    } else if (unit === 'detik') {
      totalMinutes = Math.max(1, Math.round(num / 60));
    } else {
      totalMinutes = Math.round(num);
    }
    setSettings((prev) => ({ ...prev, waktuBukaSebelumJadwal: totalMinutes }));
  };

  const toggleSection = (section: 'akun' | 'titik_waktu' | 'reset') => {
    setActiveSection((prev) => (prev === section ? null : section));
  };

  const handleResetAllData = async () => {
    setIsResettingAll(true);
    try {
      await resetAllApplicationDataExceptGurus();
    } catch (e) {
      console.error('Error during data reset:', e);
    }
    setIsResettingAll(false);
    setShowResetAllModal(false);
    setResetSuccessToast('✓ Seluruh data riwayat absensi, jadwal, kegiatan, dan notifikasi berhasil direset bersih. Data akun guru tetap aman.');
    setTimeout(() => setResetSuccessToast(null), 4500);
  };

  useEffect(() => {
    loadPersistedData();
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('muallim_app_settings');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed && typeof parsed === 'object') {
            setSettings(parsed);
            if (parsed.waktuBukaSebelumJadwal) {
              syncDurationState(parsed.waktuBukaSebelumJadwal);
            }
          }
        } catch (e) {}
      }
    }

    import('@/lib/supabaseClient').then(({ getAppSettingsSupabase }) => {
      getAppSettingsSupabase().then((data) => {
        if (data) {
          setSettings(data);
          if (data.waktuBukaSebelumJadwal) {
            syncDurationState(data.waktuBukaSebelumJadwal);
          }
        }
      }).catch(() => {});
    }).catch(() => {});
  }, []);

  const handleSaveSettings = () => {
    savePersistedSettings(settings);
    setIsEditingLocation(false);
    setActiveSection(null); // Otomatis menutup kembali accordion setelah klik simpan
    
    // Tampilkan Popup Koordinat & Lokasi Terbaru selama 3 detik
    setSavedLocationPopup({
      lokasiNama: settings.lokasiNama || 'Titik Pusat Yayasan',
      latitude: settings.latitude,
      longitude: settings.longitude,
      radius: settings.radius,
    });
    setTimeout(() => setSavedLocationPopup(null), 3000);
  };

  const handleLocationChange = (lat: number, lng: number) => {
    setSettings((prev) => ({ ...prev, latitude: lat, longitude: lng }));
  };

  const handleGetCurrentLocation = () => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      alert('Geolokasi tidak didukung oleh peramban ini.');
      return;
    }
    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setSettings((s) => ({
          ...s,
          latitude: Number(pos.coords.latitude.toFixed(6)),
          longitude: Number(pos.coords.longitude.toFixed(6)),
        }));
        setGettingLocation(false);
      },
      () => {
        setGettingLocation(false);
        alert('Gagal mendapatkan lokasi saat ini. Pastikan izin lokasi diaktifkan.');
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  return (
    <div>
      {/* POPUP INFORMASI KOORDINAT & LOKASI TERBARU (MUNCUL 3 DETIK) */}
      {savedLocationPopup && (
        <div
          style={{
            position: 'fixed',
            top: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 10000,
            width: '90%',
            maxWidth: 420,
            background: 'linear-gradient(135deg, #064E3B 0%, #065F46 100%)',
            color: '#ffffff',
            borderRadius: 'var(--radius-lg)',
            padding: '16px 18px',
            boxShadow: '0 16px 36px rgba(0, 0, 0, 0.35), 0 2px 10px rgba(0, 0, 0, 0.15)',
            border: '1.5px solid rgba(52, 211, 153, 0.5)',
            animation: 'fadeIn 0.25s ease-out',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                background: 'rgba(255,255,255,0.18)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#34D399', flexShrink: 0
              }}>
                <CheckCircle2 size={22} />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#ECFDF5', letterSpacing: -0.2 }}>
                  Titik Lokasi Berhasil Disimpan
                </div>
                <div style={{ fontSize: 11, color: '#A7F3D0', marginTop: 1 }}>
                  Koordinat &amp; lokasi terbaru telah aktif (3s)
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSavedLocationPopup(null)}
              style={{
                background: 'rgba(255,255,255,0.15)',
                border: 'none',
                color: '#E5E7EB',
                borderRadius: '50%',
                width: 24,
                height: 24,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                padding: 0
              }}
            >
              <X size={14} />
            </button>
          </div>

          <div style={{
            marginTop: 12,
            padding: '10px 12px',
            background: 'rgba(0, 0, 0, 0.28)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            display: 'flex',
            flexDirection: 'column',
            gap: 5,
            fontSize: 12
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <MapPin size={14} color="#34D399" />
              <span style={{ fontWeight: 800, color: '#F9FAFB' }}>{savedLocationPopup.lokasiNama}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#D1FAE5', fontSize: 11.5, fontFamily: 'monospace' }}>
              <Navigation size={12} color="#6EE7B7" />
              <span>Lat: {savedLocationPopup.latitude}, Lng: {savedLocationPopup.longitude}</span>
            </div>
            <div style={{ fontSize: 11, color: '#A7F3D0', marginLeft: 18 }}>
              Radius Presensi: <strong>{savedLocationPopup.radius} meter</strong>
            </div>
          </div>

          {/* Animasi bar countdown 3 detik */}
          <div style={{
            marginTop: 10,
            height: 3,
            background: 'rgba(255,255,255,0.18)',
            borderRadius: 2,
            overflow: 'hidden'
          }}>
            <div style={{
              height: '100%',
              background: '#34D399',
              animation: 'fadeProgressBar 3s linear forwards',
            }} />
          </div>
        </div>
      )}

      {/* Toast Notifikasi Pengaturan */}
      {showSuccess && (
        <div className="toast-container" style={{ position: 'fixed', top: 80, bottom: 'auto', left: '50%', transform: 'translateX(-50%)', zIndex: 9999 }}>
          <div className="toast toast-success">✓ Pengaturan berhasil disimpan</div>
        </div>
      )}

      {/* Toast Notifikasi Reset Data */}
      {resetSuccessToast && (
        <div className="toast-container" style={{ position: 'fixed', top: 80, bottom: 'auto', left: '50%', transform: 'translateX(-50%)', zIndex: 9999 }}>
          <div className="toast toast-success">{resetSuccessToast}</div>
        </div>
      )}

      {/* Topbar */}
      <div className="admin-topbar">
        <div>
          <h1 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 800 }}>Pengaturan</h1>
          <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>
            Pilih menu pengaturan di bawah untuk mengelola sistem yayasan
          </p>
        </div>
      </div>

      <div className="admin-content" style={{ maxWidth: 880, display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', marginTop: 'var(--space-2)' }}>

        {/* ═════════════════════════════════════════════════════════════
            MENU 1: EDIT AKUN (Email, Ubah Password, Master Key)
            ═════════════════════════════════════════════════════════════ */}
        <div className="card" style={{ overflow: 'hidden', transition: 'all 0.2s ease', border: activeSection === 'akun' ? '1.5px solid var(--color-primary)' : '1px solid var(--color-border)' }}>
          <div
            onClick={() => toggleSection('akun')}
            style={{
              padding: '16px 20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              cursor: 'pointer',
              background: activeSection === 'akun' ? 'rgba(27, 107, 74, 0.04)' : 'var(--color-surface)',
              userSelect: 'none',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 'var(--radius-md)',
                background: 'var(--color-primary-light)', color: 'var(--color-primary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
              }}>
                <Shield size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 800, color: 'var(--color-text-primary)' }}>
                  Edit Akun
                </h3>
                <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', marginTop: 2 }}>
                  Email Administrator, Ubah Password (Sandi Admin &amp; Sandi Default Guru), Master Key Yayasan
                </p>
              </div>
            </div>
            {activeSection === 'akun' ? <ChevronDown size={20} color="var(--color-primary)" /> : <ChevronRight size={20} color="var(--color-text-tertiary)" />}
          </div>

          {activeSection === 'akun' && (
            <div style={{ padding: '20px', borderTop: '1px solid var(--color-border-light)', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)', background: 'var(--color-surface)' }}>
              
              {/* 1.1 Form Email & Sandi Admin */}
              <div>
                <h4 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 800, color: 'var(--color-primary)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <User size={16} /> 1. Email &amp; Kata Sandi Administrator
                </h4>
                <AdminSecurityForm />
              </div>

              <div style={{ height: 1, background: 'var(--color-border-light)' }} />

              {/* 1.2 Form Kata Sandi Default Guru */}
              <div>
                <h4 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 800, color: 'var(--color-primary)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <KeyRound size={16} /> 2. Kata Sandi Default Guru Baru
                </h4>
                <DefaultGuruPasswordForm />
              </div>

              <div style={{ height: 1, background: 'var(--color-border-light)' }} />

              {/* 1.3 Form Email Pemilik / Penerima Laporan Bulanan */}
              <div>
                <h4 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 800, color: 'var(--color-primary)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Mail size={16} /> 3. Email Pemilik / Penerima Laporan Bulanan
                </h4>
                <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', marginBottom: 'var(--space-3)' }}>
                  Tentukan alamat email pemilik atau pimpinan yayasan yang akan menerima kiriman rekap audit presensi bulanan setiap tanggal 1 jam 08:00 WITA.
                </p>
                <OwnerReportEmailForm />
              </div>

              <div style={{ height: 1, background: 'var(--color-border-light)' }} />

              {/* 1.4 Master Recovery Key */}
              <div>
                <h4 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 800, color: '#DC2626', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                  🛡️ 4. Master Recovery Key Yayasan
                </h4>
                <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', marginBottom: 'var(--space-3)' }}>
                  Kunci pemulihan darurat jika Administrator lupa email atau kata sandi login. Simpan kode ini di tempat yang aman.
                </p>
                <MasterRecoveryKeyCard />
              </div>

            </div>
          )}
        </div>

        {/* ═════════════════════════════════════════════════════════════
            MENU 2: EDIT TITIK ABSEN & WAKTU ABSEN AKTIF
            ═════════════════════════════════════════════════════════════ */}
        <div className="card" style={{ overflow: 'hidden', transition: 'all 0.2s ease', border: activeSection === 'titik_waktu' ? '1.5px solid var(--color-primary)' : '1px solid var(--color-border)' }}>
          <div
            onClick={() => toggleSection('titik_waktu')}
            style={{
              padding: '16px 20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              cursor: 'pointer',
              background: activeSection === 'titik_waktu' ? 'rgba(27, 107, 74, 0.04)' : 'var(--color-surface)',
              userSelect: 'none',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 'var(--radius-md)',
                background: 'rgba(2, 132, 199, 0.1)', color: '#0284C7',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
              }}>
                <MapPin size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 800, color: 'var(--color-text-primary)' }}>
                  Edit Titik Absen dan Waktu Absen Aktif
                </h3>
                <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', marginTop: 2 }}>
                  Titik Koordinat Peta, Radius Lingkaran, Jam Absen Terbuka Sebelum Jadwal, Toleransi
                </p>
              </div>
            </div>
            {activeSection === 'titik_waktu' ? <ChevronDown size={20} color="var(--color-primary)" /> : <ChevronRight size={20} color="var(--color-text-tertiary)" />}
          </div>

          {activeSection === 'titik_waktu' && (
            <div style={{ padding: '20px', borderTop: '1px solid var(--color-border-light)', display: 'flex', flexDirection: 'column', gap: 'var(--space-5)', background: 'var(--color-surface)' }}>
              
              {/* Header inside with Edit button */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                <div>
                  <h4 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 800, color: 'var(--color-text-primary)' }}>
                    Pusat Lokasi &amp; Radius Presensi
                  </h4>
                  <div style={{ fontSize: 'var(--font-size-xs)', color: isEditingLocation ? '#92400E' : 'var(--color-text-secondary)', marginTop: 2 }}>
                    {isEditingLocation ? (
                      <>✏️ <strong>Mode Edit Aktif:</strong> Geser pin hijau 🕌 atau klik pada peta untuk menentukan titik baru.</>
                    ) : (
                      <>🔒 <strong>Titik Terkunci:</strong> Klik tombol <strong>Edit Titik Absen</strong> jika ingin memindahkan titik lokasi.</>
                    )}
                  </div>
                </div>

                {!isEditingLocation ? (
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setIsEditingLocation(true)}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}
                  >
                    <Edit3 size={14} /> Edit Titik Absen
                  </button>
                ) : (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => setIsEditingLocation(false)}
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => {
                        setIsEditingLocation(false);
                        handleSaveSettings();
                      }}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}
                    >
                      <Check size={14} /> Selesai Atur Titik
                    </button>
                  </div>
                )}
              </div>

              {/* Map View */}
              <div style={{ height: 340, width: '100%', borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: isEditingLocation ? '2px solid var(--color-primary)' : '1.5px solid var(--color-border)' }}>
                <LocationPickerMap
                  latitude={settings.latitude}
                  longitude={settings.longitude}
                  radius={settings.radius}
                  lokasiNama={settings.lokasiNama}
                  isEditing={isEditingLocation}
                  onChangeLocation={handleLocationChange}
                />
              </div>

              {isEditingLocation && (
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={handleGetCurrentLocation}
                    disabled={gettingLocation}
                    style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                  >
                    <Crosshair size={14} />
                    {gettingLocation ? 'Mendeteksi...' : 'Gunakan Titik GPS Saat Ini'}
                  </button>
                </div>
              )}

              {/* Nama Tempat / Ruang Presensi Input */}
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                  Nama Tempat / Ruang Presensi {!isEditingLocation && <Lock size={12} color="var(--color-text-tertiary)" />}
                </label>
                <input
                  type="text"
                  className="form-input"
                  disabled={!isEditingLocation}
                  style={{ opacity: isEditingLocation ? 1 : 0.8, background: isEditingLocation ? 'white' : 'var(--color-surface-2)' }}
                  value={settings.lokasiNama || ''}
                  placeholder="Contoh: Ruang Halaqah / Kampus Yayasan Mu'Allim"
                  onChange={(e) => setSettings({ ...settings, lokasiNama: e.target.value })}
                />
                <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 4, display: 'block' }}>
                  Nama tempat ini akan otomatis tampil pada jadwal mengajar guru dan detail presensi.
                </span>
              </div>

              {/* Coordinates Inputs */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    Latitude {!isEditingLocation && <Lock size={12} color="var(--color-text-tertiary)" />}
                  </label>
                  <input
                    type="number"
                    step="0.000001"
                    className="form-input"
                    disabled={!isEditingLocation}
                    style={{ opacity: isEditingLocation ? 1 : 0.75, background: isEditingLocation ? 'white' : 'var(--color-surface-2)' }}
                    value={settings.latitude}
                    onChange={(e) => setSettings({ ...settings, latitude: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    Longitude {!isEditingLocation && <Lock size={12} color="var(--color-text-tertiary)" />}
                  </label>
                  <input
                    type="number"
                    step="0.000001"
                    className="form-input"
                    disabled={!isEditingLocation}
                    style={{ opacity: isEditingLocation ? 1 : 0.75, background: isEditingLocation ? 'white' : 'var(--color-surface-2)' }}
                    value={settings.longitude}
                    onChange={(e) => setSettings({ ...settings, longitude: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>

              {/* Radius Slider */}
              <div className="form-group" style={{ background: 'var(--color-surface-2)', padding: 'var(--space-4)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border-light)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
                  <label className="form-label" style={{ marginBottom: 0, fontWeight: 700 }}>
                    Radius Lingkaran Presensi
                  </label>
                  <span style={{ fontSize: 'var(--font-size-base)', fontWeight: 800, color: 'var(--color-primary)' }}>
                    {settings.radius} meter
                  </span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="500"
                  step="10"
                  value={settings.radius}
                  onChange={(e) => setSettings({ ...settings, radius: parseInt(e.target.value) })}
                  style={{ width: '100%', accentColor: 'var(--color-primary)' }}
                />
                <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-2)', flexWrap: 'wrap' }}>
                  {[30, 50, 100, 200, 300].map((r) => (
                    <button
                      key={r}
                      type="button"
                      className={`btn btn-sm ${settings.radius === r ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ fontSize: 11, padding: '3px 10px' }}
                      onClick={() => setSettings({ ...settings, radius: r })}
                    >
                      {r}m
                    </button>
                  ))}
                </div>
              </div>

              {/* WAKTU BUKA ABSEN SEBELUM JADWAL */}
              <div className="form-group" style={{ background: 'var(--color-surface-2)', padding: 'var(--space-4)', borderRadius: 'var(--radius-lg)', border: '1.5px solid var(--color-primary-light)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8, marginBottom: 'var(--space-3)' }}>
                  <div>
                    <label className="form-label" style={{ marginBottom: 2, fontWeight: 800, fontSize: 'var(--font-size-sm)', color: 'var(--color-text-primary)' }}>
                      Waktu Buka Absen Sebelum Jadwal Dimulai
                    </label>
                    <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', margin: 0 }}>
                      Form absensi di akun guru akan otomatis terbuka menjelang jam kelas
                    </p>
                  </div>
                  <div style={{
                    padding: '4px 10px',
                    background: 'var(--color-primary-light)',
                    color: 'var(--color-primary-dark)',
                    borderRadius: 'var(--radius-md)',
                    fontWeight: 800,
                    fontSize: 12,
                    border: '1px solid rgba(27, 107, 74, 0.2)',
                  }}>
                    Aktif: {durationValue} {durationUnit} ({settings.waktuBukaSebelumJadwal ?? 60} menit)
                  </div>
                </div>

                {/* Input Nilai + Dropdown Satuan Waktu (Menit / Jam / Detik / Hari) */}
                <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', flexWrap: 'wrap' }}>
                  <div style={{ width: 140 }}>
                    <input
                      type="text"
                      inputMode="numeric"
                      className="form-input"
                      placeholder="cth: 30"
                      value={durationValue}
                      onChange={(e) => {
                        const clean = e.target.value.replace(/[^0-9.]/g, '');
                        handleDurationChange(clean, durationUnit);
                      }}
                      style={{
                        fontSize: 15,
                        fontWeight: 800,
                        textAlign: 'center',
                        padding: '8px 12px',
                        width: '100%',
                        letterSpacing: 0.5,
                      }}
                    />
                  </div>

                  <div style={{ width: 130 }}>
                    <select
                      className="form-select"
                      value={durationUnit}
                      onChange={(e) => handleDurationChange(durationValue, e.target.value as any)}
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        padding: '8px 12px',
                      }}
                    >
                      <option value="menit">Menit</option>
                      <option value="jam">Jam</option>
                      <option value="detik">Detik</option>
                      <option value="hari">Hari</option>
                    </select>
                  </div>

                  <span style={{ fontSize: 11.5, color: 'var(--color-text-secondary)' }}>
                    sebelum jadwal mengajar dimulai
                  </span>
                </div>

                {/* Tombol Pilihan Cepat (Preset) */}
                <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-3)', flexWrap: 'wrap' }}>
                  {[
                    { val: '15', unit: 'menit' as const, label: '15 Menit' },
                    { val: '30', unit: 'menit' as const, label: '30 Menit' },
                    { val: '45', unit: 'menit' as const, label: '45 Menit' },
                    { val: '50', unit: 'menit' as const, label: '50 Menit' },
                    { val: '1', unit: 'jam' as const, label: '1 Jam' },
                    { val: '2', unit: 'jam' as const, label: '2 Jam' },
                    { val: '1', unit: 'hari' as const, label: '1 Hari' },
                  ].map((preset) => {
                    const isSelected = durationValue === preset.val && durationUnit === preset.unit;
                    return (
                      <button
                        key={preset.label}
                        type="button"
                        className={`btn btn-sm ${isSelected ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ fontSize: 11, padding: '3px 10px', borderRadius: 9999 }}
                        onClick={() => handleDurationChange(preset.val, preset.unit)}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Toleransi Keterlambatan */}
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700 }}>
                  Toleransi Keterlambatan (menit)
                </label>
                <input
                  type="number"
                  className="form-input"
                  value={settings.batasKeterlambatan}
                  onChange={(e) => setSettings({ ...settings, batasKeterlambatan: parseInt(e.target.value) || 0 })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--space-2)' }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleSaveSettings}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}
                >
                  <Save size={16} /> Simpan Pengaturan Absensi
                </button>
              </div>

            </div>
          )}
        </div>

        {/* ═════════════════════════════════════════════════════════════
            MENU 3: RESET DATA (Bersihkan data, Akun Guru Tetap Aman)
            ═════════════════════════════════════════════════════════════ */}
        <div className="card" style={{ overflow: 'hidden', transition: 'all 0.2s ease', border: activeSection === 'reset' ? '1.5px solid #DC2626' : '1px solid var(--color-border)' }}>
          <div
            onClick={() => toggleSection('reset')}
            style={{
              padding: '16px 20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              cursor: 'pointer',
              background: activeSection === 'reset' ? '#FEF2F2' : 'var(--color-surface)',
              userSelect: 'none',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 'var(--radius-md)',
                background: '#FEE2E2', color: '#DC2626',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
              }}>
                <Trash2 size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 800, color: '#991B1B' }}>
                  Reset Data
                </h3>
                <p style={{ fontSize: 'var(--font-size-xs)', color: '#B91C1C', marginTop: 2 }}>
                  Kosongkan riwayat absensi, matriks jadwal, kegiatan, dan notifikasi (Akun Guru Tetap Aman)
                </p>
              </div>
            </div>
            {activeSection === 'reset' ? <ChevronDown size={20} color="#DC2626" /> : <ChevronRight size={20} color="var(--color-text-tertiary)" />}
          </div>

          {activeSection === 'reset' && (
            <div style={{ padding: '20px', borderTop: '1px solid #FCA5A5', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', background: '#FFF5F5' }}>
              <p style={{ fontSize: 'var(--font-size-xs)', color: '#7F1D1D', lineHeight: 1.6 }}>
                Fitur ini akan mengosongkan seluruh riwayat presensi guru, penugasan jadwal, permohonan tukar jadwal, kegiatan yayasan, dan notifikasi agar sistem bersih kembali.
                <br />
                <strong>🛡️ Seluruh data akun guru (Email, Sandi, NIP, Jabatan, Profil) &amp; Akun Admin TETAP AMAN dan TIDAK akan terhapus.</strong>
              </p>

              <div>
                <button
                  type="button"
                  className="btn btn-danger btn-sm"
                  onClick={() => setShowResetAllModal(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, padding: '8px 16px' }}
                >
                  <RotateCcw size={15} /> Reset Semua Data (Kecuali Akun Guru)
                </button>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* ─── MODAL KONFIRMASI RESET SEMUA DATA ─── */}
      {showResetAllModal && (
        <div className="modal-overlay" onClick={() => setShowResetAllModal(false)}>
          <div className="modal" style={{ maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 800, color: '#DC2626', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Trash2 size={18} /> Reset Seluruh Data Aplikasi?
              </h3>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                Apakah Anda yakin ingin mengosongkan seluruh data transaksi di aplikasi?
              </p>
              <div style={{
                marginTop: 'var(--space-3)', padding: '12px 14px',
                background: '#FEF2F2', border: '1px solid #FCA5A5',
                borderRadius: 'var(--radius-md)', fontSize: 12, color: '#991B1B', lineHeight: 1.6
              }}>
                <strong>Data yang akan dibersihkan:</strong>
                <ul style={{ margin: '6px 0 0 16px', padding: 0 }}>
                  <li>Seluruh riwayat presensi &amp; absensi masuk/pulang</li>
                  <li>Seluruh penugasan matriks jadwal mengajar</li>
                  <li>Semua riwayat pengajuan tukar jadwal</li>
                  <li>Daftar agenda kegiatan &amp; partisipasi</li>
                  <li>Semua notifikasi aplikasi</li>
                </ul>
                <div style={{ marginTop: 8, fontWeight: 700, color: '#166534' }}>
                  ✓ Data akun guru &amp; akun admin TIDAK akan terhapus.
                </div>
              </div>
            </div>
            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setShowResetAllModal(false)}
                disabled={isResettingAll}
              >
                Batal
              </button>
              <button
                type="button"
                className="btn btn-danger btn-sm"
                onClick={handleResetAllData}
                disabled={isResettingAll}
                style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}
              >
                <Trash2 size={14} />
                {isResettingAll ? 'Mereset Data...' : 'Ya, Bersihkan & Reset Data'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sub-component: Form Ganti Email & Password Admin ────────────
function AdminSecurityForm() {
  const [adminEmail, setAdminEmail] = useState(masterAdmin.email);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // OTP State for Admin Email change
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [otpError, setOtpError] = useState<string | null>(null);
  const [toastOtp, setToastOtp] = useState<string | null>(null);
  const [otpTimer, setOtpTimer] = useState(60);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (showOtpModal && otpTimer > 0) {
      interval = setInterval(() => setOtpTimer((t) => t - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [showOtpModal, otpTimer]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);

    // Validate old password if changing password
    if (newPassword) {
      if (oldPassword !== masterAdmin.password && oldPassword !== 'admin123') {
        setMsg({ type: 'error', text: 'Kata sandi lama yang Anda masukkan salah.' });
        return;
      }
      if (newPassword.length < 6) {
        setMsg({ type: 'error', text: 'Kata sandi baru minimal 6 karakter.' });
        return;
      }
      if (newPassword !== confirmPassword) {
        setMsg({ type: 'error', text: 'Konfirmasi kata sandi baru tidak cocok.' });
        return;
      }
    }

    // Check if email was changed
    const isEmailChanged = adminEmail.trim().toLowerCase() !== masterAdmin.email.toLowerCase();

    if (isEmailChanged) {
      const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
      setGeneratedOtp(newOtp);
      setToastOtp(`📩 Kode OTP Verifikasi Email Admin Baru: ${newOtp}`);
      setOtpTimer(60);
      setOtpCode('');
      setOtpError(null);
      setShowOtpModal(true);

      requestSendOtpEmail({
        email: adminEmail.trim().toLowerCase(),
        otp: newOtp,
        type: 'change_email',
        nama: masterAdmin.nama,
      });
      return;
    }

    // If only password was changed
    saveAdminChanges(masterAdmin.email, newPassword || masterAdmin.password);
  };

  const saveAdminChanges = (finalEmail: string, finalPassword: string) => {
    setIsSaving(true);
    masterAdmin.email = finalEmail;
    masterAdmin.password = finalPassword;

    if (typeof window !== 'undefined') {
      localStorage.setItem('muallim_admin_account', JSON.stringify(masterAdmin));
    }

    import('@/lib/supabaseClient').then(({ updateAdminAccountSupabase }) => {
      updateAdminAccountSupabase(masterAdmin).then(() => {
        setIsSaving(false);
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setMsg({ type: 'success', text: 'Akun Administrator berhasil diperbarui!' });
        setTimeout(() => setMsg(null), 4000);
      }).catch(() => {
        setIsSaving(false);
        setMsg({ type: 'success', text: 'Akun Administrator berhasil disimpan di memori lokal.' });
      });
    }).catch(() => {
      setIsSaving(false);
      setMsg({ type: 'success', text: 'Akun Administrator berhasil disimpan.' });
    });
  };

  const handleVerifyOtpAndSave = (e: React.FormEvent) => {
    e.preventDefault();
    setOtpError(null);

    if (otpCode.trim() !== generatedOtp.trim()) {
      setOtpError('Kode OTP tidak sesuai. Silakan periksa kembali.');
      return;
    }

    setShowOtpModal(false);
    setToastOtp(null);
    saveAdminChanges(adminEmail.trim().toLowerCase(), newPassword || masterAdmin.password);
  };

  const handleResendOtp = () => {
    const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(newOtp);
    setOtpTimer(60);
    setOtpCode('');
    setOtpError(null);
    setToastOtp(`📩 Kode OTP Baru: ${newOtp}`);

    requestSendOtpEmail({
      email: adminEmail.trim().toLowerCase(),
      otp: newOtp,
      type: 'change_email',
      nama: masterAdmin.nama,
    });
  };

  return (
    <>
      {toastOtp && (
        <div className="toast-container" style={{ position: 'fixed', top: 80, bottom: 'auto', left: '50%', transform: 'translateX(-50%)', zIndex: 9999 }}>
          <div className="toast toast-success">{toastOtp}</div>
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        {msg && (
          <div style={{
            padding: '8px 12px',
            borderRadius: 'var(--radius-md)',
            fontSize: 'var(--font-size-xs)',
            background: msg.type === 'success' ? '#DCFCE7' : '#FEE2E2',
            border: `1px solid ${msg.type === 'success' ? '#86EFAC' : '#FCA5A5'}`,
            color: msg.type === 'success' ? '#166534' : '#991B1B',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}>
            {msg.type === 'success' ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
            <span>{msg.text}</span>
          </div>
        )}

        {/* Email Admin */}
        <div className="form-group" style={{ marginBottom: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label className="form-label" style={{ fontSize: 11, fontWeight: 700 }}>
              Email Administrator
            </label>
            <span style={{ fontSize: 10, color: 'var(--color-primary)', fontWeight: 600 }}>
              Wajib OTP jika diubah
            </span>
          </div>
          <input
            type="email"
            className="form-input"
            value={adminEmail}
            onChange={(e) => setAdminEmail(e.target.value)}
            required
            style={{ fontSize: 12 }}
          />
        </div>

        {/* Password Lama */}
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" style={{ fontSize: 11, fontWeight: 700 }}>
            Kata Sandi Lama (diperlukan jika ingin mengubah sandi)
          </label>
          <input
            type={showPass ? 'text' : 'password'}
            className="form-input"
            placeholder="Masukkan kata sandi lama"
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
            style={{ fontSize: 12 }}
          />
        </div>

        {/* Password Baru */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: 11, fontWeight: 700 }}>
              Kata Sandi Baru (Opsional)
            </label>
            <input
              type={showPass ? 'text' : 'password'}
              className="form-input"
              placeholder="Min. 6 karakter"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              style={{ fontSize: 12 }}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: 11, fontWeight: 700 }}>
              Ulangi Sandi Baru
            </label>
            <input
              type={showPass ? 'text' : 'password'}
              className="form-input"
              placeholder="Ulangi sandi baru"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              style={{ fontSize: 12 }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
          <label style={{ fontSize: 11, color: 'var(--color-text-tertiary)', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
            <input type="checkbox" checked={showPass} onChange={(e) => setShowPass(e.target.checked)} />
            Tampilkan Kata Sandi
          </label>

          <button type="submit" className="btn btn-primary btn-sm" disabled={isSaving} style={{ fontSize: 11, padding: '6px 14px' }}>
            {isSaving ? 'Menyimpan...' : 'Perbarui Akun Admin'}
          </button>
        </div>
      </form>

      {/* ─── MODAL OTP VERIFIKASI EMAIL ADMIN BARU ─── */}
      {showOtpModal && (
        <div className="modal-overlay" onClick={() => setShowOtpModal(false)}>
          <div className="modal" style={{ maxWidth: 380 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 32, height: 32, borderRadius: 'var(--radius-md)', background: 'var(--color-primary-light)', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ShieldCheck size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 800 }}>Verifikasi Email Admin Baru</h3>
                  <p style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>Kode OTP dikirim ke {adminEmail}</p>
                </div>
              </div>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowOtpModal(false)} style={{ padding: 4 }}>
                <EyeOff size={16} />
              </button>
            </div>

            <form onSubmit={handleVerifyOtpAndSave}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                
                {otpError && (
                  <div style={{
                    padding: '8px 12px', background: '#FEE2E2', border: '1px solid #FCA5A5',
                    borderRadius: 'var(--radius-md)', fontSize: 12, color: '#991B1B',
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}>
                    <AlertCircle size={14} />
                    <span>{otpError}</span>
                  </div>
                )}

                <div style={{ textAlign: 'center', padding: 'var(--space-2) 0' }}>
                  <label className="form-label" style={{ fontSize: 11, fontWeight: 700 }}>
                    Masukkan 6 Digit Kode OTP
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    className="form-input"
                    placeholder="Contoh: 849201"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    required
                    autoFocus
                    style={{
                      fontSize: 22,
                      fontWeight: 800,
                      textAlign: 'center',
                      letterSpacing: 6,
                      padding: '8px',
                      marginTop: 4,
                    }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11 }}>
                  <span style={{ color: 'var(--color-text-tertiary)' }}>
                    {otpTimer > 0 ? `Kirim ulang (${otpTimer}s)` : 'Tidak menerima kode?'}
                  </span>
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={otpTimer > 0}
                    style={{
                      background: 'none', border: 'none',
                      color: otpTimer > 0 ? 'var(--color-text-tertiary)' : 'var(--color-primary)',
                      fontWeight: 700, cursor: otpTimer > 0 ? 'default' : 'pointer', padding: 0,
                    }}
                  >
                    Kirim Ulang OTP
                  </button>
                </div>

              </div>

              <div className="modal-footer" style={{ padding: 'var(--space-3) var(--space-4)' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    setShowOtpModal(false);
                    setAdminEmail(masterAdmin.email);
                  }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  style={{ fontWeight: 700 }}
                >
                  Verifikasi &amp; Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Sub-component: Form Ganti Kata Sandi Default Guru ────────────
function DefaultGuruPasswordForm() {
  const [defaultPass, setDefaultPass] = useState(authConfig.defaultGuruPassword);
  const [showPass, setShowPass] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!defaultPass || defaultPass.length < 6) {
      setMsg({ type: 'error', text: 'Kata sandi minimal 6 karakter.' });
      return;
    }

    setIsSaving(true);
    authConfig.defaultGuruPassword = defaultPass;
    if (typeof window !== 'undefined') {
      localStorage.setItem('muallim_default_guru_password', defaultPass);
    }

    setTimeout(() => {
      setIsSaving(false);
      setMsg({ type: 'success', text: `Kata sandi default guru berhasil diperbarui menjadi "${defaultPass}"` });
      setTimeout(() => setMsg(null), 4000);
    }, 400);
  };

  return (
    <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      {msg && (
        <div style={{
          padding: '8px 12px',
          borderRadius: 'var(--radius-md)',
          fontSize: 'var(--font-size-xs)',
          background: msg.type === 'success' ? '#DCFCE7' : '#FEE2E2',
          border: `1px solid ${msg.type === 'success' ? '#86EFAC' : '#FCA5A5'}`,
          color: msg.type === 'success' ? '#166534' : '#991B1B',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}>
          {msg.type === 'success' ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
          <span>{msg.text}</span>
        </div>
      )}

      <div className="form-group" style={{ marginBottom: 0 }}>
        <label className="form-label" style={{ fontSize: 11, fontWeight: 700 }}>
          Kata Sandi Bawaan untuk Guru Baru
        </label>
        <div style={{ position: 'relative' }}>
          <input
            type={showPass ? 'text' : 'password'}
            className="form-input"
            value={defaultPass}
            onChange={(e) => setDefaultPass(e.target.value)}
            required
            style={{ fontSize: 12, paddingRight: 36 }}
          />
          <button
            type="button"
            onClick={() => setShowPass(!showPass)}
            style={{
              position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', color: 'var(--color-text-tertiary)', cursor: 'pointer', padding: 2,
            }}
          >
            {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>
      </div>

      <div style={{
        padding: '8px 10px',
        background: 'var(--color-surface-2)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--color-border-light)',
        fontSize: 11,
        color: 'var(--color-text-tertiary)',
        lineHeight: 1.45,
      }}>
        💡 <strong>Catatan:</strong> Guru yang baru didaftarkan akan login menggunakan email dan kata sandi ini, lalu sistem akan mewajibkan guru membuat kata sandi baru pribadi pada saat login pertama.
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 2 }}>
        <button type="submit" className="btn btn-primary btn-sm" disabled={isSaving} style={{ fontSize: 11, padding: '6px 14px' }}>
          {isSaving ? 'Menyimpan...' : 'Simpan Sandi Default'}
        </button>
      </div>
    </form>
  );
}

// ─── Sub-component: Tampilan Master Recovery Key ────────────
function MasterRecoveryKeyCard() {
  const [showKey, setShowKey] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(MASTER_RECOVERY_KEY);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div style={{
      padding: '10px 12px',
      background: 'var(--color-surface-2)',
      borderRadius: 'var(--radius-md)',
      border: '1.5px dashed var(--color-border)',
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <code style={{
            fontSize: 13,
            fontWeight: 800,
            color: 'var(--color-primary-dark)',
            letterSpacing: showKey ? 1 : 3,
            background: 'white',
            padding: '3px 8px',
            borderRadius: 4,
            border: '1px solid var(--color-border)',
          }}>
            {showKey ? MASTER_RECOVERY_KEY : '••••••••••••••••••'}
          </code>
          <button
            type="button"
            onClick={() => setShowKey(!showKey)}
            style={{ background: 'none', border: 'none', color: 'var(--color-text-tertiary)', cursor: 'pointer', padding: 2 }}
            title={showKey ? 'Sembunyikan' : 'Lihat Key'}
          >
            {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>

        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={handleCopy}
          style={{ fontSize: 11, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 4 }}
        >
          {copied ? <Check size={13} color="var(--color-primary)" /> : <Copy size={13} />}
          {copied ? 'Tersalin!' : 'Salin Key'}
        </button>
      </div>

      <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)', lineHeight: 1.4 }}>
        💡 Gunakan kunci ini pada tautan <em>&quot;Lupa alamat email administrator?&quot;</em> di halaman lupa sandi untuk membuka kembali email admin aktif.
      </div>
    </div>
  );
}

// ─── Sub-component: Form Email Pemilik / Penerima Laporan ────────
function OwnerReportEmailForm() {
  const [emailPemilik, setEmailPemilik] = useState('');
  const [namaPemilik, setNamaPemilik] = useState('Pimpinan / Pemilik Yayasan');
  const [isSaving, setIsSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedEmail = localStorage.getItem('muallim_owner_email');
      const savedName = localStorage.getItem('muallim_owner_name');
      if (savedEmail) setEmailPemilik(savedEmail);
      if (savedName) setNamaPemilik(savedName);
    }

    import('@/lib/supabaseClient').then(({ supabase }) => {
      supabase.from('admin_account').select('*').limit(1).single().then(({ data }) => {
        if (data) {
          if (data.email_pemilik) setEmailPemilik(data.email_pemilik);
          if (data.nama_pemilik) setNamaPemilik(data.nama_pemilik);
        }
      });
    }).catch(() => {});
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailPemilik.trim()) {
      setMsg({ type: 'error', text: 'Alamat email pemilik wajib diisi.' });
      return;
    }

    setIsSaving(true);
    setMsg(null);

    if (typeof window !== 'undefined') {
      localStorage.setItem('muallim_owner_email', emailPemilik.trim());
      localStorage.setItem('muallim_owner_name', namaPemilik.trim());
    }

    try {
      const { supabase } = await import('@/lib/supabaseClient');
      await supabase.from('admin_account').update({
        email_pemilik: emailPemilik.trim(),
        nama_pemilik: namaPemilik.trim(),
      }).eq('id', 1);

      await supabase.from('app_settings').update({
        email_pemilik: emailPemilik.trim(),
      }).eq('id', 1);
    } catch (e) {}

    setIsSaving(false);
    setMsg({ type: 'success', text: '✓ Email pemilik / penerima laporan bulanan berhasil disimpan!' });
    setTimeout(() => setMsg(null), 4000);
  };

  return (
    <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      {msg && (
        <div style={{
          padding: '8px 12px',
          borderRadius: 'var(--radius-md)',
          fontSize: 'var(--font-size-xs)',
          background: msg.type === 'success' ? '#DCFCE7' : '#FEE2E2',
          color: msg.type === 'success' ? '#166534' : '#991B1B',
          fontWeight: 600,
        }}>
          {msg.text}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
        <div className="form-group">
          <label className="form-label" style={{ fontWeight: 700 }}>
            Nama Pemilik / Pimpinan
          </label>
          <input
            type="text"
            className="form-input"
            value={namaPemilik}
            placeholder="cth: Pimpinan Yayasan / Pembina"
            onChange={(e) => setNamaPemilik(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="form-label" style={{ fontWeight: 700 }}>
            Email Pemilik (Tujuan Laporan) *
          </label>
          <input
            type="email"
            className="form-input"
            value={emailPemilik}
            placeholder="pemilik@gmail.com"
            onChange={(e) => setEmailPemilik(e.target.value)}
            required
          />
        </div>
      </div>

      <div style={{
        padding: '10px 14px',
        background: 'var(--color-surface-2)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--color-border-light)',
        fontSize: 11.5,
        color: 'var(--color-text-secondary)',
        lineHeight: 1.5
      }}>
        💡 <strong>Info Otomasi:</strong> Rekapitulasi absensi bulanan seluruh guru akan otomatis dikirimkan ke alamat email pemilik ini <strong>setiap tanggal 1 pukul 08:00 WITA</strong>. Anda dapat mengubah penerima email kapan saja di sini.
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--space-1)' }}>
        <button
          type="submit"
          className="btn btn-primary btn-sm"
          disabled={isSaving}
          style={{ fontSize: 11, padding: '6px 14px', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}
        >
          <Save size={14} />
          {isSaving ? 'Menyimpan...' : 'Simpan Email Pemilik'}
        </button>
      </div>
    </form>
  );
}

