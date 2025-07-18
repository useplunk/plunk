import {motion} from 'framer-motion';
import React from 'react';

export interface ProgressBarProps {
  percentage: number;
}

/**
 * @param root0
 * @param root0.percentage
 */
export default function ProgressBar({percentage}: ProgressBarProps) {
  const formattedPercentage = isNaN(percentage) ? 0 : percentage;

  return (
    <div className="overflow-hidden rounded-full bg-neutral-200 transition ease-in-out">
      <motion.div
        transition={{duration: 0.5}}
        animate={{width: ['0%', `${formattedPercentage}%`]}}
        className="h-2 rounded-full bg-neutral-700"
      />
    </div>
  );
}
