import type {Campaign, Contact, Segment, Template, Workflow} from '@plunk/db';
import type {CursorPaginatedResponse, PaginatedResponse} from '@plunk/types';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  Kbd,
} from '@plunk/ui';
import {
  Activity,
  BarChart3,
  BookOpen,
  Check,
  Clock,
  Copy,
  FileText,
  FolderOpen,
  Layers,
  LayoutDashboard,
  Megaphone,
  Plus,
  Settings,
  Users,
  Workflow as WorkflowIcon,
} from 'lucide-react';
import {useRouter} from 'next/router';
import {useEffect, useMemo, useRef, useState} from 'react';
import {toast} from 'sonner';
import useSWR from 'swr';
import {useActiveProject} from '../lib/contexts/ActiveProjectProvider';
import {WIKI_URI} from '../lib/constants';
import {addRecentPage, getRecentPages} from '../lib/recentPages';

interface Action {
  label: string;
  href: string;
  icon: React.ComponentType<{className?: string}>;
  keywords: string;
  shortcut: [string, string];
}

const NAV_ACTIONS: Action[] = [
  {label: 'Dashboard', href: '/', icon: LayoutDashboard, keywords: 'home overview', shortcut: ['G', 'D']},
  {label: 'Contacts', href: '/contacts', icon: Users, keywords: 'subscribers people', shortcut: ['G', 'C']},
  {label: 'Segments', href: '/segments', icon: Layers, keywords: 'groups filters', shortcut: ['G', 'S']},
  {label: 'Activity', href: '/activity', icon: Activity, keywords: 'log events', shortcut: ['G', 'L']},
  {label: 'Analytics', href: '/analytics', icon: BarChart3, keywords: 'stats metrics', shortcut: ['G', 'A']},
  {label: 'Templates', href: '/templates', icon: FileText, keywords: 'email design', shortcut: ['G', 'T']},
  {label: 'Workflows', href: '/workflows', icon: WorkflowIcon, keywords: 'automation trigger', shortcut: ['G', 'W']},
  {label: 'Campaigns', href: '/campaigns', icon: Megaphone, keywords: 'broadcast newsletter', shortcut: ['G', 'M']},
  {label: 'Settings', href: '/settings', icon: Settings, keywords: 'config account billing', shortcut: ['G', ',']},
];

const CREATE_ACTIONS: Action[] = [
  {label: 'New campaign', href: '/campaigns/create', icon: Plus, keywords: 'create broadcast', shortcut: ['N', 'C']},
  {label: 'New template', href: '/templates/create', icon: Plus, keywords: 'create email design', shortcut: ['N', 'T']},
  {label: 'New segment', href: '/segments/new', icon: Plus, keywords: 'create group filter', shortcut: ['N', 'S']},
  {label: 'New workflow', href: '/workflows', icon: Plus, keywords: 'create automation trigger', shortcut: ['N', 'W']},
];

// Chord map: first-key → second-key → action
const CHORDS: Record<string, Record<string, Action>> = {};
for (const action of [...NAV_ACTIONS, ...CREATE_ACTIONS]) {
  const [first, second] = action.shortcut;
  const f = first.toLowerCase();
  const s = second.toLowerCase();
  CHORDS[f] ??= {};
  CHORDS[f][s] = action;
}

function matches(text: string, query: string): boolean {
  return text.toLowerCase().includes(query.toLowerCase());
}

function ShortcutHint({shortcut}: {shortcut: [string, string]}) {
  return (
    <span className="ml-auto flex items-center gap-0.5 shrink-0">
      <Kbd>{shortcut[0]}</Kbd>
      <Kbd>{shortcut[1]}</Kbd>
    </span>
  );
}

export function CommandPalette() {
  const router = useRouter();
  const {activeProject, availableProjects, setActiveProject} = useActiveProject();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const chordKeyRef = useRef<string | null>(null);
  const chordTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const openRef = useRef(open);
  openRef.current = open;

  const recentPages = useMemo(() => (open ? getRecentPages() : []), [open]);

  const fireChord = (key: string): boolean => {
    if (chordKeyRef.current) {
      const action = CHORDS[chordKeyRef.current]?.[key];
      chordKeyRef.current = null;
      if (chordTimerRef.current) clearTimeout(chordTimerRef.current);
      if (action) {
        void router.push(action.href);
        addRecentPage({label: action.label, href: action.href});
        setOpen(false);
        return true;
      }
    } else if (CHORDS[key]) {
      chordKeyRef.current = key;
      chordTimerRef.current = setTimeout(() => {
        chordKeyRef.current = null;
      }, 1500);
      return true;
    }
    return false;
  };

  // ⌘K — global toggle
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(prev => !prev);
        return;
      }
      // Chord shortcuts when focus is not in any input (e.g. user tabbed away or clicked body)
      if (openRef.current || e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;
      if (fireChord(e.key.toLowerCase())) e.preventDefault();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  useEffect(() => {
    if (!open) {
      const timer = setTimeout(() => {
        setQuery('');
        setDebouncedQuery('');
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [open]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 200);
    return () => clearTimeout(timer);
  }, [query]);

  const shouldSearch = open && debouncedQuery.length > 0;

  const {data: contactsData} = useSWR<CursorPaginatedResponse<Contact>>(
    shouldSearch ? `/contacts?search=${encodeURIComponent(debouncedQuery)}&limit=5` : null,
    {revalidateOnFocus: false},
  );
  const {data: templatesData} = useSWR<PaginatedResponse<Template>>(
    shouldSearch ? `/templates?search=${encodeURIComponent(debouncedQuery)}&pageSize=5` : null,
    {revalidateOnFocus: false},
  );
  const {data: workflowsData} = useSWR<PaginatedResponse<Workflow>>(
    shouldSearch ? `/workflows?search=${encodeURIComponent(debouncedQuery)}&pageSize=5` : null,
    {revalidateOnFocus: false},
  );
  const {data: segmentsData} = useSWR<Segment[]>(shouldSearch ? '/segments' : null, {
    revalidateOnFocus: false,
  });
  const {data: campaignsData} = useSWR<PaginatedResponse<Campaign>>(shouldSearch ? '/campaigns?pageSize=20' : null, {
    revalidateOnFocus: false,
  });

  const contacts = contactsData?.data ?? [];
  const templates = templatesData?.data ?? [];
  const workflows = workflowsData?.data ?? [];
  const segments = (segmentsData ?? []).filter(s => matches(s.name, debouncedQuery));
  const campaigns = (campaignsData?.data ?? []).filter(
    c => matches(c.name, debouncedQuery) || matches(c.subject ?? '', debouncedQuery),
  );

  const filteredNavActions = shouldSearch
    ? NAV_ACTIONS.filter(a => matches(a.label, query) || matches(a.keywords, query))
    : NAV_ACTIONS;

  const filteredCreateActions = shouldSearch
    ? CREATE_ACTIONS.filter(a => matches(a.label, query) || matches(a.keywords, query))
    : CREATE_ACTIONS;

  const filteredProjects = availableProjects.filter(p => matches(p.name, debouncedQuery || query));

  const switchProject = (project: (typeof availableProjects)[number]) => {
    setActiveProject(project);
    setOpen(false);
  };

  const navigate = (href: string, label: string) => {
    void router.push(href);
    addRecentPage({label, href});
    setOpen(false);
  };

  const copySecretKey = () => {
    if (!activeProject?.secret) return;
    void navigator.clipboard.writeText(activeProject.secret);
    toast.success('Secret key copied');
    setOpen(false);
  };

  const copyPublicKey = () => {
    if (!activeProject?.public) return;
    void navigator.clipboard.writeText(activeProject.public);
    toast.success('Public key copied');
    setOpen(false);
  };

  const hasResults = shouldSearch
    ? contacts.length > 0 ||
      campaigns.length > 0 ||
      templates.length > 0 ||
      workflows.length > 0 ||
      segments.length > 0 ||
      filteredNavActions.length > 0 ||
      filteredCreateActions.length > 0 ||
      filteredProjects.length > 0
    : true;

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search or jump to…" value={query} onValueChange={setQuery} />
      <CommandList className="pb-2">
        {!hasResults && <CommandEmpty>No results for &ldquo;{query}&rdquo;</CommandEmpty>}

        {!shouldSearch && recentPages.length > 0 && (
          <CommandGroup heading="Recent">
            {recentPages.map(page => (
              <CommandItem
                key={page.href}
                value={`recent-${page.href}`}
                onSelect={() => navigate(page.href, page.label)}
              >
                <Clock className="mr-3 h-4 w-4 text-neutral-400 shrink-0" />
                <span>{page.label}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {shouldSearch && contacts.length > 0 && (
          <>
            <CommandGroup heading="Contacts">
              {contacts.map(contact => (
                <CommandItem
                  key={contact.id}
                  value={`contact-${contact.id}-${contact.email}`}
                  onSelect={() => navigate(`/contacts/${contact.id}`, contact.email)}
                >
                  <Users className="mr-3 h-4 w-4 text-neutral-400 shrink-0" />
                  <span>{contact.email}</span>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        {shouldSearch && campaigns.length > 0 && (
          <>
            <CommandGroup heading="Campaigns">
              {campaigns.map(campaign => (
                <CommandItem
                  key={campaign.id}
                  value={`campaign-${campaign.id}-${campaign.name}`}
                  onSelect={() => navigate(`/campaigns/${campaign.id}`, campaign.name)}
                >
                  <Megaphone className="mr-3 h-4 w-4 text-neutral-400 shrink-0" />
                  <span>{campaign.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        {shouldSearch && templates.length > 0 && (
          <>
            <CommandGroup heading="Templates">
              {templates.map(template => (
                <CommandItem
                  key={template.id}
                  value={`template-${template.id}-${template.name}`}
                  onSelect={() => navigate(`/templates/${template.id}`, template.name)}
                >
                  <FileText className="mr-3 h-4 w-4 text-neutral-400 shrink-0" />
                  <span>{template.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        {shouldSearch && workflows.length > 0 && (
          <>
            <CommandGroup heading="Workflows">
              {workflows.map(workflow => (
                <CommandItem
                  key={workflow.id}
                  value={`workflow-${workflow.id}-${workflow.name}`}
                  onSelect={() => navigate(`/workflows/${workflow.id}`, workflow.name)}
                >
                  <WorkflowIcon className="mr-3 h-4 w-4 text-neutral-400 shrink-0" />
                  <span>{workflow.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        {shouldSearch && segments.length > 0 && (
          <>
            <CommandGroup heading="Segments">
              {segments.map(segment => (
                <CommandItem
                  key={segment.id}
                  value={`segment-${segment.id}-${segment.name}`}
                  onSelect={() => navigate(`/segments/${segment.id}`, segment.name)}
                >
                  <Layers className="mr-3 h-4 w-4 text-neutral-400 shrink-0" />
                  <span>{segment.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        {availableProjects.length > 1 && filteredProjects.length > 0 && (
          <>
            <CommandGroup heading="Switch project">
              {filteredProjects.map(project => (
                <CommandItem
                  key={project.id}
                  value={`project-${project.id}-${project.name}`}
                  onSelect={() => switchProject(project)}
                >
                  <FolderOpen className="mr-3 h-4 w-4 text-neutral-400 shrink-0" />
                  <span>{project.name}</span>
                  {project.id === activeProject?.id && (
                    <Check className="ml-auto h-4 w-4 text-neutral-400 shrink-0" />
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        {filteredNavActions.length > 0 && (
          <CommandGroup heading="Go to">
            {filteredNavActions.map(action => {
              const Icon = action.icon;
              return (
                <CommandItem
                  key={action.href}
                  value={`nav-${action.href}-${action.label}-${action.keywords}`}
                  onSelect={() => navigate(action.href, action.label)}
                >
                  <Icon className="mr-3 h-4 w-4 text-neutral-400 shrink-0" />
                  <span>{action.label}</span>
                  <ShortcutHint shortcut={action.shortcut} />
                </CommandItem>
              );
            })}
          </CommandGroup>
        )}

        {filteredCreateActions.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Create">
              {filteredCreateActions.map(action => {
                const Icon = action.icon;
                return (
                  <CommandItem
                    key={action.href + action.label}
                    value={`create-${action.label}-${action.keywords}`}
                    onSelect={() => navigate(action.href, action.label)}
                  >
                    <Icon className="mr-3 h-4 w-4 text-neutral-400 shrink-0" />
                    <span>{action.label}</span>
                    <ShortcutHint shortcut={action.shortcut} />
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </>
        )}

        {(!shouldSearch || matches('api key copy code developer', query)) && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Developer">
              {activeProject?.secret && (!shouldSearch || matches('copy secret key private developer', query)) && (
                <CommandItem value="copy-secret-key-private-developer" onSelect={copySecretKey}>
                  <Copy className="mr-3 h-4 w-4 text-neutral-400 shrink-0" />
                  <span>Copy secret key</span>
                  <span className="ml-auto font-mono text-xs text-neutral-400 truncate max-w-[120px]">
                    {activeProject.secret.slice(0, 8)}…
                  </span>
                </CommandItem>
              )}
              {activeProject?.public &&
                (!shouldSearch || matches('copy public key frontend client developer', query)) && (
                  <CommandItem value="copy-public-key-frontend-client-developer" onSelect={copyPublicKey}>
                    <Copy className="mr-3 h-4 w-4 text-neutral-400 shrink-0" />
                    <span>Copy public key</span>
                    <span className="ml-auto font-mono text-xs text-neutral-400 truncate max-w-[120px]">
                      {activeProject.public.slice(0, 8)}…
                    </span>
                  </CommandItem>
                )}
              {(!shouldSearch || matches('documentation docs wiki help', query)) && (
                <CommandItem
                  value="open-documentation-docs-wiki-help"
                  onSelect={() => {
                    window.open(WIKI_URI, '_blank');
                    setOpen(false);
                  }}
                >
                  <BookOpen className="mr-3 h-4 w-4 text-neutral-400 shrink-0" />
                  <span>Documentation</span>
                </CommandItem>
              )}
            </CommandGroup>
          </>
        )}
      </CommandList>

      <div className="flex items-center justify-between border-t border-neutral-100 px-4 py-2.5">
        <span className="text-xs text-neutral-400">
          <Kbd>G</Kbd> go to · <Kbd>N</Kbd> new
        </span>
        <span className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-xs text-neutral-400">
            <Kbd>↑↓</Kbd> navigate
          </span>
          <span className="flex items-center gap-1 text-xs text-neutral-400">
            <Kbd>↵</Kbd> open
          </span>
          <span className="flex items-center gap-1 text-xs text-neutral-400">
            <Kbd>esc</Kbd> close
          </span>
        </span>
      </div>
    </CommandDialog>
  );
}
