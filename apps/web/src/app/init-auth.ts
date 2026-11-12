import { authService, bindAuthToQueryClient } from '@/entities/auth';
import { configureApiTransport } from '@/shared/api';

import { bindAuthMonitoring, bindQueryMonitoring } from './bind-monitoring';
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
import.meta.hot?.dispose(() => {
  unbindQueryClient();
  unbindMonitoring();
  unbindQueries();
});
void authService.bootstrap();
authService.startPolling();
