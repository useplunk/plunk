import {BubbleMenu, BubbleMenuProps} from '@tiptap/react';
import cx from 'classnames';
import {FC, useState} from 'react';
import {BoldIcon, ItalicIcon, StrikethroughIcon} from 'lucide-react';

import {NodeSelector} from './NodeSelector';
import {ColorSelector} from './ColorSelector';

export interface BubbleMenuItem {
  name: string;
  isActive: () => boolean;
  command: () => void;
  icon: typeof BoldIcon;
}

type EditorBubbleMenuProps = Omit<BubbleMenuProps, 'children'> & {
  items: BubbleMenuItem[];
};

export const EditorBubbleMenu: FC<EditorBubbleMenuProps> = props => {
  const items: BubbleMenuItem[] = [
    {
      name: 'bold',
      isActive: () => props.editor?.isActive('bold') ?? false,
      command: () => props.editor?.chain().focus().toggleBold().run(),
      icon: BoldIcon,
    },
    {
      name: 'italic',
      isActive: () => props.editor?.isActive('italic') ?? false,
      command: () => props.editor?.chain().focus().toggleItalic().run(),
      icon: ItalicIcon,
    },

    {
      name: 'strike',
      isActive: () => props.editor?.isActive('strike') ?? false,
      command: () => props.editor?.chain().focus().toggleStrike().run(),
      icon: StrikethroughIcon,
    },
    ...props.items,
  ];

  const bubbleMenuProps: EditorBubbleMenuProps = {
    ...props,
    shouldShow: ({editor}) => {
      // don't show if image is selected
      if (editor.isActive('image')) {
        return false;
      }
      return editor.view.state.selection.content().size > 0;
    },
    tippyOptions: {
      moveTransition: 'transform 0.15s ease-out',
      onHidden: () => {
        setIsNodeSelectorOpen(false);
        setIsColorSelectorOpen(false);
      },
    },
  };

  const [isNodeSelectorOpen, setIsNodeSelectorOpen] = useState(false);
  const [isColorSelectorOpen, setIsColorSelectorOpen] = useState(false);

  return (
    <BubbleMenu
      {...bubbleMenuProps}
      className="flex overflow-hidden rounded border border-neutral-200 bg-white shadow-xl"
    >
      {props.editor && (
        <NodeSelector editor={props.editor} isOpen={isNodeSelectorOpen} setIsOpen={setIsNodeSelectorOpen} />
      )}

      {items.map((item, index) => (
        <button
          key={index}
          onClick={e => {
            e.preventDefault();
            item.command();
          }}
          className="p-2 text-neutral-600 hover:bg-neutral-100 active:bg-neutral-200"
        >
          <item.icon
            className={cx('h-4 w-4', {
              'text-blue-500': item.isActive(),
            })}
          />
        </button>
      ))}

      {props.editor && (
        <ColorSelector editor={props.editor} isOpen={isColorSelectorOpen} setIsOpen={setIsColorSelectorOpen} />
      )}
    </BubbleMenu>
  );
};
