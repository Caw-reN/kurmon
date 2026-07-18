import { Button } from '../../../components/ui.jsx';
import React from 'react';
import { Clock, CheckCircle2, MapPin, Send } from 'lucide-react';
import { UISelect } from '../../../components/ui.jsx';
import { ATTENDANCE_STATUS_OPTIONS } from '../../../utils/constants.js';
import { getAttendanceStatusTone } from '../../../utils/adminHelpers.js';

export default function TabAbsensiGuru(props) {
  const { getDistanceToSchool, attendanceSettings, attendanceModeValue, teacherLocation, attendanceQrInput, attendanceQrPayload, attendancePhoto, hasFeature, activeAttendanceSession, getAttendanceStatusFromSession, attendanceSelectedStatus, isCheckingIn, todayAttendanceRecord, attendanceModeLabel, attendanceMode, attendanceSuccessMsg, jakartaNowParts, locationError, setAttendanceSelectedStatus, attendanceNote, setAttendanceNote, attendanceQrDataUrl, setAttendanceQrInput, handleAttendancePhotoChange, photoError, handleTeacherCheckIn, attendanceCorrectionNote, setAttendanceCorrectionNote, submitAttendanceCorrection } = props;
  const { ...allProps } = props;
  // Destructure specific props as needed in the component

  const distance = getDistanceToSchool();
  const inRadius = distance <= (attendanceSettings.radiusMeters || 50);
  const needsLocation = attendanceModeValue !=="manual";
  const isReadyForCheckIn =
    !needsLocation || (teacherLocation && inRadius);
  const qrMismatch =
    attendanceModeValue ==="qr" &&
    attendanceQrInput.trim().toUpperCase() !==
    String(attendanceQrPayload).toUpperCase();
  const photoMissing =
    attendanceModeValue ==="photo" && !attendancePhoto.dataUrl;
  const featureAllowsCurrentMode =
    hasFeature("attendance") &&
    (attendanceModeValue !=="qr" || hasFeature("attendanceQr")) &&
    (attendanceModeValue !=="photo" || hasFeature("attendancePhoto")) &&
    (!needsLocation || hasFeature("attendanceGps"));
  const expectedStatus = activeAttendanceSession
    ? getAttendanceStatusFromSession(
      activeAttendanceSession,
      attendanceSelectedStatus,
    )
    : attendanceSelectedStatus;
  const isPermitSelected = ["Izin","Sakit"].includes(attendanceSelectedStatus);
  const canSubmitAttendance =
    isPermitSelected
      ? !isCheckingIn
      : (featureAllowsCurrentMode &&
        !!activeAttendanceSession &&
        !todayAttendanceRecord &&
        isReadyForCheckIn &&
        !isCheckingIn &&
        !qrMismatch &&
        !photoMissing);
  const buttonLabel = isPermitSelected
    ? `Kirim Laporan ${attendanceSelectedStatus}`
    : ({
      button:"Klik Untuk Absen Hadir",
      qr:"Verifikasi QR & Absen",
      photo:"Upload Selfie & Absen",
      manual:"Konfirmasi Hadir"
    }[attendanceModeValue] ||"Konfirmasi Hadir");
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white rounded-[var(--ui-radius-card)] p-6 md:p-6 shadow-sm border-none mb-8 max-w-4xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6 border-b border-slate-200 pb-5">
          <div>
            <h2 className="text-2xl font-black text-slate-800">
              Absensi Kehadiran KBM
            </h2>
            <p className="text-sm text-slate-500 font-medium mt-1">
              Mode aktif:{""}
              <span className="font-black text-[var(--ui-primary)]">
                {attendanceModeLabel}
              </span>
            </p>
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-2 rounded-[var(--ui-radius-small)] bg-[var(--ui-primary)]/10 text-[var(--ui-primary)] text-[10px] font-black uppercase tracking-widest">
            <attendanceMode.icon size={12} />
            {attendanceMode.shortLabel}
          </div>
        </div>

        <div className="space-y-5">
          <div
            className={`rounded-[1.35rem] border p-5 ${activeAttendanceSession ?"bg-[#f4fbf6] border-[var(--ui-primary)]/25" :"bg-amber-50 border-amber-200"}`}
          >
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div className="flex items-start gap-3">
                <div
                  className={`w-11 h-11 rounded-[var(--ui-radius-small)] flex items-center justify-center shrink-0 ${activeAttendanceSession ?"bg-[var(--ui-primary)] text-white" :"bg-amber-100 text-amber-700"}`}
                >
                  <Clock size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">
                    Sesi Absensi Sekarang
                  </p>
                  <h3 className="mt-1 text-xl font-black text-slate-800">
                    {activeAttendanceSession?.name ||"Belum ada sesi yang dibuka"}
                  </h3>
                  <p className="mt-1 text-xs font-bold text-slate-500">
                    {activeAttendanceSession
                      ? `Buka ${activeAttendanceSession.openTime ||"-"} sampai ${activeAttendanceSession.closeTime ||"-"}${activeAttendanceSession.lateAfter ? ` · terlambat setelah ${activeAttendanceSession.lateAfter}` :""}`
                      :"Silakan tunggu jam absensi dibuka atau ajukan koreksi jika ada kebutuhan khusus."}
                  </p>
                </div>
              </div>
              {todayAttendanceRecord && (
                <span
                  className={`w-fit px-3 py-1.5 rounded-[var(--ui-radius-small)] border text-[10px] font-black uppercase tracking-widest ${getAttendanceStatusTone(todayAttendanceRecord.status)}`}
                >
                  Sudah {todayAttendanceRecord.status}
                </span>
              )}
            </div>
          </div>

          {attendanceSuccessMsg || todayAttendanceRecord ? (
            <div className="bg-slate-50 text-slate-700 p-6 rounded-[var(--ui-radius-small)] -[1.35rem] border-none text-center">
              <CheckCircle2
                size={56}
                className="mx-auto mb-3 text-[var(--ui-primary)]"
              />
              <p className="font-black text-xl text-slate-800">
                {attendanceSuccessMsg ||
                  `Absensi ${todayAttendanceRecord?.sessionName ||"hari ini"} sudah tercatat.`}
              </p>
              <p className="text-sm text-slate-500 mt-1 font-semibold">
                Status: {todayAttendanceRecord?.status || expectedStatus}{""}
                · Waktu:{""}
                {todayAttendanceRecord?.time ||
                  jakartaNowParts.timeWithSeconds}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-[1.05fr_0.95fr] gap-4">
              <div className="bg-slate-50 p-5 rounded-[var(--ui-radius-small)] -[1.35rem] border-none space-y-4">
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <MapPin
                      size={20}
                      className={
                        teacherLocation
                          ?"text-[var(--ui-primary)]"
                          :"text-slate-400"
                      }
                    />
                    <span className="font-bold text-slate-800 text-sm">
                      {needsLocation
                        ?"Status Lokasi (Geofencing GPS)"
                        :"Mode Manual Aktif"}
                    </span>
                  </div>
                  {!featureAllowsCurrentMode && (
                    <p className="mb-3 text-xs text-red-600 font-bold bg-red-50 p-3 rounded-[var(--ui-radius-small)] border border-red-100">
                      Mode absensi ini sedang tidak lengkap/aktif. Hubungi
                      admin untuk mengaktifkan fitur terkait.
                    </p>
                  )}
                  {needsLocation ? (
                    locationError ? (
                      <p className="text-xs text-red-600 font-bold bg-red-50 p-3 rounded-[var(--ui-radius-small)] border border-red-100">
                        {locationError}
                      </p>
                    ) : teacherLocation ? (
                      <div className="space-y-1 text-slate-600 text-xs font-semibold">
                        <p>
                          Jarak Anda dari Sekolah:{""}
                          <span
                            className={`font-black ${inRadius ?"text-[var(--ui-primary)]" :"text-red-600"}`}
                          >
                            {Math.round(distance)} meter
                          </span>{""}
                          (Maksimal radius:{""}
                          {attendanceSettings.radiusMeters || 50}m)
                        </p>
                        {!inRadius && (
                          <p className="text-[10px] text-red-500 font-bold">
                            Anda berada di luar area sekolah. Absen
                            dinonaktifkan.
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 font-bold flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-[var(--ui-radius-small)] bg-orange-400 animate-pulse"></span>
                        Mendeteksi posisi GPS Anda...
                      </p>
                    )
                  ) : (
                    <div className="space-y-2 text-slate-600 text-xs font-semibold">
                      <p>
                        Mode manual tidak mewajibkan GPS. Guru cukup
                        konfirmasi kehadiran dari perangkat yang sedang
                        dipakai.
                      </p>
                      <p className="text-[10px] text-slate-400">
                        Jika lokasi tersedia, sistem tetap menyimpannya
                        sebagai metadata.
                      </p>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">
                      Status Kehadiran
                    </label>
                    <UISelect
                      value={attendanceSelectedStatus}
                      onChange={(e) =>
                        setAttendanceSelectedStatus(e.target.value)
                      }
                      className="w-full border-none bg-white p-3 rounded-[var(--ui-radius-small)] text-sm font-bold"
                    >
                      {ATTENDANCE_STATUS_OPTIONS.filter(
                        (status) => status.value !=="Alpa",
                      ).map((status) => (
                        <option key={status.value} value={status.value}>
                          {status.label}
                        </option>
                      ))}
                    </UISelect>
                  </div>
                  <div className="rounded-[var(--ui-radius-small)] border-none bg-white p-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      Akan tercatat sebagai
                    </p>
                    <p
                      className={`mt-1 inline-flex px-3 py-1 rounded-[var(--ui-radius-small)] border text-[10px] font-black uppercase ${getAttendanceStatusTone(expectedStatus)}`}
                    >
                      {expectedStatus}
                    </p>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">
                    Catatan Opsional
                  </label>
                  <textarea
                    value={attendanceNote}
                    onChange={(e) => setAttendanceNote(e.target.value)}
                    className="w-full border-none bg-white p-3.5 rounded-[var(--ui-radius-small)] text-sm font-bold focus:bg-white focus:outline-[var(--ui-primary)] min-h-[88px]"
                    placeholder="Contoh: Mengajar pengganti, kegiatan luar kelas, atau keterangan singkat."
                  />
                </div>
              </div>

              <div className="bg-white p-5 rounded-[1.35rem] border-none shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <attendanceMode.icon
                    size={16}
                    className="text-[var(--ui-primary)]"
                  />
                  <h3 className="font-black text-slate-800 text-sm">
                    {attendanceMode.label}
                  </h3>
                </div>

                {attendanceModeValue ==="qr" && (
                  <div className="space-y-3">
                    <div className="bg-slate-50 border-none rounded-[var(--ui-radius-small)] p-3 flex items-center justify-center">
                      {attendanceQrDataUrl ? (
                        <img
                          src={attendanceQrDataUrl}
                          alt="QR absensi"
                          className="w-40 h-40 rounded-[var(--ui-radius-small)]"
                        />
                      ) : (
                        <div className="w-40 h-40 rounded-[var(--ui-radius-small)] bg-slate-100 flex items-center justify-center text-slate-400 text-xs font-bold">
                          QR belum siap
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">
                        Masukkan Kode QR
                      </label>
                      <input
                        type="text"
                        value={attendanceQrInput}
                        onChange={(e) =>
                          setAttendanceQrInput(e.target.value)
                        }
                        placeholder="Scan atau paste kode QR di sini"
                        className="w-full border-none bg-slate-50 p-3.5 rounded-[var(--ui-radius-card)] text-sm font-bold focus:bg-white focus:outline-[var(--ui-primary)] shadow-sm"
                      />
                    </div>
                    <p className="text-[10px] text-slate-500 font-bold">
                      Kode harus sama dengan QR hari ini. Setelah cocok,
                      tombol absen akan aktif.
                    </p>
                  </div>
                )}

                {attendanceModeValue ==="photo" && (
                  <div className="space-y-3">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                      Upload Selfie
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      capture="user"
                      onChange={(e) =>
                        handleAttendancePhotoChange(e.target.files?.[0])
                      }
                      className="w-full border-none bg-slate-50 p-3 rounded-[var(--ui-radius-card)] text-sm font-bold focus:bg-white shadow-sm cursor-pointer"
                    />
                    {photoError && (
                      <p className="text-xs text-red-600 font-bold bg-red-50 p-3 rounded-[var(--ui-radius-small)] border border-red-100">
                        {photoError}
                      </p>
                    )}
                    {attendancePhoto.dataUrl ? (
                      <div className="rounded-[var(--ui-radius-small)] overflow-hidden border-none">
                        <img
                          src={attendancePhoto.dataUrl}
                          alt="Preview selfie"
                          className="w-full max-h-60 object-cover"
                        />
                      </div>
                    ) : (
                      <p className="text-[10px] text-slate-500 font-bold">
                        Gunakan kamera depan untuk selfie kehadiran.
                      </p>
                    )}
                  </div>
                )}

                {attendanceModeValue ==="manual" && (
                  <div className="space-y-2 text-slate-600 text-xs font-semibold">
                    <p>
                      Mode manual langsung mengonfirmasi kehadiran tanpa
                      QR, selfie, atau geofencing.
                    </p>
                    <p className="text-[10px] text-slate-400">
                      Cocok untuk sekolah yang ingin proses paling
                      sederhana.
                    </p>
                  </div>
                )}

                {attendanceModeValue ==="button" && (
                  <div className="space-y-2 text-slate-600 text-xs font-semibold">
                    <p>
                      Mode tombol membutuhkan verifikasi lokasi lalu guru
                      menekan tombol hadir.
                    </p>
                    <p className="text-[10px] text-slate-400">
                      Ini tetap memakai radius sekolah yang sudah diatur
                      admin.
                    </p>
                  </div>
                )}

                <button
                  onClick={handleTeacherCheckIn}
                  disabled={!canSubmitAttendance}
                  className="w-full mt-4 bg-[var(--ui-primary)] hover:opacity-90 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-black py-4 rounded-[var(--ui-radius-small)] transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer border-none"
                >
                  {React.createElement(attendanceMode.icon, { size: 18 })}
                  {isCheckingIn ?"Memproses..." : buttonLabel}
                </button>
                {!activeAttendanceSession && (
                  <p className="mt-2 text-[10px] text-amber-600 font-bold text-center">
                    Tombol aktif saat sesi absensi dibuka.
                  </p>
                )}
              </div>
            </div>
          )}

          {hasFeature("attendanceCorrections") && (
            <div className="rounded-[var(--ui-radius-small)] -[1.35rem] border border-amber-200 bg-amber-50/70 p-5">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                <div>
                  <h3 className="font-black text-amber-900">
                    Ajukan Koreksi Absensi
                  </h3>
                  <p className="text-xs font-semibold text-amber-800 mt-1">
                    Gunakan jika lupa absen, salah status, atau ada
                    kegiatan khusus yang perlu ditinjau admin/kepsek.
                  </p>
                </div>
                <span className="w-fit rounded-[var(--ui-radius-small)] bg-white border border-amber-200 px-3 py-1 text-[10px] font-black uppercase text-amber-700">
                  Butuh persetujuan
                </span>
              </div>
              <div className="mt-4 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3">
                <textarea
                  value={attendanceCorrectionNote}
                  onChange={(e) =>
                    setAttendanceCorrectionNote(e.target.value)
                  }
                  className="w-full border border-amber-200 bg-white p-3.5 rounded-[var(--ui-radius-small)] text-sm font-bold focus:outline-amber-500 min-h-[88px]"
                  placeholder="Tulis alasan koreksi, contoh: Saya hadir jam 07.05 tetapi lupa menekan tombol absen."
                />
                <Button
                  type="button"
                  onClick={submitAttendanceCorrection}
                  className="rounded-[var(--ui-radius-small)] px-5 py-3 h-fit"
                >
                  <Send size={15} /> Kirim Koreksi
                </Button>
              </div>
            </div>
          )}

          <p className="text-[10px] text-slate-400 font-bold text-center">
            Sistem tersinkronisasi real-time sesuai mode yang dipilih
            admin.
          </p>
        </div>
      </div>
    </div>
  );
}
