import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import moment from 'moment';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Dropdown } from 'react-native-element-dropdown';
import { Switch } from 'react-native-paper';
import { useSelector } from 'react-redux';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import Header from '../../components/Header';
import CalendarStrip from '../../components/CalendarStrip';
import BookingHeroCard from '../../components/booking/BookingHeroCard';
import DetailSection from '../../components/booking/DetailSection';
import EmptyStateCard from '../../components/booking/EmptyStateCard';
import AppAlertModal from '../../components/feedback/AppAlertModal';
import { useAppAlert } from '../../hooks/useAppAlert';
import { useAppTheme } from '../../theme/AppThemeProvider';
import { useTee } from '../../services/TeeService';
import { javascriptPost } from '../../util/api';
import { FONT_FAMILY } from '../../util/colors';
import { AppStackParamList } from '../../navigation/AppDrawer';
import { RootState } from '../../store/store';

type Props = NativeStackScreenProps<AppStackParamList, 'Tee'>;

const Tee: React.FC<Props> = ({ navigation }) => {
  const userData = useSelector((state: RootState) => state.auth);
  const { colors } = useAppTheme();
  const { alertState, showAlert, hideAlert } = useAppAlert();
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [session, setSession] = useState<any>({ id: 0 });
  const [hole, setHole] = useState<any>({ id: 0 });
  const [isSwitchEnabled, setIsSwitchEnabled] = useState(false);
  const [tempStartDate, setTempStartDate] = useState(
    moment().add(1, 'days').format('YYYY-MM-DD'),
  );
  const [remainingTime, setRemainingTime] = useState<number | null>(null);
  const [windowStatus, setWindowStatus] = useState<'open' | 'upcoming' | 'closed'>(
    'closed',
  );

  const teeQuery = useTee(userData, tempStartDate, session);
  const data: any = teeQuery.data;
  const normalizedData = useMemo(() => {
    if (!data) {
      return {
        sessions: [],
        holes: [],
        booking_start_time: '06:00',
        hour_before_booking: 0,
        hour_booking_range: 0,
        day_open_booking: 1,
        tee_sheets: [],
      };
    }

    return {
      sessions: data.tee_sessions || [],
      holes: data.tee_holes || [],
      booking_start_time: data.settings?.booking_start_time || '06:00',
      hour_before_booking: data.settings?.hour_before_booking || 0,
      hour_booking_range: data.settings?.hour_booking_range || 0,
      day_open_booking: data.settings?.day_open_booking || 1,
      tee_sheets: data.tee_sheets || [],
    };
  }, [data]);

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(Date.now()), 3000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (seconds: number | null) => {
    if (!seconds && seconds !== 0) {
      return '--:--:--';
    }

    const duration = moment.duration(seconds, 'seconds');
    const h = String(Math.floor(duration.asHours())).padStart(2, '0');
    const m = String(duration.minutes()).padStart(2, '0');
    const s = String(duration.seconds()).padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  const checkBookingWindow = useCallback(() => {
    if (!normalizedData?.booking_start_time) {
      return;
    }

    const now = moment();
    const selectedDay = moment(tempStartDate).format('YYYY-MM-DD');
    const bookingStartMoment = moment(
      `${selectedDay} ${normalizedData.booking_start_time}`,
      'YYYY-MM-DD HH:mm',
    );

    const openTime = bookingStartMoment
      .clone()
      .subtract(Number(normalizedData.hour_before_booking || 0), 'hours');
    const closeTime = openTime
      .clone()
      .add(Number(normalizedData.hour_booking_range || 0), 'hours');

    if (now.isBetween(openTime, closeTime) && normalizedData.tee_sheets.length) {
      setWindowStatus('open');
      setRemainingTime(closeTime.diff(now, 'seconds'));
      return;
    }

    if (now.isBefore(openTime)) {
      setWindowStatus('upcoming');
      setRemainingTime(openTime.diff(now, 'seconds'));
      return;
    }

    setWindowStatus('closed');
    setRemainingTime(null);
  }, [normalizedData, tempStartDate]);

  useEffect(() => {
    checkBookingWindow();
    const timer = setInterval(checkBookingWindow, 15000);
    return () => clearInterval(timer);
  }, [checkBookingWindow]);

  const getStatusInfo = useCallback(
    (item: any) => {
      const now = new Date(currentTime);
      const lockedTill = item?.locked_till
        ? moment(item.locked_till, 'YYYY-MM-DD HH:mm:ss').toDate()
        : null;

      if (item?.is_locked_by_admin == 1) {
        return {
          label: 'Reserved',
          tone: 'danger',
          color: colors.danger,
          backgroundColor: `${colors.danger}16`,
        };
      }

      if (item?.is_booked == 1) {
        return {
          label: 'Booked',
          tone: 'warning',
          color: colors.warning,
          backgroundColor: `${colors.warning}16`,
        };
      }

      if (lockedTill && lockedTill > now && item?.locked_by_user !== userData?.user?.id) {
        return {
          label: 'Under process',
          tone: 'warning',
          color: colors.text,
          backgroundColor: `${colors.text}14`,
        };
      }

      // if (item?.is_active === 0) {
      //   return {
      //     label: 'Inactive',
      //     tone: 'danger',
      //     color: colors.textMuted,
      //     backgroundColor: `${colors.textMuted}18`,
      //   };
      // }

      return {
        label: 'Available',
        tone: 'success',
        color: colors.success,
        backgroundColor: `${colors.success}16`,
      };
    },
    [colors, currentTime, userData?.user?.id],
  );

  const filteredSheets = useMemo(() => {
    let sheets = normalizedData?.tee_sheets || [];

    if (isSwitchEnabled) {
      sheets = sheets.filter((item: any) =>
       {
        return  item.is_booked != 1
        // item.is_active == 1 &&
         }
    );
    }
    if (hole?.id) {
      sheets = sheets.filter((item: any) => item.hole_number === hole.hole_number);
    }

  
    return sheets;
  }, [hole?.hole_number, hole?.id, isSwitchEnabled, normalizedData?.tee_sheets]);

  const analytics = useMemo(() => {
    const source = normalizedData?.tee_sheets || [];

    return source.reduce(
      (acc: any, item: any) => {
        const status = getStatusInfo(item).label;
        if (status === 'Available') acc.available += 1;
        if (status === 'Booked') acc.booked += 1;
        if (status === 'Reserved') acc.adminReserved += 1;
        if (status === 'Under process') acc.locked_by_user += 1;
        return acc;
      },
      { available: 0, booked: 0, adminReserved: 0, locked_by_user: 0 },
    );
  }, [getStatusInfo, normalizedData?.tee_sheets]);
  const handleToBeReserved = useCallback(
    async (item: any) => {
      const response = await javascriptPost({
        path: 'member/lock/tee',
        Token: userData?.token,
        body: {
          session_id: item?.session_id,
          tee_off_hole_id: item?.tee_off_hole_id,
          tee_sheet_id: item?.id,
        },
      });

      if (response?.status) {
        navigation.navigate('TeeBuddies', {
          data: item,
          timer: response?.locked_till,
          refetch: teeQuery.refetch,
          date: tempStartDate,
          session: normalizedData?.sessions?.find((entry: any) => entry.id === item?.session_id),
        });
        return;
      }

      teeQuery.refetch();
      showAlert({
        title: 'Slot unavailable',
        message: response?.message || 'This tee slot is no longer available.',
        tone: 'warning',
      });
    },
    [navigation, normalizedData?.sessions, showAlert, teeQuery, tempStartDate, userData?.token],
  );

  const renderSheet = ({ item }: { item: any }) => {
    const statusInfo = getStatusInfo(item);
    const now = new Date(currentTime);
    const lockedTill = item?.locked_till
      ? moment(item.locked_till, 'YYYY-MM-DD HH:mm:ss').toDate()
      : null;
    const isReservedByOther =
      lockedTill &&
      lockedTill > now &&
      item?.locked_by_user !== userData?.user?.id;
    const canReserve =
      // item?.is_active !== 0 &&
      item?.is_booked !== 1 &&
      item?.is_locked_by_admin !== 1 &&
      !isReservedByOther;

    return (
      <Pressable
        disabled={!canReserve}
        onPress={() => handleToBeReserved(item)}
        style={[
          styles.slotCard,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            opacity: canReserve ? 1 : 0.85,
          },
        ]}
      >
        <View style={styles.slotHeader}>
          <View style={styles.slotIconWrap}>
            <Icon name="golf" size={20} color={colors.placeholder} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.slotTime, { color: colors.text }]}>
              {item?.tee_time}
            </Text>
            <Text style={[styles.slotMeta, { color: colors.textMuted }]}>
              Tee {item?.hole_number} •{' '}
              {normalizedData?.sessions?.find((entry: any) => entry.id === Number(item?.session_id))
                ?.session_name || 'Session'}
            </Text>
          </View>
          <View
            style={[
              styles.statusChip,
              { backgroundColor: statusInfo.backgroundColor },
            ]}
          >
            <Text style={[styles.statusLabel, { color: statusInfo.color }]}>
              {statusInfo.label}
            </Text>
          </View>
        </View>

        <View style={styles.metricRow}>
          <View style={[styles.metricBox, { backgroundColor: colors.surfaceAlt }]}>
            <Text style={[styles.metricValue, { color: colors.text }]}>
              {moment(tempStartDate).format('DD MMM')}
            </Text>
            <Text style={[styles.metricLabel, { color: colors.textMuted }]}>date</Text>
          </View>
          <View style={[styles.metricBox, { backgroundColor: colors.surfaceAlt }]}>
            <Text style={[styles.metricValue, { color: colors.text }]}>
              {item?.tee_off_hole_id || item?.hole_number}
            </Text>
            <Text style={[styles.metricLabel, { color: colors.textMuted }]}>hole</Text>
          </View>
          <View style={[styles.metricBox, { backgroundColor: colors.surfaceAlt }]}>
            <Text style={[styles.metricValue, { color: colors.text }]}>
              {canReserve ? 'Open' : 'Hold'}
            </Text>
            <Text style={[styles.metricLabel, { color: colors.textMuted }]}>action</Text>
          </View>
        </View>

        <Text style={[styles.cardNote, { color: colors.textMuted }]}>
          {canReserve
            ? 'Tap to lock this tee time and choose your buddies.'
            : 'This tee time cannot be reserved right now.'}
        </Text>
      </Pressable>
    );
  };
  const listHeader = (
    <View>
      <BookingHeroCard
        eyebrow="Tee Booking"
        title={moment(tempStartDate).format('ddd, DD MMM')}
        subtitle={
          windowStatus === 'open'
            ? `Window closes in ${formatTime(remainingTime)}`
            : windowStatus === 'upcoming'
            ? `Booking opens in ${formatTime(remainingTime)}`
            : data?.notes || 'Booking window is closed right now.'
        }
        status={windowStatus}
        statusTone={
          windowStatus === 'open'
            ? 'success'
            : windowStatus === 'upcoming'
            ? 'warning'
            : 'danger'
        }
        meta={[
          { label: 'Available', value: String(analytics.available), tone: 'success' },
          { label: 'Booked', value: String(analytics.booked), tone: 'warning' },
          { label: 'Reserved', value: String(analytics.adminReserved), tone: 'danger' },
        ]}
      />

      <DetailSection
        title="Booking Date"
        // subtitle="Filter the tee sheet by day, session, and starting hole."
        delay={40}
      >
        <CalendarStrip
          dayOpenBooking={data?.settings?.day_open_booking || 3}
          selectedDate={tempStartDate}
          onSelectDate={setTempStartDate}
        />

        <View style={styles.filterGrid}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.filterLabel, { color: colors.text }]}>Session</Text>
            <Dropdown
              style={[
                styles.dropdown,
                { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
              ]}
              placeholderStyle={{ color: colors.textMuted, fontFamily: FONT_FAMILY.normal }}
              selectedTextStyle={{ color: colors.text, fontFamily: FONT_FAMILY.semiBold }}
              containerStyle={{
                // backgroundColor: colors.surface,
                borderRadius: 18,
                borderWidth: 1,
                // borderColor: colors.border,
              }}
              itemTextStyle={{ color: colors.primary, fontFamily: FONT_FAMILY.normal }}
              data={[{ id: 0, session_name: 'All Sessions' }, ...(normalizedData?.sessions || [])]}
              maxHeight={260}
              labelField="session_name"
              valueField="id"
              placeholder="Select session"
              value={session?.id ?? 0}
              onChange={item => setSession(item)}
            />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={[styles.filterLabel, { color: colors.text }]}>Hole</Text>
            <Dropdown
              style={[
                styles.dropdown,
                { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
              ]}
              placeholderStyle={{ color: colors.textMuted, fontFamily: FONT_FAMILY.normal }}
              selectedTextStyle={{ color: colors.text, fontFamily: FONT_FAMILY.semiBold }}
              containerStyle={{
                // backgroundColor: colors.surface,
                borderRadius: 18,
                borderWidth: 1,
                borderColor: colors.border,
              }}
              itemTextStyle={{ color: colors.primary, fontFamily: FONT_FAMILY.normal }}
              data={[{ id: 0, hole_number: 'All Holes' }, ...(normalizedData?.holes || [])]}
              maxHeight={260}
              labelField="hole_number"
              valueField="id"
              placeholder="Select hole"
              value={hole?.id ?? 0}
              onChange={item => setHole(item)}
            />
          </View>
        </View>

        <View
          style={[
            styles.switchRow,
            { backgroundColor: colors.surfaceAlt },
          ]}
        >
          <View>
            <Text style={[styles.switchTitle, { color: colors.text }]}>Show active only</Text>
            
          </View>
          <Switch
            value={isSwitchEnabled}
            onValueChange={setIsSwitchEnabled}
            color={colors.primary}
          />
        </View>
      </DetailSection>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header title="Tee Booking">
        <Pressable
          style={[
            styles.headerAction,
            { borderColor: `${colors.onPrimary}35` },
          ]}
          onPress={() => navigation.navigate('Buddies')}
        >
          <Text style={[styles.headerActionLabel, { color: colors.onPrimary }]}>
            Manage Buddies
          </Text>
        </Pressable>
      </Header>

      <FlatList
        data={filteredSheets}
        keyExtractor={item => String(item?.id)}
        renderItem={renderSheet}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={
          teeQuery.isLoading ? null : (
            <EmptyStateCard
              title="No tee sheets found"
              description={
                windowStatus === 'closed'
                  ? data?.notes || 'The booking window is closed for the selected day.'
                  : 'No tee sheets matched the filters you selected.'
              }
            />
          )
        }
        refreshControl={
          <RefreshControl
            refreshing={Boolean(teeQuery.isRefetching)}
            onRefresh={teeQuery.refetch}
            tintColor={colors.text}
          />
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
  headerAction: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  headerActionLabel: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.semiBold,
  },
  listContent: {
    paddingBottom: 24,
  },
  filterGrid: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 14,
  },
  filterLabel: {
    marginBottom: 8,
    fontSize: 13,
    fontFamily: FONT_FAMILY.semiBold,
  },
  dropdown: {
    minHeight: 52,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 14,
  },
  switchRow: {
    marginTop: 14,
    borderRadius: 18,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  switchTitle: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.semiBold,
  },
  switchSubtitle: {
    marginTop: 4,
    fontSize: 12,
    fontFamily: FONT_FAMILY.normal,
    lineHeight: 17,
    maxWidth: 230,
  },
  slotCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 22,
    borderWidth: 1,
    padding: 16,
  },
  slotHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  slotIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(130, 131, 139, 0.08)',
  },
  slotTime: {
    fontSize: 17,
    fontFamily: FONT_FAMILY.bold,
  },
  slotMeta: {
    marginTop: 4,
    fontSize: 12,
    fontFamily: FONT_FAMILY.normal,
  },
  statusChip: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  statusLabel: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.semiBold,
  },
  metricRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
  },
  metricBox: {
    flex: 1,
    borderRadius: 16,
    padding: 12,
  },
  metricValue: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.bold,
  },
  metricLabel: {
    marginTop: 4,
    fontSize: 11,
    textTransform: 'uppercase',
    fontFamily: FONT_FAMILY.normal,
  },
  cardNote: {
    marginTop: 12,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: FONT_FAMILY.normal,
  },
});

export default Tee;
