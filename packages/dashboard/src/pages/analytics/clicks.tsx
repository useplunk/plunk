import {useActiveProject} from '../../lib/hooks/projects';
import {useAnalytics} from '../../lib/hooks/analytics';
import {AnalyticsTabs, Card, FullscreenLoader} from '../../components';
import React from 'react';
import {Dashboard} from '../../layouts';
import {Ring} from '@uiball/loaders';
import {Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis} from 'recharts';
import {valueFormatter} from './index';

/**
 *
 */
export default function Index() {
  const project = useActiveProject();
  const {data: analytics} = useAnalytics();

  if (!project) {
    return <FullscreenLoader />;
  }

  return (
    <>
      <Dashboard>
        <AnalyticsTabs />

        <div className={'grid grid-cols-2 gap-6'}>
          <Card title={'Clicks'} description={'Last 7 days'} className={'sm:col-span-2'}>
            {analytics ? (
              <>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    height={300}
                    data={analytics.clicks.actions}
                    margin={{
                      top: 20,
                      right: 0,
                      left: 0,
                      bottom: 0,
                    }}
                  >
                    <CartesianGrid strokeDasharray="4 5" />

                    <YAxis axisLine={false} fill={'#fff'} tick={<></>} tickSize={0} width={5} />

                    <XAxis
                      tickSize={0}
                      stroke={'#fff'}
                      interval={0}
                      dataKey="link"
                      tick={({x, y, payload}) => {
                        return (
                          <g transform={`translate(${x},${y})`}>
                            <text x={0} y={0} dy={16} fill={'#666'} textAnchor={'middle'} className="text-xs">
                              {payload.value.length > 5 ? `${payload.value.substring(0, 20)}...` : payload.value}
                            </text>
                          </g>
                        );
                      }}
                    />

                    <Tooltip
                      // Ease in out animation
                      cursor={{fill: '#f5f5f5', opacity: '0.5'}}
                      content={({active, payload, label}) => {
                        if (active && payload?.length) {
                          const dataPoint = payload[0];
                          return (
                            <div className="rounded border border-neutral-100 bg-white px-5 py-3 shadow-sm">
                              <p className="font-medium text-neutral-800">{`${label}`}</p>
                              <p className="text-neutral-600">{valueFormatter(dataPoint.value as number)}</p>
                            </div>
                          );
                        }

                        return null;
                      }}
                    />

                    <Bar dataKey="count" stackId="a" fill={'#3b82f6'} />
                  </BarChart>
                </ResponsiveContainer>
              </>
            ) : (
              <>
                <div className={'flex h-[300px] items-center justify-center'}>
                  <Ring size={32} color={'#a3a3a3'} />
                </div>
              </>
            )}
          </Card>
        </div>
      </Dashboard>
    </>
  );
}
