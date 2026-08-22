import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request: Request) {
  try {
    const {
      guruNama,
      guruEmail,
      appUrl,
    } = await request.json();

    const safeAppUrl = (!appUrl || appUrl.includes('localhost') || appUrl.includes('127.0.0.1'))
      ? (process.env.NEXT_PUBLIC_APP_URL || 'https://muallim-wal-arham.vercel.app').replace(/\/$/, '')
      : appUrl.replace(/\/$/, '');

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
    const emailFrom = smtpUser 
      ? `"Yayasan Tahfidz Mu'Allim Wal Arham" <${smtpUser}>`
      : (process.env.EMAIL_FROM || '"Yayasan Mu\'Allim Wal Arham" <noreply@muallim.sch.id>');

    const subject = `Pemberitahuan Resmi: Akun Mengajar Anda Telah Diaktifkan Kembali - Yayasan Tahfidz Mu'Allim Wal Arham`;
    const loginLink = `${safeAppUrl}/guru/beranda`;

    const plainTextContent = `Assalamu'alaikum Warahmatullahi Wabarakatuh,

Yth. ${guruNama},

Kami menginformasikan bahwa status akun pengajar Anda di sistem Yayasan Tahfidz Mu'Allim Wal Arham telah DIAKTIFKAN KEMBALI oleh Administrator.

Anda kini dapat kembali login ke portal guru, melihat jadwal mengajar aktif, dan melakukan absensi presensi seperti biasa di:
${loginLink}

Jazakumullah Khairan Katsiran.
Yayasan Tahfidz Mu'Allim Wal Arham Makassar`;

    const htmlContent = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>Akun Diaktifkan Kembali</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="padding: 30px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06); border: 1px solid #e2e8f0;">
          
          <tr>
            <td style="background: linear-gradient(135deg, #1B6B4A 0%, #14532D 100%); padding: 32px 24px; text-align: center;">
              <div style="display: inline-block; background-color: rgba(255, 255, 255, 0.18); border-radius: 12px; padding: 6px 14px; margin-bottom: 12px;">
                <span style="color: #ffffff; font-size: 13px; font-weight: 800;">📖 Mu'Allim Attendance</span>
              </div>
              <h1 style="color: #ffffff; font-size: 20px; font-weight: 800; margin: 0 0 6px;">Akun Anda Telah Aktif Kembali</h1>
              <p style="color: #bbf7d0; font-size: 13px; margin: 0;">Yayasan Tahfidz Mu'Allim Wal Arham</p>
            </td>
          </tr>

          <tr>
            <td style="padding: 32px 28px;">
              <p style="color: #0f172a; font-size: 15px; font-weight: 700; margin: 0 0 10px;">
                Assalamu'alaikum Warahmatullahi Wabarakatuh,
              </p>
              <p style="color: #334155; font-size: 13.5px; line-height: 1.6; margin: 0 0 20px;">
                Yth. <strong>${guruNama}</strong>, kami menginformasikan bahwa status akun pengajar Anda di sistem <strong>Yayasan Tahfidz Mu'Allim Wal Arham</strong> telah <strong>diaktifkan kembali</strong> oleh Administrator.
              </p>

              <div style="background-color: #f0fdf4; border: 1.5px solid #86efac; border-radius: 12px; padding: 18px; margin-bottom: 24px;">
                <div style="font-size: 12px; color: #15803d; font-weight: 700; text-transform: uppercase;">Status Akun Saat Ini</div>
                <div style="font-size: 16px; font-weight: 800; color: #166534; margin: 4px 0 6px;">✓ Aktif Penuh &amp; Siap Digunakan</div>
                <div style="font-size: 12.5px; color: #334155; line-height: 1.5;">
                  Anda kini dapat kembali login ke portal guru, melihat jadwal mengajar aktif, dan melakukan absensi presensi seperti biasa.
                </div>
              </div>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="center">
                    <a href="${loginLink}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #1B6B4A 0%, #15803D 100%); color: #ffffff; font-size: 14px; font-weight: 800; text-decoration: none; padding: 14px 32px; border-radius: 10px; box-shadow: 0 4px 14px rgba(27, 107, 74, 0.35); text-align: center;">
                      🚀 Buka Aplikasi Guru &rarr;
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 24px; text-align: center;">
              <p style="color: #64748b; font-size: 12px; margin: 0 0 4px; font-weight: 600;">
                Yayasan Tahfidz Mu'Allim Wal Arham
              </p>
              <p style="color: #94a3b8; font-size: 11px; margin: 0;">
                Email pemberitahuan otomatis sistem kepegawaian &bull; Makassar, Sulawesi Selatan
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
        auth: { user: smtpUser, pass: smtpPass },
      });

      const info = await transporter.sendMail({
        from: emailFrom,
        to: guruEmail,
        replyTo: smtpUser,
        subject,
        text: plainTextContent,
        html: htmlContent,
        headers: {
          'X-Priority': '3',
          'X-Mailer': 'SIPETA Yayasan Tahfidz Mu\'Allim Wal Arham',
        },
      });

      return NextResponse.json({ success: true, mode: 'smtp', messageId: info.messageId, guruEmail });
    } else {
      console.warn('SMTP credentials not configured. Reactivation email preview generated for:', guruEmail);
      return NextResponse.json({ success: true, mode: 'preview_only', guruEmail });
    }
  } catch (error: any) {
    console.error('Error sending teacher reactivation email:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Gagal mengirim email aktivasi' },
      { status: 500 }
    );
  }
}
