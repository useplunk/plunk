import React from 'react';
import {Ghost} from 'lucide-react';

export interface EmptyProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
}

/**
 * @param root0
 * @param root0.title
 * @param root0.description
 * @param root0.icon
 */
export default function Empty({title, description, icon}: EmptyProps) {
  return (
    <div className="relative block w-full p-12 text-center">
      <svg
        className="mx-auto mb-6 h-12 w-12 rounded bg-neutral-100 p-3 font-bold text-neutral-800"
        xmlns="http://www.w3.org/2000/svg"
        stroke="currentColor"
        fill="none"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        {icon ?? (
          <>
            <Ghost />
          </>
        )}
      </svg>
      <span className="mt-2 block text-sm font-medium text-neutral-800">{title}</span>
      <span className="mt-1 block text-sm font-normal text-neutral-600">{description}</span>
    </div>
  );
}
