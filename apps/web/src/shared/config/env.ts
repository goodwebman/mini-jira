/** Единственная точка чтения import.meta.env в приложении. */
const read = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

export const env = {
  get apiUrl(): string {
    return read(import.meta.env.VITE_API_URL);
  },
  get appSalt(): string {
    return read(import.meta.env.VITE_AUTH_SALT);
  },
  get appVersion(): string {
    return read(import.meta.env.VITE_APP_VERSION);
  },
  get isDev(): boolean {
    return import.meta.env.DEV;
  },
  get isProd(): boolean {
    return import.meta.env.PROD;
  },
  get sentryDsn(): string {
    return read(import.meta.env.VITE_SENTRY_DSN);
  },
  get sentryEnabled(): boolean {
    return read(import.meta.env.VITE_SENTRY_ENABLED) === 'true';
  },
  get sentryEnvironment(): string {
    return (
      read(import.meta.env.VITE_SENTRY_ENVIRONMENT) || import.meta.env.MODE
    );
  },
  get sentryRelease(): string {
    return read(import.meta.env.VITE_SENTRY_RELEASE);
  },
} as const;
