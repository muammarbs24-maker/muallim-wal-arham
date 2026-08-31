'use client';

import { useState, useEffect, useMemo, memo } from 'react';
import Link from 'next/link';
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import {
  Users, CheckCircle2, Clock, Heart, XCircle, AlertCircle,
  CalendarCheck, Activity, Bell, ChevronRight, Calendar,
  TrendingUp, Award, ArrowUpRight,
} from 'lucide-react';
import {
  mockAbsensi, mockGuru, mockJadwal, mockKegiatan, mockJadwalMatrix, mockSesiList,
  hitungSkorKedisiplinan, loadPersistedData, checkAndApplyAutoAlfa
} from '@/lib/mockData';
import { getTodayStringWITA, getStatusLabel, getNowWITA } from '@/lib/utils';
import type { AttendanceStatus, AbsensiRecord, Guru } from '@/types';

// ─── Isolated Live Clock Component (Prevents whole page from re-rendering every second) ───
const LiveClock = memo(function LiveClock() {
  const [time, setTime] = useState('');

  useEffect(() => {
    const updateTime = () => {
      setTime(
        getNowWITA().toLocaleTimeString('id-ID', {
          hour: '2-digit', minute: '2-digit', second: '2-digit',
          hour12: false, timeZone: 'Asia/Makassar',
        })
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
      {time || '--:--:--'}
    </span>
  );
});

// ─── Colour palette ────────────────────────────────────────────
const COLORS = {
  hadir_tepat_waktu: '#1B6B4A',
  terlambat:         '#B45309',
  izin:              '#1D4ED8',
  sakit:             '#7C3AED',
  alfa:              '#B91C1C',
  belum_absen:       '#9CA3AF',
};

const STATUS_BADGE: Record<string, string> = {
  hadir_tepat_waktu: 'success',
  terlambat:         'warning',
  izin:              'info',
  sakit:             'info',
  alfa:              'danger',
  belum_absen:       'neutral',
};

// Custom tooltip for charts
const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'white', border: '1px solid #E5E7EB',
      borderRadius: 8, padding: '8px 12px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
      fontSize: 12,
    }}>
      <div style={{ fontWeight: 700, marginBottom: 2 }}>{payload[0].name}</div>
      <div style={{ color: payload[0].color || payload[0].fill, fontWeight: 800, fontSize: 15 }}>
        {payload[0].value} orang
      </div>
    </div>
  );
};

export default function AdminDashboardPage() {
  const [absensiList, setAbsensiList] = useState<AbsensiRecord[]>([]);
  const [guruList, setGuruList] = useState<Guru[]>([]);

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

  const fetchLiveDashboard = async () => {
    try {
      const { getAbsensiSupabase, getGurusSupabase, getJadwalMatrixSupabase, getSesiListSupabase } = await import('@/lib/supabaseClient');
      const [absData, gurusData, matrixData, sesiData] = await Promise.all([
        getAbsensiSupabase(),
        getGurusSupabase(),
        getJadwalMatrixSupabase(),
        getSesiListSupabase()
      ]);

      let activeGurus = guruList;
      if (gurusData && gurusData.length > 0) {
        setGuruList(gurusData);
        mockGuru.length = 0;
        mockGuru.push(...gurusData);
        activeGurus = gurusData;
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('muallim_guru_list', JSON.stringify(gurusData));
          } catch (e) {}
        }
      }

      if (matrixData && matrixData.length > 0) {
        mockJadwalMatrix.length = 0;
        mockJadwalMatrix.push(...matrixData);
      }

      if (sesiData && sesiData.length > 0) {
        mockSesiList.length = 0;
        mockSesiList.push(...sesiData);
      }

      if (Array.isArray(absData)) {
        const updatedWithAutoAlfa = checkAndApplyAutoAlfa(
          activeGurus,
          mockJadwalMatrix,
          mockSesiList,
          absData
        );
        setAbsensiList(updatedWithAutoAlfa);
        mockAbsensi.length = 0;
        mockAbsensi.push(...updatedWithAutoAlfa);
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('muallim_absensi_list', JSON.stringify(updatedWithAutoAlfa));
          } catch (e) {}
        }
      }
    } catch (err) {
      console.warn('Live dashboard fetch error:', err);
    }
  };

  useEffect(() => {
    refreshData();
    fetchLiveDashboard();

    // Auto-polling every 4 seconds
    const interval = setInterval(() => {
      fetchLiveDashboard();
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  const todayStr   = getTodayStringWITA();
  const todayAbsensi = useMemo(() => absensiList.filter((a) => a.tanggal === todayStr), [absensiList, todayStr]);
  const totalGuru  = useMemo(() => (guruList.length > 0 ? guruList : mockGuru).filter((g) => g.aktif).length, [guruList]);

  // Donut chart data (Memoized, completely stable)
  const donutData = useMemo(() => {
    const statusList: { key: AttendanceStatus; label: string }[] = [
      { key: 'hadir_tepat_waktu', label: 'Hadir Tepat Waktu' },
      { key: 'terlambat',         label: 'Terlambat' },
      { key: 'izin',              label: 'Izin' },
      { key: 'sakit',             label: 'Sakit' },
      { key: 'alfa',              label: 'Alfa' },
      { key: 'belum_absen',       label: 'Belum Absen' },
    ];

    return statusList.map(({ key, label }) => ({
      name: label,
      value: key === 'belum_absen'
        ? totalGuru - todayAbsensi.filter((a) => a.status !== 'belum_absen').length
        : todayAbsensi.filter((a) => a.status === key).length,
      color: COLORS[key],
    })).filter((d) => d.value > 0);
  }, [todayAbsensi, totalGuru]);

  const hadirCount  = todayAbsensi.filter((a) => a.status === 'hadir_tepat_waktu').length;
  const terlambatCount = todayAbsensi.filter((a) => a.status === 'terlambat').length;
  const totalHadir  = hadirCount + terlambatCount;
  const hadirRate   = totalGuru > 0 ? Math.round((totalHadir / totalGuru) * 100) : 0;

  // Weekly bar chart — last 7 days (Memoized)
  const weeklyData = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(getNowWITA());
      d.setDate(d.getDate() - (6 - i));
      const dateKey = d.toISOString().split('T')[0];
      const dayLabel = d.toLocaleDateString('id-ID', { weekday: 'short', timeZone: 'Asia/Makassar' });
      const recs = absensiList.filter((a) => a.tanggal === dateKey);
      return {
        hari: dayLabel,
        Hadir:     recs.filter((a) => a.status === 'hadir_tepat_waktu').length,
        Terlambat: recs.filter((a) => a.status === 'terlambat').length,
        'Tidak Hadir': recs.filter((a) => ['izin', 'sakit', 'alfa'].includes(a.status)).length,
      };
    });
  }, [absensiList]);

  // Top teachers by skor (Hanya memprioritaskan guru yang sudah memiliki riwayat kehadiran di atas)
  const topGuru = useMemo(() => {
    return (guruList.length > 0 ? guruList : mockGuru)
      .filter((g) => g.aktif)
      .map((g) => ({ guru: g, skor: hitungSkorKedisiplinan(g.id, undefined, undefined, absensiList) }))
      .sort((a, b) => {
        // Prioritaskan guru yang sudah memiliki presensi aktif
        if (a.skor.hasAttendance && !b.skor.hasAttendance) return -1;
        if (!a.skor.hasAttendance && b.skor.hasAttendance) return 1;
        if (b.skor.skor !== a.skor.skor) return b.skor.skor - a.skor.skor;
        return b.skor.hadirTepatWaktu - a.skor.hadirTepatWaktu;
      })
      .slice(0, 5);
  }, [guruList, absensiList]);

  // Teachers not yet checked in
  const belumAbsen = useMemo(() => {
    return (guruList.length > 0 ? guruList : mockGuru).filter((g) => {
      const rec = todayAbsensi.find((a) => a.guruId === g.id);
      return !rec || rec.status === 'belum_absen';
    });
  }, [guruList, todayAbsensi]);

  // Today's schedule
  const todayDay = getNowWITA().toLocaleDateString('id-ID', { weekday: 'long', timeZone: 'Asia/Makassar' });
  const dayMap: Record<string, string> = {
    Senin: 'Senin', Selasa: 'Selasa', Rabu: 'Rabu', Kamis: 'Kamis',
    Jumat: 'Jumat', Sabtu: 'Sabtu', Minggu: 'Ahad',
  };
  const todayJadwal = mockJadwal.filter((j) => j.hari === (dayMap[todayDay] || todayDay) && j.aktif);
  const upcomingKegiatan = mockKegiatan.filter((k) => k.status === 'mendatang' || k.status === 'berlangsung').slice(0, 3);

  const gradeColor = (grade: string) =>
    grade === 'Sangat Baik' ? '#1B6B4A'
    : grade === 'Baik'      ? '#1D4ED8'
    : grade === 'Cukup'     ? '#B45309'
    : '#B91C1C';

  return (
    <div>
      {/* ─── Topbar ─── */}
      <div className="admin-topbar">
        <div>
          <h1 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 800 }}>Dashboard</h1>
          <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>
            {getNowWITA().toLocaleDateString('id-ID', {
              weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
              timeZone: 'Asia/Makassar',
            })}
            {' '}• <LiveClock /> WITA
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <button className="btn btn-ghost btn-sm" style={{ position: 'relative', padding: 8 }}>
            <Bell size={18} />
            <span style={{
              position: 'absolute', top: 6, right: 6, width: 8, height: 8,
              background: 'var(--color-danger)', borderRadius: '50%', border: '1.5px solid white',
            }} />
          </button>
          <div className="avatar avatar-sm" style={{ background: 'var(--color-primary)', color: 'white', fontSize: 12 }}>A</div>
        </div>
      </div>

      <div className="admin-content">

        {/* ─── Hero stat row ─── */}
        <div className="admin-grid-4">
          <HeroStat
            label="Total Guru Aktif"
            value={totalGuru}
            icon={<Users size={20} />}
            color="var(--color-primary)"
            bg="var(--color-primary-light)"
          />
          <HeroStat
            label="Hadir Hari Ini"
            value={totalHadir}
            icon={<CheckCircle2 size={20} />}
            color="var(--color-success)"
            bg="#F0FDF4"
            sub={`${hadirRate}% dari total guru`}
          />
          <HeroStat
            label="Belum Absen"
            value={belumAbsen.length}
            icon={<AlertCircle size={20} />}
            color="var(--color-warning)"
            bg="#FFFBEB"
          />
          <HeroStat
            label="Kegiatan Aktif"
            value={mockKegiatan.filter((k) => k.status !== 'selesai').length}
            icon={<Activity size={20} />}
            color="var(--color-info)"
            bg="#EFF6FF"
          />
        </div>

        {/* ─── Row 1: Donut + Weekly Bar ─── */}
        <div className="admin-grid-2-1">

          {/* Donut Chart (Smooth, 0 Lag) */}
          <div className="card">
            <div className="card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <CheckCircle2 size={16} color="var(--color-primary)" />
                <span style={{ fontWeight: 700 }}>Kehadiran Hari Ini</span>
              </div>
              <Link href="/admin/absensi" style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: 2 }}>
                Detail <ArrowUpRight size={12} />
              </Link>
            </div>
            <div className="card-body">
              <div style={{ width: '100%', height: 210 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={donutData}
                      cx="50%"
                      cy="50%"
                      innerRadius={62}
                      outerRadius={92}
                      paddingAngle={3}
                      dataKey="value"
                      isAnimationActive={true}
                      animationBegin={150}
                      animationDuration={900}
                      animationEasing="ease-out"
                    >
                      {donutData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} stroke="white" strokeWidth={2} />
                      ))}
                    </Pie>
                    <text
                      x="50%" y="50%"
                      textAnchor="middle" dominantBaseline="central"
                    >
                      <tspan x="50%" dy="-0.4em" style={{ fontSize: 24, fontWeight: 800, fill: '#111827' }}>
                        {totalHadir}
                      </tspan>
                      <tspan x="50%" dy="1.4em" style={{ fontSize: 11, fill: '#6B7280', fontWeight: 500 }}>
                        dari {totalGuru} guru
                      </tspan>
                    </text>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Legend */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 'var(--space-2)' }}>
                {donutData.map((d) => (
                  <div key={d.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 9, height: 9, borderRadius: 2.5, background: d.color, flexShrink: 0, display: 'inline-block' }} />
                      <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>{d.name}</span>
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: d.color }}>{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Weekly Stacked Bar Chart */}
          <div className="card">
            <div className="card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <TrendingUp size={16} color="var(--color-primary)" />
                <span style={{ fontWeight: 700 }}>Tren Kehadiran 7 Hari</span>
              </div>
            </div>
            <div className="card-body">
              <div style={{ width: '100%', height: 270 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklyData} barCategoryGap="28%" barGap={2}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                    <XAxis
                      dataKey="hari"
                      tick={{ fontSize: 11, fill: '#6B7280' }}
                      axisLine={false} tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#6B7280' }}
                      axisLine={false} tickLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend
                      wrapperStyle={{ fontSize: 11, paddingTop: 6 }}
                      iconType="circle"
                      iconSize={8}
                    />
                    <Bar dataKey="Hadir"       stackId="a" fill={COLORS.hadir_tepat_waktu} isAnimationActive={true} animationDuration={800} animationEasing="ease-out" />
                    <Bar dataKey="Terlambat"   stackId="a" fill={COLORS.terlambat}         isAnimationActive={true} animationDuration={800} animationEasing="ease-out" />
                    <Bar dataKey="Tidak Hadir" stackId="a" fill={COLORS.alfa}              isAnimationActive={true} animationDuration={800} animationEasing="ease-out" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        {/* ─── Row 2: Top Guru + Belum Absen + Kegiatan ─── */}
        <div className="admin-grid-3-col">

          {/* Top 5 Guru berdasarkan skor */}
          <div className="card">
            <div className="card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <Award size={16} color="var(--color-accent)" />
                <span style={{ fontWeight: 700 }}>Top Kedisiplinan</span>
              </div>
              <Link href="/admin/performa" style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: 2 }}>
                Semua <ArrowUpRight size={12} />
              </Link>
            </div>
            <div className="card-body" style={{ padding: 0 }}>
              {topGuru.map(({ guru, skor }, i) => (
                <Link
                  key={guru.id}
                  href={`/admin/laporan?tab=rekap&guruId=${encodeURIComponent(guru.id)}`}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
                    padding: 'var(--space-3) var(--space-4)',
                    borderBottom: i < topGuru.length - 1 ? '1px solid var(--color-border-light)' : 'none',
                    textDecoration: 'none',
                    transition: 'background var(--transition-fast)',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-surface-2)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <span style={{
                    width: 20, height: 20, borderRadius: '50%',
                    background: i === 0 ? '#F59E0B' : i === 1 ? '#9CA3AF' : i === 2 ? '#C97316' : 'var(--color-surface-2)',
                    color: i < 3 ? 'white' : 'var(--color-text-tertiary)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, fontWeight: 800, flexShrink: 0,
                  }}>
                    {i + 1}
                  </span>
                  <div className="avatar avatar-sm" style={{ width: 28, height: 28, fontSize: 11, flexShrink: 0 }}>
                    {guru.nama[0]}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 'var(--font-size-xs)', fontWeight: 700, color: 'var(--color-text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {guru.nama.split(',')[0]}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)' }}>{guru.jabatan}</div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    {skor.hasAttendance ? (
                      <>
                        <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 800, color: gradeColor(skor.grade) }}>
                          {skor.skor}
                        </div>
                        <div style={{ fontSize: 9, color: 'var(--color-text-tertiary)' }}>/ 100</div>
                      </>
                    ) : (
                      <>
                        <div style={{ fontSize: 'var(--font-size-xs)', fontWeight: 700, color: 'var(--color-text-tertiary)' }}>
                          —
                        </div>
                        <div style={{ fontSize: 9, color: 'var(--color-text-tertiary)' }}>Belum ada data</div>
                      </>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Belum Absen */}
          <div className="card">
            <div className="card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <AlertCircle size={16} color="var(--color-warning)" />
                <span style={{ fontWeight: 700 }}>Belum Absen</span>
              </div>
              {belumAbsen.length > 0 && (
                <span className="badge badge-warning">{belumAbsen.length}</span>
              )}
            </div>
            <div className="card-body" style={{ padding: 0 }}>
              {belumAbsen.length === 0 ? (
                <div className="empty-state" style={{ padding: 'var(--space-6)' }}>
                  <div className="empty-state-icon"><CheckCircle2 size={20} /></div>
                  <div className="empty-state-title" style={{ fontSize: 'var(--font-size-sm)' }}>Semua Sudah Absen 🎉</div>
                </div>
              ) : (
                belumAbsen.map((g, i) => (
                  <Link
                    key={g.id}
                    href={`/admin/laporan?tab=rekap&guruId=${encodeURIComponent(g.id)}`}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
                      padding: 'var(--space-3) var(--space-4)',
                      borderBottom: i < belumAbsen.length - 1 ? '1px solid var(--color-border-light)' : 'none',
                      textDecoration: 'none',
                      transition: 'background var(--transition-fast)',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-surface-2)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <div className="avatar avatar-sm" style={{ width: 28, height: 28, fontSize: 11 }}>{g.nama[0]}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 'var(--font-size-xs)', fontWeight: 700, color: 'var(--color-text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {g.nama.split(',')[0]}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)' }}>{g.jabatan}</div>
                    </div>
                    <span className="badge badge-neutral" style={{ fontSize: 10, flexShrink: 0 }}>Belum</span>
                  </Link>
                ))
              )}
            </div>
          </div>

          {/* Kegiatan Mendatang */}
          <div className="card">
            <div className="card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <Activity size={16} color="var(--color-primary)" />
                <span style={{ fontWeight: 700 }}>Kegiatan Yayasan</span>
              </div>
              <Link href="/admin/kegiatan" style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: 2 }}>
                Kelola <ArrowUpRight size={12} />
              </Link>
            </div>
            <div className="card-body" style={{ padding: 0 }}>
              {upcomingKegiatan.map((k, i) => (
                <div
                  key={k.id}
                  style={{
                    padding: 'var(--space-3) var(--space-4)',
                    borderBottom: i < upcomingKegiatan.length - 1 ? '1px solid var(--color-border-light)' : 'none',
                  }}
                >
                  <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', marginBottom: 4 }}>
                    <span className={`badge ${k.status === 'berlangsung' ? 'badge-success' : 'badge-primary'}`} style={{ fontSize: 10 }}>
                      {k.status === 'berlangsung' ? '● Berlangsung' : 'Mendatang'}
                    </span>
                    {k.wajib && <span className="badge badge-danger" style={{ fontSize: 10 }}>Wajib</span>}
                  </div>
                  <div style={{ fontSize: 'var(--font-size-xs)', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 2 }}>{k.nama}</div>
                  <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)' }}>
                    {new Date(k.tanggalMulai || k.tanggal || '').toLocaleDateString('id-ID', { day: 'numeric', month: 'short', timeZone: 'Asia/Makassar' })}
                    {' • '}
                    {k.jamMulai} WITA
                  </div>
                </div>
              ))}
              {upcomingKegiatan.length === 0 && (
                <div className="empty-state" style={{ padding: 'var(--space-6)' }}>
                  <div className="empty-state-title" style={{ fontSize: 'var(--font-size-sm)' }}>Tidak Ada Kegiatan</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ─── Row 3: Absensi Live + Jadwal Hari Ini ─── */}
        <div className="admin-grid-1-1">

          {/* Absensi hari ini — live */}
          <div className="card">
            <div className="card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-success)', boxShadow: '0 0 0 3px rgba(27,107,74,0.2)' }} />
                <span style={{ fontWeight: 700 }}>Rekap Absensi Hari Ini</span>
              </div>
              <Link href="/admin/absensi" style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: 2 }}>
                Detail <ArrowUpRight size={12} />
              </Link>
            </div>
            <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Guru</th>
                    <th>Jam Masuk</th>
                    <th>Jam Pulang</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {todayAbsensi.map((a) => (
                    <tr key={a.id}>
                      <td style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>
                        <Link
                          href={`/admin/laporan?tab=rekap&guruId=${encodeURIComponent(a.guruId)}`}
                          style={{ color: 'var(--color-primary)', fontWeight: 700, textDecoration: 'none' }}
                          onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                          onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
                        >
                          {a.guruNama.split(',')[0]} →
                        </Link>
                      </td>
                      <td style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
                        {a.jamMasuk ? `${a.jamMasuk}` : '—'}
                      </td>
                      <td style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
                        {a.jamPulang ? `${a.jamPulang}` : (
                          a.jamMasuk ? <span style={{ fontSize: 10, color: 'var(--color-text-tertiary)', fontStyle: 'italic' }}>Belum</span> : '—'
                        )}
                      </td>
                      <td>
                        <span className={`badge badge-${STATUS_BADGE[a.status]}`} style={{ fontSize: 10 }}>
                          {getStatusLabel(a.status)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {todayAbsensi.length === 0 && (
              <div className="empty-state">
                <div className="empty-state-title">Belum ada absensi hari ini</div>
              </div>
            )}
          </div>

          {/* Jadwal hari ini */}
          <div className="card">
            <div className="card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <Calendar size={16} color="var(--color-primary)" />
                <span style={{ fontWeight: 700 }}>Jadwal Hari Ini — {todayDay}</span>
              </div>
              <Link href="/admin/jadwal" style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: 2 }}>
                Kelola <ArrowUpRight size={12} />
              </Link>
            </div>
            <div className="card-body" style={{ padding: 0 }}>
              {todayJadwal.length === 0 ? (
                <div className="empty-state" style={{ padding: 'var(--space-6)' }}>
                  <div className="empty-state-icon"><Calendar size={20} /></div>
                  <div className="empty-state-title" style={{ fontSize: 'var(--font-size-sm)' }}>Tidak Ada Jadwal</div>
                </div>
              ) : (
                todayJadwal.map((j, i) => (
                  <Link
                    key={j.id}
                    href={`/admin/laporan?tab=rekap&guruId=${encodeURIComponent(j.guruId)}`}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
                      padding: 'var(--space-3) var(--space-4)',
                      borderBottom: i < todayJadwal.length - 1 ? '1px solid var(--color-border-light)' : 'none',
                      textDecoration: 'none',
                      transition: 'background var(--transition-fast)',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-surface-2)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <div style={{
                      textAlign: 'center', flexShrink: 0,
                      width: 46, padding: '3px 0',
                      background: 'var(--color-primary-light)', borderRadius: 6,
                    }}>
                      <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--color-primary)' }}>{j.jamMulai}</div>
                      <div style={{ width: 1, height: 5, background: 'var(--color-primary)', opacity: 0.3, margin: '2px auto' }} />
                      <div style={{ fontSize: 9, color: 'var(--color-primary)', opacity: 0.7 }}>{j.jamSelesai}</div>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 'var(--font-size-xs)', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 2 }}>
                        {j.mataPelajaran}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {j.guruNama.split(',')[0]} {j.catatan ? `• ${j.catatan}` : ''}
                      </div>
                    </div>
                    <span className="badge badge-primary" style={{ fontSize: 10, flexShrink: 0 }}>{j.kelas}</span>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

// ─── Hero Stat Card ────────────────────────────────────────────
function HeroStat({
  label, value, icon, color, bg, sub,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  bg: string;
  sub?: string;
}) {
  return (
    <div className="card" style={{ padding: 'var(--space-4)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', fontWeight: 600, marginBottom: 'var(--space-1)' }}>
            {label}
          </div>
          <div style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 800, color, lineHeight: 1 }}>
            {value}
          </div>
          {sub && (
            <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)', marginTop: 4 }}>
              {sub}
            </div>
          )}
        </div>
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: bg, color, display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          {icon}
        </div>
      </div>
    </div>
  );
}
