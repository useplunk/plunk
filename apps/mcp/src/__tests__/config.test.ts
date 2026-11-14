import {describe, expect, it} from 'vitest';

import {ConfigError, DEFAULT_API_URL, loadConfig} from '../config.js';

describe('loadConfig', () => {
  it('requires an API key', () => {
    expect(() => loadConfig({}, [])).toThrow(ConfigError);
  });

  it('rejects a public key used as the secret key', () => {
    // The whole tool surface except tracking needs sk_, so failing here beats
    // letting every single call come back 401.
    expect(() => loadConfig({PLUNK_API_KEY: 'pk_abc'}, [])).toThrow(/secret key/i);
  });

  it('rejects a secret key supplied as the public key', () => {
    expect(() => loadConfig({PLUNK_API_KEY: 'sk_abc', PLUNK_PUBLIC_KEY: 'sk_def'}, [])).toThrow(/public key/i);
  });

  it('defaults to the hosted API', () => {
    expect(loadConfig({PLUNK_API_KEY: 'sk_abc'}, []).apiUrl).toBe(DEFAULT_API_URL);
  });

  it('accepts a self-hosted URL and strips the trailing slash', () => {
    const config = loadConfig({PLUNK_API_KEY: 'sk_abc', PLUNK_API_URL: 'https://api.example.com/'}, []);
    expect(config.apiUrl).toBe('https://api.example.com');
  });

  it('rejects a non-absolute API URL', () => {
    expect(() => loadConfig({PLUNK_API_KEY: 'sk_abc', PLUNK_API_URL: 'api.example.com'}, [])).toThrow(/absolute/i);
  });

  it('lets the --api-url flag win over the environment', () => {
    const config = loadConfig(
      {PLUNK_API_KEY: 'sk_abc', PLUNK_API_URL: 'https://from-env.example.com'},
      ['--api-url=https://from-flag.example.com'],
    );
    expect(config.apiUrl).toBe('https://from-flag.example.com');
  });

  it('lets PLUNK_MCP_API_KEY win over PLUNK_API_KEY', () => {
    // The API server uses PLUNK_API_KEY for its own platform-notification key,
    // so an environment can legitimately hold one that belongs elsewhere.
    const config = loadConfig({PLUNK_API_KEY: 'sk_platform', PLUNK_MCP_API_KEY: 'sk_mine'}, []);
    expect(config.apiKey).toBe('sk_mine');
  });

  it('lets PLUNK_MCP_API_URL win over PLUNK_API_URL', () => {
    const config = loadConfig(
      {PLUNK_API_KEY: 'sk_abc', PLUNK_API_URL: 'https://a.example.com', PLUNK_MCP_API_URL: 'https://b.example.com'},
      [],
    );
    expect(config.apiUrl).toBe('https://b.example.com');
  });

  it('enables read-only from either the flag or the environment', () => {
    expect(loadConfig({PLUNK_API_KEY: 'sk_abc'}, ['--read-only']).readOnly).toBe(true);
    expect(loadConfig({PLUNK_API_KEY: 'sk_abc', PLUNK_READ_ONLY: 'true'}, []).readOnly).toBe(true);
    expect(loadConfig({PLUNK_API_KEY: 'sk_abc', PLUNK_READ_ONLY: 'false'}, []).readOnly).toBe(false);
    expect(loadConfig({PLUNK_API_KEY: 'sk_abc'}, []).readOnly).toBe(false);
  });
});

describe('loadConfig with several projects', () => {
  it('reads PLUNK_API_KEY_<NAME> keys into named projects', () => {
    const config = loadConfig({PLUNK_API_KEY_ACME: 'sk_a', PLUNK_API_KEY_BETA_EU: 'sk_b'}, []);

    expect(config.projects).toEqual({acme: {apiKey: 'sk_a'}, beta_eu: {apiKey: 'sk_b'}});
    expect(config.apiKey).toBeUndefined();
  });

  it('pairs PLUNK_PUBLIC_KEY_<NAME> with the matching project', () => {
    const config = loadConfig({PLUNK_API_KEY_ACME: 'sk_a', PLUNK_PUBLIC_KEY_ACME: 'pk_a'}, []);

    expect(config.projects).toEqual({acme: {apiKey: 'sk_a', publicKey: 'pk_a'}});
  });

  it('ignores a bare PLUNK_API_KEY once named keys exist', () => {
    // On a self-hosted box that is the API server's own platform key — adding it
    // as a silent extra project would expose a project nobody asked for.
    const config = loadConfig({PLUNK_API_KEY: 'sk_platform', PLUNK_API_KEY_ACME: 'sk_a'}, []);

    expect(config.projects).toEqual({acme: {apiKey: 'sk_a'}});
  });

  it('rejects PLUNK_MCP_API_KEY or PLUNK_PUBLIC_KEY alongside named keys', () => {
    expect(() => loadConfig({PLUNK_MCP_API_KEY: 'sk_x', PLUNK_API_KEY_ACME: 'sk_a'}, [])).toThrow(ConfigError);
    expect(() => loadConfig({PLUNK_PUBLIC_KEY: 'pk_x', PLUNK_API_KEY_ACME: 'sk_a'}, [])).toThrow(/PLUNK_PUBLIC_KEY_/);
  });

  it('rejects a named key that is not a secret key', () => {
    expect(() => loadConfig({PLUNK_API_KEY_ACME: 'pk_a'}, [])).toThrow(/PLUNK_API_KEY_ACME/);
  });

  it('rejects a public key without a matching secret key', () => {
    expect(() => loadConfig({PLUNK_API_KEY_ACME: 'sk_a', PLUNK_PUBLIC_KEY_BETA: 'pk_b'}, [])).toThrow(
      /PLUNK_API_KEY_BETA/,
    );
  });

  it('rejects a named public key that is not a public key', () => {
    expect(() => loadConfig({PLUNK_API_KEY_ACME: 'sk_a', PLUNK_PUBLIC_KEY_ACME: 'sk_b'}, [])).toThrow(/public key/i);
  });

  it('skips empty named keys', () => {
    const config = loadConfig({PLUNK_API_KEY: 'sk_main', PLUNK_API_KEY_ACME: '  '}, []);

    expect(config.projects).toBeUndefined();
    expect(config.apiKey).toBe('sk_main');
  });
});
