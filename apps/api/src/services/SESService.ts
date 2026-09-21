import {SES} from '@aws-sdk/client-ses';
import signale from 'signale';

import {
  AWS_SES_ACCESS_KEY_ID,
  AWS_SES_REGION,
  AWS_SES_SECRET_ACCESS_KEY,
  MAIL_FROM_SUBDOMAIN,
  SES_CONFIGURATION_SET,
  SES_CONFIGURATION_SET_NO_TRACKING,
  TRACKING_TOGGLE_ENABLED,
} from '../app/constants.js';
import {encodeQuotedPrintable, htmlToPlainText} from '../utils/mime.js';

/**
 * AWS SES Client
 */
export const ses = new SES({
  apiVersion: '2010-12-01',
  region: AWS_SES_REGION,
  credentials: {
    accessKeyId: AWS_SES_ACCESS_KEY_ID,
    secretAccessKey: AWS_SES_SECRET_ACCESS_KEY,
  },
});

interface SendRawEmailParams {
  from: {
    name: string;
    email: string;
  };
  to: string[] | {name?: string; email: string}[];
  content: {
    subject: string;
    html: string;
    /**
     * Plain-text alternative. Derived from `html` when omitted, which is the normal
     * path — this exists so a caller that already has a hand-written text version can
     * supply it instead of taking the conversion.
     */
    text?: string;
  };
  reply?: string;
  headers?: Record<string, string> | null;
  attachments?:
    | {
        filename: string;
        content: string; // Base64 encoded
        contentType: string;
        contentId?: string;
        disposition?: 'attachment' | 'inline';
      }[]
    | null;
  tracking?: boolean;
}

/**
 * Break base64 content into fixed-width lines to comply with RFC 5322's line limit.
 *
 * Base64 is a fixed alphabet with no significant whitespace, so it can be split at any
 * offset. Text and HTML parts do not go through here — they are quoted-printable
 * encoded, which breaks lines with soft breaks the recipient's client removes.
 */
function breakLongLines(input: string, maxLineLength: number): string {
  const result = [];
  for (let i = 0; i < input.length; i += maxLineLength) {
    result.push(input.substring(i, i + maxLineLength));
  }
  return result.join('\n');
}

/**
 * Send a raw email via AWS SES with full MIME formatting
 */
export async function sendRawEmail({
  from,
  to,
  content,
  reply,
  headers,
  attachments,
  tracking = true,
}: SendRawEmailParams): Promise<{messageId: string}> {
  // Generate unique boundaries for multipart messages
  const altBoundary = `----=_AltPart_${Math.random().toString(36).substring(2)}`;
  const mixedBoundary = attachments?.some(a => (a.disposition ?? 'attachment') === 'attachment')
    ? `----=_MixedPart_${Math.random().toString(36).substring(2)}`
    : null;
  const relatedBoundary = attachments?.some(a => a.disposition === 'inline')
    ? `----=_RelatedPart_${Math.random().toString(36).substring(2)}`
    : null;

  // Format To header with names if provided
  const toHeader = to
    .map(recipient => {
      if (typeof recipient === 'string') {
        return recipient;
      } else {
        return recipient.name ? `${recipient.name} <${recipient.email}>` : recipient.email;
      }
    })
    .join(', ');

  // Extract just email addresses for Destinations (SES requirement)
  const destinations = to.map(recipient => (typeof recipient === 'string' ? recipient : recipient.email));

  // Determine root content type
  let rootContentType = `multipart/alternative; boundary="${altBoundary}"`;
  if (mixedBoundary) {
    rootContentType = `multipart/mixed; boundary="${mixedBoundary}"`;
  } else if (relatedBoundary) {
    rootContentType = `multipart/related; boundary="${relatedBoundary}"`;
  }

  // Serialize the caller-provided headers (built by buildEmailHeaders), filtering
  // out empties so we never emit a blank line inside the header section.
  // Per RFC 5322 §2.1, a blank line terminates the header section, so any blank
  // line here would push subsequent headers (notably List-Unsubscribe) into the body.
  const extraHeaderLines = headers ? Object.entries(headers).map(([key, value]) => `${key}: ${value}`) : [];
  const extraHeaders = extraHeaderLines.length > 0 ? `\n${extraHeaderLines.join('\n')}` : '';

  // Build raw MIME message
  let rawMessage = `From: ${from.name} <${from.email}>
To: ${toHeader}
Reply-To: ${reply || from.email}
Subject: ${content.subject}
MIME-Version: 1.0
Content-Type: ${rootContentType}${extraHeaders}

`;

  // building the body
  if (mixedBoundary) {
    rawMessage += `--${mixedBoundary}\n`;
    if (relatedBoundary) {
      rawMessage += `Content-Type: multipart/related; boundary="${relatedBoundary}"\n\n`;
      rawMessage += `--${relatedBoundary}\n`;
    }
  } else if (relatedBoundary) {
    rawMessage += `--${relatedBoundary}\n`;
  }

  // If we are nested, we need to specify that this next part is the alternative container
  if (mixedBoundary || relatedBoundary) {
    rawMessage += `Content-Type: multipart/alternative; boundary="${altBoundary}"\n\n`;
  }

  // The plain-text alternative comes first: `multipart/alternative` is ordered
  // least-rich to most-rich (RFC 2046 §5.1.4), and clients render the last part they
  // can display. Emitting these the other way round would show plain text to everyone.
  //
  // Skipped entirely when the conversion yields nothing (an image-only email, say).
  // An empty text part is worse than no text part: it is the exact shape of the
  // filter-evasion message the spam rules are looking for.
  const plainText = content.text ?? htmlToPlainText(content.html);
  if (plainText.trim().length > 0) {
    rawMessage += `--${altBoundary}
Content-Type: text/plain; charset=utf-8
Content-Transfer-Encoding: quoted-printable

${encodeQuotedPrintable(plainText)}
`;
  }

  // The alternative part content (always contains HTML)
  rawMessage += `--${altBoundary}
Content-Type: text/html; charset=utf-8
Content-Transfer-Encoding: quoted-printable

${encodeQuotedPrintable(content.html)}
--${altBoundary}--
`;

  // Add inline attachments to the related container
  if (relatedBoundary) {
    const inlineAttachments = attachments?.filter(a => a.disposition === 'inline') ?? [];
    for (const attachment of inlineAttachments) {
      rawMessage += `\n--${relatedBoundary}
Content-Type: ${attachment.contentType}
Content-Transfer-Encoding: base64
Content-ID: <${attachment.contentId || attachment.filename}>
Content-Disposition: inline; filename="${attachment.filename}"

${breakLongLines(attachment.content, 76)}`;
    }
    rawMessage += `\n--${relatedBoundary}--`;
  }

  // Add regular attachments to the mixed container
  if (mixedBoundary) {
    const regularAttachments = attachments?.filter(a => (a.disposition ?? 'attachment') === 'attachment') ?? [];
    for (const attachment of regularAttachments) {
      rawMessage += `\n--${mixedBoundary}
Content-Type: ${attachment.contentType}
Content-Transfer-Encoding: base64
Content-Disposition: attachment; filename="${attachment.filename}"

${breakLongLines(attachment.content, 76)}`;
    }
    rawMessage += `\n--${mixedBoundary}--`;
  }

  // Determine which configuration set to use
  // Only use NO_TRACKING if tracking toggle is enabled AND tracking is disabled
  const configurationSetName =
    TRACKING_TOGGLE_ENABLED && !tracking ? SES_CONFIGURATION_SET_NO_TRACKING : SES_CONFIGURATION_SET;

  // Send via SES
  const response = await ses.sendRawEmail({
    Destinations: destinations,
    ConfigurationSetName: configurationSetName,
    RawMessage: {
      Data: new TextEncoder().encode(rawMessage),
    },
    Source: `${from.name} <${from.email}>`,
  });

  if (!response.MessageId) {
    throw new Error('Could not send email');
  }

  return {messageId: response.MessageId};
}

/**
 * Get verification attributes for multiple domain identities
 */
export const getIdentities = async (domains: string[]): Promise<{domain: string; status: string}[]> => {
  const res = await ses.getIdentityVerificationAttributes({
    Identities: domains,
  });

  const parsedResult = Object.entries(res.VerificationAttributes ?? {});
  return parsedResult.map(obj => {
    return {domain: obj[0], status: obj[1].VerificationStatus ?? 'NotStarted'};
  });
};

/**
 * Verify a domain and get DKIM tokens for DNS configuration
 */
export const verifyDomain = async (domain: string): Promise<string[]> => {
  // Verify DKIM for the domain
  const DKIM = await ses.verifyDomainDkim({Domain: domain});

  // Set custom MAIL FROM domain. The subdomain defaults to `plunk` and can be
  // overridden via the MAIL_FROM_SUBDOMAIN env var — useful when `plunk.<domain>`
  // is already in use for something else (e.g., a CNAME to a CDN), since the
  // MAIL FROM subdomain needs MX + TXT records that conflict with a CNAME.
  await ses.setIdentityMailFromDomain({
    Identity: domain,
    MailFromDomain: `${MAIL_FROM_SUBDOMAIN}.${domain}`,
  });

  return DKIM.DkimTokens ?? [];
};

/**
 * Get DKIM verification attributes for a domain
 */
export const getDomainVerificationAttributes = async (domain: string) => {
  const attributes = await ses.getIdentityDkimAttributes({
    Identities: [domain],
  });

  const parsedAttributes = Object.entries(attributes.DkimAttributes ?? {});

  if (parsedAttributes.length === 0) {
    return {
      domain,
      tokens: [],
      status: 'NotStarted',
    };
  }

  const firstAttribute = parsedAttributes[0];
  if (!firstAttribute) {
    return {
      domain,
      tokens: [],
      status: 'NotStarted',
    };
  }

  return {
    domain: firstAttribute[0],
    tokens: firstAttribute[1].DkimTokens ?? [],
    status: firstAttribute[1].DkimVerificationStatus ?? 'NotStarted',
  };
};

/**
 * Disable bounce/complaint forwarding for a verified domain
 */
export const disableFeedbackForwarding = async (domain: string): Promise<void> => {
  await ses.setIdentityFeedbackForwardingEnabled({
    Identity: domain,
    ForwardingEnabled: false,
  });
};

/**
 * Delete a verified domain identity from AWS SES
 */
export const deleteIdentity = async (domain: string): Promise<void> => {
  await ses.deleteIdentity({Identity: domain});
};

/**
 * Get AWS SES account sending quota and rate limit
 * @returns MaxSendRate (emails per second) or null if the call fails
 */
export const getSendingQuota = async (): Promise<{
  maxSendRate: number;
  max24HourSend: number;
  sentLast24Hours: number;
} | null> => {
  try {
    const quota = await ses.getSendQuota({});

    return {
      maxSendRate: quota.MaxSendRate ?? 14, // Default to sandbox limit if not provided
      max24HourSend: quota.Max24HourSend ?? 200, // Default sandbox daily limit
      sentLast24Hours: quota.SentLast24Hours ?? 0,
    };
  } catch (error) {
    signale.error('[SES] Failed to fetch sending quota:', error);
    return null;
  }
};
