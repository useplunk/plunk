/**
 * Campaign service types
 */

import type {Campaign, CampaignAudienceType, TemplateType} from '@plunk/db';
import type {PaginatedResponse} from '../common/pagination.js';
import type {FilterCondition} from '../segments/index.js';

/**
 * Data for creating a new campaign
 */
export interface CreateCampaignData {
  name: string;
  description?: string;
  subject: string;
  body: string;
  from: string;
  fromName?: string | null;
  replyTo?: string | null;
  type?: TemplateType;
  audienceType: CampaignAudienceType;
  audienceCondition?: FilterCondition;
  segmentId?: string;
}

/**
 * Data for updating an existing campaign
 */
export interface UpdateCampaignData {
  name?: string;
  description?: string;
  subject?: string;
  body?: string;
  from?: string;
  fromName?: string | null;
  replyTo?: string | null;
  type?: TemplateType;
  audienceType?: CampaignAudienceType;
  audienceCondition?: FilterCondition;
  segmentId?: string;
}

/**
 * Response shape of GET /campaigns.
 *
 * The list is scoped to unarchived campaigns unless `?archived=true` is passed, so the
 * page needs a second number to decide whether to offer the Archived toggle at all (and
 * what count to put on it). It rides along here rather than widening the shared
 * `PaginatedResponse`, which every other list endpoint returns unchanged.
 */
export type CampaignListResponse = PaginatedResponse<Campaign> & {
  /** Archived campaigns in the project, independent of the current page, search or status filter. */
  archivedCount: number;
};

/**
 * The two ways a campaign can lose a recipient that are recoverable from the emails
 * table, and so answerable as a list rather than only as a count.
 *
 * Unsubscribes are deliberately absent. They are recorded as a counter increment plus an
 * Event, and `Email` carries no `unsubscribedAt`, so there is no indexed path from a
 * campaign to the contacts who opted out of it. Adding one is its own piece of work.
 */
export type CampaignRecipientType = 'bounced' | 'complained';

/**
 * One recipient in a campaign's bounce or complaint list.
 *
 * Deliberately narrow: this feeds a list whose job is to answer "who", so it carries the
 * address, when it happened, and the ids needed to open the contact. The email body and
 * headers are not part of that question and would make every page far heavier to ship.
 */
export interface CampaignRecipient {
  emailId: string;
  contactId: string;
  email: string;
  /** ISO 8601. The bounce or complaint timestamp, whichever list this is. */
  occurredAt: string;
}
