import { Button } from '../../../components/ui.jsx';
import { useState, useMemo, useEffect, useRef } from'react';
import { UserCheck, Wand2, Users, CheckCircle2, AlertTriangle, Building2 } from'lucide-react';
import usePenugasanStore from'../../../store/monitoring/penugasanStore';
import useAuthStore from'../../../store/monitoring/authStore';
import { getDatabaseSnapshot } from'../../../utils/dataSource';
import { ChevronDown, Info, Search, X, Badge, Edit2, ChevronLeft, ChevronRight } from'lucide-react';
import { PageHeader, StatCard, Avatar } from'../../../components/monitoring/ui/index.js';


/**
 * admin/PenugasanGuru.jsx
 * HUBIN menugaskan guru ke siswa ?" manual atau auto-assign.
 * Tampilan dikelompokkan per Perusahaan/Lokasi untuk kemudahan Bulk Assign.
 */












const ClickPicker = ({ value, onChange, options, placeholder ="Pilih..." }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const filteredOptions = options.filter(opt => 
    opt.label.toLowerCase().includes(search.toLowerCase())
  );

  const selectedOpt = options.find(o => String(o.value) === String(value));

  return (
    <div className="relative" ref={ref}>
      <Button variant="outline"
        type="button"
        onClick={() =>{ setIsOpen(!isOpen); setSearch(''); }}
        className="w-full text-left flex justify-between items-center cursor-pointer"
      >
        <span className={selectedOpt ?"text-slate-800 font-bold" :"text-slate-400"}>
          {selectedOpt ? selectedOpt.label : placeholder}
        </span>
        <ChevronDown size={14} className="text-slate-400" /></Button>

      {isOpen && (
        <div className="absolute z-[60] mt-1 w-full bg-white border-none rounded-[var(--ui-radius-small)] shadow-sm max-h-60 overflow-hidden flex flex-col">
          <div className="p-2 border-b border-slate-100 bg-slate-50 shrink-0">
            <input
              type="text"
              autoFocus
              placeholder="Cari..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs border-none rounded-[var(--ui-radius-small)] focus:outline-none focus:ring-1 focus:ring-[var(--ui-primary)] focus:border-[var(--ui-primary)]"
            />
          </div>
          <div className="overflow-y-auto flex-1 py-1 custom-scrollbar">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-2 text-xs text-slate-400 text-center">Tidak ditemukan</div>
            ) : (
              filteredOptions.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() =>{
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left flex items-center justify-between px-3 py-2 text-[11px] font-bold text-slate-700 bg-transparent border-none hover:bg-slate-50 cursor-pointer transition-colors`}
                >
                  <span>{opt.label}</span>
                  {String(opt.value) === String(value) && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--ui-primary)]"></span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const PenugasanGuru = ({ teachers = [], students = [], readOnly }) => {
  const [locations, setLocations] = useState([]);
  const [editingRows, setEditingRows] = useState(new Set());
  const [selectedStudents, setSelectedStudents] = useState(new Set());
  const authToken = useAuthStore(state => state.user?.authToken);
  const [eligibleClass, setEligibleClass] = useState("XII");

  useEffect(() => {
    // Load eligibleClass from local appSettings
    const localSnapshot = getDatabaseSnapshot() || {};
    const localSettings = localSnapshot.appSettings || {};
    setEligibleClass(localSettings.eligibleClass ||"XII");
  }, [authToken]);

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

  const {
    assignments, getSiswaUnassigned, getLoadPerGuru, getSisaKapasitas,
    kapasitasGuru, assignManual, unassign, generateAutoAssign, applyPreview, cancelPreview,
    previewAssignments, autoAssignResult,
  } = usePenugasanStore();


  const [activeTab, setActiveTab]       = useState('manual');
  const [autoMode, setAutoMode]         = useState('incremental');
  const [confirmDialog, setConfirmDialog] = useState(null);
  
  // Filtering & Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterKelas, setFilterKelas] = useState('Semua');
  const [filterJurusan, setFilterJurusan] = useState('Semua');

  // Pagination state
  const [pages, setPages] = useState({}); // { [locId]: currentPage }
  const ITEMS_PER_PAGE = 10;

  const [config, setConfig] = useState({
    prioritasWaliKelas: true,
    pemerataanArea: true,
    kapasitasGlobal: 5
  });

  // Map student fields properly from DB format
  const mappedStudents = useMemo(() => {
    return students.filter(s => {
      const kelasStr = s.kelas || s.class_name ||'';
      return kelasStr.toUpperCase().startsWith(eligibleClass.toUpperCase());
    }).map(s => {
      const kelasStr = s.kelas || s.class_name ||'';
      const jurusanStr = s.jurusan || s.major || (kelasStr.includes('') ? kelasStr.split('')[1] :'Umum');
      return {
        ...s,
        uniqueId: s.id || s.nis, // Fallback to NIS if ID is undefined
        namaFix: s.nama || s.name ||'',
        kelasFix: kelasStr,
        jurusanFix: jurusanStr,
      };
    });
  }, [students, eligibleClass]);

  const load      = getLoadPerGuru(teachers);
  const sisaKap   = getSisaKapasitas(teachers);
  const unassigned = mappedStudents.filter(s => !assignments[s.uniqueId]);

  // Fetch locations once
  useEffect(() => {
    fetch('/api/pkl/locations')
      .then(res => res.json())
      .then(res => { if (res.ok) setLocations(res.data); })
      .catch(console.error);
  }, []);

  const handleAutoGenerate = () => {
    const hasExisting = Object.keys(assignments).length > 0;
    if (autoMode ==='full' && hasExisting) {
      setConfirmDialog('full');
      return;
    }
    generateAutoAssign(teachers, mappedStudents, locations, {}, config, autoMode);
  };

  const handleApply = () => {
    applyPreview();
    setConfirmDialog(null);
  };

  // Options for filter
  const kelasOptions = useMemo(() => ['Semua', ...Array.from(new Set(mappedStudents.map(s => s.kelasFix))).filter(Boolean)], [mappedStudents]);
  const jurusanOptions = useMemo(() => ['Semua', ...Array.from(new Set(mappedStudents.map(s => s.jurusanFix))).filter(Boolean)], [mappedStudents]);

  // Filter students based on search/filters
  const filteredStudents = useMemo(() => {
    return mappedStudents.filter(s => {
      const matchSearch = s.namaFix.toLowerCase().includes(searchQuery.toLowerCase()) || (s.nis && String(s.nis).includes(searchQuery));
      const matchKelas = filterKelas ==='Semua' || s.kelasFix === filterKelas;
      const matchJurusan = filterJurusan ==='Semua' || s.jurusanFix === filterJurusan;
      return matchSearch && matchKelas && matchJurusan;
    });
  }, [mappedStudents, searchQuery, filterKelas, filterJurusan]);

  // Group filtered students by perusahaan
  const studentsByCompany = useMemo(() => {
    const groups = {};
    filteredStudents.forEach(s => {
      const locId = s.perusahaanId || s.lokasiId ||'unassigned';
      if (!groups[locId]) groups[locId] = [];
      groups[locId].push(s);
    });
    return groups;
  }, [filteredStudents]);

  const setPage = (locId, pageNum) => {
    setPages(prev => ({ ...prev, [locId]: pageNum }));
  };

  const handleBulkAssign = (locId, guruId) => {
    if (!guruId) return;
    const studentsInCompany = studentsByCompany[locId] || [];
    const selectedInCompany = studentsInCompany.filter(s => selectedStudents.has(s.uniqueId));
    const targetStudents = selectedInCompany.length > 0 ? selectedInCompany : studentsInCompany;
    
    targetStudents.forEach(s => {
      assignManual(s.uniqueId, guruId);
    });
    
    if (selectedInCompany.length > 0) {
      setSelectedStudents(prev => {
        const next = new Set(prev);
        selectedInCompany.forEach(s => next.delete(s.uniqueId));
        return next;
      });
    }
  };

  const handleDeleteSelected = (locId) => {
    const studentsInCompany = studentsByCompany[locId] || [];
    const selectedInCompany = studentsInCompany.filter(s => selectedStudents.has(s.uniqueId));
    selectedInCompany.forEach(s => unassign(s.uniqueId));
    
    setSelectedStudents(prev => {
      const next = new Set(prev);
      selectedInCompany.forEach(s => next.delete(s.uniqueId));
      return next;
    });
  };

  // Optimize Teacher Options by memoizing them per major
  const teacherOptionsCache = useMemo(() => {
    const cache = {};
    jurusanOptions.forEach(major => {
      if (major ==='Semua') return;
      
      const options = teachers.map(g => {
        const isMatch = major && (g.jurusan || g.major || g.preferredMajor) === major;
        return {
          value: String(g.code),
          label: `${g.nama || g.name} ${isMatch ?'(Rekomendasi)' :''} - (${load[g.code] || 0}/${kapasitasGuru[g.code] || 5})`,
          disabled: (sisaKap[g.code] || 5) <= 0,
          isMatch
        };
      });
      
      options.sort((a, b) => b.isMatch - a.isMatch);
      cache[major] = [{ value:"", label:"-- Pilih Guru --" }, ...options];
    });
    
    // Default fallback when major is undefined or not in cache
    const defaultOptions = teachers.map(g => ({
      value: String(g.code),
      label: `${g.nama || g.name} - (${load[g.code] || 0}/${kapasitasGuru[g.code] || 5})`,
      disabled: (sisaKap[g.code] || 5) <= 0,
      isMatch: false
    }));
    cache['default'] = [{ value:"", label:"-- Pilih Guru --" }, ...defaultOptions];

    return cache;
  }, [teachers, jurusanOptions, load, kapasitasGuru, sisaKap]);

  const getTeacherOptions = (targetJurusan) => {
    if (!targetJurusan || !teacherOptionsCache[targetJurusan]) return teacherOptionsCache['default'];
    return teacherOptionsCache[targetJurusan];
  };

  const stats = [
    { label:'Total Siswa', value: mappedStudents.length, icon: Users, iconBg:'bg-[var(--ui-primary)]/10', iconColor:'text-[var(--ui-primary)]' },
    { label:'Sudah Ditugaskan', value: mappedStudents.length - unassigned.length, icon: CheckCircle2, iconBg:'bg-emerald-100', iconColor:'text-emerald-600' },
    { label:'Belum Ditugaskan', value: unassigned.length, icon: AlertTriangle, iconBg:'bg-amber-100', iconColor:'text-amber-600' },
  ];

  const tabs = [
    { id:'manual', label:'Berdasarkan Perusahaan', icon: Building2 },
    ...(readOnly ? [] : [{ id:'auto', label:'Auto-Assign', icon: Wand2 }]),
  ];

  return (
    <div className="space-y-4">
      <PageHeader 
        icon={UserCheck}
        title="Penugasan Guru Pembimbing"
        description="Tugaskan guru ke siswa secara manual per perusahaan atau otomatis."
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      <div className="grid grid-cols-3 gap-3">
        {stats.map(s => <StatCard key={s.label} {...s} />)}
      </div>

      {/* ── MANUAL TAB (BY COMPANY) ── */}
      {activeTab ==='manual' && (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 text-blue-700 p-4 rounded-[var(--ui-radius-small)] flex gap-3 text-sm">
            <Info className="flex-shrink-0" size={18} />
            <p>Anda sekarang dapat menugaskan satu pembimbing untuk semua siswa di dalam satu perusahaan sekaligus. Cukup pilih guru di dropdown utama perusahaan.</p>
          </div>

          {/* Filters - Click Based pills */}
          <div className="ui-card p-4 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Cari nama atau NIS siswa..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border-none rounded-[var(--ui-radius-small)] text-sm focus:border-[var(--ui-primary)] focus:ring-1 focus:ring-[var(--ui-primary)] outline-none"
              />
            </div>
            <div className="flex flex-col gap-3 pt-1 border-t border-slate-100">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest min-w-[70px]">Kelas:</span>
                <div className="flex flex-wrap gap-1.5">
                  {kelasOptions.map(k => (
                    <Button variant="outline"
                      key={k}
                      type="button"
                      onClick={() =>setFilterKelas(k)}
                      className={`cursor-pointer`}
                    >
                      {k ==='Semua' ?'Semua Kelas' : k}</Button>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest min-w-[70px]">Jurusan:</span>
                <div className="flex flex-wrap gap-1.5">
                  {jurusanOptions.map(j => (
                    <Button variant="outline"
                      key={j}
                      type="button"
                      onClick={() =>setFilterJurusan(j)}
                      className={`cursor-pointer`}
                    >
                      {j ==='Semua' ?'Semua Jurusan' : j}</Button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {Object.entries(studentsByCompany).map(([locId, compStudents]) => {
            const currentPage = pages[locId] || 1;
            const totalPages = Math.ceil(compStudents.length / ITEMS_PER_PAGE);
            
            // Pagination slice
            const paginatedStudents = compStudents.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

            const locName = locId ==='unassigned' ?'Belum Memiliki Lokasi PKL' : 
                            (locations.find(l => String(l.id) === String(locId))?.nama_perusahaan || locations.find(l => String(l.id) === String(locId))?.nama ||'Perusahaan Tidak Diketahui');
            
            // Derive a common major to recommend teachers
            const commonMajor = compStudents[0]?.jurusanFix;
            
            // Check if all students in this company have the same teacher
            const allAssignedTo = compStudents.length > 0 ? assignments[compStudents[0].uniqueId] : null;
            const isUniformlyAssigned = allAssignedTo && compStudents.every(s => assignments[s.uniqueId] === allAssignedTo);

            return (
              <div key={locId} className="ui-card overflow-hidden">
                {/* Header Perusahaan */}
                <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    {!readOnly && (
                    <input 
                      type="checkbox"
                      checked={compStudents.length > 0 && compStudents.every(s => selectedStudents.has(s.uniqueId))}
                      onChange={() => toggleSelectAll(locId)}
                      className="w-4 h-4 text-[var(--ui-primary)] rounded-[var(--ui-radius-small)] border-slate-300 focus:ring-[var(--ui-primary)]"
                    />
                    )}
                    <div className="w-10 h-10 rounded-full bg-[var(--ui-primary)]/10 flex items-center justify-center text-[var(--ui-primary)]">
                      <Building2 size={20} />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800">{locName}</h3>
                      <p className="text-xs text-slate-500">{compStudents.length} Siswa</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    {!readOnly && compStudents.some(s => selectedStudents.has(s.uniqueId)) && (
                      <Button variant="outline"
                        onClick={() =>handleDeleteSelected(locId)}
                        className="flex items-center gap-2"
                      >
                        <X size={14} />
                        Hapus Terpilih</Button>
                    )}
                    {!readOnly && (
                    <div className="w-[250px]">
                      <ClickPicker
                        value={isUniformlyAssigned ? allAssignedTo :''}
                        onChange={val => handleBulkAssign(locId, val)}
                        options={getTeacherOptions(commonMajor)}
                        placeholder="Pilih Guru Pembimbing"
                      />
                    </div>
                    )}
                  </div>
                </div>

                {/* List Siswa Selalu Terbuka */}
                <div className="divide-y divide-slate-100">
                  {paginatedStudents.map((s, index) => {
                    const assigned = assignments[s.uniqueId];
                    return (
                      <div key={s.uniqueId} className="flex items-center gap-4 px-6 py-3">
                        {!readOnly && (
                        <input 
                          type="checkbox"
                          checked={selectedStudents.has(s.uniqueId)}
                          onChange={() => toggleSelectStudent(s.uniqueId)}
                          className="w-4 h-4 text-[var(--ui-primary)] rounded-[var(--ui-radius-small)] border-slate-300 focus:ring-[var(--ui-primary)]"
                        />
                        )}
                        <div className="w-8 text-center text-xs font-bold text-slate-400">
                          {(currentPage - 1) * ITEMS_PER_PAGE + index + 1}
                        </div>
                        <Avatar name={s.namaFix} size="sm" />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-slate-800 text-sm">{s.namaFix}</p>
                          <p className="text-xs text-slate-400">{s.nis ? `${s.nis} · ` :''}{s.kelasFix}</p>
                        </div>
                        <Badge variant={s.jurusanFix} label={s.jurusanFix} withDot={false} />
                        <div className="flex items-center gap-2">
                          <div className="w-[220px]">
                            {assigned && !editingRows.has(s.uniqueId) ? (
                              <div className="flex items-center justify-between border border-emerald-200 bg-emerald-50 px-3 py-2 rounded-[var(--ui-radius-small)] min-h-9">
                                <span className="text-xs font-semibold text-emerald-800 truncate pr-2">
                                  {teachers.find(g => String(g.code) === String(assigned))?.nama || teachers.find(g => String(g.code) === String(assigned))?.name || assigned}
                                </span>
                                {!readOnly && (
                                  <div className="flex gap-2">
                                    <Button variant="outline"
                                      type="button"
                                      onClick={() =>setEditingRows(prev => new Set([...prev, s.uniqueId]))}
                                      
                                      title="Edit Penugasan"
                                    >
                                      <Edit2 size={14} /></Button>
                                    <Button variant="outline"
                                      type="button"
                                      onClick={() =>unassign(s.uniqueId)}
                                      
                                      title="Hapus Penugasan"
                                    >
                                      <X size={14} /></Button>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <>
                                {readOnly ? (
                                  <span className="text-[11px] text-slate-400 italic">Belum ditugaskan</span>
                                ) : (
                                  <ClickPicker
                                    value={assigned ? String(assigned) :''}
                                    onChange={val => {
                                      if (val ==='') unassign(s.uniqueId);
                                      else assignManual(s.uniqueId, val);
                                      
                                      if (val !=='') {
                                        setEditingRows(prev => {
                                          const next = new Set(prev);
                                          next.delete(s.uniqueId);
                                          return next;
                                        });
                                      }
                                    }}
                                    options={getTeacherOptions(s.jurusanFix)}
                                    placeholder="Pilih Guru Pembimbing"
                                  />
                                )}
                              </>
                            )}
                          </div>
                          <span className="w-5 h-5 flex-shrink-0">
                            {assigned ? <CheckCircle2 size={18} className="text-emerald-500" /> : null}
                          </span>
                        </div>
                      </div>
                    );
                  })}

                  {/* Pagination Controls */}
                  {totalPages > 1 && (
                    <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                      <p className="text-xs text-slate-500">
                        Menampilkan {((currentPage - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, compStudents.length)} dari {compStudents.length} siswa
                      </p>
                      <div className="flex items-center gap-1">
                        <Button variant="outline"
                          disabled={currentPage === 1}
                          onClick={() =>setPage(locId, currentPage - 1)}
                          
                        >
                          <ChevronLeft size={16} /></Button>
                        <span className="text-xs font-semibold px-2 text-slate-700">Halaman {currentPage} / {totalPages}</span>
                        <Button variant="outline"
                          disabled={currentPage === totalPages}
                          onClick={() =>setPage(locId, currentPage + 1)}
                          
                        >
                          <ChevronRight size={16} /></Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          
          {Object.keys(studentsByCompany).length === 0 && (
            <div className="ui-card text-center py-10">
              <p className="text-slate-500 font-medium">Tidak ada siswa yang cocok dengan filter pencarian.</p>
            </div>
          )}
        </div>
      )}

      {/* ── AUTO ASSIGN TAB ── */}
      {activeTab ==='auto' && (
        <div className="space-y-4">
          {/* Info algoritma */}
          <div className="flex items-start gap-3 bg-[var(--ui-primary)]/10 border border-[var(--ui-primary)]/20 rounded-[var(--ui-radius-small)] p-3">
            <Info size={15} className="text-[var(--ui-primary)] mt-0.5 flex-shrink-0" />
            <div className="text-xs text-[var(--ui-primary)] space-y-1">
              <p className="font-bold mb-1">Algoritma Auto-Assign:</p>
              <p>1. Filter berdasarkan <strong>kesamaan jurusan</strong> (soft constraint)</p>
              <p>2. Prioritas guru dengan <strong>kapasitas sisa terbanyak</strong></p>
              <p>3. Jika kapasitas sama: pilih guru dengan <strong>jarak lebih dekat</strong> ke lokasi perusahaan siswa</p>
              <p>4. Jika jarak sama: urutan <strong>alfabetis nama guru</strong></p>
            </div>
          </div>

          {/* Mode selector */}
          <div className="ui-card p-4">
            <p className="text-sm font-bold text-slate-800 mb-3">Pengaturan Algoritma</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-5 pb-5 border-b border-slate-100">
              <label className="flex items-start gap-3 cursor-pointer group">
                <div className="relative flex items-center justify-center mt-0.5">
                  <input type="checkbox" className="peer sr-only" 
                    checked={config.prioritasWaliKelas} 
                    onChange={e => setConfig({...config, prioritasWaliKelas: e.target.checked})} />
                  <div className="w-5 h-5 border-2 border-slate-300 rounded-[var(--ui-radius-small)] peer-checked:bg-[var(--ui-primary)] peer-checked:border-[var(--ui-primary)] transition-all"></div>
                  <CheckCircle2 size={14} className="absolute text-white opacity-0 peer-checked:opacity-100 scale-50 peer-checked:scale-100 transition-all duration-200" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-700 group-hover:text-slate-900 transition-colors">Prioritas Wali Kelas</p>
                  <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">Utamakan guru jika ia adalah wali kelas siswa tersebut.</p>
                </div>
              </label>

              <label className="flex items-start gap-3 cursor-pointer group">
                <div className="relative flex items-center justify-center mt-0.5">
                  <input type="checkbox" className="peer sr-only" 
                    checked={config.pemerataanArea} 
                    onChange={e => setConfig({...config, pemerataanArea: e.target.checked})} />
                  <div className="w-5 h-5 border-2 border-slate-300 rounded-[var(--ui-radius-small)] peer-checked:bg-[var(--ui-primary)] peer-checked:border-[var(--ui-primary)] transition-all"></div>
                  <CheckCircle2 size={14} className="absolute text-white opacity-0 peer-checked:opacity-100 scale-50 peer-checked:scale-100 transition-all duration-200" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-700 group-hover:text-slate-900 transition-colors">Pemerataan Area Jarak</p>
                  <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">Tugaskan guru ke area/perusahaan yang saling berdekatan.</p>
                </div>
              </label>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Batas Kapasitas per Guru</label>
                <div className="flex items-center gap-2">
                  <input type="text" inputMode="numeric" 
                    value={config.kapasitasGlobal}
                    onChange={e => setConfig({...config, kapasitasGlobal: parseInt(e.target.value.replace(/[^0-9]/g,'')) || 5})}
                    className="w-20 px-3 py-2 text-sm border-none rounded-[var(--ui-radius-small)] focus:border-[var(--ui-primary)] focus:ring-1 focus:ring-[var(--ui-primary)] outline-none" />
                  <span className="text-xs text-slate-500">Siswa / Guru</span>
                </div>
              </div>
            </div>

            <p className="text-sm font-bold text-slate-800 mb-3">Mode Penugasan</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { key:'incremental', label:'Hanya Siswa Baru', desc:'Tambah guru hanya untuk siswa yang belum ditugaskan (aman)' },
                { key:'full',        label:'Reset & Assign Ulang', desc:'Hapus semua penugasan dan buat ulang dari awal' },
              ].map(m => (
                <Button variant="outline" key={m.key} onClick={() =>setAutoMode(m.key)}
                  className={`text-left`}>
                  <p className={`font-bold text-sm mb-1 ${autoMode === m.key ?'text-[var(--ui-primary)]' :'text-slate-800'}`}>{m.label}</p>
                  <p className="text-xs text-slate-400">{m.desc}</p></Button>
              ))}
            </div>
          </div>

          {/* Generate button */}
          {!previewAssignments && (
            <button onClick={handleAutoGenerate}
              className="flex items-center gap-2.5">
              <Wand2 size={18} /> Generate Penugasan Otomatis
            </button>
          )}

          {/* Preview hasil */}
          {autoAssignResult && (
            <div className="ui-card overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <p className="font-bold text-slate-800">Preview Hasil Auto-Assign</p>
                  <p className="text-xs text-slate-400 mt-0.5">Tinjau sebelum diterapkan. Anda bisa override manual jika perlu.</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={cancelPreview} >Batalkan</Button>
                  <button onClick={handleApply}
                    className="flex items-center gap-2">
                    <CheckCircle2 size={14} /> Terapkan
                  </button>
                </div>
              </div>

              <div className="divide-y divide-slate-200">
                {autoAssignResult.map(item => {
                  const siswa = mappedStudents.find(s => s.uniqueId === item.siswaId);
                  const guru  = teachers.find(g => String(g.code) === String(item.guruId || item.guruCode));
                  return (
                    <div key={item.siswaId} className="flex items-center gap-4 px-5 py-3.5">
                      <Avatar name={siswa?.namaFix ||'?'} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-800">{siswa?.namaFix}</p>
                        <p className="text-xs text-slate-400">{siswa?.kelasFix}</p>
                      </div>
                      <div className="text-right">
                        {item.guruId ? (
                          <>
                            <p className="text-sm font-semibold text-[var(--ui-primary)]">{guru?.nama || guru?.name}</p>
                            {item.skorDetail?.[0] && (
                              <p className="text-[10px] text-slate-400">
                                Sisa: {item.skorDetail[0].sisaKap} slot ·{''}
                                {item.skorDetail[0].jarak > 0 ? `${item.skorDetail[0].jarak}m` :'sekolah'}
                              </p>
                            )}
                          </>
                        ) : (
                          <span className="text-xs text-red-500 font-semibold">
                            {item.reason ==='no_guru_jurusan' ?'Tidak ada guru jurusan ini' :'Kapasitas penuh'}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Confirm reset modal */}
      {confirmDialog ==='full' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setConfirmDialog(null)} />
          <div className="relative bg-white rounded-[var(--ui-radius-card)] p-6 max-w-sm w-full shadow-sm z-10">
            <div className="w-12 h-12 bg-amber-100 rounded-[var(--ui-radius-small)] flex items-center justify-center mb-4">
              <AlertTriangle size={22} className="text-amber-600" />
            </div>
            <h3 className="font-bold text-slate-800 mb-2">Reset Semua Penugasan?</h3>
            <p className="text-sm text-slate-400 mb-5">
              Semua penugasan guru yang ada akan dihapus dan dibuat ulang. Tindakan ini hanya bisa dibatalkan sebelum Anda menekan"Terapkan".
            </p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() =>setConfirmDialog(null)}
                className="flex-1">
                Batal</Button>
              <Button variant="outline" onClick={() =>{ setConfirmDialog(null); generateAutoAssign(teachers, mappedStudents, locations, {}, config,'full'); }}
                className="flex-1">
                Ya, Lanjutkan</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PenugasanGuru;
