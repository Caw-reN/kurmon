import { useState, useEffect, useMemo, useCallback } from'react';
import { BookOpen } from'lucide-react';
import useAuthStore from'../../store/monitoring/authStore.js';
import { useDataStore } from'../../store/useDataStore.js';
import * as XLSX from'xlsx';
import { Clock, CheckCircle2, AlertCircle, X, Calendar, Users, ClipboardList, Award, FileText, MessageSquare, RefreshCw, Download, Edit2, Trash2, Plus, Minus, Search, ArrowUpDown, Filter, Coffee, FileDown, ChevronDown, ChevronLeft, Sparkles, Check, CheckCheck, Lightbulb, UserCheck, UserX, HeartPulse, UserMinus, ShieldAlert, ArrowRight, ArrowLeft, Zap, Wrench } from'lucide-react';
import { CustomSelect } from'../../components/CustomSelect.jsx';
import { PageHeader } from'../../components/monitoring/ui/index.js';
import { PaginationControls } from'../../components/ui/PaginationControls.jsx';
import { Modal, Button } from '../../components/ui.jsx';


const HARI_ID = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
const METODE_OPTIONS = ['Ceramah & Diskusi','Problem Based Learning','Project Based Learning','Discovery Learning','Cooperative Learning','Demonstrasi & Praktik','Flipped Classroom','Inkuiri','STEM','Lainnya'
];

const JENIS_CATATAN_LABEL = {
  umum: { label:'Catatan Umum', color:'bg-slate-100 text-slate-700' },
  akademik: { label:'Akademik', color:'bg-blue-100 text-blue-700' },
  perilaku: { label:'Perilaku', color:'bg-amber-100 text-amber-700' },
  prestasi: { label:'Prestasi', color:'bg-emerald-100 text-emerald-700' },
  kesehatan: { label:'Kesehatan', color:'bg-rose-100 text-rose-700' },
};

export function getJurnalSubmissionStatus(tanggalKBM, submittedAt) {
  if (!submittedAt) {
    const today = new Date().toISOString().split('T')[0];
    if (tanggalKBM && tanggalKBM < today) {
      const diffMs = new Date(today) - new Date(tanggalKBM);
      const diffDays = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)));
      return { 
        status: 'unsubmitted_past', 
        isLate: true, 
        diffDays, 
        label: `Belum Diisi (H-${diffDays})`,
        timeStr: '',
        dateStr: '',
        fullSubmitStr: ''
      };
    }
    return { 
      status: 'unsubmitted', 
      isLate: false, 
      diffDays: 0, 
      label: 'Belum Diisi',
      timeStr: '',
      dateStr: '',
      fullSubmitStr: ''
    };
  }

  const submitObj = new Date(submittedAt);
  const kbmObj = tanggalKBM ? new Date(tanggalKBM) : submitObj;

  const dSubmit = new Date(submitObj.getFullYear(), submitObj.getMonth(), submitObj.getDate());
  const dKbm = new Date(kbmObj.getFullYear(), kbmObj.getMonth(), kbmObj.getDate());

  const diffMs = dSubmit - dKbm;
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  const timeStr = submitObj.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace('.', ':');
  const dateStr = submitObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

  if (diffDays > 0) {
    return {
      status: 'submitted_late',
      isLate: true,
      diffDays,
      timeStr,
      dateStr,
      fullSubmitStr: `${dateStr}, ${timeStr} WIB`,
      label: `Terlambat (H+${diffDays})`,
      note: `Diisi terlambat pada ${dateStr} pukul ${timeStr} WIB (H+${diffDays})`
    };
  }

  return {
    status: 'submitted_on_time',
    isLate: false,
    diffDays: 0,
    timeStr,
    dateStr,
    fullSubmitStr: `${dateStr}, ${timeStr} WIB`,
    label: 'Tepat Waktu',
    note: `Diisi pada ${dateStr} pukul ${timeStr} WIB`
  };
}

function StatusBadge({ submitted, isLate, submittedAt, tanggal, showTime = true }) {
  const statusInfo = getJurnalSubmissionStatus(tanggal, submittedAt);

  if (statusInfo.status === 'submitted_late') {
    return (
      <div className="inline-flex flex-col items-center">
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-[var(--ui-radius-small)] text-[10px] font-black uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200/90 shadow-2xs">
          <Clock size={10} className="stroke-[3] text-rose-600 shrink-0" />
          <span>{statusInfo.label}</span>
        </span>
        {showTime && statusInfo.timeStr && (
          <span className="text-[9px] font-bold text-rose-600/80 mt-0.5" title={statusInfo.fullSubmitStr}>
            {statusInfo.timeStr} WIB
          </span>
        )}
      </div>
    );
  }

  if (statusInfo.status === 'submitted_on_time') {
    return (
      <div className="inline-flex flex-col items-center">
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-[var(--ui-radius-small)] text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200/90 shadow-2xs">
          <CheckCircle2 size={10} className="stroke-[3] text-emerald-600 shrink-0" />
          <span>Tepat Waktu</span>
        </span>
        {showTime && statusInfo.timeStr && (
          <span className="text-[9px] font-bold text-emerald-700/80 mt-0.5" title={statusInfo.fullSubmitStr}>
            {statusInfo.timeStr} WIB
          </span>
        )}
      </div>
    );
  }

  if (statusInfo.status === 'unsubmitted_past') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[var(--ui-radius-small)] text-[10px] font-black uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200 shadow-2xs">
        <AlertCircle size={10} className="stroke-[3] text-amber-600 shrink-0" />
        <span>Terlewat (H-{statusInfo.diffDays})</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[var(--ui-radius-small)] text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-500 border border-slate-200">
      <AlertCircle size={10} className="stroke-[3] shrink-0" />
      <span>Belum Diisi</span>
    </span>
  );
}

// Modal Form Isi Jurnal - Modern, Intuitive, Fast & Auto-Synced
function JurnalModal({ jurnal, onSave, onClose, students = [], studentAttendance = [] }) {
  const className = jurnal?.kelas || '';
  const user = useAuthStore(state => state.user);
  const authToken = user?.authToken;

  // Normalized Class Name Matcher
  const normalizeText = (txt) => (txt || '').replace(/[\s\-_.]/g, '').toLowerCase();

  // Local fallback students from store
  const localClassStudents = useMemo(() => {
    const target = normalizeText(className);
    return students.filter(s => {
      const sClass = normalizeText(s.class_name || s.kelas || s.rombel || '');
      return sClass === target;
    });
  }, [students, className]);

  // Live Attendance State from Database & Interactive Roll Call
  const [liveStudents, setLiveStudents] = useState(() => {
    if (jurnal?.rincian_absensi && Array.isArray(jurnal.rincian_absensi) && jurnal.rincian_absensi.length > 0) {
      return jurnal.rincian_absensi;
    }
    return [];
  });
  const [isLoadingAttendance, setIsLoadingAttendance] = useState(true);
  const [searchRollCall, setSearchRollCall] = useState('');
  const [filterRollCall, setFilterRollCall] = useState('all'); // 'all' | 'hadir' | 'sakit' | 'izin' | 'alpa'

  const [form, setForm] = useState({
    id: jurnal?.id || null,
    kelas: jurnal?.kelas || '',
    mapel: jurnal?.mapel || '',
    jam_ke: jurnal?.jam_ke || 1,
    slot_label: jurnal?.slot_label || '',
    materi_pokok: jurnal?.materi_pokok || '',
    kegiatan_pembelajaran: jurnal?.kegiatan_pembelajaran || '',
    metode_pembelajaran: jurnal?.metode_pembelajaran || 'Ceramah & Diskusi',
    catatan: jurnal?.catatan || '',
    jumlah_hadir: jurnal?.jumlah_hadir || 0,
    rincian_absensi: jurnal?.rincian_absensi || [],
    tanggal: jurnal?.tanggal || new Date().toISOString().split('T')[0],
    status: 'submitted',
  });
  
  // DRAFT LOGIC - Muat Draf Saat Inisialisasi
  useEffect(() => {
    if (!jurnal?.id) { // Hanya muat draf untuk entri jurnal baru
      try {
        const draftKey = `draft_jurnal_${user?.code || 'guest'}`;
        const savedDraft = localStorage.getItem(draftKey);
        if (savedDraft) {
          const parsed = JSON.parse(savedDraft);
          // Gabungkan draf dengan nilai awal agar id/kelas bawaan dari props tidak hilang
          setForm(prev => ({ ...prev, ...parsed, id: prev.id, kelas: prev.kelas || parsed.kelas }));
        }
      } catch (e) {
        console.error("Gagal membaca draf jurnal:", e);
      }
    }
  }, [jurnal?.id, user?.code]);

  // DRAFT LOGIC - Simpan Draf Otomatis Saat Ketik
  useEffect(() => {
    if (!jurnal?.id) {
      const draftKey = `draft_jurnal_${user?.code || 'guest'}`;
      const draftData = {
        mapel: form.mapel,
        materi_pokok: form.materi_pokok,
        kegiatan_pembelajaran: form.kegiatan_pembelajaran,
        metode_pembelajaran: form.metode_pembelajaran,
        catatan: form.catatan,
      };
      localStorage.setItem(draftKey, JSON.stringify(draftData));
    }
  }, [form, jurnal?.id, user?.code]);

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Late Calculation for Form Modal
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const isFillingPastDate = form.tanggal && form.tanggal < todayStr;
  const diffDaysFromToday = useMemo(() => {
    if (!isFillingPastDate) return 0;
    const dKbm = new Date(form.tanggal);
    const dNow = new Date(todayStr);
    return Math.max(1, Math.round((dNow - dKbm) / (1000 * 60 * 60 * 24)));
  }, [form.tanggal, todayStr, isFillingPastDate]);
  const existingStatusInfo = useMemo(() => getJurnalSubmissionStatus(form.tanggal, jurnal?.submitted_at), [form.tanggal, jurnal?.submitted_at]);

  // Fetch Live Attendance from /api/kedisiplinan/absensi-kelas
  const fetchLiveAttendance = useCallback(async () => {
    if (!className) return;
    if (jurnal?.rincian_absensi && Array.isArray(jurnal.rincian_absensi) && jurnal.rincian_absensi.length > 0) {
      setIsLoadingAttendance(false);
      return;
    }

    setIsLoadingAttendance(true);
    try {
      if (authToken) {
        const res = await fetch(`/api/kedisiplinan/absensi-kelas?kelas=${encodeURIComponent(className)}&tanggal=${form.tanggal}`, {
          headers: { "Authorization": `Bearer ${authToken}` }
        });
        const json = await res.json();
        if (json.ok && Array.isArray(json.data) && json.data.length > 0) {
          setLiveStudents(json.data);
          setForm(f => ({ ...f, rincian_absensi: json.data }));
          setIsLoadingAttendance(false);
          return;
        }
      }
    } catch (e) {
      console.warn("Failed fetching live attendance, using local fallback", e);
    }

    // Fallback if API returns empty or fails
    if (localClassStudents.length > 0) {
      const mapped = localClassStudents.map(s => {
        const nis = String(s.nis || s.code || s.id || '').trim();
        const att = studentAttendance.find(a => {
          const isSameDate = a.tanggal === form.tanggal || a.tanggal?.startsWith(form.tanggal);
          return isSameDate && String(a.siswa_nis).trim() === nis && a.approval_status !== 'rejected';
        });
        return {
          nis,
          name: s.namaSiswa || s.name || s.nama || nis,
          class_name: s.class_name || s.kelas || className,
          status: att ? att.status : 'Hadir',
          keterangan: att?.keterangan || ''
        };
      });
      setLiveStudents(mapped);
      setForm(f => ({ ...f, rincian_absensi: mapped }));
    } else {
      setLiveStudents([]);
    }
    setIsLoadingAttendance(false);
  }, [className, form.tanggal, authToken, localClassStudents, studentAttendance, jurnal?.rincian_absensi]);

  useEffect(() => {
    fetchLiveAttendance();
  }, [fetchLiveAttendance]);

  // Derived Attendance Stats
  const totalStudentsCount = liveStudents.length > 0 ? liveStudents.length : localClassStudents.length;

  const absentList = useMemo(() => {
    return liveStudents.filter(s => {
      const st = (s.status || '').toLowerCase();
      return ['sakit', 'izin', 'alpa', 'alpha', 'dispen', 'dispensasi', 'terlambat'].includes(st);
    });
  }, [liveStudents]);

  const sakitCount = useMemo(() => liveStudents.filter(s => (s.status || '').toLowerCase() === 'sakit').length, [liveStudents]);
  const izinCount = useMemo(() => liveStudents.filter(s => ['izin', 'dispen', 'dispensasi'].includes((s.status || '').toLowerCase())).length, [liveStudents]);
  const alpaCount = useMemo(() => liveStudents.filter(s => ['alpa', 'alpha'].includes((s.status || '').toLowerCase())).length, [liveStudents]);

  const totalCalculatedHadir = Math.max(0, totalStudentsCount - absentList.length);

  // Auto initialize jumlah_hadir when data is loaded
  useEffect(() => {
    if (!form.id && form.jumlah_hadir === 0 && totalStudentsCount > 0) {
      setForm(f => ({ ...f, jumlah_hadir: totalCalculatedHadir }));
    }
  }, [totalStudentsCount, totalCalculatedHadir, form.id]);

  // Filtered Students for Roll Call
  const filteredRollCallStudents = useMemo(() => {
    return liveStudents.filter(s => {
      // Filter tab
      const st = (s.status || 'Hadir').toLowerCase();
      if (filterRollCall === 'hadir' && st !== 'hadir') return false;
      if (filterRollCall === 'sakit' && st !== 'sakit') return false;
      if (filterRollCall === 'izin' && !['izin', 'dispen', 'dispensasi'].includes(st)) return false;
      if (filterRollCall === 'alpa' && !['alpa', 'alpha'].includes(st)) return false;

      // Filter search
      if (searchRollCall) {
        const q = searchRollCall.toLowerCase();
        const name = (s.name || '').toLowerCase();
        const nis = (s.nis || '').toLowerCase();
        return name.includes(q) || nis.includes(q);
      }
      return true;
    });
  }, [liveStudents, filterRollCall, searchRollCall]);

  // Update Individual Student Status (Absen Ulang Mapel)
  const handleUpdateStudentStatus = (nis, newStatus) => {
    setLiveStudents(prev => {
      const updated = prev.map(s => {
        if (s.nis === nis) {
          return { ...s, status: newStatus };
        }
        return s;
      });
      const absent = updated.filter(s => {
        const st = (s.status || '').toLowerCase();
        return ['sakit', 'izin', 'alpa', 'alpha', 'dispen', 'dispensasi', 'terlambat'].includes(st);
      });
      const newHadir = Math.max(0, updated.length - absent.length);
      setForm(f => ({ ...f, jumlah_hadir: newHadir, rincian_absensi: updated }));
      return updated;
    });
  };

  // Update Individual Student Note
  const handleUpdateStudentKeterangan = (nis, keterangan) => {
    setLiveStudents(prev => {
      const updated = prev.map(s => {
        if (s.nis === nis) {
          return { ...s, keterangan };
        }
        return s;
      });
      setForm(f => ({ ...f, rincian_absensi: updated }));
      return updated;
    });
  };

  // Quick Preset Handlers
  const handleSetSemuaHadir = () => {
    setLiveStudents(prev => {
      const updated = prev.map(s => ({ ...s, status: 'Hadir', keterangan: '' }));
      setForm(f => ({ ...f, jumlah_hadir: updated.length, rincian_absensi: updated }));
      return updated;
    });
  };

  const handleSetSinkronAbsensi = () => {
    fetchLiveAttendance();
  };

  const handleStepHadir = (delta) => {
    setForm(f => {
      const maxVal = totalStudentsCount || 100;
      const nextVal = Math.max(0, Math.min(maxVal, (f.jumlah_hadir || 0) + delta));
      return { ...f, jumlah_hadir: nextVal };
    });
  };

  // Quick Lesson Plan Templates
  const handleApplyKegiatanTemplate = (templateType) => {
    const mapelName = form.mapel || 'Mata Pelajaran';
    const materiName = form.materi_pokok || 'materi pokok';

    if (templateType === 'lengkap') {
      setForm(f => ({
        ...f,
        kegiatan_pembelajaran: `1. Pendahuluan: Berdoa, memeriksa presensi siswa, dan apersepsi materi ${mapelName}.\n2. Kegiatan Inti: Guru menjelaskan materi ${materiName}, siswa menyimak, berdiskusi aktif, dan mengerjakan latihan/tugas terbimbing.\n3. Penutup: Refleksi pembelajaran, sesi tanya jawab, evaluasi singkat, dan penugasan mandiri.`
      }));
    } else if (templateType === 'praktik') {
      setForm(f => ({
        ...f,
        kegiatan_pembelajaran: `1. Persiapan: Pengarahan K3 dan pembagian perangkat/komputer praktikum ${materiName}.\n2. Praktik Langsung: Siswa mempraktikkan jobsheet secara mandiri/kelompok dengan bimbingan guru dan troubleshooting aktif.\n3. Evaluasi: Pengujian output hasil praktikum dan perapihan kembali alat/ruang lab.`
      }));
    } else if (templateType === 'diskusi') {
      setForm(f => ({
        ...f,
        kegiatan_pembelajaran: `1. Pembentukan Kelompok: Pembagian studi kasus terkait ${materiName} ke dalam kelompok kerja.\n2. Diskusi & Pemecahan Masalah: Setiap kelompok mendiskusikan solusi dan menyusun bahan paparan.\n3. Presentasi & Penguatan: Presentasi perwakilan kelompok, tanggapan rekan, dan penguatan konsep oleh guru.`
      }));
    }
  };

  // Quick Note Templates
  const handleAddCatatan = (noteText) => {
    setForm(f => ({
      ...f,
      catatan: f.catatan ? `${f.catatan}. ${noteText}` : noteText
    }));
  };

  const [step, setStep] = useState(1);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    if (!form.materi_pokok || !form.kegiatan_pembelajaran) {
      setErrorMsg('Materi pokok dan kegiatan pembelajaran wajib diisi!');
      setStep(2);
      return;
    }
    setSaving(true);
    const result = await onSave(form);
    if (result?.error) {
      setErrorMsg(result.error);
    } else {
      // Hapus draf setelah berhasil simpan (jika ini entri baru)
      if (!jurnal?.id) {
        localStorage.removeItem(`draft_jurnal_${user?.code || 'guest'}`);
      }
    }
    setSaving(false);
  };

  // Common quick method options
  const QUICK_METHODS = [
    'Ceramah & Diskusi',
    'Demonstrasi & Praktik',
    'Project Based Learning',
    'Problem Based Learning',
    'Cooperative Learning',
    'Discovery Learning'
  ];

  return (
    <Modal isOpen={true} onClose={onClose} title={form.id ? 'Edit Jurnal Pembelajaran' : 'Isi Jurnal Harian'} maxWidth="max-w-2xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        
        {/* Step Indicator Header */}
        <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-100/90 rounded-[var(--ui-radius-control)] border border-slate-200/60">
          <button
            type="button"
            onClick={() => { setErrorMsg(''); setStep(1); }}
            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-black transition-all cursor-pointer ${
              step === 1 
                ? 'bg-white text-[var(--ui-primary)] shadow-xs border border-emerald-200/70' 
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${
              step === 1 ? 'bg-[var(--ui-primary)] text-white' : 'bg-slate-200 text-slate-700'
            }`}>
              1
            </span>
            <span className="truncate">1. Presensi Siswa</span>
          </button>

          <button
            type="button"
            onClick={() => { setErrorMsg(''); setStep(2); }}
            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-black transition-all cursor-pointer ${
              step === 2 
                ? 'bg-white text-[var(--ui-primary)] shadow-xs border border-emerald-200/70' 
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${
              step === 2 ? 'bg-[var(--ui-primary)] text-white' : 'bg-slate-200 text-slate-700'
            }`}>
              2
            </span>
            <span className="truncate">2. Materi &amp; KBM</span>
          </button>
        </div>

        {/* Status Pengisian / Keterlambatan Notice */}
        {jurnal?.submitted_at ? (
          <div className="p-3 rounded-[var(--ui-radius-card)] bg-slate-50 border border-slate-200/90 text-xs text-slate-700 flex items-center justify-between flex-wrap gap-2 shadow-2xs">
            <div className="flex items-center gap-2">
              <Clock size={14} className="text-slate-500 shrink-0" />
              <span>Waktu Pengisian: <strong className="text-slate-800">{existingStatusInfo.fullSubmitStr}</strong></span>
            </div>
            {existingStatusInfo.isLate ? (
              <span className="text-[10px] font-black px-2.5 py-0.5 rounded-lg bg-rose-100 text-rose-800 border border-rose-300">
                ⚠️ Terlambat (Diisi H+{existingStatusInfo.diffDays})
              </span>
            ) : (
              <span className="text-[10px] font-black px-2.5 py-0.5 rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-300">
                ✓ Tepat Waktu
              </span>
            )}
          </div>
        ) : isFillingPastDate ? (
          <div className="p-3.5 rounded-[var(--ui-radius-card)] bg-amber-50/90 border border-amber-300/80 text-amber-900 text-xs flex items-start gap-2.5 shadow-2xs">
            <AlertCircle size={17} className="text-amber-600 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-extrabold text-amber-950">
                  Pengisian Jurnal Tanggal Lampau (Terlambat)
                </p>
                <span className="text-[10px] font-black px-2 py-0.5 rounded bg-amber-200/80 text-amber-900 border border-amber-300">
                  Note: Terlambat H+{diffDaysFromToday}
                </span>
              </div>
              <p className="text-[11px] text-amber-800 mt-1 leading-relaxed">
                Jurnal ini dicatat untuk jadwal mengajar tanggal <b>{new Date(form.tanggal).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</b>. Jam pengisian riil saat submit akan otomatis dicatat sebagai bukti keterlambatan di sistem.
              </p>
            </div>
          </div>
        ) : null}

        {/* TAHAP 1: PRESENSI & KEHADIRAN KELAS */}
        {step === 1 && (
          <div className="space-y-4 animate-in fade-in-50 duration-200">
            {/* Header KBM Card */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-[var(--ui-radius-card)] bg-gradient-to-r from-emerald-50/80 via-teal-50/50 to-slate-50 border border-emerald-100/80 shadow-2xs">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs font-extrabold text-slate-800">
                  <Calendar size={15} className="text-[var(--ui-primary)]" />
                  <span>{new Date(form.tanggal).toLocaleDateString('id-ID', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                  <span className="px-2 py-0.5 rounded-md bg-white border border-emerald-200/80 text-emerald-900 font-extrabold">{form.kelas}</span>
                  <span>&bull;</span>
                  <span className="text-[var(--ui-primary)] font-extrabold">{form.mapel}</span>
                </div>
              </div>
              <div className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-emerald-200/70 text-xs font-bold text-emerald-800 shadow-2xs">
                <Clock size={13} className="text-emerald-600" />
                <span>{form.slot_label || `Jam ke-${form.jam_ke}`}</span>
              </div>
            </div>

            {/* Real-time Attendance Breakdown Card with Interactive Student Roll Call */}
            <div className="rounded-[var(--ui-radius-card)] border border-slate-200/90 bg-white p-4 space-y-3.5 shadow-xs">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <Users size={15} className="text-[var(--ui-primary)]" />
                  Presensi &amp; Absen Ulang Siswa ({className})
                </span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] font-extrabold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200/70">
                    Total: {totalStudentsCount} Siswa
                  </span>
                  <button
                    type="button"
                    onClick={handleSetSinkronAbsensi}
                    disabled={isLoadingAttendance}
                    className="p-1 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
                    title="Sinkronkan ulang data kehadiran dari mesin/piket"
                  >
                    <RefreshCw size={13} className={isLoadingAttendance ? 'animate-spin' : ''} />
                  </button>
                </div>
              </div>

              {/* Quick Attendance KPI Filter Badges */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => setFilterRollCall(filterRollCall === 'hadir' ? 'all' : 'hadir')}
                  className={`flex items-center gap-2 p-2 rounded-xl border text-left cursor-pointer transition-all ${
                    filterRollCall === 'hadir' ? 'bg-emerald-100/80 border-emerald-400 ring-2 ring-emerald-400/20' : 'bg-emerald-50/70 border-emerald-200/60 hover:bg-emerald-50'
                  }`}
                >
                  <UserCheck size={14} className="text-emerald-600 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[9px] font-black uppercase tracking-wider text-emerald-700">Hadir</p>
                    <p className="text-xs font-black text-emerald-900">{totalCalculatedHadir} Siswa</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setFilterRollCall(filterRollCall === 'sakit' ? 'all' : 'sakit')}
                  className={`flex items-center gap-2 p-2 rounded-xl border text-left cursor-pointer transition-all ${
                    filterRollCall === 'sakit' ? 'bg-amber-100/80 border-amber-400 ring-2 ring-amber-400/20' : 'bg-amber-50/70 border-amber-200/60 hover:bg-amber-50'
                  }`}
                >
                  <HeartPulse size={14} className="text-amber-600 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[9px] font-black uppercase tracking-wider text-amber-700">Sakit</p>
                    <p className="text-xs font-black text-amber-900">{sakitCount} Siswa</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setFilterRollCall(filterRollCall === 'izin' ? 'all' : 'izin')}
                  className={`flex items-center gap-2 p-2 rounded-xl border text-left cursor-pointer transition-all ${
                    filterRollCall === 'izin' ? 'bg-blue-100/80 border-blue-400 ring-2 ring-blue-400/20' : 'bg-blue-50/70 border-blue-200/60 hover:bg-blue-50'
                  }`}
                >
                  <UserMinus size={14} className="text-blue-600 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[9px] font-black uppercase tracking-wider text-blue-700">Izin</p>
                    <p className="text-xs font-black text-blue-900">{izinCount} Siswa</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setFilterRollCall(filterRollCall === 'alpa' ? 'all' : 'alpa')}
                  className={`flex items-center gap-2 p-2 rounded-xl border text-left cursor-pointer transition-all ${
                    filterRollCall === 'alpa' ? 'bg-rose-100/80 border-rose-400 ring-2 ring-rose-400/20' : 'bg-rose-50/70 border-rose-200/60 hover:bg-rose-50'
                  }`}
                >
                  <UserX size={14} className="text-rose-600 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[9px] font-black uppercase tracking-wider text-rose-700">Alpa</p>
                    <p className="text-xs font-black text-rose-900">{alpaCount} Siswa</p>
                  </div>
                </button>
              </div>

              {/* Interactive Student List Table / Roll Call Section */}
              <div className="pt-1 space-y-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="relative flex-1 min-w-[160px]">
                    <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Cari nama / NIS siswa..."
                      value={searchRollCall}
                      onChange={e => setSearchRollCall(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg font-medium focus:outline-none focus:ring-1 focus:ring-[var(--ui-primary)]"
                    />
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleSetSemuaHadir}
                      className="text-[10px] font-bold px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 cursor-pointer transition-all active:scale-95 flex items-center gap-1 shrink-0"
                    >
                      <CheckCheck size={12} />
                      <span>Semua Hadir</span>
                    </button>
                    {filterRollCall !== 'all' && (
                      <button
                        type="button"
                        onClick={() => setFilterRollCall('all')}
                        className="text-[10px] font-bold px-2 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 cursor-pointer"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                </div>

                {/* Roll Call Student Rows */}
                <div className="max-h-[220px] sm:max-h-[260px] overflow-y-auto pr-1 space-y-1.5 custom-scrollbar border border-slate-100 rounded-xl p-1.5 bg-slate-50/50">
                  {filteredRollCallStudents.length === 0 ? (
                    <div className="py-6 text-center text-xs text-slate-400 font-medium">
                      Tidak ada siswa ditemukan dalam filter ini.
                    </div>
                  ) : (
                    filteredRollCallStudents.map((s, idx) => {
                      const currentStatus = s.status || 'Hadir';
                      const isNonHadir = currentStatus !== 'Hadir';

                      return (
                        <div
                          key={s.nis || idx}
                          className={`p-2 rounded-lg border transition-all ${
                            currentStatus === 'Hadir' ? 'bg-white border-slate-200/70 hover:border-emerald-200' :
                            currentStatus === 'Sakit' ? 'bg-amber-50/40 border-amber-200' :
                            ['Izin', 'Dispen', 'Dispensasi'].includes(currentStatus) ? 'bg-blue-50/40 border-blue-200' :
                            'bg-rose-50/40 border-rose-200'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] font-mono font-bold text-slate-400">#{idx + 1}</span>
                                <span className="text-xs font-black text-slate-800 truncate" title={s.name}>{s.name}</span>
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono">NIS: {s.nis}</div>
                            </div>

                            {/* Status Switcher (H / S / I / A) */}
                            <div className="flex items-center gap-1 shrink-0 bg-slate-100/80 p-0.5 rounded-lg border border-slate-200/60">
                              <button
                                type="button"
                                onClick={() => handleUpdateStudentStatus(s.nis, 'Hadir')}
                                className={`px-2 py-1 rounded-md text-[10px] font-black transition-all cursor-pointer border-none ${
                                  currentStatus === 'Hadir'
                                    ? 'bg-emerald-600 text-white shadow-2xs'
                                    : 'text-slate-600 hover:text-emerald-700 hover:bg-white/80'
                                }`}
                                title="Hadir"
                              >
                                H
                              </button>

                              <button
                                type="button"
                                onClick={() => handleUpdateStudentStatus(s.nis, 'Sakit')}
                                className={`px-2 py-1 rounded-md text-[10px] font-black transition-all cursor-pointer border-none ${
                                  currentStatus === 'Sakit'
                                    ? 'bg-amber-500 text-white shadow-2xs'
                                    : 'text-slate-600 hover:text-amber-700 hover:bg-white/80'
                                }`}
                                title="Sakit"
                              >
                                S
                              </button>

                              <button
                                type="button"
                                onClick={() => handleUpdateStudentStatus(s.nis, 'Izin')}
                                className={`px-2 py-1 rounded-md text-[10px] font-black transition-all cursor-pointer border-none ${
                                  ['Izin', 'Dispen', 'Dispensasi'].includes(currentStatus)
                                    ? 'bg-blue-600 text-white shadow-2xs'
                                    : 'text-slate-600 hover:text-blue-700 hover:bg-white/80'
                                }`}
                                title="Izin"
                              >
                                I
                              </button>

                              <button
                                type="button"
                                onClick={() => handleUpdateStudentStatus(s.nis, 'Alpa')}
                                className={`px-2 py-1 rounded-md text-[10px] font-black transition-all cursor-pointer border-none ${
                                  ['Alpa', 'Alpha'].includes(currentStatus)
                                    ? 'bg-rose-600 text-white shadow-2xs'
                                    : 'text-slate-600 hover:text-rose-700 hover:bg-white/80'
                                }`}
                                title="Alpa"
                              >
                                A
                              </button>
                            </div>
                          </div>

                          {/* Keterangan input for non-hadir */}
                          {isNonHadir && (
                            <div className="mt-1.5 pt-1.5 border-t border-slate-200/50 flex items-center gap-1.5">
                              <span className="text-[10px] font-bold text-slate-500 shrink-0">Alasan:</span>
                              <input
                                type="text"
                                placeholder={`Keterangan ${currentStatus} (contoh: izin UKS / terlambat)...`}
                                value={s.keterangan || ''}
                                onChange={e => handleUpdateStudentKeterangan(s.nis, e.target.value)}
                                className="w-full px-2 py-0.5 text-[11px] bg-white border border-slate-200 rounded font-medium focus:outline-none focus:ring-1 focus:ring-[var(--ui-primary)]"
                              />
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Jumlah Siswa Hadir - Super Fast Controls */}
            <div className="space-y-2 bg-slate-50/80 p-4 rounded-[var(--ui-radius-card)] border border-slate-200/70 shadow-2xs">
              <label className="flex items-center justify-between text-[10px] font-black text-slate-600 uppercase tracking-wider">
                <span className="flex items-center gap-1.5">
                  <Users size={13} className="text-[var(--ui-primary)]" />
                  Jumlah Siswa Hadir <span className="text-rose-500 font-bold">*</span>
                </span>
                <span className="text-slate-400 font-bold">Maks: {totalStudentsCount}</span>
              </label>

              {/* Stepper Counter */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleStepHadir(-1)}
                  className="w-11 h-11 rounded-xl bg-white border border-slate-200/90 hover:bg-slate-100 active:scale-95 flex items-center justify-center text-slate-700 font-black shadow-2xs cursor-pointer transition-all shrink-0"
                  title="Kurangi 1"
                >
                  <Minus size={16} />
                </button>
                
                <div className="relative flex-1">
                  <input
                    type="number"
                    min={0}
                    max={totalStudentsCount || 100}
                    value={form.jumlah_hadir}
                    onChange={e => setForm({ ...form, jumlah_hadir: Math.max(0, parseInt(e.target.value) || 0) })}
                    className="w-full text-center py-2.5 px-3 bg-white border border-slate-200/90 rounded-xl text-lg font-black text-slate-900 focus:outline-none focus:border-[var(--ui-primary)] focus:ring-2 focus:ring-[var(--ui-primary)]/15 shadow-2xs"
                    required
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 pointer-events-none">
                    / {totalStudentsCount}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => handleStepHadir(1)}
                  className="w-11 h-11 rounded-xl bg-white border border-slate-200/90 hover:bg-slate-100 active:scale-95 flex items-center justify-center text-slate-700 font-black shadow-2xs cursor-pointer transition-all shrink-0"
                  title="Tambah 1"
                >
                  <Plus size={16} />
                </button>
              </div>

              {/* Quick Fill Buttons */}
              <div className="flex items-center gap-2 pt-1 flex-wrap">
                <button
                  type="button"
                  onClick={handleSetSemuaHadir}
                  className="text-[11px] font-extrabold px-3 py-1.5 rounded-xl bg-white hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 border border-slate-200/90 shadow-2xs cursor-pointer transition-all active:scale-95 flex items-center gap-1.5"
                >
                  <CheckCheck size={13} className="text-emerald-600" />
                  <span>Semua Hadir ({totalStudentsCount})</span>
                </button>
                {absentList.length > 0 && (
                  <button
                    type="button"
                    onClick={handleSetSinkronAbsensi}
                    className="text-[11px] font-extrabold px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/90 shadow-2xs cursor-pointer transition-all active:scale-95 flex items-center gap-1.5"
                  >
                    <Zap size={13} className="text-amber-600" />
                    <span>Sesuai Presensi ({totalCalculatedHadir})</span>
                  </button>
                )}
              </div>
            </div>

            {/* Step 1 Footer Navigation */}
            <div className="pt-3 flex items-center justify-between gap-3 border-t border-slate-100">
              <Button variant="outline" type="button" onClick={onClose} className="rounded-xl px-4 py-2.5 font-bold cursor-pointer">
                Batal
              </Button>
              <Button 
                type="button" 
                onClick={() => { setErrorMsg(''); setStep(2); }}
                className="rounded-xl px-5 py-2.5 font-extrabold bg-[var(--ui-primary)] hover:bg-[var(--ui-primary-hover,#047857)] text-white shadow-xs cursor-pointer flex items-center gap-2"
              >
                <span>Lanjut: Materi KBM</span>
                <ArrowRight size={15} />
              </Button>
            </div>
          </div>
        )}

        {/* TAHAP 2: MATERI & KEGIATAN PEMBELAJARAN */}
        {step === 2 && (
          <div className="space-y-4 animate-in fade-in-50 duration-200">
            {/* Quick Context Summary */}
            <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200/70 text-xs text-slate-700">
              <div className="flex items-center gap-2 min-w-0">
                <span className="px-2 py-0.5 rounded-md bg-white border border-emerald-200/80 text-emerald-900 font-extrabold shrink-0">{form.kelas}</span>
                <span className="font-extrabold truncate text-slate-800">{form.mapel}</span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 text-[11px] font-extrabold text-slate-600 bg-white px-2.5 py-1 rounded-lg border border-slate-200/70">
                <Users size={12} className="text-[var(--ui-primary)]" />
                <span>{form.jumlah_hadir} / {totalStudentsCount} Hadir</span>
              </div>
            </div>

            {/* Metode Pembelajaran */}
            <div className="space-y-2 bg-slate-50/80 p-3.5 rounded-[var(--ui-radius-card)] border border-slate-200/70">
              <label className="flex items-center gap-1.5 text-[10px] font-black text-slate-600 uppercase tracking-wider">
                <ClipboardList size={13} className="text-[var(--ui-primary)]" />
                Metode Pembelajaran <span className="text-rose-500 font-bold">*</span>
              </label>
              <CustomSelect
                options={METODE_OPTIONS.map(m => ({ value: m, label: m }))}
                value={form.metode_pembelajaran}
                onChange={val => setForm({ ...form, metode_pembelajaran: val })}
                className="w-full text-xs font-bold z-50 relative"
              />

              {/* Quick Method Chips */}
              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                {QUICK_METHODS.slice(0, 4).map(m => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setForm({ ...form, metode_pembelajaran: m })}
                    className={`text-[10px] font-black px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                      form.metode_pembelajaran === m
                        ? 'bg-[var(--ui-primary)] text-white border-[var(--ui-primary)] shadow-2xs'
                        : 'bg-white text-slate-600 border-slate-200/80 hover:bg-slate-100'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {/* Materi Pokok / KD */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-[10px] font-black text-slate-600 uppercase tracking-wider">
                <Award size={13} className="text-[var(--ui-primary)]" />
                Materi Pokok / Kompetensi Dasar <span className="text-rose-500 font-bold">*</span>
              </label>
              <input
                type="text"
                placeholder="Contoh: Menggambar denah jaringan komputer atau SPLDV"
                value={form.materi_pokok}
                onChange={e => setForm({ ...form, materi_pokok: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50/70 border border-slate-200/90 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:border-[var(--ui-primary)] focus:bg-white focus:ring-2 focus:ring-[var(--ui-primary)]/15 transition-all shadow-2xs"
                required
              />
            </div>

            {/* Kegiatan Pembelajaran - With Fast Outlines */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between flex-wrap gap-1">
                <label className="flex items-center gap-1.5 text-[10px] font-black text-slate-600 uppercase tracking-wider">
                  <FileText size={13} className="text-[var(--ui-primary)]" />
                  Kegiatan Pembelajaran <span className="text-rose-500 font-bold">*</span>
                </label>
                <div className="flex items-center gap-1 flex-wrap">
                  <button
                    type="button"
                    onClick={() => handleApplyKegiatanTemplate('lengkap')}
                    className="text-[10px] font-extrabold px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 border border-slate-200/80 transition-all cursor-pointer flex items-center gap-1"
                  >
                    <FileText size={11} className="text-emerald-600" />
                    <span>Lengkap</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyKegiatanTemplate('praktik')}
                    className="text-[10px] font-extrabold px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 border border-slate-200/80 transition-all cursor-pointer flex items-center gap-1"
                  >
                    <Wrench size={11} className="text-blue-600" />
                    <span>Praktik Lab</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyKegiatanTemplate('diskusi')}
                    className="text-[10px] font-extrabold px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 border border-slate-200/80 transition-all cursor-pointer flex items-center gap-1"
                  >
                    <Users size={11} className="text-indigo-600" />
                    <span>Diskusi</span>
                  </button>
                </div>
              </div>
              <textarea
                rows={3}
                placeholder="Jelaskan alur belajar (contoh: Guru memaparkan teori, siswa mempraktikkan konfigurasi di lab komputer, diakhiri tanya jawab...)"
                value={form.kegiatan_pembelajaran}
                onChange={e => setForm({ ...form, kegiatan_pembelajaran: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50/70 border border-slate-200/90 rounded-xl text-xs sm:text-sm font-medium text-slate-900 focus:outline-none focus:border-[var(--ui-primary)] focus:bg-white focus:ring-2 focus:ring-[var(--ui-primary)]/15 transition-all resize-none shadow-2xs leading-relaxed"
                required
              />
            </div>

            {/* Catatan / Kendala Kelas */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between flex-wrap gap-1">
                <label className="flex items-center gap-1.5 text-[10px] font-black text-slate-600 uppercase tracking-wider">
                  <MessageSquare size={13} className="text-[var(--ui-primary)]" />
                  Catatan / Kendala Kelas (Opsional)
                </label>
                <div className="flex items-center gap-1 flex-wrap">
                  <button
                    type="button"
                    onClick={() => handleAddCatatan('KBM berjalan dengan tertib & kondusif')}
                    className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200/80 cursor-pointer flex items-center gap-1"
                  >
                    <Check size={11} className="text-emerald-600" />
                    <span>Tertib &amp; Lancar</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddCatatan('Target materi KBM tercapai penuh')}
                    className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200/80 cursor-pointer flex items-center gap-1"
                  >
                    <Check size={11} className="text-blue-600" />
                    <span>Target Tercapai</span>
                  </button>
                </div>
              </div>
              <textarea
                rows={2}
                placeholder="Contoh: Siswa antusias menyelesaikan tugas praktikum tepat waktu..."
                value={form.catatan}
                onChange={e => setForm({ ...form, catatan: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50/70 border border-slate-200/90 rounded-xl text-xs sm:text-sm font-medium text-slate-900 focus:outline-none focus:border-[var(--ui-primary)] focus:bg-white focus:ring-2 focus:ring-[var(--ui-primary)]/15 transition-all resize-none shadow-2xs"
              />
            </div>

            {/* Error Notification */}
            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200/80 rounded-xl flex items-start gap-2.5 text-rose-700 text-xs font-bold animate-in zoom-in-95 duration-200">
                <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-600" />
                <span className="leading-relaxed">{errorMsg}</span>
              </div>
            )}

            {/* Step 2 Footer Navigation */}
            <div className="pt-3 flex items-center justify-between gap-3 border-t border-slate-100">
              <Button 
                variant="outline" 
                type="button" 
                onClick={() => { setErrorMsg(''); setStep(1); }} 
                className="rounded-xl px-4 py-2.5 font-bold cursor-pointer flex items-center gap-1.5"
              >
                <ArrowLeft size={14} />
                <span>Kembali</span>
              </Button>
              <Button 
                type="submit" 
                disabled={saving}
                className="rounded-xl px-5 py-2.5 font-extrabold bg-[var(--ui-primary)] hover:bg-[var(--ui-primary-hover,#047857)] text-white shadow-xs cursor-pointer flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <Check size={15} />
                    <span>{form.id ? 'Perbarui Jurnal' : 'Simpan Jurnal'}</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </form>
    </Modal>
  );
}

export default function JurnalHarianGuru({ classes = [], teachers = [], schedule = [], onBack }) {
  const user = useAuthStore(state => state.user);
  const authToken = user?.authToken;
  const role = user?.role ||'';
  const isKurikulum = ['admin','superadmin'].includes(role) || (role ==='waka' && (user?.division ||"").toLowerCase() ==='kurikulum');
  const teacherCode = user?.code || user?.id ||'';

  const [jurnalList, setJurnalList] = useState([]);
  const [rekapList, setRekapList] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeModal, setActiveModal] = useState(null); // null | jurnal object
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterTeacher, setFilterTeacher] = useState('');
  const [filterMonth, setFilterMonth] = useState(new Date().toISOString().slice(0, 7));
  const [activeView, setActiveView] = useState('harian'); // harian | rekap
  const [toast, setToast] = useState(null);

  const showToast = (msg, type ='success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('jam_ke');
  const [sortOrder, setSortOrder] = useState('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  const [slotsCurrentPage, setSlotsCurrentPage] = useState(1);
  const [slotsPerPage, setSlotsPerPage] = useState(20);

  const timeSlots = useDataStore(state => state.timeSlots);
  const students = useDataStore(state => state.students || []);
  const [studentAttendance, setStudentAttendance] = useState([]);
  
  const fetchStudentAttendance = useCallback(async () => {
    if (!authToken) return;
    try {
      const res = await fetch("/api/kedisiplinan/absensi", {
        headers: {"Authorization": `Bearer ${authToken}` }
      });
      const data = await res.json();
      if (data.ok) {
        setStudentAttendance(data.data || []);
      }
    } catch (e) {
      console.error("Failed to fetch student attendance:", e);
    }
  }, [authToken]);

  useEffect(() => {
    fetchStudentAttendance();
  }, [fetchStudentAttendance]);

  const getAbsentStudentsForClass = useCallback((className, date) => {
    return studentAttendance.filter(item => {
      const isSameDate = item.tanggal === date || item.tanggal.startsWith(date);
      if (!isSameDate) return false;
      const student = students.find(s => s.nis === item.siswa_nis || s.code === item.siswa_nis);
      const studentClass = student ? (student.class_name || student.kelas ||'') :'';
      return studentClass.trim().toLowerCase() === className.trim().toLowerCase() && 
             ['sakit','izin','alpa'].includes(String(item.status ||'').toLowerCase());
    }).map(item => {
      const student = students.find(s => s.nis === item.siswa_nis || s.code === item.siswa_nis);
      return {
        name: student ? (student.namaSiswa || student.name || student.nama || student.nama_siswa) : item.siswa_nis,
        status: item.status
      };
    });
  }, [studentAttendance, students]);

  // Helper to look up slot period index and time label from timeSlots
  const getSlotPeriodIndexAndLabel = useCallback((day, slotId) => {
    const dailySlots = timeSlots[day] || [];
    let counter = 0;
    for (let i = 0; i < dailySlots.length; i++) {
      const s = dailySlots[i];
      if (!s.isBreak) {
        counter++;
        if (s.id === slotId) {
          return { index: counter, label: s.label };
        }
      }
    }
    return { index: null, label:'' };
  }, [timeSlots]);

  // Ambil jadwal guru hari ini dari schedule prop (data lokal) dan gabungkan Mapel Blok
  const todayScheduleSlots = useMemo(() => {
    const today = new Date(filterDate);
    const dayName = HARI_ID[today.getDay()];
    if (!schedule || !Array.isArray(schedule)) return [];

    const myCode = isKurikulum ? (filterTeacher || null) : teacherCode;
    if (!myCode && !isKurikulum) return [];

    const rawSlots = schedule
      .filter(s => {
        const dayMatch = s.day === dayName;
        if (!dayMatch) return false;
        if (myCode) {
          const codes = (s.teacherCode ||'').split(',').map(c => c.trim());
          return codes.includes(myCode);
        }
        return true;
      })
      .map((s, idx) => {
        const info = getSlotPeriodIndexAndLabel(dayName, s.slotId);
        return {
          ...s,
          jam_ke: info.index || (idx + 1),
          time_label: info.label ||'',
        };
      });

    // Grouping block subjects (Mapel Blok)
    // Group by className and subject only, as requested:"generate tetap menyesuaikan kelasnya saja"
    const groupedMap = new Map();
    rawSlots.forEach(s => {
      const groupKey = `${s.className}-${s.subject}`;
      if (!groupedMap.has(groupKey)) {
        groupedMap.set(groupKey, []);
      }
      groupedMap.get(groupKey).push(s);
    });

    const groupedSlots = [];
    groupedMap.forEach((slots, key) => {
      // Sort slots by jam_ke
      slots.sort((a, b) => a.jam_ke - b.jam_ke);
      
      const first = slots[0];
      const last = slots[slots.length - 1];
      const minJam = first.jam_ke;
      const maxJam = last.jam_ke;
      const jamList = slots.map(s => s.jam_ke);
      
      let slotLabel = `Jam ${minJam}`;
      if (minJam !== maxJam) {
        slotLabel = `Jam ${minJam} - ${maxJam}`;
      }

      // Merging time labels (e.g."07.00 - 08.30" and"08.30 - 09.10" =>"07.00 - 09.10")
      let mergedTime ='';
      if (slots.length === 1) {
        mergedTime = first.time_label ||'';
      } else {
        const firstStart = first.time_label?.split('-')[0]?.trim() ||'';
        const lastEnd = last.time_label?.split('-')[1]?.trim() ||'';
        if (firstStart && lastEnd) {
          mergedTime = `${firstStart} - ${lastEnd}`;
        } else {
          mergedTime = first.time_label || last.time_label ||'';
        }
      }
      
      groupedSlots.push({
        ...first,
        jam_ke: minJam,
        jam_end: maxJam,
        jam_list: jamList,
        slot_label: slotLabel,
        time_range: mergedTime,
        _key: `${first.day}-${minJam}-${maxJam}-${first.className}-${first.subject}`
      });
    });

    // Sort grouped slots by starting hour (jam_ke) and then className
    return groupedSlots.sort((a, b) => {
      if (a.jam_ke !== b.jam_ke) return a.jam_ke - b.jam_ke;
      return a.className.localeCompare(b.className);
    });
  }, [schedule, filterDate, teacherCode, isKurikulum, filterTeacher, getSlotPeriodIndexAndLabel]);

  // Reset slots page when filter date or teacher changes
  useEffect(() => {
    setSlotsCurrentPage(1);
  }, [filterDate, filterTeacher]);

  // Filtered & Sorted & Paginated Jurnal List
  const filteredJurnalList = useMemo(() => {
    return jurnalList.filter(j => {
      const q = searchQuery.toLowerCase();
      const matchSearch = !q || 
        (j.teacher_name ||'').toLowerCase().includes(q) ||
        (j.teacher_code ||'').toLowerCase().includes(q) ||
        (j.kelas ||'').toLowerCase().includes(q) ||
        (j.mapel ||'').toLowerCase().includes(q) ||
        (j.materi_pokok ||'').toLowerCase().includes(q);

      const st = getJurnalSubmissionStatus(j.tanggal, j.submitted_at);
      let matchStatus = true;
      if (statusFilter ==='tepat') matchStatus = !st.isLate && !!j.submitted_at;
      if (statusFilter ==='terlambat') matchStatus = st.isLate;

      return matchSearch && matchStatus;
    });
  }, [jurnalList, searchQuery, statusFilter]);

  const sortedJurnalList = useMemo(() => {
    return [...filteredJurnalList].sort((a, b) => {
      let valA = a[sortBy];
      let valB = b[sortBy];

      if (sortBy ==='guru') {
        valA = a.teacher_name || a.teacher_code ||'';
        valB = b.teacher_name || b.teacher_code ||'';
      }

      if (typeof valA ==='string') {
        return sortOrder ==='asc' 
          ? valA.localeCompare(valB) 
          : valB.localeCompare(valA);
      } else {
        return sortOrder ==='asc' 
          ? (valA || 0) - (valB || 0) 
          : (valB || 0) - (valA || 0);
      }
    });
  }, [filteredJurnalList, sortBy, sortOrder]);

  const totalItems = sortedJurnalList.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(1);
  }, [totalPages, currentPage]);

  const paginatedJurnalList = useMemo(() => {
    const startIdx = (currentPage - 1) * itemsPerPage;
    return sortedJurnalList.slice(startIdx, startIdx + itemsPerPage);
  }, [sortedJurnalList, currentPage, itemsPerPage]);

  const fetchJurnal = useCallback(async () => {
    if (!authToken) return;
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterDate) params.set('tanggal', filterDate);
      if (isKurikulum && filterTeacher) params.set('teacher_code', filterTeacher);
      const res = await fetch(`/api/jurnal/harian?${params}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      const data = await res.json();
      if (data.ok) setJurnalList(data.data || []);
    } catch (e) { console.error(e); }
    setIsLoading(false);
  }, [authToken, filterDate, isKurikulum, filterTeacher]);

  const fetchRekap = useCallback(async () => {
    if (!authToken || !isKurikulum) return;
    try {
      const res = await fetch(`/api/jurnal/rekap?bulan=${filterMonth}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      const data = await res.json();
      if (data.ok) setRekapList(data.data || []);
    } catch (e) { console.error(e); }
  }, [authToken, isKurikulum, filterMonth]);

  useEffect(() => { fetchJurnal(); }, [fetchJurnal]);
  useEffect(() => { if (activeView ==='rekap') fetchRekap(); }, [activeView, fetchRekap]);

  // Gabungkan slot jadwal hari ini dengan jurnal yang sudah ada (mendukung Mapel Blok)
  const enrichedSlots = useMemo(() => {
    return todayScheduleSlots.map(slot => {
      const filled = jurnalList.find(j =>
        j.kelas === slot.className &&
        j.mapel === slot.subject &&
        (slot.jam_list || [slot.jam_ke]).includes(j.jam_ke)
      );
      return { ...slot, filled };
    });
  }, [todayScheduleSlots, jurnalList]);

  const slotsTotalItems = enrichedSlots.length;
  const slotsTotalPages = Math.max(1, Math.ceil(slotsTotalItems / slotsPerPage));

  const paginatedEnrichedSlots = useMemo(() => {
    const startIdx = (slotsCurrentPage - 1) * slotsPerPage;
    return enrichedSlots.slice(startIdx, startIdx + slotsPerPage);
  }, [enrichedSlots, slotsCurrentPage, slotsPerPage]);

  // Jurnal yang sudah ada tapi tidak ada di slot hari ini (input manual dari hari lain / jurnal edit)
  const manualJurnals = useMemo(() => {
    if (!isKurikulum) return [];
    return jurnalList.filter(j => !enrichedSlots.find(s => s.filled?.id === j.id));
  }, [jurnalList, enrichedSlots, isKurikulum]);

  const handleSave = async (form) => {
    try {
      const res = await fetch('/api/jurnal/harian', {
        method:'POST',
        headers: { Authorization: `Bearer ${authToken}`,'Content-Type':'application/json' },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (data.ok) {
        showToast('Jurnal berhasil disimpan!');
        setActiveModal(null);
        fetchJurnal();
        return { success: true };
      } else {
        return { error: data.error || 'Gagal menyimpan jurnal' };
      }
    } catch (e) {
      return { error: 'Gagal menghubungi server' };
    }
  };

  const handleDelete = async (id) => {
    if (!await window.confirmAsync('Hapus jurnal ini?')) return;
    try {
      await fetch('/api/jurnal/harian', {
        method:'POST',
        headers: { Authorization: `Bearer ${authToken}`,'Content-Type':'application/json' },
        body: JSON.stringify({ action:'delete', id })
      });
      showToast('Jurnal dihapus');
      fetchJurnal();
    } catch (e) { showToast('Gagal menghapus','error'); }
  };

  const openAdd = (slot) => {
    setActiveModal({
      kelas: slot?.className ||'',
      mapel: slot?.subject ||'',
      jam_ke: slot?.jam_ke || 1,
      slot_label: slot?.slot_label ||'',
      tanggal: filterDate,
    });
  };

  const openEdit = (j) => setActiveModal(j);

  const exportExcel = () => {
    const data = jurnalList.map(j => {
      const st = getJurnalSubmissionStatus(j.tanggal, j.submitted_at);
      return {
        Tanggal: j.tanggal,
        Guru: j.teacher_name || j.teacher_code,
        Kelas: j.kelas,
        'Mata Pelajaran': j.mapel,
        'Jam Ke': j.jam_ke,
        'Materi Pokok': j.materi_pokok || '',
        'Kegiatan Pembelajaran': j.kegiatan_pembelajaran || '',
        Metode: j.metode_pembelajaran || '',
        'Siswa Hadir': j.jumlah_hadir || 0,
        Catatan: j.catatan || '',
        'Status Pengisian': st.label,
        'Jam & Waktu Submit': st.fullSubmitStr || '-',
        'Keterlambatan': st.isLate ? `Terlambat ${st.diffDays} Hari (H+${st.diffDays})` : (j.submitted_at ? 'Tepat Waktu' : 'Belum Diisi')
      };
    });
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws,'Jurnal');
    XLSX.writeFile(wb, `Jurnal_KBM_${filterDate}.xlsx`);
  };

  const teacherOptions = useMemo(() => {
    const codes = [...new Set(teachers.map(t => ({ value: t.code, label: `${t.name} (${t.code})` })))];
    return [{ value:'', label:'Semua Guru' }, ...codes];
  }, [teachers]);

  // Progress hari ini
  const totalSlots = enrichedSlots.length;
  const filledSlots = enrichedSlots.filter(s => s.filled).length;
  const progressPct = totalSlots > 0 ? Math.round((filledSlots / totalSlots) * 100) : 0;

  return (
    <div className="flex flex-col gap-4 w-full animate-in fade-in duration-300 pb-20 sm:pb-6">
      <PageHeader
        title="Jurnal Harian Guru"
        icon={BookOpen}
        description="Pencatatan kegiatan KBM harian yang tersinkron dengan jadwal Anda."
        tabs={isKurikulum ? [
          { id: 'harian', label: 'Jurnal Harian', icon: BookOpen },
          { id: 'rekap', label: 'Rekap Per Guru', icon: Users }
        ] : []}
        activeTab={activeView}
        onTabChange={setActiveView}
        onBack={onBack}
      />

      {/* === HARIAN VIEW === */}
      {activeView === 'harian' && (
        <>
          {/* Mobile Filter & Export Card (Reference Layout matching media__1785567800000.png) */}
          <div className="sm:hidden ui-card rounded-[var(--ui-radius-card)] p-3.5 shadow-sm border border-slate-100/90 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              {/* Date selector button */}
              <div 
                onClick={(e) => {
                  const inputEl = e.currentTarget.querySelector('input[type="date"]');
                  if (inputEl) {
                    try { inputEl.showPicker(); } catch (err) { inputEl.click(); }
                  }
                }}
                className="flex-1 flex items-center justify-between bg-slate-50 hover:bg-slate-100/80 border border-slate-200/80 rounded-[var(--ui-radius-card)] py-2.5 px-3.5 transition-all relative cursor-pointer active:scale-98"
              >
                <div className="flex items-center gap-2.5 min-w-0 pointer-events-none">
                  <div 
                    className="w-7 h-7 rounded-[var(--ui-radius-small)] flex items-center justify-center shrink-0"
                    style={{ background: "color-mix(in srgb, var(--ui-primary) 14%, transparent)", color: "var(--ui-primary)" }}
                  >
                    <Calendar size={16} strokeWidth={2.2} />
                  </div>
                  <span className="text-xs font-extrabold text-slate-800 truncate">
                    {filterDate ? new Date(filterDate + 'T00:00:00').toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) : 'Pilih Tanggal'}
                  </span>
                </div>
                <input
                  type="date"
                  value={filterDate}
                  onChange={e => setFilterDate(e.target.value)}
                  onClick={e => {
                    e.stopPropagation();
                    try { e.currentTarget.showPicker(); } catch (err) {}
                  }}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                />
                <ChevronDown size={16} className="text-slate-400 shrink-0 pointer-events-none" />
              </div>

              {/* Refresh button */}
              <button
                type="button"
                onClick={fetchJurnal}
                title="Refresh"
                className="w-11 h-11 rounded-[var(--ui-radius-card)] bg-slate-50 hover:bg-slate-100 border border-slate-200/80 flex items-center justify-center text-slate-600 transition-all cursor-pointer shrink-0 active:scale-95"
              >
                <RefreshCw size={18} strokeWidth={2} />
              </button>
            </div>

            {isKurikulum && (
              <div className="w-full">
                <CustomSelect
                  options={teacherOptions}
                  value={filterTeacher}
                  onChange={v => setFilterTeacher(v)}
                  placeholder="Filter Guru"
                />
              </div>
            )}

            {/* Export Jurnal Hari Ini button */}
            <button
              type="button"
              onClick={exportExcel}
              className="w-full py-3 rounded-[var(--ui-radius-card)] font-black text-xs flex items-center justify-center gap-2 transition-all shadow-xs active:scale-98 cursor-pointer"
              style={{
                background: "color-mix(in srgb, var(--ui-primary) 10%, #ffffff)",
                color: "var(--ui-primary)",
                border: "1px solid color-mix(in srgb, var(--ui-primary) 25%, transparent)"
              }}
            >
              <FileDown size={16} strokeWidth={2.2} />
              Export Jurnal Hari Ini
            </button>
          </div>

          {/* Desktop Filter Bar */}
          <div className="hidden sm:flex ui-card p-4 flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-3 w-full">
              <div className="flex gap-2 w-full sm:w-auto">
                <div className="flex-1 sm:flex-none flex items-center gap-2 bg-slate-50 border border-slate-100 px-3 rounded-[var(--ui-radius-small)]">
                  <Calendar size={16} className="text-slate-400 shrink-0" />
                  <input
                    type="date"
                    value={filterDate}
                    onChange={e => setFilterDate(e.target.value)}
                    className="w-full py-2 bg-transparent border-none text-sm font-semibold text-slate-700 focus:outline-none"
                  />
                </div>
                <Button variant="ghost" size="icon" onClick={fetchJurnal} title="Refresh">
                  <RefreshCw size={16} />
                </Button>
              </div>
              
              {isKurikulum && (
                <div className="w-full sm:w-[220px]">
                  <CustomSelect
                    options={teacherOptions}
                    value={filterTeacher}
                    onChange={v => setFilterTeacher(v)}
                    placeholder="Filter Guru"
                  />
                </div>
              )}
            </div>
            
            <Button variant="outline" onClick={exportExcel} className="w-full md:w-auto flex justify-center items-center gap-2 shrink-0">
              <Download size={14} /> Export
            </Button>
          </div>

          {/* Summary Stats Boxes */}
          {totalSlots > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-[var(--ui-radius-card)] bg-emerald-50/70 border border-emerald-100 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">Sudah Mengisi Jurnal</p>
                  <h4 className="text-2xl font-black text-emerald-700 mt-1">{filledSlots} <span className="text-xs font-semibold text-emerald-600">dari {totalSlots} slot</span></h4>
                </div>
                <CheckCircle2 size={24} className="text-emerald-500 opacity-80" />
              </div>
              <div className="p-4 rounded-[var(--ui-radius-card)] bg-rose-50/70 border border-rose-100 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-rose-800 uppercase tracking-wider">Belum Mengisi Jurnal</p>
                  <h4 className="text-2xl font-black text-rose-700 mt-1">{totalSlots - filledSlots} <span className="text-xs font-semibold text-rose-600">dari {totalSlots} slot</span></h4>
                </div>
                <AlertCircle size={24} className="text-rose-500 opacity-80" />
              </div>
            </div>
          )}

          {/* Slot Jadwal Hari Ini */}
          {totalSlots > 0 && (
            <div className="ui-card overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <h3 className="font-bold text-slate-800 text-xs flex items-center gap-2">
                  <BookOpen size={14} className="text-[var(--ui-primary)]" />
                  Jadwal Mengajar Hari Ini
                </h3>
                <span className="text-[11px] font-semibold text-slate-500">{HARI_ID[new Date(filterDate).getDay()]}</span>
              </div>
              <div className="divide-y divide-slate-100">
                {paginatedEnrichedSlots.map((slot, idx) => {
                  const j = slot.filled;
                  const statusInfo = getJurnalSubmissionStatus(filterDate, j?.submitted_at);
                  const teacher = teachers.find(t => t.code === slot.teacherCode);
                  const teacherNameDisplay = teacher ? teacher.name : slot.teacherCode;
                  const classAbsentStudents = getAbsentStudentsForClass(slot.className, filterDate);
                  return (
                    <div key={idx} className={`p-4 flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4 hover:bg-slate-50/50 transition-colors ${j ?'' :'bg-rose-50/20'}`}>
                      {/* Jam Info */}
                      <div className="w-full sm:w-20 shrink-0 flex flex-row sm:flex-col items-center justify-between sm:justify-center sm:text-center pb-2 sm:pb-0 border-b border-slate-100/80 sm:border-none">
                        <div className="flex sm:flex-col items-center gap-2 sm:gap-0">
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Jam</div>
                          <div className="text-sm font-black text-slate-700 leading-tight">{slot.slot_label.replace('Jam','')}</div>
                          {slot.time_range && (
                            <div className="text-[9px] font-bold text-slate-500 sm:mt-1 leading-normal bg-slate-100 px-1.5 py-0.5 rounded-[var(--ui-radius-pill)] border border-slate-200/50">{slot.time_range}</div>
                          )}
                        </div>
                        {/* On mobile, we can show a small badge or status next to the time */}
                        <div className="sm:hidden">
                           <StatusBadge submitted={!!j} submittedAt={j?.submitted_at} tanggal={filterDate} showTime={true} />
                        </div>
                      </div>

                      {/* Detail Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="font-bold text-slate-800 text-sm">{slot.className}</span>
                          <span className="text-slate-400 text-xs">·</span>
                          <span className="font-bold text-xs text-[var(--ui-primary)]">{slot.subject}</span>
                          {isKurikulum && (
                            <>
                              <span className="text-slate-400 text-xs">·</span>
                              <span className="text-xs text-slate-500 font-medium bg-slate-100 px-1.5 py-0.5 rounded-[var(--ui-radius-small)]">Guru: {teacherNameDisplay}</span>
                            </>
                          )}
                          <div className="hidden sm:block">
                            <StatusBadge submitted={!!j} submittedAt={j?.submitted_at} tanggal={filterDate} showTime={true} />
                          </div>
                        </div>
                        
                        {/* Absent Students Info */}
                        {classAbsentStudents.length > 0 ? (
                          <div className="flex flex-wrap gap-1 items-center mt-1 mb-2">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mr-1.5 flex items-center gap-0.5">
                              <Users size={10} /> Tidak Hadir:
                            </span>
                            {classAbsentStudents.map((abs, sIdx) => {
                              let stColor ='bg-amber-50 text-amber-700 border-amber-200/50';
                              if (abs.status.toLowerCase() ==='izin') stColor ='bg-blue-50 text-blue-700 border-blue-200/50';
                              if (abs.status.toLowerCase() ==='alpa' || abs.status.toLowerCase() ==='alpha') stColor ='bg-rose-50 text-rose-700 border-rose-200/50';
                              return (
                                <span key={sIdx} className={`inline-flex items-center text-[9px] font-bold px-1.5 py-0.5 rounded-md border ${stColor}`}>
                                  {abs.name} ({abs.status.toUpperCase()})
                                </span>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="text-[9px] font-bold text-emerald-600 flex items-center gap-1 mt-1 mb-2">
                            <CheckCircle2 size={10} /> Semua siswa hadir hari ini
                          </div>
                        )}

                        {j ? (
                          <div className="text-xs text-slate-600 space-y-1 mt-1">
                            <p><span className="font-semibold text-slate-500">Materi:</span> {j.materi_pokok}</p>
                            <p><span className="font-semibold text-slate-500">Metode:</span> {j.metode_pembelajaran} &bull; <span className="font-semibold text-slate-500">Hadir:</span> {j.jumlah_hadir} siswa</p>
                            {j.catatan && <p className="text-[11px] text-slate-400 italic bg-slate-50 px-2 py-1 rounded-[var(--ui-radius-small)]">Catatan: {j.catatan}</p>}
                            
                            {/* Timestamp & Late Note */}
                            {j.submitted_at && (
                              <div className="pt-1 flex items-center gap-2 flex-wrap text-[11px]">
                                <span className="text-slate-500 font-medium flex items-center gap-1">
                                  <Clock size={11} className="text-slate-400" />
                                  Diisi: <strong className="text-slate-700">{statusInfo.fullSubmitStr}</strong>
                                </span>
                                {statusInfo.isLate && (
                                  <span className="text-[10px] font-black text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200 flex items-center gap-1">
                                    ⚠️ Terlambat (Diisi H+{statusInfo.diffDays})
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        ) : (
                          <p className="text-[11px] text-rose-500 font-bold mt-0.5">Jurnal belum diisi untuk slot mengajar ini</p>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2 sm:gap-1 shrink-0 sm:self-center justify-end w-full sm:w-auto pt-3 sm:pt-0 border-t border-slate-100/80 sm:border-none mt-1 sm:mt-0">
                        {j ? (
                          <>
                            <Button variant="outline" onClick={() =>openEdit(j)} className="flex-1 sm:flex-none flex justify-center cursor-pointer" title="Edit">
                              <Edit2 size={13} /></Button>
                            <Button variant="outline" onClick={() =>handleDelete(j.id)} className="flex-1 sm:flex-none flex justify-center cursor-pointer" title="Hapus">
                              <Trash2 size={13} /></Button>
                          </>
                        ) : (
                          <Button variant="outline"
                            onClick={() =>openAdd(slot)}
                            className="flex-1 sm:flex-none flex justify-center items-center gap-1.5 sm: sm: cursor-pointer"
                          >
                            <Plus size={11} /> Isi Jurnal</Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Slot Schedule Pagination Footer */}
              <PaginationControls
                currentPage={slotsCurrentPage}
                totalItems={slotsTotalItems}
                itemsPerPage={slotsPerPage}
                onPageChange={setSlotsCurrentPage}
                onItemsPerPageChange={(v) => { setSlotsPerPage(v); setSlotsCurrentPage(1); }}
              />
            </div>
          )}

          {/* Jurnal dari tanggal tersebut (semua, kurikulum) */}
          {(isKurikulum || totalSlots === 0) && jurnalList.length > 0 && (
            <div className="ui-card overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row gap-3 items-center justify-between">
                <h3 className="font-bold text-slate-800 text-xs shrink-0 self-center">
                  {isKurikulum ?'Semua Jurnal Tanggal Ini' :'Jurnal yang Sudah Tersimpan'}
                </h3>
                
                {/* Table Filters & Sorting */}
                <div className="flex flex-wrap gap-2 items-center w-full sm:w-auto justify-end">
                  <div className="relative w-full sm:w-48">
                    <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Cari Jurnal..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="w-full pl-7 pr-3 py-1 bg-slate-50 border-none rounded-[var(--ui-radius-small)] text-xs font-semibold focus:outline-none focus:outline-[var(--ui-primary)] focus:bg-white"
                    />
                  </div>
                  <CustomSelect
                    options={[
                      { value:'all', label:'Semua Status' },
                      { value:'tepat', label:'Tepat Waktu' },
                      { value:'terlambat', label:'Terlambat' }
                    ]}
                    value={statusFilter}
                    onChange={setStatusFilter}
                    className="w-full sm:w-36 text-xs z-30 relative"
                  />
                  <CustomSelect
                    options={[
                      { value:'jam_ke', label:'Urut: Jam' },
                      { value:'kelas', label:'Urut: Kelas' },
                      { value:'mapel', label:'Urut: Mapel' },
                      { value:'guru', label:'Urut: Guru' }
                    ]}
                    value={sortBy}
                    onChange={setSortBy}
                    className="w-full sm:w-32 text-xs z-30 relative"
                  />
                  <Button variant="outline"
                    onClick={() =>setSortOrder(sortOrder ==='asc' ?'desc' :'asc')}
                    className="cursor-pointer"
                    title={sortOrder ==='asc' ?'Urut Naik' :'Urut Turun'}
                  >
                    <ArrowUpDown size={12} /></Button>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-[10px] text-slate-500 uppercase border-b border-slate-200">
                    <tr>
                      <th className="px-5 py-3 font-bold">Guru</th>
                      <th className="px-5 py-3 font-bold">Kelas</th>
                      <th className="px-5 py-3 font-bold">Mapel</th>
                      <th className="px-5 py-3 text-center font-bold">Jam</th>
                      <th className="px-5 py-3 font-bold">Materi</th>
                      <th className="px-5 py-3 text-center font-bold">Hadir</th>
                      <th className="px-5 py-3 text-center font-bold">Status &amp; Jam Submit</th>
                      <th className="px-5 py-3 text-right font-bold">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedJurnalList.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-5 py-8 text-center text-slate-400 font-medium">
                          Data jurnal tidak ditemukan untuk filter/pencarian ini.
                        </td>
                      </tr>
                    ) : (
                      paginatedJurnalList.map(j => {
                        return (
                          <tr key={j.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-5 py-2.5">
                              <p className="font-bold text-slate-800">{j.teacher_name || j.teacher_code}</p>
                            </td>
                            <td className="px-5 py-2.5 font-bold text-slate-700">{j.kelas}</td>
                            <td className="px-5 py-2.5 text-[var(--ui-primary)] font-bold">{j.mapel}</td>
                            <td className="px-5 py-2.5 text-center font-bold text-slate-500">{j.jam_ke}</td>
                            <td className="px-5 py-2.5 text-slate-600 max-w-[200px] truncate">{j.materi_pokok}</td>
                            <td className="px-5 py-2.5 text-center">
                              <span className="font-bold text-slate-700">{j.jumlah_hadir}</span>
                            </td>
                            <td className="px-5 py-2.5 text-center">
                              <StatusBadge submitted={!!j.submitted_at} submittedAt={j.submitted_at} tanggal={j.tanggal} showTime={true} />
                            </td>
                            <td className="px-5 py-2.5 text-right">
                              <div className="flex justify-end gap-1">
                                <Button variant="outline" onClick={() =>openEdit(j)} className="cursor-pointer">
                                  <Edit2 size={12} /></Button>
                                <Button variant="outline" onClick={() =>handleDelete(j.id)} className="cursor-pointer">
                                  <Trash2 size={12} /></Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Table Pagination Footer */}
              <PaginationControls
                currentPage={currentPage}
                totalItems={totalItems}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
                onItemsPerPageChange={(v) => { setItemsPerPage(v); setCurrentPage(1); }}
              />
            </div>
          )}

          {!isLoading && totalSlots === 0 && jurnalList.length === 0 && (
            <div className="ui-card rounded-[var(--ui-radius-card)] p-8 sm:p-12 text-center flex flex-col items-center justify-center gap-3 border border-slate-100/90 shadow-sm">
              <div 
                className="w-20 h-20 rounded-[var(--ui-radius-card)] flex items-center justify-center mb-1 shadow-inner"
                style={{ background: "color-mix(in srgb, var(--ui-primary) 12%, transparent)", color: "var(--ui-primary)" }}
              >
                <Coffee size={38} strokeWidth={2.2} />
              </div>
              <h3 className="text-lg font-black text-slate-800 tracking-tight">Waktu Luang!</h3>
              <p className="text-xs text-slate-500 font-medium max-w-xs leading-relaxed">
                Tidak ada jadwal mengajar untuk hari{' '}
                <span className="font-black text-slate-700">
                  {new Date(filterDate).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
                . Selamat beristirahat!
              </p>
            </div>
          )}
        </>
      )}

      {/* === REKAP VIEW (Kurikulum) === */}
      {activeView ==='rekap' && isKurikulum && (
        <div className="ui-card overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <h3 className="font-bold text-slate-800 text-xs flex items-center gap-2 shrink-0">
              <Filter size={14} className="text-[var(--ui-primary)]" />
              Rekap Pengisian Jurnal Per Guru
            </h3>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <input
                type="month"
                value={filterMonth}
                onChange={e => setFilterMonth(e.target.value)}
                className="px-3 py-1.5 bg-white border-none rounded-[var(--ui-radius-small)] text-xs font-semibold focus:outline-none focus:outline-[var(--ui-primary)] transition-all"
              />
              <Button variant="ghost" size="sm" onClick={fetchRekap} >
                <RefreshCw size={12} />
              </Button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-[10px] text-slate-500 uppercase border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3 font-bold">Guru</th>
                  <th className="px-5 py-3 text-center font-bold">Total Jurnal</th>
                  <th className="px-5 py-3 text-center font-bold">Tepat Waktu</th>
                  <th className="px-5 py-3 text-center font-bold">Terlambat</th>
                  <th className="px-5 py-3 font-bold">Jurnal Terakhir</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rekapList.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-10 text-center text-slate-400 font-medium">
                      Tidak ada data jurnal untuk bulan {filterMonth}
                    </td>
                  </tr>
                ) : rekapList.map(r => (
                  <tr key={r.teacher_code} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-2.5">
                      <p className="font-bold text-slate-800">{r.teacher_name || r.teacher_code}</p>
                      <p className="text-[10px] text-slate-400">{r.teacher_code}</p>
                    </td>
                    <td className="px-5 py-2.5 text-center">
                      <span className="font-black text-slate-700 text-base">{r.total_jurnal}</span>
                    </td>
                    <td className="px-5 py-2.5 text-center">
                      <span className="font-bold text-emerald-600">{parseInt(r.total_submitted) - parseInt(r.total_terlambat)}</span>
                    </td>
                    <td className="px-5 py-2.5 text-center">
                      <span className={`font-bold ${parseInt(r.total_terlambat) > 0 ?'text-amber-600' :'text-slate-400'}`}>
                        {r.total_terlambat}
                      </span>
                    </td>
                    <td className="px-5 py-2.5 text-slate-500">
                      {r.jurnal_terakhir ? new Date(r.jurnal_terakhir).toLocaleDateString('id-ID', { day:'numeric', month:'long', year:'numeric' }) :'-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Isi Jurnal */}
      {activeModal && (
        <JurnalModal
          jurnal={activeModal}
          onSave={handleSave}
          onClose={() => setActiveModal(null)}
          students={students}
          studentAttendance={studentAttendance}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-[var(--ui-radius-small)] shadow-sm font-semibold text-xs flex items-center gap-2 animate-in slide-in-from-bottom-5 ${toast.type ==='error' ?'bg-rose-600 text-white' :'bg-emerald-600 text-white'}`}>
          <CheckCircle2 size={14} />
          {toast.msg}
        </div>
      )}
    </div>
  );
}
