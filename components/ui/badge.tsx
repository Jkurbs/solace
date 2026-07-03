import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const badgeVariants = cva(
  // Chip register from the public site: mono, uppercase, wide-tracked.
  'inline-flex items-center rounded-full border px-2.5 py-1 font-mono text-[0.62rem] font-medium uppercase tracking-[0.14em] transition-colors',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-neutral-950 text-white dark:bg-neutral-100 dark:text-neutral-950',
        secondary: 'border-neutral-200 bg-neutral-100 text-neutral-700 dark:border-white/15 dark:bg-white/5 dark:text-neutral-300',
        success: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-[#5f8f6f]/50 dark:bg-[#5f8f6f]/10 dark:text-[#8db89d]',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
