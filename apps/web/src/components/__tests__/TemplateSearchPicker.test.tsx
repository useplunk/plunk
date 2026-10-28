import {act, cleanup, render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {useState} from 'react';
import {afterAll, afterEach, beforeAll, describe, expect, it, vi} from 'vitest';

import {TemplateSearchPicker} from '../TemplateSearchPicker';

vi.mock('swr', () => ({
  default: () => ({
    data: {data: [{id: 'welcome', name: 'Welcome email', type: 'TRANSACTIONAL'}], total: 1},
    isLoading: false,
  }),
}));

beforeAll(() => {
  // cmdk measures and scrolls its list; jsdom does not implement those layout APIs.
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(cleanup);
afterAll(() => {
  vi.unstubAllGlobals();
  Reflect.deleteProperty(Element.prototype, 'scrollIntoView');
});

function Picker() {
  const [value, setValue] = useState('');
  return (
    <>
      <TemplateSearchPicker value={value} onChange={setValue} />
      <button type="button">Outside the picker</button>
      <output aria-label="Selected template">{value}</output>
    </>
  );
}

describe('TemplateSearchPicker', () => {
  it('selects a template even when the pointer is held longer than the old blur timeout', async () => {
    const user = userEvent.setup();
    render(<Picker />);
    await user.click(screen.getByPlaceholderText('Search templates…'));
    const option = await screen.findByRole('option', {name: 'Welcome email TRANSACTIONAL'});

    await user.pointer({keys: '[MouseLeft>]', target: option});
    await act(() => new Promise(resolve => setTimeout(resolve, 250)));
    expect(screen.queryByRole('option')).not.toBeNull();
    await user.pointer({keys: '[/MouseLeft]'});

    expect(screen.getByLabelText('Selected template').textContent).toBe('welcome');
    expect((screen.getByPlaceholderText('Search templates…') as HTMLInputElement).value).toBe('Welcome email');
    expect(screen.queryByRole('option')).toBeNull();
  });

  it('closes when Tab moves focus outside the picker without selecting a template', async () => {
    const user = userEvent.setup();
    render(<Picker />);
    await user.click(screen.getByPlaceholderText('Search templates…'));
    await screen.findByRole('option');

    await user.tab();

    expect(document.activeElement).toBe(screen.getByRole('button', {name: 'Outside the picker'}));
    expect(screen.queryByRole('option')).toBeNull();
    expect(screen.getByLabelText('Selected template').textContent).toBe('');
  });

  it('keeps a reopened picker open after focus leaves and quickly returns', async () => {
    const user = userEvent.setup();
    render(<Picker />);
    const input = screen.getByPlaceholderText('Search templates…');
    await user.click(input);
    await screen.findByRole('option');
    await user.click(screen.getByRole('button', {name: 'Outside the picker'}));
    await user.click(input);
    await act(() => new Promise(resolve => setTimeout(resolve, 250)));

    await user.click(screen.getByRole('option'));

    expect(screen.getByLabelText('Selected template').textContent).toBe('welcome');
  });
});
