import { useState } from'react';
import { Activity, BarChart3, ShieldHalf } from'lucide-react';
import DashboardBPBK from'./DashboardBPBK.jsx';
import RekapKedisiplinan from'./RekapKedisiplinan.jsx';
import { PageHeader } from'../../components/monitoring/ui/index.js';


export default function BKDashboard({ teachers, students, classes }) {
  const [activeTab, setActiveTab] = useState('ringkasan');

  const tabs = [
    { id: 'ringkasan', label: 'Ringkasan & EWS', icon: Activity },
    { id: 'konseling', label: 'Sesi Konseling', icon: ShieldHalf },
    { id: 'surat', label: 'Surat & Visit', icon: Activity },
    { id: 'rekap', label: 'Rekap & Poin Siswa', icon: BarChart3 }
  ];

  return (
    <div className="flex flex-col gap-4 sm:gap-5 h-full animate-in fade-in duration-300">
      <PageHeader
        title="Bimbingan & Konseling (BK)"
        icon={ShieldHalf}
        description="Pusat layanan konseling, pemantauan kedisiplinan (EWS), home visit & panggilan orang tua."
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      <div className="w-full flex-1 min-h-0 relative">
        {activeTab === 'rekap' ? (
          <RekapKedisiplinan students={students} classes={classes} />
        ) : (
          <DashboardBPBK 
            tab={activeTab} 
            onTabChange={setActiveTab} 
            teachers={teachers} 
            students={students} 
            classes={classes} 
          />
        )}
      </div>
    </div>
  );
}
