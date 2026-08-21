import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export interface SendAbsenOpenedParams {
  guruNama: string;
  guruEmail: string;
  sesiNama: string;
  mataPelajaran?: string;
  jamMulai: string;
  jamSelesai: string;
  waktuBuka?: string;
  appUrl?: string;
}

export async function POST(request: Request) {
  try {
    const {
      guruNama,
      guruEmail,
      sesiNama,
      mataPelajaran,
      jamMulai,
      jamSelesai,
      waktuBuka,
      appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://walarham.vercel.app',
    }: SendAbsenOpenedParams = await request.json();

    if (!guruEmail || !guruNama || !sesiNama) {
      return NextResponse.json(
        { success: false, error: 'Email, nama guru, dan sesi nama wajib diisi' },
        { status: 400 }
      );
    }

    const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
    const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const emailFrom = process.env.EMAIL_FROM || `"Yayasan Mu'Allim Wal Arham" <${smtpUser || 'noreply@muallim.sch.id'}>`;

    const subject = `⏰ Presensi Mengajar Dibuka: ${sesiNama} (${jamMulai} WITA) — Yayasan Tahfidz Mu'Allim Wal Arham`;

    const directAttendanceLink = `${appUrl}/guru/beranda`;

    const htmlTemplate = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Presensi Mengajar Dibuka</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f1f5f9; padding: 30px 15px;">
    <tr>
      <td align="center">
        
        <!-- Main Container -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06); border: 1px solid #e2e8f0;">
          
          <!-- Banner Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #1B6B4A 0%, #14532D 100%); padding: 32px 24px; text-align: center;">
              <div style="display: inline-block; background-color: rgba(255, 255, 255, 0.18); border: 1px solid rgba(255, 255, 255, 0.3); border-radius: 12px; padding: 6px 14px; margin-bottom: 12px;">
                <span style="color: #ffffff; font-size: 14px; font-weight: 800; letter-spacing: 0.5px;">📖 Mu'Allim Attendance</span>
              </div>
              <h1 style="color: #ffffff; font-size: 20px; font-weight: 800; margin: 0 0 6px; letter-spacing: -0.3px;">Pemberitahuan Presensi Dibuka</h1>
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
                Yth. <strong>${guruNama}</strong>, sistem menginformasikan bahwa jendela presensi absensi mengajar untuk sesi berikut <strong>telah resmi dibuka</strong>:
              </p>

              <!-- Highlight Box Sesi -->
              <div style="background-color: #f0fdf4; border: 1.5px solid #86efac; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td>
                      <div style="font-size: 11px; color: #15803d; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Sesi Mengajar Aktif</div>
                      <div style="font-size: 18px; font-weight: 800; color: #166534; margin: 4px 0 6px;">${sesiNama}</div>
                      ${mataPelajaran ? `<div style="font-size: 12.5px; color: #15803d; font-weight: 600;">Mata Pelajaran: ${mataPelajaran}</div>` : ''}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding-top: 14px; border-top: 1px dashed #bbf7d0; margin-top: 12px;">
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                        <tr>
                          <td width="50%">
                            <div style="font-size: 11px; color: #64748b;">Jam Kelas</div>
                            <div style="font-size: 14px; font-weight: 800; color: #0f172a; font-family: monospace;">${jamMulai} – ${jamSelesai} WITA</div>
                          </td>
                          <td width="50%">
                            <div style="font-size: 11px; color: #64748b;">Status Presensi</div>
                            <div style="font-size: 13px; font-weight: 800; color: #15803d;">✓ Buka Sekarang ${waktuBuka ? `(${waktuBuka})` : ''}</div>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </div>

              <p style="color: #334155; font-size: 13px; line-height: 1.5; margin: 0 0 24px;">
                Mohon pastikan Anda telah berada di area lingkungan yayasan dan GPS perangkat aktif saat melakukan presensi masuk melalui tombol di bawah ini:
              </p>

              <!-- CTA Button -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="center">
                    <a href="${directAttendanceLink}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #1B6B4A 0%, #15803D 100%); color: #ffffff; font-size: 14px; font-weight: 800; text-decoration: none; padding: 14px 32px; border-radius: 10px; box-shadow: 0 4px 14px rgba(27, 107, 74, 0.35); text-align: center;">
                      📍 Buka Aplikasi &amp; Lakukan Presensi
                    </a>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 24px; text-align: center;">
              <p style="color: #64748b; font-size: 12px; margin: 0 0 4px; font-weight: 600;">
                Yayasan Tahfidz Mu'Allim Wal Arham
              </p>
              <p style="color: #94a3b8; font-size: 11px; margin: 0;">
                Email pemberitahuan otomatis sistem presensi &bull; Harap tidak membalas email ini secara langsung
              </p>
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

      const info = await transporter.sendMail({
        from: emailFrom,
        to: guruEmail,
        subject,
        html: htmlTemplate,
      });

      return NextResponse.json({
        success: true,
        mode: 'smtp',
        messageId: info.messageId,
        guruEmail,
      });
    } else {
      console.warn('SMTP credentials not configured. Absen opened email preview generated for:', guruEmail);
      return NextResponse.json({
        success: true,
        mode: 'preview_only',
        guruEmail,
      });
    }
  } catch (error: any) {
    console.error('Error sending absen opened email:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Gagal mengirim email pemberitahuan buka presensi' },
      { status: 500 }
    );
  }
}
