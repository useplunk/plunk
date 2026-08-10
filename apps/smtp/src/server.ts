import 'dotenv/config';
import {type AddressObject, simpleParser} from 'mailparser';
import signale from 'signale';
import {
  SMTPServer,
  type SMTPServerAddress,
  type SMTPServerAuthentication,
  type SMTPServerAuthenticationResponse,
  type SMTPServerDataStream,
  type SMTPServerOptions,
  type SMTPServerSession,
} from 'smtp-server';
import fs from 'fs';
import path from 'path';

import {prisma} from './database/prisma.js';

// Environment variables
const API_URI = process.env.API_URI ?? 'http://localhost:3000';
const SMTP_DOMAIN = process.env.SMTP_DOMAIN ?? '';
const MAX_RECIPIENTS = parseInt(process.env.MAX_RECIPIENTS ?? '5', 10);
const MAX_ATTACHMENT_SIZE_MB = parseInt(process.env.MAX_ATTACHMENT_SIZE_MB ?? '10', 10);
const PORT_SECURE = parseInt(process.env.PORT_SECURE ?? '465', 10);
const PORT_SUBMISSION = parseInt(process.env.PORT_SUBMISSION ?? '587', 10);
const CERT_PATH = process.env.CERT_PATH ?? '/certs';
const ACME_JSON_PATH = process.env.ACME_JSON_PATH ?? path.join(CERT_PATH, 'acme.json');

// Extended session interface to store authenticated project
interface ExtendedSession extends SMTPServerSession {
  user?: string;
  address?: string;
  envelope: {
    mailFrom: SMTPServerAddress | false;
    rcptTo: SMTPServerAddress[];
  };
}

/**
 * Load certificates from Traefik's acme.json file
 * Requires SMTP_DOMAIN to be set to select the correct certificate
 */
function loadFromTraefikAcme(): {key: Buffer; cert: Buffer} | null {
  try {
    if (!fs.existsSync(ACME_JSON_PATH)) {
      return null;
    }

    if (!SMTP_DOMAIN) {
      signale.warn('SMTP_DOMAIN not set, cannot load certificate from acme.json');
      return null;
    }

    signale.info(`Loading certificates from Traefik acme.json: ${ACME_JSON_PATH}`);
    const acmeData = JSON.parse(fs.readFileSync(ACME_JSON_PATH, 'utf8'));

    // Traefik acme.json structure: {letsencrypt: {Certificates: [{domain: {main: ...}, certificate: ..., key: ...}]}}
    const certificates = acmeData?.letsencrypt?.Certificates || acmeData?.Certificates || [];

    interface TraefikCert {
      domain?: string | {main?: string};
      certificate: string;
      key: string;
    }

    const certData = certificates.find(
      (cert: TraefikCert) =>
        (typeof cert.domain === 'object' && cert.domain?.main === SMTP_DOMAIN) || cert.domain === SMTP_DOMAIN,
    );

    if (!certData) {
      signale.warn(`Certificate for domain ${SMTP_DOMAIN} not found in acme.json`);
      return null;
    }

    // Decode base64 encoded certificate and key
    const cert = Buffer.from(certData.certificate, 'base64');
    const key = Buffer.from(certData.key, 'base64');

    signale.success(`Loaded certificate for ${SMTP_DOMAIN} from Traefik acme.json`);
    return {key, cert};
  } catch (error) {
    signale.error('Failed to load Traefik acme.json:', error);
    return null;
  }
}

/**
 * Load certificates from PEM files
 * Looks for standard filenames: privkey.pem and fullchain.pem
 */
function loadFromPemFiles(): {key: Buffer; cert: Buffer} | null {
  try {
    const keyPath = path.join(CERT_PATH, 'privkey.pem');
    const certPath = path.join(CERT_PATH, 'fullchain.pem');

    if (!fs.existsSync(keyPath) || !fs.existsSync(certPath)) {
      return null;
    }

    signale.info(`Loading certificates from ${keyPath} and ${certPath}`);
    const key = fs.readFileSync(keyPath);
    const cert = fs.readFileSync(certPath);

    signale.success('Loaded certificates from PEM files');
    return {key, cert};
  } catch (error) {
    signale.error('Failed to load PEM files:', error);
    return null;
  }
}

/**
 * Load TLS certificates
 * Priority:
 * 1. Mounted Traefik acme.json
 * 2. Mounted PEM files
 * 3. No TLS
 */
async function getCertificates(): Promise<{key: Buffer; cert: Buffer} | null> {
  try {
    signale.info('Checking for mounted certificates...');

    // Try loading from Traefik acme.json
    let certs = loadFromTraefikAcme();
    if (certs) {
      return certs;
    }

    // Try loading from PEM files
    certs = loadFromPemFiles();
    if (certs) {
      return certs;
    }

    signale.warn('No certificates found. SMTP server will run without TLS.');
    signale.info('To use TLS, mount certificates to one of:');
    signale.info(`  1. Traefik acme.json: ${ACME_JSON_PATH}`);
    signale.info(`  2. PEM files: ${CERT_PATH}/privkey.pem and ${CERT_PATH}/fullchain.pem`);
    return null;
  } catch (error) {
    signale.error('Failed to load certificates:', error);
    return null;
  }
}

/**
 * Authentication handler
 * Validates API key against the database
 */
async function handleAuth(
  auth: SMTPServerAuthentication,
  session: ExtendedSession,
  callback: (err: Error | null | undefined, response?: SMTPServerAuthenticationResponse) => void,
): Promise<void> {
  try {
    // Username must be 'plunk'
    if (auth.username?.toLowerCase() !== 'plunk') {
      return callback(new Error('Invalid username'));
    }

    // Validate API key (project secret)
    const project = await prisma.project.findUnique({
      where: {
        secret: auth.password,
      },
      select: {
        id: true,
        secret: true,
      },
    });

    if (!project) {
      return callback(new Error('Invalid API key'));
    }

    // Store the API key in the session for later use
    callback(null, {user: project.secret});
  } catch (error) {
    signale.error('Authentication error:', error);
    callback(new Error('Authentication failed'));
  }
}

/**
 * MAIL FROM handler
 * Validates that the sender domain belongs to the authenticated project and is verified
 */
async function handleMailFrom(
  address: SMTPServerAddress,
  session: ExtendedSession,
  callback: (err?: Error | null) => void,
): Promise<void> {
  try {
    const senderDomain = address.address.split('@')[1];

    // First, get the authenticated project
    const project = await prisma.project.findUnique({
      where: {
        secret: session.user,
      },
      select: {
        id: true,
      },
    });

    if (!project) {
      return callback(new Error('Invalid session'));
    }

    // Check if this domain belongs to the project and is verified
    const domain = await prisma.domain.findFirst({
      where: {
        projectId: project.id,
        domain: senderDomain,
        verified: true,
      },
    });

    if (!domain) {
      return callback(new Error('Sender domain is not verified or not associated with your account'));
    }

    // Store the sender address for later use
    session.address = address.address;
    callback();
  } catch (error) {
    signale.error('MAIL FROM error:', error);
    callback(new Error('Failed to validate sender'));
  }
}

/**
 * RCPT TO handler
 * Validates recipient limit
 */
function handleRcptTo(
  address: SMTPServerAddress,
  session: ExtendedSession,
  callback: (err?: Error | null) => void,
): void {
  if (session.envelope.rcptTo.length >= MAX_RECIPIENTS) {
    return callback(new Error(`Maximum ${MAX_RECIPIENTS} recipients allowed`));
  }
  callback();
}

/**
 * DATA handler
 * Parses the email and relays it to the API
 */
function handleData(
  stream: SMTPServerDataStream,
  session: ExtendedSession,
  callback: (err?: Error | null) => void,
): void {
  simpleParser(stream, async (err, parsed) => {
    if (err) {
      signale.error('Email parsing error:', err);
      return callback(new Error('Failed to parse email'));
    }

    // Validate sender
    if (!parsed.from && !session.address) {
      return callback(new Error('Email must have a sender'));
    }

    // Validate recipients
    if (!session.envelope.rcptTo || session.envelope.rcptTo.length === 0) {
      return callback(new Error('Email must have at least one recipient'));
    }

    // Validate subject
    if (!parsed.subject || parsed.subject.trim() === '') {
      return callback(new Error('Email must have a subject'));
    }

    // Validate subject length (RFC 5322 recommends < 78 chars per line, but max is 998)
    if (parsed.subject.length > 998) {
      return callback(new Error('Subject line is too long (max 998 characters)'));
    }

    // Validate body content
    const bodyContent = parsed.html || parsed.text;
    if (!bodyContent || (typeof bodyContent === 'string' && bodyContent.trim() === '')) {
      return callback(new Error('Email must have a body (HTML or text content)'));
    }

    const fromAddress = parsed.from?.value[0]?.address ?? session.address;
    const fromName = parsed.from?.value[0]?.name;

    // Build from object with name if available
    const from = fromName ? {name: fromName, email: fromAddress} : fromAddress;

    // Reply-To is in `standardHeaders` below, so it is deliberately excluded from
    // `customHeaders`. Carry it in the API's own `reply` field instead — without
    // this the header is parsed and then silently dropped, and the recipient's
    // reply goes to the From address.
    const replyTo = parsed.replyTo?.value[0]?.address;

    // Parse recipients with names from To/CC headers
    // Build a map of email -> name from the parsed headers
    const recipientNameMap = new Map<string, string>();

    // Helper to extract addresses from AddressObject
    const extractAddresses = (addressObj: AddressObject | AddressObject[] | undefined) => {
      if (!addressObj) return [];
      // Handle both single AddressObject and array
      const addresses = Array.isArray(addressObj) ? addressObj : [addressObj];
      return addresses.flatMap(obj => obj.value || []);
    };

    if (parsed.to) {
      for (const addr of extractAddresses(parsed.to)) {
        if (addr.address && addr.name) {
          recipientNameMap.set(addr.address.toLowerCase(), addr.name);
        }
      }
    }

    if (parsed.cc) {
      for (const addr of extractAddresses(parsed.cc)) {
        if (addr.address && addr.name) {
          recipientNameMap.set(addr.address.toLowerCase(), addr.name);
        }
      }
    }

    // Map SMTP recipients to objects with names when available
    const recipients = session.envelope.rcptTo.map((to: SMTPServerAddress) => {
      const name = recipientNameMap.get(to.address.toLowerCase());
      return name ? {name, email: to.address} : to.address;
    });

    // Parse attachments
    const attachments = parsed.attachments
      ? parsed.attachments.map(attachment => ({
          filename: attachment.filename || 'attachment',
          content: attachment.content.toString('base64'),
          contentType: attachment.contentType,
        }))
      : undefined;

    // Extract custom headers from the parsed email
    // Filter out standard headers that are automatically set
    const standardHeaders = new Set([
      'from',
      'to',
      'cc',
      'bcc',
      'subject',
      'date',
      'message-id',
      'mime-version',
      'content-type',
      'content-transfer-encoding',
      'reply-to',
      'return-path',
      'received',
      'dkim-signature',
    ]);

    // RFC 5322 header name validation: printable ASCII except colon and space
    const headerNameRegex = /^[!-9;-~]+$/;
    const MAX_CUSTOM_HEADERS = 50;

    const customHeaders: Record<string, string> = {};
    if (parsed.headers) {
      for (const [key, value] of parsed.headers) {
        const normalizedKey = key.toLowerCase();

        // Skip standard headers
        if (standardHeaders.has(normalizedKey)) {
          continue;
        }

        // Validate header name (RFC 5322 compliance)
        if (!headerNameRegex.test(key)) {
          return callback(new Error(`Invalid header name: ${key}`));
        }

        // Limit number of custom headers to prevent abuse
        if (Object.keys(customHeaders).length >= MAX_CUSTOM_HEADERS) {
          return callback(new Error(`Too many custom headers (max ${MAX_CUSTOM_HEADERS})`));
        }

        // Get string value from header
        const headerValue = Array.isArray(value) ? value.join(', ') : String(value);

        // Validate header value length (RFC 5322 recommends max 998 chars per line)
        if (headerValue.length > 998) {
          return callback(new Error(`Header value too long for ${key} (max 998 characters)`));
        }

        customHeaders[key] = headerValue;
      }
    }

    try {
      // Relay to API
      const response = await fetch(`${API_URI}/v1/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.user}`,
        },
        body: JSON.stringify({
          from: from,
          to: recipients,
          subject: parsed.subject,
          body: bodyContent,
          reply: replyTo,
          headers: Object.keys(customHeaders).length > 0 ? customHeaders : undefined,
          attachments: attachments,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        signale.error(`API error (${response.status}):`, errorText);
        return callback(new Error(`Failed to send email: ${response.statusText}`));
      }

      // Build log message showing recipients (with names if available)
      const recipientList = session.envelope.rcptTo
        .map((to: SMTPServerAddress) => {
          const name = recipientNameMap.get(to.address.toLowerCase());
          return name ? `${name} <${to.address}>` : to.address;
        })
        .join(', ');

      signale.success(`Email relayed: ${fromName ? `${fromName} <${fromAddress}>` : fromAddress} → ${recipientList}`);
      callback();
    } catch (error) {
      signale.error('Relay error:', error);
      callback(new Error('Failed to relay email to API'));
    }
  });
}

/**
 * Create and start an SMTP server
 */
function createSMTPServer(options: {secure: boolean; port: number; key?: Buffer; cert?: Buffer}): void {
  const {secure, port, key, cert} = options;

  const serverOptions: SMTPServerOptions = {
    onAuth: handleAuth,
    onMailFrom: handleMailFrom,
    onRcptTo: handleRcptTo,
    onData: handleData,
    banner: 'Plunk SMTP Relay',
    size: MAX_ATTACHMENT_SIZE_MB * 1024 * 1024,
    authOptional: false, // Require authentication
  };

  // Add TLS if certificates are available
  if (key && cert) {
    serverOptions.key = key;
    serverOptions.cert = cert;
    serverOptions.secure = secure;
  } else if (secure) {
    signale.warn(`Cannot start secure server on port ${port} without TLS certificates`);
    return;
  }

  const server = new SMTPServer(serverOptions);

  server.on('error', (err: Error) => {
    signale.error(`SMTP server error on port ${port}:`, err.message);
  });

  server.listen(port, '0.0.0.0', () => {
    signale.success(`SMTP server listening on port ${port} (secure=${secure})`);
  });
}

/**
 * Validate environment configuration
 */
function validateEnvironment(): void {
  // Validate MAX_RECIPIENTS
  if (MAX_RECIPIENTS < 1 || MAX_RECIPIENTS > 100) {
    signale.fatal('MAX_RECIPIENTS must be between 1 and 100');
    process.exit(1);
  }

  // Validate ports
  if (PORT_SECURE < 1 || PORT_SECURE > 65535) {
    signale.fatal('PORT_SECURE must be a valid port number (1-65535)');
    process.exit(1);
  }

  if (PORT_SUBMISSION < 1 || PORT_SUBMISSION > 65535) {
    signale.fatal('PORT_SUBMISSION must be a valid port number (1-65535)');
    process.exit(1);
  }

  if (PORT_SECURE === PORT_SUBMISSION) {
    signale.fatal('PORT_SECURE and PORT_SUBMISSION must be different');
    process.exit(1);
  }

  // Validate API_URI
  try {
    new URL(API_URI);
  } catch {
    signale.fatal('API_URI must be a valid URL');
    process.exit(1);
  }

  signale.success('Environment configuration validated');
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  signale.info('Starting Plunk SMTP Relay...');

  // Validate environment configuration
  validateEnvironment();

  signale.info(`API endpoint: ${API_URI}`);
  signale.info(`Max recipients per email: ${MAX_RECIPIENTS}`);

  if (SMTP_DOMAIN) {
    signale.info(`SMTP domain: ${SMTP_DOMAIN}`);
  }

  const certs = await getCertificates();

  // Start secure SMTP (port 465) - only if TLS is available
  if (certs) {
    createSMTPServer({
      secure: true,
      port: PORT_SECURE,
      key: certs.key,
      cert: certs.cert,
    });
  }

  // Start submission SMTP (port 587) - STARTTLS if certs available, plaintext otherwise
  createSMTPServer({
    secure: false,
    port: PORT_SUBMISSION,
    key: certs?.key,
    cert: certs?.cert,
  });

  signale.success('SMTP relay started successfully');

  if (!certs) {
    signale.warn('⚠️  Running without TLS encryption. Mount certificates to enable TLS.');
  }
}

// Start the server
main().catch(error => {
  signale.fatal('Failed to start SMTP server:', error);
  process.exit(1);
});
