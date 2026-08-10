import { memo } from'react';
import { Edit2, Lock, Trash2 } from'lucide-react';
import { Button } from'../../../components/ui.jsx';

const MasterDataRuangan = memo(function MasterDataRuangan({
  rooms,
  updateSelectionForTab,
  openModal,
  checkDependencies,
  handleDelete,
  renderTable
}) {
        return renderTable("Kelola Data Ruangan", ["ID Ruang","Nama Ruangan","Tipe Ruang","Jurusan","Target Kelas","Prioritas"], rooms, (item, idx, isSelected) => (
          <tr key={item.id} className={`hover:bg-slate-50/50 transition-colors ${isSelected ?"bg-[var(--ui-accent)]/20" :""}`}>
            <td className="px-4 py-4 text-center">
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => updateSelectionForTab("ruangan", (current) => current.includes(item.id) ? current.filter((x) => x !== item.id) : [...current, item.id])}
                className="accent-[var(--ui-primary)] cursor-pointer"
                aria-label={`Pilih ruangan ${item.name}`}
              />
            </td>
            <td className="px-6 py-4 text-center font-bold text-slate-400">{idx + 1}</td>
            <td className="px-6 py-4 font-mono font-bold text-slate-500">{item.id}</td>
            <td className="px-6 py-4 font-bold text-slate-800">{item.name}</td>
            <td className="px-6 py-4">
              <span className={`px-3 py-1 rounded-[var(--ui-radius-small)] text-[10px] font-bold uppercase tracking-wider ${
                item.type ==='Praktik'
                  ?'bg-amber-100 text-amber-700'
                  :'bg-[var(--ui-accent)]/20 text-[var(--ui-primary)]'
              }`}>{item.type}</span>
            </td>
            <td className="px-6 py-4 text-slate-600 font-bold text-xs">{item.major}</td>
            <td className="px-6 py-4 text-slate-600 font-bold text-xs">{item.targetGrade && item.targetGrade !=="Semua" ? `Khusus ${item.targetGrade}` :"Semua Tingkat"}</td>
            <td className="px-6 py-4 text-slate-600 font-bold text-xs">
               {item.isPriority ? <span className="text-emerald-600 font-black flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>Ya</span> : <span className="text-slate-400">Tidak</span>}
            </td>
            <td className="px-6 py-4 text-right">
              <div className="flex justify-end gap-1.5">
                <Button variant="ghost" size="icon" onClick={() => openModal('ruangan','edit', item)}><Edit2 size={14} className="text-slate-500" /></Button>
                {(() => {
                  const deps = checkDependencies('ruangan', item.id);
                  if (deps.length > 0) {
                    return (
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => openModal('lock_info', 'view', { type: 'ruangan', name: `Ruang ${item.name || item.id}`, deps })}
                        title="Klik untuk melihat detail koneksi data"
                        className="hover:bg-amber-50 border border-amber-200/80 cursor-pointer"
                      >
                        <Lock size={14} className="text-amber-500" />
                      </Button>
                    );
                  }
                  return (
                    <Button variant="ghost" size="icon" onClick={() => handleDelete('ruangan', item.id)} title="Hapus"><Trash2 size={14} className="text-rose-500" /></Button>
                  );
                })()}
              </div>
            </td>
          </tr>
        ), { tabKey:"ruangan" });

});

export default MasterDataRuangan;
