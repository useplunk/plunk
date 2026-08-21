/**
 * Activity tracking types
 */

/**
 * Activity types that can be tracked
 */
export enum ActivityType {
  EVENT_TRIGGERED = 'event.triggered',
  EMAIL_SENT = 'email.sent',
  EMAIL_DELIVERED = 'email.delivered',
  EMAIL_RECEIVED = 'email.received',
  EMAIL_OPENED = 'email.opened',
  EMAIL_CLICKED = 'email.clicked',
  EMAIL_BOUNCED = 'email.bounced',
  EMAIL_COMPLAINT = 'email.complaint',
  CONTACT_SUBSCRIBED = 'contact.subscribed',
  CONTACT_UNSUBSCRIBED = 'contact.unsubscribed',
  CAMPAIGN_SENT = 'campaign.sent',
  CAMPAIGN_SCHEDULED = 'campaign.scheduled',
  WORKFLOW_STARTED = 'workflow.started',
  WORKFLOW_COMPLETED = 'workflow.completed',
  WORKFLOW_EMAIL_SCHEDULED = 'workflow.email.scheduled',
}

/**
 * Unified activity item
 */
export interface Activity {
  id: string;
  type: ActivityType;
  timestamp: Date;
  contactEmail?: string;
  contactId?: string;
  metadata: Record<string, unknown>;
}

/**
 * Activity statistics for dashboard
 */
export interface ActivityStats {
  totalEvents: number;
  totalEmailsSent: number;
  totalEmailsOpened: number;
  totalEmailsClicked: number;
  totalWorkflowsStarted: number;
  openRate: number;
  clickRate: number;
}
