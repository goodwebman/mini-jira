import type { TaskTimeInterval } from '@gwmt/contracts';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { makeTaskDetail, users } from '@/shared/lib/testing';
import { UIToastProvider } from '@/shared/ui';

import { TaskSummaryCard } from './TaskSummaryCard';
import { TaskTimeHistoryCard } from './TaskTimeHistoryCard';

const start = '2026-11-16T06:00:00Z';
const interval: TaskTimeInterval = {
  id: 'i1',
  status: 'work',
  enteredAt: start,
  leftAt: '2026-11-16T08:00:00Z',
  pausedSec: 1800,
  changedBy: users.anna,
  pauses: [
    {
      id: 'p1',
      startedAt: '2026-11-16T06:30:00Z',
      endedAt: '2026-11-16T07:00:00Z',
    },
  ],
};

describe('Время задачи', () => {
  it('показывает суммарное время, паузы и хронологию в часовом поясе пользователя', () => {
    const task = makeTaskDetail({
      status: 'work',
      sp: 1,
      timeHistory: [
        interval,
        {
          ...interval,
          id: 'i2',
          enteredAt: '2026-11-16T09:00:00Z',
          leftAt: null,
          pausedSec: 0,
          pauses: [],
        },
      ],
    });
    const now = Date.parse('2026-11-16T10:00:00Z');
    task.timer = {
      ...task.timer,
      spentSec: 5400,
      statusEnteredAt: '2026-11-16T09:00:00Z',
    };
    const { container } = render(
      <TaskTimeHistoryCard task={task} now={now} timeZone='Asia/Omsk' />,
    );
    expect(screen.getByText('2 ч 30 мин')).toHaveClass('text-destructive');
    expect(screen.getByText('30 мин')).toBeInTheDocument();
    expect(screen.getByText('2 раза')).toBeInTheDocument();
    expect(
      screen.getByText(/Затраченное время превысило оценку 1 SP/),
    ).toBeInTheDocument();
    const rows = within(container.querySelector('ol')!).getAllByRole(
      'listitem',
      { hidden: true },
    );
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent(users.anna.name);
    expect(rows[0]).toHaveTextContent('16.11.2026, 12:00:00');
    expect(rows[0]).toHaveTextContent('16.11.2026, 12:30:00');
    expect(rows[1]).toHaveTextContent('сейчас');
  });

  it('ровно на оценке не подсвечивает SP; превышение учитывает все завершённые интервалы', () => {
    const task = makeTaskDetail({ status: 'done', sp: 1 });
    task.timer.spentSec = 3600;
    const { rerender } = render(<TaskSummaryCard task={task} now={0} />, {
      wrapper: UIToastProvider,
    });
    expect(screen.getByText('1 SP')).not.toHaveClass('text-destructive');
    rerender(
      <TaskSummaryCard
        task={{ ...task, timer: { ...task.timer, spentSec: 3601 } }}
        now={0}
      />,
    );
    expect(screen.getByText('1 SP')).toHaveClass('text-destructive');
  });
});
