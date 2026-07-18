import { cn } from'@/lib/utils';
import { ChevronDownIcon, ChevronUpIcon } from'lucide-react';


function Select({ children, ...props }) {
  return <>{children}</>;
}

function SelectGroup({ className, ...props }) {
  return <div className={cn("scroll-my-1 p-1", className)} {...props} />;
}

function SelectValue({ className, ...props }) {
  return <span className={cn("flex flex-1 text-left", className)} {...props} />;
}

function SelectTrigger({ className, size ="default", children, ...props }) {
  return (
    <button
      type="button"
      className={cn("flex w-fit items-center justify-between gap-1.5 rounded-xl border border-transparent bg-slate-100/80 px-3.5 py-1.5 text-xs font-bold whitespace-nowrap transition-all outline-none",
        className
      )}
      {...props}
    >
      {children}
      <ChevronDownIcon className="pointer-events-none size-3.5 text-muted-foreground" />
    </button>
  );
}

function SelectContent({ className, children, ...props }) {
  return (
    <div className={cn("relative z-50 min-w-32 rounded-lg bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10 p-1", className)} {...props}>
      {children}
    </div>
  );
}

function SelectLabel({ className, ...props }) {
  return <div className={cn("px-2 py-1.5 text-xs text-muted-foreground", className)} {...props} />;
}

function SelectItem({ className, children, ...props }) {
  return (
    <div
      className={cn("relative flex min-h-7 w-full cursor-default items-center gap-2 rounded-md px-2 py-1 text-xs/relaxed outline-hidden select-none hover:bg-accent hover:text-accent-foreground",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

function SelectSeparator({ className, ...props }) {
  return <div className={cn("pointer-events-none -mx-1 my-1 h-px bg-border/50", className)} {...props} />;
}

function SelectScrollUpButton({ className, ...props }) {
  return <div className={cn("flex w-full items-center justify-center py-1", className)} {...props}><ChevronUpIcon /></div>;
}

function SelectScrollDownButton({ className, ...props }) {
  return <div className={cn("flex w-full items-center justify-center py-1", className)} {...props}><ChevronDownIcon /></div>;
}

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
};
