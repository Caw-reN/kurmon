import { useState, useMemo, useEffect, useCallback } from'react';
import { ShieldAlert, AlertTriangle, Clock, FileText } from'lucide-react';
import useAuthStore from'../../store/monitoring/authStore.js';
import { CheckCircle2, Check, User, Search, X, History, ChevronRight, Trash2 } from'lucide-react';
import { CustomSelect } from'../../components/CustomSelect.jsx';
import { Button } from '../../components/ui.jsx';
import useFiturStore from'../../store/monitoring/fiturStore.js';


const getViolationStyle = (poin) => {
  if (poin >= 20) return { icon: ShieldAlert, color:'text-red-600', bg:'bg-red-100' };
  if (poin >= 10) return { icon: AlertTriangle, color:'text-orange-500', bg:'bg-orange-50' };
  if (poin >= 5) return { icon: Clock, color:'text-amber-500', bg:'bg-amber-50' };
  if (poin >= 20) return { icon: ShieldAlert, color: 'text-red-600', bg: 'bg-red-100' };
  if (poin >= 10) return { icon: AlertTriangle, color: 'text-orange-500', bg: 'bg-orange-50' };
  if (poin >= 5) return { icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50' };
  return { icon: FileText, color: 'text-slate-500', bg: 'bg-slate-50' };
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

  const todayName = useMemo(() => {
    const dayIdx = new Date().getDay();
    const days = ["Minggu","Senin","Selasa","Rabu","Kamis","Jumat","Sabtu"];
    return days[dayIdx];
  }, []);

  const totalPoin = useMemo(() => {
    return selectedViolations.reduce((sum, v) => sum + (v.nilai_poin || 0), 0);
  }, [selectedViolations]);

  // Fetch history
  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch("/api/kedisiplinan/riwayat", {
        headers: {"Authorization": `Bearer ${authToken}` }
      });
      const data = await res.json();
      if (data.ok) {
        const today = new Date().toISOString().split('T')[0];
        const piketHistory = (data.data || []).filter(r => r.tanggal_kejadian.startsWith(today) && r.catatan ==='Input Cepat Panel Piket');
        setHistory(piketHistory);
      }
    } catch (e) {
      console.error("Failed to fetch history", e);
    }
  }, [authToken]);

  const fetchMasterPoin = useCallback(async () => {
    try {
      const res = await fetch("/api/kedisiplinan/master", { headers: {"Authorization": `Bearer ${authToken}` } });
      const data = await res.json();
      if (data.ok && data.data) {
        setViolations(data.data.filter(v => String(v.jenis || '').toLowerCase() ==='pelanggaran'));
      }
    } catch (e) {
      console.error("Failed to fetch master poin", e);
    }
  }, [authToken]);

  useEffect(() => {
    fetchHistory();
    fetchMasterPoin();
  }, [fetchHistory, fetchMasterPoin]);

  const showToast = (message, type ="success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const toggleStudent = (student) => {
    setSelectedStudents(prev => {
      const exists = prev.some(s => s.nis === student.nis);
      if (exists) {
        return prev.filter(s => s.nis !== student.nis);
      }
      return [...prev, student];
    });
  };

  const toggleViolation = (violation) => {
    setSelectedViolations(prev => {
      const exists = prev.some(v => v.id === violation.id);
      if (exists) {
        return prev.filter(v => v.id !== violation.id);
      }
      return [...prev, violation];
    });
  };

  const filteredStudents = useMemo(() => {
    return (students || []).filter(student => {
      const matchSearch = !search || 
        (student.namaSiswa || student.name || "").toLowerCase().includes(search.toLowerCase()) ||
        (student.nis || "").toLowerCase().includes(search.toLowerCase());
      const matchClass = filterClass === "all" || student.class_name === filterClass;
      return matchSearch && matchClass;
    });
  }, [students, search, filterClass]);

  const submitViolation = async () => {
    if (selectedStudents.length === 0 || selectedViolations.length === 0) return;
    setIsSubmitting(true);
    setErrorMsg("");

    try {
      const promises = [];
      selectedStudents.forEach(student => {
         selectedViolations.forEach(violation => {
            const payload = {
               siswa_nis: student.nis,
               master_poin_id: violation.id,
               tanggal_kejadian: new Date().toISOString().split('T')[0],
               catatan: "Input Cepat Panel Piket"
            };
            promises.push(
               fetch("/api/kedisiplinan/input", {
                  method: "POST",
                  headers: { "Content-Type": "application/json", "Authorization": `Bearer ${authToken}` },
                  body: JSON.stringify(payload)
               })
            );
         });
      });
      
      const results = await Promise.all(promises);
      const allOk = results.every(res => res.ok);
      
      if (allOk) {
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
    if (!await window.confirm("Hapus riwayat pelanggaran ini? Data poin siswa akan dikurangi kembali.")) return;
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
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-[var(--ui-radius-small)] shadow-md border flex items-center gap-3 transition-all ${
          toast.type === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-red-50 border-red-200 text-red-800"
        }`}>
          {toast.type === "success" ? <CheckCircle2 size={20} className="text-emerald-500"/> : <AlertTriangle size={20} className="text-red-500"/>}
          <p className="font-bold text-sm">{toast.message}</p>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmViolation && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-[var(--ui-radius-card)] shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
               <div className="p-6">
                  <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mb-4 mx-auto">
                     <ShieldAlert size={24} className="text-amber-600" />
                  </div>
                  <h3 className="text-xl font-black text-slate-800 text-center mb-2">Konfirmasi Simpan Pelanggaran</h3>
                  <p className="text-slate-500 text-center text-xs mb-6">
                     Menyimpan <strong className="text-slate-700">{selectedViolations.length} jenis pelanggaran</strong> untuk <strong className="text-slate-700">{selectedStudents.length} siswa</strong>. Total Tambahan: <span className="font-black text-rose-600">+{totalPoin} Poin</span>.
                  </p>
                  
                  <div className="bg-slate-50 rounded-xl p-3 text-xs text-slate-600 mb-3 border border-slate-100 max-h-[90px] overflow-y-auto">
                     <span className="font-extrabold text-slate-700 block mb-1">Daftar Pelanggaran (+{totalPoin} Poin):</span>
                     {selectedViolations.map(v => v.nama_tindakan).join(", ")}
                  </div>
                  
                  <div className="bg-slate-50 rounded-xl p-3 text-xs text-slate-600 mb-6 border border-slate-100 max-h-[90px] overflow-y-auto">
                     <span className="font-extrabold text-slate-700 block mb-1">Daftar Siswa Terpilih:</span>
                     {selectedStudents.map(s => s.namaSiswa || s.name).join(", ")}
                  </div>

                  {errorMsg && (
                    <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl flex items-start gap-2 text-rose-600 text-xs font-semibold mb-4">
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
                           <><Check size={16}/> Simpan & Kirim</>
                        )}
                     </Button>
                  </div>
               </div>
            </div>
         </div>
      )}

      {/* MOBILE STEP TABS SWITCHER (< lg) */}
      <div className="flex lg:hidden bg-slate-100 p-1 rounded-2xl border border-slate-200 gap-1 shrink-0">
        <button
          type="button"
          onClick={() => setMobileTab('siswa')}
          className={`flex-1 py-2 px-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer border-none ${
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
          className={`flex-1 py-2 px-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer border-none ${
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
          className={`flex-1 py-2 px-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer border-none ${
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
      <div className="flex flex-col lg:flex-row gap-6">
        
        {/* LEFT PANEL: Student Selector */}
        <div className={`w-full lg:w-1/3 ui-card flex flex-col overflow-hidden border border-slate-100 ${mobileTab === 'siswa' ? 'block' : 'hidden lg:flex'}`}>
           <div className="p-4 border-b border-slate-100 bg-slate-50">
              <h2 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                 <User size={18} className="text-[var(--ui-primary)]"/> Pilih Siswa
              </h2>
              <div className="space-y-3">
                 <div className="relative">
                   <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                   <input 
                     type="text"
                     placeholder="Cari nama atau NIS..."
                     value={search}
                     onChange={(e) => setSearch(e.target.value)}
                     className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-[var(--ui-radius-small)] text-sm font-medium focus:outline-none focus:border-[var(--ui-primary)]"
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

           <div className="max-h-[380px] lg:max-h-[550px] overflow-y-auto p-2 space-y-1 custom-scrollbar">
              {filteredStudents.map(student => {
                 const isSelected = selectedStudents.some(s => s.nis === student.nis);
                 return (
                    <button
                       key={student.nis}
                       type="button"
                       onClick={() => toggleStudent(student)}
                       className={`w-full text-left flex items-center justify-between p-3 rounded-xl border transition-all text-slate-800 cursor-pointer ${
                         isSelected
                           ? 'border-[var(--ui-primary)] bg-[var(--ui-primary)]/10 font-bold shadow-xs'
                           : 'border-slate-100 bg-white hover:bg-slate-50'
                       }`}
                    >
                       <div className="min-w-0 flex-1 pr-2">
                          <div className="text-xs sm:text-sm font-extrabold truncate">{student.namaSiswa || student.name || student.nama || student.nama_siswa ||'-'}</div>
                          <div className="text-[10px] text-slate-400 font-bold mt-0.5">{student.nis} • {student.class_name}</div>
                       </div>
                       {isSelected ? (
                         <div className="w-5 h-5 rounded-full bg-[var(--ui-primary)] text-white flex items-center justify-center shrink-0 shadow-xs">
                           <Check size={12} className="stroke-[3]" />
                         </div>
                       ) : (
                         <div className="w-5 h-5 rounded-full border border-slate-200 bg-slate-50 flex items-center justify-center shrink-0" />
                       )}
                    </button>
                 );
              })}
              {filteredStudents.length === 0 && (
                 <div className="text-center py-8 text-slate-400 text-xs">Siswa tidak ditemukan</div>
              )}
           </div>
        </div>
  
        {/* RIGHT PANEL: Quick Action POS & Selected Tray */}
        <div className={`w-full lg:w-2/3 flex flex-col gap-6 ${mobileTab === 'pelanggaran' ? 'block' : 'hidden lg:flex'}`}>
           {/* Selected Tray */}
           <div className="ui-card p-4 border border-slate-100">
              <div className="flex items-center justify-between mb-3">
                 <h2 className="font-bold text-slate-800 text-xs sm:text-sm flex items-center gap-2">
                    <CheckCircle2 size={18} className="text-emerald-600"/> Siswa Terpilih ({selectedStudents.length})
                 </h2>
                 {selectedStudents.length > 0 && (
                    <Button variant="ghost" size="sm" onClick={() => setSelectedStudents([])} className="text-xs text-rose-600 hover:bg-rose-50">Kosongkan</Button>
                 )}
              </div>
              
              <div className="min-h-[60px] p-3 bg-slate-50 border border-slate-100 rounded-xl flex flex-wrap gap-1.5">
                 {selectedStudents.length === 0 ? (
                    <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs italic py-2">
                       Belum ada siswa yang dipilih. Cari & klik siswa di langkah ke-1.
                    </div>
                 ) : (
                    selectedStudents.map(student => (
                       <span key={student.nis} className="inline-flex items-center gap-1.5 pl-2.5 pr-1 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 shadow-xs">
                          {student.namaSiswa || student.name}
                          <button 
                            type="button" 
                            onClick={() => toggleStudent(student)}
                            className="w-4 h-4 rounded-full bg-slate-100 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors flex items-center justify-center cursor-pointer border-none shrink-0"
                          >
                            <X size={10} className="stroke-[3]" />
                          </button>
                       </span>
                    ))
                 )}
              </div>
           </div>
  
           {/* POS Action Grid */}
           <div className="ui-card p-4 sm:p-6 border border-slate-100">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                <div>
                  <h2 className="font-black text-slate-800 text-sm sm:text-base flex items-center gap-2">
                     <ShieldAlert size={18} className="text-amber-500"/> Input Pelanggaran Cepat
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">Pilih jenis pelanggaran di bawah ini (bisa lebih dari 1).</p>
                </div>
                {selectedViolations.length > 0 && (
                  <span className="text-xs font-black px-3 py-1 rounded-full bg-rose-100 text-rose-700 self-start sm:self-auto">
                    +{totalPoin} Poin Terpilih
                  </span>
                )}
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
                 {violations.length === 0 ? (
                    <div className="col-span-full py-8 text-center text-slate-400 text-xs italic border border-dashed border-slate-200 rounded-xl">
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
                             className={`flex flex-col items-center justify-center text-center p-3 sm:p-4 rounded-xl border transition-all select-none focus:outline-none w-full ${
                               isDisabled
                                 ? 'opacity-40 cursor-not-allowed bg-slate-50 border-slate-100'
                                 : isSelected
                                   ? 'border-[var(--ui-primary)] bg-[var(--ui-primary)]/10 shadow-xs text-[var(--ui-primary)] cursor-pointer'
                                   : 'border-slate-200 bg-white hover:bg-slate-50 shadow-xs text-slate-700 cursor-pointer'
                             }`}
                          >
                             <div className={`p-2.5 rounded-lg mb-2 ${style.bg} ${isSelected ? 'ring-2 ring-[var(--ui-primary)]/30' : ''}`}>
                                <Icon size={18} className={style.color} />
                             </div>
                             <h3 className={`text-xs font-extrabold leading-tight mb-1.5 ${isSelected ? 'text-[var(--ui-primary)]' : 'text-slate-800'}`}>{v.nama_tindakan}</h3>
                             <span className={`text-[9px] font-black px-2 py-0.5 rounded-full tracking-wider ${isSelected ? 'text-white bg-rose-500 shadow-xs' : 'text-rose-600 bg-rose-50 border border-rose-100'}`}>+{v.nilai_poin} POIN</span>
                          </button>
                       );
                    })
                 )}
              </div>
  
              <div className="flex justify-end pt-4 border-t border-slate-100">
                 <Button
                    onClick={() => setConfirmViolation(true)}
                    disabled={selectedStudents.length === 0 || selectedViolations.length === 0 || isSubmitting}
                    className="w-full sm:w-auto px-6 py-2.5 flex items-center justify-center gap-2 font-black text-xs cursor-pointer shadow-sm"
                 >
                    <CheckCircle2 size={16} /> Simpan & Kirim Notifikasi
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
                 <div className="text-center py-6 text-slate-400 text-xs italic bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    Belum ada pelanggaran yang diinput hari ini.
                 </div>
              ) : (
                 <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
                    {history.map(item => {
                       const student = students.find(s => s.nis === item.siswa_nis);
                       const studentName = student ? (student.namaSiswa || student.name) : item.siswa_nis;
                       return (
                          <div key={item.id} className="flex justify-between items-center p-3 border border-slate-100 bg-slate-50 rounded-xl gap-2">
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
                                <span className="text-[10px] font-black text-rose-600 bg-white border border-rose-100 px-2 py-0.5 rounded-lg shadow-xs">
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
        <div className="lg:hidden fixed bottom-3 left-3 right-3 z-40 bg-slate-900/95 backdrop-blur-md text-white p-3 rounded-2xl shadow-xl border border-slate-800 flex items-center justify-between gap-2 animate-in slide-in-from-bottom-4 duration-200">
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
