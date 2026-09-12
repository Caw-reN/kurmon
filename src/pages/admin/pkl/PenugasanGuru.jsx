import { useState, useMemo, useEffect } from 'react';
import { 
  UserCheck, Wand2, Users, CheckCircle2, AlertTriangle, Building2, 
  ChevronDown, Info, Search, X, Edit2, ChevronLeft, ChevronRight, Check, RefreshCw,
  GraduationCap, Sparkles, Filter
} from 'lucide-react';
import usePenugasanStore from '../../../store/monitoring/penugasanStore';
import useAuthStore from '../../../store/monitoring/authStore';
import { getDatabaseSnapshot } from '../../../utils/dataSource';
import { PageHeader, Avatar } from '../../../components/monitoring/ui/index.js';
import { Button } from '../../../components/ui.jsx';
import { CustomSelect } from '../../../components/CustomSelect.jsx';

const getToken = () => {
  try {
    const raw = sessionStorage.getItem("school_schedule_session_v1");
    if (raw) return JSON.parse(raw)?.authToken;
  } catch (e) {}
  return null;
};

const PenugasanGuru = ({ teachers = [], students = [], readOnly }) => {
  const [locations, setLocations] = useState([]);
  const [pklStudentsMapping, setPklStudentsMapping] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState(new Set());
  const [eligibleClass, setEligibleClass] = useState("XII");
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(true);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const {
    assignments, getLoadPerGuru, getSisaKapasitas,
    kapasitasGuru, assignManual, unassign, generateAutoAssign, applyPreview,
  } = usePenugasanStore();

  const [activeTab, setActiveTab] = useState('manual');
  const [autoMode, setAutoMode] = useState('incremental');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterKelas, setFilterKelas] = useState('Semua');
  const [filterJurusan, setFilterJurusan] = useState('Semua');

  const [config, setConfig] = useState({
    prioritasWaliKelas: true,
    pemerataanArea: true,
    kapasitasGlobal: 5
  });

  const [autoPreviewList, setAutoPreviewList] = useState(null);
  const [isCalculatingAuto, setIsCalculatingAuto] = useState(false);
  const [isApplyingAuto, setIsApplyingAuto] = useState(false);

  const fetchData = () => {
    const token = getToken();
    setLoading(true);

    Promise.all([
      fetch("/api/pkl/locations", { headers: token ? { "Authorization": `Bearer ${token}` } : {} })
        .then(r => r.json()).catch(() => ({ ok: false, data: [] })),
      fetch("/api/monitoring/pkl-students", { headers: token ? { "Authorization": `Bearer ${token}` } : {} })
        .then(r => r.json()).catch(() => ({ ok: false, data: [] })),
      fetch("/api/settings/pkl", { headers: token ? { "Authorization": `Bearer ${token}` } : {} })
        .then(r => r.json()).catch(() => ({ ok: false }))
    ]).then(([locData, pklData, settingsData]) => {
      if (locData?.ok) setLocations(Array.isArray(locData.data) ? locData.data : []);
      if (pklData?.ok && Array.isArray(pklData.data)) {
        setPklStudentsMapping(pklData.data);
        pklData.data.forEach(item => {
          if (item.teacher_code) {
            assignManual(item.nis, item.teacher_code);
          }
        });
      }
      if (settingsData?.ok && settingsData.data?.eligibleClass) {
        setEligibleClass(settingsData.data.eligibleClass);
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, []);

  const toggleSelectStudent = (siswaId) => {
    setSelectedStudents(prev => {
      const next = new Set(prev);
      if (next.has(siswaId)) next.delete(siswaId);
      else next.add(siswaId);
      return next;
    });
  };

  const toggleSelectAll = (locId) => {
    const studentsInCompany = studentsByCompany[locId] || [];
    const allSelected = studentsInCompany.length > 0 && studentsInCompany.every(s => selectedStudents.has(s.uniqueId));
    
    setSelectedStudents(prev => {
      const next = new Set(prev);
      studentsInCompany.forEach(s => {
        if (allSelected) next.delete(s.uniqueId);
        else next.add(s.uniqueId);
      });
      return next;
    });
  };

  // Map student fields with live database mapping
  const mappedStudents = useMemo(() => {
    const targetPrefix = String(eligibleClass || 'XII').toUpperCase();
    const propFiltered = students.filter(s => {
      const kelasStr = s.kelas || s.class_name || '';
      return kelasStr.toUpperCase().startsWith(targetPrefix);
    });

    const source = propFiltered.length > 0 ? propFiltered : pklStudentsMapping;

    return source.map(s => {
      const studentNis = String(s.nis || s.code || s.id || '').trim();
      const mapping = pklStudentsMapping.find(m => String(m.nis).trim() === studentNis) || {};
      const kelasStr = s.kelas || s.class_name || mapping.class_name || '';
      const jurusanStr = s.jurusan || s.major || mapping.major || (kelasStr.includes(' ') ? kelasStr.split(' ')[1] : 'Umum');
      
      const teacherCode = assignments[studentNis] || mapping.teacher_code || null;
      const locationId = mapping.location_id ? String(mapping.location_id) : (s.perusahaanId ? String(s.perusahaanId) : 'unassigned');
      const studentName = s.nama || s.name || mapping.name || mapping.student_name || `Siswa ${studentNis}`;

      return {
        ...s,
        uniqueId: studentNis,
        nis: studentNis,
        namaFix: studentName,
        kelasFix: kelasStr,
        jurusanFix: jurusanStr,
        perusahaanId: locationId,
        guruPembimbingCode: teacherCode
      };
    });
  }, [students, eligibleClass, pklStudentsMapping, assignments]);

  const assignedCount = mappedStudents.filter(s => Boolean(s.guruPembimbingCode)).length;
  const unassignedCount = mappedStudents.length - assignedCount;

  // Options for filter
  const kelasOptions = useMemo(() => ['Semua', ...Array.from(new Set(mappedStudents.map(s => s.kelasFix))).filter(Boolean)], [mappedStudents]);
  const jurusanOptions = useMemo(() => ['Semua', ...Array.from(new Set(mappedStudents.map(s => s.jurusanFix))).filter(Boolean)], [mappedStudents]);

  // Filter students based on search/filters
  const filteredStudents = useMemo(() => {
    return mappedStudents.filter(s => {
      const q = searchQuery.toLowerCase();
      const matchSearch = s.namaFix.toLowerCase().includes(q) || (s.nis && String(s.nis).includes(q));
      const matchKelas = filterKelas === 'Semua' || s.kelasFix === filterKelas;
      const matchJurusan = filterJurusan === 'Semua' || s.jurusanFix === filterJurusan;
      return matchSearch && matchKelas && matchJurusan;
    });
  }, [mappedStudents, searchQuery, filterKelas, filterJurusan]);

  // Group filtered students by perusahaan
  const studentsByCompany = useMemo(() => {
    const groups = {};
    filteredStudents.forEach(s => {
      const locId = s.perusahaanId || 'unassigned';
      if (!groups[locId]) groups[locId] = [];
      groups[locId].push(s);
    });
    return groups;
  }, [filteredStudents]);

  const handleBulkAssign = async (locId, guruId) => {
    if (!guruId) return;
    const studentsInCompany = studentsByCompany[locId] || [];
    const selectedInCompany = studentsInCompany.filter(s => selectedStudents.has(s.uniqueId));
    const targetStudents = selectedInCompany.length > 0 ? selectedInCompany : studentsInCompany;
    
    targetStudents.forEach(s => {
      assignManual(s.uniqueId, guruId);
    });

    const token = getToken();
    try {
      await fetch("/api/monitoring/pkl-students/bulk", {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          updates: targetStudents.map(s => ({
            nis: s.uniqueId,
            location_id: locId !== 'unassigned' ? Number(locId) : null,
            teacher_code: guruId
          }))
        })
      });
      showToast(`Guru berhasil ditugaskan ke ${targetStudents.length} siswa!`);
    } catch (err) {
      showToast("Gagal menyimpan penugasan", "error");
    }
    
    if (selectedInCompany.length > 0) {
      setSelectedStudents(prev => {
        const next = new Set(prev);
        selectedInCompany.forEach(s => next.delete(s.uniqueId));
        return next;
      });
    }
  };

  const handleUnassignSingle = async (siswaId, locId) => {
    unassign(siswaId);
    const token = getToken();
    try {
      await fetch("/api/monitoring/pkl-students/bulk", {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          updates: [{
            nis: siswaId,
            location_id: locId !== 'unassigned' ? Number(locId) : null,
            teacher_code: null
          }]
        })
      });
      showToast("Penugasan guru dilepas.");
    } catch (e) {}
  };

  const teacherSelectOptions = useMemo(() => {
    return [
      { value: "", label: "-- Pilih Guru Pembimbing --" },
      ...teachers.map(g => ({
        value: String(g.code || g.id),
        label: `${g.name || g.nama} (${g.mapel || g.subject || 'Guru'})`
      }))
    ];
  }, [teachers]);

  const handleGenerateAutoAssign = () => {
    setIsCalculatingAuto(true);
    setTimeout(() => {
      try {
        const targetStudents = autoMode === 'incremental'
          ? mappedStudents.filter(s => !s.guruPembimbingCode)
          : [...mappedStudents];

        if (targetStudents.length === 0) {
          showToast(autoMode === 'incremental' 
            ? "Semua siswa sudah memiliki guru pembimbing!" 
            : "Tidak ada siswa yang memenuhi kriteria.", "info");
          setIsCalculatingAuto(false);
          return;
        }

        const maxKap = Number(config.kapasitasGlobal) || 5;
        const workingLoad = {};
        teachers.forEach(t => {
          const code = String(t.code || t.id);
          workingLoad[code] = 0;
        });

        if (autoMode === 'incremental') {
          mappedStudents.forEach(s => {
            if (s.guruPembimbingCode && workingLoad[s.guruPembimbingCode] !== undefined) {
              workingLoad[s.guruPembimbingCode]++;
            }
          });
        }

        const previewResults = [];

        targetStudents.forEach(siswa => {
          const availableTeachers = teachers.filter(t => {
            const code = String(t.code || t.id);
            return (workingLoad[code] || 0) < maxKap;
          });

          if (availableTeachers.length === 0) {
            previewResults.push({
              siswa,
              assignedTeacher: null,
              teacherCode: null,
              reason: "Kapasitas semua guru pembimbing penuh",
              isMatchMajor: false,
              isWaliKelas: false,
              score: -1
            });
            return;
          }

          const scored = availableTeachers.map(t => {
            const code = String(t.code || t.id);
            let score = (maxKap - (workingLoad[code] || 0)) * 10;
            const reasons = [];

            const tJurusan = (t.jurusan || t.major || t.mapel || '').toLowerCase();
            const sJurusan = (siswa.jurusanFix || siswa.jurusan || '').toLowerCase();
            const isMajorMatch = sJurusan && tJurusan.includes(sJurusan);
            if (isMajorMatch) {
              score += 1000;
              reasons.push("Kesesuaian Jurusan");
            }

            const isWalas = config.prioritasWaliKelas && t.walasClass && t.walasClass.toLowerCase() === (siswa.kelasFix || '').toLowerCase();
            if (isWalas) {
              score += 500;
              reasons.push("Wali Kelas");
            }

            if (reasons.length === 0) {
              reasons.push("Pemerataan Kuota");
            }

            return {
              teacher: t,
              code,
              score,
              isMajorMatch,
              isWalas,
              reasons
            };
          });

          scored.sort((a, b) => b.score - a.score);
          const best = scored[0];
          workingLoad[best.code] = (workingLoad[best.code] || 0) + 1;

          previewResults.push({
            siswa,
            assignedTeacher: best.teacher,
            teacherCode: best.code,
            reason: best.reasons.join(" • "),
            isMatchMajor: best.isMajorMatch,
            isWaliKelas: best.isWalas,
            score: best.score
          });
        });

        setAutoPreviewList(previewResults);
        showToast(`Kalkulasi selesai: ${previewResults.filter(p => p.teacherCode).length} siswa siap ditugaskan!`);
      } catch (err) {
        console.error("Auto-assign error:", err);
        showToast("Terjadi kesalahan saat kalkulasi auto-assign.", "error");
      } finally {
        setIsCalculatingAuto(false);
      }
    }, 300);
  };

  const handleApplyAutoAssign = async () => {
    if (!autoPreviewList || autoPreviewList.length === 0) return;
    const validAssignments = autoPreviewList.filter(p => p.teacherCode);
    if (validAssignments.length === 0) {
      showToast("Tidak ada rekomendasi penugasan yang valid untuk diterapkan.", "error");
      return;
    }

    setIsApplyingAuto(true);
    try {
      validAssignments.forEach(p => {
        assignManual(p.siswa.uniqueId, p.teacherCode);
      });

      const token = getToken();
      const updates = validAssignments.map(p => ({
        nis: p.siswa.uniqueId,
        location_id: p.siswa.perusahaanId !== 'unassigned' ? Number(p.siswa.perusahaanId) : null,
        teacher_code: p.teacherCode
      }));

      const res = await fetch("/api/monitoring/pkl-students/bulk", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ updates })
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        showToast(`Berhasil menerapkan penugasan untuk ${validAssignments.length} siswa ke server!`);
        setAutoPreviewList(null);
        setActiveTab('manual');
        fetchData();
      } else {
        showToast(data.error || "Gagal menyimpan penugasan otomatis ke server.", "error");
      }
    } catch (e) {
      console.error(e);
      showToast("Gagal menyimpan ke server.", "error");
    } finally {
      setIsApplyingAuto(false);
    }
  };

  const handlePreviewTeacherChange = (siswaUniqueId, newTeacherCode) => {
    setAutoPreviewList(prev => {
      if (!prev) return prev;
      return prev.map(item => {
        if (item.siswa.uniqueId === siswaUniqueId) {
          const t = teachers.find(g => String(g.code || g.id) === String(newTeacherCode));
          return {
            ...item,
            assignedTeacher: t || null,
            teacherCode: newTeacherCode || null,
            reason: "Penyesuaian Manual"
          };
        }
        return item;
      });
    });
  };

  return (
    <div className="space-y-4 sm:space-y-5 animate-in fade-in duration-300 pb-10">
      {/* Clean Page Header */}
      <PageHeader 
        icon={UserCheck}
        title="Penugasan Guru Pembimbing"
        description="Tugaskan guru pembimbing ke siswa secara terpusat per perusahaan atau otomatis."
      />

      {/* 3 Responsive Stat Cards */}
      <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
        <div className="bg-white rounded-[var(--ui-radius-card)] p-3 sm:p-5 border border-slate-200/80 shadow-[var(--ui-shadow-card)] flex flex-col justify-between">
          <span className="text-[9px] sm:text-[11px] font-black uppercase tracking-wider text-slate-400 block mb-0.5 truncate">
            TOTAL SISWA
          </span>
          <div className="flex items-baseline gap-1 sm:gap-2">
            <h3 className="text-lg sm:text-3xl font-black text-slate-800 tracking-tight">{mappedStudents.length}</h3>
            <span className="text-[10px] sm:text-xs font-bold text-slate-400 hidden sm:inline">Kelas {eligibleClass}</span>
          </div>
        </div>

        <div className="bg-white rounded-[var(--ui-radius-card)] p-3 sm:p-5 border border-slate-200/80 shadow-[var(--ui-shadow-card)] flex flex-col justify-between">
          <span className="text-[9px] sm:text-[11px] font-black uppercase tracking-wider text-emerald-600 block mb-0.5 truncate">
            SUDAH DITUGASKAN
          </span>
          <div className="flex items-baseline gap-1 sm:gap-2">
            <h3 className="text-lg sm:text-2xl font-black text-emerald-700 tracking-tight">{assignedCount}</h3>
            <span className="text-[10px] sm:text-xs font-bold text-emerald-600">
              ({mappedStudents.length > 0 ? Math.round((assignedCount / mappedStudents.length) * 100) : 0}%)
            </span>
          </div>
        </div>

        <div className="bg-white rounded-[var(--ui-radius-card)] p-3 sm:p-5 border border-slate-200/80 shadow-[var(--ui-shadow-card)] flex flex-col justify-between">
          <span className="text-[9px] sm:text-[11px] font-black uppercase tracking-wider text-rose-600 block mb-0.5 truncate">
            BELUM DITUGASKAN
          </span>
          <div className="flex items-baseline gap-1 sm:gap-2">
            <h3 className="text-lg sm:text-2xl font-black text-rose-700 tracking-tight">{unassignedCount}</h3>
            <span className="text-[10px] sm:text-xs font-bold text-rose-500">
              ({mappedStudents.length > 0 ? Math.round((unassignedCount / mappedStudents.length) * 100) : 0}%)
            </span>
          </div>
        </div>
      </div>

      {/* ── MODE 1: PENUGASAN MANUAL BERDASARKAN PERUSAHAAN ── */}
      {activeTab === 'manual' && (
        <>
          {/* Info Tip Banner */}
          <div className="bg-indigo-50/80 border border-indigo-200/70 text-indigo-800 p-3 sm:p-4 rounded-[var(--ui-radius-card)] flex items-center gap-2.5 sm:gap-3 text-xs shadow-xs">
            <Info className="shrink-0 text-indigo-600" size={16} />
            <p className="font-medium leading-relaxed">
              Pilih guru pembimbing pada dropdown header perusahaan untuk menugaskan <strong>seluruh siswa di perusahaan tersebut</strong> secara instan.
            </p>
          </div>

          {/* Unified Main Control Card (Tabs + Search + Filters) */}
          <div className="bg-white rounded-[var(--ui-radius-card)] p-3.5 sm:p-4 border border-slate-200/80 shadow-[var(--ui-shadow-card)] space-y-3">
            {/* Row 1: Segmented Mode Switcher (Full Width on Mobile) + Search */}
            <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
              {/* Segmented Mode Switcher */}
              <div className="flex items-center p-1 bg-[var(--ui-surface-muted)] rounded-[var(--ui-radius-control)] border border-[var(--ui-border-muted)] shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveTab('manual')}
                  className="flex-1 md:flex-none px-3.5 py-1.5 rounded-[var(--ui-radius-small)] text-xs font-black transition-all cursor-pointer border-none flex items-center justify-center gap-1.5 bg-white text-slate-800 shadow-xs"
                >
                  <Building2 size={14} />
                  <span>Berdasarkan Perusahaan</span>
                </button>

                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('auto')}
                    className="flex-1 md:flex-none px-3.5 py-1.5 rounded-[var(--ui-radius-small)] text-xs font-black transition-all cursor-pointer border-none flex items-center justify-center gap-1.5 bg-transparent text-slate-500 hover:text-slate-800"
                  >
                    <Wand2 size={14} />
                    <span>Auto-Assign Cerdas</span>
                  </button>
                )}
              </div>

              {/* Search Input */}
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                <input
                  type="text"
                  placeholder="Cari nama atau NIS siswa..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-1.5 bg-[var(--ui-surface-muted)] hover:bg-white border border-[var(--ui-border-soft)] rounded-[var(--ui-radius-control)] text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:shadow-[var(--ui-focus-ring)] focus:border-[var(--ui-primary)] transition-all"
                />
              </div>
            </div>

            {/* Row 2: Filter Kelas & Filter Jurusan */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2.5 border-t border-[var(--ui-border-muted)]">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 block">Filter Kelas:</label>
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                  {kelasOptions.map(k => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setFilterKelas(k)}
                      className={`px-3 py-1 rounded-[var(--ui-radius-small)] text-xs font-bold whitespace-nowrap cursor-pointer border transition-all ${
                        filterKelas === k 
                          ? 'bg-[var(--ui-primary)] text-white border-[var(--ui-primary)] shadow-xs' 
                          : 'bg-[var(--ui-surface-muted)] text-slate-600 border-[var(--ui-border-muted)] hover:bg-slate-200/60'
                      }`}
                    >
                      {k === 'Semua' ? 'Semua Kelas' : k}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 block">Filter Jurusan:</label>
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                  {jurusanOptions.map(j => (
                    <button
                      key={j}
                      type="button"
                      onClick={() => setFilterJurusan(j)}
                      className={`px-3 py-1 rounded-[var(--ui-radius-small)] text-xs font-bold whitespace-nowrap cursor-pointer border transition-all ${
                        filterJurusan === j 
                          ? 'bg-[var(--ui-primary)] text-white border-[var(--ui-primary)] shadow-xs' 
                          : 'bg-[var(--ui-surface-muted)] text-slate-600 border-[var(--ui-border-muted)] hover:bg-slate-200/60'
                      }`}
                    >
                      {j === 'Semua' ? 'Semua Jurusan' : j}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Grouped Companies List */}
          <div className="space-y-4">
            {Object.entries(studentsByCompany).map(([locId, compStudents]) => {
              const locObj = locations.find(l => String(l.id) === String(locId));
              const locName = locId === 'unassigned' ? 'Belum Ditempatkan ke Perusahaan' : (locObj?.nama_perusahaan || 'Perusahaan Mitra');
              const isAllSelected = compStudents.length > 0 && compStudents.every(s => selectedStudents.has(s.uniqueId));

              return (
                <div key={locId} className="bg-white rounded-[var(--ui-radius-card)] border border-slate-200/80 shadow-[var(--ui-shadow-card)] overflow-hidden">
                  {/* Company Header with Bulk Assign */}
                  <div className="bg-[var(--ui-surface-muted)] px-3.5 sm:px-4 py-3 border-b border-[var(--ui-border-muted)] flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 sm:gap-3">
                      {!readOnly && (
                        <input 
                          type="checkbox"
                          checked={isAllSelected}
                          onChange={() => toggleSelectAll(locId)}
                          className="w-4 h-4 text-[var(--ui-primary)] rounded border-slate-300 focus:ring-[var(--ui-primary)] cursor-pointer"
                        />
                      )}
                      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-[var(--ui-radius-control)] bg-indigo-50 text-indigo-600 border border-indigo-200/60 flex items-center justify-center shrink-0 shadow-xs">
                        <Building2 size={18} strokeWidth={2.2} className="sm:w-5 sm:h-5" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-extrabold text-xs sm:text-sm text-slate-900 truncate" title={locName}>{locName}</h3>
                        <p className="text-[10.5px] sm:text-[11px] text-slate-400 font-semibold mt-0.5">
                          {compStudents.length} Siswa Terdaftar • {locObj?.kota || 'Bekasi'}
                        </p>
                      </div>
                    </div>

                    {!readOnly && (
                      <div className="w-full md:w-[280px]">
                        <CustomSelect
                          value=""
                          onChange={val => handleBulkAssign(locId, val)}
                          options={teacherSelectOptions}
                          placeholder="Tugaskan 1 Guru untuk Semua Siswa"
                          searchable={true}
                        />
                      </div>
                    )}
                  </div>

                  {/* Student Rows (Mobile & Desktop Ergonomic) */}
                  <div className="divide-y divide-[var(--ui-border-muted)]">
                    {compStudents.map(s => {
                      const isSelected = selectedStudents.has(s.uniqueId);

                      return (
                        <div 
                          key={s.uniqueId} 
                          className={`p-3 sm:px-4 sm:py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:bg-slate-50/70 transition-colors ${
                            isSelected ? 'bg-indigo-50/30' : ''
                          }`}
                        >
                          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                            {!readOnly && (
                              <input 
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelectStudent(s.uniqueId)}
                              className="w-4 h-4 text-[var(--ui-primary)] rounded border-slate-300 focus:ring-[var(--ui-primary)] cursor-pointer"
                            />
                            )}
                            <Avatar name={s.namaFix} size="sm" />
                            <div className="min-w-0">
                              <h4 className="font-extrabold text-xs text-slate-800 truncate" title={s.namaFix}>{s.namaFix}</h4>
                              <p className="text-[10px] text-slate-400 font-semibold">{s.nis} • {s.kelasFix}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 pl-6 sm:pl-0 justify-between sm:justify-end">
                            <div className="w-full sm:w-[240px]">
                              <CustomSelect
                                value={s.guruPembimbingCode || ""}
                                onChange={val => {
                                  assignManual(s.uniqueId, val);
                                  handleBulkAssign(locId, val);
                                }}
                                options={teacherSelectOptions}
                                placeholder="-- Pilih Guru Pembimbing --"
                                searchable={true}
                              />
                            </div>
                            {s.guruPembimbingCode && !readOnly && (
                              <button
                                type="button"
                                onClick={() => handleUnassignSingle(s.uniqueId, locId)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 rounded bg-slate-100 hover:bg-rose-50 border border-slate-200 cursor-pointer transition-colors shrink-0"
                                title="Lepas Pembimbing"
                              >
                                <X size={14} />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {filteredStudents.length === 0 && (
              <div className="bg-white rounded-[var(--ui-radius-card)] p-12 text-center border border-slate-200/80">
                <Users size={36} className="mx-auto text-slate-300 mb-2" />
                <h4 className="text-sm font-bold text-slate-700">Tidak ada siswa ditemukan</h4>
                <p className="text-xs text-slate-400 mt-1">Coba sesuaikan kata kunci pencarian atau filter kelas.</p>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── MODE 2: AUTO-ASSIGN CERDAS BERBASIS ALGORITMA ── */}
      {activeTab === 'auto' && (
        <div className="space-y-4 sm:space-y-5 animate-in fade-in duration-300">
          {/* Engine Parameters Card */}
          <div className="bg-gradient-to-br from-indigo-50/60 via-white to-white rounded-[var(--ui-radius-card)] p-5 sm:p-6 border border-indigo-200/80 shadow-[var(--ui-shadow-card)] space-y-5">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-[var(--ui-radius-small)] bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                  <Wand2 size={24} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-base sm:text-lg text-slate-900">Mesin Auto-Assign Cerdas PKL</h3>
                    <span className="px-2 py-0.5 rounded-[var(--ui-radius-pill)] bg-indigo-100 text-indigo-700 text-[10px] font-black uppercase tracking-wider border border-indigo-200">
                      Algoritma Multi-Faktor
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium mt-0.5 max-w-2xl leading-relaxed">
                    Mencocokkan siswa dengan guru pembimbing secara otomatis berdasarkan kesesuaian jurusan keahlian, status wali kelas, dan batas kuota beban bimbingan.
                  </p>
                </div>
              </div>

              {/* Segmented Mode Switcher in Auto Tab */}
              <div className="flex items-center p-1 bg-white rounded-[var(--ui-radius-control)] border border-slate-200 shadow-2xs shrink-0 self-end md:self-center">
                <button
                  type="button"
                  onClick={() => setActiveTab('manual')}
                  className="px-3 py-1.5 rounded-[var(--ui-radius-small)] text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer border-none flex items-center gap-1.5"
                >
                  <Building2 size={13} />
                  <span>Manual</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('auto')}
                  className="px-3 py-1.5 rounded-[var(--ui-radius-small)] text-xs font-black bg-indigo-600 text-white shadow-xs transition-colors cursor-pointer border-none flex items-center gap-1.5"
                >
                  <Wand2 size={13} />
                  <span>Auto-Assign</span>
                </button>
              </div>
            </div>

            {/* Criteria & Options Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-indigo-100/80">
              {/* Target Scope */}
              <div className="p-3.5 bg-white rounded-[var(--ui-radius-small)] border border-slate-200/80 shadow-2xs space-y-2">
                <label className="text-[10.5px] font-black text-slate-500 uppercase tracking-wider block">Cakupan Target Siswa</label>
                <div className="space-y-1.5">
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="autoMode"
                      value="incremental"
                      checked={autoMode === 'incremental'}
                      onChange={() => setAutoMode('incremental')}
                      className="text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                    <span>Hanya Siswa Belum Ditugaskan ({unassignedCount})</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="autoMode"
                      value="full"
                      checked={autoMode === 'full'}
                      onChange={() => setAutoMode('full')}
                      className="text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                    <span>Semua Siswa (Reset Total: {mappedStudents.length})</span>
                  </label>
                </div>
              </div>

              {/* Preferences */}
              <div className="p-3.5 bg-white rounded-[var(--ui-radius-small)] border border-slate-200/80 shadow-2xs space-y-2">
                <label className="text-[10.5px] font-black text-slate-500 uppercase tracking-wider block">Prioritas Pembobotan</label>
                <div className="space-y-1.5">
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.prioritasWaliKelas}
                      onChange={e => setConfig(prev => ({ ...prev, prioritasWaliKelas: e.target.checked }))}
                      className="text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer"
                    />
                    <span>Prioritas Wali Kelas (+500 Skor)</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-default">
                    <Check size={14} className="text-emerald-600" />
                    <span>Kesesuaian Jurusan (+1000 Skor)</span>
                  </label>
                </div>
              </div>

              {/* Capacity Limit & Action */}
              <div className="p-3.5 bg-white rounded-[var(--ui-radius-small)] border border-slate-200/80 shadow-2xs flex flex-col justify-between gap-3">
                <div>
                  <label className="text-[10.5px] font-black text-slate-500 uppercase tracking-wider block mb-1">Maksimal Siswa per Guru</label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={config.kapasitasGlobal}
                    onChange={e => setConfig(prev => ({ ...prev, kapasitasGlobal: Math.max(1, parseInt(e.target.value, 10) || 5) }))}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-[var(--ui-radius-control)] text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleGenerateAutoAssign}
                  disabled={isCalculatingAuto || mappedStudents.length === 0}
                  className="w-full py-2 px-3 rounded-[var(--ui-radius-control)] font-black text-xs bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {isCalculatingAuto ? <RefreshCw size={14} className="animate-spin" /> : <Sparkles size={14} />}
                  <span>{isCalculatingAuto ? "Mengkalkulasi..." : "Kalkulasi Rekomendasi"}</span>
                </button>
              </div>
            </div>
          </div>

          {/* ── PREVIEW SECTION ── */}
          {autoPreviewList ? (
            <div className="bg-white rounded-[var(--ui-radius-card)] border border-slate-200/80 shadow-[var(--ui-shadow-card)] overflow-hidden space-y-0">
              {/* Preview Header & Stats */}
              <div className="p-4 sm:p-5 bg-slate-50/80 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-extrabold text-sm sm:text-base text-slate-900">
                      Hasil Rekomendasi Auto-Assign
                    </h4>
                    <span className="px-2.5 py-0.5 rounded-[var(--ui-radius-pill)] bg-emerald-100 text-emerald-800 text-[10.5px] font-black tracking-wider border border-emerald-200">
                      {autoPreviewList.filter(p => p.teacherCode).length} Siswa Siap Ditugaskan
                    </span>
                    {autoPreviewList.filter(p => !p.teacherCode).length > 0 && (
                      <span className="px-2.5 py-0.5 rounded-[var(--ui-radius-pill)] bg-amber-100 text-amber-800 text-[10.5px] font-black tracking-wider border border-amber-200">
                        {autoPreviewList.filter(p => !p.teacherCode).length} Melebihi Kuota Guru
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Silakan review hasil rekomendasi di bawah ini. Anda dapat mengubah pilihan guru secara manual sebelum menerapkan ke database.
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setAutoPreviewList(null)}
                    disabled={isApplyingAuto}
                    className="py-2 px-3.5 rounded-[var(--ui-radius-control)] font-bold text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer border border-slate-200"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={handleApplyAutoAssign}
                    disabled={isApplyingAuto || autoPreviewList.filter(p => p.teacherCode).length === 0}
                    className="py-2 px-4 rounded-[var(--ui-radius-control)] font-black text-xs bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    {isApplyingAuto ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                    <span>{isApplyingAuto ? "Menyimpan..." : "Terapkan & Simpan ke Server"}</span>
                  </button>
                </div>
              </div>

              {/* Preview Table */}
              <div className="divide-y divide-slate-100 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-200">
                    <tr>
                      <th className="p-3.5 pl-5">Siswa</th>
                      <th className="p-3.5">Perusahaan PKL</th>
                      <th className="p-3.5">Rekomendasi Guru Pembimbing</th>
                      <th className="p-3.5 pr-5">Alasan Kecocokan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {autoPreviewList.map((item) => {
                      const { siswa, teacherCode, reason, isMatchMajor, isWaliKelas } = item;
                      const locObj = locations.find(l => String(l.id) === String(siswa.perusahaanId));
                      const locName = siswa.perusahaanId === 'unassigned' ? 'Belum Ditempatkan' : (locObj?.nama_perusahaan || 'Perusahaan Mitra');

                      return (
                        <tr key={siswa.uniqueId} className="hover:bg-indigo-50/30 transition-colors">
                          <td className="p-3.5 pl-5">
                            <div className="flex items-center gap-3">
                              <Avatar name={siswa.namaFix} size="sm" />
                              <div>
                                <h5 className="font-extrabold text-xs text-slate-900">{siswa.namaFix}</h5>
                                <p className="text-[10px] text-slate-400 font-semibold">{siswa.nis} • {siswa.kelasFix}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-3.5">
                            <span className="font-bold text-slate-700 block truncate max-w-[200px]" title={locName}>
                              {locName}
                            </span>
                            <span className="text-[10px] text-slate-400">{locObj?.kota || 'Bekasi'}</span>
                          </td>
                          <td className="p-3.5 min-w-[240px]">
                            <CustomSelect
                              value={teacherCode || ""}
                              onChange={val => handlePreviewTeacherChange(siswa.uniqueId, val)}
                              options={teacherSelectOptions}
                              placeholder="-- Tidak Ada Kuota --"
                              searchable={true}
                            />
                          </td>
                          <td className="p-3.5 pr-5">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {isMatchMajor && (
                                <span className="px-2 py-0.5 rounded-[var(--ui-radius-pill)] bg-emerald-50 text-emerald-700 text-[10px] font-black border border-emerald-200">
                                  Sejurusan
                                </span>
                              )}
                              {isWaliKelas && (
                                <span className="px-2 py-0.5 rounded-[var(--ui-radius-pill)] bg-blue-50 text-blue-700 text-[10px] font-black border border-blue-200">
                                  Wali Kelas
                                </span>
                              )}
                              <span className="text-[11px] text-slate-500 font-medium">
                                {reason}
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* Empty State when no calculation yet */
            <div className="bg-white rounded-[var(--ui-radius-card)] p-12 text-center border border-slate-200/80 shadow-[var(--ui-shadow-card)] space-y-3">
              <div className="w-16 h-16 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto shadow-xs border border-indigo-100">
                <Wand2 size={32} />
              </div>
              <h4 className="text-base font-extrabold text-slate-800">Siap Menjalankan Penugasan Cerdas</h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                Tentukan mode cakupan target siswa dan batas kapasitas guru di atas, kemudian tekan tombol <strong>"Kalkulasi Rekomendasi"</strong> untuk melihat preview hasil pencocokan.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-[var(--ui-radius-control)] shadow-[var(--ui-shadow-modal)] font-bold text-xs flex items-center gap-2 animate-in slide-in-from-bottom-5 text-white z-[100] ${
          toast.type === 'error' ? 'bg-rose-600' : 'bg-emerald-600'
        }`}>
          {toast.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />} 
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
};

export default PenugasanGuru;
