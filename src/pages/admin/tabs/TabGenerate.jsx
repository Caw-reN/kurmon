import { Button, Modal, UISelect } from '../../../components/ui.jsx';
import { Trash2, Settings, Info, AlertCircle, Printer, Search, ChevronLeft, Calendar, Wand2, Edit3, Plus, Sparkles, CheckCircle2 } from 'lucide-react';
import React, { useState, useEffect, useMemo } from 'react';
import { CustomSelect } from '../../../components/CustomSelect.jsx';
import { PageHeader } from '../../../components/monitoring/ui/index.js';


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

  const {
    scheduleGenerationMode = "auto",
    setScheduleGenerationMode,
    manualSlotModal,
    openManualSlotModal,
    closeManualSlotModal,
    saveManualSlot,
    deleteManualSlot,
    ui, radius, card, between, accent, primary, size, generate, area, kerja, control, setGenerateWorkspaceTab, generateWorkspaceTab, panduan, currentUser, waka, division, kurikulum, generator, berdasarkan, master, beban, mengajar, checkbox, checked, strictCompetency, setStrictCompetency, target, tempatkan, kompetensinya, specialWednesdayConstraint, setSpecialWednesdayConstraint, setelah, praktik, oleh, handleResetSchedule, variant, secondary, colors, handleGenerate, timeSlots, slots, isArray, slot, isBreak, teachers = [], code, teachingLoads = [], flatMap, load, teacherCode, has, item, teacherAvailability, days = [], subjects = [], classes = [], rooms = [], generationReadiness, canGenerate, complete, number, title, icon, detail, mata, pelajaran, ruangan, lab, sync, harus, sesuai, actions, label, tab, belajar, aktif, minimal, istirahat, tidak, dihitung, sebagai, memakai, pengaturan, tingkat, batas, diperlukan, ditemukan, ketersediaan, dikuasai, mendapat, memiliki, kompetensi, dapat, dibaca, aturan, siap, harian, khusus, teori, kuning, sebelum, mengeksekusi, wajib, perlu, ditinjau, rapi, blockers, masih, dilengkapi, advanced_rules, isGenerated, pratinjau, per, denah, dicetak, dibagikan, action, persiapan, description, dasar, sinkronisasi, eksekusi, generateGuideTab, overflow, urutan, selesai, setGenerateGuideTab, grid, cols, step, dicek, sinkron, setActiveTab, aman, isi, terlebih, dahulu, atur, penting, memerlukan, bawah, mengecek, memastikan, masuk, akal, besar, besaran, menghalangi, blocker, saja, warnings, warning, swapWarning, string, calculate, filtered, view, scheduleFilterGrade, name, startsWith, scheduleFilterMajor, major, scheduleFilterClass, majors, scheduleSearchQuery, schedule = [], subject, roomId, d, visible, whitespace, nowrap, active, backgroundColor, stroke, setScheduleSearchQuery, tw, color, setScheduleFilterGrade, options, accentColor, primaryColor, setScheduleFilterMajor, setScheduleFilterClass, appSettings, kopSuratLogo, object, contain, kopSuratBaris1, kopSuratBaris2, kopSuratBaris3, wide, opacity, getFullYear, bull, toLocaleDateString, calc, renderScheduleTable, scheduleFilterDay, setScheduleFilterDay
  } = props;

  const [slotFormData, setSlotFormData] = useState({
    day: "Senin",
    slotId: "",
    className: "",
    subject: "",
    teacherCode: "",
    roomId: ""
  });

  useEffect(() => {
    if (manualSlotModal?.isOpen) {
      setSlotFormData({
        day: manualSlotModal.day || (days[0] || "Senin"),
        slotId: manualSlotModal.slotId || (timeSlots[manualSlotModal.day || days[0] || "Senin"]?.[0]?.id || ""),
        className: manualSlotModal.className || (classes[0]?.name || ""),
        subject: manualSlotModal.subject || "",
        teacherCode: manualSlotModal.teacherCode || "",
        roomId: manualSlotModal.roomId || ""
      });
    }
  }, [manualSlotModal, days, timeSlots, classes]);

  const currentSlotOccupancy = useMemo(() => {
    if (!schedule || !slotFormData.day || !slotFormData.slotId) return new Map();
    const map = new Map();
    (schedule || []).forEach(item => {
      if (item.day === slotFormData.day && String(item.slotId) === String(slotFormData.slotId)) {
        if (item.teacherCode) {
          const codes = String(item.teacherCode).split(",").map(c => c.trim()).filter(Boolean);
          codes.forEach(code => {
            map.set(code, item.className);
          });
        }
      }
    });
    return map;
  }, [schedule, slotFormData.day, slotFormData.slotId]);

  const classTeachingLoads = useMemo(() => {
    if (!teachingLoads || !slotFormData.className) return [];
    const targetClass = classes.find(c => c.name === slotFormData.className);
    return teachingLoads.filter(load => {
      if (load.className && load.className === slotFormData.className) return true;
      if (targetClass) {
        const matchGrade = !load.targetGrade || load.targetGrade === "Semua" || targetClass.name.startsWith(load.targetGrade);
        const matchMajor = !load.targetMajor || load.targetMajor === "All" || load.targetMajor === "Semua" || targetClass.major === load.targetMajor;
        return matchGrade && matchMajor;
      }
      return false;
    });
  }, [teachingLoads, classes, slotFormData.className]);
  
  return (
    <div className="flex flex-col gap-4 h-full w-full animate-in fade-in duration-300 relative z-10 print:block print:h-auto pb-20 sm:pb-6">
      <PageHeader
        title="Jadwal Pelajaran"
        description="Jadwal Mengajar Guru & Jadwal Pelajaran Kelas Tersinkronisasi"
        icon={Calendar}
        onBack={() => typeof window !== 'undefined' && window.__setActiveTab ? window.__setActiveTab('dashboard') : null}
      />

      {(isSuperAdminRole(currentUser.role) || (currentUser.role ==="waka" && (currentUser.division ||"").toLowerCase() ==="kurikulum")) && (
        <section className="ui-card flex flex-col p-4 md:px-5 md:py-4 print:hidden gap-3.5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <p className="text-sm font-black text-slate-800">Mode Penyusunan Jadwal</p>
              <p className="mt-0.5 text-[11px] font-medium text-slate-500">Pilih penyusunan secara Otomatis via Algoritma Generator atau Manual per slot.</p>
            </div>
            
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant={scheduleGenerationMode === "auto" ? 'primary' : 'ghost'}
                onClick={() => setScheduleGenerationMode && setScheduleGenerationMode("auto")}
                className={scheduleGenerationMode !== "auto" ? 'text-slate-500' : ''}
              >
                <Wand2 size={15} />
                <span>Mode Otomatis</span>
              </Button>
              <Button
                variant={scheduleGenerationMode === "manual" ? 'primary' : 'ghost'}
                onClick={() => setScheduleGenerationMode && setScheduleGenerationMode("manual")}
                className={scheduleGenerationMode !== "manual" ? 'text-slate-500' : ''}
              >
                <Edit3 size={15} />
                <span>Mode Manual</span>
              </Button>
            </div>
          </div>

          {scheduleGenerationMode === "auto" ? (
            <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
                <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-[var(--ui-radius-small)] border-none">
                  <input type="checkbox" checked={strictCompetency} onChange={(e) => setStrictCompetency(e.target.checked)} className="accent-[var(--ui-primary)] cursor-pointer" />
                  <div>
                    <p className="text-sm font-bold text-slate-800">Strict Kompetensi Mapel</p>
                    <p className="text-xs text-slate-500">Hanya tempatkan guru pada mapel yang ada di kompetensinya.</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-[var(--ui-radius-small)] border-none">
                  <input type="checkbox" checked={specialWednesdayConstraint} onChange={(e) => setSpecialWednesdayConstraint(e.target.checked)} className="accent-[var(--ui-primary)] cursor-pointer" />
                  <div>
                    <p className="text-sm font-bold text-slate-800">Aturan Khusus Rabu (X TKJ/TKR)</p>
                    <p className="text-xs text-slate-500">Batasi hari Rabu hanya untuk KJD (TKJ) dan GT (TKR) setelah jam praktik oleh guru yang sama.</p>
                  </div>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 w-full xl:w-auto">
                <Button variant="danger" onClick={handleResetSchedule} className="w-full sm:w-auto flex items-center gap-1.5 cursor-pointer">
                  <Trash2 size={15} /> Kosongkan
                </Button>
                <Button onClick={handleGenerate} className="w-full sm:w-auto flex items-center gap-1.5 cursor-pointer">
                  <Settings size={15} /> Eksekusi Auto-Generate
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-emerald-50/70 border border-emerald-200/80 p-3.5 rounded-[var(--ui-radius-small)]">
              <div className="flex items-center gap-2.5 text-xs text-emerald-900 font-medium">
                <Edit3 size={18} className="text-emerald-600 shrink-0" />
                <div>
                  <strong>Mode Penataan Manual Aktif.</strong> Anda dapat mengklik langsung cell mana saja pada tabel jadwal di bawah atau menggeser (*drag & drop*) untuk menata slot mapel, guru, dan ruangan.
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button variant="danger" size="sm" onClick={handleResetSchedule} className="flex items-center gap-1.5 cursor-pointer">
                  <Trash2 size={14} /> Kosongkan
                </Button>
                <Button size="sm" onClick={() => openManualSlotModal && openManualSlotModal()} className="flex items-center gap-1.5 cursor-pointer">
                  <Plus size={14} /> Tambah / Edit Slot Manual
                </Button>
              </div>
            </div>
          )}
        </section>
      )}

      {/* READONLY NOTICE & WARNINGS */}
      {!(isSuperAdminRole(currentUser.role) || (currentUser.role ==="waka" && (currentUser.division ||"").toLowerCase() ==="kurikulum")) && (
        <div className="bg-slate-50 border-none text-slate-700 px-4 py-3 rounded-[var(--ui-radius-small)] flex items-center gap-2.5 shrink-0 shadow-sm text-xs font-medium print:hidden">
          <Info size={17} className="text-slate-500 shrink-0" />
          <div>
            <strong>Mode lihat saja.</strong> Generate & edit jadwal hanya tersedia untuk SuperAdmin atau Waka Kurikulum.
          </div>
        </div>
      )}
      {generationReadiness?.warnings?.length > 0 && (isSuperAdminRole(currentUser.role) || (currentUser.role ==="waka" && (currentUser.division ||"").toLowerCase() ==="kurikulum")) && (
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
        <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-[var(--ui-radius-small)] flex items-start gap-2.5 shrink-0 shadow-sm text-xs font-medium print:hidden">
          <AlertCircle size={17} className="text-rose-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            {typeof swapWarning ==='string' ? <><strong className="mr-1">Perhatian:</strong> {swapWarning}</> : swapWarning}
          </div>
        </div>
      )}

  {(() => {
    const availableClassesForDropdownAdmin = classes.filter(c => {
      if (scheduleFilterGrade !=="Semua" && !c.name.startsWith(scheduleFilterGrade +"")) return false;
      if (scheduleFilterMajor !=="Semua" && c.major !== scheduleFilterMajor) return false;
      return true;
    });

    const dayOptions = [{ label:"Semua Hari", value:"Semua" }, ...days.map(d => ({ label: d, value: d }))];
    const gradeOptions = [{ label:"Semua Tingkat", value:"Semua" }, { label:"Kelas X", value:"X" }, { label:"Kelas XI", value:"XI" }, { label:"Kelas XII", value:"XII" }];
    const majorOptions = [
      { label: "Semua Jurusan", value: "Semua" },
      ...(majors || []).map(m => {
        const val = typeof m === "string" ? m : (m?.name || m?.code || String(m || ""));
        const lbl = typeof m === "string" ? m : (m?.code || m?.name || String(m || ""));
        return { label: lbl || val, value: val };
      })
    ];

    const resultClasses = availableClassesForDropdownAdmin.filter(c => {
      if (scheduleFilterClass !=="Semua" && c.name !== scheduleFilterClass) return false;
      if (scheduleSearchQuery) {
        const query = scheduleSearchQuery.toLowerCase();
        const hasClass = c.name.toLowerCase().includes(query);
        const hasSubjectOrTeacher = schedule.some(s => s.className === c.name && (s.subject.toLowerCase().includes(query) || s.teacherCode.toLowerCase().includes(query)));
        if (!hasClass && !hasSubjectOrTeacher) return false;
      }
      return true;
    });

    return (
      <div className="ui-card flex flex-col flex-1 min-h-0 print:border-none print:shadow-none print:bg-transparent">
        <div className="flex flex-col h-full overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0 print:hidden">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700">Filter Jadwal:</span>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full md:w-auto">
              <div className="relative w-full sm:w-64">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Cari kelas atau mapel..." 
                  value={scheduleSearchQuery}
                  onChange={e => setScheduleSearchQuery && setScheduleSearchQuery(e.target.value)}
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
              </div>
            </div>
          </div>
          <div className="p-4 md:p-6 overflow-x-auto overflow-y-auto custom-scrollbar flex-1 min-w-0 bg-slate-50/30 print:block print:p-0 print:bg-transparent print:overflow-visible print-landscape">
              <div className="hidden print:flex w-full items-center justify-center bg-white border-b border-slate-300 py-3 mb-4">
                <h2 className="text-[14px] font-black uppercase tracking-wide">
                  JADWAL PELAJARAN {scheduleFilterGrade !== "Semua" ? `TINGKAT ${scheduleFilterGrade}` : ""}
                </h2>
              </div>

              <div className="print:block print:px-6 print:pt-4 print:pb-8 print:min-h-[calc(100vh-80px)]">
                {renderScheduleTable(resultClasses, !(isSuperAdminRole(currentUser.role) || (currentUser.role ==="waka" && (currentUser.division ||"").toLowerCase() ==="kurikulum")), scheduleFilterDay)}
              </div>
          </div>
        </div>
      </div>
    );
  })()}

      {/* MODAL PENATAAN SLOT MANUAL SMART */}
      {manualSlotModal?.isOpen && (
        <Modal
          isOpen={manualSlotModal.isOpen}
          onClose={closeManualSlotModal}
          title="Penataan Slot Jadwal Manual"
          subtitle={`Atur mata pelajaran, guru, dan ruangan secara manual.`}
        >
          <div className="flex flex-col gap-4 p-1">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Hari</label>
                <UISelect value={slotFormData.day} onChange={(e) => setSlotFormData({ ...slotFormData, day: e.target.value })}>
                  {days.map(d => <option key={d} value={d}>{d}</option>)}
                </UISelect>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Jam Ke (Slot)</label>
                <UISelect value={slotFormData.slotId} onChange={(e) => setSlotFormData({ ...slotFormData, slotId: e.target.value })}>
                  {(timeSlots[slotFormData.day] || []).filter(s => !s.isBreak).map(s => <option key={s.id} value={s.id}>{s.label || `Jam ke-${s.id}`}</option>)}
                </UISelect>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Kelas Target</label>
                <UISelect value={slotFormData.className} onChange={(e) => setSlotFormData({ ...slotFormData, className: e.target.value })}>
                  {classes.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                </UISelect>
              </div>
            </div>

            {/* Quick Pick from Class Teaching Loads */}
            {classTeachingLoads.length > 0 && (
              <div className="bg-amber-50/60 border border-amber-200/80 p-3 rounded-[var(--ui-radius-small)] flex flex-col gap-2">
                <div className="text-[11px] font-bold text-amber-900 flex items-center gap-1.5">
                  <Sparkles size={14} className="text-amber-600 shrink-0" />
                  <span>Pilihan Cepat Beban Mengajar ({slotFormData.className}):</span>
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                  {classTeachingLoads.map(load => {
                    const teacher = teachers.find(t => t.code === load.teacherCode);
                    const teacherName = teacher ? teacher.name : load.teacherCode;
                    const isSelected = slotFormData.subject === load.subject && slotFormData.teacherCode === load.teacherCode;
                    return (
                      <button
                        key={load.id || `${load.subject}-${load.teacherCode}`}
                        type="button"
                        onClick={() => {
                          setSlotFormData(prev => ({
                            ...prev,
                            subject: load.subject || "",
                            teacherCode: load.teacherCode || ""
                          }));
                        }}
                        className={`text-[11px] px-2.5 py-1 rounded-[var(--ui-radius-small)] border font-medium transition-all text-left flex items-center gap-1 cursor-pointer ${
                          isSelected 
                            ? "bg-[var(--ui-primary)] text-white border-transparent font-bold shadow-sm"
                            : "bg-white border-amber-200 text-slate-800 hover:border-[var(--ui-primary)] hover:bg-white"
                        }`}
                      >
                        <span>{load.subject}</span>
                        <span className="opacity-75">({load.teacherCode})</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Mata Pelajaran</label>
              <UISelect 
                value={slotFormData.subject} 
                onChange={(e) => {
                  const val = e.target.value;
                  const matchingLoad = classTeachingLoads.find(l => l.subject === val);
                  setSlotFormData(prev => ({
                    ...prev,
                    subject: val,
                    teacherCode: matchingLoad ? matchingLoad.teacherCode : prev.teacherCode
                  }));
                }}
              >
                <option value="">-- Pilih Mata Pelajaran --</option>
                {subjects.map(s => <option key={s.id || s.name} value={s.name}>{s.name} ({s.code || '-'})</option>)}
              </UISelect>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Guru Pengampu (Status Ketersediaan)</label>
                <UISelect value={slotFormData.teacherCode} onChange={(e) => setSlotFormData({ ...slotFormData, teacherCode: e.target.value })}>
                  <option value="">-- Pilih Guru --</option>
                  {teachers.map(t => {
                    const teachingClass = currentSlotOccupancy.get(t.code);
                    const isBusyInOtherClass = teachingClass && teachingClass !== slotFormData.className;
                    const isBusyInThisClass = teachingClass && teachingClass === slotFormData.className;
                    
                    let statusText = "✓ Tersedia";
                    if (isBusyInOtherClass) statusText = `⚠️ Bentrok di ${teachingClass}`;
                    else if (isBusyInThisClass) statusText = `✓ Mengajar di ${teachingClass}`;

                    return (
                      <option key={t.code} value={t.code}>
                        {t.name} ({t.code}) — {statusText}
                      </option>
                    );
                  })}
                </UISelect>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Ruangan</label>
                <UISelect value={slotFormData.roomId} onChange={(e) => setSlotFormData({ ...slotFormData, roomId: e.target.value })}>
                  <option value="">-- Ruangan Teori Default --</option>
                  {rooms.map(r => <option key={r.id} value={r.id}>{r.name} ({r.type})</option>)}
                </UISelect>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-200 mt-2">
              <Button variant="danger" type="button" onClick={() => deleteManualSlot && deleteManualSlot(slotFormData.day, slotFormData.slotId, slotFormData.className)}>
                <Trash2 size={14} /> Kosongkan Slot
              </Button>
              <div className="flex items-center gap-2">
                <Button variant="outline" type="button" onClick={closeManualSlotModal}>
                  Batal
                </Button>
                <Button type="button" onClick={() => saveManualSlot && saveManualSlot(slotFormData)}>
                  Simpan Slot
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
