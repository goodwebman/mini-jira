import { RouterProvider } from 'react-router';

import { router } from './router/router';

/** Корень приложения: глобальные провайдеры в `main.tsx`, всё остальное — дерево роутов. */
export default function App() {
  return <RouterProvider router={router} />;
}
