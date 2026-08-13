import { memo, useState, useEffect, useMemo } from'react';
import { GraduationCap } from'lucide-react';
import useAuthStore from'../../../store/monitoring/authStore';
import { HardDrive, Link2, CheckCircle2, XCircle, Edit2, Trash2, X, RefreshCw, AlertTriangle, Users } from'lucide-react';
import { PageHeader } from '../../../components/monitoring/ui/index.js';
import { Modal, Button } from '../../../components/ui.jsx';


const MasterDataSiswa = memo(function MasterDataSiswa({
  students,
  classes,
  majors,
  updateSelectionForTab,
  openModal,
  checkDependencies,
  handleDelete,
  renderTable,
  setStudents,
  saveDatabaseNow,
  isViewOnly
}) {
  const [hikStudents, setHikStudents] = useState([]);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [syncMethod, setSyncMethod] = useState("nis"); //"nis" or"name"
  const [isSyncing, setIsSyncing] = useState(false);
  const [isFetchingHik, setIsFetchingHik] = useState(false);
  const authToken = useAuthStore(state => state.user?.authToken);

  const fetchHikStudents = async () => {
    if (!authToken) return;
    setIsFetchingHik(true);
    try {
      const res = await fetch("/api/hikvision/students?type=siswa", {
        headers: { "Authorization": `Bearer ${authToken}` }
      });
      const data = await res.json();
      if (data.ok) {
        setHikStudents(data.data || []);
      }
    } catch (err) {
      console.error("Gagal memuat siswa Hikvision:", err);
    } finally {
      setIsFetchingHik(false);
    }
  };

  useEffect(() => {
    fetchHikStudents();
  }, [authToken]);

  // Create fast sets for NIS and Name checking (only considering items registered on device)
  const hikNisSet = useMemo(() => new Set(hikStudents.filter(s => s.is_on_device !== false).flatMap(s => [s.nis, s.code].map(x => String(x || "").trim().toLowerCase()).filter(Boolean))), [hikStudents]);
  const hikNameSet = useMemo(() => new Set(hikStudents.filter(s => s.is_on_device !== false).flatMap(s => [s.name, s.device_name, s.student_name, s.nama].map(x => String(x || "").trim().toLowerCase()).filter(Boolean))), [hikStudents]);

  const handleSync = async () => {
    if (hikStudents.length === 0) {
      showFeedback("Data Kosong","Data siswa Hikvision kosong atau belum termuat.","error");
      return;
    }
    setIsSyncing(true);
    try {
      const updates = [];
      let matchedCount = 0;

      students.forEach(s => {
        const schoolNis = String(s.nis || s.code ||"").trim().toLowerCase();
        const schoolName = String(s.name || s.nama ||"").trim().toLowerCase();
        const schoolClass = s.class_name || s.kelas ||"";

        if (!schoolClass) return;

        let matchedHik = null;
        if (syncMethod ==="nis") {
          matchedHik = hikStudents.find(h => {
            const hNis = String(h.nis ||"").trim().toLowerCase();
            return hNis === schoolNis || 
                   (schoolNis.length > 8 && (hNis === schoolNis.slice(0, 8) || hNis === schoolNis.slice(-8))) ||
                   (hNis.length >= 5 && (schoolNis.endsWith(hNis) || hNis.endsWith(schoolNis)));
          });
        } else {
          matchedHik = hikStudents.find(h => {
            const hName = String(h.name || h.device_name || "").trim().toLowerCase();
            return hName === schoolName || hName.includes(schoolName) || schoolName.includes(hName);
          });
        }

        if (matchedHik) {
          updates.push({
            nis: matchedHik.nis,
            class_name: schoolClass
          });
          matchedCount++;
        }
      });

      if (updates.length === 0) {
        showFeedback("Tidak Ada Kecocokan","Tidak ada kecocokan data siswa yang dapat disinkronkan.","info");
        setIsSyncing(false);
        return;
      }

      const res = await fetch('/api/hikvision/students/bulk', {
        method:'PUT',
        headers: {"Authorization": `Bearer ${authToken}`,"Content-Type":"application/json"
        },
        body: JSON.stringify({ updates, pushToDevice: true })
      });
      const data = await res.json();
      if (data.ok) {
        // Show device push summary if available
        const deviceResults = data.devicePushResults || [];
        const hasDevices = deviceResults.length > 0;
        const totalPushedToDevice = deviceResults.reduce((s, r) => s + (r.pushed || 0), 0);
        let successMsg = `Berhasil menyinkronkan ${matchedCount} data siswa ke database.`;
        if (hasDevices) {
          successMsg += `\n✅ ${totalPushedToDevice} data berhasil dikirim ke ${deviceResults.length} mesin absensi.`;
          const failedDevices = deviceResults.filter(r => r.error);
          if (failedDevices.length > 0) {
            successMsg += `\n⚠️ ${failedDevices.length} mesin tidak dapat dihubungi.`;
          }
        } else {
          successMsg +='\nℹ️ Tidak ada mesin absensi siswa yang terdaftar untuk push otomatis.';
        }
        showFeedback("Sinkronisasi Berhasil", successMsg,"success");
        await fetchHikStudents();
        setShowSyncModal(false);
      } else {
        showFeedback("Gagal", data.error ||"Gagal melakukan sinkronisasi","error");
      }
    } catch (err) {
      console.error(err);
      showFeedback("Kesalahan Jaringan","Gagal melakukan sinkronisasi karena kesalahan jaringan.","error");
    }
    setIsSyncing(false);
  };

  const [importConfirmOpen, setImportConfirmOpen] = useState(false);
  const [feedbackModal, setFeedbackModal] = useState({ open: false, title:"", message:"", type:"info" });

  const showFeedback = (title, message, type ="info") => {
    setFeedbackModal({ open: true, title, message, type });
  };

  const executeImportFromHikvision = () => {
    setImportConfirmOpen(false);
    let addedCount = 0;
    const existingNisSet = new Set(students.map(s => String(s.nis || s.code ||"").trim().toLowerCase()));
    const newStudents = [...students];

    hikStudents.forEach(hik => {
      const nis = String(hik.nis ||"").trim().toLowerCase();
      if (nis && !existingNisSet.has(nis)) {
        newStudents.push({
          id:'hik_' + Math.random().toString(36).substr(2, 9),
          nis: hik.nis,
          code: hik.nis,
          name: hik.name,
          class_name: hik.class_name ||"Belum ada kelas",
          gender:"L",
          phone:"",
          wa_ortu:""
        });
        existingNisSet.add(nis);
        addedCount++;
      }
    });

    if (addedCount > 0) {
      setStudents(newStudents);
      saveDatabaseNow();
      showFeedback("Berhasil", `Berhasil menarik ${addedCount} siswa baru dari mesin ke dalam sistem.`,"success");
    } else {
      showFeedback("Info","Tidak ada siswa baru yang ditambahkan. Semua NIS di mesin sudah ada di sistem.","info");
    }
  };

  const handleImportFromHikvision = () => {
    if (hikStudents.length === 0) {
      showFeedback("Data Kosong","Data siswa Hikvision kosong. Pastikan Anda telah menarik data dari Dashboard Hikvision terlebih dahulu.","error");
      return;
    }
    setImportConfirmOpen(true);
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
        onClick={() => setShowSyncModal(true)} 
        className="text-xs gap-1.5"
      >
        <Link2 size={13} /> Sinkron Hikvision
      </Button>
    </>
  ) : null;

  const connectedCount = useMemo(() => {
    return students.filter(item => {
      const nisKey = String(item.nis || item.code ||"").trim().toLowerCase();
      const nameKey = String(item.name || item.nama ||"").trim().toLowerCase();
      return (nisKey && (
        hikNisSet.has(nisKey) ||
        (nisKey.length >= 8 && Array.from(hikNisSet).some(hn => hn.length >= 8 && (nisKey.endsWith(hn) || hn.endsWith(nisKey))))
      )) || (nameKey && hikNameSet.has(nameKey));
    }).length;
  }, [students, hikNisSet, hikNameSet]);

  const notConnectedCount = Math.max(0, students.length - connectedCount);

  const pageHeader = (
    <div className="space-y-4">
      <PageHeader 
        title="Data Siswa"
        icon={GraduationCap}
        description="Kelola data induk siswa, rombongan belajar, dan status koneksi mesin absensi."
      />
      {/* KPI Cards Header */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Siswa */}
        <div className="ui-card p-3.5 sm:p-4 rounded-[var(--ui-radius-card)] bg-white border border-slate-200/80 shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-[var(--ui-radius-small)] bg-[var(--ui-primary)]/10 text-[var(--ui-primary)] flex items-center justify-center shrink-0">
            <GraduationCap size={20} strokeWidth={2.2} />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Siswa Terdata</p>
            <p className="text-lg sm:text-xl font-black text-slate-800">{students.length}</p>
          </div>
        </div>

        {/* Terhubung */}
        <div className="ui-card p-3.5 sm:p-4 rounded-[var(--ui-radius-card)] bg-white border border-slate-200/80 shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-[var(--ui-radius-small)] bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 size={20} strokeWidth={2.2} />
          </div>
          <div>
            <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Terhubung (Mesin & Master)</p>
            <p className="text-lg sm:text-xl font-black text-emerald-700">{connectedCount}</p>
          </div>
        </div>

        {/* Belum Ada di Mesin */}
        <div className="ui-card p-3.5 sm:p-4 rounded-[var(--ui-radius-card)] bg-white border border-slate-200/80 shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-[var(--ui-radius-small)] bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <XCircle size={20} strokeWidth={2.2} />
          </div>
          <div>
            <p className="text-[11px] font-bold text-rose-600 uppercase tracking-wider">Belum Ada di Mesin</p>
            <p className="text-lg sm:text-xl font-black text-rose-700">{notConnectedCount}</p>
          </div>
        </div>

        {/* Total Rombel */}
        <div className="ui-card p-3.5 sm:p-4 rounded-[var(--ui-radius-card)] bg-white border border-slate-200/80 shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-[var(--ui-radius-small)] bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Users size={20} strokeWidth={2.2} />
          </div>
          <div>
            <p className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">Total Rombel Kelas</p>
            <p className="text-lg sm:text-xl font-black text-amber-700">{(classes || []).length} Rombel</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {renderTable("Kelola Data Siswa", 
        ["NIS","Nama Siswa","Kelas","L/P","Status Alat"], 
        students, 
        (item, idx, isSelected) => {
          const nisKey = String(item.nis || item.code ||"").trim().toLowerCase();
          const nameKey = String(item.name || item.nama ||"").trim().toLowerCase();
          const isConnected = (nisKey && (
            hikNisSet.has(nisKey) ||
            (nisKey.length >= 8 && Array.from(hikNisSet).some(hn => hn.length >= 8 && (nisKey.endsWith(hn) || hn.endsWith(nisKey))))
          )) || (nameKey && hikNameSet.has(nameKey));

          return (
            <tr key={item.id || item.code || item.nis} className={`hover:bg-slate-50/50 transition-colors ${isSelected ?"bg-[var(--ui-accent)]/20/40" :""}`}>
              <td className="px-2.5 py-2.5 text-center">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => updateSelectionForTab("siswa", (current) => current.includes(item.id || item.code || item.nis) ? current.filter((x) => x !== (item.id || item.code || item.nis)) : [...current, (item.id || item.code || item.nis)])}
                  className="accent-[var(--ui-primary)] cursor-pointer"
                  aria-label={`Pilih siswa ${item.name || item.nama}`}
                />
              </td>
              <td className="px-2 py-2.5 text-center font-bold text-slate-400 text-xs">{idx + 1}</td>
              <td className="px-2.5 py-2.5 font-bold text-slate-800 text-xs font-mono">{item.nis || item.code ||'-'}</td>
              <td className="px-3 py-2.5">
                <div className="flex flex-col">
                  <span className="font-extrabold text-slate-800 text-xs line-clamp-1">{item.name || item.nama ||'-'}</span>
                  {(item.wa_ortu || item.phone) && (
                    <span className="text-[10.5px] font-mono text-slate-500 font-semibold mt-0.5">
                      WA Ortu: {item.wa_ortu || item.phone}
                    </span>
                  )}
                </div>
              </td>
              <td className="px-2.5 py-2.5 font-bold text-slate-700 text-xs">
                <span className="px-2 py-0.5 rounded-[var(--ui-radius-small)] bg-slate-100 text-slate-700 text-xs font-black">
                  {item.class_name || item.kelas ||'-'}
                </span>
              </td>
              <td className="px-2.5 py-2.5 text-center font-bold text-slate-600 text-xs">
                {item.gender ==='P' ? <span className="text-pink-600 bg-pink-50 px-1.5 py-0.5 rounded">P</span> : item.gender ==='L' ? <span className="text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">L</span> : '-'}
              </td>
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
                {!isViewOnly && (
                  <div className="flex justify-end items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7 p-0" onClick={() => openModal('siswa','edit', item)} title="Edit Siswa"><Edit2 size={13} className="text-slate-600" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 p-0 hover:bg-rose-50 text-rose-500" onClick={() => handleDelete('siswa', item.id || item.code || item.nis)} title="Hapus"><Trash2 size={13} /></Button>
                  </div>
                )}
              </td>
            </tr>
          );
        },
        { customHeaderButtons: customButtons, pageHeader }
      )}

      {showSyncModal && (
        <Modal isOpen={true} onClose={() => setShowSyncModal(false)}>
          <div className="p-6 w-full max-w-[420px]">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Link2 size={20} className="text-emerald-600" />
                Sinkronisasi Kelas Hikvision
              </h3>
              <Button variant="outline" disabled={isSyncing} onClick={() =>setShowSyncModal(false)}>
                <X size={20} /></Button>
            </div>

            <div className="bg-slate-50 p-4 rounded-[var(--ui-radius-small)] border-none mb-6">
              <p className="text-xs text-slate-600 font-medium mb-3 leading-relaxed">
                Pilih metode pencocokan untuk memetakan kelas siswa sekolah ke database absensi Hikvision secara massal:
              </p>
              <div className="space-y-3">
                <label className="flex items-center gap-3 p-3 bg-white border-none rounded-[var(--ui-radius-small)] cursor-pointer hover:bg-slate-50 transition-colors">
                  <input 
                    type="radio" 
                    name="syncMethod" 
                    value="nis"
                    checked={syncMethod ==="nis"}
                    onChange={() => setSyncMethod("nis")}
                    className="text-[var(--ui-primary)] focus:ring-[var(--ui-primary)]"
                  />
                  <div>
                    <span className="text-xs font-black text-slate-800 block">Cocokkan Berdasarkan NIS / NISN</span>
                    <span className="text-[10px] text-slate-500 font-medium mt-0.5 block">Lebih akurat karena membandingkan nomor induk unik siswa.</span>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 bg-white border-none rounded-[var(--ui-radius-small)] cursor-pointer hover:bg-slate-50 transition-colors">
                  <input 
                    type="radio" 
                    name="syncMethod" 
                    value="name"
                    checked={syncMethod ==="name"}
                    onChange={() => setSyncMethod("name")}
                    className="text-[var(--ui-primary)] focus:ring-[var(--ui-primary)]"
                  />
                  <div>
                    <span className="text-xs font-black text-slate-800 block">Cocokkan Berdasarkan Nama Lengkap</span>
                    <span className="text-[10px] text-slate-500 font-medium mt-0.5 block">Berguna jika nomor ID/NIS siswa di mesin absensi berbeda.</span>
                  </div>
                </label>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                disabled={isSyncing}
                onClick={() => setShowSyncModal(false)}
                className="flex-1"
              >
                Batal
              </Button>
              <Button
                disabled={isSyncing}
                onClick={handleSync}
                className="flex-1 flex items-center justify-center gap-2"
              >
                {isSyncing && <RefreshCw size={14} className="animate-spin mr-1.5" />}
                Mulai Sinkronisasi
              </Button>
            </div>
          </div>
        </Modal>
      )}
      {/* Confirmation Modal */}
      <Modal isOpen={importConfirmOpen} onClose={() => setImportConfirmOpen(false)} title="Konfirmasi Impor Data">
        <div className="p-6">
          <div className="bg-blue-50 border border-blue-200 text-blue-800 p-4 rounded-[var(--ui-radius-small)] mb-6 flex items-start gap-3">
            <HardDrive className="mt-0.5 shrink-0" size={20} />
            <div>
              <p className="font-bold">Tarik Data Siswa dari Mesin</p>
              <p className="text-sm mt-1">Terdapat <strong>{hikStudents.length}</strong> data siswa di mesin Hikvision. Apakah Anda yakin ingin mengimpornya ke Master Data Siswa di sistem?</p>
              <p className="text-sm mt-2 font-medium bg-blue-100 p-2 rounded-[var(--ui-radius-small)] inline-block text-blue-900">Catatan: Data dengan NIS yang sudah ada di dalam tabel akan dilewati otomatis.</p>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="outline" onClick={() => setImportConfirmOpen(false)}>Batal</Button>
            <Button onClick={executeImportFromHikvision}>Ya, Impor Data</Button>
          </div>
        </div>
      </Modal>

      {/* Feedback Modal */}
      <Modal isOpen={feedbackModal.open} onClose={() => setFeedbackModal(prev => ({ ...prev, open: false }))} title={feedbackModal.title}>
        <div className="p-6 text-center">
          <div className={`mx-auto w-16 h-16 flex items-center justify-center rounded-full mb-4 ${feedbackModal.type ==='success' ?'bg-emerald-100 text-emerald-600' : feedbackModal.type ==='error' ?'bg-red-100 text-rose-600' :'bg-blue-100 text-blue-600'}`}>
            {feedbackModal.type ==='success' ? <CheckCircle2 size={32} /> : feedbackModal.type ==='error' ? <AlertTriangle size={32} /> : <HardDrive size={32} />}
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">{feedbackModal.title}</h3>
          <p className="text-slate-600 mb-6">{feedbackModal.message}</p>
          <Button onClick={() => setFeedbackModal(prev => ({ ...prev, open: false }))} className="w-full">Tutup</Button>
        </div>
      </Modal>

    </>
  );
});

export default MasterDataSiswa;
