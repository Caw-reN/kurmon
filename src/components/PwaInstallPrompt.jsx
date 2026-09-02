import { useState, useEffect } from 'react';
import { Download, X, Share, PlusSquare, Smartphone, Sparkles } from 'lucide-react';
import { Button } from './ui.jsx';

export default function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  useEffect(() => {
    // 1. Cek apakah aplikasi sudah berjalan dalam mode PWA / Standalone
    const checkStandalone = 
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true ||
      document.referrer.includes('android-app://');

    setIsStandalone(checkStandalone);
    if (checkStandalone) return;

    // 2. Cek apakah perangkat adalah iOS (iPhone / iPad)
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent) && !window.MSStream;
    setIsIOS(isIosDevice);

    // 3. Cek apakah user baru saja menutup prompt dalam 3 hari terakhir
    const dismissedTime = localStorage.getItem('pwa_prompt_dismissed');
    if (dismissedTime && (Date.now() - parseInt(dismissedTime, 10)) < 3 * 24 * 60 * 60 * 1000) {
      return;
    }

    // 4. Tangkap event beforeinstallprompt untuk Android / Windows / Chrome / Edge
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Tampilkan popup setelah delay kecil agar tidak mengganggu initial loading
      setTimeout(() => setShowPrompt(true), 2500);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Untuk iOS Safari, tampilkan prompt setelah delay jika belum terpasang
    if (isIosDevice && !checkStandalone) {
      const timer = setTimeout(() => setShowPrompt(true), 3500);
      return () => clearTimeout(timer);
    }

    // Tangkap jika aplikasi berhasil dipasang
    const handleAppInstalled = () => {
      setShowPrompt(false);
      setDeferredPrompt(null);
      localStorage.setItem('pwa_installed', 'true');
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSGuide(true);
      return;
    }

    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setShowIOSGuide(false);
    localStorage.setItem('pwa_prompt_dismissed', Date.now().toString());
  };

  if (isStandalone || !showPrompt) return null;

  return (
    <div className="fixed bottom-4 left-3 right-3 sm:left-auto sm:right-5 sm:w-96 z-50 animate-in slide-in-from-bottom-6 fade-in duration-300">
      <div className="bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-[var(--ui-radius-card)] p-4 shadow-xl text-slate-800 flex flex-col gap-3 relative">
        
        {/* Tombol Tutup Silang */}
        <button
          type="button"
          onClick={handleDismiss}
          className="absolute top-3 right-3 p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          title="Tutup"
        >
          <X size={16} />
        </button>

        {/* Konten Banner Pasang */}
        <div className="flex items-start gap-3 pr-6">
          <div className="w-12 h-12 rounded-[var(--ui-radius-small)] bg-emerald-600 p-0.5 shrink-0 shadow-xs flex items-center justify-center overflow-hidden">
            <img 
              src="/icon-192x192.png" 
              alt="Logo Aplikasi" 
              className="w-full h-full object-cover rounded-[var(--ui-radius-small)]"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = '/favicon.svg';
              }}
            />
          </div>
          
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h4 className="text-xs font-black text-slate-900 leading-tight">Pasang KG2School</h4>
              <span className="px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-extrabold text-[9px] uppercase tracking-wider">
                App
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium mt-1 leading-snug">
              Akses cepat, hemat kuota, dan pengalaman layar penuh tanpa browser bar.
            </p>
          </div>
        </div>

        {/* Panduan Khusus iOS jika dibuka di iPhone/iPad */}
        {showIOSGuide ? (
          <div className="p-3 bg-slate-50 rounded-[var(--ui-radius-small)] border border-slate-200 text-[11px] text-slate-700 space-y-2 animate-in fade-in duration-200">
            <p className="font-bold flex items-center gap-1.5 text-slate-800">
              <Smartphone size={13} className="text-emerald-600" />
              Cara Pasang di iPhone / iPad:
            </p>
            <ol className="list-decimal list-inside space-y-1 text-slate-600 pl-1 font-medium">
              <li>Ketuk tombol <strong className="inline-flex items-center gap-0.5 text-slate-800"><Share size={11} /> Bagikan</strong> di Safari.</li>
              <li>Gulir ke bawah dan pilih <strong className="inline-flex items-center gap-0.5 text-slate-800"><PlusSquare size={11} /> Tambah ke Layar Utama</strong>.</li>
              <li>Ketuk <strong className="text-emerald-700 font-bold">Tambah</strong> di pojok kanan atas.</li>
            </ol>
            <div className="text-right pt-1">
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="text-[10.5px] font-bold text-emerald-600 hover:underline cursor-pointer"
              >
                Mengerti
              </button>
            </div>
          </div>
        ) : (
          /* Tombol Aksi */
          <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100">
            <button
              type="button"
              onClick={handleDismiss}
              className="text-[11px] font-bold text-slate-500 hover:text-slate-700 px-3 py-1.5 rounded-[var(--ui-radius-small)] hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Nanti Saja
            </button>

            <Button
              type="button"
              size="sm"
              onClick={handleInstallClick}
              className="text-xs font-black px-4 py-1.5 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs rounded-[var(--ui-radius-small)] cursor-pointer active:scale-95 transition-all"
            >
              <Download size={13} />
              <span>{isIOS ? 'Cara Pasang' : 'Pasang Aplikasi'}</span>
            </Button>
          </div>
        )}

      </div>
    </div>
  );
}
