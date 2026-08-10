import { Button } from '../../../components/ui.jsx';
import { useState } from'react';
import { useAppStore } from'../../../store/useAppStore.js';
import { getRoleOption, getWakaDivisionOption, ROLE_OPTIONS, WAKA_DIVISION_OPTIONS } from'../../../utils/constants.js';
import useFiturStore from'../../../store/monitoring/fiturStore.js';
import { Users, ShieldCheck, Key, History } from'lucide-react';
import { Lock, Shield, Edit2, Search, Plus, Activity, Trash2 } from'lucide-react';
import { PageHeader } from '../../../components/monitoring/ui/index.js';
import { hashPassword } from '../../../utils/auth.js';


export default function TabPengaturanUser(props) {
  const normalizeText = (value) => String(value ??"").trim().replace(/\s+/g,"").toLowerCase();
  const sameText = (a, b) => normalizeText(a) === normalizeText(b);

  const { searchTerm, teachers, staffs, setStaffs, adminUser, openModal, setSearchTerm, appSettings, currentUser, handleDelete, saveDatabaseNow, showNotification, syncAuthSnapshotNow, activeTab, setActiveTab, normalizeUserRole } = props;
  const { ...allProps } = props;
  
  const passwordResetRequests = useAppStore((state) => state.passwordResetRequests);
  const updatePasswordResetRequest = useAppStore((state) => state.updatePasswordResetRequest);

  const pendingRequests = (passwordResetRequests || []).filter(r => r.status ==="pending");
  const [processingIds, setProcessingIds] = useState(new Set());

  const handleApproveReset = async (request) => {
    // Prevent double-click / duplicate processing
    if (processingIds.has(request.id)) return;
    setProcessingIds(prev => new Set([...prev, request.id]));

    const charset ="ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let newPassword ="";
    for (let i = 0; i < 6; i++) {
      newPassword += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    
    // Hash password
    const nextPasswordHash = await hashPassword(newPassword);

    let success = false;
    let targetName ="";

    if (request.role ==="guru" || request.role ==="waka" || request.role ==="kepsek") {
      const targetTeacher = teachers.find(t => sameText(t.code, request.username) || sameText(t.name, request.username));
      if (targetTeacher) {
        targetName = targetTeacher.name;
        const nextTeachers = teachers.map(t => sameText(t.code, targetTeacher.code) ? { ...t, password: nextPasswordHash } : t);
        if (allProps.setTeachers) {
          allProps.setTeachers(nextTeachers);
        }
        const nextRequests = passwordResetRequests.map(r => r.id === request.id ? { ...r, status:"approved" } : r);
        updatePasswordResetRequest(request.id, { status:"approved" });
        await saveDatabaseNow({ teachers: nextTeachers, passwordResetRequests: nextRequests },"reset password user");
        if (syncAuthSnapshotNow) {
          try {
            await syncAuthSnapshotNow(adminUser, nextTeachers,"sinkronisasi reset password");
          } catch (e) {
            console.error("Auth sync failed:", e);
          }
        }
        success = true;
      }
    } else if (request.role ==="karyawan") {
      const targetStaff = (staffs || []).find(s => sameText(s.code, request.username) || sameText(s.staff_code, request.username) || sameText(s.name, request.username));
      if (targetStaff) {
        targetName = targetStaff.name;
        const nextStaffs = (staffs || []).map(s => (sameText(s.code, targetStaff.code) || sameText(s.staff_code, targetStaff.staff_code)) ? { ...s, password: nextPasswordHash } : s);
        if (allProps.setStaffs) {
          allProps.setStaffs(nextStaffs);
        }
        const nextRequests = passwordResetRequests.map(r => r.id === request.id ? { ...r, status:"approved" } : r);
        updatePasswordResetRequest(request.id, { status:"approved" });
        await saveDatabaseNow({ staffs: nextStaffs, passwordResetRequests: nextRequests },"reset password karyawan");
        success = true;
      }
    } else if (request.role ==="siswa") {
      const targetStudent = allProps.students?.find(s => sameText(s.nis, request.username) || sameText(s.code, request.username) || sameText(s.name, request.username));
      if (targetStudent) {
        targetName = targetStudent.name;
        const nextStudents = allProps.students.map(s => s.id === targetStudent.id ? { ...s, password: nextPasswordHash } : s);
        if (allProps.setStudents) {
          allProps.setStudents(nextStudents);
        }
        const nextRequests = passwordResetRequests.map(r => r.id === request.id ? { ...r, status:"approved" } : r);
        updatePasswordResetRequest(request.id, { status:"approved" });
        await saveDatabaseNow({ students: nextStudents, passwordResetRequests: nextRequests },"reset password siswa");
        success = true;
      }
    }

    if (success) {
      const whatsappMsg = `Halo ${targetName || request.username}, permintaan reset sandi Anda disetujui. Sandi baru Anda: ${newPassword}. Silakan gunakan sandi ini untuk masuk.`;
      
      const { isFiturAktif } = useFiturStore.getState();
      const isWaAutoPassword = isFiturAktif('wa_auto_password') ?? true;

      let waStatus ="dimatikan";
      if (isWaAutoPassword) {
        waStatus ="proses";
        try {
          const res = await fetch("/api/whatsapp/send", {
            method:"POST",
            headers: {"Content-Type":"application/json","Authorization": `Bearer ${currentUser?.authToken}`
            },
            body: JSON.stringify({
              phone: request.whatsapp,
              recipient_name: targetName || request.username,
              message: whatsappMsg,
              trigger_type:"reset_password_admin"
            })
          });
          const waData = await res.json();
          waStatus = waData.ok ?"sent" :"failed";
        } catch (err) {
          console.error("Failed to send WhatsApp:", err);
          waStatus ="failed";
        }
      }

      if (showNotification) {
        showNotification(`Password baru (${newPassword}) untuk ${targetName || request.username} telah di-set${isWaAutoPassword ? ` & terkirim ke WhatsApp: ${request.whatsapp} (Status: ${waStatus})` :''}`,"success");
      }
    } else {
      if (showNotification) {
        showNotification(`User dengan identitas ${request.username} tidak ditemukan!`,"warning");
      }
    }
    setProcessingIds(prev => { const next = new Set(prev); next.delete(request.id); return next; });
  };

        const userSearch = normalizeText(searchTerm);
        const allUsers = [
          ...teachers.map(t => ({ ...t, _source: 'teachers' })),
          ...(staffs || []).map(s => ({ ...s, _source: 'staffs' }))
        ];
        const userRows = allUsers
          .filter((user) => {
            if (!userSearch) return true;
            const roleInfo = getRoleOption(user.role);
            const divisionInfo = getWakaDivisionOption(user.division);
            return normalizeText(
              `${user.code ||""} ${user.name ||""} ${user.type ||""} ${roleInfo?.label || ''} ${user.role ||"guru"} ${divisionInfo?.label || ''} ${user.division ||""} ${user.preferredMajor ||""} ${user.preferredGrade ||""}`,
            ).includes(userSearch);
          })
          .sort((a, b) =>
            String(a.name ||"").localeCompare(String(b.name ||""),"id", {
              sensitivity:"base"
            }),
          );
        const roleCounts = allUsers.reduce(
          (acc, user) => {
            const role = normalizeUserRole(user.role);
            acc[role] = (acc[role] || 0) + 1;
            return acc;
          },
          { guru: 0, kepsek: 0, waka: 0, admin: 0, tu: 0, karyawan: 0 },
        );
        const wakaCounts = allUsers.reduce((acc, user) => {
          if (normalizeUserRole(user.role) !=="waka") return acc;
          const division = user.division || WAKA_DIVISION_OPTIONS[0].value;
          acc[division] = (acc[division] || 0) + 1;
          return acc;
        }, {});
        const getRoleBadgeClass = (role) =>
          getRoleOption(role).badgeClass ||"bg-slate-50 text-slate-700 border-slate-200";
        const getRoleLabel = (role) => getRoleOption(role).label ||"Unknown";

        return (
          <div className="flex flex-col gap-5  w-full animate-in fade-in duration-300 relative z-10">
            <PageHeader
              title="Pengaturan Akun Pengguna"
              description="Kelola akun pengguna, reset password, dan ubah role."
              icon={Users}
              tabs={[
                { id:"hak_akses", label:"Hak Akses & Role", icon: ShieldCheck },
                { id:"pengaturanuser", label:"Akun Pengguna", icon: Key },
                { id:"audit_log", label:"Audit Log & Aktivitas", icon: History }
              ]}
              activeTab={activeTab}
              onTabChange={setActiveTab}
            />

            {/* Permintaan Reset Password */}
            {pendingRequests && pendingRequests.length > 0 && (
              <div className="bg-white border-none rounded-[var(--ui-radius-card)] shadow-sm p-6">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-[var(--ui-radius-small)] bg-amber-50 text-amber-500 flex items-center justify-center">
                      <Lock size={20} />
                    </div>
                    <div>
                      <h3 className="font-black text-slate-800 text-base tracking-tight">Permintaan Reset Sandi</h3>
                      <p className="text-[11px] font-bold text-slate-400 mt-0.5">Daftar permintaan lupa password dari Guru, Karyawan, dan Siswa</p>
                    </div>
                  </div>
                  <span className="bg-amber-100 text-amber-800 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-[var(--ui-radius-pill)] shadow-xs">
                    {pendingRequests.length} Pending
                  </span>
                </div>
                
                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-slate-50/70 border-b border-slate-200/80 sticky top-0 z-10">
                      <tr>
                        <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">User / Identitas</th>
                        <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Role</th>
                        <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">No. WhatsApp</th>
                        <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Waktu Pengajuan</th>
                        <th className="px-6 py-3 text-right text-[10px] font-bold text-slate-400 uppercase tracking-widest">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {pendingRequests.map((req) => (
                        <tr key={req.id} className="hover:bg-slate-50/50 transition-colors group">
                          <td className="px-6 py-3">
                            <span className="font-extrabold text-slate-800 block">{req.username}</span>
                          </td>
                          <td className="px-6 py-3">
                            <span className="px-2 py-0.5 rounded-[var(--ui-radius-small)] bg-slate-100 text-slate-600 text-[10px] font-bold uppercase tracking-wider">
                              {req.role}
                            </span>
                          </td>
                          <td className="px-6 py-3 font-semibold text-slate-750">{req.whatsapp}</td>
                          <td className="px-6 py-3 text-xs text-slate-500 font-medium font-mono">
                            {new Date(req.requestedAt).toLocaleString("id-ID")}
                          </td>
                          <td className="px-6 py-3 text-right">
                            <div className="flex justify-end gap-2">
                              <Button variant="outline"
                                onClick={() =>handleApproveReset(req)}
                                disabled={processingIds.has(req.id)}
                                className={`cursor-not-allowed" cursor-pointer"`}
                              >
                                {processingIds.has(req.id) ?"Memproses..." :"ACC & Kirim WA"}</Button>
                              <Button variant="outline"
                                onClick={async () =>{
                                  const nextRequests = passwordResetRequests.map(r => r.id === req.id ? { ...r, status:"rejected" } : r);
                                  updatePasswordResetRequest(req.id, { status:"rejected" });
                                  await saveDatabaseNow({ passwordResetRequests: nextRequests },"tolak reset password");
                                }}
                                className="cursor-pointer"
                              >
                                Tolak</Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            {/* Compact Top Summary */}
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-[var(--ui-radius-small)] p-4 text-white shadow-sm flex-1 flex items-center justify-between overflow-hidden relative">
                <div className="absolute right-0 top-1/2 -translate-y-1/2 opacity-10 pointer-events-none">
                  <Lock size={80} className="-mr-4" />
                </div>
                <div className="flex items-center gap-4 relative z-10">
                  <div className="w-12 h-12 rounded-full bg-white/10 border border-white/20 flex items-center justify-center shrink-0">
                    <Shield size={20} className="text-white/80" />
                  </div>
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-white/60 mb-0.5">
                      SuperAdmin
                    </div>
                    <h3 className="text-base md:text-lg font-black leading-tight">
                      {adminUser?.name ||"Administrator"}
                    </h3>
                    <p className="text-xs text-white/70 font-medium">
                      {adminUser?.username ||"admin"}
                    </p>
                  </div>
                </div>
                <Button variant="outline"
                  onClick={() =>openModal("admin","edit", adminUser)}
                  className="relative z-10 shrink-0"
                >
                  <Edit2 size={14} className="md:mr-1.5 inline" />{""}
                  <span className="hidden md:inline">Edit Profil</span></Button>
              </div>

              <div className="bg-white border-none rounded-[var(--ui-radius-card)] shadow-sm p-2 flex-1 flex items-center justify-around overflow-x-auto custom-scrollbar">
                {ROLE_OPTIONS.map((item) => (
                  <div
                    key={item.value}
                    className="flex items-center gap-3 px-4 py-2 hover:bg-slate-50 rounded-[var(--ui-radius-small)] transition-colors min-w-fit"
                  >
                    <div
                      className={`w-10 h-10 rounded-[var(--ui-radius-small)] flex items-center justify-center shrink-0 ${getRoleBadgeClass(item.value)}`}
                    >
                      <item.icon size={18} />
                    </div>
                    <div>
                      <div className="text-lg font-black text-slate-800 leading-none">
                        {roleCounts[item.value] || 0}
                      </div>
                      <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">
                        {item.shortLabel}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* User Datatable */}
            <section className="bg-white border-none rounded-[var(--ui-radius-small)] shadow-sm overflow-hidden flex flex-col min-h-[400px]">
              <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50">
                <div>
                  <h3 className="text-lg font-black text-slate-800 tracking-tight">
                    Manajemen Akses User
                  </h3>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Kelola hak akses dan peran {userRows.length} guru/staff.
                  </p>
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto">
                  <div className="relative w-full md:w-64">
                    <Search
                      size={14}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      type="text"
                      placeholder="Cari user..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-white border-none rounded-[var(--ui-radius-small)] text-xs focus:outline-none focus:border-[var(--ui-primary)] focus:ring-4 focus:ring-[var(--ui-primary)]/10 transition-all font-bold shadow-sm"
                    />
                  </div>

                  <Button variant="outline"
                    onClick={() =>openModal("guru","add")}
                    className="shrink-0 flex items-center gap-1.5"
                  >
                    <Plus size={14} /> Tambah User</Button>
                </div>
              </div>

              <div className="overflow-x-auto custom-scrollbar flex-1">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest w-24">
                        Kode
                      </th>
                      <th className="px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Nama Lengkap
                      </th>
                      <th className="px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Role / Hak Akses
                      </th>
                      <th className="px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">
                        Status
                      </th>
                      <th className="px-5 py-3 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest w-24">
                        Aksi
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {userRows.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-5 py-16 text-center">
                          <div className="flex flex-col items-center justify-center text-slate-400">
                            <Search size={32} className="mb-3 opacity-50" />
                            <span className="text-sm font-bold">
                              Tidak ada user yang cocok dengan pencarian"
                              {searchTerm}"
                            </span>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      userRows.map((item) => {
                        const role = normalizeUserRole(item.role);
                        const roleInfo = getRoleOption(role);
                        const division =
                          item.division || WAKA_DIVISION_OPTIONS[0].value;
                        const divisionInfo = getWakaDivisionOption(
                          division,
                          appSettings,
                        );
                        const isCurrentSessionTeacher =
                          currentUser?.code &&
                          sameText(currentUser.code, item.code);
                        return (
                          <tr
                            key={item.code}
                            className="hover:bg-slate-50/80 transition-colors group"
                          >
                            <td className="px-5 py-3.5">
                              <span className="inline-flex items-center justify-center w-8 h-8 rounded-[var(--ui-radius-small)] bg-slate-100 text-slate-600 font-black text-xs border-none">
                                {item.code}
                              </span>
                            </td>
                            <td className="px-5 py-3.5">
                              <div className="font-bold text-slate-800 text-sm">
                                {item.name}
                              </div>
                              {item.type !=="Umum" && (
                                <div className="text-[10px] font-black text-[var(--ui-primary)] mt-0.5">
                                  {item.type}
                                </div>
                              )}
                            </td>
                            <td className="px-5 py-3.5">
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-1.5">
                                  <span
                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-[var(--ui-radius-small)] border text-[9px] font-black uppercase tracking-widest ${getRoleBadgeClass(role)}`}
                                  >
                                    <Shield size={10} /> {roleInfo.shortLabel}
                                  </span>
                                  {role ==="waka" && (
                                    <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-[var(--ui-radius-small)] border-none">
                                      {divisionInfo.label}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-3.5 text-center">
                              {isCurrentSessionTeacher ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[var(--ui-radius-small)] bg-amber-50 text-amber-600 border border-amber-200 text-[9px] font-black uppercase tracking-widest">
                                  <Activity size={10} /> Sesi Anda
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[var(--ui-radius-small)] bg-emerald-50 text-emerald-600 border border-emerald-200 text-[9px] font-black uppercase tracking-widest">
                                  Aktif
                                </span>
                              )}
                            </td>
                            <td className="px-5 py-3.5">
                              <div className="flex justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button variant="outline"
                                  onClick={() => openModal(item._source === 'staffs' ? 'karyawan' : 'guru', "edit", item)}
                                  className="flex items-center justify-center cursor-pointer"
                                  title="Edit Hak Akses"
                                >
                                  <Edit2 size={14} /></Button>
                                <Button variant="outline"
                                  onClick={() => handleDelete(item._source === 'staffs' ? 'Karyawan' : 'guru', item.code)}
                                  disabled={!!isCurrentSessionTeacher}
                                  className={`flex items-center justify-center ${isCurrentSessionTeacher ?"text-slate-300 bg-slate-50 border-slate-100 cursor-not-allowed" :"text-slate-400 hover:text-rose-600 bg-white hover:bg-red-50 hover:border-red-200 border-slate-200 cursor-pointer"}`}
                                  title={
                                    isCurrentSessionTeacher
                                      ?"Tidak bisa menghapus akun sendiri"
                                      :"Hapus User"
                                  }
                                >
                                  <Trash2 size={14} /></Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        );
}
