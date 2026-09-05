/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Background,
  type Connection,
  ConnectionLineType,
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
import {
  Clock,
  ExternalLink,
  GitBranch,
  Hourglass,
  Lightbulb,
  Link,
  LogOut,
  Mail,
  Maximize2,
  Minimize2,
  Plus,
  Settings,
  Timer,
  Trash2,
  UserCog,
  Webhook,
} from 'lucide-react';
import {useCallback, useEffect, useMemo, useState} from 'react';
import dagre from 'dagre';
import {WorkflowEdge} from './WorkflowEdge';
import {network} from '../lib/network';
import {toast} from 'sonner';
import {Button, Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle} from '@plunk/ui';
import {WorkflowSchemas} from '@plunk/shared';

interface WorkflowBuilderProps {
  workflowId: string;
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
  onUpdate: () => void;
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
  TRIGGER: '#9333ea',
  SEND_EMAIL: '#2563eb',
  DELAY: '#ea580c',
  WAIT_FOR_EVENT: '#ca8a04',
  CONDITION: '#9333ea',
  EXIT: '#dc2626',
  WEBHOOK: '#16a34a',
  UPDATE_CONTACT: '#4f46e5',
};

const STEP_TYPE_BG = {
  TRIGGER: '#f3e8ff',
  SEND_EMAIL: '#dbeafe',
  DELAY: '#ffedd5',
  WAIT_FOR_EVENT: '#fef3c7',
  CONDITION: '#f3e8ff',
  EXIT: '#fee2e2',
  WEBHOOK: '#dcfce7',
  UPDATE_CONTACT: '#e0e7ff',
};

// Multi-branch condition helpers
function getExpectedBranches(config: any): string[] {
  if (config?.mode === 'multi') {
    return [...(config.branches || []).map((b: any) => b.id), 'default'];
  }
  return ['yes', 'no'];
}

/** Reads the branch id off a transition's condition, if it carries one. */
function getTransitionBranch(condition: unknown): string | undefined {
  if (condition && typeof condition === 'object' && 'branch' in condition) {
    return String((condition as {branch: unknown}).branch);
  }
  return undefined;
}

/**
 * Branch ids a condition step should expose a handle for: the branches its config
 * declares, plus any branch that is already wired up. The two can drift apart if
 * the condition was reconfigured after connections were made, and dropping a
 * wired branch here would leave its edge pointing at a handle that doesn't exist.
 */
function getBranchHandles(config: any, transitions: Array<{condition: unknown}> = []): string[] {
  const expected = getExpectedBranches(config);
  const wired = transitions.map(t => getTransitionBranch(t.condition)).filter((b): b is string => Boolean(b));

  return [...expected, ...wired.filter(b => !expected.includes(b))];
}

function getBranchLabel(config: any, branchId: string): string {
  if (config?.mode === 'multi') {
    if (branchId === 'default') return 'Default';
    const branch = config.branches?.find((b: any) => b.id === branchId);
    return branch?.name || branchId;
  }
  return branchId === 'yes' ? 'Yes' : 'No';
}

const BRANCH_COLORS = ['#16a34a', '#dc2626', '#2563eb', '#d97706', '#7c3aed', '#0891b2', '#be185d', '#059669'];

function getBranchColor(config: any, branchId: string): string {
  if (config?.mode === 'multi') {
    if (branchId === 'default') return '#64748b';
    const idx = config.branches?.findIndex((b: any) => b.id === branchId) ?? 0;
    return BRANCH_COLORS[idx % BRANCH_COLORS.length]!;
  }
  return branchId === 'yes' ? '#16a34a' : '#dc2626';
}

type WaitOutcome = 'EVENT' | 'TIMEOUT';
const WAIT_OUTCOMES: WaitOutcome[] = ['EVENT', 'TIMEOUT'];

function waitHasTimeout(config: any): boolean {
  return typeof config?.timeout === 'number' && config.timeout > 0;
}

function getWaitOutcomeHandles(config: any, transitions: Array<{waitOutcome: WaitOutcome | null}> = []): WaitOutcome[] {
  const expected = waitHasTimeout(config) ? WAIT_OUTCOMES : WAIT_OUTCOMES.slice(0, 1);
  const wired = transitions.map(t => t.waitOutcome).filter((outcome): outcome is WaitOutcome => Boolean(outcome));

  return [...expected, ...wired.filter(outcome => !expected.includes(outcome))];
}

function getWaitOutcomeLabel(outcome: WaitOutcome): string {
  return outcome === 'EVENT' ? 'Event received' : 'Timed out';
}

function getWaitOutcomeColor(outcome: WaitOutcome): string {
  return outcome === 'EVENT' ? '#16a34a' : '#d97706';
}

function getRoutePriority(stepType: string | undefined, config: any, outcome?: string | null): number {
  if (!outcome) return 0;

  const routes =
    stepType === 'WAIT_FOR_EVENT' ? WAIT_OUTCOMES : stepType === 'CONDITION' ? getExpectedBranches(config) : [];
  const index = routes.findIndex(route => route === outcome);
  return index >= 0 ? index : 0;
}

// Dagre layout function
function getLayoutedElements(nodes: Node[], edges: Edge[]) {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  const nodeWidth = 280;
  const nodeHeight = 120;

  dagreGraph.setGraph({
    rankdir: 'TB',
    nodesep: 100,
    ranksep: 150,
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

  // Center "Add Step" nodes directly below their parent nodes
  // For condition nodes with multiple branches, let dagre handle horizontal spread
  const adjustedNodes = layoutedNodes.map(node => {
    if (node.type === 'addStep') {
      // Find the parent node (the source of the edge connecting to this add node)
      const parentEdge = edges.find(edge => edge.target === node.id);
      if (parentEdge) {
        const parentNode = layoutedNodes.find(n => n.id === parentEdge.source);
        if (parentNode) {
          // Check how many add-step siblings share this parent
          const siblingAddNodes = edges.filter(
            e => e.source === parentEdge.source && layoutedNodes.find(n => n.id === e.target && n.type === 'addStep'),
          );

          if (siblingAddNodes.length > 1) {
            // Multiple branches — let dagre's spread positioning stand, only keep y
            return node;
          }

          // Single add node — center below parent
          return {
            ...node,
            position: {
              x: parentNode.position.x + nodeWidth / 2 - 32, // 32 is half of the 64px (w-16) width of the add button
              y: node.position.y,
            },
          };
        }
      }
    }
    return node;
  });

  return {nodes: adjustedNodes, edges};
}

/**
 * Handle ids. Every edge names its handles explicitly so a condition's branch
 * survives the round trip through React Flow, and so connections dragged by hand
 * report which branch they came from.
 */
const TARGET_HANDLE_ID = 'in';
const SOURCE_HANDLE_ID = 'out';

const HANDLE_STYLE = {
  background: '#94a3b8',
  width: 10,
  height: 10,
  border: '2px solid white',
  boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
};

// Add Step Node - appears at the end of flow paths
function AddStepNode({data}: {data: {label: string; onClick?: () => void}}) {
  return (
    <>
      <Handle
        id={TARGET_HANDLE_ID}
        type="target"
        position={Position.Top}
        isConnectable={false}
        style={{
          background: '#94a3b8',
          width: 14,
          height: 14,
          border: '2px solid white',
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
        }}
      />

      <div className="cursor-pointer hover:scale-105 transition-transform" onClick={data.onClick}>
        <div className="w-16 h-16 rounded-full bg-neutral-100 border-2 border-dashed border-neutral-400 hover:border-neutral-600 hover:bg-white flex items-center justify-center transition-all">
          <Plus className="h-8 w-8 text-neutral-500 hover:text-neutral-700 transition-colors" />
        </div>
        {data.label && <div className="text-xs text-neutral-500 text-center mt-2 font-medium">{data.label}</div>}
      </div>
    </>
  );
}

// Custom node component with action buttons
function CustomNode({
  data,
}: {
  data: {
    label: string;
    type: string;
    stepId?: string;
    icon?: any;
    color?: string;
    bgColor?: string;
    onEdit?: () => void;
    onDelete?: () => void;
    template?: {id: string; name: string};
    config?: any;
    /**
     * One entry per outgoing slot. Conditions and event waits get named handles
     * so a dragged connection carries its route; linear steps get one unnamed
     * slot. Empty for EXIT, which ends the path.
     */
    sourceHandles?: {id: string; color: string; connectable: boolean}[];
  };
}) {
  const Icon = data.icon;
  const color = data.color;
  const bgColor = data.bgColor;
  const [showActions, setShowActions] = useState(false);

  const sourceHandles = data.sourceHandles ?? [];

  return (
    <>
      <Handle id={TARGET_HANDLE_ID} type="target" position={Position.Top} style={HANDLE_STYLE} />

      <div
        className="px-5 py-4 rounded-xl border-2 bg-white shadow-sm hover:shadow-md transition-all relative group"
        style={{
          borderColor: color,
          minWidth: '280px',
          maxWidth: '280px',
        }}
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => setShowActions(false)}
      >
        {/* Action buttons - shown on hover */}
        {showActions && data.type === 'TRIGGER' && (
          <div className="absolute -top-3 -right-3 flex gap-1.5 z-10">
            <Button
              onClick={e => {
                e.stopPropagation();
                data.onEdit?.();
              }}
              variant="outline"
              size="icon"
              className="h-7 w-7"
              title="Edit trigger settings"
            >
              <Settings className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
        {showActions && data.type !== 'TRIGGER' && (
          <div className="absolute -top-3 -right-3 flex gap-1.5 z-10">
            <Button
              onClick={e => {
                e.stopPropagation();
                data.onEdit?.();
              }}
              variant="outline"
              size="icon"
              className="h-7 w-7"
              title="Edit step"
            >
              <Settings className="h-3.5 w-3.5" />
            </Button>
            <Button
              onClick={e => {
                e.stopPropagation();
                data.onDelete?.();
              }}
              variant="outline"
              size="icon"
              className="h-7 w-7 hover:bg-red-50 hover:border-red-400"
              title="Delete step"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}

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
            <a
              href={`/templates/${data.template.id}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              onMouseDown={e => e.stopPropagation()}
              className="nodrag flex items-center gap-2 text-xs text-neutral-600 hover:text-blue-600 hover:bg-blue-50 -mx-2 px-2 py-1 rounded transition-colors group/template"
              title="Open template in a new tab"
            >
              <Mail className="h-3 w-3 shrink-0" />
              <span className="truncate flex-1">{data.template.name}</span>
              <ExternalLink className="h-3 w-3 shrink-0 opacity-0 group-hover/template:opacity-100 transition-opacity" />
            </a>
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
        {data.type === 'CONDITION' && data.config && (
          <div className="mt-3 pt-3 border-t border-neutral-100">
            <div className="text-xs text-neutral-600">
              <div className="flex items-center gap-1 mb-1">
                <GitBranch className="h-3 w-3" />
                <span className="font-mono text-[10px] truncate">
                  {/* Handle both legacy format {field, type} and new format (string) */}
                  {typeof data.config.field === 'object' && data.config.field !== null && 'field' in data.config.field
                    ? String(data.config.field.field)
                    : String(data.config.field)}
                </span>
              </div>
              {data.config.mode === 'multi' ? (
                <div className="text-[10px] text-neutral-500 ml-4">
                  {data.config.branches?.length || 0} branch{(data.config.branches?.length || 0) !== 1 ? 'es' : ''} +
                  default
                </div>
              ) : (
                <div className="text-[10px] text-neutral-500 ml-4">
                  {data.config.operator} &quot;{String(data.config.value)}&quot;
                </div>
              )}
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
        {data.type === 'TRIGGER' && data.config?.eventName && (
          <div className="mt-3 pt-3 border-t border-neutral-100">
            <div className="flex items-center gap-2 text-xs text-neutral-600">
              <Lightbulb className="h-3 w-3" />
              <span className="truncate">{data.config.eventName}</span>
            </div>
          </div>
        )}
        {data.type === 'WEBHOOK' && data.config?.url && (
          <div className="mt-3 pt-3 border-t border-neutral-100">
            <div className="flex items-center gap-2 text-xs text-neutral-600">
              <Link className="h-3 w-3" />
              <span className="truncate text-[10px]">
                {data.config.method || 'POST'} {data.config.url}
              </span>
            </div>
          </div>
        )}
      </div>

      {sourceHandles.map((handle, index) => (
        <Handle
          key={handle.id}
          id={handle.id}
          type="source"
          position={Position.Bottom}
          isConnectable={handle.connectable}
          title={handle.connectable ? 'Drag to connect to another step' : undefined}
          style={{
            ...HANDLE_STYLE,
            background: handle.color,
            // Spread multiple branch handles evenly across the bottom edge
            left: `${((index + 1) / (sourceHandles.length + 1)) * 100}%`,
            cursor: handle.connectable ? 'crosshair' : 'default',
          }}
        />
      ))}
    </>
  );
}

const nodeTypes = {
  custom: CustomNode,
  addStep: AddStepNode,
};

const edgeTypes = {
  workflow: WorkflowEdge,
};

/**
 * Where a newly picked step should land.
 * - `append`: after an existing step, optionally on a named branch or wait outcome
 * - `insert`: in the middle of an existing transition, splitting it in two
 */
type PickerContext = {mode: 'append'; fromStepId: string; outcome?: string} | {mode: 'insert'; transitionId: string};

// Step type options for adding new steps
const STEP_TYPE_OPTIONS = [
  {value: 'SEND_EMAIL', label: 'Send email', icon: Mail, color: STEP_TYPE_COLORS.SEND_EMAIL},
  {value: 'DELAY', label: 'Delay', icon: Clock, color: STEP_TYPE_COLORS.DELAY},
  {value: 'WAIT_FOR_EVENT', label: 'Wait for event', icon: Clock, color: STEP_TYPE_COLORS.WAIT_FOR_EVENT},
  {value: 'CONDITION', label: 'Condition', icon: GitBranch, color: STEP_TYPE_COLORS.CONDITION},
  {value: 'WEBHOOK', label: 'Webhook', icon: Webhook, color: STEP_TYPE_COLORS.WEBHOOK},
  {value: 'UPDATE_CONTACT', label: 'Update contact', icon: UserCog, color: STEP_TYPE_COLORS.UPDATE_CONTACT},
  {value: 'EXIT', label: 'Exit', icon: LogOut, color: STEP_TYPE_COLORS.EXIT},
];

export function WorkflowBuilder({workflowId, steps, onUpdate}: WorkflowBuilderProps) {
  const [pickerContext, setPickerContext] = useState<PickerContext | null>(null);
  const [transitionToDisconnect, setTransitionToDisconnect] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [stepToDelete, setStepToDelete] = useState<string | null>(null);
  const [deleteMode, setDeleteMode] = useState<'splice' | 'cascade'>('splice');
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (!isExpanded) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsExpanded(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isExpanded]);

  // Define handlers before they are used in useMemo
  const handleEditStep = useCallback(
    (stepId: string) => {
      // Check if this is a TRIGGER step
      const step = steps.find(s => s.id === stepId);

      if (step?.type === 'TRIGGER') {
        // For TRIGGER steps, open workflow settings instead
        const event = new CustomEvent('workflow-open-settings');
        window.dispatchEvent(event);
      } else {
        // For other steps, open step editor
        const event = new CustomEvent('workflow-edit-step', {detail: {stepId}});
        window.dispatchEvent(event);
      }
    },
    [steps],
  );

  const handleDeleteStepClick = useCallback(
    (stepId: string) => {
      const step = steps.find(s => s.id === stepId);
      const isBranching = step?.type === 'CONDITION' || step?.type === 'WAIT_FOR_EVENT';
      const hasChildren = (step?.outgoingTransitions?.length ?? 0) > 0;
      setDeleteMode(isBranching || !hasChildren ? 'cascade' : 'splice');
      setStepToDelete(stepId);
      setShowDeleteDialog(true);
    },
    [steps],
  );

  // Convert workflow steps to React Flow nodes

  const rawNodes: Node[] = useMemo(() => {
    if (steps.length === 0) return [];

    const nodes: Node[] = steps.map(step => {
      const Icon = STEP_TYPE_ICONS[step.type as keyof typeof STEP_TYPE_ICONS] || GitBranch;
      const color = STEP_TYPE_COLORS[step.type as keyof typeof STEP_TYPE_COLORS] || '#6b7280';
      const bgColor = STEP_TYPE_BG[step.type as keyof typeof STEP_TYPE_BG] || '#f3f4f6';

      // EXIT ends the path. Conditions and event waits expose named routes;
      // every other step has one unnamed next step.
      const outgoing = step.outgoingTransitions ?? [];
      const sourceHandles =
        step.type === 'EXIT'
          ? []
          : step.type === 'CONDITION'
            ? getBranchHandles(step.config, outgoing).map(branchId => ({
                id: branchId,
                color: getBranchColor(step.config, branchId),
                connectable: !outgoing.some(t => getTransitionBranch(t.condition) === branchId),
              }))
            : step.type === 'WAIT_FOR_EVENT'
              ? getWaitOutcomeHandles(step.config, outgoing).map(outcome => ({
                  id: outcome,
                  color: getWaitOutcomeColor(outcome),
                  connectable: !outgoing.some(t => t.waitOutcome === outcome),
                }))
              : [{id: SOURCE_HANDLE_ID, color: '#94a3b8', connectable: outgoing.length === 0}];

      return {
        id: step.id,
        type: 'custom',
        position: step.position ? (step.position as {x: number; y: number}) : {x: 0, y: 0},
        data: {
          label: step.name,
          type: step.type,
          icon: Icon,
          color,
          bgColor,
          sourceHandles,
          template: step.template,
          config: step.config,
          onEdit: () => handleEditStep(step.id),
          onDelete: () => handleDeleteStepClick(step.id),
        },
      };
    });

    // Add "Add Step" nodes at the end of each flow path
    steps.forEach(step => {
      if (step.type === 'EXIT') return; // Exit steps can't have next steps

      if (step.type === 'CONDITION') {
        const expectedBranches = getExpectedBranches(step.config);

        expectedBranches.forEach(branchId => {
          const hasBranch = step.outgoingTransitions?.some(t => {
            const condition = t.condition;
            return condition && typeof condition === 'object' && 'branch' in condition && condition.branch === branchId;
          });

          if (!hasBranch) {
            nodes.push({
              id: `${step.id}-add-${branchId}`,
              type: 'addStep',
              position: {x: 0, y: 0},
              draggable: false,
              data: {
                label: getBranchLabel(step.config, branchId),
                onClick: () => setPickerContext({mode: 'append', fromStepId: step.id, outcome: branchId}),
              },
            });
          }
        });
      } else if (step.type === 'WAIT_FOR_EVENT') {
        getWaitOutcomeHandles(step.config, step.outgoingTransitions ?? []).forEach(outcome => {
          if (!step.outgoingTransitions?.some(t => t.waitOutcome === outcome)) {
            nodes.push({
              id: `${step.id}-add-${outcome}`,
              type: 'addStep',
              position: {x: 0, y: 0},
              draggable: false,
              data: {
                label: getWaitOutcomeLabel(outcome),
                onClick: () => setPickerContext({mode: 'append', fromStepId: step.id, outcome}),
              },
            });
          }
        });
      } else {
        // For linear steps, add + node if no outgoing transitions.
        if (!step.outgoingTransitions || step.outgoingTransitions.length === 0) {
          nodes.push({
            id: `${step.id}-add`,
            type: 'addStep',
            position: {x: 0, y: 0},
            draggable: false,
            data: {
              label: '',
              onClick: () => setPickerContext({mode: 'append', fromStepId: step.id}),
            },
          });
        }
      }
    });

    return nodes;
  }, [steps, handleEditStep, handleDeleteStepClick]);

  // Convert transitions to React Flow edges
  const rawEdges: Edge[] = useMemo(() => {
    const edges: Edge[] = [];

    steps.forEach(step => {
      if (step.outgoingTransitions && step.outgoingTransitions.length > 0) {
        step.outgoingTransitions.forEach(transition => {
          const condition = transition.condition;
          const conditionBranch =
            condition && typeof condition === 'object' && 'branch' in condition
              ? (condition.branch as string)
              : undefined;
          const waitOutcome = step.type === 'WAIT_FOR_EVENT' ? transition.waitOutcome : undefined;
          const route = conditionBranch ?? waitOutcome ?? undefined;
          const routeColor = conditionBranch
            ? getBranchColor(step.config, conditionBranch)
            : waitOutcome
              ? getWaitOutcomeColor(waitOutcome)
              : '#64748b';
          const routeLabel = conditionBranch
            ? getBranchLabel(step.config, conditionBranch)
            : waitOutcome
              ? getWaitOutcomeLabel(waitOutcome)
              : undefined;

          edges.push({
            id: transition.id,
            source: step.id,
            target: transition.toStepId,
            sourceHandle: route ?? SOURCE_HANDLE_ID,
            targetHandle: TARGET_HANDLE_ID,
            type: 'workflow',
            animated: false,
            data: {
              branchLabel: routeLabel,
              branchColor: routeColor,
              onInsert: () => setPickerContext({mode: 'insert', transitionId: transition.id}),
              onDisconnect: () => setTransitionToDisconnect(transition.id),
            },
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

      // Add edges from steps to their "Add Step" nodes
      if (step.type === 'EXIT') return;

      if (step.type === 'CONDITION') {
        const expectedBranches = getExpectedBranches(step.config);

        expectedBranches.forEach(branchId => {
          const hasBranch = step.outgoingTransitions?.some(
            t =>
              t.condition &&
              typeof t.condition === 'object' &&
              'branch' in t.condition &&
              t.condition.branch === branchId,
          );

          if (!hasBranch) {
            const color = getBranchColor(step.config, branchId);
            const label = getBranchLabel(step.config, branchId);

            edges.push({
              id: `${step.id}-add-${branchId}-edge`,
              source: step.id,
              target: `${step.id}-add-${branchId}`,
              sourceHandle: branchId,
              targetHandle: TARGET_HANDLE_ID,
              type: 'smoothstep',
              animated: false,
              label,
              labelStyle: {fill: color, fontWeight: 600, fontSize: 12},
              labelBgStyle: {fill: '#fff', fillOpacity: 0.95},
              labelBgPadding: [8, 4] as [number, number],
              labelBgBorderRadius: 4,
              style: {stroke: '#94a3b8', strokeWidth: 2, strokeDasharray: '5,5'},
              markerEnd: {type: MarkerType.ArrowClosed, color: '#94a3b8', width: 20, height: 20},
            });
          }
        });
      } else if (step.type === 'WAIT_FOR_EVENT') {
        getWaitOutcomeHandles(step.config, step.outgoingTransitions ?? []).forEach(outcome => {
          if (!step.outgoingTransitions?.some(t => t.waitOutcome === outcome)) {
            const color = getWaitOutcomeColor(outcome);
            const label = getWaitOutcomeLabel(outcome);

            edges.push({
              id: `${step.id}-add-${outcome}-edge`,
              source: step.id,
              target: `${step.id}-add-${outcome}`,
              sourceHandle: outcome,
              targetHandle: TARGET_HANDLE_ID,
              type: 'smoothstep',
              animated: false,
              label,
              labelStyle: {fill: color, fontWeight: 600, fontSize: 12},
              labelBgStyle: {fill: '#fff', fillOpacity: 0.95},
              labelBgPadding: [8, 4] as [number, number],
              labelBgBorderRadius: 4,
              style: {stroke: '#94a3b8', strokeWidth: 2, strokeDasharray: '5,5'},
              markerEnd: {type: MarkerType.ArrowClosed, color: '#94a3b8', width: 20, height: 20},
            });
          }
        });
      } else {
        if (!step.outgoingTransitions || step.outgoingTransitions.length === 0) {
          edges.push({
            id: `${step.id}-add-edge`,
            source: step.id,
            target: `${step.id}-add`,
            sourceHandle: SOURCE_HANDLE_ID,
            targetHandle: TARGET_HANDLE_ID,
            type: 'smoothstep',
            animated: false,
            style: {stroke: '#94a3b8', strokeWidth: 2, strokeDasharray: '5,5'},
            markerEnd: {type: MarkerType.ArrowClosed, color: '#94a3b8', width: 20, height: 20},
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

  // Update nodes/edges when layout changes
  useEffect(() => {
    setNodes(layoutedNodes);
  }, [layoutedNodes, setNodes]);

  useEffect(() => {
    setEdges(layoutedEdges);
  }, [layoutedEdges, setEdges]);

  // Handle creating a new step from the + node

  const handleCreateStep = useCallback(
    async (stepType: string) => {
      if (!pickerContext) return;

      // Inserting into an existing transition is a single atomic call — the API
      // re-points the transition at the new step and wires it on to the original
      // target, so the graph is never left half-connected.
      if (pickerContext.mode === 'insert') {
        try {
          const newStep = await network.fetch<WorkflowStep, typeof WorkflowSchemas.insertStep>(
            'POST',
            `/workflows/${workflowId}/transitions/${pickerContext.transitionId}/insert-step`,
            {
              type: stepType as WorkflowStep['type'],
              name: `New ${stepType.toLowerCase().replace('_', ' ')}`,
              position: {x: 0, y: 0}, // Will be auto-positioned by dagre layout
              config: {},
            },
          );

          toast.success('Step inserted');
          setPickerContext(null);
          onUpdate();

          setTimeout(() => {
            const event = new CustomEvent('workflow-edit-step', {detail: {stepId: newStep.id}});
            window.dispatchEvent(event);
          }, 100);
        } catch (error) {
          toast.error(error instanceof Error ? error.message : 'Couldn’t insert the step. Try again.');
        }
        return;
      }

      const addStepContext = pickerContext;

      try {
        // Validate that this named route doesn't already have a transition.
        const fromStep = steps.find(s => s.id === addStepContext.fromStepId);
        if (!fromStep) {
          toast.error('Parent step not found');
          return;
        }

        if (fromStep.type === 'CONDITION' && addStepContext.outcome) {
          const existingBranchTransition = fromStep.outgoingTransitions?.find(t => {
            const condition = t.condition;
            return (
              condition &&
              typeof condition === 'object' &&
              'branch' in condition &&
              condition.branch === addStepContext.outcome
            );
          });
          if (existingBranchTransition) {
            toast.error(`The ${addStepContext.outcome} branch already has a connection`);
            return;
          }
        }
        if (
          fromStep.type === 'WAIT_FOR_EVENT' &&
          addStepContext.outcome &&
          fromStep.outgoingTransitions?.some(t => t.waitOutcome === addStepContext.outcome)
        ) {
          toast.error(`The ${addStepContext.outcome} route already has a connection`);
          return;
        }

        // Create the new step; the named route is connected explicitly below.
        const newStep = await network.fetch<WorkflowStep, typeof WorkflowSchemas.addStep>(
          'POST',
          `/workflows/${workflowId}/steps`,
          {
            type: stepType as WorkflowStep['type'],
            name: `New ${stepType.toLowerCase().replace('_', ' ')}`,
            position: {x: 0, y: 0}, // Will be auto-positioned by dagre layout
            config: {},
            autoConnect: false,
          },
        );

        const newStepId = newStep.id;

        const condition =
          fromStep.type === 'CONDITION' && addStepContext.outcome ? {branch: addStepContext.outcome} : null;
        const waitOutcome =
          fromStep.type === 'WAIT_FOR_EVENT' ? (addStepContext.outcome as WaitOutcome | undefined) : undefined;
        const priority = getRoutePriority(fromStep.type, fromStep.config, addStepContext.outcome);

        await network.fetch<unknown, typeof WorkflowSchemas.createTransition>(
          'POST',
          `/workflows/${workflowId}/transitions`,
          {
            fromStepId: addStepContext.fromStepId,
            toStepId: newStepId,
            condition,
            waitOutcome,
            priority,
          },
        );

        toast.success('Step added');
        setPickerContext(null);
        onUpdate();

        // Trigger edit dialog for the new step after a short delay
        setTimeout(() => {
          const event = new CustomEvent('workflow-edit-step', {detail: {stepId: newStepId}});
          window.dispatchEvent(event);
        }, 100);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Couldn’t add the step. Try again.');
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pickerContext, workflowId, onUpdate],
  );

  // Get all steps that will be affected by deleting a step (the step itself + all downstream steps)
  const getAffectedSteps = useCallback(
    (stepId: string): typeof steps => {
      const affected = new Set<string>();
      const queue = [stepId];

      // BFS to find all downstream steps
      while (queue.length > 0) {
        const currentId = queue.shift()!;
        if (affected.has(currentId)) continue;

        affected.add(currentId);

        const currentStep = steps.find(s => s.id === currentId);
        if (currentStep?.outgoingTransitions) {
          for (const transition of currentStep.outgoingTransitions) {
            if (!affected.has(transition.toStepId)) {
              queue.push(transition.toStepId);
            }
          }
        }
      }

      return steps.filter(s => affected.has(s.id));
    },
    [steps],
  );

  const handleDeleteStep = async () => {
    if (!stepToDelete) return;

    try {
      const url =
        deleteMode === 'splice'
          ? `/workflows/${workflowId}/steps/${stepToDelete}?splice=true`
          : `/workflows/${workflowId}/steps/${stepToDelete}`;

      await network.fetch('DELETE', url);

      if (deleteMode === 'cascade') {
        const affectedSteps = getAffectedSteps(stepToDelete);
        if (affectedSteps.length > 1) {
          toast.success(`Deleted ${affectedSteps.length} steps`);
        } else {
          toast.success('Step deleted');
        }
      } else {
        toast.success('Step removed from flow');
      }

      onUpdate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Couldn’t delete the step. Try again.');
    } finally {
      setStepToDelete(null);
    }
  };

  /** Look up a transition (and the steps on either end of it) by transition id. */
  const findTransition = useCallback(
    (transitionId: string) => {
      for (const step of steps) {
        const transition = step.outgoingTransitions?.find(t => t.id === transitionId);
        if (transition) {
          return {transition, fromStep: step, toStep: steps.find(s => s.id === transition.toStepId)};
        }
      }
      return null;
    },
    [steps],
  );

  const handleDisconnect = async () => {
    if (!transitionToDisconnect) return;

    try {
      await network.fetch('DELETE', `/workflows/${workflowId}/transitions/${transitionToDisconnect}`);
      toast.success('Steps disconnected');
      onUpdate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Couldn’t disconnect those steps. Try again.');
    } finally {
      setTransitionToDisconnect(null);
    }
  };

  /**
   * Steps that can be wired up from `fromStepId`.
   *
   * Only steps that are currently unreachable (no incoming transition) qualify —
   * these are the ones left dangling by a disconnect, and offering them here is
   * what makes disconnecting reversible without rebuilding the branch. Anything
   * downstream of the source is excluded so we can't create a cycle.
   */
  const getReconnectCandidates = useCallback(
    (fromStepId: string) => {
      const downstream = new Set(getAffectedSteps(fromStepId).map(s => s.id));
      return steps.filter(
        s => s.type !== 'TRIGGER' && !downstream.has(s.id) && (s.incomingTransitions?.length ?? 0) === 0,
      );
    },
    [steps, getAffectedSteps],
  );

  /**
   * Gates connections while they are being dragged, so an invalid drop is refused
   * by React Flow rather than bouncing off the API. Mirrors the server-side rules
   * in `WorkflowService.createTransition`.
   */
  const isValidConnection = useCallback(
    (connection: Connection | Edge) => {
      const {source, target, sourceHandle} = connection;
      if (!source || !target || source === target) return false;

      const fromStep = steps.find(s => s.id === source);
      const toStep = steps.find(s => s.id === target);

      // Either end being unknown means it's one of the "+" placeholder nodes
      if (!fromStep || !toStep) return false;
      if (fromStep.type === 'EXIT') return false;

      // The slot being dragged from has to be free
      if (fromStep.type === 'CONDITION') {
        if (fromStep.outgoingTransitions?.some(t => getTransitionBranch(t.condition) === sourceHandle)) return false;
      } else if (fromStep.type === 'WAIT_FOR_EVENT') {
        if (fromStep.outgoingTransitions?.some(t => t.waitOutcome === sourceHandle)) return false;
      } else if ((fromStep.outgoingTransitions?.length ?? 0) > 0) {
        return false;
      }

      // Connecting to something upstream would close a loop
      return !getAffectedSteps(target).some(s => s.id === source);
    },
    [steps, getAffectedSteps],
  );

  const handleConnect = useCallback(
    async (connection: Connection) => {
      const {source, target, sourceHandle} = connection;
      if (!source || !target || !isValidConnection(connection)) return;

      const fromStep = steps.find(s => s.id === source);
      const branch = fromStep?.type === 'CONDITION' ? sourceHandle : null;
      const waitOutcome = fromStep?.type === 'WAIT_FOR_EVENT' ? (sourceHandle as WaitOutcome | null) : null;
      const priority = getRoutePriority(fromStep?.type, fromStep?.config, branch ?? waitOutcome);

      try {
        await network.fetch<unknown, typeof WorkflowSchemas.createTransition>(
          'POST',
          `/workflows/${workflowId}/transitions`,
          {
            fromStepId: source,
            toStepId: target,
            condition: branch ? {branch} : null,
            waitOutcome: waitOutcome ?? undefined,
            priority,
          },
        );

        toast.success('Steps connected');
        onUpdate();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Couldn’t connect those steps. Try again.');
      }
    },
    [isValidConnection, steps, workflowId, onUpdate],
  );

  const handleConnectToExisting = useCallback(
    async (toStepId: string) => {
      if (pickerContext?.mode !== 'append') return;

      try {
        const fromStep = steps.find(s => s.id === pickerContext.fromStepId);
        const priority = getRoutePriority(fromStep?.type, fromStep?.config, pickerContext.outcome);
        const condition =
          fromStep?.type === 'CONDITION' && pickerContext.outcome ? {branch: pickerContext.outcome} : null;
        const waitOutcome =
          fromStep?.type === 'WAIT_FOR_EVENT' ? (pickerContext.outcome as WaitOutcome | undefined) : undefined;

        await network.fetch<unknown, typeof WorkflowSchemas.createTransition>(
          'POST',
          `/workflows/${workflowId}/transitions`,
          {
            fromStepId: pickerContext.fromStepId,
            toStepId,
            condition,
            waitOutcome,
            priority,
          },
        );

        toast.success('Steps connected');
        setPickerContext(null);
        onUpdate();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Couldn’t connect those steps. Try again.');
      }
    },
    [pickerContext, steps, workflowId, onUpdate],
  );

  if (steps.length === 0) {
    return (
      <div className="bg-neutral-50 border-2 border-dashed border-neutral-300 rounded-lg p-12 text-center">
        <GitBranch className="h-16 w-16 text-neutral-400 mx-auto mb-4" />
        <p className="text-neutral-600 font-medium">No workflow steps yet</p>
        <p className="text-sm text-neutral-500 mt-2">Add your first step to get started</p>
      </div>
    );
  }

  return (
    <>
      {isExpanded && <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setIsExpanded(false)} />}
      <div
        className={
          isExpanded
            ? 'fixed inset-[5%] z-50 bg-neutral-50 rounded-xl border border-neutral-200 shadow-2xl'
            : 'w-full h-[800px] bg-neutral-50 rounded-lg border border-neutral-200 shadow-inner relative'
        }
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          fitViewOptions={{
            padding: 0.3,
            minZoom: 0.5,
            maxZoom: 1.2,
          }}
          minZoom={0.1}
          maxZoom={2}
          nodesDraggable={false}
          nodesConnectable={true}
          onConnect={handleConnect}
          isValidConnection={isValidConnection}
          connectionLineType={ConnectionLineType.SmoothStep}
          elementsSelectable={true}
          defaultEdgeOptions={{
            type: 'smoothstep',
          }}
          deleteKeyCode={null}
          proOptions={{hideAttribution: true}}
        >
          <Background color="#e5e7eb" gap={16} size={1} />
          <Controls showInteractive={false} className="bg-white border border-neutral-200 rounded-lg shadow-md" />
          <MiniMap
            nodeColor={node => {
              const step = steps.find(s => s.id === node.id);
              return step ? STEP_TYPE_COLORS[step.type as keyof typeof STEP_TYPE_COLORS] : '#6b7280';
            }}
            className="bg-white border border-neutral-200 rounded-lg shadow-md"
            maskColor="rgba(0, 0, 0, 0.05)"
          />
          <Panel position="top-left" className="bg-white px-4 py-2.5 rounded-lg shadow-md border border-neutral-200">
            <div className="flex items-center gap-3">
              <GitBranch className="h-4 w-4 text-neutral-700" />
              <div className="text-sm">
                <span className="font-semibold text-neutral-900">{steps.length}</span>
                <span className="text-neutral-600"> step{steps.length !== 1 ? 's' : ''}</span>
                <span className="text-neutral-400 mx-2">·</span>
                <span className="font-semibold text-neutral-900">{rawEdges.length}</span>
                <span className="text-neutral-600"> connection{rawEdges.length !== 1 ? 's' : ''}</span>
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
          <Panel
            position="bottom-center"
            className="bg-white border border-neutral-200 px-4 py-2.5 rounded-lg shadow-sm"
          >
            <div className="flex items-center gap-2 text-sm text-neutral-600">
              <Lightbulb className="h-4 w-4" />
              <span>
                Click a + to add a step, hover a connection to insert or disconnect, or drag between the dots to connect
                two steps.
              </span>
            </div>
          </Panel>
        </ReactFlow>
      </div>

      {/* Step type picker dialog — used both to append after a step and to insert into a transition */}
      <Dialog open={!!pickerContext} onOpenChange={open => !open && setPickerContext(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{pickerContext?.mode === 'insert' ? 'Insert Step' : 'Add Step'}</DialogTitle>
          </DialogHeader>
          {pickerContext?.mode === 'insert' && (
            <p className="text-sm text-neutral-600">
              The new step is placed between these two steps. The connection below it is kept.
            </p>
          )}
          <div className="grid grid-cols-2 gap-3 py-4">
            {STEP_TYPE_OPTIONS
              // An exit step ends the path, so it can never sit between two steps.
              .filter(option => !(pickerContext?.mode === 'insert' && option.value === 'EXIT'))
              .map(option => {
                const Icon = option.icon;
                return (
                  <button
                    key={option.value}
                    onClick={() => handleCreateStep(option.value)}
                    className="flex flex-col items-center gap-2 p-4 rounded-lg border border-neutral-200 hover:border-neutral-400 hover:bg-neutral-50 transition-all group"
                  >
                    <div
                      className="w-12 h-12 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110"
                      style={{
                        backgroundColor: `${option.color}15`,
                      }}
                    >
                      <Icon className="h-6 w-6" style={{color: option.color}} />
                    </div>
                    <span className="text-sm font-medium text-neutral-900">{option.label}</span>
                  </button>
                );
              })}
          </div>

          {/* Reattaching a disconnected step, so a disconnect isn't a one-way door */}
          {pickerContext?.mode === 'append' &&
            (() => {
              const candidates = getReconnectCandidates(pickerContext.fromStepId);
              if (candidates.length === 0) return null;

              return (
                <div className="border-t border-neutral-200 pt-4">
                  <p className="text-xs font-medium text-neutral-500 mb-2">Or connect to a disconnected step</p>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {candidates.map(candidate => {
                      const Icon = STEP_TYPE_ICONS[candidate.type as keyof typeof STEP_TYPE_ICONS] ?? GitBranch;
                      const color = STEP_TYPE_COLORS[candidate.type as keyof typeof STEP_TYPE_COLORS] ?? '#6b7280';
                      return (
                        <button
                          key={candidate.id}
                          onClick={() => handleConnectToExisting(candidate.id)}
                          className="w-full flex items-center gap-2.5 p-2.5 rounded-lg border border-neutral-200 hover:border-neutral-400 hover:bg-neutral-50 transition-all text-left"
                        >
                          <Icon className="h-4 w-4 shrink-0" style={{color}} />
                          <span className="text-sm text-neutral-900 truncate flex-1">{candidate.name}</span>
                          <span className="text-xs text-neutral-500 shrink-0">
                            {STEP_TYPE_LABELS[candidate.type] ?? candidate.type}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

          <DialogFooter>
            <Button variant="outline" onClick={() => setPickerContext(null)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Disconnect confirmation */}
      {transitionToDisconnect &&
        (() => {
          const found = findTransition(transitionToDisconnect);
          if (!found) return null;

          // Everything below the target loses its path from the trigger. It stays
          // on the canvas and can be reattached from any + button.
          const orphaned = found.toStep ? getAffectedSteps(found.toStep.id) : [];

          return (
            <Dialog open onOpenChange={open => !open && setTransitionToDisconnect(null)}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Disconnect steps</DialogTitle>
                </DialogHeader>
                <div className="space-y-3 py-1">
                  <p className="text-sm text-neutral-600">
                    Remove the connection from &quot;{found.fromStep.name}&quot; to &quot;{found.toStep?.name}&quot;?
                  </p>
                  {orphaned.length > 0 && (
                    <p className="text-sm text-neutral-600">
                      {orphaned.length === 1 ? 'This step' : `These ${orphaned.length} steps`} will no longer be
                      reachable. Nothing is deleted — reconnect{orphaned.length === 1 ? ' it' : ' them'} from any{' '}
                      <span className="font-medium">+</span> button.
                    </p>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setTransitionToDisconnect(null)}>
                    Cancel
                  </Button>
                  <Button onClick={handleDisconnect}>Disconnect</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          );
        })()}

      {stepToDelete &&
        (() => {
          const affectedSteps = getAffectedSteps(stepToDelete);
          const stepToDeleteData = steps.find(s => s.id === stepToDelete);
          const downstreamSteps = affectedSteps.filter(s => s.id !== stepToDelete);
          const isBranching =
            stepToDeleteData?.type === 'CONDITION' || stepToDeleteData?.type === 'WAIT_FOR_EVENT';
          const hasChildren = downstreamSteps.length > 0;
          const canSplice = !isBranching && hasChildren;

          return (
            <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Remove &quot;{stepToDeleteData?.name}&quot;</DialogTitle>
                </DialogHeader>

                {canSplice ? (
                  <div className="space-y-3 py-1">
                    <p className="text-sm text-neutral-600">How would you like to remove this step?</p>
                    <div className="space-y-2">
                      <button
                        onClick={() => setDeleteMode('splice')}
                        className={`w-full text-left p-3 rounded-lg border-2 transition-colors ${
                          deleteMode === 'splice'
                            ? 'border-neutral-900 bg-neutral-50'
                            : 'border-neutral-200 hover:border-neutral-300'
                        }`}
                      >
                        <p className="text-sm font-medium text-neutral-900">Remove from flow</p>
                        <p className="text-xs text-neutral-500 mt-0.5">
                          Delete this step and connect its parent directly to its child. The rest of the workflow is
                          preserved.
                        </p>
                      </button>
                      <button
                        onClick={() => setDeleteMode('cascade')}
                        className={`w-full text-left p-3 rounded-lg border-2 transition-colors ${
                          deleteMode === 'cascade'
                            ? 'border-red-500 bg-red-50'
                            : 'border-neutral-200 hover:border-neutral-300'
                        }`}
                      >
                        <p className="text-sm font-medium text-neutral-900">
                          Delete with {downstreamSteps.length} downstream{' '}
                          {downstreamSteps.length === 1 ? 'step' : 'steps'}
                        </p>
                        <p className="text-xs text-neutral-500 mt-0.5">
                          Permanently removes this step and everything below it. This cannot be undone.
                        </p>
                      </button>
                    </div>
                  </div>
                ) : isBranching && hasChildren ? (
                  <div className="space-y-3 py-1">
                    <p className="text-sm text-neutral-600">
                      Removing this branching step will also delete all {downstreamSteps.length} downstream{' '}
                      {downstreamSteps.length === 1 ? 'step' : 'steps'} across its routes:
                    </p>
                    <ul className="list-disc list-inside text-sm text-neutral-600 max-h-32 overflow-y-auto bg-neutral-50 p-3 rounded border border-neutral-200">
                      {downstreamSteps.map(step => (
                        <li key={step.id}>
                          {step.name} ({STEP_TYPE_LABELS[step.type] ?? step.type})
                        </li>
                      ))}
                    </ul>
                    <p className="text-sm font-medium text-red-600">This action cannot be undone.</p>
                  </div>
                ) : (
                  <p className="text-sm text-neutral-600 py-1">
                    This step is removed from the workflow. This can&apos;t be undone.
                  </p>
                )}

                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                    Cancel
                  </Button>
                  <Button
                    variant={deleteMode === 'cascade' || !canSplice ? 'destructive' : 'default'}
                    onClick={() => {
                      setShowDeleteDialog(false);
                      handleDeleteStep();
                    }}
                  >
                    {canSplice && deleteMode === 'splice'
                      ? 'Remove from flow'
                      : `Delete ${hasChildren ? `${affectedSteps.length} steps` : 'step'}`}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          );
        })()}
    </>
  );
}
