import { Contact } from '@prisma/client';
import { useEffect, useMemo, useState } from 'react';
import { Dropdown } from "../Dropdown";
import { Condition, conditions, MetadataFilterType } from './types';

/**
 * A single filter for the metadata filter editor
 * @param initialFilter Initial filter
 * @param onFilterChange Callback to call when the configuration changes
 * @param contacts Contacts to filter
 * @param index Index of the filter
 * @param onFilterRemove Callback to call when the filter is removed
 */
export default function Filter({ initialFilter, onFilterChange, contacts, index, onFilterRemove }: { initialFilter: MetadataFilterType, onFilterChange: (filter: MetadataFilterType) => void, contacts: { contact: Contact, data: Record<string, any> }[], index: number, onFilterRemove: (index: number) => void }) {
    const [filter, setFilter] = useState<MetadataFilterType>(initialFilter);

    useEffect(() => {
        onFilterChange(filter);
    }, [filter]);

    const isValueDropdown = useMemo(() => filter.condition && (filter.condition === "is" || filter.condition === "is not"), [filter.condition]);

    const fields = useMemo(() => {
        const fields = new Set<string>();
        contacts.forEach((c) => {
            Object.keys(c.data).forEach((k) => {
                fields.add(k);
            });
        });
        return [
            { name: "Select parameter", value: "" },
            { name: "Email", value: "email" },
            ...[...fields].map((k) => ({ name: k, value: k })),
        ];
    }, [contacts]);

    const values = useMemo(() => {
        const values = new Set<string>();
        if (!filter.field) {
            return [];
        }
        if (filter.field === 'email') {
            contacts.forEach((c) => {
                values.add(c.contact.email);
            });
        } else {
            contacts.forEach((c) => {
                if (c.data[filter.field as string]) {
                    values.add(c.data[filter.field as string]);
                }
            });
        }
        return [...values].map((k) => ({ name: k, value: k }))
    }, [contacts, filter.field]);

    return (
        <div className="grid w-full grid-cols-8 items-start gap-3 rounded border border-neutral-300 px-6 py-6">
            <div className={"sm:col-span-2"}>
                <Dropdown
                    onChange={(e) =>
                        setFilter({
                            ...filter,
                            field: e === "" ? undefined : e,
                        })
                    }
                    values={fields}
                    selectedValue={filter.field ?? ""}
                />
            </div>

            <div className={"sm:col-span-2"}>
                {filter.field && (
                    <Dropdown
                        onChange={(e) => setFilter({ ...filter, condition: e === "" ? "is" : e as Condition })}
                        values={conditions.map((c) => ({ name: c, value: c }))}
                        selectedValue={filter.condition ?? "is"} />
                )}
            </div>

            <div className={"sm:col-span-3"}>
                {filter.field && filter.condition && (
                    <>
                        {filter.condition && isValueDropdown && (
                            <Dropdown
                                onChange={(e) =>
                                    setFilter({
                                        ...filter,
                                        value: e === "" ? undefined : e,
                                    })
                                }
                                values={values}
                                selectedValue={filter.value ?? ""}
                            />
                        )}
                        {filter.condition && !isValueDropdown && (
                            <div className="mt-1">
                                <input
                                    autoComplete={'off'}
                                    type="text"
                                    className={
                                        'block w-full rounded border-neutral-300 transition ease-in-out focus:border-neutral-800 focus:ring-neutral-800 sm:text-sm'
                                    }
                                    aria-label="Value"
                                    placeholder="Value"
                                    value={filter.value ?? "any value"}
                                    onChange={(e) => setFilter({ ...filter, value: e.target.value })}
                                />
                            </div>
                        )}
                    </>
                )}
            </div>

            <button
                className={
                    "col-span-1 flex h-10 items-center justify-center rounded bg-red-100 text-sm text-red-800 transition hover:bg-red-200"
                }
                onClick={(e) => {
                    e.preventDefault();
                    onFilterRemove(index);
                }}
            >
                <svg width="24" height="24" fill="none" viewBox="0 0 24 24">
                    <path
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="1.5"
                        d="M6.75 7.75L7.59115 17.4233C7.68102 18.4568 8.54622 19.25 9.58363 19.25H14.4164C15.4538 19.25 16.319 18.4568 16.4088 17.4233L17.25 7.75"
                    />
                    <path
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="1.5"
                        d="M9.75 7.5V6.75C9.75 5.64543 10.6454 4.75 11.75 4.75H12.25C13.3546 4.75 14.25 5.64543 14.25 6.75V7.5"
                    />
                    <path
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="1.5"
                        d="M5 7.75H19"
                    />
                </svg>
            </button>
        </div>);
};