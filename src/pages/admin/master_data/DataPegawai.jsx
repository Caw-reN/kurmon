import { useState } from'react';
import { Users, Briefcase } from'lucide-react';
import MasterDataGuru from'./MasterDataGuru.jsx';
import MasterDataKaryawan from'./MasterDataKaryawan.jsx';
import { PageHeader } from'../../../components/monitoring/ui/index.js';


export default function DataPegawai(props) {
  const [activeTab, setActiveTab] = useState(props.initialTab || "guru");

  const teacherCount = props.teachers?.length || 0;
  const staffCount = props.staffs?.length || 0;

  const tabs = [
    { id: "guru", label: `Data Guru (${teacherCount})`, icon: Users, onClick: () => setActiveTab("guru"), isActive: activeTab === "guru" },
    { id: "karyawan", label: `Data Karyawan / Staf (${staffCount})`, icon: Briefcase, onClick: () => setActiveTab("karyawan"), isActive: activeTab === "karyawan" },
  ];

  return (
    <div className="flex flex-col gap-4 w-full h-full animate-in fade-in duration-300 relative z-10">
      
      <PageHeader 
        title="Data Pegawai"
        icon={Users}
        tabs={tabs}
        description="Kelola data induk seluruh tenaga pendidik (guru) dan tenaga kependidikan (karyawan/staf) sekolah."
      />

      {/* Content Area */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {activeTab === "guru" && (
          <MasterDataGuru
            {...props}
            teachers={props.teachers}
            classes={props.classes}
            teacherTargetJpMap={props.teacherTargetJpMap}
            teacherScheduleCountMap={props.teacherScheduleCountMap}
            quickEditGuruCode={props.quickEditGuruCode}
            quickGuruForm={props.quickGuruForm}
            setQuickGuruForm={props.setQuickGuruForm}
            setQuickEditGuruCode={props.setQuickEditGuruCode}
            updateSelectionForTab={props.updateSelectionForTab}
            openModal={props.openModal}
            checkDependencies={props.checkDependencies}
            handleDelete={props.handleDelete}
            saveQuickEditGuru={props.saveQuickEditGuru}
            startQuickEditGuru={props.startQuickEditGuru}
            renderTable={props.renderTable}
            setTeachers={props.setTeachers}
            saveDatabaseNow={props.saveDatabaseNow}
            isViewOnly={props.isViewOnly}
          />
        )}
        {activeTab === "karyawan" && (
          <MasterDataKaryawan
            {...props}
            staffs={props.staffs}
            classes={props.classes}
            updateSelectionForTab={props.updateSelectionForTab}
            openModal={props.openModal}
            checkDependencies={props.checkDependencies}
            handleDelete={props.handleDelete}
            renderTable={props.renderTable}
            setStaffs={props.setStaffs}
            saveDatabaseNow={props.saveDatabaseNow}
            isViewOnly={props.isViewOnly}
          />
        )}
      </div>
      
    </div>
  );
}
