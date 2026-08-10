import { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { loadInitialState } from '../utils/state.js';
import { getDatabaseSnapshot, subscribeDatabaseSnapshot } from '../utils/dataSource.js';
import { base64ToBlobUrl, downloadFile } from '../utils/fileHelper.js';
import { BookOpenText, Search, BookOpen, Eye, Download, X, Video, Globe, Link2, ExternalLink } from 'lucide-react';
import { UISelect, Button, Modal } from '../components/ui.jsx';

export default function MateriAjarPage() {
  const [searchParams] = useSearchParams();
  const initialSubject = searchParams.get('subject') || '';

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState(initialSubject);
  const [selectedSemester, setSelectedSemester] = useState('Semua');
  const [dataVersion, setDataVersion] = useState(0);
  const [materiList, setMateriList] = useState([]);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => subscribeDatabaseSnapshot(() => setDataVersion(v => v + 1)), []);

  // Fetch materi ajar (public — no auth needed)
  useEffect(() => {
    setIsLoading(true);
    fetch('/api/materi-ajar')
      .then(r => r.json())
      .then(res => {
        if (res.ok && Array.isArray(res.data)) setMateriList(res.data);
      })
      .catch(err => console.error('Error fetching materi ajar:', err))
      .finally(() => setIsLoading(false));
  }, []);

  const handlePreviewPdf = (item) => {
    const blobUrl = base64ToBlobUrl(item.file_url);
    setPreviewDoc({ url: blobUrl, title: item.judul });
  };

  const handleOpenLink = (item) => {
    window.open(item.link_url, '_blank', 'noopener,noreferrer');
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

  const shellCard = "bg-white/60 backdrop-blur-xl rounded-[var(--ui-radius-card)] shadow-sm border border-white/50";
  const searchFieldClass = "w-full bg-slate-50 border-none rounded-[var(--ui-radius-control)] py-2.5 pl-9 pr-3 text-xs font-bold text-slate-700 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-slate-300 transition-all shadow-sm";

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

  const activeSubject = selectedSubject || subjectsList[0] || '';

  const filteredMateri = useMemo(() => {
    if (!activeSubject) return [];
    return materiList.filter(m => {
      const matchSubject = m.mapel === activeSubject;
      const matchSearch = !searchQuery ||
        m.judul?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.deskripsi?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.teacher_name?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchSemester = selectedSemester === 'Semua' ||
        m.semester?.toLowerCase() === selectedSemester.toLowerCase();
      return matchSubject && matchSearch && matchSemester;
    });
  }, [materiList, activeSubject, searchQuery, selectedSemester]);

  const getLinkIcon = (url) => {
    if (!url) return <Link2 size={14} />;
    if (url.includes('youtube.com') || url.includes('youtu.be')) return <Video size={14} className="text-rose-500" />;
    if (url.includes('drive.google.com')) return <Globe size={14} className="text-blue-500" />;
    return <ExternalLink size={14} className="text-indigo-500" />;
  };

  const getLinkLabel = (url) => {
    if (!url) return 'Buka Link';
    if (url.includes('youtube.com') || url.includes('youtu.be')) return 'Tonton Video';
    if (url.includes('drive.google.com')) return 'Google Drive';
    return 'Buka Link';
  };

  return (
    <div className="w-full animate-fade-in print-landscape relative">
      <div className={`${shellCard} w-full p-5 md:p-6 flex flex-col gap-5 min-h-[550px]`}>
        
        {/* ACTIVE SUBJECT DETAILS PANEL */}
        <div className="flex flex-col gap-5 animate-in fade-in duration-300">
          
          {/* Header & Filter Controls Section */}
          <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4 pb-4 border-b border-slate-100 print-hidden">
            <div className="flex-grow">
              <span className="text-[11px] font-black tracking-widest text-slate-400 uppercase">Detail Materi Ajar</span>
              <div className="flex flex-wrap items-center gap-3 mt-1">
                <h2 className="text-[20px] font-black text-slate-800 tracking-tight">
                  {activeSubject || "Mata Pelajaran"}
                </h2>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row flex-wrap gap-3 shrink-0 items-end">
              {/* Mata Pelajaran Select */}
              <div className="flex flex-col gap-1 w-full sm:w-[220px]">
                <span className="text-[10px] font-black tracking-widest text-slate-400 uppercase">Mata Pelajaran</span>
                <UISelect
                  value={selectedSubject}
                  onChange={e => {
                    setSelectedSubject(e.target.value);
                    setSearchQuery('');
                  }}
                  className="w-full"
                >
                  <option value="">-- Pilih Mata Pelajaran --</option>
                  {subjectsList.map(subj => (
                    <option key={subj} value={subj}>{subj}</option>
                  ))}
                </UISelect>
              </div>

              {/* Semester Select */}
              <div className="flex flex-col gap-1 w-full sm:w-[130px]">
                <span className="text-[10px] font-black tracking-widest text-slate-400 uppercase">Semester</span>
                <UISelect
                  value={selectedSemester}
                  onChange={e => setSelectedSemester(e.target.value)}
                  className="w-full"
                >
                  <option value="Semua">Semua</option>
                  <option value="Ganjil">Ganjil</option>
                  <option value="Genap">Genap</option>
                </UISelect>
              </div>

              {/* Cari Sesi/Materi Search */}
              <div className="flex flex-col gap-1 w-full sm:w-[200px]">
                <span className="text-[10px] font-black tracking-widest text-slate-400 uppercase">Cari Materi</span>
                <div className="relative w-full">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Cari kata kunci..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className={`${searchFieldClass} h-11`}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Page Body */}
          {isLoading ? (
            <div className="text-center py-16">
              <div className="w-8 h-8 border-4 border-slate-200 border-t-transparent rounded-full animate-spin mx-auto mb-3" style={{ borderTopColor: primaryColor }} />
              <p className="text-xs text-slate-500 font-bold animate-pulse">Memuat materi belajar...</p>
            </div>
          ) : !activeSubject ? (
            <div className="text-center py-16 text-slate-400 flex flex-col items-center justify-center gap-2">
              <BookOpen size={48} className="stroke-1 mb-2 text-slate-300" />
              <h4 className="font-bold text-slate-700">Belum Ada Mata Pelajaran Terpilih</h4>
              <p className="text-xs text-slate-500 max-w-xs">Silakan pilih salah satu mata pelajaran di filter atas untuk memuat data.</p>
            </div>
          ) : (
            <div className="space-y-4 print-block">
              <h3 className="text-[15px] font-black text-slate-800 border-b border-slate-200/60 pb-2.5 flex items-center gap-2">
                <BookOpenText size={18} className="text-slate-500" />
                Daftar Materi Belajar (PDF & Link)
              </h3>
              
              {filteredMateri.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <BookOpen size={44} className="text-slate-300 mb-3 stroke-1" />
                  <h4 className="text-[16px] font-bold text-slate-800 mb-1">Materi Tidak Ditemukan</h4>
                  <p className="text-slate-500 text-[13px] max-w-sm">Materi ajar untuk mata pelajaran ini belum dipublikasikan oleh guru.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredMateri.map((item) => (
                    <div
                      key={item.id}
                      className="p-4 bg-slate-50/50 rounded-[var(--ui-radius-small)] border border-slate-100 hover:bg-slate-50 transition-all flex flex-col justify-between gap-3 shadow-sm hover:shadow-xs"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          {item.kelas_target ? (
                            <span className="inline-flex px-2 py-0.5 rounded-[var(--ui-radius-small)] bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-wider">
                              Kelas {item.kelas_target}
                            </span>
                          ) : (
                            <span className="inline-flex px-2 py-0.5 rounded-[var(--ui-radius-small)] bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-wider">
                              Semua Kelas
                            </span>
                          )}
                          {item.semester && (
                            <span className="text-[11px] font-bold text-slate-400">
                              Semester {item.semester}
                            </span>
                          )}
                        </div>
                        <h4 className="text-[14px] font-black text-slate-800 leading-snug line-clamp-2" title={item.judul}>
                          {item.judul}
                        </h4>
                        {item.deskripsi && (
                          <p className="text-xs text-slate-500 font-medium line-clamp-2 leading-relaxed">
                            {item.deskripsi}
                          </p>
                        )}
                        <div className="flex flex-col gap-0.5 text-xs text-slate-500 font-semibold pt-1 border-t border-slate-100/50 mt-2">
                          <div>Guru Pengajar: <span className="text-slate-800 font-bold">{item.teacher_name}</span></div>
                          {item.tahun_ajaran && <div>Tahun Ajaran: <span className="text-slate-800 font-bold">{item.tahun_ajaran}</span></div>}
                          {item.tipe === 'link' && (
                            <div className="text-blue-600 font-bold flex items-center gap-1.5 mt-1">
                              {getLinkIcon(item.link_url)}
                              <span className="underline truncate max-w-[200px]">{item.link_url}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="pt-2 flex gap-2">
                        {item.tipe === 'file' ? (
                          <>
                            <Button
                              variant="outline"
                              onClick={() => handlePreviewPdf(item)}
                              className="flex-1"
                            >
                              <Eye size={14} className="mr-1.5" />
                              Pratinjau
                            </Button>
                            <Button
                              onClick={() => downloadFile(item.file_url, item.nama_dokumen)}
                              data-slot="button"
                              data-variant="primary"
                              className="flex-1 flex items-center justify-center gap-1.5 py-2 text-white rounded-[var(--ui-radius-small)] text-xs font-bold transition-all shadow-sm cursor-pointer no-underline text-center btn-primary-theme"
                              style={{ backgroundColor: 'var(--ui-primary-btn, var(--ui-primary))' }}
                            >
                              <Download size={14} />
                              Unduh
                            </Button>
                          </>
                        ) : (
                          <Button
                            onClick={() => handleOpenLink(item)}
                            data-slot="button"
                            data-variant="primary"
                            className="w-full flex items-center justify-center gap-1.5 text-white btn-primary-theme"
                            style={{ backgroundColor: 'var(--ui-primary-btn, var(--ui-primary))' }}
                          >
                            {getLinkIcon(item.link_url)}
                            {getLinkLabel(item.link_url)}
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
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
            if (previewDoc.url.startsWith('blob:')) {
              URL.revokeObjectURL(previewDoc.url);
            }
            setPreviewDoc(null);
          }}
          title={previewDoc.title}
          icon={<BookOpen size={20} className="text-slate-500" />}
          width="4xl"
        >
          <div className="flex-1 bg-slate-800 p-2 relative flex items-center justify-center h-[70vh]">
            <iframe
              src={previewDoc.url}
              title="Pratinjau Materi Ajar"
              className="w-full h-full border-none rounded-[var(--ui-radius-small)] bg-white"
            />
          </div>
        </Modal>
      )}
    </div>
  );
}
