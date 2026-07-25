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
import moment from 'moment';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Toast } from 'react-native-toast-notifications';
import { useSelector } from 'react-redux';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import Header from '../../components/Header';
import BookingHeroCard from '../../components/booking/BookingHeroCard';
import ActionBar from '../../components/booking/ActionBar';
import DetailSection from '../../components/booking/DetailSection';
import DetailGrid from '../../components/booking/DetailGrid';
import SupportCard from '../../components/booking/SupportCard';
import EmptyStateCard from '../../components/booking/EmptyStateCard';
import BookingDetailSkeleton from '../../components/loaders/BookingDetailSkeleton';
import StatusTimeline from '../../components/timeline/StatusTimeline';
import PaymentSummaryCard from '../../components/payment/PaymentSummaryCard';
import { useBookingDetails } from '../../hooks/useBookingDetails';
import { usePaymentStatus } from '../../hooks/usePaymentStatus';
import { createBookingSummaryPdf, shareBookingSummary } from '../../util/bookingDocuments';
import { javascriptPost } from '../../util/api';
import { AppStackParamList } from '../../navigation/AppDrawer';
import { RootState } from '../../store/store';
import { useAppTheme } from '../../theme/AppThemeProvider';

type Props = NativeStackScreenProps<AppStackParamList, 'InvoiceHallDetails'>;

const InvoiceHallDetails: React.FC<Props> = ({ route }) => {
  const userData = useSelector((state: RootState) => state.auth);
  const { colors } = useAppTheme();
  const { resolveTone, buildPaymentTimeline } = usePaymentStatus();

  const { data, isLoading, isError, refreshing, refresh } = useBookingDetails({
    queryKey: 'banquet-booking-detail',
    path: `member/banquet/transaction/${route.params.id}`,
    token: userData.token,
    transform: response => (response?.status ? response.data : null),
  });

  const handleDownload = useCallback(async () => {
    if (!data) {
      return;
    }

    const file = await createBookingSummaryPdf(
      data.summary?.booking_number || data.booking_ID,
      'Banquet booking summary',
      [
        { label: 'Booking number', value: data.summary?.booking_number || data.booking_ID },
        { label: 'Function date', value: data.summary?.function_date },
        { label: 'Attendees', value: data.summary?.attendees },
        { label: 'Status', value: data.summary?.status || data.status },
        { label: 'Total', value: `₹ ${Number(data.summary?.total_amount || 0).toFixed(2)}` },
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
      data.summary?.booking_number || data.booking_ID,
      'Banquet booking summary',
      [
        { label: 'Booking number', value: data.summary?.booking_number || data.booking_ID },
        { label: 'Function date', value: data.summary?.function_date },
        { label: 'Status', value: data.summary?.status || data.status },
        { label: 'Payment', value: data.payment?.status || data.payment_status },
      ],
    );
  }, [data]);

  const cancelVenue = useCallback(
    async (chargeId: number | string) => {
      const formdata = new FormData();
      formdata.append('ban_charge_id', String(chargeId));

      const response = await javascriptPost({
        path: 'member/banquet/cancel',
        body: {
          ban_charge_id: String(chargeId),
        },
        Token: userData.token,
      });

      Toast.show(response?.message || response?.msg || 'Venue updated.', {
        type: response?.status ? 'success' : 'danger',
      });
      await refresh();
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
        <Header title="Banquet Booking" />
        <BookingDetailSkeleton />
      </View>
    );
  }

  if (isError || !data) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <Header title="Banquet Booking" />
        <EmptyStateCard
          type="error"
          title="Banquet booking unavailable"
          description="We could not load the banquet booking details right now. Pull to refresh and try again."
        />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Header title="Banquet Booking" />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
      >
        <BookingHeroCard
          eyebrow="Banquet Reservation"
          title={data.summary?.booking_number || data.booking_ID}
          subtitle={`${data.member?.name || data.memberName} • ${data.summary?.function_date || ''}`}
          status={data.summary?.status || data.status || 'Pending'}
          statusTone={tone.color === colors.success ? 'success' : tone.color === colors.danger ? 'danger' : 'warning'}
          meta={[
            { label: 'Attendees', value: String(data.summary?.attendees || data.noofPerson || 0), tone: 'neutral' },
            { label: 'Venues', value: String(data.summary?.venue_count || data.bookings?.length || 0), tone: 'neutral' },
            {
              label: 'Payment',
              value: data.payment?.status || data.payment_status || 'Not Paid',
              tone:
                String(data.payment?.status || data.payment_status).toLowerCase() === 'paid'
                  ? 'success'
                  : 'warning',
            },
          ]}
        />

        <ActionBar actions={actionItems} />

        <DetailSection title="Booking Snapshot" subtitle="Member, event, and function overview." delay={40}>
          <DetailGrid
            items={[
              { label: 'Member', value: data.member?.name || data.memberName, highlight: true },
              { label: 'Member ID', value: data.member?.member_id || data.memberID },
              { label: 'Function date', value: data.summary?.function_date },
              { label: 'Function type', value: data.function?.name || data.functionType },
              { label: 'Occupant type', value: data.occupant?.name || data.occupant_type },
              { label: 'Guests', value: data.summary?.attendees || data.noofPerson },
            ]}
          />
        </DetailSection>

        <DetailSection title="Venue Sessions" subtitle="Venue-level charges, timing, and cancellation state." delay={70}>
          {data.bookings?.map((item: any) => {
            const itemTone = resolveTone(item.status);
            const canCancel =
              moment(item.funDate, 'YYYY-MM-DD').isAfter(moment().startOf('day')) &&
              item.status === 'Active' &&
              String(data.payment?.status || data.payment_status).toLowerCase() === 'paid';

            return (
              <View
                key={item.id}
                style={[
                  styles.itemCard,
                  {
                    backgroundColor: colors.surfaceAlt,
                    borderColor: itemTone.border,
                  },
                ]}
              >
                <View style={styles.itemHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.itemTitle, { color: colors.text }]}>{item.venue?.name}</Text>
                    <Text style={[styles.itemSub, { color: colors.textMuted }]}>
                      {item.session?.name} • {moment(item.funDate).format('DD MMM YYYY')}
                    </Text>
                  </View>
                  <View style={[styles.statusChip, { backgroundColor: itemTone.background }]}>
                    <Text style={[styles.statusText, { color: itemTone.color }]}>{item.status || 'Pending'}</Text>
                  </View>
                </View>

                <DetailGrid
                  items={[
                    { label: 'Charges', value: `₹ ${Number(item.charges || 0).toFixed(2)}` },
                    { label: 'GST', value: `₹ ${Number(item.gst_amount || 0).toFixed(2)}` },
                    { label: 'Security', value: `₹ ${Number(item.security_deposit || 0).toFixed(2)}` },
                    { label: 'Total', value: `₹ ${Number(item.total || 0).toFixed(2)}`, highlight: true },
                  ]}
                />

                {item.status === 'Cancelled' ? (
                  <View style={[styles.cancelBox, { borderColor: colors.danger, backgroundColor: `${colors.danger}10` }]}>
                    <Text style={[styles.cancelTitle, { color: colors.danger }]}>Cancellation Summary</Text>
                    <Text style={[styles.cancelText, { color: colors.text }]}>
                      Deduction: ₹ {Number(item.cancellation_deducation || 0).toFixed(2)}
                    </Text>
                    <Text style={[styles.cancelText, { color: colors.text }]}>
                      Refund: ₹ {(Number(item.total) - Number(item.cancellation_deducation || 0)).toFixed(2)}
                    </Text>
                  </View>
                ) : null}

                {canCancel ? (
                  <TouchableOpacity
                    style={[styles.cancelButton, { backgroundColor: colors.danger }]}
                    onPress={() =>
                      Alert.alert('Cancel venue', 'Are you sure you want to cancel this venue session?', [
                        { text: 'No', style: 'cancel' },
                        { text: 'Yes', style: 'destructive', onPress: () => cancelVenue(item.id) },
                      ])
                    }
                  >
                    <Icon name="close-circle-outline" size={16} color={colors.onPrimary} />
                    <Text style={[styles.cancelButtonText, { color: colors.onPrimary }]}>Cancel venue</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            );
          })}
        </DetailSection>

        <DetailSection title="Payment and Invoice" subtitle="Transaction references and booking totals." delay={100}>
          <PaymentSummaryCard
            status={data.payment?.status || data.payment_status}
            items={[
              { label: 'Subtotal', value: `₹ ${Number(data.invoice?.subtotal || 0).toFixed(2)}` },
              { label: 'GST', value: `₹ ${Number(data.invoice?.gst_total || 0).toFixed(2)}` },
              { label: 'Security', value: `₹ ${Number(data.invoice?.security_total || 0).toFixed(2)}` },
              { label: 'Grand total', value: `₹ ${Number(data.invoice?.total || 0).toFixed(2)}`, emphasize: true },
              { label: 'Reference', value: data.payment?.reference_number || data.payment_info?.bank_refrance_no || 'Pending' },
            ]}
          />
        </DetailSection>

        <DetailSection title="Booking Timeline" subtitle="Operational progress for the banquet reservation." delay={130}>
          <StatusTimeline items={data.timeline || []} />
        </DetailSection>

        {paymentTimeline.length ? (
          <DetailSection title="Payment Timeline" subtitle="Financial progress and settlement checkpoints." delay={160}>
            <StatusTimeline items={paymentTimeline} />
          </DetailSection>
        ) : null}

        <DetailSection title="Rules and Support" subtitle="Important venue guidelines and help desk information." delay={190}>
          <View style={styles.ruleList}>
            {data.rules?.map((rule: string, index: number) => (
              <View key={`${rule}-${index}`} style={styles.ruleRow}>
                <Icon name="food-outline" size={18} color={colors.secondary} />
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
  itemCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  itemSub: {
    marginTop: 4,
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
  cancelBox: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    marginTop: 10,
  },
  cancelTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  cancelText: {
    marginTop: 6,
    fontSize: 12,
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

export default InvoiceHallDetails;
