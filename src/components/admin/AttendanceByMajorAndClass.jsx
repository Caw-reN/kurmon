import React, { useState, useMemo } from 'react';
import { 
  Building2, GraduationCap, Trophy, ChevronRight, BarChart2, 
  CheckCircle2, Users, ArrowUpRight, Sparkles, Filter 
} from 'lucide-react';
import { getClassBadge } from '../monitoring/ui/SharedDashboardLogs.jsx';

const pct = (v, t) => (t > 0 ? Math.min(100, Math.round((v / t) * 100)) : 0);

const majorColorMap = {
  TKJ: { bg: 'bg-indigo-500', light: 'bg-indigo-50 text-indigo-700 border-indigo-200', text: 'text-indigo-700' },
  TJKT: { bg: 'bg-indigo-500', light: 'bg-indigo-50 text-indigo-700 border-indigo-200', text: 'text-indigo-700' },
  RPL: { bg: 'bg-cyan-500', light: 'bg-cyan-50 text-cyan-700 border-cyan-200', text: 'text-cyan-700' },
  PPLG: { bg: 'bg-cyan-500', light: 'bg-cyan-50 text-cyan-700 border-cyan-200', text: 'text-cyan-700' },
  TKR: { bg: 'bg-orange-500', light: 'bg-orange-50 text-orange-700 border-orange-200', text: 'text-orange-700' },
  TKRO: { bg: 'bg-orange-500', light: 'bg-orange-50 text-orange-700 border-orange-200', text: 'text-orange-700' },
  MPLB: { bg: 'bg-emerald-500', light: 'bg-emerald-50 text-emerald-700 border-emerald-200', text: 'text-emerald-700' },
  OTKP: { bg: 'bg-emerald-500', light: 'bg-emerald-50 text-emerald-700 border-emerald-200', text: 'text-emerald-700' },
  AKL: { bg: 'bg-pink-500', light: 'bg-pink-50 text-pink-700 border-pink-200', text: 'text-pink-700' },
  AK: { bg: 'bg-pink-500', light: 'bg-pink-50 text-pink-700 border-pink-200', text: 'text-pink-700' },
  DKV: { bg: 'bg-purple-500', light: 'bg-purple-50 text-purple-700 border-purple-200', text: 'text-purple-700' },
  MM: { bg: 'bg-purple-500', light: 'bg-purple-50 text-purple-700 border-purple-200', text: 'text-purple-700' },
  BDP: { bg: 'bg-amber-500', light: 'bg-amber-50 text-amber-700 border-amber-200', text: 'text-amber-700' },
  PM: { bg: 'bg-amber-500', light: 'bg-amber-50 text-amber-700 border-amber-200', text: 'text-amber-700' },
  TB: { bg: 'bg-rose-500', light: 'bg-rose-50 text-rose-700 border-rose-200', text: 'text-rose-700' },
  TBSM: { bg: 'bg-red-500', light: 'bg-red-50 text-red-700 border-red-200', text: 'text-red-700' },
};

export default function AttendanceByMajorAndClass({ students = [], dashLogs = {}, onNavigateTab }) {
  const [viewMode, setViewMode] = useState('jurusan'); // 'jurusan' | 'kelas'
  const [gradeFilter, setGradeFilter] = useState('all'); // 'all' | 'X' | 'XI' | 'XII'

  // Hitung komparasi kehadiran per Jurusan & per Rombel Kelas
  const stats = useMemo(() => {
    const rawAttendance = dashLogs?.todayStudentAttendance || [];
    const nisMap = {};
    const nameMap = {};

    (students || []).forEach(s => {
      const nis = String(s.nis || s.code || s.employee_id || '').trim().toLowerCase();
      const name = String(s.name || s.nama || '').trim().toLowerCase();
      if (nis) nisMap[nis] = s;
      if (name) nameMap[name] = s;
    });

    const presentMap = new Map(); // id -> { status, telat }
    rawAttendance.forEach(a => {
      const idRaw = String(a.employee_id || a.nis || a.id || '').trim().toLowerCase();
      const nameRaw = String(a.true_person_name || a.name || '').trim().toLowerCase();
      const st = String(a.status || 'Hadir').toLowerCase();
      const isLate = st.includes('terlambat') || st.includes('late');
      const isPresent = !st.includes('alpa');

      if (isPresent) {
        if (idRaw) presentMap.set(idRaw, { isLate });
        if (nameRaw) presentMap.set(nameRaw, { isLate });
      }
    });

    const majorMap = {};
    const classMap = {};

    (students || []).forEach(s => {
      const cls = String(s.class_name || s.kelas || 'Umum').trim().toUpperCase();
      let grade = 'Unknown';
      if (cls.startsWith('XII ') || cls === 'XII') grade = 'XII';
      else if (cls.startsWith('XI ') || cls === 'XI') grade = 'XI';
      else if (cls.startsWith('X ') || cls === 'X') grade = 'X';

      let major = cls.replace(/^(X|XI|XII|XIII)\s+/i, '').replace(/\s+\d+$/i, '').trim();
      if (!major || major === '-' || major === 'UNDEFINED') major = 'Umum';

      // Init Major
      if (!majorMap[major]) {
        majorMap[major] = { name: major, total: 0, hadir: 0, telat: 0 };
      }
      majorMap[major].total++;

      // Init Class
      if (!classMap[cls]) {
        classMap[cls] = { name: cls, grade, major, total: 0, hadir: 0, telat: 0 };
      }
      classMap[cls].total++;

      const sNis = String(s.nis || s.code || s.employee_id || '').trim().toLowerCase();
      const sName = String(s.name || s.nama || '').trim().toLowerCase();
      const attRecord = presentMap.get(sNis) || presentMap.get(sName);

      if (attRecord) {
        majorMap[major].hadir++;
        classMap[cls].hadir++;
        if (attRecord.isLate) {
          majorMap[major].telat++;
          classMap[cls].telat++;
        }
      }
    });

    const majorsList = Object.values(majorMap).map(m => ({
      ...m,
      pct: pct(m.hadir, m.total),
      colors: majorColorMap[m.name] || { bg: 'bg-emerald-500', light: 'bg-emerald-50 text-emerald-700 border-emerald-200', text: 'text-emerald-700' }
    })).sort((a, b) => b.pct - a.pct);

    const classesList = Object.values(classMap).map(c => ({
      ...c,
      pct: pct(c.hadir, c.total),
      colors: majorColorMap[c.major] || { bg: 'bg-emerald-500', light: 'bg-emerald-50 text-emerald-700 border-emerald-200', text: 'text-emerald-700' }
    })).sort((a, b) => b.pct - a.pct);

    const topMajor = majorsList[0] || null;
    const topClass = classesList[0] || null;

    return { majorsList, classesList, topMajor, topClass };
  }, [students, dashLogs]);

  // Filter classes by grade
  const filteredClasses = useMemo(() => {
    if (gradeFilter === 'all') return stats.classesList;
    return stats.classesList.filter(c => c.grade === gradeFilter);
  }, [stats.classesList, gradeFilter]);

  return (
    <div className="bg-[var(--ui-card-bg,white)] rounded-[var(--ui-radius-card)] shadow-[var(--ui-card-shadow,var(--ui-shadow-card))] border border-[var(--ui-card-border-color,theme(colors.slate.200/80))] p-4 sm:p-5 flex flex-col gap-4 animate-in fade-in duration-200">
      
      {/* ── Header & Toolbar Controls ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-[var(--ui-radius-small)] bg-emerald-50 border border-emerald-200/80 shadow-xs flex items-center justify-center text-emerald-600 shrink-0">
            <BarChart2 size={16} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-black text-slate-800 tracking-tight">
                Persentase Kehadiran Per Jurusan & Per Kelas
              </h3>
              {stats.topMajor && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9.5px] font-black bg-amber-50 text-amber-700 border border-amber-200">
                  <Trophy size={10} className="text-amber-500" />
                  Tertinggi: {stats.topMajor.name} ({stats.topMajor.pct}%)
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-400 font-medium mt-0.5">
              Komparasi proporsi kehadiran siswa hari ini berdasarkan kompetensi keahlian dan rombel kelas
            </p>
          </div>
        </div>

        {/* View Toggle & Grade Filter */}
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <div className="flex items-center bg-slate-100 p-0.5 rounded-[var(--ui-radius-control)] border border-slate-200/80 shadow-2xs">
            <button
              type="button"
              onClick={() => setViewMode('jurusan')}
              className={`px-3 py-1 text-[10.5px] font-black rounded-[var(--ui-radius-control)] transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'jurusan'
                  ? 'bg-white text-slate-800 shadow-xs'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Building2 size={12} />
              Per Jurusan ({stats.majorsList.length})
            </button>
            <button
              type="button"
              onClick={() => setViewMode('kelas')}
              className={`px-3 py-1 text-[10.5px] font-black rounded-[var(--ui-radius-control)] transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'kelas'
                  ? 'bg-white text-slate-800 shadow-xs'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <GraduationCap size={12} />
              Per Kelas ({stats.classesList.length})
            </button>
          </div>

          {viewMode === 'kelas' && (
            <div className="flex items-center gap-1 bg-slate-50 p-0.5 rounded-[var(--ui-radius-control)] border border-slate-200">
              {['all', 'X', 'XI', 'XII'].map(g => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGradeFilter(g)}
                  className={`px-2 py-0.5 text-[9.5px] font-black rounded transition-all cursor-pointer ${
                    gradeFilter === g
                      ? 'bg-[var(--ui-primary)] text-white shadow-2xs'
                      : 'text-slate-500 hover:bg-slate-200/60'
                  }`}
                >
                  {g === 'all' ? 'Semua' : `Kls ${g}`}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Mode 1: Grid Per Jurusan ── */}
      {viewMode === 'jurusan' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-2.5">
          {stats.majorsList.map((major, idx) => (
            <div
              key={major.name || idx}
              className="bg-slate-50/90 hover:bg-white rounded-[var(--ui-radius-small)] p-3 border border-slate-200/80 shadow-xs hover:shadow-sm hover:border-[var(--ui-primary)]/40 transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between gap-1 mb-1.5">
                  <span className="text-xs font-black text-slate-800 tracking-tight group-hover:text-[var(--ui-primary)] transition-colors">
                    {major.name}
                  </span>
                  <span className={`text-[10px] font-black px-1.5 py-0.2 rounded-full border ${major.colors.light}`}>
                    {major.pct}%
                  </span>
                </div>

                <div className="w-full h-2 bg-slate-200/80 rounded-full overflow-hidden mb-1.5 shadow-inner">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${major.colors.bg}`}
                    style={{ width: `${major.pct}%` }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-[9.5px] font-bold text-slate-500 pt-1 border-t border-slate-200/40">
                <span className="text-emerald-700 font-extrabold">{major.hadir} Hadir</span>
                <span className="text-slate-400 font-medium">/ {major.total} Siswa</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Mode 2: Grid Per Kelas / Rombel ── */}
      {viewMode === 'kelas' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
          {filteredClasses.map((cls, idx) => (
            <div
              key={cls.name || idx}
              className="bg-slate-50/80 hover:bg-white rounded-[var(--ui-radius-small)] p-2.5 border border-slate-200/70 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className={`text-[10px] font-extrabold px-1.5 py-[0.5px] rounded border ${getClassBadge(cls.name)}`}>
                    {cls.name}
                  </span>
                  <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 px-1.5 py-[0.5px] rounded border border-emerald-200/60">
                    {cls.pct}%
                  </span>
                </div>

                <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden my-1">
                  <div
                    className={`h-full rounded-full ${cls.pct >= 85 ? 'bg-emerald-500' : cls.pct >= 65 ? 'bg-amber-400' : 'bg-rose-400'}`}
                    style={{ width: `${cls.pct}%` }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-[8.5px] font-bold text-slate-500 pt-0.5">
                <span className="text-emerald-700">{cls.hadir} Hadir</span>
                <span className="text-slate-400">{cls.total} Total</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Footer Link to Detail ── */}
      <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-100">
        <span className="flex items-center gap-1.5">
          <CheckCircle2 size={12} className="text-emerald-600" />
          Sinkronisasi realtime dari data presensi Hikvision & gerbang sekolah
        </span>
        {onNavigateTab && (
          <button
            type="button"
            onClick={() => onNavigateTab('laporan_absensi')}
            className="font-black text-[var(--ui-primary)] hover:underline flex items-center gap-0.5 cursor-pointer"
          >
            Buka Rekap Detail Absensi <ChevronRight size={12} />
          </button>
        )}
      </div>

    </div>
  );
}
