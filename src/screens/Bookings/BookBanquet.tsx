
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
  FlatList,
  Modal,
  Pressable,
  KeyboardAvoidingView,
  LayoutAnimation,
  Alert,
} from 'react-native';
import React, {useState, useEffect} from 'react';
import Icons from "react-native-vector-icons/Ionicons";
import {useVenues} from '../../services/VenueService'
import moment from 'moment';
import {useSelector, } from 'react-redux';
import RenderHTML from 'react-native-render-html';
import Header from '../../components/Header';
import {Dropdown} from 'react-native-element-dropdown';
import NewButton from '../../components/Button';
import VenueModal from '../../components/VenueModal';
import { Toast } from 'react-native-toast-notifications';
import { CustomCheckbox } from '../../components/CustomCheckBox';
import CancelButton from '../../components/CancelButton';
import { FONT_FAMILY, SECONDARY_COLOR } from '../../util/colors';
import DatePickerComponent from '../../components/DatePickerFunc';
import { createShimmerPlaceholder } from 'react-native-shimmer-placeholder';
import LinearGradient from 'react-native-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppStackParamList } from '../../navigation/AppDrawer';
import { DOMAIN } from '../../util/constant';
import { useAppTheme } from '../../theme/AppThemeProvider';
import UniversalModal from '../../components/UniversalModal';

const ShimmerPlaceholder = createShimmerPlaceholder(LinearGradient);
type Props=NativeStackScreenProps<AppStackParamList,'BookBanquet'>

const BookingForm:React.FC<Props> = ({navigation}) => {
  const userData = useSelector(state => state.auth);
   const {colors} = useAppTheme();
    const styles = createStyles(colors);
  const [isloading, setisloading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
 const [venueModal, setVenueModal] = useState(false);
  const [occupantType, setOccupantType] = useState(null);
  const [Occupaint, setOccupaint] = useState([]);
  const [name, setName] = useState(userData?.user.DisplayName);

  const [Phone, setPhone] = useState(userData?.user.Mobile);

  const [Address, setAddress] = useState('');
  const [errors, setErrors] = useState({
    name: false,
    email: false,
    mobile: false,
    no_of_person: false,
    function_type: false,
    occupant: false,
    address: false,
  });
  const [Email, setEmail] = useState(userData?.user.Email);
  
  const [StartDate, setStartDate] = useState(
    moment()
      .add(data?.settings?.min_days ?? 3, 'days')
      .format('YYYY-MM-DD')
  );
   const {data, isLoading, error, refetch} = useVenues(
    userData.token,
    StartDate,
    occupantType?.id
  );
  const [FunctionType, setFunctionType] = useState('');
  const [Function, setFunction] = useState([]);


  const [Person, setPerson] = useState('');



  const [Venue, setvenue] = useState([]);
  const [Remark, setRemark] = useState('');
console.log( Venue, '---------------------- Venue ---------------------');
  const [charge, setCharge] = useState(1);

  const [rooms, setRooms] = useState([]);
  const {width} = useWindowDimensions();

  const [agree, setAgree] = useState(false);
 

  const resetForm = () => {
    setVenueList([
      {
        isDefault: true,
        sessions: [],
      },
    ]),
      setPerson('');
    setFunctionType('');
  };
  useEffect(() => {
    if (data?.success) {
      resetForm();
      setRooms(data.sop);
      if(data.sop && !agree){
        setModalVisible(true)
      }
      setOccupaint(data.occupants);
      if(!occupantType){
        setOccupantType(data.occupants.find(item => item.id == 1))
      }
      setFunction(data.functions);
        // setDate()
      setvenue(data.venues);
    }
  }, [data]);


  const handleInputChange = value => {
    // Check if the input is a valid number and if its length is less than or equal to 10
    if (!/^\d*$/.test(value) || value.length > 10) {
      if (value.length === 0) {
        // If the input is empty, reset the phone state
        setPhone('');
      }
      return; // Do not update the state if invalid
    }

    // Update phone state
    setPhone(value);
  };

  const handleNameChange = text => {
  
    setName(text);
  };
  const validateEmail = email => {
    
    const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
    return emailRegex.test(email);
  };
  const handleEmailChange = text => {
    setEmail(text);
  };

  const validatePhone = (phone) => {
    const regex = /^[6-9]\d{9}$/; // Indian format (adjust as needed)
    return regex.test(phone);
  };
  const validation = () => {
    Toast.hideAll();

    if (!occupantType || !occupantType?.id) {
      setErrors((prev) => ({ ...prev, occupant: true }));
      Toast.show("Please select a valid booking type.", { type: "danger" });
      return false;
    }

    if (!Person || Person <= 0) {
      setErrors((prev) => ({ ...prev, no_of_person: true }));
      Toast.show("Please enter a valid number of persons.", { type: "danger" });
      return false;
    }

    if (!FunctionType || !FunctionType.id) {
      setErrors((prev) => ({ ...prev, function_type: true }));
      Toast.show("Please select a function type.", { type: "danger" });
      return false;
    }

    if (occupantType?.additional_info === "Yes") {
      if (!Phone || !validatePhone(Phone)) {
        setErrors((prev) => ({ ...prev, mobile: true }));
        Toast.show("Please enter a valid mobile number.", { type: "danger" });
        return false;
      }

      if (!Email || !validateEmail(Email)) {
        setErrors((prev) => ({ ...prev, email: true }));
        Toast.show("Please enter a valid email address.", { type: "danger" });
        return false;
      }

      if (!Address || Address.trim().length < 5) {
        setErrors((prev) => ({ ...prev, address: true }));
        Toast.show("Please enter a valid address.", { type: "danger" });
        return false;
      }
      if (!name || name.trim().length < 5) {
        setErrors((prev) => ({ ...prev, name: true }));
        Toast.show("Please enter a valid name.", { type: "danger" });
        return false;
      }
    }

    return true;
  };
  const handleSubmit = () => {
    if (!agree) {
      alert('Please agree to Terms & Conditions');
      return;
    }
    if (validation()) {
      booking();
    } else {
    }
  };
  const [venueList, setVenueList] = useState([
    {
      id: '0', // Default item with fixed ID
      sessionName: '',
      sessionID: '',
      venueName: '',
      venueID: '',
      charge: '',
      gst: '',
      gst_per: '',
      securityDeposit: '',
        cleaningCharge: '',
      total: '',
      isDefault: true, // Marked to prevent deletion
    },
  ]);
  console.log( venueList, '---------------------- venueList ---------------------');
  // const addVenue = () => {
  //   const newVenue = {
  //     id: Date.now().toString(),
  //     sessionName: '',
  //     venueName: '',
  //     charge: '',
  //     gst: '',
  //     gst_per: '',
  //     securityDeposit: '',
  //     cleaningCharge:'',
  //     total: '',
  //     isDefault: false, // Not a default entry
  //   };
  //   setVenueList([...venueList, newVenue]);
  //   LayoutAnimation.configureNext({
  //     duration: 300,
  //     create: {
  //       type: LayoutAnimation.Types.linear,
  //       property: LayoutAnimation.Properties.opacity,
  //     },
  //   });
  // };
  const addVenue = () => {

  const availableVenues = Venue.filter(v => {

    const availableSessions = (v.sessions || []).filter(session => {

      return !venueList.some(selected => {

        const currentGroup =
          v.venue_charges?.find(
            c => String(c.session_id) === String(session.id)
          )?.venue_group_id;

        const selectedGroup =
          selected.venue_charges?.find(
            c => String(c.session_id) === String(selected.sessionID)
          )?.venue_group_id;

        return (
          String(currentGroup) === String(selectedGroup) &&
          String(selected.sessionID) === String(session.id)
        );

      });

    });

    return availableSessions.length > 0;

  });

  if (!availableVenues.length) {
    Toast.show('No more venues are available.', {
      type: 'warning',
    });
    return;
  }

  setVenueList(prev => [
    ...prev,
    {
      id: Date.now().toString(),
      isDefault: false,
      sessions: [],
    },
  ]);
};

  const removeVenue = (id,ind) => {
    setVenueList(venueList.filter((item,idx) => idx !== ind));
    LayoutAnimation.configureNext({
      duration: 300,
      create: {
        type: LayoutAnimation.Types.linear,
        property: LayoutAnimation.Properties.opacity,
      },
    });
  };
  const booking = () => {
  
    const isAnyVenueInvalid = venueList.some(item => parseFloat(item.capacity) < parseFloat(Person));

if (isAnyVenueInvalid) {
  setErrors(prev=>({...prev,no_of_person:true}))
  Toast.show('Each venue capacity must be greater than or equal to number of persons.', { type: 'danger' });
  return;
}
  
      if (!occupantType?.id) {
    Toast.show("Please select occupant type", { type: "danger" });
    return;
  }

  if (!userData?.user?.MemberID) {
    Toast.show("Invalid member details", { type: "danger" });
    return;
  }

 

 
  if (!StartDate) {
    Toast.show("Please select a function date", { type: "danger" });
    return;
  }

  if (!FunctionType?.id) {
    Toast.show("Please select a function type", { type: "danger" });
    return;
  }

  const personCount = parseInt(Person, 10);
  if (!Person || isNaN(personCount) || personCount <= 0) {
    Toast.show("Please enter a valid number of persons", { type: "danger" });
    return;
  }

  if (!venueList || venueList.length === 0) {
    Toast.show("Please select at least one venue", { type: "danger" });
    return;
  }
 // 🧮 Validate each venue’s data
 for (const item of venueList) {

  if (!item.id) {
    Toast.show("Please select a venue");
    return;
  }

  if (!item.sessionID) {
    Toast.show(`Please select session for ${item.name}`);
    return;
  }

  if (!item.rate || Number(item.rate) <= 0) {
    Toast.show(`${item.name} has invalid charges.`);
    return;
  }

}

    setisloading(true);
    const myHeaders = new Headers();
    myHeaders.append('Authorization', `Bearer ${userData.token}`);

    const formdata = new FormData();
    formdata.append('occupant_type', occupantType.id);
    formdata.append('memberID', userData?.user.MemberID);
    formdata.append('SC_ID', userData?.user.SC_ID);
    formdata.append('memberName', name||userData?.user.DisplayName);
    formdata.append('memberMobile', Phone||userData?.user.Mobile);
    formdata.append('memberEmail', Email||userData?.user.Email);
    formdata.append('address', Address);
    formdata.append('funDate', StartDate);
    formdata.append('functionType', FunctionType.id);
    formdata.append('noofPerson', Person);
    formdata.append('remark', Remark);
    venueList.forEach(item => {
        const selectedCharge = item.venue_charges?.find(
    charge => String(charge.session_id) === String(item.sessionID)
  );

     formdata.append(
    'venue_group_id[]',
    selectedCharge?.venue_group_id ?? ''
  );
      formdata.append('session_id[]', item.sessionID);
      formdata.append('vanue_id[]', item.id);
      // formdata.append('venue_group_id[]', item.sessions.venue_group_id);
      formdata.append('gst_amount[]', (item.GSTper*item.rate/100));
      formdata.append('gst_per[]', item.GSTper); // GST percentage calculation
      formdata.append('charges[]', item.rate);
      formdata.append('security_deposit[]', item.security_deposit);
      formdata.append('clearing_charge[]', item.clearing_charge);
      formdata.append('total[]', item.totalWithGST);
    });
 
    const requestOptions = {
      method: 'POST',
      headers: myHeaders,
      body: formdata,
      redirect: 'follow',
    };

    fetch(
      `${DOMAIN.BASE}member/banquet/store`,
      requestOptions,
    )
      .then(response => response.json())
      .then(async json => {
      setisloading(false);
        console.log( json, '---------------------- json ---------------------');
        if (json && json.data && json.data) {
          navigation.navigate('UniversalPayment', {
            orderData: json.data,
            type: 'Banquet Booking',
          });
            Toast.show(json.message);
         resetForm()
       
        } else {
          // setisLoading(false)
          setisloading(false);
          Alert.alert(json.message);

          console.log('API Failed');
        }
      })
      .catch(error => {
        setisloading(false);
        console.error(error);
      });
  };


//   const session_type = (id, item) => {
//  const updatedList = venueList.map(value => {
//   let charge = value.venue_charges.find(
//     i => i.session_id == item.id && i.occupant_id == occupantType?.id,
//   );
//  if (charge) {
//     const rate = parseFloat(charge.rate) || 0;
//     const gst = parseFloat(value.GSTper) || 0;
//     const security_deposite = parseFloat(value.security_deposit) || 0;
//     const clearing_charge = parseFloat(value.clearing_charge) || 0;
//     const totalWithGST = clearing_charge+security_deposite+rate + (rate * gst) / 100;

//     return value.id === id
//       ? {
//           ...value,
//           sessionID: item.id,
//           rate: rate,
//           totalWithGST: totalWithGST.toFixed(2),
//         }
//       : {
//           ...value,
//           rate: rate,
//           totalWithGST: totalWithGST.toFixed(2),
//         };

//   }

//   Alert.alert('Venue is not available');
//   return value;
// });

// setVenueList(updatedList);
// const totalAmount = updatedList.reduce((sum, venue) => {
//   const rate = parseFloat(venue.rate) || 0;
//   const gst = parseFloat(venue.GSTper) || 0;
//   const surcharge = parseFloat(venue.security_deposit || 0);
//   const clearing_charge = parseFloat(venue.clearing_charge || 0);

//   // Base + surcharge
//   const baseTotal = rate ;

//   // Apply GST
//   const totalWithGST = baseTotal + (baseTotal * gst) / 100 + surcharge +clearing_charge;

//   return sum + totalWithGST;
// }, 0);
// setCharge(totalAmount)
//   };
const session_type = (rowIndex, session) => {

  setVenueList(prev => {

    let updated = prev.map((item, i) => {

      if (i !== rowIndex) {
        return item;
      }

      const charge = item.venue_charges.find(
        c =>
          String(c.session_id) === String(session.id) &&
          String(c.occupant_id) === String(occupantType.id),
      );

      if (!charge) {
        return item;
      }
console.log( item, '---------------------- item ---------------------');
   const rate = Number(charge.rate);
const gstPer = Number(item.GSTper);
const security = Number(item.security_deposit || 0);
const cleaning = Number(item.clearing_charge || 0);

const gstAmount = +(rate * gstPer / 100).toFixed(2);

const total =
rate +
gstAmount +
security +
cleaning;
      return {
        ...item,
        sessionID: session.id,
       rate,

    gstAmount,

    security,

    cleaning,

    totalWithGST: total.toFixed(2),
      };
    });

const totalCharge = updated.reduce((sum, item) => {

    return sum + Number(item.totalWithGST || 0);

}, 0);

setCharge(totalCharge);

return updated;

  });

};
const Venue_type = (index, newVenue) => {
  setVenueList(prev => {

    const currentGroup =
      newVenue.venue_charges?.[0]?.venue_group_id ?? null;

    let updated = prev.map((item, i) => {

      if (i !== index) {
        return item;
      }

      // return {
      //   ...newVenue,
      //   isDefault: item.isDefault,

      //   sessionID: '',
      //   rate: '',
      //   totalWithGST: '',
      //   GSTper: '',
      //   security_deposit: '',
      //   clearing_charge: '',
      // };
      return {
    ...newVenue,

    isDefault: item.isDefault,

    sessionID: '',

    rate: '',

    gstAmount: 0,

    security: 0,

    cleaning: 0,

    totalWithGST: '',
};
    });

  updated = updated.filter(item => {

    if (item.isDefault) return true;

    const availableSessions = (item.sessions || []).filter(session => {

        return !updated.some(other => {

            if (other === item) return false;

            const currentGroup =
                item.venue_charges?.find(
                    c => String(c.session_id) === String(session.id)
                )?.venue_group_id;

            const selectedGroup =
                other.venue_charges?.find(
                    c => String(c.session_id) === String(other.sessionID)
                )?.venue_group_id;

            return (
                String(currentGroup) === String(selectedGroup) &&
                String(other.sessionID) === String(session.id)
            );

        });

    });

    return availableSessions.length > 0;

});

    return updated;
  });
};

  return (
    <View style={styles.container}>
      <Header title={'Book Your Venue'}></Header>
      <KeyboardAvoidingView
        behavior="padding"
        style={{flex: 1}}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 20}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          style={styles.innercontainer}
          showsVerticalScrollIndicator={false}>
          <Text style={styles.text}>
            Booking For<Text style={{color: 'red'}}> *</Text>
          </Text>
          <Dropdown
            style={[styles.dropdown]}
            placeholderStyle={styles.placeholderStyle}
            selectedTextStyle={styles.selectedTextStyle}
            containerStyle={{
              borderRadius: 10,
            }}
            itemTextStyle={[styles.itemContainerStyle, {color: 'black'}]}
            renderItem={item => {
              const isSelected = item.id === occupantType?.id;
              return (
                <View
                  style={[
                    styles.itemContainer,
                    {
                      backgroundColor: 'white',
                      borderWidth: isSelected ? 1 : 0,
                      borderColor: SECONDARY_COLOR,
                      borderRadius: 10,
                    },
                  ]}>
                  <Text
                    style={{
                      color: 'black',
                      padding: 6,
                      fontFamily: isSelected
                        ? FONT_FAMILY.bold
                        : FONT_FAMILY.light,
                    }}>
                    {item.name}
                  </Text>
                </View>
              );
            }}
            iconStyle={styles.iconStyle}
            data={Occupaint}
            maxHeight={300}
            labelField="name"
            valueField="id"
            placeholder={'Select Occupant Type'}
            value={occupantType?.id ?? 0}
            onChange={item => {
              LayoutAnimation.configureNext({
                duration: 300,
                create: {
                  type: LayoutAnimation.Types.linear,
                  property: LayoutAnimation.Properties.opacity,
                },
                delete: {
                  type: LayoutAnimation.Types.linear,
                  property: LayoutAnimation.Properties.opacity,
                },
                update: {
                  type: LayoutAnimation.Types.linear,
                  property: LayoutAnimation.Properties.opacity,
                },
              });
              if (item.additional_info == 'No') {
                setEmail('');
                setAddress('');
                setName('');
                setPhone('');
              }
              setOccupantType(item);
            }}
          />
          {occupantType?.additional_info == 'Yes' && (
            <View style={{flex: 1}}>
              <Text style={styles.text}>
                Name<Text style={{color: 'red'}}> *</Text>
              </Text>

              <TextInput
                placeholderTextColor="#858585"
                style={[
                  styles.textinput,
                  {borderColor: errors.name ? 'red' :colors.border},
                ]}
                value={name}
                placeholder="Enter Your Name"
                onChangeText={handleNameChange}
              />
              <Text style={styles.text}>
                Mobile No.<Text style={{color: 'red'}}> *</Text>
              </Text>
              <TextInput
                placeholderTextColor="#858585"
                style={[
                  styles.textinput,
                  {borderColor: errors.mobile ? 'red' : colors.border},
                ]}
                value={Phone}
                maxLength={10}
                placeholder="Enter Your Mobile No."
                keyboardType="numeric"
                onChangeText={handleInputChange}
              />
              <Text style={styles.text}>
                Email ID<Text style={{color: 'red'}}> *</Text>
              </Text>
              <TextInput
                placeholderTextColor="#858585"
                style={[
                  styles.textinput,
                  {borderColor: errors.email ? 'red' : colors.border},
                ]}
                maxLength={80}
                value={Email}
                placeholder="Enter Your Email ID"
                // onChangeText={handleNameChange}

                onChangeText={handleEmailChange}
              />
              <Text style={styles.text}>Address</Text>
              <TextInput
                placeholderTextColor="grey"
                style={[
                  styles.textinput,
                  {borderColor: errors.address ? 'red' : colors.border},
                ]}
                value={Address}
                maxLength={100}
                placeholder="Enter Your Address"
                onChangeText={text => {
                  setAddress(text);
                  if (errors.address) {
                    setErrors(prev => ({...prev, address: false}));
                  }
                }}
              />
            </View>
          )}

          <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
            <View style={{flex: 1, marginRight: 10}}>
              <Text style={styles.text}>
                Function Date<Text style={{color: 'red'}}> *</Text>
              </Text>
<DatePickerComponent
                stateDate={setStartDate}
                placeholder={moment(StartDate).format('DD-MMM-YY')}
                maxDate={moment()
                    .add(data?.settings?.max_days ?? 50, 'days')
                    .toDate()}
                    minDate={moment()
                    .add(data?.settings?.min_days ?? 3, 'days')
                    .toDate()}
                    

                />
          
            </View>
            <View style={{flex: 1, marginLeft: 10}}>
              <Text style={styles.text}>
                Function Type<Text style={{color: 'red'}}> *</Text>
              </Text>
              <Dropdown
                style={[
                  styles.dropdown,
                  {borderColor: errors.function_type ? 'red' : colors.border},
                ]}
                placeholderStyle={styles.placeholderStyle}
                selectedTextStyle={styles.selectedTextStyle}
                containerStyle={{
                  backgroundColor: '#f0f0f0',
                  borderRadius: 10,
                }}
                itemTextStyle={[styles.itemContainerStyle, {color: 'black'}]}
                renderItem={item => {
                  const isSelected = item.id === FunctionType.id;
                  return (
                    <View
                      style={[
                        styles.itemContainer,
                        {
                          backgroundColor: 'white',
                          borderWidth: isSelected ? 1 : 0,
                          borderColor: SECONDARY_COLOR,
                          borderRadius: 10,
                        },
                      ]}>
                      <Text
                        style={{
                          color: 'black',
                          padding: 6,
                          fontFamily: isSelected
                            ? FONT_FAMILY.bold
                            : FONT_FAMILY.light,
                        }}>
                        {item.name}
                      </Text>
                    </View>
                  );
                }}
                iconStyle={styles.iconStyle}
                data={Function}
                maxHeight={300}
                labelField="name"
                valueField="id"
                placeholder={'Function Type'}
                value={FunctionType.id ?? 0}
                onChange={item => {
                  if (errors.function_type) {
                    setErrors(prev => ({...prev, function_type: false}));
                  }
                  LayoutAnimation.configureNext({
                    duration: 300,
                    update: {
                      type: LayoutAnimation.Types.easeOut,
                      property: LayoutAnimation.Properties.opacity,
                    },
                  });

                  setFunctionType(item);
                }}
              />
            </View>
          </View>

          <Text style={styles.text}>
            No. of Persons<Text style={{color: 'red'}}> *</Text>
          </Text>

          <TextInput
            placeholderTextColor="#858585"
            style={[
              styles.textinput,
              {borderColor: errors.no_of_person ? 'red' : colors.border},
            ]}
            value={Person}
            placeholder="No. of Persons"
            keyboardType="numeric"
            returnKeyType='done'
          
            onChangeText={text =>[ setPerson(text),setErrors(prev=>({...prev,no_of_person:false}))]}
          />

          <View
            style={{
              backgroundColor: colors.surface,
              padding: 10,
              borderRadius: 10,
              borderColor: errors.box ? 'red' : colors.border,
              borderWidth: 1,
              marginVertical: 20,
            }}>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
              <Text style={[styles.text, {color: colors.text}]}>Venue Details</Text>

              <Pressable
                onPress={addVenue}
                style={{
                  padding: 5,
                  paddingHorizontal: 10,
                  borderRadius: 5,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}>
                <Text style={{color: colors.text}}>Add Venue</Text>
              </Pressable>
            </View>
           
            {!isLoading ? venueList.map((venue, index) => (
              <View key={`${venue.id}-${index}`} style={styles.venueContainer}>
                <View>
                  <Text style={styles.text}>Venue</Text>
                  <Dropdown
                    style={[styles.dropdown]}
                    disable={!!errors.no_of_person}
                    placeholderStyle={styles.placeholderStyle}
                    selectedTextStyle={styles.selectedTextStyle}
                    containerStyle={{
                      backgroundColor: '#f0f0f0',
                      borderRadius: 10,
                    }}
                    itemTextStyle={[
                      styles.itemContainerStyle,
                      {color: 'black'},
                    ]}
                    renderItem={item => {
                     const isSelected =
    String(item.id) === String(venue.sessionID);
                      return (
                        <View
                          style={[
                            styles.itemContainer,
                            {
                              backgroundColor: 'white',
                              borderWidth: isSelected ? 1 : 0,
                              borderColor: SECONDARY_COLOR,
                              borderRadius: 10,
                            },
                          ]}>
                          <Text
                            style={{
                              color: 'black',
                              padding: 6,
                              fontFamily: isSelected
                                ? FONT_FAMILY.bold
                                : FONT_FAMILY.light,
                            }}>
                            {item.name} (Capacity:{item.capacity})
                          </Text>
                        </View>
                      );
                    }}
                    iconStyle={styles.iconStyle}
             data={Venue}

                    maxHeight={300}
                    labelField="name"
                    valueField="id"
                    placeholder={'Select Venue'}
                    value={venue.id ?? 0}
                    onChange={item => {
                      Venue_type(index, item);
                    }}
                  />
                </View>
                <View
                  style={
                    {
                     
                    }
                  }>
                  <View>
                    <Text style={styles.text}>Session</Text>
                    <Dropdown
                      style={[styles.dropdown]}
                      placeholderStyle={styles.placeholderStyle}
                      selectedTextStyle={styles.selectedTextStyle}
                      disable={!!errors.no_of_person}
                      containerStyle={{
                        backgroundColor: '#f0f0f0',
                        borderRadius: 10,
                      }}
                      // data={venue.sessions || []}
                     data={(venue.sessions || []).filter(session => {

  return !venueList.some((v, i) => {

    if (i === index) return false;

    const currentGroup =
      venue.venue_charges?.find(
        x => String(x.session_id) === String(session.id)
      )?.venue_group_id;

    const selectedGroup =
      v.venue_charges?.find(
        x => String(x.session_id) === String(v.sessionID)
      )?.venue_group_id;

    return (
      String(currentGroup) === String(selectedGroup) &&
      String(v.sessionID) === String(session.id)
    );

  });

})}
                      itemTextStyle={[
                        styles.itemContainerStyle,
                        {color: 'black'},
                      ]}
                      renderItem={item => {
                        const isSelected = item.id === venue.sessionID;
                        console.log( item,venue, '---------------------- item ---------------------');
                        return (
                          <View
                            style={[
                              styles.itemContainer,
                              {
                                backgroundColor: 'white',
                                borderWidth: isSelected ? 1 : 0,
                                borderColor: SECONDARY_COLOR,
                                borderRadius: 10,
                              },
                            ]}>
                            <Text
                              style={{
                                color: 'black',
                                padding: 6,
                                fontFamily: isSelected
                                  ? FONT_FAMILY.bold
                                  : FONT_FAMILY.light,
                              }}>
                              {item.name}
                            </Text>
                          </View>
                        );
                      }}
                      iconStyle={styles.iconStyle}
                      maxHeight={300}
                      labelField="name"
                      valueField="id"
                      placeholder={'Select Session'}
                      value={venue.sessionID ?? 0}
                      // onChange={item => {
                      //   session_type(venue.id, item);
                      // }}
                      onChange={item => {
    session_type(index, item);
}}
                    />
                  </View>

             
              {venue?.rate && (
  <View
    style={{
      marginTop: 14,
      padding: 14,
      borderRadius: 16,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 12,
    }}>

    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
      }}>
      <Text
        style={{
          color: colors.placeholder,
          fontFamily: FONT_FAMILY.normal,
        }}>
        Amount
      </Text>

      <Text
        style={{
          color: colors.text,
          fontFamily: FONT_FAMILY.semiBold,
        }}>
        ₹{Number(venue.rate).toFixed(2)}
      </Text>
    </View>

    {venue?.gstAmount > 0 && (
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
        }}>
        <Text
          style={{
            color: colors.placeholder,
            fontFamily: FONT_FAMILY.normal,
          }}>
          GST ({venue.GSTper}%)
        </Text>

        <Text
          style={{
            color: SECONDARY_COLOR,
            fontFamily: FONT_FAMILY.semiBold,
          }}>
          ₹
          ₹{Number(venue.gstAmount).toFixed(2)}
        </Text>
      </View>
    )}

    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
      }}>
      <Text
        style={{
          color: colors.placeholder,
          fontFamily: FONT_FAMILY.normal,
        }}>
        Capacity
      </Text>

      <Text
        style={{
          color: colors.text,
          fontFamily: FONT_FAMILY.semiBold,
        }}>
        {venue.capacity}
      </Text>
    </View>

    {Number(venue.security) > 0 && (
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
        }}>
        <Text
          style={{
            color: colors.placeholder,
            fontFamily: FONT_FAMILY.normal,
          }}>
          Security Deposit
        </Text>

        <Text
          style={{
            color: SECONDARY_COLOR,
            fontFamily: FONT_FAMILY.semiBold,
          }}>
          ₹{Number(venue.security).toFixed(2)}
        </Text>
      </View>
    )}

    {Number(venue.cleaning) > 0 && (
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
        }}>
        <Text
          style={{
            color: colors.placeholder,
            fontFamily: FONT_FAMILY.normal,
          }}>
          Cleaning Charge
        </Text>

        <Text
          style={{
            color: SECONDARY_COLOR,
            fontFamily: FONT_FAMILY.semiBold,
          }}>
          ₹{Number(venue.cleaning).toFixed(2)}
        </Text>
      </View>
    )}

    <View
      style={{
        height: 1,
        backgroundColor: colors.border,
        marginVertical: 4,
      }}
    />

    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
      <Text
        style={{
          color: colors.text,
          fontSize: 16,
          fontFamily: FONT_FAMILY.bold,
        }}>
        Sub Total
      </Text>

      <Text
        style={{
          color: SECONDARY_COLOR,
          fontSize: 18,
          fontFamily: FONT_FAMILY.bold,
        }}>
        ₹{Number(venue.totalWithGST).toFixed(2)}
      </Text>
    </View>
  </View>
)}
                </View>
                {!venue.isDefault && (
                  <View style={{marginTop: 8}}>
                    <CancelButton
                      text={'Remove'}
                      onPress={() => removeVenue(venue, index)}
                    />
                  </View>
                )}
              </View>
            )):(
              
                  <FlatList
                    data={[1, ]}
                    renderItem={() => (
                      <View
                        style={[ { marginHorizontal: 10, borderRadius: 20 }]}>

                         
                          <View style={{ flex: 1, alignItems: "flex-start", }}>
                              <ShimmerPlaceholder width={100} style={{ margin: 5 }}/>
                            
                            <ShimmerPlaceholder width={300} style={{ margin: 5 ,height:50}} />
                           
                              <ShimmerPlaceholder width={100} style={{ margin: 5 }} />
                            <ShimmerPlaceholder width={300} style={{ margin: 5 ,height:50}} />
                        
                        </View>
                      </View>
                    )}
                  />
              
            )}
         
          </View>

          <Text style={styles.text}>Remark</Text>

          <TextInput
            placeholderTextColor="#858585"
            style={styles.textinput}
            placeholder="Remark"
            value={Remark}
            maxLength={80}
            onSubmitEditing={() => setModalVisible(true)}
            onChangeText={text => setRemark(text)}
          />

        
        
           {charge && (
            <View>
              <TouchableOpacity
                onPress={() => {
                  setModalVisible(true);
                }}
                style={{
                  alignItems: "center",
                  flexDirection: "row",
                  marginVertical: 20,
                }}
              >
                <CustomCheckbox
                  onToggle={() => setAgree((prev) => !prev)}
                  checked={agree}
                  color={SECONDARY_COLOR}
                />

                <Text
                  style={{
                    fontSize: 15,
                    color: "#484C52",
                    fontFamily: FONT_FAMILY.bold,
                  }}
                >
                  I agree{" "}
                  <Text
                    style={{ textDecorationLine: "underline", color: "blue" }}
                  >
                    Terms & Conditions
                  </Text>
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    
         <UniversalModal 
         visible={modalVisible}
         setVisible={setModalVisible}
         isFull={true}
         title={'Terms & Conditions'}
         >
      
        <ScrollView contentContainerStyle={{ }}>
          <RenderHTML
            source={{ html: rooms?.content }}
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
            onPress={(isChecked) => {
              setAgree(isChecked), setModalVisible(false);
            }}
          />
        </View>
 </UniversalModal>
       <VenueModal
        visible={venueModal}
        onDismiss={() => setVenueModal(false)}
        venues={venueList}
        charge={charge}
      />
         {venueList.every((item) =>item.totalWithGST) && venueList.every((item) => item?.id && item?.sessionID) && (
          <View style={{  marginBottom: 20, marginHorizontal: 20 }}>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              
              }}
            >
              <Pressable onPress={() => setVenueModal(true)}>
                <Text style={styles.selectedTextStyle}>Total</Text>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Text style={styles.selectedTextStyle}>
                    {venueList.length} Venue
                  </Text>
                  <Icons name="caret-up-outline" size={20} color={colors.text} />
                </View>
              </Pressable>

              <NewButton
                onPress={handleSubmit}
                loading={isloading}
                text={`Pay ₹${charge.toFixed(2)}`}
              />
            </View>
          </View>
        )}
      
    
    </View>
  );
};
const createStyles = (colors) =>  StyleSheet.create({
 

 
  
  activeInputContainer1: {
    borderColor: 'green',
    borderWidth: 1,
    backgroundColor: '#ffffff',
    width: '100%',
    height: 100,
    padding: 10,
    borderRadius: 5,
    marginBottom: '4%',
    justifyContent: 'center',
    paddingHorizontal: '3%',
    alignItems: 'center',
  },
  MbuttonText1: {
    color: colors.text,
    fontSize: 17,
    textAlign: 'center',
    fontFamily: 'Poppins-Bold',
    fontWeight: '600',
  },
  Mbutton1: {
    marginVertical: '5%',
    marginBottom: '15%',
    borderRadius: 5,
    width: '95%',
    justifyContent: 'center',
    alignSelf: 'center',
    color: colors.text,
    backgroundColor: '#7AC915',
    paddingVertical: '3%',
  },
  errorText: {
    color: '#F60000',
    fontSize: 14,
    marginVertical: 8,
    marginLeft: '1%',
  },
  headerButton: {
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.primary,
    padding: 5,
    marginRight: 10,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  venueContainer: {
    borderBottomWidth: 1,
    padding: 10,
    borderRadius: 6,
    borderColor: colors.border,
    backgroundColor: colors.card,
    marginTop: 10,
  },
  text: {
    marginVertical: 10,
    fontSize: 13,
    color: colors.text,
    fontFamily: FONT_FAMILY.bold,
  },
  innercontainer: {
    margin: 20,
  },
  textinput: {
    fontSize: 15,
    color: colors.text,
    borderRadius: 10,
    fontFamily: FONT_FAMILY.normal,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    padding: 10,
    
  },
  dropdown: {
    backgroundColor: colors.surface,
    padding: 10,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
      borderColor: colors.border,
  },
  placeholderStyle: {
    color: colors.text,
    fontFamily: FONT_FAMILY.normal,
    
  },
  selectedTextStyle: {color: colors.text, fontFamily: FONT_FAMILY.normal,},
  itemContainerStyle: {color: colors.text, fontFamily: FONT_FAMILY.normal},
  itemContainer: {
    paddingVertical: 10,
    paddingHorizontal: 15,
     
  },
});
export default BookingForm;


// import {
//   View,
//   Text,
//   StyleSheet,
//   TextInput,
//   ScrollView,
//   TouchableOpacity,
//   useWindowDimensions,
//   FlatList,
//   Pressable,
//   KeyboardAvoidingView,
//   LayoutAnimation,
//   Alert,
//   Platform,
// } from 'react-native';
// import React, { useState, useEffect } from 'react';
// import Icons from 'react-native-vector-icons/Ionicons';
// import { useVenues } from '../../services/VenueService';
// import moment from 'moment';
// import { useSelector } from 'react-redux';
// import RenderHTML from 'react-native-render-html';
// import Header from '../../components/Header';
// import { Dropdown } from 'react-native-element-dropdown';
// import NewButton from '../../components/Button';
// import VenueModal from '../../components/VenueModal';
// import { Toast } from 'react-native-toast-notifications';
// import { CustomCheckbox } from '../../components/CustomCheckBox';
// import CancelButton from '../../components/CancelButton';
// import { FONT_FAMILY, SECONDARY_COLOR } from '../../util/colors';
// import DatePickerComponent from '../../components/DatePickerFunc';
// import { createShimmerPlaceholder } from 'react-native-shimmer-placeholder';
// import LinearGradient from 'react-native-linear-gradient';
// import { NativeStackScreenProps } from '@react-navigation/native-stack';
// import { AppStackParamList } from '../../navigation/AppDrawer';
// import { DOMAIN } from '../../util/constant';
// import { useAppTheme } from '../../theme/AppThemeProvider';
// import UniversalModal from '../../components/UniversalModal';
// import {
//   applyBanquetSessionCharge,
//   calculateBanquetAmounts,
//   calculateBanquetTotal,
//   formatAmount,
//   getBanquetVenueGroupId,
//   hasSelectedVenue,
//   toAmount,
// } from '../../util/banquetCalculations';

// const ShimmerPlaceholder = createShimmerPlaceholder(LinearGradient);
// type Props = NativeStackScreenProps<AppStackParamList, 'BookBanquet'>;

// const emptyErrors = {
//   name: false,
//   email: false,
//   mobile: false,
//   no_of_person: false,
//   function_type: false,
//   occupant: false,
//   address: false,
//   box: false,
// };

// const createVenueRow = (isDefault = false) => ({
//   rowId: isDefault ? 'default-venue' : `venue-${Date.now()}`,
//   id: '0',
//   sessionName: '',
//   sessionID: '',
//   venueName: '',
//   venueID: '',
//   charge: '',
//   gst: '',
//   gst_per: '',
//   gstAmount: '',
//   securityDeposit: '',
//   clearingCharge: '',
//   total: '',
//   rate: '',
//   totalWithGST: '',
//   sessions: [],
//   isDefault,
// });

// const BookingForm: React.FC<Props> = ({ navigation }) => {
//   const userData = useSelector((state: any) => state.auth);
//   const { colors } = useAppTheme();
//   const styles = createStyles(colors);
//   const [isloading, setisloading] = useState(false);
//   const [modalVisible, setModalVisible] = useState(false);
//   const [venueModal, setVenueModal] = useState(false);
//   const [occupantType, setOccupantType] = useState<any>(null);
//   const [Occupaint, setOccupaint] = useState<any[]>([]);
//   const [name, setName] = useState(userData?.user.DisplayName);

//   const [Phone, setPhone] = useState(userData?.user.Mobile);

//   const [Address, setAddress] = useState('');
//   const [errors, setErrors] = useState(emptyErrors);
//   const [Email, setEmail] = useState(userData?.user.Email);

//   const [StartDate, setStartDate] = useState(
//     moment().add(3, 'days').format('YYYY-MM-DD'),
//   );
//   const { data, isLoading, error, refetch } = useVenues(
//     userData.token,
//     StartDate,
//     occupantType?.id,
//   );
//   const [FunctionType, setFunctionType] = useState<any>(null);
//   const [Function, setFunction] = useState<any[]>([]);

//   const [Person, setPerson] = useState('');

//   const [Venue, setvenue] = useState<any[]>([]);
//   const [Remark, setRemark] = useState('');

//   const [rooms, setRooms] = useState<any>(null);
//   const { width } = useWindowDimensions();

//   const [agree, setAgree] = useState(false);

//   const resetForm = () => {
//     setVenueList([createVenueRow(true)]);
//     setPerson('');
//     setFunctionType(null);
//     setErrors(emptyErrors);
//   };
//   useEffect(() => {
//     if (data?.success) {
//       resetForm();
//       setRooms(data.sop);
//       if (data.sop && !agree) {
//         setModalVisible(true);
//       }
//       setOccupaint(data.occupants);
//       if (!occupantType) {
//         setOccupantType(data.occupants.find((item: any) => item.id == 1));
//       }
//       setFunction(data.functions);
//       // setDate()
//       setvenue(data.venues);
//     }
//   }, [data]);

//   const handleInputChange = (value: string) => {
//     // Check if the input is a valid number and if its length is less than or equal to 10
//     if (!/^\d*$/.test(value) || value.length > 10) {
//       if (value.length === 0) {
//         // If the input is empty, reset the phone state
//         setPhone('');
//       }
//       return; // Do not update the state if invalid
//     }

//     // Update phone state
//     setPhone(value);
//   };

//   const handleNameChange = (text: string) => {
//     setName(text);
//   };
//   const validateEmail = (email: string) => {
//     const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
//     return emailRegex.test(email);
//   };
//   const handleEmailChange = (text: string) => {
//     setEmail(text);
//   };

//   const validatePhone = (phone: string) => {
//     const regex = /^[6-9]\d{9}$/; // Indian format (adjust as needed)
//     return regex.test(phone);
//   };
//   const showValidationError = (
//     field: keyof typeof emptyErrors | null,
//     message: string,
//   ) => {
//     if (field) {
//       setErrors(prev => ({ ...prev, [field]: true }));
//     }
//     Toast.show(message, { type: 'danger' });
//     return false;
//   };

//   const validateGuestDetails = () => {
//     Toast.hideAll();
//     setErrors(emptyErrors);

//     if (!occupantType || !occupantType?.id) {
//       return showValidationError(
//         'occupant',
//         'Please select a valid booking type.',
//       );
//     }

//     if (!StartDate) {
//       return showValidationError(null, 'Please select a function date.');
//     }

//     if (!FunctionType || !FunctionType.id) {
//       return showValidationError(
//         'function_type',
//         'Please select a function type.',
//       );
//     }

//     const personCount = Number.parseInt(Person, 10);
//     if (!Person || !Number.isFinite(personCount) || personCount <= 0) {
//       return showValidationError(
//         'no_of_person',
//         'Please enter a valid number of persons.',
//       );
//     }

//     if (occupantType?.additional_info === 'Yes') {
//       if (!Phone || !validatePhone(Phone)) {
//         return showValidationError(
//           'mobile',
//           'Please enter a valid mobile number.',
//         );
//       }

//       if (!Email || !validateEmail(Email)) {
//         return showValidationError(
//           'email',
//           'Please enter a valid email address.',
//         );
//       }

//       if (!Address || Address.trim().length < 5) {
//         return showValidationError('address', 'Please enter a valid address.');
//       }
//       if (!name || name.trim().length < 5) {
//         return showValidationError('name', 'Please enter a valid name.');
//       }
//     }

//     return true;
//   };

//   const validateVenueRows = () => {
//     if (!venueList?.length) {
//       return showValidationError('box', 'Please select at least one venue.');
//     }

//     const personCount = Number.parseInt(Person, 10);
//     const selectedVenueIds = venueList
//       .filter(hasSelectedVenue)
//       .map(item => String(item.id));

//     if (selectedVenueIds.length !== venueList.length) {
//       return showValidationError('box', 'Please select venue.');
//     }

//     if (new Set(selectedVenueIds).size !== selectedVenueIds.length) {
//       return showValidationError(
//         'box',
//         'Please do not select duplicate venues.',
//       );
//     }

//     for (const item of venueList) {
//       if (toAmount(item.capacity) < personCount) {
//         return showValidationError(
//           'no_of_person',
//           'Each venue capacity must be greater than or equal to number of persons.',
//         );
//       }

//       if (!item.sessionID) {
//         return showValidationError(
//           'box',
//           'Please select session for each venue.',
//         );
//       }

//       if (toAmount(item.rate) <= 0) {
//         return showValidationError('box', 'Venue rate must be greater than 0.');
//       }
//     }

//     return true;
//   };

//   const validateBooking = () => validateGuestDetails() && validateVenueRows();

//   const handleSubmit = () => {
//     if (!agree) {
//       Alert.alert('Please agree to Terms & Conditions');
//       return;
//     }

//     if (validateBooking()) {
//       booking();
//     }
//   };
//   const [venueList, setVenueList] = useState<any[]>([createVenueRow(true)]);
//   const charge = calculateBanquetTotal(venueList);

//   const addVenue = () => {
//     setVenueList(prev => [...prev, createVenueRow(false)]);
//     LayoutAnimation.configureNext({
//       duration: 300,
//       create: {
//         type: LayoutAnimation.Types.linear,
//         property: LayoutAnimation.Properties.opacity,
//       },
//     });
//   };

//   const removeVenue = (id: any, ind: number) => {
//     setVenueList(prev => prev.filter((item, idx) => idx !== ind));
//     LayoutAnimation.configureNext({
//       duration: 300,
//       create: {
//         type: LayoutAnimation.Types.linear,
//         property: LayoutAnimation.Properties.opacity,
//       },
//     });
//   };
//   const booking = () => {
//     if (!userData?.user?.MemberID) {
//       Toast.show('Invalid member details', { type: 'danger' });
//       return;
//     }

//     setisloading(true);
//     const myHeaders = new Headers();
//     myHeaders.append('Authorization', `Bearer ${userData.token}`);

//     const formdata = new FormData();
//     formdata.append('occupant_type', String(occupantType?.id));
//     formdata.append('memberID', String(userData?.user.MemberID));
//     formdata.append('SC_ID', String(userData?.user.SC_ID));
//     formdata.append('memberName', String(name || userData?.user.DisplayName));
//     formdata.append('memberMobile', String(Phone || userData?.user.Mobile));
//     formdata.append('memberEmail', String(Email || userData?.user.Email));
//     formdata.append('address', Address);
//     formdata.append('funDate', StartDate);
//     formdata.append('functionType', String(FunctionType?.id));
//     formdata.append('noofPerson', Person);
//     formdata.append('remark', Remark);
//     venueList.forEach(item => {
//       const amounts = calculateBanquetAmounts(item);
//       formdata.append('session_id[]', String(item.sessionID));
//       formdata.append('vanue_id[]', String(item.id));
//       formdata.append('gst_amount[]', formatAmount(amounts.gstAmount));
//       formdata.append('gst_per[]', formatAmount(amounts.gstPer));
//       formdata.append('charges[]', formatAmount(amounts.rate));
//       formdata.append(
//         'security_deposit[]',
//         formatAmount(amounts.securityDeposit),
//       );
//       formdata.append(
//         'clearing_charge[]',
//         formatAmount(amounts.clearingCharge),
//       );
//       formdata.append('total[]', formatAmount(amounts.totalWithGST));
//     });

//     const requestOptions = {
//       method: 'POST',
//       headers: myHeaders,
//       body: formdata,
//       redirect: 'follow',
//     };

//     fetch(`${DOMAIN.BASE}member/banquet/store`, requestOptions)
//       .then(response => response.json())
//       .then(async json => {
//         setisloading(false);

//         if (json && json.data && json.data) {
//           navigation.navigate('UniversalPayment', {
//             orderData: json.data,
//             type: 'Banquet Booking',
//           });
//           Toast.show(json.message);
//           resetForm();
//         } else {
//           // setisLoading(false)
//           setisloading(false);
//           Alert.alert(json.message);

//           console.log('API Failed');
//         }
//       })
//       .catch(error => {
//         setisloading(false);
//         console.error(error);
//       });
//   };

//   const session_type = (index: number, item: any) => {
//     const selectedVenue = venueList[index];

//     if (!hasSelectedVenue(selectedVenue)) {
//       Toast.show('Please select venue first.', { type: 'danger' });
//       return;
//     }

//     const updatedVenue = applyBanquetSessionCharge(
//       selectedVenue,
//       item,
//       occupantType?.id,
//     );

//     if (!updatedVenue) {
//       Alert.alert('Venue is not available for this session.');
//       return;
//     }

//     setVenueList(prev =>
//       prev.map((venue, venueIndex) =>
//         venueIndex === index ? updatedVenue : venue,
//       ),
//     );
//   };

//   const Venue_type = (index: number, item: any) => {
//     if (!validateGuestDetails()) {
//       return;
//     }

//     const selectedVenue = {
//       ...item,
//       rowId: venueList[index]?.rowId ?? `venue-${Date.now()}`,
//       isDefault: index === 0,
//       sessionID: '',
//       sessionName: '',
//       rate: '',
//       gstAmount: '',
//       gst_per: '',
//       securityDeposit: '',
//       clearingCharge: '',
//       totalWithGST: '',
//     };

//     if (index) {
//       setVenueList(
//         venueList.map((venue, i) => (i === index ? selectedVenue : venue)),
//       );
//     } else {
//       setVenueList([selectedVenue]);
//     }
//   };
//   return (
//     <View style={styles.container}>
//       <Header title={'Book Your Venue'}></Header>
//       <KeyboardAvoidingView
//         behavior="padding"
//         style={{ flex: 1 }}
//         keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 20}
//       >
//         <ScrollView
//           keyboardShouldPersistTaps="handled"
//           style={styles.innercontainer}
//           showsVerticalScrollIndicator={false}
//         >
//           <Text style={styles.text}>
//             Booking For<Text style={{ color: 'red' }}> *</Text>
//           </Text>
//           <Dropdown
//             style={[styles.dropdown]}
//             placeholderStyle={styles.placeholderStyle}
//             selectedTextStyle={styles.selectedTextStyle}
//             containerStyle={{
//               borderRadius: 10,
//             }}
//             itemTextStyle={[styles.itemContainerStyle, { color: 'black' }]}
//             renderItem={item => {
//               const isSelected = item.id === occupantType?.id;
//               return (
//                 <View
//                   style={[
//                     styles.itemContainer,
//                     {
//                       backgroundColor: 'white',
//                       borderWidth: isSelected ? 1 : 0,
//                       borderColor: SECONDARY_COLOR,
//                       borderRadius: 10,
//                     },
//                   ]}
//                 >
//                   <Text
//                     style={{
//                       color: 'black',
//                       padding: 6,
//                       fontFamily: isSelected
//                         ? FONT_FAMILY.bold
//                         : FONT_FAMILY.light,
//                     }}
//                   >
//                     {item.name}
//                   </Text>
//                 </View>
//               );
//             }}
//             iconStyle={styles.iconStyle}
//             data={Occupaint}
//             maxHeight={300}
//             labelField="name"
//             valueField="id"
//             placeholder={'Select Occupant Type'}
//             value={occupantType?.id ?? 0}
//             onChange={item => {
//               LayoutAnimation.configureNext({
//                 duration: 300,
//                 create: {
//                   type: LayoutAnimation.Types.linear,
//                   property: LayoutAnimation.Properties.opacity,
//                 },
//                 delete: {
//                   type: LayoutAnimation.Types.linear,
//                   property: LayoutAnimation.Properties.opacity,
//                 },
//                 update: {
//                   type: LayoutAnimation.Types.linear,
//                   property: LayoutAnimation.Properties.opacity,
//                 },
//               });
//               if (item.additional_info == 'No') {
//                 setEmail('');
//                 setAddress('');
//                 setName('');
//                 setPhone('');
//               }
//               setOccupantType(item);
//             }}
//           />
//           {occupantType?.additional_info == 'Yes' && (
//             <View style={{ flex: 1 }}>
//               <Text style={styles.text}>
//                 Name<Text style={{ color: 'red' }}> *</Text>
//               </Text>

//               <TextInput
//                 placeholderTextColor="#858585"
//                 style={[
//                   styles.textinput,
//                   { borderColor: errors.name ? 'red' : colors.border },
//                 ]}
//                 value={name}
//                 placeholder="Enter Your Name"
//                 onChangeText={handleNameChange}
//               />
//               <Text style={styles.text}>
//                 Mobile No.<Text style={{ color: 'red' }}> *</Text>
//               </Text>
//               <TextInput
//                 placeholderTextColor="#858585"
//                 style={[
//                   styles.textinput,
//                   { borderColor: errors.mobile ? 'red' : colors.border },
//                 ]}
//                 value={Phone}
//                 maxLength={10}
//                 placeholder="Enter Your Mobile No."
//                 keyboardType="numeric"
//                 onChangeText={handleInputChange}
//               />
//               <Text style={styles.text}>
//                 Email ID<Text style={{ color: 'red' }}> *</Text>
//               </Text>
//               <TextInput
//                 placeholderTextColor="#858585"
//                 style={[
//                   styles.textinput,
//                   { borderColor: errors.email ? 'red' : colors.border },
//                 ]}
//                 maxLength={80}
//                 value={Email}
//                 placeholder="Enter Your Email ID"
//                 // onChangeText={handleNameChange}

//                 onChangeText={handleEmailChange}
//               />
//               <Text style={styles.text}>Address</Text>
//               <TextInput
//                 placeholderTextColor="grey"
//                 style={[
//                   styles.textinput,
//                   { borderColor: errors.address ? 'red' : colors.border },
//                 ]}
//                 value={Address}
//                 maxLength={100}
//                 placeholder="Enter Your Address"
//                 onChangeText={text => {
//                   setAddress(text);
//                   if (errors.address) {
//                     setErrors(prev => ({ ...prev, address: false }));
//                   }
//                 }}
//               />
//             </View>
//           )}

//           <View
//             style={{ flexDirection: 'row', justifyContent: 'space-between' }}
//           >
//             <View style={{ flex: 1, marginRight: 10 }}>
//               <Text style={styles.text}>
//                 Function Date<Text style={{ color: 'red' }}> *</Text>
//               </Text>
//               <DatePickerComponent
//                 stateDate={setStartDate}
//                 placeholder={moment(StartDate).format('DD-MMM-YY')}
//                 maxDate={moment()
//                   .add(data?.settings?.max_days ?? 50, 'days')
//                   .toDate()}
//                 minDate={moment()
//                   .add(data?.settings?.min_days ?? 3, 'days')
//                   .toDate()}
//               />
//               {/* <TouchableOpacity
//                 activeOpacity={0.9}
//                 onPress={() => setOpen(true)}
//                 style={[styles.textinput, {paddingVertical: 13}]}>
//                <Text
//                   style={{
//                     color: "black",
//                     fontFamily: FONT_FAMILY.normal,
//                   }}
//                 >
//                   {updateDate
//                     ? moment(date).format("DD-MMMM-YYYY")
//                     : "Select Date"}
//                 </Text>
//                 <DatePicker
//                   modal
//                   mode={'date'}
//                   open={open}
//                   date={date}
//                   minimumDate={moment()
//                     .add(data?.settings?.min_days ?? 3, 'days')
//                     .toDate()}
//                   maximumDate={moment()
//                     .add(data?.settings?.max_days ?? 50, 'days')
//                     .toDate()}
//                   onConfirm={dt => {
//                     setOpen(false);
//                     setDate(dt);
//                     setUpdateDate(true);
//                     setStartDate(moment(date).format('YYYY-MM-DD'));
//                   }}
//                   onCancel={() => {
//                     setOpen(false);
//                   }}
//                 />
//               </TouchableOpacity> */}
//             </View>
//             <View style={{ flex: 1, marginLeft: 10 }}>
//               <Text style={styles.text}>
//                 Function Type<Text style={{ color: 'red' }}> *</Text>
//               </Text>
//               <Dropdown
//                 style={[
//                   styles.dropdown,
//                   { borderColor: errors.function_type ? 'red' : colors.border },
//                 ]}
//                 placeholderStyle={styles.placeholderStyle}
//                 selectedTextStyle={styles.selectedTextStyle}
//                 containerStyle={{
//                   backgroundColor: '#f0f0f0',
//                   borderRadius: 10,
//                 }}
//                 itemTextStyle={[styles.itemContainerStyle, { color: 'black' }]}
//                 renderItem={item => {
//                   const isSelected = item.id === FunctionType?.id;
//                   return (
//                     <View
//                       style={[
//                         styles.itemContainer,
//                         {
//                           backgroundColor: 'white',
//                           borderWidth: isSelected ? 1 : 0,
//                           borderColor: SECONDARY_COLOR,
//                           borderRadius: 10,
//                         },
//                       ]}
//                     >
//                       <Text
//                         style={{
//                           color: 'black',
//                           padding: 6,
//                           fontFamily: isSelected
//                             ? FONT_FAMILY.bold
//                             : FONT_FAMILY.light,
//                         }}
//                       >
//                         {item.name}
//                       </Text>
//                     </View>
//                   );
//                 }}
//                 iconStyle={styles.iconStyle}
//                 data={Function}
//                 maxHeight={300}
//                 labelField="name"
//                 valueField="id"
//                 placeholder={'Function Type'}
//                 value={FunctionType?.id ?? 0}
//                 onChange={item => {
//                   if (errors.function_type) {
//                     setErrors(prev => ({ ...prev, function_type: false }));
//                   }
//                   LayoutAnimation.configureNext({
//                     duration: 300,
//                     update: {
//                       type: LayoutAnimation.Types.easeOut,
//                       property: LayoutAnimation.Properties.opacity,
//                     },
//                   });

//                   setFunctionType(item);
//                 }}
//               />
//             </View>
//           </View>

//           <Text style={styles.text}>
//             No. of Persons<Text style={{ color: 'red' }}> *</Text>
//           </Text>

//           <TextInput
//             placeholderTextColor="#858585"
//             style={[
//               styles.textinput,
//               { borderColor: errors.no_of_person ? 'red' : colors.border },
//             ]}
//             value={Person}
//             placeholder="No. of Persons"
//             keyboardType="numeric"
//             returnKeyType="done"
//             onChangeText={text => [
//               setPerson(text),
//               setErrors(prev => ({ ...prev, no_of_person: false })),
//             ]}
//           />

//           <View
//             style={{
//               backgroundColor: colors.surface,
//               padding: 10,
//               borderRadius: 10,
//               borderColor: errors.box ? 'red' : colors.border,
//               borderWidth: 1,
//               marginVertical: 20,
//             }}
//           >
//             <View
//               style={{
//                 flexDirection: 'row',
//                 justifyContent: 'space-between',
//                 alignItems: 'center',
//               }}
//             >
//               <Text style={[styles.text, { color: colors.text }]}>
//                 Venue Details
//               </Text>

//               <Pressable
//                 onPress={addVenue}
//                 style={{
//                   padding: 5,
//                   paddingHorizontal: 10,
//                   borderRadius: 5,
//                   borderWidth: 1,
//                   borderColor: colors.border,
//                 }}
//               >
//                 <Text style={{ color: colors.text }}>Add Venue</Text>
//               </Pressable>
//             </View>

//             {!isLoading ? (
//               venueList.map((venue, index) => {
//                 const amounts = calculateBanquetAmounts(venue);

//                 return (
//                   <View
//                     key={venue.rowId ?? `${venue.id}-${index}`}
//                     style={styles.venueContainer}
//                   >
//                     <View>
//                       <Text style={styles.text}>Venue</Text>
//                       <Dropdown
//                         style={[styles.dropdown]}
//                         disable={!!errors.no_of_person}
//                         placeholderStyle={styles.placeholderStyle}
//                         selectedTextStyle={styles.selectedTextStyle}
//                         containerStyle={{
//                           backgroundColor: '#f0f0f0',
//                           borderRadius: 10,
//                         }}
//                         itemTextStyle={[
//                           styles.itemContainerStyle,
//                           { color: 'black' },
//                         ]}
//                         renderItem={item => {
//                           const isSelected = item?.id === venue?.id;
//                           return (
//                             <View
//                               style={[
//                                 styles.itemContainer,
//                                 {
//                                   backgroundColor: 'white',
//                                   borderWidth: isSelected ? 1 : 0,
//                                   borderColor: SECONDARY_COLOR,
//                                   borderRadius: 10,
//                                 },
//                               ]}
//                             >
//                               <Text
//                                 style={{
//                                   color: 'black',
//                                   padding: 6,
//                                   fontFamily: isSelected
//                                     ? FONT_FAMILY.bold
//                                     : FONT_FAMILY.light,
//                                 }}
//                               >
//                                 {item.name} (Capacity:{item.capacity})
//                               </Text>
//                             </View>
//                           );
//                         }}
//                         iconStyle={styles.iconStyle}
//                         data={Venue.filter(v => {
//                           // Exclude already selected venues (except current dropdown)
//                           const isAlreadySelected = venueList.some(
//                             item =>
//                               String(item.id) === String(v.id) &&
//                               String(item.rowId) !== String(venue.rowId),
//                           );
//                           if (isAlreadySelected) return false;

//                           if (index === 0) return true;

//                           const firstGroupId = getBanquetVenueGroupId(
//                             venueList[0],
//                           );
//                           return (
//                             !firstGroupId ||
//                             getBanquetVenueGroupId(v) === firstGroupId
//                           );
//                         })}
//                         maxHeight={300}
//                         labelField="name"
//                         valueField="id"
//                         placeholder={'Select Venue'}
//                         value={venue.id ?? 0}
//                         onChange={item => {
//                           Venue_type(index, item);
//                         }}
//                       />
//                     </View>
//                     <View style={{}}>
//                       <View>
//                         <Text style={styles.text}>Session</Text>
//                         <Dropdown
//                           style={[styles.dropdown]}
//                           placeholderStyle={styles.placeholderStyle}
//                           selectedTextStyle={styles.selectedTextStyle}
//                           disable={!!errors.no_of_person}
//                           containerStyle={{
//                             backgroundColor: '#f0f0f0',
//                             borderRadius: 10,
//                           }}
//                           data={venue.sessions || []}
//                           itemTextStyle={[
//                             styles.itemContainerStyle,
//                             { color: 'black' },
//                           ]}
//                           renderItem={item => {
//                             const isSelected = item.id === venue.sessionID;
//                             return (
//                               <View
//                                 style={[
//                                   styles.itemContainer,
//                                   {
//                                     backgroundColor: 'white',
//                                     borderWidth: isSelected ? 1 : 0,
//                                     borderColor: SECONDARY_COLOR,
//                                     borderRadius: 10,
//                                   },
//                                 ]}
//                               >
//                                 <Text
//                                   style={{
//                                     color: 'black',
//                                     padding: 6,
//                                     fontFamily: isSelected
//                                       ? FONT_FAMILY.bold
//                                       : FONT_FAMILY.light,
//                                   }}
//                                 >
//                                   {item.name}
//                                 </Text>
//                               </View>
//                             );
//                           }}
//                           iconStyle={styles.iconStyle}
//                           maxHeight={300}
//                           labelField="name"
//                           valueField="id"
//                           placeholder={'Select Session'}
//                           value={venue.sessionID ?? 0}
//                           onChange={item => {
//                             session_type(index, item);
//                           }}
//                         />
//                       </View>

//                       {venue?.rate && (
//                         <View
//                           style={{
//                             marginTop: 10,
//                             flexDirection: 'row',
//                             justifyContent: 'space-between',
//                           }}
//                         >
//                           {venue?.GSTper && (
//                             <Text
//                               style={{
//                                 color: colors.placeholder,
//                                 fontFamily: FONT_FAMILY.normal,
//                               }}
//                             >
//                               GST({venue.GSTper}%): ₹
//                               {formatAmount(amounts.gstAmount)}
//                             </Text>
//                           )}
//                           {venue.rate && (
//                             <Text
//                               style={{
//                                 color: colors.placeholder,
//                                 fontFamily: FONT_FAMILY.normal,
//                               }}
//                             >
//                               Amount:{' '}
//                               <Text
//                                 style={{
//                                   color: colors.text,
//                                   fontFamily: FONT_FAMILY.semiBold,
//                                 }}
//                               >
//                                 ₹{formatAmount(amounts.rate)}
//                               </Text>
//                             </Text>
//                           )}
//                         </View>
//                       )}
//                       {venue.rate && (
//                         <View
//                           style={{
//                             marginBottom: 10,
//                             flexDirection: 'row',
//                             justifyContent: 'space-between',
//                           }}
//                         >
//                           {venue?.capacity && (
//                             <Text
//                               style={{
//                                 color: colors.placeholder,
//                                 fontFamily: FONT_FAMILY.normal,
//                               }}
//                             >
//                               Capacity:{' '}
//                               <Text
//                                 style={{
//                                   color: colors.text,
//                                   fontFamily: FONT_FAMILY.semiBold,
//                                 }}
//                               >
//                                 {venue.capacity}
//                               </Text>
//                             </Text>
//                           )}
//                           {parseFloat(venue?.security_deposit || 0) > 0 && (
//                             <Text
//                               style={{
//                                 color: colors.placeholder,
//                                 fontFamily: FONT_FAMILY.normal,
//                               }}
//                             >
//                               Security deposit:{' '}
//                               <Text
//                                 style={{
//                                   color: SECONDARY_COLOR,
//                                   fontFamily: FONT_FAMILY.semiBold,
//                                 }}
//                               >
//                                 ₹{formatAmount(amounts.securityDeposit)}
//                               </Text>
//                             </Text>
//                           )}
//                           {amounts.clearingCharge > 0 && (
//                             <Text
//                               style={{
//                                 color: colors.placeholder,
//                                 fontFamily: FONT_FAMILY.normal,
//                               }}
//                             >
//                               Clearing charge:{' '}
//                               <Text
//                                 style={{
//                                   color: SECONDARY_COLOR,
//                                   fontFamily: FONT_FAMILY.semiBold,
//                                 }}
//                               >
//                                 ₹{formatAmount(amounts.clearingCharge)}
//                               </Text>
//                             </Text>
//                           )}
//                         </View>
//                       )}
//                       {venue?.rate && (
//                         <Text
//                           style={{
//                             color: colors.placeholder,
//                             fontFamily: FONT_FAMILY.normal,
//                             textAlign: 'right',
//                           }}
//                         >
//                           Sub total:{' '}
//                           <Text
//                             style={{
//                               color: SECONDARY_COLOR,
//                               fontFamily: FONT_FAMILY.semiBold,
//                             }}
//                           >
//                             ₹{formatAmount(amounts.totalWithGST)}
//                           </Text>
//                         </Text>
//                       )}
//                     </View>
//                     {!venue.isDefault && (
//                       <View style={{ marginTop: 8 }}>
//                         <CancelButton
//                           text={'Remove'}
//                           onPress={() => removeVenue(venue, index)}
//                         />
//                       </View>
//                     )}
//                   </View>
//                 );
//               })
//             ) : (
//               <FlatList
//                 data={[1]}
//                 renderItem={() => (
//                   <View style={[{ marginHorizontal: 10, borderRadius: 20 }]}>
//                     <View style={{ flex: 1, alignItems: 'flex-start' }}>
//                       <ShimmerPlaceholder width={100} style={{ margin: 5 }} />

//                       <ShimmerPlaceholder
//                         width={300}
//                         style={{ margin: 5, height: 50 }}
//                       />

//                       <ShimmerPlaceholder width={100} style={{ margin: 5 }} />
//                       <ShimmerPlaceholder
//                         width={300}
//                         style={{ margin: 5, height: 50 }}
//                       />
//                     </View>
//                   </View>
//                 )}
//               />
//             )}
//           </View>

//           <Text style={styles.text}>Remark</Text>

//           <TextInput
//             placeholderTextColor="#858585"
//             style={styles.textinput}
//             placeholder="Remark"
//             value={Remark}
//             maxLength={80}
//             onSubmitEditing={() => setModalVisible(true)}
//             onChangeText={text => setRemark(text)}
//           />

//           {charge > 0 && (
//             <View>
//               <TouchableOpacity
//                 onPress={() => {
//                   setModalVisible(true);
//                 }}
//                 style={{
//                   alignItems: 'center',
//                   flexDirection: 'row',
//                   marginVertical: 20,
//                 }}
//               >
//                 <CustomCheckbox
//                   onToggle={() => setAgree(prev => !prev)}
//                   checked={agree}
//                 />

//                 <Text
//                   style={{
//                     fontSize: 15,
//                     color: '#484C52',
//                     fontFamily: FONT_FAMILY.bold,
//                   }}
//                 >
//                   I agree{' '}
//                   <Text
//                     style={{ textDecorationLine: 'underline', color: 'blue' }}
//                   >
//                     Terms & Conditions
//                   </Text>
//                 </Text>
//               </TouchableOpacity>
//             </View>
//           )}
//         </ScrollView>
//       </KeyboardAvoidingView>
//       <UniversalModal
//         visible={modalVisible}
//         setVisible={setModalVisible}
//         isFull={true}
//         title={'Terms & Conditions'}
//       >
//         <ScrollView contentContainerStyle={{}}>
//           <RenderHTML
//             source={{ html: rooms?.content ?? '' }}
//             contentWidth={width - 60}
//             baseStyle={{
//               color: colors.text,
//               fontSize: 13,
//               width: '100%',
//             }}
//           />
//         </ScrollView>
//         <View style={{ alignItems: 'flex-end', margin: 20 }}>
//           <NewButton
//             text={'Accept'}
//             onPress={() => {
//               setAgree(true);
//               setModalVisible(false);
//             }}
//           />
//         </View>
//       </UniversalModal>
//       <VenueModal
//         visible={venueModal}
//         onDismiss={() => setVenueModal(false)}
//         venues={venueList}
//       />
//       {charge > 0 &&
//         venueList.every(item => hasSelectedVenue(item) && item?.sessionID) && (
//           <View style={{ marginBottom: 20, marginHorizontal: 20 }}>
//             <View
//               style={{
//                 flexDirection: 'row',
//                 justifyContent: 'space-between',
//                 alignItems: 'center',
//               }}
//             >
//               <Pressable onPress={() => setVenueModal(true)}>
//                 <Text style={styles.selectedTextStyle}>Total</Text>
//                 <View style={{ flexDirection: 'row', alignItems: 'center' }}>
//                   <Text style={styles.selectedTextStyle}>
//                     {venueList.length} Venue
//                   </Text>
//                   <Icons
//                     name="caret-up-outline"
//                     size={20}
//                     color={colors.text}
//                   />
//                 </View>
//               </Pressable>

//               <NewButton
//                 onPress={handleSubmit}
//                 loading={isloading}
//                 text={`Pay ₹${charge.toFixed(2)}`}
//               />
//             </View>
//           </View>
//         )}

//       {/* <Loader isActive={isloading} /> */}
//     </View>
//   );
// };
// const createStyles = (colors: any) =>
//   StyleSheet.create({
//     activeInputContainer1: {
//       borderColor: 'green',
//       borderWidth: 1,
//       backgroundColor: '#ffffff',
//       width: '100%',
//       height: 100,
//       padding: 10,
//       borderRadius: 5,
//       marginBottom: '4%',
//       justifyContent: 'center',
//       paddingHorizontal: '3%',
//       alignItems: 'center',
//     },
//     MbuttonText1: {
//       color: colors.text,
//       fontSize: 17,
//       textAlign: 'center',
//       fontFamily: 'Poppins-Bold',
//       fontWeight: '600',
//     },
//     Mbutton1: {
//       marginVertical: '5%',
//       marginBottom: '15%',
//       borderRadius: 5,
//       width: '95%',
//       justifyContent: 'center',
//       alignSelf: 'center',
//       color: colors.text,
//       backgroundColor: '#7AC915',
//       paddingVertical: '3%',
//     },
//     errorText: {
//       color: '#F60000',
//       fontSize: 14,
//       marginVertical: 8,
//       marginLeft: '1%',
//     },
//     headerButton: {
//       borderRadius: 6,
//       borderWidth: 1,
//       borderColor: colors.primary,
//       padding: 5,
//       marginRight: 10,
//     },
//     container: {
//       flex: 1,
//       backgroundColor: colors.background,
//     },
//     venueContainer: {
//       borderBottomWidth: 1,
//       padding: 10,
//       borderRadius: 6,
//       borderColor: colors.border,
//       backgroundColor: colors.card,
//       marginTop: 10,
//     },
//     text: {
//       marginVertical: 10,
//       fontSize: 13,
//       color: colors.text,
//       fontFamily: FONT_FAMILY.bold,
//     },
//     innercontainer: {
//       margin: 20,
//     },
//     textinput: {
//       fontSize: 15,
//       color: colors.text,
//       borderRadius: 10,
//       fontFamily: FONT_FAMILY.normal,
//       backgroundColor: colors.surface,
//       borderColor: colors.border,
//       borderWidth: 1,
//       padding: 10,
//     },
//     dropdown: {
//       backgroundColor: colors.surface,
//       padding: 10,
//       paddingVertical: 12,
//       borderRadius: 10,
//       borderWidth: 1,
//       borderColor: colors.border,
//     },
//     iconStyle: {
//       tintColor: colors.text,
//     },
//     placeholderStyle: {
//       color: colors.text,
//       fontFamily: FONT_FAMILY.normal,
//     },
//     selectedTextStyle: { color: colors.text, fontFamily: FONT_FAMILY.normal },
//     itemContainerStyle: { color: colors.text, fontFamily: FONT_FAMILY.normal },
//     itemContainer: {
//       paddingVertical: 10,
//       paddingHorizontal: 15,
//     },
//   });
// export default BookingForm;
