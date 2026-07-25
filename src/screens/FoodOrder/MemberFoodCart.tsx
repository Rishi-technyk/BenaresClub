import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useDispatch, useSelector } from 'react-redux';
import { useQuery } from '@tanstack/react-query';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import Header from '../../components/Header';
import AppAlertModal from '../../components/feedback/AppAlertModal';
import { useAppAlert } from '../../hooks/useAppAlert';
import { AppStackParamList } from '../../navigation/AppDrawer';
import { RootState } from '../../store/store';
import {
  clearFoodCart,
  removeFoodItem,
  setFoodDeliveryAddress,
  setFoodDeliveryTime,
  setFoodItemNotes,
  setFoodNotes,
  setFoodPaymentMethod,
  updateFoodQuantity,
} from '../../store/slices/memberFoodSlice';
import { useAppTheme } from '../../theme/AppThemeProvider';
import { FONT_FAMILY } from '../../util/colors';
import {
  createMemberFoodOrder,
  getMemberFoodCheckoutSummary,
} from '../../services/Food/memberFoodService';
import UniversalModal from '../../components/UniversalModal';

type Props = NativeStackScreenProps<AppStackParamList, 'MemberFoodCart'>;

const MemberFoodCart: React.FC<Props> = ({ navigation, route }) => {
  const dispatch = useDispatch();
  const payMode = route.params.paymentMode;
  const { colors } = useAppTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const { alertState, showAlert, hideAlert } = useAppAlert();
  const auth = useSelector((state: RootState) => state.auth);
  const cart = useSelector((state: RootState) => state.memberFood);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [payModalVisible, setPayModalVisible] = useState(false);
  const [remarkItemId, setRemarkItemId] = useState<number | null>(null);
  const [remarkDraft, setRemarkDraft] = useState('');
  const checkoutQuery = useQuery({
    queryKey: ['member-food-checkout-summary', cart.orderType, auth?.token],
    queryFn: () =>
      getMemberFoodCheckoutSummary(
        auth?.token || '',
        cart.orderType || 'take_away',
      ),
    enabled: !!auth?.token && !!cart.orderType,
  });
  const totals = useMemo(() => {
    return cart.items.reduce(
      (acc, item) => {
        const lineSubtotal = item.rate * item.quantity;
        const serviceRate = Number(
          item.service_charge?.enabled ? item.service_charge?.rate || 0 : 0,
        );
        const serviceCharge = lineSubtotal * (serviceRate / 100);

        const gstRate = Number(item.gst?.rate || 0);
        const gstAmount = lineSubtotal * (gstRate / 100);

        acc.subtotal += lineSubtotal;
        acc.service_charge_total += serviceCharge;
        acc.gst_total += gstAmount;
        acc.grand_total += lineSubtotal + serviceCharge + gstAmount;
        return acc;
      },
      {
        subtotal: 0,
        service_charge_total: 0,
        gst_total: 0,
        grand_total: 0,
      },
    );
  }, [cart.items]);

  const paymentSummary = checkoutQuery.data?.data?.payment_summary;
  const deliverySlots = checkoutQuery.data?.data?.delivery_slots || [];
  console.log(
    deliverySlots,
    '---------------------- deliverySlots ---------------------',
  );
  const remarkItem = useMemo(
    () => cart.items.find(item => item.item_id === remarkItemId) || null,
    [cart.items, remarkItemId],
  );
  const remarkSuggestions = useMemo(
    () => remarkItem?.remark_suggestions?.filter(Boolean) || [],
    [remarkItem],
  );

  const handleOpenRemarkSheet = (itemId: number, notes?: string) => {
    setRemarkItemId(itemId);
    setRemarkDraft(notes || '');
  };

  const handleCloseRemarkSheet = () => {
    setRemarkItemId(null);
    setRemarkDraft('');
  };

  const handleSaveRemark = () => {
    if (!remarkItemId) {
      return;
    }

    dispatch(
      setFoodItemNotes({ itemId: remarkItemId, notes: remarkDraft.trim() }),
    );
    handleCloseRemarkSheet();
  };

  const handleSelectSuggestion = (suggestion: string) => {
    setRemarkDraft(current => {
      const trimmed = current.trim();
      if (!trimmed) {
        return suggestion;
      }

      if (trimmed.toLowerCase().includes(suggestion.toLowerCase())) {
        return current;
      }

      return `${trimmed}, ${suggestion}`;
    });
  };

  const handlePlaceOrder = async () => {
    setPayModalVisible(false);
    if (!cart.orderType || !cart.items.length) {
      showAlert({
        title: 'Cart is empty',
        message: 'Please add at least one item before placing your order.',
        tone: 'warning',
      });
      return;
    }

    if (cart.orderType === 'home_delivery' && !cart.deliveryTimeId) {
      showAlert({
        title: 'Select a delivery slot',
        message:
          'Choose one delivery slot so the kitchen can plan your order correctly.',
        tone: 'warning',
      });
      return;
    }

    if (cart.orderType === 'home_delivery' && !cart.deliveryAddress.trim()) {
      showAlert({
        title: 'Delivery address needed',
        message:
          'Enter the delivery address from your member profile or adjust it here before checkout.',
        tone: 'warning',
      });
      return;
    }

    if (
      cart.paymentMethod === 'card' &&
      totals.grand_total > Number(paymentSummary?.card?.balance || 0)
    ) {
      showAlert({
        title: 'Recharge needed',
        message:
          'Your card balance is lower than the order total. Recharge now and try again.',
        tone: 'warning',
        primaryLabel: 'Recharge Card',
        secondaryLabel: 'Not now',
        onPrimaryPress: () => navigation.navigate('Recharge'),
      });
      return;
    }

    if (
      cart.paymentMethod === 'subscription' &&
      totals.grand_total >
        Number(paymentSummary?.subscription?.available_limit || 0)
    ) {
      showAlert({
        title: 'Subscription limit exceeded',
        message:
          'The available subscription limit is not enough for this food order.',
        tone: 'danger',
      });
      return;
    }
    try {
      setPlacingOrder(true);
      const response = await createMemberFoodOrder(auth?.token || '', {
        outlet_id: cart.items[0].outlet_id,
        order_type: cart.orderType,
        payment_method: cart.paymentMethod,
        delivery_time_id:
          cart.orderType === 'home_delivery' ? cart.deliveryTimeId : null,
        delivery_address:
          cart.orderType === 'home_delivery' ? cart.deliveryAddress : null,
        notes: cart.notes,
        items: cart.items.map(item => ({
          item_id: item.item_id,
          quantity: item.quantity,
          notes: item.notes || '',
        })),
      });
      console.log(
        {
          outlet_id: cart.items[0].outlet_id,
          order_type: cart.orderType,
          payment_method: cart.paymentMethod,
          delivery_time_id:
            cart.orderType === 'home_delivery' ? cart.deliveryTimeId : null,
          delivery_address:
            cart.orderType === 'home_delivery' ? cart.deliveryAddress : null,
          notes: cart.notes,
          items: cart.items.map(item => ({
            item_id: item.item_id,
            quantity: item.quantity,
            notes: item.notes || '',
          })),
        },
        '----------------------  ---------------------',
      );
      if (!response?.status) {
        showAlert({
          title: 'Unable to place order',
          message: response?.message || 'Please try again in a moment.',
          tone: 'danger',
        });
        return;
      } else {
        showAlert({
          title: 'Order placed',
          message: `Your order ${
            response?.data?.order_number || ''
          } has been saved successfully.`,
          tone: 'success',
          primaryLabel: 'View Orders',
          onPrimaryPress: () => {
            navigation.replace('MemberOrderDetails', { id: response.data.id });

            setTimeout(() => {
              dispatch(clearFoodCart());
            }, 2000);
          },
        });
      }

      navigation.replace('MemberOrderDetails', { id: response.data.id });
    } catch (error) {
      showAlert({
        title: 'Checkout failed',
        message:
          'Something went wrong while placing the order. Please try again.',
        tone: 'danger',
      });
    } finally {
      setPlacingOrder(false);
      setTimeout(() => {
        dispatch(clearFoodCart());
      }, 2000);
    }
  };

  if (!cart.items.length) {
    return (
      <View style={styles.container}>
        <Header title="Food Cart" />
        <View style={styles.emptyState}>
          <Icon name="cart-off" size={44} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>Your cart is empty</Text>
          <Text style={styles.emptyText}>
            Browse the menu and add items to continue with checkout.
          </Text>
          <Pressable
            onPress={() => navigation.goBack()}
            style={styles.backToMenuButton}
          >
            <Text style={styles.backToMenuLabel}>Back to menu</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header title="Food Cart">
        {' '}
        <Pressable
          onPress={() => navigation.goBack()}
          style={{ padding: 8, flexDirection: 'row', alignItems: 'center' }}
        >
          <Icon name="cart" size={20} color={colors.danger} />
          <Text
            style={{
              color: colors.danger,
              marginLeft: 6,
              fontFamily: FONT_FAMILY.medium,
            }}
          >
            Clear Cart
          </Text>
        </Pressable>
      </Header>

      <FlatList
        data={cart.items}
        keyExtractor={item => String(item.item_id)}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <>
            <View style={styles.summaryCard}>
              <View style={styles.summaryTopRow}>
                <View style={styles.summaryChip}>
                  <Text style={styles.summaryChipText}>
                    {cart.orderType === 'home_delivery'
                      ? 'Home Delivery'
                      : 'Take Away'}
                  </Text>
                </View>
                <Text style={styles.summaryHeadline}>
                  Review before placing the order
                </Text>
              </View>

              <View style={styles.summaryStatsRow}>
                <View style={styles.summaryMetric}>
                  <Text style={styles.summaryMetricLabel}>Subtotal</Text>
                  <Text style={styles.summaryMetricValue}>
                    ₹ {totals.subtotal.toFixed(2)}
                  </Text>
                </View>
                <View style={styles.summaryMetric}>
                  <Text style={styles.summaryMetricLabel}>Grand Total</Text>
                  <Text style={styles.summaryMetricValue}>
                    ₹ {totals.grand_total.toFixed(2)}
                  </Text>
                </View>
              </View>
            </View>

            {checkoutQuery.isLoading ? (
              <View style={styles.loaderWrap}>
                <ActivityIndicator color={colors.primary} size="large" />
              </View>
            ) : null}

            {cart.orderType === 'home_delivery' ? (
              <View style={styles.formCard}>
                <Text style={styles.formTitle}>Delivery address</Text>
                <TextInput
                  value={cart.deliveryAddress}
                  onChangeText={value =>
                    dispatch(setFoodDeliveryAddress(value))
                  }
                  placeholder="Delivery address"
                  placeholderTextColor={colors.placeholder}
                  editable={false}
                  multiline
                  style={styles.addressInput}
                />
              </View>
            ) : null}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.slotRow}
            >
              {deliverySlots.map((slot: any) => {
                const selected = cart.deliveryTimeId === slot.id;
                return (
                  <Pressable
                    key={slot.id}
                    style={[
                      styles.slotChip,
                      selected ? styles.slotChipActive : null,
                    ]}
                    onPress={() =>
                      dispatch(
                        setFoodDeliveryTime({
                          deliveryTimeId: slot.id,
                          deliverySlotLabel: slot.label,
                        }),
                      )
                    }
                  >
                    <Text
                      style={[
                        styles.slotChipLabel,
                        selected ? styles.slotChipLabelActive : null,
                      ]}
                    >
                      {slot.label}
                    </Text>
                    <Text
                      style={[
                        styles.slotChipMeta,
                        selected ? styles.slotChipLabelActive : null,
                      ]}
                    >
                      {slot.start_time} - {slot.end_time}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <View style={styles.formCard}>
              <Text style={styles.formTitle}>Order notes</Text>
              <TextInput
                value={cart.notes}
                onChangeText={value => dispatch(setFoodNotes(value))}
                placeholder="Add delivery or kitchen notes"
                placeholderTextColor={colors.placeholder}
                multiline
                style={styles.addressInput}
              />
            </View>
          </>
        }
        renderItem={({ item }) => (
          <View style={styles.cartItemCard}>
            <View style={styles.cartItemTopRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cartItemTitle}>{item.name}</Text>
                <Text style={styles.cartItemMeta}>
                  ₹ {item.rate.toFixed(2)} each
                </Text>
              </View>

              <View style={styles.quantityWrap}>
                <Pressable
                  onPress={() =>
                    item.quantity === 1
                      ? dispatch(removeFoodItem(item.item_id))
                      : dispatch(
                          updateFoodQuantity({
                            itemId: item.item_id,
                            quantity: item.quantity - 1,
                          }),
                        )
                  }
                  style={styles.quantityButton}
                >
                  <Icon
                    name={item.quantity === 1 ? 'delete-outline' : 'minus'}
                    size={18}
                    color={colors.text}
                  />
                </Pressable>
                <Text style={styles.quantityText}>{item.quantity}</Text>
                <Pressable
                  disabled={Number(item.capacity) <= item.quantity}
                  onPress={() =>
                    dispatch(
                      updateFoodQuantity({
                        itemId: item.item_id,
                        quantity: item.quantity + 1,
                      }),
                    )
                  }
                  style={[
                    styles.quantityButton,
                    {
                      opacity: Number(item.capacity) <= item.quantity ? 0.2 : 1,
                    },
                  ]}
                >
                  <Icon name="plus" size={18} color={colors.text} />
                </Pressable>
              </View>
            </View>

            {item.notes ? (
              <View style={styles.itemRemarkPreview}>
                <Icon
                  name="note-text-outline"
                  size={15}
                  color={colors.textMuted}
                />
                <Text style={styles.itemRemarkText} numberOfLines={2}>
                  {item.notes}
                </Text>
              </View>
            ) : null}
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: 12,
              }}
            >
              <Pressable
                style={styles.addRemarkButton}
                onPress={() => handleOpenRemarkSheet(item.item_id, item.notes)}
              >
                {/* <Icon name={item.notes ? 'pencil-outline' : 'plus'} size={16} color={colors.secondary} /> */}
                <Text style={styles.addRemarkButtonLabel}>
                  {item.notes ? 'Edit Instructions' : 'Add Instructions'}
                </Text>
              </Pressable>
              <View style={styles.itemInfoRow}>
                <View style={styles.itemInfoChip}>
                  <Icon name="receipt" size={14} color={colors.primary} />
                  <Text style={styles.itemInfoText}>{item.gst?.label}</Text>
                </View>
                {item.service_charge?.enabled ? (
                  <View style={styles.itemInfoChip}>
                    <Icon
                      name="silverware-fork-knife"
                      size={14}
                      color={colors.warning}
                    />
                    <Text style={styles.itemInfoText}>
                      Service{' '}
                      {Number(item.service_charge?.rate || 0).toFixed(0)}%
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>
          </View>
        )}
        ListFooterComponent={
          <View style={styles.checkoutCard}>
            <View style={styles.checkoutRow}>
              <Text style={styles.checkoutLabel}>Subtotal</Text>
              <Text style={styles.checkoutValue}>
                ₹ {totals.subtotal.toFixed(2)}
              </Text>
            </View>

            <View style={styles.checkoutRow}>
              <Text style={styles.checkoutLabel}>Tax</Text>
              <Text style={styles.checkoutValue}>
                ₹ {totals.gst_total.toFixed(2)}
              </Text>
            </View>
            <View style={styles.checkoutRow}>
              <Text style={styles.checkoutLabel}>Service Charge</Text>
              <Text style={styles.checkoutValue}>
                ₹ {totals.service_charge_total.toFixed(2)}
              </Text>
            </View>
            <View style={[styles.checkoutRow, styles.checkoutTotalRow]}>
              <Text style={styles.checkoutTotalLabel}>Grand Total</Text>
              <Text style={styles.checkoutTotalValue}>
                ₹ {totals.grand_total.toFixed(2)}
              </Text>
            </View>

            <Pressable
              disabled={placingOrder}
              style={styles.placeOrderButton}
              onPress={() => {
                dispatch(
                  setFoodPaymentMethod(
                    payMode.Subscription ? 'subscription' : 'card',
                  ),
                );
                setPayModalVisible(true);
              }}
            >
              {placingOrder && (
                <ActivityIndicator
                  color={colors.text}
                  style={{ marginRight: 5 }}
                />
              )}
              <Text style={styles.placeOrderButtonLabel}>Place Food Order</Text>
            </Pressable>
          </View>
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
      <UniversalModal
        title="Select Payment method"
        visible={payModalVisible}
        setVisible={setPayModalVisible}
        isFull={false}
      >
        <View style={styles.formCard}>
          {/* <Text style={styles.formTitle}>Payment method</Text> */}
          {payMode.Subscription && (
            <Pressable
              style={[
                styles.paymentOption,
                cart.paymentMethod === 'subscription'
                  ? styles.paymentOptionActive
                  : null,
              ]}
              onPress={() => dispatch(setFoodPaymentMethod('subscription'))}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.paymentLabel}>Subscription</Text>
                <Text style={styles.paymentMeta}>
                  Outstanding:{' '}
                  <Text style={styles.paymentLabel}>
                    ₹{' '}
                    {Number(
                      paymentSummary?.subscription?.outstanding_amount || 0,
                    ).toFixed(2)}
                  </Text>
                </Text>
                <Text style={styles.paymentMeta}>
                  Available limit:{' '}
                  <Text style={styles.paymentLabel}>
                    ₹{' '}
                    {Number(
                      paymentSummary?.subscription?.available_limit || 0,
                    ).toFixed(2)}
                  </Text>
                </Text>
              </View>
              <Icon
                name={
                  cart.paymentMethod === 'subscription'
                    ? 'radiobox-marked'
                    : 'radiobox-blank'
                }
                size={22}
                color={colors.success}
              />
            </Pressable>
          )}

          {payMode.Card && (
            <Pressable
              style={[
                styles.paymentOption,
                cart.paymentMethod === 'card'
                  ? styles.paymentOptionActive
                  : null,
              ]}
              onPress={() => dispatch(setFoodPaymentMethod('card'))}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.paymentLabel}>Card Payment</Text>
                <Text style={styles.paymentMeta}>
                  Card closing balance:{' '}
                  <Text style={styles.paymentLabel}>
                    ₹ {Number(paymentSummary?.card?.balance || 0).toFixed(2)}
                  </Text>
                </Text>
              </View>
              <Icon
                name={
                  cart.paymentMethod === 'card'
                    ? 'radiobox-marked'
                    : 'radiobox-blank'
                }
                size={22}
                color={colors.success}
              />
            </Pressable>
          )}
          <Pressable
            disabled={placingOrder}
            style={styles.placeOrderButton}
            onPress={handlePlaceOrder}
          >
            {placingOrder && (
              <ActivityIndicator
                color={colors.text}
                style={{ marginRight: 5 }}
              />
            )}
            <Text style={styles.placeOrderButtonLabel}>Pay Now</Text>
          </Pressable>
        </View>
      </UniversalModal>

      <Modal
        visible={!!remarkItem}
        transparent
        animationType="slide"
        onRequestClose={handleCloseRemarkSheet}
      >
        <View style={styles.remarkBackdrop}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={handleCloseRemarkSheet}
          />
          <View style={styles.remarkSheet}>
            <View style={styles.remarkHandle} />
            <View style={styles.remarkHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.remarkTitle}>Item remark</Text>
                <Text style={styles.remarkSubtitle} numberOfLines={1}>
                  {remarkItem?.name}
                </Text>
              </View>
              <Pressable
                style={styles.remarkCloseButton}
                onPress={handleCloseRemarkSheet}
              >
                <Icon name="close" size={20} color={colors.text} />
              </Pressable>
            </View>

            <TextInput
              value={remarkDraft}
              onChangeText={setRemarkDraft}
              placeholder="Add item-specific instructions"
              placeholderTextColor={colors.placeholder}
              multiline
              style={styles.remarkInput}
            />

            {remarkSuggestions.length ? (
              <View style={styles.suggestionBlock}>
                <Text style={styles.suggestionTitle}>Suggestions</Text>
                <View style={styles.suggestionList}>
                  {remarkSuggestions.map((suggestion, index) => (
                    <Pressable
                      key={`${suggestion}-${index}`}
                      style={styles.suggestionChip}
                      onPress={() => handleSelectSuggestion(suggestion)}
                    >
                      <Text style={styles.suggestionChipText}>
                        {suggestion}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : null}

            <View style={styles.remarkActionRow}>
              <Pressable
                style={styles.remarkClearButton}
                onPress={() => setRemarkDraft('')}
              >
                <Text style={styles.remarkClearButtonLabel}>Clear</Text>
              </Pressable>
              <Pressable
                style={styles.remarkSaveButton}
                onPress={handleSaveRemark}
              >
                <Text style={styles.remarkSaveButtonLabel}>Save Remark</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
      padding: 16,
      paddingBottom: 36,
      gap: 14,
    },
    emptyState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 24,
    },
    emptyTitle: {
      color: colors.text,
      fontFamily: FONT_FAMILY.bold,
      fontSize: 20,
      marginTop: 14,
      marginBottom: 8,
    },
    emptyText: {
      color: colors.textMuted,
      fontFamily: FONT_FAMILY.regular,
      fontSize: 14,
      lineHeight: 21,
      textAlign: 'center',
      marginBottom: 16,
    },
    backToMenuButton: {
      paddingHorizontal: 18,
      paddingVertical: 12,
      backgroundColor: colors.primary,
      borderRadius: 16,
    },
    backToMenuLabel: {
      color: colors.onPrimary,
      fontFamily: FONT_FAMILY.semiBold,
    },
    summaryCard: {
      backgroundColor: colors.primary,
      borderRadius: 24,
      padding: 18,
      marginBottom: 14,
    },
    summaryTopRow: {
      marginBottom: 14,
    },
    summaryChip: {
      alignSelf: 'flex-start',
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 999,
      backgroundColor: 'rgba(255,255,255,0.14)',
      marginBottom: 10,
    },
    summaryChipText: {
      color: colors.onPrimary,
      fontFamily: FONT_FAMILY.semiBold,
      fontSize: 12,
    },
    summaryHeadline: {
      color: colors.onPrimary,
      fontFamily: FONT_FAMILY.bold,
      fontSize: 22,
      lineHeight: 28,
    },
    summaryStatsRow: {
      flexDirection: 'row',
      gap: 12,
    },
    summaryMetric: {
      flex: 1,
      padding: 14,
      borderRadius: 18,
      backgroundColor: 'rgba(255,255,255,0.14)',
    },
    summaryMetricLabel: {
      color: colors.onPrimary,
      opacity: 0.78,
      fontFamily: FONT_FAMILY.medium,
      fontSize: 12,
      marginBottom: 4,
    },
    summaryMetricValue: {
      color: colors.onPrimary,
      fontFamily: FONT_FAMILY.bold,
      fontSize: 16,
    },
    loaderWrap: {
      alignItems: 'center',
      paddingVertical: 24,
    },
    formCard: {
      backgroundColor: colors.surface,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
      marginBottom: 14,
    },
    formTitle: {
      color: colors.text,
      fontFamily: FONT_FAMILY.bold,
      fontSize: 16,
      marginBottom: 12,
    },
    addressInput: {
      minHeight: 82,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.background,
      color: colors.text,
      fontFamily: FONT_FAMILY.medium,
      paddingHorizontal: 14,
      paddingVertical: 12,
      textAlignVertical: 'top',
    },
    slotRow: {
      gap: 10,
      paddingTop: 12,
    },
    itemInfoRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    itemInfoChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 7,
      borderRadius: 999,
      backgroundColor: colors.surfaceAlt,
    },
    itemInfoText: {
      color: colors.text,
      fontFamily: FONT_FAMILY.medium,
      fontSize: 12,
    },
    slotChip: {
      minWidth: 132,
      padding: 12,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.background,
    },
    slotChipActive: {
      backgroundColor: colors.primary,
      borderColor: colors.success,
    },
    slotChipLabel: {
      color: colors.text,
      fontFamily: FONT_FAMILY.semiBold,
      fontSize: 13,
      marginBottom: 3,
    },
    slotChipLabelActive: {
      color: colors.onPrimary,
    },
    slotChipMeta: {
      color: colors.textMuted,
      fontFamily: FONT_FAMILY.medium,
      fontSize: 11,
    },
    paymentOption: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.background,
      padding: 14,
      marginBottom: 12,
    },
    paymentOptionActive: {
      borderColor: colors.primary,
      backgroundColor: colors.surfaceAlt,
    },
    paymentLabel: {
      color: colors.text,
      fontFamily: FONT_FAMILY.semiBold,
      fontSize: 14,
      marginBottom: 6,
    },
    paymentMeta: {
      color: colors.textMuted,
      fontFamily: FONT_FAMILY.medium,
      fontSize: 12,
      lineHeight: 18,
    },
    cartItemCard: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      marginBottom: 12,
    },
    cartItemTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    cartItemTitle: {
      color: colors.text,
      fontFamily: FONT_FAMILY.semiBold,
      fontSize: 15,
      marginBottom: 4,
    },
    cartItemMeta: {
      color: colors.textMuted,
      fontFamily: FONT_FAMILY.medium,
      fontSize: 12,
    },
    itemRemarkPreview: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 7,
      borderRadius: 14,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 11,
      paddingVertical: 9,
      marginTop: 12,
    },
    itemRemarkText: {
      flex: 1,
      color: colors.textMuted,
      fontFamily: FONT_FAMILY.medium,
      fontSize: 12,
      lineHeight: 17,
    },
    addRemarkButton: {
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 12,
      backgroundColor: colors.primary,
      borderWidth: 1,
      borderColor: colors.border,
    },
    addRemarkButtonLabel: {
      color: colors.onPrimary,
      fontFamily: FONT_FAMILY.semiBold,
      fontSize: 12,
    },
    quantityWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    quantityButton: {
      width: 34,
      height: 34,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
    },
    quantityText: {
      color: colors.text,
      fontFamily: FONT_FAMILY.bold,
      minWidth: 20,
      textAlign: 'center',
    },
    checkoutCard: {
      backgroundColor: colors.surface,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 18,
      marginTop: 4,
    },
    checkoutRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 10,
    },
    checkoutLabel: {
      color: colors.textMuted,
      fontFamily: FONT_FAMILY.medium,
      fontSize: 14,
    },
    checkoutValue: {
      color: colors.text,
      fontFamily: FONT_FAMILY.semiBold,
      fontSize: 14,
    },
    checkoutTotalRow: {
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingTop: 14,
      marginTop: 6,
      marginBottom: 18,
    },
    checkoutTotalLabel: {
      color: colors.text,
      fontFamily: FONT_FAMILY.bold,
      fontSize: 16,
    },
    checkoutTotalValue: {
      color: colors.secondary,
      fontFamily: FONT_FAMILY.bold,
      fontSize: 18,
    },
    placeOrderButton: {
      minHeight: 52,
      borderRadius: 18,
      backgroundColor: colors.secondary,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
    },
    placeOrderButtonLabel: {
      color: colors.onPrimary,
      fontFamily: FONT_FAMILY.semiBold,
      fontSize: 15,
    },
    remarkBackdrop: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: 'rgba(0,0,0,0.44)',
    },
    remarkSheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 26,
      borderTopRightRadius: 26,
      paddingHorizontal: 18,
      paddingTop: 10,
      paddingBottom: 24,
      borderWidth: 1,
      borderColor: colors.border,
    },
    remarkHandle: {
      width: 42,
      height: 4,
      borderRadius: 99,
      backgroundColor: colors.border,
      alignSelf: 'center',
      marginBottom: 14,
    },
    remarkHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 14,
    },
    remarkTitle: {
      color: colors.text,
      fontFamily: FONT_FAMILY.bold,
      fontSize: 18,
      marginBottom: 3,
    },
    remarkSubtitle: {
      color: colors.textMuted,
      fontFamily: FONT_FAMILY.medium,
      fontSize: 13,
    },
    remarkCloseButton: {
      width: 38,
      height: 38,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
    },
    remarkInput: {
      minHeight: 104,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.background,
      color: colors.text,
      fontFamily: FONT_FAMILY.medium,
      paddingHorizontal: 14,
      paddingVertical: 12,
      textAlignVertical: 'top',
    },
    suggestionBlock: {
      marginTop: 16,
    },
    suggestionTitle: {
      color: colors.text,
      fontFamily: FONT_FAMILY.semiBold,
      fontSize: 13,
      marginBottom: 10,
    },
    suggestionList: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 9,
    },
    suggestionChip: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.background,
    },
    suggestionChipText: {
      color: colors.text,
      fontFamily: FONT_FAMILY.medium,
      fontSize: 12,
    },
    remarkActionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginTop: 18,
    },
    remarkClearButton: {
      minHeight: 48,
      paddingHorizontal: 18,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.background,
    },
    remarkClearButtonLabel: {
      color: colors.text,
      fontFamily: FONT_FAMILY.semiBold,
      fontSize: 14,
    },
    remarkSaveButton: {
      flex: 1,
      minHeight: 48,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.secondary,
    },
    remarkSaveButtonLabel: {
      color: colors.onPrimary,
      fontFamily: FONT_FAMILY.semiBold,
      fontSize: 14,
    },
  });

export default MemberFoodCart;
