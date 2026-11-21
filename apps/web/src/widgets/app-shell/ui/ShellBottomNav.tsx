import { Link } from 'react-router';

import { UIBottomNav } from '@/shared/ui';

import { useShellSection } from '../model/use-shell-navigation';
import { SECTIONS } from './shell-sections';

/** Нижнее меню телефона на ширинах меньше 640 px. */
export function ShellBottomNav() {
  const section = useShellSection();
  return (
    <UIBottomNav aria-label='Основная навигация'>
      {SECTIONS.map(({ id, short, icon: Icon, to }) => (
        <UIBottomNav.Item
          key={id}
          active={section === id}
          icon={<Icon />}
          render={<Link to={to} />}
        >
          {short}
        </UIBottomNav.Item>
      ))}
    </UIBottomNav>
  );
}
