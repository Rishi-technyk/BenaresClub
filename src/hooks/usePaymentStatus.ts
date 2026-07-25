import { useAppTheme } from '../theme/AppThemeProvider';

type TimelineItem = {
  title: string;
  description?: string;
  time?: string | null;
  tone?: 'success' | 'warning' | 'danger' | 'neutral';
};

export const usePaymentStatus = () => {
  const { colors } = useAppTheme();

  const resolveTone = (status?: string | null) => {
    const normalized = String(status || '').toLowerCase();

    if (
      normalized.includes('paid') ||
      normalized.includes('success') ||
      normalized.includes('active') ||
      normalized.includes('confirmed') ||
      normalized.includes('complete')
    ) {
      return {
        background: `${colors.success}22`,
        color: colors.success,
        border: `${colors.success}44`,
      };
    }

    if (
      normalized.includes('cancel') ||
      normalized.includes('fail') ||
      normalized.includes('refund')
    ) {
      return {
        background: `${colors.danger}22`,
        color: colors.danger,
        border: `${colors.danger}44`,
      };
    }

    return {
      background: `${colors.warning}22`,
      color: colors.warning,
      border: `${colors.warning}44`,
    };
  };

  const buildPaymentTimeline = (payment?: any): TimelineItem[] => {
    if (!payment) {
      return [];
    }

    const items: TimelineItem[] = [];

    if (payment.initiated_at || payment.created_at) {
      items.push({
        title: 'Payment initiated',
        description: payment.gateway_name
          ? `Gateway: ${payment.gateway_name}`
          : 'Transaction created',
        time: payment.initiated_at || payment.created_at,
        tone: 'neutral',
      });
    }

    if (payment.processed_at || payment.transaction_date) {
      items.push({
        title:
          String(payment.status || payment.payment_status || '').toLowerCase() ===
          'paid'
            ? 'Payment completed'
            : 'Payment updated',
        description:
          payment.reference_number || payment.bank_reference_no
            ? `Reference: ${payment.reference_number || payment.bank_reference_no}`
            : payment.status_label || payment.payment_status || 'Status updated',
        time: payment.processed_at || payment.transaction_date,
        tone:
          String(payment.status || payment.payment_status || '').toLowerCase().includes(
            'paid',
          ) ||
          String(payment.status_code || '').toLowerCase() === 'success'
            ? 'success'
            : 'warning',
      });
    }

    if (payment.refund_at || payment.refund_date) {
      items.push({
        title: 'Refund processed',
        description: payment.refund_amount
          ? `Refund amount: Rs. ${payment.refund_amount}`
          : 'Refund completed',
        time: payment.refund_at || payment.refund_date,
        tone: 'danger',
      });
    }

    return items;
  };

  return {
    resolveTone,
    buildPaymentTimeline,
  };
};
