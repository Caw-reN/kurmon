import { useState, useEffect, useCallback } from'react';
import useAuthStore from'../../../store/monitoring/authStore';
import { useAppStore } from'../../../store/useAppStore.js';
import { ShieldCheck, RefreshCw, CheckCircle2, Clock, Calendar, AlertCircle } from'lucide-react';
import { CustomSelect } from'../../../components/CustomSelect.jsx';


/**
 * student/Absensi.jsx
 * Halaman Check-in Absensi siswa.
 * ADAPTIVE: Menampilkan metode input berdasarkan setting Zustand Admin.
 * Mobile-optimized.
 */






// ──────────────────────────────────────────
// Sub-component: GPS Location Card
// ──────────────────────────────────────────
const StudentAbsensi = () => {
  const { user } = useAuthStore();
  const authToken = user?.authToken;

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [daysInMonth, setDaysInMonth] = useState(31);
  const [filter, setFilter] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
  });

  const academicCalendarRaw = useAppStore(state => state.academicCalendar);
  const calendarCategoriesRaw = useAppStore(state => state.calendarCategories);
  const academicCalendar = academicCalendarRaw || [];
  const calendarCategories = calendarCategoriesRaw || [];

  const months = [
    { value: 1, label:"Januari" },
    { value: 2, label:"Februari" },
    { value: 3, label:"Maret" },
    { value: 4, label:"April" },
    { value: 5, label:"Mei" },
    { value: 6, label:"Juni" },
    { value: 7, label:"Juli" },
    { value: 8, label:"Agustus" },
    { value: 9, label:"September" },
    { value: 10, label:"Oktober" },
    { value: 11, label:"November" },
    { value: 12, label:"Desember" }
  ];

  const years = Array.from({ length: 5 }, (_, i) => ({
    value: new Date().getFullYear() - 2 + i,
    label: String(new Date().getFullYear() - 2 + i)
  }));

  const fetchData = useCallback(async () => {
    if (!authToken) return;
    setLoading(true);
    try {
      const res = await fetch("/api/hikvision/report/matrix", {
        method:'POST',
        headers: {"Authorization": `Bearer ${authToken}`,"Content-Type":"application/json"
        },
        body: JSON.stringify({ ...filter, type:'siswa', className:'all' })
      });
      const json = await res.json();
      if (json.ok && Array.isArray(json.data)) {
        const studentNis = String(user?.username ||"").trim().toLowerCase();
        const record = json.data.find(item => 
          String(item.nis).trim().toLowerCase() === studentNis
        );
        setData(record || {
          nis: user?.username,
          name: user?.name ||"Siswa",
          class_name:"siswa",
          total_hadir: 0,
          total_terlambat: 0,
          total_izin: 0,
          total_sakit: 0,
          total_alpa: 0,
          days: {}
        });
        setDaysInMonth(json.daysInMonth || 31);
      }
    } catch (err) {
      console.error("Gagal memuat absensi fingerprint siswa:", err);
    }
    setLoading(false);
  }, [authToken, filter, user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getDayName = (dayNum) => {
    try {
      const date = new Date(filter.year, filter.month - 1, dayNum);
      return date.toLocaleDateString('id-ID', { weekday:'long' });
    } catch {
      return'';
    }
  };

  // Get index of the first day of the month (0 = Sunday, 1 = Monday, etc.)
  const firstDayIndex = new Date(filter.year, filter.month - 1, 1).getDay();

  // Calculate personal metrics safely
  const totalHadir = data ? Object.values(data.days).filter(d => d.in && d.in !=="Izin" && d.in !=="Sakit" && d.in !=="Alpa" && d.in !=="Dinas Luar" && !d.isLate).length : 0;
  const totalTerlambat = data ? Object.values(data.days).filter(d => d.isLate).length : 0;
  const totalIzinSakit = data ? Object.values(data.days).filter(d => ["Izin","Sakit","Dinas Luar"].includes(d.in)).length : 0;
  const totalAlpa = data ? Object.values(data.days).filter(d => d.in ==="Alpa").length : 0;

  return (
    <div className="space-y-5 w-full p-4 md:p-6 animate-in fade-in slide-in-from-bottom-4 duration-300 max-w-3xl mx-auto">
      
      {/* Header Info */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-4 md:p-6 rounded-[var(--ui-radius-card)] shadow-sm border border-slate-100">
        <div className="min-w-0 flex-1">
          <h2 className="text-base md:text-xl font-black text-slate-800 flex items-center gap-2 truncate">
            <ShieldCheck className="text-emerald-500 shrink-0" size={20} />
            <span className="truncate">Riwayat Absensi Fingerprint Siswa</span>
          </h2>
          <p className="text-[11px] md:text-sm text-slate-500 font-semibold mt-1 leading-normal">
            Data kehadiran ditarik langsung dari mesin fingerprint sekolah.
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
          <div className="flex-1 sm:w-40 min-w-0">
            <CustomSelect
              value={filter.month}
              options={months}
              onChange={(val) => setFilter(prev => ({ ...prev, month: Number(val) }))}
            />
          </div>
          <div className="w-24 sm:w-28 min-w-0">
            <CustomSelect
              value={filter.year}
              options={years}
              onChange={(val) => setFilter(prev => ({ ...prev, year: Number(val) }))}
            />
          </div>
          <Button variant="ghost" size="icon"
            onClick={fetchData}
            className="shrink-0"
            title="Muat Ulang"
          >
            <RefreshCw size={16} className={loading ?"animate-spin" :""} />
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-white p-3 rounded-[var(--ui-radius-card)] border border-slate-100 shadow-sm flex flex-col justify-between h-20 md:h-24 md:p-5">
          <div className="flex items-center justify-between">
            <span className="text-[9px] md:text-[10px] font-black uppercase tracking-wider text-slate-400 truncate">Tepat Waktu</span>
            <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
          </div>
          <div>
            <h4 className="text-lg md:text-2xl font-black text-emerald-600 leading-none">
              {totalHadir} <span className="text-xs font-bold text-slate-400">Hari</span>
            </h4>
          </div>
        </div>

        <div className="bg-white p-3 rounded-[var(--ui-radius-card)] border border-slate-100 shadow-sm flex flex-col justify-between h-20 md:h-24 md:p-5">
          <div className="flex items-center justify-between">
            <span className="text-[9px] md:text-[10px] font-black uppercase tracking-wider text-slate-400 truncate">Terlambat</span>
            <Clock size={16} className="text-amber-500 shrink-0" />
          </div>
          <div>
            <h4 className="text-lg md:text-2xl font-black text-amber-600 leading-none">
              {totalTerlambat} <span className="text-xs font-bold text-slate-400">Kali</span>
            </h4>
          </div>
        </div>

        <div className="bg-white p-3 rounded-[var(--ui-radius-card)] border border-slate-100 shadow-sm flex flex-col justify-between h-20 md:h-24 md:p-5">
          <div className="flex items-center justify-between">
            <span className="text-[9px] md:text-[10px] font-black uppercase tracking-wider text-slate-400 truncate">Izin / Sakit</span>
            <Calendar size={16} className="text-blue-500 shrink-0" />
          </div>
          <div>
            <h4 className="text-lg md:text-2xl font-black text-blue-600 leading-none">
              {totalIzinSakit} <span className="text-xs font-bold text-slate-400">Hari</span>
            </h4>
          </div>
        </div>

        <div className="bg-white p-3 rounded-[var(--ui-radius-card)] border border-slate-100 shadow-sm flex flex-col justify-between h-20 md:h-24 md:p-5">
          <div className="flex items-center justify-between">
            <span className="text-[9px] md:text-[10px] font-black uppercase tracking-wider text-slate-400 truncate">Alpa</span>
            <AlertCircle size={16} className="text-red-500 shrink-0" />
          </div>
          <div>
            <h4 className="text-lg md:text-2xl font-black text-red-600 leading-none">
              {totalAlpa} <span className="text-xs font-bold text-slate-400">Hari</span>
            </h4>
          </div>
        </div>
      </div>

      {/* Calendar Grid Container */}
      <div className="bg-white rounded-[var(--ui-radius-card)] border border-slate-100 shadow-sm overflow-hidden p-3 md:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3 border-slate-100">
          <h3 className="text-sm font-bold text-slate-800">Kalender Absensi Bulan {months.find(m => m.value === filter.month)?.label} {filter.year}</h3>
          <span className="text-[10px] font-extrabold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full uppercase tracking-wider self-start sm:self-auto truncate max-w-full">
            {user?.name ||"SISWA"} ({user?.username})
          </span>
        </div>

        {loading ? (
          <div className="p-20 text-center text-slate-400 font-bold flex flex-col items-center justify-center gap-3">
            <RefreshCw className="animate-spin text-slate-300" size={32} />
            <span>Menarik data fingerprint...</span>
          </div>
        ) : (
          <div className="space-y-2.5">
            {/* Days of Week Headers */}
            <div className="grid grid-cols-7 gap-1 md:gap-2 text-center border-b border-slate-50 pb-2">
              {["Min","Sen","Sel","Rab","Kam","Jum","Sab"].map((d, idx) => (
                <div key={d} className={`text-[10px] md:text-xs font-black uppercase py-1 ${idx === 0 || idx === 6 ?'text-rose-500' :'text-slate-400'}`}>
                  {d}
                </div>
              ))}
            </div>

            {/* Calendar Grid Cells */}
            <div className="grid grid-cols-7 gap-1 md:gap-2">
              {/* Empty placeholder cells for offset */}
              {Array.from({ length: firstDayIndex }).map((_, idx) => (
                <div 
                  key={`empty-${idx}`} 
                  className="bg-slate-50/20 rounded-lg aspect-square md:aspect-[1.15] border border-dashed border-slate-100"
                />
              ))}

              {/* Day cells */}
              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(dayNum => {
                const dayName = getDayName(dayNum);
                const log = data?.days?.[dayNum];
                const hasScan = log && (log.in || log.out);

                const today = new Date();
                const isFutureDay = 
                  filter.year > today.getFullYear() || 
                  (filter.year === today.getFullYear() && filter.month > today.getMonth() + 1) || 
                  (filter.year === today.getFullYear() && filter.month === today.getMonth() + 1 && dayNum > today.getDate());
                
                const isToday = 
                  filter.year === today.getFullYear() && 
                  filter.month === today.getMonth() + 1 && 
                  dayNum === today.getDate();

                const checkDateStr = `${filter.year}-${String(filter.month).padStart(2,"0")}-${String(dayNum).padStart(2,"0")}`;
                const isHoliday = academicCalendar.some(evt => {
                  const start = evt.dateStart;
                  const end = evt.dateEnd || evt.dateStart;
                  if (checkDateStr >= start && checkDateStr <= end) {
                    const cat = calendarCategories.find(c => c.id === evt.categoryId);
                    const catName = cat ? String(cat.name).toLowerCase() :"";
                    const title = String(evt.title).toLowerCase();
                    return catName.includes("libur") || title.includes("libur");
                  }
                  return false;
                });

                let cardClass ="bg-white border-slate-100 hover:border-slate-300";
                let statusDotClass ="bg-slate-200";
                let statusText ="";
                let isWeekend = dayName ==="Sabtu" || dayName ==="Minggu";

                if (hasScan) {
                  if (["Izin","Sakit","Dinas Luar","Alpa"].includes(log.in)) {
                    statusText = log.in;
                    cardClass = log.in ==="Alpa" ?"bg-red-50/60 border-red-100 text-red-800" :"bg-blue-50/60 border-blue-100 text-blue-800";
                    statusDotClass = log.in ==="Alpa" ?"bg-red-500" :"bg-blue-500";
                  } else {
                    statusText = log.isLate ?"Terlambat" :"Hadir";
                    cardClass = log.isLate ?"bg-amber-50/60 border-amber-100 text-amber-800" :"bg-emerald-50/60 border-emerald-100 text-emerald-800";
                    statusDotClass = log.isLate ?"bg-amber-500" :"bg-emerald-500";
                  }
                } else if (isFutureDay) {
                  statusText ="-";
                  cardClass ="bg-slate-50/30 border-slate-100 text-slate-300";
                  statusDotClass ="bg-slate-100";
                } else if (isToday) {
                  statusText ="Belum Absen";
                  cardClass ="bg-white border-slate-200 text-slate-400";
                  statusDotClass ="bg-slate-300";
                } else if (isWeekend || isHoliday) {
                  statusText ="Libur";
                  cardClass ="bg-slate-50/70 border-slate-100 text-slate-400";
                  statusDotClass ="bg-slate-300";
                } else {
                  statusText ="Alpa";
                  cardClass ="bg-red-50/30 border-red-50/50 text-red-500";
                  statusDotClass ="bg-red-400";
                }

                return (
                  <div 
                    key={dayNum} 
                    className={`min-h-[56px] md:min-h-[72px] p-1 md:p-2.5 rounded-lg border flex flex-col justify-between transition-all hover:shadow-sm relative ${cardClass}`}
                    title={`Hari ${dayName}, ${dayNum} - Status: ${statusText}`}
                  >
                    {/* Header: Date Number & Status indicator dot */}
                    <div className="flex items-center justify-between w-full">
                      <span className={`text-[10px] md:text-sm font-black ${isWeekend || isHoliday ?'text-rose-500/80' :'text-slate-700'}`}>
                        {dayNum}
                      </span>
                      <span className={`w-1 h-1 md:w-1.5 md:h-1.5 rounded-full shrink-0 ${statusDotClass}`} />
                    </div>

                    {/* Footer: Scan Times or Status Label */}
                    <div className="w-full flex flex-col min-w-0 items-center justify-center leading-none">
                      {hasScan && !["Izin","Sakit","Dinas Luar","Alpa"].includes(log.in) ? (
                        <>
                          {log.in && (
                            <span className="text-[7.5px] md:text-[9.5px] font-extrabold text-emerald-600 truncate w-full text-center">
                              {log.in.substring(0, 5)}
                            </span>
                          )}
                          {log.out && (
                            <span className="text-[7.5px] md:text-[9.5px] font-extrabold text-slate-500 truncate w-full text-center mt-0.5">
                              {log.out.substring(0, 5)}
                            </span>
                          )}
                        </>
                      ) : (
                        <div className="w-full flex flex-col items-center gap-0.5 min-w-0">
                          <span className="text-[7.5px] md:text-[9px] font-black uppercase tracking-tight truncate w-full text-center">
                            {statusText}
                          </span>
                          {log?.gdrive_url && (
                            <a
                              href={log.gdrive_url}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-[7.5px] text-blue-600 hover:underline font-bold bg-white/60 px-1 rounded border border-blue-200 mt-0.5 text-center truncate max-w-full"
                            >
                              Lihat Surat
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentAbsensi;
