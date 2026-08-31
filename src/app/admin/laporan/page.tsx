'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
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
  DollarSign,
  Phone,
  Camera,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Sparkles,
  Check,
  X,
  Eye,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import {
  mockAbsensi,
  mockGuru,
  mockJadwal,
  getNamaHari,
  loadPersistedData,
  masterAdmin,
  mockSettings,
} from '@/lib/mockData';
import {
  getStatusLabel,
  getTodayStringWITA,
  getMonthName,
  hitungDurasi,
  hitungDurasiMenit,
  formatRupiah,
  formatJamLengkap,
} from '@/lib/utils';
import type { AttendanceStatus, AbsensiRecord, Guru, AppSettings } from '@/types';

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

function LaporanContent() {
  const searchParams = useSearchParams();
  const urlTab = searchParams.get('tab');
  const urlGuruId = searchParams.get('guruId');

  const [activeReport, setActiveReport] = useState<'harian' | 'bulanan' | 'rekap'>((urlTab === 'rekap' || urlGuruId) ? 'rekap' : (urlTab === 'bulanan' ? 'bulanan' : 'harian'));
  
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
  const [selectedPhotoRecord, setSelectedPhotoRecord] = useState<AbsensiRecord | null>(null);

  const [absensiList, setAbsensiList] = useState<AbsensiRecord[]>([]);
  const [guruList, setGuruList] = useState<Guru[]>([]);
  const [appSettings, setAppSettings] = useState<AppSettings>(mockSettings);
  const [adminEmail, setAdminEmail] = useState(masterAdmin.email || 'admin@muallim.sch.id');
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showToast, setShowToast] = useState<string | null>(null);

  const fetchLiveSupabaseData = async (manual = false) => {
    if (manual) setIsRefreshing(true);
    try {
      const { getAbsensiSupabase, getGurusSupabase, getAdminAccountSupabase, getAppSettingsSupabase } = await import('@/lib/supabaseClient');
      
      const [absData, gurus, settings, admin] = await Promise.all([
        getAbsensiSupabase(),
        getGurusSupabase(),
        getAppSettingsSupabase(),
        getAdminAccountSupabase(),
      ]);

      if (Array.isArray(absData)) {
        setAbsensiList(absData);
        mockAbsensi.length = 0;
        mockAbsensi.push(...absData);
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('muallim_absensi_list', JSON.stringify(absData));
          } catch (e) {}
        }
      }

      if (Array.isArray(gurus) && gurus.length > 0) {
        setGuruList(gurus);
        mockGuru.length = 0;
        mockGuru.push(...gurus);
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('muallim_guru_list', JSON.stringify(gurus));
          } catch (e) {}
        }
      }

      if (settings) {
        setAppSettings(settings);
        Object.assign(mockSettings, settings);
      }

      if (admin?.email) {
        setAdminEmail(admin.email);
      }

      if (manual) {
        setShowToast('✓ Data laporan presensi berhasil diperbarui.');
        setTimeout(() => setShowToast(null), 3000);
      }
    } catch (err) {
      console.warn('Error fetching live supabase data:', err);
    } finally {
      if (manual) setIsRefreshing(false);
    }
  };

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
        }

        const savedGurus = localStorage.getItem('muallim_guru_list');
        if (savedGurus) {
          const parsed = JSON.parse(savedGurus);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setGuruList([...parsed]);
            setSelectedGuruId((prev) => prev || parsed.find((g: any) => g.aktif)?.id || parsed[0].id);
          }
        }
      } catch (e) {}
    }
  };

  useEffect(() => {
    if (urlTab === 'rekap' || urlTab === 'bulanan' || urlTab === 'harian') {
      setActiveReport(urlTab);
    }
    if (urlGuruId) {
      setSelectedGuruId(urlGuruId);
      setActiveReport('rekap');
    }
  }, [urlTab, urlGuruId]);

  useEffect(() => {
    refreshData();
    fetchLiveSupabaseData();

    // Auto-polling every 4 seconds so any teacher attendance immediately reflects
    const interval = setInterval(() => {
      fetchLiveSupabaseData();
    }, 4000);

    return () => clearInterval(interval);
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
      csvContent += 'Nama Guru,Jabatan,Hari,Jam Masuk,Jam Pulang,Jam Mengajar,Honor Sesi,Status,Keterlambatan,Keterangan\n';
      const dayName = getNamaHari(filterTanggal);
      harianData.forEach((a) => {
        const g = (guruList.length > 0 ? guruList : mockGuru).find((g) => g.id === a.guruId);
        const durasiJam = typeof a.jamDibayar === 'number'
          ? a.jamDibayar
          : typeof a.durasiMenit === 'number'
          ? Number((a.durasiMenit / 60).toFixed(2))
          : a.jamMasuk ? 2 : 0;
        const honorSesi = typeof a.honorNominal === 'number'
          ? a.honorNominal
          : Math.round(durasiJam * tarifNominal);
        const lateLabel = a.keterlambatan > 0 ? `${a.keterlambatan} menit` : 'Tepat Waktu';
        csvContent += `"${a.guruNama}","${g?.jabatan || 'Guru'}","${dayName}","${a.jamMasuk || '—'}","${a.jamPulang || '—'}","${durasiJam} Jam","${formatRupiah(honorSesi)}","${getStatusLabel(a.status)}","${lateLabel}","${a.keterangan || '—'}"\n`;
      });
    } else if (activeReport === 'bulanan') {
      csvContent += 'Nama Guru,Jabatan,Hadir,Izin,Sakit,Alfa,Total Hari,Total Jam Mengajar,Estimasi Honor,Terlambat,Kehadiran (%)\n';
      rekapData.forEach((r) => {
        const presenceRate = r.total > 0 ? Math.round(((r.hadir + r.terlambat) / r.total) * 100) : 100;
        csvContent += `"${r.guru.nama}","${r.guru.jabatan}","${r.hadir}","${r.izin}","${r.sakit}","${r.alfa}","${r.total}","${r.totalJamDibayar} Jam","${formatRupiah(r.totalHonor)}","${r.terlambat}x","${presenceRate}%"\n`;
      });
    } else {
      const g = (guruList.length > 0 ? guruList : mockGuru).find((g) => g.id === effectiveGuruId || g.id === selectedGuruId);
      if (g) {
        csvContent += `Laporan Detail Guru: ${g.nama} (${g.jabatan})\n`;
        csvContent += `Periode: ${getMonthName(parseInt(filterBulan, 10))} ${filterTahun}\n`;
        csvContent += `Total Jam Mengajar: ${rekapGuruStats.totalJamDibayar} Jam, Estimasi Honor: ${formatRupiah(rekapGuruStats.totalHonor)}\n\n`;
        csvContent += 'Tanggal,Hari,Jam Masuk,Jam Pulang,Jam Mengajar,Honor Sesi,Status,Keterlambatan,Keterangan\n';
        guruBulananAbs.forEach((a) => {
          const durasiJam = typeof a.jamDibayar === 'number'
            ? a.jamDibayar
            : typeof a.durasiMenit === 'number'
            ? Number((a.durasiMenit / 60).toFixed(2))
            : a.jamMasuk ? 2 : 0;
          const honorSesi = typeof a.honorNominal === 'number'
            ? a.honorNominal
            : Math.round(durasiJam * tarifNominal);
          const dayName = getNamaHari(a.tanggal);
          const lateLabel = a.keterlambatan > 0 ? `${a.keterlambatan} menit` : 'Tepat Waktu';
          csvContent += `"${a.tanggal}","${dayName}","${a.jamMasuk || '—'}","${a.jamPulang || '—'}","${durasiJam} Jam","${formatRupiah(honorSesi)}","${getStatusLabel(a.status)}","${lateLabel}","${a.keterangan || '—'}"\n`;
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

  const tarifNominal = appSettings.tarifPerJam || 30000;

  const rekapData = (guruList.length > 0 ? guruList : mockGuru)
    .filter((g) => g.aktif)
    .map((g) => {
      const abs = bulananData.filter((a) => a.guruId === g.id);
      const totalMenit = abs.reduce((sum, a) => {
        if (typeof a.durasiMenit === 'number') return sum + a.durasiMenit;
        return sum + hitungDurasiMenit(a.jamMasuk, a.jamPulang);
      }, 0);
      const totalJamDibayar = Number(
        abs.reduce((sum, a) => {
          if (typeof a.jamDibayar === 'number') return sum + a.jamDibayar;
          if (typeof a.durasiMenit === 'number') return sum + Number((a.durasiMenit / 60).toFixed(2));
          return sum + Number((hitungDurasiMenit(a.jamMasuk, a.jamPulang) / 60).toFixed(2));
        }, 0).toFixed(2)
      );
      const totalHonor = abs.reduce((sum, a) => {
        if (typeof a.honorNominal === 'number') return sum + a.honorNominal;
        return sum + Math.round((typeof a.jamDibayar === 'number' ? a.jamDibayar : 0) * tarifNominal);
      }, Math.round(totalJamDibayar * tarifNominal));

      return {
        guru: g,
        hadir: abs.filter((a) => a.status === 'hadir_tepat_waktu').length,
        terlambat: abs.filter((a) => a.status === 'terlambat').length,
        izin: abs.filter((a) => a.status === 'izin').length,
        sakit: abs.filter((a) => a.status === 'sakit').length,
        alfa: abs.filter((a) => a.status === 'alfa').length,
        total: abs.length,
        totalMenit,
        totalJamDibayar,
        totalHonor,
      };
    });

  const totalGuruBulanan = rekapData.length;
  const totalBulananAlfa = rekapData.reduce((sum, r) => sum + r.alfa, 0);
  const totalBulananKeterlambatan = rekapData.reduce((sum, r) => sum + r.terlambat, 0);
  const totalBulananMenit = rekapData.reduce((sum, r) => sum + r.totalMenit, 0);
  const totalBulananJamDibayar = Number(rekapData.reduce((sum, r) => sum + r.totalJamDibayar, 0).toFixed(2));
  const totalBulananHonor = rekapData.reduce((sum, r) => sum + r.totalHonor, 0);
  const totalBulananJamLabel = `${totalBulananJamDibayar} Jam`;

  const totalBulananKehadiranRate = rekapData.reduce((sum, r) => {
    const rate = r.total > 0 ? ((r.hadir + r.terlambat) / r.total) * 100 : 100;
    return sum + rate;
  }, 0);
  const rataRataKehadiranRate = totalGuruBulanan > 0
    ? (totalBulananKehadiranRate / totalGuruBulanan).toFixed(1) + '%'
    : '100%';

  // 3. Calculations for Selected Teacher Recap
  const effectiveGuruId = selectedGuruId || (guruList.length > 0 ? guruList.find((g) => g.aktif)?.id : mockGuru.find((g) => g.aktif)?.id) || '';
  const selectedGuru = (guruList.length > 0 ? guruList : mockGuru).find((g) => g.id === effectiveGuruId || g.id === selectedGuruId);
  const guruBulananAbs = absensiList.filter((a) => {
    const [y, m] = a.tanggal.split('-');
    return (
      (a.guruId === effectiveGuruId || (selectedGuru && (a.guruNama === selectedGuru.nama || a.guruId === selectedGuru.id))) &&
      y === filterTahun &&
      m === filterBulan
    );
  });

  const filteredGuruAbs = guruBulananAbs.filter((a) => {
    return statusFilterRekap === 'semua' || a.status === statusFilterRekap;
  });

  const rekapGuruTotalJamDibayar = Number(
    guruBulananAbs.reduce((sum, a) => {
      if (typeof a.jamDibayar === 'number') return sum + a.jamDibayar;
      if (typeof a.durasiMenit === 'number') return sum + Number((a.durasiMenit / 60).toFixed(2));
      return sum + Number((hitungDurasiMenit(a.jamMasuk, a.jamPulang) / 60).toFixed(2));
    }, 0).toFixed(2)
  );

  const rekapGuruTotalHonor = guruBulananAbs.reduce((sum, a) => {
    if (typeof a.honorNominal === 'number') return sum + a.honorNominal;
    return sum + Math.round((typeof a.jamDibayar === 'number' ? a.jamDibayar : 0) * tarifNominal);
  }, Math.round(rekapGuruTotalJamDibayar * tarifNominal));

  const rekapGuruStats = {
    hadir: guruBulananAbs.filter((a) => a.status === 'hadir_tepat_waktu').length,
    terlambat: guruBulananAbs.filter((a) => a.status === 'terlambat').length,
    izin: guruBulananAbs.filter((a) => a.status === 'izin').length,
    sakit: guruBulananAbs.filter((a) => a.status === 'sakit').length,
    alfa: guruBulananAbs.filter((a) => a.status === 'alfa').length,
    total: guruBulananAbs.length,
    totalMenit: guruBulananAbs.reduce((sum, a) => sum + (typeof a.durasiMenit === 'number' ? a.durasiMenit : hitungDurasiMenit(a.jamMasuk, a.jamPulang)), 0),
    totalJamDibayar: rekapGuruTotalJamDibayar,
    totalHonor: rekapGuruTotalHonor,
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
            onClick={() => fetchLiveSupabaseData(true)}
            disabled={isRefreshing}
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
            title="Segarkan data presensi terbaru dari server"
          >
            <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} /> {isRefreshing ? 'Memuat...' : 'Segarkan'}
          </button>

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
                      const jadwalLabel = a.sesiNama || (schedule ? `${schedule.jamMulai}–${schedule.jamSelesai}` : (a.keterangan?.includes('Misi:') ? a.keterangan.replace('Misi:', '').trim() : 'Sesi Mengajar'));
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
                { title: 'Total Jam Mengajar', value: `${totalBulananJamDibayar} Jam`, sub: 'akumulasi jam dibayar', color: 'var(--color-primary)', bg: '#F0FDF4', border: '1px solid #86EFAC' },
                { title: 'Total Estimasi Honor', value: formatRupiah(totalBulananHonor), sub: `@ ${formatRupiah(tarifNominal)}/jam`, color: '#15803D', bg: '#DCFCE7', border: '1px solid #86EFAC' },
                { title: 'Total Keterlambatan', value: `${totalBulananKeterlambatan} Kali`, sub: 'keterlambatan guru', color: 'var(--color-warning)', bg: '#FCFAF2', border: '1px solid rgba(200, 150, 15, 0.12)' },
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
                      <th style={{ textAlign: 'center', padding: '0 var(--space-2)', fontSize: '12px', fontWeight: 800, color: 'var(--color-text-secondary)', width: '9%' }}>Terlambat</th>
                      <th style={{ textAlign: 'right', padding: '0 var(--space-3)', fontSize: '12px', fontWeight: 800, color: 'var(--color-primary)', width: '16%' }}>Jam Mengajar</th>
                      <th style={{ textAlign: 'right', padding: '0 var(--space-3)', fontSize: '12px', fontWeight: 800, color: '#15803D', width: '18%' }}>Estimasi Honor</th>
                      <th style={{ textAlign: 'right', padding: '0 var(--space-4)', fontSize: '12px', fontWeight: 800, color: 'var(--color-text-secondary)', width: '14%' }}>Kehadiran</th>
                      <th style={{ textAlign: 'center', padding: '0 var(--space-3)', fontSize: '12px', fontWeight: 800, color: 'var(--color-text-secondary)', width: '12%' }}>Aksi</th>
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
                            {presenceCount} sesi
                          </td>
                          <td style={{ padding: '0 var(--space-2)', fontSize: '13px', fontWeight: 700, textAlign: 'center', color: r.terlambat > 0 ? 'var(--color-warning)' : 'var(--color-text-tertiary)', verticalAlign: 'middle' }}>
                            {r.terlambat > 0 ? `${r.terlambat}x` : '—'}
                          </td>
                          <td style={{ padding: '0 var(--space-3)', fontSize: '13px', fontWeight: 800, textAlign: 'right', color: 'var(--color-primary)', verticalAlign: 'middle' }}>
                            {r.totalJamDibayar} Jam
                          </td>
                          <td style={{ padding: '0 var(--space-3)', fontSize: '13px', fontWeight: 800, textAlign: 'right', color: '#15803D', verticalAlign: 'middle' }}>
                            {formatRupiah(r.totalHonor)}
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
            3. REKAP PER GURU (REDESIGNED FOR HOURLY ATTENDANCE & HONOR)
            ============================================================ */}
        {activeReport === 'rekap' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            
            {/* 1. Compact Unified Filter Bar */}
            <div
              style={{
                display: 'flex',
                backgroundColor: 'var(--color-surface)',
                padding: '12px 16px',
                borderRadius: 'var(--radius-lg)',
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
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <User size={15} color="var(--color-primary)" />
                  <span style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>Guru:</span>
                  <select
                    className="form-select"
                    style={{
                      padding: '5px 12px',
                      fontSize: '13px',
                      borderRadius: 'var(--radius-md)',
                      border: '1.5px solid var(--color-primary)',
                      minWidth: '220px',
                      height: '34px',
                      fontWeight: 700,
                      color: 'var(--color-primary-dark)',
                      background: 'var(--color-surface)',
                    }}
                    value={effectiveGuruId}
                    onChange={(e) => setSelectedGuruId(e.target.value)}
                  >
                    <option value="" disabled>-- Pilih guru --</option>
                    {(guruList.length > 0 ? guruList : mockGuru)
                      .filter((g) => g.aktif)
                      .map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.nama} ({g.jabatan})
                        </option>
                      ))}
                  </select>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Calendar size={15} color="var(--color-text-tertiary)" />
                  <span style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>Periode:</span>
                  <select
                    className="form-select"
                    style={{
                      padding: '5px 10px',
                      fontSize: '13px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--color-border)',
                      minWidth: '120px',
                      height: '34px',
                      fontWeight: 600,
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
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--color-border)',
                      minWidth: '85px',
                      height: '34px',
                      fontWeight: 600,
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

                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Filter size={14} color="var(--color-text-tertiary)" />
                  <select
                    className="form-select"
                    style={{
                      padding: '5px 10px',
                      fontSize: '13px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--color-border)',
                      height: '34px',
                      fontWeight: 600,
                    }}
                    value={statusFilterRekap}
                    onChange={(e) => setStatusFilterRekap(e.target.value)}
                  >
                    <option value="semua">Semua Status</option>
                    <option value="hadir_tepat_waktu">Hadir Tepat Waktu</option>
                    <option value="terlambat">Terlambat</option>
                    <option value="alfa">Alfa</option>
                  </select>
                </div>
              </div>

              {/* Right Export shortcut */}
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
                  backgroundColor: 'var(--color-surface)',
                  color: 'var(--color-primary)',
                  borderColor: 'var(--color-primary)',
                }}
              >
                <Download size={13} /> Unduh CSV Guru Ini
              </button>
            </div>

            {/* 2. Executive Teacher Profile & Rate Card */}
            {selectedGuru && (
              <div
                style={{
                  background: 'linear-gradient(135deg, #ffffff 0%, #F0FDF4 100%)',
                  borderRadius: 'var(--radius-lg)',
                  border: '1.5px solid #86EFAC',
                  padding: '16px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 16,
                  flexWrap: 'wrap',
                  boxShadow: 'var(--shadow-xs)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div
                    style={{
                      width: '52px',
                      height: '52px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #166534, #1B6B4A)',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: '18px',
                      boxShadow: '0 3px 8px rgba(22, 101, 52, 0.25)',
                      flexShrink: 0,
                    }}
                  >
                    {getInitials(selectedGuru.nama)}
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#166534', margin: 0 }}>
                        {selectedGuru.nama}
                      </h3>
                      <span className={`badge badge-${selectedGuru.statusKepegawaian === 'tetap' ? 'primary' : 'info'}`} style={{ fontSize: 10, fontWeight: 700 }}>
                        {selectedGuru.statusKepegawaian === 'tetap' ? 'Guru Tetap' : 'Honorer'}
                      </span>
                      <code style={{ fontSize: 11, background: '#E2E8F0', padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>
                        NIP: {selectedGuru.nip}
                      </code>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: 4, flexWrap: 'wrap' }}>
                      <span><strong>{selectedGuru.jabatan}</strong></span>
                      <span>•</span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <BookOpen size={13} color="var(--color-text-tertiary)" /> {mataPelajaranLabel} ({totalJadwalLabel})
                      </span>
                      {selectedGuru.telepon && (
                        <>
                          <span>•</span>
                          <a
                            href={`https://wa.me/${selectedGuru.telepon.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#15803D', fontWeight: 700, textDecoration: 'none' }}
                          >
                            <Phone size={12} /> {selectedGuru.telepon}
                          </a>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Badges: Honor Rate & Toleransi */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <div style={{
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-md)',
                    background: '#DCFCE7',
                    border: '1px solid #86EFAC',
                    textAlign: 'right'
                  }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#15803D', textTransform: 'uppercase' }}>Tarif Honor Per Jam</div>
                    <div style={{ fontSize: 14, fontWeight: 900, color: '#166534' }}>{formatRupiah(tarifNominal)} <span style={{ fontSize: 11, fontWeight: 600 }}>/ jam</span></div>
                  </div>

                  <div style={{
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-md)',
                    background: '#EFF6FF',
                    border: '1px solid #BFDBFE',
                    textAlign: 'right'
                  }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#1D4ED8', textTransform: 'uppercase' }}>Toleransi Keterlambatan</div>
                    <div style={{ fontSize: 14, fontWeight: 900, color: '#1E40AF' }}>{appSettings.batasKeterlambatan || 5} Menit</div>
                  </div>
                </div>
              </div>
            )}

            {/* 3. Primary Metrics Dashboard (Tailored for Hourly & Attendance System) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-3)' }}>
              
              {/* Metric 1: Estimasi Total Honor */}
              <div
                style={{
                  background: 'linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%)',
                  border: '1.5px solid #86EFAC',
                  padding: '16px',
                  borderRadius: 'var(--radius-lg)',
                  boxShadow: 'var(--shadow-xs)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  minHeight: '100px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '10.5px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#15803D' }}>
                    Total Estimasi Honor
                  </span>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: '#BBF7D0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#166534' }}>
                    <DollarSign size={16} />
                  </div>
                </div>
                <div style={{ fontSize: '24px', fontWeight: 900, color: '#15803D', margin: '4px 0' }}>
                  {formatRupiah(rekapGuruStats.totalHonor)}
                </div>
                <span style={{ fontSize: '11px', color: '#166534', fontWeight: 600 }}>
                  @ {formatRupiah(tarifNominal)}/jam • akumulasi bulan {getMonthName(parseInt(filterBulan, 10))}
                </span>
              </div>

              {/* Metric 2: Total Jam Mengajar */}
              <div
                style={{
                  backgroundColor: 'var(--color-surface)',
                  border: '1.5px solid var(--color-border)',
                  padding: '16px',
                  borderRadius: 'var(--radius-lg)',
                  boxShadow: 'var(--shadow-xs)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  minHeight: '100px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '10.5px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--color-text-tertiary)' }}>
                    Total Jam Mengajar Diperoleh
                  </span>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--color-surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-primary)' }}>
                    <Clock size={16} />
                  </div>
                </div>
                <div style={{ fontSize: '22px', fontWeight: 900, color: 'var(--color-primary)', margin: '4px 0' }}>
                  {formatJamLengkap(rekapGuruStats.totalJamDibayar)}
                </div>
                <span style={{ fontSize: '11px', color: 'var(--color-text-tertiary)' }}>
                  {rekapGuruStats.totalMenit} menit waktu mengajar aktual
                </span>
              </div>

              {/* Metric 3: Total Sesi Kehadiran */}
              <div
                style={{
                  backgroundColor: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  padding: '16px',
                  borderRadius: 'var(--radius-lg)',
                  boxShadow: 'var(--shadow-xs)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  minHeight: '100px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '10.5px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--color-text-tertiary)' }}>
                    Sesi Kehadiran
                  </span>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#166534' }}>
                    <CheckCircle2 size={16} />
                  </div>
                </div>
                <div style={{ fontSize: '24px', fontWeight: 900, color: 'var(--color-text-primary)', margin: '4px 0' }}>
                  {rekapGuruStats.hadir + rekapGuruStats.terlambat} <span style={{ fontSize: 14, fontWeight: 600 }}>Sesi</span>
                </div>
                <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                  <span style={{ color: 'var(--color-success)', fontWeight: 700 }}>{rekapGuruStats.hadir} Tepat Waktu</span> • <span style={{ color: 'var(--color-warning)', fontWeight: 700 }}>{rekapGuruStats.terlambat} Terlambat</span>
                </span>
              </div>

              {/* Metric 4: Tingkat Kehadiran / Disiplin */}
              <div
                style={{
                  backgroundColor: rekapGuruStats.alfa > 0 ? '#FEF2F2' : 'var(--color-surface)',
                  border: rekapGuruStats.alfa > 0 ? '1px solid #FECACA' : '1px solid var(--color-border)',
                  padding: '16px',
                  borderRadius: 'var(--radius-lg)',
                  boxShadow: 'var(--shadow-xs)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  minHeight: '100px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '10.5px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', color: rekapGuruStats.alfa > 0 ? '#B91C1C' : 'var(--color-text-tertiary)' }}>
                    Tingkat Kehadiran Fisik
                  </span>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: rekapGuruStats.alfa > 0 ? '#FEE2E2' : 'var(--color-surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: rekapGuruStats.alfa > 0 ? '#B91C1C' : 'var(--color-primary)' }}>
                    <ShieldCheck size={16} />
                  </div>
                </div>
                <div style={{ fontSize: '24px', fontWeight: 900, color: rekapGuruStats.alfa > 0 ? '#B91C1C' : '#166534', margin: '4px 0' }}>
                  {rekapGuruKehadiranRate}
                </div>
                <span style={{ fontSize: '11px', color: rekapGuruStats.alfa > 0 ? '#B91C1C' : 'var(--color-text-tertiary)', fontWeight: rekapGuruStats.alfa > 0 ? 700 : 500 }}>
                  {rekapGuruStats.alfa > 0 ? `${rekapGuruStats.alfa} Sesi Alpa / Tidak Hadir` : 'Sempurna tanpa alpa'}
                </span>
              </div>

            </div>

            {/* 4. Visual Analytics & Attendance Distribution */}
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <h4 style={{ fontSize: '13px', fontWeight: 800, color: 'var(--color-text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <BarChart2 size={16} color="var(--color-primary)" /> Distribusi Jam Mengajar Mingguan
                  </h4>
                  <span className="badge badge-neutral" style={{ fontSize: 10.5 }}>
                    {getMonthName(parseInt(filterBulan, 10))} {filterTahun}
                  </span>
                </div>
                
                {guruBulananAbs.length === 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexGrow: 1, gap: 6 }}>
                    <Calendar size={22} color="var(--color-text-tertiary)" />
                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-tertiary)' }}>
                      Belum ada sesi mengajar pada bulan ini
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
                              backgroundColor: w.rate >= 75 ? 'var(--color-primary)' : w.rate >= 50 ? 'var(--color-warning)' : 'var(--color-danger)',
                              borderRadius: 'var(--radius-sm)',
                              transition: 'height 0.4s ease',
                            }}
                            title={`${w.hadir}/${w.total} sesi hadir (${w.rate}%)`}
                          />
                        </div>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-secondary)', marginTop: '8px' }}>
                          {w.label}
                        </span>
                        <span style={{ fontSize: '10px', color: 'var(--color-text-tertiary)', fontWeight: 700 }}>
                          {w.hadir} Sesi
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Ringkasan Ketepatan & Kebijakan Honor */}
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
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <h4 style={{ fontSize: '13px', fontWeight: 800, color: 'var(--color-text-primary)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <FileText size={16} color="var(--color-primary)" /> Ringkasan Presensi Sesi
                  </h4>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {[
                      { label: 'Hadir Tepat Waktu (Full Honor)', count: rekapGuruStats.hadir, color: 'var(--color-success)', bg: 'rgba(22, 163, 74, 0.1)' },
                      { label: 'Terlambat (Dihitung Jam Riil)', count: rekapGuruStats.terlambat, color: 'var(--color-warning)', bg: 'rgba(234, 179, 8, 0.1)' },
                      { label: 'Alfa / Tidak Presensi (0 Honor)', count: rekapGuruStats.alfa, color: 'var(--color-danger)', bg: 'rgba(239, 68, 68, 0.1)' },
                    ].map((s, idx) => {
                      const totalSesi = (rekapGuruStats.hadir + rekapGuruStats.terlambat + rekapGuruStats.alfa) || 1;
                      const percentage = Math.round((s.count / totalSesi) * 100);
                      
                      return (
                        <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px' }}>
                            <span style={{ fontWeight: 600, color: 'var(--color-text-secondary)' }}>{s.label}</span>
                            <span style={{ fontWeight: 800, color: s.color }}>
                              {s.count} Sesi ({percentage}%)
                            </span>
                          </div>
                          <div style={{ width: '100%', height: '5px', borderRadius: '2.5px', backgroundColor: 'var(--color-border-light)', overflow: 'hidden' }}>
                            <div style={{ width: `${percentage}%`, height: '100%', borderRadius: '2.5px', backgroundColor: s.color }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div style={{
                  marginTop: 12,
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-md)',
                  background: '#F0FDF4',
                  border: '1px solid #BBF7D0',
                  fontSize: '11px',
                  color: '#166534',
                  lineHeight: 1.4,
                }}>
                  💡 <strong>Ketentuan Honor:</strong> Jika keterlambatan &le; {appSettings.batasKeterlambatan || 5} menit, durasi dihitung penuh dari jam mulai. Jika lewat toleransi, jam mengajar dihitung dari jam masuk riil hingga selesai.
                </div>
              </div>
            </div>

            {/* 5. Detail Presensi & Honor Table */}
            <div className="card" style={{ overflow: 'hidden', boxShadow: 'var(--shadow-xs)', borderRadius: 'var(--radius-lg)' }}>
              <div
                style={{
                  padding: '12px 16px',
                  borderBottom: '1px solid var(--color-border)',
                  backgroundColor: 'var(--color-surface-2)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 8,
                }}
              >
                <h4 style={{ fontSize: '13.5px', fontWeight: 800, color: 'var(--color-text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Clock size={16} color="var(--color-primary)" /> Rincian Presensi &amp; Honor Sesi Mengajar
                </h4>
                <span className="badge badge-primary" style={{ fontWeight: 700, fontSize: 11 }}>
                  {filteredGuruAbs.length} Catatan Sesi
                </span>
              </div>
              
              <div className="table-container" style={{ border: 'none', borderRadius: 0, overflowX: 'auto' }}>
                <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1.5px solid var(--color-border)', height: '44px', backgroundColor: 'var(--color-surface-2)' }}>
                      <th style={{ textAlign: 'left', padding: '0 var(--space-4)', fontSize: '12px', fontWeight: 800, color: 'var(--color-text-secondary)', width: '15%' }}>Tanggal</th>
                      <th style={{ textAlign: 'left', padding: '0 var(--space-3)', fontSize: '12px', fontWeight: 800, color: 'var(--color-text-secondary)', width: '16%' }}>Jadwal / Sesi</th>
                      <th style={{ textAlign: 'center', padding: '0 var(--space-2)', fontSize: '12px', fontWeight: 800, color: 'var(--color-text-secondary)', width: '10%' }}>Foto Selfie</th>
                      <th style={{ textAlign: 'left', padding: '0 var(--space-3)', fontSize: '12px', fontWeight: 800, color: 'var(--color-text-secondary)', width: '11%' }}>Check In</th>
                      <th style={{ textAlign: 'left', padding: '0 var(--space-3)', fontSize: '12px', fontWeight: 800, color: 'var(--color-text-secondary)', width: '11%' }}>Check Out</th>
                      <th style={{ textAlign: 'right', padding: '0 var(--space-3)', fontSize: '12px', fontWeight: 800, color: 'var(--color-primary)', width: '13%' }}>Jam Mengajar</th>
                      <th style={{ textAlign: 'right', padding: '0 var(--space-3)', fontSize: '12px', fontWeight: 800, color: '#15803D', width: '14%' }}>Honor Sesi</th>
                      <th style={{ textAlign: 'left', padding: '0 var(--space-3)', fontSize: '12px', fontWeight: 800, color: 'var(--color-text-secondary)', width: '10%' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredGuruAbs
                      .sort((a, b) => b.tanggal.localeCompare(a.tanggal))
                      .map((a) => {
                        const dayName = getNamaHari(a.tanggal);
                        const schedule = mockJadwal.find((j) => (j.guruId === a.guruId || j.guruNama === a.guruNama) && j.hari === dayName && j.aktif);
                        const jadwalLabel = schedule ? `${schedule.jamMulai}–${schedule.jamSelesai}` : (a.sesiNama || '08:30–10:30');
                        const isPhotoVerified = a.fotoMasukStatus === 'verified';
                        const isPhotoRejected = a.fotoMasukStatus === 'rejected';

                        const durasiJam = typeof a.jamDibayar === 'number'
                          ? a.jamDibayar
                          : typeof a.durasiMenit === 'number'
                          ? Number((a.durasiMenit / 60).toFixed(2))
                          : a.jamMasuk ? 2 : 0;
                        const honorSesi = typeof a.honorNominal === 'number'
                          ? a.honorNominal
                          : Math.round(durasiJam * tarifNominal);

                        return (
                          <tr key={a.id} style={{ borderBottom: '1px solid var(--color-border-light)', height: '52px' }}>
                            <td style={{ padding: '0 var(--space-4)', fontSize: '12.5px', fontWeight: 700, whiteSpace: 'nowrap', verticalAlign: 'middle' }}>
                              {new Date(a.tanggal).toLocaleDateString('id-ID', {
                                weekday: 'short',
                                day: 'numeric',
                                month: 'short',
                                timeZone: 'UTC',
                              })}
                            </td>
                            <td style={{ padding: '0 var(--space-3)', fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)', verticalAlign: 'middle' }}>
                              <div>{jadwalLabel}</div>
                              {schedule && <div style={{ fontSize: 10.5, color: 'var(--color-text-tertiary)' }}>{schedule.mataPelajaran} ({schedule.kelas})</div>}
                            </td>
                            <td style={{ padding: '0 var(--space-2)', textAlign: 'center', verticalAlign: 'middle' }}>
                              {a.fotoMasuk ? (
                                <button
                                  type="button"
                                  onClick={() => setSelectedPhotoRecord(a)}
                                  style={{
                                    border: '1px solid #86EFAC',
                                    background: '#F0FDF4',
                                    borderRadius: 6,
                                    padding: '2px 4px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 4,
                                    cursor: 'pointer',
                                    fontSize: 10,
                                    fontWeight: 700,
                                    color: isPhotoVerified ? '#15803D' : isPhotoRejected ? '#DC2626' : '#D97706'
                                  }}
                                  title="Klik untuk melihat foto selfie"
                                >
                                  <img src={a.fotoMasuk} alt="Selfie" style={{ width: 24, height: 24, borderRadius: 4, objectFit: 'cover' }} />
                                  <span>{isPhotoVerified ? '✓ Valid' : isPhotoRejected ? '✕ Tolak' : '⏳ Cek'}</span>
                                </button>
                              ) : isPhotoVerified ? (
                                <span style={{ fontSize: 10, color: '#15803D', fontWeight: 700 }}>✓ Diarsipkan</span>
                              ) : (
                                <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>—</span>
                              )}
                            </td>
                            <td style={{ padding: '0 var(--space-3)', fontSize: '12px', fontWeight: 600, verticalAlign: 'middle' }}>
                              {a.jamMasuk ? (
                                <div>
                                  <span>{a.jamMasuk} WITA</span>
                                  {a.keterlambatan > 0 ? (
                                    <div style={{ fontSize: 10, color: 'var(--color-warning)', fontWeight: 700 }}>
                                      Terlambat {a.keterlambatan}m
                                    </div>
                                  ) : (
                                    <div style={{ fontSize: 10, color: 'var(--color-success)', fontWeight: 600 }}>
                                      Tepat Waktu
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span style={{ color: 'var(--color-text-tertiary)' }}>—</span>
                              )}
                            </td>
                            <td style={{ padding: '0 var(--space-3)', fontSize: '12px', fontWeight: 500, verticalAlign: 'middle' }}>
                              {a.jamPulang ? `${a.jamPulang} WITA` : <span style={{ color: 'var(--color-text-tertiary)', fontSize: '11px' }}>—</span>}
                            </td>
                            <td style={{ padding: '0 var(--space-3)', fontSize: '12.5px', fontWeight: 800, textAlign: 'right', color: 'var(--color-primary)', verticalAlign: 'middle' }}>
                              {a.status === 'hadir_tepat_waktu' || a.status === 'terlambat' ? formatJamLengkap(durasiJam) : '—'}
                            </td>
                            <td style={{ padding: '0 var(--space-3)', fontSize: '13px', fontWeight: 900, textAlign: 'right', color: '#15803D', verticalAlign: 'middle' }}>
                              {a.status === 'hadir_tepat_waktu' || a.status === 'terlambat' ? formatRupiah(honorSesi) : '—'}
                            </td>
                            <td style={{ padding: '0 var(--space-3)', verticalAlign: 'middle' }}>
                              <span
                                style={{
                                  display: 'inline-block',
                                  padding: '3px 8px',
                                  borderRadius: 'var(--radius-sm)',
                                  fontSize: '10.5px',
                                  fontWeight: 800,
                                  backgroundColor: (STATUS_COLORS[a.status] || STATUS_COLORS.belum_absen).bg,
                                  color: (STATUS_COLORS[a.status] || STATUS_COLORS.belum_absen).text,
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.3px',
                                }}
                              >
                                {(STATUS_COLORS[a.status] || STATUS_COLORS.belum_absen).label}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>

                  {/* Summary Footer */}
                  {filteredGuruAbs.length > 0 && (
                    <tfoot>
                      <tr style={{ backgroundColor: '#F0FDF4', borderTop: '2px solid #86EFAC', fontWeight: 800 }}>
                        <td colSpan={5} style={{ padding: '12px 16px', fontSize: '12.5px', color: '#166534' }}>
                          TOTAL AKUMULASI ({getMonthName(parseInt(filterBulan, 10))} {filterTahun}): {rekapGuruStats.hadir + rekapGuruStats.terlambat} Sesi Hadir
                        </td>
                        <td style={{ padding: '12px 12px', fontSize: '13.5px', fontWeight: 900, textAlign: 'right', color: 'var(--color-primary)' }}>
                          {formatJamLengkap(rekapGuruStats.totalJamDibayar)}
                        </td>
                        <td style={{ padding: '12px 12px', fontSize: '14px', fontWeight: 900, textAlign: 'right', color: '#15803D' }}>
                          {formatRupiah(rekapGuruStats.totalHonor)}
                        </td>
                        <td style={{ padding: '12px 12px' }}></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>

              {filteredGuruAbs.length === 0 && (
                <div style={{ textAlign: 'center', padding: 'var(--space-8) 0', borderTop: '1px solid var(--color-border-light)' }}>
                  <p style={{ fontWeight: 700, color: 'var(--color-text-secondary)', fontSize: '14px' }}>Belum Ada Catatan Presensi</p>
                  <p style={{ fontSize: '12px', color: 'var(--color-text-tertiary)', marginTop: 2 }}>Silakan sesuaikan filter status atau pilih periode bulan lainnya.</p>
                </div>
              )}
            </div>

            {/* Modal Preview Foto Selfie */}
            {selectedPhotoRecord && (
              <div
                className="modal-overlay"
                onClick={() => setSelectedPhotoRecord(null)}
                style={{
                  position: 'fixed',
                  inset: 0,
                  background: 'rgba(0,0,0,0.6)',
                  backdropFilter: 'blur(4px)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 9999,
                  padding: 16,
                }}
              >
                <div
                  className="modal"
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    maxWidth: 420,
                    width: '100%',
                    background: 'var(--color-surface)',
                    borderRadius: 'var(--radius-lg)',
                    overflow: 'hidden',
                    boxShadow: 'var(--shadow-xl)',
                    border: '1px solid var(--color-border)'
                  }}
                >
                  <div className="modal-header" style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border-light)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Camera size={16} color="var(--color-primary)" />
                      <span style={{ fontWeight: 800, fontSize: 13 }}>Foto Selfie Presensi</span>
                    </div>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => setSelectedPhotoRecord(null)}
                      style={{ padding: 4 }}
                    >
                      <X size={16} />
                    </button>
                  </div>

                  <div className="modal-body" style={{ padding: 16, textAlign: 'center' }}>
                    {selectedPhotoRecord.fotoMasuk ? (
                      <img
                        src={selectedPhotoRecord.fotoMasuk}
                        alt="Selfie Presensi"
                        style={{ width: '100%', maxHeight: 300, objectFit: 'cover', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}
                      />
                    ) : (
                      <p style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>Foto tidak tersedia</p>
                    )}

                    <div style={{ marginTop: 12, textAlign: 'left', background: 'var(--color-surface-2)', padding: '10px 12px', borderRadius: 8, fontSize: 12 }}>
                      <div style={{ fontWeight: 700 }}>{selectedPhotoRecord.guruNama}</div>
                      <div style={{ color: 'var(--color-text-secondary)', marginTop: 2 }}>
                        Tanggal: {new Date(selectedPhotoRecord.tanggal).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                      </div>
                      <div style={{ color: 'var(--color-text-secondary)', marginTop: 2 }}>
                        Waktu Masuk: {selectedPhotoRecord.jamMasuk || '—'} WITA
                      </div>
                      <div style={{ marginTop: 4 }}>
                        Status: <strong style={{ color: selectedPhotoRecord.fotoMasukStatus === 'verified' ? '#15803D' : '#DC2626' }}>
                          {selectedPhotoRecord.fotoMasukStatus === 'verified' ? '✓ Telah Diverifikasi' : selectedPhotoRecord.fotoMasukStatus === 'rejected' ? '✕ Ditolak' : '⏳ Menunggu Verifikasi'}
                        </strong>
                      </div>
                    </div>
                  </div>

                  <div className="modal-footer" style={{ padding: '10px 16px', display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => setSelectedPhotoRecord(null)}
                    >
                      Tutup
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminLaporanPage() {
  return (
    <Suspense fallback={
      <div className="admin-content" style={{ textAlign: 'center', paddingTop: 80 }}>
        <p style={{ fontWeight: 600, color: 'var(--color-text-secondary)' }}>Memuat Laporan Presensi...</p>
      </div>
    }>
      <LaporanContent />
    </Suspense>
  );
}
