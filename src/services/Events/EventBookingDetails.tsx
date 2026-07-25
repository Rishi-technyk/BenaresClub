import React, { useCallback, useMemo } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import moment from 'moment';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSelector } from 'react-redux';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Toast } from 'react-native-toast-notifications';

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
import { AppStackParamList } from '../../navigation/AppDrawer';
import { RootState } from '../../store/store';
import { ENDPOINT } from '../../util/constant';
import { useAppTheme } from '../../theme/AppThemeProvider';

type Props = NativeStackScreenProps<AppStackParamList, 'EventBookingDetails'>;

const EventPassDetails: React.FC<Props> = ({ navigation, route }) => {
  const { bookingId } = route.params;
  const userData = useSelector((state: RootState) => state.auth);
  const { colors } = useAppTheme();
  const { resolveTone, buildPaymentTimeline } = usePaymentStatus();

  const { data, isLoading, isError, refreshing, refresh } = useBookingDetails({
    queryKey: 'event-booking-detail',
    path: `${ENDPOINT.event_booking_detail}/${bookingId}`,
    token: userData?.token,
    transform: response => (response?.status ? response : null),
  });

  const booking = data?.booking;
  const participants = useMemo(() => data?.participants || [], [data?.participants]);
  const summary = data?.summary || {};
  const payment = data?.payment || {};
  const tone = resolveTone(summary?.status || booking?.payment_status);
  const paymentTimeline = buildPaymentTimeline(payment);

  const groupedParticipants = useMemo(() => {
    return participants.reduce((acc: Record<string, any>, participant: any) => {
      const key = String(participant.ticket_id || participant.ticket_type);
      if (!acc[key]) {
        acc[key] = {
          title: participant.title,
          ticketType: participant.ticket_type,
          count: 0,
          amount: participant.amount,
          complimentary: Number(participant.is_complimentary) === 1,
          entries: 0,
          foodServed: 0,
        };
      }

      acc[key].count += 1;
      acc[key].entries += participant.entry_status ? 1 : 0;
      acc[key].foodServed += participant.food_status ? 1 : 0;

      return acc;
    }, {});
  }, [participants]);

  const handleDownload = useCallback(async () => {
    if (!booking) {
      return;
    }

    const file = await createBookingSummaryPdf(
      booking.booking_no,
      booking.event_name,
      [
        { label: 'Event date', value: moment(booking.event_date).format('DD MMM YYYY, h:mm A') },
        { label: 'Booking number', value: booking.booking_no },
        { label: 'Tickets', value: summary?.ticket_count || participants.length },
        { label: 'Total paid', value: `Rs. ${Number(summary?.total_amount || booking.total_paid || 0).toFixed(2)}` },
      ],
    );

    Toast.show(file?.filePath ? `Summary saved at ${file.filePath}` : 'Unable to save summary.', {
      type: file?.filePath ? 'success' : 'danger',
    });
  }, [booking, participants.length, summary?.ticket_count, summary?.total_amount]);

  const handleShare = useCallback(async () => {
    if (!booking) {
      return;
    }

    await shareBookingSummary(
      booking.booking_no,
      booking.event_name,
      [
        { label: 'Event date', value: moment(booking.event_date).format('DD MMM YYYY, h:mm A') },
        { label: 'Status', value: summary?.status || payment?.status || booking.payment_status },
        { label: 'Total paid', value: `Rs. ${Number(summary?.total_amount || booking.total_paid || 0).toFixed(2)}` },
        { label: 'Participants', value: participants.length },
      ],
    );
  }, [booking, participants, payment?.status, summary?.status, summary?.total_amount]);

  const actionItems = useMemo(
    () => [
      { label: 'Download', icon: 'file-download-outline', onPress: handleDownload },
      { label: 'Share', icon: 'share-variant-outline', onPress: handleShare },
      {
        label: 'Passes',
        icon: 'qrcode-scan',
        onPress: () => navigation.navigate('EventPasses', { bookingId }),
      },
    ],
    [bookingId, handleDownload, handleShare, navigation],
  );

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <Header title="Event Booking" />
        <BookingDetailSkeleton />
      </View>
    );
  }

  if (isError || !booking) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <Header title="Event Booking" />
        <EmptyStateCard
          type="error"
          title="Event booking unavailable"
          description="We could not load the event booking details right now. Pull to refresh and try again."
        />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Header title="Event Booking" />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
      >
        <BookingHeroCard
          eyebrow="Event Passes"
          title={booking.event_name}
          subtitle={`${moment(booking.event_date).format('ddd, DD MMM • h:mm A')} • ${booking.event_location || 'Club venue'}`}
          status={payment?.status || booking.payment_status}
          statusTone={tone.color === colors.success ? 'success' : tone.color === colors.danger ? 'danger' : 'warning'}
          meta={[
            { label: 'Booking', value: booking.booking_no, tone: 'neutral' },
            { label: 'Tickets', value: String(summary?.ticket_count || participants.length), tone: 'neutral' },
            { label: 'Seats', value: String(summary?.seat_count || booking.seats?.length || 0), tone: 'neutral' },
          ]}
        />

        <ActionBar actions={actionItems} />

        <DetailSection title="Booking Snapshot" subtitle="Event, member, and attendance overview." delay={40}>
          <DetailGrid
            items={[
              { label: 'Member', value: data?.member?.name || booking.memberId, highlight: true },
              { label: 'Member ID', value: data?.member?.member_id || booking.memberId },
              { label: 'Event date', value: moment(booking.event_date).format('DD MMM YYYY, h:mm A') },
              { label: 'Location', value: booking.event_location || 'Club venue' },
              { label: 'Tickets', value: summary?.ticket_count || participants.length },
              { label: 'Total paid', value: `Rs. ${Number(summary?.total_amount || booking.total_paid || 0).toFixed(2)}` },
            ]}
          />
        </DetailSection>

        <DetailSection title="Pass Mix" subtitle="Ticket categories, usage, and serving progress." delay={70}>
          {Object.values(groupedParticipants).map((group: any, index: number) => (
            <View
              key={`${group.title}-${index}`}
              style={[
                styles.ticketCard,
                {
                  backgroundColor: colors.surfaceAlt,
                  borderColor: colors.border,
                },
              ]}
            >
              <View style={styles.ticketHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.ticketTitle, { color: colors.text }]}>
                    {String(group.title).toUpperCase()}
                  </Text>
                  <Text style={[styles.ticketMeta, { color: colors.textMuted }]}>
                    {group.count} pass(es) • {group.complimentary ? 'Complimentary' : `Rs. ${Number(group.amount || 0).toFixed(2)} each`}
                  </Text>
                </View>
                <View style={[styles.statusChip, { backgroundColor: `${colors.primary}12` }]}>
                  <Text style={[styles.statusText, { color: colors.primary }]}>{group.ticketType}</Text>
                </View>
              </View>

              <DetailGrid
                items={[
                  { label: 'Issued', value: group.count },
                  { label: 'Entries done', value: group.entries },
                  { label: 'Food served', value: group.foodServed },
                  { label: 'QR ready', value: participants.filter((item: any) => item.qr_code).length },
                ]}
              />
            </View>
          ))}
        </DetailSection>

        <DetailSection title="Participants" subtitle="Individual passes and live usage state." delay={100}>
          {participants.map((participant: any) => (
            <View
              key={participant.id}
              style={[
                styles.participantCard,
                {
                  backgroundColor: colors.surfaceAlt,
                  borderColor: colors.border,
                },
              ]}
            >
              <View style={styles.participantHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.participantName, { color: colors.text }]}>
                    {participant.name || participant.title}
                  </Text>
                  <Text style={[styles.participantMeta, { color: colors.textMuted }]}>
                    {participant.ticket_type} • {participant.qr_code ? 'QR ready' : 'QR pending'}
                  </Text>
                </View>
                <View style={styles.participantBadges}>
                  {participant.entry_status ? (
                    <View style={[styles.smallBadge, { backgroundColor: `${colors.success}18` }]}>
                      <Text style={[styles.smallBadgeText, { color: colors.success }]}>Entered</Text>
                    </View>
                  ) : null}
                  {participant.food_status ? (
                    <View style={[styles.smallBadge, { backgroundColor: `${colors.warning}18` }]}>
                      <Text style={[styles.smallBadgeText, { color: colors.warning }]}>Food</Text>
                    </View>
                  ) : null}
                </View>
              </View>
            </View>
          ))}
        </DetailSection>

        <DetailSection title="Payment and Invoice" subtitle="Charges, taxes, and gateway metadata." delay={130}>
          <PaymentSummaryCard
            status={payment?.status || booking.payment_status}
            items={[
              { label: 'Ticket subtotal', value: `Rs. ${Number(data?.invoice?.ticket_subtotal || booking.ticket_subtotal || 0).toFixed(2)}` },
              { label: 'Seat subtotal', value: `Rs. ${Number(data?.invoice?.seat_subtotal || 0).toFixed(2)}` },
              { label: 'Waiter amount', value: `Rs. ${Number(data?.invoice?.waiter_amount || booking.waiter_amount || 0).toFixed(2)}` },
              { label: 'Service charge', value: `Rs. ${Number(data?.invoice?.service_charge || booking.service_charge || 0).toFixed(2)}` },
              { label: 'GST', value: `Rs. ${Number(data?.invoice?.gst || booking.gst || 0).toFixed(2)}` },
              { label: 'Grand total', value: `Rs. ${Number(data?.invoice?.total || booking.total_paid || 0).toFixed(2)}`, emphasize: true },
            ]}
          />
        </DetailSection>

        <DetailSection title="Booking Timeline" subtitle="Attendance and event readiness milestones." delay={160}>
          <StatusTimeline items={data?.timeline || []} />
        </DetailSection>

        {paymentTimeline.length ? (
          <DetailSection title="Payment Timeline" subtitle="Payment checkpoints and processing history." delay={190}>
            <StatusTimeline items={paymentTimeline} />
          </DetailSection>
        ) : null}

        <DetailSection title="Rules and Support" subtitle="Pass usage guidelines and support contacts." delay={220}>
          <View style={styles.ruleList}>
            {data?.rules?.map((rule: string, index: number) => (
              <View key={`${rule}-${index}`} style={styles.ruleRow}>
                <Icon name="ticket-confirmation-outline" size={18} color={colors.secondary} />
                <Text style={[styles.ruleText, { color: colors.text }]}>{rule}</Text>
              </View>
            ))}
          </View>

          <View style={{ marginTop: 14 }}>
            <SupportCard
              contactName={data?.support?.name}
              phone={data?.support?.phone}
              email={data?.support?.email}
              note={data?.support?.note}
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
  ticketCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
  },
  ticketHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  ticketTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  ticketMeta: {
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
    textTransform: 'capitalize',
  },
  participantCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
  },
  participantHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  participantName: {
    fontSize: 14,
    fontWeight: '700',
  },
  participantMeta: {
    marginTop: 4,
    fontSize: 12,
  },
  participantBadges: {
    alignItems: 'flex-end',
  },
  smallBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    marginBottom: 6,
  },
  smallBadgeText: {
    fontSize: 11,
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

export default EventPassDetails;
