import {describe, expect, it} from 'vitest';
import {getInitialEditorMode, getModeToggleDecision} from '../../src/components/EmailEditor/modeGuards';

describe('EmailEditor mode guards', () => {
  it('starts in html mode for custom html templates', () => {
    const customHtml = '<table><tr><td style="color:red" class="promo">Hello</td></tr></table>';

    expect(getInitialEditorMode(customHtml)).toBe('html');
  });

  it('allows switching simple html into visual mode', () => {
    const simpleHtml = '<p>Hello <strong>world</strong></p>';

    expect(
      getModeToggleDecision({
        currentMode: 'html',
        htmlContent: simpleHtml,
      }),
    ).toEqual({action: 'switch', nextMode: 'visual'});
  });

  it('blocks switching custom html into visual mode', () => {
    const customHtml = '<div class="email-shell"><table><tr><td style="padding:24px">Hello</td></tr></table></div>';

    expect(
      getModeToggleDecision({
        currentMode: 'html',
        htmlContent: customHtml,
      }),
    ).toEqual({action: 'block-custom-html'});
  });
});
