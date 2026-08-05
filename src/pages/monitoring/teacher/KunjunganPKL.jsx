import { Button } from '../../../components/ui.jsx';
import { useState } from'react';
import useAuthStore from'../../../store/monitoring/authStore.js';
import { compressImage } from'../../../utils/imageUtils.js';
import { MapPin, CheckCircle2, Crosshair, Camera } from'lucide-react';


// Calculate distance in meters using Haversine formula
function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const p1 = lat1 * Math.PI / 180;
  const p2 = lat2 * Math.PI / 180;
  const dp = (lat2 - lat1) * Math.PI / 180;
  const dl = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dp / 2) * Math.sin(dp / 2) + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) * Math.sin(dl / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function KunjunganPKL() {
  const [location, setLocation] = useState(null);
  const [loadingLoc, setLoadingLoc] = useState(false);
  const [photo, setPhoto] = useState(null);
  const [notes, setNotes] = useState("");
  const [companyLat, setCompanyLat] = useState(-6.234839); // Dummy company location for radius testing
  const [companyLng, setCompanyLng] = useState(106.989254);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (message, type ='success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };
  const authToken = useAuthStore(state => state.user?.authToken);
  const user = useAuthStore(state => state.user);

  const getGPSLocation = () => {
    setLoadingLoc(true);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy
          });
          setLoadingLoc(false);
        },
        () => {
          showToast("Gagal mendapatkan lokasi. Pastikan GPS aktif dan izinkan browser mengakses lokasi.","error");
          setLoadingLoc(false);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      showToast("Browser tidak mendukung Geolocation","error");
      setLoadingLoc(false);
    }
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      compressImage(file, { maxWidth: 600, maxHeight: 600, quality: 0.8 }).then(compressedBase64 => {
        setPhoto(compressedBase64);
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!location || !photo) {
      showToast("Harap ambil lokasi GPS dan foto kunjungan terlebih dahulu!","warning");
      return;
    }
    
    setIsSubmitting(true);
    
    // Calculate distance
    const dist = getDistance(location.lat, location.lng, companyLat, companyLng);
    const radiusValid = dist <= 150; // 150 meters radius
    
    // Simulate saving
    setTimeout(() => {
      setIsSubmitting(false);
      setSuccess(true);
      // In a real app, we would send this to the backend:
      console.log("Kunjungan check-in:", {
        lat: location.lat,
        lng: location.lng,
        distance: dist,
        valid: radiusValid,
        photo,
        notes,
        teacher_code: user?.username || user?.code,
        token: authToken
      });
    }, 1500);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-300">
      <div className="bg-white p-6 rounded-[var(--ui-radius-card)] shadow-sm border-none">
        <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
          <MapPin className="text-[var(--ui-primary)]" /> Check-in Kunjungan PKL
        </h1>
        <p className="text-sm text-slate-500 mt-1">Sistem deteksi lokasi (GPS) dan radius kunjungan otomatis.</p>
      </div>

      {success ? (
        <div className="bg-emerald-50 border border-emerald-200 p-8 rounded-[var(--ui-radius-small)] text-center space-y-4">
          <CheckCircle2 size={48} className="mx-auto text-emerald-500" />
          <h2 className="text-xl font-bold text-emerald-800">Check-in Berhasil!</h2>
          <p className="text-sm text-emerald-600">Data kunjungan Anda beserta foto telah tersimpan di sistem.</p>
          <Button variant="outline" onClick={() =>{ setSuccess(false); setLocation(null); setPhoto(null); setNotes(""); }}>
            Check-in Lokasi Lain</Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-[var(--ui-radius-card)] shadow-sm border-none space-y-6">
          
          {/* GPS Section */}
          <div className="space-y-3">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">1. Deteksi Lokasi (Wajib)</label>
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center p-4 bg-slate-50 rounded-[var(--ui-radius-small)] border-none">
              <Button type="button" variant="outline" onClick={getGPSLocation} disabled={loadingLoc} className="flex items-center gap-2 shrink-0">
                <Crosshair size={16} /> {loadingLoc ?'Mendeteksi...' :'Ambil Koordinat GPS'}
              </Button>
              
              <div className="flex-1">
                {location ? (
                  <div className="text-sm text-slate-700">
                    <p className="font-bold text-emerald-600 flex items-center gap-1"><CheckCircle2 size={14}/> Lokasi Ditemukan</p>
                    <p className="font-mono text-xs mt-1 text-slate-500">Lat: {location.lat.toFixed(6)}, Lng: {location.lng.toFixed(6)}</p>
                    {/* Radius Calculation Demo */}
                    {(() => {
                      const dist = Math.round(getDistance(location.lat, location.lng, companyLat, companyLng));
                      const isInside = dist <= 150;
                      return (
                        <p className={`text-xs font-bold mt-1 ${isInside ?'text-emerald-600' :'text-red-600'}`}>
                          Jarak ke Perusahaan (Target): {dist} meter {isInside ?'(Sesuai Radius)' :'(Di luar Radius)'}
                        </p>
                      );
                    })()}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 font-medium">Klik tombol untuk mendeteksi lokasi Anda saat ini.</p>
                )}
              </div>
            </div>
          </div>

          {/* Photo Section */}
          <div className="space-y-3">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">2. Foto Bukti Kunjungan (Wajib)</label>
            <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-slate-300 rounded-[var(--ui-radius-small)] cursor-pointer hover:border-[var(--ui-primary)] hover:bg-slate-50 transition-all overflow-hidden relative group">
              {photo ? (
                <>
                  <img src={photo} alt="Preview" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <p className="text-white font-bold text-sm flex items-center gap-2"><Camera size={16}/> Ganti Foto</p>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center gap-2 text-slate-400">
                  <Camera size={32} />
                  <span className="text-sm font-bold text-slate-600">Ambil Foto / Pilih dari Galeri</span>
                  <span className="text-xs">Foto akan otomatis disimpan (Simulasi GDrive)</span>
                </div>
              )}
              <input type="file" className="hidden" accept="image/*" capture="environment" onChange={handlePhotoUpload} />
            </label>
          </div>

          {/* Notes Section */}
          <div className="space-y-3">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">3. Catatan Kunjungan (Opsional)</label>
            <textarea 
              rows="3" 
              value={notes} 
              onChange={e => setNotes(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border-none rounded-[var(--ui-radius-small)] text-sm font-medium focus:outline-none focus:border-[var(--ui-primary)] resize-none"
              placeholder="Catatan mengenai perkembangan siswa, kendala, dll..."
            />
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <Button type="submit" disabled={isSubmitting || !location || !photo} className="w-full sm:w-auto">
              {isSubmitting ?'Menyimpan...' :'Submit Check-in'}
            </Button>
          </div>
        </form>
      )}
      {toast && (
        <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-[var(--ui-radius-small)] shadow-lg font-medium text-sm flex items-center gap-2 animate-in slide-in-from-bottom-5 text-white z-[100] ${toast.type ==='error' ?'bg-red-600' :'bg-emerald-600'}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
