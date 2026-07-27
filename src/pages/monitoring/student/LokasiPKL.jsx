import { Button } from '../../../components/ui.jsx';
import { useState, useEffect, useCallback } from'react';
import L from'leaflet';
import'leaflet/dist/leaflet.css';
import { PageHeader, EmptyState, StatCard } from'../../../components/monitoring/ui/index.js';
import { MapContainer, TileLayer, Marker, Popup } from'react-leaflet';
import useAuthStore from'../../../store/monitoring/authStore';
import { Loader2, CheckCircle2, Circle, Edit3, AlertCircle, Info, Navigation } from'lucide-react';


/**
 * student/LokasiPKL.jsx
 * Siswa mengatur lokasi PKL mereka. Data disimpan di PostgreSQL melalui API.
 */





const PANDUAN_PENAMAAN = { format:"Contoh: PT. Nama Perusahaan - Nama Divisi/Cabang (jika ada)" };

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl:'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl:'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const LokasiPKL = () => {
  const { user } = useAuthStore();
  const [lokasiAktif, setLokasiAktif] = useState(null);
  const [updateCount, setUpdateCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [coords, setCoords] = useState(null);
  const [namaLokasi, setNamaLokasi] = useState('');
  const [gettingGPS, setGettingGPS] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (message, type ='success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchLokasi = useCallback(async () => {
    setLoading(true);
    try {
      const authToken = JSON.parse(sessionStorage.getItem('school_schedule_session_v1'))?.authToken;
      const res = await fetch('/api/monitoring/pkl-students', {
        headers: {'Authorization': `Bearer ${authToken}` }
      });
      const data = await res.json();
      if (data.ok) {
        const me = data.data.find(s => s.nis === user?.username || s.nis === user?.nis);
        if (me && me.location_id) {
          setUpdateCount(me.location_update_count || 0);
          const locRes = await fetch('/api/pkl/locations');
          const locData = await locRes.json();
          if (locData.ok) {
            const loc = locData.data.find(l => l.id === me.location_id);
            if (loc) {
              setLokasiAktif({
                namaLokasi: loc.nama_perusahaan,
                lat: parseFloat(loc.lat),
                lng: parseFloat(loc.lng)
              });
              setShowForm(false);
            }
          }
        } else {
          setLokasiAktif(null);
          setShowForm(true);
        }
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (user) {
      Promise.resolve().then(() => fetchLokasi());
    }
  }, [user, fetchLokasi]);

  const handleGetGPS = () => {
    setGettingGPS(true);
    if (!navigator.geolocation) {
      setGettingGPS(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGettingGPS(false);
      },
      () => {
        setGettingGPS(false);
      },
      { enableHighAccuracy: true }
    );
  };

  const namaValid = namaLokasi.trim().length >= 10;
  const canSubmit = coords && namaValid;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const authToken = JSON.parse(sessionStorage.getItem('school_schedule_session_v1'))?.authToken;
      const res = await fetch('/api/pkl/student/location', {
        method:'POST',
        headers: {'Content-Type':'application/json','Authorization': `Bearer ${authToken}` },
        body: JSON.stringify({ namaLokasi, lat: coords.lat, lng: coords.lng })
      });
      const data = await res.json();
      if (data.ok) {
        setDone(true);
        fetchLokasi();
      } else {
        showToast(data.error ||'Gagal menyimpan','error');
      }
    } catch {
      showToast('Terjadi kesalahan sistem','error');
    }
    setSubmitting(false);
  };

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-slate-400" /></div>;

  return (
    <div className="p-4 md:p-0 space-y-4 md:space-y-6 max-w-3xl mx-auto w-full">
      <div>
        <h1 className="text-xl font-extrabold text-slate-800">Lokasi PKL Saya</h1>
        <p className="text-xs text-slate-400 mt-0.5">Atur dan perbarui lokasi tempat Anda menjalani PKL</p>
      </div>

      {lokasiAktif && (
        <div className="rounded-[var(--ui-radius-small)] border p-4 bg-[var(--ui-primary)]/10 border-[var(--ui-primary)]">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-[var(--ui-radius-small)] flex items-center justify-center flex-shrink-0 bg-[var(--ui-primary)]">
              <CheckCircle2 size={18} className="text-white" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-sm mb-0.5 text-[var(--ui-primary)]">Lokasi Aktif</p>
              <p className="text-xs font-semibold text-slate-800 leading-snug">{lokasiAktif.namaLokasi}</p>
              <p className="text-[10px] text-slate-400 mt-1 font-mono">
                {lokasiAktif.lat.toFixed(5)}, {lokasiAktif.lng.toFixed(5)}
              </p>
            </div>
          </div>
          <div className="mt-3 rounded-[var(--ui-radius-small)] overflow-hidden h-36">
            <MapContainer center={[lokasiAktif.lat, lokasiAktif.lng]} zoom={15}
              style={{ height:'100%', width:'100%' }}
              scrollWheelZoom={false} zoomControl={false} dragging={false}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <Marker position={[lokasiAktif.lat, lokasiAktif.lng]} />
              <Circle center={[lokasiAktif.lat, lokasiAktif.lng]} radius={150}
                pathOptions={{ color:'#15803d', fillColor:'#15803d', fillOpacity: 0.1 }} />
            </MapContainer>
          </div>
        </div>
      )}

      {done && (
        <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-[var(--ui-radius-small)] p-4">
          <CheckCircle2 size={18} className="text-emerald-600 flex-shrink-0" />
          <p className="text-sm font-semibold text-emerald-800">Lokasi berhasil disimpan!</p>
        </div>
      )}

      {!done && (
        <>
          {!showForm ? (
            <div className="space-y-3">
              <Button variant="outline" onClick={() =>setShowForm(true)} disabled={updateCount >= 2}
                className="w-full flex items-center justify-center gap-2">
                <Edit3 size={18} />
                Perbarui Lokasi GPS</Button>
              {updateCount >= 2 && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2.5 rounded-[var(--ui-radius-small)] font-medium flex items-start gap-2">
                  <AlertCircle size={15} className="mt-0.5 shrink-0" />
                  Anda sudah mencapai batas maksimal (2x) mengubah lokasi. Hubungi Admin/Guru jika perlu memperbarui lokasi lagi.
                </div>
              )}
              {updateCount > 0 && updateCount < 2 && (
                <p className="text-[10px] text-center text-slate-400 font-medium">Anda memiliki sisa {2 - updateCount} kali kesempatan update lokasi.</p>
              )}
            </div>
          ) : (
            <div className="space-y-4 bg-white border-none rounded-[var(--ui-radius-small)] p-4">
              <div className="bg-sky-50 border border-sky-200 rounded-[var(--ui-radius-small)] p-3">
                <p className="text-xs font-bold text-sky-800 mb-1.5 flex items-center gap-1">
                  <Info size={12} /> Panduan Penamaan Lokasi
                </p>
                <p className="text-[10px] text-sky-700 font-mono mb-2">{PANDUAN_PENAMAAN.format}</p>
              </div>

              <div>
                <p className="text-sm font-bold text-slate-800 mb-2">1. Ambil Koordinat GPS</p>
                <Button variant="outline" onClick={handleGetGPS} disabled={gettingGPS}
                  className="w-full flex items-center justify-center gap-2">
                  {gettingGPS ? <Loader2 size={16} className="animate-spin" /> :
                    coords ? <CheckCircle2 size={16} /> : <Navigation size={16} />}
                  {gettingGPS ?'Mencari...' : coords ?'Koordinat didapat' :'Dapatkan Lokasi GPS'}
                </Button>
              </div>

              <div>
                <p className="text-sm font-bold text-slate-800 mb-1.5">2. Nama Lokasi</p>
                <textarea rows={3} value={namaLokasi} onChange={e => setNamaLokasi(e.target.value)}
                  placeholder="PT Nama Perusahaan - Divisi/Departemen - Kota/Area"
                  className={`w-full border rounded-[var(--ui-radius-small)] px-3 py-2.5 text-sm resize-none
                    focus:outline-none focus:ring-2 focus:ring-[var(--ui-primary)] transition-all
                    ${namaValid || namaLokasi.length === 0 ?'border-slate-200' :'border-red-500'}`} />
              </div>

              <div className="flex gap-3 pt-1">
                <Button variant="outline" onClick={() =>setShowForm(false)}
                  className="flex-1">
                  Batal</Button>
                <Button onClick={handleSubmit} disabled={!canSubmit || submitting}
                  className="flex-1 flex items-center justify-center gap-2">
                  {submitting && <Loader2 size={15} className="animate-spin" />} Simpan Lokasi
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {toast && (
        <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-[var(--ui-radius-small)] shadow-lg font-medium text-sm flex items-center gap-2 animate-in slide-in-from-bottom-5 text-white z-[100] ${toast.type ==='error' ?'bg-red-600' :'bg-emerald-600'}`}>
          {toast.type ==='error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />} {toast.message}
        </div>
      )}
    </div>
  );
};
export default LokasiPKL;
