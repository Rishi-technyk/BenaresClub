import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import { useDispatch, useSelector } from 'react-redux';
import { useQuery } from '@tanstack/react-query';

import Header from '../../components/Header';
import AppAlertModal from '../../components/feedback/AppAlertModal';
import { useAppAlert } from '../../hooks/useAppAlert';
import { AppStackParamList } from '../../navigation/AppDrawer';
import { RootState } from '../../store/store';
import { addFoodItem, clearFoodCart, removeFoodItem, startFoodOrder, updateFoodQuantity } from '../../store/slices/memberFoodSlice';
import { useAppTheme } from '../../theme/AppThemeProvider';
import { FONT_FAMILY } from '../../util/colors';
import { getMemberFoodMenu } from '../../services/Food/memberFoodService';
import UniversalModal from '../../components/UniversalModal';

type Props = NativeStackScreenProps<AppStackParamList, 'FoodMenu'>;

type FoodItem = {
  id: number;
  name: string;
  code?: string;
  capacity?: string;
  rate: number;
  quantity?: number;
  item_id: number;
  description?: string;
  remark_suggestions?: string[];
  gst?: {
    label?: string;
    rate?: number;
  };
  service_charge?: {
    enabled?: boolean;
    type?: string | null;
    rate?: number;
  };
};

const FoodMenu: React.FC<Props> = ({ navigation, route }) => {
  const { orderType } = route.params;
  const dispatch = useDispatch();
  const { colors } = useAppTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const auth = useSelector((state: RootState) => state.auth);
  const memberFood = useSelector((state: RootState) => state.memberFood);
  const { alertState, showAlert, hideAlert } = useAppAlert();
  const [searchModalVisible, setSearchModalVisible] = useState(false);
  const [searchValue, setSearchValue] = useState('');

const [selectedOutlet, setSelectedOutlet] =
  useState<number | null>(null);

  const menuQuery = useQuery({
    queryKey: ['member-food-menu', orderType,   selectedOutlet,auth?.token],
    queryFn: () => getMemberFoodMenu(auth?.token || '', orderType, undefined, selectedOutlet || undefined),
    enabled: !!auth?.token,
  });
    useEffect(() => {
    
    dispatch(
      startFoodOrder({
        orderType,
        deliveryAddress:menuQuery?.data?.data?.member?.address || '',
        memberLocation: menuQuery?.data?.data?.member?.location || '',
      }),
    );
  }, [menuQuery?.data?.data?.member?.location, menuQuery?.data?.data?.member?.address, dispatch, orderType]);
useEffect(() => {

  const outlets =
    menuQuery.data?.data?.outlets || [];

  if (
    outlets.length &&
    !selectedOutlet
  ) {
    setSelectedOutlet(outlets[0].id);
  }

}, [
  menuQuery.data,
  selectedOutlet,
]);
console.log( menuQuery, '---------------------- menuQuery ---------------------');

  const categories = useMemo(() => menuQuery.data?.data?.categories || [], [menuQuery.data]);
  const paymentSummary = menuQuery.data?.data?.payment_summary;
  const paymentMode = menuQuery.data?.data?.paymentMode||[];
  const deliveryLocation = menuQuery.data?.data?.delivery_location;
  const cartItemCount = memberFood.items.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = memberFood.items.reduce((sum, item) => sum + item.rate * item.quantity, 0);
  const outlets = useMemo(() => menuQuery.data?.data?.outlets || [], [menuQuery.data]);
const SearchInputRef=useRef<TextInput | null>(null);


  const flattenedItems = useMemo(() => {
  return categories.flatMap((category: any) =>
    (category.groups || []).flatMap((group: any) =>
      (group.sub_groups || []).flatMap((subGroup: any) =>
        (subGroup.items || []).map((item: FoodItem) => {
          const cartItem = memberFood.items.find(
            cart => cart.item_id === item.id,
          );

          return {
            ...item,
            item_id: item.id,
            quantity: cartItem?.quantity || 0,
            categoryName: category.name,
            groupName: group.name,
            subGroupName: subGroup.name,
          };
        }),
      ),
    ),
  );
}, [categories, memberFood.items]);

  const filteredSearchItems = useMemo(() => {
    const needle = searchValue.trim().toLowerCase();
    if (!needle) {
      return flattenedItems;
    }

    return flattenedItems.filter((item: any) =>
      [item.name, item.code, item.description, item.categoryName, item.groupName, item.subGroupName]
        .filter(Boolean)
        .some(value => String(value).toLowerCase().includes(needle)),
    );
  }, [flattenedItems, searchValue]);
const selectedOutletData = useMemo(
  () =>
    (
      outlets || []
    ).find(
      (outlet: any) =>
        outlet.id === selectedOutlet,
    ),
  [
   outlets,
    selectedOutlet,
  ],
);
  const handleAddItem = (item: FoodItem) => {


    dispatch(
      addFoodItem({
         outlet_id: selectedOutlet || 0,

    outlet_name:
      selectedOutletData?.name,
        item_id: item.id,
        name: item.name,
        code: item.code,
        description: item.description,
        capacity: item.capacity,
        rate: Number(item.rate),
        gst: item.gst,
        service_charge: item.service_charge,
        remark_suggestions: item.remark_suggestions,
      }),
    );
  };

  const handleOpenCart = () => {
    if (!memberFood.items.length) {
      showAlert({
        title: 'Cart is empty',
        message: 'Add a few dishes first so we can take you to checkout.',
        tone: 'info',
        
      });
      return;
    }

    navigation.navigate('MemberFoodCart',  {paymentMode:paymentMode});
  };

  const renderItemCard = (item: FoodItem) => {
    const quantity = item.quantity || 0;

    return(
    <View key={item.id} style={styles.itemCard}>
      <View style={styles.itemTopRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.itemTitle}>{item.name}</Text>
          {/* <Text style={styles.itemMeta}>
            {item.code || 'Food item'}
            {item.unit ? ` • ${item.unit}` : ''}
          </Text> */}
        <Text style={styles.itemPrice}>₹ {Number(item.rate || 0).toFixed(2)}</Text>
        </View>
        <View style={{alignItems:'flex-end'}}>


{quantity === 0 ? (
  <Pressable
  
    style={styles.modalAddButton}
    onPress={() => handleAddItem(item)}
  >
    <Icon name="plus-circle" size={18} style={{marginRight:10}} color={colors.onPrimary} />
    <Text style={styles.modalAddButtonText}>Add to cart</Text>
  </Pressable>
) : (
  <View style={styles.quantityWrap}>
    <Pressable
      onPress={() =>
        quantity === 1
          ? dispatch(removeFoodItem(item.item_id))
          : dispatch(
              updateFoodQuantity({
                itemId: item.item_id,
                quantity: quantity - 1,
              }),
            )
      }
      style={styles.quantityButton}
    >
      <Icon
        name={quantity === 1 ? 'delete-outline' : 'minus'}
        size={18}
        color={colors.text}
      />
    </Pressable>

    <Text style={styles.quantityText}>
      {quantity}
    </Text>

    <Pressable
    disabled={Number(item.capacity) <= quantity}
      onPress={() =>
        dispatch(
          updateFoodQuantity({
            itemId: item.item_id,
            quantity: quantity + 1,
          }),
        )
      }
      style={[styles.quantityButton,{opacity:Number(item.capacity) <= quantity?0.2:1}]}
    >
      <Icon name="plus" size={18} color={colors.text} />
    </Pressable>
  </View>
)}
</View>
      </View>

    

      {/* <View style={styles.itemInfoRow}>
        <View style={styles.itemInfoChip}>
          <Icon name="receipt" size={14} color={colors.primary} />
          <Text style={styles.itemInfoText}>{item.gst?.label }</Text>
        </View>
        {item.service_charge?.enabled ? (
          <View style={styles.itemInfoChip}>
            <Icon name="silverware-fork-knife" size={14} color={colors.warning} />
            <Text style={styles.itemInfoText}>
              Service {Number(item.service_charge?.rate || 0).toFixed(0)}%
            </Text>
          </View>
        ) : null}
      </View> */}

    </View>
  );
  
}
  return (
    <View style={styles.container}>
      <Header title="Food Menu" />

      <FlatList
        data={categories}
        keyExtractor={item => String(item.id)}
        refreshControl={
          <RefreshControl
            refreshing={menuQuery.isRefetching}
            onRefresh={menuQuery.refetch}
            tintColor={colors.primary}
          />
        }
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <>
            <LinearGradient
              colors={[colors.primary, colors.surfaceAlt]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            style={{ borderRadius: 28,   marginBottom: 16,}}
            >
              <View
                style={styles.heroCard}
                >
              <View style={styles.heroTopRow}>
                <View style={styles.heroBadge}>
                  <Text style={styles.heroBadgeText}>
                    {orderType === 'home_delivery' ? 'Home Delivery' : 'Take Away'}
                  </Text>
                </View>
                <Pressable onPress={() => navigation.navigate('MemberOrders')} style={styles.heroAction}>
                  <Icon name="clipboard-text-clock-outline" size={18} color={colors.text} />
                  <Text style={styles.heroActionText}>My Orders</Text>
                </Pressable>
              </View>

              {/* <Text style={styles.heroTitle}>Order faster from one clean food flow</Text> */}
              <Text style={styles.heroSubtitle}>
                {orderType === 'home_delivery'
                  ? `Showing dishes available for ${deliveryLocation?.name || auth?.user?.location || 'your location'}.`
                  : 'Showing the complete takeaway menu.'}
              </Text>

           <View style={styles.metricsRow}>
               {paymentMode.Subscription &&    <View style={styles.metricCard}>
                  <Text style={styles.metricLabel}>Subscription left</Text>
                  <Text style={styles.metricValue}>
                    ₹ {Number(paymentSummary?.subscription?.available_limit || 0).toFixed(2)}
                  </Text>
                </View>}
                 {paymentMode.Card &&  <View style={styles.metricCard}>
                  <Text style={styles.metricLabel}>Card balance</Text>
                  <Text style={styles.metricValue}>
                    ₹ {Number(paymentSummary?.card?.balance || 0).toFixed(2)}
                  </Text>
                </View>}
              </View>
              </View>
            </LinearGradient>

            <View style={styles.toolbarRow}>
              <Pressable style={styles.searchBar} onPress={() => {setSearchModalVisible(true)
                setTimeout(() => {
      SearchInputRef.current?.focus();
    }, 100);
              }}>
                <Icon name="magnify" size={18} color={colors.textMuted} />
                <Text style={styles.searchPlaceholder}>Search items</Text>
              </Pressable>

              <Pressable style={styles.secondaryAction} onPress={() => navigation.navigate('MemberOrders')}>
                <Icon name="history" size={18} color={colors.text} />
              </Pressable>
            </View>

            {orderType === 'home_delivery' && !deliveryLocation ? (
              <View style={styles.warningCard}>
                <Icon name="map-marker-alert-outline" size={18} color={colors.warning} />
                <Text style={styles.warningText}>
                  We could not match your member profile location to an active delivery area yet.
                </Text>
              </View>
            ) : null}
    {outlets.length > 1 ? (

  <ScrollView
    horizontal
    showsHorizontalScrollIndicator={false}
    contentContainerStyle={
      styles.outletTabsWrap
    }
  >

    {outlets.map(
      (outlet: any) => {

        const active =
          selectedOutlet === outlet.id;

        return (

          <Pressable
            key={outlet.id}
            onPress={() => {

    const existingOutlet =
      memberFood.items[0]?.outlet_id;

    if (
      existingOutlet &&
      existingOutlet !== outlet.id
    ) {

      showAlert({
        title: 'Different outlet',
        message:
          'Please clear cart before ordering from another outlet.',
        tone: 'warning',
              primaryLabel: 'Clear Cart',
        secondaryLabel: 'cancel',
        onPrimaryPress: () =>{ dispatch(clearFoodCart())
          setSelectedOutlet(outlet.id);
        },
      });

      return;
    }

    setSelectedOutlet(outlet.id);

  }}
            
            style={[
              styles.outletTab,

              active && {
                backgroundColor:
                  colors.primary,
                  borderColor: colors.secondary,
              },
            ]}
          >

            <Text
              style={[
                styles.outletTabText,

                active && {
                  color:
                    colors.onPrimary,
                },
              ]}
            >
              {outlet.name}
            </Text>

          </Pressable>
        );
      },
    )}
  </ScrollView>
) : null}
            {menuQuery.isLoading ? (
              <View style={styles.loaderWrap}>
                <ActivityIndicator color={colors.text} size="large" />
                <Text style={styles.loaderText}>Loading menu...</Text>
              </View>
            ) : null}

            {!menuQuery.isLoading && !categories.length ? (
              <View style={styles.emptyState}>
                <Icon name="silverware-clean" size={42} color={colors.textMuted} />
                <Text style={styles.emptyTitle}>No food available</Text>
                <Text style={styles.emptyText}>
                  Available dishes will appear here automatically.
                </Text>
              </View>
            ) : null}
          </>
        }
    
        renderItem={({ item }) => (
          <View style={styles.sectionCard}>
            {(item.groups || []).map((group: any) => (
              <View key={group.id || group.name} style={styles.groupWrap}>
                <Text style={styles.sectionTitle}>{item.name} ({group.name})</Text>
              
                {(group.sub_groups || []).map((subGroup: any) => (
                  <View key={subGroup.id || subGroup.name} style={styles.subGroupWrap}>
                    <Text style={styles.subGroupTitle}>{subGroup.name}</Text>
                    {/* {(subGroup.items || []).map((foodItem: FoodItem) => renderItemCard(foodItem))} */}
                    {(subGroup.items || []).map((foodItem: FoodItem) => {
  const cartItem = memberFood.items.find(
    item => item.item_id === foodItem.id,
  );

  return renderItemCard({
    ...foodItem,
    item_id: foodItem.id,
    quantity: cartItem?.quantity || 0,
  });
})}
                  </View>
                ))}
              </View>
            ))}
          </View>
        )}
      />

      <Pressable onPress={handleOpenCart} style={styles.cartFab}>
        <View style={styles.cartFabBadge}>
          <Text style={styles.cartFabBadgeText}>{cartItemCount}</Text>
        </View>
        <Icon name="cart-outline" size={22} color={colors.onPrimary} />
        <View style={{ flex: 1 }}>
          <Text style={styles.cartFabTitle}>View Cart</Text>
          <Text style={styles.cartFabSubtitle}>₹ {cartTotal.toFixed(2)}</Text>
        </View>
        <Icon name="chevron-right" size={20} color={colors.onPrimary} />
      </Pressable>

      <UniversalModal visible={searchModalVisible} title='Search menu items' setVisible={() => setSearchModalVisible(false)} isFull={true}>

         

          <View style={styles.modalSearchBar}>
            <Icon name="magnify" size={20} color={colors.textMuted} />
            <TextInput
              value={searchValue}
              onChangeText={setSearchValue}
              ref={SearchInputRef}
              placeholder="Search by name, code, or category"
              placeholderTextColor={colors.placeholder}
              style={styles.modalSearchInput}
            />
          </View>

          <ScrollView contentContainerStyle={styles.modalListContent}>
            {filteredSearchItems.map((item: any) => (
              <View key={item.id} style={styles.modalItemCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalItemTitle}>{item.name}</Text>
                  <Text style={styles.modalItemMeta}>
                    {item.categoryName} • {item.groupName} • {item.subGroupName}
                  </Text>
                </View>
                {/* <Pressable
                  style={styles.modalAddButton}
                  onPress={() => {
                    handleAddItem(item);
                    setSearchModalVisible(false);
                  }}
                >
                  <Text style={styles.modalAddButtonText}>Add</Text>
                </Pressable> */}
                {item.quantity === 0 ? (
  <Pressable
    style={[styles.modalAddButton,{backgroundColor:colors.background}]}
    onPress={() => handleAddItem(item)}
    
  >
    <Text style={styles.modalAddButtonText}>+ Add</Text>
  </Pressable>
) : (
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

    <Text style={styles.quantityText}>
      {item.quantity}
    </Text>

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
      style={[styles.quantityButton,{opacity:Number(item.capacity) <= item.quantity?0.2:1}]}
    >
      <Icon name="plus" size={18} color={colors.text} />
    </Pressable>
  </View>
)}
              </View>
            ))}
          </ScrollView>
      </UniversalModal>

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
      padding: 16,
      paddingBottom: 120,
      gap: 16,
    },
    heroCard: {
     
      padding: 20,
   
      overflow: 'hidden',
    },
    heroTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16,
      gap: 12,
    },
    heroBadge: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 999,
      backgroundColor: 'rgba(255,255,255,0.14)',
    },
    heroBadgeText: {
      color: colors.onPrimary,
      fontFamily: FONT_FAMILY.semiBold,
      fontSize: 12,
    },
    heroAction: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 999,
      backgroundColor: colors.surface,
    },
    heroActionText: {
      color: colors.text,
      fontFamily: FONT_FAMILY.semiBold,
      fontSize: 12,
    },
    heroTitle: {
      color: colors.onPrimary,
      fontFamily: FONT_FAMILY.bold,
      fontSize: 24,
      lineHeight: 30,
      marginBottom: 10,
    },
    heroSubtitle: {
      color: colors.onPrimary,
      opacity: 0.86,
      fontFamily: FONT_FAMILY.regular,
      fontSize: 14,
      lineHeight: 21,
    },
    metricsRow: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 18,
    },
    metricCard: {
      flex: 1,
      backgroundColor: 'rgba(255,255,255,0.14)',
      borderRadius: 18,
      padding: 14,
    },
    metricLabel: {
      color: colors.onPrimary,
      opacity: 0.76,
      fontFamily: FONT_FAMILY.medium,
      fontSize: 12,
      marginBottom: 4,
    },
    metricValue: {
      color: colors.onPrimary,
      fontFamily: FONT_FAMILY.bold,
      fontSize: 16,
    },
    toolbarRow: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 16,
    },
    searchBar: {
      flex: 1,
      minHeight: 52,
      borderRadius: 18,
      paddingHorizontal: 16,
      alignItems: 'center',
      flexDirection: 'row',
      gap: 10,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    searchPlaceholder: {
      color: colors.textMuted,
      fontFamily: FONT_FAMILY.medium,
      fontSize: 14,
    },
    secondaryAction: {
      width: 52,
      height: 52,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    warningCard: {
      flexDirection: 'row',
      gap: 10,
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      marginBottom: 16,
    },
    warningText: {
      flex: 1,
      color: colors.text,
      fontFamily: FONT_FAMILY.medium,
      fontSize: 13,
      lineHeight: 19,
    },
    loaderWrap: {
      alignItems: 'center',
      paddingVertical: 32,
      gap: 10,
    },
    loaderText: {
      color: colors.text,
      fontFamily: FONT_FAMILY.medium,
    },
    emptyState: {
      alignItems: 'center',
      paddingVertical: 32,
      paddingHorizontal: 22,
      backgroundColor: colors.surface,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 16,
    },
    emptyTitle: {
      color: colors.text,
      fontFamily: FONT_FAMILY.bold,
      fontSize: 18,
      marginTop: 12,
      marginBottom: 8,
    },
    emptyText: {
      color: colors.textMuted,
      fontFamily: FONT_FAMILY.regular,
      textAlign: 'center',
      lineHeight: 20,
    },
    sectionCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 24,
      padding: 16,
      // marginBottom: 16,
    },
    sectionTitle: {
      color: colors.text,
      fontFamily: FONT_FAMILY.bold,
      fontSize: 18,
    },
    groupWrap: {
    },
    groupTitle: {
      color: colors.primary,
      fontFamily: FONT_FAMILY.semiBold,
      fontSize: 15,
      marginBottom: 8,
    },
    subGroupWrap: {
      // marginBottom: 10,
    },
    subGroupTitle: {
      color: colors.textMuted,
      fontFamily: FONT_FAMILY.semiBold,
      fontSize: 13,
      marginBottom: 8,
    },
    itemCard: {
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 20,
      padding: 14,
      marginBottom: 10,
    },
    itemTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      // marginBottom: 8,
    },
    itemTitle: {
      color: colors.text,
      fontFamily: FONT_FAMILY.semiBold,
      fontSize: 15,
      marginBottom: 4,
    },
    itemMeta: {
      color: colors.textMuted,
      fontFamily: FONT_FAMILY.medium,
      fontSize: 12,
    },
    itemPrice: {
      color: colors.secondary,
      fontFamily: FONT_FAMILY.bold,
      fontSize: 15,
    },
    itemDescription: {
      color: colors.textMuted,
      fontFamily: FONT_FAMILY.normal,
      fontSize: 13,
      lineHeight: 19,
      marginBottom: 10,
    },
    itemInfoRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 12,
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
    addButton: {
      minHeight: 42,
      borderRadius: 14,
      backgroundColor: colors.primary,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    addButtonLabel: {
      color: colors.onPrimary,
      fontFamily: FONT_FAMILY.semiBold,
      fontSize: 13,
    },
    cartFab: {
      position: 'absolute',
      left: 16,
      right: 16,
      bottom: 16,
      minHeight: 68,
      borderRadius: 22,
      backgroundColor: colors.primary,
      paddingHorizontal: 18,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      shadowColor: '#000',
      shadowOpacity: 0.16,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 8 },
      elevation: 8,
    },
    cartFabBadge: {
      width: 26,
      height: 26,
      borderRadius: 13,
      backgroundColor: colors.secondary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cartFabBadgeText: {
      color: colors.primary,
      fontFamily: FONT_FAMILY.bold,
      fontSize: 12,
    },
    cartFabTitle: {
      color: colors.onPrimary,
      fontFamily: FONT_FAMILY.semiBold,
      fontSize: 15,
    },
    cartFabSubtitle: {
      color: colors.onPrimary,
      opacity: 0.82,
      fontFamily: FONT_FAMILY.medium,
      fontSize: 12,
      marginTop: 2,
    },
    modalContainer: {
      flex: 1,
      backgroundColor: colors.background,
      padding: 16,
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    modalTitle: {
      color: colors.text,
      fontFamily: FONT_FAMILY.bold,
      fontSize: 20,
    },
    modalSearchBar: {
      minHeight: 52,
      borderRadius: 18,
      paddingHorizontal: 16,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginBottom: 16,
    },
    modalSearchInput: {
      flex: 1,
      color: colors.text,
      fontFamily: FONT_FAMILY.medium,
    },
    modalListContent: {
      paddingBottom: 24,
      gap: 12,
    },
    modalItemCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: colors.surface,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      marginBottom: 10,
    },
    modalItemTitle: {
      color: colors.text,
      fontFamily: FONT_FAMILY.semiBold,
      fontSize: 14,
      marginBottom: 4,
    },
    modalItemMeta: {
      color: colors.textMuted,
      fontFamily: FONT_FAMILY.medium,
      fontSize: 12,
    },
    modalAddButton: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 14,
      backgroundColor: colors.primary,
      flexDirection:'row'
    },
    modalAddButtonText: {
      color: colors.onPrimary,
      fontFamily: FONT_FAMILY.semiBold,
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
    outletTabsWrap: {
  paddingBottom: 16,
  gap: 10,
},

outletTab: {
  paddingHorizontal: 18,
  paddingVertical: 10,
  borderRadius: 999,
  backgroundColor: colors.surface,
  borderWidth: 1,
  borderColor: colors.border,
},

outletTabText: {
  color: colors.text,
  fontFamily: FONT_FAMILY.semiBold,
  fontSize: 13,
},
  });

export default FoodMenu;
