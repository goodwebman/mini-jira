import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config.ts'

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      setupFiles: ['./vitest.setup.ts'],
      include: ['src/**/*.test.{ts,tsx}'],
      // По умолчанию Vitest заменяет любой CSS пустой строкой, даже импорт с ?raw
      css: { include: [/\.css\?raw$/] },
    },
  }),
)
