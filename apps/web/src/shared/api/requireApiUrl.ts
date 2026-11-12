import { env } from '@/shared/config';

export function getConfiguredApiUrl(): string | null {
  return env.apiUrl.replace(/\/+$/u, '') || null;
}

export function requireApiUrl(): string {
  const url = getConfiguredApiUrl();
  if (url === null)
    throw new Error('VITE_API_URL is not defined. Check apps/web/.env');
  return url;
}

export function getApiUrl(path: string): string {
  return `${requireApiUrl()}/${path.replace(/^\/+/, '')}`;
}
