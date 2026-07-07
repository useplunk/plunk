import {Slot} from '@radix-ui/react-slot';
import {cva, type VariantProps} from 'class-variance-authority';
import * as React from 'react';

import {cn} from './cn';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default:
          'bg-primary-300/70 text-primary-foreground hover:bg-primary-300/90 dark:bg-primary-700 dark:hover:bg-primary-700/90',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
        outlinePrimary:
          'border border-primary-300 dark:border-primary-900 hover:bg-primary-100/50 dark:hover:bg-primary-900',
        outlineSecondary:
          'border border-secondary-300 dark:border-secondary-900 hover:bg-secondary-100/50 dark:hover:bg-secondary-900',
        primary:
          'bg-primary-300/70 text-primary-foreground hover:bg-primary-300/90 dark:bg-primary-700 dark:hover:bg-primary-700/90',
        secondary:
          'bg-secondary-300/70 text-secondary-foreground hover:bg-secondary-300/90 dark:bg-secondary-700 dark:hover:bg-secondary-700/90',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
        xl: 'h-12 rounded-md px-6 text-md',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface PageUiButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const PageUiButton = React.forwardRef<HTMLButtonElement, PageUiButtonProps>(
  ({className, variant, size, asChild = false, ...props}, ref) => {
    const Comp = asChild ? Slot : 'button';
    return <Comp className={cn(buttonVariants({variant, size, className}))} ref={ref} {...props} />;
  },
);
PageUiButton.displayName = 'PageUiButton';
