import { useState, useMemo } from 'react';
import { 
  Shield, Users, UserCog, Search, ChevronDown, ChevronRight, Edit2, 
  Save, X, Building2, AlertCircle, Briefcase, Sparkles, UserPlus, 
  CheckCircle2, RotateCcw, Info, UserCheck, BookOpen, GraduationCap, 
  HeartHandshake, Landmark, ArrowRight, ShieldCheck, Trash2
} from 'lucide-react';
import { PageHeader } from '../../../components/monitoring/ui/index.js';
import { Button, UISelect, Modal } from '../../../components/ui.jsx';
import { getRoleKeyLabel } from '../../../utils/constants.js';

// ─── DEFINISI ORGANOGRAM STRUKTUR SEKOLAH ──────────────────────────────────────
const ORGANOGRAM = [
  {
    key: 'kepsek',
    title: 'Kepala Sekolah',
    color: 'from-blue-600 to-indigo-600',
    headerBg: 'bg-[var(--ui-primary)] text-white',
    badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    description: 'Pimpinan sekolah & monitoring seluruh data dan kebijakan akademik.',
    defaultAssignValue: 'kepsek',
    children: []
  },
  {
    key: 'tu',
    title: 'Tata Usaha (TU) & Keuangan',
    color: 'from-cyan-600 to-teal-600',
    headerBg: 'bg-cyan-600 text-white',
    badgeColor: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    description: 'Administrasi kepegawaian, surat-menyurat, cetak kartu, dan keuangan.',
    defaultAssignValue: 'tu',
    children: [
      { key: 'sekretaris_tu', title: 'Sekretaris TU', badge: 'TU', assignValue: 'sekretaris_tu' },
      { key: 'bendahara', title: 'Bendahara Sekolah', badge: 'Keuangan', assignValue: 'bendahara' },
      { key: 'karyawan', title: 'Staf Administrasi / Umum', badge: 'Staf', assignValue: 'karyawan' },
    ]
  },
  {
    key: 'waka_kurikulum',
    title: 'Waka Kurikulum',
    color: 'from-amber-500 to-orange-500',
    headerBg: 'bg-amber-600 text-white',
    badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
    description: 'Jadwal Mengajar (KBM), Mata Pelajaran, Beban Jam (JP), & Silabus.',
    defaultAssignValue: 'waka_kurikulum',
    children: [
      { key: 'sekretaris_kurikulum', title: 'Sekretaris Kurikulum', badge: 'Kurikulum', assignValue: 'sekretaris_kurikulum' },
      { key: 'anggota_kurikulum', title: 'Anggota Tim Kurikulum', badge: 'Kurikulum', assignValue: 'anggota_kurikulum' },
    ]
  },
  {
    key: 'waka_kesiswaan',
    title: 'Waka Kesiswaan & Kedisiplinan',
    color: 'from-orange-500 to-red-500',
    headerBg: 'bg-orange-600 text-white',
    badgeColor: 'bg-orange-50 text-orange-700 border-orange-200',
    description: 'Presensi siswa, tatib & skor pelanggaran, BP/BK, dan Pembina OSIS.',
    defaultAssignValue: 'waka_kesiswaan',
    children: [
      { key: 'sekretaris_kesiswaan', title: 'Sekretaris Kesiswaan', badge: 'Kesiswaan', assignValue: 'sekretaris_kesiswaan' },
      { key: 'bpbk', title: 'Guru BP / BK', badge: 'BK', assignValue: 'bpbk' },
      { key: 'pembina_osis', title: 'Pembina OSIS', badge: 'OSIS', assignValue: 'pembina_osis' },
      { key: 'sekretaris_osis', title: 'Sekretaris OSIS', badge: 'OSIS', assignValue: 'sekretaris_osis' },
      { key: 'anggota_kesiswaan', title: 'Anggota Kesiswaan', badge: 'Kesiswaan', assignValue: 'anggota_kesiswaan' },
    ]
  },
  {
    key: 'waka_hubin',
    title: 'Waka Hubungan Industri (Hubin / PKL)',
    color: 'from-rose-500 to-pink-500',
    headerBg: 'bg-rose-600 text-white',
    badgeColor: 'bg-rose-50 text-rose-700 border-rose-200',
    description: 'Praktek Kerja Lapangan (PKL/Prakerin), Mitra Industri DUDI, & Jurnal PKL.',
    defaultAssignValue: 'waka_hubin',
    children: [
      { key: 'sekretaris_hubin', title: 'Sekretaris Hubin', badge: 'Hubin', assignValue: 'sekretaris_hubin' },
      { key: 'anggota_hubin', title: 'Anggota Tim PKL', badge: 'Hubin', assignValue: 'anggota_hubin' },
    ]
  },
  {
    key: 'waka_sarpras',
    title: 'Waka Sarana & Prasarana',
    color: 'from-purple-500 to-violet-500',
    headerBg: 'bg-purple-600 text-white',
    badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
    description: 'Pengelolaan inventaris ruang teori, laboratorium praktik, dan denah sekolah.',
    defaultAssignValue: 'waka_sarpras',
    children: [
      { key: 'sekretaris_sarpras', title: 'Sekretaris Sarpras', badge: 'Sarpras', assignValue: 'sekretaris_sarpras' },
      { key: 'anggota_sarpras', title: 'Anggota Tim Sarpras', badge: 'Sarpras', assignValue: 'anggota_sarpras' },
    ]
  },
];

// Helper Functions
const getPersonId = (p) => {
  if (!p) return '';
  return String(p.code || p.staff_code || p.id || p.name || '').trim();
};

const samePerson = (p1, p2) => {
  if (!p1 || !p2) return false;
  const id1 = getPersonId(p1).toLowerCase();
  const id2 = getPersonId(p2).toLowerCase();
  if (id1 && id2 && id1 === id2) return true;
  const name1 = String(p1.name || p1.nama || '').trim().toLowerCase();
  const name2 = String(p2.name || p2.nama || '').trim().toLowerCase();
  return name1 && name2 && name1 === name2;
};

function getRoleCategory(person, classes = []) {
  if (!person) return 'guru';
  const role = String(person.role || '').toLowerCase().trim();
  const subrole = String(person.subrole || '').toLowerCase().trim();
  const division = String(person.division || '').toLowerCase().trim();

  if (role === 'kepsek') return 'kepsek';
  if (role === 'tu' || role === 'tata_usaha' || role === 'admin_tu') {
    if (subrole) return subrole;
    return 'tu';
  }
  if (role === 'waka') return `waka_${division || 'kurikulum'}`;
  if (role.startsWith('custom_')) return role;

  if (subrole) return subrole;

  // Auto-detect Wali Kelas dari data classes
  const code = String(person.code || person.id || '').trim();
  const name = String(person.name || person.nama || '').trim();
  if (code || name) {
    const isWali = (classes || []).some(c => {
      const hr = String(c.homeroom || '').trim();
      return hr && (hr === code || (name && hr.toLowerCase() === name.toLowerCase()));
    });
    if (isWali && role !== 'waka' && role !== 'kepsek') return 'walikelas';
  }

  if (role === 'karyawan') return subrole || 'karyawan';
  if (role === 'guru') return subrole || 'guru';

  if (person._source === 'staff') {
    if (division.includes('tata usaha') || division.includes('tu') || division.includes('bendahara') || division.includes('administrasi')) {
      return 'tu';
    }
    return 'karyawan';
  }

  return 'guru';
}

function getCurrentPositionValue(person, classes = []) {
  if (!person) return 'guru';
  const role = String(person.role || '').toLowerCase().trim();
  const subrole = String(person.subrole || '').toLowerCase().trim();
  const division = String(person.division || '').toLowerCase().trim();

  if (role === 'kepsek') return 'kepsek';
  if (role === 'tu' || role === 'tata_usaha' || role === 'admin_tu') {
    return subrole || 'tu';
  }
  if (role === 'waka') return `waka_${division || 'kurikulum'}`;
  if (subrole) return subrole;

  const code = String(person.code || person.id || '').trim();
  const name = String(person.name || person.nama || '').trim();
  if (code || name) {
    const isWali = (classes || []).some(c => {
      const hr = String(c.homeroom || '').trim();
      return hr && (hr === code || (name && hr.toLowerCase() === name.toLowerCase()));
    });
    if (isWali && role !== 'waka' && role !== 'kepsek') return 'walikelas';
  }

  if (role === 'guru') return subrole || 'guru';
  if (role === 'karyawan') return subrole || 'karyawan';
  if (role.startsWith('custom_')) return role;
  if (person._source === 'staff') {
    if (division.includes('tata usaha') || division.includes('tu') || division.includes('bendahara')) {
      return 'tu';
    }
    return 'karyawan';
  }
  return 'guru';
}

function getStaffForRoleKey(teachers, staffs, roleKey, classes = []) {
  const t = (teachers || []).map(p => ({ ...p, _source: 'teacher' }));
  const s = (staffs || []).map(p => ({ ...p, _source: 'staff' }));
  const all = [...t, ...s];
  return all.filter(p => getRoleCategory(p, classes) === roleKey);
}

// ─── CARD BAGAN ORGANOGRAM ───────────────────────────────────────────────────
function OrgCard({ node, teachers, staffs, classes = [], onQuickAssign, onEditPerson, onResetPerson }) {
  const [expanded, setExpanded] = useState(true);
  const headStaff = getStaffForRoleKey(teachers, staffs, node.key, classes);
  
  const subRolesStaff = node.children.map(child => ({
    ...child,
    staffList: getStaffForRoleKey(teachers, staffs, child.key, classes)
  }));
  
  const totalSubStaff = subRolesStaff.reduce((acc, c) => acc + c.staffList.length, 0);
  const totalAll = headStaff.length + totalSubStaff;

  return (
    <div className="bg-white border border-slate-200/90 rounded-[var(--ui-radius-card)] shadow-xs overflow-hidden flex flex-col hover:shadow-sm transition-all w-full">
      {/* Header Banner */}
      <div className={`bg-gradient-to-r ${node.color} p-4 text-white flex items-start justify-between gap-3`}>
        <div>
          <div className="flex items-center gap-2">
            <Building2 size={16} className="opacity-90 shrink-0" />
            <h4 className="font-extrabold text-sm tracking-wide leading-tight">{node.title}</h4>
          </div>
          <p className="text-[11px] text-white/90 font-medium mt-1 leading-snug">{node.description}</p>
        </div>

        <button
          type="button"
          onClick={() => onQuickAssign(node.defaultAssignValue)}
          className="shrink-0 bg-white/20 hover:bg-white/30 text-white text-[11px] font-black px-2.5 py-1.5 rounded-[var(--ui-radius-small)] border border-white/30 backdrop-blur-xs transition-all flex items-center gap-1 cursor-pointer"
          title={`Tugaskan Staf di ${node.title}`}
        >
          <UserPlus size={12} />
          <span>+ Tugaskan</span>
        </button>
      </div>

      {/* Main Role Personnel List */}
      <div className="p-4 space-y-3 bg-white flex-1">
        <div className="flex items-center justify-between">
          <span className="text-[10.5px] font-black uppercase tracking-wider text-slate-400">Pejabat Utama ({headStaff.length})</span>
          {node.children.length > 0 && (
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="text-[10.5px] font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 cursor-pointer bg-indigo-50 px-2 py-0.5 rounded-[var(--ui-radius-small)]"
            >
              {expanded ? 'Sembunyikan Tim' : `Lihat Tim (${totalSubStaff})`}
              {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            </button>
          )}
        </div>

        {headStaff.length === 0 ? (
          <div className="p-3 rounded-[var(--ui-radius-small)] border border-dashed border-slate-200 text-center bg-slate-50/50">
            <p className="text-xs text-slate-400 font-semibold italic">Belum ada pejabat yang ditugaskan</p>
            <button
              type="button"
              onClick={() => onQuickAssign(node.defaultAssignValue)}
              className="mt-1 text-[11px] text-indigo-600 font-bold hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              <UserPlus size={11} /> Klik untuk Menugaskan
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {headStaff.map(person => (
              <div
                key={getPersonId(person)}
                className="flex items-center justify-between p-2.5 rounded-[var(--ui-radius-small)] border border-slate-100 bg-slate-50/80 hover:bg-indigo-50/50 hover:border-indigo-200 transition-all group"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-[var(--ui-radius-small)] bg-indigo-600 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-xs">
                    {(person.name || person.nama || '?')[0].toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-black text-slate-800 truncate">{person.name || person.nama}</p>
                    <p className="text-[10px] text-slate-400 font-mono font-semibold">Kode: {getPersonId(person)}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1 opacity-90 group-hover:opacity-100 shrink-0">
                  <button
                    type="button"
                    onClick={() => onEditPerson(person)}
                    className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-white rounded transition-colors cursor-pointer"
                    title="Ubah Jabatan"
                  >
                    <Edit2 size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => onResetPerson(person)}
                    className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                    title="Lepas dari Jabatan Ini"
                  >
                    <RotateCcw size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Sub-Roles / Team Members (Expandable) */}
        {expanded && node.children.length > 0 && (
          <div className="pt-3 border-t border-slate-100 space-y-3 mt-3">
            <span className="text-[10.5px] font-black uppercase tracking-wider text-slate-400 block">Tim & Anggota Divisi</span>
            
            <div className="space-y-3">
              {subRolesStaff.map(sub => (
                <div key={sub.key} className="space-y-1.5 bg-slate-50/50 p-2.5 rounded-[var(--ui-radius-small)] border border-slate-100">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-slate-700 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                      {sub.title}
                    </span>
                    <button
                      type="button"
                      onClick={() => onQuickAssign(sub.assignValue)}
                      className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                    >
                      + Tambah
                    </button>
                  </div>

                  {sub.staffList.length === 0 ? (
                    <p className="text-[10.5px] text-slate-400 italic pl-3">Belum ada anggota</p>
                  ) : (
                    <div className="space-y-1 pl-3">
                      {sub.staffList.map(person => (
                        <div key={getPersonId(person)} className="flex items-center justify-between text-xs py-1 border-b border-slate-100/80 last:border-none">
                          <span className="font-bold text-slate-800 truncate pr-2">{person.name || person.nama}</span>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => onEditPerson(person)}
                              className="text-slate-400 hover:text-indigo-600 p-0.5 cursor-pointer"
                              title="Ubah Jabatan"
                            >
                              <Edit2 size={12} />
                            </button>
                            <button
                              type="button"
                              onClick={() => onResetPerson(person)}
                              className="text-slate-400 hover:text-rose-600 p-0.5 cursor-pointer"
                              title="Lepas Jabatan"
                            >
                              <RotateCcw size={12} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer Summary */}
      <div className="bg-slate-50/80 px-4 py-2 border-t border-slate-100 flex items-center justify-between text-[10.5px] font-bold text-slate-500">
        <span>Total Personel Divisi</span>
        <span className="px-2 py-0.5 bg-white border border-slate-200 rounded-full font-black text-slate-700">{totalAll} Orang</span>
      </div>
    </div>
  );
}

// ─── MAIN COMPONENT ────────────────────────────────────────────────────────────
export default function ManajemenRole(props) {
  const {
    teachers = [],
    staffs = [],
    classes = [],
    setTeachers,
    setStaffs,
    saveDatabaseNow,
    showNotification,
    isSuperAdminRole,
    currentUser,
    adminUser,
    syncAuthSnapshotNow,
    rolePermissions
  } = props;

  const [activeView, setActiveView] = useState('organogram'); // 'organogram' | 'assignment'
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('semua');
  const [isSaving, setIsSaving] = useState(false);

  // Modal State for edit assignment
  const [editingPerson, setEditingPerson] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPersonId, setSelectedPersonId] = useState('');
  const [selectedPosition, setSelectedPosition] = useState('guru');

  // Confirmation modal for resetting position
  const [resetConfirmPerson, setResetConfirmPerson] = useState(null);

  // Build position options with clean optgroups
  const positionGroups = useMemo(() => {
    const groups = [
      {
        groupLabel: 'Pimpinan & Tata Usaha',
        options: [
          { value: 'kepsek', label: 'Kepala Sekolah', role: 'kepsek', division: '', subrole: '', desc: 'Akses monitoring penuh semua modul' },
          { value: 'tu', label: 'Kepala Tata Usaha (Admin TU)', role: 'tu', division: 'tu', subrole: '', desc: 'Administrasi data, surat, dan karyawan' },
          { value: 'sekretaris_tu', label: 'Sekretaris TU', role: 'tu', division: 'tu', subrole: 'sekretaris_tu', desc: 'Surat menyurat & arsip' },
          { value: 'bendahara', label: 'Bendahara Sekolah', role: 'tu', division: 'tu', subrole: 'bendahara', desc: 'Keuangan & administrasi' },
        ]
      },
      {
        groupLabel: 'Waka & Tim Kurikulum',
        options: [
          { value: 'waka_kurikulum', label: 'Waka Kurikulum', role: 'waka', division: 'kurikulum', subrole: '', desc: 'Kelola Jadwal KBM, Mapel, Silabus, & JP' },
          { value: 'sekretaris_kurikulum', label: 'Sekretaris Kurikulum', role: 'guru', division: 'kurikulum', subrole: 'sekretaris_kurikulum', desc: 'Arsip kurikulum & modul ajar' },
          { value: 'anggota_kurikulum', label: 'Anggota Tim Kurikulum', role: 'guru', division: 'kurikulum', subrole: 'anggota_kurikulum', desc: 'Bantuan teknis KBM & Silabus' },
        ]
      },
      {
        groupLabel: 'Waka & Tim Kesiswaan',
        options: [
          { value: 'waka_kesiswaan', label: 'Waka Kesiswaan', role: 'waka', division: 'kesiswaan', subrole: '', desc: 'Presensi siswa, tatib/skor, & kedisiplinan' },
          { value: 'bpbk', label: 'Guru BP / BK', role: 'guru', division: 'kesiswaan', subrole: 'bpbk', desc: 'Bimbingan Konseling & catatan khusus siswa' },
          { value: 'pembina_osis', label: 'Pembina OSIS', role: 'guru', division: 'kesiswaan', subrole: 'pembina_osis', desc: 'Kegiatan kesiswaan & ekstrakurikuler' },
          { value: 'sekretaris_osis', label: 'Sekretaris OSIS', role: 'guru', division: 'kesiswaan', subrole: 'sekretaris_osis', desc: 'Administrasi OSIS' },
          { value: 'sekretaris_kesiswaan', label: 'Sekretaris Kesiswaan', role: 'guru', division: 'kesiswaan', subrole: 'sekretaris_kesiswaan', desc: 'Rekap tatib & pelanggaran' },
        ]
      },
      {
        groupLabel: 'Waka & Tim Hubin (PKL / Prakerin)',
        options: [
          { value: 'waka_hubin', label: 'Waka Hubin', role: 'waka', division: 'hubin', subrole: '', desc: 'Kelola Mitra Industri, Penugasan PKL, & Jurnal' },
          { value: 'sekretaris_hubin', label: 'Sekretaris Hubin', role: 'guru', division: 'hubin', subrole: 'sekretaris_hubin', desc: 'Administrasi dokumen & surat jalan PKL' },
          { value: 'anggota_hubin', label: 'Anggota Tim PKL', role: 'guru', division: 'hubin', subrole: 'anggota_hubin', desc: 'Monitoring & pembimbing PKL' },
        ]
      },
      {
        groupLabel: 'Waka & Tim Sarana Prasarana',
        options: [
          { value: 'waka_sarpras', label: 'Waka Sarpras', role: 'waka', division: 'sarpras', subrole: '', desc: 'Kelola Ruang Kelas, Lab, & Denah Sekolah' },
          { value: 'sekretaris_sarpras', label: 'Sekretaris Sarpras', role: 'guru', division: 'sarpras', subrole: 'sekretaris_sarpras', desc: 'Inventarisasi sarana sekolah' },
          { value: 'anggota_sarpras', label: 'Anggota Tim Sarpras', role: 'guru', division: 'sarpras', subrole: 'anggota_sarpras', desc: 'Pemeliharaan fasilitas' },
        ]
      },
      {
        groupLabel: 'Pengajar & Wali Kelas',
        options: [
          { value: 'walikelas', label: 'Wali Kelas', role: 'guru', division: '', subrole: 'walikelas', desc: 'Laporan kelas binaan & catatan siswa' },
          { value: 'guru', label: 'Guru Biasa (Pengajar)', role: 'guru', division: '', subrole: '', desc: 'Jurnal harian, silabus pribadi, absensi KBM' },
        ]
      },
      {
        groupLabel: 'Staf Karyawan / Umum',
        options: [
          { value: 'karyawan', label: 'Karyawan / Staf Umum', role: 'karyawan', division: '', subrole: '', desc: 'Toolman, Satpam, Kebersihan' },
        ]
      }
    ];

    // Add custom roles if any
    const customKeys = Object.keys(rolePermissions || {}).filter(k => k.startsWith('custom_'));
    if (customKeys.length > 0) {
      const customOpts = customKeys.map(k => ({
        value: k,
        label: rolePermissions[k]?.__label || k.replace('custom_', ''),
        role: 'guru',
        division: '',
        subrole: k,
        desc: 'Role kustom buatan administrator'
      }));
      groups.push({
        groupLabel: 'Role Kustom Kustomisasi',
        options: customOpts
      });
    }

    return groups;
  }, [rolePermissions]);

  const flatPositionOptions = useMemo(() => {
    return positionGroups.flatMap(g => g.options);
  }, [positionGroups]);

  const allPeople = useMemo(() => {
    const t = (teachers || []).map(p => ({ ...p, _source: 'teacher' }));
    const s = (staffs || []).map(p => ({ ...p, _source: 'staff' }));
    return [...t, ...s];
  }, [teachers, staffs]);

  const filteredPeople = useMemo(() => {
    return allPeople.filter(p => {
      const matchSearch = !search ||
        (p.name || p.nama || '').toLowerCase().includes(search.toLowerCase()) ||
        getPersonId(p).toLowerCase().includes(search.toLowerCase());
      const cat = getRoleCategory(p, classes);
      const matchRole = filterRole === 'semua' || cat === filterRole;
      return matchSearch && matchRole;
    });
  }, [allPeople, search, filterRole, classes]);

  // Open modal for direct editing of a person
  const handleOpenEditRole = (person) => {
    setEditingPerson(person);
    setSelectedPersonId(getPersonId(person));
    setSelectedPosition(getCurrentPositionValue(person, classes));
    setModalOpen(true);
  };

  // Open modal from "+ Tugaskan" button
  const handleQuickAssignFromOrg = (defaultPositionValue) => {
    setSelectedPosition(defaultPositionValue || 'guru');
    setEditingPerson(null);
    setSelectedPersonId(allPeople[0] ? getPersonId(allPeople[0]) : '');
    setModalOpen(true);
  };

  // Save Role / Position assignment
  const handleSaveRole = async () => {
    const targetPerson = editingPerson || allPeople.find(p => getPersonId(p) === selectedPersonId);
    if (!targetPerson) {
      showNotification('Silakan pilih personel staf/guru terlebih dahulu.', 'warning');
      return;
    }

    const selectedOpt = flatPositionOptions.find(opt => opt.value === selectedPosition);
    if (!selectedOpt) {
      showNotification('Silakan pilih jabatan yang valid.', 'warning');
      return;
    }

    setIsSaving(true);

    let changes = {
      role: selectedOpt.role,
      division: selectedOpt.division,
      subrole: selectedOpt.subrole
    };

    if (targetPerson._source === 'staff' && selectedPosition.startsWith('custom_')) {
      changes = {
        role: selectedPosition,
        division: '',
        subrole: ''
      };
    }

    try {
      const isTeacher = (teachers || []).some(t => samePerson(t, targetPerson));
      const isStaff = (staffs || []).some(s => samePerson(s, targetPerson));

      let nextTeachers = teachers || [];
      let nextStaffs = staffs || [];

      if (isTeacher || targetPerson._source === 'teacher') {
        nextTeachers = (teachers || []).map(t =>
          samePerson(t, targetPerson) ? { ...t, ...changes } : t
        );
        await saveDatabaseNow({ teachers: nextTeachers }, 'memperbarui jabatan guru');
        if (setTeachers) setTeachers(nextTeachers);
      }
      
      if (isStaff || targetPerson._source === 'staff') {
        nextStaffs = (staffs || []).map(s =>
          samePerson(s, targetPerson) ? { ...s, ...changes } : s
        );
        await saveDatabaseNow({ staffs: nextStaffs }, 'memperbarui jabatan staf');
        if (setStaffs) setStaffs(nextStaffs);
      }

      // Sync auth snapshot sekali saja dengan data terbaru
      if (syncAuthSnapshotNow) {
        await syncAuthSnapshotNow(adminUser, nextTeachers, nextStaffs, 'sync role assignment');
      }

      showNotification(`Jabatan ${targetPerson.name || targetPerson.nama} berhasil diperbarui menjadi ${selectedOpt.label}.`, 'success');
      setModalOpen(false);
      setEditingPerson(null);
    } catch (err) {
      console.error('Error saving role:', err);
      showNotification('Gagal menyimpan perubahan jabatan.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Reset Person back to default (Guru Biasa / Karyawan Umum)
  const handleExecuteResetPosition = async () => {
    if (!resetConfirmPerson) return;
    setIsSaving(true);

    const isTeacher = (teachers || []).some(t => samePerson(t, resetConfirmPerson));
    const isStaff = (staffs || []).some(s => samePerson(s, resetConfirmPerson));

    const defaultChanges = isStaff 
      ? { role: 'karyawan', division: '', subrole: '' }
      : { role: 'guru', division: '', subrole: '' };

    try {
      let nextTeachers = teachers || [];
      let nextStaffs = staffs || [];

      if (isTeacher || resetConfirmPerson._source === 'teacher') {
        nextTeachers = (teachers || []).map(t =>
          samePerson(t, resetConfirmPerson) ? { ...t, ...defaultChanges } : t
        );
        await saveDatabaseNow({ teachers: nextTeachers }, 'reset jabatan guru');
        if (setTeachers) setTeachers(nextTeachers);
      }

      if (isStaff || resetConfirmPerson._source === 'staff') {
        nextStaffs = (staffs || []).map(s =>
          samePerson(s, resetConfirmPerson) ? { ...s, ...defaultChanges } : s
        );
        await saveDatabaseNow({ staffs: nextStaffs }, 'reset jabatan staf');
        if (setStaffs) setStaffs(nextStaffs);
      }

      // Sync auth snapshot sekali saja
      if (syncAuthSnapshotNow) {
        await syncAuthSnapshotNow(adminUser, nextTeachers, nextStaffs, 'sync role reset');
      }

      showNotification(`Jabatan ${resetConfirmPerson.name || resetConfirmPerson.nama} telah dilepas (dikembalikan ke Guru/Staf biasa).`, 'success');
      setResetConfirmPerson(null);
    } catch (err) {
      showNotification('Gagal melepas jabatan.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isSuperAdminRole(currentUser?.role)) {
    return (
      <div className="bg-white border border-slate-200 rounded-[var(--ui-radius-card)] p-10 text-center max-w-md mx-auto mt-10 shadow-sm">
        <AlertCircle size={40} className="mx-auto text-slate-300 mb-3" />
        <h3 className="text-base font-black text-slate-700">Akses SuperAdmin Diperlukan</h3>
        <p className="text-sm text-slate-400 mt-1">Halaman ini hanya dapat diakses oleh SuperAdmin.</p>
      </div>
    );
  }

  const selectedOptPreview = flatPositionOptions.find(opt => opt.value === selectedPosition) || { label: 'Guru Biasa', desc: 'Pengajar reguler' };

  return (
    <div className="space-y-5 w-full animate-in fade-in duration-200">
      
      {/* Header with Navigation Tabs */}
      <PageHeader
        title="Struktur & Jabatan Staf"
        description="Kelola susunan hierarki organisasi sekolah, tunjuk Waka, Tim Kurikulum, Kesiswaan, Tata Usaha, dan pembagian tugas staf."
        icon={Shield}
        tabs={[
          { id: 'organogram', label: 'Bagan Struktur Sekolah', icon: Building2 },
          { id: 'assignment', label: 'Daftar Penugasan Jabatan', icon: UserCog },
        ]}
        activeTab={activeView}
        onTabChange={setActiveView}
        customButtons={
          <Button
            type="button"
            onClick={() => handleQuickAssignFromOrg('waka_kurikulum')}
            className="text-xs font-bold gap-1.5 shadow-xs"
          >
            <UserPlus size={14} /> + Tugaskan Jabatan Baru
          </Button>
        }
      />

      {/* Guide Banner */}
      <div className="p-4 rounded-[var(--ui-radius-card)] bg-gradient-to-r from-blue-50 via-indigo-50/40 to-slate-50 border border-indigo-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-[var(--ui-radius-small)] bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
            <Info size={18} />
          </div>
          <div>
            <h4 className="text-xs font-black text-indigo-900 uppercase tracking-wider">Panduan Cepat Struktur Jabatan</h4>
            <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
              Tunjuk guru atau karyawan ke dalam struktur sekolah (Kepsek, Waka, Bendahara, Pembina OSIS). 
              <strong> Hak akses menu aplikasi akan otomatis terbuka</strong> sesuai dengan jabatan yang Anda berikan.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="text-[11px] font-bold text-slate-500 bg-white/80 px-3 py-1.5 rounded-[var(--ui-radius-small)] border border-slate-200">
            Total Personel: <b className="text-slate-800">{allPeople.length} Orang</b>
          </div>
        </div>
      </div>

      {/* VIEW 1: ORGANOGRAM BAGAN */}
      {activeView === 'organogram' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {ORGANOGRAM.map(node => (
            <OrgCard
              key={node.key}
              node={node}
              teachers={teachers}
              staffs={staffs}
              classes={classes}
              onQuickAssign={handleQuickAssignFromOrg}
              onEditPerson={handleOpenEditRole}
              onResetPerson={setResetConfirmPerson}
            />
          ))}
        </div>
      )}

      {/* VIEW 2: DAFTAR TABEL PENUGASAN */}
      {activeView === 'assignment' && (
        <div className="bg-white border border-slate-200/80 rounded-[var(--ui-radius-card)] p-4 sm:p-5 shadow-xs space-y-4">
          
          {/* Toolbar Search & Filter */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative flex-1 w-full">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari nama atau kode guru/staf..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200/80 rounded-[var(--ui-radius-small)] text-xs font-semibold focus:outline-none focus:bg-white focus:ring-2 focus:ring-[var(--ui-primary)]/20 transition-all"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <UISelect
                value={filterRole}
                onChange={e => setFilterRole(e.target.value)}
                className="w-full sm:w-56 text-xs"
                placeholder="Filter Jabatan..."
              >
                <option value="semua">Semua Jabatan</option>
                <option value="kepsek">Kepala Sekolah</option>
                <option value="tu">Tata Usaha (TU)</option>
                <option value="waka_kurikulum">Waka Kurikulum</option>
                <option value="waka_kesiswaan">Waka Kesiswaan</option>
                <option value="waka_hubin">Waka Hubin</option>
                <option value="waka_sarpras">Waka Sarpras</option>
                <option value="bpbk">Guru BP / BK</option>
                <option value="pembina_osis">Pembina OSIS</option>
                <option value="walikelas">Wali Kelas</option>
                <option value="guru">Guru Biasa (Pengajar)</option>
                <option value="karyawan">Karyawan / Staf Umum</option>
              </UISelect>

              <Button
                type="button"
                onClick={() => handleQuickAssignFromOrg('guru')}
                className="text-xs font-bold gap-1.5 shrink-0"
              >
                <UserPlus size={13} /> + Tugaskan
              </Button>
            </div>
          </div>

          {/* Table of Personnel */}
          <div className="overflow-x-auto rounded-[var(--ui-radius-small)] border border-slate-200/80">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50/90 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200/80">
                <tr>
                  <th className="px-3 py-2.5 text-center w-12">No</th>
                  <th className="px-3 py-2.5 w-16 text-center">Kode</th>
                  <th className="px-4 py-2.5">Nama Guru / Staf</th>
                  <th className="px-3 py-2.5 text-center">Kategori</th>
                  <th className="px-4 py-2.5">Jabatan Struktural Saat Ini</th>
                  <th className="px-4 py-2.5 text-right w-36">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredPeople.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400 bg-slate-50/30">
                      <Users size={32} className="mx-auto mb-2 opacity-30" />
                      <p className="font-bold">Tidak ada staf ditemukan</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">Coba ubah kata kunci pencarian atau filter jabatan.</p>
                    </td>
                  </tr>
                ) : (
                  filteredPeople.map((person, idx) => {
                    const currentPosVal = getCurrentPositionValue(person, classes);
                    const currentOpt = flatPositionOptions.find(opt => opt.value === currentPosVal) || { label: 'Guru Biasa' };
                    const isStaff = person._source === 'staff';
                    const hasSpecialPosition = currentPosVal !== 'guru' && currentPosVal !== 'karyawan';

                    return (
                      <tr key={`${person._source}_${getPersonId(person)}`} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-3 py-2.5 text-center text-slate-400 font-bold">{idx + 1}</td>
                        <td className="px-3 py-2.5 text-center font-mono font-black text-slate-700">
                          <span className="px-2 py-0.5 bg-slate-100 rounded text-[11px]">{getPersonId(person)}</span>
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2.5">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center font-black text-xs shrink-0 ${
                              isStaff ? 'bg-cyan-100 text-cyan-800' : 'bg-indigo-100 text-indigo-800'
                            }`}>
                              {(person.name || person.nama || '?')[0].toUpperCase()}
                            </div>
                            <span className="font-extrabold text-slate-800">{person.name || person.nama}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            isStaff ? 'bg-cyan-50 text-cyan-700 border border-cyan-200' : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                          }`}>
                            {isStaff ? 'Karyawan' : 'Guru'}
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black border ${
                            hasSpecialPosition 
                              ? 'bg-indigo-50 text-indigo-800 border-indigo-200/80' 
                              : 'bg-slate-100 text-slate-600 border-slate-200/60'
                          }`}>
                            {hasSpecialPosition && <Sparkles size={11} className="text-indigo-600 shrink-0" />}
                            <span>{currentOpt.label}</span>
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenEditRole(person)}
                              className="h-7 px-2 text-xs font-bold gap-1"
                              title="Ubah Jabatan"
                            >
                              <Edit2 size={12} /> Ubah
                            </Button>
                            {hasSpecialPosition && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setResetConfirmPerson(person)}
                                className="h-7 px-2 text-xs font-bold text-rose-600 hover:bg-rose-50"
                                title="Lepas Jabatan (Kembali ke Biasa)"
                              >
                                <RotateCcw size={12} /> Lepas
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="flex justify-between items-center text-[11px] text-slate-400 font-bold uppercase tracking-wider pt-2">
            <span>Menampilkan {filteredPeople.length} personel</span>
            <span>Total: {allPeople.length} Staf / Guru</span>
          </div>

        </div>
      )}

      {/* MODAL: TUGASKAN / UBAH JABATAN */}
      {modalOpen && (
        <Modal
          isOpen={true}
          onClose={() => { setModalOpen(false); setEditingPerson(null); }}
          title={editingPerson ? `Ubah Jabatan: ${editingPerson.name || editingPerson.nama}` : "Tugaskan Staf ke Jabatan"}
        >
          <div className="p-5 space-y-4 max-w-md w-full">
            
            {/* Person Picker */}
            <div>
              <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1.5">
                1. Pilih Guru / Karyawan
              </label>
              {editingPerson ? (
                <div className="p-3 rounded-[var(--ui-radius-small)] bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-black text-slate-800">{editingPerson.name || editingPerson.nama}</p>
                    <p className="text-[10px] text-slate-500 font-mono mt-0.5">Kode/ID: {getPersonId(editingPerson)} ({editingPerson._source === 'staff' ? 'Karyawan' : 'Guru'})</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditingPerson(null)}
                    className="text-[11px] font-bold text-indigo-600 hover:underline cursor-pointer"
                  >
                    Ganti Orang
                  </button>
                </div>
              ) : (
                <UISelect
                  value={selectedPersonId}
                  onChange={e => setSelectedPersonId(e.target.value)}
                  className="w-full text-xs font-bold"
                  placeholder="-- Pilih Guru atau Karyawan --"
                >
                  <optgroup label="Daftar Guru Pengajar">
                    {teachers.map(t => (
                      <option key={t.code || t.id} value={getPersonId(t)}>
                        [Guru {t.code}] {t.name || t.nama}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Daftar Staf Karyawan">
                    {staffs.map(s => (
                      <option key={s.code || s.staff_code || s.id} value={getPersonId(s)}>
                        [Staf {s.code || s.staff_code}] {s.name || s.nama}
                      </option>
                    ))}
                  </optgroup>
                </UISelect>
              )}
            </div>

            {/* Position Picker */}
            <div>
              <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1.5">
                2. Pilih Jabatan Baru
              </label>
              <UISelect
                value={selectedPosition}
                onChange={e => setSelectedPosition(e.target.value)}
                className="w-full text-xs font-bold"
              >
                {positionGroups.map(grp => (
                  <optgroup key={grp.groupLabel} label={grp.groupLabel}>
                    {grp.options.map(opt => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </UISelect>
            </div>

            {/* Position Preview Card */}
            <div className="p-3.5 rounded-[var(--ui-radius-small)] bg-indigo-50/80 border border-indigo-200 text-indigo-900 space-y-1">
              <p className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles size={13} className="text-indigo-600" />
                <span>Jabatan Terpilih: <b>{selectedOptPreview.label}</b></span>
              </p>
              <p className="text-xs text-indigo-800 leading-relaxed font-medium">
                {selectedOptPreview.desc || "Personel akan mendapatkan akses menu sesuai dengan jabatan ini."}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <Button
                type="button"
                variant="ghost"
                onClick={() => { setModalOpen(false); setEditingPerson(null); }}
                disabled={isSaving}
                className="text-xs"
              >
                Batal
              </Button>
              <Button
                type="button"
                onClick={handleSaveRole}
                disabled={isSaving}
                className="text-xs font-black gap-1.5"
              >
                {isSaving ? "Menyimpan..." : "Simpan Penugasan"}
              </Button>
            </div>

          </div>
        </Modal>
      )}

      {/* MODAL KONFIRMASI LEPAS JABATAN */}
      {resetConfirmPerson && (
        <Modal
          isOpen={true}
          onClose={() => setResetConfirmPerson(null)}
          title="Konfirmasi Lepas Jabatan"
        >
          <div className="p-5 space-y-4 max-w-sm w-full text-center">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <RotateCcw size={22} />
            </div>
            
            <div>
              <h4 className="text-sm font-black text-slate-800">Lepas dari Jabatan Khusus?</h4>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Jabatan struktural <strong>{resetConfirmPerson.name || resetConfirmPerson.nama}</strong> akan dilepas dan dikembalikan menjadi <strong>Guru / Staf Biasa</strong>.
              </p>
            </div>

            <div className="flex items-center justify-center gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setResetConfirmPerson(null)}
                disabled={isSaving}
                className="text-xs"
              >
                Batal
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleExecuteResetPosition}
                disabled={isSaving}
                className="text-xs font-bold text-rose-600 border-rose-300 hover:bg-rose-50"
              >
                {isSaving ? "Memproses..." : "Ya, Lepas Jabatan"}
              </Button>
            </div>
          </div>
        </Modal>
      )}

    </div>
  );
}
