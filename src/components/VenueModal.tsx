import {
  StyleSheet,
  Text,
  View,
  Pressable,
  FlatList,
} from 'react-native';
import React from 'react';
import RNModal from 'react-native-modal';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { FONT_FAMILY, LIGHT_BLUE, SECONDARY_COLOR } from '../util/colors';
import UniversalModal from './UniversalModal';
import { useAppTheme } from '../theme/AppThemeProvider';
interface VenueModalProps {
  visible: boolean;
  onDismiss: () => void;
  venues?: any[];
  charge?: any;
}


const VenueModal:React.FC<VenueModalProps> = ({visible, onDismiss, venues, charge}) => {

  const {colors}=useAppTheme()
const InfoRow = ({icon, label, value, colors}) => (
  <View style={styles.row}>
    <View style={styles.left}>
      <Icon
        name={icon}
        size={18}
        color={colors.primary}
      />

      <Text
        style={[
          styles.label,
          {color: colors.text},
        ]}>
        {label}
      </Text>
    </View>

    <Text
      style={[
        styles.value,
        {color: colors.text},
      ]}>
      {value}
    </Text>
  </View>
);
  const totalAmount = venues.reduce(
  (sum, venue) => sum + (parseFloat(venue.totalWithGST) || 0),
  0,
);
  return (
    <UniversalModal
      visible={visible}
     
      setVisible={onDismiss}
    
      isFull={true}
      title="Venue Details">
 

        <FlatList
          data={venues || []}
          style={{flexGrow: 0}}
          renderItem={({item, index}) => (
            // <View style={styles.card}>
            //   <Text style={[styles.name, {fontFamily: FONT_FAMILY.normal}]}>
            //     Venue {index + 1}.
            //   </Text>
            //   <View
            //     style={{
            //       flexDirection: 'row',
            //       alignItems: 'center',
            //       justifyContent: 'space-between',
            //     }}>
            //     <Text style={styles.name}>{item?.name}</Text>
            //     <Text style={styles.name}>Charge:{Number(item?.rate).toFixed(2)}</Text>
            //   </View>
            //   <View
            //     style={{
            //       flexDirection: 'row',
            //       alignItems: 'center',
            //       justifyContent: 'space-between',
            //     }}>
            //     <Text style={styles.name}>
            //       {
            //         item.sessions?.find(
            //           session => session.id == item?.sessionID,
            //         )?.name
            //       }
            //     </Text>
            //     <Text style={styles.name}>
            //       GST({item.GSTper}):{' '}
            //       <Text style={{color: SECONDARY_COLOR}}>
            //         {(parseInt(item.GSTper) * parseInt(item.rate)/ 100).toFixed(2) }
            //       </Text>
            //     </Text>
            //   </View>
            //   <View
            //     style={{
            //       flexDirection: 'row',
            //       alignItems: 'center',
            //       justifyContent: 'space-between',
            //     }}>
            //     <Text style={styles.name}>
            //       Capacity:{' '}
            //       <Text style={{color: SECONDARY_COLOR}}>{item.capacity}</Text>
            //     </Text>
            //     <Text style={[styles.name]}>
            //       Security deposit:{' '}
            //       <Text style={{color: SECONDARY_COLOR}}>
            //         ₹{parseFloat(item.security_deposit).toFixed(2)}
            //       </Text>
            //     </Text>
            //   </View>
            // {item.clearing_charge&&  <Text
            //     style={[
            //       styles.name,
            //       {fontFamily: FONT_FAMILY.normal, alignSelf: 'flex-end'},
            //     ]}>
            //     Cleaning Charges:{' '}
            //     <Text
            //       style={{
            //         color: SECONDARY_COLOR,
            //         fontFamily: FONT_FAMILY.bold,
            //       }}>
            //       ₹{parseFloat(item.clearing_charge).toFixed(2)}
            //     </Text>
            //   </Text>}
            //   <Text
            //     style={[
            //       styles.name,
            //       {fontFamily: FONT_FAMILY.normal, alignSelf: 'flex-end'},
            //     ]}>
            //     Sub total:{' '}
            //     <Text
            //       style={{
            //         color: SECONDARY_COLOR,
            //         fontFamily: FONT_FAMILY.bold,
            //       }}>
            //       ₹{parseFloat(item.totalWithGST).toFixed(2)}
            //     </Text>
            //   </Text>
            // </View>

            <View
  style={[
    styles.card,
    {
      backgroundColor: colors.card,
      borderColor: colors.border,
    },
  ]}>
  <View style={styles.header}>
    <View>
      <Text style={[styles.title, {color: colors.text}]}>
        {item.name}
      </Text>

      <Text style={[styles.subtitle, {color: colors.text}]}>
        Venue {index + 1}
      </Text>
    </View>

    <Text style={styles.amount}>
      ₹{Number(item.rate).toFixed(2)}
    </Text>
  </View>

  <InfoRow
    icon="clock-outline"
    label="Session"
    value={
      item.sessions?.find(x => x.id == item.sessionID)?.name
    }
    colors={colors}
  />

  <InfoRow
    icon="account-group-outline"
    label="Capacity"
    value={item.capacity}
    colors={colors}
  />

  <InfoRow
    icon="cash-lock"
    label="Security Deposit"
    value={`₹${Number(item.security_deposit).toFixed(2)}`}
    colors={colors}
  />

  {!!item.clearing_charge && (
    <InfoRow
      icon="broom"
      label="Cleaning Charges"
      value={`₹${Number(item.clearing_charge).toFixed(2)}`}
      colors={colors}
    />
  )}

  <InfoRow
    icon="percent"
    label={`GST (${item.GSTper}%)`}
    value={`₹${(
      Number(item.rate) *
      Number(item.GSTper) /
      100
    ).toFixed(2)}`}
    colors={colors}
  />

  <View style={styles.divider} />

  <View style={styles.footer}>
    <Text
      style={[
        styles.subtotalLabel,
        {
          color: colors.text,
        },
      ]}>
      Sub Total
    </Text>

    <Text style={styles.totalAmount}>
      ₹{Number(item.totalWithGST).toFixed(2)}
    </Text>
  </View>
</View>
          )}
          keyExtractor={item => item?.id?.toString()}
        />

        <View>
          {venues.every(item => item.totalWithGST) && (
            // <View
            //   style={{
            //     margin: 10,
            //     padding: 10,
            //     borderRadius: 8,
            //     backgroundColor: LIGHT_BLUE,
            //     flexDirection: 'row',
            //     justifyContent: 'space-between',
            //   }}>
            //   <Text
            //     style={{
            //       color: 'black',
            //       fontFamily: FONT_FAMILY.bold,
            //     }}>
            //     Amount to be paid:
            //   </Text>
            //   <Text
            //     style={{
            //       color: SECONDARY_COLOR,
            //       fontFamily: FONT_FAMILY.bold,
            //     }}>
            //      ₹{totalAmount.toFixed(2)}
            //     {/* {venues
            //       ?.reduce((sum, venue) => {
            //         const rate = parseFloat(venue.rate) || 0;
            //         const gst = parseFloat(venue.GSTper) || 0;
            //         const surcharge = parseFloat(
            //           venue.security_deposit || venue.security_deposit || 0,
            //         );

            //         // Base + surcharge
            //         const baseTotal = rate + surcharge;

            //         // Apply GST
            //         const totalWithGST = baseTotal + (baseTotal * gst) / 100;

            //         return sum + totalWithGST;
            //       }, 0)
            //       .toFixed(2)} */}
            //   </Text>
            // </View>
            <View
  style={[
    styles.summary,
    {
      backgroundColor: colors.border,
    },
  ]}>
  <View>
    <Text
      style={[
        styles.summaryTitle,
        {color: colors.placeholder},
      ]}>
      Total Payable
    </Text>

    <Text
      style={[
        styles.summaryAmount,
        {color: colors.primary},
      ]}>
      ₹{totalAmount.toFixed(2)}
    </Text>
  </View>

  <Icon
    name="wallet"
    size={34}
    color={colors.primary}
  />
</View>
          )}
        </View>
    </UniversalModal>
  );
};

export default VenueModal;

const styles = StyleSheet.create({
  modalContent: {
    flex: 1,
    backgroundColor: 'white',

    borderRadius: 10,
  },
  name: {
    fontFamily: FONT_FAMILY.bold,
    color: 'black',
  },
  sessionText: {
    marginVertical: 10,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 5,
    backgroundColor: 'lightgray',
  },
  buttonText: {
    fontFamily: FONT_FAMILY.bold,
    color: 'black',
    marginLeft: 5,
  },
  input: {
    margin: 20,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: 'lightgray',
    padding: 10,
    color: 'black',
    fontFamily: FONT_FAMILY.normal,
  },
  itemContainerStyle: {
    color: 'grey',
  },
  itemTextStyle: {
    color: 'black',
    fontFamily: FONT_FAMILY.normal,
  },
  searchContainer: {
    margin: 10,
    marginHorizontal: 25,
  },
  placeholderStyle: {color: 'grey'},
  // card: {
  //   margin: 10,
  //   backgroundColor: '#f0f0f0',
  //   padding: 10,
  //   borderRadius: 10,
  // },
  card: {
    marginHorizontal:16,
    marginVertical:8,
    borderRadius:20,
    padding:18,
    borderWidth:1,
    // elevation:3,
},

header:{
    flexDirection:'row',
    justifyContent:'space-between',
    alignItems:'center',
    marginBottom:18,
  
},

title:{
    fontSize:18,
    fontFamily:FONT_FAMILY.bold,
},

subtitle:{
    marginTop:3,
    fontSize:13,
},

amount:{
    color:SECONDARY_COLOR,
    fontSize:18,
    fontFamily:FONT_FAMILY.bold,
},

row:{
    flexDirection:'row',
    justifyContent:'space-between',
    alignItems:'center',
    marginVertical:8,
    
},

left:{
    flexDirection:'row',
    alignItems:'center',
    flex:1,
},

label:{
    marginLeft:10,
    fontSize:14,
},

value:{
    fontFamily:FONT_FAMILY.bold,
    fontSize:14,
},

divider:{
    height:1,
    backgroundColor:'#DDD',
    marginVertical:16,
    
    
},

footer:{
    flexDirection:'row',
    justifyContent:'space-between',
    alignItems:'center',
    
    
},

subtotalLabel:{
    fontSize:15,
},

totalAmount:{
    color:'#16A34A',
    fontSize:20,
    fontFamily:FONT_FAMILY.bold,
    
},

summary:{
     
    margin:16,
    padding:20,
    borderRadius:18,
    flexDirection:'row',
    justifyContent:'space-between',
    alignItems:'center',
  
    
},

summaryTitle:{
    fontSize:15,
    
},

summaryAmount:{
    marginTop:6,
    fontSize:26,
    fontFamily:FONT_FAMILY.bold,
    
},
});

// import { StyleSheet, Text, View, FlatList } from 'react-native';
// import React from 'react';
// import { FONT_FAMILY, LIGHT_BLUE, SECONDARY_COLOR } from '../util/colors';
// import UniversalModal from './UniversalModal';
// import {
//   calculateBanquetAmounts,
//   calculateBanquetTotal,
//   formatAmount,
// } from '../util/banquetCalculations';
// interface VenueModalProps {
//   visible: boolean;
//   onDismiss: () => void;
//   venues?: any[];
// }

// const VenueModal: React.FC<VenueModalProps> = ({
//   visible,
//   onDismiss,
//   venues,
// }) => {
//   const venueRows = venues || [];
//   const totalAmount = calculateBanquetTotal(venueRows);
//   return (
//     <UniversalModal
//       visible={visible}
//       setVisible={onDismiss}
//       isFull={true}
//       title="Venue Details"
//     >
//       <FlatList
//         data={venueRows}
//         style={{ flexGrow: 0 }}
//         renderItem={({ item, index }) => {
//           const amounts = calculateBanquetAmounts(item);

//           return (
//             <View style={styles.card}>
//               <Text style={[styles.name, { fontFamily: FONT_FAMILY.normal }]}>
//                 Venue {index + 1}.
//               </Text>
//               <View
//                 style={{
//                   flexDirection: 'row',
//                   alignItems: 'center',
//                   justifyContent: 'space-between',
//                 }}
//               >
//                 <Text style={[styles.name, styles.flexText]}>{item?.name}</Text>
//                 <Text style={[styles.name, styles.amountText]}>
//                   Charge: ₹{formatAmount(amounts.rate)}
//                 </Text>
//               </View>
//               <View
//                 style={{
//                   flexDirection: 'row',
//                   alignItems: 'center',
//                   justifyContent: 'space-between',
//                 }}
//               >
//                 <Text style={[styles.name, styles.flexText]}>
//                   {
//                     item.sessions?.find(
//                       (session: any) => session.id == item?.sessionID,
//                     )?.name
//                   }
//                 </Text>
//                 <Text style={[styles.name, styles.amountText]}>
//                   GST({item.GSTper}):{' '}
//                   <Text style={{ color: SECONDARY_COLOR }}>
//                     ₹{formatAmount(amounts.gstAmount)}
//                   </Text>
//                 </Text>
//               </View>
//               <View
//                 style={{
//                   flexDirection: 'row',
//                   alignItems: 'center',
//                   justifyContent: 'space-between',
//                 }}
//               >
//                 <Text style={[styles.name, styles.flexText]}>
//                   Capacity:{' '}
//                   <Text style={{ color: SECONDARY_COLOR }}>
//                     {item.capacity}
//                   </Text>
//                 </Text>
//                 <Text style={[styles.name, styles.amountText]}>
//                   Security deposit:{' '}
//                   <Text style={{ color: SECONDARY_COLOR }}>
//                     ₹{formatAmount(amounts.securityDeposit)}
//                   </Text>
//                 </Text>
//               </View>
//               {amounts.clearingCharge > 0 && (
//                 <Text style={[styles.name, { alignSelf: 'flex-end' }]}>
//                   Clearing charge:{' '}
//                   <Text style={{ color: SECONDARY_COLOR }}>
//                     ₹{formatAmount(amounts.clearingCharge)}
//                   </Text>
//                 </Text>
//               )}
//               <Text
//                 style={[
//                   styles.name,
//                   { fontFamily: FONT_FAMILY.normal, alignSelf: 'flex-end' },
//                 ]}
//               >
//                 Sub total:{' '}
//                 <Text
//                   style={{
//                     color: SECONDARY_COLOR,
//                     fontFamily: FONT_FAMILY.bold,
//                   }}
//                 >
//                   ₹{formatAmount(amounts.totalWithGST)}
//                 </Text>
//               </Text>
//             </View>
//           );
//         }}
//         keyExtractor={(item, index) =>
//           item?.rowId?.toString() ?? `${item?.id}-${index}`
//         }
//       />

//       <View>
//         {venueRows.every(item => item.totalWithGST) && (
//           <View
//             style={{
//               margin: 10,
//               padding: 10,
//               borderRadius: 8,
//               backgroundColor: LIGHT_BLUE,
//               flexDirection: 'row',
//               justifyContent: 'space-between',
//             }}
//           >
//             <Text
//               style={{
//                 color: 'black',
//                 fontFamily: FONT_FAMILY.bold,
//               }}
//             >
//               Amount to be paid:
//             </Text>
//             <Text
//               style={{
//                 color: SECONDARY_COLOR,
//                 fontFamily: FONT_FAMILY.bold,
//               }}
//             >
//               ₹{formatAmount(totalAmount)}
//             </Text>
//           </View>
//         )}
//       </View>
//     </UniversalModal>
//   );
// };

// export default VenueModal;

// const styles = StyleSheet.create({
//   modalContent: {
//     flex: 1,
//     backgroundColor: 'white',

//     borderRadius: 10,
//   },
//   name: {
//     fontFamily: FONT_FAMILY.bold,
//     color: 'black',
//   },
//   flexText: {
//     flex: 1,
//     flexWrap: 'wrap',
//     marginRight: 8,
//   },
//   amountText: {
//     flexShrink: 0,
//     textAlign: 'right',
//   },
//   sessionText: {
//     marginVertical: 10,
//   },
//   button: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     padding: 10,
//     borderRadius: 5,
//     backgroundColor: 'lightgray',
//   },
//   buttonText: {
//     fontFamily: FONT_FAMILY.bold,
//     color: 'black',
//     marginLeft: 5,
//   },
//   input: {
//     margin: 20,
//     borderRadius: 5,
//     borderWidth: 1,
//     borderColor: 'lightgray',
//     padding: 10,
//     color: 'black',
//     fontFamily: FONT_FAMILY.normal,
//   },
//   itemContainerStyle: {
//     color: 'grey',
//   },
//   itemTextStyle: {
//     color: 'black',
//     fontFamily: FONT_FAMILY.normal,
//   },
//   searchContainer: {
//     margin: 10,
//     marginHorizontal: 25,
//   },
//   placeholderStyle: { color: 'grey' },
//   card: {
//     margin: 10,
//     backgroundColor: '#f0f0f0',
//     padding: 10,
//     borderRadius: 10,
//   },
// });
