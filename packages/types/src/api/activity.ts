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
  /** Outbound emails that went out, leaving out mail to the SES mailbox simulator */
  totalEmailsSent: number;
  /** Sent with open and click tracking: what the open and click rates are measured against */
  totalEmailsTracked: number;
  /** Opened among the tracked emails */
  totalEmailsOpened: number;
  /** Clicked among the tracked emails */
  totalEmailsClicked: number;
  totalWorkflowsStarted: number;
  openRate: number;
  clickRate: number;
}
