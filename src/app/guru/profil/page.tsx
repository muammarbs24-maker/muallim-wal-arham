'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  User, Phone, Mail, MapPin, Shield, Briefcase, Edit3,
  Camera, ChevronRight, LogOut, Lock, Info
} from 'lucide-react';
import { currentGuru, mockGuru, loadPersistedData } from '@/lib/mockData';
import type { Guru } from '@/types';
import { getInitials } from '@/lib/utils';

export default function ProfilPage() {
  const router = useRouter();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [guruData, setGuruData] = useState<Guru>(currentGuru);

  useEffect(() => {
    loadPersistedData();
    if (typeof window !== 'undefined') {
      const savedId = localStorage.getItem('logged_in_guru_id');
      if (savedId) {
        const found = mockGuru.find((g) => g.id === savedId);
        if (found) setGuruData(found);
      }
    }
  }, []);

  const statusLabel: Record<string, string> = {
    tetap: 'Tetap', honorer: 'Honorer', magang: 'Magang',
  };

  const handleConfirmLogout = () => {
    if (typeof document !== 'undefined') {
      document.cookie = 'guru_session=; path=/; max-age=0; SameSite=Lax';
      document.cookie = 'logged_guru_id=; path=/; max-age=0; SameSite=Lax';
    }
    if (typeof window !== 'undefined') {
      localStorage.removeItem('logged_in_guru_id');
      localStorage.removeItem('logged_in_guru_email');
      localStorage.removeItem('muallim_guru_user');
      sessionStorage.clear();
      window.location.href = '/';
    } else {
      router.push('/');
    }
  };

  return (
    <>
      {/* Logout Modal */}
      {showLogoutModal && (
        <div className="modal-overlay" onClick={() => setShowLogoutModal(false)}>
          <div className="modal" style={{ maxWidth: 320 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 700 }}>Keluar dari Aplikasi?</h3>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                Anda akan keluar dari akun ini. Pastikan Anda sudah melakukan absen terlebih dahulu.
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost btn-sm" onClick={() => setShowLogoutModal(false)}>Batal</button>
              <button className="btn btn-danger btn-sm" onClick={handleConfirmLogout}>Keluar</button>
            </div>
          </div>
        </div>
      )}

      {/* Profile Hero */}
      <div style={{ background: 'var(--color-primary)', padding: 'var(--space-8) var(--space-5) var(--space-10)', textAlign: 'center' }}>
        <div style={{ position: 'relative', display: 'inline-block', marginBottom: 'var(--space-4)' }}>
          <div className="avatar avatar-2xl" style={{ margin: '0 auto', border: '3px solid rgba(255,255,255,0.3)' }}>
            {getInitials(guruData.nama)}
          </div>
          <button style={{
            position: 'absolute', bottom: 0, right: 0,
            width: 28, height: 28, borderRadius: '50%',
            background: 'white', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: 'var(--shadow-md)',
          }}>
            <Camera size={14} color="var(--color-primary)" />
          </button>
        </div>
        <h1 style={{ color: 'white', fontSize: 'var(--font-size-xl)', fontWeight: 800 }}>{guruData.nama}</h1>
        <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 'var(--font-size-sm)', marginTop: 4 }}>{guruData.jabatan}</p>
        <span style={{
          display: 'inline-flex', alignItems: 'center',
          background: 'rgba(255,255,255,0.15)',
          color: 'white', padding: '4px 12px',
          borderRadius: 'var(--radius-full)', fontSize: 'var(--font-size-xs)', fontWeight: 600,
          marginTop: 'var(--space-2)',
        }}>
          {guruData.nip}
        </span>
      </div>

      <div style={{ padding: 'var(--space-4)', marginTop: '-24px', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>

        {/* Info Card */}
        <div className="card">
          <div className="card-header">
            <span style={{ fontWeight: 700, fontSize: 'var(--font-size-sm)' }}>Informasi Pribadi</span>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => router.push('/guru/profil/edit')}
            >
              <Edit3 size={13} /> Edit
            </button>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            <InfoRow icon={<Phone size={15} />} label="Nomor Telepon" value={guruData.telepon} />
            <InfoRow icon={<Mail size={15} />} label="Email" value={guruData.email} />
            <InfoRow icon={<MapPin size={15} />} label="Alamat" value={guruData.alamat} last />
          </div>
        </div>

        {/* Status Card */}
        <div className="card">
          <div className="card-header">
            <span style={{ fontWeight: 700, fontSize: 'var(--font-size-sm)' }}>Status Kepegawaian</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>
              <Lock size={11} /> Tidak dapat diubah sendiri
            </div>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            <InfoRow icon={<Briefcase size={15} />} label="Jabatan" value={guruData.jabatan} />
            <InfoRow icon={<Shield size={15} />} label="Status" value={statusLabel[guruData.statusKepegawaian]} />
            <InfoRow icon={<User size={15} />} label="Peran" value="Guru" last />
          </div>
        </div>

        {/* Edit Actions */}
        <div className="card">
          <div className="card-body" style={{ padding: 0 }}>
            <ActionRow
              icon={<Edit3 size={16} />}
              label="Edit Profil"
              desc="Ubah foto, telepon, email, atau alamat"
              onClick={() => router.push('/guru/profil/edit')}
            />
            <ActionRow
              icon={<Lock size={16} />}
              label="Ganti Kata Sandi"
              desc="Perbarui kata sandi akun Anda"
              onClick={() => {}}
              last
            />
          </div>
        </div>

        {/* Logout */}
        <button
          className="btn btn-outline"
          style={{
            width: '100%', borderColor: 'var(--color-danger)',
            color: 'var(--color-danger)', marginTop: 'var(--space-2)',
          }}
          onClick={() => setShowLogoutModal(true)}
        >
          <LogOut size={16} /> Keluar dari Aplikasi
        </button>

        <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', textAlign: 'center', paddingBottom: 'var(--space-4)' }}>
          Bergabung sejak {new Date(guruData.tanggalGabung).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>
    </>
  );
}

function InfoRow({ icon, label, value, last = false }: { icon: React.ReactNode; label: string; value: string; last?: boolean }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)',
      padding: 'var(--space-4) var(--space-5)',
      borderBottom: last ? 'none' : '1px solid var(--color-border-light)',
    }}>
      <div style={{ color: 'var(--color-text-tertiary)', marginTop: 2, flexShrink: 0 }}>{icon}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--color-text-primary)' }}>{value}</div>
      </div>
    </div>
  );
}

function ActionRow({ icon, label, desc, onClick, last = false }: { icon: React.ReactNode; label: string; desc: string; onClick: () => void; last?: boolean }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
        padding: 'var(--space-4) var(--space-5)', width: '100%', textAlign: 'left',
        borderBottom: last ? 'none' : '1px solid var(--color-border-light)',
        background: 'none', border: 'none', cursor: 'pointer',
        transition: 'background var(--transition-fast)',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-surface-2)')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
    >
      <div style={{ color: 'var(--color-primary)', flexShrink: 0 }}>{icon}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>{label}</div>
        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', marginTop: 1 }}>{desc}</div>
      </div>
      <ChevronRight size={16} color="var(--color-text-tertiary)" />
    </button>
  );
}
