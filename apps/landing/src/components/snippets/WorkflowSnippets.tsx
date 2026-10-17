import {ArrowRight, Clock, Mail, Play, Split, Webhook, Zap} from 'lucide-react';
import React from 'react';

import {Avatar, SnippetRow, StatusPill, TimeAgo, UICard} from './fragments';
import {SnippetMosaic, SnippetTile} from './SnippetTile';

/**
 * A workflow, told as four moments rather than drawn as one canvas: what
 * starts it, what it sends, how it waits, and how it decides. The old graphic
 * was the whole builder in a dark frame with event names in mono; each tile
 * here holds one step and leaves room around it.
 */
export function WorkflowSnippets() {
  return (
    <SnippetMosaic>
      <SnippetTile align={'bleed-right'} className={'min-h-56'}>
        <UICard className={'p-4'}>
          <SnippetRow icon={Zap} label={'Trigger'} title={'Contact signs up'} />
        </UICard>
      </SnippetTile>

      <SnippetTile align={'bleed-right'} className={'min-h-56'}>
        <UICard className={'p-4'}>
          <SnippetRow
            icon={Mail}
            label={'Send email'}
            title={'Welcome to Acme'}
            trailing={<StatusPill tone={'ok'}>Delivered</StatusPill>}
          />
          <p className={'mt-3 border-t border-neutral-100 pt-3 text-ui text-neutral-500'}>
            Thanks for signing up. Here is how to get started.
          </p>
        </UICard>
      </SnippetTile>

      <SnippetTile className={'min-h-56'}>
        <UICard className={'inline-flex items-center gap-2.5 py-2.5 pl-3 pr-4'}>
          <Clock className={'h-4 w-4 text-neutral-500'} strokeWidth={1.75} aria-hidden />
          <span className={'text-ui font-semibold text-neutral-900'}>Wait 3 days</span>
        </UICard>
      </SnippetTile>

      <SnippetTile align={'bleed-bottom'} className={'min-h-56'}>
        <UICard className={'p-4'}>
          <SnippetRow icon={Split} label={'Condition'} title={'Opened the welcome email?'} />
          <div className={'mt-4 flex flex-col gap-2 border-t border-neutral-100 pt-4'}>
            {[
              {answer: 'Yes', next: 'Send tips'},
              {answer: 'No', next: 'Send a nudge'},
            ].map(path => (
              <div key={path.answer} className={'flex items-center gap-2 text-ui text-neutral-700'}>
                <StatusPill>{path.answer}</StatusPill>
                <ArrowRight className={'h-3.5 w-3.5 text-neutral-400'} strokeWidth={1.75} aria-hidden />
                {path.next}
              </div>
            ))}
          </div>
        </UICard>
      </SnippetTile>
    </SnippetMosaic>
  );
}

/** Your app reports something; a workflow starts for that contact. */
export function WorkflowEventFragment() {
  return (
    <div className={'flex w-full max-w-xs flex-col items-center'}>
      <UICard className={'w-full p-3'}>
        <SnippetRow
          icon={Zap}
          label={'Event from your app'}
          title={'Ana Ruiz signed up'}
          trailing={<TimeAgo>now</TimeAgo>}
        />
      </UICard>
      <span aria-hidden className={'h-5 w-px bg-neutral-300'} />
      <UICard className={'w-full p-3'}>
        <SnippetRow
          icon={Play}
          label={'Workflow started'}
          title={'Onboarding'}
          trailing={<StatusPill tone={'ok'}>Running</StatusPill>}
        />
      </UICard>
    </div>
  );
}

/** Where each contact is in a flow, while it runs. */
export function WorkflowRunsFragment() {
  const runs = [
    {name: 'Ana Ruiz', state: 'Waiting 3 days', pill: null},
    {name: 'Tom Bakker', state: 'Sent “Getting started”', pill: null},
    {name: 'Priya Nair', state: 'Finished', pill: 'ok' as const},
  ];

  return (
    <UICard className={'w-full max-w-xs divide-y divide-neutral-100'}>
      {runs.map(run => (
        <div key={run.name} className={'flex items-center gap-3 px-4 py-3'}>
          <Avatar name={run.name} />
          <div className={'min-w-0 flex-1'}>
            <p className={'truncate text-ui font-semibold text-neutral-900'}>{run.name}</p>
            {!run.pill && <p className={'truncate text-label text-neutral-500'}>{run.state}</p>}
          </div>
          {run.pill && <StatusPill tone={run.pill}>{run.state}</StatusPill>}
        </div>
      ))}
    </UICard>
  );
}

/** A step that tells another system what happened. */
export function WorkflowWebhookFragment() {
  return (
    <UICard className={'w-full max-w-xs p-4'}>
      <SnippetRow
        icon={Webhook}
        label={'Webhook'}
        title={'Update the CRM'}
        trailing={<StatusPill tone={'ok'}>Sent</StatusPill>}
      />
      <p className={'mt-3 border-t border-neutral-100 pt-3 text-ui text-neutral-500'}>
        Marks Ana Ruiz as onboarded in your CRM.
      </p>
    </UICard>
  );
}
