import { type ClassValue, clsx } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

/**
 * Имена кастомных токенов из `styles/theme.css`.
 *
 * Без этого списка tailwind-merge не знает, что `text-body` — размер шрифта, считает
 * его цветом и в `cn('text-body', 'text-muted-foreground')` молча выкидывает размер.
 * А `h-control` вообще не распознаёт, и `cn('h-control', 'h-8')` оставляет оба класса.
 * `cn.test.ts` падает, если список разошёлся с CSS.
 */
export const THEME_TOKENS = {
  text: [
    'micro',
    'caption',
    'small',
    'body',
    'lead',
    'title',
    'heading',
    'display',
    'metric',
    'hero',
    'field',
  ],
  spacing: [
    'control-sm',
    'control',
    'control-lg',
    'chip',
    'icon-button',
    'icon-sm',
    'icon',
    'icon-lg',
    'avatar-xs',
    'avatar-sm',
    'avatar-md',
    'avatar-lg',
    'avatar-xl',
    'donut',
    'table-row',
    'textarea-min',
    'textarea-max',
    'tile',
    'header',
    'page',
    'section',
    'sidebar',
  ],
  radius: ['tag', 'control', 'card', 'block', 'modal'],
  shadow: ['popover', 'toast', 'modal', 'drawer'],
  tracking: ['title', 'display'],
  animate: ['fade-in', 'dialog-in', 'toast-in', 'shimmer'],
};

const merge = extendTailwindMerge<'scrollbar'>({
  extend: {
    theme: THEME_TOKENS,
    classGroups: {
      scrollbar: ['scrollbar-thin', 'scrollbar-none'],
    },
  },
});

/** Склеивает классы (clsx) и схлопывает конфликтующие Tailwind-утилиты (tailwind-merge). */
export const cn = (...inputs: ClassValue[]): string => merge(clsx(inputs));
