/**
 * Campaign service types
 */

import type {CampaignAudienceType} from '@plunk/db';
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
  audienceType: CampaignAudienceType;
  audienceCondition?: FilterCondition;
  segmentId?: string;
  disableFooter?: boolean;
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
  audienceType?: CampaignAudienceType;
  audienceCondition?: FilterCondition;
  segmentId?: string;
  disableFooter?: boolean;
}
