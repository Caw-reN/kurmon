import React, { useState, useMemo } from 'react';
import { Button } from '../../../components/ui.jsx';
import { BookOpenText, Search, Download, Upload, RefreshCw, Plus, FileText, BookOpen, ChevronRight, Edit2, Trash2, Calendar, Sparkles, Layers, CheckCircle2, User, X } from 'lucide-react';
import { useAppStore } from '../../../store/useAppStore';
import { PageHeader } from '../../../components/monitoring/ui/index.js';
import { downloadFile } from '../../../utils/fileHelper.js';

const EMPTY_ARRAY = [];
const EMPTY_OBJECT = {};

export default function TabSilabus(props) {
  const storeSyllabuses = useAppStore((state) => state.syllabuses) || EMPTY_ARRAY;
  const storeCategories = useAppStore((state) => state.syllabusCategories) || EMPTY_ARRAY;
  const storeTeachers = useAppStore((state) => state.teachers) || EMPTY_ARRAY;
  const currentUser = useAppStore((state) => state.currentUser) || EMPTY_OBJECT;

  const syllabuses = props.syllabuses || storeSyllabuses;
  const syllabusCategories = props.syllabusCategories || storeCategories;
  const teachers = props.teachers || storeTeachers;

  // ── Local Fallback States ────────────────────────────────────
  const [localSearch, setLocalSearch] = useState('');
  const [localSubject, setLocalSubject] = useState('');
  const [localId, setLocalId] = useState('');

  const silabusSearchTerm = props.silabusSearchTerm !== undefined ? props.silabusSearchTerm : localSearch;
  const setSilabusSearchTerm = props.setSilabusSearchTerm || setLocalSearch;

  const selectedSilabusSubject = props.selectedSilabusSubject !== undefined ? props.selectedSilabusSubject : localSubject;
  const setSelectedSilabusSubject = props.setSelectedSilabusSubject || setLocalSubject;

  const selectedSilabusId = props.selectedSilabusId !== undefined ? props.selectedSilabusId : localId;
  const setSelectedSilabusId = props.setSelectedSilabusId || setLocalId;

  const openModal = props.openModal || ((type, mode, data) => {
    console.log('Open modal:', type, mode, data);
    alert(`Buka formulir: ${type} (${mode})`);
  });

  const downloadTeacherTemplate = props.downloadTeacherTemplate || (() => {
    alert('Mengunduh template penyusunan RPP...');
  });

  const handleRemoveSyllabusSafe = props.handleRemoveSyllabusSafe || ((id) => {
    if (window.confirm('Hapus modul ajar / pertemuan ini?')) {
      const updated = syllabuses.filter(s => s.id !== id);
      useAppStore.setState({ syllabuses: updated });
    }
  });

  const normalizeText = (value) => String(value ?? '').trim().replace(/\s+/g, '').toLowerCase();

  // ── Processed Syllabuses Data ────────────────────────────────
  const sortedSyllabuses = useMemo(() => {
    return [...syllabuses].sort((a, b) => {
      const aValue = `${a.subjectName || ''} ${a.teacherCode || ''} ${a.title || ''}`;
      const bValue = `${b.subjectName || ''} ${b.teacherCode || ''} ${b.title || ''}`;
      return aValue.localeCompare(bValue, 'id', { sensitivity: 'base' });
    });
  }, [syllabuses]);

  const filteredSyllabuses = useMemo(() => {
    return sortedSyllabuses.filter((s) => {
      if (!silabusSearchTerm || !String(silabusSearchTerm).trim()) return true;
      const catName = syllabusCategories?.find((c) => c.id === s.categoryId)?.name || '';
      return normalizeText([
        s.subjectName || '',
        s.teacherCode || '',
        s.title || '',
        s.gradeSemester || '',
        s.objectives || '',
        s.materials || '',
        s.notes || '',
        catName,
      ].join('')).includes(normalizeText(silabusSearchTerm));
    });
  }, [sortedSyllabuses, silabusSearchTerm, syllabusCategories]);

  const subjectCount = useMemo(() => new Set(syllabuses.map((s) => s.subjectName).filter(Boolean)).size, [syllabuses]);
  const teacherCount = useMemo(() => new Set(syllabuses.map((s) => s.teacherCode).filter(Boolean)).size, [syllabuses]);
  const noteCount = useMemo(() => syllabuses.filter((s) => String(s.notes || '').trim()).length, [syllabuses]);
  const categoryCount = syllabusCategories?.length || 0;
  const spotlightSyllabuses = useMemo(() => filteredSyllabuses.slice(0, 3), [filteredSyllabuses]);

  const groupedSyllabuses = useMemo(() => {
    return filteredSyllabuses.reduce((acc, item) => {
      const key = item.subjectName || 'Tanpa Mata Pelajaran';
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    }, {});
  }, [filteredSyllabuses]);

  const groupedSubjectNames = useMemo(() => {
    return Object.keys(groupedSyllabuses).sort((a, b) => a.localeCompare(b, 'id', { sensitivity: 'base' }));
  }, [groupedSyllabuses]);

  const activeSilabusSubject = groupedSubjectNames.includes(selectedSilabusSubject) 
    ? selectedSilabusSubject 
    : (groupedSubjectNames[0] || '');

  const activeSilabusMeetings = useMemo(() => {
    return activeSilabusSubject ? groupedSyllabuses[activeSilabusSubject] || [] : [];
  }, [activeSilabusSubject, groupedSyllabuses]);

  const activeSilabus = useMemo(() => {
    return activeSilabusMeetings.find((item) => item.id === selectedSilabusId) || activeSilabusMeetings[0] || null;
  }, [activeSilabusMeetings, selectedSilabusId]);

  const activeSilabusIndex = activeSilabus 
    ? Math.max(activeSilabusMeetings.findIndex((item) => item.id === activeSilabus.id), 0) 
    : -1;

  const activeSilabusCategory = activeSilabus 
    ? syllabusCategories?.find((c) => c.id === activeSilabus.categoryId) 
    : null;

  return (
    <div className="flex flex-col gap-4 h-full w-full animate-in fade-in duration-300 relative z-10">
      {!props.hideHeader && (
        <PageHeader 
          title="Penyusunan RPP (Silabus)"
          icon={BookOpenText}
          description="Kelola materi, tujuan pembelajaran, dan panduan untuk setiap pertemuan."
        />
      )}

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-4 rounded-[var(--ui-radius-card)] bg-white border border-slate-200/80 shadow-[var(--ui-shadow-card)] flex items-center gap-3">
          <div className="w-10 h-10 rounded-[var(--ui-radius-control)] bg-[var(--ui-primary)]/10 text-[var(--ui-primary)] flex items-center justify-center shrink-0">
            <FileText size={18} strokeWidth={2.5} />
          </div>
          <div className="min-w-0">
            <p className="text-xl sm:text-2xl font-black text-slate-800 leading-tight">{syllabuses.length}</p>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mt-0.5">Total Draft RPP</p>
          </div>
        </div>

        <div className="p-4 rounded-[var(--ui-radius-card)] bg-white border border-slate-200/80 shadow-[var(--ui-shadow-card)] flex items-center gap-3">
          <div className="w-10 h-10 rounded-[var(--ui-radius-control)] bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <BookOpen size={18} strokeWidth={2.5} />
          </div>
          <div className="min-w-0">
            <p className="text-xl sm:text-2xl font-black text-emerald-700 leading-tight">{subjectCount}</p>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mt-0.5">Mata Pelajaran</p>
          </div>
        </div>

        <div className="p-4 rounded-[var(--ui-radius-card)] bg-white border border-slate-200/80 shadow-[var(--ui-shadow-card)] flex items-center gap-3">
          <div className="w-10 h-10 rounded-[var(--ui-radius-control)] bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <User size={18} strokeWidth={2.5} />
          </div>
          <div className="min-w-0">
            <p className="text-xl sm:text-2xl font-black text-amber-700 leading-tight">{teacherCount}</p>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mt-0.5">Guru Terlibat</p>
          </div>
        </div>

        <div className="p-4 rounded-[var(--ui-radius-card)] bg-white border border-slate-200/80 shadow-[var(--ui-shadow-card)] flex items-center gap-3">
          <div className="w-10 h-10 rounded-[var(--ui-radius-control)] bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <Layers size={18} strokeWidth={2.5} />
          </div>
          <div className="min-w-0">
            <p className="text-xl sm:text-2xl font-black text-purple-700 leading-tight">{noteCount + categoryCount}</p>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mt-0.5 truncate">Kategori & Catatan</p>
          </div>
        </div>
      </div>

      {/* Main Controls Card */}
      <div className="p-4 sm:p-5 rounded-[var(--ui-radius-card)] bg-white border border-slate-200/80 shadow-[var(--ui-shadow-card)] space-y-3.5">
        <div className="flex flex-col lg:flex-row gap-3 lg:items-center justify-between">
          
          {/* Search Input */}
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={silabusSearchTerm}
              onChange={(e) => setSilabusSearchTerm(e.target.value)}
              className="w-full pl-9 pr-7 py-2 bg-[var(--ui-surface-muted)] hover:bg-white border border-[var(--ui-border-soft)] rounded-[var(--ui-radius-control)] text-xs font-bold text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-[var(--ui-primary)]"
              placeholder="Cari mapel, guru, judul materi, atau kategori..."
            />
            {silabusSearchTerm && (
              <button 
                type="button" 
                onClick={() => setSilabusSearchTerm('')} 
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={downloadTeacherTemplate}
              className="text-xs font-bold gap-1.5"
            >
              <Download size={13} /> Template
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => openModal('bulk', 'add')}
              className="text-xs font-bold gap-1.5"
            >
              <Upload size={13} /> Import Excel
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => openModal('silabus_batch', 'add')}
              className="text-xs font-bold gap-1.5"
            >
              <RefreshCw size={13} /> Isi Banyak
            </Button>
            <Button 
              variant="primary" 
              size="sm"
              onClick={() => openModal('silabus', 'add', activeSilabus ? { 
                subjectName: activeSilabus.subjectName, 
                teacherCode: activeSilabus.teacherCode, 
                gradeSemester: activeSilabus.gradeSemester, 
                categoryId: activeSilabus.categoryId 
              } : undefined)}
              className="text-xs font-bold gap-1.5 shadow-[var(--ui-shadow-control)]"
            >
              <Plus size={13} /> + Tambah RPP
            </Button>
          </div>
        </div>
      </div>

      {/* Spotlight Recent Modules */}
      {spotlightSyllabuses.length > 0 && (
        <div className="p-4 rounded-[var(--ui-radius-card)] bg-slate-50 border border-slate-200/80 space-y-2.5">
          <div className="flex items-center gap-2">
            <FileText size={15} className="text-[var(--ui-primary)]" />
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Modul Ajar Terbaru</h3>
            <span className="ml-auto text-[10px] font-bold text-slate-400 bg-white px-2 py-0.5 rounded-[var(--ui-radius-small)]">
              {Math.min(spotlightSyllabuses.length, 3)} materi
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
            {spotlightSyllabuses.map((s) => {
              const cat = syllabusCategories?.find((c) => c.id === s.categoryId);
              return (
                <div key={s.id} className="rounded-[var(--ui-radius-control)] bg-white border border-slate-200 p-3.5 shadow-2xs space-y-1.5">
                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    {s.teacherCode || '-'} &bull; {s.gradeSemester || '-'}
                  </div>
                  <div className="font-black text-slate-800 text-xs sm:text-sm line-clamp-1">{s.title || 'Tanpa judul'}</div>
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <span className="px-2 py-0.5 rounded-[var(--ui-radius-small)] text-[9.5px] font-black uppercase tracking-wider bg-[var(--ui-primary)]/10 text-[var(--ui-primary)]">
                      {s.subjectName || 'Umum'}
                    </span>
                    {cat?.name && (
                      <span className="px-2 py-0.5 rounded-[var(--ui-radius-small)] text-[9.5px] font-black uppercase tracking-wider bg-slate-100 text-slate-600">
                        {cat.name}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Subjects and Meetings Panel */}
      <div className="p-4 sm:p-5 rounded-[var(--ui-radius-card)] bg-white border border-slate-200/80 shadow-[var(--ui-shadow-card)] flex flex-col flex-1">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2 border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-base font-black text-slate-800">Susunan Modul Ajar per Mapel</h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">Pilih mata pelajaran, lalu buka tab pertemuan di dalamnya.</p>
          </div>
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider bg-slate-100 px-2.5 py-1 rounded-[var(--ui-radius-small)]">
            {filteredSyllabuses.length} RPP Ditemukan
          </span>
        </div>

        {filteredSyllabuses.length === 0 ? (
          <div className="rounded-[var(--ui-radius-control)] border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
            <BookOpen size={36} className="mx-auto mb-2 text-slate-300" />
            <p className="text-xs font-bold text-slate-600">
              {silabusSearchTerm && silabusSearchTerm.trim() 
                ? 'Tidak ada modul ajar yang cocok dengan pencarian.' 
                : 'Belum ada modul ajar yang ditambahkan.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)] gap-4">
            
            {/* Subject Selector List */}
            <div className="rounded-[var(--ui-radius-control)] bg-[var(--ui-surface-muted)] p-2.5 border border-slate-200/70 overflow-hidden">
              <div className="flex items-center gap-1.5 px-2 py-1.5 mb-1">
                <BookOpenText size={14} className="text-[var(--ui-primary)]" />
                <p className="text-xs font-black text-slate-800">Mata Pelajaran ({groupedSubjectNames.length})</p>
              </div>

              <div className="space-y-1.5 max-h-[460px] overflow-y-auto custom-scrollbar pr-1">
                {groupedSubjectNames.map((subjectName) => {
                  const subjectItems = groupedSyllabuses[subjectName] || [];
                  const isActive = activeSilabusSubject === subjectName;
                  return (
                    <button
                      key={subjectName}
                      type="button"
                      onClick={() => {
                        setSelectedSilabusSubject(subjectName);
                        setSelectedSilabusId(subjectItems[0]?.id || '');
                      }}
                      className={`w-full text-left p-2.5 rounded-[var(--ui-radius-small)] transition-all cursor-pointer border ${
                        isActive 
                          ? 'bg-[var(--ui-primary)] text-white border-[var(--ui-primary)] shadow-xs' 
                          : 'bg-white text-slate-700 border-slate-200/80 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-extrabold text-xs leading-snug truncate">{subjectName}</span>
                        <ChevronRight size={13} className={isActive ? 'text-white' : 'text-slate-300'} />
                      </div>
                      <span className={`mt-0.5 block text-[10px] font-bold ${isActive ? 'text-white/80' : 'text-slate-400'}`}>
                        {subjectItems.length} pertemuan
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Meeting Detail Viewer */}
            <div className="rounded-[var(--ui-radius-control)] bg-white border border-slate-200/80 p-4 sm:p-5 min-w-0 flex flex-col justify-between">
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div>
                    <span className="text-[9.5px] font-black uppercase tracking-wider text-[var(--ui-primary)]">Detail Mata Pelajaran</span>
                    <h3 className="text-lg font-black text-slate-800 leading-tight">{activeSilabusSubject || 'Pilih Mata Pelajaran'}</h3>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => openModal('silabus', 'add', {
                        subjectName: activeSilabusSubject,
                        teacherCode: activeSilabus?.teacherCode || teachers[0]?.code || currentUser?.code || '',
                        gradeSemester: activeSilabus?.gradeSemester || 'X / Ganjil',
                        categoryId: activeSilabus?.categoryId || '',
                        title: `Pertemuan ${activeSilabusMeetings.length + 1}: `,
                      })}
                      className="text-xs font-bold gap-1"
                    >
                      <Plus size={12} /> Tambah Pertemuan
                    </Button>
                    {activeSilabus && (
                      <>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => openModal('silabus', 'edit', activeSilabus)}
                          className="text-xs font-bold gap-1"
                        >
                          <Edit2 size={12} /> Edit
                        </Button>
                        <button 
                          type="button"
                          onClick={() => handleRemoveSyllabusSafe(activeSilabus.id, activeSilabus)}
                          className="p-2 text-rose-600 hover:bg-rose-50 border border-slate-200 rounded-[var(--ui-radius-control)] cursor-pointer"
                          title="Hapus"
                        >
                          <Trash2 size={13} />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Horizontal Meeting Tabs */}
                <div className="mt-3.5 flex gap-2 overflow-x-auto no-scrollbar pb-1">
                  {activeSilabusMeetings.map((item, index) => {
                    const isActive = activeSilabus?.id === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setSelectedSilabusId(item.id)}
                        className={`shrink-0 text-left px-3 py-2 rounded-[var(--ui-radius-small)] border transition-all cursor-pointer ${
                          isActive 
                            ? 'bg-[var(--ui-primary)] text-white border-[var(--ui-primary)] shadow-2xs' 
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <span className="block text-xs font-black">Pertemuan {index + 1}</span>
                        <span className={`block text-[9.5px] font-bold truncate max-w-[130px] ${isActive ? 'text-white/80' : 'text-slate-400'}`}>
                          {item.title || 'Tanpa judul'}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Meeting Detail Card */}
                {activeSilabus ? (
                  <div className="mt-4 rounded-[var(--ui-radius-control)] bg-slate-50/80 border border-slate-200 p-4 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="bg-white border border-slate-200 px-2.5 py-0.5 rounded-[var(--ui-radius-small)] text-[10px] font-black uppercase text-slate-600">
                        Pertemuan {activeSilabusIndex + 1}
                      </span>
                      <span className="bg-[var(--ui-primary)]/10 text-[var(--ui-primary)] px-2.5 py-0.5 rounded-[var(--ui-radius-small)] text-[10px] font-black uppercase">
                        Guru: {activeSilabus.teacherCode || '-'}
                      </span>
                      <span className="bg-white border border-slate-200 px-2.5 py-0.5 rounded-[var(--ui-radius-small)] text-[10px] font-black uppercase text-slate-600">
                        {activeSilabus.gradeSemester || '-'}
                      </span>
                      {activeSilabusCategory && (
                        <span className="bg-white border border-slate-200 px-2.5 py-0.5 rounded-[var(--ui-radius-small)] text-[10px] font-black uppercase text-slate-600">
                          {activeSilabusCategory.name}
                        </span>
                      )}
                    </div>

                    <h4 className="text-base font-black text-slate-800">{activeSilabus.title || `Pertemuan ${activeSilabusIndex + 1}`}</h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                      <div className="rounded-[var(--ui-radius-small)] bg-white border border-slate-200/80 p-3">
                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">Tujuan Pembelajaran</p>
                        <p className="text-xs font-bold text-slate-700 leading-relaxed">{activeSilabus.objectives || '-'}</p>
                      </div>
                      <div className="rounded-[var(--ui-radius-small)] bg-white border border-slate-200/80 p-3">
                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">Catatan Khusus</p>
                        <p className="text-xs font-bold text-slate-700 leading-relaxed">{activeSilabus.notes || 'Tidak ada catatan khusus.'}</p>
                      </div>
                    </div>

                    <div className="rounded-[var(--ui-radius-small)] bg-white border border-slate-200/80 p-3">
                      <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">Materi Pembelajaran</p>
                      {activeSilabus.materials ? (
                        <div className="space-y-1.5">
                          {String(activeSilabus.materials).split('\n').map((line) => line.trim()).filter(Boolean).map((line, index) => (
                            <div key={`${activeSilabus.id}-material-${index}`} className="flex items-start gap-2 text-xs font-bold text-slate-700 bg-slate-50 p-2 rounded">
                              <span className="font-black text-[var(--ui-primary)]">{String.fromCharCode(65 + index)}.</span>
                              <span>{line}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs font-bold text-slate-400 italic">Belum ada materi pembelajaran.</p>
                      )}
                    </div>

                    {activeSilabus.pdfFile && (
                      <div className="rounded-[var(--ui-radius-small)] bg-white border border-slate-200/80 p-3 flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Lampiran PDF</p>
                          <p className="text-xs font-extrabold text-slate-700 truncate">{activeSilabus.pdfFile.name}</p>
                        </div>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => downloadFile(activeSilabus.pdfFile.base64, activeSilabus.pdfFile.name)}
                          className="text-xs font-bold gap-1 shrink-0"
                        >
                          <Download size={13} /> Unduh PDF
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="mt-4 rounded-[var(--ui-radius-control)] border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-xs font-bold text-slate-400">
                    Pilih mata pelajaran untuk melihat pertemuan.
                  </div>
                )}
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
