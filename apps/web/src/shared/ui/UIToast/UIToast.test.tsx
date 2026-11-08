import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { UIToastProvider, useToast } from './index';

function Trigger({ message = 'Сохранено', duration }: { message?: string; duration?: number }) {
  const { toast } = useToast();
  return (
    <button type="button" onClick={() => toast(message, { duration })}>
      показать
    </button>
  );
}

const show = () => { fireEvent.click(screen.getByRole('button', { name: 'показать' })); };

describe('UIToast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('показывает сообщение в live-регионе', () => {
    render(<UIToastProvider><Trigger /></UIToastProvider>);
    expect(document.querySelector('[aria-live="polite"]')).toBeInTheDocument();
    show();
    expect(screen.getByText('Сохранено').closest('[aria-live="polite"]')).toBeInTheDocument();
  });

  it('скрывается через 4 секунды', () => {
    render(<UIToastProvider><Trigger /></UIToastProvider>);
    show();
    act(() => { vi.advanceTimersByTime(3999); });
    expect(screen.getByText('Сохранено')).toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(1); });
    expect(screen.queryByText('Сохранено')).not.toBeInTheDocument();
  });

  it('duration={0} не скрывается сам', () => {
    render(<UIToastProvider><Trigger duration={0} /></UIToastProvider>);
    show();
    act(() => { vi.advanceTimersByTime(60_000); });
    expect(screen.getByText('Сохранено')).toBeInTheDocument();
  });

  it('показывает не больше трёх: старые вытесняются', () => {
    render(<UIToastProvider><Trigger /></UIToastProvider>);
    show(); show(); show(); show();
    expect(document.querySelectorAll('[data-name="UIToast"]')).toHaveLength(3);
  });

  it('размонтирование не оставляет таймеров', () => {
    const { unmount } = render(<UIToastProvider><Trigger /></UIToastProvider>);
    show();
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('useToast вне провайдера падает с понятной ошибкой', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Trigger />)).toThrow(/UIToastProvider/);
    consoleError.mockRestore();
  });
});
