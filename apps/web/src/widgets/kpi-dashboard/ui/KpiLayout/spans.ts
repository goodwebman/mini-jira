/**
 * Сетка KPI на 12 колонок. Размеры карточек по брейкпоинтам повторяют макеты:
 * 1920 — три ряда плотной сетки, 1440 — пары, 960 и уже — колонкой.
 */
export const SPANS = {
  tile: 'col-span-6 md:col-span-3',
  burndown: 'col-span-12 lg:col-span-8 xl:col-span-6',
  donut: 'col-span-12 md:col-span-6 lg:col-span-4 xl:col-span-3',
  // На 1440 «Этапы» уходят в конец, в пару к «Вкладу участников»
  stages:
    'col-span-12 md:col-span-6 lg:order-1 lg:col-span-5 xl:order-none xl:col-span-3',
  flow: 'col-span-12 lg:col-span-6 xl:col-span-4',
  velocity: 'col-span-12 lg:col-span-6 xl:col-span-4',
  team: 'col-span-12 lg:col-span-7 xl:col-span-4',
} as const;

export type KpiArea = keyof typeof SPANS;
