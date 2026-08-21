import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export interface JadwalItemEmail {
  hari: string;
  mataPelajaran?: string;
  namaJadwal?: string;
  keterangan?: string;
  deskripsi?: string;
  catatan?: string;
  jamMulai: string;
  jamSelesai: string;
  kelas?: string;
  ruangan?: string;
}

export async function POST(request: Request) {
  try {
    const {
      guruNama,
      guruEmail,
      jadwalList,
      appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://walarham.vercel.app',
      leadMinutes = 60,
    }: {
      guruNama: string;
      guruEmail: string;
      jadwalList: JadwalItemEmail[];
      appUrl?: string;
      leadMinutes?: number;
    } = await request.json();

    if (!guruEmail || !guruNama) {
      return NextResponse.json(
        { success: false, error: 'Email dan nama guru wajib diisi' },
        { status: 400 }
      );
    }

    const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
    const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const emailFrom = process.env.EMAIL_FROM || `"Yayasan Mu'Allim Wal Arham" <${smtpUser || 'noreply@muallim.sch.id'}>`;

    const subject = `📅 Jadwal Mengajar Anda (Senin – Minggu) — Yayasan Tahfidz Mu'Allim Wal Arham`;

    const DAYS_ORDER = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];

    const scheduleRows = DAYS_ORDER.map((day) => {
      const dayItems = (jadwalList || []).filter(
        (j) => j.hari && (j.hari.trim().toLowerCase() === day.toLowerCase() || (day === 'Minggu' && j.hari.trim().toLowerCase() === 'ahad'))
      );

      // Hari Libur (Tidak ada jadwal mengajar)
      if (dayItems.length === 0) {
        return `
          <tr style="border-bottom: 1px solid #e2e8f0; background-color: #fafbfc;">
            <td style="padding: 12px 14px; font-weight: 700; color: #475569; font-size: 13px; border-right: 1px solid #e2e8f0; vertical-align: middle; width: 110px;">
              ${day}
            </td>
            <td colspan="2" style="padding: 12px 14px; color: #64748b; font-size: 12px; vertical-align: middle;">
              <span style="display: inline-block; background-color: #f1f5f9; color: #475569; font-size: 11px; font-weight: 700; padding: 3px 9px; border-radius: 6px; border: 1px solid #cbd5e1; margin-right: 8px;">
                🌴 Libur
              </span>
              <span style="color: #64748b; font-size: 12px; font-weight: 500;">Tidak ada jadwal mengajar</span>
            </td>
          </tr>
        `;
      }

      // 1 Jadwal di Hari Ini
      if (dayItems.length === 1) {
        const item = dayItems[0];
        const nama = item.namaJadwal || item.mataPelajaran || 'Kelas Mengajar';
        const ket = item.keterangan || item.deskripsi || item.catatan || '';
        return `
          <tr style="border-bottom: 1px solid #e2e8f0; background-color: #ffffff;">
            <td style="padding: 12px 14px; font-weight: 800; color: #0f172a; font-size: 13px; border-right: 1px solid #e2e8f0; vertical-align: middle; width: 110px; background-color: #f8fafc;">
              ${day}
            </td>
            <td style="padding: 12px 14px; color: #0f172a; font-size: 13px; border-right: 1px solid #e2e8f0; vertical-align: middle;">
              <div style="font-weight: 700; color: #1e293b; font-size: 13.5px;">${nama}</div>
              ${ket ? `<div style="font-size: 11.5px; color: #64748b; font-weight: 500; margin-top: 3px;">${ket}</div>` : ''}
            </td>
            <td style="padding: 12px 14px; color: #166534; font-weight: 800; font-size: 12.5px; font-family: monospace; white-space: nowrap; vertical-align: middle; text-align: right; width: 145px;">
              ${item.jamMulai}–${item.jamSelesai} WITA
            </td>
          </tr>
        `;
      }

      // 2 Jadwal atau lebih dalam 1 Hari (Rowspan hari agar nama hari tidak ganda)
      return dayItems.map((item, idx) => {
        const isFirst = idx === 0;
        const isLast = idx === dayItems.length - 1;
        const nama = item.namaJadwal || item.mataPelajaran || 'Kelas Mengajar';
        const ket = item.keterangan || item.deskripsi || item.catatan || '';
        return `
          <tr style="border-bottom: ${isLast ? '1px solid #e2e8f0' : '1px dashed #e2e8f0'}; background-color: #ffffff;">
            ${isFirst ? `
              <td rowspan="${dayItems.length}" style="padding: 12px 14px; font-weight: 800; color: #0f172a; font-size: 13px; border-right: 1px solid #e2e8f0; vertical-align: middle; width: 110px; background-color: #f8fafc;">
                ${day}
                <div style="font-size: 10.5px; color: #166534; font-weight: 700; margin-top: 3px; background-color: #dcfce7; padding: 2px 6px; border-radius: 4px; display: inline-block;">
                  ${dayItems.length} Sesi
                </div>
              </td>
            ` : ''}
            <td style="padding: 10px 14px; color: #0f172a; font-size: 13px; border-right: 1px solid #e2e8f0; vertical-align: middle;">
              <div style="font-weight: 700; color: #1e293b; font-size: 13.5px;">${nama}</div>
              ${ket ? `<div style="font-size: 11.5px; color: #64748b; font-weight: 500; margin-top: 3px;">${ket}</div>` : ''}
            </td>
            <td style="padding: 10px 14px; color: #166534; font-weight: 800; font-size: 12.5px; font-family: monospace; white-space: nowrap; vertical-align: middle; text-align: right; width: 145px;">
              ${item.jamMulai}–${item.jamSelesai} WITA
            </td>
          </tr>
        `;
      }).join('');
    }).join('');

    const directJadwalLink = `${appUrl}/guru/jadwal`;

    const htmlTemplate = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Pemberitahuan Jadwal Mengajar</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f1f5f9; padding: 30px 15px;">
    <tr>
      <td align="center">
        
        <!-- Main Container -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 620px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06); border: 1px solid #e2e8f0;">
          
          <!-- Banner Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #1B6B4A 0%, #14532d 100%); padding: 32px 24px; text-align: center;">
              <div style="display: inline-block; background-color: rgba(255, 255, 255, 0.18); border: 1px solid rgba(255, 255, 255, 0.3); border-radius: 12px; padding: 6px 14px; margin-bottom: 12px;">
                <span style="color: #ffffff; font-size: 14px; font-weight: 800; letter-spacing: 0.5px;">📖 Mu'Allim Attendance</span>
              </div>
              <h1 style="color: #ffffff; font-size: 20px; font-weight: 800; margin: 0 0 6px; letter-spacing: -0.3px;">Pemberitahuan Jadwal Mengajar</h1>
              <p style="color: #bbf7d0; font-size: 13px; margin: 0; font-weight: 500;">Yayasan Tahfidz Mu'Allim Wal Arham</p>
            </td>
          </tr>

          <!-- Content Body -->
          <tr>
            <td style="padding: 32px 28px;">
              <p style="color: #0f172a; font-size: 15px; font-weight: 700; margin: 0 0 10px;">
                Assalamu'alaikum Warahmatullahi Wabarakatuh,
              </p>
              <p style="color: #334155; font-size: 13.5px; line-height: 1.6; margin: 0 0 20px;">
                Yth. Ustadz/Ustadzah <strong>${guruNama}</strong>, berikut rincian jadwal mengajar lengkap Anda mulai dari hari <strong>Senin hingga Minggu</strong> yang telah ditetapkan oleh Administrator:
              </p>

              <!-- Schedule Table (Senin - Minggu) -->
              <div style="margin-bottom: 24px;">
                <div style="font-size: 12px; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">
                  📋 Tabel Jadwal Mengajar Mingguan:
                </div>
                <div style="border: 1.5px solid #cbd5e1; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse: collapse; background-color: #ffffff; width: 100%;">
                    <thead>
                      <tr style="background-color: #1e293b; text-align: left; color: #ffffff;">
                        <th style="padding: 11px 14px; font-size: 11px; font-weight: 800; text-transform: uppercase; width: 110px;">Hari</th>
                        <th style="padding: 11px 14px; font-size: 11px; font-weight: 800; text-transform: uppercase;">Nama Jadwal &amp; Keterangan</th>
                        <th style="padding: 11px 14px; font-size: 11px; font-weight: 800; text-transform: uppercase; text-align: right; width: 145px;">Waktu (WITA)</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${scheduleRows}
                    </tbody>
                  </table>
                </div>
              </div>

              <!-- CTA Button -->
              <div style="text-align: center; margin: 28px 0 24px;">
                <a href="${directJadwalLink}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #1B6B4A 0%, #15803D 100%); color: #ffffff; padding: 14px 36px; border-radius: 10px; font-weight: 800; font-size: 14px; text-decoration: none; box-shadow: 0 4px 14px rgba(27, 107, 74, 0.35);">
                  📅 Lihat Jadwal Saya di Aplikasi &rarr;
                </a>
              </div>

              <!-- Attendance Notice -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 10px; padding: 12px 14px;">
                <tr>
                  <td style="font-size: 12px; color: #065f46; line-height: 1.5;">
                    💡 <strong>Informasi Presensi:</strong> Form absensi masuk akan otomatis terbuka dan muncul di portal guru Anda tepat <strong>${leadMinutes} menit sebelum jam mengajar dimulai</strong>, dan akan otomatis tertutup setelah Anda menyelesaikan absensi pulang.
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 24px; text-align: center;">
              <p style="color: #64748b; font-size: 12px; margin: 0 0 4px; font-weight: 600;">Yayasan Tahfidz Mu'Allim Wal Arham &bull; Makassar</p>
              <p style="color: #94a3b8; font-size: 11px; margin: 0;">Sistem Presensi &amp; Manajemen Jadwal Guru</p>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>
</body>
</html>`;

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

      await transporter.sendMail({
        from: emailFrom,
        to: guruEmail,
        subject: subject,
        html: htmlTemplate,
        text: `Assalamu'alaikum ${guruNama}!\n\nJadwal mengajar terbaru Anda telah diperbarui oleh Administrator Yayasan Mu'Allim Wal Arham.\n\nSilakan cek jadwal lengkap Anda di: ${directJadwalLink}`,
      });

      console.log(`[SCHEDULE EMAIL SENT] Successfully sent updated schedule to ${guruEmail} (${guruNama})`);
      return NextResponse.json({ success: true, mode: 'smtp', guruEmail });
    } else {
      console.log(`\n======================================================`);
      console.log(`📅 [SIMULATED SCHEDULE EMAIL TO TEACHER]`);
      console.log(`To: ${guruEmail} (${guruNama})`);
      console.log(`Jadwal Items Count: ${jadwalList?.length || 0}`);
      console.log(`Link: ${directJadwalLink}`);
      console.log(`======================================================\n`);

      return NextResponse.json({
        success: true,
        mode: 'simulated',
        guruEmail,
        message: 'Email jadwal berhasil dikirim (Mode preview/simulasi).'
      });
    }
  } catch (error: any) {
    console.error('[SCHEDULE EMAIL ERROR]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Gagal mengirim email konfirmasi jadwal' },
      { status: 500 }
    );
  }
}
