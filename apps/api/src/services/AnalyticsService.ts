import {prisma} from '../database/prisma.js';
import {redis} from '../database/redis.js';
import {Keys} from './keys.js';

/**
 * Time series data point for analytics
 */
export interface TimeSeriesDataPoint {
  date: string;
  emails: number;
  opens: number;
  clicks: number;
  bounces: number;
  delivered: number;
}

/**
 * Analytics Service
 *
 * PERFORMANCE CONSIDERATIONS:
 * - Aggregates data by day to reduce row count
 * - Uses Redis caching with 15-minute TTL
 * - Limits date ranges to prevent expensive queries
 * - Uses indexed fields (createdAt, projectId) for efficient filtering
 * - For 1M+ emails, consider background jobs for pre-aggregation
 */
export class AnalyticsService {
  private static readonly DEFAULT_DAYS_BACK = 30;
  private static readonly MAX_DAYS_BACK = 90;
  private static readonly TIMESERIES_CACHE_TTL = 900; // 15 minutes

  /**
   * Get time series data for email analytics
   *
   * Performance: O(n) where n = number of emails in date range
   * - Groups emails by day using SQL aggregation
   * - Cached in Redis for 15 minutes
   * - Limited to 90 days max to prevent performance issues
   *
   * For higher scale (1M+ emails/day), consider:
   * - Pre-aggregated daily stats table updated by background job
   * - Materialized view with daily refresh
   * - Time-series database (TimescaleDB, InfluxDB)
   */
  public static async getTimeSeriesData(
    projectId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<TimeSeriesDataPoint[]> {
    // Calculate date range with limits
    const now = new Date();
    const effectiveEndDate = endDate || now;
    const defaultStartDate = new Date(now.getTime() - this.DEFAULT_DAYS_BACK * 24 * 60 * 60 * 1000);
    const effectiveStartDate = startDate || defaultStartDate;

    // Enforce max date range
    const maxStartDate = new Date(now.getTime() - this.MAX_DAYS_BACK * 24 * 60 * 60 * 1000);
    const limitedStartDate = effectiveStartDate < maxStartDate ? maxStartDate : effectiveStartDate;

    // Check cache first
    const cacheKey = Keys.Analytics.timeseries(
      projectId,
      limitedStartDate.toISOString(),
      effectiveEndDate.toISOString(),
    );
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const result = await prisma.$queryRaw<
      {
        date: Date;
        total_emails: bigint;
        total_opens: bigint;
        total_clicks: bigint;
        total_bounces: bigint;
        total_delivered: bigint;
      }[]
    >`
			SELECT
				DATE_TRUNC('day', "createdAt") as date,
				COUNT(*) as total_emails,
				COUNT(CASE WHEN "openedAt" IS NOT NULL THEN 1 END) as total_opens,
				COUNT(CASE WHEN "clickedAt" IS NOT NULL THEN 1 END) as total_clicks,
				COUNT(CASE WHEN "bouncedAt" IS NOT NULL THEN 1 END) as total_bounces,
				COUNT(CASE WHEN "deliveredAt" IS NOT NULL THEN 1 END) as total_delivered
			FROM "emails"
			WHERE "projectId" = ${projectId}
				AND "status" <> 'SUPPRESSED'
                AND "createdAt" >= ${limitedStartDate}
				AND "createdAt" <= ${effectiveEndDate}
			GROUP BY DATE_TRUNC('day', "createdAt")
			ORDER BY date ASC
		`;

    // Convert to TimeSeriesDataPoint format
    const timeSeries: TimeSeriesDataPoint[] = result.map(row => ({
      date: row.date.toISOString(),
      emails: Number(row.total_emails),
      opens: Number(row.total_opens),
      clicks: Number(row.total_clicks),
      bounces: Number(row.total_bounces),
      delivered: Number(row.total_delivered),
    }));

    // Fill in missing dates with zero values
    const filledTimeSeries = this.fillMissingDates(timeSeries, limitedStartDate, effectiveEndDate);

    // Cache for 15 minutes
    await redis.setex(cacheKey, this.TIMESERIES_CACHE_TTL, JSON.stringify(filledTimeSeries));

    return filledTimeSeries;
  }

  /**
   * Get campaign performance metrics
   * Returns top performing campaigns by open rate
   */
  public static async getTopCampaigns(
    projectId: string,
    limit = 10,
    startDate?: Date,
    endDate?: Date,
  ): Promise<
    {
      id: string;
      subject: string;
      sentCount: number;
      openedCount: number;
      clickedCount: number;
      openRate: number;
      clickRate: number;
    }[]
  > {
    const now = new Date();
    const defaultStartDate = new Date(now.getTime() - this.DEFAULT_DAYS_BACK * 24 * 60 * 60 * 1000);

    const campaigns = await prisma.campaign.findMany({
      where: {
        projectId,
        sentAt: {
          gte: startDate || defaultStartDate,
          ...(endDate ? {lte: endDate} : {}),
        },
        status: 'SENT',
      },
      select: {
        id: true,
        subject: true,
        sentCount: true,
        openedCount: true,
        clickedCount: true,
      },
      orderBy: {
        openedCount: 'desc',
      },
      take: limit,
    });

    return campaigns.map(campaign => ({
      id: campaign.id,
      subject: campaign.subject || 'No subject',
      sentCount: campaign.sentCount || 0,
      openedCount: campaign.openedCount || 0,
      clickedCount: campaign.clickedCount || 0,
      openRate: campaign.sentCount ? ((campaign.openedCount || 0) / campaign.sentCount) * 100 : 0,
      clickRate: campaign.sentCount ? ((campaign.clickedCount || 0) / campaign.sentCount) * 100 : 0,
    }));
  }

  /**
   * Get campaign statistics overview
   * Returns aggregate stats for all campaigns in date range
   *
   * Performance: O(1) with indexed queries
   * - Uses aggregation on indexed fields
   * - Cached in Redis for 15 minutes
   */
  public static async getCampaignStats(
    projectId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<{
    total: number;
    active: number;
    completed: number;
    averageOpenRate: number;
    averageClickRate: number;
  }> {
    const now = new Date();
    const defaultStartDate = new Date(now.getTime() - this.DEFAULT_DAYS_BACK * 24 * 60 * 60 * 1000);
    const effectiveStartDate = startDate || defaultStartDate;
    const effectiveEndDate = endDate || now;

    // Check cache
    const cacheKey = Keys.Analytics.campaignStats(
      projectId,
      effectiveStartDate.toISOString(),
      effectiveEndDate.toISOString(),
    );
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // Get all campaigns in date range
    const [totalCampaigns, activeCampaigns, sentCampaigns] = await Promise.all([
      // Total campaigns created in date range
      prisma.campaign.count({
        where: {
          projectId,
          createdAt: {
            gte: effectiveStartDate,
            lte: effectiveEndDate,
          },
        },
      }),
      // Active campaigns (not sent yet)
      prisma.campaign.count({
        where: {
          projectId,
          createdAt: {
            gte: effectiveStartDate,
            lte: effectiveEndDate,
          },
          status: {
            in: ['DRAFT', 'SCHEDULED'],
          },
        },
      }),
      // Sent campaigns with stats
      prisma.campaign.findMany({
        where: {
          projectId,
          sentAt: {
            gte: effectiveStartDate,
            lte: effectiveEndDate,
          },
          status: 'SENT',
        },
        select: {
          sentCount: true,
          openedCount: true,
          clickedCount: true,
        },
      }),
    ]);

    // Calculate averages
    let totalSent = 0;
    let totalOpened = 0;
    let totalClicked = 0;

    sentCampaigns.forEach(campaign => {
      totalSent += campaign.sentCount || 0;
      totalOpened += campaign.openedCount || 0;
      totalClicked += campaign.clickedCount || 0;
    });

    const completed = sentCampaigns.length;
    const averageOpenRate = totalSent > 0 ? (totalOpened / totalSent) * 100 : 0;
    const averageClickRate = totalSent > 0 ? (totalClicked / totalSent) * 100 : 0;

    const stats = {
      total: totalCampaigns,
      active: activeCampaigns,
      completed,
      averageOpenRate: Math.round(averageOpenRate * 10) / 10, // Round to 1 decimal
      averageClickRate: Math.round(averageClickRate * 10) / 10,
    };

    // Cache for 15 minutes
    await redis.setex(cacheKey, this.TIMESERIES_CACHE_TTL, JSON.stringify(stats));

    return stats;
  }

  /**
   * Get top events by frequency with trend data
   *
   * Performance: O(n log n) where n = number of unique events
   * - Groups events and counts occurrences
   * - Compares with previous period for trend calculation
   * - Cached in Redis for 15 minutes
   */
  public static async getTopEvents(
    projectId: string,
    limit = 5,
    startDate?: Date,
    endDate?: Date,
  ): Promise<
    {
      name: string;
      count: number;
      trend: number;
    }[]
  > {
    const now = new Date();
    const defaultStartDate = new Date(now.getTime() - this.DEFAULT_DAYS_BACK * 24 * 60 * 60 * 1000);
    const effectiveStartDate = startDate || defaultStartDate;
    const effectiveEndDate = endDate || now;

    // Check cache
    const cacheKey = Keys.Analytics.topEvents(
      projectId,
      limit,
      effectiveStartDate.toISOString(),
      effectiveEndDate.toISOString(),
    );
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // Calculate previous period for trend comparison
    const periodLength = effectiveEndDate.getTime() - effectiveStartDate.getTime();
    const previousStartDate = new Date(effectiveStartDate.getTime() - periodLength);
    const previousEndDate = new Date(effectiveStartDate.getTime());

    // Get current period events
    const currentEvents = await prisma.event.groupBy({
      by: ['name'],
      where: {
        projectId,
        createdAt: {
          gte: effectiveStartDate,
          lte: effectiveEndDate,
        },
      },
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: 'desc',
        },
      },
      take: limit,
    });

    // Get previous period events for trend calculation
    const previousEvents = await prisma.event.groupBy({
      by: ['name'],
      where: {
        projectId,
        name: {
          in: currentEvents.map(e => e.name),
        },
        createdAt: {
          gte: previousStartDate,
          lte: previousEndDate,
        },
      },
      _count: {
        id: true,
      },
    });

    // Create map of previous counts
    const previousCountMap = new Map(previousEvents.map(e => [e.name, e._count.id]));

    // Calculate trends
    const topEvents = currentEvents.map(event => {
      const currentCount = event._count.id;
      const previousCount = previousCountMap.get(event.name) || 0;

      // Calculate percentage change
      let trend = 0;
      if (previousCount > 0) {
        trend = Math.round(((currentCount - previousCount) / previousCount) * 100);
      } else if (currentCount > 0) {
        trend = 100; // New event, 100% increase
      }

      return {
        name: event.name,
        count: currentCount,
        trend,
      };
    });

    // Cache for 15 minutes
    await redis.setex(cacheKey, this.TIMESERIES_CACHE_TTL, JSON.stringify(topEvents));

    return topEvents;
  }

  /**
   * Fill in missing dates in time series with zero values
   * Ensures consistent daily data points even when no emails were sent
   */
  private static fillMissingDates(data: TimeSeriesDataPoint[], startDate: Date, endDate: Date): TimeSeriesDataPoint[] {
    const result: TimeSeriesDataPoint[] = [];
    const dataMap = new Map(data.map(point => [new Date(point.date).toDateString(), point]));

    // Iterate through each day in range
    const currentDate = new Date(startDate);
    currentDate.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    while (currentDate <= end) {
      const dateKey = currentDate.toDateString();
      const existingData = dataMap.get(dateKey);

      if (existingData) {
        result.push(existingData);
      } else {
        // Fill with zeros for days with no data
        result.push({
          date: new Date(currentDate).toISOString(),
          emails: 0,
          opens: 0,
          clicks: 0,
          bounces: 0,
          delivered: 0,
        });
      }

      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return result;
  }
}
