import { Button } from '../../../components/ui.jsx';
import { useState, useEffect, useMemo, useCallback } from'react';
import { GraduationCap, ArrowUp, Star, Users, AlertTriangle } from'lucide-react';
import useAuthStore from'../../../store/monitoring/authStore.js';
import { Search, ChevronRight, AlertCircle, CheckCircle2, History } from'lucide-react';
import { PageHeader } from '../../../components/monitoring/ui/index.js';
;
import { UISelect } from'../../../components/ui.jsx';


const GRADE_ORDER = ['X','XI','XII'];
const getNextGrade = (g) => {
  const idx = GRADE_ORDER.indexOf(g);
  if (idx < 0 || idx >= GRADE_ORDER.length - 1) return null; // XII → lulus
  return GRADE_ORDER[idx + 1];
};
const getGradeFromClass = (className) => {
  if (!className) return'';
  const m = className.match(/^(X{1,3}|XI|XII)/i);
  return m ? m[1].toUpperCase() :'';
};

export default function KenaikanKelas({ appSettings = {} }) {
  const [students, setStudents] = useState([]);
  const academicYears = appSettings?.academicYears || [];
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterKelas, setFilterKelas] = useState('all');
  const [activeTab, setActiveTab] = useState('proses');
  const [selectedTA, setSelectedTA] = useState('');
  const [exclusions, setExclusions] = useState({}); // nis -> true = tidak naik/lulus
  const [isProcessing, setIsProcessing] = useState(false);
  const [toast, setToast] = useState(null);
  const authToken = useAuthStore(state => state.user?.authToken);

  const showToast = (msg, type ='success') => { setToast({ message: msg, type }); setTimeout(() => setToast(null), 3500); };

  const fetchData = useCallback(async () => {
    if (!authToken) return;
    setIsLoading(true);
    try {
      const [studRes, histRes] = await Promise.all([
        fetch('/api/data/load', { headers: { Authorization: `Bearer ${authToken}` } }),
        fetch('/api/kenaikan-kelas', { headers: { Authorization: `Bearer ${authToken}` } }),
      ]);
      const studData = await studRes.json(); if (studData.payload && studData.payload.students) setStudents(studData.payload.students);
      const histData = await histRes.json(); if (histData.ok) setHistory(histData.data || []);
    } catch (e) { console.error(e); }
    setIsLoading(false);
  }, [authToken]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const active = academicYears.find(y => y.is_active);
    if (active) setSelectedTA(active.nama);
  }, [academicYears]);

  const validPromotionStudents = useMemo(() => {
    return students.filter(s => {
      const grade = getGradeFromClass(s.class_name);
      return grade ==='X' || grade ==='XI' || grade ==='XII';
    });
  }, [students]);

  const classes = useMemo(() => ['all', ...new Set(validPromotionStudents.map(s => s.class_name).filter(Boolean).sort())], [validPromotionStudents]);

  const filteredStudents = useMemo(() => {
    return validPromotionStudents.filter(s => {
      const matchSearch = !searchTerm || (s.namaSiswa || s.name)?.toLowerCase().includes(searchTerm.toLowerCase()) || s.nis?.includes(searchTerm);
      const matchClass = filterKelas ==='all' || s.class_name === filterKelas;
      return matchSearch && matchClass;
    });
  }, [validPromotionStudents, searchTerm, filterKelas]);

  const grouped = useMemo(() => {
    const g = {};
    filteredStudents.forEach(s => {
      const grade = getGradeFromClass(s.class_name);
      if (!grade) return;
      if (!g[grade]) g[grade] = [];
      g[grade].push(s);
    });
    return g;
  }, [filteredStudents]);

  const summary = useMemo(() => {
    let naik = 0, lulus = 0, tidak = 0;
    filteredStudents.forEach(s => {
      const grade = getGradeFromClass(s.class_name);
      if (!grade) return;
      if (exclusions[s.nis]) { tidak++; return; }
      if (grade ==='XII') lulus++;
      else naik++;
    });
    return { naik, lulus, tidak, total: filteredStudents.length };
  }, [filteredStudents, exclusions]);

  const handleProcess = async () => {
    if (!selectedTA) return showToast('Pilih Tahun Ajaran terlebih dahulu!','error');
    if (!await window.confirmAsync(`Proses kenaikan kelas untuk TA ${selectedTA}?\n\n• ${summary.naik} siswa naik kelas\n• ${summary.lulus} siswa dinyatakan LULUS\n• ${summary.tidak} siswa tidak naik\n\nTindakan ini akan dicatat di log sistem.`)) return;
    setIsProcessing(true);
    try {
      const detail = filteredStudents.map(s => {
        const grade = getGradeFromClass(s.class_name);
        const action = exclusions[s.nis] ?'tidak_naik' : grade ==='XII' ?'lulus' :'naik';
        return { nis: s.nis, nama: (s.namaSiswa || s.name), kelas_lama: s.class_name, action };
      });
      const res = await fetch('/api/kenaikan-kelas', {
        method:'POST', headers: { Authorization: `Bearer ${authToken}`,'Content-Type':'application/json' },
        body: JSON.stringify({ tahun_ajaran: selectedTA, detail }),
      });
      const data = await res.json();
      if (data.ok) { showToast(`Kenaikan kelas berhasil diproses dan dicatat!`); fetchData(); }
      else showToast(data.error ||'Gagal.','error');
    } catch (e) { showToast('Gagal.','error'); }
    setIsProcessing(false);
  };

  return (
    <div className="space-y-6 relative animate-in fade-in duration-300 z-10">
      <PageHeader 
        title="Kenaikan Kelas & Kelulusan"
        description="Proses kenaikan kelas, kelulusan, dan lihat riwayat."
        icon={GraduationCap}
        tabs={[
          { id: 'proses', label: 'Proses Kenaikan', icon: ArrowUp },
          { id: 'riwayat', label: 'Riwayat Proses', icon: History }
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label:'Total Siswa', value: summary.total, icon: Users, color:'blue' },
          { label:'Naik Kelas', value: summary.naik, icon: ArrowUp, color:'emerald' },
          { label:'Lulus (XII)', value: summary.lulus, icon: Star, color:'violet' },
          { label:'Tidak Naik', value: summary.tidak, icon: AlertTriangle, color:'red' },
        ].map(s => (
          <div key={s.label} className="bg-white p-5 rounded-[var(--ui-radius-small)] border-none shadow-sm flex items-center gap-4">
            <div className={`w-12 h-12 rounded-[var(--ui-radius-small)] flex items-center justify-center bg-${s.color}-50 shrink-0`}>
              <s.icon size={22} className={`text-${s.color}-500`} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{s.label}</p>
              <p className="text-3xl font-black text-slate-800">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {activeTab ==='proses' && (
        <div className="space-y-4">
          {academicYears.length <= 1 && (
            <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-[var(--ui-radius-card)] border border-amber-200 text-amber-800 text-sm">
              <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={20} />
              <div>
                <p className="font-extrabold text-amber-900 mb-1">Perhatian: Opsi Tahun Ajaran Baru Belum Ditambahkan</p>
                <p className="text-amber-800/90 leading-relaxed text-xs">
                  Untuk memproses kenaikan kelas, Anda memerlukan target Tahun Ajaran Baru. Silakan tambahkan Tahun Ajaran Baru terlebih dahulu di menu <b>Profil Sekolah &amp; Tahun Ajaran</b> (klik menu "Data Sekolah" &rarr; "Profil Sekolah" &rarr; tab "Tahun Ajaran").
                </p>
              </div>
            </div>
          )}

          {/* Controls */}
          <div className="bg-white rounded-[var(--ui-radius-small)] border-none shadow-sm p-4 flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Tahun Ajaran Baru (yang akan dimulai)</label>
              <UISelect value={selectedTA} onChange={e => setSelectedTA(e.target.value)}
                className="w-full bg-slate-50 border-none rounded-[var(--ui-radius-small)] text-sm font-semibold h-[38px] px-3 focus:outline-none focus:border-[var(--ui-primary)]">
                <option value="">-- Pilih Tahun Ajaran --</option>
                {academicYears.map(y => <option key={y.id} value={y.nama}>{y.nama} {y.semester}</option>)}
              </UISelect>
            </div>
            <div className="relative flex-1 min-w-[180px]">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Cari Siswa</label>
              <Search className="absolute left-3 bottom-2.5 text-slate-400" size={14} />
              <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Nama atau NIS..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border-none rounded-[var(--ui-radius-small)] text-sm focus:outline-none focus:border-[var(--ui-primary)]" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Filter Kelas</label>
              <UISelect value={filterKelas} onChange={e => setFilterKelas(e.target.value)}
                className="w-full bg-slate-50 border-none rounded-[var(--ui-radius-small)] text-sm font-semibold h-[38px] px-3 focus:outline-none focus:border-[var(--ui-primary)] min-w-[150px]">
                {classes.map(c => <option key={c} value={c}>{c ==='all' ?'Semua Kelas' : c}</option>)}
              </UISelect>
            </div>
            <Button 
              onClick={handleProcess} 
              disabled={isProcessing || !selectedTA || filteredStudents.length === 0}
              className="flex items-center gap-2"
            >
              <GraduationCap size={14} /> {isProcessing ?'Memproses...' :'Proses Kenaikan Kelas'}
            </Button>
          </div>

          {/* Grouped Table */}
          {Object.entries(grouped).sort().map(([grade, gradeStudents]) => {
            const isXII = grade ==='XII';
            return (
              <div key={grade} className="bg-white rounded-[var(--ui-radius-small)] border-none shadow-sm overflow-hidden">
                <div className={`px-6 py-3 flex items-center justify-between ${isXII ?'bg-violet-50 border-b border-violet-200' :'bg-slate-50 border-b border-slate-200'}`}>
                  <div className="flex items-center gap-3">
                    <span className={`font-black text-lg ${isXII ?'text-violet-700' :'text-slate-700'}`}>Kelas {grade}</span>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-[var(--ui-radius-small)] text-xs font-bold ${isXII ?'bg-violet-100 text-violet-700' :'bg-emerald-100 text-emerald-700'}`}>
                      {isXII ? (
                        <>
                          <GraduationCap size={12} className="inline shrink-0" />
                          <span>LULUS</span>
                        </>
                      ) : (
                        <>
                          <ChevronRight size={12} className="inline shrink-0" />
                          <span>Kelas {getNextGrade(grade)}</span>
                        </>
                      )}
                    </span>
                    <span className="text-sm text-slate-500">{gradeStudents.length} siswa</span>
                  </div>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 text-xs text-slate-400 uppercase bg-white border-b border-slate-100">
                      <tr>
                        <th className="px-4 py-2 text-left font-bold">Nama Siswa</th>
                        <th className="px-4 py-2 text-left font-bold">NIS</th>
                        <th className="px-4 py-2 text-left font-bold">Kelas Saat Ini</th>
                        <th className="px-4 py-2 text-center font-bold">Status Kenaikan</th>
                        <th className="px-4 py-2 text-center font-bold">Pengecualian</th>
                      </tr>
                    </thead>
                    <tbody>
                      {gradeStudents.map(s => {
                        const isExcluded = exclusions[s.nis];
                        return (
                          <tr key={s.nis} className={`border-b border-slate-100 ${isExcluded ?'bg-rose-50' :'hover:bg-slate-50'}`}>
                            <td className="px-4 py-2.5 font-bold text-slate-700">{s.namaSiswa || s.name}</td>
                            <td className="px-4 py-2.5 text-slate-500 font-mono text-xs">{s.nis}</td>
                            <td className="px-4 py-2.5 text-slate-500">{s.class_name}</td>
                            <td className="px-4 py-2.5 text-center">
                              {isExcluded ? (
                                <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-600 bg-rose-100 px-2 py-0.5 rounded-[var(--ui-radius-small)]">
                                  <AlertCircle size={12} className="shrink-0" />
                                  <span>Tidak Naik</span>
                                </span>
                              ) : isXII ? (
                                <span className="inline-flex items-center gap-1 text-xs font-bold text-violet-700 bg-violet-100 px-2 py-0.5 rounded-[var(--ui-radius-small)]">
                                  <GraduationCap size={12} className="shrink-0" />
                                  <span>Lulus</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-[var(--ui-radius-small)]">
                                  <CheckCircle2 size={12} className="shrink-0" />
                                  <span>Naik ke {getNextGrade(grade)}</span>
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-2.5 text-center">
                              <Button 
                                size="sm"
                                onClick={() => setExclusions(prev => ({ ...prev, [s.nis]: !prev[s.nis] }))}
                                variant={isExcluded ?"destructive" :"outline"}
                              >
                                {isExcluded ?'Batalkan' :'Tidak Naik'}
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {activeTab ==='riwayat' && (
        <div className="bg-white rounded-[var(--ui-radius-small)] border-none shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 font-bold text-left">Tahun Ajaran</th>
                <th className="px-4 py-3 font-bold text-center">Naik Kelas</th>
                <th className="px-4 py-3 font-bold text-center">Lulus</th>
                <th className="px-4 py-3 font-bold text-left">Diproses Oleh</th>
                <th className="px-4 py-3 font-bold text-left">Tanggal Proses</th>
              </tr>
            </thead>
            <tbody>
              {history.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-400">Belum ada riwayat kenaikan kelas.</td></tr>
              ) : history.map(h => (
                <tr key={h.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 font-bold text-slate-700">{h.tahun_ajaran}</td>
                  <td className="px-4 py-3 text-center"><span className="font-black text-emerald-600 text-lg">{h.jumlah_naik}</span></td>
                  <td className="px-4 py-3 text-center"><span className="font-black text-violet-600 text-lg">{h.jumlah_lulus}</span></td>
                  <td className="px-4 py-3 text-slate-500">{h.processed_by}</td>
                  <td className="px-4 py-3 text-xs text-slate-400">{new Date(h.tanggal_proses).toLocaleDateString('id-ID', { weekday:'long', day:'2-digit', month:'long', year:'numeric' })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {toast && (
        <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-[var(--ui-radius-small)] shadow-sm font-medium text-sm flex items-center gap-2 animate-in slide-in-from-bottom-5 text-white max-w-sm ${toast.type ==='error' ?'bg-rose-600' :'bg-emerald-600'}`}>
          {toast.type ==='error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />} {toast.message}
        </div>
      )}
    </div>
  );
}
