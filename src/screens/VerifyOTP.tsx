import React, { useEffect, useMemo, useState } from 'react';
import {
  Image,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import messaging from '@react-native-firebase/messaging';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useDispatch } from 'react-redux';
import DeviceInfo from 'react-native-device-info';

import { SigninWithOTPScreenService } from '../services/SigninWithOTPScreenService.ts';
import AuthScreenLayout from '../components/AuthScreenLayout.tsx';
import Button2 from '../components/Button2.tsx';
import AppAlertModal from '../components/feedback/AppAlertModal.tsx';
import { useAppAlert } from '../hooks/useAppAlert.ts';
import { Loginstyles } from '../Styles/LoginStyles.tsx';
import { FONT_FAMILY } from '../util/colors.tsx';
import { loginWithOTP } from '../store/slices/authSlice.tsx';
import { useAppTheme } from '../theme/AppThemeProvider.tsx';

const VerifyOTP = ({ route, navigation }) => {
  const [otpValue, setOtpValue] = useState('');
  const [loadingData, setLoadingData] = useState(false);
  const dispatch = useDispatch();
  const userType = route?.params?.type;
  const [timeLeft, setTimeLeft] = useState(300);
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { alertState, showAlert, hideAlert } = useAppAlert();
  const pulse = useSharedValue(1);

  const formatTime = secs => {
    const minutes = Math.floor(secs / 60);
    const seconds = secs % 60;
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  useEffect(() => {
    if (!loadingData) {
      pulse.value = 1;
      return;
    }

    pulse.value = withRepeat(
      withSequence(
        withTiming(1.06, { duration: 650, easing: Easing.inOut(Easing.quad) }),
        withTiming(0.98, { duration: 650, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      false,
    );
  }, [loadingData, pulse]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  async function getIOSFCMToken() {
    try {
      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (!enabled) {
        return null;
      }

      await messaging().registerDeviceForRemoteMessages();
      await messaging().getAPNSToken();

      return await messaging().getToken();
    } catch (error) {
      return null;
    }
  }

  const verifySignInOTP = async () => {
    if (!otpValue.trim()) {
      showAlert({
        title: 'OTP required',
        message: 'Please enter the OTP sent to continue.',
        tone: 'warning',
      });
      return;
    }

    const permission = await messaging().hasPermission();
    const deviceId = await getIOSFCMToken();
    const version = DeviceInfo.getVersion();

    const payload = {
      member_id: route.params?.memberID,
      otp: otpValue,
      has_notification_permission: permission,
      device_type: Platform.OS.toUpperCase(),
      device_app_version: version,
      device_id: deviceId,
    };

    setLoadingData(true);

    try {
      const apiRequestObject = {
        body: payload,
      };

      const response = await dispatch(
        loginWithOTP({ apiRequestObject }),
      ).unwrap();

      if (!response?.user || !response?.token) {
        showAlert({
          title: 'Verification failed',
          message: 'The server response was incomplete. Please try again.',
          tone: 'danger',
        });
      }
    } catch (error) {
      showAlert({
        title: 'Verification failed',
        message: error || 'OTP verification failed.',
        tone: 'danger',
      });
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    if (timeLeft <= 0) {
      return;
    }

    const interval = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [timeLeft]);

  const resendOTP = async () => {
    const response = await SigninWithOTPScreenService(route?.params?.memberID);

    if (response?.status === true) {
      setTimeLeft(300);
      showAlert({
        title: 'OTP sent again',
        message: response?.message || 'A fresh OTP has been sent successfully.',
        tone: 'success',
      });
      return;
    }

    showAlert({
      title: 'Unable to resend OTP',
      message: response?.message || 'Failed to resend OTP.',
      tone: 'warning',
      primaryLabel: 'Back to Login',
      secondaryLabel: 'Stay here',
      onPrimaryPress: () => navigation.navigate('Login'),
    });
  };

  return (
    <AuthScreenLayout title="Verify OTP">
      <View style={styles.heroCard}>
        <Image
          source={require('../../assets/images/OTPScreen.png')}
          style={styles.heroImage}
          resizeMode="contain"
        />
        <Text style={styles.heroTitle}>Secure OTP Verification</Text>
        <Text style={[Loginstyles.versionText, styles.helperText]}>
          Enter the OTP sent for{' '}
          {userType === 'waiter' ? 'User Name' : 'Member ID'}:{' '}
          <Text style={styles.memberText}>{route.params?.memberID}</Text>
        </Text>
      </View>

      <View style={styles.formCard}>
        <Text style={styles.inputLabel}>One-time password</Text>
        <TextInput
          maxLength={6}
          placeholder="Enter your OTP"
          placeholderTextColor={colors.placeholder}
          value={otpValue}
          onChangeText={setOtpValue}
          style={[Loginstyles.input, styles.input]}
          autoCapitalize="none"
          returnKeyType="done"
          keyboardType="number-pad"
          onSubmitEditing={verifySignInOTP}
        />

        {!timeLeft ? (
          <TouchableOpacity style={styles.resendButton} onPress={resendOTP}>
            <Text style={styles.resendText}>Resend OTP</Text>
          </TouchableOpacity>
        ) : (
          <Text style={styles.timerText}>Resend OTP in {formatTime(timeLeft)}</Text>
        )}

        <Button2 onPress={verifySignInOTP} text="Verify OTP" loading={loadingData} />

        {loadingData ? (
          <Animated.View style={[styles.loaderCard, pulseStyle]}>
            <View style={styles.loaderIconWrap}>
              <View style={styles.loaderDot} />
            </View>
            <View style={styles.loaderTextWrap}>
              <Text style={styles.loaderTitle}>Verifying secure session</Text>
              <Text style={styles.loaderSubtitle}>
                Please stay on this screen while we confirm your OTP and device details.
              </Text>
            </View>
          </Animated.View>
        ) : null}
      </View>

      <AppAlertModal
        visible={alertState.visible}
        title={alertState.title}
        message={alertState.message}
        tone={alertState.tone}
        primaryLabel={alertState.primaryLabel}
        secondaryLabel={alertState.secondaryLabel}
        onPrimaryPress={() => {
          alertState.onPrimaryPress?.();
          hideAlert();
        }}
        onSecondaryPress={() => {
          alertState.onSecondaryPress?.();
          hideAlert();
        }}
        onDismiss={hideAlert}
      />
    </AuthScreenLayout>
  );
};

const createStyles = (colors: any) =>
  StyleSheet.create({
    heroCard: {
      marginTop: 10,
      marginBottom: 18,
      paddingHorizontal: 12,
      alignItems: 'center',
    },
    heroImage: {
      width: 170,
      height: 132,
      marginBottom: 6,
    },
    heroTitle: {
      color: colors.text,
      fontFamily: FONT_FAMILY.bold,
      fontSize: 22,
    },
    helperText: {
      color: colors.textMuted,
      textAlign: 'center',
      marginTop: 10,
      lineHeight: 21,
    },
    memberText: {
      color: colors.text,
      fontSize: 15,
      fontFamily: FONT_FAMILY.bold,
    },
    formCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 26,
      padding: 18,
    },
    inputLabel: {
      color: colors.text,
      fontFamily: FONT_FAMILY.semiBold,
      fontSize: 13,
      marginBottom: 8,
    },
    resendText: {
      fontFamily: FONT_FAMILY.bold,
      color: colors.primary,
    },
    timerText: {
      fontFamily: FONT_FAMILY.bold,
      color: colors.primary,
      alignSelf: 'flex-end',
      marginTop: 2,
    },
    resendButton: {
      alignSelf: 'flex-end',
      marginTop: 2,
    },
    input: {
      borderBottomColor: colors.border,
      backgroundColor: colors.surface,
      color: colors.text,
    },
    loaderCard: {
      marginTop: 10,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: `${colors.primary}30`,
      backgroundColor: `${colors.primary}10`,
      padding: 16,
      flexDirection: 'row',
      alignItems: 'center',
    },
    loaderIconWrap: {
      width: 44,
      height: 44,
      borderRadius: 14,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 14,
    },
    loaderDot: {
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: colors.primary,
    },
    loaderTextWrap: {
      flex: 1,
    },
    loaderTitle: {
      color: colors.text,
      fontFamily: FONT_FAMILY.bold,
      fontSize: 14,
    },
    loaderSubtitle: {
      marginTop: 6,
      color: colors.textMuted,
      fontFamily: FONT_FAMILY.normal,
      fontSize: 12,
      lineHeight: 18,
    },
  });

export default VerifyOTP;
