import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import moment from 'moment';
import { ScrollView } from 'react-native-gesture-handler';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSelector } from 'react-redux';
import { ActivityIndicator } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { createShimmerPlaceholder } from 'react-native-shimmer-placeholder';
import LinearGradient from 'react-native-linear-gradient';

import Header from '../../components/Header';
import BookingHeroCard from '../../components/booking/BookingHeroCard';
import EmptyStateCard from '../../components/booking/EmptyStateCard';
import { AppStackParamList } from '../../navigation/AppDrawer';
import { RootState } from '../../store/store';
import { FONT_FAMILY } from '../../util/colors';
import { DOMAIN } from '../../util/constant';
import { useAppTheme } from '../../theme/AppThemeProvider';
import { fetchBookingsByTab } from './bookingsApi';

const ShimmerPlaceholder = createShimmerPlaceholder(LinearGradient);
type Props = NativeStackScreenProps<AppStackParamList, 'MyBookings'>;
type UrlItem = string;

const MyBookings: React.FC<Props> = ({ navigation, route }) => {
  const { colors } = useAppTheme();
  const userData = useSelector((state: RootState) => state.auth);
  const [toggle, setToggle] = useState(route.params.toggle);
  const [data, setData] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const tabPositions = useRef<Record<string, number>>({});

  const isInitialLoading = loading && page === 1;
  const urls = route.params?.url as UrlItem[] | undefined;

  const getStatusLabel = useCallback(
    (item: any): string => {
      if (toggle === 'Tee') {
        if (item?.status_label) {
          return item.status_label;
        }
        const teeMoment =
          item?.booking_date && (item?.tee_sheet_time || item?.tee_time)
            ? moment(`${item.booking_date} ${item.tee_sheet_time || item.tee_time}`)
            : null;
        if (Number(item.is_cancelled)) return 'Cancelled';
        if (teeMoment?.isValid() && teeMoment.isBefore(moment())) return 'Completed';
        return item.is_active ? 'Active' : 'Pending';
      }
      return item?.status || 'Unknown';
    },
    [toggle],
  );

  const getStatusTone = (status?: string) => {
    const normalized = String(status || '').toLowerCase();
    if (normalized.includes('cancel') || normalized.includes('fail')) {
      return { bg: `${colors.danger}22`, fg: colors.danger };
    }
    if (normalized.includes('pending') || normalized.includes('hold')) {
      return { bg: `${colors.warning}22`, fg: colors.warning };
    }
    return { bg: `${colors.success}22`, fg: colors.success };
  };

  const analytics = useMemo(() => {
    return data.reduce(
      (acc, item) => {
        const status = getStatusLabel(item).toLowerCase();
        acc.total += 1;
        if (status.includes('cancel')) acc.cancelled += 1;
        else if (status.includes('pending')) acc.pending += 1;
        else acc.active += 1;
        return acc;
      },
      { total: 0, active: 0, pending: 0, cancelled: 0 },
    );
  }, [data, getStatusLabel]);

  const fetchData = useCallback(
    async (pageNumber = 1, refresh = false) => {
      if (loadingMore || (pageNumber > lastPage && !refresh)) return;
      pageNumber === 1 ? setLoading(true) : setLoadingMore(true);
      try {
        const result = await fetchBookingsByTab({
          tab: toggle,
          page: pageNumber,
          token: userData.token || undefined,
        });
        setLastPage(result.lastPage || 1);
        setData(prev => (refresh ? result.items : [...prev, ...result.items]));
        setPage(pageNumber);
      } finally {
        setLoading(false);
        setLoadingMore(false);
        setRefreshing(false);
      }
    },
    [lastPage, loadingMore, toggle, userData.token],
  );

  useEffect(() => {
    setData([]);
    setPage(1);
    fetchData(1, true);
  }, [toggle, fetchData]);

  useEffect(() => {
    if (Array.isArray(route.params?.url)) {
      setToggle(route.params.url[0]);
    }
  }, [route.params?.url]);

  useEffect(() => {
    if (toggle && tabPositions.current[toggle] !== undefined) {
      scrollRef.current?.scrollTo({ x: tabPositions.current[toggle], animated: true });
    }
  }, [toggle]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData(1, true);
  };

  const loadMore = () => {
    if (!loadingMore && page < lastPage) {
      fetchData(page + 1);
    }
  };

  const renderRoomItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={() => navigation.navigate('InvoiceDetails', { id: item.id })}
    >
      <View style={styles.rowBetween}>
        <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>
          {item.memberName}
        </Text>
        <View style={[styles.badge, { backgroundColor: getStatusTone(item.status).bg }]}>
          <Text style={[styles.badgeText, { color: getStatusTone(item.status).fg }]}>{item.status}</Text>
        </View>
      </View>
      <InfoRow label="Booking No" value={item.bookingId} colors={colors} />
      <InfoRow label="Member ID" value={item.memberID} colors={colors} />
      <View style={styles.rowBetween}>
        <InfoCol label="Check In" value={moment(item.checkin).format('DD MMM YYYY')} colors={colors} />
        <InfoCol label="Check Out" value={moment(item.checkout).format('DD MMM YYYY')} colors={colors} />
      </View>
      {!!item.payment && (
        <InfoRow
          label="Payment"
          value={item.payment.payment_status}
          colors={colors}
          valueColor={getStatusTone(item.payment.payment_status).fg}
        />
      )}
      <Text style={[styles.linkText, { color: colors.primary }]}>View Details →</Text>
    </TouchableOpacity>
  );

  const renderHallItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={() => navigation.navigate('InvoiceHallDetails', { id: item.id })}
    >
      <View style={styles.rowBetween}>
        <Text style={[styles.cardTitle, { color: colors.text }]}>{item.memberName}</Text>
        <View style={[styles.badge, { backgroundColor: getStatusTone(item.status).bg }]}>
          <Text style={[styles.badgeText, { color: getStatusTone(item.status).fg }]}>{item.status}</Text>
        </View>
      </View>
      <InfoRow label="Booking ID" value={item.booking_ID} colors={colors} />
      <InfoRow label="Persons" value={item.noofPerson} colors={colors} />
      <InfoRow label="Function Date" value={moment(item.funDate).format('DD MMM YYYY')} colors={colors} />
      <InfoRow
        label="Payment"
        value={item.payment_status}
        colors={colors}
        valueColor={getStatusTone(item.payment_status).fg}
      />
      <Text style={[styles.linkText, { color: colors.primary }]}>View Details →</Text>
    </TouchableOpacity>
  );

  const renderTableItem = ({ item }: { item: any }) => {
    const status = getStatusLabel(item);
    const tone = getStatusTone(status);
    return (
      <TouchableOpacity
        activeOpacity={0.85}
        style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => navigation.navigate('TableBookingDetail', { bookingId: item.id })}
      >
        <View style={styles.rowBetween}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>
            {item?.meal?.name} - {item?.table?.name}
          </Text>
          <View style={[styles.badge, { backgroundColor: tone.bg }]}>
            <Text style={[styles.badgeText, { color: tone.fg }]}>{status}</Text>
          </View>
        </View>
        <InfoRow label="Booking Date" value={moment(item.booking_date).format('DD MMM YYYY')} colors={colors} />
        <InfoRow label="Time Slot" value={item?.time?.time} colors={colors} />
        <InfoRow label="Venue" value={item?.venue?.name} colors={colors} />
      </TouchableOpacity>
    );
  };

  const renderTeeItem = ({ item }: { item: any }) => {
    const status = getStatusLabel(item);
    const tone = getStatusTone(status);
    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() =>
          (navigation as any).navigate('TeeBookingDetail', {
            data: item,
            tee_booking_detail_id: item.tee_booking_detail_id,
          })
        }
      >
        <View style={styles.rowBetween}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>
            {item.booking_number || item.bookingId || item.tee_booking_detail_id}
          </Text>
          <View style={[styles.badge, { backgroundColor: tone.bg }]}>
            <Text style={[styles.badgeText, { color: tone.fg }]}>{status}</Text>
          </View>
        </View>
        <InfoRow label="Booking Date" value={moment(item.booking_date).format('DD MMM YYYY')} colors={colors} />
        <InfoRow label="Tee Time" value={item.tee_sheet_time} colors={colors} />
        <InfoRow label="Hole" value={item.hole_number} colors={colors} />
        <InfoRow label="Players" value={item.player_count} colors={colors} />
      </TouchableOpacity>
    );
  };

  const renderActivityItem = ({ item }: { item: any }) => {
  const participants = item?.participants ?? [];

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() =>
        navigation.navigate('ActivityBookingDetail', {
          bookingId: item.id,
        })
      }
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
      ]}
    >
      <View style={styles.rowBetween}>
        <Text style={[styles.cardTitle, { color: colors.text }]}>
          {item?.activity_name}
        </Text>

         <View
        style={[
          styles.badge,
          {
            alignSelf: 'flex-end',
            backgroundColor: getStatusTone(item?.booking_status).bg,
          },
        ]}
      >
        <Text
          style={[
            styles.badgeText,
            {
              color: getStatusTone(item?.booking_status).fg,
            },
          ]}
        >
          {item?.booking_status}
        </Text>
      </View>
      </View>

      <InfoRow
        label="Booking No."
        value={item?.booking_no}
        colors={colors}
      />

      <InfoRow
        label="Frequency"
        value={item?.frequency_name}
        colors={colors}
      />

      <InfoRow
        label="Booked On"
        value={moment(item?.booking_date).format(
          'DD MMM YYYY, hh:mm A',
        )}
        colors={colors}
      />

      <InfoRow
        label="Validity"
        value={`${moment(item?.valid_from).format(
          'DD MMM YYYY',
        )} - ${moment(item?.valid_to).format('DD MMM YYYY')}`}
        colors={colors}
      />

      <InfoRow
        label="Participants"
        value={`${participants.length}`}
        colors={colors}
      />

      <InfoRow
        label="Total Amount"
        value={`₹ ${Number(item?.total_amount ?? 0).toFixed(2)}`}
        colors={colors}
      />

    <InfoRow
  label="Payment"
  value={item?.payment_status}
  colors={colors}
  valueColor={
    item?.payment_status === 'Paid'
      ? '#16A34A' // Green
      : item?.payment_status === 'Pending'
      ? '#F59E0B' // Orange
      : item?.payment_status === 'Failed'
      ? '#DC2626' // Red
      : colors.text
  }
/>

    
    </TouchableOpacity>
  );
};

  const renderEventItem = ({ item }: { item: any }) => (
    <Pressable
      disabled={item.ticket_count + item.waiter_count === 0}
      style={[styles.eventCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={() => navigation.navigate('EventBookingDetails', { bookingId: item.booking_id })}
    >
      <Image source={{ uri: `${DOMAIN.IMG}event/${item.event_image}` }} style={styles.image} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.cardTitle, { color: colors.text }]}>{item.event_name}</Text>
        <View style={styles.check}>
          <Icon name="calendar-today" size={14} color={colors.textMuted} />
          <Text style={[styles.value, { color: colors.text }]}> {item.event_date}</Text>
        </View>
        {item.ticket_count > 0 && (
          <Text style={[styles.label, { color: colors.textMuted }]}>
            {item.ticket_count} Tickets • {item.ticket_types.join(', ')}
          </Text>
        )}
      </View>
      <View style={styles.right}>
        <Text style={[styles.amount, { color: colors.text }]}>₹{item.total_amount}</Text>
        <View
          style={[
            styles.badge,
            {
              backgroundColor:
                item.status === 'confirmed' ? `${colors.success}22` : `${colors.warning}22`,
            },
          ]}
        >
          <Text
            style={[
              styles.badgeText,
              { color: item.status === 'confirmed' ? colors.success : colors.warning },
            ]}
          >
            {item.is_staff ? 'COMPLIMENTARY' : item.status.toUpperCase()}
          </Text>
        </View>
      </View>
    </Pressable>
  );

  const renderByTab = ({ item }: { item: any }) => {
    switch (toggle) {
      case 'Room':
        return renderRoomItem({ item });
      case 'Banquet':
        return renderHallItem({ item });
      case 'Activity':
        return renderActivityItem({ item });
      case 'Event':
        return renderEventItem({ item });
      case 'Tee':
        return renderTeeItem({ item });
      case 'Table':
        return renderTableItem({ item });
      default:
        return null;
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Header title={`${toggle} Booking`} />

      <View style={{  backgroundColor: colors.border, marginBottom: 8 }} >
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ paddingVertical: 10 }}
        contentContainerStyle={{ paddingRight: 20 ,}}
      >
        {urls?.map((item, index) => {
          const isSelected = toggle === item;
          return (
            <Pressable
              key={index}
              onLayout={event => {
                tabPositions.current[item] = event.nativeEvent.layout.x;
              }}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              onPress={() => setToggle(item)}
              style={({ pressed }) => [
                styles.tabBtn,
                {
                  backgroundColor: isSelected
                    ? colors.primary
                    : pressed
                    ? colors.surfaceAlt
                    : colors.surface,
                  borderColor: isSelected ? colors.primary : colors.border,
                },
              ]}
            >
              <Text style={[styles.tabText, { color: isSelected ? colors.onPrimary : colors.text }]}>
                {item}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
</View>
      <View style={styles.analyticsWrap}>
        <AnalyticsCard label="Total" value={analytics.total} colors={colors} />
        <AnalyticsCard label="Active" value={analytics.active} colors={colors} tone="success" />
        <AnalyticsCard label="Pending" value={analytics.pending} colors={colors} tone="warning" />
        <AnalyticsCard label="Cancelled" value={analytics.cancelled} colors={colors} tone="danger" />
      </View>

      <BookingHeroCard
        eyebrow="Booking Hub"
        title={`${toggle} History`}
        subtitle={`Track upcoming, active, and completed ${toggle?.toLowerCase()} reservations from one place.`}
        status={`${analytics.total} records`}
        meta={[
          { label: 'Active', value: String(analytics.active), tone: 'success' },
          { label: 'Pending', value: String(analytics.pending), tone: 'warning' },
          { label: 'Cancelled', value: String(analytics.cancelled), tone: 'danger' },
        ]}
      />

      {isInitialLoading ? (
        <ShimmerList colors={colors} />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(_, index) => `${toggle}-${index}`}
          renderItem={renderByTab}
          refreshing={refreshing}
          onRefresh={onRefresh}
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          ListEmptyComponent={<EmptyComponent colors={colors} />}
          ListFooterComponent={loadingMore ? <ActivityIndicator style={{ marginVertical: 20 }} /> : null}
          initialNumToRender={6}
          maxToRenderPerBatch={6}
          windowSize={5}
          removeClippedSubviews
        />
      )}
    </View>
  );
};

const InfoRow = ({
  label,
  value,
  colors,
  valueColor,
}: {
  label: string;
  value: any;
  colors: any;
  valueColor?: string;
}) => (
  <View style={styles.infoRow}>
    <Text style={[styles.label, { color: colors.textMuted }]}>{label}</Text>
    <Text style={[styles.value, { color: valueColor || colors.text }]}>{value || '-'}</Text>
  </View>
);

const InfoCol = ({
  label,
  value,
  colors,
}: {
  label: string;
  value: any;
  colors: any;
}) => (
  <View>
    <Text style={[styles.label, { color: colors.textMuted }]}>{label}</Text>
    <Text style={[styles.value, { color: colors.text }]}>{value || '-'}</Text>
  </View>
);

const AnalyticsCard = ({
  label,
  value,
  colors,
  tone,
}: {
  label: string;
  value: number;
  colors: any;
  tone?: 'success' | 'warning' | 'danger';
}) => {
  const toneColor = tone ? colors[tone] : colors.text;
  return (
    <View
      style={[
        styles.analyticsCard,
        {
          backgroundColor: tone ? `${toneColor}12` : colors.surface,
          borderColor: tone ? `${toneColor}44` : colors.border,
        },
      ]}
    >
      <Text style={[styles.analyticsLabel, { color: colors.textMuted }]}>{label}</Text>
      <Text style={[styles.analyticsValue, { color: toneColor }]}>{value}</Text>
    </View>
  );
};

const ShimmerList = ({ colors }: { colors: any }) => (
  <FlatList
    data={[1, 2, 3, 4, 5]}
    keyExtractor={i => i.toString()}
    renderItem={() => (
      <View style={[styles.card, { marginHorizontal: 16, backgroundColor: colors.surface, borderColor: colors.border }]}>
        <ShimmerPlaceholder height={18} style={{ marginBottom: 10 }} />
        <ShimmerPlaceholder height={14} style={{ marginBottom: 6 }} />
        <ShimmerPlaceholder height={14} style={{ marginBottom: 6 }} />
        <ShimmerPlaceholder height={14} width={120} />
      </View>
    )}
  />
);

const EmptyComponent = () => (
  <EmptyStateCard
    title="No bookings found"
    description="Try another booking tab or refresh to check for the latest reservations."
  />
);

export default MyBookings;

const styles = StyleSheet.create({
  tabBtn: {
    minWidth: 100,
    padding: 10,
    marginHorizontal: 10,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  tabText: {
    fontSize: 16,
    fontFamily: FONT_FAMILY.semiBold,
  },
  analyticsWrap: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 8,
    justifyContent: 'space-between',
  },
  analyticsCard: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 8,
    alignItems: 'center',
    marginHorizontal: 3,
  },
  analyticsLabel: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.normal,
  },
  analyticsValue: {
    fontSize: 16,
    fontFamily: FONT_FAMILY.bold,
    marginTop: 2,
  },
  card: {
    borderWidth: 1,
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    borderRadius: 14,
    elevation: 2,
  },
  eventCard: {
    flexDirection: 'row',
    borderWidth: 1,
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    borderRadius: 14,
    elevation: 2,
    alignItems: 'center',
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 7,
  },
  cardTitle: {
    fontSize: 15,
    fontFamily: FONT_FAMILY.bold,
    maxWidth: '70%',
  },
  label: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.normal,
  },
  value: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.semiBold,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.semiBold,
  },
  linkText: {
    fontSize: 13,
    marginTop: 8,
    alignSelf: 'flex-end',
    fontFamily: FONT_FAMILY.semiBold,
  },
  right: {
    alignItems: 'flex-end',
    marginLeft: 10,
  },
  amount: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 15,
    marginBottom: 6,
  },
  check: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 2,
  },
  image: {
    width: 70,
    height: 70,
    borderRadius: 10,
    marginRight: 12,
  },
  empty: {
    textAlign: 'center',
    marginTop: 40,
    fontFamily: FONT_FAMILY.normal,
    fontSize: 15,
  },
});

// import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
// import {
//   FlatList,
//   Image,
//   Pressable,
//   StyleSheet,
//   Text,
//   TouchableOpacity,
//   View,
// } from 'react-native';
// import moment from 'moment';
// import { ScrollView } from 'react-native-gesture-handler';
// import { NativeStackScreenProps } from '@react-navigation/native-stack';
// import { useSelector } from 'react-redux';
// import { ActivityIndicator } from 'react-native-paper';
// import Icon from 'react-native-vector-icons/MaterialIcons';
// import { createShimmerPlaceholder } from 'react-native-shimmer-placeholder';
// import LinearGradient from 'react-native-linear-gradient';

// import Header from '../../components/Header';
// import BookingHeroCard from '../../components/booking/BookingHeroCard';
// import EmptyStateCard from '../../components/booking/EmptyStateCard';
// import { AppStackParamList } from '../../navigation/AppDrawer';
// import { RootState } from '../../store/store';
// import { FONT_FAMILY } from '../../util/colors';
// import { DOMAIN } from '../../util/constant';
// import { useAppTheme } from '../../theme/AppThemeProvider';
// import { fetchBookingsByTab } from './bookingsApi';

// const ShimmerPlaceholder = createShimmerPlaceholder(LinearGradient);
// type Props = NativeStackScreenProps<AppStackParamList, 'MyBookings'>;
// type UrlItem = string;

// const MyBookings: React.FC<Props> = ({ navigation, route }) => {
//   const { colors } = useAppTheme();
//   const userData = useSelector((state: RootState) => state.auth);
//   const [toggle, setToggle] = useState(route.params.toggle);
//   const [data, setData] = useState<any[]>([]);
//   const [page, setPage] = useState(1);
//   const [lastPage, setLastPage] = useState(1);
//   const [loading, setLoading] = useState(false);
//   const [refreshing, setRefreshing] = useState(false);
//   const [loadingMore, setLoadingMore] = useState(false);
//   const scrollRef = useRef<ScrollView>(null);
//   const tabPositions = useRef<Record<string, number>>({});

//   const isInitialLoading = loading && page === 1;
//   const urls = route.params?.url as UrlItem[] | undefined;

//   const getStatusLabel = useCallback(
//     (item: any): string => {
//       if (toggle === 'Tee') {
//         const isPassed = moment(item.booking_date).isBefore(moment(), 'day');
//         if (Number(item.is_cancelled)) return 'Cancelled';
//         if (isPassed) return 'Completed';
//         return item.is_active ? 'Active' : 'Pending';
//       }
//       return item?.status || 'Unknown';
//     },
//     [toggle],
//   );

//   const getStatusTone = (status?: string) => {
//     const normalized = String(status || '').toLowerCase();
//     if (normalized.includes('cancel') || normalized.includes('fail')) {
//       return { bg: `${colors.danger}22`, fg: colors.danger };
//     }
//     if (normalized.includes('pending') || normalized.includes('hold')) {
//       return { bg: `${colors.warning}22`, fg: colors.warning };
//     }
//     return { bg: `${colors.success}22`, fg: colors.success };
//   };

//   const analytics = useMemo(() => {
//     return data.reduce(
//       (acc, item) => {
//         const status = getStatusLabel(item).toLowerCase();
//         acc.total += 1;
//         if (status.includes('cancel')) acc.cancelled += 1;
//         else if (status.includes('pending')) acc.pending += 1;
//         else acc.active += 1;
//         return acc;
//       },
//       { total: 0, active: 0, pending: 0, cancelled: 0 },
//     );
//   }, [data, getStatusLabel]);

//   const fetchData = useCallback(
//     async (pageNumber = 1, refresh = false) => {
//       if (loadingMore || (pageNumber > lastPage && !refresh)) return;
//       pageNumber === 1 ? setLoading(true) : setLoadingMore(true);
//       try {
//         const result = await fetchBookingsByTab({
//           tab: toggle,
//           page: pageNumber,
//           token: userData.token || undefined,
//         });
//         setLastPage(result.lastPage || 1);
//         setData(prev => (refresh ? result.items : [...prev, ...result.items]));
//         setPage(pageNumber);
//       } finally {
//         setLoading(false);
//         setLoadingMore(false);
//         setRefreshing(false);
//       }
//     },
//     [lastPage, loadingMore, toggle, userData.token],
//   );

//   useEffect(() => {
//     setData([]);
//     setPage(1);
//     fetchData(1, true);
//   }, [toggle, fetchData]);

//   useEffect(() => {
//     if (Array.isArray(route.params?.url)) {
//       setToggle(route.params.url[0]);
//     }
//   }, [route.params?.url]);

//   useEffect(() => {
//     if (toggle && tabPositions.current[toggle] !== undefined) {
//       scrollRef.current?.scrollTo({ x: tabPositions.current[toggle], animated: true });
//     }
//   }, [toggle]);

//   const onRefresh = async () => {
//     setRefreshing(true);
//     await fetchData(1, true);
//   };

//   const loadMore = () => {
//     if (!loadingMore && page < lastPage) {
//       fetchData(page + 1);
//     }
//   };

//   const renderRoomItem = ({ item }: { item: any }) => (
//     <TouchableOpacity
//       style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
//       onPress={() => navigation.navigate('InvoiceDetails', { id: item.id })}
//     >
//       <View style={styles.rowBetween}>
//         <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>
//           {item.memberName}
//         </Text>
//         <View style={[styles.badge, { backgroundColor: getStatusTone(item.status).bg }]}>
//           <Text style={[styles.badgeText, { color: getStatusTone(item.status).fg }]}>{item.status}</Text>
//         </View>
//       </View>
//       <InfoRow label="Booking No" value={item.bookingId} colors={colors} />
//       <InfoRow label="Member ID" value={item.memberID} colors={colors} />
//       <View style={styles.rowBetween}>
//         <InfoCol label="Check In" value={moment(item.checkin).format('DD MMM YYYY')} colors={colors} />
//         <InfoCol label="Check Out" value={moment(item.checkout).format('DD MMM YYYY')} colors={colors} />
//       </View>
//       {!!item.payment && (
//         <InfoRow
//           label="Payment"
//           value={item.payment.payment_status}
//           colors={colors}
//           valueColor={getStatusTone(item.payment.payment_status).fg}
//         />
//       )}
//       <Text style={[styles.linkText, { color: colors.primary }]}>View Details →</Text>
//     </TouchableOpacity>
//   );

//   const renderHallItem = ({ item }: { item: any }) => (
//     <TouchableOpacity
//       style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
//       onPress={() => navigation.navigate('InvoiceHallDetails', { id: item.id })}
//     >
//       <View style={styles.rowBetween}>
//         <Text style={[styles.cardTitle, { color: colors.text }]}>{item.memberName}</Text>
//         <View style={[styles.badge, { backgroundColor: getStatusTone(item.status).bg }]}>
//           <Text style={[styles.badgeText, { color: getStatusTone(item.status).fg }]}>{item.status}</Text>
//         </View>
//       </View>
//       <InfoRow label="Booking ID" value={item.booking_ID} colors={colors} />
//       <InfoRow label="Persons" value={item.noofPerson} colors={colors} />
//       <InfoRow label="Function Date" value={moment(item.funDate).format('DD MMM YYYY')} colors={colors} />
//       <InfoRow
//         label="Payment"
//         value={item.payment_status}
//         colors={colors}
//         valueColor={getStatusTone(item.payment_status).fg}
//       />
//       <Text style={[styles.linkText, { color: colors.primary }]}>View Details →</Text>
//     </TouchableOpacity>
//   );

//   const renderTableItem = ({ item }: { item: any }) => {
//     const status = getStatusLabel(item);
//     const tone = getStatusTone(status);
//     return (
//       <TouchableOpacity
//         activeOpacity={0.85}
//         style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
//         onPress={() => navigation.navigate('TableBookingDetail', { bookingId: item.id })}
//       >
//         <View style={styles.rowBetween}>
//           <Text style={[styles.cardTitle, { color: colors.text }]}>
//             {item?.meal?.name} - {item?.table?.name}
//           </Text>
//           <View style={[styles.badge, { backgroundColor: tone.bg }]}>
//             <Text style={[styles.badgeText, { color: tone.fg }]}>{status}</Text>
//           </View>
//         </View>
//         <InfoRow label="Booking Date" value={moment(item.booking_date).format('DD MMM YYYY')} colors={colors} />
//         <InfoRow label="Time Slot" value={item?.time?.time} colors={colors} />
//         <InfoRow label="Venue" value={item?.venue?.name} colors={colors} />
//       </TouchableOpacity>
//     );
//   };

//   const renderTeeItem = ({ item }: { item: any }) => {
//     const status = getStatusLabel(item);
//     const tone = getStatusTone(status);
//     return (
//       <TouchableOpacity
//         style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
//         onPress={() =>
//           (navigation as any).navigate('TeeBookingDetail', {
//             data: item,
//             tee_booking_detail_id: item.tee_booking_detail_id,
//           })
//         }
//       >
//         <View style={styles.rowBetween}>
//           <Text style={[styles.cardTitle, { color: colors.text }]}>{item.bookingId}</Text>
//           <View style={[styles.badge, { backgroundColor: tone.bg }]}>
//             <Text style={[styles.badgeText, { color: tone.fg }]}>{status}</Text>
//           </View>
//         </View>
//         <InfoRow label="Booking Date" value={moment(item.booking_date).format('DD MMM YYYY')} colors={colors} />
//         <InfoRow label="Tee Time" value={item.tee_sheet_time} colors={colors} />
//       </TouchableOpacity>
//     );
//   };

//   const renderActivityItem = ({ item }: { item: any }) => (
//     <TouchableOpacity
//       activeOpacity={0.8}
//       onPress={() => navigation.navigate('ActivityBookingDetail', { bookingId: item.id })}
//       style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
//     >
//       <View style={styles.rowBetween}>
//         <Text style={[styles.cardTitle, { color: colors.text }]}>{item?.facility_name}</Text>
//         <Icon name="chevron-right" size={20} color={colors.text} />
//       </View>
//       <InfoRow label="Booking Number" value={item?.booking_number} colors={colors} />
//       <InfoRow
//         label="Booked On"
//         value={moment(item?.booking_date).format('Do MMM [at] h:mm A')}
//         colors={colors}
//       />
//       <InfoRow
//         label="Slot"
//         value={`${moment(item?.slot_date).format('Do MMM YY')} at ${item?.slot_label}`}
//         colors={colors}
//       />
//       <View style={[styles.badge, { alignSelf: 'flex-end', backgroundColor: getStatusTone(item?.status).bg }]}>
//         <Text style={[styles.badgeText, { color: getStatusTone(item?.status).fg }]}>{item?.status}</Text>
//       </View>
//     </TouchableOpacity>
//   );

//   const renderEventItem = ({ item }: { item: any }) => (
//     <Pressable
//       disabled={item.ticket_count + item.waiter_count === 0}
//       style={[styles.eventCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
//       onPress={() => navigation.navigate('EventBookingDetails', { bookingId: item.booking_id })}
//     >
//       <Image source={{ uri: `${DOMAIN.IMG}event/${item.event_image}` }} style={styles.image} />
//       <View style={{ flex: 1 }}>
//         <Text style={[styles.cardTitle, { color: colors.text }]}>{item.event_name}</Text>
//         <View style={styles.check}>
//           <Icon name="calendar-today" size={14} color={colors.textMuted} />
//           <Text style={[styles.value, { color: colors.text }]}> {item.event_date}</Text>
//         </View>
//         {item.ticket_count > 0 && (
//           <Text style={[styles.label, { color: colors.textMuted }]}>
//             {item.ticket_count} Tickets • {item.ticket_types.join(', ')}
//           </Text>
//         )}
//       </View>
//       <View style={styles.right}>
//         <Text style={[styles.amount, { color: colors.text }]}>₹{item.total_amount}</Text>
//         <View
//           style={[
//             styles.badge,
//             {
//               backgroundColor:
//                 item.status === 'confirmed' ? `${colors.success}22` : `${colors.warning}22`,
//             },
//           ]}
//         >
//           <Text
//             style={[
//               styles.badgeText,
//               { color: item.status === 'confirmed' ? colors.success : colors.warning },
//             ]}
//           >
//             {item.is_staff ? 'COMPLIMENTARY' : item.status.toUpperCase()}
//           </Text>
//         </View>
//       </View>
//     </Pressable>
//   );

//   const renderByTab = ({ item }: { item: any }) => {
//     switch (toggle) {
//       case 'Room':
//         return renderRoomItem({ item });
//       case 'Banquet':
//         return renderHallItem({ item });
//       case 'Activity':
//         return renderActivityItem({ item });
//       case 'Event':
//         return renderEventItem({ item });
//       case 'Tee':
//         return renderTeeItem({ item });
//       case 'Table':
//         return renderTableItem({ item });
//       default:
//         return null;
//     }
//   };

//   return (
//     <View style={{ flex: 1, backgroundColor: colors.background }}>
//       <Header title={`${toggle} Booking`} />

//       <View style={{  backgroundColor: colors.border, marginBottom: 8 }} >
//       <ScrollView
//         ref={scrollRef}
//         horizontal
//         showsHorizontalScrollIndicator={false}
//         style={{ paddingVertical: 10 }}
//         contentContainerStyle={{ paddingRight: 20 ,}}
//       >
//         {urls?.map((item, index) => {
//           const isSelected = toggle === item;
//           return (
//             <Pressable
//               key={index}
//               onLayout={event => {
//                 tabPositions.current[item] = event.nativeEvent.layout.x;
//               }}
//               accessibilityRole="button"
//               accessibilityState={{ selected: isSelected }}
//               onPress={() => setToggle(item)}
//               style={({ pressed }) => [
//                 styles.tabBtn,
//                 {
//                   backgroundColor: isSelected
//                     ? colors.primary
//                     : pressed
//                     ? colors.surfaceAlt
//                     : colors.surface,
//                   borderColor: isSelected ? colors.primary : colors.border,
//                 },
//               ]}
//             >
//               <Text style={[styles.tabText, { color: isSelected ? colors.onPrimary : colors.text }]}>
//                 {item}
//               </Text>
//             </Pressable>
//           );
//         })}
//       </ScrollView>
// </View>
//       <View style={styles.analyticsWrap}>
//         <AnalyticsCard label="Total" value={analytics.total} colors={colors} />
//         <AnalyticsCard label="Active" value={analytics.active} colors={colors} tone="success" />
//         <AnalyticsCard label="Pending" value={analytics.pending} colors={colors} tone="warning" />
//         <AnalyticsCard label="Cancelled" value={analytics.cancelled} colors={colors} tone="danger" />
//       </View>

//       <BookingHeroCard
//         eyebrow="Booking Hub"
//         title={`${toggle} History`}
//         subtitle={`Track upcoming, active, and completed ${toggle?.toLowerCase()} reservations from one place.`}
//         status={`${analytics.total} records`}
//         meta={[
//           { label: 'Active', value: String(analytics.active), tone: 'success' },
//           { label: 'Pending', value: String(analytics.pending), tone: 'warning' },
//           { label: 'Cancelled', value: String(analytics.cancelled), tone: 'danger' },
//         ]}
//       />

//       {isInitialLoading ? (
//         <ShimmerList colors={colors} />
//       ) : (
//         <FlatList
//           data={data}
//           keyExtractor={(_, index) => `${toggle}-${index}`}
//           renderItem={renderByTab}
//           refreshing={refreshing}
//           onRefresh={onRefresh}
//           onEndReached={loadMore}
//           onEndReachedThreshold={0.4}
//           ListEmptyComponent={<EmptyComponent colors={colors} />}
//           ListFooterComponent={loadingMore ? <ActivityIndicator style={{ marginVertical: 20 }} /> : null}
//           initialNumToRender={6}
//           maxToRenderPerBatch={6}
//           windowSize={5}
//           removeClippedSubviews
//         />
//       )}
//     </View>
//   );
// };

// const InfoRow = ({
//   label,
//   value,
//   colors,
//   valueColor,
// }: {
//   label: string;
//   value: any;
//   colors: any;
//   valueColor?: string;
// }) => (
//   <View style={styles.infoRow}>
//     <Text style={[styles.label, { color: colors.textMuted }]}>{label}</Text>
//     <Text style={[styles.value, { color: valueColor || colors.text }]}>{value || '-'}</Text>
//   </View>
// );

// const InfoCol = ({
//   label,
//   value,
//   colors,
// }: {
//   label: string;
//   value: any;
//   colors: any;
// }) => (
//   <View>
//     <Text style={[styles.label, { color: colors.textMuted }]}>{label}</Text>
//     <Text style={[styles.value, { color: colors.text }]}>{value || '-'}</Text>
//   </View>
// );

// const AnalyticsCard = ({
//   label,
//   value,
//   colors,
//   tone,
// }: {
//   label: string;
//   value: number;
//   colors: any;
//   tone?: 'success' | 'warning' | 'danger';
// }) => {
//   const toneColor = tone ? colors[tone] : colors.text;
//   return (
//     <View
//       style={[
//         styles.analyticsCard,
//         {
//           backgroundColor: tone ? `${toneColor}12` : colors.surface,
//           borderColor: tone ? `${toneColor}44` : colors.border,
//         },
//       ]}
//     >
//       <Text style={[styles.analyticsLabel, { color: colors.textMuted }]}>{label}</Text>
//       <Text style={[styles.analyticsValue, { color: toneColor }]}>{value}</Text>
//     </View>
//   );
// };

// const ShimmerList = ({ colors }: { colors: any }) => (
//   <FlatList
//     data={[1, 2, 3, 4, 5]}
//     keyExtractor={i => i.toString()}
//     renderItem={() => (
//       <View style={[styles.card, { marginHorizontal: 16, backgroundColor: colors.surface, borderColor: colors.border }]}>
//         <ShimmerPlaceholder height={18} style={{ marginBottom: 10 }} />
//         <ShimmerPlaceholder height={14} style={{ marginBottom: 6 }} />
//         <ShimmerPlaceholder height={14} style={{ marginBottom: 6 }} />
//         <ShimmerPlaceholder height={14} width={120} />
//       </View>
//     )}
//   />
// );

// const EmptyComponent = () => (
//   <EmptyStateCard
//     title="No bookings found"
//     description="Try another booking tab or refresh to check for the latest reservations."
//   />
// );

// export default MyBookings;

// const styles = StyleSheet.create({
//   tabBtn: {
//     minWidth: 100,
//     padding: 10,
//     marginHorizontal: 10,
//     borderRadius: 12,
//     alignItems: 'center',
//     borderWidth: 1,
//   },
//   tabText: {
//     fontSize: 16,
//     fontFamily: FONT_FAMILY.semiBold,
//   },
//   analyticsWrap: {
//     flexDirection: 'row',
//     marginHorizontal: 16,
//     marginTop: 4,
//     marginBottom: 8,
//     justifyContent: 'space-between',
//   },
//   analyticsCard: {
//     flex: 1,
//     borderRadius: 12,
//     borderWidth: 1,
//     paddingVertical: 8,
//     alignItems: 'center',
//     marginHorizontal: 3,
//   },
//   analyticsLabel: {
//     fontSize: 11,
//     fontFamily: FONT_FAMILY.normal,
//   },
//   analyticsValue: {
//     fontSize: 16,
//     fontFamily: FONT_FAMILY.bold,
//     marginTop: 2,
//   },
//   card: {
//     borderWidth: 1,
//     marginHorizontal: 16,
//     marginVertical: 8,
//     padding: 16,
//     borderRadius: 14,
//     elevation: 2,
//   },
//   eventCard: {
//     flexDirection: 'row',
//     borderWidth: 1,
//     marginHorizontal: 16,
//     marginVertical: 8,
//     padding: 16,
//     borderRadius: 14,
//     elevation: 2,
//     alignItems: 'center',
//   },
//   rowBetween: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//   },
//   infoRow: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     marginTop: 7,
//   },
//   cardTitle: {
//     fontSize: 15,
//     fontFamily: FONT_FAMILY.bold,
//     maxWidth: '70%',
//   },
//   label: {
//     fontSize: 12,
//     fontFamily: FONT_FAMILY.normal,
//   },
//   value: {
//     fontSize: 13,
//     fontFamily: FONT_FAMILY.semiBold,
//   },
//   badge: {
//     paddingHorizontal: 10,
//     paddingVertical: 4,
//     borderRadius: 6,
//   },
//   badgeText: {
//     fontSize: 11,
//     fontFamily: FONT_FAMILY.semiBold,
//   },
//   linkText: {
//     fontSize: 13,
//     marginTop: 8,
//     alignSelf: 'flex-end',
//     fontFamily: FONT_FAMILY.semiBold,
//   },
//   right: {
//     alignItems: 'flex-end',
//     marginLeft: 10,
//   },
//   amount: {
//     fontFamily: FONT_FAMILY.bold,
//     fontSize: 15,
//     marginBottom: 6,
//   },
//   check: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     marginTop: 4,
//     marginBottom: 2,
//   },
//   image: {
//     width: 70,
//     height: 70,
//     borderRadius: 10,
//     marginRight: 12,
//   },
//   empty: {
//     textAlign: 'center',
//     marginTop: 40,
//     fontFamily: FONT_FAMILY.normal,
//     fontSize: 15,
//   },
// });
