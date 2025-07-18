import {AnimatePresence, motion} from 'framer-motion';
import React, {MutableRefObject, useEffect, useState} from 'react';

export interface Dropdownprops {
  withSearch?: boolean;
  inModal?: boolean;
  disabled?: boolean;
  onChange: (value: string) => void;
  values: {
    name: string;
    value: string;
  }[];
  selectedValue: string;
  className?: string;
}

/**
 * @param root0
 * @param root0.onChange
 * @param root0.values
 * @param root0.selectedValue
 * @param root0.className
 * @param root0.withSearch
 * @param root0.inModal
 * @param root0.disabled
 */
export default function Dropdown({
  onChange,
  values,
  selectedValue,
  className,
  withSearch = false,
  inModal = false,
  disabled = false,
}: Dropdownprops) {
  const [open, setOpen] = useState(false);
  const ref = React.createRef<HTMLDivElement>();

  useEffect(() => {
    const mutableRef = ref as MutableRefObject<HTMLDivElement | null>;

    const handleClickOutside = (event: any) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      if (mutableRef.current && !mutableRef.current.contains(event.target) && open) {
        setOpen(false);
        setQuery('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [ref]);

  const [query, setQuery] = useState('');

  return (
    <div ref={ref} className={className ?? ''}>
      <div className="relative mt-1 w-full">
        <button
          type="button"
          className={`${
            disabled ? 'cursor-default bg-neutral-100' : 'cursor-pointer bg-white'
          } relative w-full rounded border border-neutral-300 py-2 pl-3 pr-10 text-left focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500 sm:text-sm`}
          aria-haspopup="listbox"
          aria-expanded="true"
          aria-labelledby="listbox-label"
          onClick={() => {
            if (!disabled) {
              setOpen(!open);
            }
          }}
        >
          <span className="block flex items-center truncate">
            {values.find(v => v.value === selectedValue)
              ? `${values
                  .find(v => v.value === selectedValue)
                  ?.name.charAt(0)
                  .toUpperCase()}${values
                  .find(v => v.value === selectedValue)
                  ?.name.slice(1)
                  .toLowerCase()}`
              : 'No value selected'}
          </span>
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
              className={`${
                inModal ? 'fixed w-64' : 'absolute w-full'
              } z-50 mt-1 max-h-72 rounded-md border border-black border-opacity-10 bg-white text-base shadow-lg focus:outline-none sm:text-sm`}
              tabIndex={-1}
              role="listbox"
            >
              <div className="sticky top-0 z-50 bg-white">
                {withSearch ? (
                  <>
                    <li className="relative cursor-default select-none px-3 py-2 text-neutral-800">
                      <input
                        type="search"
                        name="search"
                        autoComplete={'off'}
                        className="block w-full rounded border-neutral-300 border-opacity-5 focus:border-neutral-800 sm:text-sm"
                        placeholder={'Search'}
                        onChange={e => setQuery(e.target.value)}
                      />
                    </li>
                    <hr />
                  </>
                ) : null}
              </div>

              <div
                className={
                  'scrollbar-w-2 scrollbar scrollbar-thumb-rounded-full scrollbar-thumb-neutral-400 scrollbar-track-neutral-100 max-h-52 overflow-y-scroll p-1'
                }
              >
                {values.filter(value => value.name.toLowerCase().startsWith(query.toLowerCase())).length === 0 ? (
                  <li className="relative cursor-default select-none py-2.5 pl-3 pr-9 text-neutral-800">
                    No results found
                  </li>
                ) : (
                  values
                    .filter(value => value.name.toLowerCase().startsWith(query.toLowerCase()))
                    .map((value, index) => {
                      return (
                        <li
                          key={`x-${index}`}
                          className="relative flex cursor-default select-none items-center rounded-md py-2.5 pl-2.5 text-neutral-800 transition ease-in-out hover:bg-neutral-100"
                          role="option"
                          onClick={() => {
                            onChange(value.value);
                            setQuery('');
                            setOpen(!open);
                          }}
                        >
                          <span className="truncate">
                            {value.name.charAt(0).toUpperCase() + value.name.slice(1).toLowerCase()}
                          </span>
                          {value.value === selectedValue ? (
                            <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-neutral-800">
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
              </div>
            </motion.ul>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
