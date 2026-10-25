import {
  Input,
  Label,
  RadioGroup,
  RadioGroupItem,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@plunk/ui';
import {useMemo} from 'react';
import useSWR from 'swr';

type EntryMode = 'once' | 'always' | 'throttle';
type WindowUnit = 'm' | 'h' | 'd' | 'none';

/** Who can enter a workflow, as the dialogs edit it */
export interface EntryRule {
  mode: EntryMode;
  amount: string;
  unit: WindowUnit;
  /** Field the window is counted separately for; '' counts per contact */
  key: string;
}

/** What a create or update sends for the rule */
export interface EntryRulePayload {
  allowReentry: boolean;
  throttle: string | {window?: string; key?: string} | null;
}

const UNIT_SECONDS: Record<Exclude<WindowUnit, 'none'>, number> = {m: 60, h: 3600, d: 86400};
const NO_KEY = '__contact__';

const MODES: Array<{value: EntryMode; label: string; description: string}> = [
  {value: 'once', label: 'Once per contact', description: 'A contact goes through this workflow one time, ever.'},
  {
    value: 'always',
    label: 'Every time the event fires',
    description: 'A contact enters again each time, even while an earlier run is still waiting.',
  },
  {
    value: 'throttle',
    label: 'At most once per period',
    description: 'Extra events within the period are ignored, so you can track the event as often as it happens.',
  },
];

export const DEFAULT_ENTRY_RULE: EntryRule = {mode: 'once', amount: '24', unit: 'h', key: ''};

/** The rule a saved workflow has */
export function entryRuleOf(workflow: {
  allowReentry: boolean;
  throttleWindowSeconds?: number | null;
  throttleKey?: string | null;
}): EntryRule {
  if (!workflow.allowReentry) {
    return DEFAULT_ENTRY_RULE;
  }

  const seconds = workflow.throttleWindowSeconds ?? null;
  const key = workflow.throttleKey ?? '';

  if (seconds === null && !key) {
    return {...DEFAULT_ENTRY_RULE, mode: 'always'};
  }

  if (seconds === null) {
    return {mode: 'throttle', amount: '', unit: 'none', key};
  }

  const unit = seconds % UNIT_SECONDS.d === 0 ? 'd' : seconds % UNIT_SECONDS.h === 0 ? 'h' : 'm';
  return {mode: 'throttle', amount: String(seconds / UNIT_SECONDS[unit]), unit, key};
}

export function entryRulePayload(rule: EntryRule): EntryRulePayload {
  if (rule.mode === 'once') {
    return {allowReentry: false, throttle: null};
  }

  if (rule.mode === 'always') {
    return {allowReentry: true, throttle: null};
  }

  const window = rule.unit === 'none' ? undefined : `${rule.amount}${rule.unit}`;
  if (!rule.key) {
    return {allowReentry: true, throttle: window ?? null};
  }

  return {allowReentry: true, throttle: {window, key: rule.key}};
}

/** Whether the rule can be saved; returns the problem to show when it cannot */
export function entryRuleError(rule: EntryRule): string | null {
  if (rule.mode !== 'throttle') {
    return null;
  }

  if (rule.unit === 'none') {
    return rule.key ? null : 'Pick a field to count by, or set a period';
  }

  const amount = Number(rule.amount);
  if (!Number.isInteger(amount) || amount < 1) {
    return 'Enter a whole number of 1 or more';
  }

  const seconds = amount * UNIT_SECONDS[rule.unit];
  if (seconds > 365 * UNIT_SECONDS.d) {
    return 'The period can be at most 365 days';
  }

  return null;
}

interface AvailableField {
  field: string;
  type: string;
  category: string;
}

interface WorkflowEntryRulesProps {
  value: EntryRule;
  onChange: (rule: EntryRule) => void;
  /** The trigger event, so event fields can be offered as the key */
  eventName?: string;
}

/**
 * "Who can enter" for a workflow: once per contact, every time, or at most once per period,
 * optionally counted separately per value of a field (the same throttle as POST /v1/send).
 */
export function WorkflowEntryRules({value, onChange, eventName}: WorkflowEntryRulesProps) {
  const fieldsUrl =
    value.mode === 'throttle'
      ? eventName?.trim()
        ? `/workflows/fields?eventName=${encodeURIComponent(eventName.trim())}`
        : '/workflows/fields'
      : null;

  const {data: fieldsData} = useSWR<{fields: string[]; typedFields?: AvailableField[]}>(fieldsUrl, {
    revalidateOnFocus: false,
  });

  const keyFields = useMemo(() => {
    const fields =
      fieldsData?.typedFields ?? fieldsData?.fields.map(f => ({field: f, type: 'string', category: 'Fields'})) ?? [];
    // Only custom data and event data can tell entries apart; built-in contact fields such as
    // email or createdAt are one value per contact, so they would just count per contact
    const usable = fields.filter(f => f.field.startsWith('contact.data.') || f.field.startsWith('event.'));
    // Keep a saved key selectable even when the field list no longer has it
    if (value.key && !usable.some(f => f.field === value.key)) {
      usable.push({field: value.key, type: 'string', category: 'Current'});
    }
    return usable;
  }, [fieldsData, value.key]);

  const grouped = useMemo(() => {
    const groups: Record<string, AvailableField[]> = {};
    for (const field of keyFields) {
      (groups[field.category] ??= []).push(field);
    }
    return groups;
  }, [keyFields]);

  const error = entryRuleError(value);

  return (
    <div className="space-y-2">
      <Label>Who can enter</Label>
      <RadioGroup value={value.mode} onValueChange={mode => onChange({...value, mode: mode as EntryMode})} className="gap-2">
        {MODES.map(option => (
          <div key={option.value} className="rounded-md border border-neutral-200">
            <label
              htmlFor={`entryMode-${option.value}`}
              className="flex items-start gap-3 p-3 cursor-pointer hover:bg-neutral-50 rounded-md"
            >
              <RadioGroupItem id={`entryMode-${option.value}`} value={option.value} className="mt-0.5" />
              <div className="space-y-0.5">
                <div className="text-sm font-medium text-neutral-900">{option.label}</div>
                <div className="text-xs text-neutral-500">{option.description}</div>
              </div>
            </label>

            {option.value === 'throttle' && value.mode === 'throttle' && (
              <div className="space-y-3 border-t border-neutral-200 px-3 pb-3 pt-3 pl-10">
                <div>
                  <Label htmlFor="entryWindowAmount" className="text-xs text-neutral-600">
                    Period
                  </Label>
                  <div className="mt-1 flex gap-2">
                    {value.unit !== 'none' && (
                      <Input
                        id="entryWindowAmount"
                        type="number"
                        min={1}
                        inputMode="numeric"
                        value={value.amount}
                        onChange={e => onChange({...value, amount: e.target.value})}
                        className="w-20"
                      />
                    )}
                    <Select
                      value={value.unit}
                      onValueChange={unit =>
                        onChange({
                          ...value,
                          unit: unit as WindowUnit,
                          amount: unit !== 'none' && !value.amount ? '1' : value.amount,
                        })
                      }
                    >
                      <SelectTrigger className="flex-1" aria-label="Period unit">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="m">{value.amount === '1' ? 'minute' : 'minutes'}</SelectItem>
                        <SelectItem value="h">{value.amount === '1' ? 'hour' : 'hours'}</SelectItem>
                        <SelectItem value="d">{value.amount === '1' ? 'day' : 'days'}</SelectItem>
                        <SelectItem value="none" disabled={!value.key}>
                          Once per field value
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="entryKey" className="text-xs text-neutral-600">
                    Count separately for each
                  </Label>
                  <Select
                    value={value.key || NO_KEY}
                    onValueChange={key => {
                      const nextKey = key === NO_KEY ? '' : key;
                      onChange({
                        ...value,
                        key: nextKey,
                        // "Once per field value" needs a field
                        ...(nextKey === '' && value.unit === 'none' ? {unit: 'h' as const, amount: '24'} : {}),
                      });
                    }}
                  >
                    <SelectTrigger id="entryKey" className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_KEY}>Contact</SelectItem>
                      {Object.entries(grouped).map(([category, fields]) => (
                        <div key={category}>
                          <div className="px-2 py-1.5 text-xs font-semibold text-neutral-500">{category}</div>
                          {fields.map(field => (
                            <SelectItem key={field.field} value={field.field}>
                              {field.field}
                            </SelectItem>
                          ))}
                        </div>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="mt-1 text-xs text-neutral-500">
                    For example an organisation ID, so a person in two organisations is counted once for each.
                  </p>
                </div>

                {error && <p className="text-xs text-red-600">{error}</p>}
              </div>
            )}
          </div>
        ))}
      </RadioGroup>
    </div>
  );
}
