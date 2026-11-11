import { authService, bindAuthToQueryClient } from '@/entities/auth';
import { configureApiTransport } from '@/shared/api';
import { queryClient } from './query/queryClient';

configureApiTransport(authService.fetch);
const unbindQueryClient = bindAuthToQueryClient(authService, queryClient);
import.meta.hot?.dispose(unbindQueryClient);
void authService.bootstrap();
authService.startPolling();
