import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request: Request) {
  try {
    const {
      guruNama,
      guruEmail,
      previousStatus,
      newStatus = 'tetap',
      jabatan = 'Ustadz',
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

    const isUstadzah = String(jabatan).toLowerCase().includes('ustadzah') || String(jabatan).toLowerCase().includes('ustazah') || String(guruNama).toLowerCase().includes('ustadzah') || String(guruNama).toLowerCase().includes('ustazah');
    const sapaan = isUstadzah ? 'Ustadzah' : 'Ustadz';
    const sapaanNamaLengkap = guruNama.startsWith('Ustadz') || guruNama.startsWith('Ustadzah')
      ? guruNama
      : `${sapaan} ${guruNama}`;

    const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
    const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const emailFrom = smtpUser 
      ? `"Yayasan Tahfidz Mu'Allim Wal Arham" <${smtpUser}>`
      : (process.env.EMAIL_FROM || '"Yayasan Mu\'Allim Wal Arham" <noreply@muallim.sch.id>');

    const previousStatusLabel = previousStatus === 'honorer' ? 'Honorer' : previousStatus === 'magang' ? 'Magang' : 'Kontrak';

    const subject = `Pemberitahuan Resmi: Pengangkatan Status Guru Tetap (${sapaanNamaLengkap}) - Yayasan Tahfidz Mu'Allim Wal Arham`;
    const loginLink = `${safeAppUrl}/guru/profil`;

    const plainTextContent = `Assalamu'alaikum Warahmatullahi Wabarakatuh,

Yth. ${sapaanNamaLengkap},

Berdasarkan evaluasi kinerja, dedikasi, serta kontribusi yang telah ${sapaan} berikan dalam membina para santri, kami pimpinan Yayasan Tahfidz Mu'Allim Wal Arham mengumumkan bahwa status kepegawaian Anda telah resmi diangkat menjadi:

STATUS BARU: GURU TETAP (Sebelumnya: Guru ${previousStatusLabel})

Semoga amanah dan kepercayaan ini membawa keberkahan dan meningkatkan semangat dalam mendidik generasi Qur'ani.

Anda dapat melihat pembaruan status pada profil pengajar di:
${loginLink}

Jazakumullah Khairan Katsiran.
Yayasan Tahfidz Mu'Allim Wal Arham Makassar`;

    const htmlContent = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>Pengangkatan Guru Tetap</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="padding: 30px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06); border: 1px solid #e2e8f0;">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #1B6B4A 0%, #047857 100%); padding: 32px 24px; text-align: center;">
              <div style="display: inline-block; background-color: rgba(255, 255, 255, 0.18); border-radius: 12px; padding: 6px 14px; margin-bottom: 12px;">
                <span style="color: #ffffff; font-size: 13px; font-weight: 800;">📖 SIPETA — Mu'Allim Wal Arham</span>
              </div>
              <h1 style="color: #ffffff; font-size: 22px; font-weight: 800; margin: 0 0 6px;">Pengangkatan Status Guru Tetap</h1>
              <p style="color: #a7f3d0; font-size: 13px; margin: 0;">Yayasan Tahfidz Mu'Allim Wal Arham Makassar</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 32px 28px;">
              <p style="color: #0f172a; font-size: 15px; font-weight: 700; margin: 0 0 10px;">
                Assalamu'alaikum Warahmatullahi Wabarakatuh,
              </p>
              <p style="color: #334155; font-size: 14px; line-height: 1.6; margin: 0 0 20px;">
                Yth. <strong>${guruNama}</strong>,
              </p>
              <p style="color: #334155; font-size: 14px; line-height: 1.6; margin: 0 0 20px;">
                Berdasarkan evaluasi kinerja, dedikasi, serta kontribusi yang telah Ustadz/Ustadzah berikan dalam membina para santri, kami pimpinan <strong>Yayasan Tahfidz Mu'Allim Wal Arham</strong> dengan penuh rasa syukur mengumumkan bahwa status kepegawaian Anda telah resmi diangkat menjadi:
              </p>

              <!-- Status Box -->
              <div style="background-color: #ecfdf5; border: 2px solid #10b981; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 24px;">
                <div style="font-size: 12px; color: #047857; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Status Kepegawaian Baru</div>
                <div style="font-size: 22px; font-weight: 800; color: #065f46; margin: 8px 0 4px;">GURU TETAP</div>
                <div style="font-size: 12px; color: #64748b;">(Sebelumnya: Guru ${previousStatusLabel})</div>
              </div>

              <p style="color: #334155; font-size: 13.5px; line-height: 1.6; margin: 0 0 20px;">
                Semoga amanah dan kepercayaan ini membawa keberkahan, meningkatkan semangat dalam mendidik generasi Qur'ani, serta bernilai ibadah di sisi Allah SWT.
              </p>

              <!-- Button -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin: 28px 0 12px;">
                <tr>
                  <td align="center">
                    <a href="${loginLink}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #1B6B4A 0%, #15803D 100%); color: #ffffff; font-size: 14px; font-weight: 800; text-decoration: none; padding: 14px 32px; border-radius: 10px; box-shadow: 0 4px 14px rgba(27, 107, 74, 0.35); text-align: center;">
                      Lihat Profil Pengajar &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <p style="color: #64748b; font-size: 12px; text-align: center; margin: 16px 0 0;">
                Jazakumullah Khairan Katsiran atas dedikasi dan pengabdian yang tulus.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 24px; text-align: center;">
              <p style="color: #64748b; font-size: 12px; margin: 0 0 4px; font-weight: 600;">
                Yayasan Tahfidz Mu'Allim Wal Arham
              </p>
              <p style="color: #94a3b8; font-size: 11px; margin: 0;">
                Makassar, Sulawesi Selatan &bull; Pesan Otomatis dari Sistem Informasi Presensi Tenaga Ajar (SIPETA)
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    if (!smtpUser || !smtpPass) {
      console.log('--- [Simulasi] Email Pengangkatan Guru Tetap ---');
      console.log(`To: ${guruEmail}`);
      console.log(`Subject: ${subject}`);
      console.log('--------------------------------------------------');
      return NextResponse.json({
        success: true,
        mock: true,
        message: 'SMTP belum dikonfigurasi, email dicetak ke console.',
      });
    }

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
      replyTo: smtpUser,
      subject,
      text: plainTextContent,
      html: htmlContent,
      headers: {
        'X-Priority': '3',
        'X-Mailer': 'SIPETA Yayasan Tahfidz Mu\'Allim Wal Arham',
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error in send-status-promotion-email API:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
