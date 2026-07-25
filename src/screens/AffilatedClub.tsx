import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Linking,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { createShimmerPlaceholder } from 'react-native-shimmer-placeholder';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import * as api from '../util/api';
import Header from '../components/Header';
import BookingHeroCard from '../components/booking/BookingHeroCard';
import EmptyStateCard from '../components/booking/EmptyStateCard';
import AppAlertModal from '../components/feedback/AppAlertModal';
import { useAppAlert } from '../hooks/useAppAlert';
import { AppStackParamList } from '../navigation/AppDrawer';
import { useAppTheme } from '../theme/AppThemeProvider';
import { FONT_FAMILY } from '../util/colors';
import { ENDPOINT } from '../util/constant';

const ShimmerPlaceholder = createShimmerPlaceholder(LinearGradient);

type Props = NativeStackScreenProps<AppStackParamList, 'AffilatedClub'>;

type Club = {
  club_id: string | number;
  name: string;
  city?: string;
  city_name?: string;
  address?: string;
  code?: string;
  email?: string;
  website?: string;
  phone_numbers?: string[];
  phone_numbers_text?: string;
  has_contact_details?: boolean;
  search_index?: string;
};

type ClubMeta = {
  total_clubs?: number;
  cities_covered?: number;
  clubs_with_contact?: number;
};

const ensureUrl = (value?: string | null) => {
  if (!value) {
    return null;
  }

  if (value.startsWith('http://') || value.startsWith('https://')) {
    return value;
  }

  return `https://${value}`;
};

const AffilatedClubScreen: React.FC<Props> = () => {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { alertState, hideAlert, showAlert } = useAppAlert();
  const [searchQuery, setSearchQuery] = useState('');
  const [clubs, setClubs] = useState<Club[]>([]);
  const [meta, setMeta] = useState<ClubMeta>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchClubs = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const response = await api.javascriptGet({
        path: ENDPOINT.affilated_clubs,
        body: {},
      });

      if (response?.status) {
        setClubs(Array.isArray(response?.data) ? response.data : []);
        setMeta(response?.meta || {});
        return;
      }

      showAlert({
        title: 'Unable to load clubs',
        message: response?.message || 'Please try again in a moment.',
        tone: 'danger',
      });
    } catch (error) {
      showAlert({
        title: 'Unable to load clubs',
        message: 'Something went wrong while fetching affiliated clubs.',
        tone: 'danger',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [showAlert]);

  useEffect(() => {
    fetchClubs();
  }, [fetchClubs]);

  const filteredClubs = useMemo(() => {
    const keyword = searchQuery.trim().toLowerCase();

    if (!keyword) {
      return clubs;
    }

    return clubs.filter(club => {
      const searchable = club.search_index || [
        club.name,
        club.city,
        club.code,
        club.address,
        club.phone_numbers_text,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return searchable.includes(keyword);
    });
  }, [clubs, searchQuery]);

  const handleOpen = useCallback(async (url?: string | null, fallbackMessage?: string) => {
    if (!url) {
      showAlert({
        title: 'Details unavailable',
        message: fallbackMessage || 'This club has not shared that contact detail yet.',
        tone: 'warning',
      });
      return;
    }

    try {
      const supported = await Linking.canOpenURL(url);
      if (!supported) {
        throw new Error('Unsupported link');
      }

      await Linking.openURL(url);
    } catch (error) {
      showAlert({
        title: 'Unable to open',
        message: 'This contact action is not available on the device right now.',
        tone: 'warning',
      });
    }
  }, [showAlert]);

  const renderSkeleton = () => (
    <View style={styles.skeletonWrap}>
          {[1, 2, 3, 4].map(item => (
        <View key={item} style={styles.card}>
          <View style={styles.cardHeader}>
            <ShimmerPlaceholder style={styles.badgeSkeleton} />
            <View style={styles.flexOne}>
              <ShimmerPlaceholder style={styles.lineSkeletonWide} />
              <ShimmerPlaceholder style={styles.lineSkeletonMedium} />
            </View>
          </View>
          <ShimmerPlaceholder style={styles.lineSkeletonWide} />
          <ShimmerPlaceholder style={styles.lineSkeletonMedium} />
          <View style={styles.actionRow}>
            <ShimmerPlaceholder style={styles.actionSkeleton} />
            <ShimmerPlaceholder style={styles.actionSkeleton} />
          </View>
        </View>
      ))}
    </View>
  );

  const renderClubCard = ({ item }: { item: Club }) => {
    const primaryPhone = item.phone_numbers?.[0];

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.badge}>
            <Text style={styles.badgeLabel}>
              {item.name?.trim()?.charAt(0)?.toUpperCase() || 'C'}
            </Text>
          </View>

          <View style={styles.cardTitleWrap}>
            <Text style={styles.cardTitle}>{item.name || 'Affiliated Club'}</Text>
            <Text style={styles.cardSubtitle}>
              {item.city || item.address || 'Contact details available below'}
            </Text>
          </View>
        </View>

        <View style={styles.metaRow}>
          <InfoPill
            icon="identifier"
            label={item.code || 'No code listed'}
            styles={styles}
            color={colors.textMuted}
          />
          <InfoPill
            icon="map-marker-outline"
            label={item.city_name || item.city || 'Location not listed'}
            styles={styles}
            color={colors.textMuted}
          />
        </View>

        {item.address ? (
          <View style={styles.detailRow}>
            <Icon name="office-building-marker-outline" size={18} color={colors.textMuted} />
            <Text style={styles.detailText}>{item.address}</Text>
          </View>
        ) : null}

        <View style={styles.detailRow}>
          <Icon name="phone-outline" size={18} color={colors.textMuted} />
          <Text style={styles.detailText}>
            {item.phone_numbers_text || 'Phone details not available'}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Icon name="email-outline" size={18} color={colors.textMuted} />
          <Text style={styles.detailText}>{item.email || 'Email not available'}</Text>
        </View>

        <View style={styles.detailRow}>
          <Icon name="web" size={18} color={colors.textMuted} />
          <Text style={styles.detailText}>{item.website || 'Website not available'}</Text>
        </View>

        <View style={styles.actionRow}>
          <ActionButton
            label="Call"
            icon="phone"
            onPress={() => handleOpen(primaryPhone ? `tel:${primaryPhone}` : null)}
            styles={styles}
            color={colors.text}
          />
          <ActionButton
            label="Email"
            icon="email"
            onPress={() => handleOpen(item.email ? `mailto:${item.email}` : null)}
            styles={styles}
            color={colors.text}
          />
          <ActionButton
            label="Visit"
            icon="open-in-new"
            onPress={() => handleOpen(ensureUrl(item.website))}
            styles={styles}
            color={colors.text}
          />
        </View>
      </View>
    );
  };

  return (
    <View style={styles.screen}>
      <Header title="Affiliated Clubs" />

      <FlatList
        data={filteredClubs}
        keyExtractor={item => String(item.club_id)}
        renderItem={renderClubCard}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchClubs(true)}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View>
            <BookingHeroCard
              eyebrow="Club Network"
              title="Affiliated Club Directory"
              subtitle="Search partner clubs, review contact details, and jump into calls or website links without leaving the app."
              status={`${meta.total_clubs || clubs.length} clubs`}
              statusTone="neutral"
              meta={[
                {
                  label: 'Cities',
                  value: String(meta.cities_covered || 0),
                },
                {
                  label: 'With Contact',
                  value: String(meta.clubs_with_contact || 0),
                  tone: 'success',
                },
              ]}
            />

            <View style={styles.searchWrap}>
              <Icon name="magnify" size={20} color={colors.textMuted} />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search by club, city, code, or contact"
                placeholderTextColor={colors.placeholder}
                style={styles.searchInput}
                cursorColor={colors.primary}
              />
              {searchQuery ? (
                <Pressable onPress={() => setSearchQuery('')}>
                  <Icon name="close-circle" size={18} color={colors.textMuted} />
                </Pressable>
              ) : null}
            </View>
          </View>
        }
        ListEmptyComponent={
          loading ? (
            renderSkeleton()
          ) : (
            <EmptyStateCard
              title="No affiliated clubs found"
              description="Try a broader search or refresh to load the latest club directory."
            />
          )
        }
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

const InfoPill = ({
  icon,
  label,
  styles,
  color
}: {
  icon: string;
  label: string;
  styles: ReturnType<typeof createStyles>;
  color: string;
}) => (
  <View style={styles.infoPill}>
    <Icon name={icon} size={14} color={color} />
    <Text numberOfLines={1} style={styles.infoPillLabel}>
      {label}
    </Text>
  </View>
);

const ActionButton = ({
  label,
  icon,
  onPress,
  styles,
  color

}: {
  label: string;
  icon: string;
  onPress: () => void;
  styles: ReturnType<typeof createStyles>;
  color: string;
}) => (
  <Pressable onPress={onPress} style={styles.actionButton}>
    <Icon name={icon} size={16} color={color} />
    <Text style={styles.actionButtonText}>{label}</Text>
  </Pressable>
);

const createStyles = (colors: any) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },
    listContent: {
      paddingBottom: 36,
    },
    searchWrap: {
      marginHorizontal: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 20,
      backgroundColor: colors.surface,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 4,
    },
    searchInput: {
      flex: 1,
      paddingVertical: 14,
      paddingHorizontal: 10,
      color: colors.text,
      fontFamily: FONT_FAMILY.normal,
      fontSize: 14,
    },
    card: {
      marginHorizontal: 16,
      marginBottom: 14,
      padding: 18,
      borderRadius: 24,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: '#000',
      shadowOpacity: 0.08,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 10 },
      elevation: 4,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 14,
    },
    badge: {
      width: 54,
      height: 54,
      borderRadius: 18,
      backgroundColor: colors.surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 14,
    },
    badgeLabel: {
      color: colors.primary,
      fontFamily: FONT_FAMILY.bold,
      fontSize: 22,
    },
    cardTitleWrap: {
      flex: 1,
    },
    cardTitle: {
      color: colors.text,
      fontFamily: FONT_FAMILY.bold,
      fontSize: 18,
      lineHeight: 22,
    },
    cardSubtitle: {
      marginTop: 4,
      color: colors.textMuted,
      fontFamily: FONT_FAMILY.normal,
      fontSize: 13,
      lineHeight: 18,
    },
    metaRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      marginBottom: 14,
    },
    infoPill: {
      maxWidth: '100%',
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 9,
      borderRadius: 999,
      backgroundColor: colors.surfaceAlt,
      borderWidth: 1,
      borderColor: colors.border,
    },
    infoPillLabel: {
      marginLeft: 6,
      color: colors.text,
      fontFamily: FONT_FAMILY.medium,
      fontSize: 12,
      flexShrink: 1,
    },
    detailRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: 10,
    },
    detailText: {
      flex: 1,
      marginLeft: 10,
      color: colors.textMuted,
      fontFamily: FONT_FAMILY.normal,
      fontSize: 13,
      lineHeight: 19,
    },
    actionRow: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 10,
    },
    actionButton: {
      flex: 1,
      minHeight: 46,
      borderRadius: 16,
      backgroundColor: colors.surfaceAlt,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      paddingHorizontal: 10,
    },
    actionButtonText: {
      marginLeft: 6,
      color: colors.text,
      fontFamily: FONT_FAMILY.semiBold,
      fontSize: 13,
    },
    skeletonWrap: {
      paddingHorizontal: 16,
    },
    flexOne: {
      flex: 1,
    },
    badgeSkeleton: {
      width: 54,
      height: 54,
      borderRadius: 18,
      marginRight: 14,
    },
    lineSkeletonWide: {
      width: '88%',
      height: 16,
      borderRadius: 8,
      marginBottom: 10,
    },
    lineSkeletonMedium: {
      width: '65%',
      height: 14,
      borderRadius: 8,
      marginBottom: 10,
    },
    actionSkeleton: {
      flex: 1,
      height: 44,
      borderRadius: 16,
    },
  });

export default AffilatedClubScreen;
