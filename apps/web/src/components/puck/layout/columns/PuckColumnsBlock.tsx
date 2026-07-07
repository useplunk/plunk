import React from 'react';

import {
  SLOT_MIN_HEIGHT,
  gapClassName,
  mobileClassName,
} from '../shared/fields';
import sharedStyles from '../shared/styles.module.css';
import type {ColumnRatio} from '../shared/types';
import type {ColumnsPuckRenderProps} from './types';

const ratioClass: Record<ColumnRatio, string> = {
  equal: sharedStyles.ratioEqual ?? '',
  leftWider: sharedStyles.ratioLeftWider ?? '',
  rightWider: sharedStyles.ratioRightWider ?? '',
};

export function PuckColumnsBlock({
  leftColumn: LeftColumn,
  rightColumn: RightColumn,
  ratio,
  gap,
  mobileLayout,
}: ColumnsPuckRenderProps) {
  return (
    <div className={sharedStyles.wrapper}>
      <div className={sharedStyles.inner}>
        <div
          className={[
            sharedStyles.columns,
            ratioClass[ratio],
            sharedStyles[gapClassName(gap)],
            sharedStyles[mobileClassName(mobileLayout)],
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <LeftColumn collisionAxis="y" minEmptyHeight={SLOT_MIN_HEIGHT} />
          <RightColumn collisionAxis="y" minEmptyHeight={SLOT_MIN_HEIGHT} />
        </div>
      </div>
    </div>
  );
}
