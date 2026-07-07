import React from 'react';

import {
  SLOT_MIN_HEIGHT,
  gapClassName,
  mobileClassName,
} from '../shared/fields';
import sharedStyles from '../shared/styles.module.css';
import type {FlexRowPuckRenderProps} from './types';

export function PuckFlexRowBlock({content: Content, wrap, gap, mobileLayout}: FlexRowPuckRenderProps) {
  return (
    <div className={sharedStyles.wrapper}>
      <div className={sharedStyles.inner}>
        <Content
          className={[
            sharedStyles.flexRow,
            wrap ? sharedStyles.wrap : sharedStyles.noWrap,
            sharedStyles[gapClassName(gap)],
            sharedStyles[mobileClassName(mobileLayout)],
          ]
            .filter(Boolean)
            .join(' ')}
          collisionAxis="x"
          minEmptyHeight={SLOT_MIN_HEIGHT}
        />
      </div>
    </div>
  );
}
