import { Button } from '../../../components/ui.jsx';
import { useState } from'react';
import { Clock } from'lucide-react';
import { isSuperAdminRole } from'../../../utils/constants.js';
import { Search, BookOpen } from'lucide-react';
import { PageHeader } from '../../../components/monitoring/ui/index.js';
;


export default function TabKetersediaan({
  currentUser,
  teachers,
  teacherAvailability,
  setTeacherAvailability,
  days,
  openModal,
  tabSubtitles
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const normalizeText = (t) => String(t ||"").trim().toLowerCase();
  const sameText = (a, b) => normalizeText(a) === normalizeText(b);

  const canViewAllAvailability = isSuperAdminRole(currentUser.role) || currentUser.role ==="waka";
  const availabilitySearch = normalizeText(searchTerm);
  
  const visibleAvailabilityTeachers = teachers
    .filter(
      (teacher) =>
        canViewAllAvailability ||
        sameText(teacher.code, currentUser.code),
    )
    .filter(
      (teacher) =>
        !availabilitySearch ||
        normalizeText(
          `${teacher.code ||""} ${teacher.name ||""} ${teacher.type ||""} ${teacher.preferredMajor ||""} ${teacher.preferredGrade ||""}`,
        ).includes(availabilitySearch),
    );

  const teachersWithSubjectsCount = teachers.filter((teacher) => {
    const entry = teacherAvailability[teacher.code] || { subjects: [] };
    return Array.isArray(entry.subjects) && entry.subjects.length > 0;
  }).length;

  const teachersWithDaysCount = teachers.filter((teacher) => {
    const entry = teacherAvailability[teacher.code] || { days: [] };
    return Array.isArray(entry.days) && entry.days.length > 0;
  }).length;

  const toggleTeacherDay = (teacherCode, day) => {
    setTeacherAvailability((prev) => {
      const next = { ...prev };
      const entry = next[teacherCode] || { days: [], subjects: [] };
      const currentDays = Array.isArray(entry.days) ? entry.days : [];
      next[teacherCode] = {
        ...entry,
        days: currentDays.includes(day)
          ? currentDays.filter((item) => item !== day)
          : Array.from(new Set([...currentDays, day]))
      };
      return next;
    });
  };

  const setTeacherDays = (teacherCode, nextDays) => {
    setTeacherAvailability((prev) => {
      const entry = prev[teacherCode] || { days: [], subjects: [] };
      return { ...prev, [teacherCode]: { ...entry, days: nextDays } };
    });
  };

  const totalPages = Math.ceil(visibleAvailabilityTeachers.length / itemsPerPage);
  const paginatedTeachers = visibleAvailabilityTeachers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="flex flex-col gap-4 w-full animate-in fade-in duration-300 relative z-10">
      <PageHeader 
        title="Ketersediaan Guru"
        description={tabSubtitles["ketersediaan"]}
        icon={Clock}
      >
        <Button variant="outline" onClick={() =>openModal("bulk","add")} >
          <BookOpen className="w-4 h-4 mr-2" />
          Import Excel</Button>
      </PageHeader>
      <section className="bg-white border-none rounded-[var(--ui-radius-card)] shadow-sm p-4 md:p-5">
        <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            {
              label:"Guru tampil",
              value: visibleAvailabilityTeachers.length,
              tone:"bg-slate-50 text-slate-700"
            },
            {
              label:"Sudah isi mapel",
              value: teachersWithSubjectsCount,
              tone:"bg-emerald-50 text-emerald-700"
            },
            {
              label:"Sudah isi hari",
              value: teachersWithDaysCount,
              tone:"bg-[var(--ui-primary)]/10 text-blue-700"
            },
            {
              label:"Total hari aktif",
              value: days.length,
              tone:"bg-amber-50 text-amber-700"
            },
          ].map((item) => (
            <div
              key={item.label}
              className={`rounded-[var(--ui-radius-small)] border-none p-3 ${item.tone}`}
            >
              <div className="text-2xl font-black">{item.value}</div>
              <div className="text-[10px] font-black uppercase tracking-widest opacity-70">
                {item.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-[320px_minmax(0,1fr)] gap-4">
        <aside className="bg-white border-none rounded-[var(--ui-radius-control)] shadow-sm p-4 h-fit xl:sticky xl:top-4">
          <h4 className="font-black text-slate-800 text-sm">
            Cara Penggunaan
          </h4>
          <div className="flex flex-col gap-2.5 mt-4">
            {[
              ["1","Cari Guru","Gunakan pencarian bila data guru banyak.",
              ],
              ["2","Isi mapel","Klik Ubah Mapel untuk daftar kompetensi.",
              ],
              ["3","Centang hari","Klik pill hari sampai aktif berwarna hijau.",
              ],
            ].map(([step, title, desc]) => (
              <div
                key={step}
                className="flex gap-3 rounded-[var(--ui-radius-small)] bg-slate-50 border-none p-3"
              >
                <div className="w-7 h-7 rounded-[var(--ui-radius-small)] bg-[var(--ui-primary)] text-white flex items-center justify-center text-xs font-black shrink-0">
                  {step}
                </div>
                <div>
                  <p className="text-xs font-black text-slate-800">
                    {title}
                  </p>
                  <p className="text-[11px] font-bold text-slate-500 mt-0.5 leading-relaxed">
                    {desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 relative">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => {
                setSearchTerm(event.target.value);
                setCurrentPage(1);
              }}
              placeholder="Cari nama, kode, kategori..."
              className="w-full border-none bg-slate-50 pl-9 pr-3 py-2.5 rounded-[var(--ui-radius-small)] text-xs font-bold focus:bg-white focus:outline-[var(--ui-primary)]"
            />
          </div>
        </aside>

        <div className="grid grid-cols-1 2xl:grid-cols-2 gap-3">
          {paginatedTeachers.length === 0 ? (
            <div className="rounded-[var(--ui-radius-small)] border border-dashed border-slate-200 bg-white p-6 text-center text-sm font-bold text-slate-400">
              Tidak ada guru yang cocok dengan pencarian.
            </div>
          ) : (
            paginatedTeachers.map((t) => {
              const avail = teacherAvailability[t.code] || {
                days: [],
                subjects: [] };
              const activeDays = Array.isArray(avail.days)
                ? avail.days
                : [];
              const subjectsList = Array.isArray(avail.subjects)
                ? avail.subjects
                : [];
              return (
                <article
                  key={t.code}
                  className="bg-white border-none rounded-[var(--ui-radius-control)] shadow-sm p-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-black text-slate-800 text-base truncate">
                          {t.name}
                        </h4>
                        <span className="px-2 py-1 rounded-[var(--ui-radius-small)] bg-slate-50 border-none text-[10px] font-black text-slate-500">
                          {t.code}
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] font-bold text-slate-500">
                        {t.type ||"Guru Umum"} - Target{""}
                        {t.targetWeeklyJp || 0} JP/minggu
                      </p>
                    </div>
                    <Button variant="outline"
                      onClick={() =>openModal("ketersediaan_mapel","edit", t)
                      }
                      variant="secondary"
                      
                    >
                      <BookOpen size={14} /> Ubah Mapel</Button>
                  </div>

                  <div className="mt-4 rounded-[var(--ui-radius-small)] bg-slate-50 border-none p-3">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        Mapel Kompetensi
                      </p>
                      <span
                        className={`text-[10px] font-black px-2 py-0.5 rounded-[var(--ui-radius-small)] ${subjectsList.length ?"bg-emerald-100 text-emerald-700" :"bg-red-50 text-rose-600"}`}
                      >
                        {subjectsList.length || 0} mapel
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {subjectsList.length > 0 ? (
                        subjectsList.map((subject) => (
                          <span
                            key={subject}
                            className="bg-white border border-[var(--ui-primary)]/15 text-[var(--ui-primary)] text-[10px] px-2.5 py-1 rounded-[var(--ui-radius-small)] font-black"
                          >
                            {subject}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-rose-500 font-bold">
                          Belum ada mapel. Klik Ubah Mapel.
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        Hari Tersedia
                      </p>
                      <div className="flex gap-1">
                        <Button variant="outline"
                          type="button"
                          onClick={() =>setTeacherDays(t.code, [...days])
                          }
                          
                        >
                          Semua</Button>
                        <Button variant="outline"
                          type="button"
                          onClick={() =>setTeacherDays(t.code, [])}
                          
                        >
                          Kosong</Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                      {days.map((day) => {
                        const checked = activeDays.includes(day);
                        return (
                          <Button variant="outline"
                            key={day}
                            type="button"
                            onClick={() =>toggleTeacherDay(t.code, day)}
                            className={`${checked ?"bg-[var(--ui-primary)] text-white border-[var(--ui-primary)] shadow-sm" :"bg-slate-50 text-slate-500 border-slate-200 hover:bg-white"}`}
                          >
                            {day}</Button>
                        );
                      })}
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </div>
        {totalPages > 1 && (
          <div className="mt-4 flex flex-wrap items-center justify-between sm:justify-end gap-3 bg-white p-3 rounded-[var(--ui-radius-control)] shadow-sm border-none">
            <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">
              Halaman {currentPage} dari {totalPages}
            </span>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                disabled={currentPage === 1} 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              >
                Prev
              </Button>
              <Button 
                variant="outline" 
                disabled={currentPage === totalPages} 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
