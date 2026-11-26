import { useState, useEffect } from 'react';
import { ClipboardList, Users, GraduationCap, Briefcase } from 'lucide-react';
import HikvisionTeacherReport from './HikvisionTeacherReport.jsx';
import HikvisionStaffReport from './HikvisionStaffReport.jsx';
import HikvisionStudentReport from './HikvisionStudentReport.jsx';
import { PageHeader } from '../../../components/monitoring/ui/index.js';


export default function LaporanAbsensi({ classes = [], students = [], initialTab, activeTab: propActiveTab, setActiveTab: propSetActiveTab }) {
  const mapTab = (tab) => {
    if (!tab) return null;
    const lower = String(tab).toLowerCase().trim();
    if (lower === 'karyawan' || lower === 'hikvision_report_karyawan' || lower === 'staff') return 'karyawan';
    if (lower === 'siswa' || lower === 'hikvision_report_siswa' || lower === 'student') return 'siswa';
    if (lower === 'guru' || lower === 'hikvision_report_guru' || lower === 'teacher') return 'guru';
    return null;
  };

  const resolvedInitial = mapTab(initialTab) || (propActiveTab !== 'laporan_absensi' ? mapTab(propActiveTab) : null) || 'guru';
  const [internalTab, setInternalTab] = useState(resolvedInitial);

  // Sinkronisasi internalTab jika initialTab atau propActiveTab berubah dari luar
  useEffect(() => {
    const matched = mapTab(initialTab) || (propActiveTab !== 'laporan_absensi' ? mapTab(propActiveTab) : null);
    if (matched) {
      setInternalTab(matched);
    }
  }, [initialTab, propActiveTab]);

  const handleTabChange = (tabId) => {
    setInternalTab(tabId);
    // CATATAN: DILARANG memanggil propSetActiveTab(tabId) dengan "guru", "karyawan", atau "siswa"
    // karena route tersebut di AdminContentRouter mengarah ke Master Data (Data Pegawai/Siswa),
    // yang akan meng-unmount LaporanAbsensi.
  };

  const tabs = [
    { id: "guru", label: "Laporan Guru", icon: Users },
    { id: "karyawan", label: "Laporan Karyawan", icon: Briefcase },
    { id: "siswa", label: "Laporan Siswa", icon: GraduationCap },
  ];

  return (
    <div className="flex flex-col gap-4 w-full animate-in fade-in duration-300 relative z-10">
      <PageHeader 
        title="Laporan Kehadiran"
        description="Pantau dan ekspor laporan kehadiran dari mesin absensi Hikvision."
        icon={ClipboardList}
        tabs={tabs}
        activeTab={internalTab}
        onTabChange={handleTabChange}
      />

      {/* Content Area */}
      <div className="w-full">
        {internalTab === "guru" && <HikvisionTeacherReport isNested={true} />}
        {internalTab === "karyawan" && <HikvisionStaffReport classes={classes} isNested={true} />}
        {internalTab === "siswa" && <HikvisionStudentReport classes={classes} students={students} isNested={true} />}
      </div>
    </div>
  );
}
