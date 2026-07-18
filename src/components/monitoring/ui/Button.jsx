import React, { forwardRef } from'react';
import { Loader2 } from'lucide-react';

const variantStyles = {
  primary:'',
  default:'',
  outline:'',
  secondary:'',
  ghost:'',
  danger:'',
  destructive:'',
};

const sizeStyles = {
  default:'',
  md:'',
  sm:'',
  xs:'',
  lg:'',
  icon:'','icon-sm':'','icon-xs':'','icon-lg':'',
};

const baseStyles ='';

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
