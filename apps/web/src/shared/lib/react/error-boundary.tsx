import { Component, type ErrorInfo, type ReactNode } from 'react';

export interface IErrorBoundaryFallbackProps {
  /** Брошено может быть что угодно, не только `Error`. */
  readonly error: unknown;
  /** Сбросить ошибку и отрисовать детей заново. */
  readonly reset: () => void;
}

export interface IErrorBoundaryProps {
  readonly children?: ReactNode;
  /** Статичный запасной экран. Игнорируется, если передан `fallbackRender`. */
  readonly fallback?: ReactNode;
  /** Запасной экран с доступом к ошибке и сбросу. */
  readonly fallbackRender?: (props: IErrorBoundaryFallbackProps) => ReactNode;
  /** Сообщить о пойманной ошибке: мониторинг, логи. */
  readonly onError?: (error: unknown, info: ErrorInfo) => void;
  /** Вызывается перед сбросом: кнопкой `reset` или сменой `resetKeys`. */
  readonly onReset?: () => void;
  /**
   * Смена любого значения (сравнение `Object.is`) сбрасывает ошибку:
   * например, переход на другую задачу не должен показывать ошибку прошлой.
   */
  readonly resetKeys?: readonly unknown[];
}

interface ErrorBoundaryState {
  /** Отдельный флаг: `throw null` и `throw undefined` — тоже ошибки. */
  readonly hasError: boolean;
  readonly error: unknown;
}

const INITIAL_STATE: ErrorBoundaryState = { hasError: false, error: null };

function keysChanged(
  previous: readonly unknown[] = [],
  next: readonly unknown[] = [],
): boolean {
  return (
    previous.length !== next.length ||
    previous.some((value, index) => !Object.is(value, next[index]))
  );
}

/**
 * Граница ошибок рендера. Классовый компонент вынужденно: у React нет хука
 * для `getDerivedStateFromError` и `componentDidCatch`. Невизуальная
 * инфраструктура, поэтому живёт в `shared/lib`, а не в UI-ките.
 *
 * Ловит ошибки рендера, жизненного цикла и `throw` из suspense-запросов.
 * Не ловит ошибки обработчиков событий, `setTimeout` и промисов вне рендера.
 *
 * @example
 * <ErrorBoundary
 *   resetKeys={[taskKey]}
 *   onError={report}
 *   fallbackRender={({ error, reset }) => <UIRequestError error={error} retry={reset} />}
 * >
 *   <TaskScreen />
 * </ErrorBoundary>
 */
export class ErrorBoundary extends Component<
  IErrorBoundaryProps,
  ErrorBoundaryState
> {
  override state: ErrorBoundaryState = INITIAL_STATE;

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return { hasError: true, error };
  }

  override componentDidCatch(error: unknown, info: ErrorInfo): void {
    this.props.onError?.(error, info);
  }

  override componentDidUpdate(
    previousProps: IErrorBoundaryProps,
    previousState: ErrorBoundaryState,
  ): void {
    // Сбрасываем только уже показанную ошибку: в рендере, где она возникла,
    // ключи могли смениться вместе с ней — тогда сброс зациклил бы падение.
    if (
      this.state.hasError &&
      previousState.hasError &&
      keysChanged(previousProps.resetKeys, this.props.resetKeys)
    )
      this.reset();
  }

  reset = (): void => {
    this.props.onReset?.();
    this.setState(INITIAL_STATE);
  };

  override render(): ReactNode {
    const { hasError, error } = this.state;
    const { children, fallback = null, fallbackRender } = this.props;
    if (!hasError) return children;
    return fallbackRender
      ? fallbackRender({ error, reset: this.reset })
      : fallback;
  }
}
