import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSelector } from 'react-redux';
import { useQueryClient } from '@tanstack/react-query';

import Header from '../../components/Header.tsx';
import BookingHeroCard from '../../components/booking/BookingHeroCard.tsx';
import DetailSection from '../../components/booking/DetailSection.tsx';
import NewButton from '../../components/Button.tsx';
import AppAlertModal from '../../components/feedback/AppAlertModal.tsx';
import { useAppAlert } from '../../hooks/useAppAlert.ts';
import { useAppTheme } from '../../theme/AppThemeProvider.tsx';
import { ENDPOINT } from '../../util/constant.ts';
import { javascriptGet, javascriptPost } from '../../util/api.tsx';
import { FONT_FAMILY } from '../../util/colors.tsx';
import { ICONS } from '../../../assets/icons.ts';
import { RootState } from '../../store/store.tsx';
import { AppStackParamList } from '../../navigation/AppDrawer.tsx';

type Props = NativeStackScreenProps<AppStackParamList, 'EventCheckOut'>;

const EventCheckOut: React.FC<Props> = ({ navigation, route }) => {
  const paymentProcessing = useRef(false);
  const queryClient = useQueryClient();
  const { colors } = useAppTheme();
  const { alertState, showAlert, hideAlert } = useAppAlert();
  const [loading, setLoading] = useState(false);
  const userData = useSelector((state: RootState) => state.auth);
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [settings, setSettings] = useState<any[]>([]);
  const [referenceNo, setReferenceNo] = useState('');
  const {
    event,
    tickets,
    cart,
    totalAmount,
    waiters,
    member,
    selectedSeats = [],
  } = route.params;

  const waiterAmount = event?.waiter ? waiters * event.waiter.price : 0;
  const selectedTickets = tickets.filter((ticket: any) => cart[ticket.id] > 0);
  const serviceChargePercent = Number(event?.service_charge || 0);
  const gstPercent = Number(event?.gst || 0);
  const serviceChargeAmount = (totalAmount * serviceChargePercent) / 100;
  const gstAmount = (totalAmount * gstPercent) / 100;

  const groupedSeats = useMemo(() => {
    return selectedSeats.reduce((acc: any, seat: any) => {
      const type = seat?.category?.seat_type || 'other';
      if (!acc[type]) {
        acc[type] = {
          type,
          price: Number(seat?.category?.price || 0),
          seats: [],
        };
      }
      acc[type].seats.push(seat);
      return acc;
    }, {});
  }, [selectedSeats]);

  const seatGroups = Object.values(groupedSeats);

  const fetchSettings = useCallback(async () => {
    const response = await javascriptGet({
      path: ENDPOINT.event_admin_payment_type,
      Token: userData?.token,
      body: {},
    });

    if (response?.status) {
      setSettings(response?.payment_types || []);
    }
  }, [userData?.token]);

  useEffect(() => {
    if (userData?.user?.role === 'Event Admin') {
      fetchSettings();
    }
  }, [fetchSettings, userData?.user?.role]);

  const handleFreeBooking = async () => {
    const payload = {
      event_id: event.id,
      is_free: true,
      waiters,
      tickets: selectedTickets.map((ticket: any) => ({
        id: ticket.id,
        type: ticket.type,
        quantity: cart[ticket.id],
      })),
      seatGroups,
    };

    const response = await javascriptPost({
      path: ENDPOINT.process_event_payment,
      Token: userData?.token,
      body: payload,
    });

    setLoading(false);

    if (response?.status) {
      navigation.replace('EventBookingDetails', {
        bookingId: response?.booking_id,
      });
      return;
    }

    showAlert({
      title: 'Booking failed',
      message: response?.message || 'Free booking could not be completed.',
      tone: 'danger',
    });
  };

  const bookTickets = async () => {
    if (paymentProcessing.current) {
      return;
    }

    paymentProcessing.current = true;

    try {
      if (userData?.user?.role === 'Event Admin') {
        if (!selectedPayment?.id) {
          showAlert({
            title: 'Payment method required',
            message: 'Please select a payment method before continuing.',
            tone: 'warning',
          });
          paymentProcessing.current = false;
          return;
        }

        if (selectedPayment?.ref_no && referenceNo.trim() === '') {
          showAlert({
            title: 'Reference required',
            message: 'Please enter the reference number for this payment method.',
            tone: 'warning',
          });
          paymentProcessing.current = false;
          return;
        }

        setLoading(true);
        const payload = {
          event_id: event.id,
          tickets: selectedTickets.map((ticket: any) => ({
            id: ticket.id,
            quantity: cart[ticket.id],
          })),
          waiters,
          member,
          payment_type: settings?.find(item => item.id === selectedPayment.id)?.name,
          reference_no: referenceNo || 'N/A',
          seatGroups,
        };

        const response = await javascriptPost({
          path: ENDPOINT.process_admin_payment,
          Token: userData?.token,
          body: payload,
        });

        setLoading(false);
        paymentProcessing.current = false;

        if (!response?.status) {
          showAlert({
            title: 'Booking failed',
            message:
              response?.message || 'Something went wrong while confirming the booking.',
            tone: 'danger',
          });
          return;
        }

        await queryClient.invalidateQueries(['eventAdminDashboard']);
        navigation.replace('EventBookingDetails', {
          bookingId: response?.booking_id,
        });
        return;
      }

      setLoading(true);
      const payload = {
        event_id: event.id,
        tickets: selectedTickets.map((ticket: any) => ({
          id: ticket.id,
          quantity: cart[ticket.id],
        })),
        waiters,
        seatGroups,
      };

      const response = await javascriptPost({
        path: ENDPOINT.ticket_preview,
        Token: userData?.token,
        body: payload,
      });

      if (response?.status !== true) {
        setLoading(false);
        paymentProcessing.current = false;
        showAlert({
          title: 'Payment unavailable',
          message: response?.message || 'Payment initiation failed.',
          tone: 'danger',
        });
        return;
      }

      if (response?.is_free) {
        await handleFreeBooking();
        paymentProcessing.current = false;
        return;
      }

      const orderData = {
        ...(response?.payment || {}),
        ...(response?.payment ? {} : response),
        end_point: ENDPOINT.process_event_payment,
        order_id: response?.payment?.order_id || response?.order_id,
        merchant_order_id:
          response?.payment?.merchant_order_id || response?.merchant_order_id,
        amount: response?.payment?.amount || response?.amount,
        gateway: response?.payment?.gateway || response?.gateway,
        checkout: response?.payment?.checkout || response?.checkout,
        payment_url: response?.payment?.payment_url || response?.payment_url,
        access_key: response?.payment?.access_key || response?.payment_session_id,
        status_reference:
          response?.payment?.status_reference ||
          response?.merchant_order_id ||
          response?.order_id,
      };

      setLoading(false);
      paymentProcessing.current = false;
      navigation.navigate('UniversalPayment', {
        type: 'Event Booking',
        orderData: {
          ...orderData,
          event_id: event.id,
        },
      });
    } catch (error: any) {
      setLoading(false);
      paymentProcessing.current = false;
      showAlert({
        title: 'Something went wrong',
        message: error?.message || 'Unable to continue with event payment.',
        tone: 'danger',
      });
    }
  };

  const seatsTotal = selectedSeats.reduce(
    (total: number, seat: any) => total + Number(seat?.category?.price || 0),
    0,
  );
  const grandTotal = totalAmount + serviceChargeAmount + gstAmount + seatsTotal;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header title="Review & Pay" />

      <ScrollView contentContainerStyle={styles.content}>
        <BookingHeroCard
          eyebrow="Payment Review"
          title={event?.name || 'Event booking'}
          subtitle={`${selectedTickets.length} ticket type(s) • ${selectedSeats.length} seat(s) • ${waiters} waiter(s)`}
          status={loading ? 'Processing' : 'Pending payment'}
          statusTone={loading ? 'warning' : 'neutral'}
          meta={[
            { label: 'Subtotal', value: `Rs. ${totalAmount.toFixed(2)}` },
            { label: 'Seat total', value: `Rs. ${seatsTotal.toFixed(2)}` },
            { label: 'Payable', value: `Rs. ${grandTotal.toFixed(2)}` },
          ]}
        />

        <DetailSection
          title="Pass mix"
          subtitle="This summary is derived from the exact ticket quantities being posted for checkout."
          delay={40}
        >
          {selectedTickets.map((item: any) => (
            <View
              key={item.id}
              style={[
                styles.lineCard,
                {
                  backgroundColor: colors.surfaceAlt,
                  borderColor: colors.border,
                },
              ]}
            >
              <View style={styles.lineCardIcon}>
                <Icon name="ticket-confirmation-outline" size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.lineCardTitle, { color: colors.text }]}>
                  {item.title}
                </Text>
                <Text style={[styles.lineCardMeta, { color: colors.textMuted }]}>
                  Qty {cart[item.id]} • Rs. {Number(item.price).toFixed(2)} each
                </Text>
              </View>
              <Text style={[styles.lineCardAmount, { color: colors.text }]}>
                Rs. {(Number(item.price) * cart[item.id]).toFixed(2)}
              </Text>
            </View>
          ))}
        </DetailSection>

        {waiters > 0 || seatGroups.length > 0 ? (
          <DetailSection
            title="Add-ons and seats"
            subtitle="Waiter and seat allocations will move with the same payment request."
            delay={70}
          >
            {waiters > 0 ? (
              <View
                style={[
                  styles.inlineRow,
                  { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
                ]}
              >
                <Text style={[styles.inlineLabel, { color: colors.text }]}>
                  Waiter ({waiters} × Rs. {Number(event?.waiter?.price || 0).toFixed(2)})
                </Text>
                <Text style={[styles.inlineValue, { color: colors.text }]}>
                  Rs. {waiterAmount.toFixed(2)}
                </Text>
              </View>
            ) : null}

            {seatGroups.map((group: any) => (
              <View
                key={group.type}
                style={[
                  styles.inlineRow,
                  { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
                ]}
              >
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={[styles.inlineLabel, { color: colors.text }]}>
                    {String(group.type).toUpperCase()} ({group.seats.length})
                  </Text>
                  <Text style={[styles.inlineMeta, { color: colors.textMuted }]}>
                    {group.seats.map((seat: any) => seat.seat_code).join(', ')}
                  </Text>
                </View>
                <Text style={[styles.inlineValue, { color: colors.text }]}>
                  Rs. {(group.seats.length * group.price).toFixed(2)}
                </Text>
              </View>
            ))}
          </DetailSection>
        ) : null}

        <DetailSection
          title="Charges"
          subtitle="Service and tax are calculated here before initiating payment."
          delay={100}
        >
          <View style={styles.chargeRow}>
            <Text style={[styles.chargeLabel, { color: colors.textMuted }]}>Subtotal</Text>
            <Text style={[styles.chargeValue, { color: colors.text }]}>
              Rs. {totalAmount.toFixed(2)}
            </Text>
          </View>
          {seatsTotal > 0 ? (
            <View style={styles.chargeRow}>
              <Text style={[styles.chargeLabel, { color: colors.textMuted }]}>Seats total</Text>
              <Text style={[styles.chargeValue, { color: colors.text }]}>
                Rs. {seatsTotal.toFixed(2)}
              </Text>
            </View>
          ) : null}
          {serviceChargePercent > 0 ? (
            <View style={styles.chargeRow}>
              <Text style={[styles.chargeLabel, { color: colors.textMuted }]}>
                Service charge ({serviceChargePercent}%)
              </Text>
              <Text style={[styles.chargeValue, { color: colors.text }]}>
                Rs. {serviceChargeAmount.toFixed(2)}
              </Text>
            </View>
          ) : null}
          {gstPercent > 0 ? (
            <View style={styles.chargeRow}>
              <Text style={[styles.chargeLabel, { color: colors.textMuted }]}>
                GST ({gstPercent}%)
              </Text>
              <Text style={[styles.chargeValue, { color: colors.text }]}>
                Rs. {gstAmount.toFixed(2)}
              </Text>
            </View>
          ) : null}
          <View style={[styles.totalRow, { borderTopColor: colors.border }]}>
            <Text style={[styles.totalLabel, { color: colors.text }]}>Grand total</Text>
            <Text style={[styles.totalValue, { color: colors.success }]}>
              Rs. {grandTotal.toFixed(2)}
            </Text>
          </View>
        </DetailSection>

        {userData?.user?.role === 'Event Admin' && settings?.length ? (
          <DetailSection
            title="Payment method"
            subtitle="Pick how this admin booking should be recorded before confirmation."
            delay={130}
          >
            {selectedPayment?.ref_no ? (
              <>
                <Text style={[styles.fieldLabel, { color: colors.text }]}>Reference number</Text>
                <TextInput
                  placeholder="Enter payment reference"
                  placeholderTextColor={colors.textMuted}
                  style={[
                    styles.referenceInput,
                    {
                      backgroundColor: colors.surfaceAlt,
                      borderColor: colors.border,
                      color: colors.text,
                    },
                  ]}
                  value={referenceNo}
                  onChangeText={setReferenceNo}
                />
              </>
            ) : null}

            <View style={styles.paymentGrid}>
              {settings.map((payment: any) => {
                const IconComponent = ICONS[payment.icon_type] || ICONS.MaterialIcons;
                const active = selectedPayment?.id === payment.id;

                return (
                  <Pressable
                    key={payment.id}
                    onPress={() => setSelectedPayment(payment)}
                    style={[
                      styles.paymentCard,
                      {
                        backgroundColor: active ? colors.primary : colors.surfaceAlt,
                        borderColor: active ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <IconComponent
                      name={payment.icon}
                      size={26}
                      color={active ? colors.onPrimary : colors.primary}
                    />
                    <Text
                      style={[
                        styles.paymentLabel,
                        { color: active ? colors.onPrimary : colors.text },
                      ]}
                    >
                      {payment.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </DetailSection>
        ) : null}
      </ScrollView>

      <View
        style={[
          styles.footer,
          { backgroundColor: colors.surface, borderTopColor: colors.border },
        ]}
      >
        <View style={{ flex: 1 }}>
          <Text style={[styles.footerTitle, { color: colors.text }]}>
            Rs. {grandTotal.toFixed(2)}
          </Text>
          <Text style={[styles.footerSubtitle, { color: colors.textMuted }]}>
            Secured by the active club payment gateway.
          </Text>
        </View>
        <NewButton
          text={loading ? 'Processing...' : 'Pay now'}
          onPress={bookTickets}
          loading={loading}
        />
      </View>

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
  lineCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 20,
    padding: 14,
    marginBottom: 10,
    gap: 12,
  },
  lineCardIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(21, 24, 49, 0.08)',
  },
  lineCardTitle: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.semiBold,
  },
  lineCardMeta: {
    marginTop: 4,
    fontSize: 12,
    fontFamily: FONT_FAMILY.normal,
  },
  lineCardAmount: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.bold,
  },
  inlineRow: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  inlineLabel: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.semiBold,
  },
  inlineMeta: {
    marginTop: 4,
    fontSize: 11,
    lineHeight: 16,
    fontFamily: FONT_FAMILY.normal,
  },
  inlineValue: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.bold,
  },
  chargeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  chargeLabel: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.normal,
  },
  chargeValue: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.semiBold,
  },
  totalRow: {
    marginTop: 4,
    paddingTop: 14,
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 15,
    fontFamily: FONT_FAMILY.bold,
  },
  totalValue: {
    fontSize: 18,
    fontFamily: FONT_FAMILY.bold,
  },
  fieldLabel: {
    marginBottom: 8,
    fontSize: 13,
    fontFamily: FONT_FAMILY.semiBold,
  },
  referenceInput: {
    minHeight: 52,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    fontSize: 14,
    fontFamily: FONT_FAMILY.normal,
    marginBottom: 14,
  },
  paymentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  paymentCard: {
    width: '48%',
    minHeight: 92,
    borderWidth: 1,
    borderRadius: 20,
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentLabel: {
    marginTop: 10,
    fontSize: 13,
    textAlign: 'center',
    fontFamily: FONT_FAMILY.semiBold,
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
  footerTitle: {
    fontSize: 20,
    fontFamily: FONT_FAMILY.bold,
  },
  footerSubtitle: {
    marginTop: 4,
    fontSize: 12,
    fontFamily: FONT_FAMILY.normal,
  },
});

export default EventCheckOut;
