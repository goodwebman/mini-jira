import { build } from 'vite';

// Native Node работает и в Windows, и в Linux; отдельный cross-env не нужен.
// Анализ использует production env, но не публикует release/source maps в Sentry.
process.env.BUILD_ANALYZE = 'true';
process.env.BUILD_SENTRY_UPLOAD = 'false';
await build({ mode: 'production' });
