import { memo } from'react';
import { Users, UserCheck, AlertCircle, BookOpen } from'lucide-react';
import { Edit2, Lock, Trash2 } from'lucide-react';
import { PageHeader } from'../../../components/monitoring/ui/index.js';
import { Button } from'../../../components/ui.jsx';

const MasterDataKelas = memo(function MasterDataKelas({
  classes,
  teachers,
  updateSelectionForTab,
  openModal,
  checkDependencies,
  handleDelete,
  renderTable
}) {
  const totalKelas = classes?.length || 0;
  const denganWali = classes?.filter(c => c.homeroom && c.homeroom !== '-')?.length || 0;
  const tanpaWali = totalKelas - denganWali;
  const totalJurusanDiKelas = new Set(classes?.map(c => c.major).filter(Boolean)).size;

  const pageHeader = (
    <div className="flex flex-col gap-4">
      <PageHeader 
        title="Data Kelas"
        icon={Users}
        description="Kelola daftar kelas dan rombongan belajar di sekolah secara terpusat."
      />
      
      {/* KPI Cards Header */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Kelas */}
        <div className="ui-card p-3.5 sm:p-4 rounded-[var(--ui-radius-card)] bg-white border border-slate-200/80 shadow-xs hover:shadow-xs transition-all flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-[var(--ui-radius-small)] bg-[var(--ui-primary)]/10 text-[var(--ui-primary)] flex items-center justify-center shrink-0 border border-[var(--ui-primary)]/20">
            <Users size={20} strokeWidth={2.2} />
          </div>
          <div>
            <p className="text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-wider">Total Kelas</p>
            <p className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">{totalKelas}</p>
          </div>
        </div>

        {/* Dengan Wali */}
        <div className="ui-card p-3.5 sm:p-4 rounded-[var(--ui-radius-card)] bg-white border border-emerald-200/60 shadow-xs hover:shadow-xs transition-all flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-[var(--ui-radius-small)] bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-200">
            <UserCheck size={20} strokeWidth={2.2} />
          </div>
          <div>
            <p className="text-[10px] sm:text-[11px] font-black text-emerald-600 uppercase tracking-wider">Memiliki Wali</p>
            <p className="text-xl sm:text-2xl font-black text-emerald-700 tracking-tight">{denganWali}</p>
          </div>
        </div>

        {/* Tanpa Wali */}
        <div className="ui-card p-3.5 sm:p-4 rounded-[var(--ui-radius-card)] bg-white border border-rose-200/60 shadow-xs hover:shadow-xs transition-all flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-[var(--ui-radius-small)] bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-200">
            <AlertCircle size={20} strokeWidth={2.2} />
          </div>
          <div>
            <p className="text-[10px] sm:text-[11px] font-black text-rose-600 uppercase tracking-wider">Tanpa Wali</p>
            <p className="text-xl sm:text-2xl font-black text-rose-700 tracking-tight">{tanpaWali}</p>
          </div>
        </div>

        {/* Total Jurusan */}
        <div className="ui-card p-3.5 sm:p-4 rounded-[var(--ui-radius-card)] bg-white border border-indigo-200/60 shadow-xs hover:shadow-xs transition-all flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-[var(--ui-radius-small)] bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-200">
            <BookOpen size={20} strokeWidth={2.2} />
          </div>
          <div>
            <p className="text-[10px] sm:text-[11px] font-black text-indigo-600 uppercase tracking-wider">Jurusan Aktif</p>
            <p className="text-xl sm:text-2xl font-black text-indigo-700 tracking-tight">{totalJurusanDiKelas}</p>
          </div>
        </div>
      </div>
    </div>
  );

  return renderTable("Kelola Data Kelas",
    ["Nama Kelas","Jurusan","Wali Kelas"],
    classes,
    (item, idx, isSelected) => (
      <tr key={item.name} className={`hover:bg-slate-50/50 transition-colors ${isSelected ?"bg-[var(--ui-accent)]/20/40" :""}`}>
        <td className="px-2.5 py-2.5 text-center">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => updateSelectionForTab("kelas", (current) => current.includes(item.name) ? current.filter((x) => x !== item.name) : [...current, item.name])}
            className="accent-[var(--ui-primary)] cursor-pointer"
            aria-label={`Pilih kelas ${item.name}`}
          />
        </td>
        <td className="px-2 py-2.5 text-center font-bold text-slate-400 text-xs">{idx + 1}</td>
        <td className="px-3.5 py-2.5 font-bold text-slate-800 text-xs">{item.name}</td>
        <td className="px-3.5 py-2.5">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200/80 text-[10.5px] font-bold uppercase tracking-wider shadow-2xs">
            {item.major}
          </span>
        </td>
        <td className="px-3.5 py-2.5 font-medium text-slate-700 text-xs">
          {item.homeroom 
            ? (teachers.find(t => t.code === item.homeroom)?.name || item.homeroom) 
            : <span className="text-slate-400">-</span>}
        </td>
        <td className="px-3 py-2.5 text-right">
          <div className="flex justify-end items-center gap-1.5">
            <button 
              type="button"
              className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200/80 bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors shadow-2xs cursor-pointer" 
              onClick={() => openModal('kelas','edit', item)} 
              title="Edit Kelas"
            >
              <Edit2 size={13} />
            </button>
            {(() => {
              const deps = checkDependencies('kelas', item.name);
              if (deps.length > 0) {
                return (
                  <button 
                    type="button" 
                    className="w-7 h-7 flex items-center justify-center rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-200/80 text-amber-600 transition-colors shadow-2xs cursor-pointer"
                    onClick={() => openModal('lock_info', 'view', { type: 'kelas', name: `Kelas ${item.name}`, deps })}
                    title="Klik untuk melihat detail koneksi data"
                  >
                    <Lock size={13} />
                  </button>
                );
              }
              return (
                <button 
                  type="button" 
                  className="w-7 h-7 flex items-center justify-center rounded-lg border border-rose-200/80 bg-white hover:bg-rose-50 text-rose-500 hover:text-rose-600 transition-colors shadow-2xs cursor-pointer" 
                  onClick={() => handleDelete('kelas', item.name)} 
                  title="Hapus"
                >
                  <Trash2 size={13} />
                </button>
              );
            })()}
          </div>
        </td>
      </tr>
    ),
    { pageHeader }
  );
});

export default MasterDataKelas;
