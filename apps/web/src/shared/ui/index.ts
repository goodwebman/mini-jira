// Публичный API сегмента shared/ui.
// Именованные иконки отдельно: import { Link } from '@/shared/ui/icons'. Здесь их нет,
// чтобы `Link` или `User` из кита не конфликтовали с роутером и доменными типами.
export { UIIcons, createIcon } from './icons';
export type { IUIIconProps, UIIconComponent, UIIconName } from './icons';

// Кнопки и ссылки
export * from './UIButton';
export * from './UIIconButton';
export * from './UILink';

// Формы
export * from './UICheckbox';
export * from './UIChip';
export * from './UIField';
export * from './UIInput';
export * from './UILabel';
export * from './UIOptionCard';
export * from './UISearchInput';
export * from './UISegmented';
export * from './UISelect';
export * from './UISwitch';
export * from './UITextarea';

// Данные
export * from './UIAvatar';
export * from './UIBadge';
export * from './UICard';
export * from './UICharts';
export * from './UIEmptyState';
export * from './UIIconTile';
export * from './UIListItem';
export * from './UIPriority';
export * from './UIProgress';
export * from './UISeparator';
export * from './UISkeleton';
export * from './UISpinner';
export * from './UIStat';
export * from './UIStatusBadge';
export * from './UITable';

// Обратная связь и оверлеи
export * from './UIAlert';
export * from './UIDialog';
export * from './UIDrawer';
export * from './UIPopover';
export * from './UIToast';
export * from './UITooltip';

// Каркас и навигация
export * from './UIBottomNav';
export * from './UIBrand';
export * from './UIKanbanColumn';
export * from './UIPageHeader';
export * from './UISideNav';
export * from './UITabBar';
export * from './UITaskCard';
