import {type Contact, Prisma} from '@plunk/db';
import type {
  ContactSubscriptionStatus,
  CursorPaginatedResponse,
  FilterCondition,
  FilterGroup,
  SnoozeDuration,
} from '@plunk/types';
import {toPrismaJson} from '@plunk/types';
import signale from 'signale';

import {prisma} from '../database/prisma.js';
import {HttpException} from '../exceptions/index.js';
import {EventService} from './EventService.js';

export class ContactService {
  /**
   * Normalize an email address for storage and lookup.
   *
   * Emails are stored lowercased and trimmed so that the find-or-create path
   * (`upsert`/`findByEmail`) and the `(projectId, email)` unique constraint
   * treat case-variant addresses as the same contact. In practice every major
   * mailbox provider delivers `User@x.com` and `user@x.com` to the same inbox,
   * so treating them as one person matches how recipients actually experience
   * email and prevents duplicate, segment-less contacts. Mirrors the `User`
   * model, which already lowercases on write.
   */
  public static normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  /**
   * Normalize a search needle so it matches the stored form of `email`.
   *
   * Contact emails are lowercase at the database level (a BEFORE INSERT/UPDATE trigger
   * added in 20260918120000_contact_email_lowercase, on top of the normalization every
   * write path already does). That invariant is what lets search use plain `LIKE`
   * instead of `ILIKE`: case-insensitive matching costs roughly 3x on the terms too
   * common for the trigram index to help with, and it is pure waste against a column
   * that cannot contain uppercase. The needle has to be folded the same way the column
   * is, or a capitalised query would silently match nothing.
   */
  public static normalizeEmailSearch(search: string): string {
    return search.trim().toLowerCase();
  }

  /**
   * Translate a subscription status into a where-clause fragment.
   *
   * `snoozed` is derived, not stored -- it is `subscribed = false` with a snooze date still
   * set. `unsubscribed` therefore has to exclude snoozed contacts explicitly, or the two
   * filters would overlap and the dashboard's counts would not add up.
   *
   * Falls back to the legacy `subscribed` boolean when no status is given.
   */
  private static buildStatusWhere(
    status?: ContactSubscriptionStatus,
    subscribed?: boolean,
  ): Prisma.ContactWhereInput {
    switch (status) {
      case 'subscribed':
        return {subscribed: true};
      case 'snoozed':
        return {subscribed: false, snoozedUntil: {not: null}};
      case 'unsubscribed':
        return {subscribed: false, snoozedUntil: null};
      default:
        return subscribed !== undefined ? {subscribed} : {};
    }
  }

  /**
   * Get all contacts for a project with cursor-based pagination
   * Uses cursor pagination for better performance with large datasets
   */
  public static async list(
    projectId: string,
    limit = 20,
    cursor?: string,
    search?: string,
    options?: {
      /**
       * Filter by subscription state, including the derived `snoozed` state.
       * The `subscribed` and `unsubscribed` branches are backed by the
       * `(projectId, subscribed)` index; `snoozed` narrows that further on `snoozedUntil`.
       */
      status?: ContactSubscriptionStatus;
      /**
       * Legacy boolean filter, kept so existing `?subscribed=true|false` callers keep working.
       * Ignored when `status` is given.
       */
      subscribed?: boolean;
      /**
       * Sortable columns. `email` is covered by the `(projectId, email)` unique index,
       * `createdAt` by `(projectId, createdAt DESC, id DESC)`.
       */
      sort?: 'email' | 'createdAt';
      /**
       * Sort direction, default `desc`. Only `desc` is index-covered: the `id` tiebreaker
       * below is hardcoded descending, so `asc` asks for a mixed-direction sort that no
       * single index satisfies and the match set has to be sorted. Making the tiebreaker
       * follow `dir` would let one index serve both.
       */
      dir?: 'asc' | 'desc';
    },
  ): Promise<CursorPaginatedResponse<Contact>> {
    const where: Prisma.ContactWhereInput = {
      projectId,
      ...(search ? {email: {contains: this.normalizeEmailSearch(search)}} : {}),
      ...this.buildStatusWhere(options?.status, options?.subscribed),
    };

    // The chosen sort column leads; `id` is always the stable tiebreaker the
    // cursor (`{id}`) keys off, so keyset pagination stays correct under any
    // sort (createdAt is non-unique, hence the tiebreaker; email is unique per
    // project but kept consistent for the same cursor mechanics). Defaults to
    // newest-first, matching the previous behaviour.
    const dir: 'asc' | 'desc' = options?.dir === 'asc' ? 'asc' : 'desc';
    const orderBy: Prisma.ContactOrderByWithRelationInput[] =
      options?.sort === 'email' ? [{email: dir}, {id: 'desc'}] : [{createdAt: dir}, {id: 'desc'}];

    // Fetch one extra to determine if there are more results.
    const contacts = await prisma.contact.findMany({
      where,
      take: limit + 1,
      skip: cursor ? 1 : 0,
      cursor: cursor ? {id: cursor} : undefined,
      orderBy,
    });

    const hasMore = contacts.length > limit;
    const results = hasMore ? contacts.slice(0, -1) : contacts;
    const nextCursor = hasMore ? results[results.length - 1]?.id : undefined;

    // Get total count only on first page for better performance
    const total = !cursor ? await prisma.contact.count({where}) : 0;

    return {
      data: results,
      total,
      cursor: nextCursor,
      hasMore,
    };
  }

  /**
   * Get a single contact by ID
   */
  public static async get(projectId: string, contactId: string): Promise<Contact> {
    const contact = await prisma.contact.findFirst({
      where: {
        id: contactId,
        projectId,
      },
    });

    if (!contact) {
      throw new HttpException(404, 'Contact not found');
    }

    return contact;
  }

  /**
   * Bulk-check which emails exist in the project — single query, safe for up to 500 addresses.
   */
  public static async lookup(
    projectId: string,
    emails: string[],
  ): Promise<{found: string[]; notFound: string[]}> {
    // Emails are stored normalized, so an exact `in` match uses the
    // `(projectId, email)` btree index instead of a full scan via ILIKE.
    const normalized = emails.map(e => this.normalizeEmail(e));
    const rows = await prisma.contact.findMany({
      where: {projectId, email: {in: normalized}},
      select: {email: true},
    });
    const foundSet = new Set(rows.map(r => r.email));
    // Return the caller's original strings, partitioned by normalized match.
    const found = emails.filter(e => foundSet.has(this.normalizeEmail(e)));
    const notFound = emails.filter(e => !foundSet.has(this.normalizeEmail(e)));
    return {found, notFound};
  }

  /**
   * Find a contact by email (returns null if not found)
   */
  public static async findByEmail(projectId: string, email: string): Promise<Contact | null> {
    return prisma.contact.findFirst({
      where: {
        projectId,
        email: this.normalizeEmail(email),
      },
    });
  }

  /**
   * Create a new contact
   * Uses unique constraint violation to check for duplicates (more efficient)
   */
  public static async create(
    projectId: string,
    data: {email: string; data?: Prisma.JsonValue; subscribed?: boolean},
  ): Promise<Contact> {
    try {
      return await prisma.contact.create({
        data: {
          projectId,
          email: this.normalizeEmail(data.email),
          data: data.data ?? Prisma.JsonNull,
          subscribed: data.subscribed ?? true,
        },
      });
    } catch (error) {
      // Check if this is a unique constraint violation (P2002)
      if (error instanceof Error && 'code' in error && error.code === 'P2002') {
        throw new HttpException(409, 'Contact with this email already exists in this project');
      }
      throw error;
    }
  }

  /**
   * Update a contact
   * Uses unique constraint violation to check for duplicates (more efficient)
   */
  /**
   * Merge an incoming partial data object into existing contact data.
   * - `null` value on a key deletes that key
   * - empty strings are ignored
   * - reserved/system-generated keys are silently filtered
   * - `{value, persistent: false}` entries are skipped (non-persistent)
   */
  private static mergeContactData(
    existing: Prisma.JsonValue | null,
    incoming: Record<string, unknown>,
  ): Record<string, unknown> {
    const merged: Record<string, unknown> =
      existing && typeof existing === 'object' && !Array.isArray(existing) ? {...(existing as Record<string, unknown>)} : {};

    const reservedFields = ['plunk_id', 'plunk_email', 'id', 'email', 'unsubscribeUrl', 'subscribeUrl', 'manageUrl'];

    for (const [key, value] of Object.entries(incoming)) {
      if (reservedFields.includes(key)) continue;
      if (value === '') continue;
      if (value === null) {
        delete merged[key];
        continue;
      }
      if (key === 'locale' && typeof value !== 'string') {
        throw new HttpException(400, 'Locale must be a string');
      }
      if (
        typeof value === 'object' &&
        value !== null &&
        'value' in value &&
        'persistent' in value &&
        (value as {persistent: unknown}).persistent === false
      ) {
        continue;
      }
      merged[key] = value;
    }

    return merged;
  }

  public static async update(
    projectId: string,
    contactId: string,
    data: {email?: string; data?: Prisma.JsonValue; subscribed?: boolean},
  ): Promise<Contact> {
    // First verify contact exists and belongs to project
    const existing = await this.get(projectId, contactId);

    const updateData: Prisma.ContactUpdateInput = {};

    if (data.email !== undefined) {
      updateData.email = ContactService.normalizeEmail(data.email);
    }
    if (data.data !== undefined) {
      if (data.data === null) {
        updateData.data = Prisma.JsonNull;
      } else if (typeof data.data === 'object' && !Array.isArray(data.data)) {
        const merged = ContactService.mergeContactData(existing.data, data.data as Record<string, unknown>);
        updateData.data = Object.keys(merged).length > 0 ? toPrismaJson(merged) : Prisma.JsonNull;
      } else {
        throw new HttpException(400, 'data must be an object');
      }
    }
    if (data.subscribed !== undefined) {
      updateData.subscribed = data.subscribed;
      // An explicit subscription decision outranks a snooze in both directions: resubscribing
      // ends it early, and unsubscribing makes it permanent. See SNOOZE_CLEARED_ON_WRITE.
      updateData.snoozedUntil = null;
    }

    // Track subscription status change
    const isSubscriptionChanging = data.subscribed !== undefined && existing.subscribed !== data.subscribed;
    const wasSubscribed = existing.subscribed;

    try {
      const updated = await prisma.contact.update({
        where: {id: contactId},
        data: updateData,
      });

      // Track subscription event if status changed
      if (isSubscriptionChanging) {
        if (data.subscribed && !wasSubscribed) {
          await EventService.trackEvent(projectId, 'contact.subscribed', contactId);
        } else if (!data.subscribed && wasSubscribed) {
          await EventService.trackEvent(projectId, 'contact.unsubscribed', contactId);
        }
      }

      return updated;
    } catch (error) {
      // Check if this is a unique constraint violation (P2002)
      if (error instanceof Error && 'code' in error && error.code === 'P2002') {
        throw new HttpException(409, 'Contact with this email already exists in this project');
      }
      throw error;
    }
  }

  /**
   * Delete a contact
   */
  public static async delete(projectId: string, contactId: string): Promise<void> {
    // First verify contact exists and belongs to project
    await this.get(projectId, contactId);

    await prisma.contact.delete({
      where: {id: contactId},
    });
  }

  /**
   * Get contact count for a project
   */
  public static async count(projectId: string): Promise<number> {
    return prisma.contact.count({
      where: {projectId},
    });
  }

  /**
   * Upsert a contact (create or update) with metadata merging
   * Supports persistent and non-persistent data fields
   * Reserved fields: plunk_id, plunk_email
   */
  public static async upsert(
    projectId: string,
    email: string,
    data?: Record<string, unknown>,
    subscribed?: boolean,
    defaultSubscribed: boolean = true,
  ): Promise<Contact> {
    const normalizedEmail = ContactService.normalizeEmail(email);

    // Find existing contact
    const existing = await prisma.contact.findFirst({
      where: {
        projectId,
        email: normalizedEmail,
      },
    });

    const mergedData = ContactService.mergeContactData(existing?.data ?? null, data ?? {});

    if (existing) {
      // Track subscription status change
      const isSubscriptionChanging = subscribed !== undefined && existing.subscribed !== subscribed;
      const wasSubscribed = existing.subscribed;

      try {
        const updated = await prisma.contact.update({
          where: {id: existing.id},
          data: {
            data: Object.keys(mergedData).length > 0 ? toPrismaJson(mergedData) : Prisma.JsonNull,
            // An explicit subscription decision ends any snooze, either way.
            // See SNOOZE_CLEARED_ON_WRITE.
            ...(subscribed !== undefined ? {subscribed, snoozedUntil: null} : {}),
          },
        });

        // Track subscription event if status changed
        if (isSubscriptionChanging) {
          if (subscribed && !wasSubscribed) {
            await EventService.trackEvent(projectId, 'contact.subscribed', updated.id);
          } else if (!subscribed && wasSubscribed) {
            await EventService.trackEvent(projectId, 'contact.unsubscribed', updated.id);
          }
        }

        return updated;
      } catch (error) {
        // Provide helpful error message for database/validation issues
        throw new HttpException(
          500,
          `Failed to update contact: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    } else {
      try {
        return await prisma.contact.create({
          data: {
            projectId,
            email: normalizedEmail,
            data: Object.keys(mergedData).length > 0 ? toPrismaJson(mergedData) : Prisma.JsonNull,
            subscribed: subscribed ?? defaultSubscribed,
          },
        });
      } catch (error) {
        // Provide helpful error message for database/validation issues
        throw new HttpException(
          500,
          `Failed to create contact: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    }
  }

  /**
   * Get the full merged data for a contact including non-persistent fields
   * This is useful for template rendering
   */
  public static getMergedData(contact: Contact, temporaryData?: Record<string, unknown>): Record<string, unknown> {
    const mergedData: Record<string, unknown> = {
      plunk_id: contact.id,
      plunk_email: contact.email,
    };

    // Add contact's persistent data
    if (contact.data && typeof contact.data === 'object' && !Array.isArray(contact.data)) {
      Object.assign(mergedData, contact.data);
    }

    // Explicitly expose locale as a predefined field (available in templates)
    // This ensures locale is always accessible even if not in contact.data
    if (mergedData.locale === undefined) {
      mergedData.locale = null;
    }

    // Add temporary (non-persistent) data
    if (temporaryData) {
      for (const [key, value] of Object.entries(temporaryData)) {
        // Skip reserved system-generated fields
        const reservedFields = ['plunk_id', 'plunk_email', 'email', 'unsubscribeUrl', 'subscribeUrl', 'manageUrl'];
        if (reservedFields.includes(key)) {
          continue;
        }

        // Handle non-persistent data format: { value: "...", persistent: false }
        if (
          typeof value === 'object' &&
          value !== null &&
          'value' in value &&
          'persistent' in value &&
          value.persistent === false
        ) {
          mergedData[key] = value.value;
        } else {
          mergedData[key] = value;
        }
      }
    }

    return mergedData;
  }

  /**
   * PUBLIC: Get a contact by ID (no project authentication required)
   * This is used for public-facing pages like unsubscribe
   */
  public static async getById(contactId: string): Promise<Contact> {
    const contact = await prisma.contact.findUnique({
      where: {id: contactId},
    });

    if (!contact) {
      throw new HttpException(404, 'Contact not found');
    }

    return contact;
  }

  /**
   * Get project by contact ID
   * Used to fetch project settings for public endpoints
   */
  public static async getProjectByContactId(contactId: string): Promise<{name: string; language: string} | null> {
    const contact = await prisma.contact.findUnique({
      where: {id: contactId},
      select: {
        project: {
          select: {
            name: true,
            language: true,
          },
        },
      },
    });

    return contact?.project || null;
  }

  /**
   * Resolve the email a recipient acted from, as claimed by the `e` parameter on
   * an unsubscribe or manage link.
   *
   * The claim is attacker-controlled — the links are public and unauthenticated —
   * so it is only trusted after confirming the email belongs to this contact.
   * A claim that does not check out is dropped rather than rejected: the
   * subscription change itself is governed by the contact id in the path and
   * must still go through, so a bad `e` costs attribution, not the opt-out.
   */
  private static async resolveSourceEmail(
    contactId: string,
    emailId?: string,
  ): Promise<{id: string; campaignId: string | null; suppressed: boolean} | undefined> {
    if (!emailId) {
      return undefined;
    }

    const email = await prisma.email.findUnique({
      where: {id: emailId},
      select: {id: true, contactId: true, campaignId: true, bouncedAt: true, complainedAt: true},
    });

    if (email?.contactId !== contactId) {
      return undefined;
    }

    return {
      id: email.id,
      campaignId: email.campaignId,
      suppressed: email.bouncedAt !== null || email.complainedAt !== null,
    };
  }

  /**
   * Add one to a campaign's unsubscribe count.
   *
   * Never allowed to fail the opt-out that triggered it: a stats counter is not
   * worth a 5xx on a public unsubscribe endpoint, which would leave a mailbox
   * provider retrying a request that already took effect. Campaign stats
   * recompute from the events on read, so a dropped increment self-heals.
   */
  private static async countCampaignUnsubscribe(campaignId: string): Promise<void> {
    try {
      await prisma.campaign.update({
        where: {id: campaignId},
        data: {unsubscribedCount: {increment: 1}},
      });
    } catch (error) {
      signale.warn(`[CONTACT] Failed to increment unsubscribe count for campaign ${campaignId}:`, error);
    }
  }

  /**
   * PUBLIC: Subscribe a contact
   *
   * @param source - Optional originating email, for attributing the change in
   *                 the activity feed. See {@link resolveSourceEmail}.
   */
  public static async subscribe(contactId: string, source?: {emailId?: string}): Promise<Contact> {
    const sourceEmail = await this.resolveSourceEmail(contactId, source?.emailId);

    const contact = await prisma.contact.update({
      where: {id: contactId},
      // Resubscribing ends a snooze early. See SNOOZE_CLEARED_ON_WRITE.
      data: {subscribed: true, snoozedUntil: null},
    });

    // Track subscription event
    await EventService.trackEvent(contact.projectId, 'contact.subscribed', contactId, sourceEmail?.id);

    return contact;
  }

  /**
   * PUBLIC: Unsubscribe a contact
   *
   * @param source - Optional originating email, for attributing the change in
   *                 the activity feed and counting it against the campaign that
   *                 prompted it. See {@link resolveSourceEmail}.
   */
  public static async unsubscribe(contactId: string, source?: {emailId?: string}): Promise<Contact> {
    const sourceEmail = await this.resolveSourceEmail(contactId, source?.emailId);

    const contact = await prisma.contact.update({
      where: {id: contactId},
      // Unsubscribing on top of a snooze makes it permanent -- the recipient asked to stop,
      // not to pause, and the sweep must never undo that. See SNOOZE_CLEARED_ON_WRITE.
      data: {subscribed: false, snoozedUntil: null},
    });

    // Track unsubscription event
    await EventService.trackEvent(contact.projectId, 'contact.unsubscribed', contactId, sourceEmail?.id);

    // Count it against the campaign the recipient opted out from. Suppressed
    // emails are skipped: a bounce or complaint unsubscribes the contact too,
    // and `bouncedCount` already reports those.
    if (sourceEmail?.campaignId && !sourceEmail.suppressed) {
      await this.countCampaignUnsubscribe(sourceEmail.campaignId);
    }

    return contact;
  }

  /**
   * Move a date forward by a snooze window, in calendar units.
   *
   * Calendar arithmetic rather than a fixed number of milliseconds so "1 month" lands on the
   * same day of the next month regardless of its length, and so a snooze spanning a DST
   * change still ends at the same wall-clock time. `setMonth` clamps overflow itself
   * (31 January + 1 month = 28/29 February), which is the behaviour a recipient expects.
   */
  private static addSnoozeWindow(from: Date, duration: SnoozeDuration): Date {
    const until = new Date(from.getTime());

    switch (duration) {
      case '2_weeks':
        until.setDate(until.getDate() + 14);
        break;
      case '1_month':
        until.setMonth(until.getMonth() + 1);
        break;
      case '6_months':
        until.setMonth(until.getMonth() + 6);
        break;
      case '1_year':
        until.setFullYear(until.getFullYear() + 1);
        break;
    }

    return until;
  }

  /**
   * PUBLIC: Snooze a contact -- unsubscribe them until a date, then resubscribe automatically.
   *
   * ## SNOOZE_CLEARED_ON_WRITE
   *
   * A snooze is `subscribed = false` plus a `snoozedUntil` date. It is deliberately not a
   * third subscription state: every send path already filters `subscribed = true`, so a
   * snoozed contact is suppressed correctly without any of them knowing this feature exists.
   *
   * The price of that is one invariant, and it is the only thing about snoozing that can
   * actually hurt someone:
   *
   * > Every write to `subscribed` must also write `snoozedUntil: null`.
   *
   * Otherwise a contact who is snoozed when something else suppresses them -- a hard bounce,
   * a spam complaint, an operator's bulk unsubscribe -- would be resubscribed by the sweep
   * when the old date passed, and mailed again. The bounce and complaint cases are the severe
   * ones: resurrecting a suppressed address is exactly the reputation damage suppression
   * exists to prevent.
   *
   * The call sites that uphold this, all marked with a reference to this comment:
   * `update`, `upsert`, `subscribe`, `unsubscribe`, `bulkSubscribe`, `bulkUnsubscribe`,
   * the three SES suppression branches in `Webhooks`, and the workflow `UPDATE_CONTACT` step.
   * `create` needs nothing -- a new contact's `snoozedUntil` is already null.
   *
   * Re-snoozing is allowed and simply moves the date; it does not re-count against the
   * campaign, matching the repeat-click guard on the one-click unsubscribe endpoint.
   *
   * @param source - Optional originating email, for attributing the change in the activity
   *                 feed and counting it against the campaign that prompted it.
   *                 See {@link resolveSourceEmail}.
   */
  public static async snooze(
    contactId: string,
    duration: SnoozeDuration,
    source?: {emailId?: string},
  ): Promise<Contact> {
    const sourceEmail = await this.resolveSourceEmail(contactId, source?.emailId);

    // Read before write: whether this contact was still subscribed decides if the snooze
    // counts against the campaign, and the row has to be confirmed to exist anyway.
    const existing = await prisma.contact.findUnique({
      where: {id: contactId},
      select: {subscribed: true},
    });

    if (!existing) {
      throw new HttpException(404, 'Contact not found');
    }

    const snoozedUntil = this.addSnoozeWindow(new Date(), duration);

    const contact = await prisma.contact.update({
      where: {id: contactId},
      data: {subscribed: false, snoozedUntil},
    });

    // Reuses `contact.unsubscribed` rather than a new event name, so existing workflows,
    // WAIT_FOR_EVENT steps and the activity feed pick a snooze up with no changes. The
    // `reason` field is what lets a sender tell the two apart.
    await EventService.trackEvent(contact.projectId, 'contact.unsubscribed', contactId, sourceEmail?.id, {
      reason: 'snooze',
      duration,
      snoozedUntil: snoozedUntil.toISOString(),
    });

    // A snooze is a deliberate opt-out this campaign caused, so it counts -- otherwise a
    // campaign that drives people away would look clean whenever they chose to pause instead
    // of leave. Only on the first opt-out: re-snoozing an already-unsubscribed contact must
    // not count twice. Suppressed emails are skipped, as in `unsubscribe`.
    if (existing.subscribed && sourceEmail?.campaignId && !sourceEmail.suppressed) {
      await this.countCampaignUnsubscribe(sourceEmail.campaignId);
    }

    return contact;
  }

  /**
   * Resubscribe every contact whose snooze has run out. Driven by the snooze sweep job.
   *
   * Batched and capped rather than a single `updateMany`, because waking a contact is not a
   * cheap write: each one emits `contact.subscribed`, and every one of those runs the workflow
   * trigger match and the WAIT_FOR_EVENT resume. A campaign that snoozed thousands of people
   * on the same day would otherwise wake them in one burst and flood the workflow engine.
   * Capping the run spreads that over consecutive sweeps; the remainder simply waits for the
   * next one, which costs minutes on a window measured in weeks to years.
   *
   * Ordered by `snoozedUntil` so the longest-overdue contacts are always woken first and no
   * one can be starved by a continuous stream of newly-due snoozes.
   *
   * The update runs before the events. If the process dies between the two, the contact is
   * awake but no event fired -- the same trade the bulk subscription paths already make, and
   * the safe direction: a missing event is a reporting gap, while an unwoken contact would be
   * silently suppressed forever.
   *
   * @returns How many contacts were resubscribed.
   */
  public static async resumeExpiredSnoozes(options?: {batchSize?: number; maxPerRun?: number}): Promise<number> {
    const batchSize = options?.batchSize ?? 500;
    const maxPerRun = options?.maxPerRun ?? 5000;

    let resumed = 0;

    while (resumed < maxPerRun) {
      const due = await prisma.contact.findMany({
        where: {snoozedUntil: {lte: new Date()}},
        select: {id: true, projectId: true},
        orderBy: {snoozedUntil: 'asc'},
        take: Math.min(batchSize, maxPerRun - resumed),
      });

      if (due.length === 0) {
        break;
      }

      await prisma.contact.updateMany({
        where: {id: {in: due.map(c => c.id)}},
        data: {subscribed: true, snoozedUntil: null},
      });

      // Events are per-project because `trackEvent` resolves workflows per project. Awaited,
      // unlike the bulk paths: the sweep has no caller waiting on it, and letting a batch's
      // events finish before the next batch is read keeps the load flat.
      const byProject = new Map<string, string[]>();
      for (const contact of due) {
        const ids = byProject.get(contact.projectId);
        if (ids) {
          ids.push(contact.id);
        } else {
          byProject.set(contact.projectId, [contact.id]);
        }
      }

      for (const [projectId, contactIds] of byProject) {
        await this.trackEventsSequentially(projectId, 'contact.subscribed', contactIds, {
          reason: 'snooze_expired',
        });
      }

      resumed += due.length;

      // A short batch means the queue is drained; anything else is a full page and there may
      // be more.
      if (due.length < batchSize) {
        break;
      }
    }

    return resumed;
  }

  /**
   * Get all available contact fields for a project
   * Returns both standard fields and custom fields from the data JSON column
   * Now includes type information inferred from actual data
   *
   * @param projectId - The project ID to filter contacts
   * @returns Array of field objects with name and type
   */
  public static async getAvailableFields(
    projectId: string,
  ): Promise<Array<{field: string; type: 'string' | 'number' | 'boolean' | 'date'; coverage: number}>> {
    // Get total contact count for coverage calculation
    const totalContacts = await prisma.contact.count({
      where: {projectId},
    });

    // Standard fields with known types (always 100% coverage)
    const standardFields = [
      {field: 'email', type: 'string' as const, coverage: 100},
      {field: 'subscribed', type: 'boolean' as const, coverage: 100},
      {field: 'createdAt', type: 'date' as const, coverage: 100},
      {field: 'updatedAt', type: 'date' as const, coverage: 100},
    ];

    // Get custom fields from the data JSON column with type inference and coverage
    // Use raw SQL to extract all keys, sample values, and contact counts from the JSON data column
    const result = await prisma.$queryRaw<
      Array<{key: string; sample_value: string; json_type: string; contact_count: bigint}>
    >`
      WITH field_keys AS (
        SELECT DISTINCT jsonb_object_keys(data) as key
        FROM contacts
        WHERE
          "projectId" = ${projectId}
          AND data IS NOT NULL
          AND jsonb_typeof(data) = 'object'
      ),
      field_samples AS (
        SELECT
          fk.key,
          jsonb_typeof(c.data->fk.key) as json_type,
          (c.data->>fk.key) as sample_value
        FROM field_keys fk
        CROSS JOIN LATERAL (
          SELECT data
          FROM contacts
          WHERE
            "projectId" = ${projectId}
            AND data ? fk.key
            AND data->fk.key IS NOT NULL
          LIMIT 1
        ) c
      ),
      field_counts AS (
        SELECT
          fk.key,
          COUNT(*) as contact_count
        FROM field_keys fk
        JOIN contacts c ON c."projectId" = ${projectId}
          AND c.data ? fk.key
          AND c.data->fk.key IS NOT NULL
        GROUP BY fk.key
      )
      SELECT
        fs.key,
        fs.sample_value,
        fs.json_type,
        fc.contact_count
      FROM field_samples fs
      JOIN field_counts fc ON fc.key = fs.key
    `;

    // Infer types from JSON types and sample values, calculate coverage
    const customFields = result.map(row => {
      let type: 'string' | 'number' | 'boolean' | 'date' = 'string';

      // PostgreSQL jsonb_typeof returns: "object", "array", "string", "number", "boolean", "null"
      if (row.json_type === 'boolean') {
        type = 'boolean';
      } else if (row.json_type === 'number') {
        type = 'number';
      } else if (row.json_type === 'string' && row.sample_value) {
        // Try to detect dates (ISO 8601 format)
        const dateRegex = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?)?$/;
        if (dateRegex.test(row.sample_value)) {
          type = 'date';
        }
      }

      // Calculate coverage percentage
      const contactCount = Number(row.contact_count);
      const coverage = totalContacts > 0 ? Math.round((contactCount / totalContacts) * 100) : 0;

      return {
        field: `data.${row.key}`,
        type,
        coverage,
      };
    });

    return [...standardFields, ...customFields].sort((a, b) => a.field.localeCompare(b.field));
  }

  /**
   * Get unique values for a contact field
   * Optimized for large datasets (1M+ contacts) - limits results and uses efficient queries
   *
   * @param projectId - The project ID to filter contacts
   * @param field - The field path (e.g., "subscribed", "email", "data.plan", "data.firstName")
   * @param limit - Maximum number of unique values to return (default: 100)
   * @returns Array of unique values, sorted alphabetically
   */
  public static async getUniqueFieldValues(
    projectId: string,
    field: string,
    limit = 100,
  ): Promise<Array<string | number | boolean>> {
    if (field === 'subscribed') {
      // Boolean field - return both possible values
      return [true, false];
    }

    if (field === 'email') {
      // Email is not useful for dropdowns, return empty
      return [];
    }

    // Handle JSON data fields (e.g., "data.plan" or just "plan")
    const jsonField = field.startsWith('data.') ? field.substring(5) : field;

    // Use raw SQL for performance with large datasets
    // Extract unique values from the JSON field using PostgreSQL's JSON operators
    const result = await prisma.$queryRaw<Array<{value: unknown}>>`
      SELECT DISTINCT
        data->>${jsonField} as value
      FROM contacts
      WHERE
        "projectId" = ${projectId}
        AND data ? ${jsonField}
        AND data->>${jsonField} IS NOT NULL
        AND data->>${jsonField} != ''
      ORDER BY value
      LIMIT ${limit}
    `;

    // Parse and return values, handling different data types
    return result
      .map(row => {
        const value = String(row.value);

        // Try to parse as boolean
        if (value === 'true') return true;
        if (value === 'false') return false;

        // Try to parse as number
        const numValue = Number(value);
        if (!isNaN(numValue) && value.trim() !== '') {
          return numValue;
        }

        // Return as string
        return value;
      })
      .filter(v => v !== null && v !== undefined);
  }

  /**
   * Check if a contact field is used in any segments or campaigns
   * Returns usage information including which segments/campaigns use the field
   *
   * @param projectId - The project ID
   * @param field - The field to check (e.g., "data.plan", "email", "subscribed")
   * @returns Usage information
   */
  public static async getFieldUsage(
    projectId: string,
    field: string,
  ): Promise<{
    usedInSegments: Array<{id: string; name: string}>;
    usedInCampaigns: Array<{id: string; name: string}>;
    contactCount: number;
    canDelete: boolean;
  }> {
    // Get all segments for the project
    const segments = await prisma.segment.findMany({
      where: {projectId},
      select: {id: true, name: true, condition: true},
    });

    // Check which segments use this field
    const usedInSegments = segments.filter(segment => {
      const condition = segment.condition as FilterCondition | null;
      return this.fieldUsedInCondition(field, condition);
    });

    // For now, we'll check if campaigns use the field in their subject or body
    // This is a simplified check - you might want to enhance this based on your campaign structure
    const usedInCampaigns: Array<{id: string; name: string}> = [];

    // Count contacts that have this field (for data fields)
    let contactCount = 0;
    if (field.startsWith('data.')) {
      const jsonField = field.substring(5);
      const result = await prisma.$queryRaw<Array<{count: bigint}>>`
        SELECT COUNT(*) as count
        FROM contacts
        WHERE
          "projectId" = ${projectId}
          AND data ? ${jsonField}
          AND data->${jsonField} IS NOT NULL
      `;
      contactCount = Number(result[0]?.count || 0);
    } else if (field === 'email' || field === 'subscribed' || field === 'createdAt' || field === 'updatedAt') {
      // Standard fields exist on all contacts
      const result = await prisma.contact.count({where: {projectId}});
      contactCount = result;
    }

    const canDelete = usedInSegments.length === 0 && usedInCampaigns.length === 0;

    return {
      usedInSegments: usedInSegments.map(s => ({id: s.id, name: s.name})),
      usedInCampaigns,
      contactCount,
      canDelete,
    };
  }

  /**
   * Delete a custom field from all contacts
   * WARNING: This is destructive and cannot be undone
   * Should only be called after verifying the field is not in use
   *
   * @param projectId - The project ID
   * @param field - The field to delete (must be a data.* field)
   */
  public static async deleteField(projectId: string, field: string): Promise<{deletedFrom: number}> {
    // Only allow deleting custom data fields
    if (!field.startsWith('data.')) {
      throw new HttpException(400, 'Can only delete custom data fields (data.*)');
    }

    // Check if field is in use
    const usage = await this.getFieldUsage(projectId, field);
    if (!usage.canDelete) {
      throw new HttpException(
        400,
        `Cannot delete field: used in ${usage.usedInSegments.length} segment(s) and ${usage.usedInCampaigns.length} campaign(s)`,
      );
    }

    const jsonField = field.substring(5);

    // Delete the field from all contacts using raw SQL
    // PostgreSQL's `-` operator removes a key from a JSON object
    const result = await prisma.$executeRaw`
      UPDATE contacts
      SET data = data - ${jsonField}
      WHERE
        "projectId" = ${projectId}
        AND data ? ${jsonField}
    `;

    return {deletedFrom: result};
  }

  /**
   * Bulk subscribe contacts
   * Updates multiple contacts to subscribed=true in batches.
   * `updated` = contacts flipped from unsubscribed to subscribed.
   * `unchanged` = contacts that were already subscribed (no-op, not a failure).
   */
  public static async bulkSubscribe(
    projectId: string,
    contactIds: string[],
  ): Promise<{updated: number; unchanged: number}> {
    const contacts = await prisma.contact.findMany({
      where: {id: {in: contactIds}, projectId},
      select: {id: true, subscribed: true},
    });

    if (contacts.length === 0) {
      return {updated: 0, unchanged: 0};
    }

    const unsubscribedIds = contacts.filter(c => !c.subscribed).map(c => c.id);
    const unchanged = contacts.length - unsubscribedIds.length;

    if (unsubscribedIds.length === 0) {
      return {updated: 0, unchanged};
    }

    const result = await prisma.contact.updateMany({
      where: {id: {in: unsubscribedIds}, projectId},
      // Resubscribing ends a snooze early. See SNOOZE_CLEARED_ON_WRITE.
      data: {subscribed: true, snoozedUntil: null},
    });

    this.trackEventsSequentially(projectId, 'contact.subscribed', unsubscribedIds).catch(error => {
      if (process.env.NODE_ENV !== 'test') {
        console.error('[ContactService] Failed to track bulk subscribe events:', error);
      }
    });

    return {updated: result.count, unchanged};
  }

  /**
   * Bulk unsubscribe contacts.
   * `updated` = contacts flipped from subscribed to unsubscribed.
   * `unchanged` = contacts that were already unsubscribed (no-op, not a failure).
   */
  public static async bulkUnsubscribe(
    projectId: string,
    contactIds: string[],
  ): Promise<{updated: number; unchanged: number}> {
    const contacts = await prisma.contact.findMany({
      where: {id: {in: contactIds}, projectId},
      select: {id: true, subscribed: true, snoozedUntil: true},
    });

    if (contacts.length === 0) {
      return {updated: 0, unchanged: 0};
    }

    const subscribedIds = contacts.filter(c => c.subscribed).map(c => c.id);
    const unchanged = contacts.length - subscribedIds.length;

    // A snoozed contact is already `subscribed = false`, so it does not flip and is reported
    // as unchanged -- but its snooze still has to be cleared, or the sweep would resubscribe
    // someone an operator just unsubscribed. Those ids are written alongside the flips.
    // See SNOOZE_CLEARED_ON_WRITE.
    const snoozedIds = contacts.filter(c => !c.subscribed && c.snoozedUntil !== null).map(c => c.id);
    const idsToWrite = [...subscribedIds, ...snoozedIds];

    if (idsToWrite.length === 0) {
      return {updated: 0, unchanged};
    }

    await prisma.contact.updateMany({
      where: {id: {in: idsToWrite}, projectId},
      data: {subscribed: false, snoozedUntil: null},
    });

    if (subscribedIds.length === 0) {
      return {updated: 0, unchanged};
    }

    this.trackEventsSequentially(projectId, 'contact.unsubscribed', subscribedIds).catch(error => {
      if (process.env.NODE_ENV !== 'test') {
        console.error('[ContactService] Failed to track bulk unsubscribe events:', error);
      }
    });

    return {updated: subscribedIds.length, unchanged};
  }

  /**
   * Bulk delete contacts
   */
  public static async bulkDelete(projectId: string, contactIds: string[]): Promise<{deleted: number}> {
    const result = await prisma.contact.deleteMany({
      where: {
        id: {in: contactIds},
        projectId,
      },
    });

    return {deleted: result.count};
  }

  /**
   * Helper: Check if a field is used in a filter condition (recursive)
   */
  private static fieldUsedInCondition(field: string, condition: FilterCondition | null): boolean {
    if (!condition || typeof condition !== 'object') {
      return false;
    }

    // Check groups in the condition
    if (Array.isArray(condition.groups)) {
      for (const group of condition.groups) {
        if (this.fieldUsedInGroup(field, group)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Helper: Check if a field is used in a filter group (recursive)
   */
  private static fieldUsedInGroup(field: string, group: FilterGroup): boolean {
    if (!group || typeof group !== 'object') {
      return false;
    }

    // Check filters in the group
    if (Array.isArray(group.filters)) {
      for (const filter of group.filters) {
        if (filter.field === field) {
          return true;
        }
      }
    }

    // Check nested conditions
    if (group.conditions) {
      return this.fieldUsedInCondition(field, group.conditions);
    }

    return false;
  }

  /**
   * Track events sequentially to avoid database deadlocks
   * Processes events one at a time with error handling
   *
   * @private
   */
  private static async trackEventsSequentially(
    projectId: string,
    eventName: string,
    contactIds: string[],
    data?: Record<string, unknown>,
  ): Promise<void> {
    for (const contactId of contactIds) {
      try {
        await EventService.trackEvent(projectId, eventName, contactId, undefined, data);
      } catch (error) {
        // Log error but continue processing remaining events
        // Suppress logging in test environments to reduce noise from cleanup race conditions
        if (process.env.NODE_ENV !== 'test') {
          console.error(`[ContactService] Failed to track event ${eventName} for contact ${contactId}:`, error);
        }
      }
    }
  }
}
