'use client';

import {useState} from 'react';

import {PageUiButton} from '../../shared/button';
import {cn} from '../../shared/cn';

export interface PricingTierFrequency {
  id: string;
  value: string;
  label: string;
  priceSuffix: string;
}

export interface PricingTier {
  name: string;
  id: string;
  href: string;
  discountPrice: string | Record<string, string>;
  price: string | Record<string, string>;
  description: string;
  features: string[];
  featured?: boolean;
  highlighted?: boolean;
  cta: string;
  soldOut?: boolean;
}

const CheckIcon = ({className}: {className?: string}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    className={cn('w-6 h-6', className)}
    aria-hidden
  >
    <path
      fillRule="evenodd"
      d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z"
      clipRule="evenodd"
    />
  </svg>
);

export interface LandingPricingProps {
  className?: string;
  id?: string;
  title: string;
  description: string;
  bannerText?: string;
  frequencies: PricingTierFrequency[];
  tiers: PricingTier[];
  defaultFrequencyValue?: string;
}

export function LandingPricing({
  className,
  id,
  title,
  description,
  bannerText,
  frequencies,
  tiers,
  defaultFrequencyValue,
}: LandingPricingProps) {
  const initialFrequency =
    frequencies.find(f => f.value === defaultFrequencyValue) ?? frequencies[0] ?? {
      id: '1',
      value: '1',
      label: 'Monthly',
      priceSuffix: '/month',
    };
  const [frequency, setFrequency] = useState(initialFrequency);

  return (
    <section
      id={id}
      className={cn(
        'mt-24 flex flex-col w-full items-center border-b-4 border-primary-500/5',
        className,
      )}
    >
      <div className="w-full flex flex-col items-center">
        <div className="mx-auto max-w-7xl px-6 lg:px-8 flex flex-col items-center">
          <div className="w-full lg:w-auto mx-auto max-w-4xl lg:text-center">
            <h1 className="text-black dark:text-white text-4xl font-semibold max-w-xs sm:max-w-none leading-tight">
              {title}
            </h1>
            <p className="mt-6 text-gray-600 dark:text-gray-400 text-lg">{description}</p>
          </div>

          {bannerText ? (
            <div className="w-full lg:w-auto flex justify-center my-4">
              <p className="w-full px-4 py-3 text-xs bg-secondary-100 text-black dark:bg-secondary-300/30 dark:text-white/80 rounded-xl">
                {bannerText}
              </p>
            </div>
          ) : null}

          {frequencies.length > 1 ? (
            <div className="mt-16 flex justify-center">
              <div
                role="radiogroup"
                className="grid gap-x-1 rounded-full p-1 text-center text-xs font-semibold leading-5 bg-white dark:bg-black ring-1 ring-inset ring-gray-200/30 dark:ring-gray-800"
                style={{
                  gridTemplateColumns: `repeat(${frequencies.length}, minmax(0, 1fr))`,
                }}
              >
                <p className="sr-only">Payment frequency</p>
                {frequencies.map(option => (
                  <label
                    className={cn(
                      frequency.value === option.value
                        ? 'bg-secondary-500/90 text-white dark:bg-secondary-900/70 dark:text-white/70'
                        : 'bg-transparent text-gray-500 hover:bg-secondary-500/10',
                      'cursor-pointer rounded-full px-2.5 py-2 transition-all',
                    )}
                    key={option.value}
                    htmlFor={`gnomie-pricing-${option.value}`}
                  >
                    {option.label}

                    <button
                      type="button"
                      value={option.value}
                      id={`gnomie-pricing-${option.value}`}
                      className="hidden"
                      role="radio"
                      aria-checked={frequency.value === option.value}
                      onClick={() => {
                        const next =
                          frequencies.find(f => f.value === option.value) ?? frequency;
                        setFrequency(next);
                      }}
                    >
                      {option.label}
                    </button>
                  </label>
                ))}
              </div>
            </div>
          ) : (
            <div className="mt-12" aria-hidden />
          )}

          <div
            className={cn(
              'isolate mx-auto mt-4 mb-28 grid max-w-md grid-cols-1 gap-8 lg:mx-0 lg:max-w-none select-none',
              tiers.length === 2 ? 'lg:grid-cols-2' : '',
              tiers.length === 3 ? 'lg:grid-cols-3' : '',
            )}
          >
            {tiers.map(tier => (
              <div
                key={tier.id}
                className={cn(
                  tier.featured
                    ? '!bg-gray-900 ring-gray-900 dark:!bg-gray-100 dark:ring-gray-100'
                    : 'bg-white dark:bg-gray-900/80 ring-gray-300/70 dark:ring-gray-700',
                  'max-w-xs ring-1 rounded-3xl p-8 xl:p-10',
                  tier.highlighted ? 'fancy-glass-contrast' : '',
                )}
              >
                <h3
                  id={tier.id}
                  className={cn(
                    tier.featured ? 'text-white dark:text-black' : 'text-black dark:text-white',
                    'text-2xl font-bold tracking-tight',
                  )}
                >
                  {tier.name}
                </h3>
                <p
                  className={cn(
                    tier.featured ? 'text-gray-300 dark:text-gray-500' : 'text-gray-600 dark:text-gray-400',
                    'mt-4 text-sm leading-6',
                  )}
                >
                  {tier.description}
                </p>
                <p className="mt-6 flex items-baseline gap-x-1">
                  <span
                    className={cn(
                      tier.featured ? 'text-white dark:text-black' : 'text-black dark:text-white',
                      'text-4xl font-bold tracking-tight',
                      tier.discountPrice &&
                        typeof tier.discountPrice !== 'string' &&
                        tier.discountPrice[frequency.value]
                        ? 'line-through'
                        : '',
                    )}
                  >
                    {typeof tier.price === 'string' ? tier.price : tier.price[frequency.value]}
                  </span>

                  <span
                    className={cn(
                      tier.featured ? 'text-white dark:text-black' : 'text-black dark:text-white',
                    )}
                  >
                    {typeof tier.discountPrice === 'string'
                      ? tier.discountPrice
                      : tier.discountPrice[frequency.value]}
                  </span>

                  {typeof tier.price !== 'string' ? (
                    <span
                      className={cn(
                        tier.featured
                          ? 'text-gray-300 dark:text-gray-500'
                          : 'dark:text-gray-400 text-gray-600',
                        'text-sm font-semibold leading-6',
                      )}
                    >
                      {frequency.priceSuffix}
                    </span>
                  ) : null}
                </p>
                <a
                  href={tier.href}
                  aria-describedby={tier.id}
                  className={cn('flex mt-6 shadow-sm', tier.soldOut ? 'pointer-events-none' : '')}
                >
                  <PageUiButton
                    disabled={tier.soldOut}
                    className={cn(
                      'w-full h-12 rounded-md px-6 sm:px-10 text-md',
                      tier.featured || tier.soldOut ? 'grayscale' : '',
                      !tier.highlighted && !tier.featured
                        ? 'bg-gray-100 dark:bg-gray-600 border border-solid border-gray-300 dark:border-gray-800'
                        : 'bg-secondary-300/70 text-slate-foreground hover:bg-secondary-400/70 dark:bg-secondary-700 dark:hover:bg-secondary-800/90',
                      tier.featured ? '!bg-gray-100 dark:!bg-black' : '',
                    )}
                  >
                    {tier.soldOut ? 'Sold out' : tier.cta}
                  </PageUiButton>
                </a>

                <ul
                  className={cn(
                    tier.featured ? 'text-gray-300 dark:text-gray-500' : 'text-gray-700 dark:text-gray-400',
                    'mt-8 space-y-3 text-sm leading-6 xl:mt-10',
                  )}
                >
                  {tier.features.map(feature => (
                    <li key={feature} className="flex gap-x-3">
                      <CheckIcon
                        className={cn(
                          tier.featured ? 'text-white dark:text-black' : '',
                          tier.highlighted ? 'text-slate-500' : 'text-gray-500',
                          'h-6 w-5 flex-none',
                        )}
                      />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
