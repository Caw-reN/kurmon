import React, { useState, useEffect } from 'react';
import { ShieldAlert, KeyRound, Eye, EyeOff, Lock, Clock, X } from 'lucide-react';
import { writeSessionUser } from '../../utils/adminHelpers.js';

export default function DefaultPasswordModal({ currentUser, setCurrentUser, showNotification }) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isDismissed, setIsDismissed] = useState(() => {
    try {
      return sessionStorage.getItem('skip_default_pw_modal') === 'true';
    } catch {
      return false;
    }
  });

  // Whenever currentUser user identity changes (new login session), ensure modal pops up if password is default
  useEffect(() => {
    if (currentUser) {
      const userKey = String(currentUser.code || currentUser.username || currentUser.id || '');
      const lastPromptedUser = sessionStorage.getItem('last_prompted_pw_user');
      if (lastPromptedUser !== userKey) {
        sessionStorage.removeItem('skip_default_pw_modal');
        sessionStorage.setItem('last_prompted_pw_user', userKey);
        setIsDismissed(false);
      }
    }
  }, [currentUser?.code, currentUser?.username, currentUser?.id]);

  // Only show if user exists AND is using default password AND hasn't dismissed for current session
  const isDefaultPassword = currentUser && (currentUser.isDefaultPassword === true || currentUser.hasChangedPassword === false);

  if (!isDefaultPassword || isDismissed) return null;

  const handleDismiss = () => {
    setIsDismissed(true);
    try {
      sessionStorage.setItem('skip_default_pw_modal', 'true');
    } catch (e) {
      console.error(e);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    const pw = newPassword.trim();
    const confirmPw = confirmPassword.trim();

    if (!pw) {
      setErrorMessage('Kata sandi baru tidak boleh kosong!');
      return;
    }

    if (pw.length < 6 || pw.length > 12) {
      setErrorMessage('Panjang kata sandi harus antara 6 hingga 12 karakter!');
      return;
    }

    const usernameStr = String(currentUser?.code || currentUser?.username || currentUser?.id || '').trim().toLowerCase();
    if (pw.toLowerCase() === usernameStr || pw === '123' || pw === '123456' || pw === 'admin123') {
      setErrorMessage('Kata sandi terlalu mudah ditebak! Silakan buat kata sandi lain yang lebih aman.');
      return;
    }

    if (pw !== confirmPw) {
      setErrorMessage('Konfirmasi kata sandi tidak cocok!');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentUser?.authToken || ''}`
        },
        body: JSON.stringify({ newPassword: pw })
      });

      const data = await response.json();
      if (data.ok) {
        const updatedUser = {
          ...currentUser,
          isDefaultPassword: false,
          hasChangedPassword: true
        };
        writeSessionUser(updatedUser);
        if (setCurrentUser) setCurrentUser(updatedUser);

        if (showNotification) {
          showNotification(data.message || 'Kata sandi berhasil diperbarui!', 'success');
        }
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setErrorMessage(data.message || 'Gagal mengubah kata sandi. Silakan coba lagi.');
      }
    } catch (err) {
      console.error('DefaultPasswordModal error:', err);
      setErrorMessage('Terjadi kesalahan jaringan saat mengubah kata sandi.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white rounded-[var(--ui-radius-card)] shadow-xs border border-slate-100 w-full max-w-md max-h-[92vh] flex flex-col overflow-hidden transform transition-all">
        
        {/* Mobile-Optimized Header Visual Decorative Banner */}
        <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 px-4 py-4 sm:px-6 sm:py-5 text-white text-center relative overflow-hidden shrink-0">
          <button
            type="button"
            onClick={handleDismiss}
            title="Nanti Saja"
            className="absolute top-2.5 right-2.5 sm:top-3.5 sm:right-3.5 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
          
          <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-white/10 rounded-full blur-xl pointer-events-none"></div>

          {/* Header Content with Mobile Responsive Flex */}
          <div className="flex flex-col items-center justify-center">
            <div className="inline-flex items-center justify-center w-11 h-11 sm:w-13 sm:h-13 rounded-[var(--ui-radius-small)] sm:rounded-[var(--ui-radius-card)] bg-white/20 backdrop-blur-md mb-2 shadow-inner border border-white/30">
              <ShieldAlert size={22} className="text-white animate-pulse" />
            </div>

            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-[var(--ui-radius-pill)] text-[10px] font-bold bg-black/15 text-amber-100 border border-white/20 mb-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-300 animate-ping"></span>
              <span>Imbauan Keamanan Akun</span>
            </div>

            <h2 className="text-base sm:text-lg font-black tracking-tight text-white">Ubah Kata Sandi Bawaan</h2>
            <p className="text-[11px] font-medium text-amber-100/90 mt-0.5 max-w-xs mx-auto">
              Akun Anda saat ini masih menggunakan kata sandi default.
            </p>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 space-y-3.5 sm:space-y-4 overflow-y-auto">
          {/* Warning Info Box */}
          <div className="bg-gradient-to-r from-amber-50 to-orange-50/60 border border-amber-200/80 rounded-[var(--ui-radius-small)] p-3 flex items-start gap-2.5 shadow-sm">
            <div className="w-7 h-7 rounded-[var(--ui-radius-small)] bg-amber-500/15 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
              <KeyRound size={16} />
            </div>
            <p className="text-[11px] font-semibold text-amber-950 leading-relaxed">
              Demi keamanan akun &amp; data sekolah, silakan perbarui kata sandi Anda ke kata sandi baru yang lebih aman.
            </p>
          </div>

          {errorMessage && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-[var(--ui-radius-small)] text-xs font-bold animate-in shake duration-200 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0"></span>
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-3.5">
            <div>
              <label className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-slate-600 block mb-1">
                Kata Sandi Baru <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Masukkan kata sandi baru (6-12 karakter)"
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-[var(--ui-radius-small)] px-3.5 py-2.5 pr-10 text-xs sm:text-sm font-semibold text-slate-800 focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPw ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            <div>
              <label className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-slate-600 block mb-1">
                Konfirmasi Kata Sandi Baru <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showConfirmPw ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Ulangi kata sandi baru"
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-[var(--ui-radius-small)] px-3.5 py-2.5 pr-10 text-xs sm:text-sm font-semibold text-slate-800 focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPw(!showConfirmPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showConfirmPw ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            <div className="pt-1.5 flex flex-col sm:flex-row gap-2">
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold py-2.5 sm:py-3 px-4 rounded-[var(--ui-radius-small)] shadow-sm shadow-amber-500/20 transition-all flex items-center justify-center gap-2 text-xs sm:text-sm disabled:opacity-50 cursor-pointer"
              >
                {isLoading ? (
                  <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                ) : (
                  <>
                    <Lock size={15} />
                    <span>Simpan &amp; Terapkan</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={handleDismiss}
                className="w-full sm:w-auto px-4 py-2.5 sm:py-3 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 font-bold rounded-[var(--ui-radius-small)] transition-all text-xs sm:text-sm flex items-center justify-center gap-1.5 cursor-pointer border border-slate-200/80"
              >
                <Clock size={15} />
                <span>Nanti Saja</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
