import {randomUUID} from 'node:crypto';

import type {Form} from '@plunk/db';
import {Prisma} from '@plunk/db';
import {FormSchemas} from '@plunk/shared';
import type {FormField, FormSettings, FormSubmitResult, PublicFormConfig} from '@plunk/types';
import {fromPrismaJson, toPrismaJson} from '@plunk/types';

import {VERIFY_EMAIL_ON_SIGNUP} from '../app/constants.js';
import {prisma} from '../database/prisma.js';
import {redis} from '../database/redis.js';
import {HttpException, RateLimitError} from '../exceptions/index.js';

import {ContactService} from './ContactService.js';
import {EmailVerificationService} from './EmailVerificationService.js';
import {EventService} from './EventService.js';
import {Keys} from './keys.js';
import {SegmentService} from './SegmentService.js';

/** Max submissions per IP per form per hour */
const FORM_SUBMIT_RATE_LIMIT = 10;
const FORM_SUBMIT_RATE_WINDOW_SECONDS = 3600;

const RESERVED_FORM_DATA_KEYS = new Set(['plunk_id', 'plunk_email', 'id', 'email', 'locale']);

export class FormService {
  public static async list(projectId: string): Promise<Form[]> {
    return prisma.form.findMany({
      where: {projectId},
      orderBy: {createdAt: 'desc'},
      include: {
        segment: {
          select: {id: true, name: true, type: true},
        },
      },
    });
  }

  public static async get(projectId: string, formId: string): Promise<Form> {
    const form = await prisma.form.findFirst({
      where: {id: formId, projectId},
      include: {
        segment: {
          select: {id: true, name: true, type: true},
        },
      },
    });

    if (!form) {
      throw new HttpException(404, 'Form not found');
    }

    return form;
  }

  public static async create(
    projectId: string,
    data: {
      name: string;
      slug: string;
      fields: FormField[];
      settings: FormSettings;
      segmentId?: string;
      enabled?: boolean;
      createSegment?: boolean;
    },
  ): Promise<Form> {
    await this.assertSlugAvailable(projectId, data.slug);

    let segmentId = data.segmentId;

    if (data.createSegment) {
      const segment = await SegmentService.create(projectId, {
        name: `Form — ${data.name}`,
        description: `Static segment for form "${data.name}"`,
        type: 'STATIC',
      });
      segmentId = segment.id;
    }

    if (segmentId) {
      await this.assertStaticSegment(projectId, segmentId);
    }

    return prisma.form.create({
      data: {
        projectId,
        publicId: randomUUID(),
        slug: data.slug,
        name: data.name,
        fields: toPrismaJson(data.fields),
        settings: toPrismaJson(data.settings),
        segmentId: segmentId ?? null,
        enabled: data.enabled ?? true,
      },
      include: {
        segment: {
          select: {id: true, name: true, type: true},
        },
      },
    });
  }

  public static async update(
    projectId: string,
    formId: string,
    data: {
      name?: string;
      slug?: string;
      fields?: FormField[];
      settings?: FormSettings;
      segmentId?: string | null;
      enabled?: boolean;
      createSegment?: boolean;
    },
  ): Promise<Form> {
    const existing = await this.get(projectId, formId);

    if (data.slug && data.slug !== existing.slug) {
      await this.assertSlugAvailable(projectId, data.slug, formId);
    }

    let segmentId = data.segmentId;

    if (data.createSegment) {
      const segment = await SegmentService.create(projectId, {
        name: `Form — ${data.name ?? existing.name}`,
        description: `Static segment for form "${data.name ?? existing.name}"`,
        type: 'STATIC',
      });
      segmentId = segment.id;
    }

    if (segmentId) {
      await this.assertStaticSegment(projectId, segmentId);
    }

    const updateData: Prisma.FormUpdateInput = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.slug !== undefined) updateData.slug = data.slug;
    if (data.fields !== undefined) updateData.fields = toPrismaJson(data.fields);
    if (data.settings !== undefined) {
      const merged = {
        ...fromPrismaJson<FormSettings>(existing.settings),
        ...data.settings,
      };
      updateData.settings = toPrismaJson(merged);
    }
    if (data.enabled !== undefined) updateData.enabled = data.enabled;
    if (segmentId !== undefined) {
      updateData.segment = segmentId ? {connect: {id: segmentId}} : {disconnect: true};
    } else if (data.segmentId === null) {
      updateData.segment = {disconnect: true};
    }

    return prisma.form.update({
      where: {id: formId},
      data: updateData,
      include: {
        segment: {
          select: {id: true, name: true, type: true},
        },
      },
    });
  }

  public static async delete(projectId: string, formId: string): Promise<void> {
    await this.get(projectId, formId);
    await prisma.form.delete({where: {id: formId}});
  }

  public static async getPublicConfig(publicId: string): Promise<PublicFormConfig> {
    const form = await prisma.form.findFirst({
      where: {publicId, enabled: true},
      include: {
        project: {
          select: {language: true, disabled: true},
        },
      },
    });

    if (!form || form.project.disabled) {
      throw new HttpException(404, 'Form not found');
    }

    const settings = fromPrismaJson<FormSettings>(form.settings);
    const fields = fromPrismaJson<FormField[]>(form.fields);

    return {
      publicId: form.publicId,
      name: form.name,
      fields,
      settings: {
        title: settings.title,
        description: settings.description,
        successMessage: settings.successMessage,
        redirectUrl: settings.redirectUrl,
        emailPlaceholder: settings.emailPlaceholder,
        fieldOrder: settings.fieldOrder,
      },
      language: form.project.language || 'en',
    };
  }

  public static async submit(
    publicId: string,
    body: unknown,
    clientIp: string,
  ): Promise<FormSubmitResult> {
    const parsed = FormSchemas.submit.parse(body);

    // Honeypot: bots fill hidden field — silently accept without processing
    if (parsed.hp) {
      return {success: true};
    }

    const form = await prisma.form.findFirst({
      where: {publicId, enabled: true},
      include: {
        project: {
          select: {id: true, disabled: true, language: true},
        },
      },
    });

    if (!form || form.project.disabled) {
      throw new HttpException(404, 'Form not found');
    }

    await this.checkRateLimit(publicId, clientIp);

    const settings = fromPrismaJson<FormSettings>(form.settings);
    const fields = fromPrismaJson<FormField[]>(form.fields);

    this.validateSubmitFields(fields, parsed.data ?? {});

    const shouldVerifyEmail = settings.verifyEmail || VERIFY_EMAIL_ON_SIGNUP;
    if (shouldVerifyEmail) {
      const verification = await EmailVerificationService.verifyEmail(parsed.email);
      if (
        verification.isDisposable ||
        verification.isPlusAddressed ||
        !verification.domainExists ||
        !verification.hasMxRecords
      ) {
        throw new HttpException(400, 'This email address cannot be used');
      }
    }

    const customData = this.buildContactData(form.slug, settings, parsed.data ?? {});

    const subscribed = settings.doubleOptIn ? false : (settings.defaultSubscribed ?? true);

    const contact = await ContactService.upsert(form.projectId, parsed.email, customData, subscribed);

    const eventName = settings.eventName || 'form.submitted';
    if (!EventService.isReservedEvent(eventName)) {
      await EventService.trackEvent(form.projectId, eventName, contact.id, undefined, {
        form: form.slug,
        formId: form.id,
        ...parsed.data,
      });
    }

    if (form.segmentId) {
      await SegmentService.addContacts(form.projectId, form.segmentId, [parsed.email], false, subscribed);
    }

    await prisma.form.update({
      where: {id: form.id},
      data: {submissions: {increment: 1}},
    });

    return {
      success: true,
      redirectUrl: settings.redirectUrl,
    };
  }

  private static async checkRateLimit(publicId: string, clientIp: string): Promise<void> {
    const key = Keys.Form.submitRateLimit(publicId, clientIp);
    const count = await redis.incr(key);

    if (count === 1) {
      await redis.expire(key, FORM_SUBMIT_RATE_WINDOW_SECONDS);
    }

    if (count > FORM_SUBMIT_RATE_LIMIT) {
      throw new RateLimitError('Too many submissions. Please try again later.');
    }
  }

  private static validateSubmitFields(fields: FormField[], data: Record<string, string | number | boolean>): void {
    for (const field of fields) {
      const value = data[field.key];

      if (field.type === 'checkbox') {
        if (field.required && value !== true) {
          throw new HttpException(400, `Field "${field.label}" is required`);
        }
        continue;
      }

      if (field.required && (value === undefined || value === null || value === '')) {
        throw new HttpException(400, `Field "${field.label}" is required`);
      }

      if (value === undefined || value === null || value === '') {
        continue;
      }

      if (field.type === 'email') {
        const result = FormSchemas.submit.shape.email.safeParse(String(value));
        if (!result.success) {
          throw new HttpException(400, `Field "${field.label}" must be a valid email`);
        }
      }

      if (field.type === 'number') {
        const num = typeof value === 'number' ? value : Number(value);
        if (Number.isNaN(num)) {
          throw new HttpException(400, `Field "${field.label}" must be a valid number`);
        }
      }

      if (field.type === 'url') {
        try {
          new URL(String(value));
        } catch {
          throw new HttpException(400, `Field "${field.label}" must be a valid URL`);
        }
      }

      if (field.type === 'select') {
        const strValue = String(value);
        if (!field.options?.includes(strValue)) {
          throw new HttpException(400, `Field "${field.label}" has an invalid option`);
        }
      }
    }
  }

  private static buildContactData(
    slug: string,
    settings: FormSettings,
    submitted: Record<string, string | number | boolean>,
  ): Record<string, unknown> {
    const data: Record<string, unknown> = {
      [`form:${slug}`]: true,
    };

    if (settings.tags) {
      for (const [key, value] of Object.entries(settings.tags)) {
        if (!RESERVED_FORM_DATA_KEYS.has(key)) {
          data[key] = value;
        }
      }
    }

    for (const [key, value] of Object.entries(submitted)) {
      if (!RESERVED_FORM_DATA_KEYS.has(key) && !key.startsWith('form:')) {
        data[key] = value;
      }
    }

    return data;
  }

  private static async assertSlugAvailable(projectId: string, slug: string, excludeId?: string): Promise<void> {
    const existing = await prisma.form.findFirst({
      where: {
        projectId,
        slug,
        ...(excludeId ? {NOT: {id: excludeId}} : {}),
      },
    });

    if (existing) {
      throw new HttpException(409, 'A form with this slug already exists in this project');
    }
  }

  private static async assertStaticSegment(projectId: string, segmentId: string): Promise<void> {
    const segment = await SegmentService.get(projectId, segmentId);
    if (segment.type !== 'STATIC') {
      throw new HttpException(400, 'Forms can only be linked to STATIC segments');
    }
  }
}
