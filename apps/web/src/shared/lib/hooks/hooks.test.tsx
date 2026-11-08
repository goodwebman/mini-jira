import { act, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { useRef, useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useControllableState } from './use-controllable-state';
import { useEscape } from './use-escape';
import { useFocusTrap } from './use-focus-trap';
import { useMediaQuery } from './use-media-query';
import { useOutsideClick } from './use-outside-click';
import { useScrollLock } from './use-scroll-lock';

const pressEscape = () => fireEvent.keyDown(document.body, { key: 'Escape' });

describe('useEscape', () => {
  it('вызывает callback только когда включён', () => {
    const callback = vi.fn();
    const { rerender } = renderHook(({ enabled }) => useEscape(callback, enabled), {
      initialProps: { enabled: false },
    });
    pressEscape();
    expect(callback).not.toHaveBeenCalled();
    rerender({ enabled: true });
    pressEscape();
    expect(callback).toHaveBeenCalledOnce();
  });

  it('при вложенных слоях срабатывает только верхний', () => {
    const lower = vi.fn();
    const upper = vi.fn();
    renderHook(() => useEscape(lower));
    const top = renderHook(() => useEscape(upper));

    pressEscape();
    expect(upper).toHaveBeenCalledOnce();
    expect(lower).not.toHaveBeenCalled();

    top.unmount();
    pressEscape();
    expect(lower).toHaveBeenCalledOnce();
  });

  it('новый callback не меняет порядок слоёв', () => {
    const lower = vi.fn();
    const upper = vi.fn();
    const bottom = renderHook(({ fn }) => useEscape(fn), { initialProps: { fn: () => {} } });
    renderHook(() => useEscape(upper));

    bottom.rerender({ fn: lower });
    pressEscape();
    expect(upper).toHaveBeenCalledOnce();
    expect(lower).not.toHaveBeenCalled();
  });

  it('слой вне стека не перехватывает Escape у модалки', () => {
    const dialog = vi.fn();
    const tooltip = vi.fn();
    renderHook(() => useEscape(dialog));
    renderHook(() => useEscape(tooltip, true, { stacked: false }));

    pressEscape();
    expect(dialog).toHaveBeenCalledOnce();
    expect(tooltip).toHaveBeenCalledOnce();
  });

  it('уважает preventDefault вложенного обработчика', () => {
    const callback = vi.fn();
    renderHook(() => useEscape(callback));
    render(
      <input
        aria-label="поле"
        onKeyDown={(event) => {
          event.preventDefault();
        }}
      />,
    );
    fireEvent.keyDown(screen.getByLabelText('поле'), { key: 'Escape' });
    expect(callback).not.toHaveBeenCalled();
  });
});

function Trap({ autoFocusInput = false }: { autoFocusInput?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => { setOpen(!open); }}>триггер</button>
      {open && <TrapBody autoFocusInput={autoFocusInput} onClose={() => { setOpen(false); }} />}
    </>
  );
}

function TrapBody({ autoFocusInput, onClose }: { autoFocusInput: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useFocusTrap(ref, true);
  return (
    <div ref={ref} tabIndex={-1} data-testid="trap">
      <button type="button" data-focus-skip="" onClick={onClose}>крестик</button>
      <input aria-label="первое" />
      <input aria-label="второе" autoFocus={autoFocusInput} />
    </div>
  );
}

describe('useFocusTrap', () => {
  const open = () => {
    const trigger = screen.getByRole('button', { name: 'триггер' });
    trigger.focus();
    fireEvent.click(trigger);
    return trigger;
  };

  it('ставит фокус на первый элемент, пропуская data-focus-skip', () => {
    render(<Trap />);
    open();
    expect(screen.getByLabelText('первое')).toHaveFocus();
  });

  it('зацикливает Tab и Shift+Tab', () => {
    render(<Trap />);
    open();
    const close = screen.getByRole('button', { name: 'крестик' });
    const last = screen.getByLabelText('второе');

    last.focus();
    fireEvent.keyDown(document.body, { key: 'Tab' });
    expect(close).toHaveFocus();

    fireEvent.keyDown(document.body, { key: 'Tab', shiftKey: true });
    expect(last).toHaveFocus();
  });

  it('возвращает фокус на триггер при закрытии', () => {
    render(<Trap />);
    const trigger = open();
    fireEvent.click(screen.getByRole('button', { name: 'крестик' }));
    expect(trigger).toHaveFocus();
  });

  it('не перебивает autoFocus и всё равно возвращает фокус на триггер', () => {
    render(<Trap autoFocusInput />);
    const trigger = open();
    expect(screen.getByLabelText('второе')).toHaveFocus();
    fireEvent.click(screen.getByRole('button', { name: 'крестик' }));
    expect(trigger).toHaveFocus();
  });
});

function Outside({ onOutside }: { onOutside: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const ignored = useRef<HTMLButtonElement>(null);
  useOutsideClick(ref, onOutside, { ignoreRefs: [ignored] });
  return (
    <>
      <div ref={ref}>внутри</div>
      <button ref={ignored} type="button">игнор</button>
      <span>снаружи</span>
    </>
  );
}

describe('useOutsideClick', () => {
  it('реагирует только на клик вне элемента и вне ignoreRefs', () => {
    const onOutside = vi.fn();
    render(<Outside onOutside={onOutside} />);

    fireEvent.pointerDown(screen.getByText('внутри'));
    fireEvent.pointerDown(screen.getByRole('button', { name: 'игнор' }));
    expect(onOutside).not.toHaveBeenCalled();

    fireEvent.pointerDown(screen.getByText('снаружи'));
    expect(onOutside).toHaveBeenCalledOnce();
  });
});

describe('useScrollLock', () => {
  afterEach(() => {
    document.body.style.overflow = '';
  });

  it('блокирует скролл и восстанавливает его', () => {
    const { rerender } = renderHook(({ active }) => { useScrollLock(active); }, {
      initialProps: { active: true },
    });
    expect(document.body.style.overflow).toBe('hidden');
    rerender({ active: false });
    expect(document.body.style.overflow).toBe('');
  });

  it('вложенные блокировки снимаются только после последней', () => {
    const outer = renderHook(() => { useScrollLock(true); });
    const inner = renderHook(() => { useScrollLock(true); });
    inner.unmount();
    expect(document.body.style.overflow).toBe('hidden');
    outer.unmount();
    expect(document.body.style.overflow).toBe('');
  });
});

describe('useMediaQuery', () => {
  const stubMatchMedia = () => {
    const listeners = new Set<() => void>();
    const state = { matches: false };
    vi.stubGlobal('matchMedia', (query: string) => ({
      get matches() {
        return query.includes('large') ? !state.matches : state.matches;
      },
      addEventListener: (_: string, listener: () => void) => listeners.add(listener),
      removeEventListener: (_: string, listener: () => void) => listeners.delete(listener),
    }));
    return {
      listeners,
      set: (value: boolean) => {
        state.matches = value;
        listeners.forEach((listener) => { listener(); });
      },
    };
  };

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('обновляется по событию и отписывается', () => {
    const media = stubMatchMedia();
    const { result, unmount } = renderHook(() => useMediaQuery('(min-width: 1px)'));
    expect(result.current).toBe(false);
    act(() => { media.set(true); });
    expect(result.current).toBe(true);
    unmount();
    expect(media.listeners.size).toBe(0);
  });

  it('сразу реагирует на смену самого запроса', () => {
    stubMatchMedia();
    const { result, rerender } = renderHook(({ query }) => useMediaQuery(query), {
      initialProps: { query: 'small' },
    });
    expect(result.current).toBe(false);
    rerender({ query: 'large' });
    expect(result.current).toBe(true);
  });
});

describe('useControllableState', () => {
  it('uncontrolled: хранит значение сам и зовёт onChange', () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => useControllableState({ defaultValue: false, onChange }));
    act(() => { result.current[1](true); });
    expect(result.current[0]).toBe(true);
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('controlled: значение меняет только родитель', () => {
    const onChange = vi.fn();
    const { result } = renderHook(() =>
      useControllableState({ value: false, defaultValue: true, onChange }),
    );
    act(() => { result.current[1](true); });
    expect(result.current[0]).toBe(false);
    expect(onChange).toHaveBeenCalledWith(true);
  });
});
