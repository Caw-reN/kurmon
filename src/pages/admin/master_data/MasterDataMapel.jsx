import { memo } from'react';
import { BookOpen } from'lucide-react';
import { Edit2, Lock, Trash2 } from'lucide-react';
import { PageHeader } from'../../../components/monitoring/ui/index.js';
import { Button } from'../../../components/ui.jsx';

const MasterDataMapel = memo(function MasterDataMapel({
  subjects,
  majors,
  updateSelectionForTab,
  openModal,
  checkDependencies,
  handleDelete,
  renderTable,
  getPracticeRoomLabel,
  parseCsvList
}) {
  const pageHeader = (
    <PageHeader 
      title="Mata Pelajaran"
      icon={BookOpen}
      description="Kelola daftar mata pelajaran beserta alokasi waktu dan jenis ruangannya."
    />
  );

        return renderTable("Kelola Mata Pelajaran", ["Nama Mapel","Tingkat","Jurusan","Sifat Mapel","Ruangan Praktik","Durasi"], subjects, (item, idx, isSelected) => (
          <tr key={item.name} className={`hover:bg-slate-50/50 transition-colors ${isSelected ?"bg-[var(--ui-accent)]/20/40" :""}`}>
              <td className="px-4 py-4 text-center">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => updateSelectionForTab("mapel", (current) => current.includes(item.name) ? current.filter((x) => x !== item.name) : [...current, item.name])}
                  className="accent-[var(--ui-primary)] cursor-pointer"
                  aria-label={`Pilih mapel ${item.name}`}
                />
              </td>
            <td className="px-6 py-4 text-center font-bold text-slate-400">{idx + 1}</td>
            <td className="px-6 py-4 font-bold text-slate-800">{item.name}</td>
            <td className="px-6 py-4 font-black text-slate-700">{item.grade}</td>
            <td className="px-6 py-4 font-medium text-slate-600">{item.major}</td>
            <td className="px-6 py-4"><span className={`px-3 py-1 rounded-[var(--ui-radius-small)] text-[10px] font-bold uppercase tracking-wider ${item.isBlock ?'bg-[var(--ui-accent)]/20 text-[var(--ui-primary)]' :'bg-slate-100 text-slate-600'}`}>{item.isBlock ?'Praktik / Bengkel' :'Teori Reguler'}</span></td>
            <td className="px-6 py-4 font-medium text-slate-600">
              <div className="max-w-[260px]">
                <div className="text-xs font-bold text-slate-700 leading-snug">{getPracticeRoomLabel(item.practiceRoomIds)}</div>
                {item.isBlock && !parseCsvList(item.practiceRoomIds).length && <div className="text-[10px] font-semibold text-emerald-600 mt-1">Semua ruang praktik aktif</div>}
              </div>
            </td>
            <td className="px-6 py-4 font-medium text-slate-600">{item.defaultDuration} Jam</td>
            <td className="px-6 py-4 text-right">
              <div className="flex justify-end gap-1.5">
                <Button variant="ghost" size="icon" onClick={() => openModal('mapel','edit', item)}><Edit2 size={14} className="text-slate-500" /></Button>
                {(() => {
                  const deps = checkDependencies('mapel', item.name);
                  if (deps.length > 0) {
                    return (
                      <Button variant="ghost" size="icon" title={`Tidak bisa dihapus. Masih digunakan oleh: ${deps.join(',')}. Hapus koneksi terlebih dahulu.`} disabled>
                        <Lock size={14} className="text-amber-500" />
                      </Button>
                    );
                  }
                  return (
                    <Button variant="ghost" size="icon" onClick={() => handleDelete('mapel', item.name)} title="Hapus"><Trash2 size={14} className="text-red-500" /></Button>
                  );
                })()}
              </div>
            </td>
          </tr>
        ),
        { pageHeader }
      );

});

export default MasterDataMapel;
