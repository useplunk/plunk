import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@plunk/ui';
import {DashboardLayout} from '../../components/DashboardLayout';
import {ActivityFeed} from '../../components/ActivityFeed';
import {Eye, MousePointerClick, Send, Zap} from 'lucide-react';
import {NextSeo} from 'next-seo';
import {useQueryState, parseAsString} from 'nuqs';
import useSWR from 'swr';

interface ActivityStats {
  totalEvents: number;
  totalEmailsSent: number;
  totalEmailsOpened: number;
  totalEmailsClicked: number;
  totalWorkflowsStarted: number;
  openRate: number;
  clickRate: number;
}

export default function ActivityPage() {
  const [typeFilter, setTypeFilter] = useQueryState('type', parseAsString.withDefault('ALL'));
  const [dateRange, setDateRange] = useQueryState('days', parseAsString.withDefault('30'));

  // Fetch activity stats
  const {data: stats} = useSWR<ActivityStats>(`/activity/stats`, {
    revalidateOnFocus: false,
  });

  const statsCards = [
    {
      name: 'Events triggered',
      value: stats?.totalEvents?.toLocaleString() || '0',
      icon: Zap,
      description: 'Last 30 days',
      color: 'text-neutral-600',
      bgColor: 'bg-neutral-100',
    },
    {
      name: 'Emails sent',
      value: stats?.totalEmailsSent?.toLocaleString() || '0',
      icon: Send,
      description: 'Last 30 days',
      color: 'text-neutral-600',
      bgColor: 'bg-neutral-100',
    },
    {
      name: 'Open rate',
      value: stats?.openRate ? `${stats.openRate.toFixed(1)}%` : '0%',
      icon: Eye,
      description: `${stats?.totalEmailsOpened?.toLocaleString() || '0'} opens`,
      color: 'text-neutral-600',
      bgColor: 'bg-neutral-100',
    },
    {
      name: 'Click rate',
      value: stats?.clickRate ? `${stats.clickRate.toFixed(1)}%` : '0%',
      icon: MousePointerClick,
      description: `${stats?.totalEmailsClicked?.toLocaleString() || '0'} clicks`,
      color: 'text-neutral-600',
      bgColor: 'bg-neutral-100',
    },
  ];

  return (
    <>
      <NextSeo title="Activity" />
      <DashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-neutral-900">Activity</h1>
            <p className="text-neutral-500 mt-2 text-sm sm:text-base">
              Events, emails, and workflow runs as they happen.
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
                    <CardTitle className="text-2xl">{stat.value}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-neutral-500">{stat.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Activity Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All activity types</SelectItem>
                      <SelectItem value="event.triggered">Events</SelectItem>
                      <SelectItem value="email.sent,email.delivered,email.received,email.opened,email.clicked,email.bounced,email.complaint">
                        Emails
                      </SelectItem>
                      <SelectItem value="email.sent">Emails sent</SelectItem>
                      <SelectItem value="email.delivered">Emails delivered</SelectItem>
                      <SelectItem value="email.received">Emails received</SelectItem>
                      <SelectItem value="email.opened">Emails opened</SelectItem>
                      <SelectItem value="email.clicked">Emails clicked</SelectItem>
                      <SelectItem value="email.bounced">Emails bounced</SelectItem>
                      <SelectItem value="email.complaint">Email complaints</SelectItem>
                      <SelectItem value="workflow.started,workflow.completed">Workflows</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1">
                  <Select value={dateRange} onValueChange={setDateRange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Last 30 days" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Last 24 hours</SelectItem>
                      <SelectItem value="7">Last 7 days</SelectItem>
                      <SelectItem value="30">Last 30 days</SelectItem>
                      <SelectItem value="90">Last 90 days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Activity Feed */}
          <Card>
            <CardHeader>
              <CardTitle>Recent activity</CardTitle>
            </CardHeader>
            <CardContent>
              <ActivityFeed
                typeFilter={typeFilter === 'ALL' ? undefined : typeFilter}
                dateRangeDays={parseInt(dateRange)}
              />
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </>
  );
}
