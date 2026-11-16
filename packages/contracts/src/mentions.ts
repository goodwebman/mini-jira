import { z } from 'zod';

export const commentMentionSchema = z
  .object({
    userId: z.uuid(),
    start: z.number().int().min(0).max(10_000),
    end: z.number().int().min(1).max(10_000),
  })
  .meta({ id: 'CommentMention' });

export type CommentMention = z.infer<typeof commentMentionSchema>;
