/**
 * Contact subscription types
 */

/**
 * How long a recipient asked to stop receiving email for.
 *
 * A fixed set rather than an arbitrary date because the endpoint that accepts it is
 * unauthenticated -- the recipient-facing snooze page -- so the range of states a stranger
 * can put a contact into stays small and reviewable. Operators who need an arbitrary date
 * resubscribe or unsubscribe through the authenticated API instead.
 *
 * Values are the wire format: they appear in the request body, in the `duration` field of the
 * `contact.unsubscribed` event, and as i18n key suffixes (`pages.snooze.duration.<value>`).
 */
export const SNOOZE_DURATIONS = ['2_weeks', '1_month', '6_months', '1_year'] as const;

export type SnoozeDuration = (typeof SNOOZE_DURATIONS)[number];

/**
 * Why a contact's subscription changed, carried on the `data` of the resulting
 * `contact.subscribed` / `contact.unsubscribed` event.
 *
 * Snoozing deliberately reuses those two events rather than introducing new names: workflows,
 * `WAIT_FOR_EVENT` steps, the activity feed and the campaign opt-out counters all read them
 * already, and a sender who wants to treat a snooze differently branches on this field.
 *
 * `bounce` and `complaint` predate this type and are written by the SES webhook.
 */
export type SubscriptionChangeReason = 'bounce' | 'complaint' | 'snooze' | 'snooze_expired';

/**
 * The subscription state the dashboard shows and filters on.
 *
 * Derived, not stored: `snoozed` is `subscribed = false` with a `snoozedUntil` in the future.
 * Storing it would mean a third state every send path had to learn about.
 */
export type ContactSubscriptionStatus = 'subscribed' | 'snoozed' | 'unsubscribed';

/**
 * A field the segment builder, workflow conditions and template editor can filter or
 * interpolate on. Either a column on `Contact` (`email`, `subscribed`, ...) or a key
 * discovered inside the `Contact.data` JSON, in which case `field` is `data.<key>`.
 */
export interface ContactField {
  field: string;
  type: ContactFieldType;
  /**
   * Percentage of the project's contacts carrying this field, rounded. Always 100 for
   * the standard columns. A field only 4% of contacts have is the difference between a
   * working template and a silent blank, so the pickers surface it.
   */
  coverage: number;
}

export type ContactFieldType = 'string' | 'number' | 'boolean' | 'date';
