/**
 * fileHelper.js
 * Utility functions for handling file conversion, download and previews.
 */

/**
 * Converts a Base64 Data URL to a native Blob URL.
 * This is useful for previewing large files (like PDFs) in iframes without URL length limits.
 * 
 * @param {string} base64Data - Base64 Data URL (e.g. "data:application/pdf;base64,...")
 * @returns {string} The Blob URL or the original string as fallback
 */
export const base64ToBlobUrl = (base64Data) => {
  if (!base64Data || !base64Data.startsWith('data:')) {
    return base64Data;
  }
  try {
    const parts = base64Data.split(';base64,');
    if (parts.length !== 2) return base64Data;
    const contentType = parts[0].split(':')[1];
    const raw = window.atob(parts[1]);
    const rawLength = raw.length;
    const uInt8Array = new Uint8Array(rawLength);
    for (let i = 0; i < rawLength; ++i) {
      uInt8Array[i] = raw.charCodeAt(i);
    }
    const blob = new Blob([uInt8Array], { type: contentType });
    return URL.createObjectURL(blob);
  } catch (e) {
    console.error("Gagal mengubah base64 ke blob url:", e);
    return base64Data;
  }
};
