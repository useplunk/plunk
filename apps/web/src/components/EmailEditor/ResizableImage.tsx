/* eslint-disable @typescript-eslint/no-explicit-any */
import {mergeAttributes, Node} from '@tiptap/core';
import {NodeViewWrapper, type ReactNodeViewProps, ReactNodeViewRenderer} from '@tiptap/react';
import {useEffect, useRef, useState} from 'react';

interface ImageAttrs {
  src: string;
  alt?: string;
  title?: string;
  width?: number | string;
  height?: number | string;
  textAlign?: string | null;
}

type ImageAlignment = 'center' | 'right';

// An aligned image is wrapped in <p style="text-align: …"> (see renderHTML). The inline
// `display: block` and margins align it in clients that support them, with or without the
// email wrapper's `.prose img` styles; classic Outlook for Windows ignores both on images and
// aligns it through the paragraph's `text-align` instead.
const ALIGNED_IMAGE_STYLES: Record<ImageAlignment, string> = {
  center: 'display: block; margin-left: auto; margin-right: auto',
  right: 'display: block; margin-left: auto; margin-right: 0',
};

// Only centre and right change how an image is laid out (see EmailTextAlign); anything else
// renders left, as images always have.
function imageAlignment(textAlign: unknown): ImageAlignment | null {
  return textAlign === 'center' || textAlign === 'right' ? textAlign : null;
}

// Reads back what renderHTML writes: only the wrapping paragraph carries an image's alignment.
// `text-align` anywhere else, the <img> itself included, never moved the image and still doesn't.
export function parseImageAlignment(element: HTMLElement): ImageAlignment | null {
  return element.matches('p') ? imageAlignment(element.style.textAlign) : null;
}

// How an aligned image is serialised: a paragraph holding that image and nothing else, so
// claiming it can never drop text or Liquid tags. A non-breaking space counts as content (it is
// often a deliberate spacer). A list item must open with a paragraph, so the paragraph it opens
// with is left alone: claiming it would push the image, and the rest of the list, out of it.
function isWrappedImage(element: HTMLElement): boolean {
  if (element.parentElement?.tagName === 'LI' && !element.previousElementSibling) {
    return false;
  }

  return (
    element.childElementCount === 1 &&
    element.firstElementChild!.matches('img[src]') &&
    !/[^ \t\n\r\f]/.test(element.textContent ?? '')
  );
}

// The attributes live on the <img>: the matched element itself, or the only child of the
// paragraph matched by the second parse rule.
function imageElement(element: HTMLElement): Element {
  return element.matches('img') ? element : element.firstElementChild!;
}

function ResizableImageComponent({node, updateAttributes, selected}: ReactNodeViewProps) {
  const attrs = node.attrs as ImageAttrs;
  const alignment = imageAlignment(attrs.textAlign);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeDirection, setResizeDirection] = useState<'se' | 'sw' | 'ne' | 'nw' | null>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const startPos = useRef({x: 0, y: 0});
  const startSize = useRef({width: 0, height: 0});

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!imageRef.current || !resizeDirection) return;

      const deltaX = e.clientX - startPos.current.x;

      let newWidth = startSize.current.width;
      let newHeight = startSize.current.height;

      // A centred image grows on both sides, so the dragged handle only keeps up with the
      // cursor if the width changes by twice the distance moved.
      const growth = alignment === 'center' ? 2 : 1;

      // Calculate new dimensions based on resize direction
      if (resizeDirection.includes('e')) {
        newWidth = startSize.current.width + deltaX * growth;
      } else if (resizeDirection.includes('w')) {
        newWidth = startSize.current.width - deltaX * growth;
      }

      // Maintain aspect ratio
      const aspectRatio = startSize.current.width / startSize.current.height;
      newHeight = newWidth / aspectRatio;

      // Enforce minimum size
      newWidth = Math.max(50, newWidth);
      newHeight = Math.max(50, newHeight);

      updateAttributes({
        width: Math.round(newWidth),
        height: Math.round(newHeight),
      });
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      setResizeDirection(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [alignment, isResizing, resizeDirection, updateAttributes]);

  const handleResizeStart = (e: React.MouseEvent, direction: 'se' | 'sw' | 'ne' | 'nw') => {
    e.preventDefault();
    e.stopPropagation();

    if (!imageRef.current) return;

    const rect = imageRef.current.getBoundingClientRect();
    startPos.current = {x: e.clientX, y: e.clientY};
    startSize.current = {
      width: rect.width,
      height: rect.height,
    };

    setIsResizing(true);
    setResizeDirection(direction);
  };

  const {src, alt, title, width, height} = attrs;

  return (
    <NodeViewWrapper className="resizable-image-wrapper" style={{textAlign: alignment ?? undefined}}>
      <div
        className={`resizable-image-container ${selected ? 'selected' : ''}`}
        style={{display: 'inline-block', position: 'relative', maxWidth: '100%'}}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={imageRef}
          src={src}
          alt={alt || ''}
          title={title || ''}
          width={width}
          height={height}
          className="email-image"
          style={{
            display: 'block',
            maxWidth: '100%',
            height: 'auto',
            width: width ? `${width}px` : 'auto',
          }}
        />
        {selected && (
          <>
            {/* Resize handles */}
            <div
              className="resize-handle resize-handle-se"
              onMouseDown={e => handleResizeStart(e, 'se')}
              style={{
                position: 'absolute',
                bottom: '-4px',
                right: '-4px',
                width: '12px',
                height: '12px',
                backgroundColor: '#3b82f6',
                border: '2px solid white',
                borderRadius: '50%',
                cursor: 'se-resize',
                zIndex: 10,
              }}
            />
            <div
              className="resize-handle resize-handle-sw"
              onMouseDown={e => handleResizeStart(e, 'sw')}
              style={{
                position: 'absolute',
                bottom: '-4px',
                left: '-4px',
                width: '12px',
                height: '12px',
                backgroundColor: '#3b82f6',
                border: '2px solid white',
                borderRadius: '50%',
                cursor: 'sw-resize',
                zIndex: 10,
              }}
            />
            <div
              className="resize-handle resize-handle-ne"
              onMouseDown={e => handleResizeStart(e, 'ne')}
              style={{
                position: 'absolute',
                top: '-4px',
                right: '-4px',
                width: '12px',
                height: '12px',
                backgroundColor: '#3b82f6',
                border: '2px solid white',
                borderRadius: '50%',
                cursor: 'ne-resize',
                zIndex: 10,
              }}
            />
            <div
              className="resize-handle resize-handle-nw"
              onMouseDown={e => handleResizeStart(e, 'nw')}
              style={{
                position: 'absolute',
                top: '-4px',
                left: '-4px',
                width: '12px',
                height: '12px',
                backgroundColor: '#3b82f6',
                border: '2px solid white',
                borderRadius: '50%',
                cursor: 'nw-resize',
                zIndex: 10,
              }}
            />
          </>
        )}
      </div>
    </NodeViewWrapper>
  );
}

export const ResizableImage = Node.create({
  name: 'image',
  group: 'block',
  draggable: true,
  inline: false,

  addAttributes() {
    return {
      src: {
        default: null,
        parseHTML: element => imageElement(element).getAttribute('src'),
      },
      alt: {
        default: null,
        parseHTML: element => imageElement(element).getAttribute('alt'),
      },
      title: {
        default: null,
        parseHTML: element => imageElement(element).getAttribute('title'),
      },
      width: {
        default: null,
        parseHTML: element => {
          const width = imageElement(element).getAttribute('width');
          return width ? parseInt(width, 10) : null;
        },
        renderHTML: attributes => {
          if (!attributes.width) {
            return {};
          }
          return {
            width: attributes.width,
          };
        },
      },
      height: {
        default: null,
        parseHTML: element => {
          const height = imageElement(element).getAttribute('height');
          return height ? parseInt(height, 10) : null;
        },
        renderHTML: attributes => {
          if (!attributes.height) {
            return {};
          }
          return {
            height: attributes.height,
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'img[src]',
      },
      // Ahead of Paragraph's own `p` rule (default priority 50).
      {
        tag: 'p',
        priority: 51,
        getAttrs: element => (isWrappedImage(element) ? null : false),
      },
    ];
  },

  renderHTML({node, HTMLAttributes}) {
    const alignment = imageAlignment(node.attrs.textAlign);

    if (!alignment) {
      return ['img', mergeAttributes(HTMLAttributes, {class: 'email-image'})];
    }

    return [
      'p',
      {style: `text-align: ${alignment}`},
      ['img', mergeAttributes(HTMLAttributes, {class: 'email-image', style: ALIGNED_IMAGE_STYLES[alignment]})],
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageComponent);
  },

  addCommands(): any {
    return {
      setImage:
        (options: {src: string; alt?: string; title?: string; width?: number; height?: number}) =>
        ({commands}: {commands: {insertContent: (content: unknown) => boolean}}) => {
          return commands.insertContent({
            type: this.name,
            attrs: options,
          });
        },
    };
  },
});
