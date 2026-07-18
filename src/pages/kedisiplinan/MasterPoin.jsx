import { lazy } from'react';
import { Suspense } from'react';


const TatibSkorKredit = lazy(() => import('../admin/pengaturan/TatibSkorKredit.jsx'));

export default function MasterPoin() {
  return (
    <Suspense fallback={<div className="p-6 text-center text-slate-400">Memuat Pengaturan Poin...</div>}>
      <TatibSkorKredit />
    </Suspense>
  );
}
