'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Lock, Eye, EyeOff, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';
import { currentGuru, getLoggedInGuru } from '@/lib/mockData';

export default function GantiPasswordWajibPage() {
  const router = useRouter();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const guru = getLoggedInGuru();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (newPassword.length < 6) {
      setErrorMessage('Kata sandi baru minimal 6 karakter.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('Konfirmasi kata sandi tidak cocok. Pastikan kedua kata sandi sama.');
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      // Update teacher state
      guru.password = newPassword;
      guru.perluGantiPassword = false;

      setIsLoading(false);
      setSuccess(true);

      setTimeout(() => {
        router.push('/guru/beranda');
      }, 1500);
    }, 600);
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
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 'var(--space-5)' }}>
        <div style={{
          width: 56,
          height: 56,
          background: 'var(--color-primary-light)',
          color: 'var(--color-primary)',
          borderRadius: 'var(--radius-xl)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto var(--space-3)',
          border: '2px solid rgba(27,107,74,0.2)',
        }}>
          <ShieldCheck size={28} />
        </div>
        <h1 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 800, color: 'var(--color-text-primary)' }}>
          Wajib Perbarui Kata Sandi
        </h1>
        <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', marginTop: 2 }}>
          Langkah pertama aktivasi akun guru baru
        </p>
      </div>

      {/* Card */}
      <div className="card" style={{ width: '100%', maxWidth: 420, boxShadow: 'var(--shadow-lg)' }}>
        <div className="card-body" style={{ padding: 'var(--space-5)' }}>
          
          {/* Welcome Greeting */}
          <div style={{
            padding: '10px 12px',
            background: 'var(--color-primary-light)',
            borderRadius: 'var(--radius-md)',
            marginBottom: 'var(--space-4)',
            border: '1px solid rgba(27,107,74,0.2)',
            fontSize: 12,
            color: 'var(--color-text-secondary)',
            lineHeight: 1.45,
          }}>
            <p style={{ fontWeight: 700, color: 'var(--color-primary)', marginBottom: 2 }}>
              Ahlan wa Sahlan, {guru.nama.split(',')[0]}!
            </p>
            <p>
              Ini adalah kali pertama Anda masuk. Demi keamanan akun, silakan buat kata sandi baru pribadi Anda sebelum melanjutkan ke aplikasi.
            </p>
          </div>

          {/* Success Message */}
          {success && (
            <div style={{
              padding: '14px',
              background: '#DCFCE7',
              border: '1px solid #86EFAC',
              borderRadius: 'var(--radius-md)',
              marginBottom: 'var(--space-4)',
              textAlign: 'center',
            }}>
              <CheckCircle2 size={32} color="var(--color-primary)" style={{ margin: '0 auto 6px' }} />
              <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--color-primary)' }}>
                Kata Sandi Berhasil Diperbarui!
              </div>
              <p style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 2 }}>
                Mengarahkan Anda ke Beranda Guru...
              </p>
            </div>
          )}

          {/* Error Message */}
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

          {!success && (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              
              {/* Kata Sandi Baru */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: 11, fontWeight: 700 }}>
                  Kata Sandi Baru *
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showNew ? 'text' : 'password'}
                    className="form-input"
                    placeholder="Minimal 6 karakter"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    style={{ paddingLeft: 34, paddingRight: 34, fontSize: 13 }}
                    required
                  />
                  <Lock size={15} color="var(--color-text-tertiary)" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--color-text-tertiary)', cursor: 'pointer', padding: 2 }}
                  >
                    {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {/* Konfirmasi Kata Sandi Baru */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: 11, fontWeight: 700 }}>
                  Konfirmasi Kata Sandi Baru *
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    className="form-input"
                    placeholder="Ketik ulang kata sandi baru"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    style={{ paddingLeft: 34, paddingRight: 34, fontSize: 13 }}
                    required
                  />
                  <Lock size={15} color="var(--color-text-tertiary)" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--color-text-tertiary)', cursor: 'pointer', padding: 2 }}
                  >
                    {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
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
                  'Menyimpan Sandi...'
                ) : (
                  <>
                    Simpan &amp; Lanjutkan ke Aplikasi
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>
          )}

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
