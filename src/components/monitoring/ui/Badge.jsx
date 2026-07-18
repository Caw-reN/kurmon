

/**
 * Badge.jsx — Status badge component
 * Digunakan untuk: status kehadiran, status jurnal, jurusan, dll.
 */

const variantMap = {
  // Status Kehadiran
  hadir:       { bg:'bg-emerald-100', text:'text-emerald-700', dot:'bg-emerald-500' },
  tepat_waktu: { bg:'bg-emerald-100', text:'text-emerald-700', dot:'bg-emerald-500' },
  terlambat:   { bg:'bg-red-100',     text:'text-red-700',     dot:'bg-red-500'     },
  izin:        { bg:'bg-blue-100',    text:'text-blue-700',    dot:'bg-blue-500'    },
  sakit:       { bg:'bg-yellow-100',  text:'text-amber-700',   dot:'bg-amber-500'   },
  alpa:        { bg:'bg-slate-900',   text:'text-slate-100',   dot:'bg-slate-300'   },
  absen:       { bg:'bg-slate-900',   text:'text-slate-100',   dot:'bg-slate-300'   },

  // Status Jurnal
  pending:   { bg:'bg-amber-100',   text:'text-amber-700',   dot:'bg-amber-500'   },
  approved:  { bg:'bg-emerald-100', text:'text-emerald-700', dot:'bg-emerald-500' },
  revision:  { bg:'bg-red-100',     text:'text-red-700',     dot:'bg-red-500'     },

  // Jurusan
  TKR:        { bg:'bg-red-100',    text:'text-red-700',     dot:'bg-red-500'     },
  TKJ:        { bg:'bg-[var(--ui-primary)]/15',   text:'text-[var(--ui-primary)]',    dot:'bg-[var(--ui-primary)]'    },
  MP:         { bg:'bg-purple-100', text:'text-purple-700',  dot:'bg-purple-500'  },
  AKL:        { bg:'bg-emerald-100',text:'text-emerald-700', dot:'bg-emerald-500' },
  TJKT:       { bg:'bg-[var(--ui-primary)]/15',   text:'text-[var(--ui-primary)]',    dot:'bg-[var(--ui-primary)]'    },
  Akuntansi:  { bg:'bg-purple-100', text:'text-purple-700',  dot:'bg-purple-500'  },
  DKV:        { bg:'bg-pink-100',   text:'text-pink-700',    dot:'bg-pink-500'    },

  // Generic
  default:   { bg:'bg-gray-100',   text:'text-gray-600',    dot:'bg-gray-400'    },
};

const labelMap = {
  belum_absen:'Belum Absen',
  hadir:'Hadir',
  absen:'Absen',
  terlambat:'Terlambat',
  izin:'Izin',
  sakit:'Sakit',
  alpa:'Alpa',
  pending:'Menunggu',
  approved:'Disetujui',
  revision:'Revisi',
};

/**
 * @param {object} props
 * @param {string} props.variant - key dari variantMap
 * @param {string} props.label - teks custom (override labelMap)
 * @param {boolean} props.withDot - tampilkan dot indicator
 */
const Badge = ({ variant ='default', label, withDot = true, className ='' }) => {
  const style = variantMap[variant] ?? variantMap.default;
  const text = label ?? labelMap[variant] ?? variant;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[var(--ui-radius-small)] text-xs font-semibold
        ${style.bg} ${style.text} ${className}`}
    >
      {withDot && (
        <span className={`w-1.5 h-1.5 rounded-[var(--ui-radius-small)] ${style.dot} flex-shrink-0`} />
      )}
      {text}
    </span>
  );
};

export default Badge;
