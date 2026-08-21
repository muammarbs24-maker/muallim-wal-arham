import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: "Mu'Allim Attendance — Sistem Absensi Guru",
  description:
    "Sistem Absensi dan Monitoring Guru Yayasan Tahfidz Mu'Allim Wal Arham. Kelola kehadiran, jadwal, dan performa guru secara efisien.",
  keywords: ['absensi guru', 'tahfidz', 'muallim', 'attendance', 'yayasan'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <link rel="icon" href="/favicon.ico" />
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
          crossOrigin=""
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
