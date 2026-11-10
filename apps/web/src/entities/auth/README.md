# entities/auth: авторизация

Сервис сессии и авторизованных запросов. Ядро в `lib/` не знает ни про фреймворк, ни про проект, ни про способ авторизации: способ подключается стратегией, библиотека запросов адаптером. Папка `lib/` переносится в другой проект копированием.

```
entities/auth/
├── index.ts            публичный API слайса
├── model/              экземпляр сервиса для mini-jira
├── api/                ручки mini-jira и подпись входа
└── lib/                переносимое ядро, наружу не импортирует ничего
    ├── auth-service.ts класс AuthService: сессия, гонки, конвейер запросов
    ├── strategies/     Bearer/JWT, access+refresh, cookie-сессия, API-ключ, Basic, Digest, SSO
    ├── adapters/       fetch, axios, TanStack Query, RTK Query, GraphQL
    └── platform/       браузерные API за интерфейсом: SSR и тесты работают без window
```

Граница ядра закреплена в `eslint.config.js`: импорт React, axios, кода приложения или обращение к `window` и `localStorage` внутри `lib/` не пройдут линт.

## Быстрый старт

Нужны `VITE_APP_VERSION` и `VITE_AUTH_SALT`, см. `apps/web/.env.example`.

```ts
import { authService, isAuthError } from '@/entities/auth';

// Один раз при запуске приложения
void authService.bootstrap();
authService.startPolling();

// Запросы: токен, refresh при 401 и повтор происходят сами
const response = await authService.fetch('/api/v1/boards');

// Вход и выход
try {
  await authService.login({ kind: 'password', email, password, remember: true });
} catch (error) {
  if (isAuthError(error) && error.serverCode === 'INVALID_CREDENTIALS') showWrongPassword();
}
await authService.login({ sso: 'google', returnTo: '/boards' });
await authService.logout();
```

React подключается одной строкой, отдельный хук ядру не нужен:

```tsx
const { status, user } = useSyncExternalStore(authService.subscribe, authService.getSnapshot);
```

| `status` | Что значит | Что показать |
| --- | --- | --- |
| `unknown` | Сессия ещё не проверена. Если в `error` лежит причина, сервер не ответил, и сервис сам повторит запрос | Скелетон или «нет связи». Не форму входа |
| `authenticated` | Сессия есть. `user` может быть `null`, пока профиль догружается | Приложение |
| `guest` | Сессии нет | Форму входа |

События для всего, что не про отрисовку, приходят через `authService.on(listener)`: `ready`, `login`, `logout`, `kick`, `user`, `renewed`.

## Подключение к библиотекам

Всё, что принимает свой `fetch`, подключается без адаптера: ky, ofetch, openapi-fetch, Apollo, urql.

```ts
// TanStack Query. Транспорт не нужен, только сброс кэша
bindAuthToQueryClient(authService, queryClient);
useQuery({
  queryKey: ['boards'],
  retry: shouldRetryQuery,
  queryFn: async ({ signal }) => (await authService.fetch('/api/v1/boards', { signal })).json(),
});

// RTK Query
const api = createApi({
  baseQuery: fetchBaseQuery({ baseUrl: '/api/v1', fetchFn: authService.fetch }),
  endpoints: (build) => ({ /* ... */ }),
});
bindAuthToRtkQuery(authService, store, api);

// axios. Функция возвращает отключение
const detach = attachAuthToAxios(authService, axios.create({ baseURL: '/api/v1' }));

// GraphQL отвечает 200 и на просроченный токен, поэтому нужен настоящий статус
const fetchGraphql = createAuthFetch(authService, { effectiveStatus: graphqlEffectiveStatus });
const client = new GraphQLClient('/graphql', { fetch: fetchGraphql });

// Свой клиент
const data = await authService.execute(
  { url: '/api/v1/me', method: 'GET' },
  (attempt) => myClient.get('/api/v1/me', { headers: attempt.headers }),
);
```

Кэш запросов сбрасывается только на границе сессии: выход, kick, смена пользователя. Без этого следующий пользователь на том же компьютере увидит чужие данные.

Запрос без подписи: `authService.fetch(url, { skipAuth: true })`. Для WebSocket, где заголовок не задать: `const { headers } = await authService.prepare({ url, method: 'GET' })`.

## Стратегии

Защита зависит от способа. Это свойство самого способа, сервис его не исправит.

| Стратегия | Для чего | Где реквизиты | Оценка |
| --- | --- | --- | --- |
| `BearerStrategy` + refresh в cookie | SPA с access и refresh | access в памяти, refresh в httpOnly-cookie | **Рекомендуется** |
| `SessionCookieStrategy` | Серверные сессии | httpOnly-cookie | **Рекомендуется**, нужен CSRF-токен |
| `withSsoRedirect` | Google, GitHub, корпоративный SSO | Обмен кода на сервере, дальше как выше | **Рекомендуется** |
| `BearerStrategy` без refresh | Короткий токен из внешней системы | Память | После перезагрузки вход заново |
| `BearerStrategy` + `persistence` | Нативное приложение | Keychain, Keystore | Только с защищённым хранилищем |
| `DigestStrategy` | Старые API | Память, хэш вместо пароля | Только SHA-256, MD5 подключается явно |
| `BasicStrategy` | Внутренние инструменты | Память | Пароль идёт с каждым запросом, только HTTPS |
| `ApiKeyStrategy` | Сервер-сервер | Память или конфигурация | На веб-странице ключ публичен |

В браузере OAuth PKCE без бэкенда сюда намеренно не входит: IETF рекомендует сначала серверный обмен (BFF), токены в JS остаются доступны XSS. Если нужен, это ещё одна реализация `AuthStrategy` поверх `oidc-client-ts`.

## Как закрыты гонки и сбои

| Ситуация | Что происходит |
| --- | --- |
| N запросов получили 401 | Один refresh, все повторяются с новым токеном |
| Запрос ушёл во время refresh | Ждёт его и уходит сразу с новым токеном |
| 401 пришёл на уже заменённый токен | Без refresh и kick, просто повтор |
| Новый токен тоже отвергнут | Ровно один повтор, затем kick. Цикла нет |
| Несколько вкладок одновременно | Refresh, вход и восстановление идут по одному через Web Locks |
| Вкладка заморожена и держит блокировку | Остальные идут без неё по таймауту, сервер прикрывает окном на гонку |
| Выход или вход другого пользователя, пока летел запрос | Результат выбрасывается, сессия не воскресает |
| Запрос пользователя A, а уже вошёл B | Не повторяется от имени B, ответ отвергается как `session_changed` |
| Выход в одной вкладке | Остальные закрываются сразу через BroadcastChannel |
| В соседней вкладке вошёл другой человек | Граница сессии: новый токен, сброс кэшей |
| Сеть, 5xx или 429 на refresh | Сессия жива, ошибка повторяемая, пауза растёт, `Retry-After` учитывается |
| Сеть упала при запуске | `unknown` с причиной вместо ложного гостя, повтор сам |
| Зависший refresh или logout | Таймаут освобождает очередь, сессия не закрывается |
| Отмена одного запроса | Общий refresh для остальных продолжается |
| Выход без связи с сервером | Флаг в `localStorage`: при следующем старте сессия не поднимется по живой cookie, выход довершится |
| Страница вернулась из bfcache | Сессия сверяется с сервером |
| Часы клиента врут | Срок считается как `exp - iat` от момента получения |
| Токен на чужой адрес | Подписываются только свой origin и `trustedOrigins`. Маски и `http` падают при старте |
| Упавший подписчик | Не ломает выход и остальных подписчиков |

## Что сервис не может

- **Безопасность 100% недостижима.** JS с XSS выполняется от имени пользователя, пока вкладка открыта, и может делать запросы. HttpOnly-cookie защищает от кражи refresh и долгого доступа, но не от действий в реальном времени. Главная защита от этого: CSP и отсутствие XSS.
- **JS не может поставить httpOnly-cookie.** Их выставляет только сервер через `Set-Cookie`, поэтому сервис cookie не хранит и не читает.
- **Состояние на клиенте всегда можно подменить** через devtools. `status` нужен интерфейсу, решения о доступе принимает сервер на каждом запросе.

## Что обязан сервер

- Refresh в cookie с `HttpOnly`, `Secure`, `SameSite=Strict` и узким `Path`.
- Ротация refresh с обнаружением повторного использования и коротким окном на гонку вкладок.
- Короткий access-токен: минуты. У JWT должны быть `iat` и `exp`.
- Проверка `Origin` на ручках с cookie, CSRF-токен, если cookie авторизует обычные запросы.
- 401 только про сессию. Права и гео отвечают 403, иначе пользователя будет выкидывать.
- Для другого origin: `Access-Control-Expose-Headers: Retry-After, WWW-Authenticate`.

## Новый проект

1. Скопировать `lib/`.
2. Описать ручки и создать экземпляр:

```ts
export const authService = new AuthService<User, LoginInput, BearerCredentials>({
  strategy: new BearerStrategy({
    api: {
      login: (input, { signal }) => post('/login', input, signal),
      refresh: ({ signal }) => post('/refresh', undefined, signal),
      logout: ({ signal }) => post('/logout', undefined, signal),
    },
  }),
  identify: (user) => user.id,
  trustedOrigins: ['https://api.example.com'],
});
```

Запросы стратегии идут обычным `fetch`: через авторизованный refresh ждал бы сам себя. Ошибки бросайте через `AuthError.fromResponse`: только 401 означает конец сессии, остальное сессию не закрывает.

Другой способ авторизации это реализация `AuthStrategy`: обязательны `restore`, `login` и `decorate`, остальное по необходимости.

**SSR.** Один экземпляр на запрос с `createMemoryPlatform()` и `destroy()` в конце. Общий экземпляр отдаст токен одного пользователя другому.

**FSD.** `shared` не может импортировать `entities`, а другие сущности друг друга. Поэтому общий HTTP-клиент живёт в `shared/api` и получает авторизованный fetch при старте из слоя `app`:

```ts
// shared/api/http.ts
let client: typeof fetch = (...args) => fetch(...args);
export const configureHttp = (next: typeof fetch) => (client = next);
export const http: typeof fetch = (...args) => client(...args);

// app/providers/auth.ts
configureHttp(authService.fetch);
```

## Проверки

```bash
npm run test -w mini-jira
npm run typecheck -w mini-jira
```

## Подключение в приложении

`main.tsx` импортирует `app/init-auth.ts` один раз вне React StrictMode:
модуль настраивает `shared/api/http.ts`, вызывает bootstrap и запускает polling.
Компоненты читают состояние через `useAuth` из публичного API сущности.
`app/AuthGuard.tsx` скрывает защищённый экран до восстановления сессии,
переводит гостя на `/login` и сохраняет локальный адрес в `returnTo`.
Страница входа поддерживает пароль, регистрацию и OAuth; внешний `returnTo`
отбрасывается. Защищённым содержимым пока остаётся существующая витрина UI.

Локальный `apps/web/.env` содержит версию и SHA256(SALT_SECRET + version).
Серверный SALT_SECRET генерируется случайно и хранится в `apps/api/.env`
либо в переменных окружения хостинга. Оба .env исключены из Git.
Для запуска API также нужны настоящие адреса базы, JWT_ACCESS_SECRET
и учётные данные OAuth из `apps/api/.env.example`.

Refresh восстанавливает cookie после потери ответа: преемник токена вычисляется
через HMAC-SHA256 с JWT_ACCESS_SECRET и префиксом refresh:, в БД остаётся только
его хеш. Повтор в течение 30 секунд получает актуального преемника даже после
дальнейшей ротации. Токены, уже ротированные старым алгоритмом до обновления,
невозможно восстановить; повтор такого токена потребует нового входа.
