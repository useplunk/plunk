import {useState} from 'react';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ConfirmDialog,
  EmptyState,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  IconSpinner,
} from '@plunk/ui';
import {Database, Trash2, Zap} from 'lucide-react';
import {toast} from 'sonner';
import useSWR from 'swr';
import {useActiveProject} from '../lib/contexts/ActiveProjectProvider';
import {network} from '../lib/network';

interface FieldData {
  field: string;
  type: 'string' | 'number' | 'boolean' | 'date';
  coverage: number;
}

interface FieldUsage {
  usedInSegments: Array<{id: string; name: string}>;
  usedInCampaigns: Array<{id: string; name: string}>;
  contactCount: number;
  canDelete: boolean;
}

interface EventUsage {
  usedInSegments: Array<{id: string; name: string}>;
  usedInWorkflows: Array<{id: string; name: string}>;
  totalCount: number;
  uniqueContacts: number;
  canDelete: boolean;
}

export function DataManagementSettings() {
  const {activeProject} = useActiveProject();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedField, setSelectedField] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch contact fields
  const {data: fieldsData, mutate: mutateFields} = useSWR<{fields: FieldData[]; count: number}>(
    activeProject?.id ? `/contacts/fields` : null,
  );

  // Fetch event names
  const {data: eventsData, mutate: mutateEvents} = useSWR<{eventNames: string[]}>(
    activeProject?.id ? `/events/names` : null,
  );

  // Fetch field usage for selected field
  const {data: fieldUsage} = useSWR<FieldUsage>(
    selectedField ? `/contacts/fields/${encodeURIComponent(selectedField)}/usage` : null,
  );

  // Fetch event usage for selected event
  const {data: eventUsage} = useSWR<EventUsage>(
    selectedEvent ? `/events/${encodeURIComponent(selectedEvent)}/usage` : null,
  );

  // Filter out standard fields and only show custom data fields
  const customFields = fieldsData?.fields.filter(f => f.field.startsWith('data.')) || [];

  // Filter out system events
  const customEvents =
    eventsData?.eventNames.filter(
      name => !name.startsWith('email.') && !name.startsWith('segment.') && !name.startsWith('contact.'),
    ) || [];

  const handleDeleteField = async () => {
    if (!selectedField || !fieldUsage?.canDelete) return;

    setIsDeleting(true);
    try {
      const result = await network.fetch<{deletedFrom: number}>(
        'DELETE',
        `/contacts/fields/${encodeURIComponent(selectedField)}`,
      );

      toast.success(`Field deleted from ${result.deletedFrom} contact(s)`);
      setDeleteDialogOpen(false);
      setSelectedField(null);
      mutateFields();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Couldn’t delete the field. Try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteEvent = async () => {
    if (!selectedEvent || !eventUsage?.canDelete) return;

    setIsDeleting(true);
    try {
      const result = await network.fetch<{deletedCount: number}>(
        'DELETE',
        `/events/${encodeURIComponent(selectedEvent)}`,
      );

      toast.success(`Deleted ${result.deletedCount} event(s)`);
      setDeleteDialogOpen(false);
      setSelectedEvent(null);
      mutateEvents();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Couldn’t delete the event. Try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const openFieldDeleteDialog = (field: string) => {
    setSelectedField(field);
    setSelectedEvent(null);
    setDeleteDialogOpen(true);
  };

  const openEventDeleteDialog = (eventName: string) => {
    setSelectedEvent(eventName);
    setSelectedField(null);
    setDeleteDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Custom Contact Fields */}
      <Card>
        <CardHeader>
          <CardTitle>Custom contact fields</CardTitle>
          <CardDescription>
            Fields set on contacts through the API. A field used by a segment or campaign can’t be deleted.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {customFields.length === 0 ? (
            <EmptyState
              icon={Database}
              title="No custom fields"
              description="Custom fields appear here once contacts have data properties set via the API."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Field name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Coverage</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customFields.map(field => (
                  <TableRow key={field.field}>
                    <TableCell className="font-mono text-sm">{field.field.replace('data.', '')}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{field.type}</Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-neutral-500">{field.coverage}%</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => openFieldDeleteDialog(field.field)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Custom Events */}
      <Card>
        <CardHeader>
          <CardTitle>Custom events</CardTitle>
          <CardDescription>
            Events your contacts have triggered. An event used by a segment or workflow can’t be deleted, and
            neither can system events (email.*, segment.*).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {customEvents.length === 0 ? (
            <EmptyState
              icon={Zap}
              title="No custom events"
              description="Custom events appear here once your contacts trigger events via the API."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event name</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customEvents.map(eventName => (
                  <TableRow key={eventName}>
                    <TableCell className="font-mono text-sm">{eventName}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => openEventDeleteDialog(eventName)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={selectedField ? handleDeleteField : handleDeleteEvent}
        title={selectedField ? `Delete ${selectedField.replace('data.', '')}?` : `Delete ${selectedEvent}?`}
        description={
          selectedField
            ? 'The field is removed from every contact that has it. This can’t be undone.'
            : 'Every recorded instance of this event is deleted. This can’t be undone.'
        }
        details={
          selectedField ? (
            <UsageDetails
              loading={!fieldUsage}
              rows={
                fieldUsage && [
                  ['Contacts with this field', fieldUsage.contactCount],
                  ['Used in segments', fieldUsage.usedInSegments.length],
                  ['Used in campaigns', fieldUsage.usedInCampaigns.length],
                ]
              }
              blockers={
                fieldUsage && !fieldUsage.canDelete
                  ? [
                      ...fieldUsage.usedInSegments.map(s => ({id: s.id, kind: 'Segment', name: s.name})),
                      ...fieldUsage.usedInCampaigns.map(c => ({id: c.id, kind: 'Campaign', name: c.name})),
                    ]
                  : undefined
              }
              subject="field"
            />
          ) : (
            <UsageDetails
              loading={!eventUsage}
              rows={
                eventUsage && [
                  ['Recorded events', eventUsage.totalCount],
                  ['Unique contacts', eventUsage.uniqueContacts],
                  ['Used in segments', eventUsage.usedInSegments.length],
                  ['Used in workflows', eventUsage.usedInWorkflows.length],
                ]
              }
              blockers={
                eventUsage && !eventUsage.canDelete
                  ? [
                      ...eventUsage.usedInSegments.map(s => ({id: s.id, kind: 'Segment', name: s.name})),
                      ...eventUsage.usedInWorkflows.map(w => ({id: w.id, kind: 'Workflow', name: w.name})),
                    ]
                  : undefined
              }
              subject="event"
            />
          )
        }
        confirmDisabled={selectedField ? !fieldUsage?.canDelete : !eventUsage?.canDelete}
        confirmText={selectedField ? 'Delete field' : 'Delete event'}
        loadingText="Deleting…"
        variant="destructive"
        status={isDeleting ? 'loading' : 'idle'}
      />
    </div>
  );
}

interface UsageDetailsProps {
  loading: boolean;
  rows: Array<[label: string, value: number]> | undefined;
  /** What still references the field or event. Present only when that blocks deleting it. */
  blockers: Array<{id: string; kind: string; name: string}> | undefined;
  subject: 'field' | 'event';
}

function UsageDetails({loading, rows, blockers, subject}: UsageDetailsProps) {
  if (loading || !rows) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-neutral-200 px-3 py-2.5 text-sm text-neutral-500">
        <IconSpinner size="sm" />
        Checking where this {subject} is used…
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <dl className="divide-y divide-neutral-100 rounded-lg border border-neutral-200 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between px-3 py-2">
            <dt className="text-neutral-500">{label}</dt>
            <dd className="font-medium tabular-nums text-neutral-900">{value.toLocaleString()}</dd>
          </div>
        ))}
      </dl>

      {blockers && (
        <div className="rounded-lg bg-red-50 px-3 py-2.5 text-sm">
          <p className="font-medium text-red-700">Remove it from these first</p>
          <ul className="mt-1.5 space-y-0.5 text-red-700/80">
            {blockers.map(blocker => (
              <li key={`${blocker.kind}-${blocker.id}`} className="truncate">
                <span className="text-red-700/60">{blocker.kind} · </span>
                {blocker.name}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
