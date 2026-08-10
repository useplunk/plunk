import type {Contact} from '@plunk/db';
import type {CursorPaginatedResponse, PaginatedResponse} from '@plunk/types';
import useSWR from 'swr';

interface UseContactsOptions {
  limit?: number;
  search?: string;
}

/** A contact field as reported by `GET /contacts/fields`. */
export interface ContactField {
  field: string;
  type: 'string' | 'number' | 'boolean' | 'date';
  /** Percentage of the project's contacts that carry this field. */
  coverage: number;
}

/**
 * Hook to fetch contacts with optional search
 */
export function useContacts(options: UseContactsOptions = {}) {
  const {limit = 50, search} = options;

  const params = new URLSearchParams();
  params.set('limit', limit.toString());
  if (search) {
    params.set('search', search);
  }

  const {data, error, mutate, isLoading} = useSWR<CursorPaginatedResponse<Contact>>(`/contacts?${params.toString()}`, {
    revalidateOnFocus: false,
    dedupingInterval: 10000, // Prevent duplicate requests within 10 seconds
  });

  return {
    contacts: data?.data || [],
    total: data?.total || 0,
    error,
    isLoading,
    mutate,
  };
}

/**
 * Hook to fetch the contacts belonging to a specific segment.
 *
 * Backed by `GET /segments/:id/contacts`, which resolves both STATIC
 * (via SegmentMembership) and DYNAMIC (via condition) segments. Used by the
 * email editor to scope the "Preview as" dropdown to the campaign's selected
 * audience instead of every contact in the project.
 *
 * When `segmentId` is undefined/empty the SWR key is null, so no request is
 * made and an empty list is returned (callers fall back to all contacts).
 */
export function useSegmentContacts(segmentId?: string, pageSize = 50) {
  const {data, error, mutate, isLoading} = useSWR<PaginatedResponse<Contact>>(
    segmentId ? `/segments/${segmentId}/contacts?page=1&pageSize=${pageSize}` : null,
    {
      revalidateOnFocus: false,
      dedupingInterval: 10000, // Prevent duplicate requests within 10 seconds
    },
  );

  return {
    contacts: data?.data ?? [],
    total: data?.total ?? 0,
    error,
    isLoading,
    mutate,
  };
}

/**
 * Hook to fetch available contact fields for variable usage
 */
export function useContactFields() {
  const {data, error, mutate, isLoading} = useSWR<{fields: ContactField[]; count: number}>('/contacts/fields', {
    revalidateOnFocus: false,
    // Cache fields for longer since they don't change often
    dedupingInterval: 60000, // 1 minute
  });

  const fieldDetails = data?.fields || [];
  const fieldNames = fieldDetails.map(f => f.field);

  return {
    fields: fieldNames,
    // The endpoint also returns an inferred type and what share of contacts actually
    // carry each field. The editor's suggestion menus use both: a field only 4% of
    // contacts have is the difference between a working template and a silent blank.
    fieldDetails,
    error,
    isLoading,
    mutate,
  };
}
