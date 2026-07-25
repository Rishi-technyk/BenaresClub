import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Icon from "react-native-vector-icons/Feather";
import AuthScreenLayout from '../components/AuthScreenLayout.tsx';
import Button2 from '../components/Button2.tsx';
import { Loginstyles } from '../Styles/LoginStyles.tsx';
import { Toast } from 'react-native-toast-notifications';
import { javascriptPost } from '../util/api.tsx';
import { ENDPOINT } from '../util/constant.ts';
import { useAppTheme } from '../theme/AppThemeProvider.tsx';
import { API_BASE_URL } from '@env';
import { FONT_FAMILY } from '../util/colors.tsx';
const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
   const [loadingData, setLoadingData] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const passRef = useRef(null);
  const userRef = useRef(null);

  const authenticateUsers = async () => {

    Toast.hideAll();
    if (email === "") {
      Toast.show("Please enter Member ID", { type: "danger" });

      setLoadingData(false);
      return;
    }
    if (password === "") {
      Toast.show("Please enter password", { type: "danger" });
      setLoadingData(false);
      return;
    }
      setLoadingData(true);
         const apiRequestObject = {
      path: ENDPOINT.login,
      body: {
        memberid: email,
        password: password,
      
      },
    };
    console.log(API_BASE_URL)
    const response = await javascriptPost(apiRequestObject);
  console.log(response);
      if (response.status) {
        // dispatch(loginSuccess(response));
        Alert.alert('OTP',response.message);
  navigation.navigate('VerifyOTP', {
          memberID: email,
        });
        setLoadingData(false);
        // navigation.reset({
        //   routes: [{ name: "Home" }],
        // });
      } else {
        Toast.show(
          response.message ? response.message : "incorrect id or password",
          {
            type: "danger",
          }
        );
      }
    
    setLoadingData(false);
  };
  return (
    <>
    <AuthScreenLayout title={'Sign in'} forgotPasswordText={true}>
      <TextInput
        ref={userRef}
        placeholder="MemberID (A0000)"
        value={email}
        onChangeText={setEmail}
        style={[Loginstyles.input, styles.input]}
        placeholderTextColor={colors.placeholder}
        autoCapitalize="none"
        returnKeyType="next"
        // onSubmitEditing={passRef.current?.focus()}
      />
      <View>

      <TextInput
        ref={passRef}
        placeholder="Password (DDMMYYYY)"
        value={password}
        onChangeText={setPassword}
        style={[Loginstyles.input, styles.input]}
        secureTextEntry={!showPassword}
        placeholderTextColor={colors.placeholder}
        onSubmitEditing={authenticateUsers}
      />
 <Pressable
    onPress={() => setShowPassword(prev => !prev)}
    style={{
      position: 'absolute',
      right: 10,
      top: 15,
    }}
  >
    <Ionicons
      name={showPassword ? 'eye-off' : 'eye'}
      size={22}
      color={colors.text}
    />
  </Pressable>
      </View>
      <Button2 text={'Sign In'} onPress={authenticateUsers} loading={loadingData} />

      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View style={Loginstyles.dividor} />
        <Text style={[Loginstyles.versionText, styles.mutedText]}>or</Text>
        <View style={Loginstyles.dividor} />
      </View>

      <Button2
        text={'Sign In With OTP'}
        onPress={() => navigation.navigate('SigninWithOTP')}
      />
    </AuthScreenLayout>
           {/* <Pressable
      onPress={() => navigation.navigate("StaffLogin")}
        style={{
          alignItems: "center",
          flexDirection: "row",
          justifyContent: "flex-end",
          padding:20
        }}
      >
        <Text style={{color:colors.primary,fontFamily:FONT_FAMILY.medium}}>Staff Login</Text>
        <Icon
          name="arrow-right-circle"
          size={24}
          color={colors.primary}
          style={{ paddingHorizontal: 10 }}
        />
      </Pressable>  */}
      </>
  );
};

const createStyles = colors =>
  StyleSheet.create({
    input: {
      borderBottomColor: colors.border,
      backgroundColor: colors.surface,
      color: colors.text,
    },
    mutedText: {
      color: colors.textMuted,
    },
  });

export default LoginScreen;
