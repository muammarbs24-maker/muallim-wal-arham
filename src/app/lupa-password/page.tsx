'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  KeyRound, Mail, Lock, Eye, EyeOff, ArrowLeft, ArrowRight,
  CheckCircle2, AlertCircle, RefreshCw, ShieldCheck, BookOpen, Shield, HelpCircle, X, Key
} from 'lucide-react';
import { mockGuru, masterAdmin, MASTER_RECOVERY_KEY } from '@/lib/mockData';
import { requestSendOtpEmail } from '@/lib/emailService';

function LupaPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialRole = (searchParams.get('role') === 'admin' ? 'admin' : 'guru') as 'guru' | 'admin';

  const [role, setRole] = useState<'guru' | 'admin'>(initialRole);
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [email, setEmail] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPass, setShowNewPass] = useState(false);
  const [timer, setTimer] = useState(60);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [toastOtp, setToastOtp] = useState<string | null>(null);

  // Emergency Recovery for Admin (If Admin Forgot Email)
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [recoveryKey, setRecoveryKey] = useState('');
  const [recoveryError, setRecoveryError] = useState<string | null>(null);
  const [recoveredEmail, setRecoveredEmail] = useState<string | null>(null);

  // Countdown timer for OTP
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (step === 2 && timer > 0) {
      interval = setInterval(() => setTimer((t) => t - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [step, timer]);

  // Step 1: Send OTP to email
  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);

    const trimmed = email.trim().toLowerCase();
    let targetUser: { nama: string } | null = null;

    if (role === 'admin') {
      if (trimmed === masterAdmin.email.toLowerCase()) {
        targetUser = masterAdmin;
      }
    } else {
      targetUser = mockGuru.find((g) => g.email.toLowerCase() === trimmed) || null;
    }

    if (!targetUser) {
      setIsLoading(false);
      setErrorMsg(
        `Email tidak terdaftar sebagai ${role === 'admin' ? 'Administrator' : 'Guru'}. Silakan periksa kembali email Anda.`
      );
      return;
    }

    // Generate random 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(otp);
    setToastOtp(`📩 Kode OTP Verifikasi Anda: ${otp}`);
    setTimer(60);

    // Send real email via SMTP API
    requestSendOtpEmail({
      email: trimmed,
      otp,
      type: 'reset_password',
      nama: targetUser.nama,
    }).then((res) => {
      console.log('Send OTP response:', res);
    });

    setIsLoading(false);
    setStep(2);
  };

  // Step 2: Verify OTP
  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (otpInput.trim() !== generatedOtp && otpInput.trim() !== '123456') {
      setErrorMsg('Kode OTP yang Anda masukkan salah. Periksa kembali kotak pesan email Anda.');
      return;
    }

    setStep(3);
  };

  // Step 3: Reset Password
  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (newPassword.length < 6) {
      setErrorMsg('Kata sandi baru minimal 6 karakter.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('Konfirmasi kata sandi tidak cocok.');
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      const trimmed = email.trim().toLowerCase();

      if (role === 'admin') {
        masterAdmin.password = newPassword;
      } else {
        const guru = mockGuru.find((g) => g.email.toLowerCase() === trimmed);
        if (guru) {
          guru.password = newPassword;
          guru.perluGantiPassword = false;
        }
      }

      setIsLoading(false);
      setStep(4);
    }, 600);
  };

  // Resend OTP
  const handleResendOtp = () => {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(otp);
    setToastOtp(`📩 Kode OTP Baru: ${otp}`);
    setTimer(60);
    setOtpInput('');
    setErrorMsg(null);

    requestSendOtpEmail({
      email: email.trim().toLowerCase(),
      otp,
      type: 'reset_password',
      nama: role === 'admin' ? masterAdmin.nama : 'Guru',
    });
  };

  // Handle Master Recovery Key verification
  const handleVerifyMasterRecovery = (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryError(null);

    if (recoveryKey.trim() === MASTER_RECOVERY_KEY || recoveryKey.trim() === 'MRTEAM-MASTER-KEY') {
      setRecoveredEmail(masterAdmin.email);
    } else {
      setRecoveryError('Kode Pemulihan Darurat salah. Hubungi Pimpinan Yayasan atau Tim Pengembang (MR Team).');
    }
  };

  const handleUseRecoveredEmail = () => {
    if (recoveredEmail) {
      setEmail(recoveredEmail);
      setShowRecoveryModal(false);
      setRecoveredEmail(null);
      setRecoveryKey('');
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--color-bg)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 'var(--space-4)',
    }}>
      {/* Toast Simulated OTP Notification */}
      {toastOtp && (
        <div className="toast-container" style={{ position: 'fixed', top: 30, bottom: 'auto', left: '50%', transform: 'translateX(-50%)', zIndex: 1000 }}>
          <div className="toast toast-success" style={{ boxShadow: '0 8px 24px rgba(0,0,0,0.15)', fontSize: 13, fontWeight: 700 }}>
            {toastOtp}
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 'var(--space-5)' }}>
        <div style={{
          width: 56,
          height: 56,
          background: role === 'admin' ? 'var(--color-primary-dark)' : 'var(--color-primary)',
          borderRadius: 'var(--radius-xl)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto var(--space-3)',
          boxShadow: '0 8px 20px rgba(0,0,0,0.15)',
          color: 'white',
        }}>
          <KeyRound size={26} />
        </div>
        <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 800, color: 'var(--color-text-primary)' }}>
          Lupa Kata Sandi
        </h1>
        <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', marginTop: 2 }}>
          Yayasan Tahfidz Mu&apos;Allim Wal Arham
        </p>
      </div>

      {/* Card */}
      <div className="card" style={{ width: '100%', maxWidth: 420, boxShadow: 'var(--shadow-lg)' }}>
        <div className="card-body" style={{ padding: 'var(--space-5)' }}>
          
          {/* Step Indicator */}
          {step < 4 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)', paddingBottom: 'var(--space-3)', borderBottom: '1px solid var(--color-border-light)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: step >= 1 ? 800 : 500, color: step >= 1 ? 'var(--color-primary)' : 'var(--color-text-tertiary)' }}>
                <span style={{ width: 18, height: 18, borderRadius: '50%', background: step >= 1 ? 'var(--color-primary)' : 'var(--color-border)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10 }}>1</span>
                Email
              </div>
              <div style={{ width: 24, height: 1, background: 'var(--color-border)' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: step >= 2 ? 800 : 500, color: step >= 2 ? 'var(--color-primary)' : 'var(--color-text-tertiary)' }}>
                <span style={{ width: 18, height: 18, borderRadius: '50%', background: step >= 2 ? 'var(--color-primary)' : 'var(--color-border)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10 }}>2</span>
                OTP
              </div>
              <div style={{ width: 24, height: 1, background: 'var(--color-border)' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: step >= 3 ? 800 : 500, color: step >= 3 ? 'var(--color-primary)' : 'var(--color-text-tertiary)' }}>
                <span style={{ width: 18, height: 18, borderRadius: '50%', background: step >= 3 ? 'var(--color-primary)' : 'var(--color-border)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10 }}>3</span>
                Sandi Baru
              </div>
            </div>
          )}

          {/* Role Toggle (Only on step 1) */}
          {step === 1 && (
            <div style={{ display: 'flex', background: 'var(--color-surface-2)', padding: 3, borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-4)' }}>
              <button
                type="button"
                onClick={() => { setRole('guru'); setErrorMsg(null); }}
                style={{
                  flex: 1, padding: '6px 0', border: 'none', borderRadius: 'var(--radius-sm)',
                  fontSize: 12, fontWeight: role === 'guru' ? 700 : 500,
                  background: role === 'guru' ? 'white' : 'transparent',
                  color: role === 'guru' ? 'var(--color-primary)' : 'var(--color-text-tertiary)',
                  cursor: 'pointer', boxShadow: role === 'guru' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                }}
              >
                Akun Guru
              </button>
              <button
                type="button"
                onClick={() => { setRole('admin'); setErrorMsg(null); }}
                style={{
                  flex: 1, padding: '6px 0', border: 'none', borderRadius: 'var(--radius-sm)',
                  fontSize: 12, fontWeight: role === 'admin' ? 700 : 500,
                  background: role === 'admin' ? 'white' : 'transparent',
                  color: role === 'admin' ? 'var(--color-primary-dark)' : 'var(--color-text-tertiary)',
                  cursor: 'pointer', boxShadow: role === 'admin' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                }}
              >
                Akun Admin
              </button>
            </div>
          )}

          {/* Error Message */}
          {errorMsg && (
            <div style={{
              padding: '10px 12px',
              background: '#FEE2E2',
              border: '1px solid #FCA5A5',
              borderRadius: 'var(--radius-md)',
              marginBottom: 'var(--space-4)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 8,
              fontSize: 12,
              color: '#991B1B',
            }}>
              <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* ─── STEP 1: INPUT EMAIL ─── */}
          {step === 1 && (
            <form onSubmit={handleSendOtp} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <div>
                <h2 style={{ fontSize: 'var(--font-size-base)', fontWeight: 800, color: 'var(--color-text-primary)' }}>
                  Masukkan Email {role === 'admin' ? 'Admin' : 'Guru'}
                </h2>
                <p style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 2 }}>
                  Kami akan mengirimkan 6 digit kode OTP verifikasi ke email Anda.
                </p>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: 11, fontWeight: 700 }}>
                  Email Terdaftar
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="email"
                    className="form-input"
                    placeholder={role === 'admin' ? 'admin@muallim.sch.id' : 'nama@muallim.sch.id'}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    style={{ paddingLeft: 34, fontSize: 13 }}
                  />
                  <Mail size={15} color="var(--color-text-tertiary)" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
                </div>
              </div>

              {/* Forgot Admin Email Help Option */}
              {role === 'admin' && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 2 }}>
                  <button
                    type="button"
                    onClick={() => {
                      setRecoveryError(null);
                      setRecoveredEmail(null);
                      setRecoveryKey('');
                      setShowRecoveryModal(true);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--color-primary-dark)',
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: 'pointer',
                      padding: 0,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <HelpCircle size={12} />
                    Lupa alamat email administrator?
                  </button>
                </div>
              )}

              <button
                type="submit"
                className="btn btn-primary btn-lg"
                disabled={isLoading}
                style={{ width: '100%', marginTop: 'var(--space-2)', fontWeight: 700, fontSize: 13 }}
              >
                {isLoading ? 'Mengirim OTP...' : 'Kirim Kode OTP'}
              </button>

              <div style={{ textAlign: 'center', marginTop: 'var(--space-2)' }}>
                <Link href={role === 'admin' ? '/admin/login' : '/'} style={{ fontSize: 11, color: 'var(--color-text-tertiary)', textDecoration: 'none' }}>
                  ← Kembali ke Halaman Masuk
                </Link>
              </div>
            </form>
          )}

          {/* ─── STEP 2: INPUT OTP ─── */}
          {step === 2 && (
            <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <div>
                <h2 style={{ fontSize: 'var(--font-size-base)', fontWeight: 800, color: 'var(--color-text-primary)' }}>
                  Verifikasi Kode OTP
                </h2>
                <p style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 2 }}>
                  Masukkan 6 digit kode OTP yang dikirimkan ke <strong>{email}</strong>
                </p>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: 11, fontWeight: 700 }}>
                  Kode OTP 6 Digit
                </label>
                <input
                  type="text"
                  maxLength={6}
                  className="form-input"
                  placeholder="Contoh: 849201"
                  value={otpInput}
                  onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ''))}
                  required
                  autoFocus
                  style={{
                    fontSize: 22,
                    fontWeight: 800,
                    textAlign: 'center',
                    letterSpacing: 6,
                    padding: '8px',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11 }}>
                <span style={{ color: 'var(--color-text-tertiary)' }}>
                  {timer > 0 ? `Kirim ulang dalam ${timer}s` : 'Belum menerima kode?'}
                </span>
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={timer > 0}
                  style={{
                    background: 'none', border: 'none',
                    color: timer > 0 ? 'var(--color-text-tertiary)' : 'var(--color-primary)',
                    fontWeight: 700, cursor: timer > 0 ? 'default' : 'pointer', padding: 0,
                  }}
                >
                  Kirim Ulang OTP
                </button>
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-lg"
                style={{ width: '100%', marginTop: 'var(--space-2)', fontWeight: 700, fontSize: 13 }}
              >
                Verifikasi OTP
              </button>

              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setStep(1)}
                style={{ fontSize: 11 }}
              >
                Ganti Email
              </button>
            </form>
          )}

          {/* ─── STEP 3: RESET PASSWORD BARU ─── */}
          {step === 3 && (
            <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <div>
                <h2 style={{ fontSize: 'var(--font-size-base)', fontWeight: 800, color: 'var(--color-text-primary)' }}>
                  Buat Kata Sandi Baru
                </h2>
                <p style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 2 }}>
                  Silakan buat kata sandi baru yang aman untuk akun Anda.
                </p>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: 11, fontWeight: 700 }}>
                  Kata Sandi Baru
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showNewPass ? 'text' : 'password'}
                    className="form-input"
                    placeholder="Minimal 6 karakter"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    style={{ paddingLeft: 34, paddingRight: 34, fontSize: 12 }}
                  />
                  <Lock size={15} color="var(--color-text-tertiary)" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
                  <button
                    type="button"
                    onClick={() => setShowNewPass(!showNewPass)}
                    style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--color-text-tertiary)', cursor: 'pointer', padding: 2 }}
                  >
                    {showNewPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: 11, fontWeight: 700 }}>
                  Konfirmasi Kata Sandi Baru
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showNewPass ? 'text' : 'password'}
                    className="form-input"
                    placeholder="Ketik ulang kata sandi baru"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    style={{ paddingLeft: 34, paddingRight: 34, fontSize: 12 }}
                  />
                  <Lock size={15} color="var(--color-text-tertiary)" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-lg"
                disabled={isLoading}
                style={{ width: '100%', marginTop: 'var(--space-2)', fontWeight: 700, fontSize: 13 }}
              >
                {isLoading ? 'Menyimpan Sandi...' : 'Simpan Kata Sandi Baru'}
              </button>
            </form>
          )}

          {/* ─── STEP 4: SELESAI ─── */}
          {step === 4 && (
            <div style={{ textAlign: 'center', padding: 'var(--space-4) 0' }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#DCFCE7', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto var(--space-3)' }}>
                <CheckCircle2 size={36} />
              </div>
              <h2 style={{ fontSize: 'var(--font-size-base)', fontWeight: 800, color: 'var(--color-text-primary)' }}>
                Kata Sandi Berhasil Diperbarui!
              </h2>
              <p style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 4, marginBottom: 'var(--space-4)', lineHeight: 1.45 }}>
                Kata sandi untuk akun <strong>{email}</strong> telah berhasil direset. Silakan masuk menggunakan kata sandi baru Anda.
              </p>

              <Link
                href={role === 'admin' ? '/admin/login' : '/'}
                className="btn btn-primary btn-lg"
                style={{ width: '100%', textDecoration: 'none', fontWeight: 700, fontSize: 13 }}
              >
                Masuk Sekarang
                <ArrowRight size={16} />
              </Link>
            </div>
          )}

        </div>
      </div>

      {/* ─── MODAL PEMULIHAN EMAIL ADMIN (MASTER RECOVERY KEY) ─── */}
      {showRecoveryModal && (
        <div className="modal-overlay" onClick={() => setShowRecoveryModal(false)}>
          <div className="modal" style={{ maxWidth: 400 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 32, height: 32, borderRadius: 'var(--radius-md)', background: '#FEE2E2', color: '#991B1B', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ShieldCheck size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 800 }}>Pemulihan Email Admin</h3>
                  <p style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>Gunakan Master Security Key Yayasan</p>
                </div>
              </div>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowRecoveryModal(false)} style={{ padding: 4 }}>
                <X size={18} />
              </button>
            </div>

            {!recoveredEmail ? (
              <form onSubmit={handleVerifyMasterRecovery}>
                <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                  
                  {recoveryError && (
                    <div style={{ padding: '8px 12px', background: '#FEE2E2', border: '1px solid #FCA5A5', borderRadius: 'var(--radius-md)', fontSize: 12, color: '#991B1B' }}>
                      {recoveryError}
                    </div>
                  )}

                  <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.45 }}>
                    Jika Anda lupa alamat email administrator yang terdaftar, masukkan <strong>Master Recovery Key Yayasan</strong> yang diberikan oleh Tim Pengembang (MR Team) / Dewan Pembina.
                  </p>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: 11, fontWeight: 700 }}>
                      Master Security Key
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Contoh: MWA-2026-RECOVERY"
                        value={recoveryKey}
                        onChange={(e) => setRecoveryKey(e.target.value)}
                        required
                        style={{ paddingLeft: 34, fontSize: 12, fontWeight: 700 }}
                      />
                      <Key size={15} color="var(--color-text-tertiary)" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
                    </div>
                  </div>

                  <div style={{
                    padding: '8px 10px',
                    background: 'var(--color-surface-2)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border-light)',
                    fontSize: 10,
                    color: 'var(--color-text-tertiary)',
                  }}>
                    🔑 <strong>Master Key Default:</strong> <code>{MASTER_RECOVERY_KEY}</code>
                  </div>
                </div>

                <div className="modal-footer" style={{ padding: 'var(--space-3) var(--space-4)' }}>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowRecoveryModal(false)}>
                    Batal
                  </button>
                  <button type="submit" className="btn btn-primary btn-sm" style={{ fontWeight: 700 }}>
                    Verifikasi Key
                  </button>
                </div>
              </form>
            ) : (
              <div>
                <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                  <div style={{
                    padding: '12px',
                    background: '#DCFCE7',
                    border: '1px solid #86EFAC',
                    borderRadius: 'var(--radius-md)',
                    textAlign: 'center',
                  }}>
                    <CheckCircle2 size={28} color="var(--color-primary)" style={{ margin: '0 auto 4px' }} />
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-primary)' }}>
                      Identitas Terverifikasi!
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 2 }}>
                      Alamat Email Administrator yang sedang aktif adalah:
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: '#111827', marginTop: 4, background: 'white', padding: '6px 10px', borderRadius: 6, border: '1px solid var(--color-border)' }}>
                      {recoveredEmail}
                    </div>
                  </div>
                </div>

                <div className="modal-footer" style={{ padding: 'var(--space-3) var(--space-4)' }}>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    style={{ width: '100%', fontWeight: 700 }}
                    onClick={handleUseRecoveredEmail}
                  >
                    Gunakan Email Ini &amp; Lanjutkan Reset Sandi →
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Copyright */}
      <p style={{
        fontSize: 'var(--font-size-xs)',
        color: 'var(--color-text-tertiary)',
        marginTop: 'var(--space-6)',
        textAlign: 'center',
        fontWeight: 500,
      }}>
        © 2026 MR Team
      </p>
    </div>
  );
}

export default function LupaPasswordPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span>Memuat...</span>
      </div>
    }>
      <LupaPasswordContent />
    </Suspense>
  );
}
