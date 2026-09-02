import React, { useState, useEffect, useCallback, useRef } from'react';
import useAuthStore from'../../../store/monitoring/authStore';
import { FileText, UserX, FileSpreadsheet, Plus, Download, Search, Filter, ShieldAlert, UserCheck, AlertTriangle, X, CheckCircle2, ChevronLeft, PieChart, Users, Wand2, ArrowUpDown, Printer, Calendar, Edit2, ExternalLink, Clock, Eye } from 'lucide-react';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useAppStore } from'../../../store/useAppStore';
import { PageHeader } from'../../../components/monitoring/ui/index.js';
import { CustomSelect } from'../../../components/CustomSelect.jsx';
import { UISelect, Button, TablePagination, Modal } from'../../../components/ui.jsx';
import { getDatabaseSnapshot } from '../../../utils/dataSource.js';
import { compareTableValues } from '../../../utils/adminHelpers.js';
import AbsensiSiswa from '../../kedisiplinan/AbsensiSiswa.jsx';
import { logWalasAttendanceCheck } from '../../../utils/auditLogger.js';


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
  
  const roleStr = String(user?.role || '').toLowerCase();
  const subroleStr = String(user?.subrole || '').toLowerCase();
  const divisionStr = String(user?.division || '').toLowerCase();

  const isKesiswaanOrAdmin = 
    ['admin', 'superadmin', 'tu', 'tata_usaha', 'kepsek'].includes(roleStr) ||
    roleStr.startsWith('waka') ||
    roleStr.includes('kesiswaan') || roleStr.includes('bk') || roleStr.includes('bpbk') ||
    subroleStr.includes('kesiswaan') || subroleStr.includes('bk') || subroleStr.includes('bpbk') ||
    divisionStr.includes('kesiswaan') || divisionStr.includes('bk') || divisionStr.includes('bpbk') ||
    Boolean(user?.isBK || user?.isBPBK || user?.isKesiswaan);

  const defaultClassName = 
    (routeTab === "walas_report" && user?.walasClass) 
      ? user.walasClass 
      : isKesiswaanOrAdmin 
        ? "all" 
        : (user?.isWalas && user.walasClass) 
          ? user.walasClass 
          : "none";

  const [filter, setFilter] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    class_name: defaultClassName
  });

  const [dailyDetailModal, setDailyDetailModal] = useState(null); // 'present' | 'late' | 'absent' | null
  const [dailySearchQuery, setDailySearchQuery] = useState('');

  React.useEffect(() => {
    if (routeTab === "walas_report" && user?.walasClass) {
      setFilter(f => ({ ...f, class_name: user.walasClass }));
    }
  }, [routeTab, user?.walasClass]);

  const [viewMode, setViewMode] = useState("monthly"); //"monthly" |"weekly"
  const [selectedWeek, setSelectedWeek] = useState(1); // 1 to 5

  // ─── Validasi Harian Absensi oleh Wali Kelas ───
  const isWalasUser = Boolean(user?.isWalas || user?.walasClass || roleStr === 'walas' || roleStr === 'walikelas' || subroleStr === 'walikelas');
  const activeWalasClass = user?.walasClass || (filter.class_name !== 'all' && filter.class_name !== 'none' ? filter.class_name : '');
  const todayIsoKey = new Date().toISOString().slice(0, 10);
  const walasValidationKey = `walas_attendance_validated_${user?.id || user?.username || 'user'}_${activeWalasClass}_${todayIsoKey}`;

  const [isAttendanceValidated, setIsAttendanceValidated] = useState(() => {
    try {
      return localStorage.getItem(walasValidationKey) === 'true';
    } catch {
      return false;
    }
  });

  const [attendanceValidatedTime, setAttendanceValidatedTime] = useState(() => {
    try {
      return localStorage.getItem(`${walasValidationKey}_time`) || '';
    } catch {
      return '';
    }
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem(walasValidationKey) === 'true';
      setIsAttendanceValidated(saved);
      if (saved) {
        setAttendanceValidatedTime(localStorage.getItem(`${walasValidationKey}_time`) || '');
      }
    } catch {
      setIsAttendanceValidated(false);
    }
  }, [walasValidationKey]);

  const handleConfirmWalasAttendance = () => {
    const targetClass = activeWalasClass || filter.class_name || 'Kelas';
    if (!targetClass || targetClass === 'all' || targetClass === 'none') {
      showToast('Silakan pilih kelas Anda terlebih dahulu untuk validasi absensi', 'error');
      return;
    }

    const now = new Date();
    const timeFormatted = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' }) + ' WIB';
    const dateFormatted = now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

    // Calculate quick stats summary for detail
    let statsDetail = '';
    if (data && data.length > 0) {
      const todayDay = now.getDate();
      let h = 0, t = 0, i = 0, s = 0, a = 0;
      data.forEach(st => {
        const dStat = st.dates?.[todayDay]?.status;
        if (dStat === 'H') h++;
        else if (dStat === 'T') t++;
        else if (dStat === 'I') i++;
        else if (dStat === 'S') s++;
        else if (dStat === 'A') a++;
      });
      statsDetail = `Total ${data.length} siswa: ${h} Hadir, ${t} Telat, ${i} Izin, ${s} Sakit, ${a} Alpa`;
    }

    try {
      localStorage.setItem(walasValidationKey, 'true');
      localStorage.setItem(`${walasValidationKey}_time`, timeFormatted);
    } catch (err) {
      console.warn('Error writing validation to localStorage:', err);
    }

    setIsAttendanceValidated(true);
    setAttendanceValidatedTime(timeFormatted);

    // Record into in-app telemetry audit log
    logWalasAttendanceCheck(targetClass, dateFormatted, statsDetail);

    showToast(`Validasi absensi kelas ${targetClass} berhasil dicatat ke sistem dan log aktivitas.`, 'success');
  };

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
  const [showPermissionPreviewModal, setShowPermissionPreviewModal] = useState(false);

  const handleCellClick = (d, dayNum) => {
    if (user?.role ==="siswa") return; // Siswa cannot edit their own or others' data
    
    const dayData = d.days[dayNum];
    let pd = dayData?.pending_permission || dayData;

    let initialStatus = "Sakit";
    let initialKet = "";
    let initialUrl = null;
    let initialId = null;

    if (pd && (["Sakit", "Izin", "Alpa", "Terlambat"].includes(pd.status) || String(pd.status || '').startsWith("PKL"))) {
        initialStatus = pd.status;
        initialKet = pd.keterangan || pd.note || "";
        initialUrl = pd.gdrive_url || null;
        initialId = pd.id || null;
    }

    setPermissionForm({ 
       id: initialId,
       action: initialId ? 'update' : 'create',
       status: initialStatus, 
       keterangan: initialKet, 
       gdriveUrl: initialUrl, 
       fileData: null, 
       fileName: null, 
       fileSizeKB: null,
       replaceImage: !initialUrl
    });

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
          const MAX_WIDTH = 600;
          const MAX_HEIGHT = 600;

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

          const dataUrl = canvas.toDataURL("image/jpeg", 0.5);
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
          id: permissionForm.id,
          action: permissionForm.action,
          siswa_nis: selectedCell.nis,
          tanggal: dateStr,
          status: permissionForm.status,
          keterangan: permissionForm.keterangan,
          fileData: permissionForm.fileData,
          fileName: permissionForm.fileName,
          gdrive_url: permissionForm.gdriveUrl
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
        className:"bg-indigo-100 text-indigo-800 font-bold",
        style: { color:"#1e40af" }
      };
    }
    if (status ==="Terlambat" || dayData.isLate) {
      return {
        className:"bg-rose-100 text-rose-800 font-bold",
        style: { color:"#b91c1c" }
      };
    }
    return {
      className:"bg-emerald-100 text-emerald-800 font-bold",
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

      // Summary Rows for Excel
      sheet.addRow([]);
      sheet.addRow(['TOTAL HADIR (HDR)', '', '', filteredData.reduce((a, s) => a + (s.total_hadir || 0), 0), String(filteredData.reduce((a, s) => a + (s.total_terlambat || 0), 0)), ...Array.from({ length: daysInMonth }, (_, i) => dailyTotals.hadir[i + 1] || 0)]).font = { bold: true };
      sheet.addRow(['TOTAL TERLAMBAT (TLT)', '', '', '-', '-', ...Array.from({ length: daysInMonth }, (_, i) => dailyTotals.terlambat[i + 1] || 0)]).font = { bold: true };
      sheet.addRow(['TOTAL IZIN (IZN)', '', '', '-', '-', ...Array.from({ length: daysInMonth }, (_, i) => dailyTotals.izin[i + 1] || 0)]).font = { bold: true };
      sheet.addRow(['TOTAL SAKIT (SKT)', '', '', '-', '-', ...Array.from({ length: daysInMonth }, (_, i) => dailyTotals.sakit[i + 1] || 0)]).font = { bold: true };
      sheet.addRow(['TOTAL ALPA (ALP)', '', '', '-', '-', ...Array.from({ length: daysInMonth }, (_, i) => dailyTotals.alpa[i + 1] || 0)]).font = { bold: true };

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

      const pdfFooters = [
        ["TOTAL HADIR (HDR)", "", "", String(filteredData.reduce((a, s) => a + (s.total_hadir || 0), 0)), String(filteredData.reduce((a, s) => a + (s.total_terlambat || 0), 0)), ...Array.from({ length: daysInMonth }, (_, i) => String(dailyTotals.hadir[i + 1] || 0))],
        ["TOTAL TERLAMBAT (TLT)", "", "", "-", "-", ...Array.from({ length: daysInMonth }, (_, i) => String(dailyTotals.terlambat[i + 1] || 0))],
        ["TOTAL IZIN (IZN)", "", "", "-", "-", ...Array.from({ length: daysInMonth }, (_, i) => String(dailyTotals.izin[i + 1] || 0))],
        ["TOTAL SAKIT (SKT)", "", "", "-", "-", ...Array.from({ length: daysInMonth }, (_, i) => String(dailyTotals.sakit[i + 1] || 0))],
        ["TOTAL ALPA (ALP)", "", "", "-", "-", ...Array.from({ length: daysInMonth }, (_, i) => String(dailyTotals.alpa[i + 1] || 0))]
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
          0: { halign: 'left', cellWidth: 15 },
          1: { halign: 'left', cellWidth: 35 },
          2: { halign: 'left', cellWidth: 12 },
          3: { cellWidth: 6 },
          4: { cellWidth: 6 },
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

            if (data.column.index >= 5 && typeof data.cell.raw === 'string') {
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

  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printPeriod, setPrintPeriod] = useState("bulanan"); // "harian" | "mingguan" | "bulanan" | "semester"
  const [printDate, setPrintDate] = useState(new Date().getDate());
  const [printWeek, setPrintWeek] = useState(1);
  const [printSemester, setPrintSemester] = useState("ganjil");

  const currentPageData = React.useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredData, currentPage, itemsPerPage]);
  const paginatedData = currentPageData;
  const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1;

  const dailyTotals = React.useMemo(() => {
    const totals = {
      hadir: {},
      terlambat: {},
      izin: {},
      sakit: {},
      alpa: {},
      pkl: {}
    };
    daysToRender.forEach(d => {
      totals.hadir[d] = 0;
      totals.terlambat[d] = 0;
      totals.izin[d] = 0;
      totals.sakit[d] = 0;
      totals.alpa[d] = 0;
      totals.pkl[d] = 0;
    });

    filteredData.forEach(student => {
      daysToRender.forEach(dayNum => {
        const dayData = (student.days || {})[dayNum];
        if (dayData) {
          const status = dayData.status;
          if (status === "Sakit") totals.sakit[dayNum]++;
          else if (status === "Izin") totals.izin[dayNum]++;
          else if (status === "Alpa" || status === "Alpa (Tanpa Keterangan)") totals.alpa[dayNum]++;
          else if (status === "PKL" || String(status || '').startsWith("PKL")) totals.pkl[dayNum]++;
          else if (dayData.isLate || status === "Terlambat") totals.terlambat[dayNum]++;
          else if (dayData.in || dayData.out || status === "Hadir") totals.hadir[dayNum]++;
        }
      });
    });

    return totals;
  }, [filteredData, daysToRender]);

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

  const schoolProfile = useAppStore(state => state.schoolProfile) || {};
  const schoolName = schoolProfile.schoolName || "SMK NEGERI INTEGRATED SCHOOL";
  const schoolAddress = schoolProfile.address || "Jl. Pendidikan No. 1, Kota Edukasi";

  const handlePrintPeriod = async () => {
    try {
      const monthName = monthOptions.find(m => m.value === filter.month)?.label || "";
      const className = filter.class_name === "all" ? "Semua Kelas" : filter.class_name;
      const todayDateStr = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

      let periodTitle = "";
      let periodSubTitle = "";
      let printDays = [];

      if (printPeriod === "harian") {
        periodTitle = `LAPORAN ABSENSI HARIAN SISWA (${printDate} ${monthName.toUpperCase()} ${filter.year})`;
        periodSubTitle = `Tanggal: ${printDate} ${monthName} ${filter.year} | Kelas: ${className}`;
        printDays = [printDate];
      } else if (printPeriod === "mingguan") {
        const startDay = (printWeek - 1) * 7 + 1;
        const endDay = Math.min(printWeek * 7, daysInMonth);
        periodTitle = `LAPORAN ABSENSI MINGGUAN SISWA (MINGGU KE-${printWeek})`;
        periodSubTitle = `Periode: Tanggal ${startDay} - ${endDay} ${monthName} ${filter.year} | Kelas: ${className}`;
        printDays = [];
        for (let i = startDay; i <= endDay; i++) printDays.push(i);
      } else if (printPeriod === "bulanan") {
        periodTitle = `LAPORAN MATRIKS ABSENSI BULANAN SISWA`;
        periodSubTitle = `Bulan: ${monthName} ${filter.year} | Kelas: ${className}`;
        printDays = daysToRender;
      } else if (printPeriod === "semester") {
        const semMonths = printSemester === "ganjil" ? "Juli - Desember" : "Januari - Juni";
        periodTitle = `REKAPAN ABSENSI SISWA 1 SEMESTER (${printSemester.toUpperCase()})`;
        periodSubTitle = `Tahun Ajaran ${filter.year}/${filter.year + 1} (${semMonths}) | Kelas: ${className}`;
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
                <th style="width: 85px;">NIS</th>
                <th style="text-align: left;">NAMA SISWA</th>
                <th style="width: 80px;">KELAS</th>
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
                    <td>${s.class_name || '-'}</td>
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
                <td colspan="4" style="text-align: right; font-weight: bold;">TOTAL KESELURUHAN KELAS:</td>
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
                <th style="text-align: left; min-width: 140px;">NAMA SISWA</th>
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
                      <div style="font-size: 8px; opacity: 0.8;">${s.class_name || ''}</div>
                    </td>
                    <td class="bg-hadir">${s.total_hadir || 0}</td>
                    <td class="bg-terlambat">${s.total_terlambat || 0}</td>
                    <td class="bg-izin">${s.total_izin || 0}</td>
                    <td class="bg-sakit">${s.total_sakit || 0}</td>
                    <td class="bg-alpa">${s.total_alpa || 0}</td>
                    ${printDays.map(d => {
                      const dayData = (s.days || {})[d];
                      if (!dayData) return `<td>-</td>`;
                      const status = dayData.status;
                      if (status === "Sakit") return `<td class="bg-sakit">S</td>`;
                      if (status === "Izin") return `<td class="bg-izin">I</td>`;
                      if (status === "Alpa" || status === "Alpa (Tanpa Keterangan)") return `<td class="bg-alpa">A</td>`;
                      if (status === "PKL" || String(status || '').startsWith("PKL")) return `<td style="background:#e0e7ff; color:#3730a3; font-weight:bold;">PKL</td>`;
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
              <p>Mengetahui,<br>Wali Kelas / Guru Piket</p>
              <div class="sig-space"></div>
              <p style="text-decoration: underline; font-weight: bold;">( ________________________ )</p>
              <p style="font-size: 9px; color: #64748b;">NIP. -</p>
            </div>
            <div class="sig-box">
              <p>Dicetak Oleh,<br>Petugas / Pengelola Kesiswaan</p>
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
      // Hadir tepat waktu: punya scan, bukan Sakit/Izin/Alpa, dan TIDAK terlambat
      return !["Sakit","Izin","Alpa"].includes(dayData.status) 
        && dayData.in !== "Alpa" && dayData.in !== "Sakit" && dayData.in !== "Izin"
        && !dayData.isLate && dayData.status !== "Terlambat";
    });
  }, [data, isCurrentMonthYear, todayNum, isHolidayOrWeekendToday]);

  if (user?.isWalas && !user.walasClass && !isKesiswaanOrAdmin) {
     return (
        <div className="p-8 text-center bg-rose-50 rounded-[var(--ui-radius-small)] border border-rose-200">
           <AlertTriangle size={48} className="mx-auto text-rose-500 mb-4" />
           <h3 className="text-xl font-bold text-rose-700">Data Wali Kelas Belum Lengkap</h3>
           <p className="text-rose-600 mt-2">Anda terdeteksi sebagai wali kelas, tetapi kelas yang Anda ampu tidak ditemukan atau sudah dihapus.</p>
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
            title={activeTab ==='matriks' ?"Laporan Kehadiran Siswa" :"Manajemen Surat Izin/Sakit"}
            icon={activeTab ==='matriks' ? FileText : UserX}
            description={activeTab ==='matriks' 
              ?"Rekap kehadiran siswa per bulan dalam bentuk matriks." 
              :"Rekap data ketidakhadiran harian siswa dan manajemen file surat izin/sakit."}
            tabs={[
              { id: 'matriks', label: 'Rekap Matriks Kehadiran', icon: FileText },
              { id: 'surat', label: 'Manajemen Surat Izin/Sakit', icon: UserX }
            ]}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />
        </div>
      )}

      {/* Mobile Hero Header Card (Reference Layout matching media__1785568140000.png) */}
      <div 
        className="sm:hidden w-full rounded-[var(--ui-radius-card)] p-5 text-white shadow-xs flex flex-col gap-4 relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, var(--ui-primary) 0%, color-mix(in srgb, var(--ui-primary) 75%, #0d9488) 100%)" }}
      >
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-[var(--ui-radius-card)] bg-white/20 backdrop-blur-md text-white flex items-center justify-center shrink-0 border border-white/20 shadow-inner">
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
        <div className="bg-white rounded-[var(--ui-radius-card)] p-1 flex items-center gap-1 shadow-sm border border-slate-100/90">
          <button
            type="button"
            onClick={() => setActiveTab('matriks')}
            className={`flex-1 py-2 px-2.5 rounded-[var(--ui-radius-small)] text-[10px] font-black uppercase tracking-wider transition-all border-none cursor-pointer text-center ${
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
            className={`flex-1 py-2 px-2.5 rounded-[var(--ui-radius-small)] text-[10px] font-black uppercase tracking-wider transition-all border-none cursor-pointer text-center ${
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
        <AbsensiSiswa students={students} classes={classes} hideTabs={true} externalSearch={search} onExternalSearchChange={setSearch} />
      ) : (
        <>
          {/* Daily Attendance KPI Summary Cards (Ramping & 3 Kolom Sejajar) */}
          {isCurrentMonthYear && !isHolidayOrWeekendToday && data.length > 0 && (
            <div className="grid grid-cols-3 gap-2 sm:gap-4">
              {/* Card 1: Siswa Hadir */}
              <div 
                onClick={() => { setDailyDetailModal('present'); setDailySearchQuery(''); }}
                className="group relative bg-white rounded-[var(--ui-radius-card)] p-2.5 sm:p-4 border border-[var(--ui-border-soft)] shadow-[var(--ui-shadow-card)] hover:shadow-[var(--ui-shadow-card-hover)] hover:-translate-y-0.5 active:scale-95 transition-all duration-200 cursor-pointer flex flex-col justify-between overflow-hidden touch-manipulation"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-1.5 sm:gap-3">
                  <div className="min-w-0">
                    <span className="text-[9.5px] sm:text-[11px] font-black uppercase tracking-wider text-emerald-600 block mb-0.5 truncate">
                      <span className="sm:hidden">Hadir (Hari Ini)</span>
                      <span className="hidden sm:inline">Hadir Tepat Waktu (Hari Ini)</span>
                    </span>
                    <div className="flex items-baseline gap-1">
                      <h3 className="text-xl sm:text-3xl font-black text-slate-800 tracking-tight leading-none">
                        {presentStudentsToday.length}
                      </h3>
                      <span className="text-[10px] sm:text-xs font-bold text-slate-400">/{data.length}</span>
                    </div>
                  </div>
                  <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-[var(--ui-radius-control)] bg-emerald-50 text-emerald-600 border border-emerald-200/60 flex items-center justify-center shrink-0 group-hover:scale-105 group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-xs self-end sm:self-start">
                    <UserCheck size={16} className="sm:w-5 sm:h-5" strokeWidth={2.5} />
                  </div>
                </div>
                
                <div className="mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] sm:text-[11px]">
                  <span className="font-bold text-emerald-700 bg-emerald-50 px-1.5 sm:px-2 py-0.5 rounded-[var(--ui-radius-pill)] border border-emerald-200/60 text-[9px] sm:text-[10px] truncate">
                    {data.length > 0 ? Math.round((presentStudentsToday.length / data.length) * 100) : 0}% Hadir
                  </span>
                  <span className="hidden sm:flex font-bold text-slate-400 group-hover:text-emerald-700 items-center gap-1 transition-colors">
                    Lihat &rarr;
                  </span>
                </div>
              </div>

              {/* Card 2: Siswa Terlambat */}
              <div 
                onClick={() => { setDailyDetailModal('late'); setDailySearchQuery(''); }}
                className="group relative bg-white rounded-[var(--ui-radius-card)] p-2.5 sm:p-4 border border-[var(--ui-border-soft)] shadow-[var(--ui-shadow-card)] hover:shadow-[var(--ui-shadow-card-hover)] hover:-translate-y-0.5 active:scale-95 transition-all duration-200 cursor-pointer flex flex-col justify-between overflow-hidden touch-manipulation"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-1.5 sm:gap-3">
                  <div className="min-w-0">
                    <span className="text-[9.5px] sm:text-[11px] font-black uppercase tracking-wider text-amber-600 block mb-0.5 truncate">
                      Terlambat (Hari Ini)
                    </span>
                    <div className="flex items-baseline gap-1">
                      <h3 className="text-xl sm:text-3xl font-black text-slate-800 tracking-tight leading-none">
                        {lateStudentsToday.length}
                      </h3>
                      <span className="text-[10px] sm:text-xs font-bold text-slate-400">Siswa</span>
                    </div>
                  </div>
                  <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-[var(--ui-radius-control)] bg-amber-50 text-amber-600 border border-amber-200/60 flex items-center justify-center shrink-0 group-hover:scale-105 group-hover:bg-amber-500 group-hover:text-white transition-all shadow-xs self-end sm:self-start">
                    <Clock size={16} className="sm:w-5 sm:h-5" strokeWidth={2.5} />
                  </div>
                </div>
                
                <div className="mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] sm:text-[11px]">
                  <span className={`font-bold px-1.5 sm:px-2 py-0.5 rounded-[var(--ui-radius-pill)] border text-[9px] sm:text-[10px] truncate ${
                    lateStudentsToday.length > 0 
                      ? 'text-amber-700 bg-amber-50 border-amber-200/60' 
                      : 'text-slate-500 bg-slate-50 border-slate-200/60'
                  }`}>
                    {lateStudentsToday.length > 0 ? `${lateStudentsToday.length} Telat` : 'Nihil'}
                  </span>
                  <span className="hidden sm:flex font-bold text-slate-400 group-hover:text-amber-600 items-center gap-1 transition-colors">
                    Lihat &rarr;
                  </span>
                </div>
              </div>

              {/* Card 3: Siswa Belum Scan / Tidak Masuk */}
              <div 
                onClick={() => { setDailyDetailModal('absent'); setDailySearchQuery(''); }}
                className="group relative bg-white rounded-[var(--ui-radius-card)] p-2.5 sm:p-4 border border-[var(--ui-border-soft)] shadow-[var(--ui-shadow-card)] hover:shadow-[var(--ui-shadow-card-hover)] hover:-translate-y-0.5 active:scale-95 transition-all duration-200 cursor-pointer flex flex-col justify-between overflow-hidden touch-manipulation"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-1.5 sm:gap-3">
                  <div className="min-w-0">
                    <span className="text-[9.5px] sm:text-[11px] font-black uppercase tracking-wider text-rose-600 block mb-0.5 truncate">
                      <span className="sm:hidden">Tidak Hadir (Hari Ini)</span>
                      <span className="hidden sm:inline">Belum Hadir / Izin / Sakit (Hari Ini)</span>
                    </span>
                    <div className="flex items-baseline gap-1">
                      <h3 className="text-xl sm:text-3xl font-black text-slate-800 tracking-tight leading-none">
                        {absentStudentsToday.length}
                      </h3>
                      <span className="text-[10px] sm:text-xs font-bold text-slate-400">Siswa</span>
                    </div>
                  </div>
                  <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-[var(--ui-radius-control)] bg-rose-50 text-rose-600 border border-rose-200/60 flex items-center justify-center shrink-0 group-hover:scale-105 group-hover:bg-rose-600 group-hover:text-white transition-all shadow-xs self-end sm:self-start">
                    <UserX size={16} className="sm:w-5 sm:h-5" strokeWidth={2.5} />
                  </div>
                </div>
                
                <div className="mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] sm:text-[11px]">
                  <span className="font-bold text-rose-700 bg-rose-50 px-1.5 sm:px-2 py-0.5 rounded-[var(--ui-radius-pill)] border border-rose-200/60 text-[9px] sm:text-[10px] truncate">
                    {absentStudentsToday.length > 0 ? `${absentStudentsToday.length} Siswa` : 'Nihil'}
                  </span>
                  <span className="hidden sm:flex font-bold text-slate-400 group-hover:text-rose-600 items-center gap-1 transition-colors">
                    Kelola &rarr;
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Banner Validasi Wali Kelas (In-Page, Rapi & Mengikuti Tema Kustomisasi) */}
          {(isWalasUser || (activeWalasClass && activeWalasClass !== 'all')) && (
            <div className="w-full">
              {isAttendanceValidated ? (
                <div className="bg-emerald-50/90 border border-emerald-300/80 rounded-[var(--ui-radius-card)] p-3 sm:p-4 flex items-center justify-between gap-3 shadow-[var(--ui-shadow-card)]">
                  <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                    <div 
                      className="w-8 h-8 sm:w-9 sm:h-9 rounded-[var(--ui-radius-control)] text-white flex items-center justify-center shrink-0 shadow-xs"
                      style={{ backgroundColor: "var(--ui-primary)" }}
                    >
                      <CheckCircle2 size={18} strokeWidth={2.5} />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs sm:text-sm font-black text-slate-800 truncate leading-snug">
                        Absensi Kelas {activeWalasClass || filter.class_name} Tervalidasi
                      </h4>
                      <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium truncate mt-0.5">
                        Diverifikasi hari ini ({attendanceValidatedTime || 'Hari ini'})
                      </p>
                    </div>
                  </div>
                  <span className="text-[9px] sm:text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-[var(--ui-radius-pill)] bg-emerald-100 text-emerald-800 border border-emerald-200 shrink-0">
                    Terverifikasi
                  </span>
                </div>
              ) : (
                <div className="bg-gradient-to-r from-amber-50/90 via-white to-amber-50/70 border border-amber-200/90 rounded-[var(--ui-radius-card)] p-3 sm:p-4 shadow-[var(--ui-shadow-card)] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                    <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-[var(--ui-radius-control)] bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <UserCheck size={18} strokeWidth={2.5} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs sm:text-sm font-black text-slate-800 truncate leading-snug">
                          Validasi Wali Kelas
                        </h4>
                        <span className="text-[8.5px] sm:text-[9.5px] font-extrabold text-amber-700 bg-amber-100/90 border border-amber-200/80 px-2 py-0.5 rounded-[var(--ui-radius-pill)] shrink-0">
                          Perlu Validasi
                        </span>
                      </div>
                      <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium truncate mt-0.5">
                        Kelas: <span className="font-bold text-slate-700">{activeWalasClass || filter.class_name || 'Pilih Kelas'}</span> &bull; Konfirmasi Anda telah memeriksa absensi hari ini.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleConfirmWalasAttendance}
                    className="w-full sm:w-auto shrink-0 py-2.5 px-4 rounded-[var(--ui-radius-control)] text-white text-xs font-black shadow-[var(--ui-shadow-control)] hover:brightness-95 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2 touch-manipulation"
                    style={{ backgroundColor: "var(--ui-primary)" }}
                  >
                    <CheckCircle2 size={16} strokeWidth={2.5} />
                    <span>Saya Sudah Memeriksa Absensi Hari Ini</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Interactive Modal for Daily Attendance Lists */}
          {dailyDetailModal && (
            <Modal
              isOpen={Boolean(dailyDetailModal)}
              onClose={() => { setDailyDetailModal(null); setDailySearchQuery(''); }}
              title="Monitoring Kehadiran Siswa Hari Ini"
              maxWidth="max-w-2xl"
            >
              <div className="space-y-3.5">
                {/* Segmented Filter Tabs inside Modal */}
                <div className="flex items-center gap-1.5 p-1 bg-[var(--ui-surface-muted)] rounded-[var(--ui-radius-control)] border border-[var(--ui-border-muted)] overflow-x-auto">
                  <button
                    type="button"
                    onClick={() => setDailyDetailModal('present')}
                    className={`flex-1 min-w-[120px] py-1.5 px-2.5 rounded-[var(--ui-radius-small)] text-xs font-black transition-all cursor-pointer border flex items-center justify-center gap-1.5 ${
                      dailyDetailModal === 'present'
                        ? 'bg-white text-emerald-700 border-emerald-200 shadow-xs'
                        : 'bg-transparent text-slate-500 border-transparent hover:text-slate-800'
                    }`}
                  >
                    <UserCheck size={14} className="shrink-0 text-emerald-600" />
                    <span>Masuk ({presentStudentsToday.length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDailyDetailModal('late')}
                    className={`flex-1 min-w-[120px] py-1.5 px-2.5 rounded-[var(--ui-radius-small)] text-xs font-black transition-all cursor-pointer border flex items-center justify-center gap-1.5 ${
                      dailyDetailModal === 'late'
                        ? 'bg-white text-amber-700 border-amber-200 shadow-xs'
                        : 'bg-transparent text-slate-500 border-transparent hover:text-slate-800'
                    }`}
                  >
                    <Clock size={14} className="shrink-0 text-amber-600" />
                    <span>Terlambat ({lateStudentsToday.length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDailyDetailModal('absent')}
                    className={`flex-1 min-w-[140px] py-1.5 px-2.5 rounded-[var(--ui-radius-small)] text-xs font-black transition-all cursor-pointer border flex items-center justify-center gap-1.5 ${
                      dailyDetailModal === 'absent'
                        ? 'bg-white text-rose-700 border-rose-200 shadow-xs'
                        : 'bg-transparent text-slate-500 border-transparent hover:text-slate-800'
                    }`}
                  >
                    <UserX size={14} className="shrink-0 text-rose-600" />
                    <span>Belum Hadir ({absentStudentsToday.length})</span>
                  </button>
                </div>

                {/* Search Input in Modal */}
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={dailySearchQuery}
                    onChange={e => setDailySearchQuery(e.target.value)}
                    placeholder="Cari nama siswa, NIS, atau kelas..."
                    className="w-full h-9 pl-9 pr-3 text-xs font-bold rounded-[var(--ui-radius-control)] border border-[var(--ui-border-soft)] bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[var(--ui-primary)] focus:shadow-[var(--ui-focus-ring)] transition-all"
                  />
                  {dailySearchQuery && (
                    <button
                      type="button"
                      onClick={() => setDailySearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600 bg-transparent border-none cursor-pointer"
                    >
                      ×
                    </button>
                  )}
                </div>

                {/* List Container */}
                <div className="border border-[var(--ui-border-muted)] rounded-[var(--ui-radius-card)] overflow-hidden divide-y divide-[var(--ui-border-muted)] max-h-[340px] overflow-y-auto custom-scrollbar bg-white">
                  {(() => {
                    const currentList = dailyDetailModal === 'present' 
                      ? presentStudentsToday 
                      : dailyDetailModal === 'late' 
                        ? lateStudentsToday 
                        : absentStudentsToday;

                    const filtered = currentList.filter(s => {
                      if (!dailySearchQuery) return true;
                      const q = dailySearchQuery.toLowerCase();
                      const name = String(s.name || '').toLowerCase();
                      const nis = String(s.nis || '').toLowerCase();
                      const cls = String(s.class_name || '').toLowerCase();
                      return name.includes(q) || nis.includes(q) || cls.includes(q);
                    });

                    if (filtered.length === 0) {
                      return (
                        <div className="p-8 text-center text-xs text-slate-400 font-bold flex flex-col items-center justify-center gap-2">
                          <Users size={28} className="text-slate-300 stroke-[1.5]" />
                          <span>{dailySearchQuery ? 'Tidak ada siswa yang sesuai pencarian.' : 'Tidak ada data siswa untuk kategori ini.'}</span>
                        </div>
                      );
                    }

                    return filtered.map((s, idx) => {
                      const dayData = s.days[todayNum] || {};
                      const isLate = dayData.isLate || dayData.status === "Terlambat";
                      const status = dayData?.status || dayData?.in || "Alpa";
                      const displayNote = dayData?.note && !dayData.note.includes("Alpa Otomatis") ? dayData.note : null;

                      let avatarColor = 'bg-emerald-100 text-emerald-700 border-emerald-200/60';
                      if (dailyDetailModal === 'late') avatarColor = 'bg-amber-100 text-amber-700 border-amber-200/60';
                      if (dailyDetailModal === 'absent') avatarColor = 'bg-rose-100 text-rose-700 border-rose-200/60';

                      return (
                        <div key={s.nis || idx} className="p-2.5 px-3.5 flex items-center justify-between gap-3 text-xs hover:bg-[var(--ui-surface-muted)] transition-colors">
                          <div className="min-w-0 flex-1 flex items-center gap-2.5">
                            <div className={`w-8 h-8 rounded-full text-xs font-black flex items-center justify-center shrink-0 border ${avatarColor}`}>
                              {s.name ? s.name.charAt(0).toUpperCase() : '?'}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="font-bold text-slate-800 truncate text-[12px]" title={s.name}>{s.name}</div>
                              <div className="text-[10px] text-slate-400 font-semibold flex items-center gap-1.5 truncate">
                                <span>{s.nis}</span>
                                {s.class_name && <span className="text-slate-600 font-bold">• {s.class_name}</span>}
                                {displayNote && <span className="text-slate-500 font-normal truncate" title={displayNote}>({displayNote})</span>}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {dailyDetailModal === 'present' && (
                              <span className={`px-2 py-0.5 font-extrabold rounded-[var(--ui-radius-control)] text-[10px] border shadow-2xs ${
                                isLate ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              }`}>
                                {dayData.in?.substring(0, 5) || "Hadir"} {isLate && "(T)"}
                              </span>
                            )}

                            {dailyDetailModal === 'late' && (
                              <>
                                <span className="px-2 py-0.5 bg-amber-50 text-amber-700 font-extrabold rounded-[var(--ui-radius-control)] text-[10px] border border-amber-200 shadow-2xs">
                                  {dayData.in?.substring(0, 5) || "Terlambat"}
                                </span>
                                <button 
                                  type="button"
                                  onClick={() => {
                                    setDailyDetailModal(null);
                                    handleCellClick(s, todayNum);
                                  }}
                                  className="px-2.5 py-1 text-[11px] font-extrabold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200/80 rounded-[var(--ui-radius-control)] transition-all cursor-pointer flex items-center gap-1 shadow-2xs active:scale-95"
                                  title="Ubah Status"
                                >
                                  <Edit2 size={12} />
                                  <span>Ubah</span>
                                </button>
                              </>
                            )}

                            {dailyDetailModal === 'absent' && (
                              <>
                                <span className={`px-2 py-0.5 font-extrabold rounded-[var(--ui-radius-control)] text-[10px] border shadow-2xs ${
                                  status === "Sakit" ? "bg-amber-50 text-amber-700 border-amber-200" :
                                  status === "Izin" ? "bg-indigo-50 text-indigo-700 border-indigo-200" :
                                  "bg-rose-50 text-rose-700 border-rose-200"
                                }`}>
                                  {status === "Alpa" ? "Belum Scan" : status}
                                </span>
                                <button 
                                  type="button"
                                  onClick={() => {
                                    setDailyDetailModal(null);
                                    handleCellClick(s, todayNum);
                                  }}
                                  className="px-2.5 py-1 text-[11px] font-extrabold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200/80 rounded-[var(--ui-radius-control)] transition-all cursor-pointer flex items-center gap-1 shadow-2xs active:scale-95 whitespace-nowrap"
                                  title="Input Surat Izin/Sakit"
                                >
                                  <FileText size={12} />
                                  <span>Input Surat</span>
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            </Modal>
          )}

      {/* Mobile Filter Card (Reference Layout matching media__1785568140000.png) */}
      <div className="sm:hidden ui-card rounded-[var(--ui-radius-card)] p-4 shadow-sm border border-slate-100/90 flex flex-col gap-4">
        {/* Top Row: Class Filter Label + Export Buttons */}
        <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-[var(--ui-radius-small)] bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
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
              className="px-2.5 py-1.5 rounded-[var(--ui-radius-small)] bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200/60 flex items-center justify-center font-black text-[10px] transition-all cursor-pointer disabled:opacity-50"
              title="Export PDF"
            >
              PDF
            </button>
            <button
              type="button"
              onClick={() => handleExport(exportMode === 'detailed')}
              disabled={loading || data.length === 0}
              className="px-2.5 py-1.5 rounded-[var(--ui-radius-small)] bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-200/60 flex items-center justify-center font-black text-[10px] transition-all cursor-pointer disabled:opacity-50"
              title="Export Excel"
            >
              XLS
            </button>
          </div>
        </div>

        {/* Form Grid 2x2 */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="bg-slate-50 p-2.5 rounded-[var(--ui-radius-card)] border border-slate-100">
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

          <div className="bg-slate-50 p-2.5 rounded-[var(--ui-radius-card)] border border-slate-100">
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

          <div className="bg-slate-50 p-2.5 rounded-[var(--ui-radius-card)] border border-slate-100">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Bulan</label>
            <CustomSelect 
              value={filter.month} 
              onChange={val => setFilter({ ...filter, month: parseInt(val) })}
              options={monthOptions}
            />
          </div>

          <div className="bg-slate-50 p-2.5 rounded-[var(--ui-radius-card)] border border-slate-100">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Tahun</label>
            <CustomSelect 
              value={filter.year} 
              onChange={val => setFilter({ ...filter, year: parseInt(val) })}
              options={yearOptions.map(y => ({ value: y, label: y.toString() }))}
            />
          </div>
        </div>

        {isKesiswaanOrAdmin ? (
          <div className="bg-slate-50 p-2.5 rounded-[var(--ui-radius-card)] border border-slate-100">
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
        ) : user?.isWalas && user?.walasClass ? (
          <div className="bg-slate-50 p-2.5 rounded-[var(--ui-radius-card)] border border-slate-100">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Kelas Binaan</label>
            <div className="px-3 py-1.5 bg-white border border-slate-200 rounded-[var(--ui-radius-small)] text-xs font-bold text-slate-800">
              {user.walasClass}
            </div>
          </div>
        ) : (
          <div className="bg-slate-50 p-2.5 rounded-[var(--ui-radius-card)] border border-slate-100">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Status Akses</label>
            <div className="px-3 py-1.5 bg-white border border-slate-200 rounded-[var(--ui-radius-small)] text-xs font-semibold text-slate-500">
              Akses khusus Wali Kelas / Kesiswaan
            </div>
          </div>
        )}

        <div className="bg-slate-50 p-2.5 rounded-[var(--ui-radius-card)] border border-slate-100">
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

        {/* Tampilkan Data Action Button */}
        <button
          type="button"
          onClick={fetchData}
          className="w-full py-3 rounded-[var(--ui-radius-card)] font-black text-xs text-white flex items-center justify-center gap-2 transition-all shadow-xs active:scale-98 cursor-pointer"
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
          <span className="px-3 py-1 rounded-[var(--ui-radius-pill)] bg-emerald-50 text-emerald-700 border border-emerald-200/60 shrink-0 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> HADIR
          </span>
          <span className="px-3 py-1 rounded-[var(--ui-radius-pill)] bg-amber-50 text-amber-700 border border-amber-200/60 shrink-0 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> TELAT
          </span>
          <span className="px-3 py-1 rounded-[var(--ui-radius-pill)] bg-indigo-50 text-indigo-700 border border-indigo-200/60 shrink-0 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" /> IZIN/SKT
          </span>
          <span className="px-3 py-1 rounded-[var(--ui-radius-pill)] bg-rose-50 text-rose-700 border border-rose-200/60 shrink-0 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" /> ALPA
          </span>
        </div>
      </div>

      {/* Desktop Filter Container */}
      <div className="hidden sm:flex ui-card p-4 sm:p-5 flex-col gap-4 relative z-30 shadow-xs border border-slate-200/80">
        {/* Top Filter Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
          <div className="min-w-0">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Cari Siswa</label>
            <div className="relative w-full">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Nama / NIS..."
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
          {!user?.isWalas && (
            <div className="min-w-0">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Kelas</label>
              <CustomSelect 
                value={filter.class_name} 
                onChange={val => setFilter({ ...filter, class_name: val })}
                options={[
                  { value:"all", label:"-- Semua --" },
                  ...classes.map(c => ({ value: c.name || c.kelas, label: c.name || c.kelas }))
                ]}
              />
            </div>
          )}
          <div className="min-w-0">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Urutkan</label>
            <div className="flex items-center gap-1 w-full min-w-0">
              <div className="flex-1 min-w-0">
                <CustomSelect
                  value={sortBy}
                  onChange={val => setSortBy(val)}
                  options={[
                    { value: "class_nis", label: "Kelas & NIS" },
                    { value: "nis", label: "NIS" },
                    { value: "name", label: "Nama (A-Z)" },
                    { value: "hadir", label: "Total Hadir" },
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

        {/* Bottom Action Bar: Mode Select + Export Buttons */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest shrink-0">Opsi Tampilan:</label>
            <UISelect 
              value={exportMode}
              onChange={(e) => setExportMode(e.target.value)}
              className="text-xs py-1.5 h-9 px-3 border-slate-200 rounded-[var(--ui-radius-small)] bg-slate-50 font-bold focus:bg-white"
            >
              <option value="summary">Ringkas (Status H/T/I/S/A)</option>
              <option value="detailed">Lengkap (Jam Masuk / Pulang)</option>
            </UISelect>
          </div>

          <div className="flex items-center gap-2 shrink-0 justify-end">
            <Button 
              variant="outline"
              type="button"
              onClick={() => handleExport(exportMode === 'detailed')}
              disabled={loading || data.length === 0}
              className="px-3.5 py-2 bg-emerald-50/90 hover:bg-emerald-100 text-emerald-700 border-emerald-200/90 flex items-center justify-center gap-1.5 text-xs font-black cursor-pointer shadow-2xs disabled:opacity-50"
            >
              <FileSpreadsheet size={14} className="shrink-0 text-emerald-600" />
              <span>Excel</span>
            </Button>

            <Button 
              variant="outline"
              type="button"
              onClick={() => handleExportPDF(exportMode === 'detailed')}
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

      <div className="ui-card shadow-xs border border-slate-200/80 overflow-hidden relative z-10">
        <div className="px-4 py-3 border-b border-slate-200/80 bg-slate-50/70 flex flex-wrap items-center justify-between gap-3">
           <div className="text-xs font-bold text-slate-700">
             Menampilkan Matriks Kehadiran Siswa <span className="font-black text-slate-900">({filteredData.length} Siswa)</span>
           </div>
           <div className="flex flex-wrap items-center gap-3 text-[10px] font-black uppercase tracking-wider text-slate-500">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span> Tepat Waktu</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"></span> Terlambat</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block"></span> Izin</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block"></span> Sakit</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-indigo-600 inline-block"></span> PKL</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-slate-900 inline-block"></span> Alpa</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-slate-300 inline-block"></span> Kosong</span>
           </div>
        </div>
         
         <div className="overflow-x-auto relative">
           <table className="w-full text-left border-collapse min-w-max">
             <thead>
               <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] uppercase tracking-wider">
                 <th className="px-2.5 py-3 w-12 font-black text-center border-r border-slate-200">NO</th>
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
                    <td colSpan={7 + daysToRender.length} className="px-6 py-12 text-center text-slate-500 font-bold">Memuat data absen...</td>
                  </tr>
                ) : paginatedData.length === 0 ? (
                  <tr>
                    <td colSpan={7 + daysToRender.length} className="px-6 py-12 text-center text-slate-500 font-bold">Tidak ada data untuk filter ini.</td>
                  </tr>
                ) : (
                  paginatedData.map((d, idx) => {
                    const v = checkViolation(d, daysToRender);
                    return (
                      <tr 
                        key={d.nis} 
                        className={`border-b transition-colors ${v.bgClass}`}
                      >
                         <td className="px-2.5 py-2.5 text-center text-slate-400 font-bold text-xs border-r border-slate-200">
                            {(currentPage - 1) * itemsPerPage + idx + 1}
                         </td>
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
                            <div className={`text-[9px] ${v.subTextClass} font-semibold truncate`}>{d.class_name || d.nis || 'Tanpa Kelas'}</div>
                         </td>
                         <td className="px-3 py-3 text-center font-black text-emerald-600 border-r border-slate-100">{d.total_hadir}</td>
                         <td className="px-3 py-3 text-center font-black text-amber-600 border-r border-slate-100">
                             <div>{d.total_terlambat || 0}</div>
                          </td>
                         <td className="px-3 py-3 text-center font-black text-indigo-600 border-r border-slate-100">{d.total_izin || 0}</td>
                         <td className="px-3 py-3 text-center font-black text-amber-500 border-r border-slate-100">{d.total_sakit || 0}</td>
                         <td className="px-3 py-3 text-center font-black text-rose-600 border-r border-slate-100">
                             <div>{d.total_alpa || 0}</div>
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
                              className="px-1 py-2 text-center border-r border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors relative"
                            >
                              {dayData?.pending_permission && (
                                 <div className="absolute top-1 right-1 w-2 h-2 bg-amber-400 rounded-full border border-white shadow-sm" title="Menunggu Persetujuan"></div>
                              )}
                               <div className={`text-[9px] font-black leading-tight p-1 rounded-[var(--ui-radius-small)] ${cellColors.className}`} style={cellColors.style}>
                                  {["Sakit","Izin","Alpa"].includes(dayData.status) || dayData.isPkl || String(dayData.status || '').startsWith("PKL") ? (
                                    <div className="py-1 flex flex-col items-center justify-center min-h-[32px]">
                                      <span className="font-extrabold">{dayData.isPkl || String(dayData.status || '').startsWith("PKL") ? "PKL" : dayData.status.toUpperCase()}</span>
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
                <tr className="bg-indigo-100/90 border-b border-indigo-200 text-indigo-950">
                  <td className="px-4 py-2 sticky left-0 bg-indigo-100 z-10 border-r border-indigo-300 font-black text-[10px] uppercase">TOTAL IZIN (IZN)</td>
                  <td className="px-3 py-2 text-center border-r border-indigo-300 text-indigo-300 font-bold">-</td>
                  <td className="px-3 py-2 text-center border-r border-indigo-300 text-indigo-300 font-bold">-</td>
                  <td className="px-3 py-2 text-center border-r border-indigo-300 text-indigo-800 font-extrabold text-xs">{filteredData.reduce((acc, s) => acc + (s.total_izin || 0), 0)}</td>
                  <td className="px-3 py-2 text-center border-r border-indigo-300 text-indigo-300 font-bold">-</td>
                  <td className="px-3 py-2 text-center border-r border-indigo-300 text-indigo-300 font-bold">-</td>
                  {daysToRender.map(d => (
                    <td key={d} className="px-1 py-1.5 text-center border-r border-indigo-200/80">
                      {dailyTotals.izin[d] > 0 ? (
                        <span className="inline-flex items-center justify-center min-w-[22px] h-5 px-1.5 rounded-full bg-[var(--ui-primary)] text-white font-black text-[10px] shadow-2xs">
                          {dailyTotals.izin[d]}
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-indigo-300">0</span>
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
                  <td className="px-3 py-2 text-center border-r border-slate-700 text-rose-400 font-black text-xs">{filteredData.reduce((acc, s) => acc + (s.total_alpa || 0), 0)}</td>
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

       {/* Input Ketidakhadiran Modal */}
       {selectedCell && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
           <div className="bg-white rounded-[var(--ui-radius-card)] shadow-sm max-w-sm w-full overflow-hidden animate-in zoom-in-95 duration-200">
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
                   {permissionForm.gdriveUrl && !permissionForm.replaceImage ? (
                      <div className="bg-slate-50 p-2.5 border border-slate-200 rounded-[var(--ui-radius-small)] text-center">
                        <button type="button" onClick={() => setShowPermissionPreviewModal(true)} className="w-full bg-indigo-50 text-indigo-700 hover:bg-indigo-600 hover:text-white border border-indigo-200 font-bold px-3 py-2 rounded-[var(--ui-radius-small)] transition-all cursor-pointer text-xs flex justify-center items-center gap-2">
                           <Eye size={14} /> Lihat Surat / Foto
                        </button>
                      </div>
                   ) : (
                      <>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileChange}
                          className="w-full bg-slate-50 border border-slate-200 p-2 rounded-[var(--ui-radius-small)] text-xs font-semibold"
                        />
                         {permissionForm.fileData && (
                           <div className="inline-flex items-center gap-1 text-[9px] text-emerald-600 font-bold mt-1">
                             <CheckCircle2 size={11} className="shrink-0 text-emerald-600" />
                             <span>Gambar siap diupload ({permissionForm.fileSizeKB} KB)</span>
                           </div>
                         )}
                      </>
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

                <div className="text-[9px] font-bold text-amber-600 bg-amber-50 p-2.5 rounded-[var(--ui-radius-small)] border border-amber-100 leading-normal flex items-start gap-1.5">
                  <AlertTriangle size={13} className="shrink-0 text-amber-600 mt-0.5" />
                  <span>Catatan: Pengajuan ketidakhadiran dari halaman ini memerlukan persetujuan dari Tata Usaha atau Kesiswaan sebelum aktif di laporan rekapitulasi.</span>
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
       {/* Modal Preview Surat / Foto */}
       {showPermissionPreviewModal && (
         <Modal isOpen={true} onClose={() => setShowPermissionPreviewModal(false)} title="Lihat Surat / Bukti" maxWidth="max-w-md">
           <div className="p-2 flex flex-col gap-4">
              <div className="bg-slate-900/90 rounded-[var(--ui-radius-card)] p-4 min-h-[250px] flex flex-col items-center justify-center relative overflow-hidden border border-slate-700">
                {(permissionForm.gdriveUrl && !permissionForm.gdriveUrl.startsWith('data:image/')) ? (
                   <div className="text-center">
                     <p className="text-sm font-bold text-white mb-3">Dokumen tersimpan di Google Drive</p>
                     <a href={permissionForm.gdriveUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 px-4 rounded-[var(--ui-radius-small)] shadow-sm transition-colors">
                       <ExternalLink size={16} /> Buka Link Foto/Surat
                     </a>
                   </div>
                ) : permissionForm.gdriveUrl?.startsWith('data:image/') ? (
                   <img src={permissionForm.gdriveUrl} alt="Bukti" className="max-h-[380px] w-auto max-w-full object-contain rounded-[var(--ui-radius-small)] shadow-xs border border-slate-700" />
                ) : (
                   <p className="text-slate-400 font-medium text-sm">Tidak ada foto.</p>
                )}
              </div>
              
              <div className="flex justify-between items-center gap-3 pt-4 border-t border-slate-100">
                 <Button type="button" variant="outline" className="text-xs text-rose-600 hover:bg-rose-50 border-rose-200" onClick={() => {
                    setPermissionForm({...permissionForm, replaceImage: true, gdriveUrl: null});
                    setShowPermissionPreviewModal(false);
                 }}>
                    Ganti Foto/Berkas
                 </Button>
                 <Button type="button" onClick={() => setShowPermissionPreviewModal(false)}>
                    Tutup
                 </Button>
              </div>
           </div>
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
                   <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Cetak Laporan Kehadiran</h3>
                   <p className="text-[10px] text-slate-500 font-medium">Pilih periode dan format pencetakan laporan</p>
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
                     { id: 'harian', label: 'Harian (Per Hari)', desc: 'Cetak presensi 1 hari', icon: Calendar },
                     { id: 'mingguan', label: 'Mingguan', desc: 'Per minggu (7 hari)', icon: Calendar },
                     { id: 'bulanan', label: 'Bulanan (Matriks)', desc: 'Matriks 1 bulan penuh', icon: FileSpreadsheet },
                     { id: 'semester', label: '1 Semester', desc: 'Rekap total 6 bulan', icon: Wand2 },
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
                   <UISelect
                     value={printDate}
                     onChange={e => setPrintDate(parseInt(e.target.value))}
                     className="w-full bg-white border border-slate-200 p-2 rounded-[var(--ui-radius-small)] text-xs font-bold focus:outline-indigo-500"
                   >
                     {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(d => (
                       <option key={d} value={d}>Tanggal {d} ({filter.month}/{filter.year})</option>
                     ))}
                   </UISelect>
                 </div>
               )}

               {printPeriod === 'mingguan' && (
                 <div className="p-3 bg-slate-50 rounded-[var(--ui-radius-card)] border border-slate-200/80 space-y-2">
                   <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">Pilih Minggu Ke-</label>
                   <UISelect
                     value={printWeek}
                     onChange={e => setPrintWeek(parseInt(e.target.value))}
                     className="w-full bg-white border border-slate-200 p-2 rounded-[var(--ui-radius-small)] text-xs font-bold focus:outline-indigo-500"
                   >
                     <option value={1}>Minggu ke-1 (Tgl 1 - 7)</option>
                     <option value={2}>Minggu ke-2 (Tgl 8 - 14)</option>
                     <option value={3}>Minggu ke-3 (Tgl 15 - 21)</option>
                     <option value={4}>Minggu ke-4 (Tgl 22 - 28)</option>
                     <option value={5}>Minggu ke-5 (Tgl 29 - {daysInMonth})</option>
                   </UISelect>
                 </div>
               )}

               {printPeriod === 'semester' && (
                 <div className="p-3 bg-slate-50 rounded-[var(--ui-radius-card)] border border-slate-200/80 space-y-2">
                   <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">Pilih Semester</label>
                   <UISelect
                     value={printSemester}
                     onChange={e => setPrintSemester(e.target.value)}
                     className="w-full bg-white border border-slate-200 p-2 rounded-[var(--ui-radius-small)] text-xs font-bold focus:outline-indigo-500"
                   >
                     <option value="ganjil">Semester Ganjil (Juli - Desember)</option>
                     <option value="genap">Semester Genap (Januari - Juni)</option>
                   </UISelect>
                 </div>
               )}

               <div className="p-3 bg-indigo-50/60 rounded-[var(--ui-radius-card)] border border-indigo-100 flex items-start gap-2 text-[10.5px] text-indigo-900 font-semibold leading-relaxed">
                 <CheckCircle2 size={15} className="shrink-0 text-indigo-600 mt-0.5" />
                 <span>Laporan akan dicetak lengkap dengan Kop Surat Sekolah, Rekapan Jumlah Harian (Hadir/Telat/Izin/Sakit/Alpa), serta Kolom Tanda Tangan Wali Kelas.</span>
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
       </>
      )}

      {toast && (
        <div className={`fixed bottom-20 right-6 px-4 py-3 rounded-[var(--ui-radius-small)] shadow-lg font-medium text-sm flex items-center gap-2 animate-in slide-in-from-bottom-5 text-white z-[100] ${toast.type ==='error' ?'bg-rose-600' :'bg-emerald-600'}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
