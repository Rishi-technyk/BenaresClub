import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  NativeModules,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import LottieView from 'lottie-react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSelector } from 'react-redux';
import { useQueryClient } from '@tanstack/react-query';
// import InAppBrowser from 'react-native-inappbrowser-reborn';
import RazorpayCheckout from 'react-native-razorpay';
import { getway as APP_GATEWAY, APP_NAME } from '@env';

import Header from '../../components/Header';
import DetailSection from '../../components/booking/DetailSection';
import PaymentSummaryCard from '../../components/payment/PaymentSummaryCard';
import StatusTimeline from '../../components/timeline/StatusTimeline';
import EmptyStateCard from '../../components/booking/EmptyStateCard';
import { AppStackParamList } from '../../navigation/AppDrawer';
import { RootState } from '../../store/store';
import { useAppTheme } from '../../theme/AppThemeProvider';
import { FONT_FAMILY } from '../../util/colors';
import { ENDPOINT } from '../../util/constant';
import { javascriptGet, javascriptPost } from '../../util/api';
import { usePaymentStatus } from '../../hooks/usePaymentStatus';
import AppAlertModal from '../../components/feedback/AppAlertModal';
import { useAppAlert } from '../../hooks/useAppAlert';

type Props = NativeStackScreenProps<AppStackParamList, 'UniversalPayment'>;
type PaymentUiStatus = 'processing' | 'success' | 'failed' | 'pending';

const POLL_INTERVAL_MS = 2200;
const POLL_ATTEMPTS = 7;

const wait = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

const parseSdkResponse = (value: any) => {
  if (typeof value !== 'string') {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch (error) {
    return value;
  }
};

const normalizePaymentError = (error: any) => {
  if (!error) {
    return {};
  }

  if (typeof error === 'string') {
    return { description: error, message: error };
  }

  return error?.error || error?.details?.error || error?.details || error;
};

const isBlankGatewayText = (value?: any) => {
  const normalized = String(value || '').trim().toLowerCase();
  return !normalized || normalized === 'undefined' || normalized === 'null';
};

const getPaymentFailureMessage = (error: any, fallback = 'Payment could not be completed.') => {
  const normalized = normalizePaymentError(error);
  const message =
    normalized?.description ||
    normalized?.message ||
    normalized?.reason ||
    error?.description ||
    error?.message;

  return isBlankGatewayText(message) ? fallback : String(message);
};

const isPaymentCancelledByUser = (error: any) => {
  const normalized = normalizePaymentError(error);
  const searchable = [
    normalized?.code,
    normalized?.description,
    normalized?.message,
    normalized?.reason,
    normalized?.source,
    normalized?.step,
    error?.code,
    error?.description,
    error?.message,
  ]
    .filter(value => value !== undefined && value !== null)
    .map(value => String(value).toLowerCase());

  if (
    normalized?.code === 0 ||
    error?.code === 0 ||
    searchable.some(value => value.includes('cancel') || value.includes('dismiss') || value.includes('closed'))
  ) {
    return true;
  }

  return (
    String(normalized?.code || '').toUpperCase() === 'BAD_REQUEST_ERROR' &&
    isBlankGatewayText(normalized?.description) &&
    String(normalized?.source || '').toLowerCase() === 'customer' &&
    String(normalized?.step || '').toLowerCase() === 'payment_authentication'
  );
};

const initializeEasebuzzCheckout = async (accessKey: string, payMode: string) => {
  const easebuzzModule =
    NativeModules?.EasebuzzCheckout ||
    NativeModules?.EasebuzzRn ||
    NativeModules?.Easebuzz ||
    null;

  const launcher =
    easebuzzModule?.openPayment?.bind(easebuzzModule) ||
    easebuzzModule?.initiatePayment?.bind(easebuzzModule) ||
    easebuzzModule?.payWithEasebuzz?.bind(easebuzzModule) ||
    null;

  if (!launcher) {
    throw new Error('Easebuzz SDK is not available on this build.');
  }

  const response = await launcher(accessKey, payMode);
  return parseSdkResponse(response);
};

const isTerminalStatus = (status?: string | null) => {
  const normalized = String(status || '').toLowerCase();
  return (
    normalized.includes('success') ||
    normalized.includes('paid') ||
    normalized.includes('failed') ||
    normalized.includes('cancel') ||
    normalized.includes('refund')
  );
};

const mapStatusToUi = (status?: string | null): PaymentUiStatus => {
  const normalized = String(status || '').toLowerCase();

  if (normalized.includes('success') || normalized.includes('paid')) {
    return 'success';
  }

  if (normalized.includes('cancel')) {
    return 'failed';
  }

  if (normalized.includes('fail')) {
    return 'failed';
  }

  if (normalized.includes('pending') || normalized.includes('process') || normalized.includes('initiat')) {
    return 'pending';
  }

  return 'processing';
};

const UniversalPaymentScreen: React.FC<Props> = ({ navigation, route }) => {
  const { colors } = useAppTheme();
  const { buildPaymentTimeline, resolveTone } = usePaymentStatus();
  const queryClient = useQueryClient();
  const userData = useSelector((state: RootState) => state.auth);
  const { orderData, type } = route.params;
  const startedRef = useRef(false);
  const pollingRef = useRef(false);
  const scale = useSharedValue(0.92);
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(18);
  const shake = useSharedValue(0);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [phase, setPhase] = useState('Preparing secure checkout');
  const [status, setStatus] = useState<PaymentUiStatus>('processing');
  const [errorMessage, setErrorMessage] = useState('');
  const [paymentResult, setPaymentResult] = useState<any>(null);
  const [statusPayload, setStatusPayload] = useState<any>(null);
  const { alertState, showAlert, hideAlert } = useAppAlert();
  const configuredGateway = String(APP_GATEWAY || '')
    .replace(/['"]/g, '')
    .trim()
    .toLowerCase();

  const paymentConfig = useMemo(() => {
    const gateway = orderData?.gateway ?? {};
    const checkout = orderData?.checkout ?? {};
    const statusReference =
      orderData?.status_reference ||
      orderData?.merchant_order_id ||
      orderData?.txnid ||
      orderData?.order_id;

    return {
      amount: Number(orderData?.amount || 0),
      orderId: orderData?.order_id,
      merchantOrderId: orderData?.merchant_order_id || orderData?.txnid || null,
      transactionId: orderData?.transaction_id || null,
      accessKey:
        checkout?.access_key ||
        checkout?.accessKey ||
        checkout?.session_id ||
        orderData?.access_key ||
        orderData?.payment_session_id ||
        null,
      checkoutType: checkout?.type || (orderData?.razorpayKey ? 'native' : 'hosted'),
      checkoutUrl: checkout?.payment_url || orderData?.payment_url || null,
      gatewayName: gateway?.name || checkout?.provider || (orderData?.razorpayKey ? 'Razorpay' : 'Payment Gateway'),
      gatewaySlug: gateway?.slug || checkout?.provider || (orderData?.razorpayKey ? 'razorpay' : null),
      environment: gateway?.environment || checkout?.environment || 'test',
      brandColor: gateway?.branding?.primary || colors.primary,
      razorpayKey: checkout?.key || orderData?.razorpayKey || null,
      statusReference,
      statusEndpoint:
        orderData?.status_endpoint ||
        (statusReference ? `${ENDPOINT.centralized_payment_status}${statusReference}` : null),
      retryEndpoint:
        orderData?.retry_endpoint ||
        (statusReference ? `${ENDPOINT.centralized_payment_retry}${statusReference}` : null),
      verifyEndpoint: orderData?.verify_endpoint || orderData?.end_point || null,
      isCentralized: Boolean(orderData?.status_reference || orderData?.gateway || orderData?.checkout),
    };
  }, [colors.primary, orderData]);

  const resolvedGatewaySlug = useMemo(() => {
    const fromPayload = String(paymentConfig.gatewaySlug || '').trim().toLowerCase();
    return fromPayload || configuredGateway || '';
  }, [configuredGateway, paymentConfig.gatewaySlug]);

  const invalidateRelatedQueries = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['transactions'] });

    if (type === 'Recharge') {
      queryClient.invalidateQueries({ queryKey: ['card_balance'] });
      queryClient.invalidateQueries({ queryKey: ['recharge_dashboard'] });
    }

    if (type === 'Bill') {
      queryClient.invalidateQueries({ queryKey: ['statements'] });
      queryClient.invalidateQueries({ queryKey: ['statement_dashboard'] });
    }

    if (type.includes('Booking') || type === 'Activity') {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    }
  }, [queryClient, type]);

  const setOutcomeState = useCallback(
    (nextStatus: PaymentUiStatus, nextPhase?: string) => {
      setStatus(nextStatus);
      if (nextPhase) {
        setPhase(nextPhase);
      }

      if (nextStatus === 'success') {
        scale.value = withSpring(1, { damping: 9, stiffness: 120 });
        opacity.value = withTiming(1, { duration: 320 });
        translateY.value = withTiming(0, { duration: 360 });
      }

      if (nextStatus === 'failed') {
        opacity.value = withTiming(1, { duration: 260 });
        shake.value = withSequence(
          withTiming(-10, { duration: 55 }),
          withTiming(10, { duration: 55 }),
          withTiming(-8, { duration: 55 }),
          withTiming(8, { duration: 55 }),
          withTiming(0, { duration: 55 }),
        );
      }
    },
    [opacity, scale, shake, translateY],
  );

  const animatedCardStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  const animatedIconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { translateX: shake.value }],
  }));

  const syncLegacyFailure = useCallback(
    async (reason?: string) => {
      if (!paymentConfig.verifyEndpoint || paymentConfig.isCentralized) {
        return;
      }

      try {
        await javascriptPost({
          path: paymentConfig.verifyEndpoint,
          body: {
            razorpay_order_id: paymentConfig.orderId,
            razorpay_payment_id: null,
            razorpay_signature: null,
            status: false,
            failure_reason: reason || 'Payment failed',
          },
          Token: userData?.token,
        });
      } catch (error) {
        console.log('Failure sync error', error);
      }
    },
    [paymentConfig, userData?.token],
  );

  const applyStatusPayload = useCallback(
    (payload?: any) => {
      if (!payload) {
        return false;
      }

      setStatusPayload(payload);

      const nextUiStatus = mapStatusToUi(
        payload?.payment_status_code || payload?.payment_status,
      );
      const nextPhase =
        nextUiStatus === 'success'
          ? 'Payment verified successfully'
          : nextUiStatus === 'failed'
          ? 'Payment could not be completed'
          : 'Payment is waiting for final confirmation';

      setOutcomeState(nextUiStatus, nextPhase);
      setLoading(false);
      setRefreshing(false);

      if (nextUiStatus === 'success') {
        invalidateRelatedQueries();
      }

      return isTerminalStatus(payload?.payment_status_code || payload?.payment_status);
    },
    [invalidateRelatedQueries, setOutcomeState],
  );

  const fetchTransactionStatus = useCallback(async () => {
    if (!paymentConfig.statusEndpoint) {
      return null;
    }

    const response = await javascriptGet({
      path: paymentConfig.statusEndpoint,
      Token: userData?.token,
    });

    if (response?.status && response?.data) {
      applyStatusPayload(response.data);
    }

    return response;
  }, [applyStatusPayload, paymentConfig.statusEndpoint, userData?.token]);

  const routeAfterSuccess = useCallback(
    (response?: any) => {
      const bookingId = response?.booking_id || response?.data?.booking_id;

      if (bookingId) {
        navigation.replace('EventBookingDetails', { bookingId });
      }
    },
    [navigation],
  );

  const finalizeThroughEndpoint = useCallback(
    async (payload: Record<string, any> = {}) => {
      if (!paymentConfig.verifyEndpoint) {
        return null;
      }
      console.log( paymentConfig.verifyEndpoint, '---------------------- apiRes ---------------------');

      const apiRes = await javascriptPost({
        path: paymentConfig.verifyEndpoint,
        body: {
          transaction_id: paymentConfig.transactionId,
          merchant_order_id: paymentConfig.merchantOrderId,
          gateway_order_id: paymentConfig.orderId,
          order_id: paymentConfig.orderId,
          status_reference: paymentConfig.statusReference,
          ...payload,
        },
        Token: userData?.token,
      });
console.log( apiRes, '---------------------- apiRes ---------------------');
      setPaymentResult(apiRes?.data || apiRes || null);

      if (apiRes?.success || apiRes?.status) {
        setOutcomeState('success', 'Payment verified successfully');
        invalidateRelatedQueries();
        routeAfterSuccess(apiRes);
      } else {
        setOutcomeState('failed', apiRes?.message || 'Payment verification failed');
        setErrorMessage(apiRes?.message || 'Payment verification failed');
      }

      setLoading(false);
      return apiRes;
    },
    [
      invalidateRelatedQueries,
      paymentConfig.orderId,
      paymentConfig.merchantOrderId,
      paymentConfig.statusReference,
      paymentConfig.transactionId,
      paymentConfig.verifyEndpoint,
      routeAfterSuccess,
      setOutcomeState,
      userData?.token,
    ],
  );

  const verifyThroughEndpoint = useCallback(
    async (payload: Record<string, any>) => {
      if (!paymentConfig.verifyEndpoint) {
        throw new Error('Missing verify endpoint');
      }
      return finalizeThroughEndpoint(payload);
    },
    [finalizeThroughEndpoint, paymentConfig.verifyEndpoint],
  );

  useEffect(() => {
    if (resolvedGatewaySlug !== 'cashfree') {
      return undefined;
    }

    CFPaymentGatewayService.setCallback({
      onVerify: async (orderID: string) => {
        setPhase('Verifying payment confirmation');

        try {
          await verifyThroughEndpoint({
            payment_gateway: 'cashfree',
            transaction_id: paymentConfig.transactionId,
            merchant_order_id: paymentConfig.merchantOrderId,
            gateway_order_id: orderID,
            order_id: orderID,
            status_reference: paymentConfig.statusReference,
          });
        } catch (error: any) {
          const message = error?.message || 'Payment verification failed';
          await syncLegacyFailure(message);
          setErrorMessage(message);
          setOutcomeState('failed', message);
          setLoading(false);
        }
      },
      onError: async (error: CFErrorResponse) => {
        const message =
          (error as any)?.message ||
          (error as any)?.status ||
          'Payment could not be completed.';

        await syncLegacyFailure(message);
        setErrorMessage(message);
        setOutcomeState('failed', message);
        setLoading(false);
      },
    });

    return () => {
      CFPaymentGatewayService.removeCallback();
    };
  }, [
    paymentConfig.merchantOrderId,
    paymentConfig.statusReference,
    paymentConfig.transactionId,
    resolvedGatewaySlug,
    setOutcomeState,
    setPhase,
    syncLegacyFailure,
    verifyThroughEndpoint,
  ]);

  const pollForFinalStatus = useCallback(
    async (attempts = POLL_ATTEMPTS) => {
      if (!paymentConfig.statusEndpoint || pollingRef.current) {
        return false;
      }

      pollingRef.current = true;
      setPhase('Checking payment confirmation');

      try {
        for (let attempt = 0; attempt < attempts; attempt += 1) {
          const response = await fetchTransactionStatus();
          const currentStatus =
            response?.data?.payment_status_code || response?.data?.payment_status;

          if (isTerminalStatus(currentStatus)) {
            if (
              mapStatusToUi(currentStatus) === 'success' &&
              paymentConfig.verifyEndpoint
            ) {
              await finalizeThroughEndpoint();
            }
            return true;
          }

          await wait(POLL_INTERVAL_MS);
        }

        setOutcomeState('pending', 'Return to the app after gateway confirmation');
        setLoading(false);
        return false;
      } finally {
        pollingRef.current = false;
      }
    },
    [
      fetchTransactionStatus,
      finalizeThroughEndpoint,
      paymentConfig.statusEndpoint,
      paymentConfig.verifyEndpoint,
      setOutcomeState,
    ],
  );

  const openHostedCheckout = useCallback(async () => {
    if (!paymentConfig.checkoutUrl) {
      throw new Error('Missing hosted checkout url');
    }

    setPhase('Opening secure hosted checkout');

    if (await InAppBrowser.isAvailable()) {
      await InAppBrowser.open(paymentConfig.checkoutUrl, {
        dismissButtonStyle: 'close',
        preferredBarTintColor: colors.surface,
        preferredControlTintColor: colors.text,
        readerMode: false,
        animated: true,
        modalPresentationStyle: 'fullScreen',
        modalEnabled: true,
        showTitle: true,
        toolbarColor: colors.surface,
        secondaryToolbarColor: colors.background,
        enableUrlBarHiding: true,
        enableDefaultShare: false,
      });
    } else {
      await Linking.openURL(paymentConfig.checkoutUrl);
    }

    if (paymentConfig.statusEndpoint) {
      await pollForFinalStatus();
      return;
    }

    setOutcomeState('pending', 'Complete the payment and refresh to confirm status');
    setLoading(false);
  }, [
    colors.background,
    colors.surface,
    colors.text,
    paymentConfig.checkoutUrl,
    paymentConfig.statusEndpoint,
    pollForFinalStatus,
    setOutcomeState,
  ]);

  const openRazorpayCheckout = useCallback(async () => {
console.log( paymentConfig.razorpayKey,'---------------------- paymentConfig.razorpayKey, ---------------------');
    const options = {
      key: paymentConfig.razorpayKey,
      order_id: paymentConfig.orderId,
      amount: Math.round(paymentConfig.amount * 100),
      currency: 'INR',
      name: APP_NAME,
      
       image: "https://www.lgc.in/wp-content/uploads/2026/01/lgclogo.png",
      description: type,
      prefill: {
        name: userData?.user?.DisplayName,
        email: userData?.user?.Email,
        contact: userData?.user?.Mobile,
      },
      theme: {
        color: colors.primary,
        
      },
      notes: {
        MemberID: userData?.user?.MemberID || '',
        SC_ID: userData?.user?.SC_ID || '',
        BookingType: type,
      },
      
      
    };

    setPhase('Opening native payment checkout');
    console.log( options, '---------------------- result ---------------------');
    try {
      const result = await RazorpayCheckout.open(options);
      return verifyThroughEndpoint({
        ...result,
        transaction_id: paymentConfig.transactionId,
        merchant_order_id: paymentConfig.merchantOrderId,
        gateway_order_id: paymentConfig.orderId,
      });
    } catch (error: any) {
      console.error(error)
      if (isPaymentCancelledByUser(error)) {
        const message = 'Payment cancelled by user. You can retry whenever you are ready.';
        setErrorMessage(message);
        setOutcomeState('failed', 'Payment cancelled');
        setLoading(false);
        return null;
      }

      throw new Error(getPaymentFailureMessage(error));
    }
  }, [
    paymentConfig.amount,
    paymentConfig.brandColor,
    paymentConfig.gatewayName,
    paymentConfig.merchantOrderId,
    paymentConfig.orderId,
    paymentConfig.razorpayKey,
    paymentConfig.transactionId,
    type,
    userData?.user?.DisplayName,
    userData?.user?.Email,
    userData?.user?.MemberID,
    userData?.user?.Mobile,
    userData?.user?.SC_ID,
    setOutcomeState,
    verifyThroughEndpoint,
  ]);

  const openCashfreeCheckout = useCallback(async () => {
    const paymentSessionId =
      paymentConfig.accessKey ||
      orderData?.payment_session_id ||
      null;
    const orderId =
      paymentConfig.orderId ||
      paymentConfig.merchantOrderId ||
      paymentConfig.statusReference;

    if (!paymentSessionId || !orderId) {
      if (paymentConfig.checkoutUrl) {
        await openHostedCheckout();
        return;
      }

      throw new Error('Cashfree checkout credentials are missing.');
    }

    const environmentLabel = String(
      orderData?.Environment || paymentConfig.environment || 'SANDBOX',
    
    ).toUpperCase();
    console.log(environmentLabel, '----------------------environmentLabel ---------------------');
    const cashfreeEnvironment =
      environmentLabel === 'PROD' ||
      environmentLabel === 'LIVE' ||
      environmentLabel === 'PRODUCTION'
        ? CFEnvironment.PRODUCTION
        : CFEnvironment.SANDBOX;

    setPhase('Opening native payment checkout');

    const session = new CFSession(paymentSessionId, orderId, cashfreeEnvironment);
    await CFPaymentGatewayService.doWebPayment(session);
  }, [
    openHostedCheckout,
    orderData?.Environment,
    orderData?.payment_session_id,
    paymentConfig.accessKey,
    paymentConfig.checkoutUrl,
    paymentConfig.environment,
    paymentConfig.merchantOrderId,
    paymentConfig.orderId,
    paymentConfig.statusReference,
  ]);

const openEasebuzzCheckout = useCallback(async () => {
    try {
      const checkout = orderData?.checkout || {};
      const accessKey =
        paymentConfig.accessKey ||
        checkout?.access_key ||
        checkout?.accessKey ||
        orderData?.access_key ||
        null;

      if (!accessKey) {
        if (paymentConfig.checkoutUrl) {
          await openHostedCheckout();
          return;
        }

        throw new Error('Easebuzz checkout credentials are missing.');
      }

      const payMode = paymentConfig.environment === 'live' ? 'production' : 'test';
      const response = await initializeEasebuzzCheckout(accessKey, payMode);
      const merchantOrderId =
        response?.txnid ||
        paymentConfig.merchantOrderId ||
        orderData?.txnid ||
        paymentConfig.statusReference;

      await verifyThroughEndpoint({
        payment_gateway: 'easebuzz',
        transaction_id: paymentConfig.transactionId,
        merchant_order_id: merchantOrderId,
        gateway_order_id: paymentConfig.orderId || merchantOrderId,
        order_id: paymentConfig.orderId || merchantOrderId,
        status_reference: paymentConfig.statusReference,
        txnid: merchantOrderId,
        payment_response: response,
        transaction_response: response,
        result: response,
      });
    } catch (error: any) {
      const message = error?.description || error?.message || 'Payment failed';

      await syncLegacyFailure(message);
      setErrorMessage(message);
      setOutcomeState('failed', message);
    }
  }, [
    openHostedCheckout,
    orderData,
    paymentConfig.accessKey,
    paymentConfig.checkoutUrl,
    paymentConfig.environment,
    paymentConfig.merchantOrderId,
    paymentConfig.orderId,
    paymentConfig.statusReference,
    paymentConfig.transactionId,
    setOutcomeState,
    syncLegacyFailure,
    verifyThroughEndpoint,
  ]);
  const startPayment = useCallback(async () => {
    if (startedRef.current) {
      return;
    }

    startedRef.current = true;
    setLoading(true);
    setErrorMessage('');
    scale.value = 0.92;
    opacity.value = 0;
    translateY.value = 18;
console.log( paymentConfig.razorpayKey ,paymentConfig.orderId, '---------------------- paymentConfig.razorpayKey && paymentConfig.orderId ---------------------');
    try {
      if (
        resolvedGatewaySlug === 'cashfree' &&
        paymentConfig.accessKey &&
        (paymentConfig.orderId || paymentConfig.merchantOrderId || paymentConfig.statusReference)
      ) {
        await openCashfreeCheckout();
        return;
      }

      if (paymentConfig.razorpayKey && paymentConfig.orderId) {
        await openRazorpayCheckout();
        return;
      }
      if (resolvedGatewaySlug === 'easebuzz') {
        await openEasebuzzCheckout();
        return;
      }
      if (paymentConfig.checkoutUrl) {
        await openHostedCheckout();
        return;
      }

      if (paymentConfig.statusEndpoint) {
        await pollForFinalStatus(1);
        return;
      }

      throw new Error('This payment payload is missing checkout metadata.');
    } catch (error: any) {
      const message = getPaymentFailureMessage(error, 'Payment could not be started.');

      if (isPaymentCancelledByUser(error)) {
        const cancelMessage = 'Payment cancelled by user. You can retry whenever you are ready.';
        setErrorMessage(cancelMessage);
        setOutcomeState('failed', 'Payment cancelled');
        setLoading(false);
        return;
      }

      console.log( message, '---------------------- message ---------------------');
      await syncLegacyFailure(message);
      setErrorMessage(message);
      setOutcomeState('failed', 'Payment flow was interrupted');
      setLoading(false);
      showAlert({
        title: 'Payment interrupted',
        message,
        tone: 'danger',
      });
    }
  }, [
    openCashfreeCheckout,
    openHostedCheckout,
    openEasebuzzCheckout,
    openRazorpayCheckout,
    paymentConfig.checkoutUrl,
    paymentConfig.accessKey,
    paymentConfig.merchantOrderId,
    paymentConfig.orderId,
    paymentConfig.razorpayKey,
    paymentConfig.statusEndpoint,
    paymentConfig.statusReference,
    pollForFinalStatus,
    resolvedGatewaySlug,
    scale,
    opacity,
    setOutcomeState,
    showAlert,
    syncLegacyFailure,
    translateY,
  ]);

  useEffect(() => {
    startPayment();
  }, [startPayment]);

  const onRefresh = useCallback(async () => {
    if (!paymentConfig.statusEndpoint) {
      return;
    }

    try {
      setRefreshing(true);
      await fetchTransactionStatus();
    } catch (error) {
      showAlert({
        title: 'Refresh unavailable',
        message: 'Unable to refresh payment status right now.',
        tone: 'warning',
      });
    } finally {
      setRefreshing(false);
    }
  }, [fetchTransactionStatus, paymentConfig.statusEndpoint, showAlert]);

  const retryPayment = useCallback(async () => {
    try {
      setRetrying(true);
      setErrorMessage('');

      if (paymentConfig.isCentralized && paymentConfig.retryEndpoint) {
        const response = await javascriptPost({
          path: paymentConfig.retryEndpoint,
          body: {},
          Token: userData?.token,
        });

        if (response?.status && response?.data) {
          navigation.replace('UniversalPayment', {
            type,
            orderData: response.data,
          });
          return;
        }
      }

      startedRef.current = false;
      await startPayment();
    } catch (error) {
      showAlert({
        title: 'Retry unavailable',
        message: 'Unable to retry payment right now.',
        tone: 'danger',
      });
    } finally {
      setRetrying(false);
    }
  }, [
    navigation,
    paymentConfig.isCentralized,
    paymentConfig.retryEndpoint,
    showAlert,
    startPayment,
    type,
    userData?.token,
  ]);

  const paymentSnapshot = useMemo(() => {
    const statusText =
      paymentResult?.Status ||
      statusPayload?.payment_status ||
      (status === 'success'
        ? 'Success'
        : status === 'failed'
        ? 'Failed'
        : status === 'pending'
        ? 'Pending'
        : 'Processing');

    return {
      gateway_name: statusPayload?.gateway_name || paymentConfig.gatewayName,
      status: statusText,
      payment_status: statusText,
      status_code: statusPayload?.payment_status_code || status,
      amount:
        paymentResult?.paid_amount ||
        statusPayload?.amount ||
        paymentConfig.amount,
      reference_number:
        paymentResult?.reference_number ||
        statusPayload?.gateway_transaction_id ||
        statusPayload?.gateway_order_id ||
        paymentConfig.orderId,
      gateway_order_id:
        paymentResult?.orderId ||
        statusPayload?.order_id ||
        paymentConfig.orderId,
      created_at: statusPayload?.created_at || null,
      initiated_at: statusPayload?.created_at || null,
      processed_at: statusPayload?.processed_at || null,
      transaction_date: statusPayload?.processed_at || null,
      retry_count: statusPayload?.retry_count || 0,
    };
  }, [paymentConfig.amount, paymentConfig.gatewayName, paymentConfig.orderId, paymentResult, status, statusPayload]);

  const paymentTimeline = buildPaymentTimeline(paymentSnapshot);
  const statusTone = resolveTone(paymentSnapshot.status);
  const retryActionStyle = useMemo(
    () => [
      styles.primaryAction,
      { backgroundColor: colors.primary },
      retrying ? styles.disabledAction : null,
    ],
    [colors.primary, retrying],
  );

  const paymentWasCancelled = status === 'failed' && phase === 'Payment cancelled';
  const headline =
    status === 'success'
      ? 'Payment successful'
      : paymentWasCancelled
      ? 'Payment cancelled'
      : status === 'failed'
      ? 'Payment failed'
      : status === 'pending'
      ? 'Awaiting confirmation'
      : 'Processing payment';

  const supportingText =
    status === 'success'
      ? 'The transaction is verified and the related booking or balance updates are being reflected.'
      : status === 'failed'
      ? errorMessage || 'We could not complete the payment. You can retry from here.'
      : status === 'pending'
      ? 'We are waiting for the gateway to confirm the payment. Pull to refresh or check again.'
      : 'Please stay on this screen while we complete the secure payment handshake.';

  const canRetry = status === 'failed' || status === 'pending';

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header title="Payment Status" toHome />

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        <View
          style={[
            styles.heroCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              shadowColor: colors.overlay,
            },
          ]}
        >
          <View
            style={[
              styles.statusOrb,
              { backgroundColor: statusTone.background, borderColor: statusTone.border },
            ]}
          >
            {status === 'processing' || loading ? (
              <LottieView
                autoPlay
                loop
                source={require('../Animations/wave_animation.json')}
                style={styles.statusAnimation}
              />
            ) : (
              <Animated.View style={animatedIconStyle}>
                <LottieView
                  autoPlay
                  loop={status !== 'success'}
                  source={
                    status === 'success'
                      ? require('../Animations/Success.json')
                      : require('../Animations/Cross_loop.json')
                  }
                  style={styles.statusAnimation}
                />
              </Animated.View>
            )}
          </View>

          <View style={styles.heroCopy}>
            <Text style={[styles.gatewayEyebrow, { color: colors.textMuted }]}>
              {paymentConfig.gatewayName} • {paymentConfig.environment.toUpperCase()}
            </Text>
            <Text style={[styles.heroTitle, { color: colors.text }]}>{headline}</Text>
            <Text style={[styles.heroSubtitle, { color: colors.textMuted }]}>{supportingText}</Text>
          </View>

          <View
            style={[
              styles.phasePill,
              { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
            ]}
          >
            <Icon name="progress-clock" size={16} color={colors.primary} />
            <Text style={[styles.phaseText, { color: colors.text }]}>{phase}</Text>
          </View>
        </View>

        <Animated.View style={animatedCardStyle}>
          <DetailSection
            title="Payment Summary"
            subtitle="Transaction snapshot with gateway metadata and member context."
            delay={30}
          >
            <PaymentSummaryCard
              status={paymentSnapshot.status}
              items={[
                { label: 'Transaction type', value: type },
                { label: 'Member ID', value: userData?.user?.MemberID || 'N/A' },
                { label: 'SC ID', value: userData?.user?.SC_ID || 'N/A' },
                {
                  label: 'Amount',
                  value: `Rs. ${Number(paymentSnapshot.amount || 0).toFixed(2)}`,
                  emphasize: true,
                },
                { label: 'Gateway order', value: paymentSnapshot.gateway_order_id || 'Pending' },
                { label: 'Reference', value: paymentSnapshot.reference_number || 'Pending' },
                { label: 'Attempts', value: String(paymentSnapshot.retry_count || 0) },
              ]}
            />
          </DetailSection>

       

          <DetailSection
            title="Actions"
            subtitle="Retry, refresh, or return home without losing your payment context."
            delay={130}
          >
            <View style={styles.actionRow}>
              {canRetry ? (
                <Pressable
                  onPress={retryPayment}
                  disabled={retrying}
                  style={retryActionStyle}
                >
                  <Icon name="refresh" size={18} color={colors.onPrimary} />
                  <Text style={[styles.primaryActionText, { color: colors.onPrimary }]}>
                    {retrying ? 'Retrying...' : 'Retry payment'}
                  </Text>
                </Pressable>
              ) : null}

              <Pressable
                onPress={onRefresh}
                style={[
                  styles.secondaryAction,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
              >
                <Icon name="sync" size={18} color={colors.text} />
                <Text style={[styles.secondaryActionText, { color: colors.text }]}>
                  Refresh status
                </Text>
              </Pressable>

              <Pressable
                onPress={() => navigation.navigate('Home')}
                style={[
                  styles.secondaryAction,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
              >
                <Icon name="home-outline" size={18} color={colors.text} />
                <Text style={[styles.secondaryActionText, { color: colors.text }]}>Go home</Text>
              </Pressable>
            </View>
          </DetailSection>
        </Animated.View>
      </ScrollView>

      <AppAlertModal
        visible={alertState.visible}
        title={alertState.title}
        message={alertState.message}
        tone={alertState.tone}
        primaryLabel={alertState.primaryLabel}
        secondaryLabel={alertState.secondaryLabel}
        onDismiss={hideAlert}
        onPrimaryPress={() => {
          hideAlert();
          alertState.onPrimaryPress?.();
        }}
        onSecondaryPress={() => {
          hideAlert();
          alertState.onSecondaryPress?.();
        }}
      />
    </View>
  );
};

export default UniversalPaymentScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
    gap: 10,
  },
  heroCard: {
    borderWidth: 1,
    borderRadius: 28,
    padding: 18,
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  statusOrb: {
    width: 98,
    height: 98,
    borderRadius: 49,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 14,
    overflow: 'hidden',
  },
  statusAnimation: {
    width: 92,
    height: 92,
  },
  heroCopy: {
    alignItems: 'center',
    marginBottom: 16,
  },
  gatewayEyebrow: {
    fontSize: 12,
    letterSpacing: 0.8,
    fontFamily: FONT_FAMILY.medium,
    marginBottom: 8,
  },
  heroTitle: {
    fontSize: 26,
    lineHeight: 30,
    textAlign: 'center',
    fontFamily: FONT_FAMILY.bold,
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    fontFamily: FONT_FAMILY.regular,
  },
  phasePill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  phaseText: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.medium,
  },
  actionRow: {
    gap: 12,
  },
  primaryAction: {
    minHeight: 52,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  disabledAction: {
    opacity: 0.6,
  },
  primaryActionText: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.semiBold,
  },
  secondaryAction: {
    minHeight: 50,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  secondaryActionText: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.medium,
  },
});
// import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
// import {
//   Linking,
//   Platform,
//   Pressable,
//   RefreshControl,
//   ScrollView,
//   StyleSheet,
//   Text,
//   View,
// } from 'react-native';
// import LottieView from 'lottie-react-native';
// // import PayPhiSDK, { PayPhiEnv } from '../../../react-native-payphi-sdk/src';
// import Animated, {
//   useAnimatedStyle,
//   useSharedValue,
//   withSequence,
//   withSpring,
//   withTiming,
// } from 'react-native-reanimated';
// import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
// import { NativeStackScreenProps } from '@react-navigation/native-stack';
// import { useSelector } from 'react-redux';
// import { useQueryClient } from '@tanstack/react-query';
// // import InAppBrowser from 'react-native-inappbrowser-reborn';
// // import RazorpayCheckout from 'react-native-razorpay';
// import InAppBrowser from 'react-native-inappbrowser-reborn';
// import { APP_NAME, getway as APP_GATEWAY } from '@env';

// import Header from '../../components/Header';
// import DetailSection from '../../components/booking/DetailSection';
// import PaymentSummaryCard from '../../components/payment/PaymentSummaryCard';
// import StatusTimeline from '../../components/timeline/StatusTimeline';
// import EmptyStateCard from '../../components/booking/EmptyStateCard';
// import { AppStackParamList } from '../../navigation/AppDrawer';
// import { RootState } from '../../store/store';
// import { useAppTheme } from '../../theme/AppThemeProvider';
// import { FONT_FAMILY } from '../../util/colors';
// import { ENDPOINT } from '../../util/constant';
// import { javascriptGet, javascriptPost } from '../../util/api';
// import { usePaymentStatus } from '../../hooks/usePaymentStatus';
// import AppAlertModal from '../../components/feedback/AppAlertModal';
// import { useAppAlert } from '../../hooks/useAppAlert';

// type Props = NativeStackScreenProps<AppStackParamList, 'UniversalPayment'>;
// type PaymentUiStatus = 'processing' | 'success' | 'failed' | 'pending';
// type CFErrorResponse = any;

// declare const CFPaymentGatewayService: any;
// declare const CFEnvironment: any;
// declare const CFSession: any;
// declare const RazorpayCheckout: any;
// declare const initializeEasebuzzCheckout: any;

// const POLL_INTERVAL_MS = 2200;
// const POLL_ATTEMPTS = 7;
// const HDFC_GATEWAY_SLUGS = new Set([
//   'hdfc',
//   'hdfcbank',
//   'hdfc_bank',
//   'hdfc-bank',
//   'hdfc bank',
//   'payphi',
//   'payphi_hdfc',
//   'hdfc_payphi',
// ]);

// const wait = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

// const pickFirstValue = (...values: any[]) =>
//   values.find(value => !isBlankGatewayText(value)) ?? null;

// const normalizeGatewayValue = (value?: any) =>
//   String(value || '')
//     .replace(/['"]/g, '')
//     .trim()
//     .toLowerCase();

// const isHdfcGateway = (value?: any) => HDFC_GATEWAY_SLUGS.has(normalizeGatewayValue(value));

// const normalizePayPhiEnv = (value?: any) => {
//   const normalized = normalizeGatewayValue(value);

//   if (normalized === 'prod' || normalized === 'production' || normalized === 'live') {
//     return PayPhiEnv.PROD;
//   }

//   if (normalized === 'preprod' || normalized === 'pre-prod') {
//     return PayPhiEnv.PREPROD;
//   }

//   if (normalized === 'qa') {
//     return PayPhiEnv.QA;
//   }

//   if (normalized === 'dev' || normalized === 'development') {
//     return PayPhiEnv.DEV;
//   }

//   return PayPhiEnv.INTEGRATION;
// };

// const parseSdkResponse = (value: any) => {
//   if (typeof value !== 'string') {
//     return value;
//   }

//   try {
//     return JSON.parse(value);
//   } catch (error) {
//     return value;
//   }
// };

// const normalizePaymentError = (error: any) => {
//   if (!error) {
//     return {};
//   }

//   if (typeof error === 'string') {
//     return { description: error, message: error };
//   }

//   return error?.error || error?.details?.error || error?.details || error;
// };

// const isBlankGatewayText = (value?: any) => {
//   const normalized = String(value || '').trim().toLowerCase();
//   return !normalized || normalized === 'undefined' || normalized === 'null';
// };

// const getPaymentFailureMessage = (error: any, fallback = 'Payment could not be completed.') => {
//   const normalized = normalizePaymentError(error);
//   const message =
//     normalized?.description ||
//     normalized?.message ||
//     normalized?.reason ||
//     error?.description ||
//     error?.message;

//   return isBlankGatewayText(message) ? fallback : String(message);
// };

// const isPaymentCancelledByUser = (error: any) => {
//   const normalized = normalizePaymentError(error);
//   const searchable = [
//     normalized?.code,
//     normalized?.description,
//     normalized?.message,
//     normalized?.reason,
//     normalized?.source,
//     normalized?.step,
//     error?.code,
//     error?.description,
//     error?.message,
//   ]
//     .filter(value => value !== undefined && value !== null)
//     .map(value => String(value).toLowerCase());

//   if (
//     normalized?.code === 0 ||
//     error?.code === 0 ||
//     searchable.some(value => value.includes('cancel') || value.includes('dismiss') || value.includes('closed'))
//   ) {
//     return true;
//   }

//   return (
//     String(normalized?.code || '').toUpperCase() === 'BAD_REQUEST_ERROR' &&
//     isBlankGatewayText(normalized?.description) &&
//     String(normalized?.source || '').toLowerCase() === 'customer' &&
//     String(normalized?.step || '').toLowerCase() === 'payment_authentication'
//   );
// };

// // const initializeEasebuzzCheckout = async (accessKey: string, payMode: string) => {
// //   const easebuzzModule =
// //     NativeModules?.EasebuzzCheckout ||
// //     NativeModules?.EasebuzzRn ||
// //     NativeModules?.Easebuzz ||
// //     null;

// //   const launcher =
// //     easebuzzModule?.openPayment?.bind(easebuzzModule) ||
// //     easebuzzModule?.initiatePayment?.bind(easebuzzModule) ||
// //     easebuzzModule?.payWithEasebuzz?.bind(easebuzzModule) ||
// //     null;

// //   if (!launcher) {
// //     throw new Error('Easebuzz SDK is not available on this build.');
// //   }

// //   const response = await launcher(accessKey, payMode);
// //   return parseSdkResponse(response);
// // };

// const isTerminalStatus = (status?: string | null) => {
//   const normalized = String(status || '').toLowerCase();
//   return (
//     normalized.includes('success') ||
//     normalized.includes('paid') ||
//     normalized.includes('failed') ||
//     normalized.includes('cancel') ||
//     normalized.includes('refund')
//   );
// };

// const mapStatusToUi = (status?: string | null): PaymentUiStatus => {
//   const normalized = String(status || '').toLowerCase();

//   if (normalized.includes('success') || normalized.includes('paid')) {
//     return 'success';
//   }

//   if (normalized.includes('cancel')) {
//     return 'failed';
//   }

//   if (normalized.includes('fail')) {
//     return 'failed';
//   }

//   if (normalized.includes('pending') || normalized.includes('process') || normalized.includes('initiat')) {
//     return 'pending';
//   }

//   return 'processing';
// };

// const UniversalPaymentScreen: React.FC<Props> = ({ navigation, route }) => {
//   const { colors } = useAppTheme();
//   const { buildPaymentTimeline, resolveTone } = usePaymentStatus();
//   const queryClient = useQueryClient();
//   const userData = useSelector((state: RootState) => state.auth);
//   const { orderData, type } = route.params;
//   const startedRef = useRef(false);
//   const pollingRef = useRef(false);
//   const scale = useSharedValue(0.92);
//   const opacity = useSharedValue(0);
//   const translateY = useSharedValue(18);
//   const shake = useSharedValue(0);
// console.log( orderData, '---------------------- orderData ---------------------');
//   const [loading, setLoading] = useState(true);
//   const [refreshing, setRefreshing] = useState(false);
//   const [retrying, setRetrying] = useState(false);
//   const [phase, setPhase] = useState('Preparing secure checkout');
//   const [status, setStatus] = useState<PaymentUiStatus>('processing');
//   const [errorMessage, setErrorMessage] = useState('');
//   const [paymentResult, setPaymentResult] = useState<any>(null);
//   const [statusPayload, setStatusPayload] = useState<any>(null);
//   const { alertState, showAlert, hideAlert } = useAppAlert();
//   const configuredGateway = String(APP_GATEWAY || '')
//     .replace(/['"]/g, '')
//     .trim()
//     .toLowerCase();

//   const paymentConfig = useMemo(() => {
//     const rawGateway = orderData?.gateway ?? {};
//     const rawCheckout = orderData?.checkout ?? {};
//     const gateway =
//       typeof rawGateway === 'string'
//         ? { slug: rawGateway, name: rawGateway }
//         : rawGateway;
//     const checkout =
//       typeof rawCheckout === 'string'
//         ? { provider: rawCheckout }
//         : rawCheckout;
//     const statusReference =
//       orderData?.status_reference ||
//       orderData?.merchant_order_id ||
//       orderData?.txnid ||
//       orderData?.order_id;

//     return {
//       amount: Number(orderData?.amount || 0),
//       orderId: orderData?.order_id,
//       merchantOrderId: orderData?.merchant_order_id || orderData?.txnid || null,
//       transactionId: orderData?.transaction_id || null,
//       accessKey:
//         checkout?.access_key ||
//         checkout?.accessKey ||
//         checkout?.session_id ||
//         orderData?.access_key ||
//         orderData?.payment_session_id ||
//         null,
//       checkoutType: checkout?.type || (orderData?.razorpayKey ? 'native' : 'hosted'),
//       checkoutUrl:
//         checkout?.payment_url ||
//         checkout?.paymentUrl ||
//         checkout?.checkout_url ||
//         checkout?.checkoutUrl ||
//         checkout?.redirect_url ||
//         checkout?.redirectUrl ||
//         orderData?.payment_url ||
//         orderData?.paymentUrl ||
//         orderData?.checkout_url ||
//         orderData?.checkoutUrl ||
//         orderData?.redirect_url ||
//         orderData?.redirectUrl ||
//         null,
//       gatewayName:
//         gateway?.name ||
//         gateway?.title ||
//         checkout?.provider ||
//         checkout?.gateway ||
//         (orderData?.razorpayKey ? 'Razorpay' : 'Payment Gateway'),
//       gatewaySlug:
//         gateway?.slug ||
//         gateway?.code ||
//         gateway?.provider ||
//         checkout?.provider ||
//         checkout?.gateway ||
//         orderData?.gateway_slug ||
//         orderData?.gatewaySlug ||
//         (orderData?.razorpayKey ? 'razorpay' : null),
//       environment:
//         gateway?.environment ||
//         checkout?.environment ||
//         orderData?.environment ||
//         orderData?.Environment ||
//         'test',
//       brandColor: gateway?.branding?.primary || colors.primary,
//       razorpayKey: checkout?.key || orderData?.razorpayKey || null,
//       statusReference,
//       statusEndpoint:
//         orderData?.status_endpoint ||
//         (statusReference ? `${ENDPOINT.centralized_payment_status}${statusReference}` : null),
//       retryEndpoint:
//         orderData?.retry_endpoint ||
//         (statusReference ? `${ENDPOINT.centralized_payment_retry}${statusReference}` : null),
//       verifyEndpoint: orderData?.verify_endpoint || orderData?.end_point || null,
//       isCentralized: Boolean(orderData?.status_reference || orderData?.gateway || orderData?.checkout),
//     };
//   }, [colors.primary, orderData]);

//   const resolvedGatewaySlug = useMemo(() => {
//     const fromPayload = String(paymentConfig.gatewaySlug || '').trim().toLowerCase();
//     return normalizeGatewayValue(fromPayload || configuredGateway || '');
//   }, [configuredGateway, paymentConfig.gatewaySlug]);

//   const invalidateRelatedQueries = useCallback(() => {
//     queryClient.invalidateQueries({ queryKey: ['transactions'] });

//     if (type === 'Recharge') {
//       queryClient.invalidateQueries({ queryKey: ['card_balance'] });
//       queryClient.invalidateQueries({ queryKey: ['recharge_dashboard'] });
//     }

//     if (type === 'Bill') {
//       queryClient.invalidateQueries({ queryKey: ['statements'] });
//       queryClient.invalidateQueries({ queryKey: ['statement_dashboard'] });
//     }

//     if (type.includes('Booking') || type === 'Activity') {
//       queryClient.invalidateQueries({ queryKey: ['bookings'] });
//     }
//   }, [queryClient, type]);

//   const setOutcomeState = useCallback(
//     (nextStatus: PaymentUiStatus, nextPhase?: string) => {
//       setStatus(nextStatus);
//       if (nextPhase) {
//         setPhase(nextPhase);
//       }

//       if (nextStatus === 'success') {
//         scale.value = withSpring(1, { damping: 9, stiffness: 120 });
//         opacity.value = withTiming(1, { duration: 320 });
//         translateY.value = withTiming(0, { duration: 360 });
//       }

//       if (nextStatus === 'failed') {
//         opacity.value = withTiming(1, { duration: 260 });
//         shake.value = withSequence(
//           withTiming(-10, { duration: 55 }),
//           withTiming(10, { duration: 55 }),
//           withTiming(-8, { duration: 55 }),
//           withTiming(8, { duration: 55 }),
//           withTiming(0, { duration: 55 }),
//         );
//       }
//     },
//     [opacity, scale, shake, translateY],
//   );

//   const animatedCardStyle = useAnimatedStyle(() => ({
//     opacity: opacity.value,
//     transform: [{ translateY: translateY.value }],
//   }));

//   const animatedIconStyle = useAnimatedStyle(() => ({
//     transform: [{ scale: scale.value }, { translateX: shake.value }],
//   }));

//   const syncLegacyFailure = useCallback(
//     async (reason?: string) => {
//       if (!paymentConfig.verifyEndpoint || paymentConfig.isCentralized) {
//         return;
//       }

//       try {
//         await javascriptPost({
//           path: paymentConfig.verifyEndpoint,
//           body: {
//             razorpay_order_id: paymentConfig.orderId,
//             razorpay_payment_id: null,
//             razorpay_signature: null,
//             status: false,
//             failure_reason: reason || 'Payment failed',
//           },
//           Token: userData?.token,
//         });
//       } catch (error) {
//         console.log('Failure sync error', error);
//       }
//     },
//     [paymentConfig, userData?.token],
//   );

//   const applyStatusPayload = useCallback(
//     (payload?: any) => {
//       if (!payload) {
//         return false;
//       }

//       setStatusPayload(payload);

//       const nextUiStatus = mapStatusToUi(
//         payload?.payment_status_code || payload?.payment_status,
//       );
//       const nextPhase =
//         nextUiStatus === 'success'
//           ? 'Payment verified successfully'
//           : nextUiStatus === 'failed'
//           ? 'Payment could not be completed'
//           : 'Payment is waiting for final confirmation';

//       setOutcomeState(nextUiStatus, nextPhase);
//       setLoading(false);
//       setRefreshing(false);

//       if (nextUiStatus === 'success') {
//         invalidateRelatedQueries();
//       }

//       return isTerminalStatus(payload?.payment_status_code || payload?.payment_status);
//     },
//     [invalidateRelatedQueries, setOutcomeState],
//   );

//   const fetchTransactionStatus = useCallback(async () => {
//     if (!paymentConfig.statusEndpoint) {
//       return null;
//     }

//     const response = await javascriptGet({
//       path: paymentConfig.statusEndpoint,
//       Token: userData?.token,
//     });

//     if (response?.status && response?.data) {
//       applyStatusPayload(response.data);
//     }

//     return response;
//   }, [applyStatusPayload, paymentConfig.statusEndpoint, userData?.token]);

//   const routeAfterSuccess = useCallback(
//     (response?: any) => {
//       const bookingId = response?.booking_id || response?.data?.booking_id;

//       if (bookingId) {
//         navigation.replace('EventBookingDetails', { bookingId });
//       }
//     },
//     [navigation],
//   );

//   const finalizeThroughEndpoint = useCallback(
//     async (payload: Record<string, any> = {}) => {
//       if (!paymentConfig.verifyEndpoint) {
//         return null;
//       }
//       console.log( paymentConfig.verifyEndpoint, '---------------------- apiRes ---------------------');

//       const apiRes = await javascriptPost({
//         path: paymentConfig.verifyEndpoint,
//         body: {
//           transaction_id: paymentConfig.transactionId,
//           merchant_order_id: paymentConfig.merchantOrderId,
//           gateway_order_id: paymentConfig.orderId,
//           order_id: paymentConfig.orderId,
//           status_reference: paymentConfig.statusReference,
//           ...payload,
//         },
//         Token: userData?.token,
//       });
// console.log( apiRes, '---------------------- apiRes ---------------------');
//       setPaymentResult(apiRes?.data || apiRes || null);

//       if (apiRes?.success || apiRes?.status) {
//         setOutcomeState('success', 'Payment verified successfully');
//         invalidateRelatedQueries();
//         routeAfterSuccess(apiRes);
//       } else {
//         setOutcomeState('failed', apiRes?.message || 'Payment verification failed');
//         setErrorMessage(apiRes?.message || 'Payment verification failed');
//       }

//       setLoading(false);
//       return apiRes;
//     },
//     [
//       invalidateRelatedQueries,
//       paymentConfig.orderId,
//       paymentConfig.merchantOrderId,
//       paymentConfig.statusReference,
//       paymentConfig.transactionId,
//       paymentConfig.verifyEndpoint,
//       routeAfterSuccess,
//       setOutcomeState,
//       userData?.token,
//     ],
//   );

//   const verifyThroughEndpoint = useCallback(
//     async (payload: Record<string, any>) => {
//       if (!paymentConfig.verifyEndpoint) {
//         throw new Error('Missing verify endpoint');
//       }
//       return finalizeThroughEndpoint(payload);
//     },
//     [finalizeThroughEndpoint, paymentConfig.verifyEndpoint],
//   );

//   useEffect(() => {
//     if (resolvedGatewaySlug !== 'cashfree') {
//       return undefined;
//     }

//     CFPaymentGatewayService.setCallback({
//       onVerify: async (orderID: string) => {
//         setPhase('Verifying payment confirmation');

//         try {
//           await verifyThroughEndpoint({
//             payment_gateway: 'cashfree',
//             transaction_id: paymentConfig.transactionId,
//             merchant_order_id: paymentConfig.merchantOrderId,
//             gateway_order_id: orderID,
//             order_id: orderID,
//             status_reference: paymentConfig.statusReference,
//           });
//         } catch (error: any) {
//           const message = error?.message || 'Payment verification failed';
//           await syncLegacyFailure(message);
//           setErrorMessage(message);
//           setOutcomeState('failed', message);
//           setLoading(false);
//         }
//       },
//       onError: async (error: CFErrorResponse) => {
//         const message =
//           (error as any)?.message ||
//           (error as any)?.status ||
//           'Payment could not be completed.';

//         await syncLegacyFailure(message);
//         setErrorMessage(message);
//         setOutcomeState('failed', message);
//         setLoading(false);
//       },
//     });

//     return () => {
//       CFPaymentGatewayService.removeCallback();
//     };
//   }, [
//     paymentConfig.merchantOrderId,
//     paymentConfig.statusReference,
//     paymentConfig.transactionId,
//     resolvedGatewaySlug,
//     setOutcomeState,
//     setPhase,
//     syncLegacyFailure,
//     verifyThroughEndpoint,
//   ]);

//   const pollForFinalStatus = useCallback(
//     async (attempts = POLL_ATTEMPTS) => {
//       if (!paymentConfig.statusEndpoint || pollingRef.current) {
//         return false;
//       }

//       pollingRef.current = true;
//       setPhase('Checking payment confirmation');

//       try {
//         for (let attempt = 0; attempt < attempts; attempt += 1) {
//           const response = await fetchTransactionStatus();
//           const currentStatus =
//             response?.data?.payment_status_code || response?.data?.payment_status;

//           if (isTerminalStatus(currentStatus)) {
//             if (
//               mapStatusToUi(currentStatus) === 'success' &&
//               paymentConfig.verifyEndpoint
//             ) {
//               await finalizeThroughEndpoint();
//             }
//             return true;
//           }

//           await wait(POLL_INTERVAL_MS);
//         }

//         setOutcomeState('pending', 'Return to the app after gateway confirmation');
//         setLoading(false);
//         return false;
//       } finally {
//         pollingRef.current = false;
//       }
//     },
//     [
//       fetchTransactionStatus,
//       finalizeThroughEndpoint,
//       paymentConfig.statusEndpoint,
//       paymentConfig.verifyEndpoint,
//       setOutcomeState,
//     ],
//   );

//   const openHostedCheckout = useCallback(async () => {
//     if (!paymentConfig.checkoutUrl) {
//       throw new Error('Missing hosted checkout url');
//     }

//     setPhase('Opening secure hosted checkout');

//     if (await InAppBrowser.isAvailable()) {
//       await InAppBrowser.open(paymentConfig.checkoutUrl, {
//         dismissButtonStyle: 'close',
//         preferredBarTintColor: colors.surface,
//         preferredControlTintColor: colors.text,
//         readerMode: false,
//         animated: true,
//         modalPresentationStyle: 'fullScreen',
//         modalEnabled: true,
//         showTitle: true,
//         toolbarColor: colors.surface,
//         secondaryToolbarColor: colors.background,
//         enableUrlBarHiding: true,
//         enableDefaultShare: false,
//       });
//     } else {
//       await Linking.openURL(paymentConfig.checkoutUrl);
//     }

//     if (paymentConfig.statusEndpoint) {
//       await pollForFinalStatus();
//       return;
//     }

//     setOutcomeState('pending', 'Complete the payment and refresh to confirm status');
//     setLoading(false);
//   }, [
//     colors.background,
//     colors.surface,
//     colors.text,
//     paymentConfig.checkoutUrl,
//     paymentConfig.statusEndpoint,
//     pollForFinalStatus,
//     setOutcomeState,
//   ]);

//   const openRazorpayCheckout = useCallback(async () => {

//     const options = {
//       key: paymentConfig.razorpayKey,
//       order_id: paymentConfig.orderId,
//       amount: Math.round(paymentConfig.amount * 100),
//       currency: 'INR',
//       name: paymentConfig.gatewayName,
//       description: type,
//       prefill: {
//         name: userData?.user?.DisplayName,
//         email: userData?.user?.Email,
//         contact: userData?.user?.Mobile,
//       },
//       theme: {
//         color: paymentConfig.brandColor,
//       },
//       notes: {
//         MemberID: userData?.user?.MemberID || '',
//         SC_ID: userData?.user?.SC_ID || '',
//         BookingType: type,
//       },
//     };

//     setPhase('Opening native payment checkout');
//     console.log( options, '---------------------- result ---------------------');
//     try {
//       const result = await RazorpayCheckout.open(options);
//       return verifyThroughEndpoint({
//         ...result,
//         transaction_id: paymentConfig.transactionId,
//         merchant_order_id: paymentConfig.merchantOrderId,
//         gateway_order_id: paymentConfig.orderId,
//       });
//     } catch (error: any) {
//       if (isPaymentCancelledByUser(error)) {
//         const message = 'Payment cancelled by user. You can retry whenever you are ready.';
//         setErrorMessage(message);
//         setOutcomeState('failed', 'Payment cancelled');
//         setLoading(false);
//         return null;
//       }

//       throw new Error(getPaymentFailureMessage(error));
//     }
//   }, [
//     paymentConfig.amount,
//     paymentConfig.brandColor,
//     paymentConfig.gatewayName,
//     paymentConfig.merchantOrderId,
//     paymentConfig.orderId,
//     paymentConfig.razorpayKey,
//     paymentConfig.transactionId,
//     type,
//     userData?.user?.DisplayName,
//     userData?.user?.Email,
//     userData?.user?.MemberID,
//     userData?.user?.Mobile,
//     userData?.user?.SC_ID,
//     setOutcomeState,
//     verifyThroughEndpoint,
//   ]);

//   const openHdfcCheckout = useCallback(async () => {
//     const checkout = orderData?.checkout || {};
//     const gateway = typeof orderData?.gateway === 'object' ? orderData.gateway : {};
//     const payphi = checkout?.payphi || checkout?.payPhi || gateway?.payphi || orderData?.payphi || {};
//     const amount = Number(paymentConfig.amount || orderData?.amount || 0);
//     const payphiOrderId = pickFirstValue(
//       checkout?.merchant_order_id,
//       checkout?.merchantOrderId,
//       checkout?.order_id,
//       checkout?.orderId,
//       payphi?.merchant_order_id,
//       payphi?.merchantOrderId,
//       payphi?.order_id,
//       payphi?.orderId,
//       paymentConfig.merchantOrderId,
//       paymentConfig.orderId,
//       paymentConfig.statusReference,
//     );

//     if (Platform.OS !== 'android') {
//       if (paymentConfig.checkoutUrl) {
//         await openHostedCheckout();
//         return;
//       }

//       if (paymentConfig.statusEndpoint) {
//         await pollForFinalStatus();
//         return;
//       }

//       throw new Error(
//         'HDFC PayPhi native checkout is available only on Android. Please provide payment_url for iOS.',
//       );
//     }

//     const merchantId = pickFirstValue(
//       checkout?.merchant_id,
//       checkout?.merchantId,
//       gateway?.merchant_id,
//       gateway?.merchantId,
//       payphi?.merchant_id,
//       payphi?.merchantId,
//       orderData?.merchant_id,
//       orderData?.merchantId,
//     );
//     const appId = pickFirstValue(
//       checkout?.app_id,
//       checkout?.appId,
//       gateway?.app_id,
//       gateway?.appId,
//       payphi?.app_id,
//       payphi?.appId,
//       orderData?.app_id,
//       orderData?.appId,
//     );
//     const aggregatorId = pickFirstValue(
//       checkout?.aggregator_id,
//       checkout?.aggregatorId,
//       gateway?.aggregator_id,
//       gateway?.aggregatorId,
//       payphi?.aggregator_id,
//       payphi?.aggregatorId,
//       orderData?.aggregator_id,
//       orderData?.aggregatorId,
//     );
//     const secureToken = pickFirstValue(
//       checkout?.secure_token,
//       checkout?.secureToken,
//       checkout?.token,
//       payphi?.secure_token,
//       payphi?.secureToken,
//       payphi?.token,
//       orderData?.secure_token,
//       orderData?.secureToken,
//       orderData?.token,
//     );
//     const secretKey = pickFirstValue(
//       checkout?.secret_key,
//       checkout?.secretKey,
//       payphi?.secret_key,
//       payphi?.secretKey,
//       orderData?.secret_key,
//       orderData?.secretKey,
//     );

//     if (!merchantId || !appId || !payphiOrderId || !amount) {
//       if (paymentConfig.checkoutUrl) {
//         await openHostedCheckout();
//         return;
//       }

//       throw new Error('HDFC checkout credentials are missing.');
//     }

//     if (!secureToken && !secretKey) {
//       throw new Error('HDFC secure token is missing.');
//     }

//     const currencyCode = String(
//       pickFirstValue(
//         checkout?.currency_code,
//         checkout?.currencyCode,
//         payphi?.currency_code,
//         payphi?.currencyCode,
//         orderData?.currency_code,
//         orderData?.currencyCode,
//         '356',
//       ),
//     );
//     const merchantName = String(
//       pickFirstValue(
//         checkout?.merchant_name,
//         checkout?.merchantName,
//         gateway?.merchant_name,
//         gateway?.merchantName,
//         APP_NAME,
//         paymentConfig.gatewayName,
//       ),
//     );

//     setPhase('Opening HDFC secure checkout');
//     await PayPhiSDK.initialize({
//       env: normalizePayPhiEnv(paymentConfig.environment),
//       merchantId: String(merchantId),
//       appId: String(appId),
//       aggregatorId: aggregatorId ? String(aggregatorId) : '',
//     });
//     await PayPhiSDK.setMerchantName(merchantName);

//     const response = await PayPhiSDK.makePayment({
//       amount,
//       merchantId: String(merchantId),
//       aggregatorId: aggregatorId ? String(aggregatorId) : '',
//       currencyCode,
//       orderId: String(payphiOrderId),
//       customerEmail: userData?.user?.Email || '',
//       secureToken: secureToken ? String(secureToken) : undefined,
//       secretKey: secretKey ? String(secretKey) : undefined,
//       allowDisablePaymentMode: pickFirstValue(checkout?.allowDisablePaymentMode, payphi?.allowDisablePaymentMode),
//       addlParam1: pickFirstValue(checkout?.addlParam1, payphi?.addlParam1),
//       addlParam2: pickFirstValue(checkout?.addlParam2, payphi?.addlParam2),
//       apiVersion: String(pickFirstValue(checkout?.apiVersion, payphi?.apiVersion, '4')),
//       paymentType: pickFirstValue(checkout?.paymentType, payphi?.paymentType),
//       customerId: String(
//         pickFirstValue(
//           checkout?.customer_id,
//           checkout?.customerId,
//           userData?.user?.MemberID,
//           userData?.user?.SC_ID,
//           '',
//         ),
//       ),
//       vpa: pickFirstValue(checkout?.vpa, payphi?.vpa),
//     });

//     const responseCode = response?._resolvedResponseCode || response?.responseCode || response?.txnResponseCode;
//     const isPending = response?._status === 'UPI_PENDING' || responseCode === 'R1000';
//     const merchantTxnNo = response?.merchantTxnNo || payphiOrderId;
//     const gatewayTransactionId = response?.txnAuthID || response?.gatewayTransactionId || response?.txnID;

//     setPaymentResult(response);

//     if (isPending) {
//       if (paymentConfig.statusEndpoint) {
//         await pollForFinalStatus();
//         return;
//       }

//       setOutcomeState('pending', 'Payment is waiting for final confirmation');
//       setLoading(false);
//       return;
//     }

//     if (paymentConfig.verifyEndpoint) {
//       await verifyThroughEndpoint({
//         payment_gateway: 'hdfcbank',
//         transaction_id: paymentConfig.transactionId,
//         merchant_order_id: merchantTxnNo,
//         gateway_order_id: gatewayTransactionId || merchantTxnNo,
//         order_id: merchantTxnNo,
//         status_reference: paymentConfig.statusReference,
//         gateway_transaction_id: gatewayTransactionId,
//         response_code: responseCode,
//         hdfc_response: response,
//         payment_response: response,
//         transaction_response: response,
//         result: response,
//       });
//       return;
//     }

//     if (paymentConfig.statusEndpoint) {
//       await pollForFinalStatus(3);
//       return;
//     }

//     setOutcomeState('success', 'Payment completed successfully');
//     setLoading(false);
//     invalidateRelatedQueries();
//   }, [
//     invalidateRelatedQueries,
//     openHostedCheckout,
//     orderData,
//     paymentConfig.amount,
//     paymentConfig.checkoutUrl,
//     paymentConfig.environment,
//     paymentConfig.gatewayName,
//     paymentConfig.merchantOrderId,
//     paymentConfig.orderId,
//     paymentConfig.statusEndpoint,
//     paymentConfig.statusReference,
//     paymentConfig.transactionId,
//     paymentConfig.verifyEndpoint,
//     pollForFinalStatus,
//     setOutcomeState,
//     userData?.user?.Email,
//     userData?.user?.MemberID,
//     userData?.user?.SC_ID,
//     verifyThroughEndpoint,
//   ]);

//   const openCashfreeCheckout = useCallback(async () => {
//     const paymentSessionId =
//       paymentConfig.accessKey ||
//       orderData?.payment_session_id ||
//       null;
//     const orderId =
//       paymentConfig.orderId ||
//       paymentConfig.merchantOrderId ||
//       paymentConfig.statusReference;

//     if (!paymentSessionId || !orderId) {
//       if (paymentConfig.checkoutUrl) {
//         await openHostedCheckout();
//         return;
//       }

//       throw new Error('Cashfree checkout credentials are missing.');
//     }

//     const environmentLabel = String(
//       orderData?.Environment || paymentConfig.environment || 'SANDBOX',
    
//     ).toUpperCase();
//     console.log(environmentLabel, '----------------------environmentLabel ---------------------');
//     const cashfreeEnvironment =
//       environmentLabel === 'PROD' ||
//       environmentLabel === 'LIVE' ||
//       environmentLabel === 'PRODUCTION'
//         ? CFEnvironment.PRODUCTION
//         : CFEnvironment.SANDBOX;

//     setPhase('Opening native payment checkout');

//     const session = new CFSession(paymentSessionId, orderId, cashfreeEnvironment);
//     await CFPaymentGatewayService.doWebPayment(session);
//   }, [
//     // openHostedCheckout,
//     openHostedCheckout,
//     orderData?.Environment,
//     orderData?.payment_session_id,
//     paymentConfig.accessKey,
//     paymentConfig.checkoutUrl,
//     paymentConfig.environment,
//     paymentConfig.merchantOrderId,
//     paymentConfig.orderId,
//     paymentConfig.statusReference,
//   ]);

// const openEasebuzzCheckout = useCallback(async () => {
//   setTimeout(async () => {
//     try {
//       const checkout = orderData?.checkout || {};
//       const accessKey =
//         paymentConfig.accessKey ||
//         checkout?.access_key ||
//         checkout?.accessKey ||
//         orderData?.access_key||null;

//       if (!accessKey) {
//         if (paymentConfig.checkoutUrl) {
//           await openHostedCheckout();
//           return;
//         }

//         throw new Error('Easebuzz checkout credentials are missing.');
//       }

//       const payMode = paymentConfig.environment === 'live' ? 'production' : 'test';
//       const response = await initializeEasebuzzCheckout(accessKey, payMode);
//       const merchantOrderId =
//         response?.txnid ||
//         paymentConfig.merchantOrderId ||
//         orderData?.txnid ||
//         paymentConfig.statusReference;

//       await verifyThroughEndpoint({
//         payment_gateway: 'easebuzz',
//         transaction_id: paymentConfig.transactionId,
//         merchant_order_id: merchantOrderId,
//         gateway_order_id: paymentConfig.orderId || merchantOrderId,
//         order_id: paymentConfig.orderId || merchantOrderId,
//         status_reference: paymentConfig.statusReference,
//         txnid: merchantOrderId,
//         payment_response: response,
//         transaction_response: response,
//         result: response,
//       });
//     } catch (error: any) {
//       const message = error?.description || error?.message || 'Payment failed';

//       await syncLegacyFailure(message);
//       setErrorMessage(message);
//       setOutcomeState('failed', message);
//     }
//     }, 500);
//   }, [
//     // openHostedCheckout,
//     openHostedCheckout,
//     orderData,
//     paymentConfig.accessKey,
//     paymentConfig.checkoutUrl,
//     paymentConfig.environment,
//     paymentConfig.merchantOrderId,
//     paymentConfig.orderId,
//     paymentConfig.statusReference,
//     paymentConfig.transactionId,
//     setOutcomeState,
//     syncLegacyFailure,
//     verifyThroughEndpoint,
//   ]);
//   const startPayment = useCallback(async () => {
//     if (startedRef.current) {
//       return;
//     }

//     startedRef.current = true;
//     setLoading(true);
//     setErrorMessage('');
//     scale.value = 0.92;
//     opacity.value = 0;
//     translateY.value = 18;

//     try {
//       if (
//         isHdfcGateway(resolvedGatewaySlug)
//       ) {
//         await openHdfcCheckout();
//         return;
//       }

//       if (
//         resolvedGatewaySlug === 'cashfree' &&
//         paymentConfig.accessKey &&
//         (paymentConfig.orderId || paymentConfig.merchantOrderId || paymentConfig.statusReference)
//       ) {
//         await openCashfreeCheckout();
//         return;
//       }

//       // if (paymentConfig.razorpayKey && paymentConfig.orderId) {
//       //   await openRazorpayCheckout();
//       //   return;
//       // }
//       if (resolvedGatewaySlug === 'easebuzz') {
//         await openEasebuzzCheckout();
//         return;
//       }
//       if (paymentConfig.checkoutUrl) {
//         await openHostedCheckout();
//         return;
//       }

//       if (paymentConfig.statusEndpoint) {
//         await pollForFinalStatus(1);
//         return;
//       }

//       throw new Error('This payment payload is missing checkout metadata.');
//     } catch (error: any) {
//       const message = getPaymentFailureMessage(error, 'Payment could not be started.');

//       if (isPaymentCancelledByUser(error)) {
//         const cancelMessage = 'Payment cancelled by user. You can retry whenever you are ready.';
//         setErrorMessage(cancelMessage);
//         setOutcomeState('failed', 'Payment cancelled');
//         setLoading(false);
//         return;
//       }

//       console.log( message, '---------------------- message ---------------------');
//       await syncLegacyFailure(message);
//       setErrorMessage(message);
//       setOutcomeState('failed', 'Payment flow was interrupted');
//       setLoading(false);
//       showAlert({
//         title: 'Payment interrupted',
//         message,
//         tone: 'danger',
//       });
//     }
//   }, [
//     openCashfreeCheckout,
//     openHdfcCheckout,
//     openHostedCheckout,
//     openEasebuzzCheckout,
//     // openRazorpayCheckout,
//     paymentConfig.checkoutUrl,
//     paymentConfig.accessKey,
//     paymentConfig.merchantOrderId,
//     paymentConfig.orderId,
//     paymentConfig.razorpayKey,
//     paymentConfig.statusEndpoint,
//     paymentConfig.statusReference,
//     pollForFinalStatus,
//     resolvedGatewaySlug,
//     scale,
//     opacity,
//     setOutcomeState,
//     showAlert,
//     syncLegacyFailure,
//     translateY,
//   ]);

//   useEffect(() => {
//     startPayment();
//   }, [startPayment]);

//   const onRefresh = useCallback(async () => {
//     if (!paymentConfig.statusEndpoint) {
//       return;
//     }

//     try {
//       setRefreshing(true);
//       await fetchTransactionStatus();
//     } catch (error) {
//       showAlert({
//         title: 'Refresh unavailable',
//         message: 'Unable to refresh payment status right now.',
//         tone: 'warning',
//       });
//     } finally {
//       setRefreshing(false);
//     }
//   }, [fetchTransactionStatus, paymentConfig.statusEndpoint, showAlert]);

//   const retryPayment = useCallback(async () => {
//     try {
//       setRetrying(true);
//       setErrorMessage('');

//       if (paymentConfig.isCentralized && paymentConfig.retryEndpoint) {
//         const response = await javascriptPost({
//           path: paymentConfig.retryEndpoint,
//           body: {},
//           Token: userData?.token,
//         });

//         if (response?.status && response?.data) {
//           navigation.replace('UniversalPayment', {
//             type,
//             orderData: response.data,
//           });
//           return;
//         }
//       }

//       startedRef.current = false;
//       await startPayment();
//     } catch (error) {
//       showAlert({
//         title: 'Retry unavailable',
//         message: 'Unable to retry payment right now.',
//         tone: 'danger',
//       });
//     } finally {
//       setRetrying(false);
//     }
//   }, [
//     navigation,
//     paymentConfig.isCentralized,
//     paymentConfig.retryEndpoint,
//     showAlert,
//     startPayment,
//     type,
//     userData?.token,
//   ]);

//   const paymentSnapshot = useMemo(() => {
//     const statusText =
//       paymentResult?.Status ||
//       statusPayload?.payment_status ||
//       (status === 'success'
//         ? 'Success'
//         : status === 'failed'
//         ? 'Failed'
//         : status === 'pending'
//         ? 'Pending'
//         : 'Processing');

//     return {
//       gateway_name: statusPayload?.gateway_name || paymentConfig.gatewayName,
//       status: statusText,
//       payment_status: statusText,
//       status_code: statusPayload?.payment_status_code || status,
//       amount:
//         paymentResult?.paid_amount ||
//         statusPayload?.amount ||
//         paymentConfig.amount,
//       reference_number:
//         paymentResult?.reference_number ||
//         statusPayload?.gateway_transaction_id ||
//         statusPayload?.gateway_order_id ||
//         paymentConfig.orderId,
//       gateway_order_id:
//         paymentResult?.orderId ||
//         statusPayload?.order_id ||
//         paymentConfig.orderId,
//       order_id:
//         paymentResult?.orderId ||
//         statusPayload?.order_id ||
//         paymentConfig.orderId,
//       created_at: statusPayload?.created_at || null,
//       initiated_at: statusPayload?.created_at || null,
//       processed_at: statusPayload?.processed_at || null,
//       transaction_date: statusPayload?.processed_at || null,
//       retry_count: statusPayload?.retry_count || 0,
//     };
//   }, [paymentConfig.amount, paymentConfig.gatewayName, paymentConfig.orderId, paymentResult, status, statusPayload]);

//   const paymentTimeline = buildPaymentTimeline(paymentSnapshot);
//   const statusTone = resolveTone(paymentSnapshot.status);
//   const retryActionStyle = useMemo(
//     () => [
//       styles.primaryAction,
//       { backgroundColor: colors.primary },
//       retrying ? styles.disabledAction : null,
//     ],
//     [colors.primary, retrying],
//   );

//   const paymentWasCancelled = status === 'failed' && phase === 'Payment cancelled';
//   const headline =
//     status === 'success'
//       ? 'Payment successful'
//       : paymentWasCancelled
//       ? 'Payment cancelled'
//       : status === 'failed'
//       ? 'Payment failed'
//       : status === 'pending'
//       ? 'Awaiting confirmation'
//       : 'Processing payment';

//   const supportingText =
//     status === 'success'
//       ? 'The transaction is verified and the related booking or balance updates are being reflected.'
//       : status === 'failed'
//       ? errorMessage || 'We could not complete the payment. You can retry from here.'
//       : status === 'pending'
//       ? 'We are waiting for the gateway to confirm the payment. Pull to refresh or check again.'
//       : 'Please stay on this screen while we complete the secure payment handshake.';

//   const canRetry = status === 'failed' || status === 'pending';

//   return (
//     <View style={[styles.container, { backgroundColor: colors.background }]}>
//       <Header title="Payment Status" toHome />

//       <ScrollView
//         contentContainerStyle={styles.content}
//         refreshControl={
//           <RefreshControl
//             refreshing={refreshing}
//             onRefresh={onRefresh}
//             tintColor={colors.primary}
//           />
//         }
//       >
//         <View
//           style={[
//             styles.heroCard,
//             {
//               backgroundColor: colors.surface,
//               borderColor: colors.border,
//               shadowColor: colors.overlay,
//             },
//           ]}
//         >
//           <View
//             style={[
//               styles.statusOrb,
//               { backgroundColor: statusTone.background, borderColor: statusTone.border },
//             ]}
//           >
//             {status === 'processing' || loading ? (
//               <LottieView
//                 autoPlay
//                 loop
//                 source={require('../Animations/wave_animation.json')}
//                 style={styles.statusAnimation}
//               />
//             ) : (
//               <Animated.View style={animatedIconStyle}>
//                 <LottieView
//                   autoPlay
//                   loop={status !== 'success'}
//                   source={
//                     status === 'success'
//                       ? require('../Animations/Success.json')
//                       : require('../Animations/Cross_loop.json')
//                   }
//                   style={styles.statusAnimation}
//                 />
//               </Animated.View>
//             )}
//           </View>

//           <View style={styles.heroCopy}>
//             <Text style={[styles.gatewayEyebrow, { color: colors.textMuted }]}>
//               {paymentConfig.gatewayName} • {paymentConfig.environment.toUpperCase()}
//             </Text>
//             <Text style={[styles.heroTitle, { color: colors.text }]}>{headline}</Text>
//             <Text style={[styles.heroSubtitle, { color: colors.textMuted }]}>{supportingText}</Text>
//           </View>

//           <View
//             style={[
//               styles.phasePill,
//               { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
//             ]}
//           >
//             <Icon name="progress-clock" size={16} color={colors.primary} />
//             <Text style={[styles.phaseText, { color: colors.text }]}>{phase}</Text>
//           </View>
//         </View>

//         <Animated.View style={animatedCardStyle}>
//           <DetailSection
//             title="Payment Summary"
//             subtitle="Transaction snapshot with gateway metadata and member context."
//             delay={30}
//           >
//             <PaymentSummaryCard
//               status={paymentSnapshot.status}
//               items={[
//                 { label: 'Transaction type', value: type },
//                 { label: 'Member ID', value: userData?.user?.MemberID || 'N/A' },
//                 { label: 'SC ID', value: userData?.user?.SC_ID || 'N/A' },
//                 {
//                   label: 'Amount',
//                   value: `₹ ${Number(paymentSnapshot.amount || 0).toFixed(2)}`,
//                   emphasize: true,
//                 },
//                 { label: 'Gateway order', value: paymentSnapshot.order_id || 'Pending' },
//                 { label: 'Reference', value: paymentSnapshot.reference_number || 'Pending' },
//                 { label: 'Attempts', value: String(paymentSnapshot.retry_count || 0) },
//               ]}
//             />
//           </DetailSection>

//           {/* <DetailSection
//             title="Tracking Timeline"
//             subtitle="Follow the processing steps from initiation to final confirmation."
//             delay={90}
//           >
//             {paymentTimeline.length ? (
//               <StatusTimeline items={paymentTimeline} />
//             ) : (
//               <EmptyStateCard
//                 title="Timeline will appear after verification"
//                 description="As soon as the gateway updates the transaction, you will see each payment milestone here."
//               />
//             )}
//           </DetailSection> */}

//           <DetailSection
//             title="Actions"
//             subtitle="Retry, refresh, or return home without losing your payment context."
//             delay={130}
//           >
//             <View style={styles.actionRow}>
//               {canRetry ? (
//                 <Pressable
//                   onPress={retryPayment}
//                   disabled={retrying}
//                   style={retryActionStyle}
//                 >
//                   <Icon name="refresh" size={18} color={colors.onPrimary} />
//                   <Text style={[styles.primaryActionText, { color: colors.onPrimary }]}>
//                     {retrying ? 'Retrying...' : 'Retry payment'}
//                   </Text>
//                 </Pressable>
//               ) : null}

//               <Pressable
//                 onPress={onRefresh}
//                 style={[
//                   styles.secondaryAction,
//                   { backgroundColor: colors.surface, borderColor: colors.border },
//                 ]}
//               >
//                 <Icon name="sync" size={18} color={colors.text} />
//                 <Text style={[styles.secondaryActionText, { color: colors.text }]}>
//                   Refresh status
//                 </Text>
//               </Pressable>

//               <Pressable
//                 onPress={() => navigation.navigate('Home')}
//                 style={[
//                   styles.secondaryAction,
//                   { backgroundColor: colors.surface, borderColor: colors.border },
//                 ]}
//               >
//                 <Icon name="home-outline" size={18} color={colors.text} />
//                 <Text style={[styles.secondaryActionText, { color: colors.text }]}>Go home</Text>
//               </Pressable>
//             </View>
//           </DetailSection>
//         </Animated.View>
//       </ScrollView>

//       <AppAlertModal
//         visible={alertState.visible}
//         title={alertState.title}
//         message={alertState.message}
//         tone={alertState.tone}
//         primaryLabel={alertState.primaryLabel}
//         secondaryLabel={alertState.secondaryLabel}
//         onDismiss={hideAlert}
//         onPrimaryPress={() => {
//           hideAlert();
//           alertState.onPrimaryPress?.();
//         }}
//         onSecondaryPress={() => {
//           hideAlert();
//           alertState.onSecondaryPress?.();
//         }}
//       />
//     </View>
//   );
// };

// export default UniversalPaymentScreen;

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//   },
//   content: {
//     padding: 16,
//     paddingBottom: 32,
//     gap: 10,
//   },
//   heroCard: {
//     borderWidth: 1,
//     borderRadius: 28,
//     padding: 18,
//     shadowOpacity: 0.12,
//     shadowRadius: 18,
//     shadowOffset: { width: 0, height: 10 },
//     elevation: 4,
//   },
//   statusOrb: {
//     width: 98,
//     height: 98,
//     borderRadius: 49,
//     borderWidth: 1,
//     alignItems: 'center',
//     justifyContent: 'center',
//     alignSelf: 'center',
//     marginBottom: 14,
//     overflow: 'hidden',
//   },
//   statusAnimation: {
//     width: 92,
//     height: 92,
//   },
//   heroCopy: {
//     alignItems: 'center',
//     marginBottom: 16,
//   },
//   gatewayEyebrow: {
//     fontSize: 12,
//     letterSpacing: 0.8,
//     fontFamily: FONT_FAMILY.medium,
//     marginBottom: 8,
//   },
//   heroTitle: {
//     fontSize: 26,
//     lineHeight: 30,
//     textAlign: 'center',
//     fontFamily: FONT_FAMILY.bold,
//     marginBottom: 8,
//   },
//   heroSubtitle: {
//     fontSize: 14,
//     lineHeight: 21,
//     textAlign: 'center',
//     fontFamily: FONT_FAMILY.regular,
//   },
//   phasePill: {
//     borderWidth: 1,
//     borderRadius: 999,
//     paddingHorizontal: 14,
//     paddingVertical: 10,
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'center',
//     gap: 8,
//   },
//   phaseText: {
//     fontSize: 13,
//     fontFamily: FONT_FAMILY.medium,
//   },
//   actionRow: {
//     gap: 12,
//   },
//   primaryAction: {
//     minHeight: 52,
//     borderRadius: 18,
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'center',
//     gap: 8,
//   },
//   disabledAction: {
//     opacity: 0.6,
//   },
//   primaryActionText: {
//     fontSize: 14,
//     fontFamily: FONT_FAMILY.semiBold,
//   },
//   secondaryAction: {
//     minHeight: 50,
//     borderRadius: 18,
//     borderWidth: 1,
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'center',
//     gap: 8,
//   },
//   secondaryActionText: {
//     fontSize: 14,
//     fontFamily: FONT_FAMILY.medium,
//   },
// });
// // const verifyPaymentCashfree = async (orderID: string) => {
// //   try {
// //     const apiRes = await javascriptPost({
// //       path: orderData.end_point,
// //       body: {
// //         order_id: orderID,
// //       },
// //       Token: userData?.token,
// //     });

// //     setPaymentResult(apiRes.data);

// //     if (apiRes.success) {
// //       setStatus('success');

// //       if (type === 'Recharge') {
// //         queryClient.invalidateQueries({ queryKey: ['card_balance'] });
// //       } else if (type === 'Bill') {
// //         queryClient.invalidateQueries({ queryKey: ['statements'] });
// //       }

// //     } else {
// //       setStatus('failed');
// //     }
// //   } catch (e) {
// //     handleFailure(e);
// //   } finally {
// //     setLoading(false);
// //   }
// // };


// // c6MSl3FmYUEjmx094lSBCp:APA91bGa1UVr7sRJ245XhosMsAFU8JgsIADfnn_FGM-a4OMXDEgYP2Q1TGfOwSZ1XhHouc_NlAN6lw43ORMk5e5nlo56X2G8Q_6Ypb2Z5MRhnS6H7fl37P0
