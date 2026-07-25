import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  useSharedValue,
  withTiming,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { useDispatch, useSelector, shallowEqual } from "react-redux";
import LinearGradient from "react-native-linear-gradient";
import Icon from "react-native-vector-icons/Feather";
import Icons from "react-native-vector-icons/Entypo";
import {
  addRemark,
  addToCart,
  removeFromCart,
  removeRemark,
} from "../../store/actions/cartActions";

import { Toast } from "react-native-toast-notifications";

import { Card } from "react-native-paper";
import { createShimmerPlaceholder } from "react-native-shimmer-placeholder";
import { FONT_FAMILY, SECONDARY_COLOR } from "../../util/colors";
import Header from "../../components/Header";
import TableOptions from "../../components/TableOptions";
import ItemSearchModal from "../../components/ItemSearchModal";
import AnimatedItemCard from "../QRCode/AnimatedItemCard";
import OpenItemModal from "../../components/OpenItemModal";
import { useGroupItems } from "../QRCode/KOTservice";
import ModifierModal from "../../components/ModifierModal";
import { FlatList } from "react-native-gesture-handler";

const ShimmerPlaceholder = createShimmerPlaceholder(LinearGradient);
const TableOrder = ({ navigation, route }) => {
  const dispatch = useDispatch();
  const data = useSelector((state) => state.auth|| []);
  const tableData = route?.params?.tableData;
  const [searchVisible, setSearchVisible] = useState(false);
  const [visible, setVisible] = useState(true);
  const [groups, setGroups] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [selectedSubGroup, setSelectedSubGroup] = useState(null);
  const [openItemModal, setOpenItemModal] = useState(false);
  const [modifierModalItem, setModifierModalItem] = useState(null);
  const [activeBill, setActiveBill] = useState(null);
  // Fetch group items
  const groupItems = useGroupItems(data.token, {
    Code: selectedSubGroup?.Code,
    GroupCode: selectedSubGroup?.GroupCode,
  });
 const cart = useSelector(
    (state) => state.cart?.cart[`${groups?.member?.MemberId}/${tableData?.location_name ||''}/${tableData?.table_name||''}`] || [],
    shallowEqual
  );

// 🧠 Memoized total item count
  const totalItems = useMemo(
    () => cart.items?.reduce((sum, item) => sum + (item.qty || 0), 0) || 0,
    [cart.items]
  );

  // 🪄 Reanimated Cart Slide
  const translateY = useSharedValue(100);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (cart?.items?.length > 0) {
      translateY.value = withTiming(0, { duration: 300 });
      opacity.value = withTiming(1, { duration: 300 });
    } else {
      translateY.value = withTiming(100, { duration: 200 });
      opacity.value = withTiming(0, { duration: 200 });
    }
  }, [cart.items]);
  useEffect(() => {
    if (route?.params?.group) {
      setVisible(false);
      handleGroupData(route?.params.group);
      setActiveBill(route?.params?.bill);
    }
  }, [route?.params?.group]);

  const animatedCartStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  // 🧩 Handlers (memoized)
  const handleGroupData = useCallback((groupsData) => {
    if (groupsData?.group?.length) {
      setGroups(groupsData);
      const firstGroup = groupsData.group[0];
      const firstSubGroup = firstGroup.group_master.sub_groups[0];
      setSelectedGroup(firstGroup);
      setSelectedSubGroup(firstSubGroup);
      setVisible(false);
    }
  }, []);
  const getItemQuantity = useCallback(
    (itemCode) => cart?.items?.find((i) => i.ItemCode === itemCode)?.qty || 0,
    [cart.items]
  );

  const totalAmount = useMemo(() => {
    return (
      cart?.items?.reduce(
        (sum, item) => sum + (item.qty * parseFloat(item.SP) || 0),
        0
      ) || 0
    );
  }, [cart?.items]);

 const handleAdd = useCallback(
    (item) => {
      if (item.OpenItem && !item.qty) {
        setOpenItemModal(item);
        return;
      }
      if (groups.card_balance < totalAmount + parseFloat(item.SP)) {
        Toast.show("Low Balance", { type: "warning" });
        return;
      }

      return dispatch(
        addToCart(
        `${groups?.member?.MemberId}/${tableData.location_name}/${tableData?.table_name}`,
          { ...item, discount: tableData?.KOTDiscount || "0" },
          {
            ...tableData,
            MemberId:groups?.member?.MemberId,
            card_balance: parseFloat(groups.card_balance),
            yearCode: groups?.yearCode,
            activeBill: activeBill,
          }
        )
      );
    },
    [dispatch, groups, tableData, totalAmount]
  );
  const handleRemove = useCallback(
    (item) => dispatch(removeFromCart(`${groups?.member?.MemberId}/${tableData.location_name}/${tableData?.table_name}`, item)),
    [dispatch, groups]
  );
  const SubGroupItem = React.memo(
    ({ item, index, selectedSubGroup, onSelect }) => {
      const isSelected = selectedSubGroup?.Code === item?.Code;
      const scale = useSharedValue(isSelected ? 1.1 : 1);
      const translateX = useSharedValue(20);
      useEffect(() => {
        translateX.value = withTiming(0, { duration: 300, delay: index * 50 });
        scale.value = withSpring(isSelected ? 1.1 : 1);
      }, [isSelected]);

      const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }, { translateX: translateX.value }],
      }));
   return (
        <Animated.View style={animatedStyle}>
          <Pressable
            onPress={() => onSelect(item)}
            style={[
              styles.subGroupButton,
              {
                backgroundColor: isSelected ? "#f0f0f0" : "white",
                borderRadius: isSelected ? 8 : 0,
                flexDirection:'row'
                // borderBottomColor: isSelected ? DARK_BLUE : "transparent",
              },
            ]}
          >
             <MaterialCommunityIcons
    name="food-variant"
    size={20}
    color={isSelected ? "#1E88E5" : "#757575"}
    style={{ marginRight: 6 }}
  />
            <Text
              style={[
                styles.subGroupTitle,
                {
                  fontFamily: isSelected
                    ? FONT_FAMILY.normal
                    : FONT_FAMILY.normal,
                  color: isSelected ? "#1e88e5" : "grey",
                },
              ]}
            >
              {item.SubgroupDisplyas}{" "}
              <Text style={[styles.subGroupCount,{   fontFamily: isSelected
                    ? FONT_FAMILY.normal
                    : FONT_FAMILY.normal,
                  color: isSelected ? "#1e88e5" : "grey",}]}>({item.item_count})</Text>
            </Text>
          </Pressable>
        </Animated.View>
      );
    }
  );

  const GroupItem = React.memo(
    ({ item, index, selectedGroup, setSelectedGroup, setSelectedSubGroup }) => {
      const isSelected =
        item?.group_master?.Code === selectedGroup?.group_master?.Code;
      const scale = useSharedValue(isSelected ? 1.1 : 1);
      const translateY = useSharedValue(20);
      useEffect(() => {
        scale.value = withSpring(isSelected ? 1.1 : 1);
        translateY.value = withTiming(0, { duration: 300, delay: index * 50 });
      }, [isSelected]);

      const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }, { translateY: translateY.value }],
      }));
      return (
        <Animated.View style={animatedStyle}>
          <Pressable
            onPress={() => {
              setSelectedGroup(item);
              setSelectedSubGroup(item.group_master.sub_groups[0]);
            }}
            style={[
              styles.groupButton,
              {
                backgroundColor: isSelected ? SECONDARY_COLOR : "transparent",
                borderTopRightRadius: isSelected ? 10 : 0,
                borderBottomRightRadius: isSelected ? 10 : 0,
              },
            ]}
          >
            <Text
              style={{
                color: isSelected ? "white" : "grey",
                fontFamily: isSelected
                  ? FONT_FAMILY.semiBold
                  : FONT_FAMILY.light,
              }}
            >
              {item.group_master.GroupDisplyas}
            </Text>
          </Pressable>
        </Animated.View>
      );
    }
  );

  const renderGroup = useCallback(
    ({ item, index }) => (
      <GroupItem
        item={item}
        index={index}
        selectedGroup={selectedGroup}
        setSelectedGroup={setSelectedGroup}
        setSelectedSubGroup={setSelectedSubGroup}
      />
    ),
    [selectedGroup]
  );
  const renderSubGroup = useCallback(
    ({ item, index }) => (
      <SubGroupItem
        item={item}
        index={index}
        selectedSubGroup={selectedSubGroup}
        onSelect={setSelectedSubGroup}
      />
    ),
    [selectedSubGroup]
  );
  const getDisplayItem = useCallback(
    (item) => {
      const cartItem = cart?.items?.find((i) => i.ItemCode === item.ItemCode);
      return cartItem ? { ...item, ...cartItem } : item;
    },
    [cart.items]
  );

    // 🔹 Shimmer Placeholder for Member Header
  const renderShimmerMember = () => (
    <Card style={[styles.memberHeader, { height: 80, justifyContent: "center" }]}>
      <ShimmerPlaceholder style={{ width: "70%", height: 20, marginBottom: 8, borderRadius: 6 }} />
      <ShimmerPlaceholder style={{ width: "40%", height: 16, borderRadius: 6 }} />
    </Card>
  );

  // 🔹 Shimmer for Groups (Left side)
  const renderShimmerGroups = () => (
    <View style={{ backgroundColor: "white", maxWidth: 100 }}>
      {[...Array(8)].map((_, i) => (
        <ShimmerPlaceholder
          key={i}
          style={{ width: "100%", height: 50, marginVertical: 6, borderRadius: 6 }}
        />
      ))}
    </View>
  );

  // 🔹 Shimmer for SubGroups (Top horizontal list)
  const renderShimmerSubGroups = () => (
    <View style={{ flexDirection: "row",  }}>
      {[...Array(5)].map((_, i) => (
        <ShimmerPlaceholder
          key={i}
          style={{
            width: 80,
            height: 50,
            borderRadius: 8,
            marginRight: 8,
          }}
        />
      ))}
    </View>
  );

  // 🔹 Shimmer for Items
  const renderShimmerItems = () => (
    <View style={{ padding: 10 }}>
      {[...Array(10)].map((_, i) => (
        <ShimmerPlaceholder
          key={i}
          style={{
            width: "100%",
            height: 60,
            borderRadius: 10,
            marginBottom: 10,
          }}
        />
      ))}
    </View>
  );
  return (
    <View style={styles.container}>
      <Header toHome={false} title="Table Order">
        <View style={styles.headerRight}>
          <Text style={styles.tableText}>
            {tableData?.location_name}({tableData?.table_name})
          </Text>
          <Pressable onPress={() => setSearchVisible(true)}>
            <Icon name="search" size={20} color="white" />
          </Pressable>
        </View>
      </Header>

      {groups?.member ? (
        <Card style={styles.memberHeader}>
          <View style={styles.cardinner}>
            <Text style={styles.memberName}>{groups.member.DisplayName}</Text>
            {activeBill && (
              <Pressable
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: SECONDARY_COLOR,
                  padding: 4,
                  borderRadius: 6,
                }}
                onPress={() =>
                  navigation.navigate("KotReceipt", {
                    token: data.token,
                    table: tableData,
                    bill: activeBill,
                  })
                }
              >
                <Text
                  style={[
                    styles.memberName,
                    { color: "white", marginRight: 5 },
                  ]}
                >
                  Complete Order
                </Text>
                <Icon name="check-circle" size={20} color={"white"} />
              </Pressable>
            )}
          </View>
          <View style={[styles.cardinner, { marginTop: 10 }]}>
            <Text style={{ color: "grey", fontFamily: FONT_FAMILY.normal }}>
              Member ID:{" "}
              <Text
                style={{ color: "#977c7cff", fontFamily: FONT_FAMILY.semiBold }}
              >
                {groups.member.MemberId}
              </Text>
            </Text>
            <Text style={{ color: "grey", fontFamily: FONT_FAMILY.normal,fontSize:13 }}>
              Card balance:{" "}
              <Text
                style={{ color: "green", fontFamily: FONT_FAMILY.semiBold,fontSize:16 }}
              >
                {Number(groups.card_balance).toFixed(2)}
              </Text>
            </Text>
          </View>
        </Card>
      ):renderShimmerMember()}
      <View
        style={{ flex: 1, backgroundColor: "#f0f0f0", flexDirection: "row" }}
      >
        <View>
          <FlatList
            data={groups?.group || []}
            style={{
              backgroundColor: "white",
              borderRightWidth:0.6,
              borderRightColor:'grey',
              paddingRight:5,
              maxWidth: 100,
            }}
            ListEmptyComponent={renderShimmerGroups()}
            renderItem={renderGroup}
            keyExtractor={(item) => item.group_master.Code.toString()}
          />
        </View>
        <View style={{ flex: 1 }}>
          <View>
            <FlatList
              data={selectedGroup?.group_master?.sub_groups || []}
              horizontal
              renderItem={renderSubGroup}
              style={{
                borderBottomWidth: 0.6,
                borderBottomColor: "grey",
                backgroundColor: "white",
                paddingVertical: 4,
              }}
              contentContainerStyle={{
                marginLeft: 5,
                marginVertical: 5,
                paddingHorizontal: 8,
              }}
              ListEmptyComponent={ renderShimmerSubGroups()}
              keyExtractor={(item) => item.Code.toString()}
              showsHorizontalScrollIndicator={false}
            />
          </View>
          <FlatList
            data={groupItems.data || []}
            contentContainerStyle={{ flexGrow: 1, paddingBottom: 100 }}
            renderItem={({ item, index }) => {
              const displayItem = getDisplayItem(item);
              return (
                <AnimatedItemCard
                  item={displayItem} // 👈 use updated one
                  index={index}
                  qty={getItemQuantity(displayItem.ItemCode)}
                  onAdd={() => handleAdd(displayItem)}
                  setModifierModalItem={setModifierModalItem}
                  modifiers={(modifier, itemCode) => {
                    const hasModifier = displayItem.Remarks?.includes(modifier);
                    if (hasModifier) {
                      dispatch(
                        removeRemark(modifier, itemCode, groups.member.MemberId)
                      );
                    } else {
                      // dispatch(
                      //   addRemark(modifier, itemCode, groups.member.MemberId, `${groups?.member?.MemberId}/${tableData.location_name}/${tableData?.table_name}`)
                      // );
                    }
                  }}
                  onRemove={() => handleRemove(displayItem)}

                  
                />
              );
            }}

            ListEmptyComponent={ groupItems.isLoading ? renderShimmerItems():()=>(
              <View style={{flex:1,alignItems:'center',justifyContent:'center'}}>
                <Image
                 source={require('../../../assets/images/norecord.png')}
                style={{height:100,width:100}}
                />
                <Text style={{color:'grey',fontFamily:FONT_FAMILY.normal}}>No Items Found.</Text>
              </View>
            )}
            keyExtractor={(item) => item.ItemCode.toString()}
            initialNumToRender={10}
            maxToRenderPerBatch={15}
            windowSize={10}
            removeClippedSubviews
          />
        </View>
      </View>

      <TableOptions
        visible={visible}

        tableData={tableData}
        onClose={() => navigation.goBack()}
        token={data.token}
        is_member={!!data?.user?.MemberID}
        handleGroupData={handleGroupData}
      />

      <ModifierModal
        visible={modifierModalItem}
        qty={
          modifierModalItem?.ItemCode
            ? getItemQuantity(modifierModalItem?.ItemCode)
            : 0
        }
        onClose={() => setModifierModalItem(null)}
        onAdd={(modifier) => {
          if (
            groups.card_balance <
            totalAmount + parseFloat(modifierModalItem.SP)
          ) {
            Toast.show("Low Balance", { type: "warning" });
            return;
          }
          dispatch(
            addToCart(
              `${groups?.member?.MemberId}/${tableData?.location_name}/${tableData?.table_name}`,
              { ...modifierModalItem, discount: tableData?.KOTDiscount ,  Remarks:modifier|| "0" },
              {
                ...tableData,
                card_balance: parseFloat(groups.card_balance),
                yearCode: groups?.yearCode,
                qty: 1,
                activeBill: activeBill,
              MemberId:groups?.member?.MemberId
              }
            )
          );
          // setTimeout(() => {
          //   dispatch(
          //   addRemark(
          //     modifier,
          //     modifierModalItem?.ItemCode,
          //     groups.member.MemberId,
          //      `${groups?.member?.MemberId}/${tableData.location_name}/${tableData?.table_name}`,
          //   )
          // );
          // }, 100);
          
          setModifierModalItem(null);
        }}
        token={data.token}
      />
      <ItemSearchModal
        member={groups?.member}
        token={data.token}
        visible={searchVisible}
        setModifierModal={setModifierModalItem}
        onClose={() => setSearchVisible(false)}
        tableData={{
          ...tableData,
          card_balance: parseFloat(groups?.card_balance || 0),
          yearCode: groups?.yearCode,
          activeBill: activeBill,
           MemberId:groups?.member?.MemberId,
        }}
      />

      <Animated.View style={[styles.cartContainer, animatedCartStyle]}>
        {cart.items?.length > 0 && (
          <TouchableOpacity
            onPress={() =>
              navigation.navigate("Cart", { activeBill: activeBill })
            }
            activeOpacity={0.8}
            style={styles.cartButton}
          >
            <View style={{ marginLeft: 10 }}>
              <Text style={styles.cartTitle}>View Cart</Text>
              <Text style={styles.cartSubtitle}>
                {totalItems} {totalItems > 1 ? "items" : "item"}
              </Text>
            </View>
            <Icons
              name="chevron-small-right"
              color="white"
              size={25}
              style={{
                backgroundColor: "#114a16ff",
                borderRadius: 20,
                marginLeft: 10,
                alignSelf: "center",
              }}
            />
          </TouchableOpacity>
        )}
      </Animated.View>

      <OpenItemModal
        visible={openItemModal}
        onClose={() => setOpenItemModal(null)}
        token={data.token}
        onAdd={(item) => {
       
          dispatch(
            addToCart(
              `${groups?.member?.MemberId}/${tableData.location_name}/${tableData?.table_name}`,
              { ...item, discount: tableData?.KOTDiscount || "0" },
              {
                ...tableData,
                card_balance: parseFloat(groups.card_balance),
                yearCode: groups?.yearCode,
                qty: 1,
                activeBill: activeBill,
              }
            )
          );
          setOpenItemModal(null);
        }}
      />
    </View>
  );
};

export default TableOrder;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f0f0f0",
  },
  text: {
    fontSize: 24,
    fontWeight: "bold",
  },
  card: {
    margin: 10,
    padding: 10,
    borderRadius: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    color: "black",
    fontFamily: FONT_FAMILY.semiBold,
  },
  price: {
    color: "black",
    fontFamily: FONT_FAMILY.semiBold,
  },
  addButton: {
    borderWidth: 1,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 5,
    borderColor: SECONDARY_COLOR,
    backgroundColor: "white",
  },
  addText: {
    fontFamily: FONT_FAMILY.bold,
    color: SECONDARY_COLOR,
  },
  qtyContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: SECONDARY_COLOR,
    paddingHorizontal: 5,
  },
  qtyButton: {
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  qtyText: {
    fontSize: 16,
    color: SECONDARY_COLOR,
    fontFamily: FONT_FAMILY.bold,
  },
  qtyNumber: {
    color: "black",
    fontFamily: FONT_FAMILY.bold,
    fontSize: 16,
  },
  groupText: {
    // flex:1,
    color: "black",
    fontFamily: FONT_FAMILY.normal,
  },
  groupButton: {
    padding: 10,
    margin: 5,

  },
  subGroupButton: {
    padding: 11,
  },
  subGroupTitle: {
    color: "black",
    fontFamily: FONT_FAMILY.semiBold,
  },
  subGroupCount: {
    // padding:10,
    // backgroundColor:'lightgrey',
    color: "#1e88e5",
  },
  cartContainer: {
    position: "absolute",
    alignSelf: "center",
    bottom: 20,
  },
  memberHeader: {
    margin: 10,
    backgroundColor: "white",
    padding: 10,
    // borderWidth: 1,
    // borderColor: SECONDARY_COLOR,
    borderRadius: 6,
  },
  memberName: { color: "#1e88e5", fontFamily: FONT_FAMILY.bold },
  cartButton: {
    flexDirection: "row",
    backgroundColor: "#025a0fff",
    padding: 10,
    borderRadius: 30,
    elevation: 5,
  },
  cartTitle: {
    fontFamily: FONT_FAMILY.bold,
    color: "white",
    fontSize: 15,
  },
  cartSubtitle: {
    fontFamily: FONT_FAMILY.light,
    color: "white",
    fontSize: 15,
  },
  headerRight: {
    flexDirection: "row",
  },
  tableText: {
    fontFamily: FONT_FAMILY.light,
    color: "white",
    marginRight: 10,
  },
  cardinner: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
});
