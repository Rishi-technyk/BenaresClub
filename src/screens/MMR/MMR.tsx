import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
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
import { ENDPOINT } from '../../util/constant';
import { RootState } from '../../store/store';
import { FONT_FAMILY } from '../../util/colors';
import { useAppTheme } from '../../theme/AppThemeProvider';

type Props = NativeStackScreenProps<AppStackParamList, 'MMR'>;

type SettingsProps = {
  mmr_id: string | number;
  already_registered?: boolean;
  current_day?: number;
  days_remaining?: number;
  is_open?: boolean;
  registration_end?: string;
  registration_start?: string;
  server_time?: string;
  today?: string;
  total_days?: number;
  reg_message?: string | null;
  window_status?: 'registered' | 'open' | 'closed';
  next_action_label?: string;
  progress_percent?: number;
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
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [page, setPage] = useState(1);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastPage, setLastPage] = useState(1);

  const fetchHistory = useCallback(async (pageNumber = 1, isRefresh = false) => {
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
      setHistory(prev => (pageNumber === 1 ? records : [...prev, ...records]));
      return;
    }

    throw new Error(response?.message || 'Unable to fetch registration history.');
  }, [lastPage, userData?.token]);

  const fetchMMRSettings = useCallback(async () => {
    const response = await javascriptGet({
      path: ENDPOINT.get_mmr_settings,
      Token: userData?.token,
    });

    if (response?.status === true) {
      setSettings(response.data);
      return;
    }

    setSettings(null);
  }, [userData?.token]);

  const loadDashboard = useCallback(async (isRefresh = false) => {
    try {
      if (!isRefresh) {
        setInitialLoading(true);
      }

      await Promise.all([
        fetchMMRSettings(),
        fetchHistory(1, isRefresh),
      ]);
    } catch (error: any) {
      showAlert({
        title: 'Unable to load MMR',
        message: error?.message || 'Please try again in a moment.',
        tone: 'danger',
      });
    } finally {
      setInitialLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [fetchHistory, fetchMMRSettings, showAlert]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const onRefresh = useCallback(() => {
    loadDashboard(true);
  }, [loadDashboard]);

  const loadMore = useCallback(() => {
    if (!loadingMore && page < lastPage) {
      fetchHistory(page + 1).catch(() => {
        showAlert({
          title: 'Unable to load more',
          message: 'More registrations could not be loaded right now.',
          tone: 'warning',
        });
      }).finally(() => setLoadingMore(false));
    }
  }, [fetchHistory, lastPage, loadingMore, page, showAlert]);

  const confirmRegistration = useCallback(() => {
    if (!settings?.mmr_id || submitting) {
      return;
    }

    showAlert({
      title: 'Confirm registration',
      message: `Register for the current MMR window from ${moment(settings.registration_start).format('DD MMM')} to ${moment(settings.registration_end).format('DD MMM YYYY')}?`,
      tone: 'info',
      primaryLabel: 'Register',
      secondaryLabel: 'Not now',
      onPrimaryPress: async () => {
        setSubmitting(true);

        try {
          const response = await javascriptPost({
            path: ENDPOINT.register_mmr_member,
            Token: userData.token,
            body: {
              mmr_id: settings.mmr_id,
            },
          });

          if (response?.status === true) {
            await loadDashboard(true);
            showAlert({
              title: 'Registration successful',
              message: response?.message || 'Your MMR registration is confirmed.',
              tone: 'success',
            });
            return;
          }

          showAlert({
            title: 'Registration unavailable',
            message: response?.message || 'Registration could not be completed.',
            tone: 'warning',
          });
        } catch (error) {
          showAlert({
            title: 'Registration failed',
            message: 'Something went wrong while saving your registration.',
            tone: 'danger',
          });
        } finally {
          setSubmitting(false);
        }
      },
    });
  }, [settings, showAlert, submitting, userData.token, loadDashboard]);

  const heroStatus = useMemo(() => {
    if (!settings) {
      return {
        label: 'Not configured',
        tone: 'warning' as const,
        subtitle: 'The current MMR registration window is not active yet.',
      };
    }

    if (settings.window_status === 'registered') {
      return {
        label: 'Registered',
        tone: 'success' as const,
        subtitle: settings.reg_message || 'You are already registered for this window.',
      };
    }

    if (settings.is_open) {
      return {
        label: 'Open now',
        tone: 'neutral' as const,
        subtitle: 'Registration is live for the current MMR window.',
      };
    }

    return {
      label: 'Closed',
      tone: 'warning' as const,
      subtitle: 'Registration is currently unavailable for this window.',
    };
  }, [settings]);

  const renderHistoryItem = ({ item }: { item: HistoryItem }) => (
    <View style={styles.historyCard}>
      <View style={styles.historyHeader}>
        <View style={styles.historyIconWrap}>
          <Icon name="calendar-check-outline" size={20} color={colors.primary} />
        </View>
        <View style={styles.flexOne}>
          <Text style={styles.historyTitle}>
            {item.window_label || `${moment(item?.start_date).format('DD MMM')} - ${moment(item?.end_date).format('DD MMM YYYY')}`}
          </Text>
          <Text style={styles.historySubtitle}>
            {item.registered_at || `Registered on ${moment(item?.created_at).format('DD MMM YYYY, hh:mm A')}`}
          </Text>
        </View>
        <View style={styles.historyBadge}>
          <Text style={styles.historyBadgeText}>{item.status_label || 'Registered'}</Text>
        </View>
      </View>

      <View style={styles.historyMetaRow}>
        <MetaChip label={`${item.duration_days || 1} day window`} styles={styles} />
        <MetaChip
          label={moment(item?.start_date).isSame(moment(), 'month') ? 'This month' : moment(item?.start_date).format('MMM YYYY')}
          styles={styles}
        />
      </View>
    </View>
  );

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

  return (
    <View style={styles.screen}>
      <Header title="MMR Registration" />

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
            <BookingHeroCard
              eyebrow="Member Registration"
              title="MMR Window"
              subtitle={heroStatus.subtitle}
              status={heroStatus.label}
              statusTone={heroStatus.tone}
              meta={[
                {
                  label: 'Current Day',
                  value: String(settings?.current_day || 0),
                },
                {
                  label: 'Days Left',
                  value: String(settings?.days_remaining || 0),
                },
                {
                  label: 'Past Registrations',
                  value: String(settings?.summary?.total_registrations || history.length),
                },
              ]}
            />

            {initialLoading ? (
              <View style={styles.sectionCard}>
                <ShimmerPlaceholder style={styles.lineSkeletonWide} />
                <ShimmerPlaceholder style={styles.lineSkeletonMedium} />
                <ShimmerPlaceholder style={styles.ctaSkeleton} />
              </View>
            ) : settings ? (
              <DetailSection
                title="Current Window"
                subtitle="Registration dates, progress, and your member status for the active MMR cycle."
                delay={40}
              >
                <View style={styles.sectionCard}>
                  <View style={styles.summaryGrid}>
                    <SummaryCard
                      icon="calendar-start"
                      label="Starts"
                      value={moment(settings.registration_start).format('DD MMM YYYY')}
                      styles={styles}
                      color={colors.primary}
                    />
                    <SummaryCard
                      icon="calendar-end"
                      label="Ends"
                      value={moment(settings.registration_end).format('DD MMM YYYY')}
                      styles={styles}
                      color={colors.primary}
                    />
                    <SummaryCard
                      icon="progress-clock"
                      label="Progress"
                      value={`${settings.progress_percent || 0}%`}
                      styles={styles}
                      color={colors.primary}
                    />
                    <SummaryCard
                      icon="history"
                      label="Latest"
                      value={
                        settings.summary?.latest_registration_window ||
                        'No past registrations'
                      }
                      styles={styles}
                      color={colors.primary}
                    />
                  </View>

                  <View style={styles.messageCard}>
                    <Text style={styles.messageTitle}>
                      {settings.already_registered
                        ? 'Registration already confirmed'
                        : settings.is_open
                        ? 'Ready to register'
                        : 'Window not available'}
                    </Text>
                    <Text style={styles.messageText}>
                      {settings.reg_message ||
                        (settings.is_open
                          ? 'You can submit your MMR registration for the active window from this screen.'
                          : 'Please wait for the next configured registration window.')}
                    </Text>
                  </View>

                  <Pressable
                    disabled={!settings.is_open || settings.already_registered || submitting}
                    onPress={confirmRegistration}
                    style={[
                      styles.primaryButton,
                      (!settings.is_open || settings.already_registered || submitting) && styles.primaryButtonDisabled,
                    ]}
                  >
                    {submitting ? (
                      <ActivityIndicator size="small" color={colors.onPrimary} style={styles.loadingSpinner} />
                    ) : (
                      <Icon name="check-circle-outline" size={18} color={colors.onPrimary} style={styles.buttonIcon} />
                    )}
                    <Text style={styles.primaryButtonLabel}>
                      {settings.next_action_label || 'Register now'}
                    </Text>
                  </Pressable>
                </View>
              </DetailSection>
            ) : (
              <DetailSection
                title="Current Window"
                subtitle="The backend has not published an active MMR registration window yet."
                delay={40}
              >
                <EmptyStateCard
                  title="Registration not started"
                  description="Once the next MMR window is configured on the backend, the registration CTA will appear here."
                />
              </DetailSection>
            )}

            <DetailSection
              title="Registration History"
              subtitle="Your previous MMR registrations are listed here with the original window and registration timestamp."
              delay={80}
            >
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionHeaderTitle}>Past Windows</Text>
                <Text style={styles.sectionHeaderCount}>{history.length} loaded</Text>
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
              description="Your MMR registration history will appear here after your first successful registration."
            />
          )
        }
        ListFooterComponent={
          loadingMore ? <ActivityIndicator size="small" color={colors.primary} style={styles.footerLoader} /> : <View style={styles.footerSpace} />
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
}: {
  icon: string;
  label: string;
  value: string;
  styles: ReturnType<typeof createStyles>;
  color: string;
}) => (
  <View style={styles.summaryCard}>
    <Icon name={icon} size={18} color={color} />
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
      minHeight: 112,
    },
    summaryLabel: {
      marginTop: 10,
      color: colors.textMuted,
      fontFamily: FONT_FAMILY.medium,
      fontSize: 12,
    },
    summaryValue: {
      marginTop: 8,
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
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
    },
    primaryButtonDisabled: {
      opacity: 0.5,
    },
    primaryButtonLabel: {
      color: colors.onPrimary,
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
  });

export default MMR;
