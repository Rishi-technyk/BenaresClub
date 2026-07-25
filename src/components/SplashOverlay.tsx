import React, { useEffect } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import 
{ APP_NAME } from '@env';
import { useAppTheme } from '../theme/AppThemeProvider';
import { FONT_FAMILY } from '../util/colors';

type Props = {
  visible: boolean;
  onFinish: () => void;
};

const SplashOverlay: React.FC<Props> = ({ visible, onFinish }) => {
  const { colors, resolvedMode } = useAppTheme();
  const opacity = useSharedValue(1);
  const logoScale = useSharedValue(0.84);
  const contentY = useSharedValue(30);
  const glowScale = useSharedValue(0.96);
  const styles = React.useMemo(() => createStyles(colors), [colors]);

  useEffect(() => {
    if (!visible) {
      return;
    }

    opacity.value = 1;
    logoScale.value = withTiming(1, {
      duration: 700,
      easing: Easing.out(Easing.exp),
    });
    contentY.value = withTiming(0, {
      duration: 620,
      easing: Easing.out(Easing.cubic),
    });
    glowScale.value = withRepeat(
      withSequence(
        withTiming(1.08, { duration: 900, easing: Easing.inOut(Easing.quad) }),
        withTiming(0.96, { duration: 900, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      false,
    );

    const timer = setTimeout(() => {
      opacity.value = withTiming(0, { duration: 420 }, finished => {
        if (finished) {
          runOnJS(onFinish)();
        }
      });
    }, 1700);

    return () => clearTimeout(timer);
  }, [contentY, glowScale, logoScale, onFinish, opacity, visible]);

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const logoStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoScale.value }, { translateY: contentY.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: glowScale.value }],
    opacity: opacity.value,
  }));

  if (!visible) {
    return null;
  }
  return (
    <Animated.View style={[styles.overlay, overlayStyle]}>
      <LinearGradient
        colors={
          resolvedMode === 'dark'
            ? ['#020617', '#0f172a', '#111827']
            : ['#e2e8f0', '#f8fafc', '#eef2ff']
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <Animated.View style={[styles.glowOrb, glowStyle]} />

        <Animated.View style={[styles.centerWrap, logoStyle]}>
          <View style={styles.logoShell}>
            <Image
              source={require('../../assets/images/Logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

          <Text style={styles.title}>{APP_NAME}</Text>
          <Text style={styles.subtitle}>Experience the future of club management</Text>

          <View style={styles.loaderRow}>
            <View style={styles.loaderDotPrimary} />
            <View style={styles.loaderDotSecondary} />
            <View style={styles.loaderDotMuted} />
          </View>
        </Animated.View>
      </LinearGradient>
    </Animated.View>
  );
};

const createStyles = (colors: any) =>
  StyleSheet.create({
    overlay: {
      ...StyleSheet.absoluteFillObject,
      zIndex: 999,
    },
    gradient: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    glowOrb: {
      position: 'absolute',
      width: 300,
      height: 300,
      borderRadius: 150,
      backgroundColor: `${colors.primary}20`,
    },
    centerWrap: {
      alignItems: 'center',
      paddingHorizontal: 28,
    },
    logoShell: {
      width: 112,
      height: 112,
      borderRadius: 34,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOpacity: 0.14,
      shadowRadius: 22,
      shadowOffset: { width: 0, height: 12 },
      elevation: 7,
    },
    logo: {
      width: 72,
      height: 72,
    },
    title: {
      marginTop: 24,
      color: colors.text,
      fontFamily: FONT_FAMILY.bold,
      fontSize: 28,
      letterSpacing: 0.4,
    },
    subtitle: {
      marginTop: 10,
      textAlign: 'center',
      color: colors.textMuted,
      fontFamily: FONT_FAMILY.normal,
      fontSize: 14,
      lineHeight: 21,
      maxWidth: 280,
    },
    loaderRow: {
      marginTop: 22,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    loaderDotPrimary: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: colors.primary,
    },
    loaderDotSecondary: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: colors.secondary,
    },
    loaderDotMuted: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: colors.textMuted,
    },
  });

export default SplashOverlay;
