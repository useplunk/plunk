import {useActiveProject} from '../lib/contexts/ActiveProjectProvider';
import {useUser} from '../lib/hooks/useUser';
import {WIKI_URI} from '../lib/constants';
import {network} from '../lib/network';
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
  Users,
  Workflow
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import {useRouter} from 'next/router';
import {useCallback, useEffect, useMemo, useRef, useState} from 'react';

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

// Deterministically derives a soft two-tone gradient from a string (e.g. an email),
// so every account gets a stable, distinct avatar without storing any image.
function avatarGradient(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  const hue = Math.abs(hash) % 360;
  const hue2 = (hue + 45) % 360;
  return `linear-gradient(135deg, hsl(${hue} 70% 55%), hsl(${hue2} 75% 45%))`;
}

export function DashboardLayout({children}: DashboardLayoutProps) {
  const router = useRouter();
  const {data: user, mutate: mutateUser} = useUser();
  const {activeProject, availableProjects, setActiveProject} = useActiveProject();
  const [showProjectMenu, setShowProjectMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const desktopProjectMenuRef = useRef<HTMLDivElement>(null);
  const desktopUserMenuRef = useRef<HTMLDivElement>(null);
  const mobileProjectMenuRef = useRef<HTMLDivElement>(null);
  const mobileUserMenuRef = useRef<HTMLDivElement>(null);

  // Sort projects alphabetically by name
  const sortedProjects = useMemo(() => {
    return [...availableProjects].sort((a, b) => a.name.localeCompare(b.name));
  }, [availableProjects]);

  // Handle click outside for project menu
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const isClickOutsideProjectMenu =
        desktopProjectMenuRef.current &&
        !desktopProjectMenuRef.current.contains(event.target as Node) &&
        mobileProjectMenuRef.current &&
        !mobileProjectMenuRef.current.contains(event.target as Node);

      const isClickOutsideUserMenu =
        desktopUserMenuRef.current &&
        !desktopUserMenuRef.current.contains(event.target as Node) &&
        mobileUserMenuRef.current &&
        !mobileUserMenuRef.current.contains(event.target as Node);

      if (isClickOutsideProjectMenu) {
        setShowProjectMenu(false);
      }
      if (isClickOutsideUserMenu) {
        setShowUserMenu(false);
      }
    }

    if (showProjectMenu || showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showProjectMenu, showUserMenu]);

  const handleLogout = useCallback(async () => {
    try {
      // Call the logout endpoint to clear the cookie
      await network.fetch('GET', '/auth/logout');

      // Clear local storage
      localStorage.removeItem('token');
      localStorage.removeItem('activeProjectId');

      // Clear SWR cache for user data
      await mutateUser(null, false);

      // Close the menu
      setShowUserMenu(false);

      // Redirect to login
      await router.push('/auth/login');
    } catch {
      // Even if the API call fails, try to redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('activeProjectId');
      await mutateUser(null, false);
      await router.push('/auth/login');
    }
  }, [mutateUser, router]);

  const handleToggleProjectMenu = useCallback(() => {
    setShowProjectMenu(prev => !prev);
  }, []);

  const handleToggleUserMenu = useCallback(() => {
    setShowUserMenu(prev => !prev);
  }, []);

  const handleLogoutClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      void handleLogout();
    },
    [handleLogout],
  );

  // Sidebar content (reusable for both desktop and mobile)
  const getSidebarContent = (
    projectMenuRef: React.RefObject<HTMLDivElement | null>,
    userMenuRef: React.RefObject<HTMLDivElement | null>,
  ) => (
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
        <div className="relative" ref={projectMenuRef}>
          <button
            onClick={handleToggleProjectMenu}
            className="w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg hover:bg-neutral-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className="h-8 w-8 rounded-lg bg-neutral-100 text-neutral-700 flex items-center justify-center text-xs font-medium flex-shrink-0">
                {activeProject?.name.charAt(0).toUpperCase() || 'P'}
              </div>
              <span className="font-medium text-neutral-900 truncate">{activeProject?.name || 'Select project'}</span>
            </div>
            <ChevronDown
              className={`h-4 w-4 text-neutral-500 flex-shrink-0 transition-transform duration-200 ${showProjectMenu ? 'rotate-180' : ''}`}
            />
          </button>

          {/* Project Dropdown */}
          {showProjectMenu && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-neutral-200 rounded-lg shadow-md z-50 py-1 max-h-[400px] overflow-y-auto min-w-full w-max">
              {sortedProjects.map(project => (
                <button
                  key={project.id}
                  onClick={e => {
                    e.preventDefault();
                    e.stopPropagation();
                    setActiveProject(project);
                    setShowProjectMenu(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-neutral-50 transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <div className="h-6 w-6 rounded-md bg-neutral-100 text-neutral-700 flex items-center justify-center text-xs font-medium flex-shrink-0">
                    {project.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-neutral-900 text-left flex-1">{project.name}</span>
                  {activeProject?.id === project.id && (
                    <div className="ml-auto h-1.5 w-1.5 rounded-full bg-neutral-900 flex-shrink-0" />
                  )}
                </button>
              ))}
              <div className="border-t border-neutral-200 my-1" />
              <Link
                href="/projects/create"
                onClick={() => setShowProjectMenu(false)}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-neutral-50 transition-colors text-neutral-700 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <Plus className="h-4 w-4" />
                <span>Create project</span>
              </Link>
            </div>
          )}
        </div>
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

        <div className="relative" ref={userMenuRef}>
          <button
            onClick={handleToggleUserMenu}
            className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <div
              className="h-5 w-5 rounded-full text-white flex items-center justify-center text-[10px] font-semibold flex-shrink-0"
              style={{background: avatarGradient(user?.email ?? '')}}
            >
              {user?.email?.charAt(0).toUpperCase() ?? '?'}
            </div>
            <span className="flex-1 text-left truncate">Account</span>
            <ChevronDown
              className={`h-4 w-4 text-neutral-500 transition-transform duration-200 ${showUserMenu ? 'rotate-180' : ''}`}
            />
          </button>

          {/* User Dropdown */}
          {showUserMenu && (
            <div className="absolute bottom-full left-0 right-0 mb-1 bg-white border border-neutral-200 rounded-lg shadow-md z-50 py-1">
              <div className="px-3 py-2 border-b border-neutral-100">
                <p className="text-xs text-neutral-500 truncate">{user?.email}</p>
              </div>
              <button
                onClick={handleLogoutClick}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-neutral-50 transition-colors text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <LogOut className="h-4 w-4" />
                <span>Log out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );

  return (
    <div className="flex h-screen bg-neutral-50">
      {/* Desktop Sidebar - Hidden on mobile */}
      <div className="hidden lg:flex w-64 bg-white border-r border-neutral-200 flex-col">
        {getSidebarContent(desktopProjectMenuRef, desktopUserMenuRef)}
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
        <div className="flex flex-col h-full">{getSidebarContent(mobileProjectMenuRef, mobileUserMenuRef)}</div>
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
