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
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white rounded-[var(--ui-radius-card)] shadow-2xl border border-slate-100/80 w-full max-w-md max-h-[92vh] flex flex-col overflow-hidden transform transition-all animate-in zoom-in-95 duration-200">
        
        {/* Dynamic Theme Banner Header */}
        <div className="bg-white px-5 py-6 sm:px-8 sm:py-8 text-slate-800 text-center relative shrink-0 border-b border-slate-100/60">
          <button
            type="button"
            onClick={handleDismiss}
            title="Nanti Saja"
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-all cursor-pointer"
          >
            <X size={16} />
          </button>
          
          <div className="flex flex-col items-center justify-center relative z-10">
            <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-slate-50 mb-4 shadow-sm border border-slate-100">
              <ShieldAlert size={28} className="text-slate-700" />
            </div>

            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">Ubah Kata Sandi</h2>
            <p className="text-sm font-medium text-slate-500 mt-2 max-w-sm mx-auto leading-relaxed">
              Silakan perbarui kata sandi bawaan Anda ke kata sandi yang lebih aman untuk melindungi akun Anda.
            </p>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-8 space-y-5 overflow-y-auto custom-scrollbar bg-white">

          {errorMessage && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-[var(--ui-radius-small)] text-xs font-bold animate-in shake duration-200 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-600 shrink-0"></span>
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-[11px] font-black uppercase tracking-wider text-slate-700 block mb-1.5">
                Kata Sandi Baru <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Masukkan kata sandi baru (6-12 karakter)"
                  required
                  className="w-full bg-slate-50/80 border border-slate-200 rounded-[var(--ui-radius-small)] px-3.5 py-2.5 pr-10 text-xs sm:text-sm font-semibold text-slate-800 focus:bg-white focus:border-[var(--ui-primary)] focus:ring-2 focus:ring-[var(--ui-primary)]/20 outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer p-1"
                >
                  {showPw ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-black uppercase tracking-wider text-slate-700 block mb-1.5">
                Konfirmasi Kata Sandi Baru <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showConfirmPw ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Ulangi kata sandi baru"
                  required
                  className="w-full bg-slate-50/80 border border-slate-200 rounded-[var(--ui-radius-small)] px-3.5 py-2.5 pr-10 text-xs sm:text-sm font-semibold text-slate-800 focus:bg-white focus:border-[var(--ui-primary)] focus:ring-2 focus:ring-[var(--ui-primary)]/20 outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPw(!showConfirmPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer p-1"
                >
                  {showConfirmPw ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            <div className="pt-4 flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={handleDismiss}
                className="w-full sm:w-auto px-5 py-3 bg-white hover:bg-slate-50 active:scale-95 text-slate-600 font-bold rounded-xl transition-all text-sm flex items-center justify-center gap-2 cursor-pointer border border-slate-200"
              >
                <span>Nanti Saja</span>
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 bg-[var(--ui-primary)] hover:opacity-90 active:scale-95 text-white font-black py-3 px-5 rounded-xl shadow-md shadow-[var(--ui-primary)]/20 transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50 cursor-pointer border-none"
              >
                {isLoading ? (
                  <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                ) : (
                  <>
                    <span>Simpan Sandi Baru</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
