import * as DialogPrimitive from '@radix-ui/react-dialog';
import {X} from 'lucide-react';
import * as React from 'react';

import {cn} from '../../lib';

/**
 * A panel anchored to the edge of the viewport, built on the same Radix Dialog as
 * `Dialog` so focus trapping, escape handling and scroll locking behave identically.
 *
 * Use it for a focused list or detail view that the reader wants to open, read and
 * dismiss without losing the page behind it. A `Dialog` is still the right choice for
 * anything the reader has to answer before continuing.
 */
const Sheet = DialogPrimitive.Root;
const SheetTrigger = DialogPrimitive.Trigger;
const SheetClose = DialogPrimitive.Close;

function SheetOverlay({className, ref, ...props}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      ref={ref}
      className={cn(
        'fixed inset-0 z-50 bg-black/40 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
        className,
      )}
      {...props}
    />
  );
}
SheetOverlay.displayName = DialogPrimitive.Overlay.displayName;

function SheetContent({className, children, ref, ...props}: React.ComponentProps<typeof DialogPrimitive.Content>) {
  return (
    <DialogPrimitive.Portal>
      <SheetOverlay />
      <DialogPrimitive.Content
        ref={ref}
        className={cn(
          // Pinned to the right edge and sized by its own width, so the entrance is a
          // plain slide with no centering transform to fight. (The shadcn
          // `slide-in-from-*` helpers assume a translate-based centre and double up on a
          // panel like this one.)
          'fixed inset-y-0 right-0 z-50 flex h-full w-full flex-col border-l border-neutral-200 bg-white shadow-lg sm:max-w-md',
          'transition-transform duration-200 ease-out data-[state=closed]:translate-x-full data-[state=open]:translate-x-0',
          'motion-reduce:transition-none',
          className,
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close className="absolute right-4 top-4 rounded-md p-1.5 opacity-60 transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
          <X className="h-5 w-5" />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}
SheetContent.displayName = 'SheetContent';

const SheetHeader = ({className, ...props}: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex flex-col space-y-1 border-b border-neutral-100 p-6 pr-14', className)} {...props} />
);
SheetHeader.displayName = 'SheetHeader';

function SheetTitle({className, ref, ...props}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      ref={ref}
      className={cn('text-lg font-semibold leading-none tracking-tight', className)}
      {...props}
    />
  );
}
SheetTitle.displayName = DialogPrimitive.Title.displayName;

function SheetDescription({className, ref, ...props}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return <DialogPrimitive.Description ref={ref} className={cn('text-sm text-neutral-500', className)} {...props} />;
}
SheetDescription.displayName = DialogPrimitive.Description.displayName;

export {Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger};
