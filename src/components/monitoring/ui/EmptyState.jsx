import { Inbox } from'lucide-react';

/**
 * EmptyState.jsx — Empty data placeholder component
 */


/**
 * @param {React.ComponentType} props.icon - ikon custom
 * @param {string} props.title
 * @param {string} props.description
 * @param {React.ReactNode} props.action - tombol CTA
 */
const EmptyState = ({
  icon: Icon = Inbox,
  title ='Tidak ada data',
  description ='',
  action,
  className ='',
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center py-16 px-8 text-center ${className}`}
    >
      <div className="w-16 h-16 rounded-[var(--ui-radius-small)] bg-[var(--ui-primary)]/10 flex items-center justify-center mb-4">
        <Icon size={32} className="text-[var(--ui-primary)]" />
      </div>
      <h3 className="font-bold text-gray-800 mb-1">{title}</h3>
      {description && <p className="text-sm text-slate-400 max-w-xs">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
};

export default EmptyState;
