import React, { useEffect, useRef } from'react';
import { cn } from'@/lib/utils';
import { XIcon } from'lucide-react';


function Dialog({ open, onOpenChange, children }) {
  return <>{open ? children : null}</>;
}

function DialogTrigger({ children, onClick, ...props }) {
  return React.cloneElement(React.Children.only(children), {
    onClick: (e) => { children.props.onClick?.(e); onClick?.(e); },
    ...props
  });
}

function DialogPortal({ children }) {
  return <>{children}</>;
}

function DialogOverlay({ className, onClick, ...props }) {
  return (
    <div
      data-slot="dialog-overlay"
      className={cn('fixed inset-0 isolate z-50 bg-black/70 backdrop-blur-sm', className)}
      onClick={onClick}
      {...props}
    />
  );
}

function DialogContent({ className, children, showCloseButton = true, onClose, ...props }) {
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (e.key ==='Escape') onClose?.();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <DialogPortal>
      <DialogOverlay onClick={onClose} />
      <div
        ref={ref}
        data-slot="dialog-content"
        className={cn('fixed top-1/2 left-1/2 z-50 grid w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-4 rounded-xl bg-popover p-4 text-xs/relaxed text-popover-foreground ring-1 ring-foreground/10 outline-none animate-in fade-in-0 zoom-in-95',
          className
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <button
            type="button"
            onClick={onClose}
            className="absolute top-2 right-2 inline-flex items-center justify-center rounded-md p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
          >
            <XIcon size={15} strokeWidth={2.5} />
            <span className="sr-only">Close</span>
          </button>
        )}
      </div>
    </DialogPortal>
  );
}

function DialogClose({ children, onClick, ...props }) {
  return React.cloneElement(React.Children.only(children), {
    onClick: (e) => { children.props.onClick?.(e); onClick?.(e); },
    ...props
  });
}

function DialogHeader({ className, ...props }) {
  return (
    <div
      data-slot="dialog-header"
      className={cn('flex flex-col gap-1', className)}
      {...props}
    />
  );
}

function DialogFooter({ className, children, ...props }) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn('flex flex-col-reverse gap-2 sm:flex-row sm:justify-end', className)}
      {...props}
    >
      {children}
    </div>
  );
}

function DialogTitle({ className, ...props }) {
  return (
    <h2
      data-slot="dialog-title"
      className={cn('font-heading text-sm font-medium', className)}
      {...props}
    />
  );
}

function DialogDescription({ className, ...props }) {
  return (
    <p
      data-slot="dialog-description"
      className={cn('text-xs/relaxed text-muted-foreground', className)}
      {...props}
    />
  );
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
};
