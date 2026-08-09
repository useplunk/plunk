import {describe, expect, it} from 'vitest';

import {WorkflowExecutionService} from '../WorkflowExecutionService.js';

/**
 * `isPrivateIp` is private; reach it through an `as any` cast so the SSRF guard
 * can be tested directly without exercising a full workflow execution.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const isPrivateIp = (ip: string): boolean => (WorkflowExecutionService as any).isPrivateIp(ip);

describe('WorkflowExecutionService SSRF guard', () => {
  describe('IPv4', () => {
    it.each([
      '127.0.0.1',
      '10.1.2.3',
      '172.16.0.1',
      '172.31.255.255',
      '192.168.1.1',
      '169.254.169.254',
      '100.64.0.1',
      '0.0.0.0',
      '224.0.0.1',
      '255.255.255.255',
    ])('blocks %s', (ip) => {
      expect(isPrivateIp(ip)).toBe(true);
    });

    it.each(['8.8.8.8', '1.1.1.1', '172.15.0.1', '172.32.0.1', '100.63.0.1', '93.184.216.34'])(
      'allows %s',
      (ip) => {
        expect(isPrivateIp(ip)).toBe(false);
      },
    );
  });

  describe('IPv6', () => {
    it.each([
      ['loopback', '::1'],
      ['loopback, uncompressed', '0:0:0:0:0:0:0:1'],
      ['unspecified', '::'],
      ['link-local', 'fe80::1'],
      ['link-local with zone', 'fe80::1%eth0'],
      ['link-local, upper bound of /10', 'febf::1'],
      ['unique local', 'fd00::1'],
      ['unique local, fc00::/7', 'fc00::1'],
      ['multicast', 'ff02::1'],
      ['discard-only', '100::1'],
      ['documentation', '2001:db8::1'],
    ])('blocks %s (%s)', (_label, ip) => {
      expect(isPrivateIp(ip)).toBe(true);
    });

    it.each([
      ['public', '2606:4700:4700::1111'],
      ['public Google DNS', '2001:4860:4860::8888'],
      ['not link-local — fec0 is outside fe80::/10', 'fec0::1'],
    ])('allows %s (%s)', (_label, ip) => {
      expect(isPrivateIp(ip)).toBe(false);
    });
  });

  describe('IPv4-mapped and IPv4-compatible', () => {
    it.each([
      '::ffff:169.254.169.254',
      '::ffff:127.0.0.1',
      '::ffff:10.0.0.1',
      // Uncompressed spelling of the same address
      '0:0:0:0:0:ffff:169.254.169.254',
      // Hex spelling: a9fe:a9fe == 169.254.169.254
      '::ffff:a9fe:a9fe',
      // Deprecated IPv4-compatible form
      '::169.254.169.254',
    ])('blocks %s', (ip) => {
      expect(isPrivateIp(ip)).toBe(true);
    });

    it('allows a mapped public address', () => {
      expect(isPrivateIp('::ffff:8.8.8.8')).toBe(false);
    });
  });

  describe('transition mechanisms (the reported bypass)', () => {
    it.each([
      ['6to4 → 169.254.169.254', '2002:a9fe:a9fe::'],
      ['6to4 → 127.0.0.1', '2002:7f00:1::1'],
      ['6to4 → 10.0.0.1', '2002:a00:1::'],
      ['NAT64 well-known prefix → 169.254.169.254', '64:ff9b::a9fe:a9fe'],
      ['NAT64 → 127.0.0.1', '64:ff9b::7f00:1'],
      ['NAT64 local-use prefix (RFC 8215)', '64:ff9b:1::1'],
      ['Teredo', '2001:0000:4136:e378:8000:63bf:5600:fedd'],
      ['Teredo, compressed', '2001::1'],
    ])('blocks %s (%s)', (_label, ip) => {
      expect(isPrivateIp(ip)).toBe(true);
    });

    it('allows 6to4 wrapping a public IPv4 (8.8.8.8)', () => {
      expect(isPrivateIp('2002:808:808::')).toBe(false);
    });

    it('allows NAT64 wrapping a public IPv4 (8.8.8.8)', () => {
      expect(isPrivateIp('64:ff9b::808:808')).toBe(false);
    });
  });

  describe('malformed input', () => {
    it.each(['', 'not-an-ip', 'example.com', '999.999.999.999', '::gggg', '1:2:3', '0x7f.0.0.1'])(
      'rejects %s',
      (ip) => {
        expect(isPrivateIp(ip)).toBe(true);
      },
    );
  });
});
