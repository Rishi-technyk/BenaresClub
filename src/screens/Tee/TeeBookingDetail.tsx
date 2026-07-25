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

import Header from '../../components/Header';
import BookingHeroCard from '../../components/booking/BookingHeroCard';
import ActionBar from '../../components/booking/ActionBar';
import DetailSection from '../../components/booking/DetailSection';
import DetailGrid from '../../components/booking/DetailGrid';
import SupportCard from '../../components/booking/SupportCard';
import EmptyStateCard from '../../components/booking/EmptyStateCard';
import StatusTimeline from '../../components/timeline/StatusTimeline';
import BookingDetailSkeleton from '../../components/loaders/BookingDetailSkeleton';
import { useBookingDetails } from '../../hooks/useBookingDetails';
import { usePaymentStatus } from '../../hooks/usePaymentStatus';
import { createBookingSummaryPdf, shareBookingSummary } from '../../util/bookingDocuments';
import { ENDPOINT } from '../../util/constant';
import { javascriptGet } from '../../util/api';
import { RootState } from '../../store/store';
import { useAppTheme } from '../../theme/AppThemeProvider';

const TeeBookingDetail = ({ navigation, route }: any) => {
  const userData = useSelector((state: RootState) => state.auth);
  const { colors } = useAppTheme();
  const { resolveTone } = usePaymentStatus();
  const bookingId = route.params?.tee_booking_detail_id;

  const { data, isLoading, isError, refreshing, refresh } = useBookingDetails({
    queryKey: 'tee-booking-detail',
    path: `${ENDPOINT.tee_booking_detail}${bookingId}`,
    token: userData?.token,
    transform: response => (response?.status ? response.data : null),
  });

  const handleDownload = useCallback(async () => {
    if (!data) {
      return;
    }

    const file = await createBookingSummaryPdf(
      `tee-${data.summary?.booking_number || bookingId}`,
      'Golf tee reservation',
      [
        { label: 'Booking', value: data.summary?.booking_number || bookingId },
        { label: 'Date', value: data.summary?.booking_date },
        { label: 'Tee time', value: data.summary?.tee_time },
        { label: 'Hole', value: data.summary?.hole_number },
        { label: 'Players', value: String(data.summary?.player_count || 0) },
      ],
    );

    Toast.show(file?.filePath ? `Summary saved at ${file.filePath}` : 'Unable to save summary.', {
      type: file?.filePath ? 'success' : 'danger',
    });
  }, [bookingId, data]);

  const handleShare = useCallback(async () => {
    if (!data) {
      return;
    }

    await shareBookingSummary(
      `tee-${data.summary?.booking_number || bookingId}`,
      'Golf tee reservation',
      [
        { label: 'Booking', value: data.summary?.booking_number || bookingId },
        { label: 'Date', value: data.summary?.booking_date },
        { label: 'Tee time', value: data.summary?.tee_time },
        { label: 'Players', value: String(data.summary?.player_count || 0) },
      ],
    );
  }, [bookingId, data]);

  const cancelBooking = useCallback(async () => {
    if (!data?.tee_booking_detail_id) {
      return;
    }

    Alert.alert('Cancel booking', 'Do you want to cancel this tee reservation?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes',
        style: 'destructive',
        onPress: async () => {
          const response = await javascriptGet({
            path: ENDPOINT.tee_cancel_booking + data.id,
            Token: userData?.token,
          });

          Toast.show(response?.message || 'Booking updated.', {
            type: response?.status ? 'success' : 'danger',
          });

          route?.params?.refetch?.();
          await refresh();
        },
      },
    ]);
  }, [data?.id, data?.tee_booking_detail_id, refresh, route, userData?.token]);

  const actionItems = useMemo(() => {
    const actions = [
      { label: 'Download', icon: 'file-download-outline', onPress: handleDownload },
      { label: 'Share', icon: 'share-variant-outline', onPress: handleShare },
    ];

    if (
      data &&
      Number(data.is_cancelled) === 0 &&
      moment(`${data.booking_date} ${data.tee_time}`).isAfter(moment()) &&
      Number(data.created_by) === Number(userData?.user?.id)
    ) {
      actions.push({
        label: 'Cancel',
        icon: 'close-circle-outline',
        onPress: cancelBooking,
      });
    }

    return actions;
  }, [cancelBooking, data, handleDownload, handleShare, userData?.user?.id]);

  const canEditPlayers =
    data &&
    Number(data.is_cancelled) == 0 &&
    Number(data.created_by) === Number(userData?.user?.id) &&
    moment(`${data.booking_date} ${data.tee_time}`).isAfter(moment());
  const tone = resolveTone(data?.summary?.status || (Number(data?.is_cancelled) == 1 ? 'Cancelled' : 'Active'));
console.log( canEditPlayers, '---------------------- canEditPlayers ---------------------');
  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <Header title="Tee Booking" />
        <BookingDetailSkeleton />
      </View>
    );
  }

  if (isError || !data) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <Header title="Tee Booking" />
        <EmptyStateCard
          type="error"
          title="Tee booking unavailable"
          description="We could not load the tee reservation right now. Pull to refresh and try again."
        />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Header title="Tee Booking" />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
      >
        <BookingHeroCard
          eyebrow="Golf Reservation"
          // title={`Tee ${data.summary?.tee_time || data.tee_time}`}
                    title={`Tee ${data.summary?.tee_time || data.tee_time}`}
          subtitle={`${data.summary?.booking_date || moment(data.booking_date).format('DD MMM YYYY')} • Hole ${data.summary?.hole_number || data.hole_number}`}
          status={data.summary?.status || (Number(data.is_cancelled) === 1 ? 'Cancelled' : 'Active')}
          statusTone={tone.color === colors.danger ? 'danger' : 'success'}
          meta={[
            { label: 'Players', value: String(data.summary?.player_count || 0), tone: 'neutral' },
            // { label: 'Available', value: String(data.summary?.available_spots || 0), tone: 'neutral' },
            { label: 'Booked by', value: data.member?.name || data.player1_name, tone: 'neutral' },
          ]}
        />

        <ActionBar actions={actionItems} />

        <DetailSection title="Booking Snapshot" subtitle="Core tee sheet details for this reservation." delay={40}>
          <DetailGrid
            items={[
              { label: 'Booking ID', value: data.summary?.booking_number || data.tee_booking_detail_id, highlight: true },
              { label: 'Date', value: data.summary?.booking_date },
              { label: 'Tee time', value: data.summary?.tee_time || data.tee_time },
              { label: 'Hole', value: data.summary?.hole_number || data.hole_number },
              { label: 'Players', value: data.summary?.player_count },
              { label: 'Created', value: data.summary?.booked_on },
            ]}
          />
        </DetailSection>

        <DetailSection title="Player Line-up" 
        // subtitle="Current players locked into the tee sheet."
         delay={70}>
          {data.players?.map((player: any) => (
            <View
              key={`${player.slot}-${player.id}`}
              style={[
                styles.playerCard,
                {
                  backgroundColor: colors.surfaceAlt,
                  borderColor: colors.border,
                },
              ]}
            >
              <View style={styles.playerIndex}>
                <Text style={[styles.playerIndexText, { color: colors.onPrimary }]}>
                  {player.slot}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.playerName, { color: colors.text }]}>{player.name}</Text>
                <Text style={[styles.playerMeta, { color: colors.textMuted }]}>
                  Member ID: {player.member_id || 'N/A'}
                </Text>
              </View>
            </View>
          ))}

          {canEditPlayers ? (
            <TouchableOpacity
              style={[styles.editButton, { borderColor: colors.text, backgroundColor: `${colors.text}12` }]}
              onPress={() =>
                navigation.navigate('TeeBuddies', {
                  data,
                  refetch: async () => {
                    route?.params?.refetch?.();
                    await refresh();
                  },
                })
              }
            >
              <Icon name="account-edit-outline" size={18} color={colors.text} />
              <Text style={[styles.editText, { color: colors.text }]}>Edit Players</Text>
            </TouchableOpacity>
          ) : null}
        </DetailSection>

        <DetailSection title="Booking Timeline"
        //  subtitle="Operational status for this tee reservation."
          delay={100}>
          <StatusTimeline items={data.timeline || []} />
        </DetailSection>

        <DetailSection title="Playing Rules and Support" subtitle="Important reminders for your tee time." delay={130}>
          <View style={styles.ruleList}>
            {data.rules?.map((rule: string, index: number) => (
              <View key={`${rule}-${index}`} style={styles.ruleRow}>
                <Icon name="flag-checkered" size={18} color={colors.secondary} />
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
  playerCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  playerIndex: {
    width: 34,
    height: 34,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f172a',
    marginRight: 12,
  },
  playerIndexText: {
    fontSize: 13,
    fontWeight: '800',
  },
  playerName: {
    fontSize: 14,
    fontWeight: '700',
  },
  playerMeta: {
    marginTop: 4,
    fontSize: 12,
  },
  editButton: {
    marginTop: 4,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 11,
    paddingHorizontal: 14,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
  },
  editText: {
    marginLeft: 8,
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

export default TeeBookingDetail;
