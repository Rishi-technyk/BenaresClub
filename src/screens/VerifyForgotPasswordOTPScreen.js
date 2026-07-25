import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  TextInput,
} from 'react-native';
import {SigninWithOTPScreenService} from '../services/SigninWithOTPScreenService.ts'
import AuthScreenLayout from '../components/AuthScreenLayout.tsx';
import { Toast } from 'react-native-toast-notifications';
import { Loginstyles } from '../Styles/LoginStyles.tsx';
import Button2 from '../components/Button2.tsx';
import { FONT_FAMILY } from '../util/colors.tsx';
import { javascriptPost } from '../util/api.tsx';
import { ENDPOINT } from '../util/constant.ts';
import { useAppTheme } from '../theme/AppThemeProvider.tsx';
const VerifyForgotPasswordOTPScreen = ({ route, navigation }) => {
  const [usernameTextValue, setUsernameTextValue] = useState('');
    const [passwordValue, setPasswordValue] = useState('');
  const [loadingData, setLoadingData] = useState(false);
  const userType = route?.params?.type;
  const [, setCanResend] = useState(false);
  const [timeLeft, setTimeLeft] = useState(300);
  const { colors } = useAppTheme();
  const styles = createStyles(colors);

  const formatTime = secs => {
    const minutes = Math.floor(secs / 60);
    const seconds = secs % 60;
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  

 const VerifySignInOTP = async () => {
    Toast.hideAll()
    if (usernameTextValue === '') {
      Toast.show('Please enter OTP',{type:'warning'});
      return;
    }

    const cleanedOTP = usernameTextValue.replace(/ /g, '');
    if (cleanedOTP.length === 0) {
      Toast.show(
        'Please enter OTP',
        {type:'warning'}
      );
      return;
    }

    try {
      setLoadingData(true);

       const apiRequestObject = {
            path: ENDPOINT.verify_otp,
            body: {
        member_id: route.params?.memberID,
        otp: usernameTextValue,
        password: passwordValue,
      }
        }

        const response = await javascriptPost(apiRequestObject);
        console.log(response)
      if (response.status === true) {
        setLoadingData(false);
        Toast.show(
          response.message,
        {type:'success'}
        );
        if (response.status === true) {
          // Assuming loginUserSuccessOTP and navigation to home are handled elsewhere
          navigation.navigate('Login')
        }
      } else {
        setLoadingData(false);
        Toast.show( 'Unable to verify OTP',{type:'danger'});
      }
    } catch (error) {
      setLoadingData(false);
      Toast.show( error.message,{type:'danger'});
    }
  };




  useEffect(() => {
    if (timeLeft <= 0) {
      setCanResend(true);
      return;
    }

    const interval = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [timeLeft]);


 

  const resendOTP = async() => {
       let response = await SigninWithOTPScreenService(route?.params?.memberID)
      if (response.status === true) {
 setTimeLeft(300);
     setCanResend(false);
      Alert.alert('Signin With OTP',response.message||'OTP send successfully');
       }else{
         Alert.alert('Signin With OTP', response.message||'Failed to resend OTP.', [
                            {
                                text: 'OK', onPress: () => {
                                    navigation.navigate('LoginScreen')
                                }
                            },
                        ], { cancelable: false });
       }
  };
  return (
    <AuthScreenLayout  title={'Verify OTP'}>
        <View style={{margin:8}}>
          <Text style={[Loginstyles.versionText, styles.helperText]}>
            Please Enter The Valid OTP For{' '}
            {userType === 'waiter' ? 'User Name' : 'Member ID'}:{' '}
            <Text style={styles.memberText}>
              {route.params?.memberID}
            </Text>
          </Text>
        </View>

        <TextInput
        // ref={userRef}
        placeholderTextColor={colors.placeholder}

        maxLength={6}
        keyboardType="email-address"
        placeholder="Enter Your OTP"
        value={usernameTextValue}
        onChangeText={setUsernameTextValue}
        style={[Loginstyles.input, styles.input]}
        autoCapitalize="none"
        returnKeyType="next"
       
        onSubmitEditing={VerifySignInOTP}
      />
        <TextInput
        // ref={userRef}
           placeholderTextColor={colors.placeholder}
        keyboardType="email-address"
        placeholder="Enter Password"
        value={passwordValue}
        onChangeText={setPasswordValue}
        style={[Loginstyles.input, styles.input]}
        autoCapitalize="none"
        returnKeyType="next"
        onSubmitEditing={VerifySignInOTP}
      />
        {!timeLeft ? (
          <TouchableOpacity style={styles.resendButton} onPress={resendOTP}>
            <Text style={styles.resendText}>Resend OTP</Text>
          </TouchableOpacity>
        ) : (
          <Text style={styles.timerText}>
            Resend OTP in {formatTime(timeLeft)}
          </Text>
        )}
        <Button2
          onPress={VerifySignInOTP}
          text={'Verify OTP'}
          loading={loadingData}
        />
     
    </AuthScreenLayout>
  );
};
export default VerifyForgotPasswordOTPScreen;
const createStyles = colors =>
  StyleSheet.create({
    resendText: { fontFamily: FONT_FAMILY.bold, color: colors.primary },
    timerText: {
      fontFamily: FONT_FAMILY.bold,
      color: colors.primary,
      alignSelf: 'flex-end',
    },
    resendButton: { alignSelf: 'flex-end' },
    helperText: {
      color: colors.textMuted,
    },
    memberText: {
      color: colors.text,
      fontSize: 15,
      fontFamily: FONT_FAMILY.bold,
    },
    input: {
      borderBottomColor: colors.border,
      backgroundColor: colors.surface,
      color: colors.text,
    },
  });


