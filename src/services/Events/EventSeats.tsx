import React, { useMemo, useState } from 'react';
import {
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSelector } from 'react-redux';
import { useQuery } from '@tanstack/react-query';

import Header from '../../components/Header';
import BookingHeroCard from '../../components/booking/BookingHeroCard';
import DetailSection from '../../components/booking/DetailSection';
import EmptyStateCard from '../../components/booking/EmptyStateCard';
import NewButton from '../../components/Button';
import AppAlertModal from '../../components/feedback/AppAlertModal';
import { useAppAlert } from '../../hooks/useAppAlert';
import { useAppTheme } from '../../theme/AppThemeProvider';
import { javascriptGet } from '../../util/api';
import { AppStackParamList } from '../../navigation/AppDrawer';
import { RootState } from '../../store/store';
import { FONT_FAMILY } from '../../util/colors';

const Legend = ({
  color,
  label,
  borderColor,
}: {
  color: string;
  label: string;
  borderColor?: string;
}) => (
  <View style={styles.legendItem}>
    <View style={[styles.legendBox, { backgroundColor: color, borderColor: borderColor || color }]} />
    <Text style={styles.legendText}>{label}</Text>
  </View>
);

const useGetEventSeatsQuery = (params: any) =>
  useQuery({
    queryKey: ['eventSeats', params.event_id],
    queryFn: async () =>
      javascriptGet({
        path: `member/events/get-event-seats/${params.event_id}`,
        Token: params.token,
      }),
    enabled: !!params.event_id,
  });

type Props = NativeStackScreenProps<AppStackParamList, 'EventSeats'>;

const EventSeats: React.FC<Props> = ({ route, navigation }) => {
  const userData = useSelector((state: RootState) => state.auth);
  const { colors } = useAppTheme();
  const { alertState, showAlert, hideAlert } = useAppAlert();
  const { event, tickets, cart, totalTickets, member, totalAmount, waiters } = route.params;
  const [selectedSeats, setSelectedSeats] = useState<any[]>([]);

  const selectedTickets = tickets
    .map((ticket: any) => (cart[ticket.id] ? { ...ticket, quantity: cart[ticket.id] } : null))
    .filter(Boolean);

  const seatQuery = useGetEventSeatsQuery({
    event_id: event.id,
    token: userData?.token,
    member_id: member?.id || undefined,
  });

  const layouts = useMemo(() => seatQuery?.data?.layouts || [], [seatQuery?.data?.layouts]);
  const allSeats = useMemo(() => layouts.flatMap((layout: any) => layout?.seats || []), [layouts]);

  const seatsByBlock = useMemo(
    () =>
      allSeats.reduce((acc: any, seat: any) => {
        const block = seat?.category?.name || 'General';
        if (!acc[block]) {
          acc[block] = {
            price: seat?.category?.price,
            color: seat?.category?.color,
            seats: [],
          };
        }
        acc[block].seats.push(seat);
        return acc;
      }, {}),
    [allSeats],
  );

  const complimentaryAllowedCount = selectedTickets.reduce(
    (acc: number, ticket: any) =>
      ticket?.type === 'member' || ticket?.type === 'spouse' ? acc + ticket.quantity : acc,
    0,
  );

  const toggleSeat = (seat: any, seatType: string) => {
    const exists = selectedSeats.find(item => item.id === seat.id);

    if (exists) {
      setSelectedSeats(previous => previous.filter(item => item.id !== seat.id));
      return;
    }

    if (seat.status !== 'available') {
      showAlert({
        title: 'Seat unavailable',
        message: 'This seat cannot be selected anymore.',
        tone: 'danger',
      });
      return;
    }

    const complimentaryCount = selectedSeats.filter(
      item => item?.category?.seat_type === 'complimentary',
    ).length;

    if (seatType === 'complimentary' && complimentaryCount >= complimentaryAllowedCount) {
      showAlert({
        title: 'Complimentary limit reached',
        message: 'You have already selected the maximum complimentary seats allowed for these passes.',
        tone: 'warning',
      });
      return;
    }

    if (selectedSeats.length >= totalTickets) {
      showAlert({
        title: 'Seat limit reached',
        message: `You can only select ${totalTickets} seat${totalTickets > 1 ? 's' : ''}.`,
        tone: 'warning',
      });
      return;
    }

    setSelectedSeats(previous => [...previous, seat]);
  };

  const handleNavigation = () => {
    if (selectedSeats.length !== totalTickets) {
      showAlert({
        title: 'Complete seat selection',
        message: `Please select exactly ${totalTickets} seat${
          totalTickets > 1 ? 's' : ''
        } before continuing.`,
        tone: 'warning',
      });
      return;
    }

    navigation.navigate('EventCheckOut', {
      event,
      tickets,
      cart,
      totalAmount,
      totalTickets,
      waiters,
      member,
      selectedSeats,
    });
  };

  if (seatQuery.isError) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Header title="Seat Booking" />
        <EmptyStateCard
          type="error"
          title="Unable to load seats"
          description="We could not fetch the seating layout right now. Pull to refresh and try again."
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header title="Select Seats" />

      <FlatList
        data={Object.keys(seatsByBlock)}
        keyExtractor={item => item}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={Boolean(seatQuery.isRefetching)}
            onRefresh={seatQuery.refetch}
            tintColor={colors.primary}
          />
        }
        ListHeaderComponent={
          <View>
            <BookingHeroCard
              eyebrow="Seat Mapping"
              title={event?.name || 'Event seating'}
              subtitle={`${selectedSeats.length}/${totalTickets} seats selected`}
              status={seatQuery?.data?.status ? 'Layout ready' : 'Unavailable'}
              statusTone={seatQuery?.data?.status ? 'success' : 'danger'}
              meta={[
                { label: 'Regular', value: String(totalTickets) },
                { label: 'Complimentary', value: String(complimentaryAllowedCount) },
                { label: 'Waiters', value: waiters ? String(waiters) : '0' },
              ]}
            />

            <DetailSection
              title="Seat rules"
              subtitle="Seat eligibility is still controlled by the backend; this view only helps you choose valid seats."
              delay={40}
            >
              <View
                style={[
                  styles.stage,
                  { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
                ]}
              >
                <Text style={[styles.stageText, { color: colors.textMuted }]}>STAGE</Text>
              </View>

              <View style={styles.legendRow}>
                <Legend color="#D1D5DB" label="Blocked" borderColor="#D1D5DB" />
                <Legend color="#9CA3AF" label="Booked" borderColor="#9CA3AF" />
                <Legend color={colors.primary} label="Selected" borderColor={colors.primary} />
              </View>
            </DetailSection>
          </View>
        }
        renderItem={({ item: block }) => {
          const blockData = seatsByBlock[block];
          const seatsByRow = blockData.seats.reduce((acc: any, seat: any) => {
            if (!acc[seat.row_label]) {
              acc[seat.row_label] = [];
            }
            acc[seat.row_label].push(seat);
            return acc;
          }, {});

          return (
            <DetailSection
              title={`${block} • Rs. ${Number(blockData.price || 0).toFixed(2)}`}
              subtitle={`${blockData.seats.length} seats in this block.`}
              delay={70}
            >
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View>
                  {Object.keys(seatsByRow).map(row => (
                    <View key={row} style={styles.rowWrap}>
                      <Text style={[styles.rowLabel, { color: colors.textMuted }]}>{row}</Text>
                      <View style={styles.seatRow}>
                        {seatsByRow[row]
                          .sort((a: any, b: any) => a.seat_number - b.seat_number)
                          .map((seat: any) => {
                            const selected = selectedSeats.find(item => item.id === seat.id);
                            const status = seat.status;
                            const isVip = seat?.category?.seat_type === 'vip';
                            const isComplimentary =
                              seat?.category?.seat_type === 'complimentary';
                            const isDisabled =
                              userData?.user?.role !== 'Event Admin'
                                ? (isVip && !seatQuery?.data?.vip_allowed) ||
                                  (isComplimentary && !seatQuery?.data?.complimentary_allowed)
                                : (isVip && !seatQuery?.data?.vip_allowed) ||
                                  (isComplimentary && !seatQuery?.data?.complimentary_allowed);

                            const backgroundColor = isDisabled
                              ? '#D1D5DB'
                              : status === 'blocked'
                              ? '#D1D5DB'
                              : status === 'booked'
                              ? '#9CA3AF'
                              : seat?.category?.color || colors.success;

                            return (
                              <Pressable
                                key={seat.id}
                                disabled={isDisabled || status !== 'available'}
                                style={[
                                  styles.seat,
                                  {
                                    backgroundColor,
                                    borderColor: selected ? colors.text : 'transparent',
                                  },
                                ]}
                                onPress={() =>
                                  toggleSeat(seat, seat?.category?.seat_type || 'regular')
                                }
                              >
                                <Text style={styles.seatCode}>{seat.seat_code}</Text>
                              </Pressable>
                            );
                          })}
                      </View>
                    </View>
                  ))}
                </View>
              </ScrollView>
            </DetailSection>
          );
        }}
        ListEmptyComponent={
          seatQuery.isLoading ? null : !seatQuery?.data?.status ? (
            <View style={styles.emptyWrap}>
              <Image
                source={require('../../../assets/images/no-seat.png')}
                style={styles.emptyImage}
              />
              <EmptyStateCard
                title="Seat booking unavailable"
                description={seatQuery?.data?.message || 'Seat booking is not available for this event.'}
              />
            </View>
          ) : null
        }
        ListFooterComponent={
          seatQuery?.data?.status ? (
            <View
              style={[
                styles.footer,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.footerTitle, { color: colors.text }]}>
                  {selectedSeats.length} seat(s) selected
                </Text>
                <Text style={[styles.footerSubtitle, { color: colors.textMuted }]}>
                  Match the selected seats with the pass quantity before continuing.
                </Text>
              </View>
              <NewButton text="Continue" onPress={handleNavigation} />
            </View>
          ) : null
        }
      />

      <AppAlertModal
        visible={alertState.visible}
        title={alertState.title}
        message={alertState.message}
        tone={alertState.tone}
        primaryLabel={alertState.primaryLabel}
        secondaryLabel={alertState.secondaryLabel}
        onDismiss={hideAlert}
        onPrimaryPress={() => {
          hideAlert();
          alertState.onPrimaryPress?.();
        }}
        onSecondaryPress={() => {
          hideAlert();
          alertState.onSecondaryPress?.();
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingBottom: 24,
  },
  stage: {
    alignSelf: 'center',
    width: '78%',
    borderRadius: 18,
    borderWidth: 1,
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stageText: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.bold,
    letterSpacing: 2,
  },
  legendRow: {
    marginTop: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 8,
    marginBottom: 8,
  },
  legendBox: {
    width: 14,
    height: 14,
    borderRadius: 4,
    borderWidth: 1,
    marginRight: 6,
  },
  legendText: {
    fontSize: 12,
    color: '#6B7280',
    fontFamily: FONT_FAMILY.normal,
  },
  rowWrap: {
    marginBottom: 14,
  },
  rowLabel: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.semiBold,
    marginBottom: 8,
  },
  seatRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  seat: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  seatCode: {
    fontSize: 10,
    color: '#FFFFFF',
    fontFamily: FONT_FAMILY.bold,
  },
  emptyWrap: {
    alignItems: 'center',
  },
  emptyImage: {
    width: 120,
    height: 120,
    marginTop: 8,
  },
  footer: {
    marginHorizontal: 16,
    marginTop: 10,
    borderWidth: 1,
    borderRadius: 22,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  footerTitle: {
    fontSize: 15,
    fontFamily: FONT_FAMILY.bold,
  },
  footerSubtitle: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 17,
    fontFamily: FONT_FAMILY.normal,
  },
});

export default EventSeats;
