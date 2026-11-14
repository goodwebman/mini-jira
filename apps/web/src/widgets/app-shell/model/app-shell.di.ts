import { createDi } from '@/shared/lib/di';

/** Что каркас даёт страницам внутри себя. */
export interface AppShellApi {
  /**
   * Переключатель досок из шапки: на широком экране — выезжающая панель,
   * на узком — переход к списку досок.
   */
  readonly openBoardsSwitcher: () => void;
}

export const { Injector: AppShellInjector, useDi: useAppShell } =
  createDi<AppShellApi>('AppShell');
