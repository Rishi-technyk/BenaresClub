

import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  ScrollView,
  Pressable,
  useWindowDimensions,
} from 'react-native';

import moment from 'moment';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Header from '../../../components/Header';
import RoomCard from './RoomCard';
import RoomSummaryModal from './RoomSummaryModal';
import { useFetchOccupantsQuery, useFetchRoomsMutation, useFetchSettingsQuery, useFetchSOPQuery } from './roomsApi';
import DatePicker from 'react-native-date-picker';
import { FONT_FAMILY } from '../../../util/colors';
import LinearGradient from 'react-native-linear-gradient';
import { createShimmerPlaceholder } from 'react-native-shimmer-placeholder';
import RenderHTML from 'react-native-render-html';
import { ModalStyles } from '../../../Styles/ModalStyles';
import NewButton from '../../../components/Button';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppStackParamList } from '../../../navigation/AppDrawer';
import UniversalModal from '../../../components/UniversalModal';
import { useAppTheme } from '../../../theme/AppThemeProvider';

/* ---------------- TYPES ---------------- */

interface BookingDates {
  checkIn: Date;
  checkOut: Date;
}



interface GuestCount {
  adults: number;
  children: number;
  rooms: number;
}
interface SelectedRoom {
  roomId: number;
  occupantId: number;
  occupantName: string;

  quantity: number;
  nights: number;

  pricePerNight: number;
  gstPer: number;
  gstAmountPerNight: number;
  totalPerNight: number;

  adults: number;
  children: number;

  requiresGuestInfo?: boolean;
  guestName?: string;
  guestEmail?: string;
  guestMobile?: string;


  errors?: {
    guestName?: string;
    guestEmail?: string;
    guestMobile?: string;
  };
}




interface BookingState {
  dates: BookingDates;
  guests: GuestCount;
  selectedRooms: SelectedRoom[];
totalAmount: number;
}
const ShimmerPlaceholder = createShimmerPlaceholder(LinearGradient);
type Props=NativeStackScreenProps<AppStackParamList,'BookRoom'>
/* ---------------- COMPONENT ---------------- */

const RoomBooking: React.FC <Props>= ({navigation}) => {
  const [showSummary, setShowSummary] = useState(false);
  const [rooms, setRooms] = useState<any[]>([]);
const [openCheckIn, setOpenCheckIn] = useState(false);
const [openCheckOut, setOpenCheckOut] = useState(false);
const {colors} = useAppTheme();
const styles = createStyles(colors);
console.log( rooms, '---------------------- roomsr ---------------------');
const updateDates = (checkIn: Date, checkOut: Date) => {
  setBooking(prev => ({
    ...prev,
    dates: { checkIn, checkOut },
    selectedRooms: [],
    totalAmount: 0,
  }));
};

  const [modalVisible, setModalVisible] = useState(false);


  /* ---------- SETTINGS ---------- */
const { data: settings } = useFetchSettingsQuery();

/**
 * min_days = minimum days from today when booking can start
 */
const minBookingOffset = settings?.min_days ?? 1;
const maxBookingOffset = settings?.max_days ?? 30;

/* ---------- BOOKING STATE ---------- */
const [booking, setBooking] = useState<BookingState>(() => {
  const checkIn = moment()
    .add(minBookingOffset, 'day')
    .startOf('day')
    .toDate();

  const checkOut = moment(checkIn)
    .add(1, 'day')
    .toDate();

  return {
    dates: { checkIn, checkOut },
    guests: {
      adults: 2,
      children: 0,
      rooms: 1,
    },
    selectedRooms: [],
    totalAmount: 0,
  };
});

  /* ---------------- API ---------------- */

  const [fetchRooms, { isLoading }] = useFetchRoomsMutation();

  /* ---------------- DERIVED VALUES ---------------- */

  const nights = useMemo(() => {
    return moment(booking.dates.checkOut).diff(
      moment(booking.dates.checkIn),
      'days',
    );
  }, [booking.dates]);



useEffect(() => {
  if (!settings?.min_days) return;

  const checkIn = moment()
    .add(settings.min_days, 'day')
    .startOf('day')
    .toDate();

  const checkOut = moment(checkIn)
    .add(1, 'day')
    .toDate();

  setBooking(prev => ({
    ...prev,
    dates: { checkIn, checkOut },
    selectedRooms: [],
    totalAmount: 0,
  }));
}, [settings?.min_days]);

const {
  data: sopResponse,
  isLoading: sopLoading,
} = useFetchSOPQuery();

useEffect(() => {
  if (!sopResponse?.data) return;

  setModalVisible(true);
}, [sopResponse?.data,sopResponse]);
useEffect(() => {
  const loadRooms = async () => {
    try {
      const res = await fetchRooms({
        check_in: booking.dates.checkIn,
        check_out: booking.dates.checkOut,
      }).unwrap();

      setRooms(res?.data?.rooms || []);

      // reset selection on date change
      setBooking(prev => ({
        ...prev,
        selectedRooms: [],
        totalAmount: 0,
      }));
    } catch (e) {
      console.log('Room fetch failed', e);
    }
  };

  loadRooms();
}, [booking.dates.checkIn, booking.dates.checkOut]);

const updateGuestField = (roomId, field, value) => {
  setBooking(prev => ({
    ...prev,
    selectedRooms: prev.selectedRooms.map(r =>
      r.roomId === roomId
        ? {
            ...r,
            [field]: value,
            errors: {
              ...r.errors,
              [field]: undefined, // 🔥 clear error as user types
            },
          }
        : r,
    ),
  }));
};


const updateAdults = (roomId: number, delta: number) => {
  setBooking(prev => ({
    ...prev,
    selectedRooms: prev.selectedRooms.map(r =>
      r.roomId === roomId
        ? {
            ...r,
            adults: Math.min(
              10,
              Math.max(1, r.adults + delta),
            ),
          }
        : r,
    ),
  }));
};


const updateChildren = (roomId: number, delta: number) => {
  setBooking(prev => ({
    ...prev,
    selectedRooms: prev.selectedRooms.map(r =>
      r.roomId === roomId
        ? {
            ...r,
            children: Math.min(
              10,
              Math.max(0, r.children + delta),
            ),
          }
        : r,
    ),
  }));
};
const updateRoomOccupant = (roomId: number, occupant: any) => {
  setBooking(prev => ({
    ...prev,
    selectedRooms: prev.selectedRooms.map(r =>
      r.roomId === roomId
        ? {
            ...r,
            occupantId: occupant.occupant_id,
            occupantName: occupant.name,
            requiresGuestInfo: occupant.additional_info === 'Yes',

            pricePerNight: occupant.price_per_night,
            gstPer: occupant.gst_per,
            gstAmountPerNight: occupant.gst_amount,
            totalPerNight: occupant.total_per_night,
          }
        : r
    ),
  }));
};


  const {width} = useWindowDimensions();
const updateRoomQuantity = (room: any, delta: number) => {
  setBooking(prev => {
    const existing = prev.selectedRooms.find(
      r => r.roomId === room.room_category_id,
    );

    let updatedRooms: SelectedRoom[];

    if (existing) {
      updatedRooms = prev.selectedRooms
        .map(r =>
          r.roomId === room.room_category_id
            ? { ...r, quantity: r.quantity + delta }
            : r,
        )
        .filter(r => r.quantity > 0);
    } else {
      // ✅ PRESELECT FIRST OCCUPANT OF THIS ROOM
      const defaultOccupant = room.occupants?.[0];

      if (!defaultOccupant) return prev;

      updatedRooms = [
        ...prev.selectedRooms,
        {
          roomId: room.room_category_id,
          name: room.name,

          pricePerNight: defaultOccupant.price_per_night,
          gstPer: defaultOccupant.gst_per,
          gstAmount: defaultOccupant.gst_amount,
          totalPerNight: defaultOccupant.total_per_night,

          quantity: 1,
          nights,
          adults: 1,
          children: 0,

          occupantId: defaultOccupant.occupant_id,
          occupantName: defaultOccupant.name,
          requiresGuestInfo: defaultOccupant.additional_info === 'Yes',
        },
      ];
    }

    return {
      ...prev,
      selectedRooms: updatedRooms,
      totalAmount: updatedRooms.reduce(
        (sum, r) => sum + r.totalPerNight * r.quantity * nights,
        0,
      ),
    };
  });
};

const isValidEmail = (email?: string) =>
  !!email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const isValidMobile = (mobile?: string) =>
  !!mobile && /^[0-9]{10}$/.test(mobile);
const validateRooms = () => {
  let valid = true;

  const updatedRooms = booking.selectedRooms.map(room => {
    const errors: any = {};

    if (!room.occupantId) valid = false;

    if (room.requiresGuestInfo) {
      if (!room.guestName?.trim()) {
        errors.guestName = 'Name is required';
        valid = false;
      }

      if (!isValidEmail(room.guestEmail)) {
        errors.guestEmail = 'Invalid email';
        valid = false;
      }

      if (!isValidMobile(room.guestMobile)) {
        errors.guestMobile = 'Invalid mobile number';
        valid = false;
      }
    }

    return { ...room, errors };
  });

  setBooking(prev => ({
    ...prev,
    selectedRooms: updatedRooms,
  }));

  return valid;
};

const isBookingValid = useMemo(() => {
  if (booking.selectedRooms.length === 0) return false;

  return booking.selectedRooms.every(room => {
    if (!room.occupantId) return false;
    if (room.adults < 1) return false;

    if (room.requiresGuestInfo) {
      return (
        room.guestName?.trim() &&
        isValidEmail(room.guestEmail) &&
        isValidMobile(room.guestMobile)
      );
    }

    return true;
  });
}, [booking.selectedRooms]);

  const emptyList = () => (
    <FlatList
      data={[1, 1, 1, 1, 1, 1]}
      renderItem={() => (
        <View
          style={[styles.mainView, { marginHorizontal: 10, borderRadius: 20 }]}>
          <View style={{ flex: 1, alignItems: "center", flexDirection: "row" }}>
 
            <View style={{ flex: 1, alignItems: "flex-start", marginLeft: 10 }}>
              <ShimmerPlaceholder style={{ margin: 5 }} />
              <ShimmerPlaceholder style={{ margin: 5 }} />
              <ShimmerPlaceholder style={{ margin: 5 }} />
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-around",
                }}>
                <ShimmerPlaceholder width={70} style={{ margin: 5 }} />
                <ShimmerPlaceholder width={70} style={{ margin: 5 }} />
              </View>
            </View>
          </View>
        </View>
      )}
    />
  );
  /* ---------------- UI ---------------- */

  return (
    <View style={styles.container}>
      <Header toHome={false} title="Book Rooms" />

      {/* Dates */}
   <View style={styles.dateBox}>
  <TouchableOpacity onPress={() => setOpenCheckIn(true)} style={styles.dateButton}>
    <Text style={styles.dateLabel}>Check-in</Text>
    <Text style={styles.dateText}>
      {moment(booking.dates.checkIn).format('DD MMM YYYY')}
    </Text>
  </TouchableOpacity>

  <TouchableOpacity onPress={() => setOpenCheckOut(true)} style={styles.dateButton}>
    <Text style={styles.dateLabel}>Check-out</Text>
    <Text style={styles.dateText}>
      {moment(booking.dates.checkOut).format('DD MMM YYYY')}
    </Text>
  </TouchableOpacity>
</View>
 <UniversalModal
        visible={modalVisible}
        setVisible={setModalVisible}
        title='Terms & Conditions'
        isFull={true}>
       
        <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 10 }}>
          <RenderHTML
            source={{ html: sopResponse?.data?.content }}
            contentWidth={width - 60}
            style={{ fontSize: 15, marginVertical: 5 }}
            baseStyle={{
              color: colors.text,
              fontSize: 13,
              width: "100%",
            }}
          />
        </ScrollView>
        <View style={{ alignItems: "flex-end" ,margin:20}}>
          <NewButton
            text={"Accept"}
            onPress={() => {
            setModalVisible(false);
            }}
          />
        </View>
       </UniversalModal>
<DatePicker
  modal
  open={openCheckIn}
  date={booking.dates.checkIn}
  mode="date"
  minimumDate={moment()
    .add(minBookingOffset, 'day')
    .toDate()}
  onConfirm={date => {
    setOpenCheckIn(false);

    const newCheckOut = moment(date)
      .add(1, 'day')
      .toDate();

    updateDates(date, newCheckOut);
  }}
  onCancel={() => setOpenCheckIn(false)}
  maximumDate={moment().add(maxBookingOffset, 'day').toDate()}
/>
<DatePicker
  modal
  open={openCheckOut}
  date={booking.dates.checkOut}
  mode="date"
  minimumDate={moment(booking.dates.checkIn)
    .add(1, 'day')
    .toDate()}
  onConfirm={date => {
    setOpenCheckOut(false);
    updateDates(booking.dates.checkIn, date);
  }}
  onCancel={() => setOpenCheckOut(false)}
   maximumDate={moment().add(maxBookingOffset, 'day').toDate()}
/>



      {/* Rooms */}
   <FlatList
  data={rooms}
  keyExtractor={item => item.room_category_id.toString()}
  renderItem={({ item }) => {
    const selectedRoom = booking.selectedRooms.find(
      r => r.roomId === item.room_category_id,
    );

    return (
      <RoomCard
        room={item}
        occupants={item.occupants}   // ✅ room-specific occupants
        selectedRoom={selectedRoom}
        selectedQty={selectedRoom?.quantity ?? 0}

        onOccupantChange={occ =>
          updateRoomOccupant(item.room_category_id, occ)
        }

        onGuestChange={(field, value) =>
          updateGuestField(item.room_category_id, field, value)
        }

        onAdultChange={delta =>
          updateAdults(item.room_category_id, delta)
        }

        onChildChange={delta =>
          updateChildren(item.room_category_id, delta)
        }

        onIncrease={() => updateRoomQuantity(item, 1)}
        onDecrease={() => updateRoomQuantity(item, -1)}
      />
    );
  }}
  ListEmptyComponent={
    !isLoading ? (
      <View style={{marginTop:50,alignItems:'center',justifyContent:'center'}}>
        <Image 
            source={require('../../../../assets/images/norecord.png')}
           style={{height:100,width:100}}
        />
    
      <Text style={styles.empty}>No rooms available.</Text>
      </View>
    ) : (
      emptyList()
    )
  }
/>

      {/* Bottom Bar */}
{isBookingValid && booking.totalAmount > 0 && (
  <View style={styles.bottomBar}>
    <TouchableOpacity
   
     onPress={() => {
      if (validateRooms()) {
        setShowSummary(true);
      }
    }}>
      <Text style={{color:colors.placeholder,fontFamily:FONT_FAMILY.normal}}>Total</Text>
      <View  style={{flexDirection:'row'}}>
      <Text style={styles.amount}>₹ {booking.totalAmount.toFixed(2)}</Text>

    <Icon name="arrow-drop-up" size={20} color="black" />
      </View>
    </TouchableOpacity>

    <TouchableOpacity  onPress={() => {
    if (validateRooms()) {
      navigation.navigate('RoomReview', {
        booking: booking,
      });
    }
  }}
  style={styles.cta}>
      <Text style={styles.ctaText}>Continue Booking</Text>
    </TouchableOpacity>
  </View>
)}


      {/* Summary */}
      <RoomSummaryModal
        visible={showSummary}
        booking={booking}
        onClose={() => setShowSummary(false)}
      />
    </View>
  );
};

export default RoomBooking;


const createStyles = (colors: {   background: string;
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


 }) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
mainView:{margin:20,backgroundColor:colors.surface,padding:20},
  dateBox: {
    backgroundColor: colors.surface,
    marginHorizontal: 16,
    marginTop: 12,
    padding: 14,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    flexDirection:'row',
    alignItems:'center',
    justifyContent:'space-around'
  },

  dateText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
    marginBottom: 4,
  },

  empty: {
    textAlign: 'center',
    marginTop: 40,
    fontFamily:FONT_FAMILY.normal,
    color: '#999',
    fontSize: 15,
  },

  /* ---------------- Bottom Bar ---------------- */

  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,

    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  amount: {
    fontSize: 18,
    fontFamily:FONT_FAMILY.bold,
    color: colors.text,
  },

  cta: {
    backgroundColor: colors.secondary,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 10,
  },

  ctaText: {
    color: colors.text,
    fontFamily:FONT_FAMILY.bold,
    fontSize: 14,
  },
 dateButton:{
  backgroundColor:colors.background ,
  borderWidth:1,
  borderColor:colors.border,
  borderRadius:6,
  padding:10
 },
 dateLabel:{
  fontSize:12,
  color:colors.textMuted,
  textAlign:'center'
 }
});

