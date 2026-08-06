import { Button, TablePagination } from '../../../components/ui.jsx';
import React, { useState, useEffect, useCallback, useRef } from'react';
import useAuthStore from'../../../store/monitoring/authStore';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { AlertTriangle, FileText, Filter, Search, Printer, ArrowUpDown, FileSpreadsheet, Briefcase } from 'lucide-react';
import { CustomSelect } from '../../../components/CustomSelect.jsx';
import { PageHeader } from'../../../components/monitoring/ui/index.js';
import { getDatabaseSnapshot } from '../../../utils/dataSource.js';
import { compareTableValues } from '../../../utils/adminHelpers.js';


export default function HikvisionStaffReport({ classes = [], isNested = false }) {
  const user = useAuthStore(state => state.user);
  const authToken = user?.authToken;
  
  const [data, setData] = useState([]);
  const [toast, setToast] = useState(null);

  const showToast = (message, type ='success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const [daysInMonth, setDaysInMonth] = useState(31);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  
  const [filter, setFilter] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    class_name: user?.isWalas ? user.walasClass :"all",
    type:"karyawan"
  });

  const [viewMode, setViewMode] = useState("monthly"); //"monthly" |"weekly"
  const [selectedWeek, setSelectedWeek] = useState(1); // 1 to 5

  const daysToRender = React.useMemo(() => {
    let list = [];
    if (viewMode ==="monthly") {
      list = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    } else {
      const startDay = (selectedWeek - 1) * 7 + 1;
      const endDay = Math.min(selectedWeek * 7, daysInMonth);
      for (let d = startDay; d <= endDay; d++) {
        list.push(d);
      }
    }

    const today = new Date();
    const isCurrentMonthYear = filter.month === (today.getMonth() + 1) && filter.year === today.getFullYear();

    if (isCurrentMonthYear && viewMode ==="monthly") {
      const currentDay = today.getDate();
      const pastDays = [];
      for (let i = currentDay; i >= 1; i--) pastDays.push(i);
      const futureDays = [];
      for (let i = daysInMonth; i > currentDay; i--) futureDays.push(i);
      return [...pastDays, ...futureDays];
    }

    return list.reverse();
  }, [viewMode, selectedWeek, daysInMonth, filter.month, filter.year]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/hikvision/report/matrix", {
        method:'POST',
        headers: {"Authorization": `Bearer ${authToken}`,"Content-Type":"application/json"
        },
        body: JSON.stringify(filter)
      });
      const json = await res.json();
      if (json.ok) {
        setData(json.data || []);
        setDaysInMonth(json.daysInMonth || 31);
      } else {
        showToast(json.error ||"Gagal memuat laporan matrix","error");
      }
    } catch (err) {
      console.error(err);
      showToast("Terjadi kesalahan jaringan.","error");
    }
    setLoading(false);
  }, [authToken, filter]);

  useEffect(() => {
    if (user?.isWalas && !user.walasClass) {
       // Walas with no class mapped
       return;
    }
    fetchData();
  }, [fetchData, user?.isWalas, user?.walasClass]);

  const [sortBy, setSortBy] = useState("code");
  const [sortDir, setSortDir] = useState("asc");

  const filteredData = React.useMemo(() => {
    const list = data.filter(d => {
      if (search && !d.name?.toLowerCase().includes(search.toLowerCase()) && !d.nis?.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });

    return list.sort((a, b) => {
      let av, bv;
      if (sortBy === "code" || sortBy === "nis") {
        av = a.nis || a.code;
        bv = b.nis || b.code;
      } else if (sortBy === "name") {
        av = a.name;
        bv = b.name;
      } else if (sortBy === "division") {
        av = a.division;
        bv = b.division;
      } else if (sortBy === "hadir") {
        av = a.total_hadir || 0;
        bv = b.total_hadir || 0;
      } else if (sortBy === "terlambat") {
        av = a.total_terlambat || 0;
        bv = b.total_terlambat || 0;
      } else if (sortBy === "alpa") {
        av = a.total_alpa || 0;
        bv = b.total_alpa || 0;
      } else {
        av = a.nis || a.code;
        bv = b.nis || b.code;
      }
      return compareTableValues(av, bv, sortDir);
    });
  }, [data, search, sortBy, sortDir]);

  const isExportingRef = useRef(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    if (isExportingRef.current) return;
    isExportingRef.current = true;
    setIsExporting(true);

    try {
      if (!filteredData || filteredData.length === 0) return showToast("Tidak ada data untuk diekspor", "warning");

      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Laporan Absensi Karyawan');

      // Define columns
      const columns = [
        { header: 'NIP / Kode', key: 'nis', width: 20 },
        { header: 'Nama Karyawan', key: 'name', width: 35 },
        { header: 'H', key: 'h', width: 5 },
        { header: 'T', key: 't', width: 5 },
        { header: 'I', key: 'i', width: 5 },
        { header: 'S', key: 's', width: 5 },
        { header: 'A', key: 'a', width: 5 }
      ];
      for (let i = 1; i <= daysInMonth; i++) {
        columns.push({ header: i.toString(), key: `d${i}`, width: 10 });
      }
      sheet.columns = columns;

      // Style Header Row
      sheet.getRow(1).eachCell((cell) => {
        cell.font = { bold: true };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF1F5F9' } // slate-100
        };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
          left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
          bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
          right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
        };
      });

      // Populate data
      filteredData.forEach((item) => {
        const rowData = {
          nis: item.nis,
          name: item.name,
          h: item.total_hadir,
          t: item.total_terlambat,
          i: item.total_izin,
          s: item.total_sakit,
          a: item.total_alpa
        };
        
        const row = sheet.addRow(rowData);
        row.getCell('nis').alignment = { vertical: 'middle', wrapText: true };
        row.getCell('name').alignment = { vertical: 'middle', wrapText: true };
        row.getCell('h').alignment = { horizontal: 'center', vertical: 'middle' };
        row.getCell('t').alignment = { horizontal: 'center', vertical: 'middle' };
        row.getCell('i').alignment = { horizontal: 'center', vertical: 'middle' };
        row.getCell('s').alignment = { horizontal: 'center', vertical: 'middle' };
        row.getCell('a').alignment = { horizontal: 'center', vertical: 'middle' };

        for (let i = 1; i <= daysInMonth; i++) {
          const dayData = item.days[i];
          const cell = row.getCell(`d${i}`);
          
          cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
            left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
            bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
            right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
          };

          if (dayData) {
            let content = "-";
            let fgColor = "FFFFFFFF"; // white
            let fontColor = "FF334155"; // slate-700

            if (dayData.taps && dayData.taps.length > 0 && !dayData.isManual) {
              content = dayData.taps.slice(0, 4).map(t => t.substring(0,5)).join('\n');
            } else {
              const status = dayData.status || (dayData.isLate ? "Terlambat" : (dayData.in || dayData.out ? "Hadir" : ""));
              if (status === "Alpa" || status === "Alpa (Tanpa Keterangan)") content = "A";
              else if (status === "Sakit") content = "S";
              else if (status === "Izin") content = "I";
              else if (status === "Terlambat" || status === "Hadir") {
                if (dayData.in || dayData.out) {
                  const tIn = dayData.in ? dayData.in.substring(0,5) : '--:--';
                  const tOut = dayData.out ? dayData.out.substring(0,5) : '--:--';
                  content = `${tIn}\n${tOut}`;
                } else {
                  content = status === "Terlambat" ? "T" : "H";
                }
              }
            }

            const status = dayData.status || (dayData.isLate ? "Terlambat" : (dayData.in || dayData.out ? "Hadir" : "Alpa"));
            
            if (status === 'Hadir') {
              fgColor = "FFDCFCE7"; // emerald-100
              fontColor = "FF166534"; // emerald-800
            } else if (status === 'Terlambat') {
              fgColor = "FFFEE2E2"; // red-100
              fontColor = "FF991B1B"; // red-800
            } else if (status === 'Sakit') {
              fgColor = "FFFEF3C7"; // amber-100
              fontColor = "FF92400E"; // amber-800
            } else if (status === 'Izin') {
              fgColor = "FFDBEAFE"; // blue-100
              fontColor = "FF1E3A8A"; // blue-800
            } else if (status === 'Alpa' || status === 'Alpa (Tanpa Keterangan)') {
              fgColor = "FF0F172A"; // slate-900
              fontColor = "FFFFFFFF"; // white
            }

            cell.value = content;
            cell.font = { color: { argb: fontColor }, bold: true, size: 8 };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fgColor } };
          } else {
            cell.value = "";
          }
        }
      });

      // Legend
      const legendRow = sheet.addRow([]);
      const legendRow2 = sheet.addRow(['Keterangan:']);
      legendRow2.font = { bold: true };
      const legendRow3 = sheet.addRow(['Hadir (H)', 'Terlambat (T)', 'Sakit (S)', 'Izin (I)', 'Alpa (A)']);
      
      // Auto fit rows
      sheet.eachRow((row) => {
        row.commit();
      });

      const buffer = await workbook.xlsx.writeBuffer();
      saveAs(new Blob([buffer]), `Laporan_Absensi_Karyawan_${filter.year}_${filter.month}.xlsx`);
    } catch (err) {
      console.error(err);
      showToast("Gagal mengunduh Excel Karyawan: " + err.message, "error");
    } finally {
      setTimeout(() => {
        isExportingRef.current = false;
        setIsExporting(false);
      }, 1000);
    }
  };

  const handleExportPDF = () => {
    if (isExportingRef.current) return;
    isExportingRef.current = true;
    setIsExporting(true);

    try {
      if (!filteredData || filteredData.length === 0) return showToast("Tidak ada data untuk diekspor", "warning");
      
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: getDatabaseSnapshot()?.appSettings?.defaultPaperSize === 'F4' ? [215, 330] : 'a4'
      });
      
      const months = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
      const monthName = months[filter.month - 1] || "Bulan";
      const startY = 15;

      doc.setFont("Helvetica", "bold");
      doc.setFontSize(12);
      doc.text(`LAPORAN KINERJA & KEHADIRAN KARYAWAN`, 14, startY + 6);
      
      doc.setFontSize(9);
      doc.setFont("Helvetica", "normal");
      doc.text(`Periode: ${monthName} ${filter.year}`, 14, startY + 12);
      
      const headers = [["NIP / Kode", "Nama Karyawan", "H", "T"]];
      for (let i = 1; i <= daysInMonth; i++) {
        headers[0].push(i.toString());
      }

      const body = filteredData.map(item => {
        const row = [
          item.nis || "-",
          (item.name || "").substring(0, 30),
          String(item.total_hadir ?? 0),
          String(item.total_terlambat ?? 0)
        ];
        
        for (let i = 1; i <= daysInMonth; i++) {
          const dayData = (item.days || {})[i];
          if (!dayData) {
            row.push("-");
          } else {
            let content = "-";
            let fillColor = [255, 255, 255];
            let textColor = [51, 65, 85];
            
            if (dayData.taps && dayData.taps.length > 0 && !dayData.isManual) {
              content = dayData.taps.slice(0, 4).map(t => (t || "").substring(0,5)).join('\n');
            } else {
              const status = dayData.status || (dayData.isLate ? "Terlambat" : (dayData.in || dayData.out ? "Hadir" : ""));
              if (status === "Alpa" || status === "Alpa (Tanpa Keterangan)") content = "A";
              else if (status === "Sakit") content = "S";
              else if (status === "Izin") content = "I";
              else if (status === "Terlambat" || status === "Hadir") {
                if (dayData.in || dayData.out) {
                  const tIn = dayData.in ? dayData.in.substring(0,5) : '--:--';
                  const tOut = dayData.out ? dayData.out.substring(0,5) : '--:--';
                  content = `${tIn}\n${tOut}`;
                } else {
                  content = status === "Terlambat" ? "T" : "H";
                }
              }
            }

            const status = dayData.status || (dayData.isLate ? "Terlambat" : (dayData.in || dayData.out ? "Hadir" : "Alpa"));
            
            if (status === 'Hadir') {
              fillColor = [220, 252, 231]; 
              textColor = [22, 101, 52];
            } else if (status === 'Terlambat') {
              fillColor = [254, 226, 226]; 
              textColor = [153, 27, 27];
            } else if (status === 'Sakit') {
              fillColor = [254, 243, 199]; 
              textColor = [146, 64, 14];
            } else if (status === 'Izin') {
              fillColor = [219, 234, 254]; 
              textColor = [30, 58, 138];
            } else if (status === 'Alpa' || status === 'Alpa (Tanpa Keterangan)') {
              fillColor = [15, 23, 42]; 
              textColor = [255, 255, 255];
            }

            if (content.includes(':')) {
               row.push({
                 content,
                 styles: { fillColor, textColor, fontSize: 4, cellPadding: 0.5 }
               });
            } else {
               row.push({
                 content,
                 styles: { fillColor, textColor }
               });
            }
          }
        }
        return row;
      });

      autoTable(doc, {
        startY: startY + 16,
        head: headers,
        body: body,
        theme: 'grid',
        styles: { fontSize: 6, cellPadding: 1, halign: 'center', valign: 'middle', lineColor: [203, 213, 225], lineWidth: 0.1 },
        headStyles: { fillColor: [241, 245, 249], textColor: [51, 65, 85], fontStyle: 'bold' },
        columnStyles: {
          0: { halign: 'left', cellWidth: 20 },
          1: { halign: 'left', cellWidth: 40 },
          2: { cellWidth: 6 },
          3: { cellWidth: 6 },
        }
      });

      const finalY = (doc.lastAutoTable?.finalY || 120) + 10;
      doc.setFontSize(8);
      doc.setFont("Helvetica", "bold");
      doc.text("Keterangan:", 14, finalY);
      
      doc.setFont("Helvetica", "normal");
      doc.setFillColor(220, 252, 231); doc.rect(14, finalY + 3, 4, 4, 'F'); doc.text("Hadir (H)", 20, finalY + 6);
      doc.setFillColor(254, 226, 226); doc.rect(40, finalY + 3, 4, 4, 'F'); doc.text("Terlambat (T)", 46, finalY + 6);
      doc.setFillColor(254, 243, 199); doc.rect(70, finalY + 3, 4, 4, 'F'); doc.text("Sakit (S)", 76, finalY + 6);
      doc.setFillColor(219, 234, 254); doc.rect(95, finalY + 3, 4, 4, 'F'); doc.text("Izin (I)", 101, finalY + 6);
      doc.setFillColor(15, 23, 42);    doc.rect(120, finalY + 3, 4, 4, 'F'); doc.text("Alpa (A)", 126, finalY + 6);
      doc.setDrawColor(200, 200, 200); doc.rect(145, finalY + 3, 4, 4, 'D'); doc.text("Kosong (-)", 151, finalY + 6);
      
      doc.save(`Laporan_Absensi_Karyawan_${filter.year}_${filter.month}.pdf`);
      showToast("Laporan PDF Karyawan berhasil diunduh!", "success");
    } catch (err) {
      console.error("Gagal mengekspor PDF Karyawan:", err);
      showToast("Gagal mengunduh PDF Karyawan: " + err.message, "error");
    } finally {
      setTimeout(() => {
        isExportingRef.current = false;
        setIsExporting(false);
      }, 1000);
    }
  };

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  // Reset page when search or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, filter.month, filter.year, filter.class_name, sortBy, sortDir]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = React.useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredData, currentPage]);

  const monthOptions = [
    { value: 1, label:"Januari" }, { value: 2, label:"Februari" }, { value: 3, label:"Maret" },
    { value: 4, label:"April" }, { value: 5, label:"Mei" }, { value: 6, label:"Juni" },
    { value: 7, label:"Juli" }, { value: 8, label:"Agustus" }, { value: 9, label:"September" },
    { value: 10, label:"Oktober" }, { value: 11, label:"November" }, { value: 12, label:"Desember" }
  ];
  const currentYear = new Date().getFullYear();
  const yearOptions = [currentYear - 1, currentYear, currentYear + 1];

  if (user?.isWalas && !user.walasClass) {
     return (
        <div className="p-8 text-center bg-red-50 rounded-[var(--ui-radius-small)] border border-red-200">
           <AlertTriangle size={48} className="mx-auto text-red-500 mb-4" />
           <h3 className="text-xl font-bold text-red-700">Data Wali Kelas Belum Lengkap</h3>
           <p className="text-red-600 mt-2">Anda terdeteksi sebagai wali kelas, tetapi kelas yang Anda ampu tidak ditemukan atau sudah dihapus.</p>
        </div>
     );
  }

  const getDayBadge = (dayData) => {
    if (!dayData) return <span className="text-[10px] text-slate-300 font-bold">-</span>;
    
    const status = dayData.status || (dayData.isLate ? "Terlambat" : (dayData.in || dayData.out ? "Hadir" : ""));
    
    if (status === "Alpa" || status === "Alpa (Tanpa Keterangan)" || status === "Belum Scan") {
      return (
        <span 
          className="px-1.5 py-1 rounded-[var(--ui-radius-small)] text-[8px] font-black uppercase bg-slate-950 text-white border border-slate-900 block truncate text-center" 
          title={dayData.note || 'Alpa'}
        >
          ALPA
        </span>
      );
    }
    if (status === "Sakit") {
      return (
        <span 
          className="px-1.5 py-1 rounded-[var(--ui-radius-small)] text-[8px] font-black uppercase bg-yellow-50 text-amber-700 border border-yellow-200 block truncate text-center" 
          title={dayData.note || 'Sakit'}
        >
          SAKIT
        </span>
      );
    }
    if (status === "Izin") {
      return (
        <span 
          className="px-1.5 py-1 rounded-[var(--ui-radius-small)] text-[8px] font-black uppercase bg-blue-50 text-blue-700 border border-blue-200 block truncate text-center" 
          title={dayData.note || 'Izin'}
        >
          IZIN
        </span>
      );
    }
    if (status === "Dinas Luar") {
      return (
        <span 
          className="px-1.5 py-1 rounded-[var(--ui-radius-small)] text-[8px] font-black uppercase bg-indigo-50 text-indigo-700 border border-indigo-200 block truncate text-center" 
          title={dayData.note || 'Dinas Luar'}
        >
          DINAS
        </span>
      );
    }
    const renderTaps = (dayData) => {
      const inTime = dayData.in ? dayData.in.substring(0, 5) : '--:--';
      const outTime = dayData.out ? dayData.out.substring(0, 5) : '--:--';
      return (
        <div className="flex flex-col gap-0.5">
          <div>{inTime}</div>
          <div className="border-t border-black/10 w-full my-0.5"></div>
          <div>{outTime}</div>
        </div>
      );
    };

    if (status === "Terlambat" || dayData.isLate) {
      return (
        <div 
          className="text-[9px] font-black leading-tight p-1 rounded-[var(--ui-radius-small)] bg-red-100 text-red-800 border border-red-200 text-center flex flex-col items-center justify-center min-h-[36px]" 
        >
          {renderTaps(dayData)}
        </div>
      );
    }
    return (
      <div 
        className="text-[9px] font-black leading-tight p-1 rounded-[var(--ui-radius-small)] bg-green-100 text-green-800 border border-green-200 text-center flex flex-col items-center justify-center min-h-[36px]" 
      >
        {renderTaps(dayData)}
      </div>
    );
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {!isNested && (
        <PageHeader 
          title={`Laporan Absensi Karyawan ${user?.isWalas ? `(Kelas ${user.walasClass})` :''}`}
          description="Rekap kehadiran karyawan per bulan dalam bentuk matriks."
          icon={Briefcase}
        />
      )}

      {/* Top Search & Title Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
            <Briefcase size={18} />
          </div>
          <div>
            <h3 className="text-xs font-black text-slate-800">Laporan Absensi Karyawan</h3>
            <p className="text-[10px] text-slate-500 font-medium">Rekap matriks kehadiran karyawan per bulan</p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative w-full md:w-72">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Cari nama atau NIP karyawan..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-semibold focus:outline-none focus:bg-white focus:border-[var(--ui-primary)] transition-all"
          />
        </div>
      </div>

      <div className="ui-card p-4 sm:p-5 flex flex-col gap-4 relative z-30 shadow-xs border border-slate-200/80">
        {/* Top Control Bar: Filters + Actions */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3.5">
          {/* Filters Group */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 flex-1 min-w-0">
            <div className="min-w-0">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Bulan</label>
              <CustomSelect 
                value={filter.month} 
                onChange={val => setFilter({ ...filter, month: parseInt(val) })}
                options={monthOptions}
              />
            </div>
            <div className="min-w-0">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Tahun</label>
              <CustomSelect 
                value={filter.year} 
                onChange={val => setFilter({ ...filter, year: parseInt(val) })}
                options={yearOptions.map(y => ({ value: y, label: y.toString() }))}
              />
            </div>
            <div className="min-w-0">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Tipe</label>
              <CustomSelect
                value={viewMode}
                onChange={val => setViewMode(val)}
                options={[
                  { value:"monthly", label:"Bulanan" },
                  { value:"weekly", label:"Mingguan" }
                ]}
              />
            </div>
            <div className="min-w-0">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Urutkan</label>
              <div className="flex items-center gap-1 w-full min-w-0">
                <div className="flex-1 min-w-0">
                  <CustomSelect
                    value={sortBy}
                    onChange={val => setSortBy(val)}
                    options={[
                      { value: "code", label: "Kode Karyawan" },
                      { value: "name", label: "Nama (A-Z)" },
                      { value: "division", label: "Divisi" },
                      { value: "hadir", label: "Total Hadir" },
                      { value: "terlambat", label: "Total Terlambat" },
                      { value: "alpa", label: "Total Alpa" }
                    ]}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setSortDir(prev => prev === "asc" ? "desc" : "asc")}
                  title={sortDir === "asc" ? "Naik" : "Turun"}
                  className={`shrink-0 w-9 h-9 p-0 flex items-center justify-center rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                    sortDir === 'desc' 
                      ? 'bg-slate-800 text-white border-slate-800 shadow-xs' 
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <ArrowUpDown size={14} />
                </button>
              </div>
            </div>

            {viewMode ==="weekly" && (
              <div className="col-span-2 sm:col-span-1 animate-in slide-in-from-left-2 duration-150">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Minggu</label>
                <CustomSelect
                  value={selectedWeek}
                  onChange={val => setSelectedWeek(parseInt(val))}
                  options={[
                    { value: 1, label:"Minggu 1 (Tgl 1 - 7)" },
                    { value: 2, label:"Minggu 2 (Tgl 8 - 14)" },
                    { value: 3, label:"Minggu 3 (Tgl 15 - 21)" },
                    { value: 4, label:"Minggu 4 (Tgl 22 - 28)" },
                    { value: 5, label: `Minggu 5 (Tgl 29 - ${daysInMonth})` }
                  ]}
                />
              </div>
            )}
          </div>

          {/* Action Group */}
          <div className="flex flex-wrap items-center gap-2 shrink-0 justify-end pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
            <Button 
              variant="outline"
              type="button"
              onClick={handleExport}
              disabled={loading || data.length === 0}
              className="px-3 py-2 bg-emerald-50/70 hover:bg-emerald-100/80 text-emerald-700 border-emerald-200/80 flex items-center justify-center gap-1.5 text-xs font-black cursor-pointer disabled:opacity-50"
            >
              <FileSpreadsheet size={14} className="shrink-0" />
              <span>Excel</span>
            </Button>

            <Button 
              variant="outline"
              type="button"
              onClick={handleExportPDF}
              disabled={loading || data.length === 0}
              className="px-3 py-2 bg-rose-50/70 hover:bg-rose-100/80 text-rose-700 border-rose-200/80 flex items-center justify-center gap-1.5 text-xs font-black cursor-pointer disabled:opacity-50"
            >
              <FileText size={14} className="shrink-0" />
              <span>PDF</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="ui-card shadow-xs border border-slate-200/80 overflow-hidden relative z-10">
        <div className="px-4 py-3 border-b border-slate-200/80 bg-slate-50/70 flex flex-wrap items-center justify-between gap-3">
           <div className="text-xs font-bold text-slate-700">
             Menampilkan Matriks Kehadiran <span className="font-black text-slate-900">({filteredData.length} Karyawan)</span>
           </div>
           <div className="flex flex-wrap items-center gap-3 text-[10px] font-black uppercase tracking-wider text-slate-500">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span> Tepat Waktu</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"></span> Terlambat</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block"></span> Izin</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block"></span> Sakit</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-slate-900 inline-block"></span> Alpa</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-slate-300 inline-block"></span> Kosong</span>
           </div>
        </div>
        
        <div className="overflow-x-auto relative">
          <table className="w-full text-left border-collapse min-w-max">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] uppercase tracking-wider">
                <th className="px-4 py-3 font-black sticky left-0 bg-slate-50 z-10 border-r border-slate-200">Karyawan</th>
                <th className="px-3 py-3 font-black text-center border-r border-slate-200">Hadir</th>
                <th className="px-3 py-3 font-black text-center border-r border-slate-200">Telat</th>
                {daysToRender.map((dayNum) => (
                   <th key={dayNum} className="px-2 py-3 font-black text-center min-w-[70px] border-r border-slate-200">
                     {dayNum}
                   </th>
                ))}
              </tr>
            </thead>
            <tbody className="text-sm font-medium text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={3 + daysToRender.length} className="px-6 py-12 text-center text-slate-500 font-bold">Memuat data absen...</td>
                </tr>
              ) : paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={3 + daysToRender.length} className="px-6 py-12 text-center text-slate-500 font-bold">Tidak ada data untuk filter ini.</td>
                </tr>
              ) : (
                paginatedData.map(d => (
                  <tr key={d.nis} className="border-b border-slate-100 hover:bg-slate-50/50">
                     <td className="px-4 py-3 sticky left-0 bg-white border-r border-slate-100 z-10 min-w-[220px]">
                        <div className="font-bold text-slate-800 text-xs whitespace-normal" title={d.name}>{d.name}</div>
                        <div className="text-[9px] text-slate-400 font-bold mt-0.5">{d.class_name ||'Tanpa Kelas'}</div>
                     </td>
                     <td className="px-3 py-3 text-center font-black text-slate-700 border-r border-slate-100">{d.total_hadir}</td>
                     <td className="px-3 py-3 text-center font-black text-amber-600 border-r border-slate-100">{d.total_terlambat}</td>
                     {daysToRender.map((dayNum) => {
                        const dayData = d.days[dayNum];
                        return (
                           <td key={dayNum} className="px-1 py-2 text-center border-r border-slate-100 min-w-[70px]">
                              {getDayBadge(dayData)}
                           </td>
                        );
                     })}
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <TablePagination 
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredData.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={(val) => { setItemsPerPage(val); setCurrentPage(1); }}
          />
        </div>
      </div>
      {toast && (
        <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-[var(--ui-radius-small)] shadow-lg font-medium text-sm flex items-center gap-2 animate-in slide-in-from-bottom-5 text-white z-[100] ${toast.type ==='error' ?'bg-red-600' :'bg-emerald-600'}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
