import {zodResolver} from '@hookform/resolvers/zod';
import type {Project} from '@plunk/db';
import {ProjectSchemas} from '@plunk/shared';
import {
  Button,
  Card,
  CardContent,
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  IconSpinner,
  Input,
} from '@plunk/ui';
import {AnimatePresence, motion} from 'framer-motion';
import {NextSeo} from 'next-seo';
import Image from 'next/image';
import Link from 'next/link';
import {useRouter} from 'next/router';
import React, {useState} from 'react';
import {useForm} from 'react-hook-form';
import type {z} from 'zod';

import {useActiveProject} from '../../lib/contexts/ActiveProjectProvider';
import {useLogout} from '../../lib/hooks/useLogout';
import {useProjects} from '../../lib/hooks/useProject';
import {network} from '../../lib/network';

export default function CreateProject() {
  const {mutate: projectsMutate} = useProjects();
  const {setActiveProject} = useActiveProject();
  const router = useRouter();
  const logout = useLogout();

  const form = useForm<z.infer<typeof ProjectSchemas.create>>({
    resolver: zodResolver(ProjectSchemas.create),
    defaultValues: {
      name: '',
    },
  });

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function onSubmit(values: z.infer<typeof ProjectSchemas.create>) {
    try {
      const newProject = await network.fetch<Project, typeof ProjectSchemas.create>(
        'POST',
        '/users/@me/projects',
        values,
      );

      // Refresh the projects list
      await projectsMutate();

      // Set the newly created project as active
      setActiveProject(newProject);

      // Redirect into onboarding for this project
      await router.push('/onboarding');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Something went wrong');
    }
  }

  return (
    <>
      <NextSeo title="Create project" />
      {/* Same ground, lockup and card rhythm as the auth screens, so signup into first
          project reads as one continuous surface. */}
      <div
        className="min-h-[100dvh] flex items-center justify-center py-12"
        style={{
          backgroundColor: '#fafafa',
          backgroundImage: 'radial-gradient(#e5e7eb 1px, transparent 1px)',
          backgroundSize: '20px 20px',
        }}
      >
        <div className="flex flex-col gap-6 max-w-md w-full px-4">
          <div className="flex items-center justify-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-white shadow-sm border border-neutral-200 flex items-center justify-center p-1">
              <Image src="/assets/logo.svg" alt="" aria-hidden width={24} height={24} />
            </div>
            <span className="text-lg font-bold tracking-tight text-neutral-900">Plunk</span>
          </div>

          <Card>
            <CardContent className="p-0">
              <Form {...form}>
                <form
                  onSubmit={e => {
                    e.preventDefault();
                    void form.handleSubmit(onSubmit)(e);
                  }}
                  className="p-8"
                >
                  <div className="flex flex-col gap-6">
                    <div className="flex flex-col gap-1.5">
                      <h1 className="text-2xl font-bold tracking-tight">Create a project</h1>
                      <p className="text-sm text-neutral-500">
                        A project keeps its own contacts, templates and campaigns. Most teams need only one.
                      </p>
                    </div>

                    <FormField
                      control={form.control}
                      name="name"
                      render={({field}) => (
                        <FormItem>
                          <FormLabel>Project name</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. Northwind Coffee" autoFocus {...field} />
                          </FormControl>
                          <FormDescription>You can change this later</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <AnimatePresence>
                      {errorMessage && (
                        <motion.p
                          initial={{opacity: 0, y: -10}}
                          animate={{opacity: 1, y: 0}}
                          exit={{opacity: 0, y: -10}}
                          className="text-sm font-medium text-red-500"
                        >
                          {errorMessage}
                        </motion.p>
                      )}
                    </AnimatePresence>

                    <motion.div layout>
                      <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                        {form.formState.isSubmitting ? (
                          <>
                            <IconSpinner size="sm" className="mr-2" />
                            Creating…
                          </>
                        ) : (
                          'Create project'
                        )}
                      </Button>
                    </motion.div>

                    <p className="text-center text-sm text-neutral-500">
                      Joining a team instead? Ask an admin to invite you from Settings → Team.
                    </p>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>

          {/* The only navigation on this page. Without a project the sidebar never renders,
              so this is a zero-project user's sole route to their account or to signing out. */}
          <div className="flex items-center justify-center gap-3 text-sm">
            <Link href="/account" className="text-neutral-500 hover:text-neutral-900 transition-colors">
              Account settings
            </Link>
            <span className="text-neutral-300" aria-hidden="true">
              ·
            </span>
            <button
              type="button"
              onClick={() => void logout()}
              className="text-neutral-500 hover:text-neutral-900 transition-colors"
            >
              Log out
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
