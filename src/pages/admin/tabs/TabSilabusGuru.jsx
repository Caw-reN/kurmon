import React from'react';
import { UISelect, Button } from'../../../components/ui.jsx';
import { FileText, Download, RefreshCw, Upload, BookOpen, BookOpenText, ChevronRight, Edit2, Trash2 } from'lucide-react';

export default function TabSilabusGuru(props) {
  const { syllabuses, currentUser, subjects, selectedTeacherSilabusSubject, selectedTeacherSilabusId, syllabusCategories, newSyllabusSubject, setNewSyllabusSubject, setNewSyllabusTitle, newSyllabusTitle, newSyllabusCategory, setNewSyllabusCategory, newSyllabusGrade, setNewSyllabusGrade, newSyllabusSemester, setNewSyllabusSemester, newSyllabusObjectives, setNewSyllabusObjectives, newSyllabusMaterials, setNewSyllabusMaterials, newSyllabusNotes, setNewSyllabusNotes, ensureDatabaseReadyForWrite, addSyllabus, setSelectedTeacherSilabusSubject, setSelectedTeacherSilabusId, showNotification, openTeacherGuide, downloadTeacherTemplate, openModal, handleRemoveSyllabusSafe } = props;
  const { ...allProps } = props;
  // Destructure specific props as needed in the component

  const mySyllabuses = syllabuses
    .filter((s) => s.teacherCode === currentUser.code)
    .sort((a, b) =>
      `${a.subjectName ||""} ${a.title ||""}`.localeCompare(
        `${b.subjectName ||""} ${b.title ||""}`,"id",
        { sensitivity:"base" },
      ),
    );
  const uniqueSubjects = Array.from(new Set(subjects.map((s) => s.name)));
  const myGroupedSyllabuses = mySyllabuses.reduce((acc, item) => {
    const key = item.subjectName ||"Tanpa Mata Pelajaran";
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});
  const mySubjectNames = Object.keys(myGroupedSyllabuses).sort((a, b) =>
    a.localeCompare(b,"id", { sensitivity:"base" }),
  );
  const activeTeacherSubject = mySubjectNames.includes(
    selectedTeacherSilabusSubject,
  )
    ? selectedTeacherSilabusSubject
    : mySubjectNames[0] ||"";
  const activeTeacherMeetings = activeTeacherSubject
    ? myGroupedSyllabuses[activeTeacherSubject] || []
    : [];
  const activeTeacherSilabus =
    activeTeacherMeetings.find(
      (item) => item.id === selectedTeacherSilabusId,
    ) ||
    activeTeacherMeetings[0] ||
    null;
  const activeTeacherIndex = activeTeacherSilabus
    ? Math.max(
      activeTeacherMeetings.findIndex(
        (item) => item.id === activeTeacherSilabus.id,
      ),
      0,
    )
    : -1;
  const activeTeacherCategory = activeTeacherSilabus
    ? syllabusCategories?.find(
      (c) => c.id === activeTeacherSilabus.categoryId,
    )
    : null;
  const nextTeacherMeetingNumber =
    (newSyllabusSubject
      ? myGroupedSyllabuses[newSyllabusSubject]?.length || 0
      : activeTeacherMeetings.length) + 1;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Form: Add Syllabus */}
        <div className="bg-white rounded-[var(--ui-radius-card)] p-5 md:p-6 shadow-sm border-none h-fit">
          <div className="mb-5 border-b border-slate-200 pb-4">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[var(--ui-primary)]">
              Form cepat guru
            </p>
            <h3 className="mt-1 text-xl font-black text-slate-800">
              Tambah Pertemuan Baru
            </h3>
            <p className="mt-1 text-xs font-bold text-slate-500">
              Pilih mapel, isi judul pertemuan, lalu tulis materi per
              baris.
            </p>
          </div>
          <div className="space-y-5">
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 block">
                  Pilih Mata Pelajaran
                </label>
                {activeTeacherSubject &&
                  newSyllabusSubject !== activeTeacherSubject && (
                    <Button variant="outline"
                      type="button"
                      onClick={() =>setNewSyllabusSubject(activeTeacherSubject)
                      }
                      className="rounded-[var(--ui-radius-small)] border-none bg-slate-50 px-2.5 py-1 text-[10px] font-black text-slate-500 hover:bg-white hover:text-[var(--ui-primary)]"
                    >
                      Pakai mapel aktif</Button>
                  )}
              </div>
              <UISelect
                value={newSyllabusSubject}
                onChange={(e) => setNewSyllabusSubject(e.target.value)}
                className="w-full border-none bg-slate-50 p-3.5 rounded-[var(--ui-radius-small)] text-sm font-bold focus:bg-white focus:outline-[var(--ui-primary)]"
              >
                <option value="">-- Pilih Mapel --</option>
                {uniqueSubjects.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </UISelect>
            </div>
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 block">
                  Judul Pertemuan / BAB
                </label>
                <Button variant="outline"
                  type="button"
                  onClick={() =>setNewSyllabusTitle(
                      `Pertemuan ${nextTeacherMeetingNumber}: `,
                    )
                  }
                  className="rounded-[var(--ui-radius-small)] border-none bg-slate-50 px-2.5 py-1 text-[10px] font-black text-slate-500 hover:bg-white hover:text-[var(--ui-primary)]"
                >
                  Pertemuan {nextTeacherMeetingNumber}</Button>
              </div>
              <input
                type="text"
                value={newSyllabusTitle}
                onChange={(e) => setNewSyllabusTitle(e.target.value)}
                placeholder="Contoh: Pertemuan 1: Pengenalan Vektor dan Bitmap"
                className="w-full border-none bg-slate-50 p-3.5 rounded-[var(--ui-radius-small)] text-sm font-bold focus:bg-white focus:outline-[var(--ui-primary)] placeholder:text-slate-400"
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">
                Kategori Silabus
              </label>
              <UISelect
                value={newSyllabusCategory}
                onChange={(e) => setNewSyllabusCategory(e.target.value)}
                className="w-full border-none bg-slate-50 p-3.5 rounded-[var(--ui-radius-small)] text-sm font-bold focus:bg-white focus:outline-[var(--ui-primary)]"
              >
                <option value="">-- Tanpa Kategori --</option>
                {syllabusCategories?.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </UISelect>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">
                  Kelas (Tingkat)
                </label>
                <UISelect
                  value={newSyllabusGrade}
                  onChange={(e) => setNewSyllabusGrade(e.target.value)}
                  className="w-full border-none bg-slate-50 p-3.5 rounded-[var(--ui-radius-small)] text-sm font-bold focus:bg-white focus:outline-[var(--ui-primary)]"
                >
                  <option value="X">Kelas X</option>
                  <option value="XI">Kelas XI</option>
                  <option value="XII">Kelas XII</option>
                </UISelect>
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">
                  Semester
                </label>
                <UISelect
                  value={newSyllabusSemester}
                  onChange={(e) => setNewSyllabusSemester(e.target.value)}
                  className="w-full border-none bg-slate-50 p-3.5 rounded-[var(--ui-radius-small)] text-sm font-bold focus:bg-white focus:outline-[var(--ui-primary)]"
                >
                  <option value="Ganjil">Semester Ganjil</option>
                  <option value="Genap">Semester Genap</option>
                </UISelect>
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">
                  Tujuan Pembelajaran
                </label>
                <input
                  type="text"
                  value={newSyllabusObjectives}
                  onChange={(e) =>
                    setNewSyllabusObjectives(e.target.value)
                  }
                  placeholder="Contoh: Siswa dapat memahami..."
                  className="w-full border-none bg-slate-50 p-3.5 rounded-[var(--ui-radius-small)] text-sm font-bold focus:bg-white focus:outline-[var(--ui-primary)] placeholder:text-slate-400"
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 block">
                  Materi Pembelajaran
                </label>
                <span className="text-[10px] font-black text-slate-400">
                  {
                    newSyllabusMaterials
                      .split("\n")
                      .map((line) => line.trim())
                      .filter(Boolean).length
                  }{""}
                  poin
                </span>
              </div>
              <textarea
                value={newSyllabusMaterials}
                onChange={(e) => setNewSyllabusMaterials(e.target.value)}
                placeholder="Konsep grafis berbasis vektor...&#10;Konsep grafis berbasis bitmap..."
                className="w-full border-none bg-slate-50 p-3.5 rounded-[var(--ui-radius-small)] text-sm font-bold focus:bg-white focus:outline-[var(--ui-primary)] placeholder:text-slate-400 min-h-[100px]"
              />
              <p className="mt-1.5 text-[10px] font-bold text-slate-400 ml-1">
                Tulis satu materi per baris. Sistem akan menampilkannya
                sebagai poin A, B, C.
              </p>
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">
                Catatan (Opsional)
              </label>
              <textarea
                value={newSyllabusNotes ||""}
                onChange={(e) => setNewSyllabusNotes(e.target.value)}
                placeholder="Contoh: Remedial, refleksi, atau pengayaan"
                className="w-full border-none bg-slate-50 p-3.5 rounded-[var(--ui-radius-small)] text-sm font-bold focus:bg-white focus:outline-[var(--ui-primary)] placeholder:text-slate-400 min-h-[80px]"
              />
            </div>

            <Button variant="outline"
              onClick={() =>{
                if (!ensureDatabaseReadyForWrite("menyimpan silabus"))
                  return;
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
                    notes: newSyllabusNotes.trim()
                  });
                  setSelectedTeacherSilabusSubject(newSyllabusSubject);
                  setSelectedTeacherSilabusId(newItemId);
                  setNewSyllabusTitle("");
                  setNewSyllabusCategory("");
                  setNewSyllabusObjectives("");
                  setNewSyllabusMaterials("");
                  setNewSyllabusNotes("");
                  showNotification("Silabus berhasil ditambahkan!");
                } else {
                  showNotification("Harap pilih mata pelajaran dan isi judul materi!","warning",
                  );
                }
              }}
              className="w-full bg-[var(--ui-primary)] text-white font-black py-4 rounded-[var(--ui-radius-small)] hover:opacity-90 transition-colors shadow-sm mt-2 cursor-pointer border-none"
            >
              Simpan Materi</Button>
          </div>
        </div>

        {/* Right List: Teacher's Syllabuses */}
        <div className="lg:col-span-2 bg-white rounded-[var(--ui-radius-card)] p-5 md:p-6 shadow-sm border-none">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 border-b border-slate-200 pb-4 gap-4">
            <div>
              <h3 className="text-xl font-black text-slate-800">
                Silabus Saya per Mapel
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Pilih mapel, lalu buka tab pertemuan untuk edit materi
                yang sudah Anda input.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-black text-slate-400 uppercase bg-slate-50 border-none px-3 py-1.5 rounded-[var(--ui-radius-small)] hidden md:inline-block">
                {mySyllabuses.length} materi
              </span>
              <Button
                variant="secondary"
                onClick={openTeacherGuide}
                className="px-4 py-2.5 rounded-[var(--ui-radius-small)] text-xs flex shadow-none"
              >
                <FileText size={14} /> Panduan
              </Button>
              <Button
                variant="secondary"
                onClick={downloadTeacherTemplate}
                className="px-4 py-2.5 rounded-[var(--ui-radius-small)] text-xs flex shadow-none"
              >
                <Download size={14} /> Template Silabus
              </Button>
              <Button
                variant="primary"
                onClick={() => openModal("silabus_batch","add")}
                className="px-4 py-2.5 rounded-[var(--ui-radius-small)] text-xs flex shadow-none"
              >
                <RefreshCw size={14} /> Isi Banyak Sekaligus
              </Button>
              <Button
                variant="secondary"
                onClick={() => openModal("bulk","add")}
                className="px-4 py-2.5 rounded-[var(--ui-radius-small)] text-xs flex shadow-none"
              >
                <Upload size={14} /> Import Silabus
              </Button>
            </div>
          </div>

          {mySyllabuses.length === 0 ? (
            <div className="text-center py-16 text-slate-400 rounded-[var(--ui-radius-small)] border border-dashed border-slate-200 bg-slate-50">
              <BookOpen
                size={48}
                className="mx-auto mb-3 text-slate-200"
              />
              <p className="font-bold text-sm">
                Belum ada silabus yang ditambahkan.
              </p>
              <p className="text-xs font-medium mt-1">
                Isi form di sebelah kiri atau gunakan import Excel.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-[280px_minmax(0,1fr)] gap-4">
              <div className="rounded-[var(--ui-radius-small)] border-none bg-slate-50 p-3">
                <div className="flex items-center gap-2 px-2 py-2">
                  <BookOpenText
                    size={16}
                    className="text-[var(--ui-primary)]"
                  />
                  <div>
                    <p className="text-sm font-black text-slate-800">
                      Mata Pelajaran
                    </p>
                    <p className="text-[11px] font-bold text-slate-400">
                      {mySubjectNames.length} mapel Anda
                    </p>
                  </div>
                </div>
                <div className="mt-2 space-y-2 max-h-[430px] overflow-y-auto custom-scrollbar pr-1">
                  {mySubjectNames.map((subjectName) => {
                    const subjectItems =
                      myGroupedSyllabuses[subjectName] || [];
                    const isActive = activeTeacherSubject === subjectName;
                    return (
                      <Button variant="outline"
                        key={subjectName}
                        type="button"
                        onClick={() =>{
                          setSelectedTeacherSilabusSubject(subjectName);
                          setSelectedTeacherSilabusId(
                            subjectItems[0]?.id ||"",
                          );
                        }}
                        className={`w-full rounded-[var(--ui-radius-small)] border px-4 py-3 text-left transition-all ${isActive ?"bg-[var(--ui-primary)] text-white border-[var(--ui-primary)] shadow-sm" :"bg-white text-slate-700 border-slate-200 hover:bg-slate-50"}`}
                      >
                        <span className="flex items-center justify-between gap-3">
                          <span className="font-black text-sm leading-snug">
                            {subjectName}
                          </span>
                          <ChevronRight
                            size={15}
                            className={
                              isActive ?"text-white" :"text-slate-300"
                            }
                          />
                        </span>
                        <span
                          className={`mt-1 block text-[10px] font-bold ${isActive ?"text-white/75" :"text-slate-400"}`}
                        >
                          {subjectItems.length} pertemuan
                        </span></Button>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-[var(--ui-radius-small)] border-none bg-white p-4 md:p-5 min-w-0">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3 border-b border-slate-100 pb-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
                      Detail Mapel
                    </p>
                    <h4 className="mt-1 text-2xl font-black text-slate-800">
                      {activeTeacherSubject ||"Pilih Mata Pelajaran"}
                    </h4>
                    <p className="mt-1 text-xs font-bold text-slate-500">
                      Setiap tab adalah satu pertemuan yang bisa Anda
                      edit.
                    </p>
                  </div>
                  {activeTeacherSilabus && (
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="secondary"
                        onClick={() =>
                          openModal("silabus","edit",
                            activeTeacherSilabus,
                          )
                        }
                        className="px-3 py-2 rounded-[var(--ui-radius-small)] text-xs shadow-none"
                      >
                        <Edit2 size={14} /> Edit Pertemuan
                      </Button>
                      <Button
                        variant="danger"
                        onClick={() =>
                          handleRemoveSyllabusSafe(
                            activeTeacherSilabus.id,
                            activeTeacherSilabus,
                          )
                        }
                        className="px-3 py-2 rounded-[var(--ui-radius-small)] text-xs shadow-none"
                      >
                        <Trash2 size={14} /> Hapus
                      </Button>
                    </div>
                  )}
                </div>

                <div className="mt-4 flex gap-2 overflow-x-auto custom-scrollbar pb-2">
                  {activeTeacherMeetings.map((item, index) => {
                    const isActive = activeTeacherSilabus?.id === item.id;
                    return (
                      <Button variant="outline"
                        key={item.id}
                        type="button"
                        onClick={() =>setSelectedTeacherSilabusId(item.id)
                        }
                        className={`shrink-0 min-w-[145px] rounded-[var(--ui-radius-small)] border px-3 py-2.5 text-left transition-all ${isActive ?"bg-[var(--ui-primary)] text-white border-[var(--ui-primary)] shadow-sm" :"bg-slate-50 text-slate-600 border-slate-200 hover:bg-white"}`}
                      >
                        <span className="block text-xs font-black">
                          Pertemuan {index + 1}
                        </span>
                        <span
                          className={`mt-1 block text-[10px] font-bold line-clamp-1 ${isActive ?"text-white/75" :"text-slate-400"}`}
                        >
                          {item.title ||"Tanpa judul"}
                        </span></Button>
                    );
                  })}
                </div>

                {activeTeacherSilabus && (
                  <div className="mt-4 rounded-[var(--ui-radius-small)] border-none bg-slate-50 p-4 md:p-5">
                    <div className="flex flex-wrap items-center gap-2 mb-4">
                      <span className="rounded-[var(--ui-radius-small)] bg-white border-none px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-500">
                        Pertemuan {activeTeacherIndex + 1}
                      </span>
                      <span className="rounded-[var(--ui-radius-small)] bg-white border-none px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-500">
                        {activeTeacherSilabus.gradeSemester ||"-"}
                      </span>
                      {activeTeacherCategory && (
                        <span className="rounded-[var(--ui-radius-small)] bg-white border-none px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-500">
                          {activeTeacherCategory.name}
                        </span>
                      )}
                      {activeTeacherSilabus.notes && (
                        <span className="rounded-[var(--ui-radius-small)] bg-amber-100 border border-amber-200 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-amber-700">
                          Catatan
                        </span>
                      )}
                    </div>
                    <h4 className="text-xl font-black text-slate-800 leading-snug">
                      {activeTeacherSilabus.title ||
                        `Pertemuan ${activeTeacherIndex + 1}`}
                    </h4>
                    <div className="mt-4 rounded-[var(--ui-radius-small)] bg-white border-none p-4">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                        Tujuan Pembelajaran
                      </p>
                      <p className="text-sm font-bold text-slate-700 leading-relaxed">
                        {activeTeacherSilabus.objectives ||"-"}
                      </p>
                    </div>
                    <div className="mt-3 rounded-[var(--ui-radius-small)] bg-white border-none p-4">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">
                        Materi Pembelajaran
                      </p>
                      {activeTeacherSilabus.materials ? (
                        <div className="space-y-2">
                          {String(activeTeacherSilabus.materials)
                            .split("\n")
                            .map((line) => line.trim())
                            .filter(Boolean)
                            .map((line, index) => (
                              <div
                                key={`${activeTeacherSilabus.id}-material-${index}`}
                                className="flex gap-3 rounded-[var(--ui-radius-small)] bg-slate-50 border-none px-3 py-2"
                              >
                                <span className="text-[10px] font-black text-[var(--ui-primary)]">
                                  {String.fromCharCode(65 + index)}.
                                </span>
                                <span className="text-sm font-bold text-slate-700 leading-relaxed">
                                  {line}
                                </span>
                              </div>
                            ))}
                        </div>
                      ) : (
                        <p className="text-sm font-bold text-slate-400">
                          Belum ada materi pembelajaran.
                        </p>
                      )}
                    </div>
                    {activeTeacherSilabus.notes && (
                      <div className="mt-3 rounded-[var(--ui-radius-small)] bg-amber-50 border border-amber-200 p-4">
                        <p className="text-[10px] font-black uppercase tracking-widest text-amber-600 mb-2">
                          Catatan
                        </p>
                        <p className="text-sm font-bold text-amber-800 leading-relaxed">
                          {activeTeacherSilabus.notes}
                        </p>
                      </div>
                    )}
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
