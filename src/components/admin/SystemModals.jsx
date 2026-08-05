import { Button } from '../../components/ui.jsx';
import { useState, useEffect } from'react';
import { Eye, EyeOff, Save, KeyRound, Check, X, Shield, AlertTriangle, MonitorPlay, Clock, Wand2, Lock } from'lucide-react';
import { Modal } from'../ui.jsx';
import { verifyPassword } from '../../utils/auth.js';


export default function SystemModals({
  modalConfig,
  closeModal,
  formData,
  setFormData,
  isSavingModal,
  selectedDaySetting,
  handleGenerateSlots,
  handleSave,
  footerInfoModal,
  closeFooterInfo,
  currentUser,
  showNotification,
  adminUser,
  teachers,
  staffs
}) {
  const [nonAdminPassword, setNonAdminPassword] = useState("");
  const [nonAdminConfirm, setNonAdminConfirm] = useState("");
  const [localSaving, setLocalSaving] = useState(false);
  const [pwError, setPwError] = useState("");

  useEffect(() => {
    if (!modalConfig.isOpen) {
      setNonAdminPassword("");
      setNonAdminConfirm("");
      setPwError("");
    }
  }, [modalConfig.isOpen]);

  useEffect(() => {
    const checkPasswordPolicy = async () => {
      const pw = (modalConfig.type ==="admin" || currentUser?.role ==="admin") 
        ? (formData.password ||"") 
        : nonAdminPassword;

      if (!pw) {
        setPwError("");
        return;
      }

      // 1. Length rule: 6 to 12 characters
      if (pw.length < 6 || pw.length > 12) {
        setPwError("Panjang password harus antara 6 hingga 12 karakter!");
        return;
      }

      // 2. Uniqueness rule: not same as previous
      let currentPasswordHash ="";
      if (currentUser?.role ==="admin" || currentUser?.role ==="superadmin") {
        currentPasswordHash = adminUser?.password ||"";
      } else {
        const matchedTeacher = teachers?.find((t) => t.code === currentUser?.code);
        if (matchedTeacher) {
          currentPasswordHash = matchedTeacher.password ||"";
        } else {
          const matchedStaff = staffs?.find((s) => s.code === currentUser?.code);
          if (matchedStaff) {
            currentPasswordHash = matchedStaff.password ||"";
          }
        }
      }

      if (currentPasswordHash) {
        try {
          const isSame = await verifyPassword(pw, currentPasswordHash);
          if (isSame) {
            setPwError("Tidak boleh menggunakan password yang sama dengan sebelumnya!");
            return;
          }
        } catch (err) {
          console.error("Error verifying password hash in real-time:", err);
        }
      }

      setPwError("");
    };

    checkPasswordPolicy();
  }, [formData.password, nonAdminPassword, modalConfig.type, currentUser, adminUser, teachers, staffs]);

  const handleNonAdminSubmit = async (e) => {
    e.preventDefault();
    if (!nonAdminPassword) {
      if (showNotification) showNotification("Kata sandi baru tidak boleh kosong!","warning");
      return;
    }
    if (nonAdminPassword.length < 6 || nonAdminPassword.length > 12) {
      if (showNotification) showNotification("Panjang password harus antara 6 hingga 12 karakter!","warning");
      return;
    }
    if (nonAdminPassword !== nonAdminConfirm) {
      if (showNotification) showNotification("Konfirmasi kata sandi tidak cocok!","warning");
      return;
    }

    setLocalSaving(true);
    try {
      const response = await fetch("/api/auth/change-password", {
        method:"POST",
        headers: {"Content-Type":"application/json","Authorization": `Bearer ${currentUser?.authToken}`
        },
        body: JSON.stringify({ newPassword: nonAdminPassword })
      });
      const data = await response.json();
      if (data.ok) {
        if (showNotification) showNotification(data.message ||"Kata sandi berhasil diperbarui!","success");
        setNonAdminPassword("");
        setNonAdminConfirm("");
        closeModal();
      } else {
        if (showNotification) showNotification(data.message ||"Gagal memperbarui kata sandi.","error");
      }
    } catch (err) {
      console.error(err);
      if (showNotification) showNotification("Kesalahan jaringan saat memperbarui kata sandi.","error");
    }
    setLocalSaving(false);
  };

  return (
    <>
      {/* Modal Auto-Generate Waktu */}
      <Modal
        isOpen={modalConfig.isOpen && modalConfig.type ==="generate_slots"}
        onClose={closeModal}
        title={`Generate Waktu Otomatis`}
      >
        <form onSubmit={handleGenerateSlots} className="space-y-5">
          <div className="bg-[var(--ui-accent)]/20 p-4 rounded-[var(--ui-radius-small)] border border-[var(--ui-primary)]/20 mb-2">
            <p className="text-xs font-bold text-[var(--ui-primary)] leading-relaxed">
              Sistem akan membagi jam secara otomatis untuk{""}
              <span className="uppercase font-black">{selectedDaySetting}</span>{""}
              berdasarkan pengaturan di bawah ini.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">
                Jam Mulai (HH:MM)
              </label>
              <input
                type="time"
                required
                value={formData.startTime ||""}
                onChange={(e) =>
                  setFormData({ ...formData, startTime: e.target.value })
                }
                className="w-full border-none bg-slate-50 p-3.5 rounded-[var(--ui-radius-small)] text-sm font-bold focus:bg-white focus:outline-[var(--ui-primary)]"
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">
                Durasi per JP (Menit)
              </label>
              <input
                type="number"
                min="1"
                required
                value={formData.lessonDuration ||""}
                onChange={(e) =>
                  setFormData({ ...formData, lessonDuration: e.target.value })
                }
                className="w-full border-none bg-slate-50 p-3.5 rounded-[var(--ui-radius-small)] text-sm font-bold focus:bg-white focus:outline-[var(--ui-primary)]"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">
              Total Jumlah Jam Pelajaran
            </label>
            <input
              type="number"
              min="1"
              required
              value={formData.totalLessons ||""}
              onChange={(e) =>
                setFormData({ ...formData, totalLessons: e.target.value })
              }
              className="w-full border-none bg-slate-50 p-3.5 rounded-[var(--ui-radius-small)] text-sm font-bold focus:bg-white focus:outline-[var(--ui-primary)]"
            />
          </div>

          <div className="border border-orange-100 bg-orange-50/30 p-4 rounded-[var(--ui-radius-small)] space-y-4">
            <h4 className="text-xs font-black text-orange-800 flex items-center gap-2">
              <Clock size={14} /> Pengaturan Istirahat 1
            </h4>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">
                  Setelah JP ke-
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.break1After ||""}
                  onChange={(e) =>
                    setFormData({ ...formData, break1After: e.target.value })
                  }
                  className="w-full border-none bg-white p-2.5 rounded-[var(--ui-radius-small)] text-xs font-bold focus:outline-orange-500"
                />
              </div>
              <div>
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">
                  Durasi (Menit)
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.break1Duration ||""}
                  onChange={(e) =>
                    setFormData({ ...formData, break1Duration: e.target.value })
                  }
                  className="w-full border-none bg-white p-2.5 rounded-[var(--ui-radius-small)] text-xs font-bold focus:outline-orange-500"
                />
              </div>
              <div>
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">
                  Label Teks
                </label>
                <input
                  type="text"
                  value={formData.break1Label ||""}
                  onChange={(e) =>
                    setFormData({ ...formData, break1Label: e.target.value })
                  }
                  className="w-full border-none bg-white p-2.5 rounded-[var(--ui-radius-small)] text-xs font-bold focus:outline-orange-500"
                />
              </div>
            </div>
          </div>

          <div className="border border-orange-100 bg-orange-50/30 p-4 rounded-[var(--ui-radius-small)] space-y-4">
            <h4 className="text-xs font-black text-orange-800 flex items-center gap-2">
              <Clock size={14} /> Pengaturan Istirahat 2 (Opsional)
            </h4>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">
                  Setelah JP ke-
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.break2After ||""}
                  onChange={(e) =>
                    setFormData({ ...formData, break2After: e.target.value })
                  }
                  className="w-full border-none bg-white p-2.5 rounded-[var(--ui-radius-small)] text-xs font-bold focus:outline-orange-500"
                />
              </div>
              <div>
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">
                  Durasi (Menit)
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.break2Duration ||""}
                  onChange={(e) =>
                    setFormData({ ...formData, break2Duration: e.target.value })
                  }
                  className="w-full border-none bg-white p-2.5 rounded-[var(--ui-radius-small)] text-xs font-bold focus:outline-orange-500"
                />
              </div>
              <div>
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">
                  Label Teks
                </label>
                <input
                  type="text"
                  value={formData.break2Label ||""}
                  onChange={(e) =>
                    setFormData({ ...formData, break2Label: e.target.value })
                  }
                  className="w-full border-none bg-white p-2.5 rounded-[var(--ui-radius-small)] text-xs font-bold focus:outline-orange-500"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <Button type="button" variant="secondary" onClick={closeModal} className="gap-2">
              <X size={16} /> Batal
            </Button>
            <Button type="submit">
              <Wand2 size={16} /> Eksekusi
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Edit Profil Akun */}
      <Modal
        isOpen={modalConfig.isOpen && (modalConfig.type ==="admin" || modalConfig.type ==="profile_edit")}
        onClose={closeModal}
        title={`Edit Profil Akun`}
      >
        {/* Password Policy Banner */}
        <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 mb-5 text-xs text-slate-650 space-y-1.5">
          <p className="font-black uppercase tracking-widest text-[9px] text-slate-550 mb-2 flex items-center gap-1.5">
            <Lock size={12} className="text-[var(--ui-primary)]" /> Kebijakan Keamanan Password:
          </p>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[var(--ui-primary)]" />
            <span className="font-semibold text-slate-700">Panjang Karakter:</span> Minimal 6 hingga 12 karakter.
          </div>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[var(--ui-primary)]" />
            <span className="font-semibold text-slate-700">Keunikan:</span> Tidak bisa menggunakan password yang sama dengan sebelumnya.
          </div>
        </div>

        {currentUser?.role ==="admin" ? (
          <form onSubmit={handleSave} noValidate className="space-y-4">
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">
                Nama Pengguna
              </label>
              <input
                type="text"
                required
                value={formData.name ||""}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="w-full border-none bg-slate-50 p-3.5 rounded-[var(--ui-radius-small)] text-sm font-bold focus:bg-white focus:outline-[var(--ui-primary)] transition-colors"
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">
                Username Login
              </label>
              <input
                type="text"
                required
                value={formData.username ||""}
                onChange={(e) =>
                  setFormData({ ...formData, username: e.target.value })
                }
                className="w-full border-none bg-slate-50 p-3.5 rounded-[var(--ui-radius-small)] text-sm font-bold focus:bg-white focus:outline-[var(--ui-primary)] transition-colors"
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">
                Password Baru
              </label>
              <input
                type="password"
                value={formData.password ||""}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                className="w-full border-none bg-slate-50 p-3.5 rounded-[var(--ui-radius-small)] text-sm font-bold focus:bg-white focus:outline-[var(--ui-primary)] transition-colors"
                placeholder="Kosongkan jika tidak diubah"
              />
            </div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pt-6 border-t border-slate-100 mt-4">
              <div className="text-red-500 font-bold text-xs text-left max-w-[280px]">
                {pwError && `⚠️ ${pwError}`}
              </div>
              <div className="flex gap-3 w-full sm:w-auto justify-end">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={closeModal}
                  className="px-8 gap-2"
                  disabled={isSavingModal}
                >
                  <X size={16} /> Batal
                </Button>
                <Button type="submit" className="px-8 gap-2" disabled={isSavingModal || !!pwError}>
                  <Save size={16} /> {isSavingModal ?"Menyimpan..." :"Simpan Profil"}
                </Button>
              </div>
            </div>
          </form>
        ) : (
          <form onSubmit={handleNonAdminSubmit} className="space-y-4">
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">
                Password Baru
              </label>
              <input
                type="password"
                required
                value={nonAdminPassword}
                onChange={(e) => setNonAdminPassword(e.target.value)}
                className="w-full border-none bg-slate-50 p-3.5 rounded-[var(--ui-radius-small)] text-sm font-bold focus:bg-white focus:outline-[var(--ui-primary)] transition-colors"
                placeholder="Masukkan password baru"
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">
                Konfirmasi Password Baru
              </label>
              <input
                type="password"
                required
                value={nonAdminConfirm}
                onChange={(e) => setNonAdminConfirm(e.target.value)}
                className="w-full border-none bg-slate-50 p-3.5 rounded-[var(--ui-radius-small)] text-sm font-bold focus:bg-white focus:outline-[var(--ui-primary)] transition-colors"
                placeholder="Ulangi password baru"
              />
            </div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pt-6 border-t border-slate-100 mt-4">
              <div className="text-red-500 font-bold text-xs text-left max-w-[280px]">
                {pwError && `⚠️ ${pwError}`}
              </div>
              <div className="flex gap-3 w-full sm:w-auto justify-end">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={closeModal}
                  className="px-8 gap-2"
                  disabled={localSaving}
                >
                  <X size={16} /> Batal
                </Button>
                <Button type="submit" className="px-8 gap-2" disabled={localSaving || !!pwError}>
                  <KeyRound size={16} /> {localSaving ?"Menyimpan..." :"Simpan Password"}
                </Button>
              </div>
            </div>
          </form>
        )}
      </Modal>

      {/* Modal Footer Info */}
      <Modal
        isOpen={footerInfoModal.isOpen}
        onClose={closeFooterInfo}
        title={footerInfoModal.title}
      >
        <div className="space-y-4">
          <p className="text-sm leading-relaxed text-slate-600 font-medium">
            {footerInfoModal.message}
          </p>
          <div className="flex justify-end">
            <Button type="button" onClick={closeFooterInfo} className="gap-2">
              <X size={16} /> Tutup
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal Lock Info (Detail Koneksi Data Terkunci) */}
      <Modal
        isOpen={modalConfig.isOpen && modalConfig.type === 'lock_info'}
        onClose={closeModal}
      >
        <div className="p-6 w-full max-w-md space-y-4 font-sans">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200/80 flex items-center justify-center shrink-0 shadow-2xs">
              <Lock size={22} />
            </div>
            <div>
              <h3 className="font-black text-slate-900 text-base leading-tight">Detail Koneksi Data</h3>
              <p className="text-xs font-bold text-amber-700 mt-0.5">{modalConfig.data?.name || 'Data Terkunci'}</p>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200 text-xs font-medium text-amber-900 leading-relaxed">
            Data ini dikunci oleh sistem dan <strong className="font-bold">tidak dapat dihapus</strong> karena sedang terhubung dengan data di modul lain:
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {Array.isArray(modalConfig.data?.deps) && modalConfig.data.deps.length > 0 ? (
              modalConfig.data.deps.map((dep, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs font-bold text-slate-800">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                    <span>{typeof dep === 'object' ? dep.name || dep.title : dep}</span>
                  </span>
                  {typeof dep === 'object' && dep.detail && (
                    <span className="text-[11px] font-semibold text-slate-500 bg-white px-2 py-0.5 rounded-md border border-slate-200">{dep.detail}</span>
                  )}
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500 font-medium">Terhubung dengan data relasional sistem.</p>
            )}
          </div>

          <div className="p-3 rounded-xl bg-slate-100/70 border border-slate-200 text-[11px] text-slate-600 font-medium leading-normal">
            💡 <strong>Petunjuk:</strong> Untuk menghapus data ini, Anda harus melepaskan atau menghapus koneksi pada modul terkait di atas terlebih dahulu.
          </div>

          <div className="pt-2 flex justify-end">
            <Button type="button" onClick={closeModal} className="w-full sm:w-auto font-bold text-xs gap-2">
              <Check size={16} /> Saya Mengerti
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
