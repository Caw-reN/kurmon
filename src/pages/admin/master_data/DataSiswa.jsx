import { Button, TablePagination } from '../../../components/ui.jsx';
import { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, CheckCircle2, XCircle, Search, Settings, Save, Upload, Download, 
  ChevronRight, X, AlertCircle, Building2, UserCheck, Filter, RefreshCw, ArrowUpDown
} from 'lucide-react';
import * as XLSX from 'xlsx';
import useAuthStore from '../../../store/monitoring/authStore';
import { getDatabaseSnapshot, setDatabaseSnapshot } from '../../../utils/dataSource';
import { PageHeader, StatCard, Avatar } from '../../../components/monitoring/ui/index.js';

/**
 * ClickPicker component for dropdown select with search
 */
const ClickPicker = ({ value, onChange, options, placeholder = "Pilih..." }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const filteredOptions = options.filter(opt => 
    opt.label.toLowerCase().includes(search.toLowerCase())
  );

  const selectedOpt = options.find(o => String(o.value) === String(value));

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => { setIsOpen(!isOpen); setSearch(''); }}
        className="w-full text-left flex justify-between items-center px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--ui-primary)]/20"
      >
        <span className={selectedOpt ? "text-slate-800 font-bold" : "text-slate-400"}>
          {selectedOpt ? selectedOpt.label : placeholder}
        </span>
        <span className="text-slate-400 text-xs">▼</span>
      </button>

      {isOpen && (
        <div className="absolute z-[60] mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-xl max-h-60 overflow-hidden flex flex-col animate-in fade-in-50 zoom-in-95">
          <div className="p-2 border-b border-slate-100 bg-slate-50 shrink-0">
            <input
              type="text"
              autoFocus
              placeholder="Cari..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-[var(--ui-primary)]"
            />
          </div>
          <div className="overflow-y-auto flex-1 py-1 custom-scrollbar">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-2 text-xs text-slate-400 text-center font-medium">Tidak ditemukan</div>
            ) : (
              filteredOptions.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left flex items-center justify-between px-3 py-2 text-xs font-semibold transition-colors cursor-pointer border-none ${
                    String(opt.value) === String(value)
                      ? 'bg-[var(--ui-primary)]/10 text-[var(--ui-primary)] font-bold'
                      : 'text-slate-700 bg-transparent hover:bg-slate-50'
                  }`}
                >
                  <span>{opt.label}</span>
                  {String(opt.value) === String(value) && (
                    <span className="w-2 h-2 rounded-full bg-[var(--ui-primary)]"></span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const DataSiswa = ({ students = [], teachers = [], appSettings, setAppSettings, onSave, setActiveTab }) => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('Semua'); // 'Semua' | 'Sudah PKL' | 'Belum PKL'
  const [filterJurusan, setFilterJurusan] = useState('Semua');
  const [filterKelas, setFilterKelas] = useState('Semua');
  const [sortBy, setSortBy] = useState('kelas_nis'); // 'kelas_nis' | 'nama_asc' | 'nama_desc' | 'nis_asc' | 'status_belum' | 'status_sudah'
  
  const [selectedSiswa, setSelectedSiswa] = useState(null);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);

  const [eligibleClass, setEligibleClass] = useState("XII");

  const authToken = useAuthStore(state => state.user?.authToken);
  
  const [perusahaanPKL, setPerusahaanPKL] = useState([]);
  const [pklStudentsMapping, setPklStudentsMapping] = useState([]);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    fetch("/api/monitoring/lokasi-pkl/public")
      .then(res => res.json())
      .then(data => { if (data.ok) setPerusahaanPKL(data.data); })
      .catch(console.error);
      
    const localSnapshot = getDatabaseSnapshot() || {};
    const localSettings = localSnapshot.appSettings || {};
    setEligibleClass(localSettings.eligibleClass || "XII");
        
    if (authToken) {
      fetch("/api/monitoring/pkl-students", { headers: { "Authorization": `Bearer ${authToken}` } })
        .then(res => res.json())
        .then(data => { if (data.ok) setPklStudentsMapping(data.data); })
        .catch(console.error);
    }
  }, [authToken]);

  const saveSettings = async () => {
    setIsSavingSettings(true);
    try {
      const localSnapshot = getDatabaseSnapshot() || {};
      const newSettings = { ...(localSnapshot.appSettings || {}), eligibleClass };
      const updatedSnapshot = { ...localSnapshot, appSettings: newSettings };
      
      setDatabaseSnapshot(updatedSnapshot);
      if (setAppSettings) setAppSettings(newSettings);
      if (onSave) await onSave(updatedSnapshot);
      showToast(`Pengaturan tingkat PKL (${eligibleClass}) berhasil disimpan!`);
    } catch (e) {
      showToast("Gagal menyimpan pengaturan", "error");
    }
    setIsSavingSettings(false);
  };

  const handleImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(sheet);
        if (json && json.length > 0) {
          showToast(`Berhasil membaca ${json.length} data siswa dari file.`, 'success');
        } else {
          showToast('File Excel kosong atau format tidak sesuai.', 'error');
        }
      } catch (err) {
        showToast('Gagal membaca file Excel.', 'error');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Parse student data cleanly
  const pklStudents = useMemo(() => {
    return students.filter(s => s.class_name && s.class_name.toUpperCase().startsWith(eligibleClass.toUpperCase()))
      .map(s => {
        const mapping = pklStudentsMapping.find(m => String(m.nis) === String(s.nis)) || {};
        
        // Extract Jurusan code from class_name e.g. "XII TKJ 3" -> "TKJ", "XII TKR 1" -> "TKR"
        const nameParts = (s.class_name || '').trim().split(/\s+/);
        let jCode = 'Umum';
        if (nameParts.length >= 2) {
          jCode = nameParts[1];
        } else if (s.jurusan) {
          jCode = s.jurusan;
        }

        return {
          id: s.nis,
          nis: String(s.nis || '').trim(),
          nama: String(s.name || '').trim(),
          kelas: String(s.class_name || '').trim(),
          jurusan: jCode,
          perusahaanId: mapping.location_id,
          guruPembimbingCode: mapping.teacher_code,
          statusPKL: mapping.location_id ? 'Sudah PKL' : 'Belum PKL',
          lamaPKL: mapping.location_id ? '6 Bulan' : '-'
        };
      });
  }, [students, eligibleClass, pklStudentsMapping]);

  // Sort Jurusan Options Alphabetically
  const jurusanOptions = useMemo(() => {
    const unique = Array.from(new Set(pklStudents.map(s => s.jurusan))).filter(Boolean);
    unique.sort((a, b) => a.localeCompare(b));
    return ['Semua', ...unique];
  }, [pklStudents]);

  // Sort Kelas Options Naturally (e.g. XII AK 1, XII AK 2, XII TKJ 1, XII TKJ 2...)
  const kelasOptions = useMemo(() => {
    const unique = Array.from(new Set(pklStudents.map(s => s.kelas))).filter(Boolean);
    unique.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
    return ['Semua', ...unique];
  }, [pklStudents]);

  // Filter & Sort Students array
  const filtered = useMemo(() => {
    const result = pklStudents.filter((s) => {
      const matchSearch =
        s.nama.toLowerCase().includes(search.toLowerCase()) ||
        s.nis.toLowerCase().includes(search.toLowerCase()) ||
        s.kelas.toLowerCase().includes(search.toLowerCase());
      const matchStatus = filterStatus === 'Semua' || s.statusPKL === filterStatus;
      const matchJurusan = filterJurusan === 'Semua' || s.jurusan === filterJurusan;
      const matchKelas = filterKelas === 'Semua' || s.kelas === filterKelas;
      return matchSearch && matchStatus && matchJurusan && matchKelas;
    });

    // Apply Sorting
    result.sort((a, b) => {
      if (sortBy === 'kelas_nis') {
        const classComp = a.kelas.localeCompare(b.kelas, undefined, { numeric: true, sensitivity: 'base' });
        if (classComp !== 0) return classComp;
        const nisComp = a.nis.localeCompare(b.nis, undefined, { numeric: true });
        if (nisComp !== 0) return nisComp;
        return a.nama.localeCompare(b.nama);
      }
      if (sortBy === 'nama_asc') {
        return a.nama.localeCompare(b.nama);
      }
      if (sortBy === 'nama_desc') {
        return b.nama.localeCompare(a.nama);
      }
      if (sortBy === 'nis_asc') {
        return a.nis.localeCompare(b.nis, undefined, { numeric: true });
      }
      if (sortBy === 'status_belum') {
        if (a.statusPKL === b.statusPKL) return a.kelas.localeCompare(b.kelas, undefined, { numeric: true, sensitivity: 'base' });
        return a.statusPKL === 'Belum PKL' ? -1 : 1;
      }
      if (sortBy === 'status_sudah') {
        if (a.statusPKL === b.statusPKL) return a.kelas.localeCompare(b.kelas, undefined, { numeric: true, sensitivity: 'base' });
        return a.statusPKL === 'Sudah PKL' ? -1 : 1;
      }
      return 0;
    });

    return result;
  }, [pklStudents, search, filterStatus, filterJurusan, filterKelas, sortBy]);

  const paginatedData = useMemo(() => filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage), [filtered, currentPage, itemsPerPage]);
  const totalPages = Math.ceil(filtered.length / itemsPerPage);

  const totalCount = pklStudents.length;
  const sudahPklCount = pklStudents.filter(s => s.statusPKL === 'Sudah PKL').length;
  const belumPklCount = pklStudents.filter(s => s.statusPKL === 'Belum PKL').length;

  const handleExport = () => {
    const exportData = filtered.map(s => {
      const guru = teachers.find(g => String(g.code) === String(s.guruPembimbingCode));
      const perusahaan = perusahaanPKL.find(p => String(p.id) === String(s.perusahaanId));
      return {
        NIS: s.nis,
        Nama: s.nama,
        Kelas: s.kelas,
        Jurusan: s.jurusan,
        "Perusahaan PKL": perusahaan?.nama_perusahaan || "Belum Ditempatkan",
        "Guru Pembimbing": guru?.name || "Belum Ditugaskan",
        "Status PKL": s.statusPKL,
        "Lama PKL": s.lamaPKL
      };
    });
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Siswa PKL");
    XLSX.writeFile(wb, `Data_Siswa_PKL_${eligibleClass}.xlsx`);
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-300 pb-10">
      {/* Top Banner Header */}
      <PageHeader
        icon={Users}
        title="Data Siswa PKL"
        description={`${pklStudents.length} siswa kelas ${eligibleClass} sinkron otomatis dari Master Data`}
      >
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Tingkat PKL selector */}
          <div className="bg-white/10 backdrop-blur-md border border-white/25 px-3 py-1.5 rounded-xl flex items-center justify-between gap-2 shadow-sm">
            <div className="flex items-center gap-2">
              <Settings size={14} className="text-white shrink-0"/>
              <span className="text-[10px] font-black text-white uppercase tracking-wider">Tingkat:</span>
              <div className="flex bg-black/20 p-0.5 rounded-lg">
                {["X", "XI", "XII"].map(lvl => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => { setEligibleClass(lvl); setCurrentPage(1); }}
                    className={`px-2.5 py-1 rounded-md text-xs font-black transition-all cursor-pointer border-none ${
                      eligibleClass === lvl 
                        ? 'bg-white text-[var(--ui-primary)] shadow-sm scale-105' 
                        : 'bg-transparent text-white/80 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>
            <button 
              onClick={saveSettings} 
              disabled={isSavingSettings} 
              className="cursor-pointer bg-white/20 hover:bg-white/30 text-white border-none p-1.5 rounded-lg transition-all active:scale-95 flex items-center gap-1 text-[11px] font-bold" 
              title="Simpan Pengaturan Tingkat"
            >
              <Save size={13} />
              <span className="hidden sm:inline">Simpan</span>
            </button>
          </div>
          
          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button 
              onClick={() => {
                const f = document.createElement('input'); f.type = 'file'; f.accept = '.xlsx,.xls'; f.onchange = handleImport; f.click();
              }} 
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 border-none h-9 px-3.5 rounded-xl text-[var(--ui-primary)] bg-white font-black text-xs shadow-sm hover:bg-slate-50 cursor-pointer active:scale-95 transition-all"
            >
              <Upload size={14} strokeWidth={2.5} /> Impor
            </button>
            <button 
              onClick={handleExport} 
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 border-none h-9 px-3.5 rounded-xl text-[var(--ui-primary)] bg-white font-black text-xs shadow-sm hover:bg-slate-50 cursor-pointer active:scale-95 transition-all"
            >
              <Download size={14} strokeWidth={2.5} /> Ekspor
            </button>
          </div>
        </div>
      </PageHeader>

      {/* Interactive Quick Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div 
          onClick={() => { setFilterStatus('Semua'); setCurrentPage(1); }}
          className={`ui-card p-4 flex items-center gap-4 cursor-pointer transition-all hover:scale-[1.01] ${
            filterStatus === 'Semua' ? 'ring-2 ring-[var(--ui-primary)] shadow-md bg-slate-50/50' : 'hover:border-slate-300'
          }`}
        >
          <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
            <Users size={22} />
          </div>
          <div>
            <p className="text-[11px] font-extrabold uppercase text-slate-400 tracking-wider">TOTAL SISWA PKL</p>
            <h3 className="text-2xl font-black text-slate-800 mt-0.5">{totalCount}</h3>
          </div>
        </div>

        <div 
          onClick={() => { setFilterStatus('Sudah PKL'); setCurrentPage(1); }}
          className={`ui-card p-4 flex items-center gap-4 cursor-pointer transition-all hover:scale-[1.01] ${
            filterStatus === 'Sudah PKL' ? 'ring-2 ring-emerald-500 shadow-md bg-emerald-50/30' : 'hover:border-emerald-200'
          }`}
        >
          <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 size={22} />
          </div>
          <div>
            <p className="text-[11px] font-extrabold uppercase text-emerald-600 tracking-wider">SUDAH PKL</p>
            <h3 className="text-2xl font-black text-emerald-700 mt-0.5">{sudahPklCount}</h3>
          </div>
        </div>

        <div 
          onClick={() => { setFilterStatus('Belum PKL'); setCurrentPage(1); }}
          className={`ui-card p-4 flex items-center gap-4 cursor-pointer transition-all hover:scale-[1.01] ${
            filterStatus === 'Belum PKL' ? 'ring-2 ring-red-500 shadow-md bg-red-50/30' : 'hover:border-red-200'
          }`}
        >
          <div className="w-12 h-12 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
            <XCircle size={22} />
          </div>
          <div>
            <p className="text-[11px] font-extrabold uppercase text-red-600 tracking-wider">BELUM PKL</p>
            <h3 className="text-2xl font-black text-red-700 mt-0.5">{belumPklCount}</h3>
          </div>
        </div>
      </div>

      {/* Main Filter & Search Control Panel */}
      <div className="ui-card p-4 space-y-4">
        {/* Search Bar + Mobile Filter Toggle */}
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative w-full md:flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
              placeholder="Cari nama siswa, NIS, atau kelas..."
              className="w-full pl-10 pr-10 py-2.5 bg-slate-50 hover:bg-slate-100/50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[var(--ui-primary)]/20 transition-all"
            />
            {search && (
              <button 
                onClick={() => setSearch('')} 
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 border-none bg-transparent cursor-pointer"
              >
                <X size={15} />
              </button>
            )}
          </div>

          {/* Status Pill Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-full md:w-auto shrink-0 overflow-x-auto">
            {['Semua', 'Sudah PKL', 'Belum PKL'].map(st => (
              <button
                key={st}
                type="button"
                onClick={() => { setFilterStatus(st); setCurrentPage(1); }}
                className={`flex-1 md:flex-none px-3.5 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer border-none whitespace-nowrap ${
                  filterStatus === st 
                    ? 'bg-white text-slate-800 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-800 bg-transparent'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          {/* Mobile Filter Toggle Button */}
          <button
            type="button"
            onClick={() => setShowMobileFilters(!showMobileFilters)}
            className="md:hidden w-full flex items-center justify-center gap-2 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all border-none cursor-pointer"
          >
            <Filter size={14} />
            <span>Filter & Sortir ({filterKelas !== 'Semua' || filterJurusan !== 'Semua' || sortBy !== 'kelas_nis' ? 'Aktif' : 'Semua'})</span>
          </button>
        </div>

        {/* Dropdown Filters for Kelas, Jurusan, and SortBy (Desktop always, Mobile collapsible) */}
        <div className={`grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-100 ${showMobileFilters ? 'block' : 'hidden md:grid'}`}>
          <div>
            <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1.5 block">Filter Kelas:</label>
            <select
              value={filterKelas}
              onChange={e => { setFilterKelas(e.target.value); setCurrentPage(1); }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[var(--ui-primary)]/20 cursor-pointer"
            >
              {kelasOptions.map(k => (
                <option key={k} value={k}>
                  {k === 'Semua' ? 'Semua Kelas' : `Kelas ${k}`}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1.5 block">Filter Jurusan:</label>
            <select
              value={filterJurusan}
              onChange={e => { setFilterJurusan(e.target.value); setCurrentPage(1); }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[var(--ui-primary)]/20 cursor-pointer"
            >
              {jurusanOptions.map(j => (
                <option key={j} value={j}>
                  {j === 'Semua' ? 'Semua Jurusan' : `Jurusan ${j}`}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1.5 block flex items-center gap-1">
              <ArrowUpDown size={12} className="text-slate-400" /> Sortir & Urutan:
            </label>
            <select
              value={sortBy}
              onChange={e => { setSortBy(e.target.value); setCurrentPage(1); }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[var(--ui-primary)]/20 cursor-pointer"
            >
              <option value="kelas_nis">Per Kelas & NIS (Standar Sekolah)</option>
              <option value="nama_asc">Nama Siswa (A - Z)</option>
              <option value="nama_desc">Nama Siswa (Z - A)</option>
              <option value="nis_asc">Nomor NIS (Kecil - Besar)</option>
              <option value="status_belum">Status: Belum PKL Dahulu</option>
              <option value="status_sudah">Status: Sudah PKL Dahulu</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Table / List Card View */}
      <div className="ui-card overflow-hidden shadow-sm">
        {/* DESKTOP TABLE VIEW */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 text-[11px] font-extrabold uppercase tracking-wider">
                <th 
                  onClick={() => setSortBy(sortBy === 'nama_asc' ? 'nama_desc' : 'nama_asc')}
                  className="px-4 py-3 cursor-pointer hover:bg-slate-100/60 transition-colors select-none group"
                  title="Klik untuk sortir Nama (A-Z / Z-A)"
                >
                  <div className="flex items-center gap-1">
                    <span>SISWA</span>
                    <ArrowUpDown size={12} className="text-slate-400 group-hover:text-slate-700" />
                  </div>
                </th>
                <th className="px-4 py-3">JURUSAN</th>
                <th className="px-4 py-3">PERUSAHAAN PKL</th>
                <th className="px-4 py-3">GURU PEMBIMBING</th>
                <th 
                  onClick={() => setSortBy(sortBy === 'status_belum' ? 'status_sudah' : 'status_belum')}
                  className="px-4 py-3 text-center cursor-pointer hover:bg-slate-100/60 transition-colors select-none group"
                  title="Klik untuk sortir Status PKL"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>STATUS</span>
                    <ArrowUpDown size={12} className="text-slate-400 group-hover:text-slate-700" />
                  </div>
                </th>
                <th className="px-4 py-3 text-right">AKSI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedData.map(s => {
                const guru = teachers.find(g => String(g.code) === String(s.guruPembimbingCode));
                const perusahaan = perusahaanPKL.find(p => String(p.id) === String(s.perusahaanId));
                
                return (
                  <tr key={s.id} className="hover:bg-slate-50/80 transition-colors border-b border-slate-50 last:border-0">
                    {/* Siswa info */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={s.nama} size="sm" />
                        <div>
                          <p className="font-bold text-slate-800 text-xs">{s.nama}</p>
                          <p className="text-[11px] font-semibold text-slate-400 mt-0.5">NIS: {s.nis} • <span className="text-slate-600 font-bold">{s.kelas}</span></p>
                        </div>
                      </div>
                    </td>

                    {/* Jurusan */}
                    <td className="px-4 py-3">
                      <span className="inline-block px-2.5 py-1 text-[10px] font-black rounded-lg bg-purple-50 text-purple-700 border border-purple-200 uppercase">
                        {s.jurusan}
                      </span>
                    </td>

                    {/* Perusahaan */}
                    <td className="px-4 py-3">
                      {perusahaan ? (
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                          <Building2 size={14} className="text-blue-500 shrink-0" />
                          <span className="truncate max-w-[200px]">{perusahaan.nama_perusahaan}</span>
                        </div>
                      ) : (
                        <span className="text-xs font-semibold text-slate-400 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-300 inline-block"></span> Belum Ditempatkan
                        </span>
                      )}
                    </td>

                    {/* Guru Pembimbing */}
                    <td className="px-4 py-3">
                      {guru ? (
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                          <UserCheck size={14} className="text-emerald-500 shrink-0" />
                          <span className="truncate max-w-[160px]">{guru.name}</span>
                        </div>
                      ) : (
                        <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200/60 inline-block">
                          Belum ditugaskan
                        </span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-block px-2.5 py-1 text-[10px] font-black rounded-lg border ${
                        s.statusPKL === 'Sudah PKL' 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                          : 'bg-red-50 text-red-700 border-red-200'
                      }`}>
                        {s.statusPKL}
                      </span>
                    </td>

                    {/* Aksi */}
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setSelectedSiswa(s)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-[var(--ui-primary)] text-slate-700 hover:text-white font-bold text-xs rounded-lg transition-all border-none cursor-pointer active:scale-95"
                      >
                        <span>Penugasan</span>
                        <ChevronRight size={13} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* MOBILE CARD VIEW */}
        <div className="block md:hidden divide-y divide-slate-100">
          {paginatedData.map(s => {
            const guru = teachers.find(g => String(g.code) === String(s.guruPembimbingCode));
            const perusahaan = perusahaanPKL.find(p => String(p.id) === String(s.perusahaanId));

            return (
              <div key={s.id} className="p-4 space-y-3 hover:bg-slate-50/50 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Avatar name={s.nama} size="md" />
                    <div>
                      <h4 className="font-extrabold text-slate-800 text-sm leading-snug">{s.nama}</h4>
                      <p className="text-xs font-semibold text-slate-400 mt-0.5">NIS: {s.nis} • <span className="text-slate-700 font-bold">{s.kelas}</span></p>
                    </div>
                  </div>
                  <span className={`inline-block px-2 py-0.5 text-[9.5px] font-black rounded-md border shrink-0 ${
                    s.statusPKL === 'Sudah PKL' 
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                      : 'bg-red-50 text-red-700 border-red-200'
                  }`}>
                    {s.statusPKL}
                  </span>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-xl space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-medium">Perusahaan:</span>
                    <span className="font-bold text-slate-800 truncate max-w-[180px]">
                      {perusahaan?.nama_perusahaan || <span className="text-slate-400 font-normal">Belum Ditempatkan</span>}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-medium">Guru Pembimbing:</span>
                    <span className="font-bold text-slate-800 truncate max-w-[180px]">
                      {guru?.name || <span className="text-amber-600 font-normal">Belum Ditugaskan</span>}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedSiswa(s)}
                  className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-slate-100 hover:bg-[var(--ui-primary)] text-slate-700 hover:text-white font-bold text-xs rounded-xl transition-all border-none cursor-pointer active:scale-95"
                >
                  <span>Atur Penugasan PKL</span>
                  <ChevronRight size={14} />
                </button>
              </div>
            );
          })}
        </div>

        {/* Empty State */}
        {filtered.length === 0 && (
          <div className="py-16 text-center text-slate-400 space-y-3">
            <Users size={36} className="mx-auto text-slate-300" />
            <p className="font-bold text-sm text-slate-600">Tidak ada data siswa PKL ditemukan</p>
            <p className="text-xs text-slate-400">Coba ubah kata kunci pencarian atau reset filter kelas/jurusan.</p>
          </div>
        )}

        {/* Table Pagination */}
        <TablePagination 
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filtered.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={(val) => { setItemsPerPage(val); setCurrentPage(1); }}
        />
      </div>

      {/* Slide-over Detail & Assignment Drawer Modal */}
      {selectedSiswa && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div 
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
            onClick={() => setSelectedSiswa(null)} 
          />
          <div className="relative bg-[#f8fafc] w-full max-w-md h-full overflow-y-auto shadow-2xl z-10 p-5 flex flex-col space-y-4 animate-in slide-in-from-right-full duration-300">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 shrink-0">
              <div>
                <h2 className="font-extrabold text-slate-800 text-base">Detail Penugasan PKL</h2>
                <p className="text-xs text-slate-400 font-medium mt-0.5">Kelola lokasi perusahaan & guru pembimbing</p>
              </div>
              <button 
                onClick={() => setSelectedSiswa(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center border-none cursor-pointer transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Profile Header Card */}
            <div className="ui-card p-5 flex flex-col items-center text-center">
              <Avatar name={selectedSiswa.nama} size="xl" className="mb-3 shadow-md" />
              <h3 className="font-black text-lg text-slate-800 tracking-tight">{selectedSiswa.nama}</h3>
              <p className="text-xs font-semibold text-slate-400 mt-0.5">NIS: {selectedSiswa.nis} • Kelas: {selectedSiswa.kelas}</p>
              <span className="mt-3 px-3 py-1 text-xs font-black rounded-lg bg-purple-100 text-purple-700 border border-purple-200">
                Jurusan {selectedSiswa.jurusan}
              </span>
            </div>

            {/* Current Summary */}
            <div className="ui-card p-4 space-y-2.5">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2">Informasi Status</h4>
              {[
                { label: 'Status PKL', value: selectedSiswa.statusPKL },
                { label: 'Lama PKL', value: selectedSiswa.lamaPKL },
                { label: 'Perusahaan Terpilih', value: perusahaanPKL.find(p => String(p.id) === String(selectedSiswa.perusahaanId))?.nama_perusahaan || 'Belum Ditempatkan' },
                { label: 'Guru Pembimbing', value: teachers.find(g => String(g.code) === String(selectedSiswa.guruPembimbingCode))?.name || 'Belum ditugaskan' },
              ].map(info => (
                <div key={info.label} className="flex justify-between items-start gap-4 py-1 border-b border-slate-50 last:border-0">
                  <span className="text-xs font-semibold text-slate-400">{info.label}</span>
                  <span className="text-xs font-bold text-slate-800 text-right">{info.value}</span>
                </div>
              ))}
            </div>

            {/* Assignment Edit Form */}
            <div className="ui-card p-4 space-y-4">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Settings size={14} className="text-slate-400"/> Update Lokasi & Guru Pembimbing
              </h4>
              
              <div className="space-y-3.5">
                <div>
                  <label className="text-xs text-slate-600 font-bold mb-1.5 block">Lokasi Perusahaan PKL</label>
                  <ClickPicker 
                    value={selectedSiswa.perusahaanId || ""}
                    onChange={(val) => setSelectedSiswa({ ...selectedSiswa, perusahaanId: val })}
                    placeholder="Pilih Perusahaan PKL"
                    options={[
                      { value: "", label: "-- Tanpa Perusahaan --" },
                      ...perusahaanPKL.map(p => ({ value: p.id, label: p.nama_perusahaan }))
                    ]}
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-600 font-bold mb-1.5 block">Guru Pembimbing PKL</label>
                  <ClickPicker 
                    value={selectedSiswa.guruPembimbingCode || ""}
                    onChange={(val) => setSelectedSiswa({ ...selectedSiswa, guruPembimbingCode: val })}
                    placeholder="Pilih Guru Pembimbing"
                    options={[
                      { value: "", label: "-- Tanpa Pembimbing --" },
                      ...teachers.map(g => ({ value: g.code, label: g.name }))
                    ]}
                  />
                </div>

                <Button 
                  onClick={async () => {
                    setIsSavingSettings(true);
                    try {
                      await fetch("/api/monitoring/pkl-students/bulk", {
                        method: "POST",
                        headers: { "Authorization": `Bearer ${authToken}`, "Content-Type": "application/json" },
                        body: JSON.stringify({ 
                          updates: [{ 
                            nis: selectedSiswa.nis, 
                            location_id: selectedSiswa.perusahaanId || null, 
                            teacher_code: selectedSiswa.guruPembimbingCode || null 
                          }] 
                        })
                      });
                      
                      setPklStudentsMapping(prev => {
                        const newMap = [...prev];
                        const idx = newMap.findIndex(m => String(m.nis) === String(selectedSiswa.nis));
                        if (idx >= 0) {
                          newMap[idx].location_id = selectedSiswa.perusahaanId;
                          newMap[idx].teacher_code = selectedSiswa.guruPembimbingCode;
                        } else {
                          newMap.push({ nis: selectedSiswa.nis, location_id: selectedSiswa.perusahaanId, teacher_code: selectedSiswa.guruPembimbingCode });
                        }
                        return newMap;
                      });

                      showToast("Penugasan PKL siswa berhasil diperbarui!");
                      setSelectedSiswa(null);
                    } catch (e) {
                      showToast("Gagal menyimpan penugasan", "error");
                    }
                    setIsSavingSettings(false);
                  }}
                  disabled={isSavingSettings}
                  className="w-full py-2.5 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-sm mt-2"
                >
                  {isSavingSettings ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                  <span>{isSavingSettings ? 'Menyimpan...' : 'Simpan Penugasan PKL'}</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-xl shadow-xl font-bold text-xs flex items-center gap-2 animate-in slide-in-from-bottom-5 text-white z-[100] ${
          toast.type === 'error' ? 'bg-red-600' : 'bg-emerald-600'
        }`}>
          {toast.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />} 
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
};

export default DataSiswa;
