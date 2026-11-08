// ВРЕМЕННАЯ витрина компонентов кита. Удалить после проверки.
import { useState, type ReactNode } from 'react';
import {
  UIAlert,
  UIAreaChart,
  UIAvatar,
  UIBadge,
  UIBarChart,
  UIBottomNav,
  UIBrand,
  UIButton,
  UICard,
  UIChartLegend,
  UIChartTooltip,
  UICheckbox,
  UIChip,
  UIDialog,
  UIDonutChart,
  UIDrawer,
  UIEmptyState,
  UIField,
  UIIconButton,
  UIIcons,
  UIIconTile,
  UIInput,
  UIKanbanColumn,
  UILabel,
  UILineChart,
  UILink,
  UIListItem,
  UIOptionCard,
  UIPageHeader,
  UIPopover,
  UIPriority,
  UIProgress,
  UISearchInput,
  UISegmented,
  UISelect,
  UISeparator,
  UISideNav,
  UISkeleton,
  UISpinner,
  UIStat,
  UIStatusBadge,
  UISwitch,
  UITabBar,
  UITable,
  UITaskCard,
  UITextarea,
  UIToastProvider,
  UITooltip,
  useToast,
  type IUISegmentedOption,
  type UIIconComponent,
  type UITaskStatus,
} from '@/shared/ui';

type LinkType = 'rel' | 'blocks' | 'dup';
type DialogSize = 'sm' | 'md' | 'lg';

const SECTIONS = [
  { id: 'buttons', title: 'Кнопки' },
  { id: 'fields', title: 'Поля' },
  { id: 'choice', title: 'Выбор' },
  { id: 'data', title: 'Данные' },
  { id: 'charts', title: 'Графики' },
  { id: 'feedback', title: 'Обратная связь' },
  { id: 'shell', title: 'Каркас' },
  { id: 'tasks', title: 'Задачи' },
  { id: 'icons', title: 'Иконки' },
] as const;

const STATUSES: readonly UITaskStatus[] = ['todo', 'work', 'review', 'test', 'done'];

const STATUS_NAMES: Record<UITaskStatus, string> = {
  todo: 'К работе',
  work: 'В работе',
  review: 'Ревью',
  test: 'Тестирование',
  done: 'Готово',
};

const PEOPLE = ['Анна Соколова', 'Иван Петров', 'Мария Ким', 'Олег Орлов'];

const TINTS = ['primary', 'blue', 'orange', 'green', 'violet', 'gray', 'pink'] as const;

const ROLE_OPTIONS = [
  { value: 'admin', label: 'Администратор' },
  { value: 'worker', label: 'Рабочий' },
  { value: 'guest', label: 'Гость', disabled: true },
];

const LINK_OPTIONS: readonly IUISegmentedOption<LinkType>[] = [
  { value: 'rel', label: 'Связана с' },
  { value: 'blocks', label: 'Блокирует' },
  { value: 'dup', label: 'Дублирует' },
];

const BOARDS = [
  { id: 'dev', name: 'Разработка', meta: 'ID:1 · MJ · 6 участников', aside: '12 SP' },
  { id: 'mkt', name: 'Маркетинг', meta: 'ID:2 · MK · 3 участника', aside: '4 SP' },
];

const DAYS = ['03.11', '04.11', '05.11', '06.11', '07.11', '10.11', '11.11', '12.11', '13.11', '14.11'];
const BURN_REMAINING: readonly (number | null)[] = [64, 60, 55, 52, 40, 36, 30, 22, null, null];
const BURN_IDEAL: readonly number[] = DAYS.map((_, index) => Math.round(64 * (1 - index / 9)));

const FLOW: Record<UITaskStatus, readonly (number | null)[]> = {
  todo: [30, 28, 26, 24, 20, 18, 16, 14, null, null],
  work: [10, 12, 14, 13, 12, 12, 11, 10, null, null],
  review: [4, 4, 5, 6, 7, 7, 8, 8, null, null],
  test: [2, 2, 2, 3, 3, 4, 4, 4, null, null],
  done: [4, 6, 8, 10, 14, 18, 22, 26, null, null],
};

function Block({
  id,
  title,
  note,
  children,
}: {
  readonly id: string;
  readonly title: string;
  readonly note?: string;
  readonly children: ReactNode;
}) {
  return (
    <section id={id} className="flex scroll-mt-4 flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="m-0 text-heading font-semibold tracking-title">{title}</h2>
        {note != null && <p className="m-0 text-small text-muted-foreground">{note}</p>}
      </div>
      {children}
    </section>
  );
}

function Panel({ children }: { readonly children: ReactNode }) {
  return <UICard className="flex flex-col gap-5">{children}</UICard>;
}

function Row({ label, children }: { readonly label: string; readonly children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-caption font-medium text-muted-foreground">{label}</span>
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </div>
  );
}

function ButtonsBlock() {
  return (
    <Block id="buttons" title="Кнопки и ссылки" note="Высота контролов меняется по ширине: 40 px на десктопе, 44 на телефоне, 48 на 1920.">
      <Panel>
        <Row label="Варианты">
          <UIButton>Основная</UIButton>
          <UIButton variant="secondary">Вторичная</UIButton>
          <UIButton variant="ghost">Текстовая</UIButton>
          <UIButton variant="danger">Опасная</UIButton>
          <UIButton variant="danger-ghost">Опасная текстовая</UIButton>
        </Row>
        <Row label="Размеры">
          <UIButton size="sm">Маленькая</UIButton>
          <UIButton size="md">Средняя</UIButton>
          <UIButton size="lg">Большая</UIButton>
        </Row>
        <Row label="Состояния">
          <UIButton disabled>Недоступна</UIButton>
          <UIButton variant="secondary" disabled>Недоступна</UIButton>
          <UIButton loading>Сохраняю</UIButton>
          <UIButton variant="secondary" loading>Загрузка</UIButton>
        </Row>
        <Row label="Кнопки-иконки">
          <UIIconButton label="Создать" variant="primary">
            <UIIcons.Plus />
          </UIIconButton>
          <UIIconButton label="Уведомления" variant="secondary">
            <UIIcons.Bell />
          </UIIconButton>
          <UIIconButton label="Закрыть" variant="ghost">
            <UIIcons.X />
          </UIIconButton>
          <UIIconButton label="Свернуть" variant="muted" size="lg">
            <UIIcons.ChevronDown />
          </UIIconButton>
          <UIIconButton label="Пауза" variant="secondary" size="xs" shape="round">
            <UIIcons.Pause />
          </UIIconButton>
        </Row>
        <Row label="Ссылки">
          <UILink href="#buttons">Текстовая ссылка</UILink>
          <UILink href="#buttons">Ещё одна ссылка</UILink>
        </Row>
      </Panel>
    </Block>
  );
}

function FieldsBlock() {
  const [search, setSearch] = useState('доска');
  const [role, setRole] = useState('');
  const [comment, setComment] = useState('');

  return (
    <Block id="fields" title="Поля ввода" note="Подпись, подсказка и ошибка связаны с полем через UIField. Кликни в поле, чтобы увидеть фокус.">
      <Panel>
        <div className="grid gap-5 md:grid-cols-2">
          <UIField label="Обычное" hint="Подсказка под полем">
            <UIInput placeholder="Что нужно сделать" />
          </UIField>
          <UIField label="С ошибкой" error="Введите корректный email">
            <UIInput defaultValue="ivan@mail" />
          </UIField>
          <UIField label="Только рамка с ошибкой" error>
            <UIInput defaultValue="без текста" />
          </UIField>
          <UIField label="Недоступно" disabled>
            <UIInput defaultValue="Нельзя менять" />
          </UIField>
          <UIField label="Необязательное" optional>
            <UIInput size="lg" placeholder="Большое поле" />
          </UIField>
          <UIField label="С иконкой слева">
            <UIInput leftSlot={<UIIcons.Search className="size-icon" />} placeholder="Поиск по задачам" />
          </UIField>
          <UIField label="Выпадающий список">
            <UISelect value={role} onValueChange={setRole} placeholder="Выберите роль" options={ROLE_OPTIONS} />
          </UIField>
          <UIField label="Поиск">
            <UISearchInput
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
              }}
              onClear={() => {
                setSearch('');
              }}
            />
          </UIField>
        </div>
        <UIField label="Комментарий" hint="Не больше 200 символов">
          <UITextarea
            maxLength={200}
            value={comment}
            placeholder="Напишите комментарий"
            onChange={(event) => {
              setComment(event.target.value);
            }}
          />
        </UIField>
      </Panel>
    </Block>
  );
}

function ChoiceBlock() {
  const [agree, setAgree] = useState(false);
  const [notify, setNotify] = useState(true);
  const [linkType, setLinkType] = useState<LinkType>('rel');
  const [filterOn, setFilterOn] = useState(true);
  const [boardId, setBoardId] = useState('dev');

  return (
    <Block id="choice" title="Выбор и переключатели" note="Чекбоксы, переключатели, сегменты, чипы и карточки выбора. Стрелками двигается только сегмент.">
      <Panel>
        <Row label="Чекбоксы">
          <UICheckbox label="Согласен с условиями" checked={agree} onCheckedChange={setAgree} />
          <UICheckbox label="Частично выбрано" indeterminate />
          <UICheckbox label="Недоступно" disabled />
        </Row>
        <Row label="Переключатели">
          <UISwitch label="Уведомления" checked={notify} onCheckedChange={setNotify} />
          <UISwitch label="Недоступно" disabled />
        </Row>
        <Row label="Сегменты">
          <UISegmented aria-label="Тип связи" options={LINK_OPTIONS} value={linkType} onValueChange={setLinkType} />
        </Row>
        <Row label="Чипы">
          <UIChip
            pressed={filterOn}
            onClick={() => {
              setFilterOn(!filterOn);
            }}
          >
            Фильтр
          </UIChip>
          <UIChip pressed={false}>Выключенный</UIChip>
          <UIChip pressed avatar={<UIAvatar name="Анна Соколова" size="xs" />}>
            Анна
          </UIChip>
          <UIChip variant="dashed">Добавить</UIChip>
          <UIChip variant="status" pressed>
            В работе 3
          </UIChip>
          <UIChip variant="status" pressed={false}>
            Ревью 1
          </UIChip>
        </Row>
        <Row label="Карточки выбора">
          <div className="grid w-full gap-3 md:grid-cols-2">
            {BOARDS.map((board) => (
              <UIOptionCard
                key={board.id}
                title={board.name}
                meta={board.meta}
                aside={board.aside}
                selected={boardId === board.id}
                onClick={() => {
                  setBoardId(board.id);
                }}
              />
            ))}
          </div>
        </Row>
        <Row label="Подписи">
          <UILabel>Подпись без поля</UILabel>
          <UILabel optional>Необязательная подпись</UILabel>
        </Row>
      </Panel>
    </Block>
  );
}

function DataBlock() {
  return (
    <Block id="data" title="Данные и метки" note="Аватары, бейджи, статусы, приоритеты, прогресс и таблица.">
      <Panel>
        <Row label="Аватары">
          {(['xs', 'sm', 'md', 'lg', 'xl'] as const).map((size) => (
            <UIAvatar key={size} name="Анна Соколова" size={size} />
          ))}
          <UIAvatar name="Иван Петров" tint="pink" size="md" />
          <UIAvatar name="Битая картинка" src="/no-such-image.png" size="md" />
        </Row>
        <Row label="Группа аватаров">
          <UIAvatar.Group max={3}>
            {PEOPLE.map((name) => (
              <UIAvatar key={name} name={name} size="xs" />
            ))}
          </UIAvatar.Group>
          <UIAvatar.Group size="sm" max={2}>
            {PEOPLE.map((name) => (
              <UIAvatar key={name} name={name} size="sm" />
            ))}
          </UIAvatar.Group>
        </Row>
        <Row label="Бейджи">
          <UIBadge>Нейтральный</UIBadge>
          <UIBadge tone="accent">Администратор</UIBadge>
          <UIBadge tone="warning" icon={<UIIcons.Pause className="size-icon-sm" />}>
            На паузе 6 ч 59 мин
          </UIBadge>
          <UIBadge tone="review">На ревью 5 ч</UIBadge>
          <UIBadge tone="test">В тесте 3 ч</UIBadge>
          <UIBadge tone="success">Сделана за 3 д</UIBadge>
          <UIBadge tone="danger">Блокер</UIBadge>
        </Row>
        <Row label="Статусы задач">
          {STATUSES.map((status) => (
            <UIStatusBadge key={status} status={status}>
              {STATUS_NAMES[status]}
            </UIStatusBadge>
          ))}
        </Row>
        <Row label="Приоритеты">
          <UIPriority priority="crit">Критичный</UIPriority>
          <UIPriority priority="high">Высокий</UIPriority>
          <UIPriority priority="med">Средний</UIPriority>
          <UIPriority priority="low">Низкий</UIPriority>
          <UIPriority priority="high" label="Высокий" />
        </Row>
        <Row label="Иконки на плитках">
          {(['sm', 'md', 'lg'] as const).map((size) => (
            <UIIconTile key={size} size={size} tint="green">
              <UIIcons.Board />
            </UIIconTile>
          ))}
          {TINTS.map((tint) => (
            <UIIconTile key={tint} tint={tint}>
              <UIIcons.Tasks />
            </UIIconTile>
          ))}
        </Row>
        <Row label="Бренд">
          <UIBrand />
        </Row>
        <Row label="Прогресс">
          <div className="flex w-full flex-col gap-3">
            <UIProgress value={65} size="xs" />
            <UIProgress value={40} size="sm" color="var(--status-review)" />
            <UIProgress value={90} size="md" track="border" color="var(--status-done)" />
          </div>
        </Row>
        <div className="grid gap-3 md:grid-cols-3">
          <UIStat label="Выполнено" value="42 SP" sub="из 64 SP · 65%" progress={65} />
          <UIStat label="Прогноз" value="58 SP" sub="при темпе 5 SP в день" />
          <UIStat label="Изменение" value="+6 SP" sub="добавлено за спринт" />
        </div>
        <Row label="Карточка">
          <UICard className="flex w-full max-w-[420px] flex-col gap-3" padding="sm">
            <UICard.Header>
              <UICard.Title>Статус спринта</UICard.Title>
              <UIChip variant="filter">Фильтр</UIChip>
            </UICard.Header>
            <UICard.Description>Описание блока: короткий текст под заголовком.</UICard.Description>
            <UICard.Content>
              <UIProgress value={30} size="sm" />
            </UICard.Content>
            <UICard.Footer>
              <UIButton size="sm" variant="secondary">
                Отмена
              </UIButton>
              <UIButton size="sm">Сохранить</UIButton>
            </UICard.Footer>
          </UICard>
        </Row>
        <Row label="Строки списка">
          <UICard padding="sm" className="flex w-full flex-col">
            <UIListItem
              media={<UIAvatar name="Анна Соколова" size="lg" />}
              title="Анна Соколова"
              description="Разработчик · anna@mail.ru"
              actions={
                <UIButton size="sm" variant="secondary">
                  Добавить
                </UIButton>
              }
            />
            <UIListItem
              media={
                <UIIconTile tint="blue">
                  <UIIcons.Board />
                </UIIconTile>
              }
              title="Разработка (строка-ссылка)"
              description="Вся строка кликабельна"
              href="#data"
            />
            <UIListItem divided={false} title="Без разделителя" description="divided={false}" />
          </UICard>
        </Row>
        <Row label="Таблица">
          <div className="w-full">
            <UITable>
              <UITable.Head>
                <UITable.Row>
                  <UITable.HeadCell>Ключ</UITable.HeadCell>
                  <UITable.HeadCell>Название</UITable.HeadCell>
                  <UITable.HeadCell>Статус</UITable.HeadCell>
                </UITable.Row>
              </UITable.Head>
              <UITable.Body>
                <UITable.Row interactive>
                  <UITable.Cell>
                    <UITable.RowLink href="#data">MJ-159</UITable.RowLink>
                  </UITable.Cell>
                  <UITable.Cell>Строка таблицы</UITable.Cell>
                  <UITable.Cell>
                    <UIStatusBadge status="work">В работе</UIStatusBadge>
                  </UITable.Cell>
                </UITable.Row>
                <UITable.Row selected>
                  <UITable.Cell>MJ-142</UITable.Cell>
                  <UITable.Cell>Выбранная строка</UITable.Cell>
                  <UITable.Cell>
                    <UIStatusBadge status="done">Готово</UIStatusBadge>
                  </UITable.Cell>
                </UITable.Row>
              </UITable.Body>
            </UITable>
          </div>
        </Row>
        <Row label="Пустое состояние">
          <UIEmptyState boxed icon={<UIIcons.Inbox />} title="Задач по этим условиям нет" description="Сбрось фильтры, чтобы увидеть все задачи" action={<UIButton variant="secondary" size="sm">Сбросить</UIButton>} />
          <UIEmptyState icon={<UIIcons.Search />} title="Ничего не найдено" />
        </Row>
        <Row label="Загрузка">
          <UISpinner />
          <UISpinner className="size-icon-lg" />
          <UISkeleton className="h-4 w-40" />
          <UISkeleton className="size-avatar-md rounded-full" />
        </Row>
        <Row label="Разделители">
          <div className="flex w-full flex-col gap-3">
            <UISeparator />
            <UISeparator label="или" />
          </div>
        </Row>
      </Panel>
    </Block>
  );
}

function ChartsBlock() {
  return (
    <Block id="charts" title="Графики" note="Наведи курсор на график, появится подсказка. Ширина берётся из контейнера, поэтому графики адаптируются.">
      <Panel>
        <UIChartLegend
          items={[
            { label: 'Осталось', color: 'var(--chart-1)', marker: 'line' },
            { label: 'Идеал', color: 'var(--chart-neutral)', marker: 'dashed' },
          ]}
        />
        <UILineChart
          ariaLabel="Сгорание спринта: осталось 22 SP из 64"
          labels={DAYS}
          formatValue={(value) => `${String(Math.round(value))} SP`}
          series={[
            { name: 'Осталось', values: BURN_REMAINING, area: true, endMarker: true },
            { name: 'Идеал', values: BURN_IDEAL, color: 'var(--chart-neutral)', variant: 'dashed' },
          ]}
        />
      </Panel>
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel>
          <UIChartLegend
            variant="inline"
            items={STATUSES.slice()
              .reverse()
              .map((status) => ({ label: STATUS_NAMES[status], color: `var(--status-${status})`, marker: 'square' as const }))}
          />
          <UIAreaChart
            ariaLabel="Накопительный поток задач по статусам"
            labels={DAYS}
            series={STATUSES.slice()
              .reverse()
              .map((status) => ({ name: STATUS_NAMES[status], color: `var(--status-${status})`, values: FLOW[status] }))}
          />
        </Panel>
        <Panel>
          <UIChartLegend
            items={[
              { label: 'План', color: 'var(--chart-plan)' },
              { label: 'Выполнено', color: 'var(--chart-1)' },
            ]}
          />
          <UIBarChart
            ariaLabel="Скорость команды по спринтам"
            labels={['С7', 'С8', 'С9', 'С10', 'С11', 'С12']}
            highlightIndex={5}
            average={{ value: 38, label: 'Средняя: 38' }}
            series={[
              { name: 'План', values: [40, 42, 38, 44, 40, 46], color: 'var(--chart-plan)' },
              { name: 'Выполнено', values: [36, 40, 35, 41, 38, 42], color: 'var(--chart-1)', mutedColor: 'var(--chart-soft)' },
            ]}
          />
        </Panel>
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel>
          <div className="flex flex-wrap items-center gap-6">
            <UIDonutChart
              ariaLabel="Закрыто 42% объёма"
              value="42%"
              caption="закрыто"
              segments={STATUSES.map((status, index) => ({
                label: STATUS_NAMES[status],
                value: 5 + index * 3,
                color: `var(--status-${status})`,
              }))}
            />
            <UIChartLegend
              variant="list"
              className="min-w-[180px] flex-1"
              items={STATUSES.map((status, index) => ({
                label: STATUS_NAMES[status],
                color: `var(--status-${status})`,
                value: `${String(5 + index * 3)} SP`,
              }))}
            />
          </div>
        </Panel>
        <Panel>
          <Row label="Подсказка (статично)">
            <UIChartTooltip
              title="День 8"
              rows={[
                { color: 'var(--chart-1)', label: 'Факт', value: '22 SP' },
                { color: 'var(--chart-neutral)', label: 'Идеал', value: '9 SP' },
              ]}
            />
          </Row>
        </Panel>
      </div>
    </Block>
  );
}

function ToastDemo() {
  const { toast } = useToast();
  return (
    <div className="flex flex-wrap gap-2">
      <UIButton
        variant="secondary"
        onClick={() => {
          toast('Профиль сохранён');
        }}
      >
        Тост на 4 секунды
      </UIButton>
      <UIButton
        variant="secondary"
        onClick={() => {
          toast('Закрой меня крестиком', { duration: 0 });
        }}
      >
        Тост без таймера
      </UIButton>
    </div>
  );
}

function FeedbackBlock() {
  const [dialogSize, setDialogSize] = useState<DialogSize | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <Block id="feedback" title="Обратная связь и оверлеи" note="Алерты, тосты, подсказки, поповер, диалоги и выезжающая панель. Esc и клик по фону закрывают оверлеи.">
      <Panel>
        <Row label="Алерты">
          <div className="flex w-full flex-col gap-2">
            <UIAlert icon={<UIIcons.Eye />}>Вы гость на этой доске: можно только смотреть</UIAlert>
            <UIAlert tone="info">Спринт закроется через 2 дня</UIAlert>
            <UIAlert tone="danger">Не удалось сохранить изменения</UIAlert>
            <UIAlert tone="success" action={<UIButton size="sm" variant="ghost">Скрыть</UIButton>}>
              Задача перенесена в «Готово»
            </UIAlert>
          </div>
        </Row>
        <Row label="Тосты">
          <ToastDemo />
        </Row>
        <Row label="Подсказка">
          <UITooltip content="Администратор запретил брать задачу в работу">
            <UIBadge tone="warning" icon={<UIIcons.Lock className="size-icon-sm" />}>
              Запрет
            </UIBadge>
          </UITooltip>
        </Row>
        <Row label="Поповер">
          <UIPopover ariaLabel="Фильтры по людям" trigger={<UIButton variant="secondary">Фильтры</UIButton>}>
            <div className="flex w-[240px] flex-col gap-3">
              <UISearchInput placeholder="Поиск по людям" />
              <UICheckbox label="Анна Соколова" defaultChecked />
              <UICheckbox label="Иван Петров" />
            </div>
          </UIPopover>
        </Row>
        <Row label="Диалог">
          <UIButton variant="secondary" onClick={() => { setDialogSize('sm'); }}>
            Маленький
          </UIButton>
          <UIButton variant="secondary" onClick={() => { setDialogSize('md'); }}>
            Средний
          </UIButton>
          <UIButton variant="secondary" onClick={() => { setDialogSize('lg'); }}>
            Большой
          </UIButton>
        </Row>
        <Row label="Выезжающая панель (внутри блока)">
          <div className="relative h-[320px] w-full overflow-hidden rounded-block border border-border bg-background">
            <div className="p-page">
              <UIButton variant="secondary" onClick={() => { setDrawerOpen(true); }}>
                Открыть панель
              </UIButton>
            </div>
            <UIDrawer
              open={drawerOpen}
              onOpenChange={setDrawerOpen}
              title="Доски задач"
              actions={<UIButton size="sm" variant="secondary">Показать все</UIButton>}
            >
              <UISearchInput placeholder="Поиск по названию" />
              <UIListItem
                divided={false}
                media={
                  <UIIconTile size="md" tint="blue">
                    <UIIcons.Board />
                  </UIIconTile>
                }
                title="Разработка"
                description="ID:1 · 6 участников"
              />
            </UIDrawer>
          </div>
        </Row>
      </Panel>
      <UIDialog
        open={dialogSize !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDialogSize(null);
          }
        }}
      >
        <UIDialog.Content title="Новая задача" description="Заполни поля и создай задачу" size={dialogSize ?? 'sm'}>
          <UIDialog.Body>
            <div className="flex flex-col gap-4">
              <UIField label="Название" error="Введите название">
                <UIInput placeholder="Что нужно сделать" />
              </UIField>
              <UIField label="Описание" optional>
                <UITextarea placeholder="Подробности" />
              </UIField>
            </div>
          </UIDialog.Body>
          <UIDialog.Footer>
            <UIDialog.Close>Отмена</UIDialog.Close>
            <UIButton>Создать задачу</UIButton>
          </UIDialog.Footer>
        </UIDialog.Content>
      </UIDialog>
    </Block>
  );
}

function ShellBlock() {
  const noop = () => {};

  return (
    <Block id="shell" title="Каркас и навигация" note="Часть блоков видна только при определённой ширине окна: боковое меню от 800 px, вкладки от 520 до 799, нижнее меню до 520. Меняй ширину окна.">
      <Panel>
        <Row label="Шапка страницы">
          <div className="w-full overflow-hidden rounded-block border border-border bg-background">
            <UIPageHeader
              title="Разработка"
              caption="Спринт 12 · 03.11–14.11"
              onBack={noop}
              onTitleClick={noop}
              actions={<UIPageHeader.Action icon={<UIIcons.Plus />} label="Создать задачу" onClick={noop} />}
            />
          </div>
        </Row>
        <Row label="Боковое меню (от 800 px)">
          <div className="flex h-[720px] w-full overflow-hidden rounded-block border border-border bg-background">
            <UISideNav footer={<UISideNav.Profile name="Анна Соколова" href="#shell" />}>
              <UISideNav.Tile tone="blue" active icon={<UIIcons.Board />} label="Доски" value={8} sub="Разработка · спринт 12" href="#shell">
                <UISideNav.BoardViz columns={[2, 3, 1, 2]} />
              </UISideNav.Tile>
              <UISideNav.Tile tone="violet" icon={<UIIcons.Tasks />} label="Мои задачи" value={21} sub="открыто · 34 SP" href="#shell">
                <UISideNav.TasksViz items={['Панель свойств', 'Перетаскивание карточек', 'Фильтры']} />
              </UISideNav.Tile>
              <UISideNav.Tile tone="green" icon={<UIIcons.Chart />} label="KPI" value="42%" sub="закрыто в спринте 12" href="#shell">
                <UISideNav.SparkViz values={[1, 3, 4, 8, 12, 15, 22]} />
              </UISideNav.Tile>
            </UISideNav>
            <div className="p-page text-muted-foreground">Содержимое страницы справа от меню</div>
          </div>
        </Row>
        <Row label="Вкладки (от 520 до 799 px)">
          <div className="w-full overflow-hidden rounded-block border border-border bg-background">
            <UITabBar aria-label="Разделы">
              <UITabBar.Item active href="#shell">Доски</UITabBar.Item>
              <UITabBar.Item href="#shell">Мои задачи</UITabBar.Item>
              <UITabBar.Item href="#shell">KPI</UITabBar.Item>
              <UITabBar.Item href="#shell">Профиль</UITabBar.Item>
            </UITabBar>
          </div>
        </Row>
        <Row label="Нижнее меню (до 520 px)">
          <div className="w-full overflow-hidden rounded-block border border-border bg-background">
            <UIBottomNav aria-label="Разделы">
              <UIBottomNav.Item active icon={<UIIcons.Board />} href="#shell">Доски</UIBottomNav.Item>
              <UIBottomNav.Item icon={<UIIcons.Tasks />} href="#shell">Задачи</UIBottomNav.Item>
              <UIBottomNav.Item icon={<UIIcons.Chart />} href="#shell">KPI</UIBottomNav.Item>
              <UIBottomNav.Item icon={<UIIcons.User />} href="#shell">Профиль</UIBottomNav.Item>
            </UIBottomNav>
          </div>
        </Row>
      </Panel>
    </Block>
  );
}

function TasksBlock() {
  const noop = () => {};

  return (
    <Block id="tasks" title="Задачи" note="Колонки канбана: на десктопе с шапкой и фоном, на телефоне без них. Карточка целиком кликабельна, бейджи и кнопки поверх ссылки.">
      <Panel>
        <div className="flex h-[460px] gap-3 overflow-x-auto rounded-block bg-background p-2 scrollbar-thin">
          <UIKanbanColumn status="todo" title={STATUS_NAMES.todo} count={0} meta="0 SP" onAdd={noop} />
          <UIKanbanColumn status="work" title={STATUS_NAMES.work} count={2} meta="13 SP" onAdd={noop}>
            <UITaskCard
              taskKey="MJ-143"
              title="Панель свойств задачи"
              points="5 SP"
              priority="high"
              priorityLabel="Высокий"
              href="#tasks"
              badges={<UIBadge tone="accent">В работе 1 д 4 ч</UIBadge>}
              meta={<span>12 ноя</span>}
              people={
                <UIAvatar.Group>
                  <UIAvatar name="Иван Петров" size="xs" />
                  <UIAvatar name="Анна Соколова" size="xs" />
                </UIAvatar.Group>
              }
            />
            <UITaskCard
              taskKey="MJ-142"
              title="Перетаскивание карточек"
              points="8 SP"
              priority="crit"
              priorityLabel="Критичный"
              href="#tasks"
              selected
              badges={<UIBadge tone="warning" icon={<UIIcons.Lock className="size-icon-sm" />}>Запрет</UIBadge>}
              meta={<span className="font-medium text-destructive">Блокер</span>}
            />
          </UIKanbanColumn>
          <UIKanbanColumn status="review" title={STATUS_NAMES.review} count={1} meta="3 SP" dropState="ok">
            <UITaskCard
              taskKey="MJ-150"
              title="Очень длинное название задачи, которое должно переноситься на несколько строк без обрезки"
              points="3 SP"
              priority="low"
              priorityLabel="Низкий"
              href="#tasks"
              badges={
                <UIIconButton label="Пауза" variant="secondary" size="xs" shape="round">
                  <UIIcons.Pause />
                </UIIconButton>
              }
            />
          </UIKanbanColumn>
          <UIKanbanColumn status="test" title={STATUS_NAMES.test} count={0} dropState="bad" />
          <UIKanbanColumn status="done" title={STATUS_NAMES.done} count={1} meta="5 SP">
            <UITaskCard taskKey="MJ-120" title="Готовая задача" points="5 SP" href="#tasks" badges={<UIBadge tone="success">Сделана за 3 д</UIBadge>} />
          </UIKanbanColumn>
        </div>
        <Row label="Карточка без ссылки и приоритета">
          <div className="w-full max-w-[320px]">
            <UITaskCard taskKey="MJ-99" title="Статичная карточка" points="1 SP" />
          </div>
        </Row>
      </Panel>
    </Block>
  );
}

function IconsBlock() {
  const icons = Object.entries<UIIconComponent>(UIIcons);
  return (
    <Block id="icons" title="Иконки" note={`Всего ${String(icons.length)}. Цвет — currentColor, размер — size-icon*.`}>
      <Panel>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(112px,1fr))] gap-2">
          {icons.map(([name, Icon]) => (
            <div key={name} className="flex flex-col items-center gap-2 rounded-card border border-border p-3 text-foreground">
              <Icon className="size-icon-lg" />
              <span className="text-caption text-muted-foreground">{name}</span>
            </div>
          ))}
        </div>
      </Panel>
    </Block>
  );
}

function Gallery() {
  return (
    <div className="mx-auto flex max-w-[1280px] flex-col gap-section p-page">
      <header className="flex flex-col gap-3">
        <h1 className="m-0 text-hero font-semibold tracking-display">Витрина UI-кита</h1>
        <p className="m-0 text-body text-muted-foreground">
          Временная страница для визуальной проверки. Меняй ширину окна, чтобы увидеть адаптив.
        </p>
        <nav aria-label="Разделы витрины" className="flex flex-wrap gap-x-4 gap-y-2">
          {SECTIONS.map((section) => (
            <UILink key={section.id} href={`#${section.id}`}>
              {section.title}
            </UILink>
          ))}
        </nav>
      </header>
      <ButtonsBlock />
      <FieldsBlock />
      <ChoiceBlock />
      <DataBlock />
      <ChartsBlock />
      <FeedbackBlock />
      <ShellBlock />
      <TasksBlock />
      <IconsBlock />
    </div>
  );
}

export function KitGallery() {
  return (
    <UIToastProvider>
      <Gallery />
    </UIToastProvider>
  );
}
