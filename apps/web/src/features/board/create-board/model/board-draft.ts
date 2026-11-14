import { type CreateBoardBody, createBoardBodySchema } from '@gwmt/contracts';

import { type FieldErrors, issuesToFieldErrors } from '@/shared/lib/form';

const TRANSLIT: Record<string, string> = {
  а: 'A',
  б: 'B',
  в: 'V',
  г: 'G',
  д: 'D',
  е: 'E',
  ё: 'E',
  ж: 'Z',
  з: 'Z',
  и: 'I',
  й: 'Y',
  к: 'K',
  л: 'L',
  м: 'M',
  н: 'N',
  о: 'O',
  п: 'P',
  р: 'R',
  с: 'S',
  т: 'T',
  у: 'U',
  ф: 'F',
  х: 'H',
  ц: 'C',
  ч: 'C',
  ш: 'S',
  щ: 'S',
  ы: 'Y',
  э: 'E',
  ю: 'U',
  я: 'Y',
};

export const BOARD_KEY_MAX = 6;
const AUTO_KEY_LENGTH = 5;

/** «Разработка» → «RAZRA»: ключ задач из названия, пока пользователь не задал свой. */
export function boardKeyFromName(name: string): string {
  return [...name.toLowerCase()]
    .map(
      (char) =>
        TRANSLIT[char] ?? (/[a-z0-9]/.test(char) ? char.toUpperCase() : ''),
    )
    .join('')
    .slice(0, AUTO_KEY_LENGTH);
}

/** Ввод ключа вручную: только A–Z и цифры, не длиннее шести. */
export function normalizeBoardKey(input: string): string {
  return input
    .toUpperCase()
    .replaceAll(/[^A-Z0-9]/g, '')
    .slice(0, BOARD_KEY_MAX);
}

export interface BoardDraft {
  readonly name: string;
  readonly key: string;
  /** Ключ правили руками: название его больше не перезаписывает. */
  readonly keyTouched: boolean;
  readonly description: string;
  readonly memberIds: readonly string[];
}

export const EMPTY_BOARD_DRAFT: BoardDraft = {
  name: '',
  key: '',
  keyTouched: false,
  description: '',
  memberIds: [],
};

export function setDraftName(draft: BoardDraft, name: string): BoardDraft {
  return {
    ...draft,
    name,
    key: draft.keyTouched ? draft.key : boardKeyFromName(name),
  };
}

export function setDraftKey(draft: BoardDraft, key: string): BoardDraft {
  return { ...draft, key: normalizeBoardKey(key), keyTouched: true };
}

export function toggleDraftMember(
  draft: BoardDraft,
  userId: string,
): BoardDraft {
  return {
    ...draft,
    memberIds: draft.memberIds.includes(userId)
      ? draft.memberIds.filter((id) => id !== userId)
      : [...draft.memberIds, userId],
  };
}

export type BoardDraftField = 'description' | 'key' | 'memberIds' | 'name';

export type BoardDraftResult =
  | { readonly ok: false; readonly errors: FieldErrors<BoardDraftField> }
  | { readonly ok: true; readonly body: CreateBoardBody };

/** Создатель становится администратором сам: его id в участниках не отправляется. */
export function validateBoardDraft(draft: BoardDraft): BoardDraftResult {
  const parsed = createBoardBodySchema.safeParse({
    name: draft.name,
    key: draft.key,
    description: draft.description.trim() || undefined,
    memberIds: draft.memberIds,
  });
  return parsed.success
    ? { ok: true, body: parsed.data }
    : { ok: false, errors: issuesToFieldErrors(parsed.error.issues) };
}
