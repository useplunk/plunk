import {atom} from 'jotai';

export const atomActiveProject = atom<string | null>(
  typeof window !== 'undefined' ? window.localStorage.getItem('project') : null,
);
