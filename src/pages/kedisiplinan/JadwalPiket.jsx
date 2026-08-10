import { useState, useEffect, useCallback } from'react';
import useAuthStore from'../../store/monitoring/authStore.js';
import { CheckCircle2, AlertTriangle, Printer, CalendarIcon, Edit2, Users, Trash2, Search, X } from'lucide-react';
import { Modal, Button } from '../../components/ui.jsx';
import { CustomSelect } from'../../components/CustomSelect.jsx';


const DAYS = ["Senin","Selasa","Rabu","Kamis","Jumat"];

export default function JadwalPiket({ teachers = [] }) {
  const [schedules, setSchedules] = useState([]);
  const [filterKampus, setFilterKampus] = useState("Kampus A");
  
  const user = useAuthStore(state => state.user);
  const authToken = user?.authToken;
  const canEdit = !!(authToken && user?.role && user.role !=="guru");
  
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ hari:'Senin', kampus:'Kampus A', guru_ids: [], pj_code:'' });
  const [searchGuru, setSearchGuru] = useState('');
  
  const [errorMsg, setErrorMsg] = useState("");
  const [toast, setToast] = useState(null);

  const fetchJadwal = useCallback(async () => {
    try {
      const headers = authToken ? {"Authorization": `Bearer ${authToken}` } : {};
      const res = await fetch("/api/kedisiplinan/jadwal", { headers });
      const data = await res.json();
      if (data.ok) {
        setSchedules(data.data || []);
      }
    } catch (e) {
      console.error(e);
    }
  }, [authToken]);

  useEffect(() => {
    fetchJadwal();
  }, [fetchJadwal]);

  const showToast = (message, type ="success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    const ids = form.guru_ids || [];
    if (!form.hari || ids.length === 0) {
      setErrorMsg("Lengkapi form terlebih dahulu!");
      return;
    }
    
    if (!form.pj_code) {
      setErrorMsg("Pilih penanggung jawab (PJ) piket!");
      return;
    }

    if (!ids.includes(form.pj_code)) {
      setErrorMsg("Penanggung jawab harus termasuk dalam daftar guru piket terpilih!");
      return;
    }
    
    // Check if this day and campus already exists (when not editing)
    if (!editingId && schedules.some(s => s.hari === form.hari && s.kampus === form.kampus)) {
       setErrorMsg("Jadwal untuk hari dan kampus ini sudah ada! Silakan edit jadwal yang sudah ada.");
       return;
    }

    try {
      const payload = { ...form, id: editingId, guru_ids: ids, action: editingId ?"update" :"create" };
      const res = await fetch("/api/kedisiplinan/jadwal", {
        method:"POST",
        headers: {"Content-Type":"application/json","Authorization": `Bearer ${authToken}` },
        body: JSON.stringify(payload)
      });
      const result = await res.json();
      
      if (result.ok) {
        showToast("Berhasil menyimpan jadwal!");
        fetchJadwal();
        setShowFormModal(false);
      } else {
        setErrorMsg("Gagal menyimpan data.");
      }
    } catch (error) {
      console.error(error);
      setErrorMsg("Gagal menyimpan data.");
    }
  };

  const handleRemoveTeacher = async (jadwal, teacherIdToRemove) => {
    if (!await window.confirmAsync("Hapus guru piket ini dari jadwal?")) return;
    try {
      const updatedIds = jadwal.guru_ids.filter(id => id !== teacherIdToRemove);
      let payload = {
         id: jadwal.id,
         hari: jadwal.hari,
         kampus: jadwal.kampus,
         guru_ids: updatedIds,
         pj_code: jadwal.pj_code === teacherIdToRemove ?'' : jadwal.pj_code,
         action:"update"
      };
      
      if (updatedIds.length === 0) {
         payload = { action:"delete", id: jadwal.id };
      }

      const res = await fetch("/api/kedisiplinan/jadwal", {
        method:"POST",
        headers: {"Content-Type":"application/json","Authorization": `Bearer ${authToken}` },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        showToast("Guru piket berhasil dihapus!","success");
        fetchJadwal();
      } else {
        showToast("Gagal menghapus guru piket","error");
      }
    } catch (e) {
      console.error(e);
      showToast("Kesalahan server","error");
    }
  };

  const openForm = (sched = null, defaultDay ="Senin") => {
    setErrorMsg("");
    setSearchGuru("");
    if (sched) {
      setEditingId(sched.id);
      setForm({ 
        hari: sched.hari, 
        kampus: sched.kampus, 
        guru_ids: sched.guru_ids || [],
        pj_code: sched.pj_code ||''
      });
    } else {
      setEditingId(null);
      setForm({ hari: defaultDay, kampus: filterKampus, guru_ids: [], pj_code:'' });
    }
    setShowFormModal(true);
  };
  
  const toggleTeacher = (teacherCode) => {
     setForm(prev => {
        const ids = prev.guru_ids || [];
        let nextIds;
        let nextPj = prev.pj_code;
        if (ids.includes(teacherCode)) {
           nextIds = ids.filter(code => code !== teacherCode);
           if (nextPj === teacherCode) {
              nextPj ='';
           }
        } else {
           nextIds = [...ids, teacherCode];
        }
        return { ...prev, guru_ids: nextIds, pj_code: nextPj };
     });
  };

  return (
    <div className="flex flex-col gap-4 animate-in fade-in duration-300">
      
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-[var(--ui-radius-small)] shadow-sm border flex items-center gap-3 transition-all ${
          toast.type ==="success" ?"bg-emerald-50 border-emerald-200 text-emerald-800" :"bg-red-50 border-red-200 text-red-800"
        }`}>
          {toast.type ==="success" ? <CheckCircle2 size={20} className="text-emerald-500"/> : <AlertTriangle size={20} className="text-rose-500"/>}
          <p className="font-bold text-sm">{toast.message}</p>
        </div>
      )}

      {/* Control Bar */}
      <div className="ui-card p-4 flex flex-col sm:flex-row justify-between gap-3 items-stretch sm:items-center print:hidden">
         <div className="w-full sm:w-auto">
            <Button variant="outline" 
              type="button"
              onClick={() => window.print()}
              className="w-full sm:w-auto flex items-center justify-center gap-2 cursor-pointer font-bold text-xs py-2.5 shadow-xs"
            >
              <Printer size={15} className="stroke-[2.2]" />
              Cetak Jadwal Piket
            </Button>
         </div>
         <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider shrink-0">Pilih Kampus:</label>
            <div className="flex bg-slate-100/90 p-1 rounded-[var(--ui-radius-small)] w-full sm:w-auto border border-slate-200/60">
               {["Kampus A", "Kampus B"].map(k => (
                  <Button variant="outline" 
                     key={k} 
                     type="button"
                     onClick={() => setFilterKampus(k)}
                     className={`flex-1 sm:flex-initial text-xs font-black py-1.5 px-4 rounded-[var(--ui-radius-small)] transition-all cursor-pointer border-none ${filterKampus === k ? 'bg-white text-[var(--ui-primary)] shadow-sm font-black' : 'text-slate-500 hover:text-slate-800'}`}
                  >
                     {k}
                  </Button>
               ))}
            </div>
         </div>
      </div>

      {/* PRINT HEADER FOR PIKET */}
      <div className="hidden print:block text-center mb-6">
        <h2 className="text-xl font-black uppercase text-slate-800">Jadwal Piket Guru - {filterKampus}</h2>
        <p className="text-xs text-slate-500 font-semibold mt-1">Dicetak pada: {new Date().toLocaleDateString("id-ID")}</p>
      </div>

      {/* Grid Hari */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
         {DAYS.map(day => {
            const jadwalHariIni = schedules.find(s => s.hari === day && s.kampus === filterKampus);
            
            return (
               <div key={day} className="ui-card flex flex-col overflow-hidden">
                  <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                     <h2 className="font-bold text-slate-800 flex items-center gap-2">
                        <CalendarIcon size={18} className="text-[var(--ui-primary)]"/> {day}
                     </h2>
                     {canEdit && (
                        <div className="flex items-center gap-2">
                           <Button variant="outline" 
                              onClick={() =>openForm(jadwalHariIni, day)}
                              className="flex items-center gap-1"
                           >
                              <Edit2 size={13} />
                              Edit</Button>
                        </div>
                     )}
                  </div>
                  <div className="p-4 flex-1">
                     {!jadwalHariIni || !Array.isArray(jadwalHariIni.guru_ids) || jadwalHariIni.guru_ids.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-2 py-4">
                           <Users size={32} className="opacity-20" />
                           <p className="text-sm italic">Belum ada guru piket</p>
                        </div>
                     ) : (
                        <div className="space-y-2">
                           {(jadwalHariIni.guru_ids || []).map(tid => {
                              const t = (teachers || []).find(x => x.code === tid);
                              const isPj = String(jadwalHariIni.pj_code ||'').trim().toLowerCase() === String(tid).trim().toLowerCase();
                              return (
                                 <div key={tid} className={`px-3 py-2 border rounded-[var(--ui-radius-small)] shadow-sm flex items-center gap-3 transition-all ${
                                    isPj 
                                    ?'bg-amber-50/40 border-amber-300 ring-1 ring-amber-300/30' 
                                    :'bg-white border-transparent'
                                 }`}>
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                                       isPj 
                                       ?'bg-amber-500 text-white shadow-sm shadow-amber-200' 
                                       :'bg-[var(--ui-primary)]/10 text-[var(--ui-primary)]'
                                    }`}>
                                       {t ? t.name?.charAt(0) :'?'}
                                    </div>
                                    <div className="flex-1 overflow-hidden">
                                       <div className="flex items-center gap-1.5">
                                          <p className={`text-sm font-bold truncate ${isPj ?'text-amber-800' :'text-slate-800'}`}>{t ? t.name : tid}</p>
                                          {isPj && (
                                             <span className="shrink-0 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-500 text-white text-[8px] font-black tracking-wider uppercase shadow-sm">
                                                PJ
                                             </span>
                                          )}
                                       </div>
                                       <p className={`text-[10px] font-semibold ${isPj ?'text-amber-600' :'text-slate-500'}`}>{t?.code ||'-'}</p>
                                    </div>
                                    {canEdit && (
                                        <Button variant="outline"
                                          onClick={() =>handleRemoveTeacher(jadwalHariIni, tid)}
                                          className="shrink-0"
                                          title="Hapus Guru Ini"
                                        >
                                          <Trash2 size={14} /></Button>
                                     )}
                                 </div>
                              );
                           })}
                        </div>
                     )}
                  </div>
               </div>
            );
         })}
      </div>

      {/* Form Modal */}
      {showFormModal && (
        <Modal 
          isOpen={showFormModal} 
          onClose={() => setShowFormModal(false)}
          title={`Atur Jadwal Piket - ${form.hari}`}
        >
          <form onSubmit={handleSave} className="space-y-4">
            <div className="p-3 bg-slate-50 border-none rounded-[var(--ui-radius-small)]">
               <p className="text-sm font-bold text-slate-700">Hari: <span className="text-[var(--ui-primary)]">{form.hari}</span></p>
               <p className="text-sm font-bold text-slate-700">Kampus: <span className="text-[var(--ui-primary)]">{form.kampus}</span></p>
            </div>
            
            <div>
               <div className="flex items-center justify-between mb-2">
                 <label className="block text-sm font-bold text-slate-700">Pilih Guru Piket</label>
                 <span className="text-xs font-bold text-[var(--ui-primary)] font-mono">{(form.guru_ids || []).length} Terpilih</span>
               </div>

               {/* Search Input Guru */}
               <div className="relative mb-2">
                 <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                 <input
                   type="text"
                   placeholder="Cari nama atau kode guru..."
                   value={searchGuru}
                   onChange={(e) => setSearchGuru(e.target.value)}
                   className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-[var(--ui-radius-small)] text-xs font-semibold focus:outline-[var(--ui-primary)] focus:bg-white transition-colors"
                 />
                 {searchGuru && (
                   <button type="button" onClick={() => setSearchGuru('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer">
                     <X size={13} />
                   </button>
                 )}
               </div>

               <div className="max-h-[200px] overflow-y-auto border border-slate-200/80 rounded-[var(--ui-radius-small)] p-2 space-y-1 bg-slate-50/50">
                  {(() => {
                    const filtered = (teachers || []).filter(t => {
                      if (!searchGuru) return true;
                      const q = searchGuru.toLowerCase();
                      return (
                        String(t.name || '').toLowerCase().includes(q) ||
                        String(t.code || '').toLowerCase().includes(q)
                      );
                    });

                    if (filtered.length === 0) {
                      return <p className="text-xs text-slate-400 text-center py-4 italic font-medium">Guru "{searchGuru}" tidak ditemukan.</p>;
                    }

                    return filtered.map(t => {
                       const isSelected = (form.guru_ids || []).includes(t.code);
                       return (
                           <Button variant="outline"
                              type="button"
                              key={t.code}
                              onClick={() => toggleTeacher(t.code)}
                              className={`w-full text-left flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-[var(--ui-radius-small)] transition-colors cursor-pointer border ${
                                isSelected 
                                  ? "bg-emerald-50 border-emerald-300 text-emerald-900 font-bold shadow-2xs" 
                                  : "bg-white hover:bg-slate-100 border-slate-200 text-slate-700"
                              }`}
                           >
                              <span>{t.name} <span className="text-[10px] text-slate-400 font-mono ml-1">({t.code})</span></span>
                              {isSelected && <CheckCircle2 size={16} className="text-emerald-600 shrink-0 ml-2" />}
                           </Button>
                       );
                    });
                  })()}
               </div>
               {form.guru_ids && form.guru_ids.filter(id => !teachers.find(t => t.code === id)).length > 0 && (
                  <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-rose-600">
                    <AlertTriangle size={14} className="inline mr-1" />
                    Terdeteksi data guru tidak valid. Silakan uncheck semua atau hapus jadwal ini.
                    <div className="mt-1 flex flex-wrap gap-1">
                      {form.guru_ids.filter(id => !teachers.find(t => t.code === id)).map(id => (
                        <span key={id} className="bg-red-100 px-2 py-0.5 rounded cursor-pointer hover:bg-red-200" onClick={() => toggleTeacher(id)}>
                          Hapus ID: {id} &times;
                        </span>
                      ))}
                    </div>
                  </div>
               )}
            </div>

            {form.guru_ids && form.guru_ids.length > 0 && (
               <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                  <label className="block text-sm font-bold text-slate-700 mb-2">Pilih Penanggung Jawab (PJ) Piket</label>
                  <div className="w-full">
                     <CustomSelect 
                        options={[
                           { value:'', label:'-- Pilih PJ Piket --' },
                           ...(form.guru_ids || []).map(code => {
                              const t = (teachers || []).find(x => x.code === code);
                              return { value: code, label: t ? t.name : code };
                           })
                        ]}
                        value={form.pj_code ||''}
                        onChange={(val) => setForm(prev => ({ ...prev, pj_code: val }))}
                     />
                  </div>
               </div>
            )}
            
            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-100 rounded-[var(--ui-radius-small)] flex items-start gap-2 text-rose-600 text-xs font-semibold animate-in zoom-in-95 duration-200">
                <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                <span className="leading-relaxed">{errorMsg}</span>
              </div>
            )}
            
            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <Button variant="outline" type="button" onClick={() => setShowFormModal(false)}>Batal</Button>
                <Button type="submit">Simpan Jadwal</Button>
             </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
