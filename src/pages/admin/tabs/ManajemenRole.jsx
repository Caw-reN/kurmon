import { useState, useMemo } from 'react';
import { Shield, Users, UserCog, Search, ChevronDown, ChevronRight, Edit2, Save, X, Building2, Award, AlertCircle, Briefcase, Sparkles, UserPlus, CheckCircle2, Crown, BookOpen, GraduationCap, Handshake, Landmark } from 'lucide-react';
import { PageHeader } from '../../../components/monitoring/ui/index.js';
import { Button, UISelect, Modal } from '../../../components/ui.jsx';
import {
  getRoleKeyLabel,
  normalizeUserRole
} from '../../../utils/constants.js';

// ─── Organogram struktur sekolah (Lengkap & Terstruktur) ───────────────────────
const ORGANOGRAM = [
  {
    key: 'kepsek',
    title: 'Kepala Sekolah',
    color: 'from-blue-600 to-indigo-600',
    headerBg: 'bg-[var(--ui-primary)] text-white',
    badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
    description: 'Monitoring semua data, kebijakan & laporan sekolah',
    defaultAssignValue: 'kepsek',
    children: []
  },
  {
    key: 'tu',
    title: 'Tata Usaha (TU)',
    color: 'from-cyan-600 to-teal-600',
    headerBg: 'bg-cyan-600 text-white',
    badgeColor: 'bg-cyan-100 text-cyan-800 border-cyan-200',
    description: 'Administrasi, Keuangan, Surat-Menyurat & Karyawan',
    defaultAssignValue: 'tu',
    children: [
      { key: 'sekretaris_tu', title: 'Sekretaris TU', badge: 'TU', assignValue: 'sekretaris_tu' },
      { key: 'bendahara', title: 'Bendahara Sekolah', badge: 'Keuangan', assignValue: 'bendahara' },
      { key: 'karyawan', title: 'Staf Karyawan / Umum', badge: 'Staf', assignValue: 'karyawan' },
    ]
  },
  {
    key: 'waka_kurikulum',
    title: 'Waka Kurikulum',
    color: 'from-amber-500 to-orange-500',
    headerBg: 'bg-amber-600 text-white',
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
    description: 'Jadwal Mengajar, KBM, Silabus, Modul Ajar',
    defaultAssignValue: 'waka_kurikulum',
    children: [
      { key: 'sekretaris_kurikulum', title: 'Sekretaris Kurikulum', badge: 'Kurikulum', assignValue: 'sekretaris_kurikulum' },
      { key: 'anggota_kurikulum', title: 'Anggota Kurikulum', badge: 'Kurikulum', assignValue: 'anggota_kurikulum' },
    ]
  },
  {
    key: 'waka_kesiswaan',
    title: 'Waka Kesiswaan',
    color: 'from-orange-500 to-red-500',
    headerBg: 'bg-orange-600 text-white',
    badgeColor: 'bg-orange-100 text-orange-800 border-orange-200',
    description: 'Absensi, Kedisiplinan Siswa, BK & Pembinaan OSIS',
    defaultAssignValue: 'waka_kesiswaan',
    children: [
      { key: 'sekretaris_kesiswaan', title: 'Sekretaris Kesiswaan', badge: 'Kesiswaan', assignValue: 'sekretaris_kesiswaan' },
      { key: 'anggota_kesiswaan', title: 'Anggota Kesiswaan', badge: 'Kesiswaan', assignValue: 'anggota_kesiswaan' },
      { key: 'bpbk', title: 'Guru BP / BK', badge: 'BK', assignValue: 'bpbk' },
      { key: 'pembina_osis', title: 'Pembina OSIS', badge: 'OSIS', assignValue: 'pembina_osis' },
      { key: 'sekretaris_osis', title: 'Sekretaris OSIS', badge: 'OSIS', assignValue: 'sekretaris_osis' },
    ]
  },
  {
    key: 'waka_hubin',
    title: 'Waka Hubin',
    color: 'from-rose-500 to-pink-500',
    headerBg: 'bg-rose-600 text-white',
    badgeColor: 'bg-rose-100 text-rose-800 border-rose-200',
    description: 'Praktik Kerja Lapangan (PKL), Industri & Kemitraan',
    defaultAssignValue: 'waka_hubin',
    children: [
      { key: 'sekretaris_hubin', title: 'Sekretaris Hubin', badge: 'Hubin', assignValue: 'sekretaris_hubin' },
      { key: 'anggota_hubin', title: 'Anggota Tim Hubin', badge: 'Hubin', assignValue: 'anggota_hubin' },
    ]
  },
  {
    key: 'waka_sarpras',
    title: 'Waka Sarpras',
    color: 'from-purple-500 to-violet-500',
    headerBg: 'bg-purple-600 text-white',
    badgeColor: 'bg-purple-100 text-purple-800 border-purple-200',
    description: 'Fasilitas Ruangan, Inventaris & Denah Sekolah',
    defaultAssignValue: 'waka_sarpras',
    children: [
      { key: 'sekretaris_sarpras', title: 'Sekretaris Sarpras', badge: 'Sarpras', assignValue: 'sekretaris_sarpras' },
      { key: 'anggota_sarpras', title: 'Anggota Sarpras', badge: 'Sarpras', assignValue: 'anggota_sarpras' },
    ]
  },
];

const BADGE_COLORS = {
  'TU': 'bg-cyan-50 text-cyan-700 border-cyan-200',
  'Keuangan': 'bg-teal-50 text-teal-700 border-teal-200',
  'Staf': 'bg-slate-100 text-slate-700 border-slate-200',
  'Kurikulum': 'bg-amber-50 text-amber-700 border-amber-200',
  'Kesiswaan': 'bg-orange-50 text-orange-700 border-orange-200',
  'BK': 'bg-red-50 text-red-700 border-red-200',
  'OSIS': 'bg-indigo-50 text-indigo-700 border-indigo-200',
  'Hubin': 'bg-rose-50 text-rose-700 border-rose-200',
  'Sarpras': 'bg-purple-50 text-purple-700 border-purple-200',
};

// Robust helper functions
const getPersonId = (p) => {
  if (!p) return '';
  return String(p.code || p.staff_code || p.id || p.name || '').trim();
};

const samePerson = (p1, p2) => {
  if (!p1 || !p2) return false;
  const id1 = getPersonId(p1).toLowerCase();
  const id2 = getPersonId(p2).toLowerCase();
  if (id1 && id2 && id1 === id2) return true;
  const name1 = String(p1.name || '').trim().toLowerCase();
  const name2 = String(p2.name || '').trim().toLowerCase();
  return name1 && name2 && name1 === name2;
};

function getRoleCategory(person) {
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
  if (role === 'karyawan') return subrole || 'karyawan';
  if (role === 'guru') return subrole || 'guru';
  if (role.startsWith('custom_')) return role;

  if (subrole) return subrole;
  if (person._source === 'staff') return 'karyawan';
  return 'guru';
}

function getCurrentPositionValue(person) {
  if (!person) return 'guru';
  const role = String(person.role || '').toLowerCase().trim();
  const subrole = String(person.subrole || '').toLowerCase().trim();
  const division = String(person.division || '').toLowerCase().trim();

  if (role === 'kepsek') return 'kepsek';
  if (role === 'tu' || role === 'tata_usaha' || role === 'admin_tu') {
    return subrole || 'tu';
  }
  if (role === 'waka') return `waka_${division || 'kurikulum'}`;
  if (role === 'guru') return subrole || 'guru';
  if (role === 'karyawan') return subrole || 'karyawan';
  if (role.startsWith('custom_')) return role;
  if (subrole) return subrole;
  if (person._source === 'staff') return 'karyawan';
  return 'guru';
}

function getStaffForRoleKey(teachers, staffs, roleKey) {
  const t = (teachers || []).map(p => ({ ...p, _source: 'teacher' }));
  const s = (staffs || []).map(p => ({ ...p, _source: 'staff' }));
  const all = [...t, ...s];
  return all.filter(p => getRoleCategory(p) === roleKey);
}

// ─── Organogram Card Component ───────────────────────────────────────────────
function OrgCard({ node, teachers, staffs, onQuickAssign }) {
  const [expanded, setExpanded] = useState(true);
  const headStaff = getStaffForRoleKey(teachers, staffs, node.key);
  
  const totalSubStaff = node.children.reduce((acc, child) => {
    return acc + getStaffForRoleKey(teachers, staffs, child.key).length;
  }, 0);
  const totalAll = headStaff.length + totalSubStaff;

  return (
    <div className="bg-white border border-slate-200/90 rounded-[var(--ui-radius-card)] shadow-xs overflow-hidden flex flex-col hover:shadow-xs transition-all w-full">
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
          <span>Tugaskan</span>
        </button>
      </div>

      {/* Main Role Personnel List */}
      <div className="p-4 space-y-3 bg-white">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Pejabat Utama ({headStaff.length})</span>
          {node.children.length > 0 && (
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="text-[10px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer bg-blue-50 px-2 py-0.5 rounded-[var(--ui-radius-small)]"
            >
              {expanded ? 'Sembunyikan Tim' : `Lihat Tim (${totalSubStaff})`}
              {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            </button>
          )}
        </div>

        {headStaff.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {headStaff.map(t => (
              <div key={getPersonId(t)} className="flex items-center gap-2.5 bg-slate-50 border border-slate-200/60 p-2 rounded-[var(--ui-radius-small)]">
                <div className="w-7 h-7 rounded-[var(--ui-radius-small)] bg-blue-100 text-blue-700 flex items-center justify-center font-black text-xs shrink-0">
                  {(t.name || '?')[0].toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-800 truncate">{t.name}</p>
                  <p className="text-[9px] text-slate-400 font-bold uppercase">{getPersonId(t)}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-3 bg-amber-50/60 border border-dashed border-amber-200/80 rounded-[var(--ui-radius-small)] text-center">
            <p className="text-[11px] font-bold text-amber-700">Belum ada pejabat utama ditunjuk</p>
            <button
              type="button"
              onClick={() => onQuickAssign(node.defaultAssignValue)}
              className="text-[10px] font-black text-blue-600 underline mt-0.5 cursor-pointer"
            >
              + Klik di sini untuk menugaskan
            </button>
          </div>
        )}

        {/* Children Sub-Teams */}
        {node.children.length > 0 && expanded && (
          <div className="pt-3 border-t border-slate-100 space-y-2.5">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Tim & Anggota Bawahan</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {node.children.map(child => {
                const childStaff = getStaffForRoleKey(teachers, staffs, child.key);
                return (
                  <div key={child.key} className="bg-slate-50/70 border border-slate-200/70 rounded-[var(--ui-radius-small)] p-2.5 flex flex-col justify-between gap-1.5">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-extrabold text-slate-800">{child.title}</span>
                      <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-md border ${BADGE_COLORS[child.badge] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                        {child.badge}
                      </span>
                    </div>

                    {childStaff.length > 0 ? (
                      <div className="space-y-1">
                        {childStaff.map(p => (
                          <div key={getPersonId(p)} className="text-[11px] font-bold text-slate-700 truncate flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                            <span className="truncate">{p.name}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-slate-400 italic">Belum ditunjuk</span>
                        <button
                          type="button"
                          onClick={() => onQuickAssign(child.assignValue)}
                          className="text-[9px] font-bold text-blue-600 hover:underline cursor-pointer"
                        >
                          + Isi
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Footer count */}
      <div className="bg-slate-50/70 px-4 py-2 border-t border-slate-100 flex items-center justify-between text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
        <span>Total Personel</span>
        <span>{totalAll} Orang</span>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ManajemenRole({ teachers, staffs, setTeachers, setStaffs, saveDatabaseNow, showNotification, isSuperAdminRole, currentUser, rolePermissions, adminUser, syncAuthSnapshotNow }) {
  const [activeView, setActiveView] = useState('organogram'); // 'organogram' | 'assignment'
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('semua');
  const [isSaving, setIsSaving] = useState(false);

  // Modal State for edit assignment
  const [editingPerson, setEditingPerson] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState('guru');

  // Build position options with optgroups (clean text labels without emojis)
  const positionGroups = useMemo(() => {
    const groups = [
      {
        groupLabel: 'Pimpinan Utama & Administrasi',
        options: [
          { value: 'kepsek', label: 'Kepala Sekolah', role: 'kepsek', division: '', subrole: '' },
          { value: 'tu', label: 'Tata Usaha (Kepala / Admin TU)', role: 'tu', division: 'tu', subrole: '' },
          { value: 'sekretaris_tu', label: 'Sekretaris TU', role: 'tu', division: 'tu', subrole: 'sekretaris_tu' },
          { value: 'bendahara', label: 'Bendahara Sekolah', role: 'tu', division: 'tu', subrole: 'bendahara' },
        ]
      },
      {
        groupLabel: 'Waka & Tim Kurikulum',
        options: [
          { value: 'waka_kurikulum', label: 'Waka Kurikulum', role: 'waka', division: 'kurikulum', subrole: '' },
          { value: 'sekretaris_kurikulum', label: 'Sekretaris Kurikulum', role: 'guru', division: 'kurikulum', subrole: 'sekretaris_kurikulum' },
          { value: 'anggota_kurikulum', label: 'Anggota Tim Kurikulum', role: 'guru', division: 'kurikulum', subrole: 'anggota_kurikulum' },
        ]
      },
      {
        groupLabel: 'Waka & Tim Kesiswaan',
        options: [
          { value: 'waka_kesiswaan', label: 'Waka Kesiswaan', role: 'waka', division: 'kesiswaan', subrole: '' },
          { value: 'sekretaris_kesiswaan', label: 'Sekretaris Kesiswaan', role: 'guru', division: 'kesiswaan', subrole: 'sekretaris_kesiswaan' },
          { value: 'anggota_kesiswaan', label: 'Anggota Tim Kesiswaan', role: 'guru', division: 'kesiswaan', subrole: 'anggota_kesiswaan' },
          { value: 'bpbk', label: 'Guru BP / BK', role: 'guru', division: 'kesiswaan', subrole: 'bpbk' },
          { value: 'pembina_osis', label: 'Pembina OSIS', role: 'guru', division: 'kesiswaan', subrole: 'pembina_osis' },
          { value: 'sekretaris_osis', label: 'Sekretaris Pembina OSIS', role: 'guru', division: 'kesiswaan', subrole: 'sekretaris_osis' },
        ]
      },
      {
        groupLabel: 'Waka & Tim Hubin (PKL)',
        options: [
          { value: 'waka_hubin', label: 'Waka Hubin', role: 'waka', division: 'hubin', subrole: '' },
          { value: 'sekretaris_hubin', label: 'Sekretaris Hubin', role: 'guru', division: 'hubin', subrole: 'sekretaris_hubin' },
          { value: 'anggota_hubin', label: 'Anggota Tim Hubin', role: 'guru', division: 'hubin', subrole: 'anggota_hubin' },
        ]
      },
      {
        groupLabel: 'Waka & Tim Sarpras',
        options: [
          { value: 'waka_sarpras', label: 'Waka Sarpras', role: 'waka', division: 'sarpras', subrole: '' },
          { value: 'sekretaris_sarpras', label: 'Sekretaris Sarpras', role: 'guru', division: 'sarpras', subrole: 'sekretaris_sarpras' },
          { value: 'anggota_sarpras', label: 'Anggota Tim Sarpras', role: 'guru', division: 'sarpras', subrole: 'anggota_sarpras' },
        ]
      },
      {
        groupLabel: 'Wali Kelas & Guru',
        options: [
          { value: 'walikelas', label: 'Wali Kelas', role: 'guru', division: '', subrole: 'walikelas' },
          { value: 'guru', label: 'Guru Biasa (Pengajar)', role: 'guru', division: '', subrole: '' },
        ]
      },
      {
        groupLabel: 'Staf & Karyawan',
        options: [
          { value: 'karyawan', label: 'Karyawan / Staf Umum', role: 'karyawan', division: '', subrole: '' },
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
        subrole: k
      }));
      groups.push({
        groupLabel: 'Role Custom Kustomisasi',
        options: customOpts
      });
    }

    return groups;
  }, [rolePermissions]);

  const flatPositionOptions = useMemo(() => {
    return positionGroups.flatMap(g => g.options);
  }, [positionGroups]);

  if (!isSuperAdminRole(currentUser?.role)) {
    return (
      <div className="bg-white border border-slate-200 rounded-[var(--ui-radius-card)] p-10 text-center max-w-md mx-auto mt-10 shadow-sm">
        <AlertCircle size={40} className="mx-auto text-slate-300 mb-3" />
        <h3 className="text-base font-black text-slate-700">Akses SuperAdmin Diperlukan</h3>
        <p className="text-sm text-slate-400 mt-1">Halaman ini hanya dapat diakses oleh SuperAdmin.</p>
      </div>
    );
  }

  const allPeople = useMemo(() => {
    const t = (teachers || []).map(p => ({ ...p, _source: 'teacher' }));
    const s = (staffs || []).map(p => ({ ...p, _source: 'staff' }));
    return [...t, ...s];
  }, [teachers, staffs]);

  const filteredPeople = useMemo(() => {
    return allPeople.filter(p => {
      const matchSearch = !search ||
        p.name?.toLowerCase().includes(search.toLowerCase()) ||
        getPersonId(p).toLowerCase().includes(search.toLowerCase());
      const cat = getRoleCategory(p);
      const matchRole = filterRole === 'semua' || cat === filterRole;
      return matchSearch && matchRole;
    });
  }, [allPeople, search, filterRole]);

  // Stats for top bar summary
  const stats = useMemo(() => {
    const counts = {};
    allPeople.forEach(p => {
      const cat = getRoleCategory(p);
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }, [allPeople]);

  // Open modal for edit
  const handleOpenEditRole = (person) => {
    setEditingPerson(person);
    setSelectedPosition(getCurrentPositionValue(person));
    setModalOpen(true);
  };

  const handleQuickAssignFromOrg = (defaultPositionValue) => {
    setSelectedPosition(defaultPositionValue || 'guru');
    setEditingPerson(allPeople[0] || null);
    setModalOpen(true);
  };

  const handleSaveRole = async () => {
    if (!editingPerson) return;
    setIsSaving(true);

    const selectedOpt = flatPositionOptions.find(opt => opt.value === selectedPosition);
    if (!selectedOpt) {
      setIsSaving(false);
      return;
    }

    let changes = {
      role: selectedOpt.role,
      division: selectedOpt.division,
      subrole: selectedOpt.subrole
    };

    if (editingPerson._source === 'staff' && selectedPosition.startsWith('custom_')) {
      changes = {
        role: selectedPosition,
        division: '',
        subrole: ''
      };
    }

    try {
      const isTeacher = (teachers || []).some(t => samePerson(t, editingPerson));
      const isStaff = (staffs || []).some(s => samePerson(s, editingPerson));

      if (isTeacher || editingPerson._source === 'teacher') {
        const nextTeachers = (teachers || []).map(t =>
          samePerson(t, editingPerson) ? { ...t, ...changes } : t
        );
        await saveDatabaseNow({ teachers: nextTeachers }, 'memperbarui jabatan staf');
        if (setTeachers) setTeachers(nextTeachers);
        if (syncAuthSnapshotNow) await syncAuthSnapshotNow(adminUser, nextTeachers, 'sync role teacher');
      }
      
      if (isStaff || editingPerson._source === 'staff') {
        const nextStaffs = (staffs || []).map(s =>
          samePerson(s, editingPerson) ? { ...s, ...changes } : s
        );
        await saveDatabaseNow({ staffs: nextStaffs }, 'memperbarui jabatan staf');
        if (setStaffs) setStaffs(nextStaffs);
        if (syncAuthSnapshotNow) await syncAuthSnapshotNow(adminUser, nextStaffs, 'sync role staff');
      }

      showNotification(`Jabatan ${editingPerson.name} berhasil diperbarui menjadi ${selectedOpt.label}.`, 'success');
      setModalOpen(false);
      setEditingPerson(null);
    } catch (err) {
      showNotification('Gagal menyimpan perubahan jabatan.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const ROLE_FILTER_OPTIONS = [
    { value: 'semua', label: 'Semua Staf & Guru' },
    { value: 'kepsek', label: 'Kepala Sekolah' },
    { value: 'tu', label: 'Tata Usaha (TU)' },
    { value: 'waka_kurikulum', label: 'Waka Kurikulum' },
    { value: 'waka_kesiswaan', label: 'Waka Kesiswaan' },
    { value: 'waka_hubin', label: 'Waka Hubin' },
    { value: 'waka_sarpras', label: 'Waka Sarpras' },
    { value: 'walikelas', label: 'Wali Kelas' },
    { value: 'bpbk', label: 'Guru BP/BK' },
    { value: 'pembina_osis', label: 'Pembina OSIS' },
    { value: 'guru', label: 'Guru Biasa' },
    { value: 'karyawan', label: 'Karyawan / Staf Umum' },
  ];

  const SUMMARY_KEYS = [
    'kepsek', 'tu', 'waka_kurikulum', 'waka_kesiswaan', 'waka_hubin', 'waka_sarpras',
    'bpbk', 'walikelas',
  ];

  return (
    <div className="flex flex-col gap-6 w-full animate-in fade-in duration-300">
      <PageHeader
        title="Manajemen Role & Jabatan Staf"
        description="Atur hierarki penugasan struktural, Waka, Tim Kurikulum, Kesiswaan, Tata Usaha, dan Wali Kelas."
        icon={Shield}
        tabs={[
          { id: 'organogram', label: 'Struktur Organisasi', icon: Building2 },
          { id: 'assignment', label: 'Daftar Penugasan Jabatan', icon: UserCog },
        ]}
        activeTab={activeView}
        onTabChange={setActiveView}
      />

      {/* Summary Statistics Cards (Responsive Grid) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {SUMMARY_KEYS.map(key => {
          const info = getRoleKeyLabel(key);
          const count = stats[key] || 0;
          return (
            <button
              key={key}
              type="button"
              onClick={() => { setFilterRole(key); setActiveView('assignment'); }}
              className="rounded-[var(--ui-radius-card)] border border-slate-200/80 bg-white p-3 text-left cursor-pointer transition-all hover:shadow-xs hover:-translate-y-0.5 flex flex-col justify-between"
            >
              <span className={`w-2.5 h-2.5 rounded-full ${info.color.split(' ')[0]} mb-1.5`} />
              <div>
                <p className="text-xl font-black text-slate-800 leading-none">{count}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1 truncate">{info.short}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Organogram View */}
      {activeView === 'organogram' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between bg-blue-50/60 border border-blue-200/70 p-4 rounded-[var(--ui-radius-card)]">
            <div className="flex items-center gap-3">
              <Sparkles size={18} className="text-blue-600 shrink-0" />
              <div>
                <h4 className="text-xs font-black text-blue-900 uppercase tracking-wider">Bagan Struktur Sekolah</h4>
                <p className="text-[11px] text-blue-700 font-medium mt-0.5">
                  Klik tombol <strong>+ Tugaskan</strong> pada divisi mana saja untuk menunjuk personel yang bertugas.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {ORGANOGRAM.map(node => (
              <OrgCard
                key={node.key}
                node={node}
                teachers={teachers}
                staffs={staffs}
                onQuickAssign={handleQuickAssignFromOrg}
              />
            ))}
          </div>
        </div>
      )}

      {/* Assignment View (Card List) */}
      {activeView === 'assignment' && (
        <div className="bg-white border border-slate-200/80 rounded-[var(--ui-radius-card)] p-4 sm:p-6 shadow-sm space-y-4">
          
          {/* Search + filter toolbar */}
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari nama atau kode/NIP staf…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200/80 rounded-[var(--ui-radius-small)] text-xs font-semibold focus:outline-none focus:bg-white focus:ring-4 focus:ring-blue-100 transition-all shadow-xs"
              />
            </div>
            
            <UISelect
              value={filterRole}
              onChange={e => setFilterRole(e.target.value)}
              className="w-full md:w-60"
              placeholder="Filter Jabatan..."
            >
              {ROLE_FILTER_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </UISelect>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredPeople.length === 0 ? (
              <div className="col-span-full text-center py-16 text-slate-400 bg-slate-50/50 rounded-[var(--ui-radius-card)] border border-dashed border-slate-200">
                <Users size={36} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm font-bold">Tidak ada staf ditemukan</p>
                <p className="text-xs text-slate-400 mt-1">Coba sesuaikan kata kunci pencarian atau filter.</p>
              </div>
            ) : (
              filteredPeople.map(person => {
                const currentPosVal = getCurrentPositionValue(person);
                const currentOpt = flatPositionOptions.find(opt => opt.value === currentPosVal) || { label: 'Guru Biasa' };
                const isStaffSource = person._source === 'staff';

                return (
                  <div 
                    key={`${person._source}_${getPersonId(person)}`} 
                    className="border border-slate-200/80 hover:border-blue-400 rounded-[var(--ui-radius-card)] p-4 bg-white hover:shadow-xs transition-all flex items-start gap-3.5 relative group"
                  >
                    {/* Initials Avatar */}
                    <div className={`w-10 h-10 rounded-[var(--ui-radius-small)] flex items-center justify-center shrink-0 text-sm font-black shadow-xs border ${
                      isStaffSource ? 'bg-cyan-50 text-cyan-700 border-cyan-200' : 'bg-blue-50 text-blue-700 border-blue-200'
                    }`}>
                      {(person.name || '?')[0].toUpperCase()}
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0 pr-8">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-sm font-black text-slate-800 truncate leading-snug">{person.name}</p>
                        <span className={`text-[8px] font-black px-1.5 py-0.2 rounded-md ${
                          isStaffSource ? 'bg-slate-100 text-slate-600' : 'bg-blue-50 text-blue-600'
                        }`}>
                          {isStaffSource ? 'Karyawan' : 'Guru'}
                        </span>
                      </div>

                      <p className="text-[10px] text-slate-400 font-bold tracking-wider uppercase mt-0.5">{getPersonId(person)}</p>
                      
                      <div className="mt-2.5">
                        <span className="inline-flex px-2.5 py-0.5 rounded-[var(--ui-radius-pill)] text-[10px] font-black bg-blue-50 text-blue-700 border border-blue-200/80 uppercase tracking-wide">
                          {currentOpt.label}
                        </span>
                      </div>
                    </div>

                    {/* Quick Edit Trigger Button */}
                    <button
                      type="button"
                      onClick={() => handleOpenEditRole(person)}
                      className="absolute right-3.5 top-3.5 p-2 rounded-[var(--ui-radius-small)] bg-slate-50 hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-colors border border-slate-200/80 cursor-pointer flex items-center justify-center"
                      title="Ubah Jabatan"
                    >
                      <Edit2 size={14} />
                    </button>
                  </div>
                );
              })
            )}
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-between items-center text-[10px] text-slate-400 font-bold uppercase tracking-wider">
            <span>Menampilkan {filteredPeople.length} staf</span>
            <span>Total {allPeople.length} personel</span>
          </div>

        </div>
      )}

      {/* Edit Role Modal */}
      {modalOpen && (
        <Modal
          isOpen={true}
          onClose={() => { setModalOpen(false); setEditingPerson(null); }}
          title="Tugaskan Peran & Jabatan Staf"
          maxWidth="max-w-md"
        >
          <div className="space-y-4">
            
            {/* Person Picker / Detail */}
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-1.5">
                Pilih Personel Staf / Guru
              </label>
              
              <UISelect
                value={editingPerson ? `${editingPerson._source}_${getPersonId(editingPerson)}` : ''}
                onChange={e => {
                  const val = e.target.value;
                  const found = allPeople.find(p => `${p._source}_${getPersonId(p)}` === val);
                  if (found) {
                    setEditingPerson(found);
                    setSelectedPosition(getCurrentPositionValue(found));
                  }
                }}
                className="w-full px-3 py-2 text-xs font-bold text-slate-800"
              >
                <optgroup label="Karyawan / Staf Administrasi">
                  {allPeople.filter(p => p._source === 'staff').map(p => (
                    <option key={`staff_${getPersonId(p)}`} value={`staff_${getPersonId(p)}`}>
                      {p.name} ({getPersonId(p) || 'Karyawan'})
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Guru / Pendidik">
                  {allPeople.filter(p => p._source === 'teacher').map(p => (
                    <option key={`teacher_${getPersonId(p)}`} value={`teacher_${getPersonId(p)}`}>
                      {p.name} ({getPersonId(p)})
                    </option>
                  ))}
                </optgroup>
              </UISelect>
            </div>

            {/* Selected Person Card Info */}
            {editingPerson && (
              <div className="bg-slate-50 border border-slate-200/80 rounded-[var(--ui-radius-small)] p-3.5 flex items-center gap-3">
                <div className={`w-9 h-9 rounded-[var(--ui-radius-small)] text-white flex items-center justify-center font-black text-sm shrink-0 ${
                  editingPerson._source === 'staff' ? 'bg-cyan-600' : 'bg-blue-600'
                }`}>
                  {(editingPerson.name || '?')[0].toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-black text-slate-800 truncate">{editingPerson.name}</p>
                    <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-slate-200 text-slate-700">
                      {editingPerson._source === 'staff' ? 'Karyawan' : 'Guru'}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">{getPersonId(editingPerson)}</p>
                </div>
              </div>
            )}

            {/* Grouped Position Select Input */}
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-1.5">
                Jabatan / Peran Baru
              </label>
              
              <UISelect
                value={selectedPosition}
                onChange={e => setSelectedPosition(e.target.value)}
                className="w-full px-3 py-2 text-xs font-bold text-slate-800"
              >
                {positionGroups.map(group => (
                  <optgroup key={group.groupLabel} label={group.groupLabel}>
                    {group.options.map(opt => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </UISelect>
            </div>

            {/* Hint Box */}
            <div className="bg-blue-50 border border-blue-200/80 rounded-[var(--ui-radius-small)] p-3 flex gap-2.5">
              <Sparkles size={16} className="text-blue-600 shrink-0 mt-0.5" />
              <p className="text-[11px] text-blue-800 leading-relaxed font-medium">
                Peran ini otomatis memperbarui posisi personel di organogram sekolah serta hak akses bawaan untuk login akunnya.
              </p>
            </div>

            {/* Action Footer */}
            <div className="pt-3 border-t border-slate-100 flex justify-end gap-2.5">
              <Button
                variant="outline"
                type="button"
                onClick={() => { setModalOpen(false); setEditingPerson(null); }}
              >
                Batal
              </Button>
              
              <Button
                type="button"
                onClick={handleSaveRole}
                disabled={isSaving || !editingPerson}
                className="bg-[var(--ui-primary)] hover:opacity-90 text-white font-black px-5"
              >
                {isSaving ? 'Menyimpan...' : 'Simpan Jabatan'}
              </Button>
            </div>

          </div>
        </Modal>
      )}

    </div>
  );
}
