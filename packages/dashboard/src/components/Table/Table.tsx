import React from 'react';

export interface TableProps {
  values: {
    // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
    [key: string]: string | number | boolean | Date | React.ReactNode | null;
  }[];
}

/**
 * @param root0
 * @param root0.values
 */
export default function Table({values}: TableProps) {
  if (values.length === 0) {
    return <h1>No values provided</h1>;
  }

  return (
    <div className="flex flex-col">
      <div className="-my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
        <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
          <div className="overflow-hidden rounded border border-neutral-200">
            <table className="min-w-full">
              <thead className="bg-neutral-50">
                <tr>
                  {Object.keys(values[0]).map(header => {
                    return (
                      <th
                        scope="col"
                        className={`${
                          typeof values[0][header] === 'boolean' ? 'text-center' : 'text-left'
                        } px-6 py-3 text-xs font-medium text-neutral-800`}
                      >
                        {header}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {values.map(row => {
                  return (
                    <tr className={`border-t border-neutral-100 bg-white transition ease-in-out hover:bg-neutral-50`}>
                      {Object.entries(row).map(value => {
                        if (value[1] === null || value[1] === undefined) {
                          return (
                            <td className="whitespace-nowrap px-6 py-4 text-sm text-neutral-500">Not specified</td>
                          );
                        }

                        if (typeof value[1] === 'boolean') {
                          return (
                            <td className="whitespace-nowrap px-6 py-4 text-sm text-neutral-500">
                              {value[1] ? (
                                <svg
                                  className={'mx-auto h-7 w-7 rounded-full bg-green-50 p-1 text-green-500'}
                                  fill="none"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    stroke="currentColor"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="1.5"
                                    d="M5.75 12.8665L8.33995 16.4138C9.15171 17.5256 10.8179 17.504 11.6006 16.3715L18.25 6.75"
                                  />
                                </svg>
                              ) : (
                                <svg
                                  className={'mx-auto h-7 w-7 rounded-full bg-red-50 p-1 text-red-500'}
                                  width="24"
                                  height="24"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    stroke="currentColor"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="1.5"
                                    d="M17.25 6.75L6.75 17.25"
                                  />
                                  <path
                                    stroke="currentColor"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="1.5"
                                    d="M6.75 6.75L17.25 17.25"
                                  />
                                </svg>
                              )}
                            </td>
                          );
                        }

                        // @ts-ignore
                        return <td className="whitespace-nowrap px-6 py-4 text-sm text-neutral-500">{value[1]}</td>;
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
