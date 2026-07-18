import { Button } from '../../../components/ui.jsx';
import { BookOpenText } from'lucide-react';
import { useAppStore } from'../../../store/useAppStore';
import { Search, Download, Upload, RefreshCw, Plus, FileText, BookOpen, ChevronRight, Edit2, Trash2 } from'lucide-react';
import { PageHeader } from '../../../components/monitoring/ui/index.js';
;


export default function TabSilabus(props) {
  const normalizeText = (value) => String(value ??"").trim().replace(/\s+/g,"").toLowerCase();
  const sameText = (a, b) => normalizeText(a) === normalizeText(b);

  const syllabuses = useAppStore((state) => state.syllabuses) || [];

  const { sort, subjectName, teacherCode, title, localeCompare, sensitivity, base, silabusSearchTerm, syllabusCategories, categoryId, name, gradeSemester, objectives, materials, notes, size, acc, item, selectedSilabusSubject, selectedSilabusId, step, desc, judul, materi, ingin, dibuka, isi, sekaligus, kategori, semester, sesuai, sebelum, dibagikan, grid, cols, ui, accent, primary, per, pertemuan, singkat, jelas, tombol, besar, bawah, menambah, silabus, mengimpor, membaca, panduan, demi, nyaman, dipakai, usia, unggah, contoh, radius, card, tersimpan, punya, menyusun, penting, dibaca, between, setSilabusSearchTerm, target, variant, secondary, openTeacherGuide, downloadTeacherTemplate, openModal, bulk, add, silabus_batch, color, cocok, pencarian, kata, kunci, overflow, mata, pelajaran, tab, dalamnya, panel, tampil, setSelectedSilabusSubject, setSelectedSilabusId, adalah, urutan, teachers, code, currentUser, danger, handleRemoveSyllabusSafe, index, line, clamp, khusus, n, material, pembelajaran, melihat } = props;
  
  const sortedSyllabuses = [...syllabuses].sort((a, b) => {
            const aValue = `${a.subjectName ||""} ${a.teacherCode ||""} ${a.title ||""}`;
            const bValue = `${b.subjectName ||""} ${b.teacherCode ||""} ${b.title ||""}`;
            return aValue.localeCompare(bValue,"id", { sensitivity:"base" });
          });
          const filteredSyllabuses = sortedSyllabuses.filter((s) => {
            if (!silabusSearchTerm.trim()) return true;
            const catName = syllabusCategories?.find((c) => c.id === s.categoryId)?.name ||"";
            return normalizeText([
              s.subjectName ||"",
              s.teacherCode ||"",
              s.title ||"",
              s.gradeSemester ||"",
              s.objectives ||"",
              s.materials ||"",
              s.notes ||"",
              catName,
            ].join("")).includes(normalizeText(silabusSearchTerm));
          });
          const subjectCount = new Set(syllabuses.map((s) => s.subjectName).filter(Boolean)).size;
          const teacherCount = new Set(syllabuses.map((s) => s.teacherCode).filter(Boolean)).size;
          const noteCount = syllabuses.filter((s) => String(s.notes ||"").trim()).length;
          const categoryCount = syllabusCategories?.length || 0;
          const spotlightSyllabuses = filteredSyllabuses.slice(0, 3);
          const groupedSyllabuses = filteredSyllabuses.reduce((acc, item) => {
            const key = item.subjectName ||"Tanpa Mata Pelajaran";
            if (!acc[key]) acc[key] = [];
            acc[key].push(item);
            return acc;
          }, {});
          const groupedSubjectNames = Object.keys(groupedSyllabuses).sort((a, b) => a.localeCompare(b,"id", { sensitivity:"base" }));
          const activeSilabusSubject = groupedSubjectNames.includes(selectedSilabusSubject) ? selectedSilabusSubject : (groupedSubjectNames[0] ||"");
          const activeSilabusMeetings = activeSilabusSubject ? groupedSyllabuses[activeSilabusSubject] || [] : [];
          const activeSilabus = activeSilabusMeetings.find((item) => item.id === selectedSilabusId) || activeSilabusMeetings[0] || null;
          const activeSilabusIndex = activeSilabus ? Math.max(activeSilabusMeetings.findIndex((item) => item.id === activeSilabus.id), 0) : -1;
          const activeSilabusCategory = activeSilabus ? syllabusCategories?.find((c) => c.id === activeSilabus.categoryId) : null;
          const heroSteps = [
            { step:"1", title:"Pilih data", desc:"Cari mapel, guru, atau judul materi yang ingin dibuka." },
            { step:"2", title:"Input / import", desc:"Tambah manual, isi banyak sekaligus, atau import Excel." },
            { step:"3", title:"Cek hasil", desc:"Pastikan kategori dan semester sudah sesuai sebelum dibagikan." },
          ];

          return (
            <div className="flex flex-col gap-4 h-full w-full animate-in fade-in duration-300 relative z-10">
              {!props.hideHeader && (
                <PageHeader 
                  title="Modul Ajar (RPP)"
                  icon={BookOpenText}
                  description="Kelola materi, tujuan pembelajaran, dan panduan untuk setiap pertemuan."
                />
              )}
              <div className="flex flex-col gap-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div className="rounded-[var(--ui-radius-small)] bg-slate-50 border-none p-4">
                    <div className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Total Draft RPP</div>
                    <div className="mt-2 text-3xl font-black text-slate-800">{syllabuses.length}</div>
                    <div className="text-xs text-slate-500 font-medium mt-1">Semua materi yang tersimpan.</div>
                  </div>
                  <div className="rounded-[var(--ui-radius-small)] bg-emerald-50 border border-emerald-200 p-4">
                    <div className="text-[10px] font-black uppercase tracking-[0.25em] text-emerald-700">Mata Pelajaran</div>
                    <div className="mt-2 text-3xl font-black text-emerald-800">{subjectCount}</div>
                    <div className="text-xs text-emerald-700 font-medium mt-1">Mapel yang sudah punya modul ajar.</div>
                  </div>
                  <div className="rounded-[var(--ui-radius-small)] bg-amber-50 border border-amber-200 p-4">
                    <div className="text-[10px] font-black uppercase tracking-[0.25em] text-amber-700">Guru Terlibat</div>
                    <div className="mt-2 text-3xl font-black text-amber-800">{teacherCount}</div>
                    <div className="text-xs text-amber-700 font-medium mt-1">Guru yang menyusun materi.</div>
                  </div>
                  <div className="rounded-[var(--ui-radius-small)] bg-[var(--ui-primary)]/10 border border-blue-200 p-4">
                    <div className="text-[10px] font-black uppercase tracking-[0.25em] text-blue-700">Catatan / Kategori</div>
                    <div className="mt-2 text-3xl font-black text-blue-800">{noteCount + categoryCount}</div>
                    <div className="text-xs text-blue-700 font-medium mt-1">Penanda penting agar mudah dibaca.</div>
                  </div>
                </div>

                <div className="ui-card flex flex-col lg:flex-row gap-3 lg:items-center justify-between p-4">
                  <div className="relative flex-1">
                    <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={silabusSearchTerm}
                      onChange={(e) => setSilabusSearchTerm(e.target.value)}
                      className="w-full border-none rounded-[var(--ui-radius-small)] bg-slate-50 pl-11 pr-4 py-3.5 text-sm font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-[var(--ui-primary)]"
                      placeholder="Cari mapel, guru, judul materi, atau kategori..."
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" onClick={downloadTeacherTemplate} ><Download size={14} /> Template Modul Ajar</Button>
                    <Button variant="outline" onClick={() =>openModal("bulk","add")} >
                      <Upload size={14} /> Import Modul Ajar</Button>
                    <Button variant="outline" onClick={() =>openModal("silabus_batch","add")} >
                      <RefreshCw size={14} /> Isi Banyak Sekaligus</Button>
                    <Button variant="outline" onClick={() =>openModal("silabus","add", activeSilabus ? { subjectName: activeSilabus.subjectName, teacherCode: activeSilabus.teacherCode, gradeSemester: activeSilabus.gradeSemester, categoryId: activeSilabus.categoryId } : undefined)} >
                      <Plus size={14} /> Tambah Modul Ajar</Button>
                  </div>
                </div>

                <div className="rounded-[var(--ui-radius-small)] border-none bg-slate-50 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <FileText size={16} className="text-[var(--ui-primary)]" />
                    <h3 className="text-sm font-black text-slate-800">Modul Ajar Terbaru</h3>
                    <span className="ml-auto text-[10px] font-bold text-slate-400">{Math.min(spotlightSyllabuses.length, 3)} materi</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                    {spotlightSyllabuses.map((s) => {
                      const cat = syllabusCategories?.find((c) => c.id === s.categoryId);
                      return (
                        <div key={s.id} className="rounded-[var(--ui-radius-card)] bg-white border-none p-3.5 shadow-sm">
                          <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                            {s.teacherCode ||"-"} · {s.gradeSemester ||"-"}
                          </div>
                          <div className="mt-1 font-black text-slate-800 text-sm leading-tight">{s.title ||"Tanpa judul"}</div>
                          <div className="mt-2 flex items-center justify-between gap-2">
                            <span className="px-2.5 py-1 rounded-[var(--ui-radius-small)] text-[10px] font-black uppercase tracking-widest bg-[var(--ui-primary)]/10 text-[var(--ui-primary)] border border-[var(--ui-accent)]/30">
                              {s.subjectName ||"Umum"}
                            </span>
                            <span className={`px-2.5 py-1 rounded-[var(--ui-radius-small)] text-[10px] font-black uppercase tracking-widest bg-${cat?.color ||"slate"}-50 text-${cat?.color ||"slate"}-600 border border-${cat?.color ||"slate"}-100`}>
                              {cat?.name ||"Kategori"}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                    {spotlightSyllabuses.length === 0 && (
                      <div className="md:col-span-3 rounded-[var(--ui-radius-small)] border border-dashed border-slate-300 bg-white p-6 text-center">
                        <p className="text-sm font-bold text-slate-500">Belum ada modul ajar yang cocok dengan pencarian.</p>
                        <p className="text-xs text-slate-400 font-medium mt-1">Coba kosongkan kata kunci atau tambah materi baru.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="ui-card p-4 md:p-6 flex flex-col flex-1 overflow-hidden min-h-0">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-5 gap-4">
                  <div>
                    <h2 className="text-2xl font-black text-slate-800 tracking-tight">Susunan Modul Ajar per Mapel</h2>
                    <p className="text-sm text-slate-500 font-medium mt-1">Pilih mata pelajaran, lalu buka tab pertemuan di dalamnya. Admin tetap bisa edit atau hapus materi dari panel ini.</p>
                  </div>
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] bg-slate-50 border-none px-3 py-2 rounded-[var(--ui-radius-small)]">
                    {filteredSyllabuses.length} hasil
                  </div>
                </div>

                {filteredSyllabuses.length === 0 ? (
                  <div className="rounded-[var(--ui-radius-small)] border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
                    <BookOpen size={42} className="mx-auto mb-3 text-slate-300" />
                    <p className="text-sm font-bold text-slate-500">
                      {silabusSearchTerm.trim() ?"Tidak ada modul ajar yang cocok dengan pencarian." :"Belum ada modul ajar yang ditambahkan."}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 xl:grid-cols-[320px_minmax(0,1fr)] gap-4 min-h-[520px]">
                    <div className="rounded-[var(--ui-radius-small)] border-none bg-slate-50 p-3 overflow-hidden">
                      <div className="flex items-center gap-2 px-2 py-2">
                        <BookOpenText size={16} className="text-[var(--ui-primary)]" />
                        <div>
                          <p className="text-sm font-black text-slate-800">Mata Pelajaran</p>
                          <p className="text-[11px] font-bold text-slate-400">{groupedSubjectNames.length} mapel tampil</p>
                        </div>
                      </div>
                      <div className="mt-2 space-y-2 max-h-[460px] overflow-y-auto custom-scrollbar pr-1">
                        {groupedSubjectNames.map((subjectName) => {
                          const subjectItems = groupedSyllabuses[subjectName] || [];
                          const isActive = activeSilabusSubject === subjectName;
                          return (
                            <Button variant="outline"
                              key={subjectName}
                              type="button"
                              onClick={() =>{
                                setSelectedSilabusSubject(subjectName);
                                setSelectedSilabusId(subjectItems[0]?.id ||"");
                              }}
                              className={`w-full text-left ${isActive ?"bg-[var(--ui-primary)] text-white border-[var(--ui-primary)] shadow-sm" :"bg-white text-slate-700 border-slate-200 hover:bg-slate-50"}`}
                            >
                              <span className="flex items-center justify-between gap-3">
                                <span className="font-black text-sm leading-snug">{subjectName}</span>
                                <ChevronRight size={15} className={isActive ?"text-white" :"text-slate-300"} />
                              </span>
                              <span className={`mt-1 block text-[10px] font-bold ${isActive ?"text-white/75" :"text-slate-400"}`}>
                                {subjectItems.length} pertemuan
                              </span></Button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="rounded-[var(--ui-radius-small)] border-none bg-white p-4 md:p-5 min-w-0">
                      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3 border-b border-slate-100 pb-4">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Detail Mapel</p>
                          <h3 className="mt-1 text-2xl font-black text-slate-800">{activeSilabusSubject ||"Pilih Mata Pelajaran"}</h3>
                          <p className="mt-1 text-xs font-bold text-slate-500">Tab di bawah ini adalah urutan pertemuan untuk mapel yang dipilih.</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button variant="outline"
                            onClick={() =>openModal("silabus","add", {
                              subjectName: activeSilabusSubject,
                              teacherCode: activeSilabus?.teacherCode || teachers[0]?.code || currentUser?.code ||"",
                              gradeSemester: activeSilabus?.gradeSemester ||"X / Ganjil",
                              categoryId: activeSilabus?.categoryId ||"",
                              title: `Pertemuan ${activeSilabusMeetings.length + 1}: `,
                            })}
                            
                          >
                            <Plus size={14} /> Tambah Pertemuan</Button>
                          {activeSilabus && (
                            <>
                              <Button variant="outline" onClick={() =>openModal("silabus","edit", activeSilabus)} >
                                <Edit2 size={14} /> Edit</Button>
                              <Button variant="outline"
                                onClick={() =>handleRemoveSyllabusSafe(activeSilabus.id, activeSilabus)}
                                
                              >
                                <Trash2 size={14} /> Hapus</Button>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="mt-4 flex gap-2 overflow-x-auto custom-scrollbar pb-2 hide-scrollbar">
                        {activeSilabusMeetings.map((item, index) => {
                          const isActive = activeSilabus?.id === item.id;
                          return (
                            <Button variant="outline"
                              key={item.id}
                              type="button"
                              onClick={() =>setSelectedSilabusId(item.id)}
                              className={`shrink-0 text-left ${isActive ?"bg-[var(--ui-primary)] text-white border-[var(--ui-primary)] shadow-sm" :"bg-slate-50 text-slate-600 border-slate-200 hover:bg-white"}`}
                            >
                              <span className="block text-xs font-black">Pertemuan {index + 1}</span>
                              <span className={`mt-1 block text-[10px] font-bold line-clamp-1 ${isActive ?"text-white/75" :"text-slate-400"}`}>{item.title ||"Tanpa judul"}</span></Button>
                          );
                        })}
                      </div>

                      {activeSilabus ? (
                        <div className="mt-4 rounded-[var(--ui-radius-small)] border-none bg-slate-50 p-4 md:p-5">
                          <div className="flex flex-wrap items-center gap-2 mb-4">
                            <span className="rounded-[var(--ui-radius-small)] bg-white border-none px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-500">
                              Pertemuan {activeSilabusIndex + 1}
                            </span>
                            <span className="rounded-[var(--ui-radius-small)] bg-[var(--ui-primary)]/10 border border-[var(--ui-accent)]/30 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-[var(--ui-primary)]">
                              {activeSilabus.teacherCode ||"-"}
                            </span>
                            <span className="rounded-[var(--ui-radius-small)] bg-white border-none px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-500">
                              {activeSilabus.gradeSemester ||"-"}
                            </span>
                            {activeSilabusCategory && (
                              <span className="rounded-[var(--ui-radius-small)] bg-white border-none px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-500">
                                {activeSilabusCategory.name}
                              </span>
                            )}
                          </div>
                          <h4 className="text-xl font-black text-slate-800 leading-snug">{activeSilabus.title || `Pertemuan ${activeSilabusIndex + 1}`}</h4>
                          <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-3">
                            <div className="rounded-[var(--ui-radius-small)] bg-white border-none p-4">
                              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Tujuan Pembelajaran</p>
                              <p className="text-sm font-bold text-slate-700 leading-relaxed">{activeSilabus.objectives ||"-"}</p>
                            </div>
                            <div className="rounded-[var(--ui-radius-small)] bg-white border-none p-4">
                              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Catatan</p>
                              <p className="text-sm font-bold text-slate-700 leading-relaxed">{activeSilabus.notes ||"Tidak ada catatan khusus."}</p>
                            </div>
                          </div>
                          <div className="mt-3 rounded-[var(--ui-radius-small)] bg-white border-none p-4">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Materi Pembelajaran</p>
                            {activeSilabus.materials ? (
                              <div className="space-y-2">
                                {String(activeSilabus.materials).split("\n").map((line) => line.trim()).filter(Boolean).map((line, index) => (
                                  <div key={`${activeSilabus.id}-material-${index}`} className="flex gap-3 rounded-[var(--ui-radius-small)] bg-slate-50 border-none px-3 py-2">
                                    <span className="text-[10px] font-black text-[var(--ui-primary)]">{String.fromCharCode(65 + index)}.</span>
                                    <span className="text-sm font-bold text-slate-700 leading-relaxed">{line}</span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm font-bold text-slate-400">Belum ada materi pembelajaran.</p>
                            )}
                          </div>
                          {activeSilabus.pdfFile && (
                            <div className="mt-3 rounded-[var(--ui-radius-small)] bg-white border-none p-4 flex items-center justify-between">
                              <div className="min-w-0 flex-1 pr-4">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                                  Lampiran PDF (Modul Ajar)
                                </p>
                                <p className="text-xs font-bold text-slate-700 truncate">
                                  {activeSilabus.pdfFile.name}
                                </p>
                              </div>
                              <a
                                href={activeSilabus.pdfFile.base64}
                                download={activeSilabus.pdfFile.name}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--ui-primary)] text-white rounded-[var(--ui-radius-small)] text-xs font-bold shadow-xs hover:opacity-90 transition-opacity cursor-pointer no-underline decoration-none"
                              >
                                <Download size={14} /> Unduh PDF
                              </a>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="mt-4 rounded-[var(--ui-radius-small)] border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm font-bold text-slate-400">
                          Pilih mata pelajaran untuk melihat pertemuan.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
}
