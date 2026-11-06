import React, { useState } from 'react';
import { ChevronDown, X, Info, MessageSquare, Mail, Check, ArrowRight, ArrowUpRight, HelpCircle, Clock } from 'lucide-react';

const InstagramIcon = ({ size = 14, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
  </svg>
);

const FacebookIcon = ({ size = 14, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
  </svg>
);

const YoutubeIcon = ({ size = 14, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33 2.78 2.78 0 0 0 1.94 2c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.33 29 29 0 0 0-.46-5.33z"></path>
    <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" fill="white"></polygon>
  </svg>
);

export const PublicHelpModal = ({ isOpen, onClose, primaryColor, contactPhone, contactEmail, appName, getWaLink, lang, appSettings }) => {
  const [openFaqIndex, setOpenFaqIndex] = useState(0);

  if (!isOpen) return null;

  const getAbsoluteUrl = (url) => {
    if (!url) return '';
    const trimmed = String(url).trim();
    if (/^https?:\/\//i.test(trimmed)) {
      return trimmed;
    }
    return `https://${trimmed}`;
  };

  const currentLang = lang || (() => {
    try {
      return localStorage.getItem('kurmon_lang') || 'ID';
    } catch {
      return 'ID';
    }
  })();
  const t = (idText, enText) => currentLang === 'EN' ? enText : idText;

  const phone = contactPhone || appSettings?.contactPhone || '085117531733';
  const email = contactEmail || appSettings?.contactEmail || 'info@smkkg2.sch.id';

  const resolvedWaLink = typeof getWaLink === 'function' ? getWaLink() : (() => {
    const cleanPhone = String(phone).replace(/\D/g, '');
    const waNumber = cleanPhone.startsWith('0') ? '62' + cleanPhone.slice(1) : cleanPhone;
    return `https://wa.me/${waNumber}?text=Halo%20Admin%2C%20saya%20butuh%20bantuan%20terkait%20layanan%20${encodeURIComponent(appName || appSettings?.appName || 'KG2 School')}...`;
  })();

  const dynamicFaqs = Array.isArray(appSettings?.helpModalFaqs) && appSettings.helpModalFaqs.length > 0
    ? appSettings.helpModalFaqs.map(item => ({
        q: (currentLang === 'EN' && item.qEn) ? item.qEn : (item.q || item.question || ''),
        a: (currentLang === 'EN' && item.aEn) ? item.aEn : (item.a || item.answer || '')
      })).filter(f => f.q && f.a)
    : [
        {
          q: t("Bagaimana cara masuk ke sistem?", "How do I sign in to the portal?"),
          a: t(
            "Klik tombol \"Masuk\" di kanan atas halaman, lalu gunakan username dan password resmi yang diberikan sekolah.",
            "Click the \"Sign In\" button at the top right, then use your official credentials provided by the school."
          )
        },
        {
          q: t("Lupa password atau tidak bisa login?", "Forgot password or unable to log in?"),
          a: t(
            "Silakan hubungi administrator sekolah untuk melakukan reset password akun Anda.",
            "Please contact the school administrator to reset your account password."
          )
        },
        {
          q: t("Jadwal pelajaran atau presensi bermasalah?", "Schedule or attendance issue?"),
          a: t(
            "Setiap pembaruan jadwal atau data kehadiran sinkron secara real-time. Hubungi waka kurikulum bila data kelas Anda membutuhkan penyesuaian.",
            "All schedule and attendance updates sync in real-time. Contact the academic curriculum team if your class data requires adjustment."
          )
        }
      ];

  const modalTitle = (currentLang === 'EN' && appSettings?.helpModalTitleEn)
    ? appSettings.helpModalTitleEn
    : (appSettings?.helpModalTitle || t("Pusat Bantuan & Layanan", "Help Center & Services"));

  const modalSubtitle = (currentLang === 'EN' && appSettings?.helpModalSubtitleEn)
    ? appSettings.helpModalSubtitleEn
    : (appSettings?.helpModalSubtitle || t("Informasi akses akun, FAQ & kontak resmi sekolah", "Account access info, FAQ & official school contacts"));

  const modalNotice = (currentLang === 'EN' && appSettings?.helpModalNoticeEn)
    ? appSettings.helpModalNoticeEn
    : (appSettings?.helpModalNotice || t(
        "Butuh bantuan untuk masuk ke sistem atau memiliki pertanyaan seputar KBM? Silakan cek FAQ atau hubungi admin di bawah.",
        "Need assistance signing in to the system or have academic questions? Please check the FAQ or contact the school admin below."
      ));

  const modalHours = (currentLang === 'EN' && appSettings?.helpModalHoursEn)
    ? appSettings.helpModalHoursEn
    : (appSettings?.helpModalHours || t("Senin – Jumat (07.00 – 16.00 WIB)", "Mon – Fri (07.00 – 16.00 WIB)"));

  return (
    <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200 p-0 md:p-4 text-left">
      {/* Backdrop overlay listener to close */}
      <div className="absolute inset-0 z-0 cursor-pointer" onClick={onClose}></div>

      {/* Sheet/Modal Drawer */}
      <div className="bg-white rounded-t-2xl sm:rounded-2xl md:rounded-3xl w-full max-w-lg md:max-w-xl overflow-hidden shadow-2xl border border-slate-100 flex flex-col animate-in slide-in-from-bottom md:zoom-in-95 duration-200 ease-out z-10 max-h-[88vh]">
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
                {modalTitle}
              </span>
              <p className="text-[11px] font-medium text-slate-400 leading-tight">
                {modalSubtitle}
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
        <div className="px-5 sm:px-6 py-4 space-y-4 overflow-y-auto custom-scrollbar select-text max-h-[62vh]">
          <div className="bg-emerald-50/70 border border-emerald-200/60 rounded-xl p-3 text-emerald-950 flex items-start gap-2.5 shadow-2xs">
            <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
              <Info size={13} strokeWidth={2.4} />
            </div>
            <p className="leading-relaxed font-semibold text-[11.5px] text-emerald-900 text-left">
              {modalNotice}
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-0.5">
              {t("Pertanyaan Umum (FAQ)", "Frequently Asked Questions (FAQ)")}
            </p>
            <div className="space-y-1.5">
              {dynamicFaqs.map((faq, idx) => {
                const isOpen = openFaqIndex === idx;
                return (
                  <div 
                    key={idx} 
                    className={`border rounded-xl transition-all overflow-hidden ${
                      isOpen ? 'border-emerald-300 bg-emerald-50/25 shadow-2xs' : 'border-slate-200/80 bg-slate-50/40 hover:bg-slate-50 hover:border-slate-300'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                      className="w-full px-3.5 py-2.5 flex items-center justify-between bg-transparent border-none text-slate-800 font-bold text-[12px] cursor-pointer"
                    >
                      <span className="text-left leading-tight pr-2">{faq.q}</span>
                      <ChevronDown 
                        size={14} 
                        className={`text-slate-400 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180 text-emerald-600' : ''}`} 
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
              {t("Hubungi Admin Sekolah", "Contact School Admin")}
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {phone && (
                <a 
                  href={resolvedWaLink} 
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
                    <p className="text-[10.5px] font-mono font-bold text-emerald-700 truncate mt-1.5 leading-none">{phone}</p>
                  </div>
                </a>
              )}

              {email && (
                <a 
                  href={`mailto:${email}`}
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
                    <p className="text-[10.5px] font-mono font-bold text-slate-500 truncate mt-1.5 leading-none">{email}</p>
                  </div>
                </a>
              )}
            </div>
          </div>

          {/* Official Social Media */}
          {(appSettings?.socialInstagram || appSettings?.socialFacebook || appSettings?.socialYoutube) && (
            <div className="space-y-2 pt-1">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-0.5">
                {t('Media Sosial Resmi', 'Official Social Media')}
              </p>
              <div className="grid grid-cols-3 gap-2">
                {appSettings?.socialInstagram && (
                  <a 
                    href={getAbsoluteUrl(appSettings.socialInstagram)} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 p-2 rounded-xl border border-slate-200/80 bg-white hover:border-pink-300 hover:bg-pink-50/40 text-slate-700 hover:text-pink-600 transition-all text-xs font-bold no-underline shadow-2xs group"
                    title="Instagram Resmi"
                  >
                    <div className="text-pink-500 group-hover:scale-110 transition-transform">
                      <InstagramIcon size={14} />
                    </div>
                    <span className="truncate text-[11px]">Instagram</span>
                  </a>
                )}

                {appSettings?.socialFacebook && (
                  <a 
                    href={getAbsoluteUrl(appSettings.socialFacebook)} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 p-2 rounded-xl border border-slate-200/80 bg-white hover:border-blue-300 hover:bg-blue-50/40 text-slate-700 hover:text-blue-600 transition-all text-xs font-bold no-underline shadow-2xs group"
                    title="Facebook Resmi"
                  >
                    <div className="text-blue-600 group-hover:scale-110 transition-transform">
                      <FacebookIcon size={14} />
                    </div>
                    <span className="truncate text-[11px]">Facebook</span>
                  </a>
                )}

                {appSettings?.socialYoutube && (
                  <a 
                    href={getAbsoluteUrl(appSettings.socialYoutube)} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 p-2 rounded-xl border border-slate-200/80 bg-white hover:border-red-300 hover:bg-red-50/40 text-slate-700 hover:text-red-600 transition-all text-xs font-bold no-underline shadow-2xs group"
                    title="YouTube Resmi"
                  >
                    <div className="text-red-600 group-hover:scale-110 transition-transform">
                      <YoutubeIcon size={14} />
                    </div>
                    <span className="truncate text-[11px]">YouTube</span>
                  </a>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Bottom Sheet Footer */}
        <div className="px-5 sm:px-6 py-3 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400">
            <Clock size={12} className="text-slate-400 shrink-0" />
            <span>{modalHours}</span>
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

