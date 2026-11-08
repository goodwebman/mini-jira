// АВТОГЕНЕРАЦИЯ — не редактировать руками. Источник: src/shared/ui/icons/raw. Пересобрать: `npm run icons:build`.
import type { UIIconComponent } from './create-icon';
import { AlertTriangle } from './generated/alert-triangle';
import { ArrowDown } from './generated/arrow-down';
import { ArrowLeft } from './generated/arrow-left';
import { ArrowUp } from './generated/arrow-up';
import { Bell } from './generated/bell';
import { Board } from './generated/board';
import { Chart } from './generated/chart';
import { Check } from './generated/check';
import { ChevronDown } from './generated/chevron-down';
import { CircleAlert } from './generated/circle-alert';
import { CircleCheck } from './generated/circle-check';
import { Clock } from './generated/clock';
import { Copy } from './generated/copy';
import { Equal } from './generated/equal';
import { Eye } from './generated/eye';
import { Inbox } from './generated/inbox';
import { Link } from './generated/link';
import { Lock } from './generated/lock';
import { Logout } from './generated/logout';
import { Minus } from './generated/minus';
import { Pause } from './generated/pause';
import { Play } from './generated/play';
import { Plus } from './generated/plus';
import { Search } from './generated/search';
import { Spinner } from './generated/spinner';
import { Star } from './generated/star';
import { Tasks } from './generated/tasks';
import { User } from './generated/user';
import { Users } from './generated/users';
import { X } from './generated/x';

/**
 * Реестр иконок кита. Ключи совпадают с именами компонентов: `<UIIcons.ChevronDown />`.
 * Для tree-shaking бери именованный компонент: `import { ChevronDown } from '@/shared/ui/icons'`.
 */
export const UIIcons = {
  AlertTriangle,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Bell,
  Board,
  Chart,
  Check,
  ChevronDown,
  CircleAlert,
  CircleCheck,
  Clock,
  Copy,
  Equal,
  Eye,
  Inbox,
  Link,
  Lock,
  Logout,
  Minus,
  Pause,
  Play,
  Plus,
  Search,
  Spinner,
  Star,
  Tasks,
  User,
  Users,
  X,
} satisfies Record<string, UIIconComponent>;

export type UIIconName = keyof typeof UIIcons;
