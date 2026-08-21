import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request: Request) {
  try {
    const {
      type = 'request',
      targetEmail,
      targetNama,
      requesterNama,
      requesterJadwal,
      targetJadwal,
      catatan = '',
      appUrl,
    }: {
      type: 'request' | 'approved' | 'rejected';
      targetEmail: string;
      targetNama: string;
      requesterNama: string;
      requesterJadwal: string;
      targetJadwal: string;
      catatan?: string;
      appUrl?: string;
    } = await request.json();

    const safeAppUrl = (!appUrl || appUrl.includes('localhost') || appUrl.includes('127.0.0.1'))
      ? (process.env.NEXT_PUBLIC_APP_URL || 'https://walarham.vercel.app').replace(/\/$/, '')
      : appUrl.replace(/\/$/, '');

    if (!targetEmail || !targetNama || !requesterNama) {
      return NextResponse.json(
        { success: false, error: 'Data email dan nama wajib diisi' },
        { status: 400 }
      );
    }

    const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
    const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const emailFrom = process.env.EMAIL_FROM || `"Yayasan Mu'Allim Wal Arham" <${smtpUser || 'noreply@muallim.sch.id'}>`;

    const subject =
      type === 'request'
        ? `🔄 Permintaan Tukar Jadwal dari ${requesterNama} — Mu'Allim Attendance`
        : type === 'approved'
        ? `✅ Permintaan Tukar Jadwal Disetujui — Mu'Allim Attendance`
        : `❌ Permintaan Tukar Jadwal Ditolak — Mu'Allim Attendance`;

    const jadwalLink = `${safeAppUrl}/guru/jadwal`;

    const htmlTemplate = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f1f5f9; padding: 30px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06); border: 1px solid #e2e8f0;">
          <tr>
            <td style="background: linear-gradient(135deg, #1B6B4A 0%, #14532d 100%); padding: 32px 24px; text-align: center;">
              <div style="display: inline-block; background-color: rgba(255, 255, 255, 0.18); border: 1px solid rgba(255, 255, 255, 0.3); border-radius: 12px; padding: 6px 14px; margin-bottom: 12px;">
                <span style="color: #ffffff; font-size: 14px; font-weight: 800; letter-spacing: 0.5px;">📖 Mu'Allim Attendance</span>
              </div>
              <h1 style="color: #ffffff; font-size: 20px; font-weight: 800; margin: 0 0 6px;">
                ${
                  type === 'request'
                    ? '🔄 Permintaan Tukar Jadwal Mengajar'
                    : type === 'approved'
                    ? '✅ Tukar Jadwal Mengajar Disetujui'
                    : '❌ Tukar Jadwal Mengajar Ditolak'
                }
              </h1>
              <p style="color: #bbf7d0; font-size: 13px; margin: 0; font-weight: 500;">Yayasan Tahfidz Mu'Allim Wal Arham</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px 28px;">
              <p style="color: #0f172a; font-size: 15px; font-weight: 700; margin: 0 0 10px;">
                Assalamu'alaikum Warahmatullahi Wabarakatuh, Ustadz/Ustazah ${targetNama},
              </p>
              <p style="color: #334155; font-size: 13.5px; line-height: 1.6; margin: 0 0 20px;">
                ${
                  type === 'request'
                    ? `Ustadz/Ustazah <strong>${requesterNama}</strong> telah mengajukan permintaan untuk <strong>bertukar jadwal mengajar</strong> dengan Anda.`
                    : type === 'approved'
                    ? `Permintaan tukar jadwal bersama <strong>${requesterNama}</strong> telah <strong>disetujui</strong> dan matriks jadwal yayasan telah diperbarui secara otomatis.`
                    : `Mohon maaf, permintaan tukar jadwal bersama <strong>${requesterNama}</strong> <strong>belum disetujui / ditolak</strong>.`
                }
              </p>

              <div style="background-color: #f8fafc; border: 1.5px solid #cbd5e1; border-radius: 12px; padding: 18px; margin-bottom: 24px;">
                <table width="100%" cellspacing="0" cellpadding="0" border="0" style="font-size: 13px;">
                  <tr>
                    <td style="padding: 6px 0; color: #64748b; font-weight: 600; width: 40%;">Jadwal Pengaju (${requesterNama}):</td>
                    <td style="padding: 6px 0; color: #0f172a; font-weight: 700;">${requesterJadwal}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Jadwal Ditukar (${targetNama}):</td>
                    <td style="padding: 6px 0; color: #166534; font-weight: 700;">${targetJadwal}</td>
                  </tr>
                  ${
                    catatan
                      ? `<tr>
                    <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Catatan/Alasan:</td>
                    <td style="padding: 6px 0; color: #334155; font-style: italic;">"${catatan}"</td>
                  </tr>`
                      : ''
                  }
                </table>
              </div>

              <div style="text-align: center; margin: 28px 0;">
                <a href="${jadwalLink}" style="display: inline-block; background-color: #1B6B4A; color: #ffffff; font-weight: 700; font-size: 14px; text-decoration: none; padding: 12px 28px; border-radius: 8px; box-shadow: 0 4px 12px rgba(27, 107, 74, 0.3);">
                  ${type === 'request' ? 'Lihat & Tanggapi Permintaan di Aplikasi' : 'Lihat Jadwal Terbaru Saya'}
                </a>
              </div>

              <p style="color: #64748b; font-size: 12px; margin: 20px 0 0; line-height: 1.5; border-top: 1px solid #e2e8f0; padding-top: 16px;">
                Catatan: Anda tidak perlu login berulang kali. Silakan buka aplikasi untuk melihat jadwal dan konfirmasi langsung.
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

      await transporter.sendMail({
        from: emailFrom,
        to: targetEmail,
        subject,
        html: htmlTemplate,
      });

      return NextResponse.json({
        success: true,
        message: `Email notifikasi tukar jadwal berhasil dikirim ke ${targetEmail}`,
      });
    } else {
      console.log(`[SIMULATED SWAP EMAIL] to ${targetEmail} | Subject: ${subject}`);
      return NextResponse.json({
        success: true,
        message: `Simulasi email tukar jadwal terkirim ke ${targetEmail}`,
      });
    }
  } catch (error: any) {
    console.error('Error sending swap email:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Gagal mengirim email notifikasi tukar jadwal' },
      { status: 500 }
    );
  }
}
