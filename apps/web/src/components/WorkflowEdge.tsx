import {BaseEdge, EdgeLabelRenderer, type EdgeProps, getSmoothStepPath} from '@xyflow/react';
import {Plus, Unlink} from 'lucide-react';
import {useState} from 'react';

export interface WorkflowEdgeData extends Record<string, unknown> {
  /** Branch label ("Yes", "No", a named branch…). Undefined for plain transitions. */
  branchLabel?: string;
  /** Colour used for the branch label. */
  branchColor?: string;
  onInsert: () => void;
  onDisconnect: () => void;
}

/**
 * Transition edge with an inline toolbar.
 *
 * Hovering the edge (or the label itself) swaps the branch label for two
 * actions: insert a step in the middle of the transition, or disconnect the two
 * steps. The label and the toolbar occupy the same spot so the graph stays
 * uncluttered when nothing is hovered.
 */
export function WorkflowEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
  markerEnd,
  data,
}: EdgeProps) {
  const [hovered, setHovered] = useState(false);

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const {branchLabel, branchColor, onInsert, onDisconnect} = (data ?? {}) as WorkflowEdgeData;

  return (
    <>
      <BaseEdge id={id} path={edgePath} style={style} markerEnd={markerEnd} />

      {/* Invisible fat path so the edge is comfortable to hover, not just the 2px stroke */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={24}
        style={{pointerEvents: 'stroke'}}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      />

      <EdgeLabelRenderer>
        <div
          className="nodrag nopan absolute"
          style={{
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            pointerEvents: 'all',
          }}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          {hovered ? (
            <div className="flex items-center gap-0.5 rounded-lg border border-neutral-200 bg-white p-0.5 shadow-md">
              <button
                type="button"
                onClick={onInsert}
                title="Insert a step here"
                className="flex h-7 w-7 items-center justify-center rounded-md text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
              >
                <Plus className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={onDisconnect}
                title="Disconnect these steps"
                className="flex h-7 w-7 items-center justify-center rounded-md text-neutral-600 transition-colors hover:bg-red-50 hover:text-red-600"
              >
                <Unlink className="h-4 w-4" />
              </button>
            </div>
          ) : (
            branchLabel && (
              <span
                className="rounded bg-white/95 px-2 py-1 text-xs font-semibold"
                style={{color: branchColor}}
              >
                {branchLabel}
              </span>
            )
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
