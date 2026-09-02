import React, { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { subscribeDatabaseSnapshot } from '../utils/dataSource.js';
import { loadInitialState } from '../utils/state.js';
import { 
  CalendarDays, 
  Search, 
  BookOpen, 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  X, 
  Filter,
  Layers,
  Grid,
  Clock,
  Sparkles,
  Info
} from 'lucide-react';
import { Button, Modal } from '../components/ui.jsx';
import { CustomSelect } from '../components/CustomSelect.jsx';

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

  const outletContext = useOutletContext();
  const outletAppSettings = outletContext?.appSettings;

  const appSettings = useMemo(() => {
    void dataVersion;
    const defaults = {
      primaryColor: '#064e3b',
      accentColor: '#3DAA37',
      appName: 'Sistem Sekolah',
    };
    return { ...defaults, ...loadInitialState('appSettings', defaults), ...(outletAppSettings || {}) };
  }, [outletAppSettings, dataVersion]);

  const primaryColor = appSettings.primaryColor || 'var(--ui-primary, #064e3b)';

  // -- TONES CONFIGURATION (Konsisten dengan tema kustomisasi web) --
  const categoryTones = {
    blue: { text: "text-indigo-700", bg: "bg-indigo-50", border: "border-indigo-200", dot: "bg-indigo-500" },
    emerald: { text: "text-[var(--ui-primary,#059669)]", bg: "bg-[var(--ui-primary,#059669)]/10", border: "border-[var(--ui-primary,#059669)]/20", dot: "bg-[var(--ui-primary,#059669)]" },
    green: { text: "text-[var(--ui-primary,#059669)]", bg: "bg-[var(--ui-primary,#059669)]/10", border: "border-[var(--ui-primary,#059669)]/20", dot: "bg-[var(--ui-primary,#059669)]" },
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
      if (selectedCategory !== 'all') {
        if (selectedCategory === 'holiday') {
          if (event.type !== 'holiday') return false;
        } else if (event.categoryId !== selectedCategory) {
          return false;
        }
      }

      // 3. Time Filter
      const isPast = event.end < today;
      const isCurrentMonth = e => e.start.getMonth() === currentMonth && e.start.getFullYear() === currentYear;
      
      if (timeFilter === 'month' && !isCurrentMonth(event)) return false;
      if (timeFilter === 'upcoming' && (isPast || isCurrentMonth(event))) return false; 
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

  // De-duplicate category options for CustomSelect (Mencegah duplikasi Libur Nasional)
  const categoryOptions = useMemo(() => {
    const opts = [{ value: 'all', label: 'Semua Kategori' }];
    const seenNames = new Set(['semua kategori']);
    
    calendarCategories.forEach(cat => {
      const lower = String(cat.name).toLowerCase().trim();
      if (!seenNames.has(lower)) {
        seenNames.add(lower);
        opts.push({ value: cat.id, label: cat.name });
      }
    });

    if (!seenNames.has('libur nasional')) {
      opts.push({ value: 'holiday', label: 'Libur Nasional' });
    }
    return opts;
  }, [calendarCategories]);

  // Utilities
  const formatShortDate = (date) => date.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
  const formatDateRange = (start, end) => {
    if (!start || !end) return "-";
    if (start.toDateString() === end.toDateString()) return formatShortDate(start);
    return `${formatShortDate(start)} - ${formatShortDate(end)}`;
  };
  const getStatus = (start, end) => {
    if (end < today) return { label: 'Selesai', class: 'bg-slate-100 text-slate-500 font-extrabold' };
    if (start <= today && end >= today) {
      return { 
        label: 'Sedang Berjalan', 
        class: 'font-extrabold',
        style: {
          backgroundColor: 'color-mix(in srgb, var(--ui-primary, #059669) 12%, transparent)',
          color: 'var(--ui-primary, #059669)'
        }
      };
    }
    return { label: 'Mendatang', class: 'bg-indigo-100 text-indigo-700 font-extrabold' };
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
    <div className="w-full flex flex-col gap-6 select-none animate-in fade-in duration-300 pb-12">
      
      {/* ── 1. HERO HEADER CARD (SEJAJAR DENGAN NAVBAR & KONSISTEN) ── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-white via-slate-50 to-emerald-50/40 rounded-[var(--ui-radius-card,24px)] p-6 sm:p-8 border border-slate-200/80 shadow-sm">
        {/* Subtle Ambient Glow */}
        <div 
          className="absolute -top-16 -right-16 w-64 h-64 rounded-full blur-3xl pointer-events-none opacity-20" 
          style={{ backgroundColor: 'var(--ui-primary, #059669)' }}
        />
        <div className="absolute -bottom-16 -left-16 w-64 h-64 rounded-full bg-sky-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          
          {/* Header Title & Subtitle */}
          <div className="max-w-2xl">
            <div 
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider mb-3 border shadow-2xs"
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
              Layanan Publik • Kalender Akademik
            </div>
            
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight leading-tight">
              Kalender Akademik & Agenda
            </h1>
            
            <p className="text-sm sm:text-base text-slate-600 font-medium mt-2 leading-relaxed">
              Pusat informasi resmi jadwal kegiatan akademik, agenda sekolah, penilaian semester, dan hari libur nasional resmi.
            </p>
          </div>

          {/* KPI Mini Stat Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 gap-3 shrink-0">
            <div className="bg-white/90 backdrop-blur-md rounded-[var(--ui-radius-card,16px)] p-3.5 border border-slate-200/70 shadow-2xs flex flex-col justify-center">
              <div className="flex items-center gap-2 mb-1" style={{ color: 'var(--ui-primary, #059669)' }}>
                <CalendarDays size={16} strokeWidth={2.5} />
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">Total Agenda</span>
              </div>
              <span className="text-xl sm:text-2xl font-black text-slate-900 leading-none">
                {allEvents.length}
              </span>
            </div>

            <div className="bg-white/90 backdrop-blur-md rounded-[var(--ui-radius-card,16px)] p-3.5 border border-slate-200/70 shadow-2xs flex flex-col justify-center">
              <div className="flex items-center gap-2 text-amber-600 mb-1">
                <Clock size={16} strokeWidth={2.5} />
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">Bulan Ini</span>
              </div>
              <span className="text-xl sm:text-2xl font-black text-slate-900 leading-none">
                {monthCount} <span className="text-xs font-bold text-slate-500">Agenda</span>
              </span>
            </div>

            <div className="bg-white/90 backdrop-blur-md rounded-[var(--ui-radius-card,16px)] p-3.5 border border-slate-200/70 shadow-2xs flex flex-col justify-center">
              <div className="flex items-center gap-2 text-sky-600 mb-1">
                <Sparkles size={16} strokeWidth={2.5} />
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">Mendatang</span>
              </div>
              <span className="text-xl sm:text-2xl font-black text-slate-900 leading-none">
                {upcomingCount} <span className="text-xs font-bold text-slate-500">Agenda</span>
              </span>
            </div>

            <div className="bg-white/90 backdrop-blur-md rounded-[var(--ui-radius-card,16px)] p-3.5 border border-slate-200/70 shadow-2xs flex flex-col justify-center">
              <div className="flex items-center gap-2 text-rose-600 mb-1">
                <Calendar size={16} strokeWidth={2.5} />
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">Hari Libur</span>
              </div>
              <span className="text-xl sm:text-2xl font-black text-slate-900 leading-none">
                {nationalHolidays.length || 15} <span className="text-xs font-bold text-slate-500">Hari</span>
              </span>
            </div>
          </div>

        </div>
      </div>

      {/* ── 2. FILTER & TOOLBAR SECTION (MENGGUNAKAN CUSTOMSELECT & TOKEN WEB) ── */}
      <div className="flex flex-col gap-4 bg-white rounded-[var(--ui-radius-card,24px)] p-4 sm:p-5 border border-slate-200/80 shadow-xs">
        
        {/* Row 1: Search Bar & Tombol Panduan */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          
          {/* Search Bar with clear button */}
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input 
              type="text" 
              placeholder="Cari judul agenda, kategori, atau tanggal kegiatan..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full h-11 pl-10 pr-9 bg-slate-50 border border-slate-200 rounded-[var(--ui-radius-control,12px)] text-xs sm:text-sm font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[var(--ui-primary,#059669)] focus:bg-white focus:ring-3 focus:ring-[var(--ui-primary,#059669)]/10 transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-0.5"
                title="Hapus pencarian"
              >
                <X size={15} strokeWidth={2.5} />
              </button>
            )}
          </div>
          
          {/* Tombol Panduan */}
          <button 
            type="button"
            onClick={() => setShowGuide(true)} 
            className="h-11 px-4 rounded-[var(--ui-radius-control,12px)] bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 flex items-center justify-center gap-2 cursor-pointer transition-all shrink-0 active:scale-95 shadow-2xs"
          >
            <BookOpen size={15} className="text-slate-500" />
            <span>Panduan</span>
          </button>
        </div>

        {/* Row 2: Waktu Filter, Category Dropdown (CustomSelect), & View Mode Switcher */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 border-t border-slate-100 pt-3">
          
          {/* Time Filters Chips */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs font-black text-slate-400 uppercase tracking-wider mr-1">
              <Filter size={13} strokeWidth={2.5} />
              <span>Waktu:</span>
            </div>
            
            <button 
              type="button"
              onClick={() => { setTimeFilter('all'); setSelectedDate(null); }}
              className={`px-3.5 py-1 rounded-full font-bold text-xs cursor-pointer transition-all border ${
                timeFilter === 'all' && !selectedDate 
                  ? 'bg-slate-900 text-white border-slate-900 shadow-2xs' 
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              Semua ({allEvents.length})
            </button>
            
            <button 
              type="button"
              onClick={() => { setTimeFilter('month'); setSelectedDate(null); }}
              className={`px-3.5 py-1 rounded-full font-bold text-xs cursor-pointer transition-all border ${
                timeFilter === 'month' && !selectedDate 
                  ? 'text-white shadow-2xs' 
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
              style={timeFilter === 'month' && !selectedDate ? {
                backgroundColor: 'var(--ui-primary, #059669)',
                borderColor: 'var(--ui-primary, #059669)'
              } : {}}
            >
              Bulan Ini ({monthCount})
            </button>
            
            <button 
              type="button"
              onClick={() => { setTimeFilter('upcoming'); setSelectedDate(null); }}
              className={`px-3.5 py-1 rounded-full font-bold text-xs cursor-pointer transition-all border ${
                timeFilter === 'upcoming' && !selectedDate 
                  ? 'bg-sky-600 text-white border-sky-600 shadow-2xs' 
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              Mendatang ({upcomingCount})
            </button>
            
            <button 
              type="button"
              onClick={() => { setTimeFilter('past'); setSelectedDate(null); }}
              className={`px-3.5 py-1 rounded-full font-bold text-xs cursor-pointer transition-all border ${
                timeFilter === 'past' && !selectedDate 
                  ? 'bg-slate-700 text-white border-slate-700 shadow-2xs' 
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              Sudah Lewat
            </button>
            
            {/* If date is selected from mini calendar */}
            {selectedDate && (
              <div className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1.5 shadow-2xs">
                <span>Tanggal: {formatShortDate(selectedDate)}</span>
                <button 
                  type="button"
                  onClick={() => setSelectedDate(null)} 
                  className="hover:bg-amber-200 rounded-full p-0.5 cursor-pointer border-none bg-transparent"
                  title="Hapus filter tanggal"
                >
                  <X size={12} />
                </button>
              </div>
            )}
          </div>

          {/* Category Dropdown (CustomSelect Resmi Web) & View Mode Toggles */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full xl:w-auto">
            
            {/* CustomSelect Component (100% Mengikuti CSS Variabel Web) */}
            <div className="w-full sm:w-[220px]">
              <CustomSelect
                value={selectedCategory}
                onChange={(val) => setSelectedCategory(val)}
                options={categoryOptions}
                placeholder="Pilih Kategori..."
                searchable={false}
                className="w-full"
              />
            </div>

            {/* View Mode Segmented Toggles */}
            <div className="flex bg-slate-100 p-1 rounded-[var(--ui-radius-control,12px)] border border-slate-200/60 shrink-0 self-start sm:self-auto">
              <button 
                type="button"
                onClick={() => setViewMode('split')}
                className={`px-3.5 h-8 rounded-[var(--ui-radius-small,8px)] text-xs font-bold uppercase tracking-wider transition-all cursor-pointer border-none flex items-center gap-1.5 ${
                  viewMode === 'split' 
                    ? 'bg-white shadow-xs text-slate-900' 
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Layers size={13} strokeWidth={2.4} />
                <span>Split View</span>
              </button>
              
              <button 
                type="button"
                onClick={() => setViewMode('list')}
                className={`px-3.5 h-8 rounded-[var(--ui-radius-small,8px)] text-xs font-bold uppercase tracking-wider transition-all cursor-pointer border-none flex items-center gap-1.5 ${
                  viewMode === 'list' 
                    ? 'bg-white shadow-xs text-slate-900' 
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Grid size={13} strokeWidth={2.4} />
                <span>Daftar Penuh</span>
              </button>
              
              <button 
                type="button"
                onClick={() => setViewMode('calendar')}
                className={`px-3.5 h-8 rounded-[var(--ui-radius-small,8px)] text-xs font-bold uppercase tracking-wider transition-all cursor-pointer border-none flex items-center gap-1.5 ${
                  viewMode === 'calendar' 
                    ? 'bg-white shadow-xs text-slate-900' 
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Calendar size={13} strokeWidth={2.4} />
                <span>Kalender Penuh</span>
              </button>
            </div>

          </div>

        </div>

      </div>

      {/* ── 3. MAIN CONTENT (SPLIT, LIST, ATAU CALENDAR) ── */}
      <div className={`grid grid-cols-1 ${viewMode === 'split' ? 'lg:grid-cols-[1fr_360px]' : ''} gap-6 items-start`}>
        
        {/* EVENT CARDS LIST */}
        {(viewMode === 'split' || viewMode === 'list') && (
          <div className="flex flex-col gap-4">
            
            <div className="flex items-center justify-between px-1">
              <h2 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
                <span>Daftar Kegiatan</span>
                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[11px] font-bold">
                  {filteredEvents.length}
                </span>
              </h2>
              <span className="text-[11px] font-bold text-slate-400">Urutan berdasarkan tanggal</span>
            </div>

            {filteredEvents.length === 0 ? (
              <div className="bg-white border border-dashed border-slate-300 rounded-[var(--ui-radius-card,24px)] p-12 text-center flex flex-col items-center shadow-xs">
                <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-3 shadow-2xs">
                  <Calendar size={28} className="text-slate-400" />
                </div>
                <h3 className="text-base font-black text-slate-800">Tidak ada agenda ditemukan</h3>
                <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-sm leading-relaxed">
                  Ubah kata kunci pencarian, filter waktu, atau klik tanggal lain untuk menemukan agenda kegiatan.
                </p>
                <button
                  type="button"
                  onClick={() => { setSearchQuery(''); setTimeFilter('all'); setSelectedCategory('all'); setSelectedDate(null); }}
                  className="mt-4 px-4 py-2 rounded-[var(--ui-radius-control,10px)] bg-slate-900 text-white text-xs font-bold cursor-pointer border-none shadow-xs hover:bg-slate-800 transition-colors"
                >
                  Reset Semua Filter
                </button>
              </div>
            ) : (
              <div className={`grid grid-cols-1 ${viewMode === 'list' ? 'md:grid-cols-2 lg:grid-cols-3' : 'md:grid-cols-2'} gap-4 sm:gap-5`}>
                {filteredEvents.map(event => {
                  const tone = getTone(event.color);
                  const status = getStatus(event.start, event.end);
                  
                  return (
                    <div 
                      key={event.id} 
                      className="bg-white border border-slate-200/80 rounded-[var(--ui-radius-card,20px)] p-5 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between group select-none"
                    >
                      <div>
                        {/* Category & Status Badges */}
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 ${tone.bg} ${tone.border} border`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${tone.dot}`} />
                            <span className={tone.text}>{event.categoryName}</span>
                          </span>

                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${status.class}`}>
                            {status.label}
                          </span>
                        </div>

                        {/* Title & Description */}
                        <h3 className="font-black text-base text-slate-900 tracking-tight leading-snug mb-1.5 group-hover:text-[var(--ui-primary,#059669)] transition-colors line-clamp-2">
                          {event.title}
                        </h3>
                        
                        <p className="text-xs text-slate-500 font-medium line-clamp-2 leading-relaxed mb-4">
                          {event.description}
                        </p>
                      </div>

                      {/* Date range footer */}
                      <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
                        <div className="flex items-center gap-2 bg-slate-50 border border-slate-100/80 rounded-[var(--ui-radius-control,10px)] px-3 py-1.5 text-xs font-bold text-slate-600 w-full sm:w-auto">
                          <Calendar size={13} className="text-slate-400 shrink-0" />
                          <span>{formatDateRange(event.start, event.end)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── SIDEBAR CALENDAR WIDGET ── */}
        {(viewMode === 'split' || viewMode === 'calendar') && (
          <div className="bg-white border border-slate-200/80 rounded-[var(--ui-radius-card,20px)] p-5 shadow-sm sticky top-24 select-none">
            
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-slate-900 tracking-wider">
                  {monthNames[calMonth]} {calYear}
                </h3>
                {isCurrentMonthView && (
                  <span 
                    className="px-2 py-0.5 rounded-full text-[9.5px] font-black uppercase"
                    style={{
                      backgroundColor: 'color-mix(in srgb, var(--ui-primary, #059669) 12%, transparent)',
                      color: 'var(--ui-primary, #059669)'
                    }}
                  >
                    Bulan Ini
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <button 
                  type="button"
                  onClick={goToToday}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-[var(--ui-radius-small,8px)] text-[10.5px] font-black transition-colors cursor-pointer border-none"
                >
                  Hari Ini
                </button>
                <div className="flex items-center bg-slate-50 rounded-[var(--ui-radius-small,8px)] border border-slate-200 overflow-hidden">
                  <button type="button" onClick={prevMonth} className="p-1 hover:bg-slate-200 text-slate-500 transition-colors cursor-pointer border-none bg-transparent">
                    <ChevronLeft size={16} />
                  </button>
                  <div className="w-px h-4 bg-slate-200"></div>
                  <button type="button" onClick={nextMonth} className="p-1 hover:bg-slate-200 text-slate-500 transition-colors cursor-pointer border-none bg-transparent">
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </div>

            <p className="text-[11px] font-medium text-slate-400 mb-3.5 flex items-center gap-1.5">
              <Info size={12} className="shrink-0" />
              <span>Klik tanggal pada kalender untuk memfilter agenda.</span>
            </p>

            {/* Calendar Grid */}
            <div className="border border-slate-200 rounded-[var(--ui-radius-control,12px)] overflow-hidden shadow-2xs">
              <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-200">
                {["MIN", "SEN", "SEL", "RAB", "KAM", "JUM", "SAB"].map((day, i) => (
                  <div key={day} className={`py-2 text-center text-[10px] font-black tracking-wider ${i === 0 ? 'text-rose-600' : 'text-slate-600'}`}>
                    {day}
                  </div>
                ))}
              </div>
              
              <div className="grid grid-cols-7">
                {/* Empty cells before month starts */}
                {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                  <div key={`empty-${i}`} className="h-11 border-b border-r border-slate-100 bg-slate-50/50"></div>
                ))}

                {/* Days of month */}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const dateObj = new Date(calYear, calMonth, day);
                  const isToday = dateObj.toDateString() === today.toDateString();
                  const isSunday = dateObj.getDay() === 0;
                  const dayEvents = getEventsForDay(day);
                  
                  const isSelected = selectedDate && dateObj.toDateString() === selectedDate.toDateString();
                  const validEvents = dayEvents.filter(e => e.color);
                  
                  return (
                    <div 
                      key={day} 
                      onClick={() => setSelectedDate(isSelected ? null : dateObj)}
                      className={`h-11 border-b border-r border-slate-100 p-1 flex flex-col items-center justify-start cursor-pointer hover:bg-slate-50 transition-colors relative ${
                        isSelected ? 'bg-amber-50 ring-inset ring-2 ring-amber-400' : ''
                      }`}
                    >
                      <span 
                        className={`text-[11px] font-black w-6 h-6 flex items-center justify-center rounded-full mt-0.5 z-10 transition-transform ${
                          isToday 
                            ? 'text-white shadow-xs scale-105' 
                            : (isSunday ? 'text-rose-600' : 'text-slate-700')
                        }`}
                        style={isToday ? { backgroundColor: 'var(--ui-primary, #059669)' } : {}}
                      >
                        {day}
                      </span>
                      
                      {validEvents.length > 0 && (
                        <div className="flex flex-wrap items-center justify-center gap-0.5 mt-0.5">
                          {validEvents.slice(0, 3).map((e, idx) => {
                            const t = getTone(e.color);
                            const isMulti = e.start.toDateString() !== e.end.toDateString();
                            
                            if (isMulti) {
                              return <div key={idx} className={`w-full h-1 mt-0.5 rounded-[var(--ui-radius-small,6px)] ${t.bg} border-y ${t.border}`} title={e.title}></div>;
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
                  <div key={`empty-end-${i}`} className="h-11 border-b border-r border-slate-100 bg-slate-50/50"></div>
                ))}
              </div>
            </div>

            {/* Legend */}
            <div className="mt-5 border-t border-slate-100 pt-4">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2.5 flex items-center gap-1.5">
                <BookOpen size={12} />
                <span>Legenda Kategori</span>
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {calendarCategories.map(cat => {
                  const t = getTone(cat.color);
                  return (
                    <div key={cat.id} className={`px-2.5 py-1 rounded-full border flex items-center gap-1.5 ${t.bg} ${t.border}`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${t.dot}`}></div>
                      <span className={`text-[10px] font-bold ${t.text}`}>{cat.name}</span>
                    </div>
                  );
                })}
                <div className="px-2.5 py-1 rounded-full border flex items-center gap-1.5 bg-rose-50 border-rose-200">
                  <div className="w-1.5 h-1.5 rounded-full bg-rose-500"></div>
                  <span className="text-[10px] font-bold text-rose-700">Libur Nasional</span>
                </div>
              </div>
            </div>

          </div>
        )}
      </div>

      {/* ── MODAL PANDUAN ── */}
      {showGuide && (
        <Modal isOpen={true} onClose={() => setShowGuide(false)} title="Panduan Kalender Akademik" maxWidth="max-w-2xl">
          <div className="p-6 space-y-4 text-sm text-slate-600 font-medium leading-relaxed">
            <p>
              Kalender Akademik merupakan pusat informasi terkait jadwal kegiatan, hari libur, dan agenda penting sekolah selama satu tahun ajaran.
            </p>
            <ul className="list-disc pl-5 space-y-2 text-xs sm:text-sm">
              <li>Gunakan <strong>kolom pencarian</strong> untuk menemukan agenda berdasarkan judul kegiatan atau topik.</li>
              <li>Pilih <strong>Filter Waktu</strong> (Bulan Ini / Mendatang / Sudah Lewat) untuk menyaring kegiatan berdasarkan linimasa.</li>
              <li>Gunakan <strong>Filter Kategori</strong> untuk menampilkan kegiatan bidang tertentu (Kesiswaan, Kurikulum, Hubin, Libur Resmi, dll).</li>
              <li>Klik tanggal pada <strong>Kalender Mini</strong> untuk melihat kegiatan pada tanggal tersebut secara spesifik.</li>
              <li>Ganti tipe tampilan: <strong>Split View</strong> (standar), <strong>Daftar Penuh</strong>, atau <strong>Kalender Penuh</strong>.</li>
            </ul>
            <div className="pt-3 border-t border-slate-100 text-xs text-slate-400">
              Informasi hari libur nasional disinkronkan secara otomatis dengan data resmi pemerintah yang berlaku.
            </div>
          </div>
        </Modal>
      )}

    </div>
  );
}
