import { useId, useLayoutEffect, useRef, useState } from 'react';

import type { BoardMember, CommentMention } from '@gwmt/contracts';

import { UIButton, UITextarea } from '@/shared/ui';

import {
  commentMentionQuery,
  editCommentMentions,
} from '../model/comment-mentions';

export function MentionTextarea({
  members,
  loading,
  failed,
  value,
  mentions,
  onChange,
  disabled,
}: {
  readonly members: readonly BoardMember[];
  readonly loading: boolean;
  readonly failed: boolean;
  readonly value: string;
  readonly mentions: CommentMention[];
  readonly onChange: (text: string, mentions: CommentMention[]) => void;
  readonly disabled: boolean;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const pendingSelection = useRef<null | number>(null);
  const [caret, setCaret] = useState(0);
  const [selected, setSelected] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const listId = useId();
  const active =
    !dismissed &&
    !mentions.some((mention) => caret > mention.start && caret <= mention.end)
      ? commentMentionQuery(value, caret)
      : null;
  const candidates = members
    .filter((member) =>
      `${member.name} ${member.email}`
        .toLocaleLowerCase('ru-RU')
        .includes(active?.query.toLocaleLowerCase('ru-RU') ?? ''),
    )
    .slice(0, 20);

  useLayoutEffect(() => {
    if (pendingSelection.current === null) return;
    ref.current?.focus();
    ref.current?.setSelectionRange(
      pendingSelection.current,
      pendingSelection.current,
    );
    pendingSelection.current = null;
  }, [value]);

  const choose = (member: (typeof candidates)[number]) => {
    if (!active) return;
    const label = `@${member.name}`;
    const next = `${value.slice(0, active.start) + label} ${value.slice(active.end)}`;
    const updated = editCommentMentions(value, next, mentions);
    updated.push({
      userId: member.id,
      start: active.start,
      end: active.start + label.length,
    });
    updated.sort((a, b) => a.start - b.start);
    pendingSelection.current = active.start + label.length + 1;
    setCaret(pendingSelection.current);
    setDismissed(true);
    onChange(next, updated);
  };

  return (
    <div className='flex flex-col gap-2'>
      <UITextarea
        ref={ref}
        rows={3}
        placeholder='Напишите комментарий, @ — упомянуть участника доски'
        value={value}
        maxLength={10_000}
        disabled={disabled}
        aria-controls={active ? listId : undefined}
        onSelect={(event) => setCaret(event.currentTarget.selectionStart)}
        onChange={(event) => {
          const next = event.target.value;
          setCaret(event.target.selectionStart);
          setSelected(0);
          setDismissed(false);
          onChange(next, editCommentMentions(value, next, mentions));
        }}
        onKeyDown={(event) => {
          if (!active || event.nativeEvent.isComposing) return;
          if (event.key === 'Escape') {
            event.preventDefault();
            setDismissed(true);
          }
          if (candidates.length === 0) return;
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            setSelected(
              (selected +
                (event.key === 'ArrowDown' ? 1 : candidates.length - 1)) %
                candidates.length,
            );
          }
          if (event.key === 'Enter') {
            event.preventDefault();
            choose(candidates[selected % candidates.length]!);
          }
        }}
      />
      {active && (
        <div
          id={listId}
          role='listbox'
          aria-label='Участники доски для упоминания'
          className='flex max-h-60 flex-col gap-1 overflow-y-auto rounded-control border border-border p-2'
        >
          {loading && <p role='status'>Загрузка участников…</p>}
          {failed && (
            <p role='alert'>
              Не удалось загрузить участников. Введите @ заново, чтобы
              повторить.
            </p>
          )}
          {!loading && !failed && candidates.length === 0 && (
            <p>Участники не найдены</p>
          )}
          {candidates.map((member, index) => (
            <UIButton
              key={member.id}
              role='option'
              aria-selected={index === selected % candidates.length}
              variant='ghost'
              className='justify-start aria-selected:bg-primary-tint'
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => choose(member)}
            >
              {member.name} · {member.email}
            </UIButton>
          ))}
        </div>
      )}
    </div>
  );
}
