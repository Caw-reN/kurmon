import { memo } from'react';
import { RefreshCw, CalendarDays, CheckCircle2, Users, Calendar, Clock, BookOpen, SlidersHorizontal, LayoutTemplate, Settings } from'lucide-react';
import { Trash2, AlertCircle, Info, Printer, Search, Download } from'lucide-react';
import { PageHeader } from'../../../components/monitoring/ui/index.js';
import { CustomSelect } from'../../../components/CustomSelect.jsx';
import { Button } from'../../../components/ui.jsx';


const MasterDataGenerate = memo(function MasterDataGenerate({
  currentUser,
  isSuperAdminRole,
  generationReadiness,
  generateWorkspaceTab,
  setGenerateWorkspaceTab,
  generateStatus,
  handleGenerate,
  cancelGeneration,
  handleSaveToDatabase,
  formatDateTime,
  resultClasses,
  renderScheduleTable,
  hasFeature,
  downloadScheduleReport,
  strictCompetency,
  setStrictCompetency,
  specialWednesdayConstraint,
  setSpecialWednesdayConstraint,
  handleResetSchedule,
  timeSlots,
  teachers,
  normalizeText,
  teachingLoads,
  parseTeacherCodes,
  sameText,
  teacherAvailability,
  classes,
  subjects,
  rooms,
  days,
  isGenerated,
  generateGuideTab,
  setGenerateGuideTab,
  setActiveTab,
  swapWarning,
  scheduleFilterGrade,
  scheduleFilterMajor,
  scheduleFilterClass,
  scheduleFilterDay,
  setScheduleFilterDay,
  majors,
  scheduleSearchQuery,
  schedule,
  setScheduleSearchQuery,
  setScheduleFilterGrade,
  setScheduleFilterMajor,
  setScheduleFilterClass,
  appSettings
}) {
        return (
          <div className="flex flex-col gap-4 w-full animate-in fade-in duration-300 relative z-10 print:block print:h-auto">
            <PageHeader
              title="Master Jadwal"
              icon={Calendar}
              description="Susun, generate, dan periksa jadwal dari satu area kerja."
              tabs={[
                { id:"generate", label:"Generate Jadwal", icon: Settings, onClick: () => setGenerateWorkspaceTab("generate"), isActive: generateWorkspaceTab ==="generate" },
                { id:"panduan", label:"Panduan", icon: LayoutTemplate, onClick: () => setGenerateWorkspaceTab("panduan"), isActive: generateWorkspaceTab ==="panduan" }
              ]}
            />

            {generateWorkspaceTab ==="generate" && (isSuperAdminRole(currentUser.role) || (currentUser.role ==="waka" && (currentUser.division ||"").toLowerCase() ==="kurikulum")) && (
              <section className="ui-card flex flex-col p-4 md:px-5 md:py-4 print:hidden">
                <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
                    <div>
                      <p className="text-sm font-black text-slate-800">Pengaturan generator</p>
                      <p className="mt-0.5 text-[11px] font-medium text-slate-500">Pemetaan otomatis berdasarkan data master dan beban mengajar.</p>
                    </div>
                    <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-[var(--ui-radius-small)] border-none">
                      <input type="checkbox" checked={strictCompetency} onChange={(e) => setStrictCompetency(e.target.checked)} className="accent-[var(--ui-primary)]" />
                      <div>
                        <p className="text-sm font-bold text-slate-800">Strict Kompetensi Mapel</p>
                        <p className="text-xs text-slate-500">Hanya tempatkan guru pada mapel yang ada di kompetensinya.</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-[var(--ui-radius-small)] border-none">
                      <input type="checkbox" checked={specialWednesdayConstraint} onChange={(e) => setSpecialWednesdayConstraint(e.target.checked)} className="accent-[var(--ui-primary)]" />
                      <div>
                        <p className="text-sm font-bold text-slate-800">Aturan Khusus Rabu (X TKJ/TKR)</p>
                        <p className="text-xs text-slate-500">Batasi hari Rabu hanya untuk KJD (TKJ) dan GT (TKR) setelah jam praktik oleh guru yang sama.</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 w-full xl:w-auto">
                    <Button variant="outline" onClick={handleResetSchedule} className="w-full sm:w-auto"><Trash2 size={15} /> Kosongkan</Button>
                    <Button onClick={handleGenerate} className="w-full sm:w-auto"><Settings size={15} /> Eksekusi Auto-Generate</Button>
                  </div>
                </div>
              </section>
            )}

            {generateWorkspaceTab ==="panduan" && (() => {
              const hasTeachingSlots = Object.values(timeSlots || {}).some((slots) =>
                Array.isArray(slots) && slots.some((slot) => !slot.isBreak)
              );
              const knownTeacherCodes = new Set(teachers.map((teacher) => normalizeText(teacher.code)).filter(Boolean));
              const loadTeacherCodes = new Set(teachingLoads.flatMap((load) => parseTeacherCodes(load.teacherCode).map(normalizeText)).filter(Boolean));
              const invalidLoadTeacherCodes = [...loadTeacherCodes].filter((code) => !knownTeacherCodes.has(code));
              const teachersWithoutAvailability = [...loadTeacherCodes].filter((code) => {
                const teacher = teachers.find((item) => sameText(item.code, code));
                const availability = teacher ? teacherAvailability[teacher.code] : null;
                return !availability || !Array.isArray(availability.days) || availability.days.length === 0;
              });
              const teachersWithoutCompetency = strictCompetency
                ? [...loadTeacherCodes].filter((code) => {
                  const teacher = teachers.find((item) => sameText(item.code, code));
                  const availability = teacher ? teacherAvailability[teacher.code] : null;
                  return !availability || !Array.isArray(availability.subjects) || availability.subjects.length === 0;
                })
                : [];
              const masterReady = classes.length > 0 && teachers.length > 0 && subjects.length > 0 && rooms.length > 0;
              const timeReady = days.length > 0 && hasTeachingSlots;
              const loadReady = teachingLoads.length > 0 && invalidLoadTeacherCodes.length === 0;
              const availabilityReady = teachersWithoutAvailability.length === 0 && teachersWithoutCompetency.length === 0;
              const preparationCount = [masterReady, timeReady, loadReady, availabilityReady, generationReadiness.canGenerate].filter(Boolean).length;
              const statusClass = (complete) => complete
                ?"bg-emerald-50 border-emerald-200 text-emerald-700"
                :"bg-amber-50 border-amber-200 text-amber-800";
              const steps = [
                {
                  number:"01",
                  title:"Lengkapi data master",
                  complete: masterReady,
                  icon: Users,
                  detail:"Isi kelas, guru, mata pelajaran, dan ruangan. Untuk mapel praktik, pastikan ruangan praktik/lab tersedia.",
                  sync:"Jurusan kelas harus sesuai dengan target jurusan di mapel dan beban mengajar.",
                  actions: [
                    { label:"Kelas", tab:"kelas" }, { label:"Guru", tab:"guru" }, { label:"Mapel", tab:"mapel" }, { label:"Ruangan", tab:"ruangan" },
                  ] },
                {
                  number:"02",
                  title:"Atur hari dan jam belajar",
                  complete: timeReady,
                  icon: Clock,
                  detail:"Buat hari aktif dan minimal satu jam pelajaran aktif. Baris istirahat tidak dihitung sebagai jam mengajar.",
                  sync:"Hari yang tersedia untuk guru harus memakai nama hari yang sama dengan pengaturan waktu.",
                  actions: [{ label:"Atur Waktu", tab:"pengaturan" }] },
                {
                  number:"03",
                  title:"Isi beban mengajar",
                  complete: loadReady,
                  icon: BookOpen,
                  detail:"Masukkan guru, mapel, tingkat, jurusan, durasi JP, dan batas kelas bila diperlukan.",
                  sync: invalidLoadTeacherCodes.length > 0
                    ? `${invalidLoadTeacherCodes.length} kode guru di beban mengajar belum ditemukan di Data Guru.`
                    :"Kode guru dan nama mapel di beban mengajar harus sama dengan data master.",
                  actions: [{ label:"Beban Mengajar", tab:"beban" }] },
                {
                  number:"04",
                  title:"Sinkronkan ketersediaan guru",
                  complete: availabilityReady,
                  icon: CalendarDays,
                  detail: strictCompetency
                    ?"Pilih hari tersedia dan mata pelajaran yang dikuasai untuk setiap guru karena Strict Kompetensi aktif."
                    :"Pilih minimal hari tersedia untuk setiap guru yang mendapat beban mengajar.",
                  sync: teachersWithoutAvailability.length > 0
                    ? `${teachersWithoutAvailability.length} guru pada beban mengajar belum memiliki hari tersedia.`
                    : teachersWithoutCompetency.length > 0
                      ? `${teachersWithoutCompetency.length} guru belum memiliki mapel kompetensi.`
                      :"Ketersediaan guru sudah dapat dibaca oleh generator.",
                  actions: [{ label:"Ketersediaan Guru", tab:"ketersediaan" }] },
                {
                  number:"05",
                  title:"Tinjau aturan dan status siap",
                  complete: generationReadiness.canGenerate,
                  icon: SlidersHorizontal,
                  detail:"Periksa batas JP harian, hari khusus, ruang teori/praktik, dan catatan kuning sebelum mengeksekusi generator.",
                  sync: generationReadiness.canGenerate
                    ?"Data wajib sudah siap. Catatan kuning tetap perlu ditinjau agar hasil lebih rapi."
                    : `${generationReadiness.blockers.length} data wajib masih perlu dilengkapi sebelum jadwal dapat dibuat.`,
                  actions: [{ label:"Aturan Jadwal", tab:"advanced_rules" }] },
                {
                  number:"06",
                  title:"Generate lalu periksa hasil",
                  complete: isGenerated,
                  icon: CheckCircle2,
                  detail:"Klik Eksekusi Auto-Generate, lalu cek pratinjau per tingkat/kelas, konflik yang tersisa, dan denah ruangan.",
                  sync: isGenerated
                    ?"Jadwal sudah dibuat. Periksa hasil sebelum dicetak atau dibagikan ke guru."
                    :"Jadwal baru dibuat setelah semua data wajib pada langkah sebelumnya siap.",
                  actions: isGenerated
                    ? [{ label:"Cek Denah", tab:"denah" }]
                    : [{ label:"Generate Sekarang", action: handleGenerate }] },
              ];
              const guideTabs = [
                { id:"persiapan", label:"1. Persiapan", icon: LayoutTemplate, description:"Data dasar dan jam belajar" },
                { id:"sinkronisasi", label:"2. Sinkronisasi", icon: RefreshCw, description:"Beban dan ketersediaan guru" },
                { id:"eksekusi", label:"3. Eksekusi & Review", icon: CheckCircle2, description:"Aturan, generate, dan cek hasil" },
              ];
              const visibleSteps = generateGuideTab ==="persiapan"
                ? steps.slice(0, 2)
                : generateGuideTab ==="sinkronisasi"
                  ? steps.slice(2, 4)
                  : steps.slice(4, 6);

              return (
                <section className="ui-card overflow-hidden print:hidden">
                  <div className="p-4 md:px-5 md:py-4 bg-gradient-to-br from-[var(--ui-primary)]/10 via-white to-[var(--ui-accent)]/20 border-b border-slate-100">
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
                      <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-[var(--ui-radius-small)] bg-white/85 border border-white text-[var(--ui-primary)] text-[10px] font-black uppercase tracking-[0.18em] shadow-sm">
                          <LayoutTemplate size={14} /> Panduan Generate Master Jadwal
                        </div>
                        <h2 className="mt-2 text-lg md:text-xl font-black text-slate-800 tracking-tight">Ikuti urutan ini agar jadwal lebih mudah dibuat</h2>
                        <p className="mt-1 max-w-3xl text-xs text-slate-600 font-medium leading-relaxed">Mulai dari data master, waktu, beban mengajar, lalu ketersediaan guru.</p>
                      </div>
                      <div className="shrink-0 rounded-[var(--ui-radius-small)] bg-white border-none shadow-sm px-3 py-2 min-w-[132px]">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Kesiapan Data</p>
                        <p className="mt-0.5 text-xl font-black text-slate-800">{preparationCount}<span className="text-xs text-slate-400">/5</span></p>
                        <p className="text-[11px] font-semibold text-slate-500">Langkah persiapan selesai</p>
                      </div>
                    </div>
                  </div>

                  <div className="px-4 md:px-5 pt-3 border-b border-slate-100">
                    <div className="flex gap-1.5 overflow-x-auto pb-3 custom-scrollbar">
                      {guideTabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = generateGuideTab === tab.id;
                        return (
                          <Button variant="outline"
                            key={tab.id}
                            type="button"
                            onClick={() =>setGenerateGuideTab(tab.id)}
                            className={`shrink-0 flex items-center gap-2 text-left cursor-pointer ${isActive ?"bg-[var(--ui-primary)] text-white border-[var(--ui-primary)] shadow-sm" :"bg-slate-50 text-slate-600 border-slate-200 hover:bg-white hover:border-slate-300"}`}
                          >
                            <Icon size={16} />
                            <span>
                              <span className="block text-xs font-black">{tab.label}</span>
                              <span className={`hidden xl:block mt-0.5 text-[10px] font-semibold ${isActive ?"text-white/75" :"text-slate-400"}`}>{tab.description}</span>
                            </span></Button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="p-4 md:p-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {visibleSteps.map((step) => {
                        const Icon = step.icon;
                        return (
                          <article key={step.number} className={`rounded-[var(--ui-radius-small)] border p-3 flex flex-col ${statusClass(step.complete)}`}>
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-[var(--ui-radius-small)] bg-white/80 border border-white flex items-center justify-center font-black text-xs shadow-sm">{step.number}</div>
                                <div>
                                  <h3 className="font-black text-sm text-slate-800">{step.title}</h3>
                                  <p className="mt-0.5 text-[10px] font-black uppercase tracking-widest">{step.complete ?"Siap" :"Perlu dicek"}</p>
                                </div>
                              </div>
                              <Icon size={20} className="shrink-0" />
                            </div>
                            <p className="mt-2 text-xs text-slate-700 font-medium leading-relaxed">{step.detail}</p>
                            <div className="mt-2 rounded-[var(--ui-radius-small)] bg-white/70 border border-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 leading-relaxed">
                              <span className="font-black">Yang harus sinkron: </span>{step.sync}
                            </div>
                            {(isSuperAdminRole(currentUser.role) || (currentUser.role ==="waka" && (currentUser.division ||"").toLowerCase() ==="kurikulum")) && (
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                {step.actions.map((action) => (
                                  <Button
                                    key={action.label}
                                    type="button"
                                    size="sm"
                                    onClick={() => action.action ? action.action() : setActiveTab(action.tab)}
                                  >
                                    {action.label}
                                  </Button>
                                ))}
                              </div>
                            )}
                          </article>
                        );
                      })}
                    </div>

                    {generateGuideTab ==="persiapan" && (
                      <div className="mt-5 rounded-[var(--ui-radius-small)] border-none bg-slate-50 p-4 text-xs text-slate-600 font-medium leading-relaxed">
                        <strong className="text-slate-800">Urutan aman:</strong> isi Data Kelas dan Guru terlebih dahulu, lanjutkan Mata Pelajaran serta Ruangan, kemudian atur hari dan jam belajar. Setelah itu baru isi beban mengajar.
                      </div>
                    )}

                    {generateGuideTab ==="sinkronisasi" && (
                      <div className="mt-5 rounded-[var(--ui-radius-small)] border border-sky-100 bg-sky-50/70 p-4">
                        <h3 className="font-black text-sky-900 text-sm">Checklist sinkronisasi paling penting</h3>
                        <div className="mt-3 grid gap-2 text-xs font-medium text-sky-900">
                          <p><strong>1. Kode guru:</strong> kode di Beban Mengajar wajib sama dengan kode di Data Guru.</p>
                          <p><strong>2. Mata pelajaran:</strong> nama mapel di Beban Mengajar wajib tersedia di Mata Pelajaran.</p>
                          <p><strong>3. Tingkat dan jurusan:</strong> target beban mengajar harus memiliki kelas yang sesuai.</p>
                          <p><strong>4. Praktik:</strong> mapel praktik memerlukan ruang praktik/lab yang sesuai jurusan bila tersedia.</p>
                        </div>
                      </div>
                    )}

                    {generateGuideTab ==="eksekusi" && (
                      <div className="mt-5 grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div className="rounded-[var(--ui-radius-small)] border border-violet-100 bg-violet-50/70 p-4">
                          <h3 className="font-black text-violet-900 text-sm">Setelah jadwal dibuat</h3>
                          <div className="mt-3 grid gap-2 text-xs font-medium text-violet-900">
                            <p><strong>1.</strong> Gunakan filter tingkat, jurusan, dan kelas di bawah untuk mengecek pratinjau.</p>
                            <p><strong>2.</strong> Buka Denah Ruangan untuk memastikan kelas dan ruang praktik sudah masuk akal.</p>
                            <p><strong>3.</strong> Jika data diubah besar-besaran, kosongkan jadwal lama lalu generate kembali.</p>
                          </div>
                        </div>
                        {generationReadiness.blockers.length > 0 && (
                          <div className="rounded-[var(--ui-radius-small)] border border-rose-200 bg-rose-50 p-4">
                            <h3 className="font-black text-rose-800 text-sm flex items-center gap-2"><AlertCircle size={17} /> Yang masih menghalangi generate</h3>
                            <div className="mt-3 flex flex-wrap gap-2">
                              {generationReadiness.blockers.map((blocker) => <span key={blocker} className="px-3 py-1.5 rounded-[var(--ui-radius-small)] bg-white border border-rose-100 text-rose-700 text-[11px] font-bold">{blocker}</span>)}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                  </div>
                </section>
              );
            })()}
            {generateWorkspaceTab ==="generate" && (<>
            {!(isSuperAdminRole(currentUser.role) || (currentUser.role ==="waka" && (currentUser.division ||"").toLowerCase() ==="kurikulum")) && (
              <div className="bg-slate-50 border-none text-slate-700 px-4 py-3 rounded-[var(--ui-radius-small)] flex items-center gap-2.5 shrink-0 shadow-sm text-xs font-medium print:hidden">
                <Info size={17} className="text-slate-500 shrink-0" />
                <div>
                  <strong>Mode lihat saja.</strong> Generate jadwal hanya tersedia untuk SuperAdmin atau Waka Kurikulum.
                </div>
              </div>
            )}
            {generationReadiness.warnings.length > 0 && (isSuperAdminRole(currentUser.role) || (currentUser.role ==="waka" && (currentUser.division ||"").toLowerCase() ==="kurikulum")) && (
              <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-[var(--ui-radius-small)] flex items-start gap-2.5 shrink-0 shadow-sm text-xs font-medium print:hidden">
                <AlertCircle size={17} className="text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong>Catatan sebelum generate:</strong>
                  <ul className="mt-1 space-y-0.5 text-xs">
                    {generationReadiness.warnings.slice(0, 4).map((warning) => <li key={warning}>- {warning}</li>)}
                  </ul>
                </div>
              </div>
            )}
            {swapWarning && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-[var(--ui-radius-small)] flex items-start gap-2.5 shrink-0 shadow-sm text-xs font-medium print:hidden">
                  <AlertCircle size={17} className="text-red-500 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    {typeof swapWarning ==='string' ? <><strong className="mr-1">Perhatian:</strong> {swapWarning}</> : swapWarning}
                  </div>
                </div>
              )}
            
  {(() => {
    // Helper to calculate filtered classes for Admin Generator view
    const availableClassesForDropdownAdmin = classes.filter(c => {
      if (scheduleFilterGrade !=="Semua" && !c.name.startsWith(scheduleFilterGrade +"")) return false;
      if (scheduleFilterMajor !=="Semua" && c.major !== scheduleFilterMajor) return false;
      return true;
    });

    let selectedClassEffective = scheduleFilterClass;
    if (selectedClassEffective !=="Semua" && !availableClassesForDropdownAdmin.some((c) => c.name === selectedClassEffective)) {
      selectedClassEffective ="Semua";
    }

    const majorsList = [...new Set([...majors, ...classes.map((c) => c.major)].map((item) => String(item ||"").trim()).filter(Boolean))];

    let resultClasses = classes;
    if (scheduleFilterGrade !=="Semua") resultClasses = resultClasses.filter(c => c.name.startsWith(scheduleFilterGrade +""));
    if (scheduleFilterMajor !=="Semua") resultClasses = resultClasses.filter(c => c.major === scheduleFilterMajor);
    if (selectedClassEffective !=="Semua") resultClasses = resultClasses.filter(c => c.name === selectedClassEffective);

    if (scheduleSearchQuery.trim() !=="") {
      const query = scheduleSearchQuery.toLowerCase().trim();
      resultClasses = resultClasses.filter(c => {
        if (c.name.toLowerCase().includes(query)) return true;
        const classSchedule = schedule.filter(s => s.className === c.name);
        return classSchedule.some(s => 
          (s.subject && s.subject.toLowerCase().includes(query)) ||
          (s.teacherCode && s.teacherCode.toLowerCase().includes(query)) ||
          (s.roomId && s.roomId.toLowerCase().includes(query))
        );
      });
    }

    const dayOptions = [
      { label:"Semua Hari", value:"Semua" },
      ...days.map(d => ({ label: d, value: d }))
    ];
    const gradeOptions = [
      { label:"Semua Tingkat", value:"Semua" },
      { label:"Tingkat X", value:"X" },
      { label:"Tingkat XI", value:"XI" },
      { label:"Tingkat XII", value:"XII" },
    ];
    const majorOptions = [
      { label:"Semua Jurusan", value:"Semua" },
      ...majorsList.map(m => ({ label: `Jurusan ${m}`, value: m }))
    ];
    const classOptions = [
      { label:"Semua Kelas", value:"Semua" },
      ...availableClassesForDropdownAdmin.map(c => ({ label: c.name, value: c.name }))
    ];

    return (
      <div className="flex-1 flex flex-col gap-4 print:block min-w-0 min-h-0">
        {/* Schedule Table Container Card */}
        <div className="ui-card flex flex-col flex-1 overflow-hidden print:block print:border-none print:-none print:overflow-visible">
          <div className="px-4 md:px-5 py-3 border-b border-slate-100 flex flex-col xl:flex-row xl:items-center gap-3 print-hidden bg-slate-50/50">
            <div className="flex items-center justify-between gap-3 shrink-0">
              <h3 className="font-extrabold text-[15px] text-slate-800 whitespace-nowrap">
                Pratinjau Jadwal {scheduleFilterGrade !=="Semua" ? `Tingkat ${scheduleFilterGrade}` :""} {scheduleFilterMajor !=="Semua" ? `| ${scheduleFilterMajor}` :""} {selectedClassEffective !=="Semua" ? `| ${selectedClassEffective}` :""}
              </h3>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline"
                  onClick={async () => {
                    try {
                      const XLSX = await import("xlsx");
                      const exportData = (schedule || []).map((s, idx) => ({
                        No: idx + 1,
                        Hari: s.day || s.hari || '',
                        Kelas: s.className || s.kelas || '',
                        Waktu: s.timeLabel || s.waktu || '',
                        Mapel: s.subject || s.mapel || '',
                        Guru: s.teacherCode || s.guru || '',
                        Ruangan: s.roomId || s.ruangan || ''
                      }));
                      const ws = XLSX.utils.json_to_sheet(exportData.length > 0 ? exportData : [{ Info: "Belum ada jadwal yang di-generate" }]);
                      const wb = XLSX.utils.book_new();
                      XLSX.utils.book_append_sheet(wb, ws, "Jadwal Pelajaran");
                      XLSX.writeFile(wb, `Jadwal_Pelajaran_${new Date().toISOString().slice(0, 10)}.xlsx`);
                    } catch (e) {
                      console.error(e);
                    }
                  }}
                  className="gap-1.5"
                >
                  <Download size={13} className="stroke-[2.5]" />
                  Ekspor Excel
                </Button>
                <Button 
                  onClick={() => window.print()}
                  className="gap-1.5"
                >
                  <Printer size={13} className="stroke-[2.5]" />
                  Cetak
                </Button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 flex-1 xl:justify-end min-w-0">
              <div className="relative flex-1 min-w-[220px] xl:max-w-[300px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input 
                  type="text" 
                  placeholder="Cari kelas atau mapel..." 
                  value={scheduleSearchQuery}
                  onChange={e => setScheduleSearchQuery(e.target.value)}
                  className="w-full bg-white border-none rounded-[var(--ui-radius-small)] py-2 pl-9 pr-3 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[var(--ui-accent)] focus:ring-2 transition-all"
                  style={{'--tw-ring-color':'var(--ui-accent)' }}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 shrink-0">
                <CustomSelect 
                  value={scheduleFilterDay}
                  onChange={setScheduleFilterDay}
                  options={dayOptions}
                  placeholder="Pilih Hari"
                  accentColor="var(--ui-accent)"
                  primaryColor="var(--ui-primary)"
                  className="w-full min-w-[112px]"
                />
                <CustomSelect 
                  value={scheduleFilterGrade}
                  onChange={setScheduleFilterGrade}
                  options={gradeOptions}
                  placeholder="Pilih Tingkat"
                  accentColor="var(--ui-accent)"
                  primaryColor="var(--ui-primary)"
                  className="w-full min-w-[112px]"
                />
                <CustomSelect 
                  value={scheduleFilterMajor}
                  onChange={setScheduleFilterMajor}
                  options={majorOptions}
                  placeholder="Pilih Jurusan"
                  accentColor="var(--ui-accent)"
                  primaryColor="var(--ui-primary)"
                  className="w-full min-w-[112px]"
                />
                <CustomSelect 
                  value={selectedClassEffective}
                  onChange={setScheduleFilterClass}
                  options={classOptions}
                  placeholder="Pilih Kelas"
                  accentColor="var(--ui-accent)"
                  primaryColor="var(--ui-primary)"
                  className="w-full min-w-[112px]"
                />
              </div>
            </div>
          </div>
          <div className="p-4 md:p-6 overflow-x-auto overflow-y-auto custom-scrollbar flex-1 min-w-0 bg-slate-50/30 print:block print:p-0 print:bg-transparent print:overflow-visible print-landscape">
              {/* PRINT KOP SURAT (FULL BLEED, COMPACT) */}
              <div className="hidden print:flex w-full overflow-hidden h-[60px] relative items-center bg-white">
                  {/* Left Content (Logo & Text) */}
                  <div className="flex items-center px-6 shrink-0 max-w-[55%] h-full">
                    {appSettings.useKopSuratGambar && appSettings.kopSuratGambar ? (
                      <img src={appSettings.kopSuratGambar} alt="Kop Surat" className="w-full h-full object-contain" />
                    ) : (
                      <>
                        {/* Logo */}
                        {appSettings.kopSuratLogo && (
                          <div className="w-10 h-10 shrink-0 flex items-center justify-center mr-3">
                            <img src={appSettings.kopSuratLogo} alt="Logo Kop" className="w-full h-full object-contain" />
                          </div>
                        )}
                        
                        {/* Text */}
                        <div className="flex flex-col justify-center">
                          {appSettings.kopSuratBaris1 && <span className="text-[7px] font-bold text-slate-500 uppercase tracking-widest leading-tight">{appSettings.kopSuratBaris1}</span>}
                          {appSettings.kopSuratBaris2 && <span className="text-[11px] font-black uppercase tracking-widest leading-tight" style={{ color: appSettings.primaryColor ||"var(--ui-primary)" }}>{appSettings.kopSuratBaris2}</span>}
                          {appSettings.kopSuratBaris3 && <span className="text-[14px] font-black uppercase tracking-tight leading-tight" style={{ color: appSettings.primaryColor ||"var(--ui-primary)" }}>{appSettings.kopSuratBaris3}</span>}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Right Colored Bar */}
                  <div className="flex-1 h-full flex items-center justify-end pl-6" style={{ backgroundColor: appSettings.primaryColor ||"var(--ui-primary)" }}>
                    <div className="pr-6 text-right text-white flex flex-col justify-center">
                      <h2 className="text-[12px] font-black uppercase tracking-wide">JADWAL PELAJARAN {scheduleFilterGrade !=="Semua" ? `TINGKAT ${scheduleFilterGrade}` :""}</h2>
                      <p className="text-[8px] font-medium opacity-90 mt-0.5">T.P. {new Date().getFullYear()}/{new Date().getFullYear() + 1} &bull; Dicetak: {new Date().toLocaleDateString("id-ID")}</p>
                    </div>
                  </div>
              </div>

              {/* TABLE CONTAINER (Safe Area Padding) */}
              <div className="print:block print:px-6 print:pt-4 print:pb-8 print:min-h-[calc(100vh-80px)]">
                {renderScheduleTable(resultClasses, !(isSuperAdminRole(currentUser.role) || (currentUser.role ==="waka" && (currentUser.division ||"").toLowerCase() ==="kurikulum")), scheduleFilterDay)}
              </div>

              {/* PRINT FOOTER (REMOVED AS REQUESTED) */}
          </div>
        </div>
      </div>
    );
  })()}
            </>)}
           </div>
        );

});

export default MasterDataGenerate;
