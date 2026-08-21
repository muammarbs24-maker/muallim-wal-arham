import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://hymwqulohlxeyjhvamky.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_vnVsFvRLJalZgb76SgB7wA_yW94xuny';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

function formatTotalMenit(totalMenit: number): string {
  if (totalMenit <= 0) return '—';
  const jam = Math.floor(totalMenit / 60);
  const menit = totalMenit % 60;
  if (jam === 0) return `${menit} mnt`;
  if (menit === 0) return `${jam} jam`;
  return `${jam}j ${menit}m`;
}

function hitungDurasiMenit(jamMasuk: string | null, jamPulang: string | null): number {
  if (!jamMasuk || !jamPulang) return 0;
  const [mH, mM] = jamMasuk.split(':').map(Number);
  const [pH, pM] = jamPulang.split(':').map(Number);
  const start = mH * 60 + mM;
  const end = pH * 60 + pM;
  return Math.max(0, end - start);
}

async function processAndSendMonthlyReport(targetBulanStr?: string, targetTahunStr?: string, customRecipient?: string) {
  // 1. Tentukan Periode Bulan Laporan (Default: Bulan yang baru selesai jika tgl 1, atau bulan berjalan)
  const now = new Date();
  // Tanggal dalam WITA (UTC+8)
  const witaTime = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  
  let targetYear = witaTime.getUTCFullYear();
  let targetMonthIndex = witaTime.getUTCMonth(); // 0-indexed

  // Jika tanggal 1 atau default cron, laporkan bulan sebelumnya
  if (!targetBulanStr) {
    if (witaTime.getUTCDate() === 1) {
      // Mundur 1 bulan
      targetMonthIndex -= 1;
      if (targetMonthIndex < 0) {
        targetMonthIndex = 11;
        targetYear -= 1;
      }
    }
  } else {
    targetMonthIndex = parseInt(targetBulanStr, 10) - 1;
    if (targetTahunStr) targetYear = parseInt(targetTahunStr, 10);
  }

  const bulanPadded = String(targetMonthIndex + 1).padStart(2, '0');
  const namaBulan = MONTH_NAMES[targetMonthIndex];
  const periodeLabel = `${namaBulan} ${targetYear}`;

  // 2. Dapatkan Email Pemilik / Penerima Laporan dari Supabase
  let adminEmail = customRecipient;
  let adminNama = 'Pimpinan / Pemilik Yayasan';

  if (!adminEmail) {
    try {
      const { data: adminData } = await supabase.from('admin_account').select('*').limit(1).single();
      if (adminData?.email_pemilik) {
        adminEmail = adminData.email_pemilik;
        adminNama = adminData.nama_pemilik || adminData.nama || adminNama;
      } else if (adminData?.email) {
        adminEmail = adminData.email;
        adminNama = adminData.nama || adminNama;
      }
    } catch (e) {}
  }

  if (!adminEmail) {
    try {
      const { data: setRow } = await supabase.from('app_settings').select('*').limit(1).single();
      if (setRow?.email_pemilik) {
        adminEmail = setRow.email_pemilik;
      }
    } catch (e) {}
  }

  if (!adminEmail) {
    adminEmail = process.env.SMTP_USER || 'admin@muallim.sch.id';
  }

  // 3. Ambil Data Guru dari Supabase
  let gurusList: Array<{ id: string; nama: string; jabatan: string }> = [];
  try {
    const { data: gData } = await supabase.from('gurus').select('*');
    if (gData && gData.length > 0) {
      gurusList = gData.map((g: any) => ({
        id: g.id,
        nama: g.nama,
        jabatan: g.jabatan || 'Guru Pengajar',
      }));
    }
  } catch (e) {}

  if (gurusList.length === 0) {
    gurusList = [
      { id: 'guru-1', nama: 'Ustadz Muammar, S.Pd', jabatan: 'Guru Tahfidz & Fiqih' }
    ];
  }

  // 4. Ambil Seluruh Data Absensi pada Bulan Tersebut dari Supabase
  const startTanggal = `${targetYear}-${bulanPadded}-01`;
  const endTanggal = `${targetYear}-${bulanPadded}-31`;

  let absensiRecords: any[] = [];
  try {
    const { data: aData } = await supabase
      .from('absensi_records')
      .select('*')
      .gte('tanggal', startTanggal)
      .lte('tanggal', endTanggal);
    if (aData) absensiRecords = aData;
  } catch (e) {}

  // 5. Kalkulasi Metrik Agregat Global
  const totalSesi = absensiRecords.length;
  const totalHadirTepatWaktu = absensiRecords.filter((a) => a.status === 'hadir_tepat_waktu').length;
  const totalTerlambat = absensiRecords.filter((a) => a.status === 'terlambat').length;
  const totalIzin = absensiRecords.filter((a) => a.status === 'izin').length;
  const totalSakit = absensiRecords.filter((a) => a.status === 'sakit').length;
  const totalAlfa = absensiRecords.filter((a) => a.status === 'alfa').length;
  const totalKehadiranFisik = totalHadirTepatWaktu + totalTerlambat;

  const persentaseKehadiran = totalSesi > 0
    ? Math.round(((totalHadirTepatWaktu + totalTerlambat) / totalSesi) * 100)
    : 100;

  const persentaseTepatWaktu = totalKehadiranFisik > 0
    ? Math.round((totalHadirTepatWaktu / totalKehadiranFisik) * 100)
    : 100;

  // 6. Rekapitulasi per Guru
  const guruSummary = gurusList.map((g) => {
    const records = absensiRecords.filter((a) => a.guru_id === g.id);
    const tepatWaktu = records.filter((a) => a.status === 'hadir_tepat_waktu').length;
    const terlambat = records.filter((a) => a.status === 'terlambat').length;
    const izin = records.filter((a) => a.status === 'izin').length;
    const sakit = records.filter((a) => a.status === 'sakit').length;
    const alfa = records.filter((a) => a.status === 'alfa').length;
    const totalMenit = records.reduce((sum, a) => sum + hitungDurasiMenit(a.jam_masuk, a.jam_pulang), 0);
    const persen = records.length > 0
      ? Math.round(((tepatWaktu + terlambat) / records.length) * 100)
      : (totalSesi === 0 ? 100 : 0);

    return {
      nama: g.nama,
      jabatan: g.jabatan,
      totalSesi: records.length,
      tepatWaktu,
      terlambat,
      izin,
      sakit,
      alfa,
      totalDurasi: formatTotalMenit(totalMenit),
      persenKehadiran: persen,
    };
  });

  // 7. Siapkan Pengiriman Email via Nodemailer SMTP
  const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
  const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const emailFrom = process.env.EMAIL_FROM || `"Yayasan Mu'Allim Wal Arham" <${smtpUser || 'noreply@muallim.sch.id'}>`;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://walarham.vercel.app';

  const subject = `📊 Laporan Rekap Presensi Bulanan Guru (${periodeLabel}) — Yayasan Mu'Allim Wal Arham`;

  // Baris Tabel Rekap Guru
  const guruRowsHtml = guruSummary.map((g, idx) => `
    <tr style="border-bottom: 1px solid #e2e8f0; background: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
      <td style="padding: 12px 14px; font-weight: 700; color: #1e293b; font-size: 13px;">
        ${g.nama}
        <div style="font-size: 11px; color: #64748b; font-weight: 400; margin-top: 2px;">${g.jabatan}</div>
      </td>
      <td style="padding: 12px 8px; text-align: center; font-weight: 700; color: #166534; font-size: 12.5px;">${g.tepatWaktu}</td>
      <td style="padding: 12px 8px; text-align: center; font-weight: 700; color: #b45309; font-size: 12.5px;">${g.terlambat}</td>
      <td style="padding: 12px 8px; text-align: center; color: #0369a1; font-size: 12.5px;">${g.izin + g.sakit}</td>
      <td style="padding: 12px 8px; text-align: center; color: ${g.alfa > 0 ? '#dc2626' : '#64748b'}; font-weight: ${g.alfa > 0 ? '700' : '400'}; font-size: 12.5px;">${g.alfa}</td>
      <td style="padding: 12px 10px; text-align: center; font-size: 12px; font-weight: 600; color: #334155; font-family: monospace;">${g.totalDurasi}</td>
      <td style="padding: 12px 14px; text-align: right;">
        <span style="display: inline-block; padding: 3px 8px; border-radius: 9999px; font-size: 11px; font-weight: 800; background: ${g.persenKehadiran >= 90 ? '#dcfce7' : g.persenKehadiran >= 75 ? '#fef3c7' : '#fee2e2'}; color: ${g.persenKehadiran >= 90 ? '#166534' : g.persenKehadiran >= 75 ? '#92400e' : '#991b1b'};">
          ${g.persenKehadiran}%
        </span>
      </td>
    </tr>
  `).join('');

  const htmlContent = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Laporan Bulanan Presensi Guru</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f1f5f9; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 660px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 6px 24px rgba(0, 0, 0, 0.07); border: 1px solid #e2e8f0;">
          
          <!-- Banner Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #1B6B4A 0%, #14532D 100%); padding: 36px 28px; text-align: center;">
              <div style="display: inline-block; background-color: rgba(255, 255, 255, 0.2); border: 1px solid rgba(255, 255, 255, 0.35); border-radius: 12px; padding: 5px 14px; margin-bottom: 12px;">
                <span style="color: #ffffff; font-size: 13px; font-weight: 800; letter-spacing: 0.5px;">📖 Mu'Allim Attendance System</span>
              </div>
              <h1 style="color: #ffffff; font-size: 22px; font-weight: 800; margin: 0 0 6px; letter-spacing: -0.3px;">Laporan Rekap Presensi Bulanan Guru</h1>
              <p style="color: #bbf7d0; font-size: 14px; margin: 0; font-weight: 600;">Periode: ${periodeLabel}</p>
            </td>
          </tr>

          <!-- Content Body -->
          <tr>
            <td style="padding: 32px 28px;">
              <p style="color: #0f172a; font-size: 15px; font-weight: 700; margin: 0 0 10px;">
                Assalamu'alaikum Warahmatullahi Wabarakatuh,
              </p>
              
              <!-- Pesan Utama Sesuai Arahan Dengan Link Langsung -->
              <div style="background-color: #f0fdf4; border: 1.5px solid #86efac; border-left: 5px solid #16a34a; padding: 18px 20px; border-radius: 12px; margin-bottom: 24px;">
                <p style="color: #166534; font-size: 14.5px; font-weight: 700; line-height: 1.6; margin: 0 0 10px;">
                  Yth. ${adminNama}, laporan bulan ini (${periodeLabel}) sudah selesai di audit, silahkan cek aplikasi untuk selengkapnya.
                </p>
                <div style="padding-top: 10px; border-top: 1px dashed #86efac;">
                  <span style="font-size: 12px; color: #15803d; font-weight: 600;">🔗 Link Cek Laporan Aplikasi:</span><br />
                  <a href="${appUrl}/admin/laporan" target="_blank" style="color: #15803d; font-weight: 800; font-size: 13.5px; word-break: break-all; text-decoration: underline;">
                    ${appUrl}/admin/laporan
                  </a>
                </div>
              </div>

              <!-- Tombol Cepat Cek Laporan -->
              <div style="text-align: center; margin-bottom: 26px;">
                <a href="${appUrl}/admin/laporan" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #1B6B4A 0%, #15803D 100%); color: #ffffff; font-weight: 800; font-size: 14px; padding: 14px 32px; border-radius: 10px; text-decoration: none; box-shadow: 0 4px 14px rgba(27, 107, 74, 0.35);">
                  📊 Buka &amp; Cek Laporan di Aplikasi &rarr;
                </a>
              </div>

              <!-- KPI Stats Grid -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom: 26px;">
                <tr>
                  <td width="32%" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px 12px; text-align: center;">
                    <div style="font-size: 11px; color: #64748b; font-weight: 700; text-transform: uppercase;">Total Sesi Presensi</div>
                    <div style="font-size: 22px; font-weight: 800; color: #1e293b; margin-top: 4px;">${totalSesi}</div>
                    <div style="font-size: 10.5px; color: #10b981; font-weight: 600; margin-top: 2px;">Tercatat di sistem</div>
                  </td>
                  <td width="2%"></td>
                  <td width="32%" style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 14px 12px; text-align: center;">
                    <div style="font-size: 11px; color: #166534; font-weight: 700; text-transform: uppercase;">Tingkat Kehadiran</div>
                    <div style="font-size: 22px; font-weight: 800; color: #15803d; margin-top: 4px;">${persentaseKehadiran}%</div>
                    <div style="font-size: 10.5px; color: #166534; font-weight: 600; margin-top: 2px;">Hadir / Beraktivitas</div>
                  </td>
                  <td width="2%"></td>
                  <td width="32%" style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px; padding: 14px 12px; text-align: center;">
                    <div style="font-size: 11px; color: #1e40af; font-weight: 700; text-transform: uppercase;">Ketepatan Waktu</div>
                    <div style="font-size: 22px; font-weight: 800; color: #1d4ed8; margin-top: 4px;">${persentaseTepatWaktu}%</div>
                    <div style="font-size: 10.5px; color: #2563eb; font-weight: 600; margin-top: 2px;">Bebas Terlambat</div>
                  </td>
                </tr>
              </table>

              <!-- Detail Table Section -->
              <h3 style="font-size: 14px; font-weight: 800; color: #0f172a; margin: 0 0 12px; display: flex; align-items: center; gap: 6px;">
                📋 Rekapitulasi Presensi per Guru Pengajar
              </h3>

              <div style="border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; margin-bottom: 28px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse: collapse; font-size: 12px;">
                  <thead>
                    <tr style="background-color: #1e293b; color: #ffffff;">
                      <th style="padding: 11px 14px; text-align: left; font-weight: 700;">Nama Guru</th>
                      <th style="padding: 11px 8px; text-align: center; font-weight: 700;" title="Hadir Tepat Waktu">Tepat</th>
                      <th style="padding: 11px 8px; text-align: center; font-weight: 700;" title="Terlambat">Telat</th>
                      <th style="padding: 11px 8px; text-align: center; font-weight: 700;" title="Izin / Sakit">I/S</th>
                      <th style="padding: 11px 8px; text-align: center; font-weight: 700;" title="Tanpa Keterangan">Alfa</th>
                      <th style="padding: 11px 10px; text-align: center; font-weight: 700;">Total Jam</th>
                      <th style="padding: 11px 14px; text-align: right; font-weight: 700;">Skor</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${guruRowsHtml}
                  </tbody>
                </table>
              </div>

              <!-- CTA Button to Dashboard -->
              <div style="text-align: center; margin-bottom: 24px;">
                <a href="${appUrl}/admin/laporan" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #1B6B4A 0%, #15803D 100%); color: #ffffff; font-weight: 800; font-size: 13.5px; padding: 13px 28px; border-radius: 10px; text-decoration: none; box-shadow: 0 4px 14px rgba(27, 107, 74, 0.3);">
                  Buka Dashboard Laporan Lengkap &rarr;
                </a>
              </div>

              <div style="background-color: #f8fafc; border-radius: 10px; padding: 12px 16px; border: 1px dashed #cbd5e1;">
                <p style="font-size: 11.5px; color: #64748b; line-height: 1.5; margin: 0;">
                  📌 <em>Laporan ini digenerate secara otomatis oleh sistem server <strong>Mu'Allim Attendance</strong> setiap tanggal 1 pukul 08:00 WITA. Anda juga dapat mengunduh laporan dalam format CSV atau mencetak PDF kapan saja melalui menu Laporan di Panel Admin.</em>
                </p>
              </div>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 22px 28px; text-align: center;">
              <p style="color: #64748b; font-size: 12px; margin: 0 0 4px; font-weight: 600;">
                Yayasan Tahfidz Mu'Allim Wal Arham
              </p>
              <p style="color: #94a3b8; font-size: 11px; margin: 0;">
                Sistem Otomasi Presensi &amp; Akademik &bull; Makassar, Sulawesi Selatan (WITA)
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  // 8. Eksekusi Pengiriman Email
  if (smtpUser && smtpPass) {
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    const info = await transporter.sendMail({
      from: emailFrom,
      to: adminEmail,
      subject,
      html: htmlContent,
    });

    return {
      success: true,
      mode: 'smtp',
      messageId: info.messageId,
      periode: periodeLabel,
      recipient: adminEmail,
      stats: {
        totalSesi,
        persentaseKehadiran,
        totalGuru: gurusList.length,
      },
    };
  } else {
    console.warn('SMTP credentials not configured. Email preview generated for:', adminEmail);
    return {
      success: true,
      mode: 'preview_only',
      periode: periodeLabel,
      recipient: adminEmail,
      stats: {
        totalSesi,
        persentaseKehadiran,
        totalGuru: gurusList.length,
      },
    };
  }
}

// GET Handler (Triggered automatically by Vercel Cron Job)
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const bulan = url.searchParams.get('bulan') || undefined;
    const tahun = url.searchParams.get('tahun') || undefined;
    const recipient = url.searchParams.get('recipient') || undefined;

    const result = await processAndSendMonthlyReport(bulan, tahun, recipient);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error executing monthly report cron:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Gagal mengirim laporan bulanan' },
      { status: 500 }
    );
  }
}

// POST Handler (Triggered manually via Admin UI button)
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { bulan, tahun, recipient } = body;

    const result = await processAndSendMonthlyReport(bulan, tahun, recipient);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error executing monthly report dispatch:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Gagal mengirim laporan bulanan' },
      { status: 500 }
    );
  }
}
