import { fireEvent, render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { UISwitch } from '@/shared/ui/UISwitch';
import { UICheckbox } from './UICheckbox';

describe('UICheckbox', () => {
  it('переключается кликом по подписи и сообщает значение', () => {
    const onCheckedChange = vi.fn();
    render(<UICheckbox label="Согласен" onCheckedChange={onCheckedChange} />);
    fireEvent.click(screen.getByText('Согласен'));
    expect(onCheckedChange).toHaveBeenCalledWith(true);
    expect(screen.getByRole('checkbox')).toBeChecked();
  });

  it('без подписи не создаёт <label>: его можно вложить в чужой', () => {
    const { container } = render(<UICheckbox aria-label="Выбрать" />);
    expect(container.querySelector('label')).toBeNull();
  });

  it('выставляет indeterminate на DOM-узле и держит его после клика', () => {
    render(<UICheckbox aria-label="Все" indeterminate />);
    const input = screen.getByRole<HTMLInputElement>('checkbox');
    expect(input.indeterminate).toBe(true);
    fireEvent.click(input);
    expect(input.indeterminate).toBe(true);
  });

  it('снимает indeterminate при смене пропа', () => {
    const { rerender } = render(<UICheckbox aria-label="Все" indeterminate />);
    rerender(<UICheckbox aria-label="Все" />);
    expect(screen.getByRole<HTMLInputElement>('checkbox').indeterminate).toBe(false);
  });

  it('disabled не переключается, ref указывает на input', () => {
    const ref = createRef<HTMLInputElement>();
    const onCheckedChange = vi.fn();
    render(<UICheckbox ref={ref} label="Нельзя" disabled onCheckedChange={onCheckedChange} />);
    fireEvent.click(screen.getByText('Нельзя'));
    expect(onCheckedChange).not.toHaveBeenCalled();
    expect(ref.current?.type).toBe('checkbox');
  });
});

describe('UISwitch', () => {
  it('имеет роль switch и сообщает значение', () => {
    const onCheckedChange = vi.fn();
    render(<UISwitch label="Уведомления" onCheckedChange={onCheckedChange} />);
    fireEvent.click(screen.getByRole('switch', { name: 'Уведомления' }));
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  it('работает как controlled', () => {
    render(<UISwitch aria-label="Тумблер" checked onChange={() => {}} />);
    expect(screen.getByRole('switch')).toBeChecked();
  });
});
