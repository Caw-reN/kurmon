import { useEffect, useState, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { loadInitialState } from '../utils/state.js';
import { getDatabaseSnapshot, subscribeDatabaseSnapshot } from '../utils/dataSource.js';
import { base64ToBlobUrl, downloadFile } from '../utils/fileHelper.js';
import { 
  BookOpenText, 
  Search, 
  BookOpen, 
  Eye, 
  Download, 
  X, 
  Video, 
  Globe, 
  Link2, 
  ExternalLink,
  LayoutGrid,
  LayoutList,
  FileText,
  User,
  Calendar,
  GraduationCap,
  Sparkles,
  FileDown,
  Clock,
  Layers,
  FileSpreadsheet
} from 'lucide-react';
import { UISelect, Button, Modal } from '../components/ui.jsx';

const CACHE_KEY = 'materi_ajar_cache_v1';
const VIEW_MODE_KEY = 'kurmon_materi_view_mode';

export default function MateriAjarPage() {
  const [searchParams] = useSearchParams();
  const initialSubject = searchParams.get('subject') || '';

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState(initialSubject);
  const [selectedSemester, setSelectedSemester] = useState('Semua');
  const [dataVersion, setDataVersion] = useState(0);
  
  // Pre-hydrate materi list from sessionStorage cache for instant 0ms render
  const [materiList, setMateriList] = useState(() => {
    try {
      const cached = sessionStorage.getItem(CACHE_KEY);
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });

  // View modes: 'tiles' | 'detail' | 'content'
  const [viewMode, setViewMode] = useState(() => {
    try {
      return localStorage.getItem(VIEW_MODE_KEY) || 'tiles';
    } catch {
      return 'tiles';
    }
  });

  const [previewDoc, setPreviewDoc] = useState(null);
  const [isLoading, setIsLoading] = useState(() => materiList.length === 0);
  
  // File cache & loading action tracking for on-demand fetch
  const [fileBlobCache, setFileBlobCache] = useState({});
  const [activeFileLoading, setActiveFileLoading] = useState(null); // { id, action: 'preview' | 'download' }

  useEffect(() => subscribeDatabaseSnapshot(() => setDataVersion(v => v + 1)), []);

  // Simpan preferensi view mode
  const handleSetViewMode = (mode) => {
    setViewMode(mode);
    try {
      localStorage.setItem(VIEW_MODE_KEY, mode);
    } catch {}
  };

  // Fetch materi ajar metadata cepat (tanpa payload file_url raksasa)
  useEffect(() => {
    let isMounted = true;
    fetch('/api/materi-ajar')
      .then(r => r.json())
      .then(res => {
        if (isMounted && res.ok && Array.isArray(res.data)) {
          setMateriList(res.data);
          try {
            sessionStorage.setItem(CACHE_KEY, JSON.stringify(res.data));
          } catch {}
        }
      })
      .catch(err => console.error('Error fetching materi ajar:', err))
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => { isMounted = false; };
  }, []);

  // Ambil file on-demand dari backend jika belum ada di cache
  const getOrFetchFileUrl = useCallback(async (item) => {
    if (item.file_url) return item.file_url;
    if (fileBlobCache[item.id]) return fileBlobCache[item.id];

    try {
      const res = await fetch(`/api/materi-ajar/${item.id}/file`);
      const json = await res.json();
      if (json.ok && json.data?.file_url) {
        setFileBlobCache(prev => ({ ...prev, [item.id]: json.data.file_url }));
        return json.data.file_url;
      }
    } catch (e) {
      console.error('Gagal mengambil file materi:', e);
    }
    return null;
  }, [fileBlobCache]);

  // Handler Preview PDF on-demand
  const handlePreviewPdf = async (item) => {
    setActiveFileLoading({ id: item.id, action: 'preview' });
    try {
      const fileUrl = await getOrFetchFileUrl(item);
      if (fileUrl) {
        const blobUrl = base64ToBlobUrl(fileUrl);
        setPreviewDoc({ url: blobUrl, title: item.judul });
      }
    } finally {
      setActiveFileLoading(null);
    }
  };

  // Handler Download PDF on-demand
  const handleDownloadFile = async (item) => {
    setActiveFileLoading({ id: item.id, action: 'download' });
    try {
      const fileUrl = await getOrFetchFileUrl(item);
      if (fileUrl) {
        downloadFile(fileUrl, item.nama_dokumen || `${item.judul}.pdf`);
      }
    } finally {
      setActiveFileLoading(null);
    }
  };

  const handleOpenLink = (item) => {
    if (item.link_url) {
      window.open(item.link_url, '_blank', 'noopener,noreferrer');
    }
  };

  const appSettings = useMemo(() => {
    void dataVersion;
    const defaults = {
      primaryColor: '#064e3b',
      accentColor: '#a3e635',
      fontFamily: 'Lexend',
      logoText: 'TS',
      appName: 'TimeSchedule',
      footerText: '© 2026 TimeSchedule by Admin.',
      contactEmail: 'admin@school.sch.id',
      contactPhone: '+62 123-456-789'
    };
    return { ...defaults, ...loadInitialState('appSettings', defaults) };
  }, [dataVersion]);

  const { primaryColor } = appSettings;

  const shellCard = "bg-white/70 backdrop-blur-xl rounded-[var(--ui-radius-card)] shadow-xs border border-slate-200/80";
  const searchFieldClass = "w-full bg-slate-50/80 border border-slate-200/80 rounded-[var(--ui-radius-control)] py-2 pl-9 pr-3 text-xs font-bold text-slate-700 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-[var(--ui-primary)] transition-all shadow-xs";

  // Build unique subject list from materi
  const subjectsList = useMemo(() => {
    const set = new Set();
    materiList.forEach(m => { if (m.mapel) set.add(m.mapel); });
    const masterSubjects = getDatabaseSnapshot().subjects || [];
    masterSubjects.forEach(s => {
      if (s.name) set.add(s.name);
      if (s.subjectName) set.add(s.subjectName);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [materiList, dataVersion]);

  const activeSubject = selectedSubject || '';

  const filteredMateri = useMemo(() => {
    return materiList.filter(m => {
      const matchSubject = !activeSubject || m.mapel?.toLowerCase() === activeSubject.toLowerCase();
      const matchSearch = !searchQuery ||
        m.judul?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.deskripsi?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.teacher_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.mapel?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchSemester = selectedSemester === 'Semua' ||
        m.semester?.toLowerCase() === selectedSemester.toLowerCase();
      return matchSubject && matchSearch && matchSemester;
    });
  }, [materiList, activeSubject, searchQuery, selectedSemester]);

  const getLinkIcon = (url) => {
    if (!url) return <Link2 size={14} />;
    if (url.includes('youtube.com') || url.includes('youtu.be')) return <Video size={14} className="text-rose-500 shrink-0" />;
    if (url.includes('drive.google.com')) return <Globe size={14} className="text-indigo-500 shrink-0" />;
    return <ExternalLink size={14} className="text-emerald-600 shrink-0" />;
  };

  const getLinkLabel = (url) => {
    if (!url) return 'Buka Link';
    if (url.includes('youtube.com') || url.includes('youtu.be')) return 'Tonton Video';
    if (url.includes('drive.google.com')) return 'Buka Google Drive';
    return 'Buka Tautan';
  };

  const formatFileSize = (bytes) => {
    if (!bytes || bytes <= 0) return '';
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (isoStr) => {
    if (!isoStr) return '';
    try {
      return new Date(isoStr).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return '';
    }
  };

  return (
    <div className="w-full animate-in fade-in duration-300 print-landscape relative">
      <div className={`${shellCard} w-full p-4 sm:p-6 flex flex-col gap-5 min-h-[550px]`}>
        
        {/* ACTIVE SUBJECT DETAILS PANEL */}
        <div className="flex flex-col gap-5 animate-in fade-in duration-300">
          
          {/* Header & Filter Controls Section */}
          <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4 pb-4 border-b border-slate-200/80 print-hidden">
            <div className="flex-grow">
              <span className="text-[10px] font-black tracking-widest text-slate-400 uppercase">E-Learning & Bahan Belajar</span>
              <div className="flex flex-wrap items-center gap-2.5 mt-0.5">
                <h2 className="text-lg sm:text-xl font-black text-slate-800 tracking-tight">
                  {activeSubject ? activeSubject : "Semua Materi Pelajaran"}
                </h2>
                <span className="text-xs font-black bg-[var(--ui-primary)]/10 text-[var(--ui-primary)] px-2.5 py-0.5 rounded-[var(--ui-radius-pill)] border border-[var(--ui-primary)]/20">
                  {filteredMateri.length} Materi
                </span>
              </div>
            </div>

            {/* Controls Bar: Filters & View Switcher */}
            <div className="flex flex-col sm:flex-row flex-wrap gap-2.5 items-end">
              
              {/* Mata Pelajaran Select */}
              <div className="flex flex-col gap-1 w-full sm:w-[190px]">
                <span className="text-[9.5px] font-black tracking-wider text-slate-400 uppercase">Mata Pelajaran</span>
                <UISelect
                  value={selectedSubject}
                  onChange={e => {
                    setSelectedSubject(e.target.value);
                    setSearchQuery('');
                  }}
                  className="w-full h-9.5 text-xs"
                >
                  <option value="">Semua Mata Pelajaran</option>
                  {subjectsList.map(subj => (
                    <option key={subj} value={subj}>{subj}</option>
                  ))}
                </UISelect>
              </div>

              {/* Semester Select */}
              <div className="flex flex-col gap-1 w-full sm:w-[110px]">
                <span className="text-[9.5px] font-black tracking-wider text-slate-400 uppercase">Semester</span>
                <UISelect
                  value={selectedSemester}
                  onChange={e => setSelectedSemester(e.target.value)}
                  className="w-full h-9.5 text-xs"
                >
                  <option value="Semua">Semua</option>
                  <option value="Ganjil">Ganjil</option>
                  <option value="Genap">Genap</option>
                </UISelect>
              </div>

              {/* Cari Sesi/Materi Search */}
              <div className="flex flex-col gap-1 w-full sm:w-[180px]">
                <span className="text-[9.5px] font-black tracking-wider text-slate-400 uppercase">Cari Materi</span>
                <div className="relative w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
                  <input
                    type="text"
                    placeholder="Kata kunci..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className={`${searchFieldClass} h-9.5 text-xs`}
                  />
                </div>
              </div>

              {/* View Switcher: Tiles | List/Detail | Content */}
              <div className="flex flex-col gap-1 shrink-0">
                <span className="text-[9.5px] font-black tracking-wider text-slate-400 uppercase">Tampilan</span>
                <div className="flex items-center bg-slate-100 p-0.5 rounded-[var(--ui-radius-control)] border border-slate-200/80 shadow-2xs h-9.5">
                  <button
                    type="button"
                    onClick={() => handleSetViewMode('tiles')}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-[calc(var(--ui-radius-control)-2px)] text-xs font-black transition-all cursor-pointer ${
                      viewMode === 'tiles'
                        ? 'bg-white text-slate-800 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                    title="Tampilan Ubin / Tiles"
                  >
                    <LayoutGrid size={13} />
                    <span className="hidden sm:inline">Tiles</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSetViewMode('detail')}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-[calc(var(--ui-radius-control)-2px)] text-xs font-black transition-all cursor-pointer ${
                      viewMode === 'detail'
                        ? 'bg-white text-slate-800 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                    title="Tampilan Daftar Rinci / Detail"
                  >
                    <LayoutList size={13} />
                    <span className="hidden sm:inline">Detail</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSetViewMode('content')}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-[calc(var(--ui-radius-control)-2px)] text-xs font-black transition-all cursor-pointer ${
                      viewMode === 'content'
                        ? 'bg-white text-slate-800 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                    title="Tampilan Konten Lengkap / Content"
                  >
                    <FileText size={13} />
                    <span className="hidden sm:inline">Content</span>
                  </button>
                </div>
              </div>

            </div>
          </div>

          {/* Page Body: Content Render */}
          {isLoading && materiList.length === 0 ? (
            /* Skeleton Shimmer Loading */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 py-4 animate-pulse">
              {[1, 2, 3, 4, 5, 6].map(n => (
                <div key={n} className="p-4 bg-slate-100/70 rounded-[var(--ui-radius-card)] border border-slate-200/60 h-44 flex flex-col justify-between">
                  <div className="space-y-2.5">
                    <div className="h-4 w-28 bg-slate-200 rounded" />
                    <div className="h-5 w-4/5 bg-slate-200 rounded" />
                    <div className="h-3.5 w-full bg-slate-200/80 rounded" />
                  </div>
                  <div className="h-8 bg-slate-200 rounded mt-3" />
                </div>
              ))}
            </div>
          ) : filteredMateri.length === 0 ? (
            /* Empty State */
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200/80 flex items-center justify-center text-slate-400 mb-3 shadow-2xs">
                <BookOpen size={28} />
              </div>
              <h4 className="text-base font-black text-slate-800 mb-1">Materi Tidak Ditemukan</h4>
              <p className="text-slate-500 text-xs max-w-sm mb-4 font-medium">
                {activeSubject 
                  ? `Materi pembelajaran untuk mata pelajaran "${activeSubject}" belum dipublikasikan.` 
                  : "Belum ada materi ajar yang dipublikasikan atau sesuai filter pencarian."}
              </p>
              {(activeSubject || searchQuery || selectedSemester !== 'Semua') && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedSubject('');
                    setSearchQuery('');
                    setSelectedSemester('Semua');
                  }}
                  className="text-xs font-bold"
                >
                  Reset Semua Filter
                </Button>
              )}
            </div>
          ) : (
            /* Selected View Mode */
            <div className="print-block">
              {viewMode === 'tiles' && (
                <TilesView 
                  items={filteredMateri} 
                  onPreview={handlePreviewPdf} 
                  onDownload={handleDownloadFile} 
                  onOpenLink={handleOpenLink}
                  activeFileLoading={activeFileLoading}
                  formatDate={formatDate}
                  formatFileSize={formatFileSize}
                  getLinkIcon={getLinkIcon}
                  getLinkLabel={getLinkLabel}
                />
              )}

              {viewMode === 'detail' && (
                <DetailView 
                  items={filteredMateri} 
                  onPreview={handlePreviewPdf} 
                  onDownload={handleDownloadFile} 
                  onOpenLink={handleOpenLink}
                  activeFileLoading={activeFileLoading}
                  formatDate={formatDate}
                  formatFileSize={formatFileSize}
                  getLinkIcon={getLinkIcon}
                />
              )}

              {viewMode === 'content' && (
                <ContentView 
                  items={filteredMateri} 
                  onPreview={handlePreviewPdf} 
                  onDownload={handleDownloadFile} 
                  onOpenLink={handleOpenLink}
                  activeFileLoading={activeFileLoading}
                  formatDate={formatDate}
                  formatFileSize={formatFileSize}
                  getLinkIcon={getLinkIcon}
                  getLinkLabel={getLinkLabel}
                />
              )}
            </div>
          )}

        </div>
      </div>

      {/* PDF PREVIEW MODAL */}
      {previewDoc && (
        <Modal
          isOpen={true}
          onClose={() => {
            if (previewDoc.url && previewDoc.url.startsWith('blob:')) {
              URL.revokeObjectURL(previewDoc.url);
            }
            setPreviewDoc(null);
          }}
          title={previewDoc.title}
          icon={<BookOpen size={20} className="text-emerald-600" />}
          width="4xl"
        >
          <div className="flex-1 bg-slate-900 p-2 relative flex items-center justify-center h-[72vh] rounded-[var(--ui-radius-small)]">
            <iframe
              src={previewDoc.url}
              title="Pratinjau Materi Ajar"
              className="w-full h-full border-none rounded-[var(--ui-radius-control)] bg-white shadow-inner"
            />
          </div>
        </Modal>
      )}
    </div>
  );
}

// ============================================================
// 1. TILES VIEW (Modern Grid Cards)
// ============================================================
function TilesView({ 
  items, 
  onPreview, 
  onDownload, 
  onOpenLink, 
  activeFileLoading, 
  formatDate, 
  formatFileSize,
  getLinkIcon,
  getLinkLabel 
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-in fade-in duration-200">
      {items.map((item) => {
        const isPdf = item.tipe === 'file' || item.has_file;
        const isPreviewing = activeFileLoading?.id === item.id && activeFileLoading.action === 'preview';
        const isDownloading = activeFileLoading?.id === item.id && activeFileLoading.action === 'download';

        return (
          <div
            key={item.id}
            className="p-4 bg-white/95 rounded-[var(--ui-radius-card)] border border-slate-200/80 shadow-[var(--ui-shadow-card)] hover:border-[var(--ui-primary)]/40 hover:shadow-md transition-all flex flex-col justify-between gap-3.5 group"
          >
            <div className="space-y-2.5">
              {/* Top Meta Badges */}
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {item.mapel && (
                    <span className="inline-flex px-2 py-0.5 rounded-[var(--ui-radius-small)] bg-emerald-50 text-emerald-800 text-[9.5px] font-black uppercase tracking-wider border border-emerald-200/60">
                      {item.mapel}
                    </span>
                  )}
                  {item.kelas_target ? (
                    <span className="inline-flex px-2 py-0.5 rounded-[var(--ui-radius-small)] bg-blue-50 text-blue-700 text-[9.5px] font-black uppercase tracking-wider border border-blue-200/60">
                      Kelas {item.kelas_target}
                    </span>
                  ) : (
                    <span className="inline-flex px-2 py-0.5 rounded-[var(--ui-radius-small)] bg-slate-100 text-slate-600 text-[9.5px] font-black uppercase tracking-wider">
                      Semua Kelas
                    </span>
                  )}
                </div>

                {item.semester && (
                  <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                    Sem. {item.semester}
                  </span>
                )}
              </div>

              {/* Title & Description */}
              <div>
                <h4 className="text-sm font-black text-slate-800 leading-snug line-clamp-2 group-hover:text-[var(--ui-primary)] transition-colors" title={item.judul}>
                  {item.judul}
                </h4>
                {item.deskripsi && (
                  <p className="text-[11px] text-slate-500 font-medium line-clamp-2 leading-relaxed mt-1">
                    {item.deskripsi}
                  </p>
                )}
              </div>

              {/* Teacher & Document Info */}
              <div className="pt-2 border-t border-slate-100 flex flex-col gap-1 text-[11px] text-slate-500 font-medium">
                <div className="flex items-center justify-between">
                  <span className="truncate">Guru: <b className="text-slate-700">{item.teacher_name}</b></span>
                  {item.uploaded_at && (
                    <span className="text-[10px] text-slate-400 shrink-0">{formatDate(item.uploaded_at)}</span>
                  )}
                </div>

                {/* Resource Indicator */}
                {isPdf ? (
                  <div className="flex items-center justify-between text-[10.5px] text-slate-400 pt-0.5">
                    <span className="truncate flex items-center gap-1 text-slate-600">
                      <FileText size={12} className="text-rose-500 shrink-0" />
                      <span className="truncate max-w-[150px]">{item.nama_dokumen || 'Dokumen PDF'}</span>
                    </span>
                    {item.file_size_bytes > 0 && (
                      <span className="text-[9.5px] font-bold text-slate-400">{formatFileSize(item.file_size_bytes)}</span>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-[10.5px] text-indigo-600 font-bold truncate pt-0.5">
                    {getLinkIcon(item.link_url)}
                    <span className="truncate">{item.link_url}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex gap-2">
              {isPdf ? (
                <>
                  <button
                    type="button"
                    onClick={() => onPreview(item)}
                    disabled={isPreviewing}
                    className="flex-1 py-1.5 px-2.5 rounded-[var(--ui-radius-control)] border border-slate-200 bg-slate-50 hover:bg-slate-100 active:scale-95 text-xs font-bold text-slate-700 flex items-center justify-center gap-1.5 cursor-pointer transition-all disabled:opacity-60"
                  >
                    {isPreviewing ? (
                      <div className="w-3.5 h-3.5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Eye size={13} />
                    )}
                    <span>Pratinjau</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onDownload(item)}
                    disabled={isDownloading}
                    className="flex-1 py-1.5 px-2.5 rounded-[var(--ui-radius-control)] bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-xs font-bold text-white flex items-center justify-center gap-1.5 shadow-xs cursor-pointer transition-all disabled:opacity-60"
                  >
                    {isDownloading ? (
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Download size={13} />
                    )}
                    <span>Unduh</span>
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => onOpenLink(item)}
                  className="w-full py-1.5 px-3 rounded-[var(--ui-radius-control)] bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 active:scale-95 text-xs font-bold text-white flex items-center justify-center gap-1.5 shadow-xs cursor-pointer transition-all"
                >
                  {getLinkIcon(item.link_url)}
                  <span>{getLinkLabel(item.link_url)}</span>
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================
// 2. DETAIL / LIST VIEW (Structured Table / Detailed Rows)
// ============================================================
function DetailView({ 
  items, 
  onPreview, 
  onDownload, 
  onOpenLink, 
  activeFileLoading, 
  formatDate, 
  formatFileSize,
  getLinkIcon 
}) {
  return (
    <div className="bg-white rounded-[var(--ui-radius-card)] border border-slate-200/80 shadow-[var(--ui-shadow-card)] overflow-hidden animate-in fade-in duration-200">
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-left border-collapse min-w-[700px]">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[10px] font-black uppercase tracking-wider text-slate-500">
              <th className="py-3 px-4">Materi & Dokumen</th>
              <th className="py-3 px-3">Mata Pelajaran</th>
              <th className="py-3 px-3">Kelas & Sem.</th>
              <th className="py-3 px-3">Guru Pengajar</th>
              <th className="py-3 px-3">Tanggal</th>
              <th className="py-3 px-4 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {items.map((item) => {
              const isPdf = item.tipe === 'file' || item.has_file;
              const isPreviewing = activeFileLoading?.id === item.id && activeFileLoading.action === 'preview';
              const isDownloading = activeFileLoading?.id === item.id && activeFileLoading.action === 'download';

              return (
                <tr key={item.id} className="hover:bg-slate-50/80 transition-colors group">
                  {/* Judul & Dokumen */}
                  <td className="py-3 px-4 max-w-xs">
                    <div className="flex items-start gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 mt-0.5 text-slate-600">
                        {isPdf ? <FileText size={14} className="text-rose-500" /> : getLinkIcon(item.link_url)}
                      </div>
                      <div className="min-w-0">
                        <div className="font-black text-slate-800 leading-snug truncate group-hover:text-[var(--ui-primary)] transition-colors" title={item.judul}>
                          {item.judul}
                        </div>
                        <div className="text-[10.5px] text-slate-400 truncate mt-0.5">
                          {isPdf ? (item.nama_dokumen || 'Dokumen PDF') : item.link_url}
                          {isPdf && item.file_size_bytes > 0 && ` • ${formatFileSize(item.file_size_bytes)}`}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Mapel */}
                  <td className="py-3 px-3">
                    <span className="inline-flex px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 text-[10px] font-black uppercase border border-emerald-200/60">
                      {item.mapel || '-'}
                    </span>
                  </td>

                  {/* Kelas & Semester */}
                  <td className="py-3 px-3 whitespace-nowrap">
                    <div className="font-bold text-slate-700">Kelas {item.kelas_target || 'Semua'}</div>
                    <div className="text-[10px] text-slate-400 font-semibold">Semester {item.semester || '-'}</div>
                  </td>

                  {/* Guru Pengajar */}
                  <td className="py-3 px-3">
                    <div className="font-bold text-slate-800 truncate max-w-[150px]" title={item.teacher_name}>
                      {item.teacher_name}
                    </div>
                    {item.tahun_ajaran && (
                      <div className="text-[10px] text-slate-400 font-semibold">{item.tahun_ajaran}</div>
                    )}
                  </td>

                  {/* Tanggal */}
                  <td className="py-3 px-3 text-[11px] text-slate-500 font-semibold whitespace-nowrap">
                    {formatDate(item.uploaded_at)}
                  </td>

                  {/* Aksi */}
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    <div className="inline-flex items-center gap-1.5">
                      {isPdf ? (
                        <>
                          <button
                            type="button"
                            onClick={() => onPreview(item)}
                            disabled={isPreviewing}
                            className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 shadow-2xs active:scale-95 cursor-pointer transition-all"
                            title="Pratinjau PDF"
                          >
                            {isPreviewing ? (
                              <div className="w-3.5 h-3.5 border-2 border-slate-500 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <Eye size={14} />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => onDownload(item)}
                            disabled={isDownloading}
                            className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs active:scale-95 cursor-pointer transition-all"
                            title="Unduh File PDF"
                          >
                            {isDownloading ? (
                              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <Download size={14} />
                            )}
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onOpenLink(item)}
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs active:scale-95 cursor-pointer transition-all flex items-center gap-1"
                          title="Buka Tautan"
                        >
                          <ExternalLink size={13} />
                          <span>Buka</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================================
// 3. CONTENT VIEW (Full Rich Content & Expanded Reading Cards)
// ============================================================
function ContentView({ 
  items, 
  onPreview, 
  onDownload, 
  onOpenLink, 
  activeFileLoading, 
  formatDate, 
  formatFileSize,
  getLinkIcon,
  getLinkLabel 
}) {
  return (
    <div className="flex flex-col gap-4 animate-in fade-in duration-200">
      {items.map((item) => {
        const isPdf = item.tipe === 'file' || item.has_file;
        const isPreviewing = activeFileLoading?.id === item.id && activeFileLoading.action === 'preview';
        const isDownloading = activeFileLoading?.id === item.id && activeFileLoading.action === 'download';

        return (
          <article
            key={item.id}
            className="p-5 bg-white rounded-[var(--ui-radius-card)] border border-slate-200/80 shadow-[var(--ui-shadow-card)] hover:border-[var(--ui-primary)]/40 hover:shadow-md transition-all flex flex-col gap-4"
          >
            {/* Header Metadata Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 flex-wrap">
                {item.mapel && (
                  <span className="inline-flex px-2.5 py-1 rounded-[var(--ui-radius-small)] bg-emerald-100/70 text-emerald-900 text-xs font-black uppercase tracking-wider border border-emerald-200/60">
                    {item.mapel}
                  </span>
                )}
                {item.kelas_target && (
                  <span className="inline-flex px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-[11px] font-bold border border-blue-200/60">
                    Kelas {item.kelas_target}
                  </span>
                )}
                {item.semester && (
                  <span className="inline-flex px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-bold">
                    Semester {item.semester}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3 text-xs text-slate-500 font-semibold">
                <span className="flex items-center gap-1">
                  <User size={13} className="text-slate-400" />
                  <b>{item.teacher_name}</b>
                </span>
                {item.uploaded_at && (
                  <span className="flex items-center gap-1 text-slate-400">
                    <Calendar size={13} />
                    {formatDate(item.uploaded_at)}
                  </span>
                )}
              </div>
            </div>

            {/* Title & Detailed Content */}
            <div className="space-y-2">
              <h3 className="text-base sm:text-lg font-black text-slate-900 leading-snug">
                {item.judul}
              </h3>
              
              {/* Full Description (Uncut & Reading Friendly) */}
              {item.deskripsi ? (
                <div className="p-3.5 bg-slate-50/80 rounded-xl border-l-3 border-[var(--ui-primary)] text-slate-700 text-xs sm:text-[13px] leading-relaxed font-medium whitespace-pre-line">
                  {item.deskripsi}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">Tidak ada deskripsi tambahan untuk materi ini.</p>
              )}
            </div>

            {/* Attachment / Resource Details Box */}
            <div className="p-3.5 bg-slate-100/60 rounded-xl border border-slate-200/70 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-white border border-slate-200/80 flex items-center justify-center shrink-0 shadow-2xs">
                  {isPdf ? (
                    <FileText size={20} className="text-rose-500" />
                  ) : (
                    getLinkIcon(item.link_url)
                  )}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-black text-slate-800 truncate">
                    {isPdf ? (item.nama_dokumen || 'Dokumen Materi Pembelajaran.pdf') : (item.link_url || 'Tautan Online')}
                  </div>
                  <div className="text-[11px] text-slate-500 font-medium flex items-center gap-2 mt-0.5">
                    <span>Format: <strong className="text-slate-700">{isPdf ? 'PDF Dokumen' : 'Tautan Web / Video'}</strong></span>
                    {isPdf && item.file_size_bytes > 0 && (
                      <>
                        <span>•</span>
                        <span>Ukuran: <strong className="text-slate-700">{formatFileSize(item.file_size_bytes)}</strong></span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons in Content View */}
              <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 pt-1 sm:pt-0">
                {isPdf ? (
                  <>
                    <button
                      type="button"
                      onClick={() => onPreview(item)}
                      disabled={isPreviewing}
                      className="flex-1 sm:flex-none py-2 px-3.5 rounded-[var(--ui-radius-control)] border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-800 flex items-center justify-center gap-1.5 shadow-2xs active:scale-95 cursor-pointer transition-all disabled:opacity-60"
                    >
                      {isPreviewing ? (
                        <div className="w-3.5 h-3.5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Eye size={14} />
                      )}
                      <span>Pratinjau Materi</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onDownload(item)}
                      disabled={isDownloading}
                      className="flex-1 sm:flex-none py-2 px-3.5 rounded-[var(--ui-radius-control)] bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white flex items-center justify-center gap-1.5 shadow-xs active:scale-95 cursor-pointer transition-all disabled:opacity-60"
                    >
                      {isDownloading ? (
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Download size={14} />
                      )}
                      <span>Unduh Berkas</span>
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => onOpenLink(item)}
                    className="w-full sm:w-auto py-2 px-4 rounded-[var(--ui-radius-control)] bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-xs font-bold text-white flex items-center justify-center gap-1.5 shadow-xs active:scale-95 cursor-pointer transition-all"
                  >
                    {getLinkIcon(item.link_url)}
                    <span>{getLinkLabel(item.link_url)}</span>
                  </button>
                )}
              </div>
            </div>

          </article>
        );
      })}
    </div>
  );
}
