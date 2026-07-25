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
import { javascriptGet } from '../../util/api';
import { AppStackParamList } from '../../navigation/AppDrawer';
import { RootState } from '../../store/store';
import { useAppTheme } from '../../theme/AppThemeProvider';

type Props = NativeStackScreenProps<AppStackParamList, 'InvoiceDetails'>;

const InvoiceDetails: React.FC<Props> = ({ route }) => {
  const userData = useSelector((state: RootState) => state.auth);
  const { colors } = useAppTheme();
  const { resolveTone, buildPaymentTimeline } = usePaymentStatus();

  const { data, isLoading, isError, refreshing, refresh } = useBookingDetails({
    queryKey: 'room-booking-detail',
    path: `member/room/transaction/details/${route.params.id}`,
    token: userData.token,
    transform: response => (response?.status ? response.data : null),
  });

  const handleDownload = useCallback(async () => {
    if (!data) {
      return;
    }

    const file = await createBookingSummaryPdf(
      data.summary?.booking_number || data.booking_number,
      'Room booking summary',
      [
        { label: 'Booking number', value: data.summary?.booking_number || data.booking_number },
        { label: 'Member', value: data.member?.name || data.memberName },
        { label: 'Check-in', value: data.summary?.checkin },
        { label: 'Check-out', value: data.summary?.checkout },
        { label: 'Total', value: `Rs. ${Number(data.summary?.total_amount || 0).toFixed(2)}` },
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
      data.summary?.booking_number || data.booking_number,
      'Room booking summary',
      [
        { label: 'Booking number', value: data.summary?.booking_number || data.booking_number },
        { label: 'Stay', value: `${data.summary?.checkin} to ${data.summary?.checkout}` },
        { label: 'Status', value: data.summary?.status || data.status },
        { label: 'Payment', value: data.payment?.status || data.payment_info?.payment_status },
      ],
    );
  }, [data]);

  const cancelRoom = useCallback(
    async (roomId: number | string) => {
      const response = await javascriptGet({
        path: `member/room/booking/cancel/${roomId}`,
        Token: userData.token,
      });

      Toast.show(response?.message || 'Room updated.', {
        type: response?.status ? 'success' : 'danger',
      });
      await refresh();
    },
    [refresh, userData.token],
  );

  const tone = resolveTone(data?.summary?.status || data?.status);
  const paymentTimeline = buildPaymentTimeline(data?.payment);

  const actionItems = useMemo(
    () => [
      { label: 'Download', icon: 'file-download-outline', onPress: handleDownload },
      { label: 'Share', icon: 'share-variant-outline', onPress: handleShare },
    ],
    [handleDownload, handleShare],
  );

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <Header title="Room Booking" />
        <BookingDetailSkeleton />
      </View>
    );
  }

  if (isError || !data) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <Header title="Room Booking" />
        <EmptyStateCard
          type="error"
          title="Room booking unavailable"
          description="We could not load the room booking details right now. Pull to refresh and try again."
        />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Header title="Room Booking" />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
      >
        <BookingHeroCard
          eyebrow="Stay Reservation"
          title={data.summary?.booking_number || data.booking_number}
          subtitle={`${data.member?.name || data.memberName} • ${data.summary?.night_count || 0} night stay`}
          status={data.summary?.status || data.status}
          statusTone={tone.color === colors.success ? 'success' : tone.color === colors.danger ? 'danger' : 'warning'}
          meta={[
            { label: 'Rooms', value: String(data.summary?.room_count || 0), tone: 'neutral' },
            { label: 'Guests', value: String(data.summary?.guest_count || 0), tone: 'neutral' },
            {
              label: 'Payment',
              value: data.payment?.status || data.payment_info?.payment_status || 'Not Paid',
              tone:
                String(data.payment?.status || data.payment_info?.payment_status).toLowerCase() === 'paid'
                  ? 'success'
                  : 'warning',
            },
          ]}
        />

        <ActionBar actions={actionItems} />

        <DetailSection title="Booking Snapshot" subtitle="Quick stay summary and member details." delay={40}>
          <DetailGrid
            items={[
              { label: 'Member', value: data.member?.name || data.memberName, highlight: true },
              { label: 'Member ID', value: data.member?.member_id || data.memberID },
              { label: 'SC ID', value: data.member?.sc_id || data.chartID },
              { label: 'Check-in', value: data.summary?.checkin },
              { label: 'Check-out', value: data.summary?.checkout },
              { label: 'Booked on', value: data.summary?.booked_on },
            ]}
          />
        </DetailSection>

        <DetailSection title="Room Breakdown" subtitle="Each reserved room, occupancy mix, and cancellation state." delay={70}>
          {data.room_details?.map((item: any) => {
            const roomTone = resolveTone(item.status);
            const canCancel =
              moment().startOf('day').isBefore(moment(data.checkin)) &&
              item.status === 'Active' &&
              String(data.payment?.status || data.payment_info?.payment_status).toLowerCase() === 'paid';

            return (
              <View
                key={item.id}
                style={[
                  styles.roomCard,
                  {
                    backgroundColor: colors.surfaceAlt,
                    borderColor: roomTone.border,
                  },
                ]}
              >
                <View style={styles.roomHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.roomTitle, { color: colors.text }]}>{item.room_name}</Text>
                    <Text style={[styles.roomSub, { color: colors.textMuted }]}>
                      {item.occupant_name} • {item.no_of_rooms} room(s) × {item.no_of_days} night(s)
                    </Text>
                  </View>
                  <View style={[styles.statusChip, { backgroundColor: roomTone.background }]}>
                    <Text style={[styles.statusText, { color: roomTone.color }]}>{item.status}</Text>
                  </View>
                </View>

                <DetailGrid
                  items={[
                    { label: 'Adults', value: item.adult },
                    { label: 'Children', value: item.child },
                    { label: 'Room rate', value: `Rs. ${Number(item.room_charges).toFixed(2)}` },
                    { label: 'GST', value: `Rs. ${Number(item.gst_amount).toFixed(2)}` },
                    { label: 'Room total', value: `Rs. ${Number(item.room_charge_total).toFixed(2)}`, highlight: true },
                    { label: 'Guest contact', value: item.guest_mobile || 'N/A' },
                  ]}
                />

                {item.status === 'Cancelled' ? (
                  <View style={[styles.cancelBox, { borderColor: colors.danger, backgroundColor: `${colors.danger}10` }]}>
                    <Text style={[styles.cancelTitle, { color: colors.danger }]}>Cancellation Summary</Text>
                    <Text style={[styles.cancelText, { color: colors.text }]}>
                      Deduction: Rs. {Number(item.cancellation_deducation || 0).toFixed(2)}
                    </Text>
                    <Text style={[styles.cancelText, { color: colors.text }]}>
                      Refund: Rs. {(Number(item.room_charge_total) - Number(item.cancellation_deducation || 0)).toFixed(2)}
                    </Text>
                  </View>
                ) : null}

                {canCancel ? (
                  <TouchableOpacity
                    style={[styles.cancelButton, { backgroundColor: colors.danger }]}
                    onPress={() =>
                      Alert.alert('Cancel room', 'Are you sure you want to cancel this room?', [
                        { text: 'No', style: 'cancel' },
                        { text: 'Yes', style: 'destructive', onPress: () => cancelRoom(item.id) },
                      ])
                    }
                  >
                    <Icon name="close-circle-outline" size={16} color={colors.onPrimary} />
                    <Text style={[styles.cancelButtonText, { color: colors.onPrimary }]}>Cancel room</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            );
          })}
        </DetailSection>

        <DetailSection title="Payment and Invoice" subtitle="Transaction references and billing totals." delay={100}>
          <PaymentSummaryCard
            status={data.payment?.status || data.payment_info?.payment_status}
            items={[
              { label: 'Subtotal', value: `Rs. ${Number(data.invoice?.subtotal || 0).toFixed(2)}` },
              { label: 'GST', value: `Rs. ${Number(data.invoice?.gst_total || 0).toFixed(2)}` },
              { label: 'Grand total', value: `Rs. ${Number(data.invoice?.total || 0).toFixed(2)}`, emphasize: true },
              { label: 'Reference', value: data.payment?.reference_number || data.payment_info?.bank_refrance_no || 'Pending' },
              { label: 'Gateway', value: data.payment?.gateway_name || 'Club gateway' },
            ]}
          />
        </DetailSection>

        <DetailSection title="Booking Timeline" subtitle="Operational updates for the stay reservation." delay={130}>
          <StatusTimeline items={data.timeline || []} />
        </DetailSection>

        {paymentTimeline.length ? (
          <DetailSection title="Payment Timeline" subtitle="Financial checkpoints for the reservation." delay={160}>
            <StatusTimeline items={paymentTimeline} />
          </DetailSection>
        ) : null}

        <DetailSection title="Rules and Support" subtitle="Important stay information and help desk details." delay={190}>
          <View style={styles.ruleList}>
            {data.rules?.map((rule: string, index: number) => (
              <View key={`${rule}-${index}`} style={styles.ruleRow}>
                <Icon name="information-outline" size={18} color={colors.secondary} />
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
  roomCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
  },
  roomHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  roomTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  roomSub: {
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

export default InvoiceDetails;
