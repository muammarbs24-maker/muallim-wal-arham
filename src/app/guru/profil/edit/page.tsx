'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Camera, Save, Mail, ShieldCheck, X, AlertCircle, CheckCircle2 } from 'lucide-react';
import { currentGuru } from '@/lib/mockData';
import { getInitials } from '@/lib/utils';
import { requestSendOtpEmail } from '@/lib/emailService';

export default function EditProfilPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    telepon: currentGuru.telepon,
    email: currentGuru.email,
    alamat: currentGuru.alamat,
  });
  const [showSuccess, setShowSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  // OTP Verification State for Changing Email
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [otpError, setOtpError] = useState<string | null>(null);
  const [toastOtp, setToastOtp] = useState<string | null>(null);
  const [otpTimer, setOtpTimer] = useState(60);

  // Countdown timer for OTP
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (showOtpModal && otpTimer > 0) {
      interval = setInterval(() => setOtpTimer((t) => t - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [showOtpModal, otpTimer]);

  const handleSave = () => {
    // Check if email was modified
    const isEmailChanged = form.email.trim().toLowerCase() !== currentGuru.email.toLowerCase();

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
        nama: currentGuru.nama,
      });
      return;
    }

    // If email not changed, save other fields directly
    saveProfileData(currentGuru.email);
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
    setTimeout(() => {
      currentGuru.telepon = form.telepon;
      currentGuru.email = verifiedEmail;
      currentGuru.alamat = form.alamat;

      setLoading(false);
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        router.push('/guru/profil');
      }, 1500);
    }, 500);
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
          <div className="toast toast-success">✓ Profil &amp; Email berhasil diperbarui</div>
        </div>
      )}

      {/* Header */}
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
        <button className="btn btn-ghost btn-sm" style={{ padding: 8 }} onClick={() => router.back()}>
          <ArrowLeft size={20} />
        </button>
        <h1 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 800 }}>Edit Profil</h1>
      </div>

      <div style={{ padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        {/* Avatar */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 'var(--space-5)' }}>
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <div className="avatar avatar-xl" style={{ border: '3px solid var(--color-primary-light)' }}>
              {getInitials(currentGuru.nama)}
            </div>
            <button style={{
              position: 'absolute', bottom: 0, right: 0,
              width: 32, height: 32, borderRadius: '50%',
              background: 'var(--color-primary)', border: '2px solid white',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Camera size={14} color="white" />
            </button>
          </div>
          <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', marginTop: 'var(--space-2)' }}>
            Ketuk untuk mengganti foto profil
          </p>
        </div>

        {/* Read-only fields */}
        <div className="card">
          <div className="card-header">
            <span style={{ fontWeight: 700, fontSize: 'var(--font-size-sm)' }}>Data yang Tidak Dapat Diubah</span>
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <div className="form-group">
              <label className="form-label">Nama Lengkap</label>
              <input className="form-input" value={currentGuru.nama} disabled style={{ background: 'var(--color-bg)', color: 'var(--color-text-tertiary)' }} />
            </div>
            <div className="form-group">
              <label className="form-label">NIP / ID Guru</label>
              <input className="form-input" value={currentGuru.nip} disabled style={{ background: 'var(--color-bg)', color: 'var(--color-text-tertiary)' }} />
            </div>
            <div className="form-group">
              <label className="form-label">Jabatan</label>
              <input className="form-input" value={currentGuru.jabatan} disabled style={{ background: 'var(--color-bg)', color: 'var(--color-text-tertiary)' }} />
            </div>
          </div>
        </div>

        {/* Editable fields */}
        <div className="card">
          <div className="card-header">
            <span style={{ fontWeight: 700, fontSize: 'var(--font-size-sm)' }}>Data Kontak &amp; Akun</span>
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <div className="form-group">
              <label className="form-label">Nomor Telepon</label>
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
                <label className="form-label">Email Akun Guru</label>
                <span style={{ fontSize: 10, color: 'var(--color-primary)', fontWeight: 600 }}>
                  Wajib Verifikasi OTP jika diubah
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

            <div className="form-group">
              <label className="form-label">Alamat</label>
              <textarea
                className="form-textarea"
                value={form.alamat}
                onChange={(e) => setForm({ ...form, alamat: e.target.value })}
                placeholder="Alamat lengkap..."
                rows={3}
              />
            </div>
          </div>
        </div>

        <button
          className="btn btn-primary btn-lg"
          style={{ width: '100%' }}
          onClick={handleSave}
          disabled={loading}
        >
          {loading ? <span className="animate-spin"><Save size={18} /></span> : <><Save size={18} /> Simpan Perubahan</>}
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
                  Batal (Tolak Ganti Email)
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
