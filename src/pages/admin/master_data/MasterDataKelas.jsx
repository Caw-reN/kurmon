import { memo } from'react';
import { Users } from'lucide-react';
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
  const pageHeader = (
    <PageHeader 
      title="Data Kelas"
      icon={Users}
      description="Kelola daftar kelas dan rombongan belajar di sekolah."
    />
  );

  return renderTable("Kelola Data Kelas",
    ["Nama Kelas","Jurusan","Wali Kelas"],
    classes,
    (item, idx, isSelected) => (
      <tr key={item.name} className={`hover:bg-slate-50/50 transition-colors ${isSelected ?"bg-[var(--ui-accent)]/20/40" :""}`}>
        <td className="px-4 py-4 text-center">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => updateSelectionForTab("kelas", (current) => current.includes(item.name) ? current.filter((x) => x !== item.name) : [...current, item.name])}
            className="accent-[var(--ui-primary)] cursor-pointer"
            aria-label={`Pilih kelas ${item.name}`}
          />
        </td>
        <td className="px-6 py-4 text-center font-bold text-slate-400">{idx + 1}</td>
        <td className="px-6 py-4 font-bold text-slate-800">{item.name}</td>
        <td className="px-6 py-4"><span className="bg-[var(--ui-accent)]/20 text-[var(--ui-primary)] px-3 py-1 rounded-[var(--ui-radius-small)] text-[10px] font-bold uppercase tracking-wider">{item.major}</span></td>
        <td className="px-6 py-4 font-semibold text-slate-600">
          {item.homeroom 
            ? (teachers.find(t => t.code === item.homeroom)?.name || item.homeroom) 
            :"-"}
        </td>
        <td className="px-6 py-4 text-right">
          <div className="flex justify-end gap-1.5">
            <Button variant="ghost" size="icon" onClick={() => openModal('kelas','edit', item)}><Edit2 size={14} className="text-slate-500" /></Button>
            {(() => {
              const deps = checkDependencies('kelas', item.name);
              if (deps.length > 0) {
                return (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => openModal('lock_info', 'view', { type: 'kelas', name: `Kelas ${item.name}`, deps })}
                    title="Klik untuk melihat detail koneksi data"
                    className="hover:bg-amber-50 border border-amber-200/80 cursor-pointer"
                  >
                    <Lock size={14} className="text-amber-500" />
                  </Button>
                );
              }
              return (
                <Button variant="ghost" size="icon" onClick={() => handleDelete('kelas', item.name)} title="Hapus"><Trash2 size={14} className="text-red-500" /></Button>
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
