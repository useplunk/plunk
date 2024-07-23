export interface ToggleProps {
  title: string;
  description: string;
  toggled: boolean;
  onToggle: () => void;
  disabled?: boolean;
  className?: string;
}

/**
 * @param root0
 * @param root0.toggled
 * @param root0.onToggle
 * @param root0.title
 * @param root0.description
 * @param root0.className
 * @param root0.disabled
 */
export default function Toggle({title, description, toggled, onToggle, disabled, className}: ToggleProps) {
  return (
    <>
      <div className={`flex items-center justify-between ${className}`}>
        <span className="flex flex-grow flex-col">
          <span
            className={`${
              disabled ? 'text-neutral-400' : 'text-neutral-800'
            } text-sm font-medium transition ease-in-out`}
          >
            {title}
          </span>
          <span className={`${disabled ? 'text-neutral-300' : 'text-neutral-500'} w-10/12 text-sm`}>{description}</span>
        </span>
        <button
          type="button"
          className={`${
            disabled ? 'bg-neutral-100' : toggled ? 'bg-neutral-800' : 'bg-neutral-200'
          } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-neutral-800 focus:ring-offset-2`}
          role="switch"
          aria-checked="false"
          aria-labelledby="availability-label"
          aria-describedby="availability-description"
          onClick={onToggle}
        >
          <span
            aria-hidden="true"
            className={`${
              disabled ? 'translate-x-0' : toggled ? 'translate-x-5' : 'translate-x-0'
            } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
          />
        </button>
      </div>
    </>
  );
}
