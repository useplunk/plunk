import {migrate, type Content, type Data, type Slot} from '@puckeditor/core';
import {EMPTY_PUCK_DATA} from '@plunk/types';

import {puckConfig} from './config';

export function normalizePuckData(data: unknown): Data {
  if (!data || typeof data !== 'object' || !('content' in data)) {
    return EMPTY_PUCK_DATA as Data;
  }

  return migrate(data as Data, puckConfig, {
    migrateDynamicZonesForComponent: {
      Section: (
        props: {content?: Slot; id: string; padding?: string; background?: string},
        zones: Record<string, Content>,
      ) => ({
        ...props,
        content: zones['section-content'] ?? props.content ?? [],
      }),
    },
    // Puck types require a handler per component; only Section had a legacy DropZone.
  } as never);
}
