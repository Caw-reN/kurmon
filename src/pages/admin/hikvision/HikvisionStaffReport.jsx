import { Button, TablePagination } from '../../../components/ui.jsx';
import React, { useState, useEffect, useCallback } from'react';
import useAuthStore from'../../../store/monitoring/authStore';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { AlertTriangle, FileText, Filter, Search, Printer } from 'lucide-react';
import { CustomSelect } from '../../../components/CustomSelect.jsx';
import { PageHeader } from'../../../components/monitoring/ui/index.js';
import { getDatabaseSnapshot } from '../../../utils/dataSource.js';


export default function HikvisionStaffReport({ classes = [] }) {
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
    type:"staff"
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

  const handleExport = async () => {
    if (data.length === 0) return showToast("Tidak ada data untuk diekspor", "warning");

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
    data.forEach((item) => {
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
  };

  const handleExportPDF = () => {
    if (!data || data.length === 0) return showToast("Tidak ada data untuk diekspor", "warning");
    
    try {
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

      const body = data.map(item => {
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
    }
  };

  const filteredData = data.filter(d => {
    if (search && !d.name.toLowerCase().includes(search.toLowerCase()) && !d.nis.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  // Reset page when search or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, filter.month, filter.year, filter.class_name]);

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
      if (dayData.taps && dayData.taps.length > 0) {
        return (
          <div className="flex flex-col gap-0.5">
            {dayData.taps.slice(0, 4).map((t, idx) => (
              <React.Fragment key={idx}>
                <div>{t.substring(0, 5)}</div>
                {idx < Math.min(dayData.taps.length, 4) - 1 && <div className="border-t border-black/10 w-full my-0.5"></div>}
              </React.Fragment>
            ))}
          </div>
        );
      }
      return (
        <div className="flex flex-col gap-0.5">
          <div>{dayData.in?.substring(0,5) || '--:--'}</div>
          <div className="border-t border-black/10 w-full my-0.5"></div>
          <div>{dayData.out?.substring(0,5) || '--:--'}</div>
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
    <div className="space-y-6 animate-fade-in">
      <PageHeader 
        title={`Laporan Absensi Karyawan ${user?.isWalas ? `(Kelas ${user.walasClass})` :''}`}
        description="Rekap kehadiran karyawan per bulan dalam bentuk matriks."
        icon={FileText}
      />

      <div className="ui-card flex flex-col relative z-30">
        {/* Filters Row */}
        <div className="flex flex-wrap gap-4 items-end p-6 border-b border-slate-100">
           <div className="flex-1 min-w-[150px]">
             <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Pilih Bulan</label>
             <CustomSelect 
               value={filter.month} 
               onChange={val => setFilter({ ...filter, month: parseInt(val) })}
               options={monthOptions}
             />
           </div>
           <div className="flex-1 min-w-[100px]">
             <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Tahun</label>
             <CustomSelect 
               value={filter.year} 
               onChange={val => setFilter({ ...filter, year: parseInt(val) })}
               options={yearOptions.map(y => ({ value: y, label: y.toString() }))}
             />
           </div>
           <div className="flex-1 min-w-[130px]">
             <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Tipe Laporan</label>
             <CustomSelect
               value={viewMode}
               onChange={val => setViewMode(val)}
               options={[
                 { value:"monthly", label:"Bulanan" },
                 { value:"weekly", label:"Mingguan" }
               ]}
             />
           </div>
           {viewMode ==="weekly" && (
             <div className="flex-1 min-w-[130px] animate-in slide-in-from-left-2 duration-150">
               <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Pilih Minggu</label>
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
           {!user?.isWalas && (
           <div className="flex-1 min-w-[150px]">
             <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Filter Kelas</label>
             <CustomSelect 
               value={filter.class_name} 
               onChange={val => setFilter({ ...filter, class_name: val })}
               options={[
                 { value:"all", label:"-- Semua Kelas --" },
                 ...classes.map(c => ({ value: c.name, label: c.name }))
               ]}
             />
           </div>
           )}
           <div className="w-full md:w-auto flex gap-2">
               <button
                 onClick={fetchData}
                 className="flex flex-1 md:flex-none items-center justify-center gap-2 px-4 py-2.5 bg-[var(--ui-primary)] hover:opacity-90 text-white text-xs font-black rounded-[var(--ui-radius-small)] transition-all cursor-pointer border-none"
               >
                 <Filter size={14} /> Terapkan
               </button>
                <button
                  onClick={handleExport}
                  disabled={loading || data.length === 0}
                  className="flex flex-1 md:flex-none items-center justify-center gap-2 px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-black rounded-[var(--ui-radius-small)] transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <FileText size={14} /> Excel
                </button>
                <button
                  onClick={handleExportPDF}
                  disabled={loading || data.length === 0}
                  className="flex flex-1 md:flex-none items-center justify-center gap-2 px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-black rounded-[var(--ui-radius-small)] transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Printer size={14} /> PDF
                </button>
            </div>
        </div>

        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col md:flex-row justify-between items-center gap-4">
           <div className="relative w-full md:w-80">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                placeholder="Cari karyawan..." 
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white border-none rounded-[var(--ui-radius-small)] text-sm font-semibold focus:outline-[var(--ui-primary)]"
              />
           </div>
             <div className="flex flex-wrap gap-4 text-[10px] font-black uppercase tracking-wider text-slate-500">
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-[var(--ui-radius-small)] bg-green-500 inline-block"></span> Tepat Waktu</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-[var(--ui-radius-small)] bg-red-500 inline-block"></span> Terlambat</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-[var(--ui-radius-small)] bg-blue-500 inline-block"></span> Izin</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-[var(--ui-radius-small)] bg-amber-400 inline-block"></span> Sakit</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-[var(--ui-radius-small)] bg-slate-900 inline-block"></span> Alpa</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-[var(--ui-radius-small)] bg-slate-200 inline-block"></span> Kosong</span>
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
