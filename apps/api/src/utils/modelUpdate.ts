import type {Prisma} from '@plunk/db';

/**
 * Shared utility for building Prisma update objects
 * Eliminates the repetitive field-by-field update pattern
 */

/**
 * Build a Prisma update input object from partial data
 * Only includes fields that are defined (not undefined)
 */
export function buildUpdateData<T extends Record<string, unknown>>(
  data: Partial<T>,
  excludeFields: string[] = [],
): Record<string, unknown> {
  const updateData: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined && !excludeFields.includes(key)) {
      updateData[key] = value;
    }
  }

  return updateData;
}

/**
 * Build email-related fields update data
 * Common pattern for Campaign and Template updates
 */
export function buildEmailFieldsUpdate(data: {
  name?: string;
  description?: string;
  subject?: string;
  body?: string;
  from?: string;
  fromName?: string | null;
  replyTo?: string | null;
  disableFooter?: boolean;
}): Prisma.CampaignUpdateInput | Prisma.TemplateUpdateInput {
  return buildUpdateData(data) as Prisma.CampaignUpdateInput | Prisma.TemplateUpdateInput;
}
