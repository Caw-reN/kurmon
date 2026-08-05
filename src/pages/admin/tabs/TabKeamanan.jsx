import { Button } from '../../../components/ui.jsx';
import { useState } from'react';
import { Lock } from'lucide-react';
import { PageHeader } from'../../../components/monitoring/ui/index.js';
import { verifyPassword, hashPassword } from '../../../utils/auth.js';


export default function TabKeamanan(props) {
  const { currentUser, teachers, setTeachers, staffs, setStaffs, adminUser, setAdminUser, syncAuthSnapshotNow, saveDatabaseNow, showNotification } = props;
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!newPassword.trim()) {
      if (showNotification) showNotification("Sandi baru tidak boleh kosong!","warning");
      return;
    }
    
    // 1. Validate length: 6 to 12 characters
    if (newPassword.length < 6 || newPassword.length > 12) {
      if (showNotification) showNotification("Panjang password harus antara 6 hingga 12 karakter!","warning");
      return;
    }

    if (newPassword !== confirmPassword) {
      if (showNotification) showNotification("Konfirmasi sandi tidak cocok!","warning");
      return;
    }

    // 2. Validate same as previous password
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
        const isSame = await verifyPassword(newPassword, currentPasswordHash);
        if (isSame) {
          if (showNotification) showNotification("Tidak bisa menggunakan password yang sama dengan sebelumnya!","warning");
          return;
        }
      } catch (err) {
        console.error("Failed to verify previous password hash:", err);
      }
    }

    const passwordHash = await hashPassword(newPassword);

    try {
      if (currentUser?.role ==="admin" || currentUser?.role ==="superadmin") {
        const updatedAdmin = { ...adminUser, password: passwordHash };
        if (syncAuthSnapshotNow) await syncAuthSnapshotNow(updatedAdmin, teachers,"menyimpan profil admin");
        if (saveDatabaseNow) await saveDatabaseNow({ adminUser: updatedAdmin },"menyimpan profil admin");
        if (setAdminUser) setAdminUser(updatedAdmin);
        if (showNotification) showNotification("Sandi Admin berhasil diubah!","success");
      } else if (teachers && teachers.some((t) => t.code === currentUser?.code)) {
        const nextTeachers = teachers.map((t) => t.code === currentUser.code ? { ...t, password: passwordHash } : t);
        if (saveDatabaseNow) await saveDatabaseNow({ teachers: nextTeachers },"mengubah password guru");
        if (setTeachers) setTeachers(nextTeachers);
        if (showNotification) showNotification("Sandi Anda berhasil diubah!","success");
      } else if (staffs && staffs.some((s) => s.code === currentUser?.code)) {
        const nextStaffs = staffs.map((s) => s.code === currentUser.code ? { ...s, password: passwordHash } : s);
        if (saveDatabaseNow) await saveDatabaseNow({ staffs: nextStaffs },"mengubah password karyawan");
        if (setStaffs) setStaffs(nextStaffs);
        if (showNotification) showNotification("Sandi Anda berhasil diubah!","success");
      } else {
        if (showNotification) showNotification("Pengguna tidak ditemukan dalam database.","warning");
        return;
      }
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      console.error(err);
      if (showNotification) showNotification("Gagal mengubah kata sandi.","danger");
    }
  };

  return (
    <div className="flex flex-col gap-5 w-full animate-in fade-in duration-300 relative z-10">
      <PageHeader
        title="Keamanan Akun"
        description="Ubah kata sandi login Anda secara berkala untuk menjaga keamanan akun Anda."
        icon={Lock}
      />

      <div className="bg-white rounded-[var(--ui-radius-card)] p-6 shadow-sm border-none">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-5">
          <div className="w-10 h-10 rounded-[var(--ui-radius-small)] bg-[var(--ui-primary)]/10 text-[var(--ui-primary)] flex items-center justify-center">
            <Lock size={20} />
          </div>
          <div>
            <h3 className="font-black text-slate-800 text-base tracking-tight">Ubah Kata Sandi</h3>
            <p className="text-[11px] font-bold text-slate-400 mt-0.5">Silakan isi form di bawah ini untuk mengubah kata sandi Anda</p>
          </div>
        </div>

        {/* Password Policy Banner */}
        <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 mb-6 text-xs text-slate-600 space-y-1.5 max-w-md">
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

        <form onSubmit={handleChangePassword} className="max-w-md space-y-4">
          <div>
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1.5 ml-1">Sandi Baru</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Masukkan sandi baru"
              className="w-full border border-slate-200 bg-slate-50 p-3.5 rounded-[var(--ui-radius-small)] text-sm font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-[var(--ui-primary)]/15"
              required
            />
          </div>
          <div>
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1.5 ml-1">Konfirmasi Sandi Baru</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Konfirmasi sandi baru"
              className="w-full border border-slate-200 bg-slate-50 p-3.5 rounded-[var(--ui-radius-small)] text-sm font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-[var(--ui-primary)]/15"
              required
            />
          </div>
          <Button variant="ghost" size="sm"
            type="submit"
            
          >
            Simpan Kata Sandi
          </Button>
        </form>
      </div>
    </div>
  );
}
