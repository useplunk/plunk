import {afterEach, describe, expect, it, vi} from 'vitest';

vi.mock('undici', async importOriginal => ({
  ...(await importOriginal<typeof import('undici')>()),
  fetch: vi.fn(),
}));

const {fetch} = await import('undici');
const {WorkflowExecutionService} = await import('../WorkflowExecutionService.js');

/**
 * safeFetch follows redirects by hand. Each redirect's body has to be released,
 * or its socket stays tied up on the shared keep-alive agent until GC.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const service = WorkflowExecutionService as any;
const safeFetch = (url: string) => service.safeFetch(url, {method: 'GET'});

const redirectWithBody = (location: string | null, onCancel: () => void) =>
  new Response(
    new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('<html>Moved</html>'));
      },
      cancel: onCancel,
    }),
    {status: 301, headers: location ? {location} : {}},
  );

describe('WorkflowExecutionService webhook redirects', () => {
  afterEach(() => {
    vi.mocked(fetch).mockReset();
  });

  it('releases the body of every redirect it follows', async () => {
    const cancelled = vi.fn();
    vi.mocked(fetch)
      .mockResolvedValueOnce(redirectWithBody('https://example.com/final', cancelled) as never)
      .mockResolvedValueOnce(new Response('OK', {status: 200}) as never);

    const response = await safeFetch('http://example.com/start');

    expect(await response.text()).toBe('OK');
    expect(cancelled).toHaveBeenCalledTimes(1);
    expect(vi.mocked(fetch).mock.calls[1]![0]).toBe('https://example.com/final');
  });

  it('releases the body of a redirect with no Location header', async () => {
    const cancelled = vi.fn();
    vi.mocked(fetch).mockResolvedValueOnce(redirectWithBody(null, cancelled) as never);

    await expect(safeFetch('http://example.com/start')).rejects.toThrow('Redirect with no Location header');
    expect(cancelled).toHaveBeenCalledTimes(1);
  });
});
