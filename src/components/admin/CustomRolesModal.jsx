import { Button } from '../../components/ui.jsx';
import { useState, useEffect } from'react';
import { ROLE_OPTIONS, normalizeUserRole } from'../../utils/constants.js';
import { MENU_REGISTRY, normalizeText } from'../../utils/adminHelpers.js';
import { Edit2, Trash2 } from'lucide-react';
import { Modal } from'../ui.jsx';
;


const CustomRolesModal = ({
  isOpen,
  onClose,
  appSettings,
  setAppSettings,
  showNotification,
  teachers
}) => {
  const [roles, setRoles] = useState(appSettings.customRoles || []);
  const [editingRole, setEditingRole] = useState(null);
  const [formData, setFormData] = useState({
    value:"",
    label:"",
    shortLabel:"",
    description:"",
    permissions: []
  });
  useEffect(() => {
    if (isOpen) {
      setRoles(appSettings.customRoles || []);
      setEditingRole(null);
      setFormData({
        value:"",
        label:"",
        shortLabel:"",
        description:"",
        permissions: []
      });
    }
  }, [isOpen, appSettings.customRoles]);
  const togglePermission = menuId => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(menuId) ? prev.permissions.filter(id => id !== menuId) : [...prev.permissions, menuId]
    }));
  };
  const handleSave = e => {
    e.preventDefault();
    if (!formData.label || !formData.shortLabel) {
      showNotification("Nama Role dan Singkatan wajib diisi","warning");
      return;
    }
    const roleValue = formData.value || normalizeText(formData.label).replace(/\s+/g,"_");
    if (ROLE_OPTIONS.some(r => r.value === roleValue)) {
      showNotification("Nama role ini bertabrakan dengan role sistem.","warning");
      return;
    }
    let newRoles;
    if (editingRole) {
      newRoles = roles.map(r => r.value === editingRole.value ? {
        ...formData,
        value: roleValue
      } : r);
    } else {
      if (roles.some(r => r.value === roleValue)) {
        showNotification("Role ini sudah ada.","warning");
        return;
      }
      newRoles = [...roles, {
        ...formData,
        value: roleValue,
        badgeClass:"bg-slate-50 text-slate-700 border-slate-200"
      }];
    }
    setRoles(newRoles);
    setAppSettings({
      ...appSettings,
      customRoles: newRoles
    });
    showNotification("Role berhasil disimpan.","success");
    setEditingRole(null);
    setFormData({
      value:"",
      label:"",
      shortLabel:"",
      description:"",
      permissions: []
    });
  };
  const handleDelete = roleValue => {
    const isUsed = teachers.some(t => normalizeUserRole(t.role) === roleValue);
    if (isUsed) {
      showNotification("Role tidak dapat dihapus karena sedang digunakan oleh pengguna.","error");
      return;
    }
    const newRoles = roles.filter(r => r.value !== roleValue);
    setRoles(newRoles);
    setAppSettings({
      ...appSettings,
      customRoles: newRoles
    });
    showNotification("Role berhasil dihapus.","success");
  };
  if (!isOpen) return null;
  return <Modal isOpen={isOpen} onClose={onClose} title="Manajemen Role & Jabatan Tambahan" maxWidth="max-w-4xl">
      <div className="flex flex-col md:flex-row gap-6">
        <div className="flex-1 space-y-4">
          <h3 className="text-sm font-black text-slate-800">
            Daftar Role Custom
          </h3>
          {roles.length === 0 ? <div className="text-xs text-slate-500 bg-slate-50 p-6 rounded-[var(--ui-radius-small)] text-center font-medium border-none">
              Belum ada role tambahan.
              <br />
              Gunakan form di samping untuk membuat role baru.
            </div> : <div className="space-y-3">
              {roles.map(r => <div key={r.value} className="bg-white border-none p-4 rounded-[var(--ui-radius-card)] flex items-center justify-between shadow-sm">
                  <div>
                    <div className="font-black text-sm text-slate-800">
                      {r.label}{""}
                      <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-[var(--ui-radius-small)] ml-2">
                        {r.shortLabel}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 font-medium mt-1">
                      {r.description ||"Tidak ada deskripsi"}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => {
                setEditingRole(r);
                setFormData(r);
              }} className="p-2 text-slate-400 hover:text-[var(--ui-primary)] bg-slate-50 hover:bg-[var(--ui-primary)]/10 rounded-[var(--ui-radius-small)] transition-colors">
                      <Edit2 size={14} />
                    </button>
                    <button onClick={() => handleDelete(r.value)} className="p-2 text-slate-400 hover:text-red-500 bg-slate-50 hover:bg-red-50 rounded-[var(--ui-radius-small)] transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>)}
            </div>}
        </div>
        <div className="w-full md:w-[450px] shrink-0 bg-slate-50/50 p-5 rounded-[var(--ui-radius-small)] border-none flex flex-col max-h-[80vh] overflow-hidden">
          <h3 className="text-sm font-black text-slate-800 mb-4">
            {editingRole ?"Edit Role" :"Tambah Role Baru"}
          </h3>
          <form onSubmit={handleSave} className="flex flex-col h-full gap-4 overflow-hidden">
            <div className="space-y-4 overflow-y-auto custom-scrollbar flex-1 pr-2">
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">
                  Nama Role / Jabatan
                </label>
                <input type="text" required value={formData.label} onChange={e => setFormData({
                ...formData,
                label: e.target.value
              })} className="w-full border-none bg-white p-3 rounded-[var(--ui-radius-card)] text-sm font-bold focus:outline-[var(--ui-primary)] shadow-sm" placeholder="Misal: Kepala Tata Usaha" />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">
                  Singkatan / Level
                </label>
                <input type="text" required value={formData.shortLabel} onChange={e => setFormData({
                ...formData,
                shortLabel: e.target.value
              })} className="w-full border-none bg-white p-3 rounded-[var(--ui-radius-card)] text-sm font-bold focus:outline-[var(--ui-primary)] shadow-sm" placeholder="Misal: Level 5" />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">
                  Deskripsi
                </label>
                <textarea value={formData.description} onChange={e => setFormData({
                ...formData,
                description: e.target.value
              })} className="w-full border-none bg-white p-3 rounded-[var(--ui-radius-card)] text-sm font-medium focus:outline-[var(--ui-primary)] shadow-sm min-h-[60px]" placeholder="Deskripsi hak akses..." />
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-3 block">
                  Hak Akses Menu (Permissions)
                </label>
                <div className="bg-white border-none rounded-[var(--ui-radius-card)] p-3 shadow-sm space-y-4">
                  {Array.from(new Set(MENU_REGISTRY.map(m => m.category))).map(category => <div key={category}>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                        {category}
                      </div>
                      <div className="grid grid-cols-1 gap-2">
                        {MENU_REGISTRY.filter(m => m.category === category).map(menu => <label key={menu.id} className="flex items-center gap-2 cursor-pointer p-1.5 hover:bg-slate-50 rounded-[var(--ui-radius-small)] transition-colors border-none hover:border-slate-100">
                            <input type="checkbox" className="rounded-[var(--ui-radius-small)] border-slate-300 text-[var(--ui-primary)] focus:ring-[var(--ui-primary)] cursor-pointer" checked={(formData.permissions || []).includes(menu.id)} onChange={() => togglePermission(menu.id)} />
                            <span className="text-xs font-medium text-slate-700">
                              {menu.label}
                            </span>
                          </label>)}
                      </div>
                    </div>)}
                </div>
              </div>
            </div>

            <div className="pt-3 flex gap-3 shrink-0 border-t border-slate-200 bg-slate-50/50 pb-1 mt-1">
              {editingRole && <Button type="button" variant="secondary" onClick={() => {
              setEditingRole(null);
              setFormData({
                value:"",
                label:"",
                shortLabel:"",
                description:"",
                permissions: []
              });
            }} className="flex-1">
                  Batal
                </Button>}
              <Button type="submit" className="flex-1">
                {editingRole ?"Simpan Perubahan" :"Buat Role"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </Modal>;
};

export default CustomRolesModal;
