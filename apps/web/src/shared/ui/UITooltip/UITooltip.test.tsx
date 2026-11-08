import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { UIPopover } from '../UIPopover';
import { UITooltip } from './UITooltip';

describe('UITooltip', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const hover = () => {
    fireEvent.mouseEnter(document.querySelector('[data-name="UITooltip"]') as Element);
    act(() => { vi.advanceTimersByTime(300); });
  };

  it('появляется после задержки и связывается с триггером', () => {
    render(<UITooltip content="Подсказка"><button type="button">Кнопка</button></UITooltip>);
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    hover();
    expect(screen.getByRole('button')).toHaveAccessibleDescription('Подсказка');
  });

  it('уход мыши отменяет ещё не показанную подсказку', () => {
    render(<UITooltip content="Подсказка"><button type="button">Кнопка</button></UITooltip>);
    const root = document.querySelector('[data-name="UITooltip"]') as Element;
    fireEvent.mouseEnter(root);
    fireEvent.mouseLeave(root);
    act(() => { vi.advanceTimersByTime(1000); });
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('Escape закрывает подсказку', () => {
    render(<UITooltip content="Подсказка"><button type="button">Кнопка</button></UITooltip>);
    hover();
    fireEvent.keyDown(document.body, { key: 'Escape' });
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('пустой контент подсказку не показывает', () => {
    render(<UITooltip content=""><button type="button">Кнопка</button></UITooltip>);
    hover();
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('размонтирование снимает таймер', () => {
    const { unmount } = render(<UITooltip content="Подсказка"><button type="button">Кнопка</button></UITooltip>);
    fireEvent.mouseEnter(document.querySelector('[data-name="UITooltip"]') as Element);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe('UIPopover', () => {
  const setup = (onClick?: () => void) =>
    render(
      <UIPopover trigger={<button type="button" onClick={onClick}>Открыть</button>} ariaLabel="Фильтры">
        <button type="button">Внутри</button>
      </UIPopover>,
    );

  const trigger = () => screen.getByRole('button', { name: 'Открыть' });

  it('триггер открывает и закрывает панель, сохраняя свой onClick', () => {
    const onClick = vi.fn();
    setup(onClick);
    fireEvent.click(trigger());
    expect(screen.getByRole('dialog', { name: 'Фильтры' })).toBeInTheDocument();
    expect(trigger()).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(trigger());
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(onClick).toHaveBeenCalledTimes(2);
  });

  it('клик внутри панели её не закрывает', () => {
    setup();
    fireEvent.click(trigger());
    const inside = screen.getByRole('button', { name: 'Внутри' });
    fireEvent.pointerDown(inside);
    fireEvent.click(inside);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('закрывается по клику снаружи и Escape, возвращая фокус', () => {
    setup();
    trigger().focus();
    fireEvent.click(trigger());
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    fireEvent.click(trigger());
    fireEvent.keyDown(document.body, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger()).toHaveFocus();
  });
});
