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
import {FolderPlus, UserPlus} from 'lucide-react';
import {NextSeo} from 'next-seo';
import {useRouter} from 'next/router';
import React, {useState} from 'react';
import {useForm} from 'react-hook-form';
import type {z} from 'zod';

import {useActiveProject} from '../../lib/contexts/ActiveProjectProvider';
import {useProjects} from '../../lib/hooks/useProject';
import {network} from '../../lib/network';

export default function CreateProject() {
  const {mutate: projectsMutate} = useProjects();
  const {setActiveProject} = useActiveProject();
  const router = useRouter();

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
      <div
        className={'min-h-screen flex items-center justify-center bg-gradient-to-br from-neutral-50 to-neutral-100 p-4'}
      >
        <div className={'flex flex-col gap-6 max-w-2xl w-full'}>
          <div className="text-center mb-2">
            <h1 className="text-3xl font-bold mb-2">Welcome to Plunk</h1>
            <p className="text-neutral-600">Choose how you&#39;d like to get started</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <Card className="border-2 hover:border-neutral-300 transition-colors">
              <CardContent className="p-0">
                <Form {...form}>
                  <form
                    onSubmit={e => {
                      e.preventDefault();
                      void form.handleSubmit(onSubmit)(e);
                    }}
                    className="p-6 md:p-8"
                  >
                    <div className="flex flex-col gap-6">
                      <div className="flex flex-col items-center text-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-neutral-900 text-white flex items-center justify-center">
                          <FolderPlus className="w-6 h-6" />
                        </div>
                        <div>
                          <h2 className="text-xl font-bold mb-1">Create a new project</h2>
                          <p className="text-sm text-neutral-500">Start from scratch and set up your own project.</p>
                        </div>
                      </div>

                      <div className="grid gap-2">
                        <FormField
                          control={form.control}
                          name="name"
                          render={({field}) => (
                            <FormItem>
                              <FormLabel>Project name</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g., Acme" {...field} />
                              </FormControl>
                              <FormDescription>You can change this later</FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

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
                              Creating...
                            </>
                          ) : (
                            <>
                              <FolderPlus className="w-4 h-4 mr-2" />
                              Create project
                            </>
                          )}
                        </Button>
                      </motion.div>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>

            <Card className="border-2 hover:border-neutral-300 transition-colors">
              <CardContent className="p-6 md:p-8 h-full">
                <div className="flex flex-col gap-6 h-full">
                  <div className="flex flex-col items-center text-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-neutral-100 text-neutral-900 flex items-center justify-center">
                      <UserPlus className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold mb-1">Join an existing project</h2>
                      <p className="text-sm text-neutral-500">Get access to a project created by your team</p>
                    </div>
                  </div>

                  <div className="flex-1 flex flex-col justify-center">
                    <div className="bg-neutral-50 rounded-lg p-6 border border-neutral-200">
                      <p className="text-sm text-neutral-600 text-center leading-relaxed">
                        Ask a project admin to invite you from Settings → Team.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
