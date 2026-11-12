import { useState } from 'react';

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { UISegmented } from './UISegmented';

type Value = 'a' | 'b' | 'c';

const options = [
  { value: 'a', label: 'Раз' },
  { value: 'b', label: 'Два', disabled: true },
  { value: 'c', label: 'Три' },
] as const;

function Controlled({ initial }: { initial?: Value }) {
  const [value, setValue] = useState<undefined | Value>(initial);
  return (
    <UISegmented
      aria-label='Выбор'
      options={options}
      value={value}
      onValueChange={setValue}
    />
  );
}

describe('UISegmented', () => {
  it('размечен как radiogroup и отмечает выбранное', () => {
    render(<Controlled initial='c' />);
    expect(
      screen.getByRole('radiogroup', { name: 'Выбор' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Три' })).toBeChecked();
  });

  it('вызывает onValueChange по клику', () => {
    const onValueChange = vi.fn();
    render(
      <UISegmented options={options} value='a' onValueChange={onValueChange} />,
    );
    fireEvent.click(screen.getByRole('radio', { name: 'Три' }));
    expect(onValueChange).toHaveBeenCalledWith('c');
  });

  it('стрелки пропускают disabled, зацикливаются и переносят фокус', () => {
    render(<Controlled initial='a' />);
    const first = screen.getByRole('radio', { name: 'Раз' });
    const last = screen.getByRole('radio', { name: 'Три' });

    first.focus();
    fireEvent.keyDown(first, { key: 'ArrowRight' });
    expect(last).toBeChecked();
    expect(last).toHaveFocus();

    fireEvent.keyDown(last, { key: 'ArrowRight' });
    expect(first).toBeChecked();
    expect(first).toHaveFocus();
  });

  it('Home и End ведут к краям', () => {
    render(<Controlled initial='a' />);
    const first = screen.getByRole('radio', { name: 'Раз' });
    const last = screen.getByRole('radio', { name: 'Три' });
    fireEvent.keyDown(first, { key: 'End' });
    expect(last).toBeChecked();
    fireEvent.keyDown(last, { key: 'Home' });
    expect(first).toBeChecked();
  });

  it('Tab попадает в группу, даже если ничего не выбрано', () => {
    render(<Controlled />);
    expect(screen.getByRole('radio', { name: 'Раз' })).toHaveAttribute(
      'tabindex',
      '0',
    );
    expect(screen.getByRole('radio', { name: 'Три' })).toHaveAttribute(
      'tabindex',
      '-1',
    );
  });
});
