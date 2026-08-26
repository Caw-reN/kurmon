import { useState, useMemo } from 'react';
import { 
  Users, Search, Plus, Save, GripVertical, ImageIcon, Trash2, 
  ChevronUp, ChevronDown, Network, ListOrdered, CheckCircle2, 
  AlertCircle, Building2, UserCheck, Sparkles, RefreshCw, Eye
} from 'lucide-react';
import { compressImage } from '../../../utils/imageUtils.js';
import { PageHeader, Avatar } from '../../../components/monitoring/ui/index.js';
import { Button, Modal } from '../../../components/ui.jsx';
import { CustomSelect } from '../../../components/CustomSelect.jsx';

const PRESET_JABATAN = [
  "Kepala Sekolah",
  "Wakil Kepala Bid. Kurikulum",
  "Wakil Kepala Bid. Kesiswaan",
  "Wakil Kepala Bid. Hubin & Humas",
  "Wakil Kepala Bid. Sarana Prasarana",
  "Kepala Tata Usaha (TU)",
  "Kepala Program Keahlian TKJ",
  "Kepala Program Keahlian TKR",
  "Kepala Program Keahlian RPL",
  "Kepala Program Keahlian AKL",
  "Kepala Program Keahlian MP",
  "Koordinator BK / BP",
  "Pembina OSIS & Ekstrakurikuler",
  "Bendahara Sekolah",
  "Guru Mata Pelajaran",
  "Staf Administrasi TU"
];

const TeacherCombobox = ({ teachers = [], onSelect }) => {
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const filtered = useMemo(() => {
    return (teachers || []).filter(t => {
      const q = search.toLowerCase();
      const name = (t.name || t.nama || '').toLowerCase();
      const code = String(t.code || t.id || '').toLowerCase();
      return name.includes(q) || code.includes(q);
    });
  }, [teachers, search]);

  return (
    <div className="relative w-full sm:w-72">
      <div className="relative">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input 
          type="text"
          placeholder="+ Cari & Tambah dari Guru / Staf..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          className="w-full py-2 pl-9 pr-3 text-xs font-bold bg-[var(--ui-surface-muted)] hover:bg-white border border-[var(--ui-border-soft)] rounded-[var(--ui-radius-control)] focus:bg-white focus:outline-none focus:border-[var(--ui-primary)] transition-all placeholder-slate-400"
        />
      </div>
      
      {isOpen && (
        <>
          <div className="absolute z-50 mt-1.5 w-full bg-white border border-slate-200/90 rounded-[var(--ui-radius-control)] shadow-[var(--ui-shadow-modal)] max-h-60 overflow-y-auto">
            {filtered.length > 0 ? (
              filtered.map(t => {
                const name = t.name || t.nama;
                const code = t.code || t.id;
                return (
                  <div 
                    key={code}
                    className="px-3.5 py-2.5 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-0 transition-colors flex items-center gap-2.5"
                    onClick={() => {
                      onSelect(t);
                      setSearch('');
                      setIsOpen(false);
                    }}
                  >
                    <Avatar name={name} size="xs" />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-extrabold text-slate-800 truncate">{name}</div>
                      <div className="text-[10px] font-bold text-slate-400 mt-0.5">Kode: {code} • {t.mapel || t.type || 'Guru'}</div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="px-4 py-4 text-xs font-bold text-slate-400 text-center">Guru / Staf tidak ditemukan</div>
            )}
          </div>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
        </>
      )}
    </div>
  );
};

export default function AdminStrukturOrganisasi({ appSettings, setAppSettings, onSave, showNotification, teachers = [] }) {
  const [struktur, setStruktur] = useState(() => {
    return appSettings?.strukturOrganisasi || [
      { id: "str_1", name: "Yunie Purwiasih, M.Pd", position: "Kepala Sekolah", parentId: "", description: "NIP. 197505122005012003", order: 0 },
      { id: "str_2", name: "Dra. ROSYIDAH", position: "Wakil Kepala Bid. Kurikulum", parentId: "str_1", description: "Kode: 1", order: 1 },
      { id: "str_3", name: "AGUNG NUGROHO, S.Pd., MT", position: "Wakil Kepala Bid. Hubin", parentId: "str_1", description: "Kode: 23", order: 2 },
      { id: "str_4", name: "YANDRI BASUKI RAHMAT, S.Pd", position: "Wakil Kepala Bid. Kesiswaan", parentId: "str_1", description: "Kode: 13", order: 3 },
      { id: "str_5", name: "SRI SUBEKTI, S.Pd", position: "Wakil Kepala Bid. Sarana", parentId: "str_1", description: "Kode: 7", order: 4 },
    ];
  });

  const [activeTab, setActiveTab] = useState("kelola");
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const notify = (message, type = "success") => {
    if (showNotification) showNotification(message, type);
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleAdd = () => {
    setStruktur(prev => [
      ...prev,
      {
        id: `struktur_${Date.now()}`,
        name: '',
        position: 'Guru / Anggota Pengurus',
        description: '',
        photoUrl: '',
        parentId: prev.length > 0 ? prev[0].id : '',
        order: prev.length,
      }
    ]);
  };

  const handleAddFromTeacher = (teacher) => {
    if (!teacher) return;
    setStruktur(prev => [
      ...prev,
      {
        id: `struktur_${Date.now()}_${teacher.code || teacher.id}`,
        name: teacher.name || teacher.nama || '',
        position: teacher.role || teacher.position || 'Guru Pengajar',
        description: teacher.code ? `Kode: ${teacher.code}` : '',
        photoUrl: '', 
        parentId: prev.length > 0 ? prev[0].id : '',
        order: prev.length,
      }
    ]);
    notify(`Berhasil menambahkan ${teacher.name || teacher.nama} ke struktur.`);
  };

  const handleUpdate = (index, field, value) => {
    setStruktur(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleMove = (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= struktur.length) return;
    
    setStruktur(prev => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[targetIndex];
      copy[targetIndex] = temp;
      return copy;
    });
  };

  const handleRemove = (index) => {
    const item = struktur[index];
    if (typeof window !== 'undefined' && window.confirm) {
      if (!window.confirm(`Hapus "${item.name || 'Pengurus'}" dari struktur organisasi?`)) return;
    }
    setStruktur(prev => prev.filter((_, i) => i !== index));
    notify("Pengurus berhasil dihapus.");
  };

  const handleImageUpload = (index, file) => {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      notify('Ukuran gambar maksimal 2MB', 'warning');
      return;
    }
    
    compressImage(file, { maxWidth: 300, maxHeight: 300, quality: 0.8 }).then(compressedBase64 => {
      handleUpdate(index, 'photoUrl', compressedBase64);
      notify("Foto profil pengurus berhasil diperbarui.");
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    const validStruktur = struktur.filter(s => s.name && s.name.trim() !== '');
    
    if (setAppSettings) {
      setAppSettings({
        ...appSettings,
        strukturOrganisasi: validStruktur
      });
    }
    
    try {
      if (onSave) {
        await onSave({ appSettings: { ...appSettings, strukturOrganisasi: validStruktur } }, "menyimpan struktur organisasi");
      }
      notify('Struktur organisasi berhasil disimpan dan diperbarui!');
    } catch (e) {
      notify('Gagal menyimpan struktur organisasi.', 'error');
    }
    setIsSaving(false);
  };

  // Drag and Drop
  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) return;
    
    setStruktur(prev => {
      const copy = [...prev];
      const item = copy[draggedIndex];
      copy.splice(draggedIndex, 1);
      copy.splice(dropIndex, 0, item);
      return copy;
    });
    setDraggedIndex(null);
  };

  // Build tree for preview
  const treeData = useMemo(() => {
    const rootNodes = [];
    const nodeMap = {};

    struktur.forEach(item => {
      nodeMap[item.id] = { ...item, children: [] };
    });

    struktur.forEach(item => {
      if (item.parentId && nodeMap[item.parentId]) {
        nodeMap[item.parentId].children.push(nodeMap[item.id]);
      } else {
        rootNodes.push(nodeMap[item.id]);
      }
    });

    return rootNodes;
  }, [struktur]);

  return (
    <div className="space-y-4 sm:space-y-5 animate-in fade-in duration-300 pb-10">
      {/* Clean Page Header */}
      <PageHeader 
        icon={Users}
        title="Struktur Organisasi Sekolah"
        description="Kelola susunan pengurus, bagan kepemimpinan, dan hierarki organisasi sekolah."
        rightContent={
          <Button 
            variant="primary" 
            size="sm"
            onClick={handleSave} 
            disabled={isSaving}
            className="flex items-center gap-1.5 font-bold shadow-[var(--ui-shadow-control)]"
          >
            {isSaving ? <RefreshCw size={13} className="animate-spin" /> : <Save size={13} strokeWidth={2.5} />}
            <span>Simpan Struktur</span>
          </Button>
        }
      />

      {/* Unified Tab Switcher Bar */}
      <div className="bg-white p-1.5 rounded-[var(--ui-radius-card)] border border-slate-200/80 shadow-[var(--ui-shadow-card)] flex items-center justify-between gap-2.5">
        <div className="flex items-center p-1 bg-[var(--ui-surface-muted)] rounded-[var(--ui-radius-control)] border border-[var(--ui-border-muted)] w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setActiveTab('kelola')}
            className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-[var(--ui-radius-small)] text-xs font-black transition-all cursor-pointer border-none flex items-center justify-center gap-1.5 ${
              activeTab === 'kelola'
                ? 'bg-white text-slate-800 shadow-2xs'
                : 'bg-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ListOrdered size={14} />
            <span>Kelola & Susun Pengurus ({struktur.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('preview')}
            className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-[var(--ui-radius-small)] text-xs font-black transition-all cursor-pointer border-none flex items-center justify-center gap-1.5 ${
              activeTab === 'preview'
                ? 'bg-white text-slate-800 shadow-2xs'
                : 'bg-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Network size={14} />
            <span>Pratinjau Diagram Pohon (Org Chart)</span>
          </button>
        </div>

        <span className="text-[11px] font-bold text-slate-400 pr-3 hidden sm:inline">
          {struktur.length} Anggota Terdaftar
        </span>
      </div>

      {/* ── TAB 1: KELOLA PENGURUS ── */}
      {activeTab === "kelola" && (
        <div className="space-y-3.5">
          {/* Action Toolbar Card */}
          <div className="bg-white rounded-[var(--ui-radius-card)] p-3.5 sm:p-4 border border-slate-200/80 shadow-[var(--ui-shadow-card)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <TeacherCombobox teachers={teachers} onSelect={handleAddFromTeacher} />

            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm"
                type="button" 
                onClick={handleAdd} 
                className="flex items-center gap-1.5 font-bold w-full sm:w-auto justify-center"
              >
                <Plus size={14} strokeWidth={2.5} />
                <span>+ Tambah Manual</span>
              </Button>
            </div>
          </div>

          {/* Members List */}
          {struktur.length === 0 ? (
            <div className="bg-white rounded-[var(--ui-radius-card)] p-12 text-center border border-slate-200/80">
              <Users size={36} className="mx-auto text-slate-300 mb-2" />
              <h4 className="text-sm font-bold text-slate-700">Belum ada pengurus organisasi</h4>
              <p className="text-xs text-slate-400 mt-1 mb-4">Tambahkan pengurus pertama dari daftar guru atau secara manual.</p>
              <Button type="button" onClick={handleAdd} size="sm">
                <Plus size={14} className="mr-1" /> Tambah Sekarang
              </Button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {struktur.map((item, index) => {
                const isPucuk = !item.parentId;
                const parentObj = struktur.find(s => s.id === item.parentId);

                return (
                  <div 
                    key={item.id} 
                    draggable
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, index)}
                    onDragEnd={() => setDraggedIndex(null)}
                    className={`bg-white rounded-[var(--ui-radius-card)] p-3.5 sm:p-4 border transition-all duration-200 shadow-[var(--ui-shadow-card)] flex flex-col md:flex-row items-start md:items-center gap-3.5 ${
                      draggedIndex === index ? 'opacity-40 border-indigo-300 bg-indigo-50/50' : 'border-slate-200/80 hover:border-slate-300'
                    }`}
                  >
                    {/* Drag Handle & Mobile Ordering Controls */}
                    <div className="flex items-center gap-1 shrink-0">
                      <div className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-indigo-600 p-1 hidden md:block" title="Tarik untuk mengubah urutan">
                        <GripVertical size={18} />
                      </div>
                      
                      {/* Mobile Move Up/Down buttons */}
                      <div className="flex items-center gap-0.5">
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={() => handleMove(index, -1)}
                          className="p-1 rounded text-slate-400 hover:text-slate-700 disabled:opacity-30 cursor-pointer bg-slate-100 hover:bg-slate-200 border-none"
                          title="Pindah ke Atas"
                        >
                          <ChevronUp size={14} />
                        </button>
                        <button
                          type="button"
                          disabled={index === struktur.length - 1}
                          onClick={() => handleMove(index, 1)}
                          className="p-1 rounded text-slate-400 hover:text-slate-700 disabled:opacity-30 cursor-pointer bg-slate-100 hover:bg-slate-200 border-none"
                          title="Pindah ke Bawah"
                        >
                          <ChevronDown size={14} />
                        </button>
                      </div>

                      <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-500 font-mono font-bold text-[10px] flex items-center justify-center ml-1">
                        {index + 1}
                      </span>
                    </div>

                    {/* Member Avatar / Photo Upload */}
                    <div className="relative group/avatar shrink-0">
                      <div className="w-12 h-12 rounded-[var(--ui-radius-control)] bg-[var(--ui-surface-muted)] border border-[var(--ui-border-soft)] flex items-center justify-center overflow-hidden shadow-2xs">
                        {item.photoUrl ? (
                          <img src={item.photoUrl} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                          <Avatar name={item.name || `P${index+1}`} size="md" />
                        )}
                      </div>
                      <label 
                        className="absolute inset-0 bg-black/60 rounded-[var(--ui-radius-control)] text-white opacity-0 group-hover/avatar:opacity-100 flex flex-col items-center justify-center cursor-pointer transition-opacity text-[8.5px] font-bold p-1 text-center"
                        title="Upload Foto"
                      >
                        <ImageIcon size={12} className="mb-0.5" />
                        <span>Foto</span>
                        <input 
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          onChange={(e) => handleImageUpload(index, e.target.files[0])} 
                        />
                      </label>
                    </div>

                    {/* Form Fields Grid */}
                    <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                      {/* Name */}
                      <div>
                        <label className="text-[9.5px] font-black text-slate-400 uppercase tracking-wider block mb-1">
                          NAMA LENGKAP
                        </label>
                        <input 
                          type="text" 
                          placeholder="Nama Pengurus & Gelar..." 
                          value={item.name} 
                          onChange={(e) => handleUpdate(index, 'name', e.target.value)} 
                          className="w-full px-2.5 py-1.5 bg-[var(--ui-surface-muted)] hover:bg-white border border-[var(--ui-border-soft)] rounded-[var(--ui-radius-control)] text-xs font-extrabold text-slate-800 focus:bg-white focus:outline-none focus:border-[var(--ui-primary)] transition-all"
                        />
                      </div>

                      {/* Position / Jabatan with preset suggestions */}
                      <div>
                        <label className="text-[9.5px] font-black text-slate-400 uppercase tracking-wider block mb-1">
                          JABATAN / STRUKTUR
                        </label>
                        <input 
                          type="text" 
                          list={`preset-jabatan-${index}`}
                          placeholder="Pilih atau ketik jabatan..." 
                          value={item.position} 
                          onChange={(e) => handleUpdate(index, 'position', e.target.value)} 
                          className="w-full px-2.5 py-1.5 bg-[var(--ui-surface-muted)] hover:bg-white border border-[var(--ui-border-soft)] rounded-[var(--ui-radius-control)] text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:border-[var(--ui-primary)] transition-all"
                        />
                        <datalist id={`preset-jabatan-${index}`}>
                          {PRESET_JABATAN.map(j => <option key={j} value={j} />)}
                        </datalist>
                      </div>

                      {/* Parent / Atasan */}
                      <div>
                        <label className="text-[9.5px] font-black text-slate-400 uppercase tracking-wider block mb-1">
                          ATASAN LANGSUNG (PARENT)
                        </label>
                        <CustomSelect 
                          value={item.parentId || ""}
                          onChange={(val) => handleUpdate(index, 'parentId', val)}
                          placeholder="⭐ - Paling Atas (Pucuk / Kepala) -"
                          searchable={false}
                          options={[
                            { value: "", label: "⭐ - Paling Atas (Pucuk / Kepala) -" },
                            ...struktur
                              .filter(s => s.id !== item.id)
                              .map(s => ({
                                value: s.id,
                                label: `↳ ${s.name || 'Pengurus'} (${s.position || 'Staf'})`
                              }))
                          ]}
                        />
                      </div>

                      {/* Description / NIP / Contact */}
                      <div>
                        <label className="text-[9.5px] font-black text-slate-400 uppercase tracking-wider block mb-1">
                          KETERANGAN / NIP
                        </label>
                        <input 
                          type="text" 
                          placeholder="NIP / No. Kontak / Kode..." 
                          value={item.description} 
                          onChange={(e) => handleUpdate(index, 'description', e.target.value)} 
                          className="w-full px-2.5 py-1.5 bg-[var(--ui-surface-muted)] hover:bg-white border border-[var(--ui-border-soft)] rounded-[var(--ui-radius-control)] text-xs font-medium text-slate-700 focus:bg-white focus:outline-none focus:border-[var(--ui-primary)] transition-all"
                        />
                      </div>
                    </div>

                    {/* Delete Button */}
                    <div className="flex items-center gap-1 shrink-0 self-end md:self-center">
                      <button
                        type="button"
                        onClick={() => handleRemove(index)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded bg-slate-100 hover:bg-rose-50 border border-slate-200 cursor-pointer transition-colors"
                        title="Hapus dari Struktur"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: PRATINJAU DIAGRAM POHON (ORG CHART) ── */}
      {activeTab === "preview" && (
        <div className="bg-white rounded-[var(--ui-radius-card)] p-6 border border-slate-200/80 shadow-[var(--ui-shadow-card)] overflow-x-auto min-h-[450px]">
          <div className="text-center mb-6">
            <h3 className="font-black text-slate-900 text-base">Bagan Struktur Kepengurusan Organisasi</h3>
            <p className="text-xs text-slate-400 mt-0.5">Hierarki organisasi sekolah berdasarkan atasan langsung.</p>
          </div>

          {/* Recursive Tree Viewer */}
          <div className="flex justify-center min-w-[700px] py-4">
            <div className="flex flex-col items-center gap-6 w-full">
              {treeData.map(node => (
                <TreeNode key={node.id} node={node} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-[var(--ui-radius-control)] shadow-[var(--ui-shadow-modal)] font-bold text-xs flex items-center gap-2 animate-in slide-in-from-bottom-5 text-white z-[100] ${
          toast.type === 'error' ? 'bg-rose-600' : 'bg-emerald-600'
        }`}>
          {toast.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />} 
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}

// Tree Node Recursive Component for Org Chart Preview
function TreeNode({ node }) {
  const hasChildren = node.children && node.children.length > 0;

  return (
    <div className="flex flex-col items-center relative">
      {/* Node Card */}
      <div className="bg-white rounded-[var(--ui-radius-control)] p-3 border-2 border-[var(--ui-primary)] shadow-sm flex flex-col items-center text-center w-48 relative z-10 transition-all hover:scale-105 hover:shadow-sm">
        <div className="w-12 h-12 rounded-full overflow-hidden mb-2 border border-slate-200 shadow-2xs flex items-center justify-center bg-slate-50">
          {node.photoUrl ? (
            <img src={node.photoUrl} alt={node.name} className="w-full h-full object-cover" />
          ) : (
            <Avatar name={node.name || "P"} size="md" />
          )}
        </div>
        <h5 className="font-black text-xs text-slate-900 leading-snug line-clamp-1">{node.name || "Nama Pengurus"}</h5>
        <span className="text-[10px] font-black uppercase text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 mt-1 line-clamp-1">
          {node.position || "Jabatan"}
        </span>
        {node.description && (
          <span className="text-[9px] text-slate-400 font-semibold mt-1 truncate max-w-full">
            {node.description}
          </span>
        )}
      </div>

      {/* Children branches with connecting lines */}
      {hasChildren && (
        <div className="flex flex-col items-center w-full">
          {/* Vertical stem line down from parent */}
          <div className="w-0.5 h-6 bg-slate-300" />

          {/* Children container with horizontal bar */}
          <div className="flex justify-center gap-6 relative pt-4">
            {node.children.length > 1 && (
              <div className="absolute top-0 left-24 right-24 h-0.5 bg-slate-300" />
            )}
            {node.children.map(child => (
              <div key={child.id} className="relative flex flex-col items-center">
                {/* Branch connector line */}
                <div className="w-0.5 h-4 bg-slate-300 absolute -top-4" />
                <TreeNode node={child} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
