import { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import { 
  BookOpen, BookOpenText, Link2, Video, Globe, ExternalLink,
  Users, CheckCircle2, AlertCircle, RefreshCw, Search, FileText, Eye, 
  Download, Trash2, Upload, X, PenTool, LayoutList, BarChart3, 
  UploadCloud, Sparkles, Layers, ArrowRight, Check, AlertTriangle,
  FolderPlus, Filter, Calendar, GraduationCap, ChevronRight, FileCheck,
  FilePlus, Info, PlayCircle, Clock
} from 'lucide-react';
import useAuthStore from '../../../store/monitoring/authStore.js';
import { base64ToBlobUrl, downloadFile } from '../../../utils/fileHelper.js';
import { PageHeader } from '../../../components/monitoring/ui/index.js';
import { Button, UISelect } from '../../../components/ui.jsx';

const TabSilabus = lazy(() => import('../tabs/TabSilabus.jsx'));
const TabSilabusGuru = lazy(() => import('../tabs/TabSilabusGuru.jsx'));

// ── Helpers ──────────────────────────────────────────────────────
const getLinkIcon = (url) => {
  if (!url) return <Link2 size={15} className="shrink-0" />;
  if (url.includes('youtube.com') || url.includes('youtu.be')) return <Video size={15} className="text-rose-500 shrink-0" />;
  if (url.includes('drive.google.com')) return <Globe size={15} className="text-blue-500 shrink-0" />;
  return <ExternalLink size={15} className="text-indigo-500 shrink-0" />;
};

const getLinkLabel = (url) => {
  if (!url) return 'Buka Tautan';
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'Video Pembelajaran';
  if (url.includes('drive.google.com')) return 'Google Drive';
  return 'Tautan Materi';
};

export default function ModulAjar(props) {
  const { appSettings = {}, teachingLoads = [], classes = [], subjects = [] } = props;

  // ── Modul Ajar (RPP) state ───────────────────────────────────
  const [documents, setDocuments] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [monitoringSearch, setMonitoringSearch] = useState('');
  const [filterMapel, setFilterMapel] = useState('all');

  // ── Materi Ajar (Public) state ───────────────────────────────
  const [materiList, setMateriList] = useState([]);
  const [materiSearch, setMateriSearch] = useState('');
  const [materiFilterMapel, setMateriFilterMapel] = useState('all');
  const [materiFilterTipe, setMateriFilterTipe] = useState('all');
  const [isMateriLoading, setIsMateriLoading] = useState(false);
  const [materiForm, setMateriForm] = useState({
    judul: '', deskripsi: '', tipe: 'file',
    file_url: '', nama_dokumen: '', link_url: '',
    mapel: '', kelas_target: '', semester: 'Ganjil', tahun_ajaran: '',
    file_size: null
  });
  const [isUploadingMateri, setIsUploadingMateri] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [materiUploadError, setMateriUploadError] = useState('');

  const [activeTab, setActiveTab] = useState('daftar');
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

  const division = (user?.division || '').toLowerCase();
  const isCurriculum = userRole === 'admin' || userRole === 'superadmin' || userRole === 'waka_kurikulum' || (userRole === 'waka' && division === 'kurikulum');
  const academicYears = appSettings?.academicYears || [];
  const activeYear = useMemo(() => academicYears.find(y => y.is_active)?.nama || '', [academicYears]);

  // Upload form state (Modul Ajar RPP)
  const [form, setForm] = useState({
    nama_dokumen: '', file_url: '',
    tahun_ajaran: activeYear || '',
    mapel: '', kelas: '', semester: 'Ganjil',
    file_size: null
  });
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isMateriDragging, setIsMateriDragging] = useState(false);

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
    if (userRole === 'guru' && mySubjects.length > 0) return mySubjects;
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
  const processModulFile = (file) => {
    if (!file) return;
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (ext !== '.pdf') {
      setUploadError(`Ekstensi berkas ${ext} tidak diizinkan. Mohon pilih berkas berformat .pdf`);
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Ukuran berkas terlalu besar. Maksimal ukuran 5MB.');
      return;
    }
    setUploadError('');
    const reader = new FileReader();
    reader.onloadend = () => {
      setForm(prev => ({ 
        ...prev, 
        file_url: reader.result, 
        nama_dokumen: file.name,
        file_size: (file.size / (1024 * 1024)).toFixed(2) + ' MB'
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e) => {
    processModulFile(e.target.files[0]);
  };

  const processMateriFile = (file) => {
    if (!file) return;
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (ext !== '.pdf') {
      setMateriUploadError(`Ekstensi berkas ${ext} tidak diizinkan. Mohon pilih berkas berformat .pdf`);
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setMateriUploadError('Ukuran berkas terlalu besar. Maksimal ukuran 5MB.');
      return;
    }
    setMateriUploadError('');
    const reader = new FileReader();
    reader.onloadend = () => {
      setMateriForm(prev => ({ 
        ...prev, 
        file_url: reader.result, 
        nama_dokumen: file.name,
        file_size: (file.size / (1024 * 1024)).toFixed(2) + ' MB'
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleMateriFileChange = (e) => {
    processMateriFile(e.target.files[0]);
  };

  // ── Upload Modul Ajar (RPP) ─────────────────────────────────
  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    setUploadError('');
    if (!form.file_url) return setUploadError('Pilih atau unggah berkas Modul Ajar (PDF) terlebih dahulu.');
    if (!form.tahun_ajaran) return setUploadError('Pilih Tahun Ajaran yang berlaku.');
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
        showToast('Modul Ajar (RPP) berhasil diunggah!');
        setForm({ 
          nama_dokumen: '', file_url: '', 
          tahun_ajaran: activeYear, 
          mapel: availableSubjects[0] || '', 
          kelas: availableClasses[0] || '', 
          semester: 'Ganjil',
          file_size: null
        });
        const fi = document.getElementById('file-input');
        if (fi) fi.value = '';
        fetchModulData();
        setActiveTab('daftar');
      } else {
        setUploadError(data.error || 'Gagal mengunggah Modul Ajar.');
      }
    } catch (e) { 
      console.error(e); 
      setUploadError('Terjadi kesalahan koneksi saat mengunggah berkas.'); 
    } finally { 
      setIsUploading(false); 
    }
  };

  // ── Upload Materi Ajar (Public) ─────────────────────────────
  const handleMateriUploadSubmit = async (e) => {
    e.preventDefault();
    setMateriUploadError('');
    if (!materiForm.judul.trim()) return setMateriUploadError('Judul materi pembelajaran wajib diisi.');
    if (materiForm.tipe === 'file' && !materiForm.file_url) return setMateriUploadError('Pilih berkas PDF materi terlebih dahulu.');
    if (materiForm.tipe === 'link' && !materiForm.link_url.trim()) return setMateriUploadError('Masukkan tautan/URL materi pembelajaran.');
    
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
        showToast('Materi Ajar berhasil dipublikasikan untuk siswa!');
        setMateriForm({ 
          judul: '', deskripsi: '', tipe: 'file', 
          file_url: '', nama_dokumen: '', link_url: '', 
          mapel: availableSubjects[0] || '', 
          kelas_target: availableClasses[0] || '', 
          semester: 'Ganjil', 
          tahun_ajaran: activeYear,
          file_size: null
        });
        const fi2 = document.getElementById('materi-file-input');
        if (fi2) fi2.value = '';
        fetchMateriData();
        setActiveTab('materi-saya');
      } else {
        setMateriUploadError(data.error || 'Gagal mempublikasikan materi ajar.');
      }
    } catch (e) { 
      console.error(e); 
      setMateriUploadError('Terjadi gangguan jaringan saat mempublikasikan materi.'); 
    } finally { 
      setIsUploadingMateri(false); 
    }
  };

  // ── Delete Handlers ─────────────────────────────────────────
  const handleDelete = async (id, code) => {
    if (!await window.confirmAsync('Hapus dokumen Modul Ajar ini dari arsip?')) return;
    try {
      const res = await fetch('/api/modul-ajar-guru', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ action: 'delete', id, teacher_code: code })
      });
      const data = await res.json();
      if (data.ok) { 
        showToast('Dokumen Modul Ajar berhasil dihapus!'); 
        fetchModulData(); 
      } else {
        showToast(data.error || 'Gagal menghapus dokumen', 'error');
      }
    } catch (e) { 
      console.error(e); 
      showToast('Gagal menghapus dokumen modul', 'error'); 
    }
  };

  const handleDeleteMateri = async (id, code) => {
    if (!await window.confirmAsync('Hapus materi ajar ini? Materi ini tidak akan dapat diakses lagi oleh siswa.')) return;
    try {
      const res = await fetch('/api/materi-ajar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ action: 'delete', id, teacher_code: code })
      });
      const data = await res.json();
      if (data.ok) { 
        showToast('Materi ajar berhasil dihapus!'); 
        fetchMateriData(); 
      } else {
        showToast(data.error || 'Gagal menghapus materi', 'error');
      }
    } catch (e) { 
      console.error(e); 
      showToast('Gagal menghapus materi ajar', 'error'); 
    }
  };

  // ── Derived Data ────────────────────────────────────────────
  const monitoringData = useMemo(() => {
    if (!teachers.length) return [];
    return teachers.map(t => {
      const teacherDocs = documents.filter(doc =>
        doc.teacher_code === t.code && doc.tahun_ajaran === (activeYear || form.tahun_ajaran)
      );
      
      const tCode = String(t.code || '').toLowerCase();
      
      const walasClasses = (classes || []).filter(c => 
        String(c.teacherCode || '').split(',').map(x => x.trim().toLowerCase()).includes(tCode)
      );
      const walasStr = walasClasses.length > 0 ? `Walas: ${walasClasses.map(c => c.name).join(', ')}` : '';
      
      const loads = (teachingLoads || []).filter(l => 
        String(l.teacherCode || '').split(',').map(x => x.trim().toLowerCase()).includes(tCode)
      );
      const uniqueSubjects = [...new Set(loads.map(l => l.subject).filter(Boolean))];
      const subjectStr = uniqueSubjects.length > 0 ? `Mapel: ${uniqueSubjects.join(', ')}` : '';
      
      const combinedStr = [walasStr, subjectStr].filter(Boolean).join(' | ');

      return {
        code: t.code, name: t.name,
        class_name: combinedStr || '-',
        hasSubmitted: teacherDocs.length > 0,
        documents: teacherDocs
      };
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [teachers, documents, activeYear, form.tahun_ajaran, classes, teachingLoads]);

  const stats = useMemo(() => {
    const total = monitoringData.length;
    const submitted = monitoringData.filter(d => d.hasSubmitted).length;
    const pending = total - submitted;
    const percentage = total > 0 ? Math.round((submitted / total) * 100) : 0;
    return { total, submitted, pending, percentage };
  }, [monitoringData]);

  const myDocuments = useMemo(() => documents.filter(doc => doc.teacher_code === teacherCode), [documents, teacherCode]);
  const myMateri = useMemo(() => materiList.filter(m => m.teacher_code === teacherCode), [materiList, teacherCode]);

  const filteredDocuments = useMemo(() => {
    const source = isCurriculum ? documents : myDocuments;
    return source.filter(doc => {
      const matchSearch = !searchTerm ||
        doc.nama_dokumen?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.teacher_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.mapel?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.kelas?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchMapel = filterMapel === 'all' || doc.mapel === filterMapel;
      return matchSearch && matchMapel;
    });
  }, [documents, myDocuments, isCurriculum, searchTerm, filterMapel]);

  const filteredMateri = useMemo(() => {
    const source = (userRole === 'guru' && activeTab === 'materi-saya') ? myMateri : materiList;
    return source.filter(m => {
      const matchSearch = !materiSearch ||
        m.judul?.toLowerCase().includes(materiSearch.toLowerCase()) ||
        m.teacher_name?.toLowerCase().includes(materiSearch.toLowerCase()) ||
        m.mapel?.toLowerCase().includes(materiSearch.toLowerCase()) ||
        m.deskripsi?.toLowerCase().includes(materiSearch.toLowerCase());
      
      const matchMapel = materiFilterMapel === 'all' || m.mapel === materiFilterMapel;
      const matchTipe = materiFilterTipe === 'all' || m.tipe === materiFilterTipe;
      return matchSearch && matchMapel && matchTipe;
    });
  }, [materiList, myMateri, userRole, activeTab, materiSearch, materiFilterMapel, materiFilterTipe]);

  // ── JSX: Shared Materi Card ─────────────────────────────────
  const renderMateriCard = (item, showDelete = false) => {
    const isLink = item.tipe === 'link';
    return (
      <div 
        key={item.id} 
        className="group relative flex flex-col justify-between p-4 sm:p-5 rounded-2xl border border-slate-200/90 bg-white hover:border-[var(--ui-primary)]/40 hover:shadow-md transition-all duration-200"
      >
        <div>
          {/* Top Badges */}
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[var(--ui-primary)]/10 text-[var(--ui-primary)] font-black text-xs">
                {item.mapel || 'Umum'}
              </span>
              <span className="inline-flex items-center px-2 py-1 rounded-lg bg-slate-100 text-slate-700 font-bold text-[11px]">
                {item.kelas_target ? `Kelas ${item.kelas_target}` : 'Semua Kelas'}
              </span>
              {item.semester && (
                <span className="inline-flex items-center px-2 py-1 rounded-lg bg-slate-100 text-slate-600 font-bold text-[11px]">
                  Sem. {item.semester}
                </span>
              )}
            </div>

            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
              isLink ? 'bg-indigo-50 text-indigo-700 border border-indigo-200/60' : 'bg-rose-50 text-rose-700 border border-rose-200/60'
            }`}>
              {isLink ? getLinkIcon(item.link_url) : <FileText size={12} className="text-rose-600 shrink-0" />}
              <span>{isLink ? 'Tautan Media' : 'Berkas PDF'}</span>
            </span>
          </div>

          {/* Title & Description */}
          <h4 className="text-sm sm:text-base font-black text-slate-800 leading-snug group-hover:text-[var(--ui-primary)] transition-colors">
            {item.judul}
          </h4>
          {item.deskripsi && (
            <p className="text-xs text-slate-500 font-medium mt-1.5 line-clamp-2 leading-relaxed">
              {item.deskripsi}
            </p>
          )}

          {/* Teacher & File Info */}
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between gap-2 text-[11px] text-slate-400 font-semibold">
            <span className="truncate">Oleh: <strong className="text-slate-700">{item.teacher_name}</strong></span>
            {item.nama_dokumen && (
              <span className="truncate max-w-[140px] text-slate-500 font-mono text-[10px]" title={item.nama_dokumen}>
                {item.nama_dokumen}
              </span>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-100">
          {isLink ? (
            <a 
              href={item.link_url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-black text-white bg-[var(--ui-primary)] hover:opacity-90 transition-all no-underline shadow-xs cursor-pointer"
            >
              {getLinkIcon(item.link_url)}
              <span>{getLinkLabel(item.link_url)}</span>
            </a>
          ) : (
            <>
              <Button 
                variant="outline" 
                onClick={() => handlePreviewPdf(item)} 
                className="flex-1 py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 border-slate-200 hover:bg-slate-50 cursor-pointer"
                title="Pratinjau Berkas"
              >
                <Eye size={14} className="text-slate-600" />
                <span>Pratinjau</span>
              </Button>
              <Button 
                onClick={() => downloadFile(item.file_url, item.nama_dokumen)}
                className="flex-1 py-2 px-3 rounded-xl text-xs font-black text-white bg-[var(--ui-primary)] hover:opacity-90 flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                title="Unduh Berkas"
              >
                <Download size={14} />
                <span>Unduh</span>
              </Button>
            </>
          )}

          {showDelete && (
            <Button 
              variant="outline" 
              onClick={() => handleDeleteMateri(item.id, item.teacher_code)}
              className="p-2 rounded-xl text-rose-600 hover:bg-rose-50 border-rose-200 cursor-pointer shrink-0" 
              title="Hapus Materi"
            >
              <Trash2 size={15} />
            </Button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5 relative animate-in fade-in duration-300 z-10 pb-16">
      {/* Page Header */}
      <PageHeader
        title="Modul & Materi Ajar"
        description="Pusat kelengkapan administrasi Modul Ajar (RPP) guru & media materi belajar interaktif siswa."
        icon={BookOpen}
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* TOP UNIFIED KPI SUMMARY STRIP (1x Lihat Langsung Paham) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex items-center gap-3">
          <div 
            className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-2xs"
            style={{ background: "color-mix(in srgb, var(--ui-primary) 12%, transparent)", color: "var(--ui-primary)" }}
          >
            <FileText size={20} className="stroke-[2.2]" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider truncate">
              {isCurriculum ? 'Total Modul RPP' : 'Modul RPP Saya'}
            </p>
            <p className="text-xl font-black text-slate-800 leading-tight">
              {isCurriculum ? documents.length : myDocuments.length} <span className="text-xs font-bold text-slate-400">Berkas</span>
            </p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0 border border-teal-100">
            <BookOpenText size={20} className="stroke-[2.2]" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider truncate">
              {isCurriculum ? 'Materi Publik' : 'Materi Siswa Saya'}
            </p>
            <p className="text-xl font-black text-slate-800 leading-tight">
              {isCurriculum ? materiList.length : myMateri.length} <span className="text-xs font-bold text-slate-400">Materi</span>
            </p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100">
            <Calendar size={20} className="stroke-[2.2]" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider truncate">Tahun Ajaran</p>
            <p className="text-sm font-black text-indigo-900 truncate" title={activeYear || 'Belum diatur'}>
              {activeYear || 'Belum diatur'}
            </p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100">
            <GraduationCap size={20} className="stroke-[2.2]" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider truncate">
              {userRole === 'guru' ? 'Mapel Diampu' : 'Status Pengumpulan'}
            </p>
            <p className="text-sm font-black text-slate-800 truncate" title={userRole === 'guru' ? (mySubjects.join(', ') || 'Umum') : `${stats.percentage}% Selesai`}>
              {userRole === 'guru' ? (mySubjects.join(', ') || 'Guru Pengampu') : `${stats.submitted}/${stats.total} Guru`}
            </p>
          </div>
        </div>
      </div>

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

      {/* ── TAB: Monitoring Pengumpulan RPP (Kurikulum) ── */}
      {activeTab === 'rekap' && isCurriculum && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 border-b border-slate-100 pb-4">
              <div>
                <h3 className="font-black text-slate-800 text-base">Monitoring Dokumen Modul Ajar (RPP)</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tahun Ajaran Aktif: <span className="font-extrabold text-[var(--ui-primary)]">{activeYear || 'Semua TA'}</span> &bull; {stats.submitted} dari {stats.total} Guru sudah mengumpulkan ({stats.percentage}%)
                </p>
              </div>
              <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                <input 
                  value={monitoringSearch} 
                  onChange={e => setMonitoringSearch(e.target.value)} 
                  placeholder="Cari nama / kode guru..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-[var(--ui-primary)]" 
                />
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-[10px] text-slate-500 uppercase border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 font-bold">Nama Guru</th>
                    <th className="px-4 py-3 font-bold">Kode</th>
                    <th className="px-4 py-3 font-bold">Tugas Mengajar / Walas</th>
                    <th className="px-4 py-3 text-center font-bold">Status</th>
                    <th className="px-4 py-3 font-bold">Dokumen Modul Ajar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoading ? (
                    <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-400 animate-pulse font-bold">Memuat data guru...</td></tr>
                  ) : monitoringData.filter(t => !monitoringSearch || t.name.toLowerCase().includes(monitoringSearch.toLowerCase()) || t.code.toLowerCase().includes(monitoringSearch.toLowerCase())).length === 0 ? (
                    <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-400 font-medium">Tidak ada data guru yang cocok.</td></tr>
                  ) : (
                    monitoringData.filter(t => !monitoringSearch || t.name.toLowerCase().includes(monitoringSearch.toLowerCase()) || t.code.toLowerCase().includes(monitoringSearch.toLowerCase())).map(teacher => (
                      <tr key={teacher.code} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-4 py-3 font-bold text-slate-800">{teacher.name}</td>
                        <td className="px-4 py-3 font-mono text-[11px] text-slate-500">{teacher.code}</td>
                        <td className="px-4 py-3 text-slate-600 font-medium">{teacher.class_name}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                            teacher.hasSubmitted ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
                          }`}>
                            {teacher.hasSubmitted ? <CheckCircle2 size={12} className="text-emerald-600 shrink-0" /> : <AlertCircle size={12} className="text-rose-600 shrink-0" />}
                            <span>{teacher.hasSubmitted ? 'Sudah Kumpul' : 'Belum Kumpul'}</span>
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {teacher.hasSubmitted ? (
                            <div className="space-y-1.5">
                              {teacher.documents.map(d => (
                                <div key={d.id} className="flex items-center justify-between gap-2 p-1.5 rounded-lg bg-slate-50 border border-slate-200/70">
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <FileText size={13} className="text-rose-500 shrink-0" />
                                    <span className="font-bold text-slate-800 truncate max-w-[150px]" title={d.nama_dokumen}>{d.nama_dokumen}</span>
                                    <span className="text-[10px] text-slate-400 font-bold">({d.mapel || 'Umum'} - {d.kelas || '-'})</span>
                                  </div>
                                  <div className="flex items-center gap-1 shrink-0">
                                    <Button variant="outline" onClick={() => handlePreviewPdf(d)} className="p-1 text-slate-600 hover:bg-slate-100 rounded-md cursor-pointer" title="Pratinjau">
                                      <Eye size={12} />
                                    </Button>
                                    <Button onClick={() => downloadFile(d.file_url, d.nama_dokumen)} className="p-1 bg-[var(--ui-primary)] text-white rounded-md cursor-pointer" title="Unduh">
                                      <Download size={12} />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">- Belum ada berkas -</span>
                          )}
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

      {/* ── TAB 1: Modul Saya (Arsip Modul RPP) ── */}
      {activeTab === 'daftar' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Header Action & Filter Bar */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-3">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <h3 className="text-base font-black text-slate-800">
                  {isCurriculum ? 'Arsip Seluruh Modul Ajar (RPP)' : 'Daftar Modul Ajar (RPP) Saya'}
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  {isCurriculum ? 'Seluruh berkas RPP yang telah diunggah oleh guru pengampu.' : 'Dokumen RPP yang telah Anda serahkan untuk evaluasi kurikulum.'}
                </p>
              </div>

              {userRole === 'guru' && (
                <button
                  type="button"
                  onClick={() => setActiveTab('unggah')}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[var(--ui-primary)] hover:opacity-90 text-white font-black text-xs shadow-xs transition-all cursor-pointer border-none"
                >
                  <UploadCloud size={15} />
                  <span>Unggah Modul Baru</span>
                </button>
              )}
            </div>

            {/* Filter Tools */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                <input 
                  value={searchTerm} 
                  onChange={e => setSearchTerm(e.target.value)} 
                  placeholder="Cari berdasarkan judul, mapel, kelas..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-[var(--ui-primary)]" 
                />
              </div>

              {availableSubjects.length > 0 && (
                <UISelect 
                  value={filterMapel} 
                  onChange={e => setFilterMapel(e.target.value)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none"
                >
                  <option value="all">Semua Mata Pelajaran</option>
                  {availableSubjects.map(s => <option key={s} value={s}>{s}</option>)}
                </UISelect>
              )}
            </div>
          </div>

          {/* Document Content List */}
          {filteredDocuments.length === 0 ? (
            <div className="p-8 sm:p-12 rounded-2xl bg-white border border-slate-200/90 shadow-2xs text-center flex flex-col items-center justify-center gap-3">
              <div 
                className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-inner"
                style={{ background: "color-mix(in srgb, var(--ui-primary) 12%, transparent)", color: "var(--ui-primary)" }}
              >
                <FileText size={32} className="stroke-[2.2]" />
              </div>
              <h4 className="text-base font-black text-slate-800">Belum Ada Modul Ajar (RPP)</h4>
              <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
                {userRole === 'guru' 
                  ? 'Anda belum mengunggah dokumen Modul Ajar (RPP). Klik tombol di bawah untuk mengunggah berkas PDF Modul Ajar Anda.' 
                  : 'Belum ada guru yang mengunggah dokumen Modul Ajar untuk filter yang dipilih.'}
              </p>
              {userRole === 'guru' && (
                <button
                  type="button"
                  onClick={() => setActiveTab('unggah')}
                  className="mt-2 flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--ui-primary)] hover:opacity-90 text-white font-black text-xs shadow-xs transition-all cursor-pointer border-none"
                >
                  <UploadCloud size={16} />
                  <span>Unggah Modul Ajar Sekarang</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredDocuments.map(doc => {
                const isMyOwn = doc.teacher_code === teacherCode;
                const canDelete = isCurriculum || isMyOwn;
                return (
                  <div 
                    key={doc.id} 
                    className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 hover:border-[var(--ui-primary)]/40 hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className="px-2.5 py-1 rounded-lg bg-[var(--ui-primary)]/10 text-[var(--ui-primary)] font-black text-xs">
                          {doc.mapel || 'Umum'}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-bold text-[10px]">
                          Kelas {doc.kelas || '-'} ({doc.semester || '-'})
                        </span>
                      </div>

                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center shrink-0 mt-0.5">
                          <FileText size={20} className="text-rose-600" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="text-sm font-black text-slate-800 leading-snug truncate" title={doc.nama_dokumen}>
                            {doc.nama_dokumen}
                          </h4>
                          <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500 font-medium">
                            <span>Guru: <strong className="text-slate-700">{doc.teacher_name}</strong></span>
                            <span>&bull;</span>
                            <span>TA: <strong className="text-slate-700">{doc.tahun_ajaran}</strong></span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-100">
                      <Button 
                        variant="outline" 
                        onClick={() => handlePreviewPdf(doc)} 
                        className="flex-1 py-2 text-xs font-black flex items-center justify-center gap-1.5 rounded-xl border-slate-200 hover:bg-slate-50 cursor-pointer"
                      >
                        <Eye size={14} className="text-slate-600" />
                        <span>Pratinjau</span>
                      </Button>
                      <Button 
                        onClick={() => downloadFile(doc.file_url, doc.nama_dokumen)}
                        className="flex-1 py-2 text-xs font-black text-white bg-[var(--ui-primary)] hover:opacity-90 rounded-xl flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                      >
                        <Download size={14} />
                        <span>Unduh</span>
                      </Button>
                      {canDelete && (
                        <Button 
                          variant="outline" 
                          onClick={() => handleDelete(doc.id, doc.teacher_code)} 
                          className="p-2 text-rose-600 hover:bg-rose-50 border-rose-200 rounded-xl cursor-pointer" 
                          title="Hapus Modul"
                        >
                          <Trash2 size={15} />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: Upload Modul Ajar (1x Lihat Langsung Paham) ── */}
      {activeTab === 'unggah' && userRole === 'guru' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 animate-in fade-in duration-200">
          {/* Main Interactive Upload Form (7 cols) */}
          <div className="lg:col-span-7 p-5 sm:p-6 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-5">
            <div className="border-b border-slate-100 pb-3">
              <span className="text-[10px] font-black uppercase tracking-wider text-[var(--ui-primary)]">
                Formulir Administrasi Guru
              </span>
              <h3 className="text-lg font-black text-slate-800 flex items-center gap-2 mt-0.5">
                <UploadCloud size={20} className="text-[var(--ui-primary)]" />
                Unggah Modul Ajar (RPP)
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Lengkapi identitas KBM dan pilih berkas PDF RPP Anda. Berkas ini akan langsung tersimpan di arsip sekolah.
              </p>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-4">
              {/* STEP 1: IDENTITAS PEMBELAJARAN */}
              <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/80 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-[var(--ui-primary)] text-white text-[11px] font-black flex items-center justify-center shrink-0">
                    1
                  </span>
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide">
                    Identitas Mata Pelajaran &amp; Kelas
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">
                      Mata Pelajaran <span className="text-rose-500">*</span>
                    </label>
                    <UISelect 
                      value={form.mapel} 
                      required 
                      onChange={e => setForm({ ...form, mapel: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-[var(--ui-primary)]"
                    >
                      <option value="">-- Pilih Mata Pelajaran --</option>
                      {availableSubjects.map(s => <option key={s} value={s}>{s}</option>)}
                    </UISelect>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">
                      Kelas Sasaran <span className="text-rose-500">*</span>
                    </label>
                    <UISelect 
                      value={form.kelas} 
                      required 
                      onChange={e => setForm({ ...form, kelas: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-[var(--ui-primary)]"
                    >
                      <option value="">-- Pilih Kelas --</option>
                      {availableClasses.map(c => <option key={c} value={c}>{c}</option>)}
                    </UISelect>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">
                      Semester <span className="text-rose-500">*</span>
                    </label>
                    <UISelect 
                      value={form.semester} 
                      required 
                      onChange={e => setForm({ ...form, semester: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-[var(--ui-primary)]"
                    >
                      <option value="Ganjil">Semester Ganjil</option>
                      <option value="Genap">Semester Genap</option>
                    </UISelect>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">
                      Tahun Ajaran <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={form.tahun_ajaran || activeYear || '2026/2027'}
                      className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>

              {/* STEP 2: BERKAS DOKUMEN (PDF DRAG & DROP ZONE) */}
              <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/80 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-[var(--ui-primary)] text-white text-[11px] font-black flex items-center justify-center shrink-0">
                      2
                    </span>
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide">
                      Pilih Berkas Modul Ajar (PDF) <span className="text-rose-500">*</span>
                    </h4>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400">Maks. 5 MB (.pdf)</span>
                </div>

                <div 
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                      processModulFile(e.dataTransfer.files[0]);
                    }
                  }}
                  onClick={() => document.getElementById('file-input')?.click()}
                  className={`p-6 rounded-2xl border-2 border-dashed text-center flex flex-col items-center justify-center gap-2 cursor-pointer transition-all ${
                    form.file_url 
                      ? 'bg-emerald-50/60 border-emerald-300' 
                      : isDragging 
                        ? 'bg-[var(--ui-primary)]/10 border-[var(--ui-primary)]' 
                        : 'bg-white border-slate-300 hover:bg-slate-50/80 hover:border-[var(--ui-primary)]/50'
                  }`}
                >
                  <input 
                    id="file-input" 
                    type="file" 
                    accept=".pdf" 
                    onChange={handleFileChange}
                    className="hidden" 
                  />

                  {form.file_url ? (
                    <div className="space-y-1.5 animate-in zoom-in-95 duration-150">
                      <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-2xs">
                        <CheckCircle2 size={24} className="stroke-[2.5]" />
                      </div>
                      <p className="text-xs font-black text-slate-800 truncate max-w-xs">{form.nama_dokumen}</p>
                      <p className="text-[11px] font-bold text-emerald-700">{form.file_size} &bull; Siap diunggah</p>
                      <span className="inline-block text-[10px] font-bold text-slate-400 hover:text-rose-600 underline mt-1">
                        Klik untuk mengganti berkas
                      </span>
                    </div>
                  ) : (
                    <>
                      <div 
                        className="w-12 h-12 rounded-xl flex items-center justify-center shadow-inner"
                        style={{ background: "color-mix(in srgb, var(--ui-primary) 12%, transparent)", color: "var(--ui-primary)" }}
                      >
                        <UploadCloud size={24} className="stroke-[2.2]" />
                      </div>
                      <div>
                        <p className="text-xs font-black text-slate-800">
                          Tarik berkas PDF ke sini atau <span className="text-[var(--ui-primary)] underline">Cari Berkas</span>
                        </p>
                        <p className="text-[11px] font-medium text-slate-400 mt-0.5">
                          Hanya format PDF dengan ukuran maksimal 5MB
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Error Message */}
              {uploadError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-rose-700 text-xs font-bold animate-in zoom-in-95 duration-200">
                  <AlertCircle size={15} className="shrink-0 mt-0.5" />
                  <span>{uploadError}</span>
                </div>
              )}

              {/* Submit Button */}
              <button 
                type="submit" 
                disabled={isUploading || !form.file_url}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-[var(--ui-primary)] hover:opacity-90 text-white text-xs font-black rounded-xl transition-all cursor-pointer border-none shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUploading ? (
                  <>
                    <RefreshCw size={15} className="animate-spin" />
                    <span>Sedang Mengunggah Modul...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={16} />
                    <span>Simpan &amp; Unggah Modul Ajar</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Right Side: Quick History & Tips (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            {/* Quick Upload History */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h4 className="font-black text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <FileCheck size={16} className="text-[var(--ui-primary)]" />
                  Modul Yang Sudah Diunggah
                </h4>
                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-black">
                  {myDocuments.length} Dokumen
                </span>
              </div>

              {myDocuments.length === 0 ? (
                <div className="py-8 text-center text-slate-400 space-y-1">
                  <FileText size={28} className="mx-auto opacity-30" />
                  <p className="text-xs font-bold">Belum ada modul yang diunggah.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                  {myDocuments.map(doc => (
                    <div key={doc.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="px-1.5 py-0.5 rounded bg-[var(--ui-primary)]/10 text-[var(--ui-primary)] text-[9px] font-black">
                            {doc.mapel}
                          </span>
                          <span className="text-[10px] font-bold text-slate-500">
                            Kelas {doc.kelas} ({doc.semester})
                          </span>
                        </div>
                        <p className="text-xs font-black text-slate-800 truncate mt-1" title={doc.nama_dokumen}>
                          {doc.nama_dokumen}
                        </p>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <Button 
                          variant="outline" 
                          onClick={() => handlePreviewPdf(doc)} 
                          className="p-1.5 text-slate-600 hover:bg-slate-200 rounded-lg cursor-pointer" 
                          title="Pratinjau"
                        >
                          <Eye size={13} />
                        </Button>
                        <Button 
                          variant="outline" 
                          onClick={() => handleDelete(doc.id, doc.teacher_code)} 
                          className="p-1.5 text-rose-600 hover:bg-rose-50 border-rose-200 rounded-lg cursor-pointer" 
                          title="Hapus"
                        >
                          <Trash2 size={13} />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Instruction Tip Card */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50 via-teal-50/40 to-slate-50 border border-emerald-200/80 space-y-2">
              <div className="flex items-center gap-2 text-emerald-800 font-black text-xs">
                <Sparkles size={16} className="text-emerald-600 shrink-0" />
                <span>Petunjuk Format Modul Ajar</span>
              </div>
              <ul className="text-[11px] text-slate-600 space-y-1 pl-4 list-disc font-medium">
                <li>Format file wajib dalam bentuk <strong>.PDF</strong> (Maks. 5MB).</li>
                <li>Pastikan dokumen mencakup: <em>Tujuan Pembelajaran, Langkah KBM, dan Asesmen/Rubrik Penilaian</em>.</li>
                <li>Modul yang diunggah akan otomatis terverifikasi pada monitoring kurikulum.</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 3: Materi Saya (Media Belajar Siswa) ── */}
      {activeTab === 'materi-saya' && userRole === 'guru' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-3">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <h3 className="text-base font-black text-slate-800">Materi Pembelajaran Publik Saya</h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Materi yang Anda publikasikan dapat diakses langsung oleh siswa melalui halaman materi publik.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <a 
                  href="/materi-ajar" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-all no-underline shrink-0"
                >
                  <ExternalLink size={13} />
                  <span>Lihat Layar Siswa</span>
                </a>

                <button
                  type="button"
                  onClick={() => setActiveTab('materi-unggah')}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[var(--ui-primary)] hover:opacity-90 text-white font-black text-xs shadow-xs transition-all cursor-pointer border-none"
                >
                  <Upload size={14} />
                  <span>Upload Materi Baru</span>
                </button>
              </div>
            </div>

            {/* Filter Tools */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                <input 
                  value={materiSearch} 
                  onChange={e => setMateriSearch(e.target.value)} 
                  placeholder="Cari materi pembelajaran..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-[var(--ui-primary)]" 
                />
              </div>

              <UISelect 
                value={materiFilterTipe} 
                onChange={e => setMateriFilterTipe(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none"
              >
                <option value="all">Semua Format</option>
                <option value="file">Berkas PDF</option>
                <option value="link">Tautan Media</option>
              </UISelect>
            </div>
          </div>

          {/* List Content */}
          {isMateriLoading ? (
            <div className="p-12 text-center text-slate-400 font-bold animate-pulse">Memuat materi ajar...</div>
          ) : filteredMateri.length === 0 ? (
            <div className="p-8 sm:p-12 rounded-2xl bg-white border border-slate-200/90 shadow-2xs text-center flex flex-col items-center justify-center gap-3">
              <div 
                className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-inner"
                style={{ background: "color-mix(in srgb, var(--ui-primary) 12%, transparent)", color: "var(--ui-primary)" }}
              >
                <BookOpenText size={32} className="stroke-[2.2]" />
              </div>
              <h4 className="text-base font-black text-slate-800">Belum Ada Materi Pembelajaran</h4>
              <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
                Anda belum mempublikasikan materi pembelajaran untuk siswa. Bagikan modul atau video agar siswa dapat belajar mandiri.
              </p>
              <button
                type="button"
                onClick={() => setActiveTab('materi-unggah')}
                className="mt-2 flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--ui-primary)] hover:opacity-90 text-white font-black text-xs shadow-xs transition-all cursor-pointer border-none"
              >
                <Upload size={16} />
                <span>Publikasikan Materi Sekarang</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredMateri.map(item => renderMateriCard(item, true))}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 4: Upload Materi Ajar (Publik) ── */}
      {activeTab === 'materi-unggah' && userRole === 'guru' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 animate-in fade-in duration-200">
          {/* Main Upload Form (7 cols) */}
          <div className="lg:col-span-7 p-5 sm:p-6 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-5">
            <div className="border-b border-slate-100 pb-3">
              <span className="text-[10px] font-black uppercase tracking-wider text-[var(--ui-primary)]">
                Publikasi Siswa
              </span>
              <h3 className="text-lg font-black text-slate-800 flex items-center gap-2 mt-0.5">
                <BookOpenText size={20} className="text-[var(--ui-primary)]" />
                Publikasikan Materi Ajar Siswa
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Materi yang dipublikasikan akan langsung muncul di beranda materi belajar siswa.
              </p>
            </div>

            <form onSubmit={handleMateriUploadSubmit} className="space-y-4">
              {/* Jenis Materi Switcher (PDF vs Link) */}
              <div className="space-y-1.5">
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wide">
                  Pilih Format Materi <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setMateriForm(f => ({ ...f, tipe: 'file' }))}
                    className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-black transition-all cursor-pointer ${
                      materiForm.tipe === 'file' 
                        ? 'bg-white text-[var(--ui-primary)] shadow-xs' 
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <FileText size={16} />
                    <span>Berkas Dokumen (PDF)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMateriForm(f => ({ ...f, tipe: 'link' }))}
                    className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-black transition-all cursor-pointer ${
                      materiForm.tipe === 'link' 
                        ? 'bg-white text-[var(--ui-primary)] shadow-xs' 
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Link2 size={16} />
                    <span>Tautan Video / Drive</span>
                  </button>
                </div>
              </div>

              {/* Judul Materi */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Judul Materi Pembelajaran <span className="text-rose-500">*</span>
                </label>
                <input 
                  value={materiForm.judul} 
                  required 
                  onChange={e => setMateriForm(f => ({ ...f, judul: e.target.value }))}
                  placeholder="Contoh: Bab 1: Pengenalan Algoritma &amp; Pemrograman"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-[var(--ui-primary)] focus:bg-white transition-all" 
                />
              </div>

              {/* Mapel & Kelas Target */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Mata Pelajaran <span className="text-rose-500">*</span>
                  </label>
                  <UISelect 
                    value={materiForm.mapel} 
                    required 
                    onChange={e => setMateriForm(f => ({ ...f, mapel: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none"
                  >
                    <option value="">-- Pilih Mata Pelajaran --</option>
                    {availableSubjects.map(s => <option key={s} value={s}>{s}</option>)}
                  </UISelect>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Kelas Sasaran
                  </label>
                  <UISelect 
                    value={materiForm.kelas_target} 
                    onChange={e => setMateriForm(f => ({ ...f, kelas_target: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none"
                  >
                    <option value="">Semua Kelas</option>
                    {availableClasses.map(c => <option key={c} value={c}>{c}</option>)}
                  </UISelect>
                </div>
              </div>

              {/* File Upload Zone OR Link Input */}
              {materiForm.tipe === 'file' ? (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Unggah Berkas PDF Materi <span className="text-rose-500">*</span>
                  </label>
                  <div 
                    onDragOver={(e) => { e.preventDefault(); setIsMateriDragging(true); }}
                    onDragLeave={() => setIsMateriDragging(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsMateriDragging(false);
                      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                        processMateriFile(e.dataTransfer.files[0]);
                      }
                    }}
                    onClick={() => document.getElementById('materi-file-input')?.click()}
                    className={`p-6 rounded-2xl border-2 border-dashed text-center flex flex-col items-center justify-center gap-2 cursor-pointer transition-all ${
                      materiForm.file_url 
                        ? 'bg-emerald-50/60 border-emerald-300' 
                        : isMateriDragging 
                          ? 'bg-[var(--ui-primary)]/10 border-[var(--ui-primary)]' 
                          : 'bg-slate-50 border-slate-300 hover:bg-white hover:border-[var(--ui-primary)]/50'
                    }`}
                  >
                    <input 
                      id="materi-file-input" 
                      type="file" 
                      accept=".pdf" 
                      onChange={handleMateriFileChange}
                      className="hidden" 
                    />

                    {materiForm.file_url ? (
                      <div className="space-y-1.5 animate-in zoom-in-95 duration-150">
                        <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-2xs">
                          <CheckCircle2 size={22} className="stroke-[2.5]" />
                        </div>
                        <p className="text-xs font-black text-slate-800 truncate max-w-xs">{materiForm.nama_dokumen}</p>
                        <p className="text-[11px] font-bold text-emerald-700">{materiForm.file_size} &bull; Berkas terpilih</p>
                      </div>
                    ) : (
                      <>
                        <Upload size={24} className="text-slate-400" />
                        <p className="text-xs font-black text-slate-800">
                          Tarik berkas PDF materi ke sini atau <span className="text-[var(--ui-primary)] underline">Cari File</span>
                        </p>
                        <p className="text-[11px] font-medium text-slate-400">
                          Maksimal ukuran 5MB (.pdf)
                        </p>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Tautan / URL Materi <span className="text-rose-500">*</span>
                  </label>
                  <input 
                    value={materiForm.link_url} 
                    required 
                    onChange={e => setMateriForm(f => ({ ...f, link_url: e.target.value }))}
                    placeholder="Contoh: https://youtube.com/watch?v=... atau https://drive.google.com/..."
                    type="url"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-[var(--ui-primary)] focus:bg-white transition-all" 
                  />
                  <p className="text-[11px] text-slate-400 font-medium mt-1">
                    Mendukung tautan Google Drive, video YouTube, atau artikel website pembelajaran.
                  </p>
                </div>
              )}

              {/* Deskripsi */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Deskripsi / Ringkasan Materi (Opsional)
                </label>
                <textarea 
                  value={materiForm.deskripsi} 
                  onChange={e => setMateriForm(f => ({ ...f, deskripsi: e.target.value }))}
                  placeholder="Tuliskan petunjuk belajar atau ringkasan materi untuk siswa..."
                  rows={2}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-[var(--ui-primary)] focus:bg-white resize-none" 
                />
              </div>

              {/* Error Message */}
              {materiUploadError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-rose-700 text-xs font-bold animate-in zoom-in-95 duration-200">
                  <AlertCircle size={15} className="shrink-0 mt-0.5" />
                  <span>{materiUploadError}</span>
                </div>
              )}

              {/* Submit Button */}
              <button 
                type="submit" 
                disabled={isUploadingMateri}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-[var(--ui-primary)] hover:opacity-90 text-white text-xs font-black rounded-xl transition-all cursor-pointer border-none shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUploadingMateri ? (
                  <>
                    <RefreshCw size={15} className="animate-spin" />
                    <span>Sedang Mempublikasikan...</span>
                  </>
                ) : (
                  <>
                    <BookOpenText size={16} />
                    <span>Publikasikan Materi Sekarang</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Right Side: Live Card Preview for Students (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h4 className="font-black text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <Eye size={15} className="text-[var(--ui-primary)]" />
                  Simulasi Tampilan di Siswa
                </h4>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black">
                  Pratinjau Nyata
                </span>
              </div>

              <div className="p-4 rounded-2xl border-2 border-slate-200/80 bg-slate-50/50 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="px-2.5 py-0.5 rounded-lg bg-[var(--ui-primary)] text-white text-[10px] font-black uppercase">
                    {materiForm.mapel || 'Mata Pelajaran'}
                  </span>
                  <span className="text-[10px] font-bold text-slate-500">
                    {materiForm.kelas_target ? `Kelas ${materiForm.kelas_target}` : 'Semua Kelas'}
                  </span>
                </div>

                <div>
                  <h5 className="text-sm font-black text-slate-800 leading-snug">
                    {materiForm.judul || 'Judul Materi Belajar Siswa...'}
                  </h5>
                  <p className="text-xs text-slate-500 font-medium mt-1 line-clamp-2">
                    {materiForm.deskripsi || 'Ringkasan materi pembelajaran akan muncul di bagian ini.'}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-200/70 flex items-center justify-between text-[10px] text-slate-400 font-bold">
                  <span>Guru: {teacherName || 'Bapak/Ibu Guru'}</span>
                  <span>{materiForm.tipe === 'link' ? 'Tautan Media' : 'Dokumen PDF'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB: Materi Publik (Kurikulum View) ── */}
      {activeTab === 'materi-daftar' && isCurriculum && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-3">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <h3 className="text-base font-black text-slate-800">Semua Materi Pembelajaran Publik</h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Seluruh materi belajar yang telah diunggah oleh guru dan dapat diakses siswa.
                </p>
              </div>

              <a 
                href="/materi-ajar" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white bg-[var(--ui-primary)] hover:opacity-90 transition-all no-underline shadow-xs shrink-0"
              >
                <ExternalLink size={13} />
                <span>Buka Halaman Siswa</span>
              </a>
            </div>

            {/* Filter Tools */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                <input 
                  value={materiSearch} 
                  onChange={e => setMateriSearch(e.target.value)} 
                  placeholder="Cari materi pembelajaran..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-[var(--ui-primary)]" 
                />
              </div>

              <UISelect 
                value={materiFilterTipe} 
                onChange={e => setMateriFilterTipe(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none"
              >
                <option value="all">Semua Format</option>
                <option value="file">Berkas PDF</option>
                <option value="link">Tautan Media</option>
              </UISelect>
            </div>
          </div>

          {/* Grid Content */}
          {isMateriLoading ? (
            <div className="p-12 text-center text-slate-400 font-bold animate-pulse">Memuat materi...</div>
          ) : filteredMateri.length === 0 ? (
            <div className="p-8 sm:p-12 rounded-2xl bg-white border border-slate-200/90 shadow-2xs text-center flex flex-col items-center justify-center gap-3">
              <BookOpenText size={36} className="text-slate-300" />
              <h4 className="text-base font-black text-slate-800">Belum Ada Materi Terpublikasi</h4>
              <p className="text-xs text-slate-500">Belum ada materi ajar yang cocok dengan filter.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredMateri.map(item => renderMateriCard(item, isCurriculum))}
            </div>
          )}
        </div>
      )}

      {/* Floating Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-xl shadow-lg font-bold text-xs flex items-center gap-2 animate-in slide-in-from-bottom-5 text-white ${toast.type === 'error' ? 'bg-rose-600' : 'bg-emerald-600'} z-50`}>
          {toast.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />} 
          <span>{toast.message}</span>
        </div>
      )}

      {/* PDF Modal Viewer */}
      {previewDoc && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-4xl shadow-xl overflow-hidden flex flex-col h-[85vh] animate-in fade-in zoom-in-95 duration-200">
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="text-rose-600 w-5 h-5 shrink-0" />
                <h4 className="font-black text-slate-800 text-xs sm:text-sm truncate max-w-md" title={previewDoc.title}>
                  {previewDoc.title}
                </h4>
              </div>
              <Button 
                variant="outline"
                onClick={() => {
                  if (previewDoc.url.startsWith('blob:')) URL.revokeObjectURL(previewDoc.url);
                  setPreviewDoc(null);
                }}
                className="p-1.5 rounded-lg border-slate-200 hover:bg-slate-200 cursor-pointer"
              >
                <X size={16} />
              </Button>
            </div>
            <div className="flex-1 bg-slate-800 p-2 relative flex items-center justify-center">
              <iframe 
                src={previewDoc.url} 
                title="Pratinjau Berkas" 
                className="w-full h-full border-none rounded-xl bg-white" 
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
