import React from"react";

export function useAdminRenderers(props) {
  const {
    layoutBlockLabels, updateKampusALabel, updateKampusBLabel, dropToSlot, dragClassName, setDragClassName,
    getFloorColorByClassName, getFloorLegend, layoutByDay, layoutDay,
    scheduleCellMap, currentUser, getMajorColorHex, handleDragOver, handleDragLeave, handleDrop, handleDragStart,
    teachers, parseCsvList, getPracticeRoomLabel, isGenerated, timeSlots, updateSelectionForTab, openModal, checkDependencies, handleDelete,
    days, openManualSlotModal
  } = props || {};

  // INJECTED BLOCKS

  const renderKampusA = (editable = false) => {
    const labelOf = (slot, fallback) => layoutBlockLabels?.kampus_a?.teori?.[slot - 1] || fallback;
    const classOf = (slot) => layoutByDay?.[layoutDay]?.[`T-${slot}`]?.className ||"-";
    const slotToneOf = (slot, isKosong) => {
      if (isKosong) return"border-slate-400 bg-slate-200 text-slate-400 opacity-80 cursor-not-allowed";
      if ([11, 12, 13, 14, 19, 21].includes(slot)) return"border-yellow-500 bg-yellow-400 text-slate-900";
      if ([6, 7, 8, 9, 10, 17, 18, 20, 22, 24, 26, 28].includes(slot)) return"border-pink-400 bg-pink-300 text-slate-900";
      if ([1, 2, 3, 4, 5, 15, 16, 23, 25, 27, 29, 30, 31].includes(slot)) return"border-orange-500 bg-orange-400 text-slate-900";
      return"border-slate-300 bg-slate-50 text-slate-900";
    };
    const roomBlock = (slot, fallback, wide = false) => {
      const label = labelOf(slot, fallback);
      const isKosong = label.toLowerCase().includes("kosong");
      return (
        <div
          key={`${slot}-${fallback}`}
          onDragOver={(e) => { if (editable && !isKosong) e.preventDefault(); }}
          onDrop={() => { if (editable && !isKosong) dropToSlot(`T-${slot}`); }}
          onClick={() => { if (editable && !isKosong && dragClassName) dropToSlot(`T-${slot}`); }}
          className={`border-2 ${slotToneOf(slot, isKosong)} min-h-[70px] ${wide ?"col-span-2" :""} ${editable && !isKosong ?"hover:ring-2 hover:ring-[var(--ui-accent)]/60" :""} ${editable && !isKosong && dragClassName ?"cursor-copy ring-1 ring-white/70" :""}`}
        >
          {editable ? (
            <div className="w-full flex flex-col items-center">
              <input
                value={labelOf(slot, fallback)}
                onChange={(e) => updateKampusALabel(slot, e.target.value)}
                className="w-full bg-transparent text-center text-lg md:text-2xl font-black leading-none pt-1 outline-none focus:bg-white/30"
                placeholder={fallback}
              />
              {(slot === 30 || slot === 31) && <span className="text-[10px] font-bold block text-slate-600 mt-0.5">Lt. 3</span>}
            </div>
          ) : (
            <div className="text-center text-lg md:text-2xl font-black leading-none pt-1">
              {label}
              {(slot === 30 || slot === 31) && <span className="text-[10px] font-bold block text-slate-600 mt-0.5">Lt. 3</span>}
            </div>
          )}
          {!isKosong && classOf(slot) !=="-" && (
            <div className="flex flex-wrap justify-center gap-1 mx-1 mt-1">
              {classOf(slot).split(',').map(c => c.trim()).filter(Boolean).map(clsName => (
                <div 
                  key={clsName} 
                  draggable={editable}
                  onDragStart={(e) => { e.stopPropagation(); if (editable) setDragClassName(clsName); }}
                  className={`cursor-pointer text-center text-[10px] md:text-xs font-black leading-tight px-1.5 py-0.5 rounded-sm border ${getFloorColorByClassName(clsName)}`} 
                  style={{ backgroundColor: getFloorLegend(clsName).color }}
                >
                  {clsName}
                </div>
              ))}
            </div>
          )}
        </div>
      );
    };
    const fixedBlock = (id, label, value ="-", tone ="neutral", wide = false) => {
      let toneClass ="border-[var(--ui-primary)]/70 bg-slate-200 text-slate-950";
      if (tone ==="yellow") toneClass ="border-yellow-500 bg-yellow-400 text-slate-950";
      if (tone ==="orange") toneClass ="border-orange-500 bg-orange-400 text-slate-950";
      if (tone ==="pink") toneClass ="border-pink-400 bg-pink-300 text-slate-950";

      return (
        <div key={id} className={`border-2 ${toneClass} min-h-[64px] flex flex-col items-center justify-center text-center font-black ${wide ?"col-span-2" :""}`}>
          <div className="text-lg md:text-2xl leading-none">{label}</div>
          {value && <div className="text-xs md:text-sm mt-1">{value}</div>}
        </div>
      );
    };

    return (
      <div className="bg-[var(--ui-surface)] border border-slate-200 rounded-[var(--ui-radius-small)] p-3 md:p-5 overflow-x-auto denah-scrollbar">
        <div className="min-w-[1000px]">
          <div className="grid grid-cols-[1.22fr_0.78fr] gap-4">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-slate-400 font-bold text-sm w-10 text-right">Lt.3</span>
                <div className="flex-1 grid grid-cols-5 gap-2">{[1, 2, 3, 4, 5].map((n) => roomBlock(n, `A-${n}`))}</div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-slate-400 font-bold text-sm w-10 text-right">Lt.2</span>
                <div className="flex-1 grid grid-cols-5 gap-2">{[6, 7, 8, 9, 10].map((n) => roomBlock(n, `A-${n}`))}</div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-slate-400 font-bold text-sm w-10 text-right">Lt.1</span>
                <div className="flex-1 grid grid-cols-5 gap-2">{[11, 12, 13, 14].map((n) => roomBlock(n, `A-${n}`))}{fixedBlock("kampus-a-rapat","R. Rapat","","neutral")}</div>
              </div>
              <div className="flex items-center justify-start gap-4 pt-1 text-sm md:text-base font-black text-slate-800 whitespace-nowrap pl-[52px]">
                <span>Ket :</span>
                <span className="inline-flex items-center gap-1.5"><span className="w-4 h-4 border border-slate-700 bg-yellow-400 inline-block" /> Lt. 1</span>
                <span className="inline-flex items-center gap-1.5"><span className="w-4 h-4 border border-slate-700 bg-pink-300 inline-block" /> Lt. 2</span>
                <span className="inline-flex items-center gap-1.5"><span className="w-4 h-4 border border-slate-700 bg-orange-400 inline-block" /> Lt. 3</span>
              </div>
              <div className="grid grid-cols-5 gap-3 pt-8">
                <div className="col-span-2 grid grid-cols-[auto_1fr_1fr] gap-3 items-center">
                  <span className="text-slate-400 font-bold text-sm w-10 text-right">Lt.3</span>
                  {roomBlock(15,"3C")}
                  {roomBlock(16,"4C")}
                  <span className="text-slate-400 font-bold text-sm w-10 text-right">Lt.2</span>
                  {roomBlock(17,"1C")}
                  {roomBlock(18,"2C")}
                  <span className="text-slate-400 font-bold text-sm w-10 text-right">Lt.1</span>
                  {fixedBlock("kampus-a-musholla","Musholla","-","neutral", true)}
                </div>
                <div className="col-span-3 grid grid-cols-[1fr_0.32fr] gap-2 min-h-[230px] items-end">
                  <div className="w-full h-40 bg-emerald-600 border-2 border-emerald-400/80 rounded-[var(--ui-radius-card)] shadow-xs relative overflow-hidden">
                    <div className="absolute inset-4 border-2 border-white/80 rounded-[var(--ui-radius-small)]"></div>
                    <div className="absolute left-1/2 top-0 bottom-0 border-l-2 border-white/80"></div>
                    <div className="absolute left-1/2 top-1/2 w-16 h-16 -translate-x-1/2 -translate-y-1/2 border-2 border-white/80 rounded-full"></div>
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                      <div className="text-xl font-black">KAMPUS A</div>
                      <div className="text-5xl font-black leading-none">LAPANGAN</div>
                    </div>
                  </div>
                  <div className="w-full h-40 bg-emerald-600 border-2 border-emerald-400/80 rounded-[var(--ui-radius-card)] shadow-xs relative overflow-hidden">
                    <div className="absolute inset-3 border-2 border-white/80 rounded-[var(--ui-radius-small)]"></div>
                    <div className="absolute left-0 right-0 top-1/2 border-t-2 border-white/80"></div>
                    <div className="absolute left-1/2 top-1/2 w-12 h-12 -translate-x-1/2 -translate-y-1/2 border-2 border-white/80 rounded-full"></div>
                  </div>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2 grid grid-cols-2 gap-2">
                {roomBlock(30,"INFO 1")}
                {roomBlock(31,"INFO 2")}
              </div>
              <div className="flex items-center justify-center"></div>
              <div className="col-span-2">{fixedBlock("kampus-a-perpus","PERPUSTAKAAN","Lt. 2","neutral", true)}</div>
              <div className="flex items-center justify-center"></div>
              {roomBlock(19,"2A")}
              {roomBlock(20,"3A")}
              {fixedBlock("kampus-a-empty-3","","","orange")}
              {roomBlock(21,"1A")}
              {roomBlock(22,"4A")}
              {roomBlock(23,"11A")}
              {fixedBlock("kampus-a-staff-1","R. Staff","","yellow")}
              {roomBlock(24,"5A")}
              {roomBlock(25,"10A")}
              {fixedBlock("kampus-a-guru","R. Guru","","yellow")}
              {roomBlock(26,"6A")}
              {roomBlock(27,"9A")}
              {fixedBlock("kampus-a-staff-2","R. Staff","","yellow")}
              {roomBlock(28,"7A")}
              {roomBlock(29,"8A")}
              <div className="text-center font-black text-slate-400 mt-1 text-[13px] uppercase tracking-wider">Lt. 1</div>
              <div className="text-center font-black text-slate-400 mt-1 text-[13px] uppercase tracking-wider">Lt. 2</div>
              <div className="text-center font-black text-slate-400 mt-1 text-[13px] uppercase tracking-wider">Lt. 3</div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderKampusB = (editable = false) => {
    const labelOf = (slot, fallback) => layoutBlockLabels?.kampus_b?.praktik?.[slot - 1] || fallback;
    const classOf = (slot) => layoutByDay?.[layoutDay]?.[`P-${slot}`]?.className ||"-";

    const boxColorMap = {
      1:"bg-[#0ea5e9] text-white", // Lab HW (Blue)
      2:"bg-[#0ea5e9] text-white", // Lab SW (Blue)
      3:"bg-[#0ea5e9] text-white", // Lab COE (Blue)
      4:"bg-[#f97316] text-white", // Bengkel TKR (Orange)
      5:"bg-[#f97316] text-white", // Bengkel TKR (Orange)
      6:"bg-[#f472b6] text-slate-900", // Lab AK 1 (Pink)
      7:"bg-[#f472b6] text-slate-900", // Lab AK 2 (Pink)
      8:"bg-[#22c55e] text-white", // Lab MP 1 (Green)
      9:"bg-[#22c55e] text-white", // Lab MP 2 (Green)
      10:"bg-[#f97316] text-white" // Bengkel TKR Bottom (Orange)
    };

    const labBlock = (slot, fallback, span = 1) => {
      const className = classOf(slot);
      const isFilled = className !=="-";
      const theme = boxColorMap[slot] ||"bg-slate-100 text-slate-900";
      
      return (
        <div
          key={`kampus-b-${slot}`}
          onDragOver={(e) => editable && e.preventDefault()}
          onDrop={() => editable && dropToSlot(`P-${slot}`)}
          onClick={() => { if (editable && dragClassName) dropToSlot(`P-${slot}`); }}
          className={`border border-white/40 ${theme} min-h-[110px] rounded p-2 flex flex-col items-center justify-start text-center shadow-sm ${span > 1 ? `col-span-${span}` :""} ${editable ?"hover:ring-4 hover:ring-white/80" :""} ${editable && dragClassName ?"cursor-copy ring-1 ring-white/60" :""}`}
        >
          {editable ? (
            <input
              value={labelOf(slot, fallback)}
              onChange={(e) => updateKampusBLabel(slot, e.target.value)}
              className="w-full bg-transparent text-center text-[11px] md:text-sm font-black outline-none placeholder-white/50"
              placeholder={fallback}
            />
          ) : (
            <div className="text-[11px] md:text-sm font-black">{labelOf(slot, fallback)}</div>
          )}
          <div className="flex flex-wrap justify-center gap-1 mt-2">
            {className !=="-" && className.split(',').map(c => c.trim()).filter(Boolean).map(clsName => {
              const legend = getFloorLegend(clsName);
              return (
                <div
                  key={clsName}
                  draggable={editable}
                  onDragStart={(e) => { e.stopPropagation(); if (editable) setDragClassName(clsName); }}
                  className="cursor-pointer rounded border border-white/50 px-1.5 py-0.5 text-[9px] md:text-[10px] font-black text-slate-900 shadow-sm"
                  style={{ backgroundColor: legend.color ||"#fff" }}
                  title={legend.label}
                >
                  {clsName}
                </div>
              );
            })}
          </div>
        </div>
      );
    };

    return (
      <div className="bg-[var(--ui-surface)] border border-slate-200 rounded-[var(--ui-radius-small)] p-3 md:p-5 overflow-x-auto">
        <div className="min-w-[980px] max-w-[1200px] mx-auto bg-white p-6 rounded-[var(--ui-radius-small)] border border-slate-200 shadow-sm">
          {/* Row 1: Lt.2 */}
          <div className="grid grid-cols-8 gap-3 mb-3">
            <div className="col-span-2"></div>
            {labBlock(1,"Lab HW")}
            {labBlock(2,"Lab SW")}
            <div className="bg-[#b7e4ef] border-2 border-[#f97316] min-h-[110px] rounded flex items-center justify-center text-center shadow-sm">
              <span className="text-[#f97316] font-black text-[10px] md:text-xs">R SERVER</span>
            </div>
            {labBlock(3,"Lab COE", 2)}
            <div className="flex items-center justify-center font-black text-slate-800 text-sm md:text-base">Lt.2</div>
          </div>

          {/* Row 2: Lt.1 */}
          <div className="grid grid-cols-8 gap-3 mb-3">
            {labBlock(4,"Bengkel TKR")}
            {labBlock(5,"Bengkel TKR")}
            <div className="bg-[#fde047] border-2 border-[#f97316] min-h-[110px] rounded flex items-center justify-center text-center shadow-sm">
              <span className="text-[#f97316] font-black text-[10px] md:text-xs">R HUBIN</span>
            </div>
            {labBlock(6,"Lab AK 1")}
            {labBlock(7,"Lab AK 2")}
            {labBlock(8,"Lab MP 1")}
            {labBlock(9,"Lab MP 1")}
            <div className="flex items-center justify-center font-black text-slate-800 text-sm md:text-base">Lt.1</div>
          </div>

          {/* Row 3: Lapangan */}
          <div className="grid grid-cols-8 gap-3 mb-3">
            <div className="col-span-2"></div>
            <div className="col-span-5 h-64 bg-[#22c55e] border border-green-600 rounded relative overflow-hidden shadow-inner">
              <div className="absolute inset-4 border-2 border-white/60 rounded-sm"></div>
              <div className="absolute left-1/2 top-0 bottom-0 border-l-2 border-white/60"></div>
              <div className="absolute left-1/2 top-1/2 w-24 h-24 -translate-x-1/2 -translate-y-1/2 border-2 border-white/60 rounded-full"></div>
              <div className="absolute inset-0 flex items-center justify-center text-3xl font-black text-slate-900/80 tracking-widest">Lapangan</div>
            </div>
            <div className="col-span-1"></div>
          </div>

          {/* Row 4: Bengkel TKR Bawah */}
          <div className="grid grid-cols-8 gap-3">
            <div className="col-span-2"></div>
            {labBlock(10,"Bengkel TKR", 3)}
            <div className="col-span-3"></div>
          </div>

        </div>
      </div>
    );
  };

  const renderScheduleTable = (displayClasses, readOnly = true, scheduleFilterDay ="Semua") => {
    if (!displayClasses || displayClasses.length === 0) return <div className="p-12 text-center text-slate-400 font-medium print:hidden">Tidak ada kelas untuk tingkatan ini.</div>;
    if (!isGenerated) return <div className="p-12 text-center text-slate-400 font-medium print:hidden">Jadwal belum digenerate oleh Admin.</div>;
    return (
      <div className="w-full bg-white/60 backdrop-blur-md rounded-[1.5rem] shadow-sm border-2 border-slate-100 print:w-full print:overflow-visible print:!border-0 print:!shadow-none print:rounded-none">
        <table className="text-xs border-collapse schedule-print-table" style={{ minWidth:'max-content' }}>
          <thead>
            <tr>
              <th className="p-3 bg-slate-50 text-slate-700 font-bold sticky top-0 left-0 z-40 border-b border-slate-200 min-w-[50px] max-w-[50px] print:static print:bg-white print:text-black print:border-slate-300 print:border print:!shadow-none">Hari</th>
              <th className="p-3 bg-slate-50 text-slate-700 font-bold sticky top-0 left-[50px] z-40 border-b border-slate-200 min-w-[30px] max-w-[30px] text-center print:static print:bg-white print:text-black print:border-slate-300 print:border print:!shadow-none">Ke</th>
              <th className="p-3 bg-slate-50 text-slate-700 font-bold sticky top-0 left-[80px] z-40 border-b border-slate-200 min-w-[100px] print:static print:bg-white print:text-black print:border-slate-300 print:border print:!shadow-none">Waktu</th>
              {displayClasses.map((c) => {
                const colColor = getMajorColorHex(c.name);
                return (
                  <th 
                    key={c.name} 
                    className="p-2 text-slate-800 min-w-[90px] max-w-[90px] sticky top-0 z-30 border-b-[2px] border-slate-300 drop-shadow-sm print:static print:bg-gray-200 print:text-black print:border-black print:border print:!shadow-none print:!drop-shadow-none print:min-w-0 print:max-w-none print:w-auto"
                  style={{ backgroundColor: colColor }}
                >
                  <div className="font-bold text-[11.5px] uppercase tracking-wide leading-tight">{c.name}</div>
                </th>
              )})}
            </tr>
          </thead>
          <tbody>
            {days.filter(d => scheduleFilterDay ==="Semua" || d === scheduleFilterDay).map((day) => {
              const dailySlots = timeSlots[day] || [];
              if (dailySlots.length === 0) return null;
              let siklusCounter = 1;
              return (
                <React.Fragment key={day}>
                  {dailySlots.map((slot, sIdx) => {
                    const isLastSlot = sIdx === dailySlots.length - 1;
                    const bColor = isLastSlot ?"border-b-[3px] border-slate-400 print:!border-b-[2.5px] print:!border-b-slate-800" :"border-b border-slate-200";
                    const isBreak = slot.isBreak;
                    const siklusLabel = isBreak ?"" : siklusCounter++;

                    if (isBreak) {
                      const isNonLesson = slot.labelBreak && slot.labelBreak.toUpperCase() !=="ISTIRAHAT" && slot.labelBreak.toUpperCase() !=="BREAK";
                      return (
                      <tr key={`${day}-${slot.id}`} className={isLastSlot ?"day-boundary" :""}>
                        {sIdx === 0 && (
                          <td rowSpan={dailySlots.length} className="border-b-[2px] border-slate-400 bg-slate-100 font-black sticky left-0 z-20 text-center text-slate-800 min-w-[50px] max-w-[50px] border-r border-slate-300 print:static print:!bg-white print:!text-black print:border-slate-600 print:border">
                            <span className="print:hidden" style={{ writingMode:"vertical-lr", transform:"rotate(180deg)", letterSpacing:"0.1em" }}>{day.toUpperCase()}</span>
                            <span className="hidden print:inline">{day.toUpperCase()}</span>
                          </td>
                        )}
                        <td className={`${bColor} p-2 text-center text-slate-400 font-bold sticky left-[50px] z-20 bg-slate-50/90 min-w-[30px] max-w-[30px] print:static print:border-slate-600 print:border`}></td>
                        <td className={`${bColor} p-2 text-center text-slate-500 font-bold sticky left-[80px] z-20 bg-slate-50/90 min-w-[100px] whitespace-pre-wrap leading-relaxed print:static print:border-slate-600 print:border`}>{slot.label}</td>
                        <td 
                          colSpan={displayClasses.length} 
                          className={`${bColor} break-row text-center font-black tracking-[0.3em] py-3 print:border-slate-600 print:border ${
                            isNonLesson 
                              ?"bg-pink-50 text-pink-700 print:!bg-[#fdf2f8] print:!text-pink-900" 
                              :"bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTAgNDBsNDAtNDBIMzBMMSAzOXYxbDgtOHYtMUwxMCA0MHoiIGZpbGw9IiNlMmU4ZjAiIGZpbGwtb3BhY2l0eT0iMC42IiBmaWxsLXJ1bGU9ImV2ZW5vZGQiLz48L3N2Zz4=')] text-slate-500 print:!bg-slate-100 print:!text-black"
                          }`}
                        >
                          {slot.labelBreak ||"ISTIRAHAT"}
                        </td>
                      </tr>
                    );}
                    return (
                      <tr key={`${day}-${slot.id}`} className={isLastSlot ?"day-boundary hover:bg-slate-50/50" :"hover:bg-slate-50/50"}>
                        {sIdx === 0 && (
                          <td rowSpan={dailySlots.length} className="border-b-[2px] border-slate-400 bg-slate-100 font-black sticky left-0 z-20 text-center text-slate-800 min-w-[50px] max-w-[50px] border-r border-slate-300 print:static print:!bg-white print:!text-black print:border-black print:border">
                            <span className="print:hidden" style={{ writingMode:"vertical-lr", transform:"rotate(180deg)", letterSpacing:"0.1em" }}>{day.toUpperCase()}</span><span className="hidden print:inline">{day.toUpperCase()}</span>
                          </td>
                        )}
                        <td className={`${bColor} p-2 text-center text-slate-800 font-black sticky left-[50px] z-20 bg-white/90 min-w-[30px] max-w-[30px] border-r border-slate-300 print:static print:border-black print:border`}>{siklusLabel}</td>
                        <td className={`${bColor} p-2 text-center text-slate-600 font-bold sticky left-[80px] z-20 bg-white/90 min-w-[100px] border-r border-slate-300 whitespace-pre-wrap leading-relaxed print:static print:border-black print:border`}>{slot.label}</td>
                        {displayClasses.map((cls) => {
                          const cellData = scheduleCellMap.get(`${day}-${slot.id}-${cls.name}`);
                          const isMyClass = currentUser?.role ==="guru" && cellData && String(cellData.teacherCode ||"").split(",").map(c => c.trim()).includes(currentUser?.code);
                          const colColor = getMajorColorHex(cls.name);
                          return (
                            <td
                              key={`${day}-${slot.id}-${cls.name}`}
                              className={`border-b border-r border-slate-300 p-1.5 transition-colors relative print:border-slate-600 print:border print:p-1 ${readOnly ?"" :"hover:bg-slate-50 cursor-pointer"} ${isMyClass ?"ring-inset ring-2 ring-[var(--ui-accent)]" : (sIdx % 2 !== 0 ?"bg-slate-50 print:!bg-slate-100" :"bg-white print:!bg-white")}`}
                              onDragOver={readOnly ? undefined : handleDragOver} onDragLeave={readOnly ? undefined : handleDragLeave} onDrop={readOnly ? undefined : (e) => handleDrop(e, day, slot.id, cls.name)}
                              onClick={!readOnly && openManualSlotModal ? () => openManualSlotModal(day, slot.id, cls.name, cellData) : undefined}
                              title={!readOnly ? "Klik untuk edit slot manual atau tarik/geser slot" : undefined}
                            >
                              {cellData ? (
                                <div
                                  draggable={!readOnly} onDragStart={readOnly ? undefined : (e) => handleDragStart(e, day, slot.id, cls.name)}
                                  className={`h-full flex items-center justify-center text-center text-[9.5px] leading-[1.15] p-1 rounded transition-transform print:p-[3px] border ${!readOnly ?"cursor-grab active:cursor-grabbing hover:scale-[1.02]" :""} ${isMyClass ?"text-white border-transparent" :""}`}
                                  style={isMyClass ? { backgroundColor: colColor.startsWith('var') ?'var(--ui-primary)' : colColor } : { backgroundColor:"#ffffff", borderColor: colColor.startsWith('var') ?'var(--ui-primary)' : `${colColor}66`, color:"#1e293b" }}
                                >
                                  <div className={`font-semibold truncate whitespace-nowrap text-center w-full ${isMyClass ?"text-white" :"text-slate-800 print:text-slate-900"}`}>
                                    {cellData.subject} 
                                    <span className="font-bold ml-1" style={!isMyClass ? { color: colColor.startsWith('var') ?'var(--ui-primary)' : colColor } : {}}>
                                      - {cellData.teacherCode}
                                    </span>
                                  </div>
                                </div>
                              ) : null}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </React.Fragment>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-slate-50/50 print:bg-white">
              <td className="p-2 border border-slate-300 font-bold sticky left-0 z-20 text-center text-slate-500 min-w-[50px] print:static print:border-slate-300 print:border print:!shadow-none">-</td>
              <td className="p-2 border border-slate-300 font-bold sticky left-[50px] z-20 text-center text-slate-500 min-w-[30px] max-w-[30px] print:static print:border-slate-300 print:border print:!shadow-none">-</td>
              <td className="p-2 border border-slate-300 font-bold sticky left-[80px] z-20 text-center text-slate-500 min-w-[100px] whitespace-nowrap print:static print:border-slate-300 print:border print:text-black print:!shadow-none">Wali Kelas</td>
              {displayClasses.map((c) => {
                const displayCode = c.homeroom ? (teachers.find(t => t.name === c.homeroom)?.code || c.homeroom) :"-";
                return (
                  <td 
                    key={`foot-${c.name}`} 
                    className="p-2 text-center border border-slate-300 bg-slate-50/10 print:!bg-white text-slate-600 font-bold text-[10px] truncate max-w-[150px] print:border-slate-300 print:border print:text-slate-800"
                  >
                    {displayCode}
                  </td>
                );
              })}
            </tr>
          </tfoot>
        </table>
      </div>
    );
  };

  return {
    renderKampusA,
    renderKampusB,
    renderScheduleTable
  };
}
