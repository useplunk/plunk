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
