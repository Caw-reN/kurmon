

/**
 * Toggle.jsx — Animated toggle switch component
 * Digunakan di halaman Pengaturan Absensi Admin.
 */

/**
 * @param {object} props
 * @param {boolean} props.checked - nilai toggle (controlled)
 * @param {function} props.onChange - callback saat diubah
 * @param {string} props.label - label teks
 * @param {string} props.description - deskripsi kecil di bawah label
 * @param {React.ComponentType} props.icon - ikon Lucide
 * @param {boolean} props.disabled
 */
const Toggle = ({
  checked = false,
  onChange,
  label ='',
  description ='',
  icon: Icon,
  disabled = false,
  className ='',
}) => {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => !disabled && onChange?.(!checked)}
      className={['flex items-center gap-4 w-full text-left','focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ui-primary)] focus-visible:ring-offset-2','disabled:opacity-50 disabled:cursor-not-allowed',
        className,
      ].join('')}
    >
      {/* Icon */}
      {Icon && (
        <div
          className={`w-10 h-10 rounded-[var(--ui-radius-control)] flex items-center justify-center flex-shrink-0
            transition-colors duration-200
            ${checked ? 'bg-[var(--ui-primary)] text-white' : 'bg-[var(--ui-surface-muted)] text-slate-400 border border-[var(--ui-border-soft)]'}`}
        >
          <Icon size={20} />
        </div>
      )}

      {/* Label & Description */}
      <div className="flex-1 min-w-0">
        <p className={`font-semibold text-sm ${checked ?'text-[var(--ui-primary)]' :'text-gray-700'}`}>
          {label}
        </p>
        {description && (
          <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{description}</p>
        )}
      </div>

      {/* Toggle track */}
      <div
        className={['relative flex-shrink-0 w-12 h-6 rounded-full', 'transition-colors duration-300 ease-in-out',
          checked ? 'bg-[var(--ui-primary)]' : 'bg-[var(--ui-border-soft)]',
        ].join(' ')}
      >
        {/* Toggle thumb */}
        <div
          className={['absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm','transition-transform duration-300 ease-in-out',
            checked ?'translate-x-7' :'translate-x-1',
          ].join('')}
        />
      </div>
    </button>
  );
};

export default Toggle;
