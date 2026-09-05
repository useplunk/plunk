/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Background,
  Controls,
  type Edge,
  Handle,
  MarkerType,
  MiniMap,
  type Node,
  Panel,
  Position,
  ReactFlow,
  useEdgesState,
  useNodesState,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type {WorkflowStep} from '@plunk/db';
import {AlertTriangle, Clock, GitBranch, Hourglass, Link, LogOut, Mail, Maximize2, Minimize2, Timer, UserCog, Webhook} from 'lucide-react';
import {useEffect, useMemo, useState} from 'react';
import dagre from 'dagre';

interface WorkflowVisualizerProps {
  steps: (WorkflowStep & {
    template?: {id: string; name: string} | null;
    outgoingTransitions: Array<{
      id: string;
      toStepId: string;
      condition: unknown;
      waitOutcome: 'EVENT' | 'TIMEOUT' | null;
      priority: number;
    }>;
    incomingTransitions: Array<{
      id: string;
      fromStepId: string;
      condition: unknown;
      waitOutcome: 'EVENT' | 'TIMEOUT' | null;
      priority: number;
    }>;
  })[];
}

const STEP_TYPE_LABELS: Record<string, string> = {
  TRIGGER: 'Trigger',
  SEND_EMAIL: 'Send Email',
  DELAY: 'Delay',
  WAIT_FOR_EVENT: 'Wait for Event',
  CONDITION: 'Condition',
  EXIT: 'Exit',
  WEBHOOK: 'Webhook',
  UPDATE_CONTACT: 'Update Contact',
};

const STEP_TYPE_ICONS = {
  TRIGGER: GitBranch,
  SEND_EMAIL: Mail,
  DELAY: Clock,
  WAIT_FOR_EVENT: Clock,
  CONDITION: GitBranch,
  EXIT: LogOut,
  WEBHOOK: Webhook,
  UPDATE_CONTACT: UserCog,
};

const STEP_TYPE_COLORS = {
  TRIGGER: '#9333ea', // purple-600
  SEND_EMAIL: '#2563eb', // blue-600
  DELAY: '#ea580c', // orange-600
  WAIT_FOR_EVENT: '#ca8a04', // yellow-600
  CONDITION: '#9333ea', // purple-600
  EXIT: '#dc2626', // red-600
  WEBHOOK: '#16a34a', // green-600
  UPDATE_CONTACT: '#4f46e5', // indigo-600
};

const STEP_TYPE_BG = {
  TRIGGER: '#f3e8ff', // purple-50
  SEND_EMAIL: '#dbeafe', // blue-50
  DELAY: '#ffedd5', // orange-50
  WAIT_FOR_EVENT: '#fef3c7', // yellow-50
  CONDITION: '#f3e8ff', // purple-50
  EXIT: '#fee2e2', // red-50
  WEBHOOK: '#dcfce7', // green-50
  UPDATE_CONTACT: '#e0e7ff', // indigo-50
};

// Dagre layout function
function getLayoutedElements(nodes: Node[], edges: Edge[]) {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  const nodeWidth = 250;
  const nodeHeight = 100;

  dagreGraph.setGraph({
    rankdir: 'TB', // Top to Bottom
    nodesep: 80, // Horizontal spacing
    ranksep: 120, // Vertical spacing
    marginx: 50,
    marginy: 50,
  });

  nodes.forEach(node => {
    dagreGraph.setNode(node.id, {width: nodeWidth, height: nodeHeight});
  });

  edges.forEach(edge => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map(node => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - nodeWidth / 2,
        y: nodeWithPosition.y - nodeHeight / 2,
      },
    };
  });

  return {nodes: layoutedNodes, edges};
}

// Custom node component
function CustomNode({
  data,
}: {
  data: {
    label: string;
    type: string;
    icon?: any;
    color?: string;
    bgColor?: string;
    template?: {name: string};
    config?: any;
  };
}) {
  const Icon = data.icon;
  const color = data.color;
  const bgColor = data.bgColor;

  return (
    <>
      <Handle
        type="target"
        position={Position.Top}
        style={{opacity: 0, cursor: 'default', pointerEvents: 'none'}}
      />

      <div
        className="px-5 py-4 rounded-xl border-2 bg-white shadow-sm hover:shadow-md transition-all cursor-grab active:cursor-grabbing"
        style={{
          borderColor: color,
          minWidth: '250px',
          maxWidth: '250px',
        }}
      >
        {/* Header */}
        <div className="flex items-start gap-3 mb-3">
          <div
            className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center"
            style={{backgroundColor: bgColor}}
          >
            <Icon className="h-5 w-5" style={{color}} />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-neutral-900 text-sm leading-tight mb-1 break-words">{data.label}</h4>
            <span
              className="inline-flex items-center text-xs px-2 py-0.5 rounded-full font-medium"
              style={{
                backgroundColor: bgColor,
                color,
              }}
            >
              {STEP_TYPE_LABELS[data.type] ?? data.type}
            </span>
          </div>
        </div>

        {/* Details */}
        {data.template && (
          <div className="mt-3 pt-3 border-t border-neutral-100">
            <div className="flex items-center gap-2 text-xs text-neutral-600">
              <Mail className="h-3 w-3" />
              <span className="truncate">{data.template.name}</span>
            </div>
          </div>
        )}
        {data.type === 'DELAY' && data.config?.amount && (
          <div className="mt-3 pt-3 border-t border-neutral-100">
            <div className="flex items-center gap-2 text-xs text-neutral-600">
              <Timer className="h-3 w-3" />
              <span>
                Wait {data.config.amount} {data.config.unit}
              </span>
            </div>
          </div>
        )}
        {data.type === 'CONDITION' && (
          <div className="mt-3 pt-3 border-t border-neutral-100">
            <div className="flex items-center gap-1 text-xs text-neutral-600">
              <GitBranch className="h-3 w-3" />
              <span>If/else branch</span>
            </div>
          </div>
        )}
        {data.type === 'WAIT_FOR_EVENT' && data.config?.eventName && (
          <div className="mt-3 pt-3 border-t border-neutral-100">
            <div className="flex items-center gap-2 text-xs text-neutral-600">
              <Hourglass className="h-3 w-3" />
              <span className="truncate">{data.config.eventName}</span>
            </div>
          </div>
        )}
        {data.type === 'WEBHOOK' && data.config?.url && (
          <div className="mt-3 pt-3 border-t border-neutral-100">
            <div className="flex items-center gap-2 text-xs text-neutral-600">
              <Link className="h-3 w-3" />
              <span className="truncate">{data.config.method || 'POST'}</span>
            </div>
          </div>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        style={{opacity: 0, cursor: 'default', pointerEvents: 'none'}}
      />
    </>
  );
}

const nodeTypes = {
  custom: CustomNode,
};

export function WorkflowVisualizer({steps}: WorkflowVisualizerProps) {
  // Convert workflow steps to React Flow nodes
  const rawNodes: Node[] = useMemo(() => {
    if (steps.length === 0) return [];

    const nodes: Node[] = steps.map(step => {
      const Icon = STEP_TYPE_ICONS[step.type as keyof typeof STEP_TYPE_ICONS] || GitBranch;
      const color = STEP_TYPE_COLORS[step.type as keyof typeof STEP_TYPE_COLORS] || '#6b7280';
      const bgColor = STEP_TYPE_BG[step.type as keyof typeof STEP_TYPE_BG] || '#f3f4f6';

      return {
        id: step.id,
        type: 'custom',
        position: {x: 0, y: 0}, // Will be set by layout
        data: {
          label: step.name,
          type: step.type,
          icon: Icon,
          color,
          bgColor,
          template: step.template,
          config: step.config,
        },
      };
    });

    // Add END nodes for CONDITION steps with missing branches
    steps.forEach(step => {
      if (step.type === 'CONDITION') {
        const hasYesBranch = step.outgoingTransitions?.some(
          t =>
            t.condition && typeof t.condition === 'object' && 'branch' in t.condition && t.condition.branch === 'yes',
        );
        const hasNoBranch = step.outgoingTransitions?.some(
          t => t.condition && typeof t.condition === 'object' && 'branch' in t.condition && t.condition.branch === 'no',
        );

        if (!hasYesBranch) {
          nodes.push({
            id: `${step.id}-yes-end`,
            type: 'custom',
            position: {x: 0, y: 0},
            data: {
              label: 'End workflow',
              type: 'END',
              icon: LogOut,
              color: '#9ca3af',
              bgColor: '#f3f4f6',
              template: null,
              config: null,
            },
          });
        }

        if (!hasNoBranch) {
          nodes.push({
            id: `${step.id}-no-end`,
            type: 'custom',
            position: {x: 0, y: 0},
            data: {
              label: 'End workflow',
              type: 'END',
              icon: LogOut,
              color: '#9ca3af',
              bgColor: '#f3f4f6',
              template: null,
              config: null,
            },
          });
        }
      }
    });

    return nodes;
  }, [steps]);

  // Convert transitions to React Flow edges
  const rawEdges: Edge[] = useMemo(() => {
    const edges: Edge[] = [];

    steps.forEach(step => {
      // Add edges for existing transitions
      if (step.outgoingTransitions && step.outgoingTransitions.length > 0) {
        step.outgoingTransitions.forEach(transition => {
          const isConditional =
            transition.condition && typeof transition.condition === 'object' && 'branch' in transition.condition;
          const branch =
            transition.condition && typeof transition.condition === 'object' && 'branch' in transition.condition
              ? transition.condition.branch
              : undefined;
          const waitOutcome = step.type === 'WAIT_FOR_EVENT' ? transition.waitOutcome : null;
          const routeLabel = isConditional
            ? branch === 'yes'
              ? 'Yes'
              : 'No'
            : waitOutcome === 'EVENT'
              ? 'Event received'
              : waitOutcome === 'TIMEOUT'
                ? 'Timed out'
                : undefined;
          const routeColor = isConditional
            ? branch === 'yes'
              ? '#16a34a'
              : branch === 'no'
                ? '#dc2626'
                : '#64748b'
            : waitOutcome === 'EVENT'
              ? '#16a34a'
              : waitOutcome === 'TIMEOUT'
                ? '#d97706'
                : '#64748b';

          edges.push({
            id: transition.id,
            source: step.id,
            target: transition.toStepId,
            type: 'smoothstep',
            animated: false,
            label: routeLabel,
            labelStyle: {
              fill: routeColor,
              fontWeight: 600,
              fontSize: 12,
            },
            labelBgStyle: {
              fill: '#fff',
              fillOpacity: 0.95,
            },
            labelBgPadding: [8, 4] as [number, number],
            labelBgBorderRadius: 4,
            style: {
              stroke: '#94a3b8',
              strokeWidth: 2,
            },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: '#94a3b8',
              width: 20,
              height: 20,
            },
          });
        });
      }

      // Add edges to END nodes for CONDITION steps with missing branches
      if (step.type === 'CONDITION') {
        const hasYesBranch = step.outgoingTransitions?.some(
          t =>
            t.condition && typeof t.condition === 'object' && 'branch' in t.condition && t.condition.branch === 'yes',
        );
        const hasNoBranch = step.outgoingTransitions?.some(
          t => t.condition && typeof t.condition === 'object' && 'branch' in t.condition && t.condition.branch === 'no',
        );

        if (!hasYesBranch) {
          edges.push({
            id: `${step.id}-yes-end-edge`,
            source: step.id,
            target: `${step.id}-yes-end`,
            type: 'smoothstep',
            animated: false,
            label: 'Yes',
            labelStyle: {
              fill: '#16a34a',
              fontWeight: 600,
              fontSize: 12,
            },
            labelBgStyle: {
              fill: '#fff',
              fillOpacity: 0.95,
            },
            labelBgPadding: [8, 4] as [number, number],
            labelBgBorderRadius: 4,
            style: {
              stroke: '#94a3b8',
              strokeWidth: 2,
              strokeDasharray: '5,5',
            },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: '#94a3b8',
              width: 20,
              height: 20,
            },
          });
        }

        if (!hasNoBranch) {
          edges.push({
            id: `${step.id}-no-end-edge`,
            source: step.id,
            target: `${step.id}-no-end`,
            type: 'smoothstep',
            animated: false,
            label: 'No',
            labelStyle: {
              fill: '#dc2626',
              fontWeight: 600,
              fontSize: 12,
            },
            labelBgStyle: {
              fill: '#fff',
              fillOpacity: 0.95,
            },
            labelBgPadding: [8, 4] as [number, number],
            labelBgBorderRadius: 4,
            style: {
              stroke: '#94a3b8',
              strokeWidth: 2,
              strokeDasharray: '5,5',
            },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: '#94a3b8',
              width: 20,
              height: 20,
            },
          });
        }
      }
    });

    return edges;
  }, [steps]);

  // Apply dagre layout
  const {nodes: layoutedNodes, edges: layoutedEdges} = useMemo(() => {
    if (rawNodes.length === 0) return {nodes: [], edges: []};
    return getLayoutedElements(rawNodes, rawEdges);
  }, [rawNodes, rawEdges]);

  const [nodes, setNodes, onNodesChange] = useNodesState(layoutedNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(layoutedEdges);
  const [isExpanded, setIsExpanded] = useState(false);

  // Update nodes/edges when layout changes
  useEffect(() => {
    setNodes(layoutedNodes);
  }, [layoutedNodes, setNodes]);

  useEffect(() => {
    setEdges(layoutedEdges);
  }, [layoutedEdges, setEdges]);

  useEffect(() => {
    if (!isExpanded) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsExpanded(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isExpanded]);

  if (steps.length === 0) {
    return (
      <div className="bg-neutral-50 border-2 border-dashed border-neutral-300 rounded-lg p-12 text-center">
        <GitBranch className="h-16 w-16 text-neutral-400 mx-auto mb-4" />
        <p className="text-neutral-600 font-medium">No workflow steps yet</p>
        <p className="text-sm text-neutral-500 mt-2">Add steps to your workflow to see the visualization</p>
      </div>
    );
  }

  return (
    <>
      {isExpanded && (
        <div
          className="fixed inset-0 z-40 bg-black/40"
          onClick={() => setIsExpanded(false)}
        />
      )}
      <div
        className={
          isExpanded
            ? 'fixed inset-[5%] z-50 bg-neutral-50 rounded-xl border border-neutral-200 shadow-2xl'
            : 'w-full h-[700px] bg-neutral-50 rounded-lg border border-neutral-200 shadow-inner'
        }
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{
            padding: 0.3,
            minZoom: 0.5,
            maxZoom: 1.2,
          }}
          minZoom={0.1}
          maxZoom={2}
          nodesDraggable={true}
          nodesConnectable={false}
          elementsSelectable={true}
          defaultEdgeOptions={{
            type: 'smoothstep',
          }}
          proOptions={{hideAttribution: true}}
        >
          <Background color="#e5e7eb" gap={16} size={1} />
          <Controls
            showInteractive={false}
            className="bg-white border border-neutral-200 rounded-lg shadow-md"
          />
          <MiniMap
            nodeColor={node => {
              const step = steps.find(s => s.id === node.id);
              return step ? STEP_TYPE_COLORS[step.type as keyof typeof STEP_TYPE_COLORS] : '#6b7280';
            }}
            className="bg-white border border-neutral-200 rounded-lg shadow-md"
            maskColor="rgba(0, 0, 0, 0.05)"
          />
          <Panel
            position="top-left"
            className="bg-white px-4 py-2.5 rounded-lg shadow-md border border-neutral-200"
          >
            <div className="flex items-center gap-3">
              <GitBranch className="h-4 w-4 text-neutral-700" />
              <div className="text-sm">
                <span className="font-semibold text-neutral-900">{steps.length}</span>
                <span className="text-neutral-600"> step{steps.length !== 1 ? 's' : ''}</span>
                <span className="text-neutral-400 mx-2">·</span>
                <span className="font-semibold text-neutral-900">{rawEdges.length}</span>
                <span className="text-neutral-600"> transition{rawEdges.length !== 1 ? 's' : ''}</span>
              </div>
            </div>
          </Panel>
          <Panel position="top-right">
            <button
              onClick={() => setIsExpanded(e => !e)}
              className="bg-white border border-neutral-200 rounded-lg shadow-md p-2 hover:bg-neutral-50 transition-colors"
              title={isExpanded ? 'Exit fullscreen' : 'Expand to fullscreen'}
            >
              {isExpanded ? (
                <Minimize2 className="h-4 w-4 text-neutral-600" />
              ) : (
                <Maximize2 className="h-4 w-4 text-neutral-600" />
              )}
            </button>
          </Panel>
          {rawEdges.length === 0 && steps.length > 1 && (
            <Panel
              position="bottom-center"
              className="bg-white border border-neutral-200 px-4 py-2.5 rounded-lg shadow-sm"
            >
              <div className="flex items-center gap-2 text-sm text-neutral-600">
                <AlertTriangle className="h-4 w-4" />
                <span>No transitions found. Connect your steps to see the flow.</span>
              </div>
            </Panel>
          )}
        </ReactFlow>
      </div>
    </>
  );
}
