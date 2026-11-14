/**
 * Тесткейсы: без ошибки — дети; ошибка рендера — fallbackRender с ошибкой, onError с componentStack;
 * статичный fallback; reset из запасного экрана рисует детей заново и зовёт onReset;
 * смена resetKeys сбрасывает показанную ошибку, те же ключи — нет; `throw null` тоже ошибка.
 */
import { useState } from 'react';

import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ErrorBoundary } from './error-boundary';

let shouldThrow: unknown = null;
let throwing = false;

function Child() {
  if (throwing) throw shouldThrow;
  return <span>дети</span>;
}

beforeEach(() => {
  throwing = false;
  shouldThrow = new Error('упало');
  // React пишет пойманные ошибки в консоль: в тестах это шум
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('ErrorBoundary', () => {
  it('без ошибки рисует детей', () => {
    render(
      <ErrorBoundary fallback={<span>запасной</span>}>
        <Child />
      </ErrorBoundary>,
    );
    expect(screen.getByText('дети')).toBeInTheDocument();
  });

  it('ошибка: запасной экран с ошибкой и сообщение со стеком компонентов', () => {
    throwing = true;
    const onError = vi.fn();
    render(
      <ErrorBoundary
        onError={onError}
        fallbackRender={({ error }) => (
          <span>{error instanceof Error ? error.message : 'другое'}</span>
        )}
      >
        <Child />
      </ErrorBoundary>,
    );
    expect(screen.getByText('упало')).toBeInTheDocument();
    expect(onError).toHaveBeenCalledExactlyOnceWith(
      shouldThrow,
      expect.objectContaining({ componentStack: expect.any(String) }),
    );
  });

  it('статичный fallback и throw null', () => {
    throwing = true;
    shouldThrow = null;
    render(
      <ErrorBoundary fallback={<span>запасной</span>}>
        <Child />
      </ErrorBoundary>,
    );
    expect(screen.getByText('запасной')).toBeInTheDocument();
  });

  it('reset из запасного экрана рисует детей заново', () => {
    throwing = true;
    const onReset = vi.fn();
    render(
      <ErrorBoundary
        onReset={onReset}
        fallbackRender={({ reset }) => (
          <button type='button' onClick={reset}>
            Повторить
          </button>
        )}
      >
        <Child />
      </ErrorBoundary>,
    );
    throwing = false;
    fireEvent.click(screen.getByRole('button', { name: 'Повторить' }));
    expect(onReset).toHaveBeenCalledOnce();
    expect(screen.getByText('дети')).toBeInTheDocument();
  });

  it('сбрасывается сменой resetKeys, но не теми же ключами', () => {
    throwing = true;
    function Harness() {
      const [key, setKey] = useState(1);
      const [tick, setTick] = useState(0);
      return (
        <>
          <button type='button' onClick={() => setKey(key + 1)}>
            другой ключ
          </button>
          <button type='button' onClick={() => setTick(tick + 1)}>
            тот же ключ
          </button>
          <ErrorBoundary resetKeys={[key]} fallback={<span>запасной</span>}>
            <Child />
          </ErrorBoundary>
        </>
      );
    }
    render(<Harness />);
    throwing = false;
    fireEvent.click(screen.getByRole('button', { name: 'тот же ключ' }));
    expect(screen.getByText('запасной')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'другой ключ' }));
    expect(screen.getByText('дети')).toBeInTheDocument();
  });
});
