import React from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import moment from 'moment';

import Header from '../../components/Header';
import { AppStackParamList } from '../../navigation/AppDrawer';
import { RootState } from '../../store/store';
import { useAppTheme } from '../../theme/AppThemeProvider';
import { FONT_FAMILY } from '../../util/colors';
import {
  cancelFoodOrder,
  getMemberFoodOrderDetails,
} from '../../services/Food/memberFoodService';

type Props = NativeStackScreenProps<
  AppStackParamList,
  'MemberOrderDetails'
>;

const MemberOrderDetails: React.FC<Props> = ({
  route,
}) => {
  const { id } = route.params;

  const auth = useSelector(
    (state: RootState) => state.auth,
  );

  const { colors } = useAppTheme();

  const styles = React.useMemo(
    () => createStyles(colors),
    [colors],
  );

  const orderQuery = useQuery({
    queryKey: ['food-order-details', id,route.params],
    queryFn: () =>
      getMemberFoodOrderDetails(
        auth?.token || '',
        id,
      ),
  });

  const order = orderQuery?.data?.data;
  const cancelOrder = async () => {
    Alert.alert(
      'Cancel Order',
      'Are you sure you want to cancel this order?',
      [
        {
          text: 'No',
          style: 'cancel',
        },
        {
          text: 'Yes',
          style: 'destructive',
          onPress: async () => {
            try {
              await cancelFoodOrder(
                auth?.token || '',
                order.id,
              );

              orderQuery.refetch();
            } catch (error) {}
          },
        },
      ],
    );
  };

  if (orderQuery.isLoading) {
    return (
      <View style={styles.loaderContainer}>
        <Header title="Food Order Detail" />
        <ActivityIndicator
          size="large"
          color={colors.primary}
        />
      </View>
    );
  }
  return (
    <View style={styles.container}>
      <Header title="Food Order Detail" />

      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={orderQuery.isRefetching}
            onRefresh={orderQuery.refetch}
            tintColor={colors.primary}
          />
        }
        contentContainerStyle={styles.content}
      >
        {/* HERO CARD */}

        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.orderNumber}>
                {order?.order_number}
              </Text>

              <Text style={styles.orderDate}>
                {moment(order?.placed_at).format(
                  'DD MMM YYYY • hh:mm A',
                )}
              </Text>
            </View>

            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor:
                    order?.status_details
                      ?.color_code,
                },
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  {
                    color:
                      order?.status_details
                        ?.font_color_code,
                  },
                ]}
              >
                {
                  order?.status_details
                    ?.label
                }
              </Text>
            </View>
          </View>

          <View style={styles.heroBottom}>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>
                Total
              </Text>

              <Text style={styles.metricValue}>
                ₹{' '}
                {Number(
                  order?.totals
                    ?.grand_total || 0,
                ).toFixed(2)}
              </Text>
            </View>

            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>
                {order?.items?.length ==1?'Item':'Items'}
              </Text>

              <Text style={styles.metricValue}>
                {order?.items?.length || 0}
              </Text>
            </View>
          </View>
        </View>

        {/* DELIVERY */}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Delivery Details
          </Text>

          <View style={styles.infoCard}>
           {order?.order_type ===
                'home_delivery' && <View style={styles.infoRow}>
              <Icon
                name="map-marker"
                size={18}
                color={colors.text}
              />

              <Text style={styles.infoText}>
                {order?.delivery_address ||
                  'No address'}
              </Text>
            </View>}

            <View style={styles.infoRow}>
              <Icon
                name="food"
                size={18}
                color={colors.text}
              />

              <Text style={styles.infoText}>
                {order?.order_type ===
                'home_delivery'
                  ? 'Home Delivery'
                  : 'Take Away'} From {order?.outlet.name}
              </Text>
            </View>

            {order?.outlet.enquiry_no ? ( <View style={styles.infoRow}>
               <Icon
                      name="phone"
                      size={15}
                      color={
                        '#57aaf4'
                      }
                    />
 
                  <Pressable
                    onPress={() =>
                      Linking.openURL(
                        `tel:+91${order?.outlet.enquiry_no}`,
                      )
                    }
                    style={{
                 
                      marginLeft: 10,
                      flexDirection:'row',
                    }
                      // styles.totalLabel
                    }
                  >
                   <Text style={[{color:'#57aaf4'}]}>+91 {order?.outlet.enquiry_no}</Text>
                  </Pressable>
               
            </View> ) : null}
            
          
          </View>
        </View>

        {/* DELIVERY PARTNER */}

        {order?.delivery_partner_name ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Delivery Partner
            </Text>

            <View style={styles.infoCard}>
              <View style={styles.partnerTop}>
                <View>
                  <Text style={styles.partnerName}>
                    {
                      order?.delivery_partner_name
                    }
                  </Text>

                  <Text style={styles.partnerSub}>
                    Delivery Executive
                  </Text>
                </View>

                {order?.delivery_partner_phone ? (
                  <Pressable
                    onPress={() =>
                      Linking.openURL(
                        `tel:+91${order?.delivery_partner_phone}`,
                      )
                    }
                    style={
                      styles.callButton
                    }
                  >
                    <Icon
                      name="phone"
                      size={15}
                      color={
                        colors.onPrimary
                      }
                    />
                  </Pressable>
                ) : null}
              </View>
            </View>
          </View>
        ) : null}

        {/* ITEMS */}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Order Items
          </Text>

          {order?.items?.map(
            (item: any) => (
              <View
                key={item.id}
                style={styles.itemCard}
              >
                <View
                  style={{ flex: 1 }}
                >
                  <Text
                    style={
                      styles.itemTitle
                    }
                  >
                    {item.item_name}{item.notes && ` (with ${item.notes})`}
                  </Text>

                  <Text
                    style={
                      styles.itemSub
                    }
                  >
                    Qty {item.quantity}
                  </Text>
                </View>

                <Text
                  style={
                    styles.itemPrice
                  }
                >
                  ₹{' '}
                  {Number(
                    item.line_total ||
                      0,
                  ).toFixed(2)}
                </Text>
              </View>
            ),
          )}
        </View>

        {/* PAYMENT */}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Payment Summary
          </Text>

          <View style={styles.paymentCard}>
            <View style={styles.paymentRow}>
              <Text style={styles.paymentLabel}>
                Subtotal
              </Text>

              <Text style={styles.paymentValue}>
                ₹{' '}
                {Number(
                  order?.totals
                    ?.subtotal || 0,
                ).toFixed(2)}
              </Text>
            </View>

            <View style={styles.paymentRow}>
              <Text style={styles.paymentLabel}>
                Tax
              </Text>

              <Text style={styles.paymentValue}>
                ₹{' '}
                {Number(
                  order?.totals
                    ?.gst_total || 0,
                ).toFixed(2)}
              </Text>
            </View>

            <View style={styles.paymentRow}>
              <Text style={styles.paymentLabel}>
                Service Charge
              </Text>

              <Text style={styles.paymentValue}>
                ₹{' '}
                {Number(
                  order?.totals
                    ?.service_charge_total ||
                    0,
                ).toFixed(2)}
              </Text>
            </View>

            <View
              style={
                styles.paymentDivider
              }
            />

            <View style={styles.paymentRow}>
              <Text
                style={
                  styles.totalLabel
                }
              >
              Total
              </Text>

              <Text
                style={
                  [styles.totalValue,{fontSize:14}]
                }
              >
                ₹{' '}
                {Number(
                  order?.totals
                    ?.grand_total || 0,
                ).toFixed(2)}
              </Text>
            </View>
               <View style={styles.paymentRow}>
              <Text style={styles.paymentLabel}>
              Round Off
              </Text>

              <Text style={styles.paymentValue}>
                ₹{' '}
                {Number(
                  order?.totals
                    ?.RoundOff ||
                    0,
                ).toFixed(2)}
              </Text>
            </View>
            <View style={styles.paymentRow}>
              <Text
                style={
                  styles.totalLabel
                }
              >
              Grand Total
              </Text>

              <Text
                style={
                  styles.totalValue
                }
              >
                ₹{' '}
                {Number(
                  order?.totals
                    ?.Amount || 0,
                ).toFixed(2)}
              </Text>
            </View>
          </View>
        </View>

        {/* TIMELINE */}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Order Timeline
          </Text>

          {order?.timeline?.map(
            (timeline: any) => (
              <View
                key={timeline.id}
                style={styles.timelineRow}
              >
                <View
                  style={
                    [
                      styles.timelineDot,
                      {
                        backgroundColor:
                          timeline.status === 'Cancelled' || timeline.status === 'Rejected'
                            ? 'red'
                            : colors.secondary,
                      },
                    ]
                    
                  }
                />

                <View
                  style={{ flex: 1 }}
                >
                  <Text
                    style={
                      styles.timelineTitle
                    }
                  >
                    {
                      timeline.title
                    }
                  </Text>

                  <Text
                    style={
                      styles.timelineMessage
                    }
                  >
                    {
                      timeline.message
                    }
                  </Text>

                  <Text
                    style={
                      styles.timelineDate
                    }
                  >
                    {moment(
                      timeline.created_at,
                    ).format(
                      'DD MMM YYYY hh:mm A',
                    )}
                  </Text>
                </View>
              </View>
            ),
          )}
        </View>

        {/* CANCEL */}

        {String(
          order?.status,
        ).toLowerCase() ===
        'pending' ? (
          <Pressable
            onPress={cancelOrder}
            style={
              styles.cancelButton
            }
          >
            <Text
              style={
                styles.cancelButtonText
              }
            >
              Cancel Order
            </Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </View>
  );
};

export default MemberOrderDetails;

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor:
        colors.background,
    },

    loaderContainer: {
      flex: 1,
      backgroundColor:
        colors.background,
    },

    content: {
      padding: 16,
      paddingBottom: 40,
    },

    heroCard: {
      backgroundColor:
        colors.primary,
      borderRadius: 24,
      padding: 18,
      marginBottom: 18,
    },

    heroTop: {
      flexDirection: 'row',
      marginBottom: 16,
    },

    orderNumber: {
      color: colors.onPrimary,
      fontSize: 22,
      fontFamily:
        FONT_FAMILY.bold,
      marginBottom: 6,
    },

    orderDate: {
      color: colors.onPrimary,
      opacity: 0.8,
      fontSize: 13,
      fontFamily:
        FONT_FAMILY.medium,
    },

    statusBadge: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 999,
      alignSelf: 'flex-start',
    },

    statusText: {
      fontSize: 12,
      fontFamily:
        FONT_FAMILY.bold,
    },

    heroBottom: {
      flexDirection: 'row',
      gap: 12,
    },

    metricCard: {
      flex: 1,
      borderRadius: 18,
      backgroundColor:
        'rgba(255,255,255,0.14)',
      padding: 14,
    },

    metricLabel: {
      color: colors.onPrimary,
      opacity: 0.8,
      fontSize: 12,
      marginBottom: 6,
      fontFamily:
        FONT_FAMILY.medium,
    },

    metricValue: {
      color: colors.onPrimary,
      fontSize: 16,
      fontFamily:
        FONT_FAMILY.bold,
    },

    section: {
      marginBottom: 18,
    },

    sectionTitle: {
      color: colors.text,
      fontSize: 16,
      marginBottom: 12,
      fontFamily:
        FONT_FAMILY.bold,
    },

    infoCard: {
      backgroundColor:
        colors.surface,
      borderRadius: 20,
      padding: 16,
      borderWidth: 1,
      borderColor:
        colors.border,
      gap: 14,
    },

    infoRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },

    infoText: {
      flex: 1,
      marginLeft: 12,
      color: colors.text,
      fontSize: 13,
      lineHeight: 20,
      fontFamily:
        FONT_FAMILY.medium,
    },

    partnerTop: {
      flexDirection: 'row',
      justifyContent:
        'space-between',
      alignItems: 'center',
    },

    partnerName: {
      color: colors.text,
      fontSize: 15,
      fontFamily:
        FONT_FAMILY.bold,
    },

    partnerSub: {
      color: colors.textMuted,
      marginTop: 4,
      fontSize: 12,
      fontFamily:
        FONT_FAMILY.medium,
    },

    callButton: {
    padding:10,
      borderRadius: 10,
      backgroundColor:
        colors.success,
      alignItems: 'center',
      justifyContent:
        'center',
    },

    itemCard: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      borderRadius: 18,
      backgroundColor:
        colors.surface,
      borderWidth: 1,
      borderColor:
        colors.border,
      marginBottom: 12,
    },

    itemTitle: {
      color: colors.text,
      fontSize: 14,
      marginBottom: 4,
      fontFamily:
        FONT_FAMILY.semiBold,
    },

    itemSub: {
      color: colors.textMuted,
      fontSize: 12,
      fontFamily:
        FONT_FAMILY.medium,
    },

    itemPrice: {
      color: colors.text,
      fontSize: 14,
      fontFamily:
        FONT_FAMILY.bold,
    },

    paymentCard: {
      backgroundColor:
        colors.surface,
      borderRadius: 20,
      padding: 18,
      borderWidth: 1,
      borderColor:
        colors.border,
    },

    paymentRow: {
      flexDirection: 'row',
      justifyContent:
        'space-between',
      marginBottom: 14,
    },

    paymentLabel: {
      color: colors.textMuted,
      fontSize: 13,
      fontFamily:
        FONT_FAMILY.medium,
    },

    paymentValue: {
      color: colors.text,
      fontSize: 13,
      fontFamily:
        FONT_FAMILY.semiBold,
    },

    paymentDivider: {
      height: 1,
      backgroundColor:
        colors.border,
      marginVertical: 10,
    },

    totalLabel: {
      color: colors.text,
      fontSize: 16,
      fontFamily:
        FONT_FAMILY.bold,
    },

    totalValue: {
      color: colors.secondary,
      fontSize: 18,
      fontFamily:
        FONT_FAMILY.bold,
    },

    timelineRow: {
      flexDirection: 'row',
      marginBottom: 18,
    },

    timelineDot: {
      width: 12,
      height: 12,
      borderRadius: 999,
      marginTop: 4,
      marginRight: 14,
      backgroundColor:
        colors.secondary,
    },

    timelineTitle: {
      color: colors.text,
      fontSize: 14,
      marginBottom: 4,
      fontFamily:
        FONT_FAMILY.bold,
    },

    timelineMessage: {
      color: colors.textMuted,
      fontSize: 12,
      lineHeight: 18,
      fontFamily:
        FONT_FAMILY.medium,
    },

    timelineDate: {
      color: colors.textMuted,
      marginTop: 6,
      fontSize: 11,
      fontFamily:
        FONT_FAMILY.medium,
    },

    cancelButton: {
      height: 54,
      borderRadius: 18,
      borderColor:
        colors.danger,
        borderWidth:1,
      alignItems: 'center',
      justifyContent:
        'center',
      marginTop: 12,
    },

    cancelButtonText: {
      color: colors.danger,
      fontSize: 15,
      fontFamily:
        FONT_FAMILY.bold,
    },
  });
// import { StyleSheet, Text, View } from 'react-native'
// import React from 'react'
// import { NativeStackScreenProps } from '@react-navigation/native-stack'
// import { AppStackParamList } from '../../navigation/AppDrawer'
// import Header from '../../components/Header'


//  type Props=NativeStackScreenProps<AppStackParamList,'MemberOrderDetails'>
// const MemberOrderDetails:React.FC<Props> = ({route}) => {

//   return (
//     <View>
//     <Header title='Food order detail'/>
//     </View>
//   )
// }

// export default MemberOrderDetails

// const styles = StyleSheet.create({})
