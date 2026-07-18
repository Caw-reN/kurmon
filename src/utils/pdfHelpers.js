import { useDataStore } from '../store/useDataStore.js';
import { useAppStore } from '../store/useAppStore.js';

/**
 * Reads the active primary color from CSS variables (set by branding.js)
 * or falls back to the appStore themeSettings.primaryColor.
 * Returns an [R, G, B] array suitable for jsPDF.
 */
export const getPrimaryColorRgb = () => {
  try {
    // Prefer the live CSS variable (reflects user-set theme)
    const cssColor = getComputedStyle(document.documentElement)
      .getPropertyValue('--ui-primary')
      .trim();
    if (cssColor) {
      return hexToRgbArray(cssColor);
    }
  } catch (e) { /* ignore */ }

  // Fallback: read from Zustand store
  try {
    const storeColor = useAppStore.getState().themeSettings?.primaryColor;
    if (storeColor) return hexToRgbArray(storeColor);
  } catch (e) { /* ignore */ }

  // Hard fallback: default green
  return [6, 78, 59];
};

/**
 * Returns a slightly lighter version of the primary color for table headers
 * (adds 20% white mixing so text stays readable).
 */
export const getPrimaryColorLight = () => {
  const [r, g, b] = getPrimaryColorRgb();
  const mix = (c) => Math.min(255, Math.round(c + (255 - c) * 0.65));
  return [mix(r), mix(g), mix(b)];
};

/** Converts a hex color string (#rrggbb or #rgb) to an [R, G, B] array. */
const hexToRgbArray = (hex) => {
  const clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    return [
      parseInt(clean[0] + clean[0], 16),
      parseInt(clean[1] + clean[1], 16),
      parseInt(clean[2] + clean[2], 16),
    ];
  }
  return [
    parseInt(clean.substring(0, 2), 16),
    parseInt(clean.substring(2, 4), 16),
    parseInt(clean.substring(4, 6), 16),
  ];
};

export const drawKopSurat = (doc, isLandscape = false) => {
  const pageWidth = isLandscape ? 297 : 210;
  const center = pageWidth / 2;
  const yStart = 10;
  
  const appSettings = useDataStore.getState().appSettings || {};
  const [r, g, b] = getPrimaryColorRgb();
  
  if (appSettings.useKopSuratGambar && appSettings.kopSuratGambar) {
    const kopHeight = isLandscape ? 28 : 24;
    try {
      doc.addImage(appSettings.kopSuratGambar, 'PNG', 14, yStart, pageWidth - 28, kopHeight);
    } catch (e) {
      console.error("Gagal menggambar kop surat gambar:", e);
    }
    return yStart + kopHeight + 5;
  } else {
    let textStartLabel = yStart + 3;
    doc.setFont("Helvetica", "normal");
    
    const logoData = appSettings.kopSuratLogo || appSettings.logoUrl;
    if (logoData && logoData.startsWith("data:image/")) {
      try {
        doc.addImage(logoData, 'PNG', 14, yStart, 18, 18);
      } catch (e) {
        console.error("Gagal menggambar logo kop surat:", e);
      }
    }
    
    const baris1 = appSettings.kopSuratBaris1 || "PEMERINTAH DAERAH";
    const baris2 = appSettings.kopSuratBaris2 || "DINAS PENDIDIKAN";
    const baris3 = appSettings.kopSuratBaris3 || appSettings.schoolProfile?.nama_sekolah || "SEKOLAH MENENGAH KEJURUAN";
    const alamat = appSettings.kopSuratAlamat || appSettings.schoolProfile?.alamat || "";
    const kontak = appSettings.kopSuratKontak || `Telp: ${appSettings.schoolProfile?.telepon || "-"} | Website: ${appSettings.schoolProfile?.website || "-"}`;
    
    doc.setFontSize(8);
    doc.setTextColor(80, 80, 80);
    doc.text(baris1, center, textStartLabel, { align: "center" });
    
    doc.setFontSize(9);
    doc.setFont("Helvetica", "bold");
    doc.setTextColor(r, g, b);
    doc.text(baris2, center, textStartLabel + 4, { align: "center" });
    
    doc.setFontSize(14);
    doc.setTextColor(r, g, b);
    doc.text(baris3, center, textStartLabel + 9, { align: "center" });
    
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(80, 80, 80);
    doc.text(alamat, center, textStartLabel + 13, { align: "center" });
    doc.setFontSize(7);
    doc.text(kontak, center, textStartLabel + 16, { align: "center" });
    
    // Reset text color
    doc.setTextColor(0, 0, 0);

    const dividerY = textStartLabel + 18;
    doc.setDrawColor(r, g, b);
    doc.setLineWidth(0.8);
    doc.line(14, dividerY, pageWidth - 14, dividerY);
    doc.setLineWidth(0.2);
    doc.line(14, dividerY + 1.2, pageWidth - 14, dividerY + 1.2);
    
    return dividerY + 5;
  }
};

