/**
 * Копирует текст в буфер. Возвращает `false`, если браузер отказал:
 * тогда интерфейс показывает текст для ручного копирования.
 *
 * Запасной путь через `execCommand` нужен для http-стендов и старых WebView,
 * где Clipboard API недоступен вне secure context.
 */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (globalThis.isSecureContext && navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Нет разрешения: пробуем запасной путь
  }
  return legacyCopy(text);
}

function legacyCopy(text: string): boolean {
  if (typeof document === 'undefined') return false;
  const area = document.createElement('textarea');
  area.value = text;
  area.setAttribute('readonly', '');
  area.style.position = 'fixed';
  area.style.opacity = '0';
  document.body.append(area);
  area.select();
  try {
    return document.execCommand('copy');
  } catch {
    return false;
  } finally {
    area.remove();
  }
}
