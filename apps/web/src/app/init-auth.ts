import { authService, bindAuthToQueryClient } from '@/entities/auth';
import { configureApiTransport } from '@/shared/api';

import {
  bindAuthMonitoring,
  bindQueryMonitoring,
  bindRenderErrorMonitoring,
} from './bind-monitoring';
import { monitoring } from './monitoring';
import { queryClient } from './query/queryClient';

configureApiTransport(authService.fetch);
const unbindQueryClient = bindAuthToQueryClient(authService, queryClient);
const unbindMonitoring = bindAuthMonitoring(
  authService,
  monitoring,
  (user) => user.id,
);
const unbindQueries = bindQueryMonitoring(queryClient, monitoring);
const unbindRender = bindRenderErrorMonitoring(monitoring);
import.meta.hot?.dispose(() => {
  unbindQueryClient();
  unbindMonitoring();
  unbindQueries();
  unbindRender();
});
void authService.bootstrap();
authService.startPolling();
