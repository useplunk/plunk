import React, {MutableRefObject, useEffect, useState} from 'react';
import {AnimatePresence, motion} from 'framer-motion';

export interface MultiselectDropdownProps {
  onChange: (value: string[]) => void;
  values: readonly {
    name: string;
    value: string;
    tag?: string;
  }[];
  selectedValues?: readonly string[];
  disabled?: boolean;
  className?: string;
}

/**
 * @param root0
 * @param root0.onChange
 * @param root0.values
 * @param root0.selectedValues
 * @param root0.className
 * @param root0.disabled
 */
export default function MultiselectDropdown({
  onChange,
  values,
  selectedValues: PropsselectedValues,
  className,
  disabled = false,
}: MultiselectDropdownProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedValues, setSelectedValues] = useState<readonly string[]>([]);

  const ref = React.createRef<HTMLDivElement>();

  useEffect(() => {
    if (PropsselectedValues) {
      setSelectedValues(PropsselectedValues);
    }
  }, [PropsselectedValues]);

  useEffect(() => {
    const mutableRef = ref as MutableRefObject<HTMLDivElement | null>;

    const handleClickOutside = (event: any) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      if (mutableRef.current && !mutableRef.current.contains(event.target) && open) {
        setOpen(!open);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [ref]);

  return (
    <>
      <div ref={ref} className={className ?? ''}>
        <div className="relative mt-1">
          <button
            type="button"
            className={`${
              disabled ? 'cursor-default bg-neutral-100' : 'cursor-pointer bg-white'
            } relative w-full rounded border border-neutral-300 py-2 pl-3 pr-10 text-left sm:text-sm`}
            aria-haspopup="listbox"
            aria-expanded="true"
            aria-labelledby="listbox-label"
            onClick={() => {
              if (!disabled) {
                setOpen(!open);
              }
            }}
          >
            <span className="block truncate">{selectedValues.length} selected</span>
            <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
              <motion.svg
                initial={{rotate: '90deg'}}
                animate={open ? {rotate: '0deg'} : {rotate: '90deg'}}
                className="h-5 w-5 text-neutral-400"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M10 3a1 1 0 01.707.293l3 3a1 1 0 01-1.414 1.414L10 5.414 7.707 7.707a1 1 0 01-1.414-1.414l3-3A1 1 0 0110 3zm-3.707 9.293a1 1 0 011.414 0L10 14.586l2.293-2.293a1 1 0 011.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </motion.svg>
            </span>
          </button>

          <AnimatePresence>
            {open && (
              <motion.ul
                initial={{opacity: 0, height: 0}}
                animate={{opacity: 1, height: 'auto'}}
                exit={{opacity: 0, height: 0}}
                transition={{duration: 0.2, ease: 'easeInOut'}}
                className="scrollbar-w-2 scrollbar scrollbar-thumb-rounded-full scrollbar-thumb-neutral-400 scrollbar-track-neutral-100 absolute z-40 mt-1 max-h-72 w-full overflow-y-scroll rounded-md border border-black border-opacity-5 bg-white p-1 pr-1 text-base shadow focus:outline-none sm:text-sm"
                tabIndex={-1}
                role="listbox"
              >
                <li className="relative cursor-default select-none px-3 py-2 text-neutral-800">
                  <input
                    type="search"
                    name="search"
                    autoComplete={'off'}
                    className="block w-full rounded border-neutral-300 focus:border-black focus:ring-black sm:text-sm"
                    placeholder={'Search'}
                    onChange={e => setQuery(e.target.value)}
                  />
                </li>

                {values.filter(value => value.name.toLowerCase().includes(query.toLowerCase())).length === 0 ? (
                  <li className="relative cursor-default select-none py-2 pl-3 pr-9 text-neutral-800">
                    No results found
                  </li>
                ) : (
                  values
                    .filter(value => value.name.toLowerCase().includes(query.toLowerCase()))
                    .map((value, index) => {
                      return (
                        <li
                          key={`multiselect-${index}`}
                          className="relative flex cursor-default select-none items-center rounded-md py-2.5 pl-2.5 text-neutral-800 transition ease-in-out hover:bg-neutral-100"
                          role="option"
                          onClick={() => {
                            const isAlreadySelected = selectedValues.find(selection => value.value === selection);

                            const updatedArray = isAlreadySelected
                              ? selectedValues.filter(selection => selection !== value.value)
                              : [...selectedValues, value.value];

                            onChange(updatedArray);
                            setSelectedValues(updatedArray);
                          }}
                        >
                          {value.tag && (
                            <span
                              className={'mr-3 whitespace-nowrap rounded bg-blue-100 px-3 py-0.5 text-xs text-blue-900'}
                            >
                              {value.tag}
                            </span>
                          )}
                          <span className="truncate font-normal">
                            {value.name.charAt(0).toUpperCase() + value.name.slice(1).toLowerCase()}
                          </span>
                          {value.value === selectedValues.find(selection => value.value === selection) ? (
                            <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-black">
                              <svg
                                className="h-5 w-5"
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                                aria-hidden="true"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            </span>
                          ) : null}
                        </li>
                      );
                    })
                )}
              </motion.ul>
            )}
          </AnimatePresence>
        </div>
      </div>
    </>
  );
}
