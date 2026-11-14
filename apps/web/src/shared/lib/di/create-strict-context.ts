import { type Context, createContext } from 'react';

/**
 * Контекст с `null` по умолчанию.
 *
 * `null` вместо `{} as T` или `null!`: заглушка обманывает компилятор, и ошибка
 * всплывает глубоко в коде. С `null` и проверкой в `useStrictContext` компонент
 * без провайдера падает сразу, с понятным текстом и точным стеком.
 */
export function createStrictContext<T>(name: string): Context<null | T> {
  const context = createContext<null | T>(null);
  context.displayName = name;
  return context;
}
