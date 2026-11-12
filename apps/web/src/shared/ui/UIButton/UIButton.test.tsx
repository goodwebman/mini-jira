import { createRef } from 'react';

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { UIButton } from './UIButton';

describe('UIButton', () => {
  it('по умолчанию type="button": не отправляет форму случайно', () => {
    const onSubmit = vi.fn((event: React.FormEvent) => {
      event.preventDefault();
    });
    render(
      <form onSubmit={onSubmit}>
        <UIButton>Кнопка</UIButton>
      </form>,
    );
    fireEvent.click(screen.getByRole('button'));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('loading блокирует клик, показывает спиннер и aria-busy', () => {
    const onClick = vi.fn();
    const { container } = render(
      <UIButton loading onClick={onClick}>
        Сохранить
      </UIButton>,
    );
    const button = screen.getByRole('button');

    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(
      container.querySelector('[data-icon="spinner"]'),
    ).toBeInTheDocument();
    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('className вызывающего перебивает классы варианта', () => {
    render(
      <UIButton size='sm' className='h-control'>
        Кнопка
      </UIButton>,
    );
    const button = screen.getByRole('button');
    expect(button).toHaveClass('h-control');
    expect(button).not.toHaveClass('h-control-sm');
  });

  it('пробрасывает ref и строит data-name из testId', () => {
    const ref = createRef<HTMLButtonElement>();
    render(
      <UIButton ref={ref} testId='save'>
        Кнопка
      </UIButton>,
    );
    expect(ref.current).toHaveAttribute('data-name', 'UIButton-save');
  });
});
