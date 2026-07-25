import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { ENDPOINT } from '../util/constant';
import { ApiRequestObject, ApiResponse, javascriptPost } from '../util/api';

export interface UserDataType {
  user?: {
    MemberID?: string | number;
    location?: string[];
    paymode?: string[];
  };
  token?: string;
}

export interface FinancialFilterState {
  startDate?: string | null;
  endDate?: string | null;
  locations?: string[];
  payModes?: string[];
  transactionType?: 'credit' | 'debit' | null;
  minAmount?: number | null;
  maxAmount?: number | null;
  search?: string | null;
  sortKey?: string;
  sortDir?: 'asc' | 'desc';
  limit?: number;
}

type DashboardResponse = ApiResponse<{
  filters: Record<string, any>;
  summary: Record<string, any>;
  analytics: Record<string, any>;
  transactions: any[];
}>;

const buildFinancialBody = (filters: FinancialFilterState = {}) => ({
  start_date: filters.startDate || null,
  end_date: filters.endDate || null,
  locations: filters.locations?.length ? filters.locations : null,
  pay_modes: filters.payModes?.length ? filters.payModes : null,
  transaction_type: filters.transactionType || null,
  min_amount: filters.minAmount ?? null,
  max_amount: filters.maxAmount ?? null,
  search: filters.search || null,
  sort_key: filters.sortKey || null,
  sort_dir: filters.sortDir || null,
  limit: filters.limit ?? 150,
});

const postDashboard = async (
  path: string,
  filters: FinancialFilterState,
  token?: string,
): Promise<DashboardResponse> => {
  const payload: ApiRequestObject = {
    path,
    body: buildFinancialBody(filters),
    Token: token,
  };

  return javascriptPost(payload);
};

export const useStatementDashboard = (
  filters: FinancialFilterState,
  userData: UserDataType,
): UseQueryResult<DashboardResponse, unknown> => {
  return useQuery({
    queryKey: ['statement-dashboard', filters, userData?.token],
    queryFn: () =>
      postDashboard(
        ENDPOINT.financial_statement_dashboard,
        filters,
        userData?.token,
      ),
    enabled: !!userData?.token,
    retry: 1,
    refetchOnWindowFocus: false,
  });
};

export const useRechargeDashboard = (
  filters: FinancialFilterState,
  userData: UserDataType,
): UseQueryResult<DashboardResponse, unknown> => {
  return useQuery({
    queryKey: ['recharge-dashboard', filters, userData?.token],
    queryFn: () =>
      postDashboard(
        ENDPOINT.financial_recharge_dashboard,
        filters,
        userData?.token,
      ),
    enabled: !!userData?.token,
    retry: 1,
    refetchOnWindowFocus: false,
  });
};

export const askFinancialAi = async ({
  contextType,
  prompt,
  filters,
  token,
}: {
  contextType: 'statement' | 'recharge';
  prompt: string;
  filters: FinancialFilterState;
  token?: string;
}) => {
  return javascriptPost({
    path: ENDPOINT.financial_ask_ai,
    body: {
      context_type: contextType,
      prompt,
      filters: buildFinancialBody(filters),
    },
    Token: token,
  });
};
