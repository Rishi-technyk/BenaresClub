import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import LoginScreen from "../screens/LoginScreen";
import VerifyOTP from "../screens/VerifyOTP";
import SigninWithOTP from "../screens/SigninWithOTP";
import ForgotPassword from "../screens/ForgotPassword";
import VerifyForgotPassOTPScreen from "../screens/VerifyForgotPasswordOTPScreen";
import StaffLogin from "../screens/KOTStaff/StaffLogin";
import { useAppTheme } from "../theme/AppThemeProvider";

/* ---------------------------------------------------------
   TYPES FOR AUTH NAVIGATION
--------------------------------------------------------- */

export type AuthStackParamList = {
  Login: undefined;
  VerifyOTP: undefined;
  SigninWithOTP: undefined;
  VerifyForgotPassOTPScreen: undefined;
  ForgotPassword: undefined;
  StaffLogin:undefined;
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

/* ---------------------------------------------------------
   AUTH STACK NAVIGATION
--------------------------------------------------------- */

const AuthStack = () => {
  const { colors } = useAppTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        gestureEnabled: true,
        contentStyle: { backgroundColor: colors.background },
        transitionSpec: {
          open: {
            animation: "timing",
            config: { duration: 300 },
          },
          close: {
            animation: "timing",
            config: { duration: 300 },
          },
        },
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="VerifyOTP" component={VerifyOTP} />
      <Stack.Screen name="SigninWithOTP" component={SigninWithOTP} />
      <Stack.Screen name="StaffLogin" component={StaffLogin} />
      <Stack.Screen
        name="VerifyForgotPassOTPScreen"
        component={VerifyForgotPassOTPScreen}
      />
      <Stack.Screen name="ForgotPassword" component={ForgotPassword} />
    </Stack.Navigator>
  );
};

export default AuthStack;

// import React from 'react';
// import {createNativeStackNavigator} from '@react-navigation/native-stack';
// import LoginScreen from '../screens/LoginScreen.js';
// import VerifyOTP from '../screens/VerifyOTP.js';
// import SigninWithOTP from '../screens/SigninWithOTP.js';
// import ForgotPassword from '../screens/ForgotPassword.js';
// import VerifyForgotPassOTPScreen from '../screens/VerifyForgotPasswordOTPScreen.js';


// const Stack = createNativeStackNavigator();


// const AuthStack = () => (
// <Stack.Navigator   screenOptions={{
//         headerShown: false,
//         cardStyle: { backgroundColor: "white" },
//         gestureEnabled: true,
//         // cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
//         transitionSpec: {
//           open: {
//             animation: "timing",
//             config: {
//               duration: 300,
//             },
//           },
//           close: {
//             animation: "timing",
//             config: {
//               duration: 300,
//             },
//           },
//         },
//       }}>
// <Stack.Screen name="Login" component={LoginScreen} />
// <Stack.Screen name="VerifyOTP" component={VerifyOTP} />
// <Stack.Screen name="SigninWithOTP" component={SigninWithOTP} />
// <Stack.Screen name="VerifyForgotPassOTPScreen" component={VerifyForgotPassOTPScreen} />
// <Stack.Screen name="ForgotPassword" component={ForgotPassword} />
// </Stack.Navigator>
// );


// export default AuthStack;