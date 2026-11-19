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
            <td className="px-2.5 py-2.5 text-center">
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => updateSelectionForTab("ruangan", (current) => current.includes(item.id) ? current.filter((x) => x !== item.id) : [...current, item.id])}
                className="accent-[var(--ui-primary)] cursor-pointer"
                aria-label={`Pilih ruangan ${item.name}`}
              />
            </td>
            <td className="px-2 py-2.5 text-center font-bold text-slate-400 text-xs">{idx + 1}</td>
            <td className="px-3.5 py-2.5 font-mono font-bold text-slate-600 text-xs">{item.id}</td>
            <td className="px-3.5 py-2.5 font-bold text-slate-800 text-xs">{item.name}</td>
            <td className="px-3.5 py-2.5">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-[10.5px] font-bold uppercase tracking-wider shadow-2xs ${
                item.type ==='Praktik'
                  ?'bg-amber-50 text-amber-700 border border-amber-200/80'
                  :'bg-indigo-50 text-indigo-700 border border-indigo-200/80'
              }`}>{item.type}</span>
            </td>
            <td className="px-3.5 py-2.5 text-slate-700 font-bold text-xs">{item.major}</td>
            <td className="px-3.5 py-2.5 text-slate-600 font-medium text-xs">{item.targetGrade && item.targetGrade !=="Semua" ? `Khusus ${item.targetGrade}` :"Semua Tingkat"}</td>
            <td className="px-3.5 py-2.5 text-center text-xs">
               {item.isPriority ? (
                 <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 text-[10.5px] font-bold shadow-2xs">
                   <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
                   Prioritas
                 </span>
               ) : (
                 <span className="text-slate-400 font-medium text-[11px]">-</span>
               )}
            </td>
            <td className="px-3 py-2.5 text-right">
              <div className="flex justify-end items-center gap-1.5">
                <button 
                  type="button"
                  className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200/80 bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors shadow-2xs cursor-pointer" 
                  onClick={() => openModal('ruangan','edit', item)}
                  title="Edit Ruangan"
                >
                  <Edit2 size={13} />
                </button>
                {(() => {
                  const deps = checkDependencies('ruangan', item.id);
                  if (deps.length > 0) {
                    return (
                      <button 
                        type="button"
                        className="w-7 h-7 flex items-center justify-center rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-200/80 text-amber-600 transition-colors shadow-2xs cursor-pointer"
                        onClick={() => openModal('lock_info', 'view', { type: 'ruangan', name: `Ruang ${item.name || item.id}`, deps })}
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
                      onClick={() => handleDelete('ruangan', item.id)} 
                      title="Hapus"
                    >
                      <Trash2 size={13} />
                    </button>
                  );
                })()}
              </div>
            </td>
          </tr>
        ), { tabKey:"ruangan", pageHeader: null });

});

export default MasterDataRuangan;
