/** Тесткейсы: зависимость доступна внутри провайдера; без провайдера — понятная ошибка с именем токена; вложенный провайдер перекрывает внешний. */
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { createDi } from './create-di';

const { Injector, useDi } = createDi<{ name: string }>('Greeting');

function Consumer() {
  return <span>{useDi().name}</span>;
}

describe('createDi', () => {
  it('отдаёт зависимость из ближайшего провайдера', () => {
    const outer = { name: 'внешний' };
    const inner = { name: 'внутренний' };
    render(
      <Injector value={outer}>
        <Consumer />
        <Injector value={inner}>
          <Consumer />
        </Injector>
      </Injector>,
    );
    expect(screen.getByText('внешний')).toBeInTheDocument();
    expect(screen.getByText('внутренний')).toBeInTheDocument();
  });

  it('без провайдера падает сразу и называет токен', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Consumer />)).toThrow(
      'Greeting не найден: компонент должен быть внутри провайдера.',
    );
  });
});
