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
      
      <PageHeader 
        title="Fasilitas & Ruangan"
        icon={DoorOpen}
        tabs={tabs}
        description="Kelola data ruangan kelas, laboratorium, dan fasilitas lainnya beserta denah sekolah."
      />

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
