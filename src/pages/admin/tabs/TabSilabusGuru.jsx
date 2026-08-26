import React from 'react';
import { UISelect, Button } from '../../../components/ui.jsx';
import { 
  FileText, Download, RefreshCw, Upload, BookOpen, BookOpenText, 
  ChevronRight, Edit2, Trash2, CheckCircle2, Sparkles, Plus,
  Layers, Target, ListChecks, HelpCircle, FileCheck
} from 'lucide-react';

export default function TabSilabusGuru(props) {
  const { 
    syllabuses = [], 
    currentUser = {}, 
    subjects = [], 
    selectedTeacherSilabusSubject, 
    selectedTeacherSilabusId, 
    syllabusCategories = [], 
    newSyllabusSubject, 
    setNewSyllabusSubject, 
    newSyllabusTitle, 
    setNewSyllabusTitle, 
    newSyllabusCategory, 
    setNewSyllabusCategory, 
    newSyllabusGrade = 'X', 
    setNewSyllabusGrade, 
    newSyllabusSemester = 'Ganjil', 
    setNewSyllabusSemester, 
    newSyllabusObjectives, 
    setNewSyllabusObjectives, 
    newSyllabusMaterials, 
    setNewSyllabusMaterials, 
    newSyllabusNotes, 
    setNewSyllabusNotes, 
    ensureDatabaseReadyForWrite, 
    addSyllabus, 
    setSelectedTeacherSilabusSubject, 
    setSelectedTeacherSilabusId, 
    showNotification, 
    openTeacherGuide, 
    downloadTeacherTemplate, 
    openModal, 
    handleRemoveSyllabusSafe 
  } = props;

  const userCode = String(currentUser?.code || currentUser?.username || currentUser?.id || '').trim().toLowerCase();
  const userName = String(currentUser?.name || '').trim().toLowerCase();

  const mySyllabuses = syllabuses
    .filter((s) => {
      const sCode = String(s.teacherCode || '').trim().toLowerCase();
      const sName = String(s.teacherName || '').trim().toLowerCase();
      return (userCode && sCode === userCode) || (userName && sName === userName);
    })
    .sort((a, b) =>
      `${a.subjectName || "" } ${a.title || ""}`.localeCompare(
        `${b.subjectName || "" } ${b.title || ""}`, "id",
        { sensitivity: "base" },
      ),
    );

  const uniqueSubjects = React.useMemo(() => {
    // 1. If explicit availableSubjects passed from parent
    if (Array.isArray(props.availableSubjects) && props.availableSubjects.length > 0) {
      return props.availableSubjects;
    }

    const set = new Set();

    // 2. From teachingLoads
    (props.teachingLoads || []).forEach((l) => {
      const codes = String(l.teacherCode || '').split(',').map((c) => c.trim().toLowerCase());
      const loadName = String(l.teacherName || '').trim().toLowerCase();
      if (
        (userCode && codes.includes(userCode)) ||
        (userName && loadName === userName)
      ) {
        if (l.subject) set.add(l.subject);
        if (l.subjectName) set.add(l.subjectName);
      }
    });

    // 3. From schedule (jadwal KBM)
    (props.schedule || []).forEach((s) => {
      const sCode = String(s.teacher || s.teacherCode || '').trim().toLowerCase();
      const sName = String(s.teacherName || '').trim().toLowerCase();
      if ((userCode && sCode === userCode) || (userName && sName === userName)) {
        if (s.subject) set.add(s.subject);
        if (s.mapel) set.add(s.mapel);
      }
    });

    // 4. From teachers master data
    const currentTeacher = (props.teachers || []).find((t) => {
      const tCode = String(t.code || t.id || '').trim().toLowerCase();
      const tName = String(t.name || '').trim().toLowerCase();
      return (userCode && tCode === userCode) || (userName && tName === userName);
    });
    if (currentTeacher) {
      if (currentTeacher.mapel) {
        String(currentTeacher.mapel).split(',').forEach((m) => m.trim() && set.add(m.trim()));
      }
      if (currentTeacher.subject) {
        String(currentTeacher.subject).split(',').forEach((m) => m.trim() && set.add(m.trim()));
      }
      if (Array.isArray(currentTeacher.subjects)) {
        currentTeacher.subjects.forEach((m) => m && set.add(m));
      }
    }

    // 5. From existing syllabuses
    (syllabuses || []).forEach((s) => {
      const sCode = String(s.teacherCode || '').trim().toLowerCase();
      if (userCode && sCode === userCode) {
        if (s.subjectName) set.add(s.subjectName);
      }
    });

    const list = Array.from(set).filter(Boolean).sort();
    if (list.length > 0) return list;

    // Fallback: If no specific teaching loads found, show all subjects
    return Array.from(new Set((subjects || []).map((s) => s.name || s.subjectName).filter(Boolean))).sort();
  }, [props.availableSubjects, props.teachingLoads, props.schedule, props.teachers, syllabuses, subjects, userCode, userName]);

  // Automatically select the first assigned subject if not set or invalid
  React.useEffect(() => {
    if (uniqueSubjects.length > 0 && (!newSyllabusSubject || !uniqueSubjects.includes(newSyllabusSubject))) {
      setNewSyllabusSubject(uniqueSubjects[0]);
    }
  }, [uniqueSubjects, newSyllabusSubject, setNewSyllabusSubject]);
  
  const myGroupedSyllabuses = mySyllabuses.reduce((acc, item) => {
    const key = item.subjectName || "Tanpa Mata Pelajaran";
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  const mySubjectNames = Object.keys(myGroupedSyllabuses).sort((a, b) =>
    a.localeCompare(b, "id", { sensitivity: "base" }),
  );

  const activeTeacherSubject = mySubjectNames.includes(selectedTeacherSilabusSubject)
    ? selectedTeacherSilabusSubject
    : mySubjectNames[0] || "";

  const activeTeacherMeetings = activeTeacherSubject
    ? myGroupedSyllabuses[activeTeacherSubject] || []
    : [];

  const activeTeacherSilabus = activeTeacherMeetings.find(
    (item) => item.id === selectedTeacherSilabusId,
  ) || activeTeacherMeetings[0] || null;

  const activeTeacherIndex = activeTeacherSilabus
    ? Math.max(
      activeTeacherMeetings.findIndex((item) => item.id === activeTeacherSilabus.id),
      0,
    )
    : -1;

  const activeTeacherCategory = activeTeacherSilabus
    ? syllabusCategories?.find((c) => c.id === activeTeacherSilabus.categoryId)
    : null;

  const nextTeacherMeetingNumber = (newSyllabusSubject
    ? myGroupedSyllabuses[newSyllabusSubject]?.length || 0
    : activeTeacherMeetings.length) + 1;

  const materialsCount = (newSyllabusMaterials || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean).length;

  return (
    <div className="animate-in fade-in duration-300">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* ── LEFT FORM: TAMBAH PERTEMUAN BARU (7 cols) ── */}
        <div className="lg:col-span-5 p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-4 h-fit">
          <div className="border-b border-slate-100 pb-3">
            <span className="text-[10px] font-black uppercase tracking-wider text-[var(--ui-primary)]">
              Perencanaan KBM
            </span>
            <h3 className="text-base font-black text-slate-800 flex items-center gap-1.5 mt-0.5">
              <Plus size={18} className="text-[var(--ui-primary)]" />
              Tambah Pertemuan Baru
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Isi data pokok pertemuan, tujuan pembelajaran, dan materi yang akan diajarkan.
            </p>
          </div>

          <div className="space-y-3.5">
            {/* 1. Mata Pelajaran */}
            <div>
              <div className="flex items-center justify-between gap-2 mb-1">
                <label className="text-xs font-bold text-slate-700">
                  Mata Pelajaran <span className="text-rose-500">*</span>
                </label>
                {activeTeacherSubject && newSyllabusSubject !== activeTeacherSubject && (
                  <button
                    type="button"
                    onClick={() => setNewSyllabusSubject(activeTeacherSubject)}
                    className="text-[10px] font-bold text-[var(--ui-primary)] hover:underline cursor-pointer bg-transparent border-none p-0"
                  >
                    Gunakan {activeTeacherSubject}
                  </button>
                )}
              </div>
              <UISelect
                value={newSyllabusSubject}
                onChange={(e) => setNewSyllabusSubject(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold focus:outline-none focus:border-[var(--ui-primary)]"
              >
                <option value="">-- Pilih Mata Pelajaran --</option>
                {uniqueSubjects.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </UISelect>
              {uniqueSubjects.length > 0 && (
                <p className="text-[10px] text-emerald-700 font-semibold mt-1">
                  ✓ {uniqueSubjects.length} mata pelajaran sesuai penugasan mengajar Anda.
                </p>
              )}
            </div>

            {/* 2. Judul Pertemuan / BAB */}
            <div>
              <div className="flex items-center justify-between gap-2 mb-1">
                <label className="text-xs font-bold text-slate-700">
                  Judul Pertemuan / BAB <span className="text-rose-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setNewSyllabusTitle(`Pertemuan ${nextTeacherMeetingNumber}: `)}
                  className="px-2 py-0.5 rounded-[var(--ui-radius-small)] bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-black cursor-pointer border-none"
                >
                  Auto: Pertemuan {nextTeacherMeetingNumber}
                </button>
              </div>
              <input
                type="text"
                value={newSyllabusTitle}
                onChange={(e) => setNewSyllabusTitle(e.target.value)}
                placeholder="Contoh: Pertemuan 1: Pengenalan Konsep Vektor"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold focus:outline-none focus:border-[var(--ui-primary)]"
              />
            </div>

            {/* 3. Kelas, Semester & Kategori */}
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Kelas (Tingkat)
                </label>
                <UISelect
                  value={newSyllabusGrade}
                  onChange={(e) => setNewSyllabusGrade(e.target.value)}
                  className="w-full px-2 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold focus:outline-none"
                >
                  <option value="X">Kelas X</option>
                  <option value="XI">Kelas XI</option>
                  <option value="XII">Kelas XII</option>
                </UISelect>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Semester
                </label>
                <UISelect
                  value={newSyllabusSemester}
                  onChange={(e) => setNewSyllabusSemester(e.target.value)}
                  className="w-full px-2 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold focus:outline-none"
                >
                  <option value="Ganjil">Ganjil</option>
                  <option value="Genap">Genap</option>
                </UISelect>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Kategori
                </label>
                <UISelect
                  value={newSyllabusCategory}
                  onChange={(e) => setNewSyllabusCategory(e.target.value)}
                  className="w-full px-2 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold focus:outline-none truncate"
                >
                  <option value="">-- Umum --</option>
                  {syllabusCategories?.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </UISelect>
              </div>
            </div>

            {/* 4. Tujuan Pembelajaran */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Tujuan Pembelajaran
              </label>
              <input
                type="text"
                value={newSyllabusObjectives}
                onChange={(e) => setNewSyllabusObjectives(e.target.value)}
                placeholder="Contoh: Siswa mampu membedakan konsep vektor dan bitmap"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium focus:outline-none focus:border-[var(--ui-primary)]"
              />
            </div>

            {/* 5. Materi Pembelajaran (Per Baris) */}
            <div>
              <div className="flex items-center justify-between gap-2 mb-1">
                <label className="text-xs font-bold text-slate-700">
                  Materi Pokok Pembelajaran
                </label>
                <span className="text-[10px] font-black text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                  {materialsCount} Poin Materi
                </span>
              </div>
              <textarea
                value={newSyllabusMaterials}
                onChange={(e) => setNewSyllabusMaterials(e.target.value)}
                placeholder="Tulis materi per baris:&#10;1. Pengertian dasar grafis vektor&#10;2. Pengertian grafis bitmap&#10;3. Perbandingan format file"
                rows={3}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium focus:outline-none focus:border-[var(--ui-primary)] resize-none"
              />
              <p className="text-[10px] text-slate-400 font-medium mt-1">
                Tulis satu materi per baris. Sistem otomatis menyusunnya sebagai poin A, B, C.
              </p>
            </div>

            {/* 6. Catatan (Opsional) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Catatan Tambahan (Opsional)
              </label>
              <input
                type="text"
                value={newSyllabusNotes || ""}
                onChange={(e) => setNewSyllabusNotes(e.target.value)}
                placeholder="Contoh: Remedial, refleksi, atau bahan praktikum"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium focus:outline-none focus:border-[var(--ui-primary)]"
              />
            </div>

            {/* Save Button */}
            <button
              type="button"
              onClick={() => {
                if (ensureDatabaseReadyForWrite && !ensureDatabaseReadyForWrite("menyimpan silabus")) return;
                if (newSyllabusTitle.trim() && newSyllabusSubject) {
                  const newItemId = Date.now().toString();
                  addSyllabus({
                    id: newItemId,
                    teacherCode: currentUser.code,
                    subjectName: newSyllabusSubject,
                    title: newSyllabusTitle.trim(),
                    categoryId: newSyllabusCategory || null,
                    gradeSemester: `${newSyllabusGrade} / ${newSyllabusSemester}`,
                    objectives: newSyllabusObjectives.trim(),
                    materials: newSyllabusMaterials.trim(),
                    notes: (newSyllabusNotes || "").trim()
                  });
                  setSelectedTeacherSilabusSubject(newSyllabusSubject);
                  setSelectedTeacherSilabusId(newItemId);
                  setNewSyllabusTitle("");
                  setNewSyllabusCategory("");
                  setNewSyllabusObjectives("");
                  setNewSyllabusMaterials("");
                  if (setNewSyllabusNotes) setNewSyllabusNotes("");
                  showNotification("Pertemuan silabus berhasil ditambahkan!");
                } else {
                  showNotification("Harap pilih mata pelajaran dan isi judul pertemuan!", "warning");
                }
              }}
              className="w-full flex items-center justify-center gap-1.5 py-2.5 px-4 bg-[var(--ui-primary)] hover:opacity-90 text-white text-xs font-black rounded-2xl shadow-xs transition-all cursor-pointer border-none"
            >
              <CheckCircle2 size={16} />
              <span>Simpan Pertemuan</span>
            </button>
          </div>
        </div>

        {/* ── RIGHT LIST: DAFTAR SILABUS SAYA (7 cols) ── */}
        <div className="lg:col-span-7 p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-black text-slate-800">Silabus &amp; RPP Saya</h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Pilih mata pelajaran untuk melihat dan mengedit rincian pertemuan.
              </p>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              <Button
                variant="outline"
                onClick={openTeacherGuide}
                className="px-2.5 py-1.5 rounded-2xl text-xs font-bold flex items-center gap-1 cursor-pointer"
                title="Panduan"
              >
                <HelpCircle size={13} />
                <span className="hidden sm:inline">Panduan</span>
              </Button>
              <Button
                variant="outline"
                onClick={downloadTeacherTemplate}
                className="px-2.5 py-1.5 rounded-2xl text-xs font-bold flex items-center gap-1 cursor-pointer"
                title="Unduh Template Excel"
              >
                <Download size={13} />
                <span className="hidden sm:inline">Template</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => openModal("bulk", "add")}
                className="px-2.5 py-1.5 rounded-2xl text-xs font-bold flex items-center gap-1 cursor-pointer"
                title="Import Excel"
              >
                <Upload size={13} />
                <span>Import</span>
              </Button>
              <button
                type="button"
                onClick={() => openModal("silabus_batch", "add")}
                className="px-3 py-1.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center gap-1 shadow-xs transition-all cursor-pointer border-none"
              >
                <RefreshCw size={13} />
                <span>Isi Sekaligus</span>
              </button>
            </div>
          </div>

          {mySyllabuses.length === 0 ? (
            <div className="text-center py-16 text-slate-400 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/60 space-y-2">
              <BookOpen size={40} className="mx-auto text-slate-300" />
              <h4 className="font-black text-sm text-slate-700">Belum Ada Silabus / Pertemuan</h4>
              <p className="text-xs max-w-xs mx-auto leading-relaxed">
                Silakan isi formulir di sebelah kiri untuk menambah pertemuan baru atau gunakan tombol <strong>Import</strong>.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              {/* Mapel List (4 cols) */}
              <div className="md:col-span-4 rounded-2xl bg-slate-50 p-2.5 space-y-1.5">
                <div className="flex items-center justify-between px-2 py-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Mata Pelajaran
                  </span>
                  <span className="text-[10px] font-bold text-slate-500">
                    {mySubjectNames.length} Mapel
                  </span>
                </div>

                <div className="space-y-1 max-h-[420px] overflow-y-auto pr-0.5">
                  {mySubjectNames.map((subjectName) => {
                    const subjectItems = myGroupedSyllabuses[subjectName] || [];
                    const isActive = activeTeacherSubject === subjectName;
                    return (
                      <button
                        key={subjectName}
                        type="button"
                        onClick={() => {
                          setSelectedTeacherSilabusSubject(subjectName);
                          setSelectedTeacherSilabusId(subjectItems[0]?.id || "");
                        }}
                        className={`w-full rounded-2xl p-2.5 text-left transition-all flex items-center justify-between gap-2 cursor-pointer border-none ${
                          isActive 
                            ? "bg-[var(--ui-primary)] text-white shadow-xs" 
                            : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200/60"
                        }`}
                      >
                        <div className="min-w-0">
                          <p className="font-black text-xs leading-snug truncate">
                            {subjectName}
                          </p>
                          <p className={`text-[10px] font-bold mt-0.5 ${isActive ? "text-white/80" : "text-slate-400"}`}>
                            {subjectItems.length} Pertemuan
                          </p>
                        </div>
                        <ChevronRight size={14} className={isActive ? "text-white" : "text-slate-300"} />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Meeting Detail & Tabs (8 cols) */}
              <div className="md:col-span-8 rounded-2xl border border-slate-200 p-4 space-y-3.5">
                {/* Meeting Header */}
                <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                  <div>
                    <h4 className="font-black text-slate-800 text-sm">
                      {activeTeacherSubject || "Pilih Mata Pelajaran"}
                    </h4>
                    <p className="text-[11px] font-medium text-slate-500">
                      Total: {activeTeacherMeetings.length} Pertemuan
                    </p>
                  </div>

                  {activeTeacherSilabus && (
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        onClick={() => openModal("silabus", "edit", activeTeacherSilabus)}
                        className="px-2 py-1 rounded-[var(--ui-radius-control)] text-xs font-bold flex items-center gap-1 cursor-pointer"
                        title="Edit Pertemuan"
                      >
                        <Edit2 size={12} />
                        <span>Edit</span>
                      </Button>
                      <Button
                        variant="danger"
                        onClick={() => handleRemoveSyllabusSafe(activeTeacherSilabus.id, activeTeacherSilabus)}
                        className="p-1 rounded-[var(--ui-radius-control)] text-xs cursor-pointer"
                        title="Hapus Pertemuan"
                      >
                        <Trash2 size={13} />
                      </Button>
                    </div>
                  )}
                </div>

                {/* Horizontal Meeting Tabs */}
                <div className="flex gap-1.5 overflow-x-auto pb-1">
                  {activeTeacherMeetings.map((item, index) => {
                    const isActive = activeTeacherSilabus?.id === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setSelectedTeacherSilabusId(item.id)}
                        className={`shrink-0 px-2.5 py-1.5 rounded-[var(--ui-radius-control)] text-xs font-black transition-all cursor-pointer border-none ${
                          isActive 
                            ? "bg-[var(--ui-primary)] text-white shadow-xs" 
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        Pertemuan {index + 1}
                      </button>
                    );
                  })}
                </div>

                {/* Active Meeting Content */}
                {activeTeacherSilabus ? (
                  <div className="space-y-3 p-3.5 rounded-2xl bg-slate-50/70 border border-slate-200">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="px-2 py-0.5 rounded-[var(--ui-radius-small)] bg-[var(--ui-primary)] text-white text-[10px] font-black uppercase">
                        Pertemuan {activeTeacherIndex + 1}
                      </span>
                      <span className="px-2 py-0.5 rounded-[var(--ui-radius-small)] bg-white border border-slate-200 text-slate-600 text-[10px] font-bold">
                        {activeTeacherSilabus.gradeSemester || "-"}
                      </span>
                      {activeTeacherCategory && (
                        <span className="px-2 py-0.5 rounded-[var(--ui-radius-small)] bg-white border border-slate-200 text-slate-600 text-[10px] font-bold">
                          {activeTeacherCategory.name}
                        </span>
                      )}
                    </div>

                    <h5 className="font-black text-slate-800 text-sm leading-snug">
                      {activeTeacherSilabus.title || `Pertemuan ${activeTeacherIndex + 1}`}
                    </h5>

                    {/* Objectives */}
                    <div className="p-3 rounded-[var(--ui-radius-control)] bg-white border border-slate-200 space-y-1">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                        Tujuan Pembelajaran
                      </p>
                      <p className="text-xs font-bold text-slate-700 leading-relaxed">
                        {activeTeacherSilabus.objectives || "-"}
                      </p>
                    </div>

                    {/* Materials List */}
                    <div className="p-3 rounded-[var(--ui-radius-control)] bg-white border border-slate-200 space-y-1.5">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                        Materi Pembelajaran
                      </p>
                      {activeTeacherSilabus.materials ? (
                        <div className="space-y-1">
                          {String(activeTeacherSilabus.materials)
                            .split("\n")
                            .map((line) => line.trim())
                            .filter(Boolean)
                            .map((line, index) => (
                              <div
                                key={`${activeTeacherSilabus.id}-mat-${index}`}
                                className="flex items-start gap-2 p-1.5 rounded-[var(--ui-radius-small)] bg-slate-50 text-xs font-semibold text-slate-700"
                              >
                                <span className="font-black text-[var(--ui-primary)] shrink-0">
                                  {String.fromCharCode(65 + index)}.
                                </span>
                                <span>{line}</span>
                              </div>
                            ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 italic">Belum ada rincian materi.</p>
                      )}
                    </div>

                    {/* Notes */}
                    {activeTeacherSilabus.notes && (
                      <div className="p-2.5 rounded-[var(--ui-radius-control)] bg-amber-50 border border-amber-200 text-xs font-medium text-amber-900">
                        <strong className="font-black">Catatan:</strong> {activeTeacherSilabus.notes}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="py-8 text-center text-slate-400 text-xs">
                    Pilih salah satu pertemuan di atas untuk melihat detail.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
