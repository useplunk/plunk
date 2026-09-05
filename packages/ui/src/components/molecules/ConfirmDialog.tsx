import * as React from 'react';

import {Button, Input, Label} from '../atoms';
import {Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle} from '../atoms/Dialog';

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description: React.ReactNode;
  /**
   * Block-level content shown under the description: an Alert, a list of consequences.
   * Kept out of `description` because that renders a <p>, which cannot legally contain
   * a div or another paragraph.
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
  status?: 'idle' | 'loading';
}

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
  status = 'idle',
}: ConfirmDialogProps) {
  const isLoading = status === 'loading';
  const [typed, setTyped] = React.useState('');
  const inputId = React.useId();

  // Never carry a previous answer into the next confirmation.
  React.useEffect(() => {
    if (!open) {
      setTyped('');
    }
  }, [open]);

  const phraseMatches = !confirmPhrase || typed.trim() === confirmPhrase;
  const canConfirm = phraseMatches && !isLoading;

  const handleConfirm = async () => {
    if (!canConfirm) {
      return;
    }

    await onConfirm();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {details}

        {confirmPhrase && (
          <div className="grid gap-2">
            <Label htmlFor={inputId} className="text-neutral-700">
              Type <span className="font-mono font-semibold text-neutral-900">{confirmPhrase}</span> to confirm
            </Label>
            <Input
              id={inputId}
              value={typed}
              onChange={event => setTyped(event.target.value)}
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              disabled={isLoading}
              // The phrase is the deliberate friction; autofocusing it keeps the modal
              // operable from the keyboard without removing that friction.
              autoFocus
            />
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            {cancelText}
          </Button>
          <Button variant={variant} onClick={handleConfirm} disabled={!canConfirm}>
            {isLoading ? loadingText : confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
