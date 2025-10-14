import {
  type MetadataFilterType,
  type MetadataFilterGroupType,
} from "../../components";
import { type Contact, type Trigger } from "@prisma/client";
import dayjs from "dayjs";
import { useMemo } from "react";

/**
 * Mapping of the filter conditions to the functions to use
 */
const functionMapping = {
  contains: "includes",
  "starts with": "startsWith",
  "ends with": "endsWith",
  "does not contain": "includes",
  "does not start with": "startsWith",
  "does not end with": "endsWith",
} as const;

/**
 * Check if the contact matches the filter
 * @param contact Contact to filter
 * @param data Data to filter
 * @param filter Filter to filter contacts
 * @returns True if the contact matches the filter, false otherwise
 */
function matchesMetadataFilter(
  contact: Contact,
  data: Record<string, any>,
  filter: MetadataFilterType
) {
  if (!filter.field || !filter.condition) {
    return true;
  }
  const value = filter.field === "email" ? contact.email : data[filter.field];
  if (!value) {
    return false;
  }
  switch (filter.condition) {
    case "is":
      return value === filter.value;
    case "is not":
      return value !== filter.value;
    default:
      if (typeof value[functionMapping[filter.condition]] !== "function") {
        return false;
      }
      const matches = value[functionMapping[filter.condition]](
        filter.value
      ) as boolean;
      if (filter.condition.includes("does not")) {
        return !matches;
      }
      return matches;
  }
}

/**
 * Filter contacts based on the metadata filter 
 * @param contacts Contacts to filter
 * @param filter Metadata filter to filter contacts
 * @returns Filtered contacts
 */
function filterContactsByMetadata<T extends Contact>(
  contacts: T[],
  filter: MetadataFilterGroupType
) {
  return contacts.filter((contact) => {
    if (!filter.filters || !filter.filters.length) {
      return true;
    }
    const data = JSON.parse(contact.data ?? "{}");

    let matches = false;
    if (filter.combination !== "or") {
      matches = filter.filters.every((filter) =>
        matchesMetadataFilter(contact, data, filter)
      );
    } else {
      matches = filter.filters.some((filter) =>
        matchesMetadataFilter(contact, data, filter)
      );
    }
    debugger;
    return matches;
  });
}

/**
 * Filter contacts based on the query
 * @param contacts Contacts to filter
 * @param query Query to filter contacts
 * @returns Filtered contacts
 */
export default function useFilterContacts(
  contacts: (Contact & {
    triggers: Trigger[];
  })[],
  query: {
    events?: string[];
    last?: "day" | "week" | "month";
    notevents?: string[];
    notlast?: "day" | "week" | "month";
    metadataFilter?: MetadataFilterGroupType;
  }
) {
  return useMemo(() => {
    if (!contacts) {
      return [];
    }

    let filteredContacts = contacts;

    if (query.events && query.events.length > 0) {
      query.events.map((e) => {
        filteredContacts = filteredContacts.filter((c) =>
          c.triggers.some((t) => t.eventId === e)
        );
      });
    }

    if (query.last) {
      filteredContacts = filteredContacts.filter((c) => {
        if (c.triggers.length === 0) {
          return false;
        }

        const lastTrigger = c.triggers.sort((a, b) =>
          a.createdAt > b.createdAt ? -1 : 1
        );

        if (lastTrigger.length === 0) {
          return false;
        }

        return dayjs(lastTrigger[0].createdAt).isAfter(
          dayjs().subtract(1, query.last)
        );
      });
    }

    if (query.notevents && query.notevents.length > 0 && query.notlast) {
      query.notevents.map((e) => {
        filteredContacts = filteredContacts.filter((c) => {
          if (c.triggers.length === 0) {
            return true;
          }

          const lastTrigger = c.triggers
            .filter((t) => t.eventId === e)
            .sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1));

          if (lastTrigger.length === 0) {
            return true;
          }

          return dayjs(lastTrigger[0].createdAt).isAfter(
            dayjs().subtract(1, query.last)
          );
        });
      });
    } else if (query.notevents && query.notevents.length > 0) {
      query.notevents.map((e) => {
        filteredContacts = filteredContacts.filter((c) =>
          c.triggers.every((t) => t.eventId !== e)
        );
      });
    } else if (query.notlast) {
      filteredContacts = filteredContacts.filter((c) => {
        if (c.triggers.length === 0) {
          return true;
        }

        const lastTrigger = c.triggers.sort((a, b) =>
          a.createdAt > b.createdAt ? -1 : 1
        );

        if (lastTrigger.length === 0) {
          return true;
        }

        return !dayjs(lastTrigger[0].createdAt).isAfter(
          dayjs().subtract(1, query.notlast)
        );
      });
    }

    if (query.metadataFilter) {
      filteredContacts = filterContactsByMetadata(
        filteredContacts,
        query.metadataFilter
      );
    }

    return filteredContacts;
  }, [contacts, query]);
}
