import {avatarGradient} from '../lib/avatar';
import {useActiveProject} from '../lib/contexts/ActiveProjectProvider';
import {useLogout} from '../lib/hooks/useLogout';
import {useUser} from '../lib/hooks/useUser';
import {WIKI_URI} from '../lib/constants';
import {OnboardingBanner} from './onboarding/OnboardingBanner';
import {
  Activity,
  BarChart3,
  BookOpen,
  ChevronDown,
  FileText,
  Layers,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu,
  Plus,
  Settings,
  UserCog,
  Users,
  Workflow
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import {useRouter} from 'next/router';
import {useMemo, useState} from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@plunk/ui';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{className?: string}>;
}

interface NavSection {
  title?: string;
  items: NavItem[];
}

const navigation: NavSection[] = [
  {
    items: [
      {name: 'Dashboard', href: '/', icon: LayoutDashboard},
      {name: 'Contacts', href: '/contacts', icon: Users},
      {name: 'Segments', href: '/segments', icon: Layers},
      {name: 'Activity', href: '/activity', icon: Activity},
      {name: 'Analytics', href: '/analytics', icon: BarChart3},
    ],
  },
  {
    title: 'Automations',
    items: [
      {name: 'Templates', href: '/templates', icon: FileText},
      {name: 'Workflows', href: '/workflows', icon: Workflow},
    ],
  },
  {
    items: [{name: 'Campaigns', href: '/campaigns', icon: Megaphone}],
  },
];

export function DashboardLayout({children}: DashboardLayoutProps) {
  const router = useRouter();
  const {data: user} = useUser();
  const handleLogout = useLogout();
  const {activeProject, availableProjects, setActiveProject} = useActiveProject();
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  // Sort projects alphabetically by name
  const sortedProjects = useMemo(() => {
    return [...availableProjects].sort((a, b) => a.name.localeCompare(b.name));
  }, [availableProjects]);

  // Sidebar content (reusable for both desktop and mobile)
  const getSidebarContent = () => (
    <>
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-6 border-b border-neutral-200">
        <div className="flex items-center gap-2">
          <Image src="/assets/logo.png" alt="Plunk" width={28} height={28} className="rounded" />
          <h1 className="text-xl font-bold text-neutral-900">Plunk</h1>
        </div>
        <button
          onClick={() => document.dispatchEvent(new KeyboardEvent('keydown', {key: 'k', metaKey: true, bubbles: true}))}
          className="hidden lg:flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium text-neutral-400 bg-neutral-100 border border-neutral-200 rounded hover:bg-neutral-200 hover:text-neutral-600 transition-colors cursor-pointer"
        >
          <span>⌘</span>
          <span>K</span>
        </button>
      </div>

      {/* Project Switcher */}
      <div className="p-4 border-b border-neutral-200">
        <DropdownMenu>
          <DropdownMenuTrigger className="group w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg hover:bg-neutral-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className="h-8 w-8 rounded-lg bg-neutral-100 text-neutral-700 flex items-center justify-center text-xs font-medium flex-shrink-0">
                {activeProject?.name.charAt(0).toUpperCase() || 'P'}
              </div>
              <span className="font-medium text-neutral-900 truncate">{activeProject?.name || 'Select project'}</span>
            </div>
            <ChevronDown className="h-4 w-4 text-neutral-500 flex-shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="min-w-[var(--radix-dropdown-menu-trigger-width)] max-h-[400px] overflow-y-auto"
          >
            {sortedProjects.map(project => (
              <DropdownMenuItem
                key={project.id}
                onSelect={() => setActiveProject(project)}
                className="gap-2 px-3 py-2 cursor-pointer"
              >
                <div className="h-6 w-6 rounded-md bg-neutral-100 text-neutral-700 flex items-center justify-center text-xs font-medium flex-shrink-0">
                  {project.name.charAt(0).toUpperCase()}
                </div>
                <span className="text-neutral-900 text-left flex-1 truncate">{project.name}</span>
                {activeProject?.id === project.id && (
                  <div className="ml-auto h-1.5 w-1.5 rounded-full bg-neutral-900 flex-shrink-0" />
                )}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild className="gap-2 px-3 py-2 cursor-pointer text-neutral-700">
              <Link href="/projects/create" onClick={() => setShowMobileMenu(false)}>
                <Plus className="h-4 w-4" />
                <span>Create project</span>
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        {navigation.map((section, sectionIndex) => (
          <div key={sectionIndex} className={sectionIndex > 0 ? 'mt-6' : ''}>
            {section.title && (
              <p className="px-3 mb-2 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                {section.title}
              </p>
            )}
            <div className="space-y-1">
              {section.items.map(item => {
                const isActive =
                  item.href === '/' ? router.pathname === item.href : router.pathname.startsWith(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setShowMobileMenu(false)}
                    className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                      isActive
                        ? 'bg-neutral-100 text-neutral-900'
                        : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Settings & User Menu */}
      <div className="border-t border-neutral-200 p-3 space-y-1">
        <a
          href={WIKI_URI}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <BookOpen className="h-5 w-5" />
          Documentation
        </a>

        <Link
          href="/settings"
          onClick={() => setShowMobileMenu(false)}
          className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
            router.pathname.startsWith('/settings')
              ? 'bg-neutral-100 text-neutral-900'
              : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
          }`}
        >
          <Settings className="h-5 w-5" />
          Settings
        </Link>

        <DropdownMenu>
          <DropdownMenuTrigger className="group w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
            <div
              className="h-5 w-5 rounded-full text-white flex items-center justify-center text-[10px] font-semibold flex-shrink-0"
              style={{background: avatarGradient(user?.email ?? '')}}
            >
              {user?.email?.charAt(0).toUpperCase() ?? '?'}
            </div>
            <span className="flex-1 text-left truncate">Account</span>
            <ChevronDown className="h-4 w-4 text-neutral-500 transition-transform duration-200 group-data-[state=open]:rotate-180" />
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-[var(--radix-dropdown-menu-trigger-width)]">
            <DropdownMenuLabel className="px-3 py-2 font-normal text-xs text-neutral-500 truncate">
              {user?.email}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild className="gap-2 px-3 py-2 cursor-pointer text-neutral-700">
              <Link href="/account" onClick={() => setShowMobileMenu(false)}>
                <UserCog className="h-4 w-4" />
                <span>Account settings</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() => void handleLogout()}
              className="gap-2 px-3 py-2 cursor-pointer text-red-600 focus:text-red-600"
            >
              <LogOut className="h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  );

  return (
    <div className="flex h-screen bg-neutral-50">
      {/* Desktop Sidebar - Hidden on mobile */}
      <div className="hidden lg:flex w-64 bg-white border-r border-neutral-200 flex-col">
        {getSidebarContent()}
      </div>

      {/* Mobile Sidebar Overlay */}
      {showMobileMenu && (
        <div className="fixed inset-0 z-40 lg:hidden" onClick={() => setShowMobileMenu(false)}>
          <div className="absolute inset-0 bg-black/50" />
        </div>
      )}

      {/* Mobile Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white transform transition-transform duration-300 ease-in-out lg:hidden ${
          showMobileMenu ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">{getSidebarContent()}</div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Header - Only visible on mobile */}
        <div className="lg:hidden h-16 bg-white border-b border-neutral-200 flex items-center px-4">
          <button
            onClick={() => setShowMobileMenu(true)}
            className="p-2 rounded-lg hover:bg-neutral-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            aria-label="Open menu"
          >
            <Menu className="h-6 w-6 text-neutral-900" />
          </button>
          <div className="flex items-center gap-2 ml-4">
            <Image src="/assets/logo.png" alt="Plunk" width={24} height={24} className="rounded" />
            <h1 className="text-lg font-bold text-neutral-900">Plunk</h1>
          </div>
        </div>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
            <OnboardingBanner />
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
