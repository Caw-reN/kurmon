import { memo, useState, useEffect, useMemo } from'react';
import { Users } from'lucide-react';
import useAuthStore from'../../../store/monitoring/authStore';
import { HardDrive, Link2, CheckCircle2, XCircle, Edit2, Lock, Trash2, Briefcase } from'lucide-react';
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

  const fetchHikstaffs = async () => {
    if (!authToken) return;
    try {
      const res = await fetch("/api/hikvision/students?type=karyawan", { headers: { Authorization: `Bearer ${authToken}` } });
      const json = await res.json();
      if (json.ok) {
        setHikstaffs(json.data || []);
      }
    } catch (err) {
      console.error("Gagal memuat staf Hikvision:", err);
    }
  };

  useEffect(() => {
    fetchHikstaffs();
  }, [authToken]);

  // Create fast sets for NIS and Name checking (only considering items registered on device)
  const hikNisSet = useMemo(() => new Set(hikstaffs.filter(s => s.is_on_device !== false).flatMap(s => [s.nis, s.code].map(x => String(x || "").trim().toLowerCase()).filter(Boolean))), [hikstaffs]);
  const hikNameSet = useMemo(() => new Set(hikstaffs.filter(s => s.is_on_device !== false).flatMap(s => [s.name, s.device_name, s.nama].map(x => String(x || "").trim().toLowerCase()).filter(Boolean))), [hikstaffs]);

  const startQuickEditKaryawan = (item) => {
    setQuickEditKaryawanCode(item.code);
    setQuickKaryawanForm({
      name: item.name || "",
      division: item.division || "",
      phone: item.phone || ""
    });
  };

  const saveQuickEditKaryawan = (code) => {
    const nextName = String(quickKaryawanForm.name || "").trim();
    if (!nextName) {
      showFeedback("Peringatan", "Nama karyawan wajib diisi.", "error");
      return;
    }
    const updated = staffs.map((t) => (t.code === code ? { ...t, ...quickKaryawanForm, name: nextName } : t));
    if (setStaffs) setStaffs(updated);
    if (saveDatabaseNow) {
      saveDatabaseNow({ staffs: updated }, "update data Karyawan");
    }
    setQuickEditKaryawanCode("");
    setQuickKaryawanForm({});
  };

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
        const schoolCode = String(t.code || t.staff_code || t.id || "").trim().toLowerCase();
        const schoolName = String(t.name || t.nama || "").trim().toLowerCase();

        const matchedHik = hikstaffs.find(h => {
          const hNis = String(h.nis || "").trim().toLowerCase();
          const hName = String(h.name || h.device_name || "").trim().toLowerCase();
          return hNis === schoolCode || 
                 (schoolCode.length > 8 && (hNis === schoolCode.slice(0, 8) || hNis === schoolCode.slice(-8))) ||
                 hName === schoolName || hName.includes(schoolName) || schoolName.includes(hName);
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

  // Deduplicate displayStaffs
  const displayStaffs = useMemo(() => {
    const seen = new Set();
    const result = [];
    (staffs || []).forEach(item => {
      const key = String(item.code || item.staff_code || item.id || "").trim().toLowerCase();
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

  const connectedCount = useMemo(() => {
    return displayStaffs.filter(item => {
      const empKey = String(item.code || item.staff_code || item.id || "").trim().toLowerCase();
      const nameKey = String(item.name || item.nama || "").trim().toLowerCase();
      return (empKey && hikNisSet.has(empKey)) ||
             (nameKey && hikNameSet.has(nameKey));
    }).length;
  }, [displayStaffs, hikNisSet, hikNameSet]);

  const notConnectedCount = Math.max(0, displayStaffs.length - connectedCount);

  const uniqueDivisions = useMemo(() => {
    return [...new Set(displayStaffs.map(s => s.division).filter(Boolean))];
  }, [displayStaffs]);

  const pageHeader = (
    <div className="flex flex-col gap-4">
      {/* KPI Cards Header */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Karyawan */}
        <div className="ui-card p-3.5 sm:p-4 rounded-[var(--ui-radius-card)] bg-white border border-slate-200/80 shadow-xs hover:shadow-xs transition-all flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-[var(--ui-radius-small)] bg-[var(--ui-primary)]/10 text-[var(--ui-primary)] flex items-center justify-center shrink-0 border border-[var(--ui-primary)]/20">
            <Users size={20} strokeWidth={2.2} />
          </div>
          <div>
            <p className="text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-wider">Total Karyawan Terdata</p>
            <p className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">{displayStaffs.length}</p>
          </div>
        </div>

        {/* Terhubung */}
        <div className="ui-card p-3.5 sm:p-4 rounded-[var(--ui-radius-card)] bg-white border border-emerald-200/60 shadow-xs hover:shadow-xs transition-all flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-[var(--ui-radius-small)] bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-200">
            <CheckCircle2 size={20} strokeWidth={2.2} />
          </div>
          <div>
            <p className="text-[10px] sm:text-[11px] font-black text-emerald-600 uppercase tracking-wider">Terhubung (Mesin & Master)</p>
            <p className="text-xl sm:text-2xl font-black text-emerald-700 tracking-tight">{connectedCount}</p>
          </div>
        </div>

        {/* Belum Ada di Mesin */}
        <div className="ui-card p-3.5 sm:p-4 rounded-[var(--ui-radius-card)] bg-white border border-rose-200/60 shadow-xs hover:shadow-xs transition-all flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-[var(--ui-radius-small)] bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-200">
            <XCircle size={20} strokeWidth={2.2} />
          </div>
          <div>
            <p className="text-[10px] sm:text-[11px] font-black text-rose-600 uppercase tracking-wider">Belum Ada di Mesin</p>
            <p className="text-xl sm:text-2xl font-black text-rose-700 tracking-tight">{notConnectedCount}</p>
          </div>
        </div>

        {/* Total Divisi */}
        <div className="ui-card p-3.5 sm:p-4 rounded-[var(--ui-radius-card)] bg-white border border-amber-200/60 shadow-xs hover:shadow-xs transition-all flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-[var(--ui-radius-small)] bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-200">
            <Briefcase size={20} strokeWidth={2.2} />
          </div>
          <div>
            <p className="text-[10px] sm:text-[11px] font-black text-amber-600 uppercase tracking-wider">Total Divisi / Unit</p>
            <p className="text-xl sm:text-2xl font-black text-amber-700 tracking-tight">{uniqueDivisions.length} Divisi</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {renderTable("Kelola Data Karyawan",
        ["Kode","Nama Karyawan","Bagian / Divisi","Status Alat"],
        displayStaffs,
        (item, idx, isSelected) => {
          const empKey = String(item.code || item.staff_code || item.id || "").trim().toLowerCase();
          const nameKey = String(item.name || item.nama || "").trim().toLowerCase();
          const isConnected = (empKey && hikNisSet.has(empKey)) ||
                              (nameKey && hikNameSet.has(nameKey));

          return (
            <tr key={item.code} className={`hover:bg-slate-50/50 transition-colors ${isSelected ?"bg-[var(--ui-accent)]/20/40" :""}`}>
              <td className="px-2.5 py-2.5 text-center">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => updateSelectionForTab("Karyawan", (current) => current.includes(item.code) ? current.filter((x) => x !== item.code) : [...current, item.code])}
                  className="accent-[var(--ui-primary)] cursor-pointer"
                  aria-label={`Pilih Karyawan ${item.code}`}
                />
              </td>
              <td className="px-2 py-2.5 text-center font-bold text-slate-400 text-xs">{idx + 1}</td>
              <td className="px-2.5 py-2.5 text-center">
                <span className="px-2 py-0.5 font-mono text-[11px] font-black text-[var(--ui-primary)] bg-[var(--ui-primary)]/10 rounded-[var(--ui-radius-small)]">
                  {item.code}
                </span>
              </td>
              <td className="px-3 py-2.5">
                {quickEditKaryawanCode === item.code ? (
                  <div className="space-y-1">
                    <input type="text" value={quickKaryawanForm.name ||""} onChange={(e) => setQuickKaryawanForm({ ...quickKaryawanForm, name: e.target.value })} className="w-full border border-slate-200 bg-white px-2 py-1 rounded-[var(--ui-radius-small)] text-xs font-bold" placeholder="Nama Karyawan" />
                    <input type="text" value={quickKaryawanForm.phone ||""} onChange={(e) => setQuickKaryawanForm({ ...quickKaryawanForm, phone: e.target.value.replace(/[^0-9]/g,'') })} className="w-full border border-slate-200 bg-white px-2 py-0.5 rounded-[var(--ui-radius-small)] text-[11px] font-mono" placeholder="No. WA: 081xxx" />
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
              <td className="px-3 py-2.5 font-bold text-slate-700 text-xs">
                {quickEditKaryawanCode === item.code ? (
                  <input type="text" value={quickKaryawanForm.division ||""} onChange={(e) => setQuickKaryawanForm({ ...quickKaryawanForm, division: e.target.value })} className="w-full border border-slate-200 bg-white px-2 py-1 rounded-[var(--ui-radius-small)] text-xs font-bold" placeholder="Contoh: Kebersihan" />
                ) : (
                  <span className="px-2 py-0.5 rounded-[var(--ui-radius-small)] bg-slate-100 text-slate-700 text-xs">
                    {item.division ||"-"}
                  </span>
                )}
              </td>
              {/* Status Alat Hikvision */}
              <td className="px-2.5 py-2.5 text-center">
                {isConnected ? (
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
                    {quickEditKaryawanCode === item.code ? (
                      <>
                        <Button size="sm" className="h-7 px-2 text-xs" onClick={() => saveQuickEditKaryawan(item.code)}>Save</Button>
                        <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => { setQuickEditKaryawanCode(""); setQuickKaryawanForm({}); }}>Batal</Button>
                      </>
                    ) : (
                      <>
                        <Button size="icon" variant="ghost" className="h-7 w-7 p-0" onClick={() => openModal('Karyawan','edit', item)} title="Edit Karyawan">
                          <Edit2 size={13} className="text-slate-600" />
                        </Button>
                        {(() => {
                          const deps = checkDependencies('Karyawan', item.code);
                          if (deps.length > 0) {
                            return (
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                className="h-7 w-7 p-0 hover:bg-amber-50 border border-amber-200/80 cursor-pointer"
                                onClick={() => openModal('lock_info', 'view', { type: 'Karyawan', name: `Karyawan: ${item.name || item.code}`, deps })}
                                title="Klik untuk melihat detail koneksi data"
                              >
                                <Lock size={13} className="text-amber-500" />
                              </Button>
                            );
                          }
                          return (
                            <Button size="icon" variant="ghost" className="h-7 w-7 p-0 hover:bg-rose-50 text-rose-500" onClick={() => handleDelete('Karyawan', item.code)} title="Hapus">
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
        { tabKey: "karyawan", defaultSort: { key: "code", dir: "asc" }, customHeaderButtons: customButtons, pageHeader }
      )}

      {/* Import Confirm Modal */}
      {importConfirmOpen && (
        <Modal isOpen={true} onClose={() => setImportConfirmOpen(false)}>
          <div className="p-6 w-full max-w-[400px] text-center">
            <HardDrive size={40} className="mx-auto text-indigo-600 mb-4" />
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
