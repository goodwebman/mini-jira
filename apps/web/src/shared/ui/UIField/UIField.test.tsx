import { fireEvent, render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { UIInput } from '@/shared/ui/UIInput';
import { UISearchInput } from '@/shared/ui/UISearchInput';
import { UISelect } from '@/shared/ui/UISelect';
import { UITextarea } from '@/shared/ui/UITextarea';
import { UIField } from './UIField';

describe('UIField', () => {
  it('связывает подпись с контролом', () => {
    render(<UIField label="Email"><UIInput /></UIField>);
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
  });

  it('связывает подсказку и ошибку через aria-describedby', () => {
    render(<UIField label="Email" hint="Рабочая почта" error="Неверный email"><UIInput /></UIField>);
    const input = screen.getByLabelText('Email');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription('Рабочая почта Неверный email');
    expect(screen.getAllByRole('alert')).toHaveLength(1);
  });

  it('error={true} даёт красную рамку без текста, пустая строка — не ошибка', () => {
    const { rerender } = render(<UIField label="Поле" error><UIInput /></UIField>);
    expect(screen.getByLabelText('Поле')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    rerender(<UIField label="Поле" error=""><UIInput /></UIField>);
    expect(screen.getByLabelText('Поле')).not.toHaveAttribute('aria-invalid');
  });

  it('disabled поля отключает контрол', () => {
    render(<UIField label="Поле" disabled><UIInput /></UIField>);
    expect(screen.getByLabelText('Поле')).toBeDisabled();
  });

  it('работает с Select, Textarea и Search', () => {
    render(
      <>
        <UIField label="Список" error="Ошибка списка"><UISelect options={[]} /></UIField>
        <UIField label="Текст"><UITextarea /></UIField>
        <UIField label="Найти"><UISearchInput /></UIField>
      </>,
    );
    expect(screen.getByLabelText('Список')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText('Текст').tagName).toBe('TEXTAREA');
    // подпись поля не должна перекрываться дефолтным aria-label="Поиск"
    expect(screen.getByRole('searchbox', { name: 'Найти' })).toBeInTheDocument();
  });

  it('показывает пометку «необязательно»', () => {
    render(<UIField label="Описание" optional><UIInput /></UIField>);
    expect(screen.getByText(/необязательно/)).toBeInTheDocument();
  });
});

describe('UIInput', () => {
  it('сам показывает ошибку вне UIField', () => {
    render(<UIInput aria-label="Поле" error="Обязательное поле" />);
    expect(screen.getByLabelText('Поле')).toHaveAccessibleDescription('Обязательное поле');
  });

  it('сохраняет собственный aria-describedby', () => {
    render(<><span id="own">Своё</span><UIInput aria-label="Поле" aria-describedby="own" error="Ошибка" /></>);
    expect(screen.getByLabelText('Поле')).toHaveAccessibleDescription('Своё Ошибка');
  });

  it('пробрасывает ref и обрабатывает ввод', () => {
    const ref = createRef<HTMLInputElement>();
    const onChange = vi.fn();
    render(<UIInput ref={ref} aria-label="Поле" onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('Поле'), { target: { value: 'a' } });
    expect(onChange).toHaveBeenCalledOnce();
    expect(ref.current?.value).toBe('a');
  });

  it('className попадает на input, wrapperClassName — на обёртку', () => {
    const { container } = render(<UIInput aria-label="Поле" className="pl-8" wrapperClassName="max-w-[200px]" />);
    expect(screen.getByLabelText('Поле')).toHaveClass('pl-8');
    expect(container.firstChild).toHaveClass('max-w-[200px]');
  });
});

describe('UISearchInput', () => {
  it('по умолчанию подписан «Поиск»', () => {
    render(<UISearchInput />);
    expect(screen.getByRole('searchbox', { name: 'Поиск' })).toBeInTheDocument();
  });

  it('кнопка очистки появляется только при непустом значении', () => {
    const onClear = vi.fn();
    const { rerender } = render(<UISearchInput value="" onChange={() => {}} onClear={onClear} />);
    expect(screen.queryByRole('button', { name: 'Очистить поиск' })).not.toBeInTheDocument();

    rerender(<UISearchInput value="доска" onChange={() => {}} onClear={onClear} />);
    fireEvent.click(screen.getByRole('button', { name: 'Очистить поиск' }));
    expect(onClear).toHaveBeenCalledOnce();
  });
});

describe('UISelect', () => {
  const options = [
    { value: 'a', label: 'Первый' },
    { value: 'b', label: 'Второй' },
  ];

  it('показывает placeholder, пока ничего не выбрано', () => {
    render(<UISelect aria-label="Список" options={options} placeholder="Выберите" />);
    expect(screen.getByLabelText<HTMLSelectElement>('Список').value).toBe('');
  });

  it('defaultValue важнее placeholder', () => {
    render(<UISelect aria-label="Список" options={options} placeholder="Выберите" defaultValue="b" />);
    expect(screen.getByLabelText<HTMLSelectElement>('Список').value).toBe('b');
  });

  it('вызывает onValueChange и onChange', () => {
    const onValueChange = vi.fn();
    const onChange = vi.fn();
    render(<UISelect aria-label="Список" options={options} onValueChange={onValueChange} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('Список'), { target: { value: 'b' } });
    expect(onValueChange).toHaveBeenCalledWith('b');
    expect(onChange).toHaveBeenCalledOnce();
  });

  it('принимает option через children', () => {
    render(<UISelect aria-label="Список"><option value="x">Икс</option></UISelect>);
    expect(screen.getByRole('option', { name: 'Икс' })).toBeInTheDocument();
  });
});

describe('UITextarea', () => {
  it('считает символы в controlled-режиме', () => {
    render(<UITextarea aria-label="Текст" value="абв" onChange={() => {}} maxLength={10} />);
    expect(screen.getByText('3/10')).toBeInTheDocument();
  });

  it('считает символы в uncontrolled-режиме, начиная с defaultValue', () => {
    render(<UITextarea aria-label="Текст" defaultValue="аб" maxLength={10} />);
    expect(screen.getByText('2/10')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Текст'), { target: { value: 'абвг' } });
    expect(screen.getByText('4/10')).toBeInTheDocument();
  });

  it('без maxLength счётчика нет', () => {
    render(<UITextarea aria-label="Текст" defaultValue="аб" />);
    expect(screen.queryByText(/\/\d+/)).not.toBeInTheDocument();
  });
});
