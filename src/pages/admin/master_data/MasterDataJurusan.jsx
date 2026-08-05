import { memo } from'react';
import { SlidersHorizontal } from'lucide-react';
import { getMajorFullName } from'../../../utils/constants.js';
import { Edit2, Lock, Trash2 } from'lucide-react';
import { PageHeader } from'../../../components/monitoring/ui/index.js';
import { Button } from'../../../components/ui.jsx';

const MasterDataJurusan = memo(function MasterDataJurusan({
  majors,
  updateSelectionForTab,
  openModal,
  checkDependencies,
  handleDelete,
  renderTable
}) {
  const pageHeader = (
    <PageHeader 
      title="Data Jurusan"
      icon={SlidersHorizontal}
      description="Kelola daftar kompetensi keahlian atau program studi yang ada."
    />
  );

  // Normalize majors array to handle both strings and objects robustly
  const normalizedMajors = (majors || []).map((m) => {
    if (typeof m ==='object' && m !== null) {
      return { name: m.name || m.payload ||'' };
    }
    return { name: String(m ||'') };
  });

  return renderTable("Kelola Data Jurusan",
    ["Nama Jurusan"],
    normalizedMajors,
    (item, idx, isSelected) => (
      <tr key={item.name} className={`hover:bg-slate-50/50 transition-colors ${isSelected ?"bg-[var(--ui-accent)]/20/40" :""}`}>
        <td className="px-4 py-4 text-center">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => updateSelectionForTab("jurusan", (current) => current.includes(item.name) ? current.filter((x) => x !== item.name) : [...current, item.name])}
            className="accent-[var(--ui-primary)] cursor-pointer"
            aria-label={`Pilih jurusan ${item.name}`}
          />
        </td>
        <td className="px-6 py-4 text-center font-bold text-slate-400">{idx + 1}</td>
        <td className="px-6 py-4 font-bold text-slate-800">
          {item.name} <span className="text-slate-400 font-medium text-xs ml-2">({getMajorFullName(item.name)})</span>
        </td>
        <td className="px-6 py-4 text-right">
          <div className="flex justify-end gap-1.5">
            <Button variant="ghost" size="icon" onClick={() => openModal('jurusan','edit', { name: item.name })}><Edit2 size={14} className="text-slate-500" /></Button>
            {(() => {
              const deps = checkDependencies('jurusan', item.name);
              if (deps.length > 0) {
                return (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => openModal('lock_info', 'view', { type: 'jurusan', name: `Jurusan ${item.name}`, deps })}
                    title="Klik untuk melihat detail koneksi data"
                    className="hover:bg-amber-50 border border-amber-200/80 cursor-pointer"
                  >
                    <Lock size={14} className="text-amber-500" />
                  </Button>
                );
              }
              return (
                <Button variant="ghost" size="icon" onClick={() => handleDelete('jurusan', item.name)} title="Hapus"><Trash2 size={14} className="text-red-500" /></Button>
              );
            })()}
          </div>
        </td>
      </tr>
    ),
    { pageHeader }
  );
});

export default MasterDataJurusan;
