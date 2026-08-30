// ============================================================
// TYPES — Mu'Allim Attendance
// ============================================================

export type UserRole = 'guru' | 'admin';

export type AttendanceStatus =
  | 'hadir_tepat_waktu'
  | 'terlambat'
  | 'izin'
  | 'sakit'
  | 'alfa'
  | 'belum_absen';

export type DayOfWeek =
  | 'Senin'
  | 'Selasa'
  | 'Rabu'
  | 'Kamis'
  | 'Jumat'
  | 'Sabtu'
  | 'Ahad';

export type ActivityParticipationType = 'peserta' | 'panitia' | 'koordinator';

export type ParticipationResponse = 'hadir' | 'tidak_hadir' | 'belum_merespons';

// ============================================================
// USERS & ADMIN
// ============================================================

export interface MasterAdminAccount {
  nama: string;
  email: string;
  password: string;
  isCustomized?: boolean;
}

export interface Guru {
  id: string;
  nama: string;
  nip: string;
  jabatan: string;
  statusKepegawaian: 'tetap' | 'honorer' | 'magang';
  email: string;
  telepon: string;
  alamat: string;
  foto: string;
  role: UserRole;
  aktif: boolean;
  tanggalGabung: string;
  password?: string;
  perluGantiPassword?: boolean;
}

// ============================================================
// ATTENDANCE
// ============================================================

export interface AbsensiRecord {
  id: string;
  guruId: string;
  guruNama: string;
  tanggal: string; // ISO date string
  jamMasuk: string | null; // HH:mm
  jamPulang: string | null;
  status: AttendanceStatus;
  keterlambatan: number; // in minutes
  lokasiValid: boolean;
  keterangan: string;
  dibuatPada: string; // ISO datetime
  sesiId?: SesiType;
  sesiNama?: string;
  durasiMenit?: number; // menit mengajar riil yang diakui
  jamDibayar?: number; // jam diakui (desimal, cth: 1.83 atau 2.0)
  honorNominal?: number; // total honor untuk sesi ini (jamDibayar * tarifPerJam)
  fotoMasuk?: string | null; // Base64 data URL atau storage link
  fotoMasukStatus?: 'pending' | 'verified' | 'rejected'; // Status verifikasi admin
  fotoMasukVerifiedAt?: string | null; // Waktu verifikasi oleh admin (ISO string)
  fotoPulang?: string | null;
  bookingId?: string;
}

// ============================================================
// SCHEDULE
// ============================================================

export type SesiType = 'pagi' | 'siang' | 'sore' | string;

export interface SesiConfig {
  id: SesiType;
  nama: string; // e.g. "Kelas Pagi", "Kelas Siang", "Kelas Sore", "Kelas Tahfidz", "Sesi Tambahan"
  jamMulai: string; // HH:mm
  jamSelesai: string; // HH:mm
  deskripsi: string;
  warna: string;
  maxPengajar?: number;
  totalJamBayar?: number;
}

export interface SesiBooking {
  id: string;
  tanggal: string; // YYYY-MM-DD
  sesiId: SesiType;
  sesiNama: string;
  guruId: string;
  guruNama: string;
  status: 'booked' | 'hadir' | 'selesai' | 'batal' | 'hangus';
  dibuatPada: string;
  jamMasuk?: string | null;
  jamPulang?: string | null;
  jamDibayar?: number;
}

export interface JadwalSesiEntry {
  id: string;
  hari: DayOfWeek;
  sesiId: SesiType;
  guruIds: string[];
}

export interface Jadwal {
  id: string;
  guruId: string;
  guruNama: string;
  hari: DayOfWeek;
  jamMulai: string; // HH:mm
  jamSelesai: string;
  mataPelajaran: string;
  kelas: string;
  ruangan: string;
  catatan: string;
  aktif: boolean;
  sesiId?: SesiType;
}

// ============================================================
// ACTIVITY / KEGIATAN
// ============================================================

export type ActivityType =
  | 'Pembinaan'
  | 'Rapat'
  | 'Pelatihan'
  | 'Upacara'
  | 'Wisuda'
  | 'Lomba'
  | 'Lainnya';

export interface Kegiatan {
  id: string;
  nama: string;
  deskripsi: string;
  tanggal?: string; // Legacy ISO date single day
  hariMulai?: string; // Hari mulai misal 'Senin'
  tanggalMulai: string; // ISO date YYYY-MM-DD
  hariSelesai?: string; // Hari selesai misal 'Rabu'
  tanggalSelesai: string; // ISO date YYYY-MM-DD
  jamMulai: string; // HH:mm
  jamSelesai?: string; // HH:mm (opsional)
  batasPendaftaran: string; // ISO datetime or date YYYY-MM-DD / YYYY-MM-DDTHH:mm
  lokasi: string; // Nama lokasi (wajib)
  linkMaps?: string; // Link Google Maps kustom (opsional)
  jenis: ActivityType;
  wajib: boolean;
  poinPeserta: number;
  poinPanitia: number;
  poinKoordinator: number;
  status: 'berlangsung' | 'mendatang' | 'selesai';
  absensiAktif?: boolean; // Admin manual override atau otomatis 30 menit sebelum mulai
}

export interface KegiatanPartisipasi {
  id: string;
  kegiatanId: string;
  guruId: string;
  guruNama: string;
  respons: ParticipationResponse;
  responsDibuatPada: string;
  jenisPartisipasi: ActivityParticipationType | null; // 'peserta' | 'panitia' | 'koordinator'
  alasan?: string;
  waktuAbsen?: string | null; // ISO datetime saat guru absen di lokasi
  latitudeAbsen?: number | null; // Koordinat latitude guru saat presensi
  longitudeAbsen?: number | null; // Koordinat longitude guru saat presensi
  lokasiAbsenNama?: string | null; // Nama area/keterangan GPS
  hadirVerifikasi: boolean | null; // true = Hadir Terverifikasi, false = Tidak Hadir / Ditolak, null = Belum Diverifikasi
  poinDiterima: number;
  diverifikasiPada?: string | null;
}

// ============================================================
// PERFORMANCE
// ============================================================

export interface SkorKedisiplinan {
  guruId: string;
  guruNama: string;
  totalHariKerja: number;
  hadirTepatWaktu: number;
  terlambat: number;
  izin: number;
  sakit: number;
  alfa: number;
  skor: number; // 0–100
  grade: 'Sangat Baik' | 'Baik' | 'Cukup' | 'Kurang';
}

export interface SkorPartisipasi {
  guruId: string;
  guruNama: string;
  totalKegiatan: number;
  hadir: number;
  poinTotal: number;
}

// ============================================================
// SETTINGS
// ============================================================

export interface AppSettings {
  lokasiNama: string;
  latitude: number;
  longitude: number;
  radius: number; // in meters
  jamMasukWajib: string; // HH:mm
  batasKeterlambatan: number; // minutes after jamMasuk (toleransi keterlambatan)
  jamPulang: string; // HH:mm
  waktuBukaSebelumJadwal?: number; // menit sebelum jadwal kelas dimulai (default: 60)
  tarifPerJam?: number; // Tarif honor mengajar per jam dalam rupiah (cth: 30000)
}

// ============================================================
// NOTIFICATIONS & SCHEDULE EXCHANGE
// ============================================================

export interface Notifikasi {
  id: string;
  guruId: string;
  judul: string;
  pesan: string;
  tipe: 'pengingat_jadwal' | 'perubahan_jadwal' | 'kegiatan' | 'umum' | 'tukar_jadwal';
  dibaca: boolean;
  dibuatPada: string;
}

export interface TukarJadwalRequest {
  id: string;
  requesterGuruId: string;
  requesterGuruNama: string;
  requesterHari: DayOfWeek;
  requesterSesiId: SesiType;
  requesterSesiNama: string;

  targetGuruId: string;
  targetGuruNama: string;
  targetHari: DayOfWeek;
  targetSesiId: SesiType;
  targetSesiNama: string;

  catatan?: string;
  status: 'pending' | 'disetujui' | 'ditolak';
  alasanPenolakan?: string;
  dibuatPada: string;
  diresponPada?: string;
}
