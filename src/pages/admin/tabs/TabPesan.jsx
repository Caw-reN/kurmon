import { Button } from '../../../components/ui.jsx';

import { MessageSquare, Send, LayoutTemplate, Pin, Calendar, User, EyeOff, Eye, Trash2 } from'lucide-react';
import { UISelect } from'../../../components/ui.jsx';


export default function TabPesan(props) {
  const { getTabPermissionLevel, activeUserRole, isLeadershipRole, currentUser, dashboardMessageForm, setDashboardMessageForm, DASHBOARD_MESSAGE_TARGETS, DASHBOARD_MESSAGE_PRIORITIES, handleSaveDashboardMessage, dashboardMessages, handleToggleDashboardMessageSafe, handleRemoveDashboardMessageSafe } = props;
  const { ...allProps } = props;
  // Destructure specific props as needed in the component

        const permLevel = getTabPermissionLevel("pesan");
        const canEdit = permLevel ==="edit" || (permLevel ==="otomatis" && activeUserRole !=="kepsek");
        if (!isLeadershipRole(currentUser?.role)) {
          return (
            <div className="ui-card p-6 text-center">
              <h3 className="text-lg font-black text-slate-800">
                Akses tidak tersedia
              </h3>
              <p className="text-sm font-medium text-slate-500 mt-1">
                Pesan dashboard dikelola oleh SuperAdmin, kepala sekolah, atau
                Waka.
              </p>
            </div>
          );
        }
        return (
          <div
            className={`grid grid-cols-1 ${canEdit ?"xl:grid-cols-[400px_1fr]" :"xl:grid-cols-1"} gap-6  w-full animate-in fade-in duration-300`}
          >
            {/* Form Buat Pesan */}
            {canEdit && (
              <section className="ui-card h-fit overflow-hidden flex flex-col">
                <div className="p-6 border-b border-slate-100 bg-gradient-to-b from-slate-50 to-white">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-[var(--ui-radius-small)] bg-[var(--ui-primary)]/10 text-[var(--ui-primary)] flex items-center justify-center shrink-0">
                      <MessageSquare size={18} />
                    </div>
                    <div>
                      <h2 className="text-xl font-black text-slate-800 tracking-tight">
                        Buat Pengumuman
                      </h2>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">
                        Pesan akan tayang di dashboard.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-6 space-y-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">
                      Judul Pesan
                    </label>
                    <input
                      value={dashboardMessageForm.title}
                      onChange={(e) =>
                        setDashboardMessageForm({
                          ...dashboardMessageForm,
                          title: e.target.value
                        })
                      }
                      className="w-full border-none bg-slate-50 p-3.5 rounded-[var(--ui-radius-card)] text-sm font-bold focus:bg-white focus:outline-[var(--ui-primary)] shadow-sm transition-all"
                      placeholder="Contoh: Rapat evaluasi pekan ini"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">
                      Isi Pesan
                    </label>
                    <textarea
                      value={dashboardMessageForm.body}
                      onChange={(e) =>
                        setDashboardMessageForm({
                          ...dashboardMessageForm,
                          body: e.target.value
                        })
                      }
                      className="w-full border-none bg-slate-50 p-3.5 rounded-[var(--ui-radius-card)] text-sm font-bold focus:bg-white focus:outline-[var(--ui-primary)] min-h-[100px] shadow-sm transition-all resize-none"
                      placeholder="Tulis pengumuman singkat dan jelas..."
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">
                        Target
                      </label>
                      <UISelect
                        value={dashboardMessageForm.target}
                        onChange={(e) =>
                          setDashboardMessageForm({
                            ...dashboardMessageForm,
                            target: e.target.value
                          })
                        }
                        className="w-full border-none bg-slate-50 p-3.5 rounded-[var(--ui-radius-card)] text-xs font-bold focus:bg-white focus:outline-[var(--ui-primary)] shadow-sm"
                      >
                        {DASHBOARD_MESSAGE_TARGETS.map((target) => (
                          <option key={target.value} value={target.value}>
                            {target.label}
                          </option>
                        ))}
                      </UISelect>
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">
                        Prioritas
                      </label>
                      <UISelect
                        value={dashboardMessageForm.priority}
                        onChange={(e) =>
                          setDashboardMessageForm({
                            ...dashboardMessageForm,
                            priority: e.target.value
                          })
                        }
                        className="w-full border-none bg-slate-50 p-3.5 rounded-[var(--ui-radius-card)] text-xs font-bold focus:bg-white focus:outline-[var(--ui-primary)] shadow-sm"
                      >
                        {DASHBOARD_MESSAGE_PRIORITIES.map((priority) => (
                          <option key={priority.value} value={priority.value}>
                            {priority.label}
                          </option>
                        ))}
                      </UISelect>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">
                        Mulai Tampil
                      </label>
                      <input
                        type="date"
                        value={dashboardMessageForm.startDate}
                        onChange={(e) =>
                          setDashboardMessageForm({
                            ...dashboardMessageForm,
                            startDate: e.target.value
                          })
                        }
                        className="w-full border-none bg-slate-50 p-3 rounded-[var(--ui-radius-card)] text-xs font-bold focus:bg-white focus:outline-[var(--ui-primary)] shadow-sm"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">
                        Selesai
                      </label>
                      <input
                        type="date"
                        value={dashboardMessageForm.endDate}
                        onChange={(e) =>
                          setDashboardMessageForm({
                            ...dashboardMessageForm,
                            endDate: e.target.value
                          })
                        }
                        className="w-full border-none bg-slate-50 p-3 rounded-[var(--ui-radius-card)] text-xs font-bold focus:bg-white focus:outline-[var(--ui-primary)] shadow-sm"
                      />
                    </div>
                  </div>

                  <label className="flex items-center justify-between gap-3 bg-white border-none rounded-[var(--ui-radius-card)] p-3 cursor-pointer hover:bg-slate-50 transition-colors shadow-sm">
                    <span className="text-xs font-black text-slate-700">
                      Pin di Dashboard
                    </span>
                    <div className="relative inline-block w-10 h-6">
                      <input
                        type="checkbox"
                        checked={!!dashboardMessageForm.pinned}
                        onChange={(e) =>
                          setDashboardMessageForm({
                            ...dashboardMessageForm,
                            pinned: e.target.checked
                          })
                        }
                        className="peer sr-only"
                      />
                      <div className="w-10 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[var(--ui-primary)]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--ui-primary)] shadow-inner"></div>
                    </div>
                  </label>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleSaveDashboardMessage}
                      className="w-full flex justify-center items-center gap-2"
                    >
                      <Send size={16} /> Publikasikan
                    </button>
                  </div>
                </div>
              </section>
            )}

            {/* Daftar Pesan */}
            <section className="ui-card flex flex-col min-h-[500px]">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-black text-slate-800 tracking-tight">
                    Daftar Pengumuman
                  </h2>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    {dashboardMessages.length} pesan tersimpan dalam sistem.
                  </p>
                </div>
                <div className="w-10 h-10 rounded-full bg-slate-50 border-none flex items-center justify-center text-slate-500 shrink-0">
                  <LayoutTemplate size={16} />
                </div>
              </div>

              <div className="p-6 space-y-4 flex-1 bg-slate-50/50">
                {dashboardMessages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center p-10 bg-white border border-dashed border-slate-300 rounded-[var(--ui-radius-small)]">
                    <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mb-4">
                      <MessageSquare size={24} />
                    </div>
                    <h3 className="text-lg font-black text-slate-700">
                      Belum Ada Pengumuman
                    </h3>
                    <p className="text-sm font-medium text-slate-500 mt-2 max-w-sm">
                      Buat pesan baru menggunakan form di sebelah kiri untuk
                      menampilkannya di dashboard pengguna.
                    </p>
                  </div>
                ) : (
                  dashboardMessages.map((message) => {
                    const priority =
                      DASHBOARD_MESSAGE_PRIORITIES.find(
                        (item) => item.value === message.priority,
                      ) || DASHBOARD_MESSAGE_PRIORITIES[0];
                    const isActive = message.isActive !== false;

                    return (
                      <article
                        key={message.id}
                        className={`relative ui-card ${isActive ?"" :"bg-slate-50/50 opacity-75"} p-5 transition-all hover:-translate-y-1 group`}
                      >
                        {message.pinned && isActive && (
                          <div className="absolute -top-2.5 -right-2.5 w-6 h-6 bg-amber-500 text-white rounded-full flex items-center justify-center shadow-sm rotate-12">
                            <Pin size={12} fill="currentColor" />
                          </div>
                        )}

                        <div className="flex flex-col md:flex-row gap-4">
                          <div className="flex-1">
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              <span
                                className={`px-2 py-1 rounded-[var(--ui-radius-small)] border text-[9px] font-black uppercase tracking-widest ${priority.className}`}
                              >
                                {priority.label}
                              </span>
                              <span className="px-2 py-1 rounded-[var(--ui-radius-small)] bg-slate-100 text-slate-600 text-[9px] font-black uppercase border-none tracking-widest">
                                Untuk:{""}
                                {DASHBOARD_MESSAGE_TARGETS.find(
                                  (t) => t.value === message.target,
                                )?.label ||"Semua"}
                              </span>
                              {!isActive && (
                                <span className="px-2 py-1 rounded-[var(--ui-radius-small)] bg-slate-200 text-slate-600 text-[9px] font-black uppercase border border-slate-300 tracking-widest">
                                  Nonaktif
                                </span>
                              )}
                            </div>

                            <h3 className="text-lg font-black text-slate-800 leading-tight">
                              {message.title}
                            </h3>
                            <p className="text-sm font-medium text-slate-600 mt-2 leading-relaxed whitespace-pre-wrap">
                              {message.body}
                            </p>

                            <div className="flex items-center gap-4 mt-4 pt-4 border-t border-slate-100">
                              <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500">
                                <Calendar size={12} />
                                {message.startDate ||"Sekarang"} &rarr;{""}
                                {message.endDate ||"Seterusnya"}
                              </div>
                              <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500">
                                <User size={12} />
                                Oleh {message.createdBy ||"Sistem"}
                              </div>
                            </div>
                          </div>

                          <div className="flex md:flex-col gap-2 shrink-0 md:border-l md:border-slate-100 md:pl-4 justify-start md:justify-center">
                            {canEdit && (
                              <>
                                <Button variant="outline"
                                  onClick={() =>handleToggleDashboardMessageSafe(
                                      message.id,
                                      !isActive,
                                    )
                                  }
                                  className={`flex items-center justify-center gap-2 ${isActive ?"bg-white border-slate-200 text-slate-600 hover:text-amber-600 hover:border-amber-200 hover:bg-amber-50" :"bg-[var(--ui-primary)] text-white border-transparent shadow-sm"}`}
                                >
                                  {isActive ? (
                                    <>
                                      <EyeOff size={14} /> Sembunyikan
                                    </>
                                  ) : (
                                    <>
                                      <Eye size={14} /> Tampilkan
                                    </>
                                  )}</Button>
                                <Button variant="outline"
                                  onClick={() =>handleRemoveDashboardMessageSafe(message.id)
                                  }
                                  className="flex items-center justify-center gap-2 md:px-3"
                                >
                                  <Trash2 size={14} className="md:mr-1" />{""}
                                  <span className="hidden md:inline">
                                    Hapus
                                  </span></Button>
                              </>
                            )}
                          </div>
                        </div>
                      </article>
                    );
                  })
                )}
              </div>
            </section>
          </div>
        );
}
