import { createRef } from 'react';

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Slot } from './slot';

describe('Slot', () => {
  it('по умолчанию рендерит ссылку', () => {
    render(
      <Slot href='/a' className='text-primary'>
        Доски
      </Slot>,
    );
    expect(screen.getByRole('link', { name: 'Доски' })).toHaveAttribute(
      'href',
      '/a',
    );
  });

  it('подменяет тег, склеивает классы и отдаёт контент', () => {
    render(
      <Slot
        className='text-primary'
        aria-current='page'
        render={<button type='button' className='mt-1' />}
      >
        Доски
      </Slot>,
    );
    const button = screen.getByRole('button', { name: 'Доски' });
    expect(button).toHaveClass('text-primary', 'mt-1');
    expect(button).toHaveAttribute('aria-current', 'page');
  });

  it('пропсы самого render важнее пропсов кита', () => {
    render(
      <Slot href='/kit' render={<a href='/own' />}>
        Ссылка
      </Slot>,
    );
    expect(screen.getByRole('link')).toHaveAttribute('href', '/own');
  });

  it('пробрасывает ref в подменённый элемент', () => {
    const ref = createRef<HTMLElement>();
    render(
      <Slot ref={ref} render={<button type='button' />}>
        Кнопка
      </Slot>,
    );
    expect(ref.current?.tagName).toBe('BUTTON');
  });
});
