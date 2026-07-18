import { Settings, LayoutDashboard, DatabaseBackup, MessageSquare, KeyRound } from'lucide-react';

export default function SistemTabs({ activeTab, setActiveTab }) {
  const tabs = [
    { id:"fitur", label:"Fitur", icon: Settings },
    { id:"tampilan", label:"Tampilan Web", icon: LayoutDashboard },
    { id:"whatsapp", label:"WhatsApp", icon: MessageSquare },
    { id:"api_keys", label:"API Key", icon: KeyRound },
    { id:"gdrive_backup", label:"Backup", icon: DatabaseBackup },
  ];

  return (
    <div className="flex overflow-x-auto sm:flex-wrap gap-2 sm:gap-2.5 mb-5 p-1 bg-muted/40 border border-border/50 rounded-xl w-full sm:w-fit hide-scrollbar whitespace-nowrap">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all active:translate-y-[1px] border cursor-pointer ${
              isActive
                ?'bg-primary text-white border-primary shadow-sm'
                :'bg-transparent hover:bg-muted text-muted-foreground hover:text-foreground border-transparent'
            }`}
          >
            <Icon size={14} className="shrink-0" />
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
