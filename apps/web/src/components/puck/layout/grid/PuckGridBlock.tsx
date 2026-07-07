import React from 'react';

import {
  SLOT_MIN_HEIGHT,
  gapClassName,
  mobileClassName,
} from '../shared/fields';
import sharedStyles from '../shared/styles.module.css';
import type {GridPuckRenderProps} from './types';

export function PuckGridBlock({content: Content, columns, gap, mobileLayout}: GridPuckRenderProps) {
  return (
    <div className={sharedStyles.wrapper}>
      <div className={sharedStyles.inner}>
        <Content
          className={[
            sharedStyles.grid,
            sharedStyles[gapClassName(gap)],
            sharedStyles[mobileClassName(mobileLayout)],
          ]
            .filter(Boolean)
            .join(' ')}
          style={{
            gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
          }}
          collisionAxis="dynamic"
          minEmptyHeight={SLOT_MIN_HEIGHT}
        />
      </div>
    </div>
  );
}
