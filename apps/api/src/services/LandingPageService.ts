import {randomUUID} from 'node:crypto';

import type {LandingPage} from '@plunk/db';
import {Prisma} from '@plunk/db';
import type {LandingPageSettings, PublicLandingPageConfig, PuckData} from '@plunk/types';
import {fromPrismaJson, toPrismaJson} from '@plunk/types';

import {redis, TEN_MINUTES_IN_SECONDS, wrapRedis} from '../database/redis.js';
import {prisma} from '../database/prisma.js';
import {HttpException} from '../exceptions/index.js';
import {Keys} from './keys.js';

export class LandingPageService {
  public static async list(projectId: string): Promise<LandingPage[]> {
    return prisma.landingPage.findMany({
      where: {projectId},
      orderBy: {createdAt: 'desc'},
    });
  }

  public static async get(projectId: string, landingPageId: string): Promise<LandingPage> {
    const page = await prisma.landingPage.findFirst({
      where: {id: landingPageId, projectId},
    });

    if (!page) {
      throw new HttpException(404, 'Landing page not found');
    }

    return page;
  }

  public static async create(
    projectId: string,
    data: {
      name: string;
      slug: string;
      data: PuckData;
      settings: LandingPageSettings;
      published?: boolean;
    },
  ): Promise<LandingPage> {
    await this.assertSlugAvailable(projectId, data.slug);

    return prisma.landingPage.create({
      data: {
        projectId,
        publicId: randomUUID(),
        slug: data.slug,
        name: data.name,
        data: toPrismaJson(data.data),
        settings: toPrismaJson(data.settings),
        published: data.published ?? false,
      },
    });
  }

  public static async update(
    projectId: string,
    landingPageId: string,
    data: {
      name?: string;
      slug?: string;
      data?: PuckData;
      settings?: LandingPageSettings;
      published?: boolean;
    },
  ): Promise<LandingPage> {
    const existing = await this.get(projectId, landingPageId);

    if (data.slug && data.slug !== existing.slug) {
      await this.assertSlugAvailable(projectId, data.slug, landingPageId);
    }

    const updateData: Prisma.LandingPageUpdateInput = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.slug !== undefined) updateData.slug = data.slug;
    if (data.data !== undefined) updateData.data = toPrismaJson(data.data);
    if (data.settings !== undefined) {
      const merged = {
        ...fromPrismaJson<LandingPageSettings>(existing.settings),
        ...data.settings,
      };
      updateData.settings = toPrismaJson(merged);
    }
    if (data.published !== undefined) updateData.published = data.published;

    const updated = await prisma.landingPage.update({
      where: {id: landingPageId},
      data: updateData,
    });

    await redis.del(Keys.LandingPage.public(existing.publicId));

    return updated;
  }

  public static async delete(projectId: string, landingPageId: string): Promise<void> {
    const existing = await this.get(projectId, landingPageId);
    await prisma.landingPage.delete({where: {id: landingPageId}});
    await redis.del(Keys.LandingPage.public(existing.publicId));
  }

  public static async getPublicConfig(publicId: string): Promise<PublicLandingPageConfig> {
    return wrapRedis(
      Keys.LandingPage.public(publicId),
      () => this.fetchPublicConfig(publicId),
      TEN_MINUTES_IN_SECONDS,
    );
  }

  private static pickPublicSettings(settings: LandingPageSettings): LandingPageSettings {
    return {
      title: settings.title,
      description: settings.description,
      faviconUrl: settings.faviconUrl,
      canonicalUrl: settings.canonicalUrl,
      ogTitle: settings.ogTitle,
      ogDescription: settings.ogDescription,
      ogImageUrl: settings.ogImageUrl,
      twitterCard: settings.twitterCard,
      gtmId: settings.gtmId,
      ga4Id: settings.ga4Id,
      fbPixelId: settings.fbPixelId,
    };
  }

  private static async fetchPublicConfig(publicId: string): Promise<PublicLandingPageConfig> {
    const page = await prisma.landingPage.findFirst({
      where: {publicId, published: true},
      include: {
        project: {
          select: {disabled: true},
        },
      },
    });

    if (!page || page.project.disabled) {
      throw new HttpException(404, 'Landing page not found');
    }

    const settings = fromPrismaJson<LandingPageSettings>(page.settings);
    const puckData = fromPrismaJson<PuckData>(page.data);

    return {
      publicId: page.publicId,
      name: page.name,
      data: puckData,
      settings: this.pickPublicSettings(settings),
    };
  }

  private static async assertSlugAvailable(
    projectId: string,
    slug: string,
    excludeId?: string,
  ): Promise<void> {
    const existing = await prisma.landingPage.findFirst({
      where: {
        projectId,
        slug,
        ...(excludeId ? {NOT: {id: excludeId}} : {}),
      },
    });

    if (existing) {
      throw new HttpException(409, 'A landing page with this slug already exists in this project');
    }
  }
}
