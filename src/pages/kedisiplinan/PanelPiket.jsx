import { useState, useMemo, useEffect, useCallback } from'react';
import { ShieldAlert, AlertTriangle, Clock, FileText } from'lucide-react';
import useAuthStore from'../../store/monitoring/authStore.js';
import { CheckCircle2, Check, User, Search, X, History, ChevronRight, Trash2 } from'lucide-react';
import { CustomSelect } from'../../components/CustomSelect.jsx';
import { Button } from '../../components/ui.jsx';
import useFiturStore from'../../store/monitoring/fiturStore.js';


const getViolationStyle = (poin) => {
  if (poin >= 30) return { icon: ShieldAlert, color: 'text-rose-600', bg: 'bg-rose-50 border-rose-200' };
  if (poin >= 15) return { icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' };
  return { icon: Clock, color: 'text-teal-600', bg: 'bg-teal-50 border-teal-200' };
};

export default function PanelPiket({ students = [], classes = [] }) {
  const [search, setSearch] = useState("");
  const [filterClass, setFilterClass] = useState("all");
  const [mobileTab, setMobileTab] = useState("siswa"); //'siswa','pelanggaran','riwayat'
  
  const { isFiturAktif } = useFiturStore();
  const isWaAutoPelanggaran = isFiturAktif('wa_auto_pelanggaran') ?? true;

  // Selected students for POS operations
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [selectedViolations, setSelectedViolations] = useState([]);
  
  const authToken = useAuthStore(state => state.user?.authToken);
  const [toast, setToast] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmViolation, setConfirmViolation] = useState(false);
  const [history, setHistory] = useState([]);

  const [violations, setViolations] = useState([]);

  const totalPoin = useMemo(() => {
    return selectedViolations.reduce((sum, v) => sum + (v.nilai_poin || 0), 0);
  }, [selectedViolations]);

  // Fetch history
  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch("/api/kedisiplinan/riwayat", {
        headers: { "Authorization": `Bearer ${authToken}` }
      });
      const data = await res.json();
      if (data.ok) {
        const today = new Date().toISOString().split('T')[0];
        setHistory(data.data.filter(h => h.tanggal_kejadian && h.tanggal_kejadian.startsWith(today)));
      }
    } catch (e) {
      console.error(e);
    }
  }, [authToken]);

  // Fetch master violations (hanya jenis pelanggaran)
  const fetchViolations = useCallback(async () => {
    try {
      const res = await fetch("/api/kedisiplinan/master", {
        headers: { "Authorization": `Bearer ${authToken}` }
      });
      const data = await res.json();
      if (data.ok) {
        // Hanya tampilkan pelanggaran (bukan penghargaan/prestasi)
        setViolations((data.data || []).filter(v => String(v.jenis || '').toLowerCase() === 'pelanggaran'));
      }
    } catch (e) {
      console.error(e);
    }
  }, [authToken]);

  useEffect(() => {
    if (authToken) {
      fetchHistory();
      fetchViolations();
    }
  }, [authToken, fetchHistory, fetchViolations]);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const name = (s.namaSiswa || s.name || s.nama || s.nama_siswa || "").toLowerCase();
      const nis = (s.nis || "").toLowerCase();
      const matchSearch = name.includes(search.toLowerCase()) || nis.includes(search.toLowerCase());
      const matchClass = filterClass === "all" || s.class_name === filterClass || s.kelas === filterClass;
      return matchSearch && matchClass;
    });
  }, [students, search, filterClass]);

  const toggleStudent = (student) => {
    if (selectedStudents.some(s => s.nis === student.nis)) {
      setSelectedStudents(selectedStudents.filter(s => s.nis !== student.nis));
    } else {
      setSelectedStudents([...selectedStudents, student]);
    }
  };

  const toggleViolation = (violation) => {
    if (selectedViolations.some(v => v.id === violation.id)) {
      setSelectedViolations(selectedViolations.filter(v => v.id !== violation.id));
    } else {
      setSelectedViolations([...selectedViolations, violation]);
    }
  };

  const submitViolation = async () => {
    if (selectedStudents.length === 0 || selectedViolations.length === 0) return;
    setIsSubmitting(true);
    setErrorMsg("");
    try {
       const payload = {
          student_nises: selectedStudents.map(s => s.nis),
          tindakan_ids: selectedViolations.map(v => v.id)
       };

       const res = await fetch("/api/kedisiplinan/input_pos", {
          method: "POST",
          headers: { 
             "Content-Type": "application/json", 
             "Authorization": `Bearer ${authToken}` 
          },
          body: JSON.stringify(payload)
       });

       const data = await res.json();
       if (res.ok && data.ok) {
          showToast("Berhasil menyimpan pelanggaran & mengirim notifikasi!", "success");
          
          const violationsStr = selectedViolations.map(v => v.nama_tindakan).join(', ');

          if (isWaAutoPelanggaran) {
            selectedStudents.forEach(student => {
               const phone = student.phone || student.wa_ortu;
               if (phone) {
                  fetch("/api/whatsapp/send", {
                    method: "POST",
                    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${authToken}` },
                    body: JSON.stringify({
                      phone: phone,
                      message: `[INFO KEDISIPLINAN]\nNama: ${student.namaSiswa || student.name}\nPelanggaran: ${violationsStr}\nPoin Tambahan: +${totalPoin}\n\nMohon kerjasamanya untuk membimbing putra/putri Bapak/Ibu. Terima kasih.`,
                      jurusan: student.jurusan || student.department,
                      trigger_type: 'kedisiplinan_cepat'
                    })
                  }).catch(e => console.error("WA Trigger error", e));
               }
            });
          }

          setSelectedStudents([]);
          setSelectedViolations([]);
          fetchHistory();
          setConfirmViolation(false);
          setMobileTab('riwayat');
       } else {
          setErrorMsg("Ada kesalahan saat menyimpan beberapa data.");
       }
    } catch (e) {
      console.error(e);
      setErrorMsg("Gagal terhubung ke server.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteHistory = async (id) => {
    if (!window.confirm("Hapus riwayat pelanggaran ini? Data poin siswa akan dikurangi kembali.")) return;
    try {
      const res = await fetch("/api/kedisiplinan/riwayat", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${authToken}` },
        body: JSON.stringify({ action: "delete", id })
      });
      if (res.ok) {
        showToast("Riwayat pelanggaran berhasil dihapus", "success");
        fetchHistory();
      }
    } catch (e) {
      console.error(e);
      showToast("Gagal menghapus riwayat", "error");
    }
  };

  return (
    <div className="flex flex-col gap-4 w-full animate-in fade-in duration-300 relative z-10 pb-24 lg:pb-0">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-[var(--ui-radius-small)] shadow-xs border flex items-center gap-3 transition-all ${
          toast.type === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-red-50 border-red-200 text-red-800"
        }`}>
          {toast.type === "success" ? <CheckCircle2 size={20} className="text-emerald-500"/> : <AlertTriangle size={20} className="text-rose-500"/>}
          <p className="font-bold text-sm">{toast.message}</p>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmViolation && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-[var(--ui-radius-card)] shadow-sm w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
               <div className="p-6">
                  <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mb-4 mx-auto">
                     <ShieldAlert size={24} className="text-amber-600" />
                  </div>
                  <h3 className="text-xl font-black text-slate-800 text-center mb-2">Konfirmasi Simpan Pelanggaran</h3>
                  <p className="text-slate-500 text-center text-xs mb-6">
                     Menyimpan <strong className="text-slate-700">{selectedViolations.length} jenis pelanggaran</strong> untuk <strong className="text-slate-700">{selectedStudents.length} siswa</strong>. Total Tambahan: <span className="font-black text-rose-600">+{totalPoin} Poin</span>.
                  </p>
                  
                  {errorMsg && (
                    <div className="p-3 bg-rose-50 border border-rose-100 rounded-[var(--ui-radius-small)] flex items-start gap-2 text-rose-600 text-xs font-semibold mb-4">
                      <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                      <span className="leading-relaxed">{errorMsg}</span>
                    </div>
                  )}

                  <div className="flex gap-3">
                     <Button
                        variant="outline"
                        onClick={() => setConfirmViolation(false)}
                        disabled={isSubmitting}
                        className="flex-1 cursor-pointer"
                     >
                        Batal
                     </Button>
                     <Button
                        onClick={() => submitViolation()}
                        disabled={isSubmitting}
                        className="flex-1 cursor-pointer"
                     >
                        {isSubmitting ? (
                           <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                        ) : (
                           <><Check size={16}/> Simpan &amp; Kirim</>
                        )}
                     </Button>
                  </div>
               </div>
            </div>
         </div>
      )}

      {/* MOBILE STEP TABS SWITCHER (< lg) */}
      <div className="flex lg:hidden bg-slate-100 p-1 rounded-[var(--ui-radius-small)] border border-slate-200 gap-1 shrink-0">
        <button
          type="button"
          onClick={() => setMobileTab('siswa')}
          className={`flex-1 py-2 px-2 text-xs font-bold rounded-[var(--ui-radius-small)] transition-all flex items-center justify-center gap-1.5 cursor-pointer border-none ${
            mobileTab === 'siswa'
              ? 'bg-white text-[var(--ui-primary)] shadow-sm'
              : 'text-slate-600 hover:text-slate-900 bg-transparent'
          }`}
        >
          <User size={14} />
          <span>1. Pilih Siswa ({selectedStudents.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('pelanggaran')}
          className={`flex-1 py-2 px-2 text-xs font-bold rounded-[var(--ui-radius-small)] transition-all flex items-center justify-center gap-1.5 cursor-pointer border-none ${
            mobileTab === 'pelanggaran'
              ? 'bg-white text-[var(--ui-primary)] shadow-sm'
              : 'text-slate-600 hover:text-slate-900 bg-transparent'
          }`}
        >
          <ShieldAlert size={14} />
          <span>2. Pelanggaran ({selectedViolations.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('riwayat')}
          className={`flex-1 py-2 px-2 text-xs font-bold rounded-[var(--ui-radius-small)] transition-all flex items-center justify-center gap-1.5 cursor-pointer border-none ${
            mobileTab === 'riwayat'
              ? 'bg-white text-[var(--ui-primary)] shadow-sm'
              : 'text-slate-600 hover:text-slate-900 bg-transparent'
          }`}
        >
          <History size={14} />
          <span>3. Riwayat</span>
        </button>
      </div>

      {/* MAIN CONTENT RESPONSIVE GRID */}
      <div className="flex flex-col lg:flex-row gap-5">
        
        {/* LEFT PANEL: Student Selector */}
        <div className={`w-full lg:w-1/3 ui-card flex flex-col overflow-hidden border border-slate-200/80 shadow-xs bg-white ${mobileTab === 'siswa' ? 'block' : 'hidden lg:flex'}`}>
           <div className="p-3.5 sm:p-4 border-b border-slate-100 bg-slate-50/70">
              <div className="flex items-center justify-between mb-3">
                 <h2 className="font-extrabold text-slate-800 text-xs sm:text-sm flex items-center gap-2 uppercase tracking-wider">
                    <User size={16} className="text-[var(--ui-primary)]"/> Pilih Siswa
                 </h2>
                 <span className="text-[10px] font-black px-2 py-0.5 rounded-[var(--ui-radius-pill)] bg-emerald-100 text-emerald-800 border border-emerald-200">
                    {selectedStudents.length} Terpilih
                 </span>
              </div>
              <div className="space-y-2.5">
                 <div className="relative">
                   <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                   <input 
                     type="text"
                     placeholder="Cari nama atau NIS..."
                     value={search}
                     onChange={(e) => setSearch(e.target.value)}
                     className="w-full pl-9 pr-4 py-1.5 bg-white border border-slate-200/80 rounded-[var(--ui-radius-small)] text-xs font-semibold text-slate-800 focus:outline-none focus:border-[var(--ui-primary)] focus:ring-4 focus:ring-[var(--ui-primary)]/10 transition-all"
                   />
                 </div>
                 <div className="w-full">
                    <CustomSelect 
                       options={[{value:'all', label:'Semua Kelas'}, ...(classes || []).map(c => ({value: c.name, label: c.name}))]}
                       value={filterClass}
                       onChange={setFilterClass}
                    />
                 </div>
              </div>
           </div>

           <div className="max-h-[380px] lg:max-h-[520px] overflow-y-auto p-2.5 space-y-1.5 custom-scrollbar">
              {filteredStudents.map(student => {
                 const isSelected = selectedStudents.some(s => s.nis === student.nis);
                 const name = student.namaSiswa || student.name || student.nama || student.nama_siswa || '-';
                 return (
                    <button
                       key={student.nis}
                       type="button"
                       onClick={() => toggleStudent(student)}
                       className={`w-full text-left flex items-center justify-between p-2.5 px-3 rounded-[var(--ui-radius-small)] border transition-all text-slate-800 cursor-pointer active:scale-[0.99] ${
                         isSelected
                           ? 'border-[var(--ui-primary)] bg-[var(--ui-primary)]/10 font-bold shadow-2xs'
                           : 'border-slate-200/60 bg-white hover:bg-slate-50'
                       }`}
                    >
                       <div className="min-w-0 flex-1 flex items-center gap-2.5 pr-2">
                          <div className={`w-7 h-7 rounded-full text-[11px] font-black flex items-center justify-center shrink-0 border ${
                            isSelected 
                              ? 'bg-[var(--ui-primary)] text-white border-[var(--ui-primary)] shadow-2xs'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}>
                             {name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                             <div className="text-xs font-extrabold truncate text-slate-800" title={name}>{name}</div>
                             <div className="text-[10px] text-slate-400 font-semibold mt-0.5 flex items-center gap-1.5">
                                <span>{student.nis}</span>
                                {student.class_name && <span className="text-slate-500">• {student.class_name}</span>}
                             </div>
                          </div>
                       </div>
                       {isSelected ? (
                         <div className="w-5 h-5 rounded-full bg-[var(--ui-primary)] text-white flex items-center justify-center shrink-0 shadow-2xs">
                           <Check size={12} className="stroke-[3]" />
                         </div>
                       ) : (
                         <div className="w-5 h-5 rounded-full border border-slate-300 bg-slate-50 flex items-center justify-center shrink-0" />
                       )}
                    </button>
                 );
              })}
              {filteredStudents.length === 0 && (
                 <div className="text-center py-10 text-slate-400 text-xs font-bold flex flex-col items-center justify-center gap-2">
                    <User size={24} className="text-slate-300" />
                    <span>Siswa tidak ditemukan</span>
                 </div>
              )}
           </div>
        </div>
  
        {/* RIGHT PANEL: Quick Action POS & Selected Tray */}
        <div className={`w-full lg:w-2/3 flex flex-col gap-5 ${mobileTab === 'pelanggaran' ? 'block' : 'hidden lg:flex'}`}>
           {/* Selected Tray */}
           <div className="ui-card p-4 border border-slate-200/80 shadow-xs bg-white">
              <div className="flex items-center justify-between mb-3">
                 <h2 className="font-extrabold text-slate-800 text-xs sm:text-sm flex items-center gap-2 uppercase tracking-wider">
                    <CheckCircle2 size={16} className="text-emerald-600"/> Siswa Terpilih ({selectedStudents.length})
                 </h2>
                 {selectedStudents.length > 0 && (
                    <button 
                      type="button" 
                      onClick={() => setSelectedStudents([])} 
                      className="text-[11px] font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2 py-0.5 rounded-[var(--ui-radius-small)] transition-colors cursor-pointer border-none bg-transparent"
                    >
                      Kosongkan Semua
                    </button>
                 )}
              </div>
              
              <div className="min-h-[56px] p-2.5 bg-slate-50/70 border border-slate-200/80 rounded-[var(--ui-radius-small)] flex flex-wrap gap-2 items-center">
                 {selectedStudents.length === 0 ? (
                    <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs font-semibold py-2 gap-2">
                       <User size={15} className="text-slate-400" />
                       <span>Belum ada siswa yang dipilih. Cari &amp; klik siswa di panel sebelah kiri.</span>
                    </div>
                 ) : (
                    selectedStudents.map(student => {
                       const name = student.namaSiswa || student.name || student.nama || '-';
                       return (
                          <span key={student.nis} className="inline-flex items-center gap-1.5 pl-2 pr-1 py-1 bg-white border border-slate-200 rounded-[var(--ui-radius-small)] text-xs font-extrabold text-slate-800 shadow-2xs">
                             <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 text-[9px] font-black flex items-center justify-center shrink-0">
                               {name.charAt(0).toUpperCase()}
                             </div>
                             <span className="truncate max-w-[140px]">{name}</span>
                             <button 
                               type="button" 
                               onClick={() => toggleStudent(student)}
                               className="w-4 h-4 rounded-full bg-slate-100 hover:bg-rose-100 text-slate-400 hover:text-rose-600 transition-colors flex items-center justify-center cursor-pointer border-none shrink-0"
                             >
                               <X size={10} className="stroke-[3]" />
                             </button>
                          </span>
                       );
                    })
                 )}
              </div>
           </div>
  
           {/* POS Action Grid */}
           <div className="ui-card p-4 sm:p-5 border border-slate-200/80 shadow-xs bg-white">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                <div>
                  <h2 className="font-extrabold text-slate-800 text-xs sm:text-sm flex items-center gap-2 uppercase tracking-wider">
                     <ShieldAlert size={16} className="text-amber-500"/> Input Pelanggaran Cepat
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">Pilih jenis pelanggaran di bawah ini (bisa lebih dari 1).</p>
                </div>
                {selectedViolations.length > 0 && (
                  <span className="text-xs font-black px-3 py-1 rounded-[var(--ui-radius-pill)] bg-rose-100 text-rose-700 border border-rose-200 self-start sm:self-auto shadow-2xs">
                    +{totalPoin} Poin Terpilih
                  </span>
                )}
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
                 {violations.length === 0 ? (
                    <div className="col-span-full py-8 text-center text-slate-400 text-xs italic border border-dashed border-slate-200 rounded-[var(--ui-radius-small)]">
                       Belum ada master poin pelanggaran.
                    </div>
                 ) : (
                    violations.map(v => {
                       const style = getViolationStyle(v.nilai_poin);
                       const Icon = style.icon;
                       const isSelected = selectedViolations.some(sv => sv.id === v.id);
                       const isDisabled = selectedStudents.length === 0 || isSubmitting;
                       return (
                          <button
                             key={v.id}
                             type="button"
                             disabled={isDisabled}
                             onClick={() => toggleViolation(v)}
                             className={`group relative flex flex-col items-center justify-center text-center p-3.5 sm:p-4 rounded-[var(--ui-radius-small)] border transition-all duration-200 select-none focus:outline-none w-full ${
                               isDisabled
                                 ? 'opacity-40 cursor-not-allowed bg-slate-50 border-slate-200/60'
                                 : isSelected
                                   ? 'border-emerald-600 bg-emerald-50/60 shadow-xs ring-2 ring-emerald-500/20 text-emerald-900 cursor-pointer scale-[1.01]'
                                   : 'border-slate-200/80 bg-white hover:bg-slate-50/80 hover:border-slate-300 shadow-2xs text-slate-800 cursor-pointer'
                             }`}
                          >
                             {isSelected && (
                               <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                                 <Check size={12} className="stroke-[3]" />
                               </div>
                             )}

                             <div className={`p-2.5 rounded-[var(--ui-radius-small)] mb-2.5 transition-transform group-hover:scale-110 ${style.bg}`}>
                                <Icon size={20} className={style.color} />
                             </div>
                             <h3 className={`text-xs font-extrabold leading-tight mb-2 px-1 ${isSelected ? 'text-emerald-950 font-black' : 'text-slate-800'}`}>
                               {v.nama_tindakan}
                             </h3>
                             <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-[var(--ui-radius-pill)] tracking-wider shadow-2xs ${
                               isSelected ? 'text-white bg-emerald-700' : 'text-rose-700 bg-rose-50 border border-rose-200/80'
                             }`}>
                               +{v.nilai_poin} POIN
                             </span>
                          </button>
                       );
                    })
                 )}
              </div>
  
              <div className="flex flex-col sm:flex-row items-center justify-between pt-4 border-t border-slate-100 gap-3">
                 <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-slate-600">
                    <span className="text-slate-400 font-extrabold uppercase tracking-wider text-[10px]">Ringkasan:</span>
                    <span className="px-2.5 py-1 rounded-[var(--ui-radius-pill)] bg-slate-100 text-slate-800 font-black border border-slate-200/60">{selectedStudents.length} Siswa</span>
                    <span className="text-slate-400 font-black">×</span>
                    <span className="px-2.5 py-1 rounded-[var(--ui-radius-pill)] bg-slate-100 text-slate-800 font-black border border-slate-200/60">{selectedViolations.length} Pelanggaran</span>
                    <span className="text-slate-400 font-black">=</span>
                    <span className="px-3 py-1 rounded-[var(--ui-radius-pill)] bg-rose-50 text-rose-700 font-black border border-rose-200">+{totalPoin} Poin</span>
                 </div>
                 <Button
                    onClick={() => setConfirmViolation(true)}
                    disabled={selectedStudents.length === 0 || selectedViolations.length === 0 || isSubmitting}
                    className="w-full sm:w-auto px-6 py-2.5 flex items-center justify-center gap-2 font-black text-xs cursor-pointer shadow-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded-[var(--ui-radius-small)] transition-all active:scale-95"
                 >
                    <CheckCircle2 size={16} /> Simpan &amp; Kirim Notifikasi
                 </Button>
              </div>
           </div>
        </div>

        {/* RIWAYAT PANEL (Mobile Only Tab or Desktop Bottom) */}
        <div className={`w-full lg:w-2/3 flex flex-col gap-6 ${mobileTab === 'riwayat' ? 'block' : 'hidden lg:hidden'}`}>
           <div className="ui-card p-4 sm:p-6 border border-slate-100">
              <h2 className="font-bold text-slate-800 mb-4 text-sm sm:text-base flex items-center gap-2">
                 <History size={18} className="text-[var(--ui-primary)]"/> Riwayat Input Hari Ini
              </h2>
              {history.length === 0 ? (
                 <div className="text-center py-6 text-slate-400 text-xs italic bg-slate-50 rounded-[var(--ui-radius-small)] border border-dashed border-slate-200">
                    Belum ada pelanggaran yang diinput hari ini.
                 </div>
              ) : (
                 <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
                    {history.map(item => {
                       const student = students.find(s => s.nis === item.siswa_nis);
                       const studentName = student ? (student.namaSiswa || student.name) : item.siswa_nis;
                       return (
                          <div key={item.id} className="flex justify-between items-center p-3 border border-slate-100 bg-slate-50 rounded-[var(--ui-radius-small)] gap-2">
                             <div className="min-w-0 flex-1">
                                <div className="font-extrabold text-slate-800 text-xs truncate flex items-center gap-1.5">
                                   <span className="truncate">{studentName}</span>
                                   <ChevronRight size={12} className="text-slate-400 shrink-0"/> 
                                   <span className="text-rose-600 truncate">{item.tindakan_nama}</span>
                                </div>
                                <div className="text-[10px] text-slate-400 font-semibold mt-0.5">
                                   {new Date(item.tanggal_kejadian).toLocaleTimeString('id-ID', {hour:'2-digit', minute:'2-digit'})} WIB • {item.pelapor_nama}
                                </div>
                             </div>
                             <div className="flex items-center gap-2 shrink-0">
                                <span className="text-[10px] font-black text-rose-600 bg-white border border-rose-100 px-2 py-0.5 rounded-[var(--ui-radius-pill)] shadow-xs">
                                   +{item.poin}
                                </span>
                                <Button variant="ghost" size="icon" onClick={() => deleteHistory(item.id)} title="Hapus Riwayat" className="h-8 w-8 text-rose-500 hover:bg-rose-50">
                                   <Trash2 size={14}/>
                                </Button>
                             </div>
                          </div>
                       );
                    })}
                 </div>
              )}
           </div>
        </div>
      </div>

      {/* FLOATING STICKY MOBILE ACTION BAR */}
      {(selectedStudents.length > 0 || selectedViolations.length > 0) && (
        <div className="lg:hidden fixed bottom-3 left-3 right-3 z-40 bg-slate-900/95 backdrop-blur-md text-white p-3 rounded-[var(--ui-radius-card)] shadow-sm border border-slate-800 flex items-center justify-between gap-2 animate-in slide-in-from-bottom-4 duration-200">
          <div className="flex flex-col min-w-0 pl-1">
            <span className="text-[11px] font-extrabold text-amber-400 truncate">
              {selectedStudents.length} Siswa • {selectedViolations.length} Pelanggaran
            </span>
            <span className="text-[10px] font-medium text-slate-300">
              Total: +{totalPoin} Poin
            </span>
          </div>
          <Button
            size="sm"
            onClick={() => setConfirmViolation(true)}
            disabled={selectedStudents.length === 0 || selectedViolations.length === 0 || isSubmitting}
            className="px-4 py-2 font-black text-xs cursor-pointer shrink-0 shadow-sm"
          >
            <CheckCircle2 size={14} className="mr-1" /> Simpan & Kirim
          </Button>
        </div>
      )}
    </div>
  );
}
