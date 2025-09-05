import {
  filterContactsByMetadata,
  MetadataFilterGroupType,
} from "../../components";
import { Contact, Trigger } from "@prisma/client";
import dayjs from "dayjs";
import { useMemo } from "react";

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
