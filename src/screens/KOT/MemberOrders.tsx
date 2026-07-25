import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useInfiniteQuery } from '@tanstack/react-query';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSelector } from 'react-redux';

import Header from '../../components/Header';
import AppAlertModal from '../../components/feedback/AppAlertModal';
import { useAppAlert } from '../../hooks/useAppAlert';
import { RootState } from '../../store/store';
import { useAppTheme } from '../../theme/AppThemeProvider';
import { FONT_FAMILY } from '../../util/colors';
import {
  cancelFoodOrder,
  getMemberFoodOrders,
} from '../../services/Food/memberFoodService';

const filters = [
  { label: 'All', value: 'all' },
  { label: 'Pending', value: 'Pending' },
  { label: 'Accepted', value: 'Accepted' },
  { label: 'Delivered', value: 'Delivered' },
  { label: 'Cancelled', value: 'Cancelled' },
];

const statusTone: Record<string, string> = {
  Pending: '#f59e0b',
  Accepted: '#0ea5e9',
  Preparing: '#8b5cf6',
  out_for_delivery: '#f97316',
  Delivered: '#16a34a',
  Cancelled: '#ef4444',
  Rejected: '#ef4444',
};

const MemberOrders: React.FC = ({navigation}) => {
  const auth = useSelector((state: RootState) => state.auth);
  const { colors } = useAppTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null);
  const { alertState, hideAlert, showAlert } = useAppAlert();
  const [cancelLoadingId, setCancelLoadingId] = useState<
    string | number | null
  >(null);
  const cancelOrder = async (id: string | number) => {
    Alert.alert('Cancel Order', 'Are you sure you want to cancel this order?', [
      {
        text: 'No',
        style: 'cancel',
      },
      {
        text: 'Yes, Cancel',
        style: 'destructive',
        onPress: async () => {
          try {
            setCancelLoadingId(id);

            const response = await cancelFoodOrder(auth?.token || '', id);
            console.log(
              response,
              cancelLoadingId,
              '----------------------  ---------------------',
            );

            if (response?.status) {
              // REFETCH ORDER LIST
              ordersQuery.refetch();

              showAlert({
                title: 'Success',
                message: 'Order cancelled successfully.',
                tone: 'success',
              });
            } else {
              showAlert({
                title: 'Error',
                message: response?.message || 'Unable to cancel order.',
                tone: 'danger',
              });
            }
          } catch (error: any) {
            showAlert({
              title: 'Error',
              message:
                error?.response?.data?.message || 'Something went wrong.',
              tone: 'danger',
            });
          } finally {
            setCancelLoadingId(null);
          }
        },
      },
    ]);
  };
  const ordersQuery = useInfiniteQuery({
    queryKey: ['member-food-orders', selectedFilter, auth?.token],
    queryFn: ({ pageParam = 1 }) =>
      getMemberFoodOrders(auth?.token || '', selectedFilter, pageParam),
    getNextPageParam: lastPage => {
      const pageData = lastPage?.data;
      if (pageData?.current_page < pageData?.last_page) {
        return pageData.current_page + 1;
      }
      return undefined;
    },
    enabled: !!auth?.token,
  });

  const orders = useMemo(
    () =>
      ordersQuery.data?.pages?.flatMap(page => page?.data?.data || []) || [],
    [ordersQuery.data],
  );

  return (
    <View style={styles.container}>
      <Header title="My Food Orders" />

      <View style={styles.filterRow}>
        {/* <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 10 }}
        >
          {filters.map(filter => {
            const active = selectedFilter === filter.value;
            return (
              <Pressable
                key={filter.value}
                onPress={() => setSelectedFilter(filter.value)}
                style={[
                  styles.filterChip,
                  active ? styles.filterChipActive : null,
                ]}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    active ? styles.filterChipTextActive : null,
                  ]}
                >
                  {filter.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView> */}
      </View>

      <FlatList
        data={orders}
        keyExtractor={item => String(item.id)}
        refreshControl={
          <RefreshControl
            refreshing={ordersQuery.isRefetching}
            onRefresh={ordersQuery.refetch}
            tintColor={colors.primary}
          />
        }
        contentContainerStyle={styles.listContent}
        onEndReached={() => {
          if (ordersQuery.hasNextPage && !ordersQuery.isFetchingNextPage) {
            ordersQuery.fetchNextPage();
          }
        }}
        onEndReachedThreshold={0.3}
        ListEmptyComponent={
          ordersQuery.isLoading ? (
            <View style={styles.loaderWrap}>
              <ActivityIndicator color={colors.text} size="large" />
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Image
                source={require('../../../assets/images/norecord.png')}
                style={styles.emptyImage}
              />
              <Text style={styles.emptyTitle}>No food orders yet</Text>
              <Text style={styles.emptyText}>
                Your current active orders and past food history will appear
                here once you place an order.
              </Text>
            </View>
          )
        }
        ListFooterComponent={
          ordersQuery.isFetchingNextPage ? (
            <ActivityIndicator color={colors.primary} />
          ) : null
        }
      renderItem={({ item }) => {

  const tone =
    item?.status_details?.font_color_code ||
    colors.primary;

  const background =
    item?.status_details?.color_code ||
    colors.surface;

  return (
    <Pressable
      onPress={() =>
        navigation.navigate(
          'MemberOrderDetails',
          {
            id: item.id,
          },
        )
      }
      style={styles.orderCard}
    >
      <View style={styles.orderCardTop}>
        <View style={{ flex: 1 }}>
          <Text style={styles.orderNumber}>
            {item.order_number}
          </Text>

          <Text style={styles.orderMeta}>
            {item.order_type === 'home_delivery'
              ? 'Home Delivery'
              : 'Take Away'}
          </Text>
        </View>

        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor: background,
            },
          ]}
        >
          <Text
            style={[
              styles.statusBadgeText,
              { color: tone },
            ]}
          >
            {item?.status_details?.label}
          </Text>
        </View>
      </View>

      <View style={styles.orderStatsRow}>
        <View style={styles.orderStatCard}>
          <Text style={styles.orderStatLabel}>
            Total
          </Text>

          <Text style={styles.orderStatValue}>
            ₹{' '}
            {Number(
              item.totals?.grand_total || 0,
            ).toFixed(2)}
          </Text>
        </View>

        <View style={styles.orderStatCard}>
          <Text style={styles.orderStatLabel}>
            Items
          </Text>

          <Text style={styles.orderStatValue}>
            {item.items?.length || 0}
          </Text>
        </View>
      </View>

      {item.status === 'pending' ? (
        <Pressable
          onPress={() => cancelOrder(item.id)}
          style={styles.cancelButton}
        >
          <Text style={styles.cancelButtonText}>
            Cancel Order
          </Text>
        </Pressable>
      ) : null}
    </Pressable>
  );
}}
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
    filterRow: {
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 4,
    },
    filterChip: {
      paddingHorizontal: 15,
      paddingVertical: 10,
      borderRadius: 999,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    filterChipActive: {
      backgroundColor: colors.primary,
      borderColor: colors.secondary,
    },
    filterChipText: {
      color: colors.text,
      fontFamily: FONT_FAMILY.medium,
      fontSize: 13,
    },
    filterChipTextActive: {
      color: colors.onPrimary,
      fontFamily: FONT_FAMILY.semiBold,
    },
    listContent: {
      padding: 16,
      paddingTop: 10,
      paddingBottom: 32,
    },
    loaderWrap: {
      alignItems: 'center',
      paddingVertical: 40,
    },
    emptyState: {
      alignItems: 'center',
      paddingTop: 80,
      paddingHorizontal: 24,
    },
    emptyImage: {
      width: 100,
      height: 100,
      marginBottom: 16,
    },
    emptyTitle: {
      color: colors.text,
      fontFamily: FONT_FAMILY.bold,
      fontSize: 18,
      marginBottom: 8,
    },
    emptyText: {
      color: colors.textMuted,
      textAlign: 'center',
      fontFamily: FONT_FAMILY.regular,
      lineHeight: 20,
    },
    orderCard: {
      backgroundColor: colors.surface,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
      marginBottom: 14,
    },
    orderCardTop: {
      flexDirection: 'row',
      gap: 12,
      alignItems: 'flex-start',
      marginBottom: 14,
    },
    cancelButton: {
      // backgroundColor:'red',
      padding: 10,
      borderRadius: 10,
      marginTop: 10,
      borderWidth: 1,
      borderColor: `${colors.danger}`,
      borderRightColor: colors.danger,
    },
    orderNumber: {
      color: colors.text,
      fontFamily: FONT_FAMILY.bold,
      fontSize: 16,
      marginBottom: 4,
    },
    orderMeta: {
      color: colors.textMuted,
      fontFamily: FONT_FAMILY.medium,
      fontSize: 12,
    },
    statusBadge: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 999,
    },
    statusBadgeText: {
      fontFamily: FONT_FAMILY.semiBold,
      fontSize: 12,
      textTransform: 'capitalize',
    },
    orderStatsRow: {
      flexDirection: 'row',
      gap: 10,
    },
    orderStatCard: {
      flex: 1,
      borderRadius: 16,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 12,
    },
    orderStatLabel: {
      color: colors.textMuted,
      fontFamily: FONT_FAMILY.medium,
      fontSize: 12,
      marginBottom: 5,
    },
    orderStatValue: {
      color: colors.text,
      fontFamily: FONT_FAMILY.semiBold,
      fontSize: 13,
    },
    divider: {
      height: 1,
      backgroundColor: colors.border,
      marginVertical: 16,
    },
    sectionTitle: {
      color: colors.text,
      fontFamily: FONT_FAMILY.bold,
      fontSize: 14,
      marginBottom: 10,
    },
    detailRow: {
      marginBottom: 10,
    },
    detailPrimary: {
      color: colors.text,
      fontFamily: FONT_FAMILY.semiBold,
      fontSize: 13,
      marginBottom: 3,
    },
    detailSecondary: {
      color: colors.textMuted,
      fontFamily: FONT_FAMILY.medium,
      fontSize: 12,
      lineHeight: 18,
    },
    detailPanel: {
      borderRadius: 16,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 12,
      marginBottom: 12,
      gap: 4,
    },
    timelineRow: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: 12,
    },
    timelineDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      marginTop: 5,
    },
    timelineDate: {
      color: colors.textMuted,
      fontFamily: FONT_FAMILY.medium,
      fontSize: 11,
      marginTop: 4,
    },
    orderFooterRow: {
      marginTop: 6,
      gap: 8,
    },
    linkText: {
      color: colors.primary,
      fontFamily: FONT_FAMILY.semiBold,
      fontSize: 12,
    },
  });

export default MemberOrders;

// import React, { useMemo, useState } from 'react';
// import {
//   ActivityIndicator,
//   Alert,
//   FlatList,
//   Image,
//   Linking,
//   Pressable,
//   RefreshControl,
//   ScrollView,
//   StyleSheet,
//   Text,
//   View,
// } from 'react-native';
// import { useInfiniteQuery } from '@tanstack/react-query';
// import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
// import { useSelector } from 'react-redux';

// import Header from '../../components/Header';
// import AppAlertModal from '../../components/feedback/AppAlertModal';
// import { useAppAlert } from '../../hooks/useAppAlert';
// import { RootState } from '../../store/store';
// import { useAppTheme } from '../../theme/AppThemeProvider';
// import { FONT_FAMILY } from '../../util/colors';
// import {
//   cancelFoodOrder,
//   getMemberFoodOrders,
// } from '../../services/Food/memberFoodService';

// const filters = [
//   { label: 'All', value: 'all' },
//   { label: 'Pending', value: 'Pending' },
//   { label: 'Accepted', value: 'Accepted' },
//   { label: 'Delivered', value: 'Delivered' },
//   { label: 'Cancelled', value: 'Cancelled' },
// ];

// const statusTone: Record<string, string> = {
//   Pending: '#f59e0b',
//   Accepted: '#0ea5e9',
//   Preparing: '#8b5cf6',
//   out_for_delivery: '#f97316',
//   Delivered: '#16a34a',
//   Cancelled: '#ef4444',
//   Rejected: '#ef4444',
// };

// const MemberOrders: React.FC = () => {
//   const auth = useSelector((state: RootState) => state.auth);
//   const { colors } = useAppTheme();
//   const styles = React.useMemo(() => createStyles(colors), [colors]);
//   const [selectedFilter, setSelectedFilter] = useState('all');
//   const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null);
//   const { alertState, hideAlert, showAlert } = useAppAlert();
//   const [cancelLoadingId, setCancelLoadingId] = useState<
//     string | number | null
//   >(null);
//   const cancelOrder = async (id: string | number) => {
//     Alert.alert('Cancel Order', 'Are you sure you want to cancel this order?', [
//       {
//         text: 'No',
//         style: 'cancel',
//       },
//       {
//         text: 'Yes, Cancel',
//         style: 'destructive',
//         onPress: async () => {
//           try {
//             setCancelLoadingId(id);

//             const response = await cancelFoodOrder(auth?.token || '', id);
//             console.log(
//               response,
//               cancelLoadingId,
//               '----------------------  ---------------------',
//             );

//             if (response?.status) {
//               // REFETCH ORDER LIST
//               ordersQuery.refetch();

//               showAlert({
//                 title: 'Success',
//                 message: 'Order cancelled successfully.',
//                 tone: 'success',
//               });
//             } else {
//               showAlert({
//                 title: 'Error',
//                 message: response?.message || 'Unable to cancel order.',
//                 tone: 'danger',
//               });
//             }
//           } catch (error: any) {
//             showAlert({
//               title: 'Error',
//               message:
//                 error?.response?.data?.message || 'Something went wrong.',
//               tone: 'danger',
//             });
//           } finally {
//             setCancelLoadingId(null);
//           }
//         },
//       },
//     ]);
//   };
//   const ordersQuery = useInfiniteQuery({
//     queryKey: ['member-food-orders', selectedFilter, auth?.token],
//     queryFn: ({ pageParam = 1 }) =>
//       getMemberFoodOrders(auth?.token || '', selectedFilter, pageParam),
//     getNextPageParam: lastPage => {
//       const pageData = lastPage?.data;
//       if (pageData?.current_page < pageData?.last_page) {
//         return pageData.current_page + 1;
//       }
//       return undefined;
//     },
//     enabled: !!auth?.token,
//   });

//   const orders = useMemo(
//     () =>
//       ordersQuery.data?.pages?.flatMap(page => page?.data?.data || []) || [],
//     [ordersQuery.data],
//   );

//   return (
//     <View style={styles.container}>
//       <Header title="My Food Orders" />

//       <View style={styles.filterRow}>
//         <ScrollView
//           horizontal
//           showsHorizontalScrollIndicator={false}
//           contentContainerStyle={{ gap: 10 }}
//         >
//           {filters.map(filter => {
//             const active = selectedFilter === filter.value;
//             return (
//               <Pressable
//                 key={filter.value}
//                 onPress={() => setSelectedFilter(filter.value)}
//                 style={[
//                   styles.filterChip,
//                   active ? styles.filterChipActive : null,
//                 ]}
//               >
//                 <Text
//                   style={[
//                     styles.filterChipText,
//                     active ? styles.filterChipTextActive : null,
//                   ]}
//                 >
//                   {filter.label}
//                 </Text>
//               </Pressable>
//             );
//           })}
//         </ScrollView>
//       </View>

//       <FlatList
//         data={orders}
//         keyExtractor={item => String(item.id)}
//         refreshControl={
//           <RefreshControl
//             refreshing={ordersQuery.isRefetching}
//             onRefresh={ordersQuery.refetch}
//             tintColor={colors.primary}
//           />
//         }
//         contentContainerStyle={styles.listContent}
//         onEndReached={() => {
//           if (ordersQuery.hasNextPage && !ordersQuery.isFetchingNextPage) {
//             ordersQuery.fetchNextPage();
//           }
//         }}
//         onEndReachedThreshold={0.3}
//         ListEmptyComponent={
//           ordersQuery.isLoading ? (
//             <View style={styles.loaderWrap}>
//               <ActivityIndicator color={colors.text} size="large" />
//             </View>
//           ) : (
//             <View style={styles.emptyState}>
//               <Image
//                 source={require('../../../assets/images/norecord.png')}
//                 style={styles.emptyImage}
//               />
//               <Text style={styles.emptyTitle}>No food orders yet</Text>
//               <Text style={styles.emptyText}>
//                 Your current active orders and past food history will appear
//                 here once you place an order.
//               </Text>
//             </View>
//           )
//         }
//         ListFooterComponent={
//           ordersQuery.isFetchingNextPage ? (
//             <ActivityIndicator color={colors.primary} />
//           ) : null
//         }
//         renderItem={({ item }) => {
//           console.log(
//             item,
//             '---------------------- item ---------------------',
//           );
//           const expanded = expandedOrderId === item.id;
//           const tone = item?.status_details?.font_color_code || colors.primary;

//           const background = item?.status_details?.color_code || colors.surface;
//           return (
//             <Pressable
//               onPress={() => setExpandedOrderId(expanded ? null : item.id)}
//               style={styles.orderCard}
//             >
//               <View style={styles.orderCardTop}>
//                 <View style={{ flex: 1 }}>
//                   <Text style={styles.orderNumber}>{item.order_number}</Text>
//                   <Text style={styles.orderMeta}>
//                     {item.order_type === 'home_delivery'
//                       ? 'Home Delivery'
//                       : 'Take Away'}{' '}
//                     • {item.payment_method}
//                   </Text>
//                 </View>
//                 <View
//                   style={[styles.statusBadge, { backgroundColor: background }]}
//                 >
//                   <Text style={[styles.statusBadgeText, { color: tone }]}>
//                     {item?.status_details?.label}
//                   </Text>
//                 </View>

//                 {/* <View style={[styles.statusBadge, { backgroundColor: `${tone}20` }]}>
//                   <Text style={[styles.statusBadgeText, { color: tone }]}>
//                     {String(item.status).replace(/_/g, ' ')}
//                   </Text>
//                 </View> */}
//               </View>

//               <View style={styles.orderStatsRow}>
//                 <View style={styles.orderStatCard}>
//                   <Text style={styles.orderStatLabel}>Total</Text>
//                   <Text style={styles.orderStatValue}>
//                     ₹ {Number(item.totals?.grand_total || 0).toFixed(2)}
//                   </Text>
//                 </View>
//                 <View style={styles.orderStatCard}>
//                   <Text style={styles.orderStatLabel}>Items</Text>
//                   <Text style={styles.orderStatValue}>
//                     {item.items?.length || 0}
//                   </Text>
//                 </View>
//                 <View style={styles.orderStatCard}>
//                   <Text style={styles.orderStatLabel}>Placed</Text>
//                   <Text style={styles.orderStatValue}>
//                     {item.placed_at
//                       ? String(item.placed_at).slice(0, 16).replace('T', ' ')
//                       : '-'}
//                   </Text>
//                 </View>
//               </View>
//               {item?.status_details?.label.toLowerCase() === 'pending' && (
//                 <Pressable
//                   disabled={cancelLoadingId === item.id}
//                   onPress={() => cancelOrder(item.id)}
//                   style={styles.cancelButton}
//                 >
//                   {cancelLoadingId === item.id ? (
//                     <ActivityIndicator color="#fff" size="small" />
//                   ) : (
//                     <Text style={[styles.emptyText, { color: colors.danger }]}>
//                       Cancel Order
//                     </Text>
//                   )}
//                 </Pressable>
//               )}

//               {expanded ? (
//                 <>
//                   <View style={styles.divider} />

//                   <Text style={styles.sectionTitle}>Order items</Text>
//                   {(item.items || []).map((orderItem: any) => (
//                     <View key={orderItem.id} style={styles.detailRow}>
//                       <View style={{ flex: 1 }}>
//                         <Text style={styles.detailPrimary}>
//                           {orderItem.item_name}
//                         </Text>
//                         <Text style={styles.detailSecondary}>
//                           Qty {orderItem.quantity} • ₹{' '}
//                           {Number(orderItem.line_total || 0).toFixed(2)}
//                         </Text>
//                       </View>
//                     </View>
//                   ))}

//                   <Text style={styles.sectionTitle}>Payment details</Text>
//                   <View style={styles.detailPanel}>
//                     <Text style={styles.detailSecondary}>
//                       Opening balance: ₹{' '}
//                       {Number(
//                         item.payment_summary?.opening_balance || 0,
//                       ).toFixed(2)}
//                     </Text>
//                     <Text style={styles.detailSecondary}>
//                       Closing balance: ₹{' '}
//                       {Number(
//                         item.payment_summary?.closing_balance || 0,
//                       ).toFixed(2)}
//                     </Text>
//                   </View>

//                   {(item.timeline || []).length ? (
//                     <>
//                       <Text style={styles.sectionTitle}>Order timeline</Text>
//                       {(item.timeline || []).map((timelineItem: any) => (
//                         <View key={timelineItem.id} style={styles.timelineRow}>
//                           <View
//                             style={[
//                               styles.timelineDot,
//                               { backgroundColor: tone },
//                             ]}
//                           />
//                           <View style={{ flex: 1 }}>
//                             <Text style={styles.detailPrimary}>
//                               {timelineItem.title || timelineItem.status}
//                             </Text>
//                             <Text style={styles.detailSecondary}>
//                               {timelineItem.message}
//                             </Text>
//                             <Text style={styles.timelineDate}>
//                               {timelineItem.created_at}
//                             </Text>
//                           </View>
//                         </View>
//                       ))}
//                     </>
//                   ) : null}

//                   <View style={styles.orderFooterRow}>
//                     <Text style={styles.detailSecondary}>
//                       {item.delivery_address || 'No extra delivery details'}
//                     </Text>
//                     {item?.delivery_partner_name && (
//                       <View
//                         style={{
//                           backgroundColor: colors.background,
//                           padding: 10,
//                           borderRadius: 10,
//                         }}
//                       >
//                         <Text style={styles.detailPrimary}>
//                           Delivery Partner:
//                         </Text>
//                         <Text style={styles.detailSecondary}>
//                           {' '}
//                           <Icon
//                             name={'face-man-profile'}
//                             size={15}
//                             color={colors.text}
//                             style={{ marginRight: 10 }}
//                           />
//                           {'  '} {item.delivery_partner_name}
//                         </Text>
//                       {item.delivery_partner_phone &&  <Pressable
//                           onPress={() => {
//                             if (item?.delivery_partner_phone) {
//                               Linking.openURL(
//                                 `tel:+91${item.delivery_partner_phone}`,
//                               );
//                             }
//                           }}
//                           style={[
//                             styles.detailPrimary,
//                             { flexDirection: 'row' },
//                           ]}
//                         >
//                           <Icon
//                             name={'phone'}
//                             size={15}
//                             color={colors.success}
//                             style={{ marginRight: 10 }}
//                           />
//                           <Text
//                             style={[
//                               styles.detailSecondary,
//                               { color: colors.success },
//                             ]}
//                           >
//                             {item.delivery_partner_phone}
//                           </Text>
//                         </Pressable>}
//                       </View>
//                     )}

//                     <Pressable
//                       onPress={() =>
//                         showAlert({
//                           title: 'Receipt flow pending',
//                           message:
//                             'This new member food flow already stores order totals and timelines. Receipt/PDF export can be connected next once the backend receipt format is finalized.',
//                           tone: 'info',
//                         })
//                       }
//                     >
//                       <Text style={styles.linkText}>Why no PDF yet?</Text>
//                     </Pressable>
//                   </View>
//                 </>
//               ) : null}
//             </Pressable>
//           );
//         }}
//       />

//       <AppAlertModal
//         visible={alertState.visible}
//         title={alertState.title}
//         message={alertState.message}
//         tone={alertState.tone}
//         primaryLabel={alertState.primaryLabel}
//         secondaryLabel={alertState.secondaryLabel}
//         onPrimaryPress={() => {
//           alertState.onPrimaryPress?.();
//           hideAlert();
//         }}
//         onSecondaryPress={() => {
//           alertState.onSecondaryPress?.();
//           hideAlert();
//         }}
//         onDismiss={hideAlert}
//       />
//     </View>
//   );
// };

// const createStyles = (colors: any) =>
//   StyleSheet.create({
//     container: {
//       flex: 1,
//       backgroundColor: colors.background,
//     },
//     filterRow: {
//       paddingHorizontal: 16,
//       paddingTop: 8,
//       paddingBottom: 4,
//     },
//     filterChip: {
//       paddingHorizontal: 15,
//       paddingVertical: 10,
//       borderRadius: 999,
//       backgroundColor: colors.surface,
//       borderWidth: 1,
//       borderColor: colors.border,
//     },
//     filterChipActive: {
//       backgroundColor: colors.primary,
//       borderColor: colors.secondary,
//     },
//     filterChipText: {
//       color: colors.text,
//       fontFamily: FONT_FAMILY.medium,
//       fontSize: 13,
//     },
//     filterChipTextActive: {
//       color: colors.onPrimary,
//       fontFamily: FONT_FAMILY.semiBold,
//     },
//     listContent: {
//       padding: 16,
//       paddingTop: 10,
//       paddingBottom: 32,
//     },
//     loaderWrap: {
//       alignItems: 'center',
//       paddingVertical: 40,
//     },
//     emptyState: {
//       alignItems: 'center',
//       paddingTop: 80,
//       paddingHorizontal: 24,
//     },
//     emptyImage: {
//       width: 100,
//       height: 100,
//       marginBottom: 16,
//     },
//     emptyTitle: {
//       color: colors.text,
//       fontFamily: FONT_FAMILY.bold,
//       fontSize: 18,
//       marginBottom: 8,
//     },
//     emptyText: {
//       color: colors.textMuted,
//       textAlign: 'center',
//       fontFamily: FONT_FAMILY.regular,
//       lineHeight: 20,
//     },
//     orderCard: {
//       backgroundColor: colors.surface,
//       borderRadius: 24,
//       borderWidth: 1,
//       borderColor: colors.border,
//       padding: 16,
//       marginBottom: 14,
//     },
//     orderCardTop: {
//       flexDirection: 'row',
//       gap: 12,
//       alignItems: 'flex-start',
//       marginBottom: 14,
//     },
//     cancelButton: {
//       // backgroundColor:'red',
//       padding: 10,
//       borderRadius: 10,
//       marginTop: 10,
//       borderWidth: 1,
//       borderColor: `${colors.danger}`,
//       borderRightColor: colors.danger,
//     },
//     orderNumber: {
//       color: colors.text,
//       fontFamily: FONT_FAMILY.bold,
//       fontSize: 16,
//       marginBottom: 4,
//     },
//     orderMeta: {
//       color: colors.textMuted,
//       fontFamily: FONT_FAMILY.medium,
//       fontSize: 12,
//     },
//     statusBadge: {
//       paddingHorizontal: 12,
//       paddingVertical: 8,
//       borderRadius: 999,
//     },
//     statusBadgeText: {
//       fontFamily: FONT_FAMILY.semiBold,
//       fontSize: 12,
//       textTransform: 'capitalize',
//     },
//     orderStatsRow: {
//       flexDirection: 'row',
//       gap: 10,
//     },
//     orderStatCard: {
//       flex: 1,
//       borderRadius: 16,
//       backgroundColor: colors.background,
//       borderWidth: 1,
//       borderColor: colors.border,
//       padding: 12,
//     },
//     orderStatLabel: {
//       color: colors.textMuted,
//       fontFamily: FONT_FAMILY.medium,
//       fontSize: 12,
//       marginBottom: 5,
//     },
//     orderStatValue: {
//       color: colors.text,
//       fontFamily: FONT_FAMILY.semiBold,
//       fontSize: 13,
//     },
//     divider: {
//       height: 1,
//       backgroundColor: colors.border,
//       marginVertical: 16,
//     },
//     sectionTitle: {
//       color: colors.text,
//       fontFamily: FONT_FAMILY.bold,
//       fontSize: 14,
//       marginBottom: 10,
//     },
//     detailRow: {
//       marginBottom: 10,
//     },
//     detailPrimary: {
//       color: colors.text,
//       fontFamily: FONT_FAMILY.semiBold,
//       fontSize: 13,
//       marginBottom: 3,
//     },
//     detailSecondary: {
//       color: colors.textMuted,
//       fontFamily: FONT_FAMILY.medium,
//       fontSize: 12,
//       lineHeight: 18,
//     },
//     detailPanel: {
//       borderRadius: 16,
//       backgroundColor: colors.background,
//       borderWidth: 1,
//       borderColor: colors.border,
//       padding: 12,
//       marginBottom: 12,
//       gap: 4,
//     },
//     timelineRow: {
//       flexDirection: 'row',
//       gap: 10,
//       marginBottom: 12,
//     },
//     timelineDot: {
//       width: 10,
//       height: 10,
//       borderRadius: 5,
//       marginTop: 5,
//     },
//     timelineDate: {
//       color: colors.textMuted,
//       fontFamily: FONT_FAMILY.medium,
//       fontSize: 11,
//       marginTop: 4,
//     },
//     orderFooterRow: {
//       marginTop: 6,
//       gap: 8,
//     },
//     linkText: {
//       color: colors.primary,
//       fontFamily: FONT_FAMILY.semiBold,
//       fontSize: 12,
//     },
//   });

// export default MemberOrders;
