/**
 * Workflow-specific type definitions
 */

/**
 * Recipient type for workflow email steps
 */
export enum EmailRecipientType {
  /** Send to the contact that triggered the workflow */
  CONTACT = 'CONTACT',
  /** Send to a custom email address */
  CUSTOM = 'CUSTOM',
}

/**
 * Configuration for email recipient in SEND_EMAIL workflow step
 */
export interface EmailRecipientConfig {
  /** Type of recipient */
  type: EmailRecipientType;
  /** Custom email address (required when type is CUSTOM) */
  customEmail?: string;
}

/**
 * Configuration for SEND_EMAIL workflow step
 */
export interface SendEmailStepConfig {
  /** @deprecated The WorkflowStep.template relation is authoritative. */
  templateId?: string;
  /** Recipient configuration */
  recipient?: EmailRecipientConfig;
}
