import {beforeEach, describe, expect, it} from 'vitest';

import {factories} from '../../../../../test/helpers';
import {AnalyticsService} from '../AnalyticsService';

/**
 * The previous series is drawn under the current one bucket for bucket, so both must start
 * on a local day and hold the same number of days, including across a DST change.
 */
describe('AnalyticsService - timeseries buckets', () => {
  let projectId: string;

  beforeEach(async () => {
    const {project} = await factories.createUserWithProject();
    projectId = project.id;
  });

  it('lines the previous period up with the current one when the clocks go back', async () => {
    // September 28 to October 27, 2025 in Paris: the clocks went back on October 26, so the
    // period is 30 days and an hour long, and the previous one starts at 23:00 local time
    const series = await AnalyticsService.getTimeseries({
      projectId,
      from: new Date('2025-09-27T22:00:00.000Z'),
      to: new Date('2025-10-27T23:00:00.000Z'),
      tz: 'Europe/Paris',
      stream: 'ALL',
    });

    expect(series.current).toHaveLength(30);
    expect(series.previous).toHaveLength(30);
    expect(series.current[0]?.bucket).toBe('2025-09-28T00:00');
    expect(series.previous[0]?.bucket).toBe('2025-08-29T00:00');
  });

  it('keeps a period that starts on a bucket unchanged', async () => {
    const series = await AnalyticsService.getTimeseries({
      projectId,
      from: new Date('2025-06-01T00:00:00.000Z'),
      to: new Date('2025-06-08T00:00:00.000Z'),
      tz: 'UTC',
      stream: 'ALL',
    });

    expect(series.current.map(p => p.bucket)[0]).toBe('2025-06-01T00:00');
    expect(series.current).toHaveLength(7);
    expect(series.previous[0]?.bucket).toBe('2025-05-25T00:00');
  });
});
