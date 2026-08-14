import React, { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import { 
  BookOpen, BookOpenText, Link2, Video, Globe, ExternalLink,
  Users, CheckCircle2, AlertCircle, RefreshCw, Search, FileText, Eye, 
  Download, Trash2, Upload, X, PenTool, LayoutList, BarChart3, 
  UploadCloud, Plus, Calendar, GraduationCap, ChevronRight, FileCheck,
  Check, Filter, Layers, PlayCircle, Clock, Zap, Sparkles, ShieldCheck
} from 'lucide-react';
import useAuthStore from '../../../store/monitoring/authStore.js';
import { base64ToBlobUrl, downloadFile, optimizePdfFile } from '../../../utils/fileHelper.js';
import { PageHeader } from '../../../components/monitoring/ui/index.js';
import { Button, UISelect, Modal } from '../../../components/ui.jsx';

const TabSilabus = lazy(() => import('../tabs/TabSilabus.jsx'));
const TabSilabusGuru = lazy(() => import('../tabs/TabSilabusGuru.jsx'));

// ── Helpers ──────────────────────────────────────────────────────
const getLinkIcon = (url) => {
  if (!url) return <Link2 size={14} className="shrink-0" />;
  if (url.includes('youtube.com') || url.includes('youtu.be')) return <Video size={14} className="text-rose-500 shrink-0" />;
  if (url.includes('drive.google.com')) return <Globe size={14} className="text-blue-500 shrink-0" />;
  return <ExternalLink size={14} className="text-indigo-500 shrink-0" />;
};

const getLinkLabel = (url) => {
  if (!url) return 'Buka Tautan';
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'Video Pembelajaran';
  if (url.includes('drive.google.com')) return 'Google Drive';
  return 'Tautan Materi';
};

export default function ModulAjar(props) {
  const { appSettings = {}, teachingLoads = [], classes = [], subjects = [] } = props;

  // ── Data states ──────────────────────────────────────────────
  const [documents, setDocuments] = useState([]);
  const [materiList, setMateriList] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // ── Unified 1-Page Filter states ─────────────────────────────
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all' | 'modul' | 'materi'
  const [filterMapel, setFilterMapel] = useState('all');
  const [monitoringSearch, setMonitoringSearch] = useState('');

  // ── Modal states ─────────────────────────────────────────────
  const [isModulModalOpen, setIsModulModalOpen] = useState(false);
  const [isMateriModalOpen, setIsMateriModalOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [toast, setToast] = useState(null);

  const authToken = useAuthStore(state => state.user?.authToken);
  const user = useAuthStore(state => state.user || {});
  const userRole = user.role || 'guru';
  const teacherCode = user.code || '';
  const teacherName = user.name || '';

  const division = (user?.division || '').toLowerCase();
  const isCurriculum = userRole === 'admin' || userRole === 'superadmin' || userRole === 'waka_kurikulum' || (userRole === 'waka' && division === 'kurikulum');
  const academicYears = appSettings?.academicYears || [];
  const activeYear = useMemo(() => academicYears.find(y => y.is_active)?.nama || '', [academicYears]);

  // ── Tab state ────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState(isCurriculum ? 'rekap' : 'modul-materi');

  // ── Form State: Upload Modul Ajar (RPP) ──────────────────────
  const [modulForm, setModulForm] = useState({
    nama_dokumen: '', file_url: '',
    tahun_ajaran: activeYear || '',
    mapel: '', semester: 'Ganjil',
    file_size: null, original_size: null,
    saved_percent: 0, is_compressed: false
  });
  const [isOptimizingModul, setIsOptimizingModul] = useState(false);
  const [isUploadingModul, setIsUploadingModul] = useState(false);
  const [modulError, setModulError] = useState('');

  // ── Form State: Upload Materi Ajar (Siswa) ───────────────────
  const [materiForm, setMateriForm] = useState({
    judul: '', deskripsi: '', tipe: 'file',
    file_url: '', nama_dokumen: '', link_url: '',
    mapel: '', semester: 'Ganjil', tahun_ajaran: activeYear || '',
    file_size: null, original_size: null,
    saved_percent: 0, is_compressed: false
  });
  const [isOptimizingMateri, setIsOptimizingMateri] = useState(false);
  const [isUploadingMateri, setIsUploadingMateri] = useState(false);
  const [materiError, setMateriError] = useState('');

  // ── Teacher Teaching Loads ──────────────────────────────────
  const userCode = String(teacherCode || user?.username || user?.id || '').trim().toLowerCase();
  const userName = String(teacherName || user?.name || '').trim().toLowerCase();

  const mySubjects = useMemo(() => {
    const set = new Set();

    // 1. From teachingLoads
    (teachingLoads || []).forEach(l => {
      const codes = String(l.teacherCode || '').split(',').map(c => c.trim().toLowerCase());
      const loadName = String(l.teacherName || '').trim().toLowerCase();
      if (
        (userCode && codes.includes(userCode)) ||
        (userName && loadName === userName)
      ) {
        if (l.subject) set.add(l.subject);
        if (l.subjectName) set.add(l.subjectName);
      }
    });

    // 2. From schedule
    (props.schedule || []).forEach(s => {
      const sCode = String(s.teacher || s.teacherCode || '').trim().toLowerCase();
      const sName = String(s.teacherName || '').trim().toLowerCase();
      if ((userCode && sCode === userCode) || (userName && sName === userName)) {
        if (s.subject) set.add(s.subject);
        if (s.mapel) set.add(s.mapel);
      }
    });

    // 3. From teachers master data
    const teacherList = teachers.length > 0 ? teachers : (props.teachers || []);
    const currentTeacher = teacherList.find(t => {
      const tCode = String(t.code || t.id || '').trim().toLowerCase();
      const tName = String(t.name || '').trim().toLowerCase();
      return (userCode && tCode === userCode) || (userName && tName === userName);
    });
    if (currentTeacher) {
      if (currentTeacher.mapel) {
        String(currentTeacher.mapel).split(',').forEach(m => m.trim() && set.add(m.trim()));
      }
      if (currentTeacher.subject) {
        String(currentTeacher.subject).split(',').forEach(m => m.trim() && set.add(m.trim()));
      }
      if (Array.isArray(currentTeacher.subjects)) {
        currentTeacher.subjects.forEach(m => m && set.add(m));
      }
    }

    // 4. From existing documents / materi
    (documents || []).forEach(d => {
      const dCode = String(d.teacher_code || '').trim().toLowerCase();
      const dName = String(d.teacher_name || '').trim().toLowerCase();
      if ((userCode && dCode === userCode) || (userName && dName === userName)) {
        if (d.mapel) set.add(d.mapel);
      }
    });

    return Array.from(set).filter(Boolean).sort();
  }, [teachingLoads, props.schedule, teachers, props.teachers, documents, userCode, userName]);

  const availableSubjects = useMemo(() => {
    if (userRole === 'guru' && mySubjects.length > 0) return mySubjects;
    if (mySubjects.length > 0 && !isCurriculum) return mySubjects;
    return [...new Set((subjects || []).map(s => s.name || s.subjectName).filter(Boolean))].sort();
  }, [userRole, isCurriculum, mySubjects, subjects]);

  // Set initial form defaults
  useEffect(() => {
    if (availableSubjects.length > 0) {
      setModulForm(prev => prev.mapel && availableSubjects.includes(prev.mapel) ? prev : { ...prev, mapel: availableSubjects[0] });
      setMateriForm(prev => prev.mapel && availableSubjects.includes(prev.mapel) ? prev : { ...prev, mapel: availableSubjects[0] });
    }
  }, [availableSubjects]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handlePreviewPdf = (doc) => {
    if (!doc || !doc.file_url) {
      showToast('Berkas tidak ditemukan untuk dipratinjau', 'error');
      return;
    }
    const blobUrl = base64ToBlobUrl(doc.file_url);
    setPreviewDoc({ url: blobUrl, title: doc.nama_dokumen || doc.judul || 'Pratinjau Dokumen' });
  };

  const closePreviewDoc = () => {
    if (previewDoc?.url && typeof previewDoc.url === 'string' && previewDoc.url.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(previewDoc.url);
      } catch (err) {
        console.warn('Revoke blob URL:', err);
      }
    }
    setPreviewDoc(null);
  };

  // Keyboard shortcut (ESC) to close modals
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (previewDoc) closePreviewDoc();
        if (isModulModalOpen) setIsModulModalOpen(false);
        if (isMateriModalOpen) setIsMateriModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previewDoc, isModulModalOpen, isMateriModalOpen]);

  // ── Fetch Data ──────────────────────────────────────────────
  const fetchModulData = async () => {
    if (!authToken) return;
    setIsLoading(true);
    try {
      const [docRes, dataRes, materiRes] = await Promise.all([
        fetch('/api/modul-ajar-guru', { headers: { Authorization: `Bearer ${authToken}` } }),
        fetch('/api/data/load', { headers: { Authorization: `Bearer ${authToken}` } }),
        fetch('/api/materi-ajar')
      ]);
      const docData = await docRes.json();
      if (docData.ok) setDocuments(docData.data || []);
      const dataPayload = await dataRes.json();
      if (dataPayload.payload?.teachers) setTeachers(dataPayload.payload.teachers || []);
      const materiData = await materiRes.json();
      if (materiData.ok) setMateriList(materiData.data || []);
    } catch (e) {
      console.error(e);
      showToast('Gagal memuat data modul dan materi ajar', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchModulData();
    if (activeYear) {
      setModulForm(prev => ({ ...prev, tahun_ajaran: activeYear }));
      setMateriForm(prev => ({ ...prev, tahun_ajaran: activeYear }));
    }
  }, [authToken, activeYear]);

  // ── Tabs Navigation ─────────────────────────────────────────
  const tabs = useMemo(() => {
    const list = [];
    if (isCurriculum) {
      list.push({ id: 'rekap', label: 'Monitoring RPP', icon: BarChart3 });
      list.push({ id: 'modul-materi', label: 'Arsip Modul & Materi', icon: LayoutList });
      list.push({ id: 'silabus', label: 'Penyusunan RPP', icon: PenTool });
    } else {
      list.push({ id: 'modul-materi', label: 'Modul & Materi Ajar', icon: BookOpenText });
      list.push({ id: 'silabusguru', label: 'Penyusunan RPP', icon: PenTool });
    }
    return list;
  }, [isCurriculum]);

  useEffect(() => {
    if (tabs.length > 0) {
      setActiveTab(prev => tabs.some(t => t.id === prev) ? prev : tabs[0].id);
    }
  }, [tabs]);

  // ── Smart File Processors with Automatic PDF Compression ────
  const handleModulFile = async (file) => {
    if (!file) return;
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (ext !== '.pdf') {
      setModulError(`Ekstensi berkas "${ext}" tidak diizinkan. Harap pilih berkas dengan format .pdf`);
      return;
    }
    // Limit: 15 MB max
    if (file.size > 15 * 1024 * 1024) {
      setModulError('Ukuran file terlalu besar! Maksimal ukuran berkas yang diperbolehkan adalah 15 MB.');
      return;
    }
    setModulError('');
    setIsOptimizingModul(true);
    try {
      const optResult = await optimizePdfFile(file);
      setModulForm(prev => ({
        ...prev,
        file_url: optResult.dataUrl,
        nama_dokumen: file.name,
        file_size: optResult.compressedSizeStr,
        original_size: optResult.originalSizeStr,
        saved_percent: optResult.savedPercent,
        is_compressed: optResult.isCompressed
      }));
    } catch (err) {
      console.error(err);
      setModulError('Gagal memproses berkas PDF.');
    } finally {
      setIsOptimizingModul(false);
    }
  };

  const handleMateriFile = async (file) => {
    if (!file) return;
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (ext !== '.pdf') {
      setMateriError(`Ekstensi berkas "${ext}" tidak diizinkan. Harap pilih berkas dengan format .pdf`);
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setMateriError('Ukuran file terlalu besar! Maksimal ukuran berkas yang diperbolehkan adalah 15 MB.');
      return;
    }
    setMateriError('');
    setIsOptimizingMateri(true);
    try {
      const optResult = await optimizePdfFile(file);
      setMateriForm(prev => ({
        ...prev,
        file_url: optResult.dataUrl,
        nama_dokumen: file.name,
        file_size: optResult.compressedSizeStr,
        original_size: optResult.originalSizeStr,
        saved_percent: optResult.savedPercent,
        is_compressed: optResult.isCompressed
      }));
    } catch (err) {
      console.error(err);
      setMateriError('Gagal memproses berkas PDF materi.');
    } finally {
      setIsOptimizingMateri(false);
    }
  };

  // ── Submit: Upload Modul Ajar (RPP) ─────────────────────────
  const handleModulSubmit = async (e) => {
    e.preventDefault();
    setModulError('');
    if (!modulForm.file_url) return setModulError('Pilih berkas Modul Ajar (PDF) terlebih dahulu.');
    if (!modulForm.mapel) return setModulError('Pilih Mata Pelajaran.');

    setIsUploadingModul(true);
    try {
      const res = await fetch('/api/modul-ajar-guru', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({
          action: 'upload', teacher_code: teacherCode || 'admin',
          teacher_name: teacherName || 'Administrator',
          nama_dokumen: modulForm.nama_dokumen, file_url: modulForm.file_url,
          tahun_ajaran: modulForm.tahun_ajaran || activeYear, 
          mapel: modulForm.mapel, kelas: '-', semester: modulForm.semester
        })
      });
      const data = await res.json();
      if (data.ok) {
        showToast('Modul Ajar (RPP) berhasil diunggah!');
        setIsModulModalOpen(false);
        setModulForm({
          nama_dokumen: '', file_url: '',
          tahun_ajaran: activeYear,
          mapel: availableSubjects[0] || '',
          semester: 'Ganjil',
          file_size: null, original_size: null,
          saved_percent: 0, is_compressed: false
        });
        fetchModulData();
      } else {
        setModulError(data.error || 'Gagal mengunggah Modul Ajar.');
      }
    } catch (err) {
      console.error(err);
      setModulError('Terjadi gangguan saat mengunggah berkas.');
    } finally {
      setIsUploadingModul(false);
    }
  };

  // ── Submit: Upload Materi Ajar Siswa ─────────────────────────
  const handleMateriSubmit = async (e) => {
    e.preventDefault();
    setMateriError('');
    if (!materiForm.judul.trim()) return setMateriError('Judul materi pembelajaran wajib diisi.');
    if (!materiForm.mapel) return setMateriError('Pilih Mata Pelajaran.');
    if (materiForm.tipe === 'file' && !materiForm.file_url) return setMateriError('Pilih berkas PDF materi terlebih dahulu.');
    if (materiForm.tipe === 'link' && !materiForm.link_url.trim()) return setMateriError('Masukkan URL link materi (YouTube/Google Drive).');

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
          mapel: materiForm.mapel, kelas_target: 'Semua',
          semester: materiForm.semester, tahun_ajaran: materiForm.tahun_ajaran || activeYear
        })
      });
      const data = await res.json();
      if (data.ok) {
        showToast('Materi Pembelajaran berhasil dipublikasikan!');
        setIsMateriModalOpen(false);
        setMateriForm({
          judul: '', deskripsi: '', tipe: 'file',
          file_url: '', nama_dokumen: '', link_url: '',
          mapel: availableSubjects[0] || '',
          semester: 'Ganjil', tahun_ajaran: activeYear,
          file_size: null, original_size: null,
          saved_percent: 0, is_compressed: false
        });
        fetchModulData();
      } else {
        setMateriError(data.error || 'Gagal mempublikasikan materi.');
      }
    } catch (err) {
      console.error(err);
      setMateriError('Terjadi gangguan saat mempublikasikan materi.');
    } finally {
      setIsUploadingMateri(false);
    }
  };

  // ── Delete Handlers ─────────────────────────────────────────
  const handleDeleteModul = async (id, code) => {
    if (!await window.confirmAsync('Hapus berkas Modul Ajar (RPP) ini?')) return;
    try {
      const res = await fetch('/api/modul-ajar-guru', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ action: 'delete', id, teacher_code: code })
      });
      const data = await res.json();
      if (data.ok) {
        showToast('Modul Ajar berhasil dihapus!');
        fetchModulData();
      } else {
        showToast(data.error || 'Gagal menghapus modul', 'error');
      }
    } catch (e) {
      console.error(e);
      showToast('Gagal menghapus modul ajar', 'error');
    }
  };

  const handleDeleteMateri = async (id, code) => {
    if (!await window.confirmAsync('Hapus materi pembelajaran ini? Siswa tidak akan dapat mengaksesnya lagi.')) return;
    try {
      const res = await fetch('/api/materi-ajar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ action: 'delete', id, teacher_code: code })
      });
      const data = await res.json();
      if (data.ok) {
        showToast('Materi ajar berhasil dihapus!');
        fetchModulData();
      } else {
        showToast(data.error || 'Gagal menghapus materi', 'error');
      }
    } catch (e) {
      console.error(e);
      showToast('Gagal menghapus materi', 'error');
    }
  };

  // ── Derived Unified Items for 1-Page List ────────────────────
  const myDocs = useMemo(() => isCurriculum ? documents : documents.filter(d => d.teacher_code === teacherCode), [documents, isCurriculum, teacherCode]);
  const myMateris = useMemo(() => isCurriculum ? materiList : materiList.filter(m => m.teacher_code === teacherCode), [materiList, isCurriculum, teacherCode]);

  const unifiedList = useMemo(() => {
    const list = [];
    // 1. Modul Ajar (RPP) items
    if (filterType === 'all' || filterType === 'modul') {
      myDocs.forEach(d => {
        list.push({
          id: `modul-${d.id}`,
          originalId: d.id,
          itemType: 'modul',
          title: d.nama_dokumen || 'Modul Ajar (RPP)',
          mapel: d.mapel || 'Umum',
          kelas: d.kelas && d.kelas !== '-' ? d.kelas : null,
          semester: d.semester || 'Ganjil',
          tahun_ajaran: d.tahun_ajaran || activeYear,
          teacher_name: d.teacher_name,
          teacher_code: d.teacher_code,
          file_url: d.file_url,
          nama_dokumen: d.nama_dokumen,
          created_at: d.created_at || d.tanggal
        });
      });
    }
    // 2. Materi Pembelajaran (Siswa) items
    if (filterType === 'all' || filterType === 'materi') {
      myMateris.forEach(m => {
        list.push({
          id: `materi-${m.id}`,
          originalId: m.id,
          itemType: 'materi',
          tipe: m.tipe, // 'file' | 'link'
          title: m.judul || 'Materi Pembelajaran',
          deskripsi: m.deskripsi,
          mapel: m.mapel || 'Umum',
          kelas: m.kelas_target && m.kelas_target !== 'Semua' && m.kelas_target !== '-' ? m.kelas_target : null,
          semester: m.semester || 'Ganjil',
          tahun_ajaran: m.tahun_ajaran || activeYear,
          teacher_name: m.teacher_name,
          teacher_code: m.teacher_code,
          file_url: m.file_url,
          nama_dokumen: m.nama_dokumen,
          link_url: m.link_url,
          created_at: m.created_at
        });
      });
    }

    // Filter by Search & Mapel
    return list.filter(item => {
      const matchSearch = !searchTerm ||
        item.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.mapel?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.teacher_name?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchMapel = filterMapel === 'all' || item.mapel === filterMapel;
      return matchSearch && matchMapel;
    });
  }, [myDocs, myMateris, filterType, filterMapel, searchTerm, activeYear]);

  // ── Derived Monitoring Stats (Kurikulum) ─────────────────────
  const monitoringData = useMemo(() => {
    if (!teachers.length) return [];
    return teachers.map(t => {
      const teacherDocs = documents.filter(doc =>
        doc.teacher_code === t.code && doc.tahun_ajaran === activeYear
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
  }, [teachers, documents, activeYear, classes, teachingLoads]);

  const stats = useMemo(() => {
    const total = monitoringData.length;
    const submitted = monitoringData.filter(d => d.hasSubmitted).length;
    const pending = total - submitted;
    const percentage = total > 0 ? Math.round((submitted / total) * 100) : 0;
    return { total, submitted, pending, percentage };
  }, [monitoringData]);

  return (
    <div className="space-y-4 relative animate-in fade-in duration-300 z-10 pb-20">
      {/* Top Header */}
      <PageHeader
        title="Modul & Materi Ajar"
        description="Kelola Modul Ajar (RPP Guru) dan Materi Pembelajaran Siswa dalam satu halaman praktis."
        icon={BookOpen}
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* ── TAB: Monitoring Pengumpulan RPP (Kurikulum View) ── */}
      {activeTab === 'rekap' && isCurriculum && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Quick Stat Strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Total Guru</p>
              <p className="text-xl font-black text-slate-800 mt-0.5">{stats.total} Guru</p>
            </div>
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Sudah Mengumpulkan</p>
              <p className="text-xl font-black text-emerald-700 mt-0.5">{stats.submitted} Guru</p>
            </div>
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Belum Mengumpulkan</p>
              <p className="text-xl font-black text-rose-700 mt-0.5">{stats.pending} Guru</p>
            </div>
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Tingkat Kepatuhan</p>
              <p className="text-xl font-black text-[var(--ui-primary)] mt-0.5">{stats.percentage}%</p>
            </div>
          </div>

          {/* Monitoring Table */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-black text-slate-800 text-sm">Status Pengumpulan Modul Ajar (RPP)</h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Tahun Ajaran: <strong className="text-[var(--ui-primary)]">{activeYear || 'Semua TA'}</strong>
                </p>
              </div>
              <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                <input 
                  value={monitoringSearch} 
                  onChange={e => setMonitoringSearch(e.target.value)} 
                  placeholder="Cari guru / kode..."
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
                    <th className="px-4 py-3 font-bold">Tugas Mengajar</th>
                    <th className="px-4 py-3 text-center font-bold">Status</th>
                    <th className="px-4 py-3 font-bold">Berkas RPP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {monitoringData.filter(t => !monitoringSearch || t.name.toLowerCase().includes(monitoringSearch.toLowerCase()) || t.code.toLowerCase().includes(monitoringSearch.toLowerCase())).map(teacher => (
                    <tr key={teacher.code} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3 font-bold text-slate-800">{teacher.name}</td>
                      <td className="px-4 py-3 font-mono text-slate-500">{teacher.code}</td>
                      <td className="px-4 py-3 text-slate-600">{teacher.class_name}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase ${
                          teacher.hasSubmitted ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
                        }`}>
                          {teacher.hasSubmitted ? <CheckCircle2 size={11} className="text-emerald-600" /> : <AlertCircle size={11} className="text-rose-600" />}
                          <span>{teacher.hasSubmitted ? 'Sudah Kumpul' : 'Belum Kumpul'}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {teacher.hasSubmitted ? (
                          <div className="space-y-1">
                            {teacher.documents.map(d => (
                              <div key={d.id} className="flex items-center justify-between gap-2 p-1.5 rounded-lg bg-slate-50 border border-slate-200">
                                <span className="font-bold text-slate-700 truncate max-w-[160px]" title={d.nama_dokumen}>{d.nama_dokumen}</span>
                                <div className="flex items-center gap-1">
                                  <Button variant="outline" onClick={() => handlePreviewPdf(d)} className="p-1 rounded cursor-pointer" title="Pratinjau"><Eye size={12} /></Button>
                                  <Button onClick={() => downloadFile(d.file_url, d.nama_dokumen)} className="p-1 bg-[var(--ui-primary)] text-white rounded cursor-pointer" title="Unduh"><Download size={12} /></Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : <span className="text-slate-400 italic text-[11px]">-</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB: Penyusunan RPP (Silabus) ── */}
      {activeTab === 'silabus' && isCurriculum && (
        <Suspense fallback={<div className="p-12 text-center text-slate-500 font-bold animate-pulse">Memuat Modul Ajar...</div>}>
          <TabSilabus {...props} hideHeader={true} />
        </Suspense>
      )}

      {activeTab === 'silabusguru' && userRole === 'guru' && (
        <Suspense fallback={<div className="p-12 text-center text-slate-500 font-bold animate-pulse">Memuat Modul Ajar Saya...</div>}>
          <TabSilabusGuru
            {...props}
            availableSubjects={availableSubjects}
            myDocuments={myDocs}
            fetchData={fetchModulData}
            activeYear={activeYear}
            authToken={authToken}
            handleDelete={handleDeleteModul}
          />
        </Suspense>
      )}

      {/* ── UNIFIED 1-PAGE: DAFTAR MODUL AJAR & MATERI ── */}
      {activeTab === 'modul-materi' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Main Controls Card */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3.5">
            {/* Header Title & 2 Direct Action Buttons */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <h3 className="text-base font-black text-slate-800">
                  {isCurriculum ? 'Daftar Semua Modul & Materi Ajar' : 'Modul & Materi Pembelajaran Saya'}
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Kelola dokumen RPP guru dan publikasikan materi siswa langsung dalam satu tampilan.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
                <button
                  type="button"
                  onClick={() => setIsModulModalOpen(true)}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-xs transition-all cursor-pointer border-none"
                >
                  <UploadCloud size={15} />
                  <span>+ Unggah Modul (RPP)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsMateriModalOpen(true)}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-[var(--ui-primary)] hover:opacity-90 text-white font-black text-xs shadow-xs transition-all cursor-pointer border-none"
                >
                  <BookOpenText size={15} />
                  <span>+ Tambah Materi Siswa</span>
                </button>
              </div>
            </div>

            {/* Filter Pills & Search */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5 pt-3 border-t border-slate-100">
              {/* Type Filter Pills (Semua / Modul / Materi) */}
              <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setFilterType('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
                    filterType === 'all' 
                      ? 'bg-white text-slate-800 shadow-xs' 
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Semua ({myDocs.length + myMateris.length})
                </button>

                <button
                  type="button"
                  onClick={() => setFilterType('modul')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
                    filterType === 'modul' 
                      ? 'bg-white text-emerald-700 shadow-xs' 
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <FileText size={13} className="text-emerald-600 shrink-0" />
                  <span>Modul Ajar / RPP ({myDocs.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFilterType('materi')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
                    filterType === 'materi' 
                      ? 'bg-white text-[var(--ui-primary)] shadow-xs' 
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <BookOpenText size={13} className="text-[var(--ui-primary)] shrink-0" />
                  <span>Materi Siswa ({myMateris.length})</span>
                </button>
              </div>

              {/* Search & Subject Filter */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1 sm:w-56">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                  <input 
                    value={searchTerm} 
                    onChange={e => setSearchTerm(e.target.value)} 
                    placeholder="Cari judul / mapel..."
                    className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-[var(--ui-primary)]" 
                  />
                </div>

                {availableSubjects.length > 0 && (
                  <UISelect 
                    value={filterMapel} 
                    onChange={e => setFilterMapel(e.target.value)}
                    className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none"
                  >
                    <option value="all">Semua Mapel</option>
                    {availableSubjects.map(s => <option key={s} value={s}>{s}</option>)}
                  </UISelect>
                )}
              </div>
            </div>
          </div>

          {/* Unified Document Cards Grid */}
          {unifiedList.length === 0 ? (
            <div className="p-8 sm:p-12 rounded-2xl bg-white border border-slate-200 shadow-2xs text-center flex flex-col items-center justify-center gap-3">
              <div 
                className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-inner"
                style={{ background: "color-mix(in srgb, var(--ui-primary) 12%, transparent)", color: "var(--ui-primary)" }}
              >
                <BookOpen size={30} className="stroke-[2.2]" />
              </div>
              <h4 className="text-base font-black text-slate-800">Belum Ada Dokumen / Materi</h4>
              <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
                Anda belum mengunggah Modul Ajar (RPP) atau Materi Belajar Siswa. Klik salah satu tombol di bawah untuk mulai mengunggah dengan mudah.
              </p>
              <div className="flex items-center gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setIsModulModalOpen(true)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-xs transition-all cursor-pointer border-none"
                >
                  <UploadCloud size={15} />
                  <span>Unggah Modul (RPP)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsMateriModalOpen(true)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[var(--ui-primary)] hover:opacity-90 text-white font-black text-xs shadow-xs transition-all cursor-pointer border-none"
                >
                  <BookOpenText size={15} />
                  <span>Tambah Materi Siswa</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {unifiedList.map(item => {
                const isModul = item.itemType === 'modul';
                const isLink = item.tipe === 'link';
                const canDelete = isCurriculum || item.teacher_code === teacherCode;

                return (
                  <div 
                    key={item.id} 
                    className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 hover:border-[var(--ui-primary)]/40 hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <div>
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-2 mb-2.5">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                          isModul 
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                            : isLink 
                              ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' 
                              : 'bg-blue-50 text-blue-700 border border-blue-200'
                        }`}>
                          {isModul ? <FileText size={11} className="text-emerald-600 shrink-0" /> : isLink ? getLinkIcon(item.link_url) : <BookOpenText size={11} className="text-blue-600 shrink-0" />}
                          <span>{isModul ? 'Modul Ajar (RPP)' : isLink ? 'Materi (Tautan)' : 'Materi (PDF Siswa)'}</span>
                        </span>

                        <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                          {item.kelas ? `Kelas ${item.kelas} &bull; ` : ''}Sem. {item.semester}
                        </span>
                      </div>

                      {/* Title & Subject */}
                      <div className="flex items-start gap-2.5 mt-1">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                          isModul ? 'bg-emerald-50 text-emerald-700' : isLink ? 'bg-indigo-50 text-indigo-700' : 'bg-blue-50 text-blue-700'
                        }`}>
                          {isModul ? <FileText size={18} /> : isLink ? getLinkIcon(item.link_url) : <BookOpenText size={18} />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="text-[10px] font-black uppercase tracking-wider text-[var(--ui-primary)]">
                            {item.mapel}
                          </span>
                          <h4 className="text-xs sm:text-sm font-black text-slate-800 leading-snug line-clamp-2 mt-0.5" title={item.title}>
                            {item.title}
                          </h4>
                          {item.deskripsi && (
                            <p className="text-[11px] text-slate-500 font-medium line-clamp-2 mt-1">
                              {item.deskripsi}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Subtitle / Teacher info */}
                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold mt-3 pt-2.5 border-t border-slate-100">
                        <span>Guru: <strong className="text-slate-700">{item.teacher_name}</strong></span>
                        <span>TA: {item.tahun_ajaran}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 mt-3 pt-2.5 border-t border-slate-100">
                      {isLink ? (
                        <a 
                          href={item.link_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl text-xs font-black text-white bg-[var(--ui-primary)] hover:opacity-90 no-underline shadow-xs cursor-pointer"
                        >
                          {getLinkIcon(item.link_url)}
                          <span>{getLinkLabel(item.link_url)}</span>
                        </a>
                      ) : (
                        <>
                          <Button 
                            variant="outline" 
                            onClick={() => handlePreviewPdf(item)} 
                            className="flex-1 py-1.5 text-xs font-black flex items-center justify-center gap-1 rounded-xl border-slate-200 hover:bg-slate-50 cursor-pointer"
                            title="Pratinjau Berkas"
                          >
                            <Eye size={13} className="text-slate-600" />
                            <span>Pratinjau</span>
                          </Button>
                          <Button 
                            onClick={() => downloadFile(item.file_url, item.nama_dokumen || item.title)}
                            className="flex-1 py-1.5 text-xs font-black text-white bg-[var(--ui-primary)] hover:opacity-90 rounded-xl flex items-center justify-center gap-1 shadow-xs cursor-pointer"
                            title="Unduh Berkas"
                          >
                            <Download size={13} />
                            <span>Unduh</span>
                          </Button>
                        </>
                      )}

                      {canDelete && (
                        <Button 
                          variant="outline" 
                          onClick={() => isModul ? handleDeleteModul(item.originalId, item.teacher_code) : handleDeleteMateri(item.originalId, item.teacher_code)} 
                          className="p-1.5 text-rose-600 hover:bg-rose-50 border-rose-200 rounded-xl cursor-pointer" 
                          title="Hapus"
                        >
                          <Trash2 size={14} />
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

      {/* ── MODAL 1: UNGGAH MODUL AJAR (RPP GURU) ── */}
      {isModulModalOpen && (
        <Modal 
          isOpen={true} 
          onClose={() => setIsModulModalOpen(false)} 
          title="Unggah Modul Ajar (RPP)"
          maxWidth="max-w-md"
        >
          <form onSubmit={handleModulSubmit} className="space-y-4">
            {/* Format & Specification Info Alert */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-2.5">
              <ShieldCheck size={16} className="text-emerald-600 shrink-0 mt-0.5" />
              <div className="text-[11px] text-slate-600 font-medium leading-relaxed">
                Format yang diizinkan: <strong className="text-slate-800 font-black">PDF (.pdf)</strong> &bull; Ukuran Maks: <strong className="text-slate-800 font-black">15 MB</strong>
                <p className="text-[10px] text-emerald-700 font-bold mt-0.5 flex items-center gap-1">
                  <Zap size={11} className="fill-emerald-600 text-emerald-600" />
                  <span>Kompresi cerdas otomatis aktif &bull; Kualitas dokumen tetap 100% tajam.</span>
                </p>
              </div>
            </div>

            {/* Mata Pelajaran */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Mata Pelajaran <span className="text-rose-500">*</span>
              </label>
              <UISelect 
                value={modulForm.mapel} 
                required 
                onChange={e => setModulForm({ ...modulForm, mapel: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none"
              >
                <option value="">-- Pilih Mata Pelajaran --</option>
                {availableSubjects.map(s => <option key={s} value={s}>{s}</option>)}
              </UISelect>
            </div>

            {/* Semester & TA */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Semester <span className="text-rose-500">*</span>
                </label>
                <UISelect 
                  value={modulForm.semester} 
                  required 
                  onChange={e => setModulForm({ ...modulForm, semester: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none"
                >
                  <option value="Ganjil">Semester Ganjil</option>
                  <option value="Genap">Semester Genap</option>
                </UISelect>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tahun Ajaran
                </label>
                <input
                  type="text"
                  readOnly
                  value={modulForm.tahun_ajaran || activeYear || '2026/2027'}
                  className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 cursor-not-allowed"
                />
              </div>
            </div>

            {/* File PDF Picker */}
            <div>
              <div className="flex items-center justify-between gap-2 mb-1">
                <label className="text-xs font-bold text-slate-700">
                  Pilih Berkas PDF Modul Ajar <span className="text-rose-500">*</span>
                </label>
                <span className="text-[10px] font-black text-slate-400">Hanya .pdf (Maks. 15MB)</span>
              </div>
              <input 
                type="file" 
                accept=".pdf" 
                required
                onChange={e => handleModulFile(e.target.files[0])}
                className="w-full text-xs file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-black file:bg-[var(--ui-primary)] file:text-white hover:file:opacity-90 cursor-pointer"
              />

              {/* Optimizing State */}
              {isOptimizingModul && (
                <div className="mt-2 p-2 rounded-xl bg-slate-100 border border-slate-200 flex items-center gap-2 text-xs font-bold text-slate-600 animate-pulse">
                  <RefreshCw size={14} className="animate-spin text-[var(--ui-primary)]" />
                  <span>Mengoptimasi &amp; mengompresi berkas PDF...</span>
                </div>
              )}

              {/* Success / Compressed info */}
              {modulForm.nama_dokumen && !isOptimizingModul && (
                <div className="mt-2 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                      <span className="font-bold text-emerald-900 truncate">{modulForm.nama_dokumen}</span>
                    </div>
                    <span className="text-[10px] font-black text-emerald-700 shrink-0">{modulForm.file_size}</span>
                  </div>
                  {modulForm.is_compressed && modulForm.saved_percent > 0 && (
                    <p className="text-[10px] font-bold text-emerald-700 flex items-center gap-1">
                      <Zap size={11} className="fill-emerald-600 text-emerald-600" />
                      <span>Ukuran dioptimalkan dari {modulForm.original_size} &bull; Lebih hemat {modulForm.saved_percent}% tanpa kurangi kualitas</span>
                    </p>
                  )}
                </div>
              )}
            </div>

            {modulError && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-700 text-xs font-bold">
                <AlertCircle size={15} className="shrink-0" />
                <span>{modulError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <Button variant="outline" type="button" onClick={() => setIsModulModalOpen(false)} className="rounded-xl text-xs font-bold">
                Batal
              </Button>
              <button 
                type="submit" 
                disabled={isUploadingModul || isOptimizingModul || !modulForm.file_url}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl shadow-xs transition-all cursor-pointer border-none disabled:opacity-50"
              >
                {isUploadingModul ? 'Mengunggah...' : 'Simpan & Unggah Modul'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── MODAL 2: TAMBAH MATERI PEMBELAJARAN SISWA ── */}
      {isMateriModalOpen && (
        <Modal 
          isOpen={true} 
          onClose={() => setIsMateriModalOpen(false)} 
          title="Tambah Materi Pembelajaran Siswa"
          maxWidth="max-w-md"
        >
          <form onSubmit={handleMateriSubmit} className="space-y-4">
            {/* Format & Specification Info Alert */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-2.5">
              <ShieldCheck size={16} className="text-indigo-600 shrink-0 mt-0.5" />
              <div className="text-[11px] text-slate-600 font-medium leading-relaxed">
                Materi dapat berupa <strong className="text-slate-800 font-black">Berkas PDF (.pdf maks. 15MB)</strong> atau <strong className="text-slate-800 font-black">Tautan Link Video/Drive</strong>.
                <p className="text-[10px] text-indigo-700 font-bold mt-0.5 flex items-center gap-1">
                  <Zap size={11} className="fill-indigo-600 text-indigo-600" />
                  <span>Kompresi otomatis PDF aktif &bull; Cepat diunduh siswa.</span>
                </p>
              </div>
            </div>

            {/* Format Switcher */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
              <button
                type="button"
                onClick={() => setMateriForm(f => ({ ...f, tipe: 'file' }))}
                className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-black transition-all cursor-pointer ${
                  materiForm.tipe === 'file' ? 'bg-white text-[var(--ui-primary)] shadow-xs' : 'text-slate-600'
                }`}
              >
                <FileText size={14} />
                <span>Berkas PDF</span>
              </button>

              <button
                type="button"
                onClick={() => setMateriForm(f => ({ ...f, tipe: 'link' }))}
                className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-black transition-all cursor-pointer ${
                  materiForm.tipe === 'link' ? 'bg-white text-[var(--ui-primary)] shadow-xs' : 'text-slate-600'
                }`}
              >
                <Link2 size={14} />
                <span>Tautan / Link</span>
              </button>
            </div>

            {/* Judul Materi */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Judul Materi <span className="text-rose-500">*</span>
              </label>
              <input 
                value={materiForm.judul} 
                required 
                onChange={e => setMateriForm(f => ({ ...f, judul: e.target.value }))}
                placeholder="Contoh: Bab 1: Dasar Pemrograman Web"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-[var(--ui-primary)]" 
              />
            </div>

            {/* Mata Pelajaran & Semester */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mata Pelajaran <span className="text-rose-500">*</span>
                </label>
                <UISelect 
                  value={materiForm.mapel} 
                  required 
                  onChange={e => setMateriForm(f => ({ ...f, mapel: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none"
                >
                  <option value="">-- Pilih Mapel --</option>
                  {availableSubjects.map(s => <option key={s} value={s}>{s}</option>)}
                </UISelect>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Semester <span className="text-rose-500">*</span>
                </label>
                <UISelect 
                  value={materiForm.semester} 
                  required 
                  onChange={e => setMateriForm(f => ({ ...f, semester: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none"
                >
                  <option value="Ganjil">Semester Ganjil</option>
                  <option value="Genap">Semester Genap</option>
                </UISelect>
              </div>
            </div>

            {/* File PDF or Link URL */}
            {materiForm.tipe === 'file' ? (
              <div>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <label className="text-xs font-bold text-slate-700">
                    Pilih Berkas PDF Materi <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[10px] font-black text-slate-400">Hanya .pdf (Maks. 15MB)</span>
                </div>
                <input 
                  type="file" 
                  accept=".pdf" 
                  required
                  onChange={e => handleMateriFile(e.target.files[0])}
                  className="w-full text-xs file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-black file:bg-[var(--ui-primary)] file:text-white hover:file:opacity-90 cursor-pointer"
                />

                {/* Optimizing State */}
                {isOptimizingMateri && (
                  <div className="mt-2 p-2 rounded-xl bg-slate-100 border border-slate-200 flex items-center gap-2 text-xs font-bold text-slate-600 animate-pulse">
                    <RefreshCw size={14} className="animate-spin text-[var(--ui-primary)]" />
                    <span>Mengoptimasi berkas PDF materi...</span>
                  </div>
                )}

                {/* Success / Compressed info */}
                {materiForm.nama_dokumen && !isOptimizingMateri && (
                  <div className="mt-2 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                        <span className="font-bold text-emerald-900 truncate">{materiForm.nama_dokumen}</span>
                      </div>
                      <span className="text-[10px] font-black text-emerald-700 shrink-0">{materiForm.file_size}</span>
                    </div>
                    {materiForm.is_compressed && materiForm.saved_percent > 0 && (
                      <p className="text-[10px] font-bold text-emerald-700 flex items-center gap-1">
                        <Zap size={11} className="fill-emerald-600 text-emerald-600" />
                        <span>Dioptimalkan dari {materiForm.original_size} &bull; Lebih hemat {materiForm.saved_percent}%</span>
                      </p>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tautan Link (YouTube / Google Drive) <span className="text-rose-500">*</span>
                </label>
                <input 
                  value={materiForm.link_url} 
                  required 
                  onChange={e => setMateriForm(f => ({ ...f, link_url: e.target.value }))}
                  placeholder="https://youtube.com/... atau https://drive.google.com/..."
                  type="url"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-[var(--ui-primary)]" 
                />
              </div>
            )}

            {/* Deskripsi */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Keterangan / Deskripsi Singkat (Opsional)
              </label>
              <textarea 
                value={materiForm.deskripsi} 
                onChange={e => setMateriForm(f => ({ ...f, deskripsi: e.target.value }))}
                placeholder="Tuliskan petunjuk belajar singkat untuk siswa..."
                rows={2}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-[var(--ui-primary)] resize-none" 
              />
            </div>

            {materiError && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-700 text-xs font-bold">
                <AlertCircle size={15} className="shrink-0" />
                <span>{materiError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <Button variant="outline" type="button" onClick={() => setIsMateriModalOpen(false)} className="rounded-xl text-xs font-bold">
                Batal
              </Button>
              <button 
                type="submit" 
                disabled={isUploadingMateri || isOptimizingMateri}
                className="px-4 py-2 bg-[var(--ui-primary)] hover:opacity-90 text-white text-xs font-black rounded-xl shadow-xs transition-all cursor-pointer border-none disabled:opacity-50"
              >
                {isUploadingMateri ? 'Mempublikasikan...' : 'Simpan & Publikasikan'}
              </button>
            </div>
          </form>
        </Modal>
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
        <div 
          onClick={closePreviewDoc}
          className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col h-[85vh] animate-in fade-in zoom-in-95 duration-150 cursor-default"
          >
            <div className="px-4 sm:px-5 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/90 gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="text-rose-600 w-5 h-5 shrink-0" />
                <h4 className="font-black text-slate-800 text-xs sm:text-sm truncate max-w-md" title={previewDoc?.title || 'Pratinjau Berkas'}>
                  {previewDoc?.title || 'Pratinjau Berkas'}
                </h4>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {previewDoc?.url && (
                  <button
                    type="button"
                    onClick={() => downloadFile(previewDoc.url, previewDoc.title || 'dokumen.pdf')}
                    className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
                    title="Unduh Berkas"
                  >
                    <Download size={15} />
                  </button>
                )}
                <button 
                  type="button"
                  onClick={closePreviewDoc}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 text-slate-600 transition-colors cursor-pointer"
                  title="Tutup Pratinjau (ESC)"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
            <div className="flex-1 bg-slate-800 p-2 relative flex items-center justify-center">
              {previewDoc?.url ? (
                <iframe 
                  src={previewDoc.url} 
                  title="Pratinjau Berkas" 
                  className="w-full h-full border-none rounded-xl bg-white" 
                />
              ) : (
                <div className="text-white text-xs font-bold">Berkas tidak dapat dimuat.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
