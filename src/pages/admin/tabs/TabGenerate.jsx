import { Button } from '../../../components/ui.jsx';

import { Trash2, Settings, Info, AlertCircle, Printer, Search } from'lucide-react';
import { CustomSelect } from'../../../components/CustomSelect.jsx';


export default function TabGenerate(props) {
  const normalizeText = (value) => String(value ??"").trim().replace(/\s+/g,"").toLowerCase();
  const sameText = (a, b) => normalizeText(a) === normalizeText(b);
  const isSuperAdminRole = (role) => normalizeText(role) ==="admin";
  const isAllLike = (value, allValues = ["All","Semua","Umum"]) => {
    const text = normalizeText(value);
    if (!text) return true;
    return allValues.some((item) => sameText(text, item));
  };
  const parseTeacherCodes = (value) => String(value ||"").split(",").map((code) => code.trim()).filter(Boolean);
  const parseCsvList = (value) => String(value ||"").split(",").map((entry) => entry.trim()).filter(Boolean);
  const serializeCsvList = (values) => [ ...new Set((values || []).map((value) => String(value ||"").trim()).filter(Boolean)), ].join(",");

  const { ui, radius, card, between, accent, primary, size, generate, area, kerja, control, setGenerateWorkspaceTab, generateWorkspaceTab, panduan, currentUser, waka, division, kurikulum, generator, berdasarkan, master, beban, mengajar, checkbox, checked, strictCompetency, setStrictCompetency, target, tempatkan, kompetensinya, specialWednesdayConstraint, setSpecialWednesdayConstraint, setelah, praktik, oleh, handleResetSchedule, variant, secondary, colors, handleGenerate, timeSlots, slots, isArray, slot, isBreak, teachers, code, teachingLoads, flatMap, load, teacherCode, has, item, teacherAvailability, days, subjects, classes, rooms, generationReadiness, canGenerate, complete, number, title, icon, detail, mata, pelajaran, ruangan, lab, sync, harus, sesuai, actions, label, tab, belajar, aktif, minimal, istirahat, tidak, dihitung, sebagai, memakai, pengaturan, tingkat, batas, diperlukan, ditemukan, ketersediaan, dikuasai, mendapat, memiliki, kompetensi, dapat, dibaca, aturan, siap, harian, khusus, teori, kuning, sebelum, mengeksekusi, wajib, perlu, ditinjau, rapi, blockers, masih, dilengkapi, advanced_rules, isGenerated, pratinjau, per, denah, dicetak, dibagikan, action, persiapan, description, dasar, sinkronisasi, eksekusi, generateGuideTab, overflow, urutan, selesai, setGenerateGuideTab, grid, cols, step, dicek, sinkron, setActiveTab, aman, isi, terlebih, dahulu, atur, penting, memerlukan, bawah, mengecek, memastikan, masuk, akal, besar, besaran, menghalangi, blocker, saja, warnings, warning, swapWarning, string, calculate, filtered, view, scheduleFilterGrade, name, startsWith, scheduleFilterMajor, major, scheduleFilterClass, majors, scheduleSearchQuery, schedule, subject, roomId, d, visible, whitespace, nowrap, active, backgroundColor, stroke, setScheduleSearchQuery, tw, color, setScheduleFilterGrade, options, accentColor, primaryColor, setScheduleFilterMajor, setScheduleFilterClass, appSettings, kopSuratLogo, object, contain, kopSuratBaris1, kopSuratBaris2, kopSuratBaris3, wide, opacity, getFullYear, bull, toLocaleDateString, calc, renderScheduleTable, scheduleFilterDay, setScheduleFilterDay } = props;
  
  return (
          <div className="flex flex-col gap-4 h-full w-full animate-in fade-in duration-300 relative z-10 print:block print:h-auto">
            <section className="ui-card flex flex-col p-4 md:px-5 md:py-4 print:hidden">
              {(isSuperAdminRole(currentUser.role) || (currentUser.role ==="waka" && (currentUser.division ||"").toLowerCase() ==="kurikulum")) && (
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
                    <button onClick={handleResetSchedule} className="w-full sm:w-auto"><Trash2 size={15} /> Kosongkan</button>
                    <button onClick={handleGenerate} className="w-full sm:w-auto"><Settings size={15} /> Eksekusi Auto-Generate</button>
                  </div>
                </div>
              )}
            </section>

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

    const majorsList = [...new Set([...majors, ...classes.map((c) => c.major)].map((item) => String(item ||"").trim()).filter(Boolean))].filter(m => m.toLowerCase() !=='semua' && m.toLowerCase() !=='all');

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
              <Button variant="outline" 
                onClick={() =>window.print()}
                className="flex items-center gap-1.5 cursor-pointer"
                style={{ backgroundColor:"var(--ui-primary)" }}
              >
                <Printer size={13} className="stroke-[2.5]" />
                Cetak</Button>
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
              <div className="hidden print:flex w-full overflow-hidden h-[60px] relative items-center bg-white border-b border-slate-300">
                  {/* Left Content (Logo & Text) */}
                  <div className="flex items-center px-6 shrink-0 max-w-[55%] h-full">
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
           </div>
        );
 }
