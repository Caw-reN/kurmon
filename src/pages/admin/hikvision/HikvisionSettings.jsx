import { Button } from '../../../components/ui.jsx';
import { useState, useEffect } from'react';
import { Save } from'lucide-react';
import useAuthStore from'../../../store/monitoring/authStore';
import { Settings, Users, Clock } from'lucide-react';


export default function HikvisionSettings() {
  const authToken = useAuthStore(state => state.user?.authToken);
  const [config, setConfig] = useState({
    siswa: { masuk_start:"06:00", masuk_end:"07:30", masuk_late:"07:00", pulang_start:"15:00", pulang_end:"17:00" },
    guru: { masuk_start:"06:00", masuk_end:"07:30", masuk_late:"07:00", pulang_start:"15:00", pulang_end:"17:00" },
    karyawan: { masuk_start:"06:00", masuk_end:"07:30", masuk_late:"07:00", pulang_start:"15:00", pulang_end:"17:00" }
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (message, type ='success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    const fetchConfig = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/hikvision/config", { headers: {"Authorization": `Bearer ${authToken}` } });
        const json = await res.json();
        if (json.ok && json.config) {
          setConfig(prev => ({ ...prev, ...json.config }));
        }
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    };
    fetchConfig();
  }, [authToken]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/hikvision/config", {
        method:"POST",
        headers: {"Authorization": `Bearer ${authToken}`,"Content-Type":"application/json" },
        body: JSON.stringify(config)
      });
      const json = await res.json();
      if (json.ok) {
        showToast("Konfigurasi berhasil disimpan!");
      } else {
        showToast(json.error ||"Gagal menyimpan konfigurasi.","error");
      }
    } catch (err) {
      console.error(err);
      showToast("Kesalahan jaringan saat menyimpan konfigurasi.","error");
    }
    setSaving(false);
  };

  const handleChange = (type, field, value) => {
    setConfig(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        [field]: value
      }
    }));
  };

  if (loading) return <div className="p-8 text-center text-slate-500 font-bold animate-pulse">Memuat pengaturan...</div>;

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      <div>
        <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
          <Settings size={24} className="text-[var(--ui-primary)]" />
          Pengaturan Absensi HIKVISION
        </h2>
        <p className="text-sm text-slate-500 font-medium mt-1">
          Atur jam masuk, jam batas terlambat, dan jam pulang untuk notifikasi otomatis.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {["siswa","guru","karyawan"].map(type => (
          <div key={type} className="bg-white rounded-[var(--ui-radius-card)] shadow-sm border-none p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-800 capitalize flex items-center gap-2">
              <Users size={18} className="text-slate-400" />
              Aturan Absensi {type}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-slate-600 border-b pb-2">Jam Masuk</h4>
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Mulai Absen Masuk</label>
                  <input type="time" value={config[type]?.masuk_start ||''} onChange={e => handleChange(type,'masuk_start', e.target.value)} className="w-full border-none p-2 rounded-[var(--ui-radius-small)] text-sm font-bold" required />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Batas Akhir Masuk</label>
                  <input type="time" value={config[type]?.masuk_end ||''} onChange={e => handleChange(type,'masuk_end', e.target.value)} className="w-full border-none p-2 rounded-[var(--ui-radius-small)] text-sm font-bold" required />
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-bold text-amber-600 border-b pb-2 flex items-center gap-1"><Clock size={14}/> Keterlambatan</h4>
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Dihitung Terlambat Mulai Pukul</label>
                  <input type="time" value={config[type]?.masuk_late ||''} onChange={e => handleChange(type,'masuk_late', e.target.value)} className="w-full border border-amber-200 bg-amber-50 focus:bg-white p-2 rounded-[var(--ui-radius-small)] text-sm font-bold text-amber-800" required />
                </div>
                <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
                  Jika {type} absen lebih dari jam ini, sistem akan otomatis mengirimkan notifikasi WA (Late).
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-bold text-indigo-600 border-b pb-2">Jam Pulang</h4>
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Mulai Absen Pulang</label>
                  <input type="time" value={config[type]?.pulang_start ||''} onChange={e => handleChange(type,'pulang_start', e.target.value)} className="w-full border-none p-2 rounded-[var(--ui-radius-small)] text-sm font-bold" required />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Batas Akhir Pulang</label>
                  <input type="time" value={config[type]?.pulang_end ||''} onChange={e => handleChange(type,'pulang_end', e.target.value)} className="w-full border-none p-2 rounded-[var(--ui-radius-small)] text-sm font-bold" required />
                </div>
              </div>
            </div>
          </div>
        ))}

        <div className="flex justify-end">
          <Button variant="outline" type="submit" disabled={saving} icon={Save} >{saving ?"Menyimpan..." :"Simpan Pengaturan"}</Button>
        </div>
      </form>
      {toast && (
        <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-[var(--ui-radius-small)] shadow-lg font-medium text-sm flex items-center gap-2 animate-in slide-in-from-bottom-5 text-white z-[100] ${toast.type ==='error' ?'bg-red-600' :'bg-emerald-600'}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
