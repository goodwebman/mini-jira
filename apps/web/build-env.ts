/** Проверяем до сборки: иначе ошибка конфигурации обнаружится только при входе. */
export function validateBuildEnv(
  env: Record<string, string | undefined>,
): void {
  for (const name of ['VITE_API_URL', 'VITE_APP_VERSION', 'VITE_AUTH_SALT']) {
    if (!env[name]?.trim()) {
      throw new Error(
        `${name} is required for a build. See apps/web/.env.example`,
      );
    }
  }

  const apiUrl = env.VITE_API_URL!.trim();
  const apiUrlMessage =
    'VITE_API_URL must be an absolute /path or an HTTP(S) URL without credentials, query or hash';
  // /api/v1 — same-origin; https://api.example.com/api/v1 — отдельный API.
  // Запрещаем //host, credentials, query/hash: клиент дописывает путь запроса.
  let url: URL;
  try {
    url = new URL(apiUrl, 'http://localhost');
  } catch {
    // Не включаем исходное значение в ошибку: там могут случайно быть credentials.
    throw new Error(apiUrlMessage);
  }
  if (
    (!apiUrl.startsWith('/') && !/^https?:\/\//iu.test(apiUrl)) ||
    apiUrl.startsWith('//') ||
    /[\\\s]/u.test(apiUrl) ||
    !['http:', 'https:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    apiUrl.includes('?') ||
    apiUrl.includes('#')
  ) {
    throw new Error(apiUrlMessage);
  }

  // Формат заголовка должен соответствовать VERSION_PATTERN в API lib/salt.ts.
  if (!/^[\w.+-]{1,64}$/u.test(env.VITE_APP_VERSION!.trim())) {
    throw new Error(
      'VITE_APP_VERSION must contain 1–64 letters, digits, _, ., + or -',
    );
  }

  // API вычисляет lowercase hex: uppercase тоже изменил бы подпись login.
  if (!/^[\da-f]{64}$/u.test(env.VITE_AUTH_SALT!.trim())) {
    throw new Error(
      'VITE_AUTH_SALT must be a lowercase SHA-256 hex digest (64 characters)',
    );
  }
}
