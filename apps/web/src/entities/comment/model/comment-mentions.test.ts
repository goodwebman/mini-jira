import { describe, expect, it } from 'vitest';

import {
  commentMentionQuery,
  editCommentMentions,
  prepareCommentText,
} from './comment-mentions';

const mention = {
  userId: '00000000-0000-4000-8000-000000000001',
  start: 0,
  end: 5,
};

describe('comment mention editing', () => {
  it('opens @ completion at the caret, excluding emails and normal text', () => {
    expect(commentMentionQuery('Текст @Ан хвост', 9)).toEqual({
      start: 6,
      end: 9,
      query: 'Ан',
    });
    expect(commentMentionQuery('@', 1)).toEqual({
      start: 0,
      end: 1,
      query: '',
    });
    expect(commentMentionQuery('a@example.com', 13)).toBeNull();
    expect(commentMentionQuery('Текст', 5)).toBeNull();
  });
  it('preserves tags after edits outside, shifts offsets and removes edited tags', () => {
    expect(editCommentMentions('@Анна', '@Анна привет', [mention])).toEqual([
      mention,
    ]);
    expect(editCommentMentions('@Анна', 'Привет @Анна', [mention])).toEqual([
      { ...mention, start: 7, end: 12 },
    ]);
    expect(editCommentMentions('@Анна', '@Ан', [mention])).toEqual([]);
    expect(editCommentMentions('@Анна', '@Анна2', [mention])).toEqual([
      mention,
    ]);
    expect(editCommentMentions('@Анна', '@Аня', [mention])).toEqual([]);
    expect(editCommentMentions('@Анна', '', [mention])).toEqual([]);
  });
  it('normalizes whitespace and offsets before submitting', () => {
    expect(
      prepareCommentText('  @Анна  ', [{ ...mention, start: 2, end: 7 }]),
    ).toEqual({ text: '@Анна', mentions: [mention] });
    expect(prepareCommentText(' text ', [])).toEqual({ text: 'text' });
  });
});
