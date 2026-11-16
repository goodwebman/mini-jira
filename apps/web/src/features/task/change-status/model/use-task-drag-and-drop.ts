import { type DragEvent, useState } from 'react';

import { TASK_STATUSES, type TaskStatus } from '@gwmt/contracts';

const DRAG_TYPE = 'text/plain';

interface DraggableTask {
  readonly key: string;
  readonly status: TaskStatus;
}

interface DragState {
  readonly taskKey: null | string;
  readonly overStatus: null | TaskStatus;
}

const IDLE: DragState = { taskKey: null, overStatus: null };

/**
 * Перетаскивание карточек между колонками (HTML5 Drag and Drop).
 *
 * Хук не знает про API: что можно бросить, решает `canDrop`, что делать — `onDrop`.
 * Колонка подсвечивается заранее: синим, если ход разрешён, красным — если нет.
 * На телефоне DnD нет: там статус меняют на странице задачи.
 */
export function useTaskDragAndDrop<T extends DraggableTask>({
  tasks,
  enabled,
  canDrop,
  onDrop,
}: {
  readonly tasks: readonly T[];
  readonly enabled: boolean;
  readonly canDrop: (task: T, to: TaskStatus) => boolean;
  readonly onDrop: (task: T, to: TaskStatus) => void;
}) {
  const [drag, setDrag] = useState<DragState>(IDLE);
  const dragged = drag.taskKey
    ? tasks.find((task) => task.key === drag.taskKey)
    : undefined;

  const cardProps = (task: T) =>
    enabled &&
    TASK_STATUSES.some(
      (status) => status !== task.status && canDrop(task, status),
    )
      ? {
          draggable: true,
          onDragStart: (event: DragEvent<HTMLElement>) => {
            event.dataTransfer.setData(DRAG_TYPE, task.key);
            event.dataTransfer.effectAllowed = 'move';
            setDrag({ taskKey: task.key, overStatus: null });
          },
          onDragEnd: () => setDrag(IDLE),
        }
      : { draggable: false };

  const columnProps = (status: TaskStatus) => {
    if (!enabled) return { dropState: null };
    let dropState: 'bad' | 'ok' | null = null;
    if (drag.overStatus === status && dragged !== undefined)
      dropState =
        dragged.status === status || canDrop(dragged, status) ? 'ok' : 'bad';
    return {
      dropState,
      onDragOver: (event: DragEvent<HTMLElement>) => {
        if (!drag.taskKey) return;
        event.preventDefault();
        if (drag.overStatus !== status)
          setDrag((current) => ({ ...current, overStatus: status }));
      },
      onDragLeave: (event: DragEvent<HTMLElement>) => {
        // Переход на дочерний элемент колонки — не уход с колонки
        if (event.currentTarget.contains(event.relatedTarget as Node | null))
          return;
        setDrag((current) =>
          current.overStatus === status
            ? { ...current, overStatus: null }
            : current,
        );
      },
      onDrop: (event: DragEvent<HTMLElement>) => {
        event.preventDefault();
        const key = event.dataTransfer.getData(DRAG_TYPE) || drag.taskKey;
        const task = tasks.find((item) => item.key === key);
        setDrag(IDLE);
        if (task && task.status !== status) onDrop(task, status);
      },
    };
  };

  return { draggingKey: drag.taskKey, cardProps, columnProps };
}
