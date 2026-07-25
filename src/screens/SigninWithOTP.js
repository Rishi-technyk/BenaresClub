import { StyleSheet, Text, TextInput } from 'react-native'
import React, { useState } from 'react'
import AuthScreenLayout from '../components/AuthScreenLayout.tsx';
import Button2 from '../components/Button2.tsx';
import { FONT_FAMILY } from '../util/colors.tsx';
import { ENDPOINT } from '../util/constant.ts';
import { Toast } from 'react-native-toast-notifications';
import { javascriptPost } from '../util/api.tsx';
import { useAppTheme } from '../theme/AppThemeProvider.tsx';
const SigninWithOTP = ({navigation}) => {
    
   const [usernameTextValue, setUsernameTextValue] = useState('');
    const [loadingData, setLoadingData] = useState(false);
    const { colors } = useAppTheme();
    const styles = createStyles(colors);



     const signInSendOTP = async () => {
    Toast.hideAll();
    const trimmedUsername = usernameTextValue.replace(/ /g, '');
     
    if (trimmedUsername.length === 0) {
       Toast.show( 'Please enter valid Member ID', 
       {type: 'danger',},
      );
      return;
    }

    setLoadingData(true);
    try {
       const apiRequestObject = {
            path: ENDPOINT.send_OTP_Signin,
            body: {member_id:usernameTextValue}
        }
       const response = await javascriptPost(apiRequestObject);
      setLoadingData(false);
      console.log( response, '---------------------- response ---------------------');
      if (response.status === true) {
        Toast.show(
          response.message,
          {type: 'success',}
        );
        setUsernameTextValue('');
        navigation.navigate('VerifyOTP', {
          memberID: usernameTextValue,
        });
      } else {
        setLoadingData(false);
       Toast.show(
          response.message,
          {type: 'danger',},
        );
        navigation.goBack();
      }
    } catch (error) {
      console.error('Error in signInSendOTP:', error);
      setLoadingData(false);
      Toast.show( 'Failed to send OTP',{type: 'danger',});
    }
  };
  return (
   <AuthScreenLayout title={'Sign In With OTP'}>
    <Text style={[styles.label, {fontFamily:FONT_FAMILY.bold,margin:10}]}>Member ID</Text>
     <TextInput
    //   ref={passRef}
        placeholder="MemberID (A0000)"
        value={usernameTextValue}
        onChangeText={setUsernameTextValue}
        placeholderTextColor={colors.placeholder}

        style={styles.input}
        returnKeyType='done'
        onSubmitEditing={signInSendOTP}
      />

      <Button2
              text={"Send OTP"}
              onPress={signInSendOTP}
              loading={loadingData}
            />
   </AuthScreenLayout>
  )
}

export default SigninWithOTP

const createStyles = colors =>
  StyleSheet.create({
    label: {
      color: colors.text,
    },
    input: {
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      marginBottom: 12,
      padding: 12,
      borderRadius: 8,
      backgroundColor: colors.surface,
      color: colors.text,
    },
  })