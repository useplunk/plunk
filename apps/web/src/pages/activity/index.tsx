import {NextSeo} from 'next-seo';
import {parseAsArrayOf, parseAsString, parseAsStringLiteral, useQueryStates} from 'nuqs';

import {ActivityFeed} from '../../components/ActivityFeed';
import {ContactFilter} from '../../components/ContactFilter';
import {DashboardLayout} from '../../components/DashboardLayout';
import {FilterPill} from '../../components/data-table';
import {useActiveProject} from '../../lib/contexts/ActiveProjectProvider';

const CATEGORIES = [
  {value: 'emails', label: 'Emails', types: []},
  {value: 'events', label: 'Events', types: ['event.triggered']},
  {value: 'subscriptions', label: 'Subscriptions', types: ['contact.subscribed', 'contact.unsubscribed']},
  {value: 'workflows', label: 'Workflows', types: ['workflow.started', 'workflow.completed']},
] as const;
type Category = (typeof CATEGORIES)[number]['value'];

const EMAIL_STATUSES = [
  {value: 'sent', label: 'Sent', type: 'email.sent'},
  {value: 'delivered', label: 'Delivered', type: 'email.delivered'},
  {value: 'opened', label: 'Opened', type: 'email.opened'},
  {value: 'clicked', label: 'Clicked', type: 'email.clicked'},
  {value: 'bounced', label: 'Bounced', type: 'email.bounced'},
  {value: 'complaint', label: 'Complaints', type: 'email.complaint'},
  {value: 'received', label: 'Received', type: 'email.received'},
] as const;
type EmailStatus = (typeof EMAIL_STATUSES)[number]['value'];

/**
 * The activity types the feed should ask for. Filters combine as "any of": Events plus
 * Bounced shows events and bounced emails. Picking an email status implies emails, so it
 * works without also picking the Emails type.
 */
function resolveTypes(categories: Category[], statuses: EmailStatus[]): string | undefined {
  if (categories.length === 0 && statuses.length === 0) return undefined;

  const types = new Set<string>();
  for (const category of CATEGORIES) {
    if (categories.includes(category.value)) category.types.forEach(t => types.add(t));
  }

  const emailTypes =
    statuses.length > 0
      ? EMAIL_STATUSES.filter(s => statuses.includes(s.value)).map(s => s.type)
      : categories.includes('emails')
        ? EMAIL_STATUSES.map(s => s.type)
        : [];
  emailTypes.forEach(t => types.add(t));

  return [...types].join(',');
}

export default function ActivityPage() {
  const {activeProject} = useActiveProject();
  const [filters, setFilters] = useQueryStates(
    {
      type: parseAsArrayOf(parseAsStringLiteral(CATEGORIES.map(c => c.value))).withDefault([]),
      status: parseAsArrayOf(parseAsStringLiteral(EMAIL_STATUSES.map(s => s.value))).withDefault([]),
      contact: parseAsString,
    },
    {history: 'replace'},
  );

  const types = resolveTypes(filters.type, filters.status);
  const filtered = types !== undefined || !!filters.contact;

  // Scheduled sends are campaigns and workflow emails, so they belong with those filters
  const showScheduled =
    !filters.contact &&
    filters.status.length === 0 &&
    (filters.type.length === 0 || filters.type.includes('emails') || filters.type.includes('workflows'));

  const emptyMessage = filters.contact
    ? 'Nothing has happened for this contact yet. Their emails and events will show up here.'
    : types !== undefined
      ? 'Nothing matches these filters yet.'
      : undefined;

  return (
    <>
      <NextSeo title="Activity" />
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-neutral-900">Activity</h1>
            <p className="mt-2 text-sm text-neutral-500">
              Every email, event and workflow run in this project, newest first. Open a row for the details.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <FilterPill
              title="Type"
              options={CATEGORIES.map(({value, label}) => ({value, label}))}
              selected={filters.type}
              onChange={next => void setFilters({type: next as Category[]})}
            />
            <FilterPill
              title="Email status"
              options={EMAIL_STATUSES.map(({value, label}) => ({value, label}))}
              selected={filters.status}
              onChange={next => void setFilters({status: next as EmailStatus[]})}
            />
            <ContactFilter contactId={filters.contact} onChange={contact => void setFilters({contact})} />
            {filtered && (
              <button
                type="button"
                onClick={() => void setFilters({type: [], status: [], contact: null})}
                className="ml-1 rounded text-sm text-neutral-500 underline-offset-4 hover:text-neutral-900 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900"
              >
                Clear filters
              </button>
            )}
          </div>

          <section className="overflow-clip rounded-lg border border-neutral-200 bg-white">
            {activeProject && (
              <ActivityFeed
                // A different project or filter is a different feed, not an update to this one
                key={`${activeProject.id}:${types ?? 'all'}:${filters.contact ?? ''}`}
                typeFilter={types}
                contactId={filters.contact ?? undefined}
                showScheduled={showScheduled}
                emptyMessage={emptyMessage}
              />
            )}
          </section>
        </div>
      </DashboardLayout>
    </>
  );
}
