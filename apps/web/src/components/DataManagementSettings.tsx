import {useState} from 'react';
import {
  Alert,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  EmptyState,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  IconSpinner,
} from '@plunk/ui';
import {AlertCircle, Database, Trash2, Zap} from 'lucide-react';
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

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedField ? `Delete "${selectedField.replace('data.', '')}"?` : `Delete "${selectedEvent}"?`}
            </DialogTitle>
            <DialogDescription>
              {selectedField
                ? 'The field is removed from every contact that has it. This can’t be undone.'
                : 'Every recorded instance of this event is deleted. This can’t be undone.'}
            </DialogDescription>
          </DialogHeader>

          {selectedField && fieldUsage && (
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm">
                  <strong>Contacts with this field:</strong> {fieldUsage.contactCount}
                </p>
                <p className="text-sm">
                  <strong>Used in segments:</strong> {fieldUsage.usedInSegments.length}
                </p>
                <p className="text-sm">
                  <strong>Used in campaigns:</strong> {fieldUsage.usedInCampaigns.length}
                </p>
              </div>

              {!fieldUsage.canDelete && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <div className="ml-2">
                    <p className="text-sm font-medium">Cannot delete this field</p>
                    <p className="text-sm">This field is currently used in:</p>
                    {fieldUsage.usedInSegments.length > 0 && (
                      <ul className="mt-2 list-disc list-inside text-sm">
                        {fieldUsage.usedInSegments.map(segment => (
                          <li key={segment.id}>Segment: {segment.name}</li>
                        ))}
                      </ul>
                    )}
                    {fieldUsage.usedInCampaigns.length > 0 && (
                      <ul className="mt-2 list-disc list-inside text-sm">
                        {fieldUsage.usedInCampaigns.map(campaign => (
                          <li key={campaign.id}>Campaign: {campaign.name}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </Alert>
              )}
            </div>
          )}

          {selectedEvent && eventUsage && (
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm">
                  <strong>Total events:</strong> {eventUsage.totalCount}
                </p>
                <p className="text-sm">
                  <strong>Unique contacts:</strong> {eventUsage.uniqueContacts}
                </p>
                <p className="text-sm">
                  <strong>Used in segments:</strong> {eventUsage.usedInSegments.length}
                </p>
                <p className="text-sm">
                  <strong>Used in workflows:</strong> {eventUsage.usedInWorkflows.length}
                </p>
              </div>

              {!eventUsage.canDelete && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <div className="ml-2">
                    <p className="text-sm font-medium">Cannot delete this event</p>
                    <p className="text-sm">This event is currently used in:</p>
                    {eventUsage.usedInSegments.length > 0 && (
                      <ul className="mt-2 list-disc list-inside text-sm">
                        {eventUsage.usedInSegments.map(segment => (
                          <li key={segment.id}>Segment: {segment.name}</li>
                        ))}
                      </ul>
                    )}
                    {eventUsage.usedInWorkflows.length > 0 && (
                      <ul className="mt-2 list-disc list-inside text-sm">
                        {eventUsage.usedInWorkflows.map(workflow => (
                          <li key={workflow.id}>Workflow: {workflow.name}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </Alert>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setSelectedField(null);
                setSelectedEvent(null);
              }}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={selectedField ? handleDeleteField : handleDeleteEvent}
              disabled={
                isDeleting || (!!selectedField && !fieldUsage?.canDelete) || (!!selectedEvent && !eventUsage?.canDelete)
              }
            >
              {isDeleting && <IconSpinner size="sm" className="mr-2" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
