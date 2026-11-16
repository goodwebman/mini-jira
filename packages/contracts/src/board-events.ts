import { z } from 'zod';

import { taskCardSchema } from './dto.js';

export const boardTaskEventSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('ready') }),
  z.object({
    type: z.literal('tasks.changed'),
    items: z.array(taskCardSchema),
    serverTime: z.iso.datetime(),
  }),
]);

export type BoardTaskEvent = z.infer<typeof boardTaskEventSchema>;
