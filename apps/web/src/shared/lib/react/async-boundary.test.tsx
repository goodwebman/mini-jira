/**
 * Тесткейсы: загрузка — fallback, потом данные; ошибка рендера уходит в репортёр со стеком,
 * throw null не путается с успешным запросом; ошибка запроса не дублируется;
 * «Повторить» перезапрашивает упавший запрос.
 */
import { useSuspenseQuery } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { configureRenderErrorReporter } from '../report';
import { TestProviders, createTestQueryClient } from '../testing';
import { AsyncBoundary } from './async-boundary';

const reporter = vi.fn();
let unbind: () => void = () => {};

beforeEach(() => {
  reporter.mockReset();
  unbind = configureRenderErrorReporter(reporter);
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => unbind());

function Data({ load }: { readonly load: () => Promise<string> }) {
  const { data } = useSuspenseQuery({ queryKey: ['data'], queryFn: load });
  return <span>{data}</span>;
}

function Broken(): never {
  throw new Error('ошибка рендера');
}

const mount = (children: React.ReactNode, client = createTestQueryClient()) =>
  render(
    <TestProviders client={client}>
      <AsyncBoundary
        fallback={<span>загрузка</span>}
        renderError={({ error, retry }) => (
          <button type='button' onClick={retry}>
            {error instanceof Error ? error.message : 'ошибка'}
          </button>
        )}
      >
        {children}
      </AsyncBoundary>
    </TestProviders>,
  );

describe('AsyncBoundary', () => {
  it('показывает загрузку, потом данные', async () => {
    mount(<Data load={() => Promise.resolve('готово')} />);
    expect(screen.getByText('загрузка')).toBeInTheDocument();
    expect(await screen.findByText('готово')).toBeInTheDocument();
  });

  it('ошибку рендера отправляет в репортёр со стеком компонентов', () => {
    mount(<Broken />);
    expect(
      screen.getByRole('button', { name: 'ошибка рендера' }),
    ).toBeInTheDocument();
    expect(reporter).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ message: 'ошибка рендера' }),
      expect.any(String),
    );
  });

  it('throw null не путает с отсутствием ошибки у успешного запроса', () => {
    const client = createTestQueryClient();
    client.setQueryData(['healthy'], 'готово');
    function ThrowsNull(): never {
      throw null;
    }

    mount(<ThrowsNull />, client);

    expect(screen.getByRole('button', { name: 'ошибка' })).toBeInTheDocument();
    expect(reporter).toHaveBeenCalledExactlyOnceWith(null, expect.any(String));
  });

  it('ошибку запроса не дублирует, «Повторить» перезапрашивает', async () => {
    const load = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new Error('сеть'))
      .mockResolvedValue('со второго раза');
    mount(<Data load={load} />);
    fireEvent.click(await screen.findByRole('button', { name: 'сеть' }));
    expect(await screen.findByText('со второго раза')).toBeInTheDocument();
    expect(reporter).not.toHaveBeenCalled();
    expect(load).toHaveBeenCalledTimes(2);
  });
});
