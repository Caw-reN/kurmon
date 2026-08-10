import { useState, useEffect, useMemo, useRef } from 'react';
import { 
  FileText, 
  Printer, 
  FileSignature, 
  Plus, 
  Edit2, 
  Trash2, 
  X, 
  AlertCircle, 
  CheckCircle2, 
  Search, 
  Download, 
  Sparkles, 
  Building2, 
  User, 
  Calendar, 
  Copy, 
  Check, 
  Eye, 
  Layers, 
  Bookmark, 
  HelpCircle,
  FileCheck,
  RefreshCw,
  Send,
  Sliders,
  ChevronRight
} from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import useAuthStore from '../../../store/monitoring/authStore.js';
import { useAppStore } from '../../../store/useAppStore';
import { PageHeader } from '../../../components/monitoring/ui/index.js';
import { Button, UISelect, Modal } from '../../../components/ui.jsx';

const JENIS_SURAT = [
  { key: 'sp1', label: 'Surat Panggilan 1 (SP1)', desc: 'Peringatan pertama untuk siswa bermasalah kedisiplinan', category: 'Kedisiplinan' },
  { key: 'sp2', label: 'Surat Panggilan 2 (SP2)', desc: 'Peringatan kedua, orang tua/wali murid wajib hadir', category: 'Kedisiplinan' },
  { key: 'sp3', label: 'Surat Panggilan 3 (SP3)', desc: 'Peringatan ketiga, ancaman skorsing/pengembalian ke orang tua', category: 'Kedisiplinan' },
  { key: 'ket_aktif', label: 'Surat Keterangan Aktif', desc: 'Menerangkan bahwa siswa masih terdaftar aktif bersekolah', category: 'Keterangan' },
  { key: 'ket_lulus', label: 'Surat Keterangan Lulus', desc: 'Surat keterangan kelulusan sementara sebelum ijazah resmi', category: 'Keterangan' },
  { key: 'mutasi', label: 'Surat Keterangan Mutasi', desc: 'Surat pengantar perpindahan siswa ke sekolah lain', category: 'Administrasi' },
  { key: 'dispensasi', label: 'Surat Dispensasi', desc: 'Izin tidak mengikuti KBM untuk kegiatan/lomba resmi', category: 'Izin' },
  { key: 'custom', label: 'Template Custom', desc: 'Buat format template surat khusus sesuai kebutuhan', category: 'Lainnya' },
];

const PRESET_DEFAULT_TEMPLATES = [
  {
    jenis: 'sp1',
    nama: 'Surat Panggilan Orang Tua (SP 1)',
    isi_template: `SURAT PANGGILAN ORANG TUA / WALI
Nomor: {NOMOR_SURAT}

Kepada Yth.
Bapak/Ibu Orang Tua / Wali dari:
Nama Siswa : {NAMA_SISWA}
NIS / NISN : {NIS} / {NISN}
Kelas / Jurusan : {KELAS} / {JURUSAN}

Dengan hormat,
Sehubungan dengan adanya catatan kedisiplinan siswa di sekolah, dengan ini kami mengharap kehadiran Bapak/Ibu Orang Tua/Wali murid pada:

Hari / Tanggal : {TANGGAL}
Waktu : 08.00 WIB - Selesai
Tempat : Ruang Bimbingan Konseling (BK) {NAMA_SEKOLAH}
Keperluan : Koordinasi Pembinaan Kedisiplinan Siswa ({KETERANGAN})

Demikian surat panggilan ini kami sampaikan. Atas perhatian dan kerja sama Bapak/Ibu, kami ucapkan terima kasih.

{TANGGAL}
Kepala Sekolah,


{NAMA_KEPSEK}
NIP. {NIP_KEPSEK}`
  },
  {
    jenis: 'ket_aktif',
    nama: 'Surat Keterangan Siswa Aktif',
    isi_template: `SURAT KETERANGAN AKTIF SEKOLAH
Nomor: {NOMOR_SURAT}

Yang bertanda tangan di bawah ini Kepala {NAMA_SEKOLAH}, menerangkan dengan sesungguhnya bahwa:

Nama Lengkap : {NAMA_SISWA}
NIS / NISN : {NIS} / {NISN}
Kelas / Jurusan : {KELAS} / {JURUSAN}

Adalah benar-benar siswa yang terdaftar aktif mengikuti kegiatan belajar mengajar di {NAMA_SEKOLAH} pada Tahun Ajaran yang sedang berjalan.

Surat keterangan ini diberikan kepada yang bersangkutan untuk dipergunakan sebagai: {KETERANGAN}.

Demikian Surat Keterangan ini dibuat dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya.

{TANGGAL}
Kepala Sekolah,


{NAMA_KEPSEK}
NIP. {NIP_KEPSEK}`
  },
  {
    jenis: 'dispensasi',
    nama: 'Surat Dispensasi Kegiatan Resmi',
    isi_template: `SURAT DISPENSASI / IZIN KEGIATAN
Nomor: {NOMOR_SURAT}

Yang bertanda tangan di bawah ini Kepala {NAMA_SEKOLAH}, memberikan dispensasi tidak mengikuti KBM kepada:

Nama Lengkap : {NAMA_SISWA}
NIS / NISN : {NIS} / {NISN}
Kelas / Jurusan : {KELAS} / {JURUSAN}

Untuk mengikuti kegiatan: {KETERANGAN}
Tanggal Kegiatan : {TANGGAL}

Demikian surat dispensasi ini dibuat untuk dipergunakan dan dimaklumi oleh bapak/ibu guru pengajar.

{TANGGAL}
Kepala Sekolah,


{NAMA_KEPSEK}
NIP. {NIP_KEPSEK}`
  }
];

const PLACEHOLDER_VARIABLES = [
  { var: '{NAMA_SISWA}', desc: 'Nama lengkap siswa' },
  { var: '{NIS}', desc: 'Nomor Induk Siswa' },
  { var: '{NISN}', desc: 'Nomor Induk Siswa Nasional' },
  { var: '{KELAS}', desc: 'Kelas siswa' },
  { var: '{JURUSAN}', desc: 'Jurusan/Kompetensi' },
  { var: '{NAMA_SEKOLAH}', desc: 'Nama resmi sekolah' },
  { var: '{NAMA_KEPSEK}', desc: 'Nama Kepala Sekolah' },
  { var: '{NIP_KEPSEK}', desc: 'NIP Kepala Sekolah' },
  { var: '{TANGGAL}', desc: 'Tanggal hari ini (Indonesian)' },
  { var: '{NOMOR_SURAT}', desc: 'Nomor agenda/penomoran surat' },
  { var: '{KETERANGAN}', desc: 'Keterangan / alasan khusus' },
  { var: '{TOTAL_POIN}', desc: 'Total poin pelanggaran siswa' },
];

function PrintPreviewPaper({ template, student, school, appSettings = {}, customValues = {}, paperRef }) {
  const today = new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  
  const renderedContent = useMemo(() => {
    if (!template?.isi_template) return '';

    let content = template.isi_template;
    content = content.replace(/{NAMA_SISWA}/g, student?.namaSiswa || student?.name || '[NAMA_SISWA]');
    content = content.replace(/{NIS}/g, student?.nis || '[NIS]');
    content = content.replace(/{NISN}/g, student?.nisn || '[NISN]');
    content = content.replace(/{KELAS}/g, student?.class_name || student?.kelas || '[KELAS]');
    content = content.replace(/{JURUSAN}/g, student?.major || student?.jurusan || '[JURUSAN]');
    content = content.replace(/{NAMA_SEKOLAH}/g, school?.nama_sekolah || school?.name || '[NAMA_SEKOLAH]');
    content = content.replace(/{NAMA_KEPSEK}/g, school?.kepala_sekolah || '[NAMA_KEPSEK]');
    content = content.replace(/{NIP_KEPSEK}/g, school?.nip_kepsek || '[NIP_KEPSEK]');
    content = content.replace(/{TANGGAL}/g, customValues.tanggalSurat || today);
    content = content.replace(/{NOMOR_SURAT}/g, customValues.nomorSurat || '421.5/001/ESURAT/2026');
    content = content.replace(/{KETERANGAN}/g, customValues.keterangan || '[KETERANGAN_KHUSUS]');
    content = content.replace(/{TOTAL_POIN}/g, customValues.totalPoin || student?.poin || '0');
    return content;
  }, [template, student, school, customValues, today]);

  return (
    <div 
      ref={paperRef}
      className="print-paper-canvas bg-white shadow-xs rounded-sm border border-slate-200 p-8 sm:p-12 text-sm leading-relaxed font-serif text-slate-900 w-full max-w-[210mm] min-h-[297mm] mx-auto relative flex flex-col justify-between select-none"
    >
      <div>
        {/* Kop Surat Header */}
        {appSettings.useKopSuratGambar && appSettings.kopSuratGambar ? (
          <img src={appSettings.kopSuratGambar} alt="Kop Surat" className="w-full h-auto object-contain mb-6" />
        ) : (
          <div className="flex items-center gap-4 pb-4 border-b-4 border-double border-slate-900 mb-8">
            {school?.logo_url ? (
              <img src={school.logo_url} alt="Logo" className="w-20 h-20 object-contain shrink-0" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-slate-100 border border-slate-300 flex items-center justify-center font-bold text-xs text-slate-500 shrink-0">
                LOGO
              </div>
            )}
            <div className="text-center flex-1">
              <p className="text-xs font-sans uppercase font-extrabold tracking-widest text-slate-600">PEMERINTAH DAERAH</p>
              <h2 className="font-black text-xl uppercase tracking-wider font-sans text-slate-900">
                {school?.nama_sekolah || school?.name || 'NAMA SEKOLAH'}
              </h2>
              <p className="text-xs font-sans mt-0.5">{school?.alamat || 'Jl. Pendidikan No. 1, Kota Sekolah'}</p>
              <p className="text-xs font-sans text-slate-600">
                Telp: {school?.telepon || '-'} | Website: {school?.website || '-'} | Email: {school?.email || '-'}
              </p>
            </div>
          </div>
        )}

        {/* Body Content */}
        <div className="whitespace-pre-wrap text-justify leading-relaxed font-serif text-slate-800 text-[13.5px]">
          {renderedContent || (
            <div className="py-20 text-center text-slate-300 italic font-sans">
              <FileSignature size={48} className="mx-auto mb-3 opacity-30" />
              Pilih template surat dan siswa di panel kiri untuk menampilkan dokumen surat A4 di sini...
            </div>
          )}
        </div>
      </div>

      {/* Footer Legal Stamp Placeholder */}
      <div className="pt-8 border-t border-slate-100 flex justify-between items-end text-[11px] font-sans text-slate-400">
        <div>
          <p className="italic">Dokumen Resmi E-Surat Terverifikasi Digital</p>
          <p className="text-[10px]">Dicetak pada: {today}</p>
        </div>
        <div className="text-right">
          <p className="font-mono">{school?.npsn ? `NPSN: ${school.npsn}` : 'AKREDITASI A'}</p>
        </div>
      </div>
    </div>
  );
}

export default function ESurat() {
  const [templates, setTemplates] = useState([]);
  const [students, setStudents] = useState([]);
  const [school, setSchool] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  
  const [form, setForm] = useState({ jenis: 'sp1', nama: '', isi_template: '' });
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  
  // Custom Variables Input state for generator
  const [customValues, setCustomValues] = useState({
    nomorSurat: '421.5/001/ESURAT/2026',
    tanggalSurat: new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
    keterangan: 'Keperluan Administrasi Sekolah',
    totalPoin: '0'
  });

  const [studentSearch, setStudentSearch] = useState('');
  const [selectedClass, setSelectedClass] = useState('all');
  const [activeTab, setActiveTab] = useState('cetak');
  const [toast, setToast] = useState(null);
  const [isExportingPDF, setIsExportingPDF] = useState(false);

  const paperRef = useRef(null);
  const textareaRef = useRef(null);
  const authToken = useAuthStore(state => state.user?.authToken);

  const showToast = (msg, type = 'success') => {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchData = async () => {
    if (!authToken) return;
    setIsLoading(true);
    try {
      const [tRes, sRes, scRes] = await Promise.all([
        fetch('/api/esurat', { headers: { Authorization: `Bearer ${authToken}` } }),
        fetch('/api/data/load', { headers: { Authorization: `Bearer ${authToken}` } }),
        fetch('/api/school-profile', { headers: { Authorization: `Bearer ${authToken}` } }),
      ]);
      
      const tData = await tRes.json(); 
      if (tData.ok) {
        if (tData.data && tData.data.length > 0) {
          setTemplates(tData.data);
          if (!selectedTemplate) setSelectedTemplate(tData.data[0]);
        } else {
          // If DB is empty, auto-populate default presets so user can use them immediately
          const defaults = PRESET_DEFAULT_TEMPLATES.map((p, idx) => ({ ...p, id: `preset_default_${idx + 1}` }));
          setTemplates(defaults);
          if (!selectedTemplate) setSelectedTemplate(defaults[0]);
        }
      }

      const sData = await sRes.json(); 
      if (sData.payload && sData.payload.students) {
        setStudents(sData.payload.students);
        if (sData.payload.students.length > 0 && !selectedStudent) {
          setSelectedStudent(sData.payload.students[0]);
        }
      }

      const scData = await scRes.json(); 
      if (scData.ok) setSchool(scData.data || {});
    } catch (e) { 
      console.error(e); 
      // Fallback defaults on network error
      const defaults = PRESET_DEFAULT_TEMPLATES.map((p, idx) => ({ ...p, id: `preset_default_${idx + 1}` }));
      setTemplates(defaults);
      if (!selectedTemplate) setSelectedTemplate(defaults[0]);
    }
    setIsLoading(false);
  };

  useEffect(() => { 
    fetchData(); 
  }, [authToken]);

  const handleSave = async () => {
    if (!form.jenis || !form.nama || !form.isi_template) return showToast('Semua field wajib diisi!', 'error');
    try {
      const body = editingTemplate ? { ...form, id: editingTemplate.id } : form;
      const res = await fetch('/api/esurat', {
        method: 'POST', 
        headers: { Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.ok) { 
        showToast(editingTemplate ? 'Template berhasil diperbarui!' : 'Template baru berhasil ditambahkan!'); 
        setShowModal(false); 
        fetchData(); 
      } else {
        // Fallback local save if server error
        const localItem = { ...form, id: editingTemplate ? editingTemplate.id : 'tpl_' + Date.now() };
        setTemplates(prev => editingTemplate ? prev.map(t => t.id === localItem.id ? localItem : t) : [localItem, ...prev]);
        setSelectedTemplate(localItem);
        setShowModal(false);
        showToast('Template disimpan secara lokal di memori!');
      }
    } catch (e) { 
      const localItem = { ...form, id: editingTemplate ? editingTemplate.id : 'tpl_' + Date.now() };
      setTemplates(prev => editingTemplate ? prev.map(t => t.id === localItem.id ? localItem : t) : [localItem, ...prev]);
      setSelectedTemplate(localItem);
      setShowModal(false);
      showToast('Template disimpan secara lokal di memori!');
    }
  };

  const handleUsePresetDirectly = (preset) => {
    const item = { ...preset, id: 'preset_' + (preset.jenis || Date.now()) };
    setSelectedTemplate(item);
    setTemplates(prev => {
      if (prev.some(t => t.nama === preset.nama)) return prev;
      return [item, ...prev];
    });
    setActiveTab('cetak');
    showToast(`Template "${preset.nama}" aktif di Studio Cetak!`);
  };

  const handleSavePresetToDb = async (preset) => {
    const item = { ...preset, id: 'preset_' + (preset.jenis || Date.now()) };
    try {
      const res = await fetch('/api/esurat', {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(preset),
      });
      const data = await res.json();
      if (data.ok) {
        showToast(`Template prasetel "${preset.nama}" berhasil disimpan!`);
        fetchData();
      } else {
        setTemplates(prev => [item, ...prev.filter(t => t.nama !== preset.nama)]);
        setSelectedTemplate(item);
        showToast(`Template "${preset.nama}" dimuat di memori & siap digunakan!`);
      }
    } catch (e) {
      setTemplates(prev => [item, ...prev.filter(t => t.nama !== preset.nama)]);
      setSelectedTemplate(item);
      showToast(`Template "${preset.nama}" dimuat di memori & siap digunakan!`);
    }
  };

  const handleDelete = async (id) => {
    if (!await window.confirmAsync('Hapus template surat ini?')) return;
    try {
      await fetch('/api/esurat', {
        method: 'POST', 
        headers: { Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', id }),
      });
      showToast('Template berhasil dihapus!'); 
      fetchData();
    } catch (e) { 
      showToast('Gagal menghapus.', 'error'); 
    }
  };

  const handlePrint = () => {
    if (!selectedTemplate || !selectedStudent) return showToast('Pilih template dan siswa terlebih dahulu!', 'error');
    window.print();
  };

  const handleDownloadPDF = async () => {
    if (!selectedTemplate || !selectedStudent) return showToast('Pilih template dan siswa terlebih dahulu!', 'error');
    setIsExportingPDF(true);
    showToast('Menyiapkan file PDF surat A4...', 'success');

    setTimeout(async () => {
      try {
        const element = paperRef.current;
        if (!element) throw new Error("Paper element not found");

        const canvas = await html2canvas(element, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff'
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();

        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`Surat_${selectedStudent.nis}_${selectedTemplate.jenis}_${new Date().getTime()}.pdf`);
        showToast('File PDF Surat berhasil diunduh!');
      } catch (err) {
        console.error(err);
        showToast('Gagal mengeksport file PDF', 'error');
      } finally {
        setIsExportingPDF(false);
      }
    }, 500);
  };

  const insertVariableIntoTextarea = (varString) => {
    if (!textareaRef.current) {
      setForm(p => ({ ...p, isi_template: p.isi_template + varString }));
      return;
    }
    const input = textareaRef.current;
    const start = input.selectionStart || 0;
    const end = input.selectionEnd || 0;
    const text = form.isi_template;
    const newText = text.substring(0, start) + varString + text.substring(end);
    setForm(p => ({ ...p, isi_template: newText }));
    
    setTimeout(() => {
      input.focus();
      input.setSelectionRange(start + varString.length, start + varString.length);
    }, 50);
  };

  const classesList = useMemo(() => {
    return ['all', ...new Set(students.map(s => s.class_name || s.kelas).filter(Boolean).sort())];
  }, [students]);

  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const matchSearch = !studentSearch || 
        (s.namaSiswa || s.name)?.toLowerCase().includes(studentSearch.toLowerCase()) || 
        s.nis?.includes(studentSearch);
      const sClass = s.class_name || s.kelas;
      const matchClass = selectedClass === 'all' || sClass === selectedClass;
      return matchSearch && matchClass;
    });
  }, [students, studentSearch, selectedClass]);

  const tabs = [
    { id: 'cetak', label: 'Cetak & Studio E-Surat', icon: Printer },
    { id: 'template', label: 'Kelola Template Surat', icon: FileText }
  ];

  return (
    <div className="space-y-6 relative animate-in fade-in duration-300 w-full font-inherit">
      <PageHeader
        title="Administrasi E-Surat & Template Sekolah"
        icon={FileSignature}
        description="Generator surat otomatis sekolah, penomoran agenda, template kustom, dan cetak dokumen A4 siap edar."
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      >
        <Button 
          variant="outline" 
          onClick={() => { setEditingTemplate(null); setForm({ jenis: 'sp1', nama: '', isi_template: '' }); setShowModal(true); }} 
          className="bg-[var(--ui-primary-btn,var(--ui-primary))] hover:opacity-90 active:scale-98 text-white font-bold text-xs px-3.5 py-2 rounded-[var(--ui-radius-control)] flex items-center gap-1.5 cursor-pointer shadow-xs transition-all shrink-0"
        >
          <Plus size={15} /> Buat Template Baru
        </Button>
      </PageHeader>

      {/* Summary KPI Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200/80 rounded-[var(--ui-radius-card)] p-3.5 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-[var(--ui-radius-control)] bg-[var(--ui-primary)]/10 text-[var(--ui-primary)] flex items-center justify-center shrink-0">
            <FileText size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-black text-slate-800 leading-none">{templates.length} Template</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">Template Surat Aktif</p>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-[var(--ui-radius-card)] p-3.5 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-[var(--ui-radius-control)] bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <User size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-black text-slate-800 leading-none truncate">
              {selectedStudent ? (selectedStudent.namaSiswa || selectedStudent.name) : 'Belum Dipilih'}
            </p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">Siswa Penerima Surat</p>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-[var(--ui-radius-card)] p-3.5 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-[var(--ui-radius-control)] bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <Bookmark size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-black text-slate-800 leading-none truncate">
              {selectedTemplate ? selectedTemplate.nama : 'Belum Dipilih'}
            </p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">Format Surat Aktif</p>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-[var(--ui-radius-card)] p-3.5 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-[var(--ui-radius-control)] bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Building2 size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-black text-slate-800 leading-none truncate">
              {useAppStore.getState().appSettings?.useKopSuratGambar ? 'Gambar Custom' : 'Header Resmi Teks'}
            </p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">Kop Surat Sekolah</p>
          </div>
        </div>
      </div>

      {/* ─── TAB 1: CETAK & STUDIO E-SURAT ───────────────────────────────────── */}
      {activeTab === 'cetak' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start animate-in fade-in duration-200">
          
          {/* Left Panel: Configuration Studio (5 cols) */}
          <div className="xl:col-span-5 space-y-4">
            
            {/* Step 1: Template Selection */}
            <div className="bg-white border border-slate-200/80 rounded-[var(--ui-radius-card)] p-4 sm:p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-[var(--ui-primary)] text-white text-[10px] flex items-center justify-center font-bold">1</span>
                  Pilih Template Surat
                </span>
                <span className="text-[10px] font-bold text-slate-400">{templates.length} Format</span>
              </div>

              {templates.length === 0 ? (
                <div className="p-4 text-center text-slate-400 bg-slate-50 rounded-[var(--ui-radius-control)] border border-dashed border-slate-200">
                  <p className="text-xs font-bold">Belum ada template surat tersimpan.</p>
                  <p className="text-[10px] mt-1">Pindah ke tab "Kelola Template" atau muat prasetel.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                  {templates.map(t => {
                    const isSelected = selectedTemplate?.id === t.id;
                    const jenisObj = JENIS_SURAT.find(j => j.key === t.jenis);
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setSelectedTemplate(t)}
                        className={`w-full text-left p-3 rounded-[var(--ui-radius-control)] border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                          isSelected 
                            ? 'bg-[var(--ui-primary)]/10 border-[var(--ui-primary)] text-[var(--ui-primary)] ring-2 ring-[var(--ui-primary)]/20 shadow-xs' 
                            : 'bg-slate-50/70 border-slate-200/80 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-[var(--ui-radius-small)] bg-white/80 border border-slate-200 shrink-0">
                              {jenisObj?.label || t.jenis}
                            </span>
                          </div>
                          <p className="font-extrabold text-xs text-slate-800 mt-1 truncate">{t.nama}</p>
                        </div>
                        {isSelected && <CheckCircle2 size={16} className="text-[var(--ui-primary)] shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Step 2: Target Student Selector */}
            <div className="bg-white border border-slate-200/80 rounded-[var(--ui-radius-card)] p-4 sm:p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-[var(--ui-primary)] text-white text-[10px] flex items-center justify-center font-bold">2</span>
                  Pilih Siswa Penerima
                </span>
                {selectedStudent && (
                  <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-[var(--ui-radius-small)] border border-emerald-200">
                    Siswa Terpilih
                  </span>
                )}
              </div>

              {/* Filters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
                  <input 
                    type="text"
                    value={studentSearch} 
                    onChange={e => setStudentSearch(e.target.value)} 
                    placeholder="Cari NIS atau Nama…" 
                    className="w-full pl-8 pr-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-[var(--ui-radius-control)] text-xs font-semibold focus:outline-none focus:bg-white" 
                  />
                </div>

                <UISelect 
                  value={selectedClass} 
                  onChange={e => setSelectedClass(e.target.value)}
                  className="h-8 text-xs font-bold"
                >
                  {classesList.map(c => <option key={c} value={c}>{c === 'all' ? 'Semua Kelas' : c}</option>)}
                </UISelect>
              </div>

              {/* Student Scroll List */}
              <div className="max-h-[220px] overflow-y-auto space-y-1 border border-slate-200/80 rounded-[var(--ui-radius-control)] p-1">
                {filteredStudents.length === 0 ? (
                  <div className="p-4 text-center text-slate-400 text-xs font-bold">
                    Tidak ada siswa ditemukan.
                  </div>
                ) : (
                  filteredStudents.slice(0, 40).map(s => {
                    const isSelected = selectedStudent?.nis === s.nis;
                    return (
                      <button
                        key={s.nis}
                        type="button"
                        onClick={() => setSelectedStudent(s)}
                        className={`w-full text-left px-2.5 py-2 rounded-[var(--ui-radius-small)] transition-all cursor-pointer flex items-center justify-between text-xs ${
                          isSelected 
                            ? 'bg-[var(--ui-primary)]/10 text-[var(--ui-primary)] font-bold border border-[var(--ui-primary)]/20' 
                            : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <div className="min-w-0 flex-1 truncate">
                          <span className="font-bold text-slate-800">{s.namaSiswa || s.name}</span>
                          <span className="text-[10px] text-slate-400 font-mono ml-2">NIS: {s.nis} ({s.class_name || s.kelas})</span>
                        </div>
                        {isSelected && <Check size={14} className="text-[var(--ui-primary)] shrink-0 ml-1" />}
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Step 3: Custom Field Input Variables */}
            <div className="bg-white border border-slate-200/80 rounded-[var(--ui-radius-card)] p-4 sm:p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-[var(--ui-primary)] text-white text-[10px] flex items-center justify-center font-bold">3</span>
                  Penomoran &amp; Keterangan Khusus
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">
                    Nomor Surat ({'{NOMOR_SURAT}'})
                  </label>
                  <input 
                    type="text"
                    value={customValues.nomorSurat} 
                    onChange={e => setCustomValues(p => ({ ...p, nomorSurat: e.target.value }))}
                    placeholder="Contoh: 421.5/001/2026"
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-[var(--ui-radius-control)] text-xs font-bold text-slate-800 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">
                    Tanggal Surat ({'{TANGGAL}'})
                  </label>
                  <input 
                    type="text"
                    value={customValues.tanggalSurat} 
                    onChange={e => setCustomValues(p => ({ ...p, tanggalSurat: e.target.value }))}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-[var(--ui-radius-control)] text-xs font-bold text-slate-800 focus:bg-white"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">
                    Keterangan Tambahan / Alasan ({'{KETERANGAN}'})
                  </label>
                  <textarea 
                    rows={2}
                    value={customValues.keterangan} 
                    onChange={e => setCustomValues(p => ({ ...p, keterangan: e.target.value }))}
                    placeholder="Contoh: Keperluan pendaftaran beasiswa / Pembinaan kedisiplinan"
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-[var(--ui-radius-control)] text-xs font-semibold text-slate-800 focus:bg-white resize-y"
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 pt-2">
              <Button 
                variant="outline" 
                onClick={handleDownloadPDF} 
                disabled={!selectedTemplate || !selectedStudent || isExportingPDF}
                className="flex-1 flex items-center justify-center gap-1.5 text-xs font-bold rounded-[var(--ui-radius-control)] border-slate-300 py-2.5"
              >
                <Download size={15} /> Download PDF A4
              </Button>

              <Button 
                type="button" 
                onClick={handlePrint} 
                disabled={!selectedTemplate || !selectedStudent}
                className="flex-1 bg-[var(--ui-primary-btn,var(--ui-primary))] hover:opacity-90 text-white font-black text-xs px-4 py-2.5 rounded-[var(--ui-radius-control)] flex items-center justify-center gap-1.5 shadow-xs cursor-pointer transition-all"
              >
                <Printer size={15} /> Cetak Langsung
              </Button>
            </div>

          </div>

          {/* Right Panel: Realtime A4 Paper Studio Preview (7 cols) */}
          <div className="xl:col-span-7 bg-slate-900 text-white border border-slate-800 rounded-[var(--ui-radius-card)] p-4 sm:p-6 shadow-sm space-y-4 sticky top-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-amber-400 shrink-0" />
                <h3 className="font-black text-xs uppercase tracking-widest text-slate-200">
                  Pratinjau Kertas Dokumen A4 Realtime
                </h3>
              </div>

              <span className="text-[10px] font-bold text-slate-400 bg-slate-800 px-2.5 py-1 rounded-[var(--ui-radius-small)]">
                Format Standar A4 (210mm x 297mm)
              </span>
            </div>

            {/* Interactive Paper Workspace */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-[var(--ui-radius-control)] p-4 sm:p-6 overflow-x-auto max-h-[750px] overflow-y-auto custom-scrollbar flex items-start justify-center">
              <PrintPreviewPaper 
                template={selectedTemplate} 
                student={selectedStudent} 
                school={school} 
                appSettings={useAppStore.getState().appSettings}
                customValues={customValues}
                paperRef={paperRef}
              />
            </div>

            <div className="flex items-center justify-between text-xs text-slate-400 font-medium pt-1">
              <span>*Variabel dinamis otomatis diganti berdasarkan data siswa &amp; sekolah.</span>
              <span className="text-emerald-400 font-bold">Siap Dicetak</span>
            </div>

          </div>

        </div>
      )}

      {/* ─── TAB 2: KELOLA TEMPLATE SURAT ───────────────────────────────────── */}
      {activeTab === 'template' && (
        <div className="space-y-6 animate-in fade-in duration-200 font-inherit">
          
          {/* Preset Template Quick Loader Section */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-[var(--ui-radius-card)] p-4 sm:p-5 space-y-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div>
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <Sparkles size={14} className="text-amber-500" />
                  Prasetel Template Standar Sekolah (Quick Preset)
                </h4>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                  Tambahkan template resmi dengan sekali klik tanpa perlu mengetik dari awal.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {PRESET_DEFAULT_TEMPLATES.map((preset, idx) => (
                <div key={idx} className="bg-white border border-slate-200/80 rounded-[var(--ui-radius-control)] p-3.5 shadow-2xs flex flex-col justify-between space-y-3">
                  <div>
                    <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-[var(--ui-radius-small)] bg-[var(--ui-primary)]/10 text-[var(--ui-primary)] border border-[var(--ui-primary)]/20">
                      {preset.jenis}
                    </span>
                    <h5 className="font-bold text-xs text-slate-800 mt-1.5">{preset.nama}</h5>
                  </div>

                  <div className="flex items-center gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => handleUsePresetDirectly(preset)}
                      className="flex-1 bg-[var(--ui-primary)]/10 hover:bg-[var(--ui-primary)] text-[var(--ui-primary)] hover:text-white font-bold text-[11px] py-1.5 px-2 rounded-[var(--ui-radius-small)] transition-all cursor-pointer flex items-center justify-center gap-1"
                      title="Gunakan preset langsung di Studio Cetak A4"
                    >
                      <Send size={11} /> Gunakan
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSavePresetToDb(preset)}
                      className="bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-[11px] py-1.5 px-2.5 rounded-[var(--ui-radius-small)] border border-slate-200/80 transition-all cursor-pointer flex items-center justify-center gap-1"
                      title="Simpan preset ke daftar template saya"
                    >
                      <Plus size={11} /> Simpan
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Existing Templates Grid */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-slate-800 text-sm flex items-center gap-2">
                <Layers size={16} className="text-[var(--ui-primary)]" />
                Daftar Template Tersimpan ({templates.length})
              </h3>
            </div>

            {isLoading ? (
              <div className="p-12 text-center text-slate-400">
                <RefreshCw size={28} className="animate-spin mx-auto mb-2 opacity-40" />
                <p className="text-xs font-bold">Memuat template surat…</p>
              </div>
            ) : templates.length === 0 ? (
              <div className="text-center py-16 bg-white border border-slate-200/80 rounded-[var(--ui-radius-card)] text-slate-400 p-6">
                <FileText size={48} className="mx-auto mb-3 opacity-30 text-slate-400" />
                <p className="font-bold text-sm text-slate-700">Belum ada template surat tersimpan.</p>
                <p className="text-xs text-slate-400 mt-1">Klik tombol "Buat Template Baru" atau gunakan prasetel di atas.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {templates.map(t => {
                  const jenisObj = JENIS_SURAT.find(j => j.key === t.jenis);
                  return (
                    <div 
                      key={t.id} 
                      className="bg-white border border-slate-200/80 rounded-[var(--ui-radius-card)] p-5 shadow-xs hover:shadow-xs hover:-translate-y-0.5 transition-all flex flex-col justify-between space-y-4"
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-[10px] font-black bg-[var(--ui-primary)]/10 text-[var(--ui-primary)] px-2 py-0.5 rounded-[var(--ui-radius-small)] uppercase tracking-wider border border-[var(--ui-primary)]/20">
                            {jenisObj?.label || t.jenis}
                          </span>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingTemplate(t);
                                setForm({ jenis: t.jenis, nama: t.nama, isi_template: t.isi_template });
                                setShowModal(true);
                              }}
                              className="p-1.5 rounded-[var(--ui-radius-small)] bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/80 cursor-pointer transition-colors"
                              title="Edit Template"
                            >
                              <Edit2 size={13} />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDelete(t.id)}
                              className="p-1.5 rounded-[var(--ui-radius-small)] bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-rose-600 border border-slate-200/80 cursor-pointer transition-colors"
                              title="Hapus Template"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>

                        <h3 className="font-extrabold text-sm text-slate-800 leading-snug">{t.nama}</h3>
                        <p className="text-xs text-slate-500 line-clamp-4 font-serif leading-relaxed bg-slate-50/80 p-2.5 rounded-[var(--ui-radius-small)] border border-slate-100">
                          {t.isi_template}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-medium">
                        <span>Status: Siap Digunakan</span>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedTemplate(t);
                            setActiveTab('cetak');
                          }}
                          className="font-bold text-[var(--ui-primary)] hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <span>Gunakan</span>
                          <ChevronRight size={12} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      )}

      {/* ─── MODAL: BUAT / EDIT TEMPLATE SURAT ─────────────────────────────── */}
      {showModal && (
        <Modal
          isOpen={true}
          onClose={() => setShowModal(false)}
          title={editingTemplate ? 'Edit Template Surat' : 'Buat Template Surat Baru'}
          maxWidth="max-w-4xl"
        >
          <div className="space-y-5 font-inherit">
            
            {/* Top Info Header & Form Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-0.5">
                  Jenis Surat / Kategori
                </label>
                <UISelect 
                  value={form.jenis} 
                  onChange={e => setForm(p => ({ ...p, jenis: e.target.value }))}
                  className="w-full text-xs font-bold"
                >
                  {JENIS_SURAT.map(j => <option key={j.key} value={j.key}>{j.label}</option>)}
                </UISelect>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-0.5">
                  Judul / Nama Template
                </label>
                <input 
                  type="text" 
                  value={form.nama} 
                  onChange={e => setForm(p => ({ ...p, nama: e.target.value }))} 
                  placeholder="Contoh: Surat Panggilan Orang Tua (SP1)…"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-[var(--ui-radius-control)] text-xs font-bold text-slate-800 focus:ring-2 focus:ring-[var(--ui-primary)]/20 focus:border-[var(--ui-primary)]" 
                />
              </div>
            </div>

            {/* Variable Injector Palette */}
            <div className="bg-slate-50/80 border border-slate-200/80 rounded-[var(--ui-radius-control)] p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1">
                  <Sparkles size={12} className="text-amber-500" />
                  Sisipkan Variabel Otomatis (Klik Untuk Menambahkan Ke Teks)
                </label>
                <span className="text-[10px] text-slate-400 font-semibold">Klik chip di bawah</span>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {PLACEHOLDER_VARIABLES.map(v => (
                  <button
                    key={v.var}
                    type="button"
                    onClick={() => insertVariableIntoTextarea(v.var)}
                    title={v.desc}
                    className="px-2 py-1 bg-white hover:bg-[var(--ui-primary)]/10 text-slate-700 hover:text-[var(--ui-primary)] border border-slate-200/80 rounded-[var(--ui-radius-small)] text-[11px] font-mono font-bold transition-all cursor-pointer shadow-2xs"
                  >
                    {v.var}
                  </button>
                ))}
              </div>
            </div>

            {/* Textarea Code/Format Editor */}
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-0.5">
                Isi Format Template Surat
              </label>
              <textarea 
                ref={textareaRef}
                rows={12} 
                value={form.isi_template} 
                onChange={e => setForm(p => ({ ...p, isi_template: e.target.value }))}
                placeholder="Ketik isi template surat di sini. Gunakan tombol chip variabel di atas untuk menyisipkan data siswa/sekolah otomatis..."
                className="w-full px-3.5 py-3 bg-white border border-slate-300 rounded-[var(--ui-radius-control)] text-xs font-serif leading-relaxed text-slate-900 focus:ring-2 focus:ring-[var(--ui-primary)]/20 focus:border-[var(--ui-primary)] resize-y" 
              />
            </div>

            {/* Action Bar */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-400 font-medium">
                Gunakan format surat yang rapi dan terstruktur.
              </span>

              <div className="flex items-center gap-2">
                <Button variant="outline" type="button" onClick={() => setShowModal(false)}>
                  Batal
                </Button>
                <Button 
                  type="button" 
                  onClick={handleSave} 
                  className="bg-[var(--ui-primary-btn,var(--ui-primary))] hover:opacity-90 text-white font-black text-xs px-4 py-2 rounded-[var(--ui-radius-control)] shadow-xs cursor-pointer"
                >
                  Simpan Template
                </Button>
              </div>
            </div>

          </div>
        </Modal>
      )}

      {/* Hidden Print Styling */}
      <style>{`
        @media print { 
          body * { visibility: hidden !important; } 
          .print-paper-canvas, .print-paper-canvas * { visibility: visible !important; } 
          .print-paper-canvas { 
            position: fixed !important; 
            top: 0 !important; 
            left: 0 !important; 
            width: 100% !important; 
            max-width: 100% !important;
            margin: 0 !important;
            padding: 20mm !important;
            box-shadow: none !important;
            border: none !important;
          } 
        }
      `}</style>

      {/* Global Toast Alert */}
      {toast && (
        <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-[var(--ui-radius-control)] shadow-sm font-bold text-xs flex items-center gap-2.5 animate-in slide-in-from-bottom-5 text-white ${
          toast.type === 'error' ? 'bg-rose-600' : 'bg-emerald-600'
        } z-[9999]`}>
          {toast.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />} 
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}
