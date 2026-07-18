import { Button } from '../../../components/ui.jsx';
import { useState, useEffect, useMemo } from'react';
import { UserMinus } from'lucide-react';
import useAuthStore from'../../../store/monitoring/authStore.js';
import { Search, RotateCcw, AlertCircle, CheckCircle2 } from'lucide-react';
import { PageHeader } from '../../../components/monitoring/ui/index.js';
;
import { UISelect } from'../../../components/ui.jsx';


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
    alasan:'Pindah Sekolah',
    keterangan:''
  });

  const [toast, setToast] = useState(null);
  const authToken = useAuthStore(state => state.user?.authToken);

  const showToast = (message, type ='success') => {
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
      showToast('Gagal memuat data','error');
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
    ).slice(0, 5); // limit to 5 suggestions
  }, [activeStudents, searchTerm]);

  // Exited students log list search
  const filteredHistory = useMemo(() => {
    return exitedStudents.filter(s => 
      s.nama?.toLowerCase().includes(historySearchTerm.toLowerCase()) || 
      s.nis?.includes(historySearchTerm) ||
      s.kelas_terakhir?.toLowerCase().includes(historySearchTerm.toLowerCase())
    );
  }, [exitedStudents, historySearchTerm]);

  // Chart summary reasons count
  const reasonStats = useMemo(() => {
    const stats = {'Pindah Sekolah': 0,'Mengundurkan Diri': 0,'Dikeluarkan': 0,'Lainnya': 0 };
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
    if (!selectedStudent) return showToast('Pilih siswa aktif terlebih dahulu','error');
    if (!exitForm.tanggal_keluar) return showToast('Pilih tanggal keluar','error');

    if (!await window.confirmAsync(`Apakah Anda yakin ingin memproses pengeluaran siswa ${selectedStudent.namaSiswa || selectedStudent.name}?\nSiswa ini akan dihapus dari daftar kelas aktif.`)) return;

    try {
      const res = await fetch('/api/siswa-keluar', {
        method:'POST',
        headers: {'Content-Type':'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({
          action:'keluar',
          nis: selectedStudent.nis,
          nama: selectedStudent.namaSiswa || selectedStudent.name,
          kelas_terakhir: selectedStudent.class_name ||'Umum',
          tanggal_keluar: exitForm.tanggal_keluar,
          alasan: exitForm.alasan,
          keterangan: exitForm.keterangan
        })
      });
      const data = await res.json();
      if (data.ok) {
        showToast('Siswa berhasil dicatat keluar!');
        setSelectedStudent(null);
        setSearchTerm('');
        setExitForm({
          tanggal_keluar: new Date().toISOString().split('T')[0],
          alasan:'Pindah Sekolah',
          keterangan:''
        });
        fetchData();
      } else {
        showToast(data.error ||'Gagal memproses pengeluaran','error');
      }
    } catch (e) {
      console.error(e);
      showToast('Gagal memproses pengeluaran','error');
    }
  };

  const handleCancelExit = async (nis, name) => {
    if (!await window.confirmAsync(`Batalkan status keluar untuk siswa ${name}?\nSiswa ini akan dikembalikan ke daftar siswa aktif.`)) return;

    try {
      const res = await fetch('/api/siswa-keluar', {
        method:'POST',
        headers: {'Content-Type':'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ action:'batal', nis })
      });
      const data = await res.json();
      if (data.ok) {
        showToast('Status keluar berhasil dibatalkan. Siswa telah aktif kembali!');
        fetchData();
      } else {
        showToast(data.error ||'Gagal membatalkan status keluar','error');
      }
    } catch (e) {
      console.error(e);
      showToast('Gagal membatalkan status keluar','error');
    }
  };

  return (
    <div className="space-y-6 relative animate-in fade-in duration-300 z-10">
      <PageHeader 
        title="Pendataan Siswa Keluar"
        description="Mencatat dan mendata siswa yang mutasi pindah sekolah, mengundurkan diri, atau dikeluarkan."
        icon={UserMinus}
      />

      {/* Grid Utama */}
      <div className="grid grid-cols-1 lg:grid-cols-[380px,1fr] gap-6">
        
        {/* Kolom Kiri: Form Keluar */}
        <div className="ui-card p-5 space-y-5 h-fit">
          <h3 className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-3">Formulir Keluar</h3>
          
          <form onSubmit={handleProcessExit} className="space-y-4">
            {/* Input Siswa Autocomplete */}
            <div className="relative">
              <label className="block text-xs font-bold text-slate-500 mb-1">Cari &amp; Pilih Siswa</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                <input 
                  value={searchTerm} 
                  onChange={e => {
                    setSearchTerm(e.target.value);
                    if (selectedStudent && e.target.value !== (selectedStudent.namaSiswa || selectedStudent.name)) {
                      setSelectedStudent(null);
                    }
                  }} 
                  placeholder="Nama atau NIS..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border-none rounded-[var(--ui-radius-small)] text-sm focus:outline-none focus:border-[var(--ui-primary)]" 
                />
              </div>

              {/* Autocomplete Suggestions */}
              {filteredActive.length > 0 && !selectedStudent && (
                <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-[var(--ui-radius-small)] shadow-lg z-20 max-h-48 overflow-y-auto">
                  {filteredActive.map(s => (
                    <Button variant="outline"
                      key={s.nis}
                      type="button"
                      onClick={() =>{
                        setSelectedStudent(s);
                        setSearchTerm(s.namaSiswa || s.name);
                      }}
                      className="w-full text-left flex items-center justify-between"
                    >
                      <span>{s.namaSiswa || s.name} ({s.nis})</span>
                      <span className="text-slate-400 font-bold">{s.class_name ||'Tanpa Kelas'}</span></Button>
                  ))}
                </div>
              )}
            </div>

            {selectedStudent && (
              <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg space-y-1 text-xs text-blue-900">
                <p className="font-extrabold">Siswa Terpilih:</p>
                <p className="font-semibold">{selectedStudent.namaSiswa || selectedStudent.name} ({selectedStudent.nis})</p>
                <p className="text-blue-700">Kelas Terakhir: {selectedStudent.class_name ||'Umum'}</p>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Tanggal Keluar</label>
              <input 
                type="date"
                required
                value={exitForm.tanggal_keluar} 
                onChange={e => setExitForm({ ...exitForm, tanggal_keluar: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border-none rounded-[var(--ui-radius-small)] text-sm" 
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Alasan Keluar</label>
              <UISelect 
                value={exitForm.alasan} 
                onChange={e => setExitForm({ ...exitForm, alasan: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border-none rounded-[var(--ui-radius-small)] text-sm font-semibold bg-white"
              >
                <option value="Pindah Sekolah">Pindah Sekolah (Mutasi Keluar)</option>
                <option value="Mengundurkan Diri">Mengundurkan Diri</option>
                <option value="Dikeluarkan">Dikeluarkan</option>
                <option value="Lainnya">Lainnya</option>
              </UISelect>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Keterangan / Tujuan</label>
              <textarea 
                rows="3"
                value={exitForm.keterangan} 
                onChange={e => setExitForm({ ...exitForm, keterangan: e.target.value })}
                placeholder="Contoh: Pindah ke SMKN 1 Jakarta Timur"
                className="w-full px-3 py-2 bg-slate-50 border-none rounded-[var(--ui-radius-small)] text-sm focus:outline-none focus:border-[var(--ui-primary)]" 
              />
            </div>

            <button type="submit" disabled={!selectedStudent} className="w-full flex items-center justify-center gap-2">
              <UserMinus size={16} /> Proses Siswa Keluar
            </button>
          </form>

          {/* Mini Chart Stats */}
          <div className="pt-4 border-t border-slate-100 space-y-3">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Statistik Pengeluaran</h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {[
                { label:'Pindah', value: reasonStats['Pindah Sekolah'], color:'bg-blue-500' },
                { label:'Mundur', value: reasonStats['Mengundurkan Diri'], color:'bg-amber-500' },
                { label:'Dikeluarkan', value: reasonStats['Dikeluarkan'], color:'bg-red-500' },
                { label:'Lainnya', value: reasonStats['Lainnya'], color:'bg-slate-400' },
              ].map(stat => (
                <div key={stat.label} className="p-2 bg-slate-50 rounded-lg flex flex-col justify-between">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">{stat.label}</span>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-sm font-black text-slate-700">{stat.value}</span>
                    <span className={`w-2 h-2 rounded-full ${stat.color}`} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Kolom Kanan: Daftar Riwayat Keluar */}
        <div className="ui-card p-6 space-y-4">
          <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3 border-b border-slate-100 pb-4">
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Arsip Siswa Keluar</h3>
              <p className="text-xs text-slate-500 mt-1">Total {exitedStudents.length} siswa keluar terdaftar di riwayat.</p>
            </div>
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input 
                value={historySearchTerm} 
                onChange={e => setHistorySearchTerm(e.target.value)} 
                placeholder="Cari arsip..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border-none rounded-[var(--ui-radius-small)] text-sm focus:outline-none focus:border-[var(--ui-primary)]" 
              />
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-150 rounded-[var(--ui-radius-small)]">
            <table className="w-full text-sm">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 font-bold text-left">Nama Siswa</th>
                  <th className="px-6 py-4 font-bold text-left">NIS</th>
                  <th className="px-6 py-4 font-bold text-left">Kelas Terakhir</th>
                  <th className="px-6 py-4 font-bold text-left">Alasan</th>
                  <th className="px-6 py-4 font-bold text-left">Keterangan / Tujuan</th>
                  <th className="px-6 py-4 font-bold text-left">Tanggal Keluar</th>
                  <th className="px-6 py-4 font-bold text-right w-24">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={7} className="px-6 py-8 text-center text-slate-400">Memuat arsip siswa...</td></tr>
                ) : filteredHistory.length === 0 ? (
                  <tr><td colSpan={7} className="px-6 py-8 text-center text-slate-400">Tidak ada riwayat siswa keluar.</td></tr>
                ) : (
                  filteredHistory.map(student => (
                    <tr key={student.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-800">{student.nama}</td>
                      <td className="px-6 py-4 font-mono text-xs text-slate-500">{student.nis}</td>
                      <td className="px-6 py-4 text-slate-600">{student.kelas_terakhir}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-0.5 rounded-[var(--ui-radius-small)] text-xs font-bold ${
                          student.alasan ==='Dikeluarkan' ?'bg-red-100 text-red-800' :
                          student.alasan ==='Mengundurkan Diri' ?'bg-amber-100 text-amber-800' :
                          student.alasan ==='Pindah Sekolah' ?'bg-blue-100 text-blue-800' :'bg-slate-100 text-slate-800'
                        }`}>
                          {student.alasan}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-500 text-xs">{student.keterangan ||'-'}</td>
                      <td className="px-6 py-4 text-slate-600">
                        {new Date(student.tanggal_keluar).toLocaleDateString('id-ID', {
                          day:'2-digit',
                          month:'short',
                          year:'numeric'
                        })}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button variant="outline"
                          onClick={() =>handleCancelExit(student.nis, student.nama)}
                          className="flex items-center gap-1"
                          title="Batalkan & aktifkan kembali"
                        >
                          <RotateCcw size={12} /> Batal</Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {toast && (
        <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-[var(--ui-radius-small)] shadow-sm font-medium text-sm flex items-center gap-2 animate-in slide-in-from-bottom-5 text-white ${toast.type ==='error' ?'bg-red-600' :'bg-emerald-600'} z-50`}>
          {toast.type ==='error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />} {toast.message}
        </div>
      )}
    </div>
  );
}
