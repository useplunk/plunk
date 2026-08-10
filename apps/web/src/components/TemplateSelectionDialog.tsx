import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  EmptyState,
  IconSpinner,
  Input,
  Label,
} from '@plunk/ui';
import type {Template} from '@plunk/db';
import type {PaginatedResponse} from '@plunk/types';
import {ArrowLeft, FileText, Search} from 'lucide-react';
import {useState} from 'react';
import useSWR from 'swr';

interface TemplateSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectTemplate: (template: Template, selectedFields: SelectedFields) => void;
}

interface SelectedFields {
  subject: boolean;
  body: boolean;
  from: boolean;
  fromName: boolean;
  replyTo: boolean;
}

export function TemplateSelectionDialog({open, onOpenChange, onSelectTemplate}: TemplateSelectionDialogProps) {
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'TRANSACTIONAL' | 'MARKETING' | 'HEADLESS'>('ALL');
  const [step, setStep] = useState<'select' | 'configure'>('select');
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [selectedFields, setSelectedFields] = useState<SelectedFields>({
    subject: true,
    body: true,
    from: true,
    fromName: true,
    replyTo: true,
  });

  const {data, isLoading} = useSWR<PaginatedResponse<Template>>(
    open
      ? `/templates?page=${page}&pageSize=10${search ? `&search=${search}` : ''}${typeFilter !== 'ALL' ? `&type=${typeFilter}` : ''}`
      : null,
    {revalidateOnFocus: false},
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const handleTemplateClick = (template: Template) => {
    setSelectedTemplate(template);
    setStep('configure');
  };

  const handleBack = () => {
    setStep('select');
    setSelectedTemplate(null);
  };

  const handleConfirm = () => {
    if (selectedTemplate) {
      onSelectTemplate(selectedTemplate, selectedFields);
      onOpenChange(false);
      // Reset state
      setSearch('');
      setSearchInput('');
      setPage(1);
      setTypeFilter('ALL');
      setStep('select');
      setSelectedTemplate(null);
      setSelectedFields({
        subject: true,
        body: true,
        from: true,
        fromName: true,
        replyTo: true,
      });
    }
  };

  const toggleField = (field: keyof SelectedFields) => {
    setSelectedFields(prev => ({...prev, [field]: !prev[field]}));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {step === 'configure' && (
              <Button variant="ghost" size="icon" onClick={handleBack}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            {step === 'select' ? 'Select a Template' : 'Choose What to Copy'}
          </DialogTitle>
          <DialogDescription>
            {step === 'select'
              ? 'Choose a template to start your campaign with'
              : 'Select which parts of the template you want to use'}
          </DialogDescription>
        </DialogHeader>

        {step === 'select' ? (
          <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
            {/* Search & Filters */}
            <div className="space-y-3">
              <form onSubmit={handleSearch} className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
                  <Input
                    type="text"
                    placeholder="Search templates…"
                    value={searchInput}
                    onChange={e => setSearchInput(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Button type="submit" size="sm">
                  Search
                </Button>
                {search && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSearch('');
                      setSearchInput('');
                      setPage(1);
                    }}
                  >
                    Clear
                  </Button>
                )}
              </form>

              {/* Type Filter */}
              <div className="flex gap-2">
                <Button
                  type="button"
                  onClick={() => {
                    setTypeFilter('ALL');
                    setPage(1);
                  }}
                  variant={typeFilter === 'ALL' ? 'default' : 'secondary'}
                  size="sm"
                >
                  All templates
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    setTypeFilter('MARKETING');
                    setPage(1);
                  }}
                  variant={typeFilter === 'MARKETING' ? 'default' : 'secondary'}
                  size="sm"
                >
                  Marketing
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    setTypeFilter('TRANSACTIONAL');
                    setPage(1);
                  }}
                  variant={typeFilter === 'TRANSACTIONAL' ? 'default' : 'secondary'}
                  size="sm"
                >
                  Transactional
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    setTypeFilter('HEADLESS');
                    setPage(1);
                  }}
                  variant={typeFilter === 'HEADLESS' ? 'default' : 'secondary'}
                  size="sm"
                >
                  Headless
                </Button>
              </div>
            </div>

            {/* Templates List */}
            <div className="flex-1 overflow-y-auto space-y-3">
              {isLoading && (
                <div className="flex items-center justify-center py-12">
                  <IconSpinner />
                </div>
              )}
              {!isLoading && data?.data.length === 0 && (
                <EmptyState
                  icon={FileText}
                  title="No templates found"
                  description={search ? 'Try adjusting your search terms.' : 'Create a template first to use this feature.'}
                />
              )}

              {data?.data.map(template => (
                <Card
                  key={template.id}
                  className="cursor-pointer hover:border-neutral-400 transition-colors"
                  onClick={() => handleTemplateClick(template)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <CardTitle className="text-base truncate">{template.name}</CardTitle>
                          <Badge className="capitalize" variant="neutral">
                            {template.type.toLowerCase()}
                          </Badge>
                        </div>
                        {template.description && (
                          <CardDescription className="text-xs line-clamp-1">{template.description}</CardDescription>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-2 text-xs">
                      <div>
                        <span className="text-neutral-500">Subject:</span>{' '}
                        <span className="font-medium text-neutral-900">{template.subject}</span>
                      </div>
                      <div>
                        <span className="text-neutral-500">From:</span>{' '}
                        <span className="text-neutral-700">{template.from}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Pagination */}
            {data && data.totalPages > 1 && (
              <div className="flex items-center justify-between pt-3 border-t">
                <p className="text-sm text-neutral-500">
                  Page {page} of {data.totalPages}
                </p>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setPage(p => p - 1)} disabled={page === 1}>
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => p + 1)}
                    disabled={page === data.totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto pr-2">
              {/* Template Preview */}
              {selectedTemplate && (
                <div className="pb-4 mb-1 border-b border-neutral-100">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-neutral-900">{selectedTemplate.name}</span>
                    <Badge className="capitalize" variant="neutral">
                      {selectedTemplate.type.toLowerCase()}
                    </Badge>
                  </div>
                  {selectedTemplate.description && (
                    <p className="text-xs text-neutral-500 mt-1">{selectedTemplate.description}</p>
                  )}
                </div>
              )}

              {/* Field Selection */}
              <div className="divide-y divide-neutral-100">
                <div
                  className="flex items-center gap-3 py-3 cursor-pointer hover:text-neutral-900 transition-colors"
                  onClick={() => toggleField('subject')}
                >
                  <Checkbox
                    id="subject"
                    checked={selectedFields.subject}
                    onCheckedChange={() => toggleField('subject')}
                  />
                  <div className="flex-1">
                    <Label htmlFor="subject" className="text-sm font-medium cursor-pointer">
                      Email subject
                    </Label>
                    {selectedTemplate?.subject && (
                      <p className="text-xs text-neutral-400 mt-0.5 truncate">{selectedTemplate.subject}</p>
                    )}
                  </div>
                </div>

                <div
                  className="flex items-center gap-3 py-3 cursor-pointer hover:text-neutral-900 transition-colors"
                  onClick={() => toggleField('body')}
                >
                  <Checkbox id="body" checked={selectedFields.body} onCheckedChange={() => toggleField('body')} />
                  <div className="flex-1">
                    <Label htmlFor="body" className="text-sm font-medium cursor-pointer">
                      Email body
                    </Label>
                    <p className="text-xs text-neutral-400 mt-0.5">Full email content and design</p>
                  </div>
                </div>

                <div
                  className="flex items-center gap-3 py-3 cursor-pointer hover:text-neutral-900 transition-colors"
                  onClick={() => toggleField('from')}
                >
                  <Checkbox id="from" checked={selectedFields.from} onCheckedChange={() => toggleField('from')} />
                  <div className="flex-1">
                    <Label htmlFor="from" className="text-sm font-medium cursor-pointer">
                      From email
                    </Label>
                    {selectedTemplate?.from && (
                      <p className="text-xs text-neutral-400 mt-0.5">{selectedTemplate.from}</p>
                    )}
                  </div>
                </div>

                <div
                  className="flex items-center gap-3 py-3 cursor-pointer hover:text-neutral-900 transition-colors"
                  onClick={() => toggleField('fromName')}
                >
                  <Checkbox
                    id="fromName"
                    checked={selectedFields.fromName}
                    onCheckedChange={() => toggleField('fromName')}
                  />
                  <div className="flex-1">
                    <Label htmlFor="fromName" className="text-sm font-medium cursor-pointer">
                      From name
                    </Label>
                    {selectedTemplate?.fromName && (
                      <p className="text-xs text-neutral-400 mt-0.5">{selectedTemplate.fromName}</p>
                    )}
                  </div>
                </div>

                <div
                  className="flex items-center gap-3 py-3 cursor-pointer hover:text-neutral-900 transition-colors"
                  onClick={() => toggleField('replyTo')}
                >
                  <Checkbox
                    id="replyTo"
                    checked={selectedFields.replyTo}
                    onCheckedChange={() => toggleField('replyTo')}
                  />
                  <div className="flex-1">
                    <Label htmlFor="replyTo" className="text-sm font-medium cursor-pointer">
                      Reply-To email
                    </Label>
                    {selectedTemplate?.replyTo && (
                      <p className="text-xs text-neutral-400 mt-0.5">{selectedTemplate.replyTo}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Fixed Action Buttons */}
            <div className="flex gap-3 pt-4 border-t mt-4">
              <Button variant="outline" onClick={handleBack} className="flex-1">
                Back
              </Button>
              <Button onClick={handleConfirm} className="flex-1" disabled={!Object.values(selectedFields).some(v => v)}>
                Create campaign
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
