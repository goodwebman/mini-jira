import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { UIDrawer } from './UIDrawer';

describe('UIDrawer', () => {
  it('не рендерится, пока закрыт', () => {
    render(<UIDrawer open={false} onOpenChange={() => {}} title='Доски' />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('именуется заголовком и закрывается по Escape и фону', () => {
    const onOpenChange = vi.fn();
    render(
      <UIDrawer open onOpenChange={onOpenChange} title='Доски'>
        <button type='button'>Строка</button>
      </UIDrawer>,
    );
    expect(screen.getByRole('dialog', { name: 'Доски' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Строка' })).toHaveFocus();

    fireEvent.keyDown(document.body, { key: 'Escape' });
    fireEvent.click(
      document.querySelector('[data-name="UIDrawerOverlay"]') as Element,
    );
    expect(onOpenChange).toHaveBeenCalledTimes(2);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
