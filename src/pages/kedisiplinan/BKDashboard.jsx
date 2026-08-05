import { useState } from'react';
import { Activity, BarChart3, ShieldHalf } from'lucide-react';
import DashboardBPBK from'./DashboardBPBK.jsx';
import RekapKedisiplinan from'./RekapKedisiplinan.jsx';
import { PageHeader } from'../../components/monitoring/ui/index.js';


export default function BKDashboard({ teachers, students, classes }) {
  const [activeTab, setActiveTab] = useState('monitoring');

  const tabs = [
    { id:'monitoring', label:'Layanan & Bimbingan BK', icon: Activity },
    { id:'rekap', label:'Rekap & Poin Kedisiplinan', icon: BarChart3 }
  ];

  return (
    <div className="flex flex-col gap-5 h-full animate-in fade-in duration-300">
      <PageHeader
        title="Bimbingan & Konseling (BK)"
        icon={ShieldHalf}
        description="Kelola sesi konseling siswa, early warning kedisiplinan, panggilan orang tua & bimbingan karir."
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      <div className="w-full flex-1 min-h-0 relative">
        {activeTab ==='monitoring' && <DashboardBPBK teachers={teachers} students={students} classes={classes} />}
        {activeTab ==='rekap' && <RekapKedisiplinan students={students} classes={classes} />}
      </div>
    </div>
  );
}
