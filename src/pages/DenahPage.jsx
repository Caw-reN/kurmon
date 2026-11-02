import { Button } from '../components/ui.jsx';
import { useEffect, useMemo, useState } from'react';
import { subscribeDatabaseSnapshot } from'../utils/dataSource.js';
import { loadInitialState } from'../utils/state.js';
import { Printer } from'lucide-react';
import { CustomSelect } from'../components/CustomSelect.jsx';
import { LegacyDenahPreview } from'../components/LegacyPreview.jsx';


export default function DenahPage() {
  const [dataVersion, setDataVersion] = useState(0);
  const [selectedDay, setSelectedDay] = useState(() => loadInitialState("layoutDay","Senin"));
  const [layoutPreset, setLayoutPreset] = useState(() => loadInitialState("layoutPreset","kampus_a"));
  
  useEffect(() => {
    return subscribeDatabaseSnapshot(() => setDataVersion((version) => version + 1));
  }, []);

  const appSettings = useMemo(() => {
    void dataVersion;
    const defaults = {
      primaryColor:"#064e3b",
      accentColor:"#a3e635",
      fontFamily:"Lexend",
      logoText:"TS",
      appName:"TimeSchedule",
      footerText:"© 2026 TimeSchedule by Admin.",
      contactEmail:"admin@school.sch.id",
      contactPhone:"+62 123-456-789"
    };
    return { ...defaults, ...loadInitialState("appSettings", defaults) };
  }, [dataVersion]);

  const days = useMemo(() => {
    void dataVersion;
    const savedDays = loadInitialState("days", ["Senin","Selasa","Rabu","Kamis","Jumat"]);
    return Array.isArray(savedDays) && savedDays.length ? savedDays : ["Senin","Selasa","Rabu","Kamis","Jumat"];
  }, [dataVersion]);
  const { primaryColor, accentColor, fontFamily, appName, logoText, footerText, contactEmail, contactPhone } = appSettings;

  const dayOptions = days.map(d => ({ label: `Denah ${d}`, value: d }));
  const selectedDayEffective = days.includes(selectedDay) ? selectedDay : days[0] ||"Senin";

  return (
    <div className="w-full flex flex-col gap-6 animate-fade-in print-landscape relative">
      <div className="flex flex-col gap-6 w-full max-w-full">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white rounded-[var(--ui-radius-card,24px)] p-5 sm:p-6 shadow-2xs border border-slate-200/90 z-30 print-hidden">
          <div>
            <div 
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider mb-2 border shadow-2xs"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--ui-primary, #059669) 10%, transparent)',
                borderColor: 'color-mix(in srgb, var(--ui-primary, #059669) 25%, transparent)',
                color: 'var(--ui-primary, #059669)'
              }}
            >
              <span 
                className="w-2 h-2 rounded-full animate-pulse" 
                style={{ backgroundColor: 'var(--ui-primary, #059669)' }}
              />
              Layanan Publik • Tata Ruang
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Denah Tata Ruang Kelas
            </h1>
          </div>
          <CustomSelect 
            value={selectedDayEffective}
            onChange={setSelectedDay}
            options={dayOptions}
            placeholder="Pilih Hari"
            accentColor={accentColor}
            primaryColor={primaryColor}
            className="w-full sm:w-[220px]"
          />
        </div>
 
        {/* PRINT ONLY TITLE */}
        <div className="hidden print:block mb-4 text-center border-b-2 border-slate-800 pb-4">
          <h1 className="text-3xl font-extrabold uppercase tracking-wide text-slate-900">{appName ||"TimeSchedule"}</h1>
          <h2 className="text-xl font-bold text-slate-700 mt-1">DENAH TATA RUANG KELAS</h2>
          <div className="flex justify-center gap-6 text-xs font-semibold text-slate-600 mt-2.5">
            <span>Hari: <strong className="text-slate-800">{selectedDayEffective}</strong></span>
            <span>Kampus: <strong className="text-slate-800">{layoutPreset ==="kampus_a" ?"Kampus A" :"Kampus B"}</strong></span>
          </div>
        </div>

        <div className="w-full bg-white rounded-[var(--ui-radius-card,24px)] overflow-hidden shadow-2xs p-4 md:p-6 border border-slate-200/90 z-10">
          <div className="pb-4 mb-4 border-b border-slate-100 flex justify-between items-center print-hidden">
            <h3 className="font-extrabold text-[17px] text-slate-800">Denah Tata Ruang Kelas - {selectedDayEffective}</h3>
            <Button variant="outline" 
              onClick={() =>window.print()}
              data-slot="button"
              data-variant="primary"
              className="flex items-center gap-1.5 cursor-pointer btn-primary-theme"
              style={{ backgroundColor: 'var(--ui-primary-btn, var(--ui-primary))', color: '#fff' }}
            >
              <Printer size={13} className="stroke-[2.5]" />
              Cetak Denah</Button>
          </div>
          <LegacyDenahPreview 
            key={dataVersion}
            layoutDay={selectedDayEffective} 
            primaryColor={primaryColor}
            accentColor={accentColor}
            layoutPreset={layoutPreset}
            setLayoutPreset={setLayoutPreset}
          />
        </div>
      </div>
    </div>
  );
}
