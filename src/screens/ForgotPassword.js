import { StyleSheet, Text, TextInput } from 'react-native'
import React, { useState } from 'react'
import AuthScreenLayout from '../components/AuthScreenLayout.tsx';
import Button2 from '../components/Button2.tsx';
import { Loginstyles } from '../Styles/LoginStyles.tsx';
import { ENDPOINT } from '../util/constant.ts';
import { javascriptPost } from '../util/api.tsx';
import { Toast } from 'react-native-toast-notifications';
import { useAppTheme } from '../theme/AppThemeProvider.tsx';
const ForgotPassword = ({navigation}) => {

  const [usernameTextValue, setUsernameTextValue] = useState("");
  const [loadingData, setLoadingData] = useState(false);
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const forgotPasswordHandler = async () => {
    Toast.hideAll()
    // navigation.navigate('VerifyForgotPassOTPScreen', { memberID: usernameTextValue })
    const trimmedUsername = usernameTextValue.replace(/ /g, "");

    if (trimmedUsername.length === 0) {
      Toast.show( "Please enter valid Member ID", {
        type: "warning",
      });
      return;
    }

    try {
      setLoadingData(true);
      const apiRequestObject = {
            path: ENDPOINT.forgot_password,
            body: {member_id : trimmedUsername}
        }
        const response = await javascriptPost(apiRequestObject);

      if (response.status) {
        Toast.show(response.message, {
          type: "success",
        });
        navigation.navigate("VerifyForgotPassOTPScreen", {
          memberID: usernameTextValue,
        });
        setUsernameTextValue("");
      } else {
        Toast.show("Failed to send OTP", {
          type: "warning",
        });
        navigation.navigate("LoginScreen");
      }
    } catch (error) {
      console.error("Forgot Password Error:", error);
      Toast.show("An unexpected error occurred", { type: "danger" });
    } finally {
      setLoadingData(false);
    }
  };
  return (
   <AuthScreenLayout title={'Forgot Password'}>
      <Text style={[Loginstyles.inputLabel, styles.label]}>Member ID</Text>
        <TextInput
        style={[Loginstyles.input, styles.input]}
        placeholderTextColor={colors.placeholder}

      onDone={forgotPasswordHandler}
        maxLength={10}
        keyboardType="email-address"
        placeholder="Enter your Member ID (A0000)"
       onSubmitEditing={forgotPasswordHandler}
        onChangeText={setUsernameTextValue}
      />
       <Button2
          onPress={forgotPasswordHandler}
          text={"Forgot Password"}
          loading={loadingData}
        />
   </AuthScreenLayout>
  )
}


export default ForgotPassword
const createStyles = colors =>
  StyleSheet.create({
    label: {
      color: colors.textMuted,
    },
    input: {
      borderBottomColor: colors.border,
      backgroundColor: colors.surface,
      color: colors.text,
    },
  })
