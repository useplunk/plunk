import {Check, X} from 'lucide-react';
import {motion} from 'framer-motion';
import React from 'react';

export interface ComparisonRow {
  feature: string;
  plunk: boolean | string;
  competitor: boolean | string;
}

interface ComparisonTableProps {
  competitorName: string;
  rows: ComparisonRow[];
}

export function ComparisonTable({competitorName, rows}: ComparisonTableProps) {
  return (
    <div className={'overflow-hidden rounded-card border border-neutral-200'}>
      <div className={'grid grid-cols-3 gap-px bg-neutral-200'}>
        <div className={'bg-neutral-50 p-6'}>
          <span style={{fontFamily: 'var(--font-mono)'}} className={'text-label text-neutral-500'}>Feature</span>
        </div>
        <div className={'bg-neutral-900 p-6 text-center'}>
          <span style={{fontFamily: 'var(--font-mono)'}} className={'text-label text-white'}>Plunk</span>
        </div>
        <div className={'bg-neutral-50 p-6 text-center'}>
          <span style={{fontFamily: 'var(--font-mono)'}} className={'text-label text-neutral-500'}>{competitorName}</span>
        </div>
      </div>

      <div className={'grid gap-px bg-neutral-200'}>
        {rows.map((row, index) => (
          <motion.div
            key={row.feature}
            initial={{opacity: 0, y: 10}}
            whileInView={{opacity: 1, y: 0}}
            viewport={{once: true}}
            transition={{duration: 0.4, delay: index * 0.04, ease: [0.22, 1, 0.36, 1]}}
            className={'grid grid-cols-3 gap-px bg-neutral-200'}
          >
            <div className={'bg-white p-6'}>
              <span className={'text-ui text-neutral-700'}>{row.feature}</span>
            </div>
            <div className={'bg-neutral-50/70 p-6'}>
              <div className={'flex justify-center'}>
                {typeof row.plunk === 'boolean' ? (
                  row.plunk ? (
                    <Check className="h-5 w-5 text-neutral-900" strokeWidth={2} />
                  ) : (
                    <X className="h-5 w-5 text-neutral-300" strokeWidth={2} />
                  )
                ) : (
                  <span className={'text-ui font-medium text-neutral-900'}>{row.plunk}</span>
                )}
              </div>
            </div>
            <div className={'bg-white p-6'}>
              <div className={'flex justify-center'}>
                {typeof row.competitor === 'boolean' ? (
                  row.competitor ? (
                    <Check className="h-5 w-5 text-neutral-900" strokeWidth={2} />
                  ) : (
                    <X className="h-5 w-5 text-neutral-300" strokeWidth={2} />
                  )
                ) : (
                  <span className={'text-ui text-neutral-600'}>{row.competitor}</span>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
