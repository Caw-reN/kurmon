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
  return { icon: FileText, color:'text-slate-500', bg:'bg-slate-50' };
};

export default function PanelPiket({ students = [], classes = [] }) {
  const [search, setSearch] = useState("");
  const [filterClass, setFilterClass] = useState("all");
  
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
  const [piketHariIni, setPiketHariIni] = useState(false);
  const [checkingPiket, setCheckingPiket] = useState(true);

  const todayName = useMemo(() => {
    const dayIdx = new Date().getDay();
    const days = ["Minggu","Senin","Selasa","Rabu","Kamis","Jumat","Sabtu"];
    return days[dayIdx];
  }, []);

  // Fetch history
  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch("/api/kedisiplinan/riwayat", {
        headers: {"Authorization": `Bearer ${authToken}` }
      });
      const data = await res.json();
      if (data.ok) {
        // Filter only today's input from Piket
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
        setViolations(data.data.filter(v => v.jenis.toLowerCase() ==='pelanggaran'));
      }
    } catch (e) {
      console.error("Failed to fetch master poin", e);
    }
  }, [authToken]);

  useEffect(() => {
    fetchHistory();
    fetchMasterPoin();

    const checkTodayPiket = async () => {
      try {
        const res = await fetch("/api/kedisiplinan/jadwal", {
          headers: {"Authorization": `Bearer ${authToken}` }
        });
        const data = await res.json();
        if (data.ok && Array.isArray(data.data)) {
          
          const storageUser = localStorage.getItem('school_schedule_session_v1') || sessionStorage.getItem('school_schedule_session_v1');
          if (storageUser) {
            const userObj = JSON.parse(storageUser);
            const myCode = userObj?.code || userObj?.id;
            
            if (myCode) {
              let isOnDuty = false;
              data.data.forEach(s => {
                if (String(s.hari).toLowerCase() === todayName.toLowerCase()) {
                  let ids = s.guru_ids;
                  if (typeof ids ==="string") {
                    try {
                      ids = JSON.parse(ids);
                    } catch {
                      // ignore parse error
                    }
                  }
                  if (Array.isArray(ids) && ids.some(id => String(id).trim().toLowerCase() === String(myCode).trim().toLowerCase())) {
                    isOnDuty = true;
                  }
                }
              });
              setPiketHariIni(isOnDuty);
            }
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setCheckingPiket(false);
      }
    };
    checkTodayPiket();
  }, [authToken, fetchHistory, fetchMasterPoin]);

  // Filter students for left panel
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const studentName = s.namaSiswa || s.name || s.nama || s.nama_siswa ||'';
      const matchSearch = studentName.toLowerCase().includes(search.toLowerCase()) || String(s.nis).includes(search);
      const matchClass = filterClass ==='all' || s.class_name === filterClass;
      return matchSearch && matchClass;
    }).slice(0, 50); // Limit to 50 for performance
  }, [students, search, filterClass]);

  const toggleStudent = (student) => {
    setSelectedStudents(prev => {
      const exists = prev.find(s => s.nis === student.nis);
      if (exists) return prev.filter(s => s.nis !== student.nis);
      return [...prev, student];
    });
  };

  const toggleViolation = (violation) => {
    setSelectedViolations(prev => {
      const exists = prev.find(v => v.id === violation.id);
      if (exists) return prev.filter(v => v.id !== violation.id);
      return [...prev, violation];
    });
  };

  const showToast = (message, type ="success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const submitViolation = async () => {
    setErrorMsg("");
    if (selectedStudents.length === 0) {
       setErrorMsg("Pilih minimal 1 siswa terlebih dahulu!");
       return;
    }
    if (selectedViolations.length === 0) {
       setErrorMsg("Pilih minimal 1 pelanggaran!");
       return;
    }
    setIsSubmitting(true);
    
    try {
      let promises = [];
      selectedStudents.forEach(student => {
         selectedViolations.forEach(violation => {
            const payload = {
              siswa_nis: student.nis,
              tindakan_id: violation.id,
              tindakan_nama: violation.nama_tindakan,
              poin: violation.nilai_poin,
              jenis: violation.jenis,
              catatan:'Input Cepat Panel Piket'
            };
            promises.push(
               fetch("/api/kedisiplinan/riwayat", {
                 method:"POST",
                 headers: {"Content-Type":"application/json","Authorization": `Bearer ${authToken}`
                 },
                 body: JSON.stringify(payload)
               })
            );
         });
      });
      
      const results = await Promise.all(promises);
      const allOk = results.every(res => res.ok);
      
      if (allOk) {
         showToast("Berhasil menyimpan pelanggaran & mengirim WA!","success");
         
         const violationsStr = selectedViolations.map(v => v.nama_tindakan).join(',');
         const totalPoin = selectedViolations.reduce((sum, v) => sum + v.nilai_poin, 0);

         // Trigger WA notifications asynchronously
         if (isWaAutoPelanggaran) {
           selectedStudents.forEach(student => {
              const phone = student.phone || student.wa_ortu;
              if (phone) {
                 fetch("/api/whatsapp/send", {
                   method:"POST",
                   headers: {"Content-Type":"application/json","Authorization": `Bearer ${authToken}` },
                   body: JSON.stringify({
                     phone: phone,
                     message: `[INFO KEDISIPLINAN]\nNama: ${student.namaSiswa || student.name}\nPelanggaran: ${violationsStr}\nPoin Tambahan: +${totalPoin}\n\nMohon kerjasamanya untuk membimbing putra/putri Bapak/Ibu. Terima kasih.`,
                     trigger_type:'kedisiplinan_cepat'
                   })
                 }).catch(e => console.error("WA Trigger error", e));
              }
           });
         }

         setSelectedStudents([]); // Clear selection after success
         setSelectedViolations([]); // Clear selected violations
         fetchHistory(); // Refresh history
         setConfirmViolation(false); // Close modal
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
    if (!await window.confirmAsync("Hapus riwayat pelanggaran ini? Data poin siswa akan dikurangi kembali.")) return;
    try {
      const res = await fetch("/api/kedisiplinan/riwayat", {
        method:"POST",
        headers: {"Content-Type":"application/json","Authorization": `Bearer ${authToken}` },
        body: JSON.stringify({ action:"delete", id })
      });
      if (res.ok) {
        showToast("Riwayat pelanggaran berhasil dihapus","success");
        fetchHistory();
      }
    } catch (e) {
      console.error(e);
      showToast("Gagal menghapus riwayat","error");
    }
  };

  return (
    <div className="flex flex-col gap-4 w-full animate-in fade-in duration-300 relative z-10 h-full">
      {!piketHariIni && !checkingPiket && (
        <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4 flex items-start gap-3 text-amber-800 animate-in fade-in duration-300 shadow-sm">
          <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={18} />
          <div className="flex flex-col">
            <span className="text-[12px] font-black leading-tight">Tidak ada jadwal piket pada hari {todayName}</span>
            <span className="text-[10px] font-bold text-amber-600 mt-1">
              Anda tetap dapat mengakses menu piket, mendata siswa, dan menginput poin pelanggaran.
            </span>
          </div>
        </div>
      )}
      <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-[var(--ui-radius-small)] shadow-sm border flex items-center gap-3 transition-all ${
          toast.type ==="success" ?"bg-emerald-50 border-emerald-200 text-emerald-800" :"bg-red-50 border-red-200 text-red-800"
        }`}>
          {toast.type ==="success" ? <CheckCircle2 size={20} className="text-emerald-500"/> : <AlertTriangle size={20} className="text-red-500"/>}
          <p className="font-bold text-sm">{toast.message}</p>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmViolation && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-[var(--ui-radius-small)] shadow-sm w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
               <div className="p-6">
                  <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mb-4 mx-auto">
                     <ShieldAlert size={24} className="text-amber-600" />
                  </div>
                  <h3 className="text-xl font-black text-slate-800 text-center mb-2">Konfirmasi Tindakan</h3>
                  <p className="text-slate-500 text-center text-sm mb-6">
                     Anda akan menyimpan <strong className="text-slate-700">{selectedViolations.length} pelanggaran</strong> untuk <strong className="text-slate-700">{selectedStudents.length} siswa</strong>. {isWaAutoPelanggaran ? <span className="text-red-500 font-bold">Notifikasi WhatsApp akan langsung dikirimkan ke orang tua masing-masing siswa (jika nomor terdaftar).</span> :"Notifikasi WhatsApp otomatis saat ini dinonaktifkan."} Lanjutkan?
                  </p>
                  
                  <div className="bg-slate-50 rounded-[var(--ui-radius-small)] p-3 text-xs text-slate-600 mb-2 border-none max-h-[80px] overflow-y-auto">
                     <span className="font-bold text-slate-700 block mb-1">Daftar Pelanggaran ({selectedViolations.reduce((sum, v) => sum + v.nilai_poin, 0)} Poin):</span>
                     {selectedViolations.map(v => v.nama_tindakan).join(",")}
                  </div>
                  
                  <div className="bg-slate-50 rounded-[var(--ui-radius-small)] p-3 text-xs text-slate-600 mb-6 border-none max-h-[80px] overflow-y-auto">
                     <span className="font-bold text-slate-700 block mb-1">Daftar Siswa:</span>
                     {selectedStudents.map(s => s.namaSiswa || s.name).join(",")}
                  </div>

                  {errorMsg && (
                    <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl flex items-start gap-2 text-rose-600 text-xs font-semibold animate-in zoom-in-95 duration-200 mb-4">
                      <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                      <span className="leading-relaxed">{errorMsg}</span>
                    </div>
                  )}

                  <div className="flex gap-3">
                     <Button
                        variant="outline"
                        onClick={() => setConfirmViolation(false)}
                        disabled={isSubmitting}
                        className="flex-1"
                     >
                        Batal
                     </Button>
                     <Button
                        onClick={() => submitViolation()}
                        disabled={isSubmitting}
                        className="flex-1"
                     >
                        {isSubmitting ? (
                           <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                        ) : (
                           <><Check size={16}/> Ya, Kirim & Simpan</>
                        )}
                     </Button>
                  </div>
               </div>
            </div>
         </div>
      )}

      {/* LEFT PANEL: Student Selector */}
      <div className="w-full lg:w-1/3 ui-card flex flex-col overflow-hidden">
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
                   className="w-full pl-9 pr-4 py-2 bg-white border-none rounded-[var(--ui-radius-small)] text-sm font-medium focus:outline-none focus:border-[var(--ui-primary)]"
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
         <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {filteredStudents.map(student => {
               const isSelected = selectedStudents.some(s => s.nis === student.nis);
               return (
                  <button
                     key={student.nis}
                     type="button"
                     onClick={() => toggleStudent(student)}
                     className={`w-full text-left flex items-center justify-between p-3 rounded-xl border transition-all text-slate-800 cursor-pointer ${
                       isSelected
                         ? 'border-[var(--ui-primary)] bg-[var(--ui-primary)]/5 font-bold shadow-sm'
                         : 'border-slate-100 bg-white hover:bg-slate-50'
                     }`}
                  >
                     <div className="min-w-0 flex-1 pr-2">
                        <div className="text-sm font-extrabold truncate">{student.namaSiswa || student.name || student.nama || student.nama_siswa ||'-'}</div>
                        <div className="text-[10px] text-slate-400 font-bold mt-0.5">{student.nis} • {student.class_name}</div>
                     </div>
                     {isSelected ? (
                       <div className="w-5 h-5 rounded-full bg-[var(--ui-primary)] text-white flex items-center justify-center shrink-0 shadow-sm">
                         <Check size={12} className="stroke-[3]" />
                       </div>
                     ) : (
                       <div className="w-5 h-5 rounded-full border border-slate-200 bg-slate-50 flex items-center justify-center shrink-0" />
                     )}
                  </button>
               );
            })}
            {filteredStudents.length === 0 && (
               <div className="text-center py-8 text-slate-400 text-sm">Siswa tidak ditemukan</div>
            )}
         </div>
      </div>
 
      {/* RIGHT PANEL: Quick Action POS */}
      <div className="w-full lg:w-2/3 flex flex-col gap-6 h-[calc(100vh-160px)]">
         {/* Selected Tray */}
         <div className="ui-card p-4">
            <div className="flex items-center justify-between mb-3">
               <h2 className="font-bold text-slate-800 flex items-center gap-2">
                  <CheckCircle2 size={18} className="text-emerald-600"/> Terpilih ({selectedStudents.length})
               </h2>
               {selectedStudents.length > 0 && (
                  <Button variant="ghost" size="sm" onClick={() => setSelectedStudents([])} >Kosongkan</Button>
               )}
            </div>
            
            <div className="min-h-[80px] p-3 bg-slate-50 border-none rounded-[var(--ui-radius-small)] flex flex-wrap gap-2">
               {selectedStudents.length === 0 ? (
                  <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm italic">
                     Belum ada siswa yang dipilih. Cari & klik siswa di panel kiri.
                  </div>
               ) : (
                  selectedStudents.map(student => (
                     <span key={student.nis} className="inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1 bg-white border border-slate-100 rounded-lg text-xs font-bold text-slate-700 shadow-sm animate-in zoom-in-95 duration-100">
                        {student.namaSiswa || student.name}
                        <button 
                          type="button" 
                          onClick={() => toggleStudent(student)}
                          className="w-5 h-5 rounded-full bg-slate-100 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors flex items-center justify-center cursor-pointer border-none shrink-0"
                        >
                          <X size={10} className="stroke-[3]" />
                        </button>
                     </span>
                  ))
               )}
            </div>
         </div>
 
         {/* POS Action Grid */}
         <div className="ui-card p-6 flex-shrink-0 overflow-y-auto" style={{ maxHeight:'50%' }}>
            <h2 className="font-bold text-slate-800 mb-1 flex items-center gap-2">
               <ShieldAlert size={18} className="text-[var(--ui-primary)]"/> Input Pelanggaran Cepat
            </h2>
            <p className="text-sm text-slate-500 mb-6">Pilih siswa di atas, lalu klik pelanggaran di bawah ini (bisa pilih lebih dari 1).</p>
            
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
               {violations.length === 0 ? (
                  <div className="col-span-full py-8 text-center text-slate-500 italic border border-dashed border-slate-200 rounded-[var(--ui-radius-small)]">
                     Belum ada master poin pelanggaran. Silakan tambahkan di menu Master Poin Kedisiplinan.
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
                           className={`flex flex-col items-center justify-center text-center p-4 rounded-[var(--ui-radius-card)] border transition-all select-none focus:outline-none w-full ${
                             isDisabled
                               ? 'opacity-40 cursor-not-allowed bg-slate-50 border-slate-100'
                               : isSelected
                                 ? 'border-[var(--ui-primary)] bg-[var(--ui-primary)]/5 shadow-sm text-[var(--ui-primary)] cursor-pointer'
                                 : 'border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 shadow-sm text-slate-700 cursor-pointer'
                           }`}
                        >
                           <div className={`p-3 rounded-[var(--ui-radius-small)] mb-2.5 ${style.bg} ${isSelected ? 'ring-2 ring-[var(--ui-primary)]/30' : ''}`}>
                              <Icon size={20} className={style.color} />
                           </div>
                           <h3 className={`text-xs sm:text-sm font-extrabold leading-tight mb-1.5 ${isSelected ? 'text-[var(--ui-primary)]' : 'text-slate-800'}`}>{v.nama_tindakan}</h3>
                           <span className={`text-[9px] font-black px-2 py-0.5 rounded-full tracking-wider ${isSelected ? 'text-white bg-rose-500 shadow-sm' : 'text-rose-600 bg-rose-50 border border-rose-100'}`}>+{v.nilai_poin} POIN</span>
                        </button>
                     );
                  })
               )}
            </div>

            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl flex items-start gap-2 text-rose-600 text-xs font-semibold animate-in zoom-in-95 duration-200 mb-4">
                <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                <span className="leading-relaxed">{errorMsg}</span>
              </div>
            )}
            
            <div className="flex justify-end pt-4 border-t border-slate-100">
               <Button
                  onClick={() => setConfirmViolation(true)}
                  disabled={selectedStudents.length === 0 || selectedViolations.length === 0 || isSubmitting}
               >
                  <CheckCircle2 size={18} className="mr-2" /> Simpan & Kirim Pesan
               </Button>
            </div>
         </div>

         {/* History Section */}
         <div className="ui-card p-6 flex flex-col flex-1 overflow-hidden">
            <h2 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
               <History size={18} className="text-[var(--ui-primary)]"/> Riwayat Input Hari Ini
            </h2>
            {history.length === 0 ? (
               <div className="text-center py-6 text-slate-400 text-sm italic bg-slate-50 rounded-[var(--ui-radius-small)] border border-dashed border-slate-200">
                  Belum ada pelanggaran yang diinput hari ini.
               </div>
            ) : (
               <div className="space-y-2 flex-1 overflow-y-auto pr-2">
                  {history.map(item => {
                     const student = students.find(s => s.nis === item.siswa_nis);
                     const studentName = student ? (student.namaSiswa || student.name) : item.siswa_nis;
                     return (
                        <div key={item.id} className="flex justify-between items-center p-3 border-none bg-slate-50 rounded-[var(--ui-radius-small)]">
                           <div>
                              <div className="font-bold text-slate-700 text-sm flex items-center gap-2">
                                 {studentName} <ChevronRight size={12} className="text-slate-400"/> <span className="text-red-600">{item.tindakan_nama}</span>
                              </div>
                              <div className="text-[10px] text-slate-500 font-semibold mt-0.5">
                                 {new Date(item.tanggal_kejadian).toLocaleTimeString('id-ID', {hour:'2-digit', minute:'2-digit'})} WIB • Oleh: {item.pelapor_nama}
                              </div>
                           </div>
                           <div className="flex items-center gap-3">
                              <span className="text-xs font-black text-red-500 bg-white border border-red-100 px-2.5 py-1 rounded-[var(--ui-radius-small)] shadow-sm">
                                 +{item.poin}
                              </span>
                              <Button variant="outline" onClick={() =>deleteHistory(item.id)}  title="Hapus Riwayat">
                                 <Trash2 size={16}/></Button>
                           </div>
                        </div>
                     );
                  })}
               </div>
            )}
         </div>
         </div>
      </div>
    </div>
  );
}
