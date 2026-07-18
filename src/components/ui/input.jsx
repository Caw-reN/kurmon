import { cn } from'@/lib/utils';

import { InputPrimitive } from'lucide-react';

function Input({
  className,
  type,
  ...props
}) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn("h-9.5 w-full min-w-0 rounded-xl border border-transparent bg-slate-100/80 px-3.5 py-1.5 text-sm transition-all outline-none file:inline-flex file:h-8 file:border-0 file:bg-transparent file:text-xs/relaxed file:font-semibold file:text-foreground placeholder:text-muted-foreground/60 focus-visible:bg-white focus-visible:border-primary/40 focus-visible:ring-2 focus-visible:ring-primary/10 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 md:text-xs/relaxed font-bold",
        className
      )}
      {...props} />
  );
}

export { Input }
