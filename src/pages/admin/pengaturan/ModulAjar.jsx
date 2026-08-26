import React, { useState, useEffect, useMemo, useRef, lazy, Suspense } from 'react';
import { 
  BookOpen, BookOpenText, Link2, Video, Globe, ExternalLink,
  Users, CheckCircle2, AlertCircle, RefreshCw, Search, FileText, Eye, 
  Download, Trash2, Upload, X, PenTool, LayoutList, BarChart3, Edit2,
  UploadCloud, Plus, Calendar, GraduationCap, ChevronRight, FileCheck,
  Check, Filter, Layers, PlayCircle, Clock, Zap, Sparkles, ShieldCheck,
  LayoutGrid, List, SlidersHorizontal, ArrowUpRight, FolderOpen, UserCheck, UserX
} from 'lucide-react';
import useAuthStore from '../../../store/monitoring/authStore.js';
import { useAppStore } from '../../../store/useAppStore.js';
import { base64ToBlobUrl, downloadFile, optimizePdfFile } from '../../../utils/fileHelper.js';
import { PageHeader } from '../../../components/monitoring/ui/index.js';
import { Button, Modal } from '../../../components/ui.jsx';
import { CustomSelect } from '../../../components/CustomSelect.jsx';

const TabSilabus = lazy(() => import('../tabs/TabSilabus.jsx'));
const TabSilabusGuru = lazy(() => import('../tabs/TabSilabusGuru.jsx'));

const EMPTY_ARRAY = [];
const EMPTY_OBJECT = {};

// ── Helpers ──────────────────────────────────────────────────────
const getLinkIcon = (url) => {
  if (!url) return <Link2 size={14} className="shrink-0" />;
  if (url.includes('youtube.com') || url.includes('youtu.be')) return <Video size={14} className="text-rose-500 shrink-0" />;
  if (url.includes('drive.google.com')) return <Globe size={14} className="text-indigo-500 shrink-0" />;
  return <ExternalLink size={14} className="text-indigo-500 shrink-0" />;
};

const getLinkLabel = (url) => {
  if (!url) return 'Buka Tautan';
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'Video Pembelajaran';
  if (url.includes('drive.google.com')) return 'Google Drive';
  return 'Tautan Materi';
};

export default function ModulAjar(props) {
  const storeTeachers = useAppStore(state => state.teachers) || EMPTY_ARRAY;
  const storeTeachingLoads = useAppStore(state => state.teachingLoads) || EMPTY_ARRAY;
  const storeClasses = useAppStore(state => state.classes) || EMPTY_ARRAY;
  const storeSubjects = useAppStore(state => state.subjects) || EMPTY_ARRAY;
  const storeAppSettings = useAppStore(state => state.appSettings) || EMPTY_OBJECT;

  const { appSettings: propAppSettings, teachingLoads: propTeachingLoads, classes: propClasses, subjects: propSubjects, teachers: propTeachers } = props;

  // ── Data states ──────────────────────────────────────────────
  const [documents, setDocuments] = useState(EMPTY_ARRAY);
  const [materiList, setMateriList] = useState(EMPTY_ARRAY);
  const [apiTeachers, setApiTeachers] = useState(EMPTY_ARRAY);
  const [isLoading, setIsLoading] = useState(true);

  // ── Unified Master Data with Store Fallback ──────────────────
  const allTeachers = useMemo(() => {
    if (propTeachers && propTeachers.length > 0) return propTeachers;
    if (storeTeachers && storeTeachers.length > 0) return storeTeachers;
    if (apiTeachers && apiTeachers.length > 0) return apiTeachers;
    return EMPTY_ARRAY;
  }, [propTeachers, storeTeachers, apiTeachers]);

  const allTeachingLoads = useMemo(() => {
    if (propTeachingLoads && propTeachingLoads.length > 0) return propTeachingLoads;
    if (storeTeachingLoads && storeTeachingLoads.length > 0) return storeTeachingLoads;
    return EMPTY_ARRAY;
  }, [propTeachingLoads, storeTeachingLoads]);

  const allClasses = useMemo(() => {
    if (propClasses && propClasses.length > 0) return propClasses;
    if (storeClasses && storeClasses.length > 0) return storeClasses;
    return EMPTY_ARRAY;
  }, [propClasses, storeClasses]);

  const allSubjects = useMemo(() => {
    if (propSubjects && propSubjects.length > 0) return propSubjects;
    if (storeSubjects && storeSubjects.length > 0) return storeSubjects;
    return EMPTY_ARRAY;
  }, [propSubjects, storeSubjects]);

  const appSettings = useMemo(() => {
    if (propAppSettings && Object.keys(propAppSettings).length > 0) return propAppSettings;
    return storeAppSettings || EMPTY_OBJECT;
  }, [propAppSettings, storeAppSettings]);

  // ── Unified 1-Page Filter states ─────────────────────────────
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all' | 'modul' | 'materi'
  const [filterMapel, setFilterMapel] = useState('all');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'
  const [monitoringSearch, setMonitoringSearch] = useState('');
  const [monitoringStatusFilter, setMonitoringStatusFilter] = useState('all'); // 'all' | 'submitted' | 'pending'

  // ── Modal states ─────────────────────────────────────────────
  const [isModulModalOpen, setIsModulModalOpen] = useState(false);
  const [isMateriModalOpen, setIsMateriModalOpen] = useState(false);
  const [renameModalOpen, setRenameModalOpen] = useState(false);
  const [renameData, setRenameData] = useState({ id: null, type: '', currentName: '', newName: '' });
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameError, setRenameError] = useState('');
  const [previewDoc, setPreviewDoc] = useState(null);
  const [toast, setToast] = useState(null);
  const [isDraggingModul, setIsDraggingModul] = useState(false);
  const [isDraggingMateri, setIsDraggingMateri] = useState(false);

  const modulFileInputRef = useRef(null);
  const materiFileInputRef = useRef(null);

  const authToken = useAuthStore(state => state.user?.authToken);
  const user = useAuthStore(state => state.user || EMPTY_OBJECT);
  const userRole = user.role || 'guru';
  const teacherCode = user.code || '';
  const teacherName = user.name || '';

  const division = (user?.division || '').toLowerCase();
  const isCurriculum = userRole === 'admin' || userRole === 'superadmin' || userRole === 'waka_kurikulum' || (userRole === 'waka' && division === 'kurikulum');
  const academicYears = appSettings?.academicYears || EMPTY_ARRAY;
  const activeYear = useMemo(() => academicYears.find(y => y.is_active)?.nama || '', [academicYears]);

  // ── Tab state ────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState(isCurriculum ? 'rekap' : 'modul-materi');

  // ── Form State: Upload Modul Ajar (RPP) ──────────────────────
  const [modulForm, setModulForm] = useState({
    nama_dokumen: '', file_url: '',
    tahun_ajaran: activeYear || '',
    mapel: '', semester: 'Ganjil', kelas: '-',
    deskripsi: '',
    file_size: null, original_size: null,
    saved_percent: 0, is_compressed: false
  });
  const [isOptimizingModul, setIsOptimizingModul] = useState(false);
  const [modulProgress, setModulProgress] = useState({ percent: 0, text: '', fileName: '' });
  const [isUploadingModul, setIsUploadingModul] = useState(false);
  const [modulError, setModulError] = useState('');

  // ── Form State: Upload Materi Ajar (Siswa) ───────────────────
  const [materiForm, setMateriForm] = useState({
    judul: '', deskripsi: '', tipe: 'file',
    file_url: '', nama_dokumen: '', link_url: '',
    mapel: '', semester: 'Ganjil', tahun_ajaran: activeYear || '', kelas: 'Semua',
    file_size: null, original_size: null,
    saved_percent: 0, is_compressed: false
  });
  const [isOptimizingMateri, setIsOptimizingMateri] = useState(false);
  const [materiProgress, setMateriProgress] = useState({ percent: 0, text: '', fileName: '' });
  const [isUploadingMateri, setIsUploadingMateri] = useState(false);
  const [materiError, setMateriError] = useState('');

  // ── Teacher Teaching Loads ──────────────────────────────────
  const userCode = String(teacherCode || user?.username || user?.id || '').trim().toLowerCase();
  const userName = String(teacherName || user?.name || '').trim().toLowerCase();

  const teacherTeachingLoads = useMemo(() => {
    if (!allTeachingLoads || !allTeachingLoads.length) return EMPTY_ARRAY;
    if (isCurriculum) return allTeachingLoads;
    return allTeachingLoads.filter(load => {
      if (!load) return false;
      const codes = String(load.teacherCode || '').split(',').map(c => c.trim().toLowerCase());
      const names = String(load.teacherName || '').split(',').map(n => n.trim().toLowerCase());
      return (userCode && codes.includes(userCode)) || (userName && names.includes(userName));
    });
  }, [allTeachingLoads, userCode, userName, isCurriculum]);

  const availableSubjects = useMemo(() => {
    if (isCurriculum) {
      if (allSubjects && allSubjects.length > 0) {
        return allSubjects.map(s => typeof s === 'object' ? s.name || s.nama || s.label : s).filter(Boolean);
      }
      const loaded = [...new Set((allTeachingLoads || []).map(l => l.subject).filter(Boolean))];
      return loaded.length > 0 ? loaded : ['KODING/AI', 'MATEMATIKA', 'BAHASA INDONESIA', 'BAHASA INGGRIS', 'PKN', 'SEJARAH', 'PRODUKTIF'];
    }
    const loadSubjects = [...new Set(teacherTeachingLoads.map(load => load.subject).filter(Boolean))];
    if (loadSubjects.length > 0) return loadSubjects;
    if (allSubjects && allSubjects.length > 0) {
      return allSubjects.map(s => typeof s === 'object' ? s.name || s.nama || s.label : s).filter(Boolean);
    }
    return ['KODING/AI', 'Umum'];
  }, [teacherTeachingLoads, allSubjects, allTeachingLoads, isCurriculum]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ── Fetching Data ────────────────────────────────────────────
  const fetchModulData = async () => {
    if (!authToken) return;
    setIsLoading(true);
    try {
      const [docRes, matRes, tRes] = await Promise.all([
        fetch('/api/modul-ajar-guru', { headers: { Authorization: `Bearer ${authToken}` } }),
        fetch('/api/materi-ajar', { headers: { Authorization: `Bearer ${authToken}` } }),
        fetch('/api/teachers', { headers: { Authorization: `Bearer ${authToken}` } })
      ]);

      const docData = await docRes.json();
      const matData = await matRes.json();
      const tData = await tRes.json();

      if (docData.ok && Array.isArray(docData.data)) setDocuments(docData.data);
      if (matData.ok && Array.isArray(matData.data)) setMateriList(matData.data);
      if (tData.ok && Array.isArray(tData.data) && tData.data.length > 0) {
        setApiTeachers(tData.data);
      }
    } catch (e) {
      console.error('Failed to fetch modul ajar data', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchModulData();
  }, [authToken]);

  // Set default subject for forms safely
  useEffect(() => {
    if (availableSubjects.length > 0) {
      setModulForm(prev => (prev.mapel ? prev : { ...prev, mapel: availableSubjects[0] }));
      setMateriForm(prev => (prev.mapel ? prev : { ...prev, mapel: availableSubjects[0] }));
    }
  }, [availableSubjects]);

  // ── Filtered Records for User ────────────────────────────────
  const myDocs = useMemo(() => {
    if (isCurriculum) return documents;
    return documents.filter(d => {
      const dCode = String(d.teacher_code || '').trim().toLowerCase();
      const dName = String(d.teacher_name || '').trim().toLowerCase();
      return (userCode && dCode === userCode) || (userName && dName === userName);
    });
  }, [documents, isCurriculum, userCode, userName]);

  const myMateris = useMemo(() => {
    if (isCurriculum) return materiList;
    return materiList.filter(m => {
      const mCode = String(m.teacher_code || '').trim().toLowerCase();
      const mName = String(m.teacher_name || '').trim().toLowerCase();
      return (userCode && mCode === userCode) || (userName && mName === userName);
    });
  }, [materiList, isCurriculum, userCode, userName]);

  // ── Unified 1-Page Combined List ─────────────────────────────
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
          deskripsi: d.deskripsi,
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
    if (!allTeachers.length) return EMPTY_ARRAY;
    return allTeachers.map(t => {
      const tCode = String(t.code || '').trim().toLowerCase();
      const tName = String(t.name || '').trim().toLowerCase();

      const teacherDocs = documents.filter(doc => {
        if (!doc) return false;
        const dCode = String(doc.teacher_code || '').trim().toLowerCase();
        const dName = String(doc.teacher_name || '').trim().toLowerCase();
        return (tCode && dCode === tCode) || (tName && dName === tName);
      });

      const walasClasses = (allClasses || []).filter(c => 
        String(c.teacherCode || '').split(',').map(x => x.trim().toLowerCase()).includes(tCode)
      );
      const walasStr = walasClasses.length > 0 ? `Walas: ${walasClasses.map(c => c.name).join(', ')}` : '';
      const loads = (allTeachingLoads || []).filter(l => 
        String(l.teacherCode || '').split(',').map(x => x.trim().toLowerCase()).includes(tCode)
      );
      const uniqueSubjects = [...new Set(loads.map(l => l.subject).filter(Boolean))];
      const subjectStr = uniqueSubjects.length > 0 ? `Mapel: ${uniqueSubjects.join(', ')}` : '';
      const combinedStr = [walasStr, subjectStr].filter(Boolean).join(' | ');

      return {
        code: t.code,
        name: t.name,
        class_name: combinedStr || '-',
        hasSubmitted: teacherDocs.length > 0,
        documents: teacherDocs
      };
    }).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [allTeachers, documents, allClasses, allTeachingLoads]);

  const stats = useMemo(() => {
    const total = monitoringData.length;
    const submitted = monitoringData.filter(d => d.hasSubmitted).length;
    const pending = total - submitted;
    const percentage = total > 0 ? Math.round((submitted / total) * 100) : 0;
    return { total, submitted, pending, percentage };
  }, [monitoringData]);

  // Filtered monitoring list
  const filteredMonitoringData = useMemo(() => {
    return monitoringData.filter(t => {
      const matchSearch = !monitoringSearch ||
        (t.name || '').toLowerCase().includes(monitoringSearch.toLowerCase()) ||
        (t.code || '').toLowerCase().includes(monitoringSearch.toLowerCase()) ||
        (t.class_name || '').toLowerCase().includes(monitoringSearch.toLowerCase());
      
      const matchStatus = 
        monitoringStatusFilter === 'all' ||
        (monitoringStatusFilter === 'submitted' && t.hasSubmitted) ||
        (monitoringStatusFilter === 'pending' && !t.hasSubmitted);

      return matchSearch && matchStatus;
    });
  }, [monitoringData, monitoringSearch, monitoringStatusFilter]);

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

  // ── Smart File Processors with Automatic PDF Compression ────
  const handleModulFile = async (file) => {
    if (!file) return;
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (ext !== '.pdf') {
      setModulError(`Ekstensi berkas "${ext}" tidak diizinkan. Harap pilih berkas dengan format .pdf`);
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setModulError('Ukuran file terlalu besar! Maksimal ukuran berkas yang diperbolehkan adalah 5 MB.');
      return;
    }
    setModulError('');
    setIsOptimizingModul(true);
    setModulProgress({ percent: 10, text: 'Membaca berkas PDF...', fileName: file.name });
    
    await new Promise(resolve => {
      requestAnimationFrame(() => setTimeout(resolve, 50));
    });

    try {
      const optResult = await optimizePdfFile(file, (percent, text) => {
        setModulProgress({ percent, text, fileName: file.name });
      });

      setModulForm(prev => ({
        ...prev,
        file_url: optResult.dataUrl,
        nama_dokumen: file.name,
        file_size: optResult.compressedSizeStr,
        original_size: optResult.originalSizeStr,
        saved_percent: optResult.savedPercent,
        is_compressed: optResult.isCompressed
      }));
      await new Promise(r => setTimeout(r, 200));
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
    if (file.size > 5 * 1024 * 1024) {
      setMateriError('Ukuran file terlalu besar! Maksimal ukuran berkas yang diperbolehkan adalah 5 MB.');
      return;
    }
    setMateriError('');
    setIsOptimizingMateri(true);
    setMateriProgress({ percent: 10, text: 'Membaca berkas PDF materi...', fileName: file.name });

    await new Promise(resolve => {
      requestAnimationFrame(() => setTimeout(resolve, 50));
    });

    try {
      const optResult = await optimizePdfFile(file, (percent, text) => {
        setMateriProgress({ percent, text, fileName: file.name });
      });

      setMateriForm(prev => ({
        ...prev,
        file_url: optResult.dataUrl,
        nama_dokumen: file.name,
        file_size: optResult.compressedSizeStr,
        original_size: optResult.originalSizeStr,
        saved_percent: optResult.savedPercent,
        is_compressed: optResult.isCompressed
      }));
      await new Promise(r => setTimeout(r, 200));
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
          mapel: modulForm.mapel, kelas: modulForm.kelas || '-', semester: modulForm.semester,
          deskripsi: modulForm.deskripsi
        })
      });
      const data = await res.json();
      if (data.ok) {
        showToast('Modul Ajar (RPP) berhasil diunggah!');
        setIsModulModalOpen(false);
        setModulForm({
          nama_dokumen: '', file_url: '',
          tahun_ajaran: activeYear, kelas: '-',
          mapel: availableSubjects[0] || '',
          semester: 'Ganjil', deskripsi: '',
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
          mapel: materiForm.mapel, kelas_target: materiForm.kelas || 'Semua',
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
          semester: 'Ganjil', tahun_ajaran: activeYear, kelas: 'Semua',
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
    if (typeof window !== 'undefined' && window.confirm) {
      if (!window.confirm('Hapus berkas Modul Ajar (RPP) ini?')) return;
    }
    try {
      const res = await fetch('/api/modul-ajar-guru', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ action: 'delete', id, teacher_code: code })
      });
      const data = await res.json();
      if (data.ok) {
        showToast('Modul Ajar berhasil dihapus.');
        fetchModulData();
      } else {
        showToast(data.error || 'Gagal menghapus modul.', 'error');
      }
    } catch (e) {
      showToast('Gagal menghapus modul.', 'error');
    }
  };

  const handleDeleteMateri = async (id, code) => {
    if (typeof window !== 'undefined' && window.confirm) {
      if (!window.confirm('Hapus Materi Pembelajaran ini?')) return;
    }
    try {
      const res = await fetch('/api/materi-ajar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ action: 'delete', id, teacher_code: code })
      });
      const data = await res.json();
      if (data.ok) {
        showToast('Materi Pembelajaran berhasil dihapus.');
        fetchModulData();
      } else {
        showToast(data.error || 'Gagal menghapus materi.', 'error');
      }
    } catch (e) {
      showToast('Gagal menghapus materi.', 'error');
    }
  };

  const handleRenameModul = (id, currentName) => {
    setRenameError('');
    setRenameData({ id, type: 'modul', currentName: currentName || '', newName: currentName || '' });
    setRenameModalOpen(true);
  };

  const handleRenameMateri = (id, currentTitle) => {
    setRenameError('');
    setRenameData({ id, type: 'materi', currentName: currentTitle || '', newName: currentTitle || '' });
    setRenameModalOpen(true);
  };

  const submitRename = async (e) => {
    e.preventDefault();
    setRenameError('');
    const { id, type, currentName, newName } = renameData;
    if (!newName || newName.trim() === '' || newName === currentName) {
      setRenameModalOpen(false);
      return;
    }

    setIsRenaming(true);
    try {
      const endpoint = type === 'modul' ? '/api/modul-ajar-guru' : '/api/materi-ajar';
      const payload = type === 'modul' ? { action: 'rename', id, nama_dokumen: newName } : { action: 'rename', id, judul: newName };
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.ok) {
        showToast(type === 'modul' ? 'Nama Modul Ajar berhasil diubah.' : 'Judul Materi Pembelajaran berhasil diubah.');
        setRenameModalOpen(false);
        fetchModulData();
      } else {
        setRenameError(data.error || 'Gagal mengubah nama.');
      }
    } catch (e) {
      setRenameError('Terjadi kesalahan saat mengubah nama.');
    } finally {
      setIsRenaming(false);
    }
  };

  const handlePreviewPdf = (item) => {
    if (item.file_url) {
      const blobUrl = base64ToBlobUrl(item.file_url, 'application/pdf');
      setPreviewDoc({
        title: item.title || item.nama_dokumen || 'Dokumen PDF',
        url: blobUrl
      });
    }
  };

  return (
    <div className="space-y-4 sm:space-y-5 relative animate-in fade-in duration-300 z-10 pb-20">
      {/* Top Header */}
      <PageHeader
        title="Modul & Materi Ajar"
        description="Kelola Modul Ajar (RPP Guru) dan Materi Pembelajaran Siswa dalam satu halaman praktis."
        icon={BookOpen}
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* ── TAB 1: Monitoring Pengumpulan RPP (Kurikulum View) ── */}
      {activeTab === 'rekap' && isCurriculum && (
        <div className="space-y-4 animate-in fade-in duration-200">
          
          {/* Quick Stat Strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-4 rounded-[var(--ui-radius-card)] bg-white border border-slate-200/80 shadow-[var(--ui-shadow-card)] flex items-center gap-3">
              <div className="w-11 h-11 rounded-[var(--ui-radius-control)] bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                <Users size={20} strokeWidth={2.5} />
              </div>
              <div className="min-w-0">
                <p className="text-xl sm:text-2xl font-black text-slate-800 leading-tight">{stats.total} Guru</p>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mt-0.5">Total Guru Aktif</p>
              </div>
            </div>

            <div className="p-4 rounded-[var(--ui-radius-card)] bg-white border border-slate-200/80 shadow-[var(--ui-shadow-card)] flex items-center gap-3">
              <div className="w-11 h-11 rounded-[var(--ui-radius-control)] bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <UserCheck size={20} strokeWidth={2.5} />
              </div>
              <div className="min-w-0">
                <p className="text-xl sm:text-2xl font-black text-emerald-700 leading-tight">{stats.submitted} Guru</p>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mt-0.5">Sudah Kumpul</p>
              </div>
            </div>

            <div className="p-4 rounded-[var(--ui-radius-card)] bg-white border border-slate-200/80 shadow-[var(--ui-shadow-card)] flex items-center gap-3">
              <div className="w-11 h-11 rounded-[var(--ui-radius-control)] bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <UserX size={20} strokeWidth={2.5} />
              </div>
              <div className="min-w-0">
                <p className="text-xl sm:text-2xl font-black text-rose-700 leading-tight">{stats.pending} Guru</p>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mt-0.5">Belum Kumpul</p>
              </div>
            </div>

            <div className="p-4 rounded-[var(--ui-radius-card)] bg-white border border-slate-200/80 shadow-[var(--ui-shadow-card)] flex items-center gap-3">
              <div className="w-11 h-11 rounded-[var(--ui-radius-control)] bg-[var(--ui-primary)]/10 text-[var(--ui-primary)] flex items-center justify-center shrink-0">
                <Sparkles size={20} strokeWidth={2.5} />
              </div>
              <div className="min-w-0">
                <p className="text-xl sm:text-2xl font-black text-[var(--ui-primary)] leading-tight">{stats.percentage}%</p>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mt-0.5">Tingkat Kepatuhan</p>
              </div>
            </div>
          </div>

          {/* Monitoring Table Card */}
          <div className="p-4 sm:p-5 rounded-[var(--ui-radius-card)] bg-white border border-slate-200/80 shadow-[var(--ui-shadow-card)] space-y-4">
            
            {/* Header & Controls */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-black text-slate-800 text-sm">Status Pengumpulan Modul Ajar (RPP)</h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Tahun Ajaran: <strong className="text-[var(--ui-primary)] font-black">{activeYear || 'Semua TA Aktif'}</strong>
                </p>
              </div>

              {/* Status Filter Pills & Search */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full lg:w-auto">
                
                {/* Status Filter Pills */}
                <div className="flex items-center gap-1 p-1 bg-[var(--ui-surface-muted)] rounded-[var(--ui-radius-control)] border border-[var(--ui-border-muted)] overflow-x-auto no-scrollbar">
                  <button
                    type="button"
                    onClick={() => setMonitoringStatusFilter('all')}
                    className={`px-3 py-1 rounded-[var(--ui-radius-small)] text-xs font-black transition-all cursor-pointer whitespace-nowrap border-none ${
                      monitoringStatusFilter === 'all' 
                        ? 'bg-white text-slate-800 shadow-2xs' 
                        : 'bg-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Semua ({stats.total})
                  </button>

                  <button
                    type="button"
                    onClick={() => setMonitoringStatusFilter('submitted')}
                    className={`flex items-center gap-1 px-3 py-1 rounded-[var(--ui-radius-small)] text-xs font-black transition-all cursor-pointer whitespace-nowrap border-none ${
                      monitoringStatusFilter === 'submitted' 
                        ? 'bg-white text-emerald-700 shadow-2xs' 
                        : 'bg-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <CheckCircle2 size={12} className="text-emerald-600" />
                    <span>Sudah ({stats.submitted})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMonitoringStatusFilter('pending')}
                    className={`flex items-center gap-1 px-3 py-1 rounded-[var(--ui-radius-small)] text-xs font-black transition-all cursor-pointer whitespace-nowrap border-none ${
                      monitoringStatusFilter === 'pending' 
                        ? 'bg-white text-rose-700 shadow-2xs' 
                        : 'bg-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <AlertCircle size={12} className="text-rose-600" />
                    <span>Belum ({stats.pending})</span>
                  </button>
                </div>

                {/* Search */}
                <div className="relative flex-1 sm:w-60">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                  <input 
                    value={monitoringSearch} 
                    onChange={e => setMonitoringSearch(e.target.value)} 
                    placeholder="Cari guru / kode / mapel..."
                    className="w-full pl-8 pr-7 py-1.5 bg-[var(--ui-surface-muted)] hover:bg-white border border-[var(--ui-border-soft)] rounded-[var(--ui-radius-control)] text-xs font-bold focus:bg-white focus:outline-none focus:border-[var(--ui-primary)]" 
                  />
                  {monitoringSearch && (
                    <button 
                      type="button" 
                      onClick={() => setMonitoringSearch('')} 
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>

              </div>
            </div>

            {/* Empty State */}
            {filteredMonitoringData.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-[var(--ui-radius-control)] border border-dashed border-slate-200">
                <Users size={32} className="mx-auto text-slate-300 mb-2" />
                <p className="text-xs font-bold text-slate-600">Tidak ada data guru yang cocok dengan pencarian.</p>
              </div>
            ) : (
              <>
                {/* Desktop View Table */}
                <div className="hidden md:block overflow-x-auto border border-slate-200 rounded-[var(--ui-radius-control)]">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-[10px] text-slate-500 uppercase border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3 font-black">Nama Guru</th>
                        <th className="px-4 py-3 font-black">Kode</th>
                        <th className="px-4 py-3 font-black">Tugas Mengajar / Walas</th>
                        <th className="px-4 py-3 text-center font-black">Status</th>
                        <th className="px-4 py-3 font-black">Berkas RPP Terunggah</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-bold text-slate-700">
                      {filteredMonitoringData.map(teacher => (
                        <tr key={teacher.code} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-full bg-[var(--ui-primary)]/10 text-[var(--ui-primary)] font-black text-xs flex items-center justify-center shrink-0">
                                {(teacher.name || 'G')[0]}
                              </div>
                              <span className="font-extrabold text-slate-900">{teacher.name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3.5 font-mono text-slate-500">{teacher.code}</td>
                          <td className="px-4 py-3.5 text-slate-600 max-w-[220px] truncate" title={teacher.class_name}>
                            {teacher.class_name}
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-[var(--ui-radius-pill)] text-[10px] font-black uppercase tracking-wider ${
                              teacher.hasSubmitted 
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                                : 'bg-rose-50 text-rose-800 border border-rose-200'
                            }`}>
                              {teacher.hasSubmitted ? <CheckCircle2 size={11} className="text-emerald-600" /> : <AlertCircle size={11} className="text-rose-600" />}
                              <span>{teacher.hasSubmitted ? 'Sudah Kumpul' : 'Belum Kumpul'}</span>
                            </span>
                          </td>
                          <td className="px-4 py-3.5">
                            {teacher.hasSubmitted ? (
                              <div className="space-y-1.5 max-w-xs">
                                {teacher.documents.map(d => (
                                  <div key={d.id} className="flex items-center justify-between gap-2 p-1.5 rounded-[var(--ui-radius-small)] bg-slate-50 border border-slate-200">
                                    <span className="font-bold text-slate-700 truncate text-[11px]" title={d.nama_dokumen}>{d.nama_dokumen}</span>
                                    <div className="flex items-center gap-1 shrink-0">
                                      <button 
                                        type="button" 
                                        onClick={() => handlePreviewPdf(d)} 
                                        className="p-1 rounded bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 cursor-pointer" 
                                        title="Pratinjau"
                                      >
                                        <Eye size={12} />
                                      </button>
                                      <button 
                                        type="button" 
                                        onClick={() => downloadFile(d.file_url, d.nama_dokumen)} 
                                        className="p-1 bg-[var(--ui-primary)] text-white rounded cursor-pointer hover:opacity-90" 
                                        title="Unduh"
                                      >
                                        <Download size={12} />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-slate-400 italic text-xs">Belum ada berkas</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile View Cards */}
                <div className="md:hidden space-y-3">
                  {filteredMonitoringData.map(teacher => (
                    <div 
                      key={teacher.code} 
                      className="p-3.5 rounded-[var(--ui-radius-card)] bg-white border border-slate-200 shadow-2xs space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-[var(--ui-primary)]/10 text-[var(--ui-primary)] font-black text-xs flex items-center justify-center shrink-0">
                            {(teacher.name || 'G')[0]}
                          </div>
                          <div>
                            <p className="text-xs font-black text-slate-800">{teacher.name}</p>
                            <p className="text-[10px] font-mono text-slate-400">Kode: {teacher.code}</p>
                          </div>
                        </div>

                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-[var(--ui-radius-pill)] text-[9.5px] font-black uppercase ${
                          teacher.hasSubmitted 
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                            : 'bg-rose-50 text-rose-800 border border-rose-200'
                        }`}>
                          {teacher.hasSubmitted ? <CheckCircle2 size={10} className="text-emerald-600" /> : <AlertCircle size={10} className="text-rose-600" />}
                          <span>{teacher.hasSubmitted ? 'Sudah' : 'Belum'}</span>
                        </span>
                      </div>

                      {teacher.class_name && teacher.class_name !== '-' && (
                        <p className="text-[11px] text-slate-500 font-medium bg-slate-50 p-2 rounded-[var(--ui-radius-small)]">
                          {teacher.class_name}
                        </p>
                      )}

                      {teacher.hasSubmitted && teacher.documents.length > 0 && (
                        <div className="pt-2 border-t border-slate-100 space-y-1.5">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Berkas Terunggah ({teacher.documents.length}):</p>
                          {teacher.documents.map(d => (
                            <div key={d.id} className="flex items-center justify-between gap-2 p-1.5 rounded-[var(--ui-radius-small)] bg-slate-50 border border-slate-200">
                              <span className="font-bold text-slate-700 truncate text-[11px]" title={d.nama_dokumen}>{d.nama_dokumen}</span>
                              <div className="flex items-center gap-1 shrink-0">
                                <button 
                                  type="button" 
                                  onClick={() => handlePreviewPdf(d)} 
                                  className="p-1.5 rounded bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 cursor-pointer" 
                                  title="Pratinjau"
                                >
                                  <Eye size={12} />
                                </button>
                                <button 
                                  type="button" 
                                  onClick={() => downloadFile(d.file_url, d.nama_dokumen)} 
                                  className="p-1.5 bg-[var(--ui-primary)] text-white rounded cursor-pointer hover:opacity-90" 
                                  title="Unduh"
                                >
                                  <Download size={12} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}

          </div>
        </div>
      )}

      {/* ── TAB 2: UNIFIED 1-PAGE: DAFTAR MODUL AJAR & MATERI ── */}
      {activeTab === 'modul-materi' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          
          {/* Summary KPI Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3.5">
            <div className="p-3.5 rounded-[var(--ui-radius-card)] bg-white border border-slate-200/80 shadow-[var(--ui-shadow-card)] flex items-center gap-3">
              <div className="w-10 h-10 rounded-[var(--ui-radius-control)] bg-[var(--ui-primary)]/10 text-[var(--ui-primary)] flex items-center justify-center shrink-0">
                <FolderOpen size={18} strokeWidth={2.5} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-base font-black text-slate-800 leading-tight">{myDocs.length + myMateris.length}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Total Berkas</p>
              </div>
            </div>

            <div className="p-3.5 rounded-[var(--ui-radius-card)] bg-white border border-slate-200/80 shadow-[var(--ui-shadow-card)] flex items-center gap-3">
              <div className="w-10 h-10 rounded-[var(--ui-radius-control)] bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <FileText size={18} strokeWidth={2.5} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-base font-black text-slate-800 leading-tight">{myDocs.length}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Modul Ajar (RPP)</p>
              </div>
            </div>

            <div className="p-3.5 rounded-[var(--ui-radius-card)] bg-white border border-slate-200/80 shadow-[var(--ui-shadow-card)] flex items-center gap-3">
              <div className="w-10 h-10 rounded-[var(--ui-radius-control)] bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
                <BookOpenText size={18} strokeWidth={2.5} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-base font-black text-slate-800 leading-tight">{myMateris.length}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Materi Siswa</p>
              </div>
            </div>

            <div className="p-3.5 rounded-[var(--ui-radius-card)] bg-white border border-slate-200/80 shadow-[var(--ui-shadow-card)] flex items-center gap-3">
              <div className="w-10 h-10 rounded-[var(--ui-radius-control)] bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <GraduationCap size={18} strokeWidth={2.5} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-base font-black text-slate-800 leading-tight">{availableSubjects.length} Mapel</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5 truncate">Mapel Aktif</p>
              </div>
            </div>
          </div>

          {/* Main Controls Card */}
          <div className="p-4 sm:p-5 rounded-[var(--ui-radius-card)] bg-white border border-slate-200/80 shadow-[var(--ui-shadow-card)] space-y-4">
            
            {/* Header Title & 2 Direct Action Buttons */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3">
              <div>
                <h3 className="text-base font-black text-slate-800">
                  {isCurriculum ? 'Daftar Semua Modul & Materi Ajar' : 'Modul & Materi Pembelajaran Saya'}
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Kelola dokumen RPP guru dan publikasikan materi siswa langsung dalam satu tampilan.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 w-full lg:w-auto flex-wrap sm:flex-nowrap">
                <Button
                  variant="primary"
                  size="sm"
                  type="button"
                  onClick={() => setIsModulModalOpen(true)}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 font-bold shadow-[var(--ui-shadow-control)] text-xs"
                >
                  <UploadCloud size={14} />
                  <span>+ Unggah Modul (RPP)</span>
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={() => setIsMateriModalOpen(true)}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 font-bold border-slate-200 hover:bg-slate-50 text-xs"
                >
                  <BookOpenText size={14} />
                  <span>+ Tambah Materi Siswa</span>
                </Button>
              </div>
            </div>

            {/* Filter Pills, Search, Mapel Dropdown & View Mode Switcher */}
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 pt-3 border-t border-slate-100">
              
              {/* Type Filter Pills (Semua / Modul / Materi) */}
              <div className="flex items-center gap-1.5 p-1 bg-[var(--ui-surface-muted)] rounded-[var(--ui-radius-control)] border border-[var(--ui-border-muted)] overflow-x-auto no-scrollbar">
                <button
                  type="button"
                  onClick={() => setFilterType('all')}
                  className={`px-3 py-1.5 rounded-[var(--ui-radius-small)] text-xs font-black transition-all cursor-pointer whitespace-nowrap border-none ${
                    filterType === 'all' 
                      ? 'bg-white text-slate-800 shadow-2xs' 
                      : 'bg-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Semua ({myDocs.length + myMateris.length})
                </button>

                <button
                  type="button"
                  onClick={() => setFilterType('modul')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--ui-radius-small)] text-xs font-black transition-all cursor-pointer whitespace-nowrap border-none ${
                    filterType === 'modul' 
                      ? 'bg-white text-emerald-700 shadow-2xs' 
                      : 'bg-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <FileText size={13} className="text-emerald-600 shrink-0" />
                  <span>Modul Ajar ({myDocs.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFilterType('materi')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--ui-radius-small)] text-xs font-black transition-all cursor-pointer whitespace-nowrap border-none ${
                    filterType === 'materi' 
                      ? 'bg-white text-sky-700 shadow-2xs' 
                      : 'bg-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <BookOpenText size={13} className="text-sky-600 shrink-0" />
                  <span>Materi Siswa ({myMateris.length})</span>
                </button>
              </div>

              {/* Search, Mapel & View Mode */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                
                {/* Search */}
                <div className="relative flex-1 sm:w-52">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                  <input 
                    value={searchTerm} 
                    onChange={e => setSearchTerm(e.target.value)} 
                    placeholder="Cari judul / mapel / guru..."
                    className="w-full pl-8 pr-7 py-1.5 bg-[var(--ui-surface-muted)] hover:bg-white border border-[var(--ui-border-soft)] rounded-[var(--ui-radius-control)] text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:border-[var(--ui-primary)] transition-all" 
                  />
                  {searchTerm && (
                    <button 
                      type="button" 
                      onClick={() => setSearchTerm('')} 
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>

                {/* Mapel Filter with CustomSelect */}
                {availableSubjects.length > 0 && (
                  <div className="w-full sm:w-52 shrink-0">
                    <CustomSelect
                      value={filterMapel}
                      onChange={val => setFilterMapel(val)}
                      options={[
                        { value: 'all', label: 'Semua Mata Pelajaran' },
                        ...availableSubjects.map(s => ({ value: s, label: s }))
                      ]}
                      searchable={true}
                      placeholder="Pilih Mapel"
                    />
                  </div>
                )}

                {/* View Mode Toggle */}
                <div className="hidden sm:flex items-center p-0.5 bg-[var(--ui-surface-muted)] rounded-[var(--ui-radius-control)] border border-[var(--ui-border-muted)] shrink-0">
                  <button
                    type="button"
                    onClick={() => setViewMode('grid')}
                    className={`p-1.5 rounded-[var(--ui-radius-small)] transition-all cursor-pointer border-none ${
                      viewMode === 'grid' ? 'bg-white text-slate-800 shadow-2xs' : 'text-slate-400 hover:text-slate-700 bg-transparent'
                    }`}
                    title="Tampilan Grid Kartu"
                  >
                    <LayoutGrid size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('table')}
                    className={`p-1.5 rounded-[var(--ui-radius-small)] transition-all cursor-pointer border-none ${
                      viewMode === 'table' ? 'bg-white text-slate-800 shadow-2xs' : 'text-slate-400 hover:text-slate-700 bg-transparent'
                    }`}
                    title="Tampilan Tabel Kompak"
                  >
                    <List size={14} />
                  </button>
                </div>

              </div>

            </div>
          </div>

          {/* Unified Document Items List */}
          {unifiedList.length === 0 ? (
            <div className="p-8 sm:p-12 rounded-[var(--ui-radius-card)] bg-white border border-slate-200/80 shadow-[var(--ui-shadow-card)] text-center flex flex-col items-center justify-center gap-3 animate-in fade-in">
              <div 
                className="w-16 h-16 rounded-[var(--ui-radius-card)] flex items-center justify-center shadow-inner"
                style={{ background: "color-mix(in srgb, var(--ui-primary) 12%, transparent)", color: "var(--ui-primary)" }}
              >
                <BookOpen size={30} className="stroke-[2.2]" />
              </div>
              <h4 className="text-base font-black text-slate-800">Belum Ada Dokumen / Materi</h4>
              <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
                Tidak ada dokumen yang cocok dengan filter. Klik salah satu tombol di bawah untuk mulai mengunggah dengan mudah.
              </p>
              <div className="flex items-center gap-2 mt-2 flex-wrap justify-center">
                <Button
                  variant="primary"
                  size="sm"
                  type="button"
                  onClick={() => setIsModulModalOpen(true)}
                  className="flex items-center gap-1.5 font-bold"
                >
                  <UploadCloud size={14} />
                  <span>Unggah Modul (RPP)</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={() => setIsMateriModalOpen(true)}
                  className="flex items-center gap-1.5 font-bold"
                >
                  <BookOpenText size={14} />
                  <span>Tambah Materi Siswa</span>
                </Button>
              </div>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {unifiedList.map(item => {
                const isModul = item.itemType === 'modul';
                const isLink = item.tipe === 'link';
                const canDelete = isCurriculum || item.teacher_code === teacherCode;

                return (
                  <div 
                    key={item.id} 
                    className="p-4 sm:p-5 rounded-[var(--ui-radius-card)] bg-white border border-slate-200/80 hover:border-[var(--ui-primary)]/40 hover:shadow-sm transition-all flex flex-col justify-between group"
                  >
                    <div>
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[var(--ui-radius-pill)] text-[10px] font-black uppercase tracking-wider ${
                          isModul 
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                            : isLink 
                              ? 'bg-purple-50 text-purple-800 border border-purple-200' 
                              : 'bg-sky-50 text-sky-800 border border-sky-200'
                        }`}>
                          {isModul ? <FileText size={11} className="text-emerald-600 shrink-0" /> : isLink ? getLinkIcon(item.link_url) : <BookOpenText size={11} className="text-sky-600 shrink-0" />}
                          <span>{isModul ? 'Modul Ajar (RPP)' : isLink ? 'Materi (Tautan)' : 'Materi (PDF Siswa)'}</span>
                        </span>

                        <span className="text-[10px] font-extrabold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-[var(--ui-radius-small)]">
                          {item.kelas ? `Kelas ${item.kelas} • ` : ''}Sem. {item.semester}
                        </span>
                      </div>

                      {/* Title & Subject */}
                      <div className="flex items-start gap-3 mt-1">
                        <div className={`w-10 h-10 rounded-[var(--ui-radius-control)] flex items-center justify-center shrink-0 mt-0.5 shadow-2xs ${
                          isModul ? 'bg-emerald-50 text-emerald-700' : isLink ? 'bg-purple-50 text-purple-700' : 'bg-sky-50 text-sky-700'
                        }`}>
                          {isModul ? <FileText size={18} strokeWidth={2.2} /> : isLink ? getLinkIcon(item.link_url) : <BookOpenText size={18} strokeWidth={2.2} />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="text-[9.5px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-[var(--ui-primary)]/10 text-[var(--ui-primary)] inline-block">
                            {item.mapel}
                          </span>
                          <h4 className="text-xs sm:text-sm font-black text-slate-800 leading-snug line-clamp-2 mt-1" title={item.title}>
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
                      <div className="flex items-center justify-between text-[10.5px] text-slate-400 font-bold mt-3.5 pt-2.5 border-t border-slate-100">
                        <span className="truncate mr-2">Guru: <strong className="text-slate-700">{item.teacher_name}</strong></span>
                        <span className="shrink-0 text-slate-500 font-mono text-[10px]">TA: {item.tahun_ajaran}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 mt-3 pt-2.5 border-t border-slate-100">
                      {isLink ? (
                        <a 
                          href={item.link_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-[var(--ui-radius-control)] text-xs font-bold text-white bg-[var(--ui-primary)] hover:opacity-90 no-underline shadow-xs cursor-pointer"
                        >
                          {getLinkIcon(item.link_url)}
                          <span>{getLinkLabel(item.link_url)}</span>
                        </a>
                      ) : (
                        <>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handlePreviewPdf(item)} 
                            className="flex-1 py-1.5 text-xs font-bold flex items-center justify-center gap-1.5 border-slate-200 hover:bg-slate-50"
                            title="Pratinjau Berkas"
                          >
                            <Eye size={13} className="text-slate-600" />
                            <span>Pratinjau</span>
                          </Button>
                          <Button 
                            variant="primary" 
                            size="sm"
                            onClick={() => downloadFile(item.file_url, item.nama_dokumen || item.title)}
                            className="flex-1 py-1.5 text-xs font-bold flex items-center justify-center gap-1.5 shadow-[var(--ui-shadow-control)]"
                            title="Unduh Berkas"
                          >
                            <Download size={13} />
                            <span>Unduh</span>
                          </Button>
                        </>
                      )}

                      {canDelete && (
                        <>
                          <button 
                            type="button"
                            onClick={() => isModul ? handleRenameModul(item.originalId, item.title) : handleRenameMateri(item.originalId, item.title)} 
                            className="p-2 text-sky-500 hover:text-sky-700 hover:bg-sky-50 border border-slate-200 hover:border-sky-200 rounded-[var(--ui-radius-control)] transition-all cursor-pointer" 
                            title="Ubah Nama"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button 
                            type="button"
                            onClick={() => isModul ? handleDeleteModul(item.originalId, item.teacher_code) : handleDeleteMateri(item.originalId, item.teacher_code)} 
                            className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 rounded-[var(--ui-radius-control)] transition-all cursor-pointer" 
                            title="Hapus"
                          >
                            <Trash2 size={13} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Table View */
            <div className="bg-white rounded-[var(--ui-radius-card)] border border-slate-200/80 shadow-[var(--ui-shadow-card)] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-[10px] text-slate-500 uppercase border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 font-black">Tipe</th>
                      <th className="px-4 py-3 font-black">Mata Pelajaran</th>
                      <th className="px-4 py-3 font-black">Judul Dokumen</th>
                      <th className="px-4 py-3 font-black">Tingkat & Sem.</th>
                      <th className="px-4 py-3 font-black">Guru Pengunggah</th>
                      <th className="px-4 py-3 text-right font-black">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-bold text-slate-700">
                    {unifiedList.map(item => {
                      const isModul = item.itemType === 'modul';
                      const isLink = item.tipe === 'link';
                      const canDelete = isCurriculum || item.teacher_code === teacherCode;

                      return (
                        <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9.5px] font-black uppercase ${
                              isModul ? 'bg-emerald-50 text-emerald-800' : isLink ? 'bg-purple-50 text-purple-800' : 'bg-sky-50 text-sky-800'
                            }`}>
                              {isModul ? 'RPP' : isLink ? 'Link' : 'Materi'}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-extrabold text-slate-900">{item.mapel}</td>
                          <td className="px-4 py-3 max-w-[240px]">
                            <p className="truncate font-extrabold text-slate-800" title={item.title}>{item.title}</p>
                            {item.deskripsi && <p className="text-[10px] text-slate-400 truncate">{item.deskripsi}</p>}
                          </td>
                          <td className="px-4 py-3 text-slate-500">
                            {item.kelas ? `Kelas ${item.kelas}` : 'Semua'} • Sem. {item.semester}
                          </td>
                          <td className="px-4 py-3 text-slate-600">{item.teacher_name}</td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {isLink ? (
                                <a 
                                  href={item.link_url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="p-1.5 rounded bg-[var(--ui-primary)] text-white hover:opacity-90 cursor-pointer no-underline"
                                  title="Buka Link"
                                >
                                  <ExternalLink size={12} />
                                </a>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handlePreviewPdf(item)}
                                    className="p-1.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer border border-slate-200"
                                    title="Pratinjau"
                                  >
                                    <Eye size={12} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => downloadFile(item.file_url, item.nama_dokumen || item.title)}
                                    className="p-1.5 rounded bg-[var(--ui-primary)] text-white hover:opacity-90 cursor-pointer"
                                    title="Unduh"
                                  >
                                    <Download size={12} />
                                  </button>
                                </>
                              )}

                              {canDelete && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => isModul ? handleRenameModul(item.originalId, item.title) : handleRenameMateri(item.originalId, item.title)}
                                    className="p-1.5 rounded bg-sky-50 text-sky-600 hover:bg-sky-100 cursor-pointer border border-sky-200"
                                    title="Ubah Nama"
                                  >
                                    <Edit2 size={12} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => isModul ? handleDeleteModul(item.originalId, item.teacher_code) : handleDeleteMateri(item.originalId, item.teacher_code)}
                                    className="p-1.5 rounded bg-rose-50 text-rose-600 hover:bg-rose-100 cursor-pointer border border-rose-200"
                                    title="Hapus"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </>
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
          )}

        </div>
      )}

      {/* ── TAB 3: Penyusunan RPP (Silabus) ── */}
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

      {/* ── MODAL 1: UNGGAH MODUL AJAR (RPP GURU) ── */}
      {isModulModalOpen && (
        <Modal 
          isOpen={true} 
          onClose={() => !isUploadingModul && setIsModulModalOpen(false)} 
          title="Unggah Modul Ajar (RPP)"
          maxWidth="max-w-lg"
        >
          <form onSubmit={handleModulSubmit} className="space-y-4 relative text-xs">
            {/* Top Loading Progress Bar */}
            {(isUploadingModul || isOptimizingModul) && (
              <div className="w-full bg-slate-100 h-1.5 overflow-hidden rounded-full relative -mt-2 mb-2">
                <div className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600 w-full animate-pulse" />
              </div>
            )}

            {/* Error Message */}
            {modulError && (
              <div className="p-3 rounded-[var(--ui-radius-control)] bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-2 font-bold text-xs">
                <AlertCircle size={15} className="shrink-0 text-rose-600" />
                <span>{modulError}</span>
              </div>
            )}

            {/* Format & Specification Info Alert */}
            <div className="p-3 rounded-[var(--ui-radius-control)] bg-slate-50 border border-slate-200 flex items-start gap-2.5">
              <ShieldCheck size={16} className="text-emerald-600 shrink-0 mt-0.5" />
              <div className="text-[11px] text-slate-600 font-medium leading-relaxed">
                Format yang diizinkan: <strong className="text-slate-800 font-black">PDF (.pdf)</strong> &bull; Ukuran Maks: <strong className="text-slate-800 font-black">5 MB</strong>
                <p className="text-[10px] text-emerald-700 font-bold mt-0.5 flex items-center gap-1">
                  <Zap size={11} className="fill-emerald-600 text-emerald-600" />
                  <span>Kompresi cerdas otomatis aktif &bull; Kualitas dokumen tetap 100% tajam.</span>
                </p>
              </div>
            </div>

            {/* Mata Pelajaran */}
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">
                Mata Pelajaran <span className="text-rose-500">*</span>
              </label>
              <CustomSelect
                value={modulForm.mapel}
                onChange={val => setModulForm(f => ({ ...f, mapel: val }))}
                options={availableSubjects.map(s => ({ value: s, label: s }))}
                searchable={true}
                placeholder="-- Pilih Mata Pelajaran --"
                disabled={isUploadingModul}
              />
            </div>

            {/* Semester, TA & Kelas */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">
                  Tingkat / Kelas
                </label>
                <CustomSelect
                  value={modulForm.kelas}
                  onChange={val => setModulForm(f => ({ ...f, kelas: val }))}
                  options={[
                    { value: '-', label: 'Umum / Semua Tingkat' },
                    { value: 'X', label: 'Tingkat X' },
                    { value: 'XI', label: 'Tingkat XI' },
                    { value: 'XII', label: 'Tingkat XII' }
                  ]}
                  searchable={false}
                  placeholder="Tingkat"
                  disabled={isUploadingModul}
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">
                  Semester <span className="text-rose-500">*</span>
                </label>
                <CustomSelect
                  value={modulForm.semester}
                  onChange={val => setModulForm(f => ({ ...f, semester: val }))}
                  options={[
                    { value: 'Ganjil', label: 'Semester Ganjil' },
                    { value: 'Genap', label: 'Semester Genap' }
                  ]}
                  searchable={false}
                  placeholder="Semester"
                  disabled={isUploadingModul}
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">
                  Tahun Ajaran
                </label>
                <input
                  type="text"
                  readOnly
                  value={modulForm.tahun_ajaran || activeYear || '2026/2027'}
                  className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-[var(--ui-radius-control)] text-xs font-bold text-slate-600 cursor-not-allowed"
                />
              </div>
            </div>

            {/* Deskripsi */}
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">
                Deskripsi Singkat <span className="text-slate-400 font-medium normal-case">(Opsional)</span>
              </label>
              <textarea
                value={modulForm.deskripsi || ''}
                onChange={e => setModulForm(f => ({ ...f, deskripsi: e.target.value }))}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-[var(--ui-radius-control)] text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[var(--ui-primary)] focus:ring-1 focus:ring-[var(--ui-primary)]/20 transition-all resize-none shadow-xs"
                placeholder="Tuliskan catatan atau deskripsi singkat untuk Modul Ajar ini..."
                rows={2}
                disabled={isUploadingModul}
              />
            </div>

            {/* File PDF Picker & Showcase */}
            <div>
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                  Pilih Berkas PDF Modul Ajar <span className="text-rose-500">*</span>
                </label>
                <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-[var(--ui-radius-small)] border border-emerald-200">
                  Hanya .pdf (Maks. 5MB)
                </span>
              </div>

              <input 
                type="file" 
                ref={modulFileInputRef}
                accept=".pdf"
                className="hidden"
                disabled={isUploadingModul || isOptimizingModul}
                onChange={e => handleModulFile(e.target.files?.[0])}
              />

              {!modulForm.file_url ? (
                <div 
                  onClick={() => modulFileInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setIsDraggingModul(true); }}
                  onDragLeave={() => setIsDraggingModul(false)}
                  onDrop={(e) => { e.preventDefault(); setIsDraggingModul(false); handleModulFile(e.dataTransfer.files?.[0]); }}
                  className={`p-6 border-2 border-dashed rounded-[var(--ui-radius-control)] text-center cursor-pointer transition-all ${
                    isDraggingModul 
                      ? 'border-emerald-500 bg-emerald-50/50' 
                      : 'border-slate-300 hover:border-emerald-500 bg-[var(--ui-surface-muted)] hover:bg-white'
                  }`}
                >
                  <UploadCloud size={28} className="mx-auto text-emerald-600 mb-2" />
                  <p className="text-xs font-bold text-slate-700">Klik atau seret berkas PDF Modul Ajar ke sini</p>
                  <p className="text-[10px] text-slate-400 mt-1">Dokumen RPP yang diunggah akan otomatis terarsip</p>
                </div>
              ) : (
                <div className="p-3.5 rounded-[var(--ui-radius-control)] bg-emerald-50/60 border border-emerald-300 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <FileText size={24} className="text-emerald-700 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate" title={modulForm.nama_dokumen}>
                        {modulForm.nama_dokumen}
                      </p>
                      <p className="text-[10px] text-emerald-700 font-bold mt-0.5">
                        {modulForm.file_size || 'Ukuran siap'} {modulForm.is_compressed ? `(Hemat ${modulForm.saved_percent}%)` : ''}
                      </p>
                    </div>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => setModulForm(p => ({ ...p, file_url: '', nama_dokumen: '', file_size: null }))}
                    className="p-1 rounded text-rose-500 hover:bg-rose-50 cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                </div>
              )}
            </div>

            <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
              <Button 
                variant="outline" 
                size="sm" 
                type="button" 
                disabled={isUploadingModul}
                onClick={() => setIsModulModalOpen(false)}
              >
                Batal
              </Button>
              <Button 
                variant="primary" 
                size="sm" 
                type="submit" 
                disabled={isUploadingModul || isOptimizingModul || !modulForm.file_url}
                className="flex items-center gap-1.5 font-bold"
              >
                {isUploadingModul ? <RefreshCw size={13} className="animate-spin" /> : <UploadCloud size={13} />}
                <span>{isUploadingModul ? 'Mengunggah...' : 'Simpan & Publikasikan'}</span>
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── MODAL 2: TAMBAH MATERI SISWA ── */}
      {isMateriModalOpen && (
        <Modal 
          isOpen={true} 
          onClose={() => !isUploadingMateri && setIsMateriModalOpen(false)} 
          title="Tambah Materi Pembelajaran Siswa"
          maxWidth="max-w-lg"
        >
          <form onSubmit={handleMateriSubmit} className="space-y-4 relative text-xs">
            {/* Error Message */}
            {materiError && (
              <div className="p-3 rounded-[var(--ui-radius-control)] bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-2 font-bold text-xs">
                <AlertCircle size={15} className="shrink-0 text-rose-600" />
                <span>{materiError}</span>
              </div>
            )}

            {/* Tipe Materi Switcher */}
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">
                Tipe Materi Pembelajaran
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMateriForm(f => ({ ...f, tipe: 'file' }))}
                  className={`p-2.5 rounded-[var(--ui-radius-control)] border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                    materiForm.tipe === 'file' 
                      ? 'bg-[var(--ui-primary)]/10 border-[var(--ui-primary)] text-[var(--ui-primary)] font-black shadow-2xs' 
                      : 'bg-slate-50 border-slate-200 text-slate-600'
                  }`}
                >
                  <FileText size={14} /> Berkas PDF
                </button>
                <button
                  type="button"
                  onClick={() => setMateriForm(f => ({ ...f, tipe: 'link' }))}
                  className={`p-2.5 rounded-[var(--ui-radius-control)] border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                    materiForm.tipe === 'link' 
                      ? 'bg-[var(--ui-primary)]/10 border-[var(--ui-primary)] text-[var(--ui-primary)] font-black shadow-2xs' 
                      : 'bg-slate-50 border-slate-200 text-slate-600'
                  }`}
                >
                  <Link2 size={14} /> Link Video / Drive
                </button>
              </div>
            </div>

            {/* Judul & Deskripsi */}
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">
                Judul Materi Pembelajaran <span className="text-rose-500">*</span>
              </label>
              <input 
                type="text" 
                value={materiForm.judul} 
                required
                disabled={isUploadingMateri}
                onChange={e => setMateriForm(f => ({ ...f, judul: e.target.value }))}
                placeholder="Contoh: Bab 1: Dasar Pemrograman Web"
                className="w-full px-3 py-2 bg-[var(--ui-surface-muted)] hover:bg-white border border-[var(--ui-border-soft)] rounded-[var(--ui-radius-control)] text-xs font-bold focus:bg-white focus:outline-none focus:border-[var(--ui-primary)]" 
              />
            </div>

            {/* Mata Pelajaran & Semester */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">
                  Tingkat / Kelas
                </label>
                <CustomSelect
                  value={materiForm.kelas}
                  onChange={val => setMateriForm(f => ({ ...f, kelas: val }))}
                  options={[
                    { value: 'Semua', label: 'Umum / Semua Tingkat' },
                    { value: 'X', label: 'Tingkat X' },
                    { value: 'XI', label: 'Tingkat XI' },
                    { value: 'XII', label: 'Tingkat XII' }
                  ]}
                  searchable={false}
                  placeholder="Tingkat"
                  disabled={isUploadingMateri}
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">
                  Mata Pelajaran <span className="text-rose-500">*</span>
                </label>
                <CustomSelect
                  value={materiForm.mapel}
                  onChange={val => setMateriForm(f => ({ ...f, mapel: val }))}
                  options={availableSubjects.map(s => ({ value: s, label: s }))}
                  searchable={true}
                  placeholder="Pilih Mapel"
                  disabled={isUploadingMateri}
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">
                  Semester <span className="text-rose-500">*</span>
                </label>
                <CustomSelect
                  value={materiForm.semester}
                  onChange={val => setMateriForm(f => ({ ...f, semester: val }))}
                  options={[
                    { value: 'Ganjil', label: 'Semester Ganjil' },
                    { value: 'Genap', label: 'Semester Genap' }
                  ]}
                  searchable={false}
                  placeholder="Semester"
                  disabled={isUploadingMateri}
                />
              </div>
            </div>

            {/* File PDF or Link URL */}
            {materiForm.tipe === 'file' ? (
              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                    Pilih Berkas PDF Materi <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[10px] font-black text-sky-700 bg-sky-50 px-2 py-0.5 rounded-[var(--ui-radius-small)] border border-sky-200">
                    PDF (Maks. 5MB)
                  </span>
                </div>

                <input 
                  type="file" 
                  ref={materiFileInputRef}
                  accept=".pdf"
                  className="hidden"
                  disabled={isUploadingMateri || isOptimizingMateri}
                  onChange={e => handleMateriFile(e.target.files?.[0])}
                />

                {!materiForm.file_url ? (
                  <div 
                    onClick={() => materiFileInputRef.current?.click()}
                    onDragOver={(e) => { e.preventDefault(); setIsDraggingMateri(true); }}
                    onDragLeave={() => setIsDraggingMateri(false)}
                    onDrop={(e) => { e.preventDefault(); setIsDraggingMateri(false); handleMateriFile(e.dataTransfer.files?.[0]); }}
                    className={`p-6 border-2 border-dashed rounded-[var(--ui-radius-control)] text-center cursor-pointer transition-all ${
                      isDraggingMateri 
                        ? 'border-sky-500 bg-sky-50/50' 
                        : 'border-slate-300 hover:border-sky-500 bg-[var(--ui-surface-muted)] hover:bg-white'
                    }`}
                  >
                    <UploadCloud size={28} className="mx-auto text-sky-600 mb-2" />
                    <p className="text-xs font-bold text-slate-700">Klik atau seret berkas PDF Materi ke sini</p>
                    <p className="text-[10px] text-slate-400 mt-1">Materi akan langsung tampil di portal siswa</p>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-[var(--ui-radius-control)] bg-sky-50/60 border border-sky-300 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <BookOpenText size={24} className="text-sky-700 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-800 truncate" title={materiForm.nama_dokumen}>
                          {materiForm.nama_dokumen}
                        </p>
                        <p className="text-[10px] text-sky-700 font-bold mt-0.5">
                          {materiForm.file_size || 'Ukuran siap'}
                        </p>
                      </div>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => setMateriForm(p => ({ ...p, file_url: '', nama_dokumen: '', file_size: null }))}
                      className="p-1 rounded text-rose-500 hover:bg-rose-50 cursor-pointer"
                    >
                      <X size={16} />
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">
                  Tautan / Link Materi (YouTube / Google Drive) <span className="text-rose-500">*</span>
                </label>
                <input 
                  type="url" 
                  value={materiForm.link_url} 
                  required
                  disabled={isUploadingMateri}
                  onChange={e => setMateriForm(f => ({ ...f, link_url: e.target.value }))}
                  placeholder="https://www.youtube.com/watch?v=... atau https://drive.google.com/..."
                  className="w-full px-3 py-2 bg-[var(--ui-surface-muted)] hover:bg-white border border-[var(--ui-border-soft)] rounded-[var(--ui-radius-control)] text-xs font-bold focus:bg-white focus:outline-none focus:border-[var(--ui-primary)]" 
                />
              </div>
            )}

            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">
                Deskripsi / Catatan Tambahan (Opsional)
              </label>
              <textarea 
                rows={2}
                value={materiForm.deskripsi} 
                disabled={isUploadingMateri}
                onChange={e => setMateriForm(f => ({ ...f, deskripsi: e.target.value }))}
                placeholder="Petunjuk pengerjaan atau ringkasan topik..."
                className="w-full px-3 py-2 bg-[var(--ui-surface-muted)] hover:bg-white border border-[var(--ui-border-soft)] rounded-[var(--ui-radius-control)] text-xs font-medium focus:bg-white focus:outline-none focus:border-[var(--ui-primary)] resize-none" 
              />
            </div>

            <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
              <Button 
                variant="outline" 
                size="sm" 
                type="button" 
                disabled={isUploadingMateri}
                onClick={() => setIsMateriModalOpen(false)}
              >
                Batal
              </Button>
              <Button 
                variant="primary" 
                size="sm" 
                type="submit" 
                disabled={isUploadingMateri || isOptimizingMateri || (materiForm.tipe === 'file' && !materiForm.file_url) || (materiForm.tipe === 'link' && !materiForm.link_url)}
                className="flex items-center gap-1.5 font-bold"
              >
                {isUploadingMateri ? <RefreshCw size={13} className="animate-spin" /> : <BookOpenText size={13} />}
                <span>{isUploadingMateri ? 'Menyimpan...' : 'Publikasikan Materi'}</span>
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── MODAL: PREVIEW DOC ── */}
      {previewDoc && (
        <Modal 
          isOpen={true} 
          onClose={() => setPreviewDoc(null)} 
          title={previewDoc.title}
          maxWidth="max-w-4xl"
        >
          <div className="space-y-3">
            <div className="w-full h-[70vh] bg-slate-100 rounded-[var(--ui-radius-control)] overflow-hidden border border-slate-200">
              <iframe 
                src={previewDoc.url} 
                title="Pratinjau PDF"
                className="w-full h-full border-none"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setPreviewDoc(null)}>Tutup</Button>
              <Button variant="primary" size="sm" onClick={() => downloadFile(previewDoc.url, previewDoc.title)}>
                <Download size={13} className="mr-1" /> Unduh Dokumen
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── MODAL: RENAME FILE ── */}
      {renameModalOpen && (
        <Modal 
          isOpen={true} 
          onClose={() => !isRenaming && setRenameModalOpen(false)} 
          title={renameData.type === 'modul' ? 'Ubah Nama Modul Ajar' : 'Ubah Judul Materi'}
          maxWidth="max-w-md"
        >
          <form onSubmit={submitRename} className="space-y-4">
            {renameError && (
              <div className="p-3 rounded-[var(--ui-radius-control)] bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-2 font-bold text-xs">
                <AlertCircle size={15} className="shrink-0 text-rose-600" />
                <span>{renameError}</span>
              </div>
            )}
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">
                {renameData.type === 'modul' ? 'Nama Berkas' : 'Judul Materi'}
              </label>
              <input
                type="text"
                autoFocus
                required
                value={renameData.newName}
                onChange={e => setRenameData(d => ({ ...d, newName: e.target.value }))}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-[var(--ui-radius-control)] text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[var(--ui-primary)] focus:ring-1 focus:ring-[var(--ui-primary)]/20 transition-all shadow-xs"
                placeholder={renameData.type === 'modul' ? 'Contoh: Modul_Ajar_IPA.pdf' : 'Masukkan judul materi'}
                disabled={isRenaming}
              />
            </div>
            
            <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
              <Button 
                variant="outline" 
                type="button" 
                onClick={() => setRenameModalOpen(false)} 
                disabled={isRenaming}
                className="font-bold text-xs px-4"
              >
                Batal
              </Button>
              <Button 
                variant="primary" 
                type="submit" 
                disabled={isRenaming || !renameData.newName.trim()}
                className="font-bold text-xs px-4 flex items-center gap-1.5 shadow-sm"
              >
                {isRenaming ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <Check size={14} />
                    <span>Simpan Perubahan</span>
                  </>
                )}
              </Button>
            </div>
          </form>
        </Modal>
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
}
