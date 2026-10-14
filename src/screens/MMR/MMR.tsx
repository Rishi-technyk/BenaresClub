import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { createShimmerPlaceholder } from 'react-native-shimmer-placeholder';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSelector } from 'react-redux';
import moment from 'moment';

import { AppStackParamList } from '../../navigation/AppDrawer';
import Header from '../../components/Header';
import BookingHeroCard from '../../components/booking/BookingHeroCard';
import DetailSection from '../../components/booking/DetailSection';
import EmptyStateCard from '../../components/booking/EmptyStateCard';
import AppAlertModal from '../../components/feedback/AppAlertModal';
import { useAppAlert } from '../../hooks/useAppAlert';
import { javascriptGet, javascriptPost } from '../../util/api';
import { DOMAIN, ENDPOINT } from '../../util/constant';
import { RootState } from '../../store/store';
import { FONT_FAMILY } from '../../util/colors';
import { useAppTheme } from '../../theme/AppThemeProvider';
import RenderHTML from 'react-native-render-html';
import { Checkbox } from 'react-native-paper';

type Props = NativeStackScreenProps<AppStackParamList, 'MMR'>;
type ParticipantType = 'member' | 'spouse' | 'dependent';

type Participant = {
  member_id: string;
  display_name: string;
  mobile?: string | null;
  type: string;
  type_key: ParticipantType;
};

type SettingsProps = {
  mmr_id: string | number;

  charges: number;

  already_registered?: boolean;

  current_day?: number;

  days_remaining?: number;

  is_open?: boolean;

  registration_end_date?: string;

  registration_start_date?: string;

  end_date?: string;

  start_date?: string;

  server_time?: string;

  today?: string;

  total_days?: number;

  reg_message?: string | null;

  window_status?: 'registered' | 'open' | 'closed';

  next_action_label?: string;

  progress_percent?: number;

  description?: string | null;

  allowed_type?: {
    member: number;
    spouse: number;
    dependent: number;
  };

  participants?: Participant[];

  member?: Participant | null;

  spouse?: Participant | null;

  dependents?: Participant[];

  summary?: {
    total_registrations?: number;
    latest_registration_at?: string | null;
    latest_registration_window?: string | null;
  };
};
type HistoryItem = {
  id?: number | string;
  start_date?: string;
  end_date?: string;
  created_at?: string;
  window_label?: string;
  registered_at?: string;
  status_label?: string;
  duration_days?: number;
};

const ShimmerPlaceholder = createShimmerPlaceholder(LinearGradient);

const MMR: React.FC<Props> = () => {
  const userData = useSelector((state: RootState) => state.auth);
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { alertState, hideAlert, showAlert } = useAppAlert();

  const [initialLoading, setInitialLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [settings, setSettings] = useState<SettingsProps | null>(null);

  const [selectedParticipants, setSelectedParticipants] = useState<string[]>(
    [],
  );

  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [page, setPage] = useState(1);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastPage, setLastPage] = useState(1);
  const toggleParticipant = useCallback((memberId: string) => {
    setSelectedParticipants(prev => {
      if (prev.includes(memberId)) {
        return prev.filter(id => id !== memberId);
      }

      return [...prev, memberId];
    });
  }, []);

  const fetchHistory = useCallback(
    async (pageNumber = 1, isRefresh = false) => {
      if (pageNumber > lastPage && !isRefresh) {
        return;
      }

      if (isRefresh) {
        setRefreshing(true);
      } else if (pageNumber > 1) {
        setLoadingMore(true);
      }

      const response = await javascriptGet({
        path: `${ENDPOINT.mmr_history}?page=${pageNumber}`,
        Token: userData?.token,
      });

      if (response?.status) {
        const pagination = response?.data || {};
        const records = Array.isArray(pagination?.data) ? pagination.data : [];

        setLastPage(Number(pagination?.last_page || 1));
        setPage(Number(pagination?.current_page || pageNumber));
        setHistory(prev =>
          pageNumber === 1 ? records : [...prev, ...records],
        );
        return;
      }

      throw new Error(
        response?.message || 'Unable to fetch registration history.',
      );
    },
    [lastPage, userData?.token],
  );

  const fetchMMRSettings = useCallback(async () => {
    const response = await javascriptGet({
      path: ENDPOINT.get_mmr_settings,
      Token: userData?.token,
    });
    console.log( response, '---------------------- response ---------------------');
    if (response?.status === true) {
      setSettings(response.data);
const alreadyRegistered =
    response.data?.alredy_registred_users ?? [];

  if (alreadyRegistered.length > 0) {
    const registeredParticipantIds = alreadyRegistered
      .map((item: any) => item.member_SC_ID)
      .filter(Boolean);

    setSelectedParticipants(registeredParticipantIds);
  } else {
    setSelectedParticipants([]);
  }

      return;
    }

    setSettings(null);
  }, [userData?.token]);

  const loadDashboard = useCallback(
    async (isRefresh = false) => {
      try {
        if (!isRefresh) {
          setInitialLoading(true);
        }

        await Promise.all([fetchMMRSettings(), fetchHistory(1, isRefresh)]);
      } catch (error: any) {
        showAlert({
          title: 'Unable to load window',
          message: error?.message || 'Please try again in a moment.',
          tone: 'danger',
        });
      } finally {
        setInitialLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [fetchHistory, fetchMMRSettings, showAlert],
  );

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const onRefresh = useCallback(() => {
    loadDashboard(true);
  }, [loadDashboard]);

  const loadMore = useCallback(() => {
    if (!loadingMore && page < lastPage) {
      fetchHistory(page + 1)
        .catch(() => {
          showAlert({
            title: 'Unable to load more',
            message: 'More registrations could not be loaded right now.',
            tone: 'warning',
          });
        })
        .finally(() => setLoadingMore(false));
    }
  }, [fetchHistory, lastPage, loadingMore, page, showAlert]);

  // const confirmRegistration = useCallback(() => {
  //   if (!settings?.mmr_id || submitting) {
  //     return;
  //   }

  //   if (!selectedParticipants.length) {
  //     showAlert({
  //       title: 'Select participant',
  //       message: 'Please select at least one participant.',
  //       tone: 'warning',
  //     });

  //     return;
  //   }

  //   showAlert({
  //     title: 'Confirm registration',

  //     message:
  //       `You have selected ${selectedParticipants.length} participant${
  //         selectedParticipants.length > 1 ? 's' : ''
  //       } for registration.\n\n` +
  //       `${moment(settings.start_date).format('DD MMM YYYY')} to ` +
  //       `${moment(settings.end_date).format('DD MMM YYYY')}.`,

  //     tone: 'success',

  //     primaryLabel: 'Register',

  //     secondaryLabel: 'Not now',

  //     onPrimaryPress: async () => {
  //       setSubmitting(true);

  //       try {
  //         const selectedData =
  //           settings.participants?.filter(item =>
  //             selectedParticipants.includes(item.member_id),
  //           ) || [];

  //         const response = await javascriptPost({
  //           path: ENDPOINT.register_mmr_member,

  //           Token: userData?.token,

  //           body: {
  //             mmr_id: settings.mmr_id,

  //             participants: selectedData.map(item => ({
  //               member_id: item.member_id,
  //               type: item.type_key,
  //             })),
  //           },
  //         });

  //         if (response?.status === true) {
  //           setSelectedParticipants([]);

  //           await loadDashboard(true);

  //           showAlert({
  //             title: 'Registration successful',

  //             message: response?.message || 'Your registration is confirmed.',

  //             tone: 'success',
  //           });

  //           return;
  //         }

  //         showAlert({
  //           title: 'Registration unavailable',

  //           message:
  //             response?.message || 'Registration could not be completed.',

  //           tone: 'warning',
  //         });
  //       } catch (error) {
  //         showAlert({
  //           title: 'Registration failed',

  //           message: 'Something went wrong while saving your registration.',

  //           tone: 'danger',
  //         });
  //       } finally {
  //         setSubmitting(false);
  //       }
  //     },
  //   });
  // }, [
  //   settings,
  //   submitting,
  //   selectedParticipants,
  //   showAlert,
  //   userData?.token,
  //   loadDashboard,
  // ]);


  const confirmRegistration = useCallback(() => {
  if (!settings?.mmr_id || submitting) {
    return;
  }

  /*
  |--------------------------------------------------------------------------
  | MUST SELECT AT LEAST ONE
  |--------------------------------------------------------------------------
  */

  if (!selectedParticipants.length) {
    showAlert({
      title: 'Select participant',
      message: 'Please select at least one participant.',
      tone: 'warning',
    });

    return;
  }

  const isUpdate =
    settings?.alredy_registred_users?.length > 0;

  showAlert({
    title: isUpdate
      ? 'Confirm update'
      : 'Confirm registration',

    message:
      `You have selected ${selectedParticipants.length} participant${
        selectedParticipants.length > 1 ? 's' : ''
      } for registration.\n\n` +
      `${moment(settings.start_date).format('DD MMM YYYY')} to ` +
      `${moment(settings.end_date).format('DD MMM YYYY')}.`,

    tone: 'success',

    primaryLabel: isUpdate
      ? 'Update Registration'
      : 'Register',

    secondaryLabel: 'Not now',

    onPrimaryPress: async () => {

      setSubmitting(true);

      try {

        const selectedData =
          settings.participants?.filter(item =>
            selectedParticipants.includes(item.member_id),
          ) || [];

        const response = await javascriptPost({

          path: isUpdate
            ? ENDPOINT.update_mmr_member
            : ENDPOINT.register_mmr_member,

          Token: userData?.token,

          body: {

            mmr_id: settings.mmr_id,

            participants: selectedData.map(item => ({
              member_id: item.member_id,
              type: item.type_key,
            })),

          },

        });

        if (response?.status === true) {

          await loadDashboard(true);

          showAlert({

            title: isUpdate
              ? 'Registration updated'
              : 'Registration successful',

            message:
              response?.message ||
              (
                isUpdate
                  ? 'Your registration has been updated successfully.'
                  : 'Your registration is confirmed.'
              ),

            tone: 'success',

          });

          return;
        }

        showAlert({

          title: isUpdate
            ? 'Update unavailable'
            : 'Registration unavailable',

          message:
            response?.message ||
            'Registration could not be completed.',

          tone: 'warning',

        });

      } catch (error) {

        showAlert({

          title: isUpdate
            ? 'Update failed'
            : 'Registration failed',

          message:
            'Something went wrong while saving your registration.',

          tone: 'danger',

        });

      } finally {

        setSubmitting(false);

      }
    },
  });

}, [
  settings,
  submitting,
  selectedParticipants,
  showAlert,
  userData?.token,
  loadDashboard,
]);
  const handleCancelRegistration = (bookingId: number) => {
    Alert.alert(
      'Cancel Registration',
      'Are you sure you want to cancel this registration?',
      [
        {
          text: 'No',
          style: 'cancel',
        },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: () => cancelRegistration(bookingId),
        },
      ],
    );
  };

  const cancelRegistration = async (bookingId: number) => {
    try {
      const response = await javascriptPost({
        path: `member/mmr/cancel-registration`,
        body: {
          booking_id: bookingId,
        },
        Token: userData?.token,
      });
      console.log(
        response,
        '---------------------- response ---------------------',
      );
      if (response?.status) {
        Alert.alert(
          'Success',
          response.message || 'Registration cancelled successfully.',
        );

        // Refresh history
        await fetchHistory();
        await fetchMMRSettings();
      } else {
        Alert.alert(
          'Error',
          response?.message || 'Unable to cancel registration.',
        );
      }
    } catch (error: any) {
      console.log('Cancel Registration Error:', error?.response?.data || error);

      Alert.alert(
        'Error',
        error?.response?.data?.message ||
          'Something went wrong while cancelling registration.',
      );
    } finally {
    }
  };
  const { width: SCREEN_WIDTH } = Dimensions.get('window');

 const renderHistoryItem = ({
  item,
}: {
  item: HistoryItem;
}) => {
  const participants = Array.isArray(item?.participants)
    ? item.participants
    : [];

  /*
  |--------------------------------------------------------------------------
  | Check cancelled
  |--------------------------------------------------------------------------
  */

  const isCancelled =
    String(item?.status || '').toLowerCase() === 'cancelled';


  /*
  |--------------------------------------------------------------------------
  | Check registration window ended
  |--------------------------------------------------------------------------
  */

  const isDatePassed = moment()
    .isAfter(moment(item?.end_date).endOf('day'));


  /*
  |--------------------------------------------------------------------------
  | Cancel allowed only when:
  |
  | 1. Not cancelled
  | 2. Registration window has not ended
  |--------------------------------------------------------------------------
  */

  const canCancel =
    !isCancelled &&
    !isDatePassed;


  return (
    <View style={styles.historyCard}>

      {/* =========================================================
          HEADER
      ========================================================= */}

      <View style={styles.historyHeader}>

        <View style={styles.historyIconWrap}>
          <Icon
            name="calendar-check-outline"
            size={20}
            color={colors.text}
          />
        </View>


        <View style={styles.flexOne}>

          <Text style={styles.historyTitle}>
            {item?.window_label ||
              `${moment(item?.start_date).format(
                'DD MMM',
              )} - ${moment(item?.end_date).format(
                'DD MMM YYYY',
              )}`}
          </Text>


          <Text style={styles.historySubtitle}>
            {item?.registered_at ||
              `Registered on ${moment(
                item?.created_at,
              ).format(
                'DD MMM YYYY, hh:mm A',
              )}`}
          </Text>


          {/* Booking Number */}

          {!!item?.booking_no && (
            <Text style={styles.historySubtitle}>
              Booking No: {item.booking_no}
            </Text>
          )}

        </View>


        {/* Status */}

        <View style={styles.historyBadge}>

          <Text style={styles.historyBadgeText}>
            {item?.status || 'Registered'}
          </Text>

        </View>

      </View>


      {/* =========================================================
          PARTICIPANTS
      ========================================================= */}

      <View
        style={[
          styles.historyCard,
          {
            marginTop: 10,
          },
        ]}
      >

        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 8,
          }}
        >

          <Text style={styles.historyBadgeText}>
            Participants
          </Text>


          {/* {!!item?.participant_count && (
            <Text style={styles.historyBadgeText}>
              {item.participant_count}
            </Text>
          )} */}

        </View>


        {participants.length > 0 ? (

          participants.map(
            (participant, index) => (

              <View
                key={`${participant.member_id}-${index}`}
                style={{
                  marginBottom: 10,
                }}
              >

                <Text
                  style={[
                    styles.historyBadgeText,
                    {
                      marginBottom: 3,
                    },
                  ]}
                >
                  {index + 1}.{' '}
                  {participant.display_name}
                </Text>


                <Text
                  style={[
                    styles.historyBadgeText,
                    {
                      opacity: 0.7,
                      fontSize: 12,
                    },
                  ]}
                >
                  {participant.member_id}
                  {' • '}
                  {participant.type
                    ? participant.type
                        .charAt(0)
                        .toUpperCase() +
                      participant.type.slice(1)
                    : ''}
                </Text>

              </View>
            ),
          )

        ) : (

          <Text style={styles.historyBadgeText}>
            No participants found
          </Text>

        )}

      </View>


      {/* =========================================================
          CANCEL BUTTON
      ========================================================= */}

      {canCancel && (

        <TouchableOpacity
          activeOpacity={0.8}
          style={styles.cancelRegistrationButton}
          onPress={() =>
            handleCancelRegistration(item.id)
          }
        >

          <Icon
            name="close-circle-outline"
            size={20}
            color="#fff"
          />

          <Text style={styles.cancelRegistrationText}>
            Cancel Registration
          </Text>

        </TouchableOpacity>

      )}

    </View>
  );
};

  const renderHistorySkeleton = () => (
    <View style={styles.historySkeletonWrap}>
      {[1, 2, 3].map(item => (
        <View key={item} style={styles.historyCard}>
          <View style={styles.historyHeader}>
            <ShimmerPlaceholder style={styles.historyIconWrap} />
            <View style={styles.flexOne}>
              <ShimmerPlaceholder style={styles.lineSkeletonWide} />
              <ShimmerPlaceholder style={styles.lineSkeletonMedium} />
            </View>
          </View>
        </View>
      ))}
    </View>
  );

  const ParticipantCheckbox = ({
    participant,
    selected,
    onPress,
    styles,
    colors,
  }: {
    participant: Participant;
    selected: boolean;
    onPress: () => void;
    styles: ReturnType<typeof createStyles>;
    colors: any;
  }) => {
    return (
      <Pressable
        onPress={onPress}
        style={[
          styles.participantCard,
          selected && styles.participantCardSelected,
        ]}
      >
        <Checkbox
          color={'red'}
          status={selected ? 'checked' : 'unchecked'}
          theme={{
            colors: {
              primary: 'blue',
              backdrop: 'red',
              secondary: 'blue',
              background: 'red',
            },
          }}
        />

        <View style={styles.participantInfo}>
          <Text style={styles.participantName}>{participant.display_name}</Text>

          <Text style={styles.participantType}>
            {participant.type}
            {participant.mobile ? ` • ${participant.mobile}` : ''}
          </Text>
        </View>
      </Pressable>
    );
  };

  
  return (
    <View style={styles.screen}>
      <Header title="Registration" />

      <FlatList
        data={history}
        keyExtractor={(item, index) => `${item?.id || 'mmr'}-${index}`}
        renderItem={renderHistoryItem}
        onEndReached={loadMore}
        onEndReachedThreshold={0.45}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        ListHeaderComponent={
          <View>
            {settings?.image && (
              <Image
                source={{ uri: `${DOMAIN.IMG}${settings?.image}` }}
                width={SCREEN_WIDTH}
                height={200}
                style={{
                  borderRadius: 10,
                  marginTop: 10,
                  resizeMode: 'stretch',
                }}
              />
            )}
            {settings?.description ? (
              <View style={styles?.descriptionCard}>
                <Text style={styles?.descriptionTitle}>{settings.title}</Text>

                <RenderHTML
                  contentWidth={SCREEN_WIDTH - 70}
                  source={{
                    html: settings.description,
                  }}
                  baseStyle={{
                    color: colors.text,
                    fontSize: 13,
                    lineHeight: 21,
                  }}
                />
              </View>
            ) : null}
            {initialLoading ? (
              <View style={styles.sectionCard}>
                <ShimmerPlaceholder style={styles.lineSkeletonWide} />
                <ShimmerPlaceholder style={styles.lineSkeletonMedium} />
                <ShimmerPlaceholder style={styles.ctaSkeleton} />
              </View>
            ) : settings ? (
              <View style={styles.sectionCard}>
            {settings.charges>0&&      <Text
                  style={{
                    backgroundColor: colors.surfaceAlt,
                    color: colors.text,
                    padding: 15,
                    borderRadius: 10,
                    margin: 5,
                    
                  }}
                >
                Charges:  <Text style={{fontFamily:FONT_FAMILY.bold}}>₹{Number(settings.charges).toFixed(2)}</Text>
                </Text>}
                <View style={styles.summaryGrid}>
                  <SummaryCard
                    icon="calendar-start"
                    label="Event Starts"
                    value={moment(settings.start_date).format('DD MMM YYYY')}
                    styles={styles}
                    color={colors.primary}
                  />
                  <SummaryCard
                    icon="calendar-end"
                    label="Event Ends"
                    value={moment(settings.end_date).format('DD MMM YYYY')}
                    styles={styles}
                    color={colors.primary}
                  />
                </View>
              
                {settings?.is_open &&
                  !settings.already_registered &&
                  settings.participants &&
                  settings.participants.length > 0 && (
                    <View style={styles.participantSection}>
                      <Text style={styles.participantSectionTitle}>
                        Select Participants
                      </Text>

                      {settings.participants.map(participant => (
                        <ParticipantCheckbox
                          key={participant.member_id}
                          participant={participant}
                          selected={selectedParticipants.includes(
                            participant.member_id,
                          )}
                          onPress={() =>
                            toggleParticipant(participant.member_id)
                          }
                          styles={styles}
                          colors={colors}
                        />
                      ))}
                    </View>
                  )}
               

                <Pressable
                  disabled={
                    !settings.is_open ||
                    settings.already_registered ||
                    submitting
                  }
                  onPress={confirmRegistration}
                  style={[
                    styles.primaryButton,
                    (!settings.is_open ||
                      settings.already_registered ||
                      submitting) &&
                      styles.primaryButtonDisabled,
                  ]}
                >
                  {submitting ? (
                    <ActivityIndicator
                      size="small"
                      color={colors.text}
                      style={styles.loadingSpinner}
                    />
                  ) : (
                    <Icon
                      name="check-circle-outline"
                      size={18}
                      color={colors.text}
                      style={styles.buttonIcon}
                    />
                  )}
                  <Text style={styles.primaryButtonLabel}>
                    {settings.next_action_label || 'Register now'}
                  </Text>
                </Pressable>
              </View>
            ) : (
              <DetailSection title="Current Window" delay={40}>
                <EmptyStateCard
                  title="Registration not started"
                  description="Once the next MMR window is configured on the backend, the registration CTA will appear here."
                />
              </DetailSection>
            )}

            <DetailSection title="Registration History" delay={80}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionHeaderTitle}>Past Windows</Text>
                <Text style={styles.sectionHeaderCount}>
                  {history.length} loaded
                </Text>
              </View>
            </DetailSection>
          </View>
        }
        ListEmptyComponent={
          initialLoading ? (
            renderHistorySkeleton()
          ) : (
            <EmptyStateCard
              title="No previous registrations"
              description="Your registration history will appear here after your first successful registration."
            />
          )
        }
        ListFooterComponent={
          loadingMore ? (
            <ActivityIndicator
              size="small"
              color={colors.primary}
              style={styles.footerLoader}
            />
          ) : (
            <View style={styles.footerSpace} />
          )
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      <AppAlertModal
        visible={alertState.visible}
        title={alertState.title}
        message={alertState.message}
        tone={alertState.tone}
        primaryLabel={alertState.primaryLabel}
        secondaryLabel={alertState.secondaryLabel}
        onPrimaryPress={() => {
          alertState.onPrimaryPress?.();
          hideAlert();
        }}
        onSecondaryPress={() => {
          alertState.onSecondaryPress?.();
          hideAlert();
        }}
        onDismiss={hideAlert}
      />
    </View>
  );
};

const SummaryCard = ({
  icon,
  label,
  value,
  styles,
  color,
}: {
  icon: string;
  label: string;
  value: string;
  styles: ReturnType<typeof createStyles>;
  color: string;
}) => (
  <View style={styles.summaryCard}>
    {/* <Icon name={icon} size={18} color={color} /> */}
    <Text style={styles.summaryLabel}>{label}</Text>
    <Text numberOfLines={2} style={styles.summaryValue}>
      {value}
    </Text>
  </View>
);

const MetaChip = ({
  label,
  styles,
}: {
  label: string;
  styles: ReturnType<typeof createStyles>;
}) => (
  <View style={styles.metaChip}>
    <Text style={styles.metaChipLabel}>{label}</Text>
  </View>
);

const createStyles = (colors: any) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },
    participantSection: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderWidth: 0.5,
      padding: 10,
      borderRadius: 10,
      marginTop: 10,
    },
    participantSectionTitle: {
      fontFamily: FONT_FAMILY.bold,
      color: colors.text,
      fontSize: 18,
      marginBottom: 10,
    },

    descriptionTitle: {
      fontFamily: FONT_FAMILY.bold,
      color: colors.text,
      fontSize: 18,
      marginBottom: 10,
    },
    descriptionCard: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderWidth: 0.5,
      padding: 10,
      borderRadius: 10,
      margin: 16,
      marginTop: 5,
    },
    listContent: {
      paddingBottom: 30,
    },
    flexOne: {
      flex: 1,
    },
    sectionCard: {
      backgroundColor: colors.surface,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 18,
      marginHorizontal: 20,
    },
    summaryGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    summaryCard: {
      width: '47%',
      backgroundColor: colors.surfaceAlt,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      // minHeight: 112,
    },
    summaryLabel: {
      // marginTop: 10,
      color: colors.textMuted,
      fontFamily: FONT_FAMILY.medium,
      fontSize: 12,
    },
    summaryValue: {
      // marginTop: 8,
      color: colors.text,
      fontFamily: FONT_FAMILY.bold,
      fontSize: 14,
      lineHeight: 18,
    },
    messageCard: {
      marginTop: 16,
      borderRadius: 18,
      padding: 16,
      backgroundColor: `${colors.primary}10`,
      borderWidth: 1,
      borderColor: `${colors.primary}25`,
    },
    messageTitle: {
      color: colors.text,
      fontFamily: FONT_FAMILY.bold,
      fontSize: 15,
    },
    messageText: {
      marginTop: 8,
      color: colors.textMuted,
      fontFamily: FONT_FAMILY.normal,
      fontSize: 13,
      lineHeight: 20,
    },
    primaryButton: {
      marginTop: 18,
      minHeight: 50,
      borderRadius: 18,
      backgroundColor: colors.secondary,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
    },
    primaryButtonDisabled: {
      opacity: 0.5,
    },
    primaryButtonLabel: {
      color: colors.text,
      fontFamily: FONT_FAMILY.semiBold,
      fontSize: 14,
    },
    loadingSpinner: {
      marginRight: 10,
    },
    buttonIcon: {
      marginRight: 8,
    },
    sectionHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: -6,
    },
    sectionHeaderTitle: {
      color: colors.text,
      fontFamily: FONT_FAMILY.bold,
      fontSize: 16,
    },
    sectionHeaderCount: {
      color: colors.textMuted,
      fontFamily: FONT_FAMILY.medium,
      fontSize: 12,
    },
    historyCard: {
      marginHorizontal: 16,
      marginBottom: 12,
      padding: 16,
      borderRadius: 22,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    historyHeader: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    historyIconWrap: {
      width: 44,
      height: 44,
      borderRadius: 14,
      backgroundColor: colors.surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    historyTitle: {
      color: colors.text,
      fontFamily: FONT_FAMILY.bold,
      fontSize: 15,
    },
    historySubtitle: {
      marginTop: 4,
      color: colors.textMuted,
      fontFamily: FONT_FAMILY.normal,
      fontSize: 12,
    },
    historyBadge: {
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderRadius: 999,
      backgroundColor: colors.surfaceAlt,
      borderWidth: 1,
      borderColor: colors.border,
    },
    historyBadgeText: {
      color: colors.text,
      fontFamily: FONT_FAMILY.medium,
      fontSize: 11,
    },
    cancelRegistrationButton: {
      marginTop: 14,
      height: 46,
      borderRadius: 8,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: '#D32F2F',
    },

    cancelRegistrationText: {
      fontSize: 14,
      fontWeight: '600',
      color: '#fff',
    },
    historyMetaRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 14,
    },
    metaChip: {
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderRadius: 999,
      backgroundColor: colors.surfaceAlt,
    },
    metaChipLabel: {
      color: colors.textMuted,
      fontFamily: FONT_FAMILY.medium,
      fontSize: 11,
    },
    footerLoader: {
      marginVertical: 12,
    },
    footerSpace: {
      height: 12,
    },
    historySkeletonWrap: {
      paddingHorizontal: 16,
    },
    lineSkeletonWide: {
      width: '74%',
      height: 16,
      borderRadius: 8,
      marginBottom: 10,
    },
    lineSkeletonMedium: {
      width: '46%',
      height: 14,
      borderRadius: 8,
    },
    ctaSkeleton: {
      width: '100%',
      height: 50,
      borderRadius: 18,
      marginTop: 18,
    },
    participantCard: {
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderRadius: 10,
      margin: 10,
      backgroundColor: colors.surfaceAlt,
      flexDirection: 'row',
      alignItems: 'center',
    },
    participantCardSelected: {
      backgroundColor: colors.success,
    },
    participantInfo: {
      color: colors.text,
    },
    participantName: {
      color: colors.text,
      fontFamily:FONT_FAMILY.bold
    },
    participantType: {
      color: colors.text,
    },
  });

export default MMR;
