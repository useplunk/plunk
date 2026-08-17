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
  Image as ImageIcon,
  Italic,
  Link,
  List,
  ListOrdered,
  Palette,
  Quote,
  Redo,
  Strikethrough,
  Underline as UnderlineIcon,
  Undo,
} from 'lucide-react';
import {Button, Input} from '@plunk/ui';
import {useCallback, useState} from 'react';
import {EDITOR_COLOR_GROUPS} from '../../lib/editorColors';

interface ToolbarProps {
  editor: Editor | null;
}

export function MarkdownEmailToolbar({editor}: ToolbarProps) {
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [selectedColor, setSelectedColor] = useState('#000000');
  const [customColor, setCustomColor] = useState('');
  const [showImageInput, setShowImageInput] = useState(false);
  const [imageUrl, setImageUrl] = useState('');

  // Factory function to create editor command handlers
  const createCommandHandler = useCallback(
    (command: (editor: Editor) => void) => () => {
      if (!editor) return;
      command(editor);
    },
    [editor],
  );

  // Complex handlers that need state management
  const addLink = useCallback(() => {
    if (!editor || !linkUrl) return;
    if (editor.isActive('link')) {
      editor.chain().focus().extendMarkRange('link').setLink({href: linkUrl}).run();
    } else {
      editor.chain().focus().setLink({href: linkUrl}).run();
    }
    setLinkUrl('');
    setShowLinkInput(false);
  }, [editor, linkUrl]);

  const removeLink = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().unsetLink().run();
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

  const toggleLinkInput = useCallback(() => {
    if (!editor) return;
    if (editor.isActive('link')) {
      const previousUrl = editor.getAttributes('link').href || '';
      setLinkUrl(previousUrl);
      setShowLinkInput(true);
    } else {
      setShowLinkInput(!showLinkInput);
      setLinkUrl('');
    }
  }, [editor, showLinkInput]);

  const addImage = useCallback(() => {
    if (!editor || !imageUrl) return;
    editor.chain().focus().setImage({src: imageUrl}).run();
    setImageUrl('');
    setShowImageInput(false);
  }, [editor, imageUrl]);

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
          onClick={createCommandHandler(ed => ed.chain().focus().undo().run())}
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
          onClick={createCommandHandler(ed => ed.chain().focus().redo().run())}
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
          onClick={createCommandHandler(ed => ed.chain().focus().toggleBold().run())}
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
          onClick={createCommandHandler(ed => ed.chain().focus().toggleItalic().run())}
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
          onClick={createCommandHandler(ed => ed.chain().focus().toggleUnderline().run())}
          data-active={editor.isActive('underline')}
          className="h-8 w-8 data-[active=true]:bg-neutral-200"
        >
          <UnderlineIcon className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onMouseDown={e => e.preventDefault()}
          onClick={createCommandHandler(ed => ed.chain().focus().toggleStrike().run())}
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
          onClick={createCommandHandler(ed => ed.chain().focus().toggleCode().run())}
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
          onClick={createCommandHandler(ed => ed.chain().focus().toggleHeading({level: 1}).run())}
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
          onClick={createCommandHandler(ed => ed.chain().focus().toggleHeading({level: 2}).run())}
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
          onClick={createCommandHandler(ed => ed.chain().focus().toggleHeading({level: 3}).run())}
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
          onClick={createCommandHandler(ed => ed.chain().focus().toggleBulletList().run())}
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
          onClick={createCommandHandler(ed => ed.chain().focus().toggleOrderedList().run())}
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
          onClick={createCommandHandler(ed => ed.chain().focus().toggleBlockquote().run())}
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
          onClick={createCommandHandler(ed => ed.chain().focus().setTextAlign('left').run())}
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
          onClick={createCommandHandler(ed => ed.chain().focus().setTextAlign('center').run())}
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
          onClick={createCommandHandler(ed => ed.chain().focus().setTextAlign('right').run())}
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
          onClick={createCommandHandler(ed => ed.chain().focus().setTextAlign('justify').run())}
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
          onClick={() => setShowColorPicker(!showColorPicker)}
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
              {EDITOR_COLOR_GROUPS.map(group => (
                <div key={group.name}>
                  <label className="text-xs font-medium text-neutral-600 mb-1.5 block">{group.name}</label>
                  <div className="grid grid-cols-7 gap-1.5">
                    {group.colors.map(color => (
                      <button
                        key={color}
                        type="button"
                        onMouseDown={e => e.preventDefault()}
                        onClick={() => {
                          setColor(color);
                          setShowColorPicker(false);
                        }}
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
                    ))}
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
          onClick={toggleLinkInput}
          data-active={editor.isActive('link')}
          className="h-8 w-8 data-[active=true]:bg-neutral-200"
        >
          <Link className="h-4 w-4" />
        </Button>
        {showLinkInput && (
          <div className="absolute top-10 right-0 bg-white border border-neutral-200 rounded-lg shadow-lg p-2 z-50 min-w-max">
            <div className="flex gap-2 mb-2">
              <input
                type="url"
                value={linkUrl}
                onChange={e => setLinkUrl(e.target.value)}
                placeholder="https://example.com"
                className="px-2 py-1 text-ui border border-neutral-200 rounded w-64"
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
                {editor.isActive('link') ? 'Update' : 'Add'}
              </Button>
            </div>
            {editor.isActive('link') && (
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
      <div className="relative">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onMouseDown={e => e.preventDefault()}
          onClick={() => setShowImageInput(!showImageInput)}
          className="h-8 w-8"
        >
          <ImageIcon className="h-4 w-4" />
        </Button>
        {showImageInput && (
          <div className="absolute top-10 right-0 bg-white border border-neutral-200 rounded-lg shadow-lg p-2 z-50 min-w-max">
            <div className="flex gap-2">
              <input
                type="url"
                value={imageUrl}
                onChange={e => setImageUrl(e.target.value)}
                placeholder="https://example.com/image.jpg"
                className="px-2 py-1 text-ui border border-neutral-200 rounded w-64"
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    addImage();
                  } else if (e.key === 'Escape') {
                    setShowImageInput(false);
                    setImageUrl('');
                  }
                }}
                autoFocus
              />
              <Button type="button" size="sm" onMouseDown={e => e.preventDefault()} onClick={addImage}>
                Add
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
