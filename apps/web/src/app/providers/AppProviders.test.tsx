import { useQueryClient } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { queryClient } from '@/app/query/queryClient';

import { AppProviders } from './AppProviders';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('AppProviders', () => {
  it('provides the existing query client to children', () => {
    function Child() {
      expect(useQueryClient()).toBe(queryClient);
      return <div>Application</div>;
    }
    render(
      <AppProviders>
        <Child />
      </AppProviders>,
    );
    expect(screen.getByText('Application')).toBeInTheDocument();
  });

  it('shows the fallback after a render error and reloads on request', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const reload = vi.fn();
    vi.stubGlobal('location', { reload });
    function BrokenChild(): React.ReactNode {
      throw new Error('Render failed');
    }
    render(
      <AppProviders>
        <BrokenChild />
      </AppProviders>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Что-то пошло не так');
    fireEvent.click(screen.getByRole('button', { name: 'Обновить страницу' }));
    expect(reload).toHaveBeenCalledOnce();
  });
});
