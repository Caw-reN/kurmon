import { useState, useEffect, useMemo, useCallback } from'react';
import { BookOpen } from'lucide-react';
import useAuthStore from'../../store/monitoring/authStore.js';
import { useDataStore } from'../../store/useDataStore.js';
import * as XLSX from'xlsx';
import { Clock, CheckCircle2, AlertCircle, X, Calendar, Users, ClipboardList, Award, FileText, MessageSquare, RefreshCw, Download, Edit2, Trash2, Plus, Search, ArrowUpDown, Filter, Coffee, FileDown, ChevronDown, ChevronLeft } from'lucide-react';
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

function StatusBadge({ submitted, isLate }) {
  if (submitted && isLate) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[var(--ui-radius-small)] text-[10px] font-black uppercase tracking-wider bg-rose-50 text-rose-600 border border-rose-200">
        <Clock size={10} className="stroke-[3]" /> Tidak Tepat Waktu
      </span>
    );
  }
  if (submitted) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[var(--ui-radius-small)] text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-250">
        <CheckCircle2 size={10} className="stroke-[3]" /> Tepat Waktu
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[var(--ui-radius-small)] text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-550 border border-slate-200">
      <AlertCircle size={10} className="stroke-[3]" /> Belum Diisi
    </span>
  );
}

// Modal Form Isi Jurnal
function JurnalModal({ jurnal, onSave, onClose, students = [], studentAttendance = [] }) {
  const className = jurnal?.kelas ||'';
  
  // Get total students in this class
  const classStudents = useMemo(() => {
    return students.filter(s => {
      const sClass = (s.class_name || s.kelas ||'').trim().toLowerCase();
      const targetClass = className.trim().toLowerCase();
      return sClass === targetClass;
    });
  }, [students, className]);

  // Initial form state
  const [form, setForm] = useState({
    id: jurnal?.id || null,
    kelas: jurnal?.kelas ||'',
    mapel: jurnal?.mapel ||'',
    jam_ke: jurnal?.jam_ke || 1,
    slot_label: jurnal?.slot_label ||'',
    materi_pokok: jurnal?.materi_pokok ||'',
    kegiatan_pembelajaran: jurnal?.kegiatan_pembelajaran ||'',
    metode_pembelajaran: jurnal?.metode_pembelajaran ||'Ceramah & Diskusi',
    catatan: jurnal?.catatan ||'',
    jumlah_hadir: jurnal?.jumlah_hadir || 0,
    tanggal: jurnal?.tanggal || new Date().toISOString().split('T')[0],
    status:'submitted',
  });
  const [saving, setSaving] = useState(false);

  // Get absent students in this class for the selected date
  const absentStudents = useMemo(() => {
    return studentAttendance.filter(item => {
      // match date
      const isSameDate = item.tanggal === form.tanggal || item.tanggal.startsWith(form.tanggal);
      if (!isSameDate) return false;
      
      // find student
      const student = classStudents.find(s => s.nis === item.siswa_nis || s.code === item.siswa_nis);
      if (!student) return false;
      
      // absent status: Sakit, Izin, Alpa
      const statusLower = String(item.status ||'').toLowerCase();
      return ['sakit','izin','alpa'].includes(statusLower);
    }).map(item => {
      const student = classStudents.find(s => s.nis === item.siswa_nis || s.code === item.siswa_nis);
      return {
        name: student ? (student.namaSiswa || student.name || student.nama || student.nama_siswa) : item.siswa_nis,
        status: item.status,
        keterangan: item.keterangan ||''
      };
    });
  }, [studentAttendance, classStudents, form.tanggal]);

  const totalHadirCalculated = Math.max(0, classStudents.length - absentStudents.length);

  // Pre-fill jumlah_hadir when class data is available on load
  useEffect(() => {
    if (!form.id && form.jumlah_hadir === 0 && classStudents.length > 0) {
      setForm(f => ({
        ...f,
        jumlah_hadir: totalHadirCalculated
      }));
    }
  }, [classStudents.length, absentStudents.length, form.id]);

  const handleAutoFill = () => {
    setForm(f => ({
      ...f,
      jumlah_hadir: totalHadirCalculated
    }));
  };

  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    if (!form.materi_pokok || !form.kegiatan_pembelajaran) {
      setErrorMsg('Materi pokok dan kegiatan pembelajaran wajib diisi!');
      return;
    }
    setSaving(true);
    const result = await onSave(form);
    if (result?.error) {
      setErrorMsg(result.error);
    }
    setSaving(false);
  };

  return (
    <Modal isOpen={true} onClose={onClose} title={form.id ? 'Edit Jurnal Pembelajaran' : 'Isi Jurnal Harian'} maxWidth="max-w-xl">

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4.5 overflow-y-auto custom-scrollbar flex-1">
          
          {/* Tanggal & Hari info */}
          <div className="flex flex-col gap-1.5 bg-slate-50 p-4 rounded-xl border border-slate-100/50">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
              <Calendar size={14} className="text-slate-400" />
              Tanggal KBM: {new Date(form.tanggal).toLocaleDateString('id-ID', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}
            </div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider pl-5">
              Kelas: {form.kelas} &bull; Mapel: <span className="text-[var(--ui-primary)]">{form.mapel}</span> &bull; Waktu: {form.slot_label || `Jam ke-${form.jam_ke}`}
            </div>
          </div>

          {/* Absent Students Info Card */}
          {classStudents.length > 0 ? (
            <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4.5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black text-slate-550 uppercase tracking-widest flex items-center gap-1.5">
                  <Users size={14} className="text-[var(--ui-primary)]" />
                  Kehadiran Siswa ({className})
                </span>
                <span className="text-[11px] font-bold text-slate-450 bg-white px-2 py-0.5 rounded-md border border-slate-100">
                  Total: {classStudents.length} Siswa
                </span>
              </div>
              
              {absentStudents.length > 0 ? (
                <div className="space-y-2.5">
                  <div className="text-[10px] font-bold text-rose-600 bg-rose-50 border border-rose-100/50 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5">
                    <AlertCircle size={12} className="shrink-0" />
                    Terdeteksi {absentStudents.length} siswa tidak hadir pada tanggal ini:
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[110px] overflow-y-auto pr-1 custom-scrollbar">
                    {absentStudents.map((s, idx) => {
                      let badgeColor ='bg-amber-50 text-amber-700 border-amber-200/50';
                      if (s.status.toLowerCase() ==='izin') badgeColor ='bg-blue-50 text-blue-700 border-blue-200/50';
                      if (s.status.toLowerCase() ==='alpa' || s.status.toLowerCase() ==='alpha') badgeColor ='bg-rose-50 text-rose-700 border-rose-200/50';
                      return (
                        <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-100 shadow-xs">
                          <span className="text-xs font-bold text-slate-700 truncate max-w-[125px]" title={s.name}>{s.name}</span>
                          <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md border ${badgeColor}`}>
                            {s.status.toUpperCase()}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="text-[11px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100/50 px-3 py-2.5 rounded-lg flex items-center gap-1.5">
                  <CheckCircle2 size={13} />
                  Semua siswa hadir (tidak ada catatan tidak hadir hari ini)
                </div>
              )}
            </div>
          ) : (
            <div className="text-[11px] font-bold text-amber-600 bg-amber-50 border border-amber-100/50 px-3 py-2.5 rounded-lg flex items-center gap-1.5">
              <AlertCircle size={13} />
              Info: Kelas {className} belum memiliki data siswa terdaftar di sistem.
            </div>
          )}

          {/* Form Fields: Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="flex items-center gap-1.5 text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">
                <Users size={12} className="text-slate-400" />
                Jumlah Siswa Hadir
              </label>
              <div className="relative">
                <input
                  type="number"
                  min={0}
                  max={classStudents.length || 100}
                  value={form.jumlah_hadir}
                  onChange={e => setForm({ ...form, jumlah_hadir: parseInt(e.target.value) || 0 })}
                  className="w-full pl-3 pr-8 py-2 bg-slate-50 border-2 border-transparent rounded-xl text-sm font-semibold focus:outline-none focus:border-[var(--ui-primary)] focus:bg-white transition-all"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-450">
                  / {classStudents.length || 0}
                </span>
              </div>
              {form.jumlah_hadir !== totalHadirCalculated && classStudents.length > 0 && (
                <button
                  type="button"
                  onClick={handleAutoFill}
                  className="mt-1 cursor-pointer block text-left"
                >
                  Set otomatis: {totalHadirCalculated} siswa hadir
                </button>
              )}
            </div>

            <div>
              <label className="flex items-center gap-1.5 text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">
                <ClipboardList size={12} className="text-slate-400" />
                Metode Pembelajaran
              </label>
              <CustomSelect
                options={METODE_OPTIONS.map(m => ({ value: m, label: m }))}
                value={form.metode_pembelajaran}
                onChange={val => setForm({ ...form, metode_pembelajaran: val })}
                className="w-full text-sm z-50 relative"
              />
            </div>
          </div>

          {/* Materi Pokok */}
          <div>
            <label className="flex items-center gap-1.5 text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">
              <Award size={12} className="text-slate-400" />
              Materi Pokok / Kompetensi Dasar <span className="text-rose-500 font-bold">*</span>
            </label>
            <input
              type="text"
              placeholder="Contoh: Menggambar denah jaringan komputer atau SPLDV"
              value={form.materi_pokok}
              onChange={e => setForm({ ...form, materi_pokok: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border-2 border-transparent rounded-xl text-sm font-semibold focus:outline-none focus:border-[var(--ui-primary)] focus:bg-white transition-all"
              required
            />
          </div>

          {/* Kegiatan Pembelajaran */}
          <div>
            <label className="flex items-center gap-1.5 text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">
              <FileText size={12} className="text-slate-400" />
              Kegiatan Pembelajaran <span className="text-rose-500 font-bold">*</span>
            </label>
            <textarea
              rows={3}
              placeholder="Jelaskan alur belajar (contoh: Guru memaparkan teori koding, siswa mempraktikkan langsung membuat web layout di lab komputer, diakhiri tanya jawab...)"
              value={form.kegiatan_pembelajaran}
              onChange={e => setForm({ ...form, kegiatan_pembelajaran: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border-2 border-transparent rounded-xl text-sm font-medium focus:outline-none focus:border-[var(--ui-primary)] focus:bg-white transition-all resize-none shadow-inner"
              required
            />
          </div>

          {/* Catatan Tambahan */}
          <div>
            <label className="flex items-center gap-1.5 text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">
              <MessageSquare size={12} className="text-slate-400" />
              Catatan / Kendala Kelas (Opsional)
            </label>
            <textarea
              rows={2}
              placeholder="Contoh: 2 siswa terlambat karena macet, LCD proyektor lab agak buram, atau target materi tercapai dengan baik..."
              value={form.catatan}
              onChange={e => setForm({ ...form, catatan: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border-2 border-transparent rounded-xl text-sm font-medium focus:outline-none focus:border-[var(--ui-primary)] focus:bg-white transition-all resize-none shadow-inner"
            />
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl flex items-start gap-2 text-rose-600 text-xs font-semibold animate-in zoom-in-95 duration-200">
              <AlertCircle size={14} className="shrink-0 mt-0.5" />
              <span className="leading-relaxed">{errorMsg}</span>
            </div>
          )}

          {/* Actions */}
          <div className="pt-4 flex justify-end gap-3 border-t border-slate-100 shrink-0">
            <Button variant="outline" type="button" onClick={onClose}>Batal</Button>
            <Button type="submit" disabled={saving}>
              {saving ? (
                <>
                  <RefreshCw size={14} className="animate-spin mr-1.5" />
                  Menyimpan...
                </>
              ) : (form.id ?'Perbarui Jurnal' :'Simpan & Submit Jurnal')}
            </Button>
          </div>
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

      const isLate = j.submitted_at && j.submitted_at.substring(0, 10) > j.tanggal;
      let matchStatus = true;
      if (statusFilter ==='tepat') matchStatus = !isLate;
      if (statusFilter ==='terlambat') matchStatus = isLate;

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
    if (!window.confirm('Hapus jurnal ini?')) return;
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
    const data = jurnalList.map(j => ({
      Tanggal: j.tanggal,
      Guru: j.teacher_name || j.teacher_code,
      Kelas: j.kelas,'Mata Pelajaran': j.mapel,'Jam Ke': j.jam_ke,'Materi Pokok': j.materi_pokok ||'','Kegiatan Pembelajaran': j.kegiatan_pembelajaran ||'',
      Metode: j.metode_pembelajaran ||'','Siswa Hadir': j.jumlah_hadir || 0,
      Catatan: j.catatan ||'',
      Status: j.submitted_at ?'Sudah Diisi' :'Belum Diisi','Waktu Submit': j.submitted_at ? new Date(j.submitted_at).toLocaleString('id-ID') :'-'
    }));
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
          { id: 'harian', label: 'Jurnal Harian' },
          { id: 'rekap', label: 'Rekap Per Guru' }
        ] : []}
        activeTab={activeView}
        onTabChange={setActiveView}
        onBack={onBack}
      />

      {/* === HARIAN VIEW === */}
      {activeView === 'harian' && (
        <>
          {/* Mobile Filter & Export Card (Reference Layout matching media__1785567800000.png) */}
          <div className="sm:hidden ui-card rounded-3xl p-3.5 shadow-sm border border-slate-100/90 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              {/* Date selector button */}
              <div 
                onClick={(e) => {
                  const inputEl = e.currentTarget.querySelector('input[type="date"]');
                  if (inputEl) {
                    try { inputEl.showPicker(); } catch (err) { inputEl.click(); }
                  }
                }}
                className="flex-1 flex items-center justify-between bg-slate-50 hover:bg-slate-100/80 border border-slate-200/80 rounded-2xl py-2.5 px-3.5 transition-all relative cursor-pointer active:scale-98"
              >
                <div className="flex items-center gap-2.5 min-w-0 pointer-events-none">
                  <div 
                    className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0"
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
                className="w-11 h-11 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 flex items-center justify-center text-slate-600 transition-all cursor-pointer shrink-0 active:scale-95"
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
              className="w-full py-3 rounded-2xl font-black text-xs flex items-center justify-center gap-2 transition-all shadow-xs active:scale-98 cursor-pointer"
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
                  const isLate = j?.submitted_at && j.submitted_at.substring(0, 10) > filterDate;
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
                            <div className="text-[9px] font-bold text-slate-500 sm:mt-1 leading-normal bg-slate-100 px-1.5 py-0.5 rounded-full border border-slate-200/50">{slot.time_range}</div>
                          )}
                        </div>
                        {/* On mobile, we can show a small badge or status next to the time */}
                        <div className="sm:hidden">
                           <StatusBadge submitted={!!j} isLate={isLate} />
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
                            <StatusBadge submitted={!!j} isLate={isLate} />
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
                          <div className="text-xs text-slate-600 space-y-0.5 mt-1">
                            <p><span className="font-semibold text-slate-500">Materi:</span> {j.materi_pokok}</p>
                            <p><span className="font-semibold text-slate-500">Metode:</span> {j.metode_pembelajaran} &bull; <span className="font-semibold text-slate-500">Hadir:</span> {j.jumlah_hadir} siswa</p>
                            {j.catatan && <p className="text-[11px] text-slate-400 italic mt-1 bg-slate-50 px-2 py-1 rounded-[var(--ui-radius-small)]">Catatan: {j.catatan}</p>}
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
                      <th className="px-5 py-3 text-center font-bold">Status</th>
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
                        const isLate = j.submitted_at && j.submitted_at.substring(0, 10) > j.tanggal;
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
                              <StatusBadge submitted={!!j.submitted_at} isLate={isLate} />
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
            <div className="ui-card rounded-3xl p-8 sm:p-12 text-center flex flex-col items-center justify-center gap-3 border border-slate-100/90 shadow-sm">
              <div 
                className="w-20 h-20 rounded-3xl flex items-center justify-center mb-1 shadow-inner"
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
        <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-[var(--ui-radius-small)] shadow-sm font-semibold text-xs flex items-center gap-2 animate-in slide-in-from-bottom-5 ${toast.type ==='error' ?'bg-red-600 text-white' :'bg-emerald-600 text-white'}`}>
          <CheckCircle2 size={14} />
          {toast.msg}
        </div>
      )}
    </div>
  );
}
