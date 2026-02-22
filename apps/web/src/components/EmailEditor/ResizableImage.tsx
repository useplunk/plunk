/* eslint-disable @typescript-eslint/no-explicit-any */
import {mergeAttributes, Node} from '@tiptap/core';
import {NodeViewWrapper, type ReactNodeViewProps, ReactNodeViewRenderer} from '@tiptap/react';
import {Link as LinkIcon} from 'lucide-react';
import {useEffect, useRef, useState} from 'react';

interface ImageAttrs {
  src: string;
  alt?: string;
  title?: string;
  width?: number | string;
  height?: number | string;
  href?: string | null;
}

function ResizableImageComponent({node, updateAttributes, selected}: ReactNodeViewProps) {
  const attrs = node.attrs as ImageAttrs;
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

      // Calculate new dimensions based on resize direction
      if (resizeDirection.includes('e')) {
        newWidth = startSize.current.width + deltaX;
      } else if (resizeDirection.includes('w')) {
        newWidth = startSize.current.width - deltaX;
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
  }, [isResizing, resizeDirection, updateAttributes]);

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

  const {src, alt, title, width, height, href} = attrs;

  return (
    <NodeViewWrapper className="resizable-image-wrapper">
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
        {/* Link indicator badge */}
        {href && selected && (
          <div
            style={{
              position: 'absolute',
              top: '4px',
              left: '4px',
              backgroundColor: '#3b82f6',
              color: 'white',
              borderRadius: '4px',
              padding: '2px 6px',
              fontSize: '11px',
              display: 'flex',
              alignItems: 'center',
              gap: '3px',
              zIndex: 10,
              pointerEvents: 'none',
              boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
            }}
          >
            <LinkIcon style={{width: '10px', height: '10px'}} />
            Linked
          </div>
        )}
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
      },
      alt: {
        default: null,
      },
      title: {
        default: null,
      },
      width: {
        default: null,
        parseHTML: element => {
          const width = element.getAttribute('width');
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
          const height = element.getAttribute('height');
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
      href: {
        default: null,
        parseHTML: element => {
          // When parsing <a href="..."><img></a>, extract href from parent anchor
          const parent = element.parentElement;
          if (parent?.tagName === 'A') {
            return parent.getAttribute('href');
          }
          return null;
        },
        // href is not rendered as an img attribute — it's handled in renderHTML
        renderHTML: () => ({}),
      },
    };
  },

  parseHTML() {
    return [
      {
        // Match images wrapped in anchor tags (higher priority)
        tag: 'a img[src]',
        priority: 60,
        getAttrs: (element: HTMLElement) => {
          const img = element as HTMLImageElement;
          const parent = img.parentElement;
          return {
            src: img.getAttribute('src'),
            alt: img.getAttribute('alt'),
            title: img.getAttribute('title'),
            width: img.getAttribute('width') ? parseInt(img.getAttribute('width')!, 10) : null,
            height: img.getAttribute('height') ? parseInt(img.getAttribute('height')!, 10) : null,
            href: parent?.tagName === 'A' ? parent.getAttribute('href') : null,
          };
        },
      },
      {
        tag: 'img[src]',
      },
    ];
  },

  renderHTML({HTMLAttributes}) {
    const {href, ...imgAttrs} = HTMLAttributes;
    const imgAttributes = mergeAttributes(imgAttrs, {class: 'email-image'});

    if (href) {
      return ['a', {href, target: '_blank', rel: 'noopener noreferrer'}, ['img', imgAttributes]];
    }

    return ['img', imgAttributes];
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
      setImageLink:
        (href: string) =>
        ({commands}: {commands: {updateAttributes: (name: string, attrs: Record<string, unknown>) => boolean}}) => {
          return commands.updateAttributes('image', {href});
        },
      removeImageLink:
        () =>
        ({commands}: {commands: {updateAttributes: (name: string, attrs: Record<string, unknown>) => boolean}}) => {
          return commands.updateAttributes('image', {href: null});
        },
    };
  },
});
