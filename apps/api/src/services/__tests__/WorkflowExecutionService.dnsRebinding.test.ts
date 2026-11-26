import dns from 'node:dns/promises';
import http from 'node:http';
import type {AddressInfo} from 'node:net';

import {afterAll, afterEach, beforeAll, describe, expect, it, vi} from 'vitest';

import {WorkflowExecutionService} from '../WorkflowExecutionService.js';

/**
 * DNS rebinding (GHSA-vgpm-vj5m-fxj9): the hostname must be resolved once, and
 * the socket must connect to the address that passed the private-IP check.
 *
 * A loopback fixture stands in for a public host: isPrivateIp is told that
 * 127.0.0.1 is public, so the test can observe where the connection lands.
 * Each test uses its own hostname because the agent keeps connections alive.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const service = WorkflowExecutionService as any;
const safeFetch = (url: string) => service.safeFetch(url, {method: 'GET'});

type LookupAnswer = {address: string; family: number}[];

describe('WorkflowExecutionService webhook DNS rebinding', () => {
  let server: http.Server;
  let port: number;
  let requests = 0;

  beforeAll(async () => {
    server = http.createServer((_req, res) => {
      requests++;
      res.end('FIXTURE');
    });
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
    port = (server.address() as AddressInfo).port;
  });

  afterAll(async () => {
    await new Promise<void>(resolve => server.close(() => resolve()));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    requests = 0;
  });

  const treatLoopbackAsPublic = () => {
    const original = service.isPrivateIp.bind(service);
    vi.spyOn(service, 'isPrivateIp').mockImplementation(ip => (ip === '127.0.0.1' ? false : original(ip)));
  };

  const answer = (...answers: LookupAnswer[]) => {
    const spy = vi.spyOn(dns, 'lookup');
    for (const a of answers) {
      spy.mockResolvedValueOnce(a as never);
    }
    return spy;
  };

  it('connects to the validated address and never resolves the name a second time', async () => {
    treatLoopbackAsPublic();
    // A rebinding server: "public" first, internal on any later query
    const lookup = answer([{address: '127.0.0.1', family: 4}], [{address: '10.0.0.1', family: 4}]);

    const response = await safeFetch(`http://rebind-once.test:${port}/`);

    expect(await response.text()).toBe('FIXTURE');
    expect(lookup).toHaveBeenCalledTimes(1);
    expect(requests).toBe(1);
  });

  it('rejects a name with one public and one internal record', async () => {
    treatLoopbackAsPublic();
    answer([
      {address: '127.0.0.1', family: 4},
      {address: '169.254.169.254', family: 4},
    ]);

    await expect(safeFetch(`http://mixed-records.test:${port}/`)).rejects.toThrow(
      'Webhook URL resolves to a private/internal IP address: 169.254.169.254',
    );
    expect(requests).toBe(0);
  });

  it('rejects a name that resolves to an internal address', async () => {
    answer([{address: '127.0.0.1', family: 4}]);

    await expect(safeFetch(`http://internal.test:${port}/`)).rejects.toThrow(
      'Webhook URL resolves to a private/internal IP address: 127.0.0.1',
    );
    expect(requests).toBe(0);
  });

  it('rejects an internal IP literal without a lookup', async () => {
    const lookup = vi.spyOn(dns, 'lookup');

    await expect(safeFetch(`http://127.0.0.1:${port}/`)).rejects.toThrow(
      'Webhook URL resolves to a private/internal IP address: 127.0.0.1',
    );
    expect(lookup).not.toHaveBeenCalled();
    expect(requests).toBe(0);
  });
});
