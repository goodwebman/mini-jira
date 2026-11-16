import { type BoardTaskEvent, boardTaskEventSchema } from '@gwmt/contracts';

import { subscribeEvents } from '@/shared/api';

export function subscribeBoardTaskEvents(
  boardId: number,
  onEvent: (event: BoardTaskEvent) => void,
  onForbidden: () => void,
): () => void {
  return subscribeEvents(
    `/boards/${boardId}/tasks/events`,
    (data) => {
      const event = boardTaskEventSchema.parse(JSON.parse(data));
      if (
        event.type === 'tasks.changed' &&
        event.items.some((card) => card.boardId !== boardId)
      )
        throw new Error('Unexpected board in task event');
      onEvent(event);
    },
    onForbidden,
  );
}
