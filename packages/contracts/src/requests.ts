import { z } from 'zod';
import {
  boardRoleSchema,
  taskLinkTypeSchema,
  taskPrioritySchema,
  taskRoleSchema,
  taskStatusSchema,
  timezoneSchema,
} from './enums.js';

export const BOARD_KEY_PATTERN = /^[A-Z0-9]{1,6}$/;
export const TASK_KEY_PATTERN = /^[A-Z0-9]{1,6}-\d+$/;

/** Верхняя граница integer в Postgres: большее значение в пути иначе дало бы 500 вместо 400. */
const MAX_INT = 2_147_483_647;

const tooLong = (max: number) => `Не больше ${max} символов`;

const requiredText = (message: string, max: number) =>
  z.string({ error: message }).trim().min(1, message).max(max, tooLong(max));

const emailField = () => {
  const message = 'Введите корректный email';
  return z
    .string({ error: message })
    .trim()
    .max(254, message)
    .pipe(z.email(message))
    .meta({ format: 'email' });
};

const newPasswordField = () => {
  const message = 'Минимум 8 символов';
  return z.string({ error: message }).min(8, message).max(128, 'Максимум 128 символов');
};

const userIdField = (message: string) => z.uuid({ error: message });

const spField = () => {
  const message = 'Введите число больше 0';
  return z
    .number({ error: message })
    .gt(0, message)
    .max(999, message)
    .refine((value) => Math.abs(value * 10 - Math.round(value * 10)) < 1e-9, message)
    .meta({ multipleOf: 0.1, description: 'Оценка: больше 0, не больше 999, один знак после запятой' });
};

const taskTitleField = () => requiredText('Введите название', 255);
const taskDescriptionField = () => z.string().max(20_000, tooLong(20_000));

export const registerBodySchema = z
  .object({
    name: requiredText('Введите имя и фамилию', 100),
    email: emailField(),
    password: newPasswordField(),
    acceptedTerms: z.literal(true, { error: 'Нужно принять условия' }),
  })
  .meta({ id: 'RegisterBody' });
export type RegisterBody = z.infer<typeof registerBodySchema>;

export const loginBodySchema = z
  .object({
    email: emailField(),
    password: z.string({ error: 'Введите пароль' }).min(1, 'Введите пароль'),
    remember: z.boolean().describe('true: сессия на 30 дней. false: на 1 день и сессионная cookie'),
  })
  .meta({ id: 'LoginBody' });
export type LoginBody = z.infer<typeof loginBodySchema>;

export const updateMeBodySchema = z
  .object({
    name: requiredText('Введите имя', 100).optional(),
    email: emailField().optional(),
    job: z.string().trim().max(100, tooLong(100)).optional(),
    timezone: timezoneSchema.optional(),
  })
  .meta({ id: 'UpdateMeBody' });
export type UpdateMeBody = z.infer<typeof updateMeBodySchema>;

export const changePasswordBodySchema = z
  .object({
    currentPassword: z.string().optional().describe('Не нужен, если hasPassword равен false'),
    newPassword: newPasswordField(),
  })
  .meta({ id: 'ChangePasswordBody' });
export type ChangePasswordBody = z.infer<typeof changePasswordBodySchema>;

export const createBoardBodySchema = z
  .object({
    name: requiredText('Введите название', 100),
    key: z
      .string({ error: 'Введите ключ' })
      .regex(BOARD_KEY_PATTERN, 'Введите ключ')
      .meta({ description: 'Ключ доски, неизменяемый', example: 'GWT' }),
    description: z.string().max(2000, tooLong(2000)).optional(),
    memberIds: z.array(z.uuid()).describe('Эти люди получат роль worker. Создатель всегда admin'),
  })
  .meta({ id: 'CreateBoardBody' });
export type CreateBoardBody = z.infer<typeof createBoardBodySchema>;

export const addMemberBodySchema = z
  .object({
    userId: z.uuid(),
    role: boardRoleSchema.optional().describe('По умолчанию worker'),
  })
  .meta({ id: 'AddMemberBody' });
export type AddMemberBody = z.infer<typeof addMemberBodySchema>;

export const updateMemberBodySchema = z
  .object({ role: boardRoleSchema })
  .meta({ id: 'UpdateMemberBody' });
export type UpdateMemberBody = z.infer<typeof updateMemberBodySchema>;

export const createTaskBodySchema = z
  .object({
    title: taskTitleField(),
    description: taskDescriptionField().optional(),
    status: taskStatusSchema.optional().describe('По умолчанию todo. Рабочий создаёт только в todo'),
    priority: taskPrioritySchema.optional().describe('По умолчанию med'),
    sp: spField(),
    authorId: userIdField('Выберите автора').describe('Кто ведёт задачу. Ему идёт вклад в KPI'),
    reviewerId: userIdField('Выберите ревьювера'),
    testerId: z.uuid().nullable().optional(),
    designerId: z.uuid().nullable().optional(),
  })
  .meta({ id: 'CreateTaskBody' });
export type CreateTaskBody = z.infer<typeof createTaskBodySchema>;

export const updateTaskBodySchema = z
  .object({
    title: taskTitleField().optional(),
    description: taskDescriptionField().optional(),
    status: taskStatusSchema.optional(),
    priority: taskPrioritySchema.optional(),
    sp: spField().optional(),
    authorId: userIdField('Выберите автора').optional(),
    reviewerId: userIdField('Выберите ревьювера').optional(),
    testerId: z.uuid().nullable().optional(),
    designerId: z.uuid().nullable().optional(),
  })
  .meta({
    id: 'UpdateTaskBody',
    description: 'Рабочий может прислать только status, иначе весь запрос отклоняется с 403',
  });
export type UpdateTaskBody = z.infer<typeof updateTaskBodySchema>;

const taskKeyField = () => z.string().regex(TASK_KEY_PATTERN).meta({ example: 'GWT-101' });

export const createLinkBodySchema = z
  .object({
    type: taskLinkTypeSchema,
    targetKey: taskKeyField(),
  })
  .meta({ id: 'CreateLinkBody' });
export type CreateLinkBody = z.infer<typeof createLinkBodySchema>;

export const createCommentBodySchema = z
  .object({
    text: requiredText('Введите комментарий', 10_000),
  })
  .meta({ id: 'CreateCommentBody' });
export type CreateCommentBody = z.infer<typeof createCommentBodySchema>;

// Заголовки подписи клиента на входе и регистрации

export const saltHeadersSchema = z.object({
  'fastify-version': z.string().meta({
    description: 'Версия приложения, по ней сервер восстанавливает соль',
    example: '1.0.0',
  }),
  'fastify-timestamp': z.string().meta({
    description: 'Date.now() клиента строкой. Допустимое расхождение с сервером 5 минут',
    example: '1700000000000',
  }),
  'fastify-token': z.string().describe('SHA256(salt + email + timestamp), email как в теле запроса'),
});

// Параметры пути

const positiveInt = () => z.coerce.number().int().positive().max(MAX_INT);

export const boardIdParamSchema = z.object({
  boardId: positiveInt().meta({ description: 'Числовой id доски', example: 9 }),
});
export const boardMemberParamSchema = z.object({
  boardId: positiveInt().meta({ description: 'Числовой id доски', example: 9 }),
  userId: z.uuid().describe('Id участника'),
});
export const sprintNumberParamSchema = z.object({
  boardId: positiveInt().meta({ description: 'Числовой id доски', example: 9 }),
  number: positiveInt().meta({ description: 'Номер спринта на доске', example: 14 }),
});
export const taskKeyParamSchema = z.object({
  key: taskKeyField().describe('Ключ задачи'),
});
export const taskLinkParamSchema = z.object({
  key: taskKeyField().describe('Ключ задачи'),
  targetKey: taskKeyField().describe('Ключ связанной задачи'),
});

// Параметры строки запроса

export const navSummaryQuerySchema = z.object({
  boardId: positiveInt()
    .optional()
    .describe('Без него берётся доска, куда пользователь добавлен последним'),
});

export const myTasksQuerySchema = z.object({
  q: z.string().trim().optional().describe('Поиск по названию и ключу'),
  status: taskStatusSchema.optional(),
  role: taskRoleSchema.optional().describe('Роль пользователя в задаче'),
  page: positiveInt().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
});

export const userSearchQuerySchema = z.object({
  q: z
    .string()
    .trim()
    .refine((value) => value.length === 0 || value.length >= 2, 'Минимум 2 символа')
    .optional()
    .describe('Вхождение в имя или точный email. Пусто: люди с других моих досок. Иначе минимум 2 символа'),
  excludeBoardId: positiveInt()
    .optional()
    .describe('Убрать участников этой доски. Нужна роль admin на ней'),
});

export const boardsQuerySchema = z.object({
  q: z.string().trim().optional().describe('Поиск по названию и ключу'),
  filter: z.enum(['all', 'favorite']).optional(),
});

export const sprintsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(8),
});

export const taskSearchQuerySchema = z.object({
  q: z.string().trim().optional().describe('Поиск по названию и ключу'),
  excludeLinkedTo: taskKeyField()
    .optional()
    .describe('Убрать саму эту задачу и уже связанные с ней'),
  limit: z.coerce.number().int().min(1).max(20).default(6),
});
