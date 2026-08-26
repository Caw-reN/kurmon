import { Button, UITimeInput24, UISelect } from '../../../components/ui.jsx';
import React from'react';
import { ClipboardList, Settings, FileText, History } from'lucide-react';
import { getAttendanceSessions, getAttendanceStatusTone } from'../../../utils/adminHelpers.js';
import { ATTENDANCE_MODE_OPTIONS, ATTENDANCE_STATUS_OPTIONS, ATTENDANCE_SESSION_TYPES } from'../../../utils/constants.js';
import { Suspense } from'react';
import { FileDown, Trash2, CheckCircle2, Plus, X } from'lucide-react';
import { PageHeader } from '../../../components/monitoring/ui/index.js';


const HikvisionTeacherReport = React.lazy(() => import('../../../pages/admin/hikvision/HikvisionTeacherReport.jsx'));

export default function TabAbsensi(props) {
  const { 
    currentUser, 
    isSuperAdminRole, 
    isLeadershipRole, 
    attendanceSettings, 
    attendanceCorrections, 
    tabSubtitles, 
    setAttendanceSubTab, 
    attendanceSubTab, 
    hasFeature, 
    exportAttendanceToExcel, 
    setConfirmDialog, 
    attendanceRecords, 
    clearAttendanceRecords, 
    attendanceFilters, 
    setAttendanceFilters, 
    teachers, 
    filteredAttendanceRecords,
    getTeacherName,
    handleRemoveAttendanceRecordSafe,
    attendanceMode,
    ensureDatabaseReadyForWrite,
    attendanceQrPayload,
    attendanceQrDataUrl,
    addAttendanceSession,
    updateAttendanceSession,
    days,
    removeAttendanceSession,
    activeUserRole,
    handleReviewAttendanceCorrection,
    updateAttendanceSettings,
    ...tabProps 
  } = props;

      
  const role = currentUser ? currentUser.role : null;
  const canManageAttendance = isSuperAdminRole(role);
  const canReviewAttendance = isLeadershipRole(role);
  const attendanceSessions = getAttendanceSessions(attendanceSettings);
  const sortedAttendanceCorrections = [
    ...(attendanceCorrections || []),
  ].sort(
    (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0),
  );
  const pendingAttendanceCorrections = sortedAttendanceCorrections.filter(
    (request) => (request.statusReview ||"pending") ==="pending",
  );
  const headerTabs = [
    {
      id:"report",
      label:"Laporan",
      icon: ClipboardList,
    },
    {
      id:"history",
      label:"Riwayat Absensi Guru",
      icon: History,
    },
    {
      id:"settings",
      label:"Pengaturan GPS & Sesi",
      icon: Settings,
    },
  ];

  if (canReviewAttendance) {
    headerTabs.push({
      id:"corrections",
      label: pendingAttendanceCorrections.length > 0 
        ? `Pengajuan Koreksi (${pendingAttendanceCorrections.length})` 
        :"Pengajuan Koreksi",
      icon: FileText,
    });
  }

  return (
    <div className="flex flex-col gap-6 h-full  w-full animate-in fade-in duration-300 relative z-10">
      <PageHeader
        title="Rekap Absensi"
        icon={ClipboardList}
        description={tabSubtitles["absensi"]}
        tabs={headerTabs}
        activeTab={attendanceSubTab}
        onTabChange={setAttendanceSubTab}
      />

      {/* TAB CONTENTS */}
      {attendanceSubTab ==="history" && (
        <div className="bg-white border-none rounded-[var(--ui-radius-card)] shadow-sm p-6 flex flex-col flex-1 overflow-hidden min-h-0">
            <div className="flex flex-col xl:flex-row justify-between xl:items-center gap-4 mb-6 shrink-0 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-xl font-black text-slate-800 tracking-tight">
                  Riwayat Absensi Guru
                </h2>
                <p className="text-sm text-slate-500 font-medium">
                  Log absensi harian guru via GPS / Manual (terbaru paling atas).
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest shrink-0">Tanggal:</span>
                  <input
                    type="date"
                    value={attendanceFilters.date}
                    onChange={(e) =>
                      setAttendanceFilters({
                        ...attendanceFilters,
                        date: e.target.value
                      })
                    }
                    className="border border-slate-200 bg-slate-50/50 p-2 rounded-[var(--ui-radius-small)] text-xs font-bold focus:bg-white focus:outline-[var(--ui-primary)]"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest shrink-0">Guru:</span>
                  <UISelect
                    value={attendanceFilters.teacher}
                    onChange={(e) =>
                      setAttendanceFilters({
                        ...attendanceFilters,
                        teacher: e.target.value
                      })
                    }
                    className="border border-slate-200 bg-slate-50/50 p-2 rounded-[var(--ui-radius-small)] text-xs font-bold min-w-[130px]"
                  >
                    <option value="All">Semua Guru</option>
                    {(teachers || []).map((teacher) => (
                      <option key={teacher.code} value={teacher.code}>
                        {teacher.code} - {teacher.name}
                      </option>
                    ))}
                  </UISelect>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest shrink-0">Status:</span>
                  <UISelect
                    value={attendanceFilters.status}
                    onChange={(e) =>
                      setAttendanceFilters({
                        ...attendanceFilters,
                        status: e.target.value
                      })
                    }
                    className="border border-slate-200 bg-slate-50/50 p-2 rounded-[var(--ui-radius-small)] text-xs font-bold min-w-[120px]"
                  >
                    <option value="All">Semua Status</option>
                    {ATTENDANCE_STATUS_OPTIONS.map((status) => (
                      <option key={status.value} value={status.value}>
                        {status.label}
                      </option>
                    ))}
                  </UISelect>
                </div>

                <div className="flex items-center gap-2 ml-auto lg:ml-0">
                  {hasFeature("attendanceExport") && (
                    <Button variant="outline"
                      onClick={exportAttendanceToExcel}
                     ><FileDown size={14} className="inline-block mr-1" /> Export</Button>
                  )}
                  {canManageAttendance && attendanceRecords?.length > 0 && (
                    <Button variant="outline"
                      onClick={() =>{
                        setConfirmDialog({
                          isOpen: true,
                          message:"Yakin ingin menghapus SEMUA data absensi?",
                          onConfirm: () => {
                            clearAttendanceRecords();
                            setConfirmDialog({
                              isOpen: false,
                              message:"",
                              onConfirm: null
                            });
                          }
                        });
                      }}
                      
                    >
                      <Trash2 size={14} /> Hapus</Button>
                  )}
                </div>
              </div>
            </div>
            <div className="overflow-x-auto flex-1 custom-scrollbar">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-50/70 border-b border-slate-200/80 sticky top-0 z-10">
                  <tr>
                    <th className="px-6 py-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      Tanggal
                    </th>
                    <th className="px-6 py-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      Waktu
                    </th>
                    <th className="px-6 py-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      Guru
                    </th>
                    <th className="px-6 py-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      Sesi
                    </th>
                    <th className="px-6 py-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      Status
                    </th>
                    <th className="px-6 py-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      Mode
                    </th>
                    <th className="px-6 py-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      Catatan
                    </th>
                    <th className="px-6 py-3.5 text-right text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/50 bg-white/40">
                  {filteredAttendanceRecords?.length === 0 ? (
                    <tr>
                      <td
                        colSpan="8"
                        className="px-6 py-8 text-center text-slate-400 font-medium"
                      >
                        Belum ada data absensi yang cocok.
                      </td>
                    </tr>
                  ) : (
                    (filteredAttendanceRecords || [])
                      .slice()
                      .reverse()
                      .map((record) => (
                        <tr
                          key={record.id}
                          className="hover:bg-slate-50/50 transition-colors"
                        >
                          <td className="px-6 py-4 font-medium text-slate-800">
                            {record.date}
                          </td>
                          <td className="px-6 py-4 text-slate-600">
                            {record.time}
                          </td>
                          <td className="px-6 py-4">
                            <span className="font-bold text-[var(--ui-primary)]">
                              {record.teacherCode}
                            </span>
                            <span className="ml-2 text-slate-500 text-xs hidden sm:inline">
                              {getTeacherName(record.teacherCode)}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-slate-600 font-semibold">
                            {record.sessionName ||"-"}
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`px-3 py-1 rounded-[var(--ui-radius-small)] border text-[10px] font-bold uppercase ${getAttendanceStatusTone(record.status)}`}
                            >
                              {record.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-slate-500">
                            {record.mode}
                          </td>
                          <td className="px-6 py-4 text-slate-500 max-w-[260px] truncate">
                            {record.note ||"-"}
                          </td>
                          <td className="px-6 py-4 text-right">
                            {canManageAttendance ? (
                              <Button variant="outline"
                                onClick={() =>{
                                  setConfirmDialog({
                                    isOpen: true,
                                    message:"Hapus rekam absensi ini?",
                                    onConfirm: () => {
                                      handleRemoveAttendanceRecordSafe(
                                        record.id,
                                      );
                                      setConfirmDialog({
                                        isOpen: false,
                                        message:"",
                                        onConfirm: null
                                      });
                                    }
                                  });
                                }}
                                className="cursor-pointer"
                              >
                                <Trash2 size={14} /></Button>
                            ) : (
                              <span className="text-[10px] font-bold text-slate-300">
                                Monitor
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

      {attendanceSubTab ==="report" && (
        <Suspense fallback={<div className="p-8 text-center text-slate-400">Memuat Laporan Kehadiran...</div>}>
          <HikvisionTeacherReport isNested={true} />
        </Suspense>
      )}

      {attendanceSubTab ==="settings" && (
        <div className="flex flex-col gap-6 w-full animate-in fade-in duration-300">
          {canManageAttendance && (
            <div className="bg-white border-none rounded-[var(--ui-radius-card)] shadow-sm p-6 flex flex-col gap-5">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                <div>
                  <h3 className="text-xl font-black text-slate-800">
                    Pengaturan Jarak & Lokasi Absensi
                  </h3>
                  <p className="text-sm text-slate-500 font-medium mt-1">
                    Pilih mode, atur radius, lalu susun sesi jam absensi fleksibel.
                  </p>
                </div>
                <div className="inline-flex items-center gap-2 px-3 py-2 rounded-[var(--ui-radius-small)] bg-[var(--ui-primary)]/10 text-[var(--ui-primary)] text-[10px] font-black uppercase tracking-widest">
                  <attendanceMode.icon size={12} />
                  Mode aktif: {attendanceMode.label}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">
                    Latitude (Garis Lintang)
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={attendanceSettings.schoolLat ||""}
                    onChange={(e) => {
                      if (
                        !ensureDatabaseReadyForWrite("mengubah pengaturan absensi",
                        )
                      )
                        return;
                      updateAttendanceSettings({
                        schoolLat: parseFloat(e.target.value.replace(/[^0-9.-]/g,'')) || 0
                      });
                    }}
                    className="w-full border-none bg-slate-50 p-3.5 rounded-[var(--ui-radius-card)] text-sm font-bold focus:bg-white focus:outline-[var(--ui-primary)] shadow-sm"
                    placeholder="-6.200000"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">
                    Longitude (Garis Lintang)
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={attendanceSettings.schoolLng ||""}
                    onChange={(e) => {
                      if (
                        !ensureDatabaseReadyForWrite("mengubah pengaturan absensi",
                        )
                      )
                        return;
                      updateAttendanceSettings({
                        schoolLng: parseFloat(e.target.value.replace(/[^0-9.-]/g,'')) || 0
                      });
                    }}
                    className="w-full border-none bg-slate-50 p-3.5 rounded-[var(--ui-radius-card)] text-sm font-bold focus:bg-white focus:outline-[var(--ui-primary)] shadow-sm"
                    placeholder="106.816666"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">
                    Radius Maksimal (Meter)
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={attendanceSettings.radiusMeters || 50}
                    onChange={(e) => {
                      if (
                        !ensureDatabaseReadyForWrite("mengubah pengaturan absensi",
                        )
                      )
                        return;
                      updateAttendanceSettings({
                        radiusMeters: parseInt(e.target.value.replace(/[^0-9]/g,'')) || 50
                      });
                    }}
                    className="w-full border-none bg-slate-50 p-3.5 rounded-[var(--ui-radius-card)] text-sm font-bold focus:bg-white focus:outline-[var(--ui-primary)] shadow-sm"
                    placeholder="50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-2">
                {ATTENDANCE_MODE_OPTIONS.map((mode) => {
                  const isActive = mode.value === attendanceSettings.mode;
                  return (
                    <Button variant="outline"
                      key={mode.value}
                      type="button"
                      onClick={() =>{
                        if (
                          !ensureDatabaseReadyForWrite("mengubah mode absensi",
                          )
                        )
                          return;
                        updateAttendanceSettings({ mode: mode.value });
                      }}
                      className={`text-left cursor-pointer`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 font-black text-slate-800">
                          <mode.icon
                            size={16}
                            className={
                              isActive
                                ?"text-[var(--ui-primary)]"
                                :"text-slate-400"
                            }
                          />
                          {mode.label}
                        </div>
                        {isActive && (
                          <CheckCircle2
                            size={16}
                            className="text-[var(--ui-primary)]"
                          />
                        )}
                      </div>
                      <p className="text-slate-500 font-medium mt-2 text-xs leading-relaxed">
                        {mode.description}
                      </p></Button>
                  );
                })}
              </div>

              {attendanceSettings.mode ==="qr" && (
                <div className="grid grid-cols-1 xl:grid-cols-[1fr_auto] gap-4 items-center bg-slate-50 border-none rounded-[var(--ui-radius-small)] -[1.35rem] p-4">
                  <div>
                    <h4 className="text-sm font-black text-slate-800">
                      QR Absensi Hari Ini
                    </h4>
                    <p className="text-xs text-slate-500 font-medium mt-1">
                      Kode berubah setiap hari dan mengikuti koordinat sekolah. Guru bisa scan atau memasukkan kode yang sama.
                    </p>
                    <p className="mt-2 text-[10px] font-black uppercase tracking-widest text-slate-400 break-all">
                      {attendanceQrPayload}
                    </p>
                  </div>
                  <div className="bg-white p-3 rounded-[var(--ui-radius-card)] border-none shadow-sm">
                    {attendanceQrDataUrl ? (
                      <img
                        src={attendanceQrDataUrl}
                        alt="QR Absensi Hari Ini"
                        className="w-40 h-40 rounded-[var(--ui-radius-small)]"
                      />
                    ) : (
                      <div className="w-40 h-40 rounded-[var(--ui-radius-small)] bg-slate-100 flex items-center justify-center text-slate-400 text-xs font-bold">
                        QR belum siap
                      </div>
                    )}
                  </div>
                </div>
              )}
              <p className="text-[10px] text-slate-500 font-bold">
                Gunakan Google Maps untuk mendapatkan titik koordinat Latitude dan Longitude sekolah Anda secara akurat.
              </p>
            </div>
          )}

          {canManageAttendance && (
            <div className="bg-white border-none rounded-[var(--ui-radius-card)] shadow-sm p-6 flex flex-col gap-5">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h3 className="text-xl font-black text-slate-800">
                    Jam Absensi Fleksibel
                  </h3>
                  <p className="text-sm text-slate-500 font-medium mt-1">
                    Buat mode pagi-siang, siang-sore, pagi-sore, atau multi sesi sesuai kebijakan sekolah.
                  </p>
                </div>
                <Button variant="outline"
                  type="button"
                  onClick={addAttendanceSession}
                 ><Plus size={14} /> Tambah Sesi</Button>
              </div>
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                {(attendanceSessions || []).map((session) => (
                  <article
                    key={session.id}
                    className="rounded-[var(--ui-radius-small)] border-none bg-slate-50 p-4 space-y-3"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-[1.2fr_0.6fr_0.6fr] gap-3">
                      <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">
                          Nama Sesi
                        </label>
                        <input
                          value={session.name ||""}
                          onChange={(e) =>
                            updateAttendanceSession(session.id, {
                              name: e.target.value
                            })
                          }
                          className="w-full border-none bg-white p-3 rounded-[var(--ui-radius-small)] text-sm font-bold"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">
                          Tipe
                        </label>
                        <UISelect
                          value={session.type ||"checkpoint"}
                          onChange={(e) =>
                            updateAttendanceSession(session.id, {
                              type: e.target.value
                            })
                          }
                          className="w-full border-none bg-white p-3 rounded-[var(--ui-radius-small)] text-sm font-bold"
                        >
                          {ATTENDANCE_SESSION_TYPES.map((type) => (
                            <option key={type.value} value={type.value}>
                              {type.label}
                            </option>
                          ))}
                        </UISelect>
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">
                          Target Pengguna
                        </label>
                        <UISelect
                          value={session.targetRole ||"semua"}
                          onChange={(e) =>
                            updateAttendanceSession(session.id, {
                              targetRole: e.target.value
                            })
                          }
                          className="w-full border-none bg-white p-3 rounded-[var(--ui-radius-small)] text-sm font-bold"
                        >
                          <option value="semua">Semua</option>
                          <option value="guru">Guru</option>
                          <option value="karyawan">Karyawan</option>
                          <option value="siswa">Siswa</option>
                        </UISelect>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">
                          Jam Buka
                        </label>
                        <UITimeInput24
                          value={session.openTime ||""}
                          onChange={(e) =>
                            updateAttendanceSession(session.id, {
                              openTime: e.target.value
                            })
                          }
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">
                          Jam Tutup
                        </label>
                        <UITimeInput24
                          value={session.closeTime ||""}
                          onChange={(e) =>
                            updateAttendanceSession(session.id, {
                              closeTime: e.target.value
                            })
                          }
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">
                          Telat Laporan
                        </label>
                        <UITimeInput24
                          value={session.lateAfter ||""}
                          onChange={(e) =>
                            updateAttendanceSession(session.id, {
                              lateAfter: e.target.value
                            })
                          }
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">
                        Hari Aktif
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {(days || []).map((day) => {
                          const activeDays = Array.isArray(session.activeDays)
                            ? session.activeDays
                            : [];
                          const checked = activeDays.includes(day);
                          return (
                            <Button variant="outline"
                              key={day}
                              type="button"
                              onClick={() =>{
                                const nextDays = checked
                                  ? activeDays.filter((item) => item !== day)
                                  : [...activeDays, day];
                                updateAttendanceSession(session.id, {
                                  activeDays: nextDays
                                });
                              }}
                              className={`${checked ?"bg-[var(--ui-primary)] text-white border-[var(--ui-primary)]" :"bg-white text-slate-500 border-slate-200"}`}
                            >
                              {day}</Button>
                          );
                        })}
                      </div>
                    </div>
                    <div className="flex justify-between items-center gap-3 pt-2 border-t border-slate-200">
                      <p className="text-[10px] font-bold text-slate-400">
                        Contoh: {session.openTime} - {session.closeTime}
                        {session.lateAfter
                          ? `, terlambat setelah ${session.lateAfter}`
                          :""}
                      </p>
                      <Button variant="outline"
                        type="button"
                        onClick={() =>removeAttendanceSession(session.id)}
                        
                      >
                        <Trash2 size={14} /></Button>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {attendanceSubTab ==="corrections" && canReviewAttendance && (
        <div className="flex flex-col gap-6 w-full animate-in fade-in duration-300">
          {hasFeature("attendanceCorrections") && canReviewAttendance && (
            <section className="bg-white border-none rounded-[var(--ui-radius-card)] shadow-sm p-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-5">
                <div>
                  <h2 className="text-xl font-black text-slate-800 tracking-tight">
                    Koreksi Absensi
                  </h2>
                  <p className="text-sm text-slate-500 font-medium">
                    Tinjau pengajuan koreksi dari guru sebelum masuk ke rekap.
                  </p>
                </div>
                <span className="w-fit px-3 py-1.5 rounded-[var(--ui-radius-small)] bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-black uppercase tracking-widest">
                  {pendingAttendanceCorrections.length} Menunggu
                </span>
              </div>

              {sortedAttendanceCorrections.length === 0 ? (
                <div className="rounded-[var(--ui-radius-small)] border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
                  <CheckCircle2
                    size={36}
                    className="mx-auto mb-2 text-slate-300"
                  />
                  <p className="text-sm font-bold text-slate-500">
                    Belum ada pengajuan koreksi absensi.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                  {sortedAttendanceCorrections.map((request) => {
                    const reviewStatus = request.statusReview ||"pending";
                    const statusClass =
                      reviewStatus ==="approved"
                        ?"bg-emerald-50 text-emerald-700 border-emerald-200"
                        : reviewStatus ==="rejected"
                          ?"bg-rose-50 text-rose-700 border-rose-200"
                          :"bg-amber-50 text-amber-700 border-amber-200";
                    return (
                      <article
                        key={request.id}
                        className="rounded-[var(--ui-radius-small)] border-none bg-slate-50 p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="font-black text-slate-800">
                                {request.teacherName ||
                                  getTeacherName(request.teacherCode)}
                              </h3>
                              <span className="px-2.5 py-1 rounded-[var(--ui-radius-small)] bg-white text-slate-500 border-none text-[10px] font-black uppercase">
                                {request.teacherCode}
                              </span>
                              <span
                                className={`px-2.5 py-1 rounded-[var(--ui-radius-small)] border text-[10px] font-black uppercase ${statusClass}`}
                              >
                                {reviewStatus ==="approved"
                                  ?"Disetujui"
                                  : reviewStatus ==="rejected"
                                    ?"Ditolak"
                                    :"Menunggu"}
                              </span>
                            </div>
                            <p className="mt-2 text-xs font-bold text-slate-500">
                              {request.date} · {request.time ||"-"} ·{""}
                              {request.sessionName ||"Tanpa sesi"} · Status diminta: {request.status ||"-"}
                            </p>
                            <p className="mt-3 text-sm font-semibold text-slate-700 leading-relaxed">
                              {request.note ||"Tidak ada alasan tertulis."}
                            </p>
                            {request.reviewedBy && (
                              <p className="mt-2 text-[10px] font-bold text-slate-400">
                                Ditinjau oleh {request.reviewedBy}
                              </p>
                            )}
                          </div>
                        </div>
                        {reviewStatus ==="pending" &&
                          activeUserRole !=="kepsek" && (
                            <div className="mt-4 flex flex-col sm:flex-row gap-2">
                              <Button variant="outline"
                                type="button"
                                onClick={() =>handleReviewAttendanceCorrection(
                                    request,"approved",
                                  )
                                }
                                className="flex-1"
                              >
                                <CheckCircle2 size={14} /> Setujui</Button>
                              <Button variant="outline"
                                type="button"
                                onClick={() =>handleReviewAttendanceCorrection(
                                    request,"rejected",
                                  )
                                }
                                className="flex-1"
                              >
                                <X size={14} /> Tolak</Button>
                            </div>
                          )}
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          )}
        </div>
      )}
    </div>
  );
}
