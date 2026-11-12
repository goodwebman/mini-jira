export function safeReturnTo(value: string | null): string {
  if (
    !value ||
    !value.startsWith('/') ||
    value.startsWith('//') ||
    /[\\\s]/.test(value)
  )
    return '/boards';
  const url = new URL(value, 'https://local.invalid');
  return url.pathname === '/login' || url.pathname.startsWith('/api/')
    ? '/boards'
    : value;
}
