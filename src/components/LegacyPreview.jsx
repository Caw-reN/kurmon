import { useState } from'react';
import { useAppStore } from'../store/useAppStore';

import React from"react";

export function LegacyScheduleTable({ 
  displayClasses, 
  primaryColor ="#064e3b", 
}) {
  const { getSchedule, getDays, getTimeSlots } = useAppStore();
  const schedule = getSchedule();
  const days = getDays();
  const timeSlots = getTimeSlots();

  const getMajorColorHex = (className) => {
    const name = String(className).toUpperCase();
    if (name.includes("AK")) return"#f472b6"; // pink-400
    if (name.includes("MP")) return"#4ade80"; // green-400
    if (name.includes("TKJ")) return"#60a5fa"; // blue-400
    if (name.includes("TKR")) return"#fb923c"; // orange-400
    return primaryColor; // fallback
  };

  if (!displayClasses || displayClasses.length === 0) {
    return (
      <div className="p-12 text-center text-slate-400 font-medium bg-white rounded-[var(--ui-radius-small)] -[1.5rem] border-none">
        Tidak ada kelas yang cocok.
      </div>
    );
  }

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
                  className="p-2 text-slate-800 min-w-[90px] max-w-[90px] sticky top-0 z-30 border-b-[2px] border-slate-300 drop-shadow-sm print:static print:bg-slate-200 print:text-black print:border-black print:border print:!shadow-none print:!drop-shadow-none print:min-w-0 print:max-w-none print:w-auto text-center"
                  style={{ backgroundColor: colColor }}
                >
                  <div className="font-bold text-[11.5px] uppercase tracking-wide leading-tight">{c.name}</div>
                  {c.homeroom && (
                    <div 
                      className="text-[9px] opacity-90 mt-0.5 truncate print:hidden" 
                      title={`Wali Kelas: ${c.homeroom}`}
                    >
                      Wali: {c.homeroom}
                    </div>
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {days.map((day) => {
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
                          <td 
                            rowSpan={dailySlots.length} 
                            className="border-b-[2px] border-slate-400 bg-slate-100 font-black sticky left-0 z-20 text-center text-slate-800 min-w-[50px] max-w-[50px] border-r border-slate-300 print:static print:!bg-white print:!text-black print:border-slate-600 print:border"
                          >
                            <span className="print:hidden" style={{ writingMode:"vertical-lr", transform:"rotate(180deg)", letterSpacing:"0.1em" }}>{day.toUpperCase()}</span>
                            <span className="hidden print:inline">{day.toUpperCase()}</span>
                          </td>
                        )}
                        <td className={`${bColor} p-2 text-center text-slate-400 font-bold sticky left-[50px] z-20 bg-slate-50/80 min-w-[30px] max-w-[30px] border-r border-slate-200/60 print:static print:border-slate-600 print:border`}></td>
                        <td className={`${bColor} p-2 text-center text-slate-500 font-bold sticky left-[80px] z-20 bg-slate-50/80 min-w-[100px] border-r border-slate-200/60 whitespace-pre-wrap leading-relaxed print:static print:border-slate-600 print:border`}>{slot.label}</td>
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
                    );
                  }
                  return (
                    <tr key={`${day}-${slot.id}`} className={isLastSlot ?"day-boundary hover:bg-slate-50/50" :"hover:bg-slate-50/50"}>
                      {sIdx === 0 && (
                        <td 
                          rowSpan={dailySlots.length} 
                          className="border-b-[2px] border-slate-400 bg-slate-100 font-black sticky left-0 z-20 text-center text-slate-800 min-w-[50px] max-w-[50px] border-r border-slate-300 print:static print:!bg-white print:!text-black print:border-black print:border"
                        >
                          <span className="print:hidden" style={{ writingMode:"vertical-lr", transform:"rotate(180deg)", letterSpacing:"0.1em" }}>{day.toUpperCase()}</span>
                          <span className="hidden print:inline">{day.toUpperCase()}</span>
                        </td>
                      )}
                      <td className={`${bColor} p-2 text-center text-slate-800 font-black sticky left-[50px] z-20 bg-white/80 min-w-[30px] max-w-[30px] border-r border-slate-300 print:static print:border-black print:border`}>{siklusLabel}</td>
                      <td className={`${bColor} p-2 text-center text-slate-600 font-bold sticky left-[80px] z-20 bg-white/80 min-w-[100px] border-r border-slate-300 whitespace-pre-wrap leading-relaxed print:static print:border-black print:border`}>{slot.label}</td>
                      {displayClasses.map((cls) => {
                        const cellData = schedule.find((s) => s.day === day && s.slotId === slot.id && s.className === cls.name);
                        const colColor = getMajorColorHex(cls.name);
                        return (
                          <td
                            key={`${day}-${slot.id}-${cls.name}`}
                            className={`${bColor} border-r border-slate-300 p-1.5 transition-colors relative print:border-slate-600 print:border print:p-1 ${sIdx % 2 !== 0 ?"bg-slate-50 print:!bg-slate-100" :"bg-white print:!bg-white"}`}
                          >
                            {cellData ? (
                              <div 
                                className="h-full flex items-center justify-center text-center text-[9.5px] leading-[1.15] p-1 rounded transition-transform print:p-[3px] border"
                                style={{ backgroundColor:"#ffffff", borderColor: colColor.startsWith('var') ?'var(--ui-primary)' : `${colColor}66`, color:"#1e293b" }}
                              >
                                <div className="font-semibold truncate whitespace-nowrap text-center w-full text-slate-800 print:text-slate-900">
                                  {cellData.subject} 
                                  <span className="font-bold ml-1" style={{ color: colColor.startsWith('var') ?'var(--ui-primary)' : colColor }}>
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
            {displayClasses.map((c) => (
              <td 
                key={`foot-${c.name}`} 
                className="p-2 text-center border border-slate-300 bg-slate-50/10 print:!bg-white text-slate-600 font-bold text-[10px] truncate max-w-[150px] print:border-slate-300 print:border print:text-slate-800"
                title={c.homeroom ||"-"}
              >
                {c.homeroom ||"-"}
              </td>
            ))}
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

export function LegacyDenahPreview({ 
  layoutDay, 
  primaryColor ="#064e3b", 
  accentColor ="#a3e635",
  layoutPreset: propLayoutPreset,
  setLayoutPreset: propSetLayoutPreset
}) {
  const { getLayoutSettings, getLayoutByDay, getLayoutBlockLabels } = useAppStore();
  const [localLayoutPreset, setLocalLayoutPreset] = useState("kampus_a");
  
  const layoutPreset = propLayoutPreset !== undefined ? propLayoutPreset : localLayoutPreset;
  const setLayoutPreset = propSetLayoutPreset !== undefined ? propSetLayoutPreset : setLocalLayoutPreset;
  
  const layoutSettings = getLayoutSettings();
  const layoutByDay = getLayoutByDay();
  const layoutBlockLabels = getLayoutBlockLabels();
  const defaultKampusALabels = ["13B","13B","12B","11B","10B","5B","6B","7B","8B","9B","4B","3B","2B","1B","3C","4C","1C","2C","2A","3A","1A","4A","11A","5A","10A","6A","9A","7A","8A",
  ];
  const defaultKampusBLabels = ["Lab HW","Lab SW","Lab COE","Bengkel TKR","Bengkel TKR","Lab AK 1","Lab AK 2","Lab MP 1","Lab MP 1","Bengkel TKR",
  ];

  const getFloorColorByClassName = (className) => {
    const value = String(className ||"").toUpperCase();
    if (value.startsWith("XII")) return"bg-orange-100 text-orange-800";
    if (value.startsWith("XI")) return"bg-pink-100 text-pink-800";
    if (value.startsWith("X")) return"bg-yellow-100 text-yellow-900";
    return"bg-slate-100 text-slate-500";
  };

  const getFloorLegend = (className) => {
    const value = String(className ||"").toUpperCase();
    if (value.startsWith("XII")) return layoutSettings?.floorLegend?.XII || { label:"Lt. 3", color:"#f97316" };
    if (value.startsWith("XI")) return layoutSettings?.floorLegend?.XI || { label:"Lt. 2", color:"#f9a8d4" };
    if (value.startsWith("X")) return layoutSettings?.floorLegend?.X || { label:"Lt. 1", color:"#fef08a" };
    return { label:"-", color:"#e2e8f0" };
  };

  const renderKampusA = () => {
    const labelOf = (slot, fallback) => layoutBlockLabels?.kampus_a?.teori?.[slot - 1] || defaultKampusALabels[slot - 1] || fallback;
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
          className={`border-2 ${slotToneOf(slot, isKosong)} min-h-[70px] ${wide ?"col-span-2" :""}`}
        >
          <div className="text-center text-lg md:text-2xl font-black leading-none pt-1">
            {label}
            {(slot === 30 || slot === 31) && <span className="text-[10px] font-bold block text-slate-600 mt-0.5">Lt. 3</span>}
          </div>
          {!isKosong && classOf(slot) !=="-" && (
            <div className="flex flex-wrap justify-center gap-1 mx-1 mt-1">
              {classOf(slot).split(",").map((c) => c.trim()).filter(Boolean).map((clsName) => (
                <div
                  key={clsName}
                  className={`cursor-pointer text-center text-[10px] md:text-xs font-black leading-tight px-1.5 py-0.5 rounded-[var(--ui-radius-small)] border ${getFloorColorByClassName(clsName)}`}
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
      <div className="bg-[var(--ui-surface)] border-none rounded-[var(--ui-radius-small)] p-3 md:p-5 overflow-x-auto denah-scrollbar">
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
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-4 h-4 border border-slate-700 bg-yellow-400 inline-block" />
                  Lt. 1
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-4 h-4 border border-slate-700 bg-pink-300 inline-block" />
                  Lt. 2
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-4 h-4 border border-slate-700 bg-orange-400 inline-block" />
                  Lt. 3
                </span>
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
                  <div className="w-full h-40 bg-emerald-500 border-4 border-emerald-700 rounded-[var(--ui-radius-small)] relative overflow-hidden">
                    <div className="absolute inset-4 border-2 border-white/80 rounded-[var(--ui-radius-small)]"></div>
                    <div className="absolute left-1/2 top-0 bottom-0 border-l-2 border-white/80"></div>
                    <div className="absolute left-1/2 top-1/2 w-16 h-16 -translate-x-1/2 -translate-y-1/2 border-2 border-white/80 rounded-[var(--ui-radius-small)]"></div>
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                      <div className="text-xl font-black">KAMPUS A</div>
                      <div className="text-5xl font-black leading-none">LAPANGAN</div>
                    </div>
                  </div>
                  <div className="w-full h-40 bg-emerald-500 border-4 border-emerald-700 rounded-[var(--ui-radius-small)] relative overflow-hidden">
                    <div className="absolute inset-3 border-2 border-white/80 rounded-[var(--ui-radius-small)]"></div>
                    <div className="absolute left-0 right-0 top-1/2 border-t-2 border-white/80"></div>
                    <div className="absolute left-1/2 top-1/2 w-12 h-12 -translate-x-1/2 -translate-y-1/2 border-2 border-white/80 rounded-[var(--ui-radius-small)]"></div>
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

  const renderKampusB = () => {
    const labelOf = (slot, fallback) => layoutBlockLabels?.kampus_b?.praktik?.[slot - 1] || defaultKampusBLabels[slot - 1] || fallback;
    const classOf = (slot) => layoutByDay?.[layoutDay]?.[`P-${slot}`]?.className ||"-";

    const boxColorMap = {
      1:"bg-[#0ea5e9] text-white",
      2:"bg-[#0ea5e9] text-white",
      3:"bg-[#0ea5e9] text-white",
      4:"bg-[#f97316] text-white",
      5:"bg-[#f97316] text-white",
      6:"bg-[#f472b6] text-slate-900",
      7:"bg-[#f472b6] text-slate-900",
      8:"bg-[#22c55e] text-white",
      9:"bg-[#22c55e] text-white",
      10:"bg-[#f97316] text-white"
    };

    const labBlock = (slot, fallback, span = 1) => {
      const className = classOf(slot);
      const theme = boxColorMap[slot] ||"bg-slate-100 text-slate-900";
      const spanStyle = span > 1 ? { gridColumn: `span ${span} / span ${span}` } : {};

      return (
        <div
          key={`kampus-b-${slot}`}
          className={`border border-white/40 ${theme} min-h-[110px] rounded-[var(--ui-radius-small)] p-2 flex flex-col items-center justify-start text-center shadow-sm`}
          style={spanStyle}
        >
          <div className="text-[11px] md:text-sm font-black">{labelOf(slot, fallback)}</div>
          <div className="flex flex-wrap justify-center gap-1 mt-2">
            {className !=="-" && className.split(",").map((c) => c.trim()).filter(Boolean).map((clsName) => {
              const legend = getFloorLegend(clsName);
              return (
                <div
                  key={clsName}
                  className="cursor-pointer rounded-[var(--ui-radius-small)] border border-white/50 px-1.5 py-0.5 text-[9px] md:text-[10px] font-black text-slate-900 shadow-sm"
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
      <div className="bg-[var(--ui-surface)] border-none rounded-[var(--ui-radius-small)] p-3 md:p-5 overflow-x-auto">
        <div className="min-w-[980px] max-w-[1200px] mx-auto bg-white p-6 rounded-[var(--ui-radius-control)] border-none shadow-sm">
          <div className="grid grid-cols-8 gap-3 mb-3">
            <div className="col-span-2" />
            {labBlock(1,"Lab HW")}
            {labBlock(2,"Lab SW")}
            <div className="bg-[#b7e4ef] border-2 border-[#f97316] min-h-[110px] rounded-[var(--ui-radius-small)] flex items-center justify-center text-center shadow-sm">
              <span className="text-[#f97316] font-black text-[10px] md:text-xs">R SERVER</span>
            </div>
            {labBlock(3,"Lab COE", 2)}
            <div className="flex items-center justify-center font-black text-slate-800 text-sm md:text-base">Lt.2</div>
          </div>

          <div className="grid grid-cols-8 gap-3 mb-3">
            {labBlock(4,"Bengkel TKR")}
            {labBlock(5,"Bengkel TKR")}
            <div className="bg-[#fde047] border-2 border-[#f97316] min-h-[110px] rounded-[var(--ui-radius-small)] flex items-center justify-center text-center shadow-sm">
              <span className="text-[#f97316] font-black text-[10px] md:text-xs">R HUBIN</span>
            </div>
            {labBlock(6,"Lab AK 1")}
            {labBlock(7,"Lab AK 2")}
            {labBlock(8,"Lab MP 1")}
            {labBlock(9,"Lab MP 1")}
            <div className="flex items-center justify-center font-black text-slate-800 text-sm md:text-base">Lt.1</div>
          </div>

          <div className="grid grid-cols-8 gap-3 mb-3">
            <div className="col-span-2" />
            <div className="col-span-5 h-64 bg-[#22c55e] border border-emerald-600 rounded-[var(--ui-radius-small)] relative overflow-hidden shadow-inner">
              <div className="absolute inset-4 border-2 border-white/60 rounded-[var(--ui-radius-small)]" />
              <div className="absolute left-1/2 top-0 bottom-0 border-l-2 border-white/60" />
              <div className="absolute left-1/2 top-1/2 w-24 h-24 -translate-x-1/2 -translate-y-1/2 border-2 border-white/60 rounded-[var(--ui-radius-small)]" />
              <div className="absolute inset-0 flex items-center justify-center text-3xl font-black text-slate-900/80 tracking-widest">Lapangan</div>
            </div>
            <div className="col-span-1" />
          </div>

          <div className="grid grid-cols-8 gap-3">
            <div className="col-span-2" />
            {labBlock(10,"Bengkel TKR", 3)}
            <div className="col-span-3" />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full">
      <div className="flex items-center gap-2 mb-4 print-hidden">
        <span className="text-xs font-bold text-slate-500">Pilih Kampus:</span>
        <button 
          type="button" 
          onClick={() => setLayoutPreset("kampus_a")} 
          className="rounded-[var(--ui-radius-small)] text-[11px] border transition-all cursor-pointer h-10 px-4 text-sm font-bold"
          style={
            layoutPreset ==="kampus_a" 
              ? { backgroundColor: accentColor, color: primaryColor, borderColor: accentColor } 
              : { backgroundColor:"#f8fafc", borderColor:"#e2e8f0", color:"#64748b" }
          }
        >
          Kampus A
        </button>
        <button 
          type="button" 
          onClick={() => setLayoutPreset("kampus_b")} 
          className="rounded-[var(--ui-radius-small)] text-[11px] border transition-all cursor-pointer ml-1.5 h-10 px-4 text-sm font-bold"
          style={
            layoutPreset ==="kampus_b" 
              ? { backgroundColor: accentColor, color: primaryColor, borderColor: accentColor } 
              : { backgroundColor:"#f8fafc", borderColor:"#e2e8f0", color:"#64748b" }
          }
        >
          Kampus B
        </button>
      </div>
      {layoutPreset ==="kampus_a" ? renderKampusA() : renderKampusB()}
    </div>
  );
}
