import { useState, useEffect, useMemo } from 'react';
import { 
  UserMinus, Search, RotateCcw, AlertCircle, CheckCircle2, 
  User, Calendar, FileText, ArrowRight, X, ShieldAlert,
  LogOut, Filter, Info, Sparkles
} from 'lucide-react';
import useAuthStore from '../../../store/monitoring/authStore.js';
import { PageHeader } from '../../../components/monitoring/ui/index.js';
import { UISelect } from '../../../components/ui.jsx';

export default function SiswaKeluar() {
  const [exitedStudents, setExitedStudents] = useState([]);
  const [activeStudents, setActiveStudents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [historySearchTerm, setHistorySearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  
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
    setTimeout(() => setToast(null), 3500);
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
      showToast('Gagal memuat data', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [authToken]);

  // Search autocomplete for active students
  const filteredActive = useMemo(() => {
    if (!searchTerm.trim()) return [];
    return activeStudents.filter(s => 
      s.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      s.namaSiswa?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      s.nis?.includes(searchTerm)
    ).slice(0, 6);
  }, [activeStudents, searchTerm]);

  // Exited students log list search
  const filteredHistory = useMemo(() => {
    if (!historySearchTerm.trim()) return exitedStudents;
    const term = historySearchTerm.toLowerCase();
    return exitedStudents.filter(s => 
      s.nama?.toLowerCase().includes(term) || 
      s.nis?.includes(term) ||
      s.kelas_terakhir?.toLowerCase().includes(term) ||
      s.alasan?.toLowerCase().includes(term) ||
      s.keterangan?.toLowerCase().includes(term)
    );
  }, [exitedStudents, historySearchTerm]);

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

  const handleProcessExit = async (e) => {
    e.preventDefault();
    if (!selectedStudent) return showToast('Pilih siswa aktif terlebih dahulu', 'error');
    if (!exitForm.tanggal_keluar) return showToast('Pilih tanggal keluar', 'error');

    const studentName = selectedStudent.namaSiswa || selectedStudent.name;
    if (!window.confirm(`Apakah Anda yakin ingin memproses pengeluaran siswa "${studentName}"?\nSiswa ini akan dipindahkan ke arsip riwayat siswa keluar.`)) return;

    try {
      const res = await fetch('/api/siswa-keluar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({
          action: 'keluar',
          nis: selectedStudent.nis,
          nama: studentName,
          kelas_terakhir: selectedStudent.class_name || 'Umum',
          tanggal_keluar: exitForm.tanggal_keluar,
          alasan: exitForm.alasan,
          keterangan: exitForm.keterangan
        })
      });
      const data = await res.json();
      if (data.ok) {
        showToast(`Siswa ${studentName} berhasil dicatat keluar!`);
        setSelectedStudent(null);
        setSearchTerm('');
        setExitForm({
          tanggal_keluar: new Date().toISOString().split('T')[0],
          alasan: 'Pindah Sekolah',
          keterangan: ''
        });
        fetchData();
      } else {
        showToast(data.error || 'Gagal memproses pengeluaran', 'error');
      }
    } catch (e) {
      console.error(e);
      showToast('Gagal memproses pengeluaran', 'error');
    }
  };

  const handleCancelExit = async (nis, name) => {
    if (!window.confirm(`Batalkan status keluar untuk siswa "${name}"?\nSiswa ini akan dikembalikan ke daftar siswa aktif.`)) return;

    try {
      const res = await fetch('/api/siswa-keluar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ action: 'batal', nis })
      });
      const data = await res.json();
      if (data.ok) {
        showToast(`Status keluar ${name} berhasil dibatalkan. Siswa aktif kembali!`);
        fetchData();
      } else {
        showToast(data.error || 'Gagal membatalkan status keluar', 'error');
      }
    } catch (e) {
      console.error(e);
      showToast('Gagal membatalkan status keluar', 'error');
    }
  };

  return (
    <div className="space-y-6 relative animate-in fade-in duration-300 z-10 max-w-7xl mx-auto pb-10">
      
      {/* 🟢 Modern Hero Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 text-white p-6 sm:p-8 shadow-xl shadow-emerald-950/10 border border-emerald-500/30">
        {/* Background Decorative Glow */}
        <div className="absolute -right-10 -top-10 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute left-1/2 -bottom-10 w-48 h-48 bg-teal-400/20 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3.5 bg-white/15 backdrop-blur-md rounded-2xl border border-white/20 shadow-inner shrink-0">
              <UserMinus className="w-8 h-8 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/20 text-white border border-white/25">
                  Administrasi Kesiswaan
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-1">
                Pendataan Siswa Keluar
              </h1>
              <p className="text-xs sm:text-sm text-emerald-100/90 font-medium mt-0.5">
                Pencatatan mutasi pindah sekolah, pengunduran diri, atau siswa non-aktif.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/15 self-stretch sm:self-auto justify-between sm:justify-start">
            <div className="text-right">
              <div className="text-[10px] uppercase font-bold text-emerald-200">Total Mutasi Keluar</div>
              <div className="text-lg font-black text-white">{exitedStudents.length} Siswa</div>
            </div>
            <Sparkles className="w-5 h-5 text-amber-300 shrink-0 ml-2" />
          </div>
        </div>
      </div>

      {/* 🔴 Main Grid Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* 📋 Kolom Kiri: Form Keluar & KPI Stats (4 Cols on LG) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Card Form */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  <FileText size={18} />
                </div>
                <h3 className="font-extrabold text-slate-800 text-sm">Formulir Keluar</h3>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 uppercase">
                Input Data
              </span>
            </div>
            
            <form onSubmit={handleProcessExit} className="space-y-4">
              
              {/* Autocomplete Input Siswa */}
              <div className="relative">
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span>Cari &amp; Pilih Siswa <span className="text-rose-500">*</span></span>
                  {selectedStudent && (
                    <button 
                      type="button" 
                      onClick={() => { setSelectedStudent(null); setSearchTerm(''); }} 
                      className="text-[10px] text-rose-600 hover:underline font-bold flex items-center gap-1"
                    >
                      <X size={10} /> Reset
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
                    placeholder="Ketik Nama atau NIS siswa..."
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 placeholder:text-slate-400 placeholder:font-normal focus:outline-none focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 transition-all" 
                  />
                </div>

                {/* Autocomplete Suggestions Dropdown */}
                {filteredActive.length > 0 && !selectedStudent && (
                  <div className="absolute left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl z-30 max-h-56 overflow-y-auto divide-y divide-slate-100 animate-in fade-in duration-150">
                    {filteredActive.map(s => (
                      <button
                        key={s.nis}
                        type="button"
                        onClick={() => {
                          setSelectedStudent(s);
                          setSearchTerm(s.namaSiswa || s.name);
                        }}
                        className="w-full text-left p-3 hover:bg-emerald-50/70 transition-colors flex items-center justify-between group cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 font-bold text-xs flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                            <User size={14} />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-slate-800 group-hover:text-emerald-950">
                              {s.namaSiswa || s.name}
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono">NIS: {s.nis}</div>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 group-hover:bg-emerald-200 group-hover:text-emerald-800 transition-colors">
                          {s.class_name || 'Tanpa Kelas'}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Box Info Siswa Terpilih */}
              {selectedStudent && (
                <div className="p-3.5 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between shadow-2xs animate-in zoom-in-95 duration-200">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black text-sm shadow-xs shrink-0">
                      {(selectedStudent.namaSiswa || selectedStudent.name || 'S').charAt(0)}
                    </div>
                    <div>
                      <div className="text-xs font-extrabold text-emerald-950">
                        {selectedStudent.namaSiswa || selectedStudent.name}
                      </div>
                      <div className="text-[10px] font-semibold text-emerald-700 flex items-center gap-2 mt-0.5">
                        <span className="font-mono bg-emerald-200/60 px-1.5 py-0.2 rounded">NIS: {selectedStudent.nis}</span>
                        <span>•</span>
                        <span>Kelas: {selectedStudent.class_name || 'Umum'}</span>
                      </div>
                    </div>
                  </div>
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                </div>
              )}

              {/* Tanggal Keluar */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Tanggal Keluar <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input 
                    type="date"
                    required
                    value={exitForm.tanggal_keluar} 
                    onChange={e => setExitForm({ ...exitForm, tanggal_keluar: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 transition-all" 
                  />
                </div>
              </div>

              {/* Alasan Keluar */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Alasan Keluar <span className="text-rose-500">*</span>
                </label>
                <UISelect 
                  value={exitForm.alasan} 
                  onChange={e => setExitForm({ ...exitForm, alasan: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 transition-all"
                >
                  <option value="Pindah Sekolah">Pindah Sekolah (Mutasi Keluar)</option>
                  <option value="Mengundurkan Diri">Mengundurkan Diri</option>
                  <option value="Dikeluarkan">Dikeluarkan</option>
                  <option value="Lainnya">Lainnya</option>
                </UISelect>
              </div>

              {/* Keterangan / Tujuan */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Keterangan / Sekolah Tujuan
                </label>
                <textarea 
                  rows="3"
                  value={exitForm.keterangan} 
                  onChange={e => setExitForm({ ...exitForm, keterangan: e.target.value })}
                  placeholder="Contoh: Pindah ke SMKN 1 Jakarta Timur / Ikut Orang Tua"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 placeholder:text-slate-400 placeholder:font-normal focus:outline-none focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 transition-all resize-none" 
                />
              </div>

              {/* Submit Button */}
              <button 
                type="submit" 
                disabled={!selectedStudent} 
                className="w-full py-3 px-5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-sm rounded-xl shadow-lg shadow-emerald-600/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
              >
                <UserMinus size={18} /> Proses Siswa Keluar
              </button>
            </form>
          </div>

          {/* 📊 Statistik Pengeluaran KPI Grid */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-sm space-y-3">
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span>Statistik Pengeluaran</span>
              <Info size={14} className="text-slate-400" />
            </h4>
            <div className="grid grid-cols-2 gap-2.5">
              {[
                { label: 'Pindah Sekolah', count: reasonStats['Pindah Sekolah'], bg: 'bg-blue-50/80 border-blue-200/70 text-blue-900', dot: 'bg-blue-500' },
                { label: 'Mundur', count: reasonStats['Mengundurkan Diri'], bg: 'bg-amber-50/80 border-amber-200/70 text-amber-900', dot: 'bg-amber-500' },
                { label: 'Dikeluarkan', count: reasonStats['Dikeluarkan'], bg: 'bg-rose-50/80 border-rose-200/70 text-rose-900', dot: 'bg-rose-500' },
                { label: 'Lainnya', count: reasonStats['Lainnya'], bg: 'bg-slate-50/80 border-slate-200/70 text-slate-900', dot: 'bg-slate-400' },
              ].map(stat => (
                <div key={stat.label} className={`p-3 rounded-2xl border ${stat.bg} flex flex-col justify-between transition-transform hover:scale-[1.02]`}>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">{stat.label}</span>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-lg font-black">{stat.count}</span>
                    <span className={`w-2.5 h-2.5 rounded-full ${stat.dot} shadow-2xs`} />
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* 📑 Kolom Kanan: Daftar Riwayat Keluar (8 Cols on LG) */}
        <div className="lg:col-span-8 bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-sm space-y-4">
          
          {/* Header & Filter Bar */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-4">
            <div>
              <h3 className="font-black text-slate-800 text-base flex items-center gap-2">
                <span>Arsip Riwayat Siswa Keluar</span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800">
                  {exitedStudents.length} Data
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Daftar seluruh siswa yang telah diproses mutasi keluar atau non-aktif.
              </p>
            </div>

            {/* Instant Search Bar */}
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
              <input 
                type="text"
                value={historySearchTerm} 
                onChange={e => setHistorySearchTerm(e.target.value)} 
                placeholder="Cari arsip nama, NIS, kelas..."
                className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all" 
              />
              {historySearchTerm && (
                <button 
                  type="button" 
                  onClick={() => setHistorySearchTerm('')} 
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* 💻 Desktop Table View (Hidden on Mobile) */}
          <div className="hidden md:block overflow-hidden border border-slate-200/80 rounded-2xl shadow-2xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/90 border-b border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3.5">Nama Siswa</th>
                  <th className="px-3 py-3.5 font-mono">NIS</th>
                  <th className="px-3 py-3.5">Kelas Terakhir</th>
                  <th className="px-3 py-3.5">Alasan</th>
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
                        <span>Memuat arsip riwayat...</span>
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
                          {historySearchTerm ? `Tidak ada pencarian yang cocok dengan "${historySearchTerm}"` : 'Belum ada siswa yang dicatat mutasi keluar.'}
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredHistory.map(student => (
                    <tr key={student.id || student.nis} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="px-4 py-3.5 font-extrabold text-slate-800">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-black text-xs shrink-0">
                            {student.nama?.charAt(0) || 'S'}
                          </div>
                          <span className="truncate max-w-[150px]" title={student.nama}>{student.nama}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3.5 font-mono text-slate-500 font-bold">{student.nis}</td>
                      <td className="px-3 py-3.5 font-bold text-slate-700">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200/60 text-[11px]">
                          {student.kelas_terakhir || 'Umum'}
                        </span>
                      </td>
                      <td className="px-3 py-3.5">
                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide border shadow-2xs ${
                          student.alasan === 'Dikeluarkan' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                          student.alasan === 'Mengundurkan Diri' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                          student.alasan === 'Pindah Sekolah' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-slate-100 text-slate-700 border-slate-200'
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
                          onClick={() => handleCancelExit(student.nis, student.nama)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-200 bg-emerald-50/60 text-emerald-700 hover:bg-emerald-600 hover:text-white font-extrabold text-xs shadow-2xs active:scale-95 transition-all cursor-pointer"
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
              <div className="py-10 text-center text-slate-400 p-4 border border-dashed border-slate-200 rounded-2xl">
                <UserMinus className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <div className="font-extrabold text-slate-600 text-xs">Tidak ada riwayat siswa keluar</div>
              </div>
            ) : (
              filteredHistory.map(student => (
                <div key={student.id || student.nis} className="p-4 bg-slate-50/80 border border-slate-200 rounded-2xl space-y-3 shadow-2xs">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                        {student.nama?.charAt(0) || 'S'}
                      </div>
                      <div>
                        <div className="font-extrabold text-slate-900 text-sm">{student.nama}</div>
                        <div className="text-[10px] text-slate-500 font-mono">NIS: {student.nis} • Kelas: {student.kelas_terakhir || 'Umum'}</div>
                      </div>
                    </div>
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-black uppercase border shrink-0 ${
                      student.alasan === 'Dikeluarkan' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                      student.alasan === 'Mengundurkan Diri' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                      student.alasan === 'Pindah Sekolah' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-slate-100 text-slate-700 border-slate-200'
                    }`}>
                      {student.alasan}
                    </span>
                  </div>

                  {student.keterangan && (
                    <div className="text-xs text-slate-600 bg-white p-2.5 rounded-xl border border-slate-200/60 font-medium">
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
                      onClick={() => handleCancelExit(student.nis, student.nama)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-200 bg-white text-emerald-700 font-extrabold text-xs shadow-2xs active:scale-95 transition-all"
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

      </div>

      {/* 🔔 Floating Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-2xl shadow-xl font-bold text-xs flex items-center gap-2.5 animate-in slide-in-from-bottom-5 text-white ${toast.type === 'error' ? 'bg-rose-600 shadow-rose-900/20' : 'bg-emerald-600 shadow-emerald-900/20'} z-50`}>
          {toast.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />} 
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}
