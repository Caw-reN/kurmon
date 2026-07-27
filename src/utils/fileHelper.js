/**
 * fileHelper.js
 * Utility functions for handling file conversion, download and previews.
 */

/**
 * Converts a Base64 Data URL or raw Base64 to a native Blob URL.
 * This is useful for previewing large files (like PDFs) in iframes without URL length limits.
 * 
 * @param {string} base64Data - Base64 Data URL or raw Base64 string
 * @returns {string} The Blob URL or the original string as fallback
 */
export const base64ToBlobUrl = (base64Data) => {
  if (!base64Data) return base64Data;
  let dataStr = base64Data;
  
  // If it's pure base64 without data URI scheme, default to application/pdf
  if (typeof dataStr === 'string' && !dataStr.startsWith('data:') && !dataStr.startsWith('http') && !dataStr.startsWith('/') && !dataStr.startsWith('blob:')) {
    dataStr = 'data:application/pdf;base64,' + dataStr.trim();
  }

  if (typeof dataStr !== 'string' || !dataStr.startsWith('data:')) {
    return dataStr;
  }
  
  try {
    const parts = dataStr.split(';base64,');
    if (parts.length !== 2) return dataStr;
    const contentType = parts[0].split(':')[1] || 'application/octet-stream';
    const raw = window.atob(parts[1].trim());
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

/**
 * Downloads a file safely by converting base64 or remote URL to a Blob URL
 * to prevent browser URL length limits and cross-origin download restrictions.
 * 
 * @param {string} fileUrl - Data URL, Blob URL, relative or absolute HTTP URL
 * @param {string} fileName - Suggested filename for download
 */
export const downloadFile = async (fileUrl, fileName) => {
  if (!fileUrl) return;
  try {
    let url = fileUrl;
    
    // If it's a URL (http/https or relative path), fetch as blob to force download
    if (typeof fileUrl === 'string' && (fileUrl.startsWith('http') || fileUrl.startsWith('/'))) {
      try {
        const response = await fetch(fileUrl);
        if (response.ok) {
          const blob = await response.blob();
          url = URL.createObjectURL(blob);
        }
      } catch (fetchErr) {
        url = fileUrl;
      }
    } else if (typeof fileUrl === 'string') {
      url = base64ToBlobUrl(fileUrl);
    }

    const link = document.createElement('a');
    link.href = url;
    link.download = fileName || 'download';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    if (url !== fileUrl && url.startsWith('blob:')) {
      setTimeout(() => URL.revokeObjectURL(url), 3000);
    }
  } catch (e) {
    console.error("Gagal mendownload file:", e);
    window.open(fileUrl, '_blank');
  }
};
