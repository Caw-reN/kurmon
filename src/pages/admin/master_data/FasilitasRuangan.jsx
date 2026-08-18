import { useState } from'react';
import { DoorOpen, Map } from'lucide-react';
import MasterDataRuangan from'./MasterDataRuangan.jsx';
import TabDenah from'../tabs/TabDenah.jsx';
import { PageHeader } from'../../../components/monitoring/ui/index.js';


export default function FasilitasRuangan(props) {
  const [activeTab, setActiveTab] = useState("ruangan");

  const tabs = [
    { id:"ruangan", label:"Data Ruangan", icon: DoorOpen, onClick: () => setActiveTab("ruangan"), isActive: activeTab ==="ruangan" },
    { id:"denah", label:"Denah Ruangan", icon: Map, onClick: () => setActiveTab("denah"), isActive: activeTab ==="denah" },
  ];

  return (
    <div className="flex flex-col gap-4 w-full h-full animate-in fade-in duration-300 relative z-10">
      
      <div className="space-y-4 mb-4">
        <PageHeader 
          title="Fasilitas & Ruangan"
          icon={DoorOpen}
          tabs={tabs}
          description="Kelola data ruangan kelas, laboratorium, dan fasilitas lainnya beserta denah sekolah."
        />
        
        {/* KPI Cards Header */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="ui-card p-3.5 sm:p-4 rounded-[var(--ui-radius-card)] bg-white border border-slate-200/80 shadow-xs flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-[var(--ui-radius-small)] bg-[var(--ui-primary)]/10 text-[var(--ui-primary)] flex items-center justify-center shrink-0">
              <DoorOpen size={20} strokeWidth={2.2} />
            </div>
            <div>
              <div className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">TOTAL RUANGAN</div>
              <div className="text-xl font-black text-slate-800">{props.rooms?.length || 0}</div>
            </div>
          </div>
          <div className="ui-card p-3.5 sm:p-4 rounded-[var(--ui-radius-card)] bg-white border border-slate-200/80 shadow-xs flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-[var(--ui-radius-small)] bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <DoorOpen size={20} strokeWidth={2.2} />
            </div>
            <div>
              <div className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">RUANG TEORI</div>
              <div className="text-xl font-black text-slate-800">{(props.rooms || []).filter(r => r.type !== 'Praktik').length}</div>
            </div>
          </div>
          <div className="ui-card p-3.5 sm:p-4 rounded-[var(--ui-radius-card)] bg-white border border-slate-200/80 shadow-xs flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-[var(--ui-radius-small)] bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <DoorOpen size={20} strokeWidth={2.2} />
            </div>
            <div>
              <div className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">RUANG PRAKTIK</div>
              <div className="text-xl font-black text-slate-800">{(props.rooms || []).filter(r => r.type === 'Praktik').length}</div>
            </div>
          </div>
          <div className="ui-card p-3.5 sm:p-4 rounded-[var(--ui-radius-card)] bg-white border border-slate-200/80 shadow-xs flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-[var(--ui-radius-small)] bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <DoorOpen size={20} strokeWidth={2.2} />
            </div>
            <div>
              <div className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">JURUSAN</div>
              <div className="text-xl font-black text-slate-800">{new Set((props.rooms || []).map(r => r.major).filter(Boolean)).size}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {activeTab ==="ruangan" && (
          <MasterDataRuangan
            rooms={props.rooms}
            updateSelectionForTab={props.updateSelectionForTab}
            openModal={props.openModal}
            checkDependencies={props.checkDependencies}
            handleDelete={props.handleDelete}
            renderTable={props.renderTable}
          />
        )}
        {activeTab ==="denah" && (
          <TabDenah {...props.tabProps} />
        )}
      </div>
      
    </div>
  );
}
