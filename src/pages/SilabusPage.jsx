import { useEffect, useState, useMemo } from'react';
import { useSearchParams } from'react-router-dom';
import { useAppStore } from'../store/useAppStore';
import { getDatabaseSnapshot, subscribeDatabaseSnapshot } from'../utils/dataSource.js';
import { loadInitialState } from'../utils/state.js';
import { base64ToBlobUrl, downloadFile } from'../utils/fileHelper.js';
import { BookOpenText, Search, BookOpen, Eye, Download, X } from'lucide-react';
import { UISelect, Button, Modal } from'../components/ui.jsx';


export default function SilabusPage() {
  const [searchParams] = useSearchParams();
  const initialSubject = searchParams.get("subject") ||"";
  
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubject, setSelectedSubject] = useState(initialSubject);
  const [selectedSemester, setSelectedSemester] = useState("Semua");
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [dataVersion, setDataVersion] = useState(0);
  const [uploadedDocs, setUploadedDocs] = useState([]);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [subjectSearchQuery, setSubjectSearchQuery] = useState("");
  
  const syllabuses = useAppStore((state) => state.syllabuses) || [];

  const handlePreviewPdf = (doc) => {
    const blobUrl = base64ToBlobUrl(doc.file_url);
    setPreviewDoc({
      url: blobUrl,
      title: doc.nama_dokumen
    });
  };

  useEffect(() => subscribeDatabaseSnapshot(() => setDataVersion((version) => version + 1)), []);

  useEffect(() => {
    fetch('/api/modul-ajar-guru')
      .then(res => res.json())
      .then(res => {
        if (res.ok && Array.isArray(res.data)) {
          setUploadedDocs(res.data);
        }
      })
      .catch(err => console.error("Error fetching uploaded docs:", err));
  }, []);

  const appSettings = useMemo(() => {
    void dataVersion;
    const defaults = {
      primaryColor:"#064e3b",
      accentColor:"#a3e635",
      fontFamily:"Lexend",
      logoText:"TS",
      appName:"TimeSchedule",
      footerText:"© 2026 TimeSchedule by Admin.",
      contactEmail:"admin@school.sch.id",
      contactPhone:"+62 123-456-789"
    };

    return { ...defaults, ...loadInitialState("appSettings", defaults) };
  }, [dataVersion]);

  const { primaryColor, accentColor, fontFamily, appName, logoText, footerText, contactEmail, contactPhone } = appSettings;
  const shellCard ="bg-white/60 backdrop-blur-xl rounded-[var(--ui-radius-card)] shadow-sm border border-white/50";
  const fieldClass ="bg-slate-50 border-none rounded-[var(--ui-radius-control)] py-2.5 px-3 text-xs font-bold text-slate-700 outline-none focus:bg-white focus:border-slate-300 transition-all cursor-pointer shadow-sm";
  const printButtonClass ="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-[var(--ui-radius-control)] font-bold transition-all hover:-translate-y-0.5 active:translate-y-0 cursor-pointer text-white";
  const subjectButtonClass = (isActive) => `w-full text-left px-3 py-2.5 rounded-[var(--ui-radius-control)] font-bold transition-all flex items-center justify-between border cursor-pointer ${isActive ?"text-white border-transparent -emerald-600/15" :"bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-100"}`;
  const searchFieldClass ="w-full bg-slate-50 border-none rounded-[var(--ui-radius-control)] py-2.5 pl-9 pr-3 text-xs font-bold text-slate-700 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-slate-300 transition-all shadow-sm";

  // Group Syllabus to get unique subject list from all sources
  const subjectsList = useMemo(() => {
    const list = new Set();
    syllabuses.forEach(s => {
      if (s.subjectName) list.add(s.subjectName);
    });
    uploadedDocs.forEach(d => {
      if (d.mapel) list.add(d.mapel);
    });
    const masterSubjects = getDatabaseSnapshot().subjects || [];
    masterSubjects.forEach(s => {
      if (s.name) list.add(s.name);
      if (s.subjectName) list.add(s.subjectName);
    });
    return Array.from(list).sort((a, b) => a.localeCompare(b));
  }, [syllabuses, uploadedDocs, dataVersion]);

  const activeSubject = selectedSubject || subjectsList[0] ||"";

  const filteredSubjects = useMemo(() => {
    if (!subjectSearchQuery) return subjectsList;
    return subjectsList.filter(subj => 
      subj.toLowerCase().includes(subjectSearchQuery.toLowerCase())
    );
  }, [subjectsList, subjectSearchQuery]);

  // Filter sessions for selected subject, query search & semester setting
  const filteredSessions = useMemo(() => {
    if (!activeSubject) return [];
    return syllabuses.filter(s => {
      const isSubj = s.subjectName === activeSubject;
      const matchesQuery = !searchQuery || 
        (s.title && s.title.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesSemester = selectedSemester ==="Semua" || 
        (s.gradeSemester && s.gradeSemester.toLowerCase().includes(selectedSemester.toLowerCase()));
      return isSubj && matchesQuery && matchesSemester;
    });
  }, [syllabuses, activeSubject, searchQuery, selectedSemester]);

  const activeSession = useMemo(() => (
    filteredSessions.find((s) => String(s.id) === String(selectedSessionId)) || filteredSessions[0] || null
  ), [filteredSessions, selectedSessionId]);

  const activeSessionIndex = activeSession
    ? Math.max(filteredSessions.findIndex((s) => String(s.id) === String(activeSession.id)), 0)
    : -1;

  const filteredDocs = useMemo(() => {
    if (!activeSubject) return [];
    return uploadedDocs.filter(d => {
      const isSubj = d.mapel === activeSubject;
      const matchesQuery = !searchQuery || 
        (d.nama_dokumen && d.nama_dokumen.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (d.teacher_name && d.teacher_name.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesSemester = selectedSemester ==="Semua" || 
        (d.semester && d.semester.toLowerCase().includes(selectedSemester.toLowerCase()));
      return isSubj && matchesQuery && matchesSemester;
    });
  }, [uploadedDocs, activeSubject, searchQuery, selectedSemester]);

  return (
    <div className="w-full animate-fade-in print-landscape relative">
      <div className={`${shellCard} w-full p-5 md:p-6 flex flex-col gap-5 min-h-[550px]`}>

        {/* ACTIVE SUBJECT DETAILS PANEL */}
        {activeSubject ? (
          <div className="flex flex-col gap-5 animate-in fade-in duration-300">

            <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4 pb-4 border-b border-slate-100 print-hidden">
              <div className="flex-grow">
                <span className="text-[11px] font-black tracking-widest text-slate-400 uppercase">Detail Modul Ajar</span>
                <div className="flex flex-wrap items-center gap-3 mt-1">
                  <h2 className="text-[20px] font-black text-slate-800 tracking-tight">{activeSubject}</h2>
                  <Button
                    onClick={() => window.print()}
                    data-slot="button"
                    data-variant="primary"
                    className="btn-primary-theme"
                    style={{ backgroundColor: 'var(--ui-primary-btn, var(--ui-primary))', color: '#fff' }}
                  >
                    Cetak Modul
                  </Button>
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
                      setSearchQuery("");
                      setSelectedSessionId("");
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
                  <span className="text-[10px] font-black tracking-widest text-slate-400 uppercase">Cari Sesi/Materi</span>
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

              {activeSession && (
                <div className="p-5 bg-slate-50 border-none rounded-[var(--ui-radius-small)] print-block">
                  <h3 className="text-[15px] font-black text-slate-800 mb-2.5 border-b border-slate-200/60 pb-1.5 uppercase tracking-wide">Informasi Umum</h3>
                  <div className="space-y-1.5 text-[14px] text-slate-700 font-semibold">
                    <div>Mata Pelajaran: <span className="text-slate-900 font-extrabold">{activeSubject}</span></div>
                    <div>Kelas/Semester: <span className="text-slate-900 font-extrabold">{activeSession.gradeSemester ||"-"}</span></div>
                  </div>
                </div>
              )}

              {filteredSessions.length > 0 && (
                <div className="print-hidden">
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <h3 className="text-[13px] font-black text-slate-800">Tab Pertemuan</h3>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{filteredSessions.length} pertemuan</span>
                  </div>
                  <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-2 hide-scrollbar">
                    {filteredSessions.map((session, index) => {
                      const isActive = activeSession?.id === session.id;
                      return (
                        <Button variant="outline"
                          key={session.id || index}
                          type="button"
                          onClick={() => setSelectedSessionId(session.id || String(index))}
                          className={`shrink-0 text-left px-3 py-2 rounded-lg transition-all ${isActive ? "text-white btn-primary-theme" : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-100"}`}
                          data-slot={isActive ? "button" : undefined}
                          data-variant={isActive ? "primary" : undefined}
                          style={isActive ? { backgroundColor: 'var(--ui-primary-btn, var(--ui-primary))' } : undefined}
                        >
                          <span className="block text-[12px] font-black">Pertemuan {index + 1}</span>
                          <span className={`mt-1 block text-[10px] font-bold line-clamp-1 ${isActive ?"text-white/75" :"text-slate-400"}`}>
                            {session.title ||"Tanpa judul"}
                          </span></Button>
                      );
                    })}
                  </div>
                </div>
              )}

              {activeSession ? (
                <div className="flex flex-col gap-0 mt-2">
                  <div key={activeSession.id || activeSessionIndex} className="bg-transparent border-none p-0 flex flex-col">
                    <div>
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        {activeSession.gradeSemester && (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-[var(--ui-radius-small)] bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-widest">
                            {activeSession.gradeSemester}
                          </span>
                        )}
                        <span className="inline-flex items-center px-2.5 py-1 rounded-[var(--ui-radius-small)] bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-widest">
                          Pertemuan {activeSessionIndex + 1}
                        </span>
                      </div>
                      <h4 className="text-[18px] font-black text-slate-800 leading-snug mb-3">{activeSession.title || `Pertemuan ${activeSessionIndex + 1}`}</h4>
                      <div className="space-y-3.5 text-[14px] text-slate-700 font-semibold leading-relaxed">
                        <p>
                          <span className="text-slate-500 font-bold block mb-0.5">Tujuan Pembelajaran:</span>
                          <span className="text-slate-800 font-extrabold">{activeSession.objectives ||"-"}</span>
                        </p>
                        <div>
                          <span className="text-slate-500 font-bold block mb-1">Materi Pembelajaran:</span>
                          {activeSession.materials ? (
                            <div className="space-y-1.5 pl-4">
                              {activeSession.materials.split('\n').map(line => line.trim()).filter(Boolean).map((line, i) => (
                                <div key={i} className="text-slate-800 font-extrabold pl-1">{line}</div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-800 font-extrabold pl-4">-</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : filteredDocs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <BookOpen size={44} className="text-slate-300 mb-3 stroke-1" />
                  <h4 className="text-[16px] font-bold text-slate-800 mb-1">Materi Tidak Ditemukan</h4>
                  <p className="text-slate-500 text-[13px] max-w-sm">Materi modul ajar untuk pencarian ini belum dipublikasikan.</p>
                </div>
              ) : null}

              {/* List of Uploaded PDF Modul Ajar files */}
              {filteredDocs.length > 0 && (
                <div className="space-y-4 print-block">
                  <h3 className="text-[15px] font-black text-slate-800 border-b border-slate-200/60 pb-2.5 flex items-center gap-2">
                    <BookOpenText size={18} className="text-slate-500" />
                    Berkas Modul Ajar (PDF)
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredDocs.map((doc) => (
                      <div
                        key={doc.id}
                        className="p-4 bg-slate-50/50 rounded-[var(--ui-radius-small)] border border-slate-100 hover:bg-slate-50 transition-all flex flex-col justify-between gap-3 shadow-sm hover:shadow-md"
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="inline-flex px-2 py-0.5 rounded-[var(--ui-radius-small)] bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-wider">
                              Kelas {doc.kelas}
                            </span>
                            <span className="text-[11px] font-bold text-slate-400">
                              Semester {doc.semester}
                            </span>
                          </div>
                          <h4 className="text-[14px] font-black text-slate-800 leading-snug line-clamp-2" title={doc.nama_dokumen}>
                            {doc.nama_dokumen}
                          </h4>
                          <div className="flex flex-col gap-0.5 text-xs text-slate-500 font-semibold">
                            <div>Pengunggah: <span className="text-slate-800 font-bold">{doc.teacher_name}</span></div>
                            <div>Tahun Ajaran: <span className="text-slate-800 font-bold">{doc.tahun_ajaran}</span></div>
                          </div>
                        </div>
                        <div className="pt-2 flex gap-2">
                          <Button
                            variant="outline"
                            onClick={() => handlePreviewPdf(doc)}
                            className="flex-1"
                          >
                            <Eye size={14} className="mr-1.5" />
                            Pratinjau
                          </Button>
                          <Button
                            onClick={() => downloadFile(doc.file_url, doc.nama_dokumen)}
                            data-slot="button"
                            data-variant="primary"
                            className="flex-1 flex items-center justify-center gap-1.5 py-2 text-white rounded-[var(--ui-radius-small)] text-xs font-bold transition-all cursor-pointer no-underline text-center btn-primary-theme"
                            style={{ backgroundColor: 'var(--ui-primary-btn, var(--ui-primary))' }}
                          >
                            <Download size={14} />
                            Unduh
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-16 text-slate-400 flex flex-col items-center justify-center gap-2">
              <BookOpen size={48} className="stroke-1 mb-2 text-slate-300" />
              <h4 className="font-bold text-slate-700">Belum Ada Mata Pelajaran Terpilih</h4>
              <p className="text-xs text-slate-500 max-w-xs">Silakan pilih salah satu mata pelajaran di sebelah kiri untuk memuat data.</p>
            </div>
          )}
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
                title="Pratinjau Modul Ajar"
                className="w-full h-full border-none rounded-lg bg-white"
              />
            </div>
        </Modal>
      )}
    </div>
  );
}
