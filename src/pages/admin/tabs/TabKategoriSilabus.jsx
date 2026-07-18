import { Button } from '../../../components/ui.jsx';

import { Plus, Edit2, Trash2 } from'lucide-react';


export default function TabKategoriSilabus(props) {
  const { openModal, syllabusCategories, handleRemoveSyllabusCategorySafe } = props;
  const { ...allProps } = props;
  // Destructure specific props as needed in the component

return (
  <div className="flex flex-col gap-6 h-full  w-full animate-in fade-in duration-300 relative z-10">
    <div className="bg-white border-none rounded-[var(--ui-radius-card)] shadow-sm p-6 flex flex-col flex-1 overflow-hidden min-h-0">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">
            Kategori Modul Ajar
          </h2>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Kelola kategori untuk mengelompokkan materi modul ajar.
          </p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <Button variant="outline"
            onClick={() =>openModal("kategori_silabus","add")}
            
          >
            <Plus size={14} strokeWidth={3} /> Tambah Kategori</Button>
        </div>
      </div>
      <div className="overflow-x-auto flex-1 custom-scrollbar">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-slate-50/70 border-b border-slate-200/80 sticky top-0 z-10">
            <tr>
              <th className="px-6 py-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Nama Kategori
              </th>
              <th className="px-6 py-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Warna / Label
              </th>
              <th className="px-6 py-3.5 text-right text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Aksi
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {syllabusCategories?.length === 0 ? (
              <tr>
                <td
                  colSpan={3}
                  className="px-6 py-12 text-center text-slate-400 font-medium"
                >
                  Belum ada kategori modul ajar.
                </td>
              </tr>
            ) : (
              syllabusCategories?.map((c) => (
                <tr
                  key={c.id}
                  className="hover:bg-slate-50/50 transition-colors group"
                >
                  <td className="px-6 py-4 font-bold text-slate-800">
                    {c.name}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2.5 py-1 rounded-[var(--ui-radius-small)] text-[10px] font-black uppercase tracking-widest bg-${c.color ||"blue"}-50 text-${c.color ||"blue"}-600 border border-${c.color ||"blue"}-100`}
                    >
                      {c.color ||"blue"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="outline"
                        onClick={() =>openModal("kategori_silabus","edit", c)
                        }
                        className="cursor-pointer"
                      >
                        <Edit2 size={14} /></Button>
                      <Button variant="outline"
                        onClick={() =>handleRemoveSyllabusCategorySafe(c.id)
                        }
                        className="cursor-pointer"
                      >
                        <Trash2 size={14} /></Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  </div>
);
}
