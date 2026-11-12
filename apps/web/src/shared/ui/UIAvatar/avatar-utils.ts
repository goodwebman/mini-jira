export const AVATAR_TINTS = [
  'blue',
  'orange',
  'green',
  'violet',
  'gray',
  'pink',
] as const;

export type UIAvatarTint = (typeof AVATAR_TINTS)[number];

/** «Анна Соколова» → «АС»; не больше двух букв. */
export function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => Array.from(part)[0])
    .join('')
    .toUpperCase();
}

/** Стабильный тинт от имени: у одного человека всегда один цвет. */
export function getTintByName(name: string): UIAvatarTint {
  let hash = 0;
  for (const char of name) {
    hash = (hash * 31 + (char.codePointAt(0) ?? 0)) % 1_000_003;
  }
  return AVATAR_TINTS[hash % AVATAR_TINTS.length];
}
