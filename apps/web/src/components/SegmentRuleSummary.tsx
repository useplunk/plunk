import type {FilterCondition, SegmentFilter} from '@plunk/types';

/**
 * One readable token per filter, e.g. `plan = pro`, `user.signup in last 30d`.
 * Split into parts so the field, operator and value can be styled separately.
 */
interface RulePart {
  field: string;
  op?: string;
  value?: string;
}

const STANDARD_FIELD_LABELS: Record<string, string> = {
  email: 'Email',
  createdAt: 'Created',
  updatedAt: 'Updated',
};

const UNIT_SHORT: Record<string, string> = {minutes: 'm', hours: 'h', days: 'd'};

function fieldLabel(field: string, segmentNames: Map<string, string>): string {
  if (field.startsWith('data.')) return field.slice(5);
  if (field.startsWith('event.')) return field.slice(6);
  if (field.startsWith('segment.')) return segmentNames.get(field.slice(8)) ?? 'a deleted segment';
  return STANDARD_FIELD_LABELS[field] ?? field;
}

function formatValue(value: unknown): string {
  if (typeof value === 'string') return value === '' ? '""' : value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return JSON.stringify(value);
}

function describeFilter(filter: SegmentFilter, segmentNames: Map<string, string>): RulePart {
  const field = fieldLabel(filter.field, segmentNames);
  const span = `${filter.value}${UNIT_SHORT[filter.unit ?? 'days'] ?? ''}`;

  // The subscribed flag reads better as a state than as `subscribed = true`.
  if (filter.field === 'subscribed' && (filter.operator === 'equals' || filter.operator === 'notEquals')) {
    const isSubscribed = (filter.value === true) === (filter.operator === 'equals');
    return {field: isSubscribed ? 'Subscribed' : 'Unsubscribed'};
  }

  switch (filter.operator) {
    case 'equals':
      return {field, op: '=', value: formatValue(filter.value)};
    case 'notEquals':
      return {field, op: '≠', value: formatValue(filter.value)};
    case 'contains':
      return {field, op: 'contains', value: formatValue(filter.value)};
    case 'notContains':
      return {field, op: 'excludes', value: formatValue(filter.value)};
    case 'greaterThan':
      return {field, op: '>', value: formatValue(filter.value)};
    case 'lessThan':
      return {field, op: '<', value: formatValue(filter.value)};
    case 'greaterThanOrEqual':
      return {field, op: '≥', value: formatValue(filter.value)};
    case 'lessThanOrEqual':
      return {field, op: '≤', value: formatValue(filter.value)};
    case 'exists':
      return {field, op: 'is set'};
    case 'notExists':
      return {field, op: 'is empty'};
    case 'within':
      return {field, op: 'within', value: span};
    case 'olderThan':
      return {field, op: 'over', value: `${span} ago`};
    case 'triggered':
      return {field, op: 'ever'};
    case 'triggeredWithin':
      return {field, op: 'in last', value: span};
    case 'triggeredOlderThan':
      return {field, op: 'not in last', value: span};
    case 'notTriggered':
      return {field, op: 'never'};
    case 'notTriggeredWithin':
      return {field, op: 'none in last', value: span};
    case 'memberOfSegment':
      return {field: 'in', value: field};
    case 'notMemberOfSegment':
      return {field: 'not in', value: field};
    default:
      return {field, op: filter.operator};
  }
}

type RuleToken = {kind: 'rule'; part: RulePart} | {kind: 'join'; logic: string} | {kind: 'nested'; count: number};

function countFilters(condition: FilterCondition): number {
  return condition.groups.reduce(
    (total, group) => total + group.filters.length + (group.conditions ? countFilters(group.conditions) : 0),
    0,
  );
}

/**
 * Flattens a condition into display tokens. Filters inside a group are ANDed; groups are joined
 * by the condition's logic. A nested condition collapses into a single "+N nested" token rather
 * than being inlined, so the summary never implies a precedence the segment doesn't have.
 */
function tokenize(condition: FilterCondition, segmentNames: Map<string, string>): RuleToken[] {
  const tokens: RuleToken[] = [];
  condition.groups.forEach((group, groupIndex) => {
    if (groupIndex > 0) tokens.push({kind: 'join', logic: condition.logic});
    group.filters.forEach((filter, filterIndex) => {
      if (filterIndex > 0) tokens.push({kind: 'join', logic: 'AND'});
      tokens.push({kind: 'rule', part: describeFilter(filter, segmentNames)});
    });
    if (group.conditions) {
      if (group.filters.length > 0) tokens.push({kind: 'join', logic: 'AND'});
      tokens.push({kind: 'nested', count: countFilters(group.conditions)});
    }
  });
  return tokens;
}

/** Plain-text version of the rules, used to make segments searchable by what they filter on. */
export function segmentRuleText(condition: unknown, segmentNames: Map<string, string>): string {
  if (!isCondition(condition)) return '';
  return tokenize(condition, segmentNames)
    .map(t =>
      t.kind === 'rule' ? [t.part.field, t.part.op, t.part.value].filter(Boolean).join(' ') : t.kind === 'join' ? t.logic : '',
    )
    .join(' ');
}

function isCondition(condition: unknown): condition is FilterCondition {
  return !!condition && typeof condition === 'object' && Array.isArray((condition as FilterCondition).groups);
}

interface SegmentRuleSummaryProps {
  condition: unknown;
  /** Segment id → name, to resolve "member of segment" filters. */
  segmentNames: Map<string, string>;
  /** Rules shown before collapsing the rest into "+N more". */
  maxRules?: number;
  className?: string;
}

export function SegmentRuleSummary({condition, segmentNames, maxRules = 3, className = ''}: SegmentRuleSummaryProps) {
  if (!isCondition(condition)) return null;

  const tokens = tokenize(condition, segmentNames);
  const visible: RuleToken[] = [];
  let shown = 0;
  let hidden = 0;
  for (const token of tokens) {
    if (token.kind === 'join') {
      if (shown < maxRules) visible.push(token);
      continue;
    }
    if (shown < maxRules) {
      visible.push(token);
      shown++;
    } else {
      hidden += token.kind === 'nested' ? token.count : 1;
    }
  }
  // Drop a trailing joiner left behind by the cut-off.
  if (visible[visible.length - 1]?.kind === 'join') visible.pop();

  return (
    <div className={'flex flex-wrap items-center gap-1 text-xs ' + className}>
      {visible.map((token, i) =>
        token.kind === 'join' ? (
          <span key={i} className="px-0.5 text-[10px] font-medium uppercase tracking-wider text-neutral-400">
            {token.logic === 'OR' ? 'or' : 'and'}
          </span>
        ) : token.kind === 'nested' ? (
          <span key={i} className="rounded-md border border-dashed border-neutral-200 px-1.5 py-0.5 text-neutral-500">
            {token.count} nested
          </span>
        ) : (
          <span key={i} className="inline-flex max-w-full items-center gap-1 rounded-md bg-neutral-100 px-1.5 py-0.5">
            <span className="truncate text-neutral-700">{token.part.field}</span>
            {token.part.op && <span className="shrink-0 text-neutral-400">{token.part.op}</span>}
            {token.part.value && <span className="truncate font-medium text-neutral-900">{token.part.value}</span>}
          </span>
        ),
      )}
      {hidden > 0 && <span className="text-neutral-400">+{hidden} more</span>}
    </div>
  );
}
