'use client';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, Phone, Mail, MapPin, Calendar, TrendingUp, Star, Clock,
  Edit3, Trash2, UserX, UserCheck, AlertTriangle, CheckCircle2, X, Save
} from 'lucide-react';
import {
  mockGuru, mockAbsensi, hitungSkorKedisiplinan, hitungPoinPartisipasi,
  loadPersistedData, savePersistedGuru
} from '@/lib/mockData';
import { getInitials, getStatusLabel, getTodayStringWITA } from '@/lib/utils';
import { sendTeacherReactivatedEmail } from '@/lib/emailService';
import type { Guru, AbsensiRecord } from '@/types';

export default function AdminGuruDetailPage() {
  const params = useParams();
  const router = useRouter();
  const idStr = typeof params?.id === 'string' ? params.id : Array.isArray(params?.id) ? params.id[0] : '';

  const [guru, setGuru] = useState<Guru | null>(null);
  const [absensiGuru, setAbsensiGuru] = useState<AbsensiRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Edit Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    nama: '',
    email: '',
    nip: '',
    jabatan: '',
    statusKepegawaian: 'tetap' as 'tetap' | 'honorer' | 'magang',
    telepon: '',
    alamat: '',
  });
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Action / Delete / Deactivate Modal State
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionStep, setActionStep] = useState<'choose' | 'deactivate_options' | 'confirm_delete'>('choose');
  const [deactivateMode, setDeactivateMode] = useState<'rentang' | 'manual'>('manual');
  const [deactivateUntilDate, setDeactivateUntilDate] = useState('');
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  useEffect(() => {
    if (!idStr) return;

    loadPersistedData();

    // 1. Coba dari LocalStorage & Memory
    let foundTeacher: Guru | undefined = undefined;
    if (typeof window !== 'undefined') {
      try {
        const savedGurus = localStorage.getItem('muallim_guru_list');
        if (savedGurus) {
          const parsed: Guru[] = JSON.parse(savedGurus);
          if (Array.isArray(parsed)) {
            foundTeacher = parsed.find((g) => g.id === idStr || g.id === decodeURIComponent(idStr));
          }
        }

        const savedAbs = localStorage.getItem('muallim_absensi_list');
        if (savedAbs) {
          const parsedAbs: AbsensiRecord[] = JSON.parse(savedAbs);
          if (Array.isArray(parsedAbs)) {
            mockAbsensi.length = 0;
            mockAbsensi.push(...parsedAbs);
            const filtered = parsedAbs.filter((a) =>
              a.guruId === idStr ||
              a.guruId === decodeURIComponent(idStr) ||
              (foundTeacher && (a.guruId === foundTeacher.id || a.guruNama === foundTeacher.nama))
            ).sort((a, b) => b.tanggal.localeCompare(a.tanggal));
            setAbsensiGuru(filtered);
          }
        }
      } catch (e) {}
    }

    if (!foundTeacher) {
      foundTeacher = mockGuru.find((g) => g.id === idStr || g.id === decodeURIComponent(idStr));
    }

    if (foundTeacher) {
      setGuru({ ...foundTeacher });
      setEditForm({
        nama: foundTeacher.nama,
        email: foundTeacher.email,
        nip: foundTeacher.nip,
        jabatan: foundTeacher.jabatan,
        statusKepegawaian: foundTeacher.statusKepegawaian || 'tetap',
        telepon: foundTeacher.telepon || '',
        alamat: foundTeacher.alamat || '',
      });
      setIsLoading(false);
    }

    // 2. Fetch fresh dari Supabase
    import('@/lib/supabaseClient').then(({ getGurusSupabase, getAbsensiSupabase }) => {
      getGurusSupabase().then((gurus) => {
        let currentMatch = foundTeacher;
        if (gurus && gurus.length > 0) {
          mockGuru.length = 0;
          mockGuru.push(...gurus);
          const current = gurus.find((g) => g.id === idStr || g.id === decodeURIComponent(idStr));
          if (current) {
            currentMatch = current;
            setGuru({ ...current });
            setEditForm({
              nama: current.nama,
              email: current.email,
              nip: current.nip,
              jabatan: current.jabatan,
              statusKepegawaian: current.statusKepegawaian || 'tetap',
              telepon: current.telepon || '',
              alamat: current.alamat || '',
            });
          }
        }

        getAbsensiSupabase().then((data) => {
          if (data) {
            mockAbsensi.length = 0;
            mockAbsensi.push(...data);
            const filtered = data.filter((a) =>
              a.guruId === idStr ||
              a.guruId === decodeURIComponent(idStr) ||
              (currentMatch && (a.guruId === currentMatch.id || a.guruNama === currentMatch.nama))
            ).sort((a, b) => b.tanggal.localeCompare(a.tanggal));
            setAbsensiGuru(filtered);
          }
          setIsLoading(false);
        }).catch(() => {
          setIsLoading(false);
        });
      }).catch(() => {
        setIsLoading(false);
      });
    }).catch(() => {
      setIsLoading(false);
    });
  }, [idStr]);

  if (isLoading && !guru) {
    return (
      <div className="admin-content" style={{ textAlign: 'center', paddingTop: 100 }}>
        <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <span className="animate-spin"><Clock size={28} color="var(--color-primary)" /></span>
          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
            Memuat detail data guru...
          </p>
        </div>
      </div>
    );
  }

  if (!guru) {
    return (
      <div className="admin-content" style={{ textAlign: 'center', paddingTop: 80 }}>
        <p style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>Data guru tidak ditemukan.</p>
        <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', marginTop: 4 }}>
          Guru dengan ID &quot;{idStr}&quot; mungkin telah dihapus atau belum terdaftar.
        </p>
        <button className="btn btn-primary btn-sm" style={{ marginTop: 16 }} onClick={() => router.push('/admin/guru')}>
          Kembali ke Daftar Guru
        </button>
      </div>
    );
  }

  const skor = hitungSkorKedisiplinan(guru.id, undefined, undefined, absensiGuru);
  const poin = hitungPoinPartisipasi(guru.id);

  const gradeColor = skor.grade === 'Sangat Baik' ? '#1B6B4A' : skor.grade === 'Baik' ? '#1D4ED8' : skor.grade === 'Cukup' ? '#B45309' : '#B91C1C';

  const statusColors: Record<string, string> = {
    hadir_tepat_waktu: 'success', terlambat: 'warning',
    izin: 'info', sakit: 'info', alfa: 'danger', belum_absen: 'neutral',
  };

  // 1. Simpan Perubahan Edit Data Guru
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm.nama.trim() || !editForm.email.trim()) {
      alert('Nama dan Email wajib diisi.');
      return;
    }

    setIsSavingEdit(true);
    const updatedGuru: Guru = {
      ...guru,
      nama: editForm.nama.trim(),
      email: editForm.email.trim().toLowerCase(),
      nip: editForm.nip.trim(),
      jabatan: editForm.jabatan.trim(),
      statusKepegawaian: editForm.statusKepegawaian,
      telepon: editForm.telepon.trim(),
      alamat: editForm.alamat.trim(),
    };

    // Update local memory
    const idx = mockGuru.findIndex((g) => g.id === guru.id);
    if (idx !== -1) mockGuru[idx] = updatedGuru;
    savePersistedGuru([...mockGuru]);
    setGuru(updatedGuru);

    // Sync to Supabase
    try {
      const { supabase } = await import('@/lib/supabaseClient');
      await supabase.from('gurus').update({
        nama: updatedGuru.nama,
        email: updatedGuru.email,
        nip: updatedGuru.nip,
        jabatan: updatedGuru.jabatan,
        status_kepegawaian: updatedGuru.statusKepegawaian,
        telepon: updatedGuru.telepon,
        alamat: updatedGuru.alamat,
      }).eq('id', guru.id);
    } catch (e) {}

    setIsSavingEdit(false);
    setShowEditModal(false);
    setToastMessage(`✓ Data guru ${updatedGuru.nama} berhasil diperbarui!`);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // 2. Eksekusi Nonaktifkan Guru
  const handleConfirmDeactivate = async () => {
    setIsProcessingAction(true);
    const updatedGuru: Guru = {
      ...guru,
      aktif: false,
    };

    const idx = mockGuru.findIndex((g) => g.id === guru.id);
    if (idx !== -1) mockGuru[idx] = updatedGuru;
    savePersistedGuru([...mockGuru]);
    setGuru(updatedGuru);

    try {
      const { supabase } = await import('@/lib/supabaseClient');
      await supabase.from('gurus').update({ aktif: false }).eq('id', guru.id);
    } catch (e) {}

    setIsProcessingAction(false);
    setShowActionModal(false);
    const durasiText = deactivateMode === 'rentang' && deactivateUntilDate
      ? `sampai tanggal ${new Date(deactivateUntilDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`
      : 'sampai Anda mengaktifkan kembali';
    setToastMessage(`✓ Guru ${guru.nama} berhasil dinonaktifkan (${durasiText}).`);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // 3. Eksekusi Hapus Guru Permanen
  const handleConfirmDelete = async () => {
    setIsProcessingAction(true);

    const filtered = mockGuru.filter((g) => g.id !== guru.id && g.email !== guru.email);
    mockGuru.length = 0;
    mockGuru.push(...filtered);
    savePersistedGuru(filtered);

    try {
      const { deleteGuruSupabase } = await import('@/lib/supabaseClient');
      await deleteGuruSupabase(guru.id);
    } catch (e) {}

    setIsProcessingAction(false);
    setShowActionModal(false);
    router.replace('/admin/guru');
  };

  // 4. Eksekusi Aktifkan Kembali Guru & Kirim Email Notifikasi
  const handleReactivateGuru = async () => {
    setIsProcessingAction(true);
    const updatedGuru: Guru = {
      ...guru,
      aktif: true,
    };

    const idx = mockGuru.findIndex((g) => g.id === guru.id);
    if (idx !== -1) mockGuru[idx] = updatedGuru;
    savePersistedGuru([...mockGuru]);
    setGuru(updatedGuru);

    try {
      const { supabase } = await import('@/lib/supabaseClient');
      await supabase.from('gurus').update({ aktif: true }).eq('id', guru.id);
    } catch (e) {}

    // Kirim email notifikasi ke guru bahwa akun telah aktif kembali
    if (guru.email) {
      sendTeacherReactivatedEmail({
        guruNama: guru.nama,
        guruEmail: guru.email,
      }).catch(() => {});
    }

    setIsProcessingAction(false);
    setToastMessage(`✓ Akun ${guru.nama} berhasil diaktifkan kembali! Pemberitahuan telah dikirim ke email ${guru.email}.`);
    setTimeout(() => setToastMessage(null), 5000);
  };

  return (
    <div>
      {/* Toast Notification */}
      {toastMessage && (
        <div className="toast-container" style={{ position: 'fixed', top: 80, bottom: 'auto', left: '50%', transform: 'translateX(-50%)', zIndex: 9999 }}>
          <div className="toast toast-success">{toastMessage}</div>
        </div>
      )}

      {/* Topbar & Mobile Action Bar */}
      <div className="admin-topbar" style={{ flexWrap: 'wrap', gap: 12, height: 'auto', minHeight: 'var(--header-height)', padding: '12px var(--space-6)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flex: '1 1 auto' }}>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            style={{ padding: 8, borderRadius: 'var(--radius-md)', flexShrink: 0 }}
            onClick={() => router.push('/admin/guru')}
            aria-label="Kembali ke Daftar Guru"
          >
            <ArrowLeft size={18} />
          </button>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 800, margin: 0, color: 'var(--color-text-primary)', whiteSpace: 'nowrap' }}>
                Detail Guru
              </h1>
              <span
                className={`badge ${guru.aktif ? 'badge-success' : 'badge-danger'}`}
                style={{ fontSize: 11, padding: '3px 8px', fontWeight: 700 }}
              >
                {guru.aktif ? '● Aktif' : '○ Nonaktif'}
              </span>
            </div>
            <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', margin: '2px 0 0', fontFamily: 'monospace', fontWeight: 600 }}>
              {guru.nip}
            </p>
          </div>
        </div>

        {/* Action Buttons (Desktop & Mobile) */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', flexShrink: 0, width: 'auto' }} className="guru-detail-actions">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setShowEditModal(true)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 700, padding: '8px 14px' }}
          >
            <Edit3 size={14} /> Edit Data
          </button>

          {/* Tombol Hapus Guru (Jika Aktif) atau Aktifkan Kembali (Jika Nonaktif) */}
          {guru.aktif ? (
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => {
                setActionStep('choose');
                setShowActionModal(true);
              }}
              style={{
                borderColor: 'var(--color-danger)',
                color: 'var(--color-danger)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontWeight: 700,
                padding: '8px 14px',
              }}
            >
              <Trash2 size={14} /> Hapus / Nonaktifkan
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={handleReactivateGuru}
              disabled={isProcessingAction}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontWeight: 700,
                padding: '8px 14px',
              }}
            >
              <UserCheck size={15} /> {isProcessingAction ? 'Mengaktifkan...' : 'Aktifkan Kembali'}
            </button>
          )}
        </div>
      </div>

      <div className="admin-content" style={{ maxWidth: 1200, margin: '0 auto', width: '100%' }}>
        <div className="admin-grid-2-1" style={{ alignItems: 'flex-start' }}>
          {/* Left Column — Profil & Performa */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            
            {/* 1. Profile Card */}
            <div className="card" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--color-border)' }}>
              {/* Header Profile with Gradient */}
              <div style={{
                background: guru.aktif
                  ? 'linear-gradient(135deg, #134e4a 0%, #166534 50%, #1B6B4A 100%)'
                  : 'linear-gradient(135deg, #334155 0%, #475569 100%)',
                padding: '24px 20px',
                textAlign: 'center',
                position: 'relative',
                color: 'white',
              }}>
                <div
                  className="avatar avatar-xl"
                  style={{
                    margin: '0 auto 12px',
                    border: '3px solid rgba(255,255,255,0.4)',
                    color: 'white',
                    background: 'rgba(255,255,255,0.2)',
                    fontSize: 24,
                    fontWeight: 800,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  }}
                >
                  {getInitials(guru.nama)}
                </div>

                <h2 style={{ fontSize: 'var(--font-size-base)', fontWeight: 800, margin: '0 0 4px', color: '#ffffff' }}>
                  {guru.nama}
                </h2>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    background: 'rgba(255,255,255,0.2)',
                    backdropFilter: 'blur(4px)',
                    color: '#ffffff',
                    padding: '3px 10px',
                    borderRadius: 9999,
                    fontSize: 11,
                    fontWeight: 700,
                  }}>
                    {guru.jabatan}
                  </span>
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    background: 'rgba(255,255,255,0.15)',
                    color: '#ffffff',
                    padding: '3px 10px',
                    borderRadius: 9999,
                    fontSize: 11,
                    fontWeight: 600,
                    textTransform: 'capitalize',
                  }}>
                    {guru.statusKepegawaian === 'tetap' ? 'Guru Tetap' : guru.statusKepegawaian === 'honorer' ? 'Honorer' : 'Magang'}
                  </span>
                </div>

                <div style={{
                  display: 'inline-block',
                  background: 'rgba(0,0,0,0.2)',
                  color: 'rgba(255,255,255,0.9)',
                  padding: '3px 12px',
                  borderRadius: 6,
                  fontSize: 11,
                  fontFamily: 'monospace',
                  fontWeight: 600,
                  marginTop: 10,
                }}>
                  NIP: {guru.nip}
                </div>
              </div>

              {/* Contact & Detail Info */}
              <div style={{ padding: '8px 0' }}>
                {/* Telepon / WhatsApp */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderBottom: '1px solid var(--color-border-light)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--color-surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-primary)', flexShrink: 0 }}>
                      <Phone size={15} />
                    </div>
                    <div>
                      <div style={{ fontSize: 10.5, color: 'var(--color-text-tertiary)', fontWeight: 600 }}>Nomor Telepon / WA</div>
                      <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                        {guru.telepon || '—'}
                      </div>
                    </div>
                  </div>
                  {guru.telepon && (
                    <a
                      href={`https://wa.me/${guru.telepon.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-ghost btn-sm"
                      style={{ fontSize: 11, color: 'var(--color-success)', padding: '4px 8px', fontWeight: 700 }}
                    >
                      Hubungi
                    </a>
                  )}
                </div>

                {/* Email */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderBottom: '1px solid var(--color-border-light)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--color-surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-primary)', flexShrink: 0 }}>
                      <Mail size={15} />
                    </div>
                    <div>
                      <div style={{ fontSize: 10.5, color: 'var(--color-text-tertiary)', fontWeight: 600 }}>Email</div>
                      <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--color-text-primary)', wordBreak: 'break-all' }}>
                        {guru.email}
                      </div>
                    </div>
                  </div>
                  <a
                    href={`mailto:${guru.email}`}
                    className="btn btn-ghost btn-sm"
                    style={{ fontSize: 11, color: 'var(--color-primary)', padding: '4px 8px', fontWeight: 700 }}
                  >
                    Kirim
                  </a>
                </div>

                {/* Alamat */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 16px', borderBottom: '1px solid var(--color-border-light)' }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--color-surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-primary)', flexShrink: 0, marginTop: 2 }}>
                    <MapPin size={15} />
                  </div>
                  <div>
                    <div style={{ fontSize: 10.5, color: 'var(--color-text-tertiary)', fontWeight: 600 }}>Alamat Tempat Tinggal</div>
                    <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>
                      {guru.alamat || 'Belum diisi'}
                    </div>
                  </div>
                </div>

                {/* Tanggal Bergabung */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px' }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--color-surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-primary)', flexShrink: 0 }}>
                    <Calendar size={15} />
                  </div>
                  <div>
                    <div style={{ fontSize: 10.5, color: 'var(--color-text-tertiary)', fontWeight: 600 }}>Tanggal Bergabung</div>
                    <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                      {new Date(guru.tanggalGabung).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Ringkasan Performa Card */}
            <div className="card" style={{ border: '1px solid var(--color-border)' }}>
              <div className="card-header" style={{ padding: '14px 16px', borderBottom: '1px solid var(--color-border-light)' }}>
                <span style={{ fontWeight: 800, fontSize: 'var(--font-size-sm)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <TrendingUp size={16} color="var(--color-primary)" /> Ringkasan Performa Bulan Ini
                </span>
              </div>
              <div className="card-body" style={{ padding: 16 }}>
                {/* 2 Big Score Metrics */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                  <div style={{
                    padding: '14px 12px',
                    borderRadius: 12,
                    background: 'var(--color-surface-2)',
                    border: '1px solid var(--color-border-light)',
                    textAlign: 'center',
                  }}>
                    <div style={{ fontSize: 28, fontWeight: 900, color: gradeColor, lineHeight: 1.1 }}>
                      {skor.skor}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', fontWeight: 700, marginTop: 4 }}>
                      Skor Disiplin
                    </div>
                    <span
                      className="badge"
                      style={{
                        marginTop: 6,
                        background: `${gradeColor}18`,
                        color: gradeColor,
                        fontWeight: 800,
                        fontSize: 10,
                        border: `1px solid ${gradeColor}30`,
                      }}
                    >
                      {skor.grade}
                    </span>
                  </div>

                  <div style={{
                    padding: '14px 12px',
                    borderRadius: 12,
                    background: 'var(--color-surface-2)',
                    border: '1px solid var(--color-border-light)',
                    textAlign: 'center',
                  }}>
                    <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--color-accent)', lineHeight: 1.1 }}>
                      {poin.poinTotal}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', fontWeight: 700, marginTop: 4 }}>
                      Poin Partisipasi
                    </div>
                    <span
                      className="badge"
                      style={{
                        marginTop: 6,
                        background: 'rgba(217, 119, 6, 0.12)',
                        color: 'var(--color-accent)',
                        fontWeight: 800,
                        fontSize: 10,
                        border: '1px solid rgba(217, 119, 6, 0.25)',
                      }}
                    >
                      ★ {poin.hadir} Kegiatan
                    </span>
                  </div>
                </div>

                {/* Detail Breakdown */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[
                    { label: 'Hadir Tepat Waktu', value: skor.hadirTepatWaktu, color: 'var(--color-success)', bg: 'rgba(22, 163, 74, 0.1)' },
                    { label: 'Terlambat', value: skor.terlambat, color: 'var(--color-warning)', bg: 'rgba(234, 179, 8, 0.1)' },
                    { label: 'Izin', value: skor.izin, color: 'var(--color-info)', bg: 'rgba(59, 130, 246, 0.1)' },
                    { label: 'Sakit', value: skor.sakit, color: 'var(--color-info)', bg: 'rgba(59, 130, 246, 0.1)' },
                    { label: 'Alfa / Tanpa Keterangan', value: skor.alfa, color: 'var(--color-danger)', bg: 'rgba(239, 68, 68, 0.1)' },
                  ].map((row) => (
                    <div
                      key={row.label}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '8px 12px',
                        borderRadius: 8,
                        background: row.value > 0 ? row.bg : 'var(--color-surface)',
                        border: '1px solid var(--color-border-light)',
                      }}
                    >
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                        {row.label}
                      </span>
                      <span style={{ fontSize: 12, fontWeight: 800, color: row.value > 0 ? row.color : 'var(--color-text-tertiary)' }}>
                        {row.value} hari
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column — Riwayat Absensi */}
          <div className="card" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--color-border)' }}>
            <div className="card-header" style={{ padding: '14px 16px', borderBottom: '1px solid var(--color-border-light)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ fontWeight: 800, fontSize: 'var(--font-size-sm)', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Clock size={16} color="var(--color-primary)" /> Riwayat Kehadiran &amp; Absensi
                </h3>
                <p style={{ fontSize: 11, color: 'var(--color-text-tertiary)', margin: '2px 0 0' }}>
                  Catatan presensi harian guru
                </p>
              </div>
              <span className="badge badge-neutral" style={{ fontWeight: 700, fontSize: 11 }}>
                {absensiGuru.length} Catatan
              </span>
            </div>

            {/* Mobile View: Cards List */}
            <div className="show-on-mobile" style={{ padding: 12 }}>
              {absensiGuru.length === 0 ? (
                <div className="empty-state" style={{ padding: '32px 16px' }}>
                  <Clock size={28} color="var(--color-text-tertiary)" style={{ margin: '0 auto 8px' }} />
                  <div className="empty-state-title" style={{ fontSize: 14 }}>Belum Ada Catatan Absensi</div>
                  <div className="empty-state-desc" style={{ fontSize: 12 }}>Belum ada data presensi yang terekam untuk guru ini.</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {absensiGuru.map((a) => (
                    <div
                      key={a.id}
                      style={{
                        padding: '12px 14px',
                        borderRadius: 10,
                        background: 'var(--color-surface)',
                        border: '1px solid var(--color-border-light)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 8,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: 13, color: 'var(--color-text-primary)' }}>
                            {new Date(a.tanggal).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })}
                          </div>
                          <div style={{ fontSize: 11.5, color: 'var(--color-text-secondary)', marginTop: 2 }}>
                            Masuk: <strong>{a.jamMasuk ? `${a.jamMasuk} WITA` : '—'}</strong> • Pulang: <strong>{a.jamPulang ? `${a.jamPulang} WITA` : '—'}</strong>
                          </div>
                        </div>
                        <span className={`badge badge-${statusColors[a.status]}`} style={{ fontSize: 10.5, fontWeight: 700, flexShrink: 0 }}>
                          {getStatusLabel(a.status)}
                        </span>
                      </div>

                      {(a.keterlambatan > 0 || a.keterangan) && (
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          padding: '6px 10px',
                          background: 'var(--color-surface-2)',
                          borderRadius: 6,
                          fontSize: 11,
                        }}>
                          {a.keterlambatan > 0 && (
                            <span style={{ color: 'var(--color-warning)', fontWeight: 700 }}>
                              Terlambat {a.keterlambatan} menit
                            </span>
                          )}
                          {a.keterlambatan > 0 && a.keterangan && <span>•</span>}
                          {a.keterangan && (
                            <span style={{ color: 'var(--color-text-secondary)' }}>
                              {a.keterangan}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Desktop View: Full Table */}
            <div className="table-container hide-on-mobile" style={{ border: 'none', borderRadius: 0, margin: 0 }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Tanggal</th>
                    <th>Jam Masuk</th>
                    <th>Jam Pulang</th>
                    <th>Status</th>
                    <th>Keterlambatan</th>
                    <th>Keterangan</th>
                  </tr>
                </thead>
                <tbody>
                  {absensiGuru.map((a) => (
                    <tr key={a.id}>
                      <td style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>
                        {new Date(a.tanggal).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })}
                      </td>
                      <td>{a.jamMasuk ? `${a.jamMasuk} WITA` : '—'}</td>
                      <td>{a.jamPulang ? `${a.jamPulang} WITA` : '—'}</td>
                      <td>
                        <span className={`badge badge-${statusColors[a.status]}`}>
                          {getStatusLabel(a.status)}
                        </span>
                      </td>
                      <td>
                        {a.keterlambatan > 0 ? (
                          <span style={{ color: 'var(--color-warning)', fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>
                            {a.keterlambatan} menit
                          </span>
                        ) : '—'}
                      </td>
                      <td style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>
                        {a.keterangan || '—'}
                      </td>
                    </tr>
                  ))}
                  {absensiGuru.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '36px', color: 'var(--color-text-tertiary)' }}>
                        Belum ada riwayat absensi untuk guru ini.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* ═════════════════════════════════════════════════════════════
          MODAL EDIT DATA GURU
          ═════════════════════════════════════════════════════════════ */}
      {showEditModal && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal" style={{ maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Edit3 size={18} color="var(--color-primary)" /> Edit Data Guru
              </h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowEditModal(false)}>
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleSaveEdit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }}>Nama Lengkap &amp; Gelar *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={editForm.nama}
                    onChange={(e) => setEditForm({ ...editForm, nama: e.target.value })}
                    required
                  />
                </div>

                <div className="admin-grid-1-1">
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 700 }}>NIP Yayasan *</label>
                    <input
                      type="text"
                      className="form-input"
                      value={editForm.nip}
                      onChange={(e) => setEditForm({ ...editForm, nip: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 700 }}>Email Guru *</label>
                    <input
                      type="email"
                      className="form-input"
                      value={editForm.email}
                      onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="admin-grid-1-1">
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 700 }}>Jabatan / Peran</label>
                    <select
                      className="form-select"
                      value={editForm.jabatan || 'Ustadz'}
                      onChange={(e) => setEditForm({ ...editForm, jabatan: e.target.value })}
                    >
                      <option value="Ustadz">Ustadz</option>
                      <option value="Ustadzah">Ustadzah</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 700 }}>Status Kepegawaian</label>
                    <select
                      className="form-select"
                      value={editForm.statusKepegawaian}
                      onChange={(e) => setEditForm({ ...editForm, statusKepegawaian: e.target.value as any })}
                    >
                      <option value="tetap">Guru Tetap</option>
                      <option value="honorer">Guru Honorer / Kontrak</option>
                      <option value="magang">Magang / Pembina</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }}>Nomor Telepon / WhatsApp</label>
                  <input
                    type="text"
                    className="form-input"
                    value={editForm.telepon}
                    placeholder="08xxxxxxxxxx"
                    onChange={(e) => setEditForm({ ...editForm, telepon: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }}>Alamat</label>
                  <textarea
                    className="form-input"
                    rows={2}
                    value={editForm.alamat}
                    onChange={(e) => setEditForm({ ...editForm, alamat: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowEditModal(false)}>
                  Batal
                </button>
                <button type="submit" className="btn btn-primary btn-sm" disabled={isSavingEdit} style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}>
                  <Save size={14} /> {isSavingEdit ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════
          MODAL HAPUS GURU / NONAKTIFKAN GURU
          ═════════════════════════════════════════════════════════════ */}
      {showActionModal && (
        <div className="modal-overlay" onClick={() => setShowActionModal(false)}>
          <div className="modal" style={{ maxWidth: 460 }} onClick={(e) => e.stopPropagation()}>
            
            {/* STEP 1: PILIH HAPUS ATAU NONAKTIFKAN */}
            {actionStep === 'choose' && (
              <>
                <div className="modal-header" style={{ borderBottom: '1px solid var(--color-border-light)' }}>
                  <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 800, color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <AlertTriangle size={18} color="#D97706" /> Pengelolaan Status Guru
                  </h3>
                  <button className="btn btn-ghost btn-sm" onClick={() => setShowActionModal(false)}><X size={16} /></button>
                </div>
                <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                  <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', margin: 0 }}>
                    Pilih tindakan yang ingin Anda lakukan untuk akun <strong>{guru.nama}</strong>:
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                    {/* Opsi Nonaktifkan */}
                    <div
                      onClick={() => setActionStep('deactivate_options')}
                      style={{
                        padding: '14px 16px',
                        borderRadius: 'var(--radius-lg)',
                        border: '1.5px solid var(--color-border)',
                        background: 'var(--color-surface)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 12,
                        transition: 'all 0.2s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary)')}
                      onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
                    >
                      <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-md)', background: '#FEF3C7', color: '#D97706', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <UserX size={18} />
                      </div>
                      <div>
                        <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 800, color: 'var(--color-text-primary)' }}>
                          Nonaktifkan Saja (Sementara)
                        </div>
                        <div style={{ fontSize: 11.5, color: 'var(--color-text-tertiary)', marginTop: 2 }}>
                          Guru tidak dapat login atau absen, tetapi seluruh riwayat absensi tetap tersimpan aman. Dapat diaktifkan kembali kapan saja.
                        </div>
                      </div>
                    </div>

                    {/* Opsi Hapus Permanen */}
                    <div
                      onClick={() => setActionStep('confirm_delete')}
                      style={{
                        padding: '14px 16px',
                        borderRadius: 'var(--radius-lg)',
                        border: '1.5px solid rgba(220, 38, 38, 0.3)',
                        background: '#FEF2F2',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 12,
                        transition: 'all 0.2s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#DC2626')}
                      onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'rgba(220, 38, 38, 0.3)')}
                    >
                      <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-md)', background: '#FEE2E2', color: '#DC2626', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Trash2 size={18} />
                      </div>
                      <div>
                        <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 800, color: '#991B1B' }}>
                          Hapus Guru (Permanen)
                        </div>
                        <div style={{ fontSize: 11.5, color: '#B91C1C', marginTop: 2 }}>
                          Hapus data guru dari yayasan secara permanen dari sistem.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => setShowActionModal(false)}>Batal</button>
                </div>
              </>
            )}

            {/* STEP 2: PILIHAN RENTANG WAKTU NONAKTIFKAN */}
            {actionStep === 'deactivate_options' && (
              <>
                <div className="modal-header">
                  <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <UserX size={18} color="#D97706" /> Nonaktifkan Sampai Kapan?
                  </h3>
                  <button className="btn btn-ghost btn-sm" onClick={() => setShowActionModal(false)}><X size={16} /></button>
                </div>
                <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                  <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', margin: 0 }}>
                    Pilih batas durasi penonaktifan akun untuk <strong>{guru.nama}</strong>:
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                    {/* Opsi 1: Sampai Saya Mengaktifkan Kembali */}
                    <label style={{
                      display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px',
                      borderRadius: 'var(--radius-md)', border: deactivateMode === 'manual' ? '1.5px solid var(--color-primary)' : '1px solid var(--color-border)',
                      background: deactivateMode === 'manual' ? 'var(--color-primary-light)' : 'var(--color-surface)',
                      cursor: 'pointer'
                    }}>
                      <input
                        type="radio"
                        name="deactivateMode"
                        checked={deactivateMode === 'manual'}
                        onChange={() => setDeactivateMode('manual')}
                        style={{ marginTop: 2 }}
                      />
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 'var(--font-size-sm)', color: 'var(--color-text-primary)' }}>
                          Sampai saya mengaktifkan kembali
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 2 }}>
                          Akun akan dinonaktifkan tanpa batas waktu hingga Administrator mengklik tombol Aktifkan Kembali.
                        </div>
                      </div>
                    </label>

                    {/* Opsi 2: Rentang Waktu Tertentu */}
                    <label style={{
                      display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px',
                      borderRadius: 'var(--radius-md)', border: deactivateMode === 'rentang' ? '1.5px solid var(--color-primary)' : '1px solid var(--color-border)',
                      background: deactivateMode === 'rentang' ? 'var(--color-primary-light)' : 'var(--color-surface)',
                      cursor: 'pointer'
                    }}>
                      <input
                        type="radio"
                        name="deactivateMode"
                        checked={deactivateMode === 'rentang'}
                        onChange={() => setDeactivateMode('rentang')}
                        style={{ marginTop: 2 }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 'var(--font-size-sm)', color: 'var(--color-text-primary)' }}>
                          Rentang Waktu (Hingga Tanggal Tertentu)
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 2 }}>
                          Nonaktifkan sementara hingga batas tanggal cuti/istirahat yang ditentukan.
                        </div>

                        {deactivateMode === 'rentang' && (
                          <div style={{ marginTop: 10 }}>
                            <label style={{ fontSize: 11, fontWeight: 700, display: 'block', marginBottom: 4 }}>
                              Nonaktifkan Hingga Tanggal:
                            </label>
                            <input
                              type="date"
                              className="form-input"
                              min={getTodayStringWITA()}
                              value={deactivateUntilDate}
                              onChange={(e) => setDeactivateUntilDate(e.target.value)}
                              required
                            />
                          </div>
                        )}
                      </div>
                    </label>
                  </div>
                </div>
                <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => setActionStep('choose')}>&larr; Kembali</button>
                  <button
                    className="btn btn-warning btn-sm"
                    onClick={handleConfirmDeactivate}
                    disabled={isProcessingAction || (deactivateMode === 'rentang' && !deactivateUntilDate)}
                    style={{ fontWeight: 700 }}
                  >
                    {isProcessingAction ? 'Memproses...' : 'Konfirmasi Nonaktifkan'}
                  </button>
                </div>
              </>
            )}

            {/* STEP 3: KONFIRMASI HAPUS PERMANEN */}
            {actionStep === 'confirm_delete' && (
              <>
                <div className="modal-header">
                  <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 800, color: '#DC2626', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Trash2 size={18} /> Hapus Guru Permanen
                  </h3>
                  <button className="btn btn-ghost btn-sm" onClick={() => setShowActionModal(false)}><X size={16} /></button>
                </div>
                <div className="modal-body">
                  <p style={{ fontSize: 'var(--font-size-sm)', color: '#7F1D1D', lineHeight: 1.6, margin: 0 }}>
                    Apakah Anda yakin ingin menghapus data guru <strong>{guru.nama}</strong> ({guru.nip}) secara permanen dari sistem yayasan?
                  </p>
                  <div style={{
                    marginTop: 12, padding: '10px 14px', background: '#FEF2F2',
                    border: '1px solid #FCA5A5', borderRadius: 'var(--radius-md)',
                    fontSize: 11.5, color: '#991B1B'
                  }}>
                    ⚠️ <strong>Peringatan:</strong> Data guru yang dihapus tidak dapat dipulihkan kembali. Jika guru hanya cuti atau istirahat mengajar sementara, kami sarankan memilih opsi <strong>Nonaktifkan Saja</strong>.
                  </div>
                </div>
                <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => setActionStep('choose')}>&larr; Kembali</button>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={handleConfirmDelete}
                    disabled={isProcessingAction}
                    style={{ fontWeight: 700 }}
                  >
                    {isProcessingAction ? 'Menghapus...' : 'Ya, Hapus Permanen'}
                  </button>
                </div>
              </>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
