import { useState, useEffect, useMemo, useCallback } from 'react';
import useAuthStore from '../../store/monitoring/authStore.js';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { loadInitialState } from '../../utils/state.js';
import { FileSpreadsheet, Download, Search, Users, FileText, TrendingUp, AlertOctagon, Trophy, Printer, X } from 'lucide-react';
import { CustomSelect } from '../../components/CustomSelect.jsx';
import { PaginationControls } from '../../components/ui/PaginationControls.jsx';
import { Button, Modal } from '../../components/ui.jsx';

const JENIS_CATATAN = [
  { value: 'umum', label: 'Catatan Umum', color: 'bg-slate-50 text-slate-700 border-slate-200/60' },
  { value: 'akademik', label: 'Akademik', color: 'bg-blue-55 text-blue-700 border-blue-200/50' },
  { value: 'perilaku', label: 'Perilaku', color: 'bg-amber-55 text-amber-700 border-amber-200/50' },
  { value: 'prestasi', label: 'Prestasi', color: 'bg-emerald-55 text-emerald-700 border-emerald-200/50' },
  { value: 'kesehatan', label: 'Kesehatan', color: 'bg-rose-55 text-rose-700 border-rose-200/50' },
  { value: 'konseling', label: 'Konsultasi', color: 'bg-purple-55 text-purple-700 border-purple-200/50' },
];

const getJenisInfo = (val) => JENIS_CATATAN.find(j => j.value === val) || JENIS_CATATAN[0];

export default function RekapKedisiplinan({ classes = [], students = [] }) {
  const [riwayat, setRiwayat] = useState([]);
  const [absensi, setAbsensi] = useState([]);
  const [catatanList, setCatatanList] = useState([]);
  const [konselingList, setKonselingList] = useState([]);
  const [toast, setToast] = useState(null);
  const authToken = useAuthStore(state => state.user?.authToken);
  const [isLoading, setIsLoading] = useState(false);
  const [filterBulan, setFilterBulan] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [filterKelas, setFilterKelas] = useState("all");
  const [searchSiswa, setSearchSiswa] = useState('');
  const [selectedStudentForRapor, setSelectedStudentForRapor] = useState(null);
  const [raporPaperSize, setRaporPaperSize] = useState('A4'); //'A4' |'F4'
  const [activeSection, setActiveSection] = useState('siswa');
  const [siswaPage, setSiswaPage] = useState(1);
  const [siswaPerPage, setSiswaPerPage] = useState(20);
  const [lbPage, setLbPage] = useState(1);
  const [lbPerPage, setLbPerPage] = useState(20);

  const appSettings = useMemo(() => {
    const defaults = { 
      useKopSuratGambar: false,
      kopSuratGambar:"",
      kopSuratLogo:"", 
      kopSuratBaris1:"", 
      kopSuratBaris2:"", 
      kopSuratBaris3:"", 
      primaryColor:"var(--ui-primary)" 
    };
    return { ...defaults, ...loadInitialState("appSettings", defaults) };
  }, []);

  const showToast = (message, type ='success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchData = useCallback(async () => {
    if (!authToken) return;
    setIsLoading(true);
    try {
      const [resRiwayat, resAbsensi, resCatatan, resKonseling] = await Promise.all([
        fetch("/api/kedisiplinan/riwayat", { headers: { "Authorization": `Bearer ${authToken}` } }),
        fetch("/api/kedisiplinan/absensi", { headers: { "Authorization": `Bearer ${authToken}` } }),
        fetch("/api/kesiswaan/catatan-walikelas", { headers: { "Authorization": `Bearer ${authToken}` } }),
        fetch("/api/kedisiplinan/konseling", { headers: { "Authorization": `Bearer ${authToken}` } })
      ]);
      const dataRiwayat = await resRiwayat.json();
      const dataAbsensi = await resAbsensi.json();
      const dataCatatan = await resCatatan.json();
      const dataKonseling = await resKonseling.json();
      if (dataRiwayat.ok) setRiwayat(dataRiwayat.data || []);
      if (dataAbsensi.ok) setAbsensi(dataAbsensi.data || []);
      if (dataCatatan.ok) setCatatanList(dataCatatan.data || []);
      if (dataKonseling.ok) setKonselingList(dataKonseling.data || []);
    } catch (e) {
      console.error(e);
      showToast('Gagal memuat data rekap', 'error');
    }
    setIsLoading(false);
  }, [authToken]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredRiwayat = useMemo(() => {
    return riwayat.filter(r => {
      const student = students.find(s => s.nis === r.siswa_nis);
      const mBulan = filterBulan ==="" || r.tanggal_kejadian.startsWith(filterBulan);
      const mKelas = filterKelas ==="all" || (student && student.class_name === filterKelas);
      return mBulan && mKelas;
    });
  }, [riwayat, filterBulan, filterKelas, students]);

  const filteredAbsensi = useMemo(() => {
    return absensi.filter(a => {
      const student = students.find(s => s.nis === a.siswa_nis);
      const mBulan = filterBulan ==="" || a.tanggal.startsWith(filterBulan);
      const mKelas = filterKelas ==="all" || (student && student.class_name === filterKelas);
      return mBulan && mKelas;
    });
  }, [absensi, filterBulan, filterKelas, students]);

  // Aggregate student score
  const studentScores = useMemo(() => {
    const map = {};
    riwayat.forEach(r => {
      if (!map[r.siswa_nis]) {
        map[r.siswa_nis] = 0;
      }
      const isPrestasi = r.jenis?.toLowerCase() ==='prestasi';
      map[r.siswa_nis] += r.poin * (isPrestasi ? -1 : 1);
    });
    return map;
  }, [riwayat]);

  // Aggregate student attendance
  const studentAttendance = useMemo(() => {
    const map = {};
    absensi.forEach(a => {
      if (!map[a.siswa_nis]) {
        map[a.siswa_nis] = { hadir: 0, sakit: 0, izin: 0, alpa: 0 };
      }
      if (a.status ==='Sakit') map[a.siswa_nis].sakit += 1;
      else if (a.status ==='Izin') map[a.siswa_nis].izin += 1;
      else if (a.status ==='Alpa' || a.status ==='Belum Scan') map[a.siswa_nis].alpa += 1;
      else map[a.siswa_nis].hadir += 1;
    });
    return map;
  }, [absensi]);

  // Filtered Students List
  const filteredStudentsList = useMemo(() => {
    const list = students.filter(s => {
      const mKelas = filterKelas ==="all" || s.class_name === filterKelas;
      const nameVal = s.name || s.nama || s.namaSiswa ||"";
      const mSearch = !searchSiswa.trim() || 
        nameVal.toLowerCase().includes(searchSiswa.toLowerCase()) || 
        String(s.nis).includes(searchSiswa);
      return mKelas && mSearch;
    });
    
    // Sort alphabetically by name
    return list.sort((a, b) => {
      const nameA = a.name || a.nama || a.namaSiswa ||"";
      const nameB = b.name || b.nama || b.namaSiswa ||"";
      return nameA.localeCompare(nameB);
    });
  }, [students, filterKelas, searchSiswa]);

  // Leaderboard of top violations
  const leaderboard = useMemo(() => {
    const map = {};
    filteredRiwayat.forEach(r => {
      if (!map[r.siswa_nis]) {
        const student = students.find(s => s.nis === r.siswa_nis);
        map[r.siswa_nis] = {
          nis: r.siswa_nis,
          name: student ? (student.name || student.nama || student.namaSiswa) : r.siswa_nis,
          class_name: student ? student.class_name :'Unknown',
          total_poin: 0,
          kasus_count: 0
        };
      }
      const isPrestasi = r.jenis?.toLowerCase() ==='prestasi';
      map[r.siswa_nis].total_poin += r.poin * (isPrestasi ? -1 : 1);
      map[r.siswa_nis].kasus_count += 1;
    });
    Object.keys(map).forEach(nis => {
      map[nis].total_poin = Math.max(0, map[nis].total_poin);
    });
    const all = Object.values(map).sort((a, b) => b.total_poin - a.total_poin);
    if (!searchSiswa.trim()) return all.slice(0, 15);
    return all.filter(lb =>
      lb.name.toLowerCase().includes(searchSiswa.toLowerCase()) ||
      lb.nis.includes(searchSiswa)
    );
  }, [filteredRiwayat, students, searchSiswa]);

  const classStats = useMemo(() => {
    const map = {};
    classes.forEach(c => {
      map[c.name] = { class_name: c.name, poin: 0, alpa: 0, sakit: 0, izin: 0, total_students: 0, avg_score: 100 };
    });

    // Count students per class
    students.forEach(s => {
      if (s.class_name && map[s.class_name]) {
        map[s.class_name].total_students += 1;
      }
    });

    filteredRiwayat.forEach(r => {
      const student = students.find(s => s.nis === r.siswa_nis);
      if (student && map[student.class_name]) {
        const isPrestasi = r.jenis?.toLowerCase() ==='prestasi';
        map[student.class_name].poin += r.poin * (isPrestasi ? -1 : 1);
      }
    });

    Object.keys(map).forEach(clsName => {
      map[clsName].poin = Math.max(0, map[clsName].poin);
    });

    filteredAbsensi.forEach(a => {
      const student = students.find(s => s.nis === a.siswa_nis);
      if (student && map[student.class_name]) {
        if (a.status ==='Alpa') map[student.class_name].alpa += 1;
        if (a.status ==='Sakit') map[student.class_name].sakit += 1;
        if (a.status ==='Izin') map[student.class_name].izin += 1;
      }
    });

    // Calculate average score per class
    Object.keys(map).forEach(clsName => {
      const cls = map[clsName];
      if (cls.total_students > 0) {
        let totalScoreSum = 0;
        const clsStudents = students.filter(s => s.class_name === clsName);
        clsStudents.forEach(stud => {
          const deductions = studentScores[stud.nis] || 0;
          totalScoreSum += Math.max(0, 100 - deductions);
        });
        cls.avg_score = Math.round(totalScoreSum / cls.total_students);
      }
    });

    return Object.values(map).sort((a, b) => b.poin - a.poin);
  }, [filteredRiwayat, filteredAbsensi, classes, students, studentScores]);

  const exportExcel = () => {
    const wb = XLSX.utils.book_new();
    
    // Prepare Students Recap sheet
    const studentsRecapData = filteredStudentsList.map((s, idx) => {
      const name = s.name || s.nama || s.namaSiswa ||"";
      const att = studentAttendance[s.nis] || { hadir: 0, sakit: 0, izin: 0, alpa: 0 };
      const score = Math.max(0, 100 - (studentScores[s.nis] || 0));
      return {"No": idx + 1,"NIS": s.nis,"Nama Siswa": name,"Kelas": s.class_name ||"-","Hadir": att.hadir,"Sakit": att.sakit,"Izin": att.izin,"Alpa": att.alpa,"Skor Kredit": score
      };
    });
    
    const wsStudents = XLSX.utils.json_to_sheet(studentsRecapData);
    XLSX.utils.book_append_sheet(wb, wsStudents,"Rekap_Siswa");
    
    const wsClassStats = XLSX.utils.json_to_sheet(classStats.map(cs => ({"Kelas": cs.class_name,"Total Poin Pelanggaran": cs.poin,"Rata-rata Skor Kredit": cs.avg_score,"Total Alpa": cs.alpa,"Total Sakit": cs.sakit,"Total Izin": cs.izin
    })));
    XLSX.utils.book_append_sheet(wb, wsClassStats,"Rekap_Kelas");
    
    XLSX.writeFile(wb, `Rekap_Kehadiran_Skor_Kredit_Siswa_${filterBulan ||'Semua'}.xlsx`);
    showToast('Rekap Excel berhasil diunduh!');
  };

  const printRaporPDF = (student, size = 'A4', action = 'download') => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: size === 'A4' ? 'a4' : [215, 330]
    });

    const pageWidth = size === 'A4' ? 210 : 215;
    const name = student.name || student.nama || student.namaSiswa || "";
    const nis = student.nis || student.code || "";
    const kelas = student.class_name || student.kelas || "";

    let yPos = 20;

    // Header Kop Surat
    if (appSettings.useKopSuratGambar && appSettings.kopSuratGambar) {
      doc.addImage(appSettings.kopSuratGambar, 'PNG', 15, 10, pageWidth - 30, 30);
      yPos = 46;
    } else if (appSettings.kopSuratLogo) {
      doc.addImage(appSettings.kopSuratLogo, 'PNG', 15, 10, 25, 25);
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(10);
      doc.text(appSettings.kopSuratBaris1 || "", pageWidth / 2, 16, { align: "center" });
      doc.setFontSize(14);
      doc.text(appSettings.kopSuratBaris2 || "", pageWidth / 2, 22, { align: "center" });
      doc.setFontSize(18);
      doc.text(appSettings.kopSuratBaris3 || "", pageWidth / 2, 29, { align: "center" });
      doc.setLineWidth(1);
      doc.line(15, 38, pageWidth - 15, 38);
      doc.setLineWidth(0.1);
      yPos = 46;
    } else {
      yPos = 30;
    }

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(14);
    doc.text("RAPOR KINERJA & KEDISIPLINAN SISWA", pageWidth / 2, yPos, { align: "center" });

    doc.setFontSize(10);
    doc.setFont("Helvetica", "normal");
    const yr = new Date().getFullYear();
    doc.text(`Tahun Ajaran: ${yr} / ${parseInt(yr) + 1}`, pageWidth / 2, yPos + 5, { align: "center" });
    if (!appSettings.kopSuratLogo && !appSettings.useKopSuratGambar) {
      doc.line(15, yPos + 8, pageWidth - 15, yPos + 8);
    }
    
    yPos += 16;

    // Student Info Block
    doc.setFont("Helvetica", "bold");
    doc.text("IDENTITAS SISWA", 15, yPos);
    doc.setFont("Helvetica", "normal");

    doc.text(`Nama Siswa`, 15, yPos + 6);
    doc.text(`: ${name}`, 45, yPos + 6);
    doc.text(`NIS`, 15, yPos + 11);
    doc.text(`: ${nis}`, 45, yPos + 11);
    doc.text(`Kelas`, 15, yPos + 16);
    doc.text(`: ${kelas}`, 45, yPos + 16);

    const studentPoinRecords = riwayat.filter(p => String(p.siswa_nis) === String(nis));
    const totalPoin = studentPoinRecords.reduce((sum, p) => sum + (parseInt(p.poin) || 0), 0);
    const finalScore = Math.max(0, 100 - totalPoin);
    
    doc.text(`Skor Awal: 100`, 110, yPos + 6);
    doc.text(`Total Poin Pelanggaran: ${totalPoin}`, 110, yPos + 11);
    
    doc.setFont("Helvetica", "bold");
    doc.text(`Total Skor Akhir: ${finalScore}`, 110, yPos + 16);
    doc.setFont("Helvetica", "normal");
    
    yPos += 26;

    // 1. Kehadiran Section
    doc.setFont("Helvetica", "bold");
    doc.text("I. REKAPITULASI KEHADIRAN", 15, yPos);
    doc.setFont("Helvetica", "normal");

    const sAbs = absensi.filter(a => String(a.siswa_nis) === String(nis) && a.status === 'Sakit' && (a.approval_status === 'approved' || a.approval_status === 'otomatis')).length;
    const iAbs = absensi.filter(a => String(a.siswa_nis) === String(nis) && a.status === 'Izin' && (a.approval_status === 'approved' || a.approval_status === 'otomatis')).length;
    const aAbs = absensi.filter(a => String(a.siswa_nis) === String(nis) && (a.status === 'Alpa' || a.status === 'Belum Scan') && (a.approval_status === 'approved' || a.approval_status === 'otomatis')).length;
    const totalHadir = absensi.filter(a => String(a.siswa_nis) === String(nis) && a.status === 'Hadir').length;

    doc.rect(15, yPos + 4, pageWidth - 30, 16);
    doc.line(15, yPos + 12, pageWidth - 15, yPos + 12);

    const colWidth = (pageWidth - 30) / 4;
    doc.line(15 + colWidth, yPos + 4, 15 + colWidth, yPos + 20);
    doc.line(15 + colWidth * 2, yPos + 4, 15 + colWidth * 2, yPos + 20);
    doc.line(15 + colWidth * 3, yPos + 4, 15 + colWidth * 3, yPos + 20);

    doc.setFont("Helvetica", "bold");
    doc.text("Hadir", 15 + colWidth / 2, yPos + 9, { align: "center" });
    doc.text("Sakit", 15 + colWidth * 1.5, yPos + 9, { align: "center" });
    doc.text("Izin", 15 + colWidth * 2.5, yPos + 9, { align: "center" });
    doc.text("Alpa", 15 + colWidth * 3.5, yPos + 9, { align: "center" });

    doc.setFont("Helvetica", "normal");
    doc.text(`${totalHadir} hari`, 15 + colWidth / 2, yPos + 17, { align: "center" });
    doc.text(`${sAbs} hari`, 15 + colWidth * 1.5, yPos + 17, { align: "center" });
    doc.text(`${iAbs} hari`, 15 + colWidth * 2.5, yPos + 17, { align: "center" });
    doc.text(`${aAbs} hari`, 15 + colWidth * 3.5, yPos + 17, { align: "center" });
    
    yPos += 26;

    // 2. SKOR KREDIT
    doc.setFont("Helvetica", "bold");
    doc.text("II. SKOR KREDIT & DETAIL KASUS KEDISIPLINAN", 15, yPos);
    
    const pointBody = studentPoinRecords.length > 0
      ? studentPoinRecords.map((p, idx) => [
          idx + 1,
          p.tanggal_kejadian ? new Date(p.tanggal_kejadian).toLocaleDateString('id-ID') : "-",
          p.tindakan_nama,
          `+${p.poin}`,
          p.pelapor_nama || "Sistem"
        ])
      : [["-", "-", "Tidak ada riwayat pelanggaran", "0", "-"]];

    autoTable(doc, {
      startY: yPos + 4,
      head: [["No", "Tanggal Kejadian", "Pelanggaran", "Poin", "Pelapor / Petugas"]],
      body: pointBody,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255] },
      columnStyles: {
        0: { cellWidth: 8, halign: 'center' },
        1: { cellWidth: 30, halign: 'center' },
        2: { cellWidth: 90 },
        3: { cellWidth: 15, halign: 'center', fontStyle: 'bold' },
        4: { cellWidth: 39 }
      }
    });

    // 3. CATATAN PEMBINAAN & HASIL KONSELING
    doc.setFont("Helvetica", "bold");
    doc.text("III. CATATAN PEMBINAAN WALI KELAS & KONSULTASI BK", 15, doc.lastAutoTable.finalY + 10);

    const studentNotes = catatanList.filter(c => String(c.siswa_nis) === String(nis));
    const studentCounseling = konselingList.filter(k => String(k.siswa_nis) === String(nis));

    const combinedNotes = [
      ...studentNotes.map(n => ({
        tanggal: n.tanggal,
        tipe: 'Wali Kelas',
        oleh: n.teacher_name || 'Wali Kelas',
        kategori: getJenisInfo(n.jenis_catatan).label,
        isi: n.isi_catatan,
        tindakLanjut: n.tindak_lanjut || '-'
      })),
      ...studentCounseling.map(c => ({
        tanggal: c.tanggal_konseling ? c.tanggal_konseling.split('T')[0] : new Date().toISOString().split('T')[0],
        tipe: 'BP/BK',
        oleh: c.guru_bk_nama || 'Konselor BK',
        kategori: c.jenis_kasus || 'Konseling',
        isi: c.catatan_konseling,
        tindakLanjut: c.tindak_lanjut || '-'
      }))
    ].sort((a, b) => new Date(a.tanggal) - new Date(b.tanggal));

    const notesBody = combinedNotes.length > 0
      ? combinedNotes.map((c, idx) => [
          idx + 1,
          c.tanggal ? new Date(c.tanggal).toLocaleDateString('id-ID') : '-',
          `${c.tipe}\n(${c.oleh})`,
          c.kategori,
          c.isi,
          c.tindakLanjut
        ])
      : [["-", "-", "-", "-", "Tidak ada catatan pembinaan atau sesi konseling.", "-"]];

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 12,
      head: [["No", "Tanggal", "Tipe / Oleh", "Kategori / Kasus", "Catatan Pembinaan", "Tindak Lanjut"]],
      body: notesBody,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255] },
      columnStyles: {
        0: { cellWidth: 8, halign: 'center' },
        1: { cellWidth: 22, halign: 'center' },
        2: { cellWidth: 32 },
        3: { cellWidth: 28 },
        4: { cellWidth: 55 },
        5: { cellWidth: 35 }
      }
    });

    const finalY = doc.lastAutoTable.finalY + 5;
    let sigY = finalY + 20;

    if (sigY > 260) {
      doc.addPage();
      sigY = 30;
    }

    doc.setFont("Helvetica", "normal");
    doc.setFontSize(9);
    doc.text("Mengetahui,", 15, sigY);
    doc.text("Orang Tua / Wali Siswa", 15, sigY + 4);
    doc.line(15, sigY + 22, 60, sigY + 22);

    doc.text("Mengetahui, Guru BK,", 85, sigY);
    doc.line(85, sigY + 22, 130, sigY + 22);

    doc.text("Wali Kelas,", 150, sigY);
    doc.line(150, sigY + 22, 190, sigY + 22);

    if (action === 'download') {
      doc.save(`Rapor_Kedisiplinan_${name.replace(/\s+/g, '_')}_${nis}.pdf`);
      showToast('PDF berhasil diunduh!');
    } else {
      doc.autoPrint();
      window.open(doc.output('bloburl'), '_blank');
      showToast('Jendela cetak dibuka!');
    }
    setSelectedStudentForRapor(null);
  };

  return (
    <div className="space-y-4 relative animate-in fade-in duration-300">
      {/* Navigation Tabs & Export Button */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center border-b border-slate-200 gap-4">
        <div className="flex overflow-x-auto hide-scrollbar gap-1">
          <button
            type="button"
            onClick={() => setActiveSection('siswa')}
            className={`px-4 py-3 text-xs font-bold border-b-2 transition-colors border-none bg-transparent cursor-pointer shrink-0 ${
              activeSection === 'siswa' 
                ? 'border-b-2 border-solid border-[var(--ui-primary)] text-[var(--ui-primary)] font-extrabold' 
                : 'border-b-2 border-solid border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Data Per Siswa
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('kelas')}
            className={`px-4 py-3 text-xs font-bold border-b-2 transition-colors border-none bg-transparent cursor-pointer shrink-0 ${
              activeSection === 'kelas' 
                ? 'border-b-2 border-solid border-[var(--ui-primary)] text-[var(--ui-primary)] font-extrabold' 
                : 'border-b-2 border-solid border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Data Per Kelas
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('leaderboard')}
            className={`px-4 py-3 text-xs font-bold border-b-2 transition-colors border-none bg-transparent cursor-pointer shrink-0 ${
              activeSection === 'leaderboard' 
                ? 'border-b-2 border-solid border-[var(--ui-primary)] text-[var(--ui-primary)] font-extrabold' 
                : 'border-b-2 border-solid border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Peringkat Pelanggaran (Leaderboard)
          </button>
        </div>
        <div className="flex items-center justify-end pb-2 sm:pb-0 shrink-0">
          <Button onClick={exportExcel} size="sm" className="bg-[var(--ui-primary)] text-white hover:brightness-105 transition-all">
            <Download size={14} className="mr-1.5" /> Ekspor Excel
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="ui-card p-4 flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
          <input
            value={searchSiswa}
            onChange={e => setSearchSiswa(e.target.value)}
            placeholder="Cari nama / NIS siswa..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border-none rounded-[var(--ui-radius-small)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ui-primary)]/30"
          />
        </div>
        <div>
          <input
            type="month"
            value={filterBulan}
            onChange={e => setFilterBulan(e.target.value)}
            className="px-3 py-2 bg-slate-50 border-none rounded-[var(--ui-radius-small)] text-sm font-semibold focus:outline-none"
          />
        </div>
        <div className="w-56">
          <CustomSelect
            options={[{ value:'all', label:'Semua Kelas' }, ...classes.map(c => ({ value: c.name, label: c.name }))]}
            value={filterKelas}
            onChange={setFilterKelas}
            placeholder="Filter Kelas"
          />
        </div>
        {isLoading && <span className="text-sm text-slate-400 font-medium animate-pulse">Memuat...</span>}
      </div>

      {/* ── TAB 1: DATA PER SISWA ── */}
      {activeSection ==='siswa' && (
        <div className="ui-card flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center gap-2 bg-slate-50/50">
            <Users size={18} className="text-[var(--ui-primary)]" />
            <h2 className="font-bold text-slate-800 flex-1">Data Kinerja & Skor Kredit Per Siswa</h2>
            <span className="text-xs text-slate-500">{filteredStudentsList.length} siswa</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-[11px] text-slate-500 uppercase bg-white border-b border-slate-150">
                <tr>
                  <th className="px-4 py-3 font-bold text-center w-12">No</th>
                  <th className="px-4 py-3 font-bold">Siswa</th>
                  <th className="px-4 py-3 font-bold text-center">Hadir</th>
                  <th className="px-4 py-3 font-bold text-center">Izin</th>
                  <th className="px-4 py-3 font-bold text-center">Sakit</th>
                  <th className="px-4 py-3 font-bold text-center">Alpa</th>
                  <th className="px-4 py-3 font-bold text-center">Skor Kredit</th>
                  <th className="px-4 py-3 font-bold text-center w-28">Rapor</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudentsList.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="text-center py-8 text-slate-400">
                      Siswa tidak ditemukan atau belum ada data.
                    </td>
                  </tr>
                ) : (
                  filteredStudentsList
                    .slice((siswaPage - 1) * siswaPerPage, siswaPage * siswaPerPage)
                    .map((s, idx) => {
                    const name = s.name || s.nama || s.namaSiswa ||"";
                    const att = studentAttendance[s.nis] || { hadir: 0, sakit: 0, izin: 0, alpa: 0 };
                    const score = Math.max(0, 100 - (studentScores[s.nis] || 0));
                    const globalIdx = (siswaPage - 1) * siswaPerPage + idx;
                    return (
                      <tr key={s.nis} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3 text-center text-slate-400 font-bold">{globalIdx + 1}</td>
                        <td className="px-4 py-3">
                          <p className="font-bold text-slate-800">{name}</p>
                          <p className="text-[10px] text-slate-450 font-bold">{s.nis} • {s.class_name ||"-"}</p>
                        </td>
                        <td className="px-4 py-3 text-center font-bold text-emerald-600">{att.hadir}</td>
                        <td className="px-4 py-3 text-center font-bold text-blue-600">{att.izin}</td>
                        <td className="px-4 py-3 text-center font-bold text-amber-600">{att.sakit}</td>
                        <td className="px-4 py-3 text-center font-bold text-red-500">{att.alpa}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2.5 py-1 rounded-[var(--ui-radius-small)] font-black text-xs ${
                            score >= 85 ?'bg-emerald-50 text-emerald-700' : score >= 70 ?'bg-amber-50 text-amber-700' :'bg-red-50/60 text-red-600'
                          }`}>
                            {score} Poin
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex gap-2 justify-center">
                            <Button variant="outline" size="sm" onClick={() => setSelectedStudentForRapor(s)} >
                              <FileText size={14} className="mr-1.5"/> Rapor PDF
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <PaginationControls
            currentPage={siswaPage}
            totalItems={filteredStudentsList.length}
            itemsPerPage={siswaPerPage}
            onPageChange={setSiswaPage}
            onItemsPerPageChange={(v) => { setSiswaPerPage(v); setSiswaPage(1); }}
          />
        </div>
      )}

      {/* ── TAB 2: DATA PER KELAS ── */}
      {activeSection ==='kelas' && (
        <div className="ui-card flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center gap-2 bg-slate-50/50">
            <TrendingUp size={18} className="text-[var(--ui-primary)]" />
            <h2 className="font-bold text-slate-800">Statistik Pelanggaran &amp; Absensi Per Kelas</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-[10px] text-slate-500 uppercase bg-white border-b border-slate-150">
                <tr>
                  <th className="px-4 py-3 font-bold">Kelas</th>
                  <th className="px-4 py-3 font-bold text-center text-red-600">Total Poin Pelanggaran</th>
                  <th className="px-4 py-3 font-bold text-center text-[var(--ui-primary)]">Rata-rata Skor Kredit</th>
                  <th className="px-4 py-3 font-bold text-center text-amber-600">Total Alpa</th>
                  <th className="px-4 py-3 font-bold text-center text-blue-600">Total Sakit</th>
                  <th className="px-4 py-3 font-bold text-center text-green-600">Total Izin</th>
                </tr>
              </thead>
              <tbody>
                {classStats.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-8 text-slate-400">
                      Tidak ada data kelas.
                    </td>
                  </tr>
                ) : (
                  classStats.map(cs => (
                    <tr key={cs.class_name} className="border-b border-slate-50 hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-bold text-slate-800">{cs.class_name}</td>
                      <td className="px-4 py-3 text-center font-bold text-red-600 bg-red-50/20">{cs.poin}</td>
                      <td className="px-4 py-3 text-center font-black text-[var(--ui-primary)] bg-blue-50/20">{cs.avg_score} / 100</td>
                      <td className="px-4 py-3 text-center font-bold text-slate-600">{cs.alpa}</td>
                      <td className="px-4 py-3 text-center font-bold text-slate-600">{cs.sakit}</td>
                      <td className="px-4 py-3 text-center font-bold text-slate-600">{cs.izin}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 3: LEADERBOARD ── */}
      {activeSection ==='leaderboard' && (
        <div className="ui-card flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center gap-2 bg-slate-50/50">
            <AlertOctagon size={18} className="text-red-500" />
            <h2 className="font-bold text-slate-800 flex-1">Top Siswa Pelanggaran Tertinggi</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-[11px] text-slate-500 uppercase bg-white border-b border-slate-150">
                <tr>
                  <th className="px-4 py-3 font-bold text-center w-12">No</th>
                  <th className="px-4 py-3 font-bold">Siswa</th>
                  <th className="px-4 py-3 font-bold text-center">Total Poin</th>
                  <th className="px-4 py-3 font-bold text-center">Kasus</th>
                  <th className="px-4 py-3 font-bold text-center w-28">Rapor</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="text-center py-8 text-slate-400">
                      Tidak ada data pelanggaran untuk filter ini.
                    </td>
                  </tr>
                ) : (
                  leaderboard
                    .slice((lbPage - 1) * lbPerPage, lbPage * lbPerPage)
                    .map((lb, idx) => {
                    const globalIdx = (lbPage - 1) * lbPerPage + idx;
                    return (
                    <tr key={lb.nis} className="border-b border-slate-50 hover:bg-slate-50/50">
                      <td className="px-4 py-3 text-center">
                        {!searchSiswa && globalIdx === 0 ? <Trophy size={16} className="text-amber-500 mx-auto" /> : <span className="text-slate-400 font-bold">{globalIdx + 1}</span>}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-bold text-slate-800">{lb.name}</p>
                        <p className="text-[10px] text-slate-500 font-semibold">{lb.class_name}</p>
                      </td>
                      <td className="px-4 py-3 text-center font-bold text-red-600">{lb.total_poin}</td>
                      <td className="px-4 py-3 text-center font-bold text-slate-600">{lb.kasus_count}</td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex justify-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedStudentForRapor(lb)}
                          >
                            <Printer size={12} className="mr-1.5" /> Cetak
                          </Button>
                        </div>
                      </td>
                    </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <PaginationControls
            currentPage={lbPage}
            totalItems={leaderboard.length}
            itemsPerPage={lbPerPage}
            onPageChange={setLbPage}
            onItemsPerPageChange={(v) => { setLbPerPage(v); setLbPage(1); }}
          />
        </div>
      )}

      {/* Modal Cetak Rapor */}
      {selectedStudentForRapor && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedStudentForRapor(null)}
          title="Cetak Rapor Kinerja Siswa"
          icon={<FileText size={20} className="text-rose-500" />}
          width="md"
        >
            <div className="space-y-4">
              <div className="p-3 bg-slate-50 rounded-lg text-xs space-y-1">
                <p className="text-slate-500 font-semibold">Nama Siswa:</p>
                <p className="font-bold text-slate-800 text-sm">{selectedStudentForRapor.name || selectedStudentForRapor.nama || selectedStudentForRapor.namaSiswa}</p>
                <p className="text-slate-600">Kelas: {selectedStudentForRapor.class_name || selectedStudentForRapor.kelas ||"-"}</p>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Pilih Ukuran Kertas</label>
                <div className="grid grid-cols-2 gap-3">
                  <Button variant="outline" type="button" onClick={() =>setRaporPaperSize('A4')}
                    className={`text-center py-2 rounded-lg border-2 font-bold transition-all ${raporPaperSize === 'A4' ? 'border-[var(--ui-primary)] text-[var(--ui-primary)] bg-[var(--ui-primary)]/5' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}>
                    A4 (Standar)</Button>
                  <Button variant="outline" type="button" onClick={() =>setRaporPaperSize('F4')}
                    className={`text-center py-2 rounded-lg border-2 font-bold transition-all ${raporPaperSize === 'F4' ? 'border-[var(--ui-primary)] text-[var(--ui-primary)] bg-[var(--ui-primary)]/5' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}>
                    F4 (Folio/HVS)</Button>
                </div>
              </div>
              <div className="pt-2 flex flex-col justify-end gap-2">
                <div className="flex gap-2 w-full">
                  <Button 
                    variant="outline"
                    onClick={() => printRaporPDF(selectedStudentForRapor, raporPaperSize,'download')}
                    className="flex-1"
                  >
                    <Download size={14} className="mr-1.5"/> Unduh PDF
                  </Button>
                  <Button 
                    onClick={() => printRaporPDF(selectedStudentForRapor, raporPaperSize,'print')}
                    className="flex-1"
                  >
                    <Printer size={14} className="mr-1.5"/> Cetak
                  </Button>
                </div>
                <Button variant="ghost" onClick={() => setSelectedStudentForRapor(null)} className="w-full mt-1">
                  Batal
                </Button>
              </div>
            </div>
        </Modal>
      )}

      {toast && (
        <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-[var(--ui-radius-small)] shadow-lg font-medium text-sm flex items-center gap-2 animate-in slide-in-from-bottom-5 text-white ${toast.type ==='error' ?'bg-red-600' :'bg-emerald-600'} z-[9999]`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
