/** Тесткейсы: оценка уходит по Enter и потере фокуса; неверный ввод подсвечен и не уходит; Escape возвращает исходное; то же значение не отправляется. */
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { TaskSpField } from './TaskSpField';

const setup = () => {
  const onCommit = vi.fn();
  render(<TaskSpField id='sp' value={3} onCommit={onCommit} />);
  return { onCommit, input: screen.getByRole('textbox') };
};

describe('TaskSpField', () => {
  it('показывает текущую оценку и отправляет новую по Enter', () => {
    const { onCommit, input } = setup();
    expect(input).toHaveValue('3');
    fireEvent.change(input, { target: { value: '2,5' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onCommit).toHaveBeenCalledWith(2.5);
  });

  it('неверная оценка подсвечена и не уходит даже по blur', () => {
    const { onCommit, input } = setup();
    fireEvent.change(input, { target: { value: '0' } });
    fireEvent.blur(input);
    expect(onCommit).not.toHaveBeenCalled();
    expect(screen.getByText('Введите число больше 0')).toBeInTheDocument();
  });

  it('Escape отменяет правку, то же значение не отправляется', () => {
    const { onCommit, input } = setup();
    fireEvent.change(input, { target: { value: '8' } });
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(input).toHaveValue('3');
    fireEvent.change(input, { target: { value: '3' } });
    fireEvent.blur(input);
    expect(onCommit).not.toHaveBeenCalled();
  });
});
