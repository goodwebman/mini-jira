import { Link } from 'react-router';

import { UITabBar } from '@/shared/ui';

import { useShellSection } from '../model/use-shell-navigation';
import { SECTIONS } from './shell-sections';

/** Вкладки разделов под шапкой от 640 до 960 px. */
export function ShellTabBar() {
  const section = useShellSection();
  return (
    <UITabBar aria-label='Основная навигация'>
      {SECTIONS.map((item) => (
        <UITabBar.Item
          key={item.id}
          active={section === item.id}
          render={<Link to={item.to} />}
        >
          {item.label}
        </UITabBar.Item>
      ))}
    </UITabBar>
  );
}
