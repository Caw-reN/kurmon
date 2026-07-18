import { Button } from '../../../components/ui.jsx';
import { Clock } from'lucide-react';
import { Plus, Trash2, Upload, Copy, Wand2, Edit2 } from'lucide-react';
import { PageHeader } from '../../../components/monitoring/ui/index.js';
;


export default function TabPengaturan(props) {
  const { tabSubtitles, days, setDays, setTimeSlots, TIME_SLOTS, setTeacherAvailability, setSelectedDaySetting, selectedDaySetting, handleDelete, openModal, timeSlots } = props;
  const { ...allProps } = props;
  // Destructure specific props as needed in the component

return (
  <div className="flex flex-col gap-4 w-full animate-in fade-in duration-300">
    <PageHeader
      title="Konfigurasi Waktu"
      description={tabSubtitles["pengaturan"]}
      icon={Clock}
    />
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
      <div className="bg-white border-none rounded-[var(--ui-radius-card)] shadow-sm p-6 md:p-6 flex flex-col h-[80vh] min-h-0">
        <div className="flex justify-between items-center mb-6 shrink-0">
          <h3 className="text-xl font-black text-slate-800">
            Hari Aktif Sekolah
          </h3>
        </div>
        <div className="flex flex-col md:flex-row gap-2 mb-6 shrink-0">
          <input
            type="text"
            id="newDay"
            placeholder="Tambah Hari (misal: Sabtu)"
            className="flex-1 bg-slate-50 border-none px-4 py-3 rounded-[var(--ui-radius-small)] focus:ring-2 focus:ring-[var(--ui-accent)]/30 focus:border-[var(--ui-accent)] outline-none text-sm font-bold"
          />
          <Button variant="outline"
            onClick={() =>{
              const input = document.getElementById("newDay");
              const dayName = String(input?.value ||"").trim();
              if (dayName && !days.includes(dayName)) {
                setDays((prev) => [...prev, dayName]);
                setTimeSlots((prev) => ({
                  ...prev,
                  [dayName]: [...TIME_SLOTS]
                }));
                setTeacherAvailability((prev) => {
                  const next = { ...prev };
                  Object.keys(next).forEach((code) => {
                    const entry = next[code] || {
                      days: [],
                      subjects: []
                    };
                    next[code] = {
                      ...entry,
                      days: Array.from(
                        new Set([...(entry.days || []), dayName]),
                      )
                    };
                  });
                  return next;
                });
                setSelectedDaySetting(dayName);
                input.value ="";
              }
            }}
            className="w-full md:w-auto"
          >
            <Plus size={16} /> Tambah</Button>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {days.map((day, idx) => (
            <div
              key={day}
              className="flex justify-between items-center p-4 bg-slate-50 mb-2 rounded-[var(--ui-radius-small)] border-none shadow-sm cursor-pointer hover:border-[var(--ui-primary)]/30 transition-colors"
              onClick={() => setSelectedDaySetting(day)}
            >
              <div className="flex items-center gap-3">
                <span className="font-black text-slate-400 text-lg">
                  {idx + 1}.
                </span>
                <span
                  className={`font-bold ${selectedDaySetting === day ?"text-[var(--ui-primary)]" :"text-slate-700"}`}
                >
                  {day}
                </span>
                {selectedDaySetting === day && (
                  <span className="bg-[var(--ui-accent)]/30 text-[var(--ui-primary)] text-[10px] px-2 py-0.5 rounded-[var(--ui-radius-small)] font-bold uppercase tracking-widest hidden md:inline-block">
                    Mengedit Jam
                  </span>
                )}
              </div>
              <Button variant="outline"
                onClick={(e) =>{
                  e.stopPropagation();
                  handleDelete("hari", day);
                }}
                className="cursor-pointer"
              >
                <Trash2 size={16} /></Button>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white border-none rounded-[var(--ui-radius-card)] shadow-sm p-6 md:p-6 flex flex-col h-[80vh] min-h-0">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 shrink-0">
          <div>
            <h3 className="text-xl font-black text-slate-800">
              Sesi Belajar & Kegiatan
            </h3>
            <p className="text-[10px] font-bold text-[var(--ui-primary)] bg-[var(--ui-accent)]/20 px-2 py-0.5 rounded-[var(--ui-radius-small)] inline-block mt-1 uppercase tracking-widest">
              Hari: {selectedDaySetting}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <Button variant="outline"
              onClick={() =>openModal("bulk","add")}
              variant="secondary"
              className="flex-1 md:flex-none"
            >
              <Upload size={14} className="inline-block mr-1" /> Import
              Data</Button>
            <Button variant="outline"
              onClick={() =>openModal("copy_waktu")}
              variant="secondary"
              className="flex-1 md:flex-none"
            >
              <Copy size={14} className="inline-block mr-1" /> Salin
              Dari...</Button>
            <Button variant="outline"
              onClick={() =>openModal("generate_slots")}
              variant="accent"
              className="flex-1 md:flex-none"
            >
              <Wand2 size={14} className="inline-block mr-1" /> Otomatis</Button>
            <Button variant="outline"
              onClick={() =>openModal("waktu","add")}
              variant="primary"
              className="flex-1 md:flex-none"
            >
              <Plus size={14} /> Tambah</Button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
          {(timeSlots[selectedDaySetting] || []).length === 0 && (
            <div className="text-center p-6 text-slate-400 font-medium">
              Belum ada jam pelajaran di hari ini. Klik"Otomatis" untuk
              membuat dengan cepat.
            </div>
          )}
          {(timeSlots[selectedDaySetting] || []).map((slot) => (
            <div
              key={slot.id}
              className={"flex justify-between items-center p-4 mb-2 rounded-[var(--ui-radius-card)] border shadow-sm" +
                (slot.isBreak
                  ?"bg-orange-50 border-orange-100"
                  :"bg-slate-50 border-slate-200")
              }
            >
              <div>
                <div className="font-bold text-slate-800 text-sm">
                  {slot.label}
                </div>
                {slot.isBreak && (
                  <div className="text-[10px] font-black text-orange-600 mt-0.5 uppercase tracking-widest">
                    {slot.labelBreak ||"KEGIATAN / ISTIRAHAT"}
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline"
                  onClick={() =>openModal("waktu","edit", slot)}
                  className="cursor-pointer"
                >
                  <Edit2 size={14} /></Button>
                <Button variant="outline"
                  onClick={() =>handleDelete("waktu", slot.id)}
                  className="cursor-pointer"
                >
                  <Trash2 size={14} /></Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);
}
