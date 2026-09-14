import React, { useState, useEffect, useRef } from 'react';
import useAuthStore from '../../../store/monitoring/authStore.js';
import { useAppStore } from '../../../store/useAppStore.js';
import { 
  CreditCard, Printer, Download, RefreshCw, CheckCircle2, 
  Clock, AlertCircle, FileText, UserCheck, ShieldCheck, Sparkles, 
  ChevronRight, ArrowLeftRight, Search, CheckCircle, Info, QrCode, Calendar, Building, X, User,
  Camera, Upload, Eye, Check, AlertTriangle, Image as ImageIcon
} from 'lucide-react';
import { StudentCard } from '../../admin/pengaturan/KartuPelajar.jsx';
import { CustomSelect } from '../../../components/CustomSelect.jsx';
import { Button } from '../../../components/ui.jsx';

/**
 * KartuPelajar.jsx — Halaman Khusus Kartu Pelajar Siswa.
 * Fitur: Preview Digital, Pengajuan Update Foto & TTL, Auto-Approval ACC oleh TU/Admin,
 * Download Langsung, dan Riwayat Pengajuan Realtime.
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

  // Form Pengajuan Pembaruan & Cetak
  const [showModalForm, setShowModalForm] = useState(false);
  const [requestType, setRequestType] = useState('update_foto_ttl'); // 'update_foto_ttl' | 'update_foto' | 'update_ttl' | 'cetak_ulang'
  const [newPhoto, setNewPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [tempatLahir, setTempatLahir] = useState('');
  const [tanggalLahir, setTanggalLahir] = useState('');
  const [requestReason, setRequestReason] = useState('Pembaruan Foto & Data Diri');
  const [customReason, setCustomReason] = useState('');
  const [toast, setToast] = useState(null);
  const [activeDetailModal, setActiveDetailModal] = useState(null);

  // Live Synchronized Student Master Data State
  const [studentProfile, setStudentProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  const todayDate = new Date();
  const hari = todayDate.toLocaleDateString('id-ID', { weekday: 'long' });
  const tanggal = todayDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  const dateFormatted = `${hari}, ${tanggal}`;

  // Priority: live master data -> session user -> fallback kosong
  const currentStudent = studentProfile || user || {};

  const studentName = currentStudent.name || currentStudent.nama || currentStudent.namaSiswa || user?.name || user?.username || 'Siswa';
  const studentNis = currentStudent.nis || currentStudent.username || user?.username || user?.nis || '-';
  const studentNisn = currentStudent.nisn || user?.nisn || '-';
  const studentClass = currentStudent.class_name || currentStudent.kelas || user?.class_name || user?.kelas || '-';
  const studentMajor = currentStudent.jurusan || currentStudent.major || user?.jurusan || user?.major || '-';
  const studentPhoto = currentStudent.photo || currentStudent.foto || user?.photo || user?.foto || null;
  const studentTtl = currentStudent.ttl || user?.ttl || '-';

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Reload student profile from master data
  const reloadStudentProfile = () => {
    const token = JSON.parse(sessionStorage.getItem('school_schedule_session_v1') || '{}')?.authToken;
    if (!token) return;
    setLoadingProfile(true);
    fetch('/api/student/profile', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(res => {
        if (res.ok && res.data) {
          setStudentProfile(res.data);
        }
      })
      .catch(err => console.warn('Gagal sinkron profil siswa:', err))
      .finally(() => setLoadingProfile(false));
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

    // Fetch Live Master Student Profile from mst_students
    reloadStudentProfile();
  }, [appSettings]);

  // Fetch Card Requests History
  const fetchCardRequests = async () => {
    setLoadingRequests(true);
    try {
      const token = JSON.parse(sessionStorage.getItem('school_schedule_session_v1') || '{}')?.authToken;
      const res = await fetch('/api/student-card-requests', {
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

  // Pre-fill TTL on opening form
  useEffect(() => {
    if (showModalForm && studentTtl && studentTtl !== '-') {
      const parts = studentTtl.split(',');
      if (parts.length >= 2) {
        setTempatLahir(parts[0].trim());
      }
    }
  }, [showModalForm, studentTtl]);

  // Handle Foto Upload with automatic compression (Canvas resize)
  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('File harus berupa gambar (JPG, PNG, atau WEBP)', 'error');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast('Ukuran file maksimal 5MB', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 500;
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.85);
        setNewPhoto(compressedBase64);
        setPhotoPreview(compressedBase64);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const computedFormattedTtl = () => {
    if (!tempatLahir && !tanggalLahir) return '';
    let tglText = tanggalLahir;
    if (tanggalLahir) {
      const d = new Date(tanggalLahir);
      if (!isNaN(d.getTime())) {
        tglText = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
      }
    }
    return tempatLahir && tglText ? `${tempatLahir.trim()}, ${tglText}` : (tempatLahir || tglText);
  };

  const handleSubmitRequest = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const finalReason = requestReason === 'Lainnya' ? customReason : requestReason;

    const proposed_data = {};
    const finalTtl = computedFormattedTtl();

    if (requestType === 'update_foto_ttl' || requestType === 'update_foto') {
      if (!newPhoto) {
        showToast('Silakan pilih dan unggah foto terbaru terlebih dahulu!', 'error');
        setSubmitting(false);
        return;
      }
      proposed_data.photo = newPhoto;
    }

    if (requestType === 'update_foto_ttl' || requestType === 'update_ttl') {
      if (!finalTtl) {
        showToast('Silakan isi Tempat & Tanggal Lahir yang valid!', 'error');
        setSubmitting(false);
        return;
      }
      proposed_data.ttl = finalTtl;
      proposed_data.tempat_lahir = tempatLahir;
      proposed_data.tanggal_lahir = tanggalLahir;
    }

    try {
      const token = JSON.parse(sessionStorage.getItem('school_schedule_session_v1') || '{}')?.authToken;
      const res = await fetch('/api/student-card-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          action: 'create',
          nis: studentNis,
          nama: studentName,
          kelas: studentClass,
          alasan: finalReason,
          request_type: requestType,
          proposed_data
        })
      });
      const data = await res.json();
      if (data.ok) {
        showToast('✅ Permohonan berhasil dikirim! Menunggu ACC petugas Tata Usaha / Admin.');
        setShowModalForm(false);
        setNewPhoto(null);
        setPhotoPreview(null);
        setTempatLahir('');
        setTanggalLahir('');
        fetchCardRequests();
        reloadStudentProfile();
      } else {
        showToast(data.error || 'Gagal mengirim permohonan', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Terjadi gangguan koneksi saat mengirim permohonan', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrintCard = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    setIsDownloadingPdf(true);
    showToast('Menyiapkan file PDF kartu pelajar...', 'info');
    try {
      const cardElement = cardRef.current || document.querySelector('.student-card-wrapper');
      if (!cardElement) throw new Error('Elemen kartu belum selesai dirender');

      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf')
      ]);

      const width = cardElement.offsetWidth || 320;
      const height = cardElement.offsetHeight || 200;

      const canvas = await html2canvas(cardElement, {
        scale: 3,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: null
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: width > height ? 'landscape' : 'portrait',
        unit: 'pt',
        format: [width, height]
      });

      pdf.addImage(imgData, 'PNG', 0, 0, width, height);
      const safeNis = (studentNis || 'siswa').replace(/[^a-zA-Z0-9]/g, '_');
      pdf.save(`Kartu_Pelajar_${safeNis}_${cardSide}.pdf`);
      showToast('✅ Kartu PDF berhasil diunduh!');
    } catch (err) {
      console.error(err);
      showToast('Gagal memproses PDF kartu: ' + (err.message || 'Kesalahan sistem'), 'error');
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const studentObjectForCard = {
    nis: studentNis,
    name: studentName,
    namaSiswa: studentName,
    kelas: studentClass,
    class_name: studentClass,
    photo: studentPhoto,
    foto: studentPhoto,
    ttl: studentTtl,
    jurusan: studentMajor,
    major: studentMajor,
    card_token: currentStudent.card_token || user?.card_token
  };

  const schoolNameDisplay = schoolData.nama_sekolah || appSettings.schoolName || appSettings.namaSekolah || 'SMK KARYA GUNA 2 BEKASI';

  // Check if there is an approved request
  const hasApprovedRequest = cardRequests.some(r => r.status === 'disetujui' || r.status === 'selesai');

  return (
    <div className="space-y-6 w-full pb-20 font-sans text-slate-800">
      
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-5 right-5 z-[110] px-4 py-3 rounded-[var(--ui-radius-card,20px)] shadow-md border text-xs font-bold flex items-center gap-2 animate-in fade-in slide-in-from-top-3 ${
          toast.type === 'error' ? 'bg-rose-50 border-rose-200 text-rose-800' : 
          toast.type === 'info' ? 'bg-sky-50 border-sky-200 text-sky-800' :
          'bg-emerald-50 border-emerald-200 text-emerald-800'
        }`}>
          <CheckCircle2 size={16} className={toast.type === 'error' ? 'text-rose-600' : toast.type === 'info' ? 'text-sky-600' : 'text-emerald-600'} />
          <span>{toast.message}</span>
        </div>
      )}

      {/* ── 1. HEADER BANNER MATCHING DASHBOARD DESIGN ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-black text-slate-900 text-base sm:text-lg">Kartu Pelajar Digital</h2>
          <span className="bg-emerald-50 text-emerald-700 border border-emerald-200/80 px-3.5 py-1.5 rounded-[var(--ui-radius-pill,9999px)] text-xs font-bold flex items-center gap-1.5">
            <Calendar size={14} className="text-emerald-600" /> Hari Ini, {dateFormatted}
          </span>
        </div>

        {/* Banner Card */}
        <div 
          className="rounded-[var(--ui-radius-card,24px)] p-6 sm:p-7 text-white space-y-5 relative overflow-hidden transition-all shadow-[var(--ui-shadow-card)]"
          style={{ 
            background: `linear-gradient(135deg, ${themeColorCSS} 0%, color-mix(in srgb, ${themeColorCSS} 80%, #000) 100%)`
          }}
        >
          {/* Top Row: Status Pill & Action Button */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="bg-white/20 border border-white/30 backdrop-blur-md rounded-full px-3.5 py-1 text-xs font-bold text-white inline-flex items-center gap-1.5">
              <CreditCard size={14} /> Kartu Identitas Digital Siswa
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowModalForm(true)}
                className="bg-white/20 hover:bg-white/30 border border-white/30 text-white px-4 py-1.5 rounded-[var(--ui-radius-card,20px)] text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-98"
              >
                <Camera size={14} />
                <span>Ajukan Update Foto / TTL &amp; Cetak</span>
              </button>
            </div>
          </div>

          {/* Student Identity Typography */}
          <div className="space-y-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-tight uppercase">
                {studentName}
              </h1>
              <div className="flex items-center gap-2 mt-1.5 text-xs font-extrabold text-white/90 flex-wrap">
                <span className="bg-white/20 border border-white/30 px-2.5 py-0.5 rounded-[var(--ui-radius-small,12px)]">
                  NIS: {studentNis}
                </span>
                <span className="bg-white/20 border border-white/30 px-2.5 py-0.5 rounded-[var(--ui-radius-small,12px)]">
                  Kelas: {studentClass}
                </span>
                {studentMajor !== '-' && (
                  <span className="bg-white/20 border border-white/30 px-2.5 py-0.5 rounded-[var(--ui-radius-small,12px)]">
                    {studentMajor}
                  </span>
                )}
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

      {/* ── INFO BANNER IF AN UPDATE HAS BEEN APPROVED ── */}
      {hasApprovedRequest && (
        <div className="p-4 rounded-[var(--ui-radius-card,20px)] bg-emerald-50 border border-emerald-200 text-emerald-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Sparkles size={18} />
            </div>
            <div>
              <p className="text-xs font-black">Data Kartu Terbaru Disetujui (ACC)!</p>
              <p className="text-[11px] text-emerald-700 font-medium mt-0.5">
                Pembaruan data/foto Anda telah divalidasi oleh Tata Usaha. Anda dapat langsung mengunduh kartu digital beresolusi tinggi di bawah.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleDownloadPDF}
            disabled={isDownloadingPdf}
            className="shrink-0 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-[var(--ui-radius-control,16px)] shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-98 transition-all"
          >
            <Download size={14} />
            <span>Download Kartu Baru (PDF)</span>
          </button>
        </div>
      )}

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

            {/* Quick Card Flip, Download PDF & Print Controls */}
            <div className="flex flex-wrap items-center justify-center gap-2.5 mt-6">
              <button
                type="button"
                onClick={() => setCardSide(prev => prev === 'front' ? 'back' : 'front')}
                className="px-3.5 py-2 rounded-[var(--ui-radius-control,16px)] bg-white hover:bg-slate-50 text-slate-700 text-xs font-extrabold border border-slate-200 shadow-xs flex items-center gap-2 cursor-pointer transition-all active:scale-98"
              >
                <ArrowLeftRight size={14} />
                <span>Putar Kartu ({cardSide === 'front' ? 'Ke Sisi Belakang' : 'Ke Sisi Depan'})</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadPDF}
                disabled={isDownloadingPdf}
                className="px-4 py-2 rounded-[var(--ui-radius-control,16px)] bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-xs flex items-center gap-2 cursor-pointer transition-all active:scale-98 disabled:opacity-50"
              >
                <Download size={14} />
                <span>{isDownloadingPdf ? 'Mengunduh...' : 'Download PDF'}</span>
              </button>

              <button
                type="button"
                onClick={handlePrintCard}
                className="px-3.5 py-2 rounded-[var(--ui-radius-control,16px)] bg-slate-800 hover:bg-slate-900 text-white text-xs font-extrabold shadow-xs flex items-center gap-2 cursor-pointer transition-all active:scale-98"
              >
                <Printer size={14} />
                <span>Cetak Fisik</span>
              </button>
            </div>

          </div>

        </div>

        {/* Right Column: Status Pengajuan & Informasi Identitas (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          
          {/* Identitas Ringkas Card */}
          <div className="bg-white p-6 rounded-[var(--ui-radius-card,24px)] border border-slate-100 shadow-[var(--ui-shadow-card)] space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <UserCheck size={16} style={{ color: themeColorCSS }} /> Data Identitas Terverifikasi
              </h3>
              <button
                type="button"
                onClick={reloadStudentProfile}
                disabled={loadingProfile}
                title="Refresh Profil"
                className="text-slate-400 hover:text-emerald-600 border-none bg-transparent cursor-pointer p-1"
              >
                <RefreshCw size={14} className={loadingProfile ? 'animate-spin text-emerald-600' : ''} />
              </button>
            </div>

            <div className="divide-y divide-slate-100 text-xs">
              <div className="py-2 flex justify-between items-center">
                <span className="text-slate-400 font-semibold">Nama Lengkap</span>
                <span className="font-black text-slate-900 text-right uppercase">{studentName}</span>
              </div>
              <div className="py-2 flex justify-between items-center">
                <span className="text-slate-400 font-semibold">NIS / Nomor Induk</span>
                <span className="font-extrabold text-slate-800 font-mono">{studentNis}</span>
              </div>
              <div className="py-2 flex justify-between items-center">
                <span className="text-slate-400 font-semibold">NISN</span>
                <span className="font-extrabold text-slate-800 font-mono">{studentNisn}</span>
              </div>
              <div className="py-2 flex justify-between items-center">
                <span className="text-slate-400 font-semibold">Tempat, Tgl Lahir</span>
                <span className="font-extrabold text-slate-800">{studentTtl}</span>
              </div>
              <div className="py-2 flex justify-between items-center">
                <span className="text-slate-400 font-semibold">Kelas</span>
                <span className="font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-[var(--ui-radius-small,12px)] border border-emerald-200">
                  {studentClass}
                </span>
              </div>
              <div className="py-2 flex justify-between items-center">
                <span className="text-slate-400 font-semibold">Jurusan</span>
                <span className="font-extrabold text-slate-800 text-right">{studentMajor}</span>
              </div>
            </div>
          </div>

          {/* History / Status Pengajuan Cetak Card */}
          <div className="bg-white p-6 rounded-[var(--ui-radius-card,24px)] border border-slate-100 shadow-[var(--ui-shadow-card)] space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Clock size={16} style={{ color: themeColorCSS }} /> Riwayat Pengajuan ({cardRequests.length})
              </h3>
              <button
                type="button"
                onClick={fetchCardRequests}
                disabled={loadingRequests}
                className="text-slate-400 hover:text-slate-600 border-none bg-transparent cursor-pointer p-1"
                title="Refresh Riwayat"
              >
                <RefreshCw size={13} className={loadingRequests ? 'animate-spin text-emerald-600' : ''} />
              </button>
            </div>

            {loadingRequests ? (
              <div className="p-6 text-center text-slate-400">
                <RefreshCw size={20} className="animate-spin mx-auto mb-2 text-emerald-600" />
                <p className="text-xs font-semibold">Memuat riwayat pengajuan...</p>
              </div>
            ) : cardRequests.length === 0 ? (
              <div className="p-6 text-center text-slate-400 bg-slate-50/50 rounded-[var(--ui-radius-control,16px)] border border-dashed border-slate-200">
                <p className="text-xs font-semibold">Belum ada riwayat permohonan data/kartu.</p>
                <button
                  type="button"
                  onClick={() => setShowModalForm(true)}
                  className="mt-2 text-xs font-black text-emerald-600 hover:underline inline-flex items-center gap-1 cursor-pointer bg-transparent border-none"
                >
                  Ajukan Pembaruan Data &rarr;
                </button>
              </div>
            ) : (
              <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                {cardRequests.map((req) => {
                  const proposed = req.proposed_data || {};
                  const isApproved = req.status === 'disetujui' || req.status === 'selesai';
                  const isRejected = req.status === 'ditolak';

                  return (
                    <div 
                      key={req.id} 
                      className={`p-3.5 rounded-[var(--ui-radius-control,16px)] border transition-all space-y-2.5 ${
                        isApproved ? 'bg-emerald-50/40 border-emerald-200' :
                        isRejected ? 'bg-rose-50/40 border-rose-200' :
                        'bg-slate-50 border-slate-100'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-[var(--ui-radius-small,8px)] bg-slate-200/80 text-slate-700">
                              {req.request_type === 'update_foto_ttl' ? 'Foto & TTL' :
                               req.request_type === 'update_foto' ? 'Pas Foto' :
                               req.request_type === 'update_ttl' ? 'TTL Baru' : 'Cetak Fisik'}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">#{req.id}</span>
                          </div>
                          <p className="font-bold text-xs text-slate-800 mt-1">{req.alasan}</p>
                          <p className="text-[10px] text-slate-400 font-medium">
                            {new Date(req.created_at || Date.now()).toLocaleDateString('id-ID', {
                              day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                            })}
                          </p>
                        </div>

                        <span className={`px-2.5 py-1 rounded-[var(--ui-radius-small,12px)] text-[10px] font-black shrink-0 ${
                          isApproved
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : isRejected
                            ? 'bg-rose-100 text-rose-800 border border-rose-300'
                            : 'bg-amber-100 text-amber-800 border border-amber-300'
                        }`}>
                          {req.status === 'pending' ? 'MENUNGGU ACC' :
                           req.status === 'disetujui' ? 'DISETUJUI (ACC)' :
                           req.status === 'selesai' ? 'SELESAI' : 'DITOLAK'}
                        </span>
                      </div>

                      {/* Detail usulan perubahan */}
                      {(proposed.photo || proposed.ttl) && (
                        <div className="bg-white/80 p-2.5 rounded-[var(--ui-radius-small,12px)] border border-slate-200/60 text-[11px] space-y-1.5">
                          {proposed.photo && (
                            <div className="flex items-center gap-2">
                              <img 
                                src={proposed.photo} 
                                alt="Usulan Foto" 
                                className="w-7 h-9 object-cover rounded-[var(--ui-radius-small,6px)] border border-slate-300 shrink-0 shadow-2xs" 
                              />
                              <span className="text-slate-600 font-semibold">Usulan Foto Baru Terlampir</span>
                            </div>
                          )}
                          {proposed.ttl && (
                            <p className="text-slate-600">
                              <span className="text-slate-400 font-medium">TTL Baru: </span>
                              <strong className="text-slate-800">{proposed.ttl}</strong>
                            </p>
                          )}
                        </div>
                      )}

                      {/* Catatan Admin jika ada */}
                      {req.admin_note && (
                        <div className={`p-2 rounded-[var(--ui-radius-small,10px)] text-[11px] font-semibold flex items-start gap-1.5 ${
                          isRejected ? 'bg-rose-100/70 text-rose-800' : 'bg-emerald-100/70 text-emerald-800'
                        }`}>
                          <Info size={13} className="shrink-0 mt-0.5" />
                          <span>Respon TU/Admin: {req.admin_note}</span>
                        </div>
                      )}

                      {/* Download Quick Button if Approved */}
                      {isApproved && (
                        <button
                          type="button"
                          onClick={handleDownloadPDF}
                          disabled={isDownloadingPdf}
                          className="w-full py-1.5 px-3 rounded-[var(--ui-radius-small,12px)] bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-98"
                        >
                          <Download size={13} />
                          <span>Unduh Kartu PDF Terbaru</span>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

      </div>

      {/* ── MODAL FORM PENGAJUAN UPDATE DATA & CETAK KARTU ── */}
      {showModalForm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs" onClick={() => setShowModalForm(false)}>
          <div className="bg-white w-full max-w-lg rounded-[var(--ui-radius-card,24px)] p-6 space-y-5 shadow-[var(--ui-shadow-modal)] border border-slate-100 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                  <Camera size={18} style={{ color: themeColorCSS }} /> Form Permohonan Data &amp; Kartu
                </h3>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                  Pengajuan akan ditinjau oleh Admin / Tata Usaha. Setelah di-ACC, kartu langsung diperbarui.
                </p>
              </div>
              <button type="button" onClick={() => setShowModalForm(false)} className="text-slate-400 hover:text-slate-600 border-none bg-transparent cursor-pointer p-1">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmitRequest} className="space-y-4">
              
              {/* Segmented Control / Type Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-700">Tipe Pengajuan</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'update_foto_ttl', label: 'Foto & TTL', desc: 'Perbarui foto & tanggal lahir' },
                    { id: 'update_foto', label: 'Pas Foto Saja', desc: 'Perbarui pas foto resmi' },
                    { id: 'update_ttl', label: 'TTL Saja', desc: 'Koreksi tempat/tanggal lahir' },
                    { id: 'cetak_ulang', label: 'Cetak Fisik', desc: 'Kartu hilang / cetak fisik' },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setRequestType(item.id)}
                      className={`p-2.5 rounded-[var(--ui-radius-control,16px)] text-left border transition-all cursor-pointer ${
                        requestType === item.id
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-600/20 shadow-xs'
                          : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="font-black text-xs">{item.label}</div>
                      <div className="text-[10px] text-slate-500 font-medium mt-0.5 leading-tight">{item.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Upload Foto Input (jika type foto_ttl atau foto) */}
              {(requestType === 'update_foto_ttl' || requestType === 'update_foto') && (
                <div className="space-y-2 p-3.5 rounded-[var(--ui-radius-control,16px)] bg-slate-50 border border-slate-200/80">
                  <label className="text-xs font-black text-slate-700 flex items-center justify-between">
                    <span>Unggah Pas Foto Baru (Resmi/Seragam)</span>
                    <span className="text-[10px] text-slate-400 font-semibold">JPG/PNG maks 5MB</span>
                  </label>

                  <div className="flex items-center gap-4">
                    {/* Foto Saat Ini */}
                    <div className="text-center shrink-0">
                      <div className="w-16 h-20 rounded-[var(--ui-radius-small,10px)] overflow-hidden bg-slate-200 border border-slate-300 flex items-center justify-center shadow-xs">
                        {studentPhoto ? (
                          <img src={studentPhoto} alt="Foto Lama" className="w-full h-full object-cover" />
                        ) : (
                          <User size={24} className="text-slate-400" />
                        )}
                      </div>
                      <span className="text-[9px] text-slate-500 font-bold block mt-1">Saat Ini</span>
                    </div>

                    {/* Arrow Divider */}
                    <ChevronRight size={18} className="text-slate-400 shrink-0" />

                    {/* Foto Baru Preview / Dropzone */}
                    <label className="flex-1 cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        className="hidden"
                      />
                      <div className={`w-full h-20 rounded-[var(--ui-radius-small,10px)] border-2 border-dashed flex items-center justify-center gap-3 p-2 transition-all ${
                        photoPreview 
                          ? 'border-emerald-500 bg-emerald-50/50' 
                          : 'border-slate-300 hover:border-emerald-400 bg-white'
                      }`}>
                        {photoPreview ? (
                          <>
                            <img 
                              src={photoPreview} 
                              alt="Foto Baru" 
                              className="w-14 h-18 object-cover rounded-[var(--ui-radius-small,8px)] border border-emerald-300 shadow-xs" 
                            />
                            <div className="text-left min-w-0">
                              <span className="text-[10px] font-black text-emerald-700 block">Foto Terpilih</span>
                              <span className="text-[9px] text-slate-400 block truncate">Klik untuk mengganti</span>
                            </div>
                          </>
                        ) : (
                          <div className="text-center">
                            <Upload size={18} className="mx-auto text-slate-400 mb-0.5" />
                            <span className="text-[10px] font-bold text-slate-600 block">Pilih Pas Foto Baru</span>
                            <span className="text-[9px] text-slate-400 block">Klik di sini</span>
                          </div>
                        )}
                      </div>
                    </label>
                  </div>
                </div>
              )}

              {/* TTL Input (jika type foto_ttl atau ttl) */}
              {(requestType === 'update_foto_ttl' || requestType === 'update_ttl') && (
                <div className="space-y-2 p-3.5 rounded-[var(--ui-radius-control,16px)] bg-slate-50 border border-slate-200/80">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-slate-700">Tempat &amp; Tanggal Lahir (TTL)</label>
                    <span className="text-[10px] text-slate-400 font-semibold">Saat ini: {studentTtl}</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] text-slate-500 font-bold block mb-1">Tempat Lahir</span>
                      <input
                        type="text"
                        value={tempatLahir}
                        onChange={(e) => setTempatLahir(e.target.value)}
                        placeholder="Contoh: Jakarta"
                        required
                        className="w-full bg-white border border-slate-200 rounded-[var(--ui-radius-control,12px)] px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-emerald-500 shadow-2xs font-semibold"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 font-bold block mb-1">Tanggal Lahir</span>
                      <input
                        type="date"
                        value={tanggalLahir}
                        onChange={(e) => setTanggalLahir(e.target.value)}
                        required
                        className="w-full bg-white border border-slate-200 rounded-[var(--ui-radius-control,12px)] px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-emerald-500 shadow-2xs font-semibold"
                      />
                    </div>
                  </div>

                  {computedFormattedTtl() && (
                    <div className="p-2 rounded-[var(--ui-radius-small,10px)] bg-emerald-50/70 border border-emerald-200 text-emerald-800 text-[11px] font-semibold flex items-center gap-1.5 mt-1">
                      <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                      <span>Hasil Format: <strong>{computedFormattedTtl()}</strong></span>
                    </div>
                  )}
                </div>
              )}

              {/* Alasan Pengajuan */}
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-700">Alasan Pengajuan</label>
                <CustomSelect
                  value={requestReason}
                  onChange={(val) => setRequestReason(val)}
                  options={[
                    { value: 'Pembaruan Foto & Data Diri', label: 'Pembaruan Pas Foto & Data Resmi' },
                    { value: 'Foto Belum Berseragam Resmi', label: 'Foto Lama Belum Berseragam Resmi' },
                    { value: 'Koreksi TTL Sesuai Akta Kelahiran / KK', label: 'Koreksi TTL Sesuai Akta Kelahiran / KK' },
                    { value: 'Kartu Hilang / Rusak', label: 'Kartu Fisik Hilang / Rusak' },
                    { value: 'Lainnya', label: 'Lainnya (Tulis Manual)' }
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
                    placeholder="Tuliskan keterangan detail pengajuan..."
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-[var(--ui-radius-control,16px)] px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              )}

              <div className="p-3.5 rounded-[var(--ui-radius-control,16px)] bg-amber-50 border border-amber-200 text-amber-900 text-[11px] font-semibold space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <Info size={14} /> Catatan Approval Otomatis
                </p>
                <p>Setelah pengajuan disetujui (ACC) oleh bagian Tata Usaha, kartu digital Anda langsung terupdate otomatis dan Anda bisa langsung men-download berkas PDF resminya.</p>
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
                  {submitting ? 'Mengirimkan...' : 'Kirim Permohonan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Print Media Query CSS */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .student-card-wrapper, .student-card-wrapper * { visibility: visible !important; }
          .student-card-wrapper { position: fixed; top: 20px; left: 20px; z-index: 999999 !important; }
        }
      `}</style>

    </div>
  );
};

export default KartuPelajarSiswa;
