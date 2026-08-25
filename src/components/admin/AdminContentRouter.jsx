import { lazy } from'react';
import { BookOpen, MapPin, AlertCircle, ClipboardList, UserX } from'lucide-react';
import { parseCsvList, normalizeText, csvValueMatches, csvValuesIntersect, parseTeacherCodes, parsePositiveInt, getLoadKey } from'../../utils/adminHelpers.js';
import { FEATURE_TOGGLE_OPTIONS, DEFAULT_TABLE_SORTS, TABLE_SORT_OPTIONS } from'../../utils/constants.js';
import { Suspense } from'react';
import { Shield, Edit2, Lock, Trash2 } from'lucide-react';
import AbsensiSiswa from'../../pages/kedisiplinan/AbsensiSiswa.jsx';
import ManajemenPiket from'../../pages/kedisiplinan/ManajemenPiket.jsx';
import BKDashboard from'../../pages/kedisiplinan/BKDashboard.jsx';
import JurnalHarianGuru from'../../pages/kedisiplinan/JurnalHarianGuru.jsx';
import CatatanWaliKelas from'../../pages/kedisiplinan/CatatanWaliKelas.jsx';
import { PageHeader } from'../monitoring/ui/index.js';


const TabSilabus = lazy(() => import("../../pages/admin/tabs/TabSilabus.jsx"));
const TabGenerate = lazy(() => import("../../pages/admin/tabs/TabGenerate.jsx"));
const TabKetersediaan = lazy(() => import("../../pages/admin/tabs/TabKetersediaan.jsx"));
const TabAbsensi = lazy(() => import("../../pages/admin/tabs/TabAbsensi.jsx"));
const TabTampilan = lazy(() => import("../../pages/admin/tabs/TabTampilan.jsx"));
const MasterDataBeban = lazy(() => import("../../pages/admin/master_data/MasterDataBeban.jsx"));
const FasilitasRuangan = lazy(() => import("../../pages/admin/master_data/FasilitasRuangan.jsx"));
const MasterDataSiswa = lazy(() => import("../../pages/admin/master_data/MasterDataSiswa.jsx"));
const MasterDataKelas = lazy(() => import("../../pages/admin/master_data/MasterDataKelas.jsx"));
const MasterDataJurusan = lazy(() => import("../../pages/admin/master_data/MasterDataJurusan.jsx"));
const DataPegawai = lazy(() => import("../../pages/admin/master_data/DataPegawai.jsx"));
const MasterDataGuru = lazy(() => import("../../pages/admin/master_data/MasterDataGuru.jsx"));
const MasterDataKaryawan = lazy(() => import("../../pages/admin/master_data/MasterDataKaryawan.jsx"));
const DashboardPage = lazy(() => import("../../pages/DashboardPage.jsx"));
const MonitoringDataSiswa = lazy(() => import("../../pages/admin/master_data/DataSiswa.jsx"));
const RiwayatPrestasi = lazy(() => import("../../pages/kedisiplinan/RiwayatPrestasi.jsx"));
const MonitoringDataPerusahaan = lazy(() => import("../../pages/admin/master_data/DataPerusahaan.jsx"));
const MonitoringImportData = lazy(() => import("../../pages/admin/master_data/ImportData.jsx"));
const MonitoringPenugasan = lazy(() => import("../../pages/admin/pkl/PenugasanGuru.jsx"));
const KelolaAdministrasiPKL = lazy(() => import("../../pages/admin/pkl/KelolaAdministrasiPKL.jsx"));
const MonitoringJurnal = lazy(() => import("../../pages/admin/pkl/JurnalAdmin.jsx"));
const MonitoringLaporan = lazy(() => import("../../pages/admin/pkl/LaporanAdmin.jsx"));
const DashboardPKL = lazy(() => import("../../pages/admin/pkl/DashboardPKL.jsx"));
const AdminStrukturOrganisasi = lazy(() => import("../../pages/admin/pengaturan/AdminStrukturOrganisasi.jsx"));
const MonitoringAbsensiSettings = lazy(() => import("../../pages/admin/hikvision/AbsensiSettings.jsx"));
const HikvisionDashboard = lazy(() => import("../../pages/admin/hikvision/HikvisionDashboard.jsx"));
const HikvisionDevices = lazy(() => import("../../pages/admin/hikvision/HikvisionDevices.jsx"));
const HikvisionStudents = lazy(() => import("../../pages/admin/hikvision/HikvisionStudents.jsx"));
const LaporanAbsensi = lazy(() => import("../../pages/admin/hikvision/LaporanAbsensi.jsx"));
const HikvisionStudentReport = lazy(() => import("../../pages/admin/hikvision/HikvisionStudentReport.jsx"));
const HikvisionTeacherReport = lazy(() => import("../../pages/admin/hikvision/HikvisionTeacherReport.jsx"));
const HikvisionStaffReport = lazy(() => import("../../pages/admin/hikvision/HikvisionStaffReport.jsx"));
const ProfilSekolah = lazy(() => import("../../pages/admin/pengaturan/ProfilSekolah.jsx"));
const ManajemenAPIKey = lazy(() => import("../../pages/admin/pengaturan/ManajemenAPIKey.jsx"));
const IntegrasiWhatsApp = lazy(() => import("../../pages/admin/pengaturan/IntegrasiWhatsApp.jsx"));
const KartuPelajar = lazy(() => import("../../pages/admin/pengaturan/KartuPelajar.jsx"));
const ESurat = lazy(() => import("../../pages/admin/pengaturan/ESurat.jsx"));
const KenaikanKelas = lazy(() => import("../../pages/admin/pengaturan/KenaikanKelas.jsx"));
const AuditLog = lazy(() => import("../../pages/admin/pengaturan/AuditLog.jsx"));
const BackupGDrive = lazy(() => import("../../pages/admin/pengaturan/BackupGDrive.jsx"));
const TatibSkorKredit = lazy(() => import("../../pages/admin/pengaturan/TatibSkorKredit.jsx"));
const SiswaKeluar = lazy(() => import("../../pages/admin/pengaturan/SiswaKeluar.jsx"));
const ModulAjar = lazy(() => import("../../pages/admin/pengaturan/ModulAjar.jsx"));
const FiturManagement = lazy(() => import("../../pages/admin/pengaturan/FiturManagement.jsx"));
const TabHakAkses = lazy(() => import("../../pages/admin/tabs/TabHakAkses.jsx"));
const TabPesan = lazy(() => import("../../pages/admin/tabs/TabPesan.jsx"));
const TabPengaturanUser = lazy(() => import("../../pages/admin/tabs/TabPengaturanUser.jsx"));
const TabAkademik = lazy(() => import("../../pages/admin/tabs/TabAkademik.jsx"));
const TabPengaturan = lazy(() => import("../../pages/admin/tabs/TabPengaturan.jsx"));
const TabAdvancedRules = lazy(() => import("../../pages/admin/tabs/TabAdvancedRules.jsx"));
const TabKategoriKalender = lazy(() => import("../../pages/admin/tabs/TabKategoriKalender.jsx"));
const TabKategoriSilabus = lazy(() => import("../../pages/admin/tabs/TabKategoriSilabus.jsx"));
const TabAbsensiGuru = lazy(() => import("../../pages/admin/tabs/TabAbsensiGuru.jsx"));
const MyAttendancePage = lazy(() => import("../../pages/admin/tabs/MyAttendancePage.jsx"));
const TabSilabusGuru = lazy(() => import("../../pages/admin/tabs/TabSilabusGuru.jsx"));
const TabKeamanan = lazy(() => import('../../pages/admin/tabs/TabKeamanan.jsx'));
const ManajemenRole = lazy(() => import('../../pages/admin/tabs/ManajemenRole.jsx'));

export default function AdminContentRouter({ context }) {
  const tabProps = context;
  const {
    activeTab, currentUser, isSuperAdminRole, hasFeature, getTabPermissionLevel, hasPiket,
    normalizeUserRole, rolePermissions, saveDatabaseNow, classes, teachers, subjects,
    rooms, schedule, teachingLoads, openModal, setActiveTab, renderTable, checkDependencies,
    handleDelete, updateSelectionForTab, appSettings, setAppSettings, showNotification,
    teacherAvailability, handleSort, getTableSort, getActiveSortConfig, selectedRows,
    tablePage, setTablePage, itemsPerPage, getRowKeyForTab, tabSubtitles, searchTerm,
    getSearchTextForTab, handleSelectAll, activeUserRole, handleBulkDelete, layoutByDay,
    setLayoutByDay, roomLayout, setRoomLayout, layoutSettings, setLayoutSettings, generateRoomLayout,
    removeClassFromDenahSlot, renameRoomInline, updateKampusALabel, updateKampusBLabel, exportLayoutJson,
    majors, isGenerated, loadDistribution, subjectComposition, staffs, teacherTargetJpMap,
    teacherScheduleCountMap, quickEditGuruCode, quickGuruForm, setQuickGuruForm, setQuickEditGuruCode,
    saveQuickEditGuru, startQuickEditGuru, getPracticeRoomLabel, setStudents, students, setTeachers, setStaffs, getTeacherName,
    adminUser, setAdminUser, syncAuthSnapshotNow,
    setSearchTerm, setTableSorts, setLoadFilters, loadFilters, applyRecommendations, recommendedLoads,
    openImportGuide, downloadMasterTemplate, days, dashboardMessages, timeSlots,
    syllabuses, setSyllabuses, syllabusCategories, setSyllabusCategories, activityLogs,
    academicCalendar, calendarCategories, featureSettings, updateFeatureSettings, updateRolePermissions,
    attendanceRecords, attendanceSettings, updateAttendanceSettings,
    addDashboardMessage, updateDashboardMessage, removeDashboardMessage,
  } = context;

  const renderContent = () => {
    if (typeof window !== 'undefined' && setActiveTab) {
      window.__setActiveTab = setActiveTab;
    }
    const disabledFeatureMap = {
      absensi:"attendance",
      absensiguru:"attendance",
      silabusguru:"teacherSyllabus",
      pesan:"dashboardMessages"
    };
    const requiredFeature = disabledFeatureMap[activeTab];
    if (requiredFeature && !hasFeature(requiredFeature) && !isSuperAdminRole(currentUser?.role)) {
      const featureLabel = FEATURE_TOGGLE_OPTIONS.find(item => item.key === requiredFeature)?.label ||"Fitur";
      return <div className="bg-white border-none rounded-[var(--ui-radius-card)] shadow-sm p-6 text-center max-w-2xl mx-auto">
        <AlertCircle size={42} className="mx-auto text-amber-500 mb-3" />
        <h2 className="text-xl font-black text-slate-800">
          {featureLabel} sedang dinonaktifkan
        </h2>
        <p className="text-sm font-medium text-slate-500 mt-2">
          Fitur ini bisa digunakan kembali setelah admin mengaktifkannya dari
          Kontrol Fitur.
        </p>
      </div>;
    }

    // === KEAMANAN: Tab yang diizinkan per role ===
    const role = normalizeUserRole(currentUser?.role);
    const isTabReadOnly = tabKey => {
      const roleKey = normalizeUserRole(currentUser?.role);
      const division = (currentUser?.division || "").toLowerCase();

      if (tabKey === "akademik" || tabKey === "kalender" || tabKey === "kalender_akademik") {
        if (roleKey === "admin" || roleKey === "superadmin" || (roleKey === "waka" && division === "kurikulum")) {
          return false;
        }
        return true;
      }

      const kurikulumTabs = [
        "generate", "akademik", "silabus", "silabusguru", "modul_ajar",
        "ketersediaan", "beban", "kelas", "guru", "mapel", "jurnal_harian",
        "catatan_walikelas", "walas_report", "siswa", "pengaturan", "advanced_rules"
      ];
      if ((roleKey === "waka" && division === "kurikulum") || roleKey === "kurikulum") {
        if (kurikulumTabs.includes(tabKey)) return false;
      }

      const kesiswaanTabs = [
        "siswa", "kedisiplinan_absensi", "catatan_walikelas", "walas_report",
        "riwayat_prestasi", "kedisiplinan_bpbk", "kedisiplinan_piket", "tatib_skor",
        "siswa_keluar", "laporan_absensi", "hikvision_report_siswa", "pesan"
      ];
      if ((roleKey === "waka" && division === "kesiswaan") || roleKey === "kesiswaan") {
        if (kesiswaanTabs.includes(tabKey)) return false;
      }

      const level = getTabPermissionLevel(tabKey);
      if (level === "edit") return false;
      if (level === "view") return true;
      if (level === "otomatis") return activeUserRole === "kepsek";
      return activeUserRole === "kepsek";
    };
    const isTabAllowed = () => {
      if (role ==="admin" || role ==="superadmin") return true;
      if (activeTab ==="dashboard" || activeTab ==="akademik" || activeTab ==="kalender" || activeTab ==="kalender_akademik") return true;
      if (activeTab ==="kedisiplinan_piket" && role ==="guru") return true;
      if (activeTab ==="jurnal_harian" && role ==="guru") return true;

      // Allow all attendance report tabs for tu, tata_usaha, karyawan, kepsek, waka roles unconditionally
      const attendanceReportTabs = [
        "laporan_absensi", "hikvision_report_siswa", "hikvision_report_guru",
        "hikvision_report_karyawan", "absensi", "absensiguru", "kedisiplinan_absensi"
      ];
      if (attendanceReportTabs.includes(activeTab)) {
        if (role === "tu" || role === "tata_usaha" || role === "karyawan" || role === "kepsek" || role === "waka" || role === "guru") {
          return true;
        }
      }

      const checkAllowed = roleKey => {
        if (roleKey === "tu" || roleKey === "tata_usaha") {
          const tuAlwaysAllowed = [
            "dashboard","siswa","data_pegawai","karyawan","guru","kelas","jurusan",
            "absensi","absensiguru","riwayat_prestasi","siswa_keluar","laporan_absensi",
            "hikvision_report_guru","hikvision_report_karyawan","hikvision_report_siswa",
            "kedisiplinan_absensi","kartu_pelajar","esurat","generate"
          ];
          if (tuAlwaysAllowed.includes(activeTab)) return true;
        }

        const perms = rolePermissions?.[roleKey];
        if (!perms) {
          if (roleKey.startsWith("waka_")) {
            const wakaTabsByDivision = {
              kurikulum: ["dashboard","generate","akademik","silabus","modul_ajar","silabusguru","ketersediaan","beban","jurnal_harian","kelas","siswa","guru","karyawan","mapel","walas_report","catatan_walikelas","pesan","pengaturan","advanced_rules","hikvision_report_guru"],
              kesiswaan: ["dashboard","absensi","akademik","pesan","kedisiplinan_piket","kedisiplinan_bpbk","riwayat_prestasi","catatan_walikelas","walas_report","siswa_keluar","tatib_skor","kedisiplinan_absensi","laporan_absensi","hikvision_report_siswa","siswa"],
              sarpras: ["dashboard","ruangan","denah","kelas","generate","walas_report","catatan_walikelas","siswa","akademik","pesan"],
              humas: ["dashboard","pesan","tampilan","akademik","modul_ajar","walas_report","catatan_walikelas"],
              hubin: ["dashboard","pkl_dashboard","pkl_data_siswa","pkl_data_perusahaan","pkl_penugasan","pkl_administrasi","pkl_jurnal","pkl_laporan","pkl_absensi_setting","pesan","walas_report","catatan_walikelas"]
            };
            const div = roleKey.replace("waka_","");
            return (wakaTabsByDivision[div] || wakaTabsByDivision.kurikulum).includes(activeTab);
          }
          return false;
        }
        if (Array.isArray(perms)) {
          return perms.includes(activeTab) || (activeTab ==="modul_ajar" && (perms.includes("silabus") || perms.includes("silabusguru")));
        }
        const level = perms[activeTab];
        if (activeTab ==="modul_ajar") {
          const hasSyllabusPerm = perms["silabus"] && perms["silabus"] !=="none" && perms["silabus"] !=="nonaktif";
          const hasSyllabusGuruPerm = perms["silabusguru"] && perms["silabusguru"] !=="none" && perms["silabusguru"] !=="nonaktif";
          const hasModulAjarPerm = perms["modul_ajar"] && perms["modul_ajar"] !=="none" && perms["modul_ajar"] !=="nonaktif";
          return hasSyllabusPerm || hasSyllabusGuruPerm || hasModulAjarPerm;
        }
        if (roleKey === "guru" || roleKey === "walas" || roleKey === "walikelas" || roleKey === "bpbk") {
          const guruDefaultTabs = [
            "dashboard","generate","akademik","absensi","jurnal_harian",
            "catatan_walikelas","modul_ajar","walas_report","kedisiplinan_absensi",
            "absensiguru","silabusguru","ketersediaan","beban","pesan","kedisiplinan_piket"
          ];
          const guruPermissionedTabs = [
            "silabus","rpp_guru","siswa_keluar","tatib_skor","laporan_rekap_walas",
            "siswa","riwayat_prestasi","kedisiplinan_bpbk","hikvision_report_siswa"
          ];
          if (guruDefaultTabs.includes(activeTab)) return true;
          if (guruPermissionedTabs.includes(activeTab)) {
            // Only allowed if there's an explicit active permission level
            return level && level !== "none" && level !== "nonaktif";
          }
          return false;
        }
        if (roleKey ==="waka_kesiswaan" || roleKey ==="kesiswaan") {
          const defaultKesiswaanTabs = ["catatan_walikelas","walas_report","siswa_keluar","tatib_skor","kedisiplinan_absensi","riwayat_prestasi","kedisiplinan_bpbk","kedisiplinan_piket","laporan_absensi","hikvision_report_siswa","siswa","absensi"];
          if (defaultKesiswaanTabs.includes(activeTab) && (level === undefined || level ==="otomatis" || level ==="edit" || level ==="view")) return true;
        }
        if (roleKey ==="waka_kurikulum" || roleKey ==="kurikulum") {
          const defaultKurikulumTabs = ["generate","akademik","silabus","modul_ajar","silabusguru","ketersediaan","beban","jurnal_harian","kelas","siswa","guru","karyawan","mapel","walas_report","catatan_walikelas","pengaturan","advanced_rules"];
          if (defaultKurikulumTabs.includes(activeTab) && (level === undefined || level ==="otomatis" || level ==="edit" || level ==="view")) return true;
        }
        return level && level !=="none" && level !=="nonaktif";
      };
      if (role === "guru") {
        // Guru dengan subrole menggunakan permission subrole mereka
        const subrole = currentUser?.subrole;
        if (subrole) {
          const subroleAllowed = checkAllowed(subrole);
          // Juga cek permission guru default sebagai fallback
          const guruAllowed = checkAllowed("guru");
          return subroleAllowed || guruAllowed;
        }
        return checkAllowed("guru");
      }
      const safeGlobalTabs = ["dashboard", "akademik", "kalender", "kalender_akademik", "pesan"];
      if (safeGlobalTabs.includes(activeTab)) return true;

      if (role === "karyawan") {
        const subrole = currentUser?.subrole;
        if (subrole) {
          return checkAllowed(subrole) || checkAllowed("karyawan");
        }
        return checkAllowed("karyawan");
      }
      if (role === "tu" || role === "tata_usaha") {
        const subrole = currentUser?.subrole;
        if (subrole && (subrole === "sekretaris_tu" || subrole === "bendahara")) {
          return checkAllowed(subrole) || checkAllowed("tu");
        }
        return checkAllowed("tu");
      }

      const commonRoleTabs = ["dashboard","generate","akademik","kalender","kalender_akademik","absensi","jurnal_harian","catatan_walikelas","modul_ajar","walas_report","pesan","kedisiplinan_piket"];
      if (commonRoleTabs.includes(activeTab)) return true;
      if (role ==="kepsek") {
        const kepsekAllowedTabs = [...commonRoleTabs, "siswa","guru","data_pegawai"];
        if (kepsekAllowedTabs.includes(activeTab)) return true;
        return checkAllowed("kepsek");
      }
      if (role ==="waka") {
        const division = (currentUser?.division ||"kurikulum").toLowerCase();
        if (division === "kurikulum") {
          const kurikulumAllowedTabs = [
            "generate", "akademik", "silabus", "modul_ajar", "silabusguru", "ketersediaan",
            "beban", "jurnal_harian", "kelas", "siswa", "guru", "karyawan", "mapel",
            "walas_report", "catatan_walikelas", "pengaturan", "advanced_rules", "dashboard"
          ];
          if (kurikulumAllowedTabs.includes(activeTab)) return true;
        }
        const wakaCommonTabs = [...commonRoleTabs, "siswa","guru","fasilitas","ruangan","beban","siswa_keluar","kenaikan_kelas","struktur","riwayat_prestasi","kedisiplinan_bpbk","tatib_skor","laporan_absensi","hikvision_report_siswa"];
        if (wakaCommonTabs.includes(activeTab)) return true;
        return checkAllowed(`waka_${division}`);
      }
      return checkAllowed(role);
    };
    if (!isTabAllowed()) {
      return <div className="bg-white border-none rounded-[var(--ui-radius-card)] shadow-sm p-8 text-center max-w-xl mx-auto">
        <Shield size={42} className="mx-auto text-slate-300 mb-3" />
        <h3 className="text-lg font-black text-slate-700">Akses Dibatasi</h3>
        <p className="text-sm font-medium text-slate-400 mt-1">
          Anda tidak memiliki izin untuk mengakses halaman ini. Hubungi
          Administrator jika ini merupakan kesalahan.
        </p>
      </div>;
    }
    switch (activeTab) {
      case"dashboard":
        return <DashboardPage currentUser={currentUser} isGenerated={isGenerated} classes={classes} teachers={teachers} subjects={subjects} rooms={rooms} schedule={schedule} teachingLoads={teachingLoads} loadDistribution={loadDistribution} subjectComposition={subjectComposition} openModal={openModal} setActiveTab={setActiveTab} saveDatabaseNow={saveDatabaseNow} setTeachers={setTeachers} adminUser={adminUser} setAdminUser={setAdminUser} syncAuthSnapshotNow={syncAuthSnapshotNow} handleLogout={context.handleLogout} onOpenProfile={context.onOpenProfile} />;
      case"fitur":
        return <FiturManagement activeTab={activeTab} setActiveTab={setActiveTab} />;
      case "hak_akses":
        return <TabHakAkses {...tabProps} />;
      case "manajemen_role":
        return (
          <Suspense fallback={<div className="p-8 text-center text-slate-500 animate-pulse">Memuat...</div>}>
            <ManajemenRole
              teachers={context.teachers}
              staffs={context.staffs}
              classes={context.classes}
              setTeachers={context.setTeachers}
              setStaffs={context.setStaffs}
              saveDatabaseNow={context.saveDatabaseNow}
              showNotification={context.showNotification}
              isSuperAdminRole={context.isSuperAdminRole}
              currentUser={context.currentUser}
              rolePermissions={context.rolePermissions}
              adminUser={context.adminUser}
              syncAuthSnapshotNow={context.syncAuthSnapshotNow}
            />
          </Suspense>
        );
      case"pesan":
        return <TabPesan {...tabProps} />;
      case"pengaturanuser":
        return <TabPengaturanUser {...tabProps} />;
      case"akademik":
      case"kalender":
      case"kalender_akademik":
        return <TabAkademik {...tabProps} />;
      case"siswa":
        return <Suspense fallback={<div className="p-8 text-center text-slate-500 animate-pulse">
          Memuat Data...
        </div>}>
          <MasterDataSiswa students={students} classes={classes} majors={majors} updateSelectionForTab={updateSelectionForTab} openModal={openModal} checkDependencies={checkDependencies} handleDelete={handleDelete} renderTable={renderTable} setStudents={setStudents} saveDatabaseNow={saveDatabaseNow} isViewOnly={getTabPermissionLevel("siswa") ==="view" || getTabPermissionLevel("siswa") ==="otomatis" && activeUserRole ==="kepsek"} />
        </Suspense>;
      case"kelas":
        return <Suspense fallback={<div className="p-8 text-center text-slate-500 animate-pulse">
          Memuat Data Kelas...
        </div>}>
          <MasterDataKelas classes={classes} teachers={teachers} updateSelectionForTab={updateSelectionForTab} openModal={openModal} checkDependencies={checkDependencies} handleDelete={handleDelete} renderTable={renderTable} />
        </Suspense>;
      case"jurusan":
        return <Suspense fallback={<div className="p-8 text-center text-slate-500 animate-pulse">
          Memuat Data Jurusan...
        </div>}>
          <MasterDataJurusan majors={majors} classes={classes} updateSelectionForTab={updateSelectionForTab} openModal={openModal} checkDependencies={checkDependencies} handleDelete={handleDelete} renderTable={renderTable} />
        </Suspense>;
      case "data_pegawai":
      case "guru":
      case "karyawan":
        return <Suspense fallback={<div className="p-8 text-center text-slate-500 animate-pulse">
          Memuat Data Pegawai...
        </div>}>
          <DataPegawai 
            initialTab={activeTab === "karyawan" ? "karyawan" : "guru"}
            teachers={teachers} 
            staffs={staffs} 
            classes={classes} 
            teacherTargetJpMap={teacherTargetJpMap} 
            teacherScheduleCountMap={teacherScheduleCountMap} 
            quickEditGuruCode={quickEditGuruCode} 
            quickGuruForm={quickGuruForm} 
            setQuickGuruForm={setQuickGuruForm} 
            setQuickEditGuruCode={setQuickEditGuruCode} 
            updateSelectionForTab={updateSelectionForTab} 
            openModal={openModal} 
            checkDependencies={checkDependencies} 
            handleDelete={handleDelete} 
            saveQuickEditGuru={saveQuickEditGuru} 
            startQuickEditGuru={startQuickEditGuru} 
            renderTable={renderTable} 
            setTeachers={setTeachers}
            setStaffs={setStaffs}
            saveDatabaseNow={saveDatabaseNow}
            isViewOnly={getTabPermissionLevel("data_pegawai") !== "edit" && getTabPermissionLevel("guru") !== "edit"}
          />
        </Suspense>;
      case"mapel":
        return renderTable("Kelola Mata Pelajaran", ["Nama Mapel","Tingkat","Jurusan","Sifat Mapel","Ruangan Praktik","Durasi"], subjects, (item, idx, isSelected) => <tr key={item.name} className={`hover:bg-slate-50/50 transition-colors ${isSelected ?"bg-[var(--ui-accent)]/20/40" :""}`}>
          <td className="px-4 py-4 text-center">
            <input type="checkbox" checked={isSelected} onChange={() => updateSelectionForTab("mapel", current => current.includes(item.name) ? current.filter(x => x !== item.name) : [...current, item.name])} className="accent-[var(--ui-primary)] cursor-pointer" aria-label={`Pilih mapel ${item.name}`} />
          </td>
          <td className="px-6 py-4 text-center font-bold text-slate-400">
            {idx + 1}
          </td>
          <td className="px-6 py-4 font-bold text-slate-800">
            {item.name}
          </td>
          <td className="px-6 py-4 font-black text-slate-700">
            {item.grade}
          </td>
          <td className="px-6 py-4 font-medium text-slate-600">
            {item.major}
          </td>
          <td className="px-6 py-4">
            <span className={`px-3 py-1 rounded-[var(--ui-radius-small)] text-[10px] font-bold uppercase tracking-wider ${item.isBlock ?"bg-[var(--ui-accent)]/20 text-[var(--ui-primary)]" :"bg-slate-100 text-slate-600"}`}>
              {item.isBlock ?"Praktik / Bengkel" :"Teori Reguler"}
            </span>
          </td>
          <td className="px-6 py-4 font-medium text-slate-600">
            <div className="max-w-[260px]">
              <div className="text-xs font-bold text-slate-700 leading-snug">
                {getPracticeRoomLabel(item.practiceRoomIds)}
              </div>
              {item.isBlock && !parseCsvList(item.practiceRoomIds).length && <div className="text-[10px] font-semibold text-emerald-600 mt-1">
                Semua ruang praktik aktif
              </div>}
            </div>
          </td>
          <td className="px-6 py-4 font-medium text-slate-600">
            {item.defaultDuration} Jam
          </td>
          <td className="px-6 py-4 text-right">
            <div className="flex justify-end gap-2">
              <button onClick={() => openModal("mapel","edit", item)} className="p-2 text-slate-400 hover:text-[var(--ui-primary)] bg-white hover:bg-[var(--ui-accent)]/20 border-none rounded-[var(--ui-radius-small)] transition-colors cursor-pointer">
                <Edit2 size={14} />
              </button>
              {(() => {
                const deps = checkDependencies("mapel", item.name);
                if (deps.length > 0) {
                  return (
                    <button 
                      onClick={() => openModal('lock_info', 'view', { type: 'mapel', name: `Mata Pelajaran: ${item.name}`, deps })}
                      title="Klik untuk melihat detail koneksi data"
                      className="p-2 text-amber-600 bg-amber-50 hover:bg-amber-100 border border-amber-200/80 rounded-[var(--ui-radius-small)] transition-colors cursor-pointer"
                    >
                      <Lock size={14} className="text-amber-500" />
                    </button>
                  );
                }
                return <button onClick={() => handleDelete("mapel", item.name)} className="p-2 text-slate-400 hover:text-rose-600 bg-white hover:bg-red-50 border-none rounded-[var(--ui-radius-small)] transition-colors cursor-pointer" title="Hapus">
                  <Trash2 size={14} />
                </button>;
              })()}
            </div>
          </td>
        </tr>, { 
          pageHeader: (
            <div className="space-y-4 mb-4">
              <PageHeader title="Mata Pelajaran" icon={BookOpen} description="Kelola daftar mata pelajaran beserta alokasi waktu dan jenis ruangannya." />
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <div className="ui-card p-3.5 sm:p-4 rounded-[var(--ui-radius-card)] bg-white border border-slate-200/80 shadow-xs flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-[var(--ui-radius-small)] bg-[var(--ui-primary)]/10 text-[var(--ui-primary)] flex items-center justify-center shrink-0">
                    <BookOpen size={20} strokeWidth={2.2} />
                  </div>
                  <div>
                    <div className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">TOTAL MAPEL</div>
                    <div className="text-xl font-black text-slate-800">{subjects.length}</div>
                  </div>
                </div>
                <div className="ui-card p-3.5 sm:p-4 rounded-[var(--ui-radius-card)] bg-white border border-slate-200/80 shadow-xs flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-[var(--ui-radius-small)] bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <BookOpen size={20} strokeWidth={2.2} />
                  </div>
                  <div>
                    <div className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">MAPEL TEORI</div>
                    <div className="text-xl font-black text-slate-800">{subjects.filter(s => !s.isBlock).length}</div>
                  </div>
                </div>
                <div className="ui-card p-3.5 sm:p-4 rounded-[var(--ui-radius-card)] bg-white border border-slate-200/80 shadow-xs flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-[var(--ui-radius-small)] bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                    <BookOpen size={20} strokeWidth={2.2} />
                  </div>
                  <div>
                    <div className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">MAPEL PRAKTIK</div>
                    <div className="text-xl font-black text-slate-800">{subjects.filter(s => s.isBlock).length}</div>
                  </div>
                </div>
                <div className="ui-card p-3.5 sm:p-4 rounded-[var(--ui-radius-card)] bg-white border border-slate-200/80 shadow-xs flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-[var(--ui-radius-small)] bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    <BookOpen size={20} strokeWidth={2.2} />
                  </div>
                  <div>
                    <div className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">JURUSAN TERKAIT</div>
                    <div className="text-xl font-black text-slate-800">{new Set(subjects.map(s => s.major).filter(Boolean)).size}</div>
                  </div>
                </div>
              </div>
            </div>
          )
        });
      case"ruangan":
      case"fasilitas":
        return <Suspense fallback={<div className="p-8 text-center text-slate-500 animate-pulse">
          Memuat Fasilitas & Ruangan...
        </div>}>
          <FasilitasRuangan rooms={rooms} updateSelectionForTab={updateSelectionForTab} openModal={openModal} checkDependencies={checkDependencies} handleDelete={handleDelete} renderTable={renderTable} tabProps={tabProps} />
        </Suspense>;
      case"ketersediaan":
        return <TabKetersediaan {...tabProps} />;
      case"generate":
        return <TabGenerate {...tabProps} />;
      case"pengaturan":
        return <TabPengaturan {...tabProps} />;
      case"advanced_rules":
        return <TabAdvancedRules {...tabProps} />;
      case"struktur":
        return <Suspense fallback={<div className="p-12 text-center text-slate-500 font-bold animate-pulse">
          Memuat Struktur...
        </div>}>
          <AdminStrukturOrganisasi appSettings={appSettings} setAppSettings={setAppSettings} onSave={saveDatabaseNow} showNotification={showNotification} teachers={teachers} />
        </Suspense>;
      case"tampilan":
        return <TabTampilan {...tabProps} />;
      case"absensi":
        return <TabAbsensi {...tabProps} />;
      case"kategori_kalender":
        return <TabKategoriKalender {...tabProps} />;
      case"kategori_silabus":
        return <TabKategoriSilabus {...tabProps} />;

      case "absensiguru":
        // Guru/karyawan lihat kalender absensi pribadi; admin/waka/kepsek lihat rekap semua guru
        if (currentUser?.role === "guru" || currentUser?.role === "karyawan") {
          return <Suspense fallback={<div className="animate-spin h-8 w-8 border-4 border-[var(--ui-primary)] border-t-transparent rounded-[var(--ui-radius-small)] mx-auto mt-20" />}><MyAttendancePage setActiveTab={setActiveTab} /></Suspense>;
        }
        return <Suspense fallback={<div className="animate-spin h-8 w-8 border-4 border-[var(--ui-primary)] border-t-transparent rounded-[var(--ui-radius-small)] mx-auto mt-20" />}><HikvisionTeacherReport /></Suspense>;
      case"keamanan":
        return <TabKeamanan {...tabProps} />;
      case"pkl_dashboard":
        return <Suspense fallback={<div className="animate-spin h-8 w-8 border-4 border-[var(--ui-primary)] border-t-transparent rounded-[var(--ui-radius-small)] mx-auto mt-20" />}>
          <DashboardPKL />
        </Suspense>;
      case"pkl_data_siswa":
        return <Suspense fallback={<div className="animate-spin h-8 w-8 border-4 border-[var(--ui-primary)] border-t-transparent rounded-[var(--ui-radius-small)] mx-auto mt-20" />}>
          <MonitoringDataSiswa students={students} teachers={teachers} readOnly={isTabReadOnly("pkl_data_siswa")} appSettings={appSettings} setAppSettings={setAppSettings} onSave={saveDatabaseNow} setActiveTab={setActiveTab} />
        </Suspense>;
      case"pkl_import":
        return <Suspense fallback={<div className="animate-spin h-8 w-8 border-4 border-[var(--ui-primary)] border-t-transparent rounded-[var(--ui-radius-small)] mx-auto mt-20" />}>
          <MonitoringImportData teachers={teachers} students={students} authToken={currentUser?.authToken || ''} setActiveTab={setActiveTab} />
        </Suspense>;
      case"pkl_data_perusahaan":
        return <Suspense fallback={<div className="animate-spin h-8 w-8 border-4 border-[var(--ui-primary)] border-t-transparent rounded-[var(--ui-radius-small)] mx-auto mt-20" />}>
          <MonitoringDataPerusahaan students={students} readOnly={isTabReadOnly("pkl_data_perusahaan")} majors={majors} />
        </Suspense>;
      case"pkl_penugasan":
        return <Suspense fallback={<div className="animate-spin h-8 w-8 border-4 border-[var(--ui-primary)] border-t-transparent rounded-[var(--ui-radius-small)] mx-auto mt-20" />}>
          <MonitoringPenugasan students={students} teachers={teachers} readOnly={isTabReadOnly("pkl_penugasan")} />
        </Suspense>;
      case"pkl_lokasi":
        // Redirect pkl_lokasi → pkl_data_perusahaan (merged)
        setActiveTab("pkl_data_perusahaan");
        return null;
      case"pkl_administrasi":
        return <Suspense fallback={<div className="animate-spin h-8 w-8 border-4 border-[var(--ui-primary)] border-t-transparent rounded-[var(--ui-radius-small)] mx-auto mt-20" />}>
          <KelolaAdministrasiPKL readOnly={isTabReadOnly("pkl_administrasi")} appSettings={appSettings} setAppSettings={setAppSettings} onSave={saveDatabaseNow} />
        </Suspense>;
      case"pkl_jurnal":
        return <Suspense fallback={<div className="animate-spin h-8 w-8 border-4 border-[var(--ui-primary)] border-t-transparent rounded-[var(--ui-radius-small)] mx-auto mt-20" />}>
          <MonitoringJurnal readOnly={isTabReadOnly("pkl_jurnal")} />
        </Suspense>;
      case"pkl_laporan":
        return <Suspense fallback={<div className="p-8 text-center">
          <span className="w-6 h-6 border-2 border-[var(--ui-primary)] border-t-transparent rounded-full animate-spin inline-block"></span>
        </div>}>
          <MonitoringLaporan readOnly={isTabReadOnly("pkl_laporan")} students={students} teachers={teachers} />
        </Suspense>;
      case"pkl_absensi_setting":
        return <Suspense fallback={<div className="animate-spin h-8 w-8 border-4 border-[var(--ui-primary)] border-t-transparent rounded-[var(--ui-radius-small)] mx-auto mt-20" />}>
          <MonitoringAbsensiSettings readOnly={isTabReadOnly("pkl_absensi_setting")} />
        </Suspense>;
      case"hikvision":
        return <Suspense fallback={<div className="p-8 text-center text-slate-400">
          Memuat Hikvision...
        </div>}>
          <HikvisionDashboard />
        </Suspense>;
      case"laporan_absensi":
        return <Suspense fallback={<div className="p-12 text-center text-slate-500 font-bold animate-pulse">Memuat Laporan Absensi...</div>}>
          <LaporanAbsensi classes={classes} students={students} />
        </Suspense>;
      case"hikvision_devices":
        return <Suspense fallback={<div className="p-8 text-center text-slate-400">
          Memuat Mesin...
        </div>}>
          <HikvisionDevices />
        </Suspense>;
      case"hikvision_report_guru":
        return <Suspense fallback={<div className="p-12 text-center text-slate-500 font-bold animate-pulse">Memuat laporan absensi guru...</div>}>
          <HikvisionTeacherReport />
        </Suspense>;
      case"hikvision_report_karyawan":
        return <Suspense fallback={<div className="p-12 text-center text-slate-500 font-bold animate-pulse">Memuat laporan absensi karyawan...</div>}>
          <HikvisionStaffReport classes={classes} />
        </Suspense>;
      case "kedisiplinan_absensi":
        return <Suspense fallback={<div className="p-12 text-center text-slate-500 font-bold animate-pulse">Memuat data izin & sakit siswa...</div>}>
          <AbsensiSiswa classes={classes} students={students} />
        </Suspense>;
      case "hikvision_report_siswa":
      case "walas_report":
      case "laporan_rekap_walas":
        return <Suspense fallback={<div className="p-12 text-center text-slate-500 font-bold animate-pulse">Memuat laporan kelas...</div>}>
          <HikvisionStudentReport classes={classes} students={students} activeTab={activeTab} />
        </Suspense>;
      case "absensiguru":
        return <Suspense fallback={<div className="p-12 text-center text-slate-500 font-bold animate-pulse">Memuat absensi guru...</div>}>
          <TabAbsensiGuru {...context} />
        </Suspense>;
      case "absensi":
        return <Suspense fallback={<div className="p-12 text-center text-slate-500 font-bold animate-pulse">Memuat absensi...</div>}>
          <TabAbsensi {...context} />
        </Suspense>;
      case"hikvision_students":
        return <Suspense fallback={<div className="p-12 text-center text-slate-500 font-bold animate-pulse">
          Memuat data pengguna mesin...
        </div>}>
          <HikvisionStudents classes={classes} />
        </Suspense>;


      case"kedisiplinan_piket":
        return <ManajemenPiket teachers={teachers} students={students} classes={classes} currentUser={currentUser} />;
      case"kedisiplinan_bpbk":
        return <BKDashboard teachers={teachers} students={students} classes={classes} />;
      case"jurnal_harian":
        return <JurnalHarianGuru classes={classes} teachers={teachers} schedule={schedule} onBack={() => setActiveTab('dashboard')} />;
      case"catatan_walikelas":
        return <CatatanWaliKelas students={students} classes={classes} onBack={() => setActiveTab('dashboard')} />;

      case"riwayat_prestasi":
        return <Suspense fallback={<div className="p-12 text-center text-slate-500 font-bold animate-pulse">Memuat Riwayat Prestasi...</div>}>
          <RiwayatPrestasi students={students} classes={classes} />
        </Suspense>;

      // === NEW FEATURES ===
      case"profil_sekolah":
        return <Suspense fallback={<div className="p-12 text-center text-slate-500 font-bold animate-pulse">
          Memuat Profil...
        </div>}>
          <>
            <ProfilSekolah appSettings={appSettings} setAppSettings={setAppSettings} onSave={saveDatabaseNow} showNotification={showNotification} />
          </>
        </Suspense>;
      case"api_keys":
        return <Suspense fallback={<div className="p-12 text-center text-slate-500 font-bold animate-pulse">
          Memuat API Keys...
        </div>}>
          <>
            <ManajemenAPIKey activeTab={activeTab} setActiveTab={setActiveTab} />
          </>
        </Suspense>;
      case"whatsapp":
        return <Suspense fallback={<div className="p-12 text-center text-slate-500 font-bold animate-pulse">
          Memuat WhatsApp...
        </div>}>
          <>
            <IntegrasiWhatsApp activeTab={activeTab} setActiveTab={setActiveTab} />
          </>
        </Suspense>;
      case"kartu_pelajar":
        return <Suspense fallback={<div className="p-12 text-center text-slate-500 font-bold animate-pulse">
          Memuat Kartu Pelajar...
        </div>}>
          <KartuPelajar students={students} />
        </Suspense>;
      case "esurat":
        return <Suspense fallback={<div className="p-12 text-center text-slate-500 font-bold animate-pulse">
          Memuat E-Surat...
        </div>}>
          <ESurat appSettings={appSettings} setAppSettings={setAppSettings} onSave={saveDatabaseNow} />
        </Suspense>;
      case"kenaikan_kelas":
        return <Suspense fallback={<div className="p-12 text-center text-slate-500 font-bold animate-pulse">
          Memuat Kenaikan Kelas...
        </div>}>
          <KenaikanKelas appSettings={appSettings} />
        </Suspense>;
      case"audit_log":
        return <Suspense fallback={<div className="p-12 text-center text-slate-500 font-bold animate-pulse">
          Memuat Audit Log...
        </div>}>
          <AuditLog activeTab={activeTab} setActiveTab={setActiveTab} />
        </Suspense>;
      case"gdrive_backup":
        return <Suspense fallback={<div className="p-12 text-center text-slate-500 font-bold animate-pulse">
          Memuat GDrive Backup...
        </div>}>
          <BackupGDrive activeTab={activeTab} setActiveTab={setActiveTab} />
        </Suspense>;
      case"siswa_keluar":
        return <Suspense fallback={<div className="p-12 text-center text-slate-500 font-bold animate-pulse">
          Memuat Pendataan Siswa Keluar...
        </div>}>
          <SiswaKeluar />
        </Suspense>;
      case"tatib_skor":
        return <Suspense fallback={<div className="p-12 text-center text-slate-500 font-bold animate-pulse">
          Memuat Tatib Skor Kredit...
        </div>}>
          <TatibSkorKredit />
        </Suspense>;
      case"silabus":
      case"silabusguru":
      case"rpp_guru":
      case"modul_ajar":
        return <Suspense fallback={<div className="p-12 text-center text-slate-500 font-bold animate-pulse">
          Memuat Modul Ajar...
        </div>}>
          <ModulAjar {...context} />
        </Suspense>;
      case"beban":
        return <Suspense fallback={<div className="p-12 text-center text-slate-500 font-bold animate-pulse">
          Memuat Beban Mengajar...
        </div>}>
          <MasterDataBeban teachingLoads={teachingLoads} teachers={teachers} subjects={subjects} classes={classes} updateSelectionForTab={updateSelectionForTab} openModal={openModal} checkDependencies={checkDependencies} handleDelete={handleDelete} renderTable={renderTable} isSuperAdminRole={isSuperAdminRole} currentUser={currentUser} getTeacherName={getTeacherName} normalizeText={normalizeText} searchTerm={searchTerm} loadFilters={loadFilters} csvValueMatches={csvValueMatches} parseTeacherCodes={parseTeacherCodes} getActiveSortConfig={getActiveSortConfig} TABLE_SORT_OPTIONS={TABLE_SORT_OPTIONS} selectedRows={selectedRows} getTableSort={getTableSort} getLoadKey={getLoadKey} teacherAvailability={teacherAvailability} recommendedLoads={recommendedLoads} parsePositiveInt={parsePositiveInt} openImportGuide={openImportGuide} downloadMasterTemplate={downloadMasterTemplate} applyRecommendations={applyRecommendations} handleBulkDelete={handleBulkDelete} setSearchTerm={setSearchTerm} setLoadFilters={setLoadFilters} majors={majors} setTableSorts={setTableSorts} DEFAULT_TABLE_SORTS={DEFAULT_TABLE_SORTS} csvValuesIntersect={csvValuesIntersect} />
        </Suspense>;
      default:
        return <div className="flex flex-col items-center justify-center h-full text-slate-500">
          <PageHeader title="Kasus & Pelanggaran (BP/BK)" icon={AlertCircle} description={tabSubtitles["kedisiplinan_bpbk"] || tabSubtitles["default"]} />
          <PageHeader title="Laporan Guru Piket" icon={ClipboardList} description={tabSubtitles["kedisiplinan_piket"] || tabSubtitles["default"]} />
          <PageHeader title="Laporan Kedisiplinan Absensi" icon={UserX} description={tabSubtitles["kedisiplinan_absensi"] || tabSubtitles["default"]} />
          <PageHeader title="Lokasi PKL" icon={MapPin} description={tabSubtitles["pkl_lokasi"] || tabSubtitles["default"]} />
          <h2 className="text-2xl font-bold mb-2">Halaman {activeTab}</h2>
          <p>Konten untuk halaman ini belum tersedia.</p>
        </div>;
    }
  };

  return renderContent();
}
