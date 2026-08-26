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
    return students.filter(s => {
      const kelasStr = s.kelas || s.class_name || '';
      return kelasStr.toUpperCase().startsWith(targetPrefix);
    }).map(s => {
      const studentNis = String(s.nis || s.code || s.id || '').trim();
      const mapping = pklStudentsMapping.find(m => String(m.nis).trim() === studentNis) || {};
      const kelasStr = s.kelas || s.class_name || '';
      const jurusanStr = s.jurusan || s.major || (kelasStr.includes(' ') ? kelasStr.split(' ')[1] : 'Umum');
      
      const teacherCode = assignments[studentNis] || mapping.teacher_code || null;
      const locationId = mapping.location_id ? String(mapping.location_id) : (s.perusahaanId ? String(s.perusahaanId) : 'unassigned');

      return {
        ...s,
        uniqueId: studentNis,
        nis: studentNis,
        namaFix: s.nama || s.name || '',
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

      {/* Info Tip Banner */}
      <div className="bg-indigo-50/80 border border-indigo-200/70 text-indigo-800 p-3 sm:p-4 rounded-[var(--ui-radius-card)] flex items-center gap-2.5 sm:gap-3 text-xs shadow-2xs">
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
              className={`flex-1 md:flex-none px-3.5 py-1.5 rounded-[var(--ui-radius-small)] text-xs font-black transition-all cursor-pointer border-none flex items-center justify-center gap-1.5 ${
                activeTab === 'manual'
                  ? 'bg-white text-slate-800 shadow-2xs'
                  : 'bg-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Building2 size={14} />
              <span>Berdasarkan Perusahaan</span>
            </button>

            {!readOnly && (
              <button
                type="button"
                onClick={() => setActiveTab('auto')}
                className={`flex-1 md:flex-none px-3.5 py-1.5 rounded-[var(--ui-radius-small)] text-xs font-black transition-all cursor-pointer border-none flex items-center justify-center gap-1.5 ${
                  activeTab === 'auto'
                    ? 'bg-white text-slate-800 shadow-2xs'
                    : 'bg-transparent text-slate-500 hover:text-slate-800'
                }`}
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
                      ? 'bg-[var(--ui-primary)] text-white border-[var(--ui-primary)] shadow-2xs' 
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
                      ? 'bg-[var(--ui-primary)] text-white border-[var(--ui-primary)] shadow-2xs' 
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
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-[var(--ui-radius-control)] bg-indigo-50 text-indigo-600 border border-indigo-200/60 flex items-center justify-center shrink-0 shadow-2xs">
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
