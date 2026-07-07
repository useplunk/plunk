import {cn} from '../shared/cn';
import { GlowBg } from '../shared/glow-bg';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '../shared/accordion';

export interface FaqItem {
  question: string;
  answer: string | React.ReactNode;
}

/**
 * A component meant to be used in the landing page.
 * It displays a collapsible list of frequently asked questions and their answers.
 */
export const LandingFaqCollapsibleSection = ({
  className,
  id,
  title,
  titleComponent,
  description,
  descriptionComponent,
  faqItems,
  withBackground = false,
  withBackgroundGlow = false,
  variant = 'primary',
  backgroundGlowVariant = 'primary',
}: {
  className?: string;
  id?: string;
  title?: string | React.ReactNode;
  titleComponent?: React.ReactNode;
  description?: string | React.ReactNode;
  descriptionComponent?: React.ReactNode;
  faqItems: FaqItem[];
  withBackground?: boolean;
  withBackgroundGlow?: boolean;
  variant?: 'primary' | 'secondary';
  backgroundGlowVariant?: 'primary' | 'secondary';
}) => {
  return (
    <section
      id={id}
      className={cn(
        'relative w-full flex justify-center items-center gap-8 py-12 lg:py-16 flex-col',
        withBackground && variant === 'primary'
          ? 'bg-primary-100/20 dark:bg-primary-900/10'
          : '',
        withBackground && variant === 'secondary'
          ? 'bg-secondary-100/20 dark:bg-secondary-900/10'
          : '',
        withBackgroundGlow ? 'relative overflow-hidden' : '',
        className,
      )}
    >
      {withBackgroundGlow ? (
        <div className="hidden lg:flex justify-center w-full h-full absolute -bottom-1/2 pointer-events-none">
          <GlowBg
            className={cn('w-full lg:w-2/3 h-auto z-0')}
            variant={backgroundGlowVariant}
          />
        </div>
      ) : null}

      <div className={cn(className, 'w-full p-6 container-narrow')}>
        {titleComponent || (title && (
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-semibold leading-tight max-w-xs sm:max-w-none fancyHeading">
            {title}
          </h2>
        ))}

        {descriptionComponent || (description && (
          <p className="mt-6 md:text-xl">{description}</p>
        ))}

        <Accordion
          type="single"
          collapsible
          className="w-full mt-12 relative z-10"
        >
          {faqItems.map((faqItem, index) => (
            <AccordionItem
              key={index}
              value={`item-${index}`}
              className={cn(
                withBackground && variant === 'primary'
                  ? 'border-primary-500/10'
                  : '',
                withBackground && variant === 'secondary'
                  ? 'border-secondary-500/10'
                  : '',
              )}
            >
              <AccordionTrigger className="text-left">
                {faqItem.question}
              </AccordionTrigger>
              <AccordionContent>{faqItem.answer}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
};
