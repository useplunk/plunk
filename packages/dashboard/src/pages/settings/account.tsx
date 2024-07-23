import {Dashboard} from '../../layouts';
import {Card, FullscreenLoader} from '../../components';
import {useUser} from '../../lib/hooks/users';
import React from 'react';

/**
 *
 */
export default function Index() {
  const {data: user} = useUser();

  if (!user) {
    return <FullscreenLoader />;
  }

  return (
    <>
      <Dashboard>
        <Card title={'Account details'} description={'Manage your account and contact details'}>
          <div className={'grid gap-5 sm:grid-cols-2'}>
            <div className="flex flex-col">
              <label htmlFor="email" className="text-xs font-light">
                Email
              </label>
              <input
                name="email"
                autoComplete={'off'}
                type="email"
                className={
                  'block w-full rounded border-neutral-300 transition ease-in-out focus:border-purple-500 focus:ring-purple-500 disabled:bg-neutral-100 sm:text-sm'
                }
                placeholder="Your email"
                disabled={true}
                value={user.email}
              />
            </div>
          </div>
        </Card>
      </Dashboard>
    </>
  );
}
