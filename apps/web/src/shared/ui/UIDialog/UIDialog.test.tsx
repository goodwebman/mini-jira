import { fireEvent, render, screen } from '@testing-library/react';
import { useState, type ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { UIDialog } from './index';

const overlays = () => document.querySelectorAll('[data-name="UIDialogOverlay"]');
const pressEscape = () => fireEvent.keyDown(document.body, { key: 'Escape' });

function Harness({ persistent, children }: { persistent?: boolean; children?: ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <UIDialog open={open} onOpenChange={setOpen}>
      <UIDialog.Content title="Новая доска" description="Описание окна" persistent={persistent}>
        <UIDialog.Body>
          <input aria-label="Название" />
          {children}
        </UIDialog.Body>
        <UIDialog.Footer>
          <UIDialog.Close>Отмена</UIDialog.Close>
        </UIDialog.Footer>
      </UIDialog.Content>
    </UIDialog>
  );
}

function NestedDialog() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => { setOpen(true); }}>вложенное</button>
      <UIDialog open={open} onOpenChange={setOpen}>
        <UIDialog.Content title="Вложенное" />
      </UIDialog>
    </>
  );
}

describe('UIDialog', () => {
  it('не рендерится, пока закрыт', () => {
    render(<UIDialog open={false} onOpenChange={() => {}}><UIDialog.Content title="Окно" /></UIDialog>);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('именуется заголовком и описывается описанием', () => {
    render(<Harness />);
    const dialog = screen.getByRole('dialog', { name: 'Новая доска' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAccessibleDescription('Описание окна');
  });

  it('ставит фокус на первое поле, а не на крестик', () => {
    render(<Harness />);
    expect(screen.getByLabelText('Название')).toHaveFocus();
  });

  it('закрывается по Escape, крестику, фону и кнопке Close', () => {
    const closeBy = (action: () => void) => {
      const { unmount } = render(<Harness />);
      action();
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      unmount();
    };

    closeBy(pressEscape);
    closeBy(() => { fireEvent.click(screen.getByRole('button', { name: 'Закрыть' })); });
    closeBy(() => { fireEvent.click(overlays()[0]); });
    closeBy(() => { fireEvent.click(screen.getByRole('button', { name: 'Отмена' })); });
  });

  it('persistent не закрывается по фону, но закрывается по Escape', () => {
    render(<Harness persistent />);
    fireEvent.click(overlays()[0]);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    pressEscape();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('Close: preventDefault в onClick отменяет закрытие', () => {
    const onClick = vi.fn((event: React.MouseEvent) => { event.preventDefault(); });
    render(
      <UIDialog open onOpenChange={() => { throw new Error('не должно закрыться'); }}>
        <UIDialog.Content title="Окно"><UIDialog.Close onClick={onClick}>Отмена</UIDialog.Close></UIDialog.Content>
      </UIDialog>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Отмена' }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('блокирует скролл только пока открыт', () => {
    const { unmount } = render(<Harness />);
    expect(document.body.style.overflow).toBe('hidden');
    unmount();
    expect(document.body.style.overflow).toBe('');
  });

  it('Escape во вложенном окне закрывает только его', () => {
    render(<Harness><NestedDialog /></Harness>);
    fireEvent.click(screen.getByRole('button', { name: 'вложенное' }));
    expect(screen.getAllByRole('dialog')).toHaveLength(2);
    pressEscape();
    expect(screen.getByRole('dialog', { name: 'Новая доска' })).toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: 'Вложенное' })).not.toBeInTheDocument();
    pressEscape();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('части вне UIDialog падают с понятной ошибкой', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<UIDialog.Close>Отмена</UIDialog.Close>)).toThrow(/внутри <UIDialog>/);
    consoleError.mockRestore();
  });
});
