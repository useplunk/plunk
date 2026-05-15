import {SES} from '@aws-sdk/client-ses';
import signale from 'signale';

import {
  AWS_SES_ACCESS_KEY_ID,
  AWS_SES_REGION,
  AWS_SES_SECRET_ACCESS_KEY,
  DASHBOARD_URI,
  MAIL_FROM_SUBDOMAIN,
  SES_CONFIGURATION_SET,
  SES_CONFIGURATION_SET_NO_TRACKING,
  TRACKING_TOGGLE_ENABLED,
} from '../app/constants.js';

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
 * Break long lines to comply with email RFC standards
 */
function breakLongLines(input: string, maxLineLength: number, isBase64 = false): string {
  if (isBase64) {
    // For base64 content, break at exact intervals without looking for spaces
    const result = [];
    for (let i = 0; i < input.length; i += maxLineLength) {
      result.push(input.substring(i, i + maxLineLength));
    }
    return result.join('\n');
  } else {
    // For text content, break at spaces when possible
    const lines = input.split('\n');
    const result = [];
    for (let line of lines) {
      while (line.length > maxLineLength) {
        let pos = maxLineLength;
        while (pos > 0 && line[pos] !== ' ') {
          pos--;
        }
        if (pos === 0) {
          pos = maxLineLength;
        }
        result.push(line.substring(0, pos));
        line = line.substring(pos).trim();
      }
      result.push(line);
    }
    return result.join('\n');
  }
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
  // Check if the body contains an unsubscribe link
  const regex = /unsubscribe\/([a-f\d-]+)"/;
  const containsUnsubscribeLink = regex.exec(content.html);

  let unsubscribeHeader = '';
  if (containsUnsubscribeLink?.[1]) {
    const unsubscribeId = containsUnsubscribeLink[1];
    unsubscribeHeader = `List-Unsubscribe: <${DASHBOARD_URI}/unsubscribe/${unsubscribeId}>`;
  }

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

  // Build the additional headers (custom headers + List-Unsubscribe), filtering
  // out empties so we never emit a blank line inside the header section.
  // Per RFC 5322 §2.1, a blank line terminates the header section, so any blank
  // line here would push subsequent headers (notably List-Unsubscribe) into the body.
  const extraHeaderLines = [
    ...(headers ? Object.entries(headers).map(([key, value]) => `${key}: ${value}`) : []),
    ...(unsubscribeHeader ? [unsubscribeHeader] : []),
  ];
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

  // The alternative part content (always contains HTML)
  rawMessage += `--${altBoundary}
Content-Type: text/html; charset=utf-8
Content-Transfer-Encoding: 7bit

${breakLongLines(content.html, 500)}
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

${breakLongLines(attachment.content, 76, true)}`;
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

${breakLongLines(attachment.content, 76, true)}`;
    }
    rawMessage += `\n--${mixedBoundary}--`;
  }

  // Determine which configuration set to use
  // Only use NO_TRACKING if tracking toggle is enabled AND tracking is disabled
  const configurationSetName =
    TRACKING_TOGGLE_ENABLED && !tracking ? SES_CONFIGURATION_SET_NO_TRACKING : SES_CONFIGURATION_SET;

  try {
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
  } catch (error) {
    const originalMessage = error instanceof Error ? error.message : String(error);
    const noTrackingMessage =
      TRACKING_TOGGLE_ENABLED && !tracking
        ? ' If this was a preview/test email, verify SES_CONFIGURATION_SET_NO_TRACKING exists in AWS SES.'
        : '';

    throw new Error(
      `Failed to send email via SES using configuration set "${configurationSetName}".${noTrackingMessage} Original error: ${originalMessage}`,
      {cause: error},
    );
  }
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
