import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Modal } from 'react-native-paper';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { TextInput } from 'react-native-gesture-handler';
import { useSelector } from 'react-redux';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import Entypo from 'react-native-vector-icons/Entypo';
import moment from 'moment';

import Header from '../../components/Header';
import TicketCard from '../../components/TicketCard';
import TicketShimmer from '../../components/TicketShimmer';
import BookingHeroCard from '../../components/booking/BookingHeroCard';
import DetailSection from '../../components/booking/DetailSection';
import EmptyStateCard from '../../components/booking/EmptyStateCard';
import NewButton from '../../components/Button';
import AppAlertModal from '../../components/feedback/AppAlertModal';
import { useAppAlert } from '../../hooks/useAppAlert';
import { useAppTheme } from '../../theme/AppThemeProvider';
import { javascriptGet } from '../../util/api';
import { ENDPOINT } from '../../util/constant';
import { FONT_FAMILY } from '../../util/colors';
import { AppStackParamList } from '../../navigation/AppDrawer';
import { RootState } from '../../store/store';

type Props = NativeStackScreenProps<AppStackParamList, 'Event'>;

const Events: React.FC<Props> = ({ navigation, route }) => {
  const userData = useSelector((state: RootState) => state.auth);
  const { colors } = useAppTheme();
  const { alertState, showAlert, hideAlert } = useAppAlert();
  const [loading, setLoading] = useState(true);
  const [waiters, setWaiters] = useState(0);
  const [memberVerifyModal, setMemberVerifyModal] = useState(false);
  const [tickets, setTickets] = useState<any[]>([]);
  const [isSeatsAvailable, setIsSeatsAvailable] = useState(false);
  const [event, setEvent] = useState<any>(null);
  const [cart, setCart] = useState<Record<number, number>>({});
  const [memberIdInput, setMemberIdInput] = useState('');
  const [memberError, setMemberError] = useState('');
  const [verifyingMember, setVerifyingMember] = useState(false);
  const [member, setMember] = useState<any>(null);

  const fetchSettings = useCallback(
    async (memberId?: number | string) => {
      setLoading(true);
      const apiObj = {
        path: `${ENDPOINT.event_setting + `${route?.params?.url || route?.params?.data}`}${
          memberId ? `?memberid=${memberId}` : ''
        }`,
        Token: userData?.token,
        body: {},
      };

      const response = await javascriptGet(apiObj);
      setLoading(false);

      if (response?.status) {
        setTickets(response?.tickets || []);
        setEvent(response?.event || null);
        setIsSeatsAvailable(Boolean(response?.is_seat_booking_available));
        return;
      }

      setTickets([]);
      setEvent(null);
    },
    [route?.params?.data, route?.params?.url, userData?.token],
  );

  useFocusEffect(
    useCallback(() => {
      setCart({});
      setTickets([]);
      setEvent(null);
      setWaiters(0);
      if (userData?.user?.role !== 'Event Admin') {
        fetchSettings();
      }
      return () => undefined;
    }, [fetchSettings, userData?.user?.role]),
  );

  useEffect(() => {
    if (userData?.user?.role === 'Event Admin') {
      setMemberVerifyModal(true);
    }
  }, [userData?.user?.role]);

  const updateQty = (id: number, qty: number) => {
    setCart(previous => ({ ...previous, [id]: qty }));
  };
console.log( event?.image, '---------------------- event.image ---------------------');
  const ticketTotal = useMemo(
    () => tickets.reduce((sum, ticket) => sum + (cart[ticket.id] || 0) * Number(ticket.price || 0), 0),
    [cart, tickets],
  );

  const waiterTotal = event?.waiter && waiters > 0 ? waiters * event.waiter.price : 0;
  const totalAmount = ticketTotal + waiterTotal;
  const totalTickets = Object.values(cart).reduce((acc, value) => acc + value, 0);
  const hasSelection = totalTickets > 0 || waiters > 0;

  const verifyMember = async () => {
    if (!memberIdInput.trim()) {
      setMemberError('Please enter a member ID first.');
      return;
    }

    setVerifyingMember(true);
    const response = await javascriptGet({
      path: `member/verify/${memberIdInput.trim()}`,
      Token: userData?.token,
      body: {},
    });
    setVerifyingMember(false);

    if (response?.success) {
      setMember(response?.data);
      setMemberError('');
      setMemberVerifyModal(false);
      fetchSettings(response?.data?.id);
      return;
    }

    setMemberError(response?.message || 'Invalid member ID');
  };

  const handleContinue = () => {
    if (userData?.user?.role === 'Event Admin') {
      if (!member?.Mobile || !member?.DisplayName) {
        showAlert({
          title: 'Guest details required',
          message: 'Please enter a valid guest name and mobile number before checkout.',
          tone: 'warning',
        });
        return;
      }
    }

    if (!event) {
      showAlert({
        title: 'Event unavailable',
        message: 'We could not load this event configuration right now.',
        tone: 'danger',
      });
      return;
    }

    const payload = {
      event,
      tickets,
      cart,
      totalAmount,
      totalTickets,
      waiters,
      member: userData?.user?.role === 'Event Admin' ? member : undefined,
    };

    if (isSeatsAvailable) {
      navigation.navigate('EventSeats', payload as any);
      return;
    }

    navigation.navigate('EventCheckOut', payload as any);
  };

  const visibleTickets = tickets.filter(ticket => ticket?.max !== 0);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header title="Event Booking" />

      {!loading && !event ? (
        <EmptyStateCard
          title="No active event found"
          description="This event is not available anymore, or booking has not opened yet."
        />
      ) : (
        <>
          <ScrollView contentContainerStyle={styles.content}>
            {event ? (
              <>
                <View style={styles.imageWrap}>
                  <Image source={{ uri: event.image }} style={styles.banner} resizeMode="cover" />
                </View>

                <BookingHeroCard
                  eyebrow="Live Event"
                  title={event.name}
                  subtitle={`${moment(event.date).format('ddd, DD MMM • h:mm A')} • ${
                    event.location || 'Club venue'
                  }`}
                  status={'Available'}
                  statusTone="success"
                  // meta={[
                  //   {
                  //     label: 'Remaining',
                  //     value: String(event?.remaining_for_member ?? event?.max_per_member_tickets ?? 0),
                  //   },
                  //   {
                  //     label: 'Tickets',
                  //     value: String(visibleTickets.length),
                  //   },
                  //   {
                  //     label: 'Waiters',
                  //     value: event?.waiter?.remaining ? String(event.waiter.remaining) : 'N/A',
                  //   },
                  // ]}
                />
              </>
            ) : null}

            {member ? (
              <DetailSection
                title="Member checkout details"
                // subtitle="This member profile will be passed through event checkout and payment."
                delay={40}
              >
                <View style={styles.profileGrid}>
                  <View
                    style={[
                      styles.profileCard,
                      { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
                    ]}
                  >
                    <Text style={[styles.profileLabel, { color: colors.textMuted }]}>Member ID</Text>
                    <Text style={[styles.profileValue, { color: colors.text }]}>
                      {member?.MemberID}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.profileCard,
                      { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
                    ]}
                  >
                    <Text style={[styles.profileLabel, { color: colors.textMuted }]}>Role</Text>
                    <Text style={[styles.profileValue, { color: colors.text }]}>
                      {member?.role || 'Member'}
                    </Text>
                  </View>
                </View>

                {member?.role === 'Event Admin' ? (
                  <>
                    <Text style={[styles.fieldLabel, { color: colors.text }]}>Guest mobile</Text>
                    <TextInput
                      style={[
                        styles.input,
                        {
                          backgroundColor: colors.surfaceAlt,
                          borderColor: colors.border,
                          color: colors.text,
                        },
                      ]}
                      placeholder="Enter mobile number"
                      placeholderTextColor={colors.textMuted}
                      maxLength={10}
                      keyboardType="number-pad"
                      value={member?.Mobile}
                      onChangeText={value => setMember((previous: any) => ({ ...previous, Mobile: value }))}
                    />
                    <Text style={[styles.fieldLabel, { color: colors.text }]}>Guest name</Text>
                    <TextInput
                      style={[
                        styles.input,
                        {
                          backgroundColor: colors.surfaceAlt,
                          borderColor: colors.border,
                          color: colors.text,
                        },
                      ]}
                      placeholder="Enter guest name"
                      placeholderTextColor={colors.textMuted}
                      value={member?.DisplayName}
                      onChangeText={value =>
                        setMember((previous: any) => ({ ...previous, DisplayName: value }))
                      }
                    />
                  </>
                ) : null}
              </DetailSection>
            ) : null}

            <DetailSection
              title="Event passes"
              // subtitle="Select the ticket mix. Limits and complimentary logic remain controlled by the backend response."
              delay={70}
            >
              {loading
                ? [1, 2, 3].map(item => <TicketShimmer key={item} />)
                : visibleTickets.map(ticket => (
                    <TicketCard
                      key={ticket.id}
                      data={ticket}
                      quantity={cart[ticket.id] || 0}
                      onChange={qty => updateQty(ticket.id, qty)}
                    />
                  ))}
            </DetailSection>

            {event?.waiter && event?.waiter?.remaining > 0 ? (
              <DetailSection
                title="Optional add-on"
                // subtitle="Add personal waiters if the event configuration allows them."
                delay={100}
              >
                <View
                  style={[
                    styles.waiterCard,
                    { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.waiterTitle, { color: colors.text }]}>Personal Waiter</Text>
                    <Text style={[styles.waiterMeta, { color: colors.textMuted }]}>
                      Rs. {Number(event.waiter.price).toFixed(2)} each • {event.waiter.remaining} remaining
                    </Text>
                  </View>
                  <View style={[styles.counter, { backgroundColor: colors.surface }]}>
                    <Pressable
                      disabled={waiters === 0}
                      onPress={() => setWaiters(value => Math.max(0, value - 1))}
                    >
                      <Entypo
                        name="minus"
                        size={22}
                        color={ colors.text }
                      />
                    </Pressable>
                    <Text style={[styles.counterValue, { color: colors.text }]}>{waiters}</Text>
                    <Pressable
                      disabled={waiters >= event.waiter.remaining}
                      onPress={() => setWaiters(value => value + 1)}
                    >
                      <Entypo
                        name="plus"
                        size={22}
                        color={
                          colors.text 
                        }
                      />
                    </Pressable>
                  </View>
                </View>
              </DetailSection>
            ) : null}

            <DetailSection
              title="Checkout summary"
              // subtitle="This total is passed to seat selection or directly into the event payment review."
              delay={130}
            >
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Ticket subtotal</Text>
                <Text style={[styles.summaryValue, { color: colors.text }]}>
                  Rs. {ticketTotal.toFixed(2)}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Waiter subtotal</Text>
                <Text style={[styles.summaryValue, { color: colors.text }]}>
                  Rs. {waiterTotal.toFixed(2)}
                </Text>
              </View>
              <View
                style={[
                  styles.summaryRow,
                  styles.summaryDivider,
                  { borderTopColor: colors.border },
                ]}
              >
                <Text style={[styles.summaryTotal, { color: colors.text }]}>Total</Text>
                <Text style={[styles.summaryAmount, { color: colors.success }]}>
                  Rs. {totalAmount.toFixed(2)}
                </Text>
              </View>
            </DetailSection>
          </ScrollView>

          {hasSelection ? (
            <View
              style={[
                styles.footer,
                {
                  backgroundColor: colors.surface,
                  borderTopColor: colors.border,
                },
              ]}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.footerLabel, { color: colors.text }]}>
                  {totalTickets} ticket(s){waiters ? ` + ${waiters} waiter(s)` : ''}
                </Text>
                <Text style={[styles.footerAmount, { color: colors.text }]}>
                  Rs. {totalAmount.toFixed(2)}
                </Text>
              </View>
              <NewButton
                text={isSeatsAvailable ? 'Choose seats' : 'Review payment'}
                onPress={handleContinue}
              />
            </View>
          ) : null}
        </>
      )}

      {memberVerifyModal ? (
        <Modal visible={memberVerifyModal} onDismiss={() => navigation.goBack()}>
          <KeyboardAwareScrollView>
            <View
              style={[
                styles.modalCard,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.modalTitle, { color: colors.text }]}>Verify member</Text>
              <Text style={[styles.modalCopy, { color: colors.textMuted }]}>
                Event admin bookings need a verified member context before tickets can be created.
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.surfaceAlt,
                    borderColor: memberError ? colors.danger : colors.border,
                    color: colors.text,
                  },
                ]}
                placeholder="Enter member ID"
                placeholderTextColor={colors.textMuted}
                value={memberIdInput}
                onChangeText={value => {
                  setMemberIdInput(value);
                  if (memberError) {
                    setMemberError('');
                  }
                }}
              />
              {memberError ? (
                <Text style={[styles.errorText, { color: colors.danger }]}>{memberError}</Text>
              ) : null}
              <NewButton text="Verify member" loading={verifyingMember} onPress={verifyMember} />
            </View>
          </KeyboardAwareScrollView>
        </Modal>
      ) : null}

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
    paddingBottom: 120,
  },
  imageWrap: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 26,
    overflow: 'hidden',
  },
  banner: {
    width: '100%',
    height: 220,
  },
  profileGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  profileCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
  },
  profileLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    fontFamily: FONT_FAMILY.normal,
  },
  profileValue: {
    marginTop: 6,
    fontSize: 15,
    fontFamily: FONT_FAMILY.bold,
  },
  fieldLabel: {
    marginBottom: 8,
    fontSize: 13,
    fontFamily: FONT_FAMILY.semiBold,
  },
  input: {
    minHeight: 52,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    fontSize: 14,
    fontFamily: FONT_FAMILY.normal,
    marginBottom: 12,
  },
  waiterCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  waiterTitle: {
    fontSize: 15,
    fontFamily: FONT_FAMILY.bold,
  },
  waiterMeta: {
    marginTop: 4,
    fontSize: 12,
    fontFamily: FONT_FAMILY.normal,
  },
  counter: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 16,
  },
  counterValue: {
    fontSize: 16,
    fontFamily: FONT_FAMILY.bold,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.normal,
  },
  summaryValue: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.semiBold,
  },
  summaryDivider: {
    marginTop: 4,
    paddingTop: 14,
    borderTopWidth: 1,
  },
  summaryTotal: {
    fontSize: 15,
    fontFamily: FONT_FAMILY.bold,
  },
  summaryAmount: {
    fontSize: 18,
    fontFamily: FONT_FAMILY.bold,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  footerLabel: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.semiBold,
  },
  footerAmount: {
    marginTop: 4,
    fontSize: 19,
    fontFamily: FONT_FAMILY.bold,
  },
  modalCard: {
    margin: 16,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: FONT_FAMILY.bold,
  },
  modalCopy: {
    marginTop: 8,
    marginBottom: 16,
    fontSize: 13,
    lineHeight: 19,
    fontFamily: FONT_FAMILY.normal,
  },
  errorText: {
    marginTop: -4,
    marginBottom: 12,
    fontSize: 12,
    fontFamily: FONT_FAMILY.normal,
  },
});

export default Events;
