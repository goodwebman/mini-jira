/**
 * Сетка KPI на 12 колонок. Размеры карточек по брейкпоинтам повторяют макеты:
 * С 1920 px — плотная сетка, с 1280 px — пары ключевых графиков.
 */
export const SPANS = {
  tile: 'col-span-6 w960:col-span-3',
  burndown: 'col-span-12 w1280:col-span-8 w1920:col-span-6',
  donut: 'col-span-12 w960:col-span-6 w1280:col-span-4 w1920:col-span-3',
  // Между 1280 и 1920 px «Этапы» идут в паре со «Вкладом участников».
  stages:
    'col-span-12 w960:col-span-6 w1280:order-1 w1280:col-span-5 w1920:order-none w1920:col-span-3',
  flow: 'col-span-12 w1280:col-span-6 w1920:col-span-4',
  velocity: 'col-span-12 w1280:col-span-6 w1920:col-span-4',
  team: 'col-span-12 w1280:col-span-7 w1920:col-span-4',
} as const;

export type KpiArea = keyof typeof SPANS;
