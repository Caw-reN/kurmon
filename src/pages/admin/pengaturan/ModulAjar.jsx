import { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import { 
  BookOpen, BookOpenText, Link2, Video, Globe, ExternalLink,
  Users, CheckCircle2, AlertCircle, RefreshCw, Search, FileText, Eye, 
  Download, Trash2, Upload, X, PenTool, LayoutList, BarChart3, 
  UploadCloud, ArrowRight, Check, Plus, Calendar, GraduationCap
} from 'lucide-react';
import useAuthStore from '../../../store/monitoring/authStore.js';
import { base64ToBlobUrl, downloadFile } from '../../../utils/fileHelper.js';
import { PageHeader } from '../../../components/monitoring/ui/index.js';
import { Button, UISelect } from '../../../components/ui.jsx';

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
  if (!url) return 'Buka Link';
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'Buka Video';
  if (url.includes('drive.google.com')) return 'Buka Drive';
  return 'Buka Tautan';
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
  const [materiFilterTipe, setMateriFilterTipe] = useState('all');
  const [isMateriLoading, setIsMateriLoading] = useState(false);
  const [materiForm, setMateriForm] = useState({
    judul: '', deskripsi: '', tipe: 'file',
    file_url: '', nama_dokumen: '', link_url: '',
    mapel: '', kelas_target: '', semester: 'Ganjil', tahun_ajaran: ''
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

  // ── Simple File Input Handlers ──────────────────────────────
  const handleModulFile = (file) => {
    if (!file) return;
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (ext !== '.pdf') {
      setUploadError(`Hanya format file .pdf yang diperbolehkan.`);
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Ukuran file maksimal 5MB.');
      return;
    }
    setUploadError('');
    const reader = new FileReader();
    reader.onloadend = () => {
      setForm(prev => ({ 
        ...prev, 
        file_url: reader.result, 
        nama_dokumen: file.name
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleMateriFile = (file) => {
    if (!file) return;
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (ext !== '.pdf') {
      setMateriUploadError(`Hanya format file .pdf yang diperbolehkan.`);
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setMateriUploadError('Ukuran file maksimal 5MB.');
      return;
    }
    setMateriUploadError('');
    const reader = new FileReader();
    reader.onloadend = () => {
      setMateriForm(prev => ({ 
        ...prev, 
        file_url: reader.result, 
        nama_dokumen: file.name
      }));
    };
    reader.readAsDataURL(file);
  };

  // ── Upload Modul Ajar (RPP) ─────────────────────────────────
  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    setUploadError('');
    if (!form.mapel) return setUploadError('Pilih Mata Pelajaran.');
    if (!form.kelas) return setUploadError('Pilih Kelas.');
    if (!form.file_url) return setUploadError('Pilih file Modul Ajar (PDF).');
    
    setIsUploading(true);
    try {
      const res = await fetch('/api/modul-ajar-guru', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({
          action: 'upload', teacher_code: teacherCode || 'admin',
          teacher_name: teacherName || 'Administrator',
          nama_dokumen: form.nama_dokumen, file_url: form.file_url,
          tahun_ajaran: form.tahun_ajaran || activeYear, mapel: form.mapel,
          kelas: form.kelas, semester: form.semester
        })
      });
      const data = await res.json();
      if (data.ok) {
        showToast('Modul Ajar berhasil diunggah!');
        setForm({ 
          nama_dokumen: '', file_url: '', 
          tahun_ajaran: activeYear, 
          mapel: availableSubjects[0] || '', 
          kelas: availableClasses[0] || '', 
          semester: 'Ganjil'
        });
        const fi = document.getElementById('simple-modul-file');
        if (fi) fi.value = '';
        fetchModulData();
        setActiveTab('daftar');
      } else {
        setUploadError(data.error || 'Gagal mengunggah file.');
      }
    } catch (e) { 
      console.error(e); 
      setUploadError('Terjadi kesalahan saat mengunggah.'); 
    } finally { 
      setIsUploading(false); 
    }
  };

  // ── Upload Materi Ajar (Public) ─────────────────────────────
  const handleMateriUploadSubmit = async (e) => {
    e.preventDefault();
    setMateriUploadError('');
    if (!materiForm.judul.trim()) return setMateriUploadError('Judul materi wajib diisi.');
    if (!materiForm.mapel) return setMateriUploadError('Pilih Mata Pelajaran.');
    if (materiForm.tipe === 'file' && !materiForm.file_url) return setMateriUploadError('Pilih file PDF materi.');
    if (materiForm.tipe === 'link' && !materiForm.link_url.trim()) return setMateriUploadError('Masukkan link/URL materi.');
    
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
          semester: materiForm.semester, tahun_ajaran: materiForm.tahun_ajaran || activeYear
        })
      });
      const data = await res.json();
      if (data.ok) {
        showToast('Materi Ajar berhasil dipublikasikan!');
        setMateriForm({ 
          judul: '', deskripsi: '', tipe: 'file', 
          file_url: '', nama_dokumen: '', link_url: '', 
          mapel: availableSubjects[0] || '', 
          kelas_target: availableClasses[0] || '', 
          semester: 'Ganjil', 
          tahun_ajaran: activeYear
        });
        const fi2 = document.getElementById('simple-materi-file');
        if (fi2) fi2.value = '';
        fetchMateriData();
        setActiveTab('materi-saya');
      } else {
        setMateriUploadError(data.error || 'Gagal mempublikasikan materi.');
      }
    } catch (e) { 
      console.error(e); 
      setMateriUploadError('Terjadi gangguan koneksi.'); 
    } finally { 
      setIsUploadingMateri(false); 
    }
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
      if (data.ok) { 
        showToast('Modul Ajar berhasil dihapus'); 
        fetchModulData(); 
      } else {
        showToast(data.error || 'Gagal menghapus', 'error');
      }
    } catch (e) { 
      console.error(e); 
      showToast('Gagal menghapus dokumen', 'error'); 
    }
  };

  const handleDeleteMateri = async (id, code) => {
    if (!await window.confirmAsync('Hapus materi ajar ini?')) return;
    try {
      const res = await fetch('/api/materi-ajar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ action: 'delete', id, teacher_code: code })
      });
      const data = await res.json();
      if (data.ok) { 
        showToast('Materi ajar berhasil dihapus'); 
        fetchMateriData(); 
      } else {
        showToast(data.error || 'Gagal menghapus', 'error');
      }
    } catch (e) { 
      console.error(e); 
      showToast('Gagal menghapus materi', 'error'); 
    }
  };

  // ── Filtered Data ───────────────────────────────────────────
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
        m.mapel?.toLowerCase().includes(materiSearch.toLowerCase());
      
      const matchTipe = materiFilterTipe === 'all' || m.tipe === materiFilterTipe;
      return matchSearch && matchTipe;
    });
  }, [materiList, myMateri, userRole, activeTab, materiSearch, materiFilterTipe]);

  return (
    <div className="space-y-4 relative animate-in fade-in duration-300 z-10 pb-16">
      {/* Page Header */}
      <PageHeader
        title="Modul & Materi Ajar"
        description="Kelola Modul Ajar (RPP) untuk kelengkapan guru dan Materi Belajar untuk siswa."
        icon={BookOpen}
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* ── TAB 1: Modul Saya ── */}
      {activeTab === 'daftar' && (
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h3 className="text-base font-black text-slate-800">
                {isCurriculum ? 'Arsip Modul Ajar (RPP)' : 'Modul Ajar (RPP) Saya'}
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                {isCurriculum ? 'Daftar semua berkas RPP yang telah diunggah guru.' : 'Daftar Modul Ajar yang telah Anda unggah ke kurikulum.'}
              </p>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                <input 
                  value={searchTerm} 
                  onChange={e => setSearchTerm(e.target.value)} 
                  placeholder="Cari modul..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-[var(--ui-primary)]" 
                />
              </div>

              {userRole === 'guru' && (
                <button
                  type="button"
                  onClick={() => setActiveTab('unggah')}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[var(--ui-primary)] hover:opacity-90 text-white font-black text-xs shadow-xs transition-all cursor-pointer border-none shrink-0"
                >
                  <Plus size={14} />
                  <span>Upload Modul</span>
                </button>
              )}
            </div>
          </div>

          {filteredDocuments.length === 0 ? (
            <div className="p-8 text-center bg-slate-50/60 rounded-xl border border-dashed border-slate-200 space-y-2">
              <FileText size={32} className="mx-auto text-slate-300" />
              <p className="text-xs font-bold text-slate-500">Belum ada Modul Ajar yang diunggah.</p>
              {userRole === 'guru' && (
                <button
                  type="button"
                  onClick={() => setActiveTab('unggah')}
                  className="mt-1 px-4 py-2 rounded-xl bg-[var(--ui-primary)] text-white text-xs font-bold border-none cursor-pointer"
                >
                  Unggah Sekarang
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-[10px] text-slate-500 uppercase border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 font-bold">Mata Pelajaran</th>
                    <th className="px-4 py-3 font-bold">Kelas &amp; Sem.</th>
                    <th className="px-4 py-3 font-bold">Guru</th>
                    <th className="px-4 py-3 font-bold">Tahun Ajaran</th>
                    <th className="px-4 py-3 font-bold">Berkas PDF</th>
                    <th className="px-4 py-3 text-right font-bold w-32">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredDocuments.map(doc => {
                    const isMyOwn = doc.teacher_code === teacherCode;
                    const canDelete = isCurriculum || isMyOwn;
                    return (
                      <tr key={doc.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-4 py-3 font-black text-slate-800">{doc.mapel || 'Umum'}</td>
                        <td className="px-4 py-3 font-bold text-slate-600">Kelas {doc.kelas || '-'} ({doc.semester || '-'})</td>
                        <td className="px-4 py-3 text-slate-600 font-medium">{doc.teacher_name}</td>
                        <td className="px-4 py-3 text-slate-500 font-mono text-[11px]">{doc.tahun_ajaran}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5 max-w-[180px]">
                            <FileText size={14} className="text-rose-500 shrink-0" />
                            <span className="truncate font-bold text-slate-700" title={doc.nama_dokumen}>{doc.nama_dokumen}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button variant="outline" onClick={() => handlePreviewPdf(doc)} className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 cursor-pointer" title="Pratinjau">
                              <Eye size={13} />
                            </Button>
                            <Button onClick={() => downloadFile(doc.file_url, doc.nama_dokumen)} className="p-1.5 rounded-lg bg-[var(--ui-primary)] text-white hover:opacity-90 cursor-pointer" title="Unduh">
                              <Download size={13} />
                            </Button>
                            {canDelete && (
                              <Button variant="outline" onClick={() => handleDelete(doc.id, doc.teacher_code)} className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 border-rose-200 cursor-pointer" title="Hapus">
                                <Trash2 size={13} />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: Upload Modul (Super Simple & Cepat) ── */}
      {activeTab === 'unggah' && userRole === 'guru' && (
        <div className="max-w-2xl mx-auto p-5 sm:p-6 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
              <UploadCloud size={18} className="text-[var(--ui-primary)]" />
              Upload Modul Ajar (RPP)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Pilih mata pelajaran, kelas, dan lampirkan berkas PDF Modul Ajar Anda.
            </p>
          </div>

          <form onSubmit={handleUploadSubmit} className="space-y-3.5">
            {/* Mapel & Kelas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mata Pelajaran <span className="text-rose-500">*</span>
                </label>
                <UISelect 
                  value={form.mapel} 
                  required 
                  onChange={e => setForm({ ...form, mapel: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-[var(--ui-primary)]"
                >
                  <option value="">-- Pilih Mata Pelajaran --</option>
                  {availableSubjects.map(s => <option key={s} value={s}>{s}</option>)}
                </UISelect>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Kelas <span className="text-rose-500">*</span>
                </label>
                <UISelect 
                  value={form.kelas} 
                  required 
                  onChange={e => setForm({ ...form, kelas: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-[var(--ui-primary)]"
                >
                  <option value="">-- Pilih Kelas --</option>
                  {availableClasses.map(c => <option key={c} value={c}>{c}</option>)}
                </UISelect>
              </div>
            </div>

            {/* Semester & Tahun Ajaran */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Semester <span className="text-rose-500">*</span>
                </label>
                <UISelect 
                  value={form.semester} 
                  required 
                  onChange={e => setForm({ ...form, semester: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-[var(--ui-primary)]"
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
                  value={form.tahun_ajaran || activeYear || '2026/2027'}
                  className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 cursor-not-allowed"
                />
              </div>
            </div>

            {/* File PDF Picker */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Pilih Berkas Modul Ajar (PDF) <span className="text-rose-500">*</span>
              </label>
              <div 
                onClick={() => document.getElementById('simple-modul-file')?.click()}
                className={`p-4 rounded-xl border border-dashed flex items-center justify-between gap-3 cursor-pointer transition-all ${
                  form.file_url 
                    ? 'bg-emerald-50/70 border-emerald-300' 
                    : 'bg-slate-50 border-slate-300 hover:bg-white hover:border-[var(--ui-primary)]'
                }`}
              >
                <input 
                  id="simple-modul-file" 
                  type="file" 
                  accept=".pdf" 
                  onChange={e => handleModulFile(e.target.files[0])}
                  className="hidden" 
                />

                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${form.file_url ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                    {form.file_url ? <CheckCircle2 size={18} /> : <FileText size={18} />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800 truncate">
                      {form.nama_dokumen || 'Klik untuk memilih file PDF Modul Ajar'}
                    </p>
                    <p className="text-[10px] text-slate-400">Format .pdf, maksimal 5MB</p>
                  </div>
                </div>

                <span className="px-3 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 text-xs font-bold shrink-0 hover:bg-slate-50">
                  {form.file_url ? 'Ganti File' : 'Pilih File'}
                </span>
              </div>
            </div>

            {/* Error Message */}
            {uploadError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-700 text-xs font-bold">
                <AlertCircle size={15} className="shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}

            {/* Submit Button */}
            <div className="pt-2">
              <button 
                type="submit" 
                disabled={isUploading || !form.file_url}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-[var(--ui-primary)] hover:opacity-90 text-white text-xs font-black rounded-xl transition-all cursor-pointer border-none shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUploading ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Sedang Mengunggah...</span>
                  </>
                ) : (
                  <>
                    <UploadCloud size={15} />
                    <span>Unggah Modul Ajar</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── TAB 3: Materi Saya ── */}
      {activeTab === 'materi-saya' && userRole === 'guru' && (
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h3 className="text-base font-black text-slate-800">Materi Pembelajaran Saya</h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Materi belajar yang dapat diakses oleh siswa di halaman publik.
              </p>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <a 
                href="/materi-ajar" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-all no-underline shrink-0"
              >
                <ExternalLink size={13} />
                <span>Halaman Siswa</span>
              </a>

              <button
                type="button"
                onClick={() => setActiveTab('materi-unggah')}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[var(--ui-primary)] hover:opacity-90 text-white font-black text-xs shadow-xs transition-all cursor-pointer border-none shrink-0"
              >
                <Plus size={14} />
                <span>Upload Materi</span>
              </button>
            </div>
          </div>

          {myMateri.length === 0 ? (
            <div className="p-8 text-center bg-slate-50/60 rounded-xl border border-dashed border-slate-200 space-y-2">
              <BookOpenText size={32} className="mx-auto text-slate-300" />
              <p className="text-xs font-bold text-slate-500">Belum ada materi pembelajaran yang diunggah.</p>
              <button
                type="button"
                onClick={() => setActiveTab('materi-unggah')}
                className="mt-1 px-4 py-2 rounded-xl bg-[var(--ui-primary)] text-white text-xs font-bold border-none cursor-pointer"
              >
                Upload Materi Sekarang
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {myMateri.map(item => {
                const isLink = item.tipe === 'link';
                return (
                  <div key={item.id} className="p-4 rounded-xl border border-slate-200/90 bg-white hover:border-[var(--ui-primary)]/40 hover:shadow-xs transition-all flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="px-2 py-0.5 rounded bg-[var(--ui-primary)]/10 text-[var(--ui-primary)] text-[10px] font-black">
                          {item.mapel || 'Umum'}
                        </span>
                        <span className="text-[10px] font-bold text-slate-500">
                          {item.kelas_target ? `Kelas ${item.kelas_target}` : 'Semua Kelas'}
                        </span>
                      </div>

                      <h4 className="text-xs sm:text-sm font-black text-slate-800 line-clamp-2">{item.judul}</h4>
                      {item.deskripsi && <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">{item.deskripsi}</p>}
                    </div>

                    <div className="flex items-center gap-1.5 mt-3 pt-2.5 border-t border-slate-100">
                      {isLink ? (
                        <a 
                          href={item.link_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2.5 rounded-lg text-xs font-bold text-white bg-[var(--ui-primary)] hover:opacity-90 no-underline"
                        >
                          {getLinkIcon(item.link_url)}
                          <span>{getLinkLabel(item.link_url)}</span>
                        </a>
                      ) : (
                        <>
                          <Button variant="outline" onClick={() => handlePreviewPdf(item)} className="flex-1 py-1.5 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 cursor-pointer">
                            <Eye size={12} /> Lihat
                          </Button>
                          <Button onClick={() => downloadFile(item.file_url, item.nama_dokumen)} className="flex-1 py-1.5 px-2 rounded-lg text-xs font-bold bg-[var(--ui-primary)] text-white hover:opacity-90 flex items-center justify-center gap-1 cursor-pointer">
                            <Download size={12} /> Unduh
                          </Button>
                        </>
                      )}
                      <Button variant="outline" onClick={() => handleDeleteMateri(item.id, item.teacher_code)} className="p-1.5 text-rose-600 hover:bg-rose-50 border-rose-200 rounded-lg cursor-pointer" title="Hapus">
                        <Trash2 size={13} />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 4: Upload Materi (Mudah & Simpel) ── */}
      {activeTab === 'materi-unggah' && userRole === 'guru' && (
        <div className="max-w-2xl mx-auto p-5 sm:p-6 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
              <Upload size={18} className="text-[var(--ui-primary)]" />
              Upload Materi Pembelajaran Siswa
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Bagikan modul PDF atau tautan video materi yang dapat diakses oleh siswa.
            </p>
          </div>

          <form onSubmit={handleMateriUploadSubmit} className="space-y-3.5">
            {/* Tipe Switcher */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Jenis Materi <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => setMateriForm(f => ({ ...f, tipe: 'file' }))}
                  className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                    materiForm.tipe === 'file' ? 'bg-white text-[var(--ui-primary)] shadow-xs' : 'text-slate-600'
                  }`}
                >
                  <FileText size={15} />
                  <span>File PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMateriForm(f => ({ ...f, tipe: 'link' }))}
                  className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                    materiForm.tipe === 'link' ? 'bg-white text-[var(--ui-primary)] shadow-xs' : 'text-slate-600'
                  }`}
                >
                  <Link2 size={15} />
                  <span>Link / Video</span>
                </button>
              </div>
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
                placeholder="Contoh: Bab 1 - Pengenalan Algoritma &amp; Pemrograman"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-[var(--ui-primary)] focus:bg-white" 
              />
            </div>

            {/* Mapel & Kelas Target */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                  <option value="">-- Pilih Mata Pelajaran --</option>
                  {availableSubjects.map(s => <option key={s} value={s}>{s}</option>)}
                </UISelect>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Kelas Target
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

            {/* File PDF or Link Input */}
            {materiForm.tipe === 'file' ? (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Pilih File PDF Materi <span className="text-rose-500">*</span>
                </label>
                <div 
                  onClick={() => document.getElementById('simple-materi-file')?.click()}
                  className="p-3.5 rounded-xl border border-dashed bg-slate-50 hover:bg-white hover:border-[var(--ui-primary)] flex items-center justify-between gap-2 cursor-pointer"
                >
                  <input 
                    id="simple-materi-file" 
                    type="file" 
                    accept=".pdf" 
                    onChange={e => handleMateriFile(e.target.files[0])}
                    className="hidden" 
                  />
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText size={16} className="text-slate-500 shrink-0" />
                    <span className="text-xs font-bold text-slate-700 truncate">
                      {materiForm.nama_dokumen || 'Pilih berkas PDF materi (Maks. 5MB)'}
                    </span>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-xs font-bold text-slate-600 shrink-0">
                    {materiForm.nama_dokumen ? 'Ganti' : 'Browse'}
                  </span>
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  URL / Tautan Link <span className="text-rose-500">*</span>
                </label>
                <input 
                  value={materiForm.link_url} 
                  required 
                  onChange={e => setMateriForm(f => ({ ...f, link_url: e.target.value }))}
                  placeholder="https://youtube.com/... atau https://drive.google.com/..."
                  type="url"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-[var(--ui-primary)] focus:bg-white" 
                />
              </div>
            )}

            {/* Deskripsi */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Keterangan Singkat (Opsional)
              </label>
              <textarea 
                value={materiForm.deskripsi} 
                onChange={e => setMateriForm(f => ({ ...f, deskripsi: e.target.value }))}
                placeholder="Catatan materi untuk siswa..."
                rows={2}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-[var(--ui-primary)] resize-none" 
              />
            </div>

            {/* Error Message */}
            {materiUploadError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-700 text-xs font-bold">
                <AlertCircle size={15} className="shrink-0" />
                <span>{materiUploadError}</span>
              </div>
            )}

            {/* Submit Button */}
            <div className="pt-2">
              <button 
                type="submit" 
                disabled={isUploadingMateri}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-[var(--ui-primary)] hover:opacity-90 text-white text-xs font-black rounded-xl transition-all cursor-pointer border-none shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUploadingMateri ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Sedang Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <BookOpenText size={15} />
                    <span>Publikasikan Materi</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── TAB: Materi Publik (Kurikulum) ── */}
      {activeTab === 'materi-daftar' && isCurriculum && (
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h3 className="text-base font-black text-slate-800">Semua Materi Pembelajaran Publik</h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Materi yang telah dipublikasikan guru dan dapat diakses oleh siswa.
              </p>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input 
                value={materiSearch} 
                onChange={e => setMateriSearch(e.target.value)} 
                placeholder="Cari materi..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-[var(--ui-primary)]" 
              />
            </div>
          </div>

          {filteredMateri.length === 0 ? (
            <div className="p-8 text-center text-slate-400">Tidak ada materi ajar yang ditemukan.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {filteredMateri.map(item => {
                const isLink = item.tipe === 'link';
                return (
                  <div key={item.id} className="p-4 rounded-xl border border-slate-200 bg-white flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="px-2 py-0.5 rounded bg-[var(--ui-primary)]/10 text-[var(--ui-primary)] text-[10px] font-black">
                          {item.mapel}
                        </span>
                        <span className="text-[10px] font-bold text-slate-500">
                          {item.kelas_target ? `Kelas ${item.kelas_target}` : 'Semua Kelas'}
                        </span>
                      </div>
                      <h4 className="text-xs sm:text-sm font-black text-slate-800 line-clamp-2">{item.judul}</h4>
                      <p className="text-[10px] text-slate-400 mt-1">Oleh: {item.teacher_name}</p>
                    </div>

                    <div className="flex items-center gap-1.5 mt-3 pt-2.5 border-t border-slate-100">
                      {isLink ? (
                        <a 
                          href={item.link_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2.5 rounded-lg text-xs font-bold text-white bg-[var(--ui-primary)] hover:opacity-90 no-underline"
                        >
                          {getLinkIcon(item.link_url)}
                          <span>Buka Tautan</span>
                        </a>
                      ) : (
                        <>
                          <Button variant="outline" onClick={() => handlePreviewPdf(item)} className="flex-1 py-1.5 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 cursor-pointer">
                            <Eye size={12} /> Lihat
                          </Button>
                          <Button onClick={() => downloadFile(item.file_url, item.nama_dokumen)} className="flex-1 py-1.5 px-2 rounded-lg text-xs font-bold bg-[var(--ui-primary)] text-white hover:opacity-90 flex items-center justify-center gap-1 cursor-pointer">
                            <Download size={12} /> Unduh
                          </Button>
                        </>
                      )}
                      <Button variant="outline" onClick={() => handleDeleteMateri(item.id, item.teacher_code)} className="p-1.5 text-rose-600 hover:bg-rose-50 border-rose-200 rounded-lg cursor-pointer" title="Hapus">
                        <Trash2 size={13} />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── TAB: Monitoring Pengumpulan RPP (Kurikulum) ── */}
      {activeTab === 'rekap' && isCurriculum && (
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-4 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h3 className="text-base font-black text-slate-800">Monitoring Pengumpulan RPP</h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Tahun Ajaran: <strong className="text-[var(--ui-primary)]">{activeYear || 'Aktif'}</strong>
              </p>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input 
                value={monitoringSearch} 
                onChange={e => setMonitoringSearch(e.target.value)} 
                placeholder="Cari guru..."
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
                  <th className="px-4 py-3 text-center font-bold">Status</th>
                  <th className="px-4 py-3 font-bold">Dokumen Modul</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {teachers.map(t => {
                  const teacherDocs = documents.filter(d => d.teacher_code === t.code);
                  const hasSubmitted = teacherDocs.length > 0;
                  return (
                    <tr key={t.code} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3 font-bold text-slate-800">{t.name}</td>
                      <td className="px-4 py-3 font-mono text-slate-500">{t.code}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                          hasSubmitted ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {hasSubmitted ? 'Sudah Kumpul' : 'Belum Kumpul'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {hasSubmitted ? (
                          <div className="flex flex-wrap gap-1.5">
                            {teacherDocs.map(d => (
                              <span 
                                key={d.id} 
                                onClick={() => handlePreviewPdf(d)}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer"
                              >
                                <FileText size={11} className="text-rose-500" />
                                {d.mapel} ({d.kelas})
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB: Silabus Kurikulum ── */}
      {activeTab === 'silabus' && isCurriculum && (
        <Suspense fallback={<div className="p-12 text-center text-slate-500 font-bold animate-pulse">Memuat Modul Ajar...</div>}>
          <TabSilabus {...props} hideHeader={true} />
        </Suspense>
      )}

      {/* ── TAB: Silabus Guru ── */}
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

      {/* Toast Notification */}
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
            <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
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
