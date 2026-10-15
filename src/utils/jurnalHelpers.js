/**
 * jurnalHelpers.js
 * Utility murni untuk perhitungan status dan format pengisian jurnal KBM.
 * Terpisah dari komponen React untuk mencegah circular dependency antara
 * JurnalHarianGuru.jsx dan RekapJurnalKelas.jsx.
 */

export function getJurnalSubmissionStatus(tanggalKBM, submittedAt) {
  if (!submittedAt) {
    const today = new Date().toISOString().split('T')[0];
    if (tanggalKBM && tanggalKBM < today) {
      const diffMs = new Date(today) - new Date(tanggalKBM);
      const diffDays = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)));
      return { 
        status: 'unsubmitted_past', 
        isLate: true, 
        diffDays, 
        label: `Belum Diisi (H-${diffDays})`,
        timeStr: '',
        dateStr: '',
        fullSubmitStr: ''
      };
    }
    return { 
      status: 'unsubmitted', 
      isLate: false, 
      diffDays: 0, 
      label: 'Belum Diisi',
      timeStr: '',
      dateStr: '',
      fullSubmitStr: ''
    };
  }

  let submitObj = new Date(submittedAt);
  if (isNaN(submitObj.getTime())) {
    submitObj = new Date();
  }

  // Format date & time consistently in Asia/Jakarta (WIB)
  const submitDateStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(submitObj);
  const kbmDateStr = typeof tanggalKBM === 'string' ? tanggalKBM.split('T')[0] : submitDateStr;

  const dSubmit = new Date(submitDateStr);
  const dKbm = new Date(kbmDateStr);

  const diffMs = dSubmit - dKbm;
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  const timeStr = new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Jakarta'
  }).format(submitObj).replace('.', ':');

  const dateStr = new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Jakarta'
  }).format(submitObj);

  if (diffDays > 0) {
    return {
      status: 'submitted_late',
      isLate: true,
      diffDays,
      timeStr,
      dateStr,
      fullSubmitStr: `${dateStr}, ${timeStr} WIB`,
      label: `Terlambat (H+${diffDays})`,
      note: `Diisi terlambat pada ${dateStr} pukul ${timeStr} WIB (H+${diffDays})`
    };
  }

  return {
    status: 'submitted_on_time',
    isLate: false,
    diffDays: 0,
    timeStr,
    dateStr,
    fullSubmitStr: `${dateStr}, ${timeStr} WIB`,
    label: 'Tepat Waktu',
    note: `Diisi pada ${dateStr} pukul ${timeStr} WIB`
  };
}
