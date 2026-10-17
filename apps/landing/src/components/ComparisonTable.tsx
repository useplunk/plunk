import {Check, Minus} from 'lucide-react';
import React from 'react';

export interface ComparisonRow {
  feature: string;
  plunk: boolean | string;
  competitor: boolean | string;
}

interface ComparisonTableProps {
  competitorName: string;
  rows: ComparisonRow[];
  /** The highlighted column's heading. Feature pages compare two Plunk options. */
  plunkLabel?: string;
}

/**
 * Feature by feature, as a plain table.
 *
 * Both value columns have the same fixed width and centre their contents, so
 * a tick and a phrase like "1,000 emails/month" sit on one axis down the
 * column, and every cell is vertically centred so icons and text share a
 * line. The Plunk column is marked by a pale band running its full height
 * rather than by a black header cell; a missing feature is a quiet dash.
 */
export function ComparisonTable({competitorName, rows, plunkLabel = 'Plunk'}: ComparisonTableProps) {
  const cell = (value: boolean | string, strong: boolean) => {
    if (typeof value !== 'boolean') {
      return <span className={strong ? 'font-semibold text-neutral-900' : 'text-neutral-600'}>{value}</span>;
    }
    return value ? (
      <Check aria-label={'Yes'} className={'mx-auto h-5 w-5 text-neutral-900'} strokeWidth={2} />
    ) : (
      <Minus aria-label={'No'} className={'mx-auto h-5 w-5 text-neutral-300'} strokeWidth={2} />
    );
  };

  return (
    <div className={'overflow-x-auto'}>
      <table className={'w-full min-w-[34rem] table-fixed border-separate border-spacing-0 text-ui'}>
        <colgroup>
          <col className={'w-2/5'} />
          <col />
          <col />
        </colgroup>
        <thead>
          <tr>
            <th scope={'col'} className={'pb-4 pr-4 pt-5 text-left'}>
              <span className={'sr-only'}>Feature</span>
            </th>
            <th
              scope={'col'}
              className={'rounded-t-card bg-tile px-4 pb-4 pt-5 text-center font-semibold text-neutral-900'}
            >
              {plunkLabel}
            </th>
            <th scope={'col'} className={'px-4 pb-4 pt-5 text-center font-semibold text-neutral-500'}>
              {competitorName}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const last = i === rows.length - 1;
            return (
              <tr key={row.feature}>
                <th
                  scope={'row'}
                  className={
                    'border-t border-neutral-200 py-4 pr-4 text-left align-middle font-normal text-neutral-700'
                  }
                >
                  {row.feature}
                </th>
                <td
                  className={`border-t border-neutral-200 bg-tile px-4 py-4 text-center align-middle ${last ? 'rounded-b-card' : ''}`}
                >
                  {cell(row.plunk, true)}
                </td>
                <td className={'border-t border-neutral-200 px-4 py-4 text-center align-middle'}>
                  {cell(row.competitor, false)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
