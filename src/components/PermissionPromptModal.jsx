import { useState, useEffect, useCallback } from 'react';
import { 
  MapPin, 
  Bell, 
  ShieldCheck, 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  ChevronRight, 
  HelpCircle,
  Smartphone,
  ExternalLink,
  Sparkles
} from 'lucide-react';
import { requestPushPermissionAndSubscribe } from '../utils/pushUtils.js';

const SESSION_KEY = "school_schedule_session_v1";

export default function PermissionPromptModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifStatus, setNotifStatus] = useState('default'); // 'default', 'granted', 'denied', 'unsupported'
  const [geoStatus, setGeoStatus] = useState('prompt'); // 'prompt', 'granted', 'denied', 'unsupported'
  const [isRequesting, setIsRequesting] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [justCompleted, setJustCompleted] = useState(false);

  // Periksa apakah pengguna sedang login (hanya tampil jika sudah ada sesi login)
  const isUserLoggedIn = () => {
    try {
      const sess = sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY);
      if (!sess) return false;
      const parsed = JSON.parse(sess);
      return !!(parsed && (parsed.authToken || parsed.user || parsed.username || parsed.code));
    } catch {
      return false;
    }
  };

  // Cek status izin saat ini
  const checkCurrentPermissions = useCallback(async () => {
    // 1. Notifikasi
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotifStatus(Notification.permission);
    } else {
      setNotifStatus('unsupported');
    }

    // 2. Geolocation
    if (typeof window !== 'undefined' && 'geolocation' in navigator) {
      if (localStorage.getItem('kurmon_location_granted') === 'true') {
        setGeoStatus('granted');
      } else if (navigator.permissions && navigator.permissions.query) {
        try {
          const res = await navigator.permissions.query({ name: 'geolocation' });
          setGeoStatus(res.state); // 'granted', 'prompt', 'denied'
          res.onchange = () => setGeoStatus(res.state);
        } catch {
          setGeoStatus('prompt');
        }
      } else {
        setGeoStatus('prompt');
      }
    } else {
      setGeoStatus('unsupported');
    }
  }, []);

  useEffect(() => {
    checkCurrentPermissions();

    // Event listener custom agar modal bisa dibuka kapan saja dari menu/profil jika diinginkan
    const handleManualOpen = () => {
      checkCurrentPermissions();
      setIsOpen(true);
    };
    window.addEventListener('open-permission-modal', handleManualOpen);

    // Evaluasi apakah modal harus muncul otomatis saat aplikasi dibuka
    const timer = setTimeout(async () => {
      if (!isUserLoggedIn()) return;

      // Cek apakah baru saja ditutup dalam 24 jam terakhir
      const lastDismissed = localStorage.getItem('kurmon_permission_dismissed_at');
      if (lastDismissed && (Date.now() - parseInt(lastDismissed, 10)) < 24 * 60 * 60 * 1000) {
        return;
      }

      // Cek status notifikasi & lokasi
      const currentNotif = typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'granted';
      let currentGeo = 'prompt';

      if (localStorage.getItem('kurmon_location_granted') === 'true') {
        currentGeo = 'granted';
      } else if (navigator.permissions && navigator.permissions.query) {
        try {
          const res = await navigator.permissions.query({ name: 'geolocation' });
          currentGeo = res.state;
        } catch {
          currentGeo = 'prompt';
        }
      }

      // Jika salah satu belum diizinkan, buka modal
      const isNotifGranted = currentNotif === 'granted' || currentNotif === 'unsupported';
      const isGeoGranted = currentGeo === 'granted' || currentGeo === 'unsupported';

      if (!isNotifGranted || !isGeoGranted) {
        setIsOpen(true);
      }
    }, 1200);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('open-permission-modal', handleManualOpen);
    };
  }, [checkCurrentPermissions]);

  // Handler untuk mengizinkan notifikasi
  const handleRequestNotification = async () => {
    if (!('Notification' in window)) return 'unsupported';
    try {
      const p = await Notification.requestPermission();
      setNotifStatus(p);
      if (p === 'granted') {
        try {
          await requestPushPermissionAndSubscribe();
        } catch (e) {
          console.log('Push subscribe info:', e?.message);
        }
      }
      return p;
    } catch (err) {
      console.warn('Gagal meminta izin notifikasi:', err);
      return 'denied';
    }
  };

  // Handler untuk mengizinkan geolokasi
  const handleRequestGeolocation = () => {
    return new Promise((resolve) => {
      if (!('geolocation' in navigator)) {
        setGeoStatus('unsupported');
        resolve('unsupported');
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setGeoStatus('granted');
          localStorage.setItem('kurmon_location_granted', 'true');
          resolve('granted');
        },
        (err) => {
          if (err.code === 1) { // PERMISSION_DENIED
            setGeoStatus('denied');
            resolve('denied');
          } else {
            // Posisi gagal karena timeout / GPS mati tapi izin bisa jadi sudah diberikan
            localStorage.setItem('kurmon_location_granted', 'true');
            setGeoStatus('granted');
            resolve('granted');
          }
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
      );
    });
  };

  // Handler utama: Aktifkan Semua Izin
  const handleRequestAll = async () => {
    setIsRequesting(true);
    try {
      // 1. Minta Notifikasi jika belum granted
      let newNotif = notifStatus;
      if (notifStatus !== 'granted') {
        newNotif = await handleRequestNotification();
      }

      // 2. Minta Lokasi jika belum granted
      let newGeo = geoStatus;
      if (geoStatus !== 'granted') {
        newGeo = await handleRequestGeolocation();
      }

      // 3. Evaluasi hasil
      const allDone = (newNotif === 'granted' || newNotif === 'unsupported') && 
                      (newGeo === 'granted' || newGeo === 'unsupported');

      if (allDone) {
        setJustCompleted(true);
        setTimeout(() => {
          setIsOpen(false);
          setJustCompleted(false);
        }, 1500);
      } else if (newNotif === 'denied' || newGeo === 'denied') {
        setShowGuide(true);
      }
    } finally {
      setIsRequesting(false);
    }
  };

  // Tutup sementara
  const handleDismiss = () => {
    setIsOpen(false);
    localStorage.setItem('kurmon_permission_dismissed_at', Date.now().toString());
  };

  if (!isOpen) return null;

  const isAllGranted = (notifStatus === 'granted' || notifStatus === 'unsupported') && 
                       (geoStatus === 'granted' || geoStatus === 'unsupported');
  const hasDenied = notifStatus === 'denied' || geoStatus === 'denied';

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-[var(--ui-radius-card)] max-w-md w-full border border-slate-200/90 shadow-2xl overflow-hidden p-5 sm:p-6 text-slate-800 flex flex-col gap-4 relative animate-in zoom-in-95 duration-200">
        
        {/* Tombol Tutup / Nanti */}
        <button
          type="button"
          onClick={handleDismiss}
          className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          title="Tutup / Nanti Saja"
        >
          <X size={18} />
        </button>

        {/* Header Dialog */}
        <div className="flex items-start gap-3.5 pr-6">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-500/20 shadow-xs">
            {justCompleted || isAllGranted ? (
              <CheckCircle2 size={26} className="text-emerald-600 animate-bounce" />
            ) : (
              <ShieldCheck size={26} className="text-emerald-600" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-100/70 text-emerald-800 border border-emerald-200/60">
                Akses PWA
              </span>
              <span className="text-xs font-semibold text-slate-400">Kurmon</span>
            </div>
            <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight mt-0.5">
              {justCompleted || isAllGranted ? 'Akses Berhasil Diaktifkan!' : 'Izinkan Akses Lokasi & Notifikasi'}
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">
              {justCompleted || isAllGranted 
                ? 'Semua fitur presensi GPS dan pemberitahuan agenda siap digunakan secara maksimal.'
                : 'Agar aplikasi dapat mendeteksi radius absensi kehadiran dan mengirim pemberitahuan jadwal KBM, izinkan kedua fitur berikut.'}
            </p>
          </div>
        </div>

        {/* Daftar Izin (Lokasi & Notifikasi) */}
        <div className="flex flex-col gap-2.5 my-1">
          {/* 1. Izin Lokasi GPS */}
          <div className={`p-3.5 rounded-xl border transition-all flex items-start justify-between gap-3 ${
            geoStatus === 'granted' 
              ? 'bg-emerald-50/70 border-emerald-200/80 text-emerald-950' 
              : geoStatus === 'denied' 
                ? 'bg-rose-50/70 border-rose-200/80 text-rose-950' 
                : 'bg-slate-50 border-slate-200/80 text-slate-800'
          }`}>
            <div className="flex items-start gap-3 min-w-0">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                geoStatus === 'granted' 
                  ? 'bg-emerald-100 text-emerald-700' 
                  : geoStatus === 'denied' 
                    ? 'bg-rose-100 text-rose-700' 
                    : 'bg-white text-slate-600 border border-slate-200 shadow-2xs'
              }`}>
                <MapPin size={18} strokeWidth={2.3} />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-black leading-tight flex items-center gap-1.5">
                  Lokasi Presisi (GPS)
                  {geoStatus === 'granted' && <CheckCircle2 size={13} className="text-emerald-600" />}
                </h4>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5 leading-snug">
                  Diperlukan untuk validasi jarak radius absensi dan pemantauan KBM/PKL.
                </p>
              </div>
            </div>

            <div className="shrink-0 pt-0.5">
              {geoStatus === 'granted' ? (
                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-emerald-200/80 text-emerald-800">
                  Aktif
                </span>
              ) : geoStatus === 'denied' ? (
                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-rose-200 text-rose-800">
                  Diblokir
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleRequestGeolocation}
                  disabled={isRequesting}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 active:scale-95 shadow-2xs cursor-pointer touch-manipulation"
                >
                  Izinkan
                </button>
              )}
            </div>
          </div>

          {/* 2. Izin Notifikasi Push */}
          <div className={`p-3.5 rounded-xl border transition-all flex items-start justify-between gap-3 ${
            notifStatus === 'granted' 
              ? 'bg-emerald-50/70 border-emerald-200/80 text-emerald-950' 
              : notifStatus === 'denied' 
                ? 'bg-rose-50/70 border-rose-200/80 text-rose-950' 
                : 'bg-slate-50 border-slate-200/80 text-slate-800'
          }`}>
            <div className="flex items-start gap-3 min-w-0">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                notifStatus === 'granted' 
                  ? 'bg-emerald-100 text-emerald-700' 
                  : notifStatus === 'denied' 
                    ? 'bg-rose-100 text-rose-700' 
                    : 'bg-white text-slate-600 border border-slate-200 shadow-2xs'
              }`}>
                <Bell size={18} strokeWidth={2.3} />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-black leading-tight flex items-center gap-1.5">
                  Notifikasi & Pengumuman
                  {notifStatus === 'granted' && <CheckCircle2 size={13} className="text-emerald-600" />}
                </h4>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5 leading-snug">
                  Menerima pemberitahuan jadwal pelajaran, pengumuman sekolah, dan pengingat jurnal.
                </p>
              </div>
            </div>

            <div className="shrink-0 pt-0.5">
              {notifStatus === 'granted' ? (
                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-emerald-200/80 text-emerald-800">
                  Aktif
                </span>
              ) : notifStatus === 'denied' ? (
                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-rose-200 text-rose-800">
                  Diblokir
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleRequestNotification}
                  disabled={isRequesting}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 active:scale-95 shadow-2xs cursor-pointer touch-manipulation"
                >
                  Izinkan
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Panduan jika diblokir oleh browser */}
        {(hasDenied || showGuide) && (
          <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl text-amber-900 text-xs flex flex-col gap-1.5 animate-in fade-in duration-200">
            <div className="flex items-center gap-1.5 font-bold text-amber-950">
              <AlertTriangle size={14} className="text-amber-600 shrink-0" />
              <span>Cara Membuka Izin yang Terblokir:</span>
            </div>
            <ol className="list-decimal list-inside pl-1 text-[11px] text-amber-800 font-medium space-y-1">
              <li>Klik ikon <strong>🔒 Gembok / Setelan Situs</strong> di sebelah kiri URL browser (atau menu setelan PWA).</li>
              <li>Cari opsi <strong>Lokasi</strong> dan <strong>Notifikasi</strong>, lalu ubah statusnya menjadi <strong>Izinkan (Allow)</strong>.</li>
              <li>Tutup dan muat ulang aplikasi untuk menerapkan izin baru.</li>
            </ol>
          </div>
        )}

        {/* Tombol Aksi */}
        <div className="flex flex-col gap-2 pt-1">
          {isAllGranted ? (
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="w-full py-2.5 px-4 rounded-[var(--ui-radius-control)] bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white text-xs font-black shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer touch-manipulation"
            >
              <CheckCircle2 size={16} />
              Lanjutkan ke Aplikasi
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={handleRequestAll}
                disabled={isRequesting}
                className="w-full py-2.5 px-4 rounded-[var(--ui-radius-control)] bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 active:scale-[0.98] text-white text-xs font-black shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer touch-manipulation disabled:opacity-60"
              >
                {isRequesting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Menghubungkan Perangkat...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={15} />
                    <span>Aktifkan Semua Izin</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleDismiss}
                className="w-full py-1.5 text-center text-xs font-bold text-slate-400 hover:text-slate-600 cursor-pointer transition-colors"
              >
                Nanti Saja
              </button>
            </>
          )}
        </div>

      </div>
    </div>
  );
}
