/**
 * Service to dispatch OTP emails via backend API route
 */
export interface SendOtpParams {
  email: string;
  otp: string;
  type?: 'reset_password' | 'change_email' | 'login_verification';
  nama?: string;
}

export async function requestSendOtpEmail({ email, otp, type = 'reset_password', nama = 'Pengguna' }: SendOtpParams) {
  try {
    const res = await fetch('/api/auth/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp, type, nama }),
    });

    const data = await res.json();
    return data;
  } catch (err) {
    console.error('Error calling send-otp API:', err);
    return { success: false, error: 'Koneksi gagal saat mengirim email OTP' };
  }
}

export interface SendWelcomeEmailParams {
  nama: string;
  nip: string;
  email: string;
  password: string;
  loginUrl?: string;
}

export async function sendTeacherWelcomeEmail({ nama, nip, email, password, loginUrl = 'http://localhost:3000' }: SendWelcomeEmailParams) {
  try {
    const res = await fetch('/api/auth/send-welcome-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nama, nip, email, password, loginUrl }),
    });

    const data = await res.json();
    return data;
  } catch (err) {
    console.error('Error calling send-welcome-email API:', err);
    return { success: false, error: 'Koneksi gagal saat mengirim email kredensial guru' };
  }
}

export interface SendScheduleEmailParams {
  guruNama: string;
  guruEmail: string;
  jadwalList: Array<{
    hari: string;
    mataPelajaran?: string;
    namaJadwal?: string;
    keterangan?: string;
    deskripsi?: string;
    jamMulai: string;
    jamSelesai: string;
    kelas?: string;
    ruangan?: string;
    catatan?: string;
  }>;
  appUrl?: string;
  leadMinutes?: number;
}

export async function sendScheduleNotificationEmail({ guruNama, guruEmail, jadwalList, appUrl, leadMinutes }: SendScheduleEmailParams) {
  try {
    const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://walarham.vercel.app';
    const res = await fetch('/api/notifikasi/send-jadwal-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        guruNama,
        guruEmail,
        jadwalList,
        appUrl: appUrl || currentOrigin,
        leadMinutes: leadMinutes || 60,
      }),
    });

    const data = await res.json();
    return data;
  } catch (err) {
    console.error('Error calling send-jadwal-email API:', err);
    return { success: false, error: 'Koneksi gagal saat mengirim email notifikasi jadwal' };
  }
}

export interface SendScheduleSwapEmailParams {
  type: 'request' | 'approved' | 'rejected';
  targetEmail: string;
  targetNama: string;
  requesterNama: string;
  requesterJadwal: string;
  targetJadwal: string;
  catatan?: string;
  appUrl?: string;
}

export async function sendScheduleSwapEmail({
  type,
  targetEmail,
  targetNama,
  requesterNama,
  requesterJadwal,
  targetJadwal,
  catatan,
  appUrl,
}: SendScheduleSwapEmailParams) {
  try {
    const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://walarham.vercel.app';
    const res = await fetch('/api/notifikasi/send-tukar-jadwal-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type,
        targetEmail,
        targetNama,
        requesterNama,
        requesterJadwal,
        targetJadwal,
        catatan,
        appUrl: appUrl || currentOrigin,
      }),
    });

    const data = await res.json();
    return data;
  } catch (err) {
    console.error('Error calling send-tukar-jadwal-email API:', err);
    return { success: false, error: 'Koneksi gagal saat mengirim email tukar jadwal' };
  }
}

export interface SendAbsenOpenedEmailParams {
  guruNama: string;
  guruEmail: string;
  sesiNama: string;
  mataPelajaran?: string;
  jamMulai: string;
  jamSelesai: string;
  waktuBuka?: string;
  appUrl?: string;
}

export async function sendAbsenOpenedNotificationEmail({
  guruNama,
  guruEmail,
  sesiNama,
  mataPelajaran,
  jamMulai,
  jamSelesai,
  waktuBuka,
  appUrl,
}: SendAbsenOpenedEmailParams) {
  try {
    const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://walarham.vercel.app';
    const res = await fetch('/api/notifikasi/send-absen-opened-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        guruNama,
        guruEmail,
        sesiNama,
        mataPelajaran,
        jamMulai,
        jamSelesai,
        waktuBuka,
        appUrl: appUrl || currentOrigin,
      }),
    });

    const data = await res.json();
    return data;
  } catch (err) {
    console.error('Error calling send-absen-opened-email API:', err);
    return { success: false, error: 'Koneksi gagal saat mengirim email pemberitahuan buka absensi' };
  }
}

export async function sendTeacherReactivatedEmail({
  guruNama,
  guruEmail,
  appUrl,
}: {
  guruNama: string;
  guruEmail: string;
  appUrl?: string;
}) {
  try {
    const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://walarham.vercel.app';
    const res = await fetch('/api/notifikasi/send-guru-reactivated-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        guruNama,
        guruEmail,
        appUrl: appUrl || currentOrigin,
      }),
    });

    const data = await res.json();
    return data;
  } catch (err) {
    console.error('Error calling send-guru-reactivated-email API:', err);
    return { success: false, error: 'Koneksi gagal saat mengirim email aktivasi' };
  }
}


