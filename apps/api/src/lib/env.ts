import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.url(),
  DATABASE_URL_UNPOOLED: z.url(),
  JWT_ACCESS_SECRET: z
    .string()
    .refine((value) => Buffer.byteLength(value) >= 32),
  SALT_SECRET: z.string().refine((value) => Buffer.byteLength(value) >= 32),
  // Сравнивается с заголовком Origin побайтно, поэтому путь и слэш на конце недопустимы.
  APP_URL: z
    .string()
    .refine((value) => URL.canParse(value) && new URL(value).origin === value),
  GITHUB_CLIENT_ID: z.string().min(1),
  GITHUB_CLIENT_SECRET: z.string().min(1),
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(
  source: Record<string, string | undefined> = process.env,
): Env {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    // Только имена: значения переменных в логи не попадают.
    const names = [
      ...new Set(parsed.error.issues.map((issue) => issue.path.join('.'))),
    ];
    throw new Error(`Неверные переменные окружения: ${names.join(', ')}`);
  }
  return parsed.data;
}
