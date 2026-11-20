import { cn } from'@/lib/utils';"use client"




function Table({
  className,
  ...props
}) {
  return (
    <div
      data-slot="table-container"
      tabIndex={0}
      role="region"
      aria-label={props["aria-label"] || "Tabel data"}
      style={{ containerType: "inline-size" }}
      className="relative w-full overflow-x-auto overscroll-x-contain focus:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500/50 rounded-xl"
    >
      <table
        data-slot="table"
        className={cn("w-full caption-bottom text-xs", className)}
        {...props} />
    </div>
  );
}

function TableHeader({
  className,
  ...props
}) {
  return (
    <thead
      data-slot="table-header"
      className={cn("sticky top-0 z-10 bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur-xs [&_tr]:border-b", className)}
      {...props} />
  );
}

function TableBody({
  className,
  ...props
}) {
  return (
    <tbody
      data-slot="table-body"
      className={cn("[&_tr:last-child]:border-0", className)}
      {...props} />
  );
}

function TableFooter({
  className,
  ...props
}) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn("border-t bg-muted/50 font-medium [&>tr]:last:border-b-0", className)}
      {...props} />
  );
}

function TableRow({
  className,
  ...props
}) {
  return (
    <tr
      data-slot="table-row"
      className={cn("border-b transition-colors hover:bg-muted/50 has-aria-expanded:bg-muted/50 data-[state=selected]:bg-muted",
        className
      )}
      {...props} />
  );
}

function TableHead({
  className,
  ...props
}) {
  return (
    <th
      data-slot="table-head"
      scope="col"
      className={cn("h-11 px-4 text-left align-middle font-bold text-xs uppercase tracking-wider text-muted-foreground/80 whitespace-nowrap [&:has([role=checkbox])]:pr-0",
        className
      )}
      {...props} />
  );
}

function TableCell({
  className,
  ...props
}) {
  return (
    <td
      data-slot="table-cell"
      className={cn("px-4 py-3.5 align-middle whitespace-nowrap text-foreground font-medium [&:has([role=checkbox])]:pr-0",
        className
      )}
      {...props} />
  );
}

function TableCaption({
  className,
  ...props
}) {
  return (
    <caption
      data-slot="table-caption"
      className={cn("mt-4 text-xs text-muted-foreground", className)}
      {...props} />
  );
}

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
}
