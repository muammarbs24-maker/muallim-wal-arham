// ============================================================
// DATA STORE — Mu'Allim Attendance
// Bersih untuk pengujian data asli oleh pengguna
// ============================================================

import type {
  Guru,
  AbsensiRecord,
  Jadwal,
  Kegiatan,
  KegiatanPartisipasi,
  AppSettings,
  Notifikasi,
  SesiConfig,
  JadwalSesiEntry,
  TukarJadwalRequest,
} from '@/types';

// ============================================================
// 0. AKUN ADMINISTRATOR UTAMA
// ============================================================

export interface MasterAdminAccount {
  nama: string;
  email: string;
  password: string;
  isCustomized: boolean;
}

export const MASTER_RECOVERY_KEY = process.env.NEXT_PUBLIC_MASTER_RECOVERY_KEY || 'MWA-2026-RECOVERY';

export const masterAdmin: MasterAdminAccount = {
  nama: 'Administrator Yayasan',
  email: 'admin@muallim.sch.id',
  password: 'admin123',
  isCustomized: false,
};

// ============================================================
// 1. DATA GURU & KATA SANDI DEFAULT
// ============================================================

export const authConfig = {
  defaultGuruPassword: 'muallim123',
};

export const DEFAULT_GURU_PASSWORD = 'muallim123';

// Daftar Guru Terdaftar
export const mockGuru: Guru[] = [];

export function getLoggedInGuru(): Guru {
  if (typeof window !== 'undefined') {
    const savedUser = localStorage.getItem('muallim_guru_user');
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        if (parsed && parsed.id) return parsed;
      } catch (e) {}
    }
    const loggedId = localStorage.getItem('logged_in_guru_id');
    const loggedEmail = localStorage.getItem('logged_in_guru_email');
    if (loggedId) {
      const found = mockGuru.find((g) => g.id === loggedId);
      if (found) return found;
    }
    if (loggedEmail) {
      const found = mockGuru.find((g) => g.email.toLowerCase() === loggedEmail.toLowerCase());
      if (found) return found;
    }
  }

  if (mockGuru.length > 0) {
    return mockGuru[0];
  }
  return {
    id: 'guru-demo',
    nama: 'Ustadz (Belum Ada Data Guru)',
    nip: 'MWA-000',
    jabatan: 'Ustadz',
    statusKepegawaian: 'tetap',
    email: 'guru@muallim.sch.id',
    telepon: '',
    alamat: '',
    foto: '',
    role: 'guru',
    aktif: true,
    tanggalGabung: '2026-08-20',
    password: DEFAULT_GURU_PASSWORD,
    perluGantiPassword: true,
  };
}

// Proxy objek currentGuru agar selalu membaca guru terdaftar pertama
export const currentGuru: Guru = {
  get id() { return getLoggedInGuru().id; },
  get nama() { return getLoggedInGuru().nama; },
  get nip() { return getLoggedInGuru().nip; },
  get jabatan() { return getLoggedInGuru().jabatan; },
  get statusKepegawaian() { return getLoggedInGuru().statusKepegawaian; },
  get email() { return getLoggedInGuru().email; },
  get telepon() { return getLoggedInGuru().telepon; },
  get alamat() { return getLoggedInGuru().alamat; },
  get foto() { return getLoggedInGuru().foto; },
  get role() { return getLoggedInGuru().role; },
  get aktif() { return getLoggedInGuru().aktif; },
  get tanggalGabung() { return getLoggedInGuru().tanggalGabung; },
  get password() { return getLoggedInGuru().password; },
  get perluGantiPassword() { return getLoggedInGuru().perluGantiPassword; },
};

// ============================================================
// 2. DATA ABSENSI (KOSONG / BERSIH)
// ============================================================

export const mockAbsensi: AbsensiRecord[] = [];

// ============================================================
// 3. 4 SESI KELAS YAYASAN (DEFAULT)
// ============================================================

export const mockSesiList: SesiConfig[] = [
  {
    id: 'pagi',
    nama: 'Kelas Pagi',
    jamMulai: '07:30',
    jamSelesai: '10:30',
    deskripsi: 'Sesi pembelajaran Tahfidz & Tilawah pagi',
    warna: '#DCFCE7', // Hijau
  },
  {
    id: 'siang',
    nama: 'Kelas Siang',
    jamMulai: '10:30',
    jamSelesai: '13:30',
    deskripsi: 'Sesi pembelajaran Fiqih, Bahasa Arab & Hadits',
    warna: '#FEF3C7', // Kuning
  },
  {
    id: 'sore',
    nama: 'Kelas Sore',
    jamMulai: '14:00',
    jamSelesai: '17:00',
    deskripsi: 'Sesi Muroja\'ah hafalan & bimbingan intensif',
    warna: '#E0F2FE', // Biru
  },
  {
    id: 'tahfidz',
    nama: 'Kelas Tahfidz',
    jamMulai: '18:30',
    jamSelesai: '20:30',
    deskripsi: 'Sesi Halaqah Tahfidz malam ba\'da Maghrib',
    warna: '#F3E8FF', // Ungu
  },
];

// Matriks Jadwal Guru
export const mockJadwalMatrix: JadwalSesiEntry[] = [];

// Data Jadwal Detail (Tersinkronisasi otomatis dengan matriks sesi)
export const mockJadwal: Jadwal[] = [];

/**
 * Load persisted data from localStorage & sync from Supabase
 */
export function loadPersistedData(): void {
  if (typeof window === 'undefined') return;
  try {
    const savedAdmin = localStorage.getItem('muallim_master_admin');
    if (savedAdmin) {
      const parsed = JSON.parse(savedAdmin);
      if (parsed.email && parsed.password) {
        masterAdmin.email = parsed.email;
        masterAdmin.password = parsed.password;
        masterAdmin.nama = parsed.nama || masterAdmin.nama;
      }
    }

    const savedGuru = localStorage.getItem('muallim_guru_list');
    if (savedGuru) {
      try {
        const parsed = JSON.parse(savedGuru);
        if (Array.isArray(parsed)) {
          mockGuru.length = 0;
          mockGuru.push(...parsed);
        }
      } catch (e) {}
    }

    const savedMatrix = localStorage.getItem('muallim_jadwal_matrix');
    if (savedMatrix) {
      const parsed = JSON.parse(savedMatrix);
      if (Array.isArray(parsed)) {
        mockJadwalMatrix.length = 0;
        mockJadwalMatrix.push(...parsed);
      }
    }

    const savedAbsensi = localStorage.getItem('muallim_absensi_list');
    if (savedAbsensi) {
      const parsed = JSON.parse(savedAbsensi);
      if (Array.isArray(parsed)) {
        mockAbsensi.length = 0;
        mockAbsensi.push(...parsed);
      }
    }

    const savedSettings = localStorage.getItem('muallim_app_settings');
    if (savedSettings) {
      const parsed = JSON.parse(savedSettings);
      if (parsed && typeof parsed === 'object') {
        Object.assign(mockSettings, parsed);
      }
    }

    const savedSesi = localStorage.getItem('muallim_sesi_list');
    if (savedSesi) {
      try {
        const parsed = JSON.parse(savedSesi);
        if (Array.isArray(parsed) && parsed.length > 0) {
          mockSesiList.length = 0;
          mockSesiList.push(...parsed);
        }
      } catch (e) {}
    }

    const savedTukarJadwal = localStorage.getItem('muallim_tukar_jadwal_requests');
    if (savedTukarJadwal) {
      try {
        const parsed = JSON.parse(savedTukarJadwal);
        if (Array.isArray(parsed) && parsed.length > 0 && mockTukarJadwalRequests.length === 0) {
          mockTukarJadwalRequests.length = 0;
          mockTukarJadwalRequests.push(...parsed);
        }
      } catch (e) {}
    }

    const savedKegiatan = localStorage.getItem('muallim_kegiatan_list');
    if (savedKegiatan !== null) {
      try {
        const parsed = JSON.parse(savedKegiatan);
        if (Array.isArray(parsed)) {
          mockKegiatan.length = 0;
          mockKegiatan.push(...parsed);
        }
      } catch (e) {}
    }

    const savedPartisipasi = localStorage.getItem('muallim_partisipasi_list');
    if (savedPartisipasi !== null) {
      try {
        const parsed = JSON.parse(savedPartisipasi);
        if (Array.isArray(parsed)) {
          mockPartisipasi.length = 0;
          mockPartisipasi.push(...parsed);
        }
      } catch (e) {}
    }

  } catch (e) {
    console.error('Error loading persisted data:', e);
  }
}

export function savePersistedSesiList(sessions: SesiConfig[]): void {
  mockSesiList.length = 0;
  mockSesiList.push(...sessions);
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('muallim_sesi_list', JSON.stringify(sessions));
      import('./supabaseClient').then(({ saveSesiListSupabase }) => {
        saveSesiListSupabase(sessions);
      }).catch(() => {});
    } catch (e) {
      console.error('Error saving sesi list:', e);
    }
  }
  syncMatrixToJadwal();
}

export function savePersistedSettings(settings: AppSettings): void {
  Object.assign(mockSettings, settings);
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('muallim_app_settings', JSON.stringify(settings));
      import('./supabaseClient').then(({ saveAppSettingsSupabase }) => {
        saveAppSettingsSupabase(settings);
      }).catch(() => {});
    } catch (e) {
      console.error('Error saving settings:', e);
    }
  }
}

export function savePersistedAbsensi(records: AbsensiRecord[]): void {
  mockAbsensi.length = 0;
  mockAbsensi.push(...records);
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('muallim_absensi_list', JSON.stringify(records));
      import('./supabaseClient').then(({ upsertAbsensiSupabase }) => {
        records.forEach((r) => upsertAbsensiSupabase(r));
      }).catch(() => {});
    } catch (e) {
      console.error('Error saving absensi:', e);
    }
  }
}

export function savePersistedAdmin(admin: MasterAdminAccount): void {
  masterAdmin.email = admin.email;
  masterAdmin.password = admin.password;
  masterAdmin.nama = admin.nama;
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('muallim_master_admin', JSON.stringify(admin));
      import('./supabaseClient').then(({ updateAdminAccountSupabase }) => {
        updateAdminAccountSupabase(admin);
      }).catch(() => {});
    } catch (e) {
      console.error('Error saving admin:', e);
    }
  }
}

export function savePersistedGuru(gurus: Guru[]): void {
  mockGuru.length = 0;
  mockGuru.push(...gurus);
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('muallim_guru_list', JSON.stringify(gurus));
      import('./supabaseClient').then(({ upsertGuruSupabase }) => {
        gurus.forEach((g) => upsertGuruSupabase(g));
      }).catch(() => {});
    } catch (e) {
      console.error('Error saving guru list:', e);
    }
  }
}

export async function savePersistedJadwalMatrix(matrix: JadwalSesiEntry[]): Promise<boolean> {
  const validMatrix = matrix.filter((e) => e.guruIds && e.guruIds.length > 0);
  mockJadwalMatrix.length = 0;
  mockJadwalMatrix.push(...validMatrix);
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('muallim_jadwal_matrix', JSON.stringify(validMatrix));
    } catch (e) {
      console.error('Error saving matrix:', e);
    }
  }
  syncMatrixToJadwal();
  try {
    const { saveJadwalMatrixSupabase } = await import('./supabaseClient');
    await saveJadwalMatrixSupabase(validMatrix);
  } catch (e) {
    console.error('Error saving matrix to Supabase:', e);
  }
  return true;
}

/**
 * Sinkronisasi Matriks Jadwal Admin ke format Jadwal Guru
 */
export function syncMatrixToJadwal(): void {
  mockJadwal.length = 0;
  mockJadwalMatrix.forEach((entry) => {
    const sesi = mockSesiList.find((s) => s.id === entry.sesiId);
    if (!sesi) return;

    entry.guruIds.forEach((gId) => {
      const guru = mockGuru.find((g) => g.id === gId);
      mockJadwal.push({
        id: `jadwal-${entry.hari}-${entry.sesiId}-${gId}`,
        guruId: gId,
        guruNama: guru?.nama || 'Guru Pengajar',
        hari: entry.hari,
        jamMulai: sesi.jamMulai,
        jamSelesai: sesi.jamSelesai,
        mataPelajaran: sesi.nama,
        kelas: guru?.jabatan || sesi.nama,
        ruangan: mockSettings.lokasiNama || 'Ruang Halaqah / Kelas Yayasan',
        catatan: sesi.deskripsi,
        aktif: true,
        sesiId: entry.sesiId,
      });
    });
  });
}

export function getJadwalForGuru(guruId: string): Jadwal[] {
  syncMatrixToJadwal();
  return mockJadwal.filter((j) => j.guruId === guruId && j.aktif);
}

// ============================================================
// 4. DATA KEGIATAN YAYASAN (DEFAULT BERSIH)
// ============================================================

export const mockKegiatan: Kegiatan[] = [];

export const mockPartisipasi: KegiatanPartisipasi[] = [];

export function getGoogleMapsLink(lokasiNama: string, customLink?: string): string {
  if (customLink && customLink.trim().startsWith('http')) {
    return customLink.trim();
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(lokasiNama.trim())}`;
}

export function getNamaHari(dateStr: string): string {
  if (!dateStr) return 'Senin';
  const days = ['Ahad', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 'Senin';
  return days[d.getDay()];
}

export function isKegiatanAbsensiOpen(kegiatan: Kegiatan): boolean {
  if (kegiatan.absensiAktif === true) return true;
  if (kegiatan.status === 'selesai') return false;

  try {
    const now = new Date();
    // Start date & time
    const startStr = `${kegiatan.tanggalMulai}T${kegiatan.jamMulai || '00:00'}:00`;
    const startDate = new Date(startStr);
    // Buka 30 menit sebelum kegiatan dimulai
    const openTime = new Date(startDate.getTime() - 30 * 60 * 1000);

    // End date & time
    const endStr = kegiatan.jamSelesai
      ? `${kegiatan.tanggalSelesai}T${kegiatan.jamSelesai}:00`
      : `${kegiatan.tanggalSelesai}T23:59:59`;
    const endDate = new Date(endStr);

    return now >= openTime && now <= endDate;
  } catch (e) {
    return kegiatan.status === 'berlangsung';
  }
}

export function isKegiatanEnded(kegiatan: Kegiatan): boolean {
  if (kegiatan.status === 'selesai') return true;
  try {
    const now = new Date();
    const endStr = kegiatan.jamSelesai
      ? `${kegiatan.tanggalSelesai}T${kegiatan.jamSelesai}:00`
      : `${kegiatan.tanggalSelesai}T23:59:59`;
    const endDate = new Date(endStr);
    return now > endDate;
  } catch (e) {
    return false;
  }
}

export function savePersistedKegiatan(list: Kegiatan[]): void {
  mockKegiatan.length = 0;
  mockKegiatan.push(...list);
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('muallim_kegiatan_list', JSON.stringify(list));
      import('./supabaseClient').then(({ saveKegiatanListSupabase }) => {
        saveKegiatanListSupabase(list);
      }).catch(() => {});
    } catch (e) {
      console.error('Error saving kegiatan list:', e);
    }
  }
}

export function savePersistedPartisipasi(list: KegiatanPartisipasi[]): void {
  mockPartisipasi.length = 0;
  mockPartisipasi.push(...list);
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('muallim_partisipasi_list', JSON.stringify(list));
      import('./supabaseClient').then(({ saveKegiatanPartisipasiSupabase }) => {
        saveKegiatanPartisipasiSupabase(list);
      }).catch(() => {});
    } catch (e) {
      console.error('Error saving partisipasi list:', e);
    }
  }
}

// ============================================================
// 5. PENGATURAN APLIKASI
// ============================================================

export const mockSettings: AppSettings = {
  lokasiNama: 'Yayasan Tahfidz Mu\'Allim Wal Arham',
  latitude: -5.147665,
  longitude: 119.432732,
  radius: 100,
  jamMasukWajib: '07:30',
  batasKeterlambatan: 15,
  jamPulang: '17:00',
  waktuBukaSebelumJadwal: 60,
};

// ============================================================
// 6. NOTIFIKASI (KOSONG)
// ============================================================

export const mockNotifikasi: Notifikasi[] = [];

// ============================================================
// 7. HELPER PERHITUNGAN SKOR & PERFORMA
// ============================================================

export function hitungSkorKedisiplinan(guruId: string, bulan?: number, tahun?: number, customAbsensi?: AbsensiRecord[]) {
  const now = new Date();
  const targetBulan = bulan !== undefined ? bulan : (now.getMonth() + 1);
  const targetTahun = tahun !== undefined ? tahun : now.getFullYear();
  const targetPrefix = `${targetTahun}-${String(targetBulan).padStart(2, '0')}`;

  const sourceAbsensi = customAbsensi || mockAbsensi;

  // Filter absensi khusus bulan ini (reset otomatis setiap awal bulan)
  const absensiGuru = sourceAbsensi.filter((a) => {
    if (a.guruId !== guruId) return false;
    return a.tanggal ? a.tanggal.startsWith(targetPrefix) : true;
  });

  const hadirTepatWaktu = absensiGuru.filter((a) => a.status === 'hadir_tepat_waktu').length;
  const terlambat = absensiGuru.filter((a) => a.status === 'terlambat').length;
  const izin = absensiGuru.filter((a) => a.status === 'izin').length;
  const sakit = absensiGuru.filter((a) => a.status === 'sakit').length;
  const alfa = absensiGuru.filter((a) => a.status === 'alfa').length;
  const totalHariKerja = absensiGuru.length;

  if (totalHariKerja === 0) {
    return {
      guruId,
      totalHariKerja: 0,
      hadirTepatWaktu: 0,
      terlambat: 0,
      izin: 0,
      sakit: 0,
      alfa: 0,
      skor: 0, // Belum memiliki riwayat absensi pada bulan ini
      grade: '—',
      hasAttendance: false,
      bulan: targetBulan,
      tahun: targetTahun,
    };
  }

  // Formula skor kedisiplinan bulanan
  const skor = Math.max(
    0,
    Math.round(
      ((hadirTepatWaktu * 100 + terlambat * 70 + izin * 80 + sakit * 85) /
        totalHariKerja +
        -alfa * 5)
    )
  );

  const clampedSkor = Math.min(100, Math.max(0, skor));

  const grade =
    clampedSkor >= 90
      ? 'Sangat Baik'
      : clampedSkor >= 75
      ? 'Baik'
      : clampedSkor >= 60
      ? 'Cukup'
      : 'Kurang';

  return {
    guruId,
    totalHariKerja,
    hadirTepatWaktu,
    terlambat,
    izin,
    sakit,
    alfa,
    skor: clampedSkor,
    grade,
    hasAttendance: true,
    bulan: targetBulan,
    tahun: targetTahun,
  };
}

export function hitungPoinPartisipasi(guruId: string, bulan?: number, tahun?: number) {
  const now = new Date();
  const targetBulan = bulan !== undefined ? bulan : (now.getMonth() + 1);
  const targetTahun = tahun !== undefined ? tahun : now.getFullYear();
  const targetPrefix = `${targetTahun}-${String(targetBulan).padStart(2, '0')}`;

  const partGuru = mockPartisipasi.filter((p) => {
    if (p.guruId !== guruId) return false;
    const dateStr = p.responsDibuatPada || '';
    return dateStr.startsWith(targetPrefix);
  });

  const hadirVerified = partGuru.filter((p) => p.hadirVerifikasi === true);
  const poinTotal = hadirVerified.reduce((sum, p) => sum + p.poinDiterima, 0);
  return {
    guruId,
    totalKegiatan: partGuru.length,
    hadir: hadirVerified.length,
    poinTotal,
    bulan: targetBulan,
    tahun: targetTahun,
  };
}

// ============================================================
// 8. TUKAR JADWAL (SCHEDULE EXCHANGE & SWAP)
// ============================================================

export const mockTukarJadwalRequests: TukarJadwalRequest[] = [];

export function savePersistedTukarJadwal(requests: TukarJadwalRequest[]): void {
  mockTukarJadwalRequests.length = 0;
  mockTukarJadwalRequests.push(...requests);
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('muallim_tukar_jadwal_requests', JSON.stringify(requests));
    } catch (e) {
      console.error('Error saving tukar jadwal requests:', e);
    }
  }
}

export function createTukarJadwalRequest(data: Omit<TukarJadwalRequest, 'id' | 'status' | 'dibuatPada'>): TukarJadwalRequest {
  const newReq: TukarJadwalRequest = {
    ...data,
    id: `swap-${Date.now()}`,
    status: 'pending',
    dibuatPada: new Date().toISOString(),
  };

  mockTukarJadwalRequests.unshift(newReq);
  savePersistedTukarJadwal(mockTukarJadwalRequests);

  // Sync to Supabase Cloud Database!
  import('./supabaseClient').then(({ saveTukarJadwalRequestsSupabase }) => {
    saveTukarJadwalRequestsSupabase(mockTukarJadwalRequests).catch(() => {});
  }).catch(() => {});

  // Add in-app notification for the target teacher
  const notif: Notifikasi = {
    id: `notif-${Date.now()}`,
    guruId: data.targetGuruId,
    judul: '🔄 Permintaan Tukar Jadwal Masuk',
    pesan: `${data.requesterGuruNama} ingin bertukar jadwal (${data.requesterHari} - ${data.requesterSesiNama}) dengan jadwal Anda (${data.targetHari} - ${data.targetSesiNama}).`,
    tipe: 'tukar_jadwal',
    dibaca: false,
    dibuatPada: new Date().toISOString(),
  };
  mockNotifikasi.unshift(notif);
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('muallim_notifikasi_list', JSON.stringify(mockNotifikasi));
    } catch (e) {}
  }

  // Trigger email notification
  import('./emailService').then(({ sendScheduleSwapEmail }) => {
    const targetGuru = mockGuru.find((g) => g.id === data.targetGuruId);
    if (targetGuru && targetGuru.email) {
      sendScheduleSwapEmail({
        type: 'request',
        targetEmail: targetGuru.email,
        targetNama: targetGuru.nama,
        requesterNama: data.requesterGuruNama,
        requesterJadwal: `${data.requesterHari}, ${data.requesterSesiNama}`,
        targetJadwal: `${data.targetHari}, ${data.targetSesiNama}`,
        catatan: data.catatan,
      }).catch((e) => console.error('Error sending swap email:', e));
    }
  }).catch(() => {});

  return newReq;
}

export function respondTukarJadwalRequest(requestId: string, accept: boolean, alasanPenolakan?: string): boolean {
  const req = mockTukarJadwalRequests.find((r) => r.id === requestId);
  if (!req || req.status !== 'pending') return false;

  req.status = accept ? 'disetujui' : 'ditolak';
  req.alasanPenolakan = alasanPenolakan || '';
  req.diresponPada = new Date().toISOString();

  if (accept) {
    // Perform the matrix swap:
    const slot1 = mockJadwalMatrix.find((m) => m.hari === req.requesterHari && m.sesiId === req.requesterSesiId);
    const slot2 = mockJadwalMatrix.find((m) => m.hari === req.targetHari && m.sesiId === req.targetSesiId);

    if (slot1) {
      slot1.guruIds = slot1.guruIds.filter((id) => id !== req.requesterGuruId);
      if (!slot1.guruIds.includes(req.targetGuruId)) slot1.guruIds.push(req.targetGuruId);
    } else {
      mockJadwalMatrix.push({
        id: `mat-${Date.now()}-1`,
        hari: req.requesterHari,
        sesiId: req.requesterSesiId,
        guruIds: [req.targetGuruId],
      });
    }

    if (slot2) {
      slot2.guruIds = slot2.guruIds.filter((id) => id !== req.targetGuruId);
      if (!slot2.guruIds.includes(req.requesterGuruId)) slot2.guruIds.push(req.requesterGuruId);
    } else {
      mockJadwalMatrix.push({
        id: `mat-${Date.now()}-2`,
        hari: req.targetHari,
        sesiId: req.targetSesiId,
        guruIds: [req.requesterGuruId],
      });
    }

    savePersistedJadwalMatrix(mockJadwalMatrix);
    syncMatrixToJadwal();

    // Sync updated matrix to Supabase!
    import('./supabaseClient').then(({ saveJadwalMatrixSupabase }) => {
      saveJadwalMatrixSupabase(mockJadwalMatrix).catch(() => {});
    }).catch(() => {});

    // Notify requester teacher that request was accepted
    mockNotifikasi.unshift({
      id: `notif-${Date.now()}`,
      guruId: req.requesterGuruId,
      judul: '✅ Tukar Jadwal Disetujui!',
      pesan: `${req.targetGuruNama} telah menyetujui penukaran jadwal. Jadwal Anda kini aktif di ${req.targetHari} - ${req.targetSesiNama}.`,
      tipe: 'tukar_jadwal',
      dibaca: false,
      dibuatPada: new Date().toISOString(),
    });
  } else {
    // Notify requester teacher that request was rejected
    const reasonText = alasanPenolakan ? ` (Alasan: ${alasanPenolakan})` : '';
    mockNotifikasi.unshift({
      id: `notif-${Date.now()}`,
      guruId: req.requesterGuruId,
      judul: '❌ Tukar Jadwal Ditolak',
      pesan: `Mohon maaf, ${req.targetGuruNama} belum dapat bertukar jadwal untuk sesi ${req.targetHari} - ${req.targetSesiNama}.${reasonText}`,
      tipe: 'tukar_jadwal',
      dibaca: false,
      dibuatPada: new Date().toISOString(),
    });
  }

  savePersistedTukarJadwal(mockTukarJadwalRequests);

  // Sync decision to Supabase!
  import('./supabaseClient').then(({ saveTukarJadwalRequestsSupabase }) => {
    saveTukarJadwalRequestsSupabase(mockTukarJadwalRequests).catch(() => {});
  }).catch(() => {});

  // Email notifications for decision
  import('./emailService').then(({ sendScheduleSwapEmail }) => {
    const requester = mockGuru.find((g) => g.id === req.requesterGuruId);
    if (requester && requester.email) {
      sendScheduleSwapEmail({
        type: accept ? 'approved' : 'rejected',
        targetEmail: requester.email,
        targetNama: requester.nama,
        requesterNama: req.targetGuruNama,
        requesterJadwal: `${req.targetHari}, ${req.targetSesiNama}`,
        targetJadwal: `${req.requesterHari}, ${req.requesterSesiNama}`,
        catatan: accept ? '' : (alasanPenolakan || ''),
      }).catch((e) => console.error('Error sending swap decision email:', e));
    }
  }).catch(() => {});

  return true;
}

// ============================================================
// 9. RESET ALL DATA EXCEPT GURUS
// ============================================================

export async function resetAllApplicationDataExceptGurus(): Promise<boolean> {
  // 1. Clear In-Memory Data (Preserve mockGuru & masterAdmin & mockSettings)
  mockAbsensi.length = 0;
  mockJadwalMatrix.length = 0;
  mockJadwal.length = 0;
  mockTukarJadwalRequests.length = 0;
  mockKegiatan.length = 0;
  mockPartisipasi.length = 0;
  mockNotifikasi.length = 0;

  // 2. Clear LocalStorage
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('muallim_absensi_list', '[]');
      localStorage.setItem('muallim_jadwal_matrix', '[]');
      localStorage.setItem('muallim_tukar_jadwal_requests', '[]');
      localStorage.setItem('muallim_notifikasi_list', '[]');
      localStorage.setItem('muallim_kegiatan_list', '[]');
      localStorage.setItem('muallim_partisipasi_list', '[]');

      // Clean all daily session absensi keys
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('muallim_session_absensi_') || key.startsWith('muallim_status_'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
    } catch (e) {
      console.error('Error clearing localStorage:', e);
    }
  }

  // 3. Sync empty matrix to schedules
  syncMatrixToJadwal();

  // 4. Clear Supabase Database (except gurus and admin)
  try {
    const { resetAllDataExceptGurusSupabase } = await import('./supabaseClient');
    await resetAllDataExceptGurusSupabase();
  } catch (e) {
    console.error('Error reset supabase in mockData:', e);
  }

  return true;
}

// ============================================================
// 10. HELPER AUTO-ALPA SINKRONISASI JADWAL TERLEWAT
// ============================================================

export function checkAndApplyAutoAlfa(
  gurus: Guru[] = mockGuru,
  matrix: JadwalSesiEntry[] = mockJadwalMatrix,
  sesi: SesiConfig[] = mockSesiList,
  absensi: AbsensiRecord[] = mockAbsensi
): AbsensiRecord[] {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const todayStr = now.toISOString().split('T')[0];
  const daysOfWeek = ['Ahad', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const todayDay = daysOfWeek[now.getDay()];

  let hasNewAlfa = false;
  const updatedAbsensi = [...absensi];

  // Periksa penugasan guru di jadwal matrix untuk hari ini
  matrix.forEach((entry) => {
    if (entry.hari !== todayDay) return;
    const currentSesi = sesi.find((s) => s.id === entry.sesiId);
    if (!currentSesi || !entry.guruIds || entry.guruIds.length === 0) return;

    const [endH, endM] = currentSesi.jamSelesai.split(':').map((x) => parseInt(x, 10));
    const sesiEndMinutes = (endH || 0) * 60 + (endM || 0);

    // Jika waktu saat ini sudah melewati jam selesai sesi mengajar
    if (currentMinutes >= sesiEndMinutes) {
      entry.guruIds.forEach((gId) => {
        const guru = gurus.find((g) => g.id === gId && g.aktif);
        if (!guru) return;

        // Cek apakah sudah ada catatan absensi guru hari ini
        const hasAttendanceToday = updatedAbsensi.some(
          (a) =>
            (a.guruId === gId || a.guruNama === guru.nama) &&
            a.tanggal === todayStr &&
            (a.status === 'hadir_tepat_waktu' ||
              a.status === 'terlambat' ||
              a.status === 'izin' ||
              a.status === 'sakit' ||
              a.status === 'alfa')
        );

        if (!hasAttendanceToday) {
          const autoAlfaRecord: AbsensiRecord = {
            id: `abs-auto-alfa-${todayStr}-${entry.sesiId}-${gId}`,
            guruId: gId,
            guruNama: guru.nama,
            tanggal: todayStr,
            jamMasuk: null,
            jamPulang: null,
            status: 'alfa',
            keterlambatan: 0,
            lokasiValid: false,
            keterangan: `Otomatis Alpa (Tidak hadir pada ${currentSesi.nama})`,
            dibuatPada: new Date().toISOString(),
          };
          updatedAbsensi.push(autoAlfaRecord);
          hasNewAlfa = true;
        }
      });
    }
  });

  if (hasNewAlfa) {
    mockAbsensi.length = 0;
    mockAbsensi.push(...updatedAbsensi);
    savePersistedAbsensi(updatedAbsensi);
  }

  return updatedAbsensi;
}
