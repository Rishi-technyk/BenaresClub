import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Image,
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
import { useSelector } from 'react-redux';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import Header from '../../components/Header';
import BookingHeroCard from '../../components/booking/BookingHeroCard';
import EmptyStateCard from '../../components/booking/EmptyStateCard';
import AppAlertModal from '../../components/feedback/AppAlertModal';
import { useAppAlert } from '../../hooks/useAppAlert';
import { javascriptGet } from '../../util/api';
import { DOMAIN, ENDPOINT } from '../../util/constant';
import { AppStackParamList } from '../../navigation/AppDrawer';
import { RootState } from '../../store/store';
import { FONT_FAMILY } from '../../util/colors';
import { useAppTheme } from '../../theme/AppThemeProvider';

type Props = NativeStackScreenProps<AppStackParamList, 'ClubMenu'>;
type MenuItem = {
  id?: string | number;
  name?: string;
  subTitle?: string;
  subtitle?: string;
  description?: string;
  icon?: string;
  icon_url?: string;
  navigate?: string;
  data?: string;
  cta_label?: string;
  module_type?: string;
};

const ShimmerPlaceholder = createShimmerPlaceholder(LinearGradient);

const ClubMenu: React.FC<Props> = ({ navigation }) => {
  const userData = useSelector((state: RootState) => state.auth);
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { alertState, hideAlert, showAlert } = useAppAlert();
  const [menus, setMenus] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [meta, setMeta] = useState<{ total_menus?: number; menus_with_icons?: number }>({});

  const fetchMenus = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const response = await javascriptGet({
        path: ENDPOINT.club_menu,
        Token: userData.token,
        body: {},
      });

      if (response?.status) {
        setMenus(Array.isArray(response?.data) ? response.data : []);
        setMeta(response?.meta || {});
        return;
      }

      showAlert({
        title: 'Unable to load menus',
        message: response?.message || 'Please try again shortly.',
        tone: 'danger',
      });
    } catch (error) {
      showAlert({
        title: 'Unable to load menus',
        message: 'Something went wrong while fetching the club menu.',
        tone: 'danger',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [showAlert, userData.token]);

  useEffect(() => {
    fetchMenus();
  }, [fetchMenus]);

  const filteredMenus = useMemo(() => {
    const keyword = searchQuery.trim().toLowerCase();
    if (!keyword) {
      return menus;
    }

    return menus.filter(item =>
      [item.name, item.subtitle, item.subTitle, item.description, item.module_type]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(keyword),
    );
  }, [menus, searchQuery]);

  const handleOpenMenu = useCallback((item: MenuItem) => {
    if (!item?.navigate || !item?.data) {
      showAlert({
        title: 'Menu unavailable',
        message: 'This menu item is not linked correctly yet.',
        tone: 'warning',
      });
      return;
    }

    navigation.navigate(item.navigate as never, {
      url: item.data,
      name: item.name,
    } as never);
  }, [navigation, showAlert]);

  const renderMenuCard = ({ item, index }: { item: MenuItem; index: number }) => {
    const subtitle = item.subtitle || item.subTitle || item.description || 'Tap to open this club menu.';
    const iconSource = { uri: `${DOMAIN.IMG}icons/${item.icon}` || item.icon_url };
    return (
      <Pressable
        onPress={() => handleOpenMenu(item)}
        style={[
          styles.card,
          index % 2 === 0 ? styles.cardAccentPrimary : styles.cardAccentSecondary,
        ]}
      >
        <View style={styles.cardTopRow}>
          <View style={styles.iconWrap}>
            {iconSource ? (
              <Image source={iconSource} style={styles.iconImage} resizeMode="contain" />
            ) : (
              <Icon name="silverware-fork-knife" size={28} color={colors.primary} />
            )}
          </View>

          <View style={styles.ctaWrap}>
            <Text style={styles.ctaText}>{item.cta_label || 'Open menu'}</Text>
            <Icon name="arrow-right" size={18} color={colors.primary} />
          </View>
        </View>

        <Text style={styles.title}>{item.name || 'Club menu'}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>

        <View style={styles.footerRow}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{item.module_type || 'menu'}</Text>
          </View>
          <Icon name="chevron-right" size={22} color={colors.textMuted} />
        </View>
      </Pressable>
    );
  };

  const renderSkeleton = () => (
    <View style={styles.skeletonWrap}>
      {[1, 2, 3].map(item => (
        <View key={item} style={styles.card}>
          <View style={styles.cardTopRow}>
            <ShimmerPlaceholder style={styles.iconWrap} />
            <ShimmerPlaceholder style={styles.ctaSkeleton} />
          </View>
          <ShimmerPlaceholder style={styles.lineSkeletonWide} />
          <ShimmerPlaceholder style={styles.lineSkeletonMedium} />
          <View style={styles.footerRow}>
            <ShimmerPlaceholder style={styles.badgeSkeleton} />
            <ShimmerPlaceholder style={styles.chevronSkeleton} />
          </View>
        </View>
      ))}
    </View>
  );

  return (
    <View style={styles.container}>
      <Header title="Club Menus" />

      <FlatList
        data={filteredMenus}
        keyExtractor={(item, index) => `${item?.id || item?.name || 'menu'}-${index}`}
        renderItem={renderMenuCard}
        numColumns={1}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchMenus(true)}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View>
            <BookingHeroCard
              eyebrow="Dining"
              title="Club Menu Hub"
              subtitle="Browse menus, jump into venue pages, and keep the food discovery flow cleaner and faster."
              status={`${meta.total_menus || menus.length} menus`}
              statusTone="success"
            />

            <View style={styles.searchWrap}>
              <Icon name="magnify" size={20} color={colors.textMuted} />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search menus or modules"
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
              title="No menus available"
              description="Refresh this page after the backend menu list is updated."
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

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    listContent: {
      paddingBottom: 40,
    },
    searchWrap: {
      marginHorizontal: 16,
      marginBottom: 14,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 20,
      backgroundColor: colors.surface,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
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
      backgroundColor: colors.surface,
      borderRadius: 26,
      padding: 18,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: '#000',
      shadowOpacity: 0.07,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 10 },
      elevation: 4,
    },
    cardAccentPrimary: {
      borderLeftWidth: 4,
      borderLeftColor: colors.primary,
    },
    cardAccentSecondary: {
      borderLeftWidth: 4,
      borderLeftColor: colors.secondary,
    },
    cardTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    iconWrap: {
      width: 58,
      height: 58,
      borderRadius: 18,
      backgroundColor: colors.surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconImage: {
      width: 34,
      height: 34,
    },
    ctaWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 9,
      borderRadius: 999,
      backgroundColor: colors.surfaceAlt,
      borderWidth: 1,
      borderColor: colors.border,
    },
    ctaText: {
      marginRight: 6,
      color: colors.primary,
      fontFamily: FONT_FAMILY.semiBold,
      fontSize: 12,
    },
    title: {
      color: colors.text,
      fontFamily: FONT_FAMILY.bold,
      fontSize: 18,
      lineHeight: 22,
    },
    subtitle: {
      marginTop: 8,
      color: colors.textMuted,
      fontFamily: FONT_FAMILY.normal,
      fontSize: 13,
      lineHeight: 20,
    },
    footerRow: {
      marginTop: 18,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    badge: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 999,
      backgroundColor: colors.surfaceAlt,
      borderWidth: 1,
      borderColor: colors.border,
    },
    badgeText: {
      color: colors.text,
      fontFamily: FONT_FAMILY.medium,
      fontSize: 12,
      textTransform: 'capitalize',
    },
    skeletonWrap: {
      paddingHorizontal: 16,
    },
    ctaSkeleton: {
      width: 96,
      height: 34,
      borderRadius: 999,
    },
    lineSkeletonWide: {
      width: '70%',
      height: 16,
      borderRadius: 8,
      marginBottom: 10,
    },
    lineSkeletonMedium: {
      width: '92%',
      height: 14,
      borderRadius: 8,
    },
    badgeSkeleton: {
      width: 84,
      height: 32,
      borderRadius: 999,
    },
    chevronSkeleton: {
      width: 24,
      height: 24,
      borderRadius: 12,
    },
  });

export default ClubMenu;
