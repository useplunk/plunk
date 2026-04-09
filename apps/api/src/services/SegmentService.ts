import {type Contact, Prisma, type Segment} from '@plunk/db';
import type {FilterCondition, FilterGroup, PaginatedResponse, SegmentFilter, SegmentType} from '@plunk/types';
import {fromPrismaJson, toPrismaJson} from '@plunk/types';
import signale from 'signale';

import {prisma} from '../database/prisma.js';
import {HttpException} from '../exceptions/index.js';

import {EventService} from './EventService.js';
import {NtfyService} from './NtfyService.js';

export type {FilterCondition, FilterGroup, SegmentFilter} from '@plunk/types';

/**
 * Convert segment name to a URL-safe slug for event names
 * Example: "VIP Customers" -> "vip-customers"
 */
function slugifySegmentName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

export class SegmentService {
  /**
   * Get all segments for a project
   * Uses cached member counts for performance - counts are updated via background job
   */
  public static async list(projectId: string): Promise<Segment[]> {
    return prisma.segment.findMany({
      where: {projectId},
      orderBy: {createdAt: 'desc'},
    });
  }

  /**
   * Get a single segment by ID
   * Uses cached member count for performance - counts are updated via background job
   */
  public static async get(projectId: string, segmentId: string): Promise<Segment> {
    const segment = await prisma.segment.findFirst({
      where: {
        id: segmentId,
        projectId,
      },
    });

    if (!segment) {
      throw new HttpException(404, 'Segment not found');
    }

    return segment;
  }

  /**
   * Get contacts that match a segment's condition
   */
  public static async getContacts(
    projectId: string,
    segmentId: string,
    page = 1,
    pageSize = 20,
  ): Promise<PaginatedResponse<Contact>> {
    const segment = await this.get(projectId, segmentId);
    const skip = (page - 1) * pageSize;

    if (segment.type === 'STATIC') {
      // For static segments, query via SegmentMembership records
      const [memberships, total] = await Promise.all([
        prisma.segmentMembership.findMany({
          where: {segmentId, exitedAt: null},
          include: {contact: true},
          skip,
          take: pageSize,
          orderBy: {enteredAt: 'desc'},
        }),
        prisma.segmentMembership.count({where: {segmentId, exitedAt: null}}),
      ]);

      return {
        data: memberships.map(m => m.contact),
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      };
    }

    const condition = fromPrismaJson<FilterCondition>(segment.condition);
    const where = this.buildWhereClause(projectId, condition);

    const [contacts, total] = await Promise.all([
      prisma.contact.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: {createdAt: 'desc'},
      }),
      prisma.contact.count({where}),
    ]);

    return {
      data: contacts,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * Create a new segment
   */
  public static async create(
    projectId: string,
    data: {
      name: string;
      description?: string;
      type?: SegmentType;
      condition?: FilterCondition;
      trackMembership?: boolean;
    },
  ): Promise<Segment> {
    const segmentType = data.type ?? 'DYNAMIC';
    let memberCount = 0;
    let conditionJson: Prisma.InputJsonValue | typeof Prisma.JsonNull = Prisma.JsonNull;

    if (segmentType === 'DYNAMIC') {
      if (!data.condition) {
        throw new HttpException(400, 'Condition is required for DYNAMIC segments');
      }
      // Validate condition
      this.validateCondition(data.condition);

      // Compute initial member count
      const where = this.buildWhereClause(projectId, data.condition);
      memberCount = await prisma.contact.count({where});
      conditionJson = toPrismaJson(data.condition);
    }

    const segment = await prisma.segment.create({
      data: {
        projectId,
        name: data.name,
        description: data.description,
        type: segmentType,
        condition: conditionJson,
        trackMembership: data.trackMembership ?? false,
        memberCount,
      },
      include: {
        project: {
          select: {name: true},
        },
      },
    });

    // Notify about segment creation
    await NtfyService.notifySegmentCreated(segment.name, segment.project.name, projectId);

    return segment;
  }

  /**
   * Update a segment
   */
  public static async update(
    projectId: string,
    segmentId: string,
    data: {
      name?: string;
      description?: string;
      condition?: FilterCondition;
      trackMembership?: boolean;
    },
  ): Promise<Segment> {
    // First verify segment exists and belongs to project
    const existing = await this.get(projectId, segmentId);

    const updateData: Prisma.SegmentUpdateInput = {};

    if (data.name !== undefined) {
      updateData.name = data.name;
    }
    if (data.description !== undefined) {
      updateData.description = data.description;
    }
    if (data.condition !== undefined && existing.type !== 'STATIC') {
      // Validate condition if provided (only for DYNAMIC segments)
      this.validateCondition(data.condition);
      updateData.condition = toPrismaJson(data.condition);

      // Recompute member count when condition changes
      const where = this.buildWhereClause(projectId, data.condition);
      updateData.memberCount = await prisma.contact.count({where});
    }
    if (data.trackMembership !== undefined) {
      updateData.trackMembership = data.trackMembership;
    }

    return prisma.segment.update({
      where: {id: segmentId},
      data: updateData,
    });
  }

  /**
   * Delete a segment
   */
  public static async delete(projectId: string, segmentId: string): Promise<void> {
    // First verify segment exists and belongs to project
    const segment = await prisma.segment.findFirst({
      where: {
        id: segmentId,
        projectId,
      },
      include: {
        project: {
          select: {name: true},
        },
      },
    });

    if (!segment) {
      throw new HttpException(404, 'Segment not found');
    }

    // Check if segment is used in any active campaigns
    const campaignsUsingSegment = await prisma.campaign.count({
      where: {
        segmentId,
        status: {
          in: ['DRAFT', 'SCHEDULED', 'SENDING'],
        },
      },
    });

    if (campaignsUsingSegment > 0) {
      throw new HttpException(
        409,
        `Cannot delete segment: it is currently used in ${campaignsUsingSegment} active campaign(s). Remove it from campaigns first or wait for them to complete.`,
      );
    }

    await prisma.segment.delete({
      where: {id: segmentId},
    });

    // Notify about segment deletion
    await NtfyService.notifySegmentDeleted(segment.name, segment.project.name, projectId);
  }

  /**
   * Refresh segment member count (for background jobs or manual refresh)
   * This is now the primary way to update segment counts
   */
  public static async refreshMemberCount(projectId: string, segmentId: string): Promise<number> {
    const segment = await this.get(projectId, segmentId);

    let memberCount: number;

    if (segment.type === 'STATIC') {
      memberCount = await prisma.segmentMembership.count({where: {segmentId, exitedAt: null}});
    } else {
      const condition = fromPrismaJson<FilterCondition>(segment.condition);
      const where = this.buildWhereClause(projectId, condition);
      memberCount = await prisma.contact.count({where});
    }

    await prisma.segment.update({
      where: {id: segmentId},
      data: {memberCount},
    });

    return memberCount;
  }

  /**
   * Refresh member counts for all segments in a project
   * Should be called by a background job periodically
   */
  public static async refreshAllMemberCounts(projectId: string): Promise<void> {
    const segments = await prisma.segment.findMany({
      where: {projectId},
      select: {id: true, type: true, condition: true},
    });

    // Process in batches to avoid overwhelming the database
    const BATCH_SIZE = 5;
    for (let i = 0; i < segments.length; i += BATCH_SIZE) {
      const batch = segments.slice(i, i + BATCH_SIZE);

      await Promise.all(
        batch.map(async segment => {
          try {
            let memberCount: number;

            if (segment.type === 'STATIC') {
              memberCount = await prisma.segmentMembership.count({
                where: {segmentId: segment.id, exitedAt: null},
              });
            } else {
              const condition = fromPrismaJson<FilterCondition>(segment.condition);
              const where = this.buildWhereClause(projectId, condition);
              memberCount = await prisma.contact.count({where});
            }

            await prisma.segment.update({
              where: {id: segment.id},
              data: {memberCount},
            });
          } catch (error) {
            signale.error(`Failed to update count for segment ${segment.id}:`, error);
          }
        }),
      );
    }
  }

  /**
   * Add contacts to a static segment by email
   */
  public static async addContacts(
    projectId: string,
    segmentId: string,
    emails: string[],
  ): Promise<{added: number; notFound: string[]}> {
    const segment = await this.get(projectId, segmentId);

    if (segment.type !== 'STATIC') {
      throw new HttpException(400, 'Can only add contacts to STATIC segments');
    }

    // Look up contacts by email (case-insensitive)
    const contacts = await prisma.contact.findMany({
      where: {
        projectId,
        email: {in: emails, mode: 'insensitive'},
      },
      select: {id: true, email: true},
    });

    const foundEmails = new Set(contacts.map(c => c.email.toLowerCase()));
    const notFound = emails.filter(e => !foundEmails.has(e.toLowerCase()));

    if (contacts.length > 0) {
      // Check for existing memberships (to reactivate vs create new)
      const existingMemberships = await prisma.segmentMembership.findMany({
        where: {segmentId, contactId: {in: contacts.map(c => c.id)}},
        select: {contactId: true},
      });
      const existingIds = new Set(existingMemberships.map(m => m.contactId));

      const newContactIds = contacts.filter(c => !existingIds.has(c.id)).map(c => c.id);
      const reEntryIds = contacts.filter(c => existingIds.has(c.id)).map(c => c.id);

      if (newContactIds.length > 0) {
        await prisma.segmentMembership.createMany({
          data: newContactIds.map(contactId => ({segmentId, contactId, enteredAt: new Date()})),
          skipDuplicates: true,
        });
      }

      if (reEntryIds.length > 0) {
        await prisma.segmentMembership.updateMany({
          where: {segmentId, contactId: {in: reEntryIds}},
          data: {exitedAt: null, enteredAt: new Date()},
        });
      }

      // Update member count
      const memberCount = await prisma.segmentMembership.count({where: {segmentId, exitedAt: null}});
      await prisma.segment.update({where: {id: segmentId}, data: {memberCount}});
    }

    return {added: contacts.length, notFound};
  }

  /**
   * Remove contacts from a static segment by email
   */
  public static async removeContacts(
    projectId: string,
    segmentId: string,
    emails: string[],
  ): Promise<{removed: number}> {
    const segment = await this.get(projectId, segmentId);

    if (segment.type !== 'STATIC') {
      throw new HttpException(400, 'Can only remove contacts from STATIC segments');
    }

    // Look up contacts by email
    const contacts = await prisma.contact.findMany({
      where: {
        projectId,
        email: {in: emails, mode: 'insensitive'},
      },
      select: {id: true},
    });

    if (contacts.length > 0) {
      const contactIds = contacts.map(c => c.id);

      await prisma.segmentMembership.updateMany({
        where: {segmentId, contactId: {in: contactIds}, exitedAt: null},
        data: {exitedAt: new Date()},
      });

      // Update member count
      const memberCount = await prisma.segmentMembership.count({where: {segmentId, exitedAt: null}});
      await prisma.segment.update({where: {id: segmentId}, data: {memberCount}});
    }

    return {removed: contacts.length};
  }

  /**
   * Compute or recompute segment membership for all contacts
   * Now uses cursor-based pagination for memory efficiency with large contact lists
   */
  public static async computeMembership(
    projectId: string,
    segmentId: string,
  ): Promise<{added: number; removed: number; total: number}> {
    const segment = await this.get(projectId, segmentId);

    if (!segment.trackMembership) {
      throw new HttpException(400, 'Segment does not have membership tracking enabled');
    }

    if (segment.type === 'STATIC') {
      // For static segments, just update the count from memberships — no contact scanning
      const total = await prisma.segmentMembership.count({where: {segmentId, exitedAt: null}});
      await prisma.segment.update({where: {id: segmentId}, data: {memberCount: total}});
      return {added: 0, removed: 0, total};
    }

    const condition = fromPrismaJson<FilterCondition>(segment.condition);
    const where = this.buildWhereClause(projectId, condition);

    // Get all matching contacts using cursor-based pagination to avoid memory issues
    const BATCH_SIZE = 1000;
    const matchingContactIds = new Set<string>();
    let cursor: string | undefined = undefined;
    let hasMore = true;

    while (hasMore) {
      const contacts: {id: string}[] = await prisma.contact.findMany({
        where,
        select: {id: true},
        take: BATCH_SIZE,
        skip: cursor ? 1 : 0,
        cursor: cursor ? {id: cursor} : undefined,
        orderBy: {id: 'asc'},
      });

      contacts.forEach((c: {id: string}) => matchingContactIds.add(c.id));

      if (contacts.length < BATCH_SIZE) {
        hasMore = false;
      } else {
        const lastContact = contacts[contacts.length - 1];
        cursor = lastContact?.id;
      }
    }

    // Get current active memberships using cursor pagination
    const currentMemberIds = new Set<string>();
    cursor = undefined;
    hasMore = true;

    while (hasMore) {
      const memberships: {contactId: string}[] = await prisma.segmentMembership.findMany({
        where: {
          segmentId,
          exitedAt: null,
        },
        select: {contactId: true},
        take: BATCH_SIZE,
        skip: cursor ? 1 : 0,
        cursor: cursor ? {contactId_segmentId: {contactId: cursor, segmentId}} : undefined,
        orderBy: {contactId: 'asc'},
      });

      memberships.forEach((m: {contactId: string}) => currentMemberIds.add(m.contactId));

      if (memberships.length < BATCH_SIZE) {
        hasMore = false;
      } else {
        const lastMembership = memberships[memberships.length - 1];
        cursor = lastMembership?.contactId;
      }
    }

    // Calculate changes
    const toAdd = Array.from(matchingContactIds).filter(id => !currentMemberIds.has(id));
    const toRemove = Array.from(currentMemberIds).filter(id => !matchingContactIds.has(id));

    // Process additions in batches
    const ADD_BATCH_SIZE = 500;
    for (let i = 0; i < toAdd.length; i += ADD_BATCH_SIZE) {
      const batch = toAdd.slice(i, i + ADD_BATCH_SIZE);

      // Check which contacts already have a membership record (inactive)
      const existingMemberships = await prisma.segmentMembership.findMany({
        where: {
          segmentId,
          contactId: {in: batch},
        },
        select: {contactId: true},
      });

      const existingContactIds = new Set(existingMemberships.map(m => m.contactId));
      const newEntries = batch.filter(id => !existingContactIds.has(id));
      const reEntries = batch.filter(id => existingContactIds.has(id));

      if (newEntries.length > 0) {
        await prisma.segmentMembership.createMany({
          data: newEntries.map(contactId => ({
            segmentId,
            contactId,
            enteredAt: new Date(),
          })),
          skipDuplicates: true,
        });
      }

      if (reEntries.length > 0) {
        await prisma.segmentMembership.updateMany({
          where: {
            segmentId,
            contactId: {in: reEntries},
          },
          data: {
            exitedAt: null,
            enteredAt: new Date(),
          },
        });
      }

      // Create segment-specific entry events for each contact in the batch
      for (const contactId of batch) {
        try {
          // Create a human-readable event name using slugified segment name
          const segmentSlug = slugifySegmentName(segment.name);
          const eventName = `segment.${segmentSlug}.entry`;
          await EventService.trackEvent(projectId, eventName, contactId, undefined, {
            segmentId: segment.id,
            segmentName: segment.name,
          });
        } catch (error) {
          signale.error(`[SEGMENT] Failed to track segment entry event for contact ${contactId}:`, error);
        }
      }
    }

    const REMOVE_BATCH_SIZE = 500;
    for (let i = 0; i < toRemove.length; i += REMOVE_BATCH_SIZE) {
      const batch = toRemove.slice(i, i + REMOVE_BATCH_SIZE);

      await prisma.segmentMembership.updateMany({
        where: {
          segmentId,
          contactId: {in: batch},
          exitedAt: null,
        },
        data: {
          exitedAt: new Date(),
        },
      });

      // Create segment-specific exit events for each contact in the batch
      for (const contactId of batch) {
        try {
          // Create a human-readable event name using slugified segment name
          const segmentSlug = slugifySegmentName(segment.name);
          const eventName = `segment.${segmentSlug}.exit`;
          await EventService.trackEvent(projectId, eventName, contactId, undefined, {
            segmentId: segment.id,
            segmentName: segment.name,
          });
        } catch (error) {
          signale.error(`[SEGMENT] Failed to track segment exit event for contact ${contactId}:`, error);
        }
      }
    }

    // Update member count on segment
    await prisma.segment.update({
      where: {id: segmentId},
      data: {memberCount: matchingContactIds.size},
    });

    signale.info(
      `[SEGMENT] Computed membership for segment ${segmentId}: added ${toAdd.length}, removed ${toRemove.length}, total ${matchingContactIds.size}`,
    );

    return {
      added: toAdd.length,
      removed: toRemove.length,
      total: matchingContactIds.size,
    };
  }

  /**
   * Build a single filter condition
   */
  public static buildFilterCondition(filter: SegmentFilter): Prisma.ContactWhereInput {
    const {field, operator, value, unit} = filter;

    // Handle event-based filters (e.g., "event.upgrade", "event.purchase")
    if (field.startsWith('event.')) {
      const eventName = field.substring(6); // Remove "event." prefix
      return this.buildEventCondition(eventName, operator, value, unit);
    }

    // Handle email activity filters (e.g., "email.opened", "email.clicked")
    if (field.startsWith('email.')) {
      const activity = field.substring(6); // Remove "email." prefix
      return this.buildEmailActivityCondition(activity, operator, value, unit);
    }

    // Handle JSON field paths (e.g., "data.plan")
    if (field.startsWith('data.')) {
      const jsonPath = field.substring(5); // Remove "data." prefix
      return this.buildJsonFieldCondition(jsonPath, operator, value, unit);
    }

    // Handle regular fields
    switch (field) {
      case 'email':
        return this.buildStringFieldCondition('email', operator, value);
      case 'subscribed':
        return this.buildBooleanFieldCondition('subscribed', operator, value);
      case 'createdAt':
      case 'updatedAt':
        return this.buildDateFieldCondition(field, operator, value, unit);
      default:
        throw new HttpException(400, `Unsupported filter field: ${field}`);
    }
  }

  /**
   * Validate segment condition (recursive)
   */
  public static validateCondition(condition: FilterCondition): void {
    if (!condition || typeof condition !== 'object') {
      throw new HttpException(400, 'Condition must be an object');
    }

    if (!condition.logic || !['AND', 'OR'].includes(condition.logic)) {
      throw new HttpException(400, 'Condition logic must be either "AND" or "OR"');
    }

    if (!Array.isArray(condition.groups) || condition.groups.length === 0) {
      throw new HttpException(400, 'Condition must have at least one group');
    }

    for (const group of condition.groups) {
      this.validateGroup(group);
    }
  }

  /**
   * Build Prisma clause from filter condition (recursive)
   */
  public static buildConditionClause(condition: FilterCondition): Prisma.ContactWhereInput {
    const groupClauses = condition.groups.map(group => this.buildGroupClause(group));

    if (condition.logic === 'AND') {
      return {AND: groupClauses};
    } else {
      return {OR: groupClauses};
    }
  }

  /**
   * Validate filter group (recursive)
   */
  private static validateGroup(group: FilterGroup): void {
    if (!group || typeof group !== 'object') {
      throw new HttpException(400, 'Group must be an object');
    }

    if (!Array.isArray(group.filters)) {
      throw new HttpException(400, 'Group filters must be an array');
    }

    // Groups can have filters, nested conditions, or both
    const hasFilters = group.filters.length > 0;
    const hasConditions = group.conditions !== undefined;

    if (!hasFilters && !hasConditions) {
      throw new HttpException(400, 'Group must have at least one filter or nested condition');
    }

    // Validate all filters in the group
    for (const filter of group.filters) {
      this.validateFilter(filter);
    }

    // Recursively validate nested conditions
    if (group.conditions) {
      this.validateCondition(group.conditions);
    }
  }

  /**
   * Validate individual filter
   */
  private static validateFilter(filter: SegmentFilter): void {
    if (!filter.field) {
      throw new HttpException(400, 'Filter field is required');
    }

    if (!filter.operator) {
      throw new HttpException(400, 'Filter operator is required');
    }

    const validOperators = [
      'equals',
      'notEquals',
      'contains',
      'notContains',
      'greaterThan',
      'lessThan',
      'greaterThanOrEqual',
      'lessThanOrEqual',
      'exists',
      'notExists',
      'within',
      'olderThan',
      'triggered',
      'triggeredWithin',
      'triggeredOlderThan',
      'notTriggered',
    ];

    if (!validOperators.includes(filter.operator)) {
      throw new HttpException(400, `Invalid operator: ${filter.operator}`);
    }

    // Validate that operators that need a value have one
    const operatorsNeedingValue = [
      'equals',
      'notEquals',
      'contains',
      'notContains',
      'greaterThan',
      'lessThan',
      'greaterThanOrEqual',
      'lessThanOrEqual',
      'within',
      'olderThan',
      'triggeredWithin',
      'triggeredOlderThan',
    ];

    if (operatorsNeedingValue.includes(filter.operator) && filter.value === undefined) {
      throw new HttpException(400, `Operator "${filter.operator}" requires a value`);
    }

    // Validate unit for time-based operators
    if (['within', 'triggeredWithin', 'olderThan', 'triggeredOlderThan'].includes(filter.operator) && !filter.unit) {
      throw new HttpException(400, `"${filter.operator}" operator requires a unit (days, hours, or minutes)`);
    }
  }

  /**
   * Build Prisma where clause from filter condition (entry point)
   */
  private static buildWhereClause(projectId: string, condition: FilterCondition): Prisma.ContactWhereInput {
    return {
      projectId,
      ...this.buildConditionClause(condition),
    };
  }

  /**
   * Build Prisma clause from filter group (recursive)
   */
  private static buildGroupClause(group: FilterGroup): Prisma.ContactWhereInput {
    const clauses: Prisma.ContactWhereInput[] = [];

    // Add filter conditions from this group
    if (group.filters.length > 0) {
      clauses.push(...group.filters.map(filter => this.buildFilterCondition(filter)));
    }

    // Add nested condition if present
    if (group.conditions) {
      clauses.push(this.buildConditionClause(group.conditions));
    }

    // All conditions within a group are combined with AND
    if (clauses.length === 0) {
      return {}; // Empty group returns empty where clause
    }

    if (clauses.length === 1) {
      return clauses[0]!; // Safe to use non-null assertion since we checked length
    }

    return {AND: clauses};
  }

  /**
   * Build condition for JSON fields (stored in contact.data)
   */
  private static buildJsonFieldCondition(
    jsonPath: string,
    operator: string,
    value: unknown,
    unit?: 'days' | 'hours' | 'minutes',
  ): Prisma.ContactWhereInput {
    // Use the entire jsonPath as a single path element.
    // Contact data is a flat JSON object, so field names like "prefix.key"
    // must be treated as literal keys, not nested paths.
    const path = [jsonPath];

    switch (operator) {
      case 'equals':
        // For date strings, compare only the date portion (ignore time)
        if (this.isDateString(value)) {
          const {startOfDay, startOfNextDay} = this.getDateRange(String(value));
          return {
            AND: [
              {data: {path, gte: startOfDay as Prisma.InputJsonValue}},
              {data: {path, lt: startOfNextDay as Prisma.InputJsonValue}},
            ],
          };
        }
        return {data: {path, equals: value as Prisma.InputJsonValue}};
      case 'notEquals':
        // For date strings, exclude the entire day (not just exact timestamp)
        if (this.isDateString(value)) {
          const {startOfDay, startOfNextDay} = this.getDateRange(String(value));
          return {
            OR: [
              {data: {path, lt: startOfDay as Prisma.InputJsonValue}},
              {data: {path, gte: startOfNextDay as Prisma.InputJsonValue}},
            ],
          };
        }
        return {NOT: {data: {path, equals: value as Prisma.InputJsonValue}}};
      case 'contains':
        return {data: {path, string_contains: String(value)}};
      case 'notContains':
        return {NOT: {data: {path, string_contains: String(value)}}};
      case 'greaterThan':
        return {data: {path, gt: value as Prisma.InputJsonValue}};
      case 'lessThan':
        return {data: {path, lt: value as Prisma.InputJsonValue}};
      case 'greaterThanOrEqual':
        return {data: {path, gte: value as Prisma.InputJsonValue}};
      case 'lessThanOrEqual':
        return {data: {path, lte: value as Prisma.InputJsonValue}};
      case 'exists':
        // Exists = key present with a non-null JSON value (neither DbNull nor JsonNull)
        return {
          NOT: {
            OR: [{data: {path, equals: Prisma.DbNull}}, {data: {path, equals: Prisma.JsonNull}}],
          },
        };
      case 'notExists':
        // Not exists = key is null / missing, represented as either DbNull or JsonNull
        return {
          OR: [{data: {path, equals: Prisma.DbNull}}, {data: {path, equals: Prisma.JsonNull}}],
        };
      case 'within': {
        // Note: Requires JSON date fields in ISO 8601 format for proper comparison
        if (!unit) {
          throw new HttpException(400, 'Unit is required for "within" operator');
        }

        // Calculate the "since" date (X time units ago from now)
        const now = new Date();
        const milliseconds = this.getMilliseconds(value as number, unit);
        const since = new Date(now.getTime() - milliseconds);

        // Use ISO string for lexicographic comparison in JSON
        return {data: {path, gte: since.toISOString() as Prisma.InputJsonValue}};
      }
      case 'olderThan': {
        // Note: Requires JSON date fields in ISO 8601 format for proper comparison
        if (!unit) {
          throw new HttpException(400, 'Unit is required for "olderThan" operator');
        }

        // Calculate the "before" date (X time units ago from now)
        const now = new Date();
        const milliseconds = this.getMilliseconds(value as number, unit);
        const before = new Date(now.getTime() - milliseconds);

        // Use ISO string for lexicographic comparison in JSON
        return {data: {path, lt: before.toISOString() as Prisma.InputJsonValue}};
      }
      default:
        throw new HttpException(400, `Unsupported operator for JSON field: ${operator}`);
    }
  }

  /**
   * Build condition for string fields
   */
  private static buildStringFieldCondition(field: 'email', operator: string, value: unknown): Prisma.ContactWhereInput {
    switch (operator) {
      case 'equals':
        return {[field]: {equals: String(value), mode: 'insensitive'}};
      case 'notEquals':
        return {NOT: {[field]: {equals: String(value), mode: 'insensitive'}}};
      case 'contains':
        return {[field]: {contains: String(value), mode: 'insensitive'}};
      case 'notContains':
        return {NOT: {[field]: {contains: String(value), mode: 'insensitive'}}};
      default:
        throw new HttpException(400, `Unsupported operator for string field: ${operator}`);
    }
  }

  /**
   * Build condition for boolean fields
   */
  private static buildBooleanFieldCondition(
    field: 'subscribed',
    operator: string,
    value: unknown,
  ): Prisma.ContactWhereInput {
    switch (operator) {
      case 'equals':
        return {[field]: value === true};
      case 'notEquals':
        return {[field]: value !== true};
      default:
        throw new HttpException(400, `Unsupported operator for boolean field: ${operator}`);
    }
  }

  /**
   * Build condition for date fields
   */
  private static buildDateFieldCondition(
    field: 'createdAt' | 'updatedAt',
    operator: string,
    value: unknown,
    unit?: 'days' | 'hours' | 'minutes',
  ): Prisma.ContactWhereInput {
    switch (operator) {
      case 'equals': {
        // For date fields, compare only the date portion (ignore time)
        if (this.isDateString(value)) {
          const {startOfDay, startOfNextDay} = this.getDateRange(String(value));
          return {
            AND: [{[field]: {gte: new Date(startOfDay)}}, {[field]: {lt: new Date(startOfNextDay)}}],
          };
        }
        // Exact timestamp match if not a date string
        return {[field]: new Date(value as string | number | Date)};
      }
      case 'notEquals': {
        // For date fields, exclude the entire day (not just exact timestamp)
        if (this.isDateString(value)) {
          const {startOfDay, startOfNextDay} = this.getDateRange(String(value));
          return {
            OR: [{[field]: {lt: new Date(startOfDay)}}, {[field]: {gte: new Date(startOfNextDay)}}],
          };
        }
        // Exclude exact timestamp if not a date string
        return {NOT: {[field]: new Date(value as string | number | Date)}};
      }
      case 'greaterThan':
        return {[field]: {gt: new Date(value as string | number | Date)}};
      case 'lessThan':
        return {[field]: {lt: new Date(value as string | number | Date)}};
      case 'greaterThanOrEqual':
        return {[field]: {gte: new Date(value as string | number | Date)}};
      case 'lessThanOrEqual':
        return {[field]: {lte: new Date(value as string | number | Date)}};
      case 'within': {
        // "within X days/hours/minutes" means in the past X time units
        if (!unit) {
          throw new HttpException(400, 'Unit is required for "within" operator');
        }

        const now = new Date();
        const milliseconds = this.getMilliseconds(value as number, unit);
        const since = new Date(now.getTime() - milliseconds);

        return {[field]: {gte: since}};
      }
      case 'olderThan': {
        // "olderThan X days/hours/minutes" means more than X time units ago
        if (!unit) {
          throw new HttpException(400, 'Unit is required for "olderThan" operator');
        }

        const now = new Date();
        const milliseconds = this.getMilliseconds(value as number, unit);
        const before = new Date(now.getTime() - milliseconds);

        return {[field]: {lt: before}};
      }
      default:
        throw new HttpException(400, `Unsupported operator for date field: ${operator}`);
    }
  }

  /**
   * Convert time value and unit to milliseconds
   */
  private static getMilliseconds(value: number, unit: 'days' | 'hours' | 'minutes'): number {
    switch (unit) {
      case 'days':
        return value * 24 * 60 * 60 * 1000;
      case 'hours':
        return value * 60 * 60 * 1000;
      case 'minutes':
        return value * 60 * 1000;
      default:
        throw new HttpException(400, `Unsupported time unit: ${unit}`);
    }
  }

  /**
   * Check if a value is a date string in YYYY-MM-DD format
   */
  private static isDateString(value: unknown): boolean {
    if (typeof value !== 'string') return false;
    // Match YYYY-MM-DD format (with optional time component)
    const dateRegex = /^\d{4}-\d{2}-\d{2}(T|$)/;
    if (!dateRegex.test(value)) return false;
    // Verify it's a valid date
    const date = new Date(value);
    return !isNaN(date.getTime());
  }

  /**
   * Get date range for a date string (start of day to start of next day in UTC)
   * @param value - Date string in YYYY-MM-DD format
   * @returns Object with startOfDay and startOfNextDay as ISO strings
   */
  private static getDateRange(value: string): {startOfDay: string; startOfNextDay: string} {
    // Extract just the date part (YYYY-MM-DD)
    const dateStr = value.split('T')[0];
    const startOfDay = `${dateStr}T00:00:00.000Z`;

    if (!dateStr) {
      throw new HttpException(400, `Invalid date string: ${value}`);
    }

    // Calculate start of next day
    const nextDay = new Date(dateStr);
    nextDay.setUTCDate(nextDay.getUTCDate() + 1);
    const startOfNextDay = nextDay.toISOString().split('T')[0] + 'T00:00:00.000Z';

    return {startOfDay, startOfNextDay};
  }

  /**
   * Build condition for event-based filters
   * Uses Prisma relations to efficiently query contacts who triggered specific events
   */
  private static buildEventCondition(
    eventName: string,
    operator: string,
    value: unknown,
    unit?: 'days' | 'hours' | 'minutes',
  ): Prisma.ContactWhereInput {
    switch (operator) {
      case 'triggered':
        // Contact has triggered this event at any time
        return {
          events: {
            some: {
              name: eventName,
            },
          },
        };

      case 'triggeredWithin': {
        // Contact has triggered this event within the specified timeframe
        if (!unit) {
          throw new HttpException(400, 'Unit is required for "triggeredWithin" operator');
        }

        const now = new Date();
        const milliseconds = this.getMilliseconds(value as number, unit);
        const since = new Date(now.getTime() - milliseconds);

        return {
          events: {
            some: {
              name: eventName,
              createdAt: {
                gte: since,
              },
            },
          },
        };
      }

      case 'triggeredOlderThan': {
        // Contact triggered this event, but only more than X time ago (not recently)
        // This means: has event AND all occurrences are before the cutoff
        if (!unit) {
          throw new HttpException(400, 'Unit is required for "triggeredOlderThan" operator');
        }

        const now = new Date();
        const milliseconds = this.getMilliseconds(value as number, unit);
        const before = new Date(now.getTime() - milliseconds);

        return {
          AND: [
            // Must have triggered the event at some point
            {
              events: {
                some: {
                  name: eventName,
                },
              },
            },
            // But NOT within the recent timeframe
            {
              events: {
                none: {
                  name: eventName,
                  createdAt: {
                    gte: before,
                  },
                },
              },
            },
          ],
        };
      }

      case 'notTriggered':
        // Contact has never triggered this event
        return {
          events: {
            none: {
              name: eventName,
            },
          },
        };

      default:
        throw new HttpException(400, `Unsupported operator for event field: ${operator}`);
    }
  }

  /**
   * Build condition for email activity filters
   * Uses Prisma relations to efficiently query contacts based on email engagement
   */
  private static buildEmailActivityCondition(
    activity: string,
    operator: string,
    value: unknown,
    unit?: 'days' | 'hours' | 'minutes',
  ): Prisma.ContactWhereInput {
    // Map activity names to Email model fields
    const fieldMap: Record<string, string> = {
      opened: 'openedAt',
      clicked: 'clickedAt',
      bounced: 'bouncedAt',
      complained: 'complainedAt',
      sent: 'sentAt',
      delivered: 'deliveredAt',
    };

    const field = fieldMap[activity];
    if (!field) {
      throw new HttpException(400, `Unsupported email activity: ${activity}`);
    }

    switch (operator) {
      case 'triggered':
        // Contact has this email activity at any time
        return {
          emails: {
            some: {
              [field]: {
                not: null,
              },
            },
          },
        };

      case 'triggeredWithin': {
        // Contact has this email activity within the specified timeframe
        if (!unit) {
          throw new HttpException(400, 'Unit is required for "triggeredWithin" operator');
        }

        const now = new Date();
        const milliseconds = this.getMilliseconds(value as number, unit);
        const since = new Date(now.getTime() - milliseconds);

        return {
          emails: {
            some: {
              [field]: {
                gte: since,
              },
            },
          },
        };
      }

      case 'triggeredOlderThan': {
        // Contact had this email activity, but only more than X time ago (not recently)
        if (!unit) {
          throw new HttpException(400, 'Unit is required for "triggeredOlderThan" operator');
        }

        const now = new Date();
        const milliseconds = this.getMilliseconds(value as number, unit);
        const before = new Date(now.getTime() - milliseconds);

        return {
          AND: [
            // Must have the email activity at some point
            {
              emails: {
                some: {
                  [field]: {
                    not: null,
                  },
                },
              },
            },
            // But NOT within the recent timeframe
            {
              emails: {
                none: {
                  [field]: {
                    gte: before,
                  },
                },
              },
            },
          ],
        };
      }

      case 'notTriggered':
        // Contact has never had this email activity
        return {
          emails: {
            none: {
              [field]: {
                not: null,
              },
            },
          },
        };

      default:
        throw new HttpException(400, `Unsupported operator for email activity field: ${operator}`);
    }
  }
}
