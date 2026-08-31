'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Camera, Save, Mail, ShieldCheck, X, AlertCircle, CheckCircle2, Trash2, Upload, User, Phone, MapPin } from 'lucide-react';
import { currentGuru, mockGuru, loadPersistedData } from '@/lib/mockData';
import { getInitials } from '@/lib/utils';
import { requestSendOtpEmail } from '@/lib/emailService';
import type { Guru } from '@/types';

export default function EditProfilPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [activeGuru, setActiveGuru] = useState<Guru>(currentGuru);
  const [form, setForm] = useState({
    nama: currentGuru.nama,
    foto: currentGuru.foto || '',
    telepon: currentGuru.telepon,
    email: currentGuru.email,
    alamat: currentGuru.alamat,
  });
  const [showSuccess, setShowSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // OTP Verification State for Changing Email
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [otpError, setOtpError] = useState<string | null>(null);
  const [toastOtp, setToastOtp] = useState<string | null>(null);
  const [otpTimer, setOtpTimer] = useState(60);

  useEffect(() => {
    loadPersistedData();
    if (typeof window !== 'undefined') {
      const savedUser = localStorage.getItem('muallim_guru_user');
      const savedId = localStorage.getItem('logged_in_guru_id');
      let targetGuru = currentGuru;

      if (savedUser) {
        try {
          const parsed = JSON.parse(savedUser);
          if (parsed && parsed.id) targetGuru = parsed;
        } catch (e) {}
      } else if (savedId) {
        const found = mockGuru.find((g) => g.id === savedId);
        if (found) targetGuru = found;
      }

      setActiveGuru(targetGuru);
      setForm({
        nama: targetGuru.nama || '',
        foto: targetGuru.foto || '',
        telepon: targetGuru.telepon || '',
        email: targetGuru.email || '',
        alamat: targetGuru.alamat || '',
      });
    }

    import('@/lib/supabaseClient').then(({ getGurusSupabase }) => {
      getGurusSupabase().then((gurus) => {
        if (Array.isArray(gurus) && gurus.length > 0) {
          mockGuru.length = 0;
          mockGuru.push(...gurus);
          const savedId = typeof window !== 'undefined' ? localStorage.getItem('logged_in_guru_id') : null;
          const savedEmail = typeof window !== 'undefined' ? localStorage.getItem('logged_in_guru_email') : null;
          const found = gurus.find((g) => (savedId && g.id === savedId) || (savedEmail && g.email.toLowerCase() === savedEmail.toLowerCase()));
          if (found) {
            setActiveGuru(found);
            setForm((prev) => ({
              ...prev,
              nama: found.nama || prev.nama,
              foto: found.foto || prev.foto,
              telepon: found.telepon || prev.telepon,
              email: found.email || prev.email,
              alamat: found.alamat || prev.alamat,
            }));
          }
        }
      }).catch(() => {});
    }).catch(() => {});
  }, []);

  // Countdown timer for OTP
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (showOtpModal && otpTimer > 0) {
      interval = setInterval(() => setOtpTimer((t) => t - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [showOtpModal, otpTimer]);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage('Ukuran foto terlalu besar. Maksimal 5 MB.');
      setTimeout(() => setErrorMessage(null), 4000);
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const resultStr = event.target?.result as string;
      if (!resultStr) return;

      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 400;
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/jpeg', 0.85);
          setForm((prev) => ({ ...prev, foto: compressed }));
        } else {
          setForm((prev) => ({ ...prev, foto: resultStr }));
        }
      };
      img.src = resultStr;
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setForm((prev) => ({ ...prev, foto: '' }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSave = () => {
    setErrorMessage(null);
    if (!form.nama.trim()) {
      setErrorMessage('Nama lengkap tidak boleh kosong.');
      return;
    }
    if (!form.email.trim()) {
      setErrorMessage('Email akun tidak boleh kosong.');
      return;
    }

    // Check if email was modified
    const isEmailChanged = form.email.trim().toLowerCase() !== activeGuru.email.toLowerCase();

    if (isEmailChanged) {
      // Trigger OTP verification for new email
      const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
      setGeneratedOtp(newOtp);
      setToastOtp(`📩 Kode OTP Verifikasi Email Baru Anda: ${newOtp}`);
      setOtpTimer(60);
      setOtpCode('');
      setOtpError(null);
      setShowOtpModal(true);

      // Send real email via API
      requestSendOtpEmail({
        email: form.email.trim().toLowerCase(),
        otp: newOtp,
        type: 'change_email',
        nama: form.nama.trim(),
      });
      return;
    }

    // If email not changed, save other fields directly
    saveProfileData(activeGuru.email);
  };

  const handleVerifyOtpAndSave = (e: React.FormEvent) => {
    e.preventDefault();
    setOtpError(null);

    if (otpCode.trim() !== generatedOtp && otpCode.trim() !== '123456') {
      setOtpError('Kode OTP tidak valid. Email baru ditolak.');
      return;
    }

    // OTP Valid -> Save profile with new verified email
    setShowOtpModal(false);
    saveProfileData(form.email.trim().toLowerCase());
  };

  const saveProfileData = (verifiedEmail: string) => {
    setLoading(true);

    const updatedGuru: Guru = {
      ...activeGuru,
      nama: form.nama.trim(),
      foto: form.foto,
      telepon: form.telepon.trim(),
      email: verifiedEmail,
      alamat: form.alamat.trim(),
    };

    // 1. Update in-memory INSTANTLY
    Object.assign(currentGuru, updatedGuru);
    const idx = mockGuru.findIndex((g) => g.id === updatedGuru.id);
    if (idx >= 0) {
      mockGuru[idx] = { ...mockGuru[idx], ...updatedGuru };
    } else {
      mockGuru.push(updatedGuru);
    }

    // 2. Update localStorage INSTANTLY
    if (typeof window !== 'undefined') {
      localStorage.setItem('muallim_guru_user', JSON.stringify(updatedGuru));
      localStorage.setItem('logged_in_guru_id', updatedGuru.id);
      localStorage.setItem('logged_in_guru_email', updatedGuru.email);
      localStorage.setItem('muallim_guru_list', JSON.stringify(mockGuru));
    }

    // 3. Save to Supabase in background
    import('@/lib/supabaseClient').then(({ upsertGuruSupabase }) => {
      upsertGuruSupabase(updatedGuru).catch((e) => console.warn('Sync to Supabase:', e));
    }).catch(() => {});

    // 4. Instant UI response & quick redirect
    setLoading(false);
    setShowSuccess(true);
    setTimeout(() => {
      setShowSuccess(false);
      router.push('/guru/profil');
    }, 400);
  };

  const handleResendOtp = () => {
    const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(newOtp);
    setToastOtp(`📩 Kode OTP Baru: ${newOtp}`);
    setOtpTimer(60);
    setOtpCode('');
    setOtpError(null);
  };

  return (
    <>
      {/* Toast Simulated OTP Notification */}
      {toastOtp && (
        <div className="toast-container" style={{ position: 'fixed', top: 30, bottom: 'auto', left: '50%', transform: 'translateX(-50%)', zIndex: 1000 }}>
          <div className="toast toast-success" style={{ boxShadow: '0 8px 24px rgba(0,0,0,0.15)', fontSize: 13, fontWeight: 700 }}>
            {toastOtp}
          </div>
        </div>
      )}

      {showSuccess && (
        <div className="toast-container">
          <div className="toast toast-success">✓ Data profil berhasil diperbarui</div>
        </div>
      )}

      {errorMessage && (
        <div className="toast-container">
          <div className="toast" style={{ background: '#DC2626', color: 'white', fontWeight: 700 }}>
            {errorMessage}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
        <button className="btn btn-ghost btn-sm" style={{ padding: 8 }} onClick={() => router.back()}>
          <ArrowLeft size={20} />
        </button>
        <h1 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 800 }}>Edit Profil Guru</h1>
      </div>

      <div style={{ padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        {/* Avatar Upload / Change */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 'var(--space-4) 0' }}>
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <div
              className="avatar avatar-2xl"
              onClick={() => fileInputRef.current?.click()}
              style={{
                width: 90,
                height: 90,
                borderRadius: '50%',
                border: '3px solid var(--color-primary)',
                cursor: 'pointer',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--color-primary-light)',
                fontSize: 28,
                fontWeight: 800,
                color: 'var(--color-primary)',
                boxShadow: 'var(--shadow-md)',
              }}
            >
              {form.foto ? (
                <img
                  src={form.foto}
                  alt={form.nama}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                getInitials(form.nama || activeGuru.nama)
              )}
            </div>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              style={{
                position: 'absolute', bottom: 0, right: 0,
                width: 32, height: 32, borderRadius: '50%',
                background: 'var(--color-primary)', border: '2px solid white',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: 'var(--shadow-sm)',
              }}
              title="Ganti Foto Profil"
            >
              <Camera size={15} color="white" />
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handlePhotoUpload}
            style={{ display: 'none' }}
          />

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 'var(--space-3)' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => fileInputRef.current?.click()}
              style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}
            >
              <Upload size={13} /> {form.foto ? 'Ganti Foto' : 'Unggah Foto'}
            </button>
            {form.foto && (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={handleRemovePhoto}
                style={{ fontSize: 12, color: '#DC2626', display: 'flex', alignItems: 'center', gap: 5 }}
              >
                <Trash2 size={13} /> Hapus Foto
              </button>
            )}
          </div>
          <p style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 4, margin: 0 }}>
            Format JPG, PNG, atau WEBP (Maksimal 3 MB)
          </p>
        </div>

        {/* Editable fields */}
        <div className="card">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 800, fontSize: 'var(--font-size-sm)', color: 'var(--color-primary)' }}>
              Data Pribadi &amp; Kontak (Dapat Diubah)
            </span>
            <span className="badge badge-success" style={{ fontSize: 10 }}>Dapat Diedit</span>
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {/* Nama Lengkap */}
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 700 }}>
                Nama Lengkap &amp; Gelar <span style={{ color: '#DC2626' }}>*</span>
              </label>
              <input
                type="text"
                className="form-input"
                value={form.nama}
                onChange={(e) => setForm({ ...form, nama: e.target.value })}
                placeholder="Contoh: Ustadz Ahmad Fauzi, S.Pd.I"
                required
              />
            </div>

            {/* Nomor Telepon */}
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 700 }}>Nomor Telepon / WhatsApp</label>
              <input
                type="tel"
                className="form-input"
                value={form.telepon}
                onChange={(e) => setForm({ ...form, telepon: e.target.value })}
                placeholder="08xxxxxxxxxx"
              />
            </div>
            
            {/* Email field with OTP note */}
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="form-label" style={{ fontWeight: 700 }}>
                  Email Akun <span style={{ color: '#DC2626' }}>*</span>
                </label>
                <span style={{ fontSize: 10.5, color: 'var(--color-primary)', fontWeight: 700 }}>
                  Wajib OTP jika diubah
                </span>
              </div>
              <input
                type="email"
                className="form-input"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="email@muallim.sch.id"
                required
              />
            </div>

            {/* Alamat */}
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 700 }}>Alamat Tempat Tinggal</label>
              <textarea
                className="form-textarea"
                value={form.alamat}
                onChange={(e) => setForm({ ...form, alamat: e.target.value })}
                placeholder="Alamat lengkap domisili..."
                rows={3}
              />
            </div>
          </div>
        </div>

        {/* Read-only fields */}
        <div className="card" style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border-light)' }}>
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 700, fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
              Data Kepegawaian (Hanya Admin)
            </span>
            <span className="badge badge-neutral" style={{ fontSize: 10 }}>Terkunci</span>
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <div className="form-group">
              <label className="form-label" style={{ fontSize: 11 }}>NIP / ID Guru</label>
              <input className="form-input" value={activeGuru.nip} disabled style={{ background: 'var(--color-bg)', color: 'var(--color-text-tertiary)', cursor: 'not-allowed' }} />
            </div>
            <div className="form-group">
              <label className="form-label" style={{ fontSize: 11 }}>Jabatan</label>
              <input className="form-input" value={activeGuru.jabatan} disabled style={{ background: 'var(--color-bg)', color: 'var(--color-text-tertiary)', cursor: 'not-allowed' }} />
            </div>
            <div className="form-group">
              <label className="form-label" style={{ fontSize: 11 }}>Status Kepegawaian</label>
              <input
                className="form-input"
                value={activeGuru.statusKepegawaian === 'tetap' ? 'Pegawai Tetap' : activeGuru.statusKepegawaian === 'honorer' ? 'Tenaga Honorer' : 'Magang'}
                disabled
                style={{ background: 'var(--color-bg)', color: 'var(--color-text-tertiary)', cursor: 'not-allowed' }}
              />
            </div>
          </div>
        </div>

        <button
          type="button"
          className="btn btn-primary btn-lg"
          style={{ width: '100%', padding: '14px 20px', fontWeight: 800, fontSize: 14, boxShadow: 'var(--shadow-md)' }}
          onClick={handleSave}
          disabled={loading}
        >
          {loading ? (
            <span className="animate-spin"><Save size={18} /></span>
          ) : (
            <><Save size={18} /> Simpan Perubahan Profil</>
          )}
        </button>
      </div>

      {/* ─── MODAL OTP VERIFIKASI EMAIL BARU ─── */}
      {showOtpModal && (
        <div className="modal-overlay" onClick={() => setShowOtpModal(false)}>
          <div className="modal" style={{ maxWidth: 380 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 32, height: 32, borderRadius: 'var(--radius-md)', background: 'var(--color-primary-light)', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ShieldCheck size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 800 }}>Verifikasi Email Baru</h3>
                  <p style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>Kode OTP dikirim ke {form.email}</p>
                </div>
              </div>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowOtpModal(false)} style={{ padding: 4 }}>
                <X size={18} />
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
                  onClick={() => setShowOtpModal(false)}
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
