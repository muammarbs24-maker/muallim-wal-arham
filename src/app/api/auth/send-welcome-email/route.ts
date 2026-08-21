import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request: Request) {
  try {
    const { nama, nip, email, password, loginUrl = 'http://localhost:3000' } = await request.json();

    if (!email || !nama || !nip || !password) {
      return NextResponse.json(
        { success: false, error: 'Data guru tidak lengkap' },
        { status: 400 }
      );
    }

    const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
    const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const emailFrom = process.env.EMAIL_FROM || `"Yayasan Mu'Allim Wal Arham" <${smtpUser || 'noreply@muallim.sch.id'}>`;

    const subject = `🎉 Selamat Bergabung! Akun Absensi Guru Yayasan Mu'Allim Wal Arham (${nip})`;

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
        
        <!-- Main Card Container -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 560px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06); border: 1px solid #e2e8f0;">
          
          <!-- Top Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #1B6B4A 0%, #14532d 100%); padding: 32px 24px; text-align: center;">
              <div style="display: inline-block; background-color: rgba(255, 255, 255, 0.18); border: 1px solid rgba(255, 255, 255, 0.3); border-radius: 12px; padding: 8px 16px; margin-bottom: 12px;">
                <span style="color: #ffffff; font-size: 16px; font-weight: 800; letter-spacing: 0.5px;">📖 Mu'Allim Attendance</span>
              </div>
              <h1 style="color: #ffffff; font-size: 20px; font-weight: 800; margin: 0 0 6px; letter-spacing: -0.3px;">Selamat Bergabung!</h1>
              <p style="color: #bbf7d0; font-size: 13px; margin: 0; font-weight: 500;">Yayasan Tahfidz Mu'Allim Wal Arham</p>
            </td>
          </tr>

          <!-- Main Content Body -->
          <tr>
            <td style="padding: 32px 28px;">
              <p style="color: #0f172a; font-size: 15px; font-weight: 700; margin: 0 0 10px;">
                Assalamu'alaikum Warahmatullahi Wabarakatuh,
              </p>
              <p style="color: #334155; font-size: 13.5px; line-height: 1.6; margin: 0 0 20px;">
                Ahlan wa Sahlan <strong>${nama}</strong>. Akun Anda telah resmi didaftarkan oleh Administrator sebagai tenaga pendidik di Yayasan Tahfidz Mu'Allim Wal Arham.
              </p>
              <p style="color: #475569; font-size: 13px; margin: 0 0 14px;">
                Berikut adalah rincian data kredensial akun absensi &amp; monitoring Anda:
              </p>

              <!-- Credentials Box -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f8fafc; border: 1.5px solid #cbd5e1; border-radius: 12px; margin-bottom: 24px; overflow: hidden;">
                <tr>
                  <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; color: #64748b; font-size: 12.5px; font-weight: 600; width: 38%;">Nama Lengkap</td>
                  <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; color: #0f172a; font-size: 13px; font-weight: 700;">${nama}</td>
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

              <!-- Login CTA Button -->
              <div style="text-align: center; margin: 26px 0 22px;">
                <a href="${loginUrl}" target="_blank" style="display: inline-block; background-color: #1B6B4A; color: #ffffff; padding: 13px 36px; border-radius: 10px; font-weight: 700; font-size: 14px; text-decoration: none; box-shadow: 0 4px 14px rgba(27, 107, 74, 0.35);">
                  Masuk ke Aplikasi Absensi &rarr;
                </a>
              </div>

              <!-- Security Notice -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #fffbeb; border: 1px solid #fef08a; border-radius: 10px; padding: 12px 14px;">
                <tr>
                  <td style="font-size: 12px; color: #854d0e; line-height: 1.5;">
                    💡 <strong>Catatan Keamanan:</strong> Demi keamanan akun, saat pertama kali Anda login ke sistem, aplikasi akan mewajibkan Anda untuk memperbarui kata sandi baru pribadi.
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 24px; text-align: center;">
              <p style="color: #64748b; font-size: 12px; margin: 0 0 4px;">Yayasan Tahfidz Mu'Allim Wal Arham &bull; Makassar</p>
              <p style="color: #94a3b8; font-size: 11px; margin: 0; font-weight: 600;">&copy; 2026 MR Team</p>
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
        to: email,
        subject: subject,
        html: htmlTemplate,
        text: `Ahlan wa Sahlan ${nama}!\n\nAkun Anda telah didaftarkan di Yayasan Mu'Allim Wal Arham.\nID/NIP: ${nip}\nEmail: ${email}\nPassword Awal: ${password}\n\nSilakan login di: ${loginUrl}`,
      });

      console.log(`[WELCOME EMAIL SENT] Sent registration details to ${email} (NIP: ${nip})`);
      return NextResponse.json({ success: true, mode: 'smtp', email, nip });
    } else {
      console.log(`\n======================================================`);
      console.log(`🎉 [SIMULATED WELCOME EMAIL TO NEW TEACHER]`);
      console.log(`To: ${email}`);
      console.log(`Nama: ${nama}`);
      console.log(`ID Guru (NIP): ${nip}`);
      console.log(`Email Login: ${email}`);
      console.log(`Password Default: ${password}`);
      console.log(`Login URL: ${loginUrl}`);
      console.log(`======================================================\n`);

      return NextResponse.json({
        success: true,
        mode: 'simulated',
        email,
        nip,
        message: 'Welcome email berhasil dikirim (Mode preview/simulasi).'
      });
    }
  } catch (error: any) {
    console.error('[WELCOME EMAIL ERROR]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Gagal mengirim email kredensial guru' },
      { status: 500 }
    );
  }
}
