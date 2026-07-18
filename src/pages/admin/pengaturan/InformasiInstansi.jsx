import { Button } from '../../../components/ui.jsx';
import { useState } from'react';
import { Building2, CalendarDays, MessageSquare, Users, FileText } from'lucide-react';

export default function InformasiInstansi(props) {
  const [activeTab, setActiveTab] = useState("profil");

  const tabs = [
    { id:"profil", label:"Profil Sekolah", icon: Building2 },
    { id:"akademik", label:"Kalender Akademik", icon: CalendarDays },
    { id:"pesan", label:"Pengumuman", icon: MessageSquare },
    { id:"struktur", label:"Struktur Organisasi", icon: Users },
    { id:"esurat", label:"E-Surat", icon: FileText },
  ];

  return (
    <div className="flex flex-col gap-4 w-full h-full animate-in fade-in duration-300 relative z-10">
      
      {/* Header and Tabs */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 md:p-5 bg-white border-none rounded-[var(--ui-radius-card)] shadow-sm flex-shrink-0">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight">
            Informasi & Kalender Akademik
          </h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">
            Kelola profil sekolah, agenda akademik, pengumuman, dan persuratan.
          </p>
        </div>

        <div className="flex flex-wrap bg-slate-100 p-1 rounded-lg w-full md:w-auto gap-1">
          {tabs.map((tab) => (
            <Button variant="outline"
              key={tab.id}
              onClick={() =>setActiveTab(tab.id)}
              className={`flex-1 md:flex-none flex items-center justify-center gap-2`}
            >
              <tab.icon className="w-4 h-4" />
              <span className="hidden lg:inline">{tab.label}</span></Button>
          ))}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {activeTab ==="profil" && props.renderProfil()}
        {activeTab ==="akademik" && props.renderAkademik()}
        {activeTab ==="pesan" && props.renderPesan()}
        {activeTab ==="struktur" && props.renderStruktur()}
        {activeTab ==="esurat" && props.renderESurat()}
      </div>
      
    </div>
  );
}
