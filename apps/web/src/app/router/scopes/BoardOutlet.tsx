import { useEffect, useMemo } from 'react';

import { Outlet, useLocation, useNavigate } from 'react-router';

import { useBoardWorkspaceStore } from '@/features/board/workspace';

import { readLegacyBoardFilters } from './legacy-board-filters';

export function BoardOutlet() {
  const { updateFilters } = useBoardWorkspaceStore();
  const location = useLocation();
  const navigate = useNavigate();
  const legacy = useMemo(
    () => readLegacyBoardFilters(location.search),
    [location.search],
  );

  useEffect(() => {
    if (!legacy) return;
    updateFilters(legacy.filters);
    void navigate(
      {
        pathname: location.pathname,
        search: legacy.search,
        hash: location.hash,
      },
      { replace: true, state: location.state, preventScrollReset: true },
    );
  }, [legacy, location, navigate, updateFilters]);

  return legacy ? null : <Outlet />;
}
