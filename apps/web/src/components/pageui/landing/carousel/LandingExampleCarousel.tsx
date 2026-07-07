import {FacebookIcon, InstagramIcon, LinkedinIcon, type LucideIcon} from 'lucide-react';

import {PageUiButton} from '../../shared/button';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '../../shared/carousel';
import {cn} from '../../shared/cn';
import {PageUiImage as Image} from '../../shared/Image';

export type ExampleCarouselSocial = 'instagram' | 'facebook' | 'linkedin';

export interface ExampleCarouselItem {
  imageSrc: string;
  name: string;
  location: string;
  socials: ExampleCarouselSocial[];
}

const SOCIAL_ICONS: Record<ExampleCarouselSocial, LucideIcon> = {
  instagram: InstagramIcon,
  facebook: FacebookIcon,
  linkedin: LinkedinIcon,
};

export interface LandingExampleCarouselProps {
  className?: string;
  title?: string;
  titleComponent?: React.ReactNode;
  description?: string;
  descriptionComponent?: React.ReactNode;
  items: ExampleCarouselItem[];
  showHeaderCta?: boolean;
  headerCtaLabel?: string;
  headerCtaHref?: string;
  showSocialProof?: boolean;
  socialProofComponent?: React.ReactNode;
  showCtaCard?: boolean;
  ctaLabel?: string;
  ctaHref?: string;
  ctaNote?: string;
  ctaNoteSecondary?: string;
}

export function LandingExampleCarousel({
  className,
  title,
  titleComponent,
  description,
  descriptionComponent,
  items,
  showHeaderCta = false,
  headerCtaLabel = 'Start free today',
  headerCtaHref = '#',
  showSocialProof = false,
  socialProofComponent,
  showCtaCard = true,
  ctaLabel = 'Try Gnomie for free',
  ctaHref = '#',
  ctaNote = 'No credit card required',
  ctaNoteSecondary,
}: LandingExampleCarouselProps) {
  return (
    <section className={cn('w-full max-w-full overflow-hidden', className)}>
      <div className="flex flex-col items-center p-4 mt-12">
        {titleComponent ||
          (title ? (
            <h2 className="text-5xl font-semibold leading-tight text-center">{title}</h2>
          ) : null)}

        {descriptionComponent ||
          (description ? (
            <p className="mt-4 md:text-xl max-w-3xl text-center">{description}</p>
          ) : null)}

        {showHeaderCta ? (
          <div className="w-full mt-6 flex justify-center gap-4">
            <PageUiButton size="xl" variant="secondary" asChild>
              <a href={headerCtaHref}>{headerCtaLabel}</a>
            </PageUiButton>
          </div>
        ) : null}

        {showSocialProof && socialProofComponent ? (
          <div className="w-full mt-6 flex justify-center">{socialProofComponent}</div>
        ) : null}
      </div>

      <Carousel className="w-full max-w-full py-12" opts={{dragFree: true, dragThreshold: 0.5}}>
        <CarouselContent>
          {items.map((item, index) => (
            <CarouselItem
              key={`${item.name}-${index}`}
              className="md:basis-1/2 lg:basis-1/3 2xl:basis-1/5 3xl:basis-1/6"
            >
              <div className="w-full flex flex-col">
                <Image
                  src={item.imageSrc}
                  alt={item.name}
                  width={500}
                  height={500}
                  className="w-full h-auto object-cover rounded-xl"
                />

                <div className="p-4 flex gap-4 justify-between items-center">
                  <div>
                    <h3 className="text-xl font-semibold">{item.name}</h3>
                    <p className="text-sm opacity-50">{item.location}</p>
                  </div>

                  <div className="flex gap-2">
                    {item.socials.map(social => {
                      const SocialIcon = SOCIAL_ICONS[social];
                      return (
                        <div
                          key={social}
                          className="bg-neutral-100 dark:bg-neutral-900 rounded-full w-10 h-10 p-2"
                        >
                          <SocialIcon size={24} />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </CarouselItem>
          ))}

          {showCtaCard ? (
            <CarouselItem className="md:basis-1/2 lg:basis-1/3">
              <div className="w-full h-full flex flex-col gap-2 items-center justify-center bg-secondary-500/5 rounded-xl min-h-[300px]">
                <PageUiButton size="xl" className="p-7 text-xl" variant="secondary" asChild>
                  <a href={ctaHref}>{ctaLabel}</a>
                </PageUiButton>

                <p className="text-sm opacity-50">{ctaNote}</p>
                {ctaNoteSecondary ? <p className="text-sm opacity-50">{ctaNoteSecondary}</p> : null}
              </div>
            </CarouselItem>
          ) : null}
        </CarouselContent>
        <CarouselPrevious className="absolute left-4" />
        <CarouselNext className="absolute right-4" />
      </Carousel>
    </section>
  );
}
