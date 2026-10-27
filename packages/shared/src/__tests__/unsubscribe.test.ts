import {describe, expect, it} from 'vitest';

import {detectUnsubscribeSignal} from '../unsubscribe.js';

describe('detectUnsubscribeSignal', () => {
  it.each([
    '<a href="{{unsubscribeUrl}}">Click here</a>',
    '<a href="{{manageUrl}}">Your settings</a>',
    '<a href="{{ manageUrl }}">Your settings</a>',
    '<a href="{{- manageUrl -}}">Your settings</a>',
    '<a href="{{ manageUrl | strip }}">Your settings</a>',
    '<p>Stop these emails: {{ unsubscribeUrl }}</p>',
  ])('finds the managed placeholder in %s', body => {
    expect(detectUnsubscribeSignal(body)).toBe(true);
  });

  it('finds an unsubscribe link written by the sender', () => {
    expect(detectUnsubscribeSignal('<a href="https://example.com/opt-out">Leave</a>')).toBe(true);
    expect(detectUnsubscribeSignal('<a href="https://example.com/x">Unsubscribe</a>')).toBe(true);
  });

  it.each(['', '<p>Hello {{ firstName }}</p>', '<p>{{ unsubscribeUrlText }}</p>', '<a href="{{ url }}">Read more</a>'])(
    'reports no signal for %s',
    body => {
      expect(detectUnsubscribeSignal(body)).toBe(false);
    },
  );
});
