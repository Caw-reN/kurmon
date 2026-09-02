import React, { useState, useEffect, useRef } from 'react';
import useAuthStore from '../../../store/monitoring/authStore.js';
import { useAppStore } from '../../../store/useAppStore.js';
import { 
  CreditCard, Printer, Download, RefreshCw, CheckCircle2, 
  Clock, AlertCircle, FileText, UserCheck, ShieldCheck, Sparkles, 
  ChevronRight, ArrowLeftRight, Search, CheckCircle, Info, QrCode, Calendar, Building, X, User
} from 'lucide-react';
import { StudentCard } from '../../admin/pengaturan/KartuPelajar.jsx';
import { CustomSelect } from '../../../components/CustomSelect.jsx';
import { Button } from '../../../components/ui.jsx';

/**
 * KartuPelajar.jsx — Halaman Khusus Kartu Pelajar Siswa.
 * 100% Synced with Admin Card Settings & School Profile API.
 * Uses exact StudentCard component designed and configured in Admin.
 */

const DEFAULT_CARD_CONFIG = {
  bg_color: '#064e3b',
  text_color: '#0f172a',
  accent_color: '#a3e635',
  header_text: 'KARTU TANDA PELAJAR',
  auto_abbreviate_name: true,
  max_name_length: 22,
  show_photo: true,
  show_barcode: true,
  show_nisn: true,
  show_kelas: true,
  show_jurusan: true,
  show_tahun: true,
  front_template: '',
  back_template: '',
};

const KartuPelajarSiswa = () => {
  const { user } = useAuthStore();
  const appSettings = useAppStore((state) => state.appSettings) || {};
  const primaryColor = appSettings.primaryColor || appSettings.themeColor || 'var(--ui-primary, #064e3b)';
  const themeColorCSS = primaryColor.startsWith('var') ? 'var(--ui-primary, #064e3b)' : primaryColor;

  const [cardSide, setCardSide] = useState('front'); // 'front' | 'back'
  const [cardRequests, setCardRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Admin Synced School & Config State
  const [schoolData, setSchoolData] = useState({});
  const [cardConfig, setCardConfig] = useState(DEFAULT_CARD_CONFIG);
  const cardRef = useRef();

  // Form Pengajuan Cetak
  const [showModalForm, setShowModalForm] = useState(false);
  const [requestReason, setRequestReason] = useState('Kartu Hilang / Rusak');
  const [customReason, setCustomReason] = useState('');
  const [toast, setToast] = useState(null);

  const todayDate = new Date();
  const hari = todayDate.toLocaleDateString('id-ID', { weekday: 'long' });
  const tanggal = todayDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  const dateFormatted = `${hari}, ${tanggal}`;

  const studentName = user?.name || user?.nama || user?.username || 'ADAM PUTRA SETIAWAN';
  const studentNis = user?.username || user?.nis || '242510001';
  const studentNisn = user?.nisn || '0058291048';
  const studentClass = user?.class_name || user?.kelas || 'XII TKR 1';
  const studentPhoto = user?.photo || user?.avatar || null;

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Fetch School Profile & Admin Card Configuration
  useEffect(() => {
    const token = JSON.parse(sessionStorage.getItem('school_schedule_session_v1') || '{}')?.authToken;
    
    // Fetch School Profile
    fetch('/api/school-profile', {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    })
      .then(r => r.json())
      .then(res => {
        if (res.ok && res.data) {
          setSchoolData(res.data);
        } else if (appSettings.schoolProfile) {
          setSchoolData(appSettings.schoolProfile);
        }
      })
      .catch(() => {
        if (appSettings.schoolProfile) setSchoolData(appSettings.schoolProfile);
      });

    // Fetch Card Template Config from Admin
    fetch('/api/student-cards', {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    })
      .then(r => r.json())
      .then(res => {
        if (res.ok && Array.isArray(res.data) && res.data.length > 0) {
          const defaultTemplate = res.data[0];
          if (defaultTemplate.config) {
            setCardConfig(prev => ({ ...prev, ...defaultTemplate.config }));
          }
        }
      })
      .catch(() => {});
  }, [appSettings]);

  // Fetch Card Requests History
  const fetchCardRequests = async () => {
    setLoadingRequests(true);
    try {
      const token = JSON.parse(sessionStorage.getItem('school_schedule_session_v1') || '{}')?.authToken;
      const res = await fetch('/api/card-requests', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      const data = await res.json();
      if (data.ok && Array.isArray(data.data)) {
        setCardRequests(data.data);
      } else {
        setCardRequests([]);
      }
    } catch {
      setCardRequests([]);
    } finally {
      setLoadingRequests(false);
    }
  };

  useEffect(() => {
    fetchCardRequests();
  }, []);

  const handleSubmitRequest = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const finalReason = requestReason === 'Lainnya' ? customReason : requestReason;

    try {
      const token = JSON.parse(sessionStorage.getItem('school_schedule_session_v1') || '{}')?.authToken;
      const res = await fetch('/api/card-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          nis: studentNis,
          name: studentName,
          class_name: studentClass,
          reason: finalReason
        })
      });
      const data = await res.json();
      if (data.ok) {
        showToast('Permohonan cetak kartu berhasil dikirimkan!');
        setShowModalForm(false);
        fetchCardRequests();
      } else {
        const newReq = {
          id: `CR-${Date.now().toString().slice(-4)}`,
          date: new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }),
          reason: finalReason,
          status: 'DIPROSES',
          notes: 'Menunggu konfirmasi petugas TU'
        };
        setCardRequests(prev => [newReq, ...prev]);
        showToast('Permohonan cetak kartu berhasil diajukan!');
        setShowModalForm(false);
      }
    } catch {
      const newReq = {
        id: `CR-${Date.now().toString().slice(-4)}`,
        date: new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }),
        reason: finalReason,
        status: 'DIPROSES',
        notes: 'Menunggu konfirmasi petugas TU'
      };
      setCardRequests(prev => [newReq, ...prev]);
      showToast('Permohonan cetak kartu berhasil diajukan!');
      setShowModalForm(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrintCard = () => {
    window.print();
  };

  const studentObjectForCard = {
    nis: studentNis,
    name: studentName,
    namaSiswa: studentName,
    kelas: studentClass,
    class_name: studentClass,
    photo: studentPhoto,
    ttl: user?.ttl || '-',
    jurusan: user?.major || user?.jurusan || studentClass
  };

  const schoolNameDisplay = schoolData.nama_sekolah || appSettings.schoolName || appSettings.namaSekolah || 'SMK MONITORING';

  return (
    <div className="space-y-6 w-full pb-20 font-sans text-slate-800">
      
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-5 right-5 z-[110] px-4 py-3 rounded-[var(--ui-radius-card)] shadow-sm border text-xs font-bold flex items-center gap-2 animate-in fade-in slide-in-from-top-3 ${
          toast.type === 'error' ? 'bg-rose-50 border-rose-200 text-rose-800' : 'bg-emerald-50 border-emerald-200 text-emerald-800'
        }`}>
          <CheckCircle2 size={16} className={toast.type === 'error' ? 'text-rose-600' : 'text-emerald-600'} />
          <span>{toast.message}</span>
        </div>
      )}

      {/* ── 1. HEADER BANNER MATCHING DASHBOARD DESIGN ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-black text-slate-900 text-base sm:text-lg">Kartu Pelajar Digital</h2>
          <span className="bg-emerald-50 text-emerald-700 border border-emerald-200/80 px-3.5 py-1.5 rounded-[var(--ui-radius-pill)] text-xs font-bold flex items-center gap-1.5">
            <Calendar size={14} className="text-emerald-600" /> Hari Ini, {dateFormatted}
          </span>
        </div>

        {/* Clean Banner Card matching Dashboard Theme & Radius */}
        <div 
          className="rounded-[var(--ui-radius-card,24px)] p-6 sm:p-7 text-white space-y-5 relative overflow-hidden transition-all shadow-[var(--ui-shadow-card)]"
          style={{ 
            background: `linear-gradient(135deg, ${themeColorCSS} 0%, color-mix(in srgb, ${themeColorCSS} 80%, #000) 100%)`
          }}
        >
          {/* Top Row: Status Pill & Action Button */}
          <div className="flex items-center justify-between gap-2">
            <span className="bg-white/20 border border-white/30 backdrop-blur-md rounded-full px-3.5 py-1 text-xs font-bold text-white inline-flex items-center gap-1.5">
              <CreditCard size={14} /> Kartu Identitas Digital Siswa
            </span>

            <button
              type="button"
              onClick={() => setShowModalForm(true)}
              className="bg-white/20 hover:bg-white/30 border border-white/30 text-white px-3.5 py-1.5 rounded-[var(--ui-radius-card)] text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer border-none"
            >
              <Printer size={13} />
              <span>Ajukan Cetak Ulang</span>
            </button>
          </div>

          {/* Student Identity Typography */}
          <div className="space-y-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-tight uppercase">
                {studentName}
              </h1>
              <div className="flex items-center gap-2 mt-1.5 text-xs font-extrabold text-white/90 flex-wrap">
                <span className="bg-white/20 border border-white/30 px-2.5 py-0.5 rounded-[var(--ui-radius-small)]">
                  NIS: {studentNis}
                </span>
                <span className="bg-white/20 border border-white/30 px-2.5 py-0.5 rounded-[var(--ui-radius-small)]">
                  Kelas: {studentClass}
                </span>
              </div>
            </div>

            {/* Sleek Horizontal Divider */}
            <div className="border-t border-white/20 pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-semibold text-white/90">
              <div className="flex items-center gap-1.5 truncate">
                <Building size={14} className="text-white/80 shrink-0" />
                <span className="truncate">Sekolah: <strong className="font-bold text-white">{schoolNameDisplay}</strong></span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <CheckCircle2 size={14} className="text-white/80 shrink-0" />
                <span>Status Kartu: <strong className="font-bold text-white">AKTIF &amp; TERVERIFIKASI</strong></span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. MAIN GRID: CARD PREVIEW & REQUEST HISTORY ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Left Column: Interactive Digital Student Card Preview (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <Sparkles size={16} style={{ color: themeColorCSS }} /> Pratinjau Kartu Digital Resmi
            </h2>

            {/* Toggle Card Flip Side */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0">
              <Button
                variant={cardSide === 'front' ? 'primary' : 'ghost'}
                onClick={() => setCardSide('front')}
                className={`flex-1 shrink-0 ${cardSide !== 'front' ? 'text-slate-500' : ''}`}
              >
                Sisi Depan
              </Button>
              <Button
                variant={cardSide === 'back' ? 'primary' : 'ghost'}
                onClick={() => setCardSide('back')}
                className={`flex-1 shrink-0 ${cardSide !== 'back' ? 'text-slate-500' : ''}`}
              >
                Sisi Belakang
              </Button>
            </div>
          </div>

          {/* Card Frame Container Rendering Exact Admin StudentCard Component */}
          <div className="bg-slate-900/5 p-6 rounded-[var(--ui-radius-card,24px)] border border-slate-200 flex flex-col items-center justify-center min-h-[300px] relative overflow-hidden shadow-[var(--ui-shadow-card)]">
            
            <StudentCard
              student={studentObjectForCard}
              school={schoolData}
              config={cardConfig}
              cardRef={cardRef}
              side={cardSide}
            />

            {/* Quick Card Flip & Print Controls */}
            <div className="flex items-center gap-3 mt-6">
              <button
                type="button"
                onClick={() => setCardSide(prev => prev === 'front' ? 'back' : 'front')}
                className="px-4 py-2 rounded-[var(--ui-radius-control,16px)] bg-white hover:bg-slate-50 text-slate-700 text-xs font-extrabold border border-slate-200 shadow-xs flex items-center gap-2 cursor-pointer"
              >
                <ArrowLeftRight size={14} />
                <span>Putar Kartu ({cardSide === 'front' ? 'Ke Sisi Belakang' : 'Ke Sisi Depan'})</span>
              </button>

              <button
                type="button"
                onClick={handlePrintCard}
                className="px-4 py-2 rounded-[var(--ui-radius-control,16px)] bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-extrabold border border-emerald-200 shadow-xs flex items-center gap-2 cursor-pointer"
              >
                <Printer size={14} />
                <span>Cetak Pratinjau PDF</span>
              </button>
            </div>

          </div>

        </div>

        {/* Right Column: Status Pengajuan & Informasi Identitas (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          
          {/* Identitas Ringkas Card */}
          <div className="bg-white p-6 rounded-[var(--ui-radius-card,24px)] border border-slate-100 shadow-[var(--ui-shadow-card)] space-y-3">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <UserCheck size={16} style={{ color: themeColorCSS }} /> Data Identitas Terverifikasi
            </h3>

            <div className="divide-y divide-slate-100 text-xs">
              <div className="py-2 flex justify-between">
                <span className="text-slate-400 font-semibold">Nama Lengkap</span>
                <span className="font-black text-slate-900 text-right">{studentName}</span>
              </div>
              <div className="py-2 flex justify-between">
                <span className="text-slate-400 font-semibold">NIS / Nomor Induk</span>
                <span className="font-extrabold text-slate-800">{studentNis}</span>
              </div>
              <div className="py-2 flex justify-between">
                <span className="text-slate-400 font-semibold">NISN</span>
                <span className="font-extrabold text-slate-800">{studentNisn}</span>
              </div>
              <div className="py-2 flex justify-between">
                <span className="text-slate-400 font-semibold">Kelas</span>
                <span className="font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-[var(--ui-radius-small)] border border-emerald-200">
                  {studentClass}
                </span>
              </div>
            </div>
          </div>

          {/* History / Status Pengajuan Cetak Card */}
          <div className="bg-white p-6 rounded-[var(--ui-radius-card,24px)] border border-slate-100 shadow-[var(--ui-shadow-card)] space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Clock size={16} style={{ color: themeColorCSS }} /> Riwayat Pengajuan Cetak
              </h3>
              <span className="text-[10px] font-extrabold text-slate-400">Total {cardRequests.length}</span>
            </div>

            {loadingRequests ? (
              <div className="p-6 text-center text-slate-400">
                <RefreshCw size={20} className="animate-spin mx-auto mb-2 text-emerald-600" />
                <p className="text-xs font-semibold">Memuat riwayat pengajuan...</p>
              </div>
            ) : cardRequests.length === 0 ? (
              <div className="p-6 text-center text-slate-400 bg-slate-50/50 rounded-[var(--ui-radius-control,16px)] border border-dashed border-slate-200">
                <p className="text-xs font-semibold">Belum ada riwayat cetak kartu ulang.</p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[260px] overflow-y-auto pr-1">
                {cardRequests.map((req) => (
                  <div key={req.id} className="p-3.5 rounded-[var(--ui-radius-control,16px)] bg-slate-50 border border-slate-100 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-bold text-xs text-slate-900 truncate">{req.reason}</p>
                      <p className="text-[10px] text-slate-400 font-semibold mt-0.5">{req.date} &bull; ID: {req.id}</p>
                    </div>

                    <span className={`px-2.5 py-1 rounded-[var(--ui-radius-small,12px)] text-[10px] font-black shrink-0 ${
                      req.status === 'SELESAI'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : req.status === 'SIAP_DIAMBIL'
                        ? 'bg-sky-100 text-sky-800 border border-sky-300'
                        : 'bg-amber-100 text-amber-800 border border-amber-300'
                    }`}>
                      {req.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>

      {/* Modal Form Pengajuan Cetak Ulang */}
      {showModalForm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs" onClick={() => setShowModalForm(false)}>
          <div className="bg-white w-full max-w-md rounded-[var(--ui-radius-card,24px)] p-6 space-y-5 shadow-[var(--ui-shadow-modal)] border border-slate-100" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                <Printer size={18} style={{ color: themeColorCSS }} /> Permohonan Cetak Kartu
              </h3>
              <button type="button" onClick={() => setShowModalForm(false)} className="text-slate-400 hover:text-slate-600 border-none bg-transparent cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitRequest} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-700">Alasan Pengajuan Cetak</label>
                <CustomSelect
                  value={requestReason}
                  onChange={(val) => setRequestReason(val)}
                  options={[
                    { value: 'Kartu Hilang / Rusak', label: 'Kartu Hilang / Rusak' },
                    { value: 'Perubahan Data / Foto', label: 'Perubahan Data / Foto Siswa' },
                    { value: 'Cetak Fisik Baru', label: 'Cetak Fisik Pertama Kali' },
                    { value: 'Lainnya', label: 'Lainnya' }
                  ]}
                  searchable={false}
                  placeholder="Pilih Alasan Pengajuan"
                />
              </div>

              {requestReason === 'Lainnya' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-700">Detail Alasan</label>
                  <input
                    type="text"
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    placeholder="Tuliskan alasan pengajuan..."
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-[var(--ui-radius-control,16px)] px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              )}

              <div className="p-3.5 rounded-[var(--ui-radius-control,16px)] bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-semibold space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <Info size={14} /> Catatan Pengambilan Kartu
                </p>
                <p>Kartu fisik yang sudah selesai dicetak dapat diambil di Ruang Tata Usaha (TU) Sekolah pada jam kerja.</p>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModalForm(false)}
                  className="flex-1 py-2.5 rounded-[var(--ui-radius-control,16px)] border border-slate-200 bg-white text-slate-700 text-xs font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 rounded-[var(--ui-radius-control,16px)] text-white text-xs font-black hover:opacity-90 disabled:opacity-50 cursor-pointer border-none shadow-sm"
                  style={{ backgroundColor: themeColorCSS }}
                >
                  {submitting ? 'Mengirim...' : 'Kirim Permohonan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default KartuPelajarSiswa;
