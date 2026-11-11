/** Добавляет query-параметры, сохраняя 0 и false и пропуская пустые значения. */
export function withQuery(
  path: string,
  params: Record<string, string | number | boolean | undefined>,
): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') search.set(key, String(value));
  }
  const query = search.toString();
  return query === '' ? path : `${path}?${query}`;
}
