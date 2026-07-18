import { Button } from '../../../components/ui.jsx';
import React from'react';
import { CalendarDays } from'lucide-react';
import { Search, BookOpen, FileDown, Upload, List, Plus, Calendar, Edit2, Trash2, ChevronLeft, ChevronRight } from'lucide-react';
import { PageHeader } from '../../../components/monitoring/ui/index.js';
;


export default function TabAkademik(props) {
  const [currentMonth, setCurrentMonth] = React.useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = React.useState(new Date().getFullYear());
  
  const [selectStart, setSelectStart] = React.useState(null);
  const [selectEnd, setSelectEnd] = React.useState(null);

  const normalizeText = (value) => String(value ??"").trim().replace(/\s+/g,"").toLowerCase();

  React.useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key ==="Escape") {
        setSelectStart(null);
        setSelectEnd(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const { academicCalendar, calendarSearchTerm, calendarCategories, setCalendarSearchTerm, openAcademicCalendarGuide, downloadMasterTemplate, openModal, setActiveTab, formatCalendarDateRange, handleRemoveCalendarEventSafe, setFormData } = props;

  const todayDate = new Date();
  todayDate.setHours(0, 0, 0, 0);
  
  const sortedCalendar = [...academicCalendar].sort(
    (a, b) => new Date(a.dateStart) - new Date(b.dateStart)
  );

  const filteredCalendar = sortedCalendar.filter((evt) => {
    if (!calendarSearchTerm.trim()) return true;
    const catName =
      calendarCategories.find((cat) => cat.id === evt.categoryId)?.name ||"";
    return normalizeText(
      `${evt.title ||""} ${evt.description ||""} ${catName} ${evt.dateStart ||""} ${evt.dateEnd ||""}`
    ).includes(normalizeText(calendarSearchTerm));
  });

  const upcomingCalendar = sortedCalendar
    .filter((evt) => {
      const endDate = new Date(
        `${(evt.dateEnd || evt.dateStart ||"").slice(0, 10)}T23:59:59`
      );
      return !Number.isNaN(endDate.getTime()) && endDate >= todayDate;
    })
    .slice(0, 3);

  const startOfMonth = new Date(currentYear, currentMonth, 1);
  const endOfMonth = new Date(currentYear, currentMonth + 1, 0);

  const thisMonthEvents = sortedCalendar.filter((evt) => {
    const startDate = new Date(
      `${(evt.dateStart ||"").slice(0, 10)}T00:00:00`
    );
    const endDate = new Date(
      `${(evt.dateEnd || evt.dateStart ||"").slice(0, 10)}T23:59:59`
    );
    return (
      !Number.isNaN(startDate.getTime()) &&
      !Number.isNaN(endDate.getTime()) &&
      startDate <= endOfMonth &&
      endDate >= startOfMonth
    );
  });

  const monthNames = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"
  ];

  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
  const daysInCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  const calendarCells = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    calendarCells.push(null);
  }
  for (let d = 1; d <= daysInCurrentMonth; d++) {
    calendarCells.push(d);
  }

  const getCategoryColor = (catColor) => {
    switch (catColor) {
      case"rose":
      case"red":
        return { bg:"bg-red-500 text-white", border:"border-red-600", lightBg:"bg-red-100/90 text-red-800" };
      case"amber":
      case"orange":
        return { bg:"bg-amber-500 text-white", border:"border-amber-600", lightBg:"bg-amber-100/90 text-amber-800" };
      case"yellow":
        return { bg:"bg-yellow-400 text-slate-800", border:"border-yellow-500", lightBg:"bg-yellow-100 text-yellow-800" };
      case"emerald":
      case"green":
        return { bg:"bg-emerald-500 text-white", border:"border-emerald-600", lightBg:"bg-emerald-100/90 text-emerald-800" };
      case"blue":
      case"sky":
        return { bg:"bg-[var(--ui-primary)] text-white", border:"border-blue-600", lightBg:"bg-blue-100/90 text-blue-800" };
      case"purple":
        return { bg:"bg-purple-500 text-white", border:"border-purple-600", lightBg:"bg-purple-100/90 text-purple-800" };
      default:
        return { bg:"bg-slate-500 text-white", border:"border-slate-600", lightBg:"bg-slate-100 text-slate-800" };
    }
  };

  return (
    <div className="flex flex-col gap-6 h-full w-full animate-in fade-in duration-300 relative z-10">
      <PageHeader
        title="Kalender Akademik"
        description="Atur dan kelola agenda kegiatan sekolah. Tambah manual atau import langsung dari Excel."
        icon={CalendarDays}
      >
        <div className="flex items-center gap-2 bg-white/10 px-3 py-1 rounded-[var(--ui-radius-small)] backdrop-blur-sm border border-white/10">
          <div className="flex items-center gap-1.5 border-r border-white/10 pr-2.5">
            <span className="text-[9px] font-black uppercase tracking-wider text-white/70">
              Total Agenda:
            </span>
            <span className="text-xs font-black text-white bg-white/15 px-1.5 py-0.5 rounded-[var(--ui-radius-small)]">
              {academicCalendar.length}
            </span>
          </div>
          <div className="flex items-center gap-1.5 border-r border-white/10 pr-2.5">
            <span className="text-[9px] font-black uppercase tracking-wider text-emerald-300">
              Mendatang:
            </span>
            <span className="text-xs font-black text-emerald-400 bg-emerald-500/15 px-1.5 py-0.5 rounded-[var(--ui-radius-small)]">
              {upcomingCalendar.length}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] font-black uppercase tracking-wider text-amber-300">
              Bulan Ini:
            </span>
            <span className="text-xs font-black text-amber-400 bg-amber-500/15 px-1.5 py-0.5 rounded-[var(--ui-radius-small)]">
              {thisMonthEvents.length}
            </span>
          </div>
        </div>
      </PageHeader>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        {/* Left Column: Agenda List & Filters */}
        <div className="xl:col-span-2 ui-card p-5 md:p-6 flex flex-col gap-5">
          {/* Actions & Search */}
          <div className="flex flex-col lg:flex-row gap-3 lg:items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                value={calendarSearchTerm}
                onChange={(e) => setCalendarSearchTerm(e.target.value)}
                className="w-full border-none rounded-[var(--ui-radius-small)] bg-slate-50 pl-10 pr-4 py-2.5 text-sm font-bold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-[var(--ui-primary)] shadow-sm transition-all"
                placeholder="Cari judul, kategori, atau tanggal..."
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline"
                onClick={openAcademicCalendarGuide}
               ><BookOpen size={14} className="mr-1.5 inline" /> Panduan</Button>
              <Button variant="outline"
                onClick={downloadMasterTemplate}
               ><FileDown size={14} className="mr-1.5 inline" /> Template</Button>
              <Button variant="outline"
                onClick={() =>openModal("bulk","add")}
                
              >
                <Upload size={14} className="mr-1.5 inline" /> Import</Button>
              <Button variant="outline"
                onClick={() =>setActiveTab("kategori_kalender")}
                
              >
                <List size={14} className="mr-1.5 inline" /> Kategori</Button>
              <Button variant="outline"
                onClick={() =>{
                  setFormData({
                    title:"",
                    categoryId: calendarCategories[0]?.id ||"",
                    dateStart: new Date().toISOString().split("T")[0],
                    dateEnd: new Date().toISOString().split("T")[0],
                    description:""
                  });
                  openModal("event_kalender","add");
                }}
                
              >
                <Plus size={14} className="mr-1.5 inline" /> Tambah Agenda</Button>
            </div>
          </div>

          <div className="bg-slate-50/50 border-none rounded-[var(--ui-radius-small)] p-4 sm:p-6 min-h-[400px] overflow-y-auto custom-scrollbar">
            {filteredCalendar.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-16">
                <div className="w-16 h-16 bg-white border-none text-slate-300 rounded-[var(--ui-radius-small)] flex items-center justify-center mb-4 shadow-sm">
                  <CalendarDays size={28} />
                </div>
                <h3 className="text-lg font-black text-slate-700">
                  Tidak ada agenda
                </h3>
                <p className="text-sm font-medium text-slate-500 mt-2 max-w-sm">
                  {calendarSearchTerm.trim()
                    ?"Coba kata kunci lain atau hapus filter pencarian."
                    :"Belum ada agenda akademik yang ditambahkan. Mulai dengan menambah agenda baru."}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredCalendar.map((evt) => {
                  const cat = calendarCategories.find(
                    (c) => c.id === evt.categoryId
                  );
                  const isUpcoming =
                    new Date(
                      `${(evt.dateStart ||"").slice(0, 10)}T00:00:00`
                    ) >= new Date(new Date().setHours(0, 0, 0, 0));

                  const colors = getCategoryColor(cat?.color);

                  return (
                    <div
                      key={evt.id}
                      className="group relative bg-white border-none rounded-[var(--ui-radius-card)] p-5 hover:shadow-md hover:border-slate-350 transition-all flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <span
                            className={`px-2.5 py-1 rounded-[var(--ui-radius-small)] border text-[9px] font-black uppercase tracking-widest ${colors.lightBg}`}
                          >
                            {cat?.name ||"Tanpa Kategori"}
                          </span>
                          {isUpcoming && (
                            <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20"></span>
                          )}
                        </div>

                        <h3 className="text-sm font-black text-slate-800 leading-tight line-clamp-2">
                          {evt.title}
                        </h3>
                        <p className="text-xs font-medium text-slate-500 mt-2 line-clamp-3">
                          {evt.description ||"Tidak ada deskripsi rinci."}
                        </p>
                      </div>

                      <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-600 bg-slate-50 px-2 py-1 rounded-[var(--ui-radius-small)] border-none">
                          <Calendar size={12} className="text-slate-400" />
                          {formatCalendarDateRange(
                            evt.dateStart,
                            evt.dateEnd
                          )}
                        </div>

                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="outline"
                            onClick={() =>openModal("event_kalender","edit", evt)
                            }
                            
                          >
                            <Edit2 size={14} /></Button>
                          <Button variant="outline"
                            onClick={() =>handleRemoveCalendarEventSafe(evt.id)
                            }
                            
                          >
                            <Trash2 size={14} /></Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Interactive Monthly Calendar Grid */}
        <div className="ui-card p-5 md:p-6 flex flex-col gap-4 bg-white border border-slate-200/60 shadow-sm rounded-[var(--ui-radius-card)]">
          {/* Calendar Header with Navigation */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <Button variant="outline"
              type="button"
              onClick={() =>{
                if (currentMonth === 0) {
                  setCurrentMonth(11);
                  setCurrentYear((prev) => prev - 1);
                } else {
                  setCurrentMonth((prev) => prev - 1);
                }
              }}
              
            >
              <ChevronLeft size={16} /></Button>
            <span className="text-xs font-black text-slate-800 uppercase tracking-widest">
              {monthNames[currentMonth]} {currentYear}
            </span>
            <Button variant="outline"
              type="button"
              onClick={() =>{
                if (currentMonth === 11) {
                  setCurrentMonth(0);
                  setCurrentYear((prev) => prev + 1);
                } else {
                  setCurrentMonth((prev) => prev + 1);
                }
              }}
              
            >
              <ChevronRight size={16} /></Button>
          </div>

          {selectStart && (
            <div className="bg-amber-50 border border-amber-100 rounded-lg p-2.5 flex items-center justify-between text-xs font-bold text-amber-800 animate-in fade-in duration-200">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping"></span>
                Pilih tanggal akhir range kegiatan
              </span>
              <Button variant="outline" 
                type="button"
                onClick={() =>{ setSelectStart(null); setSelectEnd(null); }} 
                className="cursor-pointer"
              >
                Batal</Button>
            </div>
          )}

          {/* Grid Layout */}
          <div className="overflow-hidden border border-slate-150 rounded-[var(--ui-radius-small)] bg-white shadow-xs">
            {/* Days of Week Header */}
            <div className="grid grid-cols-7 border-b border-slate-150 bg-slate-50/70 text-center font-bold text-[10px] text-slate-500 py-2 uppercase tracking-wider">
              <div className="text-red-500">Min</div>
              <div>Sen</div>
              <div>Sel</div>
              <div>Rab</div>
              <div>Kam</div>
              <div>Jum</div>
              <div>Sab</div>
            </div>

            {/* Grid Cells */}
            <div className="grid grid-cols-7 bg-slate-150 gap-[1px]">
              {calendarCells.map((dayNum, idx) => {
                if (dayNum === null) {
                  return <div key={`empty-${idx}`} className="bg-slate-50/40 p-2 min-h-[48px]"></div>;
                }

                const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2,'0')}-${String(dayNum).padStart(2,'0')}`;

                // Find events matching this day
                const dayEvents = sortedCalendar.filter((evt) => {
                  const start = evt.dateStart;
                  const end = evt.dateEnd || evt.dateStart;
                  return dateStr >= start && dateStr <= end;
                });

                // Check if in active range selection
                let isSelectedRange = false;
                if (selectStart && selectEnd) {
                  const minSel = selectStart < selectEnd ? selectStart : selectEnd;
                  const maxSel = selectStart > selectEnd ? selectStart : selectEnd;
                  isSelectedRange = dateStr >= minSel && dateStr <= maxSel;
                }

                const dayOfWeek = idx % 7;
                const isSunday = dayOfWeek === 0;

                let cellBg ="bg-white";
                let textClass = isSunday ?"text-red-500 font-bold" :"text-slate-800 font-semibold";
                let tooltip ="";
                let roundingClass ="rounded-none";

                if (dayEvents.length > 0) {
                  const firstEvt = dayEvents[0];
                  const cat = calendarCategories.find((c) => c.id === firstEvt.categoryId);
                  const colors = getCategoryColor(cat?.color);

                  cellBg = colors.lightBg;
                  tooltip = dayEvents.map((e) => e.title).join(",");

                  // Calculate start/end segment to draw continuous horizontal blocks exactly like in the user's reference
                  const startStr = firstEvt.dateStart;
                  const endStr = firstEvt.dateEnd || firstEvt.dateStart;
                  const isStart = dateStr === startStr;
                  const isEnd = dateStr === endStr;

                  if (isStart && isEnd) {
                    roundingClass ="rounded-[var(--ui-radius-small)]";
                  } else if (isStart) {
                    roundingClass ="rounded-l-[var(--ui-radius-small)]";
                  } else if (isEnd) {
                    roundingClass ="rounded-r-[var(--ui-radius-small)]";
                  }
                }

                return (
                  <div
                    key={dayNum}
                    onClick={() => {
                      if (selectStart) {
                        const minDate = selectStart < dateStr ? selectStart : dateStr;
                        const maxDate = selectStart > dateStr ? selectStart : dateStr;
                        setFormData({
                          title:"",
                          categoryId: calendarCategories[0]?.id ||"",
                          dateStart: minDate,
                          dateEnd: maxDate,
                          description:""
                        });
                        openModal("event_kalender","add");
                        setSelectStart(null);
                        setSelectEnd(null);
                      } else {
                        if (dayEvents.length > 0) {
                          openModal("event_kalender","edit", dayEvents[0]);
                        } else {
                          setSelectStart(dateStr);
                          setSelectEnd(dateStr);
                        }
                      }
                    }}
                    onMouseEnter={() => {
                      if (selectStart) {
                        setSelectEnd(dateStr);
                      }
                    }}
                    title={tooltip || (selectStart ?"Klik untuk memilih batas akhir range" :"Klik untuk pilih awal range tanggal")}
                    className={`p-2 min-h-[48px] flex flex-col justify-between hover:bg-slate-50 cursor-pointer transition-colors relative select-none ${cellBg} ${roundingClass} ${isSelectedRange ?'outline outline-2 outline-offset-[-2px] outline-red-500 z-20 bg-red-50/10' :''}`}
                  >
                    <span className={`text-xs ${textClass}`}>{dayNum}</span>
                    {dayEvents.length > 0 && (
                      <div className="w-full text-[7px] font-black uppercase tracking-wide truncate opacity-85 mt-1 block">
                        {dayEvents[0].title}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          
          {/* Legend helper */}
          <div className="mt-2 pt-2 border-t border-slate-100">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Legenda Kategori</span>
            <div className="flex flex-wrap gap-2">
              {calendarCategories.map(cat => {
                const colors = getCategoryColor(cat.color);
                return (
                  <span key={cat.id} className={`px-2 py-0.5 rounded-[var(--ui-radius-small)] text-[9px] font-bold border ${colors.lightBg}`}>
                    {cat.name}
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
