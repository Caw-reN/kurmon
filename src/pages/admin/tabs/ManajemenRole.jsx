import { useState, useMemo } from 'react';
import { Shield, Users, UserCog, Search, ChevronDown, ChevronRight, Edit2, Save, X, Building2, Award, AlertCircle, Briefcase, Sparkles } from 'lucide-react';
import { PageHeader } from '../../../components/monitoring/ui/index.js';
import { Button, UISelect, Modal } from '../../../components/ui.jsx';
import {
  getRoleKeyLabel,
  getSubroleOption,
  normalizeUserRole
} from '../../../utils/constants.js';

// ─── Organogram struktur sekolah ─────────────────────────────────────────────
const ORGANOGRAM = [
  {
    key: 'kepsek',
    title: 'Kepala Sekolah',
    color: 'from-blue-600 to-indigo-600',
    textColor: 'text-white',
    borderColor: 'border-blue-200',
    description: 'Monitoring semua data dan laporan',
    children: []
  },
  {
    key: 'waka_kurikulum',
    title: 'Waka Kurikulum',
    color: 'from-amber-500 to-orange-500',
    textColor: 'text-white',
    borderColor: 'border-amber-200',
    description: 'Jadwal, KBM, Silabus, Modul Ajar',
    children: [
      { key: 'sekretaris_kurikulum', title: 'Sekretaris', badge: 'Kurikulum' },
      { key: 'anggota_kurikulum', title: 'Anggota', badge: 'Kurikulum' },
    ]
  },
  {
    key: 'waka_kesiswaan',
    title: 'Waka Kesiswaan',
    color: 'from-orange-500 to-red-500',
    textColor: 'text-white',
    borderColor: 'border-orange-200',
    description: 'Absensi, Kedisiplinan, BK, OSIS',
    children: [
      { key: 'sekretaris_kesiswaan', title: 'Sekretaris', badge: 'Kesiswaan' },
      { key: 'anggota_kesiswaan', title: 'Anggota', badge: 'Kesiswaan' },
      { key: 'bpbk', title: 'Guru BP/BK', badge: 'BK' },
      { key: 'pembina_osis', title: 'Pembina OSIS', badge: 'OSIS' },
      { key: 'sekretaris_osis', title: 'Sekr. OSIS', badge: 'OSIS' },
    ]
  },
  {
    key: 'waka_hubin',
    title: 'Waka Hubin',
    color: 'from-rose-500 to-pink-500',
    textColor: 'text-white',
    borderColor: 'border-rose-200',
    description: 'PKL, Industri, Kemitraan',
    children: [
      { key: 'sekretaris_hubin', title: 'Sekretaris', badge: 'Hubin' },
      { key: 'anggota_hubin', title: 'Anggota', badge: 'Hubin' },
    ]
  },
  {
    key: 'waka_sarpras',
    title: 'Waka Sarpras',
    color: 'from-purple-500 to-violet-500',
    textColor: 'text-white',
    borderColor: 'border-purple-200',
    description: 'Ruangan, Denah, Fasilitas',
    children: [
      { key: 'sekretaris_sarpras', title: 'Sekretaris', badge: 'Sarpras' },
      { key: 'anggota_sarpras', title: 'Anggota', badge: 'Sarpras' },
    ]
  },
];

const BADGE_COLORS = {
  'Kurikulum': 'bg-amber-50 text-amber-700 border-amber-200',
  'Kesiswaan': 'bg-orange-50 text-orange-700 border-orange-200',
  'BK': 'bg-red-50 text-red-700 border-red-200',
  'OSIS': 'bg-indigo-50 text-indigo-700 border-indigo-200',
  'Hubin': 'bg-rose-50 text-rose-700 border-rose-200',
  'Sarpras': 'bg-purple-50 text-purple-700 border-purple-200',
};

const POSITION_OPTIONS = [
  // Utama
  { value: 'kepsek', label: 'Kepala Sekolah', role: 'kepsek', division: '', subrole: '' },
  { value: 'tu', label: 'Tata Usaha (Admin TU)', role: 'tu', division: '', subrole: '' },
  
  // Waka
  { value: 'waka_kurikulum', label: 'Waka Kurikulum', role: 'waka', division: 'kurikulum', subrole: '' },
  { value: 'waka_kesiswaan', label: 'Waka Kesiswaan', role: 'waka', division: 'kesiswaan', subrole: '' },
  { value: 'waka_hubin', label: 'Waka Hubin', role: 'waka', division: 'hubin', subrole: '' },
  { value: 'waka_sarpras', label: 'Waka Sarpras', role: 'waka', division: 'sarpras', subrole: '' },

  // Tim Kurikulum
  { value: 'sekretaris_kurikulum', label: 'Sekretaris Kurikulum', role: 'guru', division: 'kurikulum', subrole: 'sekretaris_kurikulum' },
  { value: 'anggota_kurikulum', label: 'Anggota Kurikulum', role: 'guru', division: 'kurikulum', subrole: 'anggota_kurikulum' },

  // Tim Kesiswaan
  { value: 'sekretaris_kesiswaan', label: 'Sekretaris Kesiswaan', role: 'guru', division: 'kesiswaan', subrole: 'sekretaris_kesiswaan' },
  { value: 'anggota_kesiswaan', label: 'Anggota Tim Kesiswaan', role: 'guru', division: 'kesiswaan', subrole: 'anggota_kesiswaan' },
  { value: 'bpbk', label: 'Guru BP/BK', role: 'guru', division: 'kesiswaan', subrole: 'bpbk' },
  { value: 'pembina_osis', label: 'Pembina OSIS', role: 'guru', division: 'kesiswaan', subrole: 'pembina_osis' },
  { value: 'sekretaris_osis', label: 'Sekretaris Pembina OSIS', role: 'guru', division: 'kesiswaan', subrole: 'sekretaris_osis' },

  // Tim Hubin
  { value: 'sekretaris_hubin', label: 'Sekretaris Hubin', role: 'guru', division: 'hubin', subrole: 'sekretaris_hubin' },
  { value: 'anggota_hubin', label: 'Anggota Tim Hubin', role: 'guru', division: 'hubin', subrole: 'anggota_hubin' },

  // Tim Sarpras
  { value: 'sekretaris_sarpras', label: 'Sekretaris Sarpras', role: 'guru', division: 'sarpras', subrole: 'sekretaris_sarpras' },
  { value: 'anggota_sarpras', label: 'Anggota Tim Sarpras', role: 'guru', division: 'sarpras', subrole: 'anggota_sarpras' },

  // Guru & Karyawan
  { value: 'walikelas', label: 'Wali Kelas', role: 'guru', division: '', subrole: 'walikelas' },
  { value: 'guru', label: 'Guru Biasa (tanpa jabatan)', role: 'guru', division: '', subrole: '' },
  { value: 'karyawan', label: 'Karyawan Biasa', role: 'karyawan', division: '', subrole: '' },
];

// Helper: resolve category key for filtering and stats
function getRoleCategory(teacher) {
  const role = normalizeUserRole(teacher.role);
  if (role === 'waka') return `waka_${(teacher.division || 'kurikulum').toLowerCase()}`;
  if (role === 'guru' && teacher.subrole) return teacher.subrole;
  return role;
}

function getCurrentPositionValue(person) {
  const role = normalizeUserRole(person.role);
  if (role === 'kepsek') return 'kepsek';
  if (role === 'tu' || role === 'tata_usaha') return 'tu';
  if (role === 'karyawan') return 'karyawan';
  if (role === 'waka') return `waka_${(person.division || 'kurikulum').toLowerCase()}`;
  if (role === 'guru') return person.subrole || 'guru';
  return 'guru';
}

function getStaffForRoleKey(teachers, staffs, roleKey) {
  const all = [...(teachers || []), ...(staffs || [])];
  return all.filter(t => getRoleCategory(t) === roleKey);
}

// ─── Organogram Card Component ──────────────────────────────────────────────
function OrgCard({ node, teachers, staffs }) {
  const [expanded, setExpanded] = useState(true);
  const headStaff = getStaffForRoleKey(teachers, staffs, node.key);
  const totalStaff = node.children.reduce((acc, child) => {
    return acc + getStaffForRoleKey(teachers, staffs, child.key).length;
  }, headStaff.length);

  return (
    <div className="flex flex-col items-center w-full">
      {/* Main card */}
      <div className={`relative rounded-2xl border border-slate-100 bg-white shadow-sm hover:shadow-md transition-all w-full max-w-[240px] overflow-hidden`}>
        <div className={`bg-gradient-to-r ${node.color} px-4 py-3.5`}>
          <p className="font-extrabold text-sm text-white leading-tight flex items-center gap-2">
            <Building2 size={14} className="opacity-80" />
            {node.title}
          </p>
          <p className="text-[10px] text-white/90 mt-1 leading-snug font-medium">{node.description}</p>
        </div>
        <div className="p-3.5 bg-white space-y-3">
          {headStaff.length > 0 ? (
            <div className="space-y-1.5">
              {headStaff.slice(0, 3).map(t => (
                <div key={t.code} className="flex items-center gap-2 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100/50">
                  <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center shrink-0 text-[9px] font-bold text-slate-600">
                    {(t.name || '?')[0].toUpperCase()}
                  </div>
                  <span className="text-[10px] font-bold text-slate-700 truncate flex-1">{t.name}</span>
                </div>
              ))}
              {headStaff.length > 3 && (
                <p className="text-[9px] text-slate-400 font-extrabold pl-1">+{headStaff.length - 3} personel lainnya</p>
              )}
            </div>
          ) : (
            <p className="text-[10px] text-slate-400 italic py-1 text-center font-medium">Belum ada pejabat ditugaskan</p>
          )}
          
          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <span className="text-[9px] text-slate-400 font-black uppercase tracking-wider">{totalStaff} personel</span>
            {node.children.length > 0 && (
              <button
                type="button"
                onClick={() => setExpanded(e => !e)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer border-none bg-slate-50 hover:bg-slate-100 p-1 rounded-md transition-colors"
                title={expanded ? "Tutup Cabang" : "Buka Cabang"}
              >
                {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Connection Line */}
      {node.children.length > 0 && expanded && (
        <div className="mt-1 flex flex-col items-center w-full">
          <div className="w-0.5 h-4 bg-slate-200" />
          <div className="flex flex-wrap justify-center gap-3">
            {node.children.map(child => {
              const childStaff = getStaffForRoleKey(teachers, staffs, child.key);
              return (
                <div key={child.key} className="flex flex-col items-center">
                  <div className="w-0.5 h-3 bg-slate-200" />
                  <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-2.5 min-w-[140px] max-w-[170px] shadow-xs">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-md border ${BADGE_COLORS[child.badge] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                        {child.badge}
                      </span>
                    </div>
                    <p className="text-[10px] font-black text-slate-800 leading-tight">{child.title}</p>
                    {childStaff.length > 0 ? (
                      <div className="mt-1 space-y-0.5">
                        {childStaff.slice(0, 2).map(p => (
                          <div key={p.code} className="text-[9px] font-semibold text-slate-600 truncate">
                            • {p.name}
                          </div>
                        ))}
                        {childStaff.length > 2 && (
                          <p className="text-[8px] text-slate-400 font-bold">+{childStaff.length - 2} orang</p>
                        )}
                      </div>
                    ) : (
                      <p className="text-[9px] text-slate-400 italic mt-1">Kosong</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ManajemenRole({ teachers, staffs, setTeachers, setStaffs, saveDatabaseNow, showNotification, isSuperAdminRole, currentUser, rolePermissions }) {
  const [activeView, setActiveView] = useState('organogram'); // 'organogram' | 'assignment'
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('semua');
  const [isSaving, setIsSaving] = useState(false);

  // Modal State for edit assignment
  const [editingPerson, setEditingPerson] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState('guru');

  // Build POSITION_OPTIONS dynamically to include custom roles
  const positionOptions = useMemo(() => {
    const base = [
      // Utama
      { value: 'kepsek', label: 'Kepala Sekolah', role: 'kepsek', division: '', subrole: '' },
      { value: 'tu', label: 'Tata Usaha (Admin TU)', role: 'tu', division: '', subrole: '' },
      
      // Waka
      { value: 'waka_kurikulum', label: 'Waka Kurikulum', role: 'waka', division: 'kurikulum', subrole: '' },
      { value: 'waka_kesiswaan', label: 'Waka Kesiswaan', role: 'waka', division: 'kesiswaan', subrole: '' },
      { value: 'waka_hubin', label: 'Waka Hubin', role: 'waka', division: 'hubin', subrole: '' },
      { value: 'waka_sarpras', label: 'Waka Sarpras', role: 'waka', division: 'sarpras', subrole: '' },

      // Tim Kurikulum
      { value: 'sekretaris_kurikulum', label: 'Sekretaris Kurikulum', role: 'guru', division: 'kurikulum', subrole: 'sekretaris_kurikulum' },
      { value: 'anggota_kurikulum', label: 'Anggota Kurikulum', role: 'guru', division: 'kurikulum', subrole: 'anggota_kurikulum' },

      // Tim Kesiswaan
      { value: 'sekretaris_kesiswaan', label: 'Sekretaris Kesiswaan', role: 'guru', division: 'kesiswaan', subrole: 'sekretaris_kesiswaan' },
      { value: 'anggota_kesiswaan', label: 'Anggota Tim Kesiswaan', role: 'guru', division: 'kesiswaan', subrole: 'anggota_kesiswaan' },
      { value: 'bpbk', label: 'Guru BP/BK', role: 'guru', division: 'kesiswaan', subrole: 'bpbk' },
      { value: 'pembina_osis', label: 'Pembina OSIS', role: 'guru', division: 'kesiswaan', subrole: 'pembina_osis' },
      { value: 'sekretaris_osis', label: 'Sekretaris Pembina OSIS', role: 'guru', division: 'kesiswaan', subrole: 'sekretaris_osis' },

      // Tim Hubin
      { value: 'sekretaris_hubin', label: 'Sekretaris Hubin', role: 'guru', division: 'hubin', subrole: 'sekretaris_hubin' },
      { value: 'anggota_hubin', label: 'Anggota Tim Hubin', role: 'guru', division: 'hubin', subrole: 'anggota_hubin' },

      // Tim Sarpras
      { value: 'sekretaris_sarpras', label: 'Sekretaris Sarpras', role: 'guru', division: 'sarpras', subrole: 'sekretaris_sarpras' },
      { value: 'anggota_sarpras', label: 'Anggota Tim Sarpras', role: 'guru', division: 'sarpras', subrole: 'anggota_sarpras' },

      // Guru & Karyawan
      { value: 'walikelas', label: 'Wali Kelas', role: 'guru', division: '', subrole: 'walikelas' },
      { value: 'guru', label: 'Guru Biasa (tanpa jabatan)', role: 'guru', division: '', subrole: '' },
      { value: 'karyawan', label: 'Karyawan Biasa', role: 'karyawan', division: '', subrole: '' },
    ];

    // Add custom roles
    const customKeys = Object.keys(rolePermissions || {}).filter(k => k.startsWith('custom_'));
    customKeys.forEach(k => {
      const customLabel = rolePermissions[k]?.__label || k.replace('custom_', '');
      base.push({
        value: k,
        label: customLabel,
        role: 'guru', // default role fallback for teachers
        division: '',
        subrole: k
      });
    });

    return base;
  }, [rolePermissions]);

  if (!isSuperAdminRole(currentUser?.role)) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-10 text-center max-w-md mx-auto mt-10">
        <AlertCircle size={40} className="mx-auto text-slate-300 mb-3" />
        <h3 className="text-base font-black text-slate-700">Akses SuperAdmin Diperlukan</h3>
        <p className="text-sm text-slate-400 mt-1">Halaman ini hanya bisa diakses oleh SuperAdmin.</p>
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
        p.code?.toLowerCase().includes(search.toLowerCase());
      const cat = getRoleCategory(p);
      const matchRole = filterRole === 'semua' || cat === filterRole;
      return matchSearch && matchRole;
    });
  }, [allPeople, search, filterRole]);

  // Stats per kategori untuk summary cards
  const stats = useMemo(() => {
    const counts = {};
    allPeople.forEach(p => {
      const cat = getRoleCategory(p);
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }, [allPeople]);

  // Open modal trigger
  const handleOpenEditRole = (person) => {
    setEditingPerson(person);
    setSelectedPosition(getCurrentPositionValue(person));
    setModalOpen(true);
  };

  const handleSaveRole = async () => {
    if (!editingPerson) return;
    setIsSaving(true);
    const selectedOpt = positionOptions.find(opt => opt.value === selectedPosition);
    if (!selectedOpt) return;

    let changes = {
      role: selectedOpt.role,
      division: selectedOpt.division,
      subrole: selectedOpt.subrole
    };

    // If it's a custom role and target is a staff (non-teacher), store as role directly
    if (editingPerson._source === 'staff' && selectedPosition.startsWith('custom_')) {
      changes = {
        role: selectedPosition,
        division: '',
        subrole: ''
      };
    }

    try {
      if (editingPerson._source === 'teacher') {
        const nextTeachers = (teachers || []).map(t =>
          t.code === editingPerson.code ? { ...t, ...changes } : t
        );
        await saveDatabaseNow({ teachers: nextTeachers }, 'memperbarui jabatan staf');
        setTeachers(nextTeachers);
      } else {
        const nextStaffs = (staffs || []).map(s =>
          s.code === editingPerson.code ? { ...s, ...changes } : s
        );
        await saveDatabaseNow({ staffs: nextStaffs }, 'memperbarui jabatan staf');
        setStaffs(nextStaffs);
      }
      showNotification(`Jabatan ${editingPerson.name} berhasil diperbarui.`, 'success');
      setModalOpen(false);
      setEditingPerson(null);
    } catch (err) {
      showNotification('Gagal menyimpan perubahan.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const ROLE_FILTER_OPTIONS = [
    { value: 'semua', label: 'Semua Staf' },
    { value: 'guru', label: 'Guru Biasa' },
    { value: 'walikelas', label: 'Wali Kelas' },
    { value: 'bpbk', label: 'Guru BP/BK' },
    { value: 'pembina_osis', label: 'Pembina OSIS' },
    { value: 'waka_kurikulum', label: 'Waka Kurikulum' },
    { value: 'sekretaris_kurikulum', label: 'Sekr. Kurikulum' },
    { value: 'anggota_kurikulum', label: 'Anggota Kurikulum' },
    { value: 'waka_kesiswaan', label: 'Waka Kesiswaan' },
    { value: 'sekretaris_kesiswaan', label: 'Sekr. Kesiswaan' },
    { value: 'anggota_kesiswaan', label: 'Anggota Kesiswaan' },
    { value: 'waka_hubin', label: 'Waka Hubin' },
    { value: 'sekretaris_hubin', label: 'Sekr. Hubin' },
    { value: 'waka_sarpras', label: 'Waka Sarpras' },
    { value: 'kepsek', label: 'Kepala Sekolah' },
    { value: 'tu', label: 'Tata Usaha' },
    { value: 'karyawan', label: 'Karyawan' },
  ];

  const SUMMARY_KEYS = [
    'kepsek', 'waka_kurikulum', 'waka_kesiswaan', 'waka_hubin', 'waka_sarpras',
    'bpbk', 'pembina_osis', 'walikelas',
  ];

  return (
    <div className="flex flex-col gap-6 w-full animate-in fade-in duration-300">
      <PageHeader
        title="Manajemen Role & Jabatan Staf"
        description="Atur hierarki jabatan, subrole, dan penempatan struktural staf sekolah."
        icon={Shield}
        tabs={[
          { id: 'organogram', label: 'Struktur Organisasi', icon: Building2 },
          { id: 'assignment', label: 'Penugasan Jabatan', icon: UserCog },
        ]}
        activeTab={activeView}
        onTabChange={setActiveView}
      />

      {/* Summary Statistics Card */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3">
        {SUMMARY_KEYS.map(key => {
          const info = getRoleKeyLabel(key);
          const count = stats[key] || 0;
          return (
            <button
              key={key}
              type="button"
              onClick={() => { setFilterRole(key); setActiveView('assignment'); }}
              className={`rounded-2xl border border-slate-100 bg-white p-4 text-left cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5 flex flex-col justify-between`}
            >
              <span className={`w-2.5 h-2.5 rounded-full ${info.color.split(' ')[0]} mb-2`} />
              <div>
                <p className="text-2xl font-black text-slate-800 leading-none">{count}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1 truncate">{info.short}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Organogram View */}
      {activeView === 'organogram' && (
        <div className="bg-white border border-slate-200/80 rounded-[var(--ui-radius-card)] p-6 shadow-sm flex flex-col gap-8 items-center overflow-x-auto min-w-full">
          {/* Kepala sekolah at top */}
          <div className="flex justify-center w-full">
            <OrgCard
              node={ORGANOGRAM[0]}
              teachers={teachers}
              staffs={staffs}
            />
          </div>
          
          <div className="w-full flex items-center justify-center -my-4">
            <div className="w-0.5 h-8 bg-slate-200" />
          </div>

          <div className="w-full text-center">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100">
              Wakil Kepala Sekolah & Tata Usaha
            </span>
          </div>

          {/* Waka & TU Nodes */}
          <div className="flex flex-wrap justify-center gap-6 xl:gap-8 w-full">
            {ORGANOGRAM.slice(1).map(node => (
              <OrgCard
                key={node.key}
                node={node}
                teachers={teachers}
                staffs={staffs}
              />
            ))}
          </div>

          {/* Special roles summary at bottom */}
          <div className="w-full border-t border-slate-100 pt-6 mt-4">
            <div className="flex items-center gap-2 mb-4">
              <Award size={15} className="text-indigo-500" />
              <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider">Jabatan & Penugasan Khusus</h3>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { key: 'walikelas', label: 'Wali Kelas', color: 'from-emerald-500 to-teal-500' },
                { key: 'bpbk', label: 'Bimbingan Konseling (BK)', color: 'from-red-500 to-rose-500' },
                { key: 'pembina_osis', label: 'Pembina OSIS', color: 'from-indigo-500 to-purple-500' },
                { key: 'tu', label: 'Tata Usaha (Staf Administrasi)', color: 'from-cyan-500 to-blue-500' },
              ].map(item => {
                const list = getStaffForRoleKey(teachers, staffs, item.key);
                return (
                  <div key={item.key} className="bg-slate-50/50 border border-slate-200/60 rounded-2xl p-4 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-black text-slate-800">{item.label}</p>
                      <p className="text-[10px] text-slate-400 font-bold mt-0.5">{list.length} personel ditunjuk</p>
                    </div>
                    <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${item.color} flex items-center justify-center text-white text-xs font-bold shadow-xs shrink-0`}>
                      {list.length}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Assignment View (Card List) */}
      {activeView === 'assignment' && (
        <div className="bg-white border border-slate-200/80 rounded-[var(--ui-radius-card)] p-4 shadow-sm space-y-4">
          
          {/* Search + filter toolbar */}
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari nama atau kode staf…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200/40 rounded-xl text-xs font-semibold focus:outline-none focus:bg-white focus:ring-4 focus:ring-[var(--ui-primary)]/10 transition-all shadow-xs"
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
              <div className="col-span-full text-center py-16 text-slate-400 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                <Users size={36} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm font-bold">Tidak ada staf ditemukan</p>
                <p className="text-xs text-slate-400 mt-1">Coba sesuaikan kata kunci pencarian atau filter.</p>
              </div>
            ) : (
              filteredPeople.map(person => {
                const currentPosVal = getCurrentPositionValue(person);
                const currentOpt = positionOptions.find(opt => opt.value === currentPosVal) || { label: 'Guru Biasa' };
                
                return (
                  <div 
                    key={person.code} 
                    className="border border-slate-200/70 hover:border-slate-300 rounded-2xl p-4 bg-white hover:shadow-md transition-all flex items-start gap-3.5 group relative"
                  >
                    {/* Initials Avatar */}
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center shrink-0 text-sm font-black text-slate-600 shadow-xs border border-slate-100">
                      {(person.name || '?')[0].toUpperCase()}
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0 pr-8">
                      <p className="text-sm font-black text-slate-800 truncate leading-snug">{person.name}</p>
                      <p className="text-[10px] text-slate-400 font-bold tracking-wider uppercase mt-0.5">{person.code}</p>
                      <div className="mt-2.5">
                        <span className="inline-flex px-2.5 py-0.5 rounded-full text-[9px] font-black bg-indigo-50 text-indigo-700 border border-indigo-200/60 uppercase tracking-wide">
                          {currentOpt.label}
                        </span>
                      </div>
                    </div>

                    {/* Quick Edit Trigger Button */}
                    <button
                      type="button"
                      onClick={() => handleOpenEditRole(person)}
                      className="absolute right-3.5 top-3.5 p-1.5 rounded-xl bg-slate-50 hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 transition-colors border border-slate-100 cursor-pointer flex items-center justify-center"
                      title="Ubah Jabatan"
                    >
                      <Edit2 size={13} />
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
      {modalOpen && editingPerson && (
        <Modal
          isOpen={true}
          onClose={() => { setModalOpen(false); setEditingPerson(null); }}
          title="Ubah Peran & Jabatan Staf"
          maxWidth="max-w-md"
        >
          <div className="space-y-4">
            {/* Staff Info Detail */}
            <div className="bg-slate-50/70 border border-slate-200/60 rounded-xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-200 flex items-center justify-center shrink-0 text-sm font-black text-slate-700">
                {(editingPerson.name || '?')[0].toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-black text-slate-800 truncate leading-snug">{editingPerson.name}</p>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide mt-0.5">{editingPerson.code}</p>
              </div>
            </div>

            {/* Select Input */}
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2">
                Pilih Jabatan / Peran Baru
              </label>
              
              <UISelect
                value={selectedPosition}
                onChange={e => setSelectedPosition(e.target.value)}
                className="w-full text-slate-800"
                placeholder="Pilih Jabatan..."
              >
                {positionOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </UISelect>
            </div>

            {/* Hint Box */}
            <div className="bg-blue-50 border border-blue-150 rounded-xl p-3 flex gap-2.5">
              <Sparkles size={16} className="text-blue-500 shrink-0 mt-0.5" />
              <p className="text-[11px] text-blue-700 leading-relaxed font-medium">
                Perubahan peran ini akan otomatis mengatur hak akses menu, level login, dan penempatan tugas tambahan untuk personel terkait.
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
                disabled={isSaving}
                className="bg-blue-600 hover:bg-blue-700 text-white font-black px-5"
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
