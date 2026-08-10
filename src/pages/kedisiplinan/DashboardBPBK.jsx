import React, { useState, useMemo, useEffect } from 'react';
import { 
  BookOpen, Search, ShieldAlert, CheckCircle2, History, MessageSquare, 
  Download, Users, TrendingUp, AlertOctagon, Printer, X, Trash2, Plus, 
  FileText, Home, Calendar, Clock, AlertTriangle, ShieldCheck, HeartHandshake, Eye, Send
} from 'lucide-react';
import { Button, Modal, UISelect, TablePagination } from '../../components/ui.jsx';
import { CustomSelect } from '../../components/CustomSelect.jsx';
import { StatCard, PageHeader } from '../../components/monitoring/ui/index.js';
import useAuthStore from "../../store/monitoring/authStore.js";
import * as XLSX from 'xlsx';

export default function DashboardBPBK({ students = [], classes = [] }) {
  const authToken = useAuthStore(state => state.user?.authToken);
  const user = useAuthStore(state => state.user);

  // Sub-tabs in BK Dashboard: 'ews' | 'konseling' | 'surat' | 'dossier'
  const [subTab, setSubTab] = useState('ews');

  // State data from backend
  const [riwayat, setRiwayat] = useState([]);
  const [bkSessions, setBkSessions] = useState([]);
  const [homeVisits, setHomeVisits] = useState([]);
  const [bkLetters, setBkLetters] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState(null);

  // UI state filters
  const [search, setSearch] = useState("");
  const [filterClass, setFilterClass] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);

  // Modal States
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [editingSession, setEditingSession] = useState(null);
  const [formSession, setFormSession] = useState({
    student_nis: '',
    category: 'Kedisiplinan',
    session_date: new Date().toISOString().slice(0, 10),
    problem: '',
    solution: '',
    follow_up_date: '',
    status: 'Berjalan',
    privacy_level: 'Terbatas'
  });

  const [showVisitModal, setShowVisitModal] = useState(false);
  const [formVisit, setFormVisit] = useState({
    student_nis: '',
    visit_date: new Date().toISOString().slice(0, 10),
    result: '',
    photo_url: ''
  });

  const [showLetterModal, setShowLetterModal] = useState(false);
  const [formLetter, setFormLetter] = useState({
    student_nis: '',
    letter_type: 'Panggilan Orang Tua',
    reason: ''
  });

  // Dossier 360° Modal
  const [dossierStudent, setDossierStudent] = useState(null);
  const [showDossierModal, setShowDossierModal] = useState(false);

  // Deleting record state
  const [deletingId, setDeletingId] = useState(null);

  // Toast Helper
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Fetch all BK data
  const fetchData = async () => {
    if (!authToken) return;
    setIsLoading(true);
    try {
      const [resRiwayat, resSessions, resVisits, resLetters] = await Promise.all([
        fetch("/api/kedisiplinan/riwayat", { headers: { "Authorization": `Bearer ${authToken}` } }),
        fetch("/api/kedisiplinan/bk/sessions", { headers: { "Authorization": `Bearer ${authToken}` } }),
        fetch("/api/kedisiplinan/bk/home-visits", { headers: { "Authorization": `Bearer ${authToken}` } }),
        fetch("/api/kedisiplinan/bk/letters", { headers: { "Authorization": `Bearer ${authToken}` } })
      ]);

      const dataRiwayat = await resRiwayat.json();
      const dataSessions = await resSessions.json();
      const dataVisits = await resVisits.json();
      const dataLetters = await resLetters.json();

      if (dataRiwayat.ok) setRiwayat(dataRiwayat.data || []);
      if (dataSessions.ok) setBkSessions(dataSessions.data || []);
      if (dataVisits.ok) setHomeVisits(dataVisits.data || []);
      if (dataLetters.ok) setBkLetters(dataLetters.data || []);
    } catch (e) {
      console.error(e);
      showToast("Gagal memuat data BK", "error");
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [authToken]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterClass, filterCategory, filterStatus, subTab]);

  // Aggregate student points & BK status
  const studentPointsMap = useMemo(() => {
    const map = {};
    students.forEach(s => {
      map[s.nis] = {
        ...s,
        total_poin: 0,
        riwayat_list: [],
        sesi_count: 0,
        risk_level: 'Rendah' // 'Rendah' | 'Sedang' | 'Tinggi'
      };
    });

    riwayat.forEach(r => {
      if (map[r.siswa_nis]) {
        map[r.siswa_nis].total_poin += (r.poin || 0);
        map[r.siswa_nis].riwayat_list.push(r);
      }
    });

    bkSessions.forEach(ses => {
      if (map[ses.student_nis]) {
        map[ses.student_nis].sesi_count += 1;
      }
    });

    Object.values(map).forEach(s => {
      if (s.total_poin >= 75 || s.sesi_count >= 5) {
        s.risk_level = 'Tinggi';
      } else if (s.total_poin >= 40 || s.sesi_count >= 2) {
        s.risk_level = 'Sedang';
      } else {
        s.risk_level = 'Rendah';
      }
    });

    return map;
  }, [students, riwayat, bkSessions]);

  // Students list with points/violations
  const studentPointsList = useMemo(() => {
    return Object.values(studentPointsMap).filter(s => {
      if (filterClass !== "all" && s.class_name !== filterClass) return false;
      if (search) {
        const query = search.toLowerCase();
        return (s.name?.toLowerCase().includes(query) || s.nis?.toLowerCase().includes(query));
      }
      return true;
    });
  }, [studentPointsMap, filterClass, search]);

  // High Risk EWS Students
  const highRiskStudents = useMemo(() => {
    return Object.values(studentPointsMap)
      .filter(s => s.risk_level === 'Tinggi' || s.total_poin > 0)
      .sort((a, b) => b.total_poin - a.total_poin);
  }, [studentPointsMap]);

  // Filtered Sessions List
  const filteredSessions = useMemo(() => {
    return bkSessions.filter(s => {
      if (filterCategory !== "all" && s.category !== filterCategory) return false;
      if (filterStatus !== "all" && s.status !== filterStatus) return false;
      if (search) {
        const query = search.toLowerCase();
        return (
          (s.student_name || '')?.toLowerCase().includes(query) || 
          (s.student_nis || '')?.toLowerCase().includes(query) ||
          (s.problem || '')?.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [bkSessions, filterCategory, filterStatus, search]);

  // Handle Save Session (Create / Edit)
  const handleSaveSession = async (e) => {
    e.preventDefault();
    if (!formSession.student_nis || !formSession.problem) {
      showToast("Pilih siswa dan isi deskripsi masalah terlebih dahulu", "error");
      return;
    }

    try {
      const url = editingSession ? `/api/kedisiplinan/bk/sessions/${editingSession.id}` : "/api/kedisiplinan/bk/sessions";
      const method = editingSession ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${authToken}` },
        body: JSON.stringify(formSession)
      });
      const data = await res.json();

      if (data.ok) {
        showToast(editingSession ? "Sesi konseling diperbarui" : "Sesi konseling baru berhasil dicatat");
        setShowSessionModal(false);
        setEditingSession(null);
        fetchData();
      } else {
        showToast(data.error || "Gagal menyimpan sesi konseling", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Terjadi kesalahan jaringan", "error");
    }
  };

  // Handle Save Home Visit
  const handleSaveVisit = async (e) => {
    e.preventDefault();
    if (!formVisit.student_nis || !formVisit.result) {
      showToast("Pilih siswa dan isi hasil kunjungan terlebih dahulu", "error");
      return;
    }

    try {
      const res = await fetch("/api/kedisiplinan/bk/home-visits", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${authToken}` },
        body: JSON.stringify(formVisit)
      });
      const data = await res.json();

      if (data.ok) {
        showToast("Jurnal Kunjungan Rumah berhasil dicatat!");
        setShowVisitModal(false);
        fetchData();
      } else {
        showToast(data.error || "Gagal menyimpan kunjungan rumah", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Terjadi kesalahan koneksi", "error");
    }
  };

  // Handle Save Letter (Surat Panggilan / SP)
  const handleSaveLetter = async (e) => {
    e.preventDefault();
    if (!formLetter.student_nis) {
      showToast("Pilih siswa terlebih dahulu", "error");
      return;
    }

    try {
      const res = await fetch("/api/kedisiplinan/bk/letters", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${authToken}` },
        body: JSON.stringify(formLetter)
      });
      const data = await res.json();

      if (data.ok) {
        showToast(`Surat (${formLetter.letter_type}) berhasil diterbitkan!`);
        setShowLetterModal(false);
        fetchData();
      } else {
        showToast(data.error || "Gagal menerbitkan surat", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Terjadi kesalahan koneksi", "error");
    }
  };

  // Handle Delete Session
  const handleDeleteSession = async (id) => {
    if (!await window.confirmAsync("Apakah Anda yakin ingin menghapus catatan sesi konseling ini?")) return;
    try {
      const res = await fetch(`/api/kedisiplinan/bk/sessions/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${authToken}` }
      });
      const data = await res.json();
      if (data.ok) {
        showToast("Catatan sesi konseling berhasil dihapus");
        fetchData();
      } else {
        showToast(data.error || "Gagal menghapus", "error");
      }
    } catch (err) {
      showToast("Terjadi kesalahan koneksi", "error");
    }
  };

  // Export BK Summary to Excel
  const handleExportExcel = () => {
    const dataToExport = studentPointsList.map((s, index) => ({
      No: index + 1,
      NIS: s.nis,
      Nama_Siswa: s.name,
      Kelas: s.class_name || '-',
      Total_Poin_Pelanggaran: s.total_poin,
      Tingkat_Resiko: s.risk_level,
      Jumlah_Sesi_BK: s.sesi_count
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Rekap BK & Kedisiplinan");
    XLSX.writeFile(wb, `Rekap_Bimbingan_Konseling_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // Open 360° Dossier
  const openDossier = (student) => {
    const fullInfo = studentPointsMap[student.nis] || student;
    setDossierStudent(fullInfo);
    setShowDossierModal(true);
  };

  return (
    <div className="flex flex-col gap-5 w-full pb-10">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-[var(--ui-radius-small)] shadow-sm font-bold text-xs flex items-center gap-2 ${
          toast.type === 'error' ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'
        }`}>
          {toast.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* ── Page Header ────────────────────────────────────────── */}
      <PageHeader 
        title="Bimbingan & Konseling" 
        subtitle="Sistem Peringatan Dini, Manajemen Konseling & Dossier 360°"
        icon={ShieldAlert}
      />

      {/* ── Sub Navigation Tabs ────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-2.5 rounded-[var(--ui-radius-card)] shadow-xs border border-slate-200/70">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setSubTab('ews')}
            className={`px-4 py-2 rounded-[var(--ui-radius-small)] text-xs font-black transition-all flex items-center gap-2 cursor-pointer border-none ${
              subTab === 'ews'
                ? 'bg-[var(--ui-primary)] text-white shadow-xs'
                : 'bg-transparent text-slate-600 hover:bg-slate-100'
            }`}
          >
            <ShieldAlert size={15} />
            <span>Dashboard & EWS</span>
          </button>
          <button
            onClick={() => setSubTab('konseling')}
            className={`px-4 py-2 rounded-[var(--ui-radius-small)] text-xs font-black transition-all flex items-center gap-2 cursor-pointer border-none ${
              subTab === 'konseling'
                ? 'bg-[var(--ui-primary)] text-white shadow-xs'
                : 'bg-transparent text-slate-600 hover:bg-slate-100'
            }`}
          >
            <HeartHandshake size={15} />
            <span>Sesi Konseling</span>
            {bkSessions.length > 0 && (
              <span className="px-2 py-0.5 rounded-[var(--ui-radius-pill)] text-[10px] bg-white/20 text-white font-mono">
                {bkSessions.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setSubTab('surat')}
            className={`px-4 py-2 rounded-[var(--ui-radius-small)] text-xs font-black transition-all flex items-center gap-2 cursor-pointer border-none ${
              subTab === 'surat'
                ? 'bg-[var(--ui-primary)] text-white shadow-xs'
                : 'bg-transparent text-slate-600 hover:bg-slate-100'
            }`}
          >
            <FileText size={15} />
            <span>Surat & Home Visit</span>
          </button>
          <button
            onClick={() => setSubTab('dossier')}
            className={`px-4 py-2 rounded-[var(--ui-radius-small)] text-xs font-black transition-all flex items-center gap-2 cursor-pointer border-none ${
              subTab === 'dossier'
                ? 'bg-[var(--ui-primary)] text-white shadow-xs'
                : 'bg-transparent text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Users size={15} />
            <span>Rekap & Berkas 360°</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            onClick={() => {
              setEditingSession(null);
              setFormSession({
                student_nis: '',
                category: 'Kedisiplinan',
                session_date: new Date().toISOString().slice(0, 10),
                problem: '',
                solution: '',
                follow_up_date: '',
                status: 'Berjalan',
                privacy_level: 'Terbatas'
              });
              setShowSessionModal(true);
            }}
            className="px-4 py-2.5 text-xs font-black flex items-center gap-1.5 shadow-xs cursor-pointer bg-[var(--ui-primary)] hover:opacity-90 text-white rounded-[var(--ui-radius-small)]"
          >
            <Plus size={15} strokeWidth={2.5} />
            <span>Catat Konseling</span>
          </Button>
        </div>
      </div>

      {/* ── TAB 1: DASHBOARD & EARLY WARNING SYSTEM (EWS) ────────────────── */}
      {subTab === 'ews' && (
        <div className="flex flex-col gap-5 animate-in fade-in duration-200">
          {/* Stat Cards Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              label="Kasus / Sesi Aktif"
              value={bkSessions.filter(s => s.status === 'Berjalan' || s.status === 'Follow-up').length}
              sub="Perlu penanganan & pendampingan"
              icon={Clock}
              iconBg="bg-amber-50"
              iconColor="text-amber-600"
            />
            <StatCard
              label="Siswa Resiko Tinggi"
              value={highRiskStudents.filter(s => s.risk_level === 'Tinggi').length}
              sub="Total Poin > 75 atau > 5 Sesi"
              icon={ShieldAlert}
              iconBg="bg-rose-50"
              iconColor="text-rose-600"
            />
            <StatCard
              label="Kunjungan Rumah"
              value={homeVisits.length}
              sub="Home visit terlaksana"
              icon={Home}
              iconBg="bg-sky-50"
              iconColor="text-sky-600"
            />
            <StatCard
              label="Surat Ortu & SP"
              value={bkLetters.length}
              sub="Surat Panggilan & SP"
              icon={FileText}
              iconBg="bg-emerald-50"
              iconColor="text-emerald-600"
            />
          </div>

          {/* Early Warning System & Category Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Left Col: EWS List */}
            <div className="lg:col-span-2 bg-white rounded-[var(--ui-radius-card)] p-5 shadow-xs border border-slate-200/80 flex flex-col gap-4">
              <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                <div>
                  <h3 className="font-black text-slate-800 text-sm flex items-center gap-2">
                    <AlertTriangle size={18} className="text-amber-500" />
                    Early Warning System (Poin Pelanggaran Ambang Batas SP)
                  </h3>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Daftar siswa yang memerlukan intervensi bimbingan konseling dan panggilan orang tua.
                  </p>
                </div>
              </div>

              {highRiskStudents.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center text-center gap-3 bg-gradient-to-b from-slate-50/50 to-emerald-50/20 rounded-[var(--ui-radius-card)] border border-slate-100/80 my-1">
                  <div className="w-14 h-14 rounded-[var(--ui-radius-card)] bg-emerald-100/80 text-emerald-600 border border-emerald-200/80 flex items-center justify-center shadow-2xs">
                    <ShieldCheck size={28} strokeWidth={2.2} />
                  </div>
                  <div className="max-w-md space-y-1">
                    <h4 className="font-extrabold text-slate-800 text-sm">Kondisi Siswa Terkendali &amp; Aman</h4>
                    <p className="text-xs text-slate-500 font-medium leading-relaxed">
                      Sangat baik! Tidak ada siswa dalam kategori resiko tinggi (poin &gt; 75) saat ini.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-3 max-h-[380px] overflow-y-auto pr-1">
                  {highRiskStudents.slice(0, 8).map(st => (
                    <div 
                      key={st.nis}
                      className="p-3.5 rounded-[var(--ui-radius-small)] border border-slate-200/80 bg-slate-50/70 hover:bg-slate-50 transition-all flex flex-col sm:flex-row justify-between sm:items-center gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-[var(--ui-radius-small)] flex items-center justify-center font-black text-sm shadow-2xs ${
                          st.total_poin >= 75 ? 'bg-rose-100 text-rose-700 border border-rose-200' : 'bg-amber-100 text-amber-700 border border-amber-200'
                        }`}>
                          {st.total_poin}
                        </div>
                        <div>
                          <div className="font-bold text-slate-800 text-xs flex items-center gap-2">
                            <span>{st.name}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded-[var(--ui-radius-pill)] bg-white font-black text-slate-500 border border-slate-200">
                              {st.class_name || 'Tanpa Kelas'}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            NIS: {st.nis} • {st.riwayat_list.length} pelanggaran tercatat
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => {
                            setFormLetter({ student_nis: st.nis, letter_type: st.total_poin >= 75 ? 'SP 1' : 'Panggilan Orang Tua', reason: `Akumulasi poin kedisiplinan mencapai ${st.total_poin} poin.` });
                            setShowLetterModal(true);
                          }}
                          className="px-3 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-[var(--ui-radius-small)] text-xs font-bold transition-all border border-rose-200/70 cursor-pointer flex items-center gap-1 shadow-2xs"
                        >
                          <FileText size={13} />
                          <span>{st.total_poin >= 75 ? 'Terbit SP' : 'Surat Ortu'}</span>
                        </button>

                        <button
                          onClick={() => openDossier(st)}
                          className="px-3 py-1.5 bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 rounded-[var(--ui-radius-small)] text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
                        >
                          <Eye size={13} />
                          <span>Lihat Dossier</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right Col: Category Distribution & Quick Action */}
            <div className="bg-white rounded-[var(--ui-radius-card)] p-5 shadow-xs border border-slate-200/80 flex flex-col gap-4">
              <h3 className="font-black text-slate-800 text-sm flex items-center gap-2 pb-3 border-b border-slate-100">
                <TrendingUp size={17} className="text-[var(--ui-primary)]" />
                Distribusi Kategori Konseling
              </h3>

              <div className="flex flex-col gap-3.5">
                {[
                  { label: 'Kedisiplinan', gradient: 'from-rose-500 to-pink-500', count: bkSessions.filter(s => s.category === 'Kedisiplinan').length },
                  { label: 'Akademik', gradient: 'from-sky-500 to-blue-500', count: bkSessions.filter(s => s.category === 'Akademik').length },
                  { label: 'Pribadi & Sosial', gradient: 'from-amber-500 to-orange-500', count: bkSessions.filter(s => s.category === 'Pribadi' || s.category === 'Sosial').length },
                  { label: 'Karir & Kelulusan', gradient: 'from-emerald-500 to-teal-500', count: bkSessions.filter(s => s.category === 'Karir').length }
                ].map(cat => {
                  const total = bkSessions.length || 1;
                  const pct = Math.round((cat.count / total) * 100);
                  return (
                    <div key={cat.label} className="flex flex-col gap-1.5">
                      <div className="flex justify-between text-xs font-bold text-slate-700">
                        <span>{cat.label}</span>
                        <span className="font-mono text-slate-500">{cat.count} Sesi ({pct}%)</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden p-0.5 border border-slate-200/40">
                        <div className={`h-full rounded-full bg-gradient-to-r ${cat.gradient} transition-all duration-500`} style={{ width: `${Math.max(pct, 4)}%` }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-auto pt-4 border-t border-slate-100 flex flex-col gap-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Aksi Cepat BK</span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => { setShowVisitModal(true); }}
                    className="p-2.5 rounded-[var(--ui-radius-small)] bg-sky-50 text-sky-800 hover:bg-sky-100 font-bold text-xs border border-sky-200/70 cursor-pointer flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
                  >
                    <Home size={14} />
                    <span>Catat Home Visit</span>
                  </button>
                  <button
                    onClick={() => { setShowLetterModal(true); }}
                    className="p-2.5 rounded-[var(--ui-radius-small)] bg-emerald-50 text-emerald-800 hover:bg-emerald-100 font-bold text-xs border border-emerald-200/70 cursor-pointer flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
                  >
                    <Printer size={14} />
                    <span>Surat Ortu</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: SESI KONSELING ─────────────────────────────────────────── */}
      {subTab === 'konseling' && (
        <div className="flex flex-col gap-4 animate-in fade-in duration-200">
          {/* Search & Filters */}
          <div className="bg-white p-4 rounded-[var(--ui-radius-card)] shadow-xs border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="relative w-full md:w-80">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari nama siswa / deskripsi..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border-none rounded-[var(--ui-radius-small)] text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[var(--ui-primary)]"
              />
            </div>

            <div className="flex flex-wrap gap-2.5 w-full md:w-auto">
              <CustomSelect
                value={filterCategory}
                onChange={val => setFilterCategory(val)}
                options={[
                  { value: 'all', label: '-- Semua Kategori --' },
                  { value: 'Kedisiplinan', label: 'Kedisiplinan' },
                  { value: 'Akademik', label: 'Akademik' },
                  { value: 'Pribadi', label: 'Pribadi' },
                  { value: 'Sosial', label: 'Sosial' },
                  { value: 'Karir', label: 'Karir' }
                ]}
              />

              <CustomSelect
                value={filterStatus}
                onChange={val => setFilterStatus(val)}
                options={[
                  { value: 'all', label: '-- Semua Status --' },
                  { value: 'Berjalan', label: 'Berjalan' },
                  { value: 'Follow-up', label: 'Follow-up' },
                  { value: 'Selesai', label: 'Selesai' }
                ]}
              />
            </div>
          </div>

          {/* Sessions Table */}
          <div className="bg-white rounded-[var(--ui-radius-card)] shadow-xs border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-max">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-wider border-b border-slate-100">
                    <th className="px-4 py-3 font-black">NAMA SISWA</th>
                    <th className="px-3 py-3 font-black">KATEGORI</th>
                    <th className="px-3 py-3 font-black">TANGGAL SESI</th>
                    <th className="px-4 py-3 font-black">PERMASALAHAN</th>
                    <th className="px-3 py-3 font-black">STATUS</th>
                    <th className="px-3 py-3 font-black">GURU BK</th>
                    <th className="px-3 py-3 font-black text-center">AKSI</th>
                  </tr>
                </thead>
                <tbody className="text-xs font-medium text-slate-700 divide-y divide-slate-100">
                  {isLoading ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400 font-bold">Memuat data sesi konseling...</td>
                    </tr>
                  ) : filteredSessions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400 font-bold">Belum ada catatan sesi konseling.</td>
                    </tr>
                  ) : (
                    filteredSessions.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map(ses => (
                      <tr key={ses.id} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3">
                          <div className="font-bold text-slate-800">{ses.student_name || 'Siswa'}</div>
                          <div className="text-[10px] text-slate-400 font-bold">{ses.class_name || 'NIS: ' + ses.student_nis}</div>
                        </td>
                        <td className="px-3 py-3">
                          <span className="px-2.5 py-1 rounded-[var(--ui-radius-pill)] text-[10px] font-black bg-slate-100 text-slate-700">
                            {ses.category}
                          </span>
                        </td>
                        <td className="px-3 py-3 font-bold text-slate-600">
                          {new Date(ses.session_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="px-4 py-3 max-w-[220px]">
                          <div className="truncate font-semibold text-slate-800" title={ses.problem}>{ses.problem}</div>
                          {ses.solution && <div className="text-[10px] text-slate-400 truncate" title={ses.solution}>Solusi: {ses.solution}</div>}
                        </td>
                        <td className="px-3 py-3">
                          <span className={`px-2.5 py-1 rounded-[var(--ui-radius-pill)] text-[10px] font-black ${
                            ses.status === 'Selesai' ? 'bg-emerald-100 text-emerald-800' :
                            ses.status === 'Follow-up' ? 'bg-amber-100 text-amber-800' :
                            'bg-sky-100 text-sky-800'
                          }`}>
                            {ses.status}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-slate-600 font-medium">
                          {ses.counselor_name || 'Guru BK'}
                        </td>
                        <td className="px-3 py-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => {
                                setEditingSession(ses);
                                setFormSession({
                                  student_nis: ses.student_nis,
                                  category: ses.category || 'Kedisiplinan',
                                  session_date: ses.session_date?.slice(0, 10) || new Date().toISOString().slice(0, 10),
                                  problem: ses.problem || '',
                                  solution: ses.solution || '',
                                  follow_up_date: ses.follow_up_date?.slice(0, 10) || '',
                                  status: ses.status || 'Berjalan',
                                  privacy_level: ses.privacy_level || 'Terbatas'
                                });
                                setShowSessionModal(true);
                              }}
                              className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-[var(--ui-radius-small)] transition-all border-none cursor-pointer shadow-2xs bg-white"
                              title="Edit Sesi"
                            >
                              <FileText size={14} />
                            </button>
                            <button
                              onClick={() => handleDeleteSession(ses.id)}
                              className="p-1.5 hover:bg-rose-50 text-rose-600 rounded-[var(--ui-radius-small)] transition-all border-none cursor-pointer shadow-2xs bg-white"
                              title="Hapus Sesi"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="p-4 border-t border-slate-100">
              <TablePagination
                totalItems={filteredSessions.length}
                itemsPerPage={itemsPerPage}
                currentPage={currentPage}
                onPageChange={setCurrentPage}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 3: SURAT & HOME VISIT ───────────────────────────────────────── */}
      {subTab === 'surat' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 animate-in fade-in duration-200">
          {/* Left: Home Visit Log */}
          <div className="bg-white rounded-[var(--ui-radius-card)] p-5 shadow-xs border border-slate-100 flex flex-col gap-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="font-black text-slate-800 text-sm flex items-center gap-2">
                <Home size={17} className="text-sky-600" />
                Jurnal Kunjungan Rumah (Home Visit)
              </h3>
              <Button
                type="button"
                onClick={() => setShowVisitModal(true)}
                className="px-3 py-1.5 text-xs font-bold cursor-pointer"
              >
                + Tambah Visit
              </Button>
            </div>

            <div className="flex flex-col gap-3 max-h-[450px] overflow-y-auto pr-1">
              {homeVisits.length === 0 ? (
                <div className="py-10 text-center text-slate-400 font-bold text-xs">
                  Belum ada jurnal kunjungan rumah yang dicatat.
                </div>
              ) : (
                homeVisits.map(hv => (
                  <div key={hv.id} className="p-3.5 rounded-[var(--ui-radius-card)] border border-slate-100 bg-slate-50/60 flex flex-col gap-2">
                    <div className="flex justify-between items-center">
                      <span className="font-extrabold text-slate-800 text-xs">{hv.student_name || 'Siswa'}</span>
                      <span className="text-[10px] font-bold text-slate-400">
                        {new Date(hv.visit_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 font-medium leading-relaxed">
                      {hv.result}
                    </p>
                    <div className="text-[10px] font-bold text-slate-400 flex justify-between pt-1 border-t border-slate-200/50">
                      <span>Petugas: {hv.counselor_name || 'Guru BK'}</span>
                      <span>Kelas: {hv.class_name || '-'}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right: Printed Letters Log */}
          <div className="bg-white rounded-[var(--ui-radius-card)] p-5 shadow-xs border border-slate-100 flex flex-col gap-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="font-black text-slate-800 text-sm flex items-center gap-2">
                <FileText size={17} className="text-emerald-600" />
                Surat Panggilan & Surat Peringatan (SP)
              </h3>
              <Button
                type="button"
                onClick={() => setShowLetterModal(true)}
                className="px-3 py-1.5 text-xs font-bold cursor-pointer"
              >
                + Terbitkan Surat
              </Button>
            </div>

            <div className="flex flex-col gap-3 max-h-[450px] overflow-y-auto pr-1">
              {bkLetters.length === 0 ? (
                <div className="py-10 text-center text-slate-400 font-bold text-xs">
                  Belum ada surat panggilan atau SP yang diterbitkan.
                </div>
              ) : (
                bkLetters.map(lettr => (
                  <div key={lettr.id} className="p-3.5 rounded-[var(--ui-radius-card)] border border-slate-100 bg-slate-50/60 flex flex-col gap-2">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-slate-800 text-xs">{lettr.student_name || 'Siswa'}</span>
                        <span className="px-2 py-0.5 rounded-[var(--ui-radius-pill)] text-[9px] font-black bg-emerald-100 text-emerald-800">
                          {lettr.letter_type}
                        </span>
                      </div>
                      <span className="text-[10px] font-bold text-slate-400">
                        {new Date(lettr.issue_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono">No: {lettr.letter_no}</div>
                    <p className="text-xs text-slate-600 font-medium">
                      Alasan: {lettr.reason || '-'}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 4: REKAP & BERKAS 360° ─────────────────────────────────────── */}
      {subTab === 'dossier' && (
        <div className="flex flex-col gap-4 animate-in fade-in duration-200">
          {/* Header Action Bar */}
          <div className="bg-white p-4 rounded-[var(--ui-radius-card)] shadow-xs border border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-3">
            <div className="relative w-full sm:w-80">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari siswa untuk lihat berkas 360°..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border-none rounded-[var(--ui-radius-small)] text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[var(--ui-primary)]"
              />
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleExportExcel}
                className="px-3.5 py-2 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Download size={15} />
                <span>Export Excel</span>
              </Button>
            </div>
          </div>

          {/* Student Dossier Table */}
          <div className="bg-white rounded-[var(--ui-radius-card)] shadow-xs border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-max">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-wider border-b border-slate-100">
                    <th className="px-4 py-3 font-black">NAMA SISWA</th>
                    <th className="px-3 py-3 font-black">KELAS</th>
                    <th className="px-3 py-3 font-black text-center">TOTAL POIN</th>
                    <th className="px-3 py-3 font-black text-center">TINGKAT RESIKO</th>
                    <th className="px-3 py-3 font-black text-center">SESI BK</th>
                    <th className="px-3 py-3 font-black text-center">BERKAS DOSSIER</th>
                  </tr>
                </thead>
                <tbody className="text-xs font-medium text-slate-700 divide-y divide-slate-100">
                  {studentPointsList.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400 font-bold">Tidak ada data siswa ditemukan.</td>
                    </tr>
                  ) : (
                    studentPointsList.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map(s => (
                      <tr key={s.nis} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3">
                          <div className="font-bold text-slate-800">{s.name}</div>
                          <div className="text-[10px] text-slate-400 font-bold">NIS: {s.nis}</div>
                        </td>
                        <td className="px-3 py-3 font-bold text-slate-600">{s.class_name || '-'}</td>
                        <td className="px-3 py-3 text-center font-black text-rose-600 text-sm">
                          {s.total_poin}
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span className={`px-2.5 py-1 rounded-[var(--ui-radius-pill)] text-[10px] font-black ${
                            s.risk_level === 'Tinggi' ? 'bg-rose-100 text-rose-800' :
                            s.risk_level === 'Sedang' ? 'bg-amber-100 text-amber-800' :
                            'bg-emerald-100 text-emerald-800'
                          }`}>
                            {s.risk_level}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-center font-bold text-slate-700">
                          {s.sesi_count}
                        </td>
                        <td className="px-3 py-3 text-center">
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => openDossier(s)}
                            className="px-3 py-1 text-xs font-bold cursor-pointer"
                          >
                            Buka Dossier 360°
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="p-4 border-t border-slate-100">
              <TablePagination
                totalItems={studentPointsList.length}
                itemsPerPage={itemsPerPage}
                currentPage={currentPage}
                onPageChange={setCurrentPage}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: FORM SESI KONSELING ─────────────────────────────────────── */}
      {showSessionModal && (
        <Modal
          isOpen={showSessionModal}
          onClose={() => setShowSessionModal(false)}
          title={editingSession ? "Edit Catatan Sesi Konseling" : "Catat Sesi Konseling Baru"}
        >
          <form onSubmit={handleSaveSession} className="flex flex-col gap-4">
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 block">Pilih Siswa</label>
              <CustomSelect
                value={formSession.student_nis}
                onChange={val => setFormSession({ ...formSession, student_nis: val })}
                options={[
                  { value: '', label: '-- Pilih Siswa --' },
                  ...students.map(s => ({ value: s.nis, label: `${s.name} (${s.class_name || s.nis})` }))
                ]}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 block">Kategori</label>
                <CustomSelect
                  value={formSession.category}
                  onChange={val => setFormSession({ ...formSession, category: val })}
                  options={[
                    { value: 'Kedisiplinan', label: 'Kedisiplinan' },
                    { value: 'Akademik', label: 'Akademik' },
                    { value: 'Pribadi', label: 'Pribadi' },
                    { value: 'Sosial', label: 'Sosial' },
                    { value: 'Karir', label: 'Karir & Kelulusan' }
                  ]}
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 block">Status Sesi</label>
                <CustomSelect
                  value={formSession.status}
                  onChange={val => setFormSession({ ...formSession, status: val })}
                  options={[
                    { value: 'Berjalan', label: 'Berjalan' },
                    { value: 'Follow-up', label: 'Follow-up' },
                    { value: 'Selesai', label: 'Selesai' }
                  ]}
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 block">Deskripsi Permasalahan</label>
              <textarea
                rows={3}
                placeholder="Tuliskan gambaran permasalahan siswa..."
                value={formSession.problem}
                onChange={e => setFormSession({ ...formSession, problem: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-[var(--ui-radius-small)] text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[var(--ui-primary)]"
              />
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 block">Rencana Solusi / Action Plan</label>
              <textarea
                rows={2}
                placeholder="Rencana tindak lanjut / komitmen siswa..."
                value={formSession.solution}
                onChange={e => setFormSession({ ...formSession, solution: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-[var(--ui-radius-small)] text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[var(--ui-primary)]"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <Button type="button" variant="outline" onClick={() => setShowSessionModal(false)}>
                Batal
              </Button>
              <Button type="submit" className="font-bold">
                Simpan Catatan BK
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── MODAL: FORM HOME VISIT ───────────────────────────────────────── */}
      {showVisitModal && (
        <Modal
          isOpen={showVisitModal}
          onClose={() => setShowVisitModal(false)}
          title="Catat Jurnal Kunjungan Rumah (Home Visit)"
        >
          <form onSubmit={handleSaveVisit} className="flex flex-col gap-4">
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 block">Pilih Siswa</label>
              <CustomSelect
                value={formVisit.student_nis}
                onChange={val => setFormVisit({ ...formVisit, student_nis: val })}
                options={[
                  { value: '', label: '-- Pilih Siswa --' },
                  ...students.map(s => ({ value: s.nis, label: `${s.name} (${s.class_name || s.nis})` }))
                ]}
              />
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 block">Tanggal Kunjungan</label>
              <input
                type="date"
                value={formVisit.visit_date}
                onChange={e => setFormVisit({ ...formVisit, visit_date: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-[var(--ui-radius-small)] text-xs font-bold focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 block">Hasil Pertemuan Kunjungan</label>
              <textarea
                rows={3}
                placeholder="Tuliskan hasil diskusi dengan orang tua/wali..."
                value={formVisit.result}
                onChange={e => setFormVisit({ ...formVisit, result: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-[var(--ui-radius-small)] text-xs font-semibold focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <Button type="button" variant="outline" onClick={() => setShowVisitModal(false)}>
                Batal
              </Button>
              <Button type="submit" className="font-bold">
                Simpan Jurnal Home Visit
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── MODAL: FORM SURAT ────────────────────────────────────────────── */}
      {showLetterModal && (
        <Modal
          isOpen={showLetterModal}
          onClose={() => setShowLetterModal(false)}
          title="Terbitkan Surat BK / SP"
        >
          <form onSubmit={handleSaveLetter} className="flex flex-col gap-4">
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 block">Pilih Siswa</label>
              <CustomSelect
                value={formLetter.student_nis}
                onChange={val => setFormLetter({ ...formLetter, student_nis: val })}
                options={[
                  { value: '', label: '-- Pilih Siswa --' },
                  ...students.map(s => ({ value: s.nis, label: `${s.name} (${s.class_name || s.nis})` }))
                ]}
              />
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 block">Jenis Surat</label>
              <CustomSelect
                value={formLetter.letter_type}
                onChange={val => setFormLetter({ ...formLetter, letter_type: val })}
                options={[
                  { value: 'Panggilan Orang Tua', label: 'Panggilan Orang Tua / Wali' },
                  { value: 'SP 1', label: 'Surat Peringatan 1 (SP 1)' },
                  { value: 'SP 2', label: 'Surat Peringatan 2 (SP 2)' },
                  { value: 'SP 3', label: 'Surat Peringatan 3 (SP 3)' }
                ]}
              />
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 block">Alasan Penerbitan Surat</label>
              <textarea
                rows={3}
                placeholder="Tuliskan alasan/keterangan pemanggilan..."
                value={formLetter.reason}
                onChange={e => setFormLetter({ ...formLetter, reason: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-[var(--ui-radius-small)] text-xs font-semibold focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <Button type="button" variant="outline" onClick={() => setShowLetterModal(false)}>
                Batal
              </Button>
              <Button type="submit" className="font-bold">
                Terbitkan Surat
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── MODAL: 360° STUDENT DOSSIER ───────────────────────────────────── */}
      {showDossierModal && dossierStudent && (
        <Modal
          isOpen={showDossierModal}
          onClose={() => setShowDossierModal(false)}
          title={`Berkas 360° BK — ${dossierStudent.name}`}
        >
          <div className="flex flex-col gap-4 max-h-[500px] overflow-y-auto pr-1">
            <div className="p-3 rounded-[var(--ui-radius-small)] bg-slate-50 border border-slate-100 flex justify-between items-center">
              <div>
                <div className="font-black text-slate-800 text-sm">{dossierStudent.name}</div>
                <div className="text-xs text-slate-500 font-bold">Kelas: {dossierStudent.class_name || '-'} • NIS: {dossierStudent.nis}</div>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold text-slate-400 block">Total Poin</span>
                <span className="font-black text-rose-600 text-base">{dossierStudent.total_poin} Poin</span>
              </div>
            </div>

            {/* Riwayat Pelanggaran */}
            <div>
              <h4 className="font-black text-slate-700 text-xs uppercase tracking-wider mb-2">Riwayat Pelanggaran Kedisiplinan</h4>
              {dossierStudent.riwayat_list.length === 0 ? (
                <div className="text-xs text-slate-400 italic">Tidak ada catatan pelanggaran.</div>
              ) : (
                <div className="flex flex-col gap-2">
                  {dossierStudent.riwayat_list.map((r, i) => (
                    <div key={i} className="p-2.5 rounded-[var(--ui-radius-small)] border border-slate-100 bg-white text-xs flex justify-between items-center shadow-2xs">
                      <div>
                        <div className="font-bold text-slate-800">{r.tindakan_nama}</div>
                        <div className="text-[10px] text-slate-400">{new Date(r.tanggal).toLocaleDateString('id-ID')}</div>
                      </div>
                      <span className="font-black text-rose-600">+{r.poin} Poin</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Sesi Konseling BK */}
            <div>
              <h4 className="font-black text-slate-700 text-xs uppercase tracking-wider mb-2">Sesi Bimbingan & Konseling</h4>
              {bkSessions.filter(s => s.student_nis === dossierStudent.nis).length === 0 ? (
                <div className="text-xs text-slate-400 italic">Belum pernah ada sesi konseling.</div>
              ) : (
                <div className="flex flex-col gap-2">
                  {bkSessions.filter(s => s.student_nis === dossierStudent.nis).map((ses, i) => (
                    <div key={i} className="p-2.5 rounded-[var(--ui-radius-small)] border border-slate-100 bg-white text-xs flex flex-col gap-1 shadow-2xs">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-slate-800">{ses.category} ({ses.status})</span>
                        <span className="text-[10px] text-slate-400">{new Date(ses.session_date).toLocaleDateString('id-ID')}</span>
                      </div>
                      <p className="text-slate-600">{ses.problem}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
