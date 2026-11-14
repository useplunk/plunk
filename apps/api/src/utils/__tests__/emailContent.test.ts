import type {Contact, Project} from '@plunk/db';
import {describe, expect, it} from 'vitest';

import {EmailService} from '../../services/EmailService.js';
import {extractVisibleEmailText, truncateForAnalysis} from '../emailContent.js';

const PHISHING_MESSAGE =
  'Sie haben Anspruch auf eine Rückerstattung in Höhe von CHF 431.50. Zur Bestätigung antworten Sie bitte auf diese E-Mail.';

describe('extractVisibleEmailText', () => {
  it('reads the message, not the stylesheet, of an email from the visual editor', () => {
    // Regression: the editor's wrapper puts ~5 KB of CSS ahead of the message. The old
    // regex stripper kept that CSS, so the first 2000 characters sent to the phishing
    // check contained no message text at all.
    const html = EmailService.compile({
      content: `<p>Guten Tag,</p><p>${PHISHING_MESSAGE}</p>`,
      contact: {id: 'contact-id', data: {}} as unknown as Contact,
      project: {name: 'Test', language: 'de', subscription: {}} as unknown as Project,
      includeUnsubscribe: false,
    });
    expect(html).toContain('<style>');

    const {text} = extractVisibleEmailText(html);

    expect(text.startsWith('Guten Tag,')).toBe(true);
    expect(text).toContain(PHISHING_MESSAGE);
    expect(text).not.toMatch(/box-sizing|font-family|\.prose/);
  });

  it('drops head, style, script, noscript and comments, whatever their size', () => {
    const padding = '.x { color: red; } '.repeat(5000);
    const html = `<!DOCTYPE html><html><head><title>Title</title><style>${padding}</style></head>
      <body><!-- ${padding} --><style>${padding}</style><script>alert(1)</script><noscript>enable js</noscript>
      <p>${PHISHING_MESSAGE}</p></body></html>`;

    expect(extractVisibleEmailText(html).text).toBe(PHISHING_MESSAGE);
  });

  it('handles HTML without an html or body element', () => {
    const html = `<style>p { margin: 0 }</style><div><p>${PHISHING_MESSAGE}</p></div>`;

    expect(extractVisibleEmailText(html).text).toBe(PHISHING_MESSAGE);
  });

  it('removes hidden elements and reports how much hidden text there was', () => {
    const html = `
      <div style="display: none !important">Filler one</div>
      <div style="VISIBILITY:hidden">Filler two</div>
      <div style="opacity: 0">Filler three</div>
      <div style="max-height:0;overflow:hidden">Filler four</div>
      <span hidden>Filler five</span>
      <p>${PHISHING_MESSAGE}</p>`;

    const {text, hiddenTextLength} = extractVisibleEmailText(html);

    expect(text).toBe(PHISHING_MESSAGE);
    expect(hiddenTextLength).toBe(
      ['Filler one', 'Filler two', 'Filler three', 'Filler four', 'Filler five'].join('').length,
    );
  });

  it('keeps visible content that only looks hidden at a glance', () => {
    // font-size:0 wrappers are standard in MJML layouts, and line-height:0 is not height:0.
    const html = `
      <td style="font-size:0px"><div style="font-size:14px">Visible in a column</div></td>
      <p style="line-height:0;overflow:hidden">Visible paragraph</p>
      <p style="opacity:0.8">Faded but visible</p>`;

    const {text, hiddenTextLength} = extractVisibleEmailText(html);

    expect(text).toContain('Visible in a column');
    expect(text).toContain('Visible paragraph');
    expect(text).toContain('Faded but visible');
    expect(hiddenTextLength).toBe(0);
  });

  it('keeps link targets and decodes entities', () => {
    const html = '<p>Confirm&nbsp;your refund &amp; <a href="https://evil.example/login">log in here</a></p>';

    expect(extractVisibleEmailText(html).text).toBe('Confirm your refund & log in here [https://evil.example/login]');
  });
});

describe('truncateForAnalysis', () => {
  it('returns short text unchanged', () => {
    expect(truncateForAnalysis('hello', 100)).toBe('hello');
  });

  it('keeps both the start and the end of long text', () => {
    const text = `START${'a'.repeat(10_000)}END`;

    const result = truncateForAnalysis(text, 400);

    expect(result.startsWith('START')).toBe(true);
    expect(result.endsWith('END')).toBe(true);
    expect(result).toContain(`[... ${text.length - 400} characters omitted ...]`);
  });
});
