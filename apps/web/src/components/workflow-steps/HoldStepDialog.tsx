import {useState} from 'react';

import {type EditStepDialogProps, StepDialogShell, useStepUpdate} from './shared';

export function HoldStepDialog({step, workflowId, open, onOpenChange, onSuccess}: EditStepDialogProps) {
  const [name, setName] = useState(step.name);

  const {update, isSubmitting} = useStepUpdate(workflowId, step.id);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // A HOLD has nothing to configure, and sending only the name keeps a rename possible while contacts run
    const ok = await update({name});

    if (ok) {
      onOpenChange(false);
      onSuccess();
    }
  };

  return (
    <StepDialogShell
      step={step}
      open={open}
      onOpenChange={onOpenChange}
      name={name}
      onNameChange={setName}
      onSubmit={handleSubmit}
      isSubmitting={isSubmitting}
    >
      <p className="text-sm text-neutral-600">
        To send more emails to the contacts waiting here, insert steps on a connection into this hold. Contacts who
        arrived through that connection go through the new steps as soon as they are configured, then wait here again.
      </p>
    </StepDialogShell>
  );
}
