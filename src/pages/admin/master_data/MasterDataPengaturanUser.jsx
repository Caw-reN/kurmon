import { Button } from '../../../components/ui.jsx';
import { memo } from 'react';
import { UserCog } from 'lucide-react';
import { Lock, Shield, Edit2, ShieldCheck, Search, Plus, Activity, Trash2 } from 'lucide-react';
import { PageHeader } from '../../../components/monitoring/ui/index.js';
import { getSubroleOption } from '../../../utils/constants.js';


const MasterDataPengaturanUser = memo(function MasterDataPengaturanUser({
  adminUsers,
  isSuperAdminRole,
  activeUserRole,
  openModal,
  handleDeleteUser,
  normalizeText,
  searchTerm,
  teachers,
  getRoleOption,
  getWakaDivisionOption,
  normalizeUserRole,
  WAKA_DIVISION_OPTIONS,
  adminUser,
  ROLE_OPTIONS,
  setSearchTerm,
  appSettings,
  currentUser,
  sameText,
  handleDelete
}) {
        const userSearch = normalizeText(searchTerm);
        const userRows = teachers
          .filter((teacher) => {
            if (!userSearch) return true;
            const roleInfo = getRoleOption(teacher.role);
            const divisionInfo = getWakaDivisionOption(teacher.division);
            return normalizeText(`${teacher.code ||""} ${teacher.name ||""} ${teacher.type ||""} ${roleInfo.label} ${teacher.role ||"guru"} ${divisionInfo.label} ${teacher.division ||""} ${teacher.preferredMajor ||""} ${teacher.preferredGrade ||""}`).includes(userSearch);
          })
          .sort((a, b) => String(a.name ||"").localeCompare(String(b.name ||""),"id", { sensitivity:"base" }));
        const roleCounts = teachers.reduce((acc, teacher) => {
          const role = normalizeUserRole(teacher.role);
          acc[role] = (acc[role] || 0) + 1;
          return acc;
        }, { guru: 0, kepsek: 0, waka: 0, admin: 0 });
        const wakaCounts = teachers.reduce((acc, teacher) => {
          if (normalizeUserRole(teacher.role) !=="waka") return acc;
          const division = teacher.division || WAKA_DIVISION_OPTIONS[0].value;
          acc[division] = (acc[division] || 0) + 1;
          return acc;
        }, {});
        const getRoleBadgeClass = (role) => getRoleOption(role).badgeClass ||"bg-slate-50 text-slate-700 border-slate-200";
        const getRoleLabel = (role) => getRoleOption(role).label ||"Unknown";

        return (
          <div className="flex flex-col gap-4 w-full animate-in fade-in duration-300 relative">
            <PageHeader
              title="Manajemen Hak Akses & User"
              icon={UserCog}
              description="Kelola akun pengguna, peran, dan hak akses dalam sistem."
            />
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
                    <div className="text-[10px] font-black uppercase tracking-widest text-white/60 mb-0.5">SuperAdmin</div>
                    <h3 className="text-base md:text-lg font-black leading-tight">{adminUser?.name ||"Administrator"}</h3>
                    <p className="text-xs text-white/70 font-medium">{adminUser?.username ||"admin"}</p>
                  </div>
                </div>
                <Button variant="outline" onClick={() =>openModal("admin","edit", adminUser)} className="relative z-10 shrink-0">
                  <Edit2 size={14} className="md:mr-1.5 inline" /> <span className="hidden md:inline">Edit Profil</span></Button>
              </div>

              <div className="ui-card p-2 flex-1 flex items-center justify-around overflow-x-auto custom-scrollbar">
                {ROLE_OPTIONS.map((item) => (
                  <div key={item.value} className="flex items-center gap-3 px-4 py-2 hover:bg-slate-50 rounded-[var(--ui-radius-small)] transition-colors min-w-fit">
                    <div className={`w-10 h-10 rounded-[var(--ui-radius-small)] flex items-center justify-center shrink-0 ${getRoleBadgeClass(item.value)}`}>
                      <item.icon size={18} />
                    </div>
                    <div>
                      <div className="text-lg font-black text-slate-800 leading-none">{roleCounts[item.value] || 0}</div>
                      <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">{item.shortLabel}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>


            {/* User Datatable */}
            <section className="ui-card overflow-hidden flex flex-col min-h-[400px]">
              <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="text-[var(--ui-primary)]" size={18} />
                  <span className="font-bold text-slate-700 text-sm">{userRows.length} guru/staff</span>
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto">
                  <div className="relative w-full md:w-64">
                    <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Cari user..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-white border-none rounded-[var(--ui-radius-small)] text-xs focus:outline-none focus:border-[var(--ui-primary)] focus:ring-4 focus:ring-[var(--ui-primary)]/10 transition-all font-bold shadow-sm"
                    />
                  </div>
                  
                  <Button variant="outline" onClick={() =>openModal("guru","add")} className="shrink-0 flex items-center gap-1.5">
                    <Plus size={14} /> Tambah User</Button>
                </div>
              </div>

              <div className="overflow-x-auto custom-scrollbar flex-1">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest w-24">Kode</th>
                      <th className="px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Nama Lengkap</th>
                      <th className="px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Role / Hak Akses</th>
                      <th className="px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                      <th className="px-5 py-3 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest w-24">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {userRows.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-5 py-16 text-center">
                          <div className="flex flex-col items-center justify-center text-slate-400">
                            <Search size={32} className="mb-3 opacity-50" />
                            <span className="text-sm font-bold">Tidak ada user yang cocok dengan pencarian"{searchTerm}"</span>
                          </div>
                        </td>
                      </tr>
                    ) : userRows.map((item) => {
                      const role = normalizeUserRole(item.role);
                      const roleInfo = getRoleOption(role);
                      const division = item.division || WAKA_DIVISION_OPTIONS[0].value;
                      const divisionInfo = getWakaDivisionOption(division, appSettings);
                      const isCurrentSessionTeacher = currentUser?.code && sameText(currentUser.code, item.code);
                      return (
                        <tr key={item.code} className="hover:bg-slate-50/80 transition-colors group">
                          <td className="px-5 py-3.5">
                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-[var(--ui-radius-small)] bg-slate-100 text-slate-600 font-black text-xs border-none">
                              {item.code}
                            </span>
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="font-bold text-slate-800 text-sm">{item.name}</div>
                            {item.type !=="Umum" && (
                              <div className="text-[10px] font-black text-[var(--ui-primary)] mt-0.5">{item.type}</div>
                            )}
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-[var(--ui-radius-small)] border text-[9px] font-black uppercase tracking-widest ${getRoleBadgeClass(role)}`}>
                                  <Shield size={10} /> {roleInfo.shortLabel}
                                </span>
                                {role === "waka" && (
                                  <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-[var(--ui-radius-small)] border-none">
                                    {divisionInfo.label}
                                  </span>
                                )}
                                {role === "guru" && item.subrole && (() => {
                                  const sub = getSubroleOption(item.subrole);
                                  return sub?.label && sub.label !== "— Guru Biasa (tanpa jabatan)" ? (
                                    <span className="text-[9px] font-black bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-[var(--ui-radius-small)]">
                                      {sub.label}
                                    </span>
                                  ) : null;
                                })()}
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
                              <Button variant="outline" onClick={() =>openModal("guru","edit", item)} className="flex items-center justify-center cursor-pointer" title="Edit Hak Akses">
                                <Edit2 size={14} /></Button>
                              <Button variant="outline"
                                onClick={() =>handleDelete("guru", item.code)}
                                disabled={!!isCurrentSessionTeacher}
                                className={`flex items-center justify-center ${isCurrentSessionTeacher ?"text-slate-300 bg-slate-50 border-slate-100 cursor-not-allowed" :"text-slate-400 hover:text-red-600 bg-white hover:bg-red-50 hover:border-red-200 border-slate-200 cursor-pointer"}`}
                                title={isCurrentSessionTeacher ?"Tidak bisa menghapus akun sendiri" :"Hapus User"}
                              >
                                <Trash2 size={14} /></Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        );

});

export default MasterDataPengaturanUser;
