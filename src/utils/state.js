import { getDatabaseSnapshot } from './dataSource.js';

export const loadInitialState = (key, defaultVal) => {
  try {
    const parsed = getDatabaseSnapshot();
    if (parsed && parsed[key] !== undefined) {
      let val = parsed[key];
      if (key === "layoutBlockLabels" && val && typeof val === "object") {
        val = normalizeLayoutBlockLabels(val);
      }
      if (key === "appSettings" && val) {
        // Migrate old title & subtitle from older database snapshots.
        if (val.heroTitle === "Sistem Penjadwalan Cerdas & Presisi" || val.heroTitle === "Aplikasi Jadwal, Denah & Modul Ajar Sekolah") {
          val.heroTitle = "Aplikasi Jadwal, Denah & Materi Ajar Sekolah";
        }
        if (val.heroSubtitle === "Otomatisasi penyusunan jadwal sekolah bebas bentrok. Kelola sumber daya guru dan ruang kelas dengan antarmuka yang modern dan mudah digunakan." ||
            val.heroSubtitle === "Aplikasi melihat jadwal sekolah, denah serta modul ajar yang siap digunakan siswa dan guru.") {
          val.heroSubtitle = "Aplikasi melihat jadwal sekolah, denah serta materi ajar yang siap digunakan siswa dan guru.";
        }

        // Dynamically replace any database-persisted customized labels/subtitles
        if (typeof val.heroSubtitle === "string" && val.heroSubtitle.toLowerCase().includes("modul")) {
          val.heroSubtitle = val.heroSubtitle
            .replace(/modul ajar/gi, "materi ajar")
            .replace(/Modul Ajar/gi, "Materi Ajar")
            .replace(/modul/gi, "materi")
            .replace(/Modul/gi, "Materi");
        }
        if (typeof val.serviceLabel3 === "string" && val.serviceLabel3.toLowerCase().includes("modul")) {
          val.serviceLabel3 = val.serviceLabel3
            .replace(/modul ajar/gi, "materi ajar")
            .replace(/Modul Ajar/gi, "Materi Ajar")
            .replace(/modul/gi, "materi")
            .replace(/Modul/gi, "Materi");
        }
      }
      return val;
    }
  } catch (error) {
    console.warn("Gagal membaca state awal dari snapshot database", error);
  }
  return defaultVal;
};

const normalizeLabel = (value) => String(value || "").trim().toLowerCase();

const fillLabels = (current, defaults, legacyValues = []) => {
  const next = Array.isArray(current) ? [...current] : [];
  const legacy = new Set(legacyValues.map(normalizeLabel));
  defaults.forEach((def, idx) => {
    const existing = next[idx];
    if (!existing || legacy.has(normalizeLabel(existing))) {
      next[idx] = def;
    }
  });
  return next;
};

export const normalizeLayoutBlockLabels = (value) => {
  if (!value || typeof value !== "object") return value;

  const kampusALabels = [
    "13B", "13B", "12B", "11B", "10B", "5B", "6B", "7B", "8B", "9B", "4B", "3B", "2B", "1B", "3C", "4C", "1C", "2C", "2A", "3A", "1A", "4A", "11A", "5A", "10A", "6A", "9A", "7A", "8A",
  ];
  const kampusBLabels = [
    "Lab HW", "Lab SW", "Lab COE", "Bengkel TKR", "Bengkel TKR",
    "Lab AK 1", "Lab AK 2", "Lab MP 1", "Lab MP 1", "Bengkel TKR",
  ];

  return {
    ...value,
    kampus_a: {
      ...(value.kampus_a || {}),
      teori: fillLabels(value.kampus_a?.teori, kampusALabels),
    },
    kampus_b: {
      ...(value.kampus_b || {}),
      praktik: fillLabels(value.kampus_b?.praktik, kampusBLabels),
    },
  };
};

export const initializeTimeSlots = (daysArray, seedTimeSlots) => {
  const ts = {};
  daysArray.forEach((d) => {
    ts[d] = [...seedTimeSlots];
  });
  return ts;
};
