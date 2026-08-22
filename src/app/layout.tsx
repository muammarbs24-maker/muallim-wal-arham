import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://muallim-wal-arham.vercel.app'),
  title: {
    default: "SIPETA — Sistem Informasi Presensi Tenaga Ajar | Yayasan Tahfidz Mu'Allim Wal Arham Makassar",
    template: "%s | SIPETA Mu'Allim Wal Arham",
  },
  description:
    "SIPETA (Sistem Informasi Presensi Tenaga Ajar) adalah portal resmi presensi, pencatatan kehadiran, jadwal mengajar, dan monitoring kedisiplinan guru Yayasan Tahfidz Mu'Allim Wal Arham Makassar, Sulawesi Selatan.",
  keywords: [
    'SIPETA',
    'SIPETA Muallim',
    'SIPETA Yayasan Muallim Wal Arham',
    'Sistem Informasi Presensi Tenaga Ajar',
    'SIPETA Makassar',
    'Yayasan Tahfidz Muallim Wal Arham',
    'Muallim Wal Arham Makassar',
    'Absensi Guru Muallim',
    'Presensi Guru Makassar',
    'Absensi Tahfidz Makassar',
    'SIA Muallim',
    'Portal Guru Muallim Wal Arham',
    'Absensi Tenaga Ajar',
  ],
  authors: [{ name: "Yayasan Tahfidz Mu'Allim Wal Arham Makassar", url: "https://muallim-wal-arham.vercel.app" }],
  creator: "Yayasan Tahfidz Mu'Allim Wal Arham",
  publisher: "Yayasan Tahfidz Mu'Allim Wal Arham",
  applicationName: 'SIPETA (Sistem Informasi Presensi Tenaga Ajar)',
  category: 'education',
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    title: "SIPETA — Sistem Informasi Presensi Tenaga Ajar | Yayasan Tahfidz Mu'Allim Wal Arham",
    description:
      "Portal digital presensi dan monitoring kehadiran pengajar Yayasan Tahfidz Mu'Allim Wal Arham Makassar. Cepat, akurat, dan terintegrasi GPS.",
    url: 'https://muallim-wal-arham.vercel.app',
    siteName: "SIPETA Mu'Allim Wal Arham",
    images: [
      {
        url: '/logo.png',
        width: 800,
        height: 800,
        alt: "Logo Resmi SIPETA Yayasan Tahfidz Mu'Allim Wal Arham Makassar",
      },
    ],
    locale: 'id_ID',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: "SIPETA — Sistem Informasi Presensi Tenaga Ajar",
    description:
      "Portal absensi dan kedisiplinan guru Yayasan Tahfidz Mu'Allim Wal Arham Makassar.",
    images: ['/logo.png'],
  },
  other: {
    'geo.region': 'ID-SN',
    'geo.placename': 'Makassar, Sulawesi Selatan',
    'geo.position': '-5.147665;119.432732',
    'ICBM': '-5.147665, 119.432732',
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'EducationalOrganization',
  name: "Yayasan Tahfidz Mu'Allim Wal Arham",
  alternateName: ["SIPETA", "SIPETA Mu'Allim", "Sistem Informasi Presensi Tenaga Ajar"],
  url: 'https://muallim-wal-arham.vercel.app',
  logo: 'https://muallim-wal-arham.vercel.app/logo.png',
  description:
    "Portal Sistem Informasi Presensi Tenaga Ajar (SIPETA) pada Yayasan Tahfidz Mu'Allim Wal Arham Makassar.",
  address: {
    '@type': 'PostalAddress',
    addressLocality: 'Makassar',
    addressRegion: 'Sulawesi Selatan',
    addressCountry: 'ID',
  },
  hasOfferCatalog: {
    '@type': 'OfferCatalog',
    name: 'Layanan Pendidikan Tahfidz & Keagamaan',
  },
};

const softwareLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'SIPETA (Sistem Informasi Presensi Tenaga Ajar)',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'All (Web Browser)',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'IDR',
  },
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
        <link rel="icon" href="/logo.png" type="image/png" />
        <link rel="apple-touch-icon" href="/logo.png" />
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
          crossOrigin=""
        />
        {/* Structured Data / Rich Snippets for Google Search Engine (SEM/SEO) */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareLd) }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
