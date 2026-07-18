import { Button } from '../../../components/ui.jsx';
import { useState, useMemo, useEffect } from"react";
import { FileBarChart2, FileSpreadsheet, Calendar } from"lucide-react";
import * as XLSX from"xlsx";
import useAuthStore from"../../../store/monitoring/authStore";
import { Search, Filter, Download, Trash2, CheckCircle2, Clock, ChevronLeft, ChevronRight, AlertCircle } from'lucide-react';
import { PageHeader } from '../../../components/monitoring/ui/index.js';
;


/**
 * admin/LaporanAdmin.jsx
 * Halaman laporan — ekspor data kehadiran & jurnal per periode.
 * Dilengkapi dengan pagination (20 per halaman) dan pencarian.
 */






const LAPORAN_TYPES = [
  { key:"kehadiran", label:"Laporan Kehadiran", desc:"Rekap hadir/absen/izin per siswa", icon: Calendar },
  { key:"jurnal",    label:"Laporan Jurnal",    desc:"Daftar jurnal harian beserta status validasi", icon: FileBarChart2 },
  { key:"rekap_guru", label:"Rekap per Guru",   desc:"Statistik bimbingan per guru pembimbing", icon: FileSpreadsheet },
];

const PAGE_SIZE = 20;

const LaporanAdmin = ({ students = [], teachers = [] }) => {
  const user = useAuthStore(state => state.user);
  const isAdmin = user?.role ==="admin" || user?.role ==="superadmin";
  const [selectedType, setSelectedType] = useState("kehadiran");
  const [filterJurusan, setFilterJurusan] = useState("Semua");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [generating, setGenerating] = useState(false);
  const [pklStudentsMapping, setPklStudentsMapping] = useState([]);
  const [dataJurnal, setDataJurnal] = useState([]);
  const [toast, setToast] = useState(null);

  const showToast = (message, type ="success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Reset page saat tab/filter/search berubah
  useEffect(() => { setCurrentPage(1); }, [selectedType, filterJurusan, searchTerm]);

  useEffect(() => {
    const token = JSON.parse(sessionStorage.getItem("school_schedule_session_v1"))?.authToken;
    // Fetch logbooks
    fetch("/api/pkl/logbooks", { headers: { Authorization: `Bearer ${token}` } })
    .then(res => res.json()).then(data => { if(data.ok) setDataJurnal(data.data); }).catch(() => {});

    fetch("/api/monitoring/pkl-students", { headers: { Authorization: `Bearer ${token}` } })
    .then(res => res.json()).then(data => { if (data.ok && data.data) setPklStudentsMapping(data.data); }).catch(() => {});
  }, []);

  const mappedSiswa = useMemo(() => {
    return pklStudentsMapping.map(m => {
      const baseStudent = students.find(s => s.nis === m.nis) || {};
      return {
        ...m,
        nama: baseStudent.name ||'-',
        kelas: baseStudent.class_name ||'-',
        jurusan: baseStudent.class_name ? baseStudent.class_name.split('')[1] :'Umum',
        totalHadir: m.total_hadir || 0,
        totalAbsen: m.total_absen || 0,
        totalIzin: m.total_izin || 0,
        totalSakit: m.total_sakit || 0,
        totalHariKerja: (m.total_hadir || 0) + (m.total_absen || 0) + (m.total_izin || 0) + (m.total_sakit || 0),
        persenKehadiran: ((m.total_hadir || 0) + (m.total_absen || 0) + (m.total_izin || 0) + (m.total_sakit || 0)) > 0
          ? Math.round(((m.total_hadir || 0) / ((m.total_hadir || 0) + (m.total_absen || 0) + (m.total_izin || 0) + (m.total_sakit || 0))) * 100)
          : 0,
        guruPembimbingId: m.teacher_code
      };
    });
  }, [pklStudentsMapping, students]);

  
  const handleDeleteLog = async (nis) => {
    if(await window.confirmAsync('Yakin ingin menghapus data PKL siswa ini? Data absensi dan log akan ikut terhapus.')) {
      setPklStudentsMapping(prev => prev.filter(s => s.nis !== nis));
      const token = JSON.parse(sessionStorage.getItem('school_schedule_session_v1'))?.authToken;
      try {
        const res = await fetch('/api/pkl/students/' + nis, {
          method:'DELETE',
          headers: {'Authorization': `Bearer ${token}` }
        });
        if (res.ok) showToast("Data PKL siswa berhasil dihapus.");
        else showToast("Gagal menghapus data PKL.","error");
      } catch {
        showToast("Terjadi kesalahan sistem.","error");
      }
    }
  };

  const handleExport = async () => {
    setGenerating(true);
    await new Promise(r => setTimeout(r, 800));

    let wb = XLSX.utils.book_new();
    let ws, sheetName;

    if (selectedType ==='kehadiran') {
      const rows = mappedSiswa
        .filter(s => filterJurusan ==='Semua' || s.jurusan === filterJurusan)
        .map(s => ({'NIS': s.nis,'Nama Siswa': s.nama,'Kelas': s.kelas,'Jurusan': s.jurusan,'Total Hadir': s.totalHadir,'Total Absen': s.totalAbsen,'Total Izin': s.totalIzin,'Total Hari Kerja': s.totalHariKerja,'Persentase Kehadiran': `${s.persenKehadiran}%`,
        }));
      ws = XLSX.utils.json_to_sheet(rows);
      sheetName ='Laporan Kehadiran';
    } else if (selectedType ==='jurnal') {
      const rows = dataJurnal.map(j => {
        const s = mappedSiswa.find(x => x.nis === j.student_nis);
        return {'Nama Siswa': s?.nama ||'-','Kelas': s?.kelas ||'-','Tanggal': j.date,'Kegiatan': j.activity,'Kendala': j.problems,'Solusi': j.solutions,'Jam Masuk': j.time_in,'Jam Keluar': j.time_out,'Status': j.status,'Catatan Guru': j.notes ||'-',
        };
      });
      ws = XLSX.utils.json_to_sheet(rows);
      sheetName ='Laporan Jurnal';
    } else {
      const rows = teachers.map(g => {
        const siswaGuru = mappedSiswa.filter(s => s.guruPembimbingId === g.code);
        const rataHadir = siswaGuru.length
          ? (siswaGuru.reduce((a, s) => a + s.persenKehadiran, 0) / siswaGuru.length).toFixed(1)
          :'-';
        return {'Nama Guru': g.name,'Jurusan': g.preferredMajor,'Kategori': g.type,'Jumlah Siswa Bimbingan': siswaGuru.length,'Rata-rata Kehadiran Siswa': rataHadir + (rataHadir !=='-' ?'%' :''),
        };
      });
      ws = XLSX.utils.json_to_sheet(rows);
      sheetName ='Rekap Per Guru';
    }

    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, `PKL_${sheetName.replace(/\s/g,'_')}_${new Date().toISOString().slice(0,10)}.xlsx`);
    setGenerating(false);
  };  const jurusanOptions = useMemo(() => {
    return ["Semua", ...Array.from(new Set(mappedSiswa.map(s => s.jurusan))).filter(Boolean)];
  }, [mappedSiswa]);

  // === Filter + Pagination ===
  const filteredSiswa = useMemo(() => {
    let data = mappedSiswa.filter(s => filterJurusan ==="Semua" || s.jurusan === filterJurusan);
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      data = data.filter(s => s.nama?.toLowerCase().includes(q) || String(s.nis).includes(q));
    }
    return data;
  }, [mappedSiswa, filterJurusan, searchTerm]);

  const filteredJurnal = useMemo(() => {
    let data = dataJurnal.filter(j => {
      const s = mappedSiswa.find(x => x.nis === j.student_nis);
      return filterJurusan ==="Semua" || (s && s.jurusan === filterJurusan);
    });
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      data = data.filter(j => {
        const s = mappedSiswa.find(x => x.nis === j.student_nis);
        return s?.nama?.toLowerCase().includes(q) ||
          (j.activity || j.kegiatan ||"").toLowerCase().includes(q);
      });
    }
    return data;
  }, [dataJurnal, mappedSiswa, filterJurusan, searchTerm]);

  const filteredGuru = useMemo(() => {
    let data = teachers.filter(g => filterJurusan ==="Semua" || g.preferredMajor === filterJurusan || g.preferredMajor ==="Semua");
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      data = data.filter(g => g.name?.toLowerCase().includes(q));
    }
    return data;
  }, [teachers, filterJurusan, searchTerm]);

  // Aktif dataset berdasarkan tab
  const activeData = selectedType ==="kehadiran" ? filteredSiswa
    : selectedType ==="jurnal" ? filteredJurnal
    : filteredGuru;

  const totalPages = Math.max(1, Math.ceil(activeData.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const pagedData = activeData.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  // Legacy aliases untuk render
  const previewSiswa = selectedType ==="kehadiran" ? pagedData : [];
  const previewJurnal = selectedType ==="jurnal" ? pagedData : [];
  const previewGuru = selectedType ==="rekap_guru" ? pagedData : [];

  const tabs = LAPORAN_TYPES.map(t => ({
    id: t.key,
    label: t.label,
    icon: t.icon
  }));

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        icon={FileBarChart2}
        title="Monitoring PKL"
        description="Pantau aktivitas, absensi, lokasi, dan laporan."
        tabs={tabs}
        activeTab={selectedType}
        onTabChange={setSelectedType}
      />

      <div className="flex flex-col 2xl:flex-row gap-6 w-full items-start">
        {/* Left Sidebar */}
        <div className="w-full 2xl:w-64 flex-shrink-0 flex flex-col space-y-4">
          <div className="ui-card overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-bold text-slate-800 text-sm">Filter Data</h3>
            </div>
            <div className="p-4 space-y-4">
              {/* Search */}
              <div>
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 mb-2">
                  <Search size={14} /> Cari
                </label>
                <div className="relative">
                  <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder={selectedType ==="rekap_guru" ?"Nama guru..." :"Nama / NIS..."}
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[var(--ui-primary)]/30"
                  />
                </div>
              </div>
              {/* Jurusan filter */}
              <div>
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 mb-2">
                  <Filter size={14} /> Jurusan
                </label>
                <div className="flex flex-wrap gap-2">
                  {jurusanOptions.map(j => (
                    <Button variant="outline" key={j} onClick={() =>setFilterJurusan(j)}
                      >{j}</Button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        
          <div className="flex-1 bg-slate-50 border-none rounded-[var(--ui-radius-small)] p-5 flex flex-col justify-center items-center text-center opacity-80 min-h-[120px]">
            <h4 className="font-bold text-slate-800 text-sm mb-1">Total: {activeData.length} data</h4>
            <p className="text-xs text-slate-500">Hal {safePage} dari {totalPages}</p>
          </div>
        </div>

      {/* Right Content: Preview */}
      <div className="ui-card flex-1 flex flex-col">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-white z-10 shrink-0">
            <div>
              <h2 className="font-bold text-slate-800 text-lg">Pratinjau Data</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {activeData.length} {selectedType ==="kehadiran" ?"siswa" : selectedType ==="jurnal" ?"jurnal" :"guru"}
                {activeData.length > PAGE_SIZE && ` — hal ${safePage}/${totalPages}`}
              </p>
            </div>
          <button onClick={handleExport} disabled={generating}
            className="flex items-center gap-1.5">
            {generating ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Download size={16} />}
            {generating ?'Memproses...' :'Ekspor Excel'}
          </button>
        </div>

        <div className="flex-1 overflow-auto custom-scrollbar">
          {selectedType ==='kehadiran' && (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-slate-50 shadow-sm z-10">
                <tr className="text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                  <th className="px-5 py-3 text-left font-bold">Siswa</th>
                  <th className="px-5 py-3 text-center font-bold">Hadir</th>
                  <th className="px-5 py-3 text-center font-bold">Izin / Sakit</th>
                  <th className="px-5 py-3 text-center font-bold">Alpa</th>
                  <th className="px-5 py-3 text-center font-bold">Persentase</th>
                  {isAdmin && <th className="px-5 py-3 text-center font-bold">Aksi</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {previewSiswa.length === 0 ? (
                  <tr><td colSpan={isAdmin ? 6 : 5} className="px-5 py-8 text-center text-slate-400 text-sm">Tidak ada data siswa untuk jurusan ini.</td></tr>
                ) : previewSiswa.map(s => (
                  <tr key={s.nis} className="hover:bg-slate-50/50 border-b border-slate-50 last:border-0">
                    <td className="px-5 py-3">
                      <p className="font-bold text-slate-800">{s.nama}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{s.nis} - {s.kelas}</p>
                    </td>
                    <td className="px-5 py-3 text-center font-bold text-emerald-600">{s.totalHadir || 0}</td>
                    <td className="px-5 py-3 text-center font-bold text-amber-500">{(s.totalIzin || 0) + (s.totalSakit || 0)}</td>
                    <td className="px-5 py-3 text-center font-bold text-red-500">{s.totalAbsen || 0}</td>
                    <td className="px-5 py-3 text-center">
                      <span className={`px-2 py-1 rounded-[var(--ui-radius-small)] text-xs font-bold ${s.persenKehadiran >= 80 ?'bg-emerald-100 text-emerald-700' :'bg-red-100 text-red-700'}`}>
                        {s.persenKehadiran || 0}%
                      </span>
                    </td>
                    {isAdmin && (
                      <td className="px-5 py-3 text-center">
                        <Button variant="outline" onClick={() =>handleDeleteLog(s.nis)} className="inline-flex items-center justify-center cursor-pointer">
                          <Trash2 size={14} /></Button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {selectedType ==='jurnal' && (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-slate-50 shadow-sm z-10">
                <tr className="text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                  <th className="px-5 py-3 text-left font-bold">Tanggal</th>
                  <th className="px-5 py-3 text-left font-bold">Siswa</th>
                  <th className="px-5 py-3 text-left font-bold">Kegiatan</th>
                  <th className="px-5 py-3 text-center font-bold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {previewJurnal.length === 0 ? (
                  <tr><td colSpan="4" className="px-5 py-8 text-center text-slate-400 text-sm">Tidak ada data jurnal.</td></tr>
                ) : previewJurnal.map(j => {
                  const s = mappedSiswa.find(x => x.nis === j.student_nis) || {};
                  return (
                    <tr key={j.id} className="hover:bg-slate-50/50 border-b border-slate-50 last:border-0">
                      <td className="px-5 py-3 text-xs font-medium text-slate-600 whitespace-nowrap">{j.date || j.tanggal}</td>
                      <td className="px-5 py-3">
                        <p className="font-bold text-slate-800">{s.nama ||'Siswa Unknown'}</p>
                        <p className="text-xs text-slate-500">{s.kelas ||'-'}</p>
                      </td>
                      <td className="px-5 py-3 text-xs text-slate-700 line-clamp-2 max-w-xs">{j.activity || j.kegiatan}</td>
                      <td className="px-5 py-3 text-center">
                        {j.status ==='approved' ? (
                           <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-700 rounded-[var(--ui-radius-small)] text-[10px] font-bold"><CheckCircle2 size={12}/> Acc</span>
                        ) : j.status ==='pending' ? (
                           <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 rounded-[var(--ui-radius-small)] text-[10px] font-bold"><Clock size={12}/> Pending</span>
                        ) : (
                           <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 text-slate-700 rounded-[var(--ui-radius-small)] text-[10px] font-bold">Review</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}

          {selectedType ==='rekap_guru' && (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-slate-50 shadow-sm z-10">
                <tr className="text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                  <th className="px-5 py-3 text-left font-bold">Guru Pembimbing</th>
                  <th className="px-5 py-3 text-left font-bold">Jurusan</th>
                  <th className="px-5 py-3 text-center font-bold">Siswa Bimbingan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {previewGuru.length === 0 ? (
                  <tr><td colSpan="3" className="px-5 py-8 text-center text-slate-400 text-sm">Tidak ada data guru pembimbing.</td></tr>
                ) : previewGuru.map(g => {
                  const siswaBimbingan = mappedSiswa.filter(s => s.guruPembimbingId === g.code).length;
                  return (
                    <tr key={g.code} className="hover:bg-slate-50/50 border-b border-slate-50 last:border-0">
                      <td className="px-5 py-3 font-bold text-slate-800 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-xs uppercase">{g.name?.substring(0,2) ||'G'}</div>
                        {g.name}
                      </td>
                      <td className="px-5 py-3 text-xs font-semibold text-slate-600">{g.preferredMajor}</td>
                      <td className="px-5 py-3 text-center">
                        <span className="inline-flex items-center justify-center min-w-[2rem] px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded-[var(--ui-radius-small)] text-xs font-bold border border-blue-100">
                          {siswaBimbingan}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="px-5 py-3 border-t border-slate-100 bg-white flex items-center justify-between gap-4 shrink-0">
            <p className="text-xs text-slate-500">
              {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, activeData.length)} dari {activeData.length} data
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline"
                onClick={() =>setCurrentPage(p => Math.max(1, p - 1))}
                disabled={safePage <= 1}
                
              >
                <ChevronLeft size={16} className="text-slate-600" /></Button>
              <span className="text-xs font-bold text-slate-700 px-2">{safePage} / {totalPages}</span>
              <Button variant="outline"
                onClick={() =>setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={safePage >= totalPages}
                
              >
                <ChevronRight size={16} className="text-slate-600" /></Button>
            </div>
          </div>
        )}
      </div>
      </div>
      {toast && (
        <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-[var(--ui-radius-small)] shadow-lg font-medium text-sm flex items-center gap-2 animate-in slide-in-from-bottom-5 text-white z-[100] ${toast.type ==='error' ?'bg-red-600' :'bg-emerald-600'}`}>
          {toast.type ==='error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />} {toast.message}
        </div>
      )}
    </div>
  );
};

export default LaporanAdmin;
