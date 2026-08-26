import { useState, useEffect, useMemo, useCallback } from'react';
import { BookOpen } from'lucide-react';
import useAuthStore from'../../store/monitoring/authStore.js';
import { useDataStore } from'../../store/useDataStore.js';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { drawKopSurat, getPrimaryColorRgb, getPrimaryColorLight } from '../../utils/pdfHelpers.js';
import { Clock, CheckCircle2, AlertCircle, X, Calendar, Users, ClipboardList, Award, FileText, MessageSquare, RefreshCw, Download, Edit2, Trash2, Plus, Minus, Search, ArrowUpDown, Filter, Coffee, FileDown, ChevronDown, ChevronLeft, Sparkles, Check, CheckCheck, Lightbulb, UserCheck, UserX, HeartPulse, UserMinus, ShieldAlert, ArrowRight, ArrowLeft, Zap, Wrench, Printer } from'lucide-react';
import { CustomSelect } from'../../components/CustomSelect.jsx';
import { PageHeader } from'../../components/monitoring/ui/index.js';
import { PaginationControls } from'../../components/ui/PaginationControls.jsx';
import { Modal, Button } from '../../components/ui.jsx';


const HARI_ID = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
const METODE_OPTIONS = ['Ceramah & Diskusi','Problem Based Learning','Project Based Learning','Discovery Learning','Cooperative Learning','Demonstrasi & Praktik','Flipped Classroom','Inkuiri','STEM','Lainnya'
];

const JENIS_CATATAN_LABEL = {
  umum: { label:'Catatan Umum', color:'bg-slate-100 text-slate-700' },
  akademik: { label:'Akademik', color:'bg-indigo-100 text-indigo-700' },
  perilaku: { label:'Perilaku', color:'bg-amber-100 text-amber-700' },
  prestasi: { label:'Prestasi', color:'bg-emerald-100 text-emerald-700' },
  kesehatan: { label:'Kesehatan', color:'bg-rose-100 text-rose-700' },
};

export function getJurnalSubmissionStatus(tanggalKBM, submittedAt) {
  if (!submittedAt) {
    const today = new Date().toISOString().split('T')[0];
    if (tanggalKBM && tanggalKBM < today) {
      const diffMs = new Date(today) - new Date(tanggalKBM);
      const diffDays = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)));
      return { 
        status: 'unsubmitted_past', 
        isLate: true, 
        diffDays, 
        label: `Belum Diisi (H-${diffDays})`,
        timeStr: '',
        dateStr: '',
        fullSubmitStr: ''
      };
    }
    return { 
      status: 'unsubmitted', 
      isLate: false, 
      diffDays: 0, 
      label: 'Belum Diisi',
      timeStr: '',
      dateStr: '',
      fullSubmitStr: ''
    };
  }

  let submitObj = new Date(submittedAt);
  if (isNaN(submitObj.getTime())) {
    submitObj = new Date();
  }

  // Format date & time consistently in Asia/Jakarta (WIB)
  const submitDateStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(submitObj);
  const kbmDateStr = typeof tanggalKBM === 'string' ? tanggalKBM.split('T')[0] : submitDateStr;

  const dSubmit = new Date(submitDateStr);
  const dKbm = new Date(kbmDateStr);

  const diffMs = dSubmit - dKbm;
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  const timeStr = new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Jakarta'
  }).format(submitObj).replace('.', ':');

  const dateStr = new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Jakarta'
  }).format(submitObj);

  if (diffDays > 0) {
    return {
      status: 'submitted_late',
      isLate: true,
      diffDays,
      timeStr,
      dateStr,
      fullSubmitStr: `${dateStr}, ${timeStr} WIB`,
      label: `Terlambat (H+${diffDays})`,
      note: `Diisi terlambat pada ${dateStr} pukul ${timeStr} WIB (H+${diffDays})`
    };
  }

  return {
    status: 'submitted_on_time',
    isLate: false,
    diffDays: 0,
    timeStr,
    dateStr,
    fullSubmitStr: `${dateStr}, ${timeStr} WIB`,
    label: 'Tepat Waktu',
    note: `Diisi pada ${dateStr} pukul ${timeStr} WIB`
  };
}

function StatusBadge({ submitted, isLate, submittedAt, tanggal, showTime = true }) {
  const statusInfo = getJurnalSubmissionStatus(tanggal, submittedAt);

  if (statusInfo.status === 'submitted_late') {
    return (
      <div className="inline-flex flex-col items-center">
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-[var(--ui-radius-control)] text-[10px] font-black uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200/90 shadow-2xs">
          <Clock size={10} className="stroke-[3] text-rose-600 shrink-0" />
          <span>{statusInfo.label}</span>
        </span>
        {showTime && statusInfo.timeStr && (
          <span className="text-[9px] font-bold text-rose-600/80 mt-0.5" title={statusInfo.fullSubmitStr}>
            {statusInfo.timeStr} WIB
          </span>
        )}
      </div>
    );
  }

  if (statusInfo.status === 'submitted_on_time') {
    return (
      <div className="inline-flex flex-col items-center">
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-[var(--ui-radius-control)] text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200/90 shadow-2xs">
          <CheckCircle2 size={10} className="stroke-[3] text-emerald-600 shrink-0" />
          <span>Tepat Waktu</span>
        </span>
        {showTime && statusInfo.timeStr && (
          <span className="text-[9px] font-bold text-emerald-700/80 mt-0.5" title={statusInfo.fullSubmitStr}>
            {statusInfo.timeStr} WIB
          </span>
        )}
      </div>
    );
  }

  if (statusInfo.status === 'unsubmitted_past') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[var(--ui-radius-control)] text-[10px] font-black uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200 shadow-2xs">
        <AlertCircle size={10} className="stroke-[3] text-amber-600 shrink-0" />
        <span>Terlewat (H-{statusInfo.diffDays})</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[var(--ui-radius-control)] text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-500 border border-slate-200">
      <AlertCircle size={10} className="stroke-[3] shrink-0" />
      <span>Belum Diisi</span>
    </span>
  );
}

// Helper Generator PDF Rekap Jurnal KBM Per Semester
export async function generateRekapJurnalPDF({
  jurnalRecords = [],
  teacherInfo = {},
  semester = 'Ganjil',
  tahunAjaran = '2026/2027',
  kelasFilter = 'Semua Kelas',
  mapelFilter = 'Semua Mata Pelajaran',
  appSettings = {},
  schoolProfile = {},
  kepsekInfo = {}
}) {
  const isF4 = appSettings?.defaultPaperSize === 'F4';
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: isF4 ? [330, 215] : 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const [r, g, b] = getPrimaryColorRgb();

  // 1. Draw Kop Surat (Proportional, centered)
  let yPos = drawKopSurat(doc, true);

  // 2. Title Header
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(r, g, b);
  doc.text("JURNAL KEGIATAN PEMBELAJARAN GURU (KBM)", pageWidth / 2, yPos, { align: "center" });

  yPos += 4.5;
  doc.setFontSize(9.5);
  doc.setFont("Helvetica", "bold");
  doc.setTextColor(50, 50, 50);
  const semTitle = `SEMESTER ${semester.toUpperCase()} TAHUN AJARAN ${tahunAjaran}`;
  doc.text(semTitle, pageWidth / 2, yPos, { align: "center" });

  yPos += 5.5;

  // Calculate tepat vs terlambat
  const tepatCount = jurnalRecords.filter(j => {
    const st = getJurnalSubmissionStatus(j.tanggal, j.submitted_at);
    return !st.isLate && !!j.submitted_at;
  }).length;
  const telatCount = jurnalRecords.filter(j => {
    const st = getJurnalSubmissionStatus(j.tanggal, j.submitted_at);
    return st.isLate;
  }).length;

  // 3. Teacher and Subject Information Block (Styled modern box)
  const boxX = 14;
  const boxWidth = pageWidth - 28;
  const boxHeight = 16;
  
  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setLineWidth(0.3);
  doc.roundedRect(boxX, yPos, boxWidth, boxHeight, 2, 2, 'FD');

  doc.setFontSize(8);
  doc.setTextColor(50, 50, 50);

  const leftX = boxX + 4;
  const rightX = boxX + (boxWidth / 2) + 4;
  const rowY1 = yPos + 4.5;
  const rowY2 = yPos + 9;
  const rowY3 = yPos + 13.5;

  doc.setFont("Helvetica", "bold");
  doc.text("Nama Guru", leftX, rowY1);
  doc.setFont("Helvetica", "normal");
  doc.text(`: ${teacherInfo.name || teacherInfo.code || '-'}`, leftX + 24, rowY1);

  doc.setFont("Helvetica", "bold");
  doc.text("Kelas / Rombel", rightX, rowY1);
  doc.setFont("Helvetica", "normal");
  doc.text(`: ${kelasFilter}`, rightX + 24, rowY1);

  doc.setFont("Helvetica", "bold");
  doc.text("NIP / Kode", leftX, rowY2);
  doc.setFont("Helvetica", "normal");
  doc.text(`: ${teacherInfo.nip || teacherInfo.code || '-'}`, leftX + 24, rowY2);

  doc.setFont("Helvetica", "bold");
  doc.text("Mata Pelajaran", rightX, rowY2);
  doc.setFont("Helvetica", "normal");
  doc.text(`: ${mapelFilter}`, rightX + 24, rowY2);

  doc.setFont("Helvetica", "bold");
  doc.text("Total Jurnal", leftX, rowY3);
  doc.setFont("Helvetica", "normal");
  doc.text(`: ${jurnalRecords.length} Pertemuan (${tepatCount} Tepat Waktu, ${telatCount} Terlambat)`, leftX + 24, rowY3);

  doc.setFont("Helvetica", "bold");
  doc.text("Semester", rightX, rowY3);
  doc.setFont("Helvetica", "normal");
  doc.text(`: ${semester} (${tahunAjaran})`, rightX + 24, rowY3);

  yPos += boxHeight + 4.5;

  // 4. Build Table Rows
  const tableRows = jurnalRecords.map((j, idx) => {
    const st = getJurnalSubmissionStatus(j.tanggal, j.submitted_at);

    // Safe Date Parsing
    let dateFormatted = '-';
    if (j.tanggal) {
      try {
        const rawStr = String(j.tanggal).split('T')[0].trim();
        const [y, m, d] = rawStr.split('-');
        if (y && m && d) {
          const dObj = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10));
          if (!isNaN(dObj.getTime())) {
            dateFormatted = dObj.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
          }
        }
      } catch (_) {
        dateFormatted = String(j.tanggal);
      }
    }

    // Attendance formatting
    let rincianHadirStr = '0 Siswa';
    if (j.rincian_absensi && Array.isArray(j.rincian_absensi) && j.rincian_absensi.length > 0) {
      const hCount = j.rincian_absensi.filter(s => (s.status || '').toLowerCase() === 'hadir').length;
      const tCount = j.rincian_absensi.filter(s => (s.status || '').toLowerCase() === 'terlambat').length;
      const sCount = j.rincian_absensi.filter(s => (s.status || '').toLowerCase() === 'sakit').length;
      const iCount = j.rincian_absensi.filter(s => ['izin', 'dispen', 'dispensasi'].includes((s.status || '').toLowerCase())).length;
      const aCount = j.rincian_absensi.filter(s => ['alpa', 'alpha'].includes((s.status || '').toLowerCase())).length;
      
      const totalHadir = hCount + tCount;
      rincianHadirStr = `${totalHadir} Siswa`;
      
      const parts = [];
      if (tCount > 0) parts.push(`${tCount} Telat`);
      if (sCount > 0) parts.push(`${sCount} S`);
      if (iCount > 0) parts.push(`${iCount} I`);
      if (aCount > 0) parts.push(`${aCount} A`);

      if (parts.length > 0) {
        rincianHadirStr += `\n(${parts.join(', ')})`;
      }
    } else if (j.jumlah_hadir !== undefined && j.jumlah_hadir !== null) {
      rincianHadirStr = `${parseInt(j.jumlah_hadir, 10) || 0} Siswa`;
    }

    let statusSubmitStr = st.label;
    if (st.timeStr) {
      statusSubmitStr += `\n(${st.timeStr})`;
    }

    // Kegiatan KBM Formatting
    let kegiatanStr = (j.kegiatan_pembelajaran || '-').trim();
    if (j.metode_pembelajaran) {
      kegiatanStr += `\n[Metode: ${j.metode_pembelajaran}]`;
    }
    if (j.catatan) {
      kegiatanStr += `\nCatatan: ${j.catatan}`;
    }

    return [
      idx + 1,
      dateFormatted,
      `Jam ${j.jam_ke}`,
      j.kelas || '-',
      j.mapel || '-',
      j.materi_pokok || '-',
      kegiatanStr,
      rincianHadirStr,
      statusSubmitStr,
      ''
    ];
  });

  // 5. Draw Table with autoTable
  autoTable(doc, {
    startY: yPos,
    head: [[
      'No',
      'Hari, Tanggal',
      'Jam Ke',
      'Kelas',
      'Mata Pelajaran',
      'Materi Pokok / KD',
      'Kegiatan Pembelajaran & Metode',
      'Kehadiran Siswa',
      'Status Submit',
      'Paraf'
    ]],
    body: tableRows.length > 0 ? tableRows : [[
      { content: 'Tidak ada data jurnal pada periode semester ini.', colSpan: 10, styles: { halign: 'center', fontStyle: 'italic', textColor: [120, 120, 120] } }
    ]],
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
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 8 },
      1: { halign: 'center', cellWidth: 27 },
      2: { halign: 'center', cellWidth: 14 },
      3: { halign: 'center', cellWidth: 18 },
      4: { cellWidth: 30, fontStyle: 'bold' },
      5: { cellWidth: 42 },
      6: { cellWidth: 'auto' },
      7: { halign: 'center', cellWidth: 26 },
      8: { halign: 'center', cellWidth: 25 },
      9: { halign: 'center', cellWidth: 13 }
    },
    didDrawPage: () => {
      const str = `Halaman ${doc.internal.getNumberOfPages()}`;
      doc.setFontSize(7);
      doc.setTextColor(140, 140, 140);
      doc.text(str, pageWidth - 14, pageHeight - 5, { align: 'right' });
      doc.text(`Dicetak melalui Sistem Kurmon pada ${new Date().toLocaleString('id-ID')}`, 14, pageHeight - 5);
    }
  });

  // 6. Signatures Section on Final Page
  let finalY = doc.lastAutoTable.finalY + 8;
  if (finalY + 36 > pageHeight) {
    doc.addPage();
    finalY = 18;
  }

  const profileObj = schoolProfile?.nama_sekolah ? schoolProfile : (appSettings?.schoolProfile || {});
  let kota = profileObj.kabupaten || profileObj.kota || appSettings.kopSuratKota || '';
  if (!kota) {
    if (appSettings.kopSuratAlamat && appSettings.kopSuratAlamat.toLowerCase().includes('bekasi')) kota = 'Bekasi';
    else if (appSettings.kopSuratBaris2 && appSettings.kopSuratBaris2.toLowerCase().includes('bekasi')) kota = 'Bekasi';
    else kota = 'Bekasi';
  }

  const tglCetakStr = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

  doc.setFontSize(8);
  doc.setFont("Helvetica", "normal");
  doc.setTextColor(20, 20, 20);

  const sigLeftX = 40;
  const sigRightX = pageWidth - 60;

  doc.text("Mengetahui,", sigLeftX, finalY, { align: "center" });
  doc.text("Kepala Sekolah", sigLeftX, finalY + 4, { align: "center" });

  doc.text(`${kota}, ${tglCetakStr}`, sigRightX, finalY, { align: "center" });
  doc.text("Guru Mata Pelajaran,", sigRightX, finalY + 4, { align: "center" });

  const namaKepsek = (kepsekInfo.nama && kepsekInfo.nama !== 'Kepala Sekolah')
    ? kepsekInfo.nama
    : (profileObj.kepala_sekolah || profileObj.nama_kepala_sekolah || appSettings.namaKepalaSekolah || appSettings.kepalaSekolah || 'Kepala Sekolah');
    
  const nipKepsek = (kepsekInfo.nip && kepsekInfo.nip !== '-')
    ? kepsekInfo.nip
    : (profileObj.nip_kepala_sekolah || profileObj.nip || appSettings.nipKepalaSekolah || '-');

  const namaGuru = teacherInfo.name || teacherInfo.code || 'Guru Pengampu';
  const nipGuru = teacherInfo.nip || teacherInfo.nip_guru || '-';

  doc.setFont("Helvetica", "bold");
  doc.text(namaKepsek, sigLeftX, finalY + 22, { align: "center" });
  doc.setFont("Helvetica", "normal");
  doc.text(`NIP. ${nipKepsek}`, sigLeftX, finalY + 26, { align: "center" });

  doc.setFont("Helvetica", "bold");
  doc.text(namaGuru, sigRightX, finalY + 22, { align: "center" });
  doc.setFont("Helvetica", "normal");
  doc.text(`NIP. ${nipGuru}`, sigRightX, finalY + 26, { align: "center" });

  // Save PDF
  const cleanTeacher = (teacherInfo.name || teacherInfo.code || 'Guru').replace(/[\s\-_.]/g, '_');
  const fileName = `Rekap_Jurnal_KBM_${semester}_${cleanTeacher}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
}

// Modal Dialog Export Rekap Jurnal Semester PDF
function ExportSemesterModal({ 
  isOpen, 
  onClose, 
  user, 
  teachers = [], 
  classes = [],
  schedule = [],
  appSettings = {},
  schoolProfile = {}
}) {
  const authToken = user?.authToken;
  const role = user?.role || '';
  const isKurikulum = ['admin', 'superadmin'].includes(role) || (role === 'waka' && (user?.division || '').toLowerCase() === 'kurikulum');
  
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1; // 1-12
  
  const defaultSemester = currentMonth >= 7 ? 'Ganjil' : 'Genap';
  const defaultTahunAjaran = currentMonth >= 7 ? `${currentYear}/${currentYear + 1}` : `${currentYear - 1}/${currentYear}`;

  const [selectedSemester, setSelectedSemester] = useState(defaultSemester);
  const [selectedTahunAjaran, setSelectedTahunAjaran] = useState(defaultTahunAjaran);
  const [selectedTeacher, setSelectedTeacher] = useState(isKurikulum ? '' : (user?.code || user?.id || ''));
  const [selectedKelas, setSelectedKelas] = useState('all');
  const [selectedMapel, setSelectedMapel] = useState('all');
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState('');

  // Teacher list options
  const teacherOptions = useMemo(() => {
    const list = teachers.map(t => ({ value: t.code, label: `${t.name} (${t.code})` }));
    return [{ value: '', label: 'Semua Guru' }, ...list];
  }, [teachers]);

  // Class list options
  const classOptions = useMemo(() => {
    const names = [...new Set(classes.map(c => c.name || c.kelas || c.class_name).filter(Boolean))].sort();
    return [{ value: 'all', label: 'Semua Kelas' }, ...names.map(n => ({ value: n, label: n }))];
  }, [classes]);

  // Subject list options
  const subjectOptions = useMemo(() => {
    const subjects = [...new Set(schedule.map(s => s.subject || s.mapel).filter(Boolean))].sort();
    return [{ value: 'all', label: 'Semua Mata Pelajaran' }, ...subjects.map(s => ({ value: s, label: s }))];
  }, [schedule]);

  const handleExportPDF = async () => {
    setIsExporting(true);
    setExportError('');

    try {
      const startYear = parseInt(selectedTahunAjaran.split('/')[0], 10) || currentYear;
      let startDate = `${startYear}-07-01`;
      let endDate = `${startYear}-12-31`;

      if (selectedSemester === 'Genap') {
        startDate = `${startYear + 1}-01-01`;
        endDate = `${startYear + 1}-06-30`;
      } else if (selectedSemester === 'Penuh') {
        startDate = `${startYear}-07-01`;
        endDate = `${startYear + 1}-06-30`;
      }

      const params = new URLSearchParams();
      params.set('start_date', startDate);
      params.set('end_date', endDate);
      params.set('limit', 'all');
      params.set('sort', 'asc');

      const targetTeacherCode = selectedTeacher || (isKurikulum ? '' : (user?.code || user?.id || ''));
      if (targetTeacherCode) {
        params.set('teacher_code', targetTeacherCode);
      }
      if (selectedKelas !== 'all') {
        params.set('kelas', selectedKelas);
      }

      const res = await fetch(`/api/jurnal/harian?${params}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      const json = await res.json();

      if (!json.ok) {
        throw new Error(json.error || 'Gagal memuat data jurnal');
      }

      let records = json.data || [];
      if (selectedMapel !== 'all') {
        records = records.filter(j => j.mapel === selectedMapel);
      }

      if (records.length === 0) {
        setExportError(`Tidak ditemukan rekaman jurnal untuk Semester ${selectedSemester} (${selectedTahunAjaran}). Pastikan tanggal KBM sudah sesuai.`);
        setIsExporting(false);
        return;
      }

      const teacherObj = teachers.find(t => t.code === targetTeacherCode) || {
        name: user?.name || user?.code || 'Guru Pengampu',
        code: targetTeacherCode,
        nip: user?.nip || '-'
      };

      await generateRekapJurnalPDF({
        jurnalRecords: records,
        teacherInfo: teacherObj,
        semester: selectedSemester,
        tahunAjaran: selectedTahunAjaran,
        kelasFilter: selectedKelas === 'all' ? 'Semua Kelas' : selectedKelas,
        mapelFilter: selectedMapel === 'all' ? 'Semua Mata Pelajaran' : selectedMapel,
        appSettings,
        schoolProfile,
        kepsekInfo: {
          nama: schoolProfile?.kepala_sekolah || appSettings?.namaKepalaSekolah || 'Kepala Sekolah',
          nip: schoolProfile?.nip_kepala_sekolah || appSettings?.nipKepalaSekolah || '-'
        }
      });

      onClose();
    } catch (err) {
      console.error('PDF Export Error:', err);
      setExportError(err.message || 'Terjadi kesalahan saat membuat file PDF.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportExcelSemester = async () => {
    setIsExporting(true);
    setExportError('');

    try {
      const startYear = parseInt(selectedTahunAjaran.split('/')[0], 10) || currentYear;
      let startDate = `${startYear}-07-01`;
      let endDate = `${startYear}-12-31`;

      if (selectedSemester === 'Genap') {
        startDate = `${startYear + 1}-01-01`;
        endDate = `${startYear + 1}-06-30`;
      } else if (selectedSemester === 'Penuh') {
        startDate = `${startYear}-07-01`;
        endDate = `${startYear + 1}-06-30`;
      }

      const params = new URLSearchParams();
      params.set('start_date', startDate);
      params.set('end_date', endDate);
      params.set('limit', 'all');
      params.set('sort', 'asc');

      const targetTeacherCode = selectedTeacher || (isKurikulum ? '' : (user?.code || user?.id || ''));
      if (targetTeacherCode) {
        params.set('teacher_code', targetTeacherCode);
      }
      if (selectedKelas !== 'all') {
        params.set('kelas', selectedKelas);
      }

      const res = await fetch(`/api/jurnal/harian?${params}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      const json = await res.json();
      let records = json.data || [];
      if (selectedMapel !== 'all') {
        records = records.filter(j => j.mapel === selectedMapel);
      }

      if (records.length === 0) {
        setExportError(`Tidak ditemukan rekaman jurnal untuk Semester ${selectedSemester} (${selectedTahunAjaran}).`);
        setIsExporting(false);
        return;
      }

      const data = records.map(j => {
        const st = getJurnalSubmissionStatus(j.tanggal, j.submitted_at);
        return {
          Tanggal: j.tanggal,
          Guru: j.teacher_name || j.teacher_code,
          Kelas: j.kelas,
          'Mata Pelajaran': j.mapel,
          'Jam Ke': j.jam_ke,
          'Materi Pokok': j.materi_pokok || '',
          'Kegiatan Pembelajaran': j.kegiatan_pembelajaran || '',
          Metode: j.metode_pembelajaran || '',
          'Siswa Hadir': j.jumlah_hadir || 0,
          Catatan: j.catatan || '',
          'Status Pengisian': st.label,
          'Jam & Waktu Submit': st.fullSubmitStr || '-',
          'Keterlambatan': st.isLate ? `Terlambat ${st.diffDays} Hari (H+${st.diffDays})` : (j.submitted_at ? 'Tepat Waktu' : 'Belum Diisi')
        };
      });

      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet(`Jurnal_Sem_${selectedSemester}`);
      if (data.length > 0) {
        const keys = Object.keys(data[0]);
        ws.addRow(keys);
        data.forEach(item => ws.addRow(keys.map(k => item[k])));
      }
      wb.xlsx.writeBuffer().then(buf => {
        saveAs(new Blob([buf]), `Rekap_Jurnal_Semester_${selectedSemester}_${selectedTahunAjaran.replace('/', '_')}.xlsx`);
      });
      onClose();
    } catch (err) {
      console.error('Excel Export Error:', err);
      setExportError(err.message || 'Terjadi kesalahan saat membuat file Excel.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Cetak &amp; Rekap Jurnal KBM (PDF)" maxWidth="max-w-xl">
      <div className="space-y-4">
        {/* Banner Info */}
        <div className="p-3 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50/40 to-slate-50 border border-emerald-200/80 shadow-2xs flex items-start gap-2.5">
          <FileText size={18} className="text-emerald-700 shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="text-xs font-black text-slate-800">
              Rekapitulasi Jurnal Pembelajaran Per Semester
            </p>
            <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
              Format dokumen resmi lengkap dengan Kop Surat Sekolah, identitas guru pengampu, rincian materi &amp; kehadiran, status keterlambatan, serta lembar pengesahan tanda tangan.
            </p>
          </div>
        </div>

        {/* Filter Controls Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Semester Selector */}
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-600 uppercase tracking-wider">
              Pilihan Semester <span className="text-rose-500">*</span>
            </label>
            <CustomSelect
              options={[
                { value: 'Ganjil', label: 'Semester Ganjil (Juli - Desember)' },
                { value: 'Genap', label: 'Semester Genap (Januari - Juni)' },
                { value: 'Penuh', label: 'Tahun Penuh (1 Tahun Ajaran)' }
              ]}
              value={selectedSemester}
              onChange={setSelectedSemester}
              className="w-full text-xs font-bold"
            />
          </div>

          {/* Tahun Ajaran */}
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-600 uppercase tracking-wider">
              Tahun Ajaran <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={selectedTahunAjaran}
              onChange={e => setSelectedTahunAjaran(e.target.value)}
              placeholder="Contoh: 2026/2027"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-[var(--ui-radius-control)] text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-[var(--ui-primary)]"
            />
          </div>

          {/* Filter Guru (If Kurikulum / Admin) */}
          {isKurikulum && (
            <div className="space-y-1 sm:col-span-2">
              <label className="text-[10px] font-black text-slate-600 uppercase tracking-wider">
                Guru Pengampu
              </label>
              <CustomSelect
                options={teacherOptions}
                value={selectedTeacher}
                onChange={setSelectedTeacher}
                placeholder="Semua Guru"
                className="w-full text-xs font-bold"
              />
            </div>
          )}

          {/* Filter Kelas */}
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-600 uppercase tracking-wider">
              Kelas / Rombel (Opsional)
            </label>
            <CustomSelect
              options={classOptions}
              value={selectedKelas}
              onChange={setSelectedKelas}
              className="w-full text-xs font-bold"
            />
          </div>

          {/* Filter Mapel */}
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-600 uppercase tracking-wider">
              Mata Pelajaran (Opsional)
            </label>
            <CustomSelect
              options={subjectOptions}
              value={selectedMapel}
              onChange={setSelectedMapel}
              className="w-full text-xs font-bold"
            />
          </div>
        </div>

        {/* Pengesahan Preview Card */}
        <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 text-[11px] text-slate-600 space-y-1">
          <p className="font-extrabold text-slate-800 flex items-center gap-1.5">
            <CheckCircle2 size={13} className="text-emerald-600" />
            Pengesahan Otomatis Dokumen:
          </p>
          <p className="pl-4">
            • <b>Kepala Sekolah:</b> {schoolProfile?.kepala_sekolah || appSettings?.namaKepalaSekolah || 'Kepala Sekolah'} (NIP: {schoolProfile?.nip_kepala_sekolah || appSettings?.nipKepalaSekolah || '-'})
          </p>
          <p className="pl-4">
            • <b>Guru Pengampu:</b> {selectedTeacher ? (teachers.find(t => t.code === selectedTeacher)?.name || selectedTeacher) : (user?.name || user?.code || 'Guru')}
          </p>
        </div>

        {/* Error notice */}
        {exportError && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-2 text-rose-700 text-xs font-bold">
            <AlertCircle size={15} className="shrink-0 mt-0.5 text-rose-600" />
            <span>{exportError}</span>
          </div>
        )}

        {/* Footer Actions */}
        <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2">
          <Button variant="outline" type="button" onClick={onClose} disabled={isExporting} className="w-full sm:w-auto rounded-2xl px-4 py-2 text-xs font-bold cursor-pointer">
            Batal
          </Button>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleExportExcelSemester}
              disabled={isExporting}
              className="w-full sm:w-auto px-3.5 py-2 rounded-2xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 cursor-pointer flex items-center justify-center gap-1.5"
              title="Download format Spreadsheet Excel"
            >
              <Download size={13} />
              <span>Excel</span>
            </button>

            <Button
              type="button"
              onClick={handleExportPDF}
              disabled={isExporting}
              className="w-full sm:w-auto rounded-2xl px-5 py-2 text-xs font-extrabold bg-[var(--ui-primary)] hover:bg-[var(--ui-primary-hover,#047857)] text-white shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
            >
              {isExporting ? (
                <>
                  <RefreshCw size={13} className="animate-spin" />
                  <span>Membuat PDF...</span>
                </>
              ) : (
                <>
                  <FileText size={14} />
                  <span>Download PDF Semester</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

// Modal Form Isi Jurnal - Modern, Super Padat, Cepat, Intuitif & Auto-Synced
function JurnalModal({ jurnal, onSave, onClose, students = [], studentAttendance = [] }) {
  const className = jurnal?.kelas || '';
  const user = useAuthStore(state => state.user);
  const authToken = user?.authToken;

  // Normalized Class Name Matcher
  const normalizeText = (txt) => (txt || '').replace(/[\s\-_.]/g, '').toLowerCase();

  // Local fallback students from store
  const localClassStudents = useMemo(() => {
    const target = normalizeText(className);
    return students.filter(s => {
      const sClass = normalizeText(s.class_name || s.kelas || s.rombel || '');
      return sClass === target || sClass.includes(target) || target.includes(sClass);
    });
  }, [students, className]);

  // Live Attendance State from Database & Interactive Roll Call
  const [liveStudents, setLiveStudents] = useState(() => {
    if (jurnal?.rincian_absensi && Array.isArray(jurnal.rincian_absensi) && jurnal.rincian_absensi.length > 0) {
      return jurnal.rincian_absensi;
    }
    const target = normalizeText(className);
    const matched = students.filter(s => {
      const sClass = normalizeText(s.class_name || s.kelas || s.rombel || '');
      return sClass === target || sClass.includes(target) || target.includes(sClass);
    });
    if (matched.length > 0) {
      return matched.map(s => {
        const nis = String(s.nis || s.code || s.id || '').trim();
        const att = studentAttendance.find(a => {
          const isSameDate = a.tanggal === (jurnal?.tanggal || new Date().toISOString().split('T')[0]);
          return isSameDate && String(a.siswa_nis).trim() === nis && a.approval_status !== 'rejected';
        });
        return {
          nis,
          name: s.namaSiswa || s.name || s.nama || nis,
          class_name: s.class_name || s.kelas || className,
          status: att ? att.status : 'Hadir',
          keterangan: att?.keterangan || ''
        };
      });
    }
    return [];
  });

  const [isLoadingAttendance, setIsLoadingAttendance] = useState(false);
  const [searchRollCall, setSearchRollCall] = useState('');
  const [filterRollCall, setFilterRollCall] = useState('all'); // 'all' | 'hadir' | 'terlambat' | 'sakit' | 'izin' | 'alpa'

  const [form, setForm] = useState({
    id: jurnal?.id || null,
    kelas: jurnal?.kelas || '',
    mapel: jurnal?.mapel || '',
    jam_ke: jurnal?.jam_ke || 1,
    slot_label: jurnal?.slot_label || '',
    materi_pokok: jurnal?.materi_pokok || '',
    kegiatan_pembelajaran: jurnal?.kegiatan_pembelajaran || '',
    metode_pembelajaran: jurnal?.metode_pembelajaran || 'Ceramah & Diskusi',
    catatan: jurnal?.catatan || '',
    jumlah_hadir: jurnal?.jumlah_hadir || 0,
    rincian_absensi: jurnal?.rincian_absensi || [],
    laporan_bk: [], // Siswa yang dilapor ke BK {nis, name, kasus}
    teacher_name: jurnal?.teacher_name || user?.name || '',
    teacher_code: jurnal?.teacher_code || '',
    tanggal: jurnal?.tanggal || new Date().toISOString().split('T')[0],
    status: 'submitted',
  });
  
  const [mobileTab, setMobileTab] = useState('materi');
  const [laporSiswaNis, setLaporSiswaNis] = useState('');
  const [laporSiswaKasus, setLaporSiswaKasus] = useState('');

  // DRAFT LOGIC - Muat Draf Saat Inisialisasi
  useEffect(() => {
    if (!jurnal?.id) {
      try {
        const draftKey = `draft_jurnal_${user?.code || 'guest'}`;
        const savedDraft = localStorage.getItem(draftKey);
        if (savedDraft) {
          const parsed = JSON.parse(savedDraft);
          setForm(prev => ({ ...prev, ...parsed, id: prev.id, kelas: prev.kelas || parsed.kelas }));
        }
      } catch (e) {
        console.error("Gagal membaca draf jurnal:", e);
      }
    }
  }, [jurnal?.id, user?.code]);

  // DRAFT LOGIC - Simpan Draf Otomatis Saat Ketik
  useEffect(() => {
    if (!jurnal?.id) {
      const draftKey = `draft_jurnal_${user?.code || 'guest'}`;
      const draftData = {
        mapel: form.mapel,
        materi_pokok: form.materi_pokok,
        kegiatan_pembelajaran: form.kegiatan_pembelajaran,
        metode_pembelajaran: form.metode_pembelajaran,
        catatan: form.catatan,
      };
      localStorage.setItem(draftKey, JSON.stringify(draftData));
    }
  }, [form, jurnal?.id, user?.code]);

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Late Calculation for Form Modal
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const isFillingPastDate = form.tanggal && form.tanggal < todayStr;
  const diffDaysFromToday = useMemo(() => {
    if (!isFillingPastDate) return 0;
    const dKbm = new Date(form.tanggal);
    const dNow = new Date(todayStr);
    return Math.max(1, Math.round((dNow - dKbm) / (1000 * 60 * 60 * 24)));
  }, [form.tanggal, todayStr, isFillingPastDate]);
  const existingStatusInfo = useMemo(() => getJurnalSubmissionStatus(form.tanggal, jurnal?.submitted_at), [form.tanggal, jurnal?.submitted_at]);

  // Fetch Live Attendance from /api/kedisiplinan/absensi-kelas
  const fetchLiveAttendance = useCallback(async (forceRefresh = false) => {
    if (!className) return;
    if (!forceRefresh && jurnal?.rincian_absensi && Array.isArray(jurnal.rincian_absensi) && jurnal.rincian_absensi.length > 0) {
      setIsLoadingAttendance(false);
      return;
    }

    setIsLoadingAttendance(true);
    try {
      if (authToken) {
        const res = await fetch(`/api/kedisiplinan/absensi-kelas?kelas=${encodeURIComponent(className)}&tanggal=${form.tanggal}`, {
          headers: { "Authorization": `Bearer ${authToken}` }
        });
        const json = await res.json();
        if (json.ok && Array.isArray(json.data) && json.data.length > 0) {
          setLiveStudents(json.data);
          const hCount = json.data.filter(s => ['hadir', 'terlambat'].includes((s.status || 'Hadir').toLowerCase())).length;
          setForm(f => ({ ...f, jumlah_hadir: hCount, rincian_absensi: json.data }));
          setIsLoadingAttendance(false);
          return;
        }
      }
    } catch (e) {
      console.warn("Failed fetching live attendance, using local fallback", e);
    }

    // Fallback if API returns empty or fails
    if (localClassStudents.length > 0) {
      const mapped = localClassStudents.map(s => {
        const nis = String(s.nis || s.code || s.id || '').trim();
        const att = studentAttendance.find(a => {
          const isSameDate = a.tanggal === form.tanggal || a.tanggal?.startsWith(form.tanggal);
          return isSameDate && String(a.siswa_nis).trim() === nis && a.approval_status !== 'rejected';
        });
        return {
          nis,
          name: s.namaSiswa || s.name || s.nama || nis,
          class_name: s.class_name || s.kelas || className,
          status: att ? att.status : 'Hadir',
          keterangan: att?.keterangan || ''
        };
      });
      setLiveStudents(mapped);
      const hCount = mapped.filter(s => ['hadir', 'terlambat'].includes((s.status || 'Hadir').toLowerCase())).length;
      setForm(f => ({ ...f, jumlah_hadir: hCount, rincian_absensi: mapped }));
    }
    setIsLoadingAttendance(false);
  }, [className, form.tanggal, authToken, localClassStudents, studentAttendance, jurnal?.rincian_absensi]);

  useEffect(() => {
    fetchLiveAttendance();
  }, [fetchLiveAttendance]);

  // Derived Attendance Stats
  const totalStudentsCount = liveStudents.length > 0 ? liveStudents.length : localClassStudents.length;

  const hadirCount = useMemo(() => liveStudents.filter(s => (s.status || 'Hadir').toLowerCase() === 'hadir').length, [liveStudents]);
  const telatCount = useMemo(() => liveStudents.filter(s => (s.status || '').toLowerCase() === 'terlambat').length, [liveStudents]);
  const sakitCount = useMemo(() => liveStudents.filter(s => (s.status || '').toLowerCase() === 'sakit').length, [liveStudents]);
  const izinCount = useMemo(() => liveStudents.filter(s => ['izin', 'dispen', 'dispensasi'].includes((s.status || '').toLowerCase())).length, [liveStudents]);
  const alpaCount = useMemo(() => liveStudents.filter(s => ['alpa', 'alpha'].includes((s.status || '').toLowerCase())).length, [liveStudents]);

  // Total Hadir di kelas mencakup Siswa Hadir Tepat Waktu + Siswa Terlambat
  const totalCalculatedHadir = hadirCount + telatCount;

  // Auto synchronize jumlah_hadir if 0 or when live attendance updates
  useEffect(() => {
    if (totalCalculatedHadir > 0 && form.jumlah_hadir === 0) {
      setForm(f => ({ ...f, jumlah_hadir: totalCalculatedHadir }));
    }
  }, [totalCalculatedHadir, form.jumlah_hadir]);

  // Filtered Students for Roll Call
  const filteredRollCallStudents = useMemo(() => {
    return liveStudents.filter(s => {
      const st = (s.status || 'Hadir').toLowerCase();
      if (filterRollCall === 'hadir' && st !== 'hadir') return false;
      if (filterRollCall === 'terlambat' && st !== 'terlambat') return false;
      if (filterRollCall === 'sakit' && st !== 'sakit') return false;
      if (filterRollCall === 'izin' && !['izin', 'dispen', 'dispensasi'].includes(st)) return false;
      if (filterRollCall === 'alpa' && !['alpa', 'alpha'].includes(st)) return false;

      if (searchRollCall) {
        const q = searchRollCall.toLowerCase();
        const name = (s.name || '').toLowerCase();
        const nis = (s.nis || '').toLowerCase();
        return name.includes(q) || nis.includes(q);
      }
      return true;
    });
  }, [liveStudents, filterRollCall, searchRollCall]);

  // Update Individual Student Status (Absen Ulang Mapel)
  const handleUpdateStudentStatus = (nis, newStatus) => {
    setLiveStudents(prev => {
      const updated = prev.map(s => {
        if (s.nis === nis) {
          return { ...s, status: newStatus };
        }
        return s;
      });
      const hCount = updated.filter(s => ['hadir', 'terlambat'].includes((s.status || 'Hadir').toLowerCase())).length;
      setForm(f => ({ ...f, jumlah_hadir: hCount, rincian_absensi: updated }));
      return updated;
    });
  };

  // Update Individual Student Note
  const handleUpdateStudentKeterangan = (nis, keterangan) => {
    setLiveStudents(prev => {
      const updated = prev.map(s => {
        if (s.nis === nis) {
          return { ...s, keterangan };
        }
        return s;
      });
      setForm(f => ({ ...f, rincian_absensi: updated }));
      return updated;
    });
  };

  // Quick Preset Handlers
  const handleSetSemuaHadir = () => {
    setLiveStudents(prev => {
      const updated = prev.map(s => ({ ...s, status: 'Hadir', keterangan: '' }));
      setForm(f => ({ ...f, rincian_absensi: updated, jumlah_hadir: updated.length }));
      return updated;
    });
  };

  // Add Lapor BK
  const handleAddLaporBk = () => {
    if (!laporSiswaNis || !laporSiswaKasus.trim()) return;
    const student = liveStudents.find(s => s.nis === laporSiswaNis);
    if (!student) return;
    
    // Cek duplikasi
    if (form.laporan_bk.find(l => l.nis === laporSiswaNis)) {
      return;
    }

    setForm(f => ({
      ...f,
      laporan_bk: [...f.laporan_bk, { nis: student.nis, name: student.name, kasus: laporSiswaKasus.trim(), class_name: student.class_name }]
    }));
    setLaporSiswaNis('');
    setLaporSiswaKasus('');
  };

  const handleRemoveLaporBk = (nis) => {
    setForm(f => ({
      ...f,
      laporan_bk: f.laporan_bk.filter(l => l.nis !== nis)
    }));
  };

  const handleSetSinkronAbsensi = () => {
    fetchLiveAttendance(true);
  };
  const handleStepHadir = (delta) => {
    setForm(f => {
      const maxVal = totalStudentsCount || 100;
      const nextVal = Math.max(0, Math.min(maxVal, (f.jumlah_hadir || 0) + delta));
      return { ...f, jumlah_hadir: nextVal };
    });
  };

  // Quick Lesson Plan Templates
  const handleApplyKegiatanTemplate = (templateType) => {
    const mapelName = form.mapel || 'Mata Pelajaran';
    const materiName = form.materi_pokok || 'materi pokok';

    if (templateType === 'lengkap') {
      setForm(f => ({
        ...f,
        kegiatan_pembelajaran: `1. Pendahuluan: Berdoa, memeriksa presensi siswa, dan apersepsi materi ${mapelName}.\n2. Kegiatan Inti: Guru menjelaskan materi ${materiName}, siswa menyimak, berdiskusi aktif, dan mengerjakan latihan/tugas terbimbing.\n3. Penutup: Refleksi pembelajaran, sesi tanya jawab, evaluasi singkat, dan penugasan mandiri.`
      }));
    } else if (templateType === 'praktik') {
      setForm(f => ({
        ...f,
        kegiatan_pembelajaran: `1. Persiapan: Pengarahan K3 dan pembagian perangkat/komputer praktikum ${materiName}.\n2. Praktik Langsung: Siswa mempraktikkan jobsheet secara mandiri/kelompok dengan bimbingan guru dan troubleshooting aktif.\n3. Evaluasi: Pengujian output hasil praktikum dan perapihan kembali alat/ruang lab.`
      }));
    } else if (templateType === 'diskusi') {
      setForm(f => ({
        ...f,
        kegiatan_pembelajaran: `1. Pembentukan Kelompok: Pembagian studi kasus terkait ${materiName} ke dalam kelompok kerja.\n2. Diskusi & Pemecahan Masalah: Setiap kelompok mendiskusikan solusi dan menyusun bahan paparan.\n3. Presentasi & Penguatan: Presentasi perwakilan kelompok, tanggapan rekan, dan penguatan konsep oleh guru.`
      }));
    }
  };

  // Quick Note Templates
  const handleAddCatatan = (noteText) => {
    setForm(f => ({
      ...f,
      catatan: f.catatan ? `${f.catatan}. ${noteText}` : noteText
    }));
  };

  const [step, setStep] = useState(1);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    if (!form.materi_pokok || !form.kegiatan_pembelajaran) {
      setErrorMsg('Materi pokok dan kegiatan pembelajaran wajib diisi!');
      setStep(2);
      return;
    }
    setSaving(true);
    const result = await onSave(form);
    if (result?.error) {
      setErrorMsg(result.error);
    } else {
      if (!jurnal?.id) {
        localStorage.removeItem(`draft_jurnal_${user?.code || 'guest'}`);
      }
    }
    setSaving(false);
  };

  // Common quick method options
  const QUICK_METHODS = [
    'Ceramah & Diskusi',
    'Demonstrasi & Praktik',
    'Project Based Learning',
    'Problem Based Learning',
    'Cooperative Learning',
    'Discovery Learning'
  ];

  return (
    <Modal isOpen={true} onClose={onClose} title={form.id ? 'Edit Jurnal Pembelajaran' : 'Isi Jurnal Harian'} maxWidth="max-w-6xl" scrollable={false}>
      <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 relative">
        
        {/* TOP COMPACT UNIFIED HERO CARD */}
        <div className="shrink-0 p-3 bg-gradient-to-r from-emerald-50 via-teal-50/40 to-slate-50 border-b border-emerald-200/80 shadow-xs space-y-1.5">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="px-2.5 py-1 rounded-[var(--ui-radius-small)] bg-emerald-700 text-white text-xs font-black tracking-wide shrink-0 shadow-2xs">
                {form.kelas}
              </span>
              <span className="text-xs font-black text-slate-800 truncate" title={form.mapel}>
                {form.mapel}
              </span>
            </div>
            <span className="text-[11px] font-extrabold px-2.5 py-1 rounded-[var(--ui-radius-small)] bg-white border border-emerald-200 text-emerald-800 shrink-0 shadow-2xs">
              {form.slot_label || `Jam ke-${form.jam_ke}`}
            </span>
          </div>

          <div className="flex items-center justify-between gap-2 text-[11px] font-bold text-slate-600 pt-1 border-t border-emerald-100 flex-wrap">
            <div className="flex items-center gap-1.5">
              <Calendar size={13} className="text-emerald-600 shrink-0" />
              <span>{new Date(form.tanggal).toLocaleDateString('id-ID', { weekday:'long', day:'numeric', month:'short', year:'numeric' })}</span>
            </div>
            
            {/* Status Pengisian */}
            {jurnal?.submitted_at ? (
              existingStatusInfo.isLate ? (
                <span className="text-[10px] font-black px-2 py-0.5 rounded-[var(--ui-radius-control)] bg-rose-100 text-rose-800 border border-rose-200 flex items-center gap-1">
                  <Clock size={11} className="text-rose-600 shrink-0" />
                  <span>Terlambat H+{existingStatusInfo.diffDays} ({existingStatusInfo.timeStr})</span>
                </span>
              ) : (
                <span className="text-[10px] font-black px-2 py-0.5 rounded-[var(--ui-radius-control)] bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                  <CheckCircle2 size={11} className="text-emerald-600 shrink-0" />
                  <span>Tepat Waktu ({existingStatusInfo.timeStr})</span>
                </span>
              )
            ) : isFillingPastDate ? (
              <span className="text-[10px] font-black px-2 py-0.5 rounded-[var(--ui-radius-control)] bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                <Clock size={11} className="text-amber-700 shrink-0" />
                <span>Terlambat H+{diffDaysFromToday}</span>
              </span>
            ) : (
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-[var(--ui-radius-control)] bg-slate-100 text-slate-600 border border-slate-200">
                Belum Disimpan
              </span>
            )}
          </div>
        </div>

        {/* MOBILE TABS (Hidden on Desktop) */}
        <div className="lg:hidden shrink-0 flex items-center bg-slate-100 p-1 rounded-2xl mx-3 mt-3 border border-slate-200">
          <button 
            type="button"
            onClick={() => setMobileTab('materi')} 
            className={`flex-1 py-2 text-xs font-bold rounded-[var(--ui-radius-control)] transition-all flex items-center justify-center gap-1.5 ${mobileTab === 'materi' ? 'bg-white shadow-sm text-[var(--ui-primary)]' : 'text-slate-600 hover:text-slate-900'}`}
          >
            <BookOpen size={14} /> 1. Materi KBM
          </button>
          <button 
            type="button"
            onClick={() => setMobileTab('presensi')} 
            className={`flex-1 py-2 text-xs font-bold rounded-[var(--ui-radius-control)] transition-all flex items-center justify-center gap-1.5 ${mobileTab === 'presensi' ? 'bg-white shadow-sm text-[var(--ui-primary)]' : 'text-slate-600 hover:text-slate-900'}`}
          >
            <Users size={14} /> 2. Presensi
          </button>
        </div>

        {/* MAIN 2-COLUMN CONTENT */}
        <div className="flex-1 min-h-0 overflow-y-auto lg:overflow-hidden bg-slate-50 mt-3 lg:mt-0">
          <div className="flex flex-col lg:flex-row h-full min-h-0">
            
            {/* COLUMN 1: MATERI & KBM (Left, 40%) */}
            <div className={`w-full lg:w-[40%] flex-col gap-3.5 p-4 overflow-y-auto custom-scrollbar border-b lg:border-b-0 lg:border-r border-slate-200 bg-white min-h-0 ${mobileTab === 'materi' ? 'flex' : 'hidden lg:flex'}`}>
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2 border-b border-slate-100 pb-2">
                <BookOpen size={14} className="text-[var(--ui-primary)]" />
                Materi & KBM
              </h3>
              
              {errorMsg && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-2 text-rose-700 text-xs font-bold">
                  <AlertCircle size={15} className="shrink-0 mt-0.5 text-rose-600" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* 1. MATERI POKOK */}
              <div className="space-y-1.5 bg-emerald-50/40 p-3 rounded-2xl border border-emerald-200/90 shadow-2xs">
                <label className="flex items-center justify-between text-xs font-black text-slate-800">
                  <span className="flex items-center gap-1.5">
                    <Award size={14} className="text-emerald-700" />
                    Materi Pokok
                  </span>
                  <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-emerald-600 text-white uppercase tracking-wider">
                    Wajib *
                  </span>
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Konfigurasi Routing Dinamis BGP"
                  value={form.materi_pokok}
                  onChange={e => setForm({ ...form, materi_pokok: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-[var(--ui-radius-control)] text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 shadow-2xs"
                  required
                />
              </div>

              {/* 2. KEGIATAN PEMBELAJARAN */}
              <div className="space-y-1.5 bg-slate-50/70 p-3 rounded-2xl border border-slate-200/90 shadow-2xs">
                <div className="flex items-center justify-between flex-wrap gap-1">
                  <label className="flex items-center gap-1.5 text-xs font-black text-slate-800">
                    <FileText size={14} className="text-[var(--ui-primary)]" />
                    Kegiatan Pembelajaran <span className="text-rose-500">*</span>
                  </label>
                </div>
                <div className="flex items-center gap-1 flex-wrap mb-1">
                  <button type="button" onClick={() => handleApplyKegiatanTemplate('lengkap')} className="text-[9px] font-extrabold px-2 py-1 rounded bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-200 transition-all shadow-2xs cursor-pointer">+ Lengkap</button>
                  <button type="button" onClick={() => handleApplyKegiatanTemplate('praktik')} className="text-[9px] font-extrabold px-2 py-1 rounded bg-white hover:bg-indigo-50 text-indigo-800 border border-indigo-200 transition-all shadow-2xs cursor-pointer">+ Praktik</button>
                  <button type="button" onClick={() => handleApplyKegiatanTemplate('diskusi')} className="text-[9px] font-extrabold px-2 py-1 rounded bg-white hover:bg-indigo-50 text-indigo-800 border border-indigo-200 transition-all shadow-2xs cursor-pointer">+ Diskusi</button>
                </div>
                <textarea
                  rows={4}
                  placeholder="Tuliskan ringkasan kegiatan KBM di kelas..."
                  value={form.kegiatan_pembelajaran}
                  onChange={e => setForm({ ...form, kegiatan_pembelajaran: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-[var(--ui-radius-control)] text-xs font-medium text-slate-900 focus:outline-none focus:ring-1 focus:ring-[var(--ui-primary)] resize-none leading-relaxed"
                  required
                />
              </div>

              {/* 3. METODE & CATATAN */}
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-600 uppercase tracking-wider flex items-center gap-1">
                    <ClipboardList size={12} className="text-[var(--ui-primary)]" /> Metode Pembelajaran
                  </label>
                  <CustomSelect
                    options={METODE_OPTIONS.map(m => ({ value: m, label: m }))}
                    value={form.metode_pembelajaran}
                    onChange={val => setForm({ ...form, metode_pembelajaran: val })}
                    className="w-full text-xs font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black text-slate-600 uppercase tracking-wider flex items-center gap-1">
                      <MessageSquare size={12} className="text-[var(--ui-primary)]" /> Catatan Umum KBM
                    </label>
                    <button type="button" onClick={() => handleAddCatatan('KBM berjalan tertib & kondusif')} className="text-[9px] font-bold text-emerald-700 hover:underline cursor-pointer">+ Tertib</button>
                  </div>
                  <input
                    type="text"
                    placeholder="Opsional: KBM berjalan kondusif..."
                    value={form.catatan}
                    onChange={e => setForm({ ...form, catatan: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-[var(--ui-radius-control)] text-xs font-medium text-slate-900 focus:outline-none focus:ring-1 focus:ring-[var(--ui-primary)]"
                  />
                </div>

                {/* 4. LAPOR SISWA BERMASALAH (BP/BK) */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <label className="text-[10px] font-black text-rose-600 uppercase tracking-wider flex items-center gap-1">
                    <ShieldAlert size={12} className="text-rose-600" /> Lapor Siswa / Catatan Kasus
                  </label>
                  
                  <div className="p-2.5 bg-rose-50/50 border border-rose-200 rounded-2xl space-y-2 shadow-2xs">
                    <CustomSelect
                      value={laporSiswaNis}
                      onChange={(val) => setLaporSiswaNis(val)}
                      options={liveStudents.map(s => ({ value: s.nis, label: `${s.name} (${s.nis})`, searchText: `${s.name} ${s.nis}` }))}
                      placeholder="-- Pilih Siswa Bermasalah --"
                      className="w-full text-xs font-semibold"
                    />
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Tulis masalah (misal: Main HP saat jam KBM)..."
                        value={laporSiswaKasus}
                        onChange={(e) => setLaporSiswaKasus(e.target.value)}
                        onKeyDown={(e) => { if(e.key === 'Enter') { e.preventDefault(); handleAddLaporBk(); } }}
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-rose-200 rounded-[var(--ui-radius-control)] text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-rose-500 shadow-2xs"
                      />
                      <button
                        type="button"
                        onClick={handleAddLaporBk}
                        disabled={!laporSiswaNis || !laporSiswaKasus.trim()}
                        className="h-8 px-3 rounded-[var(--ui-radius-control)] bg-rose-600 hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-black shadow-xs transition-colors cursor-pointer flex items-center justify-center shrink-0"
                      >
                        <Plus size={14} />
                      </button>
                    </div>

                    {form.laporan_bk && form.laporan_bk.length > 0 && (
                      <div className="pt-2 mt-2 border-t border-rose-200/60 space-y-1.5">
                        <div className="text-[10px] font-black text-rose-700">Daftar Laporan (Akan diteruskan ke BK):</div>
                        {form.laporan_bk.map((l, i) => (
                          <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2 bg-white rounded border border-rose-100 shadow-2xs">
                            <div className="min-w-0">
                              <div className="text-[10px] font-black text-slate-800 truncate">{l.name}</div>
                              <div className="text-[10px] font-medium text-rose-700 truncate">{l.kasus}</div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveLaporBk(l.nis)}
                              className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50 transition-colors shrink-0"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* COLUMN 2: PRESENSI & BK (Right, 60%) */}
            <div className={`w-full lg:w-[60%] flex-col h-full min-h-0 bg-slate-50/50 ${mobileTab === 'presensi' ? 'flex' : 'hidden lg:flex'}`}>
              {/* Header Kolom 2 */}
              <div className="p-3 border-b border-slate-200 bg-white flex flex-col gap-2 shrink-0">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                    <Users size={14} className="text-[var(--ui-primary)]" />
                    Presensi & Lapor Siswa
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-[var(--ui-radius-small)] border border-emerald-200 shadow-2xs">Hadir: {form.jumlah_hadir}/{totalStudentsCount}</span>
                  </div>
                </div>

                {/* 5 Quick KPI Attendance Filter Pills */}
                <div className="grid grid-cols-5 gap-1.5 mt-1">
                  <button type="button" onClick={() => setFilterRollCall(filterRollCall === 'hadir' ? 'all' : 'hadir')} className={`flex flex-col items-center justify-center py-1 rounded-[var(--ui-radius-control)] border text-center cursor-pointer transition-all shadow-2xs ${filterRollCall === 'hadir' ? 'bg-emerald-100 border-emerald-400 ring-2 ring-emerald-400/20' : 'bg-white border-emerald-200 hover:bg-emerald-50'}`}>
                    <span className="text-[9px] font-black uppercase text-emerald-700">Hadir</span>
                    <span className="text-xs font-black text-emerald-900">{hadirCount}</span>
                  </button>
                  <button type="button" onClick={() => setFilterRollCall(filterRollCall === 'terlambat' ? 'all' : 'terlambat')} className={`flex flex-col items-center justify-center py-1 rounded-[var(--ui-radius-control)] border text-center cursor-pointer transition-all shadow-2xs ${filterRollCall === 'terlambat' ? 'bg-yellow-100 border-yellow-400 ring-2 ring-yellow-400/20' : 'bg-white border-yellow-200 hover:bg-yellow-50'}`}>
                    <span className="text-[9px] font-black uppercase text-yellow-700">Telat</span>
                    <span className="text-xs font-black text-yellow-900">{telatCount}</span>
                  </button>
                  <button type="button" onClick={() => setFilterRollCall(filterRollCall === 'sakit' ? 'all' : 'sakit')} className={`flex flex-col items-center justify-center py-1 rounded-[var(--ui-radius-control)] border text-center cursor-pointer transition-all shadow-2xs ${filterRollCall === 'sakit' ? 'bg-amber-100 border-amber-400 ring-2 ring-amber-400/20' : 'bg-white border-amber-200 hover:bg-amber-50'}`}>
                    <span className="text-[9px] font-black uppercase text-amber-700">Sakit</span>
                    <span className="text-xs font-black text-amber-900">{sakitCount}</span>
                  </button>
                  <button type="button" onClick={() => setFilterRollCall(filterRollCall === 'izin' ? 'all' : 'izin')} className={`flex flex-col items-center justify-center py-1 rounded-[var(--ui-radius-control)] border text-center cursor-pointer transition-all shadow-2xs ${filterRollCall === 'izin' ? 'bg-indigo-100 border-indigo-400 ring-2 ring-indigo-400/20' : 'bg-white border-indigo-200 hover:bg-indigo-50'}`}>
                    <span className="text-[9px] font-black uppercase text-indigo-700">Izin</span>
                    <span className="text-xs font-black text-indigo-900">{izinCount}</span>
                  </button>
                  <button type="button" onClick={() => setFilterRollCall(filterRollCall === 'alpa' ? 'all' : 'alpa')} className={`flex flex-col items-center justify-center py-1 rounded-[var(--ui-radius-control)] border text-center cursor-pointer transition-all shadow-2xs ${filterRollCall === 'alpa' ? 'bg-rose-100 border-rose-400 ring-2 ring-rose-400/20' : 'bg-white border-rose-200 hover:bg-rose-50'}`}>
                    <span className="text-[9px] font-black uppercase text-rose-700">Alpa</span>
                    <span className="text-xs font-black text-rose-900">{alpaCount}</span>
                  </button>
                </div>
                
                {/* Tools Panel */}
                <div className="flex items-center justify-between gap-2 mt-1">
                  <div className="relative flex-1 min-w-0">
                    <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="text" placeholder="Cari nama/NIS..." value={searchRollCall} onChange={e => setSearchRollCall(e.target.value)} className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-[var(--ui-radius-control)] font-medium focus:outline-none focus:ring-1 focus:ring-[var(--ui-primary)]" />
                  </div>
                  <button type="button" onClick={handleSetSemuaHadir} className="text-[10px] font-extrabold px-3 py-1.5 rounded-[var(--ui-radius-control)] bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 cursor-pointer transition-all active:scale-95 flex items-center gap-1 shadow-2xs shrink-0">
                    <CheckCheck size={13} />
                    <span className="hidden sm:inline">Set Semua Hadir</span>
                    <span className="sm:hidden">Hadir Semua</span>
                  </button>
                  <button type="button" onClick={handleSetSinkronAbsensi} disabled={isLoadingAttendance} className="p-1.5 text-slate-400 hover:text-[var(--ui-primary)] rounded-[var(--ui-radius-small)] hover:bg-[var(--ui-primary)]/10 transition-colors cursor-pointer border border-transparent hover:border-[var(--ui-primary)]/20 shrink-0" title="Sinkron ulang">
                    <RefreshCw size={13} className={isLoadingAttendance ? 'animate-spin text-emerald-600' : ''} />
                  </button>
                </div>
              </div>

              {/* List Siswa */}
              <div className="flex-1 overflow-y-auto p-2 space-y-1.5 custom-scrollbar min-h-[300px] lg:min-h-0 bg-slate-100/30">
                {filteredRollCallStudents.length === 0 ? (
                  <div className="py-10 text-center text-xs text-slate-400 font-bold flex flex-col items-center gap-2">
                    <Users size={24} className="text-slate-300" />
                    {liveStudents.length === 0 ? 'Memuat data siswa...' : 'Tidak ada siswa ditemukan.'}
                  </div>
                ) : (
                  filteredRollCallStudents.map((s, idx) => {
                    const currentStatus = s.status || 'Hadir';
                    const isTelat = currentStatus.toLowerCase() === 'terlambat';
                    const isNonHadir = !['hadir', 'terlambat'].includes(currentStatus.toLowerCase());

                    return (
                      <div key={s.nis || idx} className={`p-2 rounded-2xl border transition-all shadow-2xs ${currentStatus === 'Hadir' ? 'bg-white border-slate-200 hover:border-emerald-300' : isTelat ? 'bg-yellow-50/60 border-yellow-300' : currentStatus === 'Sakit' ? 'bg-amber-50/60 border-amber-300' : ['Izin', 'Dispen', 'Dispensasi'].includes(currentStatus) ? 'bg-indigo-50/60 border-indigo-300' : 'bg-rose-50/60 border-rose-300'}`}>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                          
                          {/* Info Siswa */}
                          <div className="min-w-0 flex-1 flex items-center gap-2">
                            <span className="text-[10px] font-mono font-black text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded shrink-0">#{idx + 1}</span>
                            <div className="min-w-0 truncate">
                              <p className="text-xs sm:text-[13px] font-black text-slate-800 truncate" title={s.name}>{s.name}</p>
                              <div className="flex items-center gap-1.5 text-[9px] sm:text-[10px] text-slate-400 font-semibold mt-0.5">
                                <span>{s.nis}</span>
                                {isTelat && s.keterangan && <span className="text-yellow-700 font-bold bg-yellow-100 px-1 rounded truncate">{s.keterangan}</span>}
                              </div>
                            </div>
                          </div>

                          {/* Tombol Absen (Bigger targets) */}
                          <div className="flex items-center gap-1.5 shrink-0 w-full sm:w-auto justify-between sm:justify-start">
                            <button type="button" onClick={() => handleUpdateStudentStatus(s.nis, 'Hadir')} className={`w-7 h-7 flex items-center justify-center rounded-full text-[10px] font-black transition-all cursor-pointer ${currentStatus === 'Hadir' ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-600/30 ring-offset-1' : 'bg-slate-100 text-slate-500 hover:bg-emerald-100 hover:text-emerald-700'}`}>H</button>
                            <button type="button" onClick={() => handleUpdateStudentStatus(s.nis, 'Terlambat')} className={`w-7 h-7 flex items-center justify-center rounded-full text-[10px] font-black transition-all cursor-pointer ${isTelat ? 'bg-yellow-500 text-white shadow-sm ring-2 ring-yellow-500/30 ring-offset-1' : 'bg-slate-100 text-slate-500 hover:bg-yellow-100 hover:text-yellow-700'}`}>T</button>
                            <button type="button" onClick={() => handleUpdateStudentStatus(s.nis, 'Sakit')} className={`w-7 h-7 flex items-center justify-center rounded-full text-[10px] font-black transition-all cursor-pointer ${currentStatus === 'Sakit' ? 'bg-amber-500 text-white shadow-sm ring-2 ring-amber-500/30 ring-offset-1' : 'bg-slate-100 text-slate-500 hover:bg-amber-100 hover:text-amber-700'}`}>S</button>
                            <button type="button" onClick={() => handleUpdateStudentStatus(s.nis, 'Izin')} className={`w-7 h-7 flex items-center justify-center rounded-full text-[10px] font-black transition-all cursor-pointer ${['Izin', 'Dispen', 'Dispensasi'].includes(currentStatus) ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-600/30 ring-offset-1' : 'bg-slate-100 text-slate-500 hover:bg-indigo-100 hover:text-indigo-700'}`}>I</button>
                            <button type="button" onClick={() => handleUpdateStudentStatus(s.nis, 'Alpa')} className={`w-7 h-7 flex items-center justify-center rounded-full text-[10px] font-black transition-all cursor-pointer ${['Alpa', 'Alpha'].includes(currentStatus) ? 'bg-rose-600 text-white shadow-sm ring-2 ring-rose-600/30 ring-offset-1' : 'bg-slate-100 text-slate-500 hover:bg-rose-100 hover:text-rose-700'}`}>A</button>
                          </div>
                        </div>

                        {/* Input Alasan */}
                        {(isNonHadir || (isTelat && !s.keterangan)) && (
                          <div className="mt-2 pt-2 border-t border-slate-200/50 flex flex-col sm:flex-row sm:items-center gap-2">
                            <span className="text-[10px] font-black shrink-0 flex items-center gap-1 text-slate-500">
                              Alasan:
                            </span>
                            <input
                              type="text"
                              placeholder={`Keterangan ${currentStatus} (contoh: izin UKS)...`}
                              value={s.keterangan || ''}
                              onChange={e => handleUpdateStudentKeterangan(s.nis, e.target.value)}
                              className="w-full px-2.5 py-1.5 text-xs bg-white border rounded-[var(--ui-radius-small)] font-semibold focus:outline-none focus:ring-2 shadow-2xs border-slate-200 focus:border-[var(--ui-primary)] focus:ring-[var(--ui-primary)]/10 text-slate-800"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Adjust Hadir Control (Footer of Col 2) */}
              <div className="p-2 border-t border-slate-200 bg-white flex items-center justify-between shrink-0">
                <span className="text-[10px] font-black text-slate-500 uppercase">Hitungan Manual</span>
                <div className="flex items-center gap-2 bg-slate-100 rounded-[var(--ui-radius-control)] p-0.5 border border-slate-200/80">
                  <button type="button" onClick={() => handleStepHadir(-1)} className="w-8 h-7 rounded-[var(--ui-radius-small)] bg-white hover:bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-700 cursor-pointer shadow-2xs"><Minus size={13} /></button>
                  <span className="text-xs font-black text-slate-800 min-w-[30px] text-center">{form.jumlah_hadir}</span>
                  <button type="button" onClick={() => handleStepHadir(1)} className="w-8 h-7 rounded-[var(--ui-radius-small)] bg-white hover:bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-700 cursor-pointer shadow-2xs"><Plus size={13} /></button>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* STICKY FOOTER ACTION BAR */}
        <div className="shrink-0 p-3 sm:px-4 sm:py-3 border-t border-slate-200 bg-white flex flex-col sm:flex-row items-center justify-between gap-3 shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.05)] rounded-b-xl z-20">
          <div className="text-[10px] sm:text-[11px] font-bold text-slate-500 w-full sm:w-auto text-center sm:text-left">
            Pastikan absen dan materi sudah diisi dengan benar.
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button variant="outline" type="button" onClick={onClose} className="rounded-2xl px-5 py-2 sm:py-2.5 text-xs font-bold cursor-pointer flex-1 sm:flex-none">
              Tutup
            </Button>
            <Button type="submit" disabled={saving} className="rounded-2xl px-6 py-2 sm:py-2.5 text-xs font-extrabold bg-[var(--ui-primary)] hover:bg-[var(--ui-primary-hover,#047857)] text-white shadow-xs cursor-pointer flex items-center justify-center gap-2 flex-1 sm:flex-none active:scale-95 transition-transform">
              {saving ? (
                <><RefreshCw size={14} className="animate-spin" /> Menyimpan...</>
              ) : (
                <><Check size={16} strokeWidth={3} /> {form.id ? 'Perbarui Jurnal' : 'Simpan Jurnal'}</>
              )}
            </Button>
          </div>
        </div>

      </form>
    </Modal>
  );


}

export default function JurnalHarianGuru({ classes = [], teachers = [], schedule = [], onBack }) {
  const user = useAuthStore(state => state.user);
  const authToken = user?.authToken;
  const role = user?.role ||'';
  const isKurikulum = ['admin','superadmin'].includes(role) || (role ==='waka' && (user?.division ||"").toLowerCase() ==='kurikulum');
  const teacherCode = user?.code || user?.id ||'';

  const [jurnalList, setJurnalList] = useState([]);
  const [rekapList, setRekapList] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeModal, setActiveModal] = useState(null); // null | jurnal object
  const [isExportSemesterOpen, setIsExportSemesterOpen] = useState(false);
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterTeacher, setFilterTeacher] = useState('');
  const [filterMonth, setFilterMonth] = useState(new Date().toISOString().slice(0, 7));
  const [activeView, setActiveView] = useState('harian'); // harian | rekap
  const [toast, setToast] = useState(null);

  const appSettings = useDataStore(state => state.appSettings) || {};
  const schoolProfile = useDataStore(state => state.schoolProfile) || {};

  const showToast = (msg, type ='success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('jam_ke');
  const [sortOrder, setSortOrder] = useState('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  const [slotsCurrentPage, setSlotsCurrentPage] = useState(1);
  const [slotsPerPage, setSlotsPerPage] = useState(20);

  const timeSlots = useDataStore(state => state.timeSlots) || {};
  const students = useDataStore(state => state.students) || [];
  const [studentAttendance, setStudentAttendance] = useState([]);
  
  const fetchStudentAttendance = useCallback(async () => {
    if (!authToken) return;
    try {
      const res = await fetch("/api/kedisiplinan/absensi", {
        headers: {"Authorization": `Bearer ${authToken}` }
      });
      const data = await res.json();
      if (data.ok) {
        setStudentAttendance(data.data || []);
      }
    } catch (e) {
      console.error("Failed to fetch student attendance:", e);
    }
  }, [authToken]);

  useEffect(() => {
    fetchStudentAttendance();
  }, [fetchStudentAttendance]);

  const getAbsentStudentsForClass = useCallback((className, date) => {
    return studentAttendance.filter(item => {
      const isSameDate = item.tanggal === date || item.tanggal.startsWith(date);
      if (!isSameDate) return false;
      const student = students.find(s => s.nis === item.siswa_nis || s.code === item.siswa_nis);
      const studentClass = student ? (student.class_name || student.kelas ||'') :'';
      return studentClass.trim().toLowerCase() === className.trim().toLowerCase() && 
             ['sakit','izin','alpa'].includes(String(item.status ||'').toLowerCase());
    }).map(item => {
      const student = students.find(s => s.nis === item.siswa_nis || s.code === item.siswa_nis);
      return {
        name: student ? (student.namaSiswa || student.name || student.nama || student.nama_siswa) : item.siswa_nis,
        status: item.status
      };
    });
  }, [studentAttendance, students]);

  // Helper to look up slot period index and time label from timeSlots
  const getSlotPeriodIndexAndLabel = useCallback((day, slotId) => {
    const dailySlots = timeSlots[day] || [];
    let counter = 0;
    for (let i = 0; i < dailySlots.length; i++) {
      const s = dailySlots[i];
      if (!s.isBreak) {
        counter++;
        if (s.id === slotId) {
          return { index: counter, label: s.label };
        }
      }
    }
    return { index: null, label:'' };
  }, [timeSlots]);

  // Ambil jadwal guru hari ini dari schedule prop (data lokal) dan gabungkan Mapel Blok
  const todayScheduleSlots = useMemo(() => {
    const today = new Date(filterDate);
    const dayName = HARI_ID[today.getDay()];
    if (!schedule || !Array.isArray(schedule)) return [];

    const myCode = isKurikulum ? (filterTeacher || null) : teacherCode;
    if (!myCode && !isKurikulum) return [];

    const rawSlots = schedule
      .filter(s => {
        const dayMatch = s.day === dayName;
        if (!dayMatch) return false;
        if (myCode) {
          const codes = (s.teacherCode ||'').split(',').map(c => c.trim());
          return codes.includes(myCode);
        }
        return true;
      })
      .map((s, idx) => {
        const info = getSlotPeriodIndexAndLabel(dayName, s.slotId);
        return {
          ...s,
          jam_ke: info.index || (idx + 1),
          time_label: info.label ||'',
        };
      });

    // Grouping block subjects (Mapel Blok)
    // Group by className and subject only, as requested:"generate tetap menyesuaikan kelasnya saja"
    const groupedMap = new Map();
    rawSlots.forEach(s => {
      const groupKey = `${s.className}-${s.subject}`;
      if (!groupedMap.has(groupKey)) {
        groupedMap.set(groupKey, []);
      }
      groupedMap.get(groupKey).push(s);
    });

    const groupedSlots = [];
    groupedMap.forEach((slots, key) => {
      // Sort slots by jam_ke
      slots.sort((a, b) => a.jam_ke - b.jam_ke);
      
      const first = slots[0];
      const last = slots[slots.length - 1];
      const minJam = first.jam_ke;
      const maxJam = last.jam_ke;
      const jamList = slots.map(s => s.jam_ke);
      
      let slotLabel = `Jam ${minJam}`;
      if (minJam !== maxJam) {
        slotLabel = `Jam ${minJam} - ${maxJam}`;
      }

      // Merging time labels (e.g."07.00 - 08.30" and"08.30 - 09.10" =>"07.00 - 09.10")
      let mergedTime ='';
      if (slots.length === 1) {
        mergedTime = first.time_label ||'';
      } else {
        const firstStart = first.time_label?.split('-')[0]?.trim() ||'';
        const lastEnd = last.time_label?.split('-')[1]?.trim() ||'';
        if (firstStart && lastEnd) {
          mergedTime = `${firstStart} - ${lastEnd}`;
        } else {
          mergedTime = first.time_label || last.time_label ||'';
        }
      }
      
      groupedSlots.push({
        ...first,
        jam_ke: minJam,
        jam_end: maxJam,
        jam_list: jamList,
        slot_label: slotLabel,
        time_range: mergedTime,
        _key: `${first.day}-${minJam}-${maxJam}-${first.className}-${first.subject}`
      });
    });

    // Sort grouped slots by starting hour (jam_ke) and then className
    return groupedSlots.sort((a, b) => {
      if (a.jam_ke !== b.jam_ke) return a.jam_ke - b.jam_ke;
      return a.className.localeCompare(b.className);
    });
  }, [schedule, filterDate, teacherCode, isKurikulum, filterTeacher, getSlotPeriodIndexAndLabel]);

  // Reset slots page when filter date or teacher changes
  useEffect(() => {
    setSlotsCurrentPage(1);
  }, [filterDate, filterTeacher]);

  // Filtered & Sorted & Paginated Jurnal List
  const filteredJurnalList = useMemo(() => {
    return jurnalList.filter(j => {
      const q = searchQuery.toLowerCase();
      const matchSearch = !q || 
        (j.teacher_name ||'').toLowerCase().includes(q) ||
        (j.teacher_code ||'').toLowerCase().includes(q) ||
        (j.kelas ||'').toLowerCase().includes(q) ||
        (j.mapel ||'').toLowerCase().includes(q) ||
        (j.materi_pokok ||'').toLowerCase().includes(q);

      const st = getJurnalSubmissionStatus(j.tanggal, j.submitted_at);
      let matchStatus = true;
      if (statusFilter ==='tepat') matchStatus = !st.isLate && !!j.submitted_at;
      if (statusFilter ==='terlambat') matchStatus = st.isLate;

      return matchSearch && matchStatus;
    });
  }, [jurnalList, searchQuery, statusFilter]);

  const sortedJurnalList = useMemo(() => {
    return [...filteredJurnalList].sort((a, b) => {
      let valA = a[sortBy];
      let valB = b[sortBy];

      if (sortBy ==='guru') {
        valA = a.teacher_name || a.teacher_code ||'';
        valB = b.teacher_name || b.teacher_code ||'';
      }

      if (typeof valA ==='string') {
        return sortOrder ==='asc' 
          ? valA.localeCompare(valB) 
          : valB.localeCompare(valA);
      } else {
        return sortOrder ==='asc' 
          ? (valA || 0) - (valB || 0) 
          : (valB || 0) - (valA || 0);
      }
    });
  }, [filteredJurnalList, sortBy, sortOrder]);

  const totalItems = sortedJurnalList.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const paginatedJurnalList = useMemo(() => {
    const startIdx = (safeCurrentPage - 1) * itemsPerPage;
    return sortedJurnalList.slice(startIdx, startIdx + itemsPerPage);
  }, [sortedJurnalList, safeCurrentPage, itemsPerPage]);

  const fetchJurnal = useCallback(async () => {
    if (!authToken) return;
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterDate) params.set('tanggal', filterDate);
      if (isKurikulum && filterTeacher) params.set('teacher_code', filterTeacher);
      const res = await fetch(`/api/jurnal/harian?${params}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      const data = await res.json();
      if (data.ok) setJurnalList(data.data || []);
    } catch (e) { console.error(e); }
    setIsLoading(false);
  }, [authToken, filterDate, isKurikulum, filterTeacher]);

  const fetchRekap = useCallback(async () => {
    if (!authToken || !isKurikulum) return;
    try {
      const res = await fetch(`/api/jurnal/rekap?bulan=${filterMonth}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      const data = await res.json();
      if (data.ok) setRekapList(data.data || []);
    } catch (e) { console.error(e); }
  }, [authToken, isKurikulum, filterMonth]);

  useEffect(() => { fetchJurnal(); }, [fetchJurnal]);
  useEffect(() => { if (activeView ==='rekap') fetchRekap(); }, [activeView, fetchRekap]);

  // Gabungkan slot jadwal hari ini dengan jurnal yang sudah ada (mendukung Mapel Blok)
  const enrichedSlots = useMemo(() => {
    return todayScheduleSlots.map(slot => {
      const filled = jurnalList.find(j =>
        j.kelas === slot.className &&
        j.mapel === slot.subject &&
        (slot.jam_list || [slot.jam_ke]).includes(j.jam_ke)
      );
      return { ...slot, filled };
    });
  }, [todayScheduleSlots, jurnalList]);

  const slotsTotalItems = enrichedSlots.length;
  const slotsTotalPages = Math.max(1, Math.ceil(slotsTotalItems / slotsPerPage));

  const paginatedEnrichedSlots = useMemo(() => {
    const startIdx = (slotsCurrentPage - 1) * slotsPerPage;
    return enrichedSlots.slice(startIdx, startIdx + slotsPerPage);
  }, [enrichedSlots, slotsCurrentPage, slotsPerPage]);

  // Jurnal yang sudah ada tapi tidak ada di slot hari ini (input manual dari hari lain / jurnal edit)
  const manualJurnals = useMemo(() => {
    if (!isKurikulum) return [];
    return jurnalList.filter(j => !enrichedSlots.find(s => s.filled?.id === j.id));
  }, [jurnalList, enrichedSlots, isKurikulum]);

  const handleSave = async (form) => {
    try {
      const res = await fetch('/api/jurnal/harian', {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (data.ok) {
        showToast('Jurnal berhasil disimpan!');

        // Auto-forward catatan ke BP/BK jika ada laporan siswa
        if (form.laporan_bk && form.laporan_bk.length > 0) {
          const bkFails = [];
          for (const s of form.laporan_bk) {
            const catatanForm = {
              siswa_nis: s.nis,
              siswa_name: s.name,
              tanggal: form.tanggal,
              jenis_catatan: 'perilaku',
              isi_catatan: `[Laporan KBM ${form.mapel}] ${s.kasus}`,
              tindak_lanjut: '',
              poin_pelanggaran_id: null,
              kelas: s.class_name || form.kelas
            };
            try {
              const bkRes = await fetch('/api/kesiswaan/catatan-walikelas', {
                method: 'POST',
                headers: { Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(catatanForm)
              });
              const bkData = await bkRes.json();
              if (!bkData.ok) bkFails.push(s.name);
            } catch (e) {
              bkFails.push(s.name);
            }
          }
          if (bkFails.length > 0) {
            showToast(`Jurnal tersimpan. Laporan BK gagal untuk: ${bkFails.join(', ')}`, 'warning');
          } else {
            showToast(`${form.laporan_bk.length} laporan BK berhasil diteruskan.`);
          }
        }

        setActiveModal(null);
        fetchJurnal();
        return { success: true };
      } else {
        return { error: data.error || 'Gagal menyimpan jurnal' };
      }
    } catch (e) {
      return { error: 'Gagal menghubungi server' };
    }
  };

  const handleDelete = async (id) => {
    if (!await window.confirmAsync('Hapus jurnal ini?')) return;
    try {
      await fetch('/api/jurnal/harian', {
        method:'POST',
        headers: { Authorization: `Bearer ${authToken}`,'Content-Type':'application/json' },
        body: JSON.stringify({ action:'delete', id })
      });
      showToast('Jurnal dihapus');
      fetchJurnal();
    } catch (e) { showToast('Gagal menghapus','error'); }
  };

  const openAdd = (slot) => {
    setActiveModal({
      kelas: slot?.className ||'',
      mapel: slot?.subject ||'',
      jam_ke: slot?.jam_ke || 1,
      slot_label: slot?.slot_label ||'',
      tanggal: filterDate,
    });
  };

  const openEdit = (j) => setActiveModal(j);

  const exportExcel = () => {
    const data = jurnalList.map(j => {
      const st = getJurnalSubmissionStatus(j.tanggal, j.submitted_at);
      return {
        Tanggal: j.tanggal,
        Guru: j.teacher_name || j.teacher_code,
        Kelas: j.kelas,
        'Mata Pelajaran': j.mapel,
        'Jam Ke': j.jam_ke,
        'Materi Pokok': j.materi_pokok || '',
        'Kegiatan Pembelajaran': j.kegiatan_pembelajaran || '',
        Metode: j.metode_pembelajaran || '',
        'Siswa Hadir': j.jumlah_hadir || 0,
        Catatan: j.catatan || '',
        'Status Pengisian': st.label,
        'Jam & Waktu Submit': st.fullSubmitStr || '-',
        'Keterlambatan': st.isLate ? `Terlambat ${st.diffDays} Hari (H+${st.diffDays})` : (j.submitted_at ? 'Tepat Waktu' : 'Belum Diisi')
      };
    });
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Jurnal');
    if (data.length > 0) {
      const keys = Object.keys(data[0]);
      ws.addRow(keys);
      data.forEach(item => ws.addRow(keys.map(k => item[k])));
    }
    wb.xlsx.writeBuffer().then(buf => {
      saveAs(new Blob([buf]), `Jurnal_KBM_${filterDate}.xlsx`);
    });
  };

  const teacherOptions = useMemo(() => {
    const codes = [...new Set(teachers.map(t => ({ value: t.code, label: `${t.name} (${t.code})` })))];
    return [{ value:'', label:'Semua Guru' }, ...codes];
  }, [teachers]);

  // Progress hari ini
  const totalSlots = enrichedSlots.length;
  const filledSlots = enrichedSlots.filter(s => s.filled).length;
  const progressPct = totalSlots > 0 ? Math.round((filledSlots / totalSlots) * 100) : 0;

  return (
    <div className="flex flex-col gap-4 w-full animate-in fade-in duration-300 pb-20 sm:pb-6">
      <PageHeader
        title="Jurnal Harian Guru"
        icon={BookOpen}
        description="Pencatatan kegiatan KBM harian yang tersinkron dengan jadwal Anda."
        tabs={isKurikulum ? [
          { id: 'harian', label: 'Jurnal Harian', icon: BookOpen },
          { id: 'rekap', label: 'Rekap Per Guru', icon: Users }
        ] : []}
        activeTab={activeView}
        onTabChange={setActiveView}
        onBack={onBack}
      />

      {/* === HARIAN VIEW === */}
      {activeView === 'harian' && (
        <>
          {/* Mobile Filter & Export Card (Reference Layout matching media__1785567800000.png) */}
          <div className="sm:hidden ui-card rounded-[var(--ui-radius-card)] p-3.5 shadow-sm border border-slate-100/90 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              {/* Date selector button */}
              <div 
                onClick={(e) => {
                  const inputEl = e.currentTarget.querySelector('input[type="date"]');
                  if (inputEl) {
                    try { inputEl.showPicker(); } catch (err) { inputEl.click(); }
                  }
                }}
                className="flex-1 flex items-center justify-between bg-slate-50 hover:bg-slate-100/80 border border-slate-200/80 rounded-[var(--ui-radius-card)] py-2.5 px-3.5 transition-all relative cursor-pointer active:scale-98"
              >
                <div className="flex items-center gap-2.5 min-w-0 pointer-events-none">
                  <div 
                    className="w-7 h-7 rounded-[var(--ui-radius-small)] flex items-center justify-center shrink-0"
                    style={{ background: "color-mix(in srgb, var(--ui-primary) 14%, transparent)", color: "var(--ui-primary)" }}
                  >
                    <Calendar size={16} strokeWidth={2.2} />
                  </div>
                  <span className="text-xs font-extrabold text-slate-800 truncate">
                    {filterDate ? new Date(filterDate + 'T00:00:00').toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) : 'Pilih Tanggal'}
                  </span>
                </div>
                <input
                  type="date"
                  value={filterDate}
                  onChange={e => setFilterDate(e.target.value)}
                  onClick={e => {
                    e.stopPropagation();
                    try { e.currentTarget.showPicker(); } catch (err) {}
                  }}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                />
                <ChevronDown size={16} className="text-slate-400 shrink-0 pointer-events-none" />
              </div>

              {/* Refresh button */}
              <button
                type="button"
                onClick={fetchJurnal}
                title="Refresh"
                className="w-11 h-11 rounded-[var(--ui-radius-card)] bg-slate-50 hover:bg-slate-100 border border-slate-200/80 flex items-center justify-center text-slate-600 transition-all cursor-pointer shrink-0 active:scale-95"
              >
                <RefreshCw size={18} strokeWidth={2} />
              </button>
            </div>

            {isKurikulum && (
              <div className="w-full">
                <CustomSelect
                  options={teacherOptions}
                  value={filterTeacher}
                  onChange={v => setFilterTeacher(v)}
                  placeholder="Filter Guru"
                />
              </div>
            )}

            {/* Export Jurnal PDF Rekap Semester button */}
            <button
              type="button"
              onClick={() => setIsExportSemesterOpen(true)}
              className="w-full py-3 rounded-[var(--ui-radius-card)] font-black text-xs flex items-center justify-center gap-2 transition-all shadow-xs active:scale-98 cursor-pointer"
              style={{
                background: "color-mix(in srgb, var(--ui-primary) 10%, #ffffff)",
                color: "var(--ui-primary)",
                border: "1px solid color-mix(in srgb, var(--ui-primary) 25%, transparent)"
              }}
            >
              <FileText size={16} strokeWidth={2.2} />
              <span>Export PDF Rekap Semester</span>
            </button>
          </div>

          {/* Desktop Filter Bar */}
          <div className="hidden sm:flex ui-card p-4 flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-3 w-full">
              <div className="flex gap-2 w-full sm:w-auto">
                <div className="flex-1 sm:flex-none flex items-center gap-2 bg-slate-50 border border-slate-100 px-3 rounded-[var(--ui-radius-small)]">
                  <Calendar size={16} className="text-slate-400 shrink-0" />
                  <input
                    type="date"
                    value={filterDate}
                    onChange={e => setFilterDate(e.target.value)}
                    className="w-full py-2 bg-transparent border-none text-sm font-semibold text-slate-700 focus:outline-none"
                  />
                </div>
                <Button variant="ghost" size="icon" onClick={fetchJurnal} title="Refresh">
                  <RefreshCw size={16} />
                </Button>
              </div>
              
              {isKurikulum && (
                <div className="w-full sm:w-[220px]">
                  <CustomSelect
                    options={teacherOptions}
                    value={filterTeacher}
                    onChange={v => setFilterTeacher(v)}
                    placeholder="Filter Guru"
                  />
                </div>
              )}
            </div>
            
            <Button variant="outline" onClick={() => setIsExportSemesterOpen(true)} className="w-full md:w-auto flex justify-center items-center gap-2 shrink-0 cursor-pointer font-bold">
              <FileText size={14} className="text-[var(--ui-primary)]" />
              <span>Export PDF Semester</span>
            </Button>
          </div>

          {/* Summary Stats Boxes */}
          {totalSlots > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-[var(--ui-radius-card)] bg-emerald-50/70 border border-emerald-100 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">Sudah Mengisi Jurnal</p>
                  <h4 className="text-2xl font-black text-emerald-700 mt-1">{filledSlots} <span className="text-xs font-semibold text-emerald-600">dari {totalSlots} slot</span></h4>
                </div>
                <CheckCircle2 size={24} className="text-emerald-500 opacity-80" />
              </div>
              <div className="p-4 rounded-[var(--ui-radius-card)] bg-rose-50/70 border border-rose-100 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-rose-800 uppercase tracking-wider">Belum Mengisi Jurnal</p>
                  <h4 className="text-2xl font-black text-rose-700 mt-1">{totalSlots - filledSlots} <span className="text-xs font-semibold text-rose-600">dari {totalSlots} slot</span></h4>
                </div>
                <AlertCircle size={24} className="text-rose-500 opacity-80" />
              </div>
            </div>
          )}

          {/* Slot Jadwal Hari Ini */}
          {totalSlots > 0 && (
            <div className="ui-card overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <h3 className="font-bold text-slate-800 text-xs flex items-center gap-2">
                  <BookOpen size={14} className="text-[var(--ui-primary)]" />
                  Jadwal Mengajar Hari Ini
                </h3>
                <span className="text-[11px] font-semibold text-slate-500">{HARI_ID[new Date(filterDate).getDay()]}</span>
              </div>
              <div className="divide-y divide-slate-100">
                {paginatedEnrichedSlots.map((slot, idx) => {
                  const j = slot.filled;
                  const statusInfo = getJurnalSubmissionStatus(filterDate, j?.submitted_at);
                  const teacher = teachers.find(t => t.code === slot.teacherCode);
                  const teacherNameDisplay = teacher ? teacher.name : slot.teacherCode;
                  const classAbsentStudents = getAbsentStudentsForClass(slot.className, filterDate);
                  return (
                    <div key={idx} className={`p-4 flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4 hover:bg-slate-50/50 transition-colors ${j ?'' :'bg-rose-50/20'}`}>
                      {/* Jam Info */}
                      <div className="w-full sm:w-20 shrink-0 flex flex-row sm:flex-col items-center justify-between sm:justify-center sm:text-center pb-2 sm:pb-0 border-b border-slate-100/80 sm:border-none">
                        <div className="flex sm:flex-col items-center gap-2 sm:gap-0">
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Jam</div>
                          <div className="text-sm font-black text-slate-700 leading-tight">{slot.slot_label.replace('Jam','')}</div>
                          {slot.time_range && (
                            <div className="text-[9px] font-bold text-slate-500 sm:mt-1 leading-normal bg-slate-100 px-1.5 py-0.5 rounded-[var(--ui-radius-pill)] border border-slate-200/50">{slot.time_range}</div>
                          )}
                        </div>
                        {/* On mobile, we can show a small badge or status next to the time */}
                        <div className="sm:hidden">
                           <StatusBadge submitted={!!j} submittedAt={j?.submitted_at} tanggal={filterDate} showTime={true} />
                        </div>
                      </div>

                      {/* Detail Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="font-bold text-slate-800 text-sm">{slot.className}</span>
                          <span className="text-slate-400 text-xs">·</span>
                          <span className="font-bold text-xs text-[var(--ui-primary)]">{slot.subject}</span>
                          {isKurikulum && (
                            <>
                              <span className="text-slate-400 text-xs">·</span>
                              <span className="text-xs text-slate-500 font-medium bg-slate-100 px-1.5 py-0.5 rounded-[var(--ui-radius-small)]">Guru: {teacherNameDisplay}</span>
                            </>
                          )}
                          <div className="hidden sm:block">
                            <StatusBadge submitted={!!j} submittedAt={j?.submitted_at} tanggal={filterDate} showTime={true} />
                          </div>
                        </div>
                        
                        {/* Absent Students Info */}
                        {classAbsentStudents.length > 0 ? (
                          <div className="flex flex-wrap gap-1 items-center mt-1 mb-2">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mr-1.5 flex items-center gap-0.5">
                              <Users size={10} /> Tidak Hadir:
                            </span>
                            {classAbsentStudents.map((abs, sIdx) => {
                              let stColor ='bg-amber-50 text-amber-700 border-amber-200/50';
                              if (abs.status.toLowerCase() ==='izin') stColor ='bg-indigo-50 text-indigo-700 border-indigo-200/50';
                              if (abs.status.toLowerCase() ==='alpa' || abs.status.toLowerCase() ==='alpha') stColor ='bg-rose-50 text-rose-700 border-rose-200/50';
                              return (
                                <span key={sIdx} className={`inline-flex items-center text-[9px] font-bold px-1.5 py-0.5 rounded-[var(--ui-radius-small)] border ${stColor}`}>
                                  {abs.name} ({abs.status.toUpperCase()})
                                </span>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="text-[9px] font-bold text-emerald-600 flex items-center gap-1 mt-1 mb-2">
                            <CheckCircle2 size={10} /> Semua siswa hadir hari ini
                          </div>
                        )}

                        {j ? (
                          <div className="text-xs text-slate-600 space-y-1 mt-1">
                            <p><span className="font-semibold text-slate-500">Materi:</span> {j.materi_pokok}</p>
                            <p><span className="font-semibold text-slate-500">Metode:</span> {j.metode_pembelajaran} &bull; <span className="font-semibold text-slate-500">Hadir:</span> {j.jumlah_hadir} siswa</p>
                            {j.catatan && <p className="text-[11px] text-slate-400 italic bg-slate-50 px-2 py-1 rounded-[var(--ui-radius-small)]">Catatan: {j.catatan}</p>}
                            
                            {/* Timestamp & Late Note */}
                            {j.submitted_at && (
                              <div className="pt-1 flex items-center gap-2 flex-wrap text-[11px]">
                                <span className="text-slate-500 font-medium flex items-center gap-1">
                                  <Clock size={11} className="text-slate-400 shrink-0" />
                                  Diisi: <strong className="text-slate-700">{statusInfo.fullSubmitStr}</strong>
                                </span>
                                {statusInfo.isLate && (
                                  <span className="text-[10px] font-black text-rose-700 bg-rose-50 px-2 py-0.5 rounded-[var(--ui-radius-control)] border border-rose-200 flex items-center gap-1">
                                    <Clock size={11} className="text-rose-600 shrink-0" />
                                    <span>Terlambat (Diisi H+{statusInfo.diffDays})</span>
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        ) : (
                          <p className="text-[11px] text-rose-500 font-bold mt-0.5">Jurnal belum diisi untuk slot mengajar ini</p>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2 sm:gap-1 shrink-0 sm:self-center justify-end w-full sm:w-auto pt-3 sm:pt-0 border-t border-slate-100/80 sm:border-none mt-1 sm:mt-0">
                        {j ? (
                          <>
                            <Button variant="outline" onClick={() =>openEdit(j)} className="flex-1 sm:flex-none flex justify-center cursor-pointer" title="Edit">
                              <Edit2 size={13} /></Button>
                            <Button variant="outline" onClick={() =>handleDelete(j.id)} className="flex-1 sm:flex-none flex justify-center cursor-pointer" title="Hapus">
                              <Trash2 size={13} /></Button>
                          </>
                        ) : (
                          <Button variant="outline"
                            onClick={() =>openAdd(slot)}
                            className="flex-1 sm:flex-none flex justify-center items-center gap-1.5 sm: sm: cursor-pointer"
                          >
                            <Plus size={11} /> Isi Jurnal</Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Slot Schedule Pagination Footer */}
              <PaginationControls
                currentPage={slotsCurrentPage}
                totalItems={slotsTotalItems}
                itemsPerPage={slotsPerPage}
                onPageChange={setSlotsCurrentPage}
                onItemsPerPageChange={(v) => { setSlotsPerPage(v); setSlotsCurrentPage(1); }}
              />
            </div>
          )}

          {/* Jurnal dari tanggal tersebut (semua, kurikulum) */}
          {(isKurikulum || totalSlots === 0) && jurnalList.length > 0 && (
            <div className="ui-card overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row gap-3 items-center justify-between">
                <h3 className="font-bold text-slate-800 text-xs shrink-0 self-center">
                  {isKurikulum ?'Semua Jurnal Tanggal Ini' :'Jurnal yang Sudah Tersimpan'}
                </h3>
                
                {/* Table Filters & Sorting */}
                <div className="flex flex-wrap gap-2 items-center w-full sm:w-auto justify-end">
                  <div className="relative w-full sm:w-48">
                    <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Cari Jurnal..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="w-full pl-7 pr-3 py-1 bg-slate-50 border-none rounded-[var(--ui-radius-small)] text-xs font-semibold focus:outline-none focus:outline-[var(--ui-primary)] focus:bg-white"
                    />
                  </div>
                  <CustomSelect
                    options={[
                      { value:'all', label:'Semua Status' },
                      { value:'tepat', label:'Tepat Waktu' },
                      { value:'terlambat', label:'Terlambat' }
                    ]}
                    value={statusFilter}
                    onChange={setStatusFilter}
                    className="w-full sm:w-36 text-xs z-30 relative"
                  />
                  <CustomSelect
                    options={[
                      { value:'jam_ke', label:'Urut: Jam' },
                      { value:'kelas', label:'Urut: Kelas' },
                      { value:'mapel', label:'Urut: Mapel' },
                      { value:'guru', label:'Urut: Guru' }
                    ]}
                    value={sortBy}
                    onChange={setSortBy}
                    className="w-full sm:w-32 text-xs z-30 relative"
                  />
                  <Button variant="outline"
                    onClick={() =>setSortOrder(sortOrder ==='asc' ?'desc' :'asc')}
                    className="cursor-pointer"
                    title={sortOrder ==='asc' ?'Urut Naik' :'Urut Turun'}
                  >
                    <ArrowUpDown size={12} /></Button>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-[10px] text-slate-500 uppercase border-b border-slate-200">
                    <tr>
                      <th className="px-5 py-3 font-bold">Guru</th>
                      <th className="px-5 py-3 font-bold">Kelas</th>
                      <th className="px-5 py-3 font-bold">Mapel</th>
                      <th className="px-5 py-3 text-center font-bold">Jam</th>
                      <th className="px-5 py-3 font-bold">Materi</th>
                      <th className="px-5 py-3 text-center font-bold">Hadir</th>
                      <th className="px-5 py-3 text-center font-bold">Status &amp; Jam Submit</th>
                      <th className="px-5 py-3 text-right font-bold">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedJurnalList.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-5 py-8 text-center text-slate-400 font-medium">
                          Data jurnal tidak ditemukan untuk filter/pencarian ini.
                        </td>
                      </tr>
                    ) : (
                      paginatedJurnalList.map(j => {
                        return (
                          <tr key={j.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-5 py-2.5">
                              <p className="font-bold text-slate-800">{j.teacher_name || j.teacher_code}</p>
                            </td>
                            <td className="px-5 py-2.5 font-bold text-slate-700">{j.kelas}</td>
                            <td className="px-5 py-2.5 text-[var(--ui-primary)] font-bold">{j.mapel}</td>
                            <td className="px-5 py-2.5 text-center font-bold text-slate-500">{j.jam_ke}</td>
                            <td className="px-5 py-2.5 text-slate-600 max-w-[200px] truncate">{j.materi_pokok}</td>
                            <td className="px-5 py-2.5 text-center">
                              <span className="font-bold text-slate-700">{j.jumlah_hadir}</span>
                            </td>
                            <td className="px-5 py-2.5 text-center">
                              <StatusBadge submitted={!!j.submitted_at} submittedAt={j.submitted_at} tanggal={j.tanggal} showTime={true} />
                            </td>
                            <td className="px-5 py-2.5 text-right">
                              <div className="flex justify-end gap-1">
                                <Button variant="outline" onClick={() =>openEdit(j)} className="cursor-pointer">
                                  <Edit2 size={12} /></Button>
                                <Button variant="outline" onClick={() =>handleDelete(j.id)} className="cursor-pointer">
                                  <Trash2 size={12} /></Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Table Pagination Footer */}
              <PaginationControls
                currentPage={currentPage}
                totalItems={totalItems}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
                onItemsPerPageChange={(v) => { setItemsPerPage(v); setCurrentPage(1); }}
              />
            </div>
          )}

          {!isLoading && totalSlots === 0 && jurnalList.length === 0 && (
            <div className="ui-card rounded-[var(--ui-radius-card)] p-8 sm:p-12 text-center flex flex-col items-center justify-center gap-3 border border-slate-100/90 shadow-sm">
              <div 
                className="w-20 h-20 rounded-[var(--ui-radius-card)] flex items-center justify-center mb-1 shadow-inner"
                style={{ background: "color-mix(in srgb, var(--ui-primary) 12%, transparent)", color: "var(--ui-primary)" }}
              >
                <Coffee size={38} strokeWidth={2.2} />
              </div>
              <h3 className="text-lg font-black text-slate-800 tracking-tight">Waktu Luang!</h3>
              <p className="text-xs text-slate-500 font-medium max-w-xs leading-relaxed">
                Tidak ada jadwal mengajar untuk hari{' '}
                <span className="font-black text-slate-700">
                  {new Date(filterDate).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
                . Selamat beristirahat!
              </p>
            </div>
          )}
        </>
      )}

      {/* === REKAP VIEW (Kurikulum) === */}
      {activeView ==='rekap' && isKurikulum && (
        <div className="ui-card overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <h3 className="font-bold text-slate-800 text-xs flex items-center gap-2 shrink-0">
              <Filter size={14} className="text-[var(--ui-primary)]" />
              Rekap Pengisian Jurnal Per Guru
            </h3>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <input
                type="month"
                value={filterMonth}
                onChange={e => setFilterMonth(e.target.value)}
                className="px-3 py-1.5 bg-white border-none rounded-[var(--ui-radius-small)] text-xs font-semibold focus:outline-none focus:outline-[var(--ui-primary)] transition-all"
              />
              <Button variant="ghost" size="sm" onClick={fetchRekap} >
                <RefreshCw size={12} />
              </Button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-[10px] text-slate-500 uppercase border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3 font-bold">Guru</th>
                  <th className="px-5 py-3 text-center font-bold">Total Jurnal</th>
                  <th className="px-5 py-3 text-center font-bold">Tepat Waktu</th>
                  <th className="px-5 py-3 text-center font-bold">Terlambat</th>
                  <th className="px-5 py-3 font-bold">Jurnal Terakhir</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rekapList.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-10 text-center text-slate-400 font-medium">
                      Tidak ada data jurnal untuk bulan {filterMonth}
                    </td>
                  </tr>
                ) : rekapList.map(r => (
                  <tr key={r.teacher_code} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-2.5">
                      <p className="font-bold text-slate-800">{r.teacher_name || r.teacher_code}</p>
                      <p className="text-[10px] text-slate-400">{r.teacher_code}</p>
                    </td>
                    <td className="px-5 py-2.5 text-center">
                      <span className="font-black text-slate-700 text-base">{r.total_jurnal}</span>
                    </td>
                    <td className="px-5 py-2.5 text-center">
                      <span className="font-bold text-emerald-600">{parseInt(r.total_submitted) - parseInt(r.total_terlambat)}</span>
                    </td>
                    <td className="px-5 py-2.5 text-center">
                      <span className={`font-bold ${parseInt(r.total_terlambat) > 0 ?'text-amber-600' :'text-slate-400'}`}>
                        {r.total_terlambat}
                      </span>
                    </td>
                    <td className="px-5 py-2.5 text-slate-500">
                      {r.jurnal_terakhir ? new Date(r.jurnal_terakhir).toLocaleDateString('id-ID', { day:'numeric', month:'long', year:'numeric' }) :'-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Isi Jurnal */}
      {activeModal && (
        <JurnalModal
          jurnal={activeModal}
          onSave={handleSave}
          onClose={() => setActiveModal(null)}
          students={students}
          studentAttendance={studentAttendance}
        />
      )}

      {/* Modal Export Rekap Semester PDF */}
      {isExportSemesterOpen && (
        <ExportSemesterModal
          isOpen={isExportSemesterOpen}
          onClose={() => setIsExportSemesterOpen(false)}
          user={user}
          teachers={teachers}
          classes={classes}
          schedule={schedule}
          appSettings={appSettings}
          schoolProfile={schoolProfile}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-[var(--ui-radius-small)] shadow-sm font-semibold text-xs flex items-center gap-2 animate-in slide-in-from-bottom-5 ${toast.type ==='error' ?'bg-rose-600 text-white' :'bg-emerald-600 text-white'}`}>
          <CheckCircle2 size={14} />
          {toast.msg}
        </div>
      )}
    </div>
  );
}
