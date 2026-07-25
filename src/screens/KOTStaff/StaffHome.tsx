import React, {  useEffect, useState } from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  View,
  Pressable,
  ScrollView,
  Dimensions,
  Image,
} from "react-native";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import Icon from "react-native-vector-icons/AntDesign";
import Ionicons from "react-native-vector-icons/Ionicons";
import { DrawerActions } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import { useDispatch, useSelector } from "react-redux";
import LinearGradient from "react-native-linear-gradient";
import { Card } from "react-native-paper";
import { Dropdown } from "react-native-element-dropdown";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Toast } from "react-native-toast-notifications";
import { createShimmerPlaceholder } from "react-native-shimmer-placeholder";
import {  javascriptGetLocal } from "../../util/api";
import { loginSuccess } from "../../store/slices/authSlice";
import { DARK_BLUE, FONT_FAMILY, RED_COLOR,  } from "../../util/colors";
import moment from "moment";
import InAppUpdate from "../../components/InAppUpdate";
import { clearAllCart } from "../../store/actions/cartActions";
import { DOMAIN } from "../../util/constant";

const { width } = Dimensions.get("window");
const ShimmerPlaceholder = createShimmerPlaceholder(LinearGradient);

const StaffHome = ({ navigation }) => {
  const User = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const cart = useSelector((state) => state.cart?.cart||{});
  const [Orders, setOrders] = useState([]);
  const [selectedValue, setSelectedValue] = useState(
    parseFloat(User?.user?.LocationCode) || null
  );
  // ✅ Fetch Menus
  const HomeMenues = useQuery({
    queryKey: ["HomeMenues", User?.token, selectedValue],
    
    queryFn: async () => {
      const apiObject = {
        path: `staff/home/menu/staff?locationCode=${selectedValue}`,
        Token: User?.token,
      };
      const response = await javascriptGetLocal(apiObject);
      console.log( response, '---------------------- response ---------------------');
      if (response.status === true) {
        const data = await AsyncStorage.getItem("user");
        if (data) {
          const userData = JSON.parse(data);
          userData.user.LocationCode = selectedValue;
          AsyncStorage.setItem("user", JSON.stringify(userData));
          dispatch(loginSuccess(userData));
          setSelectedValue(selectedValue);
          HomeDetails.refetch();
        }
      }
      return response;
    },
  });
  console.log( User, '---------------------- HomeMenues.data ---------------------');
  // ✅ Fetch Dashboard Details
  const HomeDetails = useQuery({
    queryKey: ["HomeDetails", User?.token, selectedValue],
   
    queryFn: async () => {
      const apiObject = {
        path: `staff/home/details/locationCode=${selectedValue}`,
        Token: User?.token,
      };
      const response = await javascriptGetLocal(apiObject);
    
      return response;
    },
  });
useEffect(() => {
  if(HomeDetails.data?.data?.Orders){
    setOrders(HomeDetails.data?.data?.Orders);

  }
}, [HomeDetails.data?.data]);
  const summary = HomeDetails.data?.data?.Summary;
  const handleViewBill = async (order) => {
    console.log( order, '---------------------- order ---------------------');
    if (!order.BillNo || !order.YearCode || !selectedValue) {
      return Toast.show("Unable to download bill.");
    } else {
      navigation.navigate("KotReceipt", {
        token: User?.token,
        table: { LocationCode: selectedValue },
        bill: order,
        isMember: false,
        single_kot_service:true
      });
    }
  };

  const renderItem = ({ item }) =>{
    console.log( `${DOMAIN.LOCAL}public/icon/${item?.icon}`, '---------------------- `${DOMAIN.LOCAL}public/icon/${item?.icon}` ---------------------');
    return (

    <Pressable
      onPress={() => {
        item?.navigate
          ? navigation.navigate(item.navigate, item?.data)
          : Toast.show("Feature coming soon...", { type: "warning" });
      }}
      style={{ flex: 1,alignItems:'center',marginTop:10}}
    >
      <View
        style={{
          flex: 1,
          // borderColor: "lightgrey",
          // elevation: 5,
          // shadowColor: "grey",
          // shadowOpacity: 0.8,
          // shadowRadius: 2,
          // borderRadius: 10,
        }}
      >
        <View style={{
          // flex: 1,
          justifyContent: "center",
          alignItems: "center",
          // marginTop:10,
          backgroundColor:'white',
          padding:10,
          borderRadius:10,
          elevation:3
        }}>
 <Image
          source={{
            uri: `${DOMAIN.LOCAL}public/icon/${item?.icon}`,
          }}
          style={{
            // position: "absolute",
            height: 60,
            width: 60,
          // backgroundColor: "white",
          padding: 10,
          borderRadius:10

            // alignSelf: "flex-end",
          }}
        />
        </View>
       
        <View style={{ marginVertical: 10 }}>
          <Text
            style={{
              fontFamily: FONT_FAMILY.bold,
              color: "black",
              fontSize: 10,
              textAlign:'center'
            }}
          >
            {item.name}
          </Text>
        </View>
        
      </View>
    </Pressable>
  );}

  // ✅ Loading placeholders
  const renderShimmerMenu = () => (
    <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-around" }}>
      {[...Array(2)].map((_, i) => (
        <ShimmerPlaceholder
          key={i}
          
          style={{
            // width: width / 10.2,
            flex:0.5,
            height: 80,
            borderRadius: 10,
            margin: 10,
          }}
        />
      ))}
    </View>
  );

  const renderShimmerSummary = () => (
    <View style={styles.summaryGrid}>
      {[...Array(4)].map((_, i) => (
        <ShimmerPlaceholder
          key={i}
          style={{
            width: width / 2 - 20,
            height: 90,
            borderRadius: 12,
            marginBottom: 10,
          }}
        />
      ))}
    </View>
  );

  const renderShimmerOrders = () => (
    <View style={{ paddingHorizontal: 10 }}>
      {[...Array(3)].map((_, i) => (
        <ShimmerPlaceholder
          key={i}
          style={{
            width: "100%",
            height: 80,
            borderRadius: 12,
            marginVertical: 6,
          }}
        />
      ))}
    </View>
  );
  return (
    <View style={{ flex: 1, backgroundColor: "#F7F8F6" }}>
      {/* 🔹 Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Icon
            name="menu-fold"
            size={20}
            onPress={() => navigation.dispatch(DrawerActions.openDrawer)}
            color={"white"}
          />
          <Text style={styles.headerText}>
            {User?.user?.UserName || "User"}
          </Text>
        </View>
        <Dropdown
          data={HomeMenues.data?.locations || []}
          style={styles.dropdown}
          placeholderStyle={styles.placeholderStyle}
          selectedTextStyle={styles.selectedText}
          itemTextStyle={{
            color: "black",
            fontFamily: FONT_FAMILY.normal,
          }}
          labelField="LocationName"
          valueField="code"
          placeholder="Select Location"
          value={selectedValue}
          onChange={(item) => {
            if(Object?.keys(cart).length > 0){
             dispatch(clearAllCart());
            }
            setSelectedValue(item.code)}
          }
        />
        <Pressable onPress={() => navigation.navigate("Cart")}>
          {Object?.keys(cart)?.length > 0 && <View style={styles.badgeDot} />}
          <Ionicons name="cart" size={25} color={"white"} />
        </Pressable>
      </View>

      {/* 🔹 Body */}
      <ScrollView style={{ flex: 1 }}>
        {/* 🔸 Summary Section */}
        <View style={styles.summaryContainer}>
          <Text style={styles.sectionTitle}>Dashboard Summary</Text>
          {HomeDetails.isLoading ? (
            renderShimmerSummary()
          ) : summary ? (
            <View style={styles.summaryGrid}>
              {[
                { title: "Total Orders", value: summary.TotalOrders },
                { title: "Completed", value: summary.CompletedOrders },
                { title: "Pending", value: summary.PendingOrders },
                {
                  title: "Total Sales",
                  value: `₹${parseFloat(summary.TotalSales).toFixed(2)}`,
                },
              ].map((item, index) => (
                <View
                  style={styles.summaryCard}
                >
                  <Text style={styles.summaryValue}>{item.value}</Text>
                  <Text style={styles.summaryLabel}>{item.title}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>

        {/* 🔸 Menus */}
        {HomeMenues.isLoading
          ? renderShimmerMenu()
          : (
            <FlatList
              data={HomeMenues.data?.data || []}
              numColumns={2}
              renderItem={renderItem}
              ListEmptyComponent={() => (
                <Text style={styles.noDataText}>No menu found.</Text>
              )}
            />
          )}

        {/* 🔸 Recent Orders */}
        <View style={{ marginTop: 15, paddingHorizontal: 10 }}>
          <Text style={styles.sectionTitle}>Recent Orders</Text>
          {HomeDetails.isLoading ? (
            renderShimmerOrders()
          ) : (
            <FlatList
              data={Orders || []}
              keyExtractor={(item, index) => index.toString()}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <Card onPress={() => handleViewBill(item)} style={styles.orderCard}>
                     <View style={styles.infoRow}>
                                <MaterialIcons
                                  name="credit-card"
                                  size={20}
                                  color="#333"
                                  style={styles.icon}
                                />
                                <Text style={styles.infoLabel}>BillNo</Text>
                                <Text style={styles.kotTitle}>{item.BillNo}</Text>
                              </View>
                      <View style={styles.infoRow}>
                                <MaterialIcons
                                  name="access-time-filled"
                                  size={20}
                                  color="#333"
                                  style={styles.icon}
                                />
                                <Text style={styles.infoLabel}>Created At</Text>
                                <Text style={styles.infoValue}>{moment(item.CreationDate).format("DD-MMM-YY hh:mm A") || "N/A"}</Text>
                              </View>
                  <View style={styles.orderRow}>
                    <View>
                      <Text style={styles.orderTitle}>
                        Table <Text style={{ color: "#3C5999" }}>{item.TableNo}</Text>
                      </Text>
                      <Text style={styles.orderSubtitle}>
                        {item.MemberName || "Guest"}
                      </Text>
                      {/* <Text style={styles.orderSubtitle}>
                        {item.BillNo || "0000"}
                      </Text> */}
                    </View>
                    <View style={{ alignItems: "flex-end" }}>
                      <Text style={styles.orderAmount}>
                        ₹{Math.round(item.Amount).toFixed(2)}
                      </Text>
                     {item.can_modify ? <Pressable
                        disabled={item.BillStatus == "1"}
                        style={{
                          padding: 6,
                          backgroundColor:'#ffe5e5',
                          borderRadius: 5,
                        }}
                        onPress={() => handleViewBill(item)}
                      >
                        <Text style={[styles.statusBadge,{color:RED_COLOR,fontFamily:FONT_FAMILY.bold}]}>
                          Modify KOT
                        </Text>
                      </Pressable>: <Pressable
                        disabled={item.BillStatus == "1"}
                        style={{
                          padding: item.BillStatus == "1" ? 4 : 6,
                          backgroundColor: "#e5fbe6",
                          borderRadius: 5,
                        }}
                        onPress={() => handleViewBill(item)}
                      >
                        <Text style={styles.statusBadge}>
                          {item.BillStatus == "1" ? "Completed" : "View Order"}
                        </Text>
                      </Pressable>}
                    </View>
                  </View>
                </Card>
              )}
              ListEmptyComponent={
                <Text style={styles.noDataText}>No orders found.</Text>
              }
              contentContainerStyle={{ paddingBottom: 50 }}
            />
          )}
        </View>
      </ScrollView>
       <InAppUpdate/>
    </View>
  );
};

export default StaffHome;


const styles = StyleSheet.create({
  header: {
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: DARK_BLUE,
  },
  headerLeft: { flexDirection: "row", alignItems: "center" },
  headerText: {
    color: "#F7F8F6",
    fontSize: 20,
    marginLeft: 10,
    fontFamily: FONT_FAMILY.semiBold,
  },
  dropdown: {
    borderWidth: 0.8,
    padding: 6,
    borderRadius: 4,
    borderColor: "white",
    minWidth: 150,
  },
  placeholderStyle: { color: "white", fontFamily: FONT_FAMILY.normal },
  selectedText: { color: "white", fontFamily: FONT_FAMILY.normal },
  badgeDot: {
    backgroundColor: "red",
    height: 10,
    width: 10,
    position: "absolute",
    borderRadius: 10,
    right: 0,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: FONT_FAMILY.bold,
    color: "#333",
    marginBottom: 8,
  },
  summaryContainer: { marginTop: 10, paddingHorizontal: 10 },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  summaryCard: {
    backgroundColor:'#3C5999',
    width: width / 2 - 20,
    borderRadius: 12,
    paddingVertical: 20,
    marginBottom: 10,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
  },
  summaryValue: {
    fontSize: 22,
    fontFamily: FONT_FAMILY.bold,
    color: "white",
  },
  summaryLabel: {
    fontSize: 14,
    color: "white",
    marginTop: 5,
    fontFamily: FONT_FAMILY.normal,
  },
  orderCard: {
    padding: 12,
    borderRadius: 12,
    marginVertical: 6,
    elevation: 3,
    backgroundColor: "white",
  },
  orderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  orderTitle: {
    fontSize: 16,
    fontFamily: FONT_FAMILY.semiBold,
    color: DARK_BLUE,
  },
  orderSubtitle: {
    fontSize: 14,
    color: "black",
    fontFamily: FONT_FAMILY.normal,
  },
  orderAmount: {
    fontSize: 16,
    fontFamily: FONT_FAMILY.bold,
    color: DARK_BLUE,
  },
  statusBadge: {
    color: "green",
    fontFamily: FONT_FAMILY.normal,
  },
  noDataText: {
    textAlign: "center",
    color: "#999",
    fontFamily: FONT_FAMILY.normal,
    marginTop: 20,
  },
    infoLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: "#444",
  },
  infoValue: {
    fontSize: 14,
    color: "#000",
    fontWeight: "500",
  },
    infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 4,
  },
  icon: {
    marginRight: 8,
  },
    kotTitle: {
    fontSize: 15,
    fontFamily: FONT_FAMILY.bold,
    color: "#1e88e5",
    marginBottom: 6,
  },
});
