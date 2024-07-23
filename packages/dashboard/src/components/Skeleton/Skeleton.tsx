export interface SkeletonProps {
  type: 'table' | 'card';
}

/**
 *
 * @param root0
 * @param root0.type
 */
export default function Skeleton({type}: SkeletonProps) {
  if (type === 'table') {
    return (
      <>
        <div
          role="status"
          className="w-full animate-pulse space-y-4 divide-y divide-neutral-200 rounded border border-neutral-200 p-4 shadow md:p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="mb-2.5 h-2.5 w-24 rounded-full bg-neutral-300"></div>
              <div className="h-2 w-32 rounded-full bg-neutral-200"></div>
            </div>
            <div className="h-2.5 w-12 rounded-full bg-neutral-300"></div>
          </div>
          <div className="flex items-center justify-between pt-4">
            <div>
              <div className="mb-2.5 h-2.5 w-24 rounded-full bg-neutral-300"></div>
              <div className="h-2 w-32 rounded-full bg-neutral-200"></div>
            </div>
            <div className="h-2.5 w-12 rounded-full bg-neutral-300"></div>
          </div>
          <div className="flex items-center justify-between pt-4">
            <div>
              <div className="mb-2.5 h-2.5 w-24 rounded-full bg-neutral-300"></div>
              <div className="h-2 w-32 rounded-full bg-neutral-200"></div>
            </div>
            <div className="h-2.5 w-12 rounded-full bg-neutral-300"></div>
          </div>
          <div className="flex items-center justify-between pt-4">
            <div>
              <div className="mb-2.5 h-2.5 w-24 rounded-full bg-neutral-300"></div>
              <div className="h-2 w-32 rounded-full bg-neutral-200"></div>
            </div>
            <div className="h-2.5 w-12 rounded-full bg-neutral-300"></div>
          </div>
          <div className="flex items-center justify-between pt-4">
            <div>
              <div className="mb-2.5 h-2.5 w-24 rounded-full bg-neutral-300"></div>
              <div className="h-2 w-32 rounded-full bg-neutral-200"></div>
            </div>
            <div className="h-2.5 w-12 rounded-full bg-neutral-300"></div>
          </div>
          <div className="flex items-center justify-between pt-4">
            <div>
              <div className="mb-2.5 h-2.5 w-24 rounded-full bg-neutral-300"></div>
              <div className="h-2 w-32 rounded-full bg-neutral-200"></div>
            </div>
            <div className="h-2.5 w-12 rounded-full bg-neutral-300"></div>
          </div>
          <div className="flex items-center justify-between pt-4">
            <div>
              <div className="mb-2.5 h-2.5 w-24 rounded-full bg-neutral-300"></div>
              <div className="h-2 w-32 rounded-full bg-neutral-200"></div>
            </div>
            <div className="h-2.5 w-12 rounded-full bg-neutral-300"></div>
          </div>
          <div className="flex items-center justify-between pt-4">
            <div>
              <div className="mb-2.5 h-2.5 w-24 rounded-full bg-neutral-300"></div>
              <div className="h-2 w-32 rounded-full bg-neutral-200"></div>
            </div>
            <div className="h-2.5 w-12 rounded-full bg-neutral-300"></div>
          </div>
          <span className="sr-only">Loading...</span>
        </div>
      </>
    );
  }

  return <></>;
}
