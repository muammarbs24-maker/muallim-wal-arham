// ============================================================
// UTILITY FUNCTIONS — Mu'Allim Attendance
// ============================================================

import { AttendanceStatus, DayOfWeek } from '@/types';

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

