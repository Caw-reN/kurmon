import { Button } from '../../../components/ui.jsx';
import { PageHeader } from '../../../components/monitoring/ui/index.js';
import { MessageSquare, Send, LayoutTemplate, Pin, Calendar, User, EyeOff, Eye, Trash2, Edit2 } from'lucide-react';
import { UISelect } from'../../../components/ui.jsx';


export default function TabPesan(props) {
  const { getTabPermissionLevel, activeUserRole, isLeadershipRole, currentUser, dashboardMessageForm, setDashboardMessageForm, DASHBOARD_MESSAGE_TARGETS, DASHBOARD_MESSAGE_PRIORITIES, handleSaveDashboardMessage, dashboardMessages, handleToggleDashboardMessageSafe, handleRemoveDashboardMessageSafe, updateDashboardMessage } = props;
  const { ...allProps } = props;
  // Destructure specific props as needed in the component

        const permLevel = getTabPermissionLevel("pesan");
        const canEdit = permLevel ==="edit" || (permLevel ==="otomatis" && activeUserRole !=="kepsek");

        return (
          <div className="flex flex-col gap-6 w-full animate-in fade-in duration-300">
            <PageHeader
              title="Pengumuman & Pesan Dashboard"
              icon={MessageSquare}
              description="Buat dan kelola pengumuman resmi dari sekolah yang tayang langsung di dashboard seluruh pengguna."
            />
            <div
              className={`grid grid-cols-1 ${canEdit ?"lg:grid-cols-[380px_1fr] xl:grid-cols-[420px_1fr]" :"lg:grid-cols-1"} gap-6 w-full`}
            >
            {/* Form Buat Pesan */}
            {canEdit && (
              <section className="ui-card h-fit flex flex-col">
                <div className="p-4 md:p-5 border-b border-slate-100 bg-gradient-to-b from-slate-50/50 to-white">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-[var(--ui-radius-small)] bg-[var(--ui-primary)]/10 text-[var(--ui-primary)] flex items-center justify-center shrink-0">
                      <MessageSquare size={18} />
                    </div>
                    <div>
                      <h2 className="text-lg md:text-xl font-bold text-slate-800 tracking-tight">
                        Buat Pengumuman
                      </h2>
                      <p className="text-[11px] md:text-xs text-slate-500 font-medium">
                        Pesan akan tayang di dashboard pengguna.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-4 md:p-5 space-y-4">
                  <div>
                    <label className="text-xs font-bold text-slate-700 ml-0.5 mb-1.5 block">
                      Judul Pesan <span className="text-rose-500">*</span>
                    </label>
                    <input
                      value={dashboardMessageForm.title}
                      onChange={(e) =>
                        setDashboardMessageForm({
                          ...dashboardMessageForm,
                          title: e.target.value
                        })
                      }
                      className="w-full border border-slate-200 bg-slate-50 px-3 py-2.5 rounded-[var(--ui-radius-small)] text-sm font-semibold focus:bg-white focus:border-[var(--ui-primary)] focus:ring-2 focus:ring-[var(--ui-primary)]/20 transition-all outline-none"
                      placeholder="Contoh: Rapat evaluasi pekan ini"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 ml-0.5 mb-1.5 block">
                      Isi Pesan <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      value={dashboardMessageForm.body}
                      onChange={(e) =>
                        setDashboardMessageForm({
                          ...dashboardMessageForm,
                          body: e.target.value
                        })
                      }
                      className="w-full border border-slate-200 bg-slate-50 px-3 py-2.5 rounded-[var(--ui-radius-small)] text-sm font-semibold focus:bg-white focus:border-[var(--ui-primary)] focus:ring-2 focus:ring-[var(--ui-primary)]/20 min-h-[100px] transition-all resize-y outline-none"
                      placeholder="Tulis pengumuman singkat dan jelas..."
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 md:gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-700 ml-0.5 mb-1.5 block">
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
                        className="w-full border border-slate-200 bg-slate-50 px-3 py-2.5 rounded-[var(--ui-radius-small)] text-xs font-bold focus:bg-white focus:border-[var(--ui-primary)] outline-none"
                      >
                        {DASHBOARD_MESSAGE_TARGETS.map((target) => (
                          <option key={target.value} value={target.value}>
                            {target.label}
                          </option>
                        ))}
                      </UISelect>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700 ml-0.5 mb-1.5 block">
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
                        className="w-full border border-slate-200 bg-slate-50 px-3 py-2.5 rounded-[var(--ui-radius-small)] text-xs font-bold focus:bg-white focus:border-[var(--ui-primary)] outline-none"
                      >
                        {DASHBOARD_MESSAGE_PRIORITIES.map((priority) => (
                          <option key={priority.value} value={priority.value}>
                            {priority.label}
                          </option>
                        ))}
                      </UISelect>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 md:gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-700 ml-0.5 mb-1.5 block">
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
                        className="w-full border border-slate-200 bg-slate-50 px-3 py-2.5 rounded-[var(--ui-radius-small)] text-xs font-bold focus:bg-white focus:border-[var(--ui-primary)] focus:ring-2 focus:ring-[var(--ui-primary)]/20 transition-all outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700 ml-0.5 mb-1.5 block">
                        Selesai Tampil
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
                        className="w-full border border-slate-200 bg-slate-50 px-3 py-2.5 rounded-[var(--ui-radius-small)] text-xs font-bold focus:bg-white focus:border-[var(--ui-primary)] focus:ring-2 focus:ring-[var(--ui-primary)]/20 transition-all outline-none"
                      />
                    </div>
                  </div>

                  <label className="flex items-center justify-between gap-3 bg-slate-50/50 border border-slate-200 rounded-[var(--ui-radius-small)] px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors mt-2">
                    <span className="text-xs font-bold text-slate-700">
                      Sematkan (Pin) di Dashboard
                    </span>
                    <div className="relative inline-block w-9 h-5">
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
                      <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[var(--ui-primary)]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--ui-primary)]"></div>
                    </div>
                  </label>

                  <div className="pt-4">
                    <button
                      type="button"
                      onClick={handleSaveDashboardMessage}
                      className="w-full flex justify-center items-center gap-2 px-4 py-3 rounded-[var(--ui-radius-small)] text-white font-bold text-sm tracking-wide shadow-sm hover:opacity-90 hover:-translate-y-0.5 transition-all outline-none"
                      style={{ backgroundColor: 'var(--ui-primary)' }}
                    >
                      <Send size={16} /> Publikasikan Pengumuman
                    </button>
                  </div>
                </div>
              </section>
            )}

            {/* Daftar Pesan */}
            <section className="ui-card flex flex-col h-full min-h-[400px]">
              <div className="p-4 md:p-5 border-b border-slate-100 flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg md:text-xl font-bold text-slate-800 tracking-tight">
                    Daftar Pengumuman
                  </h2>
                  <p className="text-[11px] md:text-xs text-slate-500 font-medium">
                    {dashboardMessages.length} pesan tersimpan dalam sistem.
                  </p>
                </div>
                <div className="w-9 h-9 md:w-10 md:h-10 rounded-[var(--ui-radius-small)] bg-slate-50 border flex items-center justify-center text-slate-400 shrink-0">
                  <LayoutTemplate size={16} />
                </div>
              </div>

              <div className="p-4 md:p-5 space-y-3 md:space-y-4 flex-1 bg-slate-50/30">
                {dashboardMessages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center py-12 px-6 bg-white border border-dashed border-slate-300 rounded-[var(--ui-radius-small)]">
                    <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mb-4">
                      <MessageSquare size={24} />
                    </div>
                    <h3 className="text-base md:text-lg font-bold text-slate-700">
                      Belum Ada Pengumuman
                    </h3>
                    <p className="text-[11px] md:text-sm font-medium text-slate-500 mt-2 max-w-sm">
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
                        className={`relative border bg-white rounded-[var(--ui-radius-card)] ${isActive ?"border-slate-200 shadow-sm" :"border-slate-100 opacity-60 bg-slate-50/50"} p-4 md:p-5 transition-all group`}
                      >
                        {message.pinned && isActive && (
                          <div 
                            className="absolute -top-2 -right-2 w-7 h-7 bg-amber-500 hover:bg-amber-600 text-white rounded-full flex items-center justify-center shadow-sm z-10 cursor-pointer transition-colors" 
                            title="Disematkan (Pinned). Klik untuk melepaskan sematan."
                            onClick={() => {
                              if (updateDashboardMessage) {
                                updateDashboardMessage(message.id, { ...message, pinned: false });
                                const nextMsgs = dashboardMessages.map(m => m.id === message.id ? { ...m, pinned: false } : m);
                                if (props.saveDatabaseNow) {
                                  props.saveDatabaseNow({ dashboardMessages: nextMsgs }, "melepas sematan pesan dashboard");
                                }
                              }
                            }}
                          >
                            <Pin size={13} fill="currentColor" />
                          </div>
                        )}

                        <div className="flex flex-col sm:flex-row gap-4 md:gap-5">
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5 md:gap-2 mb-2.5">
                              <span
                                className={`px-2 py-0.5 rounded-[var(--ui-radius-small)] border text-[10px] font-bold tracking-wide ${priority.className}`}
                              >
                                {priority.label}
                              </span>
                              <span className="px-2 py-0.5 rounded-[var(--ui-radius-small)] bg-slate-100 text-slate-600 text-[10px] font-bold border border-slate-200 tracking-wide">
                                Untuk: {DASHBOARD_MESSAGE_TARGETS.find(
                                  (t) => t.value === message.target,
                                )?.label ||"Semua"}
                              </span>
                              {!isActive && (
                                <span className="px-2 py-0.5 rounded-[var(--ui-radius-small)] bg-slate-200 text-slate-600 text-[10px] font-bold uppercase border border-slate-300 tracking-wide">
                                  Nonaktif
                                </span>
                              )}
                            </div>

                            <h3 className="text-base md:text-lg font-bold text-slate-800 leading-snug">
                              {message.title}
                            </h3>
                            <p className="text-[13px] md:text-sm text-slate-600 mt-1.5 leading-relaxed whitespace-pre-wrap break-words">
                              {message.body}
                            </p>

                            <div className="flex flex-wrap items-center gap-3 md:gap-4 mt-3 pt-3 border-t border-slate-100">
                              <div className="flex items-center gap-1.5 text-[10px] md:text-[11px] font-semibold text-slate-500">
                                <Calendar size={12} />
                                <span>{message.startDate ||"Sekarang"}</span>
                                <span className="text-slate-300">&rarr;</span>
                                <span>{message.endDate ||"Seterusnya"}</span>
                              </div>
                              <div className="flex items-center gap-1.5 text-[10px] md:text-[11px] font-semibold text-slate-500">
                                <User size={12} />
                                <span>Oleh {message.createdBy ||"Sistem"}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-row sm:flex-col gap-2 shrink-0 sm:w-[130px] sm:border-l sm:border-slate-100 sm:pl-4 justify-start pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                            {canEdit && (
                              <>
                                <Button variant="outline" size="sm"
                                  onClick={() => {
                                    setDashboardMessageForm({
                                      id: message.id,
                                      title: message.title,
                                      body: message.body,
                                      target: message.target || "semua",
                                      priority: message.priority || "normal",
                                      startDate: message.startDate || "",
                                      endDate: message.endDate || "",
                                      pinned: !!message.pinned
                                    });
                                    // scroll to top
                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                  }}
                                  className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 h-8 text-[11px] text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 border-indigo-100 hover:border-indigo-200"
                                >
                                  <Edit2 size={13} />
                                  <span>Edit</span>
                                </Button>
                                <Button variant="outline" size="sm"
                                  onClick={() =>handleToggleDashboardMessageSafe(
                                      message.id,
                                      !isActive,
                                    )
                                  }
                                  className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 h-8 text-[11px] ${isActive ?"bg-white border-slate-200 text-slate-600 hover:text-amber-600 hover:border-amber-200 hover:bg-amber-50" :"bg-[var(--ui-primary)] text-white border-transparent shadow-sm"}`}
                                >
                                  {isActive ? (
                                    <>
                                      <EyeOff size={14} /> Sembunyikan
                                    </>
                                  ) : (
                                    <>
                                      <Eye size={14} /> Tampilkan
                                    </>
                                  )}
                                </Button>
                                <Button variant="outline" size="sm"
                                  onClick={() =>handleRemoveDashboardMessageSafe(message.id)}
                                  className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 h-8 text-[11px] text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-100 hover:border-rose-200"
                                >
                                  <Trash2 size={13} />
                                  <span>Hapus</span>
                                </Button>
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
        </div>
      );
}
