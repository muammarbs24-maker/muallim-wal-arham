import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://hymwqulohlxeyjhvamky.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_vnVsFvRLJalZgb76SgB7wA_yW94xuny';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const DAYS = ['Ahad', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

function timeToMinutes(t: string): number {
  if (!t) return 0;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function subtractMinutes(timeStr: string, mins: number): string {
  const total = timeToMinutes(timeStr) - mins;
  const safe = ((total % 1440) + 1440) % 1440;
  const hh = String(Math.floor(safe / 60)).padStart(2, '0');
  const mm = String(safe % 60).padStart(2, '0');
  return `${hh}:${mm}`;
}

export async function GET(request: Request) {
  try {
    const now = new Date();
    // Waktu WITA (UTC+8)
    const wita = new Date(now.getTime() + 8 * 60 * 60 * 1000);
    const dayName = DAYS[wita.getUTCDay()];
    const currentHours = String(wita.getUTCHours()).padStart(2, '0');
    const currentMins = String(wita.getUTCMinutes()).padStart(2, '0');
    const currentTimeStr = `${currentHours}:${currentMins}`;
    const currentTotalMinutes = timeToMinutes(currentTimeStr);

    const year = wita.getUTCFullYear();
    const month = String(wita.getUTCMonth() + 1).padStart(2, '0');
    const date = String(wita.getUTCDate()).padStart(2, '0');
    const todayStr = `${year}-${month}-${date}`;

    // 1. Ambil Settings (Lead Minutes)
    let leadMinutes = 30;
    try {
      const { data: setRow } = await supabase.from('app_settings').select('*').limit(1).single();
      if (setRow?.waktu_buka_sebelum_jadwal) {
        leadMinutes = Number(setRow.waktu_buka_sebelum_jadwal);
      }
    } catch (e) {}

    // 2. Ambil Sesi & Matrix Jadwal Hari Ini
    const { data: sesiRows } = await supabase.from('sesi_configs').select('*');
    const { data: matrixRows } = await supabase.from('jadwal_matrix').select('*').eq('hari', dayName);
    const { data: guruRows } = await supabase.from('gurus').select('*');

    if (!matrixRows || matrixRows.length === 0 || !guruRows) {
      return NextResponse.json({ success: true, message: 'Tidak ada jadwal mengajar pada hari ini', dayName });
    }

    const sesiMap: Record<string, any> = {};
    if (sesiRows) {
      sesiRows.forEach((s) => {
        sesiMap[s.id] = s;
      });
    }

    const guruMap: Record<string, any> = {};
    guruRows.forEach((g) => {
      guruMap[g.id] = g;
    });

    // 3. Cek Absensi Hari Ini yang sudah Masuk
    const { data: todayAbsensi } = await supabase.from('absensi_records').select('*').eq('tanggal', todayStr);
    const attendedSet = new Set<string>();
    if (todayAbsensi) {
      todayAbsensi.forEach((a) => {
        if (a.guru_id && a.jam_masuk) {
          attendedSet.add(`${a.guru_id}_${a.sesi_id || a.jadwal_id || ''}`);
        }
      });
    }

    const emailsSent: any[] = [];
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://muallim-wal-arham.vercel.app';
    const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
    const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const emailFrom = process.env.EMAIL_FROM || `"Yayasan Mu'Allim Wal Arham" <${smtpUser || 'noreply@muallim.sch.id'}>`;

    const transporter = (smtpUser && smtpPass) ? nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: { user: smtpUser, pass: smtpPass },
    }) : null;

    // 4. Periksa apakah ada sesi yang baru terbuka saat ini
    for (const entry of matrixRows) {
      const sesi = sesiMap[entry.sesi_id];
      if (!sesi) continue;

      const jamMulaiMins = timeToMinutes(sesi.jam_mulai);
      const jamSelesaiMins = timeToMinutes(sesi.jam_selesai);
      const windowOpenMins = jamMulaiMins - leadMinutes;

      // Jendela Buka: currentTotalMinutes >= windowOpenMins && currentTotalMinutes <= jamSelesaiMins
      const isWindowOpen = currentTotalMinutes >= windowOpenMins && currentTotalMinutes <= jamSelesaiMins;
      if (!isWindowOpen) continue;

      const guruIds = Array.isArray(entry.guru_ids) ? entry.guru_ids : [];
      for (const gid of guruIds) {
        const guru = guruMap[gid];
        if (!guru || !guru.email) continue;

        // Cek apakah guru ini sudah absen masuk untuk sesi ini
        const alreadyAttended = attendedSet.has(`${gid}_${entry.sesi_id}`) || attendedSet.has(`${gid}_${entry.id}`);
        if (alreadyAttended) continue;

        // Cek log pengiriman notifikasi agar tidak terkirim ganda
        const notifKey = `notif_open_${todayStr}_${entry.sesi_id}_${gid}`;
        const { data: existingNotif } = await supabase
          .from('notifications')
          .select('id')
          .eq('user_id', gid)
          .eq('judul', notifKey)
          .limit(1);

        if (existingNotif && existingNotif.length > 0) {
          // Sudah pernah dikirimi email notifikasi hari ini untuk sesi ini
          continue;
        }

        // Catat ke tabel notifications Supabase agar tidak dikirim ulang
        try {
          await supabase.from('notifications').insert({
            user_id: gid,
            judul: notifKey,
            pesan: `Presensi sesi ${sesi.nama} (${sesi.jam_mulai} WITA) telah dibuka.`,
            tipe: 'info',
            dibaca: false,
          });
        } catch (e) {}

        const waktuBukaStr = subtractMinutes(sesi.jam_mulai, leadMinutes);
        const subject = `⏰ Presensi Mengajar Dibuka: ${sesi.nama} (${sesi.jam_mulai} WITA) — Yayasan Tahfidz Mu'Allim Wal Arham`;

        const htmlTemplate = `<!DOCTYPE html>
<html lang="id">
<head><meta charset="UTF-8"><title>Presensi Mengajar Dibuka</title></head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="padding: 28px 14px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;">
          <tr>
            <td style="background: linear-gradient(135deg, #1B6B4A 0%, #14532D 100%); padding: 30px 24px; text-align: center;">
              <div style="display: inline-block; background-color: rgba(255,255,255,0.2); border-radius: 12px; padding: 5px 14px; margin-bottom: 10px;">
                <span style="color: #ffffff; font-size: 13px; font-weight: 800;">📖 Mu'Allim Attendance System</span>
              </div>
              <h1 style="color: #ffffff; font-size: 20px; font-weight: 800; margin: 0 0 4px;">Pemberitahuan Presensi Dibuka</h1>
              <p style="color: #bbf7d0; font-size: 13px; margin: 0;">Yayasan Tahfidz Mu'Allim Wal Arham</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px 26px;">
              <p style="color: #0f172a; font-size: 15px; font-weight: 700; margin: 0 0 10px;">Assalamu'alaikum Warahmatullahi Wabarakatuh,</p>
              <p style="color: #334155; font-size: 13.5px; line-height: 1.6; margin: 0 0 20px;">
                Yth. <strong>${guru.nama}</strong>, jendela presensi absensi mengajar untuk sesi <strong>${sesi.nama}</strong> telah resmi dibuka sejak pukul <strong>${waktuBukaStr} WITA</strong>.
              </p>
              <div style="background-color: #f0fdf4; border: 1.5px solid #86efac; border-radius: 12px; padding: 18px; margin-bottom: 24px;">
                <div style="font-size: 11px; color: #15803d; font-weight: 700; text-transform: uppercase;">Sesi Mengajar Aktif</div>
                <div style="font-size: 18px; font-weight: 800; color: #166534; margin: 4px 0;">${sesi.nama} (${sesi.deskripsi || 'Sesi Yayasan'})</div>
                <div style="font-size: 13px; color: #0f172a; font-weight: 700; margin-top: 8px;">⏰ Jam: ${sesi.jam_mulai} – ${sesi.jam_selesai} WITA</div>
              </div>
              <div style="text-align: center; margin-bottom: 20px;">
                <a href="${appUrl}/guru/beranda" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #1B6B4A 0%, #15803D 100%); color: #ffffff; font-size: 14px; font-weight: 800; text-decoration: none; padding: 14px 30px; border-radius: 10px; box-shadow: 0 4px 14px rgba(27, 107, 74, 0.35);">
                  📍 Buka Aplikasi &amp; Lakukan Presensi
                </a>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

        if (transporter) {
          try {
            await transporter.sendMail({
              from: emailFrom,
              to: guru.email,
              subject,
              html: htmlTemplate,
            });
            emailsSent.push({ guru: guru.nama, email: guru.email, sesi: sesi.nama });
          } catch (err) {
            console.error('Failed to send mail to', guru.email, err);
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      dayName,
      currentTime: currentTimeStr,
      emailsSentCount: emailsSent.length,
      emailsSent,
    });
  } catch (error: any) {
    console.error('Error in check-opened-sessions cron:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Error checking opened sessions' },
      { status: 500 }
    );
  }
}
