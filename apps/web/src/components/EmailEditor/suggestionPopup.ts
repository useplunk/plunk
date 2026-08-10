import tippy, {Instance as TippyInstance, sticky} from 'tippy.js';
import type {SuggestionProps} from '@tiptap/suggestion';

/**
 * The part of a suggestion list the popup needs to drive. Both the `{{` variable list
 * and the `{%` logic list implement this; everything else here is item-agnostic.
 */
export interface SuggestionListView {
  element: HTMLElement;
  update(props: SuggestionProps): void;
  onKeyDown(event: KeyboardEvent): boolean;
  destroy(): void;
}

/**
 * One row. Both menus use the same three slots so inserting a value and inserting a
 * block are recognisably the same gesture: what you are choosing, what it will write,
 * and what the editor knows about it.
 */
export interface SuggestionRow {
  /** What the author is choosing, in their words. Leads the row. */
  label: string;
  /** The Liquid this writes. Secondary — shown so the syntax is learned in passing. */
  syntax: string;
  /** Optional qualifier: a field's type, or how many contacts actually have it. */
  meta?: string;
}

/** Field names come from contact data keys, which are user-supplied. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * The list rendered inside the popup, shared by both triggers.
 *
 * Selection is single-sourced: moving the pointer over a row *moves the selection* to
 * it rather than painting a second, competing highlight. Two differently-highlighted
 * rows leave the author guessing which one Enter takes, which is the sort of small
 * ambiguity that makes a menu feel untrustworthy without being nameable.
 */
export class SuggestionMenu<T extends SuggestionRow> implements SuggestionListView {
  public element: HTMLDivElement;
  private items: T[];
  private selectedIndex = 0;
  private command: (item: T) => void;

  constructor(props: SuggestionProps, private readonly emptyMessage: string) {
    this.items = (Array.isArray(props.items) ? props.items : []) as T[];
    this.command = props.command;

    this.element = document.createElement('div');
    this.element.className = 'suggestion-menu';
    this.element.setAttribute('role', 'listbox');
    this.renderRows();
  }

  /** Full rebuild. Only when the items themselves change, never on selection movement. */
  private renderRows() {
    if (this.items.length === 0) {
      this.element.innerHTML = `<div class="suggestion-empty">${escapeHtml(this.emptyMessage)}</div>`;
      return;
    }

    this.element.innerHTML = this.items
      .map(
        (item, index) => `
        <div class="suggestion-row${index === this.selectedIndex ? ' is-selected' : ''}" role="option" aria-selected="${index === this.selectedIndex}" data-index="${index}">
          <div class="suggestion-row-head">
            <span class="suggestion-row-label">${escapeHtml(item.label)}</span>
            ${item.meta ? `<span class="suggestion-row-meta">${escapeHtml(item.meta)}</span>` : ''}
          </div>
          <code class="suggestion-row-syntax">${escapeHtml(item.syntax)}</code>
        </div>
      `,
      )
      .join('');

    this.element.querySelectorAll<HTMLElement>('.suggestion-row').forEach((row, index) => {
      row.addEventListener('click', () => this.selectItem(index));
      // Pointer movement drives the same selection the arrow keys do.
      row.addEventListener('mousemove', () => {
        if (this.selectedIndex !== index) {
          this.selectedIndex = index;
          this.syncSelection();
        }
      });
    });
  }

  /** Selection moved: repaint state only, so the pointer never fights a DOM rebuild. */
  private syncSelection() {
    this.element.querySelectorAll<HTMLElement>('.suggestion-row').forEach((row, index) => {
      const selected = index === this.selectedIndex;
      row.classList.toggle('is-selected', selected);
      row.setAttribute('aria-selected', String(selected));

      if (selected) {
        // Arrowing past the fold has to bring the row with it.
        row.scrollIntoView({block: 'nearest'});
      }
    });
  }

  selectItem(index: number) {
    const item = this.items[index];
    if (item && this.command) {
      this.command(item);
    }
  }

  onKeyDown(event: KeyboardEvent): boolean {
    if (event.key === 'ArrowUp') {
      this.move(-1);
      return true;
    }

    if (event.key === 'ArrowDown') {
      this.move(1);
      return true;
    }

    if (event.key === 'Enter' || event.key === 'Tab') {
      this.selectItem(this.selectedIndex);
      return true;
    }

    return false;
  }

  private move(delta: number) {
    if (this.items.length === 0) {
      return;
    }

    this.selectedIndex = (this.selectedIndex + delta + this.items.length) % this.items.length;
    this.syncSelection();
  }

  update(props: SuggestionProps) {
    this.items = (Array.isArray(props.items) ? props.items : []) as T[];
    // Rebind: the command closes over the match range, which grows with every keystroke
    // of the query. Keeping the one from `onStart` deletes the trigger and leaves the
    // query behind as literal text.
    this.command = props.command;
    this.selectedIndex = 0;
    this.renderRows();
    this.syncSelection();
  }

  destroy() {
    this.element.remove();
  }
}

/**
 * Whether any suggestion menu is currently open.
 *
 * A half-typed trigger — `{%ema` with the menu open on it — is not valid Liquid, so
 * syntax validation would report an error on markup the author is in the middle of
 * completing, using the very menu that completes it. Consumers subscribe to stay quiet
 * while a menu is up. Counted rather than boolean so two triggers can't unset each other.
 */
let openMenus = 0;
const openListeners = new Set<(open: boolean) => void>();

function setMenuOpen(delta: number) {
  openMenus = Math.max(0, openMenus + delta);
  for (const listener of openListeners) {
    listener(openMenus > 0);
  }
}

/** Subscribe to suggestion-menu visibility. Returns an unsubscribe function. */
export function subscribeSuggestionOpen(listener: (open: boolean) => void): () => void {
  openListeners.add(listener);
  return () => {
    openListeners.delete(listener);
  };
}

/**
 * Tippy plumbing shared by the editor's suggestion triggers: positioning, keeping the
 * popup pinned while the editor scrolls, and teardown. Only the list rendering differs
 * between triggers, so that is all a caller supplies.
 */
export function createSuggestionRenderer(createList: (props: SuggestionProps) => SuggestionListView) {
  return () => {
    let component: SuggestionListView;
    let popup: TippyInstance[];
    let scrollHandler: (() => void) | null = null;

    return {
      onStart: (props: SuggestionProps) => {
        component = createList(props);
        setMenuOpen(1);

        if (!props.clientRect) {
          return;
        }

        popup = tippy('body', {
          getReferenceClientRect: props.clientRect as () => DOMRect,
          appendTo: () => document.body,
          content: component.element,
          showOnCreate: true,
          interactive: true,
          trigger: 'manual',
          placement: 'bottom-start',
          theme: 'variable-suggestion',
          plugins: [sticky],
          sticky: 'reference',
          popperOptions: {
            strategy: 'fixed',
          },
        });

        // Keep the popup attached to the caret while the editor scrolls under it.
        scrollHandler = () => {
          if (popup?.[0] && props.clientRect) {
            popup[0].setProps({
              getReferenceClientRect: props.clientRect as () => DOMRect,
            });
          }
        };

        const editorContainer = document.querySelector('.overflow-y-auto');
        if (editorContainer) {
          editorContainer.addEventListener('scroll', scrollHandler);
        }
        window.addEventListener('scroll', scrollHandler, true);
      },

      onUpdate(props: SuggestionProps) {
        component?.update(props);

        if (!props.clientRect) {
          return;
        }

        popup?.[0]?.setProps({
          getReferenceClientRect: props.clientRect as () => DOMRect,
        });
      },

      onKeyDown(props: {event: KeyboardEvent}) {
        if (props.event.key === 'Escape') {
          popup?.[0]?.hide();
          return true;
        }

        return component?.onKeyDown(props.event) || false;
      },

      onExit() {
        setMenuOpen(-1);

        if (scrollHandler) {
          const editorContainer = document.querySelector('.overflow-y-auto');
          if (editorContainer) {
            editorContainer.removeEventListener('scroll', scrollHandler);
          }
          window.removeEventListener('scroll', scrollHandler, true);
        }

        popup?.[0]?.destroy();
        component?.destroy();
      },
    };
  };
}
