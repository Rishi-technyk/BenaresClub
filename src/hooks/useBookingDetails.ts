import { useCallback, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { javascriptGet } from '../util/api';

type UseBookingDetailsParams = {
  queryKey: string;
  path: string;
  token?: string;
  enabled?: boolean;
  transform?: (payload: any) => any;
};

export const useBookingDetails = ({
  queryKey,
  path,
  token,
  enabled = true,
  transform,
}: UseBookingDetailsParams) => {
  const [refreshing, setRefreshing] = useState(false);

  const query = useQuery({
    queryKey: [queryKey, path, token],
    queryFn: async () => {
      const response = await javascriptGet({
        path,
        Token: token,
      });

      return transform ? transform(response) : response;
    },
    enabled: enabled && !!token,
    staleTime: 60 * 1000,
  });

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await query.refetch();
    } finally {
      setRefreshing(false);
    }
  }, [query]);

  const state = useMemo(
    () => ({
      data: query.data,
      isLoading: query.isLoading,
      isFetching: query.isFetching,
      isError: query.isError,
      error: query.error,
      refreshing,
      refresh,
    }),
    [query.data, query.error, query.isError, query.isFetching, query.isLoading, refresh, refreshing],
  );

  return state;
};
