import React, { memo } from'react';
import { BookOpen } from'lucide-react';
import { Download, Upload, Plus, Wand2, Trash2, Search, ArrowUpDown, Info, Edit2 } from'lucide-react';
import { PageHeader } from'../../../components/monitoring/ui/index.js';
import { UISelect, Button } from'../../../components/ui.jsx';


const MasterDataBeban = memo(function MasterDataBeban({
  teachingLoads,
  teachers,
  subjects,
  classes,
  updateSelectionForTab,
  openModal,
  checkDependencies,
  handleDelete,
  renderTable,
  isSuperAdminRole,
  currentUser,
  getTeacherName,
  normalizeText,
  searchTerm,
  loadFilters,
  csvValueMatches,
  parseTeacherCodes,
  getActiveSortConfig,
  TABLE_SORT_OPTIONS,
  selectedRows,
  getTableSort,
  getLoadKey,
  teacherAvailability,
  recommendedLoads,
  parsePositiveInt,
  openImportGuide,
  downloadMasterTemplate,
  applyRecommendations,
  handleBulkDelete,
  setSearchTerm,
  setLoadFilters,
  majors,
  setTableSorts,
  DEFAULT_TABLE_SORTS,
  csvValuesIntersect
}) {
        if (!isSuperAdminRole(currentUser.role) && !(currentUser.role ==="waka" && (currentUser.division ||"").toLowerCase() ==="kurikulum")) {
          return (
            <div className="bg-white border-none rounded-[var(--ui-radius-small)] p-6 text-center">
              <p className="font-bold text-slate-700">Tab Beban Mengajar hanya untuk SuperAdmin atau Waka Kurikulum.</p>
            </div>
          );
        }
        const filteredLoads = teachingLoads.filter((item) => {
          const teacherCode = String(item?.teacherCode ||"");
          const teacherName = getTeacherName(teacherCode);
          const subjectName = String(item?.subject ||"");
          const targetGrade = String(item?.targetGrade ||"All");
          const targetMajor = String(item?.targetMajor ||"All");
          const searchText = normalizeText(searchTerm);
          const bySearch = !searchText || normalizeText(`${teacherCode} ${teacherName} ${subjectName} ${targetGrade} ${targetMajor}`).includes(searchText);
          const byGrade = loadFilters.grade ==="All" || targetGrade.split(",").map((x) => x.trim()).includes(loadFilters.grade);
          const byMajor = loadFilters.major ==="All" || csvValueMatches(targetMajor, loadFilters.major, ["All","Semua"]);
          const byTeacher = loadFilters.teacher ==="All" || parseTeacherCodes(teacherCode).includes(loadFilters.teacher);
          return bySearch && byGrade && byMajor && byTeacher;
        });
        const sortConfig = getActiveSortConfig("beban");
        const sortOptions = TABLE_SORT_OPTIONS.beban || [];
        const selectedLoadKeys = selectedRows.beban || [];
        const sortedLoads = getTableSort("beban", filteredLoads);
        const visibleLoadKeys = sortedLoads.map((item, index) => item.id || getLoadKey(item) || `beban-${index}`);
        const allVisibleSelected = visibleLoadKeys.length > 0 && visibleLoadKeys.every((key) => selectedLoadKeys.includes(key));
        const teachersWithCompetenciesCount = Object.values(teacherAvailability || {}).filter((entry) => Array.isArray(entry?.subjects) && entry.subjects.length > 0).length;
        const hasAutoLoadSuggestions = recommendedLoads.length > 0;
        const totalFilteredJp = filteredLoads.reduce((sum, item) => sum + parsePositiveInt(item.duration, 0), 0);
        const teachersInFilteredLoads = new Set(filteredLoads.flatMap((item) => parseTeacherCodes(item.teacherCode))).size;
        const subjectsInFilteredLoads = new Set(filteredLoads.map((item) => String(item.subject ||"").trim()).filter(Boolean)).size;
        const actionButtons = (
          <React.Fragment>
            <Button variant="outline" size="sm" onClick={downloadMasterTemplate} className="flex-1 lg:flex-none flex items-center justify-center gap-1.5 md:text-xs"><Download size={14} /> Template</Button>
            <Button variant="outline" size="sm" onClick={() => openModal("bulk","add")} className="flex-1 lg:flex-none flex items-center justify-center gap-1.5 md:text-xs"><Upload size={14} /> Import</Button>
            <Button size="sm" onClick={() => openModal("beban","add")} className="flex-1 lg:flex-none flex items-center justify-center gap-1.5 md:text-xs"><Plus size={14} strokeWidth={3} /> Tambah Beban</Button>
          </React.Fragment>
        );

        return (
          <div className="flex flex-col gap-4  w-full animate-in fade-in duration-300">
            <PageHeader 
              title="Beban Mengajar"
              icon={BookOpen}
              description="Kelola alokasi guru untuk setiap mata pelajaran dan kelas."
            />
            
            <section className="ui-card flex flex-col p-4 md:p-5">
              <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
                {[
                  { label:"Beban tampil", value: filteredLoads.length, tone:"bg-slate-50 text-slate-700" },
                  { label:"Total JP", value: totalFilteredJp, tone:"bg-[var(--ui-primary)]/10 text-blue-700" },
                  { label:"Guru terlibat", value: teachersInFilteredLoads, tone:"bg-emerald-50 text-emerald-700" },
                  { label:"Mapel unik", value: subjectsInFilteredLoads, tone:"bg-amber-50 text-amber-700" },
                ].map((item) => (
                  <div key={item.label} className={`rounded-[var(--ui-radius-small)] border-none p-3 ${item.tone}`}>
                    <div className="text-2xl font-black">{item.value}</div>
                    <div className="text-[10px] font-black uppercase tracking-widest opacity-70">{item.label}</div>
                  </div>
                ))}
              </div>
            </section>

            <section className={`border rounded-[var(--ui-radius-card)] p-4 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 ${
              hasAutoLoadSuggestions
                ?"bg-[var(--ui-accent)]/20 border-[var(--ui-accent)]"
                :"bg-white border-slate-200 shadow-sm"
            }`}>
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-[var(--ui-radius-small)] flex items-center justify-center shrink-0 ${hasAutoLoadSuggestions ?"bg-[var(--ui-primary)] text-white" :"bg-slate-100 text-slate-500"}`}>
                  <Wand2 size={18} />
                </div>
                <div>
                  <h4 className="font-black text-slate-900 text-sm">Deteksi Otomatis dari Kompetensi Guru</h4>
                  <p className="text-xs font-semibold text-slate-600 mt-1 leading-relaxed max-w-3xl">
                    {hasAutoLoadSuggestions
                      ? <>Ada <b className="text-[var(--ui-primary)]">{recommendedLoads.length}</b> rekomendasi beban baru dari mapel kompetensi guru.</>
                      : teachersWithCompetenciesCount > 0
                        ?"Semua kompetensi yang terdeteksi sudah masuk ke Master Beban Mengajar."
                        :"Isi kompetensi/mapel guru di tab Ketersediaan Guru agar sistem bisa memberi rekomendasi otomatis."}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="px-2.5 py-1 rounded-[var(--ui-radius-small)] bg-white border-none text-[10px] font-black text-slate-600">Guru berkompetensi: {teachersWithCompetenciesCount}</span>
                    <span className="px-2.5 py-1 rounded-[var(--ui-radius-small)] bg-white border-none text-[10px] font-black text-slate-600">Rekomendasi: {recommendedLoads.length}</span>
                  </div>
                </div>
              </div>
              <Button variant={hasAutoLoadSuggestions ?"default" :"outline"} disabled={!hasAutoLoadSuggestions} onClick={applyRecommendations} className="w-full xl:w-auto">
                <Wand2 size={14} className="mr-1.5" /> {hasAutoLoadSuggestions ? `Tambah ${recommendedLoads.length} Otomatis` :"Belum Ada Rekomendasi"}
              </Button>
            </section>

            <div className="ui-card flex flex-col flex-1 overflow-hidden min-h-0">
              <div className="p-6 border-b border-slate-50 bg-white/50 shrink-0 space-y-4">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div>
                    <h3 className="font-bold text-slate-800 text-lg">Daftar Beban Mengajar</h3>
                    <p className="text-xs text-slate-500 font-bold mt-1">Cari, filter, lalu edit beban yang belum sesuai.</p>
                  </div>
                  <div className="flex gap-2 flex-wrap justify-end">
                    {actionButtons}
                    {selectedLoadKeys.length > 0 && (
                      <Button variant="destructive" size="sm" onClick={() => handleBulkDelete("beban", selectedLoadKeys)} >
                        <Trash2 size={14} className="mr-1.5" /> Hapus Terpilih ({selectedLoadKeys.length})
                      </Button>
                    )}
                  </div>
                </div>
                <div className="flex flex-col lg:flex-row lg:items-center gap-3">
                  <div className="px-6 py-4 bg-slate-50/50 border-none rounded-[var(--ui-radius-small)] flex-1">
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                      <div className="relative md:col-span-2">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input type="text" placeholder="Cari guru, mapel, jurusan..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-white border-none rounded-[var(--ui-radius-small)] text-xs font-bold focus:outline-none focus:border-[var(--ui-accent)] transition-all" />
                      </div>
                      <UISelect value={loadFilters.teacher} onChange={(e) => setLoadFilters({ ...loadFilters, teacher: e.target.value })} className="border-none bg-white px-3 py-2 rounded-[var(--ui-radius-small)] text-xs font-bold">
                        <option value="All">Semua Guru</option>{teachers.map((teacher) => <option key={teacher.code} value={teacher.code}>{teacher.name}</option>)}
                      </UISelect>
                      <UISelect value={loadFilters.grade} onChange={(e) => setLoadFilters({ ...loadFilters, grade: e.target.value })} className="border-none bg-white px-3 py-2 rounded-[var(--ui-radius-small)] text-xs font-bold">
                        <option value="All">Semua Tingkat</option><option value="X">X</option><option value="XI">XI</option><option value="XII">XII</option>
                      </UISelect>
                      <div className="flex gap-2">
                        <UISelect value={loadFilters.major} onChange={(e) => setLoadFilters({ ...loadFilters, major: e.target.value })} className="flex-1 border-none bg-white px-3 py-2 rounded-[var(--ui-radius-small)] text-xs font-bold">
                          <option value="All">Semua Jurusan</option>{majors.map((m) => <option key={m} value={m}>{m}</option>)}
                        </UISelect>
                        <Button variant="ghost" size="sm" type="button" onClick={() => setLoadFilters({ grade:"All", major:"All", teacher:"All" })} >Reset</Button>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <UISelect
                      value={sortConfig.key}
                      onChange={(e) => setTableSorts((prev) => ({ ...prev, beban: { ...(prev.beban || DEFAULT_TABLE_SORTS.beban), key: e.target.value } }))}
                      className="border-none bg-white px-3 py-2 rounded-[var(--ui-radius-small)] text-xs font-bold"
                    >
                      {sortOptions.map((option) => <option key={option.value} value={option.value}>Sort by {option.label}</option>)}
                    </UISelect>
                    <Button
                      variant="outline"
                      size="sm"
                      type="button"
                      onClick={() => setTableSorts((prev) => ({ ...prev, beban: { ...(prev.beban || DEFAULT_TABLE_SORTS.beban), dir: sortConfig.dir ==="asc" ?"desc" :"asc" } }))}
                      
                    >
                      <ArrowUpDown size={14} className="mr-1.5" />
                      {sortConfig.dir ==="asc" ?"A-Z" :"Z-A"}
                    </Button>
                  </div>
                </div>
                {/* Info / Keterangan Kesesuaian Mengajar */}
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs bg-slate-50 border-none rounded-[var(--ui-radius-small)] p-3.5 mt-2">
                  <div className="flex items-center gap-1.5 font-bold text-slate-700">
                    <Info size={14} className="text-[var(--ui-primary)]" />
                    <span>Keterangan Status Kecocokan:</span>
                  </div>
                  <div className="flex items-center gap-5 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="inline-block w-2.5 h-2.5 rounded-[var(--ui-radius-small)] bg-[var(--ui-primary)]"></span>
                      <span className="text-slate-600 font-medium"><strong className="text-slate-800">Tinggi:</strong> Kompeten mapel & sesuai prioritas jurusan & prioritas tingkat.</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="inline-block w-2.5 h-2.5 rounded-[var(--ui-radius-small)] bg-yellow-500"></span>
                      <span className="text-slate-600 font-medium"><strong className="text-slate-800">Sedang:</strong> Kompeten mapel, namun tidak sesuai prioritas jurusan/tingkat.</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="inline-block w-2.5 h-2.5 rounded-[var(--ui-radius-small)] bg-rose-500"></span>
                      <span className="text-slate-600 font-medium"><strong className="text-slate-800">Rendah:</strong> Mapel tidak terdaftar dalam kompetensi mengajar guru.</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto flex-1 custom-scrollbar">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-[#f4fbf6]/50 text-slate-400 text-[10px] uppercase tracking-wider font-bold border-b border-slate-50 sticky top-0 z-10">
                    <tr>
                      <th className="px-4 py-4 w-12 text-center">
                        <input
                          type="checkbox"
                          checked={allVisibleSelected}
                          onChange={(e) => updateSelectionForTab("beban", (current) => {
                            const currentSet = new Set(current);
                            if (e.target.checked) visibleLoadKeys.forEach((key) => currentSet.add(key));
                            else visibleLoadKeys.forEach((key) => currentSet.delete(key));
                            return [...currentSet];
                          })}
                          className="accent-[var(--ui-primary)] cursor-pointer"
                          aria-label="Pilih semua beban mengajar yang tampil"
                        />
                      </th>
                      <th className="px-6 py-4 w-12 text-center">No</th>
                      <th className="px-6 py-4">Guru</th>
                      <th className="px-6 py-4">Mata Pelajaran</th>
                      <th className="px-6 py-4">Tingkat Target</th>
                      <th className="px-6 py-4">Durasi</th>
                      <th className="px-6 py-4">Maks Kelas</th>
                      <th className="px-6 py-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {sortedLoads.map((item, idx) => {
                      const rowKey = item.id || getLoadKey(item) || `beban-${idx}`;
                      const teacherCode = String(item.teacherCode ||"").trim();
                      const subjectName = String(item.subject ||"").trim();
                      const targetGrade = item.targetGrade ||"All";
                      const targetMajor = item.targetMajor ||"All";
                      const isSelected = selectedLoadKeys.includes(rowKey);
                      return (
                        <tr key={rowKey} className={`hover:bg-slate-50/50 transition-colors ${isSelected ?"bg-[var(--ui-accent)]/20/40" :""}`}>
                          <td className="px-4 py-4 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => updateSelectionForTab("beban", (current) => current.includes(rowKey) ? current.filter((x) => x !== rowKey) : [...current, rowKey])}
                              className="accent-[var(--ui-primary)] cursor-pointer"
                              aria-label={`Pilih beban ${teacherCode} ${subjectName}`}
                            />
                          </td>
                          <td className="px-6 py-4 text-center font-bold text-slate-400">{idx + 1}</td>
                          <td className="px-6 py-4">
                            <div className="font-bold text-slate-800">{getTeacherName(teacherCode) ||"Guru belum dipilih"}</div>
                            <div className="text-xs text-[var(--ui-primary)] font-mono font-bold">{teacherCode ||"-"}</div>
                            {(() => {
                              // Team teaching: check compatibility for each teacher in comma-separated codes
                              const codes = teacherCode.split(",").map((c) => c.trim()).filter(Boolean);
                              let worstLabel ="Tinggi";
                              for (const code of codes) {
                                const t = teachers.find((x) => x.code === code);
                                const subjOk = !!teacherAvailability[code]?.subjects?.includes(subjectName);
                                const majorOk = !!t && csvValuesIntersect(t.preferredMajor ||"Semua", targetMajor ||"All", ["Semua","All"]);
                                const gradeOk = !!t && (t.preferredGrade ==="Semua" || !t.preferredGrade || targetGrade ==="All" || String(targetGrade).split(",").map((x) => x.trim()).includes(t.preferredGrade));
                                const label = subjOk && majorOk && gradeOk ?"Tinggi" : subjOk ?"Sedang" :"Rendah";
                                if (label ==="Rendah") { worstLabel ="Rendah"; break; }
                                if (label ==="Sedang") worstLabel ="Sedang";
                              }
                              const cls = worstLabel ==="Tinggi" ?"bg-[var(--ui-accent)]/20 text-[var(--ui-primary)]" : worstLabel ==="Sedang" ?"bg-yellow-50 text-yellow-700 border border-yellow-200/80" :"bg-red-50 text-red-700 border border-red-200/80";
                              return <span className={`inline-block mt-1 text-[10px] px-2 py-0.5 rounded-[var(--ui-radius-small)] font-bold ${cls}`}>Kecocokan: {worstLabel}{codes.length > 1 ? ` (${codes.length} guru)` :""}</span>;
                            })()}
                          </td>
                          <td className="px-6 py-4 font-bold text-slate-700">{subjectName ||"-"}</td>
                          <td className="px-6 py-4 font-black text-slate-800">
                            <div className="flex flex-wrap items-center gap-1.5">
                              {(targetGrade ==="All" ? ["Semua"] : String(targetGrade).split(",").map((x) => x.trim()).filter(Boolean)).map((g) => (
                                <span key={g} className="bg-slate-100 text-slate-700 px-2 py-1 rounded-[var(--ui-radius-small)] text-[10px]">{g ==="Semua" ?"Semua Tingkat" : `Kls ${g}`}</span>
                              ))}
                              <span className="text-slate-400">•</span>
                              <span className="bg-[var(--ui-accent)]/20 text-[var(--ui-primary)] px-2 py-1 rounded-[var(--ui-radius-small)] text-[10px]">{targetMajor ==="All" ?"Semua Jurusan" : targetMajor}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 font-medium text-slate-600">{item.duration} JP</td>
                          <td className="px-6 py-4 font-medium text-slate-600">{parsePositiveInt(item.maxClasses, 0) > 0 ? `${item.maxClasses} kelas` :"Bebas"}</td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex justify-end gap-1.5">
                              <Button variant="ghost" size="icon" onClick={() => openModal('beban','edit', item)}><Edit2 size={14} className="text-slate-500" /></Button>
                              <Button variant="ghost" size="icon" onClick={() => handleDelete('beban', item.id)}><Trash2 size={14} className="text-rose-500" /></Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );

});

export default MasterDataBeban;
