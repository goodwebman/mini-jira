import { useStore } from '../store';
import { createTicker, onDocumentVisible } from './ticker';

/** Таймеры показывают минуты: обновления раз в 30 секунд достаточно. */
const clock = createTicker({
  intervalMs: 30_000,
  onVisible: onDocumentVisible,
});

/** Текущее время клиента в мс, обновляется общими часами приложения. */
export function useNow(): number {
  return useStore(clock);
}
