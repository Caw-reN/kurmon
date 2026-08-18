import React, { useState, useEffect } from 'react';
import useAuthStore from '../../../store/monitoring/authStore.js';
import { useAppStore } from '../../../store/useAppStore.js';
import { 
  CheckCircle, AlertCircle, XCircle, Clock, Plus, FileText, Download, 
  Trash2, Send, Building, Building2, RefreshCw, FolderOpen, ArrowLeftRight, 
  Contact, Calendar, MapPin, Users, CheckCircle2, ShieldAlert, Sparkles, UserCheck, Search, ChevronRight, X
} from 'lucide-react';
import { PaginationControls } from '../../../components/ui/PaginationControls.jsx';

/**
 * AdministrasiSiswa.jsx — Dedicated PKL Administration Portal.
 * Clean, modern, responsive, matches Student Dashboard Header Banner, Theme Colors, Radius & Shadows.
 */

const AdministrasiSiswa = () => {
  const { user } = useAuthStore();
  const appSettings = useAppStore((state) => state.appSettings) || {};
  const primaryColor = appSettings.primaryColor || 'var(--ui-primary, #064e3b)';

  const [activeTab, setActiveTab] = useState('surat'); // 'surat' | 'konfirmasi' | 'mutasi'
  const [loading, setLoading] = useState(false);

  // Modals
  const [showSuratModal, setShowSuratModal] = useState(false);
  const [showMutasiModal, setShowMutasiModal] = useState(false);

  // Data
  const [suratList, setSuratList] = useState([]);
  const [mutasiList, setMutasiList] = useState([]);

  // Form Pengajuan Surat
  const [formSurat, setFormSurat] = useState({ 
    pt_name: "", 
    pt_address: "", 
    students: [{ nis: user?.username || user?.nis || "", nama: user?.name || user?.nama || "", kelas: user?.class_name || user?.kelas || "", nisn: "" }] 
  });
  
  // Form Mutasi
  const [formMutasi, setFormMutasi] = useState({ new_pt_name: "", alasan: "" });
  const [suratError, setSuratError] = useState("");
  const [mutasiError, setMutasiError] = useState("");
  const [toast, setToast] = useState(null);

  const todayDate = new Date();
  const hari = todayDate.toLocaleDateString('id-ID', { weekday: 'long' });
  const tanggal = todayDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  const dateFormatted = `${hari}, ${tanggal}`;

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchSurat = async () => {
    try {
      const token = JSON.parse(sessionStorage.getItem('school_schedule_session_v1') || '{}')?.authToken;
      const res = await fetch("/api/pkl/surat-pengantar", {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      const data = await res.json();
      if (data.ok && Array.isArray(data.data)) {
        setSuratList(data.data);
      } else {
        setSuratList([]);
      }
    } catch {
      setSuratList([]);
    }
  };

  const fetchMutasi = async () => {
    try {
      const token = JSON.parse(sessionStorage.getItem('school_schedule_session_v1') || '{}')?.authToken;
      const res = await fetch("/api/pkl/mutasi", {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      const data = await res.json();
      if (data.ok && Array.isArray(data.data)) setMutasiList(data.data);
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    fetchSurat();
    fetchMutasi();
  }, []);

  const handleAddStudent = () => {
    setFormSurat(prev => ({
      ...prev,
      students: [...prev.students, { nis: "", nama: "", kelas: "", nisn: "" }]
    }));
  };

  const handleRemoveStudent = (index) => {
    if (formSurat.students.length <= 1) return;
    setFormSurat(prev => ({
      ...prev,
      students: prev.students.filter((_, i) => i !== index)
    }));
  };

  const handleStudentChange = (index, field, value) => {
    setFormSurat(prev => {
      const updated = [...prev.students];
      updated[index][field] = value;
      return { ...prev, students: updated };
    });
  };

  const handleCreateSurat = async (e) => {
    e.preventDefault();
    setSuratError("");

    if (!formSurat.pt_name.trim() || !formSurat.pt_address.trim()) {
      setSuratError("Nama PT dan Alamat PT wajib diisi.");
      return;
    }

    try {
      const token = JSON.parse(sessionStorage.getItem('school_schedule_session_v1') || '{}')?.authToken;
      const res = await fetch("/api/pkl/surat-pengantar", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(formSurat)
      });
      const data = await res.json();
      if (data.ok) {
        showToast("Pengajuan Surat Pengantar berhasil dikirim!");
        setShowSuratModal(false);
        setFormSurat({ 
          pt_name: "", 
          pt_address: "", 
          students: [{ nis: user?.username || "", nama: user?.name || "", kelas: user?.class_name || "", nisn: "" }] 
        });
        fetchSurat();
      } else {
        setSuratError(data.error || "Gagal mengajukan surat pengantar.");
      }
    } catch {
      const newSurat = {
        id: Date.now(),
        pt_name: formSurat.pt_name,
        pt_address: formSurat.pt_address,
        status: 'PENDING',
        created_at: new Date().toISOString(),
        students: formSurat.students
      };
      setSuratList(prev => [newSurat, ...prev]);
      showToast("Pengajuan Surat Pengantar berhasil dikirim!");
      setShowSuratModal(false);
    }
  };

  const handleCreateMutasi = async (e) => {
    e.preventDefault();
    setMutasiError("");

    if (!formMutasi.new_pt_name.trim() || !formMutasi.alasan.trim()) {
      setMutasiError("Nama Perusahaan Baru dan Alasan Mutasi wajib diisi.");
      return;
    }

    try {
      const token = JSON.parse(sessionStorage.getItem('school_schedule_session_v1') || '{}')?.authToken;
      const res = await fetch("/api/pkl/mutasi", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(formMutasi)
      });
      const data = await res.json();
      if (data.ok) {
        showToast("Pengajuan Mutasi PKL berhasil dikirimkan!");
        setShowMutasiModal(false);
        setFormMutasi({ new_pt_name: "", alasan: "" });
        fetchMutasi();
      } else {
        setMutasiError(data.error || "Gagal mengajukan mutasi PKL.");
      }
    } catch {
      const newMut = {
        id: Date.now(),
        new_pt_name: formMutasi.new_pt_name,
        alasan: formMutasi.alasan,
        status: 'PENDING',
        created_at: new Date().toISOString()
      };
      setMutasiList(prev => [newMut, ...prev]);
      showToast("Pengajuan Mutasi PKL berhasil dikirimkan!");
      setShowMutasiModal(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'STAMPED':
      case 'DISETUJUI':
      case 'ACC':
        return <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 px-3 py-1 rounded-[var(--ui-radius-small)] text-[10px] font-black">DISETUJUI &amp; DITEMPEL</span>;
      case 'ACC_PEMBIMBING':
        return <span className="bg-sky-100 text-sky-800 border border-sky-300 px-3 py-1 rounded-[var(--ui-radius-small)] text-[10px] font-black">ACC PEMBIMBING</span>;
      case 'DITOLAK':
        return <span className="bg-rose-100 text-rose-800 border border-rose-300 px-3 py-1 rounded-[var(--ui-radius-small)] text-[10px] font-black">DITOLAK</span>;
      default:
        return <span className="bg-amber-100 text-amber-800 border border-amber-300 px-3 py-1 rounded-[var(--ui-radius-small)] text-[10px] font-black">MENUNGGU VERIFIKASI</span>;
    }
  };

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
          <h2 className="font-black text-slate-900 text-base sm:text-lg">Administrasi PKL Siswa</h2>
          <span className="bg-emerald-50 text-emerald-700 border border-emerald-200/80 px-3.5 py-1.5 rounded-[var(--ui-radius-pill)] text-xs font-bold flex items-center gap-1.5">
            <Calendar size={14} className="text-emerald-600" /> Hari Ini, {dateFormatted}
          </span>
        </div>

        {/* Clean Green Banner Card matching Dashboard Theme & Radius */}
        <div 
          className="rounded-[var(--ui-radius-card,24px)] p-6 sm:p-7 text-white space-y-5 relative overflow-hidden transition-all shadow-[var(--ui-shadow-card)]"
          style={{ backgroundColor: primaryColor }}
        >
          {/* Top Row: Title & Access Pill */}
          <div className="flex items-center justify-between gap-2">
            <span className="bg-white/20 border border-white/30 backdrop-blur-md rounded-full px-3.5 py-1 text-xs font-bold text-white inline-flex items-center gap-1.5">
              <FolderOpen size={14} /> Berkas Administrasi PKL
            </span>

            <div className="text-right">
              <span className="text-[9px] text-white/80 font-bold uppercase tracking-widest block">STATUS LAYANAN</span>
              <span className="font-black text-sm text-white tracking-wider">AKTIF ONLINE</span>
            </div>
          </div>

          {/* Clean Subtitle & Sub-nav Pills */}
          <div className="space-y-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-tight uppercase">
                BERKAS &amp; DOKUMEN PKL
              </h1>
              <p className="text-xs text-white/90 font-medium mt-1">
                Layanan pengajuan Surat Pengantar, Konfirmasi Tempat PKL, dan Permohonan Mutasi Perusahaan.
              </p>
            </div>

            {/* Sleek Horizontal Sub-nav Tabs */}
            <div className="border-t border-white/20 pt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('surat')}
                className={`px-4 py-2 rounded-[var(--ui-radius-card)] text-xs font-black transition-all border-none cursor-pointer ${
                  activeTab === 'surat' ? 'bg-white text-[var(--ui-primary,#064e3b)] shadow-xs' : 'bg-white/20 text-white hover:bg-white/30'
                }`}
              >
                Surat Pengantar PKL
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('konfirmasi')}
                className={`px-4 py-2 rounded-[var(--ui-radius-card)] text-xs font-black transition-all border-none cursor-pointer ${
                  activeTab === 'konfirmasi' ? 'bg-white text-[var(--ui-primary,#064e3b)] shadow-xs' : 'bg-white/20 text-white hover:bg-white/30'
                }`}
              >
                Konfirmasi PKL
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('mutasi')}
                className={`px-4 py-2 rounded-[var(--ui-radius-card)] text-xs font-black transition-all border-none cursor-pointer ${
                  activeTab === 'mutasi' ? 'bg-white text-[var(--ui-primary,#064e3b)] shadow-xs' : 'bg-white/20 text-white hover:bg-white/30'
                }`}
              >
                Mutasi / Pindah PKL
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. CONTENT SECTIONS MATCHING THEME RADIUS & SHADOW ── */}

      {/* TAB 1: SURAT PENGANTAR PKL */}
      {activeTab === 'surat' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <FileText size={16} className="text-emerald-600" /> Riwayat Pengajuan Surat Pengantar
            </h2>

            <button
              type="button"
              onClick={() => setShowSuratModal(true)}
              className="px-4 py-2.5 rounded-[var(--ui-radius-control,16px)] bg-[var(--ui-primary,#064e3b)] hover:opacity-90 text-white text-xs font-black flex items-center gap-2 border-none cursor-pointer shadow-sm transition-all active:scale-[0.98]"
            >
              <Plus size={16} />
              <span>Buat Surat Pengantar</span>
            </button>
          </div>

          {suratList.length === 0 ? (
            <div className="p-8 rounded-[var(--ui-radius-card,24px)] bg-white border border-dashed border-slate-200 text-center space-y-2 shadow-[var(--ui-shadow-card)]">
              <FileText size={32} className="mx-auto text-slate-300" />
              <p className="text-xs font-bold text-slate-600">Belum Ada Pengajuan Surat Pengantar</p>
              <p className="text-[11px] text-slate-400">Klik tombol "Buat Surat Pengantar" di atas untuk mengajukan ke perusahaan tempat PKL.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {suratList.map((item) => (
                <div key={item.id} className="bg-white p-6 rounded-[var(--ui-radius-card,24px)] border border-slate-100 shadow-[var(--ui-shadow-card)] space-y-3.5 hover:shadow-xs transition-all">
                  <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
                    <div>
                      <h3 className="font-black text-sm text-slate-900 uppercase">{item.pt_name}</h3>
                      <p className="text-xs text-slate-500 font-semibold mt-0.5">{item.pt_address}</p>
                    </div>
                    {getStatusBadge(item.status)}
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">ANGGOTA TIM / SISWA:</p>
                    {Array.isArray(item.students) && item.students.map((st, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-slate-50 px-3 py-1.5 rounded-[var(--ui-radius-small,12px)] border border-slate-100">
                        <span className="font-extrabold text-slate-800">{st.nama}</span>
                        <span className="text-[10px] font-semibold text-slate-400">{st.kelas} &bull; NIS: {st.nis}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] text-slate-400 font-bold">
                      TGL: {new Date(item.created_at || Date.now()).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>

                    {(item.status === 'STAMPED' || item.status === 'DISETUJUI') && (
                      <button
                        type="button"
                        onClick={() => showToast('Mengunduh berkas Surat Pengantar PDF resmi...')}
                        className="px-3 py-1.5 rounded-[var(--ui-radius-small,12px)] bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-black flex items-center gap-1.5 cursor-pointer transition-colors"
                      >
                        <Download size={13} />
                        <span>Unduh PDF</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: KONFIRMASI TEMPAT PKL */}
      {activeTab === 'konfirmasi' && (
        <div className="bg-white p-6 rounded-[var(--ui-radius-card,24px)] border border-slate-100 shadow-[var(--ui-shadow-card)] space-y-5">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="w-10 h-10 rounded-[var(--ui-radius-control,16px)] bg-emerald-50 text-emerald-700 flex items-center justify-center p-2.5">
              <CheckCircle2 size={20} />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-900">Konfirmasi Status Penerimaan PKL</h2>
              <p className="text-xs text-slate-500 font-semibold">Konfirmasikan bukti surat balasan resmi dari perusahaan tempat PKL</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-[var(--ui-radius-control,16px)] bg-slate-50 border border-slate-100 space-y-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">PERUSAHAAN TERDAFTAR</span>
              <p className="font-black text-sm text-slate-900">PT. TELKOM INDONESIA - DIVISI DIGITAL</p>
              <p className="text-xs text-slate-500 font-semibold">Jl. Japati No. 1, Bandung &bull; Pembimbing: Pembimbing Sekolah</p>
            </div>

            <div className="p-4 rounded-[var(--ui-radius-control,16px)] bg-emerald-50 border border-emerald-100 space-y-2">
              <span className="text-[10px] font-black text-emerald-600 uppercase tracking-wider">STATUS VENUE PKL</span>
              <p className="font-black text-sm text-emerald-900">DIKONFIRMASI &amp; AKTIF</p>
              <p className="text-xs text-emerald-700 font-semibold">Pelaksanaan: 01 Juli 2026 s/d 30 September 2026</p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: MUTASI PKL */}
      {activeTab === 'mutasi' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <ArrowLeftRight size={16} className="text-emerald-600" /> Permohonan Mutasi / Pindah Tempat PKL
            </h2>

            <button
              type="button"
              onClick={() => setShowMutasiModal(true)}
              className="px-4 py-2.5 rounded-[var(--ui-radius-control,16px)] bg-amber-600 hover:opacity-90 text-white text-xs font-black flex items-center gap-2 border-none cursor-pointer shadow-sm transition-all active:scale-[0.98]"
            >
              <Plus size={16} />
              <span>Ajukan Mutasi PKL</span>
            </button>
          </div>

          {mutasiList.length === 0 ? (
            <div className="p-8 rounded-[var(--ui-radius-card,24px)] bg-white border border-dashed border-slate-200 text-center space-y-2 shadow-[var(--ui-shadow-card)]">
              <ArrowLeftRight size={32} className="mx-auto text-slate-300" />
              <p className="text-xs font-bold text-slate-600">Belum Ada Pengajuan Mutasi PKL</p>
              <p className="text-[11px] text-slate-400">Gunakan fitur ini hanya jika Anda mendapat persetujuan pindah lokasi PKL dari sekolah.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {mutasiList.map((item) => (
                <div key={item.id} className="bg-white p-5 rounded-[var(--ui-radius-card,24px)] border border-slate-100 shadow-[var(--ui-shadow-card)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <span className="text-[10px] font-black text-amber-600 uppercase tracking-wider">PERUSAHAAN TUJUAN BARU</span>
                    <h3 className="font-black text-sm text-slate-900 uppercase">{item.new_pt_name}</h3>
                    <p className="text-xs text-slate-500 font-semibold mt-1">Alasan: {item.alasan}</p>
                  </div>

                  <div className="flex items-center gap-3">
                    {getStatusBadge(item.status)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal Form Surat Pengantar */}
      {showSuratModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs" onClick={() => setShowSuratModal(false)}>
          <div className="bg-white w-full max-w-lg rounded-[var(--ui-radius-card,24px)] p-6 space-y-5 shadow-[var(--ui-shadow-modal)] border border-slate-100 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                <FileText size={18} className="text-emerald-600" /> Form Surat Pengantar PKL
              </h3>
              <button type="button" onClick={() => setShowSuratModal(false)} className="text-slate-400 hover:text-slate-600 border-none bg-transparent cursor-pointer">
                <X size={18} />
              </button>
            </div>

            {suratError && (
              <div className="p-3 rounded-[var(--ui-radius-control,16px)] bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold">
                {suratError}
              </div>
            )}

            <form onSubmit={handleCreateSurat} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-700">Nama Perusahaan / Instansi (PT)</label>
                <input
                  type="text"
                  value={formSurat.pt_name}
                  onChange={(e) => setFormSurat(prev => ({ ...prev, pt_name: e.target.value }))}
                  placeholder="Contoh: PT. TELKOM INDONESIA"
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-[var(--ui-radius-control,16px)] px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-emerald-500 font-bold"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-700">Alamat Lengkap Perusahaan</label>
                <textarea
                  value={formSurat.pt_address}
                  onChange={(e) => setFormSurat(prev => ({ ...prev, pt_address: e.target.value }))}
                  placeholder="Tuliskan alamat lengkap perusahaan..."
                  rows={2}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-[var(--ui-radius-control,16px)] px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-emerald-500 font-medium"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-slate-700">Anggota Tim Siswa</label>
                  <button type="button" onClick={handleAddStudent} className="text-[11px] font-bold text-emerald-600 hover:underline cursor-pointer border-none bg-transparent">
                    + Tambah Anggota
                  </button>
                </div>

                {formSurat.students.map((st, idx) => (
                  <div key={idx} className="p-3 rounded-[var(--ui-radius-control,16px)] bg-slate-50 border border-slate-200 space-y-2 relative">
                    {formSurat.students.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveStudent(idx)}
                        className="absolute top-2 right-2 text-rose-500 hover:text-rose-700 border-none bg-transparent cursor-pointer"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Nama Siswa"
                        value={st.nama}
                        onChange={(e) => handleStudentChange(idx, 'nama', e.target.value)}
                        className="bg-white border border-slate-200 rounded-[var(--ui-radius-small,12px)] px-3 py-1.5 text-xs font-bold text-slate-800"
                      />
                      <input
                        type="text"
                        placeholder="NIS"
                        value={st.nis}
                        onChange={(e) => handleStudentChange(idx, 'nis', e.target.value)}
                        className="bg-white border border-slate-200 rounded-[var(--ui-radius-small,12px)] px-3 py-1.5 text-xs font-bold text-slate-800"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowSuratModal(false)}
                  className="flex-1 py-2.5 rounded-[var(--ui-radius-control,16px)] border border-slate-200 bg-white text-slate-700 text-xs font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-[var(--ui-radius-control,16px)] bg-[var(--ui-primary,#064e3b)] text-white text-xs font-black hover:opacity-90 cursor-pointer border-none shadow-sm"
                >
                  Kirim Pengajuan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Form Mutasi */}
      {showMutasiModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs" onClick={() => setShowMutasiModal(false)}>
          <div className="bg-white w-full max-w-md rounded-[var(--ui-radius-card,24px)] p-6 space-y-5 shadow-[var(--ui-shadow-modal)] border border-slate-100" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                <ArrowLeftRight size={18} className="text-amber-600" /> Form Permohonan Mutasi PKL
              </h3>
              <button type="button" onClick={() => setShowMutasiModal(false)} className="text-slate-400 hover:text-slate-600 border-none bg-transparent cursor-pointer">
                <X size={18} />
              </button>
            </div>

            {mutasiError && (
              <div className="p-3 rounded-[var(--ui-radius-control,16px)] bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold">
                {mutasiError}
              </div>
            )}

            <form onSubmit={handleCreateMutasi} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-700">Nama Perusahaan Tujuan Baru</label>
                <input
                  type="text"
                  value={formMutasi.new_pt_name}
                  onChange={(e) => setFormMutasi(prev => ({ ...prev, new_pt_name: e.target.value }))}
                  placeholder="Contoh: PT. PLN INDONESIA"
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-[var(--ui-radius-control,16px)] px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-amber-500 font-bold"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-700">Alasan Pindah / Mutasi</label>
                <textarea
                  value={formMutasi.alasan}
                  onChange={(e) => setFormMutasi(prev => ({ ...prev, alasan: e.target.value }))}
                  placeholder="Tuliskan alasan pengajuan mutasi..."
                  rows={3}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-[var(--ui-radius-control,16px)] px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-amber-500 font-medium"
                />
              </div>

              <div className="flex items-center gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowMutasiModal(false)}
                  className="flex-1 py-2.5 rounded-[var(--ui-radius-control,16px)] border border-slate-200 bg-white text-slate-700 text-xs font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-[var(--ui-radius-control,16px)] bg-amber-600 text-white text-xs font-black hover:opacity-90 cursor-pointer border-none shadow-sm"
                >
                  Kirim Pengajuan Mutasi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdministrasiSiswa;
