'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Users, Search, Plus, CheckCircle2, Clock, XCircle, X, Shield, Key, Mail, Phone, UserCheck, AlertCircle, Copy, Check } from 'lucide-react';
import { mockGuru, hitungSkorKedisiplinan, authConfig, savePersistedGuru, loadPersistedData } from '@/lib/mockData';
import { getInitials, generateNipYayasan } from '@/lib/utils';
import { sendTeacherWelcomeEmail } from '@/lib/emailService';
import { getGurusSupabase, upsertGuruSupabase } from '@/lib/supabaseClient';
import type { Guru } from '@/types';

export default function AdminGuruPage() {
  const [guruList, setGuruList] = useState<Guru[]>([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [copiedPass, setCopiedPass] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    loadPersistedData();
    setGuruList([...mockGuru]);

    getGurusSupabase().then((dbGurus) => {
      if (Array.isArray(dbGurus)) {
        mockGuru.length = 0;
        mockGuru.push(...dbGurus);
        savePersistedGuru(dbGurus);
        setGuruList([...dbGurus]);
      }
    }).catch(() => {});
  }, []);

  // Auto generated NIP for next teacher: MWA-YYYY-00X
  const autoNip = generateNipYayasan(mockGuru.length, new Date().getFullYear());

  // Form State for new Teacher
  const [formData, setFormData] = useState({
    nama: '',
    email: '',
    nip: autoNip,
    jabatan: 'Guru Tahfidz',
    statusKepegawaian: 'tetap' as 'tetap' | 'honorer' | 'magang',
    telepon: '',
    alamat: 'Makassar',
  });

  // Open modal with fresh auto-generated NIP
  const openAddModal = () => {
    const nextNip = generateNipYayasan(mockGuru.length, new Date().getFullYear());
    setFormData({
      nama: '',
      email: '',
      nip: nextNip,
      jabatan: 'Guru Tahfidz',
      statusKepegawaian: 'tetap',
      telepon: '',
      alamat: 'Makassar',
    });
    setShowAddModal(true);
  };

  const handleAddGuru = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nama || !formData.email) return;

    const assignedNip = formData.nip.trim() || generateNipYayasan(mockGuru.length, new Date().getFullYear());

    const newGuru: Guru = {
      id: `guru-${Date.now()}`,
      nama: formData.nama.trim(),
      email: formData.email.trim().toLowerCase(),
      nip: assignedNip,
      jabatan: formData.jabatan,
      statusKepegawaian: formData.statusKepegawaian,
      telepon: formData.telepon.trim(),
      alamat: formData.alamat.trim(),
      foto: '',
      role: 'guru',
      aktif: true,
      tanggalGabung: new Date().toISOString().split('T')[0],
      password: authConfig.defaultGuruPassword || 'muallim123',
      perluGantiPassword: true, // Requires password update on first login!
    };

    mockGuru.push(newGuru);
    savePersistedGuru([...mockGuru]);
    setGuruList([...mockGuru]);
    setShowAddModal(false);

    // Save to Supabase Cloud Database!
    await upsertGuruSupabase(newGuru);

    // Send onboarding email containing Name, Teacher ID (NIP), Login Email, and Password!
    sendTeacherWelcomeEmail({
      nama: newGuru.nama,
      nip: newGuru.nip,
      email: newGuru.email,
      password: newGuru.password || authConfig.defaultGuruPassword || 'muallim123',
    }).then((res) => {
      console.log('Teacher credentials email status:', res);
    });

    setToastMessage(`✓ Berhasil mendaftarkan ${newGuru.nama}! Email berisi NIP (${newGuru.nip}) dan kredensial login telah dikirim ke ${newGuru.email}.`);
    setTimeout(() => setToastMessage(null), 6000);
  };

  const filteredGuru = guruList.filter((g) => {
    const matchSearch = !search ||
      g.nama.toLowerCase().includes(search.toLowerCase()) ||
      g.nip.toLowerCase().includes(search.toLowerCase()) ||
      g.jabatan.toLowerCase().includes(search.toLowerCase()) ||
      g.email.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !filterStatus || g.statusKepegawaian === filterStatus;
    return matchSearch && matchStatus;
  });

  return (
    <div>
      {/* Toast Notification */}
      {toastMessage && (
        <div className="toast-container" style={{ position: 'fixed', top: 80, bottom: 'auto', left: '50%', transform: 'translateX(-50%)', zIndex: 1000 }}>
          <div className="toast toast-success" style={{ boxShadow: '0 8px 24px rgba(0,0,0,0.15)', fontSize: 13 }}>
            {toastMessage}
          </div>
        </div>
      )}

      {/* Topbar */}
      <div className="admin-topbar">
        <div>
          <h1 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 800 }}>Manajemen Guru</h1>
          <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>
            {mockGuru.filter(g => g.aktif).length} guru terdaftar
          </p>
        </div>
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={openAddModal}
          style={{ fontSize: 12, padding: '6px 14px' }}
        >
          <Plus size={16} /> Tambah Guru Baru
        </button>
      </div>

      <div className="admin-content">

        {/* Info Banner for Default Credentials */}
        <div style={{
          padding: '10px 14px',
          background: 'var(--color-primary-light)',
          borderRadius: 'var(--radius-md)',
          marginBottom: 'var(--space-4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          border: '1px solid rgba(27,107,74,0.2)',
          fontSize: 'var(--font-size-xs)',
          color: 'var(--color-text-secondary)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Key size={16} color="var(--color-primary)" />
            <span>
              <strong>Alur Guru Baru:</strong> Daftarkan email guru di sini. Guru akan login menggunakan emailnya dan kata sandi default <code>{authConfig.defaultGuruPassword}</code>, lalu sistem akan otomatis meminta guru memperbarui kata sandinya.
            </span>
          </div>
          <span className="badge badge-primary" style={{ fontSize: 10 }}>Password Default: {authConfig.defaultGuruPassword}</span>
        </div>

        {/* Filters */}
        <div className="card" style={{ marginBottom: 'var(--space-4)' }}>
          <div className="card-body" style={{ padding: 'var(--space-3)', display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
              <input
                className="form-input"
                placeholder="Cari nama, NIP, email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ paddingLeft: 36, fontSize: 13 }}
              />
              <Search size={16} color="var(--color-text-tertiary)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
            </div>
            <select
              className="form-select"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              style={{ width: 'auto', minWidth: 150, fontSize: 13 }}
            >
              <option value="">Semua Status</option>
              <option value="tetap">Guru Tetap</option>
              <option value="honorer">Guru Honorer</option>
              <option value="magang">Guru Magang</option>
            </select>
          </div>
        </div>

        {/* Guru Table / List */}
        {filteredGuru.length === 0 ? (
          <div className="empty-state" style={{ padding: 'var(--space-8)' }}>
            <Users size={48} color="var(--color-text-tertiary)" />
            <p style={{ marginTop: 'var(--space-3)', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
              Belum ada guru yang terdaftar
            </p>
            <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', maxWidth: 360, margin: '4px auto 0' }}>
              Daftarkan guru pertama Anda menggunakan tombol di atas agar guru dapat mulai melakukan absensi dan monitoring.
            </p>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={openAddModal}
              style={{ marginTop: 'var(--space-3)' }}
            >
              <Plus size={16} /> Daftarkan Guru Pertama
            </button>
          </div>
        ) : (
          <div className="card">
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Guru</th>
                    <th>NIP / ID</th>
                    <th>Jabatan</th>
                    <th>Status</th>
                    <th>Kedisiplinan</th>
                    <th>Kehadiran</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredGuru.map((g) => {
                    const skor = hitungSkorKedisiplinan(g.id);
                    return (
                      <tr key={g.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                            <div className="avatar avatar-sm">{getInitials(g.nama)}</div>
                            <div>
                              <div style={{ fontWeight: 600 }}>{g.nama}</div>
                              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>{g.email}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <code style={{ fontSize: 'var(--font-size-xs)', fontWeight: 700 }}>{g.nip}</code>
                        </td>
                        <td>{g.jabatan}</td>
                        <td>
                          <span className={`badge badge-${g.statusKepegawaian === 'tetap' ? 'primary' : g.statusKepegawaian === 'honorer' ? 'info' : 'warning'}`}>
                            {g.statusKepegawaian.toUpperCase()}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <div style={{
                              width: 36, height: 6,
                              borderRadius: 3,
                              background: 'var(--color-border)',
                              overflow: 'hidden',
                            }}>
                              <div style={{
                                width: `${skor.skor}%`, height: '100%',
                                background: skor.skor >= 90 ? '#16A34A' : skor.skor >= 75 ? '#CA8A04' : '#DC2626',
                              }} />
                            </div>
                            <span style={{ fontWeight: 700, fontSize: 'var(--font-size-xs)' }}>{skor.skor}%</span>
                          </div>
                        </td>
                        <td>
                          <span className="badge badge-success">Aktif</span>
                        </td>
                        <td>
                          <Link href={`/admin/guru/${g.id}`} className="btn btn-ghost btn-sm" style={{ fontSize: 11 }}>
                            Detail →
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ─── MODAL TAMBAH GURU BARU ─── */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal" style={{ maxWidth: 460 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 32, height: 32, borderRadius: 'var(--radius-md)', background: 'var(--color-primary-light)', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <UserCheck size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 800 }}>Tambah Guru Baru</h3>
                  <p style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>Daftarkan akun ustadz/ustadzah baru ke sistem</p>
                </div>
              </div>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowAddModal(false)} style={{ padding: 4 }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddGuru}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>

                {/* Nama Lengkap */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: 11, fontWeight: 700 }}>
                    Nama Lengkap Ustadz/Ustadzah <span style={{ color: 'red' }}>*</span>
                  </label>
                  <input
                    className="form-input"
                    placeholder="Contoh: Ustadz Ahmad Hidayat, S.Pd.I"
                    value={formData.nama}
                    onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                    required
                    autoFocus
                    style={{ fontSize: 13 }}
                  />
                </div>

                {/* Email Login */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: 11, fontWeight: 700 }}>
                    Alamat Email Login <span style={{ color: 'red' }}>*</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="email"
                      className="form-input"
                      placeholder="ahmad@muallim.sch.id atau ahmad@gmail.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                      style={{ paddingLeft: 34, fontSize: 12 }}
                    />
                    <Mail size={15} color="var(--color-text-tertiary)" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
                  </div>
                  <span style={{ fontSize: 10, color: 'var(--color-text-tertiary)', marginTop: 2, display: 'block' }}>
                    Email ini akan digunakan guru untuk login password &amp; Google Sign-In.
                  </span>
                </div>

                {/* Jabatan & Status */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: 11, fontWeight: 700 }}>
                      Jabatan / Peran
                    </label>
                    <select
                      className="form-select"
                      value={formData.jabatan}
                      onChange={(e) => setFormData({ ...formData, jabatan: e.target.value })}
                      style={{ fontSize: 12 }}
                    >
                      <option value="Guru Tahfidz">Guru Tahfidz</option>
                      <option value="Guru Kelas">Guru Kelas</option>
                      <option value="Guru Diniyah">Guru Diniyah</option>
                      <option value="Musyrif Asrama">Musyrif Asrama</option>
                      <option value="Koordinator Tahfidz">Koordinator Tahfidz</option>
                    </select>
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: 11, fontWeight: 700 }}>
                      Status Kepegawaian
                    </label>
                    <select
                      className="form-select"
                      value={formData.statusKepegawaian}
                      onChange={(e) => setFormData({ ...formData, statusKepegawaian: e.target.value as any })}
                      style={{ fontSize: 12 }}
                    >
                      <option value="tetap">Tetap</option>
                      <option value="honorer">Honorer</option>
                      <option value="magang">Magang</option>
                    </select>
                  </div>
                </div>

                {/* NIP & No WhatsApp */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: 'var(--space-3)' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label className="form-label" style={{ fontSize: 11, fontWeight: 700, marginBottom: 0 }}>
                        NIP / ID Yayasan
                      </label>
                      <span className="badge badge-primary" style={{ fontSize: 9 }}>Otomatis</span>
                    </div>
                    <input
                      className="form-input"
                      placeholder="MWA-2026-001"
                      value={formData.nip}
                      onChange={(e) => setFormData({ ...formData, nip: e.target.value })}
                      style={{ fontSize: 12, fontWeight: 700, marginTop: 4, letterSpacing: 0.5 }}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: 11, fontWeight: 700 }}>
                      No. WhatsApp
                    </label>
                    <input
                      className="form-input"
                      placeholder="081234567890"
                      value={formData.telepon}
                      onChange={(e) => setFormData({ ...formData, telepon: e.target.value })}
                      style={{ fontSize: 12 }}
                    />
                  </div>
                </div>

                {/* Password Notice Card */}
                <div style={{
                  padding: '10px 12px',
                  background: 'var(--color-surface-2)',
                  borderRadius: 'var(--radius-md)',
                  border: '1.5px dashed var(--color-border)',
                  fontSize: 11,
                  lineHeight: 1.45,
                }}>
                  <div style={{ fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 2, display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Key size={13} color="var(--color-primary)" />
                    Kata Sandi Default Baru:
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                    <code style={{ fontSize: 13, fontWeight: 800, color: 'var(--color-primary)', background: 'white', padding: '2px 8px', borderRadius: 4, border: '1px solid var(--color-border)' }}>
                      {authConfig.defaultGuruPassword}
                    </code>
                    <span style={{ fontSize: 10, color: 'var(--color-text-tertiary)' }}>
                      (Guru wajib ganti sandi saat login pertama)
                    </span>
                  </div>
                </div>

              </div>

              <div className="modal-footer" style={{ padding: 'var(--space-3) var(--space-4)' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setShowAddModal(false)}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  style={{ fontWeight: 700 }}
                >
                  Simpan &amp; Daftarkan Guru
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
