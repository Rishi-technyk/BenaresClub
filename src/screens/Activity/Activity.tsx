import React, {  useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSelector } from 'react-redux';
import Header from '../../components/Header';
import BookingHeroCard from '../../components/booking/BookingHeroCard';
import DetailSection from '../../components/booking/DetailSection';
import NewButton from '../../components/Button';
import {
  usePlayersQuery,
  useSlots,
} from '../../services/Activity/FacilityService';
import { useAppTheme } from '../../theme/AppThemeProvider';
import { AppStackParamList } from '../../navigation/AppDrawer';
import { FONT_FAMILY } from '../../util/colors';
import { javascriptPost } from '../../util/api';
import { ENDPOINT } from '../../util/constant';
import LinearGradient from 'react-native-linear-gradient';
import EmptyStateCard from '../../components/booking/EmptyStateCard';
import { Dropdown } from 'react-native-element-dropdown';
import DatePickerComponent from '../../components/DatePicker';
import moment from 'moment';

type Props = NativeStackScreenProps<AppStackParamList, 'Activity'>;

const Counter = ({ title, value, min, max, onAdd, onRemove }: any) => {
  const disableMinus = value <= min;
  const disablePlus = value >= max;
  const { colors } = useAppTheme();
  return (
    <View
      style={[
        styles.counterCard,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <Text style={[styles.counterTitle, { color: colors.text }]}>{title}</Text>

      <View style={[styles.counterRow, { borderColor: colors.border }]}>
        <Pressable
          disabled={disableMinus}
          style={[styles.counterButton, disableMinus && { opacity: 0.4 }]}
          onPress={onRemove}
        >
          <Text style={[styles.counterButtonText, { color: colors.text }]}>
            −
          </Text>
        </Pressable>

        <Text style={[styles.counterValue, { color: colors.text }]}>
          {value}
        </Text>

        <Pressable
          disabled={disablePlus}
          style={[styles.counterButton, disablePlus && { opacity: 0.4 }]}
          onPress={onAdd}
        >
          <Text style={[styles.counterButtonText, { color: colors.text }]}>
            +
          </Text>
        </Pressable>
      </View>
    </View>
  );
};

const Activity: React.FC<Props> = ({ route, navigation }) => {
  const facility = route?.params?.facility || (route as any)?.params?.facility;

  const auth = useSelector((state: any) => state.auth);
  const [loading, setLoading] = useState(false);
  const { colors, resolvedMode } = useAppTheme();

  const { slotsQuery } = useSlots(facility?.id, auth?.token);
  const activity = slotsQuery?.data?.data;
  
  const frequencies = activity?.frequencies || [];
   const [startDate, setStartDate] = useState<string>("");
  const [selectedFrequency, setSelectedFrequency] = useState<any>(null);

  const [booking, setBooking] = useState<any[]>([]);
  
  const { playersQuery } = usePlayersQuery(auth, false, false, false);

  const allGuests = playersQuery?.data?.data || [];
const member = playersQuery?.data?.member;
const spouse = playersQuery?.data?.spouse;
console.log( activity?.min_booking_days, '---------------------- spouse ---------------------');
const dependents = playersQuery?.data?.dependents || [];

  const gst = Number(activity?.tax?.value || 0);

  const subtotal = useMemo(() => {
    return booking.reduce(
      (sum, item) => sum + item.qty * item.amount,

      0,
    );
  }, [booking]);

const gstAmount = useMemo(() => {
  return (subtotal * gst) / 100;
}, [subtotal, gst]);

const total = subtotal + gstAmount;

const handleContinue = async () => {
  try {
    if (!selectedFrequency) {
      Alert.alert('Plan Required', 'Please select a plan.');
      return;
    }

     if (!startDate) {
      Alert.alert('Package Date Required', 'Please select a valid date.');
      return;
    }

    // Selected occupants only
    const selectedBooking = booking.filter((item: any) => item.qty > 0);

    if (!selectedBooking.length) {
      Alert.alert(
        'Booking Required',
        'Please select at least one participant.',
      );
      return;
    }

    // Validate Guest Selection
  for (const item of selectedBooking) {

  // Skip if no quantity
  if (item.qty <= 0) continue;

  // Player count should match quantity
  if (item.players.length !== item.qty) {
    Alert.alert(
      `${item.occupant} Required`,
      `Please select all ${item.occupant.toLowerCase()}s.`
    );
    return;
  }

  // Every player should be selected
  const hasEmpty = item.players.some((player: any) => !player);

  if (hasEmpty) {
    Alert.alert(
      `${item.occupant} Required`,
      `Please select all ${item.occupant.toLowerCase()}s.`
    );
    return;
  }
}

    setLoading(true);

  const payload = {
  activity_id: activity.id,
  frequency_id: selectedFrequency.id,
  package_start_date: startDate,

  booking: selectedBooking.map((item: any) => ({
    charge_id: item.charge_id,
    occupant_id: item.occupant_id,
    qty: item.qty,

    players: item.players.map((player: any) => ({
      member_id:
        player.member_id ??
        player.MemberID ??
        null,

      guest_id:
        player.id ?? null,

      name:
        player.display_name ??
        player.DisplayName ??
        player.name,

      mobile: player.mobile ?? null,
    })),
  })),
};

    const response = await javascriptPost({
      path: ENDPOINT.book_facilities,
      Token: auth.token,
      body: payload,
    });

    if (!response.status) {
      Alert.alert('Error', response.message);
      return;
    }

    navigation.navigate('UniversalPayment', {
      type: 'Activity',
      orderData: response.data,
    });
  } catch (e: any) {
    Alert.alert(
      'Booking Failed',
      e?.response?.data?.message ?? e.message,
    );
  } finally {
    setLoading(false);
  }
};
  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
        },
      ]}
    >
      <Header title={activity?.activity_name || 'Activity Booking'}>
        <Pressable
          style={[
            styles.headerAction,
            { borderColor: `${colors.onPrimary}35` },
          ]}
          onPress={() => navigation.navigate('Players')}
        >
          <Text style={[styles.headerActionLabel, { color: colors.onPrimary }]}>
            My Guests
          </Text>
        </Pressable>
      </Header>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: 140,
        }}
      >
        <BookingHeroCard
          title={activity?.activity_name}
          subtitle={activity?.description}
          status={frequencies.length ? 'Available' : 'Closed'}
          statusTone={frequencies.length ? 'success' : 'warning'}
        />

        {frequencies.length > 0 ? (
          <LinearGradient
            colors={
              resolvedMode === 'dark'
                ? ['#020617', '#0F172A', '#1E293B']
                : ['#1E293B', '#334155', '#475569']
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradient}
          >
            <View
              style={{
                paddingHorizontal: 18,
                marginVertical: 20,
                borderRadius: 18,
                overflow: 'hidden',
              }}
            >
           {frequencies.map((item: any) => {
  const selected = selectedFrequency?.id === item.id;
  const memberCharge =
    item.occupants.find((o: any) => o.occupant_id === 1) ||
    item.occupants[0];

  return (
    <Pressable
      key={item.id}
      onPress={() => {
        setSelectedFrequency(item,);

        setBooking(
          item.occupants.map((o: any) => ({
         
            charge_id: o.charge_id,
            occupant_id: o.occupant_id,
            occupant: o.name,
            amount: Number(o.amount),
            max_persons: Number(o.max_persons),
            qty: 0,
            players: [],
          })),
        );
      }}
      style={[
        styles.membershipCard,
        {
          backgroundColor: selected
            ? colors.background
            : colors.surface,
          borderColor: selected
            ? colors.primary
            : colors.border,
        },
      ]}
    >
      <View style={styles.membershipTop}>
        <View>
          <Text
            style={[
              styles.membershipTitle,
              {
                color: selected
                  ? colors.text
                  : colors.text,
              },
            ]}
          >
            {item.type}
          </Text>

          <Text
            style={[
              styles.membershipSubtitle,
              {
                color: selected
                  ? colors.text
                  : colors.textMuted,
              },
            ]}
          >
            Valid for {item.days}{' '}
            {item.days === 1 ? 'Day' : 'Days'}
          </Text>
        </View>

        <View
          style={[
            styles.radioCircle,
            {
              borderColor: selected
                ? colors.text
                : colors.border,
            },
          ]}
        >
          {selected && (
            <View
              style={[
                styles.radioInner,
                {
                  backgroundColor:
                    colors.text,
                },
              ]}
            />
          )}
        </View>
      </View>

      <View style={styles.membershipDivider} />

      <View style={styles.membershipBottom}>
        <View>
          <Text
            style={[
              styles.priceTitle,
              {
                color: selected
                  ? colors.text
                  : colors.textMuted,
              },
            ]}
          >
            Starting From
          </Text>

          <Text
            style={[
              styles.membershipPrice,
              {
                color: selected
                  ? colors.text
                  : colors.text,
              },
            ]}
          >
            ₹ {memberCharge?.amount ?? 0}
          </Text>
        </View>

        <View
          style={[
            styles.validityChip,
            {
              backgroundColor: selected
                ? 'rgba(255,255,255,0.18)'
                : '#EEF5FF',
            },
          ]}
        >
          <Text
            style={[
              styles.validityText,
              {
                color: selected
                  ? colors.text
                  : colors.primary,
              },
            ]}
          >
            {item.days} {item.days === 1 ? 'Day' : 'Days'}
          </Text>
        </View>
      </View>
    </Pressable>
  );
})}
            </View>
          </LinearGradient>
        ) : (
          <EmptyStateCard
            title={'No Active slots available for this activity.'}
            description={
              'Please check back later or contact support for assistance.'
            }
          />
        )}

        {selectedFrequency && (
          <DetailSection
            title="Booking Details"
            subtitle="Choose number of members and dependents"
          >
            <View
              style={{
                marginTop: 10,
                // flexDirection: 'row',
                // justifyContent: 'space-between',
              }}
            >
            <DatePickerComponent
            placeholder='Please select package start date'
         minDate={moment()
    .add(activity?.min_booking_days , 'days')
    .toDate()}
  maxDate={moment()
    .add(activity?.max_booking_days , 'days')
    .toDate()}
            stateDate={setStartDate}
            // setResetDate={}
            />
              <View style={{ marginTop: 10 }}>
                {booking.map((item: any, index: number) => 
                 {

  // Hide spouse if no spouse exists
  if (item.occupant_id === 2 && !spouse) {
    return null;
  }

  // Hide dependent if no dependents exist
  if (
    item.occupant_id === 3 &&
    (!dependents || dependents.length === 0)
  ) {
    return null;
  }
  return(
                  <View key={item.charge_id} style={{ marginBottom: 15 }}>
                    <Counter
                      title={`${item.occupant} (₹${item.amount})`}
                      value={item.qty}
                      min={0}
                      max={item.max_persons}
                      onAdd={() => {
                        const temp = [...booking];

                        if (temp[index].qty < temp[index].max_persons) {
                          temp[index].qty++;

                          // if (temp[index].occupant_id === 4) {
                          //   temp[index].players.push(null);
                          // }
switch (temp[index].occupant_id) {
    case 1: // Member
        temp[index].players = member ? [member] : [];
        break;

    case 2: // Spouse
        temp[index].players = spouse ? [spouse] : [];
        break;

    case 3: // Dependent
        temp[index].players.push(null);
        break;

    case 4: // Guest
        temp[index].players.push(null);
        break;
}
                          setBooking(temp);
                        }
                      }}
                      onRemove={() => {
                        const temp = [...booking];

                        const min = 0;

                        if (temp[index].qty > min) {
                          temp[index].qty--;

                          // if (temp[index].occupant_id === 4) {
                          //   temp[index].players.pop();
                          // }
switch (temp[index].occupant_id) {

    case 3:
    case 4:
        temp[index].players.pop();
        break;

    case 1:
        if (temp[index].qty === 0) {
            temp[index].players = [];
        }
        break;

    case 2:
        if (temp[index].qty === 0) {
            temp[index].players = [];
        }
        break;
}
                          setBooking(temp);
                        }
                      }}
                    />

{item.occupant_id === 3 && item.qty > 0 && (
  <View style={{ marginTop: 10 }}>
    {Array.from({ length: item.qty }).map((_, dependentIndex) => (
      <View
        key={dependentIndex}
        style={{ marginBottom: 12 }}
      >
        <Text
          style={{
            marginBottom: 6,
            color: colors.text,
            fontWeight: '600',
          }}
        >
          Dependent {dependentIndex + 1}
        </Text>

        <Dropdown
          data={dependents.filter(
            dependent =>
              !item.players.some(
                (p: any) => p?.member_id === dependent.member_id,
              ) ||
              item.players[dependentIndex]?.member_id === dependent.member_id,
          )}
          labelField="display_name"
          valueField="member_id"
          value={item.players[dependentIndex]?.member_id ?? null}
          placeholder={`Select Dependent ${dependentIndex + 1}`}
          search
          maxHeight={250}
          searchPlaceholder="Search Dependent..."
          style={{
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 10,
            paddingHorizontal: 12,
            paddingVertical: 12,
          }}
          placeholderStyle={{
            color: colors.placeholder,
          }}
          selectedTextStyle={{
            color: colors.text,
          }}
          onChange={dependent => {
            const temp = [...booking];

            temp[index].players[dependentIndex] = dependent;

            setBooking(temp);
          }}
        />
      </View>
    ))}

    <Text
      style={{
        marginTop: 6,
        fontSize: 12,
        color: colors.textMuted,
      }}
    >
      Select your dependent(s).
    </Text>
  </View>
)}
                    {item.occupant_id === 4 && item.qty > 0 && (
                      <View
                        style={{
                          marginTop: 10,
                        }}
                      >
                        {Array.from({
                          length: item.qty,
                        }).map((_, guestIndex) => (
                          <View
                            key={guestIndex}
                            style={{
                              marginBottom: 12,
                            }}
                          >
                            <Text
                              style={{
                                marginBottom: 6,
                                color: colors.text,
                                fontWeight: '600',
                              }}
                            >
                              Guest {guestIndex + 1}
                            </Text>

                            <Dropdown
                              data={allGuests.filter(
                                guest =>
                                  !item.players.some(
                                    (g: any) => g?.id === guest.id,
                                  ) ||
                                  item.players[guestIndex]?.id === guest.id,
                              )}
                              labelField="name"
                              valueField="id"
                              value={item.players[guestIndex]?.id ?? null}
                              placeholder={`Select Guest ${guestIndex + 1}`}
                              search
                              maxHeight={250}
                              searchPlaceholder="Search Guest..."
                              style={{
                                borderWidth: 1,
                                borderColor: colors.border,
                                borderRadius: 10,
                                paddingHorizontal: 12,
                                paddingVertical: 12,
                              }}
                              placeholderStyle={{
                                color: colors.placeholder,
                              }}
                              selectedTextStyle={{
                                color: colors.text,
                              }}
                              onChange={guest => {
                                const temp = [...booking];

                                temp[index].players[guestIndex] = guest;

                                setBooking(temp);
                              }}
                            />
                          </View>
                        ))}

                        <Text
                          style={{
                            marginTop: 6,
                            fontSize: 12,
                            color: colors.textMuted,
                          }}
                        >
                          Select guests from your saved players.
                        </Text>
                      </View>
                    )}
                  </View>
                )})}
              </View>
            </View>
          </DetailSection>
        )}
{selectedFrequency && (
  <DetailSection
    title="Booking Summary"
    subtitle="Review before proceeding"
  >
    <View
      style={[
        styles.summaryCard,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
      ]}
    >
      {/* Plan */}
      <View style={styles.summaryRow}>
        <Text style={[styles.summaryLabel, { color: colors.text }]}>
          Plan
        </Text>

        <Text style={[styles.summaryValue, { color: colors.text }]}>
          {selectedFrequency.type}
        </Text>
      </View>

      {/* Occupants */}
      {/* {booking
        .filter(item => item.qty > 0)
        .map(item => (
          <View
            key={item.charge_id}
            style={styles.summaryRow}
          >
            <Text
              style={[
                styles.summaryLabel,
                { color: colors.text },
              ]}
            >
              {item.occupant} × {item.qty}
            </Text>

            <Text
              style={[
                styles.summaryValue,
                { color: colors.text },
              ]}
            >
              ₹ {(item.qty * item.amount).toFixed(2)}
            </Text>
          </View>
        ))} */}
{/* Occupants */}
{booking
  .filter(item => item.qty > 0)
  .map(item => (
    <View
      key={item.charge_id}
      style={{
        marginBottom: 12,
        paddingBottom: 12,
        borderBottomWidth: 0.5,
        borderBottomColor: colors.border,
      }}
    >
      <View style={styles.summaryRow}>
        <Text
          style={[
            styles.summaryLabel,
            { color: colors.text },
          ]}
        >
          {item.occupant} × {item.qty}
        </Text>

        <Text
          style={[
            styles.summaryValue,
            { color: colors.text },
          ]}
        >
          ₹ {(item.qty * item.amount).toFixed(2)}
        </Text>
      </View>

      {/* Selected Players */}
      {item.players?.length > 0 &&
        item.players.map((player: any, playerIndex: number) => (
          player && (
            <View
              key={playerIndex}
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                marginTop: 4,
                paddingLeft: 12,
              }}
            >
              <Text
                style={{
                  color: colors.textMuted,
                  fontSize: 13,
                }}
              >
                • {player.display_name || player.DisplayName || player.name}
              </Text>

              {/* <Text
                style={{
                  color: colors.textMuted,
                  fontSize: 12,
                }}
              >
                {player.member_id ||
                  player.MemberID ||
                  player.id}
              </Text> */}
            </View>
          )
        ))}
    </View>
  ))}
      {/* Subtotal */}
      <View style={styles.summaryRow}>
        <Text style={[styles.summaryLabel, { color: colors.text }]}>
          Subtotal
        </Text>

        <Text style={[styles.summaryValue, { color: colors.text }]}>
          ₹ {subtotal.toFixed(2)}
        </Text>
      </View>

      {/* GST */}
      {gst > 0 && (
        <View style={styles.summaryRow}>
          <Text
            style={[
              styles.summaryLabel,
              { color: colors.text },
            ]}
          >
            {activity?.tax?.type}
          </Text>

          <Text
            style={[
              styles.summaryValue,
              { color: colors.text },
            ]}
          >
            ₹ {gstAmount.toFixed(2)}
          </Text>
        </View>
      )}

      <View
        style={[
          styles.summaryDivider,
          {
            backgroundColor: colors.border,
          },
        ]}
      />

      {/* Total */}
      <View style={styles.summaryRow}>
        <Text
          style={[
            styles.totalLabel,
            {
              color: colors.text,
            },
          ]}
        >
          Total
        </Text>

        <Text
          style={[
            styles.totalAmount,
            {
              color: colors.success,
            },
          ]}
        >
          ₹ {total.toFixed(2)}
        </Text>
      </View>
    </View>
  </DetailSection>
)}
      </ScrollView>

      {selectedFrequency && (
        <View
          style={[
            styles.bottomBar,
            {
              backgroundColor: colors.surface,
              borderTopColor: colors.border,
            },
          ]}
        >
          <View>
            <Text
              style={{
                color: colors.textMuted,
                fontFamily: FONT_FAMILY.normal,
              }}
            >
              Total Amount
            </Text>

            <Text
              style={{
                color: colors.text,
                fontSize: 24,

                fontFamily: FONT_FAMILY.bold,
              }}
            >
              ₹ {total.toFixed(2)}
            </Text>
          </View>

          <NewButton
            loading={loading}
            text="Pay Now"
            onPress={() => {
              handleContinue();
            }}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerAction: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems:'center'
  },
  headerActionLabel: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.semiBold,
  },
  infoCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
  },
  gradient: {
    // padding: 22,
    marginBottom: 20,
    borderRadius: 18,
    marginHorizontal:20
  },

  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },

  infoLabel: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.normal,
  },

  infoValue: {
    fontSize: 15,
    fontFamily: FONT_FAMILY.semiBold,
  },

  planCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 2,
    padding: 18,
    marginBottom: 14,
  },

  planTitle: {
    fontSize: 17,
    fontFamily: FONT_FAMILY.bold,
  },

  planDays: {
    marginTop: 5,
    fontSize: 13,
    fontFamily: FONT_FAMILY.normal,
  },

  planPrice: {
    fontSize: 24,
    fontFamily: FONT_FAMILY.bold,
  },

  counterCard: {
    flex: 1,
    borderRadius: 18,
    padding: 10,
    margin: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    // backgroundColor: '#FFF',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  counterTitle: {
    // fontSize: 15,
    // marginBottom: 15,
    fontFamily: FONT_FAMILY.semiBold,
  },

  counterRow: {
    // flex: 0.5,
    minWidth: '40%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f0f0f03b',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  membershipCard: {
    borderRadius: 24,

    borderWidth: 2,

    padding: 20,

    marginBottom: 18,

    elevation: 2,
  },

  membershipTop: {
    flexDirection: 'row',

    justifyContent: 'space-between',

    alignItems: 'center',
  },

  membershipTitle: {
    fontSize: 19,

    fontFamily: FONT_FAMILY.bold,
  },

  membershipSubtitle: {
    marginTop: 6,

    fontSize: 13,

    fontFamily: FONT_FAMILY.normal,
  },

  membershipDivider: {
    height: 1,

    backgroundColor: '#ECECEC',

    marginVertical: 18,
  },

  membershipBottom: {
    flexDirection: 'row',

    justifyContent: 'space-between',

    alignItems: 'center',
  },

  membershipPrice: {
    marginTop: 4,

    fontSize: 30,

    fontFamily: FONT_FAMILY.bold,
  },

  priceTitle: {
    fontSize: 12,

    fontFamily: FONT_FAMILY.normal,
  },

  radioCircle: {
    width: 28,

    height: 28,

    borderRadius: 14,

    borderWidth: 2,

    justifyContent: 'center',

    alignItems: 'center',
  },

  radioInner: {
    width: 14,

    height: 14,

    borderRadius: 7,
  },

  validityChip: {
    paddingHorizontal: 14,

    paddingVertical: 8,

    borderRadius: 30,
  },

  validityText: {
    fontSize: 12,

    fontFamily: FONT_FAMILY.bold,
  },
  counterButton: {
    // width: 46,
    // height: 46,
    // borderRadius: 23,
    // backgroundColor: '#1565C0',

    justifyContent: 'center',
    alignItems: 'center',
  },

  counterButtonText: {
    color: '#1565C0',
    fontSize: 24,
    fontFamily: FONT_FAMILY.bold,
  },

  counterValue: {
    fontSize: 28,
    fontFamily: FONT_FAMILY.bold,
  },

  summaryCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
  },

  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 8,
  },
playerCard:{
  backgroundColor:'red',
  marginHorizontal:10

},
  summaryLabel: {
    fontSize: 14,
    color: '#666',
    fontFamily: FONT_FAMILY.normal,
  },

  summaryValue: {
    fontSize: 15,
    color: '#111',
    fontFamily: FONT_FAMILY.semiBold,
  },

  summaryDivider: {
    height: 1,
    marginVertical: 16,
  },

  totalLabel: {
    fontSize: 18,
    fontFamily: FONT_FAMILY.bold,
  },

  totalAmount: {
    fontSize: 24,
    fontFamily: FONT_FAMILY.bold,
  },

  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,

    borderTopWidth: 1,

    paddingHorizontal: 18,
    paddingVertical: 14,

    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});

export default Activity;

// import React, { useMemo, useState } from 'react';
// import {
//   Pressable,
//   ScrollView,
//   StyleSheet,
//   Text,
//   View,
// } from 'react-native';
// import { Dropdown } from 'react-native-element-dropdown';
// import { useSelector } from 'react-redux';
// import { NativeStackScreenProps } from '@react-navigation/native-stack';
// import moment from 'moment';
// import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
// import { createShimmerPlaceholder } from 'react-native-shimmer-placeholder';
// import LinearGradient from 'react-native-linear-gradient';

// import Header from '../../components/Header';
// import NewButton from '../../components/Button';
// import DatePickerComponent from '../../components/DatePicker';
// import UniversalModal from '../../components/UniversalModal';
// import BookingHeroCard from '../../components/booking/BookingHeroCard';
// import DetailSection from '../../components/booking/DetailSection';
// import EmptyStateCard from '../../components/booking/EmptyStateCard';
// import AppAlertModal from '../../components/feedback/AppAlertModal';
// import { useAppAlert } from '../../hooks/useAppAlert';
// import { useAppTheme } from '../../theme/AppThemeProvider';
// import { useSlots } from '../../services/Activity/FacilityService';
// import { AppStackParamList } from '../../navigation/AppDrawer';
// import { FONT_FAMILY } from '../../util/colors';

// const ShimmerPlaceholder = createShimmerPlaceholder(LinearGradient);
// type Props = NativeStackScreenProps<AppStackParamList, 'Activity'>;

// const Activity: React.FC<Props> = ({ route, navigation }) => {
//   const params = route as any;
//   const facility = params?.params?.facility || route?.params?.facility;
//   const auth = useSelector((state: any) => state.auth);
//   const { colors } = useAppTheme();
//   const { alertState, showAlert, hideAlert } = useAppAlert();
//   const [tempStartDate, setTempStartDate] = useState(moment().format('YYYY-MM-DD'));
//   const [selectedSlots, setSelectedSlots] = useState<any[]>([]);
//   const [session, setSession] = useState<any>({ id: 0 });
//   const [visible, setVisible] = useState(false);

//   const { slotsQuery, sessionsQuery } = useSlots(
//     facility?.id,
//     session?.id,
//     tempStartDate,
//     auth?.token,
//   );

//   const dateOptions = slotsQuery?.data?.dateOptions || [];
//   const slotRows = slotsQuery?.data?.data || [];
//   const inventory = Number(facility?.inventory || 0);

//   const analytics = useMemo(() => {
//     let totalCells = 0;
//     let available = 0;
//     let booked = 0;
//     let past = 0;

//     slotRows.forEach((time: any) => {
//       dateOptions.forEach((day: any) => {
//         totalCells += 1;
//         const slotBookingsOnDay = (time?.booking_data || []).filter(
//           (booking: any) => booking?.slot_date === day?.session_date,
//         );
//         const isFullyBooked = slotBookingsOnDay.length >= inventory;
//         const fullDateTime = moment(
//           `${day?.session_date} ${time?.label}`,
//           'YYYY-MM-DD hh:mm A',
//         );
//         const isPast = fullDateTime.isBefore(moment());

//         if (isPast) {
//           past += 1;
//         } else if (isFullyBooked) {
//           booked += 1;
//         } else {
//           available += 1;
//         }
//       });
//     });

//     return { totalCells, available, booked, past };
//   }, [dateOptions, inventory, slotRows]);

//   const selectSlot = (day: any, time: any) => {
//     setSelectedSlots(prev => {
//       const exists = prev.find(
//         slot => slot?.time?.id === time?.id && slot?.day?.id === day?.id,
//       );

//       if (exists) {
//         return prev.filter(
//           slot => !(slot?.day?.id === day?.id && slot?.time?.id === time?.id),
//         );
//       }

//       return [...prev, { day, time }];
//     });
//   };

//   const renderCell = (day: any, time: any) => {
//     const slotBookingsOnDay = (time?.booking_data || []).filter(
//       (booking: any) => booking?.slot_date === day?.session_date,
//     );
//     const isFullyBooked = slotBookingsOnDay.length >= inventory;
//     const fullDateTime = moment(
//       `${day?.session_date} ${time?.label}`,
//       'YYYY-MM-DD hh:mm A',
//     );
//     const isPast = fullDateTime.isBefore(moment());
//     const isSelected = selectedSlots.some(
//       item => item?.time?.id === time?.id && item?.day?.id === day?.id,
//     );
//     const slotsLeft = Math.max(0, inventory - slotBookingsOnDay.length);

//     let tone = {
//       backgroundColor: colors.surfaceAlt,
//       textColor: colors.text,
//       subtitleColor: colors.textMuted,
//     };

//     if (isPast) {
//       tone = {
//         backgroundColor: `${colors.textMuted}22`,
//         textColor: colors.textMuted,
//         subtitleColor: colors.textMuted,
//       };
//     } else if (isFullyBooked) {
//       tone = {
//         backgroundColor: `${colors.danger}16`,
//         textColor: colors.danger,
//         subtitleColor: colors.danger,
//       };
//     } else if (isSelected) {
//       tone = {
//         backgroundColor: colors.secondary,
//         textColor: colors.onPrimary,
//         subtitleColor: colors.onPrimary,
//       };
//     }

//     return (
//       <Pressable
//         disabled={isPast || isFullyBooked}
//         onPress={() => selectSlot(day, time)}
//         style={[
//           styles.slotCell,
//           {
//             backgroundColor: tone.backgroundColor,
//             borderColor: isSelected ? colors.secondary : colors.border,
//           },
//         ]}
//       >
//         <Text style={[styles.slotPrice, { color: tone.textColor }]}>
//           Rs. {Number(facility?.charge || 0).toFixed(0)}
//         </Text>
//         <Text style={[styles.slotLeft, { color: tone.subtitleColor }]}>
//           {isPast ? 'Past' : isFullyBooked ? 'Booked' : `${slotsLeft} left`}
//         </Text>
//       </Pressable>
//     );
//   };

//   const handleProceed = () => {
//     if (!selectedSlots.length) {
//       showAlert({
//         title: 'No slot selected',
//         message: 'Please select at least one activity slot before continuing.',
//         tone: 'warning',
//       });
//       return;
//     }

//     (navigation as any).navigate('ChoosePlayer', {
//       slots: selectedSlots,
//       facility,
//       session,
//     });
//   };

//   const renderLoadingGrid = () => (
//     <View style={styles.loadingGrid}>
//       {[1, 2, 3, 4].map(row => (
//         <View key={row} style={styles.loadingRow}>
//           {[1, 2, 3, 4, 5].map(col => (
//             <ShimmerPlaceholder
//               key={`${row}-${col}`}
//               width={78}
//               height={66}
//               shimmerStyle={styles.loadingCell}
//             />
//           ))}
//         </View>
//       ))}
//     </View>
//   );

//   return (
//     <View style={[styles.container, { backgroundColor: colors.background }]}>
//       <Header title="Activity Booking">
//         <Pressable
//           style={[styles.headerAction, { borderColor: `${colors.onPrimary}35` }]}
//           onPress={() =>
//             navigation.navigate('MyBookings', {
//               url: ['Activity'],
//               toggle: 'Activity',
//             } as any)
//           }
//         >
//           <Text style={[styles.headerActionLabel, { color: colors.onPrimary }]}>
//             My Bookings
//           </Text>
//         </Pressable>
//       </Header>

//       <ScrollView contentContainerStyle={styles.content}>
//         <BookingHeroCard
//           eyebrow="Slot Selection"
//           title={facility?.name || 'Activity'}
//           subtitle={`Book between ${facility?.min_days || 0} and ${facility?.max_days || 0} days in advance.`}
//           status={selectedSlots.length ? 'Slots selected' : 'Choose slots'}
//           statusTone={selectedSlots.length ? 'success' : 'warning'}
//           meta={[
//             { label: 'Charge', value: `Rs. ${Number(facility?.charge || 0).toFixed(2)}` },
//             { label: 'Inventory', value: String(inventory) },
//             { label: 'Selected', value: String(selectedSlots.length), tone: 'success' },
//           ]}
//         />

//         <DetailSection
//           title="Schedule Filters"
//           subtitle="Choose the first booking date and narrow the table by session."
//           delay={40}
//         >
//           <View style={styles.filterRow}>
//             <View style={styles.filterBlock}>
//               <Text style={[styles.filterLabel, { color: colors.text }]}>Start date</Text>
//               <DatePickerComponent
//                 placeholder={moment(tempStartDate).format('DD-MMMM-YYYY')}
//                 minDate={moment().add(parseInt(facility?.min_days || 0, 10), 'days').toDate()}
//                 maxDate={moment()
//                   .add(parseInt((facility?.max_days || 0) - 4, 10), 'days')
//                   .toDate()}
//                 stateDate={date => setTempStartDate(date)}
//               />
//             </View>
//             <View style={styles.filterBlock}>
//               <Text style={[styles.filterLabel, { color: colors.text }]}>Session</Text>
//               <Dropdown
//                 style={[
//                   styles.dropdown,
//                   { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
//                 ]}
//                 placeholderStyle={{ color: colors.textMuted, fontFamily: FONT_FAMILY.normal }}
//                 selectedTextStyle={{ color: colors.text, fontFamily: FONT_FAMILY.semiBold }}
//                 containerStyle={{
//                   backgroundColor: colors.surface,
//                   borderRadius: 18,
//                   borderWidth: 1,
//                   borderColor: colors.border,
//                 }}
//                 itemTextStyle={{ color: colors.text, fontFamily: FONT_FAMILY.normal }}
//                 data={[{ id: 0, name: 'All Sessions' }, ...(sessionsQuery?.data?.data || [])]}
//                 maxHeight={280}
//                 labelField="name"
//                 valueField="id"
//                 placeholder="Select session"
//                 value={session?.id ?? 0}
//                 onChange={item => setSession(item)}
//               />
//             </View>
//           </View>
//         </DetailSection>

//         <DetailSection
//           title="Availability Snapshot"
//           subtitle="Live slot colors help you distinguish available, booked, past, and selected cells."
//           delay={70}
//         >
//           <View style={styles.legendRow}>
//             {[
//               { label: 'Available', color: colors.surfaceAlt, text: colors.text },
//               { label: 'Selected', color: colors.secondary, text: colors.onPrimary },
//               { label: 'Booked', color: `${colors.danger}16`, text: colors.danger },
//               { label: 'Past', color: `${colors.textMuted}22`, text: colors.textMuted },
//             ].map(item => (
//               <View key={item.label} style={styles.legendItem}>
//                 <View style={[styles.legendSwatch, { backgroundColor: item.color }]} />
//                 <Text style={[styles.legendText, { color: colors.textMuted }]}>
//                   {item.label}
//                 </Text>
//               </View>
//             ))}
//           </View>

//           <View style={styles.analyticsRow}>
//             <View style={[styles.analyticsCard, { backgroundColor: colors.surfaceAlt }]}>
//               <Text style={[styles.analyticsValue, { color: colors.text }]}>
//                 {analytics.available}
//               </Text>
//               <Text style={[styles.analyticsLabel, { color: colors.textMuted }]}>
//                 Available
//               </Text>
//             </View>
//             <View style={[styles.analyticsCard, { backgroundColor: colors.surfaceAlt }]}>
//               <Text style={[styles.analyticsValue, { color: colors.text }]}>
//                 {analytics.booked}
//               </Text>
//               <Text style={[styles.analyticsLabel, { color: colors.textMuted }]}>
//                 Booked
//               </Text>
//             </View>
//             <View style={[styles.analyticsCard, { backgroundColor: colors.surfaceAlt }]}>
//               <Text style={[styles.analyticsValue, { color: colors.text }]}>
//                 {analytics.past}
//               </Text>
//               <Text style={[styles.analyticsLabel, { color: colors.textMuted }]}>
//                 Past
//               </Text>
//             </View>
//           </View>
//         </DetailSection>

//         <DetailSection
//           title="Slot Matrix"
//           subtitle="Tap any available cell to add or remove it from your activity cart."
//           delay={100}
//         >
//           {slotsQuery.isLoading ? (
//             renderLoadingGrid()
//           ) : !slotRows.length || !dateOptions.length ? (
//             <EmptyStateCard
//               title="No slots found"
//               description="There are no slot rows available for the chosen date and session."
//             />
//           ) : (
//             <ScrollView horizontal showsHorizontalScrollIndicator={false}>
//               <View>
//                 <View style={styles.matrixHeaderRow}>
//                   <View
//                     style={[
//                       styles.timeHeaderCell,
//                       { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
//                     ]}
//                   >
//                     <Text style={[styles.timeHeaderText, { color: colors.textMuted }]}>
//                       Time
//                     </Text>
//                   </View>
//                   {dateOptions.map((day: any) => (
//                     <View
//                       key={day?.id}
//                       style={[
//                         styles.dayHeaderCell,
//                         { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
//                       ]}
//                     >
//                       <Text style={[styles.dayHeaderDate, { color: colors.text }]}>
//                         {day?.date}
//                       </Text>
//                       <Text style={[styles.dayHeaderDay, { color: colors.textMuted }]}>
//                         {day?.day}
//                       </Text>
//                     </View>
//                   ))}
//                 </View>

//                 {slotRows.map((time: any, rowIndex: number) => (
//                   <View key={rowIndex} style={styles.matrixBodyRow}>
//                     <View
//                       style={[
//                         styles.timeCell,
//                         { backgroundColor: colors.surface, borderColor: colors.border },
//                       ]}
//                     >
//                       <Icon
//                         name={
//                           time?.session_id === 1
//                             ? 'weather-sunny'
//                             : time?.session_id === 2
//                             ? 'white-balance-sunny'
//                             : 'weather-night'
//                         }
//                         color={
//                           time?.session_id === 1
//                             ? colors.warning
//                             : time?.session_id === 2
//                             ? colors.danger
//                             : colors.text
//                         }
//                         size={18}
//                       />
//                       <Text style={[styles.timeCellText, { color: colors.text }]}>
//                         {time?.label}
//                       </Text>
//                     </View>
//                     {dateOptions.map((day: any) => (
//                       <View
//                         key={`${time?.id}-${day?.id}`}
//                         style={[
//                           styles.matrixCellWrap,
//                           { borderColor: colors.border },
//                         ]}
//                       >
//                         {renderCell(day, time)}
//                       </View>
//                     ))}
//                   </View>
//                 ))}
//               </View>
//             </ScrollView>
//           )}
//         </DetailSection>
//       </ScrollView>

//       {selectedSlots.length ? (
//         <View
//           style={[
//             styles.footer,
//             { backgroundColor: colors.surface, borderTopColor: colors.border },
//           ]}
//         >
//           <Pressable style={styles.footerMetaWrap} onPress={() => setVisible(true)}>
//             <Text style={[styles.footerTitle, { color: colors.text }]}>
//               {selectedSlots.length} {selectedSlots.length > 1 ? 'slots' : 'slot'} selected
//             </Text>
//             <Text style={[styles.footerSubtitle, { color: colors.textMuted }]}>
//               Tap to review dates and times
//             </Text>
//           </Pressable>
//           <NewButton text="Choose Players" onPress={handleProceed} />
//         </View>
//       ) : null}

//       <UniversalModal
//         visible={visible}
//         title={`${selectedSlots.length} ${selectedSlots.length > 1 ? 'Slots' : 'Slot'} Selected`}
//         setVisible={setVisible}
//       >
//         <View style={styles.modalBody}>
//           {selectedSlots.map((slot: any, index: number) => (
//             <View
//               key={`${slot?.day?.id}-${slot?.time?.id}-${index}`}
//               style={[
//                 styles.modalCard,
//                 { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
//               ]}
//             >
//               <View style={{ flex: 1 }}>
//                 <Text style={[styles.modalCardTitle, { color: colors.text }]}>
//                   {facility?.name}
//                 </Text>
//                 <Text style={[styles.modalCardMeta, { color: colors.textMuted }]}>
//                   {slot?.time?.label}
//                 </Text>
//               </View>
//               <View style={{ alignItems: 'flex-end' }}>
//                 <Text style={[styles.modalDate, { color: colors.text }]}>
//                   {moment(slot?.day?.session_date).format('DD MMM YYYY')}
//                 </Text>
//                 <Text style={[styles.modalSlotsPill, { color: colors.onPrimary }]}>
//                   1 Slot
//                 </Text>
//               </View>
//             </View>
//           ))}
//         </View>
//       </UniversalModal>

//       <AppAlertModal
//         visible={alertState.visible}
//         title={alertState.title}
//         message={alertState.message}
//         tone={alertState.tone}
//         primaryLabel={alertState.primaryLabel}
//         secondaryLabel={alertState.secondaryLabel}
//         onDismiss={hideAlert}
//         onPrimaryPress={() => {
//           hideAlert();
//           alertState.onPrimaryPress?.();
//         }}
//         onSecondaryPress={() => {
//           hideAlert();
//           alertState.onSecondaryPress?.();
//         }}
//       />
//     </View>
//   );
// };

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//   },
//   content: {
//     paddingBottom: 120,
//   },
//   headerAction: {
//     borderWidth: 1,
//     borderRadius: 10,
//     paddingHorizontal: 10,
//     paddingVertical: 6,
//   },
//   headerActionLabel: {
//     fontSize: 12,
//     fontFamily: FONT_FAMILY.semiBold,
//   },
//   filterRow: {
//     flexDirection: 'row',
//     gap: 12,
//   },
//   filterBlock: {
//     flex: 1,
//   },
//   filterLabel: {
//     marginBottom: 8,
//     fontSize: 13,
//     fontFamily: FONT_FAMILY.semiBold,
//   },
//   dropdown: {
//     minHeight: 54,
//     borderRadius: 18,
//     borderWidth: 1,
//     paddingHorizontal: 14,
//     margin: 10,
//   },
//   legendRow: {
//     flexDirection: 'row',
//     flexWrap: 'wrap',
//     marginBottom: 14,
//   },
//   legendItem: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     marginRight: 16,
//     marginBottom: 10,
//   },
//   legendSwatch: {
//     width: 14,
//     height: 14,
//     borderRadius: 4,
//     marginRight: 8,
//   },
//   legendText: {
//     fontSize: 12,
//     fontFamily: FONT_FAMILY.normal,
//   },
//   analyticsRow: {
//     flexDirection: 'row',
//     gap: 10,
//   },
//   analyticsCard: {
//     flex: 1,
//     borderRadius: 18,
//     padding: 14,
//   },
//   analyticsValue: {
//     fontSize: 20,
//     fontFamily: FONT_FAMILY.bold,
//   },
//   analyticsLabel: {
//     marginTop: 4,
//     fontSize: 12,
//     fontFamily: FONT_FAMILY.normal,
//   },
//   loadingGrid: {
//     gap: 10,
//   },
//   loadingRow: {
//     flexDirection: 'row',
//     gap: 10,
//   },
//   loadingCell: {
//     borderRadius: 16,
//   },
//   matrixHeaderRow: {
//     flexDirection: 'row',
//   },
//   timeHeaderCell: {
//     width: 94,
//     minHeight: 64,
//     borderWidth: 1,
//     borderRadius: 16,
//     alignItems: 'center',
//     justifyContent: 'center',
//     marginRight: 8,
//   },
//   timeHeaderText: {
//     fontSize: 13,
//     fontFamily: FONT_FAMILY.semiBold,
//   },
//   dayHeaderCell: {
//     width: 92,
//     minHeight: 64,
//     borderWidth: 1,
//     borderRadius: 16,
//     alignItems: 'center',
//     justifyContent: 'center',
//     marginRight: 8,
//   },
//   dayHeaderDate: {
//     fontSize: 16,
//     fontFamily: FONT_FAMILY.bold,
//   },
//   dayHeaderDay: {
//     marginTop: 4,
//     fontSize: 12,
//     fontFamily: FONT_FAMILY.normal,
//   },
//   matrixBodyRow: {
//     flexDirection: 'row',
//     marginTop: 10,
//   },
//   timeCell: {
//     width: 94,
//     minHeight: 76,
//     borderWidth: 1,
//     borderRadius: 16,
//     alignItems: 'center',
//     justifyContent: 'center',
//     marginRight: 8,
//     paddingHorizontal: 8,
//   },
//   timeCellText: {
//     marginTop: 6,
//     textAlign: 'center',
//     fontSize: 12,
//     fontFamily: FONT_FAMILY.semiBold,
//   },
//   matrixCellWrap: {
//     width: 92,
//     minHeight: 76,
//     borderRadius: 16,
//     marginRight: 8,
//   },
//   slotCell: {
//     flex: 1,
//     borderWidth: 1,
//     borderRadius: 16,
//     alignItems: 'center',
//     justifyContent: 'center',
//     paddingVertical: 12,
//     paddingHorizontal: 6,
//   },
//   slotPrice: {
//     fontSize: 12,
//     fontFamily: FONT_FAMILY.semiBold,
//   },
//   slotLeft: {
//     marginTop: 4,
//     fontSize: 11,
//     fontFamily: FONT_FAMILY.normal,
//   },
//   footer: {
//     position: 'absolute',
//     left: 0,
//     right: 0,
//     bottom: 0,
//     borderTopWidth: 1,
//     paddingHorizontal: 16,
//     paddingTop: 14,
//     paddingBottom: 18,
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 12,
//   },
//   footerMetaWrap: {
//     flex: 1,
//   },
//   footerTitle: {
//     fontSize: 16,
//     fontFamily: FONT_FAMILY.bold,
//   },
//   footerSubtitle: {
//     marginTop: 4,
//     fontSize: 12,
//     fontFamily: FONT_FAMILY.normal,
//   },
//   modalBody: {
//     paddingHorizontal: 16,
//     paddingBottom: 20,
//   },
//   modalCard: {
//     borderWidth: 1,
//     borderRadius: 18,
//     padding: 14,
//     marginBottom: 10,
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 12,
//   },
//   modalCardTitle: {
//     fontSize: 15,
//     fontFamily: FONT_FAMILY.semiBold,
//   },
//   modalCardMeta: {
//     marginTop: 4,
//     fontSize: 12,
//     fontFamily: FONT_FAMILY.normal,
//   },
//   modalDate: {
//     fontSize: 13,
//     fontFamily: FONT_FAMILY.semiBold,
//   },
//   modalSlotsPill: {
//     marginTop: 8,
//     backgroundColor: '#151831',
//     paddingHorizontal: 10,
//     paddingVertical: 6,
//     borderRadius: 999,
//     overflow: 'hidden',
//     fontSize: 11,
//     fontFamily: FONT_FAMILY.semiBold,
//   },
// });

// export default Activity;
