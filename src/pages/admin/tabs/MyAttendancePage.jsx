import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import useAuthStore from '../../../store/monitoring/authStore.js';
import { useAppStore } from '../../../store/useAppStore.js';
import { 
  ChevronLeft, ChevronRight, Clock, MinusCircle, Fingerprint, 
  Download, Send, X, FileText, ArrowLeft, HeartPulse, Building2, 
  Calendar, Upload, Trash2, CheckCircle2, AlertCircle, Info 
} from 'lucide-react';
import { getDatabaseSnapshot } from '../../../utils/dataSource.js';

const MONTH_NAMES = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
const DAY_NAMES_FULL = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
const DAY_NAMES_SHORT = ['Min','Sen','Sel','Rab','Kam','Jum','Sab'];

function getStatusStyle(dayData) {
  if (!dayData) return null;
  if (dayData.isManual) {
    const s = dayData.status;
    if (s === 'Izin')       return { bg:'bg-indigo-50',   text:'text-indigo-700',   border:'border-indigo-200/90',   label:'Izin',      dot:'bg-indigo-500' };
    if (s === 'Sakit')      return { bg:'bg-yellow-50', text:'text-yellow-800', border:'border-yellow-200/90', label:'Sakit',     dot:'bg-yellow-500' };
    if (s === 'Dinas Luar') return { bg:'bg-purple-50', text:'text-purple-700', border:'border-purple-200/90', label:'Dinas Luar', dot:'bg-purple-500' };
    if (s === 'Alpa')       return { bg:'bg-rose-50',    text:'text-rose-700',    border:'border-rose-200/90',    label:'Alpa',      dot:'bg-rose-500' };
  }
  if (dayData.in) {
    if (dayData.isLate)     return { bg:'bg-amber-50',  text:'text-amber-800',  border:'border-amber-200/90',  label:'Terlambat', dot:'bg-amber-500' };
    return                         { bg:'bg-emerald-50',text:'text-emerald-700',border:'border-emerald-200/90',label:'Hadir',     dot:'bg-emerald-500' };
  }
  if (dayData.out) {
    return { bg:'bg-orange-50', text:'text-orange-900', border:'border-orange-200/90', label:'Tdk Absen Pagi', dot:'bg-orange-500' };
  }
  return null;
}

const LEGEND = [
  { dot:'bg-emerald-500', bg:'bg-emerald-50', text:'text-emerald-700', border:'border-emerald-200/90', label:'Hadir' },
  { dot:'bg-amber-500',   bg:'bg-amber-50',   text:'text-amber-800',   border:'border-amber-200/90',   label:'Terlambat' },
  { dot:'bg-orange-500',  bg:'bg-orange-50',  text:'text-orange-900',  border:'border-orange-200/90',  label:'Tdk Absen Pagi' },
  { dot:'bg-indigo-500',  bg:'bg-indigo-50',  text:'text-indigo-700',  border:'border-indigo-200/90',  label:'Izin' },
  { dot:'bg-yellow-500',  bg:'bg-yellow-50',  text:'text-yellow-800',  border:'border-yellow-200/90',  label:'Sakit' },
  { dot:'bg-purple-500',  bg:'bg-purple-50',  text:'text-purple-700',  border:'border-purple-200/90',  label:'Dinas Luar' },
  { dot:'bg-rose-500',    bg:'bg-rose-50',    text:'text-rose-700',    border:'border-rose-200/90',    label:'Alpa' },
];

// Helper
function isFutureDay(day, filter, today) {
  return new Date(filter.year, filter.month - 1, day) > new Date(today.getFullYear(), today.getMonth(), today.getDate());
}

function fmt5(t) { return (t && /^\d{1,2}:\d{2}/.test(String(t).trim())) ? String(t).trim().substring(0, 5) : '-'; }

export default function MyAttendancePage({ setActiveTab }) {
  const user        = useAuthStore(state => state.user);
  const authToken   = user?.authToken;
  const teacherCode = user?.teacherCode || user?.code || user?.username;
  const teacherName = user?.name || user?.username || '';
  const teacherNIP  = user?.nip || '';

  const academicCalendar = useAppStore(state => state.academicCalendar) || [];
  const personType = (user?.role || '').toLowerCase() === 'karyawan' ? 'karyawan' : 'guru';

  const today = new Date();
  const [filter, setFilter]   = useState({ month: today.getMonth() + 1, year: today.getFullYear() });
  const [myData, setMyData]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);
  const [daysInMonth, setDaysInMonth] = useState(new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate());

  // Form state
  const [showForm, setShowForm]         = useState(false);
  const [formDay, setFormDay]           = useState(null);
  const [formStatus, setFormStatus]     = useState('Sakit');
  const [formNote, setFormNote]         = useState('');
  const [formFile, setFormFile]         = useState(null);
  const [formFileName, setFormFileName] = useState('');
  const [formPreview, setFormPreview]   = useState(null);
  const [submitting, setSubmitting]     = useState(false);
  const [submitMsg, setSubmitMsg]       = useState('');
  const mobileFormRef                   = useRef(null);

  // Close modal on Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && showForm) {
        closeForm();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showForm]);

  const fetchData = useCallback(async () => {
    if (!authToken) return;
    setLoading(true);
    setSelectedDay(null);
    try {
      const res = await fetch('/api/hikvision/report/matrix', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${authToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...filter, type: personType }),
      });
      const json = await res.json();
      if (json.ok && json.data) {
        setDaysInMonth(json.daysInMonth || new Date(filter.year, filter.month, 0).getDate());
        const me = json.data.find(d => String(d.nis).toLowerCase() === String(teacherCode).toLowerCase());
        setMyData(me || null);
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [authToken, filter, teacherCode, personType]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const prevMonth = () => setFilter(f => f.month === 1  ? { month:12, year:f.year-1 } : { ...f, month:f.month-1 });
  const nextMonth = () => setFilter(f => f.month === 12 ? { month:1,  year:f.year+1 } : { ...f, month:f.month+1 });
  const goToCurrentMonth = () => setFilter({ month: today.getMonth() + 1, year: today.getFullYear() });

  const calendarGrid = useMemo(() => {
    const firstDay = new Date(filter.year, filter.month - 1, 1).getDay();
    const cells = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [filter.year, filter.month, daysInMonth]);

  const stats = useMemo(() => myData
    ? { hadir:myData.total_hadir||0, terlambat:myData.total_terlambat||0, izin:myData.total_izin||0, sakit:myData.total_sakit||0, alpa:myData.total_alpa||0 }
    : { hadir:0, terlambat:0, izin:0, sakit:0, alpa:0 }, [myData]);

  const isCurrentMonth  = filter.month === today.getMonth() + 1 && filter.year === today.getFullYear();
  const selectedDayData = selectedDay != null ? myData?.days?.[selectedDay] : null;
  const selectedDayStyle = selectedDay != null ? getStatusStyle(myData?.days?.[selectedDay]) : null;

  /* ---------- PDF DOWNLOAD ---------- */
  const handleDownloadPDF = async () => {
    try {
      const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
        import('jspdf'),
        import('jspdf-autotable')
      ]);
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: getDatabaseSnapshot()?.appSettings?.defaultPaperSize === 'F4' ? [215, 330] : 'a4' });
      const pageW = doc.internal.pageSize.getWidth();
      const monthLabel = MONTH_NAMES[filter.month - 1];

      // Header
      doc.setFillColor(37, 99, 235);
      doc.rect(0, 0, pageW, 32, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(14);
      doc.text('LAPORAN REKAP ABSENSI GURU', pageW / 2, 12, { align: 'center' });
      doc.setFontSize(10);
      doc.text(`Periode: ${monthLabel} ${filter.year}`, pageW / 2, 20, { align: 'center' });
      doc.setFontSize(9);
      doc.setFont('Helvetica', 'normal');
      doc.text(`Dicetak: ${new Date().toLocaleDateString('id-ID', { day:'2-digit', month:'long', year:'numeric' })}`, pageW / 2, 27, { align: 'center' });

      // Identity box
      doc.setTextColor(30, 41, 59);
      doc.setFillColor(248, 250, 252);
      doc.rect(14, 36, pageW - 28, 22, 'F');
      doc.setDrawColor(203, 213, 225);
      doc.rect(14, 36, pageW - 28, 22);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('Nama Guru', 18, 44);
      doc.text('NIP / Kode', 18, 51);
      doc.setFont('Helvetica', 'normal');
      doc.text(`: ${teacherName || '-'}`, 55, 44);
      doc.text(`: ${teacherNIP || teacherCode || '-'}`, 55, 51);

      // Summary row
      const sumLabels = ['Hadir', 'Terlambat', 'Izin', 'Sakit', 'Alpa'];
      const sumValues = [stats.hadir, stats.terlambat, stats.izin, stats.sakit, stats.alpa];
      const sumColors = [[5,150,105],[245,158,11],[59,130,246],[234,179,8],[239,68,68]];
      const cellW = (pageW - 28) / 5;
      sumLabels.forEach((lbl, i) => {
        const x = 14 + i * cellW;
        doc.setFillColor(...sumColors[i]);
        doc.rect(x, 62, cellW - 1, 14, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(13);
        doc.text(String(sumValues[i]), x + cellW / 2 - 0.5, 71, { align: 'center' });
        doc.setFontSize(7);
        doc.setFont('Helvetica', 'normal');
        doc.text(lbl, x + cellW / 2 - 0.5, 74.5, { align: 'center' });
      });

      // Table
      const tableRows = [];
      for (let d = 1; d <= daysInMonth; d++) {
        const dd   = myData?.days?.[d];
        const dateStr = `${String(d).padStart(2,'0')} ${monthLabel} ${filter.year}`;
        const dayName = DAY_NAMES_FULL[new Date(filter.year, filter.month - 1, d).getDay()];
        let statusStr = '-';
        let masukStr  = '-';
        let pulangStr = '-';
        let ketStr    = '';

        if (dd) {
          if (dd.isManual) {
            statusStr = dd.status;
            const isCorrection = /koreksi|override|super\s*admin/i.test(dd.note || '');
            ketStr    = isCorrection ? '' : (dd.note || '');
            masukStr  = '-';
            pulangStr = '-';
          } else {
            statusStr = dd.isLate ? 'Terlambat' : (dd.in ? 'Hadir' : '-');
            masukStr  = fmt5(dd.in);
            pulangStr = fmt5(dd.out);
          }
        }

        tableRows.push([dateStr, dayName, masukStr, pulangStr, statusStr, ketStr]);
      }

      autoTable(doc, {
        startY: 80,
        head: [['Tanggal', 'Hari', 'Jam Masuk', 'Jam Pulang', 'Status', 'Keterangan']],
        body: tableRows,
        styles: { fontSize: 8, cellPadding: 2.5, valign: 'middle', textColor: [30, 41, 59] },
        headStyles: { fillColor: [30, 64, 175], textColor: 255, fontStyle: 'bold', fontSize: 8 },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: {
          0: { cellWidth: 34 },
          1: { cellWidth: 20 },
          2: { cellWidth: 22, halign: 'center' },
          3: { cellWidth: 22, halign: 'center' },
          4: { cellWidth: 24, halign: 'center', fontStyle: 'bold' },
          5: { cellWidth: 'auto' },
        },
        didParseCell(data) {
          if (data.section === 'body' && data.column.index === 4) {
            const v = data.cell.raw;
            if (v === 'Hadir')      { data.cell.styles.textColor = [5, 150, 105]; }
            else if (v === 'Terlambat') { data.cell.styles.textColor = [245, 158, 11]; }
            else if (v === 'Izin')  { data.cell.styles.textColor = [59, 130, 246]; }
            else if (v === 'Sakit') { data.cell.styles.textColor = [161, 98, 7]; }
            else if (v === 'Alpa')  { data.cell.styles.textColor = [239, 68, 68]; }
          }
        },
        margin: { left: 14, right: 14 },
      });

      // Footer
      const finalY = (doc.lastAutoTable?.finalY || 120) + 8;
      doc.setTextColor(100, 116, 139);
      doc.setFontSize(7);
      doc.setFont('Helvetica', 'italic');
      doc.text('* Data bersumber dari mesin fingerprint Hikvision. Dicetak otomatis oleh sistem.', 14, finalY);

      doc.save(`Rekap_Absensi_${(teacherName || 'Guru').replace(/\s+/g,'_')}_${monthLabel}_${filter.year}.pdf`);
    } catch (e) {
      console.error("Gagal mendownload PDF absensi:", e);
    }
  };

  /* ---------- Form keterangan / surat sakit ---------- */
  const openForm = (day) => {
    const dd = myData?.days?.[day];
    setSelectedDay(day);
    setFormDay(day);
    // Hanya isi status & note jika sebelumnya adalah pengajuan manual guru/karyawan.
    // Jika data berasal dari log fingerprint, dd.note berisi nama mesin (mis: "Mesin: Abensi...") sehingga TIDAK boleh dipakai!
    const isManual = Boolean(dd?.isManual);
    setFormStatus(isManual && ['Sakit', 'Izin', 'Dinas Luar'].includes(dd?.status) ? dd.status : 'Sakit');
    const isCorrection = /koreksi|override|super\s*admin/i.test(dd?.note || '');
    setFormNote(isManual && !isCorrection ? (dd?.note || '') : '');
    setFormFile(null);
    setFormFileName('');
    setFormPreview(null);
    setSubmitMsg('');
    setShowForm(true);
  };

  const closeForm = () => { 
    setShowForm(false); 
    setSubmitMsg('');
    setFormFile(null);
    setFormFileName('');
    setFormPreview(null);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setSubmitMsg('Ukuran file maksimal 5MB.');
      return;
    }
    setFormFileName(file.name);
    const reader = new FileReader();
    reader.onloadend = () => {
      setFormFile(reader.result);
      if (file.type.startsWith('image/')) {
        setFormPreview(reader.result);
      } else {
        setFormPreview(null);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitMsg('');
    try {
      const dateStr = `${filter.year}-${String(filter.month).padStart(2,'0')}-${String(formDay).padStart(2,'0')}`;
      const res = await fetch('/api/hikvision/manual-attendance', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${authToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          teacherCode, 
          date: dateStr, 
          status: formStatus, 
          note: formNote,
          personType,
          fileData: formFile,
          fileName: formFileName
        }),
      });
      const json = await res.json();
      if (json.ok) {
        setSubmitMsg('success');
        await fetchData();
        setTimeout(closeForm, 1200);
      } else {
        setSubmitMsg(json.error || 'Gagal menyimpan.');
      }
    } catch { setSubmitMsg('Kesalahan jaringan.'); }
    setSubmitting(false);
  };

  const handleBack = () => {
    if (typeof setActiveTab === 'function') {
      setActiveTab('dashboard');
    } else if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.hash = '#dashboard';
    }
  };

  /* ---------- Opsi Status & Template Cepat ---------- */
  const STATUS_OPTIONS = [
    {
      id: 'Sakit',
      label: 'Sakit',
      icon: HeartPulse,
      activeBadge: 'bg-rose-500 text-white shadow-md shadow-rose-500/25 border-rose-500',
      iconColor: 'text-rose-500',
    },
    {
      id: 'Izin',
      label: 'Izin',
      icon: FileText,
      activeBadge: 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25 border-indigo-600',
      iconColor: 'text-indigo-600',
    },
    {
      id: 'Dinas Luar',
      label: 'Dinas Luar',
      icon: Building2,
      activeBadge: 'bg-amber-500 text-white shadow-md shadow-amber-500/25 border-amber-500',
      iconColor: 'text-amber-600',
    },
  ];

  const QUICK_TAGS = {
    'Sakit': ['Demam & Flu', 'Rawat Jalan Klinik', 'Sakit Kepala Berat', 'Istirahat Medis'],
    'Izin': ['Urusan Keluarga Mendesak', 'Acara Keluarga', 'Kendaraan Rusak / Mogok', 'Kepentingan Pribadi'],
    'Dinas Luar': ['Workshop Dinas Pendidikan', 'Rapat MGMP', 'Mendampingi Lomba Siswa', 'Monitoring PKL'],
  };

  /* ---------- Konten Formulir (Desain Baru & Elegan) ---------- */
  const renderFormContent = (isModal = true) => {
    const currentOption = STATUS_OPTIONS.find(o => o.id === formStatus) || STATUS_OPTIONS[0];
    const StatusIcon = currentOption.icon;
    const quickTags = QUICK_TAGS[formStatus] || [];

    return (
      <div className="flex flex-col w-full bg-white">
        {/* HEADER FORM: Bersih, Mewah, & Senada */}
        <div className="px-4 sm:px-5 py-3.5 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 transition-all ${
              formStatus === 'Sakit' 
                ? 'bg-rose-50 text-rose-600 border border-rose-100' 
                : formStatus === 'Izin' 
                  ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' 
                  : 'bg-amber-50 text-amber-600 border border-amber-100'
            }`}>
              <StatusIcon size={20} />
            </div>
            <div>
              <h3 className="font-black text-slate-900 text-sm sm:text-base leading-tight">
                Ajukan Keterangan
              </h3>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[11px] font-bold mt-0.5">
                <Calendar size={11} className="text-slate-500" />
                <span>{formDay} {MONTH_NAMES[filter.month - 1]} {filter.year}</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={closeForm}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-all cursor-pointer border border-slate-200/60"
            title="Tutup (Esc)"
            aria-label="Tutup"
          >
            <X size={16} />
          </button>
        </div>

        {/* BODY FORM */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-y-auto custom-scrollbar">
          <div className="p-4 sm:p-5 flex flex-col gap-4">

            {/* PILIHAN STATUS: 3 Kartu Modern */}
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">
                Pilih Jenis Keterangan <span className="text-rose-500">*</span>
              </p>
              <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
                {STATUS_OPTIONS.map(opt => {
                  const Icon = opt.icon;
                  const isSelected = formStatus === opt.id;
                  return (
                    <button
                      type="button"
                      key={opt.id}
                      onClick={() => setFormStatus(opt.id)}
                      className={`py-3 px-2 rounded-2xl border text-center flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        isSelected 
                          ? `${opt.activeBadge} scale-[1.02] ring-2 ring-offset-1` 
                          : 'bg-slate-50/70 text-slate-700 border-slate-200/80 hover:bg-white hover:border-slate-300'
                      }`}
                    >
                      <Icon size={18} className={isSelected ? 'text-white' : opt.iconColor} />
                      <span className="text-xs font-black leading-tight">{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* QUICK TEMPLATE CHIPS: 1-Tap Alasan */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Pilih Cepat Alasan (1 Tap)
                </p>
                <span className="text-[10px] text-slate-400 font-medium">Opsional</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {quickTags.map((tag, idx) => (
                  <button
                    type="button"
                    key={idx}
                    onClick={() => setFormNote(prev => prev ? `${prev}, ${tag}` : tag)}
                    className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200/90 text-slate-600 active:scale-95 text-[10.5px] font-semibold transition-all border border-slate-200/70 cursor-pointer"
                  >
                    + {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* KETERANGAN / ALASAN */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Rincian Alasan <span className="text-rose-500">*</span>
                </label>
                {formNote && (
                  <button
                    type="button"
                    onClick={() => setFormNote('')}
                    className="text-[10px] text-rose-500 hover:underline cursor-pointer border-none bg-transparent font-medium"
                  >
                    Hapus Teks
                  </button>
                )}
              </div>
              <textarea
                value={formNote}
                onChange={e => setFormNote(e.target.value)}
                required
                rows={3}
                placeholder={
                  formStatus === 'Sakit' 
                    ? 'Tuliskan rincian keluhan sakit atau saran dokter...' 
                    : formStatus === 'Izin' 
                      ? 'Tuliskan keperluan atau alasan izin...' 
                      : 'Tuliskan rincian surat tugas atau kegiatan dinas...'
                }
                className="w-full border border-slate-200 bg-slate-50/70 focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 focus:outline-none rounded-2xl p-3.5 text-xs sm:text-sm font-medium resize-none transition-all placeholder:text-slate-400"
              />
            </div>

            {/* UNGGAH BUKTI / SURAT DOKTER */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Bukti / Surat Dokter (Opsional)
                </span>
                <span className="text-[10px] text-slate-400">Maks. 5MB</span>
              </div>
              
              {formFileName ? (
                <div className="flex items-center justify-between p-3 bg-emerald-50/50 border border-emerald-200/80 rounded-2xl">
                  <div className="flex items-center gap-3 overflow-hidden">
                    {formPreview ? (
                      <img src={formPreview} alt="Preview" className="w-11 h-11 object-cover rounded-xl border border-emerald-200 shrink-0 shadow-xs" />
                    ) : (
                      <div className="w-11 h-11 rounded-xl bg-emerald-100/70 text-emerald-600 flex items-center justify-center shrink-0">
                        <FileText size={20} />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-xs font-black text-slate-800 truncate">{formFileName}</p>
                      <p className="text-[10.5px] text-emerald-700 font-bold flex items-center gap-1 mt-0.5">
                        <CheckCircle2 size={12} className="text-emerald-600" />
                        Siap dilampirkan
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setFormFile(null); setFormFileName(''); setFormPreview(null); }}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer border-none bg-transparent"
                    title="Hapus berkas"
                  >
                    <Trash2 size={17} />
                  </button>
                </div>
              ) : (
                <label className="flex items-center justify-between p-3 rounded-2xl border-2 border-dashed border-slate-200 hover:border-emerald-500 bg-slate-50/60 hover:bg-emerald-50/30 cursor-pointer transition-all group">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 group-hover:border-emerald-300 text-slate-400 group-hover:text-emerald-600 flex items-center justify-center shrink-0 transition-colors shadow-2xs">
                      <Upload size={18} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-700 group-hover:text-slate-900 leading-tight">
                        Upload Surat / Foto Bukti
                      </p>
                      <p className="text-[10.5px] text-slate-400 mt-0.5">
                        JPG, PNG, atau PDF
                      </p>
                    </div>
                  </div>
                  <span className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-600 text-[11px] font-bold group-hover:bg-emerald-600 group-hover:text-white group-hover:border-emerald-600 transition-all shadow-2xs">
                    Pilih File
                  </span>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            {/* STATUS / NOTIFIKASI SUBMIT */}
            {submitMsg && (
              <div className={`text-xs font-bold px-4 py-3 rounded-2xl flex items-center gap-2.5 ${
                submitMsg === 'success' 
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                  : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}>
                {submitMsg === 'success' ? (
                  <>
                    <CheckCircle2 size={17} className="shrink-0 text-emerald-600" />
                    <span>Pengajuan berhasil dikirim dan menunggu verifikasi!</span>
                  </>
                ) : (
                  <>
                    <AlertCircle size={17} className="shrink-0 text-rose-600" />
                    <span>{submitMsg}</span>
                  </>
                )}
              </div>
            )}
          </div>

          {/* FOOTER ACTIONS */}
          <div className="sticky bottom-0 bg-white/95 backdrop-blur-md border-t border-slate-100 p-3.5 sm:p-4 flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={closeForm}
              disabled={submitting}
              className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-600 transition-all cursor-pointer text-center active:scale-95 disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-[2] py-2.5 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-xs font-bold text-white shadow-xs active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2 border-none disabled:opacity-60"
            >
              <Send size={14} />
              <span>{submitting ? 'Mengirim...' : 'Kirim Pengajuan'}</span>
            </button>
          </div>
        </form>
      </div>
    );
  };

  /* ---------- RENDER ---------- */
  return (
    <div className="w-full flex flex-col gap-3.5 animate-in fade-in duration-300 pb-28 sm:pb-12">

      {/* HERO HEADER: Compact & Responsive */}
      <div
        className="rounded-xl sm:rounded-2xl px-3.5 sm:px-6 py-3 sm:py-4 relative overflow-hidden text-white shadow-sm"
        style={{ background:'linear-gradient(135deg, var(--ui-primary) 0%, color-mix(in srgb, var(--ui-primary) 75%, black) 100%)' }}
      >
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute top-0 right-0 w-60 h-60 rounded-full border-[28px] border-white -mr-14 -mt-14" />
          <div className="absolute bottom-0 left-1/3 w-28 h-28 rounded-full border-[12px] border-white -mb-8" />
        </div>
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 sm:gap-3.5">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            {/* Tombol Back */}
            <button
              type="button"
              onClick={handleBack}
              className="p-2 sm:p-2.5 bg-white/15 hover:bg-white/25 active:scale-95 border border-white/25 text-white rounded-lg sm:rounded-xl transition-all cursor-pointer shrink-0 flex items-center justify-center shadow-xs"
              title="Kembali ke Beranda"
              aria-label="Kembali ke Beranda"
            >
              <ArrowLeft size={16} strokeWidth={2.5} />
            </button>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="inline-flex items-center gap-1 px-1.5 py-0.2 sm:px-2 sm:py-0.5 rounded-full bg-white/15 border border-white/20 text-white/90 text-[9px] sm:text-[10px] font-black uppercase tracking-wider backdrop-blur-xs">
                  <Fingerprint size={10} className="text-white shrink-0" />
                  <span>Data Biometrik Hikvision</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
                </span>
              </div>
              <h1 className="text-base sm:text-2xl font-black tracking-tight leading-tight truncate">Absensi Saya</h1>
              <p className="text-white/80 text-[10.5px] sm:text-xs font-medium truncate mt-0.5">
                {teacherName} {teacherNIP ? `(NIP: ${teacherNIP})` : (teacherCode ? `(ID: ${teacherCode})` : '')} • {MONTH_NAMES[filter.month-1]} {filter.year}
              </p>
            </div>
          </div>

          <button
            onClick={handleDownloadPDF}
            className="flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 bg-white/15 hover:bg-white/25 active:scale-95 border border-white/25 text-white text-[11px] sm:text-xs font-bold rounded-lg sm:rounded-xl transition-all cursor-pointer w-fit shrink-0 self-end sm:self-auto shadow-xs"
          >
            <Download size={13} strokeWidth={2.4} />
            <span>Download PDF</span>
          </button>
        </div>
      </div>

      {/* STATS CARDS: Compact 5-Column Single Row Layout (Mobile & Desktop) */}
      <div className="grid grid-cols-5 gap-1.5 sm:gap-3">
        {[
          { 
            label: 'Hadir', 
            shortLabel: 'Hadir',
            value: stats.hadir, 
            icon: CheckCircle2,
            iconBg: 'bg-emerald-50 border-emerald-200/80 text-emerald-700',
            textColor: 'text-emerald-700',
            bg: 'bg-emerald-50/20 border-emerald-200/70',
            hoverBorder: 'hover:border-emerald-300'
          },
          { 
            label: 'Terlambat', 
            shortLabel: 'Telat',
            value: stats.terlambat, 
            icon: Clock,
            iconBg: 'bg-amber-50 border-amber-200/80 text-amber-700',
            textColor: 'text-amber-700',
            bg: 'bg-amber-50/20 border-amber-200/70',
            hoverBorder: 'hover:border-amber-300'
          },
          { 
            label: 'Izin', 
            shortLabel: 'Izin',
            value: stats.izin, 
            icon: FileText,
            iconBg: 'bg-indigo-50 border-indigo-200/80 text-indigo-700',
            textColor: 'text-indigo-700',
            bg: 'bg-indigo-50/20 border-indigo-200/70',
            hoverBorder: 'hover:border-indigo-300'
          },
          { 
            label: 'Sakit', 
            shortLabel: 'Sakit',
            value: stats.sakit, 
            icon: HeartPulse,
            iconBg: 'bg-yellow-50 border-yellow-200/80 text-yellow-800',
            textColor: 'text-yellow-700',
            bg: 'bg-yellow-50/20 border-yellow-200/70',
            hoverBorder: 'hover:border-yellow-300'
          },
          { 
            label: 'Alpa', 
            shortLabel: 'Alpa',
            value: stats.alpa, 
            icon: AlertCircle,
            iconBg: 'bg-rose-50 border-rose-200/80 text-rose-700',
            textColor: 'text-rose-700',
            bg: 'bg-rose-50/20 border-rose-200/70',
            hoverBorder: 'hover:border-rose-300'
          },
        ].map(s => {
          const Icon = s.icon;
          return (
            <div 
              key={s.label} 
              className={`ui-card bg-white border ${s.bg} ${s.hoverBorder} rounded-xl sm:rounded-2xl p-1.5 sm:p-3 flex flex-col items-center sm:items-start justify-between shadow-2xs hover:shadow-xs transition-all group min-w-0`}
            >
              <div className="flex items-center justify-between gap-1 w-full">
                <span className="text-[8px] sm:text-[10.5px] font-black uppercase tracking-wider text-slate-500 truncate">
                  <span className="sm:hidden">{s.shortLabel}</span>
                  <span className="hidden sm:inline">{s.label}</span>
                </span>
                <div className={`w-4 h-4 sm:w-6 sm:h-6 rounded sm:rounded-lg border ${s.iconBg} flex items-center justify-center shrink-0 shadow-2xs`}>
                  <Icon size={11} strokeWidth={2.4} />
                </div>
              </div>

              <div className="flex items-baseline justify-center sm:justify-start gap-1 mt-1 sm:mt-1.5 w-full">
                <span className="text-sm sm:text-2xl font-black text-slate-800 tracking-tight leading-none">
                  {s.value}
                </span>
                <span className="text-[7.5px] sm:text-[10px] font-bold text-slate-400 leading-none">
                  hari
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* CALENDAR MATRIX CARD */}
      <div className="ui-card bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden w-full">
        {/* Navigasi Kalender */}
        <div className="flex items-center justify-between px-3 sm:px-5 py-3 border-b border-slate-100 bg-white">
          <div className="flex items-center gap-1.5">
            <button 
              onClick={prevMonth} 
              className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200/80 text-slate-600 transition-all cursor-pointer active:scale-95"
              title="Bulan Sebelumnya"
            >
              <ChevronLeft size={16} strokeWidth={2.4} />
            </button>
            {!isCurrentMonth && (
              <button
                onClick={goToCurrentMonth}
                className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200/80 text-slate-700 text-xs font-bold transition-all cursor-pointer active:scale-95"
                title="Kembali ke Bulan Ini"
              >
                <Calendar size={12} strokeWidth={2.2} className="text-primary" />
                <span>Bulan Ini</span>
              </button>
            )}
          </div>

          <div className="text-center flex flex-col items-center">
            <div className="flex items-center gap-2">
              <h2 className="font-black text-slate-800 text-sm sm:text-base tracking-tight">
                {MONTH_NAMES[filter.month-1]} {filter.year}
              </h2>
              {isCurrentMonth && (
                <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-1.5 py-0.2 rounded-md">
                  Periode Aktif
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-400 font-medium mt-0.5">
              Klik tanggal untuk ajukan surat izin / keterangan atau melihat detail scan
            </p>
            {loading && <span className="text-[9px] text-primary font-bold animate-pulse mt-0.5">Menyinkronkan data...</span>}
          </div>

          <div className="flex items-center gap-1.5">
            <button 
              onClick={nextMonth} 
              disabled={isCurrentMonth} 
              className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200/80 text-slate-600 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed active:scale-95"
              title="Bulan Berikutnya"
            >
              <ChevronRight size={16} strokeWidth={2.4} />
            </button>
          </div>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 bg-slate-50/80 border-b border-slate-100 select-none">
          {DAY_NAMES_SHORT.map(d => {
            const isWk = d === 'Min' || d === 'Sab';
            return (
              <div 
                key={d} 
                className={`py-2 text-center text-[10.5px] font-extrabold uppercase tracking-wider ${
                  isWk ? 'text-rose-500 bg-rose-50/30' : 'text-slate-500'
                }`}
              >
                {d}
              </div>
            );
          })}
        </div>

        {/* Calendar Grid Cells */}
        <div className="grid grid-cols-7 divide-x divide-y divide-slate-100">
          {calendarGrid.map((day, idx) => {
            if (day === null) return <div key={`e-${idx}`} className="min-h-[70px] sm:min-h-[96px] bg-slate-50/40" />;

            const dayData    = myData?.days?.[day];
            const style      = getStatusStyle(dayData);
            const isToday    = isCurrentMonth && day === today.getDate();
            const isFuture   = isCurrentMonth && day > today.getDate();
            const isWeekend  = [0,6].includes(new Date(filter.year, filter.month-1, day).getDay());
            const isSelected = selectedDay === day;

            // Extract times for display inside cell
            const showIn  = dayData && !dayData.isManual && Boolean(dayData.in) && /^\d{1,2}:\d{2}/.test(String(dayData.in).trim());
            const showOut = dayData && !dayData.isManual && Boolean(dayData.out) && /^\d{1,2}:\d{2}/.test(String(dayData.out).trim());

            const currentDateStr = `${filter.year}-${String(filter.month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
            const dayEvent = academicCalendar.find(evt => evt.dateStart <= currentDateStr && evt.dateEnd >= currentDateStr);
            const isHolidayEvent = dayEvent && (dayEvent.categoryId === 'cal-c5' || dayEvent.title.toLowerCase().includes('libur'));

            return (
              <button
                key={day}
                type="button"
                onClick={() => openForm(day)}
                className={`
                  min-h-[70px] sm:min-h-[96px] w-full flex flex-col items-center pt-1.5 pb-2 px-1 gap-1
                  transition-all cursor-pointer border-none text-left relative group
                  ${isSelected ? 'bg-emerald-50/60 ring-2 ring-inset ring-emerald-500 z-10' : isFuture ? 'bg-slate-50/40 hover:bg-slate-100/70' : isWeekend ? 'bg-slate-50/30 hover:bg-slate-100/60' : 'bg-white hover:bg-slate-50/90'}
                `}
                title={`Klik tanggal ${day} untuk ajukan surat keterangan / izin`}
              >
                {/* Date number */}
                <span className={`
                  w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded-full text-xs font-black shrink-0 transition-transform group-hover:scale-105
                  ${isToday 
                    ? 'bg-emerald-600 text-white shadow-2xs ring-2 ring-emerald-200' 
                    : isWeekend 
                      ? 'text-rose-500 font-extrabold' 
                      : isFuture 
                        ? 'text-slate-400 font-medium' 
                        : 'text-slate-700 font-bold'
                  }
                `}>
                  {day}
                </span>

                {/* Status pill (desktop) */}
                {style && (
                  <div className={`hidden sm:flex items-center gap-1 px-1.5 py-0.5 rounded-md ${style.bg} border ${style.border} max-w-full shadow-2xs`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${style.dot} shrink-0`} />
                    <span className={`text-[8.5px] font-black ${style.text} truncate leading-tight`}>{style.label}</span>
                  </div>
                )}

                {/* Jam Masuk & Keluar */}
                {(showIn || showOut) && (
                  <div className="flex flex-col items-center w-full px-0 sm:px-1 gap-0.5 mt-0.5">
                    <div className="flex items-center gap-1 w-full justify-center">
                      {!showIn ? (
                        <span className="text-[7.5px] font-extrabold text-rose-600 px-1 py-0.2 rounded bg-rose-50 border border-rose-100 flex items-center gap-0.5 leading-none">
                          <span className="w-1 h-1 rounded-full bg-rose-500 shrink-0" />
                          <span>Tdk Absen</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded bg-emerald-50 text-emerald-800 text-[8px] font-bold border border-emerald-200/60 leading-tight">
                          <Clock size={8} className="text-emerald-600 shrink-0" />
                          <span>{fmt5(dayData.in)}</span>
                        </span>
                      )}
                    </div>
                    {showOut && (
                      <div className="flex items-center gap-1 w-full justify-center">
                        <span className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded bg-slate-100 text-slate-700 text-[8px] font-bold border border-slate-200/60 leading-tight">
                          <span className="text-[7px] text-slate-400">P</span>
                          <span>{fmt5(dayData.out)}</span>
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Info Hari Kosong (Libur/Event) */}
                {!style && !showIn && !isFuture && (
                  <div className="flex flex-col items-center justify-center w-full px-0.5 mt-1 grow">
                    {dayEvent ? (
                      <span className={`text-[7.5px] font-extrabold uppercase tracking-wider text-center leading-tight px-1 py-0.5 rounded ${isHolidayEvent ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-slate-100 text-slate-600 border border-slate-200'}`}>
                        {dayEvent.title}
                      </span>
                    ) : isWeekend ? (
                      <span className="text-[7.5px] font-extrabold text-rose-500/90 uppercase tracking-wider text-center leading-tight px-1 py-0.5 rounded bg-rose-50/80 border border-rose-100/80">
                        Akhir Pekan
                      </span>
                    ) : null}
                  </div>
                )}

                {/* Mobile: dot indicator */}
                {style && <span className={`sm:hidden w-1.5 h-1.5 rounded-full ${style.dot} ${showIn ? 'mt-0.5' : 'mt-1'}`} />}
              </button>
            );
          })}
        </div>

        {/* Legend: Strict UI Compliance Badge Pill Pastel */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 px-3 sm:px-5 py-3 border-t border-slate-100 bg-slate-50/60">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            {LEGEND.map(l => (
              <span 
                key={l.label} 
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[var(--ui-radius-small)] ${l.bg} ${l.text} border ${l.border} text-[10px] font-bold shadow-2xs`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${l.dot} shrink-0`} />
                <span>{l.label}</span>
              </span>
            ))}
          </div>
          <div className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-500 bg-white border border-slate-200/80 px-2.5 py-1 rounded-lg shadow-2xs">
            <Info size={12} className="text-slate-400 shrink-0" />
            <span>Klik tanggal untuk langsung mengajukan surat / izin</span>
          </div>
        </div>
      </div>

      {/* DAY DETAIL CARD */}
      {selectedDay != null && (
        <div className={`rounded-2xl border overflow-hidden shadow-xs transition-all ${selectedDayStyle ? `${selectedDayStyle.bg} ${selectedDayStyle.border}` : 'bg-white border-slate-200/90'}`}>
          <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 border-b border-black/5 bg-white/50">
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-0.5">Detail Kehadiran</p>
              <h3 className="font-black text-slate-800 text-sm sm:text-base">
                {DAY_NAMES_FULL[new Date(filter.year, filter.month-1, selectedDay).getDay()]}, {selectedDay} {MONTH_NAMES[filter.month-1]} {filter.year}
              </h3>
            </div>
            <div className="flex items-center gap-2">
              {selectedDayStyle && (
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase border ${selectedDayStyle.bg} ${selectedDayStyle.text} ${selectedDayStyle.border} shadow-2xs`}>
                  {selectedDayStyle.label}
                </span>
              )}
              <button
                type="button"
                onClick={() => openForm(selectedDay)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200/90 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer shadow-2xs active:scale-95"
              >
                <FileText size={12} className="text-primary" />
                <span>{selectedDayData?.isManual ? 'Ubah Keterangan' : 'Ajukan Keterangan'}</span>
              </button>
            </div>
          </div>

          <div className="p-4 sm:p-5">
            {selectedDayData ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {selectedDayData.isManual ? (
                  <div className="sm:col-span-2 bg-white/70 rounded-[var(--ui-radius-small)] p-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Keterangan Dicatat</p>
                    <p className="font-black text-slate-700 text-base">{selectedDayData.status}</p>
                    {selectedDayData.note && !/koreksi|override|super\s*admin/i.test(selectedDayData.note) && (
                      <p className="text-xs text-slate-500 mt-1.5 font-medium leading-relaxed">{selectedDayData.note}</p>
                    )}
                  </div>
                ) : (
                  <>
                    {/* Jam Masuk */}
                    <div className="bg-white/70 rounded-[var(--ui-radius-small)] p-4 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-[var(--ui-radius-small)] bg-emerald-100 flex items-center justify-center shrink-0">
                        <Clock size={15} className="text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Jam Masuk</p>
                        <p className="font-black text-slate-700 text-2xl">{fmt5(selectedDayData.in)}</p>
                        {selectedDayData.isLate && (
                          <p className="text-[10px] text-amber-600 font-black mt-0.5 flex items-center gap-1">
                            <AlertCircle size={11} className="text-amber-600 shrink-0" />
                            <span>Terlambat</span>
                          </p>
                        )}
                      </div>
                    </div>
                    {/* Jam Pulang */}
                    <div className="bg-white/70 rounded-[var(--ui-radius-small)] p-4 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-[var(--ui-radius-small)] bg-slate-100 flex items-center justify-center shrink-0">
                        <Clock size={15} className="text-slate-500" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Jam Pulang</p>
                        <p className={`font-black text-2xl ${selectedDayData.out ? 'text-slate-700' : 'text-slate-300'}`}>
                          {fmt5(selectedDayData.out)}
                        </p>
                        {!selectedDayData.out && (
                          <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Belum terekam</p>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="text-center py-4 flex flex-col items-center gap-2">
                <MinusCircle size={24} className="text-slate-300" />
                <p className="text-sm font-bold text-slate-400">Tidak ada catatan absensi untuk hari ini</p>
                <p className="text-xs text-slate-400">Hari libur, atau data belum tersinkronisasi dari mesin fingerprint</p>
              </div>
            )}
          </div>
        </div>
      )}





      {/* ================= PENGAJUAN SURAT SAKIT / IZIN ================= */}
      {showForm && (
        <>
          {/* DI DESKTOP: MODAL DIALOG POP-UP MENGAMBANG */}
          <div 
            className="hidden sm:flex fixed inset-0 z-[1050] bg-slate-950/65 backdrop-blur-xs items-center justify-center p-4 animate-in fade-in duration-200"
            onClick={(e) => { if (e.target === e.currentTarget) closeForm(); }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-keterangan-title"
          >
            <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 max-h-[90vh]">
              {renderFormContent(true)}
            </div>
          </div>

          {/* DI MOBILE: BOTTOM SHEET YANG MUNCUL DARI BAWAH (DI ATAS TABBAR) */}
          <div 
            className="sm:hidden fixed inset-0 z-[95] bg-slate-950/45 backdrop-blur-xs flex flex-col justify-end animate-in fade-in duration-200"
            onClick={(e) => { if (e.target === e.currentTarget) closeForm(); }}
            role="dialog"
            aria-modal="true"
          >
            <div 
              ref={mobileFormRef}
              className="w-full bg-white rounded-t-[26px] border-t border-slate-200/80 shadow-[0_-14px_35px_rgba(0,0,0,0.18)] overflow-hidden flex flex-col max-h-[86vh] mb-[calc(56px+env(safe-area-inset-bottom,0px))] animate-in slide-in-from-bottom duration-300"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Drag Handle Bar halus di bagian paling atas */}
              <div 
                className="w-full pt-3 pb-1 flex justify-center cursor-pointer bg-white active:bg-slate-50 shrink-0"
                onClick={closeForm}
              >
                <div className="w-10 h-1 rounded-full bg-slate-300" />
              </div>

              {renderFormContent(false)}
            </div>
          </div>
        </>
      )}

      {/* No data */}
      {!myData && !loading && (
        <div className="bg-amber-50 border border-amber-200 rounded-[var(--ui-radius-card)] p-5 text-center">
          <Fingerprint size={28} className="text-amber-400 mx-auto mb-2" />
          <p className="font-black text-amber-700 text-sm">Data absensi fingerprint belum tersedia</p>
          <p className="text-xs text-amber-600 mt-1 font-medium">Pastikan ID Anda sudah didaftarkan di mesin fingerprint Hikvision dan data telah disinkronisasi oleh admin.</p>
        </div>
      )}
    </div>
  );
}
