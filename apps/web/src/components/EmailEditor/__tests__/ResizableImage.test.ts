// @vitest-environment happy-dom
import {Editor} from '@tiptap/core';
import {NodeSelection} from '@tiptap/pm/state';
import StarterKit from '@tiptap/starter-kit';
import {afterEach, describe, expect, it} from 'vitest';

import {detectCustomHtmlPatterns} from '../../../lib/emailStyles';
import {EmailTextAlign} from '../EmailTextAlign';
import {ResizableImage} from '../ResizableImage';

/**
 * Parsing and serialising run through the same text, alignment and image extensions the editor
 * loads, so these pin the HTML that gets saved, previewed and sent. The image sits between
 * paragraphs because the editor appends an empty one after a trailing image.
 */
const IMAGE = '<img src="x.png" width="300" height="200" class="email-image">';
const CENTERED =
  '<p style="text-align: center;"><img src="x.png" width="300" height="200" class="email-image" style="display: block; margin-left: auto; margin-right: auto;"></p>';
const RIGHT =
  '<p style="text-align: right;"><img src="x.png" width="300" height="200" class="email-image" style="display: block; margin-left: auto; margin-right: 0px;"></p>';

let editor: Editor;

function createEditor(content: string) {
  editor = new Editor({
    extensions: [StarterKit.configure({heading: {levels: [1, 2, 3]}}), EmailTextAlign, ResizableImage],
    content,
  });
}

// What clicking the image in the editor does.
function selectImage() {
  let position = -1;
  editor.state.doc.descendants((node, pos) => {
    if (node.type.name === 'image') position = pos;
  });
  editor.view.dispatch(editor.state.tr.setSelection(NodeSelection.create(editor.state.doc, position)));
}

// Saving the email and opening it again.
function reopen(html: string) {
  editor.commands.setContent(html);
  return editor.getHTML();
}

afterEach(() => {
  editor.destroy();
});

describe('image alignment', () => {
  it('leaves an unaligned image exactly as before', () => {
    createEditor(`<p>a</p>${IMAGE}<p>b</p>`);

    expect(editor.getHTML()).toBe(`<p>a</p>${IMAGE}<p>b</p>`);
  });

  it.each([
    ['center', CENTERED],
    ['right', RIGHT],
  ])('aligns a selected image to the %s, as visual-editor content that survives reopening', (alignment, expected) => {
    createEditor(`<p>a</p>${IMAGE}<p>b</p>`);
    selectImage();

    expect(editor.commands.setTextAlign(alignment)).toBe(true);
    const html = editor.getHTML();

    expect(html).toBe(`<p>a</p>${expected}<p>b</p>`);
    expect(editor.isActive({textAlign: alignment})).toBe(true);
    expect(detectCustomHtmlPatterns(html)).toBe(false);
    expect(reopen(html)).toBe(html);
  });

  it('stores left as no alignment, so the image reads the same before and after reopening', () => {
    createEditor(`<p>a</p>${CENTERED}<p>b</p>`);
    selectImage();

    editor.commands.setTextAlign('left');

    expect(editor.getHTML()).toBe(`<p>a</p>${IMAGE}<p>b</p>`);
    expect(editor.isActive({textAlign: 'left'})).toBe(false);
  });

  it('never justifies an image, so justifying text keeps images where they were', () => {
    createEditor(`<p>a</p>${CENTERED}<p>b</p>`);
    selectImage();

    expect(editor.commands.setTextAlign('justify')).toBe(false);
    expect(editor.getHTML()).toBe(`<p>a</p>${CENTERED}<p>b</p>`);

    editor.commands.selectAll();
    editor.commands.setTextAlign('justify');

    expect(editor.getHTML()).toBe(
      `<p style="text-align: justify;">a</p>${CENTERED}<p style="text-align: justify;">b</p>`,
    );
  });

  it('aligns the images inside a text selection, and leaves them alone when the cursor is in text', () => {
    createEditor(`<p>a</p>${IMAGE}<p>b</p>`);

    editor.commands.setTextSelection(1);
    editor.commands.setTextAlign('right');
    expect(editor.getHTML()).toBe(`<p style="text-align: right;">a</p>${IMAGE}<p>b</p>`);

    // From inside "a" to inside "b", across the image.
    editor.commands.setTextSelection({from: 1, to: 6});
    editor.commands.setTextAlign('center');
    expect(editor.getHTML()).toBe(
      `<p style="text-align: center;">a</p>${CENTERED}<p style="text-align: center;">b</p>`,
    );
  });

  it('reads an aligned image written by hand, keeping its attributes', () => {
    createEditor(
      '<p>a</p><p style="text-align:center"><img src="x.png" alt="Logo" title="Hi" width="300" height="200"></p><p>b</p>',
    );

    expect(editor.getHTML()).toBe(
      '<p>a</p><p style="text-align: center;"><img src="x.png" alt="Logo" title="Hi" width="300" height="200" class="email-image" style="display: block; margin-left: auto; margin-right: auto;"></p><p>b</p>',
    );
  });

  it.each([
    ['left on its paragraph', '<p style="text-align: left"><img src="x.png"></p>'],
    ['justify on its paragraph', '<p style="text-align: justify"><img src="x.png"></p>'],
    ['centre on the image itself', '<img src="x.png" style="text-align: center">'],
  ])('reads an image with %s as unaligned, as it always rendered', (_label, image) => {
    createEditor(`<p>a</p>${image}<p>b</p>`);
    selectImage();

    expect(editor.getAttributes('image').textAlign).toBeNull();
    expect(editor.getHTML()).toBe('<p>a</p><img src="x.png" class="email-image"><p>b</p>');
  });

  it('keeps a list intact when one of its items opens with an aligned image', () => {
    createEditor('<ol><li><p style="text-align: center"><img src="x.png"></p></li><li><p>b</p></li></ol>');

    // A list item must open with a paragraph, so the image stays in the item, unaligned, as before.
    expect(editor.getHTML()).toBe(
      '<ol><li><p style="text-align: center;"></p><img src="x.png" class="email-image"></li><li><p>b</p></li></ol>',
    );
  });

  it.each([
    ['text', '<p style="text-align: center">Our logo <img src="x.png"></p>', ['Our logo', 'x.png']],
    ['a non-breaking space', '<p style="text-align: center">&nbsp;<img src="x.png"></p>', ['&nbsp;', 'x.png']],
    [
      'Liquid tags',
      '<p style="text-align: center">{% if vip %}<img src="x.png">{% endif %}</p>',
      ['{% if vip %}', '{% endif %}', 'x.png'],
    ],
    ['a second image', '<p style="text-align: center"><img src="a.png"><img src="b.png"></p>', ['a.png', 'b.png']],
  ])('keeps everything in a paragraph that holds %s besides the image', (_label, content, kept) => {
    createEditor(content);

    for (const part of kept) {
      expect(editor.getHTML()).toContain(part);
    }
  });
});
