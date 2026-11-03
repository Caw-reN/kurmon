import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { sanitizeHtml } from '../../utils/sanitizeHtml.js';

export default function PublicFooter({ 
  appSettings = {}, 
  schoolProfile = null, 
  setIsLoginModalOpen, 
  setShowPublicHelp,
  lang
}) {
  const [activeLang, setActiveLang] = useState(() => {
    if (lang) return lang;
    try {
      return localStorage.getItem('kurmon_lang') || 'ID';
    } catch {
      return 'ID';
    }
  });

  useEffect(() => {
    if (lang) {
      setActiveLang(lang);
      return;
    }
    const handleLangChange = (e) => {
      if (e?.detail) setActiveLang(e.detail);
    };
    window.addEventListener('kurmon_lang_change', handleLangChange);
    return () => window.removeEventListener('kurmon_lang_change', handleLangChange);
  }, [lang]);

  const t = (idText, enText) => (activeLang === 'EN' ? enText : idText);

  // Dynamic colors from admin settings
  const primaryColor = appSettings?.primaryColor || '#059669';

  // Dynamic school name resolution (strict filtering of any legacy 'SMK Negeri 1')
  const rawSchool = 
    appSettings?.instansiName || 
    (appSettings?.schoolName && appSettings.schoolName !== 'SMK Negeri 1' ? appSettings.schoolName : null) || 
    schoolProfile?.nama_sekolah || 
    'SMK Karya Guna 2 Bekasi';
  const schoolName = (rawSchool && rawSchool.toLowerCase().includes('negeri 1'))
    ? 'SMK Karya Guna 2 Bekasi'
    : (rawSchool || 'SMK Karya Guna 2 Bekasi');

  const appName = appSettings?.appName || 'KG2 School';
  const logoUrl = appSettings?.logoWebUrl || schoolProfile?.logo_url || appSettings?.logoUrl;
  const logoText = appSettings?.logoText || '2';
  const contactEmail = appSettings?.contactEmail || 'info@smkkg2.sch.id';

  // Addresses
  const addressText = 
    appSettings?.schoolAddress || 
    appSettings?.schoolProfile?.alamat || 
    schoolProfile?.alamat ||
    appSettings?.address ||
    null;

  return (
    <footer className="hidden md:block w-full bg-[#f6f8f5] border-t border-[#dde3d9] py-12 lg:py-14 select-none relative z-10 text-left print:hidden">
      <div className="max-w-[1400px] mx-auto px-6 md:px-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-12 pb-10">
          
          {/* Column 1: Brand & Addresses (6 cols) */}
          <div className="md:col-span-6 lg:col-span-6 flex flex-col text-left">
            <div className="flex items-center gap-3">
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="w-10 h-10 object-contain rounded-xl" />
              ) : (
                <div 
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-lg shadow-2xs shrink-0"
                  style={{ backgroundColor: primaryColor || '#153f32' }}
                >
                  {logoText}
                </div>
              )}
              <div className="flex flex-col text-left">
                <div className="flex items-baseline">
                  <span 
                    className="font-black text-lg lg:text-xl tracking-tight leading-none"
                    style={{ color: primaryColor ? `color-mix(in srgb, ${primaryColor} 88%, #000000)` : '#153f32' }}
                  >
                    {appName}
                  </span>
                  <span className="font-black text-lg lg:text-xl leading-none ml-0.5" style={{ color: primaryColor || '#059669' }}>
                    .
                  </span>
                </div>
                <span className="text-slate-500 text-[10.5px] lg:text-[11px] font-bold uppercase tracking-wider mt-1">
                  {schoolName.toUpperCase()}
                </span>
              </div>
            </div>

            <div className="mt-4 text-slate-500 text-xs font-medium leading-relaxed max-w-md">
              {addressText ? (
                <div className="whitespace-pre-line">{addressText}</div>
              ) : (
                <>
                  <p>Kampus A: Jl. Karang Satria No. 503, Duren Jaya,</p>
                  <p>Bekasi Timur, Kota Bekasi.</p>
                  <p className="mt-1">Kampus B: Jl. Kusuma Barat XI, Duren Jaya, Bekasi Timur.</p>
                </>
              )}
            </div>
          </div>

          {/* Column 2: Jelajahi Portal (3 cols) */}
          <div className="md:col-span-3 lg:col-span-3 flex flex-col text-left">
            <h4 
              className="text-xs font-black uppercase tracking-wider mb-3.5"
              style={{ color: primaryColor ? `color-mix(in srgb, ${primaryColor} 88%, #000000)` : '#153f32' }}
            >
              {t("Jelajahi Portal", "Explore Portal")}
            </h4>
            <div className="flex flex-col gap-2.5 text-xs font-medium text-slate-600">
              <Link to="/jadwal" className="hover:text-[var(--ui-primary)] transition-colors flex items-center gap-1.5 no-underline text-slate-600">
                <span>{t("Jadwal Pelajaran", "Class Schedule")}</span>
                <ArrowUpRight size={12} strokeWidth={2.4} className="text-slate-400" />
              </Link>
              <Link to="/materi-ajar" className="hover:text-[var(--ui-primary)] transition-colors flex items-center gap-1.5 no-underline text-slate-600">
                <span>{t("Materi Ajar", "Teaching Materials")}</span>
                <ArrowUpRight size={12} strokeWidth={2.4} className="text-slate-400" />
              </Link>
              <Link to="/kalender" className="hover:text-[var(--ui-primary)] transition-colors flex items-center gap-1.5 no-underline text-slate-600">
                <span>{t("Kalender Sekolah", "School Calendar")}</span>
                <ArrowUpRight size={12} strokeWidth={2.4} className="text-slate-400" />
              </Link>
              <Link to="/pkl-locations" className="hover:text-[var(--ui-primary)] transition-colors flex items-center gap-1.5 no-underline text-slate-600">
                <span>{t("Lokasi PKL", "Internship Locations")}</span>
                <ArrowUpRight size={12} strokeWidth={2.4} className="text-slate-400" />
              </Link>
              <Link to="/prestasi" className="hover:text-[var(--ui-primary)] transition-colors flex items-center gap-1.5 no-underline text-slate-600">
                <span>{t("Prestasi Siswa", "Student Achievements")}</span>
                <ArrowUpRight size={12} strokeWidth={2.4} className="text-slate-400" />
              </Link>
            </div>
          </div>

          {/* Column 3: Tetap Terhubung (3 cols) */}
          <div className="md:col-span-3 lg:col-span-3 flex flex-col text-left">
            <h4 
              className="text-xs font-black uppercase tracking-wider mb-3.5"
              style={{ color: primaryColor ? `color-mix(in srgb, ${primaryColor} 88%, #000000)` : '#153f32' }}
            >
              {t("Tetap Terhubung", "Stay Connected")}
            </h4>
            <div className="flex flex-col gap-2.5 text-xs font-medium text-slate-600">
              <a 
                href={`mailto:${contactEmail}`} 
                className="hover:text-[var(--ui-primary)] transition-colors flex items-center gap-1.5 no-underline text-slate-600"
              >
                <span>{contactEmail}</span>
                <ArrowUpRight size={12} strokeWidth={2.4} className="text-slate-400" />
              </a>
              <button 
                type="button" 
                onClick={() => {
                  if (setIsLoginModalOpen) {
                    setIsLoginModalOpen(true);
                  } else {
                    window.location.href = "/dashboard";
                  }
                }}
                className="hover:text-[var(--ui-primary)] transition-colors flex items-center gap-1.5 no-underline text-slate-600 bg-transparent border-none p-0 cursor-pointer font-medium text-xs text-left"
              >
                <span>{t("Sistem akademik sekolah", "School academic system")}</span>
                <ArrowUpRight size={12} strokeWidth={2.4} className="text-slate-400" />
              </button>
              <button 
                type="button" 
                onClick={() => setShowPublicHelp && setShowPublicHelp(true)}
                className="hover:text-[var(--ui-primary)] transition-colors flex items-center gap-1.5 no-underline text-slate-600 bg-transparent border-none p-0 cursor-pointer font-medium text-xs text-left"
              >
                <span>{t("Pusat bantuan", "Help center")}</span>
              </button>
            </div>
          </div>

        </div>

        {/* Bottom Copyright Row */}
        <div className="w-full border-t border-[#dde3d9] mt-8 pt-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-medium text-slate-500">
          <p>
            {(() => {
              const ft = appSettings?.footerText?.trim();
              const customCopyright = (ft && (ft.includes('©') || ft.length > 10)) ? ft : null;
              if (customCopyright) {
                return <span dangerouslySetInnerHTML={{ __html: sanitizeHtml(customCopyright) }} />;
              }
              if (appSettings?.footerDescription && appSettings.footerDescription.trim() && !appSettings.footerDescription.includes('Inkscod')) {
                return <span dangerouslySetInnerHTML={{ __html: sanitizeHtml(appSettings.footerDescription) }} />;
              }
              const year = (ft && /^\d{4}$/.test(ft)) ? ft : new Date().getFullYear();
              return `© ${year} ${appName} · ${schoolName}`;
            })()}
          </p>
          <div className="text-slate-500 text-xs font-medium">
            {t("Pratinjau antarmuka · Data akademik tersedia di sistem asli", "Interface preview · Academic data available in original system")}
          </div>
        </div>
      </div>
    </footer>
  );
}
