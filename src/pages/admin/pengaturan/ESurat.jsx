import { useState, useEffect, useMemo, useRef } from 'react';
import { 
  FileText, Printer, FileSignature, Plus, Edit2, Trash2, X, 
  AlertCircle, CheckCircle2, Search, Download, Sparkles, Building2, 
  User, Calendar, Copy, Check, Eye, Layers, Bookmark, HelpCircle,
  FileCheck, RefreshCw, Send, Sliders, ChevronRight, GraduationCap,
  Maximize2, Minimize2, Settings2, RotateCcw, ChevronDown, ChevronUp,
  SlidersHorizontal, Save
} from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import useAuthStore from '../../../store/monitoring/authStore.js';
import { useAppStore } from '../../../store/useAppStore';
import { PageHeader, Avatar } from '../../../components/monitoring/ui/index.js';
import { Button, Modal } from '../../../components/ui.jsx';
import { CustomSelect } from '../../../components/CustomSelect.jsx';

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

function PrintPreviewPaper({ template, student, school, appSettings = {}, customValues = {}, liveMargins = {}, paperRef }) {
  const today = new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  
  const renderedContent = useMemo(() => {
    if (!template?.isi_template) return '';

    const namaSekolah = school?.nama_sekolah || school?.name || appSettings?.schoolName || 'SMK KARYA GUNA 2 BEKASI';
    const namaKepsek = school?.kepala_sekolah || appSettings?.kepsekName || 'Yunie Purwiasih, M.Pd';
    const nipKepsek = school?.nip_kepsek || appSettings?.kepsekNip || '19750512 200501 2 003';
    const studentNisn = student?.nisn || student?.payload?.nisn || student?.nis || '-';

    let content = template.isi_template;
    content = content.replace(/{NAMA_SISWA}/g, student?.namaSiswa || student?.name || student?.nama || '[NAMA_SISWA]');
    content = content.replace(/{NIS}/g, student?.nis || '[NIS]');
    content = content.replace(/{NISN}/g, studentNisn);
    content = content.replace(/{KELAS}/g, student?.class_name || student?.kelas || '[KELAS]');
    content = content.replace(/{JURUSAN}/g, student?.major || student?.jurusan || (student?.class_name?.split(' ')[1] || 'Umum'));
    content = content.replace(/{NAMA_SEKOLAH}/g, namaSekolah);
    content = content.replace(/{NAMA_KEPSEK}/g, namaKepsek);
    content = content.replace(/{NIP_KEPSEK}/g, nipKepsek);
    content = content.replace(/{TANGGAL}/g, customValues.tanggalSurat || today);
    content = content.replace(/{NOMOR_SURAT}/g, customValues.nomorSurat || '421.5/001/ESURAT/2026');
    content = content.replace(/{KETERANGAN}/g, customValues.keterangan || 'Keperluan Administrasi Sekolah');
    content = content.replace(/{TOTAL_POIN}/g, String(customValues.totalPoin || student?.poin || '0'));
    return content;
  }, [template, student, school, appSettings, customValues, today]);

  const defaultLogo = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'><rect width='120' height='120' rx='16' fill='%23064e3b'/><text x='60' y='68' font-family='sans-serif' font-size='24' font-weight='900' fill='%23ffffff' text-anchor='middle'>SMK</text></svg>";

  // Dynamic Layout & Margins from live props or appSettings
  const kopMarginTop = liveMargins.kopMarginTop ?? appSettings?.kopMarginTop ?? 15;
  const kopMarginSide = liveMargins.kopMarginSide ?? appSettings?.kopMarginSide ?? 20;
  const kopMarginBottom = liveMargins.kopMarginBottom ?? appSettings?.kopMarginBottom ?? 15;
  const kopSpacing = liveMargins.kopSpacing ?? appSettings?.kopSpacing ?? 20;
  const kopBannerHeight = liveMargins.kopBannerHeight ?? appSettings?.kopBannerHeight ?? 130;
  const kopLogoSize = liveMargins.kopLogoSize ?? appSettings?.kopLogoSize ?? 72;
  const kopAlign = liveMargins.kopAlign ?? appSettings?.kopAlign ?? 'center';
  const kopDivider = liveMargins.kopDivider ?? appSettings?.kopDivider ?? (appSettings?.useKopSuratGambar ? 'none' : 'double');
  const kopBannerFullWidth = liveMargins.kopBannerFullWidth ?? appSettings?.kopBannerFullWidth ?? false;

  return (
    <div 
      ref={paperRef}
      style={{
        paddingTop: `${kopMarginTop}mm`,
        paddingLeft: `${kopMarginSide}mm`,
        paddingRight: `${kopMarginSide}mm`,
        paddingBottom: `${kopMarginBottom}mm`,
      }}
      className="print-paper-canvas bg-white shadow-md rounded-sm border border-slate-200 text-sm leading-relaxed font-serif text-slate-900 w-full max-w-[210mm] min-h-[297mm] mx-auto relative flex flex-col justify-between select-none animate-in fade-in transition-all duration-150"
    >
      <div>
        {/* Kop Surat Header */}
        {appSettings?.useKopSuratGambar && appSettings?.kopSuratGambar ? (
          <div 
            style={{ 
              marginBottom: `${kopSpacing}px`,
              ...(kopBannerFullWidth ? {
                marginLeft: `-${kopMarginSide}mm`,
                marginRight: `-${kopMarginSide}mm`,
                marginTop: `-${kopMarginTop}mm`,
                paddingTop: `4mm`
              } : {})
            }} 
            className="w-full flex justify-center overflow-hidden"
          >
            <img 
              src={appSettings.kopSuratGambar} 
              alt="Kop Surat" 
              style={{ maxHeight: `${kopBannerHeight}px` }}
              className="w-full h-auto object-contain mx-auto transition-all" 
            />
          </div>
        ) : (
          <div 
            style={{ marginBottom: `${kopSpacing}px` }}
            className={`flex items-center gap-4 pb-3 ${
              kopDivider === 'double' ? 'border-b-4 border-double border-slate-900' :
              kopDivider === 'single' ? 'border-b border-slate-900' :
              kopDivider === 'thick' ? 'border-b-2 border-slate-900' :
              kopDivider === 'dashed' ? 'border-b-2 border-dashed border-slate-900' : ''
            }`}
          >
            <img 
              src={appSettings?.kopSuratLogo || school?.logo_url || defaultLogo} 
              alt="Logo" 
              style={{ width: `${kopLogoSize}px`, height: `${kopLogoSize}px` }}
              className="object-contain shrink-0" 
              onError={(e) => { e.target.src = defaultLogo; }}
            />
            <div className={`flex-1 ${kopAlign === 'left' ? 'text-left' : 'text-center'}`}>
              <p className="text-[11px] font-sans uppercase font-extrabold tracking-widest text-slate-600">
                {appSettings?.kopSuratBaris1 || 'PEMERINTAH DAERAH PROVINSI JAWA BARAT'}
              </p>
              {appSettings?.kopSuratBaris2 && (
                <p className="text-xs font-sans uppercase font-bold text-slate-700">
                  {appSettings.kopSuratBaris2}
                </p>
              )}
              <h2 className="font-black text-lg sm:text-xl uppercase tracking-wider font-sans text-slate-900 leading-tight">
                {appSettings?.kopSuratBaris3 || school?.nama_sekolah || school?.name || appSettings?.schoolName || 'SMK KARYA GUNA 2 BEKASI'}
              </h2>
              <p className="text-[11.5px] font-sans mt-0.5">
                {appSettings?.kopSuratAlamat || school?.alamat || 'Jl. Karang Satria RT.10/16, Kelurahan Duren Jaya, Kecamatan Bekasi Timur'}
              </p>
              <p className="text-[11px] font-sans text-slate-600">
                {appSettings?.kopSuratKontak || `Telp: ${school?.telepon || '085117551755'} | Website: ${school?.website || 'smkkg2.sch.id'} | Email: ${school?.email || '-'}`}
              </p>
            </div>
          </div>
        )}

        {/* Body Content */}
        <div className="whitespace-pre-wrap text-justify leading-relaxed font-serif text-slate-800 text-[13px] sm:text-[13.5px]">
          {renderedContent || (
            <div className="py-20 text-center text-slate-300 italic font-sans">
              <FileSignature size={48} className="mx-auto mb-3 opacity-30" />
              Pilih template surat dan siswa di panel kiri untuk menampilkan dokumen surat A4 di sini...
            </div>
          )}
        </div>
      </div>

      {/* Footer Legal Stamp Placeholder */}
      <div className="pt-6 border-t border-slate-100 flex justify-between items-end text-[10.5px] font-sans text-slate-400">
        <div>
          <p className="italic">Dokumen Resmi E-Surat Terverifikasi Digital</p>
          <p className="text-[9.5px]">Dicetak pada: {today}</p>
        </div>
        <div className="text-right">
          <p className="font-mono">{school?.npsn ? `NPSN: ${school.npsn}` : 'AKREDITASI A'}</p>
        </div>
      </div>
    </div>
  );
}

export default function ESurat({ initialTab = 'cetak', readOnly, appSettings: propAppSettings, setAppSettings, onSave }) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [mobileStudioTab, setMobileStudioTab] = useState('form'); // 'form' | 'preview'
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [school, setSchool] = useState({});
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedClass, setSelectedClass] = useState('all');
  const [toast, setToast] = useState(null);
  const [showMarginSettings, setShowMarginSettings] = useState(true);

  const paperRef = useRef(null);
  const authToken = useAuthStore(state => state.user?.authToken);
  const storeAppSettings = useAppStore(state => state.appSettings) || {};
  const appSettings = propAppSettings || storeAppSettings;

  // Live Margins State (Editable right in E-Surat studio!)
  const [liveMargins, setLiveMargins] = useState({
    kopMarginTop: appSettings?.kopMarginTop ?? 15,
    kopMarginSide: appSettings?.kopMarginSide ?? 20,
    kopMarginBottom: appSettings?.kopMarginBottom ?? 15,
    kopSpacing: appSettings?.kopSpacing ?? 20,
    kopBannerHeight: appSettings?.kopBannerHeight ?? 130,
    kopBannerFullWidth: appSettings?.kopBannerFullWidth ?? false,
  });

  useEffect(() => {
    if (appSettings) {
      setLiveMargins({
        kopMarginTop: appSettings.kopMarginTop ?? 15,
        kopMarginSide: appSettings.kopMarginSide ?? 20,
        kopMarginBottom: appSettings.kopMarginBottom ?? 15,
        kopSpacing: appSettings.kopSpacing ?? 20,
        kopBannerHeight: appSettings.kopBannerHeight ?? 130,
        kopBannerFullWidth: appSettings.kopBannerFullWidth ?? false,
      });
    }
  }, [appSettings]);

  // Form Custom Values
  const [customValues, setCustomValues] = useState({
    nomorSurat: '421.5/001/ESURAT/2026',
    tanggalSurat: new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
    keterangan: 'Keperluan Administrasi Sekolah',
    totalPoin: 0
  });

  // Modal State for Template CRUD
  const [showModal, setShowModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [form, setForm] = useState({ jenis: 'sp1', nama: '', isi_template: '' });
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isSavingMargins, setIsSavingMargins] = useState(false);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleSaveLiveMargins = async () => {
    setIsSavingMargins(true);
    try {
      const updated = {
        ...appSettings,
        ...liveMargins
      };
      if (setAppSettings) setAppSettings(updated);
      if (onSave) await onSave({ appSettings: updated }, "menyimpan margin surat");
      showToast('Pengaturan margin & posisi kop surat berhasil disimpan!');
    } catch {
      showToast('Gagal menyimpan margin.', 'error');
    }
    setIsSavingMargins(false);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [tplRes, stRes, scRes] = await Promise.all([
        fetch('/api/esurat/templates', { headers: { Authorization: `Bearer ${authToken}` } }),
        fetch('/api/students/active', { headers: { Authorization: `Bearer ${authToken}` } }),
        fetch('/api/school-profile', { headers: { Authorization: `Bearer ${authToken}` } }),
      ]);

      const tplData = await tplRes.json();
      const stData = await stRes.json();
      const scData = await scRes.json();

      let validTpls = [];
      if (tplData.ok && Array.isArray(tplData.data) && tplData.data.length > 0) {
        validTpls = tplData.data;
      } else {
        validTpls = PRESET_DEFAULT_TEMPLATES.map((p, idx) => ({ id: idx + 1, ...p }));
      }
      setTemplates(validTpls);
      if (validTpls.length > 0) setSelectedTemplate(validTpls[0]);

      if (stData.ok && Array.isArray(stData.data)) {
        setStudents(stData.data);
        if (stData.data.length > 0) setSelectedStudent(stData.data[0]);
      }
      if (scData.ok) setSchool(scData.data || {});
    } catch (e) {
      setTemplates(PRESET_DEFAULT_TEMPLATES.map((p, idx) => ({ id: idx + 1, ...p })));
      if (PRESET_DEFAULT_TEMPLATES.length > 0) setSelectedTemplate(PRESET_DEFAULT_TEMPLATES[0]);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [authToken]);

  const uniqueClasses = useMemo(() => {
    const cls = new Set();
    students.forEach(s => {
      const c = s.class_name || s.kelas;
      if (c) cls.add(c);
    });
    return Array.from(cls).sort();
  }, [students]);

  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const name = s.namaSiswa || s.name || s.nama || '';
      const nis = s.nis || '';
      const matchSearch = !studentSearch || name.toLowerCase().includes(studentSearch.toLowerCase()) || nis.includes(studentSearch);
      const sClass = s.class_name || s.kelas;
      const matchClass = selectedClass === 'all' || sClass === selectedClass;
      return matchSearch && matchClass;
    });
  }, [students, studentSearch, selectedClass]);

  const handlePrintDirect = () => {
    if (!paperRef.current) return;
    
    // Create an isolated hidden iframe for printing only the A4 paper canvas
    const printFrame = document.createElement('iframe');
    printFrame.style.position = 'fixed';
    printFrame.style.right = '0';
    printFrame.style.bottom = '0';
    printFrame.style.width = '0';
    printFrame.style.height = '0';
    printFrame.style.border = '0';
    document.body.appendChild(printFrame);

    const frameDoc = printFrame.contentWindow.document;
    frameDoc.open();
    frameDoc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${selectedTemplate?.nama || 'Surat Sekolah'} - ${selectedStudent?.name || selectedStudent?.nama || 'Siswa'}</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 0;
            }
            * {
              box-sizing: border-box;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            html, body {
              margin: 0;
              padding: 0;
              background: #ffffff !important;
              font-family: ui-serif, Georgia, Cambria, "Times New Roman", Times, serif;
              color: #0f172a;
              width: 210mm;
            }
            .print-paper-canvas {
              width: 210mm;
              min-height: 297mm;
              margin: 0 auto;
              background: #ffffff !important;
              border: none !important;
              box-shadow: none !important;
            }
            img {
              max-width: 100%;
            }
            .text-center { text-align: center; }
            .text-left { text-align: left; }
            .text-right { text-align: right; }
            .text-justify { text-align: justify; }
            .font-bold { font-weight: 700; }
            .font-black { font-weight: 900; }
            .font-sans { font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
            .font-serif { font-family: ui-serif, Georgia, Cambria, "Times New Roman", Times, serif; }
            .font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
            .uppercase { text-transform: uppercase; }
            .leading-relaxed { line-height: 1.625; }
            .leading-tight { line-height: 1.25; }
            .flex { display: flex; }
            .items-center { align-items: center; }
            .items-end { align-items: flex-end; }
            .justify-between { justify-content: space-between; }
            .justify-center { justify-content: center; }
            .flex-1 { flex: 1 1 0%; }
            .flex-col { flex-direction: column; }
            .border-b-4 { border-bottom-width: 4px; }
            .border-double { border-style: double; }
            .border-b { border-bottom-width: 1px; }
            .border-t { border-top-width: 1px; }
            .border-slate-900 { border-color: #0f172a; }
            .border-slate-100 { border-color: #f1f5f9; }
            .border-slate-200 { border-color: #e2e8f0; }
            .whitespace-pre-wrap { white-space: pre-wrap; }
            .italic { font-style: italic; }
            .w-full { width: 100%; }
            .shrink-0 { flex-shrink: 0; }
          </style>
        </head>
        <body>
          <div class="print-paper-canvas" style="${paperRef.current.getAttribute('style') || ''}">
            ${paperRef.current.innerHTML}
          </div>
          <script>
            window.onload = function() {
              window.focus();
              setTimeout(function() {
                window.print();
                setTimeout(function() {
                  window.parent.document.body.removeChild(window.frameElement);
                }, 1000);
              }, 250);
            };
          </script>
        </body>
      </html>
    `);
    frameDoc.close();
  };

  const handleExportPDF = async () => {
    if (!paperRef.current) return;
    setIsExportingPdf(true);
    try {
      const element = paperRef.current;
      
      // Ensure all images are loaded before generating canvas
      const images = element.querySelectorAll('img');
      await Promise.all(Array.from(images).map(img => {
        if (img.complete) return Promise.resolve();
        return new Promise(resolve => {
          img.onload = resolve;
          img.onerror = resolve;
        });
      }));

      const canvas = await html2canvas(element, { 
        scale: 2, 
        useCORS: true,
        allowTaint: false,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: 1200
      });
      
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true
      });
      
      const pdfWidth = pdf.internal.pageSize.getWidth(); // 210mm
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, Math.min(297, pdfHeight));
      
      const studentCode = selectedStudent?.nis || 'Siswa';
      const templateTitle = (selectedTemplate?.nama || 'Dokumen').replace(/[^a-zA-Z0-9_-]/g, '_');
      const fileName = `Surat_${templateTitle}_${studentCode}.pdf`;
      pdf.save(fileName);
      showToast('PDF Surat berhasil diunduh!');
    } catch (err) {
      console.error('PDF Export Error:', err);
      showToast('Gagal memproses file PDF via renderer. Mencoba cetak...', 'error');
      handlePrintDirect();
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleSaveTemplate = async (e) => {
    if (e) e.preventDefault();
    if (!form.nama || !form.isi_template) {
      showToast('Nama dan isi template wajib diisi', 'error');
      return;
    }

    try {
      if (editingTemplate) {
        await fetch(`/api/esurat/templates/${editingTemplate.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
          body: JSON.stringify(form)
        });
        showToast('Template berhasil diperbarui!');
      } else {
        await fetch('/api/esurat/templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
          body: JSON.stringify(form)
        });
        showToast('Template baru berhasil ditambahkan!');
      }
      setShowModal(false);
      loadData();
    } catch (err) {
      showToast('Gagal menyimpan template', 'error');
    }
  };

  const handleDeleteTemplate = async (id) => {
    if (typeof window !== 'undefined' && window.confirm) {
      if (!window.confirm('Apakah Anda yakin ingin menghapus template ini?')) return;
    }
    try {
      await fetch(`/api/esurat/templates/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${authToken}` }
      });
      showToast('Template berhasil dihapus!');
      loadData();
    } catch (e) {
      showToast('Gagal menghapus template', 'error');
    }
  };

  return (
    <div className="space-y-4 sm:space-y-5 animate-in fade-in duration-300 pb-10">
      {/* Clean Page Header */}
      <PageHeader
        icon={FileSignature}
        title="Administrasi E-Surat & Template Sekolah"
        description="Generator surat otomatis sekolah, penomoran agenda, template kustom, dan cetak dokumen A4 siap edar."
      />

      {/* Unified Tab Switcher Bar */}
      <div className="bg-white p-1.5 rounded-[var(--ui-radius-card)] border border-slate-200/80 shadow-[var(--ui-shadow-card)] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center p-1 bg-[var(--ui-surface-muted)] rounded-[var(--ui-radius-control)] border border-[var(--ui-border-muted)] w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setActiveTab('cetak')}
            className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-[var(--ui-radius-small)] text-xs font-black transition-all cursor-pointer border-none flex items-center justify-center gap-1.5 ${
              activeTab === 'cetak'
                ? 'bg-white text-slate-800 shadow-2xs'
                : 'bg-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Printer size={14} />
            <span>Cetak & Studio E-Surat</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('template')}
            className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-[var(--ui-radius-small)] text-xs font-black transition-all cursor-pointer border-none flex items-center justify-center gap-1.5 ${
              activeTab === 'template'
                ? 'bg-white text-slate-800 shadow-2xs'
                : 'bg-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText size={14} />
            <span>Kelola Template Surat ({templates.length})</span>
          </button>
        </div>

        {activeTab === 'template' && !readOnly && (
          <Button 
            variant="primary" 
            size="sm"
            onClick={() => { setEditingTemplate(null); setForm({ jenis: 'sp1', nama: '', isi_template: '' }); setShowModal(true); }} 
            className="flex items-center gap-1.5 font-bold shadow-[var(--ui-shadow-control)] w-full sm:w-auto justify-center"
          >
            <Plus size={14} strokeWidth={2.5} />
            <span>+ Buat Template Baru</span>
          </Button>
        )}
      </div>

      {/* 4 Responsive Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        <div className="bg-white rounded-[var(--ui-radius-card)] p-3 sm:p-4 border border-slate-200/80 shadow-[var(--ui-shadow-card)] flex items-center gap-3">
          <div className="w-10 h-10 rounded-[var(--ui-radius-control)] bg-[var(--ui-primary)]/10 text-[var(--ui-primary)] flex items-center justify-center shrink-0">
            <FileText size={20} strokeWidth={2.2} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-black text-slate-800 leading-tight">{templates.length} Format</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Template Aktif</p>
          </div>
        </div>

        <div className="bg-white rounded-[var(--ui-radius-card)] p-3 sm:p-4 border border-slate-200/80 shadow-[var(--ui-shadow-card)] flex items-center gap-3">
          <div className="w-10 h-10 rounded-[var(--ui-radius-control)] bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <User size={20} strokeWidth={2.2} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-black text-slate-800 leading-tight truncate">
              {selectedStudent ? (selectedStudent.namaSiswa || selectedStudent.name || selectedStudent.nama) : 'Pilih Siswa'}
            </p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5 truncate">
              {selectedStudent ? `${selectedStudent.nis} • ${selectedStudent.class_name || selectedStudent.kelas}` : 'Penerima Surat'}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-[var(--ui-radius-card)] p-3 sm:p-4 border border-slate-200/80 shadow-[var(--ui-shadow-card)] flex items-center gap-3">
          <div className="w-10 h-10 rounded-[var(--ui-radius-control)] bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <Bookmark size={20} strokeWidth={2.2} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-black text-slate-800 leading-tight truncate">
              {selectedTemplate ? selectedTemplate.nama : 'Pilih Format'}
            </p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Format Surat Aktif</p>
          </div>
        </div>

        <div className="bg-white rounded-[var(--ui-radius-card)] p-3 sm:p-4 border border-slate-200/80 shadow-[var(--ui-shadow-card)] flex items-center gap-3">
          <div className="w-10 h-10 rounded-[var(--ui-radius-control)] bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Building2 size={20} strokeWidth={2.2} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-black text-slate-800 leading-tight truncate">
              {appSettings?.useKopSuratGambar ? 'Gambar Banner Kop' : 'Header Resmi Teks'}
            </p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
              Margin: Samping {liveMargins.kopMarginSide}mm
            </p>
          </div>
        </div>
      </div>

      {/* ─── TAB 1: CETAK & STUDIO E-SURAT ───────────────────────────────────── */}
      {activeTab === 'cetak' && (
        <div className="space-y-4">
          {/* Mobile Switcher between Form & Preview */}
          <div className="xl:hidden flex items-center p-1 bg-[var(--ui-surface-muted)] rounded-[var(--ui-radius-control)] border border-[var(--ui-border-muted)]">
            <button
              type="button"
              onClick={() => setMobileStudioTab('form')}
              className={`flex-1 py-1.5 rounded-[var(--ui-radius-small)] text-xs font-black transition-all ${
                mobileStudioTab === 'form' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'
              }`}
            >
              📝 Form & Pengaturan
            </button>
            <button
              type="button"
              onClick={() => setMobileStudioTab('preview')}
              className={`flex-1 py-1.5 rounded-[var(--ui-radius-small)] text-xs font-black transition-all ${
                mobileStudioTab === 'preview' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'
              }`}
            >
              👁️ Pratinjau Dokumen A4
            </button>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
            
            {/* Left Panel: Configuration Studio (5 cols) */}
            <div className={`xl:col-span-5 space-y-4 ${mobileStudioTab === 'preview' ? 'hidden xl:block' : 'block'}`}>
              
              {/* LIVE MARGIN & KOP CONTROLS ACCORDION */}
              <div className="bg-white border-2 border-[var(--ui-primary)]/40 rounded-[var(--ui-radius-card)] p-4 shadow-[var(--ui-shadow-card)] space-y-3 bg-gradient-to-br from-white to-[var(--ui-primary)]/5">
                <div 
                  className="flex items-center justify-between cursor-pointer select-none"
                  onClick={() => setShowMarginSettings(!showMarginSettings)}
                >
                  <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <SlidersHorizontal size={15} className="text-[var(--ui-primary)]" />
                    Atur Margin & Penempatan Kop Langsung
                  </span>
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <span className="text-[10px] font-bold">Realtime</span>
                    {showMarginSettings ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                </div>

                {showMarginSettings && (
                  <div className="space-y-3 pt-2 border-t border-slate-200/80 animate-in fade-in duration-150">
                    {/* Side Margins */}
                    <div>
                      <div className="flex justify-between items-center text-xs font-bold mb-1">
                        <span className="text-slate-700">Margin Samping Kiri & Kanan</span>
                        <span className="px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-800 font-mono text-[11px]">
                          {liveMargins.kopMarginSide} mm
                        </span>
                      </div>
                      <input 
                        type="range" 
                        min="0" 
                        max="35" 
                        value={liveMargins.kopMarginSide} 
                        onChange={e => setLiveMargins({ ...liveMargins, kopMarginSide: Number(e.target.value) })}
                        className="w-full accent-[var(--ui-primary)] cursor-pointer"
                      />
                      <div className="flex justify-between text-[9px] text-slate-400 font-bold px-0.5">
                        <span>0mm (Mepet Tepi)</span>
                        <span>15mm (Standar)</span>
                        <span>35mm (Lebar)</span>
                      </div>
                    </div>

                    {/* Top Margin */}
                    <div>
                      <div className="flex justify-between items-center text-xs font-bold mb-1">
                        <span className="text-slate-700">Margin Atas Kertas</span>
                        <span className="px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-800 font-mono text-[11px]">
                          {liveMargins.kopMarginTop} mm
                        </span>
                      </div>
                      <input 
                        type="range" 
                        min="0" 
                        max="40" 
                        value={liveMargins.kopMarginTop} 
                        onChange={e => setLiveMargins({ ...liveMargins, kopMarginTop: Number(e.target.value) })}
                        className="w-full accent-[var(--ui-primary)] cursor-pointer"
                      />
                    </div>

                    {/* Banner Height */}
                    {appSettings?.useKopSuratGambar && (
                      <div>
                        <div className="flex justify-between items-center text-xs font-bold mb-1">
                          <span className="text-slate-700">Tinggi Banner Kop</span>
                          <span className="px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-800 font-mono text-[11px]">
                            {liveMargins.kopBannerHeight} px
                          </span>
                        </div>
                        <input 
                          type="range" 
                          min="50" 
                          max="250" 
                          value={liveMargins.kopBannerHeight} 
                          onChange={e => setLiveMargins({ ...liveMargins, kopBannerHeight: Number(e.target.value) })}
                          className="w-full accent-[var(--ui-primary)] cursor-pointer"
                        />
                      </div>
                    )}

                    {/* Full Width Banner Toggle */}
                    {appSettings?.useKopSuratGambar && (
                      <div className="flex items-center justify-between p-2 rounded bg-white border border-slate-200">
                        <span className="text-xs font-bold text-slate-700">Bentangkan Banner Penuh (Edge-to-Edge)</span>
                        <input 
                          type="checkbox"
                          checked={liveMargins.kopBannerFullWidth}
                          onChange={e => setLiveMargins({ ...liveMargins, kopBannerFullWidth: e.target.checked })}
                          className="w-4 h-4 rounded text-[var(--ui-primary)] cursor-pointer"
                        />
                      </div>
                    )}

                    {/* Spacing between kop and body */}
                    <div>
                      <div className="flex justify-between items-center text-xs font-bold mb-1">
                        <span className="text-slate-700">Jarak Rongga Kop ke Isi Surat</span>
                        <span className="px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-800 font-mono text-[11px]">
                          {liveMargins.kopSpacing} px
                        </span>
                      </div>
                      <input 
                        type="range" 
                        min="0" 
                        max="50" 
                        value={liveMargins.kopSpacing} 
                        onChange={e => setLiveMargins({ ...liveMargins, kopSpacing: Number(e.target.value) })}
                        className="w-full accent-[var(--ui-primary)] cursor-pointer"
                      />
                    </div>

                    <div className="pt-2 flex justify-end">
                      <Button
                        variant="primary"
                        size="sm"
                        type="button"
                        onClick={handleSaveLiveMargins}
                        disabled={isSavingMargins}
                        className="w-full flex items-center justify-center gap-1.5 text-xs font-bold py-1.5 shadow-sm"
                      >
                        {isSavingMargins ? <RefreshCw size={13} className="animate-spin" /> : <Save size={13} />}
                        <span>Simpan Margin Permanen</span>
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Step 1: Template Selection */}
              <div className="bg-white border border-slate-200/80 rounded-[var(--ui-radius-card)] p-4 sm:p-5 shadow-[var(--ui-shadow-card)] space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-[var(--ui-primary)] text-white text-[10px] flex items-center justify-center font-bold">1</span>
                    Pilih Template Surat
                  </span>
                  <span className="text-[10px] font-bold text-slate-400">{templates.length} Format</span>
                </div>

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
                            ? 'bg-[var(--ui-primary)]/10 border-[var(--ui-primary)] text-[var(--ui-primary)] ring-2 ring-[var(--ui-primary)]/20 shadow-2xs' 
                            : 'bg-slate-50/70 border-slate-200/80 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <span className="text-[9.5px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/90 border border-slate-200 shrink-0 text-slate-700">
                            {jenisObj?.label || t.jenis}
                          </span>
                          <p className="font-extrabold text-xs text-slate-800 mt-1 truncate">{t.nama}</p>
                        </div>
                        {isSelected && <CheckCircle2 size={16} className="text-[var(--ui-primary)] shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Step 2: Target Student Selector */}
              <div className="bg-white border border-slate-200/80 rounded-[var(--ui-radius-card)] p-4 sm:p-5 shadow-[var(--ui-shadow-card)] space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-[var(--ui-primary)] text-white text-[10px] flex items-center justify-center font-bold">2</span>
                    Pilih Siswa Penerima
                  </span>
                  {selectedStudent && (
                    <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-[var(--ui-radius-pill)] border border-emerald-200">
                      Siswa Terpilih
                    </span>
                  )}
                </div>

                {/* Filters */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Cari NIS atau Nama..."
                      value={studentSearch}
                      onChange={e => setStudentSearch(e.target.value)}
                      className="w-full pl-8 pr-2.5 py-1.5 bg-[var(--ui-surface-muted)] hover:bg-white border border-[var(--ui-border-soft)] rounded-[var(--ui-radius-control)] text-xs font-bold focus:bg-white focus:outline-none focus:border-[var(--ui-primary)] transition-all"
                    />
                  </div>
                  <div>
                    <CustomSelect
                      value={selectedClass}
                      onChange={val => setSelectedClass(val)}
                      options={[
                        { value: 'all', label: 'Semua Kelas' },
                        ...uniqueClasses.map(c => ({ value: c, label: `Kelas ${c}` }))
                      ]}
                      searchable={true}
                      placeholder="Semua Kelas"
                    />
                  </div>
                </div>

                {/* Student Selectable List */}
                <div className="space-y-1.5 max-h-[190px] overflow-y-auto pr-1 divide-y divide-slate-100">
                  {filteredStudents.map(s => {
                    const isSelected = selectedStudent?.nis === s.nis;
                    const name = s.namaSiswa || s.name || s.nama;
                    const cls = s.class_name || s.kelas;

                    return (
                      <div
                        key={s.nis}
                        onClick={() => setSelectedStudent(s)}
                        className={`p-2.5 rounded-[var(--ui-radius-control)] cursor-pointer flex items-center justify-between gap-2.5 transition-all ${
                          isSelected 
                            ? 'bg-emerald-50/80 border border-emerald-300 text-emerald-800 font-black shadow-2xs' 
                            : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Avatar name={name} size="xs" />
                          <div className="min-w-0">
                            <p className="text-xs font-extrabold truncate">{name}</p>
                            <p className="text-[10px] text-slate-400 font-semibold">{s.nis} • {cls}</p>
                          </div>
                        </div>
                        {isSelected && <Check size={14} className="text-emerald-600 shrink-0" />}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Step 3: Numbering & Details */}
              <div className="bg-white border border-slate-200/80 rounded-[var(--ui-radius-card)] p-4 sm:p-5 shadow-[var(--ui-shadow-card)] space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-[var(--ui-primary)] text-white text-[10px] flex items-center justify-center font-bold">3</span>
                    Penomoran & Keterangan Khusus
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="text-[9.5px] font-bold text-slate-500 uppercase block mb-1">Nomor Surat ({'{NOMOR_SURAT}'})</label>
                    <input
                      type="text"
                      value={customValues.nomorSurat}
                      onChange={e => setCustomValues({ ...customValues, nomorSurat: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-[var(--ui-radius-control)] border border-[var(--ui-border-soft)] font-mono text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[9.5px] font-bold text-slate-500 uppercase block mb-1">Tanggal Surat ({'{TANGGAL}'})</label>
                    <input
                      type="text"
                      value={customValues.tanggalSurat}
                      onChange={e => setCustomValues({ ...customValues, tanggalSurat: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-[var(--ui-radius-control)] border border-[var(--ui-border-soft)] font-bold text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[9.5px] font-bold text-slate-500 uppercase block mb-1">Keterangan Tambahan / Alasan ({'{KETERANGAN}'})</label>
                  <textarea
                    rows={2}
                    value={customValues.keterangan}
                    onChange={e => setCustomValues({ ...customValues, keterangan: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-[var(--ui-radius-control)] border border-[var(--ui-border-soft)] text-xs font-medium resize-none"
                    placeholder="Keperluan Administrasi Sekolah..."
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <Button
                  variant="outline"
                  type="button"
                  onClick={handleExportPDF}
                  disabled={isExportingPdf}
                  className="w-full flex items-center justify-center gap-1.5 font-bold text-xs py-2.5"
                >
                  <Download size={14} />
                  <span>{isExportingPdf ? 'Mengekspor...' : 'Download PDF A4'}</span>
                </Button>

                <Button
                  variant="primary"
                  type="button"
                  onClick={handlePrintDirect}
                  className="w-full flex items-center justify-center gap-1.5 font-bold text-xs py-2.5 shadow-[var(--ui-shadow-control)]"
                >
                  <Printer size={14} />
                  <span>Cetak Langsung</span>
                </Button>
              </div>

            </div>

            {/* Right Panel: Live A4 Document Preview (7 cols) */}
            <div className={`xl:col-span-7 ${mobileStudioTab === 'form' ? 'hidden xl:block' : 'block'}`}>
              <div className="bg-slate-900 rounded-[var(--ui-radius-card)] p-4 sm:p-6 shadow-xl relative overflow-hidden">
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800 text-xs">
                  <span className="font-extrabold text-amber-400 flex items-center gap-1.5">
                    <Sparkles size={14} /> Pratinjau Kertas Dokumen A4 Realtime
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Margin: {liveMargins.kopMarginSide}mm | Top: {liveMargins.kopMarginTop}mm
                  </span>
                </div>

                <div className="overflow-x-auto pb-4">
                  <PrintPreviewPaper
                    template={selectedTemplate}
                    student={selectedStudent}
                    school={school}
                    appSettings={appSettings}
                    customValues={customValues}
                    liveMargins={liveMargins}
                    paperRef={paperRef}
                  />
                </div>

                <div className="flex items-center justify-between pt-3 mt-2 border-t border-slate-800 text-[10px] text-slate-400">
                  <span>*Variabel dinamis otomatis diganti berdasarkan data siswa & sekolah.</span>
                  <span className="text-emerald-400 font-bold">Siap Dicetak</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ─── TAB 2: KELOLA TEMPLATE SURAT ────────────────────────────────────── */}
      {activeTab === 'template' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {templates.map(t => {
              const jenisObj = JENIS_SURAT.find(j => j.key === t.jenis);
              return (
                <div key={t.id} className="bg-white rounded-[var(--ui-radius-card)] p-4 sm:p-5 border border-slate-200/80 shadow-[var(--ui-shadow-card)] flex flex-col justify-between gap-4">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-[var(--ui-radius-pill)] bg-indigo-50 text-indigo-700 border border-indigo-200">
                        {jenisObj?.label || t.jenis}
                      </span>
                    </div>
                    <h4 className="font-black text-sm text-slate-800 leading-snug">{t.nama}</h4>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-3 leading-relaxed font-mono text-[11px] bg-slate-50 p-2.5 rounded border border-slate-100 mt-2">
                      {t.isi_template}
                    </p>
                  </div>

                  {!readOnly && (
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingTemplate(t);
                          setForm({ jenis: t.jenis, nama: t.nama, isi_template: t.isi_template });
                          setShowModal(true);
                        }}
                        className="px-2.5 py-1 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-[var(--ui-radius-control)] flex items-center gap-1 cursor-pointer"
                      >
                        <Edit2 size={13} /> Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteTemplate(t.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded bg-slate-100 hover:bg-rose-50 border border-slate-200 cursor-pointer"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal CRUD Template */}
      {showModal && (
        <Modal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title={editingTemplate ? "Edit Template Surat" : "Buat Template Surat Baru"}
          maxWidth="max-w-2xl"
        >
          <form onSubmit={handleSaveTemplate} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Kategori Jenis Surat</label>
                <CustomSelect
                  value={form.jenis}
                  onChange={val => setForm(prev => ({ ...prev, jenis: val }))}
                  options={JENIS_SURAT.map(j => ({ value: j.key, label: j.label }))}
                  searchable={false}
                  placeholder="Pilih Kategori Surat"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Nama Judul Template</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Surat Panggilan Wali Murid..."
                  value={form.nama}
                  onChange={e => setForm({ ...form, nama: e.target.value })}
                  className="w-full h-9 px-2.5 rounded-[var(--ui-radius-control)] border border-[var(--ui-border-soft)] font-bold text-xs"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Isi Teks Surat (Termasuk Placeholder)</label>
                <span className="text-[10px] text-slate-400">Gunakan tag kurung kurawal</span>
              </div>
              <textarea
                required
                rows={10}
                value={form.isi_template}
                onChange={e => setForm({ ...form, isi_template: e.target.value })}
                className="w-full p-3 font-mono text-xs leading-relaxed rounded-[var(--ui-radius-control)] border border-[var(--ui-border-soft)]"
              />
            </div>

            {/* Variable Tags reference */}
            <div className="p-3 bg-slate-50 rounded border border-slate-200">
              <span className="text-[10px] font-black uppercase text-slate-500 block mb-1.5">Tag Variabel yang Tersedia:</span>
              <div className="flex flex-wrap gap-1.5">
                {PLACEHOLDER_VARIABLES.map(v => (
                  <button
                    key={v.var}
                    type="button"
                    onClick={() => setForm({ ...form, isi_template: form.isi_template + ' ' + v.var })}
                    className="px-1.5 py-0.5 rounded bg-white border border-slate-200 font-mono text-[10px] font-bold text-indigo-700 hover:bg-indigo-50 cursor-pointer"
                    title={v.desc}
                  >
                    {v.var}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <Button variant="outline" size="sm" type="button" onClick={() => setShowModal(false)}>
                Batal
              </Button>
              <Button variant="primary" size="sm" type="submit">
                Simpan Template
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Floating Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-[var(--ui-radius-control)] shadow-[var(--ui-shadow-modal)] font-bold text-xs flex items-center gap-2 animate-in slide-in-from-bottom-5 text-white z-[100] ${
          toast.type === 'error' ? 'bg-rose-600' : 'bg-emerald-600'
        }`}>
          {toast.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />} 
          <span>{toast.message}</span>
        </div>
      )}

      {/* Print Media Query CSS */}
      <style>{`
        @media print {
          body, html {
            background: #ffffff !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 210mm !important;
          }
          body * {
            visibility: hidden !important;
          }
          .print-paper-canvas, .print-paper-canvas * {
            visibility: visible !important;
          }
          .print-paper-canvas {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 210mm !important;
            min-height: 297mm !important;
            margin: 0 !important;
            box-shadow: none !important;
            border: none !important;
            background: #ffffff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>
    </div>
  );
}
