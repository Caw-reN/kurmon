import React, { useState, useMemo, useEffect } from 'react';
import { 
  BookOpen, Search, ShieldAlert, CheckCircle2, History, MessageSquare, 
  Download, Users, TrendingUp, AlertOctagon, Printer, X, Trash2, Plus, 
  FileText, Home, Calendar, Clock, AlertTriangle, ShieldCheck, HeartHandshake, 
  Eye, Send, AlertCircle, Edit2, User, Filter, RotateCcw, Award, ChevronRight,
  ExternalLink, Check, Sparkles, UserCheck, PhoneCall, MapPin
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Button, Modal, UISelect, TablePagination } from '../../components/ui.jsx';
import { CustomSelect } from '../../components/CustomSelect.jsx';
import { StatCard, PageHeader } from '../../components/monitoring/ui/index.js';
import useAuthStore from "../../store/monitoring/authStore.js";
import { useAppStore } from "../../store/useAppStore.js";
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

const getInitials = (name) => { if (!name) return '?'; const parts = name.trim().split(' '); if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase(); return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase(); };

export default function DashboardBPBK({ students = [], classes = [], tab = 'ringkasan', onTabChange }) {
  const authToken = useAuthStore(state => state.user?.authToken);
  const user = useAuthStore(state => state.user);
  const storeAppSettings = useAppStore(state => state.appSettings) || {};
  const appSettings = useMemo(() => ({
    kopSuratBaris1: 'PEMERINTAH DAERAH PROVINSI',
    kopSuratBaris2: 'DINAS PENDIDIKAN',
    kopSuratBaris3: 'SEKOLAH MENENGAH KEJURUAN',
    defaultPaperSize: 'a4',
    ...storeAppSettings
  }), [storeAppSettings]);

  // Active view: 'ringkasan' (or 'ews') | 'konseling' | 'surat'
  const currentSubTab = tab === 'ringkasan' || tab === 'ews' ? 'ringkasan' : tab;

  // Helper normalisasi data siswa (payload bisa beda-beda fieldnya)
  const getStudentName = (s) => s?.namaSiswa || s?.name || s?.nama || s?.nama_siswa || s?.nama_lengkap || '-';
  const getStudentNis  = (s) => s?.nis || s?.NIS || s?.code || s?.id || '';
  const getStudentClass = (s) => s?.class_name || s?.kelas || s?.className || '';

  // State data from backend
  const [riwayat, setRiwayat] = useState([]);
  const [bkSessions, setBkSessions] = useState([]);
  const [homeVisits, setHomeVisits] = useState([]);
  const [bkLetters, setBkLetters] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState(null);

  // === SMART FILTERS STATES ===
  const [search, setSearch] = useState("");
  const [filterTingkat, setFilterTingkat] = useState("all"); // 'all' | 'X' | 'XI' | 'XII'
  const [filterJurusan, setFilterJurusan] = useState("all");
  const [filterClass, setFilterClass] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);

  // Modal Class Filter (untuk mempermudah memilih siswa dalam modal)
  const [modalClassFilter, setModalClassFilter] = useState("all");

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
  const [editingLetter, setEditingLetter] = useState(null);
  const [formLetter, setFormLetter] = useState({
    student_nis: '',
    letter_type: 'Panggilan Orang Tua I',
    letter_no: '',
    issue_date: new Date().toISOString().slice(0, 10),
    appointment_date: new Date(Date.now() + 86400000 * 2).toISOString().slice(0, 10),
    appointment_time: '09.00 WIB s/d Selesai',
    appointment_place: 'Ruang Bimbingan & Konseling (BK)',
    appointed_person: 'Guru BK / Koordinator BK',
    reason: ''
  });

  // Dossier 360° Modal
  const [dossierStudent, setDossierStudent] = useState(null);
  const [showDossierModal, setShowDossierModal] = useState(false);
  const [dossierTab, setDossierTab] = useState('pelanggaran'); // 'pelanggaran' | 'konseling' | 'visit' | 'surat'

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
        fetch("/api/kedisiplinan/riwayat?limit=5000", { headers: { "Authorization": `Bearer ${authToken}` } }),
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
  }, [search, filterTingkat, filterJurusan, filterClass, filterCategory, filterStatus, currentSubTab]);

  // === JURUSAN & KELAS OPTIONS ===
  const jurusanList = useMemo(() => {
    const list = new Set();
    classes.forEach(c => {
      if (c.major) list.add(c.major);
      else if (c.name) {
        const parts = c.name.split(' ');
        if (parts.length >= 2) list.add(parts[1]);
      }
    });
    students.forEach(s => {
      const cls = getStudentClass(s);
      if (cls) {
        const parts = cls.split(' ');
        if (parts.length >= 2) list.add(parts[1]);
      }
    });
    return Array.from(list).filter(Boolean).sort();
  }, [classes, students]);

  const classOptions = useMemo(() => {
    let filtered = classes;
    if (filterTingkat !== 'all') {
      filtered = filtered.filter(c => c.name.startsWith(filterTingkat + ' ') || (c.grade && String(c.grade) === filterTingkat));
    }
    if (filterJurusan !== 'all') {
      filtered = filtered.filter(c => c.major === filterJurusan || c.name.includes(` ${filterJurusan} `) || c.name.endsWith(` ${filterJurusan}`));
    }
    return [
      { value: 'all', label: 'Semua Kelas' },
      ...filtered.map(c => ({ value: c.name, label: c.name }))
    ];
  }, [classes, filterTingkat, filterJurusan]);

  const modalClassOptions = useMemo(() => {
    return [
      { value: 'all', label: 'Semua Kelas Siswa' },
      ...classes.map(c => ({ value: c.name, label: c.name }))
    ];
  }, [classes]);

  // Students list filtered for modals
  const modalFilteredStudents = useMemo(() => {
    if (modalClassFilter === 'all') return students;
    return students.filter(s => getStudentClass(s) === modalClassFilter);
  }, [students, modalClassFilter]);

  const modalStudentOptions = useMemo(() => {
    return [
      { value: '', label: '-- Pilih Siswa --' },
      ...modalFilteredStudents.map(s => ({
        value: getStudentNis(s),
        label: `${getStudentName(s)} (${getStudentClass(s) || getStudentNis(s)})`
      }))
    ];
  }, [modalFilteredStudents]);

  // Aggregate student points & BK status
  const studentPointsMap = useMemo(() => {
    const map = {};
    students.forEach(s => {
      const nis = getStudentNis(s);
      if (!nis) return;
      map[nis] = {
        ...s,
        nis,
        name: getStudentName(s),
        class_name: getStudentClass(s),
        total_poin: 0,
        riwayat_list: [],
        sesi_count: 0,
        visit_count: 0,
        letter_count: 0,
        risk_level: 'Rendah'
      };
    });

    // Sum points from riwayat
    riwayat.forEach(r => {
      const nis = String(r.siswa_nis);
      if (map[nis]) {
        map[nis].total_poin += parseInt(r.poin || 0, 10);
        map[nis].riwayat_list.push(r);
      }
    });

    // Count sessions
    bkSessions.forEach(ses => {
      const nis = String(ses.student_nis);
      if (map[nis]) {
        map[nis].sesi_count = (map[nis].sesi_count || 0) + 1;
      }
    });

    // Count home visits
    homeVisits.forEach(hv => {
      const nis = String(hv.student_nis);
      if (map[nis]) {
        map[nis].visit_count = (map[nis].visit_count || 0) + 1;
      }
    });

    // Count letters
    bkLetters.forEach(lt => {
      const nis = String(lt.student_nis);
      if (map[nis]) {
        map[nis].letter_count = (map[nis].letter_count || 0) + 1;
      }
    });

    // Determine risk level
    Object.values(map).forEach(s => {
      if (s.total_poin >= 75 || s.sesi_count >= 5 || s.letter_count >= 2) {
        s.risk_level = 'Tinggi';
      } else if (s.total_poin >= 35 || s.sesi_count >= 2 || s.letter_count >= 1) {
        s.risk_level = 'Sedang';
      } else {
        s.risk_level = 'Rendah';
      }
    });

    return map;
  }, [students, riwayat, bkSessions, homeVisits, bkLetters]);

  // High Risk Students (EWS) - with filters
  const highRiskStudents = useMemo(() => {
    return Object.values(studentPointsMap).filter(s => {
      if (s.risk_level !== 'Tinggi' && s.total_poin < 50) return false;
      
      const cls = s.class_name || '';
      if (filterTingkat !== 'all' && !cls.startsWith(filterTingkat + ' ') && !cls.startsWith(filterTingkat + '-')) return false;
      if (filterJurusan !== 'all' && !cls.includes(` ${filterJurusan} `) && !cls.endsWith(` ${filterJurusan}`)) return false;
      if (filterClass !== 'all' && cls !== filterClass) return false;

      if (search) {
        const q = search.toLowerCase();
        return (
          (s.name && s.name.toLowerCase().includes(q)) ||
          (s.nis && s.nis.toLowerCase().includes(q)) ||
          cls.toLowerCase().includes(q)
        );
      }
      return true;
    }).sort((a, b) => b.total_poin - a.total_poin);
  }, [studentPointsMap, filterTingkat, filterJurusan, filterClass, search]);

  // Filtered Sessions List
  const filteredSessions = useMemo(() => {
    return bkSessions.filter(ses => {
      const student = students.find(s => String(getStudentNis(s)) === String(ses.student_nis));
      if (!student) return false;
      
      const cls = getStudentClass(student) || ses.class_name || '';

      if (filterTingkat !== 'all' && !cls.startsWith(filterTingkat + ' ') && !cls.startsWith(filterTingkat + '-')) return false;
      if (filterJurusan !== 'all' && !cls.includes(` ${filterJurusan} `) && !cls.endsWith(` ${filterJurusan}`)) return false;
      if (filterClass !== 'all' && cls !== filterClass) return false;
      if (filterCategory !== 'all' && ses.category !== filterCategory) return false;
      if (filterStatus !== 'all' && ses.status !== filterStatus) return false;

      if (search) {
        const q = search.toLowerCase();
        return (
          (ses.student_name && ses.student_name.toLowerCase().includes(q)) ||
          (ses.student_nis && ses.student_nis.toLowerCase().includes(q)) ||
          (ses.problem && ses.problem.toLowerCase().includes(q)) ||
          (ses.solution && ses.solution.toLowerCase().includes(q)) ||
          (ses.counselor_name && ses.counselor_name.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [bkSessions, filterTingkat, filterJurusan, filterClass, filterCategory, filterStatus, search, students]);

  // Filtered Home Visits
  const filteredHomeVisits = useMemo(() => {
    return homeVisits.filter(hv => {
      const student = students.find(s => String(getStudentNis(s)) === String(hv.student_nis));
      const cls = student ? getStudentClass(student) : (hv.class_name || '');

      if (filterClass !== 'all' && cls !== filterClass) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          (hv.student_name && hv.student_name.toLowerCase().includes(q)) ||
          (hv.student_nis && hv.student_nis.toLowerCase().includes(q)) ||
          (hv.result && hv.result.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [homeVisits, filterClass, search, students]);

  // Filtered Letters
  const filteredLetters = useMemo(() => {
    return bkLetters.filter(lt => {
      const student = students.find(s => String(getStudentNis(s)) === String(lt.student_nis));
      const cls = student ? getStudentClass(student) : (lt.class_name || '');

      if (filterClass !== 'all' && cls !== filterClass) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          (lt.student_name && lt.student_name.toLowerCase().includes(q)) ||
          (lt.student_nis && lt.student_nis.toLowerCase().includes(q)) ||
          (lt.letter_type && lt.letter_type.toLowerCase().includes(q)) ||
          (lt.letter_no && lt.letter_no.toLowerCase().includes(q)) ||
          (lt.reason && lt.reason.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [bkLetters, filterClass, search, students]);

  // Quick Open Modal with Preselected Student
  const openSessionWithStudent = (student) => {
    const nis = getStudentNis(student);
    const cls = getStudentClass(student);
    setModalClassFilter(cls || 'all');
    setEditingSession(null);
    setFormSession({
      student_nis: nis,
      category: 'Kedisiplinan',
      session_date: new Date().toISOString().slice(0, 10),
      problem: `Pembinaan kedisiplinan siswa terkait akumulasi poin / evaluasi belajar di kelas ${cls}.`,
      solution: '',
      follow_up_date: '',
      status: 'Berjalan',
      privacy_level: 'Terbatas'
    });
    setShowSessionModal(true);
  };

  const openLetterWithStudent = (student) => {
    const nis = getStudentNis(student);
    const cls = getStudentClass(student);
    const totalPoin = student.total_poin || 0;
    setModalClassFilter(cls || 'all');
    setFormLetter({
      student_nis: nis,
      letter_type: totalPoin >= 100 ? 'SP 2' : totalPoin >= 75 ? 'SP 1' : 'Panggilan Orang Tua I',
      letter_no: `421.5/${Math.floor(100 + Math.random() * 900)}/SMK-BK/${new Date().getFullYear()}`,
      issue_date: new Date().toISOString().slice(0, 10),
      appointment_date: new Date(Date.now() + 86400000 * 2).toISOString().slice(0, 10),
      appointment_time: '09.00 WIB s/d Selesai',
      appointment_place: 'Ruang Bimbingan & Konseling (BK)',
      appointed_person: 'Guru BK / Koordinator BK',
      reason: `Koordinasi pembinaan kedisiplinan siswa terkait akumulasi pelanggaran (${totalPoin} poin).`
    });
    setShowLetterModal(true);
  };

  const openVisitWithStudent = (student) => {
    const nis = getStudentNis(student);
    const cls = getStudentClass(student);
    setModalClassFilter(cls || 'all');
    setFormVisit({
      student_nis: nis,
      visit_date: new Date().toISOString().slice(0, 10),
      result: '',
      photo_url: ''
    });
    setShowVisitModal(true);
  };

  const openDossier = (student) => {
    const nis = getStudentNis(student);
    const fullStudentData = studentPointsMap[nis] || student;
    setDossierStudent(fullStudentData);
    setDossierTab('pelanggaran');
    setShowDossierModal(true);
  };

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

      const payload = {
        ...formSession,
        follow_up_date: formSession.follow_up_date?.trim() || null,
        session_date: formSession.session_date?.trim() || new Date().toISOString().slice(0, 10)
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${authToken}` },
        body: JSON.stringify(payload)
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

  // Handle Delete Session
  const handleDeleteSession = async (id) => {
    if (!await window.confirmAsync("Hapus catatan sesi konseling ini?")) return;
    try {
      const res = await fetch(`/api/kedisiplinan/bk/sessions/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${authToken}` }
      });
      const data = await res.json();
      if (data.ok) {
        showToast("Sesi konseling berhasil dihapus");
        fetchData();
      } else {
        showToast(data.error || "Gagal menghapus sesi", "error");
      }
    } catch (err) {
      showToast("Gagal menghapus", "error");
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

  // Handle Delete Visit
  const handleDeleteVisit = async (id) => {
    if (!await window.confirmAsync("Hapus catatan kunjungan rumah ini?")) return;
    try {
      const res = await fetch(`/api/kedisiplinan/bk/home-visits/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${authToken}` }
      });
      const data = await res.json();
      if (data.ok) {
        showToast("Jurnal kunjungan rumah dihapus");
        fetchData();
      } else {
        showToast(data.error || "Gagal menghapus", "error");
      }
    } catch (err) {
      showToast("Gagal menghapus", "error");
    }
  };

  // Handle Save Letter (Surat Panggilan / SP - Create & Edit)
  const handleSaveLetter = async (e) => {
    e.preventDefault();
    if (!formLetter.student_nis) {
      showToast("Pilih siswa terlebih dahulu", "error");
      return;
    }

    try {
      const generatedNo = formLetter.letter_no?.trim() || `421.5/${Math.floor(100 + Math.random() * 900)}/SMK-BK/${new Date().getFullYear()}`;
      const payload = {
        ...formLetter,
        letter_no: generatedNo,
        issue_date: formLetter.issue_date?.trim() || new Date().toISOString().slice(0, 10),
        appointment_date: formLetter.appointment_date?.trim() || null
      };

      const url = editingLetter ? `/api/kedisiplinan/bk/letters/${editingLetter.id}` : "/api/kedisiplinan/bk/letters";
      const method = editingLetter ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${authToken}` },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (data.ok) {
        showToast(editingLetter ? `Surat (${formLetter.letter_type}) berhasil diperbarui!` : `Surat (${formLetter.letter_type}) berhasil diterbitkan!`);
        setShowLetterModal(false);
        setEditingLetter(null);
        fetchData();
        if (data.data) {
          downloadLetterPDF(data.data);
        }
      } else {
        showToast(data.error || "Gagal menyimpan surat", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Terjadi kesalahan koneksi", "error");
    }
  };

  // Handle Delete Letter
  const handleDeleteLetter = async (id) => {
    if (!await window.confirmAsync("Hapus catatan surat ini?")) return;
    try {
      const res = await fetch(`/api/kedisiplinan/bk/letters/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${authToken}` }
      });
      const data = await res.json();
      if (data.ok) {
        showToast("Surat berhasil dihapus");
        fetchData();
      } else {
        showToast(data.error || "Gagal menghapus", "error");
      }
    } catch (err) {
      showToast("Gagal menghapus", "error");
    }
  };

  // Download PDF Surat Resmi BK
  const downloadLetterPDF = (letter) => {
    if (!letter) return;
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: appSettings.defaultPaperSize === 'F4' ? [215, 330] : 'a4'
      });

      const pageWidth = 210;
      const studentName = letter.student_name || 'Siswa Terkait';
      const studentNis = letter.student_nis || '-';
      const className = letter.class_name || '-';
      const letterNo = letter.letter_no || `421.5/082/SMK-BK/${new Date().getFullYear()}`;
      const letterType = letter.letter_type || 'Surat Panggilan Orang Tua';
      const issueDateStr = new Date(letter.issue_date || Date.now()).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
      const appointDateStr = letter.appointment_date 
        ? new Date(letter.appointment_date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
        : 'Hari Kerja Efektif';
      const appointTime = letter.appointment_time || '09.00 WIB s/d Selesai';
      const appointPlace = letter.appointment_place || 'Ruang Bimbingan & Konseling (BK)';
      const appointPerson = letter.appointed_person || 'Guru BK / Koordinator BK';
      const reason = letter.reason || 'Koordinasi pembinaan kedisiplinan dan evaluasi perkembangan belajar siswa.';

      const isSP = letterType.toUpperCase().includes('SP') || letterType.toUpperCase().includes('PERINGATAN');
      const isPerjanjian = letterType.toUpperCase().includes('PERJANJIAN') || letterType.toUpperCase().includes('PERNYATAAN');

      let yPos = 20;

      // Kop Surat
      if (appSettings.useKopSuratGambar && appSettings.kopSuratGambar) {
        try {
          const format = String(appSettings.kopSuratGambar).includes('data:image/jpeg') || String(appSettings.kopSuratGambar).includes('data:image/jpg') ? 'JPEG' : 'PNG';
          doc.addImage(appSettings.kopSuratGambar, format, 15, 10, pageWidth - 30, 28);
        } catch (e) { console.error(e); }
        yPos = 44;
      } else if (appSettings.kopSuratLogo) {
        try {
          const format = String(appSettings.kopSuratLogo).includes('data:image/jpeg') || String(appSettings.kopSuratLogo).includes('data:image/jpg') ? 'JPEG' : 'PNG';
          doc.addImage(appSettings.kopSuratLogo, format, 15, 10, 24, 24);
        } catch (e) { console.error(e); }
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(10);
        doc.text(appSettings.kopSuratBaris1 || "PEMERINTAH DAERAH PROVINSI", pageWidth / 2, 16, { align: "center" });
        doc.setFontSize(13);
        doc.text(appSettings.kopSuratBaris2 || "DINAS PENDIDIKAN", pageWidth / 2, 22, { align: "center" });
        doc.setFontSize(15);
        doc.text(appSettings.kopSuratBaris3 || "LAYANAN BIMBINGAN & KONSELING (BK)", pageWidth / 2, 29, { align: "center" });
        doc.setLineWidth(0.8);
        doc.line(15, 36, pageWidth - 15, 36);
        doc.setLineWidth(0.2);
        doc.line(15, 37, pageWidth - 15, 37);
        yPos = 44;
      } else {
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(11);
        doc.text(appSettings.kopSuratBaris1 || "PEMERINTAH DAERAH / DINAS PENDIDIKAN", pageWidth / 2, 16, { align: "center" });
        doc.setFontSize(13);
        doc.text(appSettings.kopSuratBaris2 || "LAYANAN BIMBINGAN DAN KONSELING (BK)", pageWidth / 2, 22, { align: "center" });
        doc.setFontSize(10);
        doc.setFont("Helvetica", "normal");
        doc.text("Pusat Bimbingan, Konseling & Pemantauan Kedisiplinan Siswa", pageWidth / 2, 27, { align: "center" });
        doc.setLineWidth(0.8);
        doc.line(15, 30, pageWidth - 15, 30);
        doc.setLineWidth(0.2);
        doc.line(15, 31, pageWidth - 15, 31);
        yPos = 38;
      }

      if (isPerjanjian) {
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(13);
        doc.text("SURAT PERNYATAAN & PERJANJIAN KEDISIPLINAN", pageWidth / 2, yPos, { align: "center" });
        doc.setFontSize(10);
        doc.setFont("Helvetica", "normal");
        doc.text(`Nomor: ${letterNo}`, pageWidth / 2, yPos + 5, { align: "center" });
        yPos += 14;

        doc.text("Yang bertanda tangan di bawah ini, saya:", 15, yPos);
        yPos += 7;
        doc.setFont("Helvetica", "bold");
        doc.text("Nama Siswa", 25, yPos);
        doc.setFont("Helvetica", "normal");
        doc.text(`: ${studentName}`, 65, yPos);

        doc.setFont("Helvetica", "bold");
        doc.text("NIS / Kelas", 25, yPos + 6);
        doc.setFont("Helvetica", "normal");
        doc.text(`: ${studentNis} / ${className}`, 65, yPos + 6);

        yPos += 16;
        const textPerjanjian = `Menyatakan dengan sesungguhnya dan penuh kesadaran bahwa saya telah melakukan pelanggaran tata tertib sekolah berupa: "${reason}".\n\nDengan ini saya berjanji dengan sungguh-sungguh untuk:\n1. Menaati dan mematuhi seluruh peraturan serta tata tertib yang berlaku di sekolah.\n2. Tidak akan mengulangi perbuatan pelanggaran tersebut maupun pelanggaran tata tertib lainnya.\n3. Bersungguh-sungguh mengikuti kegiatan pembelajaran dan memperbaiki sikap serta kedisiplinan.\n\nApabila di kemudian hari saya melanggar pernyataan ini, maka saya bersedia menerima sanksi yang lebih berat dari pihak sekolah sampai dengan dikembalikan kepada orang tua / dikeluarkan dari sekolah.`;
        const splitPerjanjian = doc.splitTextToSize(textPerjanjian, pageWidth - 30);
        doc.text(splitPerjanjian, 15, yPos);

        yPos += 68;
        doc.text(`${appSettings.lokasiSurat || 'Di Tempat'}, ${issueDateStr}`, pageWidth - 20, yPos, { align: 'right' });
        yPos += 7;

        doc.text("Mengetahui,", 20, yPos);
        doc.text("Orang Tua / Wali Siswa,", 20, yPos + 5);
        doc.text("Yang Membuat Pernyataan,", pageWidth - 20, yPos + 5, { align: "right" });

        yPos += 24;
        doc.setFont("Helvetica", "bold");
        doc.text("( .......................................... )", 20, yPos);
        doc.text(`( ${studentName} )`, pageWidth - 20, yPos, { align: "right" });

        yPos += 14;
        doc.setFont("Helvetica", "normal");
        doc.text("Guru BK / Wali Kelas,", 20, yPos);
        doc.text("Kepala Sekolah,", pageWidth - 20, yPos, { align: "right" });

        yPos += 22;
        doc.setFont("Helvetica", "bold");
        doc.text(user?.name || user?.username || "( Guru BK )", 20, yPos);
        doc.text(appSettings.namaKepsek || "( .......................................... )", pageWidth - 20, yPos, { align: "right" });

      } else if (isSP) {
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(13);
        doc.text(`SURAT PERINGATAN (${letterType.toUpperCase()})`, pageWidth / 2, yPos, { align: "center" });
        doc.setFontSize(10);
        doc.setFont("Helvetica", "normal");
        doc.text(`Nomor: ${letterNo}`, pageWidth / 2, yPos + 5, { align: "center" });
        yPos += 14;

        doc.text("Berdasarkan evaluasi tata tertib dan catatan buku kedisiplinan siswa, diterbitkan kepada:", 15, yPos);
        yPos += 7;
        doc.setFont("Helvetica", "bold");
        doc.text("Nama Siswa", 25, yPos);
        doc.setFont("Helvetica", "normal");
        doc.text(`: ${studentName}`, 65, yPos);

        doc.setFont("Helvetica", "bold");
        doc.text("NIS / Kelas", 25, yPos + 6);
        doc.setFont("Helvetica", "normal");
        doc.text(`: ${studentNis} / ${className}`, 65, yPos + 6);

        yPos += 16;
        const textSP = `Bahwa siswa tersebut di atas telah melakukan pelanggaran terhadap peraturan dan tata tertib sekolah, yaitu:\n"${reason}".\n\nSehubungan dengan hal tersebut di atas, pihak sekolah memberikan sanksi pembinaan berupa ${letterType.toUpperCase()}.\n\nKami mengingatkan kepada siswa bersangkutan serta orang tua/wali murid agar segera melakukan pembinaan intensif. Apabila setelah diterbitkannya surat peringatan ini siswa tetap tidak menunjukkan perubahan sikap positif, pihak sekolah akan mengambil tindakan tegas berikutnya sesuai regulasi kedisiplinan yang berlaku.`;
        const splitSP = doc.splitTextToSize(textSP, pageWidth - 30);
        doc.text(splitSP, 15, yPos);

        yPos += 60;
        doc.text(`${appSettings.lokasiSurat || 'Di Tempat'}, ${issueDateStr}`, pageWidth - 20, yPos, { align: 'right' });
        yPos += 7;

        doc.text("Mengetahui,", 25, yPos);
        doc.text("Kepala Sekolah,", 25, yPos + 5);
        doc.text("Guru Bimbingan & Konseling (BK),", pageWidth - 25, yPos + 5, { align: "right" });

        yPos += 26;
        doc.setFont("Helvetica", "bold");
        doc.text(appSettings.namaKepsek || "( .................................................... )", 25, yPos);
        doc.text(user?.name || user?.username || "( Guru BK )", pageWidth - 25, yPos, { align: "right" });

        doc.setFont("Helvetica", "normal");
        doc.setFontSize(9);
        if (appSettings.nipKepsek) doc.text(`NIP. ${appSettings.nipKepsek}`, 25, yPos + 4);
        if (user?.nip) doc.text(`NIP. ${user.nip}`, pageWidth - 25, yPos + 4, { align: "right" });

      } else {
        doc.setFont("Helvetica", "normal");
        doc.setFontSize(10);
        doc.text("Nomor", 15, yPos);
        doc.text(`: ${letterNo}`, 35, yPos);
        doc.text("Lampiran", 15, yPos + 5);
        doc.text(": -", 35, yPos + 5);
        doc.text("Perihal", 15, yPos + 10);
        doc.setFont("Helvetica", "bold");
        doc.text(`: ${letterType.toUpperCase()}`, 35, yPos + 10);

        doc.setFont("Helvetica", "normal");
        doc.text(`${appSettings.lokasiSurat || 'Di Tempat'}, ${issueDateStr}`, pageWidth - 15, yPos, { align: 'right' });

        yPos += 18;
        doc.text("Kepada Yth.", 15, yPos);
        doc.setFont("Helvetica", "bold");
        doc.text("Bapak / Ibu Orang Tua / Wali Siswa", 15, yPos + 5);
        doc.setFont("Helvetica", "normal");
        doc.text("di Tempat", 15, yPos + 10);

        yPos += 18;
        doc.text("Dengan hormat,", 15, yPos);
        yPos += 6;
        const paragraf1 = "Sehubungan dengan perkembangan pembinaan ketertiban dan kedisiplinan putra/putri Bapak/Ibu di sekolah, dengan ini kami mengharap kehadiran Bapak/Ibu pada:";
        const splitParagraf1 = doc.splitTextToSize(paragraf1, pageWidth - 30);
        doc.text(splitParagraf1, 15, yPos);

        yPos += 12;
        doc.setFont("Helvetica", "bold");
        doc.text("Nama Siswa", 25, yPos);
        doc.setFont("Helvetica", "normal");
        doc.text(`: ${studentName}`, 60, yPos);

        doc.setFont("Helvetica", "bold");
        doc.text("NIS / Kelas", 25, yPos + 6);
        doc.setFont("Helvetica", "normal");
        doc.text(`: ${studentNis} / ${className}`, 60, yPos + 6);

        yPos += 14;
        doc.setFont("Helvetica", "bold");
        doc.text("Hari / Tanggal", 25, yPos);
        doc.setFont("Helvetica", "normal");
        doc.text(`: ${appointDateStr}`, 60, yPos);

        doc.setFont("Helvetica", "bold");
        doc.text("Waktu / Pukul", 25, yPos + 6);
        doc.setFont("Helvetica", "normal");
        doc.text(`: ${appointTime}`, 60, yPos + 6);

        doc.setFont("Helvetica", "bold");
        doc.text("Tempat", 25, yPos + 12);
        doc.setFont("Helvetica", "normal");
        doc.text(`: ${appointPlace}`, 60, yPos + 12);

        doc.setFont("Helvetica", "bold");
        doc.text("Menghadap", 25, yPos + 18);
        doc.setFont("Helvetica", "normal");
        doc.text(`: ${appointPerson}`, 60, yPos + 18);

        doc.setFont("Helvetica", "bold");
        doc.text("Keperluan", 25, yPos + 24);
        doc.setFont("Helvetica", "normal");
        const splitReason = doc.splitTextToSize(`: ${reason}`, pageWidth - 75);
        doc.text(splitReason, 60, yPos + 24);

        yPos += (splitReason.length * 5) + 26;
        const paragrafPenutup = "Mengingat pentingnya koordinasi ini demi kebaikan dan kelancaran pendidikan putra/putri Bapak/Ibu, kami sangat mengharapkan kehadiran Bapak/Ibu tepat pada waktunya. Atas perhatian dan kerja sama yang baik, kami ucapkan terima kasih.";
        const splitPenutup = doc.splitTextToSize(paragrafPenutup, pageWidth - 30);
        doc.text(splitPenutup, 15, yPos);

        yPos += 20;
        doc.text("Mengetahui,", 25, yPos);
        doc.text("Kepala Sekolah,", 25, yPos + 5);
        doc.text("Guru Bimbingan & Konseling (BK),", pageWidth - 25, yPos + 5, { align: "right" });

        yPos += 26;
        doc.setFont("Helvetica", "bold");
        doc.text(appSettings.namaKepsek || "( .................................................... )", 25, yPos);
        doc.text(user?.name || user?.username || "( Guru BK )", pageWidth - 25, yPos, { align: "right" });

        doc.setFont("Helvetica", "normal");
        doc.setFontSize(9);
        if (appSettings.nipKepsek) doc.text(`NIP. ${appSettings.nipKepsek}`, 25, yPos + 4);
        if (user?.nip) doc.text(`NIP. ${user.nip}`, pageWidth - 25, yPos + 4, { align: "right" });
      }

      const cleanFileName = `${letterType.replace(/[^a-zA-Z0-9]/g, '_')}_${studentName.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
      doc.save(cleanFileName);
      showToast("File PDF Surat resmi berhasil diunduh!");
    } catch (e) {
      console.error(e);
      showToast("Gagal menghasilkan file PDF surat", "error");
    }
  };

  // Export Excel Data Konseling
  const handleExportExcel = () => {
    try {
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet('Catatan Konseling BK');
      
      ws.columns = [
        { header: 'No', key: 'no', width: 6 },
        { header: 'Tanggal Sesi', key: 'session_date', width: 14 },
        { header: 'NIS Siswa', key: 'student_nis', width: 14 },
        { header: 'Nama Siswa', key: 'student_name', width: 28 },
        { header: 'Kelas', key: 'class_name', width: 16 },
        { header: 'Kategori', key: 'category', width: 18 },
        { header: 'Deskripsi Masalah', key: 'problem', width: 35 },
        { header: 'Rencana Solusi / Tindak Lanjut', key: 'solution', width: 35 },
        { header: 'Status', key: 'status', width: 14 },
        { header: 'Konselor / Guru BK', key: 'counselor_name', width: 22 }
      ];

      filteredSessions.forEach((ses, idx) => {
        ws.addRow({
          no: idx + 1,
          session_date: ses.session_date ? new Date(ses.session_date).toLocaleDateString('id-ID') : '-',
          student_nis: ses.student_nis,
          student_name: ses.student_name || '-',
          class_name: ses.class_name || '-',
          category: ses.category,
          problem: ses.problem || '-',
          solution: ses.solution || '-',
          status: ses.status,
          counselor_name: ses.counselor_name || 'Guru BK'
        });
      });

      ws.getRow(1).font = { bold: true };
      wb.xlsx.writeBuffer().then(buf => {
        saveAs(new Blob([buf]), `Rekap_Sesi_Konseling_BK_${new Date().toISOString().slice(0,10)}.xlsx`);
        showToast("Rekap sesi konseling berhasil diexport ke Excel!");
      });
    } catch (e) {
      console.error(e);
      showToast("Gagal export excel", "error");
    }
  };

  return (
    <div className="flex flex-col gap-4 sm:gap-5 w-full pb-10">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-[var(--ui-radius-small)] shadow-sm font-bold text-xs flex items-center gap-2 ${
          toast.type === 'error' ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'
        }`}>
          {toast.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* ── TOP ACTION BAR & SHORTCUTS ─────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 bg-white p-3 rounded-[var(--ui-radius-card)] border border-slate-200/80 shadow-xs">
        <button
          type="button"
          onClick={() => {
            setModalClassFilter('all');
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
          className="flex items-center justify-center gap-2.5 p-3 rounded-[var(--ui-radius-small)] bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200/80 transition-all font-black text-xs cursor-pointer shadow-xs active:scale-98 text-left"
        >
          <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Plus size={16} strokeWidth={2.5} />
          </div>
          <div className="min-w-0">
            <span className="block font-black text-xs text-emerald-950">+ Catat Sesi Konseling</span>
            <span className="block text-[10px] text-emerald-700 font-medium">Bimbingan belajar, karir &amp; tata tertib</span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => {
            setModalClassFilter('all');
            setFormVisit({
              student_nis: '',
              visit_date: new Date().toISOString().slice(0, 10),
              result: '',
              photo_url: ''
            });
            setShowVisitModal(true);
          }}
          className="flex items-center justify-center gap-2.5 p-3 rounded-[var(--ui-radius-small)] bg-sky-50 hover:bg-sky-100 text-sky-900 border border-sky-200/80 transition-all font-black text-xs cursor-pointer shadow-xs active:scale-98 text-left"
        >
          <div className="w-8 h-8 rounded-full bg-sky-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Home size={15} strokeWidth={2.5} />
          </div>
          <div className="min-w-0">
            <span className="block font-black text-xs text-sky-950">+ Kunjungan Rumah (Home Visit)</span>
            <span className="block text-[10px] text-sky-700 font-medium">Jurnal verifikasi domisili &amp; koordinasi ortu</span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => {
            setModalClassFilter('all');
            setFormLetter({
              student_nis: '',
              letter_type: 'Panggilan Orang Tua I',
              letter_no: `421.5/${Math.floor(100 + Math.random() * 900)}/SMK-BK/${new Date().getFullYear()}`,
              issue_date: new Date().toISOString().slice(0, 10),
              appointment_date: new Date(Date.now() + 86400000 * 2).toISOString().slice(0, 10),
              appointment_time: '09.00 WIB s/d Selesai',
              appointment_place: 'Ruang Bimbingan & Konseling (BK)',
              appointed_person: 'Guru BK / Koordinator BK',
              reason: ''
            });
            setShowLetterModal(true);
          }}
          className="flex items-center justify-center gap-2.5 p-3 rounded-[var(--ui-radius-small)] bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200/80 transition-all font-black text-xs cursor-pointer shadow-xs active:scale-98 text-left"
        >
          <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Printer size={15} strokeWidth={2.5} />
          </div>
          <div className="min-w-0">
            <span className="block font-black text-xs text-purple-950">+ Terbitkan Surat / SP</span>
            <span className="block text-[10px] text-purple-700 font-medium">Panggilan orang tua &amp; surat perjanjian</span>
          </div>
        </button>
      </div>

      {/* ── TAB 1: DASHBOARD RINGKASAN & EARLY WARNING SYSTEM (EWS) ────────────────── */}
      {currentSubTab === 'ringkasan' && (
        <div className="flex flex-col gap-4 sm:gap-5 animate-in fade-in duration-200">
          {/* Stat Cards Row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
            <StatCard
              label="Kasus / Sesi Aktif"
              value={bkSessions.filter(s => s.status === 'Berjalan' || s.status === 'Follow-up').length}
              sub="Perlu penanganan"
              icon={Clock}
              iconBg="bg-amber-50"
              iconColor="text-amber-600"
              className="p-3 sm:p-5"
            />
            <StatCard
              label="Siswa Resiko Tinggi (EWS)"
              value={Object.values(studentPointsMap).filter(s => s.risk_level === 'Tinggi').length}
              sub="Poin > 75 / > 5 Sesi"
              icon={ShieldAlert}
              iconBg="bg-rose-50"
              iconColor="text-rose-600"
              className="p-3 sm:p-5"
            />
            <StatCard
              label="Kunjungan Rumah"
              value={homeVisits.length}
              sub="Home visit terlaksana"
              icon={Home}
              iconBg="bg-sky-50"
              iconColor="text-sky-600"
              className="p-3 sm:p-5"
            />
            <StatCard
              label="Surat Ortu & SP"
              value={bkLetters.length}
              sub="Surat Panggilan & SP"
              icon={FileText}
              iconBg="bg-emerald-50"
              iconColor="text-emerald-600"
              className="p-3 sm:p-5"
            />
          </div>

          {/* Early Warning System & Category Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Left Col: EWS List */}
            <div className="lg:col-span-2 bg-white rounded-[var(--ui-radius-card)] p-4 sm:p-5 shadow-xs border border-slate-200/80 flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2.5 pb-3 border-b border-slate-100">
                <div>
                  <h3 className="font-black text-slate-800 text-sm flex items-center gap-2">
                    <AlertTriangle size={18} className="text-amber-500" />
                    <span>Early Warning System (Poin Pelanggaran Ambang Batas SP)</span>
                  </h3>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Daftar siswa yang memerlukan intervensi bimbingan konseling dan panggilan orang tua.
                  </p>
                </div>
                <span className="text-[11px] font-black px-2.5 py-1 rounded-[var(--ui-radius-pill)] bg-rose-100 text-rose-800 border border-rose-200 shrink-0 self-start sm:self-auto">
                  {highRiskStudents.length} Siswa Teridentifikasi
                </span>
              </div>

              {/* Filter Bar EWS */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 bg-slate-50/70 p-2.5 rounded-[var(--ui-radius-small)] border border-slate-200/60">
                <div className="relative sm:col-span-1">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Cari siswa di EWS..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-[var(--ui-radius-small)] text-xs font-semibold focus:outline-none"
                  />
                </div>
                <div className="sm:col-span-1">
                  <CustomSelect
                    options={[
                      { value: 'all', label: 'Semua Tingkat' },
                      { value: 'X', label: 'Kelas X' },
                      { value: 'XI', label: 'Kelas XI' },
                      { value: 'XII', label: 'Kelas XII' }
                    ]}
                    value={filterTingkat}
                    onChange={v => { setFilterTingkat(v); setFilterClass('all'); }}
                    placeholder="Tingkat"
                  />
                </div>
                <div className="sm:col-span-1">
                  <CustomSelect
                    options={[
                      { value: 'all', label: 'Semua Jurusan' },
                      ...Array.from(new Set(classes.map(c => c.major || (c.name.split(' ').length >= 2 ? c.name.split(' ')[1] : null)))).filter(Boolean).sort().map(j => ({ value: j, label: j }))
                    ]}
                    value={filterJurusan}
                    onChange={v => { setFilterJurusan(v); setFilterClass('all'); }}
                    placeholder="Jurusan"
                  />
                </div>
                <div className="sm:col-span-1">
                  <CustomSelect
                    options={classOptions}
                    value={filterClass}
                    onChange={setFilterClass}
                    placeholder="Semua Kelas"
                  />
                </div>
              </div>

              {highRiskStudents.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center text-center gap-3 bg-gradient-to-b from-slate-50/50 to-emerald-50/20 rounded-[var(--ui-radius-card)] border border-slate-100/80 my-1">
                  <div className="w-14 h-14 rounded-[var(--ui-radius-card)] bg-emerald-100/80 text-emerald-600 border border-emerald-200/80 flex items-center justify-center shadow-xs">
                    <ShieldCheck size={28} strokeWidth={2.2} />
                  </div>
                  <div className="max-w-md space-y-1">
                    <h4 className="font-extrabold text-slate-800 text-sm">Kondisi Siswa Terkendali &amp; Aman</h4>
                    <p className="text-xs text-slate-500 font-medium leading-relaxed">
                      Sangat baik! Tidak ada siswa dalam kategori resiko tinggi sesuai filter saat ini.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-2.5 max-h-[480px] overflow-y-auto pr-1 custom-scrollbar">
                  {highRiskStudents.map(st => (
                    <div 
                      key={st.nis}
                      className="p-3.5 rounded-[var(--ui-radius-small)] border border-slate-200/80 bg-white hover:bg-slate-50/80 transition-all flex flex-col sm:flex-row justify-between sm:items-center gap-3 shadow-xs"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-11 h-11 rounded-[var(--ui-radius-small)] flex flex-col items-center justify-center font-black text-xs shrink-0 border ${
                          st.total_poin >= 100 ? 'bg-rose-600 text-white border-rose-700 shadow-xs' :
                          st.total_poin >= 75 ? 'bg-rose-100 text-rose-800 border-rose-200' : 'bg-amber-100 text-amber-800 border-amber-200'
                        }`}>
                          <span className="text-sm leading-none font-black">{st.total_poin}</span>
                          <span className="text-[8.5px] font-bold opacity-80 uppercase">Poin</span>
                        </div>
                        <div className="min-w-0">
                          <div className="font-extrabold text-slate-800 text-xs sm:text-sm flex items-center gap-2 truncate">
                            <span className="truncate">{st.name}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded-[var(--ui-radius-pill)] bg-slate-100 font-black text-slate-600 border border-slate-200 shrink-0">
                              {st.class_name || 'Tanpa Kelas'}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 font-semibold mt-0.5 flex items-center gap-2">
                            <span>NIS: {st.nis}</span>
                            <span>•</span>
                            <span>{st.riwayat_list.length} Pelanggaran</span>
                            <span>•</span>
                            <span className="text-violet-600">{st.sesi_count} Sesi BK</span>
                          </div>
                        </div>
                      </div>

                      {/* Action buttons on student card */}
                      <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                        <button
                          type="button"
                          onClick={() => openSessionWithStudent(st)}
                          className="px-2.5 py-1.5 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 rounded-[var(--ui-radius-small)] text-xs font-bold transition-all border border-emerald-200 cursor-pointer flex items-center gap-1 shadow-xs"
                          title="Catat sesi konseling untuk siswa ini"
                        >
                          <Plus size={13} />
                          <span>Sesi BK</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => openLetterWithStudent(st)}
                          className="px-2.5 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-[var(--ui-radius-small)] text-xs font-bold transition-all border border-rose-200 cursor-pointer flex items-center gap-1 shadow-xs"
                          title="Terbitkan surat panggilan/SP"
                        >
                          <FileText size={13} />
                          <span>{st.total_poin >= 75 ? 'Terbit SP' : 'Surat Ortu'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => openDossier(st)}
                          className="px-2.5 py-1.5 bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 rounded-[var(--ui-radius-small)] text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shadow-xs"
                          title="Lihat berkas lengkap siswa"
                        >
                          <Eye size={13} />
                          <span>Dossier</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right Col: Category Distribution & BK Quick Summary */}
            <div className="bg-white rounded-[var(--ui-radius-card)] p-4 sm:p-5 shadow-xs border border-slate-200/80 flex flex-col gap-4">
              <h3 className="font-black text-slate-800 text-sm flex items-center gap-2 pb-3 border-b border-slate-100">
                <TrendingUp size={17} className="text-[var(--ui-primary)]" />
                <span>Distribusi Kategori Konseling</span>
              </h3>

              <div className="flex flex-col gap-3.5">
                {[
                  { label: 'Kedisiplinan & Tata Tertib', gradient: 'from-rose-500 to-pink-500', count: bkSessions.filter(s => s.category === 'Kedisiplinan').length },
                  { label: 'Akademik & Nilai Belajar', gradient: 'from-sky-500 to-sky-500', count: bkSessions.filter(s => s.category === 'Akademik').length },
                  { label: 'Pribadi & Sosial Remaja', gradient: 'from-amber-500 to-orange-500', count: bkSessions.filter(s => s.category === 'Pribadi' || s.category === 'Sosial').length },
                  { label: 'Karir, Minat & Kelulusan', gradient: 'from-emerald-500 to-teal-500', count: bkSessions.filter(s => s.category === 'Karir').length }
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
                        <div className={`h-full rounded-full bg-gradient-to-r ${cat.gradient} transition-all duration-500`} style={{ width: `${pct > 0 ? Math.max(pct, 4) : 0}%` }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-auto pt-4 border-t border-slate-100 flex flex-col gap-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Informasi Penting BK</span>
                <div className="p-3 bg-slate-50 rounded-[var(--ui-radius-small)] border border-slate-200/80 text-xs text-slate-600 leading-relaxed font-medium space-y-1.5">
                  <p>• <strong>Poin Ambang Batas:</strong> Poin &gt; 35 memerlukan teguran, poin &gt; 75 wajib diterbitkan SP 1 / Panggilan Orang Tua.</p>
                  <p>• <strong>Dossier 360°:</strong> Klik tombol Dossier pada siswa mana pun untuk melihat rekam jejak kedisiplinan dan absensi lengkap.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: SESI KONSELING ─────────────────────────────────────────── */}
      {currentSubTab === 'konseling' && (
        <div className="flex flex-col gap-4 animate-in fade-in duration-200">
          {/* Header Action & Smart Filter Bar */}
          <div className="bg-white p-3.5 sm:p-4 rounded-[var(--ui-radius-card)] shadow-xs border border-slate-200/80 flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2.5">
              <div className="flex items-center gap-2.5">
                <div 
                  className="w-9 h-9 rounded-[var(--ui-radius-small)] flex items-center justify-center text-white shrink-0 shadow-xs"
                  style={{ background: "var(--ui-primary)" }}
                >
                  <MessageSquare size={16} strokeWidth={2.2} />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-800 text-xs sm:text-sm tracking-tight">Jurnal Sesi Bimbingan &amp; Konseling</h3>
                  <p className="text-[10px] sm:text-[11px] font-semibold text-slate-400">
                    {filteredSessions.length} catatan sesi konseling tercatat
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  type="button"
                  onClick={() => {
                    setModalClassFilter('all');
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
                  className="px-3.5 py-2 text-xs font-black flex items-center justify-center gap-1.5 shadow-xs cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white rounded-[var(--ui-radius-small)]"
                >
                  <Plus size={14} strokeWidth={2.5} />
                  <span>+ Catat Sesi Baru</span>
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={handleExportExcel}
                  className="px-3 py-2 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs bg-white text-slate-700"
                >
                  <Download size={13} />
                  <span>Export Excel</span>
                </Button>
              </div>
            </div>

            {/* Smart Filters Grid: Tingkat, Jurusan, Kelas, Kategori, Status, Search */}
            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-2 border-t border-slate-100">
              <div className="relative lg:col-span-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari siswa / masalah..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-[var(--ui-radius-small)] text-xs font-semibold focus:outline-none focus:bg-white"
                />
              </div>

              <div>
                <CustomSelect
                  value={filterTingkat}
                  onChange={v => { setFilterTingkat(v); setFilterClass('all'); }}
                  options={[
                    { value: 'all', label: 'Semua Tingkat' },
                    { value: 'X', label: 'Kelas X' },
                    { value: 'XI', label: 'Kelas XI' },
                    { value: 'XII', label: 'Kelas XII' }
                  ]}
                  placeholder="Tingkat"
                />
              </div>

              <div>
                <CustomSelect
                  options={[
                    { value: 'all', label: 'Semua Jurusan' },
                    ...Array.from(new Set(classes.map(c => c.major || (c.name.split(' ').length >= 2 ? c.name.split(' ')[1] : null)))).filter(Boolean).sort().map(j => ({ value: j, label: j }))
                  ]}
                  value={filterJurusan}
                  onChange={v => { setFilterJurusan(v); setFilterClass('all'); }}
                  placeholder="Jurusan"
                />
              </div>

              <div>
                <CustomSelect
                  value={filterClass}
                  onChange={setFilterClass}
                  options={classOptions}
                  placeholder="Semua Kelas"
                />
              </div>

              <div>
                <CustomSelect
                  value={filterCategory}
                  onChange={setFilterCategory}
                  options={[
                    { value: 'all', label: 'Semua Kategori' },
                    { value: 'Kedisiplinan', label: 'Kedisiplinan' },
                    { value: 'Akademik', label: 'Akademik' },
                    { value: 'Pribadi', label: 'Pribadi' },
                    { value: 'Sosial', label: 'Sosial' },
                    { value: 'Karir', label: 'Karir' }
                  ]}
                />
              </div>

              <div>
                <CustomSelect
                  value={filterStatus}
                  onChange={setFilterStatus}
                  options={[
                    { value: 'all', label: 'Semua Status' },
                    { value: 'Berjalan', label: 'Berjalan' },
                    { value: 'Follow-up', label: 'Follow-up' },
                    { value: 'Selesai', label: 'Selesai' }
                  ]}
                />
              </div>
            </div>
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block bg-white rounded-[var(--ui-radius-card)] shadow-xs border border-slate-200/80 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-max">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-wider border-b border-slate-100">
                    <th className="px-4 py-3 font-black">NAMA SISWA</th>
                    <th className="px-3 py-3 font-black">KATEGORI</th>
                    <th className="px-3 py-3 font-black">TANGGAL SESI</th>
                    <th className="px-4 py-3 font-black">PERMASALAHAN &amp; TINDAK LANJUT</th>
                    <th className="px-3 py-3 font-black text-center">STATUS</th>
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
                      <td colSpan={7} className="py-12 text-center text-slate-400 font-bold">Belum ada catatan sesi konseling yang cocok.</td>
                    </tr>
                  ) : (
                    filteredSessions.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map(ses => (
                      <tr key={ses.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-extrabold text-slate-800">{ses.student_name || 'Siswa'}</div>
                          <div className="text-[10px] text-slate-400 font-bold">
                            {ses.class_name || '-'} • NIS: {ses.student_nis}
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <span className="px-2 py-0.5 rounded-[var(--ui-radius-pill)] text-[10px] font-black bg-slate-100 text-slate-700 border border-slate-200">
                            {ses.category}
                          </span>
                        </td>
                        <td className="px-3 py-3 font-semibold text-slate-500">
                          {new Date(ses.session_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="px-4 py-3 max-w-xs">
                          <div className="font-bold text-slate-800 truncate" title={ses.problem}>{ses.problem}</div>
                          {ses.solution && <div className="text-[10px] text-slate-400 truncate mt-0.5" title={ses.solution}>Solusi: {ses.solution}</div>}
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span className={`px-2.5 py-1 rounded-[var(--ui-radius-pill)] text-[10px] font-black border ${
                            ses.status === 'Selesai' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
                            ses.status === 'Follow-up' ? 'bg-amber-100 text-amber-800 border-amber-200' :
                            'bg-sky-100 text-sky-800 border-sky-200'
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
                                const st = students.find(s => String(getStudentNis(s)) === String(ses.student_nis));
                                if (st) openDossier(st);
                              }}
                              className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-[var(--ui-radius-small)] transition-all border border-slate-200 cursor-pointer shadow-xs bg-white"
                              title="Buka Dossier 360°"
                            >
                              <Eye size={13} />
                            </button>
                            <button
                              onClick={() => {
                                const st = students.find(s => String(getStudentNis(s)) === String(ses.student_nis));
                                setModalClassFilter(st ? getStudentClass(st) : 'all');
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
                              className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-[var(--ui-radius-small)] transition-all border border-slate-200 cursor-pointer shadow-xs bg-white"
                              title="Edit Sesi"
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              onClick={() => handleDeleteSession(ses.id)}
                              className="p-1.5 hover:bg-rose-50 text-rose-600 rounded-[var(--ui-radius-small)] transition-all border border-rose-200 cursor-pointer shadow-xs bg-white"
                              title="Hapus Sesi"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Card List View */}
          <div className="md:hidden flex flex-col gap-3">
            {isLoading ? (
              <div className="bg-white rounded-[var(--ui-radius-card)] p-8 text-center text-slate-400 font-bold text-xs shadow-xs border border-slate-100">
                Memuat data sesi konseling...
              </div>
            ) : filteredSessions.length === 0 ? (
              <div className="bg-white rounded-[var(--ui-radius-card)] p-8 text-center text-slate-400 font-bold text-xs shadow-xs border border-slate-100">
                Belum ada catatan sesi konseling.
              </div>
            ) : (
              filteredSessions.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map(ses => (
                <div 
                  key={ses.id}
                  className="bg-white rounded-[var(--ui-radius-card)] p-3.5 shadow-xs border border-slate-200/80 flex flex-col gap-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-extrabold text-slate-800 text-xs leading-snug">{ses.student_name || 'Siswa'}</h4>
                      <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                        NIS: {ses.student_nis} • {ses.class_name || 'Tanpa Kelas'}
                      </p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-[var(--ui-radius-pill)] text-[9.5px] font-black shrink-0 ${
                      ses.status === 'Selesai' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200/70' :
                      ses.status === 'Follow-up' ? 'bg-amber-100 text-amber-800 border border-amber-200/70' :
                      'bg-sky-100 text-sky-800 border border-sky-200/70'
                    }`}>
                      {ses.status}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 text-[10.5px]">
                    <span className="px-2 py-0.5 rounded-[var(--ui-radius-pill)] font-bold bg-slate-100 text-slate-700">
                      {ses.category}
                    </span>
                    <span className="text-slate-400 font-medium flex items-center gap-1">
                      <Calendar size={11} className="text-slate-400" />
                      {new Date(ses.session_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>

                  <div className="p-2.5 bg-slate-50/80 rounded-[var(--ui-radius-small)] border border-slate-100 text-xs">
                    <p className="font-semibold text-slate-700 leading-relaxed">
                      <span className="font-bold text-slate-900 block text-[10px] uppercase tracking-wider text-slate-400 mb-0.5">Permasalahan</span>
                      {ses.problem}
                    </p>
                    {ses.solution && (
                      <p className="font-semibold text-slate-600 leading-relaxed mt-2 pt-2 border-t border-slate-200/50">
                        <span className="font-bold text-slate-900 block text-[10px] uppercase tracking-wider text-slate-400 mb-0.5">Rencana Tindak Lanjut</span>
                        {ses.solution}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[10.5px]">
                    <span className="text-slate-400 font-semibold">Konselor: {ses.counselor_name || 'Guru BK'}</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          const st = students.find(s => String(getStudentNis(s)) === String(ses.student_nis));
                          if (st) openDossier(st);
                        }}
                        className="px-2 py-1 text-slate-600 bg-slate-100 rounded text-xs font-bold"
                      >
                        Dossier
                      </button>
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
                        className="p-1 text-slate-600"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        onClick={() => handleDeleteSession(ses.id)}
                        className="p-1 text-rose-600"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Pagination Container */}
          <div className="p-3.5 bg-white rounded-[var(--ui-radius-card)] shadow-xs border border-slate-200/80">
            <TablePagination
              totalItems={filteredSessions.length}
              itemsPerPage={itemsPerPage}
              currentPage={currentPage}
              onPageChange={setCurrentPage}
            />
          </div>
        </div>
      )}

      {/* ── TAB 3: SURAT & HOME VISIT ───────────────────────────────────────── */}
      {currentSubTab === 'surat' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 animate-in fade-in duration-200">
          {/* Left: Home Visit Log */}
          <div className="bg-white rounded-[var(--ui-radius-card)] p-4 sm:p-5 shadow-xs border border-slate-200/80 flex flex-col gap-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-[var(--ui-radius-small)] bg-sky-100 text-sky-700 flex items-center justify-center font-bold">
                  <Home size={16} />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-800 text-xs sm:text-sm">Jurnal Kunjungan Rumah (Home Visit)</h3>
                  <p className="text-[10px] text-slate-400 font-semibold">{filteredHomeVisits.length} kunjungan tercatat</p>
                </div>
              </div>
              <Button
                type="button"
                onClick={() => {
                  setModalClassFilter('all');
                  setFormVisit({
                    student_nis: '',
                    visit_date: new Date().toISOString().slice(0, 10),
                    result: '',
                    photo_url: ''
                  });
                  setShowVisitModal(true);
                }}
                className="px-3 py-1.5 text-xs font-black cursor-pointer bg-sky-600 hover:bg-sky-700 text-white rounded-[var(--ui-radius-small)] shadow-xs"
              >
                + Tambah Visit
              </Button>
            </div>

            <div className="flex flex-col gap-3 max-h-[520px] overflow-y-auto pr-1 custom-scrollbar">
              {filteredHomeVisits.length === 0 ? (
                <div className="py-12 text-center text-slate-400 font-bold text-xs flex flex-col items-center gap-2">
                  <Home size={28} className="text-slate-300" />
                  <span>Belum ada jurnal kunjungan rumah yang dicatat.</span>
                </div>
              ) : (
                filteredHomeVisits.map(hv => (
                  <div key={hv.id} className="p-3.5 rounded-[var(--ui-radius-card)] border border-slate-200/80 bg-slate-50/70 hover:bg-slate-50 flex flex-col gap-2.5 transition-all shadow-xs">
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <div className="font-black text-slate-900 text-xs sm:text-sm">{hv.student_name || 'Siswa'}</div>
                        <div className="text-[10px] font-bold text-slate-500">Kelas: {hv.class_name || '-'} • NIS: {hv.student_nis}</div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold text-sky-700 bg-sky-100 px-2 py-0.5 rounded-[var(--ui-radius-pill)]">
                          {new Date(hv.visit_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDeleteVisit(hv.id)}
                          className="p-1.5 rounded-[var(--ui-radius-small)] text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-all border-none bg-transparent cursor-pointer"
                          title="Hapus Kunjungan Rumah"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    <div className="p-2.5 bg-white rounded-[var(--ui-radius-small)] border border-slate-100 text-xs text-slate-700 leading-relaxed font-medium">
                      {hv.result}
                    </div>

                    <div className="text-[10px] font-bold text-slate-400 flex items-center justify-between pt-1 border-t border-slate-200/50">
                      <span className="flex items-center gap-1">
                        <User size={11} className="text-slate-400" />
                        <span>Petugas: <strong className="text-slate-600">{hv.counselor_name || 'Guru BK'}</strong></span>
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right: Printed Letters Log */}
          <div className="bg-white rounded-[var(--ui-radius-card)] p-4 sm:p-5 shadow-xs border border-slate-200/80 flex flex-col gap-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-[var(--ui-radius-small)] bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                  <FileText size={16} />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-800 text-xs sm:text-sm">Surat Panggilan &amp; SP</h3>
                  <p className="text-[10px] text-slate-400 font-semibold">{filteredLetters.length} surat diterbitkan</p>
                </div>
              </div>
              <Button
                type="button"
                onClick={() => {
                  setModalClassFilter('all');
                  setFormLetter({
                    student_nis: '',
                    letter_type: 'Panggilan Orang Tua I',
                    letter_no: `421.5/${Math.floor(100 + Math.random() * 900)}/SMK-BK/${new Date().getFullYear()}`,
                    issue_date: new Date().toISOString().slice(0, 10),
                    appointment_date: new Date(Date.now() + 86400000 * 2).toISOString().slice(0, 10),
                    appointment_time: '09.00 WIB s/d Selesai',
                    appointment_place: 'Ruang Bimbingan & Konseling (BK)',
                    appointed_person: 'Guru BK / Koordinator BK',
                    reason: ''
                  });
                  setShowLetterModal(true);
                }}
                className="px-3 py-1.5 text-xs font-black cursor-pointer bg-purple-600 hover:bg-purple-700 text-white rounded-[var(--ui-radius-small)] shadow-xs"
              >
                + Terbitkan Surat
              </Button>
            </div>

            <div className="flex flex-col gap-3 max-h-[520px] overflow-y-auto pr-1 custom-scrollbar">
              {filteredLetters.length === 0 ? (
                <div className="py-12 text-center text-slate-400 font-bold text-xs flex flex-col items-center gap-2">
                  <FileText size={28} className="text-slate-300" />
                  <span>Belum ada surat panggilan atau SP yang diterbitkan.</span>
                </div>
              ) : (
                filteredLetters.map(lettr => (
                  <div key={lettr.id} className="p-3.5 rounded-[var(--ui-radius-card)] border border-slate-200/80 bg-slate-50/70 hover:bg-slate-50 flex flex-col gap-2.5 transition-all shadow-xs">
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-black text-slate-900 text-xs sm:text-sm">{lettr.student_name || 'Siswa'}</span>
                          <span className={`px-2 py-0.5 rounded-[var(--ui-radius-pill)] text-[9.5px] font-black ${
                            lettr.letter_type?.includes('SP 3') ? 'bg-rose-100 text-rose-800 border border-rose-200' :
                            lettr.letter_type?.includes('SP') ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                            'bg-purple-100 text-purple-800 border border-purple-200'
                          }`}>
                            {lettr.letter_type}
                          </span>
                        </div>
                        <div className="text-[10px] font-bold text-slate-500">Kelas: {lettr.class_name || '-'} • NIS: {lettr.student_nis}</div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold text-slate-400">
                          {new Date(lettr.issue_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const st = students.find(s => String(getStudentNis(s)) === String(lettr.student_nis));
                            setModalClassFilter(st ? getStudentClass(st) : 'all');
                            setEditingLetter(lettr);
                            setFormLetter({
                              student_nis: lettr.student_nis,
                              letter_type: lettr.letter_type || 'Panggilan Orang Tua I',
                              letter_no: lettr.letter_no || '',
                              issue_date: lettr.issue_date ? lettr.issue_date.slice(0, 10) : new Date().toISOString().slice(0, 10),
                              appointment_date: lettr.appointment_date ? lettr.appointment_date.slice(0, 10) : '',
                              appointment_time: lettr.appointment_time || '09.00 WIB s/d Selesai',
                              appointment_place: lettr.appointment_place || 'Ruang Bimbingan & Konseling (BK)',
                              appointed_person: lettr.appointed_person || 'Guru BK / Koordinator BK',
                              reason: lettr.reason || ''
                            });
                            setShowLetterModal(true);
                          }}
                          className="p-1.5 rounded-[var(--ui-radius-small)] text-slate-600 hover:bg-slate-100 transition-all border border-slate-200 bg-white cursor-pointer shadow-xs"
                          title="Edit / Ubah Data Surat"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => downloadLetterPDF(lettr)}
                          className="p-1.5 rounded-[var(--ui-radius-small)] text-emerald-600 hover:bg-emerald-50 transition-all border border-emerald-200 bg-white cursor-pointer shadow-xs"
                          title="Cetak Ulang PDF"
                        >
                          <Printer size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteLetter(lettr.id)}
                          className="p-1.5 rounded-[var(--ui-radius-small)] text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-all border-none bg-transparent cursor-pointer"
                          title="Hapus Surat"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    <div className="text-[10px] text-slate-500 font-mono">No: {lettr.letter_no || '-'}</div>

                    <div className="p-2.5 bg-white rounded-[var(--ui-radius-small)] border border-slate-100 text-xs text-slate-700 flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Keperluan:</span>
                      <span className="font-medium leading-relaxed">{lettr.reason || 'Koordinasi pembinaan kedisiplinan.'}</span>
                      {lettr.appointment_date && (
                        <div className="mt-1 pt-1 border-t border-slate-100 text-[10.5px] font-semibold text-purple-700">
                          Jadwal: {new Date(lettr.appointment_date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} • {lettr.appointment_time || '09.00 WIB'}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: FORM SESI KONSELING (DILENGKAPI FILTER KELAS SISWA) ─── */}
      {showSessionModal && (
        <Modal
          isOpen={showSessionModal}
          onClose={() => setShowSessionModal(false)}
          title={editingSession ? "Edit Catatan Sesi Konseling" : "Catat Sesi Konseling Baru"}
          maxWidth="max-w-xl"
        >
          <form onSubmit={handleSaveSession} className="p-5 sm:p-6 space-y-4 overflow-y-auto max-h-[80vh]">
            {/* Filter Kelas Cepat di Modal */}
            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-[var(--ui-radius-small)] space-y-2.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Filter size={12} className="text-[var(--ui-primary)]" />
                  <span>Saring Siswa Berdasarkan Kelas</span>
                </span>
                <div className="w-full sm:w-56">
                  <CustomSelect
                    options={modalClassOptions}
                    value={modalClassFilter}
                    onChange={val => {
                      setModalClassFilter(val);
                      if (val !== 'all' && formSession.student_nis) {
                        const currentSiswa = students.find(s => String(getStudentNis(s)) === String(formSession.student_nis));
                        if (currentSiswa && getStudentClass(currentSiswa) !== val) {
                          setFormSession(prev => ({ ...prev, student_nis: '' }));
                        }
                      }
                    }}
                    placeholder="Pilih Kelas Siswa"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1 block">
                  Pilih Siswa <span className="text-rose-500">*</span>
                </label>
                <CustomSelect
                  value={formSession.student_nis}
                  onChange={val => setFormSession({ ...formSession, student_nis: val })}
                  options={modalStudentOptions}
                  placeholder="Cari atau pilih nama siswa..."
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 block">Tanggal Sesi</label>
                <input
                  type="date"
                  value={formSession.session_date}
                  onChange={e => setFormSession({ ...formSession, session_date: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-[var(--ui-radius-small)] text-xs font-semibold focus:outline-none"
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
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 block">
                Deskripsi Permasalahan Siswa <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                placeholder="Tuliskan latar belakang masalah, hasil observasi, atau pengakuan siswa..."
                value={formSession.problem}
                onChange={e => setFormSession({ ...formSession, problem: e.target.value })}
                className="w-full p-2.5 bg-white border border-slate-200 rounded-[var(--ui-radius-small)] text-xs font-medium focus:outline-none focus:border-[var(--ui-primary)] transition-all resize-none"
                required
              />
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 block">Rencana Solusi / Action Plan &amp; Komitmen</label>
              <textarea
                rows={2}
                placeholder="Rencana tindak lanjut, kesepakatan komitmen siswa, atau tanggal evaluasi..."
                value={formSession.solution}
                onChange={e => setFormSession({ ...formSession, solution: e.target.value })}
                className="w-full p-2.5 bg-white border border-slate-200 rounded-[var(--ui-radius-small)] text-xs font-medium focus:outline-none focus:border-[var(--ui-primary)] transition-all resize-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 shrink-0">
              <Button type="button" variant="outline" onClick={() => setShowSessionModal(false)}>
                Batal
              </Button>
              <Button type="submit" className="font-black text-xs px-5 shadow-xs bg-emerald-600 hover:bg-emerald-700 text-white">
                {editingSession ? 'Update Sesi' : 'Simpan Catatan BK'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── MODAL: FORM HOME VISIT (DILENGKAPI FILTER KELAS SISWA) ─── */}
      {showVisitModal && (
        <Modal
          isOpen={showVisitModal}
          onClose={() => setShowVisitModal(false)}
          title="Catat Jurnal Kunjungan Rumah (Home Visit)"
          maxWidth="max-w-lg"
        >
          <form onSubmit={handleSaveVisit} className="p-5 sm:p-6 space-y-4 overflow-y-auto max-h-[80vh]">
            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-[var(--ui-radius-small)] space-y-2.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Filter size={12} className="text-sky-600" />
                  <span>Saring Berdasarkan Kelas</span>
                </span>
                <div className="w-full sm:w-52">
                  <CustomSelect
                    options={modalClassOptions}
                    value={modalClassFilter}
                    onChange={setModalClassFilter}
                    placeholder="Pilih Kelas"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1 block">
                  Pilih Siswa <span className="text-rose-500">*</span>
                </label>
                <CustomSelect
                  value={formVisit.student_nis}
                  onChange={val => setFormVisit({ ...formVisit, student_nis: val })}
                  options={modalStudentOptions}
                  placeholder="Cari atau pilih nama siswa..."
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 block">Tanggal Kunjungan</label>
              <input
                type="date"
                value={formVisit.visit_date}
                onChange={e => setFormVisit({ ...formVisit, visit_date: e.target.value })}
                className="w-full p-2 bg-white border border-slate-200 rounded-[var(--ui-radius-small)] text-xs font-bold focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 block">
                Hasil Pertemuan Kunjungan Rumah <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                placeholder="Tuliskan kondisi lingkungan keluarga, tanggapan orang tua/wali, dan kesepakatan pembinaan..."
                value={formVisit.result}
                onChange={e => setFormVisit({ ...formVisit, result: e.target.value })}
                className="w-full p-2.5 bg-white border border-slate-200 rounded-[var(--ui-radius-small)] text-xs font-medium focus:outline-none resize-none"
                required
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 shrink-0">
              <Button type="button" variant="outline" onClick={() => setShowVisitModal(false)}>
                Batal
              </Button>
              <Button type="submit" className="font-bold bg-sky-600 hover:bg-sky-700 text-white shadow-xs">
                Simpan Jurnal Home Visit
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── MODAL: FORM SURAT / SP (DILENGKAPI FILTER KELAS SISWA) ─── */}
      {showLetterModal && (
        <Modal
          isOpen={showLetterModal}
          onClose={() => { setShowLetterModal(false); setEditingLetter(null); }}
          title={editingLetter ? "Edit Surat BK / SP Resmi" : "Terbitkan Surat BK / SP Resmi"}
          maxWidth="max-w-xl"
        >
          <form onSubmit={handleSaveLetter} className="p-5 sm:p-6 space-y-3.5 overflow-y-auto max-h-[80vh]">
            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-[var(--ui-radius-small)] space-y-2.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Filter size={12} className="text-purple-600" />
                  <span>Saring Siswa Berdasarkan Kelas</span>
                </span>
                <div className="w-full sm:w-52">
                  <CustomSelect
                    options={modalClassOptions}
                    value={modalClassFilter}
                    onChange={setModalClassFilter}
                    placeholder="Pilih Kelas"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1 block">
                  Pilih Siswa <span className="text-rose-500">*</span>
                </label>
                <CustomSelect
                  value={formLetter.student_nis}
                  onChange={val => setFormLetter({ ...formLetter, student_nis: val })}
                  options={modalStudentOptions}
                  placeholder="Cari atau pilih nama siswa..."
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 block">Jenis Surat</label>
                <CustomSelect
                  value={formLetter.letter_type}
                  onChange={val => setFormLetter({ ...formLetter, letter_type: val })}
                  options={[
                    { value: 'Panggilan Orang Tua I', label: 'Panggilan Orang Tua I' },
                    { value: 'Panggilan Orang Tua II', label: 'Panggilan Orang Tua II' },
                    { value: 'Panggilan Orang Tua III', label: 'Panggilan Orang Tua III' },
                    { value: 'SP 1', label: 'Surat Peringatan 1 (SP 1)' },
                    { value: 'SP 2', label: 'Surat Peringatan 2 (SP 2)' },
                    { value: 'SP 3', label: 'Surat Peringatan 3 (SP 3)' },
                    { value: 'Surat Perjanjian Siswa', label: 'Surat Perjanjian Siswa' }
                  ]}
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 block">Nomor Surat</label>
                <input
                  type="text"
                  placeholder="421.5/082/SMK-BK/2026"
                  value={formLetter.letter_no}
                  onChange={e => setFormLetter({ ...formLetter, letter_no: e.target.value })}
                  className="w-full p-2 bg-white border border-slate-200 rounded-[var(--ui-radius-small)] text-xs font-mono font-bold focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 block">Tanggal Surat</label>
                <input
                  type="date"
                  value={formLetter.issue_date}
                  onChange={e => setFormLetter({ ...formLetter, issue_date: e.target.value })}
                  className="w-full p-2 bg-white border border-slate-200 rounded-[var(--ui-radius-small)] text-xs font-bold focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 block">Hari / Tgl Menghadap</label>
                <input
                  type="date"
                  value={formLetter.appointment_date}
                  onChange={e => setFormLetter({ ...formLetter, appointment_date: e.target.value })}
                  className="w-full p-2 bg-white border border-slate-200 rounded-[var(--ui-radius-small)] text-xs font-bold focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 block">Waktu / Jam Menghadap</label>
                <input
                  type="text"
                  placeholder="09.00 WIB s/d Selesai"
                  value={formLetter.appointment_time}
                  onChange={e => setFormLetter({ ...formLetter, appointment_time: e.target.value })}
                  className="w-full p-2 bg-white border border-slate-200 rounded-[var(--ui-radius-small)] text-xs font-semibold focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 block">Tempat / Ruangan</label>
                <input
                  type="text"
                  placeholder="Ruang Bimbingan & Konseling (BK)"
                  value={formLetter.appointment_place}
                  onChange={e => setFormLetter({ ...formLetter, appointment_place: e.target.value })}
                  className="w-full p-2 bg-white border border-slate-200 rounded-[var(--ui-radius-small)] text-xs font-semibold focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 block">Alasan / Keperluan Pemanggilan</label>
              <textarea
                rows={2}
                placeholder="Tuliskan alasan/keterangan pemanggilan orang tua atau evaluasi poin pelanggaran..."
                value={formLetter.reason}
                onChange={e => setFormLetter({ ...formLetter, reason: e.target.value })}
                className="w-full p-2.5 bg-white border border-slate-200 rounded-[var(--ui-radius-small)] text-xs font-semibold focus:outline-none resize-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 shrink-0">
              <Button type="button" variant="outline" onClick={() => { setShowLetterModal(false); setEditingLetter(null); }}>
                Batal
              </Button>
              <Button type="submit" className="font-bold bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-1.5 shadow-xs">
                <Printer size={14} />
                <span>{editingLetter ? 'Simpan Perubahan & Unduh PDF' : 'Terbitkan & Unduh PDF'}</span>
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── MODAL: 360° STUDENT DOSSIER INTERAKTIF ───────────────────── */}
      {showDossierModal && dossierStudent && (
        <Modal
          isOpen={showDossierModal}
          onClose={() => setShowDossierModal(false)}
          title={`Berkas 360° Rekam Jejak BK — ${dossierStudent.name}`}
          maxWidth="max-w-2xl"
        >
          <div className="p-4 sm:p-6 space-y-4 max-h-[80vh] overflow-y-auto">
            {/* Header Profil & Quick Stats */}
            <div className="p-4 rounded-[var(--ui-radius-card)] bg-gradient-to-r from-slate-900 to-slate-800 text-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-[var(--ui-radius-small)] bg-white/10 text-white flex items-center justify-center font-black text-sm border border-white/20">
                  {getInitials(dossierStudent.name)}
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base leading-tight">{dossierStudent.name}</h3>
                  <p className="text-xs text-slate-300 font-semibold mt-0.5">
                    NIS: {dossierStudent.nis} • Kelas: {dossierStudent.class_name || '-'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="text-right bg-white/10 px-3 py-1.5 rounded-[var(--ui-radius-small)] border border-white/15">
                  <span className="text-[9px] font-black uppercase text-slate-300 block">Total Poin</span>
                  <span className="font-black text-rose-400 text-sm sm:text-base">+{dossierStudent.total_poin}</span>
                </div>
                <div className="text-right bg-white/10 px-3 py-1.5 rounded-[var(--ui-radius-small)] border border-white/15">
                  <span className="text-[9px] font-black uppercase text-slate-300 block">Sesi BK</span>
                  <span className="font-black text-emerald-400 text-sm sm:text-base">{dossierStudent.sesi_count}</span>
                </div>
              </div>
            </div>

            {/* Action Shortcuts from Dossier */}
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => { setShowDossierModal(false); openSessionWithStudent(dossierStudent); }}
                className="p-2 rounded-[var(--ui-radius-small)] bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors"
              >
                <Plus size={13} />
                <span>+ Sesi BK</span>
              </button>
              <button
                type="button"
                onClick={() => { setShowDossierModal(false); openVisitWithStudent(dossierStudent); }}
                className="p-2 rounded-[var(--ui-radius-small)] bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors"
              >
                <Home size={13} />
                <span>+ Home Visit</span>
              </button>
              <button
                type="button"
                onClick={() => { setShowDossierModal(false); openLetterWithStudent(dossierStudent); }}
                className="p-2 rounded-[var(--ui-radius-small)] bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors"
              >
                <Printer size={13} />
                <span>+ Surat Ortu</span>
              </button>
            </div>

            {/* Dossier Sub-Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0">
              {[
                { id: 'pelanggaran', label: `Pelanggaran (${dossierStudent.riwayat_list.length})` },
                { id: 'konseling', label: `Sesi BK (${bkSessions.filter(s => String(s.student_nis) === String(dossierStudent.nis)).length})` },
                { id: 'visit', label: `Home Visit (${homeVisits.filter(s => String(s.student_nis) === String(dossierStudent.nis)).length})` },
                { id: 'surat', label: `Surat (${bkLetters.filter(s => String(s.student_nis) === String(dossierStudent.nis)).length})` },
              ].map(t => (
                <Button
                  key={t.id}
                  variant={dossierTab === t.id ? 'primary' : 'ghost'}
                  onClick={() => setDossierTab(t.id)}
                  className={`flex-1 shrink-0 ${dossierTab !== t.id ? 'text-slate-500' : ''}`}
                >
                  {t.label}
                </Button>
              ))}
            </div>

            {/* Tab Contents inside Dossier */}
            <div className="min-h-[160px]">
              {dossierTab === 'pelanggaran' && (
                <div className="space-y-2">
                  {dossierStudent.riwayat_list.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 text-xs italic bg-slate-50 rounded-[var(--ui-radius-small)] border border-dashed border-slate-200">
                      Siswa tidak memiliki riwayat pelanggaran tata tertib.
                    </div>
                  ) : (
                    dossierStudent.riwayat_list.map((r, idx) => (
                      <div key={idx} className="p-3 bg-slate-50 rounded-[var(--ui-radius-small)] border border-slate-200/80 flex justify-between items-center text-xs">
                        <div className="min-w-0 pr-2">
                          <div className="font-extrabold text-slate-800">{r.tindakan_nama}</div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            {r.tanggal_kejadian ? new Date(r.tanggal_kejadian).toLocaleDateString('id-ID') : '-'} • Pelapor: {r.pelapor_nama || 'Petugas Piket'}
                          </div>
                        </div>
                        <span className="font-black text-rose-600 bg-white border border-rose-200 px-2 py-0.5 rounded-[var(--ui-radius-pill)] shrink-0">
                          +{r.poin} Poin
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}

              {dossierTab === 'konseling' && (
                <div className="space-y-2">
                  {bkSessions.filter(s => String(s.student_nis) === String(dossierStudent.nis)).length === 0 ? (
                    <div className="text-center py-8 text-slate-400 text-xs italic bg-slate-50 rounded-[var(--ui-radius-small)] border border-dashed border-slate-200">
                      Belum pernah ada catatan sesi konseling dengan guru BK.
                    </div>
                  ) : (
                    bkSessions.filter(s => String(s.student_nis) === String(dossierStudent.nis)).map((ses, idx) => (
                      <div key={idx} className="p-3 bg-slate-50 rounded-[var(--ui-radius-small)] border border-slate-200/80 flex flex-col gap-1.5 text-xs">
                        <div className="flex justify-between items-center">
                          <span className="font-extrabold text-slate-800">{ses.category} — {new Date(ses.session_date).toLocaleDateString('id-ID')}</span>
                          <span className="text-[9.5px] font-black px-2 py-0.5 rounded-[var(--ui-radius-pill)] bg-emerald-100 text-emerald-800">
                            {ses.status}
                          </span>
                        </div>
                        <p className="text-slate-600 font-medium">{ses.problem}</p>
                        {ses.solution && <p className="text-slate-500 text-[11px] italic">Solusi: {ses.solution}</p>}
                      </div>
                    ))
                  )}
                </div>
              )}

              {dossierTab === 'visit' && (
                <div className="space-y-2">
                  {homeVisits.filter(s => String(s.student_nis) === String(dossierStudent.nis)).length === 0 ? (
                    <div className="text-center py-8 text-slate-400 text-xs italic bg-slate-50 rounded-[var(--ui-radius-small)] border border-dashed border-slate-200">
                      Belum pernah ada kegiatan kunjungan rumah (home visit).
                    </div>
                  ) : (
                    homeVisits.filter(s => String(s.student_nis) === String(dossierStudent.nis)).map((hv, idx) => (
                      <div key={idx} className="p-3 bg-slate-50 rounded-[var(--ui-radius-small)] border border-slate-200/80 text-xs space-y-1">
                        <div className="flex justify-between font-bold text-slate-700">
                          <span>Kunjungan: {new Date(hv.visit_date).toLocaleDateString('id-ID')}</span>
                          <span className="text-slate-400">Petugas: {hv.counselor_name || 'Guru BK'}</span>
                        </div>
                        <p className="text-slate-600 font-medium">{hv.result}</p>
                      </div>
                    ))
                  )}
                </div>
              )}

              {dossierTab === 'surat' && (
                <div className="space-y-2">
                  {bkLetters.filter(s => String(s.student_nis) === String(dossierStudent.nis)).length === 0 ? (
                    <div className="text-center py-8 text-slate-400 text-xs italic bg-slate-50 rounded-[var(--ui-radius-small)] border border-dashed border-slate-200">
                      Belum ada surat panggilan atau SP yang diterbitkan untuk siswa ini.
                    </div>
                  ) : (
                    bkLetters.filter(s => String(s.student_nis) === String(dossierStudent.nis)).map((lt, idx) => (
                      <div key={idx} className="p-3 bg-slate-50 rounded-[var(--ui-radius-small)] border border-slate-200/80 text-xs flex justify-between items-center">
                        <div>
                          <div className="font-extrabold text-slate-800">{lt.letter_type} (No: {lt.letter_no || '-'})</div>
                          <div className="text-[10px] text-slate-400 mt-0.5">Tanggal: {new Date(lt.issue_date).toLocaleDateString('id-ID')}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => downloadLetterPDF(lt)}
                          className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded text-xs font-bold text-slate-700 cursor-pointer flex items-center gap-1"
                        >
                          <Printer size={12} /> Unduh PDF
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <Button type="button" variant="outline" onClick={() => setShowDossierModal(false)}>
                Tutup Berkas
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
