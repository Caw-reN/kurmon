import { useState } from'react';
import { ClipboardList, Users, GraduationCap, Briefcase } from'lucide-react';


export default function LaporanAbsensi({ classes = [], students = [] }) {
  const [activeTab, setActiveTab] = useState("guru");

  const tabs = [
    { id:"guru", label:"Laporan Guru", icon: Users },
    { id:"karyawan", label:"Laporan Karyawan", icon: Briefcase },
    { id:"siswa", label:"Laporan Siswa", icon: GraduationCap },
  ];

  return (
    <div className="flex flex-col gap-4 w-full h-full animate-in fade-in duration-300 relative z-10">
      <PageHeader 
        title="Laporan Kehadiran"
        description="Pantau dan ekspor laporan kehadiran dari mesin absensi Hikvision."
        icon={ClipboardList}
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* Content Area */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {activeTab ==="guru" && <HikvisionTeacherReport isNested={true} />}
        {activeTab ==="karyawan" && <HikvisionStaffReport classes={classes} isNested={true} />}
        {activeTab ==="siswa" && <HikvisionStudentReport classes={classes} students={students} isNested={true} />}
      </div>
    </div>
  );
}
