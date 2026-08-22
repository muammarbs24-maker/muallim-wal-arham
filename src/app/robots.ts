import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/guru/', '/admin/dashboard', '/admin/guru', '/admin/absensi', '/admin/jadwal', '/admin/kegiatan', '/admin/performa', '/admin/laporan', '/admin/pengaturan'],
      },
    ],
    sitemap: 'https://muallim-wal-arham.vercel.app/sitemap.xml',
  };
}
