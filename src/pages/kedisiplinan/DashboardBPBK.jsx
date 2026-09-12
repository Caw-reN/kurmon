import React, { useState, useMemo, useEffect, useRef } from 'react';
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
import { useDataStore } from "../../store/useDataStore.js";
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

const getInitials = (name) => { if (!name) return '?'; const parts = name.trim().split(' '); if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase(); return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase(); };

export default function DashboardBPBK({ students = [], classes = [], teachers = [], tab = 'ringkasan', onTabChange }) {
  const authToken = useAuthStore(state => state.user?.authToken);
  const user = useAuthStore(state => state.user);
  const dataStoreAppSettings = useDataStore(state => state.appSettings) || {};
  const appStoreAppSettings = useAppStore(state => state.appSettings) || {};
  const storeTeachers = useDataStore(state => state.teachers) || [];
  const allTeachers = teachers && teachers.length > 0 ? teachers : storeTeachers;
  const storeClasses = useDataStore(state => state.classes) || [];
  const allClasses = classes && classes.length > 0 ? classes : storeClasses;
  const storeSchoolProfile = useDataStore(state => state.schoolProfile) || {};
  const [fetchedSchoolProfile, setFetchedSchoolProfile] = useState({});

  const schoolProfile = useMemo(() => ({
    ...storeSchoolProfile,
    ...fetchedSchoolProfile
  }), [storeSchoolProfile, fetchedSchoolProfile]);

  const appSettings = useMemo(() => ({
    defaultPaperSize: 'a4',
    ...dataStoreAppSettings,
    ...appStoreAppSettings,
    kopSuratBaris1: (dataStoreAppSettings.kopSuratBaris1 || appStoreAppSettings.kopSuratBaris1 || 'PEMERINTAH DAERAH PROVINSI JAWA BARAT'),
    kopSuratBaris2: (dataStoreAppSettings.kopSuratBaris2 || appStoreAppSettings.kopSuratBaris2 || 'DINAS PENDIDIKAN'),
    kopSuratBaris3: (dataStoreAppSettings.kopSuratBaris3 || appStoreAppSettings.kopSuratBaris3 || schoolProfile?.nama_sekolah || dataStoreAppSettings.schoolName || 'SMK KARYA GUNA 2 BEKASI'),
    kopSuratAlamat: (dataStoreAppSettings.kopSuratAlamat || appStoreAppSettings.kopSuratAlamat || schoolProfile?.alamat || ''),
    kopSuratKontak: (dataStoreAppSettings.kopSuratKontak || appStoreAppSettings.kopSuratKontak || (schoolProfile?.telepon ? `Telp: ${schoolProfile.telepon} | Website: ${schoolProfile.website || '-'}` : '')),
    kopSuratLogo: (dataStoreAppSettings.kopSuratLogo || appStoreAppSettings.kopSuratLogo || schoolProfile?.logo_url || dataStoreAppSettings.logoUrl || ''),
    useKopSuratGambar: (dataStoreAppSettings.useKopSuratGambar !== undefined ? dataStoreAppSettings.useKopSuratGambar : (appStoreAppSettings.useKopSuratGambar !== undefined ? appStoreAppSettings.useKopSuratGambar : false)),
    kopSuratGambar: (dataStoreAppSettings.kopSuratGambar || appStoreAppSettings.kopSuratGambar || '')
  }), [dataStoreAppSettings, appStoreAppSettings, schoolProfile]);

  // Helper resolusi Wali Kelas dari kelas siswa
  const getHomeroomInfo = (className, studentNis) => {
    let cls = className;
    if (!cls || cls === '-') {
      const st = (students || []).find(s => String(getStudentNis(s)) === String(studentNis));
      cls = getStudentClass(st) || '-';
    }

    const targetClass = (allClasses || []).find(c => 
      String(c.name || c.id || '').trim().toLowerCase() === String(cls).trim().toLowerCase()
    );

    let walasName = '';
    let walasNip = '';

    if (targetClass?.homeroom) {
      const teacher = (allTeachers || []).find(t => 
        String(t.code || '').trim().toLowerCase() === String(targetClass.homeroom).trim().toLowerCase() ||
        String(t.name || '').trim().toLowerCase() === String(targetClass.homeroom).trim().toLowerCase()
      );
      if (teacher) {
        walasName = teacher.name || targetClass.homeroom;
        walasNip = teacher.nip && teacher.nip !== '-' ? teacher.nip : '';
      } else {
        walasName = targetClass.homeroom;
      }
    }

    if (!walasName) {
      const teacherByWalas = (allTeachers || []).find(t => 
        String(t.walasClass || '').trim().toLowerCase() === String(cls).trim().toLowerCase()
      );
      if (teacherByWalas) {
        walasName = teacherByWalas.name;
        walasNip = teacherByWalas.nip && teacherByWalas.nip !== '-' ? teacherByWalas.nip : '';
      }
    }

    return { walasName: walasName || '-', walasNip, resolvedClass: cls };
  };

  // Active view: 'ringkasan' (or 'ews') | 'konseling' | 'surat' | 'visit'
  const currentSubTab = tab === 'ringkasan' || tab === 'ews' 
    ? 'ringkasan' 
    : (tab === 'visit' || tab === 'home_visit' ? 'visit' : tab);

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
  const [filterLetterType, setFilterLetterType] = useState("all");

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterTingkat, filterJurusan, filterClass, filterCategory, filterStatus, filterLetterType, currentSubTab]);

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
  const [editingVisit, setEditingVisit] = useState(null);
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

  // Pratinjau Surat Resmi Modal State
  const [previewLetter, setPreviewLetter] = useState(null);
  const printPaperRef = useRef(null);

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
      const [resRiwayat, resSessions, resVisits, resLetters, resProfile] = await Promise.all([
        fetch("/api/kedisiplinan/riwayat?limit=5000", { headers: { "Authorization": `Bearer ${authToken}` } }),
        fetch("/api/kedisiplinan/bk/sessions", { headers: { "Authorization": `Bearer ${authToken}` } }),
        fetch("/api/kedisiplinan/bk/home-visits", { headers: { "Authorization": `Bearer ${authToken}` } }),
        fetch("/api/kedisiplinan/bk/letters", { headers: { "Authorization": `Bearer ${authToken}` } }),
        fetch("/api/school-profile", { headers: { "Authorization": `Bearer ${authToken}` } }).catch(() => null)
      ]);

      const dataRiwayat = await resRiwayat.json();
      const dataSessions = await resSessions.json();
      const dataVisits = await resVisits.json();
      const dataLetters = await resLetters.json();
      if (resProfile) {
        try {
          const dataProfile = await resProfile.json();
          if (dataProfile.ok && dataProfile.data) {
            setFetchedSchoolProfile(dataProfile.data);
          }
        } catch {}
      }

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

      if (filterTingkat !== 'all' && !cls.startsWith(filterTingkat + ' ') && !cls.startsWith(filterTingkat + '-')) return false;
      if (filterJurusan !== 'all' && !cls.includes(` ${filterJurusan} `) && !cls.endsWith(` ${filterJurusan}`)) return false;
      if (filterClass !== 'all' && cls !== filterClass) return false;

      if (search) {
        const q = search.toLowerCase();
        return (
          (hv.student_name && hv.student_name.toLowerCase().includes(q)) ||
          (hv.student_nis && hv.student_nis.toLowerCase().includes(q)) ||
          (hv.result && hv.result.toLowerCase().includes(q)) ||
          (hv.counselor_name && hv.counselor_name.toLowerCase().includes(q)) ||
          (hv.created_by_name && hv.created_by_name.toLowerCase().includes(q)) ||
          cls.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [homeVisits, filterTingkat, filterJurusan, filterClass, search, students]);

  // Filtered Letters
  const filteredLetters = useMemo(() => {
    return bkLetters.filter(lt => {
      const student = students.find(s => String(getStudentNis(s)) === String(lt.student_nis));
      const cls = student ? getStudentClass(student) : (lt.class_name || '');

      if (filterTingkat !== 'all' && !cls.startsWith(filterTingkat + ' ') && !cls.startsWith(filterTingkat + '-')) return false;
      if (filterJurusan !== 'all' && !cls.includes(` ${filterJurusan} `) && !cls.endsWith(` ${filterJurusan}`)) return false;
      if (filterClass !== 'all' && cls !== filterClass) return false;

      if (filterLetterType !== 'all') {
        const typeLow = (lt.letter_type || '').toLowerCase();
        if (filterLetterType === 'panggilan' && !typeLow.includes('panggilan')) return false;
        else if (filterLetterType === 'sp' && !typeLow.includes('sp')) return false;
        else if (filterLetterType === 'perjanjian' && !typeLow.includes('perjanjian')) return false;
        else if (!['panggilan', 'sp', 'perjanjian'].includes(filterLetterType) && lt.letter_type !== filterLetterType) return false;
      }

      if (search) {
        const q = search.toLowerCase();
        return (
          (lt.student_name && lt.student_name.toLowerCase().includes(q)) ||
          (lt.student_nis && lt.student_nis.toLowerCase().includes(q)) ||
          (lt.letter_type && lt.letter_type.toLowerCase().includes(q)) ||
          (lt.letter_no && lt.letter_no.toLowerCase().includes(q)) ||
          (lt.reason && lt.reason.toLowerCase().includes(q)) ||
          cls.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [bkLetters, filterTingkat, filterJurusan, filterClass, filterLetterType, search, students]);

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

  // Handle Save Home Visit (Create & Edit)
  const handleSaveVisit = async (e) => {
    e.preventDefault();
    if (!formVisit.student_nis || !formVisit.result) {
      showToast("Pilih siswa dan isi hasil kunjungan terlebih dahulu", "error");
      return;
    }

    try {
      const url = editingVisit ? `/api/kedisiplinan/bk/home-visits/${editingVisit.id}` : "/api/kedisiplinan/bk/home-visits";
      const method = editingVisit ? "PUT" : "POST";

      const payload = {
        ...formVisit,
        visit_date: formVisit.visit_date && String(formVisit.visit_date).trim() ? String(formVisit.visit_date).trim() : new Date().toISOString().slice(0, 10)
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${authToken}` },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (data.ok) {
        showToast(editingVisit ? "Jurnal Kunjungan Rumah berhasil diperbarui!" : "Jurnal Kunjungan Rumah berhasil dicatat!");
        setShowVisitModal(false);
        setEditingVisit(null);
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
          const selectedStudent = (students || []).find(s => String(getStudentNis(s)) === String(formLetter.student_nis));
          setPreviewLetter({
            ...data.data,
            student_name: getStudentName(selectedStudent) || formLetter.student_name,
            class_name: getStudentClass(selectedStudent) || formLetter.class_name
          });
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

  // Cetak Langsung Browser via Dialog Print
  const handlePrintDirect = (letter) => {
    if (!printPaperRef.current) {
      downloadLetterPDF(letter);
      return;
    }
    const printContent = printPaperRef.current.innerHTML;
    const printWindow = window.open('', '_blank', 'width=900,height=800');
    if (!printWindow) {
      downloadLetterPDF(letter);
      return;
    }
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${letter.letter_type || 'Surat BK'} - ${letter.student_name || 'Siswa'}</title>
          <style>
            @page { size: A4; margin: 15mm 15mm; }
            * { box-sizing: border-box; }
            body { font-family: 'Times New Roman', Times, serif; color: #111; margin: 0; padding: 0; font-size: 13px; line-height: 1.5; }
            table { width: 100%; border-collapse: collapse; }
            td { vertical-align: top; }
            .kop-container { text-align: center; margin-bottom: 8px; position: relative; }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .font-bold { font-weight: bold; }
            .uppercase { text-transform: uppercase; }
            @media print {
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            }
          </style>
        </head>
        <body>
          ${printContent}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 350);
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
      const studentNis = letter.student_nis || '-';
      
      let studentName = letter.student_name;
      let className = letter.class_name;
      if (!studentName || studentName === 'Siswa Terkait' || !className || className === '-') {
        const st = (students || []).find(s => String(getStudentNis(s)) === String(studentNis));
        if (st) {
          studentName = studentName && studentName !== 'Siswa Terkait' ? studentName : getStudentName(st);
          className = className && className !== '-' ? className : getStudentClass(st);
        }
      }
      studentName = studentName || 'Siswa Terkait';
      className = className || '-';

      // Dapatkan data Wali Kelas
      const homeroomInfo = getHomeroomInfo(className, studentNis);
      const walasName = homeroomInfo.walasName !== '-' ? homeroomInfo.walasName : '';
      const walasNip = homeroomInfo.walasNip || '';

      const letterNo = letter.letter_no || `421.5/${Math.floor(100 + Math.random() * 900)}/SMK-BK/${new Date().getFullYear()}`;
      const letterType = letter.letter_type || 'Panggilan Orang Tua I';
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

      const profileObj = useDataStore.getState().schoolProfile || useAppStore.getState().schoolProfile || appSettings.schoolProfile || {};
      const namaSekolah = profileObj.nama_sekolah || appSettings.kopSuratBaris3 || 'SMK KARYA GUNA 2 BEKASI';
      const namaKepsek = appSettings.namaKepsek || profileObj.kepala_sekolah || profileObj.nama_kepala_sekolah || appSettings.namaKepalaSekolah || 'Kepala Sekolah';
      const nipKepsek = appSettings.nipKepsek || profileObj.nip_kepala_sekolah || profileObj.nip || appSettings.nipKepalaSekolah || '';

      let kota = profileObj.kabupaten || profileObj.kota || appSettings.kopSuratKota || appSettings.lokasiSurat || '';
      if (!kota || kota.toLowerCase() === 'di tempat') {
        if (appSettings.kopSuratAlamat && appSettings.kopSuratAlamat.toLowerCase().includes('bekasi')) kota = 'Bekasi';
        else if (appSettings.kopSuratBaris2 && appSettings.kopSuratBaris2.toLowerCase().includes('bekasi')) kota = 'Bekasi';
        else kota = 'Bekasi';
      }

      const guruBkName = user?.name || user?.username || 'Guru Bimbingan & Konseling';
      const guruBkNip = user?.nip && user?.nip !== '-' ? user.nip : '';

      const isSP = letterType.toUpperCase().includes('SP') || letterType.toUpperCase().includes('PERINGATAN');
      const isPerjanjian = letterType.toUpperCase().includes('PERJANJIAN') || letterType.toUpperCase().includes('PERNYATAAN');

      let yPos = 12;

      // ─── KOP SURAT RESMI SESUAI SETTING ADMIN ───
      let kopImageDrawn = false;
      if (appSettings.useKopSuratGambar && appSettings.kopSuratGambar) {
        try {
          const imgStr = String(appSettings.kopSuratGambar);
          if (imgStr.startsWith('data:image/')) {
            let format = 'PNG';
            if (imgStr.includes('data:image/jpeg') || imgStr.includes('data:image/jpg')) {
              format = 'JPEG';
            }
            const props = doc.getImageProperties(imgStr);
            const aspect = (props.width || 1) / (props.height || 1);
            const maxKopW = pageWidth - 28;
            let calcH = maxKopW / aspect;
            if (calcH > 34) calcH = 34;
            const calcW = calcH * aspect;
            const xPos = (pageWidth - calcW) / 2;
            doc.addImage(imgStr, format, xPos, 8, calcW, calcH);
            yPos = 8 + calcH + 6;
            kopImageDrawn = true;
          }
        } catch (e) {
          console.warn("Gagal menggambar kop surat gambar:", e);
        }
      }

      if (!kopImageDrawn) {
        const logoData = appSettings.kopSuratLogo || profileObj.logo_url || appSettings.logoUrl;
        if (logoData && typeof logoData === 'string' && logoData.startsWith('data:image/')) {
          try {
            const format = logoData.includes('data:image/jpeg') || logoData.includes('data:image/jpg') ? 'JPEG' : 'PNG';
            doc.addImage(logoData, format, 14, yPos - 2, 22, 22);
          } catch (e) {
            console.warn(e);
          }
        }

        const baris1 = appSettings.kopSuratBaris1 || "PEMERINTAH DAERAH PROVINSI JAWA BARAT";
        const baris2 = appSettings.kopSuratBaris2 || "DINAS PENDIDIKAN";
        const baris3 = appSettings.kopSuratBaris3 || namaSekolah;
        const unit = "LAYANAN BIMBINGAN DAN KONSELING (BK)";
        const alamat = appSettings.kopSuratAlamat || profileObj.alamat || "";
        const kontak = appSettings.kopSuratKontak || (profileObj.telepon ? `Telp: ${profileObj.telepon} | Website: ${profileObj.website || "-"}` : "");

        doc.setFont("Helvetica", "bold");
        doc.setFontSize(9.5);
        doc.text(baris1, pageWidth / 2, yPos + 2, { align: "center" });

        doc.setFontSize(11);
        doc.text(baris2, pageWidth / 2, yPos + 7, { align: "center" });

        doc.setFontSize(13.5);
        doc.text(baris3, pageWidth / 2, yPos + 13, { align: "center" });

        doc.setFontSize(9.5);
        doc.text(unit, pageWidth / 2, yPos + 18, { align: "center" });

        doc.setFont("Helvetica", "normal");
        doc.setFontSize(7.5);
        let currentY = yPos + 22.5;
        if (alamat) {
          const splitAlamat = doc.splitTextToSize(alamat, pageWidth - 44);
          doc.text(splitAlamat, pageWidth / 2, currentY, { align: "center" });
          currentY += (splitAlamat.length * 3.5);
        }
        if (kontak) {
          doc.setFontSize(7);
          doc.text(kontak, pageWidth / 2, currentY, { align: "center" });
          currentY += 4;
        }

        yPos = currentY + 2;

        // Garis Pembatas Kop Surat Sesuai Setting Admin (kopDivider: double / single / thick / none)
        if (appSettings.kopDivider === 'single') {
          doc.setLineWidth(0.6);
          doc.line(14, yPos, pageWidth - 14, yPos);
          yPos += 7;
        } else if (appSettings.kopDivider === 'thick') {
          doc.setLineWidth(1.2);
          doc.line(14, yPos, pageWidth - 14, yPos);
          yPos += 7;
        } else if (appSettings.kopDivider !== 'none') {
          // Double lines (Standar Kop Kedinasan)
          doc.setLineWidth(0.8);
          doc.line(14, yPos, pageWidth - 14, yPos);
          doc.setLineWidth(0.2);
          doc.line(14, yPos + 1, pageWidth - 14, yPos + 1);
          yPos += 8;
        }
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

        doc.setFont("Helvetica", "bold");
        doc.text("Wali Kelas", 25, yPos + 12);
        doc.setFont("Helvetica", "normal");
        doc.text(`: ${walasName || '-'}`, 65, yPos + 12);

        yPos += 20;
        const textPerjanjian = `Menyatakan dengan sesungguhnya dan penuh kesadaran bahwa saya telah melakukan pelanggaran tata tertib sekolah berupa: "${reason}".\n\nDengan ini saya berjanji dengan sungguh-sungguh untuk:\n1. Menaati dan mematuhi seluruh peraturan serta tata tertib yang berlaku di sekolah.\n2. Tidak akan mengulangi perbuatan pelanggaran tersebut maupun pelanggaran tata tertib lainnya.\n3. Bersungguh-sungguh mengikuti kegiatan pembelajaran dan memperbaiki sikap serta kedisiplinan.\n\nApabila di kemudian hari saya melanggar pernyataan ini, maka saya bersedia menerima sanksi yang lebih berat dari pihak sekolah sampai dengan dikembalikan kepada orang tua / dikeluarkan dari sekolah.`;
        const splitPerjanjian = doc.splitTextToSize(textPerjanjian, pageWidth - 30);
        doc.text(splitPerjanjian, 15, yPos);

        yPos += 64;
        doc.text(`${kota}, ${issueDateStr}`, pageWidth - 20, yPos, { align: 'right' });
        yPos += 7;

        doc.text("Mengetahui,", 20, yPos);
        doc.text("Orang Tua / Wali Siswa,", 20, yPos + 5);
        doc.text("Yang Membuat Pernyataan,", pageWidth - 20, yPos + 5, { align: "right" });

        yPos += 22;
        doc.setFont("Helvetica", "bold");
        doc.text("( .......................................... )", 20, yPos);
        doc.text(`( ${studentName} )`, pageWidth - 20, yPos, { align: "right" });

        yPos += 14;
        doc.setFont("Helvetica", "normal");
        const col1X = 42;
        const col2X = 105;
        const col3X = 168;

        doc.text("Mengetahui,", col1X, yPos, { align: "center" });
        doc.text("Kepala Sekolah,", col1X, yPos + 4.5, { align: "center" });

        doc.text("Wali Kelas,", col2X, yPos, { align: "center" });
        doc.text(`${className},`, col2X, yPos + 4.5, { align: "center" });

        doc.text("Guru Bimbingan &", col3X, yPos, { align: "center" });
        doc.text("Konseling (BK),", col3X, yPos + 4.5, { align: "center" });

        yPos += 22;
        doc.setFont("Helvetica", "bold");
        doc.text(namaKepsek && namaKepsek !== 'Kepala Sekolah' ? namaKepsek : "( ........................................ )", col1X, yPos, { align: "center" });
        doc.text(walasName ? walasName : "( ........................................ )", col2X, yPos, { align: "center" });
        doc.text(guruBkName, col3X, yPos, { align: "center" });

        doc.setFont("Helvetica", "normal");
        doc.setFontSize(8.5);
        if (nipKepsek && nipKepsek !== '-') doc.text(`NIP. ${nipKepsek}`, col1X, yPos + 4, { align: "center" });
        if (walasNip && walasNip !== '-') doc.text(`NIP. ${walasNip}`, col2X, yPos + 4, { align: "center" });
        if (guruBkNip && guruBkNip !== '-') doc.text(`NIP. ${guruBkNip}`, col3X, yPos + 4, { align: "center" });

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

        doc.setFont("Helvetica", "bold");
        doc.text("Wali Kelas", 25, yPos + 12);
        doc.setFont("Helvetica", "normal");
        doc.text(`: ${walasName || '-'}`, 65, yPos + 12);

        yPos += 20;
        const textSP = `Bahwa siswa tersebut di atas telah melakukan pelanggaran terhadap peraturan dan tata tertib sekolah, yaitu:\n"${reason}".\n\nSehubungan dengan hal tersebut di atas, pihak sekolah memberikan sanksi pembinaan berupa ${letterType.toUpperCase()}.\n\nKami mengingatkan kepada siswa bersangkutan serta orang tua/wali murid agar segera melakukan pembinaan intensif. Apabila setelah diterbitkannya surat peringatan ini siswa tetap tidak menunjukkan perubahan sikap positif, pihak sekolah akan mengambil tindakan tegas berikutnya sesuai regulasi kedisiplinan yang berlaku.`;
        const splitSP = doc.splitTextToSize(textSP, pageWidth - 30);
        doc.text(splitSP, 15, yPos);

        yPos += 54;
        doc.text(`${kota}, ${issueDateStr}`, pageWidth - 20, yPos, { align: 'right' });
        yPos += 7;

        const col1X = 42;
        const col2X = 105;
        const col3X = 168;

        doc.setFont("Helvetica", "normal");
        doc.setFontSize(9.5);

        doc.text("Mengetahui,", col1X, yPos, { align: "center" });
        doc.text("Kepala Sekolah,", col1X, yPos + 4.5, { align: "center" });

        doc.text("Wali Kelas,", col2X, yPos, { align: "center" });
        doc.text(`${className},`, col2X, yPos + 4.5, { align: "center" });

        doc.text("Guru Bimbingan &", col3X, yPos, { align: "center" });
        doc.text("Konseling (BK),", col3X, yPos + 4.5, { align: "center" });

        yPos += 24;
        doc.setFont("Helvetica", "bold");
        doc.text(namaKepsek && namaKepsek !== 'Kepala Sekolah' ? namaKepsek : "( ........................................ )", col1X, yPos, { align: "center" });
        doc.text(walasName ? walasName : "( ........................................ )", col2X, yPos, { align: "center" });
        doc.text(guruBkName, col3X, yPos, { align: "center" });

        doc.setFont("Helvetica", "normal");
        doc.setFontSize(8.5);
        if (nipKepsek && nipKepsek !== '-') doc.text(`NIP. ${nipKepsek}`, col1X, yPos + 4, { align: "center" });
        if (walasNip && walasNip !== '-') doc.text(`NIP. ${walasNip}`, col2X, yPos + 4, { align: "center" });
        if (guruBkNip && guruBkNip !== '-') doc.text(`NIP. ${guruBkNip}`, col3X, yPos + 4, { align: "center" });

      } else {
        // === SURAT PANGGILAN ORANG TUA ===
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
        doc.text(`${kota}, ${issueDateStr}`, pageWidth - 15, yPos, { align: 'right' });

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
        const lblX = 25;
        const valX = 60;
        const rowH = 5.5;

        // Nama Siswa
        doc.setFont("Helvetica", "bold");
        doc.text("Nama Siswa", lblX, yPos);
        doc.setFont("Helvetica", "bold");
        doc.text(`: ${studentName}`, valX, yPos);
        yPos += rowH;

        // NIS / Kelas
        doc.setFont("Helvetica", "bold");
        doc.text("NIS / Kelas", lblX, yPos);
        doc.setFont("Helvetica", "normal");
        doc.text(`: ${studentNis} / ${className}`, valX, yPos);
        yPos += rowH;

        // Wali Kelas (WAJIB DITAMBAHKAN!)
        doc.setFont("Helvetica", "bold");
        doc.text("Wali Kelas", lblX, yPos);
        doc.setFont("Helvetica", "normal");
        doc.text(`: ${walasName || '-'}`, valX, yPos);
        yPos += rowH + 2;

        // Hari / Tanggal
        doc.setFont("Helvetica", "bold");
        doc.text("Hari / Tanggal", lblX, yPos);
        doc.setFont("Helvetica", "normal");
        doc.text(`: ${appointDateStr}`, valX, yPos);
        yPos += rowH;

        // Waktu / Pukul
        doc.setFont("Helvetica", "bold");
        doc.text("Waktu / Pukul", lblX, yPos);
        doc.setFont("Helvetica", "normal");
        doc.text(`: ${appointTime}`, valX, yPos);
        yPos += rowH;

        // Tempat
        doc.setFont("Helvetica", "bold");
        doc.text("Tempat", lblX, yPos);
        doc.setFont("Helvetica", "normal");
        doc.text(`: ${appointPlace}`, valX, yPos);
        yPos += rowH;

        // Menghadap
        doc.setFont("Helvetica", "bold");
        doc.text("Menghadap", lblX, yPos);
        doc.setFont("Helvetica", "normal");
        doc.text(`: ${appointPerson}`, valX, yPos);
        yPos += rowH;

        // Keperluan
        doc.setFont("Helvetica", "bold");
        doc.text("Keperluan", lblX, yPos);
        doc.setFont("Helvetica", "normal");
        const splitReason = doc.splitTextToSize(`: ${reason}`, pageWidth - valX - 15);
        doc.text(splitReason, valX, yPos);

        yPos += (splitReason.length * 5) + 6;
        const paragrafPenutup = "Mengingat pentingnya koordinasi ini demi kebaikan dan kelancaran pendidikan putra/putri Bapak/Ibu, kami sangat mengharapkan kehadiran Bapak/Ibu tepat pada waktunya. Atas perhatian dan kerja sama yang baik, kami ucapkan terima kasih.";
        const splitPenutup = doc.splitTextToSize(paragrafPenutup, pageWidth - 30);
        doc.text(splitPenutup, 15, yPos);

        yPos += 14;
        const col1X = 42;
        const col2X = 105;
        const col3X = 168;

        doc.setFont("Helvetica", "normal");
        doc.setFontSize(9.5);

        doc.text("Mengetahui,", col1X, yPos, { align: "center" });
        doc.text("Kepala Sekolah,", col1X, yPos + 4.5, { align: "center" });

        doc.text("Wali Kelas,", col2X, yPos, { align: "center" });
        doc.text(`${className},`, col2X, yPos + 4.5, { align: "center" });

        doc.text("Guru Bimbingan &", col3X, yPos, { align: "center" });
        doc.text("Konseling (BK),", col3X, yPos + 4.5, { align: "center" });

        yPos += 24;
        doc.setFont("Helvetica", "bold");
        doc.text(namaKepsek && namaKepsek !== 'Kepala Sekolah' ? namaKepsek : "( ........................................ )", col1X, yPos, { align: "center" });
        doc.text(walasName ? walasName : "( ........................................ )", col2X, yPos, { align: "center" });
        doc.text(guruBkName, col3X, yPos, { align: "center" });

        doc.setFont("Helvetica", "normal");
        doc.setFontSize(8.5);
        if (nipKepsek && nipKepsek !== '-') doc.text(`NIP. ${nipKepsek}`, col1X, yPos + 4, { align: "center" });
        if (walasNip && walasNip !== '-') doc.text(`NIP. ${walasNip}`, col2X, yPos + 4, { align: "center" });
        if (guruBkNip && guruBkNip !== '-') doc.text(`NIP. ${guruBkNip}`, col3X, yPos + 4, { align: "center" });
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

      {/* ── TAB 1: DASHBOARD RINGKASAN & EARLY WARNING SYSTEM (EWS) ────────────────── */}
      {currentSubTab === 'ringkasan' && (
        <div className="flex flex-col gap-4 sm:gap-5 animate-in fade-in duration-200">
          {/* Stat Cards Row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
            <StatCard
              label="Kasus / Sesi Aktif"
              value={bkSessions.filter(s => s.status === 'Berjalan' || s.status === 'Follow-up').length}
              sub="Lihat Sesi Konseling →"
              icon={Clock}
              iconBg="bg-amber-50"
              iconColor="text-amber-600"
              className="p-3 sm:p-5 hover:border-amber-300"
              onClick={() => onTabChange?.('konseling')}
              title="Klik untuk membuka tab Sesi Konseling"
            />
            <StatCard
              label="Siswa Resiko Tinggi (EWS)"
              value={Object.values(studentPointsMap).filter(s => s.risk_level === 'Tinggi').length}
              sub="Poin > 75 / > 5 Sesi"
              icon={ShieldAlert}
              iconBg="bg-rose-50"
              iconColor="text-rose-600"
              className="p-3 sm:p-5 hover:border-rose-300"
              onClick={() => document.getElementById('ews-section')?.scrollIntoView({ behavior: 'smooth' })}
              title="Klik untuk melihat daftar EWS di bawah"
            />
            <StatCard
              label="Kunjungan Rumah"
              value={homeVisits.length}
              sub="Lihat Home Visit →"
              icon={Home}
              iconBg="bg-sky-50"
              iconColor="text-sky-600"
              className="p-3 sm:p-5 hover:border-sky-300"
              onClick={() => onTabChange?.('visit')}
              title="Klik untuk membuka tab Kunjungan Rumah (Home Visit)"
            />
            <StatCard
              label="Surat Ortu & SP"
              value={bkLetters.length}
              sub="Lihat Surat & SP →"
              icon={FileText}
              iconBg="bg-purple-50"
              iconColor="text-purple-600"
              className="p-3 sm:p-5 hover:border-purple-300"
              onClick={() => onTabChange?.('surat')}
              title="Klik untuk membuka tab Surat Panggilan & SP"
            />
          </div>

          {/* Early Warning System & Category Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Left Col: EWS List */}
            <div id="ews-section" className="lg:col-span-2 bg-white rounded-[var(--ui-radius-card)] p-4 sm:p-5 shadow-xs border border-slate-200/80 flex flex-col gap-4 scroll-mt-6">
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
                    <th className="px-3 py-3 font-black text-center w-12">#</th>
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
                      <td colSpan={8} className="py-12 text-center text-slate-400 font-bold">Memuat data sesi konseling...</td>
                    </tr>
                  ) : filteredSessions.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400 font-bold">Belum ada catatan sesi konseling yang cocok.</td>
                    </tr>
                  ) : (
                    filteredSessions.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((ses, idx) => (
                      <tr key={ses.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-3 py-3 text-center font-bold text-slate-400 text-xs">
                          {(currentPage - 1) * itemsPerPage + idx + 1}
                        </td>
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
              filteredSessions.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((ses, idx) => (
                <div 
                  key={ses.id}
                  className="bg-white rounded-[var(--ui-radius-card)] p-3.5 shadow-xs border border-slate-200/80 flex flex-col gap-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <span className="w-5 h-5 rounded-full bg-slate-100 border border-slate-200 text-slate-600 text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">
                        {(currentPage - 1) * itemsPerPage + idx + 1}
                      </span>
                      <div className="min-w-0">
                        <h4 className="font-extrabold text-slate-800 text-xs leading-snug truncate">{ses.student_name || 'Siswa'}</h4>
                        <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                          NIS: {ses.student_nis} • {ses.class_name || 'Tanpa Kelas'}
                        </p>
                      </div>
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
              currentPage={currentPage}
              totalPages={Math.ceil(filteredSessions.length / itemsPerPage) || 1}
              totalItems={filteredSessions.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={(val) => { setItemsPerPage(val); setCurrentPage(1); }}
              isLoading={isLoading}
            />
          </div>
        </div>
      )}

      {/* ── TAB 3: SURAT PANGGILAN & SP RESMI (1 KOLOM PENUH) ────────────────── */}
      {currentSubTab === 'surat' && (
        <div className="flex flex-col gap-4 animate-in fade-in duration-200">
          {/* Header Action & Filter Bar */}
          <div className="bg-white p-3.5 sm:p-5 rounded-[var(--ui-radius-card)] shadow-xs border border-slate-200/80 flex flex-col gap-3.5">
            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-[var(--ui-radius-small)] bg-purple-100 text-purple-700 flex items-center justify-center font-bold shrink-0 shadow-xs">
                  <FileText size={20} strokeWidth={2.2} />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-800 text-sm sm:text-base tracking-tight">Surat Panggilan Orang Tua &amp; SP Resmi</h3>
                  <p className="text-xs font-semibold text-slate-400">
                    {filteredLetters.length} dokumen surat resmi terdaftar dalam sistem
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  type="button"
                  onClick={() => {
                    setModalClassFilter('all');
                    setEditingLetter(null);
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
                  className="px-4 py-2 text-xs font-black flex items-center justify-center gap-1.5 shadow-xs cursor-pointer bg-purple-600 hover:bg-purple-700 text-white rounded-[var(--ui-radius-small)]"
                >
                  <Plus size={15} strokeWidth={2.5} />
                  <span>+ Terbitkan Surat Baru</span>
                </Button>
              </div>
            </div>

            {/* Smart Filter Bar Khusus Surat */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 pt-3 border-t border-slate-100">
              <div className="relative lg:col-span-2">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari nama siswa, nomor surat, atau alasan..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-[var(--ui-radius-small)] text-xs font-semibold focus:outline-none focus:bg-white"
                />
              </div>

              <div>
                <CustomSelect
                  value={filterLetterType}
                  onChange={setFilterLetterType}
                  options={[
                    { value: 'all', label: 'Semua Jenis Dokumen' },
                    { value: 'panggilan', label: 'Panggilan Ortu (I, II, III)' },
                    { value: 'sp', label: 'Surat Peringatan (SP 1, 2, 3)' },
                    { value: 'perjanjian', label: 'Surat Perjanjian Siswa' }
                  ]}
                  placeholder="Jenis Surat"
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

              <div className="flex items-center gap-1.5">
                <div className="flex-1 min-w-0">
                  <CustomSelect
                    value={filterClass}
                    onChange={setFilterClass}
                    options={classOptions}
                    placeholder="Semua Kelas"
                  />
                </div>
                {(search || filterLetterType !== 'all' || filterTingkat !== 'all' || filterClass !== 'all') && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearch('');
                      setFilterLetterType('all');
                      setFilterTingkat('all');
                      setFilterClass('all');
                    }}
                    className="p-2 text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-[var(--ui-radius-small)] transition-all cursor-pointer shrink-0"
                    title="Reset Filter"
                  >
                    <RotateCcw size={14} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Letters List / Grid View */}
          {filteredLetters.length === 0 ? (
            <div className="bg-white rounded-[var(--ui-radius-card)] p-12 text-center text-slate-400 font-bold text-xs flex flex-col items-center gap-3 border border-slate-200/80 shadow-xs">
              <div className="w-14 h-14 rounded-full bg-purple-50 text-purple-500 flex items-center justify-center border border-purple-100 shadow-2xs">
                <FileText size={28} />
              </div>
              <div>
                <h4 className="font-extrabold text-slate-700 text-sm">Belum Ada Surat Terbit</h4>
                <p className="text-xs text-slate-400 mt-0.5">Tidak ada surat panggilan atau SP yang sesuai dengan kriteria filter.</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5 sm:gap-4">
              {filteredLetters.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((lettr) => {
                const isSP = lettr.letter_type?.toUpperCase().includes('SP');
                const isPerjanjian = lettr.letter_type?.toUpperCase().includes('PERJANJIAN');
                const badgeColor = isSP
                  ? (lettr.letter_type?.includes('SP 3') ? 'bg-rose-100 text-rose-800 border-rose-200' : 'bg-amber-100 text-amber-800 border-amber-200')
                  : isPerjanjian 
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                    : 'bg-purple-100 text-purple-800 border-purple-200';

                const hr = getHomeroomInfo(lettr.class_name, lettr.student_nis);
                const st = (students || []).find(s => String(getStudentNis(s)) === String(lettr.student_nis));

                return (
                  <div 
                    key={lettr.id}
                    className="bg-white rounded-[var(--ui-radius-card)] p-4 sm:p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between gap-3.5 group"
                  >
                    <div className="flex flex-col gap-3">
                      {/* Top Header Card */}
                      <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2.5">
                        <span className={`px-2.5 py-1 rounded-[var(--ui-radius-pill)] text-[11px] font-black border tracking-wide ${badgeColor}`}>
                          {lettr.letter_type}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400">
                          {new Date(lettr.issue_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      </div>

                      {/* Student Info */}
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-extrabold text-slate-900 text-sm group-hover:text-purple-700 transition-colors">
                            {lettr.student_name || getStudentName(st) || 'Siswa'}
                          </h4>
                          <span className="px-2 py-0.5 rounded-[var(--ui-radius-pill)] text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200/60">
                            {lettr.class_name || '-'}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 font-semibold flex items-center gap-1.5 mt-0.5">
                          <span>NIS: {lettr.student_nis}</span>
                          {hr.walasName && hr.walasName !== '-' && (
                            <>
                              <span>•</span>
                              <span className="text-slate-500">Walas: {hr.walasName}</span>
                            </>
                          )}
                        </div>
                        <div className="text-[10.5px] font-mono text-purple-800 bg-purple-50/70 px-2 py-1 rounded-[var(--ui-radius-small)] mt-2 border border-purple-100/70 inline-block font-semibold">
                          No: {lettr.letter_no || '-'}
                        </div>
                      </div>

                      {/* Reason / Keperluan Box */}
                      <div className="p-3 bg-slate-50 rounded-[var(--ui-radius-small)] border border-slate-200/70 text-xs">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">
                          Alasan / Keperluan
                        </span>
                        <p className="text-slate-700 leading-relaxed font-medium line-clamp-3" title={lettr.reason}>
                          {lettr.reason || 'Koordinasi pembinaan kedisiplinan siswa.'}
                        </p>
                      </div>

                      {/* Jadwal Menghadap Box (jika ada) */}
                      {lettr.appointment_date && (
                        <div className="p-2.5 bg-purple-50/40 rounded-[var(--ui-radius-small)] border border-purple-100 text-xs text-purple-900 space-y-1">
                          <div className="flex items-center gap-1.5 font-bold text-[11px] text-purple-800">
                            <Calendar size={13} className="text-purple-600 shrink-0" />
                            <span>
                              {new Date(lettr.appointment_date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[10.5px] text-purple-700 font-medium">
                            <Clock size={12} className="text-purple-500 shrink-0" />
                            <span>{lettr.appointment_time || '09.00 WIB s/d Selesai'}</span>
                            <span>•</span>
                            <MapPin size={12} className="text-purple-500 shrink-0" />
                            <span className="truncate">{lettr.appointment_place || 'Ruang BK'}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Bottom Action Footer */}
                    <div className="pt-3 border-t border-slate-100 flex flex-col gap-2.5">
                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium">
                        <span>Diterbitkan: <strong className="text-slate-600">{lettr.created_by_name || 'Guru BK'}</strong></span>
                        {lettr.updated_by_name && (
                          <span className="text-amber-600">Diedit: {lettr.updated_by_name}</span>
                        )}
                      </div>

                      <div className="grid grid-cols-4 gap-1.5 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setPreviewLetter({
                              ...lettr,
                              student_name: getStudentName(st) || lettr.student_name,
                              class_name: getStudentClass(st) || lettr.class_name
                            });
                          }}
                          className="col-span-2 py-1.5 px-2 bg-purple-600 hover:bg-purple-700 text-white rounded-[var(--ui-radius-small)] text-xs font-black flex items-center justify-center gap-1 shadow-xs transition-all cursor-pointer active:scale-98"
                          title="Pratinjau Surat Resmi Kedinasan"
                        >
                          <Eye size={13} />
                          <span>Pratinjau Kop</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => downloadLetterPDF(lettr)}
                          className="py-1.5 px-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-[var(--ui-radius-small)] text-xs font-bold flex items-center justify-center gap-1 shadow-2xs transition-all cursor-pointer"
                          title="Unduh Berkas PDF Resmi"
                        >
                          <Download size={13} />
                          <span className="hidden sm:inline">PDF</span>
                        </button>

                        <div className="flex items-center gap-1 justify-end">
                          <button
                            type="button"
                            onClick={() => {
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
                            className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-[var(--ui-radius-small)] border border-slate-200 bg-white cursor-pointer shadow-2xs"
                            title="Edit Data Surat"
                          >
                            <Edit2 size={13} />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteLetter(lettr.id)}
                            className="p-1.5 hover:bg-rose-50 text-rose-600 rounded-[var(--ui-radius-small)] border border-rose-200 bg-white cursor-pointer shadow-2xs"
                            title="Hapus Surat"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination Container */}
          <div className="p-3.5 bg-white rounded-[var(--ui-radius-card)] shadow-xs border border-slate-200/80">
            <TablePagination
              currentPage={currentPage}
              totalPages={Math.ceil(filteredLetters.length / itemsPerPage) || 1}
              totalItems={filteredLetters.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={(val) => { setItemsPerPage(val); setCurrentPage(1); }}
              isLoading={isLoading}
            />
          </div>
        </div>
      )}

      {/* ── TAB 4: KUNJUNGAN RUMAH / HOME VISIT (1 KOLOM PENUH) ────────────────── */}
      {currentSubTab === 'visit' && (
        <div className="flex flex-col gap-4 animate-in fade-in duration-200">
          {/* Header Action & Filter Bar */}
          <div className="bg-white p-3.5 sm:p-5 rounded-[var(--ui-radius-card)] shadow-xs border border-slate-200/80 flex flex-col gap-3.5">
            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-[var(--ui-radius-small)] bg-sky-100 text-sky-700 flex items-center justify-center font-bold shrink-0 shadow-xs">
                  <Home size={20} strokeWidth={2.2} />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-800 text-sm sm:text-base tracking-tight">Jurnal Kunjungan Rumah (Home Visit)</h3>
                  <p className="text-xs font-semibold text-slate-400">
                    {filteredHomeVisits.length} riwayat kunjungan rumah tercatat oleh tim BK &amp; Walas
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  type="button"
                  onClick={() => {
                    setModalClassFilter('all');
                    setEditingVisit(null);
                    setFormVisit({
                      student_nis: '',
                      visit_date: new Date().toISOString().slice(0, 10),
                      result: '',
                      photo_url: ''
                    });
                    setShowVisitModal(true);
                  }}
                  className="px-4 py-2 text-xs font-black flex items-center justify-center gap-1.5 shadow-xs cursor-pointer bg-sky-600 hover:bg-sky-700 text-white rounded-[var(--ui-radius-small)]"
                >
                  <Plus size={15} strokeWidth={2.5} />
                  <span>+ Catat Home Visit</span>
                </Button>
              </div>
            </div>

            {/* Smart Filter Bar Khusus Home Visit */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 pt-3 border-t border-slate-100">
              <div className="relative sm:col-span-2">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari nama siswa, hasil kunjungan, atau nama petugas..."
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

              <div className="flex items-center gap-1.5">
                <div className="flex-1 min-w-0">
                  <CustomSelect
                    value={filterClass}
                    onChange={setFilterClass}
                    options={classOptions}
                    placeholder="Semua Kelas"
                  />
                </div>
                {(search || filterTingkat !== 'all' || filterClass !== 'all') && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearch('');
                      setFilterTingkat('all');
                      setFilterClass('all');
                    }}
                    className="p-2 text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-[var(--ui-radius-small)] transition-all cursor-pointer shrink-0"
                    title="Reset Filter"
                  >
                    <RotateCcw size={14} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Home Visits List */}
          {filteredHomeVisits.length === 0 ? (
            <div className="bg-white rounded-[var(--ui-radius-card)] p-12 text-center text-slate-400 font-bold text-xs flex flex-col items-center gap-3 border border-slate-200/80 shadow-xs">
              <div className="w-14 h-14 rounded-full bg-sky-50 text-sky-500 flex items-center justify-center border border-sky-100 shadow-2xs">
                <Home size={28} />
              </div>
              <div>
                <h4 className="font-extrabold text-slate-700 text-sm">Belum Ada Kunjungan Rumah</h4>
                <p className="text-xs text-slate-400 mt-0.5">Tidak ada jurnal kunjungan rumah yang cocok dengan filter yang dipilih.</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5 sm:gap-4">
              {filteredHomeVisits.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((hv) => {
                const st = (students || []).find(s => String(getStudentNis(s)) === String(hv.student_nis));
                const hr = getHomeroomInfo(hv.class_name, hv.student_nis);

                return (
                  <div 
                    key={hv.id}
                    className="bg-white rounded-[var(--ui-radius-card)] p-4 sm:p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between gap-3.5 group"
                  >
                    <div className="flex flex-col gap-3">
                      {/* Top Header Card */}
                      <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2.5">
                        <div className="flex items-center gap-1.5 text-sky-800 font-black text-xs">
                          <Calendar size={13} className="text-sky-600" />
                          <span>{new Date(hv.visit_date).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</span>
                        </div>
                        <span className="px-2 py-0.5 rounded-[var(--ui-radius-pill)] text-[10px] font-bold bg-sky-100 text-sky-800 border border-sky-200/70">
                          Home Visit
                        </span>
                      </div>

                      {/* Student Info */}
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-extrabold text-slate-900 text-sm group-hover:text-sky-700 transition-colors">
                            {hv.student_name || getStudentName(st) || 'Siswa'}
                          </h4>
                          <span className="px-2 py-0.5 rounded-[var(--ui-radius-pill)] text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200/60">
                            {hv.class_name || '-'}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 font-semibold flex items-center gap-1.5 mt-0.5">
                          <span>NIS: {hv.student_nis}</span>
                          {hr.walasName && hr.walasName !== '-' && (
                            <>
                              <span>•</span>
                              <span className="text-slate-500">Walas: {hr.walasName}</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Hasil Kunjungan Box */}
                      <div className="p-3 bg-slate-50 rounded-[var(--ui-radius-small)] border border-slate-200/70 text-xs">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">
                          Hasil Pertemuan &amp; Kesepakatan Orang Tua
                        </span>
                        <p className="text-slate-700 leading-relaxed font-medium whitespace-pre-line">
                          {hv.result}
                        </p>
                      </div>

                      {hv.photo_url && (
                        <div className="rounded-[var(--ui-radius-small)] overflow-hidden border border-slate-200/80 max-h-36">
                          <img src={hv.photo_url} alt="Dokumentasi Home Visit" className="w-full h-full object-cover" />
                        </div>
                      )}
                    </div>

                    {/* Footer */}
                    <div className="pt-3 border-t border-slate-100 flex flex-col gap-2.5">
                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium">
                        <span className="flex items-center gap-1">
                          <User size={11} />
                          <span>Petugas: <strong className="text-slate-700">{hv.counselor_name || 'Guru BK'}</strong></span>
                        </span>
                        {hv.created_by_name && (
                          <span className="text-sky-700 font-semibold">Diinput: {hv.created_by_name}</span>
                        )}
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            if (st) openDossier(st);
                          }}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-[var(--ui-radius-small)] text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                        >
                          <Eye size={13} />
                          <span>Dossier 360°</span>
                        </button>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setModalClassFilter(st ? getStudentClass(st) : 'all');
                              setEditingVisit(hv);
                              setFormVisit({
                                student_nis: hv.student_nis,
                                visit_date: hv.visit_date ? hv.visit_date.slice(0, 10) : new Date().toISOString().slice(0, 10),
                                result: hv.result || '',
                                photo_url: hv.photo_url || ''
                              });
                              setShowVisitModal(true);
                            }}
                            className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-[var(--ui-radius-small)] border border-slate-200 bg-white cursor-pointer shadow-2xs"
                            title="Edit Jurnal Kunjungan"
                          >
                            <Edit2 size={13} />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteVisit(hv.id)}
                            className="p-1.5 hover:bg-rose-50 text-rose-600 rounded-[var(--ui-radius-small)] border border-rose-200 bg-white cursor-pointer shadow-2xs"
                            title="Hapus Jurnal Kunjungan"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination Container */}
          <div className="p-3.5 bg-white rounded-[var(--ui-radius-card)] shadow-xs border border-slate-200/80">
            <TablePagination
              currentPage={currentPage}
              totalPages={Math.ceil(filteredHomeVisits.length / itemsPerPage) || 1}
              totalItems={filteredHomeVisits.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={(val) => { setItemsPerPage(val); setCurrentPage(1); }}
              isLoading={isLoading}
            />
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
                {(() => {
                  if (!formSession.student_nis) return null;
                  const selectedStudent = (students || []).find(s => String(getStudentNis(s)) === String(formSession.student_nis));
                  if (!selectedStudent) return null;
                  const cls = getStudentClass(selectedStudent);
                  const ptInfo = studentPointsMap[String(formSession.student_nis)];
                  return (
                    <div className="mt-2 p-2.5 bg-emerald-50/80 border border-emerald-200/90 rounded-[var(--ui-radius-small)] flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800">{getStudentName(selectedStudent)}</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white text-emerald-700 border border-emerald-200 shadow-2xs">
                          Kelas: {cls || '-'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px]">
                        <span className={`px-2 py-0.5 rounded-full font-bold ${
                          (ptInfo?.total_poin || 0) > 75 ? 'bg-rose-100 text-rose-800' :
                          (ptInfo?.total_poin || 0) > 35 ? 'bg-amber-100 text-amber-800' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          Poin Pelanggaran: {ptInfo?.total_poin || 0}
                        </span>
                        <span className="text-slate-500 font-medium">
                          Sesi Sebelumnya: {ptInfo?.sesi_count || 0}x
                        </span>
                      </div>
                    </div>
                  );
                })()}
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
          onClose={() => { setShowVisitModal(false); setEditingVisit(null); }}
          title={editingVisit ? "Edit Jurnal Kunjungan Rumah (Home Visit)" : "Catat Jurnal Kunjungan Rumah (Home Visit)"}
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
                {(() => {
                  if (!formVisit.student_nis) return null;
                  const selectedStudent = (students || []).find(s => String(getStudentNis(s)) === String(formVisit.student_nis));
                  if (!selectedStudent) return null;
                  const cls = getStudentClass(selectedStudent);
                  const hr = getHomeroomInfo(cls, getStudentNis(selectedStudent));
                  return (
                    <div className="mt-2 p-2.5 bg-sky-50/80 border border-sky-200/90 rounded-[var(--ui-radius-small)] flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800">{getStudentName(selectedStudent)}</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white text-sky-700 border border-sky-200 shadow-2xs">
                          Kelas: {cls || '-'}
                        </span>
                      </div>
                      {hr.walasName && hr.walasName !== '-' && (
                        <span className="text-[11px] text-sky-800 font-semibold">
                          Walas: {hr.walasName}
                        </span>
                      )}
                    </div>
                  );
                })()}
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
              <Button type="button" variant="outline" onClick={() => { setShowVisitModal(false); setEditingVisit(null); }}>
                Batal
              </Button>
              <Button type="submit" className="font-bold bg-sky-600 hover:bg-sky-700 text-white shadow-xs">
                {editingVisit ? 'Update Jurnal Home Visit' : 'Simpan Jurnal Home Visit'}
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
                {(() => {
                  if (!formLetter.student_nis) return null;
                  const selectedStudent = (students || []).find(s => String(getStudentNis(s)) === String(formLetter.student_nis));
                  if (!selectedStudent) return null;
                  const cls = getStudentClass(selectedStudent);
                  const hr = getHomeroomInfo(cls, getStudentNis(selectedStudent));
                  return (
                    <div className="mt-2 p-2.5 bg-emerald-50/80 border border-emerald-200/90 rounded-[var(--ui-radius-small)] flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800">{getStudentName(selectedStudent)}</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white text-emerald-700 border border-emerald-200 shadow-2xs">
                          Kelas: {cls || '-'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs">
                        <span className="text-slate-500 text-[11px] font-medium">Wali Kelas:</span>
                        <span className="font-bold text-slate-800">{hr.walasName !== '-' ? hr.walasName : '(Belum diatur)'}</span>
                        {hr.walasNip && <span className="text-[10px] text-slate-500 font-mono">({hr.walasNip})</span>}
                      </div>
                    </div>
                  );
                })()}
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

            <div className="flex flex-wrap justify-between items-center gap-2 pt-3 border-t border-slate-100 shrink-0">
              <Button 
                type="button" 
                variant="outline"
                onClick={() => {
                  if (!formLetter.student_nis) {
                    showToast("Pilih siswa terlebih dahulu untuk melihat pratinjau", "error");
                    return;
                  }
                  const selectedStudent = (students || []).find(s => String(getStudentNis(s)) === String(formLetter.student_nis));
                  setPreviewLetter({
                    ...formLetter,
                    student_name: getStudentName(selectedStudent),
                    class_name: getStudentClass(selectedStudent)
                  });
                }}
                className="font-bold text-xs flex items-center gap-1.5 text-purple-700 border-purple-200 hover:bg-purple-50"
              >
                <Eye size={14} />
                <span>Pratinjau Draf Surat</span>
              </Button>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" onClick={() => { setShowLetterModal(false); setEditingLetter(null); }}>
                  Batal
                </Button>
                <Button type="submit" className="font-bold bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-1.5 shadow-xs">
                  <Printer size={14} />
                  <span>{editingLetter ? 'Simpan & Pratinjau Surat' : 'Terbitkan & Pratinjau Surat'}</span>
                </Button>
              </div>
            </div>
          </form>
        </Modal>
      )}

      {/* ── MODAL: PRATINJAU SURAT RESMI (PREVIEW SEBELUM CETAK) ───── */}
      {previewLetter && (() => {
        const studentNis = previewLetter.student_nis || '-';
        const st = (students || []).find(s => String(getStudentNis(s)) === String(studentNis));
        const studentName = previewLetter.student_name && previewLetter.student_name !== 'Siswa Terkait' 
          ? previewLetter.student_name 
          : (getStudentName(st) || 'Siswa Terkait');
        const className = previewLetter.class_name && previewLetter.class_name !== '-' 
          ? previewLetter.class_name 
          : (getStudentClass(st) || '-');

        const hrInfo = getHomeroomInfo(className, studentNis);
        const walasName = hrInfo.walasName !== '-' ? hrInfo.walasName : '';
        const walasNip = hrInfo.walasNip || '';

        const letterNo = previewLetter.letter_no || `421.5/${Math.floor(100 + Math.random() * 900)}/SMK-BK/${new Date().getFullYear()}`;
        const letterType = previewLetter.letter_type || 'Panggilan Orang Tua I';
        const issueDateStr = new Date(previewLetter.issue_date || Date.now()).toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        });
        const appointDateStr = previewLetter.appointment_date 
          ? new Date(previewLetter.appointment_date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
          : 'Hari Kerja Efektif';
        const appointTime = previewLetter.appointment_time || '09.00 WIB s/d Selesai';
        const appointPlace = previewLetter.appointment_place || 'Ruang Bimbingan & Konseling (BK)';
        const appointPerson = previewLetter.appointed_person || 'Guru BK / Koordinator BK';
        const reason = previewLetter.reason || 'Koordinasi pembinaan kedisiplinan dan evaluasi perkembangan belajar siswa.';

        const profileObj = useDataStore.getState().schoolProfile || useAppStore.getState().schoolProfile || appSettings.schoolProfile || {};
        const namaSekolah = profileObj.nama_sekolah || appSettings.kopSuratBaris3 || 'SMK KARYA GUNA 2 BEKASI';
        const namaKepsek = appSettings.namaKepsek || profileObj.kepala_sekolah || profileObj.nama_kepala_sekolah || appSettings.namaKepalaSekolah || 'Kepala Sekolah';
        const nipKepsek = appSettings.nipKepsek || profileObj.nip_kepala_sekolah || profileObj.nip || appSettings.nipKepalaSekolah || '';

        let kota = profileObj.kabupaten || profileObj.kota || appSettings.kopSuratKota || appSettings.lokasiSurat || '';
        if (!kota || kota.toLowerCase() === 'di tempat') {
          if (appSettings.kopSuratAlamat && appSettings.kopSuratAlamat.toLowerCase().includes('bekasi')) kota = 'Bekasi';
          else if (appSettings.kopSuratBaris2 && appSettings.kopSuratBaris2.toLowerCase().includes('bekasi')) kota = 'Bekasi';
          else kota = 'Bekasi';
        }

        const guruBkName = user?.name || user?.username || 'Guru Bimbingan & Konseling';
        const guruBkNip = user?.nip && user?.nip !== '-' ? user.nip : '';

        const isSP = letterType.toUpperCase().includes('SP') || letterType.toUpperCase().includes('PERINGATAN');
        const isPerjanjian = letterType.toUpperCase().includes('PERJANJIAN') || letterType.toUpperCase().includes('PERNYATAAN');

        const logoData = appSettings.kopSuratLogo || profileObj.logo_url || appSettings.logoUrl;

        return (
          <Modal
            isOpen={!!previewLetter}
            onClose={() => setPreviewLetter(null)}
            title="Pratinjau Surat Resmi (Sebelum Cetak)"
            maxWidth="max-w-4xl"
          >
            <div className="p-4 sm:p-6 bg-slate-100 flex flex-col gap-4">
              {/* Toolbar Atas */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-[var(--ui-radius-card)] border border-slate-200/80 shadow-xs">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-[var(--ui-radius-pill)] text-xs font-black bg-purple-100 text-purple-800 border border-purple-200">
                    {letterType}
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-500">
                    No: {letterNo}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handlePrintDirect(previewLetter)}
                    className="flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100"
                    title="Cetak langsung menggunakan dialog printer"
                  >
                    <Printer size={14} className="text-slate-600" />
                    <span>Cetak Langsung</span>
                  </Button>
                  <Button
                    type="button"
                    onClick={() => downloadLetterPDF(previewLetter)}
                    className="flex items-center gap-1.5 text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 shadow-xs"
                    title="Unduh file PDF resmi dokumen ini"
                  >
                    <Download size={14} />
                    <span>Unduh PDF</span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setPreviewLetter(null)}
                    className="text-xs font-bold"
                  >
                    Tutup
                  </Button>
                </div>
              </div>

              {/* Canvas Kertas A4 Pratinjau */}
              <div className="max-h-[72vh] overflow-y-auto p-2 sm:p-4 flex justify-center bg-slate-200/60 rounded-[var(--ui-radius-card)] border border-slate-300/70">
                <div 
                  ref={printPaperRef}
                  className="preview-paper w-full max-w-[210mm] bg-white border border-slate-300 shadow-xl rounded-sm p-8 sm:p-12 font-serif text-slate-900 leading-relaxed text-[13px] select-text"
                >
                  {/* KOP SURAT SESUAI SETTING ADMIN */}
                  {appSettings.useKopSuratGambar && appSettings.kopSuratGambar ? (
                    <div className="w-full flex justify-center overflow-hidden pb-3 border-b-2 border-slate-900 mb-4">
                      <img 
                        src={appSettings.kopSuratGambar} 
                        alt="Kop Surat Resmi" 
                        className="w-full max-h-[140px] object-contain mx-auto"
                      />
                    </div>
                  ) : (
                    <div className={`kop-container relative pb-3 text-center mb-3 ${
                      appSettings.kopDivider === 'single' ? 'border-b-2 border-slate-900' :
                      appSettings.kopDivider === 'thick' ? 'border-b-4 border-slate-900' :
                      appSettings.kopDivider === 'dashed' ? 'border-b-2 border-dashed border-slate-900' :
                      appSettings.kopDivider === 'none' ? '' :
                      'border-b-[3.5px] border-double border-slate-900'
                    }`}>
                      {logoData && (
                        <div className="absolute left-0 top-0 bottom-3 flex items-center">
                          <img 
                            src={logoData} 
                            alt="Logo Sekolah" 
                            className="w-16 h-16 object-contain"
                            onError={(e) => { e.target.style.display = 'none'; }}
                          />
                        </div>
                      )}
                      <div className="px-14">
                        <p className="text-[11px] font-sans font-black tracking-wider uppercase text-slate-700">
                          {appSettings.kopSuratBaris1 || "PEMERINTAH DAERAH PROVINSI JAWA BARAT"}
                        </p>
                        <p className="text-[12px] font-sans font-black tracking-wider uppercase text-slate-800">
                          {appSettings.kopSuratBaris2 || "DINAS PENDIDIKAN"}
                        </p>
                        <p className="text-[15px] font-sans font-black tracking-wide uppercase text-slate-950 mt-0.5">
                          {appSettings.kopSuratBaris3 || namaSekolah}
                        </p>
                        <p className="text-[10.5px] font-sans font-bold tracking-wide uppercase text-slate-700">
                          LAYANAN BIMBINGAN DAN KONSELING (BK)
                        </p>
                        {appSettings.kopSuratAlamat && (
                          <p className="text-[10px] font-sans text-slate-600 mt-1 whitespace-pre-line">
                            {appSettings.kopSuratAlamat}
                          </p>
                        )}
                        {appSettings.kopSuratKontak && (
                          <p className="text-[9.5px] font-sans text-slate-500">
                            {appSettings.kopSuratKontak}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* KONTEN SURAT */}
                  {isPerjanjian ? (
                    <div className="pt-6 space-y-4">
                      <div className="text-center">
                        <h2 className="text-base font-bold uppercase tracking-wide">SURAT PERNYATAAN &amp; PERJANJIAN KEDISIPLINAN</h2>
                        <p className="text-xs font-sans text-slate-600 font-mono mt-0.5">Nomor: {letterNo}</p>
                      </div>
                      <p className="text-justify">Yang bertanda tangan di bawah ini, saya:</p>
                      <table className="w-full text-xs font-sans ml-3 my-2">
                        <tbody>
                          <tr>
                            <td className="w-32 py-1 font-bold">Nama Siswa</td>
                            <td className="w-4 py-1">:</td>
                            <td className="py-1 font-bold">{studentName}</td>
                          </tr>
                          <tr>
                            <td className="py-1 font-bold">NIS / Kelas</td>
                            <td className="py-1">:</td>
                            <td className="py-1">{studentNis} / {className}</td>
                          </tr>
                          <tr>
                            <td className="py-1 font-bold">Wali Kelas</td>
                            <td className="py-1">:</td>
                            <td className="py-1 font-semibold">{walasName || '-'} {walasNip && `(NIP. ${walasNip})`}</td>
                          </tr>
                        </tbody>
                      </table>
                      <p className="text-justify leading-relaxed">
                        Menyatakan dengan sesungguhnya dan penuh kesadaran bahwa saya telah melakukan pelanggaran tata tertib sekolah berupa: <strong>"{reason}"</strong>.
                      </p>
                      <div className="space-y-1">
                        <p>Dengan ini saya berjanji dengan sungguh-sungguh untuk:</p>
                        <ol className="list-decimal list-inside ml-2 space-y-1">
                          <li>Menaati dan mematuhi seluruh peraturan serta tata tertib yang berlaku di sekolah.</li>
                          <li>Tidak akan mengulangi perbuatan pelanggaran tersebut maupun pelanggaran tata tertib lainnya.</li>
                          <li>Bersungguh-sungguh mengikuti kegiatan pembelajaran dan memperbaiki sikap serta kedisiplinan.</li>
                        </ol>
                      </div>
                      <p className="text-justify leading-relaxed">
                        Apabila di kemudian hari saya melanggar pernyataan ini, maka saya bersedia menerima sanksi yang lebih berat dari pihak sekolah sampai dengan dikembalikan kepada orang tua / dikeluarkan dari sekolah.
                      </p>

                      <div className="pt-4 flex justify-end">
                        <p>{kota}, {issueDateStr}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-center text-xs font-sans pt-2">
                        <div>
                          <p>Mengetahui,</p>
                          <p>Orang Tua / Wali Siswa,</p>
                          <div className="h-16"></div>
                          <p className="font-bold">( .......................................... )</p>
                        </div>
                        <div>
                          <p>&nbsp;</p>
                          <p>Yang Membuat Pernyataan,</p>
                          <div className="h-16"></div>
                          <p className="font-bold">( {studentName} )</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-center text-xs font-sans pt-6 border-t border-slate-200">
                        <div>
                          <p>Mengetahui,</p>
                          <p className="font-bold">Kepala Sekolah,</p>
                          <div className="h-14"></div>
                          <p className="font-bold underline">{namaKepsek && namaKepsek !== 'Kepala Sekolah' ? namaKepsek : '( ........................................ )'}</p>
                          {nipKepsek && <p className="text-[10px] text-slate-500">NIP. {nipKepsek}</p>}
                        </div>
                        <div>
                          <p>Wali Kelas,</p>
                          <p className="font-bold">{className},</p>
                          <div className="h-14"></div>
                          <p className="font-bold underline">{walasName || '( ........................................ )'}</p>
                          {walasNip && <p className="text-[10px] text-slate-500">NIP. {walasNip}</p>}
                        </div>
                        <div>
                          <p>Guru Bimbingan &amp;</p>
                          <p className="font-bold">Konseling (BK),</p>
                          <div className="h-14"></div>
                          <p className="font-bold underline">{guruBkName}</p>
                          {guruBkNip && <p className="text-[10px] text-slate-500">NIP. {guruBkNip}</p>}
                        </div>
                      </div>
                    </div>
                  ) : isSP ? (
                    <div className="pt-6 space-y-4">
                      <div className="text-center">
                        <h2 className="text-base font-bold uppercase tracking-wide">SURAT PERINGATAN ({letterType.toUpperCase()})</h2>
                        <p className="text-xs font-sans text-slate-600 font-mono mt-0.5">Nomor: {letterNo}</p>
                      </div>
                      <p className="text-justify">Berdasarkan evaluasi tata tertib dan catatan buku kedisiplinan siswa, diterbitkan kepada:</p>
                      <table className="w-full text-xs font-sans ml-3 my-2">
                        <tbody>
                          <tr>
                            <td className="w-32 py-1 font-bold">Nama Siswa</td>
                            <td className="w-4 py-1">:</td>
                            <td className="py-1 font-bold">{studentName}</td>
                          </tr>
                          <tr>
                            <td className="py-1 font-bold">NIS / Kelas</td>
                            <td className="py-1">:</td>
                            <td className="py-1">{studentNis} / {className}</td>
                          </tr>
                          <tr>
                            <td className="py-1 font-bold">Wali Kelas</td>
                            <td className="py-1">:</td>
                            <td className="py-1 font-semibold">{walasName || '-'} {walasNip && `(NIP. ${walasNip})`}</td>
                          </tr>
                        </tbody>
                      </table>
                      <p className="text-justify leading-relaxed">
                        Bahwa siswa tersebut di atas telah melakukan pelanggaran terhadap peraturan dan tata tertib sekolah, yaitu:<br />
                        <span className="font-semibold italic">"{reason}"</span>.
                      </p>
                      <p className="text-justify leading-relaxed">
                        Sehubungan dengan hal tersebut di atas, pihak sekolah memberikan sanksi pembinaan berupa <strong>{letterType.toUpperCase()}</strong>.
                      </p>
                      <p className="text-justify leading-relaxed">
                        Kami mengingatkan kepada siswa bersangkutan serta orang tua/wali murid agar segera melakukan pembinaan intensif. Apabila setelah diterbitkannya surat peringatan ini siswa tetap tidak menunjukkan perubahan sikap positif, pihak sekolah akan mengambil tindakan tegas berikutnya sesuai regulasi kedisiplinan yang berlaku.
                      </p>

                      <div className="pt-4 flex justify-end">
                        <p>{kota}, {issueDateStr}</p>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-center text-xs font-sans pt-6">
                        <div>
                          <p>Mengetahui,</p>
                          <p className="font-bold">Kepala Sekolah,</p>
                          <div className="h-16"></div>
                          <p className="font-bold underline">{namaKepsek && namaKepsek !== 'Kepala Sekolah' ? namaKepsek : '( ........................................ )'}</p>
                          {nipKepsek && <p className="text-[10px] text-slate-500">NIP. {nipKepsek}</p>}
                        </div>
                        <div>
                          <p>Wali Kelas,</p>
                          <p className="font-bold">{className},</p>
                          <div className="h-16"></div>
                          <p className="font-bold underline">{walasName || '( ........................................ )'}</p>
                          {walasNip && <p className="text-[10px] text-slate-500">NIP. {walasNip}</p>}
                        </div>
                        <div>
                          <p>Guru Bimbingan &amp;</p>
                          <p className="font-bold">Konseling (BK),</p>
                          <div className="h-16"></div>
                          <p className="font-bold underline">{guruBkName}</p>
                          {guruBkNip && <p className="text-[10px] text-slate-500">NIP. {guruBkNip}</p>}
                        </div>
                      </div>
                    </div>
                  ) : (
                    // === SURAT PANGGILAN ORANG TUA ===
                    <div className="pt-5 space-y-3.5">
                      <div className="flex justify-between items-start text-xs font-sans">
                        <table className="w-auto">
                          <tbody>
                            <tr>
                              <td className="w-20 font-semibold py-0.5">Nomor</td>
                              <td className="w-4 py-0.5">:</td>
                              <td className="py-0.5 font-mono">{letterNo}</td>
                            </tr>
                            <tr>
                              <td className="font-semibold py-0.5">Lampiran</td>
                              <td className="py-0.5">:</td>
                              <td className="py-0.5">-</td>
                            </tr>
                            <tr>
                              <td className="font-semibold py-0.5">Perihal</td>
                              <td className="py-0.5">:</td>
                              <td className="py-0.5 font-black uppercase text-purple-950">{letterType}</td>
                            </tr>
                          </tbody>
                        </table>
                        <div className="text-right">
                          <p className="font-semibold">{kota}, {issueDateStr}</p>
                        </div>
                      </div>

                      <div className="text-xs pt-1">
                        <p>Kepada Yth.</p>
                        <p className="font-bold">Bapak / Ibu Orang Tua / Wali Siswa</p>
                        <p>di Tempat</p>
                      </div>

                      <div className="text-xs space-y-2 pt-1">
                        <p>Dengan hormat,</p>
                        <p className="text-justify leading-relaxed">
                          Sehubungan dengan perkembangan pembinaan ketertiban dan kedisiplinan putra/putri Bapak/Ibu di sekolah, dengan ini kami mengharap kehadiran Bapak/Ibu pada:
                        </p>

                        <div className="bg-slate-50/70 p-3 rounded border border-slate-200/80 my-2">
                          <table className="w-full text-xs font-sans">
                            <tbody>
                              <tr>
                                <td className="w-36 py-1 font-bold text-slate-700">Nama Siswa</td>
                                <td className="w-4 py-1">:</td>
                                <td className="py-1 font-bold text-slate-900">{studentName}</td>
                              </tr>
                              <tr>
                                <td className="py-1 font-bold text-slate-700">NIS / Kelas</td>
                                <td className="py-1">:</td>
                                <td className="py-1 text-slate-800">{studentNis} / {className}</td>
                              </tr>
                              <tr className="bg-emerald-50/60">
                                <td className="py-1 font-bold text-emerald-800">Wali Kelas</td>
                                <td className="py-1 text-emerald-800">:</td>
                                <td className="py-1 font-bold text-emerald-900">
                                  {walasName || '(Belum diatur)'} {walasNip && <span className="font-normal text-slate-600 font-mono text-[11px]">(NIP. {walasNip})</span>}
                                </td>
                              </tr>
                              <tr>
                                <td className="py-1 font-bold text-slate-700">Hari / Tanggal</td>
                                <td className="py-1">:</td>
                                <td className="py-1 text-slate-900">{appointDateStr}</td>
                              </tr>
                              <tr>
                                <td className="py-1 font-bold text-slate-700">Waktu / Pukul</td>
                                <td className="py-1">:</td>
                                <td className="py-1 text-slate-900">{appointTime}</td>
                              </tr>
                              <tr>
                                <td className="py-1 font-bold text-slate-700">Tempat</td>
                                <td className="py-1">:</td>
                                <td className="py-1 text-slate-900">{appointPlace}</td>
                              </tr>
                              <tr>
                                <td className="py-1 font-bold text-slate-700">Menghadap</td>
                                <td className="py-1">:</td>
                                <td className="py-1 text-slate-900">{appointPerson}</td>
                              </tr>
                              <tr>
                                <td className="py-1 font-bold text-slate-700 align-top">Keperluan</td>
                                <td className="py-1 align-top">:</td>
                                <td className="py-1 text-slate-900 leading-relaxed">{reason}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>

                        <p className="text-justify leading-relaxed">
                          Mengingat pentingnya koordinasi ini demi kebaikan dan kelancaran pendidikan putra/putri Bapak/Ibu, kami sangat mengharapkan kehadiran Bapak/Ibu tepat pada waktunya. Atas perhatian dan kerja sama yang baik, kami ucapkan terima kasih.
                        </p>
                      </div>

                      {/* KOLOM TANDA TANGAN 3 KOLOM */}
                      <div className="grid grid-cols-3 gap-2 text-center text-xs font-sans pt-6">
                        <div>
                          <p>Mengetahui,</p>
                          <p className="font-bold">Kepala Sekolah,</p>
                          <div className="h-16"></div>
                          <p className="font-bold underline text-slate-900">
                            {namaKepsek && namaKepsek !== 'Kepala Sekolah' ? namaKepsek : '( ........................................ )'}
                          </p>
                          {nipKepsek && <p className="text-[10px] text-slate-500 font-mono">NIP. {nipKepsek}</p>}
                        </div>

                        <div>
                          <p>Wali Kelas,</p>
                          <p className="font-bold">{className},</p>
                          <div className="h-16"></div>
                          <p className="font-bold underline text-slate-900">
                            {walasName || '( ........................................ )'}
                          </p>
                          {walasNip && <p className="text-[10px] text-slate-500 font-mono">NIP. {walasNip}</p>}
                        </div>

                        <div>
                          <p>Guru Bimbingan &amp;</p>
                          <p className="font-bold">Konseling (BK),</p>
                          <div className="h-16"></div>
                          <p className="font-bold underline text-slate-900">
                            {guruBkName}
                          </p>
                          {guruBkNip && <p className="text-[10px] text-slate-500 font-mono">NIP. {guruBkNip}</p>}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Modal>
        );
      })()}

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
                      <div key={idx} className="p-3 bg-slate-50 rounded-[var(--ui-radius-small)] border border-slate-200/80 text-xs space-y-1.5 shadow-2xs">
                        <div className="flex justify-between items-center font-bold text-slate-700">
                          <span className="flex items-center gap-1.5">
                            <span className="w-4 h-4 rounded-full bg-sky-100 text-sky-800 font-black text-[9.5px] flex items-center justify-center">#{idx + 1}</span>
                            <span>Kunjungan: {new Date(hv.visit_date).toLocaleDateString('id-ID')}</span>
                          </span>
                          <span className="text-slate-500 font-semibold text-[11px]">Petugas: {hv.counselor_name || 'Guru BK'}</span>
                        </div>
                        <p className="text-slate-600 font-medium">{hv.result}</p>
                        <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-200/60 flex justify-between items-center">
                          <span>Diinput oleh: <strong className="text-slate-600">{hv.created_by_name || hv.counselor_name || 'Guru BK'}</strong></span>
                          {hv.created_at && <span>{new Date(hv.created_at).toLocaleDateString('id-ID')}</span>}
                        </div>
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
                      <div key={idx} className="p-3 bg-slate-50 rounded-[var(--ui-radius-small)] border border-slate-200/80 text-xs flex justify-between items-center shadow-2xs">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="w-4 h-4 rounded-full bg-purple-100 text-purple-800 font-black text-[9.5px] flex items-center justify-center">#{idx + 1}</span>
                            <span className="font-extrabold text-slate-800">{lt.letter_type} (No: {lt.letter_no || '-'})</span>
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5 flex flex-wrap items-center gap-1.5">
                            <span>Tanggal: {new Date(lt.issue_date).toLocaleDateString('id-ID')}</span>
                            <span>•</span>
                            <span>Diinput oleh: <strong className="text-slate-600">{lt.created_by_name || 'Guru BK'}</strong></span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setPreviewLetter({
                            ...lt,
                            student_name: dossierStudent.name || lt.student_name,
                            class_name: dossierStudent.class_name || lt.class_name
                          })}
                          className="px-2.5 py-1 bg-white hover:bg-purple-50 border border-purple-200 rounded text-xs font-bold text-purple-700 cursor-pointer flex items-center gap-1 shadow-xs"
                        >
                          <Eye size={12} /> Pratinjau &amp; Cetak
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
