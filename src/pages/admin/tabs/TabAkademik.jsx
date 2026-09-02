import React, { useState, useMemo } from 'react';
import { 
  CalendarDays, Search, BookOpen, FileDown, Upload, List, Plus, Calendar, 
  Edit2, Trash2, ChevronLeft, ChevronRight, X, 
  Tag, RotateCcw, CalendarCheck, Check, Clock
} from 'lucide-react';
import { UISelect, Button } from '../../../components/ui.jsx';
import { PageHeader } from '../../../components/monitoring/ui/index.js';
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
          {/* Quick Stat Chips (High Contrast & Clean) */}
          <div className="flex items-center gap-1.5 bg-slate-100/90 border border-slate-200/80 px-2.5 py-1 rounded-[var(--ui-radius-small)] shadow-2xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total:</span>
            <span className="text-xs font-black text-slate-800 bg-white px-1.5 py-0.5 rounded shadow-2xs">
              {stats.total}
            </span>
          </div>

          <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200/80 px-2.5 py-1 rounded-[var(--ui-radius-small)] shadow-2xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700">Bulan Ini:</span>
            <span className="text-xs font-black text-amber-900 bg-amber-200/60 px-1.5 py-0.5 rounded shadow-2xs">
              {stats.thisMonth}
            </span>
          </div>

          <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200/80 px-2.5 py-1 rounded-[var(--ui-radius-small)] shadow-2xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Mendatang:</span>
            <span className="text-xs font-black text-emerald-900 bg-emerald-200/60 px-1.5 py-0.5 rounded shadow-2xs">
              {stats.upcoming}
            </span>
          </div>
        </div>
      </PageHeader>

      {/* ── 2. Unified Control Toolbar (Search, Filter, Actions) ── */}
      <div className="ui-card p-3.5 sm:p-4 rounded-[var(--ui-radius-card)] bg-white border border-slate-200/80 shadow-xs flex flex-col gap-3">
        
        {/* Top Row: Search Bar & Primary Actions */}
        <div className="flex flex-col lg:flex-row gap-2.5 items-stretch lg:items-center justify-between">
          
          {/* Search Box */}
          <div className="relative flex-1 max-w-xl">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={localSearch}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full rounded-[var(--ui-radius-small)] bg-slate-50/80 hover:bg-slate-50 border border-slate-200/80 pl-9 pr-8 py-2 text-xs font-bold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-[var(--ui-primary)] focus:ring-2 focus:ring-[var(--ui-primary)]/10 shadow-2xs transition-all"
              placeholder="Cari judul agenda, kategori, atau tanggal kegiatan..."
            />
            {localSearch && (
              <button
                type="button"
                onClick={() => handleSearchChange("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-200 transition-colors"
                title="Hapus pencarian"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Action Buttons Toolbar */}
          <div className="flex flex-wrap items-center gap-1.5 justify-end">
            {openAcademicCalendarGuide && (
              <button
                type="button"
                onClick={openAcademicCalendarGuide}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-[var(--ui-radius-small)] border border-slate-200/80 shadow-2xs transition-all active:scale-95 cursor-pointer"
                title="Petunjuk Penggunaan Kalender"
              >
                <BookOpen size={13} className="text-slate-500" />
                <span className="hidden sm:inline">Panduan</span>
              </button>
            )}

            {canEdit && downloadMasterTemplate && (
              <button
                type="button"
                onClick={downloadMasterTemplate}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-[var(--ui-radius-small)] border border-slate-200/80 shadow-2xs transition-all active:scale-95 cursor-pointer"
                title="Unduh Template Excel"
              >
                <FileDown size={13} className="text-slate-500" />
                <span className="hidden sm:inline">Template</span>
              </button>
            )}

            {canEdit && openModal && (
              <button
                type="button"
                onClick={() => openModal("bulk", "add")}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-[var(--ui-radius-small)] border border-slate-200/80 shadow-2xs transition-all active:scale-95 cursor-pointer"
                title="Import Agenda dari Excel"
              >
                <Upload size={13} className="text-slate-500" />
                <span className="hidden sm:inline">Import</span>
              </button>
            )}

            {canEdit && setActiveTab && (
              <button
                type="button"
                onClick={() => setActiveTab("kategori_kalender")}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-[var(--ui-radius-small)] border border-slate-200/80 shadow-2xs transition-all active:scale-95 cursor-pointer"
                title="Kelola Kategori Agenda"
              >
                <List size={13} className="text-slate-500" />
                <span className="hidden sm:inline">Kategori</span>
              </button>
            )}

            {/* Primary Action Button */}
            {canEdit && openModal && (
              <button
                type="button"
                onClick={() => handleAddNewOnDate(selectedDate || todayStr)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-black text-white bg-[var(--ui-primary)] hover:opacity-90 rounded-[var(--ui-radius-small)] shadow-xs transition-all active:scale-95 cursor-pointer shrink-0"
              >
                <Plus size={14} strokeWidth={2.5} />
                <span>Tambah Agenda</span>
              </button>
            )}
          </div>
        </div>

        {/* Bottom Row: Time Filter Pills & Category Dropdown */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2.5 border-t border-slate-100">
          
          {/* Time Scope Quick Filters (Segmented Control style) */}
          <div className="inline-flex p-0.5 rounded-[var(--ui-radius-small)] bg-slate-100/90 border border-slate-200/60 items-center">
            <button
              type="button"
              onClick={() => setTimeFilter("all")}
              className={`px-2.5 py-1 rounded-[calc(var(--ui-radius-small)-2px)] text-[11px] font-bold transition-all cursor-pointer ${
                timeFilter === "all"
                  ? "bg-white text-slate-800 shadow-xs font-black"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Semua ({stats.total})
            </button>

            <button
              type="button"
              onClick={() => setTimeFilter("month")}
              className={`px-2.5 py-1 rounded-[calc(var(--ui-radius-small)-2px)] text-[11px] font-bold transition-all cursor-pointer ${
                timeFilter === "month"
                  ? "bg-white text-slate-800 shadow-xs font-black"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Bulan Ini ({stats.thisMonth})
            </button>

            <button
              type="button"
              onClick={() => setTimeFilter("upcoming")}
              className={`px-2.5 py-1 rounded-[calc(var(--ui-radius-small)-2px)] text-[11px] font-bold transition-all cursor-pointer ${
                timeFilter === "upcoming"
                  ? "bg-white text-emerald-700 shadow-xs font-black"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Mendatang ({stats.upcoming})
            </button>

            <button
              type="button"
              onClick={() => setTimeFilter("past")}
              className={`px-2.5 py-1 rounded-[calc(var(--ui-radius-small)-2px)] text-[11px] font-bold transition-all cursor-pointer ${
                timeFilter === "past"
                  ? "bg-white text-slate-800 shadow-xs font-black"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Sudah Lewat
            </button>
          </div>

          {/* Right Controls: Mobile Switcher & Clear Filter */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Mobile Tab Switcher */}
            <div className="flex lg:hidden items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
              <Button
                variant={mobileTab === 'list' ? 'primary' : 'ghost'}
                onClick={() => setMobileTab("list")}
                className={`flex-1 shrink-0 text-xs py-1.5 px-2.5 ${mobileTab !== 'list' ? 'text-slate-500' : ''}`}
              >
                Agenda ({filteredCalendar.length})
              </Button>
              <Button
                variant={mobileTab === 'calendar' ? 'primary' : 'ghost'}
                onClick={() => setMobileTab("calendar")}
                className={`flex-1 shrink-0 text-xs py-1.5 px-2.5 ${mobileTab !== 'calendar' ? 'text-slate-500' : ''}`}
              >
                Kalender
              </Button>
            </div>

            {/* Clear Filter Button if active */}
            {activeFiltersCount > 0 && (
              <button
                type="button"
                onClick={clearAllFilters}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-[var(--ui-radius-small)] border border-rose-200 transition-all cursor-pointer"
                title="Reset Semua Filter"
              >
                <RotateCcw size={11} />
                <span>Reset ({activeFiltersCount})</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── 3. Active Date Selection Filter Banner ── */}
      {selectedDate && (
        <div className="ui-card p-3 sm:p-3.5 rounded-[var(--ui-radius-card)] bg-emerald-50/90 border border-emerald-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
            <div>
              <p className="text-xs sm:text-sm font-black text-emerald-950">
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
                className="px-2.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-[var(--ui-radius-small)] text-xs font-black shadow-2xs cursor-pointer inline-flex items-center gap-1.5 transition-all"
              >
                <Plus size={13} strokeWidth={2.5} />
                <span>Tambah di Tanggal Ini</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setSelectedDate(null)}
              className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-[var(--ui-radius-small)] text-xs font-bold shadow-2xs cursor-pointer inline-flex items-center gap-1 transition-all"
            >
              <X size={13} />
              <span>Tutup Filter</span>
            </button>
          </div>
        </div>
      )}

      {/* ── 4. Main Layout Grid (Agenda List in 1 Unified Box & Sidebar Calendar) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* Left / Main Column: Agenda List in 1 Unified Box */}
        <div className={`
          lg:col-span-7 xl:col-span-8
          ${mobileTab === 'calendar' ? 'hidden lg:block' : 'block'}
        `}>
          <div className="ui-card rounded-[var(--ui-radius-card)] bg-white border border-slate-200/80 shadow-xs overflow-hidden flex flex-col">
            
            {/* Unified Box Header with Integrated Category Filter */}
            <div className="p-3 sm:px-4 sm:py-3 bg-slate-50/80 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
                  Daftar Kegiatan ({filteredCalendar.length})
                </span>
                {selectedCategory !== "all" && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--ui-primary)]/10 text-[var(--ui-primary)] border border-[var(--ui-primary)]/20">
                    {calendarCategories.find(c => c.id === selectedCategory)?.name}
                  </span>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                {/* Category Dropdown Filter right in Box Header */}
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-2.5 py-1 text-xs font-bold text-slate-700 bg-white border border-slate-200/80 rounded-[var(--ui-radius-small)] shadow-2xs focus:outline-none focus:border-[var(--ui-primary)] cursor-pointer"
                  title="Filter berdasarkan kategori kegiatan"
                >
                  <option value="all">Semua Kategori</option>
                  {calendarCategories.map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
                
                <span className="text-[11px] font-semibold text-slate-400 hidden sm:inline">
                  Urutan tanggal
                </span>
              </div>
            </div>

            {/* Agenda List Items Container (1 Unified Box) */}
            {filteredCalendar.length === 0 ? (
              <div className="p-10 sm:p-14 text-center flex flex-col items-center justify-center">
                <div className="w-14 h-14 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-300 mb-3 shadow-inner">
                  <CalendarDays size={28} />
                </div>
                <h3 className="text-sm font-black text-slate-700">
                  Tidak ada agenda yang cocok
                </h3>
                <p className="text-xs font-medium text-slate-500 mt-1 max-w-sm">
                  {activeFiltersCount > 0
                    ? "Coba sesuaikan kata kunci pencarian atau bersihkan filter tanggal/kategori yang aktif."
                    : "Belum ada agenda akademik yang terdaftar. Anda dapat menambahkan agenda baru sekarang."}
                </p>
                
                <div className="flex items-center gap-2 mt-4">
                  {activeFiltersCount > 0 && (
                    <button
                      type="button"
                      onClick={clearAllFilters}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-[var(--ui-radius-small)] text-xs font-bold transition-all cursor-pointer"
                    >
                      Reset Filter
                    </button>
                  )}
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => handleAddNewOnDate(selectedDate || todayStr)}
                      className="px-3.5 py-1.5 bg-[var(--ui-primary)] hover:opacity-90 text-white rounded-[var(--ui-radius-small)] text-xs font-black shadow-xs transition-all cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <Plus size={13} strokeWidth={2.5} />
                      <span>Tambah Agenda Baru</span>
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredCalendar.map((evt, index) => {
                  const cat = calendarCategories.find((c) => c.id === evt.categoryId);
                  const colors = getCategoryColor(cat?.color);
                  const status = getEventStatus(evt.dateStart, evt.dateEnd);
                  const isPast = status.type === 'past';

                  return (
                    <div
                      key={evt.id}
                      className={`p-3 sm:px-4 sm:py-3 hover:bg-slate-50/80 transition-colors flex items-start justify-between gap-3 group ${isPast ? 'bg-slate-50/30' : ''}`}
                    >
                      <div className="flex items-start gap-2.5 flex-1 min-w-0">
                        <div className={`text-[12.5px] font-black shrink-0 min-w-[20px] pt-[2px] ${isPast ? 'text-slate-300' : 'text-slate-400'}`}>
                          {index + 1}.
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2 mb-0.5">
                            <h3 className={`text-[13px] font-black truncate transition-colors ${isPast ? 'text-slate-600' : 'text-slate-800 group-hover:text-[var(--ui-primary)]'}`}>
                              {evt.title}
                            </h3>

                            {/* Status Penanda: Terlaksana / Hari Ini / Mendatang */}
                            {isPast && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-black bg-slate-100 text-slate-500 border border-slate-200/80 shrink-0">
                                <Check size={10} className="stroke-[3] text-slate-400" />
                                Terlaksana
                              </span>
                            )}
                            {status.isToday && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200 shrink-0">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                Hari Ini
                              </span>
                            )}
                            {!isPast && !status.isToday && status.type === 'upcoming' && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-sky-50 text-sky-700 border border-sky-200/80 shrink-0">
                                <Clock size={10} className="text-sky-500" />
                                {status.label}
                              </span>
                            )}

                            {/* Tanggal Badge */}
                            <div className="flex items-center gap-1 text-[9.5px] font-bold text-slate-500 bg-slate-100/80 px-2 py-0.5 rounded border border-slate-200/60 w-fit shrink-0">
                              <Calendar size={10} className="text-slate-400 shrink-0" />
                              <span className="truncate">{formatDateRangeText(evt.dateStart, evt.dateEnd)}</span>
                            </div>
                          </div>
                          {evt.description && (
                            <p className={`text-[11px] font-medium line-clamp-1 leading-relaxed ${isPast ? 'text-slate-400' : 'text-slate-500'}`}>
                              {evt.description}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[9px] font-bold uppercase tracking-wider ${colors.lightBg}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${colors.dot}`}></span>
                          {cat?.name || "Umum"}
                        </span>
                        {canEdit && (
                          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              type="button"
                              onClick={() => openModal("event_kalender", "edit", evt)}
                              className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-all cursor-pointer"
                              title="Edit Agenda"
                            >
                              <Edit2 size={12} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveCalendarEventSafe(evt.id)}
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-all cursor-pointer"
                              title="Hapus Agenda"
                            >
                              <Trash2 size={12} />
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
        </div>

        {/* Right Column: Interactive Monthly Calendar Grid & Interactive Legend */}
        <div className={`
          lg:col-span-5 xl:col-span-4
          ${mobileTab === 'list' ? 'hidden lg:block' : 'block'}
          flex flex-col gap-4 sticky top-4
        `}>
          <div className="ui-card p-3.5 sm:p-4 rounded-[var(--ui-radius-card)] bg-white border border-slate-200/80 shadow-xs flex flex-col gap-3">
            
            {/* Calendar Navigation Header */}
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-black text-slate-800 uppercase tracking-wider">
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
                  className="px-2 py-1 text-[10px] font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-[var(--ui-radius-small)] border border-slate-200 shadow-2xs transition-all cursor-pointer mr-0.5"
                  title="Kembali ke Hari Ini"
                >
                  Hari Ini
                </button>

                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="p-1 text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 rounded-[var(--ui-radius-small)] border border-slate-200 transition-all cursor-pointer"
                  title="Bulan Sebelumnya"
                >
                  <ChevronLeft size={14} />
                </button>

                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="p-1 text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 rounded-[var(--ui-radius-small)] border border-slate-200 transition-all cursor-pointer"
                  title="Bulan Berikutnya"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>

            {/* Quick helper tip */}
            <p className="text-[10.5px] font-medium text-slate-400 flex items-center gap-1.5">
              <CalendarCheck size={12} className="text-slate-400 shrink-0" />
              <span>Klik tanggal untuk memfilter agenda kegiatan.</span>
            </p>

            {/* Calendar Table Grid */}
            <div className="overflow-hidden border border-slate-200/80 rounded-[var(--ui-radius-small)] bg-white shadow-2xs">
              
              {/* Day Name Headers */}
              <div className="grid grid-cols-7 border-b border-slate-200/80 bg-slate-50/90 text-center font-black text-[9.5px] py-1.5 uppercase tracking-wider">
                <div className="text-rose-500">Min</div>
                <div className="text-slate-600">Sen</div>
                <div className="text-slate-600">Sel</div>
                <div className="text-slate-600">Rab</div>
                <div className="text-slate-600">Kam</div>
                <div className="text-slate-600">Jum</div>
                <div className="text-slate-600">Sab</div>
              </div>

              {/* Day Number Cells */}
              <div className="grid grid-cols-7 bg-slate-200/50 gap-[1px]">
                {calendarCells.map((dayNum, idx) => {
                  if (dayNum === null) {
                    return <div key={`empty-${idx}`} className="bg-slate-50/40 p-1 min-h-[46px] sm:min-h-[50px]"></div>;
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
                        p-1 sm:p-1.5 min-h-[46px] sm:min-h-[50px] flex flex-col justify-between cursor-pointer transition-all select-none relative
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
                          text-[11px] font-extrabold inline-flex items-center justify-center
                          ${isTodayCell 
                            ? 'w-4.5 h-4.5 rounded-full bg-[var(--ui-primary)] text-white shadow-xs font-black text-[10px]' 
                            : isSunday ? 'text-rose-600' : 'text-slate-800'}
                        `}>
                          {dayNum}
                        </span>

                        {dayEvents.length > 1 && (
                          <span className="text-[8px] font-black text-slate-500 bg-white/80 px-1 rounded-full border border-slate-200/60">
                            +{dayEvents.length}
                          </span>
                        )}
                      </div>

                      {/* Event Snippet Preview in Cell */}
                      {dayEvents.length > 0 && (
                        <div className="mt-0.5 flex flex-col gap-0.5">
                          <div className={`text-[7px] font-black uppercase tracking-tight truncate px-1 py-0.5 rounded-[var(--ui-radius-small)] ${eventBadgeColor} shadow-2xs`}>
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
            <div className="pt-2.5 border-t border-slate-100 flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[9.5px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                  <Tag size={11} />
                  Legenda Kategori
                </span>
                {selectedCategory !== "all" && (
                  <button
                    type="button"
                    onClick={() => setSelectedCategory("all")}
                    className="text-[9.5px] font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
                  >
                    Tampilkan Semua
                  </button>
                )}
              </div>

              <div className="flex flex-wrap gap-1">
                {calendarCategories.map(cat => {
                  const colors = getCategoryColor(cat.color);
                  const isSelected = selectedCategory === cat.id;

                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCategory(prev => prev === cat.id ? "all" : cat.id)}
                      className={`
                        inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold border transition-all cursor-pointer
                        ${isSelected 
                          ? `${colors.bg} shadow-xs ring-2 ring-offset-1 ring-slate-400` 
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
