// ============================================================
// UTILITY FUNCTIONS — Mu'Allim Attendance
// ============================================================

import { AttendanceStatus, DayOfWeek, AbsensiRecord } from '@/types';

// ============================================================
// WITA TIMEZONE HELPERS
// ============================================================

const WITA_OFFSET = 8 * 60; // UTC+8 in minutes

export function getNowWITA(): Date {
  return new Date();
}

export function formatTimeWITA(date?: Date): string {
  const d = date || new Date();
  return d.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Makassar',
  }).replace(/\./g, ':');
}

export function formatDateWITA(date?: Date | string): string {
  const d = date
    ? typeof date === 'string'
      ? new Date(date)
      : date
    : new Date();
  return d.toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Asia/Makassar',
  });
}

export function formatDateShortWITA(date?: Date | string): string {
  const d = date
    ? typeof date === 'string'
      ? new Date(date)
      : date
    : new Date();
  return d.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Makassar',
  });
}

export function formatDateTimeWITA(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Makassar',
  }).replace(/\./g, ':') + ' WITA';
}

export function getTodayStringWITA(): string {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Makassar',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(now); // Returns YYYY-MM-DD in Makassar time
}

export function getCurrentHourMinuteWITA(): { hour: number; minute: number } {
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Makassar',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  }).formatToParts(now);

  let hour = 0;
  let minute = 0;
  for (const p of parts) {
    if (p.type === 'hour') hour = parseInt(p.value, 10);
    if (p.type === 'minute') minute = parseInt(p.value, 10);
  }
  if (hour === 24) hour = 0;
  return { hour, minute };
}

export function getCurrentMinutesWITA(): number {
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Makassar',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  }).formatToParts(now);

  let hour = 0;
  let minute = 0;
  for (const p of parts) {
    if (p.type === 'hour') hour = parseInt(p.value, 10);
    if (p.type === 'minute') minute = parseInt(p.value, 10);
  }
  if (hour === 24) hour = 0;
  return hour * 60 + minute;
}

export function timeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const clean = timeStr.trim().replace(/\./g, ':');
  const parts = clean.split(':').map((p) => parseInt(p, 10));
  const h = isNaN(parts[0]) ? 0 : parts[0];
  const m = isNaN(parts[1]) ? 0 : parts[1];
  return h * 60 + m;
}

/**
 * Hitung total durasi kerja dari jam masuk ke jam pulang.
 * @param jamMasuk  format "HH:mm"
 * @param jamPulang format "HH:mm"
 * @returns string seperti "8 jam 30 menit", atau "—" jika salah satu kosong
 */
export function hitungDurasi(
  jamMasuk: string | null,
  jamPulang: string | null
): string {
  if (!jamMasuk || !jamPulang) return '—';
  const masuk = timeToMinutes(jamMasuk);
  const pulang = timeToMinutes(jamPulang);
  const total = pulang - masuk;
  if (total <= 0) return '—';
  const jam = Math.floor(total / 60);
  const menit = total % 60;
  if (jam === 0) return `${menit} menit`;
  if (menit === 0) return `${jam} jam`;
  return `${jam} jam ${menit} menit`;
}

/**
 * Hitung total durasi dalam menit.
 * Berguna untuk menghitung rata-rata atau total agregat.
 */
export function hitungDurasiMenit(
  jamMasuk: string | null,
  jamPulang: string | null
): number {
  if (!jamMasuk || !jamPulang) return 0;
  return Math.max(0, timeToMinutes(jamPulang) - timeToMinutes(jamMasuk));
}

export function getDayOfWeekWITA(): DayOfWeek {
  const days: DayOfWeek[] = ['Ahad', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const now = getNowWITA();
  return days[now.getDay()];
}

export function minutesToTimeString(totalMinutes: number): string {
  const normalized = ((totalMinutes % 1440) + 1440) % 1440;
  const h = Math.floor(normalized / 60);
  const m = normalized % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function subtractMinutesFromTime(timeStr: string, minutes: number = 60): string {
  const mins = timeToMinutes(timeStr);
  return minutesToTimeString(mins - minutes);
}

/**
 * Memeriksa apakah jendela absensi sudah terbuka (default: 60 menit sebelum jamMulai)
 */
export function isSessionWindowOpen(
  jamMulai: string,
  leadMinutes: number = 60,
  currentMinutes?: number
): boolean {
  const nowMins = currentMinutes !== undefined && !isNaN(currentMinutes)
    ? currentMinutes
    : getCurrentMinutesWITA();
  const startMins = timeToMinutes(jamMulai);
  const openMins = startMins - leadMinutes;
  return nowMins >= openMins;
}

/**
 * Dapatkan jam mulai jadwal pertama guru pada hari tertentu (Sistem Shift/Jadwal)
 */
export function getJamMulaiShiftHariIni(
  guruId: string,
  jadwalList: Array<{ guruId: string; hari: DayOfWeek; jamMulai: string; aktif: boolean }>,
  hari: DayOfWeek
): string | null {
  const jadwalHariIni = jadwalList
    .filter((j) => j.guruId === guruId && j.hari === hari && j.aktif)
    .sort((a, b) => a.jamMulai.localeCompare(b.jamMulai));

  return jadwalHariIni.length > 0 ? jadwalHariIni[0].jamMulai : null;
}

// ============================================================
// ATTENDANCE HELPERS
// ============================================================

export function getStatusLabel(status: AttendanceStatus): string {
  const labels: Record<AttendanceStatus, string> = {
    hadir_tepat_waktu: 'Hadir Tepat Waktu',
    terlambat: 'Terlambat',
    izin: 'Izin',
    sakit: 'Sakit',
    alfa: 'Alfa',
    belum_absen: 'Belum Absen',
  };
  return labels[status];
}

export function getStatusColor(status: AttendanceStatus): string {
  const colors: Record<AttendanceStatus, string> = {
    hadir_tepat_waktu: 'success',
    terlambat: 'warning',
    izin: 'info',
    sakit: 'info',
    alfa: 'danger',
    belum_absen: 'neutral',
  };
  return colors[status];
}

export function computeAttendanceStatus(
  jamMasuk: string,
  jamMasukWajib: string,
  batasKeterlambatan: number
): { status: AttendanceStatus; keterlambatan: number } {
  const masuk = timeToMinutes(jamMasuk);
  const wajib = timeToMinutes(jamMasukWajib);
  const batas = wajib + batasKeterlambatan;

  if (masuk <= batas) {
    return { status: 'hadir_tepat_waktu', keterlambatan: 0 };
  } else {
    return { status: 'terlambat', keterlambatan: masuk - wajib };
  }
}

// ============================================================
// LOCATION HELPERS
// ============================================================

export function getDistanceInMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

export function isWithinRadius(
  userLat: number,
  userLon: number,
  targetLat: number,
  targetLon: number,
  radiusMeters: number
): boolean {
  return getDistanceInMeters(userLat, userLon, targetLat, targetLon) <= radiusMeters;
}

// ============================================================
// SCORE HELPERS
// ============================================================

export function getGradeColor(grade: string): string {
  switch (grade) {
    case 'Sangat Baik':
      return 'success';
    case 'Baik':
      return 'info';
    case 'Cukup':
      return 'warning';
    case 'Kurang':
      return 'danger';
    default:
      return 'neutral';
  }
}

// ============================================================
// FORMAT HELPERS
// ============================================================

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} menit`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h} jam ${m} menit` : `${h} jam`;
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();
}

export function getPrefixNama(gender?: 'male' | 'female'): string {
  // Simple prefix based on naming convention
  return 'Ustadz/Ustadzah';
}

export function greetingByTime(): string {
  const { hour } = getCurrentHourMinuteWITA();
  if (hour >= 4 && hour < 12) return 'Assalamu\'alaikum, Selamat Pagi';
  if (hour >= 12 && hour < 15) return 'Assalamu\'alaikum, Selamat Siang';
  if (hour >= 15 && hour < 18) return 'Assalamu\'alaikum, Selamat Sore';
  return 'Assalamu\'alaikum, Selamat Malam';
}

export function getMonthName(month: number): string {
  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
  ];
  return months[month - 1] || '';
}

export function isTodayWITA(dateStr: string): boolean {
  return dateStr === getTodayStringWITA();
}

export function classNames(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

/**
 * Generate NIP / ID Yayasan Otomatis
 * Format: MWA-[Tahun Masuk]-[Nomor Urut 3 Digit]
 * Contoh: MWA-2026-001, MWA-2026-002
 */
export function generateNipYayasan(existing: number | Array<{ nip?: string } | string>, tahun = new Date().getFullYear()): string {
  let nextNumber = 1;
  const prefix = `MWA-${tahun}-`;

  if (Array.isArray(existing)) {
    let maxNum = 0;
    for (const item of existing) {
      const nipStr = typeof item === 'string' ? item : item.nip;
      if (nipStr && nipStr.startsWith(prefix)) {
        const numPart = parseInt(nipStr.replace(prefix, ''), 10);
        if (!isNaN(numPart) && numPart > maxNum) {
          maxNum = numPart;
        }
      }
    }
    nextNumber = maxNum + 1;
  } else if (typeof existing === 'number') {
    nextNumber = existing + 1;
  }

  const formattedNumber = String(nextNumber).padStart(3, '0');
  return `${prefix}${formattedNumber}`;
}


/**
 * Menghitung jam mengajar riil, durasi menit, dan jam yang dibayar
 * @param jamMulai Contoh "08:30"
 * @param jamSelesai Contoh "10:30" (total jadwal = 120 menit)
 * @param jamMasuk Contoh "08:35" (datang)
 * @param jamPulang Contoh "10:30" (pulang)
 * @param batasKeterlambatan Contoh 5 (menit)
 */
export function calculateActualTeachingHours(
  jamMulai: string,
  jamSelesai: string,
  jamMasuk: string | null | undefined,
  jamPulang: string | null | undefined,
  batasKeterlambatan: number = 5
): {
  durasiMenit: number;
  jamDibayar: number; // desimal (misal 1.83 atau 2.0)
  formattedDuration: string; // misal "1 Jam 50 Menit" atau "2 Jam 00 Menit"
  terlambatMenit: number;
  isTermaklumi: boolean;
} {
  if (!jamMasuk) {
    return { durasiMenit: 0, jamDibayar: 0, formattedDuration: '0 Menit', terlambatMenit: 0, isTermaklumi: false };
  }

  const startScheduleMins = timeToMinutes(jamMulai);
  const endScheduleMins = timeToMinutes(jamSelesai);
  const actualMasukMins = timeToMinutes(jamMasuk);
  
  // Jika belum absen pulang, gunakan estimasi jam selesai jadwal
  const actualPulangMins = jamPulang ? timeToMinutes(jamPulang) : endScheduleMins;

  // Hitung keterlambatan
  const diffLate = Math.max(0, actualMasukMins - startScheduleMins);
  const isTermaklumi = diffLate <= (batasKeterlambatan || 0);

  // Jika datang tepat waktu atau terlambat <= toleransi -> dihitung mulai dari jamMulai jadwal
  const recognizedStartMins = isTermaklumi ? startScheduleMins : actualMasukMins;
  // Waktu selesai diakui tidak melebihi jam selesai jadwal sesi
  const recognizedEndMins = Math.min(endScheduleMins, actualPulangMins);

  const durasiMenit = Math.max(0, recognizedEndMins - recognizedStartMins);
  const jamDibayar = Number((durasiMenit / 60).toFixed(2));

  const hours = Math.floor(durasiMenit / 60);
  const minutes = durasiMenit % 60;
  const formattedDuration = `${hours} Jam ${minutes > 0 ? `${minutes} Menit` : '00 Menit'}`;

  return {
    durasiMenit,
    jamDibayar,
    formattedDuration,
    terlambatMenit: diffLate,
    isTermaklumi,
  };
}

export function formatRupiah(nominal: number = 0): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(nominal || 0);
}

/**
 * Auto cleanup foto presensi yang telah diverifikasi (verified / rejected)
 * setelah 1x24 jam (24 * 60 * 60 * 1000 ms).
 * Foto yang masih pending (belum diverifikasi) TIDAK akan dihapus.
 */
export function cleanupExpiredVerifiedPhotos(records: AbsensiRecord[]): { updated: AbsensiRecord[]; cleanedCount: number } {
  const now = Date.now();
  const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
  let cleanedCount = 0;

  const updated = records.map((record) => {
    if (
      record.fotoMasuk &&
      (record.fotoMasukStatus === 'verified' || record.fotoMasukStatus === 'rejected') &&
      record.fotoMasukVerifiedAt
    ) {
      const verifiedTime = new Date(record.fotoMasukVerifiedAt).getTime();
      if (!isNaN(verifiedTime) && now - verifiedTime >= TWENTY_FOUR_HOURS_MS) {
        cleanedCount++;
        return {
          ...record,
          fotoMasuk: null, // Hapus foto untuk menghemat penyimpanan
        };
      }
    }
    return record;
  });

  return { updated, cleanedCount };
}

/**
 * Format jam atau menit menjadi format lengkap "X Jam Y Menit", "X Jam", atau "Y Menit".
 * Contoh: 18.5 jam -> "18 Jam 30 Menit", 2 jam -> "2 Jam", 0.75 jam -> "45 Menit"
 */
export function formatJamLengkap(jamOrMenit: number, isMenit: boolean = false): string {
  const totalMenit = Math.round(isMenit ? jamOrMenit : jamOrMenit * 60);
  if (totalMenit <= 0) return '0 Jam';
  const jam = Math.floor(totalMenit / 60);
  const menit = totalMenit % 60;
  if (jam === 0) return `${menit} Menit`;
  if (menit === 0) return `${jam} Jam`;
  return `${jam} Jam ${menit} Menit`;
}
