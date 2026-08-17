import {motion, useReducedMotion} from 'framer-motion';
import React from 'react';

import {Surface} from './Surface';

/**
 * The workflow builder, drawn as the canvas it is.
 *
 * Takes a flow rather than hard-coding one, because two places need it and they
 * need different flows. Before that it was hard-coded here and the feature page
 * used `WorkflowChain`, an older vertical-list-with-a-spine built for a light
 * card. Wrapping that light component in this dark surface put near-black step
 * labels on a near-black panel, which is the bug this replaces: not a colour to
 * patch, but a light artifact being asked to live on a dark plane.
 *
 * Geometry derives from the step list, so a flow of any length lays itself out
 * and the connectors always meet the nodes they belong to.
 */

export type StepKind = 'trigger' | 'action' | 'wait' | 'branch';

export interface CanvasStep {
  kind: StepKind;
  /** The step, in one or two words. */
  label: string;
  /** Optional machine value: an event name, a duration. Shown dimmed after the label. */
  value?: string;
}

export interface CanvasBranch {
  /** The answer this arm represents. */
  answer: string;
  label: string;
}

export interface CanvasFlow {
  steps: CanvasStep[];
  /** Two arms out of the final step. Omit for a straight sequence. */
  branches?: [CanvasBranch, CanvasBranch];
}

const W = 520;
const NODE_H = 50;

/**
 * Node width is measured, not guessed.
 *
 * It was a hard-coded 190, which fitted the homepage's flow and overflowed the
 * feature page's by 27px: that trigger carries both a label ("Signs up") and a
 * value ("user.signed-up"), and the value ran out past the right edge of its
 * own node. A fixed width only ever fits the content it was measured against.
 *
 * Both faces here are monospace, so the advance is exactly 0.6em and the width
 * is arithmetic rather than a guess. One width is used for every node in a
 * canvas, because nodes of differing widths read as a ragged column rather than
 * as a flow.
 */
const LABEL_SIZE = 13;
const VALUE_SIZE = 11;
const MONO_ADVANCE = 0.6;
/** Icon column plus the gap before the label, and the padding after it. */
const TEXT_X = 36;
const PAD_RIGHT = 18;
/** Floor keeps short flows from looking cramped; ceiling keeps the two fork
 *  arms from meeting in the middle of a 520-wide canvas. */
const MIN_W = 190;
const MAX_W = 230;

function measure(label: string, value?: string) {
  const text = label.length * MONO_ADVANCE * LABEL_SIZE + (value ? 8 + value.length * MONO_ADVANCE * VALUE_SIZE : 0);
  return TEXT_X + text + PAD_RIGHT;
}
const PITCH = 72;
const TOP = 10;
/** Extra room under the condition so the yes/no labels clear the elbows. */
const FORK_DROP = 86;
const EASE = [0.23, 1, 0.32, 1] as const;

const LEFT_X = 8;

/** A vertical drop, elbowed when the two nodes do not share a centre. */
function edgePath(from: {x: number; y: number}, to: {x: number; y: number}, nodeW: number) {
  const a = {x: from.x + nodeW / 2, y: from.y + NODE_H};
  const b = {x: to.x + nodeW / 2, y: to.y};
  if (Math.abs(a.x - b.x) < 1) return `M ${a.x} ${a.y} V ${b.y}`;

  const midY = a.y + (b.y - a.y) / 2;
  const r = 14;
  const dir = b.x > a.x ? 1 : -1;
  return [
    `M ${a.x} ${a.y}`,
    `V ${midY - r}`,
    `Q ${a.x} ${midY} ${a.x + r * dir} ${midY}`,
    `H ${b.x - r * dir}`,
    `Q ${b.x} ${midY} ${b.x} ${midY + r}`,
    `V ${b.y}`,
  ].join(' ');
}

/** The mark the real builder puts beside each step type. */
function KindMark({kind, x, y}: {kind: StepKind; x: number; y: number}) {
  if (kind === 'branch') {
    return <circle cx={x} cy={y} r="4.5" fill="none" stroke="#737373" strokeWidth="1.5" />;
  }
  if (kind === 'wait') {
    return (
      <g stroke="#737373" strokeWidth="1.5" fill="none" strokeLinecap="round">
        <circle cx={x} cy={y} r="4.5" />
        <path d={`M ${x} ${y - 2.5} V ${y} H ${x + 2}`} />
      </g>
    );
  }
  return <rect x={x - 4} y={y - 4} width="8" height="8" rx="2" fill={kind === 'trigger' ? '#171717' : '#737373'} />;
}

function Node({x, y, step, arm, nodeW}: {x: number; y: number; step: CanvasStep; arm?: string; nodeW: number}) {
  const solid = step.kind === 'trigger';
  return (
    <>
      {arm && (
        <text x={x + nodeW / 2} y={y - 16} textAnchor="middle" className={'font-code'} fontSize="11" fill="#a3a3a3">
          {arm}
        </text>
      )}
      <rect
        x={x}
        y={y}
        width={nodeW}
        height={NODE_H}
        rx="12"
        fill={solid ? '#ffffff' : '#1c1c1c'}
        stroke={solid ? '#ffffff' : '#404040'}
        strokeWidth="1"
      />
      <KindMark kind={step.kind} x={x + 19} y={y + NODE_H / 2} />
      <text
        x={x + 36}
        y={y + NODE_H / 2}
        dominantBaseline="central"
        className={'font-code'}
        fontSize={LABEL_SIZE}
        fill={solid ? '#171717' : '#e5e5e5'}
      >
        {step.label}
        {step.value && (
          <tspan fill={solid ? '#737373' : '#a3a3a3'} fontSize={VALUE_SIZE} dx="8">
            {step.value}
          </tspan>
        )}
      </text>
    </>
  );
}

export function WorkflowCanvas({flow, label = 'workflow', meta}: {flow: CanvasFlow; label?: string; meta?: string}) {
  const still = useReducedMotion();
  const {steps, branches} = flow;

  /* Widest node in this flow, including the fork arms, clamped. Every node
     then uses it, so the column stays aligned. */
  const nodeW = Math.min(
    MAX_W,
    Math.max(
      MIN_W,
      ...steps.map(s => measure(s.label, s.value)),
      ...(branches ? branches.map(b => measure(b.label)) : []),
    ),
  );
  const centerX = (W - nodeW) / 2;
  const rightX = W - nodeW - LEFT_X;

  const rows = steps.map((step, i) => ({step, x: centerX, y: TOP + i * PITCH}));
  const forkY = TOP + (steps.length - 1) * PITCH + FORK_DROP;
  const arms = branches
    ? [
        {branch: branches[0], x: LEFT_X, y: forkY},
        {branch: branches[1], x: rightX, y: forkY},
      ]
    : [];

  const H = (branches ? forkY : TOP + (steps.length - 1) * PITCH) + NODE_H + 12;
  const at = (i: number) => (still ? 0 : 0.2 + i * 0.1);

  const spoken = [
    steps.map(s => `${s.label}${s.value ? ` (${s.value})` : ''}`).join(', then '),
    branches
      ? `, branching to ${branches[0].label} if ${branches[0].answer} and ${branches[1].label} if ${branches[1].answer}`
      : '',
  ].join('');

  return (
    <Surface tone={'dark'} label={label} meta={meta ? <span>{meta}</span> : undefined}>
      <svg viewBox={`0 0 ${W} ${H}`} className={'h-auto w-full'} role="img" aria-label={`A workflow: ${spoken}.`}>
        <defs>
          <pattern id="wf-grid" width="26" height="26" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="1" fill="#262626" />
          </pattern>
        </defs>
        <rect width={W} height={H} fill="url(#wf-grid)" />

        {/* Spine */}
        {rows.slice(0, -1).map((row, i) => (
          <motion.path
            key={`spine-${i}`}
            d={edgePath(row, rows[i + 1]!, nodeW)}
            fill="none"
            stroke="#404040"
            strokeWidth="1.5"
            strokeLinecap="round"
            initial={still ? undefined : {pathLength: 0}}
            whileInView={still ? undefined : {pathLength: 1}}
            viewport={{once: true, margin: '-15%'}}
            transition={{duration: 0.45, delay: at(i), ease: EASE}}
          />
        ))}

        {/* Fork arms */}
        {arms.map((arm, i) => (
          <motion.path
            key={`arm-${i}`}
            d={edgePath(rows[rows.length - 1]!, arm, nodeW)}
            fill="none"
            stroke="#404040"
            strokeWidth="1.5"
            strokeLinecap="round"
            initial={still ? undefined : {pathLength: 0}}
            whileInView={still ? undefined : {pathLength: 1}}
            viewport={{once: true, margin: '-15%'}}
            transition={{duration: 0.45, delay: at(rows.length - 1 + i), ease: EASE}}
          />
        ))}

        {rows.map((row, i) => (
          <motion.g
            key={`node-${i}`}
            initial={still ? {opacity: 0} : {opacity: 0}}
            whileInView={{opacity: 1}}
            viewport={{once: true, margin: '-15%'}}
            transition={{duration: 0.3, delay: at(i), ease: EASE}}
          >
            <Node x={row.x} y={row.y} step={row.step} nodeW={nodeW} />
          </motion.g>
        ))}

        {arms.map((arm, i) => (
          <motion.g
            key={`armnode-${i}`}
            initial={still ? {opacity: 0} : {opacity: 0}}
            whileInView={{opacity: 1}}
            viewport={{once: true, margin: '-15%'}}
            transition={{duration: 0.3, delay: at(rows.length + i), ease: EASE}}
          >
            <Node
              x={arm.x}
              y={arm.y}
              step={{kind: 'action', label: arm.branch.label}}
              arm={arm.branch.answer}
              nodeW={nodeW}
            />
          </motion.g>
        ))}
      </svg>
    </Surface>
  );
}
