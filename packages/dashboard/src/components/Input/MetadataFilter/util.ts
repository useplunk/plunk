import { Contact } from "@prisma/client";
import { MetadataFilterGroupType, MetadataFilterType } from "./types";

const functionMapping = {
  contains: "includes",
  "starts with": "startsWith",
  "ends with": "endsWith",
  "does not contain": "includes",
  "does not start with": "startsWith",
  "does not end with": "endsWith",
};

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

export function filterContactsByMetadata<T extends Contact>(
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
