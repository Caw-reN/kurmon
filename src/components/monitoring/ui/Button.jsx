import React, { forwardRef } from'react';
import { Loader2 } from'lucide-react';

const variantStyles = {
  primary: 'bg-[var(--ui-primary-btn,var(--ui-primary))] text-white hover:brightness-105 active:scale-95 shadow-sm border border-black/5',
  default: 'bg-[var(--ui-primary-btn,var(--ui-primary))] text-white hover:brightness-105 active:scale-95 shadow-sm border border-black/5',
  outline: 'border border-slate-200 bg-transparent text-slate-700 hover:bg-slate-50 shadow-2xs',
  secondary: 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200/60 shadow-2xs',
  ghost: 'bg-transparent hover:bg-slate-100/80 text-slate-650',
  danger: 'bg-rose-500 text-white hover:bg-rose-600 active:scale-95 shadow-sm border border-rose-600/20',
  destructive: 'bg-rose-500 text-white hover:bg-rose-600 active:scale-95 shadow-sm border border-rose-600/20',
};

const sizeStyles = {
  default: 'h-10 px-4 py-2 text-sm font-bold rounded-[var(--ui-radius-small,12px)] gap-1.5',
  md: 'h-10 px-4 py-2 text-sm font-bold rounded-[var(--ui-radius-small,12px)] gap-1.5',
  sm: 'h-8 px-3 py-1.5 text-xs font-bold rounded-[var(--ui-radius-small,10px)] gap-1.5',
  xs: 'h-6 px-2 py-1 text-[10px] font-bold rounded-[var(--ui-radius-small,8px)] gap-1',
  lg: 'h-11 px-5 py-2.5 text-base font-extrabold rounded-[var(--ui-radius-small,14px)] gap-2',
  icon: 'w-10 h-10 p-2 flex-shrink-0 rounded-[var(--ui-radius-small,12px)] flex items-center justify-center',
  'icon-sm': 'w-8 h-8 p-1.5 flex-shrink-0 rounded-[var(--ui-radius-small,10px)] flex items-center justify-center',
  'icon-xs': 'w-6 h-6 p-1 flex-shrink-0 rounded-[var(--ui-radius-small,8px)] flex items-center justify-center',
  'icon-lg': 'w-11 h-11 p-2 flex-shrink-0 rounded-[var(--ui-radius-small,14px)] flex items-center justify-center',
};

const baseStyles = 'inline-flex items-center justify-center transition-all duration-200 outline-none select-none disabled:pointer-events-none disabled:opacity-50 whitespace-nowrap cursor-pointer';

const Button = forwardRef(({
  children,
  variant ='primary',
  size ='md',
  loading = false,
  fullWidth = false,
  icon: Icon,
  iconPosition ='left',
  disabled,
  className ='',
  type ='button',
  ...props
}, ref) => {
  const isDisabled = disabled || loading;
  
  const variantClass = variantStyles[variant] || variantStyles.primary;
  const sizeClass = sizeStyles[size] || sizeStyles.md;
  const widthClass = fullWidth ?'w-full' :'';

  const finalClassName = `${baseStyles} ${variantClass} ${sizeClass} ${widthClass} ${className}`.trim();

  return (
    <button
      ref={ref}
      type={type}
      disabled={isDisabled}
      className={finalClassName}
      {...props}
    >
      {loading ? (
        <Loader2 size={16} className="animate-spin mr-2 shrink-0" />
      ) : (
        Icon && iconPosition ==='left' && <Icon size={16} className="mr-2 shrink-0" />
      )}
      
      {/* If children exist, render them */}
      {children}
      
      {!loading && Icon && iconPosition ==='right' && <Icon size={16} className="ml-2 shrink-0" />}
    </button>
  );
});

Button.displayName ='Button';

export default Button;
