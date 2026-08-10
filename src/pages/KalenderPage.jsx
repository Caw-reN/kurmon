import { Button } from '../components/ui.jsx';
import { useEffect, useMemo, useState } from'react';
import { useAppStore } from'../store/useAppStore';
import { subscribeDatabaseSnapshot } from'../utils/dataSource.js';
import { loadInitialState } from'../utils/state.js';
import { CalendarIcon, ChevronLeft, ChevronRight } from'lucide-react';


export default function KalenderPage() {
  const academicCalendarRaw = useAppStore((state) => state.academicCalendar);
  const calendarCategoriesRaw = useAppStore((state) => state.calendarCategories);
  const academicCalendar = academicCalendarRaw || [];
  const calendarCategories = calendarCategoriesRaw || [];
  const [currentDate, setCurrentDate] = useState(new Date());
  const [eventScope, setEventScope] = useState("month");
  const [nationalHolidays, setNationalHolidays] = useState([]);
  const [dataVersion, setDataVersion] = useState(0);

  useEffect(() => subscribeDatabaseSnapshot(() => setDataVersion((version) => version + 1)), []);

  const appSettings = useMemo(() => {
    void dataVersion;
    const defaults = {
      primaryColor:"#064e3b",
      accentColor:"#a3e635",
      fontFamily:"Lexend",
      logoText:"TS",
      appName:"TimeSchedule",
      footerText:"© 2026 TimeSchedule by Admin."
    };
    defaults.contactEmail ="admin@school.sch.id";
    defaults.contactPhone ="+62 123-456-789";
    return { ...defaults, ...loadInitialState("appSettings", defaults) };
  }, [dataVersion]);
  const { primaryColor, accentColor, fontFamily, appName, logoText, footerText, contactEmail, contactPhone } = appSettings;

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  // Fetch National Holidays from libur.deno.dev
  useEffect(() => {
    const fetchHolidays = async () => {
      try {
        // Asumsi API mendukung query parameter year, atau minimal return tahun berjalan
        const res = await fetch(`https://libur.deno.dev/api`);
        if (res.ok) {
          const data = await res.json();
          setNationalHolidays(data || []);
        }
      } catch (err) {
        console.error("Gagal mengambil data libur nasional:", err);
      }
    };
    fetchHolidays();
  }, [currentYear]);

  // Generate Calendar Grid
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay(); // 0 = Minggu

  const prevMonth = () => setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentYear, currentMonth + 1, 1));

  const monthNames = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
  const dayNames = ["Minggu","Senin","Selasa","Rabu","Kamis","Jumat","Sabtu"];
  const createLocalDate = (dateString) => {
    const [year, month, day] = String(dateString ||"").slice(0, 10).split("-").map(Number);
    if (!year || !month || !day) return null;
    return new Date(year, month - 1, day);
  };
  const toDateKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
  const calendarTone = {
    blue:"bg-blue-100 text-blue-700 border-blue-200",
    emerald:"bg-emerald-100 text-emerald-700 border-emerald-200",
    green:"bg-green-100 text-green-700 border-green-200",
    red:"bg-red-100 text-red-700 border-red-200",
    rose:"bg-rose-100 text-rose-700 border-rose-200",
    amber:"bg-amber-100 text-amber-700 border-amber-200",
    orange:"bg-orange-100 text-orange-700 border-orange-200",
    purple:"bg-purple-100 text-purple-700 border-purple-200",
    slate:"bg-slate-100 text-slate-700 border-slate-200",
  };
  const categoryTextColor = {
    blue:"text-blue-700",
    emerald:"text-emerald-700",
    green:"text-green-700",
    red:"text-red-700",
    rose:"text-rose-700",
    amber:"text-amber-700",
    orange:"text-orange-700",
    purple:"text-purple-700",
    slate:"text-slate-700",
  };
  const getCalendarTone = (color ="blue") => calendarTone[color] || calendarTone.blue;
  const eventCardTone = {
    blue:"bg-blue-500 -blue-500/20",
    emerald:"bg-emerald-500 -emerald-500/20",
    green:"bg-emerald-500 -green-500/20",
    red:"bg-rose-500 -red-500/20",
    rose:"bg-rose-500 -rose-500/20",
    amber:"bg-amber-500 -amber-500/20",
    orange:"bg-orange-500 -orange-500/20",
    purple:"bg-purple-500 -purple-500/20",
    slate:"bg-slate-600 -slate-500/20",
  };
  const getEventCardTone = (color ="blue") => eventCardTone[color] || eventCardTone.blue;
  const formatShortDate = (date) => date.toLocaleDateString("id-ID", { weekday:"long", day:"numeric", month:"short" });
  const formatDateRange = (start, end) => {
    if (!start || !end) return"-";
    if (start.toDateString() === end.toDateString()) return formatShortDate(start);
    return `${formatShortDate(start)} - ${formatShortDate(end)}`;
  };
  const calendarEventsByDay = (() => {
    const eventsByDay = new Map();
    const categoryById = new Map(calendarCategories.map((category) => [category.id, category]));
    const monthStart = new Date(currentYear, currentMonth, 1);
    const monthEnd = new Date(currentYear, currentMonth + 1, 0);

    academicCalendar.forEach((event) => {
      const start = createLocalDate(event.dateStart);
      const end = createLocalDate(event.dateEnd || event.dateStart);
      if (!start || !end) return;
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < monthStart || start > monthEnd) return;

      const firstVisibleDay = new Date(Math.max(start.getTime(), monthStart.getTime()));
      const lastVisibleDay = new Date(Math.min(end.getTime(), monthEnd.getTime()));
      const category = categoryById.get(event.categoryId);
      const isMultiDay = start.toDateString() !== end.toDateString();
      for (let day = firstVisibleDay.getDate(); day <= lastVisibleDay.getDate(); day += 1) {
        const eventDate = new Date(currentYear, currentMonth, day);
        if (eventDate < firstVisibleDay || eventDate > lastVisibleDay) continue;
        const key = toDateKey(eventDate);
        const list = eventsByDay.get(key) || [];
        const isSegmentStart = eventDate.toDateString() === firstVisibleDay.toDateString() || eventDate.getDay() === 0;
        const isSegmentEnd = eventDate.toDateString() === lastVisibleDay.toDateString() || eventDate.getDay() === 6;
        list.push({
          id: event.id || `${event.title}-${event.dateStart}-${event.dateEnd || event.dateStart}`,
          title: event.title,
          color: category?.color ||"blue",
          isHoliday: false,
          isMultiDay,
          segmentStart: !isMultiDay || isSegmentStart,
          segmentEnd: !isMultiDay || isSegmentEnd,
          showTitle: !isMultiDay || isSegmentStart,
        });
        eventsByDay.set(key, list);
      }
    });

    return eventsByDay;
  })();

  const getDayEvents = (day) => {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    const dateObj = new Date(currentYear, currentMonth, day);
    const isSunday = dateObj.getDay() === 0;

    const events = [...(calendarEventsByDay.get(dateStr) || [])];

    // Check National Holidays
    const holiday = nationalHolidays.find(h => h.date === dateStr && h.is_national_holiday);
    if (holiday) {
      events.push({ title: holiday.name, isHoliday: true, color:"red", isMultiDay: false, segmentStart: true, segmentEnd: true, showTitle: true });
    } else if (isSunday) {
      events.push({ title:"Hari Minggu", isHoliday: true, color:"red", isMultiDay: false, segmentStart: true, segmentEnd: true, showTitle: true });
    }

    return events;
  };
  const displayedMonthStart = new Date(currentYear, currentMonth, 1);
  const displayedMonthEnd = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayEnd = new Date(today);
  todayEnd.setHours(23, 59, 59, 999);
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);
  const categoryById = new Map(calendarCategories.map((category) => [category.id, category]));
  const overlapsRange = (start, end, rangeStart, rangeEnd) => start <= rangeEnd && end >= rangeStart;
  const sidebarEvents = [
    ...academicCalendar.map((event) => {
      const start = createLocalDate(event.dateStart);
      const end = createLocalDate(event.dateEnd || event.dateStart);
      if (!start || !end) return null;
      const category = categoryById.get(event.categoryId);
      return {
        id: event.id || `${event.title}-${event.dateStart}-${event.dateEnd || event.dateStart}`,
        title: event.title ||"Kegiatan akademik",
        description: event.description || category?.name ||"Agenda akademik sekolah",
        start,
        end,
        color: category?.color ||"blue",
        categoryName: category?.name ||"Akademik",
      };
    }).filter(Boolean),
    ...nationalHolidays
      .filter((holiday) => holiday.is_national_holiday)
      .map((holiday) => {
        const date = createLocalDate(holiday.date);
        if (!date) return null;
        return {
          id: `holiday-${holiday.date}-${holiday.name}`,
          title: holiday.name,
          description:"Libur nasional",
          start: date,
          end: date,
          color:"red",
          categoryName:"Libur",
        };
      })
      .filter(Boolean),
  ].filter((event) => overlapsRange(event.start, event.end, displayedMonthStart, displayedMonthEnd))
    .sort((a, b) => a.start - b.start || a.title.localeCompare(b.title,"id", { sensitivity:"base" }));
  const visibleSidebarEvents = sidebarEvents.filter((event) => {
    if (eventScope ==="today") return overlapsRange(event.start, event.end, today, todayEnd);
    if (eventScope ==="week") return overlapsRange(event.start, event.end, weekStart, weekEnd);
    return true;
  });

  return (
    <div className="w-full flex flex-col gap-6 animate-fade-in relative">
      <div className="flex flex-col gap-6 w-full max-w-full">
        <div className="bg-white/60 backdrop-blur-xl rounded-[var(--ui-radius-card)] p-5 md:p-8 border border-white/50 shadow-sm">
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-8 lg:gap-10 items-start">
            <section className="min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-[var(--ui-radius-small)] flex items-center justify-center shadow-sm" style={{ backgroundColor: `${primaryColor}10`, color: primaryColor }}>
                    <CalendarIcon size={23} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Event calendar</p>
                    <h1 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">Kalender Akademik</h1>
                    <p className="text-sm font-medium text-slate-500">Tahun ajaran aktif dan agenda sekolah.</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 bg-slate-50 p-1.5 rounded-[var(--ui-radius-small)] border-none w-full sm:w-auto justify-between sm:justify-center">
                  <button onClick={prevMonth} className="flex items-center justify-center"><ChevronLeft size={16} /></button>
                  <div className="text-sm font-black text-slate-800 min-w-[150px] text-center">
                    {monthNames[currentMonth]} {currentYear}
                  </div>
                  <button onClick={nextMonth} className="flex items-center justify-center"><ChevronRight size={16} /></button>
                </div>
              </div>

              <div className="overflow-x-auto md:overflow-x-visible overflow-y-visible custom-scrollbar pb-2">
                <div className="w-full md:min-w-[720px]">
                  <div className="grid grid-cols-7 mb-3">
                    {dayNames.map((d, idx) => (
                      <div key={d} className={`px-2 text-left text-[11px] font-black uppercase tracking-widest ${idx === 0 ?"text-rose-500" :"text-slate-400"}`}>
                        {d.slice(0, 3)}
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-7 gap-y-2 overflow-visible">
                    {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                      <div key={`empty-${i}`} className="min-h-[52px] md:min-h-[86px] px-1 py-2 text-slate-200">
                        <span className="text-sm font-black opacity-40">{new Date(currentYear, currentMonth, i - firstDayOfMonth + 1).getDate()}</span>
                      </div>
                    ))}

                    {Array.from({ length: daysInMonth }).map((_, i) => {
                      const day = i + 1;
                      const dateObj = new Date(currentYear, currentMonth, day);
                      const events = getDayEvents(day);
                      const isToday = dateObj.toDateString() === today.toDateString();
                      
                      // Identify active multi-day event
                      const activeMultiDay = events.find(e => e.isMultiDay);
                      const isMultiDayActive = !!activeMultiDay;

                      // Determine text color
                      const isRedDay = events.some(e => e.isHoliday);
                      const dayTextColor = isToday 
                        ?"text-white" 
                        : isMultiDayActive 
                          ? (categoryTextColor[activeMultiDay.color] ||"text-slate-700") 
                          : isRedDay 
                            ?"text-rose-500" 
                            :"text-slate-700";

                      return (
                        <div key={day} className="min-h-[52px] md:min-h-[56px] px-1 py-1 relative overflow-visible flex flex-col items-stretch">
                          {/* Date Number Container with Dynamic Block/Ribbon Background */}
                          <div className="relative w-full h-8 flex items-center justify-start overflow-visible shrink-0">
                            {/* Multi-day Event Ribbon Background behind date (Shown on all devices) */}
                            {isMultiDayActive && (
                              <div 
                                className={`absolute inset-y-0.5 ${getCalendarTone(activeMultiDay.color)} ${
                                  activeMultiDay.segmentStart 
                                    ?"rounded-l-[6px] border-l ml-0.5" 
                                    :"-ml-1.5 border-l-0"
                                } ${
                                  activeMultiDay.segmentEnd 
                                    ?"rounded-r-[6px] border-r mr-0.5" 
                                    :"-mr-1.5 border-r-0"
                                } z-0`}
                                style={{
                                  left: activeMultiDay.segmentStart ?'2px' :'-6px',
                                  right: activeMultiDay.segmentEnd ?'2px' :'-6px'
                                }}
                              />
                            )}
                            
                            {/* Day Number Square (Rounded corners matching style) */}
                            <div 
                              className={`relative z-10 w-8 h-8 rounded-[6px] flex items-center justify-center text-sm font-black transition-all ${dayTextColor}`}
                              style={isToday ? { backgroundColor: primaryColor } : undefined}
                            >
                              {day}
                            </div>
                          </div>

                          {/* Standalone Event Badges (Shown on all devices only if NO active multi-day event) */}
                          {!isMultiDayActive && events.length > 0 && (
                            <div className="flex flex-row flex-wrap gap-0.5 justify-start pl-0.5 mt-0.5">
                              {events.slice(0, 3).map((evt, idx) => {
                                const toneClass = getCalendarTone(evt.color);
                                return (
                                  <div 
                                    key={`single-${idx}`} 
                                    className={`w-2.5 h-2.5 rounded-[2px] border shrink-0 ${toneClass}`}
                                    title={evt.title}
                                  />
                                );
                              })}
                              {events.length > 3 && (
                                <span className="text-[7px] font-black text-slate-400 leading-none flex items-center">+</span>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {Array.from({ length: (7 - ((firstDayOfMonth + daysInMonth) % 7)) % 7 }).map((_, i) => (
                      <div key={`empty-end-${i}`} className="min-h-[52px] md:min-h-[86px] px-1 py-2 text-slate-200">
                        <span className="text-sm font-black opacity-40">{i + 1}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-6 rounded-[var(--ui-radius-small)] bg-slate-50 border-none p-4">
                <h3 className="text-sm font-black text-slate-700 mb-3">Keterangan Warna</h3>
                <div className="flex flex-wrap gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-[var(--ui-radius-small)] bg-red-100 border border-red-200"></div>
                    <span className="text-xs font-bold text-slate-600">Libur Nasional / Minggu</span>
                  </div>
                  {calendarCategories.map(cat => (
                    <div key={cat.id} className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded-[var(--ui-radius-small)] bg-${cat.color}-100 border border-${cat.color}-200`}></div>
                      <span className="text-xs font-bold text-slate-600">{cat.name}</span>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-xs font-bold text-slate-400">Kegiatan lebih dari 1 hari tampil sebagai blok warna menyatu mengikuti rentang tanggal.</p>
              </div>
            </section>

            <aside className="rounded-[var(--ui-radius-small)] bg-slate-50 border-none p-4 md:p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Your events</p>
                  <h2 className="text-xl font-black text-slate-800 mt-1">Kegiatan</h2>
                </div>
                <span className="rounded-[var(--ui-radius-small)] bg-white border-none px-3 py-1.5 text-[10px] font-black text-slate-500 shadow-sm">
                  {visibleSidebarEvents.length} agenda
                </span>
              </div>

              <div className="mt-4 flex gap-2 border-b border-slate-200 pb-2">
                {[
                  { id:"today", label:"Today" },
                  { id:"week", label:"Week" },
                  { id:"month", label:"Month" },
                ].map((tab) => (
                  <Button variant="outline"
                    key={tab.id}
                    type="button"
                    onClick={() =>setEventScope(tab.id)}
                    className={`${eventScope === tab.id ?"text-slate-900 border-slate-900" :"text-slate-400 border-transparent hover:text-slate-700"}`}
                  >
                    {tab.label}</Button>
                ))}
              </div>

              <div className="mt-4 space-y-3 max-h-[560px] overflow-y-auto custom-scrollbar pr-1">
                {visibleSidebarEvents.length === 0 ? (
                  <div className="rounded-[var(--ui-radius-small)] border border-dashed border-slate-300 bg-white p-6 text-center">
                    <CalendarIcon size={32} className="mx-auto text-slate-300 mb-2" />
                    <p className="text-sm font-black text-slate-600">Belum ada kegiatan</p>
                    <p className="text-xs font-bold text-slate-400 mt-1">Agenda akan muncul sesuai filter yang dipilih.</p>
                  </div>
                ) : (
                  visibleSidebarEvents.map((event) => {
                    const isMultiDay = event.start.toDateString() !== event.end.toDateString();
                    return (
                      <div key={event.id} className={`rounded-[var(--ui-radius-small)] p-4 text-white shadow-sm ${getEventCardTone(event.color)}`}>
                        <div className="flex items-start justify-between gap-3 text-[11px] font-bold text-white/85">
                          <span>{formatDateRange(event.start, event.end)}</span>
                          <span>{isMultiDay ? `${Math.round((event.end - event.start) / 86400000) + 1} hari` :"Sehari"}</span>
                        </div>
                        <h3 className="mt-2 text-sm font-black leading-snug">{event.title}</h3>
                        <p className="mt-1 text-xs font-semibold text-white/80 leading-relaxed">{event.description || event.categoryName}</p>
                      </div>
                    );
                  })
                )}
              </div>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}
