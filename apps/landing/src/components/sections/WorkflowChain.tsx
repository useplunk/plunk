import {motion} from 'framer-motion';
import React from 'react';
import {Clock, GitBranch, Mail, Zap} from 'lucide-react';

import {Node} from './Diagram';

type StepKind = 'trigger' | 'wait' | 'action' | 'branch';

export interface FlowStep {
  kind: StepKind;
  /** One or two words. Anything longer belongs in the prose beside the diagram. */
  label: string;
  /** Optional short value: an event name, a duration. Sits with its label. */
  value?: string;
}

export interface FlowBranch {
  /** The answer this arm represents. */
  answer: string;
  label: string;
}

export interface Flow {
  steps: FlowStep[];
  /** Two arms out of the final step. Omit for a straight sequence. */
  branches?: [FlowBranch, FlowBranch];
}

const icons: Record<StepKind, React.ReactNode> = {
  trigger: <Zap className="h-5 w-5" strokeWidth={1.5} />,
  action: <Mail className="h-5 w-5" strokeWidth={1.5} />,
  wait: <Clock className="h-5 w-5" strokeWidth={1.5} />,
  branch: <GitBranch className="h-5 w-5" strokeWidth={1.5} />,
};

/**
 * Diagram geometry. The spine and the fork both derive from these, so the line
 * always stops exactly where the last arm leaves it and the elbows always meet
 * their pill. Hard-coding them separately is how you end up with a line running
 * on past the last node into nothing.
 */
const TILE = 44;
const SPINE_X = TILE / 2;
/** Where each fork arm leaves the spine, measured inside the fork block. */
const ARM_Y = [28, 72];
const FORK_HEIGHT = 92;
/** x where an arm ends and its pill begins. */
const ARM_END = SPINE_X + 30;

/**
 * A workflow, drawn as one continuous run.
 *
 * The previous version put a separate little arrow between every pair of steps.
 * At 34px tall with a 10px arrowhead, each of those was a third arrowhead and
 * two thirds line, so the flow read as four broken marks rather than one path,
 * and the whole thing felt fussy. This draws a single spine that the tiles sit
 * on top of: the line is continuous, the tiles punch through it, and it animates
 * once from top to bottom instead of stuttering four times.
 *
 * Two other things the old one got wrong. Values were right-aligned in a wide
 * column, which parked `user.signed-up` a few hundred pixels away from the step
 * it describes; they sit with their label now. And a step called "Opened it?"
 * sat in a straight column with nothing forking, which is the one thing a
 * branch has to show, so branches now actually split.
 */
export function WorkflowChain({flow}: {flow: Flow}) {
  const {steps, branches} = flow;

  return (
    <div className={'relative'}>
      {/* The spine. One element, one animation, running from the centre of the
          first tile to the centre of the last. The tiles are opaque, so it is
          only visible in the gaps — which is what makes it read as continuous. */}
      <motion.span
        aria-hidden
        initial={{scaleY: 0}}
        whileInView={{scaleY: 1}}
        viewport={{once: true}}
        transition={{duration: 0.9, ease: [0.22, 1, 0.36, 1]}}
        style={{
          left: SPINE_X - 0.5,
          top: TILE / 2,
          // With a fork, the spine stops where the fork block starts: each elbow
          // draws its own vertical from there, so continuing the spine underneath
          // them would leave a stub hanging past the last bend.
          bottom: branches ? FORK_HEIGHT : TILE / 2,
        }}
        className={'absolute w-px origin-top bg-neutral-200'}
      />

      <ol className={'relative flex flex-col gap-5'}>
        {steps.map((step, i) => (
          <motion.li
            key={`${step.label}-${i}`}
            initial={{opacity: 0, x: -6}}
            whileInView={{opacity: 1, x: 0}}
            viewport={{once: true}}
            transition={{duration: 0.45, delay: 0.15 + i * 0.12, ease: [0.22, 1, 0.36, 1]}}
            className={'flex items-center gap-4'}
          >
            <Node icon={icons[step.kind]} tone={step.kind === 'trigger' ? 'solid' : 'default'} />
            <div className={'flex min-w-0 flex-wrap items-baseline gap-x-2.5'}>
              <span
                style={{fontFamily: 'var(--font-display)'}}
                className={'font-semibold tracking-[-0.01em] text-neutral-900'}
              >
                {step.label}
              </span>
              {step.value && (
                <span style={{fontFamily: 'var(--font-mono)'}} className={'text-label text-neutral-500'}>
                  {step.value}
                </span>
              )}
            </div>
          </motion.li>
        ))}
      </ol>

      {branches && <Fork branches={branches} delay={0.15 + steps.length * 0.12} />}
    </div>
  );
}

/**
 * The split. Two rounded elbows out of the spine into a pair of arms, so the
 * condition above them visibly does something.
 */
function Fork({branches, delay}: {branches: [FlowBranch, FlowBranch]; delay: number}) {
  const elbow = (y: number) =>
    `M ${SPINE_X} 0 V ${y - 16} Q ${SPINE_X} ${y} ${SPINE_X + 16} ${y} H ${ARM_END}`;

  return (
    <div className={'relative'} style={{height: FORK_HEIGHT}}>
      <svg aria-hidden width="100%" height={FORK_HEIGHT} className={'absolute inset-0'}>
        {ARM_Y.map((y, i) => (
          <motion.path
            key={y}
            d={elbow(y)}
            stroke="#d4d4d4"
            strokeWidth="1.5"
            fill="none"
            initial={{pathLength: 0}}
            whileInView={{pathLength: 1}}
            viewport={{once: true}}
            transition={{duration: 0.5, delay: delay + i * 0.12, ease: [0.22, 1, 0.36, 1]}}
          />
        ))}
      </svg>

      {branches.map((branch, i) => (
        <motion.div
          key={branch.answer}
          initial={{opacity: 0, x: -6}}
          whileInView={{opacity: 1, x: 0}}
          viewport={{once: true}}
          transition={{duration: 0.4, delay: delay + 0.3 + i * 0.12, ease: [0.22, 1, 0.36, 1]}}
          style={{left: ARM_END, top: ARM_Y[i]! - 16}}
          className={'absolute flex items-center gap-2.5 rounded-full border border-neutral-200 bg-white py-1.5 pl-3 pr-4'}
        >
          <span style={{fontFamily: 'var(--font-mono)'}} className={'text-label text-neutral-500'}>
            {branch.answer}
          </span>
          <span
            style={{fontFamily: 'var(--font-display)'}}
            className={'font-semibold tracking-[-0.01em] text-neutral-900'}
          >
            {branch.label}
          </span>
        </motion.div>
      ))}
    </div>
  );
}
