import { createPortal } from'react-dom';
import { Building2, Calendar as CalendarIcon, MessageSquare, Briefcase, FileText } from'lucide-react';

export default function InformasiTabs({ activeTab, setActiveTab }) {
  const tabs = [
    { id:"profil_sekolah", label:"Profil Instansi", icon: Building2 },
    { id:"akademik", label:"Kalender Akademik", icon: CalendarIcon },
    { id:"pesan", label:"Pesan Masuk", icon: MessageSquare },
    { id:"struktur", label:"Struktur Organisasi", icon: Briefcase },
    { id:"esurat", label:"Administrasi E-Surat", icon: FileText },
  ];

  const portalRoot = document.getElementById("workspace-tabs-portal");

  const tabsUI = (
    <div className="flex overflow-x-auto sm:flex-wrap gap-2 sm:gap-2.5 p-1 bg-slate-100/80 border border-slate-200/50 rounded-2xl w-full sm:w-fit hide-scrollbar whitespace-nowrap shadow-xs">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold transition-all active:translate-y-[1px] border cursor-pointer ${
              isActive
                ?'bg-white text-[var(--ui-primary)] border-slate-200 shadow-xs'
                :'bg-transparent hover:bg-slate-200/50 text-slate-500 hover:text-slate-800 border-transparent'
            }`}
          >
            <Icon size={14} className="shrink-0" />
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );

  return portalRoot ? createPortal(tabsUI, portalRoot) : tabsUI;
}
