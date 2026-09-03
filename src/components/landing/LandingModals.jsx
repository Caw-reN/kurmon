import React, { useState } from 'react';
import { ChevronLeft, X, Info, MessageSquare, Mail, Check, ArrowRight } from 'lucide-react';

export const PublicHelpModal = ({ isOpen, onClose, primaryColor, contactPhone, contactEmail, appName, getWaLink }) => {
  const [openFaqIndex, setOpenFaqIndex] = useState(null);

  if (!isOpen) return null;

  const faqs = [
    {
      q: "Bagaimana cara masuk ke sistem?",
      a: "Klik tombol \"Masuk Sekarang\" di bar bawah (atau tombol \"Masuk\" di pojok kanan atas untuk desktop), lalu gunakan username dan password resmi yang diberikan oleh administrator sekolah."
    },
    {
      q: "Lupa password atau tidak bisa login?",
      a: "Silakan hubungi administrator IT sekolah atau wali kelas Anda untuk mereset password akun Anda."
    },
    {
      q: "Apakah jadwal pelajaran real-time?",
      a: "Ya, setiap perubahan jadwal piket, guru pengganti, atau perubahan kelas yang dilakukan oleh admin kurikulum akan langsung diperbarui seketika di portal ini."
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-slate-900/80 animate-in fade-in duration-300 p-0 md:p-4 text-left">
      {/* Backdrop overlay listener to close */}
      <div className="absolute inset-0 z-0 cursor-pointer" onClick={onClose}></div>

      {/* Sheet/Modal Drawer */}
      <div className="bg-white rounded-t-[var(--ui-radius-card)] md:rounded-[var(--ui-radius-card)] w-full max-w-md md:max-w-xl overflow-hidden shadow-xs border border-slate-100 flex flex-col animate-in slide-in-from-bottom md:zoom-in-95 duration-300 ease-out z-10 max-h-[85vh]">
        {/* iOS/Android drag handle bar - hidden on desktop */}
        <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto my-3 shrink-0 md:hidden"></div>

        {/* Header */}
        <div className="px-6 pb-3 pt-4 md:pt-6 flex items-center justify-between">
          <span className="font-black text-slate-800 text-[18px] md:text-[20px] tracking-tight">Hubungi & Bantuan</span>
          <button onClick={onClose} className="cursor-pointer flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors border-none">
            <X size={16} strokeWidth={2.5} />
          </button>
        </div>

        {/* Body content scroll area */}
        <div className="px-6 py-4 space-y-5 overflow-y-auto custom-scrollbar select-text max-h-[55vh]">
          <div className="bg-indigo-50 border border-indigo-100 rounded-[var(--ui-radius-small)] p-4 text-indigo-800 flex items-start gap-2.5">
            <Info size={16} className="shrink-0 mt-0.5" style={{ color:'#1d4ed8' }} />
            <p className="leading-relaxed font-semibold text-left text-indigo-900 text-[11.5px]">
              Butuh bantuan untuk masuk ke sistem atau memiliki pertanyaan seputar KBM? Silakan cek FAQ atau hubungi admin di bawah.
            </p>
          </div>

          <div className="space-y-3">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pertanyaan Umum (FAQ)</p>
            <div className="space-y-2">
              {faqs.map((faq, idx) => {
                const isOpen = openFaqIndex === idx;
                return (
                  <div key={idx} className="border border-slate-100 rounded-[var(--ui-radius-small)] overflow-hidden bg-slate-50/40 text-left transition-all">
                    <button
                      onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                      className="w-full px-4 py-3.5 flex items-center justify-between bg-transparent border-none text-slate-800 font-extrabold text-[12px] cursor-pointer hover:bg-slate-100/50 transition-colors"
                    >
                      <span className="text-left leading-tight pr-4">{faq.q}</span>
                      <ChevronLeft 
                        size={15} 
                        className={`text-slate-400 transition-transform duration-350 ${isOpen ? '-rotate-90' : 'rotate-180'}`} 
                      />
                    </button>
                    {isOpen && (
                      <div className="px-4 pb-4 pt-1 text-[11.5px] font-medium text-slate-500 leading-relaxed border-t border-slate-100 bg-white">
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-2.5">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Hubungi Admin Sekolah</p>
            
            {contactPhone && (
              <a 
                href={getWaLink()} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 border border-slate-155 hover:border-emerald-200 hover:bg-emerald-50/30 rounded-[var(--ui-radius-small)] transition-all text-slate-700 no-underline cursor-pointer group"
              >
                <div className="w-8.5 h-8.5 rounded-[var(--ui-radius-small)] bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-xs">
                  <MessageSquare size={16} strokeWidth={2.2} />
                </div>
                <div>
                  <p className="font-extrabold text-[12px] text-slate-800 leading-none mb-1">WhatsApp Admin</p>
                  <p className="text-[10.5px] font-bold text-slate-400 leading-none">{contactPhone}</p>
                </div>
              </a>
            )}

            {contactEmail && (
              <a 
                href={`mailto:${contactEmail}`}
                className="flex items-center gap-3 p-3 border border-slate-155 hover:border-indigo-200 hover:bg-indigo-50/30 rounded-[var(--ui-radius-small)] transition-all text-slate-700 no-underline cursor-pointer group"
              >
                <div className="w-8.5 h-8.5 rounded-[var(--ui-radius-small)] bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-xs">
                  <Mail size={16} strokeWidth={2.2} />
                </div>
                <div>
                  <p className="font-extrabold text-[12px] text-slate-800 leading-none mb-1">Email Layanan</p>
                  <p className="text-[10.5px] font-bold text-slate-400 leading-none">{contactEmail}</p>
                </div>
              </a>
            )}
          </div>
        </div>

        {/* Bottom Sheet Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50">
          <button 
            onClick={onClose}
            className="w-full h-11 flex items-center justify-center cursor-pointer border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 rounded-[var(--ui-radius-small)] font-bold text-xs uppercase tracking-wider transition-all active:scale-[0.98]"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};

