import {zodResolver} from '@hookform/resolvers/zod';
import {AuthenticationSchemas} from '@plunk/shared';
import {
  Button,
  Card,
  CardContent,
  Form,
  FormControl,
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

import {API_URI} from '../../lib/constants';
import {useConfig} from '../../lib/hooks/useConfig';
import {useProjects} from '../../lib/hooks/useProject';
import {useUser} from '../../lib/hooks/useUser';
import {network} from '../../lib/network';


export default function Signup() {
  const {mutate: userMutate} = useUser();
  const {mutate: projectsMutate} = useProjects();
  const router = useRouter();

  const form = useForm<z.infer<typeof AuthenticationSchemas.signup>>({
    resolver: zodResolver(AuthenticationSchemas.signup),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const {data: config} = useConfig();
  const oauthConfig = {
    github: config?.features.authProviders.github ?? false,
    google: config?.features.authProviders.google ?? false,
  };
  const signupsDisabled = config?.features.signup.signupsDisabled ?? false;

  async function onSubmit(values: z.infer<typeof AuthenticationSchemas.signup>) {
    try {
      const response = await network.fetch<
        {
          success: boolean;
          data: {id: string; email: string} | string;
        },
        typeof AuthenticationSchemas.signup
      >('POST', '/auth/signup', values);

      if (!response.success) {
        const errorData = typeof response.data === 'string' ? response.data : 'Something went wrong';
        setErrorMessage(errorData);
      } else {
        setErrorMessage(null);

        await userMutate();
        await projectsMutate();

        await router.push('/projects/create');
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Something went wrong');
    }
  }

  return (
    <>
      <NextSeo title="Sign up" />
      <div
        className="min-h-screen flex items-center justify-center py-12"
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
              {signupsDisabled ? (
                <div className="p-8 flex flex-col gap-4 text-center">
                  <h1 className="text-2xl font-bold tracking-tight">Signups are disabled</h1>
                  <p className="text-sm text-neutral-500">
                    New account registration is currently disabled on this instance. Please contact your administrator if you
                    believe this is a mistake.
                  </p>
                  <Link
                    href="/auth/login"
                    className="text-sm text-neutral-900 underline underline-offset-4 hover:text-neutral-600 transition-colors"
                  >
                    Back to log in
                  </Link>
                </div>
              ) : (
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
                        <h1 className="text-2xl font-bold tracking-tight">Create an account</h1>
                        <p className="text-sm text-neutral-500">Start sending emails in minutes</p>
                      </div>

                      {(oauthConfig.github || oauthConfig.google) && (
                        <>
                          <div className="grid gap-2">
                            {oauthConfig.google && (
                              <Button
                                type="button"
                                variant="outline"
                                className="w-full"
                                onClick={() => {
                                  window.location.href = `${API_URI}/oauth/google/outbound`;
                                }}
                              >
                                <svg className="h-4 w-4" viewBox="0 0 24 24">
                                  <path
                                    fill="currentColor"
                                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                  />
                                  <path
                                    fill="currentColor"
                                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                  />
                                  <path
                                    fill="currentColor"
                                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                  />
                                  <path
                                    fill="currentColor"
                                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                  />
                                </svg>
                                Continue with Google
                              </Button>
                            )}
                            {oauthConfig.github && (
                              <Button
                                type="button"
                                variant="outline"
                                className="w-full"
                                onClick={() => {
                                  window.location.href = `${API_URI}/oauth/github/outbound`;
                                }}
                              >
                                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                                </svg>
                                Continue with GitHub
                              </Button>
                            )}
                          </div>
                          <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                              <span className="w-full border-t border-neutral-200" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                              <span className="bg-white px-2 text-neutral-400 tracking-wider">or</span>
                            </div>
                          </div>
                        </>
                      )}

                      <div className="grid gap-4">
                        <FormField
                          control={form.control}
                          name="email"
                          render={({field}) => (
                            <FormItem>
                              <FormLabel>Email</FormLabel>
                              <FormControl>
                                <Input placeholder="you@example.com" autoFocus {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="password"
                          render={({field}) => (
                            <FormItem>
                              <FormLabel>Password</FormLabel>
                              <FormControl>
                                <Input placeholder="At least 6 characters" type="password" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <AnimatePresence>
                        {errorMessage && (
                          <motion.p
                            initial={{opacity: 0, y: -8}}
                            animate={{opacity: 1, y: 0}}
                            exit={{opacity: 0, y: -8}}
                            transition={{duration: 0.15}}
                            className="text-sm text-red-500"
                          >
                            {errorMessage}
                          </motion.p>
                        )}
                      </AnimatePresence>

                      <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                        {form.formState.isSubmitting ? (
                          <>
                            <IconSpinner size="sm" />
                            Creating account...
                          </>
                        ) : (
                          'Create account'
                        )}
                      </Button>

                      <p className="text-center text-sm text-neutral-500">
                        Already have an account?{' '}
                        <Link href="/auth/login" className="text-neutral-900 underline underline-offset-4 hover:text-neutral-600 transition-colors">
                          Log in
                        </Link>
                      </p>
                    </div>
                  </form>
                </Form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
