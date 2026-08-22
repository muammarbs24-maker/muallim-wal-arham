import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request: Request) {
  try {
    const { nama, nip, email, password, loginUrl, jabatan = 'Ustadz', statusKepegawaian = 'tetap' } = await request.json();

    const safeLoginUrl = (!loginUrl || loginUrl.includes('localhost') || loginUrl.includes('127.0.0.1'))
      ? (process.env.NEXT_PUBLIC_APP_URL || 'https://muallim-wal-arham.vercel.app')
      : loginUrl;

    if (!email || !nama || !nip || !password) {
      return NextResponse.json(
        { success: false, error: 'Data guru tidak lengkap' },
        { status: 400 }
      );
    }

    const isUstadzah = jabatan.toLowerCase().includes('ustadzah') || jabatan.toLowerCase().includes('ustazah') || jabatan.toLowerCase().includes('perempuan');
    const sapaan = isUstadzah ? 'Ustadzah' : 'Ustadz';
    const sapaanNamaLengkap = `${sapaan} ${nama}`;

    const statusLower = String(statusKepegawaian).toLowerCase();
    const statusLabel = statusLower === 'tetap' 
      ? 'Guru Tetap' 
      : statusLower === 'magang' 
      ? 'Guru Magang' 
      : 'Guru Honorer';

    const statusBadgeColor = statusLower === 'tetap'
      ? { bg: '#dcfce7', text: '#166534', border: '#86efac' }
      : statusLower === 'magang'
      ? { bg: '#e0f2fe', text: '#0369a1', border: '#7dd3fc' }
      : { bg: '#fef3c7', text: '#92400e', border: '#fcd34d' };

    const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
    const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const emailFrom = smtpUser 
      ? `"Yayasan Tahfidz Mu'Allim Wal Arham" <${smtpUser}>`
      : (process.env.EMAIL_FROM || '"Yayasan Mu\'Allim Wal Arham" <noreply@muallim.sch.id>');

    const subject = `Pemberitahuan Akun Pengajar: ${sapaanNamaLengkap} - Yayasan Tahfidz Mu'Allim Wal Arham (NIP: ${nip})`;

    const plainTextContent = `Assalamu'alaikum Warahmatullahi Wabarakatuh,

Ahlan wa Sahlan Yth. ${sapaanNamaLengkap},

Akun Anda telah resmi didaftarkan oleh Administrator sebagai tenaga pendidik di Yayasan Tahfidz Mu'Allim Wal Arham.

Berikut adalah rincian data kepegawaian & kredensial akun absensi Anda:
- Sapaan / Jabatan : ${sapaan}
- Nama Lengkap     : ${nama}
- Status Kepegawaian: ${statusLabel}
- ID / NIP Guru    : ${nip}
- Email Login      : ${email}
- Kata Sandi Awal  : ${password}

Silakan login dan lengkapi profil Anda melalui tautan berikut:
${safeLoginUrl}

Catatan: Demi keamanan akun, saat pertama kali login Anda akan diarahkan untuk memperbarui kata sandi pribadi Anda.

Jazakumullah Khairan Katsiran.
Yayasan Tahfidz Mu'Allim Wal Arham Makassar`;

    const htmlTemplate = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Selamat Bergabung di Yayasan Mu'Allim Wal Arham</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f1f5f9; padding: 30px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 580px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06); border: 1px solid #e2e8f0;">
          <tr>
            <td style="background: linear-gradient(135deg, #1B6B4A 0%, #047857 100%); padding: 32px 24px; text-align: center;">
              <div style="display: inline-block; background-color: rgba(255, 255, 255, 0.18); border: 1px solid rgba(255, 255, 255, 0.3); border-radius: 12px; padding: 6px 14px; margin-bottom: 12px;">
                <span style="color: #ffffff; font-size: 13px; font-weight: 800; letter-spacing: 0.5px;">📖 SIPETA — Mu'Allim Wal Arham</span>
              </div>
              <h1 style="color: #ffffff; font-size: 20px; font-weight: 800; margin: 0 0 6px;">Selamat Bergabung, ${sapaan}!</h1>
              <p style="color: #bbf7d0; font-size: 13px; margin: 0; font-weight: 500;">Yayasan Tahfidz Mu'Allim Wal Arham Makassar</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px 28px;">
              <p style="color: #0f172a; font-size: 15px; font-weight: 700; margin: 0 0 10px;">
                Assalamu'alaikum Warahmatullahi Wabarakatuh,
              </p>
              <p style="color: #334155; font-size: 14px; line-height: 1.6; margin: 0 0 20px;">
                Ahlan wa Sahlan Yth. <strong>${sapaanNamaLengkap}</strong>. Akun Anda telah resmi didaftarkan oleh Administrator sebagai tenaga pendidik di lingkungan <strong>Yayasan Tahfidz Mu'Allim Wal Arham</strong>.
              </p>
              <p style="color: #475569; font-size: 13px; margin: 0 0 14px;">
                Berikut adalah rincian data kepegawaian serta kredensial akun presensi mengajar Anda:
              </p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f8fafc; border: 1.5px solid #cbd5e1; border-radius: 12px; margin-bottom: 24px; overflow: hidden;">
                <tr>
                  <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; color: #64748b; font-size: 12.5px; font-weight: 600; width: 40%;">Sapaan / Jabatan</td>
                  <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; color: #0f172a; font-size: 13px; font-weight: 700;">${sapaan}</td>
                </tr>
                <tr>
                  <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; color: #64748b; font-size: 12.5px; font-weight: 600;">Nama Lengkap</td>
                  <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; color: #0f172a; font-size: 13px; font-weight: 700;">${nama}</td>
                </tr>
                <tr>
                  <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; color: #64748b; font-size: 12.5px; font-weight: 600;">Status Kepegawaian</td>
                  <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0;">
                    <span style="display: inline-block; background-color: ${statusBadgeColor.bg}; color: ${statusBadgeColor.text}; font-size: 12px; font-weight: 800; padding: 4px 10px; border-radius: 6px; border: 1px solid ${statusBadgeColor.border};">
                      ${statusLabel}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; color: #64748b; font-size: 12.5px; font-weight: 600;">NIP / ID Guru</td>
                  <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0;">
                    <span style="display: inline-block; background-color: #dcfce7; color: #166534; font-family: monospace; font-size: 13px; font-weight: 800; padding: 3px 8px; border-radius: 6px; border: 1px solid #86efac;">${nip}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; color: #64748b; font-size: 12.5px; font-weight: 600;">Email Login</td>
                  <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; color: #0f172a; font-size: 13px; font-weight: 700;">${email}</td>
                </tr>
                <tr>
                  <td style="padding: 12px 16px; color: #64748b; font-size: 12.5px; font-weight: 600;">Kata Sandi Awal</td>
                  <td style="padding: 12px 16px;">
                    <span style="display: inline-block; background-color: #fee2e2; color: #991b1b; font-family: monospace; font-size: 13px; font-weight: 800; padding: 3px 8px; border-radius: 6px; border: 1px solid #fca5a5;">${password}</span>
                  </td>
                </tr>
              </table>
              <div style="text-align: center; margin: 26px 0 22px;">
                <a href="${safeLoginUrl}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #1B6B4A 0%, #15803D 100%); color: #ffffff; padding: 13px 36px; border-radius: 10px; font-weight: 700; font-size: 14px; text-decoration: none; box-shadow: 0 4px 14px rgba(27, 107, 74, 0.35);">
                  Masuk ke Aplikasi Presensi &rarr;
                </a>
              </div>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #fffbeb; border: 1px solid #fef08a; border-radius: 10px; padding: 12px 14px;">
                <tr>
                  <td style="font-size: 12px; color: #854d0e; line-height: 1.5;">
                    💡 <strong>Catatan Keamanan:</strong> Demi keamanan akun, saat pertama kali Anda login ke sistem, aplikasi akan mewajibkan Anda untuk memperbarui kata sandi baru pribadi.
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 24px; text-align: center;">
              <p style="color: #64748b; font-size: 12px; margin: 0 0 4px; font-weight: 600;">Yayasan Tahfidz Mu'Allim Wal Arham &bull; Makassar</p>
              <p style="color: #94a3b8; font-size: 11px; margin: 0;">Sistem Informasi Presensi Tenaga Ajar (SIPETA)</p>
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

      await transporter.sendMail({
        from: emailFrom,
        to: email,
        replyTo: smtpUser,
        subject: subject,
        html: htmlTemplate,
        text: plainTextContent,
        headers: {
          'X-Priority': '3',
          'X-Mailer': 'SIPETA Yayasan Tahfidz Mu\'Allim Wal Arham',
        },
      });

      console.log(`[WELCOME EMAIL SENT] Sent registration details to ${email} (NIP: ${nip})`);
      return NextResponse.json({ success: true, mode: 'smtp', email, nip });
    } else {
      console.log(`\n======================================================`);
      console.log(`🎉 [SIMULATED WELCOME EMAIL TO NEW TEACHER]`);
      console.log(`To: ${email}`);
      console.log(`Sapaan & Nama: ${sapaanNamaLengkap}`);
      console.log(`Status: ${statusLabel}`);
      console.log(`ID Guru (NIP): ${nip}`);
      console.log(`Email Login: ${email}`);
      console.log(`Password Default: ${password}`);
      console.log(`Login URL: ${safeLoginUrl}`);
      console.log(`======================================================\n`);
      return NextResponse.json({ success: true, mode: 'mock_console', email, nip });
    }
  } catch (error: any) {
    console.error('Error sending welcome email:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Gagal mengirim email welcome guru' },
      { status: 500 }
    );
  }
}
