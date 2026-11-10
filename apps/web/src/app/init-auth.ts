import { authService } from '../entities/auth';
import { configureHttp } from '../shared/api/http';

configureHttp(authService.fetch);
void authService.bootstrap();
authService.startPolling();
