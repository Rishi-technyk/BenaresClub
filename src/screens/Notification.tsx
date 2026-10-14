import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, Image } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import moment from 'moment';
import { FONT_FAMILY } from '../util/colors';
import { useSelector } from 'react-redux';
import LinearGradient from 'react-native-linear-gradient';
import { createShimmerPlaceholder } from 'react-native-shimmer-placeholder';
import Header from '../components/Header';
import { Card } from 'react-native-paper';
import { ENDPOINT } from '../util/constant';
import { javascriptGet } from '../util/api';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppStackParamList } from '../navigation/AppDrawer';
import { RootState } from '../store/store';
import { useAppTheme } from '../theme/AppThemeProvider';


const ShimmerPlaceholder = createShimmerPlaceholder(LinearGradient);
type Props = NativeStackScreenProps<AppStackParamList, 'Notification'>;
const NotificationListScreen: React.FC<Props> = ({ navigation, route }) => {
  const [notificationdata, setData] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const { colors } = useAppTheme();
console.log( notificationdata, '---------------------- notificationdata ---------------------');

  const token = useSelector((state: RootState) => state.auth.token);
  const fetchNotifications = useCallback(async (pageNumber = 1) => {
    try {
      if (pageNumber === 1) setInitialLoading(true);
      else setLoadingMore(true);

      const response = await javascriptGet({
        path: `${ENDPOINT.notification}?page=${pageNumber}&per_page=10`,
        Token: token,
      });
     

      if (response?.data) {
        if (pageNumber === 1) {
          setData(response.data);
        } else {
          setData(prev => [...prev, ...response.data]);
        }

        setLastPage(response.last_page);
        setPage(response.current_page);
      }
    } catch (error) {
      console.log(error);
    } finally {
      setInitialLoading(false);
      setLoadingMore(false);
    }
  }, [token]);
  useEffect(() => {
    fetchNotifications(1);
  }, [fetchNotifications]);
  const loadMore = () => {
    if (page < lastPage && !loadingMore) {
      fetchNotifications(page + 1);
    }
  };
  const onRefresh = () => {
    fetchNotifications(1);
  };

  const styles = createStyles(colors);
  useEffect(() => {
    if (route.params?.id) {
      const notificationId = route.params.id;
      const selectedNotification = notificationdata?.find(
        item => item.id === notificationId,
      );
      if (selectedNotification) {
        navigation.navigate('NotificationDetailScreen', {
          data: selectedNotification,
        });
      }
    }
  }, [navigation, notificationdata, route.params?.id]);
  const renderSkeleton = () => (
    <FlatList
      data={[1, 1, 1, 1, 1, 1]}
      keyExtractor={(_, index) => `notification-skeleton-${index}`}
      renderItem={() => (
        <View style={styles.skeletonCard}>
          <View style={styles.skeletonRow}>
            <ShimmerPlaceholder style={styles.skeletonImage} />
            <View style={styles.skeletonContent}>
              <ShimmerPlaceholder style={styles.skeletonLine} />
              <ShimmerPlaceholder style={styles.skeletonLine} />
              <ShimmerPlaceholder style={styles.skeletonLine} />
              <View style={styles.skeletonMetaRow}>
                <ShimmerPlaceholder width={70} style={styles.skeletonMeta} />
                <ShimmerPlaceholder width={70} style={styles.skeletonMeta} />
              </View>
            </View>
          </View>
        </View>
      )}
    />
  );
  const renderItem = ({ item }) => (
    <Card
      onPress={() =>
        navigation.navigate('NotificationDetailScreen', { data: item })
      }
      style={styles.mainView}
    >
      <View style={{ flex: 1, flexDirection: 'row',}}>
        <Image
          source={{
            uri: item?.image,
          }}
          resizeMode="cover"
          style={styles.imgStyle}
        />

        <View style={{ flex: 1, justifyContent: 'space-between' }}>
          <View
            style={{ flexDirection: 'row', justifyContent: 'space-between' }}
          >
            <Text style={styles.mainText} numberOfLines={2}>
              {item?.title}
            </Text>
            <View>
              <Icon name="keyboard-arrow-right" color={colors.text} size={25} />
            </View>
          </View>
          <Text style={styles.seeText} numberOfLines={2}>
            {item.short_descriptions}
          </Text>
          <View
            style={{
              marginTop: 10,
              flexDirection: 'row',
              justifyContent: 'space-between',
            }}
          >
            <View style={{ flexDirection: 'row', flex: 1 }}>
              <Icon name="calendar-month" color={colors.textMuted} size={17} />
              <Text style={styles.dateText}>
                {moment(item?.date).format('DD MMM YYYY')}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', flex: 1 }}>
              <Icon name="access-time-filled" color={colors.primary} size={17} />

              <Text style={styles.dateText}>
                {moment(item?.time, 'HH:mm:ss').format('h:mm A')}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </Card>
  );
  return (
    <View style={styles.container}>
      <Header title={'Circulars'} />

      <FlatList
        data={notificationdata}
        showsVerticalScrollIndicator={false}
        renderItem={renderItem}
        keyExtractor={item => item?.id?.toString()}
        contentContainerStyle={{ marginHorizontal: 10 }}
        onEndReached={loadMore}
        onEndReachedThreshold={0.4}
        refreshing={initialLoading}
        onRefresh={onRefresh}
        ListFooterComponent={
          loadingMore ? (
            <Text style={{ textAlign: 'center' }}>Loading...</Text>
          ) : null
        }
        ListEmptyComponent={
          initialLoading ? (
            renderSkeleton()
          ) : (
            <View style={styles.noNotificationContainer}>
              <Text style={styles.noNotificationText}>No record found.</Text>
            </View>
          )
        }
      />
    </View>
  );
};
const createStyles = (colors: {
  background: string;
  primary: string;
  onPrimary: string;
  surface: string;
  surfaceAlt: string;
  text: string;
  textMuted: string;
  border: string;
  success: string;
}) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,

  },
  noNotificationContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noNotificationText: {
    fontFamily: FONT_FAMILY.semiBold,
    color: colors.textMuted,
    fontSize: 16,
  },
  notificationItem: {
    flexDirection: 'row',
    marginBottom: 15,
    padding: 10,
    backgroundColor: colors.surface ,
    borderRadius: 5,
  },
  body: {
    margin: 20,
  },
  imageContainer: {
    marginRight: 10,
  },
  image: {
    width: 80,
    height: 80,
    borderRadius: 5,
  },
  textContainer: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  notificationBody: {
    fontSize: 16,
  },
  mainView: {
    flex: 1,
    margin: 10,
    padding: 10,
    backgroundColor: colors.surface,
    borderWidth:0.6,
    borderColor: colors.border,
  },
  imgStyle: {
    height: 'auto',
    width: '40%',
    resizeMode: 'cover',
    minHeight: 120,
    borderRadius: 10,
    marginRight: 10,
  },
  mainText: {
    flex: 1,
    fontSize: 16,
    fontFamily: FONT_FAMILY.semiBold,
    color: colors.text,
    marginBottom: 8,
  },
  rowView: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.semiBold,
    color: colors.textMuted,
    marginLeft: 5,
  },
  seeText: {
    fontFamily: FONT_FAMILY.normal,
    fontSize: 15,
    color: colors.textMuted,
  },
  skeletonCard: {
    marginHorizontal: 10,
    borderRadius: 20,
    flex: 1,
    margin: 10,
    padding: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  skeletonRow: {
    flex: 1,
    alignItems: 'center',
    flexDirection: 'row',
  },
  skeletonImage: {
    height: 'auto',
    width: '40%',
    resizeMode: 'cover',
    minHeight: 120,
    borderRadius: 10,
    marginRight: 10,
  },
  skeletonContent: {
    flex: 1,
    alignItems: 'flex-start',
    marginLeft: 10,
  },
  skeletonLine: {
    margin: 5,
  },
  skeletonMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  skeletonMeta: {
    margin: 5,
  },
});

export default NotificationListScreen;
