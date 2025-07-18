import {mergeAttributes, Node, wrappingInputRule} from '@tiptap/core';

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

export interface ButtonOptions {
  HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    button: {
      /**
       * Set a blockquote node
       */
      setButton: (attributes: {href: string; color: colors}) => ReturnType;
      /**
       * Toggle a blockquote node
       */
      toggleButton: (attributes: {href: string; color: colors}) => ReturnType;
    };
  }
}

export const inputRegex = /^\s*>\s$/;

export const Button = Node.create<ButtonOptions>({
  name: 'button',
  content: 'text*',
  marks: '',
  group: 'block',
  defining: true,

  addOptions() {
    return {
      HTMLAttributes: {
        class: 'btn',
      },
    };
  },

  addAttributes() {
    return {
      href: {
        default: null,
      },
      color: {
        default: 'blue' as colors,
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'a.btn',
        priority: 51,
      },
    ];
  },

  renderHTML({node, HTMLAttributes}) {
    return [
      'a',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        style: `color: white; background-color: ${
          colorMap[node.attrs.color as colors]
        }; text-align: center; text-decoration: none; padding: 12px; border-radius: 8px; display: block; font-size: 15px; line-height: 20px; font-weight: 600; margin: 9px 0 9px 0;`,
      }),
      0,
    ];
  },

  addCommands() {
    return {
      setButton:
        attributes =>
        ({commands}) => {
          return commands.setNode(this.name, attributes);
        },
      toggleButton:
        attributes =>
        ({commands}) => {
          return commands.toggleNode(this.name, 'paragraph', attributes);
        },
    };
  },

  addInputRules() {
    return [
      wrappingInputRule({
        find: inputRegex,
        type: this.type,
      }),
    ];
  },
});
