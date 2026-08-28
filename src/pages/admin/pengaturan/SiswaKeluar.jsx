import { useState, useEffect, useMemo } from 'react';
import { 
  UserMinus, Search, RotateCcw, AlertCircle, CheckCircle2, 
  User, Calendar, FileText, ArrowRight, X, ShieldAlert,
  LogOut, Filter, Info, Sparkles, Download, AlertTriangle,
  GraduationCap, RefreshCw, Layers, Plus
} from 'lucide-react';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { PageHeader } from '../../../components/monitoring/ui/index.js';
import { CustomSelect } from '../../../components/CustomSelect.jsx';
import useAuthStore from '../../../store/monitoring/authStore.js';
import { Button } from '../../../components/ui.jsx';

export default function SiswaKeluar() {
  const [exitedStudents, setExitedStudents] = useState([]);
  const [activeStudents, setActiveStudents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClassFilter, setSelectedClassFilter] = useState('ALL');
  const [historySearchTerm, setHistorySearchTerm] = useState('');
  const [activeTabReason, setActiveTabReason] = useState('SEMUA');
  
  // Selection & Modal states
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null); // 'exit' or 'restore'
  const [targetRestoreStudent, setTargetRestoreStudent] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);

  // Exit Form State
  const [exitForm, setExitForm] = useState({
    tanggal_keluar: new Date().toISOString().split('T')[0],
    alasan: 'Pindah Sekolah',
    keterangan: ''
  });

  const [toast, setToast] = useState(null);
  const authToken = useAuthStore(state => state.user?.authToken);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3800);
  };

  const fetchData = async () => {
    if (!authToken) return;
    setIsLoading(true);
    try {
      const [exitedRes, activeRes] = await Promise.all([
        fetch('/api/siswa-keluar', { headers: { Authorization: `Bearer ${authToken}` } }),
        fetch('/api/data/load', { headers: { Authorization: `Bearer ${authToken}` } })
      ]);
      
      const exitedData = await exitedRes.json();
      if (exitedData.ok) setExitedStudents(exitedData.data || []);

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
    
    // Filter by class if selected
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

  // Exited students history list filter
  const filteredHistory = useMemo(() => {
    return exitedStudents.filter(s => {
      // Reason filter tab
      if (activeTabReason !== 'SEMUA' && s.alasan !== activeTabReason) {
        return false;
      }
      // Search term filter
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

  // Chart summary reasons count
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

  // Export to Excel handler
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

  // Submit exit action
  const executeProcessExit = async () => {
    if (!selectedStudent) return;
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
          keterangan: exitForm.keterangan
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
          keterangan: ''
        });
        setConfirmModal(null);
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

  // Execute restore action
  const executeRestoreStudent = async () => {
    if (!targetRestoreStudent) return;
    setIsSubmitting(true);
    const { nis, nama } = targetRestoreStudent;

    try {
      const res = await fetch('/api/siswa-keluar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ action: 'batal', nis })
      });
      const data = await res.json();
      if (data.ok) {
        showToast(`Status keluar "${nama}" berhasil dibatalkan. Siswa aktif kembali!`);
        setTargetRestoreStudent(null);
        setConfirmModal(null);
        fetchData();
      } else {
        showToast(data.error || 'Gagal membatalkan status keluar', 'error');
      }
    } catch (e) {
      console.error(e);
      showToast('Gagal membatalkan status keluar', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 relative animate-in fade-in duration-300 z-10 w-full pb-12">
      
      {/* 🟢 Page Header */}
      <PageHeader 
        title="Pendataan Siswa Keluar"
        icon={UserMinus}
        description="Pencatatan mutasi pindah sekolah, pengunduran diri, atau penonaktifan siswa secara terstruktur."
      />

      
      {/* 📊 Statistik Pengeluaran KPI Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {[
          { label: 'Pindah Sekolah', count: reasonStats['Pindah Sekolah'], dot: 'bg-indigo-500' },
          { label: 'Mundur', count: reasonStats['Mengundurkan Diri'], dot: 'bg-amber-500' },
          { label: 'Dikeluarkan', count: reasonStats['Dikeluarkan'], dot: 'bg-rose-500' },
          { label: 'Lainnya', count: reasonStats['Lainnya'], dot: 'bg-slate-400' },
        ].map(stat => (
          <div key={stat.label} className="p-4 bg-white rounded-[var(--ui-radius-card)] border border-slate-200/80 flex flex-col justify-between transition-transform hover:scale-[1.02] shadow-sm">
            <span className="text-[11px] font-extrabold text-slate-600 uppercase tracking-tight">{stat.label}</span>
            <div className="flex items-center justify-between mt-3">
              <span className="text-2xl font-black text-slate-800">{stat.count}</span>
              <span className={`w-2.5 h-2.5 rounded-full ${stat.dot} shadow-2xs`} />
            </div>
          </div>
        ))}
      </div>


      {/* 📑 Kolom Kanan: Daftar Riwayat Keluar & Filter Tab (8 Cols on LG) */}
        <div className="bg-white rounded-[var(--ui-radius-card)] border border-slate-200/80 p-5 sm:p-6 shadow-sm space-y-4">
          
          {/* Header Bar & Actions */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-4">
            <div>
              <h3 className="font-black text-slate-800 text-base flex items-center gap-2">
                <span>Arsip Riwayat Siswa Keluar</span>
                <span className="px-2.5 py-0.5 rounded-[var(--ui-radius-pill)] text-xs font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200/60">
                  {filteredHistory.length} Data
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Daftar seluruh siswa yang telah diproses mutasi keluar atau non-aktif.
              </p>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              {/* Export Excel Button */}
              <button
                type="button"
                onClick={handleExportExcel}
                className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-[var(--ui-radius-small)] font-extrabold text-xs flex items-center gap-1.5 transition-all active:scale-95 shadow-2xs cursor-pointer shrink-0"
                title="Ekspor ke Excel"
              >
                <Download size={14} />
                <span>Export Excel</span>
              </button>

              {/* Tambah Mutasi Button */}
              <button
                type="button"
                onClick={() => setIsFormModalOpen(true)}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-700 rounded-[var(--ui-radius-small)] font-black text-xs flex items-center gap-1.5 transition-all active:scale-95 shadow-sm shadow-emerald-600/30 cursor-pointer shrink-0"
              >
                <Plus size={14} />
                <span className="hidden sm:inline">Catat Mutasi</span>
              </button>

              {/* Instant Search Bar */}
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                <input 
                  type="text"
                  value={historySearchTerm} 
                  onChange={e => setHistorySearchTerm(e.target.value)} 
                  placeholder="Cari nama, NIS, kelas..."
                  className="w-full pl-8 pr-7 py-1.5 bg-slate-50 border border-slate-200 rounded-[var(--ui-radius-small)] text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all" 
                />
                {historySearchTerm && (
                  <button 
                    type="button" 
                    onClick={() => setHistorySearchTerm('')} 
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
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

          {/* 💻 Desktop Table View (Hidden on Mobile) */}
          <div className="hidden md:block overflow-hidden border border-slate-200/80 rounded-[var(--ui-radius-card)] shadow-2xs">
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
                        <span>Memuat arsip riwayat siswa...</span>
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
                          <span className="truncate max-w-[150px]" title={student.nama}>{student.nama}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3.5 font-mono text-slate-500 font-bold">{student.nis}</td>
                      <td className="px-3 py-3.5 font-bold text-slate-700">
                        <span className="px-2 py-0.5 rounded-[var(--ui-radius-small)] bg-slate-100 border border-slate-200/60 text-[11px]">
                          {student.kelas_terakhir || 'Umum'}
                        </span>
                      </td>
                      <td className="px-3 py-3.5">
                        <span className={`inline-flex px-2.5 py-0.5 rounded-[var(--ui-radius-pill)] text-[10px] font-black uppercase tracking-wide border shadow-2xs ${
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
                      <td className="px-4 py-3.5 text-right">
                        <button 
                          type="button"
                          onClick={() => {
                            setTargetRestoreStudent(student);
                            setConfirmModal('restore');
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--ui-radius-small)] border border-emerald-200 bg-emerald-50/60 text-emerald-700 hover:bg-emerald-600 hover:text-white font-extrabold text-xs shadow-2xs active:scale-95 transition-all cursor-pointer"
                          title="Batalkan status keluar & kembalikan ke siswa aktif"
                        >
                          <RotateCcw size={13} />
                          <span>Batalkan</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* 📱 Mobile Card View (Shown on Mobile Screens) */}
          <div className="md:hidden space-y-3">
            {isLoading ? (
              <div className="py-10 text-center text-slate-400 font-bold flex flex-col items-center gap-2">
                <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                <span>Memuat arsip riwayat...</span>
              </div>
            ) : filteredHistory.length === 0 ? (
              <div className="py-10 text-center text-slate-400 p-4 border border-dashed border-slate-200 rounded-[var(--ui-radius-card)]">
                <UserMinus className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <div className="font-extrabold text-slate-600 text-xs">Tidak ada riwayat siswa keluar</div>
              </div>
            ) : (
              filteredHistory.map(student => (
                <div key={student.id || student.nis} className="p-4 bg-slate-50/80 border border-slate-200 rounded-[var(--ui-radius-card)] space-y-3 shadow-2xs">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-[var(--ui-radius-small)] bg-emerald-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                        {(student.nama || 'S').charAt(0)}
                      </div>
                      <div>
                        <div className="font-extrabold text-slate-900 text-sm">{student.nama}</div>
                        <div className="text-[10px] text-slate-500 font-mono">NIS: {student.nis} • Kelas: {student.kelas_terakhir || 'Umum'}</div>
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
                    <div className="text-xs text-slate-600 bg-white p-2.5 rounded-[var(--ui-radius-small)] border border-slate-200/60 font-medium">
                      <span className="font-bold text-slate-400 text-[10px] uppercase block mb-0.5">Tujuan / Ket:</span>
                      {student.keterangan}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 text-xs">
                    <span className="text-[10px] text-slate-500 font-semibold flex items-center gap-1">
                      <Calendar size={12} />
                      {student.tanggal_keluar ? new Date(student.tanggal_keluar).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                    </span>
                    <button 
                      type="button"
                      onClick={() => {
                        setTargetRestoreStudent(student);
                        setConfirmModal('restore');
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--ui-radius-small)] border border-emerald-200 bg-white text-emerald-700 font-extrabold text-xs shadow-2xs active:scale-95 transition-all cursor-pointer"
                    >
                      <RotateCcw size={12} />
                      <span>Batalkan Status</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

        </div>

      {/* 📝 Modal Form Mutasi Keluar */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-[var(--ui-radius-card)] border border-slate-200 shadow-xl max-w-lg w-full max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="bg-white border-b border-slate-100 p-4 sm:p-5 flex items-center justify-between z-10 rounded-t-[var(--ui-radius-card)]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-[var(--ui-radius-small)] bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  <FileText size={18} />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-800 text-sm">Formulir Keluar</h3>
                  <p className="text-[11px] text-slate-400 font-medium">Input mutasi keluar siswa</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setIsFormModalOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-[var(--ui-radius-small)] text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-5 overflow-y-auto">
              <form onSubmit={(e) => { e.preventDefault(); if (selectedStudent) setConfirmModal('exit'); }} className="space-y-4">
              
              {/* Opsi Filter Kelas untuk Memudahkan Pencarian */}
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
                      className="text-[10px] text-rose-600 hover:text-rose-700 font-extrabold flex items-center gap-1 cursor-pointer"
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
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-[var(--ui-radius-small)] text-xs font-semibold text-slate-800 placeholder:text-slate-400 placeholder:font-normal focus:outline-none focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 transition-all" 
                  />
                </div>

                {/* Autocomplete Suggestions Dropdown */}
                {filteredActive.length > 0 && !selectedStudent && (
                  <div className="absolute left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-[var(--ui-radius-card)] shadow-sm z-30 max-h-60 overflow-y-auto divide-y divide-slate-100 animate-in fade-in duration-150">
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

              {/* Card Ringkasan Siswa Terpilih */}
              {selectedStudent && (
                <div className="p-3.5 bg-gradient-to-r from-emerald-50 via-teal-50 to-cyan-50 border border-emerald-200 rounded-[var(--ui-radius-card)] flex items-center justify-between shadow-2xs animate-in zoom-in-95 duration-200">
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

              {/* Tanggal Keluar */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
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

              {/* Alasan Keluar - Quick Choice Pills */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span>Alasan Mutasi Keluar <span className="text-rose-500">*</span></span>
                </label>
                
                <div className="grid grid-cols-2 gap-1.5 mb-2">
                  {[
                    { key: 'Pindah Sekolah', label: 'Pindah Sekolah', color: 'border-indigo-200 bg-indigo-50/70 text-indigo-900 active:bg-indigo-200 hover:bg-indigo-100' },
                    { key: 'Mengundurkan Diri', label: 'Mengundurkan Diri', color: 'border-amber-200 bg-amber-50/70 text-amber-900 active:bg-amber-200 hover:bg-amber-100' },
                    { key: 'Dikeluarkan', label: 'Dikeluarkan', color: 'border-rose-200 bg-rose-50/70 text-rose-900 active:bg-rose-200 hover:bg-rose-100' },
                    { key: 'Lainnya', label: 'Lainnya', color: 'border-slate-200 bg-slate-100 text-slate-800 active:bg-slate-200 hover:bg-slate-200' },
                  ].map(item => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setExitForm({ ...exitForm, alasan: item.key })}
                      className={`px-2.5 py-2 rounded-[var(--ui-radius-small)] border text-[11px] font-extrabold transition-all text-center cursor-pointer ${
                        exitForm.alasan === item.key 
                          ? 'ring-2 ring-emerald-500 border-emerald-500 bg-emerald-600 text-white shadow-2xs' 
                          : item.color
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Keterangan / Tujuan */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <FileText size={13} className="text-slate-400" />
                  <span>Keterangan / Sekolah Tujuan</span>
                </label>
                <textarea 
                  rows="3"
                  value={exitForm.keterangan} 
                  onChange={e => setExitForm({ ...exitForm, keterangan: e.target.value })}
                  placeholder="Contoh: Pindah ke SMKN 1 Jakarta / Alasan ikut orang tua..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-[var(--ui-radius-small)] text-xs font-medium text-slate-800 placeholder:text-slate-400 placeholder:font-normal focus:outline-none focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 transition-all resize-none" 
                />
              </div>

              {/* Submit Button */}
              <button 
                type="submit" 
                disabled={!selectedStudent} 
                className="w-full py-3 px-5 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-800 text-white font-black text-xs uppercase tracking-wider rounded-[var(--ui-radius-small)] shadow-sm shadow-emerald-600/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
              >
                <UserMinus size={16} /> Proses Mutasi Keluar
              </button>
            </form>
            </div>

          </div>
        </div>
      )}

      {/* ⚠️ Modal Konfirmasi Proses Mutasi Keluar */}
      {confirmModal === 'exit' && selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-[var(--ui-radius-card)] border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-[var(--ui-radius-small)] bg-rose-50 text-rose-600 flex items-center justify-center font-bold shrink-0">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">Konfirmasi Siswa Keluar</h3>
                <p className="text-xs text-slate-500">Proses pencatatan mutasi pengeluaran siswa</p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-[var(--ui-radius-small)] space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Nama Siswa:</span>
                <span className="font-extrabold text-slate-900">{selectedStudent.namaSiswa || selectedStudent.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">NIS / Kelas:</span>
                <span className="font-mono font-bold text-slate-800">{selectedStudent.nis} ({selectedStudent.class_name || selectedStudent.kelas || selectedStudent.className || 'Umum'})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Alasan Mutasi:</span>
                <span className="font-bold text-emerald-700">{exitForm.alasan}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Tanggal Keluar:</span>
                <span className="font-bold text-slate-800">{exitForm.tanggal_keluar}</span>
              </div>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Siswa ini akan dipindahkan dari daftar siswa aktif ke <strong>Arsip Riwayat Siswa Keluar</strong>. Anda dapat mengembalikannya kapan saja.
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
                onClick={executeProcessExit}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-[var(--ui-radius-small)] bg-rose-600 hover:bg-rose-700 text-white text-xs font-black transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                {isSubmitting ? <RefreshCw size={14} className="animate-spin" /> : <UserMinus size={14} />}
                <span>{isSubmitting ? 'Memproses...' : 'Ya, Proses Keluar'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🔄 Modal Konfirmasi Pembatalan Status Keluar */}
      {confirmModal === 'restore' && targetRestoreStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-[var(--ui-radius-card)] border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-[var(--ui-radius-small)] bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shrink-0">
                <RotateCcw size={20} />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">Batalkan Status Keluar</h3>
                <p className="text-xs text-slate-500">Kembalikan siswa ke daftar siswa aktif</p>
              </div>
            </div>

            <div className="p-3.5 bg-emerald-50/60 border border-emerald-200/80 rounded-[var(--ui-radius-small)] space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Nama Siswa:</span>
                <span className="font-extrabold text-slate-900">{targetRestoreStudent.nama}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">NIS:</span>
                <span className="font-mono font-bold text-slate-800">{targetRestoreStudent.nis}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Kelas Terakhir:</span>
                <span className="font-bold text-slate-800">{targetRestoreStudent.kelas_terakhir || 'Umum'}</span>
              </div>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Status keluar untuk siswa ini akan dibatalkan, dan data siswa akan kembali aktif di sistem akademik sekolah.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => { setConfirmModal(null); setTargetRestoreStudent(null); }}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-[var(--ui-radius-small)] border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-extrabold transition-all cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={executeRestoreStudent}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-[var(--ui-radius-small)] bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                {isSubmitting ? <RefreshCw size={14} className="animate-spin" /> : <RotateCcw size={14} />}
                <span>{isSubmitting ? 'Memulihkan...' : 'Ya, Pulihkan Siswa'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🔔 Floating Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-[var(--ui-radius-card)] shadow-sm font-bold text-xs flex items-center gap-2.5 animate-in slide-in-from-bottom-5 text-white ${toast.type === 'error' ? 'bg-rose-600 shadow-rose-900/20' : 'bg-emerald-600 shadow-emerald-900/20'} z-50`}>
          {toast.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />} 
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}
