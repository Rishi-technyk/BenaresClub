import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { ENDPOINT } from '../util/constant';
import { ApiResponse, javascriptGet } from '../util/api';

export type Token = string | null;

export interface HomeDashboardSummary {
  current_balance?: number;
  credit_limit?: number;
  outstanding_amount?: number;
  available_credit?: number;
  bill_amount?: number;
  amount_payable?: number;
  payment_received?: number;
  post_bill_credit_total?: number;
  unbilled_debit?: number;
  bill_no?: string | number | null;
  bill_month_year?: string | null;
  unbilled_credit?:string | number | null;
  pay_status?: string | null;
}

export interface HomeDashboardCard {
  label: string;
  value: number | string;
  prefix?: string;
  suffix?: string;
  tone?: string;
  helper?: string;
}

export interface HomeDashboardInsight {
  title: string;
  value: number | string;
  prefix?: string;
  suffix?: string;
  tone?: string;
  description?: string;
}

export interface HomeDashboardTrend {
  month_key: string;
  month_label: string;
  recharge_total: number;
  spend_total: number;
  activity_count: number;
}

export interface HomeDashboardBreakdown {
  label: string;
  count: number;
  amount: number;
}

export interface HomeDashboardActivity {
  type: 'card' | 'account';
  title: string;
  subtitle: string;
  reference?: string | number;
  amount: number;
  date: string;
}

export interface HomeDashboardAnalytics {
  cards?: HomeDashboardCard[];
  highlights?: Record<string, any>;
  insights?: HomeDashboardInsight[];
  monthly_trend?: HomeDashboardTrend[];
  location_breakdown?: HomeDashboardBreakdown[];
  payment_mode_breakdown?: HomeDashboardBreakdown[];
  recent_activity?: HomeDashboardActivity[];
}

export interface HomeDashboardData {
  summary?: HomeDashboardSummary;
  analytics?: HomeDashboardAnalytics;
}

interface UseDashboardDataParams {
  token: Token;
}

const useDashboardData = ({
  token,
}: UseDashboardDataParams): UseQueryResult<ApiResponse<HomeDashboardData>, unknown> => {
  return useQuery({
    queryKey: ['home-dashboard', token],
    queryFn: () =>
      javascriptGet<HomeDashboardData>({
        path: ENDPOINT.financial_home_dashboard,
        Token: token ?? '',
      }),
    enabled: !!token,
    retry: 1,
    refetchOnWindowFocus: false,
  });
};

export default useDashboardData;
