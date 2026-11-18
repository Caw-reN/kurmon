
import { Minus, TrendingUp, TrendingDown } from'lucide-react';


/**
 * StatCard.jsx — Dashboard statistic card
 * Menampilkan angka metrik dengan ikon dan label.
 */


/**
 * @param {string} props.label - judul statistik
 * @param {string|number} props.value - nilai utama
 * @param {string} props.sub - teks sekunder (misal:"dari 87 siswa")
 * @param {React.ComponentType} props.icon - ikon Lucide
 * @param {string} props.iconBg - tailwind bg class untuk ikon
 * @param {string} props.iconColor - tailwind text class untuk ikon
 * @param {number} props.trend - persentase perubahan (+ naik, - turun)
 */
const StatCard = ({
  label,
  value,
  sub,
  icon: Icon,
  iconBg ='bg-[var(--ui-primary)]/10',
  iconColor ='text-[var(--ui-primary)]',
  trend,
  className ='',
  onClick,
  ...rest
}) => {
  const trendIsPositive = trend > 0;
  const trendIsNeutral = trend === 0 || trend === undefined;

  return (
    <div
      onClick={onClick}
      className={`bg-white border border-border/80 rounded-[var(--ui-radius-card)]
        p-3 sm:p-4 md:p-5 flex flex-col min-[450px]:flex-row items-start min-[450px]:items-center gap-2.5 sm:gap-3.5 md:gap-4 shadow-xs
        transition-all duration-200 hover:shadow-sm hover:-translate-y-0.5
        ${onClick ? 'cursor-pointer hover:border-slate-300 active:scale-[0.99]' : ''}
        ${className}`}
      {...rest}
    >
      {/* Icon */}
      {Icon && (
        <div className={`w-9 h-9 sm:w-11 sm:h-11 md:w-13 md:h-13 rounded-[var(--ui-radius-small)] flex items-center justify-center flex-shrink-0 ${iconBg}`}>
          <Icon size={20} className={`w-4.5 h-4.5 sm:w-5.5 sm:h-5.5 md:w-6.5 md:h-6.5 ${iconColor}`} />
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-w-0 w-full">
        <p className="text-[9.5px] sm:text-xs text-slate-400 font-medium uppercase tracking-wider mb-1 truncate">{label}</p>
        <p className="text-lg sm:text-xl md:text-2xl font-bold text-slate-800 leading-none truncate">{value}</p>
        {sub && <p className="text-[10px] sm:text-xs text-slate-400 mt-1 truncate">{sub}</p>}

        {/* Trend indicator */}
        {trend !== undefined && (
          <div
            className={`inline-flex items-center gap-1 mt-2 text-xs font-semibold px-2 py-0.5 rounded-[var(--ui-radius-control)]
              ${trendIsNeutral ? 'bg-[var(--ui-surface-muted)] text-slate-500 border border-[var(--ui-border-soft)]' :
                trendIsPositive ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-600'}`}
          >
            {trendIsNeutral ? (
              <Minus size={12} />
            ) : trendIsPositive ? (
              <TrendingUp size={12} />
            ) : (
              <TrendingDown size={12} />
            )}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
    </div>
  );
};

export default StatCard;
