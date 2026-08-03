import React, { useState, useEffect, useCallback, useRef } from'react';
import useAuthStore from'../../../store/monitoring/authStore';
import { FileText, UserX, FileSpreadsheet, Plus, Download, Search, Filter, ShieldAlert, UserCheck, AlertTriangle, X, CheckCircle2, ChevronLeft, PieChart, Users, Wand2, ArrowUpDown } from 'lucide-react';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useAppStore } from'../../../store/useAppStore';
import { PageHeader } from'../../../components/monitoring/ui/index.js';
import { CustomSelect } from'../../../components/CustomSelect.jsx';
import { UISelect, Button, TablePagination } from'../../../components/ui.jsx';
import { getDatabaseSnapshot } from '../../../utils/dataSource.js';
import { compareTableValues } from '../../../utils/adminHelpers.js';
import AbsensiSiswa from '../../kedisiplinan/AbsensiSiswa.jsx';


export default function HikvisionStudentReport({ classes = [], students = [], isNested = false, activeTab: routeTab = "" }) {
  const user = useAuthStore(state => state.user);
  const authToken = user?.authToken;
  const [activeTab, setActiveTab] = useState("matriks"); //"matriks" |"surat"
  const [exportMode, setExportMode] = useState("summary");

  
  const [data, setData] = useState([]);
  const [toast, setToast] = useState(null);

  const showToast = (message, type ='success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };
  const [daysInMonth, setDaysInMonth] = useState(31);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  
  const isKesiswaanOrAdmin = user?.role === 'admin' || user?.role === 'superadmin' || user?.role === 'tu' || user?.role === 'tata_usaha' || user?.role === 'kepsek' || (user?.role === 'waka' && (user?.division || "").toLowerCase() === 'kesiswaan');

  const [filter, setFilter] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    class_name: (routeTab === "walas_report" && user?.walasClass) ? user.walasClass : ((user?.isWalas && !isKesiswaanOrAdmin && user.walasClass) ? user.walasClass : "all")
  });

  React.useEffect(() => {
    if (routeTab === "walas_report" && user?.walasClass) {
      setFilter(f => ({ ...f, class_name: user.walasClass }));
    }
  }, [routeTab, user?.walasClass]);

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

  const [selectedCell, setSelectedCell] = useState(null); // { nis, name, day }
  const [permissionForm, setPermissionForm] = useState({ status:"Sakit", keterangan:"", fileData: null, fileName: null, fileSizeKB: null });
  const [isSubmittingCell, setIsSubmittingCell] = useState(false);

  const handleCellClick = (d, dayNum) => {
    if (user?.role ==="siswa") return; // Siswa cannot edit their own or others' data
    setSelectedCell({
      nis: d.nis,
      name: d.name,
      day: dayNum
    });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;
        const MAX_WIDTH = 1000;
        const MAX_HEIGHT = 1000;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
        const stringLength = dataUrl.length -'data:image/jpeg;base64,'.length;
        const sizeInBytes = 4 * Math.ceil(stringLength / 3) * 0.5624896334383812;
        const sizeInKB = Math.round(sizeInBytes / 1024);

        setPermissionForm(prev => ({
          ...prev,
          fileData: dataUrl,
          fileName: file.name,
          fileSizeKB: sizeInKB
        }));
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleCellSubmit = async (e) => {
    e.preventDefault();
    if (!selectedCell) return;
    setIsSubmittingCell(true);
    try {
      const dateStr = `${filter.year}-${String(filter.month).padStart(2,'0')}-${String(selectedCell.day).padStart(2,'0')}`;
      const res = await fetch("/api/kedisiplinan/absensi", {
        method:"POST",
        headers: {"Authorization": `Bearer ${authToken}`,"Content-Type":"application/json"
        },
        body: JSON.stringify({
          siswa_nis: selectedCell.nis,
          tanggal: dateStr,
          status: permissionForm.status,
          keterangan: permissionForm.keterangan,
          fileData: permissionForm.fileData,
          fileName: permissionForm.fileName
        })
      });
      const json = await res.json();
      if (json.ok) {
        showToast("Pengajuan ketidakhadiran berhasil disimpan.");
        setSelectedCell(null);
        setPermissionForm({ status:"Sakit", keterangan:"", fileData: null, fileName: null, fileSizeKB: null });
        fetchData();
      } else {
        showToast(json.error ||"Gagal menyimpan pengajuan.","error");
      }
    } catch (err) {
      console.error(err);
      showToast("Terjadi kesalahan jaringan.","error");
    }
    setIsSubmittingCell(false);
  };

  const getCellStyle = (dayData) => {
    const status = dayData.status || (dayData.isLate ?"Terlambat" : (dayData.in || dayData.out ?"Hadir" :""));
    
    if (status === "PKL" || String(status || '').startsWith("PKL") || dayData.isPkl) {
      return {
        className: "bg-indigo-100 text-indigo-900 font-black border border-indigo-200",
        style: { color: "#3730a3" }
      };
    }
    if (status ==="Alpa") {
      return {
        className:"bg-slate-950 text-white font-bold",
        style: { color:"#ffffff" }
      };
    }
    if (status ==="Sakit") {
      return {
        className:"bg-amber-100 text-amber-800 font-bold",
        style: { color:"#92400e" }
      };
    }
    if (status ==="Izin") {
      return {
        className:"bg-blue-100 text-blue-800 font-bold",
        style: { color:"#1e40af" }
      };
    }
    if (status ==="Terlambat" || dayData.isLate) {
      return {
        className:"bg-red-100 text-red-800 font-bold",
        style: { color:"#b91c1c" }
      };
    }
    return {
      className:"bg-green-100 text-green-800 font-bold",
      style: { color:"#166534" }
    };
  };

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

  const [sortBy, setSortBy] = useState("class_nis");
  const [sortDir, setSortDir] = useState("asc");

  const filteredData = React.useMemo(() => {
    const list = data.filter(d => {
      if (search && !d.name?.toLowerCase().includes(search.toLowerCase()) && !d.nis?.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });

    return list.sort((a, b) => {
      if (sortBy === "class_nis") {
        const classComp = compareTableValues(a.class_name, b.class_name, sortDir);
        if (classComp !== 0) return classComp;
        return compareTableValues(a.nis, b.nis, sortDir);
      }
      let av, bv;
      if (sortBy === "nis") {
        av = a.nis;
        bv = b.nis;
      } else if (sortBy === "name") {
        av = a.name;
        bv = b.name;
      } else if (sortBy === "class_name") {
        av = a.class_name;
        bv = b.class_name;
      } else if (sortBy === "hadir") {
        av = a.total_hadir || 0;
        bv = b.total_hadir || 0;
      } else if (sortBy === "alpa") {
        av = a.total_alpa || 0;
        bv = b.total_alpa || 0;
      } else {
        av = a.nis;
        bv = b.nis;
      }
      return compareTableValues(av, bv, sortDir);
    });
  }, [data, search, sortBy, sortDir]);

  const isExportingRef = useRef(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async (isDetailed = false) => {
    if (isExportingRef.current) return;
    isExportingRef.current = true;
    setIsExporting(true);

    try {
      if (!filteredData || filteredData.length === 0) return showToast("Tidak ada data untuk diekspor","warning");
      
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Laporan Absensi Siswa');

      // Define columns
      const columns = [
        { header: 'NIS', key: 'nis', width: 15 },
        { header: 'Nama Siswa', key: 'name', width: 35 },
        { header: 'Kelas', key: 'class_name', width: 12 },
        { header: 'H', key: 'h', width: 5 },
        { header: 'T', key: 't', width: 5 },
        { header: 'I', key: 'i', width: 5 },
        { header: 'S', key: 's', width: 5 },
        { header: 'A', key: 'a', width: 5 }
      ];
      for (let i = 1; i <= daysInMonth; i++) {
        columns.push({ header: i.toString(), key: `d${i}`, width: isDetailed ? 10 : 5 });
      }
      sheet.columns = columns;

      // Style Header Row
      sheet.getRow(1).eachCell((cell) => {
        cell.font = { bold: true };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF1F5F9' }
        };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
          left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
          bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
          right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
        };
      });

      filteredData.forEach(item => {
        const rowData = {
          nis: item.nis,
          name: item.name,
          class_name: item.class_name || "-",
          h: item.total_hadir,
          t: item.total_terlambat,
          i: item.total_izin,
          s: item.total_sakit,
          a: item.total_alpa
        };
        
        const row = sheet.addRow(rowData);
        row.getCell('nis').alignment = { vertical: 'middle', wrapText: true };
        row.getCell('name').alignment = { vertical: 'middle', wrapText: true };
        row.getCell('class_name').alignment = { vertical: 'middle', wrapText: true };
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
            const status = dayData.status || (dayData.isLate ? "Terlambat" : (dayData.in || dayData.out ? "Hadir" : "Alpa"));
            let content = "-";
            let fgColor = "FFFFFFFF";
            let fontColor = "FF334155";
            
            if (status === "Alpa" || status === "Alpa (Tanpa Keterangan)" || dayData.in === "Alpa") {
              content = "A";
              fgColor = "FF0F172A"; fontColor = "FFFFFFFF";
            } else if (status === "Sakit") {
              content = "S";
              fgColor = "FFFEF3C7"; fontColor = "FF92400E";
            } else if (status === "Izin") {
              content = "I";
              fgColor = "FFDBEAFE"; fontColor = "FF1E3A8A";
            } else if (status === "Terlambat" || dayData.isLate) {
              if (isDetailed && (dayData.in || dayData.out)) {
                content = `${dayData.in ? dayData.in.substring(0,5) : '--:--'}\n${dayData.out ? dayData.out.substring(0,5) : '--:--'}`;
              } else {
                content = "T";
              }
              fgColor = "FFFEE2E2"; fontColor = "FF991B1B";
            } else if (dayData.in || dayData.out || status === "Hadir") {
              if (isDetailed && (dayData.in || dayData.out)) {
                content = `${dayData.in ? dayData.in.substring(0,5) : '--:--'}\n${dayData.out ? dayData.out.substring(0,5) : '--:--'}`;
              } else {
                content = "H";
              }
              fgColor = "FFDCFCE7"; fontColor = "FF166534";
            }
            
            cell.value = content;
            cell.font = { color: { argb: fontColor }, bold: true, size: isDetailed ? 8 : 10 };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fgColor } };
          } else {
            cell.value = "";
          }
        }
      });

      const legendRow = sheet.addRow([]);
      const legendRow2 = sheet.addRow(['Keterangan:']);
      legendRow2.font = { bold: true };
      const legendRow3 = sheet.addRow(['Hadir (H)', 'Terlambat (T)', 'Sakit (S)', 'Izin (I)', 'Alpa (A)']);
      
      sheet.eachRow((row) => row.commit());

      const buffer = await workbook.xlsx.writeBuffer();
      saveAs(new Blob([buffer]), `Laporan_Absensi_Siswa_${filter.class_name}_${filter.year}_${filter.month}.xlsx`);
    } catch (err) {
      console.error(err);
      showToast("Gagal mengunduh Excel Siswa: " + err.message, "error");
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
      
      const isDetailed = exportMode === "detailed";
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: getDatabaseSnapshot()?.appSettings?.defaultPaperSize === 'F4' ? [215, 330] : 'a4'
      });
      
      const monthName = new Date(filter.year, filter.month - 1).toLocaleString('id-ID', { month: 'long' });
      const startY = 15;

      doc.setFont("Helvetica", "bold");
      doc.setFontSize(14);
      doc.text(`LAPORAN KINERJA & KEHADIRAN SISWA`, 14, startY + 6);
      
      doc.setFontSize(10);
      doc.setFont("Helvetica", "normal");
      doc.text(`Kelas: ${filter.class_name === 'all' ? 'Semua Kelas' : filter.class_name} | Periode: ${monthName} ${filter.year}`, 14, startY + 12);

      const headers = [["NIS", "Nama Siswa", "Kelas", "H", "T"]];
      for (let i = 1; i <= daysInMonth; i++) {
        headers[0].push(i.toString());
      }

      const body = filteredData.map(item => {
        const row = [
          item.nis || "-",
          (item.name || "").substring(0, 25),
          item.class_name || "-",
          String(item.total_hadir ?? 0),
          String(item.total_terlambat ?? 0)
        ];
        
        for (let i = 1; i <= daysInMonth; i++) {
          const dayData = (item.days || {})[i];
          if (!dayData) {
            row.push("-");
          } else {
            const status = dayData.status || (dayData.isLate ? "Terlambat" : (dayData.in || dayData.out ? "Hadir" : "Alpa"));
            let content = "-";
            let fillColor = [255, 255, 255];
            let textColor = [51, 65, 85];
            
            if (status === "Alpa" || status === "Alpa (Tanpa Keterangan)" || dayData.in === "Alpa") {
              content = "A";
              fillColor = [15, 23, 42]; textColor = [255, 255, 255];
            } else if (status === "Sakit") {
              content = "S";
              fillColor = [254, 243, 199]; textColor = [146, 64, 14];
            } else if (status === "Izin") {
              content = "I";
              fillColor = [219, 234, 254]; textColor = [30, 58, 138];
            } else if (status === "Terlambat" || dayData.isLate) {
              if (isDetailed && (dayData.in || dayData.out)) {
                content = `${dayData.in ? dayData.in.substring(0,5) : '--:--'}\n${dayData.out ? dayData.out.substring(0,5) : '--:--'}`;
              } else {
                content = "T";
              }
              fillColor = [254, 226, 226]; textColor = [153, 27, 27];
            } else if (dayData.in || dayData.out || status === "Hadir") {
              if (isDetailed && (dayData.in || dayData.out)) {
                content = `${dayData.in ? dayData.in.substring(0,5) : '--:--'}\n${dayData.out ? dayData.out.substring(0,5) : '--:--'}`;
              } else {
                content = "H";
              }
              fillColor = [220, 252, 231]; textColor = [22, 101, 52];
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
          0: { halign: 'left', cellWidth: 15 },
          1: { halign: 'left', cellWidth: 35 },
          2: { halign: 'left', cellWidth: 12 },
          3: { cellWidth: 6 },
          4: { cellWidth: 6 },
        },
        didParseCell: function (data) {
          if (data.section === 'body' && data.column.index >= 5 && typeof data.cell.raw === 'string') {
            const val = data.cell.raw;
            if (val === 'H') {
              data.cell.styles.fillColor = [220, 252, 231]; 
              data.cell.styles.textColor = [22, 101, 52];
            } else if (val === 'T') {
              data.cell.styles.fillColor = [254, 226, 226]; 
              data.cell.styles.textColor = [153, 27, 27];
            } else if (val === 'S') {
              data.cell.styles.fillColor = [254, 243, 199]; 
              data.cell.styles.textColor = [146, 64, 14];
            } else if (val === 'I') {
              data.cell.styles.fillColor = [219, 234, 254]; 
              data.cell.styles.textColor = [30, 58, 138];
            } else if (val === 'A') {
              data.cell.styles.fillColor = [15, 23, 42]; 
              data.cell.styles.textColor = [255, 255, 255];
            }
          }
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
      
      doc.save(`Laporan_Absensi_Siswa_${filter.class_name}_${filter.year}_${filter.month}.pdf`);
      showToast("Laporan PDF Siswa berhasil diunduh!", "success");
    } catch (err) {
      console.error("Gagal mengekspor PDF Siswa:", err);
      showToast("Gagal mengunduh PDF Siswa: " + err.message, "error");
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

  // Calculate lists for today if selected month/year is current month/year
  const today = React.useMemo(() => new Date(), []);
  const todayNum = today.getDate();
  const isCurrentMonthYear = filter.month === (today.getMonth() + 1) && filter.year === today.getFullYear();

  const academicCalendarRaw = useAppStore(state => state.academicCalendar);
  const calendarCategoriesRaw = useAppStore(state => state.calendarCategories);
  const academicCalendar = academicCalendarRaw || [];
  const calendarCategories = calendarCategoriesRaw || [];

  const isWeekendToday = (() => {
    const day = today.getDay();
    return day === 0 || day === 6;
  })();

  const isHolidayToday = React.useMemo(() => {
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2,"0");
    const dd = String(today.getDate()).padStart(2,"0");
    const todayStr = `${yyyy}-${mm}-${dd}`;
    
    return academicCalendar.some(evt => {
      const start = evt.dateStart;
      const end = evt.dateEnd || evt.dateStart;
      if (todayStr >= start && todayStr <= end) {
        const cat = calendarCategories.find(c => c.id === evt.categoryId);
        const catName = cat ? String(cat.name).toLowerCase() :"";
        const title = String(evt.title).toLowerCase();
        return catName.includes("libur") || title.includes("libur");
      }
      return false;
    });
  }, [academicCalendar, calendarCategories, today]);

  const isHolidayOrWeekendToday = isWeekendToday || isHolidayToday;

  const lateStudentsToday = React.useMemo(() => {
    if (!isCurrentMonthYear || isHolidayOrWeekendToday) return [];
    return data.filter(student => {
      const dayData = student.days[todayNum];
      return dayData && (dayData.isLate || dayData.status ==="Terlambat");
    });
  }, [data, isCurrentMonthYear, todayNum, isHolidayOrWeekendToday]);

  const absentStudentsToday = React.useMemo(() => {
    if (!isCurrentMonthYear || isHolidayOrWeekendToday) return [];
    return data.filter(student => {
      const dayData = student.days[todayNum];
      if (!dayData) return true; // No scan yet
      return ["Sakit","Izin","Alpa"].includes(dayData.status) || dayData.in ==="Alpa" || dayData.in ==="Sakit" || dayData.in ==="Izin";
    });
  }, [data, isCurrentMonthYear, todayNum, isHolidayOrWeekendToday]);

  const presentStudentsToday = React.useMemo(() => {
    if (!isCurrentMonthYear || isHolidayOrWeekendToday) return [];
    return data.filter(student => {
      const dayData = student.days[todayNum];
      if (!dayData) return false;
      return !["Sakit","Izin","Alpa"].includes(dayData.status) && dayData.in !== "Alpa" && dayData.in !== "Sakit" && dayData.in !== "Izin";
    });
  }, [data, isCurrentMonthYear, todayNum, isHolidayOrWeekendToday]);

  if (user?.isWalas && !user.walasClass && !isKesiswaanOrAdmin) {
     return (
        <div className="p-8 text-center bg-red-50 rounded-[var(--ui-radius-small)] border border-red-200">
           <AlertTriangle size={48} className="mx-auto text-red-500 mb-4" />
           <h3 className="text-xl font-bold text-red-700">Data Wali Kelas Belum Lengkap</h3>
           <p className="text-red-600 mt-2">Anda terdeteksi sebagai wali kelas, tetapi kelas yang Anda ampu tidak ditemukan atau sudah dihapus.</p>
        </div>
     );
  }

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in w-full pb-20 sm:pb-6">
      {/* Mobile Navigation Top Header */}
      <div className="sm:hidden flex items-center justify-between gap-3 pt-1 pb-1">
        <button
          type="button"
          onClick={() => typeof window !== 'undefined' && window.__setActiveTab ? window.__setActiveTab('dashboard') : null}
          className="w-9 h-9 rounded-full bg-white border border-slate-200 shadow-xs flex items-center justify-center text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer shrink-0"
        >
          <ChevronLeft size={20} strokeWidth={2.5} />
        </button>
        <h2 className="text-sm font-black text-slate-800 text-center flex-1 tracking-tight">Laporan</h2>
        <div className="w-9 shrink-0" />
      </div>

      {/* Desktop Header */}
      {!isNested && (
        <div className="hidden sm:block">
          <PageHeader 
            title={activeTab ==='matriks' ?"Laporan Kehadiran" :"Manajemen Surat Izin/Sakit"}
            icon={activeTab ==='matriks' ? FileText : UserX}
            description={activeTab ==='matriks' 
              ?"Rekap kehadiran siswa per bulan dalam bentuk matriks." 
              :"Rekap data ketidakhadiran harian siswa dan manajemen file surat izin/sakit."}
            tabs={[
              { id:'matriks', label:'Laporan Kehadiran' },
              { id:'surat', label:'Manajemen Surat Izin/Sakit' }
            ]}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />
        </div>
      )}
      {isNested && (
        <div className="hidden sm:flex items-center justify-end gap-1 bg-slate-100/90 p-1.5 rounded-2xl border border-slate-200/80 w-fit ml-auto shadow-xs">
          {[
            { id:'matriks', label:'Laporan Kehadiran', icon: FileText },
            { id:'surat', label:'Manajemen Surat Izin/Sakit', icon: UserX }
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border-none ${
                activeTab === tab.id 
                  ? 'bg-white text-[var(--ui-primary)] shadow-xs font-black' 
                  : 'text-slate-600 hover:text-slate-900 bg-transparent'
              }`}
            >
              <tab.icon size={14} className="shrink-0" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Mobile Hero Header Card (Reference Layout matching media__1785568140000.png) */}
      <div 
        className="sm:hidden w-full rounded-3xl p-5 text-white shadow-md flex flex-col gap-4 relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, var(--ui-primary) 0%, color-mix(in srgb, var(--ui-primary) 75%, #0d9488) 100%)" }}
      >
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md text-white flex items-center justify-center shrink-0 border border-white/20 shadow-inner">
            <PieChart size={24} strokeWidth={2.2} />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-black leading-snug tracking-tight">Laporan Kehadiran</h2>
            <p className="text-xs opacity-90 leading-relaxed font-medium mt-0.5">
              Rekap kehadiran siswa per bulan
            </p>
          </div>
        </div>

        {/* Segmented Pill Tabs */}
        <div className="bg-white rounded-2xl p-1 flex items-center gap-1 shadow-sm border border-slate-100/90">
          <button
            type="button"
            onClick={() => setActiveTab('matriks')}
            className={`flex-1 py-2 px-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border-none cursor-pointer text-center ${
              activeTab === 'matriks'
                ? 'bg-slate-100 shadow-xs'
                : 'text-slate-400 hover:text-slate-600 bg-transparent'
            }`}
            style={activeTab === 'matriks' ? {
              background: "color-mix(in srgb, var(--ui-primary) 12%, #ffffff)",
              color: "var(--ui-primary)"
            } : {}}
          >
            MATRIKS BULANAN
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('surat')}
            className={`flex-1 py-2 px-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border-none cursor-pointer text-center ${
              activeTab === 'surat'
                ? 'bg-slate-100 shadow-xs'
                : 'text-slate-400 hover:text-slate-600 bg-transparent'
            }`}
            style={activeTab === 'surat' ? {
              background: "color-mix(in srgb, var(--ui-primary) 12%, #ffffff)",
              color: "var(--ui-primary)"
            } : {}}
          >
            MANAJEMEN SURAT
          </button>
        </div>
      </div>

      {activeTab ==='surat' ? (
        <AbsensiSiswa students={students} classes={classes} hideTabs={true} />
      ) : (
        <>
          {/* Wali Kelas Daily Monitoring Widgets */}
      {isCurrentMonthYear && !isHolidayOrWeekendToday && data.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Present Students Today */}
          <div className="bg-white rounded-[var(--ui-radius-card)] border border-slate-100 shadow-sm overflow-hidden flex flex-col">
            <div className="p-4 bg-emerald-50 border-b border-emerald-100 flex items-center justify-between">
              <h3 className="text-xs font-black text-emerald-800 flex items-center gap-1.5 uppercase tracking-wider">
                <UserCheck size={16} />
                Siswa Masuk Hari Ini
              </h3>
              <span className="text-[10px] font-black px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full">
                {presentStudentsToday.length} Siswa
              </span>
            </div>
            <div className="flex-1 min-h-[120px] max-h-52 overflow-y-auto custom-scrollbar">
              {presentStudentsToday.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400 font-bold flex flex-col items-center justify-center gap-2">
                  <UserCheck size={20} className="text-slate-300" />
                  <span>Belum ada siswa masuk hari ini.</span>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {presentStudentsToday.map(s => {
                    const dayData = s.days[todayNum];
                    const isLate = dayData.isLate || dayData.status === "Terlambat";
                    return (
                      <div key={s.nis} className="p-3 flex items-center justify-between gap-3 text-xs">
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-slate-800 truncate" title={s.name}>{s.name}</div>
                          <div className="text-[10px] text-slate-400 font-semibold">{s.nis}</div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`px-2 py-0.5 font-bold border rounded text-[10px] ${
                            isLate 
                              ? 'bg-amber-50 text-amber-700 border-amber-100' 
                              : 'bg-emerald-50 text-emerald-700 border-emerald-100'
                          }`}>
                            {dayData.in?.substring(0, 5) || "Hadir"} {isLate && "(T)"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Late Students Today */}
          <div className="bg-white rounded-[var(--ui-radius-card)] border border-slate-100 shadow-sm overflow-hidden flex flex-col">
            <div className="p-4 bg-amber-50 border-b border-amber-100 flex items-center justify-between">
              <h3 className="text-xs font-black text-amber-800 flex items-center gap-1.5 uppercase tracking-wider">
                <ShieldAlert size={16} />
                Siswa Terlambat Hari Ini
              </h3>
              <span className="text-[10px] font-black px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full">
                {lateStudentsToday.length} Siswa
              </span>
            </div>
            <div className="flex-1 min-h-[120px] max-h-52 overflow-y-auto custom-scrollbar">
              {lateStudentsToday.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400 font-bold flex flex-col items-center justify-center gap-2">
                  <UserCheck size={20} className="text-slate-300" />
                  <span>Tidak ada siswa terlambat hari ini.</span>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {lateStudentsToday.map(s => {
                    const dayData = s.days[todayNum];
                    return (
                      <div key={s.nis} className="p-3 flex items-center justify-between gap-3 text-xs">
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-slate-800 truncate" title={s.name}>{s.name}</div>
                          <div className="text-[10px] text-slate-400 font-semibold">{s.nis}</div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-800 font-bold rounded text-[10px] border border-amber-200">
                            {dayData.in?.substring(0, 5) ||"Terlambat"}
                          </span>
                          <Button variant="outline"
                            onClick={() =>handleCellClick(s, todayNum)}
                            className="cursor-pointer text-xs min-h-[38px] px-3.5 rounded-xl flex items-center justify-center font-bold shadow-sm"
                          >
                            Ubah</Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Absent Students Today */}
          <div className="bg-white rounded-[var(--ui-radius-card)] border border-slate-100 shadow-sm overflow-hidden flex flex-col">
            <div className="p-4 bg-rose-50 border-b border-rose-100 flex items-center justify-between">
              <h3 className="text-xs font-black text-rose-800 flex items-center gap-1.5 uppercase tracking-wider">
                <UserX size={16} />
                Siswa Tidak Masuk Hari Ini
              </h3>
              <span className="text-[10px] font-black px-2 py-0.5 bg-rose-100 text-rose-800 rounded-full">
                {absentStudentsToday.length} Siswa
              </span>
            </div>
            <div className="flex-1 min-h-[120px] max-h-52 overflow-y-auto custom-scrollbar">
              {absentStudentsToday.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400 font-bold flex flex-col items-center justify-center gap-2">
                  <UserCheck size={20} className="text-slate-300" />
                  <span>Semua siswa telah fingerprint hari ini.</span>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {absentStudentsToday.map(s => {
                    const dayData = s.days[todayNum];
                    const status = dayData?.status || dayData?.in ||"Alpa";
                    
                    let badgeClass ="bg-red-50 text-red-700 border-red-100";
                    if (status ==="Sakit") badgeClass ="bg-amber-50 text-amber-700 border-amber-100";
                    if (status ==="Izin") badgeClass ="bg-blue-50 text-blue-700 border-blue-100";

                    return (
                      <div key={s.nis} className="p-3 flex items-center justify-between gap-3 text-xs">
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-slate-800 truncate" title={s.name}>{s.name}</div>
                          <div className="text-[10px] text-slate-400 font-semibold flex items-center gap-1.5">
                            <span>{s.nis}</span>
                            {dayData?.note && <span className="truncate text-slate-500 max-w-[120px]">({dayData.note})</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`px-2 py-0.5 font-bold border rounded text-[10px] ${badgeClass}`}>
                            {status ==="Alpa" ?"Belum Scan" : status}
                          </span>
                          <Button variant="outline"
                            onClick={() =>handleCellClick(s, todayNum)}
                            className="cursor-pointer text-xs min-h-[38px] px-3.5 rounded-xl flex items-center justify-center font-bold shadow-sm"
                          >
                            Input Surat</Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Mobile Filter Card (Reference Layout matching media__1785568140000.png) */}
      <div className="sm:hidden ui-card rounded-3xl p-4 shadow-sm border border-slate-100/90 flex flex-col gap-4">
        {/* Top Row: Class Filter Label + Export Buttons */}
        <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <Users size={16} strokeWidth={2.2} />
            </div>
            <div className="min-w-0">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block leading-tight">FILTER DATA KELAS</span>
              <h4 className="text-xs font-black text-slate-800 truncate">
                {user?.isWalas ? (user.walasClass || 'Kelas Saya') : (filter.class_name === 'all' ? 'Semua Kelas' : filter.class_name)}
              </h4>
            </div>
          </div>

          {/* Export Buttons */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => handleExportPDF(exportMode === 'detailed')}
              disabled={loading || data.length === 0}
              className="px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200/60 flex items-center justify-center font-black text-[10px] transition-all cursor-pointer disabled:opacity-50"
              title="Export PDF"
            >
              PDF
            </button>
            <button
              type="button"
              onClick={() => handleExport(exportMode === 'detailed')}
              disabled={loading || data.length === 0}
              className="px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-200/60 flex items-center justify-center font-black text-[10px] transition-all cursor-pointer disabled:opacity-50"
              title="Export Excel"
            >
              XLS
            </button>
          </div>
        </div>

        {/* Form Grid 2x2 */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-100">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Tipe Laporan</label>
            <CustomSelect
              value={viewMode}
              onChange={val => setViewMode(val)}
              options={[
                { value: "monthly", label: "Bulanan" },
                { value: "weekly", label: "Mingguan" }
              ]}
            />
          </div>

          <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-100">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Format</label>
            <CustomSelect
              value={exportMode}
              onChange={val => setExportMode(val)}
              options={[
                { value: "summary", label: "Ringkas" },
                { value: "detailed", label: "Lengkap" }
              ]}
            />
          </div>

          <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-100">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Bulan</label>
            <CustomSelect 
              value={filter.month} 
              onChange={val => setFilter({ ...filter, month: parseInt(val) })}
              options={monthOptions}
            />
          </div>

          <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-100">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Tahun</label>
            <CustomSelect 
              value={filter.year} 
              onChange={val => setFilter({ ...filter, year: parseInt(val) })}
              options={yearOptions.map(y => ({ value: y, label: y.toString() }))}
            />
          </div>
        </div>

        {(!user?.isWalas || isKesiswaanOrAdmin) && (
          <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-100">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Pilih Kelas</label>
            <CustomSelect 
              value={filter.class_name} 
              onChange={val => setFilter({ ...filter, class_name: val })}
              options={[
                { value: "all", label: "Semua Kelas" },
                ...(user?.walasClass ? [{ value: user.walasClass, label: `⭐ Kelas Ampuan Saya (${user.walasClass})` }] : []),
                ...classes.map(c => ({ value: c.name || c.kelas, label: c.name || c.kelas })).filter(c => c.value !== user?.walasClass)
              ]}
            />
          </div>
        )}

        <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-100">
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Urutkan Data</label>
          <div className="flex items-center gap-1.5 w-full min-w-0">
            <div className="flex-1 min-w-0">
              <CustomSelect 
                value={sortBy} 
                onChange={val => setSortBy(val)}
                options={[
                  { value: "class_nis", label: "Per Kelas & NIS" },
                  { value: "nis", label: "NIS / No. Absen" },
                  { value: "name", label: "Nama Siswa (A-Z)" },
                  { value: "class_name", label: "Nama Kelas" },
                  { value: "hadir", label: "Total Hadir" },
                  { value: "alpa", label: "Total Alpa" }
                ]}
              />
            </div>
            <button
              type="button"
              onClick={() => setSortDir(prev => prev === "asc" ? "desc" : "asc")}
              title={sortDir === "asc" ? "Urutan Naik" : "Urutan Turun"}
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

        {/* Tampilkan Data Action Button */}
        <button
          type="button"
          onClick={fetchData}
          className="w-full py-3 rounded-2xl font-black text-xs text-white flex items-center justify-center gap-2 transition-all shadow-md active:scale-98 cursor-pointer"
          style={{ background: "var(--ui-primary)" }}
        >
          <Wand2 size={16} strokeWidth={2.2} />
          Tampilkan Data
        </button>
      </div>

      {/* Mobile Pill Search Bar & Legend Badges */}
      <div className="sm:hidden flex flex-col gap-3">
        <div className="relative w-full">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama siswa..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white rounded-full border border-slate-200/80 text-xs font-semibold text-slate-700 shadow-xs focus:outline-none focus:border-[var(--ui-primary)]"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-[10px] font-extrabold no-scrollbar">
          <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60 shrink-0 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> HADIR
          </span>
          <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200/60 shrink-0 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> TELAT
          </span>
          <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200/60 shrink-0 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> IZIN/SKT
          </span>
          <span className="px-3 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200/60 shrink-0 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" /> ALPA
          </span>
        </div>
      </div>

      {/* Desktop Filter Container */}
      <div className="hidden sm:flex ui-card p-4 sm:p-6 flex-col gap-4 relative z-30">
        {/* Header Row */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-base font-black text-slate-800 flex items-center gap-2">
              <FileText size={18} className="text-[var(--ui-primary)]" />
              Laporan Absensi Siswa {user?.isWalas && `(Kelas ${user.walasClass})`}
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Rekap kehadiran siswa per bulan dalam bentuk matriks.
            </p>
          </div>
          <div className="flex items-center gap-2">
             <UISelect 
               value={exportMode}
               onChange={(e) => setExportMode(e.target.value)}
               className="text-xs py-1.5 h-10 px-3 border-slate-200"
             >
               <option value="summary">Ringkas (H/T/I/S/A)</option>
               <option value="detailed">Lengkap (Dengan Jam)</option>
             </UISelect>
             <Button variant="outline" size="sm" 
               onClick={() => handleExport(exportMode === 'detailed')}
               disabled={loading || data.length === 0}
               className="flex items-center gap-1.5 h-10 text-xs font-bold cursor-pointer"
             >
               <FileSpreadsheet size={14} className="shrink-0" />
               <span>Excel</span>
             </Button>
             <Button variant="outline" size="sm" 
               onClick={() => handleExportPDF(exportMode === 'detailed')}
               disabled={loading || data.length === 0}
               className="flex items-center gap-1.5 h-10 text-xs font-bold cursor-pointer"
             >
               <FileText size={14} className="shrink-0" />
               <span>PDF</span>
             </Button>
          </div>
        </div>

        {/* Filters Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-5 gap-3.5 items-end w-full">
           <div>
             <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Pilih Bulan</label>
             <CustomSelect 
               value={filter.month} 
               onChange={val => setFilter({ ...filter, month: parseInt(val) })}
               options={monthOptions}
             />
           </div>
           <div>
             <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Tahun</label>
             <CustomSelect 
               value={filter.year} 
               onChange={val => setFilter({ ...filter, year: parseInt(val) })}
               options={yearOptions.map(y => ({ value: y, label: y.toString() }))}
             />
           </div>
           <div>
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
             <div className="animate-in slide-in-from-left-2 duration-150">
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
           <div>
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
           <div>
             <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Urutkan Data</label>
             <div className="flex items-center gap-1.5">
               <CustomSelect
                 value={sortBy}
                 onChange={val => setSortBy(val)}
                 options={[
                   { value: "class_nis", label: "Per Kelas & NIS (1-9)" },
                   { value: "nis", label: "NIS / No. Absen (1-9)" },
                   { value: "name", label: "Nama Siswa (A-Z)" },
                   { value: "class_name", label: "Nama Kelas" },
                   { value: "hadir", label: "Total Hadir" },
                   { value: "alpa", label: "Total Alpa" }
                 ]}
               />
               <Button
                 type="button"
                 variant="outline"
                 onClick={() => setSortDir(prev => prev === "asc" ? "desc" : "asc")}
                 title={sortDir === "asc" ? "Naik (1-9 / A-Z)" : "Turun (9-1 / Z-A)"}
                 className="shrink-0 h-10 w-10 p-0 flex items-center justify-center rounded-xl"
               >
                 <ArrowUpDown size={15} />
               </Button>
             </div>
           </div>
        </div>

        {/* Action Button Bar */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100/90">
           <Button onClick={fetchData} className="px-5 py-2.5 flex items-center justify-center gap-2 font-black text-xs shadow-sm cursor-pointer">
             <Filter size={15} className="shrink-0" />
             <span>Terapkan Filter</span>
           </Button>
        </div>
      </div>

      <div className="bg-white rounded-[var(--ui-radius-small)] shadow-sm border-none overflow-hidden relative z-10">
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col md:flex-row justify-between items-center gap-4">
           <div className="relative w-full md:w-80">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                placeholder="Cari siswa..." 
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white border-none rounded-[var(--ui-radius-small)] text-sm font-semibold focus:outline-none focus:border-[var(--ui-primary)]"
              />
           </div>
            <div className="flex flex-wrap gap-4 text-[10px] font-black uppercase tracking-wider text-slate-500">
               <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-[var(--ui-radius-small)] bg-green-500 inline-block"></span> Tepat Waktu</span>
               <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-[var(--ui-radius-small)] bg-red-500 inline-block"></span> Terlambat</span>
               <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-[var(--ui-radius-small)] bg-blue-500 inline-block"></span> Izin</span>
               <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-[var(--ui-radius-small)] bg-amber-400 inline-block"></span> Sakit</span>
               <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-[var(--ui-radius-small)] bg-indigo-600 inline-block"></span> PKL</span>
               <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-[var(--ui-radius-small)] bg-slate-900 inline-block"></span> Alpa</span>
               <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-[var(--ui-radius-small)] bg-slate-200 inline-block"></span> Kosong</span>
            </div>
         </div>
         
         <div className="overflow-x-auto relative">
           <table className="w-full text-left border-collapse min-w-max">
             <thead>
               <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] uppercase tracking-wider">
                 <th className="px-4 py-3 font-black sticky left-0 bg-slate-50 z-10 border-r border-slate-200">NAMA SISWA</th>
                 <th className="px-3 py-3 font-black text-center border-r border-slate-200">HDR</th>
                 <th className="px-3 py-3 font-black text-center border-r border-slate-200">TLT</th>
                 <th className="px-3 py-3 font-black text-center border-r border-slate-200">IZN</th>
                 <th className="px-3 py-3 font-black text-center border-r border-slate-200">SKT</th>
                 <th className="px-3 py-3 font-black text-center border-r border-slate-200">ALP</th>
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
                   <td colSpan={6 + daysToRender.length} className="px-6 py-12 text-center text-slate-500 font-bold">Memuat data absen...</td>
                 </tr>
               ) : paginatedData.length === 0 ? (
                 <tr>
                   <td colSpan={6 + daysToRender.length} className="px-6 py-12 text-center text-slate-500 font-bold">Tidak ada data untuk filter ini.</td>
                 </tr>
               ) : (
                 paginatedData.map(d => (
                   <tr key={d.nis} className="border-b border-slate-100 hover:bg-slate-50/50">
                      <td className="px-4 py-3 sticky left-0 bg-white border-r border-slate-100 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] z-10">
                         <div className="font-bold text-slate-800 text-xs truncate max-w-[150px]" title={d.name}>{d.name}</div>
                         <div className="text-[9px] text-slate-400 font-bold truncate max-w-[150px]">{d.class_name ||'Tanpa Kelas'}</div>
                      </td>
                      <td className="px-3 py-3 text-center font-black text-emerald-600 border-r border-slate-100">{d.total_hadir}</td>
                      <td className="px-3 py-3 text-center font-black text-amber-600 border-r border-slate-100">
                          <div>{d.total_terlambat || 0}</div>
                          {(d.total_terlambat || 0) > 3 && (
                            <span className="mt-0.5 inline-block px-1.5 py-0.5 bg-amber-100 text-amber-800 text-[8.5px] font-black rounded border border-amber-200" title="Siswa mendapatkan Teguran & Poin Disiplin (+10) karena Terlambat > 3x">
                              ⚠️ Teguran (+10)
                            </span>
                          )}
                       </td>
                      <td className="px-3 py-3 text-center font-black text-blue-600 border-r border-slate-100">{d.total_izin || 0}</td>
                      <td className="px-3 py-3 text-center font-black text-amber-500 border-r border-slate-100">{d.total_sakit || 0}</td>
                      <td className="px-3 py-3 text-center font-black text-red-600 border-r border-slate-100">
                          <div>{d.total_alpa || 0}</div>
                          {(d.total_alpa || 0) > 5 && (
                            <span className="mt-0.5 inline-block px-1.5 py-0.5 bg-red-100 text-red-800 text-[8.5px] font-black rounded border border-red-200" title="Siswa mendapatkan SP-1 & Poin Disiplin (+15) karena Alpa > 5 Hari">
                              ⚠️ SP-1 (+15 Poin)
                            </span>
                          )}
                       </td>
                      {daysToRender.map((dayNum) => {
                         const dayData = d.days[dayNum];
                         if (!dayData) {
                            return (
                               <td 
                                 key={dayNum} 
                                 onClick={() => handleCellClick(d, dayNum)}
                                 className="px-1 py-3 text-center border-r border-slate-100 text-[10px] text-slate-300 cursor-pointer hover:bg-slate-50"
                               >
                                 -
                               </td>
                            );
                         }
                         const cellColors = getCellStyle(dayData);
                         return (
                            <td 
                              key={dayNum} 
                              onClick={() => handleCellClick(d, dayNum)}
                              className="px-1 py-2 text-center border-r border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors"
                            >
                               <div className={`text-[9px] font-black leading-tight p-1 rounded-[var(--ui-radius-small)] ${cellColors.className}`} style={cellColors.style}>
                                  {["Sakit","Izin","Alpa"].includes(dayData.status) || dayData.isPkl || String(dayData.status || '').startsWith("PKL") ? (
                                    <div className="py-1 flex flex-col items-center justify-center min-h-[32px]">
                                      <span className="font-extrabold">{dayData.isPkl || String(dayData.status || '').startsWith("PKL") ? "PKL" : dayData.status.toUpperCase()}</span>
                                      {dayData.gdrive_url && (
                                        <a 
                                          href={dayData.gdrive_url} 
                                          target="_blank" 
                                          rel="noreferrer" 
                                          onClick={(e) => e.stopPropagation()} 
                                          className="text-[7.5px] text-blue-600 hover:underline font-bold bg-white/60 px-1 rounded border border-blue-200 mt-0.5"
                                        >
                                          Lihat Surat
                                        </a>
                                      )}
                                    </div>
                                  ) : (
                                    <>
                                      <div>{dayData.in?.substring(0,5) ||'--:--'}</div>
                                      <div className="border-t border-black/10 my-0.5"></div>
                                      <div>{dayData.out?.substring(0,5) ||'--:--'}</div>
                                    </>
                                  )}
                               </div>
                            </td>
                         );
                      })}
                   </tr>
                 ))
               )}
             </tbody>
           </table>
         </div>

        <TablePagination 
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filteredData.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={(val) => { setItemsPerPage(val); setCurrentPage(1); }}
        />
       </div>

       {/* Input Ketidakhadiran Modal */}
       {selectedCell && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
           <div className="bg-white rounded-[var(--ui-radius-card)] shadow-lg max-w-sm w-full overflow-hidden animate-in zoom-in-95 duration-200">
             <div className="flex items-center justify-between p-4 border-b border-slate-100">
               <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Input Ketidakhadiran</h3>
               <Button variant="outline" 
                 type="button" 
                 onClick={() =>setSelectedCell(null)}
                 
               >
                 <X size={16} /></Button>
             </div>
             
             <form onSubmit={handleCellSubmit} className="p-4 space-y-4">
               <div>
                 <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">Nama Siswa</label>
                 <div className="text-xs font-black text-slate-800">{selectedCell.name} ({selectedCell.nis})</div>
               </div>

               <div>
                 <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">Tanggal</label>
                 <div className="text-xs font-black text-slate-800">
                   {String(selectedCell.day).padStart(2,'0')} / {String(filter.month).padStart(2,'0')} / {filter.year}
                 </div>
               </div>

               <div>
                 <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">Status Kehadiran</label>
                 <UISelect
                   value={permissionForm.status}
                   onChange={(e) => setPermissionForm({ ...permissionForm, status: e.target.value })}
                   className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-[var(--ui-radius-small)] text-xs font-black focus:outline-[var(--ui-primary)]"
                 >
                   <option value="Sakit">Sakit</option>
                   <option value="Izin">Izin</option>
                   <option value="Terlambat">Terlambat (Tetap Masuk)</option>
                   <option value="Alpa">Alpa (Tanpa Keterangan)</option>
                 </UISelect>
               </div>

               {["Sakit","Izin","Terlambat"].includes(permissionForm.status) && (
                 <div>
                   <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">
                     Upload Surat / Bukti (Gambar)
                   </label>
                   <input
                     type="file"
                     accept="image/*"
                     onChange={handleFileChange}
                     className="w-full bg-slate-50 border border-slate-200 p-2 rounded-[var(--ui-radius-small)] text-xs font-semibold"
                   />
                    {permissionForm.fileData && (
                      <div className="inline-flex items-center gap-1 text-[9px] text-emerald-600 font-bold mt-1">
                        <CheckCircle2 size={11} className="shrink-0 text-emerald-600" />
                        <span>Gambar dikompres ({permissionForm.fileSizeKB} KB)</span>
                      </div>
                    )}
                 </div>
               )}

               <div>
                 <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">Keterangan / Alasan</label>
                 <textarea
                   required
                   rows={3}
                   value={permissionForm.keterangan}
                   onChange={(e) => setPermissionForm({ ...permissionForm, keterangan: e.target.value })}
                   placeholder="Tulis alasan ketidakhadiran siswa di sini..."
                   className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-[var(--ui-radius-small)] text-xs font-semibold focus:outline-[var(--ui-primary)]"
                 />
               </div>

               <div className="text-[9px] font-bold text-amber-600 bg-amber-50 p-2.5 rounded-[var(--ui-radius-small)] border border-amber-100 leading-normal">
                 ⚠️ Catatan: Pengajuan ketidakhadiran dari halaman ini memerlukan persetujuan dari Tata Usaha atau Kesiswaan sebelum aktif di laporan rekapitulasi.
               </div>

               <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                 <Button variant="outline" 
                   type="button" 
                   onClick={() =>setSelectedCell(null)}
                   disabled={isSubmittingCell}
                   
                 >
                   Batal</Button>
                 <Button variant="outline" 
                   type="submit" 
                   disabled={isSubmittingCell}
                  >{isSubmittingCell ?"Menyimpan..." :"Simpan Pengajuan"}</Button>
               </div>
             </form>
           </div>
         </div>
       )}
        </>
      )}
      {toast && (
        <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-[var(--ui-radius-small)] shadow-lg font-medium text-sm flex items-center gap-2 animate-in slide-in-from-bottom-5 text-white z-[100] ${toast.type ==='error' ?'bg-red-600' :'bg-emerald-600'}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
