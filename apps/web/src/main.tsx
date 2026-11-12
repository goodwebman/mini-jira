// sort-imports-ignore
// Monitoring must initialize before the application module graph.
import './app/monitoring';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import App from './app/App.tsx';
import './app/init-auth';
import { AppProviders } from './app/providers/AppProviders';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProviders>
      <App />
    </AppProviders>
  </StrictMode>,
);
