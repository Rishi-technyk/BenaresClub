import { Alert, Platform, StyleSheet, TextInput, View } from 'react-native';
import React, { useEffect, useRef, useState } from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/AuthStack';
import AuthScreenLayout from '../../components/AuthScreenLayout';
import Button2 from '../../components/Button2';
import { Dropdown } from 'react-native-element-dropdown';
import { Toast } from 'react-native-toast-notifications';
import { javascriptGetLocal, javascriptPostLocal } from '../../util/api';
import messaging from '@react-native-firebase/messaging';
import { Loginstyles } from '../../Styles/LoginStyles';
import { FONT_FAMILY } from '../../util/colors';
import { ENDPOINT } from '../../util/constant';
import { useAppTheme } from '../../theme/AppThemeProvider';
import { loginWithOTP } from '../../store/slices/authSlice';
import { useDispatch } from 'react-redux';
import useAppAlert from '../../hooks/useAppAlert';

type Props = NativeStackScreenProps<AuthStackParamList, 'StaffLogin'>;

const StaffLogin: React.FC<Props> = ({ navigation }) => {
  const [usernameTextValue, setUsernameTextValue] = useState<string>('');
  const [loadingData, setLoadingData] = useState(false);
  const dispatch = useDispatch();
  const [location, setLocation] = useState([]);
  const [password, setPassword] = useState('');
  const [selectedValue, setSelectedValue] = useState(null);
  const { colors } = useAppTheme();
  const styles = createStyles(colors);

  const userRef = useRef(null);
  const { alertState, showAlert, hideAlert } = useAppAlert();
  const getLocation = async () => {
    try {
      let apiObj = {
        path: 'locations',
        body: {},
      };
      console.log('-------------------------------------------');
      const response = await javascriptGetLocal(apiObj);
      console.log(
        response,
        '---------------------- response ---------------------',
      );
      if (response.status) {
        setLocation(response.data);
      }
    } catch (error) {}
  };
  useEffect(() => {
    getLocation();
  }, []);
  const authenticateUsers = async () => {
    Toast.hideAll();
    if (usernameTextValue === '') {
      Toast.show('Please enter User name', { type: 'danger' });

      return;
    }
    if (selectedValue === null) {
      Toast.show('Please select location', { type: 'danger' });
      return;
    }
    setLoadingData(true);
    const apiRequestObject = {
      body: {
        type: 'waiter',
        username: usernameTextValue,
        password: password,
        location: selectedValue,
      },
    };
    try {
      setLoadingData(true);
      const response = await dispatch(
        loginWithOTP({ apiRequestObject }),
      ).unwrap();
      console.log(
        response,
        '---------------------- response ---------------------',
      );
      if (!response?.user || !response?.token) {
         Toast.show('Verification failed',{
        type:'danger'
      }); 
      }
    } catch (error: string | any) {
      console.log(error, '---------------------- error ---------------------');
      Toast.show(error,{
        type:'danger'
      });
    } finally {
      setLoadingData(false);
    }
  };
  return (
    <AuthScreenLayout title="Login as staff">
      <TextInput
        ref={userRef}
        maxLength={15}
        keyboardType="email-address"
        placeholder="Enter User Name"
        secureTextEntry={false}
        value={usernameTextValue}
        onChangeText={value => setUsernameTextValue(value)}
        style={[
          Loginstyles.textInput,
          styles.textInput,
          {
            paddingVertical: 20,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          },
        ]}
        placeholderTextColor={colors.placeholder}
        returnKeyType="next"
      />

      <TextInput
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        placeholderTextColor={colors.placeholder}
        style={[
          Loginstyles.textInput,
          styles.textInput,
          {
            paddingVertical: 20,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          },
        ]}
      />
      <View>
        <Dropdown
          data={location || []}
          style={[
            styles.dropdown,
            { borderBottomWidth: 1, borderBottomColor: colors.border },
          ]}
          placeholderStyle={styles.placeholderStyle}
          selectedTextStyle={styles.selectedTextStyle}
          containerStyle={styles.containerStyle}
          itemTextStyle={styles.itemTextStyle}
          labelField="LocationName"
          valueField="code"
          placeholder="Select an Location"
          value={selectedValue}
          onChange={item => {
            setSelectedValue(item.code);
          }}
        />
      </View>

      <Button2
        text={'Sign In As Staff'}
        onPress={authenticateUsers}
        loading={loadingData}
      />
    </AuthScreenLayout>
  );
};

export default StaffLogin;

const createStyles = (colors: {
  primary: string;
  border: string;
  placeholder: string;
  text: string;
  surface: string;
}) =>
  StyleSheet.create({
    textInput: {
      color: colors.text,
      borderBottomColor: colors.primary,
      backgroundColor: colors.surface,
    },
    dropdown: {
      height: 50,
      borderBottomWidth: 1,
      paddingHorizontal: 8,
      marginVertical: 10,
      marginHorizontal: 5,
      borderBottomColor: colors.primary,
      backgroundColor: colors.surface,
      borderRadius: 8,
    },
    icon: {
      marginRight: 5,
    },
    containerStyle: {
      borderRadius: 8,
      borderColor: colors.border,
      borderWidth: 0.5,
      maxHeight: 200,
      marginTop: 8,
      backgroundColor: colors.surface,
    },
    placeholderStyle: {
      color: colors.placeholder,
      fontFamily: FONT_FAMILY.normal,
      fontSize: 16,
    },
    selectedTextStyle: {
      fontFamily: FONT_FAMILY.normal,
      color: colors.text,
      fontSize: 16,
    },
    itemTextStyle: {
      fontFamily: FONT_FAMILY.normal,
      color: colors.text,
    },
  });

// import {
//   Alert,
//   Pressable,
//   StyleSheet,
//   Text,
//   TextInput,
//   View,
// } from 'react-native';
// import React, { useEffect, useRef, useState } from 'react';
// import { NativeStackScreenProps } from '@react-navigation/native-stack';
// import { AuthStackParamList } from '../../navigation/AuthStack';
// import AuthScreenLayout from '../../components/AuthScreenLayout';
// import Button2 from '../../components/Button2';
// import Ionicons from 'react-native-vector-icons/Ionicons';
// import { Dropdown } from 'react-native-element-dropdown';
// import { Toast } from 'react-native-toast-notifications';
// import { javascriptGetLocal, javascriptPost, javascriptPostLocal } from './../../util/api';
// import { Loginstyles } from '../../Styles/LoginStyles';
// import { DARK_BLUE, FONT_FAMILY } from '../../util/colors';
// import { ENDPOINT } from '../../util/constant';
// import { getAdminLoginConfig } from '../../config/dashboardConfig';

// type Props = NativeStackScreenProps<AuthStackParamList, 'StaffLogin'>;

// const StaffLogin: React.FC<Props> = ({ navigation }) => {
//   const [usernameTextValue, setUsernameTextValue] = useState<string>('');
//   const [loadingData, setLoadingData] = useState(false);
//   const [Tabs, setTabs] = useState<any[]>([]);
//   const [selectedTab, setSelectedTab] = useState<any>({});
//   const [showPassword, setShowPassword] = useState(false);
//   const [location, setLocation] = useState([]);
//   const [selectedValue, setSelectedValue] = useState(null);
//   const userRef = useRef(null);

//   const getLocation = async () => {
//     try {
//       let apiObj = {
//         path: 'locations',
//         body: {},
//       };
//       console.log('-------------------------------------------');
//       const response = await javascriptGetLocal(apiObj);
//       console.log(
//         response,
//         '---------------------- response ---------------------',
//       );
//       if (response.status) {
//         setLocation(response.data);
//       }
//     } catch (error) {}
//   };
//   const loadLoginTabs = async () => {
//     const response = await getAdminLoginConfig();
//     if (response.login_tabs.length) {
//       if (response.login_tabs.length !== 1) {
//         setTabs(response.login_tabs);
//       }
//       setSelectedTab(response.login_tabs[0]);
//     }
//   };
//   useEffect(() => {
//     // getLocation();
//     loadLoginTabs();
//   }, []);
//   const authenticateUsers = async () => {
//     Toast.hideAll();
//     if (usernameTextValue === '') {
//       Toast.show('Please enter User name', { type: 'danger' });

//       return;
//     }
//     if (selectedTab.module_key==='kot'|| selectedValue === null) {
//       Toast.show('Please select location', { type: 'danger' });
//       return;
//     }else if(selectedValue){
//        Toast.show('Please enter password', { type: 'danger' });
//       return;
//     }
//     setLoadingData(true);
//     const apiRequestObject = {
//       body: { username: usernameTextValue, location: selectedValue },
//     };
//     setLoadingData(true);
//     const response =selectedTab.module_key==='kot' ? await javascriptPostLocal({
//       path: ENDPOINT.waiter_login,
//       body: apiRequestObject.body,
//     }):await javascriptPost({
//        path: selectedTab?.data_json.endpoint,
//       body: apiRequestObject.body,
//     })

//     setLoadingData(false);
//     if (response.status) {
//       if (response.message) {
//         Alert.alert('OTP', response.message);
//       }
//       navigation.navigate('VerifyOTP', {
//         memberID: usernameTextValue,
//         type: selectedTab.module_key==='kot' ?'waiter':'event',
//       });
//     } else {
//       Toast.show(
//         response.message ? response.message : 'incorrect username or location',
//         {
//           type: 'danger',
//         },
//       );
//     }
//   };
//   return (
//     <AuthScreenLayout title="Login as staff">
//       <View
//         style={{
//           flexDirection: 'row',
//           alignItems: 'center',
//           justifyContent: 'space-evenly',
//         }}
//       >
//         {Tabs.map(item => {
//           return (
//             <Pressable
//               key={item.id}
//               style={{
//                 padding: 10,
//                 backgroundColor:
//                   item.id === selectedTab.id ? '#f0f0f0' : 'white',
//                 borderRadius: 10,
//               }}
//               onPress={() => setSelectedTab(item)}
//             >
//               <Text
//                 style={{
//                   color: item.id === selectedTab.id ? 'black' : 'grey',
//                   fontFamily: FONT_FAMILY.semiBold,
//                 }}
//               >
//                 {item.name}
//               </Text>
//             </Pressable>
//           );
//         })}
//       </View>
//       <TextInput
//         ref={userRef}
//         maxLength={15}
//         keyboardType="email-address"
//         placeholder="Enter User Name"
//         secureTextEntry={false}
//         value={usernameTextValue}
//         onChangeText={value => setUsernameTextValue(value)}
//         style={[Loginstyles.textInput, { paddingVertical: 20 }]}
//         placeholderTextColor="#363b5d"
//         returnKeyType="next"
//       />
//       <View>
//        {selectedTab.module_key =='kot'? <Dropdown
//           data={location || []}
//           style={styles.dropdown}
//           placeholderStyle={styles.placeholderStyle}
//           selectedTextStyle={styles.selectedTextStyle}
//           containerStyle={styles.containerStyle}
//           itemTextStyle={styles.itemTextStyle}
//           labelField="LocationName"
//           valueField="code"
//           placeholder="Select an Location"
//           value={selectedValue}
//           onChange={item => {
//             setSelectedValue(item.code);
//           }}
//         />:
//          <View>

//              <TextInput
//               //  ref={passRef}
//                placeholder="Password(DOB:DDMMYYYY)"
//                placeholderTextColor={'grey'}
//                value={selectedValue ??''}
//                onChangeText={setSelectedValue}
//                style={Loginstyles.input}
//                secureTextEntry={!showPassword}
//                onSubmitEditing={authenticateUsers}
//              />
//         <Pressable
//            onPress={() => setShowPassword(prev => !prev)}
//            style={{
//              position: 'absolute',
//              right: 10,
//              top: 15,
//            }}
//          >
//            <Ionicons
//              name={showPassword ? 'eye-off' : 'eye'}
//              size={22}
//              color="black"
//            />
//          </Pressable>
//              </View>}
//       </View>

//       <Button2
//         text={'Sign In As Staff'}
//         onPress={authenticateUsers}
//         loading={loadingData}
//       />
//     </AuthScreenLayout>
//   );
// };

// export default StaffLogin;

// const styles = StyleSheet.create({
//   dropdown: {
//     height: 50,
//     borderBottomWidth: 1,
//     paddingHorizontal: 8,
//     marginVertical: 10,
//     marginHorizontal: 5,
//     borderBottomColor: DARK_BLUE,
//   },
//   icon: {
//     marginRight: 5,
//   },
//   containerStyle: {
//     borderRadius: 8,
//     borderColor: 'gray',
//     borderWidth: 0.5,
//     maxHeight: 200,
//     marginTop: 8,
//   },
//   placeholderStyle: {
//     color: 'gray',
//     fontFamily: FONT_FAMILY.normal,
//     fontSize: 16,
//   },
//   selectedTextStyle: {
//     fontFamily: FONT_FAMILY.normal,
//     color: 'black',
//     fontSize: 16,
//   },
//   itemTextStyle: {
//     fontFamily: FONT_FAMILY.normal,
//     color: 'black',
//     // fontSize: 16,
//   },
// });
