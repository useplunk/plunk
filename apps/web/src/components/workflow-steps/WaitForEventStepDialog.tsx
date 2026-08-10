import {Command, CommandGroup, CommandItem, CommandList, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@plunk/ui';
import {useState} from 'react';
import {toast} from 'sonner';
import useSWR from 'swr';

import {type EditStepDialogProps, getStepConfig, StepDialogShell, useStepUpdate} from './shared';

type TimeUnit = 'minutes' | 'hours' | 'days';

const SECONDS_PER_UNIT: Record<TimeUnit, number> = {
  minutes: 60,
  hours:   60 * 60,
  days:    60 * 60 * 24,
};

const MAX_BY_UNIT: Record<TimeUnit, number> = {
  minutes: 525600,
  hours:   8760,
  days:    365,
};

function isTimeUnit(value: unknown): value is TimeUnit {
  return value === 'minutes' || value === 'hours' || value === 'days';
}

function deriveTimeoutAmountUnit(timeoutSeconds: number): {amount: string; unit: TimeUnit} {
  if (timeoutSeconds === 0) return {amount: '0', unit: 'days'};
  if (timeoutSeconds % SECONDS_PER_UNIT.days === 0) {
    return {amount: String(timeoutSeconds / SECONDS_PER_UNIT.days), unit: 'days'};
  }
  if (timeoutSeconds % SECONDS_PER_UNIT.hours === 0) {
    return {amount: String(timeoutSeconds / SECONDS_PER_UNIT.hours), unit: 'hours'};
  }
  if (timeoutSeconds % SECONDS_PER_UNIT.minutes === 0) {
    return {amount: String(timeoutSeconds / SECONDS_PER_UNIT.minutes), unit: 'minutes'};
  }
  return {amount: String(Math.round(timeoutSeconds / SECONDS_PER_UNIT.hours)), unit: 'hours'};
}

export function WaitForEventStepDialog({step, workflowId, open, onOpenChange, onSuccess}: EditStepDialogProps) {
  const config = getStepConfig(step);

  const initialTimeout = deriveTimeoutAmountUnit(Number(config.timeout) || 86400);
  const initialUnit: TimeUnit = isTimeUnit(initialTimeout.unit) ? initialTimeout.unit : 'days';

  const [name, setName] = useState(step.name);
  const [eventName, setEventName] = useState(String(config.eventName ?? ''));
  const [eventPopoverOpen, setEventPopoverOpen] = useState(false);
  const [timeoutAmount, setTimeoutAmount] = useState(initialTimeout.amount);
  const [timeoutUnit, setTimeoutUnit] = useState<TimeUnit>(initialUnit);

  const {data: eventNamesData} = useSWR<{eventNames: string[]}>(open ? '/events/names' : null, {
    revalidateOnFocus: false,
  });

  const {update, isSubmitting} = useStepUpdate(workflowId, step.id);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!eventName) {
      toast.error('Event name is required');
      return;
    }

    const amount = parseInt(timeoutAmount, 10);
    if (amount > MAX_BY_UNIT[timeoutUnit]) {
      toast.error(`Timeout cannot exceed 365 days (${MAX_BY_UNIT[timeoutUnit]} ${timeoutUnit})`);
      return;
    }

    const timeoutSeconds = amount > 0 ? amount * SECONDS_PER_UNIT[timeoutUnit] : 0;

    const ok = await update({
      name,
      config: {eventName, timeout: timeoutSeconds},
    });

    if (ok) {
      onOpenChange(false);
      onSuccess();
    }
  };

  const filteredEventNames = eventNamesData?.eventNames?.filter(
    n => !eventName || n.toLowerCase().includes(eventName.toLowerCase()),
  );
  const showCustomEntry = eventName.trim() && !eventNamesData?.eventNames?.some(n => n === eventName.trim());

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
      <div className="space-y-4">
        <div>
          <Label htmlFor="editEventName">Event name</Label>
          <div className="relative">
            <Input
              id="editEventName"
              type="text"
              value={eventName}
              onChange={e => {
                setEventName(e.target.value);
                setEventPopoverOpen(true);
              }}
              onFocus={() => setEventPopoverOpen(true)}
              onBlur={() => {
                setTimeout(() => setEventPopoverOpen(false), 150);
              }}
              required
              placeholder="e.g., email.clicked, user.upgraded"
              className="mt-1.5"
              autoComplete="off"
            />
            {eventPopoverOpen && ((eventNamesData?.eventNames?.length ?? 0) > 0 || eventName.trim()) && (
              <div className="absolute z-50 w-full mt-1 rounded-md border border-neutral-200 bg-white shadow-md">
                <Command>
                  <CommandList>
                    <CommandGroup>
                      {filteredEventNames?.map(n => (
                        <CommandItem
                          key={n}
                          value={n}
                          onSelect={() => {
                            setEventName(n);
                            setEventPopoverOpen(false);
                          }}
                        >
                          {n}
                        </CommandItem>
                      ))}
                      {showCustomEntry && (
                        <CommandItem
                          key="__custom__"
                          value={eventName.trim()}
                          onSelect={() => {
                            setEventName(eventName.trim());
                            setEventPopoverOpen(false);
                          }}
                        >
                          Use &ldquo;{eventName.trim()}&rdquo;
                        </CommandItem>
                      )}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </div>
            )}
          </div>
        </div>

        <div>
          <Label htmlFor="editEventTimeoutAmount">Timeout (optional)</Label>
          <div className="flex gap-2 mt-1.5">
            <Input
              id="editEventTimeoutAmount"
              type="number"
              value={timeoutAmount}
              onChange={e => setTimeoutAmount(e.target.value)}
              placeholder="1"
              min="0"
              max={MAX_BY_UNIT[timeoutUnit]}
              className="flex-1"
            />
            <Select value={timeoutUnit} onValueChange={value => setTimeoutUnit(value as TimeUnit)}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="minutes">Minutes</SelectItem>
                <SelectItem value="hours">Hours</SelectItem>
                <SelectItem value="days">Days</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <p className="text-xs text-neutral-500 mt-1.5">If not received, the workflow continues after this time</p>
        </div>
      </div>
    </StepDialogShell>
  );
}
