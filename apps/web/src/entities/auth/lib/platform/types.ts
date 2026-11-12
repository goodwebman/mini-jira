import type { Unsubscribe } from '../types';

export interface AuthChannel {
  post(message: unknown): void;
  subscribe(listener: (message: unknown) => void): Unsubscribe;
  close(): void;
}

/** Несекретные флаги, которые переживают перезагрузку страницы. */
export interface AuthMarkers {
  has(key: string): boolean;
  set(key: string): void;
  delete(key: string): void;
}

export interface AuthResumeInfo {
  /** Страницу вернули из bfcache: состояние в памяти могло устареть. */
  readonly restoredFromCache: boolean;
}

/** Всё, что сервису нужно от окружения. Благодаря этому ядро работает и вне браузера. */
export interface AuthPlatform {
  now(): number;
  origin(): string | null;
  isVisible(): boolean;
  /** Wait at most timeoutMs; reject without running task if the lock remains busy. */
  withLock<T>(
    name: string,
    task: () => Promise<T>,
    options: { timeoutMs: number },
  ): Promise<T>;
  openChannel(name: string): AuthChannel | null;
  onResume(listener: (info: AuthResumeInfo) => void): Unsubscribe;
  onOnline(listener: () => void): Unsubscribe;
  navigate(url: string): void;
  readonly markers: AuthMarkers;
}
