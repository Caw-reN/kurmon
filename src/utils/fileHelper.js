/**
 * fileHelper.js
 * Utility functions for handling file conversion, download, previews, and smart client-side compression.
 */
import { PDFDocument } from 'pdf-lib';

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

/**
 * Optimizes and compresses a PDF file on the client-side.
 * It uses PDF stream compression and strips unused object tables while keeping 100% visual fidelity.
 * 
 * @param {File} file - PDF file object
 * @returns {Promise<{ dataUrl: string, originalSizeStr: string, compressedSizeStr: string, savedPercent: number, isCompressed: boolean }>}
 */
export const optimizePdfFile = async (file) => {
  const originalSize = file.size;
  const originalSizeStr = (originalSize / (1024 * 1024)).toFixed(2) + ' MB';

  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
    
    // Save with object streams and compact xrefs
    const compressedBytes = await pdfDoc.save({ useObjectStreams: true, addDefaultPage: false });
    const compressedSize = compressedBytes.byteLength;
    
    let base64String = '';
    if (compressedSize < originalSize) {
      let binary = '';
      const len = compressedBytes.byteLength;
      const chunkSize = 8192;
      for (let i = 0; i < len; i += chunkSize) {
        binary += String.fromCharCode.apply(null, compressedBytes.subarray(i, Math.min(i + chunkSize, len)));
      }
      base64String = 'data:application/pdf;base64,' + window.btoa(binary);
      const compressedSizeStr = (compressedSize / (1024 * 1024)).toFixed(2) + ' MB';
      const savedPercent = Math.max(0, Math.round(((originalSize - compressedSize) / originalSize) * 100));
      return {
        dataUrl: base64String,
        originalSizeStr,
        compressedSizeStr,
        savedPercent,
        isCompressed: true
      };
    } else {
      const reader = new FileReader();
      const dataUrl = await new Promise((resolve) => {
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(file);
      });
      return {
        dataUrl,
        originalSizeStr,
        compressedSizeStr: originalSizeStr,
        savedPercent: 0,
        isCompressed: false
      };
    }
  } catch (err) {
    console.warn("Optimasi PDF dilewati, menggunakan berkas asli:", err);
    const reader = new FileReader();
    const dataUrl = await new Promise((resolve) => {
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(file);
    });
    return {
      dataUrl,
      originalSizeStr,
      compressedSizeStr: originalSizeStr,
      savedPercent: 0,
      isCompressed: false
    };
  }
};
