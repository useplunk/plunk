import {describe, expect, it} from 'vitest';
import {pickActiveProject} from '../activeProject';

const first = {id: 'project-1'};
const second = {id: 'project-2'};
const projects = [first, second];

describe('pickActiveProject', () => {
  it('returns null while there are no projects', () => {
    expect(pickActiveProject([], null)).toBeNull();
    expect(pickActiveProject([], 'project-1')).toBeNull();
  });

  it('keeps the stored project without persisting it again', () => {
    expect(pickActiveProject(projects, 'project-2')).toEqual({project: second, persist: false});
  });

  // Right after login the stored id has been cleared: requests made before this point
  // went out without X-Project-Id, so the caller must persist the id and fetch again
  it('falls back to the first project and asks to persist it when nothing is stored', () => {
    expect(pickActiveProject(projects, null)).toEqual({project: first, persist: true});
  });

  it('treats an empty stored id as nothing stored', () => {
    expect(pickActiveProject(projects, '')).toEqual({project: first, persist: true});
  });

  // The user may have been removed from the stored project: requests used a stale id
  it('falls back to the first project and asks to persist it when the stored one is gone', () => {
    expect(pickActiveProject(projects, 'project-removed')).toEqual({project: first, persist: true});
  });
});
