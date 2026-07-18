import { cva } from'class-variance-authority';
import { cn } from'@/lib/utils';

/* eslint-disable react-refresh/only-export-components */

const buttonVariants = cva("group/button inline-flex shrink-0 items-center justify-center rounded-md border border-transparent bg-clip-padding text-xs/relaxed font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:"bg-primary text-white hover:brightness-105 active:translate-y-[1px] shadow-sm transition-all",
        outline:"border border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 hover:text-emerald-700 shadow-sm transition-all",
        secondary:"bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200 hover:text-slate-900 shadow-sm transition-all",
        blue:"border border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700 shadow-sm transition-all",
        teal:"border border-teal-200 bg-teal-50 text-teal-600 hover:bg-teal-100 hover:text-teal-700 shadow-sm transition-all",
        amber:"border border-amber-200 bg-amber-50 text-amber-600 hover:bg-amber-100 hover:text-amber-700 shadow-sm transition-all",
        ghost:"hover:bg-accent hover:text-accent-foreground aria-expanded:bg-accent aria-expanded:text-accent-foreground",
        destructive:"bg-rose-500 text-white hover:bg-rose-600 active:translate-y-[1px] shadow-sm transition-all focus-visible:ring-rose-500/20","outline-destructive":"border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 hover:text-rose-700 shadow-sm transition-all",
        link:"text-primary underline-offset-4 hover:underline",
      },
      size: {
        default:"h-10 gap-1.5 px-4 text-sm font-bold rounded-[var(--ui-radius-control)] [&_svg:not([class*='size-'])]:size-4",
        xs:"h-6 gap-1 rounded-[var(--ui-radius-small)] px-2 text-[10px] font-bold [&_svg:not([class*='size-'])]:size-2.5",
        sm:"h-8.5 gap-1.5 px-3.5 text-xs font-bold rounded-[var(--ui-radius-small)] [&_svg:not([class*='size-'])]:size-3.5",
        lg:"h-11 gap-2 px-5 text-sm font-extrabold rounded-[var(--ui-radius-control)] [&_svg:not([class*='size-'])]:size-4.5",
        icon:"size-9.5 rounded-xl [&_svg:not([class*='size-'])]:size-4.5","icon-xs":"size-6 rounded-md [&_svg:not([class*='size-'])]:size-3","icon-sm":"size-8 rounded-lg [&_svg:not([class*='size-'])]:size-3.5","icon-lg":"size-11 rounded-xl [&_svg:not([class*='size-'])]:size-5",
      },
    },
    defaultVariants: {
      variant:"default",
      size:"default",
    },
  }
)

function Button({ className, variant ="default", size ="default", ...props }) {
  return (
    <button
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants }
