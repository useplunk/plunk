import {Node} from '@tiptap/core';

export type colors = 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'indigo' | 'purple' | 'pink' | 'black';

// Map each color to a tailwind color hex code for 500
const colorMap = {
  red: '#ef4444',
  orange: '#f97316',
  yellow: '#facc15',
  green: '#22c55e',
  blue: '#2563eb',
  indigo: '#6366f1',
  purple: '#8b5cf6',
  pink: '#ec4899',
  black: '#171717',
} as const;

export interface ProgressOptions {
  percent: number;
  color: colors;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    progress: {
      /**
       * Set a heading node
       */
      setProgress: (attributes: {percent: number; color: colors}) => ReturnType;
      /**
       * Toggle a heading node
       */
      toggleProgress: (attributes: {percent: number; color: colors}) => ReturnType;
    };
  }
}

export const Progress = Node.create<ProgressOptions>({
  name: 'progress',

  content: 'inline*',

  group: 'block',

  defining: true,

  addAttributes() {
    return {
      percent: {
        default: 100,
        rendered: false,
      },
      color: {
        default: 'blue' as colors,
        rendered: false,
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'table',
        getAttrs: element => {
          // @ts-ignore
          const percent = element.querySelector('td')?.style.width;
          // @ts-ignore
          const color = element.querySelector('td')?.style.backgroundColor;

          const rgb = color?.slice(4, color.length - 1).split(', ');
          const hex = rgb?.map((value: any) => {
            const hex = Number(value).toString(16);
            return hex.length === 1 ? '0' + hex : hex;
          });

          return {
            percent: Number(percent?.slice(0, percent.length - 1)),
            color: Object.keys(colorMap).find(key => colorMap[key as colors] === `#${hex?.join('')}`) as colors,
          };
        },
      },
    ];
  },

  renderHTML({node}) {
    // Render a progress bar using table elements
    return [
      'table',
      {
        class: 'progress',
        style: `width: 100%; border-radius: 10px;height: 28px;`,
      },
      [
        'tr',
        {
          style: `width: 100%; border-radius: 8px;`,
        },
        // Render two cells, one for the progress bar and one for the percentage
        [
          'td',
          {
            style: `width: ${node.attrs.percent}%; background-color: ${
              colorMap[node.attrs.color as colors]
            }; border-top-left-radius: 8px; border-bottom-left-radius: 8px;`,
          },
        ],
        [
          'td',
          {
            style: `width: ${
              100 - node.attrs.percent
            }%; background-color: #f5f5f5; border-top-right-radius: 8px; border-bottom-right-radius: 8px;`,
          },
        ],
      ],
    ];
  },

  addCommands() {
    return {
      setProgress:
        attributes =>
        ({commands}) => {
          return commands.setNode(this.name, attributes);
        },
      toggleProgress:
        attributes =>
        ({commands}) => {
          return commands.toggleNode(this.name, 'paragraph', attributes);
        },
    };
  },
});
