'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Star, ArrowUpRight, Calendar, DollarSign, Clock } from 'lucide-react';
import { mockGuru, hitungSkorKedisiplinan, hitungPoinPartisipasi, loadPersistedData, mockAbsensi, mockSettings } from '@/lib/mockData';
import { getInitials, formatRupiah, formatJamLengkap } from '@/lib/utils';
import { getGurusSupabase, getAbsensiSupabase, getAppSettingsSupabase } from '@/lib/supabaseClient';
import type { Guru, AbsensiRecord, AppSettings } from '@/types';

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export default function AdminPerformaPage() {
  const [guruList, setGuruList] = useState<Guru[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('muallim_guru_list');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch (e) {}
    }
    return mockGuru;
  });

  const [absensiList, setAbsensiList] = useState<AbsensiRecord[]>([]);
  const [appSettings, setAppSettings] = useState<AppSettings>(mockSettings);

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const namaBulan = MONTH_NAMES[currentMonth];

  useEffect(() => {
    loadPersistedData();
    setAbsensiList([...mockAbsensi]);

    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('muallim_guru_list');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setGuruList(parsed);
          }
        }
      } catch (e) {}
    }

    getGurusSupabase().then((gurus) => {
      if (gurus && gurus.length > 0) {
        setGuruList(gurus);
      }
    }).catch(() => {});

    getAbsensiSupabase().then((data) => {
      if (Array.isArray(data)) {
        setAbsensiList(data);
        mockAbsensi.length = 0;
        mockAbsensi.push(...data);
      }
    }).catch(() => {});

    getAppSettingsSupabase().then((s) => {
      if (s) {
        setAppSettings(s);
        Object.assign(mockSettings, s);
      }
    }).catch(() => {});
  }, []);

  const performaData = useMemo(() => {
    const list = guruList.length > 0 ? guruList : mockGuru;
    const yStr = String(currentYear);
    const mStr = String(currentMonth + 1).padStart(2, '0');
    const tarif = appSettings.tarifPerJam || 30000;

    return list
      .filter((g) => g.aktif)
      .map((g) => {
        const monthly = (absensiList.length > 0 ? absensiList : mockAbsensi).filter((a) => {
          const [y, m] = a.tanggal.split('-');
          return a.guruId === g.id && y === yStr && m === mStr && (a.status === 'hadir_tepat_waktu' || a.status === 'terlambat');
        });

        const totalJam = Number(
          monthly.reduce((sum, a) => {
            if (typeof a.jamDibayar === 'number') return sum + a.jamDibayar;
            if (typeof a.durasiMenit === 'number') return sum + Number((a.durasiMenit / 60).toFixed(2));
            return sum + 2;
          }, 0).toFixed(2)
        );

        const totalHonor = Math.round(totalJam * tarif);

        return {
          guru: g,
          skor: hitungSkorKedisiplinan(g.id, currentMonth + 1, currentYear),
          poin: hitungPoinPartisipasi(g.id, currentMonth + 1, currentYear),
          totalJam,
          totalHonor,
          sesiCount: monthly.length,
        };
      })
      .sort((a, b) => {
        if (a.skor.hasAttendance && !b.skor.hasAttendance) return -1;
        if (!a.skor.hasAttendance && b.skor.hasAttendance) return 1;
        if (b.skor.skor !== a.skor.skor) return b.skor.skor - a.skor.skor;
        return b.skor.hadirTepatWaktu - a.skor.hadirTepatWaktu;
      });
  }, [guruList, absensiList, appSettings, currentMonth, currentYear]);

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
            Evaluasi kedisiplinan, akumulasi jam mengajar, dan estimasi honor pengajar
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
                <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--space-2)', background: 'var(--color-surface-2)', padding: '10px 8px', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: 800, color: `var(--color-${gradeColor(p.skor.grade)})` }}>{p.skor.skor}</div>
                    <div style={{ fontSize: 9.5, color: 'var(--color-text-tertiary)', fontWeight: 600 }}>Disiplin</div>
                  </div>
                  <div style={{ width: 1, background: 'var(--color-border)' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: 800, color: 'var(--color-primary)' }}>{p.totalJam}j</div>
                    <div style={{ fontSize: 9.5, color: 'var(--color-text-tertiary)', fontWeight: 600 }}>Jam</div>
                  </div>
                  <div style={{ width: 1, background: 'var(--color-border)' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: '#15803D', lineHeight: 1.6 }}>{formatRupiah(p.totalHonor)}</div>
                    <div style={{ fontSize: 9.5, color: 'var(--color-text-tertiary)', fontWeight: 600 }}>Honor</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Full Table */}
        <div className="card">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 700 }}>Tabel Performa &amp; Honor Guru ({namaBulan} {currentYear})</span>
            <span className="badge badge-success" style={{ fontWeight: 800 }}>
              Tarif: {formatRupiah(appSettings.tarifPerJam || 30000)}/jam
            </span>
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
                  <th style={{ textAlign: 'right' }}>Jam Mengajar</th>
                  <th style={{ textAlign: 'right' }}>Estimasi Honor</th>
                  <th>Skor Disiplin</th>
                  <th>Poin</th>
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
                    <td style={{ color: 'var(--color-success)', fontWeight: 700 }}>{p.skor.hadirTepatWaktu} sesi</td>
                    <td style={{ color: 'var(--color-warning)', fontWeight: 700 }}>{p.skor.terlambat > 0 ? `${p.skor.terlambat}x` : '—'}</td>
                    <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--color-primary)', fontSize: '12.5px' }}>
                      {formatJamLengkap(p.totalJam)}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 800, color: '#15803D' }}>
                      {formatRupiah(p.totalHonor)}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                        <span style={{ fontSize: 'var(--font-size-base)', fontWeight: 800, color: `var(--color-${gradeColor(p.skor.grade)})` }}>{p.skor.skor}</span>
                        <span className={`badge badge-${gradeColor(p.skor.grade)}`} style={{ fontSize: 10 }}>{p.skor.grade}</span>
                      </div>
                    </td>
                    <td>
                      <span style={{ fontWeight: 800, color: 'var(--color-accent)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Star size={12} /> {p.poin.poinTotal}
                      </span>
                    </td>
                    <td>
                      <Link href={`/admin/laporan?tab=rekap&guruId=${encodeURIComponent(p.guru.id)}`} className="btn btn-secondary btn-sm" title="Lihat Rekapitulasi & Honor Guru">
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
