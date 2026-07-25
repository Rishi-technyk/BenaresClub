import React, { useCallback, useMemo } from 'react';
import {
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import moment from 'moment';
import { Toast } from 'react-native-toast-notifications';
import { useSelector } from 'react-redux';

import Header from '../../components/Header';
import BookingHeroCard from '../../components/booking/BookingHeroCard';
import ActionBar from '../../components/booking/ActionBar';
import DetailSection from '../../components/booking/DetailSection';
import DetailGrid from '../../components/booking/DetailGrid';
import SupportCard from '../../components/booking/SupportCard';
import EmptyStateCard from '../../components/booking/EmptyStateCard';
import StatusTimeline from '../../components/timeline/StatusTimeline';
import PaymentSummaryCard from '../../components/payment/PaymentSummaryCard';
import BookingDetailSkeleton from '../../components/loaders/BookingDetailSkeleton';
import { useBookingDetails } from '../../hooks/useBookingDetails';
import { usePaymentStatus } from '../../hooks/usePaymentStatus';
import { createBookingSummaryPdf, shareBookingSummary } from '../../util/bookingDocuments';
import { javascriptGet, javascriptPost } from '../../util/api';
import { RootState } from '../../store/store';
import { AppStackParamList } from '../../navigation/AppDrawer';
import { useAppTheme } from '../../theme/AppThemeProvider';

type Props = NativeStackScreenProps<AppStackParamList, 'ActivityBookingDetail'>;

const ActivityBookingDetail: React.FC<Props> = ({ route }) => {
  const { bookingId } = route.params;
  const userData = useSelector((state: RootState) => state.auth);
  const { colors } = useAppTheme();
  const { resolveTone, buildPaymentTimeline } = usePaymentStatus();

  const { data, isLoading, isError, refreshing, refresh } = useBookingDetails({
    queryKey: 'activity-booking-detail',
    path: `member/booking-details/${bookingId}`,
    token: userData.token,
    transform: response => (response?.success ? response.data : null),
  });


console.log( data, '---------------------- data ---------------------');


  const handleDownload = useCallback(async () => {
    if (!data) {
      return;
    }

    const file = await createBookingSummaryPdf(
      data.summary?.booking_number || data.booking_number || 'activity-booking',
      data.facility_name || 'Activity Booking',
      [
        { label: 'Booking number', value: data.summary?.booking_number || data.booking_number },
        { label: 'Facility', value: data.facility_name },
        { label: 'Status', value: data.summary?.status || data.status },
        { label: 'Payment', value: data.payment?.status || data.payment_status },
        { label: 'Total amount', value: `Rs. ${data.summary?.total_amount || data.facility_total}` },
      ],
    );

    Toast.show(file?.filePath ? `Summary saved at ${file.filePath}` : 'Unable to save summary.', {
      type: file?.filePath ? 'success' : 'danger',
    });
  }, [data]);

  const handleShare = useCallback(async () => {
    if (!data) {
      return;
    }

    await shareBookingSummary(
      data.summary?.booking_number || data.booking_number || 'activity-booking',
      data.facility_name || 'Activity Booking',
      [
        { label: 'Booking number', value: data.summary?.booking_number || data.booking_number },
        { label: 'Facility', value: data.facility_name },
        { label: 'Status', value: data.summary?.status || data.status },
        { label: 'Payment', value: data.payment?.status || data.payment_status },
        { label: 'Booked on', value: data.summary?.booked_on },
      ],
    );
  }, [data]);



  const cancelSlot = useCallback(
    async (slotId: number) => {
      try {
        const eligibility = await javascriptGet({
          path: `member/get-cancellation-amount/${slotId}`,
          Token: userData.token,
        });

        if (!eligibility?.status || !eligibility?.cancelationAmount) {
          Toast.show(eligibility?.message || 'Cancellation policy is not available.', {
            type: 'warning',
          });
          return;
        }

        const policy = eligibility.cancelationAmount;
        Alert.alert(
          'Cancel slot',
          `Deduction will be Rs. ${policy.cancellation_deducation}. Do you want to continue?`,
          [
            { text: 'No', style: 'cancel' },
            {
              text: 'Yes',
              style: 'destructive',
              onPress: async () => {
                const response = await javascriptPost({
                  path: 'member/cancel-booking',
                  body: {
                    booking_id: slotId,
                    cancellation_per: policy.cancellation_per,
                    cancellation_amt: policy.cancellation_amt,
                    cancellation_GST: policy.cancellation_GST,
                    cancellation_GST_amt: policy.cancellation_GST_amt,
                    cancellation_deducation: policy.cancellation_deducation,
                  },
                  Token: userData.token,
                });

                Toast.show(response?.message || 'Slot updated.', {
                  type: response?.status ? 'success' : 'danger',
                });
                await refresh();
              },
            },
          ],
        );
      } catch (_error) {
        Toast.show('Unable to process cancellation right now.', { type: 'danger' });
      }
    },
    [refresh, userData.token],
  );
const cancelMembership = useCallback(
  async (bookingId: number) => {
    try {
      // STEP 1 : Check cancellation eligibility
      const eligibility = await javascriptGet({
        path: `member/get-cancellation-amount/${bookingId}`,
        Token: userData.token,
      });

      if (!eligibility?.status) {
        Toast.show(
          eligibility?.message || 'Cancellation is not allowed.',
          {
            type: 'warning',
          },
        );
        return;
      }

      const policy = eligibility.cancelationAmount;

      const bookingAmount = Number(policy.booking_amount ?? 0);
      const deductionPercent = Number(policy.cancellation_per ?? 0);
      const deductionAmount = Number(policy.cancellation_amt ?? 0);
      const gstPercent = Number(policy.cancellation_GST ?? 0);
      const gstAmount = Number(policy.cancellation_GST_amt ?? 0);

      const refundAmount =
        bookingAmount -
        deductionAmount -
        gstAmount;

      Alert.alert(
        'Cancel Booking',
        `Booking Amount : ₹${bookingAmount.toFixed(2)}

Deduction (${deductionPercent}%): ₹${deductionAmount.toFixed(2)}

GST (${gstPercent}%): ₹${gstAmount.toFixed(2)}

━━━━━━━━━━━━━━━━━━━━━━

Refund Amount : ₹${refundAmount.toFixed(2)}

Do you want to cancel this membership?`,
        [
          {
            text: 'No',
            style: 'cancel',
          },
          {
            text: 'Yes',
            style: 'destructive',
            onPress: async () => {
              try {
                const response = await javascriptPost({
                  path: 'member/cancel-booking',
                  Token: userData.token,
                  body: {
                    booking_id: bookingId,
                    cancellation_per: deductionPercent,
                    cancellation_amt: deductionAmount,
                    cancellation_GST: gstPercent,
                    cancellation_GST_amt: gstAmount,
                    cancellation_deducation:
                      deductionAmount + gstAmount,
                  },
                });

                Toast.show(
                  response?.message ??
                    'Membership cancelled successfully.',
                  {
                    type: response?.status
                      ? 'success'
                      : 'danger',
                  },
                );

                if (response?.status) {
                  refresh();
                }
              } catch (error) {
                Toast.show(
                  'Unable to cancel membership.',
                  {
                    type: 'danger',
                  },
                );
              }
            },
          },
        ],
      );
    } catch (error) {
      Toast.show(
        'Unable to fetch cancellation policy.',
        {
          type: 'danger',
        },
      );
    }
  },
  [refresh, userData.token],
);
  const actionItems = useMemo(
    () => [
      { label: 'Download', icon: 'file-download-outline', onPress: handleDownload },
      { label: 'Share', icon: 'share-variant-outline', onPress: handleShare },
    ],
    [handleDownload, handleShare],
  );

  const tone = resolveTone(data?.summary?.status || data?.status);
  const paymentTimeline = buildPaymentTimeline(data?.payment);

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <Header title="Activity Details" />
        <BookingDetailSkeleton />
      </View>
    );
  }

  if (isError || !data) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <Header title="Activity Details" />
        <EmptyStateCard
          type="error"
          title="Booking details unavailable"
          description="We could not load this activity booking right now. Pull to refresh or try again in a moment."
        />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Header title="Activity Details" />
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
        contentContainerStyle={styles.content}
      >
        <BookingHeroCard
          eyebrow="Activity Booking"
        title={data.activity_name}

subtitle={`${data.frequency_name} Membership`}
          status={data.summary?.status || data.status}
          statusTone={tone.color === colors.success ? 'success' : tone.color === colors.danger ? 'danger' : 'warning'}
meta={[
  {
    label: 'Members',
    value: String(data.summary?.members ?? 0),
  },
  {
    label: 'Spouse',
    value: String(data.summary?.spouse ?? 0),
  },
  {
    label: 'Dependents',
    value: String(data.summary?.dependents ?? 0),
  },
  {
    label: 'Guests',
    value: String(data.summary?.guests ?? 0),
  },
  {
    label: 'Participants',
    value: String(data.summary?.total_participants ?? 0),
  },
  {
    label: 'Valid Till',
    value: data.summary?.valid_to,
  },
]}
        />

        {/* <ActionBar actions={actionItems} /> */}

        <DetailSection title="Booking Snapshot" subtitle="Quick overview of the facility reservation." delay={40}>
        <DetailGrid
items={[
{
label:'Booking No',
value:data.summary.booking_number,
highlight:true,
},
{
label:'Activity',
value:data.activity_name,
},
{
label:'Plan',
value:data.frequency_name,
},
{
  label: 'Members',
  value: data.summary?.members,
},
{
  label: 'Spouse',
  value: data.summary?.spouse,
},
{
  label: 'Dependents',
  value: data.summary?.dependents,
},
{
  label: 'Guests',
  value: data.summary?.guests,
},
{
  label: 'Participants',
  value: data.summary?.total_participants,
},
{
label:'Valid From',
value:data.summary.valid_from,
},
{
label:'Valid To',
value:data.summary.valid_to,
},
{
label:'Status',
value:data.summary.status,
},
]}
/>
        </DetailSection>
<DetailSection
  title="Participants"
  subtitle="Member details included in this booking."
>
  {data.participant_details?.map((item: any) => (
    <View
      key={item.id}
      style={{
        paddingVertical: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: colors.border,
      }}
    >
      <Text
        style={{
          color: colors.text,
          fontWeight: '700',
        }}
      >
        {item.name}
      </Text>

      <Text style={{ color: colors.textMuted }}>
        {item.type} • {item.player_id}
      </Text>

      <Text
        style={{
          color: colors.primary,
          marginTop: 4,
        }}
      >
        ₹ {item.total_amount.toFixed(2)}
      </Text>
    </View>
  ))}
</DetailSection>

        <DetailSection title="Payment and Invoice" subtitle="Charges, taxes, and transaction metadata." delay={100}>
       <PaymentSummaryCard
  status={data.payment?.status}
  items={[
    ...(data.invoice?.items || []).map((item: any) => ({
      label: `${item.type} (${item.name})`,
      value: `₹ ${Number(item.total).toFixed(2)}`,
    })),

    {
      label: 'Subtotal',
      value: `₹ ${Number(data.invoice.plan_amount).toFixed(2)}`,
    },

    {
      label: 'GST',
      value: `₹ ${Number(data.invoice.gst_amount).toFixed(2)}`,
    },

    {
      label: 'Total',
      value: `₹ ${Number(data.invoice.total).toFixed(2)}`,
      emphasize: true,
    },

    ...(data.invoice?.refund
      ? [
          {
            label: 'Cancellation Deduction',
            value: `₹ ${Number(
              data.invoice.refund.total_deduction,
            ).toFixed(2)}`,
          },
          {
            label: 'Refund Amount',
            value: `₹ ${Number(
              data.invoice.refund.refund_amount,
            ).toFixed(2)}`,
            emphasize: true,
          },
          // {
          //   label: 'Refund Date',
          //   value: data.invoice.refund.refund_date ?? '-',
          // },
        ]
      : []),

    // {
    //   label: 'Reference',
    //   value:
    //     data.payment.reference_number ??
    //     data.payment.gateway_order_id ??
    //     '-',
    // },
  ]}
/>
        </DetailSection>

        {data.summary?.status !== 'Cancelled' && data.can_cancel &&
 data.payment?.status === 'Paid' &&
 moment().isBefore(moment(data.valid_from)) && (
  <TouchableOpacity
    style={{
      marginHorizontal: 16,
      margin: 16,
      paddingVertical: 14,
      borderRadius: 12,
      backgroundColor: '#DC2626',
      alignItems: 'center',
    }}
    onPress={() => cancelMembership(data.id)}
  >
    <Text
      style={{
        color: '#FFF',
        fontWeight: '700',
        fontSize: 16,
      }}
    >
      Cancel Booking
    </Text>
  </TouchableOpacity>
)}

        {/* <DetailSection title="Booking Timeline" subtitle="Operational updates for this reservation." delay={130}>
          <StatusTimeline items={data.timeline || []} />
        </DetailSection> */}
{/* 
        {paymentTimeline.length ? (
          <DetailSection title="Payment Timeline" subtitle="Financial checkpoints for this booking." delay={160}>
            <StatusTimeline items={paymentTimeline} />
          </DetailSection>
        ) : null} */}

        {/* {data.activity_logs?.length ? (
          <DetailSection title="Activity Log" subtitle="Detailed slot-level activity summary." delay={190}>
            <StatusTimeline items={data.activity_logs} />
          </DetailSection>
        ) : null} */}
<DetailSection
title="Membership Timeline"
subtitle="Membership lifecycle">

<StatusTimeline
items={data.timeline || []}
/>

</DetailSection>
        <DetailSection title="Rules and Support" subtitle="Helpful reminders and member assistance." delay={220}>
          <View style={styles.ruleList}>
            {data.rules?.map((rule: string, index: number) => (
              <View key={`${rule}-${index}`} style={styles.ruleRow}>
                <Icon name="shield-check-outline" size={18} color={colors.secondary} />
                <Text style={[styles.ruleText, { color: colors.text }]}>{rule}</Text>
              </View>
            ))}
          </View>
          <View style={{ marginTop: 14 }}>
            <SupportCard
              contactName={data.support?.name}
              phone={data.support?.phone}
              email={data.support?.email}
              note={data.support?.note}
            />
          </View>
        </DetailSection>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  content: {
    paddingBottom: 32,
  },
  slotCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
  },
  slotHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  slotTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  slotSub: {
    marginTop: 3,
    fontSize: 12,
  },
  statusChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  guestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
  },
  guestText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 13,
    fontWeight: '600',
  },
  guestAmount: {
    fontSize: 12,
  },
  cancelInfo: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: '700',
  },
  cancelButton: {
    marginTop: 12,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
  },
  cancelButtonText: {
    marginLeft: 6,
    fontSize: 13,
    fontWeight: '700',
  },
  ruleList: {
    gap: 10,
  },
  ruleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  ruleText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 13,
    lineHeight: 19,
  },
});

export default ActivityBookingDetail;
