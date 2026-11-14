// Только для тестов: продуктовый код этот сегмент не импортирует, в сборку он не попадает.
export {
  apiError,
  type ApiMock,
  createApiMock,
  type MockCall,
} from './api-mock';
export * from './fixtures';
export { createTestQueryClient, renderAt, renderRoutes } from './render';
export { LocationProbe } from './LocationProbe';
export { TestProviders } from './TestProviders';
