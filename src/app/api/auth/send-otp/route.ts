import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request: Request) {
  try {
    const { email, otp, type = 'reset_password', nama = 'Pengguna' } = await request.json();

    if (!email || !otp) {
      return NextResponse.json(
        { success: false, error: 'Email dan Kode OTP wajib disertakan' },
        { status: 400 }
      );
    }

    const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
    const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const emailFrom = process.env.EMAIL_FROM || `"Yayasan Mu'Allim Wal Arham" <${smtpUser || 'noreply@muallim.sch.id'}>`;

    let subject = "Kode OTP Verifikasi - Yayasan Mu'Allim Wal Arham";
    let title = "Verifikasi Keamanan Akun";
    let message = "Gunakan kode OTP berikut untuk memverifikasi akun Anda:";

    if (type === 'reset_password') {
      subject = "🔑 Kode OTP Reset Kata Sandi - Yayasan Mu'Allim Wal Arham";
      title = "Permintaan Reset Kata Sandi";
      message = "Kami menerima permintaan untuk mereset kata sandi akun Anda. Masukkan kode OTP berikut di aplikasi:";
    } else if (type === 'change_email') {
      subject = "🛡️ Kode OTP Verifikasi Email Baru - Yayasan Mu'Allim Wal Arham";
      title = "Verifikasi Alamat Email Baru";
      message = "Anda sedang melakukan pembaruan alamat email. Masukkan kode OTP berikut untuk memverifikasi email ini:";
    }

    const htmlTemplate = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 540px; margin: 0 auto; padding: 24px; background-color: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0;">
        <div style="text-align: center; margin-bottom: 24px;">
          <div style="display: inline-block; background-color: #1B6B4A; color: white; padding: 10px 18px; border-radius: 8px; font-weight: 800; font-size: 16px; letter-spacing: 0.5px;">
            📖 Mu'Allim Attendance
          </div>
          <p style="color: #64748b; font-size: 12px; margin-top: 6px;">Yayasan Tahfidz Mu'Allim Wal Arham</p>
        </div>

        <div style="background-color: #ffffff; padding: 28px; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
          <h2 style="color: #0f172a; font-size: 18px; font-weight: 700; margin-top: 0; margin-bottom: 8px;">
            ${title}
          </h2>
          <p style="color: #475569; font-size: 13px; line-height: 1.5; margin-bottom: 20px;">
            Assalamu'alaikum <strong>${nama}</strong>,<br>
            ${message}
          </p>

          <div style="background-color: #f0fdf4; border: 2px dashed #86efac; border-radius: 8px; padding: 18px; text-align: center; margin: 24px 0;">
            <span style="font-size: 11px; font-weight: 600; color: #166534; text-transform: uppercase; letter-spacing: 1px; display: block; margin-bottom: 6px;">
              Kode Verifikasi OTP Anda
            </span>
            <div style="font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #1B6B4A; font-family: monospace;">
              ${otp}
            </div>
            <span style="font-size: 11px; color: #64748b; display: block; margin-top: 6px;">
              ⏰ Berlaku selama 5 menit
            </span>
          </div>

          <p style="color: #94a3b8; font-size: 11px; line-height: 1.5; margin-bottom: 0;">
            ⚠️ <em>Jangan berikan kode ini kepada siapapun termasuk pihak yayasan. Jika Anda tidak merasa meminta kode ini, abaikan email ini.</em>
          </p>
        </div>

        <div style="text-align: center; margin-top: 24px; color: #94a3b8; font-size: 11px;">
          <p style="margin: 0;">© 2026 MR Team - Sistem Informasi Manajemen Yayasan</p>
        </div>
      </div>
    `;

    // If SMTP credentials are provided, send actual email!
    if (smtpUser && smtpPass) {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465, // true for 465, false for other ports
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
        text: `Kode OTP Anda adalah: ${otp}. Berlaku selama 5 menit.`,
      });

      console.log(`[EMAIL SENT] OTP successfully delivered to ${email}`);
      return NextResponse.json({ success: true, mode: 'smtp', email });
    } else {
      // Dev/Simulated Mode (Credentials not yet configured in .env.local)
      console.log(`\n======================================================`);
      console.log(`📩 [SIMULATED EMAIL OTP]`);
      console.log(`To: ${email}`);
      console.log(`Type: ${type}`);
      console.log(`OTP Code: ${otp}`);
      console.log(`Tip: Configure SMTP_USER and SMTP_PASS in .env.local to send real emails.`);
      console.log(`======================================================\n`);

      return NextResponse.json({
        success: true,
        mode: 'simulated',
        email,
        otp,
        message: 'Email dikirim via mode simulasi (Konfigurasi SMTP di .env.local untuk pengiriman Gmail asli)'
      });
    }
  } catch (error: any) {
    console.error('[EMAIL ERROR] Failed to send OTP:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Gagal mengirim email OTP' },
      { status: 500 }
    );
  }
}
