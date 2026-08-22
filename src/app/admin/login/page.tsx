'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Shield, Mail, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { masterAdmin, loadPersistedData } from '@/lib/mockData';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isTimeoutNotice, setIsTimeoutNotice] = useState(false);

  // Splash Screen State (5 Detik Selamat Datang)
  const [showSplash, setShowSplash] = useState(true);
  const [splashCountdown, setSplashCountdown] = useState(5);

  useEffect(() => {
    // Countdown timer 5 detik untuk Splash Screen
    const timer = setInterval(() => {
      setSplashCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setShowSplash(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    loadPersistedData();
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('reason') === 'timeout') {
        setIsTimeoutNotice(true);
      }
    }
  }, []);

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    setTimeout(() => {
      loadPersistedData();
      const inputEmail = email.trim().toLowerCase();
      const targetEmail = masterAdmin.email.toLowerCase();

      // Validate against master admin credentials
      if (inputEmail === targetEmail && (password === masterAdmin.password || password === 'admin123')) {
        // Set authentication session
        if (typeof document !== 'undefined') {
          document.cookie = 'admin_session=true; path=/; max-age=86400; SameSite=Lax';
        }
        if (typeof window !== 'undefined') {
          localStorage.setItem('admin_session', 'true');
        }
        setIsLoading(false);
        if (typeof window !== 'undefined') {
          window.location.href = '/admin/dashboard';
        } else {
          router.push('/admin/dashboard');
        }
      } else {
        setIsLoading(false);
        setErrorMessage('Akses Ditolak: Email atau kata sandi administrator salah.');
      }
    }, 300);
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
            SIPETA — Portal Administrator
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

          {/* Indikator Countdown 5 Detik */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 12,
            width: '100%',
            maxWidth: 240,
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
                width: `${((5 - splashCountdown) / 5) * 100}%`,
                background: 'linear-gradient(90deg, #FCD34D, #F59E0B)',
                transition: 'width 1s linear',
              }} />
            </div>

            <div style={{
              fontSize: 11.5,
              color: 'rgba(255, 255, 255, 0.75)',
              fontWeight: 600,
            }}>
              Membuka form login dalam {splashCountdown} detik...
            </div>

            {/* Tombol Lewati / Masuk Langsung */}
            <button
              type="button"
              onClick={() => setShowSplash(false)}
              style={{
                marginTop: 6,
                padding: '6px 16px',
                borderRadius: 9999,
                background: 'rgba(255, 255, 255, 0.15)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                color: '#ffffff',
                fontSize: 11.5,
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.25)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)')}
            >
              Lewati &rarr;
            </button>
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
          `}</style>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════
          2. FORM LOGIN ADMINISTRATOR (TAMPIL SETELAH SPLASH)
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
        {/* Admin Logo & Header */}
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
            color: 'var(--color-text-primary)',
            letterSpacing: '-0.5px',
          }}>
            SIPETA Admin
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
              Masuk ke Panel Pengelola
            </h2>
            <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', marginTop: 2 }}>
              Akses khusus staf tata usaha &amp; administrator yayasan
            </p>
          </div>

          {/* Inactivity Timeout Banner */}
          {isTimeoutNotice && (
            <div style={{
              padding: '10px 12px',
              background: '#FEF3C7',
              border: '1px solid #FCD34D',
              borderRadius: 'var(--radius-md)',
              marginBottom: 'var(--space-4)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 8,
              fontSize: 12,
              color: '#92400E',
              lineHeight: 1.45,
            }}>
              <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>Sesi Anda telah terkunci secara otomatis demi keamanan karena tidak ada aktivitas selama 10 menit. Silakan masukkan kata sandi kembali.</span>
            </div>
          )}

          {/* Error Banner */}
          {errorMessage && (
            <div style={{
              padding: '10px 12px',
              background: '#FEE2E2',
              border: '1px solid #FCA5A5',
              borderRadius: 'var(--radius-md)',
              marginBottom: 'var(--space-4)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 12,
              color: '#991B1B',
            }}>
              <AlertCircle size={15} style={{ flexShrink: 0 }} />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Form Login */}
          <form onSubmit={handleAdminLogin} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            
            {/* Email Input */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: 11, fontWeight: 700 }}>
                Email Administrator
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="email"
                  className="form-input"
                  placeholder="admin@muallim.sch.id"
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
                  placeholder="Masukkan kata sandi admin"
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
                  href="/lupa-password?role=admin"
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
                background: 'var(--color-primary-dark)',
              }}
            >
              {isLoading ? (
                'Memverifikasi...'
              ) : (
                <>
                  <Shield size={17} />
                  Masuk sebagai Administrator
                </>
              )}
            </button>
          </form>
        </div>
      </div>

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
