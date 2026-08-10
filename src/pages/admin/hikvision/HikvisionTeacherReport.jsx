import { Button, TablePagination } from '../../../components/ui.jsx';
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import useAuthStore from'../../../store/monitoring/authStore';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Users, Filter, Search, Printer, FileText, X, Calendar, Award, Plus, Download, FileSpreadsheet, Share2, ArrowUpDown } from 'lucide-react';
import { CustomSelect } from'../../../components/CustomSelect.jsx';
import { PageHeader } from '../../../components/monitoring/ui/index.js';
import { Modal } from'../../../components/ui.jsx';
import { UISelect } from'../../../components/ui.jsx';
import { getDatabaseSnapshot } from '../../../utils/dataSource.js';
import { useAppStore } from '../../../store/useAppStore';
import { compareTableValues } from '../../../utils/adminHelpers.js';


export default function HikvisionTeacherReport({ isNested = false }) {
  const user = useAuthStore(state => state.user);
  const authToken = user?.authToken;
  
  const [data, setData] = useState([]);
  const [toast, setToast] = useState(null);
  const [subTab, setSubTab] = useState("matriks"); //"matriks" |"perguru"
  const [selectedTeacherForRapor, setSelectedTeacherForRapor] = useState(null);
  const [raporPaperSize, setRaporPaperSize] = useState(() => getDatabaseSnapshot()?.appSettings?.defaultPaperSize || 'A4');


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

  // Manual entry form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [teachers, setTeachers] = useState([]);
  const [form, setForm] = useState({
    teacherCode:"",
    date: new Date().toISOString().split('T')[0],
    status:"Izin",
    note:""
  });
  const [submitting, setSubmitting] = useState(false);
  const [sendingWA, setSendingWA] = useState(false);
  const [waDropdownOpen, setWaDropdownOpen] = useState(false);

  const handleBlastWA = async (type) => {
    setSendingWA(true);
    setWaDropdownOpen(false);
    try {
      const payload = {
        target:'guru',
        type: type,
        month: filter.month,
        year: filter.year,
        date: new Date().toISOString().split('T')[0]
      };
      
      const res = await fetch("/api/whatsapp/send-rekap", {
        method:"POST",
        headers: {"Authorization": `Bearer ${authToken}`,"Content-Type":"application/json"
        },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (res.ok && json.ok) {
        showToast(`Berhasil mengirim rekap ${type ==='daily' ?'harian' :'bulanan'} guru ke WhatsApp!`);
      } else {
        showToast(json.error || `Gagal mengirim rekap ke WhatsApp.`,"error");
      }
    } catch (err) {
      console.error(err);
      showToast("Terjadi kesalahan koneksi saat mengirim WhatsApp.","error");
    }
    setSendingWA(false);
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/hikvision/report/matrix", {
        method:'POST',
        headers: {"Authorization": `Bearer ${authToken}`,"Content-Type":"application/json"
        },
        body: JSON.stringify({ ...filter, type:'guru' })
      });
      const json = await res.json();
      if (json.ok) {
        setData(json.data || []);
        setDaysInMonth(json.daysInMonth || 31);
      } else {
        showToast(json.error ||"Gagal memuat laporan","error");
      }
    } catch (err) {
      console.error(err);
      showToast("Terjadi kesalahan jaringan.","error");
    }
    setLoading(false);
  }, [authToken, filter]);

  const fetchTeachers = useCallback(async () => {
    try {
      const res = await fetch("/api/data/load", {
        headers: {"Authorization": `Bearer ${authToken}` }
      });
      const json = await res.json();
      if (json.ok && json.payload && json.payload.teachers) {
        setTeachers(json.payload.teachers || []);
      }
    } catch (err) {
      console.error(err);
    }
  }, [authToken]);

  useEffect(() => {
    fetchData();
    fetchTeachers();
  }, [fetchData, fetchTeachers]);

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
      const sheet = workbook.addWorksheet('Laporan Absensi Guru');

      // Define columns
      const columns = [
        { header: 'NIP / ID', key: 'nis', width: 20 },
        { header: 'Nama Guru', key: 'name', width: 35 },
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
      filteredData.forEach((item, rowIndex) => {
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
      saveAs(new Blob([buffer]), `Laporan_Absensi_Guru_${filter.year}_${filter.month}.xlsx`);
    } catch (err) {
      console.error(err);
      showToast("Gagal mengunduh Excel Guru: " + err.message, "error");
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
      doc.text(`LAPORAN KINERJA & KEHADIRAN GURU`, 14, startY + 6);
      
      doc.setFontSize(9);
      doc.setFont("Helvetica", "normal");
      doc.text(`Periode: ${monthName} ${filter.year}`, 14, startY + 12);
      
      const headers = [["NIP / Kode", "Nama Guru", "H", "T"]];
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
            row.push(content);
          }
        }
        return row;
      });

      const pdfFooters = [
        ["TOTAL HADIR (HDR)", "", String(filteredData.reduce((a, s) => a + (s.total_hadir || 0), 0)), String(filteredData.reduce((a, s) => a + (s.total_terlambat || 0), 0)), ...Array.from({ length: daysInMonth }, (_, i) => String(dailyTotals.hadir[i + 1] || 0))],
        ["TOTAL TERLAMBAT (TLT)", "", "-", "-", ...Array.from({ length: daysInMonth }, (_, i) => String(dailyTotals.terlambat[i + 1] || 0))],
        ["TOTAL IZIN (IZN)", "", "-", "-", ...Array.from({ length: daysInMonth }, (_, i) => String(dailyTotals.izin[i + 1] || 0))],
        ["TOTAL SAKIT (SKT)", "", "-", "-", ...Array.from({ length: daysInMonth }, (_, i) => String(dailyTotals.sakit[i + 1] || 0))],
        ["TOTAL ALPA (ALP)", "", "-", "-", ...Array.from({ length: daysInMonth }, (_, i) => String(dailyTotals.alpa[i + 1] || 0))]
      ];

      autoTable(doc, {
        startY: startY + 16,
        head: headers,
        body: body,
        foot: pdfFooters,
        showFoot: 'lastPage',
        theme: 'grid',
        styles: { fontSize: 6, cellPadding: 1, halign: 'center', valign: 'middle', lineColor: [203, 213, 225], lineWidth: 0.1 },
        headStyles: { fillColor: [241, 245, 249], textColor: [51, 65, 85], fontStyle: 'bold' },
        footStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold', fontSize: 5 },
        columnStyles: {
          0: { halign: 'left', cellWidth: 20 },
          1: { halign: 'left', cellWidth: 40 },
          2: { cellWidth: 6 },
          3: { cellWidth: 6 },
        },
        didParseCell: function (data) {
          if (data.section === 'body') {
            const rowItem = filteredData[data.row.index];
            if (rowItem) {
              const v = checkViolation(rowItem, daysToRender);
              if (v.level === 4) {
                data.cell.styles.fillColor = [159, 18, 57];
                data.cell.styles.textColor = [255, 255, 255];
                data.cell.styles.fontStyle = 'bold';
              } else if (v.level === 3) {
                data.cell.styles.fillColor = [254, 226, 226];
                data.cell.styles.textColor = [153, 27, 27];
              } else if (v.level === 2) {
                data.cell.styles.fillColor = [255, 237, 213];
                data.cell.styles.textColor = [194, 65, 12];
              } else if (v.level === 1) {
                data.cell.styles.fillColor = [254, 243, 199];
                data.cell.styles.textColor = [146, 64, 14];
              }
            }

            if (data.column.index >= 4 && typeof data.cell.raw === 'string') {
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
          } else if (data.section === 'foot') {
            data.cell.styles.fontStyle = 'bold';
            if (data.row.index === 0) {
              data.cell.styles.fillColor = [220, 252, 231];
              data.cell.styles.textColor = [22, 101, 52];
            } else if (data.row.index === 1) {
              data.cell.styles.fillColor = [254, 226, 226];
              data.cell.styles.textColor = [153, 27, 27];
            } else if (data.row.index === 2) {
              data.cell.styles.fillColor = [219, 234, 254];
              data.cell.styles.textColor = [30, 58, 138];
            } else if (data.row.index === 3) {
              data.cell.styles.fillColor = [254, 243, 199];
              data.cell.styles.textColor = [146, 64, 14];
            } else if (data.row.index === 4) {
              data.cell.styles.fillColor = [15, 23, 42];
              data.cell.styles.textColor = [255, 255, 255];
            }
          }
        }
      });

      const finalY = (doc.lastAutoTable?.finalY || 120) + 6;
      doc.setFontSize(7);
      doc.setFont("Helvetica", "bold");
      doc.text("Keterangan Status & Sorotan Peringatan:", 14, finalY);
      
      doc.setFont("Helvetica", "normal");
      doc.setFillColor(220, 252, 231); doc.rect(14, finalY + 2, 3, 3, 'F'); doc.text("Hadir (H)", 18, finalY + 4.5);
      doc.setFillColor(254, 226, 226); doc.rect(34, finalY + 2, 3, 3, 'F'); doc.text("Terlambat (T)", 38, finalY + 4.5);
      doc.setFillColor(254, 243, 199); doc.rect(60, finalY + 2, 3, 3, 'F'); doc.text("Sakit (S)", 64, finalY + 4.5);
      doc.setFillColor(219, 234, 254); doc.rect(80, finalY + 2, 3, 3, 'F'); doc.text("Izin (I)", 84, finalY + 4.5);
      doc.setFillColor(15, 23, 42);    doc.rect(98, finalY + 2, 3, 3, 'F'); doc.text("Alpa (A)", 102, finalY + 4.5);

      doc.setFillColor(254, 243, 199); doc.rect(122, finalY + 2, 3, 3, 'F'); doc.text("Kuning: Peringatan (≥3x)", 126, finalY + 4.5);
      doc.setFillColor(255, 237, 213); doc.rect(162, finalY + 2, 3, 3, 'F'); doc.text("Orange: Pelanggaran Sedang (≥5x)", 166, finalY + 4.5);
      doc.setFillColor(254, 226, 226); doc.rect(212, finalY + 2, 3, 3, 'F'); doc.text("Merah: Pelanggaran Berat (≥7x)", 216, finalY + 4.5);
      doc.setFillColor(159, 18, 57);   doc.rect(258, finalY + 2, 3, 3, 'F'); doc.text("Merah Gelap: SP (≥10x)", 262, finalY + 4.5);
      
      doc.save(`Laporan_Absensi_Guru_${filter.year}_${filter.month}.pdf`);
      showToast("Laporan PDF Guru berhasil diunduh!", "success");
    } catch (err) {
      console.error("Gagal mengekspor PDF Guru:", err);
      showToast("Gagal mengunduh PDF Guru: " + err.message, "error");
    } finally {
      setTimeout(() => {
        isExportingRef.current = false;
        setIsExporting(false);
      }, 1000);
    }
  };

  const printRaporGuruPDF = (teacher, size ='A4') => {
    const doc = new jsPDF({
      orientation:'portrait',
      unit:'mm',
      format: size ==='A4' ?'a4' : [215, 330]
    });

    const pageWidth = size ==='A4' ? 210 : 215;

    // Header
    doc.setFont("Helvetica","bold");
    doc.setFontSize(14);
    doc.text("RAPOR KINERJA & KEHADIRAN GURU", pageWidth / 2, 20, { align:"center" });

    doc.setFontSize(10);
    doc.setFont("Helvetica","normal");
    doc.text(`Tahun Ajaran: ${filter.year} / ${filter.year + 1}`, pageWidth / 2, 25, { align:"center" });
    doc.line(15, 28, pageWidth - 15, 28);

    // Identitas Guru
    doc.setFont("Helvetica","bold");
    doc.text("IDENTITAS GURU", 15, 36);
    doc.setFont("Helvetica","normal");

    doc.text(`Nama Guru`, 15, 42);
    doc.text(`: ${teacher.name}`, 45, 42);
    doc.text(`NIP / Kode`, 15, 47);
    doc.text(`: ${teacher.nis}`, 45, 47);
    doc.text(`Kategori`, 15, 52);
    doc.text(`: ${teacher.class_name ||'Guru'}`, 45, 52);

    // I. Kehadiran Section
    doc.setFont("Helvetica","bold");
    doc.text("I. REKAPITULASI KEHADIRAN FINGERPRINT", 15, 62);
    doc.setFont("Helvetica","normal");

    doc.rect(15, 66, pageWidth - 30, 16);
    doc.line(15, 74, pageWidth - 15, 74);

    const colWidth = (pageWidth - 30) / 5;
    doc.line(15 + colWidth, 66, 15 + colWidth, 82);
    doc.line(15 + colWidth * 2, 66, 15 + colWidth * 2, 82);
    doc.line(15 + colWidth * 3, 66, 15 + colWidth * 3, 82);
    doc.line(15 + colWidth * 4, 66, 15 + colWidth * 4, 82);

    doc.setFont("Helvetica","bold");
    doc.text("Hadir", 15 + colWidth / 2, 71, { align:"center" });
    doc.text("Telat", 15 + colWidth * 1.5, 71, { align:"center" });
    doc.text("Izin", 15 + colWidth * 2.5, 71, { align:"center" });
    doc.text("Sakit", 15 + colWidth * 3.5, 71, { align:"center" });
    doc.text("Alpa", 15 + colWidth * 4.5, 71, { align:"center" });

    doc.setFont("Helvetica","normal");
    doc.text(`${teacher.total_hadir || 0} hari`, 15 + colWidth / 2, 79, { align:"center" });
    doc.text(`${teacher.total_terlambat || 0} kali`, 15 + colWidth * 1.5, 79, { align:"center" });
    doc.text(`${teacher.total_izin || 0} hari`, 15 + colWidth * 2.5, 79, { align:"center" });
    doc.text(`${teacher.total_sakit || 0} hari`, 15 + colWidth * 3.5, 79, { align:"center" });
    doc.text(`${teacher.total_alpa || 0} hari`, 15 + colWidth * 4.5, 79, { align:"center" });

    // II. Kinerja Mengajar Section
    doc.setFont("Helvetica","bold");
    doc.text("II. BEBAN MENGAJAR & TUGAS (JP)", 15, 92);
    doc.setFont("Helvetica","normal");

    // Find teaching stats
    const matchedGuruObj = teachers.find(g => String(g.code).trim().toLowerCase() === String(teacher.nis).trim().toLowerCase());
    const targetJP = matchedGuruObj?.targetWeeklyJp || 24;
    const preferredGrade = matchedGuruObj?.preferredGrade ||"Semua";
    const preferredMajor = matchedGuruObj?.preferredMajor ||"Semua";

    doc.text(`Target JP Mingguan`, 15, 98);
    doc.text(`: ${targetJP} JP`, 55, 98);
    doc.text(`Prioritas Tingkat`, 15, 103);
    doc.text(`: ${preferredGrade !=='Semua' ?'Tingkat' + preferredGrade :'Semua Tingkat'}`, 55, 103);
    doc.text(`Prioritas Jurusan`, 15, 108);
    doc.text(`: ${preferredMajor !=='Semua' ? preferredMajor :'Semua Jurusan'}`, 55, 108);

    // III. Skor Kredit & Kinerja Guru
    doc.setFont("Helvetica","bold");
    doc.text("III. EVALUASI AKHIR SKOR KINERJA & KREDIT GURU", 15, 120);
    
    const alpaDeduction = (teacher.total_alpa || 0) * 5;
    const lateDeduction = (teacher.total_terlambat || 0) * 1;
    const totalDeductions = alpaDeduction + lateDeduction;
    const finalScore = Math.max(0, 100 - totalDeductions);

    doc.rect(15, 124, pageWidth - 30, 20);
    doc.line(15, 124 + 10, pageWidth - 15, 124 + 10);
    doc.line(pageWidth / 2, 124, pageWidth / 2, 124 + 20);

    doc.text("Skor Kinerja Awal: 100 Poin", 15 + (pageWidth - 30) / 4, 124 + 6.5, { align:"center" });
    doc.text(`Total Poin Pengurangan: -${totalDeductions} Poin`, 15 + (pageWidth - 30) * 0.75, 124 + 6.5, { align:"center" });

    doc.text("SKOR KINERJA AKHIR", 15 + (pageWidth - 30) / 4, 124 + 16.5, { align:"center" });
    doc.text(`${finalScore} / 100 Poin`, 15 + (pageWidth - 30) * 0.75, 124 + 16.5, { align:"center" });

    // Predicate
    let predikat ="SANGAT BAIK";
    if (finalScore < 70) {
      predikat ="CUKUP / PERLU PEMBINAAN";
    } else if (finalScore < 85) {
      predikat ="BAIK";
    }

    doc.setFont("Helvetica","bold");
    doc.text(`PREDIKAT EVALUASI: ${predikat}`, pageWidth / 2, 153, { align:"center" });

    // Signature Block
    let currentY = 170;
    doc.text("Mengetahui,", 20, currentY);
    doc.text("Guru Bersangkutan,", pageWidth - 60, currentY);

    currentY += 25;
    doc.line(20, currentY, 70, currentY);
    doc.line(pageWidth - 60, currentY, pageWidth - 20, currentY);

    doc.setFont("Helvetica","normal");
    doc.text("Kepala Sekolah / Waka", 20, currentY + 4);
    doc.text(teacher.name, pageWidth - 60, currentY + 4);

    doc.save(`Rapor_Kinerja_Guru_${teacher.name.replace(/\s+/g,'_')}.pdf`);
    showToast(`Rapor kinerja ${teacher.name} berhasil diunduh!`);
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (!form.teacherCode) return showToast("Pilih guru terlebih dahulu!","warning");
    setSubmitting(true);
    try {
      const res = await fetch("/api/hikvision/manual-attendance", {
        method:"POST",
        headers: {"Authorization": `Bearer ${authToken}`,"Content-Type":"application/json"
        },
        body: JSON.stringify(form)
      });
      const json = await res.json();
      if (json.ok) {
        showToast(`Berhasil menyimpan status ${form.status} untuk guru!`);
        setIsModalOpen(false);
        setForm({
          teacherCode:"",
          date: new Date().toISOString().split('T')[0],
          status:"Izin",
          note:""
        });
        fetchData();
      } else {
        showToast(json.error ||"Gagal menyimpan absensi manual","error");
      }
    } catch (err) {
      console.error(err);
      showToast("Kesalahan jaringan.","error");
    }
    setSubmitting(false);
  };

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  // Reset page when search or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, filter.month, filter.year, sortBy, sortDir]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1;
  const paginatedData = React.useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredData, currentPage, itemsPerPage]);

  const checkViolation = useCallback((d, daysList = []) => {
    let maxConsecutiveLate = 0;
    let currConsecutiveLate = 0;

    daysList.forEach(dayNum => {
      const dayData = (d.days || {})[dayNum];
      if (dayData && (dayData.isLate || dayData.status === "Terlambat")) {
        currConsecutiveLate++;
        if (currConsecutiveLate > maxConsecutiveLate) {
          maxConsecutiveLate = currConsecutiveLate;
        }
      } else if (dayData && (dayData.in || dayData.out || dayData.status)) {
        currConsecutiveLate = 0;
      }
    });

    const totalLate = d.total_terlambat || 0;
    const totalAlpa = d.total_alpa || 0;
    const isLateViolation = maxConsecutiveLate >= 3 || totalLate >= 3;
    const isAlpaViolation = totalAlpa > 4;

    let level = 0;
    let bgClass = "border-slate-100 hover:bg-slate-50/50";
    let stickyBgClass = "bg-white border-slate-100 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]";
    let textClass = "text-slate-800";
    let subTextClass = "text-slate-400";

    if (totalLate >= 10 || totalAlpa >= 10) {
      level = 4; // Dark Red
      bgClass = "bg-rose-900 text-white hover:bg-rose-950 border-rose-950 font-bold";
      stickyBgClass = "bg-rose-900 border-rose-950 text-white shadow-xs";
      textClass = "text-white font-extrabold";
      subTextClass = "text-rose-200 font-semibold";
    } else if (totalLate >= 7 || totalAlpa >= 8) {
      level = 3; // Red
      bgClass = "bg-rose-100/90 hover:bg-rose-200/90 border-rose-300 font-semibold text-rose-950";
      stickyBgClass = "bg-rose-100 border-rose-300 text-rose-950 shadow-[2px_0_5px_-2px_rgba(225,29,72,0.25)]";
      textClass = "text-rose-950 font-extrabold";
      subTextClass = "text-rose-700 font-semibold";
    } else if (totalLate >= 5 || totalAlpa >= 6) {
      level = 2; // Orange
      bgClass = "bg-orange-100/90 hover:bg-orange-200/90 border-orange-300 font-semibold text-orange-950";
      stickyBgClass = "bg-orange-100 border-orange-300 text-orange-950 shadow-[2px_0_5px_-2px_rgba(234,88,12,0.25)]";
      textClass = "text-orange-950 font-extrabold";
      subTextClass = "text-orange-700 font-semibold";
    } else if (isLateViolation || isAlpaViolation) {
      level = 1; // Yellow
      bgClass = "bg-amber-100/90 hover:bg-amber-200/90 border-amber-300 font-semibold text-amber-950";
      stickyBgClass = "bg-amber-100 border-amber-300 text-amber-950 shadow-[2px_0_5px_-2px_rgba(217,119,6,0.25)]";
      textClass = "text-amber-950 font-extrabold";
      subTextClass = "text-amber-800 font-semibold";
    }

    return {
      isLateViolation,
      isAlpaViolation,
      level,
      bgClass,
      stickyBgClass,
      textClass,
      subTextClass
    };
  }, []);

  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printPeriod, setPrintPeriod] = useState("bulanan");
  const [printDate, setPrintDate] = useState(new Date().getDate());
  const [printWeek, setPrintWeek] = useState(1);
  const [printSemester, setPrintSemester] = useState("ganjil");

  const dailyTotals = React.useMemo(() => {
    const totals = { hadir: {}, terlambat: {}, izin: {}, sakit: {}, alpa: {} };
    daysToRender.forEach(d => {
      totals.hadir[d] = 0; totals.terlambat[d] = 0; totals.izin[d] = 0; totals.sakit[d] = 0; totals.alpa[d] = 0;
    });

    filteredData.forEach(item => {
      daysToRender.forEach(dayNum => {
        const dayData = (item.days || {})[dayNum];
        if (dayData) {
          const status = dayData.status || (dayData.isLate ? "Terlambat" : (dayData.in || dayData.out ? "Hadir" : ""));
          if (status === "Sakit") totals.sakit[dayNum]++;
          else if (status === "Izin" || status === "Dinas Luar") totals.izin[dayNum]++;
          else if (status === "Alpa" || status === "Alpa (Tanpa Keterangan)" || status === "Belum Scan") totals.alpa[dayNum]++;
          else if (dayData.isLate || status === "Terlambat") totals.terlambat[dayNum]++;
          else if (dayData.in || dayData.out || status === "Hadir") totals.hadir[dayNum]++;
        }
      });
    });

    return totals;
  }, [filteredData, daysToRender]);

  const schoolProfile = useAppStore(state => state.schoolProfile) || {};
  const schoolName = schoolProfile.schoolName || "SMK NEGERI INTEGRATED SCHOOL";
  const schoolAddress = schoolProfile.address || "Jl. Pendidikan No. 1, Kota Edukasi";

  const handlePrintPeriod = async () => {
    try {
      const monthName = monthOptions.find(m => m.value === filter.month)?.label || "";
      const todayDateStr = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

      let periodTitle = "";
      let periodSubTitle = "";
      let printDays = [];

      if (printPeriod === "harian") {
        periodTitle = `LAPORAN ABSENSI HARIAN GURU (${printDate} ${monthName.toUpperCase()} ${filter.year})`;
        periodSubTitle = `Tanggal: ${printDate} ${monthName} ${filter.year} | Target: Rekap Tenaga Pendidik`;
        printDays = [printDate];
      } else if (printPeriod === "mingguan") {
        const startDay = (printWeek - 1) * 7 + 1;
        const endDay = Math.min(printWeek * 7, daysInMonth);
        periodTitle = `LAPORAN ABSENSI MINGGUAN GURU (MINGGU KE-${printWeek})`;
        periodSubTitle = `Periode: Tanggal ${startDay} - ${endDay} ${monthName} ${filter.year}`;
        printDays = [];
        for (let i = startDay; i <= endDay; i++) printDays.push(i);
      } else if (printPeriod === "bulanan") {
        periodTitle = `LAPORAN MATRIKS ABSENSI BULANAN GURU`;
        periodSubTitle = `Bulan: ${monthName} ${filter.year}`;
        printDays = daysToRender;
      } else if (printPeriod === "semester") {
        const semMonths = printSemester === "ganjil" ? "Juli - Desember" : "Januari - Juni";
        periodTitle = `REKAPAN ABSENSI GURU 1 SEMESTER (${printSemester.toUpperCase()})`;
        periodSubTitle = `Tahun Ajaran ${filter.year}/${filter.year + 1} (${semMonths})`;
      }

      const printWindow = window.open('', '_blank');
      if (!printWindow) return showToast("Pop-up diblokir browser, izinkan pop-up untuk mencetak.", "warning");

      let tableHtml = "";

      if (printPeriod === "semester") {
        tableHtml = `
          <table class="table-data">
            <thead>
              <tr>
                <th style="width: 25px;">NO</th>
                <th style="width: 85px;">KODE / NIP</th>
                <th style="text-align: left;">NAMA GURU</th>
                <th style="width: 50px;">HADIR</th>
                <th style="width: 50px;">TERLAMBAT</th>
                <th style="width: 50px;">IZIN</th>
                <th style="width: 50px;">SAKIT</th>
                <th style="width: 50px;">ALPA</th>
                <th style="width: 60px;">% HADIR</th>
              </tr>
            </thead>
            <tbody>
              ${filteredData.map((s, idx) => {
                const totalH = s.total_hadir || 0;
                const totalT = s.total_terlambat || 0;
                const totalI = s.total_izin || 0;
                const totalS = s.total_sakit || 0;
                const totalA = s.total_alpa || 0;
                const totalEff = totalH + totalT + totalI + totalS + totalA;
                const pct = totalEff > 0 ? Math.round(((totalH + totalT) / totalEff) * 100) : 100;
                return `
                  <tr>
                    <td>${idx + 1}</td>
                    <td>${s.nis || '-'}</td>
                    <td style="text-align: left; font-weight: bold;">${s.name}</td>
                    <td class="bg-hadir">${totalH}</td>
                    <td class="bg-terlambat">${totalT}</td>
                    <td class="bg-izin">${totalI}</td>
                    <td class="bg-sakit">${totalS}</td>
                    <td class="bg-alpa">${totalA}</td>
                    <td style="font-weight: bold;">${pct}%</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
            <tfoot>
              <tr style="background-color: #f8fafc; font-weight: bold;">
                <td colspan="3" style="text-align: right; font-weight: bold;">TOTAL KESELURUHAN GURU:</td>
                <td class="bg-hadir">${filteredData.reduce((acc, s) => acc + (s.total_hadir || 0), 0)}</td>
                <td class="bg-terlambat">${filteredData.reduce((acc, s) => acc + (s.total_terlambat || 0), 0)}</td>
                <td class="bg-izin">${filteredData.reduce((acc, s) => acc + (s.total_izin || 0), 0)}</td>
                <td class="bg-sakit">${filteredData.reduce((acc, s) => acc + (s.total_sakit || 0), 0)}</td>
                <td class="bg-alpa">${filteredData.reduce((acc, s) => acc + (s.total_alpa || 0), 0)}</td>
                <td>-</td>
              </tr>
            </tfoot>
          </table>
        `;
      } else {
        tableHtml = `
          <table class="table-data">
            <thead>
              <tr>
                <th style="width: 25px;">NO</th>
                <th style="text-align: left; min-width: 140px;">NAMA GURU</th>
                <th style="width: 32px;">HDR</th>
                <th style="width: 32px;">TLT</th>
                <th style="width: 32px;">IZN</th>
                <th style="width: 32px;">SKT</th>
                <th style="width: 32px;">ALP</th>
                ${printDays.map(d => `<th style="width: 26px;">${d}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${filteredData.map((s, idx) => {
                const v = checkViolation(s, printDays);
                let warnClass = "";
                if (v.level === 4) warnClass = "row-warn-4";
                else if (v.level === 3) warnClass = "row-warn-3";
                else if (v.level === 2) warnClass = "row-warn-2";
                else if (v.level === 1) warnClass = "row-warn-1";

                return `
                  <tr class="${warnClass}">
                    <td>${idx + 1}</td>
                    <td style="text-align: left; font-weight: bold;">
                      <div>${s.name}</div>
                      <div style="font-size: 8px; opacity: 0.8;">${s.nis || ''}</div>
                    </td>
                    <td class="bg-hadir">${s.total_hadir || 0}</td>
                    <td class="bg-terlambat">${s.total_terlambat || 0}</td>
                    <td class="bg-izin">${s.total_izin || 0}</td>
                    <td class="bg-sakit">${s.total_sakit || 0}</td>
                    <td class="bg-alpa">${s.total_alpa || 0}</td>
                    ${printDays.map(d => {
                      const dayData = (s.days || {})[d];
                      if (!dayData) return `<td>-</td>`;
                      const status = dayData.status || (dayData.isLate ? "Terlambat" : (dayData.in || dayData.out ? "Hadir" : ""));
                      if (status === "Sakit") return `<td class="bg-sakit">S</td>`;
                      if (status === "Izin" || status === "Dinas Luar") return `<td class="bg-izin">I</td>`;
                      if (status === "Alpa" || status === "Alpa (Tanpa Keterangan)" || status === "Belum Scan") return `<td class="bg-alpa">A</td>`;
                      if (dayData.isLate || status === "Terlambat") return `<td class="bg-terlambat">T</td>`;
                      if (dayData.in || dayData.out || status === "Hadir") return `<td class="bg-hadir">H</td>`;
                      return `<td>-</td>`;
                    }).join('')}
                  </tr>
                `;
              }).join('')}
            </tbody>
            <tfoot>
              <tr class="bg-hadir" style="background-color: #f0fdf4;">
                <td colspan="2" style="text-align: right; font-weight: bold; color: #166534;">TOTAL HADIR (HDR):</td>
                <td>${filteredData.reduce((acc, s) => acc + (s.total_hadir || 0), 0)}</td>
                <td>-</td><td>-</td><td>-</td><td>-</td>
                ${printDays.map(d => `<td>${dailyTotals.hadir[d] || 0}</td>`).join('')}
              </tr>
              <tr class="bg-terlambat" style="background-color: #fef2f2;">
                <td colspan="2" style="text-align: right; font-weight: bold; color: #991b1b;">TOTAL TERLAMBAT (TLT):</td>
                <td>-</td><td>${filteredData.reduce((acc, s) => acc + (s.total_terlambat || 0), 0)}</td>
                <td>-</td><td>-</td><td>-</td>
                ${printDays.map(d => `<td>${dailyTotals.terlambat[d] || 0}</td>`).join('')}
              </tr>
              <tr class="bg-izin" style="background-color: #eff6ff;">
                <td colspan="2" style="text-align: right; font-weight: bold; color: #1e3a8a;">TOTAL IZIN (IZN):</td>
                <td>-</td><td>-</td><td>${filteredData.reduce((acc, s) => acc + (s.total_izin || 0), 0)}</td>
                <td>-</td><td>-</td>
                ${printDays.map(d => `<td>${dailyTotals.izin[d] || 0}</td>`).join('')}
              </tr>
              <tr class="bg-sakit" style="background-color: #fffbeb;">
                <td colspan="2" style="text-align: right; font-weight: bold; color: #92400e;">TOTAL SAKIT (SKT):</td>
                <td>-</td><td>-</td><td>-</td><td>${filteredData.reduce((acc, s) => acc + (s.total_sakit || 0), 0)}</td>
                <td>-</td>
                ${printDays.map(d => `<td>${dailyTotals.sakit[d] || 0}</td>`).join('')}
              </tr>
              <tr class="bg-alpa" style="background-color: #0f172a; color: white;">
                <td colspan="2" style="text-align: right; font-weight: bold; color: white;">TOTAL ALPA (ALP):</td>
                <td style="color:white;">-</td><td style="color:white;">-</td><td style="color:white;">-</td><td style="color:white;">-</td>
                <td style="color: #ef4444; font-weight: bold;">${filteredData.reduce((acc, s) => acc + (s.total_alpa || 0), 0)}</td>
                ${printDays.map(d => `<td style="color:white;">${dailyTotals.alpa[d] || 0}</td>`).join('')}
              </tr>
            </tfoot>
          </table>
        `;
      }

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>${periodTitle}</title>
          <style>
            @media print {
              @page { size: landscape; margin: 10mm; }
              body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 10px; }
            }
            body { font-family: 'Segoe UI', Arial, sans-serif; margin: 15px; color: #0f172a; background: #fff; }
            .kop-header { display: flex; align-items: center; justify-content: space-between; border-bottom: 3px double #0f172a; padding-bottom: 8px; margin-bottom: 12px; }
            .kop-title { text-align: center; flex: 1; }
            .kop-title h2 { margin: 0; font-size: 15px; font-weight: 900; letter-spacing: 0.5px; text-transform: uppercase; }
            .kop-title h3 { margin: 2px 0; font-size: 12px; font-weight: 700; color: #334155; }
            .kop-title p { margin: 2px 0; font-size: 9.5px; color: #64748b; }
            .meta-info { margin-bottom: 10px; font-size: 10.5px; font-weight: 600; display: flex; justify-content: space-between; background: #f8fafc; padding: 6px 10px; border-radius: 6px; border: 1px solid #e2e8f0; }
            .table-data { width: 100%; border-collapse: collapse; margin-top: 6px; font-size: 9px; }
            .table-data th, .table-data td { border: 1px solid #cbd5e1; padding: 3px 4px; text-align: center; }
            .table-data th { background-color: #f1f5f9; font-weight: 800; color: #1e293b; text-transform: uppercase; font-size: 8.5px; }
            .bg-hadir { background-color: #dcfce7 !important; color: #166534 !important; font-weight: bold; }
            .bg-terlambat { background-color: #fee2e2 !important; color: #991b1b !important; font-weight: bold; }
            .bg-izin { background-color: #dbeafe !important; color: #1e3a8a !important; font-weight: bold; }
            .bg-sakit { background-color: #fef3c7 !important; color: #92400e !important; font-weight: bold; }
            .bg-alpa { background-color: #0f172a !important; color: #ffffff !important; font-weight: bold; }
            .row-warn-1 td { background-color: #fef3c7 !important; color: #92400e !important; }
            .row-warn-2 td { background-color: #ffedd5 !important; color: #c2410c !important; }
            .row-warn-3 td { background-color: #fee2e2 !important; color: #991b1b !important; }
            .row-warn-4 td { background-color: #9f1239 !important; color: #ffffff !important; font-weight: bold; }
            .sig-section { display: flex; justify-content: space-between; margin-top: 20px; page-break-inside: avoid; }
            .sig-box { text-align: center; width: 220px; font-size: 10px; font-weight: 600; }
            .sig-space { height: 50px; }
          </style>
        </head>
        <body>
          <div class="kop-header">
            <div class="kop-title">
              <h2>${schoolName}</h2>
              <h3>${periodTitle}</h3>
              <p>${schoolAddress}</p>
            </div>
          </div>

          <div class="meta-info">
            <span>${periodSubTitle}</span>
            <span>Dicetak Pada: ${todayDateStr}</span>
          </div>

          ${tableHtml}

          <div style="margin-top: 10px; font-size: 8.5px; border-top: 1px solid #cbd5e1; padding-top: 6px; display: flex; flex-wrap: wrap; gap: 12px; align-items: center; color: #475569;">
            <span style="font-weight: bold;">Keterangan Sorotan Peringatan:</span>
            <span><span style="display:inline-block; width:9px; height:9px; background:#fef3c7; border:1px solid #fde68a; border-radius:2px; vertical-align:middle; margin-right:3px;"></span> Kuning: Peringatan (Telat ≥3x / Alpa >4x)</span>
            <span><span style="display:inline-block; width:9px; height:9px; background:#ffedd5; border:1px solid #fed7aa; border-radius:2px; vertical-align:middle; margin-right:3px;"></span> Orange: Pelanggaran Sedang (≥5x)</span>
            <span><span style="display:inline-block; width:9px; height:9px; background:#fee2e2; border:1px solid #fca5a5; border-radius:2px; vertical-align:middle; margin-right:3px;"></span> Merah: Pelanggaran Berat (≥7x)</span>
            <span><span style="display:inline-block; width:9px; height:9px; background:#9f1239; border-radius:2px; vertical-align:middle; margin-right:3px;"></span> Merah Gelap: Pelanggaran SP (≥10x)</span>
          </div>

          <div class="sig-section">
            <div class="sig-box">
              <p>Mengetahui,<br>Kepala Sekolah</p>
              <div class="sig-space"></div>
              <p style="text-decoration: underline; font-weight: bold;">( ________________________ )</p>
              <p style="font-size: 9px; color: #64748b;">NIP. -</p>
            </div>
            <div class="sig-box">
              <p>Dicetak Oleh,<br>Pengelola Kepegawaian / SDM</p>
              <div class="sig-space"></div>
              <p style="text-decoration: underline; font-weight: bold;">( ${user?.name || 'Administrator'} )</p>
              <p style="font-size: 9px; color: #64748b;">Tanggal: ${todayDateStr}</p>
            </div>
          </div>
        </body>
        </html>
      `);

      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 500);
      setShowPrintModal(false);
    } catch (err) {
      console.error("Gagal melakukan pencetakan laporan:", err);
      showToast("Gagal mencetak laporan: " + err.message, "error");
    }
  };

  const monthOptions = [
    { value: 1, label:"Januari" }, { value: 2, label:"Februari" }, { value: 3, label:"Maret" },
    { value: 4, label:"April" }, { value: 5, label:"Mei" }, { value: 6, label:"Juni" },
    { value: 7, label:"Juli" }, { value: 8, label:"Agustus" }, { value: 9, label:"September" },
    { value: 10, label:"Oktober" }, { value: 11, label:"November" }, { value: 12, label:"Desember" }
  ];
  const currentYear = new Date().getFullYear();
  const yearOptions = [currentYear - 1, currentYear, currentYear + 1];

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
          title="Laporan & Rekap Absensi Guru"
          description="Pantau laporan kehadiran bulanan dan cetak rapor evaluasi kinerja guru."
          icon={Users}
        />
      )}

      {/* Top Ergonomic Mode Switcher Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white p-3.5 sm:p-4 rounded-[var(--ui-radius-card)] border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-1 bg-slate-100/90 p-1.5 rounded-[var(--ui-radius-small)] border border-slate-200/70 w-full md:w-auto">
          {[
            { id: 'matriks', label: 'Rekap Matriks Kehadiran', icon: Calendar },
            { id: 'perguru', label: 'Data Kinerja & Rapor Guru', icon: Award }
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSubTab(tab.id)}
              className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-[var(--ui-radius-small)] text-xs font-bold transition-all cursor-pointer border-none ${
                subTab === tab.id
                  ? 'bg-white text-[var(--ui-primary)] shadow-xs font-black'
                  : 'text-slate-600 hover:text-slate-900 bg-transparent'
              }`}
            >
              <tab.icon size={15} className="shrink-0" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Unified Search Input */}
        <div className="relative w-full md:w-72">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Cari nama atau kode guru..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200/80 rounded-[var(--ui-radius-small)] text-xs font-semibold focus:outline-none focus:bg-white focus:border-[var(--ui-primary)] transition-all"
          />
        </div>
      </div>

      <div className="ui-card p-4 sm:p-5 flex flex-col gap-4 relative z-30 shadow-xs border border-slate-200/80">
        {/* Top Filter Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="min-w-0">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Cari Guru</label>
            <div className="relative w-full">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                placeholder="Nama / NIP..." 
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-8 pr-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-[var(--ui-radius-small)] text-xs font-semibold focus:outline-none focus:bg-white focus:border-[var(--ui-primary)] transition-all"
              />
            </div>
          </div>
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
                    { value: "code", label: "Kode Guru" },
                    { value: "name", label: "Nama (A-Z)" },
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
                className={`shrink-0 w-9 h-9 p-0 flex items-center justify-center rounded-[var(--ui-radius-small)] border text-xs font-bold transition-all cursor-pointer ${
                  sortDir === 'desc' 
                    ? 'bg-slate-800 text-white border-slate-800 shadow-xs' 
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <ArrowUpDown size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Action Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Button 
                variant="outline"
                type="button"
                onClick={() => setWaDropdownOpen(!waDropdownOpen)}
                disabled={sendingWA}
                className="px-3.5 py-2 bg-emerald-50/90 hover:bg-emerald-100 text-emerald-800 border-emerald-200 flex items-center justify-center gap-1.5 text-xs font-bold cursor-pointer"
              >
                <Share2 size={14} className="shrink-0 text-emerald-600" />
                <span>{sendingWA ?"Kirim..." :"Kirim WA"}</span>
              </Button>
              {waDropdownOpen && (
                <div className="absolute left-0 mt-1.5 w-44 bg-white border border-slate-200 rounded-[var(--ui-radius-small)] shadow-sm z-50 py-1 overflow-hidden animate-in fade-in duration-150">
                  <button 
                    type="button"
                    onClick={() =>handleBlastWA("daily")}
                    className="w-full text-left px-3.5 py-2 hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer border-none bg-transparent"
                  >
                    Rekap Harian
                  </button>
                  <button 
                    type="button"
                    onClick={() =>handleBlastWA("monthly")}
                    className="w-full text-left px-3.5 py-2 hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer border-none bg-transparent"
                  >
                    Rekap Bulanan
                  </button>
                </div>
              )}
            </div>

            <Button 
              variant="outline"
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="px-3.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200 flex items-center justify-center gap-1.5 text-xs font-bold cursor-pointer"
            >
              <Plus size={14} className="shrink-0 text-indigo-600" />
              <span>Input Manual</span>
            </Button>
          </div>

          <div className="flex items-center gap-2 shrink-0 justify-end">
            <Button 
              variant="outline"
              type="button"
              onClick={handleExport}
              disabled={loading || data.length === 0}
              className="px-3.5 py-2 bg-emerald-50/90 hover:bg-emerald-100 text-emerald-700 border-emerald-200/90 flex items-center justify-center gap-1.5 text-xs font-black cursor-pointer shadow-2xs disabled:opacity-50"
            >
              <FileSpreadsheet size={14} className="shrink-0 text-emerald-600" />
              <span>Excel</span>
            </Button>

            <Button 
              variant="outline"
              type="button"
              onClick={handleExportPDF}
              disabled={loading || data.length === 0}
              className="px-3.5 py-2 bg-rose-50/90 hover:bg-rose-100 text-rose-700 border-rose-200/90 flex items-center justify-center gap-1.5 text-xs font-black cursor-pointer shadow-2xs disabled:opacity-50"
            >
              <FileText size={14} className="shrink-0 text-rose-600" />
              <span>PDF</span>
            </Button>

            <Button 
              variant="outline"
              type="button"
              onClick={() => setShowPrintModal(true)}
              disabled={loading || data.length === 0}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-600 flex items-center justify-center gap-1.5 text-xs font-black cursor-pointer shadow-xs disabled:opacity-50"
            >
              <Printer size={14} className="shrink-0" />
              <span>Cetak Per Periode</span>
            </Button>
          </div>
        </div>
      </div>



      {/* ── TAB CONTENT: MATRIKS ── */}
      {subTab ==='matriks' && (
        <div className="ui-card shadow-xs border border-slate-200/80 overflow-hidden relative z-10">
          <div className="px-4 py-3 border-b border-slate-200/80 bg-slate-50/70 flex flex-wrap items-center justify-between gap-3">
             <div className="text-xs font-bold text-slate-700">
               Menampilkan Matriks Kehadiran <span className="font-black text-slate-900">({filteredData.length} Guru)</span>
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
                  <th className="px-4 py-3 font-black sticky left-0 bg-slate-50 z-10 border-r border-slate-200">Nama Guru</th>
                  <th className="px-3 py-3 font-black text-center border-r border-slate-200">Hdr</th>
                  <th className="px-3 py-3 font-black text-center border-r border-slate-200">Tlt</th>
                  <th className="px-3 py-3 font-black text-center border-r border-slate-200">Izn</th>
                  <th className="px-3 py-3 font-black text-center border-r border-slate-200">Skt</th>
                  <th className="px-3 py-3 font-black text-center border-r border-slate-200">Alp</th>
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
                  paginatedData.map(d => {
                    const v = checkViolation(d, daysToRender);
                    return (
                      <tr 
                        key={d.nis} 
                        className={`border-b transition-colors ${v.bgClass}`}
                      >
                         <td className={`px-3.5 py-2.5 sticky left-0 border-r z-10 min-w-[190px] ${v.stickyBgClass}`}>
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className={`font-bold text-xs truncate max-w-[140px] ${v.textClass}`} title={d.name}>{d.name}</span>
                              {v.level > 0 && (
                                <span title={v.level === 4 ? "Pelanggaran SP (≥10x)" : v.level === 3 ? "Pelanggaran Berat (Telat ≥7x / Alpa ≥8x)" : v.level === 2 ? "Pelanggaran Sedang (Telat ≥5x / Alpa ≥6x)" : "Peringatan (Telat ≥3x / Alpa >4x)"}>
                                  <AlertTriangle 
                                    size={13} 
                                    className={`shrink-0 ${v.level === 4 ? "text-amber-300 animate-pulse" : v.level === 3 ? "text-rose-600" : v.level === 2 ? "text-orange-500" : "text-amber-500"}`} 
                                  />
                                </span>
                              )}
                            </div>
                            <div className={`text-[9px] ${v.subTextClass} font-semibold truncate`}>{d.nis || d.class_name || 'Guru'}</div>
                         </td>
                         <td className="px-3 py-3 text-center font-black text-emerald-600 border-r border-slate-100">{d.total_hadir}</td>
                         <td className="px-3 py-3 text-center font-black text-amber-600 border-r border-slate-100">{d.total_terlambat}</td>
                         <td className="px-3 py-3 text-center font-black text-blue-600 border-r border-slate-100">{d.total_izin}</td>
                         <td className="px-3 py-3 text-center font-black text-amber-700 border-r border-slate-100">{d.total_sakit}</td>
                         <td className="px-3 py-3 text-center font-black text-rose-600 border-r border-slate-100">{d.total_alpa}</td>
                         {daysToRender.map((dayNum) => {
                            const dayData = d.days[dayNum];
                            return (
                               <td key={dayNum} className="px-1 py-2 text-center border-r border-slate-100 min-w-[70px]">
                                  {getDayBadge(dayData)}
                               </td>
                            );
                         })}
                      </tr>
                    );
                  })
                )}
              </tbody>
              <tfoot className="bg-slate-50 font-black text-xs border-t-2 border-slate-300">
                {/* JML HADIR */}
                <tr className="bg-emerald-100/90 border-b border-emerald-200 text-emerald-950">
                  <td className="px-4 py-2 sticky left-0 bg-emerald-100 z-10 border-r border-emerald-300 font-black text-[10px] uppercase">TOTAL HADIR (HDR)</td>
                  <td className="px-3 py-2 text-center border-r border-emerald-300 text-emerald-800 font-extrabold text-xs">{filteredData.reduce((acc, s) => acc + (s.total_hadir || 0), 0)}</td>
                  <td className="px-3 py-2 text-center border-r border-emerald-300 text-emerald-300 font-bold">-</td>
                  <td className="px-3 py-2 text-center border-r border-emerald-300 text-emerald-300 font-bold">-</td>
                  <td className="px-3 py-2 text-center border-r border-emerald-300 text-emerald-300 font-bold">-</td>
                  <td className="px-3 py-2 text-center border-r border-emerald-300 text-emerald-300 font-bold">-</td>
                  {daysToRender.map(d => (
                    <td key={d} className="px-1 py-1.5 text-center border-r border-emerald-200/80">
                      {dailyTotals.hadir[d] > 0 ? (
                        <span className="inline-flex items-center justify-center min-w-[22px] h-5 px-1.5 rounded-full bg-emerald-600 text-white font-black text-[10px] shadow-2xs">
                          {dailyTotals.hadir[d]}
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-emerald-400">0</span>
                      )}
                    </td>
                  ))}
                </tr>
                {/* JML TERLAMBAT */}
                <tr className="bg-rose-100/90 border-b border-rose-200 text-rose-950">
                  <td className="px-4 py-2 sticky left-0 bg-rose-100 z-10 border-r border-rose-300 font-black text-[10px] uppercase">TOTAL TERLAMBAT (TLT)</td>
                  <td className="px-3 py-2 text-center border-r border-rose-300 text-rose-300 font-bold">-</td>
                  <td className="px-3 py-2 text-center border-r border-rose-300 text-rose-800 font-extrabold text-xs">{filteredData.reduce((acc, s) => acc + (s.total_terlambat || 0), 0)}</td>
                  <td className="px-3 py-2 text-center border-r border-rose-300 text-rose-300 font-bold">-</td>
                  <td className="px-3 py-2 text-center border-r border-rose-300 text-rose-300 font-bold">-</td>
                  <td className="px-3 py-2 text-center border-r border-rose-300 text-rose-300 font-bold">-</td>
                  {daysToRender.map(d => (
                    <td key={d} className="px-1 py-1.5 text-center border-r border-rose-200/80">
                      {dailyTotals.terlambat[d] > 0 ? (
                        <span className="inline-flex items-center justify-center min-w-[22px] h-5 px-1.5 rounded-full bg-rose-600 text-white font-black text-[10px] shadow-2xs">
                          {dailyTotals.terlambat[d]}
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-rose-300">0</span>
                      )}
                    </td>
                  ))}
                </tr>
                {/* JML IZIN */}
                <tr className="bg-blue-100/90 border-b border-blue-200 text-blue-950">
                  <td className="px-4 py-2 sticky left-0 bg-blue-100 z-10 border-r border-blue-300 font-black text-[10px] uppercase">TOTAL IZIN (IZN)</td>
                  <td className="px-3 py-2 text-center border-r border-blue-300 text-blue-300 font-bold">-</td>
                  <td className="px-3 py-2 text-center border-r border-blue-300 text-blue-300 font-bold">-</td>
                  <td className="px-3 py-2 text-center border-r border-blue-300 text-blue-800 font-extrabold text-xs">{filteredData.reduce((acc, s) => acc + (s.total_izin || 0), 0)}</td>
                  <td className="px-3 py-2 text-center border-r border-blue-300 text-blue-300 font-bold">-</td>
                  <td className="px-3 py-2 text-center border-r border-blue-300 text-blue-300 font-bold">-</td>
                  {daysToRender.map(d => (
                    <td key={d} className="px-1 py-1.5 text-center border-r border-blue-200/80">
                      {dailyTotals.izin[d] > 0 ? (
                        <span className="inline-flex items-center justify-center min-w-[22px] h-5 px-1.5 rounded-full bg-[var(--ui-primary)] text-white font-black text-[10px] shadow-2xs">
                          {dailyTotals.izin[d]}
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-blue-300">0</span>
                      )}
                    </td>
                  ))}
                </tr>
                {/* JML SAKIT */}
                <tr className="bg-amber-100/90 border-b border-amber-200 text-amber-950">
                  <td className="px-4 py-2 sticky left-0 bg-amber-100 z-10 border-r border-amber-300 font-black text-[10px] uppercase">TOTAL SAKIT (SKT)</td>
                  <td className="px-3 py-2 text-center border-r border-amber-300 text-amber-300 font-bold">-</td>
                  <td className="px-3 py-2 text-center border-r border-amber-300 text-amber-300 font-bold">-</td>
                  <td className="px-3 py-2 text-center border-r border-amber-300 text-amber-300 font-bold">-</td>
                  <td className="px-3 py-2 text-center border-r border-amber-300 text-amber-800 font-extrabold text-xs">{filteredData.reduce((acc, s) => acc + (s.total_sakit || 0), 0)}</td>
                  <td className="px-3 py-2 text-center border-r border-amber-300 text-amber-300 font-bold">-</td>
                  {daysToRender.map(d => (
                    <td key={d} className="px-1 py-1.5 text-center border-r border-amber-200/80">
                      {dailyTotals.sakit[d] > 0 ? (
                        <span className="inline-flex items-center justify-center min-w-[22px] h-5 px-1.5 rounded-full bg-amber-500 text-white font-black text-[10px] shadow-2xs">
                          {dailyTotals.sakit[d]}
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-amber-400">0</span>
                      )}
                    </td>
                  ))}
                </tr>
                {/* JML ALPA */}
                <tr className="bg-slate-900 text-white border-b border-slate-800">
                  <td className="px-4 py-2 sticky left-0 bg-slate-900 z-10 border-r border-slate-700 font-black text-[10px] uppercase text-white">TOTAL ALPA (ALP)</td>
                  <td className="px-3 py-2 text-center border-r border-slate-700 text-slate-500 font-bold">-</td>
                  <td className="px-3 py-2 text-center border-r border-slate-700 text-slate-500 font-bold">-</td>
                  <td className="px-3 py-2 text-center border-r border-slate-700 text-slate-500 font-bold">-</td>
                  <td className="px-3 py-2 text-center border-r border-slate-700 text-slate-500 font-bold">-</td>
                  <td className="px-3 py-2 text-center border-r border-slate-700 text-red-400 font-black text-xs">{filteredData.reduce((acc, s) => acc + (s.total_alpa || 0), 0)}</td>
                  {daysToRender.map(d => (
                    <td key={d} className="px-1 py-1.5 text-center border-r border-slate-800">
                      {dailyTotals.alpa[d] > 0 ? (
                        <span className="inline-flex items-center justify-center min-w-[22px] h-5 px-1.5 rounded-full bg-rose-600 text-white font-black text-[10px] shadow-2xs">
                          {dailyTotals.alpa[d]}
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-slate-600">0</span>
                      )}
                    </td>
                  ))}
                </tr>
              </tfoot>
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
      )}

      {/* ── TAB CONTENT: DATA PER GURU ── */}
      {subTab ==='perguru' && (
        <div className="relative z-10">
          <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col md:flex-row justify-between items-center gap-4">
             <div className="relative w-full md:w-80">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Cari nama / kode guru..." 
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white border-none rounded-[var(--ui-radius-small)] text-sm font-semibold focus:outline-[var(--ui-primary)]"
                />
             </div>
             <span className="text-xs text-slate-500 font-bold">{filteredData.length} guru terdaftar</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-[10px] text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 font-bold text-center w-12">No</th>
                  <th className="px-4 py-3 font-bold">Nama Guru</th>
                  <th className="px-4 py-3 font-bold text-center">Hadir</th>
                  <th className="px-4 py-3 font-bold text-center">Telat</th>
                  <th className="px-4 py-3 font-bold text-center">Izin</th>
                  <th className="px-4 py-3 font-bold text-center">Sakit</th>
                  <th className="px-4 py-3 font-bold text-center">Alpa</th>
                  <th className="px-4 py-3 font-bold text-center">Target JP</th>
                  <th className="px-4 py-3 font-bold text-center">Skor Kinerja</th>
                  <th className="px-4 py-3 font-bold text-center w-28">Rapor</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.length === 0 ? (
                  <tr>
                    <td colSpan="10" className="text-center py-8 text-slate-400 font-bold">
                      Guru tidak ditemukan atau belum ada data absensi.
                    </td>
                  </tr>
                ) : (
                  filteredData.map((d, idx) => {
                    const matchedGuru = teachers.find(g => String(g.code).trim().toLowerCase() === String(d.nis).trim().toLowerCase());
                    const targetJP = matchedGuru?.targetWeeklyJp || 24;
                    const deductions = (d.total_alpa || 0) * 5 + (d.total_terlambat || 0) * 1;
                    const score = Math.max(0, 100 - deductions);

                    return (
                      <tr key={d.nis} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3 text-center text-slate-400 font-bold">{idx + 1}</td>
                        <td className="px-4 py-3">
                          <p className="font-bold text-slate-800">{d.name}</p>
                          <p className="text-[10px] text-slate-450 font-bold">{d.nis ||"-"} • {d.class_name ||"Guru"}</p>
                        </td>
                        <td className="px-4 py-3 text-center font-bold text-emerald-600">{d.total_hadir}</td>
                        <td className="px-4 py-3 text-center font-bold text-amber-600">{d.total_terlambat}</td>
                        <td className="px-4 py-3 text-center font-bold text-blue-600">{d.total_izin}</td>
                        <td className="px-4 py-3 text-center font-bold text-yellow-600">{d.total_sakit}</td>
                        <td className="px-4 py-3 text-center font-bold text-rose-500">{d.total_alpa}</td>
                        <td className="px-4 py-3 text-center font-bold text-slate-650">{targetJP} JP</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2.5 py-1 rounded font-black text-xs ${
                            score >= 85 ?'bg-emerald-50 text-emerald-700' : score >= 70 ?'bg-amber-50 text-amber-700' :'bg-red-50/65 text-rose-600'
                          }`}>
                            {score} Poin
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Button variant="outline"
                            onClick={() =>setSelectedTeacherForRapor(d)}
                            className="flex items-center justify-center gap-1 mx-auto cursor-pointer"
                          >
                            <Printer size={12} /> Cetak Rapor</Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Cetak Rapor Guru */}
      {selectedTeacherForRapor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[var(--ui-radius-small)] shadow-sm w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <FileText size={16} className="text-rose-500" />
                Cetak Rapor Evaluasi Kinerja Guru
              </h3>
              <Button variant="outline" type="button" onClick={() =>setSelectedTeacherForRapor(null)} className="cursor-pointer">
                <X size={18} /></Button>
            </div>
            <div className="p-4 space-y-4">
              <div className="p-3 bg-slate-50 rounded-[var(--ui-radius-small)] text-xs space-y-1">
                <p className="text-slate-500 font-semibold">Nama Guru:</p>
                <p className="font-bold text-slate-800 text-sm">{selectedTeacherForRapor.name}</p>
                <p className="text-slate-600">NIP / Kode: {selectedTeacherForRapor.nis}</p>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Pilih Ukuran Kertas</label>
                <div className="grid grid-cols-2 gap-3">
                  <Button variant="outline" type="button" onClick={() =>setRaporPaperSize('A4')}
                    className={`text-center cursor-pointer`}>
                    A4 (Standar)</Button>
                  <Button variant="outline" type="button" onClick={() =>setRaporPaperSize('F4')}
                    className={`text-center cursor-pointer`}>
                    F4 (Folio/HVS)</Button>
                </div>
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <Button variant="outline" type="button" onClick={() =>setSelectedTeacherForRapor(null)} >
                  Batal</Button>
                <Button variant="outline" type="button" onClick={() =>{
                  printRaporGuruPDF(selectedTeacherForRapor, raporPaperSize);
                  setSelectedTeacherForRapor(null);
                }} className="flex items-center gap-1.5">
                  <Printer size={14} /> Download Rapor</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Manual Input Modal */}
      {isModalOpen && (
        <Modal isOpen={true} onClose={() => setIsModalOpen(false)} title="Input Ketidakhadiran Guru">
          <form onSubmit={handleManualSubmit} className="p-6 space-y-4">
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Pilih Guru</label>
              <UISelect 
                value={form.teacherCode}
                onChange={e => setForm({ ...form, teacherCode: e.target.value })}
                className="w-full border-none bg-slate-50 p-3 rounded-[var(--ui-radius-small)] text-xs font-bold focus:bg-white focus:outline-[var(--ui-primary)]"
                required
              >
                <option value="">-- Pilih Guru --</option>
                {teachers.map(t => (
                  <option key={t.code} value={t.code}>{t.name} ({t.code})</option>
                ))}
              </UISelect>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Tanggal</label>
                <input 
                  type="date"
                  value={form.date}
                  onChange={e => setForm({ ...form, date: e.target.value })}
                  className="w-full border-none bg-slate-50 p-3 rounded-[var(--ui-radius-small)] text-xs font-bold focus:bg-white focus:outline-[var(--ui-primary)]"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Status Kehadiran</label>
                <UISelect 
                  value={form.status}
                  onChange={e => setForm({ ...form, status: e.target.value })}
                  className="w-full border-none bg-slate-50 p-3 rounded-[var(--ui-radius-small)] text-xs font-bold focus:bg-white focus:outline-[var(--ui-primary)]"
                  required
                >
                  <option value="Izin">Izin</option>
                  <option value="Sakit">Sakit</option>
                  <option value="Dinas Luar">Dinas Luar</option>
                  <option value="Alpa">Alpa</option>
                  <option value="Hadir">Hadir (Manual)</option>
                  <option value="Terlambat">Terlambat (Manual)</option>
                </UISelect>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Catatan / Keterangan</label>
              <textarea 
                value={form.note}
                onChange={e => setForm({ ...form, note: e.target.value })}
                className="w-full border-none bg-slate-50 p-3 rounded-[var(--ui-radius-small)] text-xs font-medium focus:bg-white focus:outline-[var(--ui-primary)] resize-none"
                placeholder="Contoh: Mengikuti MGMP / Sakit Demam"
                rows={3}
              />
            </div>

            <div className="bg-slate-50 p-3.5 rounded-[var(--ui-radius-small)] border-none flex items-start gap-2.5">
              <input type="checkbox" defaultChecked disabled className="mt-1 w-4 h-4 accent-indigo-600" />
              <div>
                <span className="text-xs font-bold text-slate-800 block">Kirim Notifikasi Otomatis WhatsApp</span>
                <span className="text-[10px] text-slate-500 font-medium mt-0.5 block">Notifikasi izin/sakit akan otomatis dikirimkan ke nomor WA tujuan yang sudah ditentukan.</span>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <Button variant="outline" type="button" onClick={() =>setIsModalOpen(false)}>Batal</Button>
              <Button variant="outline" type="submit" disabled={submitting} >{submitting ?"Menyimpan..." :"Simpan & Kirim"}</Button>
            </div>
          </form>
        </Modal>
      )}
       {/* Modal Cetak Laporan Per Periode */}
       {showPrintModal && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs animate-in fade-in duration-200 p-4">
           <div className="bg-white rounded-[var(--ui-radius-card)] shadow-sm max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100">
             <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/80">
               <div className="flex items-center gap-2">
                 <div className="w-8 h-8 rounded-[var(--ui-radius-small)] bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                   <Printer size={18} />
                 </div>
                 <div>
                   <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Cetak Laporan Kehadiran Guru</h3>
                   <p className="text-[10px] text-slate-500 font-medium">Pilih periode dan format pencetakan laporan guru</p>
                 </div>
               </div>
               <button
                 type="button"
                 onClick={() => setShowPrintModal(false)}
                 className="w-7 h-7 rounded-[var(--ui-radius-small)] hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer transition-colors"
               >
                 <X size={16} />
               </button>
             </div>

             <div className="p-5 space-y-4 text-xs">
               <div>
                 <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1.5">1. Pilih Periode Laporan</label>
                 <div className="grid grid-cols-2 gap-2">
                   {[
                     { id: 'harian', label: 'Harian (Per Hari)', desc: 'Presensi guru 1 hari', icon: Calendar },
                     { id: 'mingguan', label: 'Mingguan', desc: 'Per minggu (7 hari)', icon: Calendar },
                     { id: 'bulanan', label: 'Bulanan (Matriks)', desc: 'Matriks 1 bulan penuh', icon: FileSpreadsheet },
                     { id: 'semester', label: '1 Semester', desc: 'Rekap total 6 bulan', icon: Users },
                   ].map(item => (
                     <button
                       key={item.id}
                       type="button"
                       onClick={() => setPrintPeriod(item.id)}
                       className={`p-3 rounded-[var(--ui-radius-card)] text-left border transition-all cursor-pointer flex flex-col justify-between min-h-[70px] ${
                         printPeriod === item.id 
                           ? 'bg-indigo-50/80 border-indigo-500/80 text-indigo-950 shadow-2xs font-bold ring-2 ring-indigo-500/20' 
                           : 'bg-slate-50 border-slate-200/80 text-slate-700 hover:bg-white'
                       }`}
                     >
                       <div className="flex items-center justify-between w-full">
                         <span className="font-black text-xs">{item.label}</span>
                         <item.icon size={14} className={printPeriod === item.id ? 'text-indigo-600' : 'text-slate-400'} />
                       </div>
                       <span className="text-[9.5px] opacity-75 font-semibold mt-1">{item.desc}</span>
                     </button>
                   ))}
                 </div>
               </div>

               {printPeriod === 'harian' && (
                 <div className="p-3 bg-slate-50 rounded-[var(--ui-radius-card)] border border-slate-200/80 space-y-2">
                   <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">Pilih Tanggal</label>
                   <select
                     value={printDate}
                     onChange={e => setPrintDate(parseInt(e.target.value))}
                     className="w-full bg-white border border-slate-200 p-2 rounded-[var(--ui-radius-small)] text-xs font-bold focus:outline-indigo-500"
                   >
                     {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(d => (
                       <option key={d} value={d}>Tanggal {d} ({filter.month}/{filter.year})</option>
                     ))}
                   </select>
                 </div>
               )}

               {printPeriod === 'mingguan' && (
                 <div className="p-3 bg-slate-50 rounded-[var(--ui-radius-card)] border border-slate-200/80 space-y-2">
                   <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">Pilih Minggu Ke-</label>
                   <select
                     value={printWeek}
                     onChange={e => setPrintWeek(parseInt(e.target.value))}
                     className="w-full bg-white border border-slate-200 p-2 rounded-[var(--ui-radius-small)] text-xs font-bold focus:outline-indigo-500"
                   >
                     <option value={1}>Minggu ke-1 (Tgl 1 - 7)</option>
                     <option value={2}>Minggu ke-2 (Tgl 8 - 14)</option>
                     <option value={3}>Minggu ke-3 (Tgl 15 - 21)</option>
                     <option value={4}>Minggu ke-4 (Tgl 22 - 28)</option>
                     <option value={5}>Minggu ke-5 (Tgl 29 - {daysInMonth})</option>
                   </select>
                 </div>
               )}

               {printPeriod === 'semester' && (
                 <div className="p-3 bg-slate-50 rounded-[var(--ui-radius-card)] border border-slate-200/80 space-y-2">
                   <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">Pilih Semester</label>
                   <select
                     value={printSemester}
                     onChange={e => setPrintSemester(e.target.value)}
                     className="w-full bg-white border border-slate-200 p-2 rounded-[var(--ui-radius-small)] text-xs font-bold focus:outline-indigo-500"
                   >
                     <option value="ganjil">Semester Ganjil (Juli - Desember)</option>
                     <option value="genap">Semester Genap (Januari - Juni)</option>
                   </select>
                 </div>
               )}

               <div className="p-3 bg-indigo-50/60 rounded-[var(--ui-radius-card)] border border-indigo-100 flex items-start gap-2 text-[10.5px] text-indigo-900 font-semibold leading-relaxed">
                 <Printer size={15} className="shrink-0 text-indigo-600 mt-0.5" />
                 <span>Laporan akan dicetak lengkap dengan Kop Surat Sekolah, Rekapan Jumlah Harian (Hadir/Telat/Izin/Sakit/Alpa), serta Kolom Tanda Tangan Kepala Sekolah.</span>
               </div>
             </div>

             <div className="flex items-center justify-end gap-2 p-4 bg-slate-50 border-t border-slate-100">
               <Button
                 variant="outline"
                 type="button"
                 onClick={() => setShowPrintModal(false)}
                 className="px-4 py-2 rounded-[var(--ui-radius-small)] text-xs font-bold"
               >
                 Batal
               </Button>
               <Button
                 type="button"
                 onClick={handlePrintPeriod}
                 className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-[var(--ui-radius-small)] text-xs font-black shadow-xs flex items-center gap-1.5 cursor-pointer"
               >
                 <Printer size={15} />
                 <span>Cetak Sekarang</span>
               </Button>
             </div>
           </div>
         </div>
       )}
      {toast && (
        <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-[var(--ui-radius-small)] shadow-sm font-medium text-sm flex items-center gap-2 animate-in slide-in-from-bottom-5 text-white z-[100] ${toast.type ==='error' ?'bg-rose-600' :'bg-emerald-600'}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
