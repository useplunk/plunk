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
