'use client';

import { useState, useEffect } from 'react';
import {
  Clock, MapPin, Search, ChevronDown, ArrowRightLeft, Check, X,
  AlertCircle, CheckCircle2, User, Calendar, Info, RefreshCw, Sun, Sunset, Moon
} from 'lucide-react';
import {
  currentGuru, mockJadwal, mockJadwalMatrix, mockGuru, mockSesiList,
  mockTukarJadwalRequests, createTukarJadwalRequest, respondTukarJadwalRequest,
  syncMatrixToJadwal, loadPersistedData, savePersistedJadwalMatrix, mockSettings
} from '@/lib/mockData';
import type { DayOfWeek, Jadwal, JadwalSesiEntry, SesiConfig, SesiType, TukarJadwalRequest, Guru, AppSettings } from '@/types';
import { getInitials } from '@/lib/utils';

const DAYS: DayOfWeek[] = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Ahad'];

const SESI_ICONS: Record<string, React.ReactNode> = {
  pagi: <Sun size={14} color="#059669" />,
  siang: <Clock size={14} color="#D97706" />,
  sore: <Sunset size={14} color="#0284C7" />,
  tahfidz: <Moon size={14} color="#7C3AED" />,
};

export default function JadwalPage() {
  const [activeTab, setActiveTab] = useState<'saya' | 'keseluruhan' | 'tukar'>('saya');
  const [schedulesList, setSchedulesList] = useState<Jadwal[]>([]);
  const [matrixList, setMatrixList] = useState<JadwalSesiEntry[]>([]);
  const [sesiList, setSesiList] = useState<SesiConfig[]>([]);
  const [teachersList, setTeachersList] = useState<Guru[]>([]);
  const [activeGuru, setActiveGuru] = useState<Guru>(currentGuru);
  const [appSettings, setAppSettings] = useState<AppSettings>(mockSettings);
  const [swapRequests, setSwapRequests] = useState<TukarJadwalRequest[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modal Request Tukar Jadwal State
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [selectedMySlot, setSelectedMySlot] = useState<{ hari: DayOfWeek; sesiId: SesiType; sesiNama: string } | null>(null);
  const [selectedTargetSlot, setSelectedTargetSlot] = useState<{ guruId: string; guruNama: string; hari: DayOfWeek; sesiId: SesiType; sesiNama: string } | null>(null);
  const [swapCatatan, setSwapCatatan] = useState('');
  const [isSubmittingSwap, setIsSubmittingSwap] = useState(false);

  // Modal Penolakan Tukar Jadwal State
  const [rejectModalData, setRejectModalData] = useState<{ id: string; requesterNama: string; sesiInfo: string } | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isProcessingReject, setIsProcessingReject] = useState(false);

  const refreshData = () => {
    loadPersistedData();
    syncMatrixToJadwal();
    setSchedulesList([...mockJadwal]);
    setMatrixList([...mockJadwalMatrix]);
    setSesiList([...mockSesiList]);
    setSwapRequests([...mockTukarJadwalRequests]);
  };

  useEffect(() => {
    refreshData();
    let currentActive = currentGuru;
    if (typeof window !== 'undefined') {
      const savedUser = localStorage.getItem('muallim_guru_user');
      const savedId = localStorage.getItem('logged_in_guru_id');
      if (savedUser) {
        try {
          const parsed = JSON.parse(savedUser);
          if (parsed && parsed.id) {
            currentActive = parsed;
            setActiveGuru(parsed);
          }
        } catch (e) {}
      } else if (savedId) {
        const found = mockGuru.find((g) => g.id === savedId);
        if (found) {
          currentActive = found;
          setActiveGuru(found);
        }
      }

      // Check ?tab=tukar in URL
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('tab') === 'tukar') {
        setActiveTab('tukar');
      }
    }

    import('@/lib/supabaseClient').then(({ getJadwalMatrixSupabase, getSesiListSupabase, getAppSettingsSupabase, getTukarJadwalRequestsSupabase, getGurusSupabase }) => {
      getGurusSupabase().then((gurus) => {
        if (Array.isArray(gurus) && gurus.length > 0) {
          mockGuru.length = 0;
          mockGuru.push(...gurus);
          setTeachersList([...gurus]);
          const savedId = typeof window !== 'undefined' ? localStorage.getItem('logged_in_guru_id') : null;
          if (savedId) {
            const f = gurus.find((g) => g.id === savedId);
            if (f) setActiveGuru(f);
          }
        }
      }).catch(() => {});

      getSesiListSupabase().then((sessions) => {
        if (sessions && sessions.length > 0) {
          mockSesiList.length = 0;
          mockSesiList.push(...sessions);
          setSesiList([...sessions]);
          syncMatrixToJadwal();
          setSchedulesList([...mockJadwal]);
        }
      }).catch(() => {});

      getJadwalMatrixSupabase().then((matrix) => {
        if (matrix !== null && matrix !== undefined) {
          mockJadwalMatrix.length = 0;
          mockJadwalMatrix.push(...matrix);
          syncMatrixToJadwal();
          setMatrixList([...mockJadwalMatrix]);
          setSchedulesList([...mockJadwal]);
        }
      }).catch(() => {});

      const loadSwaps = async () => {
        try {
          let reqs = await getTukarJadwalRequestsSupabase();
          if (!reqs || reqs.length === 0) {
            const res = await fetch('/api/tukar-jadwal').catch(() => null);
            if (res && res.ok) {
              const data = await res.json();
              if (data.requests) reqs = data.requests;
            }
          }
          if (Array.isArray(reqs)) {
            mockTukarJadwalRequests.length = 0;
            mockTukarJadwalRequests.push(...reqs);
            setSwapRequests([...reqs]);
          }
        } catch (e) {}
      };
      loadSwaps();

      getAppSettingsSupabase().then((settings) => {
        if (settings) {
          setAppSettings(settings);
          Object.assign(mockSettings, settings);
        }
      }).catch(() => {});
    }).catch(() => {});
  }, []);

  const mySchedules = schedulesList.filter((j) => (j.guruId === activeGuru.id || j.guruNama === activeGuru.nama || (activeGuru.nama && j.guruNama.toLowerCase() === activeGuru.nama.toLowerCase())) && j.aktif);

  // Pending incoming requests targeted to current teacher
  const incomingPendingRequests = swapRequests.filter((r) => {
    const currentId = activeGuru?.id || '';
    const currentName = (activeGuru?.nama || '').toLowerCase().trim();
    const targetId = r.targetGuruId || '';
    const targetName = (r.targetGuruNama || '').toLowerCase().trim();

    const isTarget =
      (currentId && targetId && currentId === targetId) ||
      (currentName && targetName && (currentName.includes(targetName) || targetName.includes(currentName)));

    return isTarget && (r.status === 'pending' || (r.status as string) === 'menunggu');
  });

  // Outgoing requests made by current teacher
  const outgoingRequests = swapRequests.filter((r) => {
    const currentId = activeGuru?.id || '';
    const currentName = (activeGuru?.nama || '').toLowerCase().trim();
    const reqId = r.requesterGuruId || '';
    const reqName = (r.requesterGuruNama || '').toLowerCase().trim();

    return (
      (currentId && reqId && currentId === reqId) ||
      (currentName && reqName && (currentName.includes(reqName) || reqName.includes(currentName)))
    );
  });

  const handleOpenSwapModal = (mySlotPreset?: { hari: DayOfWeek; sesiId: SesiType; sesiNama: string }) => {
    if (mySlotPreset) {
      setSelectedMySlot(mySlotPreset);
    } else if (mySchedules.length > 0) {
      const first = mySchedules[0];
      const sesi = sesiList.find((s) => s.id === first.sesiId);
      setSelectedMySlot({
        hari: first.hari,
        sesiId: first.sesiId || 'pagi',
        sesiNama: sesi ? sesi.nama : first.mataPelajaran,
      });
    } else {
      setSelectedMySlot(null);
    }
    setShowSwapModal(true);
  };

  const handleSendSwapRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMySlot || !selectedTargetSlot) {
      alert('Silakan pilih jadwal Anda dan jadwal guru yang ingin ditukar.');
      return;
    }

    setIsSubmittingSwap(true);
    try {
      const { getTukarJadwalRequestsSupabase, saveTukarJadwalRequestsSupabase } = await import('@/lib/supabaseClient');
      const existing = await getTukarJadwalRequestsSupabase();

      const newReq: TukarJadwalRequest = {
        id: `swap-${Date.now()}`,
        requesterGuruId: activeGuru.id,
        requesterGuruNama: activeGuru.nama,
        requesterHari: selectedMySlot.hari,
        requesterSesiId: selectedMySlot.sesiId,
        requesterSesiNama: selectedMySlot.sesiNama,

        targetGuruId: selectedTargetSlot.guruId,
        targetGuruNama: selectedTargetSlot.guruNama,
        targetHari: selectedTargetSlot.hari,
        targetSesiId: selectedTargetSlot.sesiId,
        targetSesiNama: selectedTargetSlot.sesiNama,

        catatan: swapCatatan.trim(),
        status: 'pending',
        dibuatPada: new Date().toISOString(),
      };

      const updatedList = [newReq, ...existing.filter((r) => r.id !== newReq.id)];
      mockTukarJadwalRequests.length = 0;
      mockTukarJadwalRequests.push(...updatedList);
      await saveTukarJadwalRequestsSupabase(updatedList);

      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('muallim_tukar_jadwal_requests', JSON.stringify(updatedList));
        } catch (err) {}
      }

      setIsSubmittingSwap(false);
      setShowSwapModal(false);
      setSwapCatatan('');
      setSelectedTargetSlot(null);
      setSwapRequests([...updatedList]);
      setToastMessage(`✓ Permintaan tukar jadwal berhasil dikirim ke ${newReq.targetGuruNama}! Menunggu persetujuan.`);
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err) {
      console.error('Error in handleSendSwapRequest:', err);
      setIsSubmittingSwap(false);
    }
  };

  const handleInitiateRespondSwap = async (req: TukarJadwalRequest, accept: boolean) => {
    if (accept) {
      try {
        const { getTukarJadwalRequestsSupabase, saveTukarJadwalRequestsSupabase, saveJadwalMatrixSupabase } = await import('@/lib/supabaseClient');
        const latestReqs = await getTukarJadwalRequestsSupabase();
        const target = latestReqs.find((r) => r.id === req.id) || req;
        target.status = 'disetujui';
        target.diresponPada = new Date().toISOString();

        respondTukarJadwalRequest(req.id, true);
        await saveJadwalMatrixSupabase(mockJadwalMatrix);
        const finalReqs = latestReqs.length > 0 ? latestReqs : mockTukarJadwalRequests;
        await saveTukarJadwalRequestsSupabase(finalReqs);

        setSwapRequests([...finalReqs]);
        refreshData();
        setToastMessage('✓ Penukaran jadwal disetujui! Matriks jadwal telah diperbarui otomatis.');
        setTimeout(() => setToastMessage(null), 4000);
      } catch (err) {
        console.error('Error in handleInitiateRespondSwap accept:', err);
      }
    } else {
      // Buka modal alasan penolakan
      setRejectModalData({
        id: req.id,
        requesterNama: req.requesterGuruNama,
        sesiInfo: `${req.requesterHari} (${req.requesterSesiNama}) ⇄ ${req.targetHari} (${req.targetSesiNama})`,
      });
      setRejectionReason('');
    }
  };

  const handleConfirmReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectModalData) return;
    if (!rejectionReason.trim()) {
      alert('Mohon tuliskan alasan penolakan.');
      return;
    }

    setIsProcessingReject(true);
    try {
      const { getTukarJadwalRequestsSupabase, saveTukarJadwalRequestsSupabase } = await import('@/lib/supabaseClient');
      const latestReqs = await getTukarJadwalRequestsSupabase();
      const target = latestReqs.find((r) => r.id === rejectModalData.id);
      if (target) {
        target.status = 'ditolak';
        target.alasanPenolakan = rejectionReason.trim();
        target.diresponPada = new Date().toISOString();
      }
      respondTukarJadwalRequest(rejectModalData.id, false, rejectionReason.trim());
      const finalReqs = latestReqs.length > 0 ? latestReqs : mockTukarJadwalRequests;
      await saveTukarJadwalRequestsSupabase(finalReqs);

      setSwapRequests([...finalReqs]);
      refreshData();
      setIsProcessingReject(false);
      setRejectModalData(null);
      setRejectionReason('');
      setToastMessage('✓ Permintaan tukar jadwal telah ditolak dengan alasan yang tercatat.');
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err) {
      console.error('Error in handleConfirmReject:', err);
      setIsProcessingReject(false);
    }
  };

  return (
    <>
      {/* Toast */}
      {toastMessage && (
        <div className="toast-container" style={{ position: 'fixed', top: 80, bottom: 'auto', left: '50%', transform: 'translateX(-50%)', zIndex: 9999 }}>
          <div className="toast toast-success">{toastMessage}</div>
        </div>
      )}

      {/* Header */}
      <div className="page-header">
        <h1 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 800 }}>Jadwal Mengajar</h1>
        <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', marginTop: 2 }}>
          Yayasan Tahfidz Mu&apos;Allim Wal Arham
        </p>

        {/* Horizontal Capsule Pills (Hanya geser samping, tidak geser atas bawah) */}
        <div style={{
          display: 'flex',
          gap: 8,
          marginTop: 'var(--space-3)',
          overflowX: 'auto',
          overflowY: 'hidden',
          whiteSpace: 'nowrap',
          paddingBottom: 4,
          scrollbarWidth: 'none',
          WebkitOverflowScrolling: 'touch',
        }}>
          <button
            type="button"
            onClick={() => setActiveTab('saya')}
            style={{
              padding: '6px 14px',
              borderRadius: 9999,
              fontSize: 12,
              fontWeight: 700,
              border: activeTab === 'saya' ? '1.5px solid var(--color-primary)' : '1px solid var(--color-border)',
              background: activeTab === 'saya' ? 'var(--color-primary)' : 'var(--color-surface)',
              color: activeTab === 'saya' ? '#ffffff' : 'var(--color-text-secondary)',
              cursor: 'pointer',
              flexShrink: 0,
              transition: 'all 0.15s ease',
            }}
          >
            Jadwal Saya
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('keseluruhan')}
            style={{
              padding: '6px 14px',
              borderRadius: 9999,
              fontSize: 12,
              fontWeight: 700,
              border: activeTab === 'keseluruhan' ? '1.5px solid var(--color-primary)' : '1px solid var(--color-border)',
              background: activeTab === 'keseluruhan' ? 'var(--color-primary)' : 'var(--color-surface)',
              color: activeTab === 'keseluruhan' ? '#ffffff' : 'var(--color-text-secondary)',
              cursor: 'pointer',
              flexShrink: 0,
              transition: 'all 0.15s ease',
            }}
          >
            Matriks Jadwal Keseluruhan
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('tukar')}
            style={{
              padding: '6px 14px',
              borderRadius: 9999,
              fontSize: 12,
              fontWeight: 700,
              border: activeTab === 'tukar' ? '1.5px solid var(--color-primary)' : '1px solid var(--color-border)',
              background: activeTab === 'tukar' ? 'var(--color-primary)' : 'var(--color-surface)',
              color: activeTab === 'tukar' ? '#ffffff' : 'var(--color-text-secondary)',
              cursor: 'pointer',
              flexShrink: 0,
              transition: 'all 0.15s ease',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            Permintaan Tukar
            {incomingPendingRequests.length > 0 && (
              <span style={{
                background: activeTab === 'tukar' ? '#ffffff' : '#DC2626',
                color: activeTab === 'tukar' ? '#DC2626' : '#ffffff',
                padding: '1px 6px',
                borderRadius: 9999,
                fontSize: 10,
                fontWeight: 800,
              }}>
                {incomingPendingRequests.length}
              </span>
            )}
          </button>
        </div>
      </div>

      <div style={{ padding: 'var(--space-4)' }}>
        
        {/* INCOMING PENDING REQUESTS ALERT BANNER */}
        {incomingPendingRequests.length > 0 && activeTab !== 'tukar' && (
          <div style={{
            padding: '12px 16px',
            background: '#FEF3C7',
            border: '1.5px solid #F59E0B',
            borderRadius: 'var(--radius-lg)',
            marginBottom: 'var(--space-4)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 'var(--space-3)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <AlertCircle size={20} color="#D97706" style={{ flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#92400E' }}>
                  Ada {incomingPendingRequests.length} Permintaan Tukar Jadwal Masuk!
                </div>
                <div style={{ fontSize: 11.5, color: '#B45309' }}>
                  {incomingPendingRequests[0].requesterGuruNama} ingin bertukar jadwal dengan Anda.
                </div>
              </div>
            </div>
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => setActiveTab('tukar')}
              style={{ background: '#D97706', color: '#ffffff', fontWeight: 700, fontSize: 12, padding: '5px 12px' }}
            >
              Lihat Permintaan
            </button>
          </div>
        )}

        {/* TAB 1: JADWAL SAYA */}
        {activeTab === 'saya' && (
          <JadwalSaya
            schedules={mySchedules}
            lokasiNama={appSettings.lokasiNama}
            onSwapSlot={(slot) => handleOpenSwapModal(slot)}
          />
        )}

        {/* TAB 2: MATRIKS JADWAL KESELURUHAN (GRID TANPA FILTER) */}
        {activeTab === 'keseluruhan' && (
          <MatriksJadwalKeseluruhan
            matrix={matrixList}
            sesiList={sesiList}
            activeGuruId={activeGuru.id}
            onSelectSlotToSwap={(target) => {
              setSelectedTargetSlot(target);
              handleOpenSwapModal();
            }}
          />
        )}

        {/* TAB 3: PERMINTAAN TUKAR JADWAL */}
        {activeTab === 'tukar' && (
          <TukarJadwalManagement
            incoming={incomingPendingRequests}
            outgoing={outgoingRequests}
            onRespond={handleInitiateRespondSwap}
            onOpenModal={() => handleOpenSwapModal()}
          />
        )}

      </div>

      {/* MODAL ALASAN PENOLAKAN TUKAR JADWAL */}
      {rejectModalData && (
        <div className="modal-overlay" onClick={() => setRejectModalData(null)}>
          <div className="modal" style={{ maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 800, color: '#B91C1C', display: 'flex', alignItems: 'center', gap: 8 }}>
                <X size={18} /> Tolak Permintaan Tukar Jadwal
              </h3>
            </div>
            <form onSubmit={handleConfirmReject}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.5 }}>
                  Anda akan menolak permintaan tukar jadwal dari <strong>{rejectModalData.requesterNama}</strong> ({rejectModalData.sesiInfo}).
                </p>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontWeight: 700, fontSize: 12 }}>
                    Masukkan Alasan Penolakan *
                  </label>
                  <textarea
                    className="form-input"
                    rows={3}
                    placeholder="cth: Mohon maaf di waktu tersebut saya ada agenda mengajar di tempat lain..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    required
                    style={{ resize: 'vertical', fontSize: 13 }}
                  />
                </div>
              </div>
              <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setRejectModalData(null)}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn btn-danger btn-sm"
                  disabled={isProcessingReject || !rejectionReason.trim()}
                  style={{ background: '#DC2626', color: '#ffffff', fontWeight: 700 }}
                >
                  {isProcessingReject ? 'Menyimpan...' : 'Kirim Penolakan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL REQUEST TUKAR JADWAL */}
      {showSwapModal && (
        <div className="modal-overlay" onClick={() => setShowSwapModal(false)}>
          <div className="modal" style={{ maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
                <ArrowRightLeft size={18} color="var(--color-primary)" /> Ajukan Tukar Jadwal Mengajar
              </h3>
            </div>
            
            <form onSubmit={handleSendSwapRequest}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                
                {/* Step 1: Pilih Jadwal Milik Saya */}
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 18, height: 18, borderRadius: '50%', background: 'var(--color-primary)', color: 'white', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 }}>1</span>
                    Pilih Jadwal Mengajar Anda yang Ingin Diganti:
                  </label>
                  
                  {mySchedules.length === 0 ? (
                    <div style={{ padding: 10, background: 'var(--color-surface-2)', borderRadius: 'var(--radius-md)', fontSize: 12, color: 'var(--color-text-tertiary)' }}>
                      Anda belum memiliki jadwal mengajar aktif untuk ditukarkan.
                    </div>
                  ) : (
                    <select
                      className="form-select"
                      value={selectedMySlot ? `${selectedMySlot.hari}::${selectedMySlot.sesiId}` : ''}
                      onChange={(e) => {
                        const [hari, sesiId] = e.target.value.split('::');
                        const sesi = sesiList.find((s) => s.id === sesiId);
                        setSelectedMySlot({
                          hari: hari as DayOfWeek,
                          sesiId,
                          sesiNama: sesi ? sesi.nama : sesiId,
                        });
                      }}
                      required
                    >
                      {mySchedules.map((j) => (
                        <option key={j.id} value={`${j.hari}::${j.sesiId || 'pagi'}`}>
                          {j.hari} — {j.mataPelajaran} ({j.jamMulai}–{j.jamSelesai})
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Step 2: Pilih Jadwal Guru Target */}
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 18, height: 18, borderRadius: '50%', background: 'var(--color-accent)', color: 'white', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 }}>2</span>
                    Pilih Jadwal Guru yang Ingin Diajak Bertukar:
                  </label>

                  <select
                    className="form-select"
                    value={
                      selectedTargetSlot
                        ? `${selectedTargetSlot.guruId}::${selectedTargetSlot.hari}::${selectedTargetSlot.sesiId}`
                        : ''
                    }
                    onChange={(e) => {
                      if (!e.target.value) {
                        setSelectedTargetSlot(null);
                        return;
                      }
                      const [guruId, hari, sesiId] = e.target.value.split('::');
                      const list = teachersList.length > 0 ? teachersList : mockGuru;
                      const guru = list.find((g) => g.id === guruId || g.nama === guruId);
                      const sesi = sesiList.find((s) => s.id === sesiId);
                      setSelectedTargetSlot({
                        guruId,
                        guruNama: guru ? guru.nama : 'Guru Lain',
                        hari: hari as DayOfWeek,
                        sesiId,
                        sesiNama: sesi ? sesi.nama : sesiId,
                      });
                    }}
                    required
                  >
                    <option value="">-- Pilih Jadwal Guru Lain --</option>
                    {matrixList.map((entry) => {
                      const sesi = sesiList.find((s) => s.id === entry.sesiId);
                      const list = teachersList.length > 0 ? teachersList : mockGuru;
                      return entry.guruIds
                        .filter((gid) => gid !== activeGuru.id)
                        .map((gid) => {
                          const g = list.find((guru) => guru.id === gid || guru.nama === gid);
                          if (!g) return null;
                          return (
                            <option key={`${entry.id}-${gid}`} value={`${gid}::${entry.hari}::${entry.sesiId}`}>
                              {g.nama.split(',')[0]} — {entry.hari}, {sesi?.nama || entry.sesiId} ({sesi?.jamMulai || '19:00'}–{sesi?.jamSelesai || '20:30'})
                            </option>
                          );
                        });
                    })}
                  </select>
                </div>

                {/* Preview Box */}
                {selectedMySlot && selectedTargetSlot && (
                  <div style={{
                    padding: '12px 14px',
                    background: 'var(--color-primary-light)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid rgba(27,107,74,0.2)',
                    fontSize: 12,
                  }}>
                    <div style={{ fontWeight: 800, color: 'var(--color-primary)', marginBottom: 6 }}>
                      Ringkasan Penukaran:
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 8 }}>
                      <div style={{ background: '#ffffff', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--color-border)' }}>
                        <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)' }}>Jadwal Anda:</div>
                        <div style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>{selectedMySlot.hari}</div>
                        <div style={{ fontSize: 11, color: 'var(--color-primary)' }}>{selectedMySlot.sesiNama}</div>
                      </div>

                      <ArrowRightLeft size={16} color="var(--color-primary)" />

                      <div style={{ background: '#ffffff', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--color-border)' }}>
                        <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)' }}>Jadwal Ditukar:</div>
                        <div style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>{selectedTargetSlot.guruNama.split(',')[0]}</div>
                        <div style={{ fontSize: 11, color: 'var(--color-accent)' }}>{selectedTargetSlot.hari}, {selectedTargetSlot.sesiNama}</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 3: Alasan / Catatan */}
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }}>
                    Alasan / Catatan Tambahan (Opsional)
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="cth: Ada keperluan mendesak / izin..."
                    value={swapCatatan}
                    onChange={(e) => setSwapCatatan(e.target.value)}
                  />
                </div>

              </div>

              <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setShowSwapModal(false)}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  disabled={isSubmittingSwap || !selectedMySlot || !selectedTargetSlot}
                  style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <ArrowRightLeft size={14} />
                  {isSubmittingSwap ? 'Mengirim...' : 'Kirim Permintaan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

// ─── TAB 1: JADWAL SAYA ───────────────────────────────────────────
function JadwalSaya({
  schedules,
  lokasiNama,
  onSwapSlot,
}: {
  schedules: Jadwal[];
  lokasiNama?: string;
  onSwapSlot: (slot: { hari: DayOfWeek; sesiId: SesiType; sesiNama: string }) => void;
}) {
  if (schedules.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon"><Clock size={24} /></div>
        <div className="empty-state-title">Belum Ada Jadwal</div>
        <div className="empty-state-desc">Jadwal mengajar Anda akan tampil di sini setelah diatur oleh Admin.</div>
      </div>
    );
  }

  const grouped: Record<string, Jadwal[]> = {};
  DAYS.forEach((d) => {
    const items = schedules.filter((j) => j.hari === d);
    if (items.length > 0) grouped[d] = items;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      {Object.entries(grouped).map(([day, items]) => (
        <div key={day}>
          <div style={{
            fontSize: 'var(--font-size-xs)',
            fontWeight: 700,
            color: 'var(--color-primary)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            marginBottom: 'var(--space-2)',
          }}>
            {day}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {items.map((j) => (
              <div key={j.id} className="jadwal-card" style={{ background: 'var(--color-surface)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)', flex: 1 }}>
                  <div className="jadwal-time-bar" />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 700 }}>{j.mataPelajaran}</span>
                      <span className="badge badge-neutral">{j.hari}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', marginTop: 4 }}>
                      <Clock size={12} /> {j.jamMulai}–{j.jamSelesai} WITA
                    </div>
                    <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 6, flexWrap: 'wrap' }}>
                      {j.catatan && j.catatan !== 'Ustadz' && j.catatan !== 'Ustadzah' && j.catatan !== j.mataPelajaran && (
                        <span className="badge badge-primary">{j.catatan}</span>
                      )}
                      {lokasiNama && (
                        <span className="badge badge-neutral" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <MapPin size={11} /> {lokasiNama}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => onSwapSlot({ hari: j.hari, sesiId: j.sesiId || 'pagi', sesiNama: j.mataPelajaran })}
                  style={{ fontSize: 11.5, padding: '5px 10px', display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}
                  title="Ajukan tukar jadwal ini dengan guru lain"
                >
                  <ArrowRightLeft size={13} /> Tukar Jadwal
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── TAB 2: MATRIKS JADWAL KESELURUHAN (GRID 7 HARI x SESI) ─────────
function MatriksJadwalKeseluruhan({
  matrix,
  sesiList,
  activeGuruId,
  onSelectSlotToSwap,
}: {
  matrix: JadwalSesiEntry[];
  sesiList: SesiConfig[];
  activeGuruId: string;
  onSelectSlotToSwap: (target: { guruId: string; guruNama: string; hari: DayOfWeek; sesiId: SesiType; sesiNama: string }) => void;
}) {
  return (
    <div>
      <div style={{
        padding: '10px 14px',
        background: 'var(--color-surface-2)',
        borderRadius: 'var(--radius-md)',
        marginBottom: 'var(--space-4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        border: '1px solid var(--color-border-light)',
        fontSize: 12,
        color: 'var(--color-text-secondary)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Info size={16} color="var(--color-primary)" />
          <span>
            Matriks penugasan seluruh guru (7 Hari). Kotak berwarna hijau adalah <strong>Jadwal Anda</strong>. Klik pada jadwal guru lain untuk mengajukan tukar jadwal.
          </span>
        </div>
      </div>

      <div className="card" style={{ width: '100%', overflowX: 'auto' }}>
        <table style={{ width: '100%', minWidth: 700, borderCollapse: 'collapse', fontSize: 11 }}>
          <thead>
            <tr style={{ borderBottom: '1.5px solid var(--color-border)' }}>
              <th style={{ width: '15%', background: 'var(--color-surface-2)', padding: '10px 8px', textAlign: 'left', fontWeight: 800 }}>
                Sesi / Jam
              </th>
              {DAYS.map((day) => (
                <th key={day} style={{ width: '12.14%', textAlign: 'center', padding: '10px 4px', background: 'var(--color-surface)', fontWeight: 800, borderLeft: '1px solid var(--color-border-light)' }}>
                  {day}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sesiList.map((sesi) => (
              <tr key={sesi.id} style={{ borderBottom: '1px solid var(--color-border-light)' }}>
                {/* Sesi Info */}
                <td style={{
                  background: 'var(--color-surface-2)',
                  borderRight: '1px solid var(--color-border-light)',
                  verticalAlign: 'top',
                  padding: '10px 8px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontWeight: 800, fontSize: 11.5, color: 'var(--color-text-primary)' }}>
                    {SESI_ICONS[sesi.id] || <Clock size={14} color="var(--color-primary)" />}
                    <span>{sesi.nama}</span>
                  </div>
                  <div style={{ marginTop: 3, fontSize: 10.5, fontWeight: 700, color: 'var(--color-primary)' }}>
                    {sesi.jamMulai}–{sesi.jamSelesai}
                  </div>
                </td>

                {/* 7 Days Cells */}
                {DAYS.map((day) => {
                  const entry = matrix.find((m) => m.hari === day && m.sesiId === sesi.id);
                  const assignedTeachers = (entry?.guruIds || [])
                    .map((gid) => mockGuru.find((g) => g.id === gid))
                    .filter(Boolean) as Guru[];

                  const isMySlot = entry?.guruIds?.includes(activeGuruId);

                  return (
                    <td
                      key={day}
                      style={{
                        padding: 6,
                        verticalAlign: 'top',
                        borderLeft: '1px solid var(--color-border-light)',
                        background: isMySlot ? 'rgba(27, 107, 74, 0.06)' : 'var(--color-surface)',
                      }}
                    >
                      {assignedTeachers.length === 0 ? (
                        <div style={{ textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: 10, padding: '8px 0' }}>
                          —
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          {assignedTeachers.map((guru) => {
                            const isMe = guru.id === activeGuruId;
                            return (
                              <div
                                key={guru.id}
                                onClick={() => {
                                  if (!isMe) {
                                    onSelectSlotToSwap({
                                      guruId: guru.id,
                                      guruNama: guru.nama,
                                      hari: day,
                                      sesiId: sesi.id,
                                      sesiNama: sesi.nama,
                                    });
                                  }
                                }}
                                style={{
                                  padding: '4px 6px',
                                  borderRadius: 'var(--radius-sm)',
                                  background: isMe ? 'var(--color-primary)' : 'var(--color-surface-2)',
                                  color: isMe ? '#ffffff' : 'var(--color-text-primary)',
                                  border: isMe ? '1px solid var(--color-primary-dark)' : '1px solid var(--color-border)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  gap: 4,
                                  cursor: isMe ? 'default' : 'pointer',
                                  transition: 'all 0.15s ease',
                                }}
                                title={isMe ? 'Jadwal Mengajar Anda' : `Klik untuk minta tukar jadwal dengan ${guru.nama}`}
                              >
                                <span style={{ fontWeight: 700, fontSize: 10.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {isMe ? '✓ Saya' : guru.nama.split(',')[0]}
                                </span>
                                {!isMe && <ArrowRightLeft size={10} color="var(--color-text-tertiary)" />}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── TAB 3: MANAJEMEN TUKAR JADWAL ───────────────────────────────────
function TukarJadwalManagement({
  incoming,
  outgoing,
  onRespond,
  onOpenModal,
}: {
  incoming: TukarJadwalRequest[];
  outgoing: TukarJadwalRequest[];
  onRespond: (req: TukarJadwalRequest, accept: boolean) => void;
  onOpenModal: () => void;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      
      {/* HEADER & ACTION BUTTON */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'var(--color-surface)',
        padding: '14px 16px',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--color-border-light)',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: 'var(--font-size-base)', color: 'var(--color-text-primary)' }}>
            Permintaan Tukar Jadwal
          </div>
          <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginTop: 2 }}>
            Ajukan permohonan atau tanggapi permintaan tukar jadwal dari pengajar lain
          </div>
        </div>
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={onOpenModal}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 700, flexShrink: 0 }}
        >
          <ArrowRightLeft size={15} /> Ajukan Tukar Jadwal
        </button>
      </div>

      {/* 1. PERMINTAAN MASUK */}
      <div>
        <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 800, marginBottom: 'var(--space-3)', display: 'flex', alignItems: 'center', gap: 6 }}>
          📥 Permintaan Tukar Jadwal Masuk ({incoming.length})
        </h3>

        {incoming.length === 0 ? (
          <div style={{ padding: 'var(--space-4)', background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', textAlign: 'center', border: '1px solid var(--color-border-light)', color: 'var(--color-text-tertiary)', fontSize: 12.5 }}>
            Tidak ada permintaan tukar jadwal yang menunggu respon Anda.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {incoming.map((req) => (
              <div
                key={req.id}
                className="card"
                style={{
                  borderLeft: '5px solid #F59E0B',
                  padding: 'var(--space-4)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 'var(--font-size-sm)', color: 'var(--color-text-primary)' }}>
                      {req.requesterGuruNama}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>
                      Mengajukan penukaran jadwal mengajar
                    </div>
                  </div>
                  <span className="badge badge-warning" style={{ fontSize: 10 }}>Menunggu Persetujuan</span>
                </div>

                <div style={{
                  display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 8,
                  background: 'var(--color-surface-2)', padding: 10, borderRadius: 'var(--radius-md)', marginBottom: 10
                }}>
                  <div>
                    <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)' }}>Jadwal Dia:</div>
                    <div style={{ fontWeight: 700, fontSize: 12 }}>{req.requesterHari}</div>
                    <div style={{ fontSize: 11, color: 'var(--color-primary)' }}>{req.requesterSesiNama}</div>
                  </div>
                  <ArrowRightLeft size={16} color="var(--color-text-tertiary)" />
                  <div>
                    <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)' }}>Jadwal Anda:</div>
                    <div style={{ fontWeight: 700, fontSize: 12 }}>{req.targetHari}</div>
                    <div style={{ fontSize: 11, color: 'var(--color-accent)' }}>{req.targetSesiNama}</div>
                  </div>
                </div>

                {req.catatan && (
                  <div style={{ fontSize: 11.5, color: 'var(--color-text-secondary)', marginBottom: 12, fontStyle: 'italic' }}>
                    💬 &ldquo;{req.catatan}&rdquo;
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => onRespond(req, false)}
                    style={{ color: 'var(--color-danger)', borderColor: 'rgba(239,68,68,0.3)', display: 'flex', alignItems: 'center', gap: 4 }}
                  >
                    <X size={14} /> Tolak Permintaan
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => onRespond(req, true)}
                    style={{ display: 'flex', alignItems: 'center', gap: 4, fontWeight: 700 }}
                  >
                    <Check size={14} /> Terima &amp; Tukar Jadwal
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 2. RIWAYAT PENGAJUAN SAYA */}
      <div>
        <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 800, marginBottom: 'var(--space-3)', display: 'flex', alignItems: 'center', gap: 6 }}>
          📤 Riwayat Pengajuan Tukar Jadwal Saya ({outgoing.length})
        </h3>

        {outgoing.length === 0 ? (
          <div style={{ padding: 'var(--space-4)', background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', textAlign: 'center', border: '1px solid var(--color-border-light)', color: 'var(--color-text-tertiary)', fontSize: 12.5 }}>
            Anda belum pernah mengajukan tukar jadwal.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {outgoing.map((req) => (
              <div
                key={req.id}
                style={{
                  padding: '10px 14px',
                  background: 'var(--color-surface)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border-light)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700 }}>
                    Tukar ke: {req.targetGuruNama} ({req.targetHari}, {req.targetSesiNama})
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>
                    Jadwal Anda: {req.requesterHari}, {req.requesterSesiNama}
                  </div>
                  {req.status === 'ditolak' && req.alasanPenolakan && (
                    <div style={{ fontSize: 11, color: '#DC2626', marginTop: 4, fontStyle: 'italic' }}>
                      ❌ Alasan penolakan: &ldquo;{req.alasanPenolakan}&rdquo;
                    </div>
                  )}
                </div>

                <span className={`badge ${
                  req.status === 'disetujui' ? 'badge-success' :
                  req.status === 'ditolak' ? 'badge-danger' : 'badge-warning'
                }`}>
                  {req.status === 'disetujui' ? '✓ Disetujui' : req.status === 'ditolak' ? '✕ Ditolak' : '⏳ Menunggu'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
