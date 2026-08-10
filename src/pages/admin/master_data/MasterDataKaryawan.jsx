import { memo, useState, useEffect, useMemo } from'react';
import { Users } from'lucide-react';
import useAuthStore from'../../../store/monitoring/authStore';
import { HardDrive, Link2, CheckCircle2, XCircle, Edit2, Lock, Trash2 } from'lucide-react';
import { PageHeader } from '../../../components/monitoring/ui/index.js';
import { Modal, Button } from '../../../components/ui.jsx';


const MasterDataKaryawan = memo(function MasterDataKaryawan({
  staffs,
  classes = [],
  staffTargetJpMap = new Map(),
  staffscheduleCountMap = new Map(),
  updateSelectionForTab = () => {},
  openModal = () => {},
  checkDependencies = () => [],
  handleDelete = () => {},
  renderTable,
  setStaffs,
  saveDatabaseNow,
  isViewOnly = false
}) {
  const [quickEditKaryawanCode, setQuickEditKaryawanCode] = useState("");
  const [quickKaryawanForm, setQuickKaryawanForm] = useState({});
  const [hikstaffs, setHikstaffs] = useState([]);
  const authToken = useAuthStore(state => state.user?.authToken);

  const startQuickEditKaryawan = (item) => {
    setQuickEditKaryawanCode(item.code);
    setQuickKaryawanForm({
      name: item.name ||"",
      division: item.division ||"",
      phone: item.phone ||""
    });
  };

  const saveQuickEditKaryawan = async (code) => {
    const nextName = String(quickKaryawanForm.name ||"").trim();
    if (!nextName) {
      showFeedback("Peringatan","Nama karyawan wajib diisi.","error");
      return;
    }
    const nextStaffs = staffs.map(s => s.code === code ? {
      ...s,
      ...quickKaryawanForm,
      name: nextName
    } : s);
    
    if (setStaffs) setStaffs(nextStaffs);
    if (saveDatabaseNow) {
      await saveDatabaseNow({ staffs: nextStaffs },"menyimpan quick edit karyawan");
    }
    setQuickEditKaryawanCode("");
    setQuickKaryawanForm({});
  };

  const fetchHikstaffs = async () => {
    if (!authToken) return;
    try {
      const res = await fetch("/api/hikvision/students?type=staff", { headers: { Authorization: `Bearer ${authToken}` } });
      const data = await res.json();
      if (data.ok) {
        setHikstaffs(data.data || []);
      }
    } catch (err) {
      console.error("Gagal memuat Karyawan Hikvision:", err);
    }
  };

  useEffect(() => {
    fetchHikstaffs();
  }, [authToken]);

  // Set of NIS & Name values from hikvision
  const hikNisSet = useMemo(
    () => new Set(hikstaffs.flatMap(t => [t.nis, t.code, t.nip].map(x => String(x || "").trim().toLowerCase()).filter(Boolean))),
    [hikstaffs]
  );

  const hikNameSet = useMemo(
    () => new Set(hikstaffs.flatMap(t => [t.name, t.device_name, t.nama].map(x => String(x || "").trim().toLowerCase()).filter(Boolean))),
    [hikstaffs]
  );

  const [isSyncing, setIsSyncing] = useState(false);
  const [importConfirmOpen, setImportConfirmOpen] = useState(false);
  const [feedbackModal, setFeedbackModal] = useState({ open: false, title:"", message:"", type:"info" });

  const showFeedback = (title, message, type ="info") => {
    setFeedbackModal({ open: true, title, message, type });
  };

  const handleImportFromHikvision = () => {
    if (hikstaffs.length === 0) {
      showFeedback("Data Kosong","Data karyawan Hikvision kosong. Pastikan Anda telah menarik data dari Dashboard Hikvision terlebih dahulu.","error");
      return;
    }
    setImportConfirmOpen(true);
  };

  const executeImportFromHikvision = () => {
    setImportConfirmOpen(false);
    let addedCount = 0;
    const existingCodeSet = new Set(
      staffs.flatMap(t => [t.code, t.staff_code, t.id].map(x => String(x ||"").trim().toLowerCase()).filter(Boolean))
    );
    const nextStaffs = [...staffs];
    hikstaffs.forEach(t => {
      const codeKey = String(t.nis ||"").trim();
      if (codeKey && !existingCodeSet.has(codeKey.toLowerCase())) {
        nextStaffs.push({
          code: codeKey,
          name: t.name || t.device_name || codeKey,
          division: t.class_name || "Kebersihan",
          phone: ""
        });
        existingCodeSet.add(codeKey.toLowerCase());
        addedCount++;
      }
    });

    if (setStaffs) setStaffs(nextStaffs);
    if (saveDatabaseNow) {
      saveDatabaseNow({ staffs: nextStaffs }, "sinkronisasi karyawan dari Hikvision");
    }

    showFeedback(
      "Sinkron Selesai",
      addedCount > 0 ? `Berhasil menambahkan ${addedCount} karyawan baru dari mesin.` : "Semua karyawan mesin sudah terhubung ke sistem.",
      "success"
    );
  };

  const syncStaffToHikvision = async () => {
    setIsSyncing(true);
    try {
      let matchedCount = 0;
      const updates = [];

      staffs.forEach(t => {
        const schoolCode = String(t.code ||"").trim().toLowerCase();
        const schoolName = String(t.name ||"").trim().toLowerCase();

        const matchedHik = hikstaffs.find(h => {
          const hNis = String(h.nis ||"").trim().toLowerCase();
          return hNis === schoolCode || 
                 (schoolCode.length > 8 && (hNis === schoolCode.slice(0, 8) || hNis === schoolCode.slice(-8))) ||
                 String(h.name ||"").trim().toLowerCase() === schoolName;
        });

        if (matchedHik) {
          updates.push({
            nis: matchedHik.nis,
            class_name:"karyawan"
          });
          matchedCount++;
        }
      });

      if (updates.length === 0) {
        showFeedback("Tidak Ada Kecocokan","Tidak ada kecocokan data karyawan yang dapat disinkronkan ke mesin.","info");
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
        showFeedback("Berhasil", `Berhasil menyinkronkan ${matchedCount} data karyawan ke mesin absensi!`,"success");
        await fetchHikstaffs();
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
        onClick={syncStaffToHikvision} 
        disabled={isSyncing}
        className="text-xs gap-1.5"
      >
        <Link2 size={13} /> Sinkron Hikvision
      </Button>
    </>
  ) : null;

  const displayStaffs = useMemo(() => {
    const seen = new Set();
    const result = [];
    (staffs || []).forEach(item => {
      const code = String(item.code || item.staff_code || item.id || "").trim().toLowerCase();
      const key = code || String(item.name || "").trim().toLowerCase();
      if (key && !seen.has(key)) {
        seen.add(key);
        result.push({
          ...item,
          code: item.code || item.staff_code || item.id
        });
      }
    });
    return result;
  }, [staffs]);

  useEffect(() => {
    if (staffs && staffs.length > displayStaffs.length) {
      if (setStaffs) setStaffs(displayStaffs);
      if (saveDatabaseNow) saveDatabaseNow({ staffs: displayStaffs });
    }
  }, [staffs, displayStaffs, setStaffs, saveDatabaseNow]);

  return (
    <>
      {renderTable("Kelola Data Karyawan",
        ["Kode","Nama Lengkap","Bagian / Divisi","No. WhatsApp","Status Alat"],
        displayStaffs,
        (item, idx, isSelected) => {
          const empKey = String(item.code || item.staff_code || "").trim().toLowerCase();
          const isConnected = empKey && (
            hikNisSet.has(empKey) ||
            (empKey.length > 8 && (hikNisSet.has(empKey.slice(0, 8)) || hikNisSet.has(empKey.slice(-8))))
          );

          return (
            <tr key={item.code} className={`hover:bg-slate-50/50 transition-colors ${isSelected ?"bg-[var(--ui-accent)]/20/40" :""}`}>
              <td className="px-4 py-4 text-center">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => updateSelectionForTab("Karyawan", (current) => current.includes(item.code) ? current.filter((x) => x !== item.code) : [...current, item.code])}
                  className="accent-[var(--ui-primary)] cursor-pointer"
                  aria-label={`Pilih Karyawan ${item.code}`}
                />
              </td>
              <td className="px-6 py-4 text-center font-bold text-slate-400">{idx + 1}</td>
              <td className="px-6 py-4 text-center font-black text-[var(--ui-primary)]">{item.code}</td>
              <td className="px-6 py-4 font-bold text-slate-800">
                {quickEditKaryawanCode === item.code ? (
                  <input type="text" value={quickKaryawanForm.name ||""} onChange={(e) => setQuickKaryawanForm({ ...quickKaryawanForm, name: e.target.value })} className="w-full border-none bg-white px-2 py-1 rounded-[var(--ui-radius-small)] text-[11px] font-bold" />
                ) : item.name}
              </td>
              <td className="px-6 py-4 font-bold text-slate-700 text-sm">
                {quickEditKaryawanCode === item.code ? (
                  <input type="text" value={quickKaryawanForm.division ||""} onChange={(e) => setQuickKaryawanForm({ ...quickKaryawanForm, division: e.target.value })} className="w-full border-none bg-white px-2 py-1 rounded-[var(--ui-radius-small)] text-[11px] font-bold" placeholder="Contoh: Kebersihan" />
                ) : (item.division ||"-")}
              </td>
              <td className="px-6 py-4 font-semibold text-slate-700 text-sm">
                {quickEditKaryawanCode === item.code ? (
                  <input type="text" value={quickKaryawanForm.phone ||""} onChange={(e) => setQuickKaryawanForm({ ...quickKaryawanForm, phone: e.target.value.replace(/[^0-9]/g,'') })} className="w-full border-none bg-white px-2 py-1 rounded-[var(--ui-radius-small)] text-[11px] font-bold" placeholder="6281xxx" />
                ) : (item.phone ||"-")}
              </td>
              {/* Status Alat Hikvision */}
              <td className="px-6 py-4">
                {isConnected ? (
                  <div className="flex justify-center text-emerald-500" title="Terhubung"><CheckCircle2 size={18} strokeWidth={3} /></div>
                ) : (
                  <div className="flex justify-center text-slate-300" title="Belum Terhubung"><XCircle size={18} strokeWidth={3} /></div>
                )}
              </td>
              <td className="px-6 py-4 text-right">
                {!isViewOnly ? (
                  <div className="flex justify-end gap-1.5">
                    {quickEditKaryawanCode === item.code ? (
                      <>
                        <Button size="sm" onClick={() => saveQuickEditKaryawan(item.code)}>Save</Button>
                        <Button size="sm" variant="outline" onClick={() => { setQuickEditKaryawanCode(""); setQuickKaryawanForm({}); }}>Cancel</Button>
                      </>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => startQuickEditKaryawan(item)}>Quick Edit</Button>
                    )}
                    <Button size="icon" variant="ghost" onClick={() => openModal('Karyawan','edit', item)} title="Edit"><Edit2 size={14} className="text-slate-500" /></Button>
                    {(() => {
                      const deps = checkDependencies('Karyawan', item.code);
                      if (deps.length > 0) {
                        return (
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            onClick={() => openModal('lock_info', 'view', { type: 'Karyawan', name: `Karyawan: ${item.name || item.code}`, deps })}
                            title="Klik untuk melihat detail koneksi data"
                            className="hover:bg-amber-50 border border-amber-200/80 cursor-pointer"
                          >
                            <Lock size={14} className="text-amber-500" />
                          </Button>
                        );
                      }
                      return (
                        <Button size="icon" variant="ghost" onClick={() => handleDelete('Karyawan', item.code)} title="Hapus"><Trash2 size={14} className="text-rose-500" /></Button>
                      );
                    })()}
                  </div>
                ) : (
                  <span className="text-xs text-slate-400 italic font-medium">Lihat saja</span>
                )}
              </td>
            </tr>
          );
        },
        { customHeaderButtons: customButtons, pageHeader: <PageHeader title="Data Karyawan" description="Kelola data induk staf dan karyawan sekolah serta status mesin absensi." icon={Users} /> }
      )}

      {/* Import Confirm Modal */}
      {importConfirmOpen && (
        <Modal isOpen={true} onClose={() => setImportConfirmOpen(false)}>
          <div className="p-6 w-full max-w-[400px] text-center">
            <HardDrive size={40} className="mx-auto text-blue-600 mb-4" />
            <h3 className="text-lg font-bold text-slate-800 mb-2">Tarik Data Karyawan</h3>
            <p className="text-sm text-slate-600 mb-6">
              Apakah Anda yakin ingin menarik data karyawan dari mesin ke dalam sistem? Karyawan baru yang tidak ada di sistem akan ditambahkan secara otomatis.
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

export default MasterDataKaryawan;
