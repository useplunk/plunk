import React from 'react';

import {SLOT_MIN_HEIGHT} from '../shared/fields';
import sharedStyles from '../shared/styles.module.css';
import {gridColumnForWidth} from './defaults';
import type {GridCellPuckRenderProps} from './types';

export function PuckGridCellBlock({content: Content, width, puck}: GridCellPuckRenderProps) {
  return (
    <div
      ref={puck.dragRef}
      className={sharedStyles.cell}
      style={{gridColumn: gridColumnForWidth(width)}}
    >
      <Content className={sharedStyles.cellContent} collisionAxis="y" minEmptyHeight={SLOT_MIN_HEIGHT} />
    </div>
  );
}
