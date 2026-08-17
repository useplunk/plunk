import {motion} from 'framer-motion';
import React from 'react';

/**
 * Shared parts for the code-drawn diagrams.
 *
 * These are lifted from the homepage's "One contact, complete history" section,
 * which is the reference for how a Plunk diagram should look: rounded icon
 * tiles, a thin drawn connector that animates in, a number as the payoff, and
 * almost nothing to read. Earlier artifacts on the feature pages drifted into
 * being transcripts — accurate, but they asked the reader to work through a
 * wall of text to see something they should have been able to take in at a
 * glance. Keeping the primitives in one place stops that drift.
 *
 * Rule of thumb when using these: one or two words per node. If a node needs a
 * sentence, the diagram is carrying an idea that belongs in the prose beside
 * it.
 */

/** A rounded icon tile. The dark variant marks the start or the payoff. */
export function Node({
  icon,
  tone = 'default',
  size = 'md',
}: {
  icon: React.ReactNode;
  tone?: 'default' | 'solid';
  size?: 'md' | 'lg';
}) {
  const box = size === 'lg' ? 'h-14 w-14' : 'h-11 w-11';
  const shape =
    tone === 'solid' ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-900';
  return (
    <div className={`flex ${box} flex-shrink-0 items-center justify-center rounded-xl ${shape}`}>{icon}</div>
  );
}

/**
 * A vertical connector that draws itself in, matching the arrow between the
 * event tiles and the contact record on the homepage.
 */
export function Connector({
  height = 40,
  delay = 0,
  arrow = true,
  className = '',
}: {
  height?: number;
  delay?: number;
  arrow?: boolean;
  className?: string;
}) {
  const markerId = React.useId();
  return (
    <div aria-hidden className={`flex justify-center ${className}`}>
      <svg width="24" height={height} viewBox={`0 0 24 ${height}`}>
        <defs>
          <marker id={markerId} markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
            <polygon points="0 0, 10 3, 0 6" fill="#a3a3a3" />
          </marker>
        </defs>
        <motion.path
          d={`M 12 0 L 12 ${arrow ? height - 10 : height}`}
          stroke="#d4d4d4"
          strokeWidth="1.5"
          fill="none"
          markerEnd={arrow ? `url(#${markerId})` : undefined}
          initial={{pathLength: 0}}
          whileInView={{pathLength: 1}}
          viewport={{once: true}}
          transition={{duration: 0.7, delay, ease: [0.22, 1, 0.36, 1]}}
        />
      </svg>
    </div>
  );
}

/** A soft panel, the shape the homepage uses for grouped diagram content. */
export function Panel({children, className = ''}: {children: React.ReactNode; className?: string}) {
  return (
    <div className={`rounded-2xl border border-neutral-200 bg-white ${className}`}>{children}</div>
  );
}
