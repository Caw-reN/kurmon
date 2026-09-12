import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  BookOpen, Calendar, Users, Filter, Search, Download, Printer, 
  Clock, CheckCircle2, AlertCircle, ChevronDown, ChevronRight, 
  Eye, RefreshCw, X, ShieldAlert, Award, FileText, ArrowUpDown, 
  Sparkles, Layers, UserCheck, UserX, HeartPulse, HelpCircle,
  GraduationCap, Check, ArrowRight, BookMarked, SlidersHorizontal,
  RotateCcw
} from 'lucide-react';
import useAuthStore from '../../store/monitoring/authStore.js';
import { useDataStore } from '../../store/useDataStore.js';
import { useAppStore } from '../../store/useAppStore.js';
import { CustomSelect } from '../../components/CustomSelect.jsx';
import { UISelect, Modal, Button } from '../../components/ui.jsx';
import { PaginationControls } from '../../components/ui/PaginationControls.jsx';
import { getJurnalSubmissionStatus } from './JurnalHarianGuru.jsx';
import { drawKopSurat, getPrimaryColorRgb } from '../../utils/pdfHelpers.js';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const HARI_ID = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

export default function RekapJurnalKelas({ classes = [], teachers = [], schedule = [], onBack }) {
  const user = useAuthStore(state => state.user);
  const authToken = user?.authToken;
  const role = user?.role || '';
  const isKurikulum = ['admin', 'superadmin'].includes(role) || (role === 'waka' && (user?.division || '').toLowerCase() === 'kurikulum');
  
  // Deteksi wali kelas
  const isWalas = Boolean(user?.isWalas || user?.walasClass || user?.subrole === 'walikelas');
  const userWalasClass = useMemo(() => {
    if (user?.walasClass) return user.walasClass;
    const matched = classes.find(c => 
      (c.homeroom && (c.homeroom === user?.name || c.homeroom === user?.nama)) ||
      (c.walasName && (c.walasName === user?.name || c.walasName === user?.nama))
    );
    return matched ? (matched.name || matched.id) : '';
  }, [user, classes]);

  // Settings & Master Data
  const appSettings = useDataStore(state => state.appSettings) || {};
  const schoolProfile = useDataStore(state => state.schoolProfile) || {};
  const students = useDataStore(state => state.students) || [];

  // Ringkasan keaktifan seluruh kelas dari backend
  const [classesSummary, setClassesSummary] = useState([]);

  // Fetch ringkasan keaktifan kelas
  const fetchClassesSummary = useCallback(async () => {
    if (!authToken) return;
    try {
      const res = await fetch('/api/jurnal/classes-summary', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      const data = await res.json();
      if (data.ok && Array.isArray(data.data)) {
        setClassesSummary(data.data);
      }
    } catch (e) {
      console.warn('Gagal memuat ringkasan kelas:', e);
    }
  }, [authToken]);

  useEffect(() => {
    fetchClassesSummary();
  }, [fetchClassesSummary]);

  // Map ringkasan jurnal per kelas
  const classJournalCountMap = useMemo(() => {
    const map = {};
    classesSummary.forEach(c => {
      if (c.kelas) {
        map[c.kelas.toLowerCase().trim()] = parseInt(c.total_jurnal || 0, 10);
      }
    });
    return map;
  }, [classesSummary]);

  // State Pilihan Kelas
  const [selectedKelas, setSelectedKelas] = useState(() => {
    return userWalasClass || (classes[0]?.name || classes[0]?.id || 'XI TKJ 2');
  });

  // Periode filter: 'semester' | 'semua' | 'bulan' | 'minggu' | 'custom'
  const [periodeMode, setPeriodeMode] = useState('semester');
  const [semesterChoice, setSemesterChoice] = useState(() => {
    const curMonth = new Date().getMonth() + 1;
    return curMonth >= 7 ? 'ganjil' : 'genap';
  });
  const [tahunAjaran, setTahunAjaran] = useState(() => {
    const d = new Date();
    const curYear = d.getFullYear();
    const curMonth = d.getMonth() + 1;
    return curMonth >= 7 ? curYear : curYear - 1;
  });

  // Custom date range
  const [customStartDate, setCustomStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [customEndDate, setCustomEndDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Filter Tambahan
  const [selectedMapel, setSelectedMapel] = useState('all');
  const [selectedTeacher, setSelectedTeacher] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState('asc'); // asc = awal -> akhir

  // Data State
  const [jurnalList, setJurnalList] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [detailModalItem, setDetailModalItem] = useState(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  // Info Kelas Terpilih
  const currentClassInfo = useMemo(() => {
    const target = classes.find(c => (c.name || c.id) === selectedKelas);
    let walasName = target?.homeroom || target?.walasName || '';
    let walasNip = '';

    if (!walasName) {
      const t = teachers.find(tch => 
        String(tch.walasClass || '').trim().toLowerCase() === String(selectedKelas).trim().toLowerCase()
      );
      if (t) {
        walasName = t.name;
        walasNip = t.nip && t.nip !== '-' ? t.nip : '';
      }
    } else {
      const t = teachers.find(tch => tch.name === walasName || tch.id === walasName);
      if (t && t.nip && t.nip !== '-') walasNip = t.nip;
    }

    const classStudents = students.filter(s => 
      String(s.class_name || s.kelas || s.className || '').trim().toLowerCase() === String(selectedKelas).trim().toLowerCase()
    );

    const totalJurnalInClass = classJournalCountMap[String(selectedKelas).toLowerCase().trim()] || 0;

    return {
      name: selectedKelas,
      walasName: walasName || 'Belum Ditentukan',
      walasNip: walasNip || '',
      studentCount: classStudents.length,
      totalJurnalInDb: totalJurnalInClass
    };
  }, [classes, teachers, students, selectedKelas, classJournalCountMap]);

  // Options Kelas untuk Select
  const classOptions = useMemo(() => {
    const list = classes.map(c => {
      const val = c.name || c.id;
      const count = classJournalCountMap[val.toLowerCase().trim()] || 0;
      return {
        value: val,
        label: `${val}${count > 0 ? ` (${count} Jurnal)` : ''}`,
        count
      };
    });

    // Urutkan kelas yang memiliki data jurnal di atas jika bukan walas
    if (!userWalasClass) {
      list.sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
    }
    return list;
  }, [classes, classJournalCountMap, userWalasClass]);

  // Fetch Jurnal Kelas dari Server
  const fetchJurnalKelas = useCallback(async () => {
    if (!authToken || !selectedKelas) return;
    setIsLoading(true);

    try {
      const params = new URLSearchParams();
      params.set('mode', 'rekap_kelas');
      params.set('scope', 'kelas');
      params.set('kelas', selectedKelas.trim());
      params.set('limit', 'all');
      params.set('sort', sortOrder);

      const today = new Date();
      if (periodeMode === 'minggu') {
        const start = new Date(today);
        start.setDate(today.getDate() - 6);
        params.set('start_date', start.toISOString().split('T')[0]);
        params.set('end_date', today.toISOString().split('T')[0]);
      } else if (periodeMode === 'bulan') {
        const start = new Date(today);
        start.setDate(today.getDate() - 29);
        params.set('start_date', start.toISOString().split('T')[0]);
        params.set('end_date', today.toISOString().split('T')[0]);
      } else if (periodeMode === 'semester') {
        params.set('semester', semesterChoice);
        params.set('tahun', String(tahunAjaran));
      } else if (periodeMode === 'custom') {
        if (customStartDate) params.set('start_date', customStartDate);
        if (customEndDate) params.set('end_date', customEndDate);
      }
      // jika periodeMode === 'semua', tidak set parameter tanggal sehingga backend mengembalikan seluruh catatan

      if (selectedTeacher !== 'all') {
        params.set('teacher_code', selectedTeacher);
      }

      const res = await fetch(`/api/jurnal/harian?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      const data = await res.json();

      if (data.ok && Array.isArray(data.data)) {
        setJurnalList(data.data);
      } else {
        setJurnalList([]);
      }
    } catch (err) {
      console.error('Gagal mengambil jurnal kelas:', err);
      setJurnalList([]);
    } finally {
      setIsLoading(false);
    }
  }, [authToken, selectedKelas, sortOrder, periodeMode, semesterChoice, tahunAjaran, customStartDate, customEndDate, selectedTeacher]);

  useEffect(() => {
    fetchJurnalKelas();
  }, [fetchJurnalKelas]);

  // Filtered Jurnals (Mapel & Search)
  const filteredJurnals = useMemo(() => {
    return jurnalList.filter(item => {
      if (selectedMapel !== 'all' && item.mapel !== selectedMapel) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const inMateri = (item.materi_pokok || '').toLowerCase().includes(q);
        const inKegiatan = (item.kegiatan_pembelajaran || '').toLowerCase().includes(q);
        const inMapel = (item.mapel || '').toLowerCase().includes(q);
        const inGuru = (item.teacher_name || item.teacher_code || '').toLowerCase().includes(q);
        const inCatatan = (item.catatan || '').toLowerCase().includes(q);
        if (!inMateri && !inKegiatan && !inMapel && !inGuru && !inCatatan) return false;
      }
      return true;
    });
  }, [jurnalList, selectedMapel, searchQuery]);

  // Options Mapel
  const mapelOptions = useMemo(() => {
    const setMapel = new Set();
    jurnalList.forEach(j => {
      if (j.mapel) setMapel.add(j.mapel);
    });
    return [
      { value: 'all', label: 'Semua Mata Pelajaran' },
      ...Array.from(setMapel).sort().map(m => ({ value: m, label: m }))
    ];
  }, [jurnalList]);

  // Options Teacher
  const teacherOptions = useMemo(() => {
    const teacherMap = new Map();
    jurnalList.forEach(j => {
      if (j.teacher_code) {
        teacherMap.set(j.teacher_code, j.teacher_name || j.teacher_code);
      }
    });
    return [
      { value: 'all', label: 'Semua Guru Pengajar' },
      ...Array.from(teacherMap.entries()).map(([code, name]) => ({
        value: code,
        label: `${name} (${code})`
      }))
    ];
  }, [jurnalList]);

  // Periode Label
  const periodeLabel = useMemo(() => {
    if (periodeMode === 'minggu') return '1 Minggu Terakhir';
    if (periodeMode === 'bulan') return '1 Bulan Terakhir';
    if (periodeMode === 'semua') return 'Semua Riwayat KBM (Keseluruhan)';
    if (periodeMode === 'custom') return `${customStartDate || 'Awal'} s/d ${customEndDate || 'Sekarang'}`;
    const semName = semesterChoice === 'ganjil' ? 'Semester Ganjil (Jul - Des)' : 'Semester Genap (Jan - Jun)';
    return `${semName} T.A. ${tahunAjaran}/${tahunAjaran + 1}`;
  }, [periodeMode, semesterChoice, tahunAjaran, customStartDate, customEndDate]);

  // KPI Calculations
  const kpiStats = useMemo(() => {
    const totalPertemuan = filteredJurnals.length;
    let totalJP = 0;
    const teachersSet = new Set();
    let totalHadirSiswa = 0;
    let totalSakit = 0;
    let totalIzin = 0;
    let totalAlpa = 0;
    let recordsWithAttendance = 0;

    filteredJurnals.forEach(j => {
      const jamStr = String(j.jam_ke || '');
      if (jamStr.includes('-')) {
        const parts = jamStr.split('-').map(p => parseInt(p.trim(), 10)).filter(n => !isNaN(n));
        if (parts.length === 2 && parts[1] >= parts[0]) {
          totalJP += (parts[1] - parts[0] + 1);
        } else {
          totalJP += 1;
        }
      } else {
        totalJP += 1;
      }

      if (j.teacher_code) teachersSet.add(j.teacher_code);

      if (j.jumlah_hadir !== undefined && j.jumlah_hadir !== null) {
        totalHadirSiswa += parseInt(j.jumlah_hadir || 0, 10);
        recordsWithAttendance++;
      }

      if (Array.isArray(j.rincian_absensi)) {
        j.rincian_absensi.forEach(s => {
          const st = (s.status || '').toLowerCase();
          if (st === 'sakit') totalSakit++;
          else if (['izin', 'dispen'].includes(st)) totalIzin++;
          else if (['alpa', 'alpha'].includes(st)) totalAlpa++;
        });
      }
    });

    const studentBase = currentClassInfo.studentCount || 36;
    const maxPossibleAttendance = totalPertemuan * studentBase;
    const avgAttendancePct = maxPossibleAttendance > 0 
      ? Math.min(100, Math.round((totalHadirSiswa / maxPossibleAttendance) * 100))
      : 100;

    return {
      totalPertemuan,
      totalJP,
      guruCount: teachersSet.size,
      avgAttendancePct,
      totalSakit,
      totalIzin,
      totalAlpa
    };
  }, [filteredJurnals, currentClassInfo.studentCount]);

  // Export Excel
  const handleExportExcel = () => {
    if (filteredJurnals.length === 0) {
      alert('Tidak ada data jurnal untuk diekspor.');
      return;
    }

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet(`Jurnal ${selectedKelas}`);

    ws.addRow([`BUKU JURNAL PEMBELAJARAN KELAS: ${selectedKelas}`]);
    ws.addRow([`Wali Kelas: ${currentClassInfo.walasName} | Periode: ${periodeLabel}`]);
    ws.addRow([`Dicetak pada: ${new Date().toLocaleString('id-ID')}`]);
    ws.addRow([]);

    ws.getRow(1).font = { bold: true, size: 14 };
    ws.getRow(2).font = { italic: true, size: 10 };

    const headerRow = ws.addRow([
      'No', 'Tanggal', 'Jam Ke', 'Mata Pelajaran', 'Guru Pengajar', 
      'Kode Guru', 'Materi Pokok / KD', 'Kegiatan Pembelajaran', 
      'Presensi Hadir', 'Catatan Pembelajaran', 'Status Ketepatan'
    ]);

    headerRow.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF065F46' } };
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });

    filteredJurnals.forEach((j, idx) => {
      const dObj = new Date(j.tanggal);
      const dayName = !isNaN(dObj.getTime()) ? HARI_ID[dObj.getDay()] : '';
      const st = getJurnalSubmissionStatus(j.tanggal, j.submitted_at);

      const row = ws.addRow([
        idx + 1,
        `${dayName}, ${j.tanggal}`,
        `Jam ${j.jam_ke}`,
        j.mapel || '-',
        j.teacher_name || '-',
        j.teacher_code || '-',
        j.materi_pokok || '-',
        j.kegiatan_pembelajaran || '-',
        `${j.jumlah_hadir || 0} Hadir`,
        j.catatan || '-',
        st.label
      ]);
      row.alignment = { vertical: 'top', wrapText: true };
    });

    ws.columns = [
      { width: 6 }, { width: 22 }, { width: 12 }, { width: 26 }, { width: 24 },
      { width: 12 }, { width: 34 }, { width: 36 }, { width: 16 }, { width: 25 }, { width: 18 }
    ];

    wb.xlsx.writeBuffer().then(buf => {
      saveAs(new Blob([buf]), `Rekap_Jurnal_${selectedKelas.replace(/\s+/g, '_')}_${periodeMode}.xlsx`);
    });
  };

  // Cetak Dokumen PDF Resmi
  const handlePrintPdf = () => {
    if (filteredJurnals.length === 0) {
      alert('Tidak ada data jurnal untuk dicetak.');
      return;
    }

    const doc = new jsPDF('landscape', 'mm', 'a4');
    const { r, g, b } = getPrimaryColorRgb(appSettings?.primaryColor || '#0f766e');

    let yPos = drawKopSurat(doc, schoolProfile, appSettings);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(30, 41, 59);
    doc.text('REKAPITULASI BUKU JURNAL KBM KELAS', 148.5, yPos, { align: 'center' });
    yPos += 5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text(`Kelas: ${selectedKelas}   |   Wali Kelas: ${currentClassInfo.walasName}   |   Periode: ${periodeLabel}`, 148.5, yPos, { align: 'center' });
    yPos += 6;

    const tableRows = filteredJurnals.map((j, idx) => {
      const dObj = new Date(j.tanggal);
      const dayName = !isNaN(dObj.getTime()) ? HARI_ID[dObj.getDay()] : '';
      const dateFormatted = `${dayName}, ${j.tanggal}`;
      const st = getJurnalSubmissionStatus(j.tanggal, j.submitted_at);

      let hadirText = `${j.jumlah_hadir || 0} Hadir`;
      if (Array.isArray(j.rincian_absensi) && j.rincian_absensi.length > 0) {
        const sCount = j.rincian_absensi.filter(s => (s.status || '').toLowerCase() === 'sakit').length;
        const iCount = j.rincian_absensi.filter(s => ['izin', 'dispen'].includes((s.status || '').toLowerCase())).length;
        const aCount = j.rincian_absensi.filter(s => ['alpa', 'alpha'].includes((s.status || '').toLowerCase())).length;
        const parts = [];
        if (sCount > 0) parts.push(`${sCount}S`);
        if (iCount > 0) parts.push(`${iCount}I`);
        if (aCount > 0) parts.push(`${aCount}A`);
        if (parts.length > 0) hadirText += `\n(${parts.join(', ')})`;
      }

      let kegiatanStr = (j.kegiatan_pembelajaran || '-').trim();
      if (j.metode_pembelajaran) kegiatanStr += `\n[${j.metode_pembelajaran}]`;

      return [
        idx + 1,
        dateFormatted,
        `Jam ${j.jam_ke}`,
        j.mapel || '-',
        j.teacher_name ? `${j.teacher_name}\n(${j.teacher_code})` : (j.teacher_code || '-'),
        j.materi_pokok || '-',
        kegiatanStr,
        hadirText,
        j.catatan || '-',
        st.label
      ];
    });

    autoTable(doc, {
      startY: yPos,
      head: [[
        'No', 'Hari, Tanggal', 'Jam', 'Mata Pelajaran', 'Guru Pengajar',
        'Materi Pokok / KD', 'Kegiatan Pembelajaran', 'Presensi', 'Catatan', 'Status'
      ]],
      body: tableRows,
      theme: 'grid',
      styles: {
        fontSize: 7,
        cellPadding: 2,
        valign: 'middle',
        lineColor: [210, 215, 225],
        lineWidth: 0.1,
        textColor: [30, 41, 59]
      },
      headStyles: {
        fillColor: [r, g, b],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'center',
        fontSize: 7.5
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 8 },
        1: { cellWidth: 26 },
        2: { halign: 'center', cellWidth: 14 },
        3: { fontStyle: 'bold', cellWidth: 28 },
        4: { cellWidth: 32 },
        5: { cellWidth: 42 },
        6: { cellWidth: 48 },
        7: { halign: 'center', cellWidth: 20 },
        8: { cellWidth: 26 },
        9: { halign: 'center', cellWidth: 23 }
      },
      alternateRowStyles: { fillColor: [248, 250, 252] }
    });

    const finalY = doc.lastAutoTable.finalY + 12;
    if (finalY < 185) {
      const curDateStr = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
      const city = schoolProfile?.city || 'Bekasi';

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(30, 41, 59);

      doc.text(`${city}, ${curDateStr}`, 230, finalY);
      doc.text('Wali Kelas,', 50, finalY + 5, { align: 'center' });
      doc.text('Mengetahui,', 230, finalY + 5, { align: 'center' });
      doc.text('Kepala Sekolah / Waka Kurikulum,', 230, finalY + 10, { align: 'center' });

      const nameY = finalY + 28;
      doc.setFont('helvetica', 'bold');
      doc.text(currentClassInfo.walasName || '( ........................................ )', 50, nameY, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      if (currentClassInfo.walasNip) {
        doc.text(`NIP. ${currentClassInfo.walasNip}`, 50, nameY + 4, { align: 'center' });
      }

      const kepsekName = schoolProfile?.principalName || '( ........................................ )';
      const kepsekNip = schoolProfile?.principalNip ? `NIP. ${schoolProfile.principalNip}` : '';
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.text(kepsekName, 230, nameY, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      if (kepsekNip) {
        doc.text(kepsekNip, 230, nameY + 4, { align: 'center' });
      }
    }

    doc.save(`Rekap_Jurnal_Resmi_${selectedKelas.replace(/\s+/g, '_')}.pdf`);
  };

  // Pagination Logic
  const totalItems = filteredJurnals.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const paginatedJurnals = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredJurnals.slice(start, start + itemsPerPage);
  }, [filteredJurnals, currentPage, itemsPerPage]);

  return (
    <div className="space-y-4 w-full animate-in fade-in duration-300 font-sans">
      
      {/* ── CARD 1: KONTROL FILTER KELAS & PERIODE (OVERHAULED UI) ── */}
      <div className="bg-white rounded-[var(--ui-radius-card)] p-4 sm:p-5 border border-slate-200/80 shadow-xs space-y-4">
        
        {/* Header Bar: Selector Kelas, Info Walas, dan Tombol Ekspor */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-3.5 border-b border-slate-100">
          
          {/* Sisi Kiri: Selector Kelas Terpadu */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="min-w-[200px] sm:min-w-[240px]">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                <GraduationCap size={13} className="text-[var(--ui-primary)]" />
                <span>Pilih Kelas Target</span>
              </label>
              <CustomSelect
                options={classOptions}
                value={selectedKelas}
                onChange={val => {
                  setSelectedKelas(val);
                  setCurrentPage(1);
                }}
                searchable={true}
                placeholder="Pilih Kelas..."
                className="w-full text-xs font-black"
              />
            </div>

            {/* Badge Info Wali Kelas & Jumlah Siswa */}
            <div className="flex items-center gap-3 px-3.5 py-2 bg-slate-50 hover:bg-emerald-50/40 border border-slate-200/80 rounded-[var(--ui-radius-control)] transition-all">
              <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-black text-xs shadow-xs shrink-0">
                {selectedKelas.split(' ')[0] || 'K'}
              </div>
              <div className="text-left">
                <div className="text-xs font-black text-slate-800 leading-tight">
                  Wali Kelas: <span className="text-emerald-700">{currentClassInfo.walasName}</span>
                </div>
                <div className="text-[10.5px] text-slate-500 font-medium mt-0.5">
                  {currentClassInfo.studentCount} Siswa Terdaftar {currentClassInfo.walasNip && `• NIP: ${currentClassInfo.walasNip}`}
                </div>
              </div>
            </div>
          </div>

          {/* Sisi Kanan: Action Buttons (Excel & PDF) */}
          <div className="flex items-center gap-2 self-start lg:self-center shrink-0">
            <button
              type="button"
              onClick={handleExportExcel}
              disabled={isLoading || filteredJurnals.length === 0}
              className="px-3.5 py-2 rounded-[var(--ui-radius-control)] font-black text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/80 flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-98 disabled:opacity-50"
            >
              <Download size={14} className="text-emerald-600" />
              <span>Export Excel</span>
            </button>
            <button
              type="button"
              onClick={handlePrintPdf}
              disabled={isLoading || filteredJurnals.length === 0}
              className="px-3.5 py-2 rounded-[var(--ui-radius-control)] font-black text-xs bg-[var(--ui-primary-btn,var(--ui-primary))] hover:opacity-90 text-white flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-98 disabled:opacity-50"
            >
              <Printer size={14} />
              <span>Cetak Rekap PDF</span>
            </button>
          </div>
        </div>

        {/* Quick Class Shortcuts (Pills kelas yang terisi jurnal) */}
        {classesSummary.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs no-scrollbar">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
              <Sparkles size={11} className="text-amber-500" /> Kelas Ada KBM:
            </span>
            <div className="flex items-center gap-1.5 shrink-0">
              {classesSummary.slice(0, 8).map(c => {
                const isCurrent = c.kelas.toLowerCase().trim() === selectedKelas.toLowerCase().trim();
                return (
                  <button
                    key={c.kelas}
                    type="button"
                    onClick={() => {
                      setSelectedKelas(c.kelas);
                      setCurrentPage(1);
                    }}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-black transition-all cursor-pointer flex items-center gap-1.5 border ${
                      isCurrent
                        ? 'bg-[var(--ui-primary)] text-white border-[var(--ui-primary)] shadow-xs'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    <span>{c.kelas}</span>
                    <span className={`text-[9.5px] px-1.5 py-0.2 rounded-full font-bold ${
                      isCurrent ? 'bg-white/25 text-white' : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {c.total_jurnal}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Baris Kontrol Rentang Waktu (Pills Preset & Dropdown Semester Ber-CSS Rapi) */}
        <div className="pt-2 flex flex-col md:flex-row md:items-center justify-between gap-3">
          
          {/* Pills Pilihan Mode Periode */}
          <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100/90 rounded-[var(--ui-radius-control)] border border-slate-200/80 shadow-2xs">
            {[
              { id: 'semester', label: '1 Semester Penuh' },
              { id: 'semua', label: 'Semua Riwayat' },
              { id: 'bulan', label: '1 Bulan Ini' },
              { id: 'minggu', label: '1 Minggu Ini' },
              { id: 'custom', label: 'Kustom Rentang' },
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => { setPeriodeMode(tab.id); setCurrentPage(1); }}
                className={`px-3 py-1.5 rounded-[var(--ui-radius-small)] text-xs font-black transition-all cursor-pointer ${
                  periodeMode === tab.id
                    ? 'bg-white text-[var(--ui-primary)] shadow-xs font-black'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Sub-Filter Jika Semester Dipilih (Custom Stylized Dropdowns) */}
          {periodeMode === 'semester' && (
            <div className="flex items-center gap-2 text-xs">
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/80 rounded-[var(--ui-radius-control)] px-2.5 py-1 shadow-2xs">
                <Calendar size={13} className="text-[var(--ui-primary)] shrink-0" />
                <span className="text-[11px] font-bold text-slate-500">Semester:</span>
                <select
                  value={semesterChoice}
                  onChange={e => { setSemesterChoice(e.target.value); setCurrentPage(1); }}
                  className="bg-transparent text-xs font-black text-slate-800 focus:outline-none cursor-pointer pr-1"
                >
                  <option value="ganjil">Semester Ganjil (Jul - Des)</option>
                  <option value="genap">Semester Genap (Jan - Jun)</option>
                </select>
              </div>

              <div className="flex items-center gap-1 bg-slate-50 border border-slate-200/80 rounded-[var(--ui-radius-control)] px-2.5 py-1 shadow-2xs">
                <span className="text-[11px] font-bold text-slate-500">T.A.</span>
                <select
                  value={tahunAjaran}
                  onChange={e => { setTahunAjaran(parseInt(e.target.value, 10)); setCurrentPage(1); }}
                  className="bg-transparent text-xs font-black text-slate-800 focus:outline-none cursor-pointer pr-1"
                >
                  {[2024, 2025, 2026, 2027].map(yr => (
                    <option key={yr} value={yr}>{yr}/{yr + 1}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Sub-Filter Jika Kustom Rentang Dipilih */}
          {periodeMode === 'custom' && (
            <div className="flex items-center gap-2 text-xs">
              <input
                type="date"
                value={customStartDate}
                onChange={e => { setCustomStartDate(e.target.value); setCurrentPage(1); }}
                className="px-2.5 py-1 bg-slate-50 border border-slate-200/80 rounded-[var(--ui-radius-control)] text-xs text-slate-800 font-bold focus:outline-none focus:bg-white shadow-2xs"
              />
              <span className="text-slate-400 font-bold text-xs">s/d</span>
              <input
                type="date"
                value={customEndDate}
                onChange={e => { setCustomEndDate(e.target.value); setCurrentPage(1); }}
                className="px-2.5 py-1 bg-slate-50 border border-slate-200/80 rounded-[var(--ui-radius-control)] text-xs text-slate-800 font-bold focus:outline-none focus:bg-white shadow-2xs"
              />
            </div>
          )}
        </div>
      </div>

      {/* ── CARD 2: KPI STATISTIK KBM KELAS ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* KPI 1: Total Pertemuan */}
        <div className="bg-white p-3.5 rounded-[var(--ui-radius-card)] border border-slate-200/80 shadow-xs flex items-center gap-3 relative overflow-hidden group hover:border-[var(--ui-primary)]/40 transition-all">
          <div className="w-10 h-10 rounded-[var(--ui-radius-control)] bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-100/80 shadow-2xs">
            <BookOpen size={18} strokeWidth={2.2} />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Total Pertemuan</div>
            <div className="text-lg font-black text-slate-900 leading-tight mt-0.5">
              {kpiStats.totalPertemuan} <span className="text-xs font-semibold text-slate-400">Sesi KBM</span>
            </div>
          </div>
        </div>

        {/* KPI 2: Total Jam Pelajaran (JP) */}
        <div className="bg-white p-3.5 rounded-[var(--ui-radius-card)] border border-slate-200/80 shadow-xs flex items-center gap-3 relative overflow-hidden group hover:border-indigo-200 transition-all">
          <div className="w-10 h-10 rounded-[var(--ui-radius-control)] bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0 border border-indigo-100/80 shadow-2xs">
            <Clock size={18} strokeWidth={2.2} />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Jam Pelajaran</div>
            <div className="text-lg font-black text-indigo-900 leading-tight mt-0.5">
              {kpiStats.totalJP} <span className="text-xs font-semibold text-slate-400">JP Terlaksana</span>
            </div>
          </div>
        </div>

        {/* KPI 3: Guru Pengajar Aktif */}
        <div className="bg-white p-3.5 rounded-[var(--ui-radius-card)] border border-slate-200/80 shadow-xs flex items-center gap-3 relative overflow-hidden group hover:border-amber-200 transition-all">
          <div className="w-10 h-10 rounded-[var(--ui-radius-control)] bg-amber-50 text-amber-700 flex items-center justify-center shrink-0 border border-amber-100/80 shadow-2xs">
            <Users size={18} strokeWidth={2.2} />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Guru Pengajar</div>
            <div className="text-lg font-black text-amber-900 leading-tight mt-0.5">
              {kpiStats.guruCount} <span className="text-xs font-semibold text-slate-400">Guru Aktif</span>
            </div>
          </div>
        </div>

        {/* KPI 4: Rata-Rata Kehadiran Kelas */}
        <div className="bg-white p-3.5 rounded-[var(--ui-radius-card)] border border-slate-200/80 shadow-xs flex items-center gap-3 relative overflow-hidden group hover:border-teal-200 transition-all">
          <div className="w-10 h-10 rounded-[var(--ui-radius-control)] bg-teal-50 text-teal-700 flex items-center justify-center shrink-0 border border-teal-100/80 shadow-2xs">
            <UserCheck size={18} strokeWidth={2.2} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Presensi Rata-Rata</div>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-lg font-black text-teal-900 leading-tight">{kpiStats.avgAttendancePct}%</span>
              <span className="text-[10px] text-slate-500 font-bold truncate">
                {kpiStats.totalSakit}S • {kpiStats.totalIzin}I • {kpiStats.totalAlpa}A
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── CARD 3: TOOLBAR FILTER DETAIL (SEARCH, MAPEL, GURU, SORT, REFRESH) ── */}
      <div className="bg-white rounded-[var(--ui-radius-card)] p-3.5 border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3">
        
        {/* Search Bar */}
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari materi pokok, kegiatan KBM, nama guru, mapel..."
            value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 border border-slate-200/80 rounded-[var(--ui-radius-control)] focus:outline-none focus:bg-white focus:ring-2 focus:ring-[var(--ui-primary)]/20 focus:border-[var(--ui-primary)] transition-all font-semibold"
          />
          {searchQuery && (
            <button 
              type="button" 
              onClick={() => setSearchQuery('')} 
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* Dropdown Filters & Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Mapel Filter */}
          <div className="min-w-[170px] sm:w-48">
            <CustomSelect
              options={mapelOptions}
              value={selectedMapel}
              onChange={val => { setSelectedMapel(val); setCurrentPage(1); }}
              placeholder="Semua Mata Pelajaran"
              className="text-xs font-bold"
            />
          </div>

          {/* Teacher Filter */}
          <div className="min-w-[170px] sm:w-48">
            <CustomSelect
              options={teacherOptions}
              value={selectedTeacher}
              onChange={val => { setSelectedTeacher(val); setCurrentPage(1); }}
              placeholder="Semua Guru Pengajar"
              className="text-xs font-bold"
            />
          </div>

          {/* Sort Order Toggle */}
          <button
            type="button"
            onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
            className="px-3 py-2 rounded-[var(--ui-radius-control)] bg-slate-50 hover:bg-slate-100 border border-slate-200/80 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
            title="Ubah Urutan Tanggal"
          >
            <ArrowUpDown size={13} className="text-[var(--ui-primary)]" />
            <span>{sortOrder === 'asc' ? 'Awal ➔ Akhir' : 'Terbaru ➔ Awal'}</span>
          </button>

          {/* Refresh Realtime */}
          <button
            type="button"
            onClick={fetchJurnalKelas}
            disabled={isLoading}
            className="p-2 rounded-[var(--ui-radius-control)] bg-slate-50 hover:bg-slate-100 border border-slate-200/80 text-slate-600 transition-all cursor-pointer active:scale-95 shadow-2xs disabled:opacity-50"
            title="Muat Ulang Data Jurnal"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin text-[var(--ui-primary)]' : ''} />
          </button>
        </div>
      </div>

      {/* ── CARD 4: TABEL BUKU JURNAL KBM DETAIL ── */}
      <div className="bg-white rounded-[var(--ui-radius-card)] border border-slate-200/80 shadow-xs overflow-hidden">
        
        {/* Table Header Bar */}
        <div className="px-4 py-3 bg-slate-50/80 border-b border-slate-200/70 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <BookMarked size={16} className="text-emerald-700" />
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
              Buku Jurnal KBM Kelas: {selectedKelas}
            </h3>
            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-black">
              {filteredJurnals.length} Catatan
            </span>
          </div>
          <div className="text-[11px] text-slate-500 font-medium">
            Periode: <strong className="text-slate-700">{periodeLabel}</strong>
          </div>
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="p-14 text-center text-slate-500 font-bold flex flex-col items-center justify-center gap-2.5 animate-pulse">
            <div className="w-10 h-10 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center">
              <RefreshCw size={18} className="animate-spin text-emerald-600" />
            </div>
            <p className="text-xs text-slate-700 font-black">Menyinkronkan data jurnal KBM kelas {selectedKelas}...</p>
            <p className="text-[11px] text-slate-400">Mengambil catatan materi, kehadiran, dan guru pengajar dari server.</p>
          </div>
        ) : filteredJurnals.length === 0 ? (
          /* Empty State yang Informatif & Membantu */
          <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400">
              <BookOpen size={28} strokeWidth={1.5} />
            </div>
            <div>
              <p className="font-black text-slate-800 text-sm">Belum Ada Catatan Jurnal KBM di Periode Ini</p>
              <p className="text-xs text-slate-500 mt-1 max-w-md">
                Tidak ditemukan data jurnal pembelajaran untuk kelas <strong>{selectedKelas}</strong> pada rentang waktu <em>{periodeLabel}</em>.
              </p>
            </div>

            {/* Rekomendasi Solusi Cepat */}
            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
              {periodeMode !== 'semua' && (
                <button
                  type="button"
                  onClick={() => { setPeriodeMode('semua'); setCurrentPage(1); }}
                  className="px-3 py-1.5 rounded-[var(--ui-radius-control)] bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold transition-all cursor-pointer shadow-2xs"
                >
                  Buka Semua Riwayat KBM (Tanpa Batas Tanggal)
                </button>
              )}

              {classesSummary.length > 0 && (
                <div className="flex items-center gap-1 text-xs">
                  <span className="text-slate-400">Atau cek kelas lain:</span>
                  {classesSummary.slice(0, 3).map(c => (
                    <button
                      key={c.kelas}
                      type="button"
                      onClick={() => { setSelectedKelas(c.kelas); setCurrentPage(1); }}
                      className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-[11px] transition-all cursor-pointer"
                    >
                      {c.kelas} ({c.total_jurnal})
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600 border-collapse">
                <thead className="bg-slate-100/75 text-slate-700 font-black uppercase text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3 text-center w-10">No</th>
                    <th className="py-2.5 px-3 w-32">Hari / Tanggal</th>
                    <th className="py-2.5 px-3 w-20 text-center">Jam Ke</th>
                    <th className="py-2.5 px-3 w-40">Mata Pelajaran</th>
                    <th className="py-2.5 px-3 w-44">Guru Pengajar</th>
                    <th className="py-2.5 px-3">Materi Pokok & Kegiatan KBM</th>
                    <th className="py-2.5 px-3 w-28 text-center">Presensi Siswa</th>
                    <th className="py-2.5 px-3 w-28 text-center">Status Input</th>
                    <th className="py-2.5 px-3 w-16 text-center">Rincian</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedJurnals.map((j, idx) => {
                    const rowNumber = (currentPage - 1) * itemsPerPage + idx + 1;
                    const dObj = new Date(j.tanggal);
                    const dayName = !isNaN(dObj.getTime()) ? HARI_ID[dObj.getDay()] : '';
                    const st = getJurnalSubmissionStatus(j.tanggal, j.submitted_at);

                    const hasRincian = Array.isArray(j.rincian_absensi) && j.rincian_absensi.length > 0;
                    const sCount = hasRincian ? j.rincian_absensi.filter(s => (s.status || '').toLowerCase() === 'sakit').length : 0;
                    const iCount = hasRincian ? j.rincian_absensi.filter(s => ['izin', 'dispen'].includes((s.status || '').toLowerCase())).length : 0;
                    const aCount = hasRincian ? j.rincian_absensi.filter(s => ['alpa', 'alpha'].includes((s.status || '').toLowerCase())).length : 0;

                    return (
                      <tr 
                        key={j.id || `${j.tanggal}-${j.jam_ke}-${idx}`}
                        className="hover:bg-emerald-50/30 transition-colors cursor-pointer"
                        onClick={() => setDetailModalItem(j)}
                      >
                        <td className="py-3 px-3 text-center font-bold text-slate-400">{rowNumber}</td>
                        <td className="py-3 px-3">
                          <div className="font-extrabold text-slate-800">{dayName}</div>
                          <div className="text-[11px] text-slate-500 font-mono font-medium">{j.tanggal}</div>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="inline-block px-2 py-0.5 bg-indigo-50 border border-indigo-100 text-indigo-700 font-black rounded-md text-[11px]">
                            Jam {j.jam_ke}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-black text-slate-800">
                          {j.mapel}
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-800 line-clamp-1">{j.teacher_name || '-'}</div>
                          <div className="text-[10px] text-slate-500 font-mono font-semibold">Kode: {j.teacher_code}</div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-800 line-clamp-2">{j.materi_pokok || '-'}</div>
                          <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                            {j.kegiatan_pembelajaran || '-'}
                            {j.metode_pembelajaran && (
                              <span className="text-emerald-700 font-bold ml-1">[{j.metode_pembelajaran}]</span>
                            )}
                          </div>
                          {j.catatan && (
                            <div className="text-[10px] text-amber-700 font-semibold italic mt-0.5 line-clamp-1">
                              Catatan: {j.catatan}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <div className="font-black text-emerald-700">
                            {j.jumlah_hadir || 0} Hadir
                          </div>
                          {(sCount > 0 || iCount > 0 || aCount > 0) && (
                            <div className="flex items-center justify-center gap-1 mt-0.5 text-[10px] font-black">
                              {sCount > 0 && <span className="text-amber-600">{sCount}S</span>}
                              {iCount > 0 && <span className="text-blue-600">{iCount}I</span>}
                              {aCount > 0 && <span className="text-rose-600">{aCount}A</span>}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-black ${
                            st.status === 'submitted_on_time'
                              ? 'bg-emerald-100 text-emerald-800'
                              : st.status === 'submitted_late'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}>
                            {st.label}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setDetailModalItem(j); }}
                            className="p-1.5 rounded-md bg-slate-100 hover:bg-emerald-100 text-slate-600 hover:text-emerald-700 transition-colors cursor-pointer"
                            title="Lihat Rincian Pertemuan KBM"
                          >
                            <Eye size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List View */}
            <div className="md:hidden divide-y divide-slate-100">
              {paginatedJurnals.map((j, idx) => {
                const rowNumber = (currentPage - 1) * itemsPerPage + idx + 1;
                const dObj = new Date(j.tanggal);
                const dayName = !isNaN(dObj.getTime()) ? HARI_ID[dObj.getDay()] : '';
                const st = getJurnalSubmissionStatus(j.tanggal, j.submitted_at);

                const hasRincian = Array.isArray(j.rincian_absensi) && j.rincian_absensi.length > 0;
                const sCount = hasRincian ? j.rincian_absensi.filter(s => (s.status || '').toLowerCase() === 'sakit').length : 0;
                const iCount = hasRincian ? j.rincian_absensi.filter(s => ['izin', 'dispen'].includes((s.status || '').toLowerCase())).length : 0;
                const aCount = hasRincian ? j.rincian_absensi.filter(s => ['alpa', 'alpha'].includes((s.status || '').toLowerCase())).length : 0;

                return (
                  <div
                    key={j.id || `${j.tanggal}-${j.jam_ke}-${idx}`}
                    onClick={() => setDetailModalItem(j)}
                    className="p-3.5 hover:bg-slate-50 transition-colors cursor-pointer space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-400">#{rowNumber}</span>
                        <span className="font-black text-slate-900 text-xs">{dayName}, {j.tanggal}</span>
                      </div>
                      <span className="px-2 py-0.5 bg-indigo-50 border border-indigo-100 text-indigo-700 font-black rounded-md text-[10px]">
                        Jam {j.jam_ke}
                      </span>
                    </div>

                    <div>
                      <div className="font-black text-slate-900 text-xs">{j.mapel}</div>
                      <div className="text-[11px] text-slate-500 font-medium">{j.teacher_name || j.teacher_code}</div>
                    </div>

                    <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100 text-[11px] space-y-1">
                      <div className="font-bold text-slate-700">{j.materi_pokok}</div>
                      {j.kegiatan_pembelajaran && (
                        <div className="text-slate-500 text-[10px]">{j.kegiatan_pembelajaran}</div>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-[11px] pt-1">
                      <div className="flex items-center gap-2 font-black text-emerald-700">
                        <span>{j.jumlah_hadir || 0} Hadir</span>
                        {(sCount > 0 || iCount > 0 || aCount > 0) && (
                          <span className="text-slate-400 font-normal">
                            ({sCount > 0 ? `${sCount}S ` : ''}{iCount > 0 ? `${iCount}I ` : ''}{aCount > 0 ? `${aCount}A` : ''})
                          </span>
                        )}
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${
                        st.status === 'submitted_on_time'
                          ? 'bg-emerald-100 text-emerald-800'
                          : st.status === 'submitted_late'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}>
                        {st.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="p-3.5 bg-slate-50/70 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-[11px] text-slate-500 font-medium">
                  Menampilkan <strong>{(currentPage - 1) * itemsPerPage + 1}</strong> - <strong>{Math.min(currentPage * itemsPerPage, totalItems)}</strong> dari <strong>{totalItems}</strong> pertemuan KBM
                </div>
                <PaginationControls
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* ── MODAL DETAIL PERTEMUAN KBM & RINCIAN ABSENSI (KOMPREHENSIF) ── */}
      {detailModalItem && (
        <Modal
          isOpen={Boolean(detailModalItem)}
          onClose={() => setDetailModalItem(null)}
          title={`Detail Jurnal KBM: ${detailModalItem.mapel}`}
          maxWidth="max-w-2xl"
        >
          <div className="space-y-4 text-xs font-sans">
            {/* Header Ringkas Info Sesi */}
            <div className="p-4 bg-slate-50 rounded-[var(--ui-radius-control)] border border-slate-200/80 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Kelas</span>
                <p className="font-black text-slate-900 text-sm">{detailModalItem.kelas}</p>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Waktu & Sesi</span>
                <p className="font-black text-slate-800">{detailModalItem.tanggal}</p>
                <p className="text-[10px] text-indigo-600 font-black">Jam Ke-{detailModalItem.jam_ke}</p>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Guru Pengajar</span>
                <p className="font-black text-slate-800 line-clamp-1">{detailModalItem.teacher_name || '-'}</p>
                <p className="text-[10px] text-slate-500 font-mono font-bold">Kode: {detailModalItem.teacher_code}</p>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Status Input</span>
                <div className="mt-0.5">
                  {(() => {
                    const st = getJurnalSubmissionStatus(detailModalItem.tanggal, detailModalItem.submitted_at);
                    return (
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                        st.status === 'submitted_on_time' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {st.label}
                      </span>
                    );
                  })()}
                </div>
              </div>
            </div>

            {/* Materi Pokok & Kegiatan KBM */}
            <div className="space-y-2.5">
              <div>
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Materi Pokok / Kompetensi Dasar</h4>
                <div className="p-3 bg-white border border-slate-200 rounded-[var(--ui-radius-control)] font-bold text-slate-800 text-xs">
                  {detailModalItem.materi_pokok || '-'}
                </div>
              </div>

              <div>
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Kegiatan Pembelajaran & Metode</h4>
                <div className="p-3 bg-white border border-slate-200 rounded-[var(--ui-radius-control)] text-slate-700 space-y-1.5 font-medium">
                  <p>{detailModalItem.kegiatan_pembelajaran || '-'}</p>
                  {detailModalItem.metode_pembelajaran && (
                    <div className="text-[11px] text-emerald-700 font-black flex items-center gap-1">
                      <span>Metode:</span>
                      <span className="px-1.5 py-0.5 bg-emerald-50 border border-emerald-200 rounded">{detailModalItem.metode_pembelajaran}</span>
                    </div>
                  )}
                </div>
              </div>

              {detailModalItem.catatan && (
                <div>
                  <h4 className="text-[10px] font-black text-amber-800 uppercase tracking-widest mb-1">Catatan Tambahan Kelas</h4>
                  <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-[var(--ui-radius-control)] text-amber-900 font-medium">
                    {detailModalItem.catatan}
                  </div>
                </div>
              )}
            </div>

            {/* Presensi Siswa & Rincian Ketidakhadiran */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Rincian Presensi Siswa ({detailModalItem.jumlah_hadir || 0} Hadir)
                </h4>
              </div>

              {Array.isArray(detailModalItem.rincian_absensi) && detailModalItem.rincian_absensi.length > 0 ? (
                <div className="max-h-56 overflow-y-auto border border-slate-200 rounded-[var(--ui-radius-control)] divide-y divide-slate-100">
                  {detailModalItem.rincian_absensi.map((s, sIdx) => {
                    const status = (s.status || '').toLowerCase();
                    const badgeColor = status === 'hadir'
                      ? 'bg-emerald-100 text-emerald-800'
                      : status === 'sakit'
                      ? 'bg-amber-100 text-amber-800'
                      : ['izin', 'dispen'].includes(status)
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-rose-100 text-rose-800';

                    return (
                      <div key={s.nis || sIdx} className="p-2.5 flex items-center justify-between hover:bg-slate-50 transition-colors">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-slate-400 font-mono w-5">{sIdx + 1}.</span>
                          <div>
                            <p className="font-black text-slate-800 text-xs">{s.nama || s.name || s.nis}</p>
                            <p className="text-[10px] text-slate-400 font-mono font-medium">{s.nis}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {s.catatan && (
                            <span className="text-[10px] text-slate-500 italic max-w-xs truncate font-medium">
                              "{s.catatan}"
                            </span>
                          )}
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${badgeColor}`}>
                            {s.status || 'Hadir'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-[var(--ui-radius-control)] text-center text-slate-500 text-xs font-medium">
                  Seluruh siswa tercatat hadir penuh pada sesi KBM ini.
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDetailModalItem(null)}
                className="text-xs font-bold rounded-[var(--ui-radius-control)]"
              >
                Tutup
              </Button>
            </div>
          </div>
        </Modal>
      )}

    </div>
  );
}
