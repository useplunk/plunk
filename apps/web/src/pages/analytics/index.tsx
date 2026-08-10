/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@plunk/ui';
import {EmptyState} from '@plunk/ui';
import {DashboardLayout} from '../../components/DashboardLayout';
import {useAnalytics} from '../../lib/hooks/useAnalytics';
import useSWR from 'swr';
import {
  Activity,
  AlertCircle,
  BarChart3,
  Eye,
  Mail,
  Megaphone,
  MousePointerClick,
  Send,
  Zap,
} from 'lucide-react';
import {NextSeo} from 'next-seo';
import {useMemo, useState} from 'react';
import {Area, AreaChart, CartesianGrid, Line, LineChart, XAxis, YAxis} from 'recharts'; // Chart configurations with sleek blue theme

// Chart configurations with sleek blue theme
const volumeChartConfig = {
  emails: {
    label: 'Emails sent',
    color: 'hsl(221.2 83.2% 53.3%)', // Vibrant blue
  },
  opens: {
    label: 'Opens',
    color: 'hsl(142.1 76.2% 36.3%)', // Green
  },
  clicks: {
    label: 'Clicks',
    color: 'hsl(262.1 83.3% 57.8%)', // Purple
  },
} satisfies ChartConfig;

const engagementChartConfig = {
  openRate: {
    label: 'Open rate',
    color: 'hsl(221.2 83.2% 53.3%)', // Vibrant blue to match
  },
} satisfies ChartConfig;

export default function AnalyticsPage() {
  const [dateRange, setDateRange] = useState<string>('30');
  const days = parseInt(dateRange);

  const {stats, timeSeries, isLoading, error} = useAnalytics({days});

  // Calculate start and end dates for additional API calls
  const {startDate, endDate} = useMemo(() => {
    const end = new Date();
    const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);
    return {startDate: start.toISOString(), endDate: end.toISOString()};
  }, [days]);

    const {data: campaignStats} = useSWR<{
    total: number;
    active: number;
    completed: number;
    averageOpenRate: number;
    averageClickRate: number;
  }>(`/analytics/campaign-stats?startDate=${startDate}&endDate=${endDate}`, {
    revalidateOnFocus: false,
    refreshInterval: 300000,
    dedupingInterval: 10000,
  });

    const {data: topEvents} = useSWR<
    {
      name: string;
      count: number;
      trend: number;
    }[]
  >(`/analytics/top-events?limit=5&startDate=${startDate}&endDate=${endDate}`, {
    revalidateOnFocus: false,
    refreshInterval: 300000,
    dedupingInterval: 10000,
  });

    const {data: topCampaigns} = useSWR<
    {
      id: string;
      subject: string;
      sentCount: number;
      openedCount: number;
      clickedCount: number;
      openRate: number;
      clickRate: number;
    }[]
  >(`/analytics/top-campaigns?limit=10&startDate=${startDate}&endDate=${endDate}`, {
    revalidateOnFocus: false,
    refreshInterval: 300000,
    dedupingInterval: 10000,
  });

    const chartData = useMemo(() => {
    if (timeSeries && timeSeries.length > 0) {
      return timeSeries.map(point => ({
        date: new Date(point.date).toLocaleDateString('en-US', {month: 'short', day: 'numeric'}),
        emails: point.emails,
        opens: point.opens,
        clicks: point.clicks,
        openRate: point.emails > 0 ? Number(((point.opens / point.emails) * 100).toFixed(1)) : 0,
      }));
    }

    // Return empty array if no data
    return [];
  }, [timeSeries]);

    const hasData = useMemo(() => {
    return chartData.some(point => point.emails > 0 || point.opens > 0 || point.clicks > 0);
  }, [chartData]);

    const cumulativeTotals = useMemo(() => {
    return chartData.reduce(
      (acc, day) => ({
        emails: acc.emails + (day.emails || 0),
        opens: acc.opens + (day.opens || 0),
        clicks: acc.clicks + (day.clicks || 0),
      }),
      {emails: 0, opens: 0, clicks: 0},
    );
  }, [chartData]);

  const statsCards = [
    {
      name: 'Total emails',
      value: stats?.totalEmailsSent?.toLocaleString() || cumulativeTotals.emails.toLocaleString(),
      icon: Send,
      description: `Last ${days} days`,
      color: 'text-neutral-600',
      bgColor: 'bg-neutral-100',
      trend: stats?.totalEmailsSent ? (stats.totalEmailsSent > 0 ? 'positive' : 'neutral') : 'neutral',
    },
    {
      name: 'Open rate',
      value: stats?.openRate ? `${stats.openRate.toFixed(1)}%` : '0%',
      icon: Eye,
      description: `${stats?.totalEmailsOpened?.toLocaleString() || cumulativeTotals.opens.toLocaleString()} opens`,
      color: 'text-neutral-600',
      bgColor: 'bg-neutral-100',
      trend: stats?.openRate && stats.openRate > 20 ? 'positive' : 'neutral',
    },
    {
      name: 'Click rate',
      value: stats?.clickRate ? `${stats.clickRate.toFixed(1)}%` : '0%',
      icon: MousePointerClick,
      description: `${stats?.totalEmailsClicked?.toLocaleString() || cumulativeTotals.clicks.toLocaleString()} clicks`,
      color: 'text-neutral-600',
      bgColor: 'bg-neutral-100',
      trend: stats?.clickRate && stats.clickRate > 3 ? 'positive' : 'neutral',
    },
    {
      name: 'Active campaigns',
      value: campaignStats?.active?.toLocaleString() || '0',
      icon: Megaphone,
      description: `${campaignStats?.total || 0} total campaigns`,
      color: 'text-neutral-600',
      bgColor: 'bg-neutral-100',
      trend: campaignStats?.active ? 'positive' : 'neutral',
    },
    {
      name: 'Workflows',
      value: stats?.totalWorkflowsStarted?.toLocaleString() || '0',
      icon: Activity,
      description: 'Automations triggered',
      color: 'text-neutral-600',
      bgColor: 'bg-neutral-100',
      trend: stats?.totalWorkflowsStarted && stats.totalWorkflowsStarted > 0 ? 'positive' : 'neutral',
    },
    {
      name: 'Total events',
      value: stats?.totalEvents?.toLocaleString() || '0',
      icon: Zap,
      description: 'Custom events tracked',
      color: 'text-neutral-600',
      bgColor: 'bg-neutral-100',
      trend: stats?.totalEvents && stats.totalEvents > 0 ? 'positive' : 'neutral',
    },
  ];

  return (
    <>
      <NextSeo title="Analytics" />
      <DashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold text-neutral-900">Analytics</h1>
              <p className="text-neutral-500 mt-2 text-sm sm:text-base">
                Opens, clicks, and deliverability for the last {days} days.
              </p>
            </div>
            <div className="flex gap-3">
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Select period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="90">Last 90 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Error State */}
          {error && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 text-red-700">
                  <AlertCircle className="h-5 w-5" />
                  <span>Couldn’t load analytics. Try again in a moment.</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {statsCards.map(stat => {
              const Icon = stat.icon;
              return (
                <Card key={stat.name}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardDescription>{stat.name}</CardDescription>
                      <div className={`h-10 w-10 rounded-lg ${stat.bgColor} flex items-center justify-center`}>
                        <Icon className={`h-5 w-5 ${stat.color}`} />
                      </div>
                    </div>
                    <CardTitle className="text-2xl">{isLoading ? '-' : stat.value}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-neutral-500">{stat.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Email Volume Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Email volume trends</CardTitle>
              <CardDescription>Daily email sends, opens, and clicks over the selected period</CardDescription>
            </CardHeader>
            <CardContent>
              {!hasData ? (
                <div className="flex h-[400px] w-full items-center justify-center">
                  <EmptyState
                    className="py-0"
                    icon={Mail}
                    title="No email data yet"
                    description="Send your first email to see analytics here."
                  />
                </div>
              ) : (
                <ChartContainer config={volumeChartConfig} className="h-[400px] w-full">
                  <AreaChart data={chartData} margin={{top: 10, right: 30, left: 0, bottom: 0}}>
                    <defs>
                      <linearGradient id="fillEmails" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-emails)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="var(--color-emails)" stopOpacity={0.05} />
                      </linearGradient>
                      <linearGradient id="fillOpens" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-opens)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="var(--color-opens)" stopOpacity={0.05} />
                      </linearGradient>
                      <linearGradient id="fillClicks" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-clicks)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="var(--color-clicks)" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      dataKey="date"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      minTickGap={32}
                      tick={{fontSize: 12}}
                      className="text-muted-foreground"
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      tick={{fontSize: 12}}
                      className="text-muted-foreground"
                      domain={[0, 'auto']}
                    />
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          className="w-[180px]"
                          labelFormatter={(value: any) => {
                            return value;
                          }}
                        />
                      }
                    />
                    <Area
                      dataKey="emails"
                      type="monotone"
                      fill="url(#fillEmails)"
                      stroke="var(--color-emails)"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{
                        r: 4,
                        fill: 'var(--color-emails)',
                        stroke: 'white',
                        strokeWidth: 2,
                      }}
                    />
                    <Area
                      dataKey="opens"
                      type="monotone"
                      fill="url(#fillOpens)"
                      stroke="var(--color-opens)"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{
                        r: 4,
                        fill: 'var(--color-opens)',
                        stroke: 'white',
                        strokeWidth: 2,
                      }}
                    />
                    <Area
                      dataKey="clicks"
                      type="monotone"
                      fill="url(#fillClicks)"
                      stroke="var(--color-clicks)"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{
                        r: 4,
                        fill: 'var(--color-clicks)',
                        stroke: 'white',
                        strokeWidth: 2,
                      }}
                    />
                    <ChartLegend content={<ChartLegendContent />} verticalAlign="top" height={36} />
                  </AreaChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>

          {/* Engagement Rate Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Engagement rate trends</CardTitle>
              <CardDescription>Open rate percentage over time</CardDescription>
            </CardHeader>
            <CardContent>
              {!hasData ? (
                <div className="flex h-[300px] w-full items-center justify-center">
                  <EmptyState
                    className="py-0"
                    icon={Eye}
                    title="No engagement data"
                    description="Engagement metrics will appear once emails are opened."
                  />
                </div>
              ) : (
                <ChartContainer config={engagementChartConfig} className="h-[300px] w-full">
                  <LineChart data={chartData} margin={{top: 20, right: 30, left: 0, bottom: 0}}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      dataKey="date"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      minTickGap={32}
                      tick={{fontSize: 12}}
                      className="text-muted-foreground"
                    />
                    <YAxis
                      domain={[0, 100]}
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      tick={{fontSize: 12}}
                      tickFormatter={value => `${value}%`}
                      className="text-muted-foreground"
                    />
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          className="w-[150px]"
                          labelFormatter={(value: any) => value}
                          formatter={(value: any) => [`${value}%`, 'Open rate']}
                        />
                      }
                      cursor={{
                        stroke: 'hsl(var(--border))',
                        strokeWidth: 1,
                        strokeDasharray: '3 3',
                      }}
                    />
                    <Line
                      dataKey="openRate"
                      type="monotone"
                      stroke="var(--color-openRate)"
                      strokeWidth={2.5}
                      dot={{
                        fill: 'var(--color-openRate)',
                        stroke: 'white',
                        strokeWidth: 2,
                        r: 4,
                      }}
                      activeDot={{
                        r: 6,
                        fill: 'var(--color-openRate)',
                        stroke: 'white',
                        strokeWidth: 2,
                      }}
                    />
                  </LineChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>

          {/* Events. The former "Performance Insights" card was removed: it dispensed generic
              advice ("above industry average", "add more compelling calls-to-action") that the
              charts above already answer with real numbers. */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Events</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold text-neutral-900">{stats?.totalEvents?.toLocaleString() || '0'}</p>
                    <p className="text-sm text-neutral-500">triggered in the last {days} days</p>
                  </div>
                  <div className="h-12 w-12 rounded-lg bg-neutral-100 flex items-center justify-center">
                    <Zap className="h-6 w-6 text-neutral-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Workflow runs</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold text-neutral-900">
                      {stats?.totalWorkflowsStarted?.toLocaleString() || '0'}
                    </p>
                    <p className="text-sm text-neutral-500">started in the last {days} days</p>
                  </div>
                  <div className="h-12 w-12 rounded-lg bg-neutral-100 flex items-center justify-center">
                    <BarChart3 className="h-6 w-6 text-neutral-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Campaign Performance */}
          {topCampaigns && topCampaigns.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Campaign performance</CardTitle>
                <CardDescription>Top performing campaigns in the last {days} days</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Campaign</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Sent</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Opened</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Clicked</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Open rate</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Click rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topCampaigns.map((campaign, idx) => (
                        <tr key={campaign.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div className="flex items-center justify-center w-6 h-6 rounded bg-neutral-100 text-neutral-600 font-semibold text-xs">
                                {idx + 1}
                              </div>
                              <span className="text-sm font-medium text-neutral-900">{campaign.subject}</span>
                            </div>
                          </td>
                          <td className="text-right py-3 px-4 text-sm text-neutral-600">
                            {campaign.sentCount.toLocaleString()}
                          </td>
                          <td className="text-right py-3 px-4 text-sm text-neutral-600">
                            {campaign.openedCount.toLocaleString()}
                          </td>
                          <td className="text-right py-3 px-4 text-sm text-neutral-600">
                            {campaign.clickedCount.toLocaleString()}
                          </td>
                          <td className="text-right py-3 px-4">
                            <span
                              className={`text-sm font-medium ${
                                campaign.openRate > 30 ? 'text-green-700' : 'text-neutral-700'
                              }`}
                            >
                              {campaign.openRate.toFixed(1)}%
                            </span>
                          </td>
                          <td className="text-right py-3 px-4">
                            <span
                              className={`text-sm font-medium ${
                                campaign.clickRate > 5 ? 'text-green-700' : 'text-neutral-700'
                              }`}
                            >
                              {campaign.clickRate.toFixed(1)}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Top Events */}
          {topEvents && topEvents.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Top events</CardTitle>
                <CardDescription>Most frequently triggered events in the last {days} days</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {topEvents.map((event, index) => (
                    <div key={event.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-neutral-100 text-neutral-600 font-semibold text-sm">
                          {index + 1}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-neutral-900">{event.name}</p>
                          <p className="text-xs text-muted-foreground">{event.count.toLocaleString()} occurrences</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div
                          className={`text-xs font-medium px-2 py-1 rounded-full ${
                            event.trend > 0
                              ? 'bg-green-100 text-green-700'
                              : event.trend < 0
                                ? 'bg-red-100 text-red-700'
                                : 'bg-neutral-100 text-neutral-700'
                          }`}
                        >
                          {event.trend > 0 ? '+' : ''}
                          {event.trend}%
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DashboardLayout>
    </>
  );
}
