import Tippy from '@tippyjs/react';
import React, {ReactNode} from 'react';

export interface TooltipProps {
  content: ReactNode | string;
  icon: ReactNode;
}

/**
 *
 * @param root0
 * @param root0.content
 * @param root0.icon
 */
export default function Tooltip({content, icon}: TooltipProps) {
  return (
    <>
      <Tippy
        maxWidth={450}
        className={'rounded-md border border-neutral-200 bg-white px-6 py-6 text-sm text-neutral-800 shadow-md'}
        content={<div>{content}</div>}
      >
        <svg
          className={'ml-1 h-4 w-4 cursor-pointer'}
          viewBox="0 0 24 24"
          strokeWidth="2"
          stroke="currentColor"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {icon}
        </svg>
      </Tippy>
    </>
  );
}
