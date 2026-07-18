
const CustomBar = (props) => {
  const { x, y, width, height, fill } = props;
  const radius = 6;
  if (height <= 0) return null;
  return (
    <path
      d={`M${x},${y + radius} a${radius},${radius} 0 0 1 ${radius},-${radius} h${width - 2 * radius} a${radius},${radius} 0 0 1 ${radius},${radius} v${height - radius} h-${width} z`}
      fill={fill}
    />
  );
};

export default function DashboardCharts({
  subjectComposition,
  subjectCount,
  roomCapacityData,
  roomUsagePercent,
  usedRoomCount,
  roomCount,
  teachers,
  classes,
  schedule,
  teachingLoads,
}) {
  return (
    <div className="flex flex-col gap-5 w-full h-full">
      {/* Top Teaching Loads */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex items-center justify-between mb-3">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Beban Tertinggi</span>
            <p className="text-[11px] text-slate-400 mt-0.5">Top 3 guru dengan beban mengajar terbanyak</p>
          </div>
        </div>
        <div className="flex-1 flex flex-col gap-2 overflow-y-auto pr-1">
          {(() => {
            // Calculate top 3 teachers by load
            const loadMap = {};
            (teachingLoads || []).forEach(load => {
              const codes = String(load.teacherCode ||"").split(",").map(c => c.trim()).filter(Boolean);
              codes.forEach(code => {
                loadMap[code] = (loadMap[code] || 0) + (Number(load.duration) || 0);
              });
            });
            const topLoads = Object.entries(loadMap)
              .map(([code, total]) => {
                const t = (teachers || []).find(teacher => teacher.code === code);
                return { code, name: t ? t.name : code, total };
              })
              .sort((a, b) => b.total - a.total)
              .slice(0, 3);

            if (topLoads.length === 0) {
              return (
                <div className="flex-1 flex items-center justify-center bg-slate-50 rounded-[var(--ui-radius-small)]">
                  <p className="text-[11px] font-bold text-slate-400">Belum ada beban mengajar.</p>
                </div>
              );
            }

            return topLoads.map((t, idx) => (
              <div key={t.code} className="flex items-center justify-between bg-slate-50/50 hover:bg-slate-50 rounded-[var(--ui-radius-small)] p-2 transition-colors">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-6 h-6 rounded-full bg-[var(--ui-primary)]/10 text-[var(--ui-primary)] flex items-center justify-center shrink-0 text-[10px] font-bold">
                    #{idx + 1}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold text-slate-700 truncate">{t.name}</p>
                    <p className="text-[9px] text-slate-400 truncate">Kode: {t.code}</p>
                  </div>
                </div>
                <div className="shrink-0 flex items-baseline gap-1">
                  <span className="text-xs font-black text-[var(--ui-primary)]">{t.total}</span>
                  <span className="text-[9px] font-bold text-slate-400">JP</span>
                </div>
              </div>
            ));
          })()}
        </div>
      </div>

      {/* Mini stat row */}
      <div className="grid grid-cols-2 gap-2 mt-auto pt-3 border-t border-slate-50">
        {/* Mapel donut */}
        <div className="bg-slate-50/70 rounded-[var(--ui-radius-small)] p-2 flex items-center gap-2.5">
          <div className="relative w-10 h-10 shrink-0">
            <svg viewBox="0 0 40 40" className="w-10 h-10 -rotate-90">
              <circle cx="20" cy="20" r="16" fill="none" stroke="#e2e8f0" strokeWidth="6" />
              <circle
                cx="20" cy="20" r="16" fill="none"
                stroke="var(--ui-primary)" strokeWidth="6"
                strokeDasharray={`${2 * Math.PI * 16 * ((subjectComposition[0]?.value || 0) / (subjectCount || 1))} ${2 * Math.PI * 16}`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-[9px] font-black text-slate-700">{subjectCount}</span>
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[9px] font-black text-slate-700 leading-none uppercase tracking-wider mb-1 truncate">Mapel</p>
            <div className="space-y-0.5">
              {subjectComposition.map((comp, i) => (
                <div key={comp.name} className="flex items-center justify-between text-[8px] font-bold text-slate-500">
                  <span className="flex items-center gap-1 truncate">
                    <span className={`w-1 h-1 rounded-full shrink-0`} style={{ background: i === 0 ?"var(--ui-primary)" :"var(--ui-accent)" }} />
                    <span className="truncate">{comp.name}</span>
                  </span>
                  <span className="font-black text-slate-600 pl-1">{comp.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Ruangan donut */}
        <div className="bg-slate-50/70 rounded-[var(--ui-radius-small)] p-2 flex items-center gap-2.5">
          <div className="relative w-10 h-10 shrink-0">
            <svg viewBox="0 0 40 40" className="w-10 h-10 -rotate-90">
              <circle cx="20" cy="20" r="16" fill="none" stroke="#e2e8f0" strokeWidth="6" />
              <circle
                cx="20" cy="20" r="16" fill="none"
                stroke="#0ea5e9" strokeWidth="6"
                strokeDasharray={`${2 * Math.PI * 16 * (roomUsagePercent / 100)} ${2 * Math.PI * 16}`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-[8px] font-black text-slate-700">{roomUsagePercent}%</span>
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[9px] font-black text-slate-700 leading-none uppercase tracking-wider mb-1 truncate">Ruang</p>
            <div className="space-y-0.5">
              <div className="flex items-center justify-between text-[8px] font-bold text-slate-500">
                <span className="flex items-center gap-1 truncate"><span className="w-1 h-1 rounded-full bg-sky-500 shrink-0" />Terpakai</span>
                <span className="font-black text-slate-600 pl-1">{usedRoomCount}</span>
              </div>
              <div className="flex items-center justify-between text-[8px] font-bold text-slate-500">
                <span className="flex items-center gap-1 truncate"><span className="w-1 h-1 rounded-full bg-slate-300 shrink-0" />Kosong</span>
                <span className="font-black text-slate-600 pl-1">{roomCount - usedRoomCount}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
