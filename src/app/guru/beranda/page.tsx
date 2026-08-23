'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  MapPin, Clock, CheckCircle2, AlertCircle, LogIn, LogOut,
  Calendar, ChevronRight, Wifi, Briefcase, Sparkles, Check,
  Navigation, RotateCcw, Timer, Plane, Radio, Send,
  TrendingUp, Award, XCircle, Edit2, Users, Star
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  formatDateWITA, greetingByTime,
  getNowWITA, getDistanceInMeters,
  timeToMinutes, getDayOfWeekWITA,
  getTodayStringWITA, formatTimeWITA,
  subtractMinutesFromTime, isSessionWindowOpen,
  getCurrentMinutesWITA
} from '@/lib/utils';
import {
  currentGuru, mockGuru, mockJadwal, mockJadwalMatrix, mockSettings, mockKegiatan,
  mockSesiList, syncMatrixToJadwal, loadPersistedData, mockAbsensi, savePersistedAbsensi,
  getJadwalForGuru, clearGuruSession, mockPartisipasi
} from '@/lib/mockData';
import type { AttendanceStatus, AbsensiRecord, Guru, Jadwal, AppSettings } from '@/types';

type LocationState = 'idle' | 'checking' | 'valid' | 'invalid';

interface SesiAttendanceData {
  jadwalId: string;
  mataPelajaran: string;
  jamMulai: string;
  jamSelesai: string;
  kelas: string;
  jamMasuk: string | null;
  jamPulang: string | null;
  status: AttendanceStatus;
  isDone: boolean; // true setelah absen pulang
}

export default function BerandaPage() {
  const router = useRouter();
  const [currentTime, setCurrentTime] = useState('');
  const [currentDate, setCurrentDate] = useState('');
  const [isProcessing, setIsProcessing] = useState<string | null>(null); // jadwalId yang sedang diproses
  const [locationStateMap, setLocationStateMap] = useState<Record<string, LocationState>>({}); // per-sesi
  const [distanceFromOffice, setDistanceFromOffice] = useState<number | null>(null);
  const [showSuccess, setShowSuccess] = useState<string | null>(null);
  const [sessionsMap, setSessionsMap] = useState<Record<string, SesiAttendanceData>>({});
  const [guruData, setGuruData] = useState<Guru>(currentGuru);
  const [jadwalList, setJadwalList] = useState<Jadwal[]>([]);
  const [appSettings, setAppSettings] = useState<AppSettings>(mockSettings);
  const [absensiList, setAbsensiList] = useState<AbsensiRecord[]>([]);
  const [kegiatanList, setKegiatanList] = useState(mockKegiatan);

  // GPS Monitoring State
  const [visitModeMap, setVisitModeMap] = useState<Record<string, boolean>>({}); // visit mode per sesi
  const [gpsZoneMap, setGpsZoneMap] = useState<Record<string, 'inside' | 'outside' | 'unknown'>>({}); // status zona per sesi
  const [lastGpsCheckMap, setLastGpsCheckMap] = useState<Record<string, string>>({}); // waktu cek terakhir

  // Modal Kendala / Izin / Sakit Langsung dari Beranda
  const [showKendalaModal, setShowKendalaModal] = useState<Jadwal | null>(null);
  const [kendalaTipe, setKendalaTipe] = useState<'izin' | 'sakit'>('izin');
  const [kendalaAlasan, setKendalaAlasan] = useState('');
  const [isSubmittingKendala, setIsSubmittingKendala] = useState(false);

  // State jadwal besok
  const [tomorrowIzinType, setTomorrowIzinType] = useState<'izin' | 'sakit'>('izin');
  const [tomorrowAlasan, setTomorrowAlasan] = useState('');
  const [showTomorrowIzinModal, setShowTomorrowIzinModal] = useState(false);
  const [isSubmittingTomorrow, setIsSubmittingTomorrow] = useState(false);
  // Apakah guru sudah konfirmasi "Siap Hadir" untuk besok (persist di localStorage)
  const [tomorrowHadirConfirmed, setTomorrowHadirConfirmed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const saved = localStorage.getItem('jadwal_besok_hadir_confirmed_date');
    const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    return saved === tomorrowStr;
  });


  // Refs untuk hindari stale closure di interval GPS
  const sessionsMapRef = useRef(sessionsMap);
  const visitModeRef = useRef(visitModeMap);
  const guruDataRef = useRef(guruData);
  const appSettingsRef = useRef(appSettings);
  const todayJadwalRef = useRef<Jadwal[]>([]);

  // Sync refs setiap render
  sessionsMapRef.current = sessionsMap;
  visitModeRef.current = visitModeMap;
  guruDataRef.current = guruData;
  appSettingsRef.current = appSettings;

  const todayStr = getTodayStringWITA();
  const hariIni = getDayOfWeekWITA();

  // Sync and populate data on mount
  useEffect(() => {
    loadPersistedData();
    syncMatrixToJadwal();

    let activeGuru = currentGuru;
    if (typeof window !== 'undefined') {
      const savedId = localStorage.getItem('logged_in_guru_id');
      if (savedId) {
        const found = mockGuru.find((g) => g.id === savedId);
        if (found) activeGuru = found;
      }

      const savedSettings = localStorage.getItem('muallim_app_settings');
      if (savedSettings) {
        try {
          const parsed = JSON.parse(savedSettings);
          if (parsed && typeof parsed === 'object') {
            setAppSettings(parsed);
          }
        } catch (e) {}
      }
    }
    setGuruData(activeGuru);

    const list = getJadwalForGuru(activeGuru.id);
    setJadwalList(list);

    // Load absensi list untuk stats
    const savedAbs = typeof window !== 'undefined' ? localStorage.getItem('muallim_absensi_list') : null;
    if (savedAbs) {
      try { setAbsensiList(JSON.parse(savedAbs)); } catch (e) {}
    } else {
      setAbsensiList([...mockAbsensi]);
    }

    import('@/lib/supabaseClient').then(({ getAppSettingsSupabase, getJadwalMatrixSupabase, getGurusSupabase, getSesiListSupabase, getAbsensiSupabase, getKegiatanListSupabase, getKegiatanPartisipasiSupabase }) => {
      getAppSettingsSupabase().then((s) => {
        if (s) setAppSettings(s);
      }).catch(() => {});

      getGurusSupabase().then((gurus) => {
        if (gurus && gurus.length > 0) {
          mockGuru.length = 0;
          mockGuru.push(...gurus);
          const savedId = typeof window !== 'undefined' ? localStorage.getItem('logged_in_guru_id') : null;
          const savedEmail = typeof window !== 'undefined' ? localStorage.getItem('logged_in_guru_email') : null;
          
          let f = gurus.find((g) => (savedId && g.id === savedId) || (savedEmail && g.email.toLowerCase() === savedEmail.toLowerCase()));
          
          if (f && f.aktif) {
            setGuruData(f);
            if (typeof window !== 'undefined') {
              localStorage.setItem('logged_in_guru_id', f.id);
              localStorage.setItem('logged_in_guru_email', f.email);
              localStorage.setItem('muallim_guru_user', JSON.stringify(f));
            }
          } else {
            // Jika guru sudah dihapus atau tidak aktif, bersihkan session lokal & cookie secara tuntas
            clearGuruSession();
            router.replace('/');
          }
        }
      }).catch(() => {});

      getSesiListSupabase().then((sessions) => {
        if (sessions && sessions.length > 0) {
          mockSesiList.length = 0;
          mockSesiList.push(...sessions);
          syncMatrixToJadwal();
          const refreshedList = getJadwalForGuru(activeGuru.id);
          setJadwalList(refreshedList);
        }
      }).catch(() => {});

      getAbsensiSupabase().then((abs) => {
        if (Array.isArray(abs)) {
          mockAbsensi.length = 0;
          mockAbsensi.push(...abs);
          localStorage.setItem('muallim_absensi_list', JSON.stringify(abs));

          const teacherTodayAbs = abs.filter((a) => (a.guruId === activeGuru.id || a.guruNama === activeGuru.nama) && a.tanggal === todayStr);
          const fullList = getJadwalForGuru(activeGuru.id);
          const newSessionsMap: Record<string, SesiAttendanceData> = {};

          teacherTodayAbs.forEach((a) => {
            const matchedJadwal = fullList.find((j) => 
              j.hari === hariIni && (
                a.id.includes(j.id) || 
                (a.keterangan && a.keterangan.includes(j.mataPelajaran)) ||
                j.mataPelajaran.toLowerCase() === (a.keterangan || '').toLowerCase()
              )
            ) || fullList.find((j) => j.hari === hariIni);

            if (matchedJadwal) {
              newSessionsMap[matchedJadwal.id] = {
                jadwalId: matchedJadwal.id,
                mataPelajaran: matchedJadwal.mataPelajaran,
                jamMulai: matchedJadwal.jamMulai,
                jamSelesai: matchedJadwal.jamSelesai,
                kelas: matchedJadwal.kelas,
                jamMasuk: a.jamMasuk,
                jamPulang: a.jamPulang,
                status: a.status,
                isDone: Boolean(a.jamPulang || a.status === 'izin' || a.status === 'sakit'),
              };
            }
          });

          if (teacherTodayAbs.length > 0) {
            const storageKey = `muallim_session_absensi_${todayStr}_${activeGuru.id}`;
            localStorage.setItem(storageKey, JSON.stringify(newSessionsMap));
            setSessionsMap(newSessionsMap);
          } else {
            const storageKey = `muallim_session_absensi_${todayStr}_${activeGuru.id}`;
            localStorage.removeItem(storageKey);
            setSessionsMap({});
          }
        }
        setAbsensiList([...mockAbsensi]);
      }).catch(() => {});

      getKegiatanListSupabase().then((list) => {
        if (Array.isArray(list)) {
          mockKegiatan.length = 0;
          mockKegiatan.push(...list);
          setKegiatanList([...list]);
        }
      }).catch(() => {});

      getKegiatanPartisipasiSupabase().then((list) => {
        if (Array.isArray(list)) {
          mockPartisipasi.length = 0;
          mockPartisipasi.push(...list);
        }
      }).catch(() => {});

      getJadwalMatrixSupabase().then((matrix) => {
        if (matrix !== null && matrix !== undefined) {
          mockJadwalMatrix.length = 0;
          mockJadwalMatrix.push(...matrix);
          syncMatrixToJadwal();
          const refreshedList = getJadwalForGuru(activeGuru.id);
          setJadwalList(refreshedList);
        }
      }).catch(() => {});
    }).catch(() => {});

    // Load status sesi hari ini dari localStorage jika ada
    if (typeof window !== 'undefined') {
      try {
        const storageKey = `muallim_session_absensi_${todayStr}_${activeGuru.id}`;
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          setSessionsMap(JSON.parse(saved));
        }
      } catch (e) {
        console.error('Error loading session absensi:', e);
      }
    }
  }, [todayStr, hariIni]);

  // Jadwal Guru Hari Ini (diurutkan berdasarkan jamMulai)
  const todayJadwal = useMemo(() => {
    return jadwalList
      .filter((j) => (j.guruId === guruData.id || j.guruNama === guruData.nama) && j.hari === hariIni && j.aktif)
      .sort((a, b) => a.jamMulai.localeCompare(b.jamMulai));
  }, [jadwalList, guruData, hariIni]);

  // ── Jadwal Besok ──────────────────────────────────────────────────────────
  const daysArr7 = ['Ahad', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const tomorrowDate = useMemo(() => { const d = new Date(); d.setDate(d.getDate() + 1); return d; }, []);
  const tomorrowDateStr = tomorrowDate.toISOString().split('T')[0];
  const tomorrowDayName = daysArr7[tomorrowDate.getDay()];
  const tomorrowSchedules = useMemo(() =>
    jadwalList.filter((j) =>
      (j.guruId === guruData.id || j.guruNama === guruData.nama || (guruData.nama && j.guruNama.toLowerCase() === guruData.nama.toLowerCase())) &&
      j.aktif && j.hari === tomorrowDayName
    ), [jadwalList, guruData, tomorrowDayName]);

  const tomorrowAbsRecord = useMemo(() =>
    absensiList.find((a) => (a.guruId === guruData.id || a.guruNama === guruData.nama) && a.tanggal === tomorrowDateStr),
    [absensiList, guruData, tomorrowDateStr]);

  // ── Stats Bulan Ini ───────────────────────────────────────────────────────
  const thisMonthStr = todayStr.slice(0, 7); // 'YYYY-MM'
  const myMonthAbsensi = useMemo(() =>
    absensiList.filter((a) =>
      (a.guruId === guruData.id || a.guruNama === guruData.nama) && a.tanggal.startsWith(thisMonthStr)
    ), [absensiList, guruData, thisMonthStr]);

  const statsMonth = useMemo(() => ({
    hadir: myMonthAbsensi.filter((a) => a.status === 'hadir_tepat_waktu').length,
    terlambat: myMonthAbsensi.filter((a) => a.status === 'terlambat').length,
    izinSakit: myMonthAbsensi.filter((a) => a.status === 'izin' || a.status === 'sakit').length,
    alfa: myMonthAbsensi.filter((a) => a.status === 'alfa').length,
    total: myMonthAbsensi.length,
  }), [myMonthAbsensi]);

  // ── Rekap Minggu Ini ──────────────────────────────────────────────────────
  // Prioritas status (terburuk menang): alfa > terlambat > izin > sakit > hadir
  const STATUS_PRIORITY: Record<string, number> = {
    alfa: 5, terlambat: 4, izin: 3, sakit: 2, hadir_tepat_waktu: 1,
  };
  const weekDays = useMemo(() => {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0=Sun
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(today);
    monday.setDate(today.getDate() + mondayOffset);
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      const dayName = ['Ahad', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'][d.getDay()];
      const isPast = d <= today;
      const isToday = dateStr === todayStr;

      // Ambil SEMUA record absensi hari itu
      const dayRecs = absensiList.filter((a) =>
        (a.guruId === guruData.id || a.guruNama === guruData.nama) && a.tanggal === dateStr
      );

      // Status terburuk
      const worstRec = dayRecs.reduce<typeof dayRecs[0] | null>((worst, rec) => {
        if (!worst) return rec;
        return (STATUS_PRIORITY[rec.status] || 0) > (STATUS_PRIORITY[worst.status] || 0) ? rec : worst;
      }, null);

      // Apakah ada campuran status?
      const uniqueStatuses = [...new Set(dayRecs.map((r) => r.status))];
      const isMixed = uniqueStatuses.length > 1;

      return { dateStr, dayName, isPast, isToday, absenRec: worstRec, dayRecs, isMixed, d };
    });
  }, [absensiList, guruData, todayStr]);

  // ── Handler: Konfirmasi Jadwal Besok dari Beranda ─────────────────────────
  const markTomorrowConfirmed = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('jadwal_besok_confirmed_date', tomorrowDateStr);
      window.dispatchEvent(new Event('jadwal_besok_confirmed'));
    }
  };

  const handleConfirmHadirBesok = () => {
    markTomorrowConfirmed();
    // Persist konfirmasi hadir besok
    if (typeof window !== 'undefined') {
      localStorage.setItem('jadwal_besok_hadir_confirmed_date', tomorrowDateStr);
    }
    setTomorrowHadirConfirmed(true);
    setShowSuccess(`✓ Terima kasih! Kehadiran Anda untuk jadwal besok (${tomorrowDayName}) sudah dikonfirmasi.`);
    setTimeout(() => setShowSuccess(null), 3500);
  };

  const handleSubmitTomorrowIzin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tomorrowAlasan.trim()) { alert('Mohon tuliskan alasan.'); return; }
    setIsSubmittingTomorrow(true);
    const recordId = tomorrowAbsRecord?.id || `abs-izin-${tomorrowDateStr}-${guruData.id}`;
    const newRecord: AbsensiRecord = {
      id: recordId,
      guruId: guruData.id,
      guruNama: guruData.nama,
      tanggal: tomorrowDateStr,
      jamMasuk: null,
      jamPulang: null,
      status: tomorrowIzinType,
      keterlambatan: 0,
      lokasiValid: true,
      keterangan: `Konfirmasi ${tomorrowIzinType === 'izin' ? 'Izin' : 'Sakit'}: ${tomorrowAlasan.trim()}`,
      dibuatPada: new Date().toISOString(),
    };
    const updated = absensiList.filter((a) => a.id !== recordId);
    updated.unshift(newRecord);
    setAbsensiList(updated);
    mockAbsensi.length = 0; mockAbsensi.push(...updated);
    savePersistedAbsensi(updated);
    try {
      const { upsertAbsensiSupabase } = await import('@/lib/supabaseClient');
      await upsertAbsensiSupabase(newRecord);
    } catch (err) {}
    
    // Clear ready confirmed status from localStorage since it's now izin/sakit
    if (typeof window !== 'undefined') {
      localStorage.removeItem('jadwal_besok_hadir_confirmed_date');
    }
    setTomorrowHadirConfirmed(false);
    
    setIsSubmittingTomorrow(false);
    setShowTomorrowIzinModal(false);
    setTomorrowAlasan('');
    markTomorrowConfirmed();
    setShowSuccess(`✓ Konfirmasi ${tomorrowIzinType === 'izin' ? 'Izin' : 'Sakit'} untuk jadwal besok berhasil dikirim.`);
    setTimeout(() => setShowSuccess(null), 3500);
  };

  const handleCancelIzinTomorrow = async () => {
    if (!tomorrowAbsRecord) return;
    setIsSubmittingTomorrow(true);
    
    const updated = absensiList.filter((a) => a.id !== tomorrowAbsRecord.id);
    setAbsensiList(updated);
    mockAbsensi.length = 0; mockAbsensi.push(...updated);
    savePersistedAbsensi(updated);
    
    try {
      const { deleteAbsensiSupabase } = await import('@/lib/supabaseClient');
      await deleteAbsensiSupabase(tomorrowAbsRecord.id);
    } catch (err) {}
    
    // Set status to Siap Hadir
    if (typeof window !== 'undefined') {
      localStorage.setItem('jadwal_besok_hadir_confirmed_date', tomorrowDateStr);
    }
    setTomorrowHadirConfirmed(true);
    
    setIsSubmittingTomorrow(false);
    setShowTomorrowIzinModal(false);
    setTomorrowAlasan('');
    markTomorrowConfirmed();
    setShowSuccess("✓ Ketidakhadiran dibatalkan. Status diubah menjadi Siap Hadir.");
    setTimeout(() => setShowSuccess(null), 3500);
  };


  // Live Clock
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setCurrentTime(formatTimeWITA(now));
      setCurrentDate(formatDateWITA(now));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // Simpan update status sesi ke localStorage & mockAbsensi
  const updateSessionState = (jadwalId: string, updated: SesiAttendanceData) => {
    const nextMap = { ...sessionsMap, [jadwalId]: updated };
    setSessionsMap(nextMap);
    if (typeof window !== 'undefined') {
      try {
        const storageKey = `muallim_session_absensi_${todayStr}_${guruData.id}`;
        localStorage.setItem(storageKey, JSON.stringify(nextMap));
      } catch (e) {
        console.error('Error saving session absensi:', e);
      }
    }
  };

  const [scheduleFilterTab, setScheduleFilterTab] = useState<'semua' | 'aktif' | 'selesai' | 'terlewat'>('semua');

  const [showError, setShowError] = useState<string | null>(null);

  // Real GPS acquisition
  const getGpsPosition = (): Promise<{ lat: number; lng: number } | null> => {
    return new Promise((resolve) => {
      if (typeof window === 'undefined' || !navigator.geolocation) {
        resolve(null);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        (err) => {
          console.warn('Geolocation error:', err);
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 6000, maximumAge: 0 }
      );
    });
  };

  // Cek lokasi GPS per-sesi
  const handleCheckLocation = async (jadwalId: string) => {
    if (isProcessing) return;
    setIsProcessing(jadwalId);
    setLocationStateMap((prev) => ({ ...prev, [jadwalId]: 'checking' }));
    setShowError(null);

    const gps = await getGpsPosition();
    if (!gps) {
      setIsProcessing(null);
      setLocationStateMap((prev) => ({ ...prev, [jadwalId]: 'invalid' }));
      setDistanceFromOffice(null);
      setShowError('❌ Sinyal GPS tidak terdeteksi. Harap aktifkan izin lokasi (GPS) pada peramban/perangkat Anda.');
      setTimeout(() => setShowError(null), 5000);
      return;
    }

    const dist = Math.round(
      getDistanceInMeters(gps.lat, gps.lng, appSettings.latitude, appSettings.longitude)
    );
    setDistanceFromOffice(dist);
    const allowed = appSettings.radius || 100;

    setIsProcessing(null);
    if (dist <= allowed) {
      setLocationStateMap((prev) => ({ ...prev, [jadwalId]: 'valid' }));
    } else {
      setLocationStateMap((prev) => ({ ...prev, [jadwalId]: 'invalid' }));
    }
  };

  // Evaluasi status jadwal hari ini secara akurat
  const currentMinutes = currentTime ? timeToMinutes(currentTime) : getCurrentMinutesWITA();
  const leadMinutes = appSettings.waktuBukaSebelumJadwal || 60;

  // 1. SEMUA Sesi Aktif (bisa lebih dari 1 bersamaan)
  // Sesi aktif = jendela sudah buka DAN belum selesai, atau sudah absen masuk tapi belum pulang
  const activeJadwalList = todayJadwal.filter((j) => {
    const sess = sessionsMap[j.id];
    const isDone = sess?.isDone || false;
    const isOpen = isSessionWindowOpen(j.jamMulai, leadMinutes, currentMinutes);
    const endMins = timeToMinutes(j.jamSelesai);
    const isPast = currentMinutes > endMins;

    // Jika sudah absen masuk, tetap aktif sampai absen pulang
    if (sess?.jamMasuk && !isDone) return true;

    // Jika belum absen masuk, aktif jika jendela buka dan belum lewat jam selesai
    return !isDone && isOpen && !isPast;
  });

  // Backward compat: activeJadwal = sesi aktif pertama (untuk logika lain yang masih butuh)
  const activeJadwal = activeJadwalList[0] || null;
  const activeSessionData = activeJadwal ? sessionsMap[activeJadwal.id] : null;

  // 2. Sesi Mendatang: Belum mencapai jam buka dan belum lewat
  const upcomingJadwal = todayJadwal.find((j) => {
    const sess = sessionsMap[j.id];
    const isDone = sess?.isDone || false;
    const isOpen = isSessionWindowOpen(j.jamMulai, leadMinutes, currentMinutes);
    const endMins = timeToMinutes(j.jamSelesai);
    const isPast = currentMinutes > endMins;
    return !isDone && !isOpen && !isPast;
  });

  // 3. Status kategori jadwal
  const finishedList = todayJadwal.filter((j) => sessionsMap[j.id]?.isDone);
  const missedList = todayJadwal.filter((j) => {
    const sess = sessionsMap[j.id];
    const isDone = sess?.isDone || false;
    const endMins = timeToMinutes(j.jamSelesai);
    return !isDone && !sess?.jamMasuk && currentMinutes > endMins;
  });
  const activeList = todayJadwal.filter((j) => {
    const sess = sessionsMap[j.id];
    const isDone = sess?.isDone || false;
    const isOpen = isSessionWindowOpen(j.jamMulai, leadMinutes, currentMinutes);
    const endMins = timeToMinutes(j.jamSelesai);
    const isPast = currentMinutes > endMins;
    if (sess?.jamMasuk && !isDone) return true;
    return !isDone && isOpen && !isPast;
  });

  // 4. Apakah semua jadwal hari ini sudah selesai atau terlewat?
  const allSessionsFinishedOrMissed = todayJadwal.length > 0 && todayJadwal.every((j) => {
    const sess = sessionsMap[j.id];
    const endMins = timeToMinutes(j.jamSelesai);
    return sess?.isDone || currentMinutes > endMins;
  });

  // Auto-alfa: tandai sesi yang sudah lewat & belum absen masuk sebagai alfa
  useEffect(() => {
    if (todayJadwal.length === 0 || !guruData?.id) return;

    const alfaTargets = todayJadwal.filter((j) => {
      const sess = sessionsMap[j.id];
      const endMins = timeToMinutes(j.jamSelesai);
      // Sudah lewat jam selesai, belum absen masuk sama sekali, belum isDone
      return currentMinutes > endMins && !sess?.jamMasuk && !sess?.isDone;
    });

    if (alfaTargets.length === 0) return;

    // Buat record alfa untuk setiap sesi yang terlewat
    const alfaRecordsToCreate: AbsensiRecord[] = alfaTargets
      .filter((j) => {
        const recordId = `abs-${todayStr}-${j.id}-${guruData.id}`;
        return !mockAbsensi.find((a) => a.id === recordId);
      })
      .map((j) => ({
        id: `abs-${todayStr}-${j.id}-${guruData.id}`,
        guruId: guruData.id,
        guruNama: guruData.nama,
        tanggal: todayStr,
        jamMasuk: null,
        jamPulang: null,
        status: 'alfa' as const,
        keterlambatan: 0,
        lokasiValid: false,
        keterangan: `Alfa otomatis — sesi ${j.mataPelajaran} (${j.jamMulai}–${j.jamSelesai} WITA) tidak dihadiri`,
        dibuatPada: new Date().toISOString(),
      }));

    if (alfaRecordsToCreate.length === 0) return;

    const updatedAbsensi = [...mockAbsensi];
    alfaRecordsToCreate.forEach((rec) => {
      const idx = updatedAbsensi.findIndex((a) => a.id === rec.id);
      if (idx < 0) updatedAbsensi.unshift(rec);
    });
    mockAbsensi.length = 0;
    mockAbsensi.push(...updatedAbsensi);
    savePersistedAbsensi(updatedAbsensi);

    // Tandai di sessionsMap agar tidak diproses ulang
    const nextMap = { ...sessionsMap };
    alfaRecordsToCreate.forEach((rec) => {
      const j = alfaTargets.find((x) => rec.id.includes(x.id));
      if (j) {
        nextMap[j.id] = {
          jadwalId: j.id,
          mataPelajaran: j.mataPelajaran,
          jamMulai: j.jamMulai,
          jamSelesai: j.jamSelesai,
          kelas: j.kelas,
          jamMasuk: null,
          jamPulang: null,
          status: 'alfa',
          isDone: true, // Dianggap selesai (alfa)
        };
      }
    });
    setSessionsMap(nextMap);
    if (typeof window !== 'undefined') {
      localStorage.setItem(`muallim_session_absensi_${todayStr}_${guruData.id}`, JSON.stringify(nextMap));
    }

    // Simpan ke Supabase
    import('@/lib/supabaseClient').then(({ upsertAbsensiSupabase }) => {
      alfaRecordsToCreate.forEach((rec) => upsertAbsensiSupabase(rec).catch(() => {}));
    }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMinutes, todayJadwal.length, guruData?.id]);

  // Sync todayJadwalRef setelah todayJadwal selesai dihitung
  // (dipakai di GPS interval yang closed over ref)
  useEffect(() => {
    todayJadwalRef.current = todayJadwal;
  }, [todayJadwal]);

  // ── Absen Pulang Otomatis (tanpa GPS manual) ────────────────────────────
  // Dipanggil oleh: (1) GPS meninggalkan zona, (2) jam pelajaran selesai
  const handleAbsenPulangAuto = useCallback(async (
    jadwal: Jadwal,
    reason: string,
    autoJamPulang?: string
  ) => {
    const currentSess = sessionsMapRef.current[jadwal.id];
    if (!currentSess?.jamMasuk || currentSess?.isDone) return;

    const now = getNowWITA();
    const jamPulang = autoJamPulang || formatTimeWITA(now);

    const updatedSesi: SesiAttendanceData = {
      jadwalId: jadwal.id,
      mataPelajaran: jadwal.mataPelajaran,
      jamMulai: jadwal.jamMulai,
      jamSelesai: jadwal.jamSelesai,
      kelas: jadwal.kelas,
      jamMasuk: currentSess.jamMasuk,
      jamPulang,
      status: currentSess.status,
      isDone: true,
    };

    const nextMap = { ...sessionsMapRef.current, [jadwal.id]: updatedSesi };
    sessionsMapRef.current = nextMap;
    setSessionsMap(nextMap);
    if (typeof window !== 'undefined') {
      const todayStr = getTodayStringWITA();
      localStorage.setItem(`muallim_session_absensi_${todayStr}_${guruDataRef.current.id}`, JSON.stringify(nextMap));
    }

    const todayStr = getTodayStringWITA();
    const recordId = `abs-${todayStr}-${jadwal.id}-${guruDataRef.current.id}`;
    const existing = mockAbsensi.find((a) => a.id === recordId);
    let updatedList = [...mockAbsensi];
    let recordToSave: AbsensiRecord;

    if (existing) {
      existing.jamPulang = jamPulang;
      existing.keterangan = reason;
      recordToSave = { ...existing };
    } else {
      recordToSave = {
        id: recordId,
        guruId: guruDataRef.current.id,
        guruNama: guruDataRef.current.nama,
        tanggal: todayStr,
        jamMasuk: currentSess.jamMasuk,
        jamPulang,
        status: currentSess.status,
        keterlambatan: 0,
        lokasiValid: true,
        keterangan: reason,
        dibuatPada: now.toISOString(),
      };
      updatedList.unshift(recordToSave);
    }
    savePersistedAbsensi(updatedList);

    try {
      const { upsertAbsensiSupabase } = await import('@/lib/supabaseClient');
      await upsertAbsensiSupabase(recordToSave);
    } catch (e) {}

    setShowSuccess(`✓ ${reason} — Absen Pulang: ${jamPulang} WITA.`);
    setTimeout(() => setShowSuccess(null), 5000);
  }, []);

  // ── Auto Absen Pulang saat jam pelajaran selesai ─────────────────────────
  useEffect(() => {
    const sessionsWithMasuk = todayJadwal.filter((j) => {
      const sess = sessionsMap[j.id];
      const endMins = timeToMinutes(j.jamSelesai);
      return sess?.jamMasuk && !sess?.isDone && currentMinutes > endMins;
    });

    sessionsWithMasuk.forEach((jadwal) => {
      handleAbsenPulangAuto(
        jadwal,
        `Absen pulang otomatis — jam pelajaran ${jadwal.mataPelajaran} selesai pukul ${jadwal.jamSelesai} WITA`,
        jadwal.jamSelesai // gunakan jam selesai sebagai jam pulang
      );
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMinutes]);

  // ── GPS Background Monitor ───────────────────────────────────────────────
  // Mulai berjalan setelah absen masuk, cek posisi setiap 2 menit
  useEffect(() => {
    const hasActiveCheckedInSession = todayJadwal.some((j) => {
      const sess = sessionsMap[j.id];
      return sess?.jamMasuk && !sess?.isDone;
    });

    if (!hasActiveCheckedInSession) return;

    const intervalId = setInterval(async () => {
      if (typeof window === 'undefined' || !navigator.geolocation) return;

      const gps = await new Promise<{ lat: number; lng: number } | null>((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
          () => resolve(null),
          { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 }
        );
      });

      if (!gps) return;

      const settings = appSettingsRef.current;
      const dist = Math.round(getDistanceInMeters(gps.lat, gps.lng, settings.latitude, settings.longitude));
      const allowed = settings.radius || 100;
      const checkTimeStr = formatTimeWITA(getNowWITA());

      const activeSessions = todayJadwalRef.current.filter((j) => {
        const sess = sessionsMapRef.current[j.id];
        return sess?.jamMasuk && !sess?.isDone;
      });

      const newZoneMap: Record<string, 'inside' | 'outside' | 'unknown'> = {};
      const newCheckMap: Record<string, string> = {};

      for (const jadwal of activeSessions) {
        newCheckMap[jadwal.id] = checkTimeStr;

        if (dist <= allowed) {
          newZoneMap[jadwal.id] = 'inside';
        } else {
          newZoneMap[jadwal.id] = 'outside';
          // Auto absen pulang hanya jika TIDAK dalam visit mode
          if (!visitModeRef.current[jadwal.id]) {
            handleAbsenPulangAuto(
              jadwal,
              `Absen pulang otomatis — meninggalkan area absensi (terdeteksi ${dist}m dari yayasan)`
            );
          }
        }
      }

      setGpsZoneMap((prev) => ({ ...prev, ...newZoneMap }));
      setLastGpsCheckMap((prev) => ({ ...prev, ...newCheckMap }));
    }, 2 * 60 * 1000); // setiap 2 menit

    return () => clearInterval(intervalId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todayJadwal.map(j => `${j.id}:${sessionsMap[j.id]?.jamMasuk}:${sessionsMap[j.id]?.isDone}`).join('|')]);

  // ── Helper: hitung durasi sejak absen masuk ──────────────────────────────
  const getDuration = (jamMasuk: string | null): string => {
    if (!jamMasuk || !currentTime) return '—';
    const masukMins = timeToMinutes(jamMasuk);
    const nowMins = timeToMinutes(currentTime);
    const diff = Math.max(0, nowMins - masukMins);
    const h = Math.floor(diff / 60);
    const m = diff % 60;
    if (h > 0) return `${h} jam ${m} menit`;
    return `${m} menit`;
  };

  // ── Toggle Visit Mode ────────────────────────────────────────────────────
  const toggleVisitMode = (jadwalId: string) => {
    setVisitModeMap((prev) => {
      const next = { ...prev, [jadwalId]: !prev[jadwalId] };
      visitModeRef.current = next;
      return next;
    });
  };

  // ── Pengajuan Izin / Sakit Sesi Mengajar Langsung dari Beranda ───────────
  const handleSubmitKendala = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showKendalaModal || !kendalaAlasan.trim()) {
      alert('Mohon tuliskan keterangan / alasan kendala Anda.');
      return;
    }

    setIsSubmittingKendala(true);
    const jadwal = showKendalaModal;
    const recordId = `abs-${todayStr}-${jadwal.id}-${guruData.id}`;
    const now = getNowWITA();

    const newRecord: AbsensiRecord = {
      id: recordId,
      guruId: guruData.id,
      guruNama: guruData.nama,
      tanggal: todayStr,
      jamMasuk: null,
      jamPulang: null,
      status: kendalaTipe,
      keterlambatan: 0,
      lokasiValid: true,
      keterangan: `Pengajuan ${kendalaTipe === 'izin' ? 'Izin' : 'Sakit'} (${jadwal.mataPelajaran}): ${kendalaAlasan.trim()}`,
      dibuatPada: now.toISOString(),
    };

    // 1. Simpan ke daftar absensi lokal
    const updatedList = mockAbsensi.filter((a) => a.id !== recordId);
    updatedList.unshift(newRecord);
    mockAbsensi.length = 0;
    mockAbsensi.push(...updatedList);
    savePersistedAbsensi(updatedList);

    // 2. Tandai di sessionsMap sesi ini sebagai selesai dengan status izin/sakit
    const updatedSesi: SesiAttendanceData = {
      jadwalId: jadwal.id,
      mataPelajaran: jadwal.mataPelajaran,
      jamMulai: jadwal.jamMulai,
      jamSelesai: jadwal.jamSelesai,
      kelas: jadwal.kelas,
      jamMasuk: null,
      jamPulang: null,
      status: kendalaTipe,
      isDone: true,
    };

    const nextMap = { ...sessionsMapRef.current, [jadwal.id]: updatedSesi };
    sessionsMapRef.current = nextMap;
    setSessionsMap(nextMap);
    if (typeof window !== 'undefined') {
      localStorage.setItem(`muallim_session_absensi_${todayStr}_${guruData.id}`, JSON.stringify(nextMap));
    }

    // 3. Simpan ke Supabase Cloud
    try {
      const { upsertAbsensiSupabase } = await import('@/lib/supabaseClient');
      await upsertAbsensiSupabase(newRecord);
    } catch (err) {}

    setIsSubmittingKendala(false);
    setShowKendalaModal(null);
    setKendalaAlasan('');
    setShowSuccess(`✓ Pengajuan ${kendalaTipe === 'izin' ? 'Izin' : 'Sakit'} sesi ${jadwal.mataPelajaran} berhasil dikirim!`);
    setTimeout(() => setShowSuccess(null), 5000);
  };

  // Eksekusi Absen Masuk Sesi - Cepat & Strict Radius Check

  const handleAbsenMasuk = async (jadwal: typeof todayJadwal[0]) => {
    if (isProcessing) return;
    setIsProcessing(jadwal.id);
    setLocationStateMap((prev) => ({ ...prev, [jadwal.id]: 'checking' }));

    const gps = await getGpsPosition();
    if (!gps) {
      setIsProcessing(null);
      setLocationStateMap((prev) => ({ ...prev, [jadwal.id]: 'invalid' }));
      setShowError('❌ Lokasi GPS tidak terdeteksi. Harap aktifkan izin lokasi (GPS) pada peramban/perangkat Anda.');
      setTimeout(() => setShowError(null), 5000);
      return;
    }

    const dist = Math.round(
      getDistanceInMeters(gps.lat, gps.lng, appSettings.latitude, appSettings.longitude)
    );
    setDistanceFromOffice(dist);
    const allowed = appSettings.radius || 100;

    if (dist > allowed) {
      setIsProcessing(null);
      setLocationStateMap((prev) => ({ ...prev, [jadwal.id]: 'invalid' }));
      setShowError(`❌ Absen Ditolak: Anda berada ${dist} meter dari titik yayasan (Maksimal radius: ${allowed} meter). Anda harus berada di area yayasan untuk melakukan absen.`);
      setTimeout(() => setShowError(null), 6000);
      return;
    }

    setLocationStateMap((prev) => ({ ...prev, [jadwal.id]: 'valid' }));

    const now = getNowWITA();
    const jamMasuk = now.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'Asia/Makassar',
    }).replace(/\./g, ':');

    const masukMins = timeToMinutes(jamMasuk);
    const jadwalMins = timeToMinutes(jadwal.jamMulai);
    const toleransi = appSettings.batasKeterlambatan || 0;
    const status: AttendanceStatus = masukMins <= (jadwalMins + toleransi) ? 'hadir_tepat_waktu' : 'terlambat';
    const keterlambatan = Math.max(0, masukMins - jadwalMins);

    setTimeout(async () => {
      const updatedSesi: SesiAttendanceData = {
        jadwalId: jadwal.id,
        mataPelajaran: jadwal.mataPelajaran,
        jamMulai: jadwal.jamMulai,
        jamSelesai: jadwal.jamSelesai,
        kelas: jadwal.kelas,
        jamMasuk,
        jamPulang: null,
        status,
        isDone: false,
      };

      updateSessionState(jadwal.id, updatedSesi);

      // Simpan ke log absensi global (Admin & Laporan)
      const newRecord: AbsensiRecord = {
        id: `abs-${todayStr}-${jadwal.id}-${guruData.id}`,
        guruId: guruData.id,
        guruNama: guruData.nama,
        tanggal: todayStr,
        jamMasuk,
        jamPulang: null,
        status,
        keterlambatan,
        lokasiValid: true,
        keterangan: `Sesi: ${jadwal.mataPelajaran} (${jadwal.jamMulai}–${jadwal.jamSelesai} WITA)`,
        dibuatPada: now.toISOString(),
      };

      const existingIndex = mockAbsensi.findIndex((a) => a.id === newRecord.id);
      let updatedAbsensiList = [...mockAbsensi];
      if (existingIndex >= 0) {
        updatedAbsensiList[existingIndex] = newRecord;
      } else {
        updatedAbsensiList.unshift(newRecord);
      }
      savePersistedAbsensi(updatedAbsensiList);

      // Simpan langsung ke Supabase Cloud
      try {
        const { upsertAbsensiSupabase } = await import('@/lib/supabaseClient');
        await upsertAbsensiSupabase(newRecord);
      } catch (e) {}

      setIsProcessing(null);
      // Reset location state sesi ini setelah berhasil absen masuk
      setLocationStateMap((prev) => ({ ...prev, [jadwal.id]: 'idle' }));
      setShowSuccess(
        status === 'hadir_tepat_waktu'
          ? `✓ Berhasil Absen Masuk: ${jadwal.mataPelajaran} (${jamMasuk} WITA) — Tepat Waktu`
          : `✓ Berhasil Absen Masuk: ${jadwal.mataPelajaran} (${jamMasuk} WITA) — Terlambat ${keterlambatan} menit`
      );
      setTimeout(() => setShowSuccess(null), 4000);
    }, 150);
  };

  // Eksekusi Absen Pulang Sesi - Strict Radius Check
  const handleAbsenPulang = async (jadwal: typeof todayJadwal[0]) => {
    if (isProcessing) return;
    setIsProcessing(jadwal.id);
    setLocationStateMap((prev) => ({ ...prev, [jadwal.id]: 'checking' }));

    const gps = await getGpsPosition();
    if (!gps) {
      setIsProcessing(null);
      setLocationStateMap((prev) => ({ ...prev, [jadwal.id]: 'invalid' }));
      setShowError('❌ Lokasi GPS tidak terdeteksi. Harap aktifkan izin lokasi (GPS) pada peramban/perangkat Anda.');
      setTimeout(() => setShowError(null), 5000);
      return;
    }

    const dist = Math.round(
      getDistanceInMeters(gps.lat, gps.lng, appSettings.latitude, appSettings.longitude)
    );
    setDistanceFromOffice(dist);
    const allowed = appSettings.radius || 100;

    if (dist > allowed) {
      setIsProcessing(null);
      setLocationStateMap((prev) => ({ ...prev, [jadwal.id]: 'invalid' }));
      setShowError(`❌ Absen Ditolak: Anda berada ${dist} meter dari titik yayasan (Maksimal radius: ${allowed} meter). Anda harus berada di area yayasan untuk melakukan absen pulang.`);
      setTimeout(() => setShowError(null), 6000);
      return;
    }

    setLocationStateMap((prev) => ({ ...prev, [jadwal.id]: 'valid' }));

    const now = getNowWITA();
    const jamPulang = formatTimeWITA(now);

    setTimeout(async () => {
      const current = sessionsMap[jadwal.id];
      const updatedSesi: SesiAttendanceData = {
        jadwalId: jadwal.id,
        mataPelajaran: jadwal.mataPelajaran,
        jamMulai: jadwal.jamMulai,
        jamSelesai: jadwal.jamSelesai,
        kelas: jadwal.kelas,
        jamMasuk: current?.jamMasuk || jamPulang,
        jamPulang,
        status: current?.status || 'hadir_tepat_waktu',
        isDone: true, // Selesai!
      };

      updateSessionState(jadwal.id, updatedSesi);

      // Perbarui log absensi global
      const recordId = `abs-${todayStr}-${jadwal.id}-${guruData.id}`;
      const existing = mockAbsensi.find((a) => a.id === recordId);
      let updatedList = [...mockAbsensi];
      let recordToSave: AbsensiRecord;

      if (existing) {
        existing.jamPulang = jamPulang;
        recordToSave = { ...existing };
      } else {
        recordToSave = {
          id: recordId,
          guruId: guruData.id,
          guruNama: guruData.nama,
          tanggal: todayStr,
          jamMasuk: current?.jamMasuk || jamPulang,
          jamPulang,
          status: current?.status || 'hadir_tepat_waktu',
          keterlambatan: 0,
          lokasiValid: true,
          keterangan: `Sesi: ${jadwal.mataPelajaran} (${jadwal.jamMulai}–${jadwal.jamSelesai} WITA)`,
          dibuatPada: now.toISOString(),
        };
        updatedList.unshift(recordToSave);
      }
      savePersistedAbsensi(updatedList);

      // Simpan langsung ke Supabase Cloud
      try {
        const { upsertAbsensiSupabase } = await import('@/lib/supabaseClient');
        await upsertAbsensiSupabase(recordToSave);
      } catch (e) {}

      setIsProcessing(null);
      // Reset location state sesi ini setelah berhasil absen pulang
      setLocationStateMap((prev) => ({ ...prev, [jadwal.id]: 'idle' }));
      setShowSuccess(`✓ Berhasil Absen Pulang sesi ${jadwal.mataPelajaran} pukul ${jamPulang} WITA. Jazakallahu Khairan!`);
      setTimeout(() => setShowSuccess(null), 4000);
    }, 150);
  };

  return (
    <>
      {/* Toast Notification */}
      {showSuccess && (
        <div className="toast-container">
          <div className="toast toast-success">{showSuccess}</div>
        </div>
      )}
      {showError && (
        <div className="toast-container">
          <div className="toast" style={{
            background: '#DC2626',
            color: 'white',
            fontWeight: 700,
            boxShadow: 'var(--shadow-lg)',
            border: '1px solid #B91C1C'
          }}>
            {showError}
          </div>
        </div>
      )}

      {/* MODAL PENGAJUAN KENDALA / IZIN / SAKIT (BERANDA) */}
      {showKendalaModal && (
        <div className="modal-overlay" onClick={() => setShowKendalaModal(null)}>
          <div className="modal" style={{ maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 800, color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <AlertCircle size={18} color="#EA580C" /> Pengajuan Kendala / Izin Sesi
              </h3>
            </div>
            <form onSubmit={handleSubmitKendala}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                <div style={{ padding: '10px 12px', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-md)', fontSize: 12 }}>
                  <div style={{ fontWeight: 700, color: 'var(--color-primary)' }}>
                    {showKendalaModal.mataPelajaran} ({showKendalaModal.jamMulai}–{showKendalaModal.jamSelesai} WITA)
                  </div>
                  <div style={{ color: 'var(--color-text-secondary)', marginTop: 2 }}>
                    Hari Ini: {hariIni}, {currentDate}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }}>Pilih Kategori Kendala</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <button
                      type="button"
                      className={`btn btn-sm ${kendalaTipe === 'izin' ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => setKendalaTipe('izin')}
                      style={{ fontWeight: 800, padding: '10px 14px' }}
                    >
                      Izin
                    </button>
                    <button
                      type="button"
                      className={`btn btn-sm ${kendalaTipe === 'sakit' ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => setKendalaTipe('sakit')}
                      style={{ fontWeight: 800, padding: '10px 14px' }}
                    >
                      Sakit
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }}>Keterangan / Alasan Kendala *</label>
                  <textarea
                    className="form-input"
                    rows={3}
                    placeholder="Contoh: Mengalami kendala darurat di jalan / Sakit demam mendadak..."
                    value={kendalaAlasan}
                    onChange={(e) => setKendalaAlasan(e.target.value)}
                    required
                    style={{ fontSize: 12.5 }}
                  />
                </div>
              </div>

              <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowKendalaModal(null)}>
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  disabled={isSubmittingKendala}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}
                >
                  <Send size={13} /> {isSubmittingKendala ? 'Mengirim...' : 'Kirim Konfirmasi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL IZIN / SAKIT JADWAL BESOK */}
      {showTomorrowIzinModal && (
        <div className="modal-overlay" onClick={() => setShowTomorrowIzinModal(false)}>
          <div className="modal" style={{ maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 800, color: 'var(--color-text-primary)' }}>
                Konfirmasi Ketidakhadiran Besok
              </h3>
            </div>
            <form onSubmit={handleSubmitTomorrowIzin}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                <div style={{ padding: '10px 12px', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-md)', fontSize: 12 }}>
                  <div style={{ fontWeight: 700, color: 'var(--color-primary)' }}>
                    {tomorrowDayName}, {tomorrowDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </div>
                  <div style={{ color: 'var(--color-text-secondary)', marginTop: 2 }}>
                    {tomorrowSchedules.map((s) => `${s.mataPelajaran} (${s.jamMulai}–${s.jamSelesai})`).join(', ')}
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }}>Kategori</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <button type="button" className={`btn btn-sm ${tomorrowIzinType === 'izin' ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => setTomorrowIzinType('izin')} style={{ fontWeight: 700 }}>Izin</button>
                    <button type="button" className={`btn btn-sm ${tomorrowIzinType === 'sakit' ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => setTomorrowIzinType('sakit')} style={{ fontWeight: 700 }}>Sakit</button>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }}>Alasan *</label>
                  <textarea className="form-input" rows={3}
                    placeholder="Contoh: Mengikuti acara keluarga / Sakit demam..."
                    value={tomorrowAlasan} onChange={(e) => setTomorrowAlasan(e.target.value)} required />
                </div>
              </div>
              <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                {tomorrowAbsRecord ? (
                  <button type="button" className="btn btn-outline btn-sm"
                    onClick={handleCancelIzinTomorrow} disabled={isSubmittingTomorrow}
                    style={{ borderColor: '#10B981', color: '#16A34A', fontWeight: 700, fontSize: 11 }}>
                    Ubah ke Siap Hadir
                  </button>
                ) : <div />}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowTomorrowIzinModal(false)}>Batal</button>
                  <button type="submit" className="btn btn-primary btn-sm" disabled={isSubmittingTomorrow}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}>
                    <Send size={13} /> {isSubmittingTomorrow ? 'Mengirim...' : 'Kirim Konfirmasi'}
                  </button>
                </div>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* HERO HEADER */}
      <div className="beranda-hero">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-4)' }}>
          <div>
            <p className="beranda-greeting">{greetingByTime()},</p>
            <p className="beranda-name">{guruData.nama.split(',')[0]}</p>
            <p style={{ fontSize: 'var(--font-size-xs)', opacity: 0.8, marginTop: 2 }}>{guruData.jabatan}</p>
          </div>
          {/* NIP badge kecil */}
          <div style={{
            background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)',
            borderRadius: 'var(--radius-full)', padding: '4px 10px',
            fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.9)',
            border: '1px solid rgba(255,255,255,0.2)',
          }}>
            {guruData.nip || guruData.statusKepegawaian || 'Tenaga Ajar'}
          </div>
        </div>
        <div className="beranda-clock">{currentTime || '--:--:--'}</div>
        <div className="beranda-date">{currentDate} WITA</div>
      </div>

      {/* ── STATS STRIP — REKAP BULAN INI ── */}
      <div style={{ padding: '0 var(--space-4)', marginTop: 'var(--space-4)', marginBottom: 'var(--space-3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 'var(--space-2)' }}>
          <TrendingUp size={14} color="var(--color-primary)" />
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Rekap Kehadiran — {new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
          </span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          {[
            { label: 'Tepat Waktu', value: statsMonth.hadir, color: '#10B981', bg: '#F0FDF4', border: '#86EFAC', icon: '✓' },
            { label: 'Terlambat', value: statsMonth.terlambat, color: '#F59E0B', bg: '#FFFBEB', border: '#FDE68A', icon: '⏱' },
            { label: 'Izin/Sakit', value: statsMonth.izinSakit, color: '#3B82F6', bg: '#EFF6FF', border: '#BFDBFE', icon: '📋' },
            { label: 'Alfa', value: statsMonth.alfa, color: '#EF4444', bg: '#FEF2F2', border: '#FCA5A5', icon: '✗' },
          ].map(({ label, value, color, bg, border, icon }) => (
            <div key={label} style={{
              background: bg, border: `1px solid ${border}`,
              borderRadius: 'var(--radius-md)', padding: '10px 8px',
              textAlign: 'center',
              transition: 'transform 0.15s ease',
            }}>
              <div style={{ fontSize: 18, fontWeight: 900, color, lineHeight: 1 }}>{value}</div>
              <div style={{ fontSize: 9.5, fontWeight: 700, color, marginTop: 2, lineHeight: 1.2 }}>{label}</div>
            </div>
          ))}
        </div>
        {statsMonth.total === 0 && (
          <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', textAlign: 'center', marginTop: 6 }}>
            Belum ada data absensi bulan ini
          </div>
        )}
      </div>

      {/* ─── KONDISI ABSENSI OTOMATIS BERDASARKAN JADWAL & WAKTU ─── */}

      {/* 1. KONDISI: TIDAK MEMILIKI JADWAL HARI INI */}
      {todayJadwal.length === 0 && (
        <div className="absen-card" style={{ background: 'var(--color-surface)', textAlign: 'center', padding: 'var(--space-6) var(--space-4)' }}>
          <div style={{
            width: 48, height: 48, borderRadius: '50%', background: 'var(--color-surface-2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto var(--space-3)',
            color: 'var(--color-text-tertiary)'
          }}>
            <Calendar size={24} />
          </div>
          <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 800, color: 'var(--color-text-primary)', marginBottom: 4 }}>
            Tidak Ada Jadwal Mengajar Hari Ini
          </h3>
          <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', maxWidth: 300, margin: '0 auto', lineHeight: 1.5 }}>
            Hari ini Anda tidak memiliki jadwal mengajar terdaftar di yayasan. Form absensi tidak ditampilkan.
          </p>
        </div>
      )}

      {/* 2. KONDISI: ADA JADWAL HARI INI */}
      {todayJadwal.length > 0 && (
        <>
          {/* A. SEMUA SESI AKTIF (masing-masing ditampilkan terpisah) */}
          {activeJadwalList.map((jadwal) => {
            const sessionData = sessionsMap[jadwal.id];
            const locState = locationStateMap[jadwal.id] || 'idle';
            const isThisProcessing = isProcessing === jadwal.id;

            return (
            <div key={jadwal.id} className="absen-card">
              {/* Header Sesi */}
              {(() => {
                const isPastSession = currentMinutes > timeToMinutes(jadwal.jamSelesai);
                const hasMasuk = !!sessionData?.jamMasuk;
                return (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-3)' }}>
                    <div>
                      {isPastSession && hasMasuk ? (
                        <span className="badge" style={{ marginBottom: 6, display: 'inline-flex', alignItems: 'center', gap: 4, background: '#FFF7ED', color: '#C2410C', border: '1px solid #FED7AA' }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#F97316', display: 'inline-block' }} />
                          Waktu Selesai — Absen Pulang Diperlukan
                        </span>
                      ) : (
                        <span className="badge badge-success" style={{ marginBottom: 6, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
                          Sesi Absensi Aktif
                        </span>
                      )}
                      <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 800 }}>{jadwal.mataPelajaran}</h3>
                      <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', marginTop: 2 }}>
                        {jadwal.catatan && jadwal.catatan !== 'Ustadz' && jadwal.catatan !== 'Ustadzah' ? `${jadwal.catatan}` : ''}
                        {jadwal.catatan && jadwal.catatan !== 'Ustadz' && jadwal.catatan !== 'Ustadzah' && appSettings.lokasiNama ? ' • ' : ''}
                        {appSettings.lokasiNama ? `Lokasi: ${appSettings.lokasiNama}` : ''}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', fontWeight: 600 }}>
                        {currentMinutes > timeToMinutes(jadwal.jamSelesai) ? 'Selesai Pukul' : 'Jadwal Mulai'}
                      </div>
                      <div style={{ fontSize: 'var(--font-size-base)', fontWeight: 800, color: isPastSession ? '#C2410C' : 'var(--color-primary)', marginTop: 2 }}>
                        {isPastSession ? jadwal.jamSelesai : jadwal.jamMulai} WITA
                      </div>
                      {!isPastSession && (
                        <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)', marginTop: 2 }}>
                          Buka sejak {subtractMinutesFromTime(jadwal.jamMulai, leadMinutes)} WITA
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Status Waktu Masuk jika sudah Absen Masuk */}
              {sessionData?.jamMasuk && (
                <>
                  {/* Badge: Tercatat Absen Masuk */}
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 14px', background: 'var(--color-surface-2)',
                    borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-2)',
                    border: '1px solid var(--color-border-light)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <CheckCircle2 size={16} color="var(--color-success)" />
                      <div>
                        <div style={{ fontSize: 'var(--font-size-xs)', fontWeight: 700 }}>Tercatat Absen Masuk</div>
                        <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>
                          Status: <span style={{ fontWeight: 600, color: sessionData.status === 'hadir_tepat_waktu' ? 'var(--color-success)' : 'var(--color-warning)' }}>
                            {sessionData.status === 'hadir_tepat_waktu' ? 'Hadir Tepat Waktu' : 'Terlambat'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 800, color: 'var(--color-success)' }}>
                      {sessionData.jamMasuk} WITA
                    </div>
                  </div>

                  {/* Panel: Durasi + GPS Status + Visit Mode */}
                  <div style={{
                    background: 'var(--color-surface-2)',
                    borderRadius: 'var(--radius-md)',
                    marginBottom: 'var(--space-3)',
                    border: '1px solid var(--color-border-light)',
                    overflow: 'hidden'
                  }}>
                    {/* Durasi kehadiran */}
                    <div style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '8px 14px',
                      borderBottom: '1px solid var(--color-border-light)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--color-text-secondary)' }}>
                        <Timer size={13} color="var(--color-primary)" />
                        <span>Durasi Kehadiran</span>
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-primary)' }}>
                        {getDuration(sessionData.jamMasuk)}
                      </span>
                    </div>

                    {/* Status zona GPS */}
                    <div style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '8px 14px',
                      borderBottom: '1px solid var(--color-border-light)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--color-text-secondary)' }}>
                        <Radio size={13} color={gpsZoneMap[jadwal.id] === 'outside' ? '#EF4444' : '#10B981'} />
                        <span>Status GPS</span>
                      </div>
                      <span style={{
                        fontSize: 11, fontWeight: 700,
                        color: gpsZoneMap[jadwal.id] === 'outside'
                          ? (visitModeMap[jadwal.id] ? '#F59E0B' : '#EF4444')
                          : gpsZoneMap[jadwal.id] === 'inside'
                          ? '#10B981'
                          : 'var(--color-text-tertiary)'
                      }}>
                        {gpsZoneMap[jadwal.id] === 'inside'
                          ? '✓ Di dalam zona absensi'
                          : gpsZoneMap[jadwal.id] === 'outside'
                          ? visitModeMap[jadwal.id] ? '✈ Di luar zona (Visit Mode)' : '⚠ Di luar zona absensi'
                          : '— Belum dicek'}
                      </span>
                    </div>

                    {/* Waktu cek terakhir */}
                    <div style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '8px 14px',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--color-text-secondary)' }}>
                        <Clock size={13} color="var(--color-text-tertiary)" />
                        <span>Cek GPS Terakhir</span>
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-tertiary)' }}>
                        {lastGpsCheckMap[jadwal.id] ? `${lastGpsCheckMap[jadwal.id]} WITA` : '— (otomatis setiap 2 mnt)'}
                      </span>
                    </div>
                  </div>

                  {/* Tombol Izin Visit */}
                  <button
                    type="button"
                    onClick={() => toggleVisitMode(jadwal.id)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      padding: '10px 16px',
                      borderRadius: 'var(--radius-md)',
                      fontWeight: 700,
                      fontSize: 13,
                      marginBottom: 'var(--space-3)',
                      cursor: 'pointer',
                      border: visitModeMap[jadwal.id]
                        ? '2px solid #D97706'
                        : '1.5px solid var(--color-border)',
                      background: visitModeMap[jadwal.id]
                        ? 'linear-gradient(135deg, #FEF3C7, #FDE68A)'
                        : 'var(--color-surface)',
                      color: visitModeMap[jadwal.id] ? '#92400E' : 'var(--color-text-secondary)',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <Plane size={15} />
                    {visitModeMap[jadwal.id]
                      ? '✓ Mode Visit Aktif — Klik untuk nonaktifkan'
                      : 'Izin Visit (Keluar Area Tanpa Absen Pulang)'}
                  </button>
                </>
              )}



              {/* Tombol Absen — state per-sesi */}
              {locState === 'idle' && (
                <div style={{ display: 'flex', gap: 8, alignItems: 'stretch' }}>
                  <button
                    type="button"
                    className="absen-btn-main"
                    onClick={() => handleCheckLocation(jadwal.id)}
                    disabled={!!isProcessing}
                    style={{
                      flex: 1,
                      cursor: 'pointer',
                      background: sessionData?.jamMasuk
                        ? 'linear-gradient(135deg, #EA580C, #C2410C)'
                        : 'linear-gradient(135deg, #1B6B4A, #14532D)',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      padding: '14px 16px',
                      borderRadius: 'var(--radius-md)',
                      fontWeight: 800,
                      boxShadow: sessionData?.jamMasuk
                        ? '0 4px 14px rgba(234, 88, 12, 0.25)'
                        : '0 4px 14px rgba(27, 107, 74, 0.25)',
                      border: 'none'
                    }}
                  >
                    {sessionData?.jamMasuk ? (
                      <><LogOut size={18} /> Absen Pulang ({jadwal.mataPelajaran})</>
                    ) : (
                      <><MapPin size={18} /> Cek Lokasi Absensi ({jadwal.mataPelajaran})</>
                    )}
                  </button>

                  {/* Tombol Kendala / Izin / Sakit di samping Cek Lokasi */}
                  {!sessionData?.jamMasuk && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowKendalaModal(jadwal);
                        setKendalaTipe('izin');
                        setKendalaAlasan('');
                      }}
                      disabled={!!isProcessing}
                      style={{
                        padding: '10px 14px',
                        borderRadius: 'var(--radius-md)',
                        border: '1.5px solid #FED7AA',
                        background: '#FFF7ED',
                        color: '#C2410C',
                        fontWeight: 800,
                        fontSize: 11.5,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 2,
                        cursor: 'pointer',
                        flexShrink: 0,
                        minWidth: 84,
                        boxShadow: '0 2px 8px rgba(249, 115, 22, 0.08)',
                        transition: 'all 0.15s ease',
                      }}
                      title="Ada Kendala? Ajukan Izin / Sakit"
                    >
                      <AlertCircle size={16} color="#EA580C" />
                      <span>Kendala / Izin</span>
                    </button>
                  )}
                </div>
              )}

              {locState === 'checking' && (
                <button type="button" className="absen-btn-main" disabled
                  style={{ cursor: 'not-allowed', background: '#6B7280', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '14px 20px', borderRadius: 'var(--radius-md)', fontWeight: 800, width: '100%', border: 'none' }}
                >
                  <span className="animate-spin"><Clock size={18} /></span> Memeriksa Koordinat GPS...
                </button>
              )}

              {locState === 'invalid' && (
                <div style={{ padding: '16px', background: '#FEF2F2', border: '1.5px solid #FCA5A5', borderRadius: 'var(--radius-lg)', marginBottom: 'var(--space-3)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#991B1B', fontWeight: 800, fontSize: 14 }}>
                    <AlertCircle size={18} color="#DC2626" /> Di Luar Jangkauan Absensi
                  </div>
                  <p style={{ fontSize: 12.5, color: '#7F1D1D', marginTop: 6, lineHeight: 1.5 }}>
                    Anda terdeteksi berada <strong>{distanceFromOffice !== null ? `${distanceFromOffice} meter` : 'jauh'}</strong> dari titik lokasi yayasan
                    (Maksimal radius: <strong>{appSettings.radius || 100} meter</strong>).
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${appSettings.latitude},${appSettings.longitude}&travelmode=driving`}
                      target="_blank" rel="noopener noreferrer"
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 16px', borderRadius: 'var(--radius-md)', fontWeight: 800, fontSize: 13, textDecoration: 'none', background: 'linear-gradient(135deg, #0284C7, #0369A1)', color: '#ffffff', border: 'none' }}
                    >
                      <Navigation size={17} /> Menuju Lokasi Absen (Buka Rute Maps)
                    </a>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button type="button" onClick={() => handleCheckLocation(jadwal.id)} disabled={!!isProcessing}
                        style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px 14px', borderRadius: 'var(--radius-md)', fontWeight: 700, fontSize: 12, background: '#ffffff', color: '#374151', border: '1px solid #D1D5DB', cursor: 'pointer' }}
                      >
                        <RotateCcw size={14} /> Cek Lagi
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowKendalaModal(jadwal);
                          setKendalaTipe('izin');
                          setKendalaAlasan('');
                        }}
                        disabled={!!isProcessing}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px 14px', borderRadius: 'var(--radius-md)', fontWeight: 700, fontSize: 12, background: '#FFF7ED', color: '#C2410C', border: '1px solid #FDBA74', cursor: 'pointer' }}
                      >
                        <AlertCircle size={14} /> Ajukan Izin / Sakit
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {locState === 'valid' && (
                <div>
                  <div style={{ padding: '10px 14px', background: '#F0FDF4', border: '1px solid #86EFAC', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-3)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#166534', fontSize: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}>
                      <CheckCircle2 size={16} color="#16A34A" /> Lokasi Terverifikasi
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#15803D' }}>
                      Jarak: {distanceFromOffice !== null ? `${distanceFromOffice}m` : '0m'} (Maks: {appSettings.radius || 100}m)
                    </span>
                  </div>

                  {!sessionData?.jamMasuk ? (
                    <button
                      type="button"
                      className="absen-btn-main"
                      onClick={() => handleAbsenMasuk(jadwal)}
                      disabled={isThisProcessing}
                      style={{
                        cursor: 'pointer',
                        background: 'linear-gradient(135deg, #16A34A, #15803D)',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        padding: '14px 20px',
                        borderRadius: 'var(--radius-md)',
                        fontWeight: 800,
                        width: '100%',
                        boxShadow: '0 4px 14px rgba(22, 163, 74, 0.3)',
                        border: 'none',
                        WebkitTapHighlightColor: 'transparent',
                        touchAction: 'manipulation',
                      }}
                    >
                      {isThisProcessing ? (
                        <><span className="animate-spin"><Clock size={18} /></span> Memproses Absen...</>
                      ) : (
                        <><LogIn size={20} /> Mulai Absen Masuk ({jadwal.jamMulai} WITA)</>
                      )}
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="absen-btn-pulang"
                      onClick={() => handleAbsenPulang(jadwal)}
                      disabled={isThisProcessing}
                      style={{
                        cursor: 'pointer',
                        background: 'linear-gradient(135deg, #EA580C, #C2410C)',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        padding: '14px 20px',
                        borderRadius: 'var(--radius-md)',
                        fontWeight: 800,
                        width: '100%',
                        boxShadow: '0 4px 14px rgba(234, 88, 12, 0.3)',
                        border: 'none',
                        WebkitTapHighlightColor: 'transparent',
                        touchAction: 'manipulation',
                      }}
                    >
                      {isThisProcessing ? (
                        <><span className="animate-spin"><Clock size={18} /></span> Memproses Pulang...</>
                      ) : (
                        <><LogOut size={20} /> Absen Pulang — {jadwal.mataPelajaran}</>
                      )}
                    </button>
                  )}
                </div>
              )}
            </div>
            );
          })}


          {/* B. TIDAK ADA SESI AKTIF: JADWAL MENDATANG BELUM BUKA */}
          {activeJadwalList.length === 0 && upcomingJadwal && (
            <div className="absen-card" style={{ background: 'var(--color-surface)', padding: 'var(--space-5) var(--space-4)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
                <Clock size={18} color="var(--color-primary)" />
                <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 800, color: 'var(--color-text-primary)' }}>
                  Jadwal Sesi Berikutnya
                </span>
              </div>

              <div style={{
                padding: '12px 14px', background: 'var(--color-surface-2)',
                borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border-light)',
                marginBottom: 'var(--space-3)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h4 style={{ fontSize: 'var(--font-size-base)', fontWeight: 800 }}>{upcomingJadwal.mataPelajaran}</h4>
                    <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', marginTop: 2 }}>
                      {upcomingJadwal.kelas} • {upcomingJadwal.jamMulai}–{upcomingJadwal.jamSelesai} WITA
                    </p>
                  </div>
                  <span className="badge badge-primary">{upcomingJadwal.jamMulai} WITA</span>
                </div>
              </div>

              <div style={{
                fontSize: 'var(--font-size-xs)',
                lineHeight: 1.5,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: 'var(--color-accent-light)',
                padding: '8px 12px',
                borderRadius: 'var(--radius-md)',
                color: 'var(--color-primary)',
                fontWeight: 600
              }}>
                <Sparkles size={16} />
                <span>
                  Tombol absen akan otomatis muncul pada pukul <strong>{subtractMinutesFromTime(upcomingJadwal.jamMulai, leadMinutes)} WITA</strong> ({leadMinutes} menit sebelum jadwal).
                </span>
              </div>
            </div>
          )}

          {/* C. SEMUA JADWAL HARI INI TELAH SELESAI ATAU TERLEWAT */}
          {activeJadwalList.length === 0 && !upcomingJadwal && allSessionsFinishedOrMissed && (
            <div className="absen-card" style={{ background: 'var(--color-surface)', textAlign: 'center', padding: 'var(--space-6) var(--space-4)' }}>
              <div style={{
                width: 48, height: 48, borderRadius: '50%', background: finishedList.length > 0 ? 'var(--color-success-light)' : 'var(--color-danger-light)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto var(--space-3)',
                color: finishedList.length > 0 ? 'var(--color-success)' : 'var(--color-danger)'
              }}>
                <CheckCircle2 size={28} />
              </div>
              <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 800, color: finishedList.length > 0 ? 'var(--color-success)' : 'var(--color-text-primary)', marginBottom: 4 }}>
                {finishedList.length === todayJadwal.length
                  ? 'Semua Absensi Hari Ini Selesai'
                  : 'Rekap Jadwal Hari Ini'}
              </h3>
              <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', maxWidth: 360, margin: '0 auto var(--space-4)', lineHeight: 1.5 }}>
                {finishedList.length === todayJadwal.length
                  ? 'Jazakallahu Khairan! Seluruh sesi jadwal mengajar hari ini telah Anda selesaikan absensinya.'
                  : `${finishedList.length} sesi selesai dihadiri, ${missedList.length} sesi terlewat.`}
              </p>

              {/* Ringkasan Sesi Hari Ini */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, textAlign: 'left' }}>
                {todayJadwal.map((j) => {
                  const s = sessionsMap[j.id];
                  const isDone = s?.isDone;
                  const isMissed = !isDone && !s?.jamMasuk && currentMinutes > timeToMinutes(j.jamSelesai);

                  return (
                    <div key={j.id} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '10px 12px', background: 'var(--color-surface-2)',
                      borderRadius: 'var(--radius-md)', border: isMissed ? '1px solid #FCA5A5' : '1px solid var(--color-border-light)',
                      fontSize: 'var(--font-size-xs)'
                    }}>
                      <div>
                        <div style={{ fontWeight: 700 }}>
                          {j.mataPelajaran}
                          {j.catatan && j.catatan !== 'Ustadz' && j.catatan !== 'Ustadzah' && j.catatan !== j.mataPelajaran ? ` (${j.catatan})` : ''}
                        </div>
                        <div style={{ color: 'var(--color-text-tertiary)', fontSize: 11 }}>{j.jamMulai}–{j.jamSelesai} WITA</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        {isDone ? (
                          <span className="badge badge-success" style={{ fontSize: 11 }}>
                            Masuk {s?.jamMasuk || '—'} • Pulang {s?.jamPulang || '—'}
                          </span>
                        ) : isMissed ? (
                          <span className="badge badge-danger" style={{ fontSize: 11 }}>
                            Terlewat / Alfa
                          </span>
                        ) : (
                          <span className="badge badge-neutral" style={{ fontSize: 11 }}>
                            Belum Ada Presensi
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}


      {/* ── CARD JADWAL BESOK ── */}
      {tomorrowSchedules.length > 0 && (
        <div style={{ padding: '0 var(--space-4)', marginTop: 'var(--space-5)', marginBottom: 'var(--space-4)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 'var(--space-2)' }}>
            <Calendar size={14} color="var(--color-primary)" />
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Jadwal Besok
            </span>
          </div>

          {tomorrowHadirConfirmed || (tomorrowAbsRecord && (tomorrowAbsRecord.status === 'izin' || tomorrowAbsRecord.status === 'sakit')) ? (
            /* TAMPILAN RINGKAS SETELAH DIKONFIRMASI */
            <div className="card" style={{
              border: tomorrowAbsRecord ? '1px solid #BFDBFE' : '1px solid #86EFAC',
              background: tomorrowAbsRecord ? '#EFF6FF' : '#F0FDF4',
              borderRadius: 'var(--radius-md)',
              boxShadow: 'none'
            }}>
              <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5 }}>
                  <CheckCircle2 size={16} color={tomorrowAbsRecord ? '#3B82F6' : '#16A34A'} />
                  <span style={{ fontWeight: 600, color: tomorrowAbsRecord ? '#1E40AF' : '#15803D' }}>
                    Jadwal Besok ({tomorrowDayName}): Anda mengonfirmasi <strong>{tomorrowAbsRecord ? (tomorrowAbsRecord.status === 'izin' ? 'Izin' : 'Sakit') : 'Siap Hadir'}</strong>
                  </span>
                </div>
                <button type="button" className="btn btn-ghost btn-sm"
                  onClick={() => {
                    if (tomorrowAbsRecord) {
                      setTomorrowIzinType(tomorrowAbsRecord.status as any);
                      setTomorrowAlasan(tomorrowAbsRecord.keterangan.replace(/Konfirmasi (Izin|Sakit): /, ''));
                      setShowTomorrowIzinModal(true);
                    } else {
                      if (typeof window !== 'undefined') {
                        localStorage.removeItem('jadwal_besok_hadir_confirmed_date');
                      }
                      setTomorrowHadirConfirmed(false);
                    }
                  }}
                  style={{ fontSize: 11, padding: '4px 8px', height: 'auto', color: tomorrowAbsRecord ? '#1E40AF' : '#15803D', display: 'flex', alignItems: 'center', gap: 3, fontWeight: 700 }}>
                  <Edit2 size={11} /> Ubah
                </button>
              </div>
            </div>
          ) : (
            /* TAMPILAN PENUH JIKA BELUM DIKONFIRMASI */
            <div className="card" style={{
              border: '1.5px solid var(--color-primary)',
              background: 'linear-gradient(135deg, var(--color-primary-light) 0%, var(--color-surface) 100%)',
            }}>
              <div style={{ padding: '14px 16px' }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 'var(--font-size-sm)', color: 'var(--color-primary)' }}>
                      {tomorrowDayName}, {tomorrowDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 2 }}>
                      {tomorrowSchedules.length} sesi mengajar
                    </div>
                  </div>
                </div>

                {/* Daftar sesi besok */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
                  {tomorrowSchedules.map((s) => (
                    <div key={s.id} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '8px 10px', background: 'var(--color-surface)',
                      borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border-light)',
                      fontSize: 12,
                    }}>
                      <span style={{ fontWeight: 700 }}>{s.mataPelajaran}</span>
                      <span style={{ color: 'var(--color-primary)', fontWeight: 600 }}>{s.jamMulai}–{s.jamSelesai} WITA</span>
                    </div>
                  ))}
                </div>

                {/* Tombol konfirmasi */}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" className="btn btn-primary btn-sm"
                    onClick={handleConfirmHadirBesok}
                    style={{ flex: 1, fontWeight: 700, fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                    <CheckCircle2 size={13} /> Saya Siap Hadir
                  </button>
                  <button type="button" className="btn btn-outline btn-sm"
                    onClick={() => { setTomorrowIzinType('izin'); setTomorrowAlasan(''); setShowTomorrowIzinModal(true); }}
                    style={{ flex: 1, borderColor: 'var(--color-danger)', color: 'var(--color-danger)', fontWeight: 700, fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                    <XCircle size={13} /> Tidak Bisa Hadir
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}


      {/* JADWAL MENGAJAR HARI INI */}
      <div style={{ padding: '0 var(--space-4)', marginBottom: 'var(--space-5)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
          <h2 style={{ fontSize: 'var(--font-size-base)', fontWeight: 700 }}>Daftar Jadwal Mengajar Hari Ini</h2>
          <Link href="/guru/jadwal" style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: 2, fontWeight: 600 }}>
            Lihat Semua <ChevronRight size={14} />
          </Link>
        </div>

        {/* TABS FILTER JADWAL */}
        {todayJadwal.length > 0 && (
          <div style={{
            display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 8, marginBottom: 'var(--space-3)',
            scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch'
          }}>
            <button
              onClick={() => setScheduleFilterTab('semua')}
              className={`tab ${scheduleFilterTab === 'semua' ? 'active' : ''}`}
              style={{ padding: '6px 12px', fontSize: 12, borderRadius: 'var(--radius-full)' }}
            >
              Semua ({todayJadwal.length})
            </button>
            <button
              onClick={() => setScheduleFilterTab('aktif')}
              className={`tab ${scheduleFilterTab === 'aktif' ? 'active' : ''}`}
              style={{ padding: '6px 12px', fontSize: 12, borderRadius: 'var(--radius-full)' }}
            >
              Sedang Aktif ({activeList.length})
            </button>
            <button
              onClick={() => setScheduleFilterTab('selesai')}
              className={`tab ${scheduleFilterTab === 'selesai' ? 'active' : ''}`}
              style={{ padding: '6px 12px', fontSize: 12, borderRadius: 'var(--radius-full)' }}
            >
              Selesai ({finishedList.length})
            </button>
            <button
              onClick={() => setScheduleFilterTab('terlewat')}
              className={`tab ${scheduleFilterTab === 'terlewat' ? 'active' : ''}`}
              style={{ padding: '6px 12px', fontSize: 12, borderRadius: 'var(--radius-full)' }}
            >
              Terlewat ({missedList.length})
            </button>
          </div>
        )}

        {todayJadwal.length === 0 ? (
          <div className="card">
            <div className="empty-state" style={{ padding: 'var(--space-6)' }}>
              <div className="empty-state-icon"><Calendar size={20} /></div>
              <div className="empty-state-title" style={{ fontSize: 'var(--font-size-sm)' }}>Tidak Ada Jadwal Mengajar</div>
              <div className="empty-state-desc">Hari ini Anda tidak memiliki jadwal mengajar terdaftar.</div>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {todayJadwal
              .filter((j) => {
                if (scheduleFilterTab === 'aktif') return activeList.some((a) => a.id === j.id);
                if (scheduleFilterTab === 'selesai') return finishedList.some((f) => f.id === j.id);
                if (scheduleFilterTab === 'terlewat') return missedList.some((m) => m.id === j.id);
                return true;
              })
              .map((j) => {
                const sess = sessionsMap[j.id];
                const isDone = sess?.isDone || false;
                const isOpen = isSessionWindowOpen(j.jamMulai, leadMinutes, currentMinutes);
                const endMins = timeToMinutes(j.jamSelesai);
                const isPast = currentMinutes > endMins;
                const isActive = (!isDone && isOpen && !isPast) || (sess?.jamMasuk && !isDone);
                const isMissed = !isDone && !sess?.jamMasuk && isPast;

                return (
                  <div
                    key={j.id}
                    className="card"
                    style={{
                      borderLeft: isDone
                        ? '4px solid #10B981'
                        : isMissed
                        ? '4px solid #EF4444'
                        : isActive
                        ? '4px solid #22C55E'
                        : '4px solid #3B82F6',
                      opacity: isDone ? 0.9 : 1,
                    }}
                  >
                    <div className="card-body" style={{ padding: 'var(--space-4)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                            <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 700 }}>{j.mataPelajaran}</h3>
                            {isDone && sess?.status === 'alfa' ? (
                              <span className="badge badge-danger" style={{ fontSize: 10 }}>
                                ❌ Alfa (Tidak Hadir)
                              </span>
                            ) : isDone ? (
                              <span className="badge badge-success" style={{ fontSize: 10 }}>
                                ✓ {sess?.status === 'hadir_tepat_waktu' ? 'Hadir Tepat Waktu' : sess?.status === 'terlambat' ? 'Terlambat' : sess?.status === 'izin' ? 'Izin' : sess?.status === 'sakit' ? 'Sakit' : 'Selesai'}
                              </span>
                            ) : isMissed ? (
                              <span className="badge badge-danger" style={{ fontSize: 10 }}>
                                ❌ Terlewat (Tidak Hadir)
                              </span>
                            ) : isActive ? (
                              <span className="badge badge-success" style={{ fontSize: 10, background: '#DCFCE7', color: '#166534' }}>
                                🟢 Sedang Aktif Buka Presensi
                              </span>
                            ) : (
                              <span className="badge badge-primary" style={{ fontSize: 10 }}>
                                ⏳ Mendatang
                              </span>
                            )}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginTop: 4, flexWrap: 'wrap' }}>
                            <Clock size={13} color="var(--color-text-tertiary)" />
                            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>
                              {j.jamMulai}–{j.jamSelesai} WITA
                            </span>
                            {!isDone && !isMissed && (
                              <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>
                                • Buka: {subtractMinutesFromTime(j.jamMulai, leadMinutes)} WITA
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Info Jam Masuk / Pulang Jika Selesai */}
                      {isDone && sess && (
                        <div style={{
                          marginTop: 'var(--space-2)', padding: '6px 10px',
                          background: 'var(--color-surface-2)', borderRadius: 'var(--radius-sm)',
                          fontSize: 11, color: 'var(--color-text-secondary)', display: 'flex', gap: 12
                        }}>
                          <span>Masuk: <strong>{sess.jamMasuk || '—'} WITA</strong></span>
                          <span>Pulang: <strong>{sess.jamPulang || '—'} WITA</strong></span>
                        </div>
                      )}

                      {/* Info Terlewat */}
                      {isMissed && (
                        <div style={{
                          marginTop: 'var(--space-2)', padding: '6px 10px',
                          background: '#FEF2F2', borderRadius: 'var(--radius-sm)',
                          fontSize: 11, color: '#991B1B'
                        }}>
                          Sesi ini telah berakhir pukul {j.jamSelesai} WITA tanpa ada konfirmasi presensi hadir/izin.
                        </div>
                      )}

                      <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-3)', flexWrap: 'wrap' }}>
                        {j.catatan && j.catatan !== 'Ustadz' && j.catatan !== 'Ustadzah' && j.catatan !== j.mataPelajaran && (
                          <span className="badge badge-primary">{j.catatan}</span>
                        )}
                        {appSettings.lokasiNama && (
                          <span className="badge badge-neutral" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <MapPin size={11} /> {appSettings.lokasiNama}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {/* ── REKAP KEHADIRAN MINGGU INI ── */}
      <div style={{ padding: '0 var(--space-4)', marginBottom: 'var(--space-5)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 'var(--space-2)' }}>
          <Award size={14} color="var(--color-primary)" />
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Rekap Minggu Ini
          </span>
        </div>
        <div className="card">
          <div style={{ padding: '12px 14px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 6 }}>
              {weekDays.map(({ dayName, isToday, isPast, absenRec, dayRecs, isMixed }) => {
                const shortDay = dayName.slice(0, 3);
                let bgColor = 'var(--color-surface-2)';
                let textColor = 'var(--color-text-tertiary)';
                let statusLabel = '—';
                let bgGradient: string | undefined;

                if (isPast && absenRec) {
                  const s = absenRec.status;
                  if (s === 'hadir_tepat_waktu') { bgColor = '#F0FDF4'; textColor = '#065F46'; statusLabel = '✓'; }
                  else if (s === 'terlambat') { bgColor = '#FFFBEB'; textColor = '#92400E'; statusLabel = '⏱'; }
                  else if (s === 'izin' || s === 'sakit') { bgColor = '#EFF6FF'; textColor = '#1E40AF'; statusLabel = '📋'; }
                  else if (s === 'alfa') { bgColor = '#FEF2F2'; textColor = '#991B1B'; statusLabel = '✗'; }

                  // Campuran: split background dua warna
                  if (isMixed) {
                    // Cek apakah ada hadir + alfa → paling umum
                    const hasAlfa = dayRecs.some((r) => r.status === 'alfa');
                    const hasHadir = dayRecs.some((r) => r.status === 'hadir_tepat_waktu' || r.status === 'terlambat');
                    if (hasAlfa && hasHadir) {
                      bgGradient = 'linear-gradient(135deg, #F0FDF4 50%, #FEF2F2 50%)';
                      textColor = '#92400E';
                      statusLabel = '⚠';
                    }
                  }
                } else if (isPast && !absenRec) {
                  statusLabel = '○';
                }

                return (
                  <div key={dayName}
                    title={isMixed && dayRecs.length > 0
                      ? `${dayRecs.length} sesi: ${dayRecs.map((r) => r.status === 'hadir_tepat_waktu' ? 'Hadir' : r.status === 'alfa' ? 'Alfa' : r.status === 'terlambat' ? 'Terlambat' : r.status).join(', ')}`
                      : undefined
                    }
                    style={{
                      textAlign: 'center', padding: '8px 4px',
                      borderRadius: 'var(--radius-md)',
                      background: isToday ? 'var(--color-primary)' : (bgGradient || bgColor),
                      border: isToday ? 'none' : (isMixed ? '1.5px dashed #F59E0B' : '1px solid var(--color-border-light)'),
                      transition: 'all 0.15s ease',
                      cursor: isMixed ? 'help' : 'default',
                    }}>
                    <div style={{ fontSize: 9, fontWeight: 700, color: isToday ? 'rgba(255,255,255,0.8)' : 'var(--color-text-tertiary)', marginBottom: 2 }}>
                      {shortDay}
                    </div>
                    <div style={{ fontSize: isMixed ? 12 : 14, fontWeight: 900, color: isToday ? '#fff' : textColor, lineHeight: 1 }}>
                      {isToday ? '•' : statusLabel}
                    </div>
                    {isMixed && !isToday && (
                      <div style={{ fontSize: 8, fontWeight: 700, color: '#92400E', marginTop: 1 }}>
                        {dayRecs.length}sesi
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 10, flexWrap: 'wrap' }}>
              {[
                { label: 'Hadir', color: '#10B981' }, { label: 'Terlambat', color: '#F59E0B' },
                { label: 'Izin/Sakit', color: '#3B82F6' }, { label: 'Alfa', color: '#EF4444' },
              ].map(({ label, color }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'var(--color-text-tertiary)' }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: color, display: 'inline-block' }} />
                  {label}
                </div>
              ))}
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'var(--color-text-tertiary)' }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: 'linear-gradient(135deg, #F0FDF4 50%, #FEF2F2 50%)', border: '1px dashed #F59E0B', display: 'inline-block' }} />
                Campuran
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* KEGIATAN YAYASAN */}
      <div style={{ padding: '0 var(--space-4)', marginBottom: 'var(--space-6)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Star size={14} color="var(--color-primary)" />
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Kegiatan Yayasan
            </span>
          </div>
          <Link href="/guru/kegiatan" style={{ fontSize: 11, color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: 2, fontWeight: 600 }}>
            Lihat Semua <ChevronRight size={13} />
          </Link>
        </div>

        {kegiatanList.length === 0 ? (
          <div className="card">
            <div style={{ padding: 'var(--space-4)', textAlign: 'center' }}>
              <Users size={22} color="var(--color-text-tertiary)" style={{ margin: '0 auto 6px' }} />
              <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', fontWeight: 500 }}>Belum ada agenda kegiatan yayasan.</div>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {kegiatanList.filter((k) => k.status !== 'selesai').slice(0, 3).map((k) => {
              const myPartisipasi = mockPartisipasi.find((p) => p.kegiatanId === k.id && (p.guruId === guruData.id || p.guruNama === guruData.nama));
              const responLabel = myPartisipasi?.respons === 'hadir' ? '✓ Hadir' : myPartisipasi?.respons === 'tidak_hadir' ? '✗ Tidak Hadir' : null;
              return (
                <div key={k.id} className="card" style={{
                  borderLeft: k.status === 'berlangsung' ? '4px solid #10B981' : k.wajib ? '4px solid #EF4444' : '4px solid var(--color-primary)',
                }}>
                  <div style={{ padding: '12px 14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 4, flexWrap: 'wrap' }}>
                          <span className={`badge ${k.status === 'berlangsung' ? 'badge-success' : 'badge-primary'}`} style={{ fontSize: 10 }}>
                            {k.status === 'berlangsung' ? '🟢 Berlangsung' : '📅 Mendatang'}
                          </span>
                          {k.wajib && <span className="badge badge-danger" style={{ fontSize: 10 }}>Wajib</span>}
                          {responLabel && <span className="badge badge-neutral" style={{ fontSize: 10, fontWeight: 700 }}>{responLabel}</span>}
                        </div>
                        <div style={{ fontWeight: 700, fontSize: 'var(--font-size-sm)' }}>{k.nama}</div>
                        <div style={{ display: 'flex', gap: 10, marginTop: 4, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)', display: 'flex', alignItems: 'center', gap: 3 }}>
                            <Calendar size={11} />
                            {new Date(k.tanggalMulai || k.tanggal || '').toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} • {k.jamMulai} WITA
                          </span>
                          {k.lokasi && (
                            <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)', display: 'flex', alignItems: 'center', gap: 3 }}>
                              <MapPin size={11} /> {k.lokasi}
                            </span>
                          )}
                        </div>
                      </div>
                      <Link href="/guru/kegiatan" className="btn btn-secondary btn-sm" style={{ padding: '5px 10px', fontSize: 11, flexShrink: 0 }}>
                        {myPartisipasi ? 'Lihat' : 'Respons'}
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
