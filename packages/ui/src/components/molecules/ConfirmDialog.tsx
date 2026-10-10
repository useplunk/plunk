import {CircleHelp, Trash2} from 'lucide-react';
import type {LucideIcon} from 'lucide-react';
import * as React from 'react';

import {Button, IconSpinner, Input, Label} from '../atoms';
import {Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle} from '../atoms/Dialog';
import {cn} from '../../lib';

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description: React.ReactNode;
  /**
   * Block-level content shown under the description: an Alert, a list of consequences,
   * a choice between options. Buttons rendered here must not submit anything.
   */
  details?: React.ReactNode;
  /**
   * Require the exact phrase to be typed before confirming, e.g. 'DELETE'. Use it for
   * actions that destroy data irreversibly, not for merely disruptive ones.
   */
  confirmPhrase?: string;
  confirmText?: string;
  loadingText?: string;
  cancelText?: string;
  variant?: 'default' | 'destructive';
  /**
   * Shown in the tile above the title. Defaults to a bin for destructive dialogs, so pass one
   * whenever the action is disruptive but doesn't delete anything (cancel, disconnect, reset).
   */
  icon?: LucideIcon;
  /** Blocks confirming for a reason the dialog explains itself, e.g. a field that's still in use. */
  confirmDisabled?: boolean;
  /** Forces the loading state, for callers that track the request themselves. */
  status?: 'idle' | 'loading';
}

const TILE_STYLES = {
  default: 'bg-neutral-100 text-neutral-700',
  destructive: 'bg-red-50 text-red-600',
};

export function ConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
  details,
  confirmPhrase,
  confirmText = 'Confirm',
  loadingText = 'Working…',
  cancelText = 'Cancel',
  variant = 'default',
  icon,
  confirmDisabled = false,
  status = 'idle',
}: ConfirmDialogProps) {
  const [typed, setTyped] = React.useState('');
  // Tracks an async onConfirm, so a double-click can't send the request twice even when the
  // caller doesn't pass `status`.
  const [pending, setPending] = React.useState(false);
  const inputId = React.useId();

  // Never carry a previous answer into the next confirmation.
  React.useEffect(() => {
    if (!open) {
      setTyped('');
    }
  }, [open]);

  const isLoading = status === 'loading' || pending;
  const phraseMatches = !confirmPhrase || typed.trim() === confirmPhrase;
  const canConfirm = phraseMatches && !confirmDisabled && !isLoading;
  const Icon = icon ?? (variant === 'destructive' ? Trash2 : CircleHelp);

  const handleConfirm = async () => {
    if (!canConfirm) {
      return;
    }

    setPending(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } finally {
      setPending(false);
    }
  };

  // Closing mid-request would hide the outcome, so Esc and the overlay wait for it to finish.
  const handleOpenChange = (next: boolean) => {
    if (!next && isLoading) {
      return;
    }
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="w-[calc(100%-2rem)] gap-0 overflow-hidden rounded-xl p-0 shadow-xl sm:max-w-md sm:rounded-xl"
      >
        <div className="max-h-[calc(90vh-4rem)] overflow-y-auto px-6 pb-6 pt-6">
          <div className={cn('mb-4 flex h-10 w-10 items-center justify-center rounded-lg', TILE_STYLES[variant])}>
            <Icon className="h-5 w-5" strokeWidth={1.75} />
          </div>

          <DialogHeader className="space-y-1.5 text-left">
            <DialogTitle className="text-base font-semibold leading-6 tracking-normal text-neutral-900">
              {title}
            </DialogTitle>
            {/* A div, not the default <p>, so callers can pass paragraphs and lists. */}
            <DialogDescription asChild>
              <div className="text-sm leading-relaxed text-neutral-500 [&_strong]:font-medium [&_strong]:text-neutral-900">
                {description}
              </div>
            </DialogDescription>
          </DialogHeader>

          {details && <div className="mt-4">{details}</div>}

          {confirmPhrase && (
            <div className="mt-5 grid gap-2">
              <Label htmlFor={inputId} className="font-normal text-neutral-600">
                Type{' '}
                <span className="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-xs font-medium text-neutral-900">
                  {confirmPhrase}
                </span>{' '}
                to confirm
              </Label>
              <Input
                id={inputId}
                value={typed}
                onChange={event => setTyped(event.target.value)}
                onKeyDown={event => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    void handleConfirm();
                  }
                }}
                autoComplete="off"
                autoCapitalize="off"
                spellCheck={false}
                disabled={isLoading}
                className="font-mono"
                // The phrase is the deliberate friction; autofocusing it keeps the modal
                // operable from the keyboard without removing that friction.
                autoFocus
              />
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 border-t border-neutral-100 bg-neutral-50 px-6 py-3">
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={isLoading}>
            {cancelText}
          </Button>
          <Button type="button" variant={variant} onClick={handleConfirm} disabled={!canConfirm}>
            {/* Both confirm variants are filled, so the spinner is light on either. */}
            {isLoading && <IconSpinner size="sm" className="border-white/30 border-t-white" />}
            {isLoading ? loadingText : confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
