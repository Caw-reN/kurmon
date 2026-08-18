import React, { useState, useMemo, useEffect } from 'react';
import { 
  BookOpen, Search, ShieldAlert, CheckCircle2, History, MessageSquare, 
  Download, Users, TrendingUp, AlertOctagon, Printer, X, Trash2, Plus, 
  FileText, Home, Calendar, Clock, AlertTriangle, ShieldCheck, HeartHandshake, Eye, Send, AlertCircle, Edit2, User
} from 'lucide-react';
import jsPDF from 'jspdf';
import { Button, Modal, UISelect, TablePagination } from '../../components/ui.jsx';
import { CustomSelect } from '../../components/CustomSelect.jsx';
import { StatCard, PageHeader } from '../../components/monitoring/ui/index.js';
import useAuthStore from "../../store/monitoring/authStore.js";
import { useAppStore } from "../../store/useAppStore.js";
import * as XLSX from 'xlsx';

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

  // Active view: 'ringkasan' (or 'ews') | 'konseling' | 'surat' | 'dossier'
  const currentSubTab = tab === 'ringkasan' || tab === 'ews' ? 'ringkasan' : tab;

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
  }, [search, filterClass, filterCategory, filterStatus, currentSubTab]);

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

    // Sum points from riwayat
    riwayat.forEach(r => {
      const nis = r.siswa_nis;
      if (map[nis]) {
        map[nis].total_poin += parseInt(r.poin || 0, 10);
        map[nis].riwayat_list.push(r);
      }
    });

    // Count sessions
    bkSessions.forEach(ses => {
      const nis = ses.student_nis;
      if (map[nis]) {
        map[nis].sesi_count = (map[nis].sesi_count || 0) + 1;
      }
    });

    // Determine risk level
    Object.values(map).forEach(s => {
      if (s.total_poin >= 75 || s.sesi_count >= 5) {
        s.risk_level = 'Tinggi';
      } else if (s.total_poin >= 35 || s.sesi_count >= 2) {
        s.risk_level = 'Sedang';
      } else {
        s.risk_level = 'Rendah';
      }
    });

    return map;
  }, [students, riwayat, bkSessions]);

  // Filtered student list for Dossier / High Risk Table
  const studentPointsList = useMemo(() => {
    return Object.values(studentPointsMap).filter(s => {
      if (filterClass !== "all" && s.class_name !== filterClass) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          (s.name && s.name.toLowerCase().includes(q)) ||
          (s.nis && s.nis.toLowerCase().includes(q)) ||
          (s.class_name && s.class_name.toLowerCase().includes(q))
        );
      }
      return true;
    }).sort((a, b) => b.total_poin - a.total_poin);
  }, [studentPointsMap, filterClass, search]);

  // High Risk Students (EWS)
  const highRiskStudents = useMemo(() => {
    return Object.values(studentPointsMap)
      .filter(s => s.risk_level === 'Tinggi' || s.total_poin >= 50)
      .sort((a, b) => b.total_poin - a.total_poin);
  }, [studentPointsMap]);

  // Filtered Sessions List
  const filteredSessions = useMemo(() => {
    return bkSessions.filter(ses => {
      if (filterCategory !== "all" && ses.category !== filterCategory) return false;
      if (filterStatus !== "all" && ses.status !== filterStatus) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          (ses.student_name && ses.student_name.toLowerCase().includes(q)) ||
          (ses.student_nis && ses.student_nis.toLowerCase().includes(q)) ||
          (ses.problem && ses.problem.toLowerCase().includes(q)) ||
          (ses.solution && ses.solution.toLowerCase().includes(q))
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
      const generatedNo = formLetter.letter_no?.trim() || `421.5/${Math.floor(100 + Math.random() * 900)}/SMK-BK/${new Date().getFullYear()}`;
      const payload = {
        ...formLetter,
        letter_no: generatedNo,
        issue_date: formLetter.issue_date?.trim() || new Date().toISOString().slice(0, 10),
        appointment_date: formLetter.appointment_date?.trim() || null
      };

      const res = await fetch("/api/kedisiplinan/bk/letters", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${authToken}` },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (data.ok) {
        showToast(`Surat (${formLetter.letter_type}) berhasil diterbitkan!`);
        setShowLetterModal(false);
        fetchData();
        // Automatically offer download
        if (data.data) {
          downloadLetterPDF(data.data);
        }
      } else {
        showToast(data.error || "Gagal menerbitkan surat", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Terjadi kesalahan koneksi", "error");
    }
  };

  // Download PDF Surat Resmi BK (Panggilan, SP, Perjanjian)
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
        // ── FORMAT: SURAT PERNYATAAN / PERJANJIAN SISWA ──
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

        // 4 Columns Signatures
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
        // ── FORMAT: SURAT PERINGATAN (SP 1 / SP 2 / SP 3) ──
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
        // ── FORMAT: SURAT PANGGILAN ORANG TUA / WALI ──
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

      // Download file PDF
      const cleanFileName = `${letterType.replace(/[^a-zA-Z0-9]/g, '_')}_${studentName.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
      doc.save(cleanFileName);
      showToast("File PDF Surat resmi berhasil diunduh!");
    } catch (err) {
      console.error("PDF Export Error:", err);
      showToast("Gagal mengunduh PDF surat", "error");
    }
  };

  // Handle Delete Home Visit
  const handleDeleteVisit = async (id) => {
    if (!window.confirm("Apakah Anda yakin ingin menghapus catatan kunjungan rumah ini?")) return;
    try {
      const res = await fetch(`/api/kedisiplinan/bk/home-visits/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${authToken}` }
      });
      const data = await res.json();
      if (data.ok) {
        showToast("Jurnal kunjungan rumah berhasil dihapus");
        fetchData();
      } else {
        showToast(data.error || "Gagal menghapus jurnal", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Terjadi kesalahan jaringan", "error");
    }
  };

  // Handle Delete Letter
  const handleDeleteLetter = async (id) => {
    if (!window.confirm("Apakah Anda yakin ingin menghapus arsip surat ini?")) return;
    try {
      const res = await fetch(`/api/kedisiplinan/bk/letters/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${authToken}` }
      });
      const data = await res.json();
      if (data.ok) {
        showToast("Arsip surat berhasil dihapus");
        fetchData();
      } else {
        showToast(data.error || "Gagal menghapus surat", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Terjadi kesalahan jaringan", "error");
    }
  };

  // Handle Delete Session
  const handleDeleteSession = async (id) => {
    if (!window.confirm("Apakah Anda yakin ingin menghapus catatan sesi konseling ini?")) return;
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
      console.error(err);
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

      {/* ── TAB 1: DASHBOARD RINGKASAN & EARLY WARNING SYSTEM (EWS) ────────────────── */}
      {currentSubTab === 'ringkasan' && (
        <div className="flex flex-col gap-4 sm:gap-5 animate-in fade-in duration-200">
          {/* Quick Action Tiles (Touch-Friendly & Clear for Mobile + Desktop) */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3 bg-white p-2.5 sm:p-3.5 rounded-[var(--ui-radius-card)] border border-slate-200/80 shadow-xs">
            <button
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
              className="flex flex-col sm:flex-row items-center justify-center gap-1.5 sm:gap-2.5 p-2 sm:p-3 rounded-[var(--ui-radius-small)] bg-emerald-50/90 hover:bg-emerald-100/90 text-emerald-900 border border-emerald-200/80 transition-all font-bold text-xs cursor-pointer shadow-2xs active:scale-95 text-center min-h-[56px] sm:min-h-[58px]"
            >
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                <Plus size={16} strokeWidth={2.5} />
              </div>
              <div className="text-center sm:text-left leading-tight">
                <span className="block font-black text-[11px] sm:text-xs text-emerald-950">+ Sesi BK</span>
                <span className="hidden sm:block text-[9.5px] text-emerald-700 font-medium">Catat konseling</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setShowVisitModal(true)}
              className="flex flex-col sm:flex-row items-center justify-center gap-1.5 sm:gap-2.5 p-2 sm:p-3 rounded-[var(--ui-radius-small)] bg-sky-50/90 hover:bg-sky-100/90 text-sky-900 border border-sky-200/80 transition-all font-bold text-xs cursor-pointer shadow-2xs active:scale-95 text-center min-h-[56px] sm:min-h-[58px]"
            >
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-sky-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                <Home size={15} strokeWidth={2.5} />
              </div>
              <div className="text-center sm:text-left leading-tight">
                <span className="block font-black text-[11px] sm:text-xs text-sky-950">+ Home Visit</span>
                <span className="hidden sm:block text-[9.5px] text-sky-700 font-medium">Kunjungan rumah</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setShowLetterModal(true)}
              className="flex flex-col sm:flex-row items-center justify-center gap-1.5 sm:gap-2.5 p-2 sm:p-3 rounded-[var(--ui-radius-small)] bg-purple-50/90 hover:bg-purple-100/90 text-purple-900 border border-purple-200/80 transition-all font-bold text-xs cursor-pointer shadow-2xs active:scale-95 text-center min-h-[56px] sm:min-h-[58px]"
            >
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                <Printer size={15} strokeWidth={2.5} />
              </div>
              <div className="text-center sm:text-left leading-tight">
                <span className="block font-black text-[11px] sm:text-xs text-purple-950">+ Surat / SP</span>
                <span className="hidden sm:block text-[9.5px] text-purple-700 font-medium">Panggilan ortu</span>
              </div>
            </button>
          </div>

          {/* Stat Cards Row - 2 columns on mobile, 4 on desktop */}
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
              label="Siswa Resiko Tinggi"
              value={highRiskStudents.filter(s => s.risk_level === 'Tinggi').length}
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

                      <div className="grid grid-cols-2 sm:flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => {
                            setFormLetter({ student_nis: st.nis, letter_type: st.total_poin >= 75 ? 'SP 1' : 'Panggilan Orang Tua', reason: `Akumulasi poin kedisiplinan mencapai ${st.total_poin} poin.` });
                            setShowLetterModal(true);
                          }}
                          className="px-3 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-[var(--ui-radius-small)] text-xs font-bold transition-all border border-rose-200/70 cursor-pointer flex items-center justify-center gap-1 shadow-2xs"
                        >
                          <FileText size={13} />
                          <span>{st.total_poin >= 75 ? 'Terbit SP' : 'Surat Ortu'}</span>
                        </button>

                        <button
                          onClick={() => openDossier(st)}
                          className="px-3 py-1.5 bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 rounded-[var(--ui-radius-small)] text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 shadow-2xs"
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
      {currentSubTab === 'konseling' && (
        <div className="flex flex-col gap-4 animate-in fade-in duration-200">
          {/* Header Action & Filters */}
          <div className="bg-white p-3.5 sm:p-4 rounded-[var(--ui-radius-card)] shadow-xs border border-slate-100 flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2.5">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari nama siswa, NIS, atau deskripsi masalah..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200/80 rounded-[var(--ui-radius-small)] text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[var(--ui-primary)]"
                />
              </div>

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
                className="px-4 py-2.5 text-xs font-black flex items-center justify-center gap-1.5 shadow-xs cursor-pointer bg-[var(--ui-primary)] hover:opacity-90 text-white rounded-[var(--ui-radius-small)] transition-all active:scale-95 shrink-0"
              >
                <Plus size={15} strokeWidth={2.5} />
                <span>+ Catat Sesi Baru</span>
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
              <div className="col-span-1">
                <CustomSelect
                  value={filterCategory}
                  onChange={val => setFilterCategory(val)}
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

              <div className="col-span-1">
                <CustomSelect
                  value={filterStatus}
                  onChange={val => setFilterStatus(val)}
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
          <div className="hidden md:block bg-white rounded-[var(--ui-radius-card)] shadow-xs border border-slate-100 overflow-hidden">
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
                              <Edit2 size={14} />
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
                  {/* Card Header: Student name, class, status */}
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

                  {/* Category & Date badges */}
                  <div className="flex flex-wrap items-center gap-1.5 text-[10.5px]">
                    <span className="px-2 py-0.5 rounded-[var(--ui-radius-pill)] font-bold bg-slate-100 text-slate-700">
                      {ses.category}
                    </span>
                    <span className="text-slate-400 font-medium flex items-center gap-1">
                      <Calendar size={11} className="text-slate-400" />
                      {new Date(ses.session_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>

                  {/* Problem & Solution snippet */}
                  <div className="p-2.5 bg-slate-50/80 rounded-[var(--ui-radius-small)] border border-slate-100 text-xs">
                    <p className="font-semibold text-slate-700 leading-relaxed">
                      <span className="font-bold text-slate-900 block text-[10px] uppercase tracking-wider text-slate-400 mb-0.5">Permasalahan</span>
                      {ses.problem}
                    </p>
                    {ses.solution && (
                      <p className="text-slate-600 mt-2 pt-2 border-t border-slate-200/50 leading-relaxed">
                        <span className="font-bold text-slate-900 block text-[10px] uppercase tracking-wider text-slate-400 mb-0.5">Rencana Tindak Lanjut</span>
                        {ses.solution}
                      </p>
                    )}
                  </div>

                  {/* Footer: Counselor & Action buttons */}
                  <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                    <span className="text-[10px] font-semibold text-slate-400">
                      Guru BK: <strong className="text-slate-600">{ses.counselor_name || 'Guru BK'}</strong>
                    </span>

                    <div className="flex items-center gap-1.5">
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
                        className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-[var(--ui-radius-small)] text-xs font-bold transition-all border-none cursor-pointer flex items-center gap-1"
                        title="Edit Sesi"
                      >
                        <Edit2 size={12} />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => handleDeleteSession(ses.id)}
                        className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-[var(--ui-radius-small)] text-xs font-bold transition-all border-none cursor-pointer flex items-center gap-1"
                        title="Hapus Sesi"
                      >
                        <Trash2 size={12} />
                        <span>Hapus</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Pagination Container */}
          <div className="p-3.5 bg-white rounded-[var(--ui-radius-card)] shadow-xs border border-slate-100">
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
          <div className="bg-white rounded-[var(--ui-radius-card)] p-4 sm:p-5 shadow-xs border border-slate-100 flex flex-col gap-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="font-black text-slate-800 text-sm flex items-center gap-2">
                <Home size={17} className="text-sky-600" />
                <span>Jurnal Kunjungan Rumah (Home Visit)</span>
              </h3>
              <Button
                type="button"
                onClick={() => setShowVisitModal(true)}
                className="px-3 py-1.5 text-xs font-bold cursor-pointer bg-sky-600 hover:bg-sky-700 text-white rounded-[var(--ui-radius-small)]"
              >
                + Tambah Visit
              </Button>
            </div>

            <div className="flex flex-col gap-3 max-h-[500px] overflow-y-auto pr-1">
              {homeVisits.length === 0 ? (
                <div className="py-12 text-center text-slate-400 font-bold text-xs flex flex-col items-center gap-2">
                  <Home size={28} className="text-slate-300" />
                  <span>Belum ada jurnal kunjungan rumah yang dicatat.</span>
                </div>
              ) : (
                homeVisits.map(hv => (
                  <div key={hv.id} className="p-3.5 rounded-[var(--ui-radius-card)] border border-slate-200/80 bg-slate-50/70 hover:bg-slate-50 flex flex-col gap-2.5 transition-all shadow-2xs">
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
          <div className="bg-white rounded-[var(--ui-radius-card)] p-4 sm:p-5 shadow-xs border border-slate-100 flex flex-col gap-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="font-black text-slate-800 text-sm flex items-center gap-2">
                <FileText size={17} className="text-emerald-600" />
                <span>Surat Panggilan &amp; SP</span>
              </h3>
              <Button
                type="button"
                onClick={() => {
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
                className="px-3 py-1.5 text-xs font-bold cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white rounded-[var(--ui-radius-small)]"
              >
                + Terbitkan Surat
              </Button>
            </div>

            <div className="flex flex-col gap-3 max-h-[500px] overflow-y-auto pr-1">
              {bkLetters.length === 0 ? (
                <div className="py-12 text-center text-slate-400 font-bold text-xs flex flex-col items-center gap-2">
                  <FileText size={28} className="text-slate-300" />
                  <span>Belum ada surat panggilan atau SP yang diterbitkan.</span>
                </div>
              ) : (
                bkLetters.map(lettr => (
                  <div key={lettr.id} className="p-3.5 rounded-[var(--ui-radius-card)] border border-slate-200/80 bg-slate-50/70 hover:bg-slate-50 flex flex-col gap-2.5 transition-all shadow-2xs">
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
                      <div className="text-slate-600 font-medium">
                        <strong>Alasan:</strong> {lettr.reason || 'Pembinaan ketertiban dan kedisiplinan'}
                      </div>
                      {lettr.appointment_date && (
                        <div className="text-[11px] text-slate-500 font-semibold pt-1 border-t border-slate-100">
                          📅 Menghadap: {new Date(lettr.appointment_date).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })} • {lettr.appointment_time || '09.00 WIB'}
                        </div>
                      )}
                    </div>

                    {/* Action Bar: Download & Print PDF */}
                    <div className="flex items-center justify-between pt-1 border-t border-slate-200/50">
                      <span className="text-[10px] font-semibold text-emerald-700 flex items-center gap-1">
                        <CheckCircle2 size={12} />
                        <span>Status: Diterbitkan</span>
                      </span>

                      <button
                        type="button"
                        onClick={() => downloadLetterPDF(lettr)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-[var(--ui-radius-small)] text-xs font-black transition-all border-none cursor-pointer flex items-center gap-1.5 shadow-2xs active:scale-95"
                      >
                        <Printer size={13} strokeWidth={2.5} />
                        <span>Cetak / Unduh PDF</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 4: REKAP & BERKAS 360° ─────────────────────────────────────── */}
      {currentSubTab === 'dossier' && (
        <div className="flex flex-col gap-4 animate-in fade-in duration-200">
          {/* Header Action Bar */}
          <div className="bg-white p-3.5 sm:p-4 rounded-[var(--ui-radius-card)] shadow-xs border border-slate-100 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
            <div className="relative w-full sm:w-80">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari siswa untuk lihat berkas 360°..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200/80 rounded-[var(--ui-radius-small)] text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[var(--ui-primary)]"
              />
            </div>

            <div className="flex items-center gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={handleExportExcel}
                className="w-full sm:w-auto px-3.5 py-2 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Download size={15} />
                <span>Export Excel</span>
              </Button>
            </div>
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block bg-white rounded-[var(--ui-radius-card)] shadow-xs border border-slate-100 overflow-hidden">
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
          </div>

          {/* Mobile Card List View */}
          <div className="md:hidden flex flex-col gap-2.5">
            {studentPointsList.length === 0 ? (
              <div className="bg-white rounded-[var(--ui-radius-card)] p-8 text-center text-slate-400 font-bold text-xs shadow-xs border border-slate-100">
                Tidak ada data siswa ditemukan.
              </div>
            ) : (
              studentPointsList.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map(s => (
                <div
                  key={s.nis}
                  className="bg-white rounded-[var(--ui-radius-card)] p-3.5 shadow-xs border border-slate-200/80 flex flex-col gap-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-extrabold text-slate-800 text-xs leading-snug">{s.name}</h4>
                      <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                        NIS: {s.nis} • Kelas: {s.class_name || '-'}
                      </p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-[var(--ui-radius-pill)] text-[9.5px] font-black shrink-0 ${
                      s.risk_level === 'Tinggi' ? 'bg-rose-100 text-rose-800 border border-rose-200/70' :
                      s.risk_level === 'Sedang' ? 'bg-amber-100 text-amber-800 border border-amber-200/70' :
                      'bg-emerald-100 text-emerald-800 border border-emerald-200/70'
                    }`}>
                      {s.risk_level}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 bg-slate-50/80 p-2 rounded-[var(--ui-radius-small)] border border-slate-100 text-center text-xs">
                    <div>
                      <span className="block text-[9.5px] text-slate-400 font-bold">Total Poin Pelanggaran</span>
                      <span className="font-black text-rose-600 text-xs sm:text-sm">{s.total_poin} Poin</span>
                    </div>
                    <div>
                      <span className="block text-[9.5px] text-slate-400 font-bold">Total Sesi BK</span>
                      <span className="font-black text-slate-700 text-xs sm:text-sm">{s.sesi_count} Sesi</span>
                    </div>
                  </div>

                  <Button
                    type="button"
                    size="sm"
                    onClick={() => openDossier(s)}
                    className="w-full py-2 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <Eye size={13} />
                    <span>Buka Dossier 360°</span>
                  </Button>
                </div>
              ))
            )}
          </div>

          {/* Pagination Container */}
          <div className="p-3.5 bg-white rounded-[var(--ui-radius-card)] shadow-xs border border-slate-100">
            <TablePagination
              totalItems={studentPointsList.length}
              itemsPerPage={itemsPerPage}
              currentPage={currentPage}
              onPageChange={setCurrentPage}
            />
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
          title="Terbitkan Surat BK / SP Resmi"
        >
          <form onSubmit={handleSaveLetter} className="flex flex-col gap-3.5">
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
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-[var(--ui-radius-small)] text-xs font-mono font-bold focus:outline-none"
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
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-[var(--ui-radius-small)] text-xs font-bold focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 block">Hari / Tgl Menghadap</label>
                <input
                  type="date"
                  value={formLetter.appointment_date}
                  onChange={e => setFormLetter({ ...formLetter, appointment_date: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-[var(--ui-radius-small)] text-xs font-bold focus:outline-none"
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
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-[var(--ui-radius-small)] text-xs font-semibold focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 block">Tempat / Ruangan</label>
                <input
                  type="text"
                  placeholder="Ruang Bimbingan & Konseling (BK)"
                  value={formLetter.appointment_place}
                  onChange={e => setFormLetter({ ...formLetter, appointment_place: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-[var(--ui-radius-small)] text-xs font-semibold focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 block">Menghadap Kepada</label>
              <input
                type="text"
                placeholder="Guru BK / Koordinator BK"
                value={formLetter.appointed_person}
                onChange={e => setFormLetter({ ...formLetter, appointed_person: e.target.value })}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-[var(--ui-radius-small)] text-xs font-semibold focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 block">Alasan / Keperluan Pemanggilan</label>
              <textarea
                rows={2}
                placeholder="Tuliskan alasan/keterangan pemanggilan orang tua atau penerbitan SP..."
                value={formLetter.reason}
                onChange={e => setFormLetter({ ...formLetter, reason: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-[var(--ui-radius-small)] text-xs font-semibold focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <Button type="button" variant="outline" onClick={() => setShowLetterModal(false)}>
                Batal
              </Button>
              <Button type="submit" className="font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 shadow-xs">
                <Printer size={14} />
                <span>Terbitkan &amp; Unduh PDF</span>
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
