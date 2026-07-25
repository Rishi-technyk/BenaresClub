import { useCallback, useEffect, useState } from 'react';

type UsePaginationParams<T> = {
  fetchPage: (page: number) => Promise<{ items: T[]; lastPage: number }>;
  dependencies?: any[];
};

export const usePagination = <T,>({
  fetchPage,
  dependencies = [],
}: UsePaginationParams<T>) => {
  const [items, setItems] = useState<T[]>([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const loadPage = useCallback(
    async (nextPage = 1, replace = false) => {
      if ((nextPage > lastPage && !replace) || loadingMore) {
        return;
      }

      if (nextPage === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      try {
        const result = await fetchPage(nextPage);
        setLastPage(result.lastPage || 1);
        setItems(prev => (replace ? result.items : [...prev, ...result.items]));
        setPage(nextPage);
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [fetchPage, lastPage, loadingMore],
  );

  useEffect(() => {
    setItems([]);
    setPage(1);
    setLastPage(1);
    loadPage(1, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await loadPage(1, true);
  }, [loadPage]);

  const loadMore = useCallback(async () => {
    if (page < lastPage && !loadingMore) {
      await loadPage(page + 1);
    }
  }, [lastPage, loadPage, loadingMore, page]);

  return {
    items,
    page,
    lastPage,
    loading,
    refreshing,
    loadingMore,
    refresh,
    loadMore,
  };
};
