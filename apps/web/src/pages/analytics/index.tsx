import {Tabs, TabsContent, TabsList, TabsTrigger} from '@plunk/ui';
import {NextSeo} from 'next-seo';

import {AnalyticsFilters} from '../../components/analytics/AnalyticsFilters';
import {AudienceTab} from '../../components/analytics/AudienceTab';
import {DeliverabilityTab} from '../../components/analytics/DeliverabilityTab';
import {EngagementTab} from '../../components/analytics/EngagementTab';
import {OverviewTab} from '../../components/analytics/OverviewTab';
import {DashboardLayout} from '../../components/DashboardLayout';
import {type AnalyticsTab, useAnalyticsFilters} from '../../lib/hooks/useAnalytics';

const TABS: {value: AnalyticsTab; label: string}[] = [
  {value: 'overview', label: 'Overview'},
  {value: 'deliverability', label: 'Deliverability'},
  {value: 'engagement', label: 'Engagement'},
  {value: 'audience', label: 'Audience'},
];

export default function AnalyticsPage() {
  const filters = useAnalyticsFilters();
  const {bounds} = filters;

  const sameYear = bounds.first.year() === bounds.last.year();
  const period =
    bounds.days === 1
      ? `${bounds.last.format('MMMM D, YYYY')}, compared with the day before.`
      : `${bounds.first.format(sameYear ? 'MMMM D' : 'MMMM D, YYYY')} to ${bounds.last.format('MMMM D, YYYY')}, compared with the ${
          bounds.days
        } days before.`;

  return (
    <>
      <NextSeo title="Analytics" />
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-neutral-900">Analytics</h1>
            <p className="mt-2 text-sm text-neutral-500">{period}</p>
          </div>

          <Tabs value={filters.tab} onValueChange={value => void filters.setState({tab: value as AnalyticsTab})}>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="-mx-1 overflow-x-auto px-1">
                <TabsList>
                  {TABS.map(tab => (
                    <TabsTrigger key={tab.value} value={tab.value}>
                      {tab.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>
              {/* Contacts are not tied to a stream, so the stream filter would do nothing there */}
              <AnalyticsFilters filters={filters} showStream={filters.tab !== 'audience'} />
            </div>

            <TabsContent value="overview" className="mt-6">
              <OverviewTab filters={filters} />
            </TabsContent>
            <TabsContent value="deliverability" className="mt-6">
              <DeliverabilityTab filters={filters} />
            </TabsContent>
            <TabsContent value="engagement" className="mt-6">
              <EngagementTab filters={filters} />
            </TabsContent>
            <TabsContent value="audience" className="mt-6">
              <AudienceTab filters={filters} />
            </TabsContent>
          </Tabs>
        </div>
      </DashboardLayout>
    </>
  );
}
