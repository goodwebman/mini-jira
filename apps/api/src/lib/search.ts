/** Шаблон ILIKE «содержит»: символы %, _ и \ из запроса пользователя теряют особый смысл. */
export const containsPattern = (query: string) =>
  `%${query.replace(/[\\%_]/g, '\\$&')}%`;
