import type {TemplateType} from '@plunk/db';
import {EmailSourceType} from '@plunk/db';

import {API_URI} from '../app/constants.js';

/**
 * Classification of an outbound email, derived by the caller from the email's
 * source type and template/campaign type. This is the single axis that decides
 * which standards-based headers a message carries:
 *
 * - `marketing`     — bulk/promotional mail the recipient is subscribed to
 *                     (campaign broadcasts and marketing workflow automations).
 *                     Carries the List-Unsubscribe one-click pair and the
 *                     bulk/auto-reply suppression headers.
 * - `transactional` — mail that may legitimately expect a human reply (password
 *                     resets, receipts). Carries no List-Unsubscribe pair. Still
 *                     gets the bulk suppression headers when sent as a campaign,
 *                     because a mass transactional broadcast is still bulk mail.
 * - `headless`      — raw HTML the sender fully controls; Plunk adds no footer or
 *                     badge to the body. Like transactional, it takes no
 *                     List-Unsubscribe pair but does get the bulk suppression
 *                     headers when sent as a campaign.
 *
 * Note that class is one of two orthogonal axes: it decides the List-Unsubscribe
 * pair (marketing only), while whether the send is a campaign decides the bulk
 * suppression headers. See {@link buildEmailHeaders}.
 */
export type EmailClass = 'marketing' | 'transactional' | 'headless';

/**
 * Classify an outbound email from its source type and (optional) template/campaign
 * type. HEADLESS wins outright (the sender fully controls the output), then
 * TRANSACTIONAL source; everything else is bulk marketing. Transactional campaigns
 * and transactional templates already resolve to a TRANSACTIONAL `sourceType`
 * upstream, so `sourceType` is the sole signal for the transactional case here.
 */
export function classifyEmail(params: {
  sourceType: EmailSourceType;
  templateType?: TemplateType | null;
  campaignType?: TemplateType | null;
}): EmailClass {
  if (params.templateType === 'HEADLESS' || params.campaignType === 'HEADLESS') {
    return 'headless';
  }
  if (params.sourceType === EmailSourceType.TRANSACTIONAL) {
    return 'transactional';
  }
  return 'marketing';
}

/**
 * Detect whether a compiled email body carries a Plunk list-management link
 * (unsubscribe or manage preference center) for the given contact — either from
 * the marketing footer or from a `{{unsubscribeUrl}}` / `{{manageUrl}}` placeholder
 * the sender embedded. Such a link means the recipient can opt out, so the message
 * must advertise List-Unsubscribe regardless of its class.
 */
export function bodyHasListManagementLink(html: string, contactId: string): boolean {
  return html.includes(`/unsubscribe/${contactId}`) || html.includes(`/manage/${contactId}`);
}

/**
 * Tag a list-management URL with the email it was sent in, as `?e=<id>`.
 *
 * Recipient-initiated opt-outs are otherwise unattributable: the links are
 * scoped to the contact, so nothing in the request says which message prompted
 * it. The parameter is advisory — the endpoint checks the email belongs to the
 * contact before recording it, and the contact id in the path still governs the
 * change — so a stripped or rewritten value costs attribution and nothing else.
 *
 * Only callers that hold a persisted email row can supply an id. Links rendered
 * before the email exists (campaign and workflow bodies, `POST /send`) pass
 * nothing and stay unattributed.
 */
export function withSourceEmail(url: string, sourceEmailId?: string): string {
  if (!sourceEmailId) {
    return url;
  }

  // Every caller today passes a query-less URL, but appending a bare `?` to one that already
  // carries a query would silently produce `...?utm=x?e=y` -- a parameter no endpoint reads.
  const separator = url.includes('?') ? '&' : '?';

  return `${url}${separator}e=${encodeURIComponent(sourceEmailId)}`;
}

export interface BuildEmailHeadersParams {
  emailClass: EmailClass;
  /**
   * Whether this email is part of a campaign broadcast. Campaigns are bulk sends
   * by nature, so they receive the bulk/auto-reply suppression headers even when
   * the campaign is transactional or headless — a mass transactional announcement
   * is still bulk mail. Does not affect the List-Unsubscribe pair.
   */
  isCampaign?: boolean;
  /**
   * Whether the rendered body contains a Plunk unsubscribe/manage link for the
   * recipient (see {@link bodyHasListManagementLink}). When true, the
   * List-Unsubscribe pair is emitted regardless of class — a sender who put an
   * opt-out link in the body clearly means the recipient to be able to unsubscribe.
   */
  hasListManagementLink?: boolean;
  /**
   * Contact id used to build the List-Unsubscribe URL. Required for the
   * List-Unsubscribe pair to be emitted; omit it and no pair is added.
   */
  unsubscribeId?: string;
  /**
   * Id of the email being sent, tagged onto the List-Unsubscribe URL so a
   * one-click opt-out can be attributed to the message that prompted it.
   * See {@link withSourceEmail}.
   */
  sourceEmailId?: string;
  /**
   * Caller-supplied headers (internal `X-Plunk-*` routing keys already stripped).
   * These override any default header with the same name — see {@link mergeHeaders}.
   */
  customHeaders?: Record<string, string> | null;
}

/**
 * Build the header set for an outbound email from a few orthogonal facts:
 *
 * - **List-Unsubscribe / List-Unsubscribe-Post** — RFC 8058 one-click unsubscribe.
 *   Emitted whenever the recipient can opt out: for `marketing` sends (which carry
 *   the footer), and for *any* send whose body embeds an unsubscribe/manage link
 *   (`hasListManagementLink`) — a sender who added an opt-out link means it to work,
 *   whatever the class. Transactional mail without such a link gets no pair, per
 *   Gmail/Yahoo's transactional exemption.
 * - **Precedence / Auto-Submitted / X-Auto-Response-Suppress** — mark the message as
 *   bulk/automated so receivers suppress auto-replies (out-of-office, read receipts)
 *   instead of looping them back to the sender. This keys on "is this a bulk send?",
 *   so it covers marketing mail *and* every campaign broadcast, transactional ones
 *   included.
 *
 * The returned record is the complete set of extra headers for the message;
 * {@link sendRawEmail} serializes it verbatim.
 */
export function buildEmailHeaders({
  emailClass,
  isCampaign = false,
  hasListManagementLink = false,
  unsubscribeId,
  sourceEmailId,
  customHeaders,
}: BuildEmailHeadersParams): Record<string, string> {
  const defaults: Record<string, string> = {};
  const isMarketing = emailClass === 'marketing';

  // One-click unsubscribe — for subscribed marketing mail, or any message whose
  // body advertises an opt-out link. Both headers must be present for mailbox
  // providers to render the one-click control, and List-Unsubscribe-Post is
  // meaningless without a target, so the pair is only emitted together when we
  // have an unsubscribe URL to point at.
  //
  // The URL must point at the API's one-click endpoint, not the dashboard page:
  // RFC 8058 requires the target to unsubscribe on a bare POST, with no user
  // interaction. The dashboard route is a client-rendered page that only
  // unsubscribes on a button click, so a provider POSTing to it would get a
  // response but change nothing. `GET /unsubscribe/:id` on the API redirects to
  // that dashboard page, so this one URL still serves humans who click through.
  if ((isMarketing || hasListManagementLink) && unsubscribeId) {
    defaults['List-Unsubscribe'] =
      `<${withSourceEmail(`${API_URI}/unsubscribe/${unsubscribeId}`, sourceEmailId)}>`;
    defaults['List-Unsubscribe-Post'] = 'List-Unsubscribe=One-Click';
  }

  // Bulk / auto-reply suppression — any bulk or automated send: marketing mail and
  // every campaign broadcast. `Precedence: bulk` is the widely-honored de-facto
  // signal, `Auto-Submitted: auto-generated` is the RFC 3834 equivalent, and
  // `X-Auto-Response-Suppress: All` covers Exchange/Outlook out-of-office replies.
  if (isMarketing || isCampaign) {
    defaults.Precedence = 'bulk';
    defaults['Auto-Submitted'] = 'auto-generated';
    defaults['X-Auto-Response-Suppress'] = 'All';
  }

  return mergeHeaders(defaults, customHeaders);
}

/**
 * The RFC 8058 one-click pair. These two headers are a single assertion split
 * across two lines — `List-Unsubscribe-Post` claims that the URL in
 * `List-Unsubscribe` honors an unattended POST — so they are merged as a unit
 * rather than name by name. See {@link mergeHeaders}.
 */
const LIST_UNSUBSCRIBE_PAIR = ['list-unsubscribe', 'list-unsubscribe-post'];

/**
 * Merge caller-supplied headers over Plunk's defaults. Header names are
 * case-insensitive per RFC 5322 §2.2, so a caller header replaces the matching
 * default (rather than producing a duplicate line), keeping the caller's casing
 * and value. Defaults keep their original order; any caller-only headers are
 * appended after them.
 *
 * The one-click pair is the exception to the name-by-name rule: a caller who
 * supplies either member takes over both. Merging them independently would let a
 * caller who sets only `List-Unsubscribe` (pointing at their own endpoint)
 * inherit Plunk's `List-Unsubscribe-Post`, making us assert one-click support for
 * a URL that never claimed it — mailbox providers would then POST to an endpoint
 * that may do nothing, and silently report the unsubscribe as done.
 */
function mergeHeaders(
  defaults: Record<string, string>,
  custom?: Record<string, string> | null,
): Record<string, string> {
  if (!custom || Object.keys(custom).length === 0) {
    return {...defaults};
  }

  const customNames = new Set(Object.keys(custom).map(name => name.toLowerCase()));
  const customOwnsUnsubscribePair = LIST_UNSUBSCRIBE_PAIR.some(name => customNames.has(name));

  const byLowerName = new Map<string, {name: string; value: string}>();
  for (const [name, value] of Object.entries(defaults)) {
    const lowerName = name.toLowerCase();
    if (customOwnsUnsubscribePair && LIST_UNSUBSCRIBE_PAIR.includes(lowerName)) {
      continue;
    }
    byLowerName.set(lowerName, {name, value});
  }
  for (const [name, value] of Object.entries(custom)) {
    byLowerName.set(name.toLowerCase(), {name, value});
  }

  const merged: Record<string, string> = {};
  for (const {name, value} of byLowerName.values()) {
    merged[name] = value;
  }
  return merged;
}
