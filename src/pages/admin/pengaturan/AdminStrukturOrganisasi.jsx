import { Button } from '../../../components/ui.jsx';
import { useState } from'react';
import { Users } from'lucide-react';
import { compressImage } from'../../../utils/imageUtils.js';
import { Search, Plus, Save, GripVertical, ImageIcon, Trash2 } from'lucide-react';
import { PageHeader } from '../../../components/monitoring/ui/index.js';
;
import { UISelect } from'../../../components/ui.jsx';


const TeacherCombobox = ({ teachers, onSelect }) => {
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const filtered = teachers.filter(t => 
    t.name.toLowerCase().includes(search.toLowerCase()) || 
    (t.code && t.code.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="relative w-full md:w-64">
      <div className="relative">
        <input 
          type="text"
          placeholder="+ Cari & Tarik Guru..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          className="w-full py-2.5 pl-4 pr-10 text-sm font-semibold bg-white border-none rounded-[var(--ui-radius-small)] focus:outline-[var(--ui-primary)] focus:ring-4 focus:ring-[var(--ui-primary)]/10 shadow-sm transition-all"
        />
        <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
      </div>
      
      {isOpen && (
        <>
          <div className="absolute z-50 mt-2 w-full bg-white border-none rounded-[var(--ui-radius-small)] shadow-sm max-h-64 overflow-y-auto overflow-x-hidden">
            {filtered.length > 0 ? (
              filtered.map(t => (
                <div 
                  key={t.id || t.code}
                  className="px-4 py-3 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-0 transition-colors"
                  onClick={() => {
                    onSelect(t.id || t.code);
                    setSearch('');
                    setIsOpen(false);
                  }}
                >
                  <div className="text-sm font-bold text-slate-800 truncate">{t.name}</div>
                  {t.code && <div className="text-[10px] font-bold tracking-widest text-slate-400 mt-1 uppercase">KODE: {t.code}</div>}
                </div>
              ))
            ) : (
               <div className="px-4 py-4 text-sm font-bold text-slate-400 text-center bg-slate-50">Guru tidak ditemukan</div>
            )}
          </div>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
        </>
      )}
    </div>
  );
};

export default function AdminStrukturOrganisasi({ appSettings, setAppSettings, onSave, showNotification, teachers = [] }) {
  const [struktur, setStruktur] = useState(appSettings?.strukturOrganisasi || []);
  const [draggedIndex, setDraggedIndex] = useState(null);

  const handleAdd = () => {
    setStruktur([
      ...struktur,
      {
        id: `struktur_${Date.now()}`,
        name:'',
        position:'',
        description:'',
        photoUrl:'',
        parentId:'',
        order: struktur.length,
      }
    ]);
  };

  const handleAddFromTeacher = (teacherId) => {
    const teacher = teachers.find(t => t.id === teacherId || t.code === teacherId);
    if (!teacher) return;
    
    setStruktur([
      ...struktur,
      {
        id: `struktur_${Date.now()}_${teacher.code || teacher.id}`,
        name: teacher.name ||'',
        position:'Guru',
        description: teacher.code ? `Kode: ${teacher.code}` :'',
        photoUrl:'', 
        parentId:'',
        order: struktur.length,
      }
    ]);
  };

  const handleUpdate = (index, field, value) => {
    const newStruktur = [...struktur];
    newStruktur[index][field] = value;
    setStruktur(newStruktur);
  };

  const handleRemove = async (index) => {
    if (await window.confirmAsync('Apakah Anda yakin ingin menghapus data ini?')) {
      const newStruktur = struktur.filter((_, i) => i !== index);
      setStruktur(newStruktur);
    }
  };

  const handleImageUpload = (index, file) => {
    if (!file) return;
    
    if (file.size > 2 * 1024 * 1024) {
      showNotification('Ukuran gambar maksimal 2MB','warning');
      return;
    }
    
    compressImage(file, { maxWidth: 300, maxHeight: 300, quality: 0.8 }).then(compressedBase64 => {
      handleUpdate(index,'photoUrl', compressedBase64);
    });
  };

  const handleSave = async () => {
    const validStruktur = struktur.filter(s => s.name.trim() !=='' && s.position.trim() !=='');
    
    if (struktur.length !== validStruktur.length) {
      showNotification('Beberapa data kosong telah diabaikan.','info');
    }

    setAppSettings({
      ...appSettings,
      strukturOrganisasi: validStruktur
    });
    
    try {
      await onSave({ appSettings: { ...appSettings, strukturOrganisasi: validStruktur } },"menyimpan struktur organisasi");
      showNotification('Struktur organisasi berhasil disimpan!');
    } catch (e) {
      showNotification('Gagal menyimpan struktur organisasi.','error');
    }
  };

  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed ="move";
    e.dataTransfer.setData("text/plain", index);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect ="move";
  };

  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) return;
    
    const newStruktur = [...struktur];
    const draggedItem = newStruktur[draggedIndex];
    newStruktur.splice(draggedIndex, 1);
    newStruktur.splice(dropIndex, 0, draggedItem);
    
    setStruktur(newStruktur);
    setDraggedIndex(null);
  };

  return (
    <div className="w-full mx-auto animate-in fade-in duration-300 flex flex-col gap-4">
      <PageHeader 
        title="Struktur Organisasi"
        description="Kelola urutan kepengurusan dengan cara Drag & Drop."
        icon={Users}
      />
      <div className="ui-card p-6 flex flex-col w-full">
        {/* Actions & Filters Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100">
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            <TeacherCombobox teachers={teachers} onSelect={handleAddFromTeacher} />
            <Button variant="outline" type="button" onClick={handleAdd} className="flex items-center gap-2">
              <Plus size={16} /> Manual
            </Button>
          </div>
          <Button type="button" onClick={handleSave} className="flex items-center gap-2 sm:self-center">
            <Save size={16} /> Simpan
          </Button>
        </div>

        {struktur.length === 0 ? (
          <div className="text-center py-16 bg-slate-50 border border-dashed border-slate-300 rounded-[var(--ui-radius-small)]">
            <Users size={48} className="mx-auto text-slate-300 mb-3" />
            <h4 className="text-lg font-bold text-slate-600 mb-1">Belum Ada Data</h4>
            <p className="text-sm text-slate-500 mb-4">Tambahkan struktur kepengurusan pertama Anda.</p>
            <Button type="button" onClick={handleAdd} >
              <Plus size={16} className="mr-1" /> Tambah Sekarang
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {struktur.map((item, index) => (
              <div 
                key={item.id} 
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={() => setDraggedIndex(null)}
                className={`bg-white border transition-all duration-200 rounded-[var(--ui-radius-card)] p-3 relative group flex flex-col md:flex-row gap-4 items-center shadow-sm ${draggedIndex === index ?'opacity-40 scale-[0.98] border-indigo-300 bg-indigo-50/50' :'border-slate-200 hover:border-slate-300 hover:-md'}`}
              >
                
                {/* Drag Handle */}
                <div className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-indigo-500 p-2 shrink-0 hidden md:block">
                  <GripVertical size={20} />
                </div>

                {/* Photo Upload */}
                <div className="w-16 h-16 shrink-0 bg-slate-50 border-none rounded-full flex items-center justify-center overflow-hidden relative shadow-sm">
                  {item.photoUrl ? (
                    <img src={item.photoUrl} alt="Foto" className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon size={20} className="text-slate-300" />
                  )}
                  <label className="absolute inset-0 bg-black/50 text-white opacity-0 hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity text-[9px] font-bold text-center leading-tight p-1">
                    Ubah
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(index, e.target.files[0])} />
                  </label>
                </div>

                {/* Form Fields */}
                <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-1 block">Nama Lengkap</label>
                    <input 
                      type="text" 
                      placeholder="Nama" 
                      value={item.name} 
                      onChange={(e) => handleUpdate(index,'name', e.target.value)} 
                      className="w-full border-none bg-slate-50 hover:bg-white p-2 rounded-[var(--ui-radius-small)] text-sm font-bold focus:outline-[var(--ui-primary)] transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-1 block">Jabatan</label>
                    <input 
                      type="text" 
                      placeholder="Jabatan" 
                      value={item.position} 
                      onChange={(e) => handleUpdate(index,'position', e.target.value)} 
                      className="w-full border-none bg-slate-50 hover:bg-white p-2 rounded-[var(--ui-radius-small)] text-sm font-bold focus:outline-[var(--ui-primary)] transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-1 block">Atasan (Parent)</label>
                    <UISelect 
                      value={item.parentId ||""}
                      onChange={(e) => handleUpdate(index,'parentId', e.target.value)}
                      className="w-full border-none bg-slate-50 hover:bg-white p-2 rounded-[var(--ui-radius-small)] text-sm font-bold focus:outline-[var(--ui-primary)] transition-colors"
                    >
                      <option value="">- Paling Atas (Pucuk) -</option>
                      {struktur.map(s => {
                        if (s.id === item.id) return null;
                        return <option key={s.id} value={s.id}>{s.name} ({s.position})</option>;
                      })}
                    </UISelect>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-1 block">Keterangan (Opsional)</label>
                    <input 
                      type="text" 
                      placeholder="NIP / Info" 
                      value={item.description} 
                      onChange={(e) => handleUpdate(index,'description', e.target.value)} 
                      className="w-full border-none bg-slate-50 hover:bg-white p-2 rounded-[var(--ui-radius-small)] text-sm focus:outline-[var(--ui-primary)] transition-colors"
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0 self-end md:self-auto w-full md:w-auto justify-end">
                  <div className="md:hidden text-xs font-bold text-slate-400 mr-auto uppercase tracking-wider">
                     Urutan #{index + 1}
                  </div>
                  {item.photoUrl && (
                    <Button variant="ghost" size="icon" onClick={() => handleUpdate(index,'photoUrl','')}  title="Hapus Foto">
                      <ImageIcon size={16} className="opacity-50" />
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => handleRemove(index)}  title="Hapus Data">
                    <Trash2 size={16} />
                  </Button>
                </div>

              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
