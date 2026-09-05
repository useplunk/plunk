import {useState} from 'react';
import {useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import type {AuthMethod, Role} from '@plunk/db';
import {UserSchemas} from '@plunk/shared';
import type {AccountUser, ProjectWithRole} from '@plunk/types';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ConfirmDialog,
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  LoadingState,
} from '@plunk/ui';
import {AlertTriangle} from 'lucide-react';
import {NextSeo} from 'next-seo';
import {toast} from 'sonner';
import {z} from 'zod';

import {DashboardLayout} from '../../components/DashboardLayout';
import {avatarGradient} from '../../lib/avatar';
import {useProjects} from '../../lib/hooks/useProject';
import {useUser} from '../../lib/hooks/useUser';
import {network} from '../../lib/network';

const SIGN_IN_METHODS: Record<AuthMethod, string> = {
  PASSWORD: 'Email and password',
  GITHUB_OAUTH: 'GitHub',
  GOOGLE_OAUTH: 'Google',
};

const ROLE_LABELS: Record<Role, string> = {
  OWNER: 'Owner',
  ADMIN: 'Admin',
  MEMBER: 'Member',
};

/**
 * The confirmation field is a client-side guard only, so it lives here rather than in the
 * shared schema the API parses.
 */
const changePasswordForm = UserSchemas.changePassword
  .extend({confirmPassword: z.string()})
  .refine(values => values.newPassword === values.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })
  .refine(values => values.newPassword !== values.currentPassword, {
    message: 'Choose a password different from your current one',
    path: ['newPassword'],
  });

type ChangePasswordForm = z.infer<typeof changePasswordForm>;

/**
 * What is standing between this user and account deletion, phrased for the danger zone.
 * The projects list above already names each project and role, so this only has to
 * summarise rather than repeat it.
 */
function blockingSummary(projects: ProjectWithRole[]): string {
  const owned = projects.filter(project => project.role === 'OWNER').length;
  const joined = projects.length - owned;

  const parts: string[] = [];
  if (owned > 0) {
    parts.push(`delete the ${owned === 1 ? 'project you own' : `${owned} projects you own`}`);
  }
  if (joined > 0) {
    parts.push(
      joined === 1
        ? 'ask an owner to remove you from the other one'
        : `ask an owner to remove you from the other ${joined}`,
    );
  }

  return `To delete your account, ${parts.join(', then ')}.`;
}

function IdentityHeader({user}: {user: AccountUser}) {
  const joined = new Date(user.createdAt).toLocaleDateString(undefined, {month: 'long', year: 'numeric'});

  return (
    <div className="flex items-center gap-4">
      <div
        className="h-11 w-11 shrink-0 rounded-full text-white flex items-center justify-center text-base font-semibold"
        style={{background: avatarGradient(user.email)}}
        aria-hidden="true"
      >
        {user.email.charAt(0).toUpperCase()}
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <h2 className="truncate text-base font-semibold text-neutral-900">{user.email}</h2>
          {!user.emailVerified && <Badge variant="warning">Unverified</Badge>}
        </div>
        <p className="mt-0.5 text-sm text-neutral-500">
          {SIGN_IN_METHODS[user.type]} <span className="text-neutral-300">·</span> Joined {joined}
        </p>
      </div>
    </div>
  );
}

function ChangePasswordCard() {
  const form = useForm<ChangePasswordForm>({
    resolver: zodResolver(changePasswordForm),
    defaultValues: {currentPassword: '', newPassword: '', confirmPassword: ''},
  });

  const onSubmit = async (values: ChangePasswordForm) => {
    try {
      await network.fetch<{success: boolean}, typeof UserSchemas.changePassword>('POST', '/users/@me/password', {
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      form.reset();
      toast.success('Password changed');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Couldn’t change your password. Try again.');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Password</CardTitle>
        <CardDescription>You stay signed in on this and your other devices.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="max-w-sm space-y-4">
            <FormField
              control={form.control}
              name="currentPassword"
              render={({field}) => (
                <FormItem>
                  <FormLabel>Current password</FormLabel>
                  <FormControl>
                    <Input type="password" autoComplete="current-password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="newPassword"
              render={({field}) => (
                <FormItem>
                  <FormLabel>New password</FormLabel>
                  <FormControl>
                    <Input type="password" autoComplete="new-password" {...field} />
                  </FormControl>
                  <FormDescription>At least 6 characters.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({field}) => (
                <FormItem>
                  <FormLabel>Confirm new password</FormLabel>
                  <FormControl>
                    <Input type="password" autoComplete="new-password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Saving…' : 'Change password'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

export default function Account() {
  const {data: user, mutate: mutateUser} = useUser();
  const {data: projects} = useProjects();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteAccount = async () => {
    setIsDeleting(true);

    try {
      await network.fetch('DELETE', '/users/@me');
      localStorage.removeItem('token');
      localStorage.removeItem('activeProjectId');
      await mutateUser(null, false);
      // A hard navigation, so no SWR state survives into the login page.
      window.location.href = '/auth/login';
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Couldn’t delete your account. Try again.');
      setShowDeleteDialog(false);
      setIsDeleting(false);
    }
  };

  if (!user || !projects) {
    return (
      <DashboardLayout>
        <LoadingState message="Loading your account…" />
      </DashboardLayout>
    );
  }

  const canDelete = projects.length === 0;
  const sortedProjects = [...projects].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <>
      <NextSeo title="Account" />
      <DashboardLayout>
        <div className="space-y-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-neutral-900">Account</h1>
            <p className="text-neutral-500 mt-2">Your personal account, separate from any project</p>
          </div>

          <div className="max-w-2xl space-y-6">
            <IdentityHeader user={user} />

            {/* Projects. Also the reference for the danger zone below, which is why it
                carries the role: it is the list you work through to unblock deletion. */}
            <Card>
              <CardHeader>
                <CardTitle>Projects</CardTitle>
                <CardDescription>
                  {projects.length === 0
                    ? 'You are not a member of any project.'
                    : `You are a member of ${projects.length === 1 ? '1 project' : `${projects.length} projects`}.`}
                </CardDescription>
              </CardHeader>
              {projects.length > 0 && (
                <CardContent className="p-0">
                  <ul className="divide-y divide-neutral-100 border-t border-neutral-100">
                    {sortedProjects.map(project => (
                      <li key={project.id} className="flex items-center gap-3 px-6 py-3">
                        <div className="h-6 w-6 shrink-0 rounded-md bg-neutral-100 text-neutral-700 flex items-center justify-center text-[11px] font-medium">
                          {project.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="min-w-0 flex-1 truncate text-sm text-neutral-900">{project.name}</span>
                        <span className="shrink-0 text-xs text-neutral-500">{ROLE_LABELS[project.role]}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              )}
            </Card>

            {user.type === 'PASSWORD' && <ChangePasswordCard />}

            {/* Danger zone */}
            <Card className="border-red-200">
              <CardHeader className="border-b border-red-100 bg-red-50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white rounded-lg shadow-sm border border-red-200">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg text-red-900">Danger zone</CardTitle>
                    <CardDescription className="text-red-700">Irreversible actions on your account</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="flex items-start justify-between gap-4 px-6 py-5 bg-red-50/40">
                  <div className="flex-1">
                    <h4 className="font-semibold text-red-900">Delete account</h4>
                    <p className="mt-1 text-sm text-red-800">
                      Permanently delete your Plunk account. This <strong>cannot be undone</strong>.
                    </p>
                    {!canDelete && <p className="mt-2 text-sm text-neutral-600">{blockingSummary(projects)}</p>}
                  </div>
                  <Button
                    type="button"
                    variant="destructive"
                    disabled={!canDelete}
                    onClick={() => setShowDeleteDialog(true)}
                    className="shrink-0"
                  >
                    Delete account
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <ConfirmDialog
          open={showDeleteDialog}
          onOpenChange={setShowDeleteDialog}
          onConfirm={handleDeleteAccount}
          title="Delete your account?"
          description={`This permanently deletes ${user.email}. It cannot be undone, and you will need to sign up again to use Plunk.`}
          confirmPhrase="DELETE"
          confirmText="Delete account"
          loadingText="Deleting…"
          variant="destructive"
          status={isDeleting ? 'loading' : 'idle'}
        />

      </DashboardLayout>
    </>
  );
}
