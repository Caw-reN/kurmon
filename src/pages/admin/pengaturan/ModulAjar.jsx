import { Button } from '../../../components/ui.jsx';
import { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import { BookOpen, BookOpenText, Link2, Video, Globe, ExternalLink } from 'lucide-react';
import useAuthStore from '../../../store/monitoring/authStore.js';
import { base64ToBlobUrl, downloadFile } from '../../../utils/fileHelper.js';
import { Users, CheckCircle2, AlertCircle, RefreshCw, Search, FileText, Eye, Download, Trash2, Upload, X, PenTool, LayoutList, BarChart3, UploadCloud } from 'lucide-react';
import { PageHeader } from '../../../components/monitoring/ui/index.js';
import { UISelect } from '../../../components/ui.jsx';

const TabSilabus = lazy(() => import('../tabs/TabSilabus.jsx'));
const TabSilabusGuru = lazy(() => import('../tabs/TabSilabusGuru.jsx'));

// ── Helpers ──────────────────────────────────────────────────────
const getLinkIcon = (url) => {
  if (!url) return <Link2 size={14} />;
  if (url.includes('youtube.com') || url.includes('youtu.be')) return <Video size={14} className="text-red-500" />;
  if (url.includes('drive.google.com')) return <Globe size={14} className="text-blue-500" />;
  return <ExternalLink size={14} className="text-indigo-500" />;
};
const getLinkLabel = (url) => {
  if (!url) return 'Buka Link';
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'Tonton Video';
  if (url.includes('drive.google.com')) return 'Google Drive';
  return 'Buka Link';
};

export default function ModulAjar(props) {
  const { appSettings = {}, teachingLoads = [], classes = [], subjects = [] } = props;

  // ── Modul Ajar (RPP) state ───────────────────────────────────
  const [documents, setDocuments] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [monitoringSearch, setMonitoringSearch] = useState('');

  // ── Materi Ajar (Public) state ───────────────────────────────
  const [materiList, setMateriList] = useState([]);
  const [materiSearch, setMateriSearch] = useState('');
  const [isMateriLoading, setIsMateriLoading] = useState(false);
  const [materiForm, setMateriForm] = useState({
    judul: '', deskripsi: '', tipe: 'file',
    file_url: '', nama_dokumen: '', link_url: '',
    mapel: '', kelas_target: '', semester: 'Ganjil', tahun_ajaran: ''
  });
  const [isUploadingMateri, setIsUploadingMateri] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [materiUploadError, setMateriUploadError] = useState('');

  const [activeTab, setActiveTab] = useState('rekap');
  const [toast, setToast] = useState(null);
  const [previewDoc, setPreviewDoc] = useState(null);

  const handlePreviewPdf = (doc) => {
    const blobUrl = base64ToBlobUrl(doc.file_url);
    setPreviewDoc({ url: blobUrl, title: doc.nama_dokumen || doc.judul });
  };

  const authToken = useAuthStore(state => state.user?.authToken);
  const user = useAuthStore(state => state.user || {});
  const userRole = user.role || 'guru';
  const teacherCode = user.code || '';
  const teacherName = user.name || '';

  const isCurriculum = userRole === 'admin' || userRole === 'superadmin' || userRole === 'waka_kurikulum';
  const academicYears = appSettings?.academicYears || [];
  const activeYear = useMemo(() => academicYears.find(y => y.is_active)?.nama || '', [academicYears]);

  // Upload form state (Modul Ajar)
  const [form, setForm] = useState({
    nama_dokumen: '', file_url: '',
    tahun_ajaran: activeYear || '',
    mapel: '', kelas: '', semester: 'Ganjil'
  });
  const [isUploading, setIsUploading] = useState(false);

  const mySubjects = useMemo(() => {
    if (!teacherCode || !teachingLoads) return [];
    const loads = teachingLoads.filter(l =>
      String(l.teacherCode || '').split(',').map(c => c.trim().toLowerCase()).includes(teacherCode.toLowerCase())
    );
    return [...new Set(loads.map(l => l.subject).filter(Boolean))].sort();
  }, [teachingLoads, teacherCode]);

  const myClasses = useMemo(() => {
    if (!teacherCode || !teachingLoads || !classes) return [];
    const loads = teachingLoads.filter(l =>
      String(l.teacherCode || '').split(',').map(c => c.trim().toLowerCase()).includes(teacherCode.toLowerCase())
    );
    const matchesGrade = (targetGrade, className) => {
      if (!targetGrade || targetGrade === 'All') return true;
      return String(targetGrade).split(',').map(g => g.trim()).filter(Boolean).some(g => String(className || '').startsWith(`${g} `));
    };
    return classes.filter(cls => {
      return loads.some(load => {
        const loadMajor = String(load.targetMajor || 'All').trim().toLowerCase();
        return matchesGrade(load.targetGrade, cls.name) &&
          (loadMajor === 'all' || String(cls.major || '').trim().toLowerCase() === loadMajor);
      });
    }).map(c => c.name);
  }, [teachingLoads, classes, teacherCode]);

  const availableSubjects = useMemo(() => {
    if (userRole === 'guru') return mySubjects;
    return [...new Set((subjects || []).map(s => s.name || s.subjectName).filter(Boolean))].sort();
  }, [userRole, mySubjects, subjects]);

  const availableClasses = useMemo(() => {
    if (userRole === 'guru' && myClasses.length > 0) return myClasses;
    return (classes || []).map(c => c.name).sort();
  }, [userRole, myClasses, classes]);

  const subKey = availableSubjects.join(',');
  useEffect(() => {
    if (availableSubjects.length > 0) {
      setForm(prev => {
        if (prev.mapel && availableSubjects.includes(prev.mapel)) return prev;
        return { ...prev, mapel: availableSubjects[0] };
      });
      setMateriForm(prev => {
        if (prev.mapel && availableSubjects.includes(prev.mapel)) return prev;
        return { ...prev, mapel: availableSubjects[0] };
      });
    }
  }, [subKey]);

  const clsKey = availableClasses.join(',');
  useEffect(() => {
    if (availableClasses.length > 0) {
      setForm(prev => {
        if (prev.kelas && availableClasses.includes(prev.kelas)) return prev;
        return { ...prev, kelas: availableClasses[0] };
      });
      setMateriForm(prev => {
        if (prev.kelas_target && availableClasses.includes(prev.kelas_target)) return prev;
        return { ...prev, kelas_target: availableClasses[0] };
      });
    }
  }, [clsKey]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ── Fetch Modul Ajar (RPP) ──────────────────────────────────
  const fetchModulData = async () => {
    if (!authToken) return;
    setIsLoading(true);
    try {
      const [docRes, dataRes] = await Promise.all([
        fetch('/api/modul-ajar-guru', { headers: { Authorization: `Bearer ${authToken}` } }),
        fetch('/api/data/load', { headers: { Authorization: `Bearer ${authToken}` } })
      ]);
      const docData = await docRes.json();
      if (docData.ok) setDocuments(docData.data || []);
      const dataPayload = await dataRes.json();
      if (dataPayload.payload?.teachers) setTeachers(dataPayload.payload.teachers || []);
    } catch (e) {
      console.error(e);
      showToast('Gagal memuat data modul ajar', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // ── Fetch Materi Ajar (Public) ─────────────────────────────
  const fetchMateriData = async () => {
    setIsMateriLoading(true);
    try {
      const res = await fetch('/api/materi-ajar');
      const data = await res.json();
      if (data.ok) setMateriList(data.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsMateriLoading(false);
    }
  };

  useEffect(() => {
    fetchModulData();
    fetchMateriData();
    if (activeYear) {
      setForm(prev => prev.tahun_ajaran === activeYear ? prev : { ...prev, tahun_ajaran: activeYear });
      setMateriForm(prev => prev.tahun_ajaran === activeYear ? prev : { ...prev, tahun_ajaran: activeYear });
    }
  }, [authToken, activeYear]);

  // ── Tab Configurations ──────────────────────────────────────
  const tabs = useMemo(() => {
    const list = [];
    if (isCurriculum) {
      list.push({ id: 'rekap', label: 'Monitoring RPP', icon: BarChart3 });
      list.push({ id: 'daftar', label: 'Arsip Modul Ajar', icon: LayoutList });
      list.push({ id: 'materi-daftar', label: 'Materi Ajar (Publik)', icon: BookOpenText });
      list.push({ id: 'silabus', label: 'Penyusunan RPP', icon: PenTool });
    } else if (userRole === 'guru') {
      list.push({ id: 'daftar', label: 'Modul Saya', icon: FileText });
      list.push({ id: 'unggah', label: 'Upload Modul', icon: UploadCloud });
      list.push({ id: 'materi-saya', label: 'Materi Saya', icon: BookOpenText });
      list.push({ id: 'materi-unggah', label: 'Upload Materi', icon: Upload });
      list.push({ id: 'silabusguru', label: 'Penyusunan RPP', icon: PenTool });
    } else {
      list.push({ id: 'daftar', label: 'Semua Modul Ajar', icon: LayoutList });
    }
    return list;
  }, [isCurriculum, userRole]);

  useEffect(() => {
    if (tabs.length > 0) {
      setActiveTab(prev => tabs.some(t => t.id === prev) ? prev : tabs[0].id);
    }
  }, [tabs]);

  // ── File Input Handlers ─────────────────────────────────────
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (ext !== '.pdf') {
      setUploadError(`Ekstensi file ${ext} tidak diizinkan. Hanya file .pdf.`);
      e.target.value = ''; return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('File terlalu besar. Maksimal 5MB.');
      e.target.value = ''; return;
    }
    setUploadError('');
    const reader = new FileReader();
    reader.onloadend = () => setForm(prev => ({ ...prev, file_url: reader.result, nama_dokumen: file.name }));
    reader.readAsDataURL(file);
  };

  const handleMateriFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (ext !== '.pdf') {
      setMateriUploadError(`Ekstensi file ${ext} tidak diizinkan. Hanya file .pdf.`);
      e.target.value = ''; return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setMateriUploadError('File terlalu besar. Maksimal 5MB.');
      e.target.value = ''; return;
    }
    setMateriUploadError('');
    const reader = new FileReader();
    reader.onloadend = () => setMateriForm(prev => ({ ...prev, file_url: reader.result, nama_dokumen: file.name }));
    reader.readAsDataURL(file);
  };

  // ── Upload Modul Ajar (RPP) ─────────────────────────────────
  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    setUploadError('');
    if (!form.file_url) return setUploadError('Pilih file Modul Ajar terlebih dahulu.');
    if (!form.tahun_ajaran) return setUploadError('Pilih Tahun Ajaran.');
    if (!form.mapel) return setUploadError('Pilih Mata Pelajaran.');
    if (!form.kelas) return setUploadError('Pilih Kelas.');
    if (!form.semester) return setUploadError('Pilih Semester.');
    setIsUploading(true);
    try {
      const res = await fetch('/api/modul-ajar-guru', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({
          action: 'upload', teacher_code: teacherCode || 'admin',
          teacher_name: teacherName || 'Administrator',
          nama_dokumen: form.nama_dokumen, file_url: form.file_url,
          tahun_ajaran: form.tahun_ajaran, mapel: form.mapel,
          kelas: form.kelas, semester: form.semester
        })
      });
      const data = await res.json();
      if (data.ok) {
        showToast('Modul Ajar berhasil diunggah!');
        setForm({ nama_dokumen: '', file_url: '', tahun_ajaran: activeYear, mapel: availableSubjects[0] || '', kelas: availableClasses[0] || '', semester: 'Ganjil' });
        const fi = document.getElementById('file-input');
        if (fi) fi.value = '';
        fetchModulData();
        setActiveTab(userRole === 'guru' ? 'silabusguru' : 'daftar');
      } else setUploadError(data.error || 'Gagal mengunggah');
    } catch (e) { console.error(e); setUploadError('Terjadi kesalahan saat mengunggah'); }
    finally { setIsUploading(false); }
  };

  // ── Upload Materi Ajar (Public) ─────────────────────────────
  const handleMateriUploadSubmit = async (e) => {
    e.preventDefault();
    setMateriUploadError('');
    if (!materiForm.judul.trim()) return setMateriUploadError('Judul materi wajib diisi.');
    if (materiForm.tipe === 'file' && !materiForm.file_url) return setMateriUploadError('Pilih file PDF terlebih dahulu.');
    if (materiForm.tipe === 'link' && !materiForm.link_url.trim()) return setMateriUploadError('Masukkan URL link terlebih dahulu.');
    setIsUploadingMateri(true);
    try {
      const res = await fetch('/api/materi-ajar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({
          action: 'upload', teacher_code: teacherCode || 'admin',
          teacher_name: teacherName || 'Administrator',
          judul: materiForm.judul, deskripsi: materiForm.deskripsi,
          tipe: materiForm.tipe,
          file_url: materiForm.tipe === 'file' ? materiForm.file_url : null,
          nama_dokumen: materiForm.tipe === 'file' ? materiForm.nama_dokumen : null,
          link_url: materiForm.tipe === 'link' ? materiForm.link_url : null,
          mapel: materiForm.mapel, kelas_target: materiForm.kelas_target,
          semester: materiForm.semester, tahun_ajaran: materiForm.tahun_ajaran
        })
      });
      const data = await res.json();
      if (data.ok) {
        showToast('Materi Ajar berhasil dipublikasikan!');
        setMateriForm({ judul: '', deskripsi: '', tipe: 'file', file_url: '', nama_dokumen: '', link_url: '', mapel: availableSubjects[0] || '', kelas_target: availableClasses[0] || '', semester: 'Ganjil', tahun_ajaran: activeYear });
        const fi2 = document.getElementById('materi-file-input');
        if (fi2) fi2.value = '';
        fetchMateriData();
        setActiveTab('materi-saya');
      } else setMateriUploadError(data.error || 'Gagal mengunggah materi');
    } catch (e) { console.error(e); setMateriUploadError('Terjadi kesalahan'); }
    finally { setIsUploadingMateri(false); }
  };

  // ── Delete Handlers ─────────────────────────────────────────
  const handleDelete = async (id, code) => {
    if (!await window.confirmAsync('Hapus dokumen Modul Ajar ini?')) return;
    try {
      const res = await fetch('/api/modul-ajar-guru', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ action: 'delete', id, teacher_code: code })
      });
      const data = await res.json();
      if (data.ok) { showToast('Dokumen berhasil dihapus!'); fetchModulData(); }
      else showToast(data.error || 'Gagal menghapus', 'error');
    } catch (e) { console.error(e); showToast('Gagal menghapus dokumen', 'error'); }
  };

  const handleDeleteMateri = async (id, code) => {
    if (!await window.confirmAsync('Hapus materi ajar ini? Materi tidak akan lagi terlihat oleh siswa.')) return;
    try {
      const res = await fetch('/api/materi-ajar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ action: 'delete', id, teacher_code: code })
      });
      const data = await res.json();
      if (data.ok) { showToast('Materi berhasil dihapus!'); fetchMateriData(); }
      else showToast(data.error || 'Gagal menghapus', 'error');
    } catch (e) { console.error(e); showToast('Gagal menghapus materi', 'error'); }
  };

  // ── Derived Data ────────────────────────────────────────────
  const monitoringData = useMemo(() => {
    if (!teachers.length) return [];
    return teachers.map(t => {
      const teacherDocs = documents.filter(doc =>
        doc.teacher_code === t.code && doc.tahun_ajaran === (activeYear || form.tahun_ajaran)
      );
      return {
        code: t.code, name: t.name,
        class_name: t.class_name || '-',
        hasSubmitted: teacherDocs.length > 0,
        documents: teacherDocs
      };
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [teachers, documents, activeYear, form.tahun_ajaran]);

  const stats = useMemo(() => {
    const total = monitoringData.length;
    const submitted = monitoringData.filter(d => d.hasSubmitted).length;
    const pending = total - submitted;
    const percentage = total > 0 ? Math.round((submitted / total) * 100) : 0;
    return { total, submitted, pending, percentage };
  }, [monitoringData]);

  const filteredDocuments = useMemo(() => {
    return documents.filter(doc =>
      doc.nama_dokumen?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.teacher_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.tahun_ajaran?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [documents, searchTerm]);

  const myDocuments = useMemo(() => documents.filter(doc => doc.teacher_code === teacherCode), [documents, teacherCode]);

  const myMateri = useMemo(() => materiList.filter(m => m.teacher_code === teacherCode), [materiList, teacherCode]);

  const filteredMateri = useMemo(() => {
    return materiList.filter(m =>
      m.judul?.toLowerCase().includes(materiSearch.toLowerCase()) ||
      m.teacher_name?.toLowerCase().includes(materiSearch.toLowerCase()) ||
      m.mapel?.toLowerCase().includes(materiSearch.toLowerCase())
    );
  }, [materiList, materiSearch]);

  // ── JSX: Shared Card ───────────────────────────────────────
  const renderMateriCard = (item, showDelete = false) => (
    <div key={item.id} className="group flex items-start gap-4 p-4 rounded-xl border border-slate-100 bg-slate-50/60 hover:bg-white hover:shadow-sm hover:border-slate-200 transition-all duration-200">
      <div className="w-10 h-10 rounded-xl bg-[var(--ui-primary)]/10 flex items-center justify-center shrink-0 mt-0.5">
        {item.tipe === 'link'
          ? <span className="text-[var(--ui-primary)]">{getLinkIcon(item.link_url)}</span>
          : <FileText size={16} className="text-[var(--ui-primary)]" />
        }
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-black text-slate-800 text-sm leading-snug">{item.judul}</h3>
            {item.deskripsi && <p className="text-xs text-slate-500 mt-0.5 font-medium line-clamp-2">{item.deskripsi}</p>}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {item.tipe === 'file' ? (
              <>
                <Button variant="outline" onClick={() => handlePreviewPdf(item)} className="flex items-center gap-1 cursor-pointer text-xs" title="Pratinjau">
                  <Eye size={12} /> Lihat
                </Button>
                <Button onClick={() => downloadFile(item.file_url, item.nama_dokumen)}
                  className="px-2.5 py-1.5 text-xs font-bold rounded-lg no-underline transition-colors text-white bg-[var(--ui-primary)] flex items-center gap-1 cursor-pointer"
                  title="Unduh">
                  <Download size={12} /> Unduh
                </Button>
              </>
            ) : (
              <a href={item.link_url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold rounded-lg text-white bg-[var(--ui-primary)] no-underline"
              >
                {getLinkIcon(item.link_url)} {getLinkLabel(item.link_url)}
              </a>
            )}
            {showDelete && (
              <Button variant="outline" onClick={() => handleDeleteMateri(item.id, item.teacher_code)}
                className="cursor-pointer" title="Hapus">
                <Trash2 size={13} />
              </Button>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 mt-2">
          {item.mapel && <span className="inline-flex px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-black uppercase">{item.mapel}</span>}
          {item.kelas_target && <span className="inline-flex px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 text-[10px] font-semibold">{item.kelas_target}</span>}
          {item.semester && <span className="inline-flex px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 text-[10px] font-semibold">Sem. {item.semester}</span>}
          <span className="text-[10px] text-slate-400">oleh {item.teacher_name}</span>
          {item.tipe === 'link' && <span className="inline-flex px-2 py-0.5 rounded-md bg-blue-50 text-blue-600 text-[10px] font-black">Link</span>}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 relative animate-in fade-in duration-300 z-10">
      <PageHeader
        title="Modul & Materi Ajar"
        description="Modul Ajar untuk RPP guru (diperiksa kurikulum) · Materi Ajar untuk siswa (publik)"
        icon={BookOpen}
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* ── TAB: Penyusunan RPP (Silabus Kurikulum) ── */}
      {activeTab === 'silabus' && isCurriculum && (
        <Suspense fallback={<div className="p-12 text-center text-slate-500 font-bold animate-pulse">Memuat Modul Ajar...</div>}>
          <TabSilabus {...props} hideHeader={true} />
        </Suspense>
      )}

      {/* ── TAB: Penyusunan RPP (Silabus Guru) ── */}
      {activeTab === 'silabusguru' && userRole === 'guru' && (
        <Suspense fallback={<div className="p-12 text-center text-slate-500 font-bold animate-pulse">Memuat Modul Ajar Saya...</div>}>
          <TabSilabusGuru
            {...props}
            availableSubjects={availableSubjects}
            availableClasses={availableClasses}
            myDocuments={myDocuments}
            fetchData={fetchModulData}
            activeYear={activeYear}
            authToken={authToken}
            handleDelete={handleDelete}
          />
        </Suspense>
      )}

      {/* ── TAB: Monitoring Pengumpulan RPP ── */}
      {activeTab === 'rekap' && isCurriculum && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Guru', value: stats.total, icon: Users, color: 'bg-blue-50 text-blue-500' },
              { label: 'Sudah Kumpul', value: stats.submitted, icon: CheckCircle2, color: 'bg-emerald-50 text-emerald-500', textColor: 'text-emerald-700' },
              { label: 'Belum Kumpul', value: stats.pending, icon: AlertCircle, color: 'bg-rose-50 text-rose-500', textColor: 'text-rose-700' },
              { label: 'Persentase', value: `${stats.percentage}%`, icon: RefreshCw, color: 'bg-indigo-50 text-indigo-500', textColor: 'text-indigo-700' },
            ].map(({ label, value, icon: Icon, color, textColor }) => (
              <div key={label} className="ui-card p-5 flex items-center gap-4 bg-white">
                <div className={`w-12 h-12 rounded-[var(--ui-radius-small)] ${color} flex items-center justify-center shrink-0`}>
                  <Icon size={22} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{label}</p>
                  <p className={`text-3xl font-black ${textColor || 'text-slate-800'}`}>{value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Table */}
          <div className="ui-card p-6 space-y-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 border-b border-slate-100 pb-4">
              <div>
                <h3 className="font-bold text-slate-800 text-sm">Status Pengumpulan TA: <span className="text-[var(--ui-primary)] font-extrabold">{activeYear || 'Belum diaktifkan'}</span></h3>
                <p className="text-xs text-slate-400 mt-1">{stats.submitted}/{stats.total} guru sudah mengumpulkan &bull; {stats.percentage}% selesai</p>
              </div>
              <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                <input value={monitoringSearch} onChange={e => setMonitoringSearch(e.target.value)} placeholder="Cari nama guru..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border-none rounded-[var(--ui-radius-small)] text-sm focus:outline-none" />
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-150 rounded-[var(--ui-radius-small)]">
              <table className="w-full text-sm">
                <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 font-bold text-left">Nama Guru</th>
                    <th className="px-6 py-4 font-bold text-left">Kode</th>
                    <th className="px-6 py-4 font-bold text-left">Mengajar / Walas</th>
                    <th className="px-6 py-4 font-bold text-center w-48">Status</th>
                    <th className="px-6 py-4 font-bold text-left">Dokumen Modul Ajar</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-400 animate-pulse">Memuat data guru...</td></tr>
                  ) : monitoringData.filter(t => !monitoringSearch || t.name.toLowerCase().includes(monitoringSearch.toLowerCase()) || t.code.toLowerCase().includes(monitoringSearch.toLowerCase())).length === 0 ? (
                    <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-400">Tidak ada data guru {monitoringSearch ? 'yang cocok' : 'aktif'}.</td></tr>
                  ) : (
                    monitoringData.filter(t => !monitoringSearch || t.name.toLowerCase().includes(monitoringSearch.toLowerCase()) || t.code.toLowerCase().includes(monitoringSearch.toLowerCase())).map(teacher => (
                      <tr key={teacher.code} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 font-bold text-slate-800">{teacher.name}</td>
                        <td className="px-6 py-4 font-mono text-xs text-slate-500">{teacher.code}</td>
                        <td className="px-6 py-4 text-slate-600">{teacher.class_name}</td>
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-[var(--ui-radius-small)] text-xs font-bold ${teacher.hasSubmitted ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                            {teacher.hasSubmitted ? <><CheckCircle2 size={13} className="text-emerald-600" /><span>Sudah Mengumpulkan</span></> : <><AlertCircle size={13} className="text-rose-600" /><span>Belum Mengumpulkan</span></>}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {teacher.hasSubmitted ? (
                            <div className="space-y-2">
                              {teacher.documents.map(d => (
                                <div key={d.id} className="flex flex-col gap-0.5 border-b border-slate-100 pb-1.5 last:border-0 last:pb-0">
                                  <span className="text-[11px] font-black text-slate-800">{d.mapel || 'Umum'} ({d.kelas || '-'} - {d.semester || '-'})</span>
                                  <div className="flex items-center gap-1.5">
                                    <FileText size={12} className="text-slate-400 shrink-0" />
                                    <span onClick={() => downloadFile(d.file_url, d.nama_dokumen)} className="text-blue-600 hover:underline text-[11px] truncate max-w-[140px] cursor-pointer" title={d.nama_dokumen}>{d.nama_dokumen}</span>
                                    <Button variant="outline" onClick={() => handlePreviewPdf(d)} className="cursor-pointer flex items-center" title="Pratinjau"><Eye size={12} /></Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : <span className="text-slate-400 text-xs italic">-</span>}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB: Arsip Semua Modul Ajar ── */}
      {activeTab === 'daftar' && (
        <div className="ui-card p-6 space-y-4 animate-in fade-in duration-200">
          <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3 border-b border-slate-100 pb-4">
            <div>
              <h3 className="font-bold text-slate-800 text-sm">
                {isCurriculum ? 'Arsip Modul Ajar (RPP)' : 'Modul Ajar Saya'}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                {isCurriculum ? 'Seluruh file RPP yang telah diunggah guru.' : 'Daftar Modul Ajar (RPP) yang telah Anda unggah.'}
              </p>
            </div>
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Cari modul..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border-none rounded-[var(--ui-radius-small)] text-sm focus:outline-none" />
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-150 rounded-[var(--ui-radius-small)]">
            <table className="w-full text-sm">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 font-bold text-left">Mata Pelajaran</th>
                  <th className="px-6 py-4 font-bold text-left">Kelas &amp; Sem.</th>
                  <th className="px-6 py-4 font-bold text-left">Guru Pengunggah</th>
                  <th className="px-6 py-4 font-bold text-left w-48">Tahun Ajaran</th>
                  <th className="px-6 py-4 font-bold text-left">Berkas</th>
                  <th className="px-6 py-4 font-bold text-right w-36">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {(isCurriculum ? filteredDocuments : myDocuments.filter(d => d.nama_dokumen?.toLowerCase().includes(searchTerm.toLowerCase()))).length === 0 ? (
                  <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-400">Tidak ada Modul Ajar yang diunggah.</td></tr>
                ) : (
                  (isCurriculum ? filteredDocuments : myDocuments.filter(d => d.nama_dokumen?.toLowerCase().includes(searchTerm.toLowerCase()))).map(doc => {
                    const isMyOwn = doc.teacher_code === teacherCode;
                    const canDelete = isCurriculum || isMyOwn;
                    return (
                      <tr key={doc.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 font-bold text-slate-800">{doc.mapel || 'Umum'}</td>
                        <td className="px-6 py-4 text-slate-600 font-semibold">{doc.kelas || '-'} ({doc.semester || '-'})</td>
                        <td className="px-6 py-4 text-slate-600 font-semibold">{doc.teacher_name}</td>
                        <td className="px-6 py-4 text-slate-600 font-semibold">{doc.tahun_ajaran}</td>
                        <td className="px-6 py-4 text-slate-500 text-xs">
                          <div className="flex items-center gap-2">
                            <FileText size={16} className="text-red-500 shrink-0" />
                            <span className="truncate max-w-[150px]" title={doc.nama_dokumen}>{doc.nama_dokumen}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                          <Button variant="outline" onClick={() => handlePreviewPdf(doc)} className="flex items-center gap-1 cursor-pointer" title="Pratinjau berkas">
                            <Eye size={14} /> Pratinjau</Button>
                          <Button onClick={() => downloadFile(doc.file_url, doc.nama_dokumen)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 border border-blue-200 rounded-[var(--ui-radius-small)] transition-colors flex items-center gap-1 text-xs font-bold cursor-pointer"
                            title="Unduh berkas"><Download size={14} /> Unduh</Button>
                          {canDelete && (
                            <Button variant="outline" onClick={() => handleDelete(doc.id, doc.teacher_code)}
                              className="cursor-pointer" title="Hapus Modul"><Trash2 size={14} /></Button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB: Upload Modul Ajar (RPP) ── */}
      {activeTab === 'unggah' && userRole === 'guru' && (
        <div className="grid grid-cols-1 lg:grid-cols-[380px,1fr] gap-6 animate-in fade-in duration-200">
          <div className="ui-card p-5 space-y-4 h-fit">
            <h3 className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-3 flex items-center gap-2">
              <Upload size={16} className="text-[var(--ui-primary)]" /> Unggah Modul Ajar (RPP) Baru
            </h3>
            <form onSubmit={handleUploadSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2">Mata Pelajaran</label>
                <UISelect value={form.mapel} required onChange={e => setForm({ ...form, mapel: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border-none rounded-[var(--ui-radius-small)] text-sm font-semibold focus:outline-none">
                  <option value="">-- Pilih Mata Pelajaran --</option>
                  {availableSubjects.map(s => <option key={s} value={s}>{s}</option>)}
                </UISelect>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2">Kelas</label>
                <UISelect value={form.kelas} required onChange={e => setForm({ ...form, kelas: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border-none rounded-[var(--ui-radius-small)] text-sm font-semibold focus:outline-none">
                  <option value="">-- Pilih Kelas --</option>
                  {availableClasses.map(c => <option key={c} value={c}>{c}</option>)}
                </UISelect>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2">Semester</label>
                <UISelect value={form.semester} required onChange={e => setForm({ ...form, semester: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border-none rounded-[var(--ui-radius-small)] text-sm font-semibold focus:outline-none">
                  <option value="Ganjil">Semester Ganjil</option>
                  <option value="Genap">Semester Genap</option>
                </UISelect>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2">File Berkas (PDF)</label>
                <input id="file-input" type="file" required accept=".pdf" onChange={handleFileChange}
                  className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-[var(--ui-radius-small)] file:border-0 file:text-sm file:font-semibold file:bg-[var(--ui-primary)] file:text-white hover:file:opacity-90" />
              </div>
              {form.nama_dokumen && (
                <div className="p-3 bg-slate-50 rounded-lg text-xs space-y-1">
                  <p className="text-slate-500">File terpilih:</p>
                  <p className="font-bold text-slate-800 truncate">{form.nama_dokumen}</p>
                </div>
              )}
              {uploadError && (
                <div className="p-3 bg-rose-50 border border-rose-100 rounded-[var(--ui-radius-small)] flex items-start gap-2 text-rose-600 text-xs font-semibold animate-in zoom-in-95 duration-200">
                  <AlertCircle size={14} className="shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{uploadError}</span>
                </div>
              )}
              <button type="submit" disabled={isUploading || !form.file_url}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[var(--ui-primary)] hover:opacity-90 text-white text-sm font-black rounded-[var(--ui-radius-small)] transition-all cursor-pointer border-none disabled:opacity-50 disabled:cursor-not-allowed">
                <Upload size={14} /> {isUploading ? 'Mengunggah...' : 'Unggah Modul Ajar'}
              </button>
            </form>
          </div>

          <div className="ui-card p-6 space-y-4">
            <h3 className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-3">Riwayat Unggahan Modul Saya</h3>
            <div className="overflow-x-auto border border-slate-150 rounded-[var(--ui-radius-small)]">
              <table className="w-full text-sm">
                <thead className="text-xs text-slate-500 bg-slate-50 border-b border-slate-200 uppercase">
                  <tr>
                    <th className="px-6 py-4 font-bold text-left">Mata Pelajaran</th>
                    <th className="px-6 py-4 font-bold text-left">Kelas &amp; Sem.</th>
                    <th className="px-6 py-4 font-bold text-left w-36">Tahun Ajaran</th>
                    <th className="px-6 py-4 font-bold text-left">Berkas</th>
                    <th className="px-6 py-4 font-bold text-right w-24">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {myDocuments.length === 0 ? (
                    <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-400">Anda belum mengunggah Modul Ajar.</td></tr>
                  ) : (
                    myDocuments.map(doc => (
                      <tr key={doc.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 font-bold text-slate-800">{doc.mapel || 'Umum'}</td>
                        <td className="px-6 py-4 text-slate-600 font-semibold">{doc.kelas || '-'} ({doc.semester || '-'})</td>
                        <td className="px-6 py-4 text-slate-600 font-semibold">{doc.tahun_ajaran}</td>
                        <td className="px-6 py-4 text-slate-500 text-xs">
                          <div className="flex items-center gap-2">
                            <FileText size={14} className="text-red-500 shrink-0" />
                            <span className="truncate max-w-[150px]" title={doc.nama_dokumen}>{doc.nama_dokumen}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right flex items-center justify-end gap-1.5">
                          <Button variant="outline" onClick={() => handlePreviewPdf(doc)} className="flex items-center gap-1 cursor-pointer" title="Pratinjau"><Eye size={12} /> Lihat</Button>
                          <Button variant="outline" onClick={() => handleDelete(doc.id, doc.teacher_code)} className="cursor-pointer" title="Hapus"><Trash2 size={14} /></Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB: Materi Ajar (Semua — Kurikulum) ── */}
      {activeTab === 'materi-daftar' && isCurriculum && (
        <div className="ui-card p-6 space-y-4 animate-in fade-in duration-200">
          <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3 border-b border-slate-100 pb-4">
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Materi Ajar Publik</h3>
              <p className="text-xs text-slate-500 mt-1">Seluruh materi belajar yang tersedia untuk siswa di halaman publik <span className="font-bold text-[var(--ui-primary)]">/materi-ajar</span>.</p>
            </div>
            <div className="flex items-center gap-2">
              <a href="/materi-ajar" target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 px-3 py-2 text-xs font-bold rounded-lg text-white bg-[var(--ui-primary)] no-underline">
                <ExternalLink size={12} /> Buka Halaman Publik
              </a>
              <div className="relative w-full md:w-52">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                <input value={materiSearch} onChange={e => setMateriSearch(e.target.value)} placeholder="Cari materi..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border-none rounded-[var(--ui-radius-small)] text-sm focus:outline-none" />
              </div>
            </div>
          </div>

          {isMateriLoading ? (
            <div className="py-12 text-center text-slate-400 animate-pulse">Memuat materi ajar...</div>
          ) : filteredMateri.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <BookOpenText size={36} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm font-bold">Belum ada materi ajar yang dipublikasikan.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredMateri.map(item => renderMateriCard(item, isCurriculum))}
            </div>
          )}
        </div>
      )}

      {/* ── TAB: Materi Saya (Guru) ── */}
      {activeTab === 'materi-saya' && userRole === 'guru' && (
        <div className="ui-card p-6 space-y-4 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-4">
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Materi Ajar Saya</h3>
              <p className="text-xs text-slate-500 mt-1">Materi yang Anda publikasikan — dapat dilihat semua siswa.</p>
            </div>
            <a href="/materi-ajar" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 px-3 py-2 text-xs font-bold rounded-lg text-white bg-[var(--ui-primary)] no-underline shrink-0">
              <ExternalLink size={12} /> Lihat Tampilan Siswa
            </a>
          </div>
          {isMateriLoading ? (
            <div className="py-12 text-center text-slate-400 animate-pulse">Memuat materi...</div>
          ) : myMateri.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <BookOpenText size={36} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm font-bold">Anda belum mempublikasikan materi ajar.</p>
              <p className="text-xs mt-1">Klik tab <strong>Upload Materi</strong> untuk mulai.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {myMateri.map(item => renderMateriCard(item, true))}
            </div>
          )}
        </div>
      )}

      {/* ── TAB: Upload Materi Ajar (Guru) ── */}
      {activeTab === 'materi-unggah' && userRole === 'guru' && (
        <div className="grid grid-cols-1 lg:grid-cols-[400px,1fr] gap-6 animate-in fade-in duration-200">
          <div className="ui-card p-5 space-y-4 h-fit">
            <h3 className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-3 flex items-center gap-2">
              <BookOpenText size={16} className="text-[var(--ui-primary)]" /> Publikasikan Materi Ajar Baru
            </h3>
            <p className="text-xs text-slate-500 bg-emerald-50 border border-emerald-100 rounded-lg p-3 leading-relaxed">
              Materi yang Anda upload akan <strong className="text-emerald-700">langsung terlihat oleh semua siswa</strong> di halaman publik. Pastikan materi sudah siap sebelum dipublikasikan.
            </p>
            <form onSubmit={handleMateriUploadSubmit} className="space-y-4">
              {/* Tipe */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2">Jenis Materi</label>
                <div className="flex gap-2">
                  {[{ value: 'file', label: 'File PDF', icon: <FileText size={14} /> }, { value: 'link', label: 'Link/URL', icon: <Link2 size={14} /> }].map(opt => (
                    <button type="button" key={opt.value}
                      onClick={() => setMateriForm(f => ({ ...f, tipe: opt.value }))}
                      className={`flex items-center gap-2 flex-1 py-2.5 px-3 rounded-lg text-xs font-bold border transition-all cursor-pointer ${materiForm.tipe === opt.value ? 'bg-[var(--ui-primary)] text-white border-[var(--ui-primary)]' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}`}>
                      {opt.icon} {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Judul */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2">Judul Materi *</label>
                <input value={materiForm.judul} required onChange={e => setMateriForm(f => ({ ...f, judul: e.target.value }))}
                  placeholder="Contoh: Materi Matematika — Fungsi Trigonometri"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-[var(--ui-radius-small)] text-sm focus:outline-none focus:border-[var(--ui-primary)]" />
              </div>

              {/* Deskripsi */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2">Deskripsi (opsional)</label>
                <textarea value={materiForm.deskripsi} onChange={e => setMateriForm(f => ({ ...f, deskripsi: e.target.value }))}
                  placeholder="Ringkasan singkat isi materi..."
                  rows={2}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-[var(--ui-radius-small)] text-sm focus:outline-none focus:border-[var(--ui-primary)] resize-none" />
              </div>

              {/* File or Link */}
              {materiForm.tipe === 'file' ? (
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-2">File PDF *</label>
                  <input id="materi-file-input" type="file" accept=".pdf" onChange={handleMateriFileChange}
                    className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-[var(--ui-radius-small)] file:border-0 file:text-sm file:font-semibold file:bg-[var(--ui-primary)] file:text-white hover:file:opacity-90" />
                  {materiForm.nama_dokumen && (
                    <p className="mt-1.5 text-xs text-slate-500 font-medium truncate">{materiForm.nama_dokumen}</p>
                  )}
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-2">URL Link * <span className="text-slate-400 font-normal">(Google Drive, YouTube, dll)</span></label>
                  <input value={materiForm.link_url} onChange={e => setMateriForm(f => ({ ...f, link_url: e.target.value }))}
                    placeholder="https://drive.google.com/... atau https://youtu.be/..."
                    type="url"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-[var(--ui-radius-small)] text-sm focus:outline-none focus:border-[var(--ui-primary)]" />
                </div>
              )}

              {/* Mapel, Kelas, Semester */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-2">Mata Pelajaran</label>
                  <UISelect value={materiForm.mapel} onChange={e => setMateriForm(f => ({ ...f, mapel: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 border-none rounded-[var(--ui-radius-small)] text-sm font-semibold focus:outline-none">
                    <option value="">-- Pilih --</option>
                    {availableSubjects.map(s => <option key={s} value={s}>{s}</option>)}
                  </UISelect>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-2">Kelas Target</label>
                  <UISelect value={materiForm.kelas_target} onChange={e => setMateriForm(f => ({ ...f, kelas_target: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 border-none rounded-[var(--ui-radius-small)] text-sm font-semibold focus:outline-none">
                    <option value="">Semua Kelas</option>
                    {availableClasses.map(c => <option key={c} value={c}>{c}</option>)}
                  </UISelect>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2">Semester</label>
                <UISelect value={materiForm.semester} onChange={e => setMateriForm(f => ({ ...f, semester: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-50 border-none rounded-[var(--ui-radius-small)] text-sm font-semibold focus:outline-none">
                  <option value="Ganjil">Semester Ganjil</option>
                  <option value="Genap">Semester Genap</option>
                </UISelect>
              </div>

              {materiUploadError && (
                <div className="p-3 bg-rose-50 border border-rose-100 rounded-[var(--ui-radius-small)] flex items-start gap-2 text-rose-600 text-xs font-semibold animate-in zoom-in-95 duration-200">
                  <AlertCircle size={14} className="shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{materiUploadError}</span>
                </div>
              )}
              <button type="submit" disabled={isUploadingMateri}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[var(--ui-primary)] hover:opacity-90 text-white text-sm font-black rounded-[var(--ui-radius-small)] transition-all cursor-pointer border-none disabled:opacity-50 disabled:cursor-not-allowed">
                <BookOpenText size={14} /> {isUploadingMateri ? 'Mempublikasikan...' : 'Publikasikan Materi Ajar'}
              </button>
            </form>
          </div>

          {/* Right: Preview already published */}
          <div className="ui-card p-6 space-y-4">
            <h3 className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-3">Materi yang Sudah Dipublikasikan</h3>
            {myMateri.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <BookOpenText size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">Belum ada materi yang dipublikasikan.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {myMateri.map(item => renderMateriCard(item, true))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-[var(--ui-radius-small)] shadow-sm font-medium text-sm flex items-center gap-2 animate-in slide-in-from-bottom-5 text-white ${toast.type === 'error' ? 'bg-red-600' : 'bg-emerald-600'} z-50`}>
          {toast.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />} {toast.message}
        </div>
      )}

      {/* PDF Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col h-[85vh] animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <BookOpen className="text-slate-500 w-5 h-5" />
                <h3 className="font-black text-slate-800 text-sm truncate max-w-lg" title={previewDoc.title}>{previewDoc.title}</h3>
              </div>
              <Button variant="outline"
                onClick={() => {
                  if (previewDoc.url.startsWith('blob:')) URL.revokeObjectURL(previewDoc.url);
                  setPreviewDoc(null);
                }}
                className="flex items-center justify-center cursor-pointer">
                <X size={18} />
              </Button>
            </div>
            <div className="flex-1 bg-slate-800 p-2 relative flex items-center justify-center">
              <iframe src={previewDoc.url} title="Pratinjau" className="w-full h-full border-none rounded-lg bg-white" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
