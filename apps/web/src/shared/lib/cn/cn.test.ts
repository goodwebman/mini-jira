import { describe, expect, it } from 'vitest';
import css from '@/shared/styles/theme.css?raw';
import { cn, THEME_TOKENS } from './cn';

describe('cn', () => {
  it('склеивает условные классы', () => {
    expect(cn('a', false, null, undefined, ['b', { c: true, d: false }])).toBe('a b c');
  });

  it('не путает размер шрифта с цветом', () => {
    expect(cn('text-body', 'text-muted-foreground')).toBe('text-body text-muted-foreground');
    expect(cn('text-caption text-destructive', 'text-primary')).toBe('text-caption text-primary');
    expect(cn('text-field', 'text-input')).toBe('text-field text-input');
  });

  it('схлопывает кастомные размеры шрифта между собой', () => {
    expect(cn('text-body', 'text-caption')).toBe('text-caption');
  });

  it('схлопывает именованные размеры с числовыми', () => {
    expect(cn('h-control', 'h-8')).toBe('h-8');
    expect(cn('size-icon', 'size-[18px]')).toBe('size-[18px]');
    expect(cn('p-page', 'p-2')).toBe('p-2');
    expect(cn('gap-section', 'gap-1')).toBe('gap-1');
    expect(cn('w-sidebar', 'w-full')).toBe('w-full');
  });

  it('схлопывает скругления, тени, трекинг и анимации из токенов', () => {
    expect(cn('rounded-control', 'rounded-full')).toBe('rounded-full');
    expect(cn('rounded-card', 'rounded-modal')).toBe('rounded-modal');
    expect(cn('shadow-popover', 'shadow-modal')).toBe('shadow-modal');
    expect(cn('tracking-title', 'tracking-display')).toBe('tracking-display');
    expect(cn('animate-fade-in', 'animate-toast-in')).toBe('animate-toast-in');
  });

  it('схлопывает кастомные утилиты скроллбара', () => {
    expect(cn('scrollbar-thin', 'scrollbar-none')).toBe('scrollbar-none');
  });
});

describe('THEME_TOKENS', () => {
  it('spacing-токены не совпадают со значениями статических утилит', () => {
    // --spacing-block добавил бы каждому `inline-block` ещё и inline-size
    const reserved = ['block', 'flex', 'grid', 'table', 'contents', 'hidden'];
    expect(THEME_TOKENS.spacing.filter((name) => reserved.includes(name))).toEqual([]);
  });

  const tokensOf = (namespace: string): string[] => {
    const pattern = new RegExp(`^\\s*--${namespace}-([a-z][a-z0-9-]*):`, 'gm');
    return [...css.matchAll(pattern)]
      .map((match) => match[1])
      .filter((name) => !name.endsWith('--line-height') && !name.includes('--'));
  };

  it.each([
    ['text', THEME_TOKENS.text],
    ['spacing', THEME_TOKENS.spacing],
    ['radius', THEME_TOKENS.radius],
    ['shadow', THEME_TOKENS.shadow],
    ['tracking', THEME_TOKENS.tracking],
    ['animate', THEME_TOKENS.animate],
  ])('список %s совпадает с theme.css', (namespace, listed) => {
    expect([...listed].sort()).toEqual(tokensOf(namespace).sort());
  });
});
