import { memo, useState, useEffect, useMemo } from'react';
import { Users } from'lucide-react';
import { GRADES } from'../../../utils/constants';
import useAuthStore from'../../../store/monitoring/authStore';
import { HardDrive, Link2, CheckCircle2, XCircle, Edit2, Lock, Trash2, BookOpen } from'lucide-react';
import { PageHeader } from '../../../components/monitoring/ui/index.js';
import { UISelect, Modal, Button } from '../../../components/ui.jsx';


const MasterDataGuru = memo(function MasterDataGuru({
  teachers,
  classes,
  teacherTargetJpMap,
  teacherScheduleCountMap,
  quickEditGuruCode,
  quickGuruForm,
  setQuickGuruForm,
  setQuickEditGuruCode,
  updateSelectionForTab,
  openModal,
  checkDependencies,
  handleDelete,
  saveQuickEditGuru,
  startQuickEditGuru,
  renderTable,
  setTeachers,
  saveDatabaseNow,
  isViewOnly = false
}) {
  const [hikTeachers, setHikTeachers] = useState([]);
  const [isFetchingHik, setIsFetchingHik] = useState(false);
  const authToken = useAuthStore(state => state.user?.authToken);

  const fetchHikTeachers = async () => {
    if (!authToken) return;
    setIsFetchingHik(true);
    try {
      const res = await fetch("/api/hikvision/students?type=guru", { headers: { Authorization: `Bearer ${authToken}` } });
      const json = await res.json();
      if (json.ok) {
        setHikTeachers(json.data || []);
      }
    } catch (err) {
      console.error("Gagal memuat guru Hikvision:", err);
    } finally {
      setIsFetchingHik(false);
    }
  };

  useEffect(() => {
    fetchHikTeachers();
  }, [authToken]);

  // Create fast sets for Code and Name checking (only considering items registered on device)
  const hikCodeSet = useMemo(() => new Set(hikTeachers.filter(s => s.is_on_device !== false).flatMap(s => [s.nis, s.code].map(x => String(x || "").trim().toLowerCase()).filter(Boolean))), [hikTeachers]);
  const hikNameSet = useMemo(() => new Set(hikTeachers.filter(s => s.is_on_device !== false).flatMap(s => [s.name, s.device_name, s.nama].map(x => String(x || "").trim().toLowerCase()).filter(Boolean))), [hikTeachers]);

  const [showSyncModal, setShowSyncModal] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [importConfirmOpen, setImportConfirmOpen] = useState(false);
  const [feedbackModal, setFeedbackModal] = useState({ open: false, title:"", message:"", type:"info" });

  const showFeedback = (title, message, type ="info") => {
    setFeedbackModal({ open: true, title, message, type });
  };

  const handleImportFromHikvision = () => {
    if (hikTeachers.length === 0) {
      showFeedback("Data Kosong","Data guru Hikvision kosong. Pastikan Anda telah menarik data dari Dashboard Hikvision terlebih dahulu.","error");
      return;
    }
    setImportConfirmOpen(true);
  };

  const executeImportFromHikvision = () => {
    setImportConfirmOpen(false);
    let addedCount = 0;
    const existingCodeSet = new Set(teachers.map(t => String(t.code ||"").trim().toLowerCase()));
    const nextTeachers = [...teachers];

    hikTeachers.forEach(hik => {
      const code = String(hik.nis ||"").trim().toLowerCase();
      if (code && !existingCodeSet.has(code)) {
        nextTeachers.push({
          code: hik.nis,
          name: hik.name,
          type:"Umum",
          phone: hik.phone ||"",
          preferredGrade:"Semua",
          preferredMajor:"Semua",
          targetWeeklyJp: 24,
          password:""
        });
        existingCodeSet.add(code);
        addedCount++;
      }
    });

    if (addedCount > 0) {
      if (setTeachers) setTeachers(nextTeachers);
      if (saveDatabaseNow) saveDatabaseNow({ teachers: nextTeachers });
      showFeedback("Berhasil", `Berhasil menarik ${addedCount} guru baru dari mesin ke dalam sistem.`,"success");
    } else {
      showFeedback("Info","Tidak ada guru baru yang ditambahkan. Semua ID Karyawan di mesin sudah ada di sistem.","info");
    }
  };

  const syncTeachersToHikvision = async () => {
    setIsSyncing(true);
    try {
      let matchedCount = 0;
      const updates = [];

      teachers.forEach(t => {
        const schoolCode = String(t.code ||"").trim().toLowerCase();
        const schoolName = String(t.name ||"").trim().toLowerCase();

        const matchedHik = hikTeachers.find(h => {
          const hNis = String(h.nis ||"").trim().toLowerCase();
          const hName = String(h.name || h.device_name || "").trim().toLowerCase();
          return hNis === schoolCode || 
                 (schoolCode.length > 8 && (hNis === schoolCode.slice(0, 8) || hNis === schoolCode.slice(-8))) ||
                 hName === schoolName || hName.includes(schoolName) || schoolName.includes(hName);
        });

        if (matchedHik) {
          updates.push({
            nis: matchedHik.nis,
            class_name:"guru"
          });
          matchedCount++;
        }
      });

      if (updates.length === 0) {
        showFeedback("Tidak Ada Kecocokan","Tidak ada kecocokan data guru yang dapat disinkronkan ke mesin.","info");
        setIsSyncing(false);
        return;
      }

      const res = await fetch('/api/hikvision/students/bulk', {
        method:'PUT',
        headers: {"Authorization": `Bearer ${authToken}`,"Content-Type":"application/json"
        },
        body: JSON.stringify({ updates })
      });
      const data = await res.json();
      if (data.ok) {
        showFeedback("Berhasil", `Berhasil menyinkronkan ${matchedCount} data guru ke mesin absensi!`,"success");
        await fetchHikTeachers();
      } else {
        showFeedback("Gagal", data.error ||"Gagal melakukan sinkronisasi","error");
      }
    } catch (err) {
      console.error(err);
      showFeedback("Kesalahan Jaringan","Gagal melakukan sinkronisasi karena kesalahan jaringan.","error");
    }
    setIsSyncing(false);
  };

  const customButtons = !isViewOnly ? (
    <>
      <Button 
        type="button" 
        variant="outline"
        onClick={handleImportFromHikvision} 
        className="text-xs gap-1.5"
      >
        <HardDrive size={13} /> Tarik dari Mesin
      </Button>
      <Button 
        type="button" 
        variant="outline"
        onClick={syncTeachersToHikvision} 
        disabled={isSyncing}
        className="text-xs gap-1.5"
      >
        <Link2 size={13} /> Sinkron Hikvision
      </Button>
    </>
  ) : null;

  const connectedCount = useMemo(() => {
    return teachers.filter(item => {
      const codeKey = String(item.code || item.id ||"").trim().toLowerCase();
      const nameKey = String(item.name || item.nama ||"").trim().toLowerCase();
      return (codeKey && hikCodeSet.has(codeKey)) ||
             (nameKey && hikNameSet.has(nameKey));
    }).length;
  }, [teachers, hikCodeSet, hikNameSet]);

  const notConnectedCount = Math.max(0, teachers.length - connectedCount);

  const totalTargetJP = useMemo(() => {
    return teachers.reduce((acc, t) => acc + (teacherTargetJpMap.get(t.code) || 0), 0);
  }, [teachers, teacherTargetJpMap]);

  const pageHeader = (
    <div className="flex flex-col gap-4">
      {/* KPI Cards Header */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Guru */}
        <div className="ui-card p-3.5 sm:p-4 rounded-[var(--ui-radius-card)] bg-white border border-slate-200/80 shadow-2xs hover:shadow-xs transition-all flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-[var(--ui-radius-small)] bg-[var(--ui-primary)]/10 text-[var(--ui-primary)] flex items-center justify-center shrink-0 border border-[var(--ui-primary)]/20">
            <Users size={20} strokeWidth={2.2} />
          </div>
          <div>
            <p className="text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-wider">Total Guru Terdata</p>
            <p className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">{teachers.length}</p>
          </div>
        </div>

        {/* Terhubung */}
        <div className="ui-card p-3.5 sm:p-4 rounded-[var(--ui-radius-card)] bg-white border border-emerald-200/60 shadow-2xs hover:shadow-xs transition-all flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-[var(--ui-radius-small)] bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-200">
            <CheckCircle2 size={20} strokeWidth={2.2} />
          </div>
          <div>
            <p className="text-[10px] sm:text-[11px] font-black text-emerald-600 uppercase tracking-wider">Terhubung (Mesin)</p>
            <p className="text-xl sm:text-2xl font-black text-emerald-700 tracking-tight">{connectedCount}</p>
          </div>
        </div>

        {/* Belum Ada di Mesin */}
        <div className="ui-card p-3.5 sm:p-4 rounded-[var(--ui-radius-card)] bg-white border border-rose-200/60 shadow-2xs hover:shadow-xs transition-all flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-[var(--ui-radius-small)] bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-200">
            <XCircle size={20} strokeWidth={2.2} />
          </div>
          <div>
            <p className="text-[10px] sm:text-[11px] font-black text-rose-600 uppercase tracking-wider">Belum Ada di Mesin</p>
            <p className="text-xl sm:text-2xl font-black text-rose-700 tracking-tight">{notConnectedCount}</p>
          </div>
        </div>

        {/* Total Target JP */}
        <div className="ui-card p-3.5 sm:p-4 rounded-[var(--ui-radius-card)] bg-white border border-amber-200/60 shadow-2xs hover:shadow-xs transition-all flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-[var(--ui-radius-small)] bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-200">
            <BookOpen size={20} strokeWidth={2.2} />
          </div>
          <div>
            <p className="text-[10px] sm:text-[11px] font-black text-amber-600 uppercase tracking-wider">Total Target Jam (JP)</p>
            <p className="text-xl sm:text-2xl font-black text-amber-700 tracking-tight">{totalTargetJP} <span className="text-xs font-bold text-amber-600">JP</span></p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {renderTable("Kelola Data Guru",
        ["Kode","Nama Guru","Kategori & Wali","Beban JP","Prioritas","Status Alat"],
        teachers,
        (item, idx, isSelected) => {
          const assignedHomeroom = classes.find((c) => c.homeroom === item.code)?.name ||"-";
          const targetJP = teacherTargetJpMap.get(item.code) || 0;
          const scheduledJP = teacherScheduleCountMap.get(item.code) || 0;

          const codeKey = String(item.code || item.id ||"").trim().toLowerCase();
          const nameKey = String(item.name || item.nama ||"").trim().toLowerCase();
          const isConnected = (codeKey && hikCodeSet.has(codeKey)) ||
                              (nameKey && hikNameSet.has(nameKey));

          return (
            <tr key={item.code} className={`hover:bg-slate-50/50 transition-colors ${isSelected ?"bg-[var(--ui-accent)]/20/40" :""}`}>
              <td className="px-2.5 py-2.5 text-center">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => updateSelectionForTab("guru", (current) => current.includes(item.code) ? current.filter((x) => x !== item.code) : [...current, item.code])}
                  className="accent-[var(--ui-primary)] cursor-pointer"
                  aria-label={`Pilih guru ${item.code}`}
                />
              </td>
              <td className="px-2 py-2.5 text-center font-bold text-slate-400 text-xs">{idx + 1}</td>
              <td className="px-2 py-2.5 text-center">
                <span className="px-2 py-0.5 font-mono text-[11px] font-black text-[var(--ui-primary)] bg-[var(--ui-primary)]/10 rounded-[var(--ui-radius-small)]">
                  {item.code}
                </span>
              </td>
              <td className="px-3 py-2.5">
                {quickEditGuruCode === item.code ? (
                  <div className="space-y-1">
                    <input type="text" value={quickGuruForm.name ||""} onChange={(e) => setQuickGuruForm({ ...quickGuruForm, name: e.target.value })} className="w-full border border-slate-200 bg-white px-2 py-1 rounded-[var(--ui-radius-small)] text-xs font-bold" placeholder="Nama Guru" />
                    <input type="text" value={quickGuruForm.phone ||""} onChange={(e) => setQuickGuruForm({ ...quickGuruForm, phone: e.target.value.replace(/[^0-9]/g,'') })} className="w-full border border-slate-200 bg-white px-2 py-0.5 rounded-[var(--ui-radius-small)] text-[11px] font-mono" placeholder="No. WA: 081xxx" />
                  </div>
                ) : (
                  <div className="flex flex-col">
                    <span className="font-extrabold text-slate-800 text-xs line-clamp-1">{item.name}</span>
                    {item.phone && (
                      <span className="text-[10.5px] font-mono text-slate-500 font-semibold mt-0.5">
                        WA: {item.phone}
                      </span>
                    )}
                  </div>
                )}
              </td>
              <td className="px-2.5 py-2.5 text-center">
                {quickEditGuruCode === item.code ? (
                  <UISelect value={quickGuruForm.type ||"Umum"} onChange={(e) => setQuickGuruForm({ ...quickGuruForm, type: e.target.value })} className="border border-slate-200 bg-white px-2 py-1 rounded-[var(--ui-radius-small)] text-xs font-bold">
                    <option value="Umum">Umum</option>
                    <option value="Jurusan">Jurusan</option>
                    <option value="Campuran">Campuran</option>
                  </UISelect>
                ) : (
                  <div className="flex flex-col items-center gap-1">
                    <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-[var(--ui-radius-small)] whitespace-nowrap ${item.type ==="Umum" ?"bg-slate-100 text-slate-600" :"bg-[var(--ui-accent)]/20 text-[var(--ui-primary)]"}`}>
                      {item.type}
                    </span>
                    {assignedHomeroom !=="-" && (
                      <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-[var(--ui-radius-small)] bg-[var(--ui-primary)]/10 text-[var(--ui-primary)] border border-indigo-100/50 whitespace-nowrap">
                        Wali {assignedHomeroom}
                      </span>
                    )}
                  </div>
                )}
              </td>
              <td className="px-2.5 py-2.5 text-center">
                {quickEditGuruCode === item.code ? (
                  <input type="text" inputMode="numeric" value={quickGuruForm.targetWeeklyJp ||""} onChange={(e) => setQuickGuruForm({ ...quickGuruForm, targetWeeklyJp: e.target.value.replace(/[^0-9]/g,'') })} className="w-16 border border-slate-200 bg-white px-2 py-1 rounded-[var(--ui-radius-small)] text-xs font-bold text-center" placeholder={`${targetJP}`} />
                ) : (
                  <div className="flex flex-col items-center">
                    <span className="font-extrabold text-slate-800 text-xs whitespace-nowrap">{targetJP} JP</span>
                    <span className={`text-[10px] font-bold whitespace-nowrap ${scheduledJP === targetJP && targetJP > 0 ?"text-[var(--ui-primary)]" : scheduledJP > 0 ?"text-amber-600" :"text-slate-400"}`}>
                      Terjadwal: {scheduledJP} JP
                    </span>
                  </div>
                )}
              </td>
              <td className="px-2.5 py-2.5 text-center">
                {quickEditGuruCode === item.code ? (
                  <div className="space-y-1">
                    <input type="text" value={quickGuruForm.preferredMajor ||"Semua"} onChange={(e) => setQuickGuruForm({ ...quickGuruForm, preferredMajor: e.target.value })} className="border border-slate-200 bg-white px-2 py-0.5 rounded-[var(--ui-radius-small)] text-[11px] font-bold w-full" placeholder="Jurusan" />
                    <UISelect value={quickGuruForm.preferredGrade ||"Semua"} onChange={(e) => setQuickGuruForm({ ...quickGuruForm, preferredGrade: e.target.value })} className="w-full border border-slate-200 bg-white px-2 py-0.5 rounded-[var(--ui-radius-small)] text-[11px] font-bold">
                      <option value="Semua">Semua Tingkat</option>
                      {GRADES.filter(g => g !=='Semua').map((m) => (<option key={m} value={m}>Tingkat {m}</option>))}
                    </UISelect>
                  </div>
                ) : (
                  <div className="flex flex-col items-center text-xs">
                    <span className="font-bold text-slate-700 whitespace-nowrap">{item.preferredMajor && item.preferredMajor !=='Semua' ? item.preferredMajor :'Semua Jurusan'}</span>
                    <span className="text-[10px] font-medium text-slate-400 whitespace-nowrap">{item.preferredGrade && item.preferredGrade !=='Semua' ? `Tingkat ${item.preferredGrade}` :'Semua Tingkat'}</span>
                  </div>
                )}
              </td>
              {/* Status Alat Hikvision */}
              <td className="px-2.5 py-2.5 text-center">
                {isFetchingHik ? (
                  <div className="flex justify-center text-slate-400" title="Memuat..."><div className="w-4 h-4 border-2 border-slate-300 border-t-[var(--ui-primary)] rounded-full animate-spin"></div></div>
                ) : isConnected ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 text-[10.5px] font-bold whitespace-nowrap">
                    <CheckCircle2 size={13} className="text-emerald-600" />
                    <span>Terhubung</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200/80 text-[10.5px] font-bold whitespace-nowrap">
                    <XCircle size={13} className="text-rose-500" />
                    <span>Belum di Mesin</span>
                  </span>
                )}
              </td>
              <td className="px-2.5 py-2.5 text-right">
                {!isViewOnly ? (
                  <div className="flex justify-end items-center gap-1">
                    {quickEditGuruCode === item.code ? (
                      <>
                        <Button size="sm" className="h-7 px-2 text-xs" onClick={() => saveQuickEditGuru(item.code)}>Save</Button>
                        <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => { setQuickEditGuruCode(""); setQuickGuruForm({}); }}>Batal</Button>
                      </>
                    ) : (
                      <>
                        <Button size="icon" variant="ghost" className="h-7 w-7 p-0" onClick={() => openModal("ketersediaan_mapel","edit", item)} title="Atur Mapel">
                          <BookOpen size={13} className="text-slate-600" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 p-0" onClick={() => openModal('guru','edit', item)} title="Edit Guru">
                          <Edit2 size={13} className="text-slate-600" />
                        </Button>
                        {(() => {
                          const deps = checkDependencies('guru', item.code);
                          if (deps.length > 0) {
                            return (
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                className="h-7 w-7 p-0 hover:bg-amber-50 border border-amber-200/80 cursor-pointer"
                                onClick={() => openModal('lock_info', 'view', { type: 'guru', name: `Guru: ${item.name || item.code}`, deps })}
                                title="Klik untuk melihat detail koneksi data"
                              >
                                <Lock size={13} className="text-amber-500" />
                              </Button>
                            );
                          }
                          return (
                            <Button size="icon" variant="ghost" className="h-7 w-7 p-0 hover:bg-rose-50 text-rose-500" onClick={() => handleDelete('guru', item.code)} title="Hapus">
                              <Trash2 size={13} />
                            </Button>
                          );
                        })()}
                      </>
                    )}
                  </div>
                ) : (
                  <span className="text-xs text-slate-400 italic font-medium">Lihat saja</span>
                )}
              </td>
            </tr>
          );
        },
        { tabKey: "guru", defaultSort: { key: "code", dir: "asc" }, customHeaderButtons: customButtons, pageHeader }
      )}

      {/* Import Confirm Modal */}
      {importConfirmOpen && (
        <Modal isOpen={true} onClose={() => setImportConfirmOpen(false)}>
          <div className="p-6 w-full max-w-[400px] text-center">
            <HardDrive size={40} className="mx-auto text-indigo-600 mb-4" />
            <h3 className="text-lg font-bold text-slate-800 mb-2">Tarik Data Guru</h3>
            <p className="text-sm text-slate-600 mb-6">
              Apakah Anda yakin ingin menarik data guru dari mesin ke dalam sistem? Guru baru yang tidak ada di sistem akan ditambahkan secara otomatis.
            </p>
            <div className="flex justify-center gap-3">
              <Button onClick={() => setImportConfirmOpen(false)} variant="ghost">Batal</Button>
              <Button onClick={executeImportFromHikvision}>Ya, Tarik Data</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Feedback Modal */}
      {feedbackModal.open && (
        <Modal isOpen={true} onClose={() => setFeedbackModal({ ...feedbackModal, open: false })}>
          <div className="p-6 w-full max-w-[400px] text-center">
            <h3 className="text-lg font-bold text-slate-800 mb-2">{feedbackModal.title}</h3>
            <p className="text-sm text-slate-600 mb-6">{feedbackModal.message}</p>
            <Button onClick={() => setFeedbackModal({ ...feedbackModal, open: false })} variant="primary" className="w-full">Selesai</Button>
          </div>
        </Modal>
      )}
    </>
  );
});

export default MasterDataGuru;
