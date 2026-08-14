import { useState, useMemo } from 'react';
import { 
  CalendarDays
} from 'lucide-react';
import useAuthStore from '../../../store/monitoring/authStore.js';

export default function TabAkademik(props) {
  const authUser = useAuthStore(state => state.user);
  const currentRole = (authUser?.role || props.currentUser?.role || '').toLowerCase();
  const currentDivision = (authUser?.division || props.currentUser?.division || '').toLowerCase();
  const isReadOnly = props.isReadOnly || props.readOnly;
  const canEdit = !isReadOnly && (['admin', 'superadmin'].includes(currentRole) || (currentRole === 'waka' && currentDivision === 'kurikulum'));

  const {
    academicCalendar = [],
    calendarSearchTerm = "",
    calendarCategories = [],
    setCalendarSearchTerm,
    openAcademicCalendarGuide,
    downloadMasterTemplate,
    openModal,
    setActiveTab,
    formatCalendarDateRange,
    handleRemoveCalendarEventSafe,
    setFormData
  } = props;

  // Calendar Date State
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  
  // Interactive Filters & UI State
  const [selectedDate, setSelectedDate] = useState(null); // 'YYYY-MM-DD' filter
  const [selectedCategory, setSelectedCategory] = useState("all"); // 'all' or categoryId
  const [timeFilter, setTimeFilter] = useState("all"); // 'all', 'month', 'upcoming', 'past'
  const [viewMode, setViewMode] = useState("split"); // 'split', 'cards', 'calendar'
  const [localSearch, setLocalSearch] = useState(calendarSearchTerm || "");
  const [mobileTab, setMobileTab] = useState("list"); // 'list' | 'calendar'

  // Sync search state with parent if available
  const handleSearchChange = (val) => {
    setLocalSearch(val);
    if (setCalendarSearchTerm) {
      setCalendarSearchTerm(val);
    }
  };

  const clearAllFilters = () => {
    setLocalSearch("");
    if (setCalendarSearchTerm) setCalendarSearchTerm("");
    setSelectedDate(null);
    setSelectedCategory("all");
    setTimeFilter("all");
  };

  const normalizeText = (value) => String(value ?? "").trim().replace(/\s+/g, "").toLowerCase();

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const todayStr = useMemo(() => {
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  }, [today]);

  const monthNames = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni", 
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ];

  // Helper category colors with Antigravity design compliance
  const getCategoryColor = (catColor) => {
    switch (catColor) {
      case "rose":
      case "red":
        return { 
          bg: "bg-rose-500 text-white", 
          border: "border-rose-200", 
          lightBg: "bg-rose-50 text-rose-700 border-rose-200/80",
          pillBg: "bg-rose-500/10 text-rose-700 border-rose-200",
          dot: "bg-rose-500",
          cardBorder: "border-l-rose-500",
          badge: "bg-rose-100 text-rose-800"
        };
      case "amber":
      case "orange":
        return { 
          bg: "bg-amber-500 text-white", 
          border: "border-amber-200", 
          lightBg: "bg-amber-50 text-amber-700 border-amber-200/80",
          pillBg: "bg-amber-500/10 text-amber-700 border-amber-200",
          dot: "bg-amber-500",
          cardBorder: "border-l-amber-500",
          badge: "bg-amber-100 text-amber-800"
        };
      case "yellow":
        return { 
          bg: "bg-yellow-400 text-slate-900", 
          border: "border-yellow-200", 
          lightBg: "bg-yellow-50 text-yellow-800 border-yellow-200/80",
          pillBg: "bg-yellow-400/15 text-yellow-800 border-yellow-200",
          dot: "bg-yellow-400",
          cardBorder: "border-l-yellow-400",
          badge: "bg-yellow-100 text-yellow-800"
        };
      case "emerald":
      case "green":
        return { 
          bg: "bg-emerald-600 text-white", 
          border: "border-emerald-200", 
          lightBg: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
          pillBg: "bg-emerald-500/10 text-emerald-700 border-emerald-200",
          dot: "bg-emerald-500",
          cardBorder: "border-l-emerald-500",
          badge: "bg-emerald-100 text-emerald-800"
        };
      case "blue":
      case "sky":
        return { 
          bg: "bg-[var(--ui-primary)] text-white", 
          border: "border-teal-200", 
          lightBg: "bg-teal-50 text-teal-700 border-teal-200/80",
          pillBg: "bg-[var(--ui-primary)]/10 text-teal-800 border-teal-200",
          dot: "bg-teal-600",
          cardBorder: "border-l-[var(--ui-primary)]",
          badge: "bg-teal-100 text-teal-800"
        };
      case "purple":
      case "indigo":
        return { 
          bg: "bg-purple-600 text-white", 
          border: "border-purple-200", 
          lightBg: "bg-purple-50 text-purple-700 border-purple-200/80",
          pillBg: "bg-purple-500/10 text-purple-700 border-purple-200",
          dot: "bg-purple-500",
          cardBorder: "border-l-purple-500",
          badge: "bg-purple-100 text-purple-800"
        };
      default:
        return { 
          bg: "bg-slate-700 text-white", 
          border: "border-slate-200", 
          lightBg: "bg-slate-50 text-slate-700 border-slate-200/80",
          pillBg: "bg-slate-500/10 text-slate-700 border-slate-200",
          dot: "bg-slate-400",
          cardBorder: "border-l-slate-400",
          badge: "bg-slate-100 text-slate-700"
        };
    }
  };

  // Safe date range string formatter with Indonesian locale
  const formatDateRangeText = (start, end) => {
    if (formatCalendarDateRange) {
      try {
        return formatCalendarDateRange(start, end);
      } catch (err) {
        // fallback
      }
    }
    if (!start) return "-";
    try {
      const s = new Date(`${start.slice(0, 10)}T00:00:00`);
      const sText = s.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
      if (!end || end === start) return sText;
      const e = new Date(`${end.slice(0, 10)}T00:00:00`);
      const eText = e.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
      return `${sText} - ${eText}`;
    } catch {
      return start === end ? start : `${start} - ${end || start}`;
    }
  };

  // Event status calculator
  const getEventStatus = (startStr, endStr) => {
    if (!startStr) return { label: "Agenda", color: "bg-slate-100 text-slate-700", type: "upcoming" };
    const s = new Date(`${startStr.slice(0, 10)}T00:00:00`);
    const e = new Date(`${(endStr || startStr).slice(0, 10)}T23:59:59`);
    
    if (today >= s && today <= e) {
      return { 
        label: "Sedang Berlangsung", 
        color: "bg-emerald-50 text-emerald-700 border border-emerald-200 font-extrabold", 
        type: "ongoing",
        isToday: true
      };
    } else if (today < s) {
      const diffTime = Math.abs(s - today);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const countdownText = diffDays === 1 ? "Besok" : `${diffDays} hari lagi`;
      return { 
        label: countdownText, 
        color: "bg-sky-50 text-sky-700 border border-sky-200 font-bold", 
        type: "upcoming"
      };
    } else {
      return { 
        label: "Selesai", 
        color: "bg-slate-100 text-slate-500 border border-slate-200 font-medium", 
        type: "past"
      };
    }
  };

  // Sorted list of events
  const sortedCalendar = useMemo(() => {
    return [...academicCalendar].sort((a, b) => {
      const dateA = new Date(a.dateStart || 0);
      const dateB = new Date(b.dateStart || 0);
      return dateA - dateB;
    });
  }, [academicCalendar]);

  // Comprehensive Filtering
  const filteredCalendar = useMemo(() => {
    const startOfMonth = new Date(currentYear, currentMonth, 1);
    const endOfMonth = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59);

    return sortedCalendar.filter((evt) => {
      const cat = calendarCategories.find((c) => c.id === evt.categoryId);
      const catName = cat?.name || "";
      const start = evt.dateStart ? new Date(`${evt.dateStart.slice(0, 10)}T00:00:00`) : null;
      const end = evt.dateEnd ? new Date(`${evt.dateEnd.slice(0, 10)}T23:59:59`) : start;

      // 1. Text Search Filter
      if (localSearch.trim()) {
        const searchTarget = normalizeText(
          `${evt.title || ""} ${evt.description || ""} ${catName} ${evt.dateStart || ""} ${evt.dateEnd || ""}`
        );
        if (!searchTarget.includes(normalizeText(localSearch))) {
          return false;
        }
      }

      // 2. Specific Date Selection Filter (from calendar click)
      if (selectedDate) {
        if (!evt.dateStart) return false;
        const evtStartStr = evt.dateStart.slice(0, 10);
        const evtEndStr = (evt.dateEnd || evt.dateStart).slice(0, 10);
        if (selectedDate < evtStartStr || selectedDate > evtEndStr) {
          return false;
        }
      }

      // 3. Category Filter
      if (selectedCategory !== "all") {
        if (evt.categoryId !== selectedCategory) {
          return false;
        }
      }

      // 4. Time Scope Filter
      if (timeFilter === "month") {
        if (!start || !end) return false;
        if (end < startOfMonth || start > endOfMonth) return false;
      } else if (timeFilter === "upcoming") {
        if (!end) return false;
        if (end < today) return false;
      } else if (timeFilter === "past") {
        if (!end) return false;
        if (end >= today) return false;
      }

      return true;
    });
  }, [sortedCalendar, localSearch, selectedDate, selectedCategory, timeFilter, currentYear, currentMonth, calendarCategories, today]);

  // Statistics KPI calculations
  const stats = useMemo(() => {
    const startOfMonth = new Date(currentYear, currentMonth, 1);
    const endOfMonth = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59);

    let upcomingCount = 0;
    let thisMonthCount = 0;
    let holidayCount = 0;

    sortedCalendar.forEach(evt => {
      const s = evt.dateStart ? new Date(`${evt.dateStart.slice(0, 10)}T00:00:00`) : null;
      const e = evt.dateEnd ? new Date(`${evt.dateEnd.slice(0, 10)}T23:59:59`) : s;
      
      if (e && e >= today) upcomingCount++;
      if (s && e && s <= endOfMonth && e >= startOfMonth) thisMonthCount++;

      const cat = calendarCategories.find(c => c.id === evt.categoryId);
      if (cat && (cat.name.toLowerCase().includes('libur') || cat.color === 'rose' || cat.color === 'red')) {
        holidayCount++;
      }
    });

    return {
      total: sortedCalendar.length,
      upcoming: upcomingCount,
      thisMonth: thisMonthCount,
      holiday: holidayCount
    };
  }, [sortedCalendar, calendarCategories, currentYear, currentMonth, today]);

  // Calendar Grid Days Calculation
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay(); // 0: Minggu
  const daysInCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  const calendarCells = useMemo(() => {
    const cells = [];
    for (let i = 0; i < firstDayOfMonth; i++) {
      cells.push(null);
    }
    for (let d = 1; d <= daysInCurrentMonth; d++) {
      cells.push(d);
    }
    return cells;
  }, [firstDayOfMonth, daysInCurrentMonth]);

  // Quick navigation helpers
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  };

  const handleJumpToToday = () => {
    const now = new Date();
    setCurrentMonth(now.getMonth());
    setCurrentYear(now.getFullYear());
    setSelectedDate(todayStr);
  };

  const handleAddNewOnDate = (dateStr) => {
    if (!canEdit || !openModal) return;
    const targetDate = dateStr || todayStr;
    if (setFormData) {
      setFormData({
        title: "",
        categoryId: calendarCategories[0]?.id || "",
        dateStart: targetDate,
        dateEnd: targetDate,
        description: ""
      });
    }
    openModal("event_kalender", "add");
  };

  const activeFiltersCount = (localSearch ? 1 : 0) + (selectedDate ? 1 : 0) + (selectedCategory !== "all" ? 1 : 0) + (timeFilter !== "all" ? 1 : 0);

  return (
    <div className="flex flex-col gap-5 h-full w-full animate-in fade-in duration-300 relative z-10 pb-20 sm:pb-8">
      
      {/* ── 1. Page Header with Interactive KPI summary ── */}
      <PageHeader
        title="Kalender Akademik"
        description="Jadwal kegiatan akademik, agenda sekolah, dan informasi hari libur resmi."
        icon={CalendarDays}
        onBack={() => typeof window !== 'undefined' && window.__setActiveTab ? window.__setActiveTab('dashboard') : null}
      >
        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Stat Chips */}
          <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-[var(--ui-radius-small)] backdrop-blur-md border border-white/15 shadow-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-white/75">Total:</span>
            <span className="text-xs font-black text-white bg-white/20 px-2 py-0.5 rounded-[var(--ui-radius-small)]">
              {stats.total}
            </span>
          </div>

          <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-[var(--ui-radius-small)] backdrop-blur-md border border-white/15 shadow-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-200">Bulan Ini:</span>
            <span className="text-xs font-black text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-[var(--ui-radius-small)]">
              {stats.thisMonth}
            </span>
          </div>

          <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-[var(--ui-radius-small)] backdrop-blur-md border border-white/15 shadow-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-200">Mendatang:</span>
            <span className="text-xs font-black text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded-[var(--ui-radius-small)]">
              {stats.upcoming}
            </span>
          </div>
        </div>
      </PageHeader>

      {/* ── 2. Unified Control Toolbar (Search, Filter, Actions, View Switcher) ── */}
      <div className="ui-card p-4 sm:p-5 rounded-[var(--ui-radius-card)] bg-white border border-slate-200/80 shadow-xs flex flex-col gap-4">
        
        {/* Top Row: Search Bar & Primary Actions */}
        <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
          
          {/* Search Box */}
          <div className="relative flex-1 max-w-xl">
            <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={localSearch}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full rounded-[var(--ui-radius-small)] bg-slate-50 border border-slate-200/80 pl-10 pr-9 py-2.5 text-xs sm:text-sm font-bold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-[var(--ui-primary)] focus:ring-2 focus:ring-[var(--ui-primary)]/10 shadow-xs transition-all"
              placeholder="Cari judul agenda, kategori, atau tanggal kegiatan..."
            />
            {localSearch && (
              <button
                type="button"
                onClick={() => handleSearchChange("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-200 transition-colors"
                title="Hapus pencarian"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Action Buttons Toolbar */}
          <div className="flex flex-wrap items-center gap-2 justify-end">
            {openAcademicCalendarGuide && (
              <button
                type="button"
                onClick={openAcademicCalendarGuide}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-[var(--ui-radius-small)] border border-slate-200 shadow-2xs transition-all active:scale-95 cursor-pointer"
                title="Petunjuk Penggunaan Kalender"
              >
                <BookOpen size={14} className="text-slate-500" />
                <span className="hidden sm:inline">Panduan</span>
              </button>
            )}

            {canEdit && downloadMasterTemplate && (
              <button
                type="button"
                onClick={downloadMasterTemplate}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-[var(--ui-radius-small)] border border-slate-200 shadow-2xs transition-all active:scale-95 cursor-pointer"
                title="Unduh Template Excel"
              >
                <FileDown size={14} className="text-slate-500" />
                <span className="hidden sm:inline">Template</span>
              </button>
            )}

            {canEdit && openModal && (
              <button
                type="button"
                onClick={() => openModal("bulk", "add")}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-[var(--ui-radius-small)] border border-slate-200 shadow-2xs transition-all active:scale-95 cursor-pointer"
                title="Import Agenda dari Excel"
              >
                <Upload size={14} className="text-slate-500" />
                <span className="hidden sm:inline">Import</span>
              </button>
            )}

            {canEdit && setActiveTab && (
              <button
                type="button"
                onClick={() => setActiveTab("kategori_kalender")}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-[var(--ui-radius-small)] border border-slate-200 shadow-2xs transition-all active:scale-95 cursor-pointer"
                title="Kelola Kategori Agenda"
              >
                <List size={14} className="text-slate-500" />
                <span className="hidden sm:inline">Kategori</span>
              </button>
            )}

            {/* Primary Action Button */}
            {canEdit && openModal && (
              <button
                type="button"
                onClick={() => handleAddNewOnDate(selectedDate || todayStr)}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-black text-white bg-[var(--ui-primary)] hover:opacity-90 rounded-[var(--ui-radius-small)] shadow-xs transition-all active:scale-95 cursor-pointer shrink-0"
              >
                <Plus size={15} strokeWidth={2.5} />
                <span>Tambah Agenda</span>
              </button>
            )}
          </div>
        </div>

        {/* Bottom Row: Time Filter Pills, Category Dropdown & View Mode Switcher */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
          
          {/* Time Scope Quick Filters */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1 hidden sm:inline">
              Filter:
            </span>
            
            <button
              type="button"
              onClick={() => setTimeFilter("all")}
              className={`px-3 py-1.5 rounded-[var(--ui-radius-small)] text-xs font-bold transition-all cursor-pointer ${
                timeFilter === "all"
                  ? "bg-[var(--ui-primary)] text-white shadow-2xs"
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/60"
              }`}
            >
              Semua ({stats.total})
            </button>

            <button
              type="button"
              onClick={() => setTimeFilter("month")}
              className={`px-3 py-1.5 rounded-[var(--ui-radius-small)] text-xs font-bold transition-all cursor-pointer ${
                timeFilter === "month"
                  ? "bg-[var(--ui-primary)] text-white shadow-2xs"
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/60"
              }`}
            >
              Bulan Ini ({stats.thisMonth})
            </button>

            <button
              type="button"
              onClick={() => setTimeFilter("upcoming")}
              className={`px-3 py-1.5 rounded-[var(--ui-radius-small)] text-xs font-bold transition-all cursor-pointer ${
                timeFilter === "upcoming"
                  ? "bg-emerald-600 text-white shadow-2xs"
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/60"
              }`}
            >
              Mendatang ({stats.upcoming})
            </button>

            <button
              type="button"
              onClick={() => setTimeFilter("past")}
              className={`px-3 py-1.5 rounded-[var(--ui-radius-small)] text-xs font-bold transition-all cursor-pointer ${
                timeFilter === "past"
                  ? "bg-slate-700 text-white shadow-2xs"
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/60"
              }`}
            >
              Sudah Lewat
            </button>
          </div>

          {/* Right Controls: Category Filter & View Mode Switcher */}
          <div className="flex flex-wrap items-center gap-2">
            
            {/* Category Select */}
            <div className="w-44">
              <UISelect
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                placeholder="Semua Kategori"
              >
                <option value="all">Semua Kategori</option>
                {calendarCategories.map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </UISelect>
            </div>

            {/* View Mode Switcher (Desktop) */}
            <div className="hidden lg:flex items-center gap-1 bg-slate-100 p-1 rounded-[var(--ui-radius-small)] border border-slate-200/60">
              <button
                type="button"
                onClick={() => setViewMode("split")}
                className={`px-2.5 py-1 text-xs font-bold rounded-[var(--ui-radius-small)] transition-all cursor-pointer ${
                  viewMode === "split"
                    ? "bg-white text-slate-800 shadow-2xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
                title="Tampilan Terpisah (Agenda & Kalender)"
              >
                Split View
              </button>
              <button
                type="button"
                onClick={() => setViewMode("cards")}
                className={`px-2.5 py-1 text-xs font-bold rounded-[var(--ui-radius-small)] transition-all cursor-pointer ${
                  viewMode === "cards"
                    ? "bg-white text-slate-800 shadow-2xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
                title="Tampilan Penuh Daftar Agenda"
              >
                Daftar Penuh
              </button>
              <button
                type="button"
                onClick={() => setViewMode("calendar")}
                className={`px-2.5 py-1 text-xs font-bold rounded-[var(--ui-radius-small)] transition-all cursor-pointer ${
                  viewMode === "calendar"
                    ? "bg-white text-slate-800 shadow-2xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
                title="Tampilan Kalender Penuh"
              >
                Kalender Penuh
              </button>
            </div>

            {/* Mobile Tab Switcher */}
            <div className="flex lg:hidden items-center gap-1 bg-slate-100 p-1 rounded-[var(--ui-radius-small)] border border-slate-200/60">
              <button
                type="button"
                onClick={() => setMobileTab("list")}
                className={`px-3 py-1 text-xs font-bold rounded-[var(--ui-radius-small)] transition-all cursor-pointer ${
                  mobileTab === "list"
                    ? "bg-white text-slate-800 shadow-2xs"
                    : "text-slate-500"
                }`}
              >
                Agenda ({filteredCalendar.length})
              </button>
              <button
                type="button"
                onClick={() => setMobileTab("calendar")}
                className={`px-3 py-1 text-xs font-bold rounded-[var(--ui-radius-small)] transition-all cursor-pointer ${
                  mobileTab === "calendar"
                    ? "bg-white text-slate-800 shadow-2xs"
                    : "text-slate-500"
                }`}
              >
                Kalender
              </button>
            </div>

            {/* Clear Filter Button if active */}
            {activeFiltersCount > 0 && (
              <button
                type="button"
                onClick={clearAllFilters}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-[var(--ui-radius-small)] border border-rose-200 transition-all cursor-pointer"
                title="Reset Semua Filter"
              >
                <RotateCcw size={12} />
                <span>Reset ({activeFiltersCount})</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── 3. Active Date Selection Filter Banner ── */}
      {selectedDate && (
        <div className="ui-card p-3 sm:p-4 rounded-[var(--ui-radius-small)] bg-emerald-50/90 border border-emerald-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
            <div>
              <p className="text-xs sm:text-sm font-black text-emerald-900">
                Menampilkan agenda pada: {formatDateRangeText(selectedDate, selectedDate)}
              </p>
              <p className="text-[11px] font-semibold text-emerald-700">
                Ditemukan {filteredCalendar.length} agenda kegiatan pada tanggal ini.
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 shrink-0">
            {canEdit && (
              <button
                type="button"
                onClick={() => handleAddNewOnDate(selectedDate)}
                className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-[var(--ui-radius-small)] text-xs font-extrabold shadow-2xs cursor-pointer inline-flex items-center gap-1.5 transition-all"
              >
                <Plus size={13} strokeWidth={2.5} />
                <span>Tambah di Tanggal Ini</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setSelectedDate(null)}
              className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-[var(--ui-radius-small)] text-xs font-bold shadow-2xs cursor-pointer inline-flex items-center gap-1 transition-all"
            >
              <X size={13} />
              <span>Tutup Filter</span>
            </button>
          </div>
        </div>
      )}

      {/* ── 4. Main Layout Grid (Agenda Cards & Calendar) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* Left / Main Column: Agenda Cards */}
        <div className={`
          ${viewMode === 'cards' ? 'lg:col-span-12' : viewMode === 'calendar' ? 'hidden' : 'lg:col-span-7 xl:col-span-8'}
          ${mobileTab === 'calendar' ? 'hidden lg:block' : 'block'}
          flex flex-col gap-4
        `}>
          {/* Subheader info */}
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                Daftar Kegiatan ({filteredCalendar.length})
              </span>
              {selectedCategory !== "all" && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--ui-primary)]/10 text-[var(--ui-primary)] border border-[var(--ui-primary)]/20">
                  {calendarCategories.find(c => c.id === selectedCategory)?.name}
                </span>
              )}
            </div>
            
            <span className="text-[11px] font-medium text-slate-400">
              Urutan berdasarkan tanggal
            </span>
          </div>

          {/* Agenda Cards Container */}
          {filteredCalendar.length === 0 ? (
            <div className="ui-card p-10 sm:p-14 rounded-[var(--ui-radius-card)] bg-white border border-slate-200/70 shadow-xs flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 rounded-[var(--ui-radius-card)] bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-300 mb-4 shadow-inner">
                <CalendarDays size={32} />
              </div>
              <h3 className="text-base font-black text-slate-700">
                Tidak ada agenda yang cocok
              </h3>
              <p className="text-xs font-medium text-slate-500 mt-1.5 max-w-sm">
                {activeFiltersCount > 0
                  ? "Coba sesuaikan kata kunci pencarian atau bersihkan filter tanggal/kategori yang aktif."
                  : "Belum ada agenda akademik yang terdaftar. Anda dapat menambahkan agenda baru sekarang."}
              </p>
              
              <div className="flex items-center gap-2 mt-5">
                {activeFiltersCount > 0 && (
                  <button
                    type="button"
                    onClick={clearAllFilters}
                    className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-[var(--ui-radius-small)] text-xs font-bold transition-all cursor-pointer"
                  >
                    Reset Filter
                  </button>
                )}
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => handleAddNewOnDate(selectedDate || todayStr)}
                    className="px-4 py-2 bg-[var(--ui-primary)] hover:opacity-90 text-white rounded-[var(--ui-radius-small)] text-xs font-black shadow-xs transition-all cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <Plus size={14} strokeWidth={2.5} />
                    <span>Tambah Agenda Baru</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className={`grid gap-3.5 ${viewMode === 'cards' ? 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3' : 'grid-cols-1 md:grid-cols-2'}`}>
              {filteredCalendar.map((evt) => {
                const cat = calendarCategories.find((c) => c.id === evt.categoryId);
                const colors = getCategoryColor(cat?.color);
                const status = getEventStatus(evt.dateStart, evt.dateEnd);

                return (
                  <div
                    key={evt.id}
                    className={`ui-card group relative bg-white border border-slate-200/80 hover:border-slate-300 rounded-[var(--ui-radius-card)] p-4 sm:p-5 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between border-l-4 ${colors.cardBorder}`}
                  >
                    <div>
                      {/* Top Badges (Category & Live Status) */}
                      <div className="flex items-start justify-between gap-2 mb-2.5">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[var(--ui-radius-small)] border text-[9.5px] font-black uppercase tracking-wider ${colors.lightBg}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${colors.dot}`}></span>
                          {cat?.name || "Umum / Sekolah"}
                        </span>

                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-[var(--ui-radius-small)] text-[10px] ${status.color}`}>
                          {status.isToday && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />}
                          {status.label}
                        </span>
                      </div>

                      {/* Title & Description */}
                      <h3 className="text-sm sm:text-base font-black text-slate-800 leading-snug group-hover:text-[var(--ui-primary)] transition-colors">
                        {evt.title}
                      </h3>
                      
                      <p className="text-xs font-medium text-slate-500 mt-2 line-clamp-2 leading-relaxed">
                        {evt.description || "Tidak ada rincian keterangan tambahan."}
                      </p>
                    </div>

                    {/* Footer: Date Range & Action Buttons */}
                    <div className="mt-4 pt-3.5 border-t border-slate-100/90 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600 bg-slate-50 px-2.5 py-1 rounded-[var(--ui-radius-small)] border border-slate-200/60 shadow-2xs">
                        <Calendar size={13} className="text-slate-400 shrink-0" />
                        <span className="truncate">{formatDateRangeText(evt.dateStart, evt.dateEnd)}</span>
                      </div>

                      {/* Action buttons */}
                      {canEdit && (
                        <div className="flex items-center gap-1 shrink-0 opacity-90 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={() => openModal("event_kalender", "edit", evt)}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-[var(--ui-radius-small)] border border-transparent hover:border-indigo-100 transition-all cursor-pointer"
                            title="Edit Agenda"
                          >
                            <Edit2 size={14} />
                          </button>
                          
                          <button
                            type="button"
                            onClick={() => handleRemoveCalendarEventSafe(evt.id)}
                            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-[var(--ui-radius-small)] border border-transparent hover:border-rose-100 transition-all cursor-pointer"
                            title="Hapus Agenda"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Interactive Monthly Calendar Grid & Interactive Legend */}
        <div className={`
          ${viewMode === 'calendar' ? 'lg:col-span-12' : viewMode === 'cards' ? 'hidden' : 'lg:col-span-5 xl:col-span-4'}
          ${mobileTab === 'list' ? 'hidden lg:block' : 'block'}
          flex flex-col gap-4 sticky top-4
        `}>
          <div className="ui-card p-4 sm:p-5 rounded-[var(--ui-radius-card)] bg-white border border-slate-200/80 shadow-xs flex flex-col gap-4">
            
            {/* Calendar Navigation Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-slate-800 uppercase tracking-wider">
                  {monthNames[currentMonth]} {currentYear}
                </span>
                {currentMonth === new Date().getMonth() && currentYear === new Date().getFullYear() && (
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Bulan Ini
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleJumpToToday}
                  className="px-2.5 py-1 text-[11px] font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-[var(--ui-radius-small)] border border-slate-200 shadow-2xs transition-all cursor-pointer mr-1"
                  title="Kembali ke Hari Ini"
                >
                  Hari Ini
                </button>

                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="p-1.5 text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 rounded-[var(--ui-radius-small)] border border-slate-200 transition-all cursor-pointer"
                  title="Bulan Sebelumnya"
                >
                  <ChevronLeft size={16} />
                </button>

                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="p-1.5 text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 rounded-[var(--ui-radius-small)] border border-slate-200 transition-all cursor-pointer"
                  title="Bulan Berikutnya"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

            {/* Quick helper tip */}
            <p className="text-[11px] font-medium text-slate-500 flex items-center gap-1.5">
              <CalendarCheck size={13} className="text-slate-400 shrink-0" />
              <span>Klik tanggal untuk memfilter agenda kegiatan.</span>
            </p>

            {/* Calendar Table Grid */}
            <div className="overflow-hidden border border-slate-200/90 rounded-[var(--ui-radius-small)] bg-white shadow-2xs">
              
              {/* Day Name Headers */}
              <div className="grid grid-cols-7 border-b border-slate-200/90 bg-slate-50/80 text-center font-black text-[10px] py-2 uppercase tracking-wider">
                <div className="text-rose-500">Min</div>
                <div className="text-slate-600">Sen</div>
                <div className="text-slate-600">Sel</div>
                <div className="text-slate-600">Rab</div>
                <div className="text-slate-600">Kam</div>
                <div className="text-slate-600">Jum</div>
                <div className="text-slate-600">Sab</div>
              </div>

              {/* Day Number Cells */}
              <div className="grid grid-cols-7 bg-slate-200/60 gap-[1px]">
                {calendarCells.map((dayNum, idx) => {
                  if (dayNum === null) {
                    return <div key={`empty-${idx}`} className="bg-slate-50/40 p-1 min-h-[50px] sm:min-h-[56px]"></div>;
                  }

                  const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                  
                  // Find all events on this date
                  const dayEvents = sortedCalendar.filter((evt) => {
                    const start = evt.dateStart ? evt.dateStart.slice(0, 10) : "";
                    const end = evt.dateEnd ? evt.dateEnd.slice(0, 10) : start;
                    return dateStr >= start && dateStr <= end;
                  });

                  const dayOfWeek = idx % 7;
                  const isSunday = dayOfWeek === 0;
                  const isTodayCell = dateStr === todayStr;
                  const isSelectedCell = selectedDate === dateStr;

                  // Determine background styling from events
                  let cellBg = "bg-white";
                  let eventBadgeColor = "bg-slate-100 text-slate-700";

                  if (dayEvents.length > 0) {
                    const firstEvt = dayEvents[0];
                    const cat = calendarCategories.find(c => c.id === firstEvt.categoryId);
                    const colors = getCategoryColor(cat?.color);
                    cellBg = colors.pillBg;
                    eventBadgeColor = colors.badge;
                  }

                  return (
                    <div
                      key={`day-${dayNum}`}
                      onClick={() => {
                        if (selectedDate === dateStr) {
                          setSelectedDate(null); // toggle off
                        } else {
                          setSelectedDate(dateStr);
                        }
                      }}
                      className={`
                        p-1 sm:p-1.5 min-h-[50px] sm:min-h-[56px] flex flex-col justify-between cursor-pointer transition-all select-none relative
                        ${cellBg}
                        ${isSelectedCell ? 'ring-2 ring-[var(--ui-primary)] ring-inset z-20 font-black' : 'hover:bg-slate-100/80'}
                      `}
                      title={dayEvents.length > 0 
                        ? `${dayNum} ${monthNames[currentMonth]} - ${dayEvents.map(e => e.title).join(", ")} (Klik untuk filter)` 
                        : `${dayNum} ${monthNames[currentMonth]} (Klik untuk filter / tambah)`
                      }
                    >
                      {/* Day Header with Today Badge */}
                      <div className="flex items-center justify-between">
                        <span className={`
                          text-xs font-extrabold inline-flex items-center justify-center
                          ${isTodayCell 
                            ? 'w-5 h-5 rounded-full bg-[var(--ui-primary)] text-white shadow-2xs font-black text-[11px]' 
                            : isSunday ? 'text-rose-600' : 'text-slate-800'}
                        `}>
                          {dayNum}
                        </span>

                        {dayEvents.length > 1 && (
                          <span className="text-[8.5px] font-black text-slate-500 bg-white/80 px-1 rounded-full border border-slate-200/60">
                            +${dayEvents.length}
                          </span>
                        )}
                      </div>

                      {/* Event Snippet Preview in Cell */}
                      {dayEvents.length > 0 && (
                        <div className="mt-1 flex flex-col gap-0.5">
                          <div className={`text-[7.5px] font-black uppercase tracking-tight truncate px-1 py-0.5 rounded-[var(--ui-radius-small)] ${eventBadgeColor} shadow-2xs`}>
                            {dayEvents[0].title}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── 5. Interactive Category Legend (Clickable!) ── */}
            <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                  <Tag size={12} />
                  Legenda Kategori
                </span>
                {selectedCategory !== "all" && (
                  <button
                    type="button"
                    onClick={() => setSelectedCategory("all")}
                    className="text-[10px] font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
                  >
                    Tampilkan Semua
                  </button>
                )}
              </div>

              <div className="flex flex-wrap gap-1.5">
                {calendarCategories.map(cat => {
                  const colors = getCategoryColor(cat.color);
                  const isSelected = selectedCategory === cat.id;

                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCategory(prev => prev === cat.id ? "all" : cat.id)}
                      className={`
                        inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[var(--ui-radius-small)] text-[10px] font-bold border transition-all cursor-pointer
                        ${isSelected 
                          ? `${colors.bg} shadow-2xs ring-2 ring-offset-1 ring-slate-400` 
                          : `${colors.lightBg} hover:opacity-80`}
                      `}
                      title={`Klik untuk memfilter agenda ${cat.name}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : colors.dot}`}></span>
                      <span>{cat.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

          </div>
        </div>

      </div>

    </div>
  );
}
