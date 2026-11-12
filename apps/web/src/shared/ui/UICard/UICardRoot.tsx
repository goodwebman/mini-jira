import { type HTMLAttributes, forwardRef, memo } from 'react';

import { type VariantProps, cva } from 'class-variance-authority';

import { cn } from '@/shared/lib/cn';

const cardVariants = cva(
  'flex min-w-0 flex-col gap-3 rounded-block border border-border bg-surface',
  {
    variants: {
      padding: {
        none: 'gap-0',
        sm: 'p-4',
        md: 'p-5',
        lg: 'p-6',
      },
    },
    defaultVariants: { padding: 'md' },
  },
);

export interface IUICardProps
  extends HTMLAttributes<HTMLDivElement>, VariantProps<typeof cardVariants> {
  readonly testId?: string;
  /** Семантический тег. */
  readonly as?: 'article' | 'aside' | 'div' | 'section';
}

/**
 * Блок-поверхность: виджеты KPI, панели задачи, профиль.
 *
 * @example
 * <UICard>
 *   <UICard.Header><UICard.Title>Статус спринта</UICard.Title></UICard.Header>
 *   <UICard.Content>…</UICard.Content>
 * </UICard>
 */
const UICardRootBase = forwardRef<HTMLDivElement, IUICardProps>(
  ({ className, testId, padding, as = 'section', ...props }, ref) => {
    // Для TS все теги равны: union тегов не сводится к одному типу ref
    const Tag = as as 'div';

    return (
      <Tag
        ref={ref}
        data-name={testId ? `UICard-${testId}` : 'UICard'}
        className={cn(cardVariants({ padding }), className)}
        {...props}
      />
    );
  },
);
UICardRootBase.displayName = 'UICard';
export const UICardRoot = memo(UICardRootBase);
