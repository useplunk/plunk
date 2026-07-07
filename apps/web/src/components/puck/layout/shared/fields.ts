import type {Fields} from '@puckeditor/core';

import type {GapSize, MobileLayout} from './types';

export const gapField = {
  type: 'select',
  label: 'Spacing',
  options: [
    {label: 'Tight', value: 'sm'},
    {label: 'Normal', value: 'md'},
    {label: 'Loose', value: 'lg'},
  ],
} as const;

export const mobileLayoutField = {
  type: 'select',
  label: 'On mobile',
  options: [
    {label: 'Stack', value: 'stack'},
    {label: 'Keep columns', value: 'keep'},
  ],
} as const;

export const wrapField = {
  type: 'radio',
  label: 'Wrap items',
  options: [
    {label: 'Yes', value: true},
    {label: 'No', value: false},
  ],
} as const;

export function gapClassName(gap: GapSize): string {
  return {
    sm: 'gapSm',
    md: 'gapMd',
    lg: 'gapLg',
  }[gap];
}

export function mobileClassName(mobileLayout: MobileLayout): string {
  return mobileLayout === 'stack' ? 'mobileStack' : 'mobileKeep';
}

/** Editor-only: min height for empty drop zones so users can drag blocks in. Ignored once a slot has content. */
export const SLOT_MIN_HEIGHT = 80;

export type LayoutFieldProps = {
  gap: GapSize;
  mobileLayout: MobileLayout;
};

export function layoutFields(): Pick<Fields<LayoutFieldProps>, 'gap' | 'mobileLayout'> {
  return {
    gap: gapField,
    mobileLayout: mobileLayoutField,
  };
}
