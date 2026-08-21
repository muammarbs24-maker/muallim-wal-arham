'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Star, ArrowUpRight, Calendar } from 'lucide-react';
import { mockGuru, hitungSkorKedisiplinan, hitungPoinPartisipasi, loadPersistedData } from '@/lib/mockData';
import { getInitials } from '@/lib/utils';

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export default function AdminPerformaPage() {
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
    .sort((a, b) => b.skor.skor - a.skor.skor);

  const gradeColor = (grade: string) =>
    grade === 'Sangat Baik' ? 'success' :
    grade === 'Baik' ? 'info' :
    grade === 'Cukup' ? 'warning' : 'danger';

  return (
    <div>
      <div className="admin-topbar">
        <div>
          <h1 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            Performa Guru
            <span className="badge badge-primary" style={{ fontSize: 11, fontWeight: 700 }}>
              <Calendar size={12} style={{ display: 'inline', marginRight: 3 }} /> {namaBulan} {currentYear}
            </span>
          </h1>
          <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>
            Evaluasi kedisiplinan dan poin partisipasi guru
          </p>
        </div>
      </div>

      <div className="admin-content">
        {/* Top 3 Cards */}
        <div className="admin-grid-3">
          {performaData.slice(0, 3).map((p, i) => (
            <div key={p.guru.id} className="card" style={{ position: 'relative', overflow: 'visible', padding: '16px 14px' }}>
              {i === 0 && (
                <div style={{
                  position: 'absolute', top: -10, right: 14,
                  background: 'var(--color-accent)', color: 'white',
                  padding: '2px 10px', borderRadius: 'var(--radius-full)',
                  fontSize: 10, fontWeight: 800, boxShadow: '0 2px 6px rgba(245,158,11,0.4)',
                }}>
                  🏆 Peringkat 1
                </div>
              )}
              <div className="card-body" style={{ textAlign: 'center', padding: 0 }}>
                <div className="avatar avatar-lg" style={{ margin: '0 auto var(--space-2)', width: 44, height: 44, fontSize: 16 }}>{getInitials(p.guru.nama)}</div>
                <div style={{ fontWeight: 800, fontSize: 'var(--font-size-sm)', marginBottom: 2 }}>{p.guru.nama.split(',')[0]}</div>
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', marginBottom: 'var(--space-3)' }}>{p.guru.jabatan}</div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--space-4)', background: 'var(--color-surface-2)', padding: '10px 12px', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 'var(--font-size-xl)', fontWeight: 800, color: `var(--color-${gradeColor(p.skor.grade)})` }}>{p.skor.skor}</div>
                    <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)', fontWeight: 600 }}>Skor Disiplin</div>
                  </div>
                  <div style={{ width: 1, background: 'var(--color-border)' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 'var(--font-size-xl)', fontWeight: 800, color: 'var(--color-accent)' }}>{p.poin.poinTotal}</div>
                    <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)', fontWeight: 600 }}>Poin</div>
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
