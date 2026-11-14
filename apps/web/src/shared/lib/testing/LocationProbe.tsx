import { useLocation } from 'react-router';

/** Показывает текущий адрес: проверка редиректов без доступа к истории. */
export function LocationProbe() {
  const location = useLocation();
  return (
    <output data-testid='location'>
      {`${location.pathname}${location.search}`}
    </output>
  );
}
