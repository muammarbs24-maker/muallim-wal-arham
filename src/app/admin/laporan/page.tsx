'use client';

import { useState, useEffect } from 'react';
import {
  Download,
  BarChart2,
  FileText,
  Calendar,
  Clock,
  Mail,
  ChevronLeft,
  ChevronRight,
  Search,
  User,
  Filter,
  ArrowRight,
  BookOpen,
} from 'lucide-react';
import {
  mockAbsensi,
  mockGuru,
  mockJadwal,
  getNamaHari,
  loadPersistedData,
  masterAdmin,
} from '@/lib/mockData';
import {
  getStatusLabel,
  getTodayStringWITA,
  getMonthName,
  hitungDurasi,
  hitungDurasiMenit,
} from '@/lib/utils';
import type { AttendanceStatus, AbsensiRecord, Guru } from '@/types';

const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  hadir_tepat_waktu: { bg: '#E8F5EE', text: '#1B6B4A', label: 'Hadir' },
  terlambat: { bg: '#FEF3C7', text: '#B45309', label: 'Terlambat' },
  izin: { bg: '#DBEAFE', text: '#1D4ED8', label: 'Izin' },
  sakit: { bg: '#F3E8FF', text: '#6B21A8', label: 'Sakit' },
  alfa: { bg: '#FEE2E2', text: '#B91C1C', label: 'Alfa' },
  belum_absen: { bg: '#F3F4F6', text: '#4B5563', label: 'Belum Absen' },
};

/** Format menit total menjadi "X jam Y menit" */
function formatTotalMenit(totalMenit: number): string {
  if (totalMenit <= 0) return '—';
  const jam = Math.floor(totalMenit / 60);
  const menit = totalMenit % 60;
  if (jam === 0) return `${menit} mnt`;
  if (menit === 0) return `${jam} jam`;
  return `${jam}j ${menit}m`;
}

export default function AdminLaporanPage() {
  const [activeReport, setActiveReport] = useState<'harian' | 'bulanan' | 'rekap'>('harian');
  
  // States untuk Filters
  const [filterTanggal, setFilterTanggal] = useState(getTodayStringWITA());
  const [filterBulan, setFilterBulan] = useState(
    String(new Date().getMonth() + 1).padStart(2, '0')
  );
  const [filterTahun, setFilterTahun] = useState(String(new Date().getFullYear()));
  
  // Search & Filter Status
  const [searchTermHarian, setSearchTermHarian] = useState('');
  const [statusFilterHarian, setStatusFilterHarian] = useState<string>('semua');
  
  const [selectedGuruId, setSelectedGuruId] = useState<string>('');
  const [statusFilterRekap, setStatusFilterRekap] = useState<string>('semua');

  const [absensiList, setAbsensiList] = useState<AbsensiRecord[]>([]);
  const [guruList, setGuruList] = useState<Guru[]>([]);
  const [adminEmail, setAdminEmail] = useState(masterAdmin.email || 'admin@muallim.sch.id');
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [showToast, setShowToast] = useState<string | null>(null);

  const refreshData = () => {
    loadPersistedData();
    if (typeof window !== 'undefined') {
      try {
        const savedAbs = localStorage.getItem('muallim_absensi_list');
        if (savedAbs) {
          const parsed = JSON.parse(savedAbs);
          if (Array.isArray(parsed)) {
            setAbsensiList([...parsed]);
          }
        } else {
          setAbsensiList([]);
        }

        const savedGurus = localStorage.getItem('muallim_guru_list');
        if (savedGurus) {
          const parsed = JSON.parse(savedGurus);
          if (Array.isArray(parsed)) {
            setGuruList([...parsed]);
          }
        } else {
          setGuruList([...mockGuru]);
        }
      } catch (e) {}
    }
  };

  useEffect(() => {
    refreshData();

    import('@/lib/supabaseClient').then(({ getAbsensiSupabase, getGurusSupabase, getAdminAccountSupabase }) => {
      getAbsensiSupabase().then((data) => {
        if (data !== null && data !== undefined) {
          setAbsensiList(data);
          mockAbsensi.length = 0;
          mockAbsensi.push(...data);
        }
      }).catch(() => {});

      getGurusSupabase().then((gurus) => {
        if (gurus && gurus.length > 0) {
          setGuruList(gurus);
          mockGuru.length = 0;
          mockGuru.push(...gurus);
        }
      }).catch(() => {});

      getAdminAccountSupabase().then((admin) => {
        if (admin?.email) {
          setAdminEmail(admin.email);
        }
      }).catch(() => {});
    }).catch(() => {});
  }, []);

  // Set default selected guru when teacher list loaded
  useEffect(() => {
    const list = guruList.length > 0 ? guruList : mockGuru;
    if (list.length > 0 && !selectedGuruId) {
      const activeFirst = list.find((g) => g.aktif);
      if (activeFirst) setSelectedGuruId(activeFirst.id);
      else setSelectedGuruId(list[0].id);
    }
  }, [guruList, selectedGuruId]);

  // Date handlers
  const handlePrevDate = () => {
    const d = new Date(filterTanggal);
    d.setDate(d.getDate() - 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    setFilterTanggal(`${y}-${m}-${day}`);
  };

  const handleNextDate = () => {
    const d = new Date(filterTanggal);
    d.setDate(d.getDate() + 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    setFilterTanggal(`${y}-${m}-${day}`);
  };

  const handleTodayDate = () => {
    setFilterTanggal(getTodayStringWITA());
  };

  const handleSendEmailReportNow = async () => {
    setIsSendingEmail(true);
    try {
      const res = await fetch('/api/cron/laporan-bulanan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bulan: filterBulan,
          tahun: filterTahun,
          recipient: adminEmail,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowToast(`✓ Laporan bulanan (${data.periode}) berhasil dikirimkan ke email pemilik (${data.recipient})!`);
      } else {
        setShowToast(`❌ Gagal mengirim: ${data.error || 'Terjadi kesalahan sistem'}`);
      }
    } catch (e) {
      setShowToast('❌ Terjadi kendala saat mengirim email laporan.');
    }
    setIsSendingEmail(false);
    setTimeout(() => setShowToast(null), 4500);
  };

  // Client-side CSV Exporter
  const handleExportCSV = () => {
    let csvContent = 'data:text/csv;charset=utf-8,';
    
    if (activeReport === 'harian') {
      csvContent += 'Nama Guru,Jabatan,Hari,Jam Masuk,Jam Pulang,Total Jam Kerja,Status,Keterlambatan,Keterangan\n';
      const dayName = getNamaHari(filterTanggal);
      harianData.forEach((a) => {
        const g = (guruList.length > 0 ? guruList : mockGuru).find((g) => g.id === a.guruId);
        const durasi = hitungDurasi(a.jamMasuk, a.jamPulang);
        const lateLabel = a.keterlambatan > 0 ? `${a.keterlambatan} menit` : 'Tepat Waktu';
        csvContent += `"${a.guruNama}","${g?.jabatan || 'Guru'}","${dayName}","${a.jamMasuk || '—'}","${a.jamPulang || '—'}","${durasi}","${getStatusLabel(a.status)}","${lateLabel}","${a.keterangan || '—'}"\n`;
      });
    } else if (activeReport === 'bulanan') {
      csvContent += 'Nama Guru,Jabatan,Hadir,Izin,Sakit,Alfa,Total Hari,Total Jam Kerja,Terlambat,Kehadiran (%)\n';
      rekapData.forEach((r) => {
        const presenceRate = r.total > 0 ? Math.round(((r.hadir + r.terlambat) / r.total) * 100) : 100;
        csvContent += `"${r.guru.nama}","${r.guru.jabatan}","${r.hadir}","${r.izin}","${r.sakit}","${r.alfa}","${r.total}","${formatTotalMenit(r.totalMenit)}","${r.terlambat}x","${presenceRate}%"\n`;
      });
    } else {
      const g = (guruList.length > 0 ? guruList : mockGuru).find((g) => g.id === selectedGuruId);
      if (g) {
        csvContent += `Laporan Detail Guru: ${g.nama} (${g.jabatan})\n`;
        csvContent += 'Tanggal,Hari,Jam Masuk,Jam Pulang,Total Jam Kerja,Status,Keterlambatan,Keterangan\n';
        guruBulananAbs.forEach((a) => {
          const durasi = hitungDurasi(a.jamMasuk, a.jamPulang);
          const dayName = getNamaHari(a.tanggal);
          const lateLabel = a.keterlambatan > 0 ? `${a.keterlambatan} menit` : 'Tepat Waktu';
          csvContent += `"${a.tanggal}","${dayName}","${a.jamMasuk || '—'}","${a.jamPulang || '—'}","${durasi}","${getStatusLabel(a.status)}","${lateLabel}","${a.keterangan || '—'}"\n`;
        });
      }
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    const filename = `SIPETA_${activeReport}_rekap_${filterTahun}_${filterBulan}_${filterTanggal}.csv`;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 1. Calculations for Daily Report
  const harianData = absensiList.filter((a) => a.tanggal === filterTanggal);
  const filteredHarianData = harianData.filter((a) => {
    const matchesSearch = a.guruNama.toLowerCase().includes(searchTermHarian.toLowerCase());
    const matchesStatus = statusFilterHarian === 'semua' || a.status === statusFilterHarian;
    return matchesSearch && matchesStatus;
  });

  const harianDayOfWeek = getNamaHari(filterTanggal);
  const harianScheduledIds = mockJadwal
    .filter((j) => j.hari === harianDayOfWeek && j.aktif)
    .map((j) => j.guruId);
  const uniqueHarianScheduledIds = Array.from(new Set(harianScheduledIds));
  const totalGuruTerjadwalHarian = uniqueHarianScheduledIds.length || (guruList.length > 0 ? guruList.filter(g => g.aktif).length : mockGuru.filter(g => g.aktif).length);

  const harianHadirCount = harianData.filter((a) => a.status === 'hadir_tepat_waktu' || a.status === 'terlambat').length;
  const harianTidakHadirCount = harianData.filter((a) => a.status === 'izin' || a.status === 'sakit' || a.status === 'alfa').length;
  const harianTotalMenit = harianData.reduce((sum, a) => sum + hitungDurasiMenit(a.jamMasuk, a.jamPulang), 0);
  const harianTotalJamLabel = `${Math.floor(harianTotalMenit / 60)} Jam`;

  // 2. Calculations for Monthly Report
  const bulananData = absensiList.filter((a) => {
    const [y, m] = a.tanggal.split('-');
    return y === filterTahun && m === filterBulan;
  });

  const rekapData = (guruList.length > 0 ? guruList : mockGuru)
    .filter((g) => g.aktif)
    .map((g) => {
      const abs = bulananData.filter((a) => a.guruId === g.id);
      const totalMenit = abs.reduce((sum, a) => sum + hitungDurasiMenit(a.jamMasuk, a.jamPulang), 0);
      return {
        guru: g,
        hadir: abs.filter((a) => a.status === 'hadir_tepat_waktu').length,
        terlambat: abs.filter((a) => a.status === 'terlambat').length,
        izin: abs.filter((a) => a.status === 'izin').length,
        sakit: abs.filter((a) => a.status === 'sakit').length,
        alfa: abs.filter((a) => a.status === 'alfa').length,
        total: abs.length,
        totalMenit,
      };
    });

  const totalGuruBulanan = rekapData.length;
  const totalBulananAlfa = rekapData.reduce((sum, r) => sum + r.alfa, 0);
  const totalBulananKeterlambatan = rekapData.reduce((sum, r) => sum + r.terlambat, 0);
  const totalBulananMenit = rekapData.reduce((sum, r) => sum + r.totalMenit, 0);
  const totalBulananJamLabel = `${Math.round(totalBulananMenit / 60).toLocaleString('id-ID')} Jam`;

  const totalBulananKehadiranRate = rekapData.reduce((sum, r) => {
    const rate = r.total > 0 ? ((r.hadir + r.terlambat) / r.total) * 100 : 100;
    return sum + rate;
  }, 0);
  const rataRataKehadiranRate = totalGuruBulanan > 0
    ? (totalBulananKehadiranRate / totalGuruBulanan).toFixed(1) + '%'
    : '100%';

  // 3. Calculations for Selected Teacher Recap
  const selectedGuru = (guruList.length > 0 ? guruList : mockGuru).find((g) => g.id === selectedGuruId);
  const guruBulananAbs = absensiList.filter((a) => {
    const [y, m] = a.tanggal.split('-');
    return a.guruId === selectedGuruId && y === filterTahun && m === filterBulan;
  });

  const filteredGuruAbs = guruBulananAbs.filter((a) => {
    return statusFilterRekap === 'semua' || a.status === statusFilterRekap;
  });

  const rekapGuruStats = {
    hadir: guruBulananAbs.filter((a) => a.status === 'hadir_tepat_waktu').length,
    terlambat: guruBulananAbs.filter((a) => a.status === 'terlambat').length,
    izin: guruBulananAbs.filter((a) => a.status === 'izin').length,
    sakit: guruBulananAbs.filter((a) => a.status === 'sakit').length,
    alfa: guruBulananAbs.filter((a) => a.status === 'alfa').length,
    total: guruBulananAbs.length,
    totalMenit: guruBulananAbs.reduce((sum, a) => sum + hitungDurasiMenit(a.jamMasuk, a.jamPulang), 0),
  };

  const rekapGuruKehadiranRate = rekapGuruStats.total > 0
    ? ((rekapGuruStats.hadir + rekapGuruStats.terlambat) / rekapGuruStats.total * 100).toFixed(1) + '%'
    : '—';

  // Get active teacher weekly presence pattern (divide month into 4 weeks)
  const getWeeklyData = () => {
    const weeks = [
      { label: 'Mg 1', days: [1, 2, 3, 4, 5, 6, 7], hadir: 0, total: 0 },
      { label: 'Mg 2', days: [8, 9, 10, 11, 12, 13, 14], hadir: 0, total: 0 },
      { label: 'Mg 3', days: [15, 16, 17, 18, 19, 20, 21], hadir: 0, total: 0 },
      { label: 'Mg 4', days: [22, 23, 24, 25, 26, 27, 28, 29, 30, 31], hadir: 0, total: 0 },
    ];

    guruBulananAbs.forEach((a) => {
      const dayNum = new Date(a.tanggal).getDate();
      weeks.forEach((w) => {
        if (w.days.includes(dayNum)) {
          w.total += 1;
          if (a.status === 'hadir_tepat_waktu' || a.status === 'terlambat') {
            w.hadir += 1;
          }
        }
      });
    });

    return weeks.map((w) => ({
      label: w.label,
      rate: w.total > 0 ? Math.round((w.hadir / w.total) * 100) : 0,
      hadir: w.hadir,
      total: w.total,
    }));
  };
  const weeklyData = getWeeklyData();

  // Get unique classes scheduled for selected teacher
  const selectedGuruJadwal = mockJadwal.filter((j) => j.guruId === selectedGuruId && j.aktif);
  const uniqueMataPelajaran = Array.from(new Set(selectedGuruJadwal.map((j) => j.mataPelajaran)));
  const mataPelajaranLabel = uniqueMataPelajaran.length > 0 ? uniqueMataPelajaran.join(', ') : '—';
  const totalJadwalLabel = `${selectedGuruJadwal.length} Kelas`;

  // Get initials for avatar
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .slice(0, 2)
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  };

  return (
    <div>
      {/* Toast Notification */}
      {showToast && (
        <div
          className="toast-container"
          style={{
            position: 'fixed',
            top: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 9999,
          }}
        >
          <div className="toast toast-success" style={{ boxShadow: 'var(--shadow-md)', fontWeight: 600 }}>
            {showToast}
          </div>
        </div>
      )}

      {/* Topbar / Header (Standard SIPETA layout) */}
      <div className="admin-topbar">
        <div>
          <h1 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 800 }}>Laporan Presensi</h1>
          <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>
            Rekapitulasi kehadiran dan jam kerja tenaga pengajar.
          </p>
        </div>

        {/* Action buttons on top right */}
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={handleExportCSV}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontWeight: 700,
              fontSize: '12px',
              padding: '6px 12px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
              backgroundColor: 'var(--color-surface)',
              color: 'var(--color-text-secondary)',
              transition: 'all 0.15s ease',
              boxShadow: 'var(--shadow-xs)',
            }}
          >
            <Download size={14} /> Export CSV
          </button>
          
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={handleSendEmailReportNow}
            disabled={isSendingEmail}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontWeight: 700,
              fontSize: '12px',
              padding: '6px 12px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--color-primary)',
              color: 'white',
              transition: 'all 0.15s ease',
            }}
          >
            {isSendingEmail ? (
              <>
                <span className="animate-spin"><Clock size={13} /></span> Mengirim...
              </>
            ) : (
              <>
                <Mail size={14} /> Kirim Laporan
              </>
            )}
          </button>
        </div>
      </div>

      {/* Content wrapper with unified spacing */}
      <div className="admin-content" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', paddingBottom: 'var(--space-12)' }}>
        
        {/* Tab Selection */}
        <div
          style={{
            display: 'flex',
            gap: 8,
            borderBottom: '2px solid var(--color-border-light)',
            paddingBottom: 'var(--space-2)',
            overflowX: 'auto',
            scrollbarWidth: 'none',
          }}
        >
          {[
            { key: 'harian', label: 'Laporan Harian', icon: <Calendar size={14} /> },
            { key: 'bulanan', label: 'Laporan Bulanan', icon: <BarChart2 size={14} /> },
            { key: 'rekap', label: 'Rekap Per Guru', icon: <User size={14} /> },
          ].map(({ key, label, icon }) => {
            const active = activeReport === key;
            return (
              <button
                key={key}
                type="button"
                className={`tab-pill ${active ? 'active' : ''}`}
                onClick={() => setActiveReport(key as typeof activeReport)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '7px 16px',
                  borderRadius: 9999,
                  fontSize: 12,
                  fontWeight: 700,
                  border: active ? '1.5px solid var(--color-primary)' : '1px solid var(--color-border)',
                  background: active ? 'var(--color-primary)' : 'var(--color-surface)',
                  color: active ? '#ffffff' : 'var(--color-text-secondary)',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease',
                }}
              >
                {icon} {label}
              </button>
            );
          })}
        </div>

        {/* ============================================================
            1. LAPORAN HARIAN
            ============================================================ */}
        {activeReport === 'harian' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            
            {/* Filter Area (Desktop: Left controls, Right search/filter) */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: 'var(--color-surface)',
                padding: 'var(--space-3) var(--space-4)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)',
                boxShadow: 'var(--shadow-xs)',
                flexWrap: 'wrap',
                gap: 12,
              }}
            >
              {/* Left Group: Date filters */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-secondary)', marginRight: 4 }}>
                  Tanggal:
                </span>
                
                <button
                  type="button"
                  onClick={handlePrevDate}
                  style={{
                    padding: '6px 10px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--color-border)',
                    backgroundColor: 'var(--color-surface)',
                    color: 'var(--color-text-secondary)',
                  }}
                >
                  <ChevronLeft size={14} />
                </button>
                
                <input
                  type="date"
                  className="form-input"
                  style={{
                    padding: '5px 10px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--color-border)',
                    fontSize: '13px',
                    fontWeight: 600,
                    width: '150px',
                    height: '32px',
                  }}
                  value={filterTanggal}
                  onChange={(e) => setFilterTanggal(e.target.value)}
                />
                
                <button
                  type="button"
                  onClick={handleNextDate}
                  style={{
                    padding: '6px 10px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--color-border)',
                    backgroundColor: 'var(--color-surface)',
                    color: 'var(--color-text-secondary)',
                  }}
                >
                  <ChevronRight size={14} />
                </button>

                <button
                  type="button"
                  onClick={handleTodayDate}
                  style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    backgroundColor: 'var(--color-primary-light)',
                    color: 'var(--color-primary)',
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: 'none',
                    height: '32px',
                    marginLeft: 4,
                  }}
                >
                  Hari Ini
                </button>
              </div>

              {/* Right Group: Search and status dropdown */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', width: '200px' }}>
                  <Search
                    size={14}
                    style={{
                      position: 'absolute',
                      left: 10,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: 'var(--color-text-tertiary)',
                    }}
                  />
                  <input
                    type="text"
                    placeholder="Cari guru..."
                    style={{
                      padding: '5px 10px 5px 30px',
                      width: '100%',
                      fontSize: '13px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--color-border)',
                      height: '32px',
                    }}
                    value={searchTermHarian}
                    onChange={(e) => setSearchTermHarian(e.target.value)}
                  />
                </div>

                <select
                  className="form-select"
                  style={{
                    padding: '5px 10px',
                    fontSize: '13px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--color-border)',
                    minWidth: '130px',
                    height: '32px',
                  }}
                  value={statusFilterHarian}
                  onChange={(e) => setStatusFilterHarian(e.target.value)}
                >
                  <option value="semua">Semua Status</option>
                  <option value="hadir_tepat_waktu">Hadir Tepat Waktu</option>
                  <option value="terlambat">Terlambat</option>
                  <option value="izin">Izin</option>
                  <option value="sakit">Sakit</option>
                  <option value="alfa">Alfa</option>
                </select>
              </div>
            </div>

            {/* Summary Cards Grid (Exactly 4 cards in one horizontal row on desktop) */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: 'var(--space-4)',
              }}
            >
              {[
                {
                  title: 'Total Guru Terjadwal',
                  value: `${totalGuruTerjadwalHarian} Guru`,
                  sub: `${harianData.length} data absensi`,
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text-primary)',
                  bg: 'var(--color-surface)',
                },
                {
                  title: 'Hadir',
                  value: String(harianHadirCount),
                  sub: 'tepat waktu & terlambat',
                  border: '1px solid rgba(27, 107, 74, 0.15)',
                  bg: '#F4FBF7',
                  color: 'var(--color-success)',
                },
                {
                  title: 'Tidak Hadir',
                  value: String(harianTidakHadirCount),
                  sub: 'izin, sakit, & alfa',
                  border: '1px solid rgba(185, 28, 28, 0.12)',
                  bg: '#FDF4F4',
                  color: 'var(--color-danger)',
                },
                {
                  title: 'Total Jam Kerja',
                  value: harianTotalJamLabel,
                  sub: `dari ${harianHadirCount} guru hadir`,
                  border: '1px solid rgba(200, 150, 15, 0.12)',
                  bg: '#FCFAF2',
                  color: 'var(--color-accent)',
                },
              ].map((s, idx) => (
                <div
                  key={idx}
                  style={{
                    backgroundColor: s.bg,
                    border: s.border,
                    padding: 'var(--space-4)',
                    borderRadius: 'var(--radius-lg)',
                    boxShadow: 'var(--shadow-xs)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    minHeight: '100px',
                  }}
                >
                  <span style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--color-text-tertiary)' }}>
                    {s.title}
                  </span>
                  <span style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 800, color: s.color, margin: '2px 0' }}>
                    {s.value}
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--color-text-tertiary)' }}>
                    {s.sub}
                  </span>
                </div>
              ))}
            </div>

            {/* Table Card */}
            <div className="card" style={{ overflow: 'hidden', boxShadow: 'var(--shadow-xs)', borderRadius: 'var(--radius-lg)' }}>
              <div className="table-container" style={{ border: 'none', borderRadius: 0, overflowX: 'auto' }}>
                <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1.5px solid var(--color-border)', height: '48px', backgroundColor: 'var(--color-surface-2)' }}>
                      <th style={{ textAlign: 'left', padding: '0 var(--space-4)', fontSize: '12px', fontWeight: 800, color: 'var(--color-text-secondary)', width: '22%' }}>Guru</th>
                      <th style={{ textAlign: 'left', padding: '0 var(--space-3)', fontSize: '12px', fontWeight: 800, color: 'var(--color-text-secondary)', width: '15%' }}>Jadwal</th>
                      <th style={{ textAlign: 'left', padding: '0 var(--space-3)', fontSize: '12px', fontWeight: 800, color: 'var(--color-text-secondary)', width: '12%' }}>Check In</th>
                      <th style={{ textAlign: 'left', padding: '0 var(--space-3)', fontSize: '12px', fontWeight: 800, color: 'var(--color-text-secondary)', width: '12%' }}>Check Out</th>
                      <th style={{ textAlign: 'left', padding: '0 var(--space-3)', fontSize: '12px', fontWeight: 800, color: 'var(--color-primary)', width: '15%' }}>Total Jam</th>
                      <th style={{ textAlign: 'left', padding: '0 var(--space-3)', fontSize: '12px', fontWeight: 800, color: 'var(--color-text-secondary)', width: '12%' }}>Status</th>
                      <th style={{ textAlign: 'left', padding: '0 var(--space-3)', fontSize: '12px', fontWeight: 800, color: 'var(--color-text-secondary)', width: '12%' }}>Keterlambatan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredHarianData.map((a) => {
                      const g = (guruList.length > 0 ? guruList : mockGuru).find((g) => g.id === a.guruId);
                      const schedule = mockJadwal.find((j) => j.guruId === a.guruId && j.hari === harianDayOfWeek && j.aktif);
                      const jadwalLabel = schedule ? `${schedule.jamMulai}–${schedule.jamSelesai}` : '—';
                      const durasi = hitungDurasi(a.jamMasuk, a.jamPulang);
                      const colors = STATUS_COLORS[a.status] || STATUS_COLORS.belum_absen;
                      const isLate = a.status === 'terlambat';

                      return (
                        <tr key={a.id} style={{ borderBottom: '1px solid var(--color-border-light)', height: '52px' }}>
                          <td style={{ padding: '0 var(--space-4)', verticalAlign: 'middle' }}>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span style={{ fontWeight: 700, fontSize: '13px', color: 'var(--color-text-primary)' }}>
                                {a.guruNama.split(',')[0]}
                              </span>
                              <span style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', marginTop: 1 }}>
                                {g?.jabatan || 'Guru Pengajar'}
                              </span>
                            </div>
                          </td>
                          <td style={{ padding: '0 var(--space-3)', fontSize: '12.5px', fontWeight: 600, color: 'var(--color-text-secondary)', verticalAlign: 'middle' }}>
                            {jadwalLabel}
                          </td>
                          <td style={{ padding: '0 var(--space-3)', fontSize: '12.5px', fontWeight: 500, verticalAlign: 'middle' }}>
                            {a.jamMasuk ? `${a.jamMasuk} WITA` : '—'}
                          </td>
                          <td style={{ padding: '0 var(--space-3)', fontSize: '12.5px', fontWeight: 500, verticalAlign: 'middle' }}>
                            {a.jamPulang ? (
                              `${a.jamPulang} WITA`
                            ) : (
                              <span style={{ color: 'var(--color-text-tertiary)', fontStyle: 'italic', fontSize: '11.5px' }}>
                                Belum absen
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '0 var(--space-3)', verticalAlign: 'middle' }}>
                            {durasi !== '—' ? (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 700, color: 'var(--color-primary)', fontSize: '12.5px' }}>
                                <Clock size={11} /> {durasi}
                              </span>
                            ) : (
                              <span style={{ color: 'var(--color-text-tertiary)', fontSize: '11.5px' }}>
                                {a.jamMasuk && !a.jamPulang ? 'Sedang berlangsung' : '—'}
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '0 var(--space-3)', verticalAlign: 'middle' }}>
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '3px 8px',
                                borderRadius: 'var(--radius-sm)',
                                fontSize: '10.5px',
                                fontWeight: 800,
                                backgroundColor: colors.bg,
                                color: colors.text,
                                textTransform: 'uppercase',
                                letterSpacing: '0.3px',
                              }}
                            >
                              {colors.label}
                            </span>
                          </td>
                          <td style={{ padding: '0 var(--space-3)', verticalAlign: 'middle' }}>
                            {isLate ? (
                              <span style={{ color: 'var(--color-warning)', fontWeight: 700, fontSize: '12.5px' }}>
                                {a.keterlambatan} Menit
                              </span>
                            ) : a.status === 'hadir_tepat_waktu' ? (
                              <span style={{ color: 'var(--color-success)', fontWeight: 600, fontSize: '12px' }}>
                                Tepat Waktu
                              </span>
                            ) : (
                              <span style={{ color: 'var(--color-text-tertiary)' }}>—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {filteredHarianData.length === 0 && (
                <div style={{ textAlign: 'center', padding: 'var(--space-6) 0', borderTop: '1px solid var(--color-border-light)' }}>
                  <p style={{ fontWeight: 700, color: 'var(--color-text-secondary)', fontSize: '14px' }}>Tidak Ada Data Absensi</p>
                  <p style={{ fontSize: '12px', color: 'var(--color-text-tertiary)', marginTop: 2 }}>Silakan pilih tanggal lain atau cari guru lain.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============================================================
            2. LAPORAN BULANAN
            ============================================================ */}
        {activeReport === 'bulanan' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            
            {/* Automatic Cron Info Bar (Compact & Refined alignment) */}
            <div
              style={{
                padding: '8px 16px',
                backgroundColor: 'rgba(27, 107, 74, 0.04)',
                border: '1px solid rgba(27, 107, 74, 0.12)',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 12,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    backgroundColor: 'var(--color-primary-light)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Mail size={13} color="var(--color-primary)" />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '12px', color: 'var(--color-primary-dark)', fontWeight: 700 }}>
                    Rekap bulanan dikirim otomatis setiap tanggal 1 pukul 08:00 WITA
                  </span>
                  <span style={{ fontSize: '10.5px', color: 'var(--color-text-tertiary)', marginTop: 1 }}>
                    Penerima: {adminEmail}
                  </span>
                </div>
              </div>
              
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSendEmailReportNow}
                disabled={isSendingEmail}
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '5px 12px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--color-primary)',
                  color: 'white',
                }}
              >
                Kirim Sekarang
              </button>
            </div>

            {/* Filter Periode Layout (Horizontal & Compact) */}
            <div
              style={{
                display: 'flex',
                backgroundColor: 'var(--color-surface)',
                padding: 'var(--space-3) var(--space-4)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)',
                boxShadow: 'var(--shadow-xs)',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 12,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>Periode:</span>
                
                <select
                  className="form-select"
                  style={{
                    padding: '5px 10px',
                    fontSize: '13px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--color-border)',
                    minWidth: '120px',
                    height: '32px',
                  }}
                  value={filterBulan}
                  onChange={(e) => setFilterBulan(e.target.value)}
                >
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i + 1} value={String(i + 1).padStart(2, '0')}>
                      {getMonthName(i + 1)}
                    </option>
                  ))}
                </select>

                <select
                  className="form-select"
                  style={{
                    padding: '5px 10px',
                    fontSize: '13px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--color-border)',
                    minWidth: '85px',
                    height: '32px',
                  }}
                  value={filterTahun}
                  onChange={(e) => setFilterTahun(e.target.value)}
                >
                  {Array.from({ length: 5 }, (_, i) => {
                    const yearVal = String(new Date().getFullYear() - 2 + i);
                    return (
                      <option key={yearVal} value={yearVal}>
                        {yearVal}
                      </option>
                    );
                  })}
                </select>

                <span style={{ fontSize: '12.5px', color: 'var(--color-text-tertiary)', marginLeft: 8 }}>
                  Menampilkan rekap presensi {getMonthName(parseInt(filterBulan, 10))} {filterTahun}
                </span>
              </div>
              
              <div>
                <span className="badge badge-neutral" style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '4px' }}>
                  {totalGuruBulanan} Guru Aktif • {bulananData.length} Catatan Absen
                </span>
              </div>
            </div>

            {/* Summary Cards Grid (5 horizontal columns on desktop) */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: 'var(--space-4)',
              }}
            >
              {[
                { title: 'Total Guru', value: `${totalGuruBulanan} Guru`, sub: 'aktif mengajar', color: 'var(--color-text-primary)', bg: 'var(--color-surface)' },
                { title: 'Rata-rata Kehadiran', value: rataRataKehadiranRate, sub: 'tingkat kehadiran fisik', color: 'var(--color-success)', bg: '#F4FBF7', border: '1px solid rgba(27,107,74,0.15)' },
                { title: 'Total Alfa', value: `${totalBulananAlfa} Hari`, sub: 'tanpa keterangan', color: 'var(--color-danger)', bg: '#FDF4F4', border: '1px solid rgba(185, 28, 28, 0.12)' },
                { title: 'Total Keterlambatan', value: `${totalBulananKeterlambatan} Kali`, sub: 'keterlambatan guru', color: 'var(--color-warning)', bg: '#FCFAF2', border: '1px solid rgba(200, 150, 15, 0.12)' },
                { title: 'Total Jam Kerja', value: totalBulananJamLabel, sub: 'akumulasi sebulan', color: 'var(--color-primary-dark)', bg: 'var(--color-surface)' },
              ].map((s, idx) => (
                <div
                  key={idx}
                  style={{
                    backgroundColor: s.bg,
                    border: s.border || '1px solid var(--color-border)',
                    padding: 'var(--space-4)',
                    borderRadius: 'var(--radius-lg)',
                    boxShadow: 'var(--shadow-xs)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    minHeight: '90px',
                  }}
                >
                  <span style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--color-text-tertiary)' }}>
                    {s.title}
                  </span>
                  <span style={{ fontSize: 'var(--font-size-xl)', fontWeight: 800, color: s.color, margin: '2px 0' }}>
                    {s.value}
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--color-text-tertiary)' }}>
                    {s.sub}
                  </span>
                </div>
              ))}
            </div>

            {/* Table Card */}
            <div className="card" style={{ overflow: 'hidden', boxShadow: 'var(--shadow-xs)', borderRadius: 'var(--radius-lg)' }}>
              <div className="table-container" style={{ border: 'none', borderRadius: 0, overflowX: 'auto' }}>
                <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1.5px solid var(--color-border)', height: '48px', backgroundColor: 'var(--color-surface-2)' }}>
                      <th style={{ textAlign: 'left', padding: '0 var(--space-4)', fontSize: '12px', fontWeight: 800, color: 'var(--color-text-secondary)', width: '22%' }}>Guru</th>
                      <th style={{ textAlign: 'center', padding: '0 var(--space-2)', fontSize: '12px', fontWeight: 800, color: 'var(--color-text-secondary)', width: '9%' }}>Hadir</th>
                      <th style={{ textAlign: 'center', padding: '0 var(--space-2)', fontSize: '12px', fontWeight: 800, color: 'var(--color-text-secondary)', width: '9%' }}>Izin</th>
                      <th style={{ textAlign: 'center', padding: '0 var(--space-2)', fontSize: '12px', fontWeight: 800, color: 'var(--color-text-secondary)', width: '9%' }}>Sakit</th>
                      <th style={{ textAlign: 'center', padding: '0 var(--space-2)', fontSize: '12px', fontWeight: 800, color: 'var(--color-text-secondary)', width: '9%' }}>Alfa</th>
                      <th style={{ textAlign: 'right', padding: '0 var(--space-3)', fontSize: '12px', fontWeight: 800, color: 'var(--color-primary)', width: '16%' }}>Total Jam Kerja</th>
                      <th style={{ textAlign: 'center', padding: '0 var(--space-2)', fontSize: '12px', fontWeight: 800, color: 'var(--color-text-secondary)', width: '11%' }}>Terlambat</th>
                      <th style={{ textAlign: 'right', padding: '0 var(--space-4)', fontSize: '12px', fontWeight: 800, color: 'var(--color-text-secondary)', width: '15%' }}>Kehadiran</th>
                      <th style={{ textAlign: 'center', padding: '0 var(--space-3)', fontSize: '12px', fontWeight: 800, color: 'var(--color-text-secondary)', width: '10%' }}>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rekapData.map((r) => {
                      const presenceCount = r.hadir + r.terlambat;
                      const rate = r.total > 0 ? Math.round((presenceCount / r.total) * 100) : 100;
                      
                      let rateColor = 'var(--color-success)';
                      if (rate < 75) rateColor = 'var(--color-danger)';
                      else if (rate < 90) rateColor = 'var(--color-warning)';

                      return (
                        <tr key={r.guru.id} style={{ borderBottom: '1px solid var(--color-border-light)', height: '52px' }}>
                          <td style={{ padding: '0 var(--space-4)', verticalAlign: 'middle' }}>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span style={{ fontWeight: 700, fontSize: '13px', color: 'var(--color-text-primary)' }}>
                                {r.guru.nama.split(',')[0]}
                              </span>
                              <span style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', marginTop: 1 }}>
                                {r.guru.jabatan}
                              </span>
                            </div>
                          </td>
                          <td style={{ padding: '0 var(--space-2)', fontSize: '13px', fontWeight: 700, textAlign: 'center', color: 'var(--color-success)', verticalAlign: 'middle' }}>
                            {presenceCount}
                          </td>
                          <td style={{ padding: '0 var(--space-2)', fontSize: '13px', fontWeight: 500, textAlign: 'center', color: 'var(--color-text-secondary)', verticalAlign: 'middle' }}>
                            {r.izin}
                          </td>
                          <td style={{ padding: '0 var(--space-2)', fontSize: '13px', fontWeight: 500, textAlign: 'center', color: 'var(--color-text-secondary)', verticalAlign: 'middle' }}>
                            {r.sakit}
                          </td>
                          <td style={{ padding: '0 var(--space-2)', fontSize: '13px', fontWeight: 700, textAlign: 'center', color: r.alfa > 0 ? 'var(--color-danger)' : 'var(--color-text-tertiary)', verticalAlign: 'middle' }}>
                            {r.alfa}
                          </td>
                          <td style={{ padding: '0 var(--space-3)', fontSize: '13px', fontWeight: 700, textAlign: 'right', color: 'var(--color-primary)', verticalAlign: 'middle' }}>
                            {formatTotalMenit(r.totalMenit)}
                          </td>
                          <td style={{ padding: '0 var(--space-2)', fontSize: '13px', fontWeight: 700, textAlign: 'center', color: r.terlambat > 0 ? 'var(--color-warning)' : 'var(--color-text-tertiary)', verticalAlign: 'middle' }}>
                            {r.terlambat > 0 ? `${r.terlambat}x` : '—'}
                          </td>
                          <td style={{ padding: '0 var(--space-4)', verticalAlign: 'middle' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                              <span style={{ fontWeight: 800, color: rateColor, fontSize: '12.5px' }}>{rate}%</span>
                              <div style={{ width: '60px', height: '3px', borderRadius: '1.5px', backgroundColor: 'var(--color-border-light)', overflow: 'hidden' }}>
                                <div style={{ width: `${rate}%`, height: '100%', borderRadius: '1.5px', backgroundColor: rateColor }} />
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '0 var(--space-3)', textAlign: 'center', verticalAlign: 'middle' }}>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedGuruId(r.guru.id);
                                setActiveReport('rekap');
                              }}
                              style={{
                                color: 'var(--color-primary)',
                                fontWeight: 700,
                                fontSize: '12px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 2,
                                backgroundColor: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                padding: '4px 6px',
                              }}
                            >
                              Detail <ArrowRight size={12} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================
            3. REKAP PER GURU
            ============================================================ */}
        {activeReport === 'rekap' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            
            {/* Filter Area (Compact Alignment) */}
            <div
              style={{
                display: 'flex',
                backgroundColor: 'var(--color-surface)',
                padding: 'var(--space-3) var(--space-4)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)',
                boxShadow: 'var(--shadow-xs)',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 12,
              }}
            >
              {/* Left filter options */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>Guru:</span>
                <select
                  className="form-select"
                  style={{
                    padding: '6px 12px',
                    fontSize: '13px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--color-border)',
                    minWidth: '220px',
                    height: '32px',
                    fontWeight: 600,
                  }}
                  value={selectedGuruId}
                  onChange={(e) => setSelectedGuruId(e.target.value)}
                >
                  <option value="" disabled>-- Pilih guru --</option>
                  {(guruList.length > 0 ? guruList : mockGuru)
                    .filter((g) => g.aktif)
                    .map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.nama}
                      </option>
                    ))}
                </select>

                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-secondary)', marginLeft: 8 }}>Periode:</span>
                <select
                  className="form-select"
                  style={{
                    padding: '5px 10px',
                    fontSize: '13px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--color-border)',
                    minWidth: '120px',
                    height: '32px',
                  }}
                  value={filterBulan}
                  onChange={(e) => setFilterBulan(e.target.value)}
                >
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i + 1} value={String(i + 1).padStart(2, '0')}>
                      {getMonthName(i + 1)}
                    </option>
                  ))}
                </select>

                <select
                  className="form-select"
                  style={{
                    padding: '5px 10px',
                    fontSize: '13px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--color-border)',
                    minWidth: '85px',
                    height: '32px',
                  }}
                  value={filterTahun}
                  onChange={(e) => setFilterTahun(e.target.value)}
                >
                  {Array.from({ length: 5 }, (_, i) => {
                    const yearVal = String(new Date().getFullYear() - 2 + i);
                    return (
                      <option key={yearVal} value={yearVal}>
                        {yearVal}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Right Filter status dropdown */}
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <Filter size={13} color="var(--color-text-tertiary)" />
                <select
                  className="form-select"
                  style={{
                    padding: '5px 10px',
                    fontSize: '13px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--color-border)',
                    height: '32px',
                  }}
                  value={statusFilterRekap}
                  onChange={(e) => setStatusFilterRekap(e.target.value)}
                >
                  <option value="semua">Semua Status</option>
                  <option value="hadir_tepat_waktu">Hadir Tepat Waktu</option>
                  <option value="terlambat">Terlambat</option>
                  <option value="izin">Izin</option>
                  <option value="sakit">Sakit</option>
                  <option value="alfa">Alfa</option>
                </select>
              </div>
            </div>

            {/* Teacher Info Card (Avatar + Profil Detail) */}
            {selectedGuru && (
              <div
                style={{
                  backgroundColor: 'var(--color-surface)',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--color-border)',
                  padding: 'var(--space-4)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  boxShadow: 'var(--shadow-xs)',
                }}
              >
                {/* Avatar initial */}
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--color-primary-light)',
                    color: 'var(--color-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '15px',
                    border: '1.5px solid rgba(27, 107, 74, 0.12)',
                    flexShrink: 0,
                  }}
                >
                  {getInitials(selectedGuru.nama)}
                </div>

                {/* Details */}
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--color-primary-dark)' }}>
                    {selectedGuru.nama}
                  </h3>
                  <p style={{ fontSize: '12.5px', color: 'var(--color-text-secondary)', marginTop: 2 }}>
                    <span>{selectedGuru.jabatan}</span>
                    <span style={{ color: 'var(--color-text-tertiary)', margin: '0 6px' }}>•</span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                      <BookOpen size={12} color="var(--color-text-tertiary)" /> {mataPelajaranLabel}
                    </span>
                    <span style={{ color: 'var(--color-text-tertiary)', margin: '0 6px' }}>•</span>
                    <span>{totalJadwalLabel}</span>
                  </p>
                </div>
              </div>
            )}

            {/* Hierarchical Stats Grid: Primary top row, Secondary bottom row */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              
              {/* Row 1: Primary Metrics (3 cards) */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-3)' }}>
                {[
                  { title: 'Kehadiran', value: rekapGuruKehadiranRate, sub: 'tingkat presensi bulanan', color: 'var(--color-primary-dark)' },
                  { title: 'Total Hadir', value: `${rekapGuruStats.hadir + rekapGuruStats.terlambat} Hari`, sub: 'tepat waktu & terlambat', color: 'var(--color-success)', bg: '#F4FBF7', border: '1px solid rgba(27,107,74,0.15)' },
                  { title: 'Total Jam Mengajar', value: formatTotalMenit(rekapGuruStats.totalMenit), sub: 'durasi akumulasi mengajar', color: 'var(--color-accent)', bg: '#FCFAF2', border: '1px solid rgba(200,150,15,0.12)' },
                ].map((s, idx) => (
                  <div
                    key={idx}
                    style={{
                      backgroundColor: s.bg || 'var(--color-surface)',
                      border: s.border || '1px solid var(--color-border)',
                      padding: 'var(--space-4)',
                      borderRadius: 'var(--radius-lg)',
                      boxShadow: 'var(--shadow-xs)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      minHeight: '85px',
                    }}
                  >
                    <span style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--color-text-tertiary)' }}>
                      {s.title}
                    </span>
                    <span style={{ fontSize: 'var(--font-size-xl)', fontWeight: 800, color: s.color, margin: '2px 0' }}>
                      {s.value}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--color-text-tertiary)' }}>
                      {s.sub}
                    </span>
                  </div>
                ))}
              </div>

              {/* Row 2: Secondary Metrics (4 cards) */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-3)' }}>
                {[
                  { title: 'Izin', value: `${rekapGuruStats.izin} Hari`, sub: 'disetujui pimpinan', color: 'var(--color-info)', bg: '#EFF6FF' },
                  { title: 'Sakit', value: `${rekapGuruStats.sakit} Hari`, sub: 'dengan surat izin', color: '#6B21A8', bg: '#FAF5FF' },
                  { title: 'Alfa', value: `${rekapGuruStats.alfa} Hari`, sub: 'tanpa keterangan', color: 'var(--color-danger)', bg: '#FDF4F4' },
                  { title: 'Keterlambatan', value: `${rekapGuruStats.terlambat} Kali`, sub: 'terlambat check in', color: 'var(--color-warning)' },
                ].map((s, idx) => (
                  <div
                    key={idx}
                    style={{
                      backgroundColor: s.bg || 'var(--color-surface)',
                      border: '1px solid var(--color-border)',
                      padding: 'var(--space-3) var(--space-4)',
                      borderRadius: 'var(--radius-md)',
                      boxShadow: 'var(--shadow-xs)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      minHeight: '75px',
                    }}
                  >
                    <span style={{ fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--color-text-tertiary)', letterSpacing: '0.3px' }}>
                      {s.title}
                    </span>
                    <span style={{ fontSize: '15px', fontWeight: 800, color: s.color, margin: '1px 0' }}>
                      {s.value}
                    </span>
                    <span style={{ fontSize: '10.5px', color: 'var(--color-text-tertiary)' }}>
                      {s.sub}
                    </span>
                  </div>
                ))}
              </div>

            </div>

            {/* Graphs Section (Side-by-side on desktop) */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
                gap: 'var(--space-4)',
              }}
            >
              {/* Grafik Kehadiran Mingguan */}
              <div
                style={{
                  padding: 'var(--space-4)',
                  boxShadow: 'var(--shadow-xs)',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--color-border)',
                  backgroundColor: 'var(--color-surface)',
                  minHeight: '230px',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <h4 style={{ fontSize: '13px', fontWeight: 800, color: 'var(--color-text-primary)', marginBottom: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <BarChart2 size={15} color="var(--color-primary)" /> Grafik Kehadiran Mingguan
                </h4>
                
                {guruBulananAbs.length === 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexGrow: 1, gap: 6 }}>
                    <Calendar size={20} color="var(--color-text-tertiary)" />
                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-tertiary)' }}>
                      Belum ada data kehadiran pada periode ini
                    </span>
                  </div>
                ) : (
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-around',
                      alignItems: 'flex-end',
                      height: '140px',
                      paddingBottom: '8px',
                      borderBottom: '1px solid var(--color-border-light)',
                      flexGrow: 1,
                    }}
                  >
                    {weeklyData.map((w, idx) => (
                      <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '20%' }}>
                        <div
                          style={{
                            width: '100%',
                            height: '90px',
                            display: 'flex',
                            alignItems: 'flex-end',
                            backgroundColor: 'var(--color-border-light)',
                            borderRadius: 'var(--radius-sm)',
                            overflow: 'hidden',
                          }}
                        >
                          <div
                            style={{
                              width: '100%',
                              height: `${w.rate}%`,
                              backgroundColor: 'var(--color-primary)',
                              borderRadius: 'var(--radius-sm)',
                              transition: 'height 0.4s ease',
                            }}
                            title={`${w.hadir}/${w.total} hari hadir`}
                          />
                        </div>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-secondary)', marginTop: '8px' }}>
                          {w.label}
                        </span>
                        <span style={{ fontSize: '10px', color: 'var(--color-text-tertiary)', fontWeight: 600 }}>
                          {w.rate}%
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Distribusi Status Kehadiran */}
              <div
                style={{
                  padding: 'var(--space-4)',
                  boxShadow: 'var(--shadow-xs)',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--color-border)',
                  backgroundColor: 'var(--color-surface)',
                  minHeight: '230px',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <h4 style={{ fontSize: '13px', fontWeight: 800, color: 'var(--color-text-primary)', marginBottom: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <FileText size={15} color="var(--color-primary)" /> Distribusi Status Kehadiran
                </h4>

                {guruBulananAbs.length === 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexGrow: 1, gap: 6 }}>
                    <BarChart2 size={20} color="var(--color-text-tertiary)" />
                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-tertiary)' }}>
                      Belum ada data kehadiran pada periode ini
                    </span>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, justifyContent: 'center', flexGrow: 1 }}>
                    {[
                      { label: 'Tepat Waktu', count: rekapGuruStats.hadir, color: 'var(--color-success)', bg: 'var(--color-success-bg)' },
                      { label: 'Terlambat', count: rekapGuruStats.terlambat, color: 'var(--color-warning)', bg: 'var(--color-warning-bg)' },
                      { label: 'Izin', count: rekapGuruStats.izin, color: 'var(--color-info)', bg: 'var(--color-info-bg)' },
                      { label: 'Sakit', count: rekapGuruStats.sakit, color: '#6B21A8', bg: '#F3E8FF' },
                      { label: 'Alfa', count: rekapGuruStats.alfa, color: 'var(--color-danger)', bg: 'var(--color-danger-bg)' },
                    ].map((s, idx) => {
                      const totalDays = rekapGuruStats.total || 1;
                      const percentage = Math.round((s.count / totalDays) * 100);
                      
                      return (
                        <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px' }}>
                            <span style={{ fontWeight: 700, color: 'var(--color-text-secondary)' }}>{s.label}</span>
                            <span style={{ fontWeight: 800, color: s.color }}>
                              {s.count} Hari ({percentage}%)
                            </span>
                          </div>
                          
                          <div
                            style={{
                              width: '100%',
                              height: '5px',
                              borderRadius: '2.5px',
                              backgroundColor: 'var(--color-border-light)',
                              overflow: 'hidden',
                            }}
                          >
                            <div
                              style={{
                                width: `${percentage}%`,
                                height: '100%',
                                borderRadius: '2.5px',
                                backgroundColor: s.color,
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Riwayat Detail Presensi (Table Card) */}
            <div className="card" style={{ overflow: 'hidden', boxShadow: 'var(--shadow-xs)', borderRadius: 'var(--radius-lg)' }}>
              <div
                style={{
                  padding: 'var(--space-3) var(--space-4)',
                  borderBottom: '1px solid var(--color-border)',
                  backgroundColor: 'var(--color-surface-2)',
                }}
              >
                <h4 style={{ fontSize: '13px', fontWeight: 800, color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <FileText size={15} color="var(--color-primary)" /> Riwayat Kehadiran Detail
                </h4>
              </div>
              
              <div className="table-container" style={{ border: 'none', borderRadius: 0, overflowX: 'auto' }}>
                <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1.5px solid var(--color-border)', height: '48px', backgroundColor: 'var(--color-surface-2)' }}>
                      <th style={{ textAlign: 'left', padding: '0 var(--space-4)', fontSize: '12px', fontWeight: 800, color: 'var(--color-text-secondary)', width: '15%' }}>Tanggal</th>
                      <th style={{ textAlign: 'left', padding: '0 var(--space-3)', fontSize: '12px', fontWeight: 800, color: 'var(--color-text-secondary)', width: '16%' }}>Jadwal</th>
                      <th style={{ textAlign: 'left', padding: '0 var(--space-3)', fontSize: '12px', fontWeight: 800, color: 'var(--color-text-secondary)', width: '13%' }}>Check In</th>
                      <th style={{ textAlign: 'left', padding: '0 var(--space-3)', fontSize: '12px', fontWeight: 800, color: 'var(--color-text-secondary)', width: '13%' }}>Check Out</th>
                      <th style={{ textAlign: 'left', padding: '0 var(--space-3)', fontSize: '12px', fontWeight: 800, color: 'var(--color-primary)', width: '18%' }}>Total Jam</th>
                      <th style={{ textAlign: 'left', padding: '0 var(--space-3)', fontSize: '12px', fontWeight: 800, color: 'var(--color-text-secondary)', width: '12%' }}>Status</th>
                      <th style={{ textAlign: 'left', padding: '0 var(--space-3)', fontSize: '12px', fontWeight: 800, color: 'var(--color-text-secondary)', width: '13%' }}>Keterlambatan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredGuruAbs
                      .sort((a, b) => b.tanggal.localeCompare(a.tanggal))
                      .map((a) => {
                        const dayName = getNamaHari(a.tanggal);
                        const schedule = mockJadwal.find((j) => j.guruId === a.guruId && j.hari === dayName && j.aktif);
                        const jadwalLabel = schedule ? `${schedule.jamMulai}–${schedule.jamSelesai}` : '—';
                        const durasi = hitungDurasi(a.jamMasuk, a.jamPulang);
                        const colors = STATUS_COLORS[a.status] || STATUS_COLORS.belum_absen;
                        const isLate = a.status === 'terlambat';

                        return (
                          <tr key={a.id} style={{ borderBottom: '1px solid var(--color-border-light)', height: '52px' }}>
                            <td style={{ padding: '0 var(--space-4)', fontSize: '13px', fontWeight: 700, whiteSpace: 'nowrap', verticalAlign: 'middle' }}>
                              {new Date(a.tanggal).toLocaleDateString('id-ID', {
                                weekday: 'short',
                                day: 'numeric',
                                month: 'short',
                                timeZone: 'UTC',
                              })}
                            </td>
                            <td style={{ padding: '0 var(--space-3)', fontSize: '12.5px', fontWeight: 600, color: 'var(--color-text-secondary)', verticalAlign: 'middle' }}>
                              {jadwalLabel}
                            </td>
                            <td style={{ padding: '0 var(--space-3)', fontSize: '12.5px', fontWeight: 500, verticalAlign: 'middle' }}>
                              {a.jamMasuk ? `${a.jamMasuk} WITA` : '—'}
                            </td>
                            <td style={{ padding: '0 var(--space-3)', fontSize: '12.5px', fontWeight: 500, verticalAlign: 'middle' }}>
                              {a.jamPulang ? (
                                `${a.jamPulang} WITA`
                              ) : (
                                <span style={{ color: 'var(--color-text-tertiary)', fontStyle: 'italic', fontSize: '11.5px' }}>
                                  Belum absen
                                </span>
                              )}
                            </td>
                            <td style={{ padding: '0 var(--space-3)', verticalAlign: 'middle' }}>
                              {durasi !== '—' ? (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 700, color: 'var(--color-primary)', fontSize: '12.5px' }}>
                                  <Clock size={11} /> {durasi}
                                </span>
                              ) : (
                                <span style={{ color: 'var(--color-text-tertiary)', fontSize: '11.5px' }}>
                                  {a.jamMasuk && !a.jamPulang ? 'Sedang berlangsung' : '—'}
                                </span>
                              )}
                            </td>
                            <td style={{ padding: '0 var(--space-3)', verticalAlign: 'middle' }}>
                              <span
                                style={{
                                  display: 'inline-block',
                                  padding: '3px 8px',
                                  borderRadius: 'var(--radius-sm)',
                                  fontSize: '10.5px',
                                  fontWeight: 800,
                                  backgroundColor: colors.bg,
                                  color: colors.text,
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.3px',
                                }}
                              >
                                {colors.label}
                              </span>
                            </td>
                            <td style={{ padding: '0 var(--space-3)', verticalAlign: 'middle' }}>
                              {isLate ? (
                                <span style={{ color: 'var(--color-warning)', fontWeight: 700, fontSize: '12.5px' }}>
                                  {a.keterlambatan} Menit
                                </span>
                              ) : a.status === 'hadir_tepat_waktu' ? (
                                <span style={{ color: 'var(--color-success)', fontWeight: 600, fontSize: '12px' }}>
                                  Tepat Waktu
                                </span>
                              ) : (
                                <span style={{ color: 'var(--color-text-tertiary)' }}>—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>

              {filteredGuruAbs.length === 0 && (
                <div style={{ textAlign: 'center', padding: 'var(--space-6) 0', borderTop: '1px solid var(--color-border-light)' }}>
                  <p style={{ fontWeight: 700, color: 'var(--color-text-secondary)', fontSize: '14px' }}>Tidak Ada Data Presensi</p>
                  <p style={{ fontSize: '12px', color: 'var(--color-text-tertiary)', marginTop: 2 }}>Silakan ganti filter status atau pilih guru/periode lainnya.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
