import { createClient } from '@supabase/supabase-js';
import type { Guru, JadwalSesiEntry, AbsensiRecord, AppSettings, Kegiatan, KegiatanPartisipasi, MasterAdminAccount, SesiConfig, TukarJadwalRequest } from '@/types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://hymwqulohlxeyjhvamky.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_vnVsFvRLJalZgb76SgB7wA_yW94xuny';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * 1. ADMIN ACCOUNT SERVICE
 */
export async function getAdminAccountSupabase(): Promise<MasterAdminAccount | null> {
  try {
    const { data, error } = await supabase
      .from('admin_account')
      .select('*')
      .limit(1)
      .single();

    if (error || !data) return null;
    return {
      email: data.email,
      password: data.password,
      nama: data.nama,
    };
  } catch (err) {
    console.error('Error getAdminAccountSupabase:', err);
    return null;
  }
}

export async function updateAdminAccountSupabase(admin: MasterAdminAccount): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('admin_account')
      .upsert({
        email: admin.email,
        password: admin.password,
        nama: admin.nama,
      }, { onConflict: 'email' });

    return !error;
  } catch (err) {
    console.error('Error updateAdminAccountSupabase:', err);
    return false;
  }
}

/**
 * 2. GURU SERVICE
 */
export async function getGurusSupabase(): Promise<Guru[]> {
  try {
    const { data, error } = await supabase
      .from('gurus')
      .select('*')
      .order('nama', { ascending: true });

    if (error || !data) return [];
    return data.map((d: any) => ({
      id: d.id,
      nama: d.nama,
      nip: d.nip,
      jabatan: d.jabatan,
      statusKepegawaian: d.status_kepegawaian,
      email: d.email,
      telepon: d.telepon || '',
      alamat: d.alamat || '',
      foto: d.foto || '',
      role: d.role || 'guru',
      aktif: d.aktif,
      tanggalGabung: d.tanggal_gabung,
      password: d.password,
      perluGantiPassword: d.perlu_ganti_password,
    }));
  } catch (err) {
    console.error('Error getGurusSupabase:', err);
    return [];
  }
}

export async function upsertGuruSupabase(guru: Guru): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('gurus')
      .upsert({
        id: guru.id,
        nama: guru.nama,
        nip: guru.nip,
        jabatan: guru.jabatan,
        status_kepegawaian: guru.statusKepegawaian,
        email: guru.email,
        telepon: guru.telepon,
        alamat: guru.alamat,
        foto: guru.foto,
        role: guru.role,
        aktif: guru.aktif,
        tanggal_gabung: guru.tanggalGabung,
        password: guru.password,
        perlu_ganti_password: guru.perluGantiPassword,
      }, { onConflict: 'id' });

    return !error;
  } catch (err) {
    console.error('Error upsertGuruSupabase:', err);
    return false;
  }
}

export async function deleteGuruSupabase(guruId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('gurus')
      .delete()
      .eq('id', guruId);

    return !error;
  } catch (err) {
    console.error('Error deleteGuruSupabase:', err);
    return false;
  }
}

/**
 * 3. JADWAL MATRIX & SESI CONFIG SERVICE
 */
export async function getSesiListSupabase(): Promise<SesiConfig[] | null> {
  try {
    const { data, error } = await supabase
      .from('jadwal_matrix')
      .select('*')
      .eq('id', '__sesi_config__')
      .single();

    if (error || !data || !data.sesi_id) return null;
    const parsed = JSON.parse(data.sesi_id);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return null;
  } catch (err) {
    return null;
  }
}

export async function saveSesiListSupabase(sessions: SesiConfig[]): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('jadwal_matrix')
      .upsert({
        id: '__sesi_config__',
        hari: 'Senin',
        sesi_id: JSON.stringify(sessions),
        guru_ids: [],
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });

    return !error;
  } catch (err) {
    console.error('Error saveSesiListSupabase:', err);
    return false;
  }
}

export async function getJadwalMatrixSupabase(): Promise<JadwalSesiEntry[]> {
  try {
    const { data, error } = await supabase
      .from('jadwal_matrix')
      .select('*');

    if (error || !data) return [];
    const regularRows = data.filter((d: any) => typeof d.id === 'string' && !d.id.startsWith('__'));
    return regularRows.map((d: any) => ({
      id: d.id,
      hari: d.hari,
      sesiId: d.sesi_id,
      guruIds: Array.isArray(d.guru_ids) ? d.guru_ids : [],
    }));
  } catch (err) {
    console.error('Error getJadwalMatrixSupabase:', err);
    return [];
  }
}

export async function saveJadwalMatrixSupabase(entries: JadwalSesiEntry[]): Promise<boolean> {
  try {
    // 1. Ambil seluruh ID baris non-system yang ada di database saat ini
    const { data: existing } = await supabase
      .from('jadwal_matrix')
      .select('id');

    if (existing && existing.length > 0) {
      const idsToDelete = existing
        .map((e: any) => e.id)
        .filter((id: string) => typeof id === 'string' && !id.startsWith('__'));

      if (idsToDelete.length > 0) {
        await supabase.from('jadwal_matrix').delete().in('id', idsToDelete);
      }
    }

    if (entries.length === 0) return true;

    // 2. Format baris yang akan disimpan
    const rows = entries.map((e) => ({
      id: e.id || `mat-${e.hari}-${e.sesiId}`,
      hari: e.hari,
      sesi_id: e.sesiId,
      guru_ids: Array.isArray(e.guruIds) ? e.guruIds : [],
      updated_at: new Date().toISOString(),
    }));

    // 3. Upsert data ke tabel jadwal_matrix
    const { error } = await supabase
      .from('jadwal_matrix')
      .upsert(rows, { onConflict: 'id' });

    if (error) {
      console.error('Error saveJadwalMatrixSupabase upsert:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Error saveJadwalMatrixSupabase:', err);
    return false;
  }
}

/**
 * 3B. TUKAR JADWAL REQUESTS SERVICE
 */
export async function getTukarJadwalRequestsSupabase(): Promise<TukarJadwalRequest[]> {
  try {
    const { data, error } = await supabase
      .from('jadwal_matrix')
      .select('*')
      .eq('id', '__tukar_jadwal_requests__')
      .maybeSingle();

    if (error || !data || !data.sesi_id) return [];
    const parsed = JSON.parse(data.sesi_id);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Error getTukarJadwalRequestsSupabase:', err);
    return [];
  }
}

export async function saveTukarJadwalRequestsSupabase(requests: TukarJadwalRequest[]): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('jadwal_matrix')
      .upsert({
        id: '__tukar_jadwal_requests__',
        hari: 'senin',
        sesi_id: JSON.stringify(requests),
        guru_ids: [],
      }, { onConflict: 'id' });

    return !error;
  } catch (err) {
    console.error('Error saveTukarJadwalRequestsSupabase:', err);
    return false;
  }
}

/**
 * 4. ABSENSI RECORDS SERVICE
 */
export async function getAbsensiSupabase(): Promise<AbsensiRecord[]> {
  try {
    const { data, error } = await supabase
      .from('absensi_records')
      .select('*')
      .order('dibuat_pada', { ascending: false });

    if (error || !data) return [];
    return data.map((d: any) => ({
      id: d.id,
      guruId: d.guru_id,
      guruNama: d.guru_nama,
      tanggal: d.tanggal,
      jamMasuk: d.jam_masuk,
      jamPulang: d.jam_pulang,
      status: d.status,
      keterlambatan: d.keterlambatan || 0,
      lokasiValid: d.lokasi_valid,
      keterangan: d.keterangan || '',
      dibuatPada: d.dibuat_pada,
    }));
  } catch (err) {
    console.error('Error getAbsensiSupabase:', err);
    return [];
  }
}

export async function upsertAbsensiSupabase(record: AbsensiRecord): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('absensi_records')
      .upsert({
        id: record.id,
        guru_id: record.guruId,
        guru_nama: record.guruNama,
        tanggal: record.tanggal,
        jam_masuk: record.jamMasuk,
        jam_pulang: record.jamPulang,
        status: record.status,
        keterlambatan: record.keterlambatan,
        lokasi_valid: record.lokasiValid,
        keterangan: record.keterangan,
        dibuat_pada: record.dibuatPada,
      }, { onConflict: 'id' });

    return !error;
  } catch (err) {
    console.error('Error upsertAbsensiSupabase:', err);
    return false;
  }
}

/**
 * 5. APP SETTINGS SERVICE
 */
export async function getAppSettingsSupabase(): Promise<AppSettings | null> {
  try {
    const { data, error } = await supabase
      .from('app_settings')
      .select('*')
      .eq('id', 1)
      .single();

    if (error || !data) return null;

    let localWaktuBuka: number | undefined;
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('muallim_app_settings');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && typeof parsed.waktuBukaSebelumJadwal === 'number') {
            localWaktuBuka = parsed.waktuBukaSebelumJadwal;
          }
        }
      } catch (e) {}
    }

    // Fetch extra settings (waktuBukaSebelumJadwal) from __app_settings_extra__
    let extraWaktuBuka: number | undefined;
    try {
      const { data: extraData } = await supabase
        .from('jadwal_matrix')
        .select('*')
        .eq('id', '__app_settings_extra__')
        .single();

      if (extraData?.sesi_id) {
        const parsed = JSON.parse(extraData.sesi_id);
        if (typeof parsed?.waktuBukaSebelumJadwal === 'number') {
          extraWaktuBuka = parsed.waktuBukaSebelumJadwal;
        }
      }
    } catch (e) {}

    return {
      lokasiNama: data.lokasi_nama,
      latitude: data.latitude,
      longitude: data.longitude,
      radius: data.radius,
      jamMasukWajib: data.jam_masuk_wajib,
      batasKeterlambatan: data.batas_keterlambatan,
      jamPulang: data.jam_pulang,
      waktuBukaSebelumJadwal: extraWaktuBuka ?? (typeof data.waktu_buka_sebelum_jadwal === 'number' ? data.waktu_buka_sebelum_jadwal : undefined) ?? localWaktuBuka ?? 30,
    };
  } catch (err) {
    console.error('Error getAppSettingsSupabase:', err);
    return null;
  }
}

export async function saveAppSettingsSupabase(settings: AppSettings): Promise<boolean> {
  try {
    const payload: any = {
      id: 1,
      lokasi_nama: settings.lokasiNama,
      latitude: settings.latitude,
      longitude: settings.longitude,
      radius: settings.radius,
      jam_masuk_wajib: settings.jamMasukWajib,
      batas_keterlambatan: settings.batasKeterlambatan,
      jam_pulang: settings.jamPulang,
      updated_at: new Date().toISOString(),
    };

    await supabase
      .from('app_settings')
      .upsert(payload, { onConflict: 'id' });

    // Store extra settings like waktuBukaSebelumJadwal in __app_settings_extra__
    if (typeof settings.waktuBukaSebelumJadwal === 'number') {
      await supabase
        .from('jadwal_matrix')
        .upsert({
          id: '__app_settings_extra__',
          hari: 'Senin',
          sesi_id: JSON.stringify({ waktuBukaSebelumJadwal: settings.waktuBukaSebelumJadwal }),
          guru_ids: [],
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' });
    }

    return true;
  } catch (err) {
    console.error('Error saveAppSettingsSupabase:', err);
    return false;
  }
}

export async function resetAllDataExceptGurusSupabase(): Promise<boolean> {
  try {
    // Delete all attendance records
    await supabase.from('absensi_records').delete().neq('id', '___none___');
    // Delete all schedule matrix records except config rows
    await supabase.from('jadwal_matrix').delete().neq('id', '___none___').neq('id', '__sesi_config__').neq('id', '__app_settings_extra__');
    return true;
  } catch (err) {
    console.error('Error resetAllDataExceptGurusSupabase:', err);
    return false;
  }
}
