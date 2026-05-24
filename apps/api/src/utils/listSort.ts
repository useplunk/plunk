/**
 * Shared sort-query parsing for list endpoints.
 *
 * Accepts `?sort=name|createdAt|updatedAt&dir=asc|desc` on list endpoints and
 * returns a `{field, direction}` shape that maps directly onto a Prisma
 * `orderBy` clause. Invalid values silently fall back to the supplied default
 * so existing callers keep their current behavior.
 */

export type ListSortField = 'name' | 'createdAt' | 'updatedAt';
export type ListSortDirection = 'asc' | 'desc';

export interface ListSort {
  field: ListSortField;
  direction: ListSortDirection;
}

const ALLOWED_FIELDS = new Set<ListSortField>(['name', 'createdAt', 'updatedAt']);
const ALLOWED_DIRECTIONS = new Set<ListSortDirection>(['asc', 'desc']);

/**
 * Parse `sort` and `dir` query-string values into a typed sort descriptor.
 * Unknown or missing values fall back to `defaultSort`.
 */
export function parseListSort(sortRaw: unknown, dirRaw: unknown, defaultSort: ListSort): ListSort {
  const sort =
    typeof sortRaw === 'string' && ALLOWED_FIELDS.has(sortRaw as ListSortField)
      ? (sortRaw as ListSortField)
      : defaultSort.field;
  const dir =
    typeof dirRaw === 'string' && ALLOWED_DIRECTIONS.has(dirRaw as ListSortDirection)
      ? (dirRaw as ListSortDirection)
      : defaultSort.direction;
  return {field: sort, direction: dir};
}
