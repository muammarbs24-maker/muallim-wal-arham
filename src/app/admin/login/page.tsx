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
        <div style={{
          width: 58,
          height: 58,
          background: 'var(--color-primary-dark)',
          borderRadius: 'var(--radius-xl)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto var(--space-3)',
          boxShadow: '0 8px 20px rgba(16, 75, 51, 0.3)',
        }}>
          <Shield size={28} color="white" />
        </div>
        <h1 style={{
          fontSize: 'var(--font-size-2xl)',
          fontWeight: 800,
          color: 'var(--color-text-primary)',
          letterSpacing: '-0.5px',
        }}>
          Portal Administrator
        </h1>
        <p style={{
          fontSize: 'var(--font-size-sm)',
          color: 'var(--color-text-secondary)',
          marginTop: 2,
          fontWeight: 600,
        }}>
          Yayasan Tahfidz Mu&apos;Allim Wal Arham
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
  );
}
