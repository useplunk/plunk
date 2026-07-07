import type {AnimatedListItem} from './types';

const DEFAULT_ITEMS: AnimatedListItem[] = [
  {
    name: 'Payment received',
    description: 'Magic UI',
    time: '15m ago',
    icon: '💸',
    color: '#00C9A7',
  },
  {
    name: 'User signed up',
    description: 'Magic UI',
    time: '10m ago',
    icon: '👤',
    color: '#FFB800',
  },
  {
    name: 'New message',
    description: 'Magic UI',
    time: '5m ago',
    icon: '💬',
    color: '#FF3D71',
  },
  {
    name: 'New event',
    description: 'Magic UI',
    time: '2m ago',
    icon: '🗞️',
    color: '#1E86FF',
  },
];

export function createDefaultAnimatedList(): AnimatedListItem[] {
  return DEFAULT_ITEMS.map(item => ({...item}));
}

export {DEFAULT_ITEMS as DEFAULT_ANIMATED_LIST_ITEMS};
