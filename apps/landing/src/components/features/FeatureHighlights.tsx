import React from 'react';

import {Checklist, type ChecklistItem} from '../sections';
import {ClaimTiles, type Claim} from '../snippets';
import {FeatureSection} from './FeatureSection';

/**
 * The body of a feature page: three claims shown as tiles, then the smaller
 * capabilities as a tick list. The tiles carry the page for someone scanning;
 * the list is there so nothing the feature does goes unmentioned.
 */
export function FeatureHighlights({
  title,
  intro,
  claims,
  extras,
}: {
  title: string;
  intro?: string;
  claims: Claim[];
  extras: ChecklistItem[];
}) {
  return (
    <FeatureSection title={title} intro={intro}>
      <ClaimTiles items={claims} />
      <div className={'mt-20'}>
        <h3 className={'mb-8 font-display text-h3 font-bold tracking-[-0.025em] text-neutral-900'}>Also included</h3>
        <Checklist items={extras} />
      </div>
    </FeatureSection>
  );
}
