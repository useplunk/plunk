import {type Editor} from '@tiptap/react';
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Code,
  Heading1,
  Heading2,
  Heading3,
  Image,
  Italic,
  Link,
  List,
  ListOrdered,
  Palette,
  Quote,
  Redo,
  Strikethrough,
  Undo,
  Variable,
} from 'lucide-react';
import {Button, Input} from '@plunk/ui';
import {useCallback, useEffect, useState} from 'react';

interface ToolbarProps {
  editor: Editor | null;
  onInsertVariable: () => void;
  onInsertImage: () => void;
  canUploadImages: boolean;
}

export function Toolbar({editor, onInsertVariable, onInsertImage, canUploadImages}: ToolbarProps) {
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [selectedColor, setSelectedColor] = useState('#000000');
  const [customColor, setCustomColor] = useState('');
  const [, forceUpdate] = useState({});

  // Force re-render when editor state changes
  useEffect(() => {
    if (!editor) return;

    const updateHandler = () => {
      forceUpdate({});
    };

    editor.on('selectionUpdate', updateHandler);
    editor.on('transaction', updateHandler);

    return () => {
      editor.off('selectionUpdate', updateHandler);
      editor.off('transaction', updateHandler);
    };
  }, [editor]);

  // Define all callbacks BEFORE conditional return (Rules of Hooks)
  const addLink = useCallback(() => {
    if (!editor) return;
    if (linkUrl) {
      if (editor.isActive('image')) {
        // Set link on selected image
        (editor.chain().focus() as any).setImageLink(linkUrl).run();
      } else if (editor.isActive('link')) {
        // Update existing text link
        editor.chain().focus().extendMarkRange('link').setLink({href: linkUrl}).run();
      } else {
        // Set new text link
        editor.chain().focus().setLink({href: linkUrl}).run();
      }
      setLinkUrl('');
      setShowLinkInput(false);
    }
  }, [editor, linkUrl]);

  const removeLink = useCallback(() => {
    if (!editor) return;
    if (editor.isActive('image')) {
      // Remove link from selected image
      (editor.chain().focus() as any).removeImageLink().run();
    } else {
      editor.chain().focus().unsetLink().run();
    }
    setLinkUrl('');
    setShowLinkInput(false);
  }, [editor]);

  const setColor = useCallback(
    (color: string) => {
      if (!editor) return;
      editor.chain().focus().setColor(color).run();
      setSelectedColor(color);
    },
    [editor],
  );

  const applyCustomColor = useCallback(() => {
    if (customColor && /^#[0-9A-F]{6}$/i.test(customColor)) {
      setColor(customColor);
      setCustomColor('');
      setShowColorPicker(false);
    }
  }, [customColor, setColor]);

  // Editor command callbacks (memoized to avoid recreating on every render)
  const handleUndo = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().undo().run();
  }, [editor]);
  const handleRedo = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().redo().run();
  }, [editor]);
  const handleBold = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().toggleBold().run();
  }, [editor]);
  const handleItalic = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().toggleItalic().run();
  }, [editor]);
  const handleStrike = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().toggleStrike().run();
  }, [editor]);
  const handleCode = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().toggleCode().run();
  }, [editor]);
  const handleHeading1 = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().toggleHeading({level: 1}).run();
  }, [editor]);
  const handleHeading2 = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().toggleHeading({level: 2}).run();
  }, [editor]);
  const handleHeading3 = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().toggleHeading({level: 3}).run();
  }, [editor]);
  const handleBulletList = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().toggleBulletList().run();
  }, [editor]);
  const handleOrderedList = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().toggleOrderedList().run();
  }, [editor]);
  const handleBlockquote = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().toggleBlockquote().run();
  }, [editor]);
  const handleAlignLeft = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().setTextAlign('left').run();
  }, [editor]);
  const handleAlignCenter = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().setTextAlign('center').run();
  }, [editor]);
  const handleAlignRight = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().setTextAlign('right').run();
  }, [editor]);
  const handleAlignJustify = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().setTextAlign('justify').run();
  }, [editor]);
  const handleToggleColorPicker = useCallback(() => setShowColorPicker(!showColorPicker), [showColorPicker]);
  const handleToggleLinkInput = useCallback(() => {
    if (!editor) return;
    if (editor.isActive('image')) {
      // Get the current image link URL if it exists
      const imageHref = editor.getAttributes('image').href || '';
      setLinkUrl(imageHref);
      setShowLinkInput(true);
    } else if (editor.isActive('link')) {
      // Get the current text link URL and show the input to edit it
      const previousUrl = editor.getAttributes('link').href || '';
      setLinkUrl(previousUrl);
      setShowLinkInput(true);
    } else {
      setShowLinkInput(!showLinkInput);
      setLinkUrl('');
    }
  }, [editor, showLinkInput]);

  // Tailwind color palette organized by hue
  const colorGroups = [
    {
      name: 'Neutrals',
      colors: ['#000000', '#374151', '#6B7280', '#9CA3AF', '#D1D5DB', '#F3F4F6', '#FFFFFF'],
    },
    {
      name: 'Reds',
      colors: ['#7F1D1D', '#991B1B', '#DC2626', '#EF4444', '#F87171', '#FCA5A5', '#FEE2E2'],
    },
    {
      name: 'Oranges',
      colors: ['#7C2D12', '#C2410C', '#EA580C', '#F97316', '#FB923C', '#FDBA74', '#FED7AA'],
    },
    {
      name: 'Yellows',
      colors: ['#713F12', '#A16207', '#CA8A04', '#EAB308', '#FACC15', '#FDE047', '#FEF08A'],
    },
    {
      name: 'Greens',
      colors: ['#14532D', '#15803D', '#16A34A', '#22C55E', '#4ADE80', '#86EFAC', '#BBF7D0'],
    },
    {
      name: 'Blues',
      colors: ['#1E3A8A', '#1D4ED8', '#2563EB', '#3B82F6', '#60A5FA', '#93C5FD', '#DBEAFE'],
    },
    {
      name: 'Purples',
      colors: ['#581C87', '#6B21A8', '#7C3AED', '#8B5CF6', '#A78BFA', '#C4B5FD', '#E9D5FF'],
    },
    {
      name: 'Pinks',
      colors: ['#831843', '#9F1239', '#DB2777', '#EC4899', '#F472B6', '#F9A8D4', '#FBCFE8'],
    },
  ];

  // Conditional return AFTER all hooks (Rules of Hooks)
  if (!editor) {
    return null;
  }

  return (
    <div className="border-b border-neutral-200 bg-neutral-50 p-2 flex flex-wrap gap-1 sticky top-0 z-40">
      {/* History */}
      <div className="flex gap-0.5 pr-2 border-r border-neutral-200">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onMouseDown={e => e.preventDefault()}
          onClick={handleUndo}
          disabled={!editor.can().undo()}
          className="h-8 w-8"
        >
          <Undo className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onMouseDown={e => e.preventDefault()}
          onClick={handleRedo}
          disabled={!editor.can().redo()}
          className="h-8 w-8"
        >
          <Redo className="h-4 w-4" />
        </Button>
      </div>

      {/* Text formatting */}
      <div className="flex gap-0.5 pr-2 border-r border-neutral-200">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onMouseDown={e => e.preventDefault()}
          onClick={handleBold}
          data-active={editor.isActive('bold')}
          className="h-8 w-8 data-[active=true]:bg-neutral-200"
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onMouseDown={e => e.preventDefault()}
          onClick={handleItalic}
          data-active={editor.isActive('italic')}
          className="h-8 w-8 data-[active=true]:bg-neutral-200"
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onMouseDown={e => e.preventDefault()}
          onClick={handleStrike}
          data-active={editor.isActive('strike')}
          className="h-8 w-8 data-[active=true]:bg-neutral-200"
        >
          <Strikethrough className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onMouseDown={e => e.preventDefault()}
          onClick={handleCode}
          data-active={editor.isActive('code')}
          className="h-8 w-8 data-[active=true]:bg-neutral-200"
        >
          <Code className="h-4 w-4" />
        </Button>
      </div>

      {/* Headings */}
      <div className="flex gap-0.5 pr-2 border-r border-neutral-200">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onMouseDown={e => e.preventDefault()}
          onClick={handleHeading1}
          data-active={editor.isActive('heading', {level: 1})}
          className="h-8 w-8 data-[active=true]:bg-neutral-200"
        >
          <Heading1 className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onMouseDown={e => e.preventDefault()}
          onClick={handleHeading2}
          data-active={editor.isActive('heading', {level: 2})}
          className="h-8 w-8 data-[active=true]:bg-neutral-200"
        >
          <Heading2 className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onMouseDown={e => e.preventDefault()}
          onClick={handleHeading3}
          data-active={editor.isActive('heading', {level: 3})}
          className="h-8 w-8 data-[active=true]:bg-neutral-200"
        >
          <Heading3 className="h-4 w-4" />
        </Button>
      </div>

      {/* Lists */}
      <div className="flex gap-0.5 pr-2 border-r border-neutral-200">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onMouseDown={e => e.preventDefault()}
          onClick={handleBulletList}
          data-active={editor.isActive('bulletList')}
          className="h-8 w-8 data-[active=true]:bg-neutral-200"
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onMouseDown={e => e.preventDefault()}
          onClick={handleOrderedList}
          data-active={editor.isActive('orderedList')}
          className="h-8 w-8 data-[active=true]:bg-neutral-200"
        >
          <ListOrdered className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onMouseDown={e => e.preventDefault()}
          onClick={handleBlockquote}
          data-active={editor.isActive('blockquote')}
          className="h-8 w-8 data-[active=true]:bg-neutral-200"
        >
          <Quote className="h-4 w-4" />
        </Button>
      </div>

      {/* Alignment */}
      <div className="flex gap-0.5 pr-2 border-r border-neutral-200">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onMouseDown={e => e.preventDefault()}
          onClick={handleAlignLeft}
          data-active={editor.isActive({textAlign: 'left'})}
          className="h-8 w-8 data-[active=true]:bg-neutral-200"
        >
          <AlignLeft className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onMouseDown={e => e.preventDefault()}
          onClick={handleAlignCenter}
          data-active={editor.isActive({textAlign: 'center'})}
          className="h-8 w-8 data-[active=true]:bg-neutral-200"
        >
          <AlignCenter className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onMouseDown={e => e.preventDefault()}
          onClick={handleAlignRight}
          data-active={editor.isActive({textAlign: 'right'})}
          className="h-8 w-8 data-[active=true]:bg-neutral-200"
        >
          <AlignRight className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onMouseDown={e => e.preventDefault()}
          onClick={handleAlignJustify}
          data-active={editor.isActive({textAlign: 'justify'})}
          className="h-8 w-8 data-[active=true]:bg-neutral-200"
        >
          <AlignJustify className="h-4 w-4" />
        </Button>
      </div>

      {/* Color picker */}
      <div className="relative pr-2 border-r border-neutral-200">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onMouseDown={e => e.preventDefault()}
          onClick={handleToggleColorPicker}
          className="h-8 w-8"
        >
          <Palette className="h-4 w-4" />
        </Button>
        {showColorPicker && (
          <div
            className="absolute top-10 left-0 bg-white border border-neutral-200 rounded-lg shadow-lg p-3 z-50 max-h-96 overflow-y-auto"
            style={{width: '280px'}}
          >
            {/* Custom color input */}
            <div className="mb-3 pb-3 border-b border-neutral-200">
              <label className="text-xs font-medium text-neutral-600 mb-1 block">Custom Color</label>
              <div className="flex gap-2">
                <Input
                  type="text"
                  value={customColor}
                  onChange={e => setCustomColor(e.target.value.toUpperCase())}
                  placeholder="#000000"
                  className="h-8 text-xs font-mono"
                  maxLength={7}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      applyCustomColor();
                    }
                  }}
                />
                <Button
                  type="button"
                  size="sm"
                  onMouseDown={e => e.preventDefault()}
                  onClick={applyCustomColor}
                  disabled={!customColor || !/^#[0-9A-F]{6}$/i.test(customColor)}
                  className="h-8"
                >
                  Apply
                </Button>
              </div>
            </div>

            {/* Color palette */}
            <div className="space-y-3">
              {colorGroups.map(group => (
                <div key={group.name}>
                  <label className="text-xs font-medium text-neutral-600 mb-1.5 block">{group.name}</label>
                  <div className="grid grid-cols-7 gap-1.5">
                    {group.colors.map(color => {
                      const handleColorClick = () => {
                        setColor(color);
                        setShowColorPicker(false);
                      };
                      return (
                        <button
                          key={color}
                          type="button"
                          onMouseDown={e => e.preventDefault()}
                          onClick={handleColorClick}
                          className="w-8 h-8 rounded border-2 border-neutral-300 hover:border-neutral-500 hover:scale-105 transition-all relative group"
                          style={{backgroundColor: color}}
                          title={color}
                        >
                          {selectedColor === color && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="w-2 h-2 rounded-full bg-white shadow-lg" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Link */}
      <div className="relative pr-2 border-r border-neutral-200">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onMouseDown={e => e.preventDefault()}
          onClick={handleToggleLinkInput}
          data-active={editor.isActive('link') || (editor.isActive('image') && !!editor.getAttributes('image').href)}
          className="h-8 w-8 data-[active=true]:bg-neutral-200"
        >
          <Link className="h-4 w-4" />
        </Button>
        {showLinkInput && (
          <div className="absolute top-10 right-0 bg-white border border-neutral-200 rounded-lg shadow-lg p-2 z-50 min-w-max">
            {editor.isActive('image') && (
              <p className="text-xs text-neutral-500 mb-1.5 px-1">Add link to image</p>
            )}
            <div className="flex gap-2 mb-2">
              <input
                type="url"
                value={linkUrl}
                onChange={e => setLinkUrl(e.target.value)}
                placeholder="https://example.com"
                className="px-2 py-1 text-sm border border-neutral-200 rounded w-64"
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    addLink();
                  } else if (e.key === 'Escape') {
                    setShowLinkInput(false);
                    setLinkUrl('');
                  }
                }}
                autoFocus
              />
              <Button type="button" size="sm" onMouseDown={e => e.preventDefault()} onClick={addLink}>
                {editor.isActive('link') || (editor.isActive('image') && editor.getAttributes('image').href)
                  ? 'Update'
                  : 'Add'}
              </Button>
            </div>
            {(editor.isActive('link') || (editor.isActive('image') && editor.getAttributes('image').href)) && (
              <div className="flex justify-end">
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  onMouseDown={e => e.preventDefault()}
                  onClick={removeLink}
                >
                  Remove Link
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Image */}
      <div className="flex gap-0.5 pr-2 border-r border-neutral-200">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onMouseDown={e => e.preventDefault()}
          onClick={onInsertImage}
          disabled={!canUploadImages}
          className="h-8 w-8"
          title={canUploadImages ? 'Insert image' : 'Storage not configured'}
        >
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          <Image className="h-4 w-4" />
        </Button>
      </div>

      {/* Variable */}
      <div className="flex gap-0.5">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onMouseDown={e => e.preventDefault()}
          onClick={onInsertVariable}
          className="h-8 w-8"
          title="Insert variable"
        >
          <Variable className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
