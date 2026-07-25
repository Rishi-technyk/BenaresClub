import React, { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { APP_NAME } from '@env';
import { getDistance } from 'geolib';
import {
  DrawerActions,
  NavigationProp,
  useNavigation,
} from '@react-navigation/native';
import { useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/AntDesign';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import OTPModal from '../components/OTPModal';
import { FONT_FAMILY } from '../util/colors';
import useDashboardData, {
  HomeDashboardActivity,
  HomeDashboardBreakdown,
  HomeDashboardCard,
  HomeDashboardInsight,
  HomeDashboardSummary,
  HomeDashboardTrend,
} from '../services/HomeApis';
import { RootState } from '../store/store';
import { useToast } from 'react-native-toast-notifications';
import InAppUpdate from '../components/InAppUpdate';
import { getDashboardConfig } from '../config/dashboardConfig';
import EventModal from '../services/Events/EventModal';
import { javascriptGet } from '../util/api';
import MemberOrderTypeModal from '../components/MemberOrderTypeModal';
import { useAppTheme } from '../theme/AppThemeProvider';
import { DOMAIN } from '../util/constant';
import { getCurrentLocation } from '../util/locationHelper';

type MenuItem = {
  id?: string | number;
  name: string;
  subTitle?: string;
  icon?: string;
  navigate?: string;
  data?: any;
  module_key: string;
};

type DashboardConfig = {
  top_modules: MenuItem[];
  modules: MenuItem[];
};

type BannerResponse = {
  visible: boolean;
  image: string;
  navigation: string;
  data: any;
};

const formatCurrency = (value?: number | string | null) => {
  const amount = Number(value ?? 0);
  return `₹ ${Number.isFinite(amount) ? amount.toFixed(2) : '0.00'}`;
};

const formatMetricValue = ({
  value,
  prefix,
  suffix,
}: {
  value?: number | string;
  prefix?: string;
  suffix?: string;
}) => {
  if (typeof value === 'number') {
    const decimals = prefix ? 2 : suffix === '%' ? 1 : Number.isInteger(value) ? 0 : 1;
    const formatted = value.toFixed(decimals);
    return `${prefix ?? ''}${formatted}${suffix ? ` ${suffix}` : ''}`.trim();
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    return `${prefix ?? ''}${value}${suffix ? ` ${suffix}` : ''}`.trim();
  }

  return suffix ? `0 ${suffix}` : `${prefix ?? ''}0`;
};

const formatDateLabel = (date?: string | null) => {
  if (!date) {
    return 'No recent activity';
  }

  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) {
    return date;
  }

  return parsed.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const HomeScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp<any>>();
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const toast = useToast();
colors.surfaceAlt
  const [orderType, setOrderType] = useState<boolean>(false);
  const [screens2, setScreens2] = useState<MenuItem[]>([]);
  const [screens, setScreens] = useState<MenuItem[]>([]);
  const [otpModal, setOTPModal] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [eventModal, setEventModal] = useState<BannerResponse>({
    visible: false,
    image: '',
    navigation: '',
    data: null,
  });

  const auth = useSelector((state: RootState) => state.auth);
  const token = auth?.token;
  const homeDashboardQuery = useDashboardData({
    token: token ?? '',
  });

  const summary: HomeDashboardSummary = homeDashboardQuery.data?.data?.summary ?? {};
  const analytics = homeDashboardQuery.data?.data?.analytics ?? {};
  const cards: HomeDashboardCard[] = analytics.cards ?? [];
  const insights: HomeDashboardInsight[] = analytics.insights ?? [];
  const trend: HomeDashboardTrend[] = analytics.monthly_trend ?? [];
  const locationBreakdown: HomeDashboardBreakdown[] =
    analytics.location_breakdown ?? [];
  const paymentModeBreakdown: HomeDashboardBreakdown[] =
    analytics.payment_mode_breakdown ?? [];
  const recentActivity: HomeDashboardActivity[] =
    analytics.recent_activity ?? [];
  const balance = Number(summary.current_balance ?? 0);
  const memberName =
    auth?.user?.DisplayName ||
    auth?.user?.MemberName ||
    auth?.user?.name ||
    auth?.user?.SC_ID ||
    'Member';
  const memberCode = auth?.user?.SC_ID ?? '';

  const loadBanner = async () => {
    if (!token) {
      return;
    }

    try {
      const res = await javascriptGet({
        path: 'member/banner',
        Token: token,
      });
      const bannerData = res?.data?.data ?? res?.data;

      if (bannerData?.image && bannerData?.navigation) {
        setEventModal({
          visible: true,
          image: bannerData.image,
          navigation: bannerData.navigation,
          data: bannerData.data ?? null,
        });
      }
    } catch {
    }
  };
  console.log( summary, '---------------------- summary.location_enable ---------------------');
 const validateClubLocation = async () => {
    try {
      
      if(summary.location_enable==='Inactive'){
        return true
      }
      const location = await getCurrentLocation();
    
      if (!location) return false;

      const distance = getDistance(
        {
          latitude: location.latitude,
          longitude: location.longitude,
        },
       {latitude:Number(summary?.latitude).toFixed(6),
        longitude:Number(summary?.longitude).toFixed(6) ,
       },
      );

      if (distance <= Number(summary?.radius)) {
        return true;
      }

      Alert.alert(
        'Outside Club',
        `OTP feature unavailable outside the club. Please move inside to proceed.`,
      );

      return false;
    } catch (e) {
      Alert.alert('Location Error', e.message);

      return false;
    }
  };
  const loadDashboard = async () => {
    const config = (await getDashboardConfig()) as DashboardConfig;
    setScreens2(config.modules);
    setScreens(config.top_modules);
  };

  useEffect(() => {
    let mounted = true;

    const initializeHome = async () => {
      const config = (await getDashboardConfig()) as DashboardConfig;

      if (mounted) {
        setScreens2(config.modules);
        setScreens(config.top_modules);
      }

      if (!token) {
        return;
      }

      try {
        const res = await javascriptGet({
          path: 'member/banner',
          Token: token,
        });
        const bannerData = res?.data?.data ?? res?.data;

        if (mounted && bannerData?.image && bannerData?.navigation) {
          setEventModal({
            visible: true,
            image: bannerData.image,
            navigation: bannerData.navigation,
            data: bannerData.data ?? null,
          });
        }
      } catch {
      }
    };

    initializeHome();

    return () => {
      mounted = false;
    };
  }, [token]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        homeDashboardQuery.refetch(),
        loadDashboard(),
        loadBanner(),
      ]);
    } finally {
      setRefreshing(false);
    }
  };

  const chunkArray = (arr: MenuItem[], size: number) => {
    const result = [];
    for (let index = 0; index < arr?.length; index += size) {
      result.push(arr.slice(index, index + size));
    }
    return result;
  };

  const sections = chunkArray(screens2, 3);

  const navigateModule = async(item: MenuItem, includeBalance?: boolean) => {
    if (item.navigate === 'FoodOrder' || item.navigate === 'FoodMenu') {
      setOrderType(true);
      return;
    }

    if (includeBalance && item.name === 'Card') {
      navigation.navigate(item.navigate, balance);
      return;
    }

    if (item.navigate) {
      navigation.navigate(item.navigate, {
        url: item.data,
        data: item.data,
        name: item.name ?? '',
      });
      return;
    }

    if (item.name === 'OTP') {
      setRefreshing(true)
      const allowed = await validateClubLocation();
 setRefreshing(false)
      if (allowed) {
        setOTPModal(true);
      }
      return;
    }

    toast.show('Feature coming soon...', { type: 'warning' });
  };

  const renderBigCard = (item: MenuItem) => (
    <Pressable style={styles.bigCard} onPress={() => navigateModule(item)}>
      <Text style={styles.bigTitle}>{item.name}</Text>
      <Text style={styles.smallsubTitle} numberOfLines={4}>{item.subTitle}</Text>
      <Image
        source={{ uri: `${DOMAIN.IMG}icons/${item.icon}` }}
        style={styles.bigIcon}
      />
    </Pressable>
  );

  const renderSmallCard = (item: MenuItem) =>(
    <Pressable style={styles.smallCard} onPress={() => navigateModule(item)}>
      <Text style={styles.smallTitle}>{item.name}</Text>
      <Image
        source={{ uri: `${DOMAIN.IMG}icons/${item.icon}` }}
        style={styles.smallIcon}
      />
    </Pressable>
  );

  const renderSection = (group: MenuItem[], index: number) => {
    if (group.length === 0) {
      return null;
    }

    if (group.length === 1) {
      return (
        <View key={`section-${index}`} style={styles.sectionContainer}>
          {renderBigCard(group[0])}
        </View>
      );
    }

    if (group.length === 2) {
      return (
        <View key={`section-${index}`} style={styles.sectionContainer}>
          {renderBigCard(group[0])}
          {renderBigCard(group[1])}
        </View>
      );
    }

    const isReverse = index % 2 !== 0;

    return (
      <View key={`section-${index}`} style={styles.sectionContainer}>
        {!isReverse ? (
          <View style={styles.row}>
            {renderBigCard(group[0])}
            <View style={styles.smallColumn}>
              {renderSmallCard(group[1])}
              {renderSmallCard(group[2])}
            </View>
          </View>
        ) : (
          <View style={styles.row}>
            <View style={styles.smallColumn}>
              {renderSmallCard(group[0])}
              {renderSmallCard(group[1])}
            </View>
            {renderBigCard(group[2])}
          </View>
        )}
      </View>
    );
  };

  const renderQuickAction = ({ item }: { item: MenuItem }) => (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => navigateModule(item, true)}
      style={styles.quickTile}
    >
      <View style={styles.quickIconWrap}>
        <Image
          resizeMode="contain"
          style={styles.quickIcon}
          source={{
            uri:`${DOMAIN.IMG}icons/${item.icon}`,
          }}
        />
      </View>
      <Text style={styles.quickTitle} numberOfLines={1}>{item.name}</Text>
    </TouchableOpacity>
  );

  const renderSummaryMetric = (
    label: string,
    value?: number | string | null,
    tone: 'success' | 'warning' | 'danger' | 'primary' = 'primary',
  ) => {
    const valueColor =
      tone === 'success'
        ? colors.success
        : tone === 'warning'
          ? colors.warning
          : tone === 'danger'
            ? colors.danger
            : colors.text;

    return (
      <View style={styles.summaryMetric}>
        <Text style={styles.summaryMetricLabel}>{label}</Text>
        <Text style={[styles.summaryMetricValue, { color: valueColor }]}>
          {formatCurrency(value)}
        </Text>
      </View>
    );
  };

  const renderBreakdownRow = (
    item: HomeDashboardBreakdown,
    index: number,
    iconName: string,
  ) => (
    <View
      key={`${item.label}-${index}`}
      style={[
        styles.breakdownRow,
        index === 0 ? null : styles.breakdownRowBorder,
      ]}
    >
      <View style={styles.breakdownLabelWrap}>
        <View style={styles.breakdownIconWrap}>
          <MaterialCommunityIcons
            name={iconName}
            size={16}
            color={colors.primary}
          />
        </View>
        <View style={styles.breakdownLabelBlock}>
          <Text style={styles.breakdownLabel}>{item.label}</Text>
          <Text style={styles.breakdownMeta}>{item.count} transactions</Text>
        </View>
      </View>
      <Text style={styles.breakdownAmount}>{formatCurrency(item.amount)}</Text>
    </View>
  );

  const latestActivityDate =
    analytics.highlights?.latest_activity_date ||
    recentActivity?.[0]?.date ||
    null;

  return (
    <View style={styles.container}>
      <EventModal eventModal={eventModal} setEventModal={setEventModal} />
      <ScrollView
        showsVerticalScrollIndicator={false}
      
        // stickyHeaderIndices={[0]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.text}
          />
        }
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.header}>
          <View style={styles.headerGlowLarge} />
          <View style={styles.headerGlowSmall} />

          <View style={styles.headerTopRow}>
            <Icon
              name="menu-fold"
              size={22}
              color={colors.onPrimary}
              onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
            />

            <View style={styles.brandWrap}>
              <Image
                source={require('../../assets/images/Logo.png')}
                style={styles.logo}
              />
              <Text style={styles.brandText}>{APP_NAME}</Text>
            </View>

            <View style={styles.memberTag}>
              <Text style={styles.memberTagText}>{memberCode || 'Member'}</Text>
            </View>
          </View>

          <View style={styles.heroContent}>
            <View style={styles.heroTextBlock}>
              <Text style={styles.greetingText}>Welcome back</Text>
              <Text style={styles.memberNameText}>{memberName}</Text>
              <Text style={styles.memberMetaText}>
                Last activity: {formatDateLabel(latestActivityDate)}
              </Text>
            </View>

            <View style={styles.balancePanel}>
              <Text style={styles.balanceLabel}>Card Balance</Text>
              <Text style={styles.balanceAmount}>{formatCurrency(balance)}</Text>
              <Text style={styles.balanceSubtext}>
                {summary.bill_month_year
                  ? `Bill cycle ${summary.bill_month_year}`
                  : 'Account overview'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.snapshotCard}>
          <View style={styles.snapshotHeaderRow}>
            <View style={{ flex: 1,width:'60%' }}>
              <Text style={styles.snapshotTitle}>Subscription Summary</Text>
              {/* <Text style={styles.snapshotSubtitle}>
                Dues, available limit, and payments.
              </Text> */}
            </View>
            {/* <View
              style={[
                styles.statusChip,
                {
                  borderColor:
                    summary.pay_status === 'PAID'
                      ? colors.success
                      : colors.warning,
                },
              ]}
            >
              <Text
                style={[
                  styles.statusChipText,
                  {
                    color:
                      summary.pay_status === 'PAID'
                        ? colors.success
                        : colors.warning,
                  },
                ]}
              >
                {summary.pay_status?.toUpperCase() || 'PENDING'}
              </Text>
            </View> */}
          </View>

          <View style={styles.summaryMetricsGrid}>
            {/* {renderSummaryMetric('Amount Payable', summary.amount_payable, 'warning')}
            {renderSummaryMetric(
              'Available Limit',
              summary.available_credit,
              Number(summary.available_credit ?? 0) < 0 ? 'danger' : 'success',
            )}
            {renderSummaryMetric('Outstanding', summary.outstanding_amount, 'danger')}
            {renderSummaryMetric('Unbilled Debit', summary.unbilled_debit, 'primary')} */}
               {renderSummaryMetric(
              'Last Bill Amount',
              summary.bill_amount,
              'primary',
            )}
            {renderSummaryMetric(
              'Available Credit Limit',
              summary.available_credit,
              'primary',
            )}
            {renderSummaryMetric(
              'Unbilled Credit',
              summary.unbilled_credit,
              'primary',
            )}
            {renderSummaryMetric(
              'Unbilled Debit',
              summary.unbilled_debit,
              'primary',
            )}
          </View>

         
        </View>

        <View style={styles.analyticsSection}>
          {/* <Text style={styles.sectionTitle}>Account overview</Text>
          <Text style={styles.sectionSubtitle}>
            Recent usage, recharge, and bill.
          </Text> */}

          {/* {homeDashboardQuery.isLoading && !homeDashboardQuery.data?.data ? (
            <View style={styles.loadingCard}>
              <ActivityIndicator color={colors.primary} />
              <Text style={styles.loadingText}>Loading member dashboard...</Text>
            </View>
          ) : null}

          {cards.length > 0 ? (
            <View style={styles.analyticsCardGrid}>
              {cards.map((card, index) => {
                const accentColor =
                  card.tone === 'success'
                    ? colors.success
                    : card.tone === 'warning'
                      ? colors.warning
                      : card.tone === 'danger'
                        ? colors.danger
                        : card.tone === 'secondary'
                          ? colors.secondary
                          : colors.text;

                return (
                  <View
                    key={`${card.label}-${index}`}
                    style={[styles.analyticsCard, { borderColor: accentColor }]}
                  >
                    <Text style={styles.analyticsLabel}>{card.label}</Text>
                    <Text style={[styles.analyticsValue, { color: accentColor }]}>
                      {formatMetricValue(card)}
                    </Text>
                    <Text style={styles.analyticsHelper}>{card.helper}</Text>
                  </View>
                );
              })}
            </View>
          ) : null} */}
   <View style={styles.quickSection}>
          <Text style={styles.sectionTitle}>Transactions & A/C</Text>
          <Text style={styles.sectionSubtitle}>
            Fast access to recharge, invoices, and account utilities.
          </Text>

       
          <View style={styles.quickListContent}>
          {screens?.length > 0 ? (screens.map((screen, index) => (
            renderQuickAction({ item: screen, index } as { item: MenuItem; index: number })
          ))) : null}
          </View>
        </View>

        <View style={styles.facilitySection}>
          <Text style={styles.sectionTitle}>Club facilities</Text>
          <Text style={styles.sectionSubtitle}>
            Continue into member services.
          </Text>
          <View style={styles.facilityGrid}>{sections.map(renderSection)}</View>
        </View>
          {/* {insights.length > 0 ? (
            <View style={styles.insightStack}>
              {insights.map((insight, index) => {
                const accentColor =
                  insight.tone === 'success'
                    ? colors.success
                    : insight.tone === 'warning'
                      ? colors.warning
                      : insight.tone === 'danger'
                        ? colors.danger
                        : insight.tone === 'secondary'
                          ? colors.secondary
                          : colors.primary;

                return (
                  <View key={`${insight.title}-${index}`} style={styles.insightCard}>
                    <View style={styles.insightHeaderRow}>
                      <Text style={styles.insightTitle}>{insight.title}</Text>
                      <Text style={[styles.insightValue, { color: accentColor }]}>
                        {formatMetricValue(insight)}
                      </Text>
                    </View>
                    <Text style={styles.insightDescription}>
                      {insight.description}
                    </Text>
                  </View>
                );
              })}
            </View>
          ) : null} */}

          {trend.length > 0 ? (
            <View style={styles.trendCard}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.subSectionTitle}>Monthly transactions</Text>
                <Text style={styles.subSectionMeta}>Last {trend.length} months</Text>
              </View>
              {trend.map((item, index) => (
                <View
                  key={`${item.month_key}-${index}`}
                  style={[
                    styles.trendRow,
                    index === 0 ? null : styles.trendRowBorder,
                  ]}
                >
                  <View>
                    <Text style={styles.trendMonth}>{item.month_label}</Text>
                    <Text style={styles.trendMeta}>
                      {item.activity_count} transactions
                    </Text>
                  </View>

                  <View style={styles.trendAmountWrap}>
                    <Text style={styles.trendPositive}>
                      + {formatCurrency(item.recharge_total)}
                    </Text>
                    <Text style={styles.trendNegative}>
                      - {formatCurrency(item.spend_total)}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          ) : null}

          {/* {locationBreakdown.length > 0 || paymentModeBreakdown.length > 0 ? (
            <View style={styles.breakdownCard}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.subSectionTitle}>Pattern breakdown</Text>
                <Text style={styles.subSectionMeta}>
                  Top places and payment modes
                </Text>
              </View>

              {locationBreakdown.length > 0 ? (
                <View style={styles.breakdownGroup}>
                  <Text style={styles.breakdownGroupTitle}>Top locations</Text>
                  {locationBreakdown.map((item, index) =>
                    renderBreakdownRow(item, index, 'map-marker-outline'),
                  )}
                </View>
              ) : null}

              {paymentModeBreakdown.length > 0 ? (
                <View style={styles.breakdownGroup}>
                  <Text style={styles.breakdownGroupTitle}>Preferred pay modes</Text>
                  {paymentModeBreakdown.map((item, index) =>
                    renderBreakdownRow(item, index, 'credit-card-outline'),
                  )}
                </View>
              ) : null}
            </View>
          ) : null} */}

          {recentActivity.length > 0 ? (
            <View style={styles.activityCard}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.subSectionTitle}>Recent activity</Text>
                {/* <Text style={styles.subSectionMeta}>Live movement snapshot</Text> */}
              </View>

              {recentActivity.map((item, index) => {
                const isPositive = Number(item.amount) >= 0;

                return (
                  <View
                    key={`${item.reference ?? item.title}-${index}`}
                    style={[
                      styles.activityRow,
                      index === 0 ? null : styles.activityRowBorder,
                    ]}
                  >
                    <View style={styles.activityIconWrap}>
                      <MaterialCommunityIcons
                        name={
                          item.type === 'card'
                            ? 'wallet-outline'
                            : 'bank-transfer-out'
                        }
                        size={18}
                        color={colors.text}
                      />
                    </View>

                    <View style={styles.activityContent}>
                      <Text style={styles.activityTitle}>{item.title}</Text>
                      <Text style={styles.activitySubtitle}>
                        {item.subtitle}
                        {item.reference ? ` • ${item.reference}` : ''}
                      </Text>
                      <Text style={styles.activityDate}>
                        {formatDateLabel(item.date)}
                      </Text>
                    </View>

                    <Text
                      style={[
                        styles.activityAmount,
                        { color: isPositive ? colors.success : colors.danger },
                      ]}
                    >
                      {isPositive ? '+' : '-'} {formatCurrency(Math.abs(Number(item.amount)))}
                    </Text>
                  </View>
                );
              })}
            </View>
          ) : null}
        </View>

     
      </ScrollView>

      <OTPModal visible={otpModal} setVisible={setOTPModal} />
      <InAppUpdate />
      <MemberOrderTypeModal showTypes={orderType} setShowType={setOrderType} />
    </View>
  );
};

const createStyles = (colors: {
  background: string;
  primary: string;
  secondary: string;
  onPrimary: string;
  surface: string;
  surfaceAlt: string;
  text: string;
  textMuted: string;
  border: string;
  success: string;
  warning: string;
  danger: string;
}) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scroll: {
      backgroundColor: colors.primary,
    },
    scrollContent: {
      paddingBottom: 34,
      backgroundColor: colors.background,
    },
    header: {
      overflow: 'hidden',
      paddingTop: 10,
      paddingHorizontal: 20,
      paddingBottom: 42,
      backgroundColor: colors.primary,
      borderBottomLeftRadius: 30,
      borderBottomRightRadius: 30,
    },
    headerGlowLarge: {
      position: 'absolute',
      width: 220,
      height: 220,
      borderRadius: 110,
      backgroundColor: colors.secondary,
      opacity: 0.50,
      top: -80,
      right: -50,
    },
    headerGlowSmall: {
      position: 'absolute',
      width: 140,
      height: 140,
      borderRadius: 70,
      // backgroundColor: colors.danger,
      backgroundColor:'rgba(84, 135, 107, 0.71)',
      opacity: 0.3,
      bottom: -50,
      left: -20,
    },
    headerTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    brandWrap: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    logo: {
      width: 30,
      height: 30,
      borderRadius: 15,
      marginRight: 6,
    },
    brandText: {
      color: colors.onPrimary,
      fontSize: 20,
      fontFamily: FONT_FAMILY.bold,
    },
    memberTag: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: colors.background,
      borderWidth:0.4,
      borderColor: colors.border,
    },
    memberTagText: {
      color: colors.text,
      fontSize: 11,
      fontFamily: FONT_FAMILY.semiBold,
    },
    heroContent: {
      marginTop: 24,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
    },
    heroTextBlock: {
      flex: 1,
      paddingRight: 12,
    },
    greetingText: {
      color: colors.textMuted,
      fontSize: 13,
      fontFamily: FONT_FAMILY.normal,
      marginBottom: 4,
    },
    memberNameText: {
      color: colors.onPrimary,
      fontSize: 25,
      fontFamily: FONT_FAMILY.bold,
    },
    memberMetaText: {
      marginTop: 8,
      color: colors.textMuted,
      fontSize: 12,
      fontFamily: FONT_FAMILY.normal,
    },
    balancePanel: {
      minWidth: 150,
      padding: 16,
      borderRadius: 22,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
     
    },
    balanceLabel: {
      color: colors.textMuted,
      fontSize: 12,
      fontFamily: FONT_FAMILY.normal,
    },
    balanceAmount: {
      marginTop: 6,
      color: colors.text,
      fontSize: 24,
      fontFamily: FONT_FAMILY.bold,
    },
    balanceSubtext: {
      marginTop: 6,
      color: colors.textMuted,
      fontSize: 11,
      fontFamily: FONT_FAMILY.normal,
    },
    snapshotCard: {
      marginTop: -26,
      marginHorizontal: 16,
      padding: 18,
      borderRadius: 24,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: '#000',
      shadowOpacity: 0.08,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 6 },
      elevation: 4,
    },
    snapshotHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },
    snapshotTitle: {
      color: colors.text,
      fontSize: 17,
      fontFamily: FONT_FAMILY.bold,
    },
    snapshotSubtitle: {
      marginTop: 6,
      color: colors.textMuted,
      fontSize: 12,
      lineHeight: 18,
      fontFamily: FONT_FAMILY.normal,
      // maxWidth: '88%',
    },
    statusChip: {
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 999,
      borderWidth: 1,
      backgroundColor: colors.background,
    },
    statusChipText: {
      fontSize: 11,
      fontFamily: FONT_FAMILY.semiBold,
    },
    summaryMetricsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      marginTop: 18,
    },
    summaryMetric: {
      width: '48.5%',
      backgroundColor: colors.background,
      borderRadius: 18,
      padding: 14,
      marginBottom: 10,
    },
    summaryMetricLabel: {
      color: colors.textMuted,
      fontSize: 11,
      fontFamily: FONT_FAMILY.normal,
    },
    summaryMetricValue: {
      marginTop: 6,
      fontSize: 16,
      fontFamily: FONT_FAMILY.bold,
    },
    snapshotActionsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 8,
    },
    primaryActionButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 8,
      paddingVertical: 14,
      borderRadius: 16,
      backgroundColor: colors.primary,
    },
    primaryActionText: {
      marginLeft: 8,
      color: colors.onPrimary,
      fontSize: 13,
      fontFamily: FONT_FAMILY.semiBold,
    },
    secondaryActionButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: 8,
      paddingVertical: 14,
      borderRadius: 16,
      backgroundColor: colors.surfaceAlt,
    },
    secondaryActionText: {
      marginLeft: 8,
      color: colors.primary,
      fontSize: 13,
      fontFamily: FONT_FAMILY.semiBold,
    },
    analyticsSection: {
      marginTop: 18,
      marginHorizontal: 16,
    },
    sectionTitle: {
      color: colors.text,
      fontSize: 18,
      fontFamily: FONT_FAMILY.bold,
    },
    sectionSubtitle: {
      color: colors.textMuted,
      fontSize: 12,
      lineHeight: 18,
      marginTop: 4,
      fontFamily: FONT_FAMILY.normal,
    },
    loadingCard: {
      marginTop: 16,
      borderRadius: 18,
      padding: 18,
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    loadingText: {
      marginTop: 10,
      color: colors.textMuted,
      fontSize: 12,
      fontFamily: FONT_FAMILY.normal,
    },
    analyticsCardGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      marginTop: 16,
    },
    analyticsCard: {
      width: '48.5%',
      borderRadius: 18,
      padding: 14,
      marginBottom: 10,
      backgroundColor: colors.surface,
      borderWidth: 1,
    },
    analyticsLabel: {
      color: colors.textMuted,
      fontSize: 11,
      fontFamily: FONT_FAMILY.normal,
    },
    analyticsValue: {
      marginTop: 8,
      fontSize: 20,
      fontFamily: FONT_FAMILY.bold,
    },
    analyticsHelper: {
      marginTop: 6,
      color: colors.textMuted,
      fontSize: 11,
      lineHeight: 16,
      fontFamily: FONT_FAMILY.normal,
    },
    insightStack: {
      marginTop: 8,
    },
    insightCard: {
      marginTop: 10,
      borderRadius: 18,
      padding: 16,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,

    },
    insightHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    insightTitle: {
      color: colors.text,
      fontSize: 14,
      fontFamily: FONT_FAMILY.bold,
      flex: 1,
      paddingRight: 10,
    },
    insightValue: {
      fontSize: 16,
      fontFamily: FONT_FAMILY.bold,
      maxWidth:'60%'
    },
    insightDescription: {
      marginTop: 8,
      color: colors.textMuted,
      fontSize: 12,
      lineHeight: 18,
      fontFamily: FONT_FAMILY.normal,
    },
    trendCard: {
      marginTop: 16,
      borderRadius: 20,
      padding: 16,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    sectionHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    subSectionTitle: {
      color: colors.text,
      fontSize: 15,
      fontFamily: FONT_FAMILY.bold,
      maxWidth:'70%'
    },
    subSectionMeta: {
      color: colors.textMuted,
      fontSize: 11,
      fontFamily: FONT_FAMILY.normal,
       maxWidth:'30%'
    },
    trendRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 14,
    },
    trendRowBorder: {
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    trendMonth: {
      color: colors.text,
      fontSize: 13,
      fontFamily: FONT_FAMILY.semiBold,
    },
    trendMeta: {
      marginTop: 4,
      color: colors.textMuted,
      fontSize: 11,
      fontFamily: FONT_FAMILY.normal,
    },
    trendAmountWrap: {
      alignItems: 'flex-end',
    },
    trendPositive: {
      color: colors.success,
      fontSize: 12,
      fontFamily: FONT_FAMILY.semiBold,
    },
    trendNegative: {
      marginTop: 4,
      color: colors.danger,
      fontSize: 12,
      fontFamily: FONT_FAMILY.semiBold,
    },
    breakdownCard: {
      marginTop: 16,
      borderRadius: 20,
      padding: 16,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    breakdownGroup: {
      marginTop: 14,
    },
    breakdownGroupTitle: {
      color: colors.text,
      fontSize: 13,
      fontFamily: FONT_FAMILY.semiBold,
      marginBottom: 4,
    },
    breakdownRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 12,
    },
    breakdownRowBorder: {
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    breakdownLabelWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      paddingRight: 12,
    },
    breakdownIconWrap: {
      width: 30,
      height: 30,
      borderRadius: 15,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surfaceAlt,
      marginRight: 10,
    },
    breakdownLabelBlock: {
      flex: 1,
    },
    breakdownLabel: {
      color: colors.text,
      fontSize: 12,
      fontFamily: FONT_FAMILY.semiBold,
    },
    breakdownMeta: {
      marginTop: 3,
      color: colors.textMuted,
      fontSize: 11,
      fontFamily: FONT_FAMILY.normal,
    },
    breakdownAmount: {
      color: colors.text,
      fontSize: 12,
      fontFamily: FONT_FAMILY.bold,
    },
    activityCard: {
      marginTop: 16,
      borderRadius: 20,
      padding: 16,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    activityRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 13,
    },
    activityRowBorder: {
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    activityIconWrap: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surfaceAlt,
      marginRight: 12,
    },
    activityContent: {
      flex: 1,
      paddingRight: 12,
    },
    activityTitle: {
      color: colors.text,
      fontSize: 13,
      fontFamily: FONT_FAMILY.semiBold,
    },
    activitySubtitle: {
      marginTop: 4,
      color: colors.textMuted,
      fontSize: 11,
      fontFamily: FONT_FAMILY.normal,
    },
    activityDate: {
      marginTop: 4,
      color: colors.textMuted,
      fontSize: 10,
      fontFamily: FONT_FAMILY.normal,
    },
    activityAmount: {
      fontSize: 12,
      fontFamily: FONT_FAMILY.bold,
    },
    quickSection: {
      // marginHorizontal: 16,
      marginTop: 18,
      padding: 16,
      borderRadius: 20,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    quickListContent: {
flexDirection:'row',
      paddingTop: 14,
      paddingRight: 8,
      justifyContent:'space-around'
    },
    quickTile: {
     flex:1,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 14,
      paddingHorizontal: 10,
    },
    quickIconWrap: {
      backgroundColor: colors.surfaceAlt,
      justifyContent:'space-around',
      padding: 12,
      borderRadius: 16,
      marginBottom: 8,
    },
    quickIcon: {
      width: 34,
      height: 34,
    },
    quickTitle: {
      fontSize: 12,
      fontFamily: FONT_FAMILY.semiBold,
      color: colors.text,
      textAlign: 'center',
    },
    facilitySection: {
      // marginHorizontal: 16,
      marginTop: 18,
    },
    facilityGrid: {
      marginTop: 8,
      paddingBottom: 8,
    },
    sectionContainer: {
      marginBottom: 14,
    },
    row: {
      flexDirection: 'row',
    },
    smallColumn: {
      flex: 2,
      justifyContent: 'space-between',
    },
    bigCard: {
      flex: 1,
      margin: 6,
      borderRadius: 24,
      padding: 18,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: '#000',
      shadowOpacity: 0.06,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 3,
    },
    bigTitle: {
      fontSize: 14,
      fontFamily: FONT_FAMILY.bold,
      color: colors.text,
    },
    smallsubTitle: {
      fontSize: 12,
      fontFamily: FONT_FAMILY.light,
      color: colors.textMuted,
      marginTop: 4,
      width: '70%',
    },
    bigIcon: {
      width: 58,
      height: 58,
      position: 'absolute',
      right: 12,
      bottom: 12,
      opacity: 0.95,
    },
    smallCard: {
      margin: 6,
      borderRadius: 18,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      flexDirection: 'row',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOpacity: 0.05,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 3 },
      elevation: 2,
    },
    smallTitle: {
      fontSize: 16,
      fontFamily: FONT_FAMILY.bold,
      color: colors.text,
      width: '70%',
    },
    smallIcon: {
      width: 42,
      height: 42,
    },
  });

export default HomeScreen;

// import React, { useEffect, useState } from 'react';
// import {
//   ActivityIndicator,
//   FlatList,
//   Image,
//   Pressable,
//   RefreshControl,
//   ScrollView,
//   StyleSheet,
//   Text,
//   TouchableOpacity,
//   View,
// } from 'react-native';
// import { APP_NAME } from '@env';
// import {
//   DrawerActions,
//   NavigationProp,
//   useNavigation,
// } from '@react-navigation/native';
// import { useSelector } from 'react-redux';
// import Icon from 'react-native-vector-icons/AntDesign';
// import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
// import OTPModal from '../components/OTPModal';
// import { FONT_FAMILY } from '../util/colors';
// import useDashboardData, {
//   HomeDashboardActivity,
//   HomeDashboardBreakdown,
//   HomeDashboardCard,
//   HomeDashboardInsight,
//   HomeDashboardSummary,
//   HomeDashboardTrend,
// } from '../services/HomeApis';
// import { RootState } from '../store/store';
// import { useToast } from 'react-native-toast-notifications';
// import InAppUpdate from '../components/InAppUpdate';
// import { getDashboardConfig } from '../config/dashboardConfig';
// import EventModal from '../services/Events/EventModal';
// import { javascriptGet } from '../util/api';
// import MemberOrderTypeModal from '../components/MemberOrderTypeModal';
// import { useAppTheme } from '../theme/AppThemeProvider';
// import { DOMAIN } from '../util/constant';

// type MenuItem = {
//   id?: string | number;
//   name: string;
//   subTitle?: string;
//   icon?: string;
//   navigate?: string;
//   data?: any;
//   module_key: string;
// };

// type DashboardConfig = {
//   top_modules: MenuItem[];
//   modules: MenuItem[];
// };

// type BannerResponse = {
//   visible: boolean;
//   image: string;
//   navigation: string;
//   data: any;
// };

// const formatCurrency = (value?: number | string | null) => {
//   const amount = Number(value ?? 0);
//   return `₹ ${Number.isFinite(amount) ? amount.toFixed(2) : '0.00'}`;
// };



// const formatDateLabel = (date?: string | null) => {
//   if (!date) {
//     return 'No recent activity';
//   }

//   const parsed = new Date(date);
//   if (Number.isNaN(parsed.getTime())) {
//     return date;
//   }

//   return parsed.toLocaleDateString('en-IN', {
//     day: '2-digit',
//     month: 'short',
//     year: 'numeric',
//   });
// };

// const HomeScreen: React.FC = () => {
//   const navigation = useNavigation<NavigationProp<any>>();
//   const { colors } = useAppTheme();
//   const styles = createStyles(colors);
//   const toast = useToast();
// colors.surfaceAlt
//   const [orderType, setOrderType] = useState<boolean>(false);
//   const [screens2, setScreens2] = useState<MenuItem[]>([]);
//   const [screens, setScreens] = useState<MenuItem[]>([]);
//   const [otpModal, setOTPModal] = useState<boolean>(false);
//   const [refreshing, setRefreshing] = useState<boolean>(false);
//   const [eventModal, setEventModal] = useState<BannerResponse>({
//     visible: false,
//     image: '',
//     navigation: '',
//     data: null,
//   });

//   const auth = useSelector((state: RootState) => state.auth);
//   const token = auth?.token;
//   const homeDashboardQuery = useDashboardData({
//     token: token ?? '',
//   });

//   const summary: HomeDashboardSummary = homeDashboardQuery.data?.data?.summary ?? {};
//   const analytics = homeDashboardQuery.data?.data?.analytics ?? {};
//   const cards: HomeDashboardCard[] = analytics.cards ?? [];
//   const insights: HomeDashboardInsight[] = analytics.insights ?? [];
//   const trend: HomeDashboardTrend[] = analytics.monthly_trend ?? [];
//   const locationBreakdown: HomeDashboardBreakdown[] =
//     analytics.location_breakdown ?? [];
//   const paymentModeBreakdown: HomeDashboardBreakdown[] =
//     analytics.payment_mode_breakdown ?? [];
//   const recentActivity: HomeDashboardActivity[] =
//     analytics.recent_activity ?? [];
//   const balance = Number(summary.current_balance ?? 0);
//   const memberName =
//     auth?.user?.DisplayName ||
//     auth?.user?.MemberName ||
//     auth?.user?.name ||
//     auth?.user?.SC_ID ||
//     'Member';
//   const memberCode = auth?.user?.MemberID ?? '';

//   const loadBanner = async () => {
//     if (!token) {
//       return;
//     }

//     try {
//       const res = await javascriptGet({
//         path: 'member/banner',
//         Token: token,
//       });
//       const bannerData = res?.data?.data ?? res?.data;

//       if (bannerData?.image && bannerData?.navigation) {
//         setEventModal({
//           visible: true,
//           image: bannerData.image,
//           navigation: bannerData.navigation,
//           data: bannerData.data ?? null,
//         });
//       }
//     } catch {
//     }
//   };

//   const loadDashboard = async () => {
//     const config = (await getDashboardConfig()) as DashboardConfig;
//     setScreens2(config.modules);
//     setScreens(config.top_modules);
//   };

//   useEffect(() => {
//     let mounted = true;

//     const initializeHome = async () => {
//       const config = (await getDashboardConfig()) as DashboardConfig;

//       if (mounted) {
//         setScreens2(config.modules);
//         setScreens(config.top_modules);
//       }

//       if (!token) {
//         return;
//       }

//       try {
//         const res = await javascriptGet({
//           path: 'member/banner',
//           Token: token,
//         });
//         const bannerData = res?.data?.data ?? res?.data;

//         if (mounted && bannerData?.image && bannerData?.navigation) {
//           setEventModal({
//             visible: true,
//             image: bannerData.image,
//             navigation: bannerData.navigation,
//             data: bannerData.data ?? null,
//           });
//         }
//       } catch {
//       }
//     };

//     initializeHome();

//     return () => {
//       mounted = false;
//     };
//   }, [token]);

//   const handleRefresh = async () => {
//     setRefreshing(true);
//     try {
//       await Promise.all([
//         homeDashboardQuery.refetch(),
//         loadDashboard(),
//         loadBanner(),
//       ]);
//     } finally {
//       setRefreshing(false);
//     }
//   };

//   const chunkArray = (arr: MenuItem[], size: number) => {
//     const result = [];
//     for (let index = 0; index < arr?.length; index += size) {
//       result.push(arr.slice(index, index + size));
//     }
//     return result;
//   };

//   const sections = chunkArray(screens2, 3);

//   const navigateModule = (item: MenuItem, includeBalance?: boolean) => {
//     if (item.navigate === 'FoodOrder' || item.navigate === 'FoodMenu') {
//       setOrderType(true);
//       return;
//     }

//     if (includeBalance && item.name === 'Card') {
//       navigation.navigate(item.navigate, balance);
//       return;
//     }

//     if (item.navigate) {
//       navigation.navigate(item.navigate, {
//         url: item.data,
//         data: item.data,
//         name: item.name ?? '',
//       });
//       return;
//     }

//     if (item.name === 'OTP') {
//       setOTPModal(true);
//       return;
//     }

//     toast.show('Feature coming soon...', { type: 'warning' });
//   };

//   const renderBigCard = (item: MenuItem) => {
//     console.log( `${DOMAIN.IMG}icons/${item.icon}`, '---------------------- ${DOMAIN.IMG}icons/${item.icon} ---------------------');
//     return(
//     <Pressable style={styles.bigCard} onPress={() => navigateModule(item)}>
//       <Text style={styles.bigTitle}>{item.name}</Text>
//       <Text style={styles.smallsubTitle} numberOfLines={4}>{item.subTitle}</Text>
//       <Image
//         source={{ uri: `${DOMAIN.IMG}icons/${item.icon}` }}
//         style={styles.bigIcon}
//       />
//     </Pressable>
//   );}

//   const renderSmallCard = (item: MenuItem) =>(
//     <Pressable style={styles.smallCard} onPress={() => navigateModule(item)}>
//       <Text style={styles.smallTitle}>{item.name}</Text>
//       <Image
//         source={{ uri: `${DOMAIN.IMG}icons/${item.icon}` }}
//         style={styles.smallIcon}
//       />
//     </Pressable>
//   );

//   const renderSection = (group: MenuItem[], index: number) => {
//     if (group.length === 0) {
//       return null;
//     }

//     if (group.length === 1) {
//       return (
//         <View key={`section-${index}`} style={styles.sectionContainer}>
//           {renderBigCard(group[0])}
//         </View>
//       );
//     }

//     if (group.length === 2) {
//       return (
//         <View key={`section-${index}`} style={styles.sectionContainer}>
//           {renderBigCard(group[0])}
//           {renderBigCard(group[1])}
//         </View>
//       );
//     }

//     const isReverse = index % 2 !== 0;

//     return (
//       <View key={`section-${index}`} style={styles.sectionContainer}>
//         {!isReverse ? (
//           <View style={styles.row}>
//             {renderBigCard(group[0])}
//             <View style={styles.smallColumn}>
//               {renderSmallCard(group[1])}
//               {renderSmallCard(group[2])}
//             </View>
//           </View>
//         ) : (
//           <View style={styles.row}>
//             <View style={styles.smallColumn}>
//               {renderSmallCard(group[0])}
//               {renderSmallCard(group[1])}
//             </View>
//             {renderBigCard(group[2])}
//           </View>
//         )}
//       </View>
//     );
//   };

//   const renderQuickAction = ({ item }: { item: MenuItem }) => (
//     <TouchableOpacity
//       activeOpacity={0.85}
//       onPress={() => navigateModule(item, true)}
//       style={styles.quickTile}
//     >
//       <View style={styles.quickIconWrap}>
//         <Image
//           resizeMode="contain"
//           style={styles.quickIcon}
//           source={{
//             uri:`${DOMAIN.IMG}icons/${item.icon}`,
//           }}
//         />
//       </View>
//       <Text style={styles.quickTitle} numberOfLines={1}>{item.name}</Text>
//     </TouchableOpacity>
//   );

//   const renderSummaryMetric = (
//     label: string,
//     value?: number | string | null,
//     tone: 'success' | 'warning' | 'danger' | 'primary' = 'primary',
//   ) => {
//     const valueColor =
//       tone === 'success'
//         ? colors.success
//         : tone === 'warning'
//           ? colors.warning
//           : tone === 'danger'
//             ? colors.danger
//             : colors.text;

//     return (
//       <View style={styles.summaryMetric}>
//         <Text style={styles.summaryMetricLabel}>{label}</Text>
//         <Text style={[styles.summaryMetricValue, { color: valueColor }]}>
//           {formatCurrency(value)}
//         </Text>
//       </View>
//     );
//   };

//   const renderBreakdownRow = (
//     item: HomeDashboardBreakdown,
//     index: number,
//     iconName: string,
//   ) => (
//     <View
//       key={`${item.label}-${index}`}
//       style={[
//         styles.breakdownRow,
//         index === 0 ? null : styles.breakdownRowBorder,
//       ]}
//     >
//       <View style={styles.breakdownLabelWrap}>
//         <View style={styles.breakdownIconWrap}>
//           <MaterialCommunityIcons
//             name={iconName}
//             size={16}
//             color={colors.primary}
//           />
//         </View>
//         <View style={styles.breakdownLabelBlock}>
//           <Text style={styles.breakdownLabel}>{item.label}</Text>
//           <Text style={styles.breakdownMeta}>{item.count} transactions</Text>
//         </View>
//       </View>
//       <Text style={styles.breakdownAmount}>{formatCurrency(item.amount)}</Text>
//     </View>
//   );

//   const latestActivityDate =
//     analytics.highlights?.latest_activity_date ||
//     recentActivity?.[0]?.date ||
//     null;

//   return (
//     <View style={styles.container}>
//       <EventModal eventModal={eventModal} setEventModal={setEventModal} />
//       <ScrollView
//         showsVerticalScrollIndicator={false}
      
//         // stickyHeaderIndices={[0]}
//         refreshControl={
//           <RefreshControl
//             refreshing={refreshing}
//             onRefresh={handleRefresh}
//             tintColor={colors.text}
//           />
//         }
//         style={styles.scroll}
//         contentContainerStyle={styles.scrollContent}
//       >
//         <View style={styles.header}>
//           <View style={styles.headerGlowLarge} />
//           <View style={styles.headerGlowSmall} />

//           <View style={styles.headerTopRow}>
//             <Icon
//               name="menu-fold"
//               size={22}
//               color={colors.onPrimary}
//               onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
//             />

//             <View style={styles.brandWrap}>
//               <Image
//                 source={require('../../assets/images/Logo.png')}
//                 style={styles.logo}
//               />
//               <Text style={styles.brandText}>{APP_NAME}</Text>
//             </View>

//             <View style={styles.memberTag}>
//               <Text style={styles.memberTagText}>{memberCode || 'Member'}</Text>
//             </View>
//           </View>

//           <View style={styles.heroContent}>
//             <View style={styles.heroTextBlock}>
//               <Text style={styles.greetingText}>Welcome back</Text>
//               <Text style={styles.memberNameText}>{memberName}</Text>
//               <Text style={styles.memberMetaText}>
//                 Last activity: {formatDateLabel(latestActivityDate)}
//               </Text>
//             </View>

//             <View style={styles.balancePanel}>
//               <Text style={styles.balanceLabel}>Card Balance</Text>
//               <Text style={styles.balanceAmount}>{formatCurrency(balance)}</Text>
//               <Text style={styles.balanceSubtext}>
//                 {summary.bill_month_year
//                   ? `Bill cycle ${summary.bill_month_year}`
//                   : 'Account overview'}
//               </Text>
//             </View>
//           </View>
//         </View>

//         <View style={styles.snapshotCard}>
//           <View style={styles.snapshotHeaderRow}>
//             <View style={{ flex: 1,width:'60%' }}>
//               <Text style={styles.snapshotTitle}>Subscription Summary</Text>
//               {/* <Text style={styles.snapshotSubtitle}>
//                 Card
//               </Text> */}
//             </View>
//             {/* <View
//               style={[
//                 styles.statusChip,
//                 {
//                   borderColor:
//                     summary.pay_status === 'Success'
//                       ? colors.success
//                       : colors.warning,
//                 },
//               ]}
//             >
//               <Text
//                 style={[
//                   styles.statusChipText,
//                   {
//                     color:
//                       summary.pay_status === 'Success'
//                         ? colors.success
//                         : colors.warning,
//                   },
//                 ]}
//               >
//                 {summary.pay_status?.toUpperCase() || 'PENDING'}
//               </Text>
//             </View> */}
//           </View>

//           <View style={styles.summaryMetricsGrid}>
//             {renderSummaryMetric('Last Bill Amount', summary.bill_amount, 'primary')}
//             {renderSummaryMetric(
//               'Subscription Balance',
//               summary.available_credit,
//              'primary'
//             )}
//             {renderSummaryMetric('Unbilled Credit', summary.unbilled_credit, 'primary')}
//             {renderSummaryMetric('Unbilled Debit', summary.unbilled_debit, 'primary')}
//           </View>

         
//         </View>

//         <View style={styles.analyticsSection}>
//           {/* <Text style={styles.sectionTitle}>Account overview</Text>
//           <Text style={styles.sectionSubtitle}>
//             Recent usage, recharge, and bill.
//           </Text> */}

//           {/* {homeDashboardQuery.isLoading && !homeDashboardQuery.data?.data ? (
//             <View style={styles.loadingCard}>
//               <ActivityIndicator color={colors.primary} />
//               <Text style={styles.loadingText}>Loading member dashboard...</Text>
//             </View>
//           ) : null}

//           {cards.length > 0 ? (
//             <View style={styles.analyticsCardGrid}>
//               {cards.map((card, index) => {
//                 const accentColor =
//                   card.tone === 'success'
//                     ? colors.success
//                     : card.tone === 'warning'
//                       ? colors.warning
//                       : card.tone === 'danger'
//                         ? colors.danger
//                         : card.tone === 'secondary'
//                           ? colors.secondary
//                           : colors.text;

//                 return (
//                   <View
//                     key={`${card.label}-${index}`}
//                     style={[styles.analyticsCard, { borderColor: accentColor }]}
//                   >
//                     <Text style={styles.analyticsLabel}>{card.label}</Text>
//                     <Text style={[styles.analyticsValue, { color: accentColor }]}>
//                       {formatMetricValue(card)}
//                     </Text>
//                     <Text style={styles.analyticsHelper}>{card.helper}</Text>
//                   </View>
//                 );
//               })}
//             </View>
//           ) : null} */}
//    <View style={styles.quickSection}>
//           <Text style={styles.sectionTitle}>Transactions & A/C</Text>
//           <Text style={styles.sectionSubtitle}>
//             Fast access to recharge, invoices, and account utilities.
//           </Text>

       
//           <View style={styles.quickListContent}>
//           {screens?.length > 0 ? (screens.map((screen, index) => (
//             renderQuickAction({ item: screen, index } as { item: MenuItem; index: number })
//           ))) : null}
//           </View>
//         </View>

//         <View style={styles.facilitySection}>
//           <Text style={styles.sectionTitle}>Club facilities</Text>
//           <Text style={styles.sectionSubtitle}>
//             Continue into member services.
//           </Text>
//           <View style={styles.facilityGrid}>{sections.map(renderSection)}</View>
//         </View>
//           {/* {insights.length > 0 ? (
//             <View style={styles.insightStack}>
//               {insights.map((insight, index) => {
//                 const accentColor =
//                   insight.tone === 'success'
//                     ? colors.success
//                     : insight.tone === 'warning'
//                       ? colors.warning
//                       : insight.tone === 'danger'
//                         ? colors.danger
//                         : insight.tone === 'secondary'
//                           ? colors.secondary
//                           : colors.primary;

//                 return (
//                   <View key={`${insight.title}-${index}`} style={styles.insightCard}>
//                     <View style={styles.insightHeaderRow}>
//                       <Text style={styles.insightTitle}>{insight.title}</Text>
//                       <Text style={[styles.insightValue, { color: accentColor }]}>
//                         {formatMetricValue(insight)}
//                       </Text>
//                     </View>
//                     <Text style={styles.insightDescription}>
//                       {insight.description}
//                     </Text>
//                   </View>
//                 );
//               })}
//             </View>
//           ) : null} */}

//           {trend.length > 0 ? (
//             <View style={styles.trendCard}>
//               <View style={styles.sectionHeaderRow}>
//                 <Text style={styles.subSectionTitle}>Monthly transactions</Text>
//                 <Text style={styles.subSectionMeta}>Last {trend.length} months</Text>
//               </View>
//               {trend.map((item, index) => (
//                 <View
//                   key={`${item.month_key}-${index}`}
//                   style={[
//                     styles.trendRow,
//                     index === 0 ? null : styles.trendRowBorder,
//                   ]}
//                 >
//                   <View>
//                     <Text style={styles.trendMonth}>{item.month_label}</Text>
//                     <Text style={styles.trendMeta}>
//                       {item.activity_count} transactions
//                     </Text>
//                   </View>

//                   <View style={styles.trendAmountWrap}>
//                     <Text style={styles.trendPositive}>
//                       + {formatCurrency(item.recharge_total)}
//                     </Text>
//                     <Text style={styles.trendNegative}>
//                       - {formatCurrency(item.spend_total)}
//                     </Text>
//                   </View>
//                 </View>
//               ))}
//             </View>
//           ) : null}

//           {/* {locationBreakdown.length > 0 || paymentModeBreakdown.length > 0 ? (
//             <View style={styles.breakdownCard}>
//               <View style={styles.sectionHeaderRow}>
//                 <Text style={styles.subSectionTitle}>Pattern breakdown</Text>
//                 <Text style={styles.subSectionMeta}>
//                   Top places and payment modes
//                 </Text>
//               </View>

//               {locationBreakdown.length > 0 ? (
//                 <View style={styles.breakdownGroup}>
//                   <Text style={styles.breakdownGroupTitle}>Top locations</Text>
//                   {locationBreakdown.map((item, index) =>
//                     renderBreakdownRow(item, index, 'map-marker-outline'),
//                   )}
//                 </View>
//               ) : null}

//               {paymentModeBreakdown.length > 0 ? (
//                 <View style={styles.breakdownGroup}>
//                   <Text style={styles.breakdownGroupTitle}>Preferred pay modes</Text>
//                   {paymentModeBreakdown.map((item, index) =>
//                     renderBreakdownRow(item, index, 'credit-card-outline'),
//                   )}
//                 </View>
//               ) : null}
//             </View>
//           ) : null} */}

//           {recentActivity.length > 0 ? (
//             <View style={styles.activityCard}>
//               <View style={styles.sectionHeaderRow}>
//                 <Text style={styles.subSectionTitle}>Recent activity</Text>
//                 {/* <Text style={styles.subSectionMeta}>Live movement snapshot</Text> */}
//               </View>

//               {recentActivity.map((item, index) => {
//                 const isPositive = Number(item.amount) >= 0;

//                 return (
//                   <View
//                     key={`${item.reference ?? item.title}-${index}`}
//                     style={[
//                       styles.activityRow,
//                       index === 0 ? null : styles.activityRowBorder,
//                     ]}
//                   >
//                     <View style={styles.activityIconWrap}>
//                       <MaterialCommunityIcons
//                         name={
//                           item.type === 'card'
//                             ? 'wallet-outline'
//                             : 'bank-transfer-out'
//                         }
//                         size={18}
//                         color={colors.text}
//                       />
//                     </View>

//                     <View style={styles.activityContent}>
//                       <Text style={styles.activityTitle}>{item.title}</Text>
//                       <Text style={styles.activitySubtitle}>
//                         {item.subtitle}
//                         {item.reference ? ` • ${item.reference}` : ''}
//                       </Text>
//                       <Text style={styles.activityDate}>
//                         {formatDateLabel(item.date)}
//                       </Text>
//                     </View>

//                     <Text
//                       style={[
//                         styles.activityAmount,
//                         { color: isPositive ? colors.success : colors.danger },
//                       ]}
//                     >
//                       {isPositive ? '+' : '-'} {formatCurrency(Math.abs(Number(item.amount)))}
//                     </Text>
//                   </View>
//                 );
//               })}
//             </View>
//           ) : null}
//         </View>

     
//       </ScrollView>

//       <OTPModal visible={otpModal} setVisible={setOTPModal} />
//       <InAppUpdate />
//       <MemberOrderTypeModal showTypes={orderType} setShowType={setOrderType} />
//     </View>
//   );
// };

// const createStyles = (colors: {
//   background: string;
//   primary: string;
//   secondary: string;
//   onPrimary: string;
//   surface: string;
//   surfaceAlt: string;
//   text: string;
//   textMuted: string;
//   border: string;
//   success: string;
//   warning: string;
//   danger: string;
// }) =>
//   StyleSheet.create({
//     container: {
//       flex: 1,
//       backgroundColor: colors.background,
//     },
//     scroll: {
//       backgroundColor: colors.primary,
//     },
//     scrollContent: {
//       paddingBottom: 34,
//       backgroundColor: colors.background,
//     },
//     header: {
//       overflow: 'hidden',
//       paddingTop: 10,
//       paddingHorizontal: 20,
//       paddingBottom: 42,
//       backgroundColor: colors.primary,
//       borderBottomLeftRadius: 30,
//       borderBottomRightRadius: 30,
//     },
//     headerGlowLarge: {
//       position: 'absolute',
//       width: 220,
//       height: 220,
//       borderRadius: 110,
//       backgroundColor: colors.secondary,
//       opacity: 0.50,
//       top: -80,
//       right: -50,
//     },
//     headerGlowSmall: {
//       position: 'absolute',
//       width: 140,
//       height: 140,
//       borderRadius: 70,
//       // backgroundColor: colors.danger,
//       backgroundColor:'rgba(84, 135, 107, 0.71)',
//       opacity: 0.3,
//       bottom: -50,
//       left: -20,
//     },
//     headerTopRow: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       justifyContent: 'space-between',
//     },
//     brandWrap: {
//       flexDirection: 'row',
//       alignItems: 'center',
//     },
//     logo: {
//       width: 30,
//       height: 30,
//       borderRadius: 15,
//       marginRight: 6,
//     },
//     brandText: {
//       color: colors.onPrimary,
//       fontSize: 20,
//       fontFamily: FONT_FAMILY.bold,
//     },
//     memberTag: {
//       paddingHorizontal: 10,
//       paddingVertical: 6,
//       borderRadius: 999,
//       backgroundColor: colors.background,
//       borderWidth:0.4,
//       borderColor: colors.border,
//     },
//     memberTagText: {
//       color: colors.text,
//       fontSize: 11,
//       fontFamily: FONT_FAMILY.semiBold,
//     },
//     heroContent: {
//       marginTop: 24,
//       flexDirection: 'row',
//       justifyContent: 'space-between',
//       alignItems: 'flex-end',
//     },
//     heroTextBlock: {
//       flex: 1,
//       paddingRight: 12,
//     },
//     greetingText: {
//       color: colors.textMuted,
//       fontSize: 13,
//       fontFamily: FONT_FAMILY.normal,
//       marginBottom: 4,
//     },
//     memberNameText: {
//       color: colors.onPrimary,
//       fontSize: 25,
//       fontFamily: FONT_FAMILY.bold,
//     },
//     memberMetaText: {
//       marginTop: 8,
//       color: colors.textMuted,
//       fontSize: 12,
//       fontFamily: FONT_FAMILY.normal,
//     },
//     balancePanel: {
//       minWidth: 150,
//       padding: 16,
//       borderRadius: 22,
//       backgroundColor: colors.surface,
//       borderWidth: 1,
//       borderColor: colors.border,
     
//     },
//     balanceLabel: {
//       color: colors.textMuted,
//       fontSize: 12,
//       fontFamily: FONT_FAMILY.normal,
//     },
//     balanceAmount: {
//       marginTop: 6,
//       color: colors.text,
//       fontSize: 24,
//       fontFamily: FONT_FAMILY.bold,
//     },
//     balanceSubtext: {
//       marginTop: 6,
//       color: colors.textMuted,
//       fontSize: 11,
//       fontFamily: FONT_FAMILY.normal,
//     },
//     snapshotCard: {
//       marginTop: -26,
//       marginHorizontal: 16,
//       padding: 18,
//       borderRadius: 24,
//       backgroundColor: colors.surface,
//       borderWidth: 1,
//       borderColor: colors.border,
//       shadowColor: '#000',
//       shadowOpacity: 0.08,
//       shadowRadius: 14,
//       shadowOffset: { width: 0, height: 6 },
//       elevation: 4,
//     },
//     snapshotHeaderRow: {
//       flexDirection: 'row',
//       justifyContent: 'space-between',
//       alignItems: 'flex-start',
//     },
//     snapshotTitle: {
//       color: colors.text,
//       fontSize: 17,
//       fontFamily: FONT_FAMILY.bold,
//     },
//     snapshotSubtitle: {
//       marginTop: 6,
//       color: colors.textMuted,
//       fontSize: 12,
//       lineHeight: 18,
//       fontFamily: FONT_FAMILY.normal,
//       // maxWidth: '88%',
//     },
//     statusChip: {
//       paddingHorizontal: 12,
//       paddingVertical: 7,
//       borderRadius: 999,
//       borderWidth: 1,
//       backgroundColor: colors.background,
//     },
//     statusChipText: {
//       fontSize: 11,
//       fontFamily: FONT_FAMILY.semiBold,
//     },
//     summaryMetricsGrid: {
//       flexDirection: 'row',
//       flexWrap: 'wrap',
//       justifyContent: 'space-between',
//       marginTop: 18,
//     },
//     summaryMetric: {
//       width: '48.5%',
//       backgroundColor: colors.background,
//       borderRadius: 18,
//       padding: 14,
//       marginBottom: 10,
//     },
//     summaryMetricLabel: {
//       color: colors.textMuted,
//       fontSize: 11,
//       fontFamily: FONT_FAMILY.normal,
//     },
//     summaryMetricValue: {
//       marginTop: 6,
//       fontSize: 16,
//       fontFamily: FONT_FAMILY.bold,
//     },
//     snapshotActionsRow: {
//       flexDirection: 'row',
//       justifyContent: 'space-between',
//       marginTop: 8,
//     },
//     primaryActionButton: {
//       flex: 1,
//       flexDirection: 'row',
//       alignItems: 'center',
//       justifyContent: 'center',
//       marginRight: 8,
//       paddingVertical: 14,
//       borderRadius: 16,
//       backgroundColor: colors.primary,
//     },
//     primaryActionText: {
//       marginLeft: 8,
//       color: colors.onPrimary,
//       fontSize: 13,
//       fontFamily: FONT_FAMILY.semiBold,
//     },
//     secondaryActionButton: {
//       flex: 1,
//       flexDirection: 'row',
//       alignItems: 'center',
//       justifyContent: 'center',
//       marginLeft: 8,
//       paddingVertical: 14,
//       borderRadius: 16,
//       backgroundColor: colors.surfaceAlt,
//     },
//     secondaryActionText: {
//       marginLeft: 8,
//       color: colors.primary,
//       fontSize: 13,
//       fontFamily: FONT_FAMILY.semiBold,
//     },
//     analyticsSection: {
//       marginTop: 18,
//       marginHorizontal: 16,
//     },
//     sectionTitle: {
//       color: colors.text,
//       fontSize: 18,
//       fontFamily: FONT_FAMILY.bold,
//     },
//     sectionSubtitle: {
//       color: colors.textMuted,
//       fontSize: 12,
//       lineHeight: 18,
//       marginTop: 4,
//       fontFamily: FONT_FAMILY.normal,
//     },
//     loadingCard: {
//       marginTop: 16,
//       borderRadius: 18,
//       padding: 18,
//       alignItems: 'center',
//       backgroundColor: colors.surface,
//       borderWidth: 1,
//       borderColor: colors.border,
//     },
//     loadingText: {
//       marginTop: 10,
//       color: colors.textMuted,
//       fontSize: 12,
//       fontFamily: FONT_FAMILY.normal,
//     },
//     analyticsCardGrid: {
//       flexDirection: 'row',
//       flexWrap: 'wrap',
//       justifyContent: 'space-between',
//       marginTop: 16,
//     },
//     analyticsCard: {
//       width: '48.5%',
//       borderRadius: 18,
//       padding: 14,
//       marginBottom: 10,
//       backgroundColor: colors.surface,
//       borderWidth: 1,
//     },
//     analyticsLabel: {
//       color: colors.textMuted,
//       fontSize: 11,
//       fontFamily: FONT_FAMILY.normal,
//     },
//     analyticsValue: {
//       marginTop: 8,
//       fontSize: 20,
//       fontFamily: FONT_FAMILY.bold,
//     },
//     analyticsHelper: {
//       marginTop: 6,
//       color: colors.textMuted,
//       fontSize: 11,
//       lineHeight: 16,
//       fontFamily: FONT_FAMILY.normal,
//     },
//     insightStack: {
//       marginTop: 8,
//     },
//     insightCard: {
//       marginTop: 10,
//       borderRadius: 18,
//       padding: 16,
//       backgroundColor: colors.surface,
//       borderWidth: 1,
//       borderColor: colors.border,

//     },
//     insightHeaderRow: {
//       flexDirection: 'row',
//       justifyContent: 'space-between',
//       alignItems: 'center',
//     },
//     insightTitle: {
//       color: colors.text,
//       fontSize: 14,
//       fontFamily: FONT_FAMILY.bold,
//       flex: 1,
//       paddingRight: 10,
//     },
//     insightValue: {
//       fontSize: 16,
//       fontFamily: FONT_FAMILY.bold,
//       maxWidth:'60%'
//     },
//     insightDescription: {
//       marginTop: 8,
//       color: colors.textMuted,
//       fontSize: 12,
//       lineHeight: 18,
//       fontFamily: FONT_FAMILY.normal,
//     },
//     trendCard: {
//       marginTop: 16,
//       borderRadius: 20,
//       padding: 16,
//       backgroundColor: colors.surface,
//       borderWidth: 1,
//       borderColor: colors.border,
//     },
//     sectionHeaderRow: {
//       flexDirection: 'row',
//       justifyContent: 'space-between',
//       alignItems: 'center',
//     },
//     subSectionTitle: {
//       color: colors.text,
//       fontSize: 15,
//       fontFamily: FONT_FAMILY.bold,
//       maxWidth:'70%'
//     },
//     subSectionMeta: {
//       color: colors.textMuted,
//       fontSize: 11,
//       fontFamily: FONT_FAMILY.normal,
//        maxWidth:'30%'
//     },
//     trendRow: {
//       flexDirection: 'row',
//       justifyContent: 'space-between',
//       alignItems: 'center',
//       paddingVertical: 14,
//     },
//     trendRowBorder: {
//       borderTopWidth: 1,
//       borderTopColor: colors.border,
//     },
//     trendMonth: {
//       color: colors.text,
//       fontSize: 13,
//       fontFamily: FONT_FAMILY.semiBold,
//     },
//     trendMeta: {
//       marginTop: 4,
//       color: colors.textMuted,
//       fontSize: 11,
//       fontFamily: FONT_FAMILY.normal,
//     },
//     trendAmountWrap: {
//       alignItems: 'flex-end',
//     },
//     trendPositive: {
//       color: colors.success,
//       fontSize: 12,
//       fontFamily: FONT_FAMILY.semiBold,
//     },
//     trendNegative: {
//       marginTop: 4,
//       color: colors.danger,
//       fontSize: 12,
//       fontFamily: FONT_FAMILY.semiBold,
//     },
//     breakdownCard: {
//       marginTop: 16,
//       borderRadius: 20,
//       padding: 16,
//       backgroundColor: colors.surface,
//       borderWidth: 1,
//       borderColor: colors.border,
//     },
//     breakdownGroup: {
//       marginTop: 14,
//     },
//     breakdownGroupTitle: {
//       color: colors.text,
//       fontSize: 13,
//       fontFamily: FONT_FAMILY.semiBold,
//       marginBottom: 4,
//     },
//     breakdownRow: {
//       flexDirection: 'row',
//       justifyContent: 'space-between',
//       alignItems: 'center',
//       paddingVertical: 12,
//     },
//     breakdownRowBorder: {
//       borderTopWidth: 1,
//       borderTopColor: colors.border,
//     },
//     breakdownLabelWrap: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       flex: 1,
//       paddingRight: 12,
//     },
//     breakdownIconWrap: {
//       width: 30,
//       height: 30,
//       borderRadius: 15,
//       alignItems: 'center',
//       justifyContent: 'center',
//       backgroundColor: colors.surfaceAlt,
//       marginRight: 10,
//     },
//     breakdownLabelBlock: {
//       flex: 1,
//     },
//     breakdownLabel: {
//       color: colors.text,
//       fontSize: 12,
//       fontFamily: FONT_FAMILY.semiBold,
//     },
//     breakdownMeta: {
//       marginTop: 3,
//       color: colors.textMuted,
//       fontSize: 11,
//       fontFamily: FONT_FAMILY.normal,
//     },
//     breakdownAmount: {
//       color: colors.text,
//       fontSize: 12,
//       fontFamily: FONT_FAMILY.bold,
//     },
//     activityCard: {
//       marginTop: 16,
//       borderRadius: 20,
//       padding: 16,
//       backgroundColor: colors.surface,
//       borderWidth: 1,
//       borderColor: colors.border,
//     },
//     activityRow: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       paddingVertical: 13,
//     },
//     activityRowBorder: {
//       borderTopWidth: 1,
//       borderTopColor: colors.border,
//     },
//     activityIconWrap: {
//       width: 36,
//       height: 36,
//       borderRadius: 18,
//       alignItems: 'center',
//       justifyContent: 'center',
//       backgroundColor: colors.surfaceAlt,
//       marginRight: 12,
//     },
//     activityContent: {
//       flex: 1,
//       paddingRight: 12,
//     },
//     activityTitle: {
//       color: colors.text,
//       fontSize: 13,
//       fontFamily: FONT_FAMILY.semiBold,
//     },
//     activitySubtitle: {
//       marginTop: 4,
//       color: colors.textMuted,
//       fontSize: 11,
//       fontFamily: FONT_FAMILY.normal,
//     },
//     activityDate: {
//       marginTop: 4,
//       color: colors.textMuted,
//       fontSize: 10,
//       fontFamily: FONT_FAMILY.normal,
//     },
//     activityAmount: {
//       fontSize: 12,
//       fontFamily: FONT_FAMILY.bold,
//     },
//     quickSection: {
//       // marginHorizontal: 16,
//       marginTop: 18,
//       padding: 16,
//       borderRadius: 20,
//       backgroundColor: colors.surface,
//       borderWidth: 1,
//       borderColor: colors.border,
//     },
//     quickListContent: {
// flexDirection:'row',
//       paddingTop: 14,
//       paddingRight: 8,
//       justifyContent:'space-around'
//     },
//     quickTile: {
//      flex:1,
//       borderRadius: 18,
//       alignItems: 'center',
//       justifyContent: 'center',
//       paddingVertical: 14,
//       paddingHorizontal: 10,
//     },
//     quickIconWrap: {
//       backgroundColor: colors.surfaceAlt,
//       justifyContent:'space-around',
//       padding: 12,
//       borderRadius: 16,
//       marginBottom: 8,
//     },
//     quickIcon: {
//       width: 34,
//       height: 34,
//     },
//     quickTitle: {
//       fontSize: 12,
//       fontFamily: FONT_FAMILY.semiBold,
//       color: colors.text,
//       textAlign: 'center',
//     },
//     facilitySection: {
//       // marginHorizontal: 16,
//       marginTop: 18,
//     },
//     facilityGrid: {
//       marginTop: 8,
//       paddingBottom: 8,
//     },
//     sectionContainer: {
//       marginBottom: 14,
//     },
//     row: {
//       flexDirection: 'row',
//     },
//     smallColumn: {
//       flex: 2,
//       justifyContent: 'space-between',
//     },
//     bigCard: {
//       flex: 1,
//       margin: 6,
//       borderRadius: 24,
//       padding: 18,
//       backgroundColor: colors.surface,
//       borderWidth: 1,
//       borderColor: colors.border,
//       shadowColor: '#000',
//       shadowOpacity: 0.06,
//       shadowRadius: 10,
//       shadowOffset: { width: 0, height: 4 },
//       elevation: 3,
//     },
//     bigTitle: {
//       fontSize: 14,
//       fontFamily: FONT_FAMILY.bold,
//       color: colors.text,
//     },
//     smallsubTitle: {
//       fontSize: 12,
//       fontFamily: FONT_FAMILY.light,
//       color: colors.textMuted,
//       marginTop: 4,
//       width: '70%',
//     },
//     bigIcon: {
//       width: 58,
//       height: 58,
//       position: 'absolute',
//       right: 12,
//       bottom: 12,
//       opacity: 0.95,
//     },
//     smallCard: {
//       margin: 6,
//       borderRadius: 18,
//       padding: 14,
//       borderWidth: 1,
//       borderColor: colors.border,
//       backgroundColor: colors.surface,
//       flexDirection: 'row',
//       alignItems: 'center',
//       shadowColor: '#000',
//       shadowOpacity: 0.05,
//       shadowRadius: 8,
//       shadowOffset: { width: 0, height: 3 },
//       elevation: 2,
//     },
//     smallTitle: {
//       fontSize: 16,
//       fontFamily: FONT_FAMILY.bold,
//       color: colors.text,
//       width: '70%',
//     },
//     smallIcon: {
//       width: 42,
//       height: 42,
//     },
//   });

// export default HomeScreen;
