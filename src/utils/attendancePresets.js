/**
 * attendancePresets.js
 * Default presets & manager for custom bulk remark templates & student attendance notes.
 * Editable by Super Admin only.
 */

export const DEFAULT_BULK_REMARK_PRESETS = [
  {
    id: 'preset-tka-xii',
    title: 'Ujian TKA (Kelas XII - 3 Sesi Bebas Absensi)',
    label: 'Ujian TKA',
    keterangan: 'Siswa kelas XII mengikuti Ujian TKA dibagi 3 sesi. Presensi harian dibebaskan (otomatis hadir).',
    level: 'XII',
    badgeTone: 'bg-emerald-100 text-emerald-800 border-emerald-200'
  },
  {
    id: 'preset-lab-ujian',
    title: 'Lab Dipakai Ujian TKA (Kelas Diliburkan)',
    label: 'Lab Dipakai Ujian',
    keterangan: 'Ruang Lab Komputer digunakan untuk pelaksanaan Ujian TKA. Siswa kelas terdampak diliburkan / belajar mandiri di rumah.',
    level: 'specific',
    badgeTone: 'bg-amber-100 text-amber-800 border-amber-200'
  },
  {
    id: 'preset-dispensasi-lomba',
    title: 'Dispensasi Lomba / Acara Sekolah',
    label: 'Dispensasi Kegiatan',
    keterangan: 'Dispensasi kehadiran resmi untuk siswa yang mewakili sekolah dalam kegiatan perlombaan atau dinas luar.',
    level: 'all',
    badgeTone: 'bg-indigo-100 text-indigo-800 border-indigo-200'
  },
  {
    id: 'preset-classmeeting',
    title: 'Classmeeting / Kegiatan Pasca Asesmen',
    label: 'Classmeeting',
    keterangan: 'Kegiatan jeda semester / classmeeting sekolah seluruh tingkatan kelas.',
    level: 'all',
    badgeTone: 'bg-purple-100 text-purple-800 border-purple-200'
  }
];

export const DEFAULT_STUDENT_ATTENDANCE_NOTES = [
  {
    id: 'note-mesin-error',
    label: 'Mesin Error',
    keterangan: 'Mesin error / tidak terbaca',
    status: 'Hadir',
    category: 'catatan', // 'catatan' | 'kegiatan'
    color: 'sky'
  },
  {
    id: 'note-lupa-absen',
    label: 'Lupa Absen',
    keterangan: 'Lupa absen / lupa tap',
    status: 'Hadir',
    category: 'catatan',
    color: 'amber'
  },
  {
    id: 'note-kartu-tertinggal',
    label: 'Kartu Tertinggal',
    keterangan: 'Kartu tertinggal / rusak',
    status: 'Hadir',
    category: 'catatan',
    color: 'purple'
  },
  {
    id: 'note-dispensasi',
    label: 'Dispensasi',
    keterangan: 'Dispensasi sekolah / tugas',
    status: 'Izin',
    category: 'kegiatan',
    color: 'teal'
  },
  {
    id: 'note-ujian-tka',
    label: 'Ujian TKA',
    keterangan: 'Mengikuti Ujian TKA',
    status: 'Hadir',
    category: 'kegiatan',
    color: 'emerald'
  },
  {
    id: 'note-surat-dokter',
    label: 'Surat Dokter',
    keterangan: 'Sakit dengan surat keterangan dokter',
    status: 'Sakit',
    category: 'catatan',
    color: 'rose'
  }
];

const LOCAL_STORAGE_KEY = 'kurmon_attendance_custom_presets_v1';

export async function fetchAttendancePresets(token) {
  try {
    if (token) {
      const res = await fetch('/api/attendance/presets', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        if (json.ok) {
          const bulkRemarkPresets = Array.isArray(json.bulkRemarkPresets) && json.bulkRemarkPresets.length > 0
            ? json.bulkRemarkPresets
            : DEFAULT_BULK_REMARK_PRESETS;
          const studentAttendanceNotes = Array.isArray(json.studentAttendanceNotes) && json.studentAttendanceNotes.length > 0
            ? json.studentAttendanceNotes
            : DEFAULT_STUDENT_ATTENDANCE_NOTES;
          
          try {
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({ bulkRemarkPresets, studentAttendanceNotes }));
          } catch {}
          return { bulkRemarkPresets, studentAttendanceNotes };
        }
      }
    }
  } catch {}

  // Fallback to localStorage
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        bulkRemarkPresets: parsed.bulkRemarkPresets || DEFAULT_BULK_REMARK_PRESETS,
        studentAttendanceNotes: parsed.studentAttendanceNotes || DEFAULT_STUDENT_ATTENDANCE_NOTES
      };
    }
  } catch {}

  return {
    bulkRemarkPresets: DEFAULT_BULK_REMARK_PRESETS,
    studentAttendanceNotes: DEFAULT_STUDENT_ATTENDANCE_NOTES
  };
}

export async function saveAttendancePresets(token, { bulkRemarkPresets, studentAttendanceNotes }) {
  // Save to localStorage immediately
  try {
    const existingRaw = localStorage.getItem(LOCAL_STORAGE_KEY);
    const existing = existingRaw ? JSON.parse(existingRaw) : {};
    const updated = {
      bulkRemarkPresets: bulkRemarkPresets !== undefined ? bulkRemarkPresets : existing.bulkRemarkPresets,
      studentAttendanceNotes: studentAttendanceNotes !== undefined ? studentAttendanceNotes : existing.studentAttendanceNotes
    };
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
  } catch {}

  // Save to server API
  if (token) {
    const res = await fetch('/api/attendance/presets', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ bulkRemarkPresets, studentAttendanceNotes })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || err.message || `Gagal menyimpan (HTTP ${res.status})`);
    }
    return await res.json();
  }
  return { ok: true };
}
