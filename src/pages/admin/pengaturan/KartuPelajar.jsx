import { useState, useEffect, useMemo, useRef } from 'react';
import { 
  CreditCard, 
  Printer, 
  Download, 
  Search, 
  Plus, 
  Eye, 
  Edit2, 
  X, 
  AlertCircle, 
  CheckCircle2, 
  User, 
  QrCode, 
  Sparkles, 
  Palette, 
  FileText, 
  Check, 
  RefreshCw, 
  Filter, 
  Clock, 
  RotateCcw,
  Sliders,
  Layers,
  Upload,
  Trash2,
  Calendar,
  Save,
  CheckSquare,
  FileSpreadsheet,
  UploadCloud
} from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';
import useAuthStore from '../../../store/monitoring/authStore.js';
import { useAppStore } from '../../../store/useAppStore.js';
import { useDataStore } from '../../../store/useDataStore.js';
import { compressImage } from '../../../utils/imageUtils.js';
import { PageHeader } from '../../../components/monitoring/ui/index.js';
import { Button, UISelect, Modal } from '../../../components/ui.jsx';

const DEFAULT_CARD_CONFIG = {
  bg_color: '#064e3b',
  text_color: '#0f172a',
  accent_color: '#a3e635',
  header_text: 'KARTU TANDA PELAJAR',
  auto_abbreviate_name: true,
  max_name_length: 22,
  show_photo: true,
  show_barcode: true,
  show_nisn: true,
  show_kelas: true,
  show_jurusan: true,
  show_tahun: true,
  front_template: '',
  back_template: '',
};

const PRESET_THEMES = [
  { id: 'emerald', label: 'Emerald School', bg_color: '#064e3b', text_color: '#0f172a', accent_color: '#10b981' },
  { id: 'navy', label: 'Classic Navy', bg_color: '#1e3a8a', text_color: '#0f172a', accent_color: '#3b82f6' },
  { id: 'gold', label: 'Crimson Gold', bg_color: '#881337', text_color: '#0f172a', accent_color: '#f59e0b' },
  { id: 'dark', label: 'Slate Corporate', bg_color: '#0f172a', text_color: '#ffffff', accent_color: '#64748b' },
];

const MAJOR_EXPANSION_MAP = {
  'TKJ': 'Teknik Komputer dan Jaringan',
  'TJKT': 'Teknik Jaringan Komputer dan Telekomunikasi',
  'RPL': 'Rekayasa Perangkat Lunak',
  'PPLG': 'Pengembangan Perangkat Lunak dan Gim',
  'TKR': 'Teknik Kendaraan Ringan',
  'TKRO': 'Teknik Kendaraan Ringan Otomotif',
  'TSM': 'Teknik Sepeda Motor',
  'TBSM': 'Teknik dan Bisnis Sepeda Motor',
  'AK': 'Akuntansi dan Keuangan Lembaga',
  'AKL': 'Akuntansi dan Keuangan Lembaga',
  'MP': 'Manajemen Perkantoran',
  'MPLB': 'Manajemen Perkantoran dan Layanan Bisnis',
  'OTKP': 'Otomatisasi dan Tata Kelola Perkantoran',
  'DKV': 'Desain Komunikasi Visual',
  'MM': 'Multimedia',
  'TITL': 'Teknik Instalasi Tenaga Listrik',
  'TP': 'Teknik Pemesinan',
  'TFLM': 'Teknik Fabrikasi Logam dan Manufaktur',
  'TAV': 'Teknik Audio Video',
  'EI': 'Elektronika Industri',
  'TB': 'Tata Boga',
  'ULP': 'Usaha Layanan Pariwisata',
  'PH': 'Perhotelan',
  'BS': 'Busana',
  'TBG': 'Tata Busana',
  'KUL': 'Kuliner'
};

export const expandMajorName = (rawMajor) => {
  if (!rawMajor || typeof rawMajor !== 'string') return 'Umum';
  const trimmed = rawMajor.trim();
  if (!trimmed) return 'Umum';

  const upper = trimmed.toUpperCase();
  if (MAJOR_EXPANSION_MAP[upper]) {
    return MAJOR_EXPANSION_MAP[upper];
  }

  for (const [code, fullName] of Object.entries(MAJOR_EXPANSION_MAP)) {
    if (upper === code || upper.startsWith(code + ' ') || upper.endsWith(' ' + code)) {
      return fullName;
    }
  }

  return trimmed;
};

export const formatAbbreviatedName = (rawName, maxLength = 22) => {
  if (!rawName || typeof rawName !== 'string') return '';
  const trimmed = rawName.trim();
  if (!trimmed) return '';

  if (trimmed.length <= maxLength) return trimmed;

  const words = trimmed.split(/\s+/);
  if (words.length <= 1) return trimmed;

  const resultWords = [...words];

  for (let i = resultWords.length - 1; i >= 1; i--) {
    const currentWord = resultWords[i];
    if (currentWord.length > 2 || !currentWord.endsWith('.')) {
      const initial = currentWord[0].toUpperCase() + '.';
      resultWords[i] = initial;
      const joined = resultWords.join(' ');
      if (joined.length <= maxLength) {
        return joined;
      }
    }
  }

  return resultWords.join(' ');
};

const formatIndonesianDate = (dateString) => {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return dateString;
  }
};

// ─── Student Card Render Component ──────────────────────────────────────────
function StudentCard({ student, school, config, cardRef, side = 'both' }) {
  const frontBg = config.front_template || '';
  const backBg = config.back_template || '';
  const [qrCode, setQrCode] = useState("");
  const appClassesRaw = useAppStore(state => state.classes);
  const appClasses = appClassesRaw || [];

  const getStudentMajor = (s) => {
    if (!s) return 'Umum';
    let raw = '';
    
    if (s.major && String(s.major).trim()) raw = s.major;
    else if (s.jurusan && String(s.jurusan).trim()) raw = s.jurusan;

    if (!raw) {
      const storeStudents = useDataStore.getState().students || [];
      const foundStore = storeStudents.find(item => (s.nis && item.nis === s.nis) || (s.id && item.id === s.id));
      if (foundStore) {
        if (foundStore.major && String(foundStore.major).trim()) raw = foundStore.major;
        else if (foundStore.jurusan && String(foundStore.jurusan).trim()) raw = foundStore.jurusan;
      }
    }

    if (!raw) {
      const className = s.class_name || s.kelas;
      if (className) {
        const cls = appClasses.find(c => String(c.name).toLowerCase() === String(className).toLowerCase());
        if (cls && cls.major) raw = cls.major;
        else {
          const parts = String(className).trim().split(/\s+/);
          if (parts.length >= 2) {
            const candidate = parts[1];
            if (candidate && candidate.length >= 2 && !['KBM', 'AK', 'SEKOLAH', 'ISLAM'].includes(candidate.toUpperCase())) {
              raw = candidate;
            }
          }
        }
      }
    }
    return expandMajorName(raw || 'Umum');
  };

  useEffect(() => {
    if (!student) return;
    if (config.show_barcode) {
      import("qrcode").then((QRCode) => {
        const origin = window.location.origin;
        const qrData = `${origin}/validasi-siswa?nis=${student.nis}&nama=${encodeURIComponent(student.name || student.namaSiswa || '')}`;
        QRCode.default.toDataURL(qrData, { margin: 1, width: 200 }).then(setQrCode).catch(console.error);
      }).catch(console.error);
    }
  }, [student, config.show_barcode]);

  const renderFront = (
    <div 
      className="w-[320px] h-[200px] rounded-[var(--ui-radius-card)] shadow-md relative overflow-hidden shrink-0 border border-slate-200/80 transition-all select-none font-inherit"
      style={{ 
        backgroundImage: frontBg ? `url(${frontBg})` : 'none', 
        backgroundSize: 'cover', 
        backgroundPosition: 'center',
        backgroundColor: frontBg ? 'transparent' : (config.bg_color || 'var(--ui-primary, #064e3b)') 
      }}
    >
      {!frontBg && (
        <div className="absolute inset-0 flex items-center justify-center text-[10px] font-extrabold text-white/40 z-0">
          Belum ada gambar background depan
        </div>
      )}
      
      {/* Photo Box (Top Left) */}
      {config.show_photo && (
        <div className="absolute top-[35%] left-[11%] w-[14%] h-[35%] overflow-hidden z-10 flex items-center justify-center bg-white shadow-xs rounded-[var(--ui-radius-small)] p-0.5 border border-slate-200">
          {student?.photo ? (
            <img src={student.photo} alt="Foto" className="w-full h-full object-cover rounded-[var(--ui-radius-small)]" />
          ) : (
            <User size={28} className="w-full h-full text-slate-300" />
          )}
        </div>
      )}

      {/* Data Box (Top Right) */}
      <div 
        className="absolute top-[35%] left-[30%] w-[58%] h-[40%] z-10 flex flex-col justify-start pt-0.5 gap-[1.5px] pl-1" 
        style={{ color: config.text_color || '#000000' }}
      >
        <p className="text-[8px] font-bold leading-tight">NIS: {student?.nis || '000'}</p>
        <p 
          className="text-[10px] font-black uppercase leading-tight truncate mt-0.5 mb-0.5" 
          title={student?.name || student?.namaSiswa}
        >
          {config.auto_abbreviate_name !== false
            ? formatAbbreviatedName(student?.name || student?.namaSiswa || 'NAMA SISWA', config.max_name_length || 22)
            : (student?.name || student?.namaSiswa || 'NAMA SISWA')}
        </p>
        <p className="text-[8px] font-bold leading-tight">TTL: {student?.ttl || '-'}</p>
        <p className="text-[8px] font-bold leading-tight truncate">Jurusan: {getStudentMajor(student)}</p>
        
        <div className="absolute bottom-0.5 left-1">
          <p className="text-[5px] italic font-semibold opacity-75">
            *Berlaku selama menjadi siswa {school?.name || 'Sekolah'}
          </p>
        </div>
      </div>

      {/* QR & Kepsek Box (Bottom Right) */}
      <div className="absolute bottom-[4%] right-[4%] w-[24%] flex flex-col items-center justify-end z-10" style={{ color: config.text_color || '#000000' }}>
        <p className="text-[5px] mb-0.5 opacity-80">
          {new Date(student?.updated_at || student?.created_at || new Date()).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
        </p>
        {config.show_barcode && (
          <div className="w-[50%] aspect-square flex items-center justify-center bg-white/70 rounded-[var(--ui-radius-small)] p-0.5 shadow-2xs">
            {qrCode ? (
              <img src={qrCode} alt="QR TTD" className="w-full h-full object-contain mix-blend-multiply" />
            ) : (
              <QrCode size={12} className="text-slate-400" />
            )}
          </div>
        )}
        <p className="text-[6px] font-bold leading-tight text-center mt-0.5 border-b border-black/20 pb-0.5">
          {school?.kepala_sekolah || 'Kepala Sekolah'}
        </p>
      </div>
    </div>
  );

  const renderBack = (
    <div 
      className="w-[320px] h-[200px] rounded-[var(--ui-radius-card)] shadow-md relative overflow-hidden shrink-0 border border-slate-200/80 transition-all select-none font-inherit"
      style={{ 
        backgroundImage: backBg ? `url(${backBg})` : 'none', 
        backgroundSize: 'cover', 
        backgroundPosition: 'center',
        backgroundColor: backBg ? 'transparent' : (config.bg_color || 'var(--ui-primary, #064e3b)') 
      }}
    >
      {!backBg && (
        <div className="absolute inset-0 flex items-center justify-center text-[10px] font-extrabold text-white/40 z-0">
          Belum ada gambar background belakang
        </div>
      )}
    </div>
  );

  return (
    <div ref={cardRef} className="student-card-wrapper flex flex-wrap gap-4 items-start justify-center">
      {(side === 'both' || side === 'front') && renderFront}
      {(side === 'both' || side === 'back') && renderBack}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function KartuPelajar({ students: propStudents = [] }) {
  const [students, setStudents] = useState(propStudents);
  const [school, setSchool] = useState({});
  const [config, setConfig] = useState(DEFAULT_CARD_CONFIG);
  const [templateId, setTemplateId] = useState(null);

  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState('all');
  const [selectedMajor, setSelectedMajor] = useState('all');
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [previewStudent, setPreviewStudent] = useState(null);
  const [previewSide, setPreviewSide] = useState('front');
  
  const [editForm, setEditForm] = useState(null);
  const [activeTab, setActiveTab] = useState('cetak');
  const [toast, setToast] = useState(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const authToken = useAuthStore(state => state.user?.authToken);

  const [requests, setRequests] = useState([]);
  const [requestStats, setRequestStats] = useState({});
  const [showRequestModal, setShowRequestModal] = useState(null);
  const [requestReason, setRequestReason] = useState('Kartu Hilang');

  // ─── Mass Update TTL Modal State ───
  const [showMassTtlModal, setShowMassTtlModal] = useState(false);
  const [massTtlMode, setMassTtlMode] = useState('serentak');
  const [massPlace, setMassPlace] = useState('Bekasi');
  const [massDate, setMassDate] = useState('');
  const [massCustomTTL, setMassCustomTTL] = useState('');
  const [massStudentItems, setMassStudentItems] = useState([]);
  const [isSavingMassTTL, setIsSavingMassTTL] = useState(false);

  // ─── Excel / CSV Mass Import Modal State ───
  const [showExcelModal, setShowExcelModal] = useState(false);
  const [excelParsedRows, setExcelParsedRows] = useState([]);
  const [excelFileName, setExcelFileName] = useState('');
  const [isSavingExcel, setIsSavingExcel] = useState(false);

  // ─── Temporary In-Memory Student Photos State (Not saved to DB) ───
  const [tempPhotos, setTempPhotos] = useState({});

  const cleanStudentsForServer = (studentsList) => {
    if (!Array.isArray(studentsList)) return [];
    return studentsList.map(s => {
      const copy = { ...s };
      delete copy.photo;
      delete copy.foto;
      return copy;
    });
  };

  const appClassesRaw = useAppStore(state => state.classes);
  const appClasses = appClassesRaw || [];

  const getStudentMajor = (s) => {
    if (!s) return 'Umum';
    let raw = '';
    if (s.major && String(s.major).trim()) raw = s.major;
    else if (s.jurusan && String(s.jurusan).trim()) raw = s.jurusan;

    if (!raw) {
      const storeStudents = useDataStore.getState().students || [];
      const foundStore = storeStudents.find(item => (s.nis && item.nis === s.nis) || (s.id && item.id === s.id));
      if (foundStore) {
        if (foundStore.major && String(foundStore.major).trim()) raw = foundStore.major;
        else if (foundStore.jurusan && String(foundStore.jurusan).trim()) raw = foundStore.jurusan;
      }
    }

    if (!raw) {
      const className = s.class_name || s.kelas;
      if (className) {
        const cls = appClasses.find(c => String(c.name).toLowerCase() === String(className).toLowerCase());
        if (cls && cls.major) raw = cls.major;
        else {
          const parts = String(className).trim().split(/\s+/);
          if (parts.length >= 2) {
            const candidate = parts[1];
            if (candidate && candidate.length >= 2 && !['KBM', 'AK', 'SEKOLAH', 'ISLAM'].includes(candidate.toUpperCase())) {
              raw = candidate;
            }
          }
        }
      }
    }
    return expandMajorName(raw || 'Umum');
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!authToken) return;
      
      let fetchedSchool = {};
      let fetchedStudents = propStudents || [];

      setIsLoading(true);
      try {
        const [studRes, schoolRes, templateRes] = await Promise.all([
          (!propStudents || propStudents.length === 0) 
            ? fetch('/api/data/load', { headers: { Authorization: `Bearer ${authToken}` } }) 
            : Promise.resolve(null),
          fetch('/api/school-profile', { headers: { Authorization: `Bearer ${authToken}` } }),
          fetch('/api/student-cards', { headers: { Authorization: `Bearer ${authToken}` } })
        ]);

        if (studRes) {
          const studData = await studRes.json();
          if (studData.payload && studData.payload.students) fetchedStudents = studData.payload.students;
        }
        
        if (schoolRes) {
          const schoolData = await schoolRes.json();
          if (schoolData.ok) fetchedSchool = schoolData.data || {};
        }

        if (templateRes) {
          const templateData = await templateRes.json();
          if (templateData.ok && templateData.data && templateData.data.length > 0) {
            const defaultTemplate = templateData.data[0];
            setTemplateId(defaultTemplate.id);
            if (defaultTemplate.config) {
              setConfig(prev => ({ ...prev, ...defaultTemplate.config }));
            }
          }
        }
      } catch (e) { 
        console.error(e); 
      }
      
      setStudents(fetchedStudents);
      setSchool(fetchedSchool);
      setIsLoading(false);
    };
    fetchData();
  }, [authToken, propStudents]);

  const fetchRequests = async () => {
    if (!authToken) return;
    try {
      const res = await fetch('/api/student-card-requests', { headers: { Authorization: `Bearer ${authToken}` } });
      const data = await res.json();
      if (data.ok) {
        setRequests(data.data || []);
        const statsLookup = {};
        (data.stats || []).forEach(s => {
          statsLookup[s.nis] = parseInt(s.count || 0);
        });
        setRequestStats(statsLookup);
      }
    } catch (e) { 
      console.error(e); 
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [authToken]);

  const logPrintAction = async (student) => {
    try {
      await fetch('/api/student-card-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({
          action: 'create',
          nis: student.nis,
          nama: student.namaSiswa || student.name,
          kelas: student.class_name || 'Umum',
          alasan: 'Cetak/Download Langsung (Tanpa Antrean)'
        })
      });

      const listRes = await fetch('/api/student-card-requests', { headers: { Authorization: `Bearer ${authToken}` } });
      const listData = await listRes.json();
      if (listData.ok) {
        const pending = listData.data.find(r => r.nis === student.nis && r.status === 'pending');
        if (pending) {
          await fetch('/api/student-card-requests', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
            body: JSON.stringify({ action: 'selesai', id: pending.id })
          });
        }
      }
      fetchRequests();
    } catch (e) { 
      console.error(e); 
    }
  };

  const classes = useMemo(() => ['all', ...new Set(students.map(s => s.class_name).filter(Boolean).sort())], [students]);
  
  const majors = useMemo(() => {
    const list = new Set();
    (appClasses || []).forEach(c => { if (c.major) list.add(expandMajorName(c.major)); });
    (useDataStore.getState().students || []).forEach(s => { 
      if (s.major) list.add(expandMajorName(s.major)); 
      if (s.jurusan) list.add(expandMajorName(s.jurusan)); 
    });
    students.forEach(s => {
      const m = getStudentMajor(s);
      if (m && m !== 'Umum') list.add(m);
    });
    return ['all', ...Array.from(list).sort()];
  }, [students, appClasses]);

  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const matchSearch = !searchTerm || 
        (s.namaSiswa || s.name)?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        s.nis?.includes(searchTerm);
      const matchClass = selectedClass === 'all' || s.class_name === selectedClass;
      
      const sMajor = getStudentMajor(s);
      const matchMajor = selectedMajor === 'all' || sMajor === selectedMajor;
      return matchSearch && matchClass && matchMajor;
    });
  }, [students, searchTerm, selectedClass, selectedMajor]);

  const handlePrint = () => {
    if (selectedStudents.length === 0) return showToast('Pilih minimal satu siswa untuk dicetak!', 'error');
    setIsPrinting(true);
    selectedStudents.forEach(nis => {
      const student = students.find(s => s.nis === nis);
      if (student) logPrintAction(student);
    });
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
    }, 300);
  };

  const handleDownloadPDF = () => {
    if (selectedStudents.length === 0) return showToast('Pilih minimal satu siswa untuk diunduh!', 'error');
    setIsPrinting(true);
    showToast('Menyiapkan file PDF, mohon tunggu...', 'success');
    
    setTimeout(async () => {
      try {
        const printArea = document.querySelector('.print-area');
        if (!printArea) throw new Error("Print area not found");
        
        const cards = printArea.querySelectorAll('.student-card-wrapper');
        if (cards.length === 0) throw new Error("Tidak ada kartu");
        
        const pdf = new jsPDF({
          orientation: 'landscape',
          unit: 'pt',
          format: [656, 200]
        });

        for (let i = 0; i < cards.length; i++) {
          const card = cards[i];
          const canvas = await html2canvas(card, {
            scale: 2, 
            useCORS: true,
            allowTaint: true,
            logging: false,
            backgroundColor: '#ffffff'
          });
          const imgData = canvas.toDataURL('image/jpeg', 0.95);
          
          if (i > 0) pdf.addPage([656, 200], 'l');
          pdf.addImage(imgData, 'JPEG', 0, 0, 656, 200);
        }
        
        pdf.save(`Kartu_Pelajar_${new Date().getTime()}.pdf`);
        selectedStudents.forEach(nis => {
          const student = students.find(s => s.nis === nis);
          if (student) logPrintAction(student);
        });
        showToast('PDF berhasil diunduh!');
      } catch (err) {
        console.error(err);
        showToast('Gagal memproses PDF', 'error');
      } finally {
        setIsPrinting(false);
      }
    }, 600);
  };

  const handleSaveManual = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/data/load', { headers: { Authorization: `Bearer ${authToken}` } });
      const data = await res.json();
      if (data.payload) {
        let updatedStudents = data.payload.students || [];
        const expandedMajor = expandMajorName(editForm.data.major || editForm.data.jurusan || '');
        const updatedItem = {
          ...editForm.data,
          major: expandedMajor,
          jurusan: expandedMajor
        };

        if (editForm.isNew) {
          updatedItem.created_at = new Date().toISOString();
          if (updatedStudents.find(s => s.nis === editForm.data.nis)) {
            return showToast('NIS sudah terdaftar', 'error');
          }
          updatedStudents.push(updatedItem);
        } else {
          updatedItem.updated_at = new Date().toISOString();
          updatedStudents = updatedStudents.map(s => s.nis === editForm.data.nis ? { ...s, ...updatedItem } : s);
        }
        
        data.payload.students = cleanStudentsForServer(updatedStudents);
        
        const saveRes = await fetch('/api/data/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
          body: JSON.stringify({ payload: data.payload })
        });
        
        if (saveRes.ok) {
          showToast('Data berhasil disimpan');
          setStudents(updatedStudents);
          setEditForm(null);
        } else {
          showToast('Gagal menyimpan ke server', 'error');
        }
      }
    } catch(e) {
      console.error(e);
      showToast('Terjadi kesalahan', 'error');
    }
  };

  // ─── Open Mass Update TTL Modal ───
  const handleOpenMassTtlModal = () => {
    const targetList = selectedStudents.length > 0
      ? students.filter(s => selectedStudents.includes(s.nis))
      : filteredStudents;

    if (targetList.length === 0) {
      return showToast('Tidak ada siswa yang dipilih atau ditemukan!', 'error');
    }

    setMassStudentItems(targetList.map(s => ({
      nis: s.nis,
      name: s.namaSiswa || s.name,
      class_name: s.class_name,
      ttl: s.ttl || ''
    })));

    setMassPlace('Bekasi');
    setMassDate('');
    setMassCustomTTL('');
    setShowMassTtlModal(true);
  };

  // ─── Save Mass Update TTL ───
  const handleSaveMassTTL = async () => {
    setIsSavingMassTTL(true);
    try {
      showToast('Menyimpan pembaruan TTL massal…', 'success');
      const res = await fetch('/api/data/load', { headers: { Authorization: `Bearer ${authToken}` } });
      const data = await res.json();
      
      if (data.payload) {
        let updatedStudents = data.payload.students || [];
        let updatedCount = 0;

        if (massTtlMode === 'serentak') {
          let computedTTL = massCustomTTL.trim();
          if (!computedTTL) {
            const formattedDate = massDate ? formatIndonesianDate(massDate) : '';
            computedTTL = `${massPlace || 'Bekasi'}${formattedDate ? `, ${formattedDate}` : ''}`;
          }

          const targetNisSet = new Set(massStudentItems.map(item => item.nis));
          updatedStudents = updatedStudents.map(s => {
            if (targetNisSet.has(s.nis)) {
              updatedCount++;
              return {
                ...s,
                ttl: computedTTL,
                updated_at: new Date().toISOString()
              };
            }
            return s;
          });

          setStudents(prev => prev.map(s => targetNisSet.has(s.nis) ? { ...s, ttl: computedTTL } : s));

        } else {
          const ttlMap = {};
          massStudentItems.forEach(item => {
            ttlMap[item.nis] = item.ttl;
          });

          updatedStudents = updatedStudents.map(s => {
            if (ttlMap[s.nis] !== undefined) {
              updatedCount++;
              return {
                ...s,
                ttl: ttlMap[s.nis],
                updated_at: new Date().toISOString()
              };
            }
            return s;
          });

          setStudents(prev => prev.map(s => ttlMap[s.nis] !== undefined ? { ...s, ttl: ttlMap[s.nis] } : s));
        }

        data.payload.students = cleanStudentsForServer(updatedStudents);
        
        const saveRes = await fetch('/api/data/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
          body: JSON.stringify({ payload: data.payload })
        });
        
        if (saveRes.ok) {
          showToast(`Berhasil memperbarui Tanggal Lahir (TTL) untuk ${updatedCount} siswa!`);
          setShowMassTtlModal(false);
          if (useDataStore.getState().setStudents) {
            useDataStore.getState().setStudents(updatedStudents);
          }
        } else {
          showToast('Gagal menyimpan pembaruan ke server', 'error');
        }
      }
    } catch (e) {
      console.error(e);
      showToast('Terjadi kesalahan saat pembaruan massal', 'error');
    } finally {
      setIsSavingMassTTL(false);
    }
  };

  // ─── Excel / CSV File Download Sample Template ───
  const handleDownloadExcelTemplate = () => {
    const templateData = [
      {
        "NIS": "1001",
        "Nama Siswa": "BUDI SANTOSO",
        "Kelas": "X TKJ 1",
        "Jurusan": "Teknik Komputer dan Jaringan",
        "Tempat Lahir": "Bekasi",
        "Tanggal Lahir": "2008-08-12",
        "TTL": "Bekasi, 12 Agustus 2008"
      },
      {
        "NIS": "1002",
        "Nama Siswa": "SITI AMINAH",
        "Kelas": "XI RPL 2",
        "Jurusan": "Rekayasa Perangkat Lunak",
        "Tempat Lahir": "Jakarta",
        "Tanggal Lahir": "2007-05-20",
        "TTL": "Jakarta, 20 Mei 2007"
      }
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template_Data_Siswa");
    XLSX.writeFile(wb, "Template_Mass_Upload_TTL_Kartu_Pelajar.xlsx");
  };

  // ─── Handle Excel / CSV File Upload & Parsing ───
  const handleExcelFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setExcelFileName(file.name);
    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsName = wb.SheetNames[0];
        const ws = wb.Sheets[wsName];
        const rawJson = XLSX.utils.sheet_to_json(ws, { defval: '' });

        if (!rawJson || rawJson.length === 0) {
          showToast('File Excel / CSV kosong atau format tidak sesuai!', 'error');
          return;
        }

        const parsedRows = rawJson.map(row => {
          const nis = String(row['NIS'] || row['nis'] || row['Nomor Induk'] || row['NO_INDUK'] || row['Nis'] || '').trim();
          const nama = String(row['Nama Siswa'] || row['Nama'] || row['nama'] || row['Nama Lengkap'] || row['NAMA'] || '').trim();
          const kelas = String(row['Kelas'] || row['kelas'] || row['class_name'] || row['KELAS'] || '').trim();
          const rawJurusan = String(row['Jurusan'] || row['jurusan'] || row['major'] || row['JURUSAN'] || '').trim();
          
          const tempat = String(row['Tempat Lahir'] || row['tempat_lahir'] || row['TempatLahir'] || row['Tempat'] || '').trim();
          const tglRaw = String(row['Tanggal Lahir'] || row['tanggal_lahir'] || row['TanggalLahir'] || row['Tgl Lahir'] || '').trim();
          const ttlRaw = String(row['TTL'] || row['ttl'] || row['Tempat, Tgl Lahir'] || '').trim();

          let computedTTL = ttlRaw;
          if (!computedTTL && (tempat || tglRaw)) {
            const formattedDate = formatIndonesianDate(tglRaw);
            computedTTL = `${tempat || 'Bekasi'}${formattedDate ? `, ${formattedDate}` : ''}`;
          }

          const fullMajor = expandMajorName(rawJurusan || 'Umum');

          return {
            nis,
            name: nama,
            class_name: kelas,
            major: fullMajor,
            jurusan: fullMajor,
            ttl: computedTTL,
            isValid: Boolean(nis && nama)
          };
        }).filter(r => r.nis);

        if (parsedRows.length === 0) {
          showToast('Tidak ada data NIS & Nama yang valid di file ini!', 'error');
          return;
        }

        setExcelParsedRows(parsedRows);
        showToast(`Berhasil membaca ${parsedRows.length} data siswa dari file Excel!`);
      } catch (err) {
        console.error(err);
        showToast('Gagal membaca file Excel / CSV', 'error');
      }
    };

    reader.readAsBinaryString(file);
  };

  // ─── Save Excel Import to DB ───
  const handleSaveExcelImport = async () => {
    if (excelParsedRows.length === 0) return;
    setIsSavingExcel(true);
    try {
      showToast('Menyimpan data impor Excel ke server…', 'success');
      const res = await fetch('/api/data/load', { headers: { Authorization: `Bearer ${authToken}` } });
      const data = await res.json();

      if (data.payload) {
        let updatedStudents = data.payload.students || [];
        let importedCount = 0;

        excelParsedRows.forEach(excelRow => {
          const existingIdx = updatedStudents.findIndex(s => String(s.nis) === String(excelRow.nis));
          if (existingIdx !== -1) {
            updatedStudents[existingIdx] = {
              ...updatedStudents[existingIdx],
              name: excelRow.name || updatedStudents[existingIdx].name,
              namaSiswa: excelRow.name || updatedStudents[existingIdx].namaSiswa,
              class_name: excelRow.class_name || updatedStudents[existingIdx].class_name,
              major: excelRow.major || updatedStudents[existingIdx].major,
              jurusan: excelRow.major || updatedStudents[existingIdx].jurusan,
              ttl: excelRow.ttl || updatedStudents[existingIdx].ttl,
              updated_at: new Date().toISOString()
            };
            importedCount++;
          } else {
            updatedStudents.push({
              nis: excelRow.nis,
              name: excelRow.name,
              namaSiswa: excelRow.name,
              class_name: excelRow.class_name,
              major: excelRow.major,
              jurusan: excelRow.major,
              ttl: excelRow.ttl,
              created_at: new Date().toISOString()
            });
            importedCount++;
          }
        });

        data.payload.students = cleanStudentsForServer(updatedStudents);

        const saveRes = await fetch('/api/data/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
          body: JSON.stringify({ payload: data.payload })
        });

        if (saveRes.ok) {
          showToast(`Berhasil mengimpor & memperbarui ${importedCount} data siswa dari Excel!`);
          setStudents(updatedStudents);
          setShowExcelModal(false);
          setExcelParsedRows([]);
          setExcelFileName('');
          if (useDataStore.getState().setStudents) {
            useDataStore.getState().setStudents(updatedStudents);
          }
        } else {
          showToast('Gagal menyimpan hasil impor ke server', 'error');
        }
      }
    } catch (e) {
      console.error(e);
      showToast('Terjadi kesalahan saat menyimpan data Excel', 'error');
    } finally {
      setIsSavingExcel(false);
    }
  };

  const [isSavingDesign, setIsSavingDesign] = useState(false);
  const handleSaveDesignToDB = async () => {
    setIsSavingDesign(true);
    showToast('Menyimpan desain ke database...', 'success');
    try {
      const res = await fetch('/api/student-cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({
          id: templateId,
          name: 'Desain Utama',
          config: config,
          is_default: true
        })
      });
      const data = await res.json();
      if (data.ok) {
        showToast('Desain berhasil disimpan di database!');
      } else {
        showToast('Gagal menyimpan desain: ' + (data.error || ''), 'error');
      }
    } catch (error) {
      console.error(error);
      showToast('Gagal menghubungi server', 'error');
    } finally {
      setIsSavingDesign(false);
    }
  };

  const studentsToPrint = useMemo(() => {
    const list = previewStudent ? [previewStudent] : students.filter(s => selectedStudents.includes(s.nis));
    return list.map(s => ({
      ...s,
      photo: tempPhotos[s.nis] || s.photo || null
    }));
  }, [students, selectedStudents, previewStudent, tempPhotos]);

  const activeStudentForPreview = useMemo(() => {
    let base = previewStudent;
    if (!base && selectedStudents.length > 0) {
      base = students.find(s => s.nis === selectedStudents[0]);
    }
    if (!base) base = students[0] || { name: 'BUDI SANTOSO', nis: '12345', ttl: 'Bekasi, 12 Agu 2008', class_name: 'X TKJ 1', major: 'Teknik Komputer dan Jaringan' };
    return {
      ...base,
      photo: tempPhotos[base.nis] || base.photo || null
    };
  }, [previewStudent, selectedStudents, students, tempPhotos]);

  const pendingRequestsCount = useMemo(() => {
    return requests.filter(r => r.status === 'pending').length;
  }, [requests]);

  const TABS = [
    { id: 'cetak', label: 'Pilih & Cetak Kartu', icon: Printer },
    { id: 'desain', label: 'Studio Desain Kartu', icon: Palette },
    { id: 'pengajuan', label: `Pengajuan Cetak (${pendingRequestsCount})`, icon: Clock },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300 w-full font-inherit">
      <PageHeader 
        title="Generator Kartu Tanda Pelajar"
        description="Studio desain dan cetak Kartu Pelajar elektrik modern lengkap dengan foto, barcode QR, mass upload Excel/CSV, update TTL & jurusan terintegrasi."
        icon={CreditCard}
        tabs={TABS}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* Summary KPI Cards Header */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200/80 rounded-[var(--ui-radius-card)] p-3.5 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-[var(--ui-radius-control)] bg-[var(--ui-primary)]/10 text-[var(--ui-primary)] border border-[var(--ui-primary)]/20 flex items-center justify-center shrink-0">
            <User size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-black text-slate-800 leading-none">{students.length} Siswa</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">Total Siswa Terdaftar</p>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-[var(--ui-radius-card)] p-3.5 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-[var(--ui-radius-control)] bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0">
            <CheckCircle2 size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-black text-slate-800 leading-none">{selectedStudents.length} Terpilih</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">Siap Dicetak</p>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-[var(--ui-radius-card)] p-3.5 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-[var(--ui-radius-control)] bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center shrink-0">
            <Clock size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-black text-slate-800 leading-none">{pendingRequestsCount} Pengajuan</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">Menunggu Persetujuan</p>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-[var(--ui-radius-card)] p-3.5 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-[var(--ui-radius-control)] bg-purple-50 text-purple-600 border border-purple-100 flex items-center justify-center shrink-0">
            <Palette size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-black text-slate-800 leading-none truncate">
              {config.front_template ? 'Template Kustom' : 'Default Studio'}
            </p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">Desain Kartu Aktif</p>
          </div>
        </div>
      </div>

      {/* ─── TAB 1: PILIH & CETAK ───────────────────────────────────────────── */}
      {activeTab === 'cetak' && (
        <div className="space-y-5 animate-in fade-in duration-200">
          
          {/* Main Workspace Layout (Table on left, Live Card Preview on right) */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
            
            {/* Left Column: Student Selector Table (7 cols) */}
            <div className="xl:col-span-7 bg-white border border-slate-200/80 rounded-[var(--ui-radius-card)] p-4 sm:p-5 shadow-xs space-y-4">
              
              {/* Filter & Toolbar Header */}
              <div className="flex flex-col gap-3 border-b border-slate-100 pb-4">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="font-black text-slate-800 text-sm flex items-center gap-2">
                      <Printer size={16} className="text-[var(--ui-primary)]" />
                      Pilih Siswa &amp; Cetak Massal
                    </h3>
                    <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                      Centang siswa di bawah untuk mencetak kartu fisik, download PDF, atau update TTL serentak.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setShowExcelModal(true)}
                      className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/80 font-bold text-xs px-3 py-2 rounded-[var(--ui-radius-control)] flex items-center gap-1.5 cursor-pointer shadow-2xs transition-all"
                      title="Upload File Excel / CSV Data Siswa & TTL"
                    >
                      <FileSpreadsheet size={14} className="text-emerald-600" />
                      <span>Upload Excel / CSV</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleOpenMassTtlModal}
                      className="bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200/80 font-bold text-xs px-3 py-2 rounded-[var(--ui-radius-control)] flex items-center gap-1.5 cursor-pointer shadow-2xs transition-all"
                      title="Mass Update Tanggal Lahir / TTL Siswa"
                    >
                      <Calendar size={14} className="text-amber-600" />
                      <span>Mass Update TTL</span>
                    </button>

                    <Button 
                      type="button"
                      onClick={() => setEditForm({ isNew: true, data: { name: '', nis: '', ttl: '', major: '', class_name: '' } })} 
                      className="bg-[var(--ui-primary-btn,var(--ui-primary))] hover:opacity-90 active:scale-98 text-white font-bold text-xs px-3 py-2 rounded-[var(--ui-radius-control)] flex items-center gap-1.5 cursor-pointer shadow-xs transition-all"
                    >
                      <Plus size={14} />
                      <span>Buat Manual</span>
                    </Button>
                  </div>
                </div>

                {/* Filter Inputs Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                    <input 
                      type="text"
                      value={searchTerm} 
                      onChange={e => setSearchTerm(e.target.value)} 
                      placeholder="Cari nama atau NIS…"
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200/80 rounded-[var(--ui-radius-control)] text-xs font-semibold focus:outline-none focus:bg-white focus:ring-2 focus:ring-[var(--ui-primary)]/20 focus:border-[var(--ui-primary)] transition-all" 
                    />
                  </div>

                  <UISelect 
                    value={selectedClass} 
                    onChange={e => setSelectedClass(e.target.value)}
                    className="px-3 py-2 bg-slate-50 border border-slate-200/80 rounded-[var(--ui-radius-control)] text-xs font-bold text-slate-700"
                  >
                    {classes.map(c => <option key={c} value={c}>{c === 'all' ? 'Semua Kelas' : c}</option>)}
                  </UISelect>

                  <UISelect 
                    value={selectedMajor} 
                    onChange={e => setSelectedMajor(e.target.value)}
                    className="px-3 py-2 bg-slate-50 border border-slate-200/80 rounded-[var(--ui-radius-control)] text-xs font-bold text-slate-700"
                  >
                    {majors.map(m => <option key={m} value={m}>{m === 'all' ? 'Semua Jurusan (Lengkap)' : m}</option>)}
                  </UISelect>
                </div>

                {/* Quick Selection Buttons Bar */}
                <div className="flex items-center justify-between pt-1 text-xs">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedStudents(filteredStudents.map(s => s.nis))}
                      className="text-[11px] font-bold text-[var(--ui-primary)] hover:underline cursor-pointer"
                    >
                      Pilih Semua ({filteredStudents.length})
                    </button>
                    <span className="text-slate-300">•</span>
                    <button
                      type="button"
                      onClick={() => setSelectedStudents([])}
                      className="text-[11px] font-bold text-slate-400 hover:underline cursor-pointer"
                    >
                      Reset Pilihan
                    </button>
                  </div>

                  <span className="text-[11px] font-black text-slate-600">
                    {selectedStudents.length} dari {filteredStudents.length} siswa dipilih
                  </span>
                </div>
              </div>

              {/* Students Table */}
              <div className="border border-slate-200/80 rounded-[var(--ui-radius-control)] overflow-hidden max-h-[460px] overflow-y-auto">
                {isLoading ? (
                  <div className="p-10 text-center text-slate-400">
                    <RefreshCw size={24} className="animate-spin mx-auto mb-2 opacity-40" />
                    <p className="text-xs font-bold">Memuat data siswa…</p>
                  </div>
                ) : filteredStudents.length === 0 ? (
                  <div className="p-10 text-center text-slate-400 bg-slate-50/50">
                    <User size={32} className="mx-auto mb-2 opacity-30" />
                    <p className="text-xs font-bold">Tidak ada data siswa ditemukan.</p>
                    <p className="text-[10px] text-slate-400 mt-1">Sesuaikan kata kunci pencarian atau filter kelas.</p>
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-slate-100 border-b border-slate-200/80 text-[10px] font-black uppercase text-slate-500 tracking-wider">
                      <tr>
                        <th className="p-3 w-10 text-center">
                          <input 
                            type="checkbox" 
                            checked={selectedStudents.length === filteredStudents.length && filteredStudents.length > 0}
                            onChange={e => setSelectedStudents(e.target.checked ? filteredStudents.map(s => s.nis) : [])}
                            className="w-4 h-4 accent-[var(--ui-primary)] rounded-[var(--ui-radius-small)] cursor-pointer" 
                          />
                        </th>
                        <th className="p-3">Siswa</th>
                        <th className="p-3">NIS</th>
                        <th className="p-3">Kelas &amp; Jurusan</th>
                        <th className="p-3">TTL (Tgl Lahir)</th>
                        <th className="p-3 text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {filteredStudents.map(student => {
                        const isSelected = selectedStudents.includes(student.nis);
                        const isPreviewing = previewStudent?.nis === student.nis;
                        const studentMajor = getStudentMajor(student);

                        return (
                          <tr 
                            key={student.nis} 
                            className={`transition-colors ${
                              isPreviewing ? 'bg-[var(--ui-primary)]/10 font-semibold' : isSelected ? 'bg-slate-50/80' : 'hover:bg-slate-50'
                            }`}
                          >
                            <td className="p-3 text-center">
                              <input 
                                type="checkbox" 
                                checked={isSelected}
                                onChange={e => {
                                  if (e.target.checked) setSelectedStudents(prev => [...prev, student.nis]);
                                  else setSelectedStudents(prev => prev.filter(n => n !== student.nis));
                                }}
                                className="w-4 h-4 accent-[var(--ui-primary)] rounded-[var(--ui-radius-small)] cursor-pointer" 
                              />
                            </td>
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                {tempPhotos[student.nis] || student.photo ? (
                                  <img 
                                    src={tempPhotos[student.nis] || student.photo} 
                                    alt="Foto" 
                                    className="w-7 h-7 rounded-[var(--ui-radius-small)] object-cover shrink-0 border border-emerald-300 shadow-2xs" 
                                  />
                                ) : (
                                  <div className="w-7 h-7 rounded-[var(--ui-radius-small)] bg-slate-200 text-slate-700 font-black text-[11px] flex items-center justify-center shrink-0">
                                    {(student.namaSiswa || student.name || '?')[0].toUpperCase()}
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <p className="font-bold text-slate-800 truncate">{student.namaSiswa || student.name}</p>
                                  {tempPhotos[student.nis] && (
                                    <span className="text-[9px] font-black text-emerald-600">Foto Ready (In-Memory)</span>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="p-3 font-mono font-bold text-slate-600 text-[11px]">{student.nis}</td>
                            <td className="p-3">
                              <span className="font-semibold text-slate-700">{student.class_name || '-'}</span>
                              <div className="mt-0.5">
                                <span className="inline-block px-1.5 py-0.5 rounded-[var(--ui-radius-small)] text-[9.5px] font-bold bg-[var(--ui-primary)]/10 text-[var(--ui-primary)] border border-[var(--ui-primary)]/20">
                                  {studentMajor}
                                </span>
                              </div>
                            </td>
                            <td className="p-3 font-medium text-slate-600 text-[11px]">
                              {student.ttl || <span className="text-slate-400 italic">Belum diisi</span>}
                            </td>
                            <td className="p-3">
                              <div className="flex items-center justify-center gap-1">
                                <label 
                                  className={`p-1.5 rounded-[var(--ui-radius-small)] border transition-all cursor-pointer flex items-center justify-center ${
                                    tempPhotos[student.nis]
                                      ? 'bg-emerald-50 text-emerald-600 border-emerald-300 shadow-2xs'
                                      : 'bg-slate-50 text-slate-500 hover:text-[var(--ui-primary)] border-slate-200/80 hover:bg-[var(--ui-primary)]/10'
                                  }`}
                                  title={tempPhotos[student.nis] ? "Foto tersimpan di memori (Siap Cetak - Tidak disimpan ke DB)" : "Upload Foto Siswa (Hanya di memori / Tanpa simpan DB)"}
                                >
                                  <Upload size={13} />
                                  <input 
                                    type="file" 
                                    accept="image/*" 
                                    onChange={e => {
                                      const file = e.target.files[0];
                                      if (file) {
                                        compressImage(file, { maxWidth: 400, maxHeight: 500, quality: 0.8 }).then(compressedBase64 => {
                                          setTempPhotos(prev => ({ ...prev, [student.nis]: compressedBase64 }));
                                          showToast(`Foto siswa ${student.namaSiswa || student.name} dimuat di memori!`);
                                        });
                                      }
                                    }} 
                                    className="hidden" 
                                  />
                                </label>

                                <button
                                  type="button"
                                  onClick={() => setPreviewStudent(previewStudent?.nis === student.nis ? null : student)}
                                  className={`p-1.5 rounded-[var(--ui-radius-small)] border transition-all cursor-pointer ${
                                    isPreviewing 
                                      ? 'bg-[var(--ui-primary)] text-white border-[var(--ui-primary)] shadow-xs' 
                                      : 'bg-slate-50 text-slate-500 hover:text-[var(--ui-primary)] border-slate-200/80 hover:bg-[var(--ui-primary)]/10'
                                  }`}
                                  title="Pratinjau Kartu"
                                >
                                  <Eye size={13} />
                                </button>
                                
                                <button
                                  type="button"
                                  onClick={() => setShowRequestModal(student)}
                                  className="p-1.5 rounded-[var(--ui-radius-small)] bg-slate-50 text-slate-500 hover:text-amber-600 border border-slate-200/80 hover:bg-amber-50 transition-all cursor-pointer"
                                  title="Ajukan Cetak Ulang"
                                >
                                  <CreditCard size={13} />
                                </button>
                                
                                <button
                                  type="button"
                                  onClick={() => setEditForm({ isNew: false, data: student })}
                                  className="p-1.5 rounded-[var(--ui-radius-small)] bg-slate-50 text-slate-500 hover:text-[var(--ui-primary)] border border-slate-200/80 hover:bg-[var(--ui-primary)]/10 transition-all cursor-pointer"
                                  title="Edit Data"
                                >
                                  <Edit2 size={13} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Bottom Batch Actions Footer */}
              <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">
                  Aksi Massal ({selectedStudents.length} Siswa Terpilih)
                </span>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Button 
                    variant="outline" 
                    type="button" 
                    onClick={handleDownloadPDF} 
                    disabled={selectedStudents.length === 0 || isPrinting}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 text-xs font-bold border-slate-200 rounded-[var(--ui-radius-control)]"
                  >
                    <Download size={14} /> Download PDF
                  </Button>

                  <Button 
                    type="button" 
                    onClick={handlePrint} 
                    disabled={selectedStudents.length === 0 || isPrinting}
                    className="flex-1 sm:flex-initial bg-[var(--ui-primary-btn,var(--ui-primary))] hover:opacity-90 active:scale-98 text-white font-black text-xs px-4 py-2 rounded-[var(--ui-radius-control)] flex items-center justify-center gap-1.5 shadow-xs cursor-pointer transition-all"
                  >
                    <Printer size={14} /> Cetak {selectedStudents.length > 0 ? `(${selectedStudents.length})` : ''}
                  </Button>
                </div>
              </div>

            </div>

            {/* Right Column: Live Interactive Card Preview Studio (5 cols) */}
            <div className="xl:col-span-5 bg-slate-900 text-white border border-slate-800 rounded-[var(--ui-radius-card)] p-4 sm:p-5 shadow-lg space-y-4 sticky top-4">
              
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles size={16} className="text-amber-400 shrink-0" />
                  <h3 className="font-black text-xs uppercase tracking-widest text-slate-200">
                    Live Preview Studio
                  </h3>
                </div>

                {/* Flip Side Segmented Buttons */}
                <div className="flex items-center bg-slate-800 border border-slate-700/80 rounded-[var(--ui-radius-control)] p-1 text-[10px] font-bold">
                  <button
                    type="button"
                    onClick={() => setPreviewSide('front')}
                    className={`px-2.5 py-1 rounded-[var(--ui-radius-small)] transition-all cursor-pointer ${
                      previewSide === 'front' ? 'bg-[var(--ui-primary)] text-white font-black shadow-xs' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Depan
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewSide('back')}
                    className={`px-2.5 py-1 rounded-[var(--ui-radius-small)] transition-all cursor-pointer ${
                      previewSide === 'back' ? 'bg-[var(--ui-primary)] text-white font-black shadow-xs' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Belakang
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewSide('both')}
                    className={`px-2.5 py-1 rounded-[var(--ui-radius-small)] transition-all cursor-pointer ${
                      previewSide === 'both' ? 'bg-[var(--ui-primary)] text-white font-black shadow-xs' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Keduanya
                  </button>
                </div>
              </div>

              {/* Active Student Selector Info */}
              <div className="bg-slate-800/80 border border-slate-700/60 rounded-[var(--ui-radius-control)] p-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Kartu Yang Ditampilkan</p>
                  <p className="text-xs font-black text-white truncate mt-0.5">
                    {activeStudentForPreview.namaSiswa || activeStudentForPreview.name || 'NAMA SISWA'}
                  </p>
                  <p className="text-[10px] text-slate-400 font-mono">
                    NIS: {activeStudentForPreview.nis || '-'} • Kelas: {activeStudentForPreview.class_name || '-'} • Jurusan: {getStudentMajor(activeStudentForPreview)}
                  </p>
                </div>

                {previewStudent && (
                  <button
                    type="button"
                    onClick={() => setPreviewStudent(null)}
                    className="p-1.5 rounded-[var(--ui-radius-small)] bg-slate-700/80 hover:bg-slate-700 text-slate-300 text-[10px] font-bold cursor-pointer shrink-0"
                    title="Tutup Preview Khusus"
                  >
                    Reset
                  </button>
                )}
              </div>

              {/* Card Canvas Container */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-[var(--ui-radius-control)] p-4 flex flex-col items-center justify-center min-h-[250px] overflow-hidden relative">
                <StudentCard 
                  student={activeStudentForPreview} 
                  school={school} 
                  config={config} 
                  side={previewSide}
                />
              </div>

              {/* Single Student Quick Action Buttons */}
              <div className="pt-2 flex justify-between items-center text-[11px] text-slate-400 font-medium">
                <span>Ukuran Fisik: Standar ID-Card (86mm x 54mm)</span>
                <span className="text-emerald-400 font-bold">Siap Cetak</span>
              </div>

            </div>

          </div>

        </div>
      )}

      {/* ─── TAB 2: STUDIO DESAIN & KUSTOMISASI ────────────────────────────── */}
      {activeTab === 'desain' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start animate-in fade-in duration-200">
          
          {/* Controls Column (7 cols) */}
          <div className="xl:col-span-7 bg-white border border-slate-200/80 rounded-[var(--ui-radius-card)] p-5 shadow-xs space-y-6">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="font-black text-slate-800 text-sm flex items-center gap-2">
                  <Palette size={16} className="text-purple-600" />
                  Kustomisasi &amp; Template Desain
                </h3>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                  Atur gambar background template, tema warna, dan elemen data pada kartu.
                </p>
              </div>

              <Button
                type="button"
                onClick={handleSaveDesignToDB}
                disabled={isSavingDesign}
                className="bg-[var(--ui-primary-btn,var(--ui-primary))] hover:opacity-90 active:scale-98 text-white font-black text-xs px-4 py-2 rounded-[var(--ui-radius-control)] flex items-center gap-1.5 cursor-pointer shadow-xs transition-all"
              >
                {isSavingDesign ? 'Menyimpan…' : 'Simpan Desain Permanen'}
              </Button>
            </div>

            {/* Quick Preset Color Themes */}
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">
                Pilih Tema Warna Prasetel (Quick Preset)
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {PRESET_THEMES.map(theme => {
                  const isActive = config.bg_color === theme.bg_color && config.accent_color === theme.accent_color;
                  return (
                    <button
                      key={theme.id}
                      type="button"
                      onClick={() => setConfig(p => ({
                        ...p,
                        bg_color: theme.bg_color,
                        text_color: theme.text_color,
                        accent_color: theme.accent_color
                      }))}
                      className={`p-2.5 rounded-[var(--ui-radius-control)] border text-left flex items-center gap-2.5 transition-all cursor-pointer ${
                        isActive ? 'border-[var(--ui-primary)] bg-[var(--ui-primary)]/10 ring-2 ring-[var(--ui-primary)]/20' : 'border-slate-200/80 bg-slate-50/60 hover:bg-slate-100'
                      }`}
                    >
                      <span className="w-5 h-5 rounded-full shrink-0 border border-black/10 shadow-2xs" style={{ backgroundColor: theme.bg_color }} />
                      <span className="text-xs font-bold text-slate-800 truncate">{theme.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Upload Template Backgrounds */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
              {/* Front Template */}
              <div className="bg-slate-50/80 border border-slate-200/80 rounded-[var(--ui-radius-control)] p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-800">Template Depan (Gambar)</span>
                  {config.front_template && (
                    <button
                      type="button"
                      onClick={() => setConfig(p => ({ ...p, front_template: '' }))}
                      className="text-[10px] font-bold text-red-600 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 size={11} /> Hapus
                    </button>
                  )}
                </div>

                {config.front_template ? (
                  <div className="relative w-full h-24 rounded-[var(--ui-radius-small)] overflow-hidden border border-slate-300 group">
                    <img src={config.front_template} className="w-full h-full object-cover" alt="Template Depan" />
                  </div>
                ) : (
                  <div className="p-4 border-2 border-dashed border-slate-300 rounded-[var(--ui-radius-control)] text-center bg-white">
                    <Upload size={20} className="mx-auto mb-1 text-slate-400" />
                    <p className="text-[11px] font-bold text-slate-600">Upload Desain Depan</p>
                    <p className="text-[9px] text-slate-400 mt-0.5">PNG / JPG (Rasio 86:54)</p>
                  </div>
                )}

                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={e => {
                    const file = e.target.files[0];
                    if (file) {
                      compressImage(file, { maxWidth: 1000, maxHeight: 600, quality: 0.8 }).then(compressedBase64 => {
                        setConfig(p => ({ ...p, front_template: compressedBase64 }));
                      });
                    }
                  }} 
                  className="w-full text-xs file:mr-3 file:py-1.5 file:px-3 file:rounded-[var(--ui-radius-small)] file:border-0 file:text-xs file:font-bold file:bg-[var(--ui-primary)]/10 file:text-[var(--ui-primary)] hover:file:bg-[var(--ui-primary)]/20 cursor-pointer" 
                />
              </div>

              {/* Back Template */}
              <div className="bg-slate-50/80 border border-slate-200/80 rounded-[var(--ui-radius-control)] p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-800">Template Belakang (Gambar)</span>
                  {config.back_template && (
                    <button
                      type="button"
                      onClick={() => setConfig(p => ({ ...p, back_template: '' }))}
                      className="text-[10px] font-bold text-red-600 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 size={11} /> Hapus
                    </button>
                  )}
                </div>

                {config.back_template ? (
                  <div className="relative w-full h-24 rounded-[var(--ui-radius-small)] overflow-hidden border border-slate-300 group">
                    <img src={config.back_template} className="w-full h-full object-cover" alt="Template Belakang" />
                  </div>
                ) : (
                  <div className="p-4 border-2 border-dashed border-slate-300 rounded-[var(--ui-radius-control)] text-center bg-white">
                    <Upload size={20} className="mx-auto mb-1 text-slate-400" />
                    <p className="text-[11px] font-bold text-slate-600">Upload Desain Belakang</p>
                    <p className="text-[9px] text-slate-400 mt-0.5">PNG / JPG (Rasio 86:54)</p>
                  </div>
                )}

                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={e => {
                    const file = e.target.files[0];
                    if (file) {
                      compressImage(file, { maxWidth: 1000, maxHeight: 600, quality: 0.8 }).then(compressedBase64 => {
                        setConfig(p => ({ ...p, back_template: compressedBase64 }));
                      });
                    }
                  }} 
                  className="w-full text-xs file:mr-3 file:py-1.5 file:px-3 file:rounded-[var(--ui-radius-small)] file:border-0 file:text-xs file:font-bold file:bg-[var(--ui-primary)]/10 file:text-[var(--ui-primary)] hover:file:bg-[var(--ui-primary)]/20 cursor-pointer" 
                />
              </div>
            </div>

            {/* Custom Colors Overlay Controls */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Warna Teks Overlay</label>
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 p-1.5 rounded-[var(--ui-radius-control)]">
                  <input 
                    type="color" 
                    value={config.text_color} 
                    onChange={e => setConfig(p => ({ ...p, text_color: e.target.value }))}
                    className="w-8 h-8 rounded-[var(--ui-radius-small)] border-none cursor-pointer" 
                  />
                  <span className="text-xs font-mono text-slate-600 font-bold">{config.text_color}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Warna Fallback Background</label>
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 p-1.5 rounded-[var(--ui-radius-control)]">
                  <input 
                    type="color" 
                    value={config.bg_color} 
                    onChange={e => setConfig(p => ({ ...p, bg_color: e.target.value }))}
                    className="w-8 h-8 rounded-[var(--ui-radius-small)] border-none cursor-pointer" 
                  />
                  <span className="text-xs font-mono text-slate-600 font-bold">{config.bg_color}</span>
                </div>
              </div>
            </div>

            {/* Element Display Switches & Name Abbreviation Options */}
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">
                Tampilkan Elemen Informasi &amp; Format Nama Kartu
              </label>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  { key: 'show_photo', label: 'Foto Siswa' },
                  { key: 'show_barcode', label: 'QR Validasi / TTD' },
                  { key: 'show_nisn', label: 'Nomor NIS' },
                  { key: 'show_kelas', label: 'Kelas' },
                  { key: 'show_jurusan', label: 'Jurusan' },
                  { key: 'auto_abbreviate_name', label: 'Singkat Nama Panjang' },
                ].map(item => (
                  <label key={item.key} className="flex items-center gap-2.5 p-2.5 rounded-[var(--ui-radius-control)] border border-slate-200/80 bg-slate-50/60 hover:bg-slate-100 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={config[item.key] !== false} 
                      onChange={e => setConfig(p => ({ ...p, [item.key]: e.target.checked }))}
                      className="w-4 h-4 accent-[var(--ui-primary)] rounded-[var(--ui-radius-small)] cursor-pointer" 
                    />
                    <span className="text-xs font-bold text-slate-700">{item.label}</span>
                  </label>
                ))}
              </div>

              {config.auto_abbreviate_name !== false && (
                <div className="p-3 bg-[var(--ui-primary)]/10 border border-[var(--ui-primary)]/20 rounded-[var(--ui-radius-control)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                  <div>
                    <p className="font-bold text-[var(--ui-primary)]">Penyingkatan Otomatis Nama Panjang Aktif</p>
                    <p className="text-[11px] text-slate-600 font-medium mt-0.5">
                      Nama yang melebihi batas akan disingkat kata terakhirnya menjadi 1 huruf depan (Contoh: <strong className="text-slate-800 font-bold">MUHAMMAD RIZKY P. R.</strong>)
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Maks Huruf:</span>
                    <input 
                      type="number" 
                      min="12" 
                      max="35"
                      value={config.max_name_length || 22}
                      onChange={e => setConfig(p => ({ ...p, max_name_length: Number(e.target.value) || 22 }))}
                      className="w-16 px-2 py-1 bg-white border border-slate-300 rounded-[var(--ui-radius-small)] text-xs font-bold text-center"
                    />
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* Right Live Preview Column (5 cols) */}
          <div className="xl:col-span-5 bg-slate-900 text-white border border-slate-800 rounded-[var(--ui-radius-card)] p-5 shadow-lg space-y-4 sticky top-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-amber-400 shrink-0" />
                <h3 className="font-black text-xs uppercase tracking-widest text-slate-200">
                  Pratinjau Hasil Desain
                </h3>
              </div>

              <div className="flex items-center bg-slate-800 border border-slate-700/80 rounded-[var(--ui-radius-control)] p-1 text-[10px] font-bold">
                <button
                  type="button"
                  onClick={() => setPreviewSide('front')}
                  className={`px-2.5 py-1 rounded-[var(--ui-radius-small)] cursor-pointer ${previewSide === 'front' ? 'bg-[var(--ui-primary)] text-white font-black' : 'text-slate-400'}`}
                >
                  Depan
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewSide('back')}
                  className={`px-2.5 py-1 rounded-[var(--ui-radius-small)] cursor-pointer ${previewSide === 'back' ? 'bg-[var(--ui-primary)] text-white font-black' : 'text-slate-400'}`}
                >
                  Belakang
                </button>
              </div>
            </div>

            <div className="bg-slate-950/70 border border-slate-800 rounded-[var(--ui-radius-control)] p-4 flex flex-col items-center justify-center min-h-[250px] overflow-hidden">
              <StudentCard 
                student={{ name: 'BUDI SANTOSO', nis: '12345', ttl: 'Bekasi, 12 Agu 2008', class_name: 'XI TKJ 2', major: 'Teknik Komputer dan Jaringan' }} 
                school={school} 
                config={config} 
                side={previewSide}
              />
            </div>

            <p className="text-[11px] text-slate-400 text-center font-medium">
              Semua perubahan warna, background &amp; elemen akan langsung terlihat di sini secara realtime.
            </p>
          </div>

        </div>
      )}

      {/* ─── TAB 3: LOG & PERSETUJUAN PENGAJUAN CETAK ULANG ────────────────── */}
      {activeTab === 'pengajuan' && (
        <div className="bg-white border border-slate-200/80 rounded-[var(--ui-radius-card)] p-5 shadow-xs space-y-4 animate-in fade-in duration-200 font-inherit">
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h3 className="font-black text-slate-800 text-sm flex items-center gap-2">
                <Clock size={16} className="text-amber-500" />
                Daftar Permohonan &amp; Log Cetak Ulang
              </h3>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                Kelola permohonan penggantian kartu siswa yang hilang, rusak, atau pembaruan data.
              </p>
            </div>

            <button
              type="button"
              onClick={fetchRequests}
              className="p-2 rounded-[var(--ui-radius-control)] bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw size={14} /> Refresh
            </button>
          </div>

          {/* Log Table */}
          <div className="border border-slate-200/80 rounded-[var(--ui-radius-control)] overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-100 border-b border-slate-200/80 text-[10px] font-black uppercase text-slate-500 tracking-wider">
                <tr>
                  <th className="p-3.5">Nama Siswa</th>
                  <th className="p-3.5">NIS</th>
                  <th className="p-3.5">Kelas</th>
                  <th className="p-3.5">Alasan Pengajuan</th>
                  <th className="p-3.5">Tanggal</th>
                  <th className="p-3.5 text-center">Status</th>
                  <th className="p-3.5 text-right">Aksi Admin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {requests.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-10 text-center text-slate-400 bg-slate-50/50">
                      <Clock size={32} className="mx-auto mb-2 opacity-30" />
                      <p className="font-bold text-xs">Belum ada riwayat permohonan cetak kartu.</p>
                    </td>
                  </tr>
                ) : (
                  requests.map(reqItem => (
                    <tr key={reqItem.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3.5 font-bold text-slate-800">{reqItem.nama}</td>
                      <td className="p-3.5 font-mono text-[11px] text-slate-500 font-bold">{reqItem.nis}</td>
                      <td className="p-3.5 text-slate-700 font-semibold">{reqItem.kelas}</td>
                      <td className="p-3.5 text-slate-600 font-medium">{reqItem.alasan}</td>
                      <td className="p-3.5 text-slate-400 text-[11px]">
                        {new Date(reqItem.created_at).toLocaleDateString('id-ID', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td className="p-3.5 text-center">
                        <span className={`inline-flex px-2.5 py-0.5 rounded-[var(--ui-radius-small)] text-[10px] font-black uppercase tracking-wider ${
                          reqItem.status === 'pending' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                          reqItem.status === 'disetujui' ? 'bg-[var(--ui-primary)]/10 text-[var(--ui-primary)] border border-[var(--ui-primary)]/20' :
                          reqItem.status === 'selesai' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}>
                          {reqItem.status === 'pending' ? 'Menunggu' :
                           reqItem.status === 'disetujui' ? 'Disetujui' :
                           reqItem.status === 'selesai' ? 'Selesai' : 'Ditolak'}
                        </span>
                      </td>
                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {reqItem.status === 'pending' && (
                            <>
                              <button
                                type="button"
                                onClick={async () => {
                                  const response = await fetch('/api/student-card-requests', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
                                    body: JSON.stringify({ action: 'approve', id: reqItem.id })
                                  });
                                  if (response.ok) {
                                    showToast('Permohonan disetujui!');
                                    fetchRequests();
                                  }
                                }}
                                className="px-2.5 py-1 rounded-[var(--ui-radius-small)] bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-[11px] font-black cursor-pointer"
                              >
                                Setujui
                              </button>
                              <button
                                type="button"
                                onClick={async () => {
                                  const response = await fetch('/api/student-card-requests', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
                                    body: JSON.stringify({ action: 'reject', id: reqItem.id })
                                  });
                                  if (response.ok) {
                                    showToast('Permohonan ditolak!');
                                    fetchRequests();
                                  }
                                }}
                                className="px-2.5 py-1 rounded-[var(--ui-radius-small)] bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[11px] font-black cursor-pointer"
                              >
                                Tolak
                              </button>
                            </>
                          )}

                          {reqItem.status === 'disetujui' && (
                            <button
                              type="button"
                              onClick={async () => {
                                const studentObj = students.find(s => s.nis === reqItem.nis) || { name: reqItem.nama, nis: reqItem.nis, class_name: reqItem.kelas };
                                setPreviewStudent(studentObj);
                                setIsPrinting(true);
                                
                                await fetch('/api/student-card-requests', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
                                  body: JSON.stringify({ action: 'selesai', id: reqItem.id })
                                });
                                
                                setTimeout(() => {
                                  window.print();
                                  setIsPrinting(false);
                                  setPreviewStudent(null);
                                  showToast('Kartu dicetak & status diperbarui!');
                                  fetchRequests();
                                }, 400);
                              }}
                              className="px-2.5 py-1 rounded-[var(--ui-radius-small)] bg-[var(--ui-primary-btn,var(--ui-primary))] hover:opacity-90 text-white font-black text-[11px] shadow-xs cursor-pointer"
                            >
                              Cetak Sekarang
                            </button>
                          )}

                          {(reqItem.status === 'selesai' || reqItem.status === 'ditolak') && (
                            <button
                              type="button"
                              onClick={async () => {
                                const response = await fetch('/api/student-card-requests', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
                                  body: JSON.stringify({ action: 'delete', id: reqItem.id })
                                });
                                if (response.ok) {
                                  showToast('Log riwayat pengajuan dihapus!');
                                  fetchRequests();
                                }
                              }}
                              className="p-1.5 rounded-[var(--ui-radius-small)] bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-600 border border-slate-200/80 cursor-pointer"
                              title="Hapus Log"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

        </div>
      )}

      {/* Hidden Print Area */}
      {isPrinting && (
        <div className="print-area bg-white z-[9999] flex flex-wrap gap-4 p-4 justify-start content-start">
          {studentsToPrint.map(student => (
            <StudentCard key={student.nis} student={student} school={school} config={config} />
          ))}
        </div>
      )}

      {/* Modal: Upload Excel / CSV Data Siswa & TTL */}
      {showExcelModal && (
        <Modal
          isOpen={true}
          onClose={() => {
            setShowExcelModal(false);
            setExcelParsedRows([]);
            setExcelFileName('');
          }}
          title="Upload Massal File Excel / CSV Data Siswa & TTL"
          maxWidth="max-w-3xl"
        >
          <div className="space-y-4 font-inherit">
            
            {/* Download Template & Dropzone Header */}
            <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-[var(--ui-radius-control)] p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-xs font-black text-emerald-900 flex items-center gap-2">
                  <FileSpreadsheet size={16} className="text-emerald-600" />
                  Format Dokumen Excel / CSV
                </h4>
                <p className="text-[11px] text-emerald-800 font-medium mt-0.5">
                  Gunakan template standar agar data NIS, Nama, Kelas, Jurusan &amp; Tanggal Lahir (TTL) terbaca sempurna.
                </p>
              </div>

              <button
                type="button"
                onClick={handleDownloadExcelTemplate}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3.5 py-2 rounded-[var(--ui-radius-control)] flex items-center gap-1.5 cursor-pointer shadow-xs shrink-0"
              >
                <Download size={14} />
                <span>Unduh Template Excel</span>
              </button>
            </div>

            {/* Dropzone Input */}
            <div className="border-2 border-dashed border-slate-300 rounded-[var(--ui-radius-control)] p-5 text-center bg-slate-50/50 hover:bg-slate-50 transition-colors">
              <UploadCloud size={32} className="mx-auto mb-2 text-[var(--ui-primary)]" />
              <p className="text-xs font-bold text-slate-700">Pilih File Excel (.xlsx, .xls) atau CSV (.csv)</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Ukuran maksimal file 10MB</p>

              <input 
                type="file" 
                accept=".xlsx, .xls, .csv" 
                onChange={handleExcelFileUpload}
                className="mt-3 block mx-auto text-xs file:mr-3 file:py-1.5 file:px-4 file:rounded-[var(--ui-radius-control)] file:border-0 file:text-xs file:font-bold file:bg-[var(--ui-primary-btn,var(--ui-primary))] file:text-white hover:file:opacity-90 cursor-pointer"
              />

              {excelFileName && (
                <p className="text-xs font-black text-[var(--ui-primary)] mt-2 flex items-center justify-center gap-1">
                  <FileSpreadsheet size={14} /> {excelFileName}
                </p>
              )}
            </div>

            {/* Parsed Rows Preview Table */}
            {excelParsedRows.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-800">
                    Hasil Pembacaan ({excelParsedRows.length} Baris Data Terbaca)
                  </span>
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-[var(--ui-radius-small)] border border-emerald-200">
                    Jurusan Otomatis Diperluas Lengkap
                  </span>
                </div>

                <div className="border border-slate-200 rounded-[var(--ui-radius-control)] max-h-[240px] overflow-y-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="sticky top-0 bg-slate-100 border-b border-slate-200 text-[10px] font-black uppercase text-slate-500">
                      <tr>
                        <th className="p-2.5">NIS</th>
                        <th className="p-2.5">Nama Siswa</th>
                        <th className="p-2.5">Kelas</th>
                        <th className="p-2.5">Jurusan (Lengkap)</th>
                        <th className="p-2.5">TTL (Format Kartu)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-[11px]">
                      {excelParsedRows.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="p-2.5 font-mono font-bold text-slate-700">{row.nis}</td>
                          <td className="p-2.5 font-bold text-slate-800">{row.name}</td>
                          <td className="p-2.5 text-slate-600">{row.class_name || '-'}</td>
                          <td className="p-2.5">
                            <span className="px-1.5 py-0.5 rounded-[var(--ui-radius-small)] text-[9.5px] font-bold bg-[var(--ui-primary)]/10 text-[var(--ui-primary)] border border-[var(--ui-primary)]/20">
                              {row.major}
                            </span>
                          </td>
                          <td className="p-2.5 font-semibold text-slate-700">{row.ttl || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-500 font-semibold">
                {excelParsedRows.length > 0 ? `${excelParsedRows.length} data siap diimpor` : 'Silakan upload file Excel/CSV terlebih dahulu'}
              </span>

              <div className="flex items-center gap-2">
                <Button variant="outline" type="button" onClick={() => {
                  setShowExcelModal(false);
                  setExcelParsedRows([]);
                  setExcelFileName('');
                }}>
                  Batal
                </Button>
                <Button 
                  type="button" 
                  onClick={handleSaveExcelImport}
                  disabled={excelParsedRows.length === 0 || isSavingExcel}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs px-4 py-2 rounded-[var(--ui-radius-control)] flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Save size={14} />
                  <span>{isSavingExcel ? 'Mengimpor…' : `Impor ${excelParsedRows.length} Data Siswa`}</span>
                </Button>
              </div>
            </div>

          </div>
        </Modal>
      )}

      {/* Modal: Mass Update Tanggal Lahir / TTL */}
      {showMassTtlModal && (
        <Modal
          isOpen={true}
          onClose={() => setShowMassTtlModal(false)}
          title={`Mass Update Tanggal Lahir / TTL (${massStudentItems.length} Siswa)`}
          maxWidth="max-w-xl"
        >
          <div className="space-y-4 font-inherit">
            
            {/* Mode Switcher */}
            <div className="flex items-center bg-slate-100 p-1 rounded-[var(--ui-radius-control)] text-xs font-bold border border-slate-200/80">
              <button
                type="button"
                onClick={() => setMassTtlMode('serentak')}
                className={`flex-1 py-1.5 px-3 rounded-[var(--ui-radius-small)] transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  massTtlMode === 'serentak' ? 'bg-white text-[var(--ui-primary)] shadow-xs font-black' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <CheckSquare size={14} />
                <span>Format Serentak (Sama)</span>
              </button>

              <button
                type="button"
                onClick={() => setMassTtlMode('tabel')}
                className={`flex-1 py-1.5 px-3 rounded-[var(--ui-radius-small)] transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  massTtlMode === 'tabel' ? 'bg-white text-[var(--ui-primary)] shadow-xs font-black' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Edit2 size={14} />
                <span>Tabel Editor per Siswa</span>
              </button>
            </div>

            {massTtlMode === 'serentak' ? (
              <div className="space-y-3.5 bg-slate-50 border border-slate-200/80 rounded-[var(--ui-radius-control)] p-4">
                <p className="text-xs text-slate-600 font-medium">
                  Atur Tempat dan Tanggal Lahir sekaligus untuk <strong className="text-[var(--ui-primary)]">{massStudentItems.length} siswa</strong> yang dipilih:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
                      Tempat Lahir
                    </label>
                    <input 
                      type="text"
                      value={massPlace} 
                      onChange={e => setMassPlace(e.target.value)} 
                      placeholder="Contoh: Bekasi"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-[var(--ui-radius-control)] text-xs font-bold text-slate-800 focus:ring-2 focus:ring-[var(--ui-primary)]/20 focus:border-[var(--ui-primary)]" 
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
                      Tanggal Lahir
                    </label>
                    <input 
                      type="date"
                      value={massDate} 
                      onChange={e => setMassDate(e.target.value)} 
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-[var(--ui-radius-control)] text-xs font-bold text-slate-800 focus:ring-2 focus:ring-[var(--ui-primary)]/20 focus:border-[var(--ui-primary)]" 
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
                    Atau Format Teks Kustom TTL (Opsional)
                  </label>
                  <input 
                    type="text"
                    value={massCustomTTL} 
                    onChange={e => setMassCustomTTL(e.target.value)} 
                    placeholder="Contoh: Bekasi, 12 Agustus 2008"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-[var(--ui-radius-control)] text-xs font-bold text-slate-800 focus:ring-2 focus:ring-[var(--ui-primary)]/20 focus:border-[var(--ui-primary)]" 
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Hasil Format TTL Kartu: <strong className="text-slate-700 font-bold">{
                      massCustomTTL.trim() || `${massPlace || 'Bekasi'}${massDate ? `, ${formatIndonesianDate(massDate)}` : ''}`
                    }</strong>
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-2 font-inherit">
                <p className="text-xs text-slate-500 font-medium">
                  Ketik atau ubah TTL secara individual untuk masing-masing siswa:
                </p>

                <div className="border border-slate-200 rounded-[var(--ui-radius-control)] max-h-[300px] overflow-y-auto divide-y divide-slate-100">
                  {massStudentItems.map((item, idx) => (
                    <div key={item.nis} className="p-2.5 flex items-center justify-between gap-3 hover:bg-slate-50">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-800 truncate">{item.name}</p>
                        <p className="text-[10px] text-slate-400 font-mono">NIS: {item.nis} • {item.class_name}</p>
                      </div>

                      <input 
                        type="text"
                        value={item.ttl}
                        onChange={e => {
                          const val = e.target.value;
                          setMassStudentItems(prev => prev.map((it, i) => i === idx ? { ...it, ttl: val } : it));
                        }}
                        placeholder="Contoh: Bekasi, 12 Agu 2008"
                        className="w-48 px-2.5 py-1.5 bg-white border border-slate-300 rounded-[var(--ui-radius-small)] text-xs font-bold focus:ring-2 focus:ring-[var(--ui-primary)]/20 focus:border-[var(--ui-primary)]"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-500 font-semibold">
                Target: {massStudentItems.length} Siswa
              </span>

              <div className="flex items-center gap-2">
                <Button variant="outline" type="button" onClick={() => setShowMassTtlModal(false)}>
                  Batal
                </Button>
                <Button 
                  type="button" 
                  onClick={handleSaveMassTTL}
                  disabled={isSavingMassTTL}
                  className="bg-[var(--ui-primary-btn,var(--ui-primary))] hover:opacity-90 text-white font-black text-xs px-4 py-2 rounded-[var(--ui-radius-control)] flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Save size={14} />
                  <span>{isSavingMassTTL ? 'Menyimpan…' : 'Simpan Update TTL Massal'}</span>
                </Button>
              </div>
            </div>

          </div>
        </Modal>
      )}

      {/* Modal: Ajukan Cetak Ulang */}
      {showRequestModal && (
        <Modal
          isOpen={true}
          onClose={() => setShowRequestModal(null)}
          title="Ajukan Cetak Ulang Kartu"
          maxWidth="max-w-md"
        >
          <form 
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                const res = await fetch('/api/student-card-requests', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
                  body: JSON.stringify({
                    action: 'create',
                    nis: showRequestModal.nis,
                    nama: showRequestModal.namaSiswa || showRequestModal.name,
                    kelas: showRequestModal.class_name || 'Umum',
                    alasan: requestReason
                  })
                });
                if (res.ok) {
                  showToast('Permohonan cetak ulang berhasil diajukan!');
                  setShowRequestModal(null);
                  fetchRequests();
                } else {
                  showToast('Gagal mengajukan permohonan', 'error');
                }
              } catch (e) {
                console.error(e);
                showToast('Gagal menghubungi server', 'error');
              }
            }} 
            className="space-y-4 font-inherit"
          >
            <div className="p-3 bg-[var(--ui-primary)]/10 border border-[var(--ui-primary)]/20 rounded-[var(--ui-radius-control)] text-xs space-y-1">
              <p className="text-[var(--ui-primary)] font-bold uppercase tracking-wider text-[10px]">Detail Siswa</p>
              <p className="font-black text-slate-800 text-sm">
                {showRequestModal.namaSiswa || showRequestModal.name} ({showRequestModal.nis})
              </p>
              <p className="text-slate-600 font-semibold">Kelas: {showRequestModal.class_name || '-'}</p>
              <p className="text-[var(--ui-primary)] font-bold pt-1">
                Frekuensi Cetak Sebelumnya: {requestStats[showRequestModal.nis] || 0} kali
              </p>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-1">
                Alasan Penggantian Kartu
              </label>
              <UISelect
                value={requestReason} 
                onChange={e => setRequestReason(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-[var(--ui-radius-control)] text-xs font-bold text-slate-800"
              >
                <option value="Kartu Hilang">Kartu Hilang</option>
                <option value="Kartu Rusak / Patah">Kartu Rusak / Patah</option>
                <option value="Perbaikan Data Siswa">Perbaikan Data Siswa</option>
                <option value="Siswa Baru (Cetak Pertama)">Siswa Baru (Cetak Pertama)</option>
                <option value="Lainnya">Lainnya</option>
              </UISelect>
            </div>

            {requestReason === 'Lainnya' && (
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-1">
                  Keterangan Tambahan
                </label>
                <textarea 
                  required 
                  placeholder="Masukkan alasan detail…" 
                  onChange={e => setRequestReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-[var(--ui-radius-control)] text-xs font-semibold focus:outline-none focus:bg-white" 
                />
              </div>
            )}

            <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
              <Button variant="outline" type="button" onClick={() => setShowRequestModal(null)}>Batal</Button>
              <Button type="submit" className="bg-[var(--ui-primary-btn,var(--ui-primary))] hover:opacity-90 text-white font-black px-4 rounded-[var(--ui-radius-control)]">Kirim Pengajuan</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal: Edit Manual Data Kartu */}
      {editForm && (
        <Modal
          isOpen={true}
          onClose={() => setEditForm(null)}
          title={editForm.isNew ? 'Buat Data Siswa Manual' : 'Edit Data Kartu Siswa'}
          maxWidth="max-w-md"
        >
          <form onSubmit={handleSaveManual} className="space-y-3.5 font-inherit">
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-1">NIS</label>
              <input 
                required 
                disabled={!editForm.isNew} 
                value={editForm.data.nis || ''} 
                onChange={e => setEditForm({ ...editForm, data: { ...editForm.data, nis: e.target.value } })} 
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-[var(--ui-radius-control)] text-xs font-bold disabled:bg-slate-100 disabled:text-slate-400" 
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-1">Nama Lengkap</label>
              <input 
                required 
                value={editForm.data.name || editForm.data.namaSiswa || ''} 
                onChange={e => setEditForm({ ...editForm, data: { ...editForm.data, name: e.target.value, namaSiswa: e.target.value } })} 
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-[var(--ui-radius-control)] text-xs font-bold focus:ring-2 focus:ring-[var(--ui-primary)]/20 focus:border-[var(--ui-primary)]" 
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-1">Tempat, Tanggal Lahir (TTL)</label>
              <input 
                placeholder="Contoh: Bekasi, 12 Agustus 2008" 
                value={editForm.data.ttl || ''} 
                onChange={e => setEditForm({ ...editForm, data: { ...editForm.data, ttl: e.target.value } })} 
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-[var(--ui-radius-control)] text-xs font-semibold focus:ring-2 focus:ring-[var(--ui-primary)]/20 focus:border-[var(--ui-primary)]" 
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-1">Jurusan</label>
              <UISelect 
                required 
                value={editForm.data.major || editForm.data.jurusan || ''} 
                onChange={e => setEditForm({ ...editForm, data: { ...editForm.data, major: e.target.value, jurusan: e.target.value } })} 
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-[var(--ui-radius-control)] text-xs font-bold text-slate-800"
              >
                <option value="">- Pilih Jurusan -</option>
                {majors.filter(m => m !== 'all').map(m => <option key={m} value={m}>{m}</option>)}
              </UISelect>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-1">Kelas</label>
              <input 
                value={editForm.data.class_name || editForm.data.kelas || ''} 
                onChange={e => setEditForm({ ...editForm, data: { ...editForm.data, class_name: e.target.value, kelas: e.target.value } })} 
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-[var(--ui-radius-control)] text-xs font-bold" 
              />
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
              <Button variant="outline" type="button" onClick={() => setEditForm(null)}>Batal</Button>
              <Button type="submit" className="bg-[var(--ui-primary-btn,var(--ui-primary))] hover:opacity-90 text-white font-black px-4 rounded-[var(--ui-radius-control)]">Simpan Data</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Global Toast Alert */}
      {toast && (
        <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-[var(--ui-radius-control)] shadow-lg font-bold text-xs flex items-center gap-2.5 animate-in slide-in-from-bottom-5 text-white ${
          toast.type === 'error' ? 'bg-rose-600' : 'bg-emerald-600'
        } z-[9999]`}>
          {toast.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />} 
          <span>{toast.message}</span>
        </div>
      )}

      {/* Print Media Query CSS */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .print-area, .print-area * { visibility: visible !important; }
          .print-area { position: fixed; top: 0; left: 0; width: 100%; }
        }
      `}</style>
    </div>
  );
}
