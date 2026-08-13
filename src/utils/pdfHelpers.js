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
  const pageWidth = isLandscape ? (doc.internal.pageSize.getWidth() || 297) : (doc.internal.pageSize.getWidth() || 210);
  const center = pageWidth / 2;
  const yStart = 8;
  
  const appSettings = useDataStore.getState().appSettings || {};
  const [r, g, b] = getPrimaryColorRgb();
  
  if (appSettings.useKopSuratGambar && appSettings.kopSuratGambar) {
    try {
      let format = 'PNG';
      if (String(appSettings.kopSuratGambar).includes('data:image/jpeg') || String(appSettings.kopSuratGambar).includes('data:image/jpg')) {
        format = 'JPEG';
      }
      
      const props = doc.getImageProperties(appSettings.kopSuratGambar);
      const aspect = (props.width || 1) / (props.height || 1);
      
      const maxKopHeight = isLandscape ? 30 : 26;
      const maxKopWidth = isLandscape ? 240 : (pageWidth - 28);
      
      let calcWidth = maxKopWidth;
      let calcHeight = calcWidth / aspect;
      
      if (calcHeight > maxKopHeight) {
        calcHeight = maxKopHeight;
        calcWidth = calcHeight * aspect;
      }
      
      const xPos = (pageWidth - calcWidth) / 2;
      doc.addImage(appSettings.kopSuratGambar, format, xPos, yStart, calcWidth, calcHeight);
      
      return yStart + calcHeight + 5;
    } catch (e) {
      console.error("Gagal menggambar kop surat gambar:", e);
      const fallbackH = isLandscape ? 28 : 24;
      doc.addImage(appSettings.kopSuratGambar, 'PNG', 14, yStart, pageWidth - 28, fallbackH);
      return yStart + fallbackH + 5;
    }
  } else {
    let textStartLabel = yStart + 3;
    doc.setFont("Helvetica", "normal");
    
    const logoData = appSettings.kopSuratLogo || appSettings.logoUrl;
    if (logoData && logoData.startsWith("data:image/")) {
      try {
        let format = 'PNG';
        if (logoData.includes('data:image/jpeg') || logoData.includes('data:image/jpg')) format = 'JPEG';
        doc.addImage(logoData, format, 14, yStart, 18, 18);
      } catch (e) {
        console.error("Gagal menggambar logo kop surat:", e);
      }
    }
    
    const baris1 = appSettings.kopSuratBaris1 || "PEMERINTAH DAERAH PROVINSI";
    const baris2 = appSettings.kopSuratBaris2 || "DINAS PENDIDIKAN";
    const baris3 = appSettings.kopSuratBaris3 || appSettings.schoolProfile?.nama_sekolah || "SEKOLAH MENENGAH KEJURUAN";
    const alamat = appSettings.kopSuratAlamat || appSettings.schoolProfile?.alamat || "";
    const kontak = appSettings.kopSuratKontak || `Telp: ${appSettings.schoolProfile?.telepon || "-"} | Website: ${appSettings.schoolProfile?.website || "-"}`;
    
    doc.setFontSize(8);
    doc.setTextColor(80, 80, 80);
    doc.text(baris1, center, textStartLabel, { align: "center" });
    
    doc.setFontSize(9.5);
    doc.setFont("Helvetica", "bold");
    doc.setTextColor(r, g, b);
    doc.text(baris2, center, textStartLabel + 4.5, { align: "center" });
    
    doc.setFontSize(14);
    doc.setTextColor(r, g, b);
    doc.text(baris3, center, textStartLabel + 10, { align: "center" });
    
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(80, 80, 80);
    doc.text(alamat, center, textStartLabel + 14.5, { align: "center" });
    doc.setFontSize(7);
    doc.text(kontak, center, textStartLabel + 18, { align: "center" });
    
    // Reset text color
    doc.setTextColor(0, 0, 0);

    const dividerY = textStartLabel + 20;
    doc.setDrawColor(r, g, b);
    doc.setLineWidth(0.8);
    doc.line(14, dividerY, pageWidth - 14, dividerY);
    doc.setLineWidth(0.2);
    doc.line(14, dividerY + 1.2, pageWidth - 14, dividerY + 1.2);
    
    return dividerY + 5;
  }
};

