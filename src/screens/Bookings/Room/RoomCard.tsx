import React, { useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  TextInput,
  LayoutAnimation,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {PUBLIC_URL} from '@env'
import { Dropdown } from 'react-native-element-dropdown';
import { useAppTheme } from '../../../theme/AppThemeProvider';
import { FONT_FAMILY } from '../../../util/colors';


interface Props {
  room: any;
  occupants: any[];
  selectedRoom?: any;
  selectedQty: number;
  onIncrease: () => void;
  onDecrease: () => void;
  onOccupantChange: (occ: any) => void;
  onGuestChange: (field: string, value: string) => void;
  onAdultChange: (delta: number) => void;
  onChildChange: (delta: number) => void;
}

const Counter = ({ label, value, onInc, onDec, min, max }) => {
  const disableDec = value <= min;
  const disableInc = value >= max;
const {colors}= useAppTheme();
const styles = createStyles(colors); 

  return (
    <View style={styles.counter}>
      <Text style={styles.counterLabel}>{label}</Text>

      <View style={styles.counterBtns}>
        <TouchableOpacity
          onPress={onDec}
          disabled={disableDec}
          style={disableDec && styles.disabledBtn}
        >
          <Text style={styles.counterBtn}>−</Text>
        </TouchableOpacity>

        <Text style={styles.counterValue}>{value}</Text>

        <TouchableOpacity
          onPress={onInc}
          disabled={disableInc}
          style={disableInc && styles.disabledBtn}
        >
          <Text style={styles.counterBtn}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const Input = props => (
  <TextInput {...props}  placeholderTextColor="#999" />
);

const RoomCard: React.FC<Props> = ({
  room,
  occupants,
  selectedRoom,
  onIncrease,
  onDecrease,
  onOccupantChange,
  selectedQty,
  onGuestChange,
  onAdultChange,
  onChildChange,
}) => {
  useEffect(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  }, [selectedRoom?.occupantId]);
const {colors}= useAppTheme();
const styles = createStyles(colors); 

  const showExtra = selectedRoom?.requiresGuestInfo;
  const availableRooms = Number(room?.available_rooms ?? 0);
  const disableIncrease = selectedQty >= availableRooms;
  const disableDecrease = selectedQty <= 0;
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.card}>
        {/* Header */}
        <View style={{ flexDirection: 'row' }}>
          <Image source={{ uri: `${PUBLIC_URL}${room.image }`}} style={styles.img} />
          {/* <Image source={{ uri: 'https://st.hzcdn.com/simgs/23d10aba05948770_14-2874/home-design.jpg' }} style={styles.img} /> */}

          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{room.name}</Text>

            <Text style={styles.price}>
              ₹ {selectedRoom?.totalPerNight ?? '—'} / night
            </Text>
            <Text style={{ fontSize: 12, color: '#777' }}>
              Includes GST ({selectedRoom?.gstPer}%)
            </Text>

            <Text style={styles.availability}>
              {availableRooms > 0
                ? `${availableRooms} room${availableRooms > 1 ? 's' : ''} left`
                : 'Sold out'}
            </Text>
            {/* Occupant */}
            {selectedRoom && (
          <Dropdown
  style={styles.dropdown}
  data={room.occupants}
  labelField="name"
  valueField="occupant_id"     // ✅ FIX
  placeholder="Booked For"
  value={selectedRoom?.occupantId}
 
  selectedTextStyle={{color: colors.text}}
  

  onChange={onOccupantChange}
/>
            )}
          </View>
        </View>

        {/* Guest Info */}
        {showExtra && (
          <View style={styles.guestBox}>
            <Input
              placeholder="Guest Name"
              value={selectedRoom.guestName}
              onChangeText={v => onGuestChange('guestName', v)}
              style={[
                styles.input,
                selectedRoom.errors?.guestName && styles.errorInput,
              ]}
            />
            {selectedRoom.errors?.guestName && (
              <Text style={styles.errorText}>
                {selectedRoom.errors.guestName}
              </Text>
            )}

            <Input
              placeholder="Guest Email"
              keyboardType="email-address"
              value={selectedRoom.guestEmail}
              onChangeText={v => onGuestChange('guestEmail', v)}
              style={[
                styles.input,
                selectedRoom.errors?.guestEmail && styles.errorInput,
              ]}
            />
            {selectedRoom.errors?.guestEmail && (
              <Text style={styles.errorText}>
                {selectedRoom.errors.guestEmail}
              </Text>
            )}

            <Input
              placeholder="Mobile Number"
              keyboardType="number-pad"
              maxLength={10}
              value={selectedRoom.guestMobile}
              onChangeText={v => onGuestChange('guestMobile', v)}
              style={[
                styles.input,
                selectedRoom.errors?.guestMobile && styles.errorInput,
              ]}
            />
            {selectedRoom.errors?.guestMobile && (
              <Text style={styles.errorText}>
                {selectedRoom.errors.guestMobile}
              </Text>
            )}
          </View>
        )}

        <View
          style={[
            styles.qtyRow,
            { justifyContent: selectedRoom ? 'space-around' : 'flex-end' },
          ]}
        >
          {selectedRoom && (
            <>
              <Counter
                label="Adults"
                value={selectedRoom.adults}
                min={1}
                max={room.max_adults}
                onInc={() => onAdultChange(1)}
                onDec={() => onAdultChange(-1)}
              />

              <Counter
                label="Children"
                value={selectedRoom.children}
                min={0}
                max={room.max_children}
                onInc={() => onChildChange(1)}
                onDec={() => onChildChange(-1)}
              />
            </>
          )}
          <View style={[styles.qtyRow,]}>
            <TouchableOpacity
              onPress={onDecrease}
              style={[styles.qtyBtn, disableDecrease && styles.disabledBtn]}
              disabled={disableDecrease}
            >
              <Text style={styles.qtyText}>−</Text>
            </TouchableOpacity>

            <Text style={styles.qty}>{selectedQty}</Text>

            <TouchableOpacity
              onPress={onIncrease}
              style={[styles.qtyBtn, disableIncrease && styles.disabledBtn]}
              disabled={disableIncrease}
            >
              <Text style={styles.qtyText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

export default RoomCard;

const createStyles = (colors: {
  background: string;
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
  availability:{
    marginTop: 6,
    fontSize: 12,
    color: colors.warning,
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth:0.6,
    borderColor: colors.border,
    margin: 16,
    padding: 16,
    borderRadius: 14,
    elevation: 2,
  },
  img: { width: 90, height: 90, borderRadius: 8, marginRight: 12 },
  title: { fontSize: 16, fontFamily:FONT_FAMILY.bold, color: colors.text  },
  price: { color: colors.success, marginVertical: 6 },
  dropdown: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    height: 40,
    paddingHorizontal: 10,
  },

  counterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  counter: {
    backgroundColor: colors.background,
    borderWidth:0.4,
    borderColor: colors.border,
    width: '33%',
    padding: 5,
    borderRadius: 8,
  },
  counterLabel: { fontSize: 12, color: colors.text },
  counterBtns: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginTop: 4,
  },
  disabledBtn: {
    opacity: 0.4,
  },

  counterBtn: { fontSize: 22, color: 'rgb(70, 130, 241)' },
  counterValue: { fontSize: 16, color: colors.text },
  guestBox: { marginTop: 12 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    height: 40,
    paddingHorizontal: 10,
    marginBottom: 8,
    color: colors.text,
  },

  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  qtyBtn: {
    backgroundColor: colors.secondary,
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyText: { color: colors.onPrimary, fontSize: 22 },
  qty: { marginHorizontal: 12, fontSize: 16,color: colors.text, },
  errorInput: {
    borderColor: colors.danger,
  },

  errorText: {
    color: colors.danger,
    fontSize: 11,
    marginBottom: 6,
  },
});

// import React, { useEffect } from 'react';
// import {
//   View,
//   Text,
//   TouchableOpacity,
//   StyleSheet,
//   Image,
//   TextInput,
//   LayoutAnimation,
//   KeyboardAvoidingView,
//   Platform,
// } from 'react-native';
// import {PUBLIC_URL} from '@env'
// import { Dropdown } from 'react-native-element-dropdown';

// interface Props {
//   room: any;
//   occupants: any[];
//   selectedRoom?: any;
//   selectedQty: number;
//   onIncrease: () => void;
//   onDecrease: () => void;
//   onOccupantChange: (occ: any) => void;
//   onGuestChange: (field: string, value: string) => void;
//   onAdultChange: (delta: number) => void;
//   onChildChange: (delta: number) => void;
// }

// const Counter = ({ label, value, onInc, onDec, min, max }) => {
//   const disableDec = value <= min;
//   const disableInc = value >= max;

//   return (
//     <View style={styles.counter}>
//       <Text style={styles.counterLabel}>{label}</Text>

//       <View style={styles.counterBtns}>
//         <TouchableOpacity
//           onPress={onDec}
//           disabled={disableDec}
//           style={disableDec && styles.disabledBtn}
//         >
//           <Text style={styles.counterBtn}>−</Text>
//         </TouchableOpacity>

//         <Text>{value}</Text>

//         <TouchableOpacity
//           onPress={onInc}
//           disabled={disableInc}
//           style={disableInc && styles.disabledBtn}
//         >
//           <Text style={styles.counterBtn}>+</Text>
//         </TouchableOpacity>
//       </View>
//     </View>
//   );
// };

// const Input = props => (
//   <TextInput {...props} style={styles.input} placeholderTextColor="#999" />
// );

// const RoomCard: React.FC<Props> = ({
//   room,
//   occupants,
//   selectedRoom,
//   onIncrease,
//   onDecrease,
//   onOccupantChange,
//   selectedQty,
//   onGuestChange,
//   onAdultChange,
//   onChildChange,
// }) => {
//   useEffect(() => {
//     LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
//   }, [selectedRoom?.occupantId]);

//   const showExtra = selectedRoom?.requiresGuestInfo;
//   const availableRooms = Number(room?.available_rooms ?? 0);
//   const disableIncrease = selectedQty >= availableRooms;
//   const disableDecrease = selectedQty <= 0;
//   return (
//     <KeyboardAvoidingView
//       behavior={Platform.OS === 'ios' ? 'padding' : undefined}
//     >
//       <View style={styles.card}>
//         {/* Header */}
//         <View style={{ flexDirection: 'row' }}>
//           <Image source={{ uri: `${PUBLIC_URL}${room.image }`}} style={styles.img} />
//           {/* <Image source={{ uri: 'https://st.hzcdn.com/simgs/23d10aba05948770_14-2874/home-design.jpg' }} style={styles.img} /> */}

//           <View style={{ flex: 1 }}>
//             <Text style={styles.title}>{room.name}</Text>

//             <Text style={styles.price}>
//               ₹ {selectedRoom?.totalPerNight ?? '—'} / night
//             </Text>
//             <Text style={{ fontSize: 12, color: '#777' }}>
//               Includes GST ({selectedRoom?.gstPer}%)
//             </Text>

//             <Text style={styles.availability}>
//               {availableRooms > 0
//                 ? `${availableRooms} room${availableRooms > 1 ? 's' : ''} left`
//                 : 'Sold out'}
//             </Text>
//             {/* Occupant */}
//             {selectedRoom && (
//           <Dropdown
//   style={styles.dropdown}
//   data={room.occupants}
//   labelField="name"
//   valueField="occupant_id"     // ✅ FIX
//   placeholder="Booked For"
//   value={selectedRoom?.occupantId}
//   onChange={onOccupantChange}
// />

//             )}
//           </View>
//         </View>

//         {/* Guest Info */}
//         {showExtra && (
//           <View style={styles.guestBox}>
//             <Input
//               placeholder="Guest Name"
//               value={selectedRoom.guestName}
//               onChangeText={v => onGuestChange('guestName', v)}
//               style={[
//                 styles.input,
//                 selectedRoom.errors?.guestName && styles.errorInput,
//               ]}
//             />
//             {selectedRoom.errors?.guestName && (
//               <Text style={styles.errorText}>
//                 {selectedRoom.errors.guestName}
//               </Text>
//             )}

//             <Input
//               placeholder="Guest Email"
//               keyboardType="email-address"
//               value={selectedRoom.guestEmail}
//               onChangeText={v => onGuestChange('guestEmail', v)}
//               style={[
//                 styles.input,
//                 selectedRoom.errors?.guestEmail && styles.errorInput,
//               ]}
//             />
//             {selectedRoom.errors?.guestEmail && (
//               <Text style={styles.errorText}>
//                 {selectedRoom.errors.guestEmail}
//               </Text>
//             )}

//             <Input
//               placeholder="Mobile Number"
//               keyboardType="number-pad"
//               maxLength={10}
//               value={selectedRoom.guestMobile}
//               onChangeText={v => onGuestChange('guestMobile', v)}
//               style={[
//                 styles.input,
//                 selectedRoom.errors?.guestMobile && styles.errorInput,
//               ]}
//             />
//             {selectedRoom.errors?.guestMobile && (
//               <Text style={styles.errorText}>
//                 {selectedRoom.errors.guestMobile}
//               </Text>
//             )}
//           </View>
//         )}

//         <View
//           style={[
//             styles.qtyRow,
//             { justifyContent: selectedRoom ? 'space-around' : 'flex-end' },
//           ]}
//         >
//           {selectedRoom && (
//             <>
//               <Counter
//                 label="Adults"
//                 value={selectedRoom.adults}
//                 min={1}
//                 max={room.max_adults}
//                 onInc={() => onAdultChange(1)}
//                 onDec={() => onAdultChange(-1)}
//               />

//               <Counter
//                 label="Children"
//                 value={selectedRoom.children}
//                 min={0}
//                 max={room.max_children}
//                 onInc={() => onChildChange(1)}
//                 onDec={() => onChildChange(-1)}
//               />
//             </>
//           )}
//           <View style={styles.qtyRow}>
//             <TouchableOpacity
//               onPress={onDecrease}
//               style={[styles.qtyBtn, disableDecrease && styles.disabledBtn]}
//               disabled={disableDecrease}
//             >
//               <Text style={styles.qtyText}>−</Text>
//             </TouchableOpacity>

//             <Text style={styles.qty}>{selectedQty}</Text>

//             <TouchableOpacity
//               onPress={onIncrease}
//               style={[styles.qtyBtn, disableIncrease && styles.disabledBtn]}
//               disabled={disableIncrease}
//             >
//               <Text style={styles.qtyText}>+</Text>
//             </TouchableOpacity>
//           </View>
//         </View>
//       </View>
//     </KeyboardAvoidingView>
//   );
// };

// export default RoomCard;
// const styles = StyleSheet.create({
//   card: {
//     backgroundColor: '#fff',
//     margin: 16,
//     padding: 16,
//     borderRadius: 14,
//     elevation: 2,
//   },
//   img: { width: 90, height: 90, borderRadius: 8, marginRight: 12 },
//   title: { fontSize: 16, fontWeight: '600' },
//   price: { color: '#1d4184ff', marginVertical: 6 },

//   dropdown: {
//     marginTop: 6,
//     borderWidth: 1,
//     borderColor: '#CCC',
//     borderRadius: 8,
//     height: 40,
//     paddingHorizontal: 10,
//   },

//   counterRow: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     marginTop: 12,
//   },
//   counter: {
//     backgroundColor: '#f0f0f0',
//     width: '33%',
//     padding: 5,
//     borderRadius: 8,
//   },
//   counterLabel: { fontSize: 12, color: '#777' },
//   counterBtns: {
//     flexDirection: 'row',
//     width: '100%',
//     justifyContent: 'space-around',
//     alignItems: 'center',
//     marginTop: 4,
//   },
//   disabledBtn: {
//     opacity: 0.4,
//   },

//   counterBtn: { fontSize: 22, color: '#1d4184ff' },

//   guestBox: { marginTop: 12 },
//   input: {
//     borderWidth: 1,
//     borderColor: '#CCC',
//     borderRadius: 8,
//     height: 40,
//     paddingHorizontal: 10,
//     marginBottom: 8,
//   },

//   qtyRow: {
//     flexDirection: 'row',
//     alignItems: 'center',

//     marginTop: 12,
//   },
//   qtyBtn: {
//     backgroundColor: '#1d4184ff',
//     width: 34,
//     height: 34,
//     borderRadius: 8,
//     alignItems: 'center',
//     justifyContent: 'center',
//   },
//   qtyText: { color: '#fff', fontSize: 22 },
//   qty: { marginHorizontal: 12, fontSize: 16 },
//   errorInput: {
//     borderColor: 'red',
//   },

//   errorText: {
//     color: 'red',
//     fontSize: 11,
//     marginBottom: 6,
//   },
// });