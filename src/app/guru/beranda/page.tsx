'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  MapPin, Clock, CheckCircle2, AlertCircle, LogIn, LogOut,
  Calendar, ChevronRight, Wifi, Briefcase, Sparkles, Check,
  Navigation, RotateCcw, Timer, Plane, Radio
} from 'lucide-react';
import Link from 'next/link';
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
  getJadwalForGuru
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

  // GPS Monitoring State
  const [visitModeMap, setVisitModeMap] = useState<Record<string, boolean>>({}); // visit mode per sesi
  const [gpsZoneMap, setGpsZoneMap] = useState<Record<string, 'inside' | 'outside' | 'unknown'>>({}); // status zona per sesi
  const [lastGpsCheckMap, setLastGpsCheckMap] = useState<Record<string, string>>({}); // waktu cek terakhir

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

    import('@/lib/supabaseClient').then(({ getAppSettingsSupabase, getJadwalMatrixSupabase, getGurusSupabase, getSesiListSupabase, getAbsensiSupabase }) => {
      getAppSettingsSupabase().then((s) => {
        if (s) setAppSettings(s);
      }).catch(() => {});

      getGurusSupabase().then((gurus) => {
        if (gurus && gurus.length > 0) {
          mockGuru.length = 0;
          mockGuru.push(...gurus);
          const savedId = typeof window !== 'undefined' ? localStorage.getItem('logged_in_guru_id') : null;
          if (savedId) {
            const f = gurus.find((g) => g.id === savedId);
            if (f) setGuruData(f);
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

  // Notifikasi otomatis ke email pengajar ketika sesi presensi dibuka
  useEffect(() => {
    if (!activeJadwal || !guruData?.email) return;

    const sess = sessionsMap[activeJadwal.id];
    // Hanya jika belum absen masuk dan belum selesai
    if (!sess?.jamMasuk && !sess?.isDone) {
      const todayStr = getTodayStringWITA();
      const storageKey = `muallim_notif_opened_${todayStr}_${activeJadwal.id}_${guruData.id}`;
      if (typeof window !== 'undefined') {
        const alreadySent = localStorage.getItem(storageKey);
        if (!alreadySent) {
          localStorage.setItem(storageKey, 'true');
          import('@/lib/emailService').then(({ sendAbsenOpenedNotificationEmail }) => {
            const waktuBukaStr = subtractMinutesFromTime(activeJadwal.jamMulai, leadMinutes);
            sendAbsenOpenedNotificationEmail({
              guruNama: guruData.nama,
              guruEmail: guruData.email,
              sesiNama: activeJadwal.mataPelajaran,
              mataPelajaran: activeJadwal.catatan || activeJadwal.mataPelajaran,
              jamMulai: activeJadwal.jamMulai,
              jamSelesai: activeJadwal.jamSelesai,
              waktuBuka: `${waktuBukaStr} WITA`,
              appUrl: 'https://muallim-wal-arham.vercel.app',
            }).catch(() => {});
          }).catch(() => {});
        }
      }
    }
  }, [activeJadwal?.id, guruData?.email, sessionsMap, leadMinutes]);

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

      {/* HERO HEADER */}
      <div className="beranda-hero">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-4)' }}>
          <div>
            <p className="beranda-greeting">{greetingByTime()},</p>
            <p className="beranda-name">{guruData.nama.split(',')[0]}</p>
            <p style={{ fontSize: 'var(--font-size-xs)', opacity: 0.8, marginTop: 2 }}>{guruData.jabatan}</p>
          </div>
        </div>
        <div className="beranda-clock">{currentTime || '--:--:--'}</div>
        <div className="beranda-date">{currentDate} WITA</div>
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
                <button
                  type="button"
                  className="absen-btn-main"
                  onClick={() => handleCheckLocation(jadwal.id)}
                  disabled={!!isProcessing}
                  style={{
                    cursor: 'pointer',
                    background: sessionData?.jamMasuk
                      ? 'linear-gradient(135deg, #EA580C, #C2410C)'
                      : 'linear-gradient(135deg, #1B6B4A, #14532D)',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    padding: '14px 20px',
                    borderRadius: 'var(--radius-md)',
                    fontWeight: 800,
                    width: '100%',
                    boxShadow: sessionData?.jamMasuk
                      ? '0 4px 14px rgba(234, 88, 12, 0.25)'
                      : '0 4px 14px rgba(27, 107, 74, 0.25)',
                    border: 'none'
                  }}
                >
                  {sessionData?.jamMasuk ? (
                    <><LogOut size={20} /> Absen Pulang — {jadwal.mataPelajaran}</>
                  ) : (
                    <><MapPin size={20} /> Cek Lokasi Absensi ({jadwal.mataPelajaran})</>
                  )}
                </button>
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
                    <button type="button" onClick={() => handleCheckLocation(jadwal.id)} disabled={!!isProcessing}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px 16px', borderRadius: 'var(--radius-md)', fontWeight: 700, fontSize: 12.5, background: '#ffffff', color: '#374151', border: '1px solid #D1D5DB', cursor: 'pointer' }}
                    >
                      <RotateCcw size={15} /> Cek Lokasi Lagi
                    </button>
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

      {/* KEGIATAN YAYASAN */}
      <div style={{ padding: '0 var(--space-4)', marginBottom: 'var(--space-6)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
          <h2 style={{ fontSize: 'var(--font-size-base)', fontWeight: 700 }}>Kegiatan Yayasan</h2>
          <Link href="/guru/kegiatan" style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: 2, fontWeight: 600 }}>
            Lihat Semua <ChevronRight size={14} />
          </Link>
        </div>

        {mockKegiatan.length === 0 ? (
          <div className="card">
            <div className="empty-state" style={{ padding: 'var(--space-4)' }}>
              <div className="empty-state-desc" style={{ fontSize: 'var(--font-size-xs)' }}>Belum ada agenda kegiatan yayasan.</div>
            </div>
          </div>
        ) : (
          mockKegiatan.slice(0, 2).map((k) => (
            <div key={k.id} className="card" style={{ marginBottom: 'var(--space-3)' }}>
              <div className="card-body" style={{ padding: 'var(--space-4)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
                      <span className={`badge ${k.status === 'berlangsung' ? 'badge-success' : 'badge-primary'}`}>
                        {k.status === 'berlangsung' ? 'Berlangsung' : 'Mendatang'}
                      </span>
                      {k.wajib && <span className="badge badge-danger">Wajib</span>}
                    </div>
                    <h3 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 700, marginTop: 'var(--space-2)' }}>{k.nama}</h3>
                    <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', marginTop: 2 }}>
                      {new Date(k.tanggalMulai || k.tanggal || '').toLocaleDateString('id-ID', { day: 'numeric', month: 'short', timeZone: 'Asia/Makassar' })} • {k.jamMulai} WITA
                    </p>
                  </div>
                  <Link href="/guru/kegiatan" className="btn btn-secondary btn-sm" style={{ padding: '6px 10px', fontSize: 11 }}>
                    Respons
                  </Link>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
}
