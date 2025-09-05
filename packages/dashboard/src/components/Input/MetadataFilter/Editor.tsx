import { Contact } from '@prisma/client';
import { useEffect, useMemo, useState } from 'react';
import Toggle from '../Toggle/Toggle';
import Filter from './Filter';
import { MetadataFilterGroupType } from './types';


export default function MetadataFilterEditor({ onChange, contacts }: { onChange: (metadataFilter: MetadataFilterGroupType) => void, contacts: Contact[] }) {
    const [group, setGroup] = useState<MetadataFilterGroupType>({
        combination: 'and',
        filters: [],
    });

    useEffect(() => {
        onChange(group);
    }, [group]);


    const parsedContacts = useMemo(() => contacts.map((c) => ({ contact: c, data: JSON.parse(c.data ?? "{}") })), [contacts]);

    return (<>


        <div className={"sm:col-span-4"}>
            <Toggle title="All contacts with parameter" description={group.combination === "and" ? "match all filters" : "match at least one filter"} toggled={group.combination === "and"} onToggle={() => setGroup({ ...group, combination: group.combination === "and" ? "or" : "and" })} />
        </div>

        {group.filters.map((filter, index) => (
            <div className={"sm:col-span-4"}>
                <Filter key={index} initialFilter={filter} onFilterChange={(filter) => setGroup({ ...group, filters: group.filters.map((f, i) => i === index ? filter : f) })} contacts={parsedContacts} index={index} onFilterRemove={(index) => setGroup({ ...group, filters: group.filters.filter((_, i) => i !== index) })} />
            </div>
        ))}
        <div className={"sm:col-span-1"}>
            <button
                onClick={(e) => {
                    e.preventDefault();
                    setGroup({ ...group, filters: [...group.filters, { field: "", value: "", condition: "is" }] });
                }}
                className={
                    "mt-6 flex items-center justify-center gap-x-1 rounded border border-neutral-300 bg-white px-8 py-1 text-center text-sm font-medium text-neutral-800 transition ease-in-out hover:bg-neutral-100"
                }
            >
                <svg width="24" height="24" fill="none" viewBox="0 0 24 24">
                    <path
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="1.5"
                        d="M12 5.75V18.25"
                    />
                    <path
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="1.5"
                        d="M18.25 12L5.75 12"
                    />
                </svg>
                Add filter
            </button>
        </div>
    </>);
};