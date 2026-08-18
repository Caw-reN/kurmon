import { Button } from '../../../components/ui.jsx';
import { useState, useEffect, useCallback } from'react';
import { MonitorSmartphone, Users, UserCheck, Briefcase } from'lucide-react';
import useAuthStore from'../../../store/monitoring/authStore';
import { Plus, HardDrive, Edit2, Trash2, Save } from'lucide-react';
import { PageHeader } from '../../../components/monitoring/ui/index.js';
;
import { Modal } from'../../../components/ui.jsx';


const authHeaders = (token) => ({"Authorization": `Bearer ${token}` });

const DEVICE_TYPES = [
  { value:'siswa', label:'Siswa', color:'bg-blue-100 text-blue-700 border-blue-200', icon: Users },
  { value:'staff', label:'Guru & Karyawan', color:'bg-purple-100 text-purple-700 border-purple-200', icon: UserCheck },
];

const DeviceTypeBadge = ({ type }) => {
  const isStaff = ['guru', 'karyawan', 'staff'].includes(type);
  const dt = isStaff ? DEVICE_TYPES[1] : DEVICE_TYPES[0];
  const Icon = dt.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-[var(--ui-radius-small)] text-xs font-bold border ${dt.color}`}>
      <Icon size={11} /> {dt.label}
    </span>
  );
};

export default function HikvisionDevices() {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentDevice, setCurrentDevice] = useState(null);
  const [saving, setSaving] = useState(false);
  const authToken = useAuthStore(state => state.user?.authToken);
  const [toast, setToast] = useState(null);

  const showToast = (message, type ='success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };
  const [formData, setFormData] = useState({
    ip_address:'', location:'', username:'admin',
    encrypted_password:'', iv_vector:'', class_id:'',
    device_type:'siswa'
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/hikvision/dashboard", { headers: authHeaders(authToken) });
      const data = await res.json();
      if (data.ok) {
        setDevices(data.devices || []);
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }, [authToken]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleOpenModal = (device = null) => {
    if (device) {
      setFormData({ ...device, device_type: device.device_type ||'siswa' });
      setCurrentDevice(device);
    } else {
      setFormData({ ip_address:'', location:'', username:'admin', encrypted_password:'', iv_vector:'', class_id:'', device_type:'siswa' });
      setCurrentDevice(null);
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const method = currentDevice ?"PUT" :"POST";
      const url = currentDevice ? `/api/hikvision/devices/${currentDevice.id}` :"/api/hikvision/devices";
      
      const res = await fetch(url, {
        method,
        headers: { ...authHeaders(authToken),'Content-Type':'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (data.ok) {
        setIsModalOpen(false);
        fetchData();
      } else {
        showToast(data.error ||"Gagal menyimpan data","error");
      }
    } catch (err) {
      showToast("Terjadi kesalahan:" + err.message,"error");
    }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!(await window.confirmAsync("Apakah Anda yakin ingin menghapus mesin ini?"))) return;
    try {
      const res = await fetch(`/api/hikvision/devices/${id}`, {
        method:"DELETE",
        headers: authHeaders(authToken)
      });
      const data = await res.json();
      if (data.ok) {
        fetchData();
      } else {
        showToast(data.error ||"Gagal menghapus data","error");
      }
    } catch (err) {
      showToast("Terjadi kesalahan:" + err.message,"error");
    }
  };

  // Group devices into 2 clean categories: Siswa vs Guru & Karyawan
  const grouped = [
    {
      ...DEVICE_TYPES[0],
      devices: devices.filter(d => (d.device_type || 'siswa') === 'siswa')
    },
    {
      ...DEVICE_TYPES[1],
      devices: devices.filter(d => ['guru', 'karyawan', 'staff'].includes(d.device_type || 'siswa'))
    }
  ];

  return (
    <div className="flex flex-col gap-4 animate-in fade-in duration-300">
      <PageHeader 
        title="Data Mesin Absensi"
        description="Kelola perangkat absensi wajah untuk Siswa, Guru, dan Karyawan."
        icon={MonitorSmartphone}
      >
        <Button 
          onClick={() => handleOpenModal()} 
          className="shrink-0"
        >
          <Plus size={14} className="mr-2" /> Tambah Mesin
        </Button>
      </PageHeader>

      {/* Stat cards per type */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {grouped.map(g => {
          const Icon = g.icon;
          return (
            <div key={g.value} className="bg-white rounded-[var(--ui-radius-card)] shadow-sm border-none p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-[var(--ui-radius-small)] flex items-center justify-center ${g.color} border`}>
                <Icon size={20} />
              </div>
              <div>
                <div className="text-2xl font-black text-slate-800">{g.devices.length}</div>
                <div className="text-xs font-bold text-slate-500">Mesin {g.label}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-[var(--ui-radius-small)] shadow-sm border-none overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-100 text-slate-500">
              <tr>
                <th className="px-4 py-2.5 font-bold">Lokasi</th>
                <th className="px-4 py-2.5 font-bold">IP Address</th>
                <th className="px-4 py-2.5 font-bold">Username</th>
                <th className="px-4 py-2.5 font-bold">Tipe</th>
                <th className="px-4 py-2.5 font-bold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan={5} className="p-8 text-center text-slate-400">Memuat data mesin...</td></tr>
              ) : devices.map(device => (
                <tr key={device.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5">
                    <div className="font-bold text-slate-800 flex items-center gap-2">
                      <HardDrive size={16} className="text-slate-400" /> {device.location}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 font-medium text-slate-600 font-mono text-xs">{device.ip_address}</td>
                  <td className="px-4 py-2.5 text-slate-500">{device.username}</td>
                  <td className="px-4 py-2.5">
                    <DeviceTypeBadge type={device.device_type ||'siswa'} />
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center justify-end gap-1">
                      <Button 
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenModal(device)} 
                        title="Edit Mesin"
                      >
                        <Edit2 size={14} />
                      </Button>
                      <Button 
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(device.id)} 
                        title="Hapus Mesin"
                      >
                        <Trash2 size={14} className="text-rose-500" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && devices.length === 0 && (
                <tr><td colSpan={5} className="p-8 text-center text-slate-400">Belum ada perangkat yang terdaftar.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={currentDevice ?"Edit Mesin" :"Tambah Mesin"}>
        <div className="space-y-4">
          {/* Tipe Mesin */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Tipe Mesin</label>
            <div className="grid grid-cols-2 gap-3">
              {DEVICE_TYPES.map(dt => {
                const Icon = dt.icon;
                const isSelected = formData.device_type === dt.value;
                return (
                  <Button variant="outline"
                    key={dt.value}
                    type="button"
                    onClick={() =>setFormData({ ...formData, device_type: dt.value })}
                    className={`flex flex-col items-center gap-1 p-3 rounded-[var(--ui-radius-small)] border-2 font-bold text-sm transition-all ${
                      isSelected
                        ? `${dt.color} border-current`
                        :'bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300'
                    }`}
                  >
                    <Icon size={20} />
                    {dt.label}</Button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Lokasi Mesin</label>
            <input className="px-3 py-2 bg-slate-50 border-none rounded-[var(--ui-radius-small)] text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
              value={formData.location}
              onChange={e => setFormData({...formData, location: e.target.value})}
              placeholder={formData.device_type ==='siswa' ?"Contoh: Absensi TKJ" : formData.device_type ==='guru' ?"Contoh: Absensi Guru Gedung A" :"Contoh: Absensi Karyawan TU"}
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">IP Address</label>
            <input className="px-3 py-2 bg-slate-50 border-none rounded-[var(--ui-radius-small)] text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full font-mono"
              value={formData.ip_address}
              onChange={e => setFormData({...formData, ip_address: e.target.value})}
              placeholder="Contoh: 192.168.1.100"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Username ISAPI</label>
            <input className="px-3 py-2 bg-slate-50 border-none rounded-[var(--ui-radius-small)] text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
              value={formData.username}
              onChange={e => setFormData({...formData, username: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Password</label>
            <input className="px-3 py-2 bg-slate-50 border-none rounded-[var(--ui-radius-small)] text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
              type="password"
              value={formData.encrypted_password}
              onChange={e => setFormData({...formData, encrypted_password: e.target.value})}
              placeholder="Password alat (Digest Auth)"
            />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="ghost" onClick={() => setIsModalOpen(false)} >Batal</Button>
          <Button onClick={handleSave} disabled={saving}>
            <Save size={16} className="mr-2" /> {saving ?'Menyimpan...' :'Simpan'}
          </Button>
        </div>
      </Modal>
      {toast && (
        <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-[var(--ui-radius-small)] shadow-sm font-medium text-sm flex items-center gap-2 animate-in slide-in-from-bottom-5 text-white z-[100] ${toast.type ==='error' ?'bg-rose-600' :'bg-emerald-600'}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
