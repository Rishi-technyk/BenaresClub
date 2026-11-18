import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  Image,
  ImageBackground,
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
import LinearGradient from 'react-native-linear-gradient';
import OTPModal from '../components/OTPModal';
import { FONT_FAMILY } from '../util/colors';
import useDashboardData, {
  AppBannerItem,
  HomeDashboardActivity,
  HomeDashboardSummary,
  HomeDashboardTrend,
  useAppBanner,
} from '../services/HomeApis';
import { RootState } from '../store/store';
import { useToast } from 'react-native-toast-notifications';
import InAppUpdate from '../components/InAppUpdate';
import { getDashboardConfig, getDrawerConfig } from '../config/dashboardConfig';
import EventModal from '../services/Events/EventModal';
import { javascriptGet } from '../util/api';
import MemberOrderTypeModal from '../components/MemberOrderTypeModal';
import { useAppTheme } from '../theme/AppThemeProvider';
import { DOMAIN } from '../util/constant';
import { getCurrentLocation } from '../util/locationHelper';
import UniversalModal from '../components/UniversalModal';
import ImageViewer from 'react-native-image-zoom-viewer';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const FACILITY_SLIDER_WIDTH = SCREEN_WIDTH - 32;

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

type HomeShortcut = {
  title: string;
  icon: string;
  route?: string;
  params?: any;
};


const formatCurrency = (value?: number | string | null) => {
  const amount = Number(value ?? 0);
  return `₹${Number.isFinite(amount) ? amount.toFixed(2) : '0.00'}`;
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
  const styles = useMemo(() => createStyles(colors), [colors]);
  const toast = useToast();
  const [orderType, setOrderType] = useState<boolean>(false);
  const [screens2, setScreens2] = useState<MenuItem[]>([]);
  const [screens, setScreens] = useState<MenuItem[]>([]);
  const [isDigitalCardVisible, setIsDigitalCardVisible] = useState(true);
  const [otpModal, setOTPModal] = useState<boolean>(false);
  const [contactInfo, setContactInfo] = useState<[]> ([]);
  // console.log( screens, '---------------------- screens ---------------------');
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [offerVisible, setOfferVisible] = useState<boolean>(false);
  const cardRevealAnim = useRef(new Animated.Value(0)).current;
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
  const latestActivityDate =
    analytics?.highlights?.latest_activity_date ||
    recentActivity?.[0]?.date ||
    null;
  const memberName =
    auth?.user?.DisplayName ||
    auth?.user?.MemberName ||
    auth?.user?.name ||
    auth?.user?.SC_ID ||
    'Member';

  const appBannerQuery = useAppBanner({
    token: token ?? '',
  });
  const loadContactInfo = async () => {
    try {
      const config = await getDrawerConfig();

      const contactMenu = config?.drawer_menu?.find(
        (item: any) => item.id == 7
      );

      if (contactMenu?.params) {
        const parsedContactInfo = JSON.parse(contactMenu.params);

 
        setContactInfo(contactMenu);
      }
    } catch (error) {
      console.error('Error fetching contact info:', error);
      setContactInfo([]);
    }
  };

  const summary: HomeDashboardSummary = homeDashboardQuery.data?.data?.summary ?? {};
  const analytics = homeDashboardQuery.data?.data?.analytics ?? {};
  const appBanners = appBannerQuery.data?.data ?? [];
  const trend: HomeDashboardTrend[] = analytics.monthly_trend ?? [];
  const recentActivity: HomeDashboardActivity[] =
    analytics.recent_activity ?? [];
  const balance = Number(summary.current_balance ?? 0);
  const memberCode = `${auth?.user?.MemberID}/${auth?.user?.SC_ID}` ?? '';

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
 const validateClubLocation = async () => {
    try {
      
      if(summary.location_enable==='Inactive'){
        return true
      }
      const location = await getCurrentLocation() as
        | { latitude: number; longitude: number }
        | null;
    
      if (!location) return false;

      const distance = getDistance(
        {
          latitude: location.latitude,
          longitude: location.longitude,
        },
       {latitude:Number(Number(summary?.latitude).toFixed(6)),
        longitude:Number(Number(summary?.longitude).toFixed(6)) ,
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
      Alert.alert('Location Error', e instanceof Error ? e.message : 'Unable to read location.');

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

loadContactInfo()
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
        appBannerQuery.refetch(),
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

  const sections = useMemo(() => chunkArray(screens2, 3), [screens2]);

  const navigateModule = async(item: MenuItem, includeBalance?: boolean) => {
    if (item.navigate === 'FoodOrder' || item.navigate === 'FoodMenu') {
      setOrderType(true);
      return;
    }

    if (includeBalance && item.name === 'Card' && item.navigate) {
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

  const navigateShortcut = (shortcut: HomeShortcut) => {
    if (!shortcut.route) {
      toast.show('Feature coming soon...', { type: 'warning' });
      return;
    }



    navigation.navigate(shortcut.route, shortcut.params);
  };

  const handleRevealDigitalCard = () => {
    setIsDigitalCardVisible(true);
    Animated.timing(cardRevealAnim, {
      toValue: 1,
      duration: 320,
      useNativeDriver: true,
    }).start();
  };

  const handleHideDigitalCard = () => {
    Animated.timing(cardRevealAnim, {
      toValue: 0,
      duration: 220,
      useNativeDriver: true,
    }).start(() => {
      setIsDigitalCardVisible(false);
    });
  };

  const navigateBanner = useCallback((banner: AppBannerItem) => {
    if (banner.navigation) {
      navigation.navigate(banner.navigation, banner.data);
    }
  }, [navigation]);

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

  const numericValue = Number(value ?? 0);
  const isNegative = Number.isFinite(numericValue) && numericValue < 0;

  const formattedValue = isNegative
    ? `-${formatCurrency(Math.abs(numericValue))}`
    : formatCurrency(value);

  return (
    <View style={styles.summaryMetric}>
      <Text style={styles.summaryMetricLabel}>{label}</Text>
      <Text style={[styles.summaryMetricValue, { color: valueColor }]}>
        {formattedValue}
      </Text>
    </View>
  );
};
  const renderDigitalCard = () => {
    if (!isDigitalCardVisible) {
      return (
        <TouchableOpacity
          activeOpacity={0.86}
          style={styles.membershipCardRevealButton}
          onPress={handleRevealDigitalCard}
        >
          <View style={styles.revealIconWrap}>
            <MaterialCommunityIcons
              name="card-account-details-outline"
              size={28}
              color={colors.primary}
            />
          </View>
          <View style={styles.revealTextBlock}>
            <Text style={styles.revealTitle}>Membership Card</Text>
            <Text style={styles.revealSubtitle}>
              Tap to show your digital card
            </Text>
          </View>
          <MaterialCommunityIcons
            name="chevron-down"
            size={24}
            color={colors.textMuted}
          />
        </TouchableOpacity>
      );
    }

    const animatedStyle = {
      // opacity: cardRevealAnim,
      transform: [
        {
          scale: cardRevealAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [0.94, 1],
          }),
        },
      ],
    };

    return (
      <Animated.View style={[styles.membershipCardPressable, animatedStyle]}>
        <Pressable onPress={() => navigation.navigate('Profile')}>
          <ImageBackground
            source={
              summary.app_card_image || summary.app_card_banner
                ? { uri: summary.app_card_image || summary.app_card_banner || '' }
                : require('../../assets/images/Logo.png')
            }
            resizeMode="stretch"
            imageStyle={styles.digitalCardImage}
            style={styles.digitalCard}
          >
            <TouchableOpacity
              activeOpacity={0.82}
              style={styles.hideCardButton}
              onPress={handleHideDigitalCard}
            >
              <MaterialCommunityIcons
                name="eye-off-outline"
                size={16}
                color="#ffffff"
              />
              <Text style={styles.hideCardText}>Hide</Text>
            </TouchableOpacity>
            <View style={styles.digitalCardContent}>
          <Image
            source={{uri:auth?.user?.profile_image ? `${DOMAIN.API_IMAGE_URL}${auth?.user.profile_image}`
                : 'https://randomuser.me/api/portraits/men/1.jpg'}}
            style={styles.digitalCardAvatar}
          />
          <View style={styles.digitalCardContentInfo}>

            <Text style={styles.digitalCardName}>{auth?.user?.DisplayName ?? ''}</Text>
            <Text style={styles.digitalCardNumber}>{memberCode}</Text>
          </View>
            </View>
          </ImageBackground>
        </Pressable>
      </Animated.View>
    );
  };

  

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
            tintColor={colors.secondary}

          />
        }
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
      >
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

         
        <View style={styles.dashboardBody}>
          {renderDigitalCard()}
          <FacilitySlider
            appBanners={appBanners}
            styles={styles}
            onBannerPress={navigateBanner}
          />


          <View style={styles.snapshotCard}>
            <View style={styles.snapshotHeaderRow}>
              <View style={styles.snapshotTitleBlock}>
                <Text style={styles.snapshotTitle}>Account Summary</Text>
                <Text style={styles.snapshotSubtitle}>
                  Card balance, credit limit, and dues.
                </Text>
              </View>
             
            </View>

                    <View style={styles.summaryMetricsGrid}>
              {renderSummaryMetric('Allocated Limit', summary.credit_limit, 'primary')}
              {renderSummaryMetric(
              'Utilized Limit',
                Number(summary.outstanding_amount ?? 0),
                Number(summary?.outstanding_amount ?? 0) >= 0 ? 'warning' : 'success',
              )}
              {renderSummaryMetric('Available Limit', summary.available_credit, 'success')}
              {/* {renderSummaryMetric('Last Bill', summary.bill_amount, 'primary')} */}
            </View>
    {screens.find(i=>i.navigate==='Recharge') ? <View style={[styles.summaryMetric]}>
                <Text style={styles.summaryMetricLabel}>Card Balance</Text>
                <Text style={styles.balanceAmount}>{formatCurrency(balance)}</Text>
              </View>:null}
          </View>

       
          {screens?.length > 0 ? (
            <View style={styles.quickSection}>
              <Text style={styles.sectionTitle}>Transactions & A/C</Text>
              <Text style={styles.sectionSubtitle}>
                Fast access to recharge, invoices, and account utilities.
              </Text>
              <View style={styles.quickListContent}>
                {screens.map(screen => renderQuickAction({ item: screen }))}
              </View>
            </View>
          ) : null}

          {sections.length > 0 ? (
            <View style={styles.facilitySection}>
              <Text style={styles.sectionTitle}>More Club Services</Text>
              <Text style={styles.sectionSubtitle}>
                Continue into member services.
              </Text>
              <View style={styles.facilityGrid}>{sections.map(renderSection)}</View>
            </View>
          ) : null}
        
<UniversalModal visible={offerVisible?.name} isFull={true} setVisible={()=>setOfferVisible(false)}>
<View>
     <Text style={[styles.sectionSubtitle,{fontSize:19,color:colors.text,marginBottom:10}]}>
                    {offerVisible?.name}
                  </Text>
     <Text style={[styles.sectionSubtitle,{fontSize:16}]}>
                    {offerVisible?.description}
                  </Text>
</View>

 {/* <Image
                  source={{uri:offerVisible?.image}}
                  // width={'100'}
                  style={{borderRadius:10,marginTop:10}}
                  // resizeMode='cover'
                  width={'100%'}
                  /> */}
                   <ImageViewer
                      imageUrls={[{ url: offerVisible?.image }]}
                      // enableSwipeDown
                      // onSwipeDown={() => setOfferVisible(false)}
                      saveToLocalByLongPress={true}
                      backgroundColor={colors.primary}
                      renderIndicator={() => null}
                    />
</UniversalModal>
          

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
            {homeDashboardQuery.data?.data?.services_offered?.length &&(
            <View style={[styles.snapshotCard,{backgroundColor:colors.background}]}>
              <Text style={styles.sectionTitle}>Services Offered</Text>
              
              <ScrollView horizontal style={styles.facilityGrid}>{homeDashboardQuery.data?.data?.services_offered?.map((item)=>(
                <Pressable
                onPress={()=>setOfferVisible(item)}
                 style={{backgroundColor:colors.surface,padding:10,minWidth:140,marginHorizontal:10,borderRadius:10,borderColor:colors.border,borderWidth:1,}}>
                  <Text style={[styles.sectionSubtitle,{fontSize:16}]}>
                    {item.name}
                  </Text>
                  <Image
                  source={{uri:item.image}}
                  // width={'100'}
                  style={{borderRadius:10,marginTop:10}}
                  resizeMode='stretch'
                  height={100}
                  />
                  </Pressable>
              ))}</ScrollView>
            </View>
          )}
        </View>
        

     
      </ScrollView>

      <OTPModal visible={otpModal} setVisible={setOTPModal} />
      <InAppUpdate />
      <MemberOrderTypeModal showTypes={orderType} setShowType={setOrderType} />
    </View>
  );
};

type FacilitySliderProps = {
  appBanners: AppBannerItem[];
  styles: ReturnType<typeof createStyles>;
  onBannerPress: (banner: AppBannerItem) => void;
};

const FacilitySlider = React.memo(({
  appBanners,
  styles,
  onBannerPress,
}: FacilitySliderProps) => {
  const bannerScrollRef = useRef<ScrollView>(null);
  const [activeBannerIndex, setActiveBannerIndex] = useState(0);
  const sliderItems: Array<AppBannerItem | null> =
    appBanners.length > 0 ? appBanners : [null];

  useEffect(() => {
    setActiveBannerIndex(0);
    bannerScrollRef.current?.scrollTo({ x: 0, animated: false });
  }, [appBanners.length]);

  useEffect(() => {
    if (appBanners.length <= 1) {
      return undefined;
    }

    const timer = setInterval(() => {
      setActiveBannerIndex(currentIndex => {
        const nextIndex = (currentIndex + 1) % appBanners.length;
        bannerScrollRef.current?.scrollTo({
          x: nextIndex * (FACILITY_SLIDER_WIDTH + 12),
          animated: true,
        });
        return nextIndex;
      });
    }, 3500);

    return () => clearInterval(timer);
  }, [appBanners.length]);

  return (
    <View style={styles.facilitySliderWrap}>
      <ScrollView
        ref={bannerScrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        snapToInterval={FACILITY_SLIDER_WIDTH + 12}
        decelerationRate="fast"
        onMomentumScrollEnd={event => {
          const offsetX = event.nativeEvent.contentOffset.x;
          const nextIndex = Math.round(offsetX / (FACILITY_SLIDER_WIDTH + 12));
          setActiveBannerIndex(nextIndex);
        }}
      >
        {sliderItems.map((banner, index) => (
          <TouchableOpacity
            key={banner?.id ?? 'fallback-banner'}
            activeOpacity={banner?.navigation ? 0.86 : 1}
            style={[
              styles.facilitySliderCard,
              { width: FACILITY_SLIDER_WIDTH },
              index < sliderItems.length - 1 ? styles.facilitySliderCardGap : null,
            ]}
            onPress={() => banner && onBannerPress(banner)}
          >
            <ImageBackground
              source={
                banner?.image
                  ? { uri: banner.image }
                  : require('../../assets/images/coverb.jpg')
              }
              style={styles.facilitySliderImage}
              imageStyle={styles.facilitySliderImageStyle}
              resizeMode="cover"
            >
              <LinearGradient
                colors={['rgba(15, 24, 49, 0.06)', 'rgba(15, 24, 49, 0.74)']}
                style={styles.facilitySliderOverlay}
              />
              <View style={styles.facilitySliderCopy}>
                <Text style={styles.facilitySliderTitle}>
                  {banner?.title || 'Club Facilities'}
                </Text>
                <Text style={styles.facilitySliderText} numberOfLines={2}>
                  {banner?.sub_title || 'Explore dining, bookings, activities, and member services.'}
                </Text>
              </View>
            </ImageBackground>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <View style={styles.sliderDots}>
        {sliderItems.map((banner, index) => (
          <View
            key={banner?.id ?? `fallback-dot-${index}`}
            style={index === activeBannerIndex ? styles.sliderDotActive : styles.sliderDot}
          />
        ))}
      </View>
    </View>
  );
});

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
      paddingBottom: 36,
      backgroundColor: colors.background,
    },
    header: {
      paddingTop: 10,
      paddingHorizontal: 16,
      paddingBottom: 12,
      backgroundColor: colors.background,
    },
    headerTopRow: {
      backgroundColor:colors.primary,
    padding:10,
    paddingHorizontal:18,
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
      color: 'white',
      fontSize: 20,
      fontFamily: FONT_FAMILY.bold,
    },
    menuButton: {
      width: 42,
      height: 42,
      borderRadius: 12,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    logoHero: {
      alignItems: 'center',
      justifyContent: 'center',
      flex: 1,
    },
    logoLarge: {
      width: 72,
      height: 72,
      resizeMode: 'contain',
      marginBottom: 4,
    },
    headerLinksRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 12,
    },
    headerLink: {
      width: '48.5%',
      minHeight: 46,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 10,
    },
    headerLinkText: {
      flex: 1,
      marginLeft: 8,
      color: colors.text,
      fontSize: 11,
      lineHeight: 15,
      fontFamily: FONT_FAMILY.semiBold,
    },
    dashboardBody: {
      paddingHorizontal: 16,
      marginTop:10,
      backgroundColor:colors.background
    },
    // brandText: {
    //   color: colors.text,
    //   fontSize: 18,
    //   fontFamily: FONT_FAMILY.bold,
    //   textAlign: 'center',
    // },
    memberTag: {
      minWidth: 42,
      minHeight: 42,
      paddingHorizontal: 8,
      borderRadius: 12,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    memberTagText: {
      color: colors.text,
      fontSize: 11,
      fontFamily: FONT_FAMILY.semiBold,
    },
    facilitySliderWrap: {
      marginBottom: 16,
    },
    facilitySliderCard: {
      height: 172,
      borderRadius: 14,
      overflow: 'hidden',
      backgroundColor: '#1f8f98',
      borderWidth: 1,
      borderColor: colors.border,
    },
    facilitySliderCardGap: {
      marginRight: 12,
    },
    facilitySliderImage: {
      width: '100%',
      height: '100%',
    },
    facilitySliderImageStyle: {
      borderRadius: 14,
    },
    facilitySliderOverlay: {
      ...StyleSheet.absoluteFillObject,
    },
    facilitySliderCopy: {
      position: 'absolute',
      left: 16,
      right: 16,
      bottom: 18,
    },
    facilitySliderTitle: {
      color: '#ffffff',
      fontSize: 20,
      fontFamily: FONT_FAMILY.bold,
    },
    facilitySliderText: {
      marginTop: 4,
      color: 'rgba(255, 255, 255, 0.88)',
      fontSize: 12,
      lineHeight: 17,
      fontFamily: FONT_FAMILY.normal,
      maxWidth: '82%',
    },
    sliderDots: {
      position: 'absolute',
      right: 16,
      bottom: 20,
      flexDirection: 'row',
      alignItems: 'center',
    },
    sliderDotActive: {
      width: 18,
      height: 6,
      borderRadius: 3,
      backgroundColor: '#ffffff',
      marginLeft: 5,
    },
    sliderDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: 'rgba(255, 255, 255, 0.55)',
      marginLeft: 5,
    },
    memberIntroRow: {
      marginTop: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    memberIntroText: {
      flex: 1,
    },
    greetingText: {
      color: colors.textMuted,
      fontSize: 13,
      fontFamily: FONT_FAMILY.normal,
      marginBottom: 4,
    },
    memberNameText: {
      color: colors.text,
      fontSize: 24,
      fontFamily: FONT_FAMILY.bold,
    },
    memberMetaText: {
      marginTop: 6,
      color: colors.textMuted,
      fontSize: 12,
      lineHeight: 17,
      fontFamily: FONT_FAMILY.normal,
    },
    membershipCardPressable: {
      marginBottom: 14,
    },
    membershipCardRevealButton: {
      minHeight: 92,
      marginBottom: 14,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
    },
    revealIconWrap: {
      width: 48,
      height: 48,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surfaceAlt,
      marginRight: 12,
    },
    revealTextBlock: {
      flex: 1,
      paddingRight: 10,
    },
    revealTitle: {
      color: colors.text,
      fontSize: 15,
      fontFamily: FONT_FAMILY.bold,
    },
    revealSubtitle: {
      marginTop: 4,
      color: colors.textMuted,
      fontSize: 12,
      fontFamily: FONT_FAMILY.normal,
    },
    digitalCard: {
      minHeight: 194,
      borderRadius: 18,
      overflow: 'hidden',
      backgroundColor: colors.surface,
      shadowColor: '#000',
      shadowOpacity: 0.14,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 8 },
      elevation: 6,
      alignItems: 'flex-end',
      padding: 12,
    },
    digitalCardAvatar: {
      width: 60,
      height: 70,
      borderRadius: 10,
      backgroundColor: '#ffffff',
      marginBottom: 8,
    },
    digitalCardContent: {
      position: 'absolute',

      left: 18,
      bottom: 18,
    },
    digitalCardName: {
      color: '#ffffff',
      fontSize: 15,
      
      fontFamily: FONT_FAMILY.bold,
     
    },
    digitalCardContentInfo:{
 borderRadius: 10,
        padding: 4,
      backgroundColor: 'rgba(255, 255, 255, 0.18)',
    },
    digitalCardNumber: {
      marginTop: 4,
      color: 'rgba(255, 255, 255, 0.78)',
      fontSize: 11,
      fontFamily: FONT_FAMILY.normal,
    
    },
    digitalCardImage: {
      borderRadius: 18,
    },
    digitalCardBackgroundImage: {
      opacity: 0.16,
      width: 170,
      height: 170,
      right: -16,
      top: 16,
      left: undefined,
      bottom: undefined,
    },
    digitalCardGradient: {
      minHeight: 194,
      padding: 18,
    },
    digitalCardGlowTop: {
      position: 'absolute',
      width: 170,
      height: 72,
      top: -26,
      right: -34,
      backgroundColor: 'rgba(255, 255, 255, 0.16)',
      transform: [{ rotate: '-18deg' }],
    },
    digitalCardGlowBottom: {
      position: 'absolute',
      width: 230,
      height: 80,
      bottom: -42,
      left: -38,
      backgroundColor: 'rgba(0, 0, 0, 0.16)',
      transform: [{ rotate: '-12deg' }],
    },
    digitalCardTopRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
    },
    digitalCardRightActions: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    hideCardButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 9,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: 'rgba(255, 255, 255, 0.18)',
      marginRight: 10,
    },
    hideCardText: {
      marginLeft: 4,
      color: '#ffffff',
      fontSize: 10,
      fontFamily: FONT_FAMILY.semiBold,
    },
    digitalCardBank: {
      color: '#ffffff',
      fontSize: 15,
      fontFamily: FONT_FAMILY.bold,
    },
    digitalCardSubtext: {
      marginTop: 4,
      color: 'rgba(255, 255, 255, 0.78)',
      fontSize: 11,
      fontFamily: FONT_FAMILY.normal,
           borderRadius: 999,
      backgroundColor: 'rgba(255, 255, 255, 0.18)',
    },
    digitalCardLogo: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: '#ffffff',
    },
    cardChipRow: {
      marginTop: 28,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    cardChip: {
      width: 48,
      height: 36,
      borderRadius: 8,
      backgroundColor: '#ddb85c',
      padding: 8,
      justifyContent: 'space-around',
    },
    cardChipLine: {
      height: 2,
      borderRadius: 1,
      backgroundColor: 'rgba(91, 62, 13, 0.55)',
    },
    cardChipLineShort: {
      width: '64%',
      height: 2,
      borderRadius: 1,
      backgroundColor: 'rgba(91, 62, 13, 0.55)',
    },
    cardNetwork: {
      color: '#ffffff',
      fontSize: 22,
      fontFamily: FONT_FAMILY.bold,
      letterSpacing: 0,
    },
    cardNumber: {
      marginTop: 20,
      color: '#ffffff',
      fontSize: 20,
      fontFamily: FONT_FAMILY.semiBold,
      letterSpacing: 0,
    },
    digitalCardBottomRow: {
      marginTop: 20,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
    },
    digitalCardInfoBlock: {
      flex: 1,
      paddingRight: 12,
    },
    digitalCardInfoBlockRight: {
      width: '38%',
      alignItems: 'flex-end',
    },
    digitalCardLabel: {
      color: 'rgba(255, 255, 255, 0.68)',
      fontSize: 9,
      textTransform: 'uppercase',
      fontFamily: FONT_FAMILY.semiBold,
    },
    digitalCardValue: {
      marginTop: 4,
      color: '#ffffff',
      fontSize: 13,
      fontFamily: FONT_FAMILY.bold,
    },
    utilityGrid: {
      marginTop: 16,
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
    },
    utilityTile: {
      width: '31.5%',
      minHeight: 78,
      borderRadius: 8,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 9,
      marginBottom: 10,
    },
    utilityTileText: {
      marginTop: 7,
      color: colors.text,
      fontSize: 11,
      lineHeight: 15,
      textAlign: 'center',
      fontFamily: FONT_FAMILY.semiBold,
    },
    balancePill: {
      minWidth: 110,
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 9,
      backgroundColor: colors.background,
      // alignItems: 'center',
      flexDirection:'row',
      justifyContent:'space-between'
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
    balanceLabel: {
      color: colors.textMuted,
      fontSize: 10,
      fontFamily: FONT_FAMILY.normal,
    },
    balanceAmount: {
      marginTop: 3,
      color: colors.text,
      fontSize: 15,
      fontFamily: FONT_FAMILY.bold,
    },
    balanceSubtext: {
      marginTop: 6,
      color: colors.textMuted,
      fontSize: 11,
      fontFamily: FONT_FAMILY.normal,
    },
    snapshotCard: {
      marginTop: 6,
      padding: 18,
      borderRadius: 12,
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
    snapshotTitleBlock: {
      flex: 1,
      paddingRight: 12,
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
      // flexDirection: 'row',
      // flexWrap: 'wrap',
      justifyContent: 'space-between',
      marginTop: 18,
    },
    summaryMetric: {
      // width: '48.5%',
      flexDirection:'row',
      alignItems:'center',
      justifyContent:'space-between',
      backgroundColor: colors.background,
      borderRadius: 8,
      padding: 14,
      marginBottom: 10,
    },
    summaryMetricLabel: {
      color: colors.text,
      fontSize: 14,
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
        balancePanel: {
      minWidth: 150,
      padding: 16,
      borderRadius: 22,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
     
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
      borderRadius: 12,
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
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 14,
      paddingHorizontal: 10,
    },
    quickIconWrap: {
      backgroundColor: colors.surfaceAlt,
      justifyContent:'space-around',
      padding: 12,
      borderRadius: 8,
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
      borderRadius: 12,
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
      borderRadius: 12,
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
    bookingPanel: {
      marginTop: 8,
      borderRadius: 12,
      padding: 10,
      backgroundColor: '#08111f',
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
    },
    bookingTile: {
      width: '48.5%',
      minHeight: 78,
      borderRadius: 10,
      backgroundColor: '#111a2d',
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.07)',
      padding: 12,
      marginBottom: 10,
      overflow: 'hidden',
    },
    bookingTileTall: {
      minHeight: 112,
    },
    bookingTileWide: {
      width: '100%',
      minHeight: 76,
      flexDirection: 'row',
      alignItems: 'center',
    },
    bookingTileIconWrap: {
      width: 36,
      height: 36,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(255, 255, 255, 0.08)',
      marginBottom: 12,
    },
    bookingTileTextBlock: {
      flex: 1,
    },
    bookingTileTitle: {
      color: '#ffffff',
      fontSize: 13,
      lineHeight: 18,
      fontFamily: FONT_FAMILY.bold,
    },
    bookingTileSubtitle: {
      marginTop: 5,
      color: 'rgba(255, 255, 255, 0.62)',
      fontSize: 10,
      lineHeight: 14,
      fontFamily: FONT_FAMILY.normal,
    },
  });

export default HomeScreen;


// import React, { useEffect, useState } from 'react';
// import {
//   Alert,
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
// import { getDistance } from 'geolib';
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
// import { getCurrentLocation } from '../util/locationHelper';

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

// const formatMetricValue = ({
//   value,
//   prefix,
//   suffix,
// }: {
//   value?: number | string;
//   prefix?: string;
//   suffix?: string;
// }) => {
//   if (typeof value === 'number') {
//     const decimals = prefix ? 2 : suffix === '%' ? 1 : Number.isInteger(value) ? 0 : 1;
//     const formatted = value.toFixed(decimals);
//     return `${prefix ?? ''}${formatted}${suffix ? ` ${suffix}` : ''}`.trim();
//   }

//   if (typeof value === 'string' && value.trim().length > 0) {
//     return `${prefix ?? ''}${value}${suffix ? ` ${suffix}` : ''}`.trim();
//   }

//   return suffix ? `0 ${suffix}` : `${prefix ?? ''}0`;
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

//   const trend: HomeDashboardTrend[] = analytics.monthly_trend ?? [];
  
//   const recentActivity: HomeDashboardActivity[] =
//     analytics.recent_activity ?? [];
//   const balance = Number(summary.current_balance ?? 0);
  // const memberName =
  //   auth?.user?.DisplayName ||
  //   auth?.user?.MemberName ||
  //   auth?.user?.name ||
  //   auth?.user?.SC_ID ||
  //   'Member';
//   const memberCode = auth?.user?.SC_ID ?? '';

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
//   console.log( summary, '---------------------- summary.location_enable ---------------------');
//  const validateClubLocation = async () => {
//     try {
      
//       if(summary.location_enable==='Inactive'){
//         return true
//       }
//       const location = await getCurrentLocation();
    
//       if (!location) return false;

//       const distance = getDistance(
//         {
//           latitude: location.latitude,
//           longitude: location.longitude,
//         },
//        {latitude:Number(summary?.latitude).toFixed(6),
//         longitude:Number(summary?.longitude).toFixed(6) ,
//        },
//       );

//       if (distance <= Number(summary?.radius)) {
//         return true;
//       }

//       Alert.alert(
//         'Outside Club',
//         `OTP feature unavailable outside the club. Please move inside to proceed.`,
//       );

//       return false;
//     } catch (e) {
//       Alert.alert('Location Error', e.message);

//       return false;
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

//   const navigateModule = async(item: MenuItem, includeBalance?: boolean) => {
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
//       setRefreshing(true)
//       const allowed = await validateClubLocation();
//  setRefreshing(false)
//       if (allowed) {
//         setOTPModal(true);
//       }
//       return;
//     }

//     toast.show('Feature coming soon...', { type: 'warning' });
//   };

//   const renderBigCard = (item: MenuItem) => (
//     <Pressable style={styles.bigCard} onPress={() => navigateModule(item)}>
//       <Text style={styles.bigTitle}>{item.name}</Text>
//       <Text style={styles.smallsubTitle} numberOfLines={4}>{item.subTitle}</Text>
//       <Image
//         source={{ uri: `${DOMAIN.IMG}icons/${item.icon}` }}
//         style={styles.bigIcon}
//       />
//     </Pressable>
//   );

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

        //   <View style={styles.heroContent}>
        //     <View style={styles.heroTextBlock}>
        //       <Text style={styles.greetingText}>Welcome back</Text>
        //       <Text style={styles.memberNameText}>{memberName}</Text>
        //       <Text style={styles.memberMetaText}>
        //         Last activity: {formatDateLabel(latestActivityDate)}
        //       </Text>
        //     </View>

        //     <View style={styles.balancePanel}>
        //       <Text style={styles.balanceLabel}>Card Balance</Text>
        //       <Text style={styles.balanceAmount}>{formatCurrency(balance)}</Text>
        //       <Text style={styles.balanceSubtext}>
        //         {summary.bill_month_year
        //           ? `Bill cycle ${summary.bill_month_year}`
        //           : 'Account overview'}
        //       </Text>
        //     </View>
        //   </View>
        // </View>

//         <View style={styles.snapshotCard}>
//           <View style={styles.snapshotHeaderRow}>
//             <View style={{ flex: 1,width:'60%' }}>
//               <Text style={styles.snapshotTitle}>Subscription Summary</Text>
          
//             </View>
           
//           </View>

//           <View style={styles.summaryMetricsGrid}>
//             {/* {renderSummaryMetric('Amount Payable', summary.amount_payable, 'warning')} */}
//             {renderSummaryMetric(
//               'Credit Limit',
//               summary.credit_limit,
//               Number(summary.credit_limit ?? 0) < 0 ? 'primary' : 'primary',
//             )}
//             {renderSummaryMetric(
//               'Available Limit',
//               summary.available_credit,
//               'primary',
//             )}
//             {/* {renderSummaryMetric('Outstanding',  '')} */}
// <View style={{backgroundColor:colors.background,flex:1,borderRadius:10,padding:10}}>
//              <Text style={styles.summaryMetricLabel}>{summary?.outstanding_amount >= 0?'Due Amount':'Advance Amount'}</Text>
//         <Text style={[styles.summaryMetricValue,{color:colors.text}]}>
//           {formatCurrency(summary.outstanding_amount)}
//         </Text>

// </View>
    
//           </View>

         
//         </View>

//         <View style={styles.analyticsSection}>
        
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
    // heroContent: {
    //   marginTop: 24,
    //   flexDirection: 'row',
    //   justifyContent: 'space-between',
    //   alignItems: 'flex-end',
    // },
    // heroTextBlock: {
    //   flex: 1,
    //   paddingRight: 12,
    // },
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
    // summaryMetricsGrid: {
    //   flexDirection: 'row',
    //   flexWrap: 'wrap',
    //   justifyContent: 'space-between',
    //   marginTop: 18,
    // },
    // summaryMetric: {
    //   width: '48.5%',
    //   backgroundColor: colors.background,
    //   borderRadius: 18,
    //   padding: 14,
    //   marginBottom: 10,
    // },
//     summaryMetricLabel: {
//       color: colors.textMuted,
//       fontSize: 11,
//       fontFamily: FONT_FAMILY.normal,
//     },
    // summaryMetricValue: {
    //   marginTop: 6,
    //   fontSize: 16,
    //   fontFamily: FONT_FAMILY.bold,
    // },
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
//