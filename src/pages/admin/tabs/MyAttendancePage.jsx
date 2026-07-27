import React, { useState, useEffect, useCallback, useMemo } from 'react';
import useAuthStore from '../../../store/monitoring/authStore.js';
import { ChevronLeft, ChevronRight, Clock, MinusCircle, Fingerprint, Download, Send, X, FileText } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getDatabaseSnapshot } from '../../../utils/dataSource.js';

const MONTH_NAMES = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
const DAY_NAMES_FULL = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
const DAY_NAMES_SHORT = ['Min','Sen','Sel','Rab','Kam','Jum','Sab'];

function getStatusStyle(dayData) {
  if (!dayData) return null;
  if (dayData.isManual) {
    const s = dayData.status;
    if (s === 'Izin')       return { bg:'bg-blue-100',   text:'text-blue-700',   border:'border-blue-200',   label:'Izin',      dot:'bg-blue-500' };
    if (s === 'Sakit')      return { bg:'bg-yellow-100', text:'text-yellow-700', border:'border-yellow-200', label:'Sakit',     dot:'bg-yellow-500' };
    if (s === 'Dinas Luar') return { bg:'bg-purple-100', text:'text-purple-700', border:'border-purple-200', label:'Dinas',     dot:'bg-purple-500' };
    if (s === 'Alpa')       return { bg:'bg-red-100',    text:'text-red-700',    border:'border-red-200',    label:'Alpa',      dot:'bg-red-500' };
  }
  if (dayData.in) {
    if (dayData.isLate)     return { bg:'bg-amber-100',  text:'text-amber-700',  border:'border-amber-200',  label:'Terlambat', dot:'bg-amber-500' };
    return                         { bg:'bg-emerald-100',text:'text-emerald-700',border:'border-emerald-200',label:'Hadir',     dot:'bg-emerald-500' };
  }
  return null;
}

const LEGEND = [
  { dot:'bg-emerald-500', label:'Hadir' },
  { dot:'bg-amber-500',   label:'Terlambat' },
  { dot:'bg-blue-500',    label:'Izin' },
  { dot:'bg-yellow-500',  label:'Sakit' },
  { dot:'bg-purple-500',  label:'Dinas Luar' },
  { dot:'bg-red-500',     label:'Alpa' },
];

// Helper
function isFutureDay(day, filter, today) {
  return new Date(filter.year, filter.month - 1, day) > new Date(today.getFullYear(), today.getMonth(), today.getDate());
}

function fmt5(t) { return t ? String(t).substring(0, 5) : '-'; }

export default function MyAttendancePage() {
  const user        = useAuthStore(state => state.user);
  const authToken   = user?.authToken;
  const teacherCode = user?.teacherCode || user?.code || user?.username;
  const teacherName = user?.name || user?.username || '';
  const teacherNIP  = user?.nip || '';

  const today = new Date();
  const [filter, setFilter]   = useState({ month: today.getMonth() + 1, year: today.getFullYear() });
  const [myData, setMyData]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);
  const [daysInMonth, setDaysInMonth] = useState(new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate());

  // Form state
  const [showForm, setShowForm]     = useState(false);
  const [formDay, setFormDay]       = useState(null);
  const [formStatus, setFormStatus] = useState('Izin');
  const [formNote, setFormNote]     = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg]   = useState('');

  const fetchData = useCallback(async () => {
    if (!authToken) return;
    setLoading(true);
    setSelectedDay(null);
    try {
      const res = await fetch('/api/hikvision/report/matrix', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${authToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...filter, type: 'guru' }),
      });
      const json = await res.json();
      if (json.ok && json.data) {
        setDaysInMonth(json.daysInMonth || new Date(filter.year, filter.month, 0).getDate());
        const me = json.data.find(d => String(d.nis).toLowerCase() === String(teacherCode).toLowerCase());
        setMyData(me || null);
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [authToken, filter, teacherCode]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const prevMonth = () => setFilter(f => f.month === 1  ? { month:12, year:f.year-1 } : { ...f, month:f.month-1 });
  const nextMonth = () => setFilter(f => f.month === 12 ? { month:1,  year:f.year+1 } : { ...f, month:f.month+1 });

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
  const handleDownloadPDF = () => {
    try {
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
            ketStr    = dd.note || '';
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

  /* ---------- Form keterangan ---------- */
  const openForm = (day) => {
    const dd = myData?.days?.[day];
    setFormDay(day);
    setFormStatus(dd?.status || 'Izin');
    setFormNote(dd?.note || '');
    setSubmitMsg('');
    setShowForm(true);
  };
  const closeForm = () => { setShowForm(false); setSubmitMsg(''); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitMsg('');
    try {
      const dateStr = `${filter.year}-${String(filter.month).padStart(2,'0')}-${String(formDay).padStart(2,'0')}`;
      const res = await fetch('/api/hikvision/manual-attendance', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${authToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ teacherCode, date: dateStr, status: formStatus, note: formNote }),
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

  /* ---------- RENDER ---------- */
  return (
    <div className="w-full flex flex-col gap-3 animate-in fade-in duration-300 pb-10">

      {/* HEADER */}
      <div
        className="rounded-[var(--ui-radius-card)] px-5 py-4 relative overflow-hidden text-white"
        style={{ background:'linear-gradient(135deg, var(--ui-primary) 0%, color-mix(in srgb, var(--ui-primary) 65%, black) 100%)' }}
      >
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute top-0 right-0 w-52 h-52 rounded-full border-[26px] border-white -mr-12 -mt-12" />
          <div className="absolute bottom-0 left-1/3 w-24 h-24 rounded-full border-[11px] border-white -mb-7" />
        </div>
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <Fingerprint size={12} className="text-white/70" />
              <span className="text-white/70 text-[10px] font-black uppercase tracking-widest">Data Fingerprint Hikvision</span>
            </div>
            <h1 className="text-xl md:text-2xl font-black tracking-tight">Absensi Saya</h1>
            <p className="text-white/65 text-xs font-medium mt-0.5">Rekap kehadiran perorangan — {MONTH_NAMES[filter.month-1]} {filter.year}</p>
          </div>
          <button
            onClick={handleDownloadPDF}
            className="flex items-center gap-2 px-4 py-2 bg-white/15 hover:bg-white/25 border border-white/20 text-white text-xs font-black rounded-[var(--ui-radius-small)] transition-all cursor-pointer w-fit shrink-0"
          >
            <Download size={13} />
            Download PDF
          </button>
        </div>
      </div>

      {/* STATS compact */}
      <div className="grid grid-cols-5 gap-2">
        {[
          { label:'Hadir',     value:stats.hadir,     dot:'bg-emerald-500', bg:'bg-emerald-50', text:'text-emerald-700' },
          { label:'Terlambat', value:stats.terlambat, dot:'bg-amber-500',   bg:'bg-amber-50',   text:'text-amber-700' },
          { label:'Izin',      value:stats.izin,      dot:'bg-blue-500',    bg:'bg-blue-50',    text:'text-blue-700' },
          { label:'Sakit',     value:stats.sakit,     dot:'bg-yellow-500',  bg:'bg-yellow-50',  text:'text-yellow-700' },
          { label:'Alpa',      value:stats.alpa,      dot:'bg-red-500',     bg:'bg-red-50',     text:'text-red-700' },
        ].map(s => (
          <div key={s.label} className={`${s.bg} rounded-[var(--ui-radius-small)] px-2 py-2.5 flex flex-col items-center gap-0.5`}>
            <span className={`w-2 h-2 rounded-full ${s.dot}`} />
            <span className={`text-[18px] font-black leading-none ${s.text}`}>{s.value}</span>
            <span className={`text-[9px] font-black uppercase tracking-wider ${s.text} opacity-60 text-center leading-tight`}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* CALENDAR */}
      <div className="bg-white rounded-[var(--ui-radius-card)] shadow-sm border border-slate-100 overflow-hidden w-full">
        {/* Nav */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <button onClick={prevMonth} className="w-9.5 h-9.5 flex items-center justify-center rounded-xl hover:bg-slate-100 transition-colors cursor-pointer border-none bg-transparent">
            <ChevronLeft size={18} className="text-slate-600" />
          </button>
          <div className="text-center">
            <h2 className="font-black text-slate-800 text-sm">{MONTH_NAMES[filter.month-1]} {filter.year}</h2>
            {loading && <span className="text-[9px] text-slate-400 font-medium animate-pulse">Memuat...</span>}
          </div>
          <button onClick={nextMonth} disabled={isCurrentMonth} className="w-9.5 h-9.5 flex items-center justify-center rounded-xl hover:bg-slate-100 transition-colors cursor-pointer border-none bg-transparent disabled:opacity-25 disabled:cursor-not-allowed">
            <ChevronRight size={18} className="text-slate-600" />
          </button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-100">
          {DAY_NAMES_SHORT.map(d => (
            <div key={d} className={`py-2 text-center text-[10px] font-black uppercase tracking-widest ${d==='Min'||d==='Sab' ? 'text-red-400' : 'text-slate-400'}`}>
              {d}
            </div>
          ))}
        </div>

        {/* Cells */}
        <div className="grid grid-cols-7 divide-x divide-y divide-slate-100">
          {calendarGrid.map((day, idx) => {
            if (day === null) return <div key={`e-${idx}`} className="min-h-[80px] md:min-h-[90px] bg-slate-50/50" />;

            const dayData    = myData?.days?.[day];
            const style      = getStatusStyle(dayData);
            const isToday    = isCurrentMonth && day === today.getDate();
            const isFuture   = isCurrentMonth && day > today.getDate();
            const isWeekend  = [0,6].includes(new Date(filter.year, filter.month-1, day).getDay());
            const isSelected = selectedDay === day;

            // Extract times for display inside cell
            const showIn  = dayData && !dayData.isManual && dayData.in;
            const showOut = dayData && !dayData.isManual && dayData.out;

            return (
              <button
                key={day}
                onClick={() => { setSelectedDay(isSelected ? null : day); setShowForm(false); }}
                disabled={isFuture}
                className={`
                  min-h-[80px] md:min-h-[90px] w-full flex flex-col items-center pt-2 pb-2 gap-0.5
                  transition-all cursor-pointer border-none text-left
                  ${isSelected ? 'bg-[var(--ui-primary)]/8 ring-2 ring-inset ring-[var(--ui-primary)] z-10 relative' : isFuture ? 'bg-slate-50/60 opacity-25 cursor-not-allowed' : 'hover:bg-slate-50 bg-white'}
                `}
              >
                {/* Date number */}
                <span className={`
                  w-7 h-7 flex items-center justify-center rounded-full text-xs font-black shrink-0
                  ${isToday ? 'bg-[var(--ui-primary)] text-white' : isWeekend ? 'text-red-400' : 'text-slate-600'}
                `}>
                  {day}
                </span>

                {/* Status pill (desktop) */}
                {style && (
                  <div className={`hidden sm:flex items-center gap-1 px-1.5 py-0.5 rounded-full ${style.bg} border ${style.border} max-w-full`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${style.dot} shrink-0`} />
                    <span className={`text-[8px] font-black ${style.text} truncate`}>{style.label}</span>
                  </div>
                )}

                {/* Jam Masuk & Keluar — shown in cell on desktop */}
                {showIn && (
                  <div className="hidden sm:flex flex-col items-center w-full px-1">
                    <div className="flex items-center gap-0.5 w-full justify-center">
                      <span className="text-[7px] text-emerald-500 font-black">↑</span>
                      <span className="text-[8px] font-black text-emerald-700">{fmt5(dayData.in)}</span>
                    </div>
                    {showOut && (
                      <div className="flex items-center gap-0.5 w-full justify-center">
                        <span className="text-[7px] text-slate-400 font-black">↓</span>
                        <span className="text-[8px] font-black text-slate-500">{fmt5(dayData.out)}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Mobile: dot only */}
                {style && <span className={`sm:hidden w-2 h-2 rounded-full ${style.dot} mt-0.5`} />}
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-4 py-3 border-t border-slate-100 bg-slate-50/50">
          {LEGEND.map(l => (
            <div key={l.label} className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${l.dot}`} />
              <span className="text-[10px] font-semibold text-slate-500">{l.label}</span>
            </div>
          ))}
          <span className="text-[10px] text-slate-400 ml-auto hidden sm:block">↑ Masuk &nbsp; ↓ Pulang</span>
        </div>
      </div>

      {/* DAY DETAIL */}
      {selectedDay != null && (
        <div className={`rounded-[var(--ui-radius-card)] border overflow-hidden ${selectedDayStyle ? `${selectedDayStyle.bg} ${selectedDayStyle.border}` : 'bg-slate-50 border-slate-200'}`}>
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-black/5">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-0.5">Detail Kehadiran</p>
              <h3 className="font-black text-slate-800">
                {DAY_NAMES_FULL[new Date(filter.year, filter.month-1, selectedDay).getDay()]}, {selectedDay} {MONTH_NAMES[filter.month-1]} {filter.year}
              </h3>
            </div>
            <div className="flex items-center gap-2">
              {selectedDayStyle && (
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase border ${selectedDayStyle.bg} ${selectedDayStyle.text} ${selectedDayStyle.border}`}>
                  {selectedDayStyle.label}
                </span>
              )}
              {!isFutureDay(selectedDay, filter, today) && (
                <button
                  onClick={() => openForm(selectedDay)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white/80 hover:bg-white border border-slate-200 text-slate-600 text-[10px] font-black rounded-[var(--ui-radius-small)] transition-all cursor-pointer"
                >
                  <FileText size={11} />
                  Ajukan Keterangan
                </button>
              )}
            </div>
          </div>

          <div className="p-4">
            {selectedDayData ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {selectedDayData.isManual ? (
                  <div className="sm:col-span-2 bg-white/70 rounded-[var(--ui-radius-small)] p-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Keterangan Dicatat</p>
                    <p className="font-black text-slate-700 text-base">{selectedDayData.status}</p>
                    {selectedDayData.note && (
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
                          <p className="text-[10px] text-amber-600 font-black mt-0.5">⚠ Terlambat</p>
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

      {/* FORM KETERANGAN */}
      {showForm && (
        <div className="bg-white rounded-[var(--ui-radius-card)] border border-amber-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 bg-amber-50 border-b border-amber-100">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-amber-600">Ajukan Keterangan</p>
              <h3 className="font-black text-amber-900 text-sm">{formDay} {MONTH_NAMES[filter.month-1]} {filter.year}</h3>
            </div>
            <button onClick={closeForm} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-amber-100 transition-colors cursor-pointer border-none bg-transparent">
              <X size={14} className="text-amber-700" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5 block">Status</label>
              <div className="flex flex-wrap gap-2">
                {['Izin','Sakit','Dinas Luar'].map(s => (
                  <button
                    type="button" key={s}
                    onClick={() => setFormStatus(s)}
                    className={`px-4 py-2 rounded-[var(--ui-radius-small)] text-xs font-black transition-all border cursor-pointer
                      ${formStatus === s ? 'bg-[var(--ui-primary)] text-white border-[var(--ui-primary)]' : 'bg-white text-slate-600 border-slate-200 hover:border-[var(--ui-primary)]'}`}
                  >{s}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5 block">Keterangan / Alasan</label>
              <textarea
                value={formNote} onChange={e => setFormNote(e.target.value)} required
                placeholder={formStatus==='Izin' ? 'Keperluan keluarga mendesak' : formStatus==='Sakit' ? 'Demam, sertakan surat dokter' : 'Menghadiri pelatihan dinas pendidikan'}
                className="w-full border border-slate-200 bg-slate-50 focus:bg-white focus:border-[var(--ui-primary)] focus:outline-none rounded-[var(--ui-radius-small)] p-3 text-sm font-medium min-h-[80px] resize-none transition-colors"
              />
            </div>
            {submitMsg && (
              <div className={`text-xs font-black px-3 py-2 rounded-[var(--ui-radius-small)] ${submitMsg === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                {submitMsg === 'success' ? '✓ Keterangan berhasil disimpan' : submitMsg}
              </div>
            )}
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={closeForm} className="px-4 py-2 rounded-[var(--ui-radius-small)] border border-slate-200 text-xs font-black text-slate-600 hover:bg-slate-50 transition-all cursor-pointer bg-transparent">Batal</button>
              <button type="submit" disabled={submitting} className="flex items-center gap-1.5 px-4 py-2 bg-[var(--ui-primary)] hover:opacity-90 text-white text-xs font-black rounded-[var(--ui-radius-small)] transition-all cursor-pointer border-none disabled:opacity-60">
                <Send size={11} />
                {submitting ? 'Menyimpan...' : 'Kirim Keterangan'}
              </button>
            </div>
          </form>
        </div>
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
