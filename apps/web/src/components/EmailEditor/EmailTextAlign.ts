import {TextAlign} from '@tiptap/extension-text-align';

import {parseImageAlignment} from './ResizableImage';

/**
 * TextAlign as the email editor uses it. Images take part too (see ResizableImage), so the
 * alignment buttons and shortcuts align a selected image, or every image in a selection.
 * An image only keeps centre or right: left is how it renders anyway, so it is stored as no
 * alignment, and justify is not applied to it at all — otherwise justifying a selection would
 * silently pull every centred image in it back to the left.
 */
export const EmailTextAlign = TextAlign.extend({
  addGlobalAttributes() {
    return [
      // TextAlign's own `text-align` attribute, for text.
      ...(this.parent?.() ?? []).map(attributes => ({
        ...attributes,
        types: this.options.types.filter(type => type !== 'image'),
      })),
      // An image's alignment lives on the paragraph that wraps it, which ResizableImage renders;
      // `text-align` on the <img> itself would do nothing.
      {
        types: ['image'],
        attributes: {
          textAlign: {default: null, parseHTML: parseImageAlignment, renderHTML: () => ({})},
        },
      },
    ];
  },

  addCommands() {
    return {
      ...this.parent?.(),
      setTextAlign:
        (alignment: string) =>
        ({commands}) => {
          if (!this.options.alignments.includes(alignment)) {
            return false;
          }

          return this.options.types
            .map(type => {
              if (type !== 'image') {
                return commands.updateAttributes(type, {textAlign: alignment});
              }
              if (alignment === 'justify') {
                return false;
              }
              return commands.updateAttributes(type, {textAlign: alignment === 'left' ? null : alignment});
            })
            .some(response => response);
        },
    };
  },
}).configure({
  types: ['heading', 'paragraph', 'image'],
  alignments: ['left', 'center', 'right', 'justify'],
});
