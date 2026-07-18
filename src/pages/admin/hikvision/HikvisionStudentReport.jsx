import React, { useState, useEffect, useCallback } from'react';
import useAuthStore from'../../../store/monitoring/authStore';
import { FileText, UserX, FileSpreadsheet, Plus } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useAppStore } from'../../../store/useAppStore';
import { AlertTriangle, ShieldAlert, UserCheck, Filter, Search, X, CheckCircle2 } from'lucide-react';
import AbsensiSiswa from'../../kedisiplinan/AbsensiSiswa.jsx';
import { PageHeader } from'../../../components/monitoring/ui/index.js';
import { CustomSelect } from'../../../components/CustomSelect.jsx';
import { UISelect, Button } from'../../../components/ui.jsx';


export default function HikvisionStudentReport({ classes = [], students = [] }) {
  const user = useAuthStore(state => state.user);
  const authToken = user?.authToken;
  const [activeTab, setActiveTab] = useState("matriks"); //"matriks" |"surat"

  
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
    class_name: user?.isWalas ? user.walasClass :"all"
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

  const handleExport = () => {
    if (data.length === 0) return showToast("Tidak ada data untuk diekspor","warning");
    
    const exportData = data.map(item => {
      const row = {"NIS": item.nis,"Nama Siswa": item.name,"Kelas": item.class_name ||"-","Total Hadir": item.total_hadir,"Terlambat": item.total_terlambat
      };
      for (let i = 1; i <= daysInMonth; i++) {
         const dayData = item.days[i];
         if (dayData) {
            row[`Tgl ${i}`] = `${dayData.in ||'-'} / ${dayData.out ||'-'}${dayData.isLate ?' (T)' :''}`;
         } else {
            row[`Tgl ${i}`] ="";
         }
      }
      return row;
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws,"Laporan Absensi Siswa");
    XLSX.writeFile(wb, `Laporan_Absensi_${filter.class_name}_${filter.year}_${filter.month}.xlsx`);
  };

  const handleExportPDF = () => {
    if (data.length === 0) return showToast("Tidak ada data untuk diekspor", "warning");
    
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });
    
    const monthName = new Date(filter.year, filter.month - 1).toLocaleString('id-ID', { month: 'long' });
    const startY = drawKopSurat(doc, true);

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

    const body = data.map(item => {
      const row = [
        item.nis,
        item.name.substring(0, 25), // Trim name slightly to fit
        item.class_name || "-",
        item.total_hadir.toString(),
        item.total_terlambat.toString()
      ];
      
      for (let i = 1; i <= daysInMonth; i++) {
        const dayData = item.days[i];
        if (!dayData) {
          row.push("-");
        } else {
          const status = dayData.status;
          if (status === "Alpa" || status === "Alpa (Tanpa Keterangan)" || dayData.in === "Alpa") row.push("A");
          else if (status === "Sakit") row.push("S");
          else if (status === "Izin") row.push("I");
          else if (dayData.isLate || status === "Terlambat") row.push("T");
          else if (dayData.in || dayData.out) row.push("H");
          else row.push("-");
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
        if (data.section === 'body' && data.column.index >= 5) {
          const val = data.cell.raw;
          if (val === 'H') {
            data.cell.styles.fillColor = [220, 252, 231]; 
            data.cell.styles.textColor = [22, 101, 52];   
          } else if (val === 'T') {
            data.cell.styles.fillColor = [254, 226, 226]; 
            data.cell.styles.textColor = [185, 28, 28];   
          } else if (val === 'S') {
            data.cell.styles.fillColor = [254, 243, 199]; 
            data.cell.styles.textColor = [146, 64, 14];   
          } else if (val === 'I') {
            data.cell.styles.fillColor = [219, 234, 254]; 
            data.cell.styles.textColor = [30, 64, 175];   
          } else if (val === 'A') {
            data.cell.styles.fillColor = [15, 23, 42];      
            data.cell.styles.textColor = [255, 255, 255]; 
          }
        }
      }
    });

    const finalY = doc.lastAutoTable.finalY + 10;
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
  };

  const filteredData = data.filter(d => {
    if (search && !d.name.toLowerCase().includes(search.toLowerCase()) && !d.nis.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

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

  if (user?.isWalas && !user.walasClass) {
     return (
        <div className="p-8 text-center bg-red-50 rounded-[var(--ui-radius-small)] border border-red-200">
           <AlertTriangle size={48} className="mx-auto text-red-500 mb-4" />
           <h3 className="text-xl font-bold text-red-700">Data Wali Kelas Belum Lengkap</h3>
           <p className="text-red-600 mt-2">Anda terdeteksi sebagai wali kelas, tetapi kelas yang Anda ampu tidak ditemukan atau sudah dihapus.</p>
        </div>
     );
  }

  return (
    <div className="space-y-6 animate-fade-in w-full">
      <PageHeader 
        title={activeTab ==='matriks' ?"Laporan Matriks Bulanan" :"Manajemen Surat Izin/Sakit"}
        icon={activeTab ==='matriks' ? FileText : UserX}
        description={activeTab ==='matriks' 
          ?"Rekap kehadiran siswa per bulan dalam bentuk matriks." 
          :"Rekap data ketidakhadiran harian siswa dan manajemen file surat izin/sakit."}
        tabs={[
          { id:'matriks', label:'Laporan Matriks Bulanan' },
          { id:'surat', label:'Manajemen Surat Izin/Sakit' }
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

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

      <div className="ui-card p-6 flex flex-col gap-6 relative z-30">
        {/* Header Row */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-black text-slate-800 flex items-center gap-2">
              <FileText size={18} className="text-[var(--ui-primary)]" />
              Laporan Absensi Siswa {user?.isWalas && `(Kelas ${user.walasClass})`}
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Rekap kehadiran siswa per bulan dalam bentuk matriks.
            </p>
          </div>
          <div className="flex gap-2">
             <Button variant="ghost" size="sm" 
               onClick={handleExport}
               disabled={loading || data.length === 0}
               className="flex items-center gap-1.5"
             >
               <FileSpreadsheet size={14} className="shrink-0" />
               <span className="hidden sm:inline">Excel Export</span>
               <span className="inline sm:hidden">Excel</span>
             </Button>
             <Button variant="ghost" size="sm" 
               onClick={handleExportPDF}
               disabled={loading || data.length === 0}
               className="flex items-center gap-1.5"
             >
               <FileText size={14} className="shrink-0" />
               <span className="hidden sm:inline">PDF Export</span>
               <span className="inline sm:hidden">PDF</span>
             </Button>
          </div>
        </div>

        {/* Filters Row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5 items-end w-full">
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
           <div className="flex gap-2 col-span-2 sm:col-span-1">
             <button
               onClick={fetchData}
               className="flex-grow flex items-center justify-center gap-1.5 h-10 px-4 bg-[var(--ui-primary)] hover:opacity-90 text-white text-xs font-black rounded-[var(--ui-radius-small)] transition-all cursor-pointer border-none"
             >
               <Filter size={14} className="shrink-0" />
               <span className="hidden sm:inline">Terapkan</span>
             </button>
           </div>
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
               <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-[var(--ui-radius-small)] bg-slate-900 inline-block"></span> Alpa</span>
               <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-[var(--ui-radius-small)] bg-slate-200 inline-block"></span> Kosong</span>
            </div>
         </div>
         
         <div className="overflow-x-auto relative">
           <table className="w-full text-left border-collapse min-w-max">
             <thead>
               <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] uppercase tracking-wider">
                 <th className="px-4 py-3 font-black sticky left-0 bg-slate-50 z-10 border-r border-slate-200">Siswa</th>
                 <th className="px-3 py-3 font-black text-center border-r border-slate-200">Σ Hdr</th>
                 <th className="px-3 py-3 font-black text-center border-r border-slate-200">Σ Tlt</th>
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
                      <td className="px-4 py-3 sticky left-0 bg-white border-r border-slate-100 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] z-10">
                         <div className="font-bold text-slate-800 text-xs truncate max-w-[150px]" title={d.name}>{d.name}</div>
                         <div className="text-[9px] text-slate-400 font-bold truncate max-w-[150px]">{d.class_name ||'Tanpa Kelas'}</div>
                      </td>
                      <td className="px-3 py-3 text-center font-black text-slate-700 border-r border-slate-100">{d.total_hadir}</td>
                      <td className="px-3 py-3 text-center font-black text-amber-600 border-r border-slate-100">{d.total_terlambat}</td>
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
                                  {["Sakit","Izin","Alpa"].includes(dayData.status) ? (
                                    <div className="py-1 flex flex-col items-center justify-center min-h-[32px]">
                                      <span className="font-extrabold">{dayData.status}</span>
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

         {/* Pagination Controls */}
         {totalPages > 1 && (
           <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 bg-slate-50 border-t border-slate-200 text-xs font-bold text-slate-500">
             <div>
               Menampilkan {Math.min((currentPage - 1) * itemsPerPage + 1, filteredData.length)} - {Math.min(currentPage * itemsPerPage, filteredData.length)} dari {filteredData.length} data
             </div>
             <div className="flex items-center gap-1.5 flex-wrap">
               <Button variant="outline"
                 type="button"
                 disabled={currentPage === 1}
                 onClick={() =>setCurrentPage(prev => Math.max(prev - 1, 1))}
                 className="cursor-pointer"
               >
                 Sebelumnya</Button>
               {Array.from({ length: totalPages }).map((_, idx) => {
                 const pageNum = idx + 1;
                 return (
                   <Button variant="outline"
                     key={pageNum}
                     type="button"
                     onClick={() =>setCurrentPage(pageNum)}
                     className={`cursor-pointer`}
                   >
                     {pageNum}</Button>
                 );
               })}
               <Button variant="outline"
                 type="button"
                 disabled={currentPage === totalPages}
                 onClick={() =>setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                 className="cursor-pointer"
               >
                 Selanjutnya</Button>
             </div>
           </div>
         )}
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
                   <option value="Alpa">Alpa (Tanpa Keterangan)</option>
                 </UISelect>
               </div>

               {["Sakit","Izin"].includes(permissionForm.status) && (
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
