'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { TrendingUp, Star, ArrowUpRight, Calendar, Info } from 'lucide-react';
import { mockGuru, hitungSkorKedisiplinan, hitungPoinPartisipasi, loadPersistedData } from '@/lib/mockData';
import { getInitials } from '@/lib/utils';

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export default function AdminPerformaPage() {
  const [sortBy, setSortBy] = useState<'skor' | 'poin'>('skor');
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const namaBulan = MONTH_NAMES[currentMonth];

  useEffect(() => {
    loadPersistedData();
  }, []);

  const performaData = mockGuru
    .filter((g) => g.aktif)
    .map((g) => ({
      guru: g,
      skor: hitungSkorKedisiplinan(g.id, currentMonth + 1, currentYear),
      poin: hitungPoinPartisipasi(g.id, currentMonth + 1, currentYear),
    }))
    .sort((a, b) =>
      sortBy === 'skor' ? b.skor.skor - a.skor.skor : b.poin.poinTotal - a.poin.poinTotal
    );

  const gradeColor = (grade: string) =>
    grade === 'Sangat Baik' ? 'success' :
    grade === 'Baik' ? 'info' :
    grade === 'Cukup' ? 'warning' : 'danger';

  return (
    <div>
      <div className="admin-topbar">
        <div>
          <h1 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
            Performa Guru Bulan Ini
            <span className="badge badge-primary" style={{ fontSize: 11, fontWeight: 700 }}>
              <Calendar size={12} style={{ display: 'inline', marginRight: 3 }} /> {namaBulan} {currentYear}
            </span>
          </h1>
          <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>
            Evaluasi kedisiplinan dan partisipasi periode bulanan (Otomatis di-reset setiap awal bulan)
          </p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <button
            className={`btn btn-sm ${sortBy === 'skor' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setSortBy('skor')}
          >
            <TrendingUp size={14} /> Urutkan: Skor
          </button>
          <button
            className={`btn btn-sm ${sortBy === 'poin' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setSortBy('poin')}
          >
            <Star size={14} /> Urutkan: Poin
          </button>
        </div>
      </div>

      <div className="admin-content">
        {/* Top 3 Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
          {performaData.slice(0, 3).map((p, i) => (
            <div key={p.guru.id} className="card" style={{ position: 'relative', overflow: 'visible' }}>
              {i === 0 && (
                <div style={{
                  position: 'absolute', top: -10, right: 16,
                  background: 'var(--color-accent)', color: 'white',
                  padding: '2px 10px', borderRadius: 'var(--radius-full)',
                  fontSize: 11, fontWeight: 700,
                }}>
                  🏆 Terbaik
                </div>
              )}
              <div className="card-body" style={{ textAlign: 'center' }}>
                <div className="avatar avatar-lg" style={{ margin: '0 auto var(--space-3)' }}>{getInitials(p.guru.nama)}</div>
                <div style={{ fontWeight: 700, fontSize: 'var(--font-size-sm)', marginBottom: 4 }}>{p.guru.nama.split(',')[0]}</div>
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', marginBottom: 'var(--space-4)' }}>{p.guru.jabatan}</div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--space-4)' }}>
                  <div>
                    <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 800, color: `var(--color-${gradeColor(p.skor.grade)})` }}>{p.skor.skor}</div>
                    <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)' }}>Skor Disiplin</div>
                  </div>
                  <div style={{ width: 1, background: 'var(--color-border)' }} />
                  <div>
                    <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 800, color: 'var(--color-accent)' }}>{p.poin.poinTotal}</div>
                    <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)' }}>Poin</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Full Table */}
        <div className="card">
          <div className="card-header">
            <span style={{ fontWeight: 700 }}>Tabel Performa Lengkap</span>
          </div>
          <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
            <table className="table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Guru</th>
                  <th>Jabatan</th>
                  <th>Hadir Tepat Waktu</th>
                  <th>Terlambat</th>
                  <th>Izin</th>
                  <th>Alfa</th>
                  <th>Skor Disiplin</th>
                  <th>Poin Partisipasi</th>
                  <th>Detail</th>
                </tr>
              </thead>
              <tbody>
                {performaData.map((p, i) => (
                  <tr key={p.guru.id}>
                    <td style={{ fontWeight: 700, color: 'var(--color-text-tertiary)' }}>{i + 1}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                        <div className="avatar avatar-sm">{getInitials(p.guru.nama)}</div>
                        <span style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>{p.guru.nama.split(',')[0]}</span>
                      </div>
                    </td>
                    <td style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>{p.guru.jabatan}</td>
                    <td style={{ color: 'var(--color-success)', fontWeight: 700 }}>{p.skor.hadirTepatWaktu}</td>
                    <td style={{ color: 'var(--color-warning)', fontWeight: 700 }}>{p.skor.terlambat}</td>
                    <td style={{ color: 'var(--color-info)', fontWeight: 700 }}>{p.skor.izin}</td>
                    <td style={{ color: 'var(--color-danger)', fontWeight: 700 }}>{p.skor.alfa}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                        <span style={{ fontSize: 'var(--font-size-lg)', fontWeight: 800, color: `var(--color-${gradeColor(p.skor.grade)})` }}>{p.skor.skor}</span>
                        <span className={`badge badge-${gradeColor(p.skor.grade)}`} style={{ fontSize: 10 }}>{p.skor.grade}</span>
                      </div>
                    </td>
                    <td>
                      <span style={{ fontWeight: 800, color: 'var(--color-accent)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Star size={12} /> {p.poin.poinTotal}
                      </span>
                    </td>
                    <td>
                      <Link href={`/admin/guru/${p.guru.id}`} className="btn btn-secondary btn-sm">
                        <ArrowUpRight size={13} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
