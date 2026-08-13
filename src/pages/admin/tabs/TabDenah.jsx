import { Button } from '../../../components/ui.jsx';

import { X, Wand2, Copy, RefreshCw, Search } from'lucide-react';


export default function TabDenah(props) {
  const normalizeText = (value) => String(value ??"").trim().replace(/\s+/g,"").toLowerCase();
  const sameText = (a, b) => normalizeText(a) === normalizeText(b);
  const isAllLike = (value, allValues = ["All","Semua","Umum"]) => {
    const text = normalizeText(value);
    if (!text) return true;
    return allValues.some((item) => sameText(text, item));
  };
  const parseCsvList = (value) => String(value ||"").split(",").map((entry) => entry.trim()).filter(Boolean);
  const csvValuesIntersect = (a, b, ignores = []) => {
    const listA = parseCsvList(a);
    const listB = parseCsvList(b);
    if (listA.some(x => isAllLike(x, ignores)) || listB.some(x => isAllLike(x, ignores))) return true;
    return listA.some(x => listB.includes(x));
  };

  const { layoutByDay, layoutDay, roomLayout, classes, cls, name, layoutSettings, gradeFloors, major, teoriRoomId, praktikRoomId, majorLabs, item, flatMap, slot, denahClassSearch, has, dragClassName, slotId, emptyText, event, removeClassFromDenahSlot, ui, radius, card, backgroundColor, getFloorLegend, color, title, melepas, size, strokeWidth, between, accent, primary, per, tujuan, punya, susunan, misalnya, grid, cols, setLayoutPreset, kampus_a, layoutPreset, kampus_b, variant, secondary, generateRoomLayout, handleCopyCurrentDenahToAllDays, danger, handleClearCurrentDenahDay, overflow, days, day, setLayoutDay, setDragClassName, base, salah, daftar, setDenahClassSearch, target, cocok, draggable, kiri, denah, peta, layar, kecil, ditempatkan, renderKampusA, renderKampusB, list, opsional, nyaman, visual, n, dropToSlot, copy, isi, teori, praktik, ruangan, label, blok, rooms, r, renameRoomInline, layoutBlockLabels, setLayoutBlockLabels, prev, v, idx, exportLayoutJson, json, importLayoutJson } = props;
  
  const activeDayMap = layoutByDay?.[layoutDay] || {};
        const denahClassRows = (roomLayout.length > 0 ? roomLayout : classes.map((cls) => {
          const grade = String(cls.name ||"").split("")[0] ||"X";
          const floor = layoutSettings?.gradeFloors?.[grade] ||"-";
          return {
            className: cls.name,
            major: cls.major,
            grade,
            floor,
            teoriRoomId:"-",
            praktikRoomId: layoutSettings?.majorLabs?.[`${grade}-${cls.major}`] || layoutSettings?.majorLabs?.[cls.major] ||"-",
          };
        })).filter((item) => item?.className);
        const assignedClassNames = new Set(
          Object.values(activeDayMap)
            .flatMap((slot) => String(slot?.className ||"").split(",").map((item) => item.trim()).filter(Boolean))
        );
        const normalizedDenahSearch = normalizeText(denahClassSearch);
        const filteredDenahClasses = denahClassRows.filter((row) =>
          normalizeText(`${row.className} ${row.major} ${row.grade} ${row.floor} ${row.teoriRoomId} ${row.praktikRoomId}`).includes(normalizedDenahSearch)
        );
        const unassignedCount = denahClassRows.filter((row) => !assignedClassNames.has(row.className)).length;
        const selectedClassMeta = denahClassRows.find((row) => row.className === dragClassName);
        const renderDenahClassChips = (slotId, emptyText ="-") => {
          const slotClasses = String(activeDayMap?.[slotId]?.className ||"")
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean);
          if (slotClasses.length === 0) {
            return <span className="text-xs font-bold text-slate-400">{emptyText}</span>;
          }
          return (
            <div className="flex flex-wrap gap-1.5">
              {slotClasses.map((className) => (
                <Button variant="outline"
                  key={`${slotId}-${className}`}
                  type="button"
                  onClick={(event) =>{
                    event.stopPropagation();
                    removeClassFromDenahSlot(slotId, className);
                  }}
                  className="inline-flex items-center gap-1"
                  style={{ backgroundColor: getFloorLegend(className).color }}
                  title="Klik untuk melepas kelas dari slot ini"
                >
                  {className}
                  <X size={10} strokeWidth={3} /></Button>
              ))}
            </div>
          );
        };
        return (
          <div className="bg-white border border-slate-200/80 rounded-[var(--ui-radius-card)] p-4 md:p-5 shadow-xs flex flex-col gap-4 overflow-hidden">
            {/* Top Toolbar & KPI in unified box */}
            <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="grid grid-cols-3 gap-2 w-full xl:w-auto">
                <div className="rounded-[var(--ui-radius-small)] bg-slate-50 border border-slate-200/60 px-3.5 py-2">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Total Kelas</p>
                  <p className="text-base font-black text-slate-800">{denahClassRows.length}</p>
                </div>
                <div className="rounded-[var(--ui-radius-small)] bg-emerald-50 border border-emerald-200/80 px-3.5 py-2">
                  <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Terpasang</p>
                  <p className="text-base font-black text-emerald-800">{assignedClassNames.size}</p>
                </div>
                <div className="rounded-[var(--ui-radius-small)] bg-amber-50 border border-amber-200/80 px-3.5 py-2">
                  <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Belum</p>
                  <p className="text-base font-black text-amber-800">{unassignedCount}</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 justify-start xl:justify-end">
                <div className="flex gap-1 rounded-[var(--ui-radius-card)] bg-slate-100/90 p-1 border border-slate-200/60">
                  <button 
                    type="button" 
                    onClick={() => setLayoutPreset("kampus_a")} 
                    className={`px-3 py-1.5 rounded-[var(--ui-radius-small)] text-xs font-bold transition-all cursor-pointer ${layoutPreset === "kampus_a" ? "bg-white text-slate-900 shadow-2xs font-extrabold" : "text-slate-600 hover:text-slate-900"}`}
                  >
                    Kampus A - Teori
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setLayoutPreset("kampus_b")} 
                    className={`px-3 py-1.5 rounded-[var(--ui-radius-small)] text-xs font-bold transition-all cursor-pointer ${layoutPreset === "kampus_b" ? "bg-white text-slate-900 shadow-2xs font-extrabold" : "text-slate-600 hover:text-slate-900"}`}
                  >
                    Kampus B - Praktik
                  </button>
                </div>

                <Button variant="outline" type="button" onClick={generateRoomLayout} className="text-xs font-bold"><Wand2 size={13} /> Susun Otomatis</Button>
                <Button variant="outline" type="button" onClick={handleCopyCurrentDenahToAllDays} className="text-xs font-bold"><Copy size={13} /> Salin ke Semua Hari</Button>
                <Button variant="outline" type="button" onClick={handleClearCurrentDenahDay} className="text-xs font-bold"><RefreshCw size={13} /> Kosongkan Hari Ini</Button>
              </div>
            </div>

            {/* Days Tabs & Selected Class */}
            <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-3">
                <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
                  {days.map((day) => {
                    const dayMap = layoutByDay?.[day] || {};
                    const dayCount = new Set(Object.values(dayMap).flatMap((slot) => String(slot?.className ||"").split(",").map((item) => item.trim()).filter(Boolean))).size;
                    const isActiveDay = layoutDay === day;
                    return (
                      <Button variant="outline"
                        key={day}
                        type="button"
                        onClick={() =>{
                          setLayoutDay(day);
                          setDragClassName("");
                        }}
                        className={`shrink-0 text-left ${isActiveDay ?"bg-[var(--ui-primary)] text-white border-[var(--ui-primary)] shadow-sm" :"bg-white text-slate-600 border-slate-200 hover:bg-slate-50"}`}
                      >
                        <span className="block text-xs font-black">{day}</span>
                        <span className={`mt-0.5 block text-[10px] font-bold ${isActiveDay ?"text-white/75" :"text-slate-400"}`}>{dayCount} kelas terpasang</span></Button>
                    );
                  })}
                </div>
                <div className={`rounded-[var(--ui-radius-small)] border p-3 w-full xl:w-[320px] ${dragClassName ?"border-[var(--ui-primary)] bg-[var(--ui-accent)]/20" :"border-slate-200 bg-slate-50"}`}>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Kelas dipilih</p>
                  {dragClassName ? (
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <div>
                        <p className="text-base font-black text-slate-800">{dragClassName}</p>
                        <p className="text-[11px] font-bold text-slate-500">{selectedClassMeta?.major ||"-"} - Lt.{selectedClassMeta?.floor ||"-"} - klik ruang tujuan</p>
                      </div>
                      <Button variant="outline" type="button" onClick={() =>setDragClassName("")} ><X size={14} /></Button>
                    </div>
                  ) : (
                    <p className="mt-1 text-xs font-bold text-slate-500">Klik salah satu kelas dari daftar.</p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 2xl:grid-cols-[390px_minmax(0,1fr)] gap-4 items-start">
                <div className="border-none rounded-[var(--ui-radius-small)] overflow-hidden bg-white 2xl:sticky 2xl:top-4">
                  <div className="p-3 border-b border-slate-100">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs font-black text-slate-800">Daftar Kelas</p>
                      <span className="text-[10px] font-black text-slate-400">{filteredDenahClasses.length} data</span>
                    </div>
                    <div className="relative mt-2">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={denahClassSearch}
                        onChange={(event) => setDenahClassSearch(event.target.value)}
                        placeholder="Cari kelas atau jurusan..."
                        className="w-full border-none bg-slate-50 pl-9 pr-3 py-2 rounded-[var(--ui-radius-small)] text-xs font-bold focus:bg-white"
                      />
                    </div>
                  </div>
                  <div className="space-y-2 max-h-[560px] overflow-y-auto custom-scrollbar p-2">
                    {filteredDenahClasses.length === 0 ? (
                      <div className="rounded-[var(--ui-radius-small)] border border-dashed border-slate-200 bg-slate-50 p-4 text-center text-xs font-bold text-slate-400">
                        Tidak ada kelas yang cocok.
                      </div>
                    ) : filteredDenahClasses.map((x) => {
                      const isSelected = dragClassName === x.className;
                      const isAssigned = assignedClassNames.has(x.className);
                      return (
                        <Button variant="outline"
                          key={x.className}
                          type="button"
                          draggable
                          onDragStart={() =>setDragClassName(x.className)}
                          onClick={() => setDragClassName(x.className)}
                          className={`w-full text-left ${isSelected ?"bg-[var(--ui-primary)] text-white border-[var(--ui-primary)] shadow-sm" : isAssigned ?"bg-emerald-50 border-emerald-200 text-emerald-800" :"bg-slate-50 border-slate-200 text-slate-700 hover:bg-white"}`}
                        >
                          <span className="flex items-center justify-between gap-2">
                            <span className="font-black text-sm">{x.className}</span>
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-[var(--ui-radius-small)] ${isSelected ?"bg-white/20 text-white" : isAssigned ?"bg-emerald-100 text-emerald-700" :"bg-white text-slate-400"}`}>
                              {isAssigned ?"Terpasang" :"Belum"}
                            </span>
                          </span>
                          <span className={`mt-1 block text-[10px] font-bold ${isSelected ?"text-white/75" :"text-slate-400"}`}>
                            Lt.{x.floor ||"-"} - {x.major ||"-"} - Praktik: {x.praktikRoomId ||"-"}
                          </span></Button>
                      );
                    })}
                  </div>
                </div>
                <div className="min-w-0 border-none rounded-[var(--ui-radius-small)] p-3 bg-slate-50">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                    <div>
                      <p className="text-xs font-black text-slate-800">Denah Visual Hari {layoutDay}</p>
                      <p className="text-[11px] font-bold text-slate-500">Pilih kelas di kiri, lalu klik ruang pada denah. Geser peta bila layar kecil.</p>
                    </div>
                    {dragClassName && (
                      <span className="rounded-[var(--ui-radius-small)] bg-white border border-[var(--ui-primary)]/20 px-3 py-1.5 text-[10px] font-black text-[var(--ui-primary)]">
                        Siap ditempatkan: {dragClassName}
                      </span>
                    )}
                  </div>
                  {layoutPreset ==="kampus_a" ? (
                    renderKampusA(true)
                  ) : (
                    renderKampusB(true)
                  )}
                  <details className="mt-3 rounded-[var(--ui-radius-small)] border-none bg-white overflow-hidden">
                    <summary className="cursor-pointer list-none px-3 py-2.5 text-xs font-black text-slate-700">
                      Buka Slot Cepat per Zona
                      <span className="ml-2 text-[10px] font-bold text-slate-400">opsional jika lebih nyaman dari peta visual</span>
                    </summary>
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 max-h-[420px] overflow-y-auto custom-scrollbar border-t border-slate-100 bg-slate-50 p-3">
                      {Array.from({ length: Math.max(roomLayout.length, 8) }, (_, i) => i + 1).map((n) => {
                        const tId = `T-${n}`;
                        const pId = `P-${n}`;
                        return (
                          <div key={n} className="border-none rounded-[var(--ui-radius-card)] p-2 bg-white shadow-sm">
                            <div className="flex items-center justify-between mb-2">
                              <div className="text-[10px] font-black text-slate-500">ZONA {n}</div>
                              <div className="text-[9px] font-black text-slate-300">T{n} / P{n}</div>
                            </div>
                            <div
                              role="button"
                              tabIndex={0}
                              onClick={() => {
                                if (dragClassName) dropToSlot(tId);
                              }}
                              onKeyDown={(event) => {
                                if (dragClassName && (event.key ==="Enter" || event.key ==="")) {
                                  event.preventDefault();
                                  dropToSlot(tId);
                                }
                              }}
                              onDragOver={(event) => event.preventDefault()}
                              onDrop={() => dropToSlot(tId)}
                              className={`mb-2 min-h-[74px] border border-[var(--ui-primary)]/25 bg-[var(--ui-accent)]/20 rounded-[var(--ui-radius-small)] p-2 transition-all ${dragClassName ?"cursor-copy ring-2 ring-[var(--ui-primary)]/15 hover:border-[var(--ui-primary)]" :""}`}
                            >
                              <div className="text-[10px] font-black text-[var(--ui-primary)] mb-1">TEORI</div>
                              {renderDenahClassChips(tId,"Klik untuk isi teori")}
                            </div>
                            <div
                              role="button"
                              tabIndex={0}
                              onClick={() => {
                                if (dragClassName) dropToSlot(pId);
                              }}
                              onKeyDown={(event) => {
                                if (dragClassName && (event.key ==="Enter" || event.key ==="")) {
                                  event.preventDefault();
                                  dropToSlot(pId);
                                }
                              }}
                              onDragOver={(event) => event.preventDefault()}
                              onDrop={() => dropToSlot(pId)}
                              className={`min-h-[74px] border border-orange-200 bg-orange-50 rounded-[var(--ui-radius-small)] p-2 transition-all ${dragClassName ?"cursor-copy ring-2 ring-orange-200/70 hover:border-orange-300" :""}`}
                            >
                              <div className="text-[10px] font-black text-orange-700 mb-1">PRAKTIK</div>
                              {renderDenahClassChips(pId,"Klik untuk isi praktik")}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </details>
                </div>
              </div>
              <details className="mt-6 rounded-[var(--ui-radius-small)] border-none bg-slate-50 overflow-hidden">
                <summary className="cursor-pointer list-none px-4 py-3 text-sm font-black text-slate-700">
                  Pengaturan Lanjutan Denah
                  <span className="mt-1 block text-[11px] font-bold text-slate-400">Edit nama ruangan, label blok, serta export/import JSON denah.</span>
                </summary>
              <div className="border-t border-slate-200 bg-white p-4">
                <p className="text-xs font-black text-slate-600 mb-3">Edit Nama Ruangan (Cepat)</p>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {rooms.map((r) => (
                    <div key={r.id} className="border-none rounded-[var(--ui-radius-small)] p-3 bg-slate-50">
                      <div className="text-[10px] font-black text-slate-500 mb-1">{r.id} • {r.type}</div>
                      <input
                        defaultValue={r.name}
                        onBlur={(e) => renameRoomInline(r.id, e.target.value)}
                        className="w-full border-none bg-white px-2 py-1.5 rounded-[var(--ui-radius-small)] text-xs font-bold"
                      />
                    </div>
                  ))}
                </div>
              </div>
              <div className="border-t border-slate-200 bg-white p-4">
                <p className="text-xs font-black text-slate-600 mb-3">Edit Nama Blok Denah</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] font-black text-slate-500 uppercase mb-2">Kampus A - Blok Teori</p>
                    <div className="grid grid-cols-2 gap-2">
                      {Array.from({ length: 12 }, (_, i) => i).map((i) => (
                        <input
                          key={`label-a-${i}`}
                          value={layoutBlockLabels?.kampus_a?.teori?.[i] ||""}
                          onChange={(e) => setLayoutBlockLabels((prev) => ({
                            ...prev,
                            kampus_a: {
                              ...prev.kampus_a,
                              teori: (prev.kampus_a?.teori || []).map((v, idx) => idx === i ? e.target.value : v),
                            },
                          }))}
                          className="border-none bg-white px-2 py-1.5 rounded-[var(--ui-radius-small)] text-xs font-bold"
                        />
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-500 uppercase mb-2">Kampus B - Blok Praktik</p>
                    <div className="grid grid-cols-2 gap-2">
                      {Array.from({ length: 12 }, (_, i) => i).map((i) => (
                        <input
                          key={`label-b-${i}`}
                          value={layoutBlockLabels?.kampus_b?.praktik?.[i] ||""}
                          onChange={(e) => setLayoutBlockLabels((prev) => ({
                            ...prev,
                            kampus_b: {
                              ...prev.kampus_b,
                              praktik: (prev.kampus_b?.praktik || []).map((v, idx) => idx === i ? e.target.value : v),
                            },
                          }))}
                          className="border-none bg-white px-2 py-1.5 rounded-[var(--ui-radius-small)] text-xs font-bold"
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <div className="border-t border-slate-200 bg-white p-4 flex flex-wrap gap-2">
                <Button variant="outline" type="button" onClick={exportLayoutJson} >Export JSON Denah</Button>
                <label className="text-xs font-bold border-none rounded-[var(--ui-radius-small)] px-4 py-2 bg-white cursor-pointer hover:bg-slate-50">
                  Import JSON Denah
                  <input type="file" accept=".json" onChange={importLayoutJson} className="hidden" />
                </label>
              </div>
              </details>
            </div>
        );
}
