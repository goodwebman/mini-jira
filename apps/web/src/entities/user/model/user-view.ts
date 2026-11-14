import { type UIAvatarTint, getTintByIndex } from '@/shared/ui';

/** Цвет аватара выбирает сервер (`colorIndex`), чтобы он совпадал на всех экранах. */
export function userTint(colorIndex: number): UIAvatarTint {
  return getTintByIndex(colorIndex);
}

/** «Анна Смирнова» → «Анна»: подпись фильтра-чипа. */
export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}
