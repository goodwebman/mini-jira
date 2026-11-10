import { authService } from '@/entities/auth';
import { configureApiTransport } from '@/shared/api';

configureApiTransport(authService.fetch);
void authService.bootstrap();
authService.startPolling();
