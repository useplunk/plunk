/**
 * Shared sort-query parsing for list endpoints.
 *
 * Accepts `?sort=name|createdAt|updatedAt&dir=asc|desc` on list endpoints and
 * returns a `{field, direction}` shape that maps directly onto a Prisma
 * `orderBy` clause. Invalid values silently fall back to the supplied default
 * so existing callers keep their current behavior.
 *
 * Callers that expose additional, entity-specific sortable columns (e.g. the
 * workflows list sorting by its `steps` relation count) can opt those fields in
 * via the `extraFields` argument without widening the shared default set.
 */

export type ListSortField = 'name' | 'createdAt' | 'updatedAt';
export type ListSortDirection = 'asc' | 'desc';

export interface ListSort {
  /**
   * A base field name OR an entity-specific extra field opted in by the caller
   * (see `extraFields`). The caller is responsible for mapping any extra field
   * onto a valid Prisma `orderBy` shape.
   */
  field: ListSortField | (string & {});
  direction: ListSortDirection;
}

const ALLOWED_FIELDS = new Set<ListSortField>(['name', 'createdAt', 'updatedAt']);
const ALLOWED_DIRECTIONS = new Set<ListSortDirection>(['asc', 'desc']);

/**
 * Parse `sort` and `dir` query-string values into a typed sort descriptor.
 * Unknown or missing values fall back to `defaultSort`.
 *
 * @param extraFields Optional entity-specific field names to also accept (e.g.
 *   `['steps']` for workflows). These bypass the shared allow-list but are still
 *   validated against this explicit per-caller set, so arbitrary client input
 *   can never reach the Prisma `orderBy`.
 */
export function parseListSort(
  sortRaw: unknown,
  dirRaw: unknown,
  defaultSort: ListSort,
  extraFields: readonly string[] = [],
): ListSort {
  const isAllowed =
    typeof sortRaw === 'string' &&
    (ALLOWED_FIELDS.has(sortRaw as ListSortField) || extraFields.includes(sortRaw));
  const sort = isAllowed ? (sortRaw as ListSort['field']) : defaultSort.field;
  const dir = typeof dirRaw === 'string' && ALLOWED_DIRECTIONS.has(dirRaw as ListSortDirection)
    ? (dirRaw as ListSortDirection)
    : defaultSort.direction;
  return {field: sort, direction: dir};
}
