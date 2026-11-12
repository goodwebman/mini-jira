import {
  UICardContent,
  UICardDescription,
  UICardFooter,
  UICardHeader,
  UICardTitle,
} from './UICardParts';
import { UICardRoot } from './UICardRoot';

export const UICard = Object.assign(UICardRoot, {
  Header: UICardHeader,
  Title: UICardTitle,
  Description: UICardDescription,
  Content: UICardContent,
  Footer: UICardFooter,
});

export type { IUICardProps } from './UICardRoot';
export type {
  IUICardContentProps,
  IUICardDescriptionProps,
  IUICardFooterProps,
  IUICardHeaderProps,
  IUICardTitleProps,
} from './UICardParts';
