import { Button, TablePagination } from '../../../components/ui.jsx';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import useAuthStore from'../../../store/monitoring/authStore';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Users, Filter, Search, Printer, FileText, X, Calendar, Award, Plus, Download, FileSpreadsheet, Share2 } from 'lucide-react';
import { CustomSelect } from'../../../components/CustomSelect.jsx';
import { PageHeader } from '../../../components/monitoring/ui/index.js';
import { Modal } from'../../../components/ui.jsx';
import { UISelect } from'../../../components/ui.jsx';
import { getDatabaseSnapshot } from '../../../utils/dataSource.js';


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

  const handleExport = async () => {
    if (data.length === 0) return showToast("Tidak ada data untuk diekspor", "warning");

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
    data.forEach((item, rowIndex) => {
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
      doc.text(`LAPORAN KINERJA & KEHADIRAN GURU`, 14, startY + 6);
      
      doc.setFontSize(9);
      doc.setFont("Helvetica", "normal");
      doc.text(`Periode: ${monthName} ${filter.year}`, 14, startY + 12);
      
      const headers = [["NIP / Kode", "Nama Guru", "H", "T"]];
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
      
      doc.save(`Laporan_Absensi_Guru_${filter.year}_${filter.month}.pdf`);
      showToast("Laporan PDF Guru berhasil diunduh!", "success");
    } catch (err) {
      console.error("Gagal mengekspor PDF Guru:", err);
      showToast("Gagal mengunduh PDF Guru: " + err.message, "error");
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

  const filteredData = data.filter(d => {
    if (search && !d.name.toLowerCase().includes(search.toLowerCase()) && !d.nis.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  // Reset page when search or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, filter.month, filter.year]);

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
      {isNested ? (
        <div className="flex bg-slate-100/80 p-1 rounded-[var(--ui-radius-control)] self-start z-30 mb-2 border border-slate-200/40 shadow-sm">
          {[
            { id:'matriks', label:'Rekap Matriks Kehadiran', icon: Calendar },
            { id:'perguru', label:'Data Kinerja & Rapor Guru', icon: Award }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setSubTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer border-none ${
                subTab === tab.id 
                  ? 'bg-[var(--ui-primary)] text-white shadow-sm' 
                  : 'text-slate-600 hover:bg-slate-200/70 bg-transparent'
              }`}
            >
              <tab.icon size={13} className="shrink-0" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      ) : (
        <PageHeader 
          title="Laporan & Rekap Absensi Guru"
          description="Pantau laporan kehadiran bulanan dan cetak rapor evaluasi kinerja guru."
          icon={Users}
          tabs={[
            { id:'matriks', label:'Rekap Matriks Kehadiran', icon: Calendar },
            { id:'perguru', label:'Data Kinerja & Rapor Guru', icon: Award }
          ]}
          activeTab={subTab}
          onTabChange={setSubTab}
        />
      )}

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
           <div className="w-full md:w-auto flex flex-wrap gap-2 ml-auto">
             <Button onClick={fetchData} className="flex-1 md:flex-none flex items-center gap-1.5 justify-center">
               <Filter size={14} className="shrink-0" />
               <span className="hidden sm:inline">Terapkan</span>
             </Button>
            <div className="relative">
              <Button 
                variant="outline"
                type="button"
                onClick={() => setWaDropdownOpen(!waDropdownOpen)}
                disabled={sendingWA}
                className="w-full md:w-auto flex items-center gap-1.5 justify-center"
              >
                <Share2 size={14} className="shrink-0" />
                <span className="hidden sm:inline">{sendingWA ?"Mengirim..." :"Kirim WA"}</span>
                {!sendingWA && <span className="inline sm:hidden">WA</span>}
              </Button>
              {waDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-150 rounded-[var(--ui-radius-small)] shadow-lg z-50 py-1">
                  <Button variant="outline"
                    type="button"
                    onClick={() =>handleBlastWA("daily")}
                    className="w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center gap-2 cursor-pointer text-sm font-medium border-none rounded-none"
                  >
                    Rekap Harian</Button>
                  <Button variant="outline"
                    type="button"
                    onClick={() =>handleBlastWA("monthly")}
                    className="w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center gap-2 cursor-pointer text-sm font-medium border-none rounded-none"
                  >
                    Rekap Bulanan</Button>
                </div>
              )}
            </div>
            <Button 
              variant="outline"
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="flex-1 md:flex-none flex items-center gap-1.5 justify-center"
            >
              <Plus size={14} className="shrink-0" />
              <span className="hidden sm:inline">Input Manual</span>
              <span className="inline sm:hidden">Input</span>
            </Button>
             <Button 
               variant="outline"
               type="button"
               onClick={handleExport}
               disabled={loading || data.length === 0}
               className="flex-1 md:flex-none flex items-center gap-1.5 justify-center"
             >
               <FileSpreadsheet size={14} className="shrink-0" />
               <span className="hidden sm:inline">Excel Export</span>
               <span className="inline sm:hidden">Excel</span>
             </Button>
             <Button 
               variant="outline"
               type="button"
               onClick={handleExportPDF}
               disabled={loading || data.length === 0}
               className="flex-1 md:flex-none flex items-center gap-1.5 justify-center"
             >
               <FileText size={14} className="shrink-0" />
               <span className="hidden sm:inline">PDF Export</span>
               <span className="inline sm:hidden">PDF</span>
             </Button>
          </div>
        </div>



      {/* ── TAB CONTENT: MATRIKS ── */}
      {subTab ==='matriks' && (
        <div className="relative z-10">
          <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col md:flex-row justify-between items-center gap-4">
             <div className="relative w-full md:w-80">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Cari guru..." 
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
                  paginatedData.map(d => (
                    <tr key={d.nis} className="border-b border-slate-100 hover:bg-slate-50/50">
                       <td className="px-4 py-3 sticky left-0 bg-white border-r border-slate-100 z-10 min-w-[220px]">
                          <div className="font-bold text-slate-800 text-xs whitespace-normal" title={d.name}>{d.name}</div>
                          <div className="text-[9px] text-slate-400 font-bold mt-0.5">{d.nis ||'-'}</div>
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
                        <td className="px-4 py-3 text-center font-bold text-red-500">{d.total_alpa}</td>
                        <td className="px-4 py-3 text-center font-bold text-slate-650">{targetJP} JP</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2.5 py-1 rounded font-black text-xs ${
                            score >= 85 ?'bg-emerald-50 text-emerald-700' : score >= 70 ?'bg-amber-50 text-amber-700' :'bg-red-50/65 text-red-600'
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
          <div className="bg-white rounded-[var(--ui-radius-small)] shadow-lg w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <FileText size={16} className="text-rose-500" />
                Cetak Rapor Evaluasi Kinerja Guru
              </h3>
              <Button variant="outline" type="button" onClick={() =>setSelectedTeacherForRapor(null)} className="cursor-pointer">
                <X size={18} /></Button>
            </div>
            <div className="p-4 space-y-4">
              <div className="p-3 bg-slate-50 rounded-lg text-xs space-y-1">
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
      </div>

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
      {toast && (
        <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-[var(--ui-radius-small)] shadow-lg font-medium text-sm flex items-center gap-2 animate-in slide-in-from-bottom-5 text-white z-[100] ${toast.type ==='error' ?'bg-red-600' :'bg-emerald-600'}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
