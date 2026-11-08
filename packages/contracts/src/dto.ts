import { z } from 'zod';
import {
  boardRoleSchema,
  sprintStateSchema,
  stageStatusSchema,
  taskLinkTypeSchema,
  taskPrioritySchema,
  taskRoleSchema,
  taskStatusSchema,
  timezoneSchema,
} from './enums.js';

export const isoDateTimeSchema = z.iso
  .datetime()
  .meta({ description: 'UTC-строка', example: '2026-11-08T09:03:41.078Z' });
export type ISODateTime = z.infer<typeof isoDateTimeSchema>;

export const isoDateSchema = z.iso.date().meta({ example: '2026-11-02' });
export type ISODate = z.infer<typeof isoDateSchema>;

/**
 * Union вместо `.nullable()`: на именованной схеме генератор OpenAPI выдаёт `allOf`,
 * и по такому описанию null становится недопустимым, а типы фронта получаются неверными.
 */
const nullableRef = <T extends z.ZodType>(schema: T) => z.union([schema, z.null()]);

const statusValuesSchema = z
  .object({
    todo: z.number(),
    work: z.number(),
    review: z.number(),
    test: z.number(),
    done: z.number(),
  })
  .meta({ id: 'StatusValues', description: 'Значение по каждому статусу задачи' });

export const healthResponseSchema = z
  .object({
    status: z.literal('ok'),
    time: isoDateTimeSchema,
  })
  .meta({ id: 'HealthResponse' });
export type HealthResponse = z.infer<typeof healthResponseSchema>;

export const userBriefSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    job: z.string(),
    colorIndex: z.number().int().describe('Цвет аватара, 0..5. Инициалы и цвет считает фронт'),
  })
  .meta({ id: 'UserBrief' });
export type UserBrief = z.infer<typeof userBriefSchema>;

export const boardMemberSchema = userBriefSchema
  .extend({
    email: z.string(),
    role: boardRoleSchema,
    addedAt: isoDateTimeSchema,
  })
  .meta({ id: 'BoardMember' });
export type BoardMember = z.infer<typeof boardMemberSchema>;

export const meSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
    job: z.string(),
    timezone: timezoneSchema,
    colorIndex: z.number().int(),
    hasPassword: z.boolean().describe('false значит, что currentPassword при смене пароля не нужен'),
    hasGithub: z.boolean(),
    hasGoogle: z.boolean(),
  })
  .meta({ id: 'Me' });
export type Me = z.infer<typeof meSchema>;

export const authResponseSchema = z
  .object({
    accessToken: z.string().describe('JWT на 15 минут. Хранить только в памяти'),
    accessTokenExpiresAt: isoDateTimeSchema,
    user: meSchema,
  })
  .meta({ id: 'AuthResponse' });
export type AuthResponse = z.infer<typeof authResponseSchema>;

export const sprintBriefSchema = z
  .object({
    id: z.string(),
    number: z.number().int(),
    state: sprintStateSchema,
    startDate: isoDateSchema,
    endDate: isoDateSchema,
  })
  .meta({ id: 'SprintBrief' });
export type SprintBrief = z.infer<typeof sprintBriefSchema>;

export const boardListItemSchema = z
  .object({
    id: z.number().int(),
    key: z.string(),
    name: z.string(),
    colorIndex: z.number().int(),
    isFavorite: z.boolean(),
    memberCount: z.number().int(),
    myRole: boardRoleSchema,
    membersPreview: z.array(userBriefSchema).describe('До 4 человек'),
    currentSprintNumber: z.number().int(),
  })
  .meta({ id: 'BoardListItem' });
export type BoardListItem = z.infer<typeof boardListItemSchema>;

export const boardListResponseSchema = z
  .object({
    items: z.array(boardListItemSchema),
    total: z.number().int(),
  })
  .meta({ id: 'BoardListResponse' });
export type BoardListResponse = z.infer<typeof boardListResponseSchema>;

export const boardDetailSchema = z
  .object({
    id: z.number().int(),
    key: z.string(),
    name: z.string(),
    description: z.string(),
    colorIndex: z.number().int(),
    timezone: timezoneSchema,
    isFavorite: z.boolean(),
    myRole: boardRoleSchema,
    members: z
      .array(boardMemberSchema)
      .describe('По addedAt. Источник для чипов, селектов и экрана участников. Гостей в чипы и селекты фронт не выводит'),
    currentSprint: sprintBriefSchema,
  })
  .meta({ id: 'BoardDetail' });
export type BoardDetail = z.infer<typeof boardDetailSchema>;

export const taskTimerSchema = z
  .object({
    statusEnteredAt: isoDateTimeSchema,
    pausedAt: isoDateTimeSchema.nullable().describe('Не null значит, что задача на паузе'),
    pausedTotalSec: z.number().int().describe('Накопленная пауза в текущем статусе'),
    canPause: z.boolean().describe('Статус work, review или test'),
    completedInDays: z.number().int().nullable().describe('Только для done'),
  })
  .meta({
    id: 'TaskTimer',
    description:
      'Подписи считает фронт. X = serverNow - statusEnteredAt - pausedTotalSec. На паузе X = serverNow - pausedAt. ' +
      'serverTime из ответа нужен, чтобы компенсировать разницу часов.',
  });
export type TaskTimer = z.infer<typeof taskTimerSchema>;

export const taskCardSchema = z
  .object({
    id: z.string(),
    key: z.string().meta({ example: 'GWT-101' }),
    boardId: z.number().int(),
    sprintId: z.string(),
    title: z.string(),
    status: taskStatusSchema,
    priority: taskPrioritySchema,
    sp: z.number(),
    createdAt: isoDateTimeSchema,
    timer: taskTimerSchema,
    linkCount: z.number().int(),
    isBlocked: z.boolean().describe('Задача не в done и есть связь blockedBy с задачей не в done'),
    isTakeLocked: z.boolean().describe('Администратор запретил брать задачу в работу'),
    people: z.object({
      author: userBriefSchema,
      reviewer: userBriefSchema,
      tester: nullableRef(userBriefSchema),
      designer: nullableRef(userBriefSchema),
    }),
  })
  .meta({ id: 'TaskCard' });
export type TaskCard = z.infer<typeof taskCardSchema>;

export const boardTasksResponseSchema = z
  .object({
    sprint: sprintBriefSchema,
    items: z.array(taskCardSchema),
    serverTime: isoDateTimeSchema,
  })
  .meta({ id: 'BoardTasksResponse' });
export type BoardTasksResponse = z.infer<typeof boardTasksResponseSchema>;

export const taskLinkItemSchema = z
  .object({
    type: taskLinkTypeSchema,
    task: z.object({
      key: z.string(),
      title: z.string(),
      status: taskStatusSchema,
      boardName: z.string(),
      canOpen: z.boolean().describe('Состоит ли смотрящий в доске связанной задачи'),
    }),
  })
  .meta({ id: 'TaskLinkItem' });
export type TaskLinkItem = z.infer<typeof taskLinkItemSchema>;

export const taskCommentSchema = z
  .object({
    id: z.string(),
    author: userBriefSchema,
    text: z.string(),
    createdAt: isoDateTimeSchema,
  })
  .meta({ id: 'TaskComment' });
export type TaskComment = z.infer<typeof taskCommentSchema>;

export const taskDetailSchema = taskCardSchema
  .extend({
    description: z.string(),
    board: z.object({ id: z.number().int(), key: z.string(), name: z.string() }),
    sprint: sprintBriefSchema,
    myRole: boardRoleSchema.describe('На экран можно попасть по ссылке, минуя доску'),
    links: z.array(taskLinkItemSchema),
    comments: z.array(taskCommentSchema).describe('От старых к новым'),
    assigneeOptions: z
      .array(userBriefSchema)
      .describe('Участники доски без гостей плюс нынешние роли задачи, даже удалённые с доски'),
    serverTime: isoDateTimeSchema,
  })
  .meta({ id: 'TaskDetail' });
export type TaskDetail = z.infer<typeof taskDetailSchema>;

export const taskRowSchema = z
  .object({
    id: z.string(),
    key: z.string(),
    title: z.string(),
    board: z.object({ id: z.number().int(), name: z.string() }),
    roles: z.array(taskRoleSchema),
    status: taskStatusSchema,
    priority: taskPrioritySchema,
    sp: z.number(),
    createdAt: isoDateTimeSchema,
    timer: taskTimerSchema,
  })
  .meta({ id: 'TaskRow' });
export type TaskRow = z.infer<typeof taskRowSchema>;

export const myTasksResponseSchema = z
  .object({
    items: z.array(taskRowSchema),
    page: z.number().int(),
    pageSize: z.number().int(),
    total: z.number().int().describe('С учётом фильтров'),
    summary: z
      .object({ totalCount: z.number().int(), totalSp: z.number() })
      .describe('Без учёта фильтров'),
    serverTime: isoDateTimeSchema,
  })
  .meta({ id: 'MyTasksResponse' });
export type MyTasksResponse = z.infer<typeof myTasksResponseSchema>;

export const taskSearchItemSchema = z
  .object({
    key: z.string(),
    title: z.string(),
    status: taskStatusSchema,
    board: z.object({ id: z.number().int(), name: z.string() }),
  })
  .meta({ id: 'TaskSearchItem' });
export type TaskSearchItem = z.infer<typeof taskSearchItemSchema>;

export const taskSearchResponseSchema = z
  .object({ items: z.array(taskSearchItemSchema) })
  .meta({ id: 'TaskSearchResponse' });
export type TaskSearchResponse = z.infer<typeof taskSearchResponseSchema>;

export const userSearchResponseSchema = z
  .object({ items: z.array(userBriefSchema) })
  .meta({ id: 'UserSearchResponse' });
export type UserSearchResponse = z.infer<typeof userSearchResponseSchema>;

export const navSummarySchema = z
  .object({
    boardsTotal: z.number().int(),
    board: z
      .object({
        id: z.number().int(),
        name: z.string(),
        sprintNumber: z.number().int(),
        statusCounts: statusValuesSchema,
      })
      .nullable()
      .describe('null, если у пользователя нет досок'),
    myTasks: z.object({
      openCount: z.number().int(),
      openSp: z.number(),
      next: z.array(z.object({ key: z.string(), title: z.string() })).describe('До 3 задач'),
    }),
    kpi: z
      .object({
        sprintNumber: z.number().int(),
        donePct: z.number(),
        remaining: z.array(z.number()).describe('remainingSp по дням от 0 до todayIndex'),
      })
      .nullable()
      .describe('null, если у пользователя нет досок'),
  })
  .meta({ id: 'NavSummary' });
export type NavSummary = z.infer<typeof navSummarySchema>;

export const myTaskStatsSchema = z
  .object({
    open: z.number().int(),
    closed: z.number().int(),
    totalSp: z.number(),
    nextOpen: z
      .array(z.object({ key: z.string(), title: z.string(), priority: taskPrioritySchema }))
      .describe('До 4 задач'),
  })
  .meta({ id: 'MyTaskStats' });
export type MyTaskStats = z.infer<typeof myTaskStatsSchema>;

export const sprintListItemSchema = sprintBriefSchema
  .extend({
    doneSp: z.number(),
    scopeSp: z.number(),
  })
  .meta({ id: 'SprintListItem' });
export type SprintListItem = z.infer<typeof sprintListItemSchema>;

export const sprintListResponseSchema = z
  .object({ items: z.array(sprintListItemSchema) })
  .meta({ id: 'SprintListResponse' });
export type SprintListResponse = z.infer<typeof sprintListResponseSchema>;

export const sprintKpiDaySchema = z
  .object({
    index: z.number().int().describe('0..9, рабочие дни спринта'),
    date: isoDateSchema,
    isPast: z.boolean().describe('index <= todayIndex'),
    idealRemainingSp: z.number().describe('Считается для всех 10 дней'),
    scopeSp: z.number().nullable().describe('null для будущих дней, как и поля ниже'),
    doneSp: z.number().nullable(),
    remainingSp: z.number().nullable(),
    addedSp: z.number().nullable(),
    closedSp: z.number().nullable(),
    flow: statusValuesSchema.nullable().describe('Сумма SP в объёме по статусам'),
  })
  .meta({ id: 'SprintKpiDay' });
export type SprintKpiDay = z.infer<typeof sprintKpiDaySchema>;

export const sprintKpiSchema = z
  .object({
    serverTime: isoDateTimeSchema,
    board: z.object({
      id: z.number().int(),
      key: z.string(),
      name: z.string(),
      colorIndex: z.number().int(),
    }),
    sprint: sprintBriefSchema.extend({
      todayIndex: z.number().int().describe('Наибольший день, который уже начался. В субботу это индекс пятницы'),
      dayNumber: z.number().int().describe('todayIndex + 1'),
      totalDays: z.literal(10),
    }),
    isEmpty: z.boolean().describe('В спринте нет ни одной задачи'),
    summary: z.object({
      scopeSp: z.number(),
      doneSp: z.number(),
      donePct: z.number(),
      committedSp: z.number().describe('Объём на конец первого дня'),
      addedSp: z.number(),
      addedCount: z.number().int(),
      paceSpPerDay: z.number(),
      forecastDoneSp: z.number().nullable().describe('Только активный спринт'),
      forecastRemainingSp: z.number().nullable().describe('Только активный спринт, конец пунктира'),
      medianCycleDays: z.number(),
    }),
    days: z.array(sprintKpiDaySchema).describe('Всегда 10'),
    byStatus: statusValuesSchema,
    stages: z
      .array(z.object({ status: stageStatusSchema, avgDays: z.number() }))
      .describe('Порядок work, review, test'),
    slowestStage: nullableRef(stageStatusSchema).describe('null, если все этапы по нулям'),
    velocity: z.object({
      items: z
        .array(
          z.object({
            number: z.number().int(),
            startDate: isoDateSchema,
            endDate: isoDateSchema,
            plannedSp: z.number(),
            doneSp: z.number(),
            isActive: z.boolean(),
          }),
        )
        .describe('До 6 спринтов, заканчивая выбранным'),
      averageDoneSp: z.number().nullable().describe('Только по закрытым'),
    }),
    team: z
      .array(
        z.object({
          user: userBriefSchema,
          doneSp: z.number(),
          reviewsCount: z.number().int(),
          testsCount: z.number().int(),
        }),
      )
      .describe('По doneSp, по убыванию'),
  })
  .meta({ id: 'SprintKpi' });
export type SprintKpi = z.infer<typeof sprintKpiSchema>;
