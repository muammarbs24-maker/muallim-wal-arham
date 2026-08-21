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

      {/* Topbar */}
      <div className="admin-topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <button className="btn btn-ghost btn-sm" style={{ padding: 8 }} onClick={() => router.back()}>
            <ArrowLeft size={18} />
          </button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h1 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 800 }}>Detail Guru</h1>
              <span className={`badge ${guru.aktif ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: 11 }}>
                {guru.aktif ? '● Aktif Mengajar' : '○ Akun Nonaktif'}
              </span>
            </div>
            <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>{guru.nip}</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setShowEditModal(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}
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
              style={{ borderColor: 'var(--color-danger)', color: 'var(--color-danger)', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}
            >
              <Trash2 size={14} /> Hapus Guru
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={handleReactivateGuru}
              disabled={isProcessingAction}
              style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}
            >
              <UserCheck size={15} /> {isProcessingAction ? 'Mengaktifkan...' : 'Aktifkan Kembali'}
            </button>
          )}
        </div>
      </div>

      <div className="admin-content">
        <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 'var(--space-5)' }}>
          {/* Left Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {/* Profile Card */}
            <div className="card">
              <div style={{ background: guru.aktif ? 'var(--color-primary)' : '#475569', padding: 'var(--space-6)', textAlign: 'center', position: 'relative' }}>
                <div className="avatar avatar-xl" style={{ margin: '0 auto var(--space-3)', border: '3px solid rgba(255,255,255,0.3)', color: 'white', background: 'rgba(255,255,255,0.2)' }}>
                  {getInitials(guru.nama)}
                </div>
                <div style={{ color: 'white', fontWeight: 700, fontSize: 'var(--font-size-base)' }}>{guru.nama}</div>
                <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: 'var(--font-size-sm)', marginTop: 4 }}>{guru.jabatan}</div>
                <span style={{ display: 'inline-block', background: 'rgba(255,255,255,0.2)', color: 'white', padding: '3px 10px', borderRadius: 'var(--radius-full)', fontSize: 'var(--font-size-xs)', marginTop: 8 }}>
                  NIP: {guru.nip}
                </span>
              </div>
              <div className="card-body" style={{ padding: 0 }}>
                {[
                  { icon: <Phone size={14} />, value: guru.telepon || '—' },
                  { icon: <Mail size={14} />, value: guru.email },
                  { icon: <MapPin size={14} />, value: guru.alamat || '—' },
                  { icon: <Calendar size={14} />, value: `Bergabung ${new Date(guru.tanggalGabung).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}` },
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)', padding: 'var(--space-3) var(--space-4)', borderBottom: '1px solid var(--color-border-light)' }}>
                    <span style={{ color: 'var(--color-text-tertiary)', marginTop: 1 }}>{item.icon}</span>
                    <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Score Summary */}
            <div className="card">
              <div className="card-header">
                <span style={{ fontWeight: 700, fontSize: 'var(--font-size-sm)' }}>Ringkasan Performa</span>
              </div>
              <div className="card-body">
                <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: 'var(--space-5)' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 800, color: gradeColor }}>{skor.skor}</div>
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>Skor Disiplin</div>
                    <span className="badge" style={{ marginTop: 4, background: `${gradeColor}15`, color: gradeColor }}>{skor.grade}</span>
                  </div>
                  <div style={{ width: 1, background: 'var(--color-border)' }} />
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 800, color: 'var(--color-accent)' }}>{poin.poinTotal}</div>
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>Poin Partisipasi</div>
                  </div>
                </div>
                {[
                  { label: 'Hadir Tepat Waktu', value: skor.hadirTepatWaktu, color: 'var(--color-success)' },
                  { label: 'Terlambat', value: skor.terlambat, color: 'var(--color-warning)' },
                  { label: 'Izin', value: skor.izin, color: 'var(--color-info)' },
                  { label: 'Sakit', value: skor.sakit, color: 'var(--color-info)' },
                  { label: 'Alfa', value: skor.alfa, color: 'var(--color-danger)' },
                ].map((row) => (
                  <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--color-border-light)' }}>
                    <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>{row.label}</span>
                    <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 700, color: row.color }}>{row.value} hari</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column — History */}
          <div className="card">
            <div className="card-header">
              <span style={{ fontWeight: 700, fontSize: 'var(--font-size-sm)' }}>Riwayat Absensi</span>
              <span className="badge badge-neutral">{absensiGuru.length} catatan</span>
            </div>
            <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
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
                      <td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: 'var(--color-text-tertiary)' }}>
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

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
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

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
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
