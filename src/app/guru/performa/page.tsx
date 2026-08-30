'use client';

import { useState, useEffect } from 'react';
import { Award, CheckCircle2, Clock, AlertCircle, XCircle, Star, TrendingUp, Info, Calendar, BookOpen } from 'lucide-react';
import { currentGuru, hitungSkorKedisiplinan, hitungPoinPartisipasi, mockAbsensi, mockPartisipasi, loadPersistedData, mockSettings } from '@/lib/mockData';
import { formatJamLengkap } from '@/lib/utils';
import type { Guru, AbsensiRecord, AppSettings } from '@/types';

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export default function PerformaPage() {
  const [activeGuru, setActiveGuru] = useState<Guru>(currentGuru);
  const [appSettings, setAppSettings] = useState<AppSettings>(mockSettings);
  const [absensiList, setAbsensiList] = useState<AbsensiRecord[]>([]);

  const now = new Date();
  const currentMonth = now.getMonth(); // 0-11
  const currentYear = now.getFullYear();
  const namaBulan = MONTH_NAMES[currentMonth];

  useEffect(() => {
    loadPersistedData();
    if (typeof window !== 'undefined') {
      const savedUser = localStorage.getItem('muallim_guru_user');
      if (savedUser) {
        try {
          const parsed = JSON.parse(savedUser);
          if (parsed && parsed.id) {
            setActiveGuru(parsed);
          }
        } catch (e) {}
      }

      const savedAbs = localStorage.getItem('muallim_absensi_list');
      if (savedAbs) {
        try {
          const parsed = JSON.parse(savedAbs);
          if (Array.isArray(parsed)) {
            setAbsensiList([...parsed]);
          }
        } catch (e) {}
      }

      const savedSettings = localStorage.getItem('muallim_app_settings');
      if (savedSettings) {
        try {
          const parsed = JSON.parse(savedSettings);
          if (parsed) {
            setAppSettings(parsed);
          }
        } catch (e) {}
      }
    }

    import('@/lib/supabaseClient').then(({ getAppSettingsSupabase, getAbsensiSupabase }) => {
      getAppSettingsSupabase().then((s) => {
        if (s) setAppSettings(s);
      }).catch(() => {});

      getAbsensiSupabase().then((data) => {
        if (Array.isArray(data)) setAbsensiList(data);
      }).catch(() => {});
    }).catch(() => {});
  }, []);

  const skor = hitungSkorKedisiplinan(activeGuru.id, currentMonth + 1, currentYear);
  const poin = hitungPoinPartisipasi(activeGuru.id, currentMonth + 1, currentYear);

  // Akumulasi Jam Mengajar Bulan Ini
  const filterBulanStr = String(currentMonth + 1).padStart(2, '0');
  const guruMonthlyRecords = (absensiList.length > 0 ? absensiList : mockAbsensi).filter((a) => {
    const [y, m] = a.tanggal.split('-');
    return a.guruId === activeGuru.id && y === String(currentYear) && m === filterBulanStr && (a.status === 'hadir_tepat_waktu' || a.status === 'terlambat');
  });

  const totalJamMengajar = Number(
    guruMonthlyRecords.reduce((sum, a) => {
      if (typeof a.jamDibayar === 'number') return sum + a.jamDibayar;
      if (typeof a.durasiMenit === 'number') return sum + Number((a.durasiMenit / 60).toFixed(2));
      return sum + 2;
    }, 0).toFixed(2)
  );

  const totalMenitMengajar = guruMonthlyRecords.reduce((sum, a) => {
    if (typeof a.durasiMenit === 'number') return sum + a.durasiMenit;
    if (typeof a.jamDibayar === 'number') return sum + Math.round(a.jamDibayar * 60);
    return sum + 120;
  }, 0);

  const gradeColor = skor.grade === 'Sangat Baik' ? 'var(--color-success)' :
    skor.grade === 'Baik' ? 'var(--color-info)' :
    skor.grade === 'Cukup' ? 'var(--color-warning)' : 'var(--color-danger)';

  const scorePct = skor.skor;
  const circumference = 2 * Math.PI * 52;
  const strokeDashoffset = circumference - (scorePct / 100) * circumference;

  return (
    <>
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 800 }}>Performa Saya Bulan Ini</h1>
            <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', marginTop: 2 }}>
              Penilaian kedisiplinan dan akumulasi jam mengajar periode {namaBulan} {currentYear}
            </p>
          </div>
          <span className="badge badge-primary" style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', fontSize: 11 }}>
            <Calendar size={13} /> {namaBulan} {currentYear}
          </span>
        </div>
      </div>

      <div style={{ padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>

        {/* AKUMULASI JAM MENGAJAR */}
        <div className="card" style={{ background: 'linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%)', border: '1.5px solid #86EFAC' }}>
          <div className="card-header" style={{ borderBottom: '1px solid rgba(22, 163, 74, 0.15)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <Clock size={18} color="#15803D" />
              <span style={{ fontWeight: 800, color: '#166534' }}>Akumulasi Jam Mengajar ({namaBulan})</span>
            </div>
            <span className="badge badge-success" style={{ fontWeight: 800 }}>
              {guruMonthlyRecords.length} Sesi Terlaksana
            </span>
          </div>
          <div className="card-body">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
              <div style={{ padding: '14px', background: 'white', borderRadius: 'var(--radius-md)', border: '1px solid #BBF7D0', textAlign: 'center' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#15803D', textTransform: 'uppercase' }}>Total Jam Mengajar</div>
                <div style={{ fontSize: 'var(--font-size-xl)', fontWeight: 800, color: '#166534', marginTop: 2 }}>
                  {formatJamLengkap(totalJamMengajar)}
                </div>
                <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 2 }}>
                  dari {guruMonthlyRecords.length} sesi hadir
                </div>
              </div>
              <div style={{ padding: '14px', background: 'white', borderRadius: 'var(--radius-md)', border: '1px solid #BBF7D0', textAlign: 'center' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#15803D', textTransform: 'uppercase' }}>Total Durasi Riil</div>
                <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 800, color: '#15803D', marginTop: 2 }}>
                  {totalMenitMengajar} <span style={{ fontSize: 13, fontWeight: 600 }}>Menit</span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 2 }}>
                  akumulasi waktu mengajar
                </div>
              </div>
            </div>
            <p style={{ fontSize: 11.5, color: '#166534', margin: 0, lineHeight: 1.5 }}>
              💡 <em>Jam mengajar dihitung berdasarkan waktu mengajar aktual yang diakui dengan toleransi keterlambatan <strong>{appSettings.batasKeterlambatan || 5} menit</strong>.</em>
            </p>
          </div>
        </div>

        {/* Reset Bulanan Info Banner */}
        <div style={{
          padding: '10px 14px',
          background: 'var(--color-primary-light)',
          borderRadius: 'var(--radius-md)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          border: '1px solid rgba(27,107,74,0.2)',
          fontSize: 'var(--font-size-xs)',
          color: 'var(--color-text-secondary)'
        }}>
          <Info size={16} color="var(--color-primary)" style={{ flexShrink: 0 }} />
          <span>
            Skor kedisiplinan dan akumulasi jam mengajar dievaluasi per bulan dan <strong>otomatis di-reset setiap awal bulan</strong>.
          </span>
        </div>

        {/* SKOR KEDISIPLINAN */}
        <div className="card">
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <TrendingUp size={18} color="var(--color-primary)" />
              <span style={{ fontWeight: 700 }}>Skor Kedisiplinan ({namaBulan})</span>
            </div>
            <span className="badge badge-success">{skor.grade}</span>
          </div>
          <div className="card-body">
            {/* Score Circle */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
              <div style={{ position: 'relative', width: 130, height: 130 }}>
                <svg width="130" height="130" style={{ transform: 'rotate(-90deg)' }}>
                  <circle cx="65" cy="65" r="52" fill="none" stroke="var(--color-border-light)" strokeWidth="10" />
                  <circle
                    cx="65" cy="65" r="52" fill="none"
                    stroke={gradeColor}
                    strokeWidth="10"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 0.8s ease' }}
                  />
                </svg>
                <div style={{
                  position: 'absolute', inset: 0, display: 'flex',
                  flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                }}>
                  <span style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 800, color: gradeColor, lineHeight: 1 }}>
                    {skor.skor}
                  </span>
                  <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>/ 100</span>
                </div>
              </div>
              <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginTop: 'var(--space-2)', fontWeight: 600 }}>
                {skor.grade}
              </div>
            </div>

            {/* Detail Stats */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <StatRow icon={<CheckCircle2 size={16} color="var(--color-success)" />} label="Hadir Tepat Waktu" value={skor.hadirTepatWaktu} unit="sesi" color="success" />
              <StatRow icon={<Clock size={16} color="var(--color-warning)" />} label="Terlambat" value={skor.terlambat} unit="sesi" color="warning" />
              <StatRow icon={<XCircle size={16} color="var(--color-danger)" />} label="Alfa (Tanpa Keterangan)" value={skor.alfa} unit="sesi" color="danger" />
            </div>

            {/* Progress bar */}
            <div style={{ marginTop: 'var(--space-5)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-2)', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>
                <span>Konsistensi Kehadiran</span>
                <span>{Math.round((skor.hadirTepatWaktu / Math.max(skor.totalHariKerja, 1)) * 100)}%</span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{
                  width: `${Math.round((skor.hadirTepatWaktu / Math.max(skor.totalHariKerja, 1)) * 100)}%`,
                  background: gradeColor,
                }} />
              </div>
            </div>
          </div>
        </div>

        {/* POIN PARTISIPASI */}
        <div className="card">
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <Star size={18} color="var(--color-accent)" />
              <span style={{ fontWeight: 700 }}>Poin Partisipasi</span>
            </div>
          </div>
          <div className="card-body">
            {/* Total Points */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: 'var(--space-5)', marginBottom: 'var(--space-5)',
              background: 'var(--color-accent-light)', borderRadius: 'var(--radius-lg)',
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 'var(--font-size-4xl)', fontWeight: 800, color: 'var(--color-accent)', lineHeight: 1 }}>
                  {poin.poinTotal}
                </div>
                <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-accent)', opacity: 0.8, marginTop: 4, fontWeight: 600 }}>
                  Total Poin Partisipasi
                </div>
              </div>
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
              <div style={{ padding: 'var(--space-3)', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-md)', textAlign: 'center', border: '1px solid var(--color-border-light)' }}>
                <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 800, color: 'var(--color-primary)' }}>{poin.totalKegiatan}</div>
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', marginTop: 2 }}>Total Kegiatan</div>
              </div>
              <div style={{ padding: 'var(--space-3)', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-md)', textAlign: 'center', border: '1px solid var(--color-border-light)' }}>
                <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 800, color: 'var(--color-success)' }}>{poin.hadir}</div>
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', marginTop: 2 }}>Hadir Terverifikasi</div>
              </div>
            </div>

            {/* Riwayat Poin */}
            <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 700, marginBottom: 'var(--space-3)' }}>
              Riwayat Poin
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {mockPartisipasi
                .filter((p) => p.guruId === activeGuru.id && p.hadirVerifikasi === true && p.poinDiterima > 0)
                .map((p) => (
                  <div key={p.id} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: 'var(--space-3)', background: 'var(--color-surface-2)',
                    borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border-light)',
                  }}>
                    <div>
                      <div style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600 }}>
                        {p.jenisPartisipasi === 'panitia' ? 'Panitia' : p.jenisPartisipasi === 'koordinator' ? 'Koordinator' : 'Peserta'}
                      </div>
                      <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>
                        Kegiatan Terverifikasi
                      </div>
                    </div>
                    <span style={{ fontWeight: 800, color: 'var(--color-accent)', fontSize: 'var(--font-size-base)' }}>
                      +{p.poinDiterima}
                    </span>
                  </div>
                ))
              }
              {mockPartisipasi.filter((p) => p.guruId === activeGuru.id && p.hadirVerifikasi === true && p.poinDiterima > 0).length === 0 && (
                <div style={{ textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-sm)', padding: 'var(--space-4)' }}>
                  Belum ada poin yang diterima
                </div>
              )}
            </div>

            {/* Points system */}
            <div style={{
              marginTop: 'var(--space-4)', padding: 'var(--space-3)',
              background: 'var(--color-surface-2)', borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border-light)',
            }}>
              <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', lineHeight: 1.6, fontWeight: 600, marginBottom: 6 }}>
                Sistem Poin Kegiatan:
              </p>
              <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', lineHeight: 1.8 }}>
                Peserta: +10 poin &nbsp;|&nbsp; Panitia: +20 poin &nbsp;|&nbsp; Koordinator: +30 poin<br />
                Poin diberikan hanya setelah kehadiran diverifikasi oleh Admin.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function StatRow({ icon, label, value, unit, color }: { icon: React.ReactNode; label: string; value: number; unit: string; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--space-3)', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border-light)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
        {icon}
        <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>{label}</span>
      </div>
      <span style={{ fontSize: 'var(--font-size-base)', fontWeight: 700, color: `var(--color-${color})` }}>
        {value} <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 400, color: 'var(--color-text-tertiary)' }}>{unit}</span>
      </span>
    </div>
  );
}
