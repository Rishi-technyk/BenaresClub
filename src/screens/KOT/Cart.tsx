import React, { useState, useMemo, useCallback, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  TextInput,
  ScrollView,
  LayoutAnimation,
  Platform,
  UIManager,
  Alert,
  BackHandler,
} from "react-native";
import { useDispatch, useSelector } from "react-redux";
import Icons from "react-native-vector-icons/Entypo";
import Ionicons from "react-native-vector-icons/Ionicons";
import RNPrint from "react-native-print";
import ItemSearchModal from '../../components/ItemSearchModal'
import MemberTab from '../../components/MemberTab'
import {
  addToCart,
  clearAllCart,
  clearMemberCart,
  removeFromCart,
  updateCartItem,
} from "../../store/actions/cartActions";
import { Toast } from "react-native-toast-notifications";
import { Dropdown } from "react-native-element-dropdown";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Animated, { FadeInDown, FadeOutUp } from "react-native-reanimated";
import AnimatedPressable from "../../components/AnimatedPressable";
import moment from "moment";
import AsyncStorage from "@react-native-async-storage/async-storage";

import Header from "../../components/Header";
import { DARK_BLUE, FONT_FAMILY, RED_COLOR } from "../../util/colors";
import UniversalModal from "../../components/UniversalModal";
import {  javascriptGetLocal, javascriptPostLocal } from "../../util/api";
import { loginSuccess } from "../../store/slices/authSlice";
import { ENDPOINT } from "../../util/constant";

const MemberSelector : React.FC = ({ navigation, route }) => {
  const cart = useSelector((state) => state?.cart?.cart);
  const dispatch = useDispatch();
  const data = useSelector((state) => state.auth || {});

  const [deliverySlots, setDeliverySlots] = useState([]);
  const memberIds = Object.keys(cart);
  const [selectedMember, setSelectedMember] = useState(memberIds[0] || null);
  const [address, setAddress] = useState(data?.user?.Address);
  const [showTotalModal, setShowTotalModal] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [assignedTo, setAssignedTo] = useState(null);
  const [selectedDeliveryTime, setSelectedDeliveryTime] = useState(null);
  const [errors, setErrors] = useState({});
  const [activeBill, setActiveBill] = useState(null);
  const [noOfPax, setNoOfPax] = useState("1");
  const queryClient = useQueryClient();

  const generateDeliveryTimes = useCallback(() => {
    const now = moment();
    const startTime = now.add(30, "minutes"); // current time + 30 min

    // round to next 30-minute slot
    const minutes = startTime.minutes();
    const roundedMinutes = minutes <= 30 ? 30 : 60;

    startTime.minutes(roundedMinutes).seconds(0);

    const endOfDay = moment().endOf("day");
    const slots = [];

    while (startTime.isBefore(endOfDay)) {
      slots.push({
        label: startTime.format("hh:mm A"),
        value: startTime.format("HH:mm"),
      });
      startTime.add(30, "minutes");
    }

    return slots;
  }, []);
  const fetchMemberCarBalance=async(memId:string)=>{
    // const response=await javascriptPostLocal({
    //   path:'staff/card-balance',
    //   Token:data.token,
    //   body:{
    //     memeber_id:memId,
    //   }
    // })
    // if(response.status===true){

    // }
  }
  useEffect(() => {
    let bill = cart[selectedMember]?.tableData?.activeBill;

    setActiveBill(bill);
    setAssignedTo(Number(bill?.WaiterCode || null) );
    if(cart[selectedMember]?.tableData?.MemberId){
      fetchMemberCarBalance(cart[selectedMember]?.tableData?.MemberId)
    }
  }, [cart[selectedMember]]);
  
  const CartData = useQuery({
    queryKey: ["CartData", data.token],
    queryFn: async () => {
      // ${data.data[0].LocationCode}
      const response=await javascriptGetLocal({
        path: `${ENDPOINT.get_cart_data}userCode=2`,
        Token: data.token,
        body: {},
      });
      
      // if(response?.staff_list){
      //   setAssignedTo(response?.staff_list[0])
      // }
      return response
    },
    enabled: !!data?.token, // only runs if token exists
  });

//   useEffect(()=>{
    
// if(CartData.data.staff_list[0].UserCode){
//   setAssignedTo(CartData.data.staff_list?.length[0].UserCode)
// }
//   },[CartData.data])
console.log( cart, '---------------------- cart ---------------------');
  const HandlePlaceOrder = async () => {
    if(data?.user?.MemberID){
      
      if (cart[selectedMember]?.tableData?.orderType.id === 102) {
        if (!selectedDeliveryTime) {
          setErrors((prev) => ({ ...prev, deliveryTime: "Please select delivery time" }));
          return;
        }
      }

      if (cart[selectedMember]?.tableData?.orderType.id === 102 && (!address || address.trim().length === 0)) {
        setErrors((prev) => ({ ...prev, address: "Please enter delivery address" }));
        return;
      }
      
    }else{
       if (
      (noOfPax === "" || isNaN(Number(noOfPax)) || parseInt(noOfPax) <= 0)
      &&  !CartData?.data?.single_kot_service
       && !activeBill
    ) {
      setErrors((prev) => ({
        ...prev,
        noOfPax: "Please enter valid number of pax",
      }));
      return;
    }
 
    }
      setLoading(true);
  const apiObj = {
      path: data?.user.MemberID ?  `${ENDPOINT.place_order}` 
      : activeBill ? `${ENDPOINT.waiter_place_order}/${activeBill.BillNo}`
        : ENDPOINT.waiter_place_order,
      Token: data.token,
      body: data?.user.MemberID ? {
        MemberID:  data?.user.MemberID,
        TableCode: '0',
        WaiterCode: '0',
        PAX: noOfPax,
        BillType: cart[selectedMember]?.tableData?.orderType.id ,
        Address: cart[selectedMember]?.tableData?.orderType.id === 102? address : "",
        DeliveryTime: cart[selectedMember]?.tableData?.orderType.id === 102 ? selectedDeliveryTime : "",
        YearCode: cart[selectedMember]?.tableData.yearCode,
        LocationCode: cart[selectedMember]?.tableData?.LocationCode.toString(),
        ModeOfPayment: "SMARTCARD",
        ValidationMode: "SMARTCARD",
        Total: parseFloat(totalAmount),
        items: selectedItems.map((i :any) => ({
          Qty: i.qty,
          Itemcode: i.ItemCode,
          ItemName: i.ItemName,
          ValuePercentage: Number(i.ValuePercentage),
          SP: parseFloat(i.SP),
          Note: i.Remarks || "",
          DiscountPercentage: i.discount || 0,
          openItem: i.OpenItem || 0,
          TaxType: i.TaxType || "",
          ServiceCharge: Number(i.ServiceCharge) || 0,
          SaleUnit: Number(i.SaleUnit) || "",
        })),
      }:{
        MemberID: cart[selectedMember].tableData?.MemberId,
        TableCode: cart[selectedMember]?.tableData.TableCode,
        WaiterCode: assignedTo ||1,
        UserCode: data.user?.UserCode.toString(),
        PAX: noOfPax,
        
        YearCode: cart[selectedMember]?.tableData.yearCode,
        LocationCode: cart[selectedMember]?.tableData.LocationCode,
        ModeOfPayment: "SMARTCARD",
        ValidationMode: "SMARTCARD",
        Total: parseFloat(totalAmount),
        items: selectedItems.map((i) => ({
          Qty: i.qty,
          Itemcode: i.ItemCode,
          ItemName: i.ItemName,
          ValuePercentage: Number(i.ValuePercentage),
          SP: parseFloat(i.SP),
          Note: i.Remarks || "",
          DiscountPercentage: i.discount || 0,
          openItem: i.OpenItem || 0,
          TaxType: i.TaxType || "",
          ServiceCharge: Number(i.ServiceCharge) || 0,
          SaleUnit: Number(i.SaleUnit) || "",

        })),
      },
    };

    try {
      console.log( apiObj, '---------------------- apiObj ---------------------');
    
      const response = await javascriptPostLocal(apiObj);
      
      setLoading(false);
      if (response.status === true) {
         const Udata=await AsyncStorage.getItem('user');
    if (Udata && address && cart[selectedMember]?.tableData?.orderType.id === 102){
          const userData = JSON.parse(Udata);
         userData.user.Address = address;
          AsyncStorage.setItem('user', JSON.stringify(userData));
           dispatch(loginSuccess(userData))
           
        }
         if (CartData?.data?.single_kot_service){
          
             navigation.navigate("KotReceipt", {
        token: data?.token,
        table: { LocationCode: cart[selectedMember]?.tableData.LocationCode, },
        bill: response?.receipt,
        isMember:  !!data?.user.MemberID ,
        single_kot_service:true
      });
        
         }
        dispatch(clearMemberCart(selectedMember));
        setSelectedMember(null);
        setShowTotalModal(false);
   navigation.navigate("KotReceipt", {
        token: data?.token,
        table: { LocationCode: cart[selectedMember]?.tableData.LocationCode, },
        bill: response?.receipt,
        isMember:  !!data?.user.MemberID ,
        single_kot_service:true
      });
       data?.user.MemberID ? 
       queryClient.invalidateQueries(["foodorder"]):
       queryClient.invalidateQueries(["HomeDetails"]);
        if (response.recipt_service) {
          const receipt = response.receipt;
          const html = `
          <html>
          <body>
            <h2 style="text-align:center;">Order Receipt</h2>
            <p><strong>Bill No:</strong> ${receipt.BillNo}</p>
            <p><strong>Order No:</strong> ${receipt.KOTNo}</p>
            <p><strong>Member:</strong> ${receipt.MemberName}</p>
            <p><strong>Table:</strong> ${receipt.TableCode}</p>
            <p><strong>Waiter:</strong> ${receipt.WaiterCode}</p>
            <p><strong>Date:</strong> ${receipt.DateTime}</p>
            <hr />
            <table style="width:100%; border-collapse:collapse;">
              <tr>
                <th style="text-align:left;">Item</th>
                <th>Qty</th>
                <th>Rate</th>
                <th>Amount</th>
              </tr>
              ${receipt.Items.map(
                (item) => `
                <tr>
                  <td>${item.ItemName}</td>
                  <td>${item.Qty}</td>
                  <td>${item.Rate}</td>
                  <td>${item.Amount}</td>
                </tr>
              `
              ).join("")}
            </table>
            <hr />
            <p><strong>Total:</strong> ₹${receipt.TotalAmount}</p>
            <p><strong>Opening Balance:</strong> ₹${receipt.OpeningBalance}</p>
            <p><strong>Closing Balance:</strong> ₹${receipt.ClosingBalance}</p>
          </body>
          </html>
        `;

          // Directly print
          await RNPrint.print({ html });
        }
        
        if(address){
           const data=await AsyncStorage.getItem('user');
       
        }
        Toast.show(response.message || "Order placed successfully", {
          type: "success",
        });

        // Generate HTML for receipt
        navigation.navigate( data?.user.MemberID ?'Home':"StaffHome");
      } else {
        setShowTotalModal(false);
        Toast.show(response.message || "Unable to place order.", {
          type: "danger",
        });
      }
    } catch (error) {}
  };
  // memoized items
  const selectedItems = useMemo(
    () => cart[selectedMember]?.items || [],
    [cart, selectedMember]
  );

  const totalAmount = useMemo(() => {
    const total = selectedItems.reduce((sum :number, item :any) => {
      const qty = parseFloat(item.qty) || 0;
      const sp = parseFloat(item.SP) || 0;
      const discountPer = parseFloat(item.discount || 0);
      const taxPer = parseFloat(item.ValuePercentage || 0);
      const servicePer = parseFloat(item.ServiceCharge || 0);

      const baseAmount = qty * sp;
      const discountAmt = baseAmount * (discountPer / 100);
      const taxableAmount = baseAmount - discountAmt;
      const taxAmt = taxableAmount * (taxPer / 100);
      const serviceChargeAmt = baseAmount * (servicePer / 100);

      const finalAmt = baseAmount - discountAmt + taxAmt + serviceChargeAmt;
      return sum + finalAmt;
    }, 0);

    return total.toFixed(2);
  }, [selectedItems]);

  const totalItems = useMemo(() => {
    return selectedItems.reduce((sum, item) => sum + (item.qty || 0), 0);
  }, [selectedItems]);

  const getItemQuantity = useCallback(
    (itemCode) => {
      const found = selectedItems.find((i) => i.ItemCode === itemCode);
      return found ? found.qty : 0;
    },
    [selectedItems]
  );
    useEffect(() => {
      const backAction = () => {
        // Navigate to Home screen
          navigation.reset({
                    routes: [{ name: "Home" }],
                  });
        return true; // Prevent default behavior (exit app)
      };
  
      const backHandler = BackHandler.addEventListener(
        'hardwareBackPress',
        backAction
      );
  
      // Cleanup the event listener on unmount
      return () => backHandler.remove();
    }, [navigation]);
  // Calculate totals for summary modal
  const summaryBreakdown = useMemo(() => {
    return selectedItems.reduce(
      (acc, item) => {
        const qty = parseFloat(item.qty) || 0;
        const sp = parseFloat(item.SP) || 0;
        const discountPer = parseFloat(item.discount || 0);
        const taxPer = parseFloat(item.ValuePercentage || 0);
        const servicePer = parseFloat(item.ServiceCharge || 0);

        const baseAmount = qty * sp;
        const discountAmt = baseAmount * (discountPer / 100);
        const taxableAmount = baseAmount - discountAmt;
        const taxAmt = taxableAmount * (taxPer / 100);
        const serviceChargeAmt = baseAmount * (servicePer / 100);

        acc.subtotal += baseAmount;
        acc.discount += discountAmt;
        acc.tax += taxAmt;
        acc.serviceCharge += serviceChargeAmt;
        return acc;
      },
      { subtotal: 0, discount: 0, tax: 0, serviceCharge: 0 }
    );
  }, [selectedItems]);

  const roundOff = useMemo(() => {
    const diff = Math.round(totalAmount) - parseFloat(totalAmount);
   return Math.abs(diff).toFixed(2);
  }, [totalAmount]);

  const renderCartItem = useCallback(
    ({ item, index }) => {
      const qty = getItemQuantity(item.ItemCode);
      return (
        <Animated.View
          entering={FadeInDown.delay(index * 50)
            .duration(400)
            .springify()}
          exiting={FadeOutUp.duration(200)}
        >
          <View
            // start={{ x: 0, y: 0 }}
            // end={{ x: 1, y: 0 }}
            // colors={["#e3f2fd", "#ffffff", "#e8f5e9"]}
            style={styles.itemCard}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                flex: 1,
              }}
            >
              <View style={{}}>
                <Text
                  style={[styles.itemName, { fontFamily: FONT_FAMILY.bold }]}
                >
                  {item.ItemName}
                </Text>
                <Text style={[styles.itemName, { color: "#63748A",fontSize:13 ,fontFamily:FONT_FAMILY.semiBold}]}>
                  Amount:<Text style={{ color: "#63748A" }}>₹{item.SP}</Text>
                </Text>

                <Text style={[styles.itemName, { color: "#96A2B8" ,fontSize:13 }]}>
                  {item.TaxType}({parseFloat(item.ValuePercentage)}%):
                  <Text style={{ color: "#96A2B8" }}>
                    ₹
                    {(
                      (item.qty * item.SP * parseFloat(item.ValuePercentage)) /
                      100
                    ).toFixed(2)}
                  </Text>
                </Text>
                {Number(item.ServiceCharge) > 0 && (
                  <Text style={[styles.itemName, { color: "grey" }]}>
                    Service Charge({parseFloat(item.ServiceCharge)}%):
                    <Text style={{ color: "black" }}>
                      ₹
                      {(item.qty * item.SP * parseFloat(item.ServiceCharge)) /
                        100}
                    </Text>
                  </Text>
                )}
                
              </View>

              <View style={{ alignItems: "center" }}>
                {
                  <View style={styles.qtyContainer}>
                    <AnimatedPressable
                      onPress={() => {
                        if (
                          qty === selectedItems.length &&
                          selectedItems.length === 1
                        ) {
                          dispatch(clearMemberCart(selectedMember));
                          return;
                        }
                        dispatch(
                          removeFromCart(
                            String(selectedMember),
                            item,
                            cart[selectedMember]?.tableData
                          )
                        );
                      }}
                      
                    >
                      <Text style={styles.qtyText}>−</Text>
                    </AnimatedPressable>

                    <Text style={styles.qtyNumber}>{qty}</Text>

                    <AnimatedPressable
                      onPress={() => {
                        if (
                          cart[selectedMember]?.tableData?.card_balance <
                          parseFloat(totalAmount) + parseFloat(item.SP)
                        ) {
                          Toast.hideAll();
                          Toast.show("Low Balance", { type: "warning" });
                          return;
                        }
                        dispatch(
                          addToCart(
                            String(selectedMember),
                            item,
                            cart[selectedMember]?.tableData
                          )
                        );
                      }}
                    >
                      <Text style={styles.qtyText}>+</Text>
                    </AnimatedPressable>
                  </View>
                }
              </View>
            </View>
                {!data?.user?.MemberID && CartData?.data?.staff_discount && (
                  <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}>
                     <Text style={[styles.itemName, { color: "#96A2B8" ,fontSize:13 }]}>Discount</Text>
                  <TextInput
                    maxLength={2}
                    value={item.discount ? String(item.discount) : ""}
                    onChangeText={(text) => {
                      const val = parseFloat(text) || 0;
                      dispatch(
                        updateCartItem(String(selectedMember), item.ItemCode, {
                          discount: val,
                        })
                      );
                    }}
                    placeholderTextColor={"grey"}
                    style={{
                      textAlign: "center",
                      width: 68,
                      borderWidth: 1,
                      color: "black",
                      borderColor: "green",
                      borderRadius: 5,
                      paddingHorizontal: 10,
                      paddingVertical: 1,
                    }}
                    
                    placeholder="Discount %"
                    keyboardType="numeric"
                  />
                    </View>
                )}
            <View style={{ flexDirection: "row", alignItems: "center" }}></View>

            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
              }}
            >
              {item.Remarks && item.Remarks.length > 0 && (
                <View
                  style={{
                    flex: 1,
                    flexDirection: "row",
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={[
                      styles.itemName,
                      { color: "grey", fontFamily: FONT_FAMILY.Muli },
                    ]}
                  >
                    Remarks:
                  </Text>
                  <Text
                    style={{ color: "black", fontFamily: FONT_FAMILY.Muli }}
                  >
                    {item.Remarks}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </Animated.View>
      );
    },
    [dispatch , getItemQuantity, selectedMember, cart]
  );
  if (
    Platform.OS === "android" &&
    UIManager.setLayoutAnimationEnabledExperimental
  ) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
  useEffect(() => {
    LayoutAnimation.configureNext(
      LayoutAnimation.create(
        250,
        LayoutAnimation.Types.easeInEaseOut,
        LayoutAnimation.Properties.opacity
      )
    );
  }, [selectedMember]);

  return (
    <View style={styles.container}>
      <Header toHome={false} title={"Cart"}>
        {selectedMember && (
          <Pressable
            onPress={() => {
              dispatch(clearAllCart()), setSelectedMember(null);
            }}
            style={styles.clearCart}
          >
            <Text style={{ color: RED_COLOR, fontFamily: FONT_FAMILY.normal }}>
              Clear Cart
            </Text>
              <Ionicons
              name="trash"
              size={20}
              color={RED_COLOR}
              style={{ marginLeft: 5 }}
            />
          </Pressable>
        )}
      </Header>
      {memberIds.length > 1 && (
        <View style={styles.memberTabs}>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={memberIds || []}
            style={{}}
            keyExtractor={(id) => id}
            renderItem={({ item: id }) => (
              <MemberTab
                id={id}
                selectedMember={selectedMember}
                setSelectedMember={setSelectedMember}
              />
            
            )}
          />
        </View>
      )}

      {cart[selectedMember]?.tableData && (
        <View
          style={styles.headercard}
        >
          <View
            style={styles.heading}
          >
            <View
              style={styles.tableInfo}
            >
              <Text style={{ color: "#1e88e5", fontFamily: FONT_FAMILY.bold }}>
                {cart[selectedMember]?.tableData?.location_name || "Order"}/
                {cart[selectedMember]?.tableData?.table_name || "Online"}
              </Text>
            </View>
          {!data.user?.MemberID &&  <Pressable onPress={() => setShowModal(true)}>
              <Text style={{ fontFamily: FONT_FAMILY.bold, color: "green" }}>
                Add More
              </Text>
            </Pressable>}
          </View>
          <Text style={{ color: DARK_BLUE, fontFamily: FONT_FAMILY.normal }}>
            Card Balance:{" "}
            <Text
              style={{
                color: "green",
                fontSize: 16,
                fontFamily: FONT_FAMILY.semiBold,
              }}
            >
              ₹{(cart[selectedMember]?.tableData?.card_balance).toFixed(2)}
            </Text>
          </Text>
        </View>
      )}

      <FlatList
        data={selectedItems}
       keyExtractor={(item) => item.ItemCode}
        renderItem={renderCartItem}
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        contentContainerStyle={{ flexGrow: 1 }}
        removeClippedSubviews
        ListEmptyComponent={() => (
          <View style={styles.container}>
            <View
              style={{
                flex: 1,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Image
                style={{ width: 200, height: 200 }}
                source={require("../../../assets/images/emptycart.png")}
              />
              <Text style={styles.emptyText}>No items in the cart</Text>
            </View>
          </View>
        )}
      />
      {/* Cart List */}
      <ItemSearchModal

        visible={showModal}
        onClose={() => setShowModal(false)}
        member={{ MemberId: cart[selectedMember]?.tableData?.MemberId }}
        tableData={cart[selectedMember]?.tableData}
        token={data.token}
      />

      {/* Footer */}
      {selectedMember && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.totalSection}
            onPress={() => setShowTotalModal(true)}
          >
            <View>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>₹{totalAmount}</Text>
            </View>
            <Icons name="triangle-up" color="black" size={22} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
             
              setShowTotalModal(true)
            }}
            activeOpacity={0.7}
            style={styles.bottomButton}
          >
            <Text style={styles.placeOrderText}>View Details</Text>
            {/* {loading && <ActivityIndicator color={"white"} size={"small"} />} */}
            <Icons
              name="chevron-small-right"
              color="white"
              size={25}
              style={styles.arrowIcon}
            />
          </TouchableOpacity>
        </View>
      )}

      <UniversalModal
        visible={showTotalModal}
        setVisible={() => setShowTotalModal(false)}
        isFull={true}
        title={"Bill Summary"}
      >
        <ScrollView contentContainerStyle={{ flexGrow: 1,marginHorizontal:15 }}>
          <View style={styles.modalBox}>
            {/* 🔹 Top Inputs (PAX + Staff) */}
            {data?.user?.MemberID  ? (
              <>
                <View
                  style={{
                    marginBottom: 20,
                    flexDirection: "row",
                    justifyContent: "space-between",
                  }}
                >
                  <View  style={{alignSelf:'center'}}>
                    <Text
                      style={{
                        marginBottom: 5,
                        fontFamily: FONT_FAMILY.semiBold,
                        color: "#1e88e5",
                      }}
                    >
                    {cart[selectedMember]?.tableData?.orderType.name}
                    </Text>
                 
                  </View>:
                  
               
                  {cart[selectedMember]?.tableData?.orderType.id === 102 && (
                    <View style={{ flex: 1, minHeight: 50 }}>
                      <Dropdown
                      onBlur={()=> setDeliverySlots( generateDeliveryTimes())}
                        style={{
                          flex: 1,
                          borderWidth: 1,
                          borderColor: errors.deliveryTime ? "red" : "#ccc",
                          marginLeft: 10,
                          paddingHorizontal: 10,
                          borderRadius: 7,
                        }}
                        placeholder="Delivery Time"
                        placeholderStyle={{ color: "grey" }}
                        data={deliverySlots}
                        labelField="label"
                        valueField="value"
                        value={selectedDeliveryTime}
                        onChange={(item) => {
                          setSelectedDeliveryTime(item.value);
                          setErrors((prev) => ({
                            ...prev,
                            deliveryTime: null,
                          }));
                        }}
                        maxHeight={200}
                        search
                        searchPlaceholder="Search..."
                        searchPlaceholderTextColor="grey"
                        selectedTextStyle={{ color: "black" }}
                        itemTextStyle={{ color: "black" }}
                      />
                      {errors.deliveryTime && (
                        <Text
                          style={{ color: "red", fontSize: 11, marginLeft: 10 }}
                        >
                          {errors.deliveryTime}
                        </Text>
                      )}
                    </View>
                  )}
                </View>
                {cart[selectedMember]?.tableData?.orderType.id === 102 && (
                  <View style={{ marginBottom: 20,  }}>
                    <TextInput
                      style={{
                        flex: 1,
                        width: "100%",
                        borderWidth: 1,
                        borderColor: errors.address ? "red" : "#ccc",
                        borderRadius: 7,
                        paddingHorizontal: 10,
                        color: "black",
                      }}
                      maxLength={300}
                      placeholder="Delivery Address"
                      placeholderTextColor={"grey"}
                      keyboardType="default"
                      value={address}
                      onChangeText={(text) => {
                        setAddress(text);
                        setErrors((prev) => ({ ...prev, address: null }));
                      }}
                    />

                    {errors.address && (
                      <Text style={{ color: "red", fontSize: 11 }}>
                        {errors.address}
                      </Text>
                    )}
                  </View>
                )}
              </>
            ) : (
              !CartData?.data?.single_kot_service && <View
                style={{
                  marginBottom: 20,
                  flexDirection: "row",
                  justifyContent: "space-between",
                }}
              >
                {/* Number of Pax */}
                <View style={{ flex: 1 }}>
                  {/* {!activeBill?.BillNo && ( */}
                    <TextInput
                      style={{
                        borderWidth: 1,
                        borderColor: errors.noOfPax ? "red" : "#ccc",
                        borderRadius: 7,
                        padding: 15,
                        marginRight: 10,
                        color: "black",
                      }}
                      maxLength={3}
                      placeholder="No. of pax"
                      placeholderTextColor={"grey"}
                      keyboardType="numeric"
                      value={noOfPax}
                      onChangeText={(text) => {
                        setNoOfPax(text);
                        setErrors((prev) => ({ ...prev, noOfPax: null }));
                      }}
                    />
                  {/* )} */}
                  {errors.noOfPax && (
                    <Text style={{ color: "red", fontSize: 11 }}>
                      {errors.noOfPax}
                    </Text>
                  )}
                </View>

                {/* Assigned Staff */}
                {/* <View style={{ flex: 1, minHeight: 50 }}>
                  <Dropdown
                    style={{
                      flex: 1,
                      borderWidth: 1,
                      borderColor: errors.assignedTo ? "red" : "#ccc",
                      marginLeft: 10,
                      paddingHorizontal: 10,
                      borderRadius: 7,
                    }}
                    placeholder="Assigned to"
                    placeholderStyle={{ color: "grey" }}
                    data={CartData?.data?.staff_list || []}
                    labelField="UserName"
                    valueField="UserCode"
                    value={assignedTo}
                    onChange={(item) => {
                      setAssignedTo(item.UserCode);
                      setErrors((prev) => ({ ...prev, assignedTo: null }));
                    }}
                    maxHeight={200}
                    search
                    searchPlaceholder="Search..."
                    searchPlaceholderTextColor="grey"
                    selectedTextStyle={{ color: "black" }}
                    itemTextStyle={{ color: "black" }}
                  />
                  {errors.assignedTo && (
                    <Text
                      style={{ color: "red", fontSize: 11, marginLeft: 10 }}
                    >
                      {errors.assignedTo}
                    </Text>
                  )}
                </View> */}
              </View>
            )}

            {/* 🔹 Bill Header */}
            <View style={styles.billHeader}>
              <Text
                style={[
                  styles.billText,
                  { flex: 2, fontFamily: FONT_FAMILY.bold, color: "black" },
                ]}
              >
                Item
              </Text>
              <Text
                style={[
                  styles.billText,
                  {
                    flex: 1,
                    textAlign: "center",
                    fontFamily: FONT_FAMILY.bold,
                    color: "black",
                  },
                ]}
              >
                Qty
              </Text>
              <Text
                style={[
                  styles.billText,
                  {
                    flex: 1,
                    textAlign: "center",
                    fontFamily: FONT_FAMILY.bold,
                    color: "black",
                  },
                ]}
              >
                Price
              </Text>
              <Text
                style={[
                  styles.billText,
                  { flex: 1, textAlign: "right", fontFamily: FONT_FAMILY.bold },
                ]}
              >
                Total
              </Text>
            </View>

            <View
              style={{ height: 1, backgroundColor: "#ccc", marginVertical: 5 }}
            />

            {/* 🔹 Item List */}
            <FlatList
              data={selectedItems}
             keyExtractor={(item) => item.ItemCode}
              renderItem={({ item }) => (
                <View style={styles.billRow}>
                  <Text
                    style={[styles.billText, { flex: 2 }]}
                    numberOfLines={1}
                  >
                    {item.ItemName}
                  </Text>
                  <Text
                    style={[styles.billText, { flex: 1, textAlign: "center" }]}
                  >
                    {item.qty}
                  </Text>
                  <Text
                    style={[styles.billText, { flex: 1, textAlign: "center" }]}
                  >
                    ₹{item.SP}
                  </Text>
                  <Text
                    style={[styles.billText, { flex: 1, textAlign: "right" }]}
                  >
                    ₹{(item.qty * item.SP).toFixed(2)}
                  </Text>
                </View>
              )}
            />

            {/* 🔹 Subtotal */}
            <View style={[styles.billTotalRow, { borderTopWidth: 1 }]}>
              <Text
                style={[styles.billText, { fontFamily: FONT_FAMILY.semiBold }]}
              >
                Subtotal:
              </Text>
              <Text
                style={[
                  styles.billText,
                  {
                    flex: 1,
                    textAlign: "right",
                    fontFamily: FONT_FAMILY.semiBold,
                  },
                ]}
              >
                ₹{summaryBreakdown.subtotal.toFixed(2)}
              </Text>
            </View>

            {/* 🔹 Discount */}
            <View style={styles.billTotalRow}>
              <Text
                style={[styles.billText, { fontFamily: FONT_FAMILY.semiBold }]}
              >
                Discount:
              </Text>
              <Text
                style={[
                  styles.billText,
                  {
                    textAlign: "right",
                    fontFamily: FONT_FAMILY.semiBold,
                    color: "red",
                  },
                ]}
              >
                -₹{summaryBreakdown.discount.toFixed(2)}
              </Text>
            </View>

            {/* 🔹 Service Charge */}
            {summaryBreakdown.serviceCharge > 0 && (
              <View style={styles.billTotalRow}>
                <Text
                  style={[
                    styles.billText,
                    { fontFamily: FONT_FAMILY.semiBold },
                  ]}
                >
                  (+) Service Charge
                </Text>
                <Text
                  style={[
                    styles.billText,
                    { textAlign: "right", fontFamily: FONT_FAMILY.semiBold },
                  ]}
                >
                  ₹{summaryBreakdown.serviceCharge.toFixed(2)}
                </Text>
              </View>
            )}

         {/* 🔹 Dynamic GST / VAT Section (MULTI SLAB FIX) */}
{(() => {
  // key: GST_5, GST_18, VAT_18 etc.
  const taxMap: Record<string, number> = {};

  selectedItems.forEach((item) => {
    const qty = Number(item.qty) || 0;
    const sp = Number(item.SP) || 0;
    const discount = Number(item.discount) || 0;
    const taxPer = Number(item.ValuePercentage) || 0;
    const taxType = (item.TaxType || "").toUpperCase();

    if (!taxType || taxPer <= 0) return;

    const base = qty * sp;
    const discountAmt = (base * discount) / 100;
    const taxable = base - discountAmt;
    const taxAmt = (taxable * taxPer) / 100;

    const key = `${taxType}_${taxPer}`;
    taxMap[key] = (taxMap[key] || 0) + taxAmt;
  });

  return Object.entries(taxMap).map(([key, amount]) => {
    const [type, rateStr] = key.split("_");
    const rate = Number(rateStr);

    if (type === "GST") {
      return (
        <React.Fragment key={key}>
          <View style={styles.billTotalRow}>
            <Text style={[styles.billText, { fontFamily: FONT_FAMILY.semiBold }]}>
              (+) CGST ({(rate / 2).toFixed(1)}%)
            </Text>
            <Text style={[styles.billText, { textAlign: "right" }]}>
              ₹{(amount / 2).toFixed(2)}
            </Text>
          </View>

          <View style={styles.billTotalRow}>
            <Text style={[styles.billText, { fontFamily: FONT_FAMILY.semiBold }]}>
              (+) SGST ({(rate / 2).toFixed(1)}%)
            </Text>
            <Text style={[styles.billText, { textAlign: "right" }]}>
              ₹{(amount / 2).toFixed(2)}
            </Text>
          </View>
        </React.Fragment>
      );
    }

    return (
      <View key={key} style={styles.billTotalRow}>
        <Text style={[styles.billText, { fontFamily: FONT_FAMILY.semiBold }]}>
          (+) {type} ({rate.toFixed(2)}%)
        </Text>
        <Text style={[styles.billText, { textAlign: "right" }]}>
          ₹{amount.toFixed(2)}
        </Text>
      </View>
    );
  });
})()}


            {/* 🔹 Round Off */}
            <View style={styles.billTotalRow}>
              <Text
                style={[styles.billText, { fontFamily: FONT_FAMILY.semiBold }]}
              >
                Round Off:
              </Text>
              <Text
                style={[
                  styles.billText,
                  { textAlign: "right", fontFamily: FONT_FAMILY.semiBold },
                ]}
              >
                ₹{roundOff}
              </Text>
            </View>
          </View>
        </ScrollView>
        {/* 🔹 Final Total */}
        <View style={[styles.billTotalRow, { borderTopWidth: 1,marginHorizontal:15 }]}>
          <Text style={[styles.billText, { fontFamily: FONT_FAMILY.bold }]}>
            Total Items: {totalItems}
          </Text>
          <Text
            style={[
              styles.billText,
              {
                textAlign: "right",
                fontFamily: FONT_FAMILY.bold,
                fontSize: 16,
              },
            ]}
          >
            ₹{Math.round(totalAmount).toFixed(2)}
          </Text>
        </View>

        {/* 🔹 Place Order Button */}
        <View style={{ alignSelf: "flex-end", marginTop: 15 ,marginRight:15}}>
          <TouchableOpacity
            onPress={HandlePlaceOrder}
            activeOpacity={0.7}
            style={styles.bottomButton}
          >
            {loading && <ActivityIndicator color={"white"} size={"small"} />}
            <Text style={styles.placeOrderText}>Place Order</Text>
            <Icons
              name="chevron-small-right"
              color="white"
              size={25}
              style={styles.arrowIcon}
            />
          </TouchableOpacity>
        </View>
      </UniversalModal>
    </View>
  );
};

export default React.memo(MemberSelector);

const styles = StyleSheet.create({
  memberTabs: {
    margin: 10,
  },
  memberButton: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    backgroundColor: "white",
    borderRadius: 20,
    marginHorizontal: 5,
  },
  activeMemberButton: {
    backgroundColor: "green",
    borderWidth: 1,
    borderColor: "#537256ff",
  },
  memberButtonText: {
    fontFamily: FONT_FAMILY.semiBold,
    color: "#333",
  },
  activeMemberText: { color: "#fff" },
  tableInfo: {
    alignSelf: "flex-start",
  },
  container: {
    backgroundColor: "#F9FAFC",
    flex: 1,
  },
  itemCard: {
    padding: 15,
    backgroundColor: "white",
    borderRadius: 10,
    margin: 10,
      elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    
  },
  itemName: {
    fontFamily: FONT_FAMILY.normal,
    color: "black",
    fontSize: 16,
  },
  addButton: {
    borderWidth: 1,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 5,
    borderColor: "green",
    backgroundColor: "white",
  },
  addText: { fontFamily: FONT_FAMILY.bold, color: "green" },
  qtyContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "green",
    paddingHorizontal: 5,
    
    // width:'100%'
  },
  qtyButton: { paddingHorizontal: 10, paddingVertical: 5, },
  qtyText: {
   
    fontSize: 30,
    color: "green",
    fontFamily: FONT_FAMILY.bold,
  },
  qtyNumber: {
    color: "black",
    fontFamily: FONT_FAMILY.bold,
    fontSize: 16,
  },
  emptyContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyText: { color: "#999", fontSize: 16, fontFamily: FONT_FAMILY.normal },
  footer: {
    backgroundColor: "white",
    padding: 15,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  totalSection: { flexDirection: "row", alignItems: "center" },
  totalLabel: { color: "black", fontFamily: FONT_FAMILY.bold },
  totalValue: { color: "black", fontFamily: FONT_FAMILY.bold },
  bottomButton: {
    flexDirection: "row",
    backgroundColor: "#025a0fff",
    padding: 10,
    borderRadius: 30,
    elevation: 5,
    alignItems: "center",
  },
  placeOrderText: {
    fontFamily: FONT_FAMILY.bold,
    color: "white",
    fontSize: 15,
    marginLeft: 10,
  },
  arrowIcon: {
    backgroundColor: "#114a16ff",
    borderRadius: 20,
    marginLeft: 10,
  },
  modalOverlay: {
    justifyContent: "flex-end",
  },
  modalBox: {
    flex: 1,
    backgroundColor: "white",
    padding: 5,
    borderRadius: 10,
    // elevation: 5,
  },
  modalTitle: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 18,
    marginBottom: 10,
    color: "black",
  },
  modalItem: {
    fontFamily: FONT_FAMILY.normal,
    color: "black",
    marginVertical: 4,
  },
  closeButton: {
    backgroundColor: "green",
    padding: 10,
    borderRadius: 8,
    marginTop: 15,
    alignSelf: "center",
  },
  closeButtonText: {
    fontFamily: FONT_FAMILY.bold,
    color: "white",
  },
  billHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 5,
  },
  billRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 3,
  },
  billText: {
    color: "black",
    fontFamily: FONT_FAMILY.normal,
    fontSize: 14,
  },
  billTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
    paddingTop: 10,
    // borderTopWidth: 1,
    borderColor: "#ccc",
  },
  clearCart:{
              flexDirection: "row",
              alignItems: "center",
              borderWidth: 0.3,
              borderColor: RED_COLOR,
              padding: 5,
              borderRadius: 5,
            },
            heading:{

              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            
            }
            ,headercard:{
            padding: 18,
            borderRadius: 10,
            margin: 10,
            backgroundColor:'white',
           elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
          }
});
// import React, { useState, useMemo, useCallback, useEffect } from "react";
// import {
//   View,
//   Text,
//   Pressable,
//   FlatList,
//   StyleSheet,
//   TouchableOpacity,
//   Image,
//   ActivityIndicator,
//   TextInput,
//   ScrollView,
//   LayoutAnimation,
//   Platform,
//   UIManager,
//   Alert,
//   BackHandler,
// } from "react-native";
// import { useDispatch, useSelector } from "react-redux";
// import Icons from "react-native-vector-icons/Entypo";
// import Octicons from "react-native-vector-icons/Octicons";
// import RNPrint from "react-native-print";
// import ItemSearchModal from '../../components/ItemSearchModal'
// import MemberTab from '../../components/MemberTab'
// import {
//   addToCart,
//   clearAllCart,
//   clearMemberCart,
//   removeFromCart,
//   updateCartItem,
// } from "../../store/actions/cartActions";
// import { Toast } from "react-native-toast-notifications";
// import { Dropdown } from "react-native-element-dropdown";
// import { useQuery, useQueryClient } from "@tanstack/react-query";
// import Animated, { FadeInDown, FadeOutUp } from "react-native-reanimated";
// import AnimatedPressable from "../../components/AnimatedPressable";
// import moment from "moment";
// import AsyncStorage from "@react-native-async-storage/async-storage";

// import Header from "../../components/Header";
// import { DARK_BLUE, FONT_FAMILY, RED_COLOR } from "../../util/colors";
// import UniversalModal from "../../components/UniversalModal";
// import {  javascriptGetLocal, javascriptPostLocal } from "../../util/api";
// import { loginSuccess } from "../../store/slices/authSlice";
// import { ENDPOINT } from "../../util/constant";

// const MemberSelector : React.FC = ({ navigation, route }) => {
//   const cart = useSelector((state) => state?.cart?.cart);
//   const dispatch = useDispatch();
//   const data = useSelector((state) => state.auth || {});
// console.log( cart, '----------------------  ---------------------');
//   const [deliverySlots, setDeliverySlots] = useState([]);
//   const memberIds = Object.keys(cart);
//   const [selectedMember, setSelectedMember] = useState(memberIds[0] || null);
//   const [address, setAddress] = useState(data?.user?.Address);
//   const [showTotalModal, setShowTotalModal] = useState(false);
//   const [showModal, setShowModal] = useState(false);
//   const [loading, setLoading] = useState(false);
//   const [assignedTo, setAssignedTo] = useState(null);
//   const [selectedDeliveryTime, setSelectedDeliveryTime] = useState(null);
//   const [errors, setErrors] = useState({});
//   const [activeBill, setActiveBill] = useState(null);
//   const [noOfPax, setNoOfPax] = useState("1");
//   const queryClient = useQueryClient();

//   const generateDeliveryTimes = useCallback(() => {
//     const now = moment();
//     const startTime = now.add(30, "minutes"); // current time + 30 min

//     // round to next 30-minute slot
//     const minutes = startTime.minutes();
//     const roundedMinutes = minutes <= 30 ? 30 : 60;

//     startTime.minutes(roundedMinutes).seconds(0);

//     const endOfDay = moment().endOf("day");
//     const slots = [];

//     while (startTime.isBefore(endOfDay)) {
//       slots.push({
//         label: startTime.format("hh:mm A"),
//         value: startTime.format("HH:mm"),
//       });
//       startTime.add(30, "minutes");
//     }

//     return slots;
//   }, []);
//   const fetchMemberCarBalance=async(memId:string)=>{
//     const response=await javascriptPostLocal({
//       path:'staff/card-balance',
//       Token:data.token,
//       body:{
//         memeber_id:memId,
//       }
//     })
//     if(response.status===true){

//     }
//   }
//   useEffect(() => {
//     let bill = cart[selectedMember]?.tableData?.activeBill;

//     setActiveBill(bill);
//     setAssignedTo(Number(bill?.WaiterCode || null) );
//     if(cart[selectedMember]?.tableData?.MemberId){
//       fetchMemberCarBalance(cart[selectedMember]?.tableData?.MemberId)
//     }
//   }, [cart[selectedMember]]);
  
//   const CartData = useQuery({
//     queryKey: ["CartData", data.token],
//     queryFn: async () => {
//       // ${data.data[0].LocationCode}
//       const response=await javascriptGetLocal({
//         path: `${ENDPOINT.get_cart_data}userCode=2`,
//         Token: data.token,
//         body: {},
//       });
      
//       // if(response?.staff_list){
//       //   setAssignedTo(response?.staff_list[0])
//       // }
//       return response
//     },
//     enabled: !!data?.token, // only runs if token exists
//   });

// //   useEffect(()=>{
    
// // if(CartData.data.staff_list[0].UserCode){
// //   setAssignedTo(CartData.data.staff_list?.length[0].UserCode)
// // }
// //   },[CartData.data])
//   const HandlePlaceOrder = async () => {
//     if(data?.user?.MemberID){
      
//       if (cart[selectedMember]?.tableData?.orderType.id === 102) {
//         if (!selectedDeliveryTime) {
//           setErrors((prev) => ({ ...prev, deliveryTime: "Please select delivery time" }));
//           return;
//         }
//       }

//       if (cart[selectedMember]?.tableData?.orderType.id === 102 && (!address || address.trim().length === 0)) {
//         setErrors((prev) => ({ ...prev, address: "Please enter delivery address" }));
//         return;
//       }
      
//     }else{
//        if (
//       (noOfPax === "" || isNaN(Number(noOfPax)) || parseInt(noOfPax) <= 0)
//       &&  !CartData?.data?.single_kot_service
//       //  && !activeBill
//     ) {
//       setErrors((prev) => ({
//         ...prev,
//         noOfPax: "Please enter valid number of pax",
//       }));
//       return;
//     }
//      if (!assignedTo    &&  !CartData?.data?.single_kot_service) {
//       setErrors((prev) => ({ ...prev, assignedTo: "Please select staff" }));
//       return;
//     }
//     }

//   const apiObj = {
//       path: data?.user.MemberID ?  `${ENDPOINT.place_order}` 
//       //: activeBill ? `${ENDPOINT.waiter_place_order}/${activeBill.BillNo}`
//         : ENDPOINT.waiter_place_order,
//       Token: data.token,
//       body: data?.user.MemberID ? {
//         MemberID:  data?.user.MemberID,
//         TableCode: '0',
//         WaiterCode: '0',
//         PAX: noOfPax,
//         BillType: cart[selectedMember]?.tableData?.orderType.id ,
//         Address: cart[selectedMember]?.tableData?.orderType.id === 102? address : "",
//         DeliveryTime: cart[selectedMember]?.tableData?.orderType.id === 102 ? selectedDeliveryTime : "",
//         YearCode: cart[selectedMember]?.tableData.yearCode,
//         LocationCode: cart[selectedMember]?.tableData?.LocationCode.toString(),
//         ModeOfPayment: "SMARTCARD",
//         ValidationMode: "SMARTCARD",
//         Total: parseFloat(totalAmount),
//         items: selectedItems.map((i :any) => ({
//           Qty: i.qty,
//           Itemcode: i.ItemCode,
//           ItemName: i.Displayas,
//           ValuePercentage: Number(i.ValuePercentage),
//           SP: parseFloat(i.SP),
//           Note: i.Remarks || "",
//           DiscountPercentage: i.discount || 0,
//           openItem: i.OpenItem || 0,
//           TaxType: i.TaxType || "",
//           ServiceCharge: Number(i.ServiceCharge) || 0,
//           SaleUnit: Number(i.SaleUnit) || "",
//         })),
//       }:{
//         MemberID: cart[selectedMember].tableData?.MemberId,
//         TableCode: cart[selectedMember]?.tableData.TableCode,
//         WaiterCode: assignedTo ||1,
//         UserCode: data.user?.UserCode.toString(),
//         PAX: noOfPax,
        
//         YearCode: cart[selectedMember]?.tableData.yearCode,
//         LocationCode: cart[selectedMember]?.tableData.LocationCode,
//         ModeOfPayment: "SMARTCARD",
//         ValidationMode: "SMARTCARD",
//         Total: parseFloat(totalAmount),
//         items: selectedItems.map((i) => ({
//           Qty: i.qty,
//           Itemcode: i.ItemCode,
//           ItemName: i.Displayas,
//           ValuePercentage: Number(i.ValuePercentage),
//           SP: parseFloat(i.SP),
//           Note: i.Remarks || "",
//           DiscountPercentage: i.discount || 0,
//           openItem: i.OpenItem || 0,
//           TaxType: i.TaxType || "",
//           ServiceCharge: Number(i.ServiceCharge) || 0,
//           SaleUnit: Number(i.SaleUnit) || "",
//         })),
//       },
//     };

//     try {
//       setLoading(true);
//       const response = await javascriptPostLocal(apiObj);
//       setLoading(false);
//       if (response.status === true) {
//          const Udata=await AsyncStorage.getItem('user');
//     if (Udata && address && cart[selectedMember]?.tableData?.orderType.id === 102){
//           const userData = JSON.parse(Udata);
//          userData.user.Address = address;
//           AsyncStorage.setItem('user', JSON.stringify(userData));
//            dispatch(loginSuccess(userData))
           
//         }
//          if (CartData?.data?.single_kot_service){
          
//              navigation.navigate("KotReceipt", {
//         token: data?.token,
//         table: { LocationCode: cart[selectedMember]?.tableData.LocationCode, },
//         bill: response?.receipt,
//         isMember:  !!data?.user.MemberID ,
//         single_kot_service:true
//       });
        
//          }
//         dispatch(clearMemberCart(selectedMember));
//         setSelectedMember(null);
//         setShowTotalModal(false);

//        data?.user.MemberID ? 
//        queryClient.invalidateQueries(["foodorder"]):
//        queryClient.invalidateQueries(["HomeDetails"]);
//         if (response.recipt_service) {
//           const receipt = response.receipt;
//           const html = `
//           <html>
//           <body>
//             <h2 style="text-align:center;">Order Receipt</h2>
//             <p><strong>Bill No:</strong> ${receipt.BillNo}</p>
//             <p><strong>Order No:</strong> ${receipt.KOTNo}</p>
//             <p><strong>Member:</strong> ${receipt.MemberName}</p>
//             <p><strong>Table:</strong> ${receipt.TableCode}</p>
//             <p><strong>Waiter:</strong> ${receipt.WaiterCode}</p>
//             <p><strong>Date:</strong> ${receipt.DateTime}</p>
//             <hr />
//             <table style="width:100%; border-collapse:collapse;">
//               <tr>
//                 <th style="text-align:left;">Item</th>
//                 <th>Qty</th>
//                 <th>Rate</th>
//                 <th>Amount</th>
//               </tr>
//               ${receipt.Items.map(
//                 (item) => `
//                 <tr>
//                   <td>${item.ItemName}</td>
//                   <td>${item.Qty}</td>
//                   <td>${item.Rate}</td>
//                   <td>${item.Amount}</td>
//                 </tr>
//               `
//               ).join("")}
//             </table>
//             <hr />
//             <p><strong>Total:</strong> ₹${receipt.TotalAmount}</p>
//             <p><strong>Opening Balance:</strong> ₹${receipt.OpeningBalance}</p>
//             <p><strong>Closing Balance:</strong> ₹${receipt.ClosingBalance}</p>
//           </body>
//           </html>
//         `;

//           // Directly print
//           await RNPrint.print({ html });
//         }
        
//         if(address){
//            const data=await AsyncStorage.getItem('user');
       
//         }
//         Toast.show(response.message || "Order placed successfully", {
//           type: "success",
//         });

//         // Generate HTML for receipt
//         navigation.navigate( data?.user.MemberID ?'Home':"StaffHome");
//       } else {
//         setShowTotalModal(false);
//         Toast.show(response.message || "Unable to place order.", {
//           type: "danger",
//         });
//       }
//     } catch (error) {}
//   };
//   // memoized items
//   const selectedItems = useMemo(
//     () => cart[selectedMember]?.items || [],
//     [cart, selectedMember]
//   );

//   const totalAmount = useMemo(() => {
//     const total = selectedItems.reduce((sum :number, item :any) => {
//       const qty = parseFloat(item.qty) || 0;
//       const sp = parseFloat(item.SP) || 0;
//       const discountPer = parseFloat(item.discount || 0);
//       const taxPer = parseFloat(item.ValuePercentage || 0);
//       const servicePer = parseFloat(item.ServiceCharge || 0);

//       const baseAmount = qty * sp;
//       const discountAmt = baseAmount * (discountPer / 100);
//       const taxableAmount = baseAmount - discountAmt;
//       const taxAmt = taxableAmount * (taxPer / 100);
//       const serviceChargeAmt = baseAmount * (servicePer / 100);

//       const finalAmt = baseAmount - discountAmt + taxAmt + serviceChargeAmt;
//       return sum + finalAmt;
//     }, 0);

//     return total.toFixed(2);
//   }, [selectedItems]);

//   const totalItems = useMemo(() => {
//     return selectedItems.reduce((sum, item) => sum + (item.qty || 0), 0);
//   }, [selectedItems]);

//   const getItemQuantity = useCallback(
//     (itemCode) => {
//       const found = selectedItems.find((i) => i.ItemCode === itemCode);
//       return found ? found.qty : 0;
//     },
//     [selectedItems]
//   );
//     useEffect(() => {
//       const backAction = () => {
//         // Navigate to Home screen
//           navigation.reset({
//                     routes: [{ name: "Home" }],
//                   });
//         return true; // Prevent default behavior (exit app)
//       };
  
//       const backHandler = BackHandler.addEventListener(
//         'hardwareBackPress',
//         backAction
//       );
  
//       // Cleanup the event listener on unmount
//       return () => backHandler.remove();
//     }, [navigation]);
//   // Calculate totals for summary modal
//   const summaryBreakdown = useMemo(() => {
//     return selectedItems.reduce(
//       (acc, item) => {
//         const qty = parseFloat(item.qty) || 0;
//         const sp = parseFloat(item.SP) || 0;
//         const discountPer = parseFloat(item.discount || 0);
//         const taxPer = parseFloat(item.ValuePercentage || 0);
//         const servicePer = parseFloat(item.ServiceCharge || 0);

//         const baseAmount = qty * sp;
//         const discountAmt = baseAmount * (discountPer / 100);
//         const taxableAmount = baseAmount - discountAmt;
//         const taxAmt = taxableAmount * (taxPer / 100);
//         const serviceChargeAmt = baseAmount * (servicePer / 100);

//         acc.subtotal += baseAmount;
//         acc.discount += discountAmt;
//         acc.tax += taxAmt;
//         acc.serviceCharge += serviceChargeAmt;
//         return acc;
//       },
//       { subtotal: 0, discount: 0, tax: 0, serviceCharge: 0 }
//     );
//   }, [selectedItems]);

//   const roundOff = useMemo(() => {
//     const diff = Math.round(totalAmount) - parseFloat(totalAmount);
//    return Math.abs(diff).toFixed(2);
//   }, [totalAmount]);

//   const renderCartItem = useCallback(
//     ({ item, index }) => {
//       const qty = getItemQuantity(item.ItemCode);
//       return (
//         <Animated.View
//           entering={FadeInDown.delay(index * 50)
//             .duration(400)
//             .springify()}
//           exiting={FadeOutUp.duration(200)}
//         >
//           <View
//             // start={{ x: 0, y: 0 }}
//             // end={{ x: 1, y: 0 }}
//             // colors={["#e3f2fd", "#ffffff", "#e8f5e9"]}
//             style={styles.itemCard}
//           >
//             <View
//               style={{
//                 flexDirection: "row",
//                 alignItems: "center",
//                 justifyContent: "space-between",
//                 flex: 1,
//               }}
//             >
//               <View style={{}}>
//                 <Text
//                   style={[styles.itemName, { fontFamily: FONT_FAMILY.bold }]}
//                 >
//                   {item.Displayas}
//                 </Text>
//                 <Text style={[styles.itemName, { color: "#63748A",fontSize:13 ,fontFamily:FONT_FAMILY.semiBold}]}>
//                   Amount:<Text style={{ color: "#63748A" }}>₹{item.SP}</Text>
//                 </Text>

//                 <Text style={[styles.itemName, { color: "#96A2B8" ,fontSize:13 }]}>
//                   {item.TaxType}({parseFloat(item.ValuePercentage)}%):
//                   <Text style={{ color: "#96A2B8" }}>
//                     ₹
//                     {(
//                       (item.qty * item.SP * parseFloat(item.ValuePercentage)) /
//                       100
//                     ).toFixed(2)}
//                   </Text>
//                 </Text>
//                 {Number(item.ServiceCharge) > 0 && (
//                   <Text style={[styles.itemName, { color: "grey" }]}>
//                     Service Charge({parseFloat(item.ServiceCharge)}%):
//                     <Text style={{ color: "black" }}>
//                       ₹
//                       {(item.qty * item.SP * parseFloat(item.ServiceCharge)) /
//                         100}
//                     </Text>
//                   </Text>
//                 )}
                
//               </View>

//               <View style={{ alignItems: "center" }}>
//                 {
//                   <View style={styles.qtyContainer}>
//                     <AnimatedPressable
//                       onPress={() => {
//                         if (
//                           qty === selectedItems.length &&
//                           selectedItems.length === 1
//                         ) {
//                           dispatch(clearMemberCart(selectedMember));
//                           return;
//                         }
//                         dispatch(
//                           removeFromCart(
//                             String(selectedMember),
//                             item,
//                             cart[selectedMember]?.tableData
//                           )
//                         );
//                       }}
                      
//                     >
//                       <Text style={styles.qtyText}>−</Text>
//                     </AnimatedPressable>

//                     <Text style={styles.qtyNumber}>{qty}</Text>

//                     <AnimatedPressable
//                       onPress={() => {
//                         if (
//                           cart[selectedMember]?.tableData?.card_balance <
//                           parseFloat(totalAmount) + parseFloat(item.SP)
//                         ) {
//                           Toast.hideAll();
//                           Toast.show("Low Balance", { type: "warning" });
//                           return;
//                         }
//                         dispatch(
//                           addToCart(
//                             String(selectedMember),
//                             item,
//                             cart[selectedMember]?.tableData
//                           )
//                         );
//                       }}
//                     >
//                       <Text style={styles.qtyText}>+</Text>
//                     </AnimatedPressable>
//                   </View>
//                 }
//               </View>
//             </View>
//                 {!data?.user?.MemberID && CartData?.data?.staff_discount && (
//                   <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}>
//                      <Text style={[styles.itemName, { color: "#96A2B8" ,fontSize:13 }]}>Discount</Text>
//                   <TextInput
//                     maxLength={2}
//                     value={item.discount ? String(item.discount) : ""}
//                     onChangeText={(text) => {
//                       const val = parseFloat(text) || 0;
//                       dispatch(
//                         updateCartItem(String(selectedMember), item.ItemCode, {
//                           discount: val,
//                         })
//                       );
//                     }}
//                     placeholderTextColor={"grey"}
//                     style={{
//                       textAlign: "center",
//                       width: 68,
//                       borderWidth: 1,
//                       color: "black",
//                       borderColor: "green",
//                       borderRadius: 5,
//                       paddingHorizontal: 10,
//                       paddingVertical: 1,
//                     }}
                    
//                     placeholder="Discount %"
//                     keyboardType="numeric"
//                   />
//                     </View>
//                 )}
//             <View style={{ flexDirection: "row", alignItems: "center" }}></View>

//             <View
//               style={{
//                 flexDirection: "row",
//                 justifyContent: "space-between",
//               }}
//             >
//               {item.Remarks && item.Remarks.length > 0 && (
//                 <View
//                   style={{
//                     flex: 1,
//                     flexDirection: "row",
//                     alignItems: "center",
//                   }}
//                 >
//                   <Text
//                     style={[
//                       styles.itemName,
//                       { color: "grey", fontFamily: FONT_FAMILY.Muli },
//                     ]}
//                   >
//                     Remarks:
//                   </Text>
//                   <Text
//                     style={{ color: "black", fontFamily: FONT_FAMILY.Muli }}
//                   >
//                     {item.Remarks}
//                   </Text>
//                 </View>
//               )}
//             </View>
//           </View>
//         </Animated.View>
//       );
//     },
//     [dispatch , getItemQuantity, selectedMember, cart]
//   );
//   if (
//     Platform.OS === "android" &&
//     UIManager.setLayoutAnimationEnabledExperimental
//   ) {
//     UIManager.setLayoutAnimationEnabledExperimental(true);
//   }
//   useEffect(() => {
//     LayoutAnimation.configureNext(
//       LayoutAnimation.create(
//         250,
//         LayoutAnimation.Types.easeInEaseOut,
//         LayoutAnimation.Properties.opacity
//       )
//     );
//   }, [selectedMember]);

//   return (
//     <View style={styles.container}>
//       <Header toHome={false} title={"Cart"}>
//         {selectedMember && (
//           <Pressable
//             onPress={() => {
//               dispatch(clearAllCart()), setSelectedMember(null);
//             }}
//             style={styles.clearCart}
//           >
//             <Text style={{ color: RED_COLOR, fontFamily: FONT_FAMILY.normal }}>
//               Clear Cart
//             </Text>
//             <Octicons
//               name="trash"
//               size={20}
//               color={RED_COLOR}
//               style={{ marginLeft: 5 }}
//             />
//           </Pressable>
//         )}
//       </Header>
//       {memberIds.length > 1 && (
//         <View style={styles.memberTabs}>
//           <FlatList
//             horizontal
//             showsHorizontalScrollIndicator={false}
//             data={memberIds || []}
//             style={{}}
//             keyExtractor={(id) => id}
//             renderItem={({ item: id }) => (
//               <MemberTab
//                 id={id}
//                 selectedMember={selectedMember}
//                 setSelectedMember={setSelectedMember}
//               />
            
//             )}
//           />
//         </View>
//       )}

//       {cart[selectedMember]?.tableData && (
//         <View
//           style={styles.headercard}
//         >
//           <View
//             style={styles.heading}
//           >
//             <View
//               style={styles.tableInfo}
//             >
//               <Text style={{ color: "#1e88e5", fontFamily: FONT_FAMILY.bold }}>
//                 {cart[selectedMember]?.tableData?.location_name || "Order"}/
//                 {cart[selectedMember]?.tableData?.table_name || "Online"}
//               </Text>
//             </View>
//           {!data.user?.MemberID &&  <Pressable onPress={() => setShowModal(true)}>
//               <Text style={{ fontFamily: FONT_FAMILY.bold, color: "green" }}>
//                 Add More
//               </Text>
//             </Pressable>}
//           </View>
//           <Text style={{ color: DARK_BLUE, fontFamily: FONT_FAMILY.normal }}>
//             Card Balance:{" "}
//             <Text
//               style={{
//                 color: "green",
//                 fontSize: 16,
//                 fontFamily: FONT_FAMILY.semiBold,
//               }}
//             >
//               ₹{(cart[selectedMember]?.tableData?.card_balance).toFixed(2)}
//             </Text>
//           </Text>
//         </View>
//       )}

//       <FlatList
//         data={selectedItems}
//        keyExtractor={(item) => item.ItemCode}
//         renderItem={renderCartItem}
//         initialNumToRender={8}
//         maxToRenderPerBatch={8}
//         contentContainerStyle={{ flexGrow: 1 }}
//         removeClippedSubviews
//         ListEmptyComponent={() => (
//           <View style={styles.container}>
//             <View
//               style={{
//                 flex: 1,
//                 alignItems: "center",
//                 justifyContent: "center",
//               }}
//             >
//               <Image
//                 style={{ width: 200, height: 200 }}
//                 source={require("../../../assets/images/emptycart.png")}
//               />
//               <Text style={styles.emptyText}>No items in the cart</Text>
//             </View>
//           </View>
//         )}
//       />
//       {/* Cart List */}
//       <ItemSearchModal

//         visible={showModal}
//         onClose={() => setShowModal(false)}
//         member={{ MemberId: cart[selectedMember]?.tableData?.MemberId }}
//         tableData={cart[selectedMember]?.tableData}
//         token={data.token}
//       />

//       {/* Footer */}
//       {selectedMember && (
//         <View style={styles.footer}>
//           <TouchableOpacity
//             style={styles.totalSection}
//             onPress={() => setShowTotalModal(true)}
//           >
//             <View>
//               <Text style={styles.totalLabel}>Total</Text>
//               <Text style={styles.totalValue}>₹{totalAmount}</Text>
//             </View>
//             <Icons name="triangle-up" color="black" size={22} />
//           </TouchableOpacity>

//           <TouchableOpacity
//             onPress={() => {
             
//               setShowTotalModal(true)
//             }}
//             activeOpacity={0.7}
//             style={styles.bottomButton}
//           >
//             <Text style={styles.placeOrderText}>View Details</Text>
//             {/* {loading && <ActivityIndicator color={"white"} size={"small"} />} */}
//             <Icons
//               name="chevron-small-right"
//               color="white"
//               size={25}
//               style={styles.arrowIcon}
//             />
//           </TouchableOpacity>
//         </View>
//       )}

//       <UniversalModal
//         visible={showTotalModal}
//         setVisible={() => setShowTotalModal(false)}
//         isFull={true}
//         title={"Bill Summary"}
//       >
//         <ScrollView contentContainerStyle={{ flexGrow: 1,marginHorizontal:15 }}>
//           <View style={styles.modalBox}>
//             {/* 🔹 Top Inputs (PAX + Staff) */}
//             {data?.user?.MemberID  ? (
//               <>
//                 <View
//                   style={{
//                     marginBottom: 20,
//                     flexDirection: "row",
//                     justifyContent: "space-between",
//                   }}
//                 >
//                   <View  style={{alignSelf:'center'}}>
//                     <Text
//                       style={{
//                         marginBottom: 5,
//                         fontFamily: FONT_FAMILY.semiBold,
//                         color: "#1e88e5",
//                       }}
//                     >
//                     {cart[selectedMember]?.tableData?.orderType.name}
//                     </Text>
                 
//                   </View>:
                  
               
//                   {cart[selectedMember]?.tableData?.orderType.id === 102 && (
//                     <View style={{ flex: 1, minHeight: 50 }}>
//                       <Dropdown
//                       onBlur={()=> setDeliverySlots( generateDeliveryTimes())}
//                         style={{
//                           flex: 1,
//                           borderWidth: 1,
//                           borderColor: errors.deliveryTime ? "red" : "#ccc",
//                           marginLeft: 10,
//                           paddingHorizontal: 10,
//                           borderRadius: 7,
//                         }}
//                         placeholder="Delivery Time"
//                         placeholderStyle={{ color: "grey" }}
//                         data={deliverySlots}
//                         labelField="label"
//                         valueField="value"
//                         value={selectedDeliveryTime}
//                         onChange={(item) => {
//                           setSelectedDeliveryTime(item.value);
//                           setErrors((prev) => ({
//                             ...prev,
//                             deliveryTime: null,
//                           }));
//                         }}
//                         maxHeight={200}
//                         search
//                         searchPlaceholder="Search..."
//                         searchPlaceholderTextColor="grey"
//                         selectedTextStyle={{ color: "black" }}
//                         itemTextStyle={{ color: "black" }}
//                       />
//                       {errors.deliveryTime && (
//                         <Text
//                           style={{ color: "red", fontSize: 11, marginLeft: 10 }}
//                         >
//                           {errors.deliveryTime}
//                         </Text>
//                       )}
//                     </View>
//                   )}
//                 </View>
//                 {cart[selectedMember]?.tableData?.orderType.id === 102 && (
//                   <View style={{ marginBottom: 20,  }}>
//                     <TextInput
//                       style={{
//                         flex: 1,
//                         width: "100%",
//                         borderWidth: 1,
//                         borderColor: errors.address ? "red" : "#ccc",
//                         borderRadius: 7,
//                         paddingHorizontal: 10,
//                         color: "black",
//                       }}
//                       maxLength={300}
//                       placeholder="Delivery Address"
//                       placeholderTextColor={"grey"}
//                       keyboardType="default"
//                       value={address}
//                       onChangeText={(text) => {
//                         setAddress(text);
//                         setErrors((prev) => ({ ...prev, address: null }));
//                       }}
//                     />

//                     {errors.address && (
//                       <Text style={{ color: "red", fontSize: 11 }}>
//                         {errors.address}
//                       </Text>
//                     )}
//                   </View>
//                 )}
//               </>
//             ) : (
//               !CartData?.data?.single_kot_service && <View
//                 style={{
//                   marginBottom: 20,
//                   flexDirection: "row",
//                   justifyContent: "space-between",
//                 }}
//               >
//                 {/* Number of Pax */}
//                 <View style={{ flex: 1 }}>
//                   {/* {!activeBill?.BillNo && ( */}
//                     <TextInput
//                       style={{
//                         borderWidth: 1,
//                         borderColor: errors.noOfPax ? "red" : "#ccc",
//                         borderRadius: 7,
//                         padding: 15,
//                         marginRight: 10,
//                         color: "black",
//                       }}
//                       maxLength={3}
//                       placeholder="No. of pax"
//                       placeholderTextColor={"grey"}
//                       keyboardType="numeric"
//                       value={noOfPax}
//                       onChangeText={(text) => {
//                         setNoOfPax(text);
//                         setErrors((prev) => ({ ...prev, noOfPax: null }));
//                       }}
//                     />
//                   {/* )} */}
//                   {errors.noOfPax && (
//                     <Text style={{ color: "red", fontSize: 11 }}>
//                       {errors.noOfPax}
//                     </Text>
//                   )}
//                 </View>

//                 {/* Assigned Staff */}
//                 <View style={{ flex: 1, minHeight: 50 }}>
//                   <Dropdown
//                     style={{
//                       flex: 1,
//                       borderWidth: 1,
//                       borderColor: errors.assignedTo ? "red" : "#ccc",
//                       marginLeft: 10,
//                       paddingHorizontal: 10,
//                       borderRadius: 7,
//                     }}
//                     placeholder="Assigned to"
//                     placeholderStyle={{ color: "grey" }}
//                     data={CartData?.data?.staff_list || []}
//                     labelField="UserName"
//                     valueField="UserCode"
//                     value={assignedTo}
//                     onChange={(item) => {
//                       setAssignedTo(item.UserCode);
//                       setErrors((prev) => ({ ...prev, assignedTo: null }));
//                     }}
//                     maxHeight={200}
//                     search
//                     searchPlaceholder="Search..."
//                     searchPlaceholderTextColor="grey"
//                     selectedTextStyle={{ color: "black" }}
//                     itemTextStyle={{ color: "black" }}
//                   />
//                   {errors.assignedTo && (
//                     <Text
//                       style={{ color: "red", fontSize: 11, marginLeft: 10 }}
//                     >
//                       {errors.assignedTo}
//                     </Text>
//                   )}
//                 </View>
//               </View>
//             )}

//             {/* 🔹 Bill Header */}
//             <View style={styles.billHeader}>
//               <Text
//                 style={[
//                   styles.billText,
//                   { flex: 2, fontFamily: FONT_FAMILY.bold, color: "black" },
//                 ]}
//               >
//                 Item
//               </Text>
//               <Text
//                 style={[
//                   styles.billText,
//                   {
//                     flex: 1,
//                     textAlign: "center",
//                     fontFamily: FONT_FAMILY.bold,
//                     color: "black",
//                   },
//                 ]}
//               >
//                 Qty
//               </Text>
//               <Text
//                 style={[
//                   styles.billText,
//                   {
//                     flex: 1,
//                     textAlign: "center",
//                     fontFamily: FONT_FAMILY.bold,
//                     color: "black",
//                   },
//                 ]}
//               >
//                 Price
//               </Text>
//               <Text
//                 style={[
//                   styles.billText,
//                   { flex: 1, textAlign: "right", fontFamily: FONT_FAMILY.bold },
//                 ]}
//               >
//                 Total
//               </Text>
//             </View>

//             <View
//               style={{ height: 1, backgroundColor: "#ccc", marginVertical: 5 }}
//             />

//             {/* 🔹 Item List */}
//             <FlatList
//               data={selectedItems}
//              keyExtractor={(item) => item.ItemCode}
//               renderItem={({ item }) => (
//                 <View style={styles.billRow}>
//                   <Text
//                     style={[styles.billText, { flex: 2 }]}
//                     numberOfLines={1}
//                   >
//                     {item.Displayas}
//                   </Text>
//                   <Text
//                     style={[styles.billText, { flex: 1, textAlign: "center" }]}
//                   >
//                     {item.qty}
//                   </Text>
//                   <Text
//                     style={[styles.billText, { flex: 1, textAlign: "center" }]}
//                   >
//                     ₹{item.SP}
//                   </Text>
//                   <Text
//                     style={[styles.billText, { flex: 1, textAlign: "right" }]}
//                   >
//                     ₹{(item.qty * item.SP).toFixed(2)}
//                   </Text>
//                 </View>
//               )}
//             />

//             {/* 🔹 Subtotal */}
//             <View style={[styles.billTotalRow, { borderTopWidth: 1 }]}>
//               <Text
//                 style={[styles.billText, { fontFamily: FONT_FAMILY.semiBold }]}
//               >
//                 Subtotal:
//               </Text>
//               <Text
//                 style={[
//                   styles.billText,
//                   {
//                     flex: 1,
//                     textAlign: "right",
//                     fontFamily: FONT_FAMILY.semiBold,
//                   },
//                 ]}
//               >
//                 ₹{summaryBreakdown.subtotal.toFixed(2)}
//               </Text>
//             </View>

//             {/* 🔹 Discount */}
//             <View style={styles.billTotalRow}>
//               <Text
//                 style={[styles.billText, { fontFamily: FONT_FAMILY.semiBold }]}
//               >
//                 Discount:
//               </Text>
//               <Text
//                 style={[
//                   styles.billText,
//                   {
//                     textAlign: "right",
//                     fontFamily: FONT_FAMILY.semiBold,
//                     color: "red",
//                   },
//                 ]}
//               >
//                 -₹{summaryBreakdown.discount.toFixed(2)}
//               </Text>
//             </View>

//             {/* 🔹 Service Charge */}
//             {summaryBreakdown.serviceCharge > 0 && (
//               <View style={styles.billTotalRow}>
//                 <Text
//                   style={[
//                     styles.billText,
//                     { fontFamily: FONT_FAMILY.semiBold },
//                   ]}
//                 >
//                   (+) Service Charge
//                 </Text>
//                 <Text
//                   style={[
//                     styles.billText,
//                     { textAlign: "right", fontFamily: FONT_FAMILY.semiBold },
//                   ]}
//                 >
//                   ₹{summaryBreakdown.serviceCharge.toFixed(2)}
//                 </Text>
//               </View>
//             )}

//          {/* 🔹 Dynamic GST / VAT Section (MULTI SLAB FIX) */}
// {(() => {
//   // key: GST_5, GST_18, VAT_18 etc.
//   const taxMap: Record<string, number> = {};

//   selectedItems.forEach((item) => {
//     const qty = Number(item.qty) || 0;
//     const sp = Number(item.SP) || 0;
//     const discount = Number(item.discount) || 0;
//     const taxPer = Number(item.ValuePercentage) || 0;
//     const taxType = (item.TaxType || "").toUpperCase();

//     if (!taxType || taxPer <= 0) return;

//     const base = qty * sp;
//     const discountAmt = (base * discount) / 100;
//     const taxable = base - discountAmt;
//     const taxAmt = (taxable * taxPer) / 100;

//     const key = `${taxType}_${taxPer}`;
//     taxMap[key] = (taxMap[key] || 0) + taxAmt;
//   });

//   return Object.entries(taxMap).map(([key, amount]) => {
//     const [type, rateStr] = key.split("_");
//     const rate = Number(rateStr);

//     if (type === "GST") {
//       return (
//         <React.Fragment key={key}>
//           <View style={styles.billTotalRow}>
//             <Text style={[styles.billText, { fontFamily: FONT_FAMILY.semiBold }]}>
//               (+) CGST ({(rate / 2).toFixed(1)}%)
//             </Text>
//             <Text style={[styles.billText, { textAlign: "right" }]}>
//               ₹{(amount / 2).toFixed(2)}
//             </Text>
//           </View>

//           <View style={styles.billTotalRow}>
//             <Text style={[styles.billText, { fontFamily: FONT_FAMILY.semiBold }]}>
//               (+) SGST ({(rate / 2).toFixed(1)}%)
//             </Text>
//             <Text style={[styles.billText, { textAlign: "right" }]}>
//               ₹{(amount / 2).toFixed(2)}
//             </Text>
//           </View>
//         </React.Fragment>
//       );
//     }

//     return (
//       <View key={key} style={styles.billTotalRow}>
//         <Text style={[styles.billText, { fontFamily: FONT_FAMILY.semiBold }]}>
//           (+) {type} ({rate.toFixed(2)}%)
//         </Text>
//         <Text style={[styles.billText, { textAlign: "right" }]}>
//           ₹{amount.toFixed(2)}
//         </Text>
//       </View>
//     );
//   });
// })()}


//             {/* 🔹 Round Off */}
//             <View style={styles.billTotalRow}>
//               <Text
//                 style={[styles.billText, { fontFamily: FONT_FAMILY.semiBold }]}
//               >
//                 Round Off:
//               </Text>
//               <Text
//                 style={[
//                   styles.billText,
//                   { textAlign: "right", fontFamily: FONT_FAMILY.semiBold },
//                 ]}
//               >
//                 ₹{roundOff}
//               </Text>
//             </View>
//           </View>
//         </ScrollView>
//         {/* 🔹 Final Total */}
//         <View style={[styles.billTotalRow, { borderTopWidth: 1,marginHorizontal:15 }]}>
//           <Text style={[styles.billText, { fontFamily: FONT_FAMILY.bold }]}>
//             Total Items: {totalItems}
//           </Text>
//           <Text
//             style={[
//               styles.billText,
//               {
//                 textAlign: "right",
//                 fontFamily: FONT_FAMILY.bold,
//                 fontSize: 16,
//               },
//             ]}
//           >
//             ₹{Math.round(totalAmount).toFixed(2)}
//           </Text>
//         </View>

//         {/* 🔹 Place Order Button */}
//         <View style={{ alignSelf: "flex-end", marginTop: 15 ,marginRight:15}}>
//           <TouchableOpacity
//             onPress={HandlePlaceOrder}
//             activeOpacity={0.7}
//             style={styles.bottomButton}
//           >
//             {loading && <ActivityIndicator color={"white"} size={"small"} />}
//             <Text style={styles.placeOrderText}>Place Order</Text>
//             <Icons
//               name="chevron-small-right"
//               color="white"
//               size={25}
//               style={styles.arrowIcon}
//             />
//           </TouchableOpacity>
//         </View>
//       </UniversalModal>
//     </View>
//   );
// };

// export default React.memo(MemberSelector);

// const styles = StyleSheet.create({
//   memberTabs: {
//     margin: 10,
//   },
//   memberButton: {
//     paddingVertical: 6,
//     paddingHorizontal: 14,
//     backgroundColor: "white",
//     borderRadius: 20,
//     marginHorizontal: 5,
//   },
//   activeMemberButton: {
//     backgroundColor: "green",
//     borderWidth: 1,
//     borderColor: "#537256ff",
//   },
//   memberButtonText: {
//     fontFamily: FONT_FAMILY.semiBold,
//     color: "#333",
//   },
//   activeMemberText: { color: "#fff" },
//   tableInfo: {
//     alignSelf: "flex-start",
//   },
//   container: {
//     backgroundColor: "#F9FAFC",
//     flex: 1,
//   },
//   itemCard: {
//     padding: 15,
//     backgroundColor: "white",
//     borderRadius: 10,
//     margin: 10,
//       elevation: 3,
//     shadowColor: '#000',
//     shadowOpacity: 0.05,
//     shadowRadius: 10,
    
//   },
//   itemName: {
//     fontFamily: FONT_FAMILY.normal,
//     color: "black",
//     fontSize: 16,
//   },
//   addButton: {
//     borderWidth: 1,
//     paddingVertical: 5,
//     paddingHorizontal: 10,
//     borderRadius: 5,
//     borderColor: "green",
//     backgroundColor: "white",
//   },
//   addText: { fontFamily: FONT_FAMILY.bold, color: "green" },
//   qtyContainer: {
//     flexDirection: "row",
//     alignItems: "center",
//     borderRadius: 8,
//     borderWidth: 1,
//     borderColor: "green",
//     paddingHorizontal: 5,
    
//     // width:'100%'
//   },
//   qtyButton: { paddingHorizontal: 10, paddingVertical: 5, },
//   qtyText: {
   
//     fontSize: 30,
//     color: "green",
//     fontFamily: FONT_FAMILY.bold,
//   },
//   qtyNumber: {
//     color: "black",
//     fontFamily: FONT_FAMILY.bold,
//     fontSize: 16,
//   },
//   emptyContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
//   emptyText: { color: "#999", fontSize: 16, fontFamily: FONT_FAMILY.normal },
//   footer: {
//     backgroundColor: "white",
//     padding: 15,
//     flexDirection: "row",
//     justifyContent: "space-between",
//   },
//   totalSection: { flexDirection: "row", alignItems: "center" },
//   totalLabel: { color: "black", fontFamily: FONT_FAMILY.bold },
//   totalValue: { color: "black", fontFamily: FONT_FAMILY.bold },
//   bottomButton: {
//     flexDirection: "row",
//     backgroundColor: "#025a0fff",
//     padding: 10,
//     borderRadius: 30,
//     elevation: 5,
//     alignItems: "center",
//   },
//   placeOrderText: {
//     fontFamily: FONT_FAMILY.bold,
//     color: "white",
//     fontSize: 15,
//     marginLeft: 10,
//   },
//   arrowIcon: {
//     backgroundColor: "#114a16ff",
//     borderRadius: 20,
//     marginLeft: 10,
//   },
//   modalOverlay: {
//     justifyContent: "flex-end",
//   },
//   modalBox: {
//     flex: 1,
//     backgroundColor: "white",
//     padding: 5,
//     borderRadius: 10,
//     // elevation: 5,
//   },
//   modalTitle: {
//     fontFamily: FONT_FAMILY.bold,
//     fontSize: 18,
//     marginBottom: 10,
//     color: "black",
//   },
//   modalItem: {
//     fontFamily: FONT_FAMILY.normal,
//     color: "black",
//     marginVertical: 4,
//   },
//   closeButton: {
//     backgroundColor: "green",
//     padding: 10,
//     borderRadius: 8,
//     marginTop: 15,
//     alignSelf: "center",
//   },
//   closeButtonText: {
//     fontFamily: FONT_FAMILY.bold,
//     color: "white",
//   },
//   billHeader: {
//     flexDirection: "row",
//     justifyContent: "space-between",
//     marginBottom: 5,
//   },
//   billRow: {
//     flexDirection: "row",
//     justifyContent: "space-between",
//     paddingVertical: 3,
//   },
//   billText: {
//     color: "black",
//     fontFamily: FONT_FAMILY.normal,
//     fontSize: 14,
//   },
//   billTotalRow: {
//     flexDirection: "row",
//     justifyContent: "space-between",
//     marginTop: 10,
//     paddingTop: 10,
//     // borderTopWidth: 1,
//     borderColor: "#ccc",
//   },
//   clearCart:{
//               flexDirection: "row",
//               alignItems: "center",
//               borderWidth: 0.3,
//               borderColor: RED_COLOR,
//               padding: 5,
//               borderRadius: 5,
//             },
//             heading:{

//               flexDirection: "row",
//               justifyContent: "space-between",
//               alignItems: "center",
            
//             }
//             ,headercard:{
//             padding: 18,
//             borderRadius: 10,
//             margin: 10,
//             backgroundColor:'white',
//            elevation: 3,
//     shadowColor: '#000',
//     shadowOpacity: 0.05,
//     shadowRadius: 10,
//           }
// });
