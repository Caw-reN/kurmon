import { Button, Modal } from '../components/ui.jsx';
import { useEffect, useMemo, useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { subscribeDatabaseSnapshot } from '../utils/dataSource.js';
import { loadInitialState } from '../utils/state.js';
import { 
  CalendarDays, Search, BookOpen, Calendar, 
  ChevronLeft, ChevronRight, X 
} from 'lucide-react';

export default function KalenderPage() {
  const academicCalendarRaw = useAppStore((state) => state.academicCalendar);
  const calendarCategoriesRaw = useAppStore((state) => state.calendarCategories);
  const academicCalendar = academicCalendarRaw || [];
  const calendarCategories = calendarCategoriesRaw || [];
  
  const [dataVersion, setDataVersion] = useState(0);
  const [nationalHolidays, setNationalHolidays] = useState([]);
  
  useEffect(() => subscribeDatabaseSnapshot(() => setDataVersion((version) => version + 1)), []);

  const currentYearData = new Date().getFullYear();
  useEffect(() => {
    const fetchHolidays = async () => {
      try {
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
  }, [currentYearData]);

  // -- STATE UNTUK FILTER DAN TAMPILAN --
  const [searchQuery, setSearchQuery] = useState('');
  const [timeFilter, setTimeFilter] = useState('all'); // all, month, upcoming, past
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [viewMode, setViewMode] = useState('split'); // split, list, calendar
  const [selectedDate, setSelectedDate] = useState(null); // click filter from mini calendar
  const [showGuide, setShowGuide] = useState(false);
  
  // -- MINI CALENDAR STATE --
  const [calendarDate, setCalendarDate] = useState(new Date());

  // Helper date
  const createLocalDate = (dateString) => {
    if (!dateString) return null;
    const [year, month, day] = String(dateString).slice(0, 10).split("-").map(Number);
    if (!year || !month || !day) return null;
    return new Date(year, month - 1, day);
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();

  // -- TONES CONFIGURATION --
  const categoryTones = {
    blue: { text: "text-indigo-700", bg: "bg-indigo-50", border: "border-indigo-200", dot: "bg-indigo-500" },
    emerald: { text: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200", dot: "bg-emerald-500" },
    green: { text: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200", dot: "bg-emerald-500" },
    red: { text: "text-rose-700", bg: "bg-rose-50", border: "border-rose-200", dot: "bg-rose-500" },
    rose: { text: "text-rose-700", bg: "bg-rose-50", border: "border-rose-200", dot: "bg-rose-500" },
    amber: { text: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200", dot: "bg-amber-500" },
    orange: { text: "text-orange-700", bg: "bg-orange-50", border: "border-orange-200", dot: "bg-orange-500" },
    purple: { text: "text-purple-700", bg: "bg-purple-50", border: "border-purple-200", dot: "bg-purple-500" },
    slate: { text: "text-slate-700", bg: "bg-slate-50", border: "border-slate-200", dot: "bg-slate-500" },
  };
  const getTone = (color) => categoryTones[color] || categoryTones.slate;

  // -- PREPARE EVENTS --
  const allEvents = useMemo(() => {
    const categoryById = new Map(calendarCategories.map((category) => [category.id, category]));
    
    const events = academicCalendar.map(event => {
      const start = createLocalDate(event.dateStart);
      const end = createLocalDate(event.dateEnd || event.dateStart);
      if (!start || !end) return null;
      end.setHours(23, 59, 59, 999);
      
      const cat = categoryById.get(event.categoryId);
      return {
        id: event.id,
        title: event.title,
        description: event.description || 'Tidak ada rincian keterangan tambahan.',
        start,
        end,
        categoryId: event.categoryId,
        categoryName: cat ? cat.name : 'Sekolah',
        color: cat ? cat.color : 'amber', 
        type: 'akademik'
      };
    }).filter(Boolean);

    const holidays = nationalHolidays.filter(h => h.is_national_holiday).map(holiday => {
      const date = createLocalDate(holiday.date);
      if (!date) return null;
      date.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      
      return {
        id: `hol-${holiday.date}`,
        title: holiday.name,
        description: `Libur ${holiday.name}`,
        start: date,
        end,
        categoryId: 'holiday',
        categoryName: 'Libur Nasional',
        color: 'rose',
        type: 'holiday'
      };
    }).filter(Boolean);

    return [...events, ...holidays].sort((a, b) => a.start - b.start);
  }, [academicCalendar, nationalHolidays, calendarCategories]);

  // -- AGGREGATION UNTUK BADGES HEADER --
  const { monthCount, upcomingCount } = useMemo(() => {
    let m = 0;
    let u = 0;
    allEvents.forEach(e => {
      const isPast = e.end < today;
      const isCurrentMonth = e.start.getMonth() === currentMonth && e.start.getFullYear() === currentYear;
      
      if (isCurrentMonth) m++;
      if (!isPast && !isCurrentMonth) u++; 
    });
    return { monthCount: m, upcomingCount: u };
  }, [allEvents, currentMonth, currentYear, today]);

  // -- FILTER LOGIC --
  const filteredEvents = useMemo(() => {
    return allEvents.filter(event => {
      // 1. Search Query
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!event.title.toLowerCase().includes(q) && 
            !event.categoryName.toLowerCase().includes(q) && 
            !event.description.toLowerCase().includes(q)) {
          return false;
        }
      }

      // 2. Category
      if (selectedCategory !== 'all' && event.categoryId !== selectedCategory) {
        return false;
      }

      // 3. Time Filter
      const isPast = event.end < today;
      const isCurrentMonth = event.start.getMonth() === currentMonth && event.start.getFullYear() === currentYear;
      
      if (timeFilter === 'month' && !isCurrentMonth) return false;
      if (timeFilter === 'upcoming' && (isPast || isCurrentMonth)) return false; 
      if (timeFilter === 'past' && !isPast) return false;

      // 4. Selected Date (from mini calendar)
      if (selectedDate) {
        const clickDate = new Date(selectedDate);
        clickDate.setHours(0,0,0,0);
        const evStart = new Date(event.start); evStart.setHours(0,0,0,0);
        const evEnd = new Date(event.end); evEnd.setHours(23,59,59,999);
        if (clickDate < evStart || clickDate > evEnd) {
          return false;
        }
      }

      return true;
    });
  }, [allEvents, searchQuery, selectedCategory, timeFilter, selectedDate, today, currentMonth, currentYear]);

  // Utilities
  const formatShortDate = (date) => date.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
  const formatDateRange = (start, end) => {
    if (!start || !end) return "-";
    if (start.toDateString() === end.toDateString()) return formatShortDate(start);
    return `${formatShortDate(start)} - ${formatShortDate(end)}`;
  };
  const getStatus = (start, end) => {
    if (end < today) return { label: 'Selesai', class: 'bg-slate-100 text-slate-500' };
    if (start <= today && end >= today) return { label: 'Sedang Berjalan', class: 'bg-emerald-100 text-emerald-700' };
    return { label: 'Mendatang', class: 'bg-indigo-100 text-indigo-700' };
  };

  // -- MINI CALENDAR LOGIC --
  const calYear = calendarDate.getFullYear();
  const calMonth = calendarDate.getMonth();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(calYear, calMonth, 1).getDay();
  const monthNames = ["JANUARI","FEBRUARI","MARET","APRIL","MEI","JUNI","JULI","AGUSTUS","SEPTEMBER","OKTOBER","NOVEMBER","DESEMBER"];
  
  const prevMonth = () => setCalendarDate(new Date(calYear, calMonth - 1, 1));
  const nextMonth = () => setCalendarDate(new Date(calYear, calMonth + 1, 1));
  const goToToday = () => { setCalendarDate(new Date()); setSelectedDate(null); };

  const isCurrentMonthView = calYear === currentYear && calMonth === currentMonth;

  // Calendar Day Events map
  const getEventsForDay = (day) => {
    const d = new Date(calYear, calMonth, day);
    d.setHours(0,0,0,0);
    return allEvents.filter(e => {
      const s = new Date(e.start); s.setHours(0,0,0,0);
      const end = new Date(e.end); end.setHours(23,59,59,999);
      return d >= s && d <= end;
    });
  };

  return (
    <div className="w-full flex flex-col gap-5 animate-fade-in pb-10">
      
      {/* 1. HEADER SECTION */}
      <div className="bg-white rounded-[var(--ui-radius-card)] p-5 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-emerald-600 flex items-center justify-center shrink-0 shadow-sm">
            <CalendarDays size={24} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg md:text-xl font-black text-slate-800">Kalender Akademik</h1>
            <p className="text-xs font-medium text-slate-500 mt-0.5">Jadwal kegiatan akademik, agenda sekolah, dan informasi hari libur resmi.</p>
          </div>
        </div>
        
        {/* Desktop Badges */}
        <div className="hidden md:flex flex-wrap gap-2">
          <div className="px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 flex items-center gap-2">
            <span className="text-[10px] font-black text-amber-600 tracking-wider">BULAN INI:</span>
            <span className="text-[10px] font-black text-white bg-amber-500 px-2 rounded-full">{monthCount}</span>
          </div>
          <div className="px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 flex items-center gap-2">
            <span className="text-[10px] font-black text-emerald-600 tracking-wider">MENDATANG:</span>
            <span className="text-[10px] font-black text-white bg-emerald-500 px-2 rounded-full">{upcomingCount}</span>
          </div>
        </div>
      </div>

      {/* 2. FILTER & TOOLBAR SECTION */}
      <div className="bg-white rounded-[var(--ui-radius-card)] p-4 border border-slate-200 shadow-sm flex flex-col gap-4">
        
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search Bar */}
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Cari judul agenda, kategori, atau tanggal kegiatan..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-[var(--ui-radius-small)] text-xs font-semibold focus:outline-none focus:bg-white focus:ring-2 focus:ring-[var(--ui-primary)]/20 transition-all"
            />
          </div>
          
          <Button variant="outline" onClick={() => setShowGuide(true)} className="shrink-0 text-xs font-bold gap-2 text-slate-600 border-slate-200">
            <BookOpen size={14} /> Panduan
          </Button>
        </div>

        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 border-t border-slate-100 pt-3">
          
          {/* Time Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-black tracking-widest text-slate-400 mr-2">FILTER:</span>
            
            <button 
              onClick={() => { setTimeFilter('all'); setSelectedDate(null); }}
              className={`px-3 py-1.5 rounded-[var(--ui-radius-small)] text-[11px] font-bold transition-all ${timeFilter === 'all' && !selectedDate ? 'bg-emerald-600 text-white shadow-xs' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
            >
              Semua ({allEvents.length})
            </button>
            <button 
              onClick={() => { setTimeFilter('month'); setSelectedDate(null); }}
              className={`px-3 py-1.5 rounded-[var(--ui-radius-small)] text-[11px] font-bold transition-all ${timeFilter === 'month' && !selectedDate ? 'bg-emerald-600 text-white shadow-xs' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
            >
              Bulan Ini ({monthCount})
            </button>
            <button 
              onClick={() => { setTimeFilter('upcoming'); setSelectedDate(null); }}
              className={`px-3 py-1.5 rounded-[var(--ui-radius-small)] text-[11px] font-bold transition-all ${timeFilter === 'upcoming' && !selectedDate ? 'bg-emerald-600 text-white shadow-xs' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
            >
              Mendatang ({upcomingCount})
            </button>
            <button 
              onClick={() => { setTimeFilter('past'); setSelectedDate(null); }}
              className={`px-3 py-1.5 rounded-[var(--ui-radius-small)] text-[11px] font-bold transition-all ${timeFilter === 'past' && !selectedDate ? 'bg-emerald-600 text-white shadow-xs' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
            >
              Sudah Lewat
            </button>
            
            {/* If date is selected from mini calendar */}
            {selectedDate && (
              <div className="px-3 py-1.5 rounded-[var(--ui-radius-small)] text-[11px] font-bold bg-amber-100 text-amber-800 flex items-center gap-2">
                Tanggal: {formatShortDate(selectedDate)}
                <button onClick={() => setSelectedDate(null)} className="hover:bg-amber-200 rounded-full p-0.5"><X size={12} /></button>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Category Dropdown */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-[var(--ui-radius-small)] text-xs font-semibold focus:outline-none cursor-pointer"
            >
              <option value="all">Semua Kategori</option>
              {calendarCategories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
              <option value="holiday">Libur Nasional</option>
            </select>

            {/* View Mode Toggles */}
            <div className="flex bg-slate-50 p-1 rounded-[var(--ui-radius-small)] border border-slate-100">
              <button 
                onClick={() => setViewMode('split')}
                className={`px-3 py-1.5 rounded text-[11px] font-bold transition-all ${viewMode === 'split' ? 'bg-white shadow-xs text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Split View
              </button>
              <button 
                onClick={() => setViewMode('list')}
                className={`px-3 py-1.5 rounded text-[11px] font-bold transition-all ${viewMode === 'list' ? 'bg-white shadow-xs text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Daftar Penuh
              </button>
              <button 
                onClick={() => setViewMode('calendar')}
                className={`px-3 py-1.5 rounded text-[11px] font-bold transition-all ${viewMode === 'calendar' ? 'bg-white shadow-xs text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Kalender Penuh
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3. MAIN CONTENT (Split, List, or Calendar) */}
      <div className={`grid grid-cols-1 ${viewMode === 'split' ? 'lg:grid-cols-[1fr_360px]' : ''} gap-5 items-start`}>
        
        {/* EVENT CARDS LIST */}
        {(viewMode === 'split' || viewMode === 'list') && (
          <div className="flex flex-col gap-4">
            
            <div className="flex items-center justify-between px-1">
              <h2 className="text-xs font-black uppercase tracking-wider text-slate-800">
                DAFTAR KEGIATAN ({filteredEvents.length})
              </h2>
              <span className="text-[10px] font-bold text-slate-400">Urutan berdasarkan tanggal</span>
            </div>

            {filteredEvents.length === 0 ? (
              <div className="bg-white border border-dashed border-slate-300 rounded-[var(--ui-radius-card)] p-12 text-center flex flex-col items-center">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-3">
                  <Calendar size={28} className="text-slate-300" />
                </div>
                <h3 className="text-sm font-black text-slate-700">Tidak ada agenda ditemukan</h3>
                <p className="text-xs text-slate-400 mt-1">Ubah filter pencarian atau tanggal untuk melihat agenda lainnya.</p>
              </div>
            ) : (
              <div className={`grid grid-cols-1 ${viewMode === 'list' ? 'md:grid-cols-2 lg:grid-cols-3' : 'md:grid-cols-2'} gap-4`}>
                {filteredEvents.map(event => {
                  const tone = getTone(event.color);
                  const status = getStatus(event.start, event.end);
                  
                  return (
                    <div key={event.id} className="bg-white border border-slate-200 rounded-[var(--ui-radius-card)] p-4 shadow-xs hover:shadow-sm transition-shadow flex flex-col group">
                      
                      <div className="flex items-start justify-between mb-3">
                        {/* Category Badge */}
                        <div className={`px-2.5 py-1 rounded-full border flex items-center gap-1.5 ${tone.bg} ${tone.border}`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${tone.dot}`}></div>
                          <span className={`text-[9px] font-black uppercase tracking-widest ${tone.text}`}>
                            {event.categoryName}
                          </span>
                        </div>
                        
                        {/* Status Badge */}
                        <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${status.class}`}>
                          {status.label}
                        </span>
                      </div>

                      <h3 className="text-sm font-black text-slate-800 mb-1 group-hover:text-[var(--ui-primary)] transition-colors line-clamp-2">
                        {event.title}
                      </h3>
                      
                      <p className="text-xs font-medium text-slate-500 mb-4 line-clamp-2 flex-1">
                        {event.description}
                      </p>

                      <div className="mt-auto flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-[var(--ui-radius-small)] px-3 py-2 w-fit">
                        <Calendar size={14} className="text-slate-400" />
                        <span className="text-[11px] font-bold text-slate-600">
                          {formatDateRange(event.start, event.end)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* SIDEBAR CALENDAR WIDGET */}
        {(viewMode === 'split' || viewMode === 'calendar') && (
          <div className="bg-white border border-slate-200 rounded-[var(--ui-radius-card)] p-4 md:p-5 shadow-sm sticky top-6">
            
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-slate-800 tracking-wider">
                  {monthNames[calMonth]} {calYear}
                </h3>
                {isCurrentMonthView && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[9px] font-black">
                    Bulan Ini
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={goToToday}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-[var(--ui-radius-small)] text-[10px] font-black transition-colors"
                >
                  Hari Ini
                </button>
                <div className="flex items-center bg-slate-50 rounded-[var(--ui-radius-small)] border border-slate-200 overflow-hidden">
                  <button onClick={prevMonth} className="p-1 hover:bg-slate-200 text-slate-500 transition-colors"><ChevronLeft size={16} /></button>
                  <div className="w-px h-4 bg-slate-200"></div>
                  <button onClick={nextMonth} className="p-1 hover:bg-slate-200 text-slate-500 transition-colors"><ChevronRight size={16} /></button>
                </div>
              </div>
            </div>

            <p className="text-[10px] font-medium text-slate-500 mb-4 flex items-center gap-1.5">
              <CalendarDays size={12} />
              Klik tanggal untuk memfilter agenda kegiatan.
            </p>

            {/* Calendar Grid */}
            <div className="border border-slate-200 rounded-[var(--ui-radius-small)] overflow-hidden">
              <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-200">
                {["MIN", "SEN", "SEL", "RAB", "KAM", "JUM", "SAB"].map((day, i) => (
                  <div key={day} className={`py-2 text-center text-[10px] font-black ${i === 0 ? 'text-rose-600' : 'text-slate-600'}`}>
                    {day}
                  </div>
                ))}
              </div>
              
              <div className="grid grid-cols-7">
                {/* Empty cells before month starts */}
                {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                  <div key={`empty-${i}`} className="h-12 border-b border-r border-slate-100 bg-slate-50/50"></div>
                ))}

                {/* Days of month */}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const dateObj = new Date(calYear, calMonth, day);
                  const isToday = dateObj.toDateString() === today.toDateString();
                  const isSunday = dateObj.getDay() === 0;
                  const dayEvents = getEventsForDay(day);
                  
                  const isSelected = selectedDate && dateObj.toDateString() === selectedDate.toDateString();
                  
                  // Filter valid tone events
                  const validEvents = dayEvents.filter(e => e.color);
                  
                  return (
                    <div 
                      key={day} 
                      onClick={() => setSelectedDate(isSelected ? null : dateObj)}
                      className={`h-12 border-b border-r border-slate-100 p-1 flex flex-col items-center justify-start cursor-pointer hover:bg-slate-50 transition-colors relative
                        ${isSelected ? 'bg-amber-50 ring-inset ring-2 ring-amber-400' : ''}
                      `}
                    >
                      <span className={`text-[11px] font-black w-6 h-6 flex items-center justify-center rounded-full mt-0.5 z-10
                        ${isToday ? 'bg-emerald-600 text-white' : (isSunday ? 'text-rose-600' : 'text-slate-700')}
                      `}>
                        {day}
                      </span>
                      
                      {validEvents.length > 0 && (
                        <div className="flex flex-wrap items-center justify-center gap-0.5 mt-1">
                          {validEvents.slice(0,3).map((e, idx) => {
                            const t = getTone(e.color);
                            // Multi-day ribbon look
                            const isMulti = e.start.toDateString() !== e.end.toDateString();
                            
                            if (isMulti) {
                              return <div key={idx} className={`w-full h-1 mt-0.5 rounded-[var(--ui-radius-small)] ${t.bg} border-y ${t.border}`} title={e.title}></div>;
                            }
                            return <div key={idx} className={`w-1.5 h-1.5 rounded-full ${t.dot}`} title={e.title}></div>;
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
                
                {/* Empty cells after month ends */}
                {Array.from({ length: (7 - ((firstDayOfMonth + daysInMonth) % 7)) % 7 }).map((_, i) => (
                  <div key={`empty-end-${i}`} className="h-12 border-b border-r border-slate-100 bg-slate-50/50"></div>
                ))}
              </div>
            </div>

            {/* Legend */}
            <div className="mt-5 border-t border-slate-100 pt-4">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-1">
                <BookOpen size={12} /> LEGENDA KATEGORI
              </h4>
              <div className="flex flex-wrap gap-2">
                {calendarCategories.map(cat => {
                  const t = getTone(cat.color);
                  return (
                    <div key={cat.id} className={`px-2 py-1 rounded-full border flex items-center gap-1.5 ${t.bg} ${t.border}`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${t.dot}`}></div>
                      <span className={`text-[9px] font-bold ${t.text}`}>{cat.name}</span>
                    </div>
                  );
                })}
                <div className="px-2 py-1 rounded-full border flex items-center gap-1.5 bg-rose-50 border-rose-200">
                  <div className="w-1.5 h-1.5 rounded-full bg-rose-500"></div>
                  <span className="text-[9px] font-bold text-rose-700">Libur Nasional</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MODAL PANDUAN */}
      {showGuide && (
        <Modal isOpen={true} onClose={() => setShowGuide(false)} title="Panduan Kalender Akademik" maxWidth="max-w-2xl">
          <div className="p-5 space-y-4 text-sm text-slate-600 font-medium leading-relaxed">
            <p>
              Kalender Akademik merupakan pusat informasi terkait jadwal kegiatan, hari libur, dan agenda penting sekolah selama satu tahun ajaran.
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Gunakan <strong>kolom pencarian</strong> untuk menemukan agenda berdasarkan judul.</li>
              <li>Pilih <strong>Filter Waktu</strong> (Bulan Ini / Mendatang) untuk melihat kegiatan spesifik.</li>
              <li>Klik pada tanggal di <strong>Kalender Mini</strong> untuk melihat kegiatan pada tanggal tersebut secara spesifik.</li>
              <li>Toggle tipe tampilan: <strong className="text-slate-800">Split View</strong> (standar), <strong className="text-slate-800">Daftar Penuh</strong> (menyembunyikan kalender mini), atau <strong className="text-slate-800">Kalender Penuh</strong>.</li>
            </ul>
            <p className="pt-2 border-t border-slate-100 mt-4 text-xs">
              Libur Nasional ditarik secara otomatis menggunakan API hari libur pemerintah yang berlaku.
            </p>
          </div>
        </Modal>
      )}
    </div>
  );
}
