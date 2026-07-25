import React from 'react';
import { useSelector } from 'react-redux';
import {
  createDrawerNavigator,
  DrawerContentComponentProps,
} from '@react-navigation/drawer';
import {
  CardStyleInterpolators,
  createStackNavigator,
} from '@react-navigation/stack';

import HomeScreen from '../screens/HomeScreen';
import ChangePassword from '../screens/ChangePassword';
import Info from '../screens/Info';
import Contact from '../screens/Contact';
import NotificationListScreen from '../screens/Notification';
import NotificationDetailScreen from '../screens/NotificationDetails';
import ViewStatement from '../screens/ViewStatement';
import PDFComponent from '../screens/PdfComponent';
import Profile from '../screens/Profile';
import CardRecharge from '../screens/CardRecharge';
import AffilatedClub from '../screens/AffilatedClub';
import AuthStack from './AuthStack';

// import Ionicons from "react-native-vector-icons/Ionicons";
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import { CustomDrawerContent } from './CustomDrawerContent';
import { RootState } from '../store/store';
import Room from '../screens/Room';
import BookRoom from '../screens/Bookings/Room/BookRoom';
import RoomReview from '../screens/Bookings/Room/RoomReview';
import MyBookings from '../screens/Bookings/MyBookings';
import BookBanquet from '../screens/Bookings/BookBanquet';
import InvoiceDetails from '../screens/Bookings/InvoiceDetails';
import InvoiceHallDetails from '../screens/Bookings/InvoiceHallDetails';
import FeedbackScreen from '../screens/FeedBack';
import Tee from '../screens/Tee/Tee';
import TeeBuddies from '../screens/Tee/TeeBuddies';
import Buddies from '../screens/Tee/Buddies';
import Addgroups from '../screens/Tee/Addgroups';
import TeeBookingDetail from '../screens/Tee/TeeBookingDetail';
import Events from '../services/Events/Events';
import EventBooking from '../services/Events/EventBooking';
import EventCheckOut from '../services/Events/EventCheckOut';
import EventPassDetails from '../services/Events/EventBookingDetails';
import EventPasses from '../services/Events/EventPasses';
import EventsList from '../services/Events/EventsList';
import AllActivities from '../screens/Activity/AllActivities';
import Activity from '../screens/Activity/Activity';
import ChoosePlayer from '../screens/Activity/ChoosePlayer';
import Players from '../screens/Activity/Players';
import ActivityBookingDetail from '../screens/Activity/ActivityBookingDetail';
import UniversalPaymentScreen from '../screens/Payment/UniversalPaymentScreen';
import Tables from '../screens/Table/Tables';
import MMR from '../screens/MMR/MMR';
import TableBookingDetail from '../screens/Table/TableBookingDetail';
import FoodOrder from '../screens/KOT/FoodOrder';
import Cart from '../screens/KOT/Cart';
import MemberOrders from '../screens/KOT/MemberOrders';
import KotReceipt from '../screens/KOT/KotReciept';
import Table from '../screens/KOT/Table';
import TableOrder from '../screens/KOT/TableOrder';
import Miscellaneous from '../screens/KOT/Miscellaneous';
import CameraScreen from '../screens/QRCode/Camera';
import ClubMenu from '../screens/ClubMenu/ClubMenu';
import EventAdminHome from '../services/Events/EventAdminHome';
import SummeryPDFViewer from '../services/Events/SummeryPDFViewer';
import TicketValidation from '../services/Events/TicketValidation';
import ValidateMemberTickets from '../services/Events/ValidateMemberTickets';
import EventSeats from '../services/Events/EventSeats';
import StaffHome from '../screens/KOTStaff/StaffHome';
import { useAppTheme } from '../theme/AppThemeProvider';
import FoodMenu from '../screens/FoodOrder/FoodMenu';
import MemberFoodCart from '../screens/FoodOrder/MemberFoodCart';
import MemberOrderDetails from '../screens/FoodOrder/MemberOrderDetails';
import ViewBill from '../screens/ViewBill';
import MemberVerificationScreen from '../screens/KOT/TableOptions';

/* -----------------------------------------------------------
   TYPE DEFINITIONS FOR NAVIGATION
----------------------------------------------------------- */

export type DrawerParamList = {
  Home: undefined;
};

export type AppStackParamList = {
  Home: undefined;
  NotificationDetailScreen: {
    data: { id: number };
  };
  
  Recharge: undefined;
  Profile: undefined;
  ChangePassword: undefined;
  Info: {
    index: number;
    title: string;
    data: string;
  };
  Contact: undefined;
  Notification: undefined;
  Invoice: undefined;
  PDFView: undefined;
  Rooms: undefined;
  AffilatedClub: undefined;
 

  // MyBookings
  BookRoom: undefined;
  BookBanquet: undefined;
  MyBookings: {
    url: any[];
    toggle: string;
  };
  RoomReview: {
    booking: any;
  };
  InvoiceHallDetails: {
    id: number | string;
  };
  InvoiceDetails: {
    id: number | string;
  };
  ViewStatement: undefined;
  CardRecharge: undefined;
  FeedBack: undefined;
  // Tee Booking
  Tee: undefined;
  TeeBuddies: undefined;
  Buddies: undefined;
  Addgroups: undefined;
  TeeBookingDetail: undefined;

  //Events
  Event: {
    data: number | string;
  };
  EventSeats: {
    event: any;
    tickets: any[];
    cart: any;
    totalAmount: number;
    totalTickets: number;
    waiters: number;
    member: any;
  };
  EventBooking: undefined;
  EventCheckOut: {
    tickets: any[];
    cart: any;
    totalAmount: number;
    totalTickets: number;
    waiters: number;
    selectedSeats?: any[];
    member: any;
    event: any;
  };
  EventBookingDetails: {
    bookingId: string | number;
  };
  EventPasses: {
    bookingId: string | number;
  };
  EventsList: undefined;
  SummeryPDFViewer: {
    html: string;
    date: Date;
  };
  TicketValidation: undefined;

  //Activity
  AllActivities: undefined;
  Activity: undefined;
  ChoosePlayer: undefined;
  Players: undefined;
  ActivityBookingDetail: { bookingId: number | string };
  ValidateMemberTickets: {
    memberData: any;
  };
  //Payment
  UniversalPayment: {
    orderData: any;
    type: string;
  };

  //Tables
  Table: undefined;
  TableBookingDetail: {
    bookingId: number | string;
  };

  //MMR
  MMR: undefined;

  ViewStatment: undefined;
  
  //single KOT
  FoodOrder: {
    orderType: any;
  };
  Cart: undefined;
  KotReceipt: undefined;
  MemberOrders: undefined;
  Tables: undefined;
  TableOrder: undefined;
  Miscellaneous: undefined;
  Camera: undefined;
  ClubMenu: undefined;
  FoodMenu: {
    orderType: 'take_away' | 'home_delivery';
  };
  ViewBill:undefined;
  MemberFoodCart: {paymentMode:{
    Card:boolean,
    Subscription:boolean
  }};
  MemberOrderDetails:{ id: number | string };
};

export type RootStackParamList = {
  MainApp: undefined;
};

/* -----------------------------------------------------------
   NAVIGATORS
----------------------------------------------------------- */

const Stack = createStackNavigator<AppStackParamList>();
const Drawer = createDrawerNavigator<DrawerParamList>();
const RootStack = createStackNavigator<RootStackParamList>();

/* -----------------------------------------------------------
   DRAWER NAVIGATOR (Inside App)
----------------------------------------------------------- */

const DrawerNavigator = () => {
  const userData = useSelector(state => state.auth);
  const role = userData?.user?.role;
  const { colors } = useAppTheme();

  return (
    <Drawer.Navigator
      drawerContent={(props: DrawerContentComponentProps) => (
        <CustomDrawerContent {...props} />
      )}
      screenOptions={{
        headerShown: false,
        drawerStyle: {
          backgroundColor: colors.primary,
          width: '70%',
          borderRadius: 0,
        },
        drawerLabelStyle: {
          color: colors.onPrimary,
          fontSize: 16,
        },
        drawerInactiveTintColor: colors.onPrimary,
        drawerActiveTintColor: colors.secondary,
      }}
    >
      {
         role === 'staff'?   <Drawer.Screen
      name="StaffHome"
      component={StaffHome}
      options={{
        drawerIcon: ({ size }) => (
          <MaterialCommunityIcons
            name="home-outline"
            size={size}
            color={colors.onPrimary}
          />
        ),
      }}
    />:
      ['Event Admin', 'EventEntry', 'EventFood', 'EventDrinks'].includes(
        role,
      ) ? (
        <Drawer.Screen
          name="EventAdminHome"
          component={EventAdminHome}
          options={{
            drawerIcon: ({ size }) => (
              <MaterialCommunityIcons
                name="home-outline"
                size={size}
                color={colors.onPrimary}
              />
            ),
          }}
        />
      ) : (
        <Drawer.Screen
          name="Home"
          component={HomeScreen}
          options={{
            drawerIcon: ({ size }) => (
              <MaterialCommunityIcons
                name="home-outline"
                size={size}
                color={colors.onPrimary}
              />
            ),
          }}
        />
      )}
    </Drawer.Navigator>
  );
};

/* -----------------------------------------------------------
   STACK SCREENS INSIDE APP
----------------------------------------------------------- */

const AppStackScreens = () => {
  const { colors } = useAppTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        gestureEnabled: true,
        contentStyle: { backgroundColor: colors.background },
        cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
      }}
    >
      <Stack.Screen name="Home" component={DrawerNavigator} />
      <Stack.Screen
        name="NotificationDetailScreen"
        component={NotificationDetailScreen}
      />
      <Stack.Screen name="Recharge" component={CardRecharge} />
      <Stack.Screen name="Profile" component={Profile} />
      <Stack.Screen name="ChangePassword" component={ChangePassword} />
      <Stack.Screen name="Info" component={Info} />
      <Stack.Screen name="Contact" component={Contact} />
      <Stack.Screen name="Notification" component={NotificationListScreen} />
      <Stack.Screen name="Invoice" component={ViewStatement} />

      <Stack.Screen name="PDFView" component={PDFComponent} />
      <Stack.Screen name="Rooms" component={Room} />
      <Stack.Screen name="AffilatedClub" component={AffilatedClub} />
     
      <Stack.Screen name="UniversalPayment" component={UniversalPaymentScreen} />
      <Stack.Screen name="ClubMenu" component={ClubMenu} />

      {/* TEE BOOKING */}

      <Stack.Screen name="Tee" component={Tee} />
      <Stack.Screen name="TeeBuddies" component={TeeBuddies} />
      <Stack.Screen name="Buddies" component={Buddies} />
      <Stack.Screen name="Addgroups" component={Addgroups} />
      <Stack.Screen name="TeeBookingDetail" component={TeeBookingDetail} />
      {/* MyBookings*/}
      <Stack.Screen name="BookRoom" component={BookRoom} />
      <Stack.Screen name="BookBanquet" component={BookBanquet} />
      <Stack.Screen name="MyBookings" component={MyBookings} />
      <Stack.Screen name="RoomReview" component={RoomReview} />
     
      <Stack.Screen name="InvoiceHallDetails" component={InvoiceHallDetails} />
      <Stack.Screen name="InvoiceDetails" component={InvoiceDetails} />
      <Stack.Screen name="FeedBack" component={FeedbackScreen} />
<Stack.Screen name="ViewBill" component={ViewBill} />
      {/* Events */}
      <Stack.Screen name="Event" component={Events} />
      <Stack.Screen name="EventBooking" component={EventBooking} />
      <Stack.Screen name="EventCheckOut" component={EventCheckOut} />
      <Stack.Screen name="EventBookingDetails" component={EventPassDetails} />
      <Stack.Screen name="EventSeats" component={EventSeats} />
      <Stack.Screen name="EventPasses" component={EventPasses} />
      <Stack.Screen name="EventsList" component={EventsList} />
      <Stack.Screen name="SummeryPDFViewer" component={SummeryPDFViewer} />
      <Stack.Screen name="TicketValidation" component={TicketValidation} />
      <Stack.Screen
        name="ValidateMemberTickets"
        component={ValidateMemberTickets}
      />
      <Stack.Screen
        name="MemberVerificationScreen"
        component={MemberVerificationScreen}
      />

      {/* Activity */}
      <Stack.Screen name="AllActivities" component={AllActivities} />
      <Stack.Screen name="Activity" component={Activity} />
      <Stack.Screen name="ChoosePlayer" component={ChoosePlayer} />
      <Stack.Screen name="Players" component={Players} />
      <Stack.Screen
        name="ActivityBookingDetail"
        component={ActivityBookingDetail}
      />

      {/* Table */}
      <Stack.Screen name="Table" component={Tables} />
      <Stack.Screen name="TableBookingDetail" component={TableBookingDetail} />
      {/* MMR */}
      <Stack.Screen name="MMR" component={MMR} />

      {/* KOT */}
      <Stack.Screen name="FoodOrder" component={FoodOrder} />
      <Stack.Screen name="Cart" component={Cart} />
      <Stack.Screen name="MemberOrders" component={MemberOrders} />
      <Stack.Screen name="KotReceipt" component={KotReceipt} />
      <Stack.Screen name="Tables" component={Table} />
      <Stack.Screen name="TableOrder" component={TableOrder} />
      <Stack.Screen name="Miscellaneous" component={Miscellaneous} />
      <Stack.Screen name="Camera" component={CameraScreen} />

      {/* Food Order*/}
       <Stack.Screen name="FoodMenu" component={FoodMenu} />
       <Stack.Screen name="MemberFoodCart" component={MemberFoodCart} />
       <Stack.Screen name="MemberOrderDetails" component={MemberOrderDetails} />
    </Stack.Navigator>
  );
};

/* -----------------------------------------------------------
   ROOT NAVIGATOR (Handles AUTH)
----------------------------------------------------------- */

const AppDrawerNavigator = () => {
  const userData = useSelector((state: RootState) => state.auth);
  const isLoggedIn = !!userData?.token;
  const { colors } = useAppTheme();

  return !isLoggedIn ? (
    <AuthStack />
  ) : (
    <RootStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <RootStack.Screen name="MainApp" component={AppStackScreens} />
    </RootStack.Navigator>
  );
};

export default AppDrawerNavigator;
