import { memo, useState, useEffect, useMemo } from'react';
import { GraduationCap } from'lucide-react';
import useAuthStore from'../../../store/monitoring/authStore';
import { HardDrive, Link2, CheckCircle2, XCircle, Edit2, Trash2, X, RefreshCw, AlertTriangle } from'lucide-react';
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
      const res = await fetch("/api/hikvision/students", {
        headers: {"Authorization": `Bearer ${authToken}` }
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

  // Create fast sets for NIS and Name checking (ignore empty strings)
  const hikNisSet = useMemo(() => new Set(hikStudents.map(s => String(s.nis ||"").trim().toLowerCase()).filter(Boolean)), [hikStudents]);
  const hikNameSet = useMemo(() => new Set(hikStudents.map(s => String(s.name ||"").trim().toLowerCase()).filter(Boolean)), [hikStudents]);

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
            return hNis === schoolNis || (schoolNis.length > 8 && (hNis === schoolNis.slice(0, 8) || hNis === schoolNis.slice(-8)));
          });
        } else {
          matchedHik = hikStudents.find(h => String(h.name ||"").trim().toLowerCase() === schoolName);
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

  const pageHeader = (
    <PageHeader 
      title="Data Siswa"
      icon={GraduationCap}
      description="Kelola data induk siswa, kelas, dan status mesin absensi."
    />
  );

  return (
    <>
      {renderTable("Kelola Data Siswa", 
        ["NIS / NISN","Nama Lengkap","Kelas","Jenis Kelamin","No. HP Ortu","Status Alat"], 
        students, 
        (item, idx, isSelected) => {
          const nisKey = String(item.nis || item.code ||"").trim().toLowerCase();
          const nameKey = String(item.name || item.nama ||"").trim().toLowerCase();
          const isConnected = (nisKey && (
            hikNisSet.has(nisKey) ||
            (nisKey.length > 8 && (hikNisSet.has(nisKey.slice(0, 8)) || hikNisSet.has(nisKey.slice(-8))))
          )) || (nameKey && hikNameSet.has(nameKey));

          return (
            <tr key={item.id || item.code || item.nis} className={`hover:bg-slate-50/50 transition-colors ${isSelected ?"bg-[var(--ui-accent)]/20/40" :""}`}>
              <td className="px-4 py-4 text-center">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => updateSelectionForTab("siswa", (current) => current.includes(item.id || item.code || item.nis) ? current.filter((x) => x !== (item.id || item.code || item.nis)) : [...current, (item.id || item.code || item.nis)])}
                  className="accent-[var(--ui-primary)] cursor-pointer"
                  aria-label={`Pilih siswa ${item.name || item.nama}`}
                />
              </td>
              <td className="px-6 py-4 text-center font-bold text-slate-400">{idx + 1}</td>
              <td className="px-6 py-4 font-bold text-slate-800">{item.nis || item.code ||'-'}</td>
              <td className="px-6 py-4 font-bold text-[var(--ui-primary)]">{item.name || item.nama ||'-'}</td>
              <td className="px-6 py-4 font-black text-slate-700">{item.class_name || item.kelas ||'-'}</td>
              <td className="px-6 py-4 font-medium text-slate-600">{item.gender ==='P' ?'Perempuan' : item.gender ==='L' ?'Laki-laki' : item.gender ||'-'}</td>
              <td className="px-6 py-4 font-bold text-emerald-600 font-mono">{item.wa_ortu || item.phone ||'-'}</td>
              <td className="px-6 py-4">
                {isFetchingHik ? (
                  <div className="flex justify-center text-slate-400" title="Memuat..."><div className="w-4 h-4 border-2 border-slate-300 border-t-[var(--ui-primary)] rounded-full animate-spin"></div></div>
                ) : isConnected ? (
                  <div className="flex justify-center text-emerald-500" title="Terhubung"><CheckCircle2 size={18} strokeWidth={3} /></div>
                ) : (
                  <div className="flex justify-center text-slate-300" title="Belum Terhubung"><XCircle size={18} strokeWidth={3} /></div>
                )}
              </td>
              <td className="px-6 py-4 text-right">
                {!isViewOnly && (
                  <div className="flex justify-end gap-1.5">
                    <Button variant="ghost" size="icon" onClick={() => openModal('siswa','edit', item)}><Edit2 size={14} className="text-slate-500" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete('siswa', item.id || item.code || item.nis)} title="Hapus"><Trash2 size={14} className="text-red-500" /></Button>
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
          <div className={`mx-auto w-16 h-16 flex items-center justify-center rounded-full mb-4 ${feedbackModal.type ==='success' ?'bg-emerald-100 text-emerald-600' : feedbackModal.type ==='error' ?'bg-red-100 text-red-600' :'bg-blue-100 text-blue-600'}`}>
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
