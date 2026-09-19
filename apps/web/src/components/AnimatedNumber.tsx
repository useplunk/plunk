import {animate, motion, useMotionValue, useReducedMotion, useTransform} from 'framer-motion';
import {useEffect} from 'react';

interface AnimatedNumberProps {
  value: number;
  /** Defaults to a locale-grouped integer. */
  format?: (n: number) => string;
  className?: string;
}

/**
 * A figure that counts to its value instead of snapping to it.
 *
 * The motion is not decoration: these numbers arrive after the page does (SWR) and
 * change again under the reader while a campaign sends, so the count communicates
 * "this value just moved". Readers who asked for less motion get the final value
 * immediately.
 */
export function AnimatedNumber({value, format, className}: AnimatedNumberProps) {
  const reduceMotion = useReducedMotion();
  const motionValue = useMotionValue(reduceMotion ? value : 0);
  const rounded = useTransform(motionValue, latest =>
    format ? format(Math.round(latest)) : Math.round(latest).toLocaleString(),
  );

  useEffect(() => {
    if (reduceMotion) {
      motionValue.set(value);
      return;
    }

    const controls = animate(motionValue, value, {duration: 1.1, ease: [0.22, 1, 0.36, 1]});
    return () => controls.stop();
  }, [value, motionValue, reduceMotion]);

  return <motion.span className={className}>{rounded}</motion.span>;
}
