import React, { useState } from 'react';
import { ChevronLeft, X, Info, MessageSquare, Mail, Check, ArrowRight, ArrowUpRight, HelpCircle, Clock } from 'lucide-react';

export const PublicHelpModal = ({ isOpen, onClose, primaryColor, contactPhone, contactEmail, appName, getWaLink, lang }) => {
  const [openFaqIndex, setOpenFaqIndex] = useState(0);

  if (!isOpen) return null;

  const currentLang = lang || (() => {
    try {
      return localStorage.getItem('kurmon_lang') || 'ID';
    } catch {
      return 'ID';
    }
  })();
  const t = (idText, enText) => currentLang === 'EN' ? enText : idText;

  const faqs = [
    {
      q: t("Bagaimana cara masuk ke sistem?", "How do I sign in to the portal?"),
      a: t(
        "Klik tombol \"Masuk Akun\" di pojok kanan atas halaman (atau di menu bar mobile), lalu login menggunakan username dan password resmi dari administrator sekolah.",
        "Click the \"Sign In\" button at the top right (or in the mobile menu), then use your official credentials provided by the school administrator."
      )
    },
    {
      q: t("Lupa password atau tidak bisa login?", "Forgot password or unable to log in?"),
      a: t(
        "Silakan hubungi administrator IT sekolah atau wali kelas Anda untuk mereset password akun Anda.",
        "Please contact the school IT administrator or your homeroom teacher to reset your password."
      )
    },
    {
      q: t("Apakah jadwal pelajaran real-time?", "Is the class schedule updated in real-time?"),
      a: t(
        "Ya, setiap perubahan jadwal piket, guru pengganti, atau perubahan kelas yang dilakukan oleh admin kurikulum akan langsung diperbarui seketika di portal ini.",
        "Yes, every change made to duties, substitute teachers, or class schedules by the curriculum admin updates immediately on this portal."
      )
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200 p-0 md:p-4 text-left">
      {/* Backdrop overlay listener to close */}
      <div className="absolute inset-0 z-0 cursor-pointer" onClick={onClose}></div>

      {/* Sheet/Modal Drawer */}
      <div className="bg-white rounded-t-2xl sm:rounded-2xl md:rounded-3xl w-full max-w-lg md:max-w-xl overflow-hidden shadow-2xl border border-slate-100 flex flex-col animate-in slide-in-from-bottom md:zoom-in-95 duration-200 ease-out z-10 max-h-[85vh]">
        {/* iOS/Android drag handle bar - hidden on desktop */}
        <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto my-3 shrink-0 md:hidden"></div>

        {/* Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-100/80 shadow-2xs">
              <HelpCircle size={19} strokeWidth={2.2} />
            </div>
            <div className="flex flex-col text-left">
              <span className="font-black text-slate-800 text-[15px] tracking-tight leading-snug">
                {t("Hubungi & Bantuan", "Contact & Support")}
              </span>
              <p className="text-[11px] font-medium text-slate-400 leading-tight">
                {t('Informasi akses akun, FAQ & kontak resmi sekolah', 'Account access info, FAQ & official school contacts')}
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="cursor-pointer flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition-colors border-none"
            aria-label="Tutup"
          >
            <X size={16} strokeWidth={2.5} />
          </button>
        </div>

        {/* Body content scroll area */}
        <div className="px-5 sm:px-6 py-4 space-y-4 overflow-y-auto custom-scrollbar select-text max-h-[60vh]">
          <div className="bg-emerald-50/70 border border-emerald-200/60 rounded-xl p-3 text-emerald-950 flex items-start gap-2.5 shadow-2xs">
            <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
              <Info size={13} strokeWidth={2.4} />
            </div>
            <p className="leading-relaxed font-semibold text-[11.5px] text-emerald-900 text-left">
              {t(
                "Butuh bantuan untuk masuk ke sistem atau memiliki pertanyaan seputar KBM? Silakan cek FAQ atau hubungi admin di bawah.",
                "Need assistance signing in to the system or have academic questions? Please check the FAQ or contact the school admin below."
              )}
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-0.5">
              {t("Pertanyaan Umum (FAQ)", "Frequently Asked Questions (FAQ)")}
            </p>
            <div className="space-y-1.5">
              {faqs.map((faq, idx) => {
                const isOpen = openFaqIndex === idx;
                return (
                  <div 
                    key={idx} 
                    className={`border rounded-xl transition-all overflow-hidden ${
                      isOpen ? 'border-emerald-200/90 bg-emerald-50/20 shadow-2xs' : 'border-slate-200/80 bg-slate-50/40 hover:bg-slate-50 hover:border-slate-300'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                      className="w-full px-3.5 py-2.5 flex items-center justify-between bg-transparent border-none text-slate-800 font-bold text-[12px] cursor-pointer"
                    >
                      <span className="text-left leading-tight pr-2">{faq.q}</span>
                      <ChevronLeft 
                        size={14} 
                        className={`text-slate-400 shrink-0 transition-transform duration-200 ${isOpen ? '-rotate-90 text-emerald-600' : 'rotate-180'}`} 
                      />
                    </button>
                    {isOpen && (
                      <div className="px-3.5 pb-3 pt-0 text-[11.5px] font-medium text-slate-600 leading-relaxed border-t border-emerald-100/60 bg-white">
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-2 pt-1">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-0.5">
              {t("Kontak Langsung Admin", "Direct Admin Contact")}
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {contactPhone && (
                <a 
                  href={getWaLink()} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 p-3 rounded-xl border border-emerald-200/80 bg-emerald-50/30 hover:bg-emerald-50/80 hover:border-emerald-300 transition-all text-slate-800 no-underline shadow-2xs group"
                >
                  <div className="w-8.5 h-8.5 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                    <MessageSquare size={16} />
                  </div>
                  <div className="min-w-0 flex-1 text-left">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-[12px] text-slate-800 leading-none">WhatsApp Admin</span>
                      <ArrowUpRight size={12} className="text-emerald-600 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                    </div>
                    <p className="text-[10.5px] font-mono font-bold text-emerald-700 truncate mt-1.5 leading-none">{contactPhone}</p>
                  </div>
                </a>
              )}

              {contactEmail && (
                <a 
                  href={`mailto:${contactEmail}`}
                  className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200/90 bg-white hover:bg-slate-50 hover:border-slate-300 transition-all text-slate-800 no-underline shadow-2xs group"
                >
                  <div className="w-8.5 h-8.5 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                    <Mail size={16} />
                  </div>
                  <div className="min-w-0 flex-1 text-left">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-[12px] text-slate-800 leading-none">Email Layanan</span>
                      <ArrowUpRight size={12} className="text-slate-400 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                    </div>
                    <p className="text-[10.5px] font-mono font-bold text-slate-500 truncate mt-1.5 leading-none">{contactEmail}</p>
                  </div>
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Sheet Footer */}
        <div className="px-5 sm:px-6 py-3 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400">
            <Clock size={12} className="text-slate-400 shrink-0" />
            <span>{t('Senin – Jumat (07.00 – 16.00 WIB)', 'Mon – Fri (07.00 – 16.00 WIB)')}</span>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="bg-slate-200/90 hover:bg-slate-300 text-slate-700 rounded-xl cursor-pointer border-none transition-all px-4 py-2 text-xs font-bold shadow-2xs"
          >
            {t("Tutup", "Close")}
          </button>
        </div>
      </div>
    </div>
  );
};

