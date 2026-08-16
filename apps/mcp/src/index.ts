#!/usr/bin/env node

/**
 * stdio entry point for the Plunk MCP server.
 *
 * `serveStdio` owns the protocol-era decision: the same factory serves both the
 * 2026-07-28 revision and older 2025-era clients, so one binary works across the
 * whole client ecosystem.
 *
 * stdout is the JSON-RPC channel — every diagnostic here goes to stderr, and
 * nothing in this process may `console.log`.
 */

import {serveStdio} from '@modelcontextprotocol/server/stdio';

import {ConfigError, loadConfig} from './config.js';
import {buildServer, SERVER_VERSION} from './server.js';

function main(): void {
  let config;

  try {
    config = loadConfig();
  } catch (error) {
    if (error instanceof ConfigError) {
      console.error(`[plunk-mcp] ${error.message}`);
      process.exit(1);
    }

    throw error;
  }

  const handle = serveStdio(() => buildServer(config), {
    onerror: (error) => console.error(`[plunk-mcp] ${error.message}`),
  });

  console.error(
    `[plunk-mcp] v${SERVER_VERSION} ready on stdio — api=${config.apiUrl}` +
      `${config.readOnly ? ' (read-only)' : ''}${config.publicKey ? '' : ' (no public key: event tracking upserts the contact first)'}`,
  );

  const shutdown = () => {
    void handle.close().finally(() => process.exit(0));
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main();
