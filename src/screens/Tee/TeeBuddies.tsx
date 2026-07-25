import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  LayoutAnimation,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import moment from 'moment';
import Icon from 'react-native-vector-icons/Entypo';
import PlusIcon from 'react-native-vector-icons/Ionicons';
import { useQueryClient } from '@tanstack/react-query';
import { useSelector } from 'react-redux';

import Header from '../../components/Header';
import NewButton from '../../components/Button';
import BookingHeroCard from '../../components/booking/BookingHeroCard';
import DetailSection from '../../components/booking/DetailSection';
import EmptyStateCard from '../../components/booking/EmptyStateCard';
import AppAlertModal from '../../components/feedback/AppAlertModal';
import { useAppAlert } from '../../hooks/useAppAlert';
import { useAppTheme } from '../../theme/AppThemeProvider';
import {
  useBuddies,
  userFavoriteGroups,
} from '../../services/TeeService';
import PlayerDetalModal from './PlayerDetalModal';
import { javascriptPost } from '../../util/api';
import { ENDPOINT } from '../../util/constant';
import { FONT_FAMILY } from '../../util/colors';
import { RootState } from '../../store/store';

const filters = [
  { id: 1, name: 'All' },
  { id: 2, name: 'Favorite 4s' },
  { id: 3, name: 'Buddies' },
];

const TeeBuddies = ({ navigation, route }: any) => {
  const userData = useSelector((state: RootState) => state.auth);
  const { colors } = useAppTheme();
  const { alertState, showAlert, hideAlert } = useAppAlert();
  const queryClient = useQueryClient();
  const [buddy, setBuddy] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [timer, setTimer] = useState(Number(route?.params?.timer || 60));
  const [selectedFilter, setSelectedFilter] = useState(1);
  const [debouncedBuddy, setDebouncedBuddy] = useState('');
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedBuddy, setSelectedBuddy] = useState<any[]>([
    {
      id: userData?.user?.id,
      DisplayName: userData?.user?.DisplayName,
      MemberID: userData?.user?.MemberID,
    },
  ]);

  const membersQuery = useBuddies(
    userData,
    route?.params?.data?.session_id,
    debouncedBuddy,
  );
  const groupsQuery = userFavoriteGroups(
    userData?.token,
    route?.params?.data?.session_id,
    debouncedBuddy,
  );

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedBuddy(buddy);
    }, 300);
    return () => clearTimeout(handler);
  }, [buddy]);

  useEffect(() => {
    const existing = route?.params?.data;
    if (existing?.bookingId) {
      setSelectedBuddy(
        [
          {
            id: existing?.player1_id,
            DisplayName: existing?.player1_name,
            MemberID: existing?.player1_member_id,
          },
          {
            id: existing?.player2_id,
            DisplayName: existing?.player2_name,
            MemberID: existing?.player2_member_id,
          },
          {
            id: existing?.player3_id,
            DisplayName: existing?.player3_name,
            MemberID: existing?.player3_member_id,
          },
          {
            id: existing?.player4_id,
            DisplayName: existing?.player4_name,
            MemberID: existing?.player4_member_id,
          },
        ].filter(item => item?.id),
      );
    }
  }, [route?.params?.data]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimer(previous => {
        if (previous <= 1) {
          clearInterval(interval);
          queryClient.invalidateQueries({ queryKey: ['booking'] });
          navigation.goBack();
          return 0;
        }
        return previous - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [navigation, queryClient]);

  const handleRefresh = () => {
    setRefreshing(true);
    Promise.all([membersQuery.refetch(), groupsQuery.refetch()]).finally(() =>
      setRefreshing(false),
    );
  };

  const selectBuddy = useCallback((item: any) => {
    if (!item?.id) {
      return;
    }

    if (selectedBuddy.some(entry => entry?.id === item?.id)) {
      showAlert({
        title: 'Already selected',
        message: 'This buddy is already part of the current tee booking.',
        tone: 'warning',
      });
      return;
    }

    if (selectedBuddy.length >= 4) {
      showAlert({
        title: 'Four players only',
        message: 'You can only reserve up to four players in one tee booking.',
        tone: 'warning',
      });
      return;
    }

    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSelectedBuddy(previous => [...previous, item]);
  }, [selectedBuddy, showAlert]);

  const removeBuddy = (index: number) => {
    if (index === 0) {
      return;
    }

    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSelectedBuddy(previous => previous.filter((_, itemIndex) => itemIndex !== index));
  };

  const reserveSlot = async () => {
    if (selectedBuddy.length < 3) {
      showAlert({
        title: 'More players needed',
        message: 'Please select at least three players before reserving this tee slot.',
        tone: 'warning',
      });
      return;
    }

    const body: any = {
      tee_session_id: route?.params?.data?.session_id,
      tee_booking_id: parseInt(route?.params?.data?.tee_booking_id, 10),
      tee_sheet_id: route?.params?.data?.bookingId
        ? route?.params?.data?.tee_sheet_id
        : route?.params?.data?.id,
      player1_id: selectedBuddy[0]?.id,
      player2_id: selectedBuddy[1]?.id,
      player3_id: selectedBuddy[2]?.id,
      player4_id: selectedBuddy[3]?.id,
    };

    if (route?.params?.data?.bookingId) {
      body.tee_booking_detail_id = route?.params?.data?.id;
    }

    try {
      setLoading(true);
      const response = await javascriptPost({
        Token: userData?.token,
        body,
        path: ENDPOINT.reserve_tee,
      });
      setLoading(false);

      if (response?.status) {
        await route?.params?.refetch?.();
        queryClient.invalidateQueries({ queryKey: ['booking'] });
        navigation.goBack();
        return;
      }

      showAlert({
        title: 'Reservation failed',
        message: response?.message || 'Unable to reserve this tee time right now.',
        tone: 'danger',
      });
    } catch (error) {
      setLoading(false);
      showAlert({
        title: 'Reservation failed',
        message: 'A network issue interrupted the tee booking request.',
        tone: 'danger',
      });
    } finally {
      queryClient.invalidateQueries({ queryKey: ['booking'] });
    }
  };

  const selectedNames = selectedBuddy
    .map(item => item?.DisplayName)
    .filter(Boolean)
    .join(', ');

  const results = useMemo(() => {
    if (selectedFilter === 2) {
      return groupsQuery?.data?.groups || [];
    }

    if (selectedFilter === 3) {
      return groupsQuery?.data?.buddies || [];
    }

    return membersQuery?.data || [];
  }, [groupsQuery?.data?.buddies, groupsQuery?.data?.groups, membersQuery?.data, selectedFilter]);

  const renderBuddy = useCallback(
    ({ item }: { item: any }) => {
      if (selectedBuddy.some(entry => entry?.id === item?.id)) {
        return null;
      }

      return (
        <Pressable
          style={[
            styles.resultCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
          onPress={() => selectBuddy(item)}
        >
          <View style={{ flex: 1 }}>
            <Text style={[styles.resultTitle, { color: colors.text }]}>
              {item?.DisplayName}
            </Text>
            <Text style={[styles.resultMeta, { color: colors.textMuted }]}>
              {item?.MemberID || 'Buddy'}
            </Text>
          </View>
          <PlusIcon name="add" size={20} color={colors.primary} />
        </Pressable>
      );
    },
    [
      colors.border,
      colors.primary,
      colors.surface,
      colors.text,
      colors.textMuted,
      selectBuddy,
      selectedBuddy,
    ],
  );

  const renderGroup = useCallback(
    ({ item }: { item: any }) => (
      <Pressable
        style={[
          styles.groupCard,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
        ]}
        onPress={() => setSelectedBuddy(item?.players || [])}
      >
        <View style={styles.groupHeader}>
          <Text style={[styles.groupTitle, { color: colors.secondary }]}>
            {item?.group_name}
          </Text>
          <PlusIcon name="add" size={20} color={colors.primary} />
        </View>

        {(item?.players || []).map((player: any, index: number) => (
          <View key={`${player?.id || player?.MemberID}-${index}`} style={styles.groupPlayerRow}>
            <Text style={[styles.groupPlayerName, { color: colors.text }]}>
              {index + 1}. {player?.DisplayName}
            </Text>
            <Text style={[styles.groupPlayerMeta, { color: colors.textMuted }]}>
              {player?.MemberID}
            </Text>
          </View>
        ))}
      </Pressable>
    ),
    [colors.border, colors.primary, colors.surface, colors.text, colors.textMuted],
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header title="Select Players">
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
        data={results}
        keyExtractor={(item, index) => String(item?.id || item?.group_name || index)}
        renderItem={selectedFilter === 2 ? renderGroup : renderBuddy}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
        ListHeaderComponent={
          <View>
            <BookingHeroCard
              eyebrow="Tee Reservation"
              title={route?.params?.data?.tee_time || 'Tee time'}
              subtitle={`${moment(route?.params?.date).format('ddd, DD MMM YYYY')} • Hole ${
                route?.params?.data?.hole_number || 'N/A'
              }`}
              status={`${timer}s left`}
              statusTone={timer > 15 ? 'warning' : 'danger'}
              // meta={[
              //   {
              //     label: 'Session',
              //     value: route?.params?.session?.session_name || 'N/A',
              //   },
              //   {
              //     label: 'Players',
              //     value: `${selectedBuddy.length}/4`,
              //   },
              //   {
              //     label: 'Mode',
              //     value: route?.params?.data?.bookingId ? 'Edit' : 'Reserve',
              //   },
              // ]}
            />

            <DetailSection
              title="Selected players"
              // subtitle="Keep a full and valid group before confirming the tee slot."
              delay={40}
            >
              <View style={styles.selectedGrid}>
                {selectedBuddy.map((item, index) => (
                  <View
                    key={`${item?.id || item?.MemberID}-${index}`}
                    style={[
                      styles.selectedCard,
                      {
                        backgroundColor: colors.surfaceAlt,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    {index > 0 ? (
                      <Pressable
                        style={styles.removeIcon}
                        onPress={() => removeBuddy(index)}
                      >
                        <Icon name="circle-with-minus" size={18} color={colors.danger} />
                      </Pressable>
                    ) : null}
                    <Text style={[styles.selectedName, { color: colors.text }]}>
                      {item?.DisplayName}
                    </Text>
                    <Text style={[styles.selectedMeta, { color: colors.textMuted }]}>
                      {item?.MemberID || 'Member'}
                    </Text>
                  </View>
                ))}
              </View>

              <Pressable
                style={[
                  styles.summaryBanner,
                  { backgroundColor: colors.surfaceAlt },
                ]}
                onPress={() => setVisible(true)}
              >
                <View>
                  <Text style={[styles.summaryTitle, { color: colors.text }]}>
                    Player summary
                  </Text>
                  <Text style={[styles.summarySubtitle, { color: colors.textMuted }]}>
                    {selectedNames || 'No players selected yet.'}
                  </Text>
                </View>
                <Icon name="chevron-up" size={18} color={colors.text} />
              </Pressable>
            </DetailSection>

            <DetailSection
              title="Pick from saved players"
              // subtitle="Switch between direct buddy search and your favorite groups."
              delay={70}
            >
              <View style={styles.filterRow}>
                {filters.map(item => {
                  const active = selectedFilter === item.id;
                  return (
                    <Pressable
                      key={item.id}
                      onPress={() => setSelectedFilter(item.id)}
                      style={[
                        styles.filterButton,
                        {
                          backgroundColor: active ? colors.primary : colors.surfaceAlt,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.filterLabel,
                          { color: active ? colors.onPrimary : colors.text },
                        ]}
                      >
                        {item.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {selectedFilter === 1 ? (
                <TextInput
                  value={buddy}
                  onChangeText={setBuddy}
                  cursorColor={colors.primary}
                  style={[
                    styles.searchInput,
                    {
                      backgroundColor: colors.surfaceAlt,
                      borderColor: colors.border,
                      color: colors.text,
                    },
                  ]}
                  placeholderTextColor={colors.textMuted}
                  placeholder="Search buddies by name or member ID"
                />
              ) : null}
            </DetailSection>
          </View>
        }
        ListEmptyComponent={
          membersQuery?.isLoading || groupsQuery?.isLoading ? null : (
            <EmptyStateCard
              title="No saved players found"
              description="Try another filter or manage your buddy list to add more players."
            />
          )
        }
        // ListFooterComponent={
        //   <View
        //     style={[
        //       styles.footer,
        //       {
        //         backgroundColor: colors.surface,
        //         borderColor: colors.border,
        //       },
        //     ]}
        //   >
        //     <View style={{ flex: 1 }}>
        //       <Text style={[styles.footerTitle, { color: colors.text }]}>
        //         {selectedBuddy.length} players selected
        //       </Text>
        //       {/* <Text style={[styles.footerSubtitle, { color: colors.textMuted }]}>
        //         Minimum 3 players required to reserve this tee slot.
        //       </Text> */}
        //     </View>
        //     {selectedBuddy.length >= 3 ? (
        //       <NewButton
        //         loading={loading}
        //         text={route?.params?.data?.bookingId ? 'Update' : 'Reserve'}
        //         onPress={reserveSlot}
        //       />
        //     ) : null}
        //   </View>
        // }
      />
  <View
            style={[
              styles.footer,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                marginBottom:20
              },
            ]}
          >
            <View style={{ flex: 1, }}>
              <Text style={[styles.footerTitle, { color: colors.text }]}>
                {selectedBuddy.length} players selected
              </Text>
              {/* <Text style={[styles.footerSubtitle, { color: colors.textMuted }]}>
                Minimum 3 players required to reserve this tee slot.
              </Text> */}
            </View>
            {selectedBuddy.length >= 3 ? (
              <NewButton
                loading={loading}
                text={route?.params?.data?.bookingId ? 'Update' : 'Reserve'}
                onPress={reserveSlot}
              />
            ) : null}
          </View>
      {visible ? (
        <PlayerDetalModal
          visible={visible}
          onDismiss={() => setVisible(false)}
          buddy={selectedBuddy}
          sessionName={route?.params?.session?.session_name || 'N/A'}
        />
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
  selectedGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  selectedCard: {
    width: '48%',
    borderWidth: 1,
    borderRadius: 18,
    padding: 12,
    minHeight: 88,
    justifyContent: 'center',
  },
  removeIcon: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  selectedName: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.semiBold,
  },
  selectedMeta: {
    marginTop: 4,
    fontSize: 12,
    fontFamily: FONT_FAMILY.normal,
  },
  summaryBanner: {
    marginTop: 14,
    borderRadius: 18,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  summaryTitle: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.semiBold,
  },
  summarySubtitle: {
    marginTop: 4,
    fontSize: 12,
    fontFamily: FONT_FAMILY.normal,
    lineHeight: 17,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterButton: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 11,
    alignItems: 'center',
  },
  filterLabel: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.semiBold,
  },
  searchInput: {
    marginTop: 14,
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 14,
    fontFamily: FONT_FAMILY.normal,
  },
  resultCard: {
    marginHorizontal: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  resultTitle: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.semiBold,
  },
  resultMeta: {
    marginTop: 4,
    fontSize: 12,
    fontFamily: FONT_FAMILY.normal,
  },
  groupCard: {
    marginHorizontal: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  groupTitle: {
    fontSize: 15,
    fontFamily: FONT_FAMILY.bold,
  },
  groupPlayerRow: {
    marginBottom: 8,
  },
  groupPlayerName: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.semiBold,
  },
  groupPlayerMeta: {
    marginTop: 2,
    fontSize: 11,
    fontFamily: FONT_FAMILY.normal,
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
    fontFamily: FONT_FAMILY.normal,
  },
});

export default TeeBuddies;

// import React, { useCallback, useEffect, useMemo, useState } from 'react';
// import {
//   FlatList,
//   LayoutAnimation,
//   Pressable,
//   RefreshControl,
//   StyleSheet,
//   Text,
//   TextInput,
//   View,
// } from 'react-native';
// import moment from 'moment';
// import Icon from 'react-native-vector-icons/Entypo';
// import PlusIcon from 'react-native-vector-icons/Ionicons';
// import { useQueryClient } from '@tanstack/react-query';
// import { useSelector } from 'react-redux';

// import Header from '../../components/Header';
// import NewButton from '../../components/Button';
// import BookingHeroCard from '../../components/booking/BookingHeroCard';
// import DetailSection from '../../components/booking/DetailSection';
// import EmptyStateCard from '../../components/booking/EmptyStateCard';
// import AppAlertModal from '../../components/feedback/AppAlertModal';
// import { useAppAlert } from '../../hooks/useAppAlert';
// import { useAppTheme } from '../../theme/AppThemeProvider';
// import {
//   useBuddies,
//   userFavoriteGroups,
// } from '../../services/TeeService';
// import PlayerDetalModal from './PlayerDetalModal';
// import { javascriptPost } from '../../util/api';
// import { ENDPOINT } from '../../util/constant';
// import { FONT_FAMILY } from '../../util/colors';
// import { RootState } from '../../store/store';

// const filters = [
//   { id: 1, name: 'All' },
//   { id: 2, name: 'Favorite 4s' },
//   { id: 3, name: 'Buddies' },
// ];

// const TeeBuddies = ({ navigation, route }: any) => {
//   const userData = useSelector((state: RootState) => state.auth);
//   const { colors } = useAppTheme();
//   const { alertState, showAlert, hideAlert } = useAppAlert();
//   const queryClient = useQueryClient();
//   const [buddy, setBuddy] = useState('');
//   const [refreshing, setRefreshing] = useState(false);
//   const [timer, setTimer] = useState(Number(route?.params?.timer || 60));
//   const [selectedFilter, setSelectedFilter] = useState(1);
//   const [debouncedBuddy, setDebouncedBuddy] = useState('');
//   const [visible, setVisible] = useState(false);
//   const [loading, setLoading] = useState(false);
//   const [selectedBuddy, setSelectedBuddy] = useState<any[]>([
//     {
//       id: userData?.user?.id,
//       DisplayName: userData?.user?.DisplayName,
//       MemberID: userData?.user?.MemberID,
//     },
//   ]);

//   const membersQuery = useBuddies(
//     userData,
//     route?.params?.data?.session_id,
//     debouncedBuddy,
//   );
//   const groupsQuery = userFavoriteGroups(
//     userData?.token,
//     route?.params?.data?.session_id,
//     debouncedBuddy,
//   );

//   useEffect(() => {
//     const handler = setTimeout(() => {
//       setDebouncedBuddy(buddy);
//     }, 300);
//     return () => clearTimeout(handler);
//   }, [buddy]);

//   useEffect(() => {
//     const existing = route?.params?.data;
//     if (existing?.bookingId) {
//       setSelectedBuddy(
//         [
//           {
//             id: existing?.player1_id,
//             DisplayName: existing?.player1_name,
//             MemberID: existing?.player1_member_id,
//           },
//           {
//             id: existing?.player2_id,
//             DisplayName: existing?.player2_name,
//             MemberID: existing?.player2_member_id,
//           },
//           {
//             id: existing?.player3_id,
//             DisplayName: existing?.player3_name,
//             MemberID: existing?.player3_member_id,
//           },
//           {
//             id: existing?.player4_id,
//             DisplayName: existing?.player4_name,
//             MemberID: existing?.player4_member_id,
//           },
//         ].filter(item => item?.id),
//       );
//     }
//   }, [route?.params?.data]);

//   useEffect(() => {
//     const interval = setInterval(() => {
//       setTimer(previous => {
//         if (previous <= 1) {
//           clearInterval(interval);
//           queryClient.invalidateQueries({ queryKey: ['booking'] });
//           navigation.goBack();
//           return 0;
//         }
//         return previous - 1;
//       });
//     }, 1000);

//     return () => clearInterval(interval);
//   }, [navigation, queryClient]);

//   const handleRefresh = () => {
//     setRefreshing(true);
//     Promise.all([membersQuery.refetch(), groupsQuery.refetch()]).finally(() =>
//       setRefreshing(false),
//     );
//   };

//   const selectBuddy = useCallback((item: any) => {
//     if (!item?.id) {
//       return;
//     }

//     if (selectedBuddy.some(entry => entry?.id === item?.id)) {
//       showAlert({
//         title: 'Already selected',
//         message: 'This buddy is already part of the current tee booking.',
//         tone: 'warning',
//       });
//       return;
//     }

//     if (selectedBuddy.length >= 4) {
//       showAlert({
//         title: 'Four players only',
//         message: 'You can only reserve up to four players in one tee booking.',
//         tone: 'warning',
//       });
//       return;
//     }

//     LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
//     setSelectedBuddy(previous => [...previous, item]);
//   }, [selectedBuddy, showAlert]);

//   const removeBuddy = (index: number) => {
//     if (index === 0) {
//       return;
//     }

//     LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
//     setSelectedBuddy(previous => previous.filter((_, itemIndex) => itemIndex !== index));
//   };

//   const reserveSlot = async () => {
//     if (selectedBuddy.length < 3) {
//       showAlert({
//         title: 'More players needed',
//         message: 'Please select at least three players before reserving this tee slot.',
//         tone: 'warning',
//       });
//       return;
//     }

//     const body: any = {
//       tee_session_id: route?.params?.data?.session_id,
//       tee_booking_id: parseInt(route?.params?.data?.tee_booking_id, 10),
//       tee_sheet_id: route?.params?.data?.bookingId
//         ? route?.params?.data?.tee_sheet_id
//         : route?.params?.data?.id,
//       player1_id: selectedBuddy[0]?.id,
//       player2_id: selectedBuddy[1]?.id,
//       player3_id: selectedBuddy[2]?.id,
//       player4_id: selectedBuddy[3]?.id,
//     };

//     if (route?.params?.data?.bookingId) {
//       body.tee_booking_detail_id = route?.params?.data?.id;
//     }

//     try {
//       setLoading(true);
//       const response = await javascriptPost({
//         Token: userData?.token,
//         body,
//         path: ENDPOINT.reserve_tee,
//       });
//       setLoading(false);

//       if (response?.status) {
//         queryClient.invalidateQueries({ queryKey: ['booking'] });
//         navigation.goBack();
//         return;
//       }

//       showAlert({
//         title: 'Reservation failed',
//         message: response?.message || 'Unable to reserve this tee time right now.',
//         tone: 'danger',
//       });
//     } catch (error) {
//       setLoading(false);
//       showAlert({
//         title: 'Reservation failed',
//         message: 'A network issue interrupted the tee booking request.',
//         tone: 'danger',
//       });
//     } finally {
//       queryClient.invalidateQueries({ queryKey: ['booking'] });
//     }
//   };

//   const selectedNames = selectedBuddy
//     .map(item => item?.DisplayName)
//     .filter(Boolean)
//     .join(', ');

//   const results = useMemo(() => {
//     if (selectedFilter === 2) {
//       return groupsQuery?.data?.groups || [];
//     }

//     if (selectedFilter === 3) {
//       return groupsQuery?.data?.buddies || [];
//     }

//     return membersQuery?.data || [];
//   }, [groupsQuery?.data?.buddies, groupsQuery?.data?.groups, membersQuery?.data, selectedFilter]);

//   const renderBuddy = useCallback(
//     ({ item }: { item: any }) => {
//       if (selectedBuddy.some(entry => entry?.id === item?.id)) {
//         return null;
//       }

//       return (
//         <Pressable
//           style={[
//             styles.resultCard,
//             {
//               backgroundColor: colors.surface,
//               borderColor: colors.border,
//             },
//           ]}
//           onPress={() => selectBuddy(item)}
//         >
//           <View style={{ flex: 1 }}>
//             <Text style={[styles.resultTitle, { color: colors.text }]}>
//               {item?.DisplayName}
//             </Text>
//             <Text style={[styles.resultMeta, { color: colors.textMuted }]}>
//               {item?.MemberID || 'Buddy'}
//             </Text>
//           </View>
//           <PlusIcon name="add" size={20} color={colors.primary} />
//         </Pressable>
//       );
//     },
//     [
//       colors.border,
//       colors.primary,
//       colors.surface,
//       colors.text,
//       colors.textMuted,
//       selectBuddy,
//       selectedBuddy,
//     ],
//   );

//   const renderGroup = useCallback(
//     ({ item }: { item: any }) => (
//       <Pressable
//         style={[
//           styles.groupCard,
//           {
//             backgroundColor: colors.surface,
//             borderColor: colors.border,
//           },
//         ]}
//         onPress={() => setSelectedBuddy(item?.players || [])}
//       >
//         <View style={styles.groupHeader}>
//           <Text style={[styles.groupTitle, { color: colors.primary }]}>
//             {item?.group_name}
//           </Text>
//           <PlusIcon name="add" size={20} color={colors.primary} />
//         </View>

//         {(item?.players || []).map((player: any, index: number) => (
//           <View key={`${player?.id || player?.MemberID}-${index}`} style={styles.groupPlayerRow}>
//             <Text style={[styles.groupPlayerName, { color: colors.text }]}>
//               {index + 1}. {player?.DisplayName}
//             </Text>
//             <Text style={[styles.groupPlayerMeta, { color: colors.textMuted }]}>
//               {player?.MemberID}
//             </Text>
//           </View>
//         ))}
//       </Pressable>
//     ),
//     [colors.border, colors.primary, colors.surface, colors.text, colors.textMuted],
//   );

//   return (
//     <View style={[styles.container, { backgroundColor: colors.background }]}>
//       <Header title="Select Players">
//         <Pressable
//           style={[
//             styles.headerAction,
//             { borderColor: `${colors.onPrimary}35` },
//           ]}
//           onPress={() => navigation.navigate('Buddies')}
//         >
//           <Text style={[styles.headerActionLabel, { color: colors.onPrimary }]}>
//             Manage Buddies
//           </Text>
//         </Pressable>
//       </Header>

//       <FlatList
//         data={results}
//         keyExtractor={(item, index) => String(item?.id || item?.group_name || index)}
//         renderItem={selectedFilter === 2 ? renderGroup : renderBuddy}
//         contentContainerStyle={styles.listContent}
//         refreshControl={
//           <RefreshControl
//             refreshing={refreshing}
//             onRefresh={handleRefresh}
//             tintColor={colors.primary}
//           />
//         }
//         ListHeaderComponent={
//           <View>
//             <BookingHeroCard
//               eyebrow="Tee Reservation"
//               title={route?.params?.data?.tee_time || 'Tee time'}
//               subtitle={`${moment(route?.params?.date).format('ddd, DD MMM YYYY')} • Hole ${
//                 route?.params?.data?.hole_number || 'N/A'
//               }`}
//               status={`${timer}s left`}
//               statusTone={timer > 15 ? 'warning' : 'danger'}
//               meta={[
//                 {
//                   label: 'Session',
//                   value: route?.params?.session?.session_name || 'N/A',
//                 },
//                 {
//                   label: 'Players',
//                   value: `${selectedBuddy.length}/4`,
//                 },
//                 {
//                   label: 'Mode',
//                   value: route?.params?.data?.bookingId ? 'Edit' : 'Reserve',
//                 },
//               ]}
//             />

//             <DetailSection
//               title="Selected players"
//               subtitle="Keep a full and valid group before confirming the tee slot."
//               delay={40}
//             >
//               <View style={styles.selectedGrid}>
//                 {selectedBuddy.map((item, index) => (
//                   <View
//                     key={`${item?.id || item?.MemberID}-${index}`}
//                     style={[
//                       styles.selectedCard,
//                       {
//                         backgroundColor: colors.surfaceAlt,
//                         borderColor: colors.border,
//                       },
//                     ]}
//                   >
//                     {index > 0 ? (
//                       <Pressable
//                         style={styles.removeIcon}
//                         onPress={() => removeBuddy(index)}
//                       >
//                         <Icon name="circle-with-minus" size={18} color={colors.danger} />
//                       </Pressable>
//                     ) : null}
//                     <Text style={[styles.selectedName, { color: colors.text }]}>
//                       {item?.DisplayName}
//                     </Text>
//                     <Text style={[styles.selectedMeta, { color: colors.textMuted }]}>
//                       {item?.MemberID || 'Member'}
//                     </Text>
//                   </View>
//                 ))}
//               </View>

//               <Pressable
//                 style={[
//                   styles.summaryBanner,
//                   { backgroundColor: colors.surfaceAlt },
//                 ]}
//                 onPress={() => setVisible(true)}
//               >
//                 <View>
//                   <Text style={[styles.summaryTitle, { color: colors.text }]}>
//                     Player summary
//                   </Text>
//                   <Text style={[styles.summarySubtitle, { color: colors.textMuted }]}>
//                     {selectedNames || 'No players selected yet.'}
//                   </Text>
//                 </View>
//                 <Icon name="chevron-up" size={18} color={colors.text} />
//               </Pressable>
//             </DetailSection>

//             <DetailSection
//               title="Pick from saved players"
//               subtitle="Switch between direct buddy search and your favorite groups."
//               delay={70}
//             >
//               <View style={styles.filterRow}>
//                 {filters.map(item => {
//                   const active = selectedFilter === item.id;
//                   return (
//                     <Pressable
//                       key={item.id}
//                       onPress={() => setSelectedFilter(item.id)}
//                       style={[
//                         styles.filterButton,
//                         {
//                           backgroundColor: active ? colors.primary : colors.surfaceAlt,
//                         },
//                       ]}
//                     >
//                       <Text
//                         style={[
//                           styles.filterLabel,
//                           { color: active ? colors.onPrimary : colors.text },
//                         ]}
//                       >
//                         {item.name}
//                       </Text>
//                     </Pressable>
//                   );
//                 })}
//               </View>

//               {selectedFilter === 1 ? (
//                 <TextInput
//                   value={buddy}
//                   onChangeText={setBuddy}
//                   cursorColor={colors.primary}
//                   style={[
//                     styles.searchInput,
//                     {
//                       backgroundColor: colors.surfaceAlt,
//                       borderColor: colors.border,
//                       color: colors.text,
//                     },
//                   ]}
//                   placeholderTextColor={colors.textMuted}
//                   placeholder="Search buddies by name or member ID"
//                 />
//               ) : null}
//             </DetailSection>
//           </View>
//         }
//         ListEmptyComponent={
//           membersQuery?.isLoading || groupsQuery?.isLoading ? null : (
//             <EmptyStateCard
//               title="No saved players found"
//               description="Try another filter or manage your buddy list to add more players."
//             />
//           )
//         }
//         ListFooterComponent={
//           <View
//             style={[
//               styles.footer,
//               {
//                 backgroundColor: colors.surface,
//                 borderColor: colors.border,
//               },
//             ]}
//           >
//             <View style={{ flex: 1 }}>
//               <Text style={[styles.footerTitle, { color: colors.text }]}>
//                 {selectedBuddy.length} players selected
//               </Text>
//               <Text style={[styles.footerSubtitle, { color: colors.textMuted }]}>
//                 Minimum 3 players required to reserve this tee slot.
//               </Text>
//             </View>
//             {selectedBuddy.length >= 3 ? (
//               <NewButton
//                 loading={loading}
//                 text={route?.params?.data?.bookingId ? 'Update' : 'Reserve'}
//                 onPress={reserveSlot}
//               />
//             ) : null}
//           </View>
//         }
//       />

//       {visible ? (
//         <PlayerDetalModal
//           visible={visible}
//           onDismiss={() => setVisible(false)}
//           buddy={selectedBuddy}
//           sessionName={route?.params?.session?.session_name || 'N/A'}
//         />
//       ) : null}

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
//   listContent: {
//     paddingBottom: 24,
//   },
//   selectedGrid: {
//     flexDirection: 'row',
//     flexWrap: 'wrap',
//     gap: 10,
//   },
//   selectedCard: {
//     width: '48%',
//     borderWidth: 1,
//     borderRadius: 18,
//     padding: 12,
//     minHeight: 88,
//     justifyContent: 'center',
//   },
//   removeIcon: {
//     position: 'absolute',
//     top: 8,
//     right: 8,
//   },
//   selectedName: {
//     fontSize: 14,
//     fontFamily: FONT_FAMILY.semiBold,
//   },
//   selectedMeta: {
//     marginTop: 4,
//     fontSize: 12,
//     fontFamily: FONT_FAMILY.normal,
//   },
//   summaryBanner: {
//     marginTop: 14,
//     borderRadius: 18,
//     padding: 14,
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     gap: 12,
//   },
//   summaryTitle: {
//     fontSize: 14,
//     fontFamily: FONT_FAMILY.semiBold,
//   },
//   summarySubtitle: {
//     marginTop: 4,
//     fontSize: 12,
//     fontFamily: FONT_FAMILY.normal,
//     lineHeight: 17,
//   },
//   filterRow: {
//     flexDirection: 'row',
//     gap: 8,
//   },
//   filterButton: {
//     flex: 1,
//     borderRadius: 14,
//     paddingVertical: 11,
//     alignItems: 'center',
//   },
//   filterLabel: {
//     fontSize: 12,
//     fontFamily: FONT_FAMILY.semiBold,
//   },
//   searchInput: {
//     marginTop: 14,
//     minHeight: 52,
//     borderRadius: 16,
//     borderWidth: 1,
//     paddingHorizontal: 14,
//     fontSize: 14,
//     fontFamily: FONT_FAMILY.normal,
//   },
//   resultCard: {
//     marginHorizontal: 16,
//     marginBottom: 10,
//     borderWidth: 1,
//     borderRadius: 18,
//     padding: 14,
//     flexDirection: 'row',
//     alignItems: 'center',
//   },
//   resultTitle: {
//     fontSize: 14,
//     fontFamily: FONT_FAMILY.semiBold,
//   },
//   resultMeta: {
//     marginTop: 4,
//     fontSize: 12,
//     fontFamily: FONT_FAMILY.normal,
//   },
//   groupCard: {
//     marginHorizontal: 16,
//     marginBottom: 10,
//     borderWidth: 1,
//     borderRadius: 18,
//     padding: 14,
//   },
//   groupHeader: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     marginBottom: 10,
//   },
//   groupTitle: {
//     fontSize: 15,
//     fontFamily: FONT_FAMILY.bold,
//   },
//   groupPlayerRow: {
//     marginBottom: 8,
//   },
//   groupPlayerName: {
//     fontSize: 13,
//     fontFamily: FONT_FAMILY.semiBold,
//   },
//   groupPlayerMeta: {
//     marginTop: 2,
//     fontSize: 11,
//     fontFamily: FONT_FAMILY.normal,
//   },
//   footer: {
//     marginHorizontal: 16,
//     marginTop: 10,
//     borderWidth: 1,
//     borderRadius: 22,
//     padding: 16,
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 14,
//   },
//   footerTitle: {
//     fontSize: 15,
//     fontFamily: FONT_FAMILY.bold,
//   },
//   footerSubtitle: {
//     marginTop: 4,
//     fontSize: 12,
//     fontFamily: FONT_FAMILY.normal,
//   },
// });

// export default TeeBuddies;
