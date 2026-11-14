import { type HTMLAttributes } from 'react';

export type IUICardHeaderProps = HTMLAttributes<HTMLDivElement>;

export interface IUICardTitleProps extends HTMLAttributes<HTMLHeadingElement> {
  /** `sm` — заголовок виджета, `md` — заголовок блока формы. */
  readonly size?: 'md' | 'sm';
  /** Уровень заголовка в документе. */
  readonly as?: 'h2' | 'h3' | 'h4';
}

export type IUICardDescriptionProps = HTMLAttributes<HTMLParagraphElement>;

export type IUICardContentProps = HTMLAttributes<HTMLDivElement>;

export type IUICardFooterProps = HTMLAttributes<HTMLDivElement>;
