import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  UserMinus, Search, RotateCcw, AlertCircle, CheckCircle2, 
  User, Calendar, FileText, ArrowRight, X, ShieldAlert,
  LogOut, Filter, Info, Sparkles, Download, AlertTriangle,
  GraduationCap, RefreshCw, Layers, Plus, Trash2, ShieldCheck,
  Archive, ArrowLeft, ArrowUpRight, Clock, HelpCircle, Check
} from 'lucide-react';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { PageHeader } from '../../../components/monitoring/ui/index.js';
import { CustomSelect } from '../../../components/CustomSelect.jsx';
import useAuthStore from '../../../store/monitoring/authStore.js';
import { Button } from '../../../components/ui.jsx';

export default function SiswaKeluar() {
  // Data States
  const [exitedStudents, setExitedStudents] = useState([]);
  const [trashStudents, setTrashStudents] = useState([]);
  const [activeStudents, setActiveStudents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Navigation Tab State ('riwayat' | 'trash')
  const [activeNavTab, setActiveNavTab] = useState('riwayat');

  // Form State (Modal on Desktop, Bottom Sheet on Mobile)
  const [isFormOpen, setIsFormOpen] = useState(false);

  // Search & Filter state for History
  const [historySearchTerm, setHistorySearchTerm] = useState('');
  const [activeTabReason, setActiveTabReason] = useState('SEMUA');

  // Search & Filter state for Trash
  const [trashSearchTerm, setTrashSearchTerm] = useState('');

  // Form Input States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClassFilter, setSelectedClassFilter] = useState('ALL');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [exitForm, setExitForm] = useState({
    tanggal_keluar: new Date().toISOString().split('T')[0],
    alasan: 'Pindah Sekolah',
    keterangan: '',
    hapus_mesin: true
  });

  // Modal Dialogs only for High Risk Actions (Permanent Delete & Empty Trash)
  const [confirmModal, setConfirmModal] = useState(null); // 'delete_permanen' | 'empty_trash' | 'restore_all'
  const [targetStudent, setTargetStudent] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [typedConfirmation, setTypedConfirmation] = useState('');

  // Toast Notification
  const [toast, setToast] = useState(null);
  const authToken = useAuthStore(state => state.user?.authToken);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Fetch Data from Backend
  const fetchData = async () => {
    if (!authToken) return;
    setIsLoading(true);
    try {
      const [exitedRes, activeRes] = await Promise.all([
        fetch('/api/siswa-keluar', { headers: { Authorization: `Bearer ${authToken}` } }),
        fetch('/api/data/load', { headers: { Authorization: `Bearer ${authToken}` } })
      ]);
      
      const exitedData = await exitedRes.json();
      if (exitedData.ok) {
        setExitedStudents(exitedData.data || []);
        setTrashStudents(exitedData.trash || []);
      }

      const activeData = await activeRes.json();
      if (activeData.payload && activeData.payload.students) {
        setActiveStudents(activeData.payload.students || []);
      }
    } catch (e) {
      console.error(e);
      showToast('Gagal memuat data mutasi siswa', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [authToken]);

  // Extract unique class list for filter
  const classList = useMemo(() => {
    const set = new Set();
    activeStudents.forEach(s => {
      const cls = s.class_name || s.kelas || s.className;
      if (cls) set.add(cls);
    });
    return Array.from(set).sort();
  }, [activeStudents]);

  // Search autocomplete for active students
  const filteredActive = useMemo(() => {
    let result = activeStudents;
    
    if (selectedClassFilter !== 'ALL') {
      result = result.filter(s => (s.class_name || s.kelas || s.className) === selectedClassFilter);
    }

    if (!searchTerm.trim()) return result.slice(0, selectedClassFilter !== 'ALL' ? 10 : 0);
    
    const term = searchTerm.toLowerCase();
    return result.filter(s => 
      (s.name || s.namaSiswa || '').toLowerCase().includes(term) || 
      (s.nis || '').includes(term)
    ).slice(0, 8);
  }, [activeStudents, searchTerm, selectedClassFilter]);

  // History List Filter
  const filteredHistory = useMemo(() => {
    return exitedStudents.filter(s => {
      if (activeTabReason !== 'SEMUA' && s.alasan !== activeTabReason) {
        return false;
      }
      if (historySearchTerm.trim()) {
        const term = historySearchTerm.toLowerCase();
        const nameMatch = (s.nama || '').toLowerCase().includes(term);
        const nisMatch = (s.nis || '').toLowerCase().includes(term);
        const classMatch = (s.kelas_terakhir || '').toLowerCase().includes(term);
        const reasonMatch = (s.alasan || '').toLowerCase().includes(term);
        const ketMatch = (s.keterangan || '').toLowerCase().includes(term);
        return nameMatch || nisMatch || classMatch || reasonMatch || ketMatch;
      }
      return true;
    });
  }, [exitedStudents, historySearchTerm, activeTabReason]);

  // Trash List Filter
  const filteredTrash = useMemo(() => {
    if (!trashSearchTerm.trim()) return trashStudents;
    const term = trashSearchTerm.toLowerCase();
    return trashStudents.filter(s => 
      (s.nama || '').toLowerCase().includes(term) ||
      (s.nis || '').includes(term) ||
      (s.kelas_terakhir || '').toLowerCase().includes(term) ||
      (s.alasan || '').toLowerCase().includes(term)
    );
  }, [trashStudents, trashSearchTerm]);

  // Reason KPI Statistics
  const reasonStats = useMemo(() => {
    const stats = { 'Pindah Sekolah': 0, 'Mengundurkan Diri': 0, 'Dikeluarkan': 0, 'Lainnya': 0 };
    exitedStudents.forEach(s => {
      if (stats[s.alasan] !== undefined) {
        stats[s.alasan]++;
      } else {
        stats['Lainnya']++;
      }
    });
    return stats;
  }, [exitedStudents]);

  // Export to Excel Handler
  const handleExportExcel = () => {
    if (exitedStudents.length === 0) {
      showToast('Tidak ada data riwayat untuk diekspor', 'error');
      return;
    }

    const exportData = exitedStudents.map((s, idx) => ({
      'No': idx + 1,
      'Nama Siswa': s.nama || '-',
      'NIS': s.nis || '-',
      'Kelas Terakhir': s.kelas_terakhir || '-',
      'Alasan Mutasi': s.alasan || '-',
      'Keterangan / Tujuan': s.keterangan || '-',
      'Tanggal Keluar': s.tanggal_keluar || '-'
    }));

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Siswa Keluar');
    if (exportData.length > 0) {
      const keys = Object.keys(exportData[0]);
      ws.addRow(keys);
      exportData.forEach(item => ws.addRow(keys.map(k => item[k])));
    }
    wb.xlsx.writeBuffer().then(buf => {
      saveAs(new Blob([buf]), `Riwayat_Siswa_Keluar_${new Date().toISOString().split('T')[0]}.xlsx`);
    });
    showToast('Berhasil mengunduh dokumen Excel riwayat siswa keluar');
  };

  // Direct Submit Exit Process (Single-click process without nested popup modal)
  const executeProcessExit = async (e) => {
    if (e) e.preventDefault();
    if (!selectedStudent) {
      showToast('Silakan cari dan pilih siswa terlebih dahulu', 'error');
      return;
    }
    setIsSubmitting(true);
    const studentName = selectedStudent.namaSiswa || selectedStudent.name;

    try {
      const res = await fetch('/api/siswa-keluar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({
          action: 'keluar',
          nis: selectedStudent.nis,
          nama: studentName,
          kelas_terakhir: selectedStudent.class_name || selectedStudent.kelas || selectedStudent.className || 'Umum',
          tanggal_keluar: exitForm.tanggal_keluar,
          alasan: exitForm.alasan,
          keterangan: exitForm.keterangan,
          hapus_mesin: exitForm.hapus_mesin !== false
        })
      });
      const data = await res.json();
      if (data.ok) {
        showToast(`Siswa "${studentName}" berhasil dicatat mutasi keluar!`);
        setSelectedStudent(null);
        setSearchTerm('');
        setExitForm({
          tanggal_keluar: new Date().toISOString().split('T')[0],
          alasan: 'Pindah Sekolah',
          keterangan: '',
          hapus_mesin: true
        });
        setIsFormOpen(false);
        fetchData();
      } else {
        showToast(data.error || 'Gagal memproses pengeluaran siswa', 'error');
      }
    } catch (e) {
      console.error(e);
      showToast('Gagal memproses pengeluaran siswa', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Soft Delete to Trash
  const executeSoftDelete = async (student) => {
    const { nis, nama } = student;
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/siswa-keluar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ action: 'soft_delete', nis })
      });
      const data = await res.json();
      if (data.ok) {
        showToast(`Data "${nama}" dipindahkan ke Sistem Restore (dapat dipulihkan kapan saja).`);
        fetchData();
      } else {
        showToast(data.error || 'Gagal memindahkan ke kotak sampah', 'error');
      }
    } catch (e) {
      console.error(e);
      showToast('Gagal memindahkan ke kotak sampah', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Restore from Trash to History
  const executeRestoreTrash = async (student) => {
    const { nis, nama } = student;
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/siswa-keluar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ action: 'restore_trash', nis })
      });
      const data = await res.json();
      if (data.ok) {
        showToast(`Data "${nama}" berhasil dikembalikan ke Arsip Riwayat!`);
        fetchData();
      } else {
        showToast(data.error || 'Gagal memulihkan data', 'error');
      }
    } catch (e) {
      console.error(e);
      showToast('Gagal memulihkan data', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Restore to Active Student
  const executeRestoreToActive = async (student) => {
    const { nis, nama } = student;
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/siswa-keluar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ action: 'restore_to_active', nis })
      });
      const data = await res.json();
      if (data.ok) {
        showToast(`Siswa "${nama}" berhasil diaktifkan kembali ke master siswa!`);
        fetchData();
      } else {
        showToast(data.error || 'Gagal mengaktifkan kembali siswa', 'error');
      }
    } catch (e) {
      console.error(e);
      showToast('Gagal mengaktifkan kembali siswa', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Restore All from Trash
  const executeRestoreAllTrash = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/siswa-keluar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ action: 'restore_all_trash' })
      });
      const data = await res.json();
      if (data.ok) {
        showToast('Semua data di Kotak Sampah berhasil dipulihkan!');
        setConfirmModal(null);
        fetchData();
      } else {
        showToast(data.error || 'Gagal memulihkan seluruh data', 'error');
      }
    } catch (e) {
      console.error(e);
      showToast('Gagal memulihkan seluruh data', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Empty Trash Permanently
  const executeEmptyTrash = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/siswa-keluar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ action: 'empty_trash' })
      });
      const data = await res.json();
      if (data.ok) {
        showToast('Kotak Sampah berhasil dikosongkan.');
        setConfirmModal(null);
        fetchData();
      } else {
        showToast(data.error || 'Gagal mengosongkan kotak sampah', 'error');
      }
    } catch (e) {
      console.error(e);
      showToast('Gagal mengosongkan kotak sampah', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Permanent Delete for Specific Student
  const executePermanentDelete = async () => {
    if (!targetStudent) return;
    setIsSubmitting(true);
    const { nis, nama } = targetStudent;

    try {
      const res = await fetch('/api/siswa-keluar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ action: 'hapus_permanen', nis })
      });
      const data = await res.json();
      if (data.ok) {
        showToast(`Data "${nama}" dihapus secara permanen dari sistem.`);
        setTargetStudent(null);
        setConfirmModal(null);
        setTypedConfirmation('');
        fetchData();
      } else {
        showToast(data.error || 'Gagal menghapus permanen', 'error');
      }
    } catch (e) {
      console.error(e);
      showToast('Gagal menghapus permanen', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 w-full pb-28 md:pb-12">
      
      {/* 🟢 Page Header */}
      <PageHeader 
        title="Pendataan Siswa Keluar"
        icon={UserMinus}
        description="Pencatatan mutasi pindah sekolah, pengunduran diri, serta manajemen pemulihan data (Sistem Restore) siswa."
      />

      {/* 📊 Statistik KPI Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {[
          { label: 'Pindah Sekolah', count: reasonStats['Pindah Sekolah'], dot: 'bg-indigo-500' },
          { label: 'Mengundurkan Diri', count: reasonStats['Mengundurkan Diri'], dot: 'bg-amber-500' },
          { label: 'Dikeluarkan', count: reasonStats['Dikeluarkan'], dot: 'bg-rose-500' },
          { label: 'Lainnya', count: reasonStats['Lainnya'], dot: 'bg-slate-400' },
        ].map(stat => (
          <div key={stat.label} className="p-4 bg-white rounded-[var(--ui-radius-card)] border border-slate-200/80 flex flex-col justify-between transition-transform hover:scale-[1.01] shadow-xs">
            <span className="text-[11px] font-extrabold text-slate-600 uppercase tracking-tight">{stat.label}</span>
            <div className="flex items-center justify-between mt-3">
              <span className="text-2xl font-black text-slate-800">{stat.count}</span>
              <span className={`w-2.5 h-2.5 rounded-full ${stat.dot} shadow-xs`} />
            </div>
          </div>
        ))}
      </div>

      {/* 📑 TOOLBAR NAVIGASI & AKSI UTAMA */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-[var(--ui-radius-card)] border border-slate-200/80 shadow-xs">
        
        {/* Segmented Switch: Riwayat vs Sistem Restore */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-[var(--ui-radius-small)]">
          <button
            type="button"
            onClick={() => setActiveNavTab('riwayat')}
            className={`flex-1 sm:flex-none py-2 px-3.5 rounded-[var(--ui-radius-small)] font-black text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeNavTab === 'riwayat'
                ? 'bg-white text-emerald-800 shadow-xs border border-slate-200/60'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Archive size={14} className={activeNavTab === 'riwayat' ? 'text-emerald-600' : 'text-slate-400'} />
            <span>Riwayat Keluar</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
              activeNavTab === 'riwayat' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
            }`}>
              {exitedStudents.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveNavTab('trash')}
            className={`flex-1 sm:flex-none py-2 px-3.5 rounded-[var(--ui-radius-small)] font-black text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeNavTab === 'trash'
                ? 'bg-white text-rose-700 shadow-xs border border-slate-200/60'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <RotateCcw size={14} className={activeNavTab === 'trash' ? 'text-rose-600' : 'text-slate-400'} />
            <span>Sistem Restore</span>
            {trashStudents.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-rose-100 text-rose-700">
                {trashStudents.length}
              </span>
            )}
          </button>
        </div>

        {/* Action Button: Buka Formulir (Desktop Modal / Mobile Bottom Sheet) */}
        <div className="flex items-center gap-2">
          {activeNavTab === 'riwayat' && (
            <button
              type="button"
              onClick={handleExportExcel}
              className="px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-[var(--ui-radius-small)] font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer"
            >
              <Download size={14} />
              <span className="hidden sm:inline">Export Excel</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsFormOpen(true)}
            className="flex-1 sm:flex-none px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-[var(--ui-radius-small)] font-black text-xs flex items-center justify-center gap-2 transition-all shadow-sm shadow-emerald-600/30 cursor-pointer active:scale-95"
          >
            <Plus size={15} />
            <span>Catat Mutasi Keluar</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 📂 TAB 1: ARSIP RIWAYAT SISWA KELUAR */}
      {/* ========================================================================= */}
      {activeNavTab === 'riwayat' && (
        <div className="bg-white rounded-[var(--ui-radius-card)] border border-slate-200/80 p-4 sm:p-6 shadow-xs space-y-4 animate-in fade-in duration-200">
          
          {/* Header Bar: Title & Search Filter */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-4">
            <div>
              <h3 className="font-black text-slate-800 text-base flex items-center gap-2">
                <span>Daftar Siswa Keluar</span>
                <span className="px-2.5 py-0.5 rounded-[var(--ui-radius-pill)] text-xs font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200/60">
                  {filteredHistory.length} Data
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Daftar mutasi siswa aktif. Menghapus data akan mengamankannya di tab Sistem Restore.
              </p>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input 
                type="text"
                value={historySearchTerm} 
                onChange={e => setHistorySearchTerm(e.target.value)} 
                placeholder="Cari nama, NIS, kelas..."
                className="w-full pl-8 pr-7 py-2 bg-slate-50 border border-slate-200 rounded-[var(--ui-radius-small)] text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all" 
              />
              {historySearchTerm && (
                <button 
                  type="button" 
                  onClick={() => setHistorySearchTerm('')} 
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          {/* Quick Filter Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0 w-full pb-2">
            {[
              { id: 'SEMUA', label: 'Semua Data', count: exitedStudents.length },
              { id: 'Pindah Sekolah', label: 'Pindah Sekolah', count: reasonStats['Pindah Sekolah'] },
              { id: 'Mengundurkan Diri', label: 'Mundur', count: reasonStats['Mengundurkan Diri'] },
              { id: 'Dikeluarkan', label: 'Dikeluarkan', count: reasonStats['Dikeluarkan'] },
              { id: 'Lainnya', label: 'Lainnya', count: reasonStats['Lainnya'] },
            ].map(tab => (
              <Button
                key={tab.id}
                variant={activeTabReason === tab.id ? 'primary' : 'ghost'}
                onClick={() => setActiveTabReason(tab.id)}
                className={`shrink-0 flex items-center gap-1.5 ${
                  activeTabReason !== tab.id ? 'text-slate-600' : ''
                }`}
              >
                <span>{tab.label}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                  activeTabReason === tab.id ? 'bg-white/20 text-white' : 'bg-slate-200/70 text-slate-600'
                }`}>
                  {tab.count}
                </span>
              </Button>
            ))}
          </div>

          {/* 💻 Desktop Table View */}
          <div className="hidden md:block overflow-hidden border border-slate-200/80 rounded-[var(--ui-radius-card)] shadow-xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/90 border-b border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3.5">Nama Siswa</th>
                  <th className="px-3 py-3.5 font-mono">NIS</th>
                  <th className="px-3 py-3.5">Kelas Terakhir</th>
                  <th className="px-3 py-3.5">Alasan Mutasi</th>
                  <th className="px-4 py-3.5">Keterangan / Tujuan</th>
                  <th className="px-3 py-3.5">Tgl Keluar</th>
                  <th className="px-4 py-3.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="text-xs font-medium text-slate-700 divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-400 font-bold">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                        <span>Memuat riwayat siswa...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredHistory.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto">
                        <UserMinus className="w-10 h-10 text-slate-300" />
                        <span className="font-extrabold text-slate-600 text-sm">Tidak ada riwayat siswa keluar</span>
                        <span className="text-xs text-slate-400 text-center">
                          {historySearchTerm ? `Tidak ada data yang cocok dengan "${historySearchTerm}"` : 'Belum ada siswa yang dicatat mutasi keluar.'}
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredHistory.map(student => (
                    <tr key={student.id || student.nis} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="px-4 py-3.5 font-extrabold text-slate-800">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-[var(--ui-radius-small)] bg-emerald-50 text-emerald-700 flex items-center justify-center font-black text-xs shrink-0 border border-emerald-200/50">
                            {(student.nama || 'S').charAt(0)}
                          </div>
                          <span className="truncate max-w-[170px]" title={student.nama}>{student.nama}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3.5 font-mono text-slate-500 font-bold">{student.nis}</td>
                      <td className="px-3 py-3.5 font-bold text-slate-700">
                        <span className="px-2 py-0.5 rounded-[var(--ui-radius-small)] bg-slate-100 border border-slate-200/60 text-[11px]">
                          {student.kelas_terakhir || 'Umum'}
                        </span>
                      </td>
                      <td className="px-3 py-3.5">
                        <span className={`inline-flex px-2.5 py-0.5 rounded-[var(--ui-radius-pill)] text-[10px] font-black uppercase tracking-wide border shadow-xs ${
                          student.alasan === 'Dikeluarkan' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                          student.alasan === 'Mengundurkan Diri' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                          student.alasan === 'Pindah Sekolah' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}>
                          {student.alasan}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-slate-500 text-xs max-w-[200px] truncate" title={student.keterangan || '-'}>
                        {student.keterangan || '-'}
                      </td>
                      <td className="px-3 py-3.5 text-slate-600 font-semibold whitespace-nowrap">
                        {student.tanggal_keluar ? new Date(student.tanggal_keluar).toLocaleDateString('id-ID', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        }) : '-'}
                      </td>
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Pulihkan langsung ke Siswa Aktif */}
                          <button 
                            type="button"
                            disabled={isSubmitting}
                            onClick={() => executeRestoreToActive(student)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-[var(--ui-radius-small)] border border-emerald-200 bg-emerald-50/70 text-emerald-700 hover:bg-emerald-600 hover:text-white font-extrabold text-xs shadow-xs active:scale-95 transition-all cursor-pointer"
                            title="Pulihkan siswa menjadi siswa aktif kembali"
                          >
                            <RotateCcw size={13} />
                            <span>Aktifkan</span>
                          </button>
                          
                          {/* Soft Delete ke Kotak Sampah */}
                          <button 
                            type="button"
                            disabled={isSubmitting}
                            onClick={() => executeSoftDelete(student)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-[var(--ui-radius-small)] border border-slate-200 bg-slate-50 text-slate-600 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 font-extrabold text-xs shadow-xs active:scale-95 transition-all cursor-pointer"
                            title="Pindahkan ke Kotak Sampah (dapat dipulihkan kapan saja)"
                          >
                            <Trash2 size={13} />
                            <span>Hapus</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* 📱 Mobile Card List View */}
          <div className="md:hidden space-y-3">
            {isLoading ? (
              <div className="py-10 text-center text-slate-400 font-bold flex flex-col items-center gap-2">
                <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                <span>Memuat riwayat...</span>
              </div>
            ) : filteredHistory.length === 0 ? (
              <div className="py-10 text-center text-slate-400 p-4 border border-dashed border-slate-200 rounded-[var(--ui-radius-card)]">
                <UserMinus className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <div className="font-extrabold text-slate-600 text-xs">Tidak ada riwayat siswa keluar</div>
              </div>
            ) : (
              filteredHistory.map(student => (
                <div key={student.id || student.nis} className="p-4 bg-slate-50/90 border border-slate-200 rounded-[var(--ui-radius-card)] space-y-3 shadow-xs">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-[var(--ui-radius-small)] bg-emerald-600 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-xs">
                        {(student.nama || 'S').charAt(0)}
                      </div>
                      <div>
                        <div className="font-extrabold text-slate-900 text-sm leading-tight">{student.nama}</div>
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5">NIS: {student.nis} • Kelas {student.kelas_terakhir || 'Umum'}</div>
                      </div>
                    </div>
                    <span className={`inline-flex px-2 py-0.5 rounded-[var(--ui-radius-pill)] text-[9px] font-black uppercase border shrink-0 ${
                      student.alasan === 'Dikeluarkan' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                      student.alasan === 'Mengundurkan Diri' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                      student.alasan === 'Pindah Sekolah' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-slate-100 text-slate-700 border-slate-200'
                    }`}>
                      {student.alasan}
                    </span>
                  </div>

                  {student.keterangan && (
                    <div className="text-xs text-slate-600 bg-white p-2.5 rounded-[var(--ui-radius-small)] border border-slate-200/70 font-medium">
                      <span className="font-bold text-slate-400 text-[10px] uppercase block mb-0.5">Keterangan / Tujuan:</span>
                      {student.keterangan}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 text-xs">
                    <span className="text-[10px] text-slate-500 font-semibold flex items-center gap-1">
                      <Calendar size={12} />
                      {student.tanggal_keluar ? new Date(student.tanggal_keluar).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button 
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => executeRestoreToActive(student)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--ui-radius-small)] border border-emerald-200 bg-white text-emerald-700 font-extrabold text-xs shadow-xs active:scale-95 transition-all cursor-pointer"
                      >
                        <RotateCcw size={12} />
                        <span>Aktifkan</span>
                      </button>
                      <button 
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => executeSoftDelete(student)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-[var(--ui-radius-small)] border border-slate-200 bg-white text-slate-600 hover:text-rose-600 font-extrabold text-xs shadow-xs active:scale-95 transition-all cursor-pointer"
                      >
                        <Trash2 size={12} />
                        <span>Hapus</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* 🗑️ TAB 2: SISTEM RESTORE (KOTAK SAMPAH & PEMULIHAN ANTI-SALAH HAPUS) */}
      {/* ========================================================================= */}
      {activeNavTab === 'trash' && (
        <div className="bg-white rounded-[var(--ui-radius-card)] border border-slate-200/80 p-4 sm:p-6 shadow-xs space-y-5 animate-in fade-in duration-200">
          
          {/* Banner Edukasi Sistem Restore */}
          <div className="p-4 bg-gradient-to-r from-emerald-50 via-teal-50 to-sky-50 border border-emerald-200 rounded-[var(--ui-radius-card)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-[var(--ui-radius-small)] bg-emerald-600 text-white flex items-center justify-center font-bold shrink-0 shadow-xs mt-0.5 sm:mt-0">
                <ShieldCheck size={20} />
              </div>
              <div>
                <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
                  <span>Sistem Restore Data Siswa</span>
                  <span className="px-2 py-0.2 rounded-full text-[9px] bg-emerald-200 text-emerald-800 font-black uppercase">
                    Aman
                  </span>
                </h4>
                <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                  Data yang dihapus dari arsip mutasi disimpan di sini secara aman. Anda dapat <strong>memulihkannya kapan saja</strong> jika terjadi ketidaksengajaan atau salah hapus.
                </p>
              </div>
            </div>

            {trashStudents.length > 0 && (
              <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-emerald-200/60">
                <button
                  type="button"
                  onClick={() => setConfirmModal('restore_all')}
                  className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-[var(--ui-radius-small)] font-black text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                >
                  <RotateCcw size={13} />
                  <span>Pulihkan Semua</span>
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmModal('empty_trash')}
                  className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-[var(--ui-radius-small)] font-black text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                >
                  <Trash2 size={13} />
                  <span>Kosongkan</span>
                </button>
              </div>
            )}
          </div>

          {/* Search Bar Khusus Trash */}
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div className="text-xs font-extrabold text-slate-700 flex items-center gap-2">
              <RotateCcw size={14} className="text-slate-400" />
              <span>Daftar Data Terhapus ({filteredTrash.length})</span>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
              <input 
                type="text"
                value={trashSearchTerm} 
                onChange={e => setTrashSearchTerm(e.target.value)} 
                placeholder="Cari siswa terhapus..."
                className="w-full pl-8 pr-7 py-1.5 bg-slate-50 border border-slate-200 rounded-[var(--ui-radius-small)] text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all" 
              />
              {trashSearchTerm && (
                <button 
                  type="button" 
                  onClick={() => setTrashSearchTerm('')} 
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          {/* List Siswa di Kotak Sampah */}
          {isLoading ? (
            <div className="py-12 text-center text-slate-400 font-bold flex flex-col items-center gap-2">
              <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
              <span>Memeriksa data kotak sampah...</span>
            </div>
          ) : filteredTrash.length === 0 ? (
            <div className="py-16 text-center text-slate-400 p-6 border border-dashed border-slate-200 rounded-[var(--ui-radius-card)] max-w-md mx-auto">
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 size={24} />
              </div>
              <h5 className="font-extrabold text-slate-700 text-sm">Kotak Sampah Bersih</h5>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Tidak ada data siswa yang terhapus saat ini. Data siswa Anda tersimpan aman dan terstruktur.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTrash.map(student => (
                <div 
                  key={student.id || student.nis} 
                  className="p-4 bg-slate-50 border border-slate-200/80 rounded-[var(--ui-radius-card)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs hover:border-slate-300 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-[var(--ui-radius-small)] bg-slate-200 text-slate-700 font-black text-sm flex items-center justify-center shrink-0">
                      {(student.nama || 'S').charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-slate-900 text-sm truncate">{student.nama}</span>
                        <span className="px-2 py-0.5 rounded-[var(--ui-radius-pill)] text-[9px] font-black uppercase bg-slate-200 text-slate-700">
                          {student.alasan}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono flex items-center gap-2 mt-0.5">
                        <span>NIS: {student.nis}</span>
                        <span>•</span>
                        <span>Kelas: {student.kelas_terakhir || 'Umum'}</span>
                        {student.deleted_at && (
                          <>
                            <span>•</span>
                            <span className="text-slate-400 flex items-center gap-1 font-sans">
                              <Clock size={11} />
                              Dihapus {new Date(student.deleted_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </>
                        )}
                      </div>
                      {student.keterangan && (
                        <div className="text-[11px] text-slate-500 mt-1 italic line-clamp-1">
                          "{student.keterangan}"
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Tombol Pemulihan & Hapus Permanen */}
                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200/60">
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => executeRestoreTrash(student)}
                      className="px-3 py-1.5 bg-white border border-emerald-300 text-emerald-700 hover:bg-emerald-50 rounded-[var(--ui-radius-small)] font-black text-xs flex items-center gap-1.5 transition-all shadow-xs active:scale-95 cursor-pointer"
                      title="Pulihkan ke Arsip Riwayat Siswa Keluar"
                    >
                      <RotateCcw size={12} />
                      <span>Pulihkan ke Arsip</span>
                    </button>

                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => executeRestoreToActive(student)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-[var(--ui-radius-small)] font-black text-xs flex items-center gap-1.5 transition-all shadow-xs active:scale-95 cursor-pointer"
                      title="Pulihkan langsung menjadi siswa aktif kembali"
                    >
                      <GraduationCap size={13} />
                      <span>Aktifkan Siswa</span>
                    </button>

                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => {
                        setTargetStudent(student);
                        setTypedConfirmation('');
                        setConfirmModal('delete_permanen');
                      }}
                      className="px-2.5 py-1.5 bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 rounded-[var(--ui-radius-small)] font-black text-xs flex items-center gap-1 transition-all shadow-xs active:scale-95 cursor-pointer"
                      title="Hapus permanen dari seluruh sistem"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      )}

      {/* ========================================================================= */}
      {/* 📋 FORMULIR MUTASI KELUAR: DESKTOP MODAL vs MOBILE BOTTOM SHEET */}
      {/* DI-RENDER VIA createPortal(..., document.body) AGAR SELALU DI ATAS SEMUA ELEMEN */}
      {/* ========================================================================= */}
      {isFormOpen && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
          style={{ zIndex: 99999 }}
        >
          {/* Backdrop Click */}
          <div className="absolute inset-0" onClick={() => setIsFormOpen(false)} />

          {/* Container: Bottom Sheet on Mobile (< sm), Centered Modal on Desktop (sm:) */}
          <div className="relative w-full sm:max-w-xl bg-white rounded-t-[28px] sm:rounded-[var(--ui-radius-card)] border-t sm:border border-slate-200 shadow-2xl flex flex-col max-h-[90vh] sm:max-h-[85vh] overflow-hidden z-10 animate-in slide-in-from-bottom sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-250">
            
            {/* 📱 Mobile Drag Handle Bar */}
            <div className="pt-2.5 pb-1 flex justify-center sm:hidden shrink-0 bg-white">
              <div className="w-12 h-1.5 bg-slate-300 rounded-full" />
            </div>

            {/* Header Dialog */}
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-[var(--ui-radius-small)] bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                  <FileText size={18} />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-800 text-sm sm:text-base leading-tight">Formulir Mutasi Keluar</h3>
                  <p className="text-[11px] text-slate-400 font-medium">Input mutasi keluar siswa</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-[var(--ui-radius-small)] text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Form & Scrollable Body */}
            <form onSubmit={executeProcessExit} className="flex flex-col flex-1 min-h-0">
              
              <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
                
                {/* 1. Filter Kelas & Cari Siswa */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                    <Layers size={13} className="text-slate-400" />
                    <span>Filter Kelas (Opsional)</span>
                  </label>
                  <CustomSelect
                    value={selectedClassFilter}
                    onChange={(val) => setSelectedClassFilter(val)}
                    options={[
                      { value: 'ALL', label: `✨ Semua Kelas (${activeStudents.length} Siswa)` },
                      ...classList.map(cls => ({ value: cls, label: `Kelas ${cls}` }))
                    ]}
                    searchable={true}
                    placeholder="Pilih Filter Kelas"
                  />
                </div>

                {/* Autocomplete Input Siswa */}
                <div className="relative">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                    <span>Cari &amp; Pilih Siswa <span className="text-rose-500">*</span></span>
                    {selectedStudent && (
                      <button 
                        type="button" 
                        onClick={() => { setSelectedStudent(null); setSearchTerm(''); }} 
                        className="text-[11px] text-rose-600 hover:text-rose-700 font-extrabold flex items-center gap-1 cursor-pointer"
                      >
                        <X size={12} /> Reset
                      </button>
                    )}
                  </label>
                  
                  <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input 
                      type="text"
                      value={searchTerm} 
                      onChange={e => {
                        setSearchTerm(e.target.value);
                        if (selectedStudent && e.target.value !== (selectedStudent.namaSiswa || selectedStudent.name)) {
                          setSelectedStudent(null);
                        }
                      }} 
                      placeholder={selectedClassFilter !== 'ALL' ? `Ketik nama siswa kelas ${selectedClassFilter}...` : "Ketik Nama atau NIS siswa..."}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-[var(--ui-radius-small)] text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 transition-all" 
                    />
                  </div>

                  {/* Suggestions Dropdown */}
                  {filteredActive.length > 0 && !selectedStudent && (
                    <div className="absolute left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-[var(--ui-radius-card)] shadow-lg z-30 max-h-52 overflow-y-auto divide-y divide-slate-100 animate-in fade-in duration-150">
                      <div className="px-3 py-1.5 bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                        Siswa Ditemukan ({filteredActive.length})
                      </div>
                      {filteredActive.map(s => {
                        const studentName = s.namaSiswa || s.name || s.nama;
                        const studentClass = s.class_name || s.kelas || s.className || 'Umum';
                        return (
                          <button
                            key={s.nis || s.id}
                            type="button"
                            onClick={() => {
                              setSelectedStudent(s);
                              setSearchTerm(studentName);
                            }}
                            className="w-full text-left p-2.5 hover:bg-emerald-50/70 transition-colors flex items-center justify-between group cursor-pointer"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-8 h-8 rounded-[var(--ui-radius-small)] bg-emerald-100 text-emerald-800 font-black text-xs flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors shrink-0">
                                {studentName.charAt(0)}
                              </div>
                              <div className="min-w-0">
                                <div className="text-xs font-extrabold text-slate-800 group-hover:text-emerald-950 truncate">
                                  {studentName}
                                </div>
                                <div className="text-[10px] text-slate-500 font-mono">NIS: {s.nis || '-'}</div>
                              </div>
                            </div>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-[var(--ui-radius-pill)] bg-slate-100 text-slate-600 group-hover:bg-emerald-200 group-hover:text-emerald-800 transition-colors shrink-0 ml-2">
                              {studentClass}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Card Siswa Terpilih */}
                {selectedStudent && (
                  <div className="p-3.5 bg-gradient-to-r from-emerald-50 via-teal-50 to-cyan-50 border border-emerald-200 rounded-[var(--ui-radius-card)] flex items-center justify-between shadow-xs animate-in zoom-in-95 duration-200">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-[var(--ui-radius-small)] bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center font-black text-sm shadow-xs shrink-0">
                        {(selectedStudent.namaSiswa || selectedStudent.name || 'S').charAt(0)}
                      </div>
                      <div>
                        <div className="text-xs font-black text-slate-900">
                          {selectedStudent.namaSiswa || selectedStudent.name}
                        </div>
                        <div className="text-[10px] font-semibold text-emerald-800 flex items-center gap-2 mt-0.5">
                          <span className="font-mono bg-emerald-200/60 px-1.5 py-0.2 rounded font-bold">NIS: {selectedStudent.nis}</span>
                          <span>•</span>
                          <span>Kelas: {selectedStudent.class_name || selectedStudent.kelas || selectedStudent.className || 'Umum'}</span>
                        </div>
                      </div>
                    </div>
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  </div>
                )}

                {/* 2. Tanggal Mutasi Keluar */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                    <Calendar size={13} className="text-slate-400" />
                    <span>Tanggal Mutasi Keluar <span className="text-rose-500">*</span></span>
                  </label>
                  <input 
                    type="date"
                    required
                    value={exitForm.tanggal_keluar} 
                    onChange={e => setExitForm({ ...exitForm, tanggal_keluar: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-[var(--ui-radius-small)] text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 transition-all cursor-pointer" 
                  />
                </div>

                {/* 3. Alasan Mutasi Keluar */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Alasan Mutasi Keluar <span className="text-rose-500">*</span>
                  </label>
                  
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { key: 'Pindah Sekolah', label: 'Pindah Sekolah' },
                      { key: 'Mengundurkan Diri', label: 'Mengundurkan Diri' },
                      { key: 'Dikeluarkan', label: 'Dikeluarkan' },
                      { key: 'Lainnya', label: 'Lainnya' },
                    ].map(item => {
                      const isSelected = exitForm.alasan === item.key;
                      return (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => setExitForm({ ...exitForm, alasan: item.key })}
                          className={`py-2 px-2.5 rounded-[var(--ui-radius-small)] border text-[11px] font-bold transition-all text-center cursor-pointer shadow-xs ${
                            isSelected
                              ? 'bg-emerald-600 text-white border-emerald-600 ring-2 ring-emerald-500/20'
                              : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          {item.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 4. Keterangan / Sekolah Tujuan */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                    <FileText size={13} className="text-slate-400" />
                    <span>Keterangan / Sekolah Tujuan</span>
                  </label>
                  <textarea 
                    rows="2.5"
                    value={exitForm.keterangan} 
                    onChange={e => setExitForm({ ...exitForm, keterangan: e.target.value })}
                    placeholder="Contoh: Pindah ke SMKN 1 Jakarta / Alasan ikut orang tua..."
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-[var(--ui-radius-small)] text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 transition-all resize-none" 
                  />
                </div>

                {/* 5. Checkbox Sinkronisasi Mesin Absensi */}
                <div className="p-3 bg-rose-50/70 border border-rose-200/80 rounded-[var(--ui-radius-small)] flex items-start gap-2.5">
                  <input 
                    type="checkbox" 
                    id="hapus_mesin_check"
                    checked={exitForm.hapus_mesin !== false}
                    onChange={e => setExitForm({ ...exitForm, hapus_mesin: e.target.checked })}
                    className="mt-0.5 w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-rose-300 cursor-pointer"
                  />
                  <label htmlFor="hapus_mesin_check" className="text-xs text-rose-900 font-bold cursor-pointer select-none">
                    <div>Hapus dari Master Data &amp; Mesin Absensi Hikvision</div>
                    <div className="text-[10px] text-rose-700 font-normal mt-0.5">
                      Secara otomatis menghapus akun siswa dari mesin fingerprint/face recognition dan menonaktifkan akun login siswa.
                    </div>
                  </label>
                </div>

              </div>

              {/* 🛑 STICKY FOOTER ACTION BUTTON (Selalu terlihat di atas nav bar di Mobile & Desktop) */}
              <div className="p-4 bg-white border-t border-slate-100 shrink-0 sticky bottom-0 z-20 shadow-[0_-4px_16px_rgba(0,0,0,0.04)] pb-[max(1.25rem,calc(env(safe-area-inset-bottom,0px)+0.75rem))]">
                <button 
                  type="submit" 
                  disabled={!selectedStudent || isSubmitting} 
                  className="w-full py-3 px-5 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-800 text-white font-black text-xs uppercase tracking-wider rounded-[var(--ui-radius-small)] shadow-md shadow-emerald-600/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      <span>Memproses Mutasi Keluar...</span>
                    </>
                  ) : (
                    <>
                      <UserMinus size={16} />
                      <span>Proses Mutasi Keluar</span>
                    </>
                  )}
                </button>
              </div>

            </form>

          </div>
        </div>,
        document.body
      )}

      {/* ========================================================================= */}
      {/* ⚠️ MODAL KONFIRMASI HANYA UNTUK TINDAKAN BERISIKO TINGGI (PERMANENT DELETE) */}
      {/* ========================================================================= */}

      {/* Modal: Hapus Permanen (Dengan Pengaman Ketik HAPUS) */}
      {confirmModal === 'delete_permanen' && targetStudent && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
          style={{ zIndex: 100000 }}
        >
          <div className="bg-white rounded-[var(--ui-radius-card)] border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-[var(--ui-radius-small)] bg-rose-50 text-rose-600 flex items-center justify-center font-bold shrink-0">
                <Trash2 size={20} />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">Hapus Permanen</h3>
                <p className="text-xs text-rose-600 font-semibold">Tindakan ini tidak dapat dibatalkan!</p>
              </div>
            </div>

            <div className="p-3.5 bg-rose-50/70 border border-rose-200 rounded-[var(--ui-radius-small)] space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Nama Siswa:</span>
                <span className="font-extrabold text-slate-900">{targetStudent.nama}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">NIS:</span>
                <span className="font-mono font-bold text-slate-800">{targetStudent.nis}</span>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Data siswa akan dihapus secara total dari database dan mesin absensi. Untuk konfirmasi, ketik <strong>HAPUS</strong> di bawah ini:
            </p>

            <div>
              <input 
                type="text"
                value={typedConfirmation}
                onChange={e => setTypedConfirmation(e.target.value)}
                placeholder="Ketik HAPUS untuk konfirmasi"
                className="w-full px-3.5 py-2 border border-rose-300 rounded-[var(--ui-radius-small)] text-xs font-bold text-slate-800 uppercase focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => { setConfirmModal(null); setTargetStudent(null); setTypedConfirmation(''); }}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-[var(--ui-radius-small)] border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-extrabold transition-all cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={typedConfirmation.trim().toUpperCase() !== 'HAPUS' || isSubmitting}
                onClick={executePermanentDelete}
                className="px-4 py-2 rounded-[var(--ui-radius-small)] bg-rose-600 hover:bg-rose-700 text-white text-xs font-black transition-all shadow-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isSubmitting ? <RefreshCw size={14} className="animate-spin" /> : <Trash2 size={14} />}
                <span>Musnahkan Permanen</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal: Pulihkan Semua dari Trash */}
      {confirmModal === 'restore_all' && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
          style={{ zIndex: 100000 }}
        >
          <div className="bg-white rounded-[var(--ui-radius-card)] border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-[var(--ui-radius-small)] bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shrink-0">
                <RotateCcw size={20} />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">Pulihkan Semua Data?</h3>
                <p className="text-xs text-slate-500">Kembalikan semua data di kotak sampah ke arsip riwayat</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Sebanyak <strong>{trashStudents.length} siswa</strong> di Kotak Sampah akan dipindahkan kembali ke Arsip Riwayat Siswa Keluar.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-[var(--ui-radius-small)] border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-extrabold transition-all cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={executeRestoreAllTrash}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-[var(--ui-radius-small)] bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                {isSubmitting ? <RefreshCw size={14} className="animate-spin" /> : <RotateCcw size={14} />}
                <span>Ya, Pulihkan Semua</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal: Kosongkan Kotak Sampah */}
      {confirmModal === 'empty_trash' && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
          style={{ zIndex: 100000 }}
        >
          <div className="bg-white rounded-[var(--ui-radius-card)] border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-[var(--ui-radius-small)] bg-rose-50 text-rose-600 flex items-center justify-center font-bold shrink-0">
                <Trash2 size={20} />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">Kosongkan Kotak Sampah?</h3>
                <p className="text-xs text-rose-600 font-semibold">Tindakan ini permanen</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Semua data di dalam Kotak Sampah ({trashStudents.length} item) akan dihapus secara permanen dari sistem.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-[var(--ui-radius-small)] border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-extrabold transition-all cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={executeEmptyTrash}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-[var(--ui-radius-small)] bg-rose-600 hover:bg-rose-700 text-white text-xs font-black transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                {isSubmitting ? <RefreshCw size={14} className="animate-spin" /> : <Trash2 size={14} />}
                <span>Kosongkan Sampah</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* 🔔 Floating Toast Notification */}
      {toast && (
        <div 
          className={`fixed bottom-6 right-6 px-4 py-3 rounded-[var(--ui-radius-card)] shadow-md font-bold text-xs flex items-center gap-2.5 animate-in slide-in-from-bottom-5 text-white ${toast.type === 'error' ? 'bg-rose-600 shadow-rose-900/20' : 'bg-emerald-600 shadow-emerald-900/20'}`}
          style={{ zIndex: 100001 }}
        >
          {toast.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />} 
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}
