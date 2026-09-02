import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  AlertTriangle, CheckCircle2, Info, UserCheck, Briefcase, GraduationCap, 
  Fingerprint, X, Users, Link as LinkIcon, Link2Off, RefreshCw, Wifi, 
  Sparkles, Upload, CheckSquare, Search, AlertCircle, Database
} from 'lucide-react';
import { Button, Modal, UISelect } from '../../../components/ui.jsx';
import { PageHeader } from '../../../components/monitoring/ui/index.js';
import { PaginationControls } from '../../../components/ui/PaginationControls.jsx';
import useAuthStore from '../../../store/monitoring/authStore';
import ExcelJS from 'exceljs';

// ── TOAST NOTIFICATION ────────────────────────────────────────────────────────
const Toast = ({ message, type, onClose }) => {
  if (!message) return null;
  const bg = { 
    success: "bg-emerald-50 border-emerald-200 text-emerald-900", 
    error: "bg-rose-50 border-rose-200 text-rose-900", 
    info: "bg-sky-50 border-sky-200 text-sky-900" 
  };
  const Icon = type === 'success' ? CheckCircle2 : type === 'error' ? AlertTriangle : Info;
  const ic = { success: "text-emerald-600", error: "text-rose-600", info: "text-sky-600" };
  return (
    <div className="fixed bottom-5 right-5 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
      <div className={`flex items-center gap-3 px-4 py-3 rounded-[var(--ui-radius-small)] border shadow-sm ${bg[type] || bg.info} max-w-md`}>
        <Icon size={20} className={`${ic[type] || ic.info} shrink-0`} />
        <p className="text-xs sm:text-sm font-bold flex-1 leading-snug">{message}</p>
        <button 
          type="button" 
          onClick={onClose} 
          className="p-1 hover:bg-black/5 rounded-[var(--ui-radius-small)] transition-colors cursor-pointer text-slate-500 hover:text-slate-800"
        >
          <X size={15} />
        </button>
      </div>
    </div>
  );
};

// ── TAB SISWA ──────────────────────────────────────────────────────────────────
function TabSiswa({ classes, authToken, showToast }) {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncingMaster, setSyncingMaster] = useState(false);
  const [search, setSearch] = useState("");
  const [groupFilter, setGroupFilter] = useState("all");
  const [classFilter, setClassFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all"); // 'all' | 'connected' | 'not_on_device' | 'not_in_master'
  const [saving, setSaving] = useState({});
  const [selectedNis, setSelectedNis] = useState(new Set());
  const [bulkClass, setBulkClass] = useState("");
  const [isBulkSaving, setIsBulkSaving] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importReview, setImportReview] = useState(null);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  const fileInputRef = useRef(null);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/hikvision/students?type=siswa", {
        headers: { "Authorization": `Bearer ${authToken}` }
      });
      const data = await res.json();
      if (data.ok) {
        setStudents(data.data || []);
      } else {
        showToast(data.error || "Gagal memuat data siswa", "error");
      }
    } catch (err) {
      showToast("Terjadi kesalahan jaringan saat memuat data siswa.", "error");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const handleSyncFromDevice = async () => {
    setSyncing(true);
    try {
      const res = await fetch('/api/hikvision/sync-all', {
        method: 'POST',
        headers: { "Authorization": `Bearer ${authToken}`, "Content-Type": "application/json" }
      });
      const data = await res.json();
      if (data.ok) {
        showToast(data.message || 'Sinkronisasi dari mesin absensi berhasil!', 'success');
        await fetchStudents();
      } else {
        showToast(data.error || 'Sinkronisasi dari mesin gagal.', 'error');
      }
    } catch (err) {
      showToast('Kesalahan jaringan saat sinkronisasi.', 'error');
    }
    setSyncing(false);
  };

  const handleSyncClassesFromMaster = async () => {
    setSyncingMaster(true);
    try {
      const res = await fetch('/api/hikvision/sync-classes-from-master', {
        method: 'POST',
        headers: { "Authorization": `Bearer ${authToken}`, "Content-Type": "application/json" }
      });
      const data = await res.json();
      if (data.ok) {
        showToast(data.message || 'Berhasil menyinkronkan pemetaan kelas dari Master Data!', 'success');
        await fetchStudents();
      } else {
        showToast(data.error || 'Gagal sinkron kelas dari Master Data.', 'error');
      }
    } catch (err) {
      showToast('Kesalahan jaringan saat sinkronisasi kelas.', 'error');
    }
    setSyncingMaster(false);
  };

  const handleClassChange = async (nis, newClassName) => {
    setSaving(prev => ({ ...prev, [nis]: true }));
    try {
      const res = await fetch(`/api/hikvision/students/${nis}`, {
        method: 'PUT',
        headers: { "Authorization": `Bearer ${authToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ class_name: newClassName })
      });
      const data = await res.json();
      if (data.ok) {
        setStudents(prev => prev.map(s => s.nis === nis ? { ...s, class_name: newClassName } : s));
        showToast("Kelas berhasil diperbarui", "success");
      } else {
        showToast(data.error || "Gagal menyimpan pemetaan kelas", "error");
      }
    } catch (err) {
      showToast("Kesalahan jaringan.", "error");
    }
    setSaving(prev => ({ ...prev, [nis]: false }));
  };

  const handleBulkApply = async () => {
    if (selectedNis.size === 0) return showToast("Pilih minimal 1 siswa.", "error");
    if (!bulkClass) return showToast("Pilih kelas yang ingin diterapkan.", "error");
    setIsBulkSaving(true);
    const updates = Array.from(selectedNis).map(nis => ({ nis, class_name: bulkClass }));
    try {
      const res = await fetch('/api/hikvision/students/bulk', {
        method: 'PUT',
        headers: { "Authorization": `Bearer ${authToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ updates })
      });
      const data = await res.json();
      if (data.ok) {
        setStudents(prev => prev.map(s => selectedNis.has(s.nis) ? { ...s, class_name: bulkClass } : s));
        setSelectedNis(new Set());
        setBulkClass("");
        showToast(`Berhasil memetakan kelas untuk ${updates.length} siswa!`, "success");
      } else {
        showToast(data.error || "Gagal memetakan kelas", "error");
      }
    } catch (err) {
      showToast("Kesalahan jaringan.", "error");
    }
    setIsBulkSaving(false);
  };

  const handleAutoDetect = () => {
    const validClassesMap = new Map((classes || []).map(c => [c?.name ? String(c.name).trim().toLowerCase() : "", c?.name || ""]));
    const updates = [];
    (students || []).forEach(s => {
      if (s && s.master_class_name && s.class_name !== s.master_class_name) {
        updates.push({ nis: s.nis, class_name: s.master_class_name });
      } else if (s && s.group_name) {
        const gName = String(s.group_name).trim().toLowerCase();
        if (gName && validClassesMap.has(gName)) {
          const correctClassName = validClassesMap.get(gName);
          if (s.class_name !== correctClassName) {
            updates.push({ nis: s.nis, class_name: correctClassName });
          }
        }
      }
    });
    if (updates.length === 0) {
      showToast("Semua data kelas sudah sinkron dan sesuai.", "info");
      return;
    }
    setImportReview({ updates, isAutoDetect: true });
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const wb = new ExcelJS.Workbook();
        await wb.xlsx.load(evt.target.result);
        const data = [];
        wb.worksheets[0].eachRow({ includeEmpty: true }, (row) => {
          data.push(row.values.slice(1));
        });
        if (data.length === 0) {
          showToast("File Excel kosong.", "error");
          return;
        }
        const header = data[0].map(h => String(h).toLowerCase().trim());
        const nisIdx = header.findIndex(h => h.includes('nis') || h.includes('id') || h.includes('nomor'));
        const classIdx = header.findIndex(h => h.includes('kelas') || h.includes('class') || h.includes('rombel'));
        if (nisIdx === -1 || classIdx === -1) {
          showToast("Format Excel tidak sesuai. Pastikan terdapat kolom 'NIS' dan 'Kelas'.", "error");
          return;
        }
        const updates = [];
        for (let i = 1; i < data.length; i++) {
          const row = data[i];
          if (row[nisIdx] && row[classIdx]) {
            updates.push({ nis: String(row[nisIdx]).trim(), class_name: String(row[classIdx]).trim() });
          }
        }
        if (updates.length === 0) {
          showToast("Tidak ada baris data yang valid ditemukan.", "error");
          return;
        }
        setImportReview({ updates });
      } catch (err) {
        showToast("Gagal membaca file Excel.", "error");
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const executeBulkImport = async () => {
    if (!importReview) return;
    setIsBulkSaving(true);
    try {
      const res = await fetch('/api/hikvision/students/bulk', {
        method: 'PUT',
        headers: { "Authorization": `Bearer ${authToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ updates: importReview.updates })
      });
      const json = await res.json();
      if (json.ok) {
        showToast(`Berhasil mengimpor ${importReview.updates.length} pemetaan kelas!`, "success");
        setShowImportModal(false);
        setImportReview(null);
        fetchStudents();
      } else {
        showToast(json.error || "Gagal import data massal.", "error");
      }
    } catch (err) {
      showToast("Kesalahan jaringan saat menyimpan import.", "error");
    }
    setIsBulkSaving(false);
  };

  // Filtered List
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      // Group Filter
      if (groupFilter !== "all" && s.group_name !== groupFilter) return false;

      // Class Filter
      if (classFilter !== "all" && s.class_name !== classFilter) return false;

      // Status Filter
      if (statusFilter === "connected" && !(s.is_on_device && s.is_connected)) return false;
      if (statusFilter === "not_on_device" && s.is_on_device) return false;
      if (statusFilter === "not_in_master" && s.is_connected) return false;

      // Text Search
      if (search) {
        const query = search.toLowerCase().trim();
        const matchName = s.name?.toLowerCase().includes(query);
        const matchDeviceName = s.device_name?.toLowerCase().includes(query);
        const matchNis = s.nis?.toLowerCase().includes(query);
        const matchClass = s.class_name?.toLowerCase().includes(query);
        if (!matchName && !matchDeviceName && !matchNis && !matchClass) return false;
      }
      return true;
    });
  }, [students, groupFilter, classFilter, statusFilter, search]);

  const uniqueGroups = useMemo(() => {
    return [...new Set(students.map(s => s.group_name).filter(Boolean))].sort();
  }, [students]);

  const uniqueClasses = useMemo(() => {
    const fromClasses = (classes || []).map(c => c.name).filter(Boolean);
    const fromStudents = students.map(s => s.class_name).filter(c => c && c !== "siswa");
    return [...new Set([...fromClasses, ...fromStudents])].sort();
  }, [classes, students]);

  // KPI Counts
  const fullyConnectedCount = useMemo(() => students.filter(s => s.is_on_device && s.is_connected).length, [students]);
  const notOnDeviceCount = useMemo(() => students.filter(s => !s.is_on_device).length, [students]);
  const notInMasterCount = useMemo(() => students.filter(s => s.is_on_device && !s.is_connected).length, [students]);

  // Paginated Data
  const totalItems = filteredStudents.length;
  const paginatedStudents = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredStudents.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredStudents, currentPage, itemsPerPage]);

  const pageSelectedCount = paginatedStudents.filter(s => selectedNis.has(s.nis)).length;
  const isAllPageSelected = paginatedStudents.length > 0 && pageSelectedCount === paginatedStudents.length;

  const toggleSelectAllPage = () => {
    const nextSet = new Set(selectedNis);
    if (isAllPageSelected) {
      paginatedStudents.forEach(s => nextSet.delete(s.nis));
    } else {
      paginatedStudents.forEach(s => nextSet.add(s.nis));
    }
    setSelectedNis(nextSet);
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      
      {/* 1. KPI Cards Header */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        
        {/* Total Siswa */}
        <div className="ui-card p-3.5 sm:p-4 rounded-[var(--ui-radius-card)] bg-white border border-slate-200/80 shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-[var(--ui-radius-small)] bg-[var(--ui-primary)]/10 text-[var(--ui-primary)] flex items-center justify-center shrink-0">
            <Users size={20} strokeWidth={2.2} />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Siswa di Mesin</p>
            <p className="text-lg sm:text-xl font-black text-slate-800">{students.length}</p>
          </div>
        </div>

        {/* Terhubung & Sinkron */}
        <div className="ui-card p-3.5 sm:p-4 rounded-[var(--ui-radius-card)] bg-white border border-slate-200/80 shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-[var(--ui-radius-small)] bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 size={20} strokeWidth={2.2} />
          </div>
          <div>
            <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Terhubung (Mesin & Master)</p>
            <p className="text-lg sm:text-xl font-black text-emerald-700">{fullyConnectedCount}</p>
          </div>
        </div>

        {/* Belum Ada di Mesin */}
        <div className="ui-card p-3.5 sm:p-4 rounded-[var(--ui-radius-card)] bg-white border border-slate-200/80 shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-[var(--ui-radius-small)] bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
            <Wifi size={20} strokeWidth={2.2} />
          </div>
          <div>
            <p className="text-[11px] font-bold text-sky-600 uppercase tracking-wider">Belum Ada di Mesin</p>
            <p className="text-lg sm:text-xl font-black text-sky-700">{notOnDeviceCount}</p>
          </div>
        </div>

        {/* Belum Ada di Master */}
        <div className="ui-card p-3.5 sm:p-4 rounded-[var(--ui-radius-card)] bg-white border border-slate-200/80 shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-[var(--ui-radius-small)] bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <AlertCircle size={20} strokeWidth={2.2} />
          </div>
          <div>
            <p className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">Belum Ada di Master</p>
            <p className="text-lg sm:text-xl font-black text-amber-700">{notInMasterCount}</p>
          </div>
        </div>

      </div>

      {/* 2. Action Toolbar */}
      <div className="ui-card p-4 rounded-[var(--ui-radius-card)] bg-white border border-slate-200/80 shadow-xs flex flex-col gap-3.5">
        
        {/* Top Button Strip */}
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          
          <div className="flex flex-wrap items-center gap-2">
            {/* Sync from Machine */}
            <button
              type="button"
              onClick={handleSyncFromDevice}
              disabled={syncing}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-black text-white bg-[var(--ui-primary)] hover:opacity-90 rounded-[var(--ui-radius-small)] shadow-2xs transition-all active:scale-95 cursor-pointer disabled:opacity-50"
              title="Tarik data pengguna terbaru dari mesin fingerprint Hikvision"
            >
              <Wifi size={14} strokeWidth={2.5} className={syncing ? "animate-spin" : ""} />
              <span>{syncing ? "Menyinkronkan..." : "Sinkron dari Mesin"}</span>
            </button>

            {/* Smart Auto Sync Classes from Master */}
            <button
              type="button"
              onClick={handleSyncClassesFromMaster}
              disabled={syncingMaster}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/90 rounded-[var(--ui-radius-small)] shadow-2xs transition-all active:scale-95 cursor-pointer disabled:opacity-50"
              title="Otomatis petakan kelas seluruh siswa sesuai database Master Data Siswa"
            >
              <Database size={14} className={syncingMaster ? "animate-spin text-emerald-600" : "text-emerald-600"} />
              <span>{syncingMaster ? "Memetakan..." : "Sinkron Kelas dari Master"}</span>
            </button>

            {/* Auto Detect */}
            <button
              type="button"
              onClick={handleAutoDetect}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-[var(--ui-radius-small)] shadow-2xs transition-all active:scale-95 cursor-pointer"
              title="Deteksi kesesuaian grup alat atau nama dengan kelas master"
            >
              <Sparkles size={14} className="text-amber-500" />
              <span>Deteksi Otomatis</span>
            </button>

            {/* Import Excel */}
            <button
              type="button"
              onClick={() => setShowImportModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-[var(--ui-radius-small)] shadow-2xs transition-all active:scale-95 cursor-pointer"
              title="Unggah file Excel untuk memetakan NIS ke Kelas"
            >
              <Upload size={14} className="text-slate-500" />
              <span>Import Excel</span>
            </button>

            {/* Refresh */}
            <button
              type="button"
              onClick={fetchStudents}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-[var(--ui-radius-small)] shadow-2xs transition-all active:scale-95 cursor-pointer"
              title="Segarkan data tabel"
            >
              <RefreshCw size={13} className={loading ? "animate-spin text-slate-500" : "text-slate-500"} />
              <span>Refresh</span>
            </button>
          </div>

          <p className="text-[11px] font-medium text-slate-400 italic hidden xl:block">
            *Mencakup seluruh Siswa dari Master Data & Perangkat Mesin Absensi
          </p>
        </div>

        {/* Filter Controls Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2.5 pt-3 border-t border-slate-100">
          
          {/* Search Box */}
          <div className="relative lg:col-span-5">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
              className="w-full rounded-[var(--ui-radius-small)] bg-slate-50 border border-slate-200 pl-9 pr-8 py-2 text-xs sm:text-sm font-bold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-[var(--ui-primary)] shadow-2xs transition-all"
              placeholder="Cari nama, NIS, atau kelas siswa..."
            />
            {search && (
              <button
                type="button"
                onClick={() => { setSearch(""); setCurrentPage(1); }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-200 transition-colors"
                title="Hapus pencarian"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Group Filter */}
          <div className="lg:col-span-2">
            <UISelect
              value={groupFilter}
              onChange={(e) => { setGroupFilter(e.target.value); setCurrentPage(1); }}
              placeholder="Semua Grup Mesin"
            >
              <option value="all">Semua Grup Mesin</option>
              {uniqueGroups.map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
            </UISelect>
          </div>

          {/* Class Filter */}
          <div className="lg:col-span-2">
            <UISelect
              value={classFilter}
              onChange={(e) => { setClassFilter(e.target.value); setCurrentPage(1); }}
              placeholder="Semua Kelas"
            >
              <option value="all">Semua Kelas</option>
              {uniqueClasses.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </UISelect>
          </div>

          {/* Connection Status Filter */}
          <div className="lg:col-span-3">
            <UISelect
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              placeholder="Semua Status"
            >
              <option value="all">Semua Status</option>
              <option value="connected">Terhubung & Sinkron</option>
              <option value="not_on_device">Belum Ada di Mesin</option>
              <option value="not_in_master">Belum Ada di Master</option>
            </UISelect>
          </div>

        </div>

      </div>

      {/* 3. Bulk Action Bar (When rows selected) */}
      {selectedNis.size > 0 && (
        <div className="ui-card p-3 sm:p-4 rounded-[var(--ui-radius-small)] bg-[var(--ui-primary)]/10 border border-[var(--ui-primary)]/30 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2">
            <CheckSquare size={18} className="text-[var(--ui-primary)]" />
            <span className="text-xs sm:text-sm font-black text-[var(--ui-primary)]">
              {selectedNis.size} Siswa Terpilih
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <div className="w-48 sm:w-56">
              <UISelect
                value={bulkClass}
                onChange={(e) => setBulkClass(e.target.value)}
                placeholder="-- Pilih Kelas Masal --"
              >
                <option value="">-- Pilih Kelas --</option>
                {uniqueClasses.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </UISelect>
            </div>

            <button
              type="button"
              onClick={handleBulkApply}
              disabled={isBulkSaving || !bulkClass}
              className="px-3.5 py-2 text-xs font-black text-white bg-[var(--ui-primary)] hover:opacity-90 rounded-[var(--ui-radius-small)] shadow-2xs transition-all active:scale-95 cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
            >
              {isBulkSaving && <RefreshCw size={13} className="animate-spin" />}
              <span>Terapkan Kelas</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedNis(new Set())}
              className="px-3 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-[var(--ui-radius-small)] shadow-2xs transition-all cursor-pointer"
            >
              Batal
            </button>
          </div>
        </div>
      )}

      {/* 4. Data Table Container */}
      <div className="ui-card rounded-[var(--ui-radius-card)] bg-white border border-slate-200/80 shadow-xs overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200/90 text-slate-500 text-[11px] font-black uppercase tracking-wider select-none">
                <th className="px-4 py-3.5 w-12 text-center">
                  <input
                    type="checkbox"
                    checked={isAllPageSelected}
                    onChange={toggleSelectAllPage}
                    className="w-4 h-4 rounded-[var(--ui-radius-small)] text-[var(--ui-primary)] focus:ring-[var(--ui-primary)]/20 cursor-pointer"
                    title="Pilih semua di halaman ini"
                  />
                </th>
                <th className="px-3 py-3.5 w-14 font-black text-center">No</th>
                <th className="px-4 py-3.5 font-black">Nama Siswa & NIS</th>
                <th className="px-4 py-3.5 font-black">Grup Alat Mesin</th>
                <th className="px-4 py-3.5 font-black w-60">Pemetaan Kelas</th>
                <th className="px-4 py-3.5 font-black w-48">Status Koneksi</th>
              </tr>
            </thead>
            <tbody className="text-xs sm:text-sm font-medium text-slate-700 divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center text-slate-400 font-bold">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw size={24} className="animate-spin text-[var(--ui-primary)]" />
                      <span>Memuat data pengguna mesin...</span>
                    </div>
                  </td>
                </tr>
              ) : paginatedStudents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center text-slate-400 font-bold">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Users size={32} className="text-slate-300" />
                      <p className="text-slate-600 font-bold">Tidak ada data siswa ditemukan</p>
                      <p className="text-xs text-slate-400 font-normal">Coba sesuaikan kata kunci pencarian atau filter yang aktif.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedStudents.map((s, idx) => {
                  const rowNumber = (currentPage - 1) * itemsPerPage + idx + 1;
                  const isSelected = selectedNis.has(s.nis);
                  const isSaving = saving[s.nis];
                  const isFullyConnected = s.is_on_device && s.is_connected;
                  const isMissingOnDevice = !s.is_on_device;
                  const isMissingInMaster = s.is_on_device && !s.is_connected;
                  const hasNameDiff = s.device_name && s.device_name !== s.name;

                  return (
                    <tr
                      key={s.nis || s.id || idx}
                      className={`hover:bg-slate-50/70 transition-colors ${isSelected ? 'bg-[var(--ui-primary)]/5' : ''}`}
                    >
                      {/* Checkbox */}
                      <td className="px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {
                            const next = new Set(selectedNis);
                            if (next.has(s.nis)) next.delete(s.nis);
                            else next.add(s.nis);
                            setSelectedNis(next);
                          }}
                          className="w-4 h-4 rounded-[var(--ui-radius-small)] text-[var(--ui-primary)] focus:ring-[var(--ui-primary)]/20 cursor-pointer"
                        />
                      </td>

                      {/* No */}
                      <td className="px-3 py-3 font-bold text-slate-400 text-center text-xs">
                        {rowNumber}
                      </td>

                      {/* Nama Siswa & NIS */}
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="font-extrabold text-slate-800 line-clamp-1">
                            {s.name}
                          </span>

                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[11px] font-bold text-slate-500 font-mono">
                              NIS: {s.nis}
                            </span>
                            {s.master_class_name && (
                              <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50/80 px-1.5 py-0.2 rounded border border-indigo-100">
                                Master: {s.master_class_name}
                              </span>
                            )}
                          </div>

                          {/* Info perbedaan nama atau status device */}
                          {hasNameDiff && (
                            <span className="text-[11px] font-semibold text-amber-700 bg-amber-50/80 px-2 py-0.5 rounded-[var(--ui-radius-small)] border border-amber-200/70 w-fit mt-1">
                              Nama di Mesin: <b>{s.device_name}</b> (beda ejaan)
                            </span>
                          )}

                          {isMissingOnDevice && (
                            <span className="text-[10.5px] font-medium text-sky-700 mt-0.5">
                              *Ada di Master Data, belum didaftarkan di mesin fingerprint
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Grup Alat Mesin */}
                      <td className="px-4 py-3">
                        {s.is_on_device ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-[var(--ui-radius-small)] bg-slate-100 text-slate-700 border border-slate-200/70 text-[10px] font-bold uppercase tracking-wider whitespace-nowrap">
                            {s.group_name || "Tanpa Grup"}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic text-xs">
                            Belum Terdaftar
                          </span>
                        )}
                      </td>

                      {/* Pemetaan Kelas Dropdown */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 max-w-xs">
                          <div className="flex-1">
                            <UISelect
                              value={s.class_name || ""}
                              onChange={(e) => handleClassChange(s.nis, e.target.value)}
                              placeholder="-- Pilih Kelas --"
                            >
                              <option value="">-- Belum Dipetakan --</option>
                              {uniqueClasses.map(c => (
                                <option key={c} value={c}>{c}</option>
                              ))}
                            </UISelect>
                          </div>
                          {isSaving && (
                            <RefreshCw size={14} className="animate-spin text-[var(--ui-primary)] shrink-0" />
                          )}
                        </div>
                      </td>

                      {/* Status Koneksi */}
                      <td className="px-4 py-3">
                        {isFullyConnected && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[var(--ui-radius-small)] bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-black">
                            <CheckCircle2 size={13} className="text-emerald-600" />
                            <span>Terhubung</span>
                          </span>
                        )}

                        {isMissingOnDevice && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[var(--ui-radius-small)] bg-sky-50 text-sky-800 border border-sky-200 text-xs font-bold" title="Belum didaftarkan ke mesin fingerprint">
                            <Wifi size={13} className="text-sky-600" />
                            <span>Belum Ada di Mesin</span>
                          </span>
                        )}

                        {isMissingInMaster && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[var(--ui-radius-small)] bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold" title="Ada di mesin, belum dibuat akun di Master Data">
                            <AlertCircle size={13} className="text-amber-600" />
                            <span>Belum Ada di Master</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Universal Pagination */}
        <PaginationControls
          currentPage={currentPage}
          totalItems={totalItems}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={setItemsPerPage}
          pageSizeOptions={[20, 50, 100]}
        />
      </div>

      {/* 5. Import Modal */}
      {showImportModal && !importReview && (
        <Modal isOpen={true} onClose={() => setShowImportModal(false)}>
          <div className="p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
                <Upload size={18} className="text-emerald-600" />
                <span>Import Mapping Kelas Excel</span>
              </h3>
              <button 
                type="button" 
                onClick={() => setShowImportModal(false)}
                className="p-1 hover:bg-slate-100 rounded-[var(--ui-radius-small)] text-slate-400 hover:text-slate-700"
              >
                <X size={18} />
              </button>
            </div>
            
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              Unggah file Excel (<code>.xlsx</code>/<code>.xls</code>) yang berisi kolom <b>NIS</b> dan <b>Kelas</b> untuk memetakan kelas siswa secara masal.
            </p>

            <div className="flex justify-center">
              <input
                type="file"
                accept=".xlsx,.xls"
                ref={fileInputRef}
                onChange={handleFileUpload}
                className="hidden"
                id="excel-student-upload"
              />
              <label
                htmlFor="excel-student-upload"
                className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-emerald-300 rounded-[var(--ui-radius-small)] bg-emerald-50/50 cursor-pointer hover:bg-emerald-50 transition-colors"
              >
                <Upload size={28} className="text-emerald-600 mb-2" />
                <span className="text-xs sm:text-sm font-bold text-emerald-800">Klik untuk Pilih File Excel</span>
                <span className="text-[11px] text-emerald-600/80 mt-1">Format: NIS, Kelas</span>
              </label>
            </div>
          </div>
        </Modal>
      )}

      {/* Import / Auto Detect Review Modal */}
      {importReview && (
        <Modal isOpen={true} onClose={() => setImportReview(null)}>
          <div className="p-6 w-full max-w-md text-center">
            <h3 className="text-base font-black text-slate-800 mb-2">
              {importReview.isAutoDetect ? "Konfirmasi Deteksi Otomatis" : "Konfirmasi Import Excel"}
            </h3>
            
            <p className="text-xs text-slate-500 mb-5">
              Ditemukan data pemetaan kelas yang siap diterapkan:
            </p>

            <div className="bg-[var(--ui-primary)]/10 text-[var(--ui-primary)] p-5 rounded-[var(--ui-radius-small)] border border-[var(--ui-primary)]/20 mb-6 flex flex-col items-center justify-center">
              <p className="text-3xl font-black">{importReview.updates.length}</p>
              <p className="text-xs font-bold uppercase tracking-wider opacity-80 mt-1">Siswa Siap Dipetakan</p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={isBulkSaving}
                onClick={() => setImportReview(null)}
                className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-[var(--ui-radius-small)] text-xs font-bold transition-all cursor-pointer"
              >
                Batal
              </button>

              <button
                type="button"
                disabled={isBulkSaving}
                onClick={executeBulkImport}
                className="flex-1 px-4 py-2.5 bg-[var(--ui-primary)] hover:opacity-90 text-white rounded-[var(--ui-radius-small)] text-xs font-black shadow-xs transition-all cursor-pointer inline-flex items-center justify-center gap-2"
              >
                {isBulkSaving && <RefreshCw size={14} className="animate-spin" />}
                <span>Simpan Pemetaan</span>
              </button>
            </div>
          </div>
        </Modal>
      )}

    </div>
  );
}

// ── TAB GURU & KARYAWAN ────────────────────────────────────────────────────────
function TabStaff({ authToken, showToast, type = 'guru' }) {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // 'all' | 'connected' | 'not_on_device' | 'not_in_master'

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  const typeConfig = {
    guru: {
      label: 'Guru',
      singular: 'Guru',
      icon: UserCheck,
      color: 'text-emerald-600',
      badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      fieldHeader: 'Mata Pelajaran',
      placeholder: 'Cari nama, ID mesin, NIP, atau mata pelajaran...'
    },
    karyawan: {
      label: 'Karyawan',
      singular: 'Karyawan',
      icon: Briefcase,
      color: 'text-amber-600',
      badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
      fieldHeader: 'Divisi / Bagian',
      placeholder: 'Cari nama, ID mesin, NIP/NIK, atau divisi...'
    }
  };

  const cfg = typeConfig[type] || typeConfig.guru;
  const Icon = cfg.icon;

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/hikvision/students?type=${type}`, {
        headers: { "Authorization": `Bearer ${authToken}` }
      });
      const data = await res.json();
      if (data.ok) {
        setStaff(data.data || []);
      } else {
        showToast(data.error || `Gagal memuat data ${cfg.label.toLowerCase()}`, "error");
      }
    } catch (err) {
      showToast("Terjadi kesalahan jaringan.", "error");
    }
    setLoading(false);
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch('/api/hikvision/sync-all', {
        method: 'POST',
        headers: { "Authorization": `Bearer ${authToken}`, "Content-Type": "application/json" }
      });
      const data = await res.json();
      if (data.ok) {
        showToast(data.message || 'Sinkronisasi berhasil!', 'success');
        await fetchStaff();
      } else {
        showToast(data.error || 'Sinkronisasi gagal.', 'error');
      }
    } catch (err) {
      showToast('Kesalahan jaringan saat sinkronisasi.', 'error');
    }
    setSyncing(false);
  };

  useEffect(() => {
    fetchStaff();
    setCurrentPage(1);
  }, [type]);

  const filtered = useMemo(() => {
    return staff.filter(s => {
      // Filter status
      if (statusFilter === "connected" && !(s.is_on_device && s.is_connected)) return false;
      if (statusFilter === "not_on_device" && s.is_on_device) return false;
      if (statusFilter === "not_in_master" && s.is_connected) return false;

      if (search) {
        const q = search.toLowerCase().trim();
        const matchName = s.name?.toLowerCase().includes(q);
        const matchDeviceName = s.device_name?.toLowerCase().includes(q);
        const matchNis = s.nis?.toLowerCase().includes(q);
        const matchNip = s.nip?.toLowerCase().includes(q);
        const matchMapel = s.mapel?.toLowerCase().includes(q);
        if (!matchName && !matchDeviceName && !matchNis && !matchNip && !matchMapel) return false;
      }
      return true;
    });
  }, [staff, search, statusFilter]);

  const fullyConnectedCount = useMemo(() => staff.filter(s => s.is_on_device && s.is_connected).length, [staff]);
  const notOnDeviceCount = useMemo(() => staff.filter(s => !s.is_on_device).length, [staff]);
  const notInMasterCount = useMemo(() => staff.filter(s => s.is_on_device && !s.is_connected).length, [staff]);

  // Paginated Data
  const totalItems = filtered.length;
  const paginatedStaff = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filtered.slice(startIndex, startIndex + itemsPerPage);
  }, [filtered, currentPage, itemsPerPage]);

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      
      {/* 1. KPI Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        
        {/* Total */}
        <div className="ui-card p-3.5 sm:p-4 rounded-[var(--ui-radius-card)] bg-white border border-slate-200/80 shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-[var(--ui-radius-small)] bg-[var(--ui-primary)]/10 text-[var(--ui-primary)] flex items-center justify-center shrink-0">
            <Icon size={20} strokeWidth={2.2} />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total {cfg.label}</p>
            <p className="text-lg sm:text-xl font-black text-slate-800">{staff.length}</p>
          </div>
        </div>

        {/* Terhubung & Sinkron */}
        <div className="ui-card p-3.5 sm:p-4 rounded-[var(--ui-radius-card)] bg-white border border-slate-200/80 shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-[var(--ui-radius-small)] bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 size={20} strokeWidth={2.2} />
          </div>
          <div>
            <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Terhubung (Mesin & Master)</p>
            <p className="text-lg sm:text-xl font-black text-emerald-700">{fullyConnectedCount}</p>
          </div>
        </div>

        {/* Belum Ada di Mesin */}
        <div className="ui-card p-3.5 sm:p-4 rounded-[var(--ui-radius-card)] bg-white border border-slate-200/80 shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-[var(--ui-radius-small)] bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
            <Wifi size={20} strokeWidth={2.2} />
          </div>
          <div>
            <p className="text-[11px] font-bold text-sky-600 uppercase tracking-wider">Belum Ada di Mesin</p>
            <p className="text-lg sm:text-xl font-black text-sky-700">{notOnDeviceCount}</p>
          </div>
        </div>

        {/* Belum Ada di Master */}
        <div className="ui-card p-3.5 sm:p-4 rounded-[var(--ui-radius-card)] bg-white border border-slate-200/80 shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-[var(--ui-radius-small)] bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <AlertCircle size={20} strokeWidth={2.2} />
          </div>
          <div>
            <p className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">Belum Ada di Master</p>
            <p className="text-lg sm:text-xl font-black text-amber-700">{notInMasterCount}</p>
          </div>
        </div>

      </div>

      {/* 2. Toolbar */}
      <div className="ui-card p-4 rounded-[var(--ui-radius-card)] bg-white border border-slate-200/80 shadow-xs flex flex-col gap-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleSync}
              disabled={syncing}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-black text-white bg-[var(--ui-primary)] hover:opacity-90 rounded-[var(--ui-radius-small)] shadow-2xs transition-all active:scale-95 cursor-pointer disabled:opacity-50"
              title={`Tarik data ${cfg.label.toLowerCase()} dari mesin absensi`}
            >
              <Wifi size={14} strokeWidth={2.5} className={syncing ? "animate-spin" : ""} />
              <span>{syncing ? "Menyinkronkan..." : "Sinkron dari Mesin"}</span>
            </button>

            <button
              type="button"
              onClick={fetchStaff}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-[var(--ui-radius-small)] shadow-2xs transition-all active:scale-95 cursor-pointer"
            >
              <RefreshCw size={13} className={loading ? "animate-spin text-slate-500" : "text-slate-500"} />
              <span>Refresh</span>
            </button>
          </div>

          <p className="text-[11px] font-medium text-slate-400 italic hidden sm:block">
            *Mencakup seluruh {cfg.label} dari Master Data & Perangkat Mesin Absensi
          </p>
        </div>

        {/* Filter Controls Row */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 pt-3 border-t border-slate-100">
          
          {/* Search Box */}
          <div className="relative sm:col-span-8 lg:col-span-9">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
              className="w-full rounded-[var(--ui-radius-small)] bg-slate-50 border border-slate-200 pl-9 pr-8 py-2 text-xs sm:text-sm font-bold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-[var(--ui-primary)] shadow-2xs transition-all"
              placeholder={cfg.placeholder}
            />
            {search && (
              <button
                type="button"
                onClick={() => { setSearch(""); setCurrentPage(1); }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-200 transition-colors"
                title="Hapus pencarian"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Status Filter */}
          <div className="sm:col-span-4 lg:col-span-3">
            <UISelect
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              placeholder="Semua Status"
            >
              <option value="all">Semua Status</option>
              <option value="connected">Terhubung & Sinkron</option>
              <option value="not_on_device">Belum Ada di Mesin</option>
              <option value="not_in_master">Belum Ada di Master</option>
            </UISelect>
          </div>

        </div>
      </div>

      {/* 3. Table */}
      <div className="ui-card rounded-[var(--ui-radius-card)] bg-white border border-slate-200/80 shadow-xs overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200/90 text-slate-500 text-[11px] font-black uppercase tracking-wider select-none">
                <th className="px-4 py-3.5 w-14 font-black text-center">No</th>
                <th className="px-4 py-3.5 font-black">Nama Pengguna</th>
                <th className="px-4 py-3.5 font-black">ID Mesin / Kode</th>
                <th className="px-4 py-3.5 font-black">NIP / NIK</th>
                <th className="px-4 py-3.5 font-black">{cfg.fieldHeader}</th>
                <th className="px-4 py-3.5 font-black">Status Koneksi</th>
              </tr>
            </thead>
            <tbody className="text-xs sm:text-sm font-medium text-slate-700 divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center text-slate-400 font-bold">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw size={24} className="animate-spin text-[var(--ui-primary)]" />
                      <span>Memuat data {cfg.label.toLowerCase()}...</span>
                    </div>
                  </td>
                </tr>
              ) : paginatedStaff.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center text-slate-400 font-bold">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Icon size={32} className="text-slate-300" />
                      <p className="text-slate-600 font-bold">Tidak ada data {cfg.label.toLowerCase()} yang cocok</p>
                      <p className="text-xs text-slate-400 font-normal">Coba sesuaikan pencarian atau filter status yang dipilih.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedStaff.map((s, idx) => {
                  const rowNumber = (currentPage - 1) * itemsPerPage + idx + 1;
                  const isFullyConnected = s.is_on_device && s.is_connected;
                  const isMissingOnDevice = !s.is_on_device;
                  const isMissingInMaster = s.is_on_device && !s.is_connected;
                  const hasNameDiff = s.device_name && s.device_name !== s.name;

                  return (
                    <tr
                      key={s.nis || idx}
                      className="hover:bg-slate-50/70 transition-colors"
                    >
                      {/* No */}
                      <td className="px-4 py-3 font-bold text-slate-400 text-center text-xs">
                        {rowNumber}
                      </td>

                      {/* Nama Pengguna */}
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="font-extrabold text-slate-800">
                            {s.name}
                          </span>

                          {/* Info perbedaan nama atau status device */}
                          {hasNameDiff && (
                            <span className="text-[11px] font-semibold text-amber-700 bg-amber-50/80 px-2 py-0.5 rounded-[var(--ui-radius-small)] border border-amber-200/70 w-fit mt-1">
                              Nama di Mesin: <b>{s.device_name}</b> (beda ejaan)
                            </span>
                          )}

                          {isMissingOnDevice && (
                            <span className="text-[10.5px] font-medium text-sky-700 mt-0.5">
                              *Ada di Master Data, belum didaftarkan di mesin fingerprint
                            </span>
                          )}
                        </div>
                      </td>

                      {/* ID Mesin / Kode */}
                      <td className="px-4 py-3 font-mono text-xs font-bold text-slate-700">
                        {s.nis || "-"}
                      </td>

                      {/* NIP / NIK */}
                      <td className="px-4 py-3 text-xs font-mono text-slate-600">
                        {s.nip && s.nip !== '-' ? (
                          <span>{s.nip}</span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      {/* Mapel / Divisi */}
                      <td className="px-4 py-3 font-semibold text-slate-700 text-xs">
                        {s.mapel || <span className="text-slate-400 font-normal">-</span>}
                      </td>

                      {/* Status Koneksi */}
                      <td className="px-4 py-3">
                        {isFullyConnected && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[var(--ui-radius-small)] bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-black">
                            <CheckCircle2 size={13} className="text-emerald-600" />
                            <span>Terhubung</span>
                          </span>
                        )}

                        {isMissingOnDevice && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[var(--ui-radius-small)] bg-sky-50 text-sky-800 border border-sky-200 text-xs font-bold" title="Belum didaftarkan ke mesin fingerprint">
                            <Wifi size={13} className="text-sky-600" />
                            <span>Belum Ada di Mesin</span>
                          </span>
                        )}

                        {isMissingInMaster && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[var(--ui-radius-small)] bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold" title="Ada di mesin, belum dibuat akun di Master Data">
                            <AlertCircle size={13} className="text-amber-600" />
                            <span>Belum Ada di Master</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Universal Pagination */}
        <PaginationControls
          currentPage={currentPage}
          totalItems={totalItems}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={setItemsPerPage}
          pageSizeOptions={[20, 50, 100]}
        />
      </div>

    </div>
  );
}

// ── MAIN COMPONENT ────────────────────────────────────────────────────────────
const TABS = [
  { id: 'siswa', label: 'Siswa', icon: GraduationCap },
  { id: 'guru', label: 'Guru', icon: UserCheck },
  { id: 'karyawan', label: 'Karyawan', icon: Briefcase },
];

export default function HikvisionStudents({ classes = [] }) {
  const [activeTab, setActiveTab] = useState('siswa');
  const [toast, setToast] = useState({ message: "", type: "info" });
  const authToken = useAuthStore(state => state.user?.authToken);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
  };

  return (
    <div className="space-y-5 animate-fade-in relative flex flex-col h-full pb-16 sm:pb-8">
      {/* Header with Navigation Tabs */}
      <PageHeader 
        title="Data Pengguna Mesin Absensi"
        icon={Fingerprint}
        description="Kelola dan pantau data sinkronisasi pengguna mesin absensi Hikvision dengan Master Data (Siswa, Guru, dan Karyawan)."
        tabs={TABS}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onBack={() => typeof window !== 'undefined' && window.__setActiveTab ? window.__setActiveTab('dashboard') : null}
      />

      {/* Tab Content Panels */}
      <div className="flex-1 min-h-0">
        {activeTab === 'siswa' && (
          <TabSiswa classes={classes} authToken={authToken} showToast={showToast} />
        )}
        {activeTab === 'guru' && (
          <TabStaff authToken={authToken} showToast={showToast} type="guru" />
        )}
        {activeTab === 'karyawan' && (
          <TabStaff authToken={authToken} showToast={showToast} type="karyawan" />
        )}
      </div>

      {/* Toast Notification */}
      {toast.message && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={() => setToast({ message: "", type: "info" })} 
        />
      )}
    </div>
  );
}
