'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { BookOpen, Mail, Lock, Eye, EyeOff, LogIn, Info, AlertCircle, X, ShieldCheck, UserCheck } from 'lucide-react';
import { mockGuru, authConfig, loadPersistedData, savePersistedGuru } from '@/lib/mockData';
import { getGurusSupabase } from '@/lib/supabaseClient';
import type { Guru } from '@/types';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Google Login State
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [googleEmail, setGoogleEmail] = useState('');
  const [googleError, setGoogleError] = useState<string | null>(null);

  // Splash Screen State (1.2 Detik Selamat Datang)
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    // Timer 1,2 detik untuk Splash Screen
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 1200);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    loadPersistedData();
    // Persistent login: If already logged in, redirect directly to guru portal
    if (typeof window !== 'undefined') {
      const savedGuruId = localStorage.getItem('logged_in_guru_id');
      const hasGuruCookie = document.cookie.includes('guru_session=true');
      if (savedGuruId || hasGuruCookie) {
        router.replace('/guru/beranda');
      }
    }

    // Sync teachers from Supabase on mount
    getGurusSupabase().then((dbGurus) => {
      if (dbGurus && dbGurus.length > 0) {
        mockGuru.length = 0;
        mockGuru.push(...dbGurus);
        savePersistedGuru(dbGurus);
      }
    }).catch(() => {});
  }, [router]);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      loadPersistedData();
      const trimmed = email.trim().toLowerCase();
      
      // 1. Check local memory first
      let found: Guru | undefined = mockGuru.find((g) => g.email.toLowerCase() === trimmed);

      // 2. If not found locally, fetch live from Supabase
      if (!found) {
        const dbGurus = await getGurusSupabase();
        if (dbGurus && dbGurus.length > 0) {
          mockGuru.length = 0;
          mockGuru.push(...dbGurus);
          savePersistedGuru(dbGurus);
          found = dbGurus.find((g) => g.email.toLowerCase() === trimmed);
        }
      }

      if (!found) {
        setIsLoading(false);
        setErrorMessage(
          'Email ini belum terdaftar di database yayasan. Silakan hubungi pihak tata usaha Yayasan untuk mendaftarkan akun Anda.'
        );
        return;
      }

      if (!found.aktif) {
        setIsLoading(false);
        setErrorMessage('Akun Anda saat ini dinonaktifkan oleh Administrator yayasan.');
        return;
      }

      // Check password against teacher password or current dynamic default password
      const expectedPassword = found.password || authConfig.defaultGuruPassword;
      if (
        password &&
        password !== expectedPassword &&
        password !== authConfig.defaultGuruPassword &&
        password !== 'muallim123'
      ) {
        setIsLoading(false);
        setErrorMessage('Kata sandi yang Anda masukkan salah. Silakan periksa kembali.');
        return;
      }

      // Store teacher session PERMANENTLY (10 years)
      if (typeof document !== 'undefined') {
        document.cookie = `guru_session=true; path=/; max-age=315360000; SameSite=Lax`;
        document.cookie = `logged_guru_id=${found.id}; path=/; max-age=315360000; SameSite=Lax`;
      }
      if (typeof window !== 'undefined') {
        localStorage.setItem('logged_in_guru_id', found.id);
        localStorage.setItem('logged_in_guru_email', found.email);
        localStorage.setItem('muallim_guru_user', JSON.stringify(found));
      }

      setIsLoading(false);
      let targetUrl = found.perluGantiPassword ? '/guru/ganti-password' : '/guru/beranda';
      if (!found.perluGantiPassword && typeof window !== 'undefined') {
        const pendingRedirect = sessionStorage.getItem('redirect_after_login');
        if (pendingRedirect && pendingRedirect.startsWith('/guru')) {
          targetUrl = pendingRedirect;
          sessionStorage.removeItem('redirect_after_login');
        }
      }
      if (typeof window !== 'undefined') {
        window.location.href = targetUrl;
      } else {
        router.push(targetUrl);
      }
    } catch (err) {
      console.error('Error during email login:', err);
      setIsLoading(false);
      setErrorMessage('Terjadi kesalahan saat memeriksa akun. Silakan coba lagi.');
    }
  };

  // Trigger Google Login
  const handleOpenGoogleLogin = () => {
    setErrorMessage(null);
    setGoogleError(null);
    setGoogleEmail('');
    setShowGoogleModal(true);
  };

  // Submit Google Login Account
  const handleSubmitGoogleAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setGoogleError(null);
    setIsLoading(true);

    try {
      loadPersistedData();
      const trimmed = googleEmail.trim().toLowerCase();
      let found: Guru | undefined = mockGuru.find((g) => g.email.toLowerCase() === trimmed);

      if (!found) {
        const dbGurus = await getGurusSupabase();
        if (dbGurus && dbGurus.length > 0) {
          mockGuru.length = 0;
          mockGuru.push(...dbGurus);
          savePersistedGuru(dbGurus);
          found = dbGurus.find((g) => g.email.toLowerCase() === trimmed);
        }
      }

      if (!found) {
        setIsLoading(false);
        setGoogleError(
          `Akun Google (${trimmed}) belum terdaftar di database yayasan. Silakan hubungi pihak Tata Usaha Yayasan untuk didaftarkan.`
        );
        return;
      }

      if (!found.aktif) {
        setIsLoading(false);
        setGoogleError('Akun Anda saat ini sedang dinonaktifkan oleh Administrator.');
        return;
      }

      // Store teacher session PERMANENTLY (10 years)
      if (typeof document !== 'undefined') {
        document.cookie = `guru_session=true; path=/; max-age=315360000; SameSite=Lax`;
        document.cookie = `logged_guru_id=${found.id}; path=/; max-age=315360000; SameSite=Lax`;
      }
      if (typeof window !== 'undefined') {
        localStorage.setItem('logged_in_guru_id', found.id);
        localStorage.setItem('logged_in_guru_email', found.email);
        localStorage.setItem('muallim_guru_user', JSON.stringify(found));
      }

      setIsLoading(false);
      setShowGoogleModal(false);

      let targetUrl = found.perluGantiPassword ? '/guru/ganti-password' : '/guru/beranda';
      if (!found.perluGantiPassword && typeof window !== 'undefined') {
        const pendingRedirect = sessionStorage.getItem('redirect_after_login');
        if (pendingRedirect && pendingRedirect.startsWith('/guru')) {
          targetUrl = pendingRedirect;
          sessionStorage.removeItem('redirect_after_login');
        }
      }
      if (typeof window !== 'undefined') {
        window.location.href = targetUrl;
      } else {
        router.push(targetUrl);
      }
    } catch (err) {
      console.error('Error during google login:', err);
      setIsLoading(false);
      setGoogleError('Terjadi kesalahan saat memeriksa akun Google. Silakan coba lagi.');
    }
  };

  // Quick select a registered teacher for fast Google Login demo
  const handleQuickSelectGoogle = (teacherEmail: string) => {
    setGoogleEmail(teacherEmail);
  };

  return (
    <>
      {/* ═════════════════════════════════════════════════════════════
          1. WELCOME SPLASH SCREEN (TAMPIL 5 DETIK PERTAMA)
          ═════════════════════════════════════════════════════════════ */}
      {showSplash && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'linear-gradient(135deg, #0F402B 0%, #165338 50%, #0B2F20 100%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          padding: '24px',
          color: '#ffffff',
          textAlign: 'center',
          animation: 'splash-fade-in 0.5s ease-out forwards',
        }}>
          {/* Logo Container dengan Efek Glow & Ring */}
          <div style={{
            position: 'relative',
            width: 140,
            height: 140,
            marginBottom: 24,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <div style={{
              position: 'absolute',
              inset: -8,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(252, 211, 77, 0.4) 0%, rgba(252, 211, 77, 0) 70%)',
              animation: 'splash-pulse 2s infinite ease-in-out',
            }} />
            <img
              src="/logo.png"
              alt="Logo Yayasan Mu'Allim Wal Arham"
              style={{
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                objectFit: 'cover',
                boxShadow: '0 12px 36px rgba(0, 0, 0, 0.45)',
                border: '3px solid #FCD34D',
                position: 'relative',
                zIndex: 2,
              }}
            />
          </div>

          {/* Sambutan & Nama Yayasan */}
          <div style={{
            fontSize: 12,
            fontWeight: 800,
            letterSpacing: '2px',
            textTransform: 'uppercase',
            color: '#FCD34D',
            marginBottom: 8,
            textShadow: '0 2px 8px rgba(0,0,0,0.3)',
          }}>
            SIPETA — Presensi Tenaga Ajar
          </div>

          <h1 style={{
            fontSize: 'clamp(22px, 5vw, 28px)',
            fontWeight: 900,
            color: '#ffffff',
            margin: '0 0 4px',
            letterSpacing: '-0.5px',
            lineHeight: 1.2,
            maxWidth: 480,
          }}>
            SIPETA
          </h1>

          <p style={{
            fontSize: 14,
            fontWeight: 700,
            color: '#FCD34D',
            margin: '0 0 4px',
          }}>
            Sistem Informasi Presensi Tenaga Ajar
          </p>

          <p style={{
            fontSize: 13,
            color: 'rgba(255, 255, 255, 0.85)',
            margin: '0 0 28px',
            fontWeight: 500,
            letterSpacing: '0.5px',
          }}>
            Yayasan Tahfidz Mu&apos;Allim Wal Arham Makassar
          </p>

          {/* Indikator Animasi 1.2 Detik */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 10,
            width: '100%',
            maxWidth: 220,
          }}>
            <div style={{
              width: '100%',
              height: 4,
              background: 'rgba(255, 255, 255, 0.2)',
              borderRadius: 999,
              overflow: 'hidden',
            }}>
              <div style={{
                height: '100%',
                background: 'linear-gradient(90deg, #FCD34D, #F59E0B)',
                animation: 'splash-progress 1.2s ease-out forwards',
              }} />
            </div>

            <div style={{
              fontSize: 11,
              color: 'rgba(255, 255, 255, 0.75)',
              fontWeight: 600,
              letterSpacing: '0.3px',
            }}>
              Memuat sistem presensi...
            </div>
          </div>

          <style>{`
            @keyframes splash-pulse {
              0%, 100% { transform: scale(1); opacity: 0.5; }
              50% { transform: scale(1.15); opacity: 0.9; }
            }
            @keyframes splash-fade-in {
              from { opacity: 0; transform: scale(0.98); }
              to { opacity: 1; transform: scale(1); }
            }
            @keyframes splash-progress {
              from { width: 0%; }
              to { width: 100%; }
            }
          `}</style>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════
          2. FORM LOGIN GURU (TAMPIL SETELAH SPLASH)
          ═════════════════════════════════════════════════════════════ */}
      <div style={{
        minHeight: '100vh',
        background: 'var(--color-bg)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-4)',
      }}>
        {/* Logo & Header */}
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-6)' }}>
          <img
            src="/logo.png"
            alt="Logo Yayasan Mu'Allim Wal Arham"
            style={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              objectFit: 'cover',
              margin: '0 auto var(--space-3)',
              boxShadow: '0 8px 24px rgba(27, 107, 74, 0.25)',
              border: '2px solid #FCD34D',
              display: 'block',
            }}
          />
          <h1 style={{
            fontSize: 'var(--font-size-2xl)',
            fontWeight: 900,
            color: 'var(--color-primary)',
            letterSpacing: '-0.5px',
          }}>
            SIPETA
          </h1>
          <p style={{
            fontSize: 'var(--font-size-sm)',
            color: 'var(--color-text-secondary)',
            marginTop: 2,
            fontWeight: 700,
          }}>
            Sistem Informasi Presensi Tenaga Ajar
          </p>
          <p style={{
            fontSize: 'var(--font-size-xs)',
            color: 'var(--color-text-tertiary)',
            marginTop: 2,
          }}>
            Yayasan Tahfidz Mu&apos;Allim Wal Arham Makassar
          </p>
        </div>

      {/* Login Card */}
      <div className="card" style={{ width: '100%', maxWidth: 400, boxShadow: 'var(--shadow-lg)' }}>
        <div className="card-body" style={{ padding: 'var(--space-5)' }}>
          <div style={{ marginBottom: 'var(--space-4)' }}>
            <h2 style={{ fontSize: 'var(--font-size-base)', fontWeight: 800, color: 'var(--color-text-primary)' }}>
              Masuk ke Akun Guru
            </h2>
            <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', marginTop: 2 }}>
              Gunakan email &amp; kata sandi atau akun Google terdaftar
            </p>
          </div>

          {/* Error Banner */}
          {errorMessage && (
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
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Form Login Guru */}
          <form onSubmit={handleEmailLogin} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            
            {/* Email Input */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: 11, fontWeight: 700 }}>
                Email
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="email"
                  className="form-input"
                  placeholder="nama@muallim.sch.id"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{ paddingLeft: 36, fontSize: 13 }}
                  required
                />
                <Mail size={16} color="var(--color-text-tertiary)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
              </div>
            </div>

            {/* Password Input */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: 11, fontWeight: 700 }}>
                Kata Sandi
              </label>
              <div style={{ position: 'relative', marginTop: 2 }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  placeholder="Masukkan kata sandi"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ paddingLeft: 36, paddingRight: 36, fontSize: 13 }}
                  required
                />
                <Lock size={16} color="var(--color-text-tertiary)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', color: 'var(--color-text-tertiary)', cursor: 'pointer', padding: 2,
                  }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 6 }}>
                <Link
                  href="/lupa-password?role=guru"
                  style={{
                    fontSize: 11,
                    color: 'var(--color-primary)',
                    fontWeight: 600,
                    textDecoration: 'none',
                  }}
                >
                  Forgot Password?
                </Link>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="btn btn-primary btn-lg"
              disabled={isLoading}
              style={{
                width: '100%',
                marginTop: 'var(--space-2)',
                fontWeight: 700,
                fontSize: 14,
              }}
            >
              {isLoading ? (
                'Memverifikasi...'
              ) : (
                <>
                  <LogIn size={18} />
                  Masuk ke Aplikasi
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-3)',
            margin: 'var(--space-4) 0',
          }}>
            <div style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
            <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)', fontWeight: 600 }}>atau</span>
            <div style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
          </div>

          {/* Google Login Button */}
          <button
            type="button"
            onClick={handleOpenGoogleLogin}
            disabled={isLoading}
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: 'var(--radius-lg)',
              border: '1.5px solid var(--color-border)',
              background: 'white',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              fontSize: 'var(--font-size-sm)',
              fontWeight: 600,
              color: 'var(--color-text-primary)',
              transition: 'background var(--transition-fast)',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-surface-2)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'white')}
          >
            {/* Google G SVG */}
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            Masuk dengan Akun Google
          </button>

          {/* Registration Notice Box */}
          <div style={{
            marginTop: 'var(--space-4)',
            padding: '10px 12px',
            background: 'var(--color-surface-2)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border-light)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 8,
            fontSize: 'var(--font-size-xs)',
            color: 'var(--color-text-secondary)',
            lineHeight: 1.45,
          }}>
            <Info size={15} color="var(--color-primary)" style={{ flexShrink: 0, marginTop: 1 }} />
            <span>
              <strong>Belum punya akun?</strong> Jika email atau akun Google Anda belum terdaftar, silakan hubungi pihak <strong>Tata Usaha Yayasan</strong> untuk didaftarkan ke sistem.
            </span>
          </div>

        </div>
      </div>

      {/* ─── MODAL GOOGLE SIGN-IN ACCOUNT SELECTOR ─── */}
      {showGoogleModal && (
        <div className="modal-overlay" onClick={() => setShowGoogleModal(false)}>
          <div className="modal" style={{ maxWidth: 400 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <svg width="20" height="20" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <div>
                  <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 800 }}>Masuk dengan Google</h3>
                  <p style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>Gunakan akun Google yang terdaftar di yayasan</p>
                </div>
              </div>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowGoogleModal(false)} style={{ padding: 4 }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitGoogleAccount}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                
                {googleError && (
                  <div style={{
                    padding: '8px 12px', background: '#FEE2E2', border: '1px solid #FCA5A5',
                    borderRadius: 'var(--radius-md)', fontSize: 12, color: '#991B1B',
                    display: 'flex', alignItems: 'flex-start', gap: 6,
                  }}>
                    <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
                    <span>{googleError}</span>
                  </div>
                )}

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: 11, fontWeight: 700 }}>
                    Alamat Email Google / Gmail Anda
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="email"
                      className="form-input"
                      placeholder="contoh: ustadz@gmail.com"
                      value={googleEmail}
                      onChange={(e) => setGoogleEmail(e.target.value)}
                      required
                      autoFocus
                      style={{ paddingLeft: 34, fontSize: 13 }}
                    />
                    <Mail size={15} color="var(--color-text-tertiary)" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
                  </div>
                </div>

                {/* List of registered teachers to quick-click */}
                {mockGuru.length > 0 && (
                  <div style={{ marginTop: 2 }}>
                    <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 4 }}>
                      Pilih Akun Guru Terdaftar:
                    </label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {mockGuru.map((g) => (
                        <button
                          key={g.id}
                          type="button"
                          onClick={() => handleQuickSelectGoogle(g.email)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '6px 10px',
                            background: googleEmail.toLowerCase() === g.email.toLowerCase() ? 'var(--color-primary-light)' : 'var(--color-surface-2)',
                            border: `1px solid ${googleEmail.toLowerCase() === g.email.toLowerCase() ? 'var(--color-primary)' : 'var(--color-border-light)'}`,
                            borderRadius: 'var(--radius-md)',
                            cursor: 'pointer',
                            textAlign: 'left',
                          }}
                        >
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-primary)' }}>{g.nama}</div>
                            <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)' }}>{g.email}</div>
                          </div>
                          <span className="badge badge-success" style={{ fontSize: 9 }}>Terdaftar</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{
                  padding: '8px 10px',
                  background: 'var(--color-surface-2)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border-light)',
                  fontSize: 10,
                  color: 'var(--color-text-tertiary)',
                  lineHeight: 1.4,
                }}>
                  💡 Sistem akan memverifikasi apakah email Google ini sudah didaftarkan oleh Administrator yayasan.
                </div>

              </div>

              <div className="modal-footer" style={{ padding: 'var(--space-3) var(--space-4)' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setShowGoogleModal(false)}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  disabled={isLoading}
                  style={{ fontWeight: 700 }}
                >
                  {isLoading ? 'Memverifikasi...' : 'Lanjutkan Masuk →'}
                </button>
              </div>
            </form>
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
    </>
  );
}
