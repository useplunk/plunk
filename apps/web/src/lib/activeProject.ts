export interface ActiveProjectChoice<T> {
  project: T;
  persist: boolean;
}

/**
 * Picks the project to activate once the user's projects have loaded.
 *
 * `persist` is true when the stored id is missing (e.g. after signing out, or in a new browser)
 * or no longer points at one of the user's projects. The caller then has to store the new id,
 * which network.ts sends as X-Project-Id, and fetch again whatever was requested without it.
 */
export function pickActiveProject<T extends {id: string}>(
  projects: T[],
  storedProjectId: string | null,
): ActiveProjectChoice<T> | null {
  const fallback = projects[0];
  if (!fallback) return null;

  const stored = storedProjectId ? projects.find(p => p.id === storedProjectId) : undefined;
  if (stored) return {project: stored, persist: false};

  return {project: fallback, persist: true};
}
