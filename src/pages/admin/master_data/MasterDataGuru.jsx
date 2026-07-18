import { memo, useState, useEffect, useMemo } from'react';
import { Users } from'lucide-react';
import { GRADES } from'../../../utils/constants';
import useAuthStore from'../../../store/monitoring/authStore';
import { HardDrive, Link2, CheckCircle2, XCircle, Edit2, Lock, Trash2 } from'lucide-react';
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
      const [resGuru, resKaryawan] = await Promise.all([
        fetch("/api/hikvision/students?type=guru", { headers: {"Authorization": `Bearer ${authToken}` } }),
        fetch("/api/hikvision/students?type=karyawan", { headers: {"Authorization": `Bearer ${authToken}` } }),
      ]);
      const [dataGuru, dataKaryawan] = await Promise.all([
        resGuru.json().catch(() => ({ ok: false, data: [] })),
        resKaryawan.json().catch(() => ({ ok: false, data: [] })),
      ]);
      const combined = [
        ...(dataGuru.ok ? (dataGuru.data || []) : []),
        ...(dataKaryawan.ok ? (dataKaryawan.data || []) : []),
      ];
      setHikTeachers(combined);
    } catch (err) {
      console.error("Gagal memuat guru Hikvision:", err);
    } finally {
      setIsFetchingHik(false);
    }
  };

  useEffect(() => {
    fetchHikTeachers();
  }, [authToken]);

  // Create fast sets for Code and Name checking (ignore empty strings)
  const hikCodeSet = useMemo(() => new Set(hikTeachers.map(s => String(s.nis ||"").trim().toLowerCase()).filter(Boolean)), [hikTeachers]);
  const hikNameSet = useMemo(() => new Set(hikTeachers.map(s => String(s.name ||"").trim().toLowerCase()).filter(Boolean)), [hikTeachers]);

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
          return hNis === schoolCode || 
                 (schoolCode.length > 8 && (hNis === schoolCode.slice(0, 8) || hNis === schoolCode.slice(-8))) ||
                 String(h.name ||"").trim().toLowerCase() === schoolName;
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

  return (
    <>
      {renderTable("Kelola Data Guru",
        ["Kode","Nama Lengkap","Kategori","No. WhatsApp","Wali Kelas","Target/Terjadwal JP","Prioritas Jurusan","Prioritas Tingkat","Status Alat"],
        teachers,
        (item, idx, isSelected) => {
          const assignedHomeroom = classes.find((c) => c.homeroom === item.code)?.name ||"-";
          const targetJP = teacherTargetJpMap.get(item.code) || 0;
          const scheduledJP = teacherScheduleCountMap.get(item.code) || 0;

          // Cek apakah kode guru ini ada di mesin Hikvision
          const codeKey = String(item.code ||"").trim().toLowerCase();
          const nipKey = String(item.nip ||"").trim().toLowerCase();
          const nameKey = String(item.name || item.nama ||"").trim().toLowerCase();
          const isConnected = (codeKey && (
            hikCodeSet.has(codeKey) || (codeKey.length > 8 && (hikCodeSet.has(codeKey.slice(0, 8)) || hikCodeSet.has(codeKey.slice(-8))))
          )) || (nipKey && (
            hikCodeSet.has(nipKey) || (nipKey.length > 8 && (hikCodeSet.has(nipKey.slice(0, 8)) || hikCodeSet.has(nipKey.slice(-8))))
          )) || (nameKey && hikNameSet.has(nameKey));

          return (
            <tr key={item.code} className={`hover:bg-slate-50/50 transition-colors ${isSelected ?"bg-[var(--ui-accent)]/20/40" :""}`}>
              <td className="px-3 py-2.5 text-center">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => updateSelectionForTab("guru", (current) => current.includes(item.code) ? current.filter((x) => x !== item.code) : [...current, item.code])}
                  className="accent-[var(--ui-primary)] cursor-pointer"
                  aria-label={`Pilih guru ${item.code}`}
                />
              </td>
              <td className="px-3 py-2.5 text-center font-bold text-slate-400 text-xs">{idx + 1}</td>
              <td className="px-3 py-2.5 text-center font-black text-[var(--ui-primary)] text-xs">{item.code}</td>
              <td className="px-3 py-2.5 font-bold text-slate-800 text-xs">
                {quickEditGuruCode === item.code ? (
                  <input type="text" value={quickGuruForm.name ||""} onChange={(e) => setQuickGuruForm({ ...quickGuruForm, name: e.target.value })} className="w-full border-none bg-white px-2 py-1 rounded-[var(--ui-radius-small)] text-[11px] font-bold" />
                ) : item.name}
              </td>
              <td className="px-3 py-2.5 text-center">
                {quickEditGuruCode === item.code ? (
                  <UISelect value={quickGuruForm.type ||"Umum"} onChange={(e) => setQuickGuruForm({ ...quickGuruForm, type: e.target.value })} className="border-none bg-white px-2 py-1 rounded-[var(--ui-radius-small)] text-[11px] font-bold">
                    <option value="Umum">Umum</option>
                    <option value="Jurusan">Jurusan</option>
                    <option value="Campuran">Campuran</option>
                  </UISelect>
                ) : (
                  <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-[var(--ui-radius-small)] whitespace-nowrap ${item.type ==="Umum" ?"bg-slate-100 text-slate-600" :"bg-[var(--ui-accent)]/20 text-[var(--ui-primary)]"}`}>{item.type}</span>
                )}
              </td>
              <td className="px-3 py-2.5 font-semibold text-slate-700 text-xs text-center">
                {quickEditGuruCode === item.code ? (
                  <input type="text" value={quickGuruForm.phone ||""} onChange={(e) => setQuickGuruForm({ ...quickGuruForm, phone: e.target.value.replace(/[^0-9]/g,'') })} className="w-full border-none bg-white px-2 py-1 rounded-[var(--ui-radius-small)] text-[11px] font-bold" placeholder="6281xxx" />
                ) : (item.phone ||"-")}
              </td>
              <td className="px-3 py-2.5 text-center">
                {assignedHomeroom !=="-" ? (
                  <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-[var(--ui-radius-small)] bg-[var(--ui-primary)]/10 text-[var(--ui-primary)] border border-blue-100/50 whitespace-nowrap">
                    {assignedHomeroom}
                  </span>
                ) : (
                  <span className="text-slate-400 font-semibold text-xs">-</span>
                )}
              </td>
              <td className="px-3 py-2.5">
                <div className="flex flex-col items-center">
                  {quickEditGuruCode === item.code ? (
                    <input type="text" inputMode="numeric" value={quickGuruForm.targetWeeklyJp ||""} onChange={(e) => setQuickGuruForm({ ...quickGuruForm, targetWeeklyJp: e.target.value.replace(/[^0-9]/g,'') })} className="w-20 border-none bg-white px-2 py-1 rounded-[var(--ui-radius-small)] text-[11px] font-bold text-center" placeholder={`${targetJP}`} />
                  ) : (
                    <span className="font-bold text-slate-800 text-xs whitespace-nowrap">{targetJP} JP</span>
                  )}
                  <span className={`text-[10px] font-bold mt-0.5 whitespace-nowrap ${scheduledJP === targetJP && targetJP > 0 ?"text-[var(--ui-primary)]" : scheduledJP > 0 ?"text-amber-600" :"text-slate-400"}`}>
                    Terjadwal: {scheduledJP} JP
                  </span>
                </div>
              </td>
              <td className="px-3 py-2.5 font-semibold text-slate-600 text-xs text-center">
                {quickEditGuruCode === item.code ? (
                  <div className="flex items-center gap-2">
                    <input type="text" value={quickGuruForm.preferredMajor ||"Semua"} onChange={(e) => setQuickGuruForm({ ...quickGuruForm, preferredMajor: e.target.value })} className="border-none bg-white px-2 py-1 rounded-[var(--ui-radius-small)] text-[11px] font-bold w-24" placeholder="Semua atau TKJ,TKR" />
                    <input type="password" value={quickGuruForm.password ||""} onChange={(e) => setQuickGuruForm({ ...quickGuruForm, password: e.target.value })} className="w-20 border-none bg-white px-2 py-1 rounded-[var(--ui-radius-small)] text-[11px] font-bold" placeholder="Kosongkan jika sama" />
                  </div>
                ) : (item.preferredMajor && item.preferredMajor !=='Semua' ? item.preferredMajor :'Semua Jurusan')}
              </td>
              <td className="px-3 py-2.5 font-semibold text-slate-600 text-xs text-center">
                {quickEditGuruCode === item.code ? (
                  <UISelect value={quickGuruForm.preferredGrade ||"Semua"} onChange={(e) => setQuickGuruForm({ ...quickGuruForm, preferredGrade: e.target.value })} className="w-24 border-none bg-white px-2 py-1 rounded-[var(--ui-radius-small)] text-[11px] font-bold">
                    <option value="Semua">Semua</option>
                    {GRADES.filter(g => g !=='Semua').map((m) => (<option key={m} value={m}>Tingkat {m}</option>))}
                  </UISelect>
                ) : (item.preferredGrade && item.preferredGrade !=='Semua' ? `Tingkat ${item.preferredGrade}` :'Semua Tingkat')}
              </td>
              {/* Status Alat Hikvision */}
              <td className="px-3 py-2.5 text-center">
                {isFetchingHik ? (
                  <div className="flex justify-center text-slate-400" title="Memuat..."><div className="w-4 h-4 border-2 border-slate-300 border-t-[var(--ui-primary)] rounded-full animate-spin"></div></div>
                ) : isConnected ? (
                  <div className="flex justify-center text-emerald-500" title="Terhubung"><CheckCircle2 size={16} strokeWidth={3} /></div>
                ) : (
                  <div className="flex justify-center text-slate-300" title="Belum Terhubung"><XCircle size={16} strokeWidth={3} /></div>
                )}
              </td>
              <td className="px-3 py-2.5 text-right">
                <div className="flex justify-end gap-1.5">
                  {quickEditGuruCode === item.code ? (
                    <>
                      <Button size="sm" onClick={() => saveQuickEditGuru(item.code)}>Save</Button>
                      <Button size="sm" variant="outline" onClick={() => { setQuickEditGuruCode(""); setQuickGuruForm({}); }}>Cancel</Button>
                    </>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => startQuickEditGuru(item)}>Quick Edit</Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => openModal("ketersediaan_mapel","edit", item)}>Mapel</Button>
                  <Button size="icon" variant="ghost" onClick={() => openModal('guru','edit', item)}><Edit2 size={14} className="text-slate-500" /></Button>
                  {(() => {
                    const deps = checkDependencies('guru', item.code);
                    if (deps.length > 0) {
                      return (
                        <Button size="icon" variant="ghost" disabled title={`Tidak bisa dihapus. Masih digunakan oleh: ${deps.join(',')}. Hapus koneksi terlebih dahulu.`} >
                          <Lock size={14} className="text-amber-500" />
                        </Button>
                      );
                    }
                    return (
                      <Button size="icon" variant="ghost" onClick={() => handleDelete('guru', item.code)} title="Hapus"><Trash2 size={14} className="text-red-500" /></Button>
                    );
                  })()}
                </div>
              </td>
            </tr>
          );
        },
        { customHeaderButtons: customButtons, pageHeader: <PageHeader title="Data Guru" description="Kelola data induk guru, beban mengajar, dan target jam mengajar." icon={Users} /> }
      )}

      {/* Import Confirm Modal */}
      {importConfirmOpen && (
        <Modal isOpen={true} onClose={() => setImportConfirmOpen(false)}>
          <div className="p-6 w-full max-w-[400px] text-center">
            <HardDrive size={40} className="mx-auto text-blue-600 mb-4" />
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
