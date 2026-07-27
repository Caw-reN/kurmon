import { Button, TablePagination } from '../../../components/ui.jsx';
import { useState, useMemo, useEffect, useRef } from'react';
import { useNavigate } from'react-router-dom';
import { Users, CheckCircle2, XCircle } from'lucide-react';
import * as XLSX from'xlsx';
import useAuthStore from'../../../store/monitoring/authStore';
import { getDatabaseSnapshot, setDatabaseSnapshot } from'../../../utils/dataSource';
import { ChevronDown, Settings, Save, Upload, Download, Search, Badge, ChevronRight, X, AlertCircle } from'lucide-react';
import { PageHeader, StatCard, Avatar } from'../../../components/monitoring/ui/index.js';


/**
 * admin/DataSiswa.jsx
 * Halaman manajemen data siswa PKL dengan search, filter jurusan, dan detail.
 */














const ClickPicker = ({ value, onChange, options, placeholder ="Pilih..." }) => {
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
      <Button variant="outline"
        type="button"
        onClick={() =>{ setIsOpen(!isOpen); setSearch(''); }}
        className="w-full text-left flex justify-between items-center cursor-pointer"
      >
        <span className={selectedOpt ?"text-slate-800 font-bold" :"text-slate-400"}>
          {selectedOpt ? selectedOpt.label : placeholder}
        </span>
        <ChevronDown size={14} className="text-slate-400" /></Button>

      {isOpen && (
        <div className="absolute z-[60] mt-1 w-full bg-white border-none rounded-[var(--ui-radius-small)] shadow-sm max-h-60 overflow-hidden flex flex-col">
          <div className="p-2 border-b border-slate-100 bg-slate-50 shrink-0">
            <input
              type="text"
              autoFocus
              placeholder="Cari..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs border-none rounded-[var(--ui-radius-small)] focus:outline-none focus:ring-1 focus:ring-[var(--ui-primary)] focus:border-[var(--ui-primary)]"
            />
          </div>
          <div className="overflow-y-auto flex-1 py-1 custom-scrollbar">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-2 text-xs text-slate-400 text-center">Tidak ditemukan</div>
            ) : (
              filteredOptions.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() =>{
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left flex items-center justify-between px-3 py-2 text-[11px] font-bold text-slate-700 bg-transparent border-none hover:bg-slate-50 cursor-pointer transition-colors`}
                >
                  <span>{opt.label}</span>
                  {String(opt.value) === String(value) && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--ui-primary)]"></span>
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
  const [search, setSearch]         = useState('');
  const [filterJurusan, setFilterJurusan] = useState('Semua');
  const [filterKelas, setFilterKelas] = useState('Semua');
  const [selectedSiswa, setSelectedSiswa] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  const [eligibleClass, setEligibleClass] = useState("XII");

  const statusOptions  = ['Semua','hadir','absen','terlambat','izin','belum_absen'];

  const authToken = useAuthStore(state => state.user?.authToken);
  
  const [perusahaanPKL, setPerusahaanPKL] = useState([]);
  const [pklStudentsMapping, setPklStudentsMapping] = useState([]);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (message, type ='success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    fetch("/api/monitoring/lokasi-pkl/public")
      .then(res => res.json())
      .then(data => { if (data.ok) setPerusahaanPKL(data.data); })
      .catch(console.error);
      
    // Load eligibleClass from local appSettings
    const localSnapshot = getDatabaseSnapshot() || {};
    const localSettings = localSnapshot.appSettings || {};
    setEligibleClass(localSettings.eligibleClass ||"XII");
        
    if (authToken) {
      fetch("/api/monitoring/pkl-students", { headers: {"Authorization": `Bearer ${authToken}` } })
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
      
      // Update local storage / global state
      setDatabaseSnapshot(updatedSnapshot);
      if (setAppSettings) setAppSettings(newSettings);
      if (onSave) await onSave(updatedSnapshot);
      showToast("Pengaturan kelas PKL berhasil disimpan!");
    } catch (e) {
      showToast("Gagal menyimpan pengaturan","error");
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

  const pklStudents = useMemo(() => {
     return students.filter(s => s.class_name && s.class_name.toUpperCase().startsWith(eligibleClass.toUpperCase()))
        .map(s => {
           const mapping = pklStudentsMapping.find(m => m.nis === s.nis) || {};
            return {
               id: s.nis,
               nis: s.nis,
               nama: s.name,
               kelas: s.class_name,
               jurusan: s.class_name.split('')[1] ||'Umum',
               perusahaanId: mapping.location_id,
               guruPembimbingCode: mapping.teacher_code,
               statusPKL: mapping.location_id ?'Sudah PKL' :'Belum PKL',
               lamaPKL: mapping.location_id ?'6 Bulan' :'-'
            };
        });
  }, [students, eligibleClass, pklStudentsMapping]);

  const jurusanOptions = useMemo(() => ['Semua', ...Array.from(new Set(pklStudents.map(s => s.jurusan))).filter(Boolean).filter(m => m.toLowerCase() !=='semua' && m.toLowerCase() !=='all')], [pklStudents]);
  const kelasOptions = useMemo(() => ['Semua', ...Array.from(new Set(pklStudents.map(s => s.kelas))).filter(Boolean).filter(k => k.toLowerCase() !=='semua' && k.toLowerCase() !=='all')], [pklStudents]);

  const filtered = useMemo(() => {
    return pklStudents.filter((s) => {
      const matchSearch =
        s.nama.toLowerCase().includes(search.toLowerCase()) ||
        s.nis.includes(search);
      const matchJurusan = filterJurusan ==='Semua' || s.jurusan === filterJurusan;
      const matchKelas = filterKelas ==='Semua' || s.kelas === filterKelas;
      return matchSearch && matchJurusan && matchKelas;
    });
  }, [pklStudents, search, filterJurusan, filterKelas]);

  const paginatedData = useMemo(() => filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage), [filtered, currentPage, itemsPerPage]);
  const totalPages = Math.ceil(filtered.length / itemsPerPage);

  const stats = [
    { label:'Total Siswa PKL', value: pklStudents.length, icon: Users, iconBg:'bg-blue-100', iconColor:'text-blue-600' },
    { label:'Sudah PKL', value: pklStudents.filter(s => s.statusPKL ==='Sudah PKL').length, icon: CheckCircle2, iconBg:'bg-emerald-100', iconColor:'text-emerald-600' },
    { label:'Belum PKL', value: pklStudents.filter(s => s.statusPKL ==='Belum PKL').length, icon: XCircle, iconBg:'bg-red-100', iconColor:'text-red-600' },
  ];

  const handleExport = () => {
    const exportData = filtered.map(s => {
      const guru = teachers.find(g => g.code === s.guruPembimbingCode);
      const perusahaan = perusahaanPKL.find(p => p.id === s.perusahaanId);
      return {
        NIS: s.nis,
        Nama: s.nama,
        Kelas: s.kelas,
        Jurusan: s.jurusan,"Perusahaan PKL": perusahaan?.nama_perusahaan ||"Belum Ditempatkan","Guru Pembimbing": guru?.name ||"Belum Ditugaskan","Status PKL": s.statusPKL,"Lama PKL": s.lamaPKL
      };
    });
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws,"Siswa PKL");
    XLSX.writeFile(wb, `Data_Siswa_PKL_${eligibleClass}.xlsx`);
  };

  return (
    <div className="space-y-4">
      <PageHeader
        icon={Users}
        title="Data Siswa PKL"
        description={`${pklStudents.length} siswa kelas ${eligibleClass} sinkron otomatis dari Master Data`}
      >
        <div className="flex flex-col sm:flex-row items-center gap-3">
           <div className="bg-white/10 backdrop-blur-sm border border-white/20 px-3 py-1.5 rounded-[var(--ui-radius-small)] flex items-center gap-2.5 shadow-sm">
             <Settings size={15} className="text-white"/>
             <span className="text-[11px] font-bold text-white uppercase tracking-wider">Kelas PKL:</span>
             <div className="flex bg-white/10 p-0.5 rounded-[var(--ui-radius-small)] border-none">
                {["X","XI","XII"].map(lvl => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() =>setEligibleClass(lvl)}
                    className={`px-3 py-1 rounded-[var(--ui-radius-small)] text-xs font-bold transition-all cursor-pointer border-none ${eligibleClass === lvl ? 'bg-white text-[var(--ui-primary)] shadow-sm' : 'bg-transparent text-white hover:bg-white/10'}`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
             <button onClick={saveSettings} disabled={isSavingSettings} className="ml-1 cursor-pointer bg-transparent text-white border-none hover:bg-white/10 p-1.5 rounded-[var(--ui-radius-small)]" title="Simpan Pengaturan Kelas">
                <Save size={13} />
             </button>
           </div>
           
           <div className="flex items-center gap-2">
              <button onClick={() => {
                const f = document.createElement('input'); f.type = 'file'; f.accept = '.xlsx,.xls'; f.onchange = handleImport; f.click();
              }} className="flex items-center gap-1.5 border-none h-8 px-3 rounded-[var(--ui-radius-small)] text-[var(--ui-primary)] bg-white font-bold text-xs hover:bg-slate-50 cursor-pointer active:scale-95 transition-all">
                <Upload size={14} strokeWidth={2.5} /> Impor
              </button>
              <button onClick={handleExport} className="flex items-center gap-1.5 border-none h-8 px-3 rounded-[var(--ui-radius-small)] text-[var(--ui-primary)] bg-white font-bold text-xs hover:bg-slate-50 cursor-pointer active:scale-95 transition-all">
                <Download size={14} strokeWidth={2.5} /> Ekspor
              </button>
           </div>
        </div>
      </PageHeader>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map(s => <StatCard key={s.label} {...s} />)}
      </div>

      {/* Filter Bar - Click Based pills */}
      <div className="ui-card p-4 space-y-3">
        <div className="relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cari nama atau NIS..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border-none rounded-[var(--ui-radius-small)] text-sm focus:outline-none focus:bg-white focus:ring-1 focus:ring-[var(--ui-primary)]"
          />
        </div>
        <div className="flex flex-col gap-3 pt-1 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest min-w-[70px]">Kelas:</span>
            <div className="flex flex-wrap gap-1.5">
              {kelasOptions.map(k => (
                <Button variant="outline"
                  key={k}
                  type="button"
                  onClick={() =>setFilterKelas(k)}
                  className={`cursor-pointer`}
                >
                  {k ==='Semua' ?'Semua Kelas' : k}</Button>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest min-w-[70px]">Jurusan:</span>
            <div className="flex flex-wrap gap-1.5">
              {jurusanOptions.map(j => (
                <Button variant="outline"
                  key={j}
                  type="button"
                  onClick={() =>setFilterJurusan(j)}
                  className={`cursor-pointer`}
                >
                  {j ==='Semua' ?'Semua Jurusan' : j}</Button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="ui-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                <th className="px-3 py-2 text-left">Siswa</th>
                <th className="px-4 py-3 text-left">Jurusan</th>
                <th className="px-4 py-3 text-left hidden md:table-cell">Perusahaan</th>
                <th className="px-4 py-3 text-left hidden lg:table-cell">Guru Pembimbing</th>
                <th className="px-4 py-3 text-center">Status PKL</th>
                <th className="px-4 py-3 text-center">Lama PKL</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {paginatedData.map(s => {
                const guru = teachers.find(g => g.code === s.guruPembimbingCode);
                const perusahaan = perusahaanPKL.find(p => p.id === s.perusahaanId);
                return (
                  <tr key={s.id} className="hover:bg-slate-50/50 transition-colors border-b border-slate-50 last:border-0">
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-3">
                        <Avatar name={s.nama} size="xs" />
                        <div>
                          <p className="font-bold text-slate-800 text-[13px]">{s.nama}</p>
                          <p className="text-[11px] font-medium text-slate-500 mt-0.5">{s.nis} - {s.kelas}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <Badge variant={s.jurusan} label={s.jurusan} withDot={false} />
                    </td>
                    <td className="px-3 py-2 hidden md:table-cell">
                      <p className="text-xs font-medium text-slate-700 max-w-[180px] truncate">
                        {perusahaan?.nama_perusahaan ||'-'}
                      </p>
                    </td>
                    <td className="px-3 py-2 hidden lg:table-cell">
                      <p className="text-xs font-medium text-slate-700 truncate max-w-[150px]">
                        {guru?.name || <span className="text-amber-600 text-xs font-medium">Belum ditugaskan</span>}
                      </p>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded-[var(--ui-radius-small)] border ${s.statusPKL ==='Sudah PKL' ?'bg-emerald-50 text-emerald-600 border-emerald-200' :'bg-red-50 text-red-600 border-red-200'}`}>
                        {s.statusPKL}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span className="text-[10px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-[var(--ui-radius-small)] border-none">
                        {s.lamaPKL}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Button variant="outline" onClick={() =>setSelectedSiswa(s)}
                        className="flex items-center justify-center gap-1.5 ml-auto">
                        Detail <ChevronRight size={13} /></Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="py-16 text-center text-slate-400">
            <Users size={32} className="mx-auto mb-3 text-gray-300" />
            <p className="font-semibold">Tidak ada siswa ditemukan</p>
          </div>
        )}
        <TablePagination 
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filtered.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={(val) => { setItemsPerPage(val); setCurrentPage(1); }}
        />
      </div>

      {/* Detail Panel (slide-over) */}
      {selectedSiswa && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
            onClick={() => setSelectedSiswa(null)} />
          <div className="relative bg-[#f8fafc] w-full max-w-sm h-full overflow-y-auto shadow-2xl z-10 p-4 sm:p-5 flex flex-col space-y-4 animate-in slide-in-from-right-full duration-300">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/60 shrink-0">
              <h2 className="font-bold text-slate-800 text-base">Detail Siswa</h2>
              <Button variant="outline" onClick={() =>setSelectedSiswa(null)}
                >
                <X size={18} /></Button>
            </div>

            <div className="ui-card p-4 flex flex-col items-center text-center">
              <Avatar name={selectedSiswa.nama} size="lg" className="mb-3 shadow-sm" />
              <p className="font-extrabold text-lg text-slate-800 tracking-tight">{selectedSiswa.nama}</p>
              <p className="text-sm font-semibold text-slate-400 mt-0.5">{selectedSiswa.kelas}</p>
              <Badge variant={selectedSiswa.jurusan} label={selectedSiswa.jurusan} withDot={false} className="mt-3 px-3 py-1 text-[11px]" />
            </div>

            <div className="ui-card p-4 space-y-3">
              {[
                { label:'NIS', value: selectedSiswa.nis },
                { label:'Status PKL', value: selectedSiswa.statusPKL },
                { label:'Lama PKL', value: selectedSiswa.lamaPKL },
                { label:'Perusahaan', value: perusahaanPKL.find(p => p.id == selectedSiswa.perusahaanId)?.nama_perusahaan ||'-' },
                { label:'Guru Pembimbing', value: teachers.find(g => g.code === selectedSiswa.guruPembimbingCode)?.name ||'Belum ditugaskan' },
              ].map(info => (
                <div key={info.label} className="flex justify-between items-start gap-4 py-1 border-b border-slate-50 last:border-0 last:pb-0">
                  <span className="text-xs font-semibold text-slate-400">{info.label}</span>
                  <span className="text-sm font-bold text-slate-800 text-right">{info.value}</span>
                </div>
              ))}
            </div>

            <div className="ui-card p-4">
               <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2"><Settings size={16} className="text-slate-400"/> Edit Penugasan</h3>
               <div className="space-y-4">
                  <div>
                    <label className="text-xs text-slate-500 font-semibold mb-1.5 block">Perusahaan PKL</label>
                    <ClickPicker 
                      value={selectedSiswa.perusahaanId ||""}
                      onChange={(val) => setSelectedSiswa({...selectedSiswa, perusahaanId: val})}
                      placeholder="Pilih Perusahaan PKL"
                      options={[
                        { value:"", label:"-- Tanpa Perusahaan --" },
                        ...perusahaanPKL.map(p => ({ value: p.id, label: p.nama_perusahaan }))
                      ]}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 font-semibold mb-1.5 block">Guru Pembimbing</label>
                    <ClickPicker 
                      value={selectedSiswa.guruPembimbingCode ||""}
                      onChange={(val) => setSelectedSiswa({...selectedSiswa, guruPembimbingCode: val})}
                      placeholder="Pilih Guru Pembimbing"
                      options={[
                        { value:"", label:"-- Tanpa Pembimbing --" },
                        ...teachers.map(g => ({ value: g.code, label: g.name }))
                      ]}
                    />
                  </div>
                  <Button variant="outline"
                    onClick={async () =>{
                       setIsSavingSettings(true);
                       try {
                         await fetch("/api/monitoring/pkl-students/bulk", {
                           method:"POST",
                           headers: {"Authorization": `Bearer ${authToken}`,"Content-Type":"application/json" },
                           body: JSON.stringify({ updates: [{ nis: selectedSiswa.nis, location_id: selectedSiswa.perusahaanId || null, teacher_code: selectedSiswa.guruPembimbingCode || null }] })
                         });
                         // Update local state
                         setPklStudentsMapping(prev => {
                            const newMap = [...prev];
                            const idx = newMap.findIndex(m => m.nis === selectedSiswa.nis);
                            if (idx >= 0) {
                               newMap[idx].location_id = selectedSiswa.perusahaanId;
                               newMap[idx].teacher_code = selectedSiswa.guruPembimbingCode;
                            } else {
                               newMap.push({ nis: selectedSiswa.nis, location_id: selectedSiswa.perusahaanId, teacher_code: selectedSiswa.guruPembimbingCode });
                            }
                            return newMap;
                         });
                          showToast("Tersimpan!");
                        } catch (e) {
                          showToast("Gagal","error");
                        }
                        setIsSavingSettings(false);
                    }}
                    disabled={isSavingSettings}
                    className="w-full mt-2"
                  >
                    {isSavingSettings ?'Menyimpan...' :'Simpan Penugasan'}</Button>
               </div>
            </div>
          </div>
        </div>
      )}
      {toast && (
        <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-[var(--ui-radius-small)] shadow-lg font-medium text-sm flex items-center gap-2 animate-in slide-in-from-bottom-5 text-white z-[100] ${toast.type ==='error' ?'bg-red-600' :'bg-emerald-600'}`}>
          {toast.type ==='error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />} {toast.message}
        </div>
      )}
    </div>
  );
};

export default DataSiswa;
