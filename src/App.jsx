import { lazy, useState, useEffect } from 'react';
import { applyDocumentBranding, resetDocumentBranding } from './utils/branding.js';
import { clearLegacyLocalStorage, getDatabaseSnapshot, setDatabaseSnapshot, subscribeDatabaseSnapshot } from './utils/dataSource.js';
import { Suspense } from 'react';
import { Navigate, Outlet, BrowserRouter, Routes, Route } from 'react-router-dom';
import { BarChart2 } from 'lucide-react';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import GlobalDialogProvider from './components/GlobalDialogProvider.jsx';


// ── Core schedule app (lazy)
const AdminApp = lazy(() => import("./AdminApp.jsx"));
const LandingPage = lazy(() => import("./pages/LandingPage.jsx"));

// ── Public schedule pages
const JadwalPage = lazy(() => import('./pages/JadwalPage.jsx'));
const DenahPage = lazy(() => import('./pages/DenahPage.jsx'));
const SilabusPage = lazy(() => import('./pages/SilabusPage.jsx'));
const MateriAjarPage = lazy(() => import('./pages/MateriAjarPage.jsx'));
const KalenderPage = lazy(() => import('./pages/KalenderPage.jsx'));
const StrukturOrganisasiPage = lazy(() => import('./pages/StrukturOrganisasiPage.jsx'));

// ── Public Layout
const PublicLayout = lazy(() => import("./components/layout/PublicLayout.jsx"));

// ── Public Monitoring page
const PklLocationsPage = lazy(() => import("./pages/monitoring/public/PklLocationsPage.jsx"));
const ValidasiSiswa = lazy(() => import("./pages/ValidasiSiswa.jsx"));

// ── Monitoring — Admin
const MonitoringAdminLayout = lazy(() => import("./components/monitoring/layout/AdminLayout.jsx"));
const MonitoringAdminDashboard = lazy(() => import("./pages/admin/dashboard/Dashboard.jsx"));
const MonitoringImportData = lazy(() => import("./pages/admin/master_data/ImportData.jsx"));
const MonitoringDataSiswa = lazy(() => import("./pages/admin/master_data/DataSiswa.jsx"));
const MonitoringDataPerusahaan = lazy(() => import("./pages/admin/master_data/DataPerusahaan.jsx"));
const MonitoringDataGuru = lazy(() => import("./pages/admin/master_data/DataGuru.jsx"));
const MonitoringJurnalAdmin = lazy(() => import("./pages/admin/pkl/JurnalAdmin.jsx"));
const MonitoringLaporanAdmin = lazy(() => import("./pages/admin/pkl/LaporanAdmin.jsx"));
const MonitoringPenugasanGuru = lazy(() => import("./pages/admin/pkl/PenugasanGuru.jsx"));
const MonitoringAbsensiSettings = lazy(() => import("./pages/admin/hikvision/AbsensiSettings.jsx"));
const MonitoringFiturManagement = lazy(() => import("./pages/admin/pengaturan/FiturManagement.jsx"));

// ── Monitoring — Student
const MonitoringStudentLayout = lazy(() => import("./components/monitoring/layout/StudentLayout.jsx"));
const MonitoringStudentDashboard = lazy(() => import("./pages/monitoring/student/Dashboard.jsx"));
const MonitoringAbsensi = lazy(() => import("./pages/monitoring/student/Absensi.jsx"));
const MonitoringLogbook = lazy(() => import("./pages/monitoring/student/Logbook.jsx"));
const MonitoringLokasiPKL = lazy(() => import("./pages/monitoring/student/LokasiPKL.jsx"));
const MonitoringRiwayatAbsensi = lazy(() => import("./pages/monitoring/student/RiwayatAbsensi.jsx"));
const MonitoringProfilSiswa = lazy(() => import("./pages/monitoring/student/ProfilSiswa.jsx"));
const AdministrasiSiswa = lazy(() => import("./pages/monitoring/student/AdministrasiSiswa.jsx"));
const KartuPelajarSiswa = lazy(() => import("./pages/monitoring/student/KartuPelajar.jsx"));

// ── Monitoring — Teacher (Guru Pembimbing PKL)
const MonitoringTeacherLayout = lazy(() => import("./components/monitoring/layout/TeacherLayout.jsx"));
const MonitoringTeacherDashboard = lazy(() => import("./pages/monitoring/teacher/Dashboard.jsx"));
const MonitoringKunjunganPKL = lazy(() => import("./pages/monitoring/teacher/KunjunganPKL.jsx"));
const MonitoringValidasiJurnal = lazy(() => import("./pages/monitoring/teacher/ValidasiJurnal.jsx"));
const MonitoringSiswaBinaan = lazy(() => import("./pages/monitoring/teacher/SiswaBinaan.jsx"));
const KelolaAdministrasiPKL = lazy(() => import("./pages/admin/pkl/KelolaAdministrasiPKL.jsx"));

// ── Session helpers
const SESSION_KEY = "school_schedule_session_v1";

// Synchronize session from localStorage to sessionStorage on load (ensuring single account per browser device across tabs)
try {
  const localSess = localStorage.getItem(SESSION_KEY);
  const sessionSess = sessionStorage.getItem(SESSION_KEY);
  if (localSess && !sessionSess) {
    sessionStorage.setItem(SESSION_KEY, localSess);
  }
} catch (e) {
  console.warn("Session sync from localStorage failed", e);
}

const getSession = () => {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    const s = raw ? JSON.parse(raw) : null;
    return s?.authToken && s?.role ? s : null;
  } catch { /* intentionally ignored — session parse failure means no session */ return null; }
};

// ── Protected route wrapper (for monitoring & admin routes)
const ProtectedRoute = ({ allowedRoles, isLoginPage = false }) => {
  const session = getSession();

  // If user is NOT logged in:
  if (!session) {
    // Allow login page (/dashboard/*) to render so Login form appears
    if (isLoginPage) return <Outlet />;
    // Otherwise redirect unauthenticated users to home page
    return <Navigate to="/" replace />;
  }

  const role = (session.role || '').toLowerCase();

  // If user IS logged in but role is not permitted for this route:
  if (allowedRoles && !allowedRoles.includes(role)) {
    if (role === 'admin' || role === 'superadmin' || role === 'tu' || role === 'waka' || role === 'piket' || role === 'bk') {
      return <Navigate to="/dashboard" replace />;
    }
    if (role === 'guru') return <Navigate to="/dashboard" replace />;
    if (role === 'siswa') return <Navigate to="/student" replace />;
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

const GlobalLoader = ({ title = "Menyiapkan Ruang Kelas...", showTip = false, error = null }) => {
  const brandSnapshot = getDatabaseSnapshot();
  const appSettings = brandSnapshot?.appSettings || {};
  const brandName = appSettings.appName || "TimeSchedule";
  const primaryColor = appSettings.primaryColor || "#064e3b";

  const [tip, setTip] = useState("");
  useEffect(() => {
    if (showTip) {
      const idx = Math.floor(Math.random() * LOADING_TIPS.length);
      setTip(LOADING_TIPS[idx]);
    }
  }, [showTip]);

  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
  if (isMobile) {
    return <div className="fixed inset-0 bg-[#f8fafc]" />;
  }

  return (
    <div 
      className="flex h-screen w-full flex-col items-center justify-center relative overflow-hidden font-sans text-slate-700 bg-white"
      style={{ background: "radial-gradient(circle at center, #ffffff 0%, #f4f6f8 100%)" }}
    >
      <div className="relative z-10 flex flex-col items-center justify-center max-w-md w-full px-6">
        
        {/* Premium Center-Icon Spinner */}
        <div className="relative w-24 h-24 flex items-center justify-center">
          {/* Thin track */}
          <div className="absolute w-20 h-20 rounded-full border-2 border-emerald-100"></div>
          {/* Active rotating arc */}
          <div 
            className="absolute w-20 h-20 rounded-full border-2 border-transparent border-t-2 animate-spin"
            style={{ borderTopColor: primaryColor, animationDuration: '0.8s' }}
          ></div>
          {/* Solid Green Inner Circle with Bar Chart */}
          <div 
            className="w-12 h-12 rounded-full flex items-center justify-center shadow-[0_4px_12px_rgba(16,185,129,0.25)] relative z-10"
            style={{ backgroundColor: primaryColor }}
          >
            <BarChart2 className="text-white w-6 h-6" strokeWidth={2.5} />
          </div>
        </div>

        {/* Text Area */}
        <div className="text-center mt-8 w-full">
          <h1 className="text-slate-800 text-2xl font-black tracking-tight mb-2">
            {title}
          </h1>
          <p className="text-slate-400 text-xs font-semibold leading-relaxed max-w-[280px] mx-auto">
            Sedang mengonfigurasi pengaturan sistem {brandName} dan memuat dasbor...
          </p>

          {showTip && tip && (
            <div className="mt-8 pt-4 border-t border-slate-100 text-left max-w-sm mx-auto bg-slate-50/50 p-4 rounded-xl border border-slate-100">
              <span className="text-[9px] font-black tracking-wider text-slate-400 uppercase block mb-1">Tips Hari Ini</span>
              <p className="text-slate-600 text-[11px] leading-relaxed font-semibold">{tip}</p>
            </div>
          )}
        </div>

        {error && (
          <div className="mt-4 flex items-center gap-3 bg-red-50 border border-red-200 px-4 py-3 rounded-lg text-red-700 w-full shadow-md">
            <svg className="w-5 h-5 shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-xs font-semibold">{error}</span>
          </div>
        )}
      </div>
    </div>
  );
};

const Spinner = () => <GlobalLoader title="Memuat Halaman..." showTip={false} />;

const LOADING_TIPS = [
  "💡 Guru piket dapat menambahkan pelanggaran siswa secara cepat melalui menu Piket Harian.",
  "💡 Anda dapat memperbarui profil, mengubah password, atau mengganti username langsung dengan mengklik foto profil Anda.",
  "💡 Waka Kurikulum dapat mengunggah file CSV guru & siswa untuk memperbarui data massal.",
  "💡 Pastikan izin akses GPS pada peramban Anda aktif agar absensi guru KBM tervalidasi dengan tepat.",
  "💡 Susunan letak bangku dan tata ruang kelas dapat diubah secara visual dan interaktif di tab Denah.",
  "💡 Laporan kehadiran guru dapat diekspor langsung ke berkas Excel yang siap cetak.",
  "💡 Buku bimbingan konseling membantu mencatat tindak lanjut setiap kejadian siswa secara terpadu."
];


// Cache TTL constant — defined outside component to avoid useEffect dependency warning
const OFFLINE_CACHE_KEY = "kurmon_offline_payload";
const OFFLINE_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 jam

export default function App() {
  const [dbLoaded, setDbLoaded] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    applyDocumentBranding(getDatabaseSnapshot().appSettings || {});
    return subscribeDatabaseSnapshot((snapshot) => {
      applyDocumentBranding(snapshot?.appSettings || {});
    });
  }, []);

  useEffect(() => {
    const loadDbData = async () => {
      try {
        const res = await fetch("/api/data/public");
        if (!res.ok) throw new Error(`Gagal memuat data dari database (HTTP ${res.status})`);
        const result = await res.json();
        if (result.ok && result.payload) {
          const nextPayload = { ...result.payload, currentUser: null };
          if (nextPayload.adminUser) delete nextPayload.adminUser.password;
          if (Array.isArray(nextPayload.teachers)) {
            nextPayload.teachers = nextPayload.teachers.map((t) => { const s = { ...t }; delete s.password; return s; });
          }
          setDatabaseSnapshot(nextPayload);
          // PRELOAD HERO IMAGE FOR LANDING PAGE (LCP OPTIMIZATION)
          if (nextPayload?.appSettings?.heroImage && !document.getElementById('preload-hero')) {
            const link = document.createElement('link');
            link.id = 'preload-hero';
            link.rel = 'preload';
            link.as = 'image';
            link.href = nextPayload.appSettings.heroImage;
            document.head.appendChild(link);
          }
          try {
            localStorage.setItem(OFFLINE_CACHE_KEY, JSON.stringify({ _savedAt: Date.now(), payload: nextPayload }));
          } catch (e) {
            console.warn("Gagal menyimpan backup offline", e);
          }
        } else {
          setDatabaseSnapshot({});
        }
        clearLegacyLocalStorage();
        setDbLoaded(true);
      } catch (err) {
        console.error("Database connection error:", err);
        setError(err.message || "Gagal menghubungkan ke database server.");
        
        let recovered = false;
        try {
          const offlineRaw = localStorage.getItem(OFFLINE_CACHE_KEY);
          if (offlineRaw) {
            const offlineEntry = JSON.parse(offlineRaw);
            // Support both legacy format (plain object) and new format (with _savedAt)
            const savedAt = offlineEntry?._savedAt || 0;
            const isFresh = (Date.now() - savedAt) < OFFLINE_CACHE_TTL_MS;
            const parsed = offlineEntry?.payload || (typeof offlineEntry === "object" && !offlineEntry._savedAt ? offlineEntry : null);
            if (parsed && typeof parsed === "object" && isFresh) {
              setDatabaseSnapshot(parsed);
              if (parsed?.appSettings?.heroImage && !document.getElementById('preload-hero')) {
                const link = document.createElement('link');
                link.id = 'preload-hero';
                link.rel = 'preload';
                link.as = 'image';
                link.href = parsed.appSettings.heroImage;
                document.head.appendChild(link);
              }
              recovered = true;
              console.info("Recovered database snapshot from offline backup (fresh).");
            } else if (parsed && typeof parsed === "object" && !isFresh) {
              // Cache expired — use anyway but warn, then clear
              setDatabaseSnapshot(parsed);
              if (parsed?.appSettings?.heroImage && !document.getElementById('preload-hero')) {
                const link = document.createElement('link');
                link.id = 'preload-hero';
                link.rel = 'preload';
                link.as = 'image';
                link.href = parsed.appSettings.heroImage;
                document.head.appendChild(link);
              }
              recovered = true;
              console.warn("Offline backup sudah kadaluarsa (>24 jam). Digunakan sementara.");
              try { localStorage.removeItem(OFFLINE_CACHE_KEY); } catch { /* intentionally ignored */ }
            }
          }
        } catch (recoverErr) {
          console.warn("Gagal memuat backup offline", recoverErr);
        }

        if (!recovered) {
          setDatabaseSnapshot({});
          resetDocumentBranding();
        }
        clearLegacyLocalStorage();
        setDbLoaded(true);
      }
    };
    loadDbData();
  }, []);


  if (!dbLoaded) {
    return <GlobalLoader title="Sedang Menyiapkan Ruang Kelas..." showTip={true} error={error} />;
  }

  const featureSettings = getDatabaseSnapshot().featureSettings || {};
  const featureEnabled = (key) => featureSettings?.[key] !== false;

  return (
    <ErrorBoundary>
      <GlobalDialogProvider>
        <BrowserRouter>
          <Suspense fallback={<Spinner />}>
          <Routes>
          {/* ── Public Routes with Shared Layout ── */}
          <Route element={<PublicLayout />}>
            {/* ── Public / Landing (Login Portal) ── */}
            <Route path="/" element={<LandingPage />} />

            {/* ── Public Kurikulum pages ── */}
            <Route path="/jadwal" element={<JadwalPage />} />
            <Route path="/denah" element={featureEnabled("publicDenah") ? <DenahPage /> : <Navigate to="/" replace />} />
            <Route path="/silabus" element={featureEnabled("teacherSyllabus") ? <SilabusPage /> : <Navigate to="/" replace />} />
            <Route path="/materi-ajar" element={<MateriAjarPage />} />
            <Route path="/kalender" element={featureEnabled("publicCalendar") ? <KalenderPage /> : <Navigate to="/" replace />} />
            <Route path="/struktur" element={<StrukturOrganisasiPage />} />

            {/* ── Public Monitoring page ── */}
            <Route path="/pkl-locations" element={<PklLocationsPage />} />
            <Route path="/validasi-siswa" element={<ValidasiSiswa />} />
          </Route>

          {/* ── Admin & Guru (Schedule App) ── */}
          <Route element={<ProtectedRoute allowedRoles={["admin", "superadmin", "guru", "tu", "waka", "piket", "bk"]} isLoginPage={true} />}>
            <Route path="/dashboard/*" element={<AdminApp />} />
          </Route>
          <Route path="/teacher/*" element={<Navigate to="/dashboard" replace />} />

          {/* ── Monitoring Admin (Hubin / SuperAdmin) has been migrated into AdminApp.jsx ── */}

          {/* ── Monitoring Guru Pembimbing ── */}
          <Route element={<ProtectedRoute allowedRoles={["guru", "admin"]} />}>
            <Route path="/pkl-teacher" element={<MonitoringTeacherLayout />}>
              <Route index element={<MonitoringTeacherDashboard />} />
              <Route path="kunjungan" element={<MonitoringKunjunganPKL />} />
              <Route path="validasi" element={<MonitoringValidasiJurnal />} />
              <Route path="siswa" element={<MonitoringSiswaBinaan />} />
              <Route path="laporan" element={<MonitoringLaporanAdmin />} />
              <Route path="administrasi" element={<KelolaAdministrasiPKL />} />
            </Route>
          </Route>

          {/* ── Monitoring Siswa ── */}
          <Route element={<ProtectedRoute allowedRoles={["siswa"]} />}>
            <Route path="/student" element={<MonitoringStudentLayout />}>
              <Route index element={<MonitoringStudentDashboard />} />
              <Route path="absensi" element={<MonitoringAbsensi />} />
              <Route path="logbook" element={<MonitoringLogbook />} />
              <Route path="lokasi" element={<MonitoringLokasiPKL />} />
              <Route path="riwayat" element={<MonitoringRiwayatAbsensi />} />
              <Route path="profil" element={<MonitoringProfilSiswa />} />
              <Route path="administrasi" element={<AdministrasiSiswa />} />
              <Route path="kartu-pelajar" element={<KartuPelajarSiswa />} />
            </Route>
          </Route>

          {/* ── 404 fallback ── */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
        </BrowserRouter>
      </GlobalDialogProvider>
    </ErrorBoundary>
  );
}
